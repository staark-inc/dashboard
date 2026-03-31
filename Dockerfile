# syntax=docker/dockerfile:1.4
FROM node:20-alpine AS base
#ghcr.io/staark-inc/dashboard:latest
WORKDIR /app

RUN apk add --no-cache python3 make g++

COPY package*.json ./

RUN --mount=type=secret,id=github_packages_token \
  set -eux; \
  TOKEN="$(cat /run/secrets/github_packages_token)"; \
  test -n "$TOKEN"; \
  printf "@staark-inc:registry=https://npm.pkg.github.com\n//npm.pkg.github.com/:_authToken=%s\n" "$TOKEN" > .npmrc; \
  npm ci --omit=dev; \
  rm -f .npmrc

COPY . .
EXPOSE 3005
CMD ["npm", "run", "start"]