const jwt = require('jsonwebtoken');
require('dotenv').config();

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '1d';

class AuthController {
  async register(req, res) {
    const { userId, email, role } = req.body;
    
    if (!userId || !email) {
      return res.status(400).json({
        success: false,
        message: 'userId and email are required'
      });
    }

    // In a real app, you would save the user to a database here
    const user = {
      id: userId,
      userId,
      email,
      role: role || 'user'
    };

    // Generate JWT
    const token = jwt.sign(user, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      data: {
        user,
        token
      }
    });
  }

  async login(req, res) {
    const { userId, email } = req.body;
    
    if (!userId || !email) {
      return res.status(400).json({
        success: false,
        message: 'userId and email are required'
      });
    }

    // In a real app, you would verify credentials against a database
    const user = {
      id: userId,
      userId,
      email,
      role: 'user' // Default role
    };

    // Generate JWT
    const token = jwt.sign(user, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        user,
        token
      }
    });
  }

  async getCurrentUser(req, res) {
    // User data is available from the auth middleware
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Not authenticated'
      });
    }

    res.status(200).json({
      success: true,
      data: {
        user: req.user
      }
    });
  }
}

module.exports = new AuthController();
