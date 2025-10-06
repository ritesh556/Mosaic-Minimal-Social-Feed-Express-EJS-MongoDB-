// src/routes/notification.routes.js
const router = require('express').Router();
const { attachUser, requireAuth } = require('../middlewares/auth');
const notif = require('../controllers/notification.controller');

router.use(attachUser); 

router.get('/api/notifications/unseen-count', requireAuth, notif.unseenCount);
router.get('/notifications', requireAuth, notif.list);
router.post('/notifications/:id/read', requireAuth, notif.markOne);
router.post('/notifications/read-all', requireAuth, notif.markAll);

module.exports = router;
