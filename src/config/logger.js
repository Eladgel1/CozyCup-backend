import pino from 'pino';

const isProd = process.env.NODE_ENV === 'production';

const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  base: { service: 'cozycup-api', env: process.env.NODE_ENV },
  ...(isProd
    ? {}
    : {
      transport: {
        target: 'pino-pretty',
        options: { singleLine: true },
      },
    }),
});

export default logger;
