import pino from 'pino';

const isDevelopment = process.env.NODE_ENV === 'development';

/**
 * Initializes a logger instance with the specified log level and transport.
 * The transport is set to 'pino-pretty' in development mode for colored and formatted output.
 */
export const logger = pino({
    level: process.env.LOG_LEVEL || 'info',
    transport: isDevelopment
        ? {
            target: 'pino-pretty',
            options: {
                colorize: true,
                translateTime: 'HH:MM:ss',
                ignore: 'pid,hostname',
            },
        }
        : undefined,
});

export default logger;