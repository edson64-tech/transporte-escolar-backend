import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { normalizarTelefone } from '../common/telefone.util';
import { FichaPdfService } from '../inscricoes/ficha-pdf.service';
import { UploadService } from '../upload/upload.service';

@Injectable()
export class ParentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly fichaPdf: FichaPdfService,
    private readonly upload: UploadService,
  ) {}

  // ============================================================
  // 📍 ÚLTIMA POSIÇÃO DE UM ALUNO - VERSÃO POSTGIS PROFISSIONAL
  // ============================================================
  async live(alunoId: string, encarregadoId: string) {
    if (!alunoId) {
      throw new BadRequestException('aluno_id é obrigatório');
    }
    // Posse: o encarregado so consulta os proprios filhos
    const dono = await this.prisma.alunos.findUnique({
      where: { aluno_id: alunoId },
      select: { encarregado_id: true },
    });
    if (!dono || dono.encarregado_id !== encarregadoId) {
      throw new NotFoundException('Aluno não encontrado');
    }

    // ✅ Query otimizada com PostGIS
    const result: any[] = await this.prisma.$queryRaw`
      SELECT 
        av.viagem_id,
        av.aluno_id,
        g.gps_id,
        ST_Y(g.geom) as bus_lat,
        ST_X(g.geom) as bus_lng,
        g.velocidade,
        g.timestamp,
        a.home_lat,
        a.home_lng,
        ST_Distance(
          g.geom::geography,
          a.home_geom::geography
        ) as distancia_metros,
        CASE 
          WHEN g.velocidade > 0 THEN 
            ST_Distance(g.geom::geography, a.home_geom::geography) / (g.velocidade * 1000.0 / 3600.0) / 60.0
          ELSE 
            ST_Distance(g.geom::geography, a.home_geom::geography) / (20.0 * 1000.0 / 3600.0) / 60.0
        END as eta_minutos
      FROM public.aluno_viagem av
      JOIN public.viagens v ON v.viagem_id = av.viagem_id
      JOIN public.gps_viagem g ON g.viagem_id = v.viagem_id
      JOIN public.alunos a ON a.aluno_id = av.aluno_id
      WHERE av.aluno_id = ${alunoId}::uuid
        AND av.status_embarque = 'embarcado'
        AND g.geom IS NOT NULL
        AND a.home_geom IS NOT NULL
      ORDER BY g.timestamp DESC
      LIMIT 1
    `;

    if (!result || result.length === 0) {
      return null;
    }

    const data = result[0];

    return {
      viagem_id: data.viagem_id,
      aluno_id: data.aluno_id,
      bus: {
        latitude: Number(data.bus_lat),
        longitude: Number(data.bus_lng),
        velocidade: data.velocidade ? Number(data.velocidade) : null,
      },
      timestamp: data.timestamp,
      distancia_metros: data.distancia_metros ? Math.round(Number(data.distancia_metros)) : null,
      eta_minutos: data.eta_minutos ? Math.round(Number(data.eta_minutos)) : null,
    };
  }

  // ============================================================
  // 👨‍👩‍👧 LISTA OS ALUNOS DO ENCARREGADO (VIA TELEFONE) - CORRIGIDO
  // ============================================================
  async myStudents(telefone: string) {
    if (!telefone) {
      return [];
    }

    // ✅ CORRIGIDO: Buscar encarregado pelo TELEFONE
    const encarregado = await this.prisma.encarregados.findUnique({
      where: { telefone: normalizarTelefone(telefone) },
      select: { encarregado_id: true },
    });

    if (!encarregado) {
      return [];
    }

    // Buscar alunos que têm esse encarregado_id
    const alunos = await this.prisma.alunos.findMany({
      where: { encarregado_id: encarregado.encarregado_id },
      select: {
        aluno_id: true,
        nome: true,
        foto: true,
        foto_url: true,
        referencia_pagamento: true,
        status: true,
        home_lat: true,
        home_lng: true,
        data_nascimento: true,
        sala: true,
        turma: true,
        classe: true,
        morada: true,
        endereco_recolha: true,
        endereco_regresso: true,
        contratos_servico: {
          orderBy: { created_at: 'desc' },
          take: 1,
          select: { viagens_dia: true, rotas: { select: { codigo: true, nome: true, escola_id: true } } },
        },
        adesoes_servico: {
          orderBy: { created_at: 'desc' },
          take: 1,
          select: { services_escolhidos: true },
        },
      },
      orderBy: { nome: 'asc' },
    });
    const escolas = await this.prisma.escolas.findMany({ select: { escola_id: true, nome: true } });
    const nomeEscola = new Map(escolas.map((e) => [e.escola_id, e.nome]));
    return alunos.map((a: any) => {
      const rota = a.contratos_servico?.[0]?.rotas || null;
      const servicos = a.adesoes_servico?.[0]?.services_escolhidos || [];
      const { contratos_servico, adesoes_servico, ...base } = a;
      return {
        ...base,
        rota_codigo: rota?.codigo || null,
        rota_nome: rota?.nome || null,
        escola: rota?.escola_id ? nomeEscola.get(rota.escola_id) || null : null,
        servicos,
      };
    });
  }

  // ============================================================
  // 💰 HISTÓRICO FINANCEIRO
  // ============================================================
  async billing(alunoId: string, encarregadoId: string) {
    if (!alunoId) {
      throw new BadRequestException('aluno_id é obrigatório');
    }
    // Posse: o encarregado so consulta os proprios filhos
    const dono = await this.prisma.alunos.findUnique({
      where: { aluno_id: alunoId },
      select: { encarregado_id: true },
    });
    if (!dono || dono.encarregado_id !== encarregadoId) {
      throw new NotFoundException('Aluno não encontrado');
    }

    return await this.prisma.pagamentos.findMany({
      where: { aluno_id: alunoId },
      orderBy: { data_pagamento: 'desc' },
      select: {
        pagamento_id: true,
        ano_letivo: true,
        mes: true,
        valor: true,
        data_pagamento: true,
        status: true,
        referencia: true,
      },
    });
  }

  // ============================================================
  // 📝 CRIAR NOVA INSCRIÇÃO (ADESÃO)
  // ============================================================
  async criarInscricao(data: {
    encarregado_id: string;
    aluno_id?: string;
    nome_aluno?: string;
    ano_lectivo_id?: string;
    rota_id?: string;
    viagens_dia?: number;
    services_escolhidos?: string[];
    latitude?: number;
    longitude?: number;
    endereco?: string;
    foto_url?: string;
    observacoes?: string;
    autorizados?: { nome?: string; bi?: string }[];
    assinatura_base64?: string;
    num_documento?: string;
    data_nascimento?: string;
    escola_id?: string;
    sala?: string;
    turma?: string;
    classe?: string;
  }) {
    if (!data.encarregado_id) {
      throw new BadRequestException('encarregado_id é obrigatório');
    }
    if (!data.nome_aluno || data.nome_aluno.trim().length < 3) {
      throw new BadRequestException('nome_aluno é obrigatório (mínimo 3 caracteres)');
    }

    // Regra: max 2 servicos, no max 1 recolha (A/B) e 1 regresso (C-F)
    const RECOLHAS = ['A', 'B'];
    const REGRESSOS = ['C', 'D', 'E', 'F'];
    const servicos = (data.services_escolhidos || []).map((x) => String(x).toUpperCase());
    if (servicos.length < 1 || servicos.length > 2) {
      throw new BadRequestException('Escolha 1 ou 2 serviços');
    }
    if (servicos.some((x) => !RECOLHAS.includes(x) && !REGRESSOS.includes(x))) {
      throw new BadRequestException('Serviço inválido (A a F)');
    }
    if (servicos.filter((x) => RECOLHAS.includes(x)).length > 1) {
      throw new BadRequestException('Escolha no máximo uma recolha (A ou B)');
    }
    if (servicos.filter((x) => REGRESSOS.includes(x)).length > 1) {
      throw new BadRequestException('Escolha no máximo um regresso (C a F)');
    }
    // Pares validos recolha<->regresso:
    // A (manha/creche/ATL) -> C, D ou E; B (tarde) -> F
    const PARES_VALIDOS: Record<string, string[]> = { A: ['C', 'D', 'E'], B: ['F'] };
    const recolhaEsc = servicos.find((x) => RECOLHAS.includes(x));
    const regressoEsc = servicos.find((x) => REGRESSOS.includes(x));
    if (recolhaEsc && regressoEsc && !(PARES_VALIDOS[recolhaEsc] || []).includes(regressoEsc)) {
      throw new BadRequestException(
        `Combinação inválida: a recolha ${recolhaEsc} só permite regresso ${(PARES_VALIDOS[recolhaEsc] || []).join(', ')}`,
      );
    }
    const viagensDia = servicos.length; // deduzido no SERVIDOR (ignora o que o cliente mandar)

    if (data.latitude != null && (data.latitude < -10.5 || data.latitude > -7.5)) {
      throw new BadRequestException('Latitude fora da região esperada');
    }
    if (data.longitude != null && (data.longitude < 12.0 || data.longitude > 14.8)) {
      throw new BadRequestException('Longitude fora da região esperada');
    }
    // Reconfirmacao: o aluno indicado tem de pertencer ao encarregado do token
    if (data.aluno_id) {
      const alunoDono = await this.prisma.alunos.findUnique({
        where: { aluno_id: data.aluno_id },
        select: { encarregado_id: true },
      });
      if (!alunoDono || alunoDono.encarregado_id !== data.encarregado_id) {
        throw new NotFoundException('Aluno não encontrado');
      }
    }

    if (data.rota_id) {
      const rotaOk = await this.prisma.rotas.findUnique({ where: { rota_id: data.rota_id } });
      if (!rotaOk) throw new BadRequestException('Rota inválida');
    }

    // Ano letivo: usa o enviado ou assume o ativo
    let anoId = data.ano_lectivo_id;
    if (!anoId) {
      const ativo = await this.prisma.ano_lectivo.findFirst({
        where: { ativo: true },
        select: { ano_lectivo_id: true },
      });
      if (!ativo) throw new BadRequestException('Não há ano letivo ativo');
      anoId = ativo.ano_lectivo_id;
    }

    // OPCAO A: grava apenas o PEDIDO. Nenhum aluno é criado aqui —
    // a aprovação no painel admin dispara a inscrição canónica.
    // Dados estruturados do aluno (validados aqui, mapeados no painel)
    const dadosAluno: any = {
      num_documento: data.num_documento ? String(data.num_documento).trim().toUpperCase() : null,
      sala: data.sala ? String(data.sala).trim() : null,
      turma: data.turma ? String(data.turma).trim().toUpperCase() : null,
      classe: data.classe ? String(data.classe).trim() : null,
      data_nascimento: null as Date | null,
      escola_id: null as string | null,
    };
    if (data.data_nascimento) {
      const d = new Date(String(data.data_nascimento));
      if (!isNaN(d.getTime()) && d < new Date() && d.getFullYear() > 1990) dadosAluno.data_nascimento = d;
    }
    if (data.escola_id) {
      const esc = await this.prisma.escolas.findUnique({ where: { escola_id: String(data.escola_id) } });
      if (esc) dadosAluno.escola_id = esc.escola_id;
    }

    // Autorizados (ate 3, nome+bi) e assinatura desenhada na app
    const autorizados = (data.autorizados || [])
      .map((x) => ({ nome: String(x?.nome || '').trim(), bi: String(x?.bi || '').trim() }))
      .filter((x) => x.nome && x.bi)
      .slice(0, 3);
    let assinaturaUrl: string | null = null;
    if (data.assinatura_base64) {
      try {
        const b64 = String(data.assinatura_base64).replace(/^data:image\/\w+;base64,/, '');
        const buf = Buffer.from(b64, 'base64');
        if (buf.length > 0 && buf.length < 500 * 1024) {
          const res = await this.upload.uploadFotoPedido({ buffer: buf } as any);
          assinaturaUrl = res.url;
        }
      } catch (e) {
        console.error('Assinatura do pedido: upload falhou —', (e as any)?.message);
      }
    }

    // Um pedido PENDENTE por aluno: novo envio ATUALIZA o pendente em vez de
    // duplicar (reconfirmacao: mesmo aluno_id; nova: mesmo encarregado+nome).
    const pendenteExistente = await this.prisma.pedidos_inscricao.findFirst({
      where: data.aluno_id
        ? {
            estado: 'pendente',
            OR: [
              { aluno_id: data.aluno_id },
              {
                encarregado_id: data.encarregado_id,
                nome_aluno: { equals: data.nome_aluno.trim(), mode: 'insensitive' },
              },
            ],
          }
        : {
            estado: 'pendente',
            encarregado_id: data.encarregado_id,
            nome_aluno: { equals: data.nome_aluno.trim(), mode: 'insensitive' },
          },
    });
    if (pendenteExistente) {
      const atualizado = await this.prisma.pedidos_inscricao.update({
        where: { pedido_id: pendenteExistente.pedido_id },
        data: {
          aluno_id: data.aluno_id || pendenteExistente.aluno_id,
          nome_aluno: data.nome_aluno.trim(),
          ano_lectivo_id: anoId,
          rota_id: data.rota_id || null,
          viagens_dia: viagensDia,
          services_escolhidos: servicos,
          latitude: data.latitude ?? null,
          longitude: data.longitude ?? null,
          endereco: data.endereco || null,
          foto_url: data.foto_url || null,
          observacoes: data.observacoes || null,
          autorizados: autorizados.length ? autorizados : undefined,
          assinatura_url: assinaturaUrl || undefined,
          ...dadosAluno,
          updated_at: new Date(),
        },
      });
      return {
        mensagem: 'Pedido atualizado — os novos dados substituíram o pedido que estava em análise.',
        pedido_id: atualizado.pedido_id,
        estado: atualizado.estado,
      };
    }

    const pedido = await this.prisma.pedidos_inscricao.create({
      data: {
        encarregado_id: data.encarregado_id,
        nome_aluno: data.nome_aluno.trim(),
        ano_lectivo_id: anoId,
        rota_id: data.rota_id || null,
        viagens_dia: viagensDia,
        services_escolhidos: servicos,
        latitude: data.latitude ?? null,
        longitude: data.longitude ?? null,
        endereco: data.endereco || null,
        foto_url: data.foto_url || null,
        observacoes: data.observacoes || null,
        autorizados: autorizados.length ? autorizados : undefined,
        assinatura_url: assinaturaUrl,
        ...dadosAluno,
      },
    });

    return {
      mensagem: 'Pedido de inscrição recebido. A secretaria vai validar e receberá a referência de pagamento em breve.',
      pedido_id: pedido.pedido_id,
      estado: pedido.estado,
    };
  }

  // ============================================================
  // 🆕 REGISTO PUBLICO DO ENCARREGADO (1a vez na app)
  // ============================================================
  async registarEncarregado(data: { nome?: string; telefone?: string; senha?: string; email?: string }) {
    const nome = String(data?.nome || '').trim();
    const telefone = normalizarTelefone(String(data?.telefone || ''));
    const senha = String(data?.senha || '');
    const email = data?.email ? String(data.email).trim().toLowerCase() : null;

    if (nome.length < 3) throw new BadRequestException('Indique o seu nome completo');
    if (!/^\+\d{8,15}$/.test(telefone)) throw new BadRequestException('Telefone inválido');
    if (senha.length < 8) throw new BadRequestException('A senha precisa de pelo menos 8 caracteres');

    const telExiste = await this.prisma.encarregados.findUnique({ where: { telefone } });
    if (telExiste) throw new ConflictException('Já existe uma conta com este telefone — use Entrar ou fale com a secretaria');
    if (email) {
      const emailExiste = await this.prisma.encarregados.findFirst({ where: { email } });
      if (emailExiste) throw new ConflictException('Já existe uma conta com este email');
    }

    const bcrypt = require('bcrypt');
    const hash = await bcrypt.hash(senha, 10);
    await this.prisma.encarregados.create({ data: { nome, telefone, senha: hash, email } });
    return { mensagem: 'Conta criada com sucesso — já pode entrar.' };
  }

  // ============================================================
  // ✍️ TOKEN DE ASSINATURA PARA UM FILHO DO ENCARREGADO
  // ============================================================
  async linkAssinaturaEncarregado(alunoId: string, encarregadoId: string) {
    const aluno = await this.prisma.alunos.findUnique({
      where: { aluno_id: alunoId },
      select: { encarregado_id: true },
    });
    if (!aluno || aluno.encarregado_id !== encarregadoId) {
      throw new NotFoundException('Aluno não encontrado');
    }
    // Reutiliza um token valido e ainda nao usado, se existir
    const existente = await this.prisma.tokens_assinatura.findFirst({
      where: { aluno_id: alunoId, usado_em: null, expira_em: { gt: new Date() } },
      orderBy: { criado_em: 'desc' },
    });
    if (existente) return { token: existente.token };
    const token = require('crypto').randomBytes(24).toString('hex');
    const expira = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    await this.prisma.tokens_assinatura.create({ data: { token, aluno_id: alunoId, expira_em: expira } });
    return { token };
  }

  async catalogo() {
    const ano = await this.prisma.ano_lectivo.findFirst({
      where: { ativo: true },
      select: { ano_lectivo_id: true },
    });
    if (!ano) throw new BadRequestException('Não há ano letivo ativo');

    const [rotas, escolas, precos] = await Promise.all([
      this.prisma.rotas.findMany({ orderBy: { codigo: 'asc' } }),
      this.prisma.escolas.findMany({ select: { escola_id: true, nome: true } }),
      this.prisma.precos_rota.findMany({ where: { ano_lectivo_id: ano.ano_lectivo_id } }),
    ]);
    const nomeEscola = new Map(escolas.map((e) => [e.escola_id, e.nome]));

    // Taxas de inscricao/reconfirmacao — lidas da tabela tipo_inscricao
    // (fallback para os valores em vigor se a leitura falhar).
    let taxaNova = 30000;
    let taxaReconf = 25000;
    try {
      const tipos: any[] = await this.prisma.$queryRaw`SELECT * FROM tipo_inscricao`;
      for (const t of tipos) {
        const nomeCampo = String(
          t.nome ?? t.tipo ?? t.descricao ?? t.codigo ?? '',
        ).toLowerCase();
        const valorCampo = Number(t.valor ?? t.preco ?? t.taxa ?? NaN);
        if (!Number.isFinite(valorCampo)) continue;
        if (nomeCampo.includes('reconf') || nomeCampo.includes('confirm')) {
          taxaReconf = valorCampo;
        } else if (nomeCampo.includes('nova') || nomeCampo.includes('inscri')) {
          taxaNova = valorCampo;
        }
      }
    } catch {
      // mantem os fallbacks
    }

    return {
      ano_lectivo_id: ano.ano_lectivo_id,
      taxa_nova: taxaNova,
      taxa_reconfirmacao: taxaReconf,
      rotas: rotas.map((r) => {
        const p1 = precos.find((p) => p.rota_id === r.rota_id && p.viagens_dia === 1);
        const p2 = precos.find((p) => p.rota_id === r.rota_id && p.viagens_dia === 2);
        return {
          rota_id: r.rota_id,
          codigo: r.codigo,
          nome: r.nome,
          escola_id: r.escola_id,
          escola: r.escola_id ? nomeEscola.get(r.escola_id) || null : null,
          preco_1_viagem: p1 ? Number(p1.preco_mensal) : null,
          preco_2_viagens: p2 ? Number(p2.preco_mensal) : null,
        };
      }),
    };
  }

  async meusAnexos(alunoId: string, encarregadoId: string) {
    const aluno = await this.prisma.alunos.findUnique({
      where: { aluno_id: alunoId },
      select: { aluno_id: true, encarregado_id: true },
    });
    // Regra de posse: o encarregado so ve anexos dos proprios filhos
    if (!aluno || aluno.encarregado_id !== encarregadoId) {
      throw new NotFoundException('Aluno não encontrado');
    }
    const anexos = await this.prisma.anexos_aluno.findMany({
      where: { aluno_id: alunoId, tipo: { in: ['ficha_adesao', 'processo_inscricao'] } },
      orderBy: { criado_em: 'desc' },
    });
    // Devolve apenas o mais recente de cada tipo
    const vistos = new Set<string>();
    return anexos
      .filter((a) => (vistos.has(a.tipo) ? false : (vistos.add(a.tipo), true)))
      .map((a) => ({ tipo: a.tipo, nome: a.nome_ficheiro, url: a.url, criado_em: a.criado_em }));
  }

  async meusPedidos(encarregado_id: string) {
    if (!encarregado_id) return [];
    return this.prisma.pedidos_inscricao.findMany({
      where: { encarregado_id },
      orderBy: { created_at: 'desc' },
    });
  }

  async adminListarPedidos(estado?: string) {
    return this.prisma.pedidos_inscricao.findMany({
      where: estado ? { estado } : {},
      include: { encarregados: { select: { nome: true, telefone: true, email: true } } },
      orderBy: { created_at: 'asc' },
    });
  }

  async aprovarPedido(pedido_id: string, aluno_id: string) {
    if (!aluno_id) throw new BadRequestException('aluno_id é obrigatório (aluno criado pela inscrição canónica)');
    const pedido = await this.prisma.pedidos_inscricao.findUnique({ where: { pedido_id } });
    if (!pedido) throw new NotFoundException('Pedido não encontrado');
    if (pedido.estado !== 'pendente') throw new BadRequestException('Pedido já processado');
    const aprovado = await this.prisma.pedidos_inscricao.update({
      where: { pedido_id },
      data: { estado: 'aprovado', aluno_id, updated_at: new Date() },
    });
    // Copia a foto do pedido para o aluno, se o aluno ainda nao tiver (best-effort)
    try {
      if ((pedido as any).foto_url) {
        const alvo = await this.prisma.alunos.findUnique({
          where: { aluno_id },
          select: { foto_url: true },
        });
        if (alvo && !alvo.foto_url) {
          await this.prisma.alunos.update({
            where: { aluno_id },
            data: { foto_url: (pedido as any).foto_url },
          });
        }
      }
    } catch (e) {
      console.error('Aprovacao OK, mas a copia da foto falhou:', (e as any)?.message);
    }

    // Copia a assinatura do pedido para os anexos do aluno (best-effort)
    try {
      if ((pedido as any).assinatura_url) {
        await this.prisma.anexos_aluno.deleteMany({ where: { aluno_id, tipo: 'assinatura_encarregado' } });
        await this.prisma.anexos_aluno.create({
          data: {
            aluno_id,
            tipo: 'assinatura_encarregado',
            nome_ficheiro: 'assinatura_app.png',
            url: (pedido as any).assinatura_url,
          },
        });
      }
    } catch (e) {
      console.error('Aprovacao OK, mas a copia da assinatura falhou:', (e as any)?.message);
    }
    // Gera a ficha automaticamente para aparecer logo na app do encarregado.
    // Best-effort: um erro no PDF nao desfaz a aprovacao.
    try {
      await this.fichaPdf.gerarFicha(aluno_id);
    } catch (e) {
      console.error('Aprovacao OK, mas a geracao da ficha falhou:', (e as any)?.message);
    }
    return aprovado;
  }

  async rejeitarPedido(pedido_id: string, motivo?: string) {
    const pedido = await this.prisma.pedidos_inscricao.findUnique({ where: { pedido_id } });
    if (!pedido) throw new NotFoundException('Pedido não encontrado');
    if (pedido.estado !== 'pendente') throw new BadRequestException('Pedido já processado');
    return this.prisma.pedidos_inscricao.update({
      where: { pedido_id },
      data: { estado: 'rejeitado', motivo_rejeicao: motivo || null, updated_at: new Date() },
    });
  }

  // ============================================================
  // 📋 LISTAR INSCRIÇÕES DE UM ENCARREGADO
  // ============================================================
  async listarInscricoes(encarregado_id: string) {
    if (!encarregado_id) {
      return [];
    }

    return await this.prisma.adesoes_servico.findMany({
      where: {
        alunos: { encarregado_id },
      },
      include: {
        alunos: { 
          select: { 
            aluno_id: true, 
            nome: true, 
            foto: true,
            foto_url: true 
          } 
        },
        rotas: true,
        ano_lectivo: true,
      },
      orderBy: { created_at: 'desc' },
    });
  }

  // ============================================================
  // 🗺️ BUSCAR ALUNOS PRÓXIMOS (NOVO - POSTGIS)
  // ============================================================
  async buscarAlunosProximos(lat: number, lng: number, raioKm: number = 2) {
    const raioMetros = raioKm * 1000;

    const result: any[] = await this.prisma.$queryRaw`
      SELECT 
        a.aluno_id,
        a.nome,
        a.home_lat as latitude,
        a.home_lng as longitude,
        a.referencia_pagamento,
        ST_Distance(
          a.home_geom::geography,
          ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography
        ) / 1000 as distancia_km
      FROM public.alunos a
      WHERE a.ativo = true
        AND a.home_geom IS NOT NULL
        AND ST_DWithin(
          a.home_geom::geography,
          ST_SetSRID(ST_MakePoint(${lng}, ${lat}), 4326)::geography,
          ${raioMetros}
        )
      ORDER BY distancia_km
      LIMIT 50
    `;

    return result.map(r => ({
      aluno_id: r.aluno_id,
      nome: r.nome,
      latitude: Number(r.latitude),
      longitude: Number(r.longitude),
      referencia_pagamento: r.referencia_pagamento,
      distancia_km: Number(r.distancia_km).toFixed(2),
    }));
  }
}
