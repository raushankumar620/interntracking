import Intern from '../models/Intern.js';
import Admin from '../models/Admin.js';
import { sendTokenResponse } from '../utils/auth.js';

// @desc    Login Intern
// @route   POST /api/auth/login
// @access  Public
export const internLogin = async (req, res) => {
  try {
    const { identifier, password } = req.body;

    // Validate input
    if (!identifier || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email/intern ID and password'
      });
    }

    // Find intern by email or internId
    const intern = await Intern.findOne({
      $or: [
        { email: identifier.toLowerCase() },
        { internId: identifier.toUpperCase() }
      ]
    }).select('+password');

    if (!intern) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Check if intern is active
    if (!intern.isActive) {
      return res.status(403).json({
        success: false,
        message: 'Your account has been deactivated. Please contact admin.'
      });
    }

    // Check password
    const isMatch = await intern.matchPassword(password);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Send token response
    sendTokenResponse(intern, 200, res);
  } catch (error) {
    console.error('Intern login error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during login',
      error: error.message
    });
  }
};

// @desc    Login Admin
// @route   POST /api/auth/admin/login
// @access  Public
export const adminLogin = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email and password'
      });
    }

    // Find admin
    const admin = await Admin.findOne({ email: email.toLowerCase() }).select('+password');

    if (!admin) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Check if admin is active
    if (!admin.isActive) {
      return res.status(403).json({
        success: false,
        message: 'Your account has been deactivated.'
      });
    }

    // Check password
    const isMatch = await admin.matchPassword(password);

    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }

    // Update last login
    admin.lastLogin = new Date();
    await admin.save();

    // Send token response
    sendTokenResponse(admin, 200, res);
  } catch (error) {
    console.error('Admin login error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during login',
      error: error.message
    });
  }
};

// @desc    Get current logged in user
// @route   GET /api/auth/me
// @access  Private
export const getMe = async (req, res) => {
  try {
    let user;
    
    if (req.user.role === 'admin' || req.user.role === 'super-admin') {
      user = await Admin.findById(req.user.id);
    } else {
      user = await Intern.findById(req.user.id);
    }

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    res.status(200).json({
      success: true,
      user
    });
  } catch (error) {
    console.error('Get me error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Update password
// @route   PUT /api/auth/password
// @access  Private
export const updatePassword = async (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Please provide current and new password'
      });
    }

    let user;
    if (req.user.role === 'admin' || req.user.role === 'super-admin') {
      user = await Admin.findById(req.user.id).select('+password');
    } else {
      user = await Intern.findById(req.user.id).select('+password');
    }

    // Check current password
    const isMatch = await user.matchPassword(currentPassword);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Current password is incorrect'
      });
    }

    // Update password
    user.password = newPassword;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Password updated successfully'
    });
  } catch (error) {
    console.error('Update password error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message
    });
  }
};

// @desc    Logout user / clear cookie
// @route   POST /api/auth/logout
// @access  Private
export const logout = async (req, res) => {
  try {
    // Clear cookie
    res.cookie('token', 'none', {
      expires: new Date(Date.now() + 10 * 1000), // 10 seconds
      httpOnly: true
    });

    res.status(200).json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during logout',
      error: error.message
    });
  }
};

// @desc    Update profile
// @route   PUT /api/auth/profile
// @access  Private
export const updateProfile = async (req, res) => {
  try {
    const { name, email, phone, bio, socialLinks, profileImage } = req.body;

    console.log('Update profile request received for user:', req.user.id);
    console.log('Profile image size:', profileImage ? `${profileImage.length} characters` : 'No image');

    let user;
    if (req.user.role === 'admin' || req.user.role === 'super-admin') {
      user = await Admin.findById(req.user.id);
    } else {
      user = await Intern.findById(req.user.id);
    }

    if (!user) {
      console.error('User not found:', req.user.id);
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Check if email is being changed and if it's already taken
    if (email && email.toLowerCase() !== user.email.toLowerCase()) {
      const Model = user.role === 'admin' || user.role === 'super-admin' ? Admin : Intern;
      const existingUser = await Model.findOne({ 
        email: email.toLowerCase(), 
        _id: { $ne: user._id } 
      });
      
      if (existingUser) {
        return res.status(400).json({
          success: false,
          message: 'Email is already in use'
        });
      }
    }

    // Validate base64 image if provided
    if (profileImage && profileImage.length > 0) {
      // Check if it's a valid base64 image
      if (!profileImage.startsWith('data:image/')) {
        return res.status(400).json({
          success: false,
          message: 'Invalid image format. Please upload a valid image.'
        });
      }

      // Check size (max 5MB base64 string)
      if (profileImage.length > 7000000) {
        return res.status(400).json({
          success: false,
          message: 'Image size is too large. Please upload an image smaller than 5MB.'
        });
      }
    }

    // Build update object with only provided fields
    const updateData = {};
    if (name) updateData.name = name;
    if (email) updateData.email = email.toLowerCase();
    if (phone !== undefined) updateData.phone = phone;
    if (bio !== undefined) updateData.bio = bio;
    if (profileImage !== undefined) updateData.profileImage = profileImage;
    if (socialLinks !== undefined) {
      updateData.socialLinks = {
        linkedin: socialLinks.linkedin || '',
        github: socialLinks.github || '',
        twitter: socialLinks.twitter || '',
        portfolio: socialLinks.portfolio || ''
      };
    }

    console.log('Updating user with data:', { ...updateData, profileImage: profileImage ? '[IMAGE DATA]' : 'none' });

    // Use findByIdAndUpdate to avoid triggering password hash on save
    const Model = user.role === 'admin' || user.role === 'super-admin' ? Admin : Intern;
    const updatedUser = await Model.findByIdAndUpdate(
      req.user.id,
      updateData,
      { 
        new: true, // Return updated document
        runValidators: true // Run schema validators
      }
    );

    console.log('Profile updated successfully for user:', req.user.id);

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      user: updatedUser
    });
  } catch (error) {
    console.error('Update profile error:', error);
    console.error('Error stack:', error.stack);
    
    // Handle validation errors
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        message: messages.join(', ')
      });
    }
    
    // Handle duplicate key errors
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      return res.status(400).json({
        success: false,
        message: `${field} is already in use`
      });
    }

    // Handle MongoDB document size error
    if (error.message && error.message.includes('too large')) {
      return res.status(400).json({
        success: false,
        message: 'Image is too large. Please upload a smaller image (max 2MB).'
      });
    }

    res.status(500).json({
      success: false,
      message: 'Failed to update profile. Please try again.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

export default {
  internLogin,
  adminLogin,
  getMe,
  updatePassword,
  logout,
  updateProfile
};
