import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function getActivationToken() {
  const activation = await prisma.accountActivation.findFirst({
    where: { userId: '23edf67a-8a51-4856-974d-93030b987e8f' }
  });
  
  if (activation) {
    console.log('Activation token:', activation.token);
  } else {
    console.log('No activation token found');
  }
  
  await prisma.$disconnect();
}

getActivationToken();
