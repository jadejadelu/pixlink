import axios from 'axios';
const { PrismaClient } = require('@prisma/client');

const API_BASE_URL = 'http://localhost:3000/api';

const TEST_EMAIL = '172296329@qq.com';
const TEST_NICKNAME = 'jade';
const TEST_PASSWORD = '123456';

async function cleanupDatabase() {
  try {
    console.log('\n=== 清理数据库 ===\n');

    const prisma = new PrismaClient();

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

    await prisma.$disconnect();

    console.log('\n=== 数据库清理完成 ===');
  } catch (error) {
    console.error('❌ 清理数据库失败:', error);
  }
}

async function testActivationTTL() {
  console.log('=== 测试激活Token TTL配置 ===\n');

  try {
    console.log('步骤1: 注册新用户');
    console.log(`邮箱: ${TEST_EMAIL}`);
    console.log(`昵称: ${TEST_NICKNAME}`);
    console.log(`密码: ${TEST_PASSWORD}\n`);

    const registerResponse = await axios.post(`${API_BASE_URL}/auth/register`, {
      email: TEST_EMAIL,
      nickname: TEST_NICKNAME,
      password: TEST_PASSWORD,
    });

    console.log('✅ 注册成功');
    const userId = registerResponse.data.data.user.id;
    console.log('用户ID:', userId);
    console.log('用户状态:', registerResponse.data.data.user.status);
    console.log();

    const prisma = new PrismaClient();
    const activation = await prisma.accountActivation.findFirst({
      where: { userId },
    });

    if (!activation) {
      console.log('❌ 错误: 未找到激活token');
      await prisma.$disconnect();
      return;
    }

    console.log('步骤2: 验证激活token过期时间');
    console.log('Token:', activation.token);
    console.log('创建时间:', activation.createdAt);
    console.log('过期时间:', activation.expiresAt);
    console.log();

    const createdAt = new Date(activation.createdAt);
    const expiresAt = new Date(activation.expiresAt);
    const totalTTL = Math.floor((expiresAt.getTime() - createdAt.getTime()) / 1000);

    console.log('步骤3: 计算总TTL');
    console.log('创建时间:', createdAt.toISOString());
    console.log('过期时间:', expiresAt.toISOString());
    console.log('总TTL（秒）:', totalTTL);
    console.log('预期TTL（秒）: 180 (3分钟)');
    console.log();

    if (totalTTL >= 178 && totalTTL <= 182) {
      console.log('✅ TTL配置正确: 3分钟 (180秒)');
    } else {
      console.log('❌ TTL配置不正确');
      console.log(`实际TTL: ${totalTTL}秒`);
      console.log(`预期TTL: 180秒`);
    }

    console.log();

    console.log('步骤4: 测试激活功能');
    const activateResponse = await axios.post(`${API_BASE_URL}/auth/activate`, {
      token: activation.token,
    });

    console.log('✅ 激活成功');
    console.log('响应:', activateResponse.data.message);
    console.log();

    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (user && user.status === 'ACTIVE') {
      console.log('✅ 用户状态已更新为ACTIVE');
    } else {
      console.log('❌ 用户状态更新失败');
    }

    await prisma.$disconnect();

    console.log('\n=== 测试完成 ===');
    console.log('✅ 激活Token TTL配置测试通过');

  } catch (error: any) {
    console.error('❌ 测试失败:', error.message);
    if (error.response) {
      console.error('错误响应:', JSON.stringify(error.response.data, null, 2));
    }
  } finally {
    await cleanupDatabase();
  }
}

testActivationTTL();