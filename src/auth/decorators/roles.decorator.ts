import { SetMetadata } from '@nestjs/common';

export enum UserRole {
  ADMIN = 'admin',
  MOTORISTA = 'motorista',
  ENCARREGADO = 'encarregado',
}

export const ROLES_KEY = 'roles';
export const Roles = (...roles: UserRole[]) => SetMetadata(ROLES_KEY, roles);
