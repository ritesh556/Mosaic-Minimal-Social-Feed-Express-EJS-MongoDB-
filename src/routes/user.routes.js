// Admin: send announcement to selected users

// src/routes/user.routes.js
const router = require('express').Router();
const { requireAuth } = require('../middlewares/auth');
const upload = require('../config/multer');
const user = require('../controllers/user.controller');

router.get('/dashboard', requireAuth, user.dashboard);
router.post('/me/avatar', requireAuth, upload.single('avatar'), user.updateAvatar);

router.get('/u/:id', requireAuth, user.profile);
router.get('/u/:id/followers', requireAuth, user.listFollowers);
router.get('/u/:id/following', requireAuth, user.listFollowing);


router.post('/u/:id/follow',   requireAuth, user.follow);
router.post('/u/:id/unfollow', requireAuth, user.unfollow);
// Admin: delete user
router.post('/admin/users/:id/delete', requireAuth, user.adminDeleteUser);



module.exports = router;

