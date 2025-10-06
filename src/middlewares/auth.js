const jwt = require('jsonwebtoken');
const User = require('../models/user');
const { JWT_SECRET, COOKIE_NAME } = require('../config/env');




attachUser = async (req, _res, next) => {
  const token = req.cookies?.[COOKIE_NAME];
  if (!token) return next();

  try {
    const { id } = jwt.verify(token, process.env.JWT_SECRET );
    const u = await User.findById(id).select('username email role avatarUrl'); 
    if (u) {
      req.user = {
        _id: u._id.toString(),            
        username: u.username,
        email: u.email,
        role: u.role,
        avatarUrl: u.avatarUrl,
      };
    }
  } catch {}
  next();
};

function requireAuth(req, res, next) {
  if (!req.user) return res.redirect('/login');
  next();
}

module.exports = { attachUser, requireAuth };
