// Get today's date in YYYY-MM-DD format
export const getTodayDate = () => {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Get current time in HH:MM format
export const getCurrentTime = () => {
  const now = new Date();
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
};

// Check if current time is late (after 10:00 AM)
export const isLateLogin = () => {
  const workStartTime = process.env.WORK_START_TIME || '10:00';
  const currentTime = getCurrentTime();
  return currentTime > workStartTime;
};

// Calculate minutes late
export const calculateLateMinutes = () => {
  const workStartTime = process.env.WORK_START_TIME || '10:00';
  const [startHour, startMin] = workStartTime.split(':').map(Number);
  
  const now = new Date();
  const startDate = new Date();
  startDate.setHours(startHour, startMin, 0, 0);
  
  if (now > startDate) {
    return Math.floor((now - startDate) / (1000 * 60));
  }
  return 0;
};

// Calculate duration between two dates in minutes
export const calculateDurationMinutes = (startTime, endTime) => {
  const start = new Date(startTime);
  const end = new Date(endTime);
  return Math.floor((end - start) / (1000 * 60));
};

// Format minutes to hours and minutes
export const formatMinutesToHours = (minutes) => {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return `${hours}h ${mins}m`;
};

// Get formatted date time
export const getFormattedDateTime = (date) => {
  const d = new Date(date);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const month = months[d.getMonth()];
  const day = d.getDate();
  const year = d.getFullYear();
  const hours = d.getHours() % 12 || 12;
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const ampm = d.getHours() >= 12 ? 'PM' : 'AM';
  return `${month} ${day}, ${year} ${hours}:${minutes} ${ampm}`;
};

// Get formatted time only
export const getFormattedTime = (date) => {
  const d = new Date(date);
  const hours = d.getHours() % 12 || 12;
  const minutes = String(d.getMinutes()).padStart(2, '0');
  const ampm = d.getHours() >= 12 ? 'PM' : 'AM';
  return `${hours}:${minutes} ${ampm}`;
};

// Check if break exceeded
export const isBreakExceeded = (duration) => {
  const maxBreakMinutes = parseInt(process.env.MAX_BREAK_MINUTES) || 60;
  return duration > maxBreakMinutes;
};

export default {
  getTodayDate,
  getCurrentTime,
  isLateLogin,
  calculateLateMinutes,
  calculateDurationMinutes,
  formatMinutesToHours,
  getFormattedDateTime,
  getFormattedTime,
  isBreakExceeded
};
