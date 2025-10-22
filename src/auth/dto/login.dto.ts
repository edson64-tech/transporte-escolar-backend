import { ApiProperty } from '@nestjs/swagger';
import { IsString, IsNotEmpty, MinLength } from 'class-validator';

export class LoginMotoristaDto {
  @ApiProperty({ example: '923456789', description: 'Telefone do motorista' })
  @IsString()
  @IsNotEmpty()
  telefone: string;

  @ApiProperty({ example: '1234', description: 'Senha do motorista' })
  @IsString()
  @IsNotEmpty()
  @MinLength(4)
  senha: string;
}

export class LoginEncarregadoDto {
  @ApiProperty({ example: '923456789', description: 'Telefone do encarregado' })
  @IsString()
  @IsNotEmpty()
  telefone: string;

  @ApiProperty({ example: '1234', description: 'Senha do encarregado' })
  @IsString()
  @IsNotEmpty()
  @MinLength(4)
  senha: string;
}

export class LoginAdminDto {
  @ApiProperty({ example: 'admin@transporte.ao', description: 'Email do admin' })
  @IsString()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ example: 'admin123', description: 'Senha do admin' })
  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  senha: string;
}
