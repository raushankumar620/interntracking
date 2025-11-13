import express from 'express';
import {
  internLogin,
  adminLogin,
  getMe,
  updatePassword,
  logout,
  updateProfile
} from '../controllers/authController.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

// Public routes
router.post('/login', internLogin);
router.post('/admin/login', adminLogin);

// Protected routes
router.get('/me', protect, getMe);
router.put('/password', protect, updatePassword);
router.put('/profile', protect, updateProfile);
router.post('/logout', protect, logout);

export default router;
