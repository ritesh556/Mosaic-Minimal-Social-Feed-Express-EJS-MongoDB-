const path = require('path');
require('dotenv').config({ path: path.join(process.cwd(), '.env') });

const env = (key, fallback) => process.env[key] ?? fallback;

module.exports = {
  NODE_ENV: env('NODE_ENV', 'development'),
  PORT: Number(env('PORT', 3000)),
  MONGO_URI: env('MONGO_URI', 'mongodb://127.0.0.1:27017/authtestapp'),
  JWT_SECRET: env('JWT_SECRET', 'change-me'),
  COOKIE_NAME: env('COOKIE_NAME', 'token'),
  COOKIE_DOMAIN: env('COOKIE_DOMAIN', undefined),
   GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
  GOOGLE_CALLBACK_URL: process.env.GOOGLE_CALLBACK_URL || 'http://localhost:3000/auth/google/callback',
};