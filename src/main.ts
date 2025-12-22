import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // Cấu hình CORS - cho phép frontend URL từ biến môi trường và các origin từ Vercel
  const frontendUrl = process.env.FRONTEND_URL;
  const allowedOrigins = [
    'http://localhost:5173',
    'http://localhost:5174',
    'http://localhost:3000',
  ];
  
  // Thêm frontend URL từ biến môi trường nếu có
  if (frontendUrl) {
    allowedOrigins.push(frontendUrl);
  }
  
  // Hàm kiểm tra origin có được phép không (sử dụng function để kiểm tra động)
  const originChecker = (origin: string | undefined): boolean => {
    // Cho phép requests không có origin (mobile apps, Postman, etc.)
    if (!origin) {
      return true;
    }
    
    // Cho phép các origin trong danh sách
    if (allowedOrigins.includes(origin)) {
      return true;
    }
    
    // Cho phép tất cả các subdomain của Vercel
    if (origin.includes('.vercel.app')) {
      return true;
    }
    
    // Cho phép custom domain của Vercel (nếu có)
    if (origin.includes('vercel.app')) {
      return true;
    }
    
    // Từ chối các origin khác
    return false;
  };
  
  app.enableCors({
    origin: originChecker,
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
    exposedHeaders: ['Content-Type', 'Authorization'],
  });

  app.useGlobalFilters(new AllExceptionsFilter());

  const config = new DocumentBuilder()
    .setTitle('KFC SCM API')
    .setDescription('The KFC Supply Chain Management API description')
    .setVersion('1.0')
    .addTag('scm')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  await app.listen(process.env.PORT ?? 3001);
}
void bootstrap();
