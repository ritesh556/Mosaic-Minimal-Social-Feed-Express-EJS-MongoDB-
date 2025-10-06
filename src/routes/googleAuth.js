// src/routes/googleAuth.js
const router = require('express').Router();
const passport = require('../auth/passport');
const jwt = require('jsonwebtoken');
const { JWT_SECRET, COOKIE_NAME } = require('../config/env');

router.get(
  '/auth/google',
  (req, _res, next) => {
    // console.log('Hitting /auth/google with callback:', process.env.GOOGLE_CALLBACK_URL);
    next();
  },
  passport.authenticate('google', {
    scope: ['openid', 'profile', 'email'],
    prompt: 'select_account',
    callbackURL: process.env.GOOGLE_CALLBACK_URL, // force exact callback used
  })
);

router.get(
  '/auth/google/callback',
  passport.authenticate('google', { failureRedirect: '/login' }),
  async (req, res) => {
    const token = jwt.sign({ id: req.user._id }, JWT_SECRET, { expiresIn: '7d' });
    res.cookie(COOKIE_NAME, token, { httpOnly: true, sameSite: 'lax', maxAge: 7*24*60*60*1000 });
    req.session.regenerate(() => res.redirect('/dashboard'));
  }
);

module.exports = router;
