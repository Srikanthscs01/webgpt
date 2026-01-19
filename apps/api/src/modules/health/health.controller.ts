import { Controller, Get, Res } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Response } from 'express';
import { HealthService } from './health.service';
import { SkipThrottle } from '@nestjs/throttler';

@ApiTags('Health')
@Controller()
@SkipThrottle()
export class HealthController {
  constructor(private readonly healthService: HealthService) {}

  @Get('health')
  @ApiOperation({ summary: 'Health check endpoint' })
  async health() {
    return this.healthService.getHealth();
  }

  @Get('metrics')
  @ApiOperation({ summary: 'Prometheus metrics endpoint' })
  metrics(@Res() res: Response) {
    res.setHeader('Content-Type', 'text/plain');
    res.send(this.healthService.getMetrics());
  }
}



