const jwt = require('jsonwebtoken');

const authMiddleware = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) return res.status(401).json({ message: 'Unauthorized: No token provided' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // attach user info to request
    next(); // proceed to next middleware or route
  } catch (err) {
    res.status(403).json({ message: 'Invalid token' });
  }
};

module.exports = authMiddleware;
