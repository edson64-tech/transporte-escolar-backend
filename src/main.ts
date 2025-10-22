import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { cors: true });

  // ✅ 1️⃣ CORS completo (para os teus 4 frontends)
  app.enableCors({
    origin: [
      'https://escolar.assistance24.ao',
      'https://painel.assistance24.ao',
      'http://localhost:3000',
      'http://localhost:5173', // caso uses Vite
    ],
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization'],
  });

  // ✅ 2️⃣ Validação global (segurança + limpeza dos dados recebidos)
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true, // ignora campos não declarados nos DTOs
      forbidNonWhitelisted: true, // erro se o cliente enviar campos extras
      transform: true, // converte tipos automaticamente (ex: string → number)
    }),
  );

  // ✅ 3️⃣ Configuração Swagger (documentação da API)
  const config = new DocumentBuilder()
    .setTitle('Assistance24 - Transporte Escolar API')
    .setDescription(
      'Documentação oficial das APIs do sistema de transporte escolar Assistance24. Inclui endpoints de alunos, motoristas, rotas, viagens, notificações e pagamentos.',
    )
    .setVersion('1.0')
    .addBearerAuth() // habilita botão “Authorize” com JWT
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  // ✅ 4️⃣ Subir aplicação
  const port = process.env.PORT || 3000;
  await app.listen(port);
  console.log(`🚀 API on http://localhost:${port}`);
  console.log(`📘 Swagger docs at http://localhost:${port}/api/docs`);
}
bootstrap();
