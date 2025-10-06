const mongoose = require('mongoose');
const logger = require('./logger');
const { MONGO_URI } = require('./env');

mongoose.set('strictQuery', true);

async function connectWithRetry(retries = 10, delayMs = 2000) {
  for (let i = 0; i < retries; i++) {
    try {
      await mongoose.connect(MONGO_URI);
      logger.info('Mongo connected');
      return;
    } catch (err) {
      logger.error({ err }, `Mongo connect failed (${i+1}/${retries})`);
      await new Promise(r => setTimeout(r, delayMs));
    }
  }
  process.exit(1);
}

module.exports = { connectWithRetry };
