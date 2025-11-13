import mongoose from 'mongoose';

const attendanceSchema = new mongoose.Schema({
  internId: {
    type: String,
    required: true,
    ref: 'Intern'
  },
  date: {
    type: String, // Format: YYYY-MM-DD
    required: true
  },
  loginTime: {
    type: Date,
    required: true
  },
  logoutTime: {
    type: Date,
    default: null
  },
  isLate: {
    type: Boolean,
    default: false
  },
  lateBy: {
    type: Number, // Minutes late
    default: 0
  },
  breaks: [{
    startTime: {
      type: Date,
      required: true
    },
    endTime: {
      type: Date,
      default: null
    },
    duration: {
      type: Number, // Minutes
      default: 0
    },
    isExceeded: {
      type: Boolean,
      default: false
    }
  }],
  totalBreakTime: {
    type: Number, // Total minutes on break
    default: 0
  },
  leftEvents: [{
    timestamp: {
      type: Date,
      required: true
    },
    returnTime: {
      type: Date,
      default: null
    },
    duration: {
      type: Number, // Seconds away from camera
      default: 0
    }
  }],
  leftCount: {
    type: Number,
    default: 0
  },
  totalWorkMinutes: {
    type: Number,
    default: 0
  },
  status: {
    type: String,
    enum: ['present', 'absent', 'on-break', 'logged-out', 'session-ended'],
    default: 'present'
  },
  remarks: {
    type: String,
    default: ''
  },
  workSessionEnded: {
    type: Boolean,
    default: false
  },
  workSessionEndReason: {
    type: String,
    enum: ['face-left-exceeded', 'tab-closed', 'manual-logout', null],
    default: null
  },
  workSessionEndTime: {
    type: Date,
    default: null
  },
  tabClosedCount: {
    type: Number,
    default: 0
  },
  tabClosedEvents: [{
    timestamp: {
      type: Date,
      required: true
    },
    duration: {
      type: Number, // Seconds tab was closed
      default: 0
    }
  }],
  actualWorkHours: {
    type: Number, // Actual hours worked (7 hours expected)
    default: 0
  },
  workHoursDeficit: {
    type: Number, // Hours less than 7
    default: 0
  }
}, {
  timestamps: true
});

// Index for faster queries
attendanceSchema.index({ internId: 1, date: 1 }, { unique: true });

// Calculate total work hours
attendanceSchema.methods.calculateWorkHours = function() {
  if (!this.logoutTime) return 0;
  
  const totalMinutes = Math.floor((this.logoutTime - this.loginTime) / (1000 * 60));
  const workMinutes = totalMinutes - this.totalBreakTime;
  return workMinutes;
};

// Format work hours as string
attendanceSchema.methods.getFormattedWorkHours = function() {
  const minutes = this.calculateWorkHours();
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours}h ${mins}m`;
};

const Attendance = mongoose.model('Attendance', attendanceSchema);
export default Attendance;
