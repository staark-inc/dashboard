#!/bin/bash

log() {
  echo "[$(date +'%Y-%m-%d %H:%M:%S')] $1"
}

ENV_FILE=".env"
IMAGE_NAME="ghcr.io/staark-inc/dashboard"
PORT=3005
CONTAINER_NAME="dashboard"

log "Incepem procesul de deploy"

if [ ! -f "$ENV_FILE" ]; then
  log "EROARE: Fisierul $ENV_FILE nu exista!"
  exit 1
fi

GITHUB_TOKEN=$(grep '^GITHUB_TOKEN=' "$ENV_FILE" | cut -d '=' -f2 | tr -d '[:space:]')
GITHUB_PACKAGES_TOKEN=$(grep '^GITHUB_PACKAGES_TOKEN=' "$ENV_FILE" | cut -d '=' -f2 | tr -d '[:space:]')
GHCR_USERNAME=$(grep '^GHCR_USERNAME=' "$ENV_FILE" | cut -d '=' -f2 | tr -d '[:space:]')

if [ -z "$GITHUB_TOKEN" ]; then
  log "EROARE: GITHUB_TOKEN nu este setat in $ENV_FILE"
  exit 1
fi

if [ -z "$GITHUB_PACKAGES_TOKEN" ]; then
  log "EROARE: GITHUB_PACKAGES_TOKEN nu este setat in $ENV_FILE"
  exit 1
fi

IMAGE_TAG=$(date +%Y%m%d%H%M%S)
FULL_IMAGE="$IMAGE_NAME:$IMAGE_TAG"
log "Tag-ul imaginii va fi: $FULL_IMAGE"

# ─── 1. Git commit + push ───────────────────────
log "Verificam repository-ul Git..."

if ! git rev-parse --is-inside-work-tree &>/dev/null; then
  log "AVERTISMENT: Nu suntem intr-un repository Git - skip commit/push."
else
  git add -A
  if git diff --cached --quiet; then
    log "Nicio modificare de commit - codul e deja sincronizat."
  else
    COMMIT_MSG="deploy: $IMAGE_TAG"
    git commit -m "$COMMIT_MSG"
    if [ $? -ne 0 ]; then
      log "EROARE: Commit-ul a esuat!"
      exit 1
    fi
    log "Commit reusit: $COMMIT_MSG"

    git push
    if [ $? -ne 0 ]; then
      log "EROARE: Push-ul pe GitHub a esuat!"
      exit 1
    fi
    log "Cod urcat pe GitHub"
  fi
fi

# ─── 2. Autentificare GHCR ──────────────────────
log "Autentificare la GHCR..."
CLEAN_TOKEN=$(echo "$GITHUB_TOKEN" | tr -d '\r\n ')
echo "$CLEAN_TOKEN" | docker login ghcr.io -u "$GHCR_USERNAME" --password-stdin
if [ $? -ne 0 ]; then
  log "EROARE: Autentificarea la GHCR a esuat!"
  exit 1
fi
log "Autentificare GHCR reusita"

# ─── 3. Pull ultima imagine (layer-e fresh) ─────
log "Pull ultima imagine din GHCR pentru layer-e fresh..."
docker pull "$IMAGE_NAME:latest" 2>/dev/null
if [ $? -ne 0 ]; then
  log "Tag :latest nu exista - continuam cu build fresh."
else
  log "Pull reusit: $IMAGE_NAME:latest"
fi

# ─── 4. Build ───────────────────────────────────
log "Build imagine (--no-cache, layer-e de baza fresh)..."

# Scriem token-ul intr-un fisier temporar pentru --secret
SECRET_FILE=$(mktemp)
printf '%s' "$GITHUB_PACKAGES_TOKEN" > "$SECRET_FILE"

DOCKER_BUILDKIT=1 docker build \
  --no-cache \
  --pull \
  --secret id=github_packages_token,src="$SECRET_FILE" \
  -t "$FULL_IMAGE" .

BUILD_EXIT=$?
rm -f "$SECRET_FILE"

if [ $BUILD_EXIT -ne 0 ]; then
  log "EROARE: Build-ul a esuat!"
  exit 1
fi
log "Build reusit: $FULL_IMAGE"

# ─── 5. Push pe GHCR ────────────────────────────
log "Push pe GHCR..."
docker push "$FULL_IMAGE"
if [ $? -ne 0 ]; then
  log "EROARE: Push-ul a esuat!"
  exit 1
fi
log "Push reusit: $FULL_IMAGE"

log "Actualizam tag-ul :latest..."
docker tag "$FULL_IMAGE" "$IMAGE_NAME:latest"
docker push "$IMAGE_NAME:latest"

# ─── 6. Deploy local ────────────────────────────
log "Pull imagine pentru deploy local..."
docker pull "$FULL_IMAGE"
if [ $? -ne 0 ]; then
  log "EROARE: Pull-ul imaginii a esuat!"
  exit 1
fi
log "Pull reusit: $FULL_IMAGE"

if [ "$(docker ps -aq -f name=^${CONTAINER_NAME}$)" ]; then
  log "Oprire si stergere container vechi..."
  docker rm -f "$CONTAINER_NAME"
  log "Container vechi sters"
fi

log "Rulam containerul nou..."
docker run -d \
  --name "$CONTAINER_NAME" \
  --env-file "$ENV_FILE" \
  -p "$PORT:$PORT" \
  "$FULL_IMAGE"

if [ $? -eq 0 ]; then
  log "Containerul $CONTAINER_NAME ruleaza pe port $PORT"
else
  log "EROARE: Deploy local a esuat!"
  exit 1
fi

# ─── 7. Log-uri live ────────────────────────────
log "Afisam log-urile containerului:"
docker logs -f "$CONTAINER_NAME"