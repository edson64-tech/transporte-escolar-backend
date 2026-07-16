// Agente Integrador ERP v0.7 — Assistance24 (multi-linha + keep-alive + fila)
const fs = require('fs');
const path = require('path');
const cfg = JSON.parse(fs.readFileSync(__dirname + '/config.json', 'utf8'));
const H = { 'X-Agent-Key': cfg.agente_chave, 'Content-Type': 'application/json' };
const log = (...a) => console.log(new Date().toISOString(), ...a);
const tokens = {};

async function tokenPrimavera(emp) {
  const k = emp.codigo_empresa + '/' + emp.instancia;
  if (tokens[k] && tokens[k].exp > Date.now()) return tokens[k].tok;
  const body = new URLSearchParams({
    username: emp.username, password: emp.password, company: emp.codigo_empresa,
    instance: emp.instancia, line: emp.linha, grant_type: 'password',
  });
  const r = await fetch(cfg.primavera_url + '/token', { method: 'POST', body });
  if (!r.ok) throw new Error('token Primavera falhou: HTTP ' + r.status);
  const j = await r.json();
  tokens[k] = { tok: j.access_token, exp: Date.now() + (j.expires_in - 60) * 1000 };
  return tokens[k].tok;
}

async function pri(emp, metodo, rota, body) {
  const tok = await tokenPrimavera(emp);
  const r = await fetch(cfg.primavera_url + rota, {
    method: metodo,
    headers: { Authorization: 'Bearer ' + tok, Accept: 'application/json', 'Content-Type': 'application/json' },
    body: body ? JSON.stringify(body) : undefined,
  });
  const texto = await r.text();
  let json; try { json = JSON.parse(texto); } catch { json = { raw: texto.slice(0, 300) }; }
  if (!r.ok) throw new Error(`Primavera ${rota} HTTP ${r.status}: ${JSON.stringify(json).slice(0, 250)}`);
  return json;
}

async function priBytes(emp, rota) {
  const tok = await tokenPrimavera(emp);
  const r = await fetch(cfg.primavera_url + rota, { method: 'GET', headers: { Authorization: 'Bearer ' + tok } });
  const buf = Buffer.from(await r.arrayBuffer());
  if (!r.ok) throw new Error(`Primavera ${rota} HTTP ${r.status}: ${buf.toString('utf8').slice(0, 200)}`);
  return buf;
}

async function testarLigacao(emp) {
  await tokenPrimavera(emp);
  const existe = await pri(emp, 'GET', '/Base/Clientes/Existe/1');
  return { ligacao: 'OK', empresa: emp.codigo_empresa, cliente1_existe: existe };
}

async function garantirCliente(emp, c) {
  const cod = c.cod_cliente || emp.cod_cliente_default;
  if (!cod) throw new Error('Sem cliente: nem na entidade nem default da empresa');
  const existe = await pri(emp, 'GET', `/Base/Clientes/Existe/${encodeURIComponent(cod)}`);
  if (existe === true || existe === 'true') return { cod_cliente: cod, criado: false };
  throw new Error(`Cliente '${cod}' não existe no Primavera — crie-o manualmente`);
}

function limparCopiasLocais(nome) {
  const alvos = [path.join('C:\\Windows\\Temp', nome), path.join(__dirname, 'pdfs', nome)];
  for (const f of alvos) {
    try { if (fs.existsSync(f)) { fs.unlinkSync(f); log('  pdf: cópia local removida:', f); } } catch {}
  }
}

async function obterPdf(emp, docStr) {
  const m = /\/(\d+)\s*$/.exec(String(docStr || ''));
  const num = m ? m[1] : null;
  if (!num) { log('  pdf: não consegui extrair o número de "' + docStr + '"'); return null; }
  const tipo = emp.tipo_documento || 'FR';
  const serie = emp.serie;
  const nome = `FR_${serie}_${num}.pdf`;
  for (const report of ['GcpVls02', 'null']) {
    let buf;
    try {
      buf = await priBytes(emp, `/v2/Vendas/Docs/PrintDocumentToPDF/${tipo}/${encodeURIComponent(serie)}/${num}/000/1/${report}/false/${encodeURIComponent(nome)}/0`);
    } catch (e) {
      log('  pdf: tentativa falhou (report=' + report + '):', String(e.message || e).slice(0, 160));
      continue;
    }
    if (buf && buf.length > 1000 && buf.slice(0, 5).toString('utf8').startsWith('%PDF')) {
      log('  pdf: recebido em memória (' + buf.length + ' bytes)');
      limparCopiasLocais(nome);
      return { nome, base64: buf.toString('base64') };
    }
    const temp = path.join('C:\\Windows\\Temp', nome);
    for (let i = 0; i < 10; i++) {
      if (fs.existsSync(temp) && fs.statSync(temp).size > 1000) {
        const b = fs.readFileSync(temp);
        log('  pdf: lido do Temp (' + b.length + ' bytes)');
        limparCopiasLocais(nome);
        return { nome, base64: b.toString('base64') };
      }
      await new Promise((r) => setTimeout(r, 1000));
    }
    log('  pdf: sem bytes na resposta e sem ficheiro no Temp (report=' + report + ')');
  }
  return null;
}

async function emitirDocumento(emp, p) {
  const cli = await garantirCliente(emp, p.cliente || {});
  const linhasIn = Array.isArray(p.linhas) && p.linhas.length ? p.linhas : (p.linha ? [p.linha] : []);
  if (!linhasIn.length) throw new Error('Job sem linhas');
  const linhasDoc = linhasIn.map((l, i) => {
    const artigo = l.artigo || emp.cod_artigo_default;
    if (!artigo) throw new Error(`Linha ${i + 1} sem artigo (nem default da empresa)`);
    return {
      Artigo: artigo, Quantidade: 1, PrecUnit: Number(l.valor), Desconto1: 0,
      CodIva: emp.cod_iva_default || '90', TaxaIva: 0, Unidade: 'UN', Armazem: 'A1',
      MovStock: 'N', TipoLinha: '20', Descricao: l.descricao || undefined,
    };
  });
  const hoje = new Date().toISOString().slice(0, 10);
  const doc = {
    Tipodoc: emp.tipo_documento || 'FR', Serie: emp.serie, Filial: '000',
    TipoEntidade: 'C', Entidade: cli.cod_cliente, DataDoc: hoje, DataVenc: hoje,
    Moeda: 'AKZ', ModoPag: 'RTRF', CondPag: '1', Seccao: '1', RegimeIva: '2',
    TipoLancamento: '000', DescEntidade: 0, DescFinanceiro: 0, Linhas: linhasDoc,
  };
  const c = p.cliente || {};
  if (c.nome) doc.Nome = String(c.nome).slice(0, 100);
  if (c.nif && String(c.nif).trim() && String(c.nif).toLowerCase() !== 'consumidor final')
    doc.NumContribuinte = String(c.nif).trim();
  if (c.morada) doc.Morada = String(c.morada).slice(0, 100);
  if (c.morada2) doc.Morada2 = String(c.morada2).slice(0, 100);
  if (c.localidade) doc.Localidade = String(c.localidade).slice(0, 60);
  if (c.codigo_postal) doc.CodigoPostal = String(c.codigo_postal).slice(0, 20);
  const total = linhasDoc.reduce((a, l) => a + l.PrecUnit, 0);
  log('  a criar documento:', JSON.stringify({ Tipodoc: doc.Tipodoc, Serie: doc.Serie, Entidade: doc.Entidade, Nome: doc.Nome || '(ficha)', Linhas: linhasDoc.length, Total: total }));
  const res = await pri(emp, 'POST', '/v2/Vendas/Docs/CreateSalesDocument', doc);
  if (res && res.ErrorMessage) throw new Error('Primavera devolveu erro: ' + res.ErrorMessage);
  const results = res && res.Results;
  if (results === false || (results && results.CreateDocument === false) || (results && results.CreateSalesDocument === false))
    throw new Error('CreateSalesDocument=false: ' + JSON.stringify(res).slice(0, 250));
  let num = null;
  if (results) {
    if (Array.isArray(results)) { const d = results.find((x) => x.Nome === 'Documento' || x.Nome === 'NumeroDocumento'); num = d && d.Valor; }
    else if (typeof results === 'object') num = results.Documento || results.NumeroDocumento || results.CreateSalesDocument || null;
  }
  let pdf = null;
  if (num) {
    try { pdf = await obterPdf(emp, num); } catch (e) { log('  pdf: erro inesperado:', String(e.message || e).slice(0, 140)); }
  }
  return { numero_documento: num, linhas: linhasDoc.length, pdf_nome: pdf ? pdf.nome : null, pdf_base64: pdf ? pdf.base64 : null };
}

async function ciclo() {
  try {
    await fetch(cfg.plataforma_url + '/erp/agente/heartbeat', { method: 'POST', headers: H, body: JSON.stringify({ versao: '0.7.0' }) });
    const jobs = await (await fetch(cfg.plataforma_url + '/erp/agente/jobs', { headers: H })).json();
    if (!Array.isArray(jobs)) { log('resposta inesperada da fila:', JSON.stringify(jobs).slice(0, 150)); return; }
    for (const j of jobs) {
      log(`job ${j.job_id} [${j.tipo}] empresa=${j.empresa?.codigo_empresa}`);
      let corpo;
      try {
        let resultado;
        if (j.tipo === 'testar_ligacao') resultado = await testarLigacao(j.empresa);
        else if (j.tipo === 'garantir_cliente') resultado = await garantirCliente(j.empresa, j.payload.cliente || {});
        else if (j.tipo === 'emitir_documento') resultado = await emitirDocumento(j.empresa, j.payload);
        else throw new Error('tipo de job desconhecido: ' + j.tipo);
        const pdf_base64 = resultado && resultado.pdf_base64;
        if (resultado && resultado.pdf_base64) delete resultado.pdf_base64;
        corpo = { sucesso: true, resultado, pdf_base64 };
        log(`  OK concluído${resultado.numero_documento ? ' — DOC: ' + resultado.numero_documento : ''}${pdf_base64 ? ' + PDF' : ''}`);
      } catch (e) {
        corpo = { sucesso: false, erro: String(e.message || e) };
        log(`  X falhou: ${corpo.erro}`);
      }
      await fetch(`${cfg.plataforma_url}/erp/agente/jobs/${j.job_id}/resultado`, { method: 'POST', headers: H, body: JSON.stringify(corpo) });
    }
  } catch (e) {
    log('ciclo falhou (plataforma inacessível?):', String(e.message || e));
  }
}

let empresasCache = [];
async function keepAlive() {
  try {
    const r = await fetch(cfg.plataforma_url + '/erp/agente/empresas', { headers: H });
    if (r.ok) empresasCache = await r.json();
    for (const emp of empresasCache) {
      try {
        await pri(emp, 'GET', '/Base/Clientes/Existe/1');
        log('keep-alive OK: ' + emp.codigo_empresa);
      } catch (e) {
        log('keep-alive falhou (' + emp.codigo_empresa + '):', String(e.message || e).slice(0, 100));
      }
    }
  } catch (e) {
    log('keep-alive: plataforma inacessível:', String(e.message || e).slice(0, 100));
  }
}

log('Agente Integrador v0.7 — plataforma:', cfg.plataforma_url, '| primavera:', cfg.primavera_url);
ciclo();
setInterval(ciclo, cfg.intervalo_segundos * 1000);
keepAlive();
setInterval(keepAlive, 8 * 60 * 1000);
