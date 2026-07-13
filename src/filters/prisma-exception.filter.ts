import {
  Catch,
  ExceptionFilter,
  ArgumentsHost,
  HttpStatus,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';

@Catch(Prisma.PrismaClientKnownRequestError)
export class PrismaExceptionFilter implements ExceptionFilter {
  catch(
    exception: Prisma.PrismaClientKnownRequestError,
    host: ArgumentsHost,
  ) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = 'Erro na base de dados';

    // P2002 = Unique constraint violation
    if (exception.code === 'P2002') {
      status = HttpStatus.CONFLICT;
      const field = exception.meta?.target?.[0] || 'campo';
      message = `${field} já existe no sistema`;
    }

    // P2025 = Record not found
    if (exception.code === 'P2025') {
      status = HttpStatus.NOT_FOUND;
      message = 'Registro não encontrado';
    }

    response.status(status).json({
      statusCode: status,
      message,
      error: process.env.NODE_ENV === 'development' ? exception.message : undefined,
    });
  }
}
