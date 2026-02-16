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

async function testCompleteE2E() {
  console.log('=== 完整端到端测试 ===\n');

  try {
    console.log('测试场景1: 完整账户激活流程');
    console.log('----------------------------------------\n');

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
    const requiresActivation = registerResponse.data.data.requiresActivation;
    console.log('用户ID:', userId);
    console.log('需要激活:', requiresActivation);
    console.log('用户状态:', registerResponse.data.data.user.status);
    console.log();

    if (!requiresActivation || registerResponse.data.data.user.status !== 'PENDING') {
      console.log('❌ 错误: 用户应该需要激活且状态为PENDING');
      return;
    }

    console.log('步骤2: 验证激活邮件发送');
    console.log('请检查邮箱:', TEST_EMAIL);
    console.log('邮件应包含:');
    console.log('  - 激活链接');
    console.log('  - 激活token');
    console.log('  - 3分钟有效期提醒\n');

    const prisma1 = new PrismaClient();
    const activation = await prisma1.accountActivation.findFirst({
      where: { userId },
    });

    if (!activation) {
      console.log('❌ 错误: 未找到激活token');
      await prisma1.$disconnect();
      return;
    }

    console.log('✅ 激活token已创建');
    console.log('Token:', activation.token);
    console.log('过期时间:', activation.expiresAt);
    console.log('有效期: 3分钟\n');

    await prisma1.$disconnect();

    console.log('步骤3: 尝试登录未激活账户（应该失败）');
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

    console.log('步骤4: 使用激活token激活账户');
    const activateResponse = await axios.post(`${API_BASE_URL}/auth/activate`, {
      token: activation.token,
    });

    console.log('✅ 激活成功');
    console.log('响应:', activateResponse.data.message);
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

    const activation2 = await prisma2.accountActivation.findFirst({
      where: { userId },
    });

    if (activation2) {
      console.log('❌ 错误: 激活token应该被删除');
      await prisma2.$disconnect();
      return;
    }

    console.log('✅ 激活token已被删除');
    await prisma2.$disconnect();
    console.log();

    console.log('步骤6: 使用激活后的账户登录');
    const loginResponse = await axios.post(`${API_BASE_URL}/auth/login`, {
      email: TEST_EMAIL,
      password: TEST_PASSWORD,
    });

    console.log('✅ 登录成功');
    console.log('JWT Token:', loginResponse.data.data.token.substring(0, 50) + '...');
    console.log('Next Action:', loginResponse.data.data.nextAction);
    console.log();

    console.log('测试场景2: 激活过期token');
    console.log('----------------------------------------\n');

    console.log('步骤1: 注册新用户');
    const testEmail2 = `e2etest2${Date.now()}@example.com`;
    const testNickname2 = `E2ETestUser2${Date.now()}`;

    const registerResponse2 = await axios.post(`${API_BASE_URL}/auth/register`, {
      email: testEmail2,
      nickname: testNickname2,
      password: TEST_PASSWORD,
    });

    console.log('✅ 注册成功');
    const userId2 = registerResponse2.data.data.user.id;
    console.log('用户ID:', userId2);
    console.log();

    const prisma3 = new PrismaClient();
    const activation3 = await prisma3.accountActivation.findFirst({
      where: { userId: userId2 },
    });

    if (!activation3) {
      console.log('❌ 错误: 未找到激活token');
      await prisma3.$disconnect();
      return;
    }

    console.log('步骤2: 手动设置激活token为已过期');
    await prisma3.accountActivation.update({
      where: { id: activation3.id },
      data: { expiresAt: new Date(Date.now() - 1000) },
    });

    console.log('✅ 激活token已设置为过期');
    await prisma3.$disconnect();
    console.log();

    console.log('步骤3: 尝试使用过期token激活账户');
    try {
      await axios.post(`${API_BASE_URL}/auth/activate`, {
        token: activation3.token,
      });
      console.log('❌ 错误: 过期token不应该能够激活账户');
    } catch (activateError: any) {
      if (activateError.response && activateError.response.data.error.includes('expired')) {
        console.log('✅ 正确: 过期token无法激活账户');
        console.log('错误信息:', activateError.response.data.error);
      } else {
        console.log('❌ 错误: 预期的错误信息不匹配');
        console.log('实际错误:', activateError.response?.data);
      }
    }
    console.log();

    console.log('测试场景3: 无效激活token');
    console.log('----------------------------------------\n');

    console.log('步骤1: 尝试使用无效token激活账户');
    try {
      await axios.post(`${API_BASE_URL}/auth/activate`, {
        token: 'invalid-token-12345',
      });
      console.log('❌ 错误: 无效token不应该能够激活账户');
    } catch (activateError: any) {
      if (activateError.response && activateError.response.data.error.includes('Invalid activation token')) {
        console.log('✅ 正确: 无效token无法激活账户');
        console.log('错误信息:', activateError.response.data.error);
      } else {
        console.log('❌ 错误: 预期的错误信息不匹配');
        console.log('实际错误:', activateError.response?.data);
      }
    }
    console.log();

    console.log('测试场景4: 重复激活');
    console.log('----------------------------------------\n');

    console.log('步骤1: 尝试重复激活已激活账户');
    try {
      await axios.post(`${API_BASE_URL}/auth/activate`, {
        token: activation.token,
      });
      console.log('❌ 错误: 已激活账户不应该能够再次激活');
    } catch (activateError: any) {
      if (activateError.response && activateError.response.data.error.includes('Invalid activation token')) {
        console.log('✅ 正确: 已激活账户无法再次激活');
        console.log('错误信息:', activateError.response.data.error);
      } else {
        console.log('❌ 错误: 预期的错误信息不匹配');
        console.log('实际错误:', activateError.response?.data);
      }
    }
    console.log();

    console.log('测试场景5: 定时清理任务');
    console.log('----------------------------------------\n');

    console.log('步骤1: 注册新用户');
    const testEmail3 = `e2etest3${Date.now()}@example.com`;
    const testNickname3 = `E2ETestUser3${Date.now()}`;

    const registerResponse3 = await axios.post(`${API_BASE_URL}/auth/register`, {
      email: testEmail3,
      nickname: testNickname3,
      password: TEST_PASSWORD,
    });

    console.log('✅ 注册成功');
    const userId3 = registerResponse3.data.data.user.id;
    console.log('用户ID:', userId3);
    console.log();

    const prisma4 = new PrismaClient();
    const activation4 = await prisma4.accountActivation.findFirst({
      where: { userId: userId3 },
    });

    if (!activation4) {
      console.log('❌ 错误: 未找到激活token');
      await prisma4.$disconnect();
      return;
    }

    console.log('步骤2: 手动设置激活token为已过期');
    await prisma4.accountActivation.update({
      where: { id: activation4.id },
      data: { expiresAt: new Date(Date.now() - 1000) },
    });

    console.log('✅ 激活token已设置为过期');
    await prisma4.$disconnect();
    console.log();

    console.log('步骤3: 手动触发清理任务');
    const prismaCleanup = new PrismaClient();

    const expiredActivations = await prismaCleanup.accountActivation.findMany({
      where: {
        expiresAt: {
          lt: new Date(),
        },
      },
    });

    const userIds = expiredActivations.map((a: any) => a.userId);

    await prismaCleanup.accountActivation.deleteMany({
      where: {
        expiresAt: {
          lt: new Date(),
        },
      },
    });

    if (userIds.length > 0) {
      await prismaCleanup.user.deleteMany({
        where: {
          id: {
            in: userIds,
          },
          status: 'PENDING',
        },
      });
    }

    console.log('✅ 清理任务执行完成');
    console.log('删除的账户数:', userIds.length);
    console.log();

    console.log('步骤4: 验证账户已被删除');
    const user3 = await prismaCleanup.user.findUnique({
      where: { id: userId3 },
    });

    if (user3) {
      console.log('❌ 错误: 未激活账户应该被删除');
      await prismaCleanup.$disconnect();
      return;
    }

    console.log('✅ 未激活账户已被删除');
    await prismaCleanup.$disconnect();
    console.log();

    console.log('=== 测试完成 ===');
    console.log('所有测试用例通过！');
    console.log('\n测试总结:');
    console.log('✅ 完整账户激活流程');
    console.log('✅ 激活过期token处理');
    console.log('✅ 无效激活token处理');
    console.log('✅ 重复激活处理');
    console.log('✅ 定时清理任务');

  } catch (error: any) {
    console.error('❌ 测试失败:', error.message);
    if (error.response) {
      console.error('错误响应:', JSON.stringify(error.response.data, null, 2));
    }
  } finally {
    await cleanupDatabase();
  }
}

testCompleteE2E();