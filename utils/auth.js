import jwt from 'jsonwebtoken';

// Generate JWT Token
export const generateToken = (id, role) => {
  return jwt.sign(
    { id, role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRE || '7d' }
  );
};

// Send token response with cookie
export const sendTokenResponse = (user, statusCode, res) => {
  // Create token payload with internId if user is an intern
  const tokenPayload = {
    id: user._id,
    role: user.role,
    ...(user.internId && { internId: user.internId }) // Include internId for interns
  };
  
  const token = jwt.sign(
    tokenPayload,
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRE || '7d' }
  );

  // Cookie options
  const cookieOptions = {
    expires: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days
    httpOnly: true, // Prevent XSS attacks
    secure: process.env.NODE_ENV === 'production', // Use HTTPS in production
    sameSite: 'lax', // CSRF protection
    path: '/'
  };

  // Set cookie
  res.cookie('token', token, cookieOptions);

  res.status(statusCode).json({
    success: true,
    token,
    user: {
      id: user._id,
      name: user.name,
      email: user.email,
      role: user.role,
      internId: user.internId || undefined
    }
  });
};
