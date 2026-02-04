import 'server-only';
import pino from 'pino';

const isDevelopment = process.env.NODE_ENV !== 'production';

const pinoConfig = {
  level: process.env.LOG_LEVEL || (isDevelopment ? 'debug' : 'info'),
  
  transport: isDevelopment
    ? {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'HH:MM:ss',
          ignore: 'pid,hostname',
          singleLine: false,
        },
      }
    : undefined,

  base: {
    env: process.env.NODE_ENV || 'development',
  },

  serializers: {
    error: pino.stdSerializers.err,
    req: pino.stdSerializers.req,
    res: pino.stdSerializers.res,
  },
};

const globalForLogger = global as unknown as { logger: pino.Logger };

export const logger = globalForLogger.logger || pino(pinoConfig);

if (process.env.NODE_ENV !== 'production') globalForLogger.logger = logger;

export function createLogger(context: Record<string, unknown>) {
  return logger.child(context);
}

export default logger;
