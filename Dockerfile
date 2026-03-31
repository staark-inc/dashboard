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
  npm cache clean --force; \
  printf "@staark-inc:registry=https://npm.pkg.github.com/\n//npm.pkg.github.com/:_authToken=%s\n" "$TOKEN" > .npmrc; \
  echo "=== npm config ==="; \
  npm config ls; \
  echo "=== .npmrc ==="; \
  cat .npmrc; \
  npm ci --omit=dev; \
  rm -f .npmrc

COPY . .
EXPOSE 3005
CMD ["npm", "run", "start"]