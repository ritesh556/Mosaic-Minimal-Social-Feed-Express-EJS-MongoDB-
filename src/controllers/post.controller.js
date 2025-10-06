const mongoose = require('mongoose');
const Post = require('../models/post');
const User = require('../models/user');
const Notification = require('../models/notification');

const isObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

exports.homeFeed = async (req, res) => {
  const posts = await Post.find({})
    .sort({ createdAt: -1 })
    .limit(50)
    .populate('userId', 'username email avatarUrl role')
    .populate('comments.userId', 'username email avatarUrl')
    .lean();

  const uid = req.user?._id?.toString();
  const shaped = posts.map(p => ({
    ...p,
    likesCount: (p.likes || []).length,
    likedByMe: uid ? (p.likes || []).some(id => String(id) === uid) : false,
  }));

  res.render('index', { posts: shaped });
};

exports.create = async (req, res) => {
  try {
    const { title, imageUrl } = req.body;
    let finalImageUrl = imageUrl?.trim();
    if (req.file) finalImageUrl = '/uploads/' + req.file.filename;
    if (!title?.trim() || !finalImageUrl) {
      return res.status(400).render('post_new', { error: 'Title and an image (file or URL) are required' });
    }

    const post = await Post.create({
      userId: req.user._id,
      title: title.trim(),
      imageUrl: finalImageUrl
    });

    // notify followers of author
    const author = await User.findById(req.user._id).select('followers').lean();
    const followerIds = author?.followers || [];
    if (followerIds.length) {
      await Notification.insertMany(
        followerIds.map(uid => ({ user: uid, type: 'new-post', from: req.user._id, post: post._id, seen: false }))
      );
    }
    res.redirect('/feed');
  } catch (e) {
    console.error(e);
    res.status(500).render('post_new', { error: 'Something went wrong while creating the post.' });
  }
};

exports.apiList = async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit)?.valueOf() || 50, 200);
  const posts = await Post.find({})
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate('comments.userId', 'username email avatarUrl')
    .lean();

  const uid = req.user?._id?.toString();
  const shaped = posts.map(p => ({
    ...p,
    likesCount: (p.likes || []).length,
    likedByMe: uid ? (p.likes || []).some(id => String(id) === uid) : false,
  }));
  res.json(shaped);
};

exports.like = async (req, res) => {
  try {
    await Post.updateOne(
      { _id: req.params.id, likes: { $ne: req.user._id } },
      { $addToSet: { likes: req.user._id } }
    );
    res.redirect(req.get('Referer') || '/posts/' + req.params.id);
  } catch (e) {
    console.error(e);
    res.status(500).send('Failed to like post');
  }
};

exports.unlike = async (req, res) => {
  try {
    await Post.updateOne(
      { _id: req.params.id, likes: req.user._id },
      { $pull: { likes: req.user._id } }
    );
    res.redirect(req.get('Referer') || '/posts/' + req.params.id);
  } catch (e) {
    console.error(e);
    res.status(500).send('Failed to unlike post');
  }
};

exports.destroy = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).send('Post not found');
    if (String(post.userId) !== String(req.user._id) && req.user.role !== 'admin') {
      return res.status(403).send('Forbidden');
    }
    await Post.findByIdAndDelete(req.params.id);
    res.redirect('/feed');
  } catch (e) {
    console.error(e);
    res.status(500).send('Error deleting post');
  }
};

exports.show = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isObjectId(id)) return res.status(404).send('Post not found');

    const p = await Post.findById(id)
      .populate('userId', 'username email avatarUrl role')
      .populate('comments.userId', 'username email avatarUrl')
      .lean();
    if (!p) return res.status(404).send('Post not found');

    const uid = req.user?._id?.toString();
    const likedByMe = uid ? (p.likes || []).some(x => String(x) === uid) : false;

    res.render('post_show', {
      user: req.user || null,
      post: { ...p, likesCount: (p.likes || []).length, likedByMe }
    });
  } catch (e) {
    console.error(e);
    res.status(500).send('Failed to load post');
  }
};

exports.latestThisWeek = async (req, res) => {
  try {
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const posts = await Post.find({ createdAt: { $gte: weekAgo } })
      .sort({ createdAt: -1 }).limit(100)
      .populate('userId', 'username email avatarUrl role')
      .populate('comments.userId', 'username email avatarUrl')
      .lean();

    const uid = req.user?._id?.toString();
    const shaped = posts.map(p => ({
      ...p,
      likesCount: (p.likes || []).length,
      likedByMe: uid ? (p.likes || []).some(id => String(id) === uid) : false,
    }));

    res.render('newpost', { user: req.user || null, posts: shaped, weekStartISO: weekAgo.toISOString() });
  } catch (e) {
    console.error(e);
    res.status(500).send('Failed to load this week’s posts');
  }
};

exports.addComment = async (req, res) => {
  try {
    const text = (req.body.text || '').trim();
    if (!text) return res.status(400).send('Comment cannot be empty');
    if (text.length > 300) return res.status(400).send('Comment too long');

    await Post.updateOne({ _id: req.params.id }, { $push: { comments: { userId: req.user._id, text } } });
    res.redirect('/feed#post-' + req.params.id);
  } catch (e) {
    console.error(e);
    res.status(500).send('Failed to add comment');
  }
};

exports.deleteComment = async (req, res) => {
  try {
    const post = await Post.findById(req.params.postId).lean();
    if (!post) return res.status(404).send('Post not found');

    const c = (post.comments || []).find(x => String(x._id) === String(req.params.commentId));
    if (!c) return res.status(404).send('Comment not found');

    const canDelete =
      String(c.userId) === String(req.user._id) ||
      String(post.userId) === String(req.user._id) ||
      req.user.role === 'admin';

    if (!canDelete) return res.status(403).send('Forbidden');

    await Post.updateOne({ _id: req.params.postId }, { $pull: { comments: { _id: req.params.commentId } } });
    res.redirect('/feed#post-' + req.params.postId);
  } catch (e) {
    console.error(e);
    res.status(500).send('Failed to delete comment');
  }
};
