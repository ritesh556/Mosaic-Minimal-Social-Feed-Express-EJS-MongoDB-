// src/config/security.js
const helmet = require('helmet');
const cors = require('cors');
const compression = require('compression');
const rateLimit = require('express-rate-limit');

module.exports = function security(app) {
  app.use(helmet({
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    contentSecurityPolicy: {
      useDefaults: true,
      directives: {
        "default-src": ["'self'"],
        // Tailwind CDN + (optional) blob workers
        "script-src": ["'self'", "https://cdn.jsdelivr.net", "blob:"],
        "script-src-elem": ["'self'", "https://cdn.jsdelivr.net", "blob:"],
        // TEMP: you have onclick/onload in EJS. Remove those and change to "'none'".
        "script-src-attr": ["'unsafe-inline'"],
        // Tailwind injects <style>; you also have small inline styles
        "style-src": ["'self'", "'unsafe-inline'"],
        // Allow uploads, data: thumbnails, blob URLs, and remote https images
        "img-src": ["'self'", "data:", "blob:", "https:"],
        "font-src": ["'self'", "data:"],
        "connect-src": ["'self'", "https://cdn.jsdelivr.net"],
        "worker-src": ["'self'", "blob:"],
        "object-src": ["'none'"],
        "frame-ancestors": ["'none'"]
      }
    }
  }));

  app.use(compression());
  app.use(cors({ origin: false })); // keep off unless you need cross-origin API access

  // Basic rate limits
  const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 50, standardHeaders: true, legacyHeaders: false });
  const apiLimiter  = rateLimit({ windowMs: 60 * 1000,  max: 300, standardHeaders: true, legacyHeaders: false });

  app.use(['/login', '/create'], authLimiter);
  app.use('/api', apiLimiter);
};
