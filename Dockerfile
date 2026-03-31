# syntax=docker/dockerfile:1.4
#FROM ghcr.io/staark-inc/dashboard:latest AS base
FROM node:20-alpine AS base

WORKDIR /app

COPY package*.json ./

# Folosim secret BuildKit, citit din .env
# Folosim secret BuildKit
RUN --mount=type=secret,id=github_packages_token \
    TOKEN=$(cat /run/secrets/github_packages_token | tr -d '\r\n') && \
    echo "@staark-inc:registry=https://npm.pkg.github.com" > .npmrc && \
    echo "//npm.pkg.github.com/:_authToken=$TOKEN" >> .npmrc && \
    echo "always-auth=true" >> .npmrc && \
    npm install --omit=dev && \
    rm -f .npmrc

COPY . .

EXPOSE 3005

CMD ["npm", "run", "start"]