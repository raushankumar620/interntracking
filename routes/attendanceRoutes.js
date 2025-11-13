import express from 'express';
import {
  recordLogin,
  recordLogout,
  startBreak,
  endBreak,
  recordCameraLeft,
  recordCameraReturn,
  recordTabClosed,
  checkSessionStatus,
  getAttendanceHistory,
  getTodayAttendance
} from '../controllers/attendanceController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

// All routes are protected and require intern role
router.use(protect);
router.use(authorize('intern'));

router.post('/login', recordLogin);
router.post('/logout', recordLogout);
router.post('/break/start', startBreak);
router.post('/break/end', endBreak);
router.post('/camera/left', recordCameraLeft);
router.post('/camera/return', recordCameraReturn);
router.post('/tab/closed', recordTabClosed);
router.get('/session-status', checkSessionStatus);
router.get('/history', getAttendanceHistory);
router.get('/today', getTodayAttendance);

export default router;
