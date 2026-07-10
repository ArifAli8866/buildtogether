import { Router } from 'express';
import { messageController } from '../controllers';
import { authenticate, validate } from '../middleware';
import { sendMessageSchema, channelIdSchema } from '../validation';

const router = Router();

router.get('/channels/:projectId', authenticate, messageController.getChannels);
router.get('/channels/:channelId/messages', authenticate, messageController.getMessages);
router.post('/channels/:projectId', authenticate, messageController.createChannel);
router.post('/send', authenticate, validate(sendMessageSchema), messageController.sendMessage);
router.post('/channels/:channelId/read', authenticate, messageController.markAsRead);

export default router;
