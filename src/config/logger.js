const pino = require('pino');
const { NODE_ENV } = require('./env');

module.exports = pino({
  level: process.env.LOG_LEVEL || 'info',
  transport: NODE_ENV === 'development' ? { target: 'pino-pretty' } : undefined
});
