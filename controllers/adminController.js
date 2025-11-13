import Attendance from '../models/Attendance.js';
import Intern from '../models/Intern.js';
import { getTodayDate } from '../utils/timeHelper.js';

// @desc    Get dashboard overview
// @route   GET /api/admin/overview
// @access  Private (Admin)
export const getOverview = async (req, res) => {
  try {
    const { date } = req.query;
    const targetDate = date || getTodayDate();
    
    console.log('Overview - Requested date:', date);
    console.log('Overview - Target date:', targetDate);

    // Get all interns
    const totalInterns = await Intern.countDocuments({ isActive: true });

    // Get today's attendance records
    const todayAttendance = await Attendance.find({ date: targetDate });
    
    console.log(`Found ${todayAttendance.length} attendance records for ${targetDate}`);

    // Calculate statistics
    const totalPresent = todayAttendance.length;
    const totalLate = todayAttendance.filter(a => a.isLate).length;
    const totalOnBreak = todayAttendance.filter(a => a.status === 'on-break').length;
    const totalLeftEvents = todayAttendance.reduce((sum, a) => sum + a.leftCount, 0);
    const totalAbsent = totalInterns - totalPresent;

    // Get interns with exceeded breaks
    const exceededBreaks = todayAttendance.filter(a => 
      a.breaks.some(b => b.isExceeded)
    ).length;

    res.status(200).json({
      success: true,
      data: {
        date: targetDate,
        totalInterns,
        totalPresent,
        totalAbsent,
        totalLate,
        totalOnBreak,
        totalLeftEvents,
        exceededBreaks
      }
    });
  } catch (error) {
    console.error('Get overview error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Get all interns with attendance details
// @route   GET /api/admin/interns
// @access  Private (Admin)
export const getAllInterns = async (req, res) => {
  try {
    const { date, status, search } = req.query;
    const targetDate = date || getTodayDate();
    
    console.log('Get All Interns - Requested date:', date);
    console.log('Get All Interns - Target date:', targetDate);
    console.log('Get All Interns - Status filter:', status);
    console.log('Get All Interns - Search term:', search);

    // Build search query for interns
    let internQuery = { isActive: true };
    if (search) {
      internQuery.$or = [
        { name: { $regex: search, $options: 'i' } },
        { internId: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    // Get all interns
    const interns = await Intern.find(internQuery).select('-password');
    
    console.log(`Found ${interns.length} interns matching criteria`);

    // Get attendance for each intern
    const internsWithAttendance = await Promise.all(
      interns.map(async (intern) => {
        const attendance = await Attendance.findOne({
          internId: intern.internId,
          date: targetDate
        });

        return {
          ...intern.toObject(),
          attendance: attendance || null,
          status: attendance 
            ? attendance.status 
            : 'absent',
          loginTime: attendance ? attendance.loginTime : null,
          logoutTime: attendance ? attendance.logoutTime : null,
          isLate: attendance ? attendance.isLate : false,
          lateBy: attendance ? attendance.lateBy : 0,
          workHours: attendance ? attendance.getFormattedWorkHours() : '0h 0m',
          leftCount: attendance ? attendance.leftCount : 0,
          breaks: attendance ? attendance.breaks.length : 0,
          totalBreakTime: attendance ? attendance.totalBreakTime : 0
        };
      })
    );

    // Apply status filter
    let filteredInterns = internsWithAttendance;
    if (status && status !== 'all') {
      filteredInterns = internsWithAttendance.filter(intern => {
        if (status === 'late') return intern.isLate;
        if (status === 'absent') return intern.status === 'absent';
        if (status === 'on-break') return intern.status === 'on-break';
        return true;
      });
    }

    res.status(200).json({
      success: true,
      count: filteredInterns.length,
      data: filteredInterns
    });
  } catch (error) {
    console.error('Get all interns error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Get specific intern details with full history
// @route   GET /api/admin/interns/:internId
// @access  Private (Admin)
export const getInternDetails = async (req, res) => {
  try {
    const { internId } = req.params;
    const { limit = 30 } = req.query;

    // Get intern
    const intern = await Intern.findOne({ internId });

    if (!intern) {
      return res.status(404).json({
        success: false,
        message: 'Intern not found'
      });
    }

    // Get attendance history
    const attendanceHistory = await Attendance.find({ internId })
      .sort({ date: -1 })
      .limit(parseInt(limit));

    // Calculate overall statistics
    const totalDays = attendanceHistory.length;
    const presentDays = attendanceHistory.filter(a => a.status !== 'absent').length;
    const lateDays = attendanceHistory.filter(a => a.isLate).length;
    const totalLeftEvents = attendanceHistory.reduce((sum, a) => sum + a.leftCount, 0);
    const avgWorkHours = presentDays > 0 
      ? (attendanceHistory.reduce((sum, a) => sum + a.totalWorkMinutes, 0) / presentDays / 60).toFixed(1)
      : 0;

    res.status(200).json({
      success: true,
      data: {
        intern,
        statistics: {
          totalDays,
          presentDays,
          lateDays,
          totalLeftEvents,
          avgWorkHours,
          punctualityRate: presentDays > 0 ? ((presentDays - lateDays) / presentDays * 100).toFixed(1) : 0
        },
        attendanceHistory
      }
    });
  } catch (error) {
    console.error('Get intern details error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Generate attendance report
// @route   GET /api/admin/report
// @access  Private (Admin)
export const generateReport = async (req, res) => {
  try {
    const { startDate, endDate, internId, format = 'json' } = req.query;

    let query = {};

    // Filter by date range
    if (startDate && endDate) {
      query.date = { $gte: startDate, $lte: endDate };
    } else if (startDate) {
      query.date = { $gte: startDate };
    } else if (endDate) {
      query.date = { $lte: endDate };
    }

    // Filter by specific intern
    if (internId) {
      query.internId = internId;
    }

    // Get attendance records
    const records = await Attendance.find(query).sort({ date: -1, internId: 1 });

    // Get intern details for each record
    const reportData = await Promise.all(
      records.map(async (record) => {
        const intern = await Intern.findOne({ internId: record.internId });
        return {
          date: record.date,
          internId: record.internId,
          internName: intern ? intern.name : 'Unknown',
          department: intern ? intern.department : 'N/A',
          loginTime: record.loginTime,
          logoutTime: record.logoutTime,
          isLate: record.isLate,
          lateBy: record.lateBy,
          workHours: record.getFormattedWorkHours(),
          totalBreakTime: record.totalBreakTime,
          leftCount: record.leftCount,
          status: record.status
        };
      })
    );

    // Calculate overall stats
    const totalRecords = reportData.length;
    const totalLate = reportData.filter(r => r.isLate).length;
    const avgWorkMinutes = totalRecords > 0
      ? records.reduce((sum, r) => sum + r.totalWorkMinutes, 0) / totalRecords
      : 0;

    const response = {
      success: true,
      filters: { startDate, endDate, internId },
      summary: {
        totalRecords,
        totalLate,
        avgWorkHours: (avgWorkMinutes / 60).toFixed(1),
        punctualityRate: totalRecords > 0 ? ((totalRecords - totalLate) / totalRecords * 100).toFixed(1) : 0
      },
      data: reportData
    };

    // Return JSON format
    if (format === 'json') {
      return res.status(200).json(response);
    }

    // For CSV format
    if (format === 'csv') {
      const csv = convertToCSV(reportData);
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=attendance-report-${Date.now()}.csv`);
      return res.send(csv);
    }

    res.status(200).json(response);
  } catch (error) {
    console.error('Generate report error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Create new intern
// @route   POST /api/admin/interns
// @access  Private (Admin)
export const createIntern = async (req, res) => {
  try {
    const {
      name,
      email,
      password,
      phone,
      department,
      startDate,
      endDate
    } = req.body;

    // Log the received data for debugging
    console.log('Received intern creation request:', {
      name,
      email,
      phone,
      department,
      startDate,
      endDate,
      hasPassword: !!password
    });

    // Validate required fields
    if (!name || !email || !password || !department || !startDate || !endDate) {
      const missingFields = [];
      if (!name) missingFields.push('name');
      if (!email) missingFields.push('email');
      if (!password) missingFields.push('password');
      if (!department) missingFields.push('department');
      if (!startDate) missingFields.push('startDate');
      if (!endDate) missingFields.push('endDate');
      
      return res.status(400).json({
        success: false,
        message: `Missing required fields: ${missingFields.join(', ')}`
      });
    }

    // Validate password length
    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters long'
      });
    }

    // Validate email format
    const emailRegex = /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid email address'
      });
    }

    // Validate dates
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      return res.status(400).json({
        success: false,
        message: 'Invalid date format. Please use YYYY-MM-DD format'
      });
    }

    if (end <= start) {
      return res.status(400).json({
        success: false,
        message: 'End date must be after start date'
      });
    }

    // Check if intern with this email already exists
    const existingIntern = await Intern.findOne({ email: email.toLowerCase() });

    if (existingIntern) {
      return res.status(400).json({
        success: false,
        message: 'Intern with this email already exists'
      });
    }

    // Generate unique intern ID
    const internId = await generateInternId();
    
    console.log('Generated intern ID:', internId);
    console.log('Creating intern with data:', {
      internId,
      name: name.trim(),
      email: email.toLowerCase().trim(),
      phone: phone ? phone.trim() : '',
      department: department.trim(),
      internshipStartDate: start,
      internshipEndDate: end,
      hasPassword: !!password
    });

    // Create intern
    const intern = await Intern.create({
      internId,
      name: name.trim(),
      email: email.toLowerCase().trim(),
      password,
      phone: phone ? phone.trim() : '',
      department: department.trim(),
      internshipStartDate: start,
      internshipEndDate: end
    });

    console.log('Intern created successfully:', internId);

    // Send welcome email (optional - you can implement this)
    // await sendWelcomeEmail(intern.email, intern.name, internId, password);

    res.status(201).json({
      success: true,
      message: 'Intern created successfully',
      data: {
        internId: intern.internId,
        name: intern.name,
        email: intern.email,
        phone: intern.phone,
        department: intern.department,
        internshipStartDate: intern.internshipStartDate,
        internshipEndDate: intern.internshipEndDate
      }
    });
  } catch (error) {
    console.error('Create intern error:', error);
    
    // Handle Mongoose validation errors
    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: 'Validation error',
        error: errors.join(', ')
      });
    }

    // Handle duplicate key errors
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      return res.status(400).json({
        success: false,
        message: `An intern with this ${field} already exists`
      });
    }

    res.status(500).json({
      success: false,
      message: 'Server error while creating intern',
      error: error.message
    });
  }
};

// Helper function to generate unique intern ID
async function generateInternId() {
  const prefix = 'INT';
  const year = new Date().getFullYear().toString().slice(-2);
  
  // Find the last intern created this year
  const lastIntern = await Intern.findOne({
    internId: new RegExp(`^${prefix}${year}`)
  }).sort({ internId: -1 });

  let sequence = 1;
  if (lastIntern) {
    const lastSequence = parseInt(lastIntern.internId.slice(-4));
    sequence = lastSequence + 1;
  }

  // Format: INT24-0001, INT24-0002, etc.
  return `${prefix}${year}-${sequence.toString().padStart(4, '0')}`;
}

// @desc    Update intern
// @route   PUT /api/admin/interns/:internId
// @access  Private (Admin)
export const updateIntern = async (req, res) => {
  try {
    const { internId } = req.params;
    const updates = req.body;

    // Don't allow updating password through this endpoint
    delete updates.password;
    delete updates.internId; // Don't allow changing internId

    const intern = await Intern.findOneAndUpdate(
      { internId },
      updates,
      { new: true, runValidators: true }
    );

    if (!intern) {
      return res.status(404).json({
        success: false,
        message: 'Intern not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Intern updated successfully',
      data: intern
    });
  } catch (error) {
    console.error('Update intern error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Deactivate intern
// @route   DELETE /api/admin/interns/:internId
// @access  Private (Admin)
export const deactivateIntern = async (req, res) => {
  try {
    const { internId } = req.params;

    const intern = await Intern.findOneAndUpdate(
      { internId },
      { isActive: false },
      { new: true }
    );

    if (!intern) {
      return res.status(404).json({
        success: false,
        message: 'Intern not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Intern deactivated successfully'
    });
  } catch (error) {
    console.error('Deactivate intern error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// Helper function to convert data to CSV
function convertToCSV(data) {
  if (data.length === 0) return '';

  const headers = Object.keys(data[0]).join(',');
  const rows = data.map(row => Object.values(row).join(',')).join('\n');
  return `${headers}\n${rows}`;
}

export default {
  getOverview,
  getAllInterns,
  getInternDetails,
  generateReport,
  createIntern,
  updateIntern,
  deactivateIntern
};
