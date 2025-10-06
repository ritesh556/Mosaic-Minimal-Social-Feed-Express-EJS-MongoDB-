const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const crypto = require('crypto');
const User = require('../models/user');
const { sendLoginOTP } = require('../utils/mailer');

const JWT_SECRET = process.env.JWT_SECRET || 'onepiece';
const COOKIE_OPTS = { httpOnly: true, sameSite: 'lax', maxAge: 7 * 24 * 60 * 60 * 1000 };
const PENDING_COOKIE_OPTS = { httpOnly: true, sameSite: 'lax', maxAge: 10 * 60 * 1000 }; // 10min

exports.loginPage = (req, res) => {
  if (req.user) return res.redirect('/dashboard');
  res.render('login');
};

// helper: generate 6-digit numeric code as string
function gen6() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

// Start login: check password, create OTP, email it, set 'pending' cookie, go to /verify
exports.loginSubmit = async (req, res) => {
  try {
    const email = (req.body.email || '').trim().toLowerCase();
    const password = req.body.password || '';

    // To avoid user-disclosure, you could use one generic error for both cases:
    const user = await User.findOne({ email });
    if (!user) return res.render('login', { error: 'Invalid credentials' });

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return res.render('login', { error: 'Invalid credentials' });

    // Generate OTP & pending token
    const code = gen6();
    const otpHash = await bcrypt.hash(code, 10);
    const expires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
    const pendingToken = crypto.randomBytes(16).toString('hex');

    // Save to user
    user.loginOtpHash = otpHash;
    user.loginOtpExpiresAt = expires;
    user.loginPendingToken = pendingToken;
    user.loginOtpAttempts = 0;
    await user.save();

    // Send email
    try {
      await sendLoginOTP(user.email, code);
    } catch (mailErr) {
      console.error('Mail send failed:', mailErr);
      return res.status(500).render('login', { error: 'Could not send verification email. Try again.' });
    }

    // Set pending cookie to tie this browser to the pending login
    res.cookie('pending', pendingToken, PENDING_COOKIE_OPTS);
    return res.redirect('/verify');
  } catch (err) {
    console.error(err);
    res.status(500).render('login', { error: 'Login failed' });
  }
};

exports.verifyPage = (req, res) => {
  // If already logged in, skip
  if (req.user) return res.redirect('/dashboard');
  // If no pending token, send to login
  if (!req.cookies?.pending) return res.redirect('/login');
  res.render('verify');
};

// Finish login: verify OTP, issue JWT
exports.verifySubmit = async (req, res) => {
  try {
    const pending = req.cookies?.pending;
    const code = (req.body.code || '').trim();

    if (!pending) return res.redirect('/login');
    if (!/^\d{6}$/.test(code)) {
      return res.status(400).render('verify', { error: 'Enter a valid 6-digit code' });
    }

    const user = await User.findOne({ loginPendingToken: pending });
    if (!user) {
      res.clearCookie('pending', { ...PENDING_COOKIE_OPTS, maxAge: 0 });
      return res.redirect('/login');
    }

    // guard: expiry & attempts
    const now = new Date();
    if (!user.loginOtpExpiresAt || user.loginOtpExpiresAt < now) {
      return res.status(400).render('verify', { error: 'Code expired. Click "Resend code".' });
    }
    if (user.loginOtpAttempts >= 5) {
      return res.status(429).render('verify', { error: 'Too many attempts. Click "Resend code".' });
    }

    const match = await bcrypt.compare(code, user.loginOtpHash || '');
    if (!match) {
      user.loginOtpAttempts = (user.loginOtpAttempts || 0) + 1;
      await user.save();
      return res.status(400).render('verify', { error: 'Incorrect code. Try again.' });
    }

    // success: clear OTP state, issue JWT
    user.loginOtpHash = undefined;
    user.loginOtpExpiresAt = undefined;
    user.loginPendingToken = undefined;
    user.loginOtpAttempts = 0;
    await user.save();

    res.clearCookie('pending', { ...PENDING_COOKIE_OPTS, maxAge: 0 });

    const token = jwt.sign({ id: user._id }, JWT_SECRET, { expiresIn: '7d' });
    res.cookie('token', token, COOKIE_OPTS);
    return res.redirect('/dashboard');
  } catch (err) {
    console.error(err);
    res.status(500).render('verify', { error: 'Verification failed' });
  }
};

// Resend OTP (rate limit this endpoint in production)
exports.resendOTP = async (req, res) => {
  try {
    const pending = req.cookies?.pending;
    if (!pending) return res.redirect('/login');

    const user = await User.findOne({ loginPendingToken: pending });
    if (!user) {
      res.clearCookie('pending', { ...PENDING_COOKIE_OPTS, maxAge: 0 });
      return res.redirect('/login');
    }

    // generate new code
    const code = gen6();
    user.loginOtpHash = await bcrypt.hash(code, 10);
    user.loginOtpExpiresAt = new Date(Date.now() + 10 * 60 * 1000);
    user.loginOtpAttempts = 0;
    await user.save();

    await sendLoginOTP(user.email, code);
    return res.render('verify', { error: 'A new code was sent to your email.' });
  } catch (err) {
    console.error(err);
    res.status(500).render('verify', { error: 'Could not resend code. Try again.' });
  }
};

exports.registerPage = (req, res) => {
  if (req.user) return res.redirect('/dashboard');
  res.render('register');
};

exports.registerSubmit = async (req, res) => {
  try {
    const email = (req.body.email || '').trim().toLowerCase();
    const username = (req.body.username || '').trim();
    const password = req.body.password || '';

    if (!email || !password) {
      return res.status(400).render('register', { error: 'Email and password are required.' });
    }

    // ✅ Allow only Google emails
    if (!email.endsWith('@gmail.com')) {
      return res.status(400).render('register', { error: 'Only Google email addresses (@gmail.com) are allowed.' });
    }

    const exists = await User.findOne({ email });
    if (exists) {
      return res.status(400).render('register', { error: 'Email is already registered.' });
    }

    const hash = await bcrypt.hash(password, 10);
    const user = await User.create({ email, username, password: hash });

    // Option B (recommended): require OTP at first login too — just redirect to /login
    res.redirect('/login');
  } catch (err) {
    console.error(err);
    res.status(500).render('register', { error: 'Registration failed' });
  }
};


exports.logout = (req, res) => {
  res.clearCookie('token', { ...COOKIE_OPTS, maxAge: 0 });
  res.clearCookie('pending', { ...PENDING_COOKIE_OPTS, maxAge: 0 });
  res.redirect('/login');
};
