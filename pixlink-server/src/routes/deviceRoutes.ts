import { Router } from 'express';
import deviceController from '../controllers/deviceController';
import { authMiddleware } from '../middleware/auth';

const router = Router();

router.post('/', authMiddleware, deviceController.createDevice.bind(deviceController));
router.get('/', authMiddleware, deviceController.getDevices.bind(deviceController));
router.get('/:deviceNonce', authMiddleware, deviceController.getDevice.bind(deviceController));
router.put('/:deviceNonce', authMiddleware, deviceController.updateDevice.bind(deviceController));
router.delete('/:deviceId', authMiddleware, deviceController.revokeDevice.bind(deviceController));

export default router;