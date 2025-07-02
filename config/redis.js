import config from './env.js';
import { createClient } from 'redis';

let redisClient = null;

const createRedisClient = async () => {
    if (redisClient) {
        return redisClient;
    }

    redisClient = createClient({
        username: config.redis.redis_user,
        password: config.redis.redis_pass,
        socket: {
            host: config.redis.redis_host,
            port: config.redis.redis_port,
            connectTimeout: 10000,
            reconnectStrategy: (retries) => Math.min(retries * 50, 2000)
        }
    });

    redisClient.on('error', (err) => {
        console.error('Redis Client Error:', err);
    });

    await redisClient.connect();

    return redisClient;
}

export default createRedisClient;