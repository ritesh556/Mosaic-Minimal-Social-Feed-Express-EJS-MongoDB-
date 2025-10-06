const path = require('path');
const express = require('express');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const security = require('./config/security');
const { NODE_ENV } = require('./config/env');
const routes = require('./routes');

const passport = require('./auth/passport');          // same configured instance
const { attachUser } = require('./middlewares/auth');
const googleAuthRoutes = require('./routes/googleAuth');

const app = express();



app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

security(app);

app.use(session({
  secret: process.env.SESSION_SECRET || 'oauth-bridge',
  resave: false,
  saveUninitialized: false,
  cookie: {
    sameSite: 'lax',
    httpOnly: true,
    maxAge: 10 * 60 * 1000,
    // secure: NODE_ENV === 'production',
  },
}));

app.use(passport.initialize());
app.use(passport.session());

app.use(attachUser);

// static
app.use('/uploads',
  express.static(path.join(__dirname, 'public', 'uploads'), { maxAge: '30d', etag: true })
);
app.use(express.static(path.join(__dirname, 'public'), { maxAge: NODE_ENV === 'production' ? '7d' : 0 }));

// mount google auth first or anywhere before 404
app.use(googleAuthRoutes);

// your normal routes
app.use(routes);

module.exports = app;
