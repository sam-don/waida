# Build stage
FROM node:20 AS build
WORKDIR /app

# Install server dependencies
COPY server/package*.json ./server/
WORKDIR /app/server
RUN npm install

# Install client dependencies and build
WORKDIR /app
COPY client/package*.json ./client/
WORKDIR /app/client
RUN npm install

# Copy source
WORKDIR /app
COPY server ./server
COPY client ./client

# Build client and server
WORKDIR /app/client
RUN npm run build
WORKDIR /app/server
RUN npm run build

# Runtime stage
FROM node:20
WORKDIR /app
COPY --from=build /app/server/dist ./server/dist
COPY --from=build /app/server/package.json ./server/package.json
COPY --from=build /app/client/dist ./client/dist

WORKDIR /app/server
RUN npm install --omit=dev
EXPOSE 3001

WORKDIR /app
CMD ["node", "server/dist/index.js"]
