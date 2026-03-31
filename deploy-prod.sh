#!/bin/bash

# Funcție de log cu timestamp
log() {
  echo "[$(date +'%Y-%m-%d %H:%M:%S')] $1"
}

# Configurație
ENV_FILE=".env"
IMAGE_NAME="ghcr.io/staark-inc/dashboard"
PORT=3005
CONTAINER_NAME="dashboard"

log "🔹 Începem procesul de deploy"

# Verificăm dacă .env există
if [ ! -f "$ENV_FILE" ]; then
  log "❌ Fișierul $ENV_FILE nu există! Creează-l cu GITHUB_TOKEN și GITHUB_PACKAGES_TOKEN."
  exit 1
fi

# Citim token-urile din .env
GITHUB_TOKEN=$(grep '^GITHUB_TOKEN=' "$ENV_FILE" | cut -d '=' -f2 | tr -d '[:space:]')
GITHUB_PACKAGES_TOKEN=$(grep '^GITHUB_PACKAGES_TOKEN=' "$ENV_FILE" | cut -d '=' -f2 | tr -d '[:space:]')
GHCR_USERNAME=$(grep '^GHCR_USERNAME=' "$ENV_FILE" | cut -d '=' -f2 | tr -d '[:space:]')

if [ -z "$GITHUB_TOKEN" ]; then
  log "❌ GITHUB_TOKEN nu este setat în $ENV_FILE"
  exit 1
fi

if [ -z "$GITHUB_PACKAGES_TOKEN" ]; then
  log "❌ GITHUB_PACKAGES_TOKEN nu este setat în $ENV_FILE"
  exit 1
fi

# Generăm tag unic
IMAGE_TAG=$(date +%Y%m%d%H%M%S)
FULL_IMAGE="$IMAGE_NAME:$IMAGE_TAG"

log "🟢 Tag-ul imaginii va fi: $FULL_IMAGE"

# ─────────────────────────────────────────────────
# 1. 📦 Git commit + push (înainte de orice altceva)
# ─────────────────────────────────────────────────
log "📦 Verificăm repository-ul Git..."

if ! git rev-parse --is-inside-work-tree &>/dev/null; then
  log "⚠️  Nu suntem într-un repository Git — skip commit/push."
else
  # Configurăm git să folosească token-ul pentru autentificare
  CLEAN_GITHUB_TOKEN=$(echo "$GITHUB_TOKEN" | tr -d '\r\n' | tr -d ' ')
  git config --global credential.helper store
  echo "https://oauth2:${CLEAN_GITHUB_TOKEN}@github.com" > ~/.git-credentials
  chmod 600 ~/.git-credentials

  git add -A

  if git diff --cached --quiet; then
    log "ℹ️  Nicio modificare de commit — codul e deja sincronizat."
  else
    COMMIT_MSG="deploy: $IMAGE_TAG"
    git commit -m "$COMMIT_MSG"

    if [ $? -ne 0 ]; then
      log "❌ Commit-ul a eșuat!"
      exit 1
    fi
    log "✅ Commit reușit: \"$COMMIT_MSG\""

    git push

    if [ $? -ne 0 ]; then
      log "❌ Push-ul pe GitHub a eșuat!"
      rm -f ~/.git-credentials
      exit 1
    fi
    log "✅ Cod urcat pe GitHub"
  fi

  # Curățim credențialele după push
  rm -f ~/.git-credentials
fi

# ─────────────────────────────────────────────────
# 2. 🔑 Autentificare GHCR
# ─────────────────────────────────────────────────
log "🔑 Autentificare la GHCR..."
CLEAN_TOKEN=$(echo "$GITHUB_TOKEN" | tr -d '\r\n' | tr -d ' ')
echo "$CLEAN_TOKEN" | docker login ghcr.io -u "$GHCR_USERNAME" --password-stdin

if [ $? -ne 0 ]; then
  log "❌ Autentificarea la GHCR a eșuat!"
  exit 1
fi
log "✅ Autentificare GHCR reușită"

# ─────────────────────────────────────────────────
# 3. 🔽 Pull ultima imagine din GHCR (layer-e fresh)
# ─────────────────────────────────────────────────
log "🔽 Pull ultima imagine din GHCR pentru layer-e fresh..."

docker pull "$IMAGE_NAME:latest" 2>/dev/null
if [ $? -ne 0 ]; then
  log "ℹ️  Tag :latest nu există — căutăm cel mai recent tag..."
  LATEST_REMOTE=$(docker image ls "$IMAGE_NAME" --format "{{.Tag}}" | sort -r | head -n1)
  if [ -n "$LATEST_REMOTE" ]; then
    docker pull "$IMAGE_NAME:$LATEST_REMOTE"
    log "✅ Pull reușit: $IMAGE_NAME:$LATEST_REMOTE"
  else
    log "⚠️  Nu există nicio imagine pe GHCR — continuăm cu build fresh fără cache de bază."
  fi
else
  log "✅ Pull reușit: $IMAGE_NAME:latest"
fi

# ─────────────────────────────────────────────────
# 4. 🔨 Build fresh + push pe GHCR
# ─────────────────────────────────────────────────
log "🔨 Începem build-ul imaginii (--no-cache, layer-e de bază fresh)..."

export GITHUB_PACKAGES_TOKEN

DOCKER_BUILDKIT=1 docker build \
  --no-cache \
  --pull \
  --secret id=github_packages_token,env=GITHUB_PACKAGES_TOKEN \
  -t "$FULL_IMAGE" .

if [ $? -ne 0 ]; then
  log "❌ Build-ul a eșuat!"
  exit 1
fi
log "✅ Build reușit: $FULL_IMAGE"

log "🚀 Push pe GHCR..."
docker push "$FULL_IMAGE"

if [ $? -ne 0 ]; then
  log "❌ Push-ul a eșuat!"
  exit 1
fi
log "✅ Push reușit: $FULL_IMAGE"

log "🏷️  Actualizăm tag-ul :latest..."
docker tag "$FULL_IMAGE" "$IMAGE_NAME:latest"
docker push "$IMAGE_NAME:latest"

# ─────────────────────────────────────────────────
# 5. 🔽 Pull + deploy local
# ─────────────────────────────────────────────────
log "🔽 Pull imagine pentru deploy local..."

# Retry logic pentru pull
RETRY_COUNT=0
MAX_RETRIES=3
until docker pull "$FULL_IMAGE"; do
  RETRY_COUNT=$((RETRY_COUNT + 1))
  if [ $RETRY_COUNT -ge $MAX_RETRIES ]; then
    log "❌ Pull-ul imaginii a eșuat după $MAX_RETRIES încercări!"
    exit 1
  fi
  log "⚠️  Retry pull ($RETRY_COUNT/$MAX_RETRIES)..."
  sleep 2
done

log "✅ Pull reușit: $FULL_IMAGE"

if [ "$(docker ps -aq -f name=^${CONTAINER_NAME}$)" ]; then
  log "🛑 Oprire și ștergere container vechi..."
  docker rm -f "$CONTAINER_NAME"
  log "✅ Container vechi șters"
fi

log "▶️  Deploying cu docker compose..."

export DASHBOARD_IMAGE="$FULL_IMAGE"
cd /srv/docker/stacks/gateway
docker compose up -d dashboard

if [ $? -eq 0 ]; then
  log "✅ Containerul node-dashboard rulează pe port 3005"
else
  log "❌ Deploy cu docker compose a eșuat!"
  exit 1
fi

log "📄 Afișăm log-urile containerului:"
docker compose logs -f dashboard