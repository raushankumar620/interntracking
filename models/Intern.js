import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const internSchema = new mongoose.Schema({
  internId: {
    type: String,
    required: [true, 'Please provide intern ID'],
    unique: true,
    uppercase: true,
    trim: true
  },
  name: {
    type: String,
    required: [true, 'Please provide name'],
    trim: true
  },
  email: {
    type: String,
    required: [true, 'Please provide email'],
    unique: true,
    lowercase: true,
    match: [
      /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
      'Please provide a valid email'
    ]
  },
  password: {
    type: String,
    required: [true, 'Please provide password'],
    minlength: 6,
    select: false // Don't return password by default
  },
  role: {
    type: String,
    default: 'intern',
    enum: ['intern']
  },
  phone: {
    type: String,
    trim: true
  },
  internshipStartDate: {
    type: Date,
    required: true
  },
  internshipEndDate: {
    type: Date,
    required: true
  },
  department: {
    type: String,
    trim: true
  },
  profileImage: {
    type: String,
    default: ''
  },
  bio: {
    type: String,
    trim: true,
    maxlength: 500
  },
  socialLinks: {
    linkedin: {
      type: String,
      trim: true
    },
    github: {
      type: String,
      trim: true
    },
    twitter: {
      type: String,
      trim: true
    },
    portfolio: {
      type: String,
      trim: true
    }
  },
  isActive: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Hash password before saving
internSchema.pre('save', async function(next) {
  if (!this.isModified('password')) {
    next();
  }
  
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Method to compare password
internSchema.methods.matchPassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

const Intern = mongoose.model('Intern', internSchema);
export default Intern;
