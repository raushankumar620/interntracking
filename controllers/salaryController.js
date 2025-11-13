import Attendance from '../models/Attendance.js';
import Intern from '../models/Intern.js';
import { getTodayDate } from '../utils/timeHelper.js';

// Salary Configuration
const SALARY_CONFIG = {
  BASE_STIPEND: 2000, // Base stipend per student
  MIN_STIPEND: 0,   // Minimum stipend (can go to 0 with deductions)
  
  // Work schedule
  REQUIRED_WORK_HOURS: 7, // 7 hours per day (10 AM - 5 PM, excluding 1hr lunch)
  WORK_START_TIME: 10, // 10 AM
  WORK_END_TIME: 17,   // 5 PM
  WORKING_DAYS_PER_WEEK: 6, // Monday to Saturday (Sunday off)
  ALLOWED_LEAVES_PER_MONTH: 3, // 3 paid leaves allowed per month
  LUNCH_TIME_ALLOWED: 60, // 1 hour lunch time (included, not deducted)
  
  // NEW DEDUCTION RULES
  LATE_DEDUCTION_PER_MINUTE: 10, // ₹10 per minute late (for 0-3 late days)
  LATE_DAYS_THRESHOLD_FOR_FLAT_PENALTY: 3, // If late MORE than 3 days, apply flat penalty
  LATE_FLAT_PENALTY_PER_DAY: 50, // ₹50 per day flat when late 4+ days (minutes ignored)
  
  ABSENT_DEDUCTION_PER_DAY: 100, // ₹100 per absent day (after 3 free leaves)
  
  // Face left - NO deduction, but working hours end if >10
  FACE_LEFT_DEDUCTION_PER_EVENT: 0, // No deduction for face left
  FACE_LEFT_WARNING_THRESHOLD: 5, // Warning after 5 face left events
  FACE_LEFT_SESSION_END_THRESHOLD: 10, // End session after 10 face left events
  
  // Work hours deficit - deduct proportional daily salary
  // If work < 7 hours, deduct (7 - actual_hours) / 7 * daily_salary
  // Daily salary = BASE_STIPEND / working_days
  
  // OLD RULES (removed/disabled)
  BREAK_EXCEEDED_DEDUCTION_PER_MINUTE: 0, // Removed - now lunch >1hr reduces working hours
  TAB_CLOSED_DEDUCTION_PER_EVENT: 0, // Removed
  SESSION_END_PENALTY: 0, // Removed
  
  // Performance thresholds
  EXCELLENT_ATTENDANCE_PERCENT: 95, // >= 95% on-time
  GOOD_ATTENDANCE_PERCENT: 85, // >= 85% on-time
  AVERAGE_ATTENDANCE_PERCENT: 70, // >= 70% on-time
  
  // Bonus for performance
  EXCELLENT_BONUS: 300,
  GOOD_BONUS: 150,
};

// Helper function to get internId
const getInternId = async (req) => {
  let internId = req.user.internId || req.body.internId;
  
  if (!internId && req.user.id) {
    const intern = await Intern.findById(req.user.id);
    if (intern) {
      internId = intern.internId;
    }
  }
  
  return internId;
};

// Helper function to count Sundays in a month
const countSundays = (year, month) => {
  const date = new Date(year, month - 1, 1);
  let sundays = 0;
  
  while (date.getMonth() === month - 1) {
    if (date.getDay() === 0) { // 0 = Sunday
      sundays++;
    }
    date.setDate(date.getDate() + 1);
  }
  
  return sundays;
};

// Helper function to check if a date is Sunday
const isSunday = (dateString) => {
  const date = new Date(dateString);
  return date.getDay() === 0;
};

// Calculate performance metrics
const calculatePerformanceMetrics = (attendanceRecords, year, month) => {
  if (attendanceRecords.length === 0) {
    return {
      totalDays: 0,
      workingDays: 0,
      sundays: 0,
      presentDays: 0,
      absentDays: 0,
      paidLeaves: 0,
      unpaidAbsences: 0,
      lateDays: 0,
      onTimeDays: 0,
      totalLateMinutes: 0,
      totalFaceLeftEvents: 0,
      totalBreakExceededMinutes: 0,
      totalTabClosedEvents: 0,
      sessionEndedDays: 0,
      totalWorkHoursDeficit: 0,
      averageWorkHours: 0,
      attendancePercentage: 0,
      punctualityPercentage: 0,
    };
  }

  // Count Sundays in the month
  const sundays = countSundays(year, month);
  
  // Get all dates in the month
  const daysInMonth = new Date(year, month, 0).getDate();
  const totalDays = daysInMonth;
  const workingDays = totalDays - sundays; // Exclude Sundays
  
  // Separate attendance by Sunday/weekday
  const weekdayRecords = attendanceRecords.filter(a => !isSunday(a.date));
  const presentDays = weekdayRecords.filter(a => a.status !== 'absent').length;
  
  // Calculate absences (only count weekdays, exclude Sundays)
  const absentDays = workingDays - presentDays;
  
  // First 3 absences are paid leaves, rest are unpaid
  const paidLeaves = Math.min(absentDays, SALARY_CONFIG.ALLOWED_LEAVES_PER_MONTH);
  const unpaidAbsences = Math.max(0, absentDays - SALARY_CONFIG.ALLOWED_LEAVES_PER_MONTH);
  
  const lateDays = weekdayRecords.filter(a => a.isLate).length;
  const onTimeDays = presentDays - lateDays;
  
  const totalLateMinutes = weekdayRecords.reduce((sum, a) => sum + (a.lateBy || 0), 0);
  const totalFaceLeftEvents = weekdayRecords.reduce((sum, a) => sum + (a.leftCount || 0), 0);
  const totalTabClosedEvents = weekdayRecords.reduce((sum, a) => sum + (a.tabClosedCount || 0), 0);
  const sessionEndedDays = weekdayRecords.filter(a => a.workSessionEnded).length;
  
  // Calculate break exceeded minutes
  let totalBreakExceededMinutes = 0;
  weekdayRecords.forEach(attendance => {
    if (attendance.breaks && attendance.breaks.length > 0) {
      attendance.breaks.forEach(breakItem => {
        if (breakItem.isExceeded && breakItem.duration > 60) {
          totalBreakExceededMinutes += (breakItem.duration - 60);
        }
      });
    }
  });

  // Calculate work hours deficit
  let totalWorkHoursDeficit = 0;
  weekdayRecords.forEach(attendance => {
    if (attendance.workHoursDeficit) {
      totalWorkHoursDeficit += attendance.workHoursDeficit;
    }
  });

  const attendancePercentage = workingDays > 0 ? (presentDays / workingDays) * 100 : 0;
  const punctualityPercentage = presentDays > 0 ? (onTimeDays / presentDays) * 100 : 0;
  
  const totalWorkMinutes = weekdayRecords.reduce((sum, a) => sum + (a.totalWorkMinutes || 0), 0);
  const averageWorkHours = presentDays > 0 ? (totalWorkMinutes / presentDays / 60).toFixed(2) : 0;

  return {
    totalDays,
    workingDays,
    sundays,
    presentDays,
    absentDays,
    paidLeaves,
    unpaidAbsences,
    lateDays,
    onTimeDays,
    totalLateMinutes,
    totalFaceLeftEvents,
    totalBreakExceededMinutes,
    totalTabClosedEvents,
    sessionEndedDays,
    totalWorkHoursDeficit,
    attendancePercentage: parseFloat(attendancePercentage.toFixed(2)),
    punctualityPercentage: parseFloat(punctualityPercentage.toFixed(2)),
    averageWorkHours: parseFloat(averageWorkHours),
  };
};

// Calculate salary based on performance
const calculateSalary = (metrics) => {
  let finalStipend = SALARY_CONFIG.BASE_STIPEND;
  const deductions = {
    lateDeduction: 0,
    absentDeduction: 0,
    faceLeftDeduction: 0,
    workHoursDeficitDeduction: 0,
    totalDeduction: 0,
    
    // Details for display
    lateDetails: '',
    absentDetails: '',
    faceLeftDetails: '',
    workHoursDetails: '',
  };

  // Calculate daily salary rate (for work hours deficit calculation)
  const dailySalaryRate = metrics.workingDays > 0 ? SALARY_CONFIG.BASE_STIPEND / metrics.workingDays : 0;

  // ===== RULE 1: LATE PENALTY =====
  // 0-3 days late: ₹10 per minute
  // 4+ days late: ₹50 per day (minutes ignored)
  if (metrics.lateDays > SALARY_CONFIG.LATE_DAYS_THRESHOLD_FOR_FLAT_PENALTY) {
    // Late 4+ days: Flat ₹50 per late day
    deductions.lateDeduction = metrics.lateDays * SALARY_CONFIG.LATE_FLAT_PENALTY_PER_DAY;
    deductions.lateDetails = `Late ${metrics.lateDays} days (>3 days): ₹${SALARY_CONFIG.LATE_FLAT_PENALTY_PER_DAY}/day flat penalty`;
  } else {
    // Late 0-3 days: ₹10 per minute
    deductions.lateDeduction = metrics.totalLateMinutes * SALARY_CONFIG.LATE_DEDUCTION_PER_MINUTE;
    deductions.lateDetails = `Late ${metrics.lateDays} days (≤3 days): ${metrics.totalLateMinutes} min × ₹${SALARY_CONFIG.LATE_DEDUCTION_PER_MINUTE}/min`;
  }
  
  // ===== RULE 2: ABSENT PENALTY =====
  // First 3 absences free, then ₹100 per day
  deductions.absentDeduction = metrics.unpaidAbsences * SALARY_CONFIG.ABSENT_DEDUCTION_PER_DAY;
  deductions.absentDetails = `${metrics.absentDays} total absences: ${metrics.paidLeaves} free + ${metrics.unpaidAbsences} × ₹${SALARY_CONFIG.ABSENT_DEDUCTION_PER_DAY}`;
  
  // ===== RULE 3: FACE LEFT PENALTY =====
  // No deduction if ≤10 times
  // If >10 times, session ends (work hours affected automatically)
  deductions.faceLeftDeduction = 0; // No direct deduction
  if (metrics.totalFaceLeftEvents > SALARY_CONFIG.FACE_LEFT_SESSION_END_THRESHOLD) {
    deductions.faceLeftDetails = `${metrics.totalFaceLeftEvents} face-left events (>10): Session ended (affects work hours)`;
  } else {
    deductions.faceLeftDetails = `${metrics.totalFaceLeftEvents} face-left events (≤10): No deduction`;
  }
  
  // ===== RULE 4: WORK HOURS DEFICIT PENALTY =====
  // If worked < 7 hours: Deduct proportional daily salary
  // Formula: (deficit_hours / 7) × daily_salary × days_with_deficit
  // Note: Lunch time >1 hour reduces working hours
  if (metrics.totalWorkHoursDeficit > 0) {
    // Calculate deduction based on proportional daily salary
    deductions.workHoursDeficitDeduction = Math.round(
      (metrics.totalWorkHoursDeficit / SALARY_CONFIG.REQUIRED_WORK_HOURS) * dailySalaryRate * metrics.presentDays
    );
    deductions.workHoursDetails = `${metrics.totalWorkHoursDeficit.toFixed(2)}h deficit: Proportional deduction from daily rate ₹${dailySalaryRate.toFixed(2)}`;
  } else {
    deductions.workHoursDetails = `No work hours deficit`;
  }
  
  // Calculate total deduction
  deductions.totalDeduction = 
    deductions.lateDeduction + 
    deductions.absentDeduction + 
    deductions.faceLeftDeduction + 
    deductions.workHoursDeficitDeduction;

  // Apply deductions
  finalStipend -= deductions.totalDeduction;

  // Apply performance bonus
  let performanceBonus = 0;
  let performanceGrade = 'Poor';
  
  if (metrics.punctualityPercentage >= SALARY_CONFIG.EXCELLENT_ATTENDANCE_PERCENT) {
    performanceBonus = SALARY_CONFIG.EXCELLENT_BONUS;
    performanceGrade = 'Excellent';
  } else if (metrics.punctualityPercentage >= SALARY_CONFIG.GOOD_ATTENDANCE_PERCENT) {
    performanceBonus = SALARY_CONFIG.GOOD_BONUS;
    performanceGrade = 'Good';
  } else if (metrics.punctualityPercentage >= SALARY_CONFIG.AVERAGE_ATTENDANCE_PERCENT) {
    performanceGrade = 'Average';
  }

  finalStipend += performanceBonus;

  // Ensure stipend doesn't go below 0
  finalStipend = Math.max(SALARY_CONFIG.MIN_STIPEND, finalStipend);

  return {
    baseStipend: SALARY_CONFIG.BASE_STIPEND,
    dailySalaryRate: Math.round(dailySalaryRate),
    deductions,
    performanceBonus,
    performanceGrade,
    finalStipend: Math.round(finalStipend),
  };
};

// @desc    Get salary calculation for current month
// @route   GET /api/salary/current
// @access  Private (Intern)
export const getCurrentMonthSalary = async (req, res) => {
  try {
    const internId = await getInternId(req);
    
    if (!internId) {
      return res.status(400).json({
        success: false,
        message: 'Intern ID is required. Please login again.'
      });
    }

    // Get current month attendance
    const now = new Date();
    const year = now.getFullYear();
    const month = (now.getMonth() + 1).toString().padStart(2, '0');
    
    const startDate = `${year}-${month}-01`;
    const lastDay = new Date(year, now.getMonth() + 1, 0).getDate();
    const endDate = `${year}-${month}-${lastDay}`;

    const attendanceRecords = await Attendance.find({
      internId,
      date: { $gte: startDate, $lte: endDate }
    }).sort({ date: -1 });

    // Calculate metrics (pass year and month for Sunday calculation)
    const metrics = calculatePerformanceMetrics(attendanceRecords, year, parseInt(month));
    
    // Calculate salary
    const salaryInfo = calculateSalary(metrics);

    // Get intern details
    const intern = await Intern.findOne({ internId });

    res.status(200).json({
      success: true,
      data: {
        month: `${year}-${month}`,
        monthName: now.toLocaleString('default', { month: 'long', year: 'numeric' }),
        internDetails: {
          name: intern?.name,
          internId: intern?.internId,
          department: intern?.department,
        },
        metrics,
        salary: salaryInfo,
        attendanceRecords: attendanceRecords.slice(0, 10), // Latest 10 records
      }
    });
  } catch (error) {
    console.error('Get current month salary error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while calculating salary',
      error: error.message
    });
  }
};

// @desc    Get salary calculation for specific month
// @route   GET /api/salary/month/:year/:month
// @access  Private (Intern)
export const getMonthSalary = async (req, res) => {
  try {
    const internId = await getInternId(req);
    const { year, month } = req.params;
    
    if (!internId) {
      return res.status(400).json({
        success: false,
        message: 'Intern ID is required. Please login again.'
      });
    }

    if (!year || !month) {
      return res.status(400).json({
        success: false,
        message: 'Year and month are required'
      });
    }

    const startDate = `${year}-${month.padStart(2, '0')}-01`;
    const lastDay = new Date(parseInt(year), parseInt(month), 0).getDate();
    const endDate = `${year}-${month.padStart(2, '0')}-${lastDay}`;

    const attendanceRecords = await Attendance.find({
      internId,
      date: { $gte: startDate, $lte: endDate }
    }).sort({ date: -1 });

    const metrics = calculatePerformanceMetrics(attendanceRecords, parseInt(year), parseInt(month));
    const salaryInfo = calculateSalary(metrics);

    const intern = await Intern.findOne({ internId });
    const monthDate = new Date(parseInt(year), parseInt(month) - 1, 1);

    res.status(200).json({
      success: true,
      data: {
        month: `${year}-${month}`,
        monthName: monthDate.toLocaleString('default', { month: 'long', year: 'numeric' }),
        internDetails: {
          name: intern?.name,
          internId: intern?.internId,
          department: intern?.department,
        },
        metrics,
        salary: salaryInfo,
        attendanceRecords: attendanceRecords.slice(0, 10),
      }
    });
  } catch (error) {
    console.error('Get month salary error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while calculating salary',
      error: error.message
    });
  }
};

// @desc    Get salary history (all months)
// @route   GET /api/salary/history
// @access  Private (Intern)
export const getSalaryHistory = async (req, res) => {
  try {
    const internId = await getInternId(req);
    
    if (!internId) {
      return res.status(400).json({
        success: false,
        message: 'Intern ID is required. Please login again.'
      });
    }

    // Get all attendance records
    const attendanceRecords = await Attendance.find({ internId }).sort({ date: -1 });

    // Group by month
    const monthlyData = {};
    
    attendanceRecords.forEach(record => {
      const monthKey = record.date.substring(0, 7); // YYYY-MM
      if (!monthlyData[monthKey]) {
        monthlyData[monthKey] = [];
      }
      monthlyData[monthKey].push(record);
    });

    // Calculate for each month
    const salaryHistory = Object.keys(monthlyData).map(monthKey => {
      const records = monthlyData[monthKey];
      const [year, month] = monthKey.split('-');
      const metrics = calculatePerformanceMetrics(records, parseInt(year), parseInt(month));
      const salaryInfo = calculateSalary(metrics);
      
      const monthDate = new Date(parseInt(year), parseInt(month) - 1, 1);

      return {
        month: monthKey,
        monthName: monthDate.toLocaleString('default', { month: 'long', year: 'numeric' }),
        metrics,
        salary: salaryInfo,
      };
    }).sort((a, b) => b.month.localeCompare(a.month));

    res.status(200).json({
      success: true,
      count: salaryHistory.length,
      data: salaryHistory
    });
  } catch (error) {
    console.error('Get salary history error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching salary history',
      error: error.message
    });
  }
};

export default {
  getCurrentMonthSalary,
  getMonthSalary,
  getSalaryHistory,
};
