const r = require('express').Router();
const { requireAuth } = require('../middlewares/auth');
const chat = require('../controllers/chat.controller');

r.get('/chats', requireAuth, chat.list);
r.post('/chats/:userId/start', requireAuth, chat.start);
r.get('/chats/:userId', requireAuth, chat.thread);
r.post('/chats/:userId/messages', requireAuth, chat.send);

module.exports = r;
