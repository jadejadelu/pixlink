import { Router } from 'express';
import roomController from '../controllers/roomController';
import { authMiddleware } from '../middleware/auth';

const router = Router();

router.use(authMiddleware);

router.post('/', roomController.create);
router.get('/', roomController.list);
router.get('/by-number/:roomNumber', roomController.getByRoomNumber);
router.post('/join-by-number', roomController.joinByNumber);
router.get('/:id', roomController.getById);
router.post('/:id/join', roomController.join);
router.delete('/:id/leave', roomController.leave);

export default router;
