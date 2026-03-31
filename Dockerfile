# syntax=docker/dockerfile:1.4
FROM node:20-alpine as base

WORKDIR /app

COPY package*.json ./

# Folosim secret BuildKit, citit din .env
RUN --mount=type=secret,id=github_token \
    set -a && \
    source /run/secrets/github_token && \
    set +a && \
    echo "@staark-inc:registry=https://npm.pkg.github.com" > .npmrc && \
    echo "//npm.pkg.github.com/:_authToken=$GITHUB_PACKAGES_TOKEN" >> .npmrc && \
    echo "always-auth=true" >> .npmrc && \
    npm install --omit=dev && \
    rm -f .npmrc

COPY . .

EXPOSE 3005

CMD ["npm", "run", "start"]