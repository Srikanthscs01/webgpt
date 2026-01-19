import { Injectable, LoggerService as NestLoggerService, Scope } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import pino, { Logger } from 'pino';

@Injectable()
export class LoggerService implements NestLoggerService {
  private readonly logger: Logger;
  private context?: string;

  constructor(private configService: ConfigService) {
    const level = this.configService.get<string>('LOG_LEVEL', 'info');
    const format = this.configService.get<string>('LOG_FORMAT', 'json');

    this.logger = pino({
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

  setContext(context: string) {
    this.context = context;
  }

  log(message: string, context?: string, ...optionalParams: unknown[]) {
    this.logger.info(
      { context: context || this.context, ...this.formatParams(optionalParams) },
      message,
    );
  }

  error(message: string, trace?: string, context?: string, ...optionalParams: unknown[]) {
    this.logger.error(
      {
        context: context || this.context,
        trace,
        ...this.formatParams(optionalParams),
      },
      message,
    );
  }

  warn(message: string, context?: string, ...optionalParams: unknown[]) {
    this.logger.warn(
      { context: context || this.context, ...this.formatParams(optionalParams) },
      message,
    );
  }

  debug(message: string, context?: string, ...optionalParams: unknown[]) {
    this.logger.debug(
      { context: context || this.context, ...this.formatParams(optionalParams) },
      message,
    );
  }

  verbose(message: string, context?: string, ...optionalParams: unknown[]) {
    this.logger.trace(
      { context: context || this.context, ...this.formatParams(optionalParams) },
      message,
    );
  }

  private formatParams(params: unknown[]): Record<string, unknown> {
    if (params.length === 0) return {};
    if (params.length === 1 && typeof params[0] === 'object') {
      return params[0] as Record<string, unknown>;
    }
    return { params };
  }

  child(bindings: Record<string, unknown>): Logger {
    return this.logger.child(bindings);
  }
}



