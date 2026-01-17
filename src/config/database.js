/**
 * Database configuration settings.
 * Defaults to local MongoDB instance.
 */
export default {
  mongodb: {
    host: process.env.MONGO_HOST || 'localhost',
    port: process.env.MONGO_PORT || 27017,
    database: process.env.MONGO_DB || 'euchre',
    options: {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000, // Fail fast if DB is down
      family: 4 // Force IPv4 to avoid localhost delay issues
    }
  }
};