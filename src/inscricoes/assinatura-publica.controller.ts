import { Controller, Get, Post, Param, Body, Res, BadRequestException, NotFoundException } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { PrismaService } from '../prisma/prisma.service';
import { FichaPdfService } from './ficha-pdf.service';
import { UploadService } from '../upload/upload.service';

@ApiTags('assinatura-publica')
@Controller('publico/assinatura')
export class AssinaturaPublicaController {
  constructor(
    private prisma: PrismaService,
    private ficha: FichaPdfService,
    private upload: UploadService,
  ) {}

  private async validarToken(token: string) {
    const t: any = await this.prisma.tokens_assinatura.findFirst({ where: { token } });
    if (!t) throw new NotFoundException('Link inválido');
    if (t.usado_em) throw new BadRequestException('Este link já foi utilizado');
    if (new Date(t.expira_em) < new Date()) throw new BadRequestException('Este link expirou. Peça um novo à secretaria.');
    return t;
  }

  @Get(':token')
  @ApiOperation({ summary: 'Dados para a página pública de assinatura (valida o token).' })
  async dados(@Param('token') token: string) {
    const t = await this.validarToken(token);
    const aluno: any = await this.prisma.alunos.findUnique({
      where: { aluno_id: t.aluno_id },
      include: { encarregados: true },
    });
    return {
      ok: true,
      aluno: { nome: aluno?.nome, codigo_aluno: aluno?.codigo_aluno },
      encarregado: { nome: aluno?.encarregados?.nome },
      expira_em: t.expira_em,
    };
  }

  @Get(':token/processo')
  @ApiOperation({ summary: 'O processo (PDF) para o encarregado ler antes de assinar.' })
  async processo(@Param('token') token: string, @Res() res: any) {
    const t = await this.validarToken(token);
    const { pdf } = await this.ficha.gerarProcesso(t.aluno_id);
    res.set({ 'Content-Type': 'application/pdf', 'Content-Disposition': 'inline; filename="processo.pdf"' });
    res.send(pdf);
  }

  @Post(':token')
  @ApiOperation({ summary: 'Submeter: assinatura (base64 PNG) + pessoas autorizadas (até 3).' })
  async assinar(@Param('token') token: string, @Body() body: any) {
    const t = await this.validarToken(token);
    const alunoId = t.aluno_id;

    // 1. A assinatura (data URL base64 → buffer → Cloudinary + anexo)
    const b64 = String(body?.assinatura_base64 || '');
    const m = b64.match(/^data:image\/(png|jpeg);base64,(.+)$/);
    if (!m) throw new BadRequestException('Assinatura em falta ou inválida');
    const buffer = Buffer.from(m[2], 'base64');
    if (buffer.length > 2 * 1024 * 1024) throw new BadRequestException('Assinatura demasiado grande');
    await this.upload.uploadAssinaturaAluno(alunoId, { buffer } as any);

    // 2. As pessoas autorizadas (1 a 3: nome + bi + telefone opcional)
    const lista = Array.isArray(body?.autorizados) ? body.autorizados.slice(0, 3) : [];
    for (const p of lista) {
      const nome = String(p?.nome || '').trim().toUpperCase();
      const bi = String(p?.bi || '').trim().toUpperCase();
      if (!nome || !bi) continue;
      const pessoa = await this.prisma.pessoas_autorizadas.create({
        data: { nome, bi, telefone: p?.telefone ? String(p.telefone).trim() : null },
      });
      await this.prisma.autorizacoes_entrega.create({
        data: { pessoa_id: pessoa.pessoa_id, aluno_id: alunoId, parentesco: p?.parentesco ? String(p.parentesco).toUpperCase() : null },
      });
    }

    // 3. Marcar o token usado + regenerar o processo completo (com tudo)
    await this.prisma.tokens_assinatura.update({
      where: { token_id: t.token_id },
      data: { usado_em: new Date() },
    });
    const { url } = await this.ficha.gerarProcesso(alunoId);
    return { ok: true, processo_url: url, mensagem: 'Documentos assinados com sucesso. Obrigado!' };
  }
}
