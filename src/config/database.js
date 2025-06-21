/**
 * Database configuration
 * This module exports the database configuration for the application.
 * It uses environment variables with defaults for development.
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
