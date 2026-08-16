import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';
import { AppConfig } from './config/configuration';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule, { bufferLogs: false });
  const config = app.get(ConfigService) as ConfigService<AppConfig, true>;

  app.enableCors({ origin: true, credentials: true });
  // Валидация тела запросов выполняется пайпом ZodBody на каждом контроллере.

  const port = config.get('port', { infer: true });
  await app.listen(port, '0.0.0.0');
  const log = new Logger('Bootstrap');
  log.log(`API запущен на :${port}`);
  // Одна сборка отдаёт и API, и мини-приложение (ServeStaticModule).
  log.log('Мини-приложение раздаётся из этой же сборки (статикой).');
}

void bootstrap();
