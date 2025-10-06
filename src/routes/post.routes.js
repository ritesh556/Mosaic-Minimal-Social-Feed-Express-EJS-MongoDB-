const router = require('express').Router();
const { requireAuth } = require('../middlewares/auth');
const upload = require('../config/multer');
const post = require('../controllers/post.controller');

// feeds
router.get('/', post.homeFeed);
router.get('/feed', post.homeFeed);
router.get('/posts/new', post.latestThisWeek);

// CRUD + actions
router.post('/posts', requireAuth, upload.single('image'), post.create);
router.get('/posts/:id', post.show);
router.post('/posts/:id/like', requireAuth, post.like);
router.post('/posts/:id/unlike', requireAuth, post.unlike);
router.post('/posts/:id/delete', requireAuth, post.destroy);

// comments
router.post('/posts/:id/comments', requireAuth, post.addComment);
router.post('/posts/:postId/comments/:commentId/delete', requireAuth, post.deleteComment);

// JSON
router.get('/api/posts', post.apiList);

module.exports = router;
