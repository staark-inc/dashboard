#!/bin/bash

# Script de build Docker pentru proiectul tău

ENV_FILE=".env"
IMAGE_NAME="dashboard"

# Verificăm dacă fișierul .env există
if [ ! -f "$ENV_FILE" ]; then
  echo "❌ Fișierul $ENV_FILE nu există! Creează-l cu GITHUB_PACKAGES_TOKEN."
  exit 1
fi

# Citim tokenul din .env
GITHUB_PACKAGES_TOKEN=$(grep GITHUB_PACKAGES_TOKEN "$ENV_FILE" | cut -d '=' -f2)

if [ -z "$GITHUB_PACKAGES_TOKEN" ]; then
  echo "❌ GITHUB_PACKAGES_TOKEN nu este setat în $ENV_FILE"
  exit 1
fi

echo "🔨 Începem build-ul imaginii Docker..."

DOCKER_BUILDKIT=1 docker build \
  --no-cache \
  --secret id=github_token,src="$ENV_FILE" \
  -t "$IMAGE_NAME" .

if [ $? -eq 0 ]; then
  echo "✅ Build finalizat cu succes pentru imaginea $IMAGE_NAME!"
else
  echo "❌ Build-ul a eșuat!"
  exit 1
fi