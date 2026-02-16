import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function getAllActivations() {
  const activations = await prisma.accountActivation.findMany();
  
  console.log('All activations:');
  activations.forEach(activation => {
    console.log(`  - User ID: ${activation.userId}, Token: ${activation.token}, Expires: ${activation.expiresAt}`);
  });
  
  await prisma.$disconnect();
}

getAllActivations();
