import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  console.log('🚀 Iniciando seed de dados de teste...');

  // Criar motorista de teste
  const motorista = await prisma.motoristas.create({
    data: {
      nome: 'João Motorista',
      telefone: '999999998',
      senha: '1234',
      numero_carta: 'ANG12345',
      validade_carta: new Date('2027-12-31'),
    },
  });

  // Criar escola e rota
  const escola = await prisma.escolas.create({
    data: {
      nome: 'Escola Modelo',
      endereco: 'Luanda',
    },
  });

  const campus = await prisma.campi.create({
    data: {
      nome: 'Central',
      escola_id: escola.escola_id,
    },
  });

  const rota = await prisma.rotas.create({
    data: {
      codigo: 'R002',
      nome: 'Rota Principal 2',
      escola_id: escola.escola_id,
      campus_id: campus.campus_id,
    },
  });

  // Criar serviço (com letra e hora obrigatórias)
  const servico = await prisma.servicos.create({
    data: {
      letra: 'A',
      descricao: 'Transporte Diário',
      hora_inicio: new Date("2025-01-01T06:30:00.000Z") // formato ISO válido      
    },
  });

  // Criar viagem de teste
  const viagem = await prisma.viagens.create({
    data: {
      codigo: 'V001',
      rota_id: rota.rota_id,
      servico_id: servico.servico_id,
      motorista_id: motorista.motorista_id,
      data: new Date(),
    },
  });

  console.log('✅ Seed concluído com sucesso!');
  console.log('Motorista:', motorista);
  console.log('Viagem:', viagem);
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
