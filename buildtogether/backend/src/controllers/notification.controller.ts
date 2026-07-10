import { Response } from 'express';
import { AuthRequest } from '../middleware';
import { notificationService } from '../services';

export class NotificationController {
  async getNotifications(req: AuthRequest, res: Response) {
    try {
      const page = parseInt(req.query.page as string || '1');
      const limit = parseInt(req.query.limit as string || '20');
      const unreadOnly = req.query.unread === 'true';
      const result = await notificationService.getNotifications(req.user!.id, page, limit, unreadOnly);
      res.json({ success: true, ...result });
    } catch (error: any) {
      res.status(error.statusCode || 500).json({ success: false, error: error.message });
    }
  }

  async markAsRead(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const notification = await notificationService.markAsRead(id, req.user!.id);
      res.json({ success: true, data: notification });
    } catch (error: any) {
      res.status(error.statusCode || 500).json({ success: false, error: error.message });
    }
  }

  async markAllAsRead(req: AuthRequest, res: Response) {
    try {
      await notificationService.markAllAsRead(req.user!.id);
      res.json({ success: true, message: 'All notifications marked as read' });
    } catch (error: any) {
      res.status(error.statusCode || 500).json({ success: false, error: error.message });
    }
  }

  async getUnreadCount(req: AuthRequest, res: Response) {
    try {
      const count = await notificationService.getUnreadCount(req.user!.id);
      res.json({ success: true, data: { count } });
    } catch (error: any) {
      res.status(error.statusCode || 500).json({ success: false, error: error.message });
    }
  }

  async deleteNotification(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      await notificationService.deleteNotification(id, req.user!.id);
      res.json({ success: true, message: 'Notification deleted' });
    } catch (error: any) {
      res.status(error.statusCode || 500).json({ success: false, error: error.message });
    }
  }
}

export const notificationController = new NotificationController();
