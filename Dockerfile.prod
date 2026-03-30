# syntax=docker/dockerfile:1.4
FROM node:20-alpine

WORKDIR /app

ARG GITHUB_PACKAGES_TOKEN

COPY package*.json ./

RUN test -n "$GITHUB_PACKAGES_TOKEN" || (echo "GITHUB_PACKAGES_TOKEN missing" && exit 1)

RUN echo "@staark-inc:registry=https://npm.pkg.github.com" > /root/.npmrc && \
    echo "//npm.pkg.github.com/:_authToken=${GITHUB_PACKAGES_TOKEN}" >> /root/.npmrc && \
    npm install --omit=dev && \
    rm -f /root/.npmrc

COPY . .

EXPOSE 3005
CMD ["npm", "run", "start"]