// src/auth/passport.js
const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const User = require('../models/user');
const {
  GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET,
  GOOGLE_CALLBACK_URL,
} = require('../config/env');

passport.use(new GoogleStrategy(
  {
    clientID: GOOGLE_CLIENT_ID,
    clientSecret: GOOGLE_CLIENT_SECRET,
    callbackURL: GOOGLE_CALLBACK_URL,
  },
  async (_accessToken, _refreshToken, profile, done) => {
    try {
      const email = (profile.emails?.[0]?.value || '').toLowerCase();
      const googleId = profile.id;
      const avatarUrl = profile.photos?.[0]?.value;
      const displayName = profile.displayName || (email ? email.split('@')[0] : 'User');

      // 1) Try merge by email (preferred), else by googleId
      let user = email ? await User.findOne({ email }) : null;
      if (!user) user = await User.findOne({ googleId });

      if (!user) {
        // 2) CREATE new Google user (no password), role defaults to 'user'
        user = await User.create({
          email,                         
          username: displayName,         
          googleId,                      
          avatarUrl,                    
          role: 'user',                 
          // password: undefined,       
          // age: undefined              
        });
      } else {
        // 3) UPDATE linkage / avatar / name if needed
        let changed = false;
        if (!user.googleId) { user.googleId = googleId; changed = true; }
      if (!user.avatarUrl && avatarUrlFromGoogle) {
    user.avatarUrl = avatarUrlFromGoogle;
    changed = true;
  }
        if (displayName && user.username !== displayName) { user.username = displayName; changed = true; }
        if (!user.role) { user.role = 'user'; changed = true; }
        if (changed) await user.save();
      }

      return done(null, user);
    } catch (err) {
      return done(err);
    }
  }
));

// Required for the OAuth roundtrip with express-session
passport.serializeUser((user, done) => done(null, user._id.toString()));
passport.deserializeUser(async (id, done) => {
  try {
    const u = await User.findById(id).select('username email role avatarUrl');
    done(null, u);
  } catch (e) {
    done(e);
  }
});

module.exports = passport;
