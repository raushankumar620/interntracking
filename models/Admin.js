import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const adminSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please provide admin name'],
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
    select: false
  },
  role: {
    type: String,
    default: 'admin',
    enum: ['admin', 'super-admin']
  },
  phone: {
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
  lastLogin: {
    type: Date
  }
}, {
  timestamps: true
});

// Hash password before saving
adminSchema.pre('save', async function(next) {
  if (!this.isModified('password')) {
    next();
  }
  
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Method to compare password
adminSchema.methods.matchPassword = async function(enteredPassword) {
  return await bcrypt.compare(enteredPassword, this.password);
};

const Admin = mongoose.model('Admin', adminSchema);
export default Admin;
