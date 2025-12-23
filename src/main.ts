import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { NestExpressApplication } from '@nestjs/platform-express';

async function bootstrap() {
  try {
    console.log('[Bootstrap] Đang khởi tạo NestJS application...');
    const app = await NestFactory.create<NestExpressApplication>(AppModule);
    console.log('[Bootstrap] NestJS application đã được tạo thành công');
    
    // Cấu hình CORS - đơn giản cho local development
    app.enableCors({
      origin: true, // Cho phép tất cả origins cho local development
      methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
      credentials: true,
      allowedHeaders: ['Content-Type', 'Authorization', 'Accept', 'X-Requested-With'],
      exposedHeaders: ['Content-Type', 'Authorization'],
    });
  
  console.log('[Bootstrap] CORS đã được cấu hình');

  // Middleware để log requests - đơn giản cho local development
  app.use((req: any, res: any, next: any) => {
    console.log(`[HTTP] ${req.method} ${req.url}`);
    next();
  });

  app.useGlobalFilters(new AllExceptionsFilter());

  // Setup Swagger
  console.log('[Bootstrap] Đang setup Swagger...');
  try {
    const config = new DocumentBuilder()
      .setTitle('KFC SCM API')
      .setDescription('The KFC Supply Chain Management API description')
      .setVersion('1.0')
      .addTag('scm')
      .addBearerAuth()
      .addServer('http://localhost:3001', 'Local development')
      .build();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document, {
      swaggerOptions: {
        persistAuthorization: true,
      },
      customSiteTitle: 'KFC SCM API Documentation',
    });
    console.log('[Bootstrap] Swagger đã được setup tại /api/docs');
  } catch (swaggerError) {
    console.error('[Bootstrap] Lỗi khi setup Swagger:', swaggerError);
    // Tiếp tục chạy dù Swagger có lỗi
  }

  const port = process.env.PORT ?? 3001;
  console.log(`[Bootstrap] Đang lắng nghe trên port ${port}...`);
  await app.listen(port);
  console.log(`[Bootstrap] ✅ Backend đã sẵn sàng tại http://localhost:${port}`);
  console.log(`[Bootstrap] ✅ Swagger docs tại http://localhost:${port}/api/docs`);
  } catch (error) {
    console.error('[Bootstrap] Lỗi khi khởi động backend:', error);
    if (error instanceof Error) {
      console.error('[Bootstrap] Error message:', error.message);
      console.error('[Bootstrap] Error stack:', error.stack);
    }
    process.exit(1);
  }
}
void bootstrap();
