import express from 'express';
import roomController from '../controllers/roomController';
import { authMiddleware } from '../middleware/auth';

const router = express.Router();

// Apply auth middleware to all routes
router.use(authMiddleware);

// Room endpoints
router.post('/', roomController.createRoom);
router.get('/', roomController.getRooms);
router.get('/:id', roomController.getRoom);
router.put('/:id', roomController.updateRoom);
router.delete('/:id', roomController.deleteRoom);

// Membership endpoints
router.post('/:id/join', roomController.joinRoom);
router.post('/:id/leave', roomController.leaveRoom);
router.get('/:id/members', roomController.getMembers);
router.delete('/:id/members/:userId', roomController.removeMember);

// Message endpoints
router.get('/:id/messages', roomController.getMessages);
router.post('/:id/messages', roomController.sendMessage);

// Tunnel endpoints
router.post('/:id/tunnels', roomController.createTunnel);
router.get('/:id/tunnels', roomController.getTunnels);

// Game share endpoints
router.post('/:id/shares', roomController.createGameShare);
router.get('/:id/shares', roomController.getGameShares);
router.get('/shares/:gameShareId', roomController.getGameShareById);
router.put('/shares/:gameShareId', roomController.updateGameShare);
router.delete('/shares/:gameShareId', roomController.deleteGameShare);
router.patch('/shares/:gameShareId/pause', roomController.pauseGameShare);
router.patch('/shares/:gameShareId/resume', roomController.resumeGameShare);

// Game templates endpoint
router.get('/games/templates', roomController.getGameTemplates);

export default router;