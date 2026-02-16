const nodemailer = require('nodemailer');

async function testSmtpConnection() {
  console.log('\n=== 测试SMTP连接 ===\n');

  const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    auth: {
      user: 'jadelu1031@gmail.com',
      pass: 'jirz uwch zxpw ekqm',
    },
    tls: {
      rejectUnauthorized: false,
    },
  } as any);

  console.log('配置信息:');
  console.log('  Host:', 'smtp.gmail.com');
  console.log('  Port:', 587);
  console.log('  User:', 'jadelu1031@gmail.com');
  console.log('  Secure:', false);
  console.log('');

  try {
    console.log('正在验证SMTP连接...');
    await transporter.verify();
    console.log('✅ SMTP连接成功！');
    console.log('');

    console.log('发送测试邮件...');
    const info = await transporter.sendMail({
      from: '"PixLink Test" <jadelu1031@gmail.com>',
      to: 'jadelu1031@gmail.com',
      subject: 'PixLink SMTP连接测试',
      html: '<h1>SMTP连接测试成功</h1><p>如果您收到这封邮件，说明SMTP配置正确。</p>',
    });

    console.log('✅ 测试邮件发送成功！');
    console.log('  Message ID:', info.messageId);
    console.log('');
    console.log('请检查您的邮箱（包括垃圾邮件文件夹）是否收到测试邮件。');
  } catch (error: any) {
    console.error('❌ SMTP连接失败：');
    console.error('  错误信息:', error.message);
    console.error('');
    console.log('可能的原因：');
    console.log('  1. Gmail应用专用密码不正确');
    console.log('  2. 网络连接问题');
    console.log('  3. Gmail SMTP服务暂时不可用');
    console.log('  4. 防火墙阻止了SMTP连接');
    console.log('');
    console.log('解决方案：');
    console.log('  1. 检查Gmail应用专用密码是否正确');
    console.log('  2. 确保Gmail账户已启用"不太安全的应用访问"');
    console.log('  3. 检查网络连接');
    console.log('  4. 尝试使用VPN或其他网络');
  } finally {
    process.exit(0);
  }
}

testSmtpConnection();