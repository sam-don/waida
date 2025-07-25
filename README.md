# waida

What Am I Doing Again?

This project is a simple task tracker built with React, TypeScript and an Express backend using SQLite. It can be built into a single Docker image for easy deployment.

## Development

### Client
```bash
cd client
npm install
npm run dev
```
The development server runs at http://localhost:5173.

### Server
```bash
cd server
npm install
npm run build
node dist/index.js
```
The server listens on port 3001 and serves the production build of the React app from `client/dist`.

The API exposes CRUD operations for tasks. Tasks include a date and optional notes, and can have subtasks. Use `/api/tasks?date=YYYY-MM-DD` to retrieve tasks for a given day.

## Docker
To build and run the application in Docker:
```bash
docker build -t waida .
docker run -p 3001:3001 waida
```
The app will be available at http://localhost:3001.
