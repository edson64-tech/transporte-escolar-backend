const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
async function main(){
  const alunos = await prisma.alunos.findMany({ where: { cod_artigo: { not: null } }, select: { cod_artigo: true } });
  const codigos = [...new Set(alunos.map(a => a.cod_artigo))].sort();
  console.log('cod_artigo -> rota | viagens_dia');
  for(const cod of codigos){
    const rota = cod.slice(0, -3);       // tudo menos os ultimos 3 digitos
    const viagens = parseInt(cod.slice(-1)); // ultimo digito
    console.log('  ' + cod + ' -> rota=' + rota + ' | viagens=' + viagens);
  }
  await prisma.$disconnect();
}
main().catch(e => console.error(e.message));
