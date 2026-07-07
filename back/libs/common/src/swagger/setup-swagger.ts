import type { INestApplication } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

/** 각 서비스에 /docs Swagger UI 노출. bootstrapService에서 호출. */
export function setupSwagger(app: INestApplication, serviceName: string): void {
  const config = new DocumentBuilder()
    .setTitle(`${serviceName} API`)
    .setDescription('High-Traffic Ticketing')
    .setVersion('0.1.0')
    .addBearerAuth()
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('docs', app, document, {
    swaggerOptions: { persistAuthorization: true }, // 새로고침해도 Authorize 토큰 유지
  });
}
