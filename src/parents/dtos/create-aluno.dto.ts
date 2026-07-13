import {
  IsString,
  IsUUID,
  MinLength,
  MaxLength,
  IsOptional,
  IsIn,
  IsBoolean,
} from 'class-validator';

export class CreateAlunoDto {
  @IsString({ message: 'Nome deve ser texto' })
  @MinLength(3, { message: 'Nome mínimo 3 caracteres' })
  @MaxLength(100, { message: 'Nome máximo 100 caracteres' })
  nome: string;

  @IsString()
  @MinLength(5, { message: 'Referência mínimo 5 caracteres' })
  referencia_pagamento: string;

  @IsOptional()
  @IsUUID()
  encarregado_id?: string;

  @IsOptional()
  @IsString()
  codigo_aluno?: string;

  @IsOptional()
  @IsString()
  cod_cliente?: string;

  @IsOptional()
  @IsString()
  cod_artigo?: string;

  @IsOptional()
  @IsIn(['ativo', 'inativo'])
  status?: 'ativo' | 'inativo';

  @IsOptional()
  @IsBoolean()
  ativo?: boolean;
}
