import { Router } from 'express';
import authController from '../controllers/authController';
import { authMiddleware } from '../middleware/auth';

const router = Router();

router.post('/register', authController.register.bind(authController));
router.post('/login', authController.login.bind(authController));
router.post('/logout', authController.logout.bind(authController));
router.post('/magic-link', authController.requestMagicLink.bind(authController));
router.post('/otp', authController.requestOTP.bind(authController));
router.post('/enroll/token', authController.exchangeEnrollmentToken.bind(authController));
router.post('/password-reset/request', authController.requestPasswordReset.bind(authController));
router.post('/password-reset/reset', authController.resetPassword.bind(authController));
router.post('/activate', authController.activateAccount.bind(authController));
router.post('/resend-activation', authController.resendActivationEmail.bind(authController));

router.get('/profile', authMiddleware, authController.getProfile.bind(authController));
router.put('/profile', authMiddleware, authController.updateProfile.bind(authController));
router.post('/upload-identity', authMiddleware, authController.uploadIdentity.bind(authController));
router.post('/send-permit', authMiddleware, authController.sendPermit.bind(authController));
router.post('/leave-mesh', authMiddleware, authController.leaveMesh.bind(authController));
router.post('/device-settings', authMiddleware, authController.updateDeviceSettings.bind(authController));

export default router;