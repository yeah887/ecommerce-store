import mongoose from 'mongoose';
import { createApp } from './app.js';
import { loadConfig } from './config.js';

const config = loadConfig();
const db = await mongoose.createConnection(config.mongoUrl).asPromise();
const app = createApp({ db });

const server = app.listen(config.port, () => {
  console.log(`API listening on port ${config.port}`);
});

async function shutdown(signal: string) {
  console.log(`${signal} received, shutting down`);
  server.close();
  await db.close();
  process.exit(0);
}

process.on('SIGTERM', () => void shutdown('SIGTERM'));
process.on('SIGINT', () => void shutdown('SIGINT'));
