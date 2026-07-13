import {
  IsString,
  IsEmail,
  MinLength,
  MaxLength,
  IsOptional,
} from 'class-validator';

export class CreateEncarregadoDto {
  @IsString()
  @MinLength(3, { message: 'Nome mínimo 3 caracteres' })
  @MaxLength(100, { message: 'Nome máximo 100 caracteres' })
  nome: string;

  @IsString()
  @MinLength(9, { message: 'Telefone mínimo 9 dígitos' })
  telefone: string;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsString()
  @MinLength(8, { message: 'Senha mínimo 8 caracteres' })
  senha: string;
}
