const logger = require('../config/logger');

module.exports = (err, _req, res, _next) => {
  logger.error({ err }, 'Request error');
  if (res.headersSent) return;
  const status = err.status || 500;
  if (_req.accepts('json')) return res.status(status).json({ error: err.message || 'Server error' });
  res.status(status).send(err.message || 'Server error');
};
