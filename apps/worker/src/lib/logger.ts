import pino from 'pino';

export function createLogger(name: string) {
  const level = process.env.LOG_LEVEL || 'info';
  const format = process.env.LOG_FORMAT || 'json';

  return pino({
    name,
    level,
    transport:
      format === 'pretty'
        ? {
            target: 'pino-pretty',
            options: {
              colorize: true,
              translateTime: 'SYS:standard',
              ignore: 'pid,hostname',
            },
          }
        : undefined,
    formatters: {
      level: (label) => ({ level: label }),
    },
    timestamp: pino.stdTimeFunctions.isoTime,
  });
}



