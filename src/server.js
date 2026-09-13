const app = require('./app');
const connectDB = require('./config/database');
const { port } = require('./config/environment');
const logger = require('./utils/logger');

async function startServer() {
  // Connect to MongoDB first
  await connectDB();

  const server = app.listen(port, () => {
    logger.info(`Server is running on port ${port}`);
  });

  process.on('unhandledRejection', (err) => {
    logger.error(`Unhandled Rejection: ${err.message}`);
    server.close(() => process.exit(1));
  });
}

startServer();

