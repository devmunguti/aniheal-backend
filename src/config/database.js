const mongoose = require('mongoose');
const dns = require('dns');
const { mongoUri } = require('./environment');

try {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch (e) {
  // Ignore if not supported
}

let mongodInstance = null;

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(mongoUri, { serverSelectionTimeoutMS: 3000 });
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.warn(`Standard MongoDB connection to ${mongoUri} failed (${error.message}).`);
    
    // In production, NEVER fall back to in-memory database; fail fast so operations teams can diagnose connection issue
    if (process.env.NODE_ENV === 'production') {
      console.error('[FATAL DATABASE ERROR] Production MongoDB connection failed. Exiting process safely.');
      process.exit(1);
    }

    // In development or test, spin up in-memory MongoDB fallback so developer environment works out of the box
    try {
      console.log('Starting Embedded In-Memory MongoDB Server for development/testing...');
      const { MongoMemoryServer } = require('mongodb-memory-server');
      mongodInstance = await MongoMemoryServer.create({
        binary: {
          version: '4.4.29',
        },
      });
      const inMemoryUri = mongodInstance.getUri();
      const conn = await mongoose.connect(inMemoryUri);
      console.log(`Embedded MongoDB Connected: ${conn.connection.host} (${inMemoryUri})`);

      // Automatically run database seed on first in-memory boot
      const runSeed = require('../seeds/seedFunction');
      if (typeof runSeed === 'function') {
        console.log('Auto-populating in-memory database with website content...');
        await runSeed();
      }
    } catch (memErr) {
      console.error(`Embedded database error: ${memErr.message}`);
      process.exit(1);
    }
  }
};

module.exports = connectDB;
