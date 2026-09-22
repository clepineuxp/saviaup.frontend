# Stage 1: Build Angular application
FROM node:22-alpine AS build
WORKDIR /app

ARG ANGULAR_PROJECT=savia-up-web
ARG DIST_PROJECT=savia-up-web

COPY package*.json ./
RUN npm ci

COPY . .
RUN npx ng build "$ANGULAR_PROJECT"

# Stage 2: Serve with Nginx
FROM nginx:alpine AS final
RUN apk add --no-cache jq
WORKDIR /usr/share/nginx/html

# Clean default nginx files
RUN rm -rf ./*

# Copy built application and nginx configuration
ARG DIST_PROJECT=savia-up-web
COPY --from=build /app/dist/${DIST_PROJECT}/browser .
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY docker-entrypoint.d/ /docker-entrypoint.d/
RUN chmod +x /docker-entrypoint.d/*.sh && nginx -t

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
