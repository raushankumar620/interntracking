import express from 'express';
import {
  getCurrentMonthSalary,
  getMonthSalary,
  getSalaryHistory
} from '../controllers/salaryController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

// All routes are protected and require intern role
router.use(protect);
router.use(authorize('intern'));

router.get('/current', getCurrentMonthSalary);
router.get('/month/:year/:month', getMonthSalary);
router.get('/history', getSalaryHistory);

export default router;
