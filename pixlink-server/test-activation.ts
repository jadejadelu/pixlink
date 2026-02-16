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

async function testAccountActivation() {
  console.log('=== 账户激活流程测试 ===\n');

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
    console.log('响应:', JSON.stringify(registerResponse.data, null, 2));
    console.log();

    const userId = registerResponse.data.data.user.id;
    const requiresActivation = registerResponse.data.data.requiresActivation;
    const session = registerResponse.data.data.session;

    console.log('用户ID:', userId);
    console.log('需要激活:', requiresActivation);
    console.log('会话:', session);
    console.log();

    if (!requiresActivation) {
      console.log('❌ 错误: 用户应该需要激活');
      return;
    }

    if (session !== null) {
      console.log('❌ 错误: 未激活用户不应该有会话');
      return;
    }

    console.log('步骤2: 尝试登录未激活账户');
    try {
      await axios.post(`${API_BASE_URL}/auth/login`, {
        email: TEST_EMAIL,
        password: TEST_PASSWORD,
      });
      console.log('❌ 错误: 未激活账户不应该能够登录');
    } catch (loginError: any) {
      if (loginError.response && loginError.response.data.error.includes('pending activation')) {
        console.log('✅ 正确: 未激活账户无法登录');
        console.log('错误信息:', loginError.response.data.error);
      } else {
        console.log('❌ 错误: 预期的错误信息不匹配');
        console.log('实际错误:', loginError.response?.data);
      }
    }
    console.log();

    console.log('步骤3: 从数据库获取激活token');
    const prisma = new PrismaClient();

    const activation = await prisma.accountActivation.findFirst({
      where: { userId },
    });

    if (!activation) {
      console.log('❌ 错误: 未找到激活token');
      await prisma.$disconnect();
      return;
    }

    console.log('✅ 找到激活token');
    console.log('Token:', activation.token);
    console.log('过期时间:', activation.expiresAt);
    console.log();

    await prisma.$disconnect();

    console.log('步骤4: 使用激活token激活账户');
    const activateResponse = await axios.post(`${API_BASE_URL}/auth/activate`, {
      token: activation.token,
    });

    console.log('✅ 激活成功');
    console.log('响应:', JSON.stringify(activateResponse.data, null, 2));
    console.log();

    console.log('步骤5: 验证账户状态');
    const prisma2 = new PrismaClient();
    const user = await prisma2.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      console.log('❌ 错误: 用户不存在');
      await prisma2.$disconnect();
      return;
    }

    console.log('✅ 用户状态:', user.status);

    if (user.status !== 'ACTIVE') {
      console.log('❌ 错误: 用户状态应该为ACTIVE');
      await prisma2.$disconnect();
      return;
    }

    console.log('✅ 账户已激活');
    await prisma2.$disconnect();
    console.log();

    console.log('步骤6: 使用激活后的账户登录');
    const loginResponse = await axios.post(`${API_BASE_URL}/auth/login`, {
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
    });

    console.log('✅ 登录成功');
    console.log('响应:', JSON.stringify(loginResponse.data, null, 2));
    console.log();

    console.log('=== 测试完成 ===');
    console.log('所有测试用例通过！');

  } catch (error: any) {
    console.error('❌ 测试失败:', error.message);
    if (error.response) {
      console.error('错误响应:', JSON.stringify(error.response.data, null, 2));
    }
  } finally {
    await cleanupDatabase();
  }
}

testAccountActivation();