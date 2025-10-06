const http = require('http');
const app = require('./app');
const logger = require('./config/logger');
const { PORT } = require('./config/env');
const { connectWithRetry } = require('./config/db');
const mongoose = require('mongoose');

(async () => {
  await connectWithRetry();

  const server = http.createServer(app);

  server.listen(PORT, () => logger.info({ port: PORT }, 'Server listening'));

  // graceful shutdown
  const shut = async (sig) => {
    logger.info({ sig }, 'Shutting down');
    server.close(async () => {
      await mongoose.connection.close().catch(()=>{});
      process.exit(0);
    });
    setTimeout(() => process.exit(1), 10000).unref();
  };
  ['SIGINT','SIGTERM'].forEach(s => process.on(s, () => shut(s)));
})();

