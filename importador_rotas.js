const XLSX = require('xlsx');
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const FICHEIRO = '/root/excel/rotas_completas.xlsx';
const DRY_RUN = !process.argv.includes('--executar');
const MAPA_ZONAS = {
  BF: 'Benfica', CM: 'Camama', KK: 'Kilamba KK', KL: 'Kilamba',
  PT: 'Patriota', TL: 'Talatona', VD: 'Boa Vida', ZG: 'Zango', ZV: 'Zona Verde'
};
const HORAS_SERVICO = { A:'06:15', B:'10:15', C:'12:00', D:'15:00', E:'16:00', F:'18:00' };
const TIPO_SERVICO  = { A:'recolha', B:'recolha', C:'regresso', D:'regresso', E:'regresso', F:'regresso' };
function norm(v){ return String(v==null?'':v).trim(); }
function normHorario(h){ return norm(h).toUpperCase(); }
function zonaDeAbbr(abbr){
  const ini = norm(abbr).substring(0,2).toUpperCase();
  return MAPA_ZONAS[ini] || ini;
}
function escolaIdDoNum(num, escolas){
  const nome = norm(num)==='2' ? 'Colégio Aurora' : 'Complexo Escolar Aurora';
  return escolas[nome];
}

async function main(){
  console.log('IMPORTADOR —', DRY_RUN ? 'DRY-RUN' : '*** EXECUTAR ***');
  const wb = XLSX.readFile(FICHEIRO);
  const rows = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]);
  console.log('Linhas:', rows.length);

  const escolasDb = await prisma.escolas.findMany();
  const escolas = {};
  escolasDb.forEach(e => escolas[e.nome] = e.escola_id);

  const ano = await prisma.ano_lectivo.findFirst({ where: { ativo: true } });
  if(!ano){ console.log('ERRO: sem ano letivo'); await prisma.$disconnect(); return; }

  const rotasSet = new Map(), servicosSet = new Map(), viagensSet = new Map();
  const alunosMap = new Map(), encarregadosMap = new Map(), alunoViagem = [];

  for(const r of rows){
    const codViagem = norm(r.rota_codigo), abbr = norm(r.rota_abbr);
    const letra = normHorario(r.horario), escolaNum = norm(r.escola), codAluno = norm(r.codigo_aluno);
    if(!codViagem || !abbr || !codAluno) continue;
    if(!rotasSet.has(abbr)) rotasSet.set(abbr, { abbr, zona: zonaDeAbbr(abbr), escolaNum });
    if(letra && !servicosSet.has(letra)) servicosSet.set(letra, { letra, hora: HORAS_SERVICO[letra]||null, tipo: TIPO_SERVICO[letra]||'recolha' });
    if(!viagensSet.has(codViagem)) viagensSet.set(codViagem, { codigo: codViagem, abbr, letra, escolaNum, tipo: TIPO_SERVICO[letra]||'recolha' });
    const encTel = norm(r.encarregado_telefone), encNome = norm(r.encarregado_nome);
    if(encTel && !encarregadosMap.has(encTel)) encarregadosMap.set(encTel, { nome: encNome||'(sem nome)', telefone: encTel });
    if(!alunosMap.has(codAluno)) alunosMap.set(codAluno, {
      codigo_aluno: codAluno, nome: norm(r.nome_aluno)||'(sem nome)',
      referencia_pagamento: norm(r.referencia_multicaixa), cod_artigo: norm(r.codigo_artigo),
      e_creche: r.e_creche === true, endereco: norm(r.endereco), encarregadoTel: encTel,
    });
    alunoViagem.push({ codAluno, codViagem });
  }
  console.log('Rotas:', rotasSet.size, '| Servicos:', servicosSet.size, '| Viagens:', viagensSet.size);
  console.log('Alunos:', alunosMap.size, '| Encarregados:', encarregadosMap.size, '| Ligacoes:', alunoViagem.length);

  if(DRY_RUN){ console.log('DRY-RUN. Nada gravado.'); await prisma.$disconnect(); return; }

  console.log('*** A GRAVAR ***');
  const servicoId = {};
  for(const [letra, s] of servicosSet){
    const ex = await prisma.servicos.findFirst({ where: { letra } });
    if(ex){ servicoId[letra] = ex.servico_id; continue; }
    const c = await prisma.servicos.create({ data: { letra, descricao: (s.tipo==='recolha'?'Recolha ':'Regresso ')+letra, hora_inicio: new Date('1970-01-01T'+(s.hora||'06:00')+':00Z') } });
    servicoId[letra] = c.servico_id;
  }
  console.log('Servicos:', Object.keys(servicoId).length);

  const rotaId = {};
  for(const [abbr, r] of rotasSet){
    const ex = await prisma.rotas.findFirst({ where: { codigo: abbr } });
    if(ex){ rotaId[abbr] = ex.rota_id; continue; }
    const c = await prisma.rotas.create({ data: { codigo: abbr, nome: r.zona, escola_id: escolaIdDoNum(r.escolaNum, escolas) } });
    rotaId[abbr] = c.rota_id;
  }
  console.log('Rotas:', Object.keys(rotaId).length);

  const viagemId = {};
  for(const [codigo, v] of viagensSet){
    const ex = await prisma.viagens.findFirst({ where: { codigo } });
    if(ex){ viagemId[codigo] = ex.viagem_id; continue; }
    const c = await prisma.viagens.create({ data: { codigo, rota_id: rotaId[v.abbr]||null, servico_id: servicoId[v.letra]||null, tipo: v.tipo } });
    viagemId[codigo] = c.viagem_id;
  }
  console.log('Viagens:', Object.keys(viagemId).length);

  const encId = {};
  for(const [tel, e] of encarregadosMap){
    const ex = await prisma.encarregados.findFirst({ where: { telefone: tel } });
    if(ex){ encId[tel] = ex.encarregado_id; continue; }
    try { const c = await prisma.encarregados.create({ data: { nome: e.nome, telefone: tel, senha: 'temp_'+tel } }); encId[tel] = c.encarregado_id; }
    catch(err){ console.log('enc erro', tel, err.message.substring(0,40)); }
  }
  console.log('Encarregados:', Object.keys(encId).length);

  const alunoId = {}; let aErros = 0;
  for(const [cod, a] of alunosMap){
    const ex = await prisma.alunos.findFirst({ where: { codigo_aluno: cod } });
    if(ex){ alunoId[cod] = ex.aluno_id; continue; }
    try {
      const c = await prisma.alunos.create({ data: {
        codigo_aluno: cod, nome: a.nome,
        referencia_pagamento: a.referencia_pagamento || ('SEM_REF_'+cod),
        cod_artigo: a.cod_artigo||null, e_creche: a.e_creche,
        encarregado_id: a.encarregadoTel ? (encId[a.encarregadoTel]||null) : null,
      } });
      alunoId[cod] = c.aluno_id;
    } catch(err){ aErros++; if(aErros<=5) console.log('aluno erro', cod, err.message.substring(0,50)); }
  }
  console.log('Alunos:', Object.keys(alunoId).length, '| erros:', aErros);

  let lig = 0, lErros = 0;
  for(const lv of alunoViagem){
    const aId = alunoId[lv.codAluno], vId = viagemId[lv.codViagem];
    if(!aId || !vId){ lErros++; continue; }
    try { await prisma.aluno_viagem.upsert({ where: { aluno_id_viagem_id: { aluno_id: aId, viagem_id: vId } }, update: {}, create: { aluno_id: aId, viagem_id: vId } }); lig++; }
    catch(err){ lErros++; }
  }
  console.log('Ligacoes:', lig, '| erros:', lErros);
  console.log('=== CONCLUIDO ===');
  await prisma.$disconnect();
}
main().catch(e => { console.error('ERRO:', e.message); process.exit(1); });
