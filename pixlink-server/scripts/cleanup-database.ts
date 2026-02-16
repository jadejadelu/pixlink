const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function cleanupDatabase() {
  try {
    console.log('=== 清理数据库 ===\n');

    const deletedDevices = await prisma.device.deleteMany({});
    console.log(`✅ 删除设备记录: ${deletedDevices.count} 条`);

    const deletedEnrollmentTokens = await prisma.enrollmentToken.deleteMany({});
    console.log(`✅ 删除注册令牌: ${deletedEnrollmentTokens.count} 条`);

    const deletedAccountActivations = await prisma.accountActivation.deleteMany({});
    console.log(`✅ 删除账户激活记录: ${deletedAccountActivations.count} 条`);

    const deletedCertificates = await prisma.certificate.deleteMany({});
    console.log(`✅ 删除证书记录: ${deletedCertificates.count} 条`);

    const deletedUsers = await prisma.user.deleteMany({});
    console.log(`✅ 删除用户记录: ${deletedUsers.count} 条`);

    console.log('\n=== 数据库清理完成 ===');
  } catch (error) {
    console.error('❌ 清理数据库失败:', error);
  } finally {
    await prisma.$disconnect();
  }
}

cleanupDatabase();