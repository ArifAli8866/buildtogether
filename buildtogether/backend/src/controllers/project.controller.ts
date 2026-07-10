import { Response } from 'express';
import { AuthRequest } from '../middleware';
import { projectService } from '../services';

export class ProjectController {
  async create(req: AuthRequest, res: Response) {
    try {
      const project = await projectService.createProject(req.user!.id, req.body);
      res.status(201).json({ success: true, data: project, message: 'Project created successfully' });
    } catch (error: any) {
      res.status(error.statusCode || 500).json({ success: false, error: error.message });
    }
  }

  async getById(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const project = await projectService.getProject(id, req.user?.id);
      res.json({ success: true, data: project });
    } catch (error: any) {
      res.status(error.statusCode || 500).json({ success: false, error: error.message });
    }
  }

  async list(req: AuthRequest, res: Response) {
    try {
      const result = await projectService.listProjects(req.query, req.user?.id);
      res.json({ success: true, ...result });
    } catch (error: any) {
      res.status(error.statusCode || 500).json({ success: false, error: error.message });
    }
  }

  async update(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const project = await projectService.updateProject(id, req.user!.id, req.body);
      res.json({ success: true, data: project, message: 'Project updated' });
    } catch (error: any) {
      res.status(error.statusCode || 500).json({ success: false, error: error.message });
    }
  }

  async delete(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      await projectService.deleteProject(id, req.user!.id);
      res.json({ success: true, message: 'Project deleted' });
    } catch (error: any) {
      res.status(error.statusCode || 500).json({ success: false, error: error.message });
    }
  }

  async apply(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const application = await projectService.applyToProject(id, req.user!.id, req.body);
      res.status(201).json({ success: true, data: application, message: 'Application submitted' });
    } catch (error: any) {
      res.status(error.statusCode || 500).json({ success: false, error: error.message });
    }
  }

  async handleApplication(req: AuthRequest, res: Response) {
    try {
      const { applicationId, action } = req.params;
      const result = await projectService.handleApplication(applicationId, req.user!.id, action as any);
      res.json({ success: true, data: result, message: `Application ${action}ed` });
    } catch (error: any) {
      res.status(error.statusCode || 500).json({ success: false, error: error.message });
    }
  }

  async getApplications(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const status = req.query.status as string;
      const applications = await projectService.getApplications(id, req.user!.id, status);
      res.json({ success: true, data: applications });
    } catch (error: any) {
      res.status(error.statusCode || 500).json({ success: false, error: error.message });
    }
  }

  async toggleSave(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const result = await projectService.toggleSaveProject(id, req.user!.id);
      res.json({ success: true, data: result });
    } catch (error: any) {
      res.status(error.statusCode || 500).json({ success: false, error: error.message });
    }
  }

  async toggleStar(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const result = await projectService.toggleStarProject(id, req.user!.id);
      res.json({ success: true, data: result });
    } catch (error: any) {
      res.status(error.statusCode || 500).json({ success: false, error: error.message });
    }
  }

  async getFeatured(req: AuthRequest, res: Response) {
    try {
      const projects = await projectService.getFeaturedProjects();
      res.json({ success: true, data: projects });
    } catch (error: any) {
      res.status(error.statusCode || 500).json({ success: false, error: error.message });
    }
  }

  async getUserProjects(req: AuthRequest, res: Response) {
    try {
      const type = (req.query.type as string) || 'created';
      const projects = await projectService.getUserProjects(req.user!.id, type as any);
      res.json({ success: true, data: projects });
    } catch (error: any) {
      res.status(error.statusCode || 500).json({ success: false, error: error.message });
    }
  }
}

export const projectController = new ProjectController();
