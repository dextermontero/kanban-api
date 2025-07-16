import * as dotenv from 'dotenv';  // Import dotenv module
dotenv.config();

const config = {
    database: {
        uri: process.env.MONGODB_CONNECTION_STRING || 'mongodb://localhost:27017',
        db_name: process.env.MONGODB_DB || 'kanban',
    },

    server: {
        app_name: process.env.APP_NAME || "localhost",
        app_env: process.env.APP_ENV || "development",
        app_tag: process.env.APP_TAG || "localhost",
        app_debug: JSON.parse(process.env.APP_DEBUG || 'true'),
        app_url: process.env.APP_URL || "localhost",
        port: process.env.APP_PORT || 8002
    },

    jwt: {
        jwt_secret_token: process.env.JWT_SECRET_TOKEN || "",
        jwt_secret_token_expiry: process.env.JWT_SECRET_TOKEN_EXPIRATION || "30m",
        jwt_refresh_token: process.env.JWT_REFRESH_TOKEN || "",
        jwt_refresh_token_expiry: process.env.JWT_REFRESH_TOKEN_EXPIRATION || "7d"
    },

    redis: {
        redis_host: process.env.REDIS_HOST || "localhost",
        redis_port: process.env.REDIS_PORT || 6379,
        redis_user: process.env.REDIS_USERNAME || "root",
        redis_pass: process.env.REDIS_PASSWORD || "",
        redis_prefix: process.env.REDIS_KEY_PREFIX
    }
}

export default config;