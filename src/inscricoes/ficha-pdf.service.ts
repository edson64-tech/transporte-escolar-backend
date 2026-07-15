import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UploadService } from '../upload/upload.service';
import { PDFDocument, StandardFonts, rgb, pushGraphicsState, popGraphicsState, moveTo, lineTo, closePath, clip, endPath } from 'pdf-lib';
import * as fs from 'fs';

const TEMPLATE = '/root/templates/ficha_adesao.pdf';

// Coordenadas calibradas (pts, origem canto inferior esquerdo, A4 595.3x842)
const C: Record<string, [number, number]> = {
  nome: [127, 670], data_nasc: [133, 647],
  sexo_M: [363, 647], sexo_F: [427, 647],
  naturalidade: [112, 624], sala: [318, 624], turma: [411, 624], classe: [506, 624],
  morada: [82, 602],
  nome_pai: [105, 558], nome_mae: [111, 535], nome_enc: [240, 511],
  contacto_pai: [112, 468], contacto_mae: [422, 468], contacto_enc: [240, 445],
  email: [163, 422],
  end_recolha: [145, 161],
  lat_rec: [344, 141], lng_rec: [456, 141], serv_rec: [550, 141],
  end_regresso: [150, 121],
  lat_reg: [344, 101], lng_reg: [459, 101], serv_reg: [550, 101],
  data_dia: [441, 19], data_mes: [487, 19], data_ano: [532, 19],
  codigo: [504, 670], bi: [400, 602], referencia_rodape: [180, 20],
};
const COL: Record<string, number> = { DESTINO: 213, A: 252, B: 277, C: 313, D: 338, E: 374, F: 399 };
const LINHA: Record<string, number> = {
  PATRIOTA: 377, CAMAMA: 357, TALATONA: 337.5, ZANGO: 318, BENFICA: 298,
  'ZONA VERDE': 279, 'KILAMBA 1': 259, 'KILAMBA 2': 240, 'KILAMBA KK': 220, 'BOA VIDA': 201,
};

@Injectable()
export class FichaPdfService {
  constructor(private prisma: PrismaService, private upload: UploadService) {}

  private fmtData(d: Date | null): string {
    if (!d) return '';
    const dd = String(d.getDate()).padStart(2, '0');
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    return `${dd} / ${mm} / ${d.getFullYear()}`;
  }

  // Normaliza o nome da rota para a linha da tabela da ficha
  private linhaDaRota(nomeRota: string | null, codigoRota?: string | null): number | null {
    // 1º: pelo código da rota (determinístico)
    const porCodigo: Record<string, string> = {
      PT: 'PATRIOTA', CM: 'CAMAMA', TL: 'TALATONA', ZG: 'ZANGO', BF: 'BENFICA',
      ZV: 'ZONA VERDE', KL11: 'KILAMBA 1', KL12: 'KILAMBA 2', KK: 'KILAMBA KK', VD: 'BOA VIDA', BV: 'BOA VIDA',
    };
    if (codigoRota) {
      const cod = String(codigoRota).toUpperCase();
      // tenta o código completo (KL1, KL2) e depois o prefixo de 2 letras
      for (const chave of ['KL11', 'KL12', 'KK']) {
        if (cod.startsWith(chave) && porCodigo[chave]) return LINHA[porCodigo[chave]];
      }
      const pref = cod.slice(0, 2);
      if (porCodigo[pref]) return LINHA[porCodigo[pref]];
    }
    // 2º: pelo nome (mais longo primeiro, para KILAMBA KK vencer KILAMBA)
    if (!nomeRota) return null;
    const n = nomeRota.toUpperCase();
    const chaves = Object.keys(LINHA).sort((a, b) => b.length - a.length);
    for (const chave of chaves) {
      if (n.includes(chave)) return LINHA[chave];
    }
    return null;
  }

  async gerarFicha(alunoId: string): Promise<{ pdf: Buffer; url: string | null }> {
    const aluno = await this.prisma.alunos.findUnique({
      where: { aluno_id: alunoId },
      include: {
        encarregados: true,
        contratos_servico: { include: { rotas: true }, orderBy: { created_at: 'desc' }, take: 1 },
        adesoes_servico: { orderBy: { created_at: 'desc' }, take: 1 },
      },
    });
    if (!aluno) throw new NotFoundException('Aluno não encontrado');

    const contrato = aluno.contratos_servico?.[0] || null;
    const adesao = aluno.adesoes_servico?.[0] || null;
    const rotaNome = contrato?.rotas?.nome || null;
    const servicos: string[] = Array.isArray(adesao?.services_escolhidos)
      ? (adesao!.services_escolhidos as any[]).map(String)
      : [];

    const bytes = fs.readFileSync(TEMPLATE);
    const doc = await PDFDocument.load(bytes);
    const font = await doc.embedFont(StandardFonts.HelveticaBold);
    const page = doc.getPages()[0];
    const azul = rgb(0.1, 0.1, 0.45);

    const txt = (chave: string, valor: any, tamanho = 9) => {
      if (valor == null || valor === '') return;
      const [x, y] = C[chave];
      page.drawText(String(valor), { x, y, size: tamanho, font, color: azul });
    };

    txt('nome', aluno.nome);
    if (aluno.data_nascimento) {
      const dn = new Date(aluno.data_nascimento as any);
      page.drawText(String(dn.getDate()).padStart(2, '0'), { x: 132, y: 646, size: 9, font, color: azul });
      page.drawText(String(dn.getMonth() + 1).padStart(2, '0'), { x: 175, y: 646, size: 9, font, color: azul });
      page.drawText(String(dn.getFullYear()), { x: 226, y: 646, size: 9, font, color: azul });
    }
    if (aluno.sexo) {
      const chave = String(aluno.sexo).toUpperCase().startsWith('M') ? 'sexo_M' : 'sexo_F';
      txt(chave, 'X', 11);
    }
    txt('naturalidade', aluno.naturalidade);
    txt('sala', aluno.sala); txt('turma', aluno.turma); txt('classe', aluno.classe);
    txt('morada', aluno.morada);
    txt('nome_pai', aluno.nome_pai); txt('nome_mae', aluno.nome_mae);
    txt('nome_enc', aluno.encarregados?.nome);
    txt('contacto_pai', aluno.contacto_pai); txt('contacto_mae', aluno.contacto_mae);
    txt('contacto_enc', aluno.encarregados?.telefone);
    txt('email', aluno.encarregados?.email);

    // Tabela: X no destino (rota) + serviços
    const ly = this.linhaDaRota(rotaNome, contrato?.rotas?.codigo || null);
    if (ly != null) {
      page.drawText('X', { x: COL['DESTINO'] - 3, y: ly - 4, size: 9, font, color: azul });
      for (const s of servicos) {
        const cx = COL[String(s).toUpperCase()];
        if (cx) page.drawText('X', { x: cx - 3, y: ly - 4, size: 9, font, color: azul });
      }
    }

    // Serviço por endereço: A/B = recolha, C/D/E/F = regresso
    const servRec = servicos.filter((s) => ['A', 'B'].includes(String(s).toUpperCase())).join('+');
    const servReg = servicos.filter((s) => ['C', 'D', 'E', 'F'].includes(String(s).toUpperCase())).join('+');
    txt('serv_rec', servRec, 8);
    txt('serv_reg', servReg, 8);

    // Campos do template 2026: código (linha do nome), B.I. (linha da morada), referência (rodapé)
    if (aluno.codigo_aluno) page.drawText(String(aluno.codigo_aluno), { x: 504, y: 670, size: 9, font, color: azul });
    if (aluno.num_documento) page.drawText(String(aluno.num_documento), { x: 424, y: 602, size: 8, font, color: azul });
    if (aluno.referencia_pagamento) page.drawText(String(aluno.referencia_pagamento), { x: 180, y: 20, size: 12, font, color: azul });

    // Assinatura do encarregado (anexo do tablet, quando existir)
    try {
      const ass = await this.prisma.anexos_aluno.findFirst({
        where: { aluno_id: aluno.aluno_id, tipo: 'assinatura_encarregado' },
        orderBy: { criado_em: 'desc' },
      });
      if (ass?.url) {
        const rr = await fetch(ass.url);
        if (rr.ok) {
          const raw2 = Buffer.from(await rr.arrayBuffer());
          const ehPng2 = raw2[0] === 0x89 && raw2[1] === 0x50;
          const img2 = ehPng2 ? await doc.embedPng(raw2) : await doc.embedJpg(raw2);
          const caixaW = 164, caixaH = 27, caixaX = 404, caixaY = 38;
          const esc2 = Math.min(caixaW / img2.width, caixaH / img2.height);
          const w2 = img2.width * esc2, h2 = img2.height * esc2;
          page.drawImage(img2, { x: caixaX + (caixaW - w2) / 2, y: caixaY + (caixaH - h2) / 2, width: w2, height: h2 });
        }
      }
    } catch { /* sem assinatura */ }

    // Endereços + coordenadas
    txt('end_recolha', aluno.endereco_recolha, 8);
    txt('lat_rec', aluno.recolha_lat != null ? Number(aluno.recolha_lat).toFixed(4) : '', 8);
    txt('lng_rec', aluno.recolha_lng != null ? Number(aluno.recolha_lng).toFixed(4) : '', 8);
    txt('end_regresso', aluno.endereco_regresso, 8);
    txt('lat_reg', aluno.regresso_lat != null ? Number(aluno.regresso_lat).toFixed(4) : '', 8);
    txt('lng_reg', aluno.regresso_lng != null ? Number(aluno.regresso_lng).toFixed(4) : '', 8);

    // Data de hoje
    const hoje = new Date();
    txt('data_dia', String(hoje.getDate()).padStart(2, '0'));
    txt('data_mes', String(hoje.getMonth() + 1).padStart(2, '0'));
    txt('data_ano', hoje.getFullYear());

    // Foto do aluno (por baixo do logotipo Aurora)
    if (aluno.foto_url) {
      try {
        const resp = await fetch(aluno.foto_url);
        if (resp.ok) {
          const raw = Buffer.from(await resp.arrayBuffer());
          const ehPng = raw[0] === 0x89 && raw[1] === 0x50;
          const img = ehPng ? await doc.embedPng(raw) : await doc.embedJpg(raw);
          // caixa 48x60 centrada sob o logo (x 487-572), mantendo a proporção
          const boxW = 64, boxH = 70, boxX = 474, boxY = 720;
          const esc = Math.min(boxW / img.width, boxH / img.height);
          const w = img.width * esc, hgt = img.height * esc;
          page.drawImage(img, { x: boxX + (boxW - w) / 2, y: boxY + (boxH - hgt) / 2, width: w, height: hgt });
        }
      } catch (e: any) {
        console.error('Foto do aluno não incluída na ficha:', e?.message);
      }
    }

    const pdfBytes = await doc.save();
    const pdf = Buffer.from(pdfBytes);

    // Upload ao Cloudinary (não bloqueia a resposta se falhar)
    let url: string | null = null;
    try {
      const up = await this.upload.uploadPdfAluno(alunoId, pdf, 'ficha_adesao', `Ficha_${aluno.codigo_aluno || alunoId}.pdf`);
      url = up.url;
    } catch (e: any) {
      console.error('Upload da ficha falhou (PDF devolvido na mesma):', e?.message);
    }

    return { pdf, url };
  }

  // PROCESSO DE INSCRIÇÃO: ficha + regulamento (4 págs) com assinaturas e declaração
  async gerarProcesso(alunoId: string): Promise<{ pdf: Buffer; url: string | null }> {
    const { pdf: fichaBuf } = await this.gerarFicha(alunoId);

    const aluno: any = await this.prisma.alunos.findUnique({
      where: { aluno_id: alunoId },
      include: {
        encarregados: true,
        autorizacoes_entrega: { where: { ativo: true }, include: { pessoas_autorizadas: true }, take: 3 },
      },
    });

    const processo = await PDFDocument.create();
    const fichaDoc = await PDFDocument.load(fichaBuf);
    const regDoc = await PDFDocument.load(fs.readFileSync('/root/templates/regulamento.pdf'));
    const [pF] = await processo.copyPages(fichaDoc, [0]);
    processo.addPage(pF);
    (await processo.copyPages(regDoc, [0, 1, 2, 3])).forEach((p) => processo.addPage(p));

    const font = await processo.embedFont(StandardFonts.HelveticaBold);
    const azul = rgb(0.1, 0.1, 0.45);
    const hoje = new Date();
    const dd = String(hoje.getDate()).padStart(2, '0');
    const mm = String(hoje.getMonth() + 1).padStart(2, '0');
    const aa = String(hoje.getFullYear());

    // assinatura do encarregado (anexo), embutida no processo
    let assImg: any = null;
    try {
      const ass = await this.prisma.anexos_aluno.findFirst({
        where: { aluno_id: alunoId, tipo: 'assinatura_encarregado' },
        orderBy: { criado_em: 'desc' },
      });
      if (ass?.url) {
        const r = await fetch(ass.url);
        if (r.ok) {
          const raw = Buffer.from(await r.arrayBuffer());
          assImg = raw[0] === 0x89 && raw[1] === 0x50 ? await processo.embedPng(raw) : await processo.embedJpg(raw);
        }
      }
    } catch { /* sem assinatura */ }

    // ===== PÁG 4 do processo (notas essenciais): caixa O CLIENTE + data =====
    const pag4 = processo.getPages()[3];
    // tapar as caixas azuis de fundo (ficam brancas, assinatura limpa)
    const branco = rgb(1, 1, 1);
    pag4.drawRectangle({ x: 0, y: 50, width: 215, height: 55, color: branco });
    pag4.drawRectangle({ x: 378, y: 50, width: 215, height: 55, color: branco });
    if (assImg) {
      const cw = 180, ch = 32, cx = 8, cy = 62;
      const e = Math.min(cw / assImg.width, ch / assImg.height);
      pag4.drawImage(assImg, { x: cx + (cw - assImg.width * e) / 2, y: cy + (ch - assImg.height * e) / 2, width: assImg.width * e, height: assImg.height * e });
    }
    pag4.drawText(dd, { x: 76, y: 41, size: 9, font, color: azul });
    pag4.drawText(mm, { x: 115, y: 41, size: 9, font, color: azul });
    pag4.drawText(aa, { x: 150, y: 41, size: 9, font, color: azul });

    // ===== PÁG 5 (Declaração de Autorização — template v2 limpo) =====
    const pag5 = processo.getPages()[4];
    const t5 = (x: number, y: number, s: string | null | undefined, tam = 9) => {
      if (s) pag5.drawText(String(s), { x, y, size: tam, font, color: azul });
    };
    t5(80, 634, aluno?.encarregados?.nome);                    // Eu:
    t5(116, 615, aluno?.morada, 8);                            // Residente:
    const auts = (aluno?.autorizacoes_entrega || []).map((a: any) => a.pessoas_autorizadas).filter(Boolean);
    const linhasAut = [566, 537, 508];                          // linhas 1. 2. 3.
    auts.slice(0, 3).forEach((p: any, i: number) => {
      t5(72, linhasAut[i], p.nome, 8);
      t5(392, linhasAut[i], p.bi, 8);
    });
    t5(214, 479, aluno?.nome, 8);                               // educando,
    t5(128, 325, dd + ' / ' + mm + ' / ' + aa);                 // LUANDA, AOS
    if (assImg) {
      const e5 = Math.min(140 / assImg.width, 24 / assImg.height);
      pag5.drawImage(assImg, { x: 215, y: 146, width: assImg.width * e5, height: assImg.height * e5 });
    }

    const bytes = await processo.save();
    const pdf = Buffer.from(bytes);
    let url: string | null = null;
    try {
      const up = await this.upload.uploadPdfAluno(alunoId, pdf, 'processo_inscricao', `Processo_${aluno?.codigo_aluno || alunoId}.pdf`);
      url = up.url;
    } catch (e: any) {
      console.error('Upload do processo falhou:', e?.message);
    }
    return { pdf, url };
  }


  // CARTÃO DO ALUNO (PVC CR80): foto cover + nome + serviços/viagens
  async gerarCartao(alunoId: string): Promise<{ pdf: Buffer; url: string | null }> {
    const aluno: any = await this.prisma.alunos.findUnique({
      where: { aluno_id: alunoId },
      include: {
        contratos_servico: { include: { rotas: true }, orderBy: { created_at: 'desc' }, take: 1 },
        adesoes_servico: { orderBy: { created_at: 'desc' }, take: 1 },
      },
    });
    if (!aluno) throw new NotFoundException('Aluno não encontrado');

    const doc = await PDFDocument.load(fs.readFileSync('/root/templates/cartao_frente.pdf'));
    const page = doc.getPages()[0];
    const font = await doc.embedFont(StandardFonts.HelveticaBold);
    const azul = rgb(0.09, 0.2, 0.45);

    if (aluno.foto_url) {
      try {
        const r = await fetch(aluno.foto_url);
        if (r.ok) {
          const raw = Buffer.from(await r.arrayBuffer());
          const img = raw[0] === 0x89 && raw[1] === 0x50 ? await doc.embedPng(raw) : await doc.embedJpg(raw);
          const bx = 43.8, by = 147.6, bw = 65.5, bh = 78.1;
          const esc = Math.max(bw / img.width, bh / img.height);
          const w = img.width * esc, hh = img.height * esc;
          page.pushOperators(
            pushGraphicsState(),
            moveTo(bx, by), lineTo(bx + bw, by), lineTo(bx + bw, by + bh), lineTo(bx, by + bh),
            closePath(), clip(), endPath(),
          );
          page.drawImage(img, { x: bx + (bw - w) / 2, y: by + (bh - hh) / 2, width: w, height: hh });
          page.pushOperators(popGraphicsState());
        }
      } catch { /* sem foto */ }
    }

    const nome = String(aluno.nome || '');
    let tam = 8;
    while (tam > 4.5 && font.widthOfTextAtSize(nome, tam) > 120) tam -= 0.5;
    page.drawText(nome, { x: (153.07 - font.widthOfTextAtSize(nome, tam)) / 2, y: 63, size: tam, font, color: azul });

    const servicos: string[] = Array.isArray(aluno.adesoes_servico?.[0]?.services_escolhidos)
      ? (aluno.adesoes_servico[0].services_escolhidos as any[]).map(String) : [];
    const viagens = aluno.contratos_servico?.[0]?.viagens_dia || null;
    const l1 = servicos.length ? 'SERVIÇOS: ' + servicos.join(' + ') : '';
    const l2 = 'CÓD: ' + (aluno.codigo_aluno || '') + (viagens ? '  •  ' + viagens + ' VIAGEM(NS)/DIA' : '');
    if (l1) page.drawText(l1, { x: (153.07 - font.widthOfTextAtSize(l1, 7)) / 2, y: 26, size: 7, font, color: azul });
    page.drawText(l2, { x: (153.07 - font.widthOfTextAtSize(l2, 6.5)) / 2, y: 14, size: 6.5, font, color: azul });

    const bytes = await doc.save();
    const pdf = Buffer.from(bytes);
    let url: string | null = null;
    try {
      const up = await this.upload.uploadPdfAluno(alunoId, pdf, 'cartao_aluno', `Cartao_${aluno.codigo_aluno || alunoId}.pdf`);
      url = up.url;
    } catch (e: any) { console.error('Upload do cartão falhou:', e?.message); }
    return { pdf, url };
  }

}
