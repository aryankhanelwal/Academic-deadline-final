// Authentication middleware
const User = require('../models/User');

const requireAuth = async (req, res, next) => {
  if (!req.session.userId) {
    return res.status(401).json({ message: 'Authentication required' });
  }

  try {
    const user = await User.findById(req.session.userId);
    if (!user) {
      return res.status(401).json({ message: 'User not found' });
    }
    req.user = user; // Attach user to request object
    next();
  } catch (err) {
    return res.status(500).json({ message: 'Server error' });
  }
};

module.exports = { requireAuth };
