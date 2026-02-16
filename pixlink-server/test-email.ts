import emailService from './src/services/emailService';
import logger from './src/utils/logger';

async function testEmailService() {
  try {
    logger.info('Starting email service tests...');

    const testEmail = process.env.TEST_EMAIL || 'test@example.com';
    const testNickname = 'Test User';

    logger.info('Test 1: Testing SMTP connection...');
    const isConnected = await emailService.testConnection();
    if (isConnected) {
      logger.info('✓ SMTP connection successful');
    } else {
      logger.error('✗ SMTP connection failed');
      return;
    }

    logger.info('Test 2: Sending registration email...');
    await emailService.sendRegistrationEmail({
      email: testEmail,
      nickname: testNickname,
    });
    logger.info('✓ Registration email sent');

    logger.info('Test 3: Sending password reset email...');
    await emailService.sendPasswordResetEmail({
      email: testEmail,
      nickname: testNickname,
      resetUrl: 'http://localhost:5173/reset-password?token=test-token',
      resetToken: 'test-token-12345',
    });
    logger.info('✓ Password reset email sent');

    logger.info('Test 4: Sending permit email...');
    await emailService.sendPermitEmail({
      email: testEmail,
      nickname: testNickname,
      permitContent: '-----BEGIN CERTIFICATE-----\nTest permit content here\n-----END CERTIFICATE-----',
      certificateId: 'test-certificate-id',
      deviceName: 'Test Device',
    });
    logger.info('✓ Permit email sent');

    logger.info('All email service tests completed successfully!');
  } catch (error: any) {
    logger.error('Email service test failed:', error);
    process.exit(1);
  }
}

testEmailService();