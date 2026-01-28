const jwt = require('jsonwebtoken');

const authMiddleware = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    return res.status(401).json({ 
      success: false,
      message: 'Unauthorized: No token provided' 
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // attach user info to request
    next(); // proceed to next middleware or route
  } catch (err) {
    console.error('Auth middleware error:', err.message);
    return res.status(403).json({ 
      success: false,
      message: 'Invalid or expired token' 
    });
  }
};

module.exports = authMiddleware;
