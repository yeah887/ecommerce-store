import mongoose from 'mongoose';
import { createApp } from './app.js';
import { loadConfig } from './config.js';
import { prepareDatabase } from './db/prepare.js';
import { MockPaymentProvider, type PaymentProvider } from './payments.js';
import { PayPalPaymentProvider } from './paypal.js';

const config = loadConfig();
const db = await mongoose.createConnection(config.mongoUrl).asPromise();
await prepareDatabase(db, { seed: true, admin: config.admin, bcryptRounds: config.bcryptRounds });
const payments: PaymentProvider = config.paypal
  ? new PayPalPaymentProvider(config.paypal)
  : new MockPaymentProvider();
console.log(
  config.paypal
    ? `Payments: PayPal ${config.paypal.environment}${config.paypal.environment === 'live' ? ' (REAL MONEY)' : ''}`
    : 'Payments: simulated (set PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET for PayPal)',
);
const app = createApp({ db, config, payments });

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
