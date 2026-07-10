import { Response } from 'express';
import { AuthRequest } from '../middleware';
import { messageService } from '../services';

export class MessageController {
  async getChannels(req: AuthRequest, res: Response) {
    try {
      const { projectId } = req.params;
      const channels = await messageService.getChannels(projectId, req.user!.id);
      res.json({ success: true, data: channels });
    } catch (error: any) {
      res.status(error.statusCode || 500).json({ success: false, error: error.message });
    }
  }

  async getMessages(req: AuthRequest, res: Response) {
    try {
      const { channelId } = req.params;
      const before = req.query.before as string;
      const limit = parseInt(req.query.limit as string || '50');
      const messages = await messageService.getMessages(channelId, req.user!.id, before, limit);
      res.json({ success: true, data: messages });
    } catch (error: any) {
      res.status(error.statusCode || 500).json({ success: false, error: error.message });
    }
  }

  async sendMessage(req: AuthRequest, res: Response) {
    try {
      const { channel_id, content, message_type, attachment_url, reply_to_id } = req.body;
      const message = await messageService.sendMessage(
        channel_id,
        req.user!.id,
        content,
        message_type,
        attachment_url,
        reply_to_id
      );
      res.status(201).json({ success: true, data: message });
    } catch (error: any) {
      res.status(error.statusCode || 500).json({ success: false, error: error.message });
    }
  }

  async markAsRead(req: AuthRequest, res: Response) {
    try {
      const { channelId } = req.params;
      await messageService.markAsRead(channelId, req.user!.id);
      res.json({ success: true });
    } catch (error: any) {
      res.status(error.statusCode || 500).json({ success: false, error: error.message });
    }
  }

  async createChannel(req: AuthRequest, res: Response) {
    try {
      const { projectId } = req.params;
      const { name, description } = req.body;
      const channel = await messageService.createChannel(projectId, req.user!.id, name, description);
      res.status(201).json({ success: true, data: channel });
    } catch (error: any) {
      res.status(error.statusCode || 500).json({ success: false, error: error.message });
    }
  }
}

export const messageController = new MessageController();
