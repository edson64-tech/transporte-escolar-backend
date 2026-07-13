const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const DRY_RUN = !process.argv.includes('--executar');

async function main(){
  console.log('GERAR CONTRATOS —', DRY_RUN ? 'DRY-RUN' : '*** EXECUTAR ***');

  const ano = await prisma.ano_lectivo.findFirst({ where: { ativo: true } });
  if(!ano){ console.log('ERRO: sem ano letivo'); await prisma.$disconnect(); return; }

  // Mapa de rotas (codigo -> {rota_id, preco_1, preco_2})
  const rotas = await prisma.rotas.findMany();
  const rotaMap = {};
  rotas.forEach(r => rotaMap[r.codigo] = r);

  // Todos os alunos com cod_artigo
  const alunos = await prisma.alunos.findMany({ where: { cod_artigo: { not: null } } });
  console.log('Alunos a processar:', alunos.length);

  let ok = 0, semRota = 0, semPreco = 0, criados = 0, jaExiste = 0;
  const detalhe = {};

  for(const a of alunos){
    const cod = a.cod_artigo;
    const rotaCod = cod.slice(0, -3);
    const viagens = parseInt(cod.slice(-1));
    const rota = rotaMap[rotaCod];
    if(!rota){ semRota++; continue; }
    const preco = viagens === 1 ? rota.preco_1_viagem : rota.preco_2_viagens;
    if(preco == null){ semPreco++; continue; }
    ok++;
    detalhe[rotaCod+'/'+viagens] = (detalhe[rotaCod+'/'+viagens]||0)+1;

    if(!DRY_RUN){
      const existe = await prisma.contratos_servico.findFirst({ where: { aluno_id: a.aluno_id, ano_lectivo_id: ano.ano_lectivo_id } });
      if(existe){ jaExiste++; continue; }
      await prisma.contratos_servico.create({ data: {
        aluno_id: a.aluno_id, ano_lectivo_id: ano.ano_lectivo_id,
        rota_id: rota.rota_id, viagens_dia: viagens,
        tipo_servico: viagens === 2 ? 'ambos' : 'recolha',
        preco_mensal: preco, cobranca_dia: 1, corte_dia: 10,
      }});
      criados++;
    }
  }

  console.log('');
  console.log('Validos:', ok, '| sem rota:', semRota, '| sem preco:', semPreco);
  if(!DRY_RUN) console.log('Contratos criados:', criados, '| ja existiam:', jaExiste);
  else {
    console.log('DRY-RUN — nada gravado.');
    console.log('Distribuicao (rota/viagens -> alunos):');
    Object.keys(detalhe).sort().forEach(k => console.log('  ' + k + ': ' + detalhe[k]));
  }
  await prisma.$disconnect();
}
main().catch(e => { console.error('ERRO:', e.message); process.exit(1); });
