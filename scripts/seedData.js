import dotenv from 'dotenv';
import mongoose from 'mongoose';
import Admin from '../models/Admin.js';
import Intern from '../models/Intern.js';
import Attendance from '../models/Attendance.js';

// Load environment variables
dotenv.config();

const seedDatabase = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log('✅ Connected to MongoDB');

    // Clear existing data
    await Admin.deleteMany({});
    await Intern.deleteMany({});
    await Attendance.deleteMany({});

    console.log('🗑️  Cleared existing data');

    // Create admin account
    const admin = await Admin.create({
      name: 'Admin User',
      email: 'admin@company.com',
      password: 'admin123', // Will be hashed automatically
      role: 'admin'
    });

    console.log('✅ Admin created:', admin.email);

    // Create sample interns
    const interns = await Intern.create([
      {
        internId: 'INT001',
        name: 'Shivam Singh',
        email: 'shivam@example.com',
        password: 'password123',
        phone: '+91 98765 43210',
        department: 'Development',
        internshipStartDate: new Date('2025-01-01'),
        internshipEndDate: new Date('2025-06-30')
      },
      {
        internId: 'INT002',
        name: 'Priya Sharma',
        email: 'priya@example.com',
        password: 'password123',
        phone: '+91 98765 43211',
        department: 'Design',
        internshipStartDate: new Date('2025-01-01'),
        internshipEndDate: new Date('2025-06-30')
      },
      {
        internId: 'INT003',
        name: 'Rahul Kumar',
        email: 'rahul@example.com',
        password: 'password123',
        phone: '+91 98765 43212',
        department: 'Development',
        internshipStartDate: new Date('2025-01-01'),
        internshipEndDate: new Date('2025-06-30')
      },
      {
        internId: 'INT004',
        name: 'Ananya Gupta',
        email: 'ananya@example.com',
        password: 'password123',
        phone: '+91 98765 43213',
        department: 'Marketing',
        internshipStartDate: new Date('2025-01-01'),
        internshipEndDate: new Date('2025-06-30')
      },
      {
        internId: 'INT005',
        name: 'Arjun Patel',
        email: 'arjun@example.com',
        password: 'password123',
        phone: '+91 98765 43214',
        department: 'Development',
        internshipStartDate: new Date('2025-01-01'),
        internshipEndDate: new Date('2025-06-30')
      }
    ]);

    console.log(`✅ Created ${interns.length} interns`);

    // Create sample attendance records for the past 5 days
    const attendanceRecords = [];
    const today = new Date();
    
    for (let i = 0; i < 5; i++) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      
      for (const intern of interns) {
        // Skip random days to simulate absences
        if (Math.random() > 0.9) continue;
        
        const loginTime = new Date(date);
        const isLate = Math.random() > 0.6;
        const lateMinutes = isLate ? Math.floor(Math.random() * 30) + 5 : 0;
        
        loginTime.setHours(10, lateMinutes, 0, 0);
        
        const logoutTime = new Date(loginTime);
        logoutTime.setHours(17, Math.floor(Math.random() * 15), 0, 0);
        
        const totalBreakTime = 55 + Math.floor(Math.random() * 15);
        const totalMinutes = Math.floor((logoutTime - loginTime) / (1000 * 60));
        const workMinutes = totalMinutes - totalBreakTime;
        
        attendanceRecords.push({
          internId: intern.internId,
          date: dateStr,
          loginTime,
          logoutTime,
          isLate,
          lateBy: lateMinutes,
          breaks: [{
            startTime: new Date(loginTime.getTime() + 3 * 60 * 60 * 1000),
            endTime: new Date(loginTime.getTime() + 3 * 60 * 60 * 1000 + totalBreakTime * 60 * 1000),
            duration: totalBreakTime,
            isExceeded: totalBreakTime > 60
          }],
          totalBreakTime,
          leftEvents: [],
          leftCount: Math.floor(Math.random() * 3),
          totalWorkMinutes: workMinutes,
          status: 'logged-out'
        });
      }
    }

    await Attendance.insertMany(attendanceRecords);
    console.log(`✅ Created ${attendanceRecords.length} attendance records`);

    console.log('\n═══════════════════════════════════════════════════════════');
    console.log('  🎉 Database seeded successfully!');
    console.log('═══════════════════════════════════════════════════════════');
    console.log('\n  📧 Admin Credentials:');
    console.log('     Email: admin@company.com');
    console.log('     Password: admin123');
    console.log('\n  📧 Sample Intern Credentials:');
    console.log('     Email: shivam@example.com (or any intern email)');
    console.log('     Password: password123');
    console.log('     Intern ID: INT001, INT002, INT003, etc.');
    console.log('═══════════════════════════════════════════════════════════\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    process.exit(1);
  }
};

seedDatabase();
