# Build context must be the repository root (see docker-compose.yml) so npm
# workspaces can resolve the @p2p/shared dependency.

FROM node:20-alpine AS build
WORKDIR /app

COPY package.json package-lock.json* ./
COPY shared/package.json shared/package.json
COPY server/package.json server/package.json
COPY client/package.json client/package.json
RUN npm ci

COPY shared shared
COPY client client
RUN npm run build --workspace=shared

# VITE_* variables are inlined into the bundle at build time.
ARG VITE_APP_NAME="P2P File Share"
ARG VITE_SIGNALING_URL=wss://localhost:8080
ARG VITE_STUN_SERVER=stun:stun.l.google.com:19302
ARG VITE_TURN_SERVER=
ARG VITE_TURN_USERNAME=
ARG VITE_TURN_CREDENTIAL=
ARG VITE_SESSION_TIMEOUT=1800
ENV VITE_APP_NAME=$VITE_APP_NAME \
    VITE_SIGNALING_URL=$VITE_SIGNALING_URL \
    VITE_STUN_SERVER=$VITE_STUN_SERVER \
    VITE_TURN_SERVER=$VITE_TURN_SERVER \
    VITE_TURN_USERNAME=$VITE_TURN_USERNAME \
    VITE_TURN_CREDENTIAL=$VITE_TURN_CREDENTIAL \
    VITE_SESSION_TIMEOUT=$VITE_SESSION_TIMEOUT

RUN npm run build --workspace=client

FROM nginx:1.27-alpine AS runtime
COPY client/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/client/dist /usr/share/nginx/html
EXPOSE 80
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s CMD wget -qO- http://localhost/ || exit 1
