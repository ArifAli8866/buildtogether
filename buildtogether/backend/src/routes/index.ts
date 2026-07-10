import { Router } from 'express';
import userRoutes from './user.routes';
import projectRoutes from './project.routes';
import messageRoutes from './message.routes';
import notificationRoutes from './notification.routes';

const router = Router();

router.use('/users', userRoutes);
router.use('/projects', projectRoutes);
router.use('/messages', messageRoutes);
router.use('/notifications', notificationRoutes);

// Health check
router.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

export default router;
