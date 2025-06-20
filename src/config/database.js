/**
 * Database configuration
 * This module exports the database configuration for the application.
 * It uses environment variables with defaults for development.
 */

/**
 * @exports config
 * @description Database configuration object for the application.
 * Contains settings for MongoDB and Redis connections.
 * Values are primarily sourced from environment variables with sensible defaults for development.
 *
 * @property {object} mongodb - Configuration for MongoDB connection.
 * @property {string} mongodb.host - MongoDB host. Defaults to 'localhost'. (Env: `MONGO_HOST`)
 * @property {number} mongodb.port - MongoDB port. Defaults to 27017. (Env: `MONGO_PORT`)
 * @property {string} mongodb.database - MongoDB database name. Defaults to 'euchre'. (Env: `MONGO_DB`)
 * @property {object} mongodb.options - MongoDB connection options.
 * @property {boolean} mongodb.options.useNewUrlParser - Use new URL parser.
 * @property {boolean} mongodb.options.useUnifiedTopology - Use new server discovery and monitoring engine.
 * @property {number} mongodb.options.serverSelectionTimeoutMS - Timeout for server selection.
 * @property {number} mongodb.options.connectTimeoutMS - Connection timeout.
 * @property {number} mongodb.options.socketTimeoutMS - Socket timeout.
 * @property {number} mongodb.options.maxPoolSize - Maximum connection pool size.
 * @property {boolean} mongodb.options.retryWrites - Enable retryable writes.
 * @property {string} mongodb.options.w - Write concern.
 *
 * @property {object} redis - Configuration for Redis connection.
 * @property {string} redis.host - Redis host. Defaults to 'localhost'. (Env: `REDIS_HOST`)
 * @property {number} redis.port - Redis port. Defaults to 6379. (Env: `REDIS_PORT`)
 * @property {string} redis.password - Redis password. Defaults to empty string. (Env: `REDIS_PASSWORD`)
 * @property {number} redis.ttl - Default Time-To-Live for Redis keys in seconds (e.g., for caching). Defaults to 24 hours.
 */
const config = {
    mongodb: {
        host: process.env.MONGO_HOST || 'localhost',
        port: process.env.MONGO_PORT || 27017,
        database: process.env.MONGO_DB || 'euchre',
        options: {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            serverSelectionTimeoutMS: 5000,
            connectTimeoutMS: 10000,
            socketTimeoutMS: 45000,
            maxPoolSize: 10,
            retryWrites: true,
            w: 'majority'
        }
    },
    redis: {
        host: process.env.REDIS_HOST || 'localhost',
        port: process.env.REDIS_PORT || 6379,
        password: process.env.REDIS_PASSWORD || '',
        ttl: 86400 // 24 hours in seconds
    }
};

/**
 * @description Validates that required environment variables for database configuration
 * are set when the application is running in a 'production' environment.
 * Throws an error if any required variables are missing.
 */
// Validate required environment variables in production
if (process.env.NODE_ENV === 'production') {
    const requiredVars = [
        'MONGO_HOST',
        'MONGO_PORT',
        'MONGO_DB'
    ];

    const missingVars = requiredVars.filter(varName => !process.env[varName]);
    
    if (missingVars.length > 0) {
        throw new Error(`Missing required environment variables: ${missingVars.join(', ')}`);
    }
}

export default config;
