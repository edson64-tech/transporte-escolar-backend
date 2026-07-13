const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const DRY_RUN = !process.argv.includes('--executar');

function diasNoMes(mes, anoBase){
  // mes 9-12 = ano base; mes 1-7 = ano seguinte
  const ano = mes >= 9 ? anoBase : anoBase + 1;
  return new Date(ano, mes, 0).getDate();
}

async function main(){
  console.log('GERAR MENSALIDADES —', DRY_RUN ? 'DRY-RUN' : '*** EXECUTAR ***');
  const ano = await prisma.ano_lectivo.findFirst({ where: { ativo: true } });
  if(!ano){ console.log('ERRO: sem ano letivo'); await prisma.$disconnect(); return; }
  const anoBase = ano.ano_inicio || 2025;

  // Meses ativos (a tabela editável)
  const meses = await prisma.precos_mes.findMany({
    where: { ano_lectivo_id: ano.ano_lectivo_id, ativo: true },
    orderBy: { ordem: 'asc' }
  });
  console.log('Meses a faturar:', meses.length, '->', meses.map(m=>m.mes).join(','));

  // Contratos ativos
  const contratos = await prisma.contratos_servico.findMany({
    where: { ano_lectivo_id: ano.ano_lectivo_id, ativo: true },
    include: { alunos: true }
  });
  console.log('Contratos:', contratos.length);

  let criadas = 0, jaExiste = 0, total = 0;
  let receita = 0;

  for(const c of contratos){
    const ref = c.alunos.referencia_pagamento || null;
    for(const m of meses){
      total++;
      const fator = Number(m.fator);
      let valor = Number(c.preco_mensal) * fator;
      // vencimento: dia de cobrança do contrato, no mês/ano certo
      const anoDoMes = m.mes >= 9 ? anoBase : anoBase + 1;
      const diaCobranca = c.cobranca_dia || 1;
      const vencimento = new Date(anoDoMes, m.mes - 1, diaCobranca);

      if(DRY_RUN){ receita += valor; continue; }

      const existe = await prisma.mensalidades.findFirst({
        where: { aluno_id: c.aluno_id, ano_lectivo_id: ano.ano_lectivo_id, mes: m.mes }
      });
      if(existe){ jaExiste++; continue; }

      await prisma.mensalidades.create({ data: {
        aluno_id: c.aluno_id,
        ano_lectivo_id: ano.ano_lectivo_id,
        mes: m.mes,
        viagens_dia: c.viagens_dia,
        valor_previsto: valor,
        status: 'pendente',
        vencimento: vencimento,
        referencia: ref,
      }});
      criadas++;
      receita += valor;
    }
  }

  console.log('');
  console.log('Total de mensalidades processadas:', total);
  if(DRY_RUN){
    console.log('DRY-RUN — nada gravado.');
    console.log('Receita anual prevista:', receita.toLocaleString('pt-PT'), 'AOA');
  } else {
    console.log('Criadas:', criadas, '| ja existiam:', jaExiste);
    console.log('Receita anual gerada:', receita.toLocaleString('pt-PT'), 'AOA');
  }
  await prisma.$disconnect();
}
main().catch(e => { console.error('ERRO:', e.message); process.exit(1); });
