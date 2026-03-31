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

# Autentificare GHCR
log "🔑 Autentificare la GHCR..."
CLEAN_TOKEN=$(echo "$GITHUB_TOKEN" | tr -d '\r\n' | tr -d ' ')
echo "$CLEAN_TOKEN" | docker login ghcr.io -u "$GHCR_USERNAME" --password-stdin

if [ $? -ne 0 ]; then
  log "❌ Autentificarea la GHCR a eșuat!"
  exit 1
fi
log "✅ Autentificare GHCR reușită"

# ─────────────────────────────────────────────────
# 🔽 Pull ultima imagine din GHCR pentru layer-e fresh
# ─────────────────────────────────────────────────
log "🔽 Pull ultima imagine din GHCR pentru layer-e fresh..."

# Încercăm mai întâi :latest, altfel cel mai recent tag
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
# 🔨 Build fresh, fără cache, cu secret
# ─────────────────────────────────────────────────
log "🔨 Începem build-ul imaginii (--no-cache, layer-e de bază fresh)..."

export GITHUB_PACKAGES_TOKEN

DOCKER_BUILDKIT=1 docker build \
  --no-cache \
  --pull \
  --secret id=github_token,env=GITHUB_PACKAGES_TOKEN \
  -t "$FULL_IMAGE" .

if [ $? -ne 0 ]; then
  log "❌ Build-ul a eșuat!"
  exit 1
fi
log "✅ Build reușit: $FULL_IMAGE"

# 🚀 Push pe GHCR
log "🚀 Push pe GHCR..."
docker push "$FULL_IMAGE"

if [ $? -ne 0 ]; then
  log "❌ Push-ul a eșuat!"
  exit 1
fi
log "✅ Push reușit: $FULL_IMAGE"

# Actualizăm și tag-ul :latest pe GHCR
log "🏷️  Actualizăm tag-ul :latest..."
docker tag "$FULL_IMAGE" "$IMAGE_NAME:latest"
docker push "$IMAGE_NAME:latest"

# 🔽 Pull și verificare imagine
log "🔽 Pull imagine pentru deploy local..."
docker pull "$FULL_IMAGE"

if [ $? -ne 0 ]; then
  log "❌ Pull-ul imaginii a eșuat!"
  exit 1
fi
log "✅ Pull reușit: $FULL_IMAGE"

# Oprim și ștergem containerul vechi dacă există
if [ "$(docker ps -aq -f name=^${CONTAINER_NAME}$)" ]; then
  log "🛑 Oprire și ștergere container vechi..."
  docker rm -f "$CONTAINER_NAME"
  log "✅ Container vechi șters"
fi

# Rulăm containerul nou
log "▶️  Rulăm containerul nou..."
docker run -d \
  --name "$CONTAINER_NAME" \
  --env-file "$ENV_FILE" \
  -p "$PORT:$PORT" \
  "$FULL_IMAGE"

if [ $? -eq 0 ]; then
  log "✅ Containerul $CONTAINER_NAME rulează pe port $PORT"
else
  log "❌ Deploy local a eșuat!"
  exit 1
fi

# ─────────────────────────────────────────────────
# 📦 Git commit + push după deploy reușit
# ─────────────────────────────────────────────────
log "📦 Commit și push pe GitHub..."

# Verificăm dacă suntem într-un repo Git
if ! git rev-parse --is-inside-work-tree &>/dev/null; then
  log "⚠️  Nu suntem într-un repository Git — skip commit/push."
else
  git add -A

  # Commit doar dacă există modificări
  if git diff --cached --quiet; then
    log "ℹ️  Nicio modificare de commit."
  else
    COMMIT_MSG="deploy: $IMAGE_TAG"
    git commit -m "$COMMIT_MSG"

    if [ $? -eq 0 ]; then
      log "✅ Commit reușit: \"$COMMIT_MSG\""
    else
      log "❌ Commit-ul a eșuat!"
      exit 1
    fi

    git push

    if [ $? -eq 0 ]; then
      log "✅ Push pe GitHub reușit"
    else
      log "❌ Push-ul pe GitHub a eșuat!"
      exit 1
    fi
  fi
fi

# Afișăm log-urile în timp real
log "📄 Afișăm log-urile containerului:"
docker logs -f "$CONTAINER_NAME"