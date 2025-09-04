import mongoose from 'mongoose';
import { env } from './env.js';

let connecting = null;

export async function connectMongo(uri = env.MONGO_URI) {
  if (!uri) {
    throw new Error('MONGO_URI is empty. Set it in .env or pass connectMongo(uri).');
  }
  // 0 = disconnected, 1 = connected, 2 = connecting, 3 = disconnecting
  if (mongoose.connection.readyState === 1) return mongoose.connection;
  if (connecting) return connecting;

  mongoose.set('strictQuery', true);

  connecting = mongoose
    .connect(uri, {
      serverSelectionTimeoutMS: 5000 // fail fast if cannot reach server
    })
    .then((m) => {
      console.log('[mongo] connected');
      return m.connection;
    })
    .catch((err) => {
      console.error('[mongo] connection error:', err.message);
      throw err;
    })
    .finally(() => {
      connecting = null;
    });

  return connecting;
}

export async function disconnectMongo() {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
    console.log('[mongo] disconnected');
  }
}

export function getMongoConnection() {
  return mongoose.connection;
}
