import { Router } from 'express';
import { userController } from '../controllers';
import { authenticate, optionalAuth, validate } from '../middleware';
import { updateProfileSchema, searchUsersSchema } from '../validation';
import multer from 'multer';

const router = Router();
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  },
});

// Protected routes
router.get('/me', authenticate, userController.getMe);
router.put('/me', authenticate, validate(updateProfileSchema), userController.updateProfile);
router.get('/me/stats', authenticate, userController.getDashboardStats);
router.post('/me/avatar', authenticate, upload.single('avatar'), userController.uploadAvatar);
router.post('/me/banner', authenticate, upload.single('banner'), userController.uploadBanner);

// Public routes
router.get('/search', optionalAuth, validate(searchUsersSchema), userController.searchUsers);
router.get('/:username', optionalAuth, userController.getProfile);
router.post('/:id/follow', authenticate, userController.followUser);
router.delete('/:id/follow', authenticate, userController.unfollowUser);
router.get('/:id/followers', optionalAuth, userController.getFollowers);
router.get('/:id/following', optionalAuth, userController.getFollowing);

export default router;
