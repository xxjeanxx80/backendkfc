import { Controller, Get } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(
    private readonly appService: AppService,
    private readonly dataSource: DataSource,
  ) {}

  @Get()
  getHello(): string {
    console.log('[AppController] GET / - Request received');
    const result = this.appService.getHello();
    console.log('[AppController] GET / - Response:', result);
    return result;
  }

  @Get('health/db')
  async getDbHealth() {
    console.log('[AppController] GET /health/db - Request received');
    const start = Date.now();
    try {
      await this.dataSource.query('SELECT 1');
      const duration = Date.now() - start;
      const result = { status: 'UP', durationMs: duration };
      console.log('[AppController] GET /health/db - Response:', result);
      return result;
    } catch (error) {
      const duration = Date.now() - start;
      const result = {
        status: 'DOWN',
        durationMs: duration,
        error: (error as Error).message,
      };
      console.error('[AppController] GET /health/db - Error:', result);
      return result;
    }
  }

  @Get('test')
  getTest() {
    console.log('[AppController] GET /test - Request received');
    return {
      message: 'Test endpoint working!',
      timestamp: new Date().toISOString(),
      server: 'KFC SCM Backend',
    };
  }
}
