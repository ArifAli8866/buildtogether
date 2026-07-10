import { Router } from 'express';
import { projectController } from '../controllers';
import { authenticate, optionalAuth, validate, createLimiter } from '../middleware';
import { createProjectSchema, updateProjectSchema, applyToProjectSchema, projectIdSchema } from '../validation';

const router = Router();

// Public routes
router.get('/', optionalAuth, projectController.list);
router.get('/featured', optionalAuth, projectController.getFeatured);
router.get('/mine', authenticate, projectController.getUserProjects);

// Protected routes
router.post('/', authenticate, createLimiter, validate(createProjectSchema), projectController.create);
router.get('/:id', optionalAuth, projectController.getById);
router.put('/:id', authenticate, validate(updateProjectSchema), projectController.update);
router.delete('/:id', authenticate, projectController.delete);

// Interactions
router.post('/:id/apply', authenticate, validate(applyToProjectSchema), projectController.apply);
router.post('/:id/save', authenticate, projectController.toggleSave);
router.post('/:id/star', authenticate, projectController.toggleStar);

// Applications management (project owner)
router.get('/:id/applications', authenticate, projectController.getApplications);
router.post('/applications/:applicationId/:action', authenticate, projectController.handleApplication);

export default router;
