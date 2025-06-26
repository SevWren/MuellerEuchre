/**
 * Database configuration
 * This module exports the database configuration for the application.
 * It uses environment variables with defaults for development.
 *
 * # Euchre Multiplayer Projected Final State (Layered Rewrite)
 * -----------------------------------------------------------------
 * This file will remain the single source of truth for all database
 * connection configuration, supporting both MongoDB (for game state)
 * and Redis (for caching/session management, if enabled).
 *
 * - All connection parameters (host, port, db, options) will be
 *   environment-driven for portability and CI/CD compatibility.
 * - The config object will be imported by the persistence layer
 *   (e.g., src/db/gameRepository.js) and any future modules that
 *   require direct DB/Redis access.
 * - No logic or connection code will be present here—only config.
 * - As the project matures, additional config sections may be added
 *   for other persistence layers (e.g., audit logs, analytics).
 * - This file will never import from any other part of the codebase.
 * - All values must be serializable and safe for use in Docker/k8s.
 *
 * # Example Usage (in Layer 2/3):
 *   import databaseConfig from '../config/database.js';
 *   const { host, port, database, options } = databaseConfig.mongodb;
 *
 * # Do not add logic, connection pools, or side effects here.
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
