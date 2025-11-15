const express = require('express');
const router = express.Router();
const User = require('../models/User');
const LoginCode = require('../models/LoginCode');
const { sendLoginCode } = require('../utils/emailService');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

const JWT_SECRET = process.env.JWT_SECRET || crypto.randomBytes(64).toString('hex');
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d'; // Token expires in 7 days

// Generate a 6-digit code
const generateCode = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Check if email is registered
router.post('/check-email', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email || !email.includes('@')) {
      return res.status(400).json({ error: 'Valid email address is required' });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const user = await User.findOne({ email: normalizedEmail });

    res.json({
      isRegistered: !!user,
      email: normalizedEmail
    });
  } catch (error) {
    console.error('Error checking email:', error);
    res.status(500).json({ error: 'Failed to check email' });
  }
});

// Request a login code
router.post('/request-code', async (req, res) => {
  try {
    const { email, firstName, lastName } = req.body;

    if (!email || !email.includes('@')) {
      return res.status(400).json({ error: 'Valid email address is required' });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Check if user exists
    let user = await User.findOne({ email: normalizedEmail });

    // If user doesn't exist, we need firstName and lastName to register
    if (!user) {
      if (!firstName || !lastName) {
        return res.status(400).json({ 
          error: 'First name and last name are required for new users',
          requiresRegistration: true 
        });
      }

      // Create new user
      user = new User({
        email: normalizedEmail,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
      });
      await user.save();
    }

    // Invalidate any existing unused codes for this email
    await LoginCode.updateMany(
      { email: normalizedEmail, used: false },
      { used: true }
    );

    // Generate a new 6-digit code
    const code = generateCode();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes from now

    // Save the code to the database
    const loginCode = new LoginCode({
      email: normalizedEmail,
      code,
      expiresAt,
    });
    await loginCode.save();

    // Send the code via email
    const emailResult = await sendLoginCode(normalizedEmail, code);
    
    // If email service is not configured or failed, return code in response
    if (emailResult.devMode || !emailResult.success) {
      res.json({ 
        success: true, 
        message: emailResult.success 
          ? 'Login code generated (check server logs or console)' 
          : 'Login code generated (email failed - check server logs)',
        devCode: code // Always include code if email didn't work
      });
    } else {
      res.json({ 
        success: true, 
        message: 'Login code sent to your email'
      });
    }
  } catch (error) {
    console.error('Error requesting login code:', error);
    res.status(500).json({ error: 'Failed to send login code' });
  }
});

// Verify login code and authenticate
router.post('/verify-code', async (req, res) => {
  try {
    const { email, code } = req.body;

    if (!email || !email.includes('@')) {
      return res.status(400).json({ error: 'Valid email address is required' });
    }

    if (!code || code.length !== 6) {
      return res.status(400).json({ error: 'Valid 6-digit code is required' });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Find the code
    const loginCode = await LoginCode.findOne({
      email: normalizedEmail,
      code,
      used: false,
      expiresAt: { $gt: new Date() }, // Not expired
    });

    if (!loginCode) {
      return res.status(401).json({ error: 'Invalid or expired code' });
    }

    // Mark code as used
    loginCode.used = true;
    await loginCode.save();

    // User should already exist (created during request-code if new)
    const user = await User.findOne({ email: normalizedEmail });

    if (!user) {
      return res.status(404).json({ error: 'User not found. Please request a new code.' });
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Generate JWT token
    const token = jwt.sign(
      { 
        userId: user._id.toString(),
        email: user.email,
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    res.json({
      success: true,
      token,
      user: {
        id: user._id.toString(),
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
      },
    });
  } catch (error) {
    console.error('Error verifying login code:', error);
    res.status(500).json({ error: 'Failed to verify code' });
  }
});

// Middleware to verify JWT token
const verifyToken = (req, res, next) => {
  const token = req.headers.authorization?.replace('Bearer ', '') || 
                req.query.token || 
                req.body.token;

  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};

// Get current user info (protected route)
router.get('/me', verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      id: user._id.toString(),
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
    });
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

// Export the verifyToken middleware for use in other files
module.exports = { router, verifyToken, JWT_SECRET };

