import { Response } from 'express';
import { AuthRequest } from '../middleware';
import { userService } from '../services';

export class UserController {
  async getMe(req: AuthRequest, res: Response) {
    try {
      const profile = await userService.getProfile(req.user!.id);
      res.json({ success: true, data: profile });
    } catch (error: any) {
      res.status(error.statusCode || 500).json({ success: false, error: error.message });
    }
  }

  async getProfile(req: AuthRequest, res: Response) {
    try {
      const { username } = req.params;
      const profile = await userService.getProfileByUsername(username);
      res.json({ success: true, data: profile });
    } catch (error: any) {
      res.status(error.statusCode || 500).json({ success: false, error: error.message });
    }
  }

  async updateProfile(req: AuthRequest, res: Response) {
    try {
      const profile = await userService.updateProfile(req.user!.id, req.body);
      res.json({ success: true, data: profile, message: 'Profile updated successfully' });
    } catch (error: any) {
      res.status(error.statusCode || 500).json({ success: false, error: error.message });
    }
  }

  async searchUsers(req: AuthRequest, res: Response) {
    try {
      const { q, ...filters } = req.query;
      const result = await userService.searchUsers(q as string || '', filters);
      res.json({ success: true, ...result });
    } catch (error: any) {
      res.status(error.statusCode || 500).json({ success: false, error: error.message });
    }
  }

  async followUser(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const result = await userService.followUser(req.user!.id, id);
      res.json({ success: true, data: result, message: 'User followed' });
    } catch (error: any) {
      res.status(error.statusCode || 500).json({ success: false, error: error.message });
    }
  }

  async unfollowUser(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      await userService.unfollowUser(req.user!.id, id);
      res.json({ success: true, message: 'User unfollowed' });
    } catch (error: any) {
      res.status(error.statusCode || 500).json({ success: false, error: error.message });
    }
  }

  async getFollowers(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const page = parseInt(req.query.page as string || '1');
      const limit = parseInt(req.query.limit as string || '20');
      const result = await userService.getFollowers(id, page, limit);
      res.json({ success: true, ...result });
    } catch (error: any) {
      res.status(error.statusCode || 500).json({ success: false, error: error.message });
    }
  }

  async getFollowing(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const page = parseInt(req.query.page as string || '1');
      const limit = parseInt(req.query.limit as string || '20');
      const result = await userService.getFollowing(id, page, limit);
      res.json({ success: true, ...result });
    } catch (error: any) {
      res.status(error.statusCode || 500).json({ success: false, error: error.message });
    }
  }

  async uploadAvatar(req: AuthRequest, res: Response) {
    try {
      if (!req.file) {
        return res.status(400).json({ success: false, error: 'No file uploaded' });
      }
      const profile = await userService.uploadAvatar(req.user!.id, req.file);
      return res.json({ success: true, data: profile, message: 'Avatar updated' });
    } catch (error: any) {
      return res.status(error.statusCode || 500).json({ success: false, error: error.message });
    }
  }

  async uploadBanner(req: AuthRequest, res: Response) {
    try {
      if (!req.file) {
        return res.status(400).json({ success: false, error: 'No file uploaded' });
      }
      const profile = await userService.uploadBanner(req.user!.id, req.file);
      return res.json({ success: true, data: profile, message: 'Banner updated' });
    } catch (error: any) {
      return res.status(error.statusCode || 500).json({ success: false, error: error.message });
    }
  }

  async getDashboardStats(req: AuthRequest, res: Response) {
    try {
      const stats = await userService.getDashboardStats(req.user!.id);
      res.json({ success: true, data: stats });
    } catch (error: any) {
      res.status(error.statusCode || 500).json({ success: false, error: error.message });
    }
  }
}

export const userController = new UserController();