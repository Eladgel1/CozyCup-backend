// Entry point: creates the HTTP server and starts listening
import http from 'node:http'; 
import app from './app.js';
import { env } from './config/env.js';
import { connectMongo, disconnectMongo } from './config/mongo.js';

const PORT = env.PORT;

const server = http.createServer(app);

async function start() {
  try {
    await connectMongo();
    server.listen(PORT, () => {
      console.log(`CozyCup backend is running on http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

// Graceful shutdown helpers
const onClose = async () => {
  console.log('Shutting down gracefully...');
  try {
    await disconnectMongo();
  } catch (e) {
    console.error('Error during Mongo disconnect:', e);
  } finally {
    server.close(() => {
      console.log('HTTP server closed.');
      process.exit(0);
    });
    // Safety timeout in case 'close' hangs (e.g., open sockets)
    setTimeout(() => {
      console.warn('Force exiting after timeout.');
      process.exit(1);
    }, 10_000).unref();
  }
};

process.on('SIGINT', onClose);
process.on('SIGTERM', onClose);

start();

export default server;
