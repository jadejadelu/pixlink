import { Router } from 'express';
import certificateController from '../controllers/certificateController';
import { authMiddleware } from '../middleware/auth';

const router = Router();

router.post('/issue', authMiddleware, certificateController.issueCertificate.bind(certificateController));
router.get('/', authMiddleware, certificateController.getCertificates.bind(certificateController));
router.get('/:certificateId/status', authMiddleware, certificateController.getCertificateStatus.bind(certificateController));
router.delete('/:certificateId', authMiddleware, certificateController.revokeCertificate.bind(certificateController));

export default router;