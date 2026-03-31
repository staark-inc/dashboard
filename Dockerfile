# syntax=docker/dockerfile:1.4
FROM node:20-alpine

# Setăm directorul de lucru
WORKDIR /app

# Copiem doar package.json și package-lock.json pentru a folosi cache eficient
COPY package*.json ./
RUN --mount=type=secret,id=github_packages_token \
  set -eux; \
  TOKEN="$(cat /run/secrets/github_packages_token)"; \
  test -n "$TOKEN"; \
  printf "@staark-inc:registry=https://npm.pkg.github.com/\n//npm.pkg.github.com/:_authToken=%s\n" "$TOKEN" > .npmrc; \
  echo "=== npm config ==="; \
  npm config get registry; \
  npm --version; \
  node --version; \
  echo "=== .npmrc ==="; \
  cat .npmrc; \
  echo "=== npm ci ==="; \
  npm ci --omit=dev --verbose 2>&1 | head -50; \
  rm -f .npmrc

COPY . .
EXPOSE 3005
CMD ["npm", "run", "start"]