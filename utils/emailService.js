import nodemailer from 'nodemailer';

// Create reusable transporter
const createTransporter = () => {
  return nodemailer.createTransport({
    service: 'gmail',
    host: process.env.EMAIL_HOST,
    port: parseInt(process.env.EMAIL_PORT),
    secure: false, // true for 465, false for other ports
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD,
    },
    tls: {
      rejectUnauthorized: false
    }
  });
};

// Send late login email
export const sendLateLoginEmail = async (internEmail, internName, lateBy, loginTime) => {
  try {
    const transporter = createTransporter();

    const mailOptions = {
      from: process.env.EMAIL_FROM,
      to: internEmail,
      subject: '⚠️ Late Login Alert - Intern Tracking System',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .alert-box { background: #fee; border-left: 4px solid #f44; padding: 15px; margin: 20px 0; border-radius: 5px; }
            .info { background: #fff; padding: 15px; margin: 15px 0; border-radius: 5px; border: 1px solid #ddd; }
            .footer { text-align: center; padding: 20px; color: #777; font-size: 12px; }
            .button { display: inline-block; padding: 12px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; margin: 10px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>🔔 Late Login Alert</h1>
            </div>
            <div class="content">
              <p>Dear <strong>${internName}</strong>,</p>
              
              <div class="alert-box">
                <h3 style="margin-top: 0; color: #d32f2f;">⚠️ You logged in late today</h3>
                <p><strong>Login Time:</strong> ${loginTime}</p>
                <p><strong>Expected Time:</strong> 10:00 AM</p>
                <p><strong>Late By:</strong> ${lateBy} minutes</p>
              </div>
              
              <div class="info">
                <h4>⏰ Reminder:</h4>
                <ul>
                  <li>Working hours: 10:00 AM - 5:00 PM</li>
                  <li>Please ensure punctuality to maintain your attendance record</li>
                  <li>Repeated late logins may affect your internship evaluation</li>
                </ul>
              </div>
              
              <p>Please make sure to log in on time from tomorrow onwards.</p>
              
              <p>If you have any concerns or issues, please contact your supervisor immediately.</p>
              
              <p>Best regards,<br><strong>Intern Tracking System</strong></p>
            </div>
            <div class="footer">
              <p>This is an automated email. Please do not reply to this message.</p>
              <p>&copy; 2025 Intern Tracking System. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `
    };

    await transporter.sendMail(mailOptions);
    console.log(`✅ Late login email sent to ${internEmail}`);
    return true;
  } catch (error) {
    console.error(`❌ Error sending late login email: ${error.message}`);
    return false;
  }
};

// Send break exceeded email
export const sendBreakExceededEmail = async (internEmail, internName, breakDuration) => {
  try {
    const transporter = createTransporter();

    const mailOptions = {
      from: process.env.EMAIL_FROM,
      to: internEmail,
      subject: '⚠️ Break Duration Exceeded - Intern Tracking System',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .alert-box { background: #fff3e0; border-left: 4px solid #ff9800; padding: 15px; margin: 20px 0; border-radius: 5px; }
            .footer { text-align: center; padding: 20px; color: #777; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>☕ Break Duration Alert</h1>
            </div>
            <div class="content">
              <p>Dear <strong>${internName}</strong>,</p>
              
              <div class="alert-box">
                <h3 style="margin-top: 0; color: #ff9800;">⚠️ Your break exceeded the allowed time</h3>
                <p><strong>Break Duration:</strong> ${breakDuration} minutes</p>
                <p><strong>Allowed Duration:</strong> 60 minutes (1 hour)</p>
                <p><strong>Exceeded By:</strong> ${breakDuration - 60} minutes</p>
              </div>
              
              <p>Please ensure to complete your breaks within the allocated time to maintain productivity.</p>
              
              <p>Best regards,<br><strong>Intern Tracking System</strong></p>
            </div>
            <div class="footer">
              <p>This is an automated email. Please do not reply to this message.</p>
            </div>
          </div>
        </body>
        </html>
      `
    };

    await transporter.sendMail(mailOptions);
    console.log(`✅ Break exceeded email sent to ${internEmail}`);
    return true;
  } catch (error) {
    console.error(`❌ Error sending break exceeded email: ${error.message}`);
    return false;
  }
};

// Send daily summary email to admin
export const sendDailySummaryEmail = async (adminEmail, summaryData) => {
  try {
    const transporter = createTransporter();

    const mailOptions = {
      from: process.env.EMAIL_FROM,
      to: adminEmail,
      subject: `📊 Daily Attendance Summary - ${summaryData.date}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 700px; margin: 0 auto; padding: 20px; }
            .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 20px; text-align: center; border-radius: 10px 10px 0 0; }
            .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
            .stats { display: flex; justify-content: space-around; margin: 20px 0; }
            .stat-box { background: white; padding: 20px; border-radius: 10px; text-align: center; flex: 1; margin: 0 10px; box-shadow: 0 2px 5px rgba(0,0,0,0.1); }
            .stat-value { font-size: 32px; font-weight: bold; color: #667eea; }
            .stat-label { color: #777; margin-top: 5px; }
            .table { width: 100%; border-collapse: collapse; margin: 20px 0; background: white; }
            .table th { background: #667eea; color: white; padding: 12px; text-align: left; }
            .table td { padding: 10px; border-bottom: 1px solid #ddd; }
            .footer { text-align: center; padding: 20px; color: #777; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>📊 Daily Attendance Summary</h1>
              <p style="margin: 0; opacity: 0.9;">${summaryData.date}</p>
            </div>
            <div class="content">
              <h2>Overview Statistics</h2>
              <div class="stats">
                <div class="stat-box">
                  <div class="stat-value">${summaryData.totalPresent}</div>
                  <div class="stat-label">Present</div>
                </div>
                <div class="stat-box">
                  <div class="stat-value" style="color: #f44336;">${summaryData.totalLate}</div>
                  <div class="stat-label">Late</div>
                </div>
                <div class="stat-box">
                  <div class="stat-value" style="color: #ff9800;">${summaryData.totalAbsent}</div>
                  <div class="stat-label">Absent</div>
                </div>
                <div class="stat-box">
                  <div class="stat-value" style="color: #4caf50;">${summaryData.leftEvents}</div>
                  <div class="stat-label">Left Events</div>
                </div>
              </div>
              
              <h3>⚠️ Late Interns</h3>
              ${summaryData.lateInterns && summaryData.lateInterns.length > 0 ? `
                <table class="table">
                  <thead>
                    <tr>
                      <th>Intern ID</th>
                      <th>Name</th>
                      <th>Login Time</th>
                      <th>Late By</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${summaryData.lateInterns.map(intern => `
                      <tr>
                        <td>${intern.internId}</td>
                        <td>${intern.name}</td>
                        <td>${intern.loginTime}</td>
                        <td>${intern.lateBy} min</td>
                      </tr>
                    `).join('')}
                  </tbody>
                </table>
              ` : '<p>No late interns today! 🎉</p>'}
              
              <p style="margin-top: 30px;">For detailed reports, please visit the admin dashboard.</p>
              
              <p>Best regards,<br><strong>Intern Tracking System</strong></p>
            </div>
            <div class="footer">
              <p>This is an automated daily summary email.</p>
              <p>&copy; 2025 Intern Tracking System. All rights reserved.</p>
            </div>
          </div>
        </body>
        </html>
      `
    };

    await transporter.sendMail(mailOptions);
    console.log(`✅ Daily summary email sent to ${adminEmail}`);
    return true;
  } catch (error) {
    console.error(`❌ Error sending daily summary email: ${error.message}`);
    return false;
  }
};

export default {
  sendLateLoginEmail,
  sendBreakExceededEmail,
  sendDailySummaryEmail
};
