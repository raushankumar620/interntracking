import Attendance from '../models/Attendance.js';
import Intern from '../models/Intern.js';
import {
  getTodayDate,
  isLateLogin,
  calculateLateMinutes,
  calculateDurationMinutes,
  getFormattedTime,
  isBreakExceeded
} from '../utils/timeHelper.js';
import {
  sendLateLoginEmail,
  sendBreakExceededEmail
} from '../utils/emailService.js';

// Helper function to get internId from request
const getInternId = async (req) => {
  let internId = req.user.internId || req.body.internId;
  
  // If internId is not in token, fetch from database using user ID
  if (!internId && req.user.id) {
    const intern = await Intern.findById(req.user.id);
    if (intern) {
      internId = intern.internId;
    }
  }
  
  return internId;
};

// @desc    Record intern login
// @route   POST /api/attendance/login
// @access  Private (Intern)
export const recordLogin = async (req, res) => {
  try {
    console.log('📝 Recording login - Request received');
    console.log('User:', req.user);
    console.log('Body:', req.body);

    const internId = await getInternId(req);
    
    if (!internId) {
      console.error('❌ No internId found in request or database');
      return res.status(400).json({
        success: false,
        message: 'Intern ID is required. Please login again.'
      });
    }
    
    console.log('✅ Using internId:', internId);

    const todayDate = getTodayDate();
    const loginTime = new Date();

    console.log(`🔍 Checking existing attendance for internId: ${internId}, date: ${todayDate}`);

    // Check if already logged in today
    const existingAttendance = await Attendance.findOne({
      internId,
      date: todayDate
    });

    if (existingAttendance) {
      console.log('⚠️ Attendance already exists for today:', existingAttendance._id);
      return res.status(400).json({
        success: false,
        message: 'You have already logged in today'
      });
    }

    // Check if late
    const late = isLateLogin();
    const lateMinutes = late ? calculateLateMinutes() : 0;

    console.log(`⏰ Login time check - Late: ${late}, Minutes: ${lateMinutes}`);

    // Create attendance record
    console.log('💾 Creating new attendance record...');
    const attendance = await Attendance.create({
      internId,
      date: todayDate,
      loginTime,
      isLate: late,
      lateBy: lateMinutes,
      status: 'present'
    });

    console.log('✅ Attendance record created successfully:', attendance._id);

    // Send late email if applicable
    if (late) {
      console.log('📧 Sending late login email...');
      try {
        const intern = await Intern.findOne({ internId });
        if (intern) {
          await sendLateLoginEmail(
            intern.email,
            intern.name,
            lateMinutes,
            getFormattedTime(loginTime)
          );
          console.log('✅ Late login email sent successfully');
        } else {
          console.warn('⚠️ Intern not found for email notification');
        }
      } catch (emailError) {
        console.error('❌ Email sending error (non-critical):', emailError.message);
        // Continue even if email fails
      }
    }

    console.log('🎉 Login recorded successfully');
    res.status(201).json({
      success: true,
      message: late ? `Login recorded. You are ${lateMinutes} minutes late.` : 'Login recorded successfully',
      data: {
        attendance,
        isLate: late,
        lateBy: lateMinutes
      }
    });
  } catch (error) {
    console.error('❌ Record login error:', error);
    console.error('Error stack:', error.stack);
    res.status(500).json({
      success: false,
      message: 'Server error while recording login',
      error: error.message,
      details: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
};

// @desc    Record intern logout
// @route   POST /api/attendance/logout
// @access  Private (Intern)
export const recordLogout = async (req, res) => {
  try {
    const internId = await getInternId(req);
    const todayDate = getTodayDate();
    const logoutTime = new Date();

    if (!internId) {
      return res.status(400).json({
        success: false,
        message: 'Intern ID is required. Please login again.'
      });
    }

    // Find today's attendance
    const attendance = await Attendance.findOne({
      internId,
      date: todayDate
    });

    if (!attendance) {
      return res.status(404).json({
        success: false,
        message: 'No login record found for today'
      });
    }

    if (attendance.logoutTime) {
      return res.status(400).json({
        success: false,
        message: 'You have already logged out today'
      });
    }

    // Calculate total work minutes
    const totalMinutes = calculateDurationMinutes(attendance.loginTime, logoutTime);
    const workMinutes = totalMinutes - attendance.totalBreakTime;

    // Calculate actual work hours
    const actualWorkHours = parseFloat((workMinutes / 60).toFixed(2));
    const requiredHours = 7;
    const workHoursDeficit = Math.max(0, requiredHours - actualWorkHours);

    // Update attendance
    attendance.logoutTime = logoutTime;
    attendance.totalWorkMinutes = workMinutes;
    attendance.actualWorkHours = actualWorkHours;
    attendance.workHoursDeficit = workHoursDeficit;
    
    // If not already ended, mark as logged out
    if (!attendance.workSessionEnded) {
      attendance.status = 'logged-out';
      attendance.workSessionEndReason = 'manual-logout';
      attendance.workSessionEndTime = logoutTime;
    }
    
    await attendance.save();

    res.status(200).json({
      success: true,
      message: 'Logout recorded successfully',
      data: {
        loginTime: attendance.loginTime,
        logoutTime: attendance.logoutTime,
        totalWorkHours: attendance.getFormattedWorkHours(),
        actualWorkHours: actualWorkHours,
        requiredWorkHours: requiredHours,
        workHoursDeficit: workHoursDeficit,
        breakTime: attendance.totalBreakTime,
        leftCount: attendance.leftCount,
        tabClosedCount: attendance.tabClosedCount
      }
    });
  } catch (error) {
    console.error('Record logout error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while recording logout',
      error: error.message
    });
  }
};

// @desc    Start break
// @route   POST /api/attendance/break/start
// @access  Private (Intern)
export const startBreak = async (req, res) => {
  try {
    const internId = await getInternId(req);
    const todayDate = getTodayDate();
    const breakStartTime = new Date();

    if (!internId) {
      return res.status(400).json({
        success: false,
        message: 'Intern ID is required. Please login again.'
      });
    }

    // Find today's attendance
    const attendance = await Attendance.findOne({
      internId,
      date: todayDate
    });

    if (!attendance) {
      return res.status(404).json({
        success: false,
        message: 'Please login first'
      });
    }

    // Check if already on break
    const activeBreak = attendance.breaks.find(b => !b.endTime);
    if (activeBreak) {
      return res.status(400).json({
        success: false,
        message: 'You are already on a break'
      });
    }

    // Add new break
    attendance.breaks.push({
      startTime: breakStartTime
    });
    attendance.status = 'on-break';
    await attendance.save();

    res.status(200).json({
      success: true,
      message: 'Break started',
      data: {
        breakStartTime
      }
    });
  } catch (error) {
    console.error('Start break error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while starting break',
      error: error.message
    });
  }
};

// @desc    End break
// @route   POST /api/attendance/break/end
// @access  Private (Intern)
export const endBreak = async (req, res) => {
  try {
    const internId = await getInternId(req);
    const todayDate = getTodayDate();
    const breakEndTime = new Date();

    if (!internId) {
      return res.status(400).json({
        success: false,
        message: 'Intern ID is required. Please login again.'
      });
    }

    // Find today's attendance
    const attendance = await Attendance.findOne({
      internId,
      date: todayDate
    });

    if (!attendance) {
      return res.status(404).json({
        success: false,
        message: 'No attendance record found'
      });
    }

    // Find active break
    const activeBreak = attendance.breaks.find(b => !b.endTime);
    if (!activeBreak) {
      return res.status(400).json({
        success: false,
        message: 'No active break found'
      });
    }

    // Calculate break duration
    const duration = calculateDurationMinutes(activeBreak.startTime, breakEndTime);
    activeBreak.endTime = breakEndTime;
    activeBreak.duration = duration;
    activeBreak.isExceeded = isBreakExceeded(duration);

    // Update total break time
    attendance.totalBreakTime += duration;
    attendance.status = 'present';
    await attendance.save();

    // Send email if break exceeded
    if (activeBreak.isExceeded) {
      const intern = await Intern.findOne({ internId });
      if (intern) {
        await sendBreakExceededEmail(intern.email, intern.name, duration);
      }
    }

    res.status(200).json({
      success: true,
      message: activeBreak.isExceeded 
        ? `Break ended. Warning: Break exceeded by ${duration - 60} minutes` 
        : 'Break ended successfully',
      data: {
        breakDuration: duration,
        isExceeded: activeBreak.isExceeded,
        totalBreakTime: attendance.totalBreakTime
      }
    });
  } catch (error) {
    console.error('End break error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while ending break',
      error: error.message
    });
  }
};

// @desc    Record camera left event
// @route   POST /api/attendance/camera/left
// @access  Private (Intern)
export const recordCameraLeft = async (req, res) => {
  try {
    const internId = await getInternId(req);
    const todayDate = getTodayDate();
    const timestamp = new Date();

    if (!internId) {
      return res.status(400).json({
        success: false,
        message: 'Intern ID is required. Please login again.'
      });
    }

    // Find today's attendance
    const attendance = await Attendance.findOne({
      internId,
      date: todayDate
    });

    if (!attendance) {
      return res.status(404).json({
        success: false,
        message: 'No attendance record found'
      });
    }

    // Check if session already ended
    if (attendance.workSessionEnded) {
      return res.status(400).json({
        success: false,
        message: 'Work session has already ended',
        sessionEnded: true
      });
    }

    // Add left event
    attendance.leftEvents.push({
      timestamp
    });
    attendance.leftCount += 1;

    // Check if face left threshold exceeded
    if (attendance.leftCount >= 10) {
      // End work session
      attendance.workSessionEnded = true;
      attendance.workSessionEndReason = 'face-left-exceeded';
      attendance.workSessionEndTime = timestamp;
      attendance.status = 'session-ended';
      
      // Calculate work done so far
      if (attendance.loginTime) {
        const totalMinutes = calculateDurationMinutes(attendance.loginTime, timestamp);
        attendance.totalWorkMinutes = Math.max(0, totalMinutes - attendance.totalBreakTime);
        attendance.actualWorkHours = parseFloat((attendance.totalWorkMinutes / 60).toFixed(2));
        
        // Calculate deficit from 7 hours
        const requiredHours = 7;
        attendance.workHoursDeficit = Math.max(0, requiredHours - attendance.actualWorkHours);
      }
      
      await attendance.save();

      return res.status(200).json({
        success: true,
        message: 'Work session ended due to excessive face detection failures',
        sessionEnded: true,
        data: {
          leftCount: attendance.leftCount,
          workSessionEnded: true,
          reason: 'face-left-exceeded',
          totalWorkHours: attendance.actualWorkHours
        }
      });
    }

    await attendance.save();

    // Send warning if approaching threshold
    let warningMessage = 'Camera left event recorded';
    if (attendance.leftCount >= 5) {
      warningMessage = `Warning: ${attendance.leftCount}/10 face detection failures. Session will end at 10.`;
    }

    res.status(200).json({
      success: true,
      message: warningMessage,
      warning: attendance.leftCount >= 5,
      data: {
        leftCount: attendance.leftCount,
        threshold: 10
      }
    });
  } catch (error) {
    console.error('Record camera left error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Record camera return event
// @route   POST /api/attendance/camera/return
// @access  Private (Intern)
export const recordCameraReturn = async (req, res) => {
  try {
    const internId = await getInternId(req);
    const todayDate = getTodayDate();
    const returnTime = new Date();

    if (!internId) {
      return res.status(400).json({
        success: false,
        message: 'Intern ID is required. Please login again.'
      });
    }

    // Find today's attendance
    const attendance = await Attendance.findOne({
      internId,
      date: todayDate
    });

    if (!attendance) {
      return res.status(404).json({
        success: false,
        message: 'No attendance record found'
      });
    }

    // Find the last left event without return time
    const activeLeftEvent = attendance.leftEvents.find(e => !e.returnTime);
    if (activeLeftEvent) {
      const duration = Math.floor((returnTime - activeLeftEvent.timestamp) / 1000); // in seconds
      activeLeftEvent.returnTime = returnTime;
      activeLeftEvent.duration = duration;
      await attendance.save();
    }

    res.status(200).json({
      success: true,
      message: 'Camera return event recorded'
    });
  } catch (error) {
    console.error('Record camera return error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Get attendance history for an intern
// @route   GET /api/attendance/history
// @access  Private (Intern)
export const getAttendanceHistory = async (req, res) => {
  try {
    const internId = await getInternId(req);
    const { month, year, limit = 30 } = req.query;

    if (!internId) {
      return res.status(400).json({
        success: false,
        message: 'Intern ID is required. Please login again.'
      });
    }

    let query = { internId };

    // Filter by month and year if provided
    if (month && year) {
      const startDate = `${year}-${month.padStart(2, '0')}-01`;
      const endDate = `${year}-${month.padStart(2, '0')}-31`;
      query.date = { $gte: startDate, $lte: endDate };
    }

    const attendanceRecords = await Attendance.find(query)
      .sort({ date: -1 })
      .limit(parseInt(limit));

    // Calculate statistics
    const totalDays = attendanceRecords.length;
    const presentDays = attendanceRecords.filter(a => a.status !== 'absent').length;
    const lateDays = attendanceRecords.filter(a => a.isLate).length;
    const onTimeDays = presentDays - lateDays;
    const avgWorkHours = presentDays > 0 
      ? (attendanceRecords.reduce((sum, a) => sum + a.totalWorkMinutes, 0) / presentDays / 60).toFixed(1)
      : 0;

    res.status(200).json({
      success: true,
      count: attendanceRecords.length,
      statistics: {
        totalDays,
        presentDays,
        lateDays,
        onTimeDays,
        avgWorkHours
      },
      data: attendanceRecords
    });
  } catch (error) {
    console.error('Get attendance history error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Get today's attendance status
// @route   GET /api/attendance/today
// @access  Private (Intern)
export const getTodayAttendance = async (req, res) => {
  try {
    const internId = await getInternId(req);
    const todayDate = getTodayDate();

    if (!internId) {
      return res.status(400).json({
        success: false,
        message: 'Intern ID is required. Please login again.'
      });
    }

    const attendance = await Attendance.findOne({
      internId,
      date: todayDate
    });

    if (!attendance) {
      return res.status(200).json({
        success: true,
        message: 'No attendance record for today',
        data: null
      });
    }

    res.status(200).json({
      success: true,
      data: attendance
    });
  } catch (error) {
    console.error('Get today attendance error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Record tab/panel closed event
// @route   POST /api/attendance/tab/closed
// @access  Private (Intern)
export const recordTabClosed = async (req, res) => {
  try {
    const internId = await getInternId(req);
    const todayDate = getTodayDate();
    const timestamp = new Date();

    if (!internId) {
      return res.status(400).json({
        success: false,
        message: 'Intern ID is required. Please login again.'
      });
    }

    // Find today's attendance
    const attendance = await Attendance.findOne({
      internId,
      date: todayDate
    });

    if (!attendance) {
      return res.status(404).json({
        success: false,
        message: 'No attendance record found'
      });
    }

    // Check if session already ended
    if (attendance.workSessionEnded) {
      return res.status(400).json({
        success: false,
        message: 'Work session has already ended',
        sessionEnded: true
      });
    }

    // End work session immediately when tab is closed
    attendance.tabClosedEvents.push({
      timestamp
    });
    attendance.tabClosedCount += 1;
    attendance.workSessionEnded = true;
    attendance.workSessionEndReason = 'tab-closed';
    attendance.workSessionEndTime = timestamp;
    attendance.status = 'session-ended';
    
    // Calculate work done so far
    if (attendance.loginTime) {
      const totalMinutes = calculateDurationMinutes(attendance.loginTime, timestamp);
      attendance.totalWorkMinutes = Math.max(0, totalMinutes - attendance.totalBreakTime);
      attendance.actualWorkHours = parseFloat((attendance.totalWorkMinutes / 60).toFixed(2));
      
      // Calculate deficit from 7 hours
      const requiredHours = 7;
      attendance.workHoursDeficit = Math.max(0, requiredHours - attendance.actualWorkHours);
    }
    
    await attendance.save();

    res.status(200).json({
      success: true,
      message: 'Work session ended - Tab/panel was closed',
      sessionEnded: true,
      data: {
        workSessionEnded: true,
        reason: 'tab-closed',
        totalWorkHours: attendance.actualWorkHours,
        tabClosedCount: attendance.tabClosedCount
      }
    });
  } catch (error) {
    console.error('Record tab closed error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Check work session status
// @route   GET /api/attendance/session-status
// @access  Private (Intern)
export const checkSessionStatus = async (req, res) => {
  try {
    const internId = await getInternId(req);
    const todayDate = getTodayDate();

    if (!internId) {
      return res.status(400).json({
        success: false,
        message: 'Intern ID is required. Please login again.'
      });
    }

    const attendance = await Attendance.findOne({
      internId,
      date: todayDate
    });

    if (!attendance) {
      return res.status(200).json({
        success: true,
        sessionActive: false,
        message: 'No attendance record for today'
      });
    }

    res.status(200).json({
      success: true,
      sessionActive: !attendance.workSessionEnded,
      sessionEnded: attendance.workSessionEnded,
      sessionEndReason: attendance.workSessionEndReason,
      leftCount: attendance.leftCount,
      tabClosedCount: attendance.tabClosedCount,
      status: attendance.status
    });
  } catch (error) {
    console.error('Check session status error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

export default {
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
};
