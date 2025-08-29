// Entry point: creates the HTTP server and starts listening
import http from 'http';
import app from './app.js';

const PORT = process.env.PORT || 3000;

const server = http.createServer(app);

// Graceful shutdown helpers (optional for now)
const onClose = () => {
  console.log("Shutting down gracefully...");
  server.close(() => {
    console.log("HTTP server closed.");
    process.exit(0);
  });
};

process.on("SIGINT", onClose);
process.on("SIGTERM", onClose);

server.listen(PORT, () => {
  console.log(`CozyCup backend is running on http://localhost:${PORT}`);
});

export default server;