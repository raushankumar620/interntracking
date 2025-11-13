import express from 'express';
import {
  getOverview,
  getAllInterns,
  getInternDetails,
  generateReport,
  createIntern,
  updateIntern,
  deactivateIntern
} from '../controllers/adminController.js';
import { protect, authorize } from '../middleware/auth.js';

const router = express.Router();

// All routes are protected and require admin role
router.use(protect);
router.use(authorize('admin', 'super-admin'));

router.get('/overview', getOverview);
router.get('/interns', getAllInterns);
router.get('/interns/:internId', getInternDetails);
router.get('/report', generateReport);
router.post('/interns', createIntern);
router.put('/interns/:internId', updateIntern);
router.delete('/interns/:internId', deactivateIntern);

export default router;
