import Redis from 'ioredis';
import { logger } from '../utils/logger';

const redis = new Redis({
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD || undefined,
    maxRetriesPerRequest: null,
    enableReadyCheck: false,
});

redis.on('connect', () => {
    logger.info('Connected to Redis');
});

redis.on('error', (err: Error) => {
    logger.error({ err }, 'Redis connection error');
});

export default redis;
