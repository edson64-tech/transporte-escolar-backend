import { Controller, Post, Body, UseGuards, Req } from '@nestjs/common';
import { AuthService } from './auth.service';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { LoginMotoristaDto, LoginEncarregadoDto, LoginAdminDto } from './dto/login.dto';
import { AuthGuard } from '@nestjs/passport';

@ApiTags('Autenticação')

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('login/motorista')
  @ApiOperation({ summary: 'Login do motorista (retorna JWT token)' })
  @ApiResponse({ status: 200, description: 'Login realizado com sucesso' })
  @ApiResponse({ status: 401, description: 'Credenciais inválidas' })
  async loginMotorista(@Body() dto: LoginMotoristaDto) {
    return this.authService.loginMotorista(dto);
  }

  @Post('login/encarregado')
  @ApiOperation({ summary: 'Login do encarregado/pai (retorna JWT token)' })
  @ApiResponse({ status: 200, description: 'Login realizado com sucesso' })
  @ApiResponse({ status: 401, description: 'Credenciais inválidas' })
  async loginEncarregado(@Body() dto: LoginEncarregadoDto) {
    return this.authService.loginEncarregado(dto);
  }

  @Post('refresh')
  @UseGuards(AuthGuard('jwt'))
  async refresh(@Req() req: any) {
    return this.authService.refreshToken(req.user);
  }

  @Post('login/admin')
  @ApiOperation({ summary: 'Login do administrador (retorna JWT token)' })
  @ApiResponse({ status: 200, description: 'Login realizado com sucesso' })
  @ApiResponse({ status: 401, description: 'Credenciais inválidas' })
  async loginAdmin(@Body() dto: LoginAdminDto) {
    return this.authService.loginAdmin(dto);
  }
}
