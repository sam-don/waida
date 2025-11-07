# Build stage
FROM node:20 AS build
WORKDIR /app

# Install server dependencies
COPY server/package*.json ./server/
RUN cd server && npm ci

# Install client dependencies and build
COPY client/package*.json ./client/
RUN cd client && npm ci

# Copy source
COPY server ./server
COPY client ./client

# Build client and server
RUN cd client && npm run build
RUN cd server && npm run build

# Runtime stage
FROM node:20-slim
ENV NODE_ENV=production
WORKDIR /app

# Copy server and client dist
COPY --from=build /app/server/dist ./server/dist
COPY --from=build /app/server/package.json ./server/package.json
COPY --from=build /app/server/package-lock.json ./server/package-lock.json
COPY --from=build /app/client/dist ./client/dist


# Install only production deps for server
RUN cd server && npm ci --omit=dev

EXPOSE 3001
CMD ["node", "server/dist/index.js"]
