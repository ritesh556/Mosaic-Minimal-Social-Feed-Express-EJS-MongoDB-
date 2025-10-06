// src/routes/index.js
const express = require('express');
const router = express.Router();

const { attachUser } = require('../middlewares/auth');

// attach req.user + expose to views
router.use(
  attachUser,
  (req, res, next) => { res.locals.user = req.user || null; next(); }
);


router.use('/', require('./auth.routes'));
router.use('/', require('./post.routes'));
router.use('/', require('./user.routes'));
router.use('/', require('./chat.routes'));
router.use('/', require('./notification.routes'));



module.exports = router;
