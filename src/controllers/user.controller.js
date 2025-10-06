

const mongoose = require('mongoose');
const User = require('../models/user');
const Post = require('../models/post');
const Notification = require('../models/notification');
// Admin: delete user
exports.adminDeleteUser = async (req, res) => {
  try {
    // Only allow admins
    if (!req.user || String(req.user.role).toLowerCase() !== 'admin') {
      return res.status(403).send('Forbidden');
    }
    const { id } = req.params;
    if (!isObjectId(id)) return res.status(404).send('User not found');
    if (String(id) === String(req.user._id)) {
      return res.status(400).send('You cannot delete yourself.');
    }
    // Delete user, their posts, and notifications
    await Promise.all([
      User.deleteOne({ _id: id }),
      Post.deleteMany({ userId: id }),
      Notification.deleteMany({ user: id })
    ]);
    res.redirect('/dashboard');
  } catch (e) {
    console.error(e);
    res.status(500).send('Failed to delete user');
  }
};


const wantsJSON = (req) =>
  (req.get('X-Requested-With') || '').toLowerCase() === 'fetch' ||
  (req.headers.accept || '').includes('application/json');

const isObjectId = (id) => mongoose.Types.ObjectId.isValid(id);
exports.dashboard = async (req, res) => {
  try {
    const myPosts = await Post.find({ userId: req.user._id })
      .sort({ createdAt: -1 })
      .select('title imageUrl likes createdAt')
      .lean();

    const rel = await User.findById(req.user._id)
      .select('followers following role')
      .populate({ path: 'followers', select: 'username email avatarUrl', options: { limit: 12 } })
      .populate({ path: 'following', select: 'username email avatarUrl', options: { limit: 12 } })
      .lean();

    // --- NEW: admin-only stats ---
    let totalUsers;      // undefined for non-admins → EJS won't render the admin block
    let googleUsers;     // users who have googleId (signed up via Google)

    const isAdmin = rel && String(rel.role).toLowerCase() === 'admin' ||
                    req.user && String(req.user.role).toLowerCase() === 'admin';

    if (isAdmin) {
      // Fast global count
      totalUsers = await User.estimatedDocumentCount();

      // Count users with a googleId (your "Google users")
      googleUsers = await User.countDocuments({
        googleId: { $exists: true, $ne: null, $ne: '' },
      });
    }
    // --- /NEW ---
let userList;          // recent users (name/email/auth)
let googleUserList;    // recent Google users

if (isAdmin) {
  const limit = Math.min(parseInt(req.query.limit || '25', 10) || 25, 100); // cap at 100
  const projection = 'username email googleId createdAt';

  userList = await User.find({}, projection)
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();

  // Add post count for each user
  const userIds = userList.map(u => u._id);
  const postCounts = await Post.aggregate([
    { $match: { userId: { $in: userIds } } },
    { $group: { _id: '$userId', count: { $sum: 1 } } }
  ]);
  const postCountMap = {};
  postCounts.forEach(pc => { postCountMap[String(pc._id)] = pc.count; });
  userList.forEach(u => { u.postCount = postCountMap[String(u._id)] || 0; });

  googleUserList = await User.find(
      { googleId: { $exists: true, $ne: null, $ne: '' } },
      projection
    )
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();

  // Add post count for each Google user
  const googleUserIds = googleUserList.map(u => u._id);
  const googlePostCounts = await Post.aggregate([
    { $match: { userId: { $in: googleUserIds } } },
    { $group: { _id: '$userId', count: { $sum: 1 } } }
  ]);
  const googlePostCountMap = {};
  googlePostCounts.forEach(pc => { googlePostCountMap[String(pc._id)] = pc.count; });
  googleUserList.forEach(u => { u.postCount = googlePostCountMap[String(u._id)] || 0; });
}

res.render('userdashboard', {
  user: req.user,
  myPosts,
  followersPreview: rel?.followers || [],
  followingPreview: rel?.following || [],
  followersCount: rel?.followers?.length || 0,
  followingCount: rel?.following?.length || 0,
  isAdmin: !!isAdmin,
  totalUsers,
  googleUsers,
  userList,
  googleUserList,
    });
  } catch (e) {
    console.error(e);
    res.status(500).send('Failed to load dashboard');
  }
};


exports.updateAvatar = async (req, res) => {
  try {
    let final = (req.body.avatarUrl || '').trim();
    if (req.file) final = '/uploads/' + req.file.filename;
    if (!final) return res.status(400).send('Provide an avatar file or URL');

    await User.findByIdAndUpdate(req.user._id, { avatarUrl: final });
    res.redirect('/dashboard');
  } catch (e) {
    console.error(e);
    res.status(500).send('Failed to update avatar');
  }
};

/** Profile page (GET /u/:id) */
exports.profile = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isObjectId(id)) return res.status(404).send('User not found');

    const profileUser = await User.findById(id)
      .select('username email avatarUrl role followers following createdAt')
      .lean();
    if (!profileUser) return res.status(404).send('User not found');

    const posts = await Post.find({ userId: id })
      .sort({ createdAt: -1 })
      .limit(60)
      .populate('userId', 'username email avatarUrl role')
      .lean();

    const uid = req.user?._id?.toString();
    const shaped = posts.map(p => ({
      ...p,
      likesCount: (p.likes || []).length,
      likedByMe: uid ? (p.likes || []).some(pid => String(pid) === uid) : false,
    }));

    const stats = {
      postsCount: shaped.length,
      totalLoves: shaped.reduce((sum, p) => sum + (p.likesCount || 0), 0),
      followersCount: (profileUser.followers || []).length,
      followingCount: (profileUser.following || []).length,
      joined: profileUser.createdAt ? new Date(profileUser.createdAt) : null
    };

    const isMe = String(req.user._id) === String(id);
    const isFollowing = !isMe && (profileUser.followers || []).some(fid => String(fid) === String(req.user._id));

    const rel = await User.findById(id)
      .select('followers following')
      .populate({ path: 'followers', select: 'username email avatarUrl', options: { limit: 12 } })
      .populate({ path: 'following', select: 'username email avatarUrl', options: { limit: 12 } })
      .lean();

    res.render('profile', {
      user: req.user || null,
      profileUser,
      posts: shaped,
      stats,
      isMe,
      isFollowing,
      followersPreview: rel?.followers || [],
      followingPreview: rel?.following || []
    });
  } catch (e) {
    console.error(e);
    res.status(500).send('Failed to load profile');
  }
};

exports.follow = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!isObjectId(id)) return res.status(404).send('User not found');
    if (String(id) === String(req.user._id)) return res.status(400).send('Cannot follow yourself');

    await Promise.all([
      User.updateOne({ _id: req.user._id }, { $addToSet: { following: id }, $pull: { followRequested: id } }),
      User.updateOne({ _id: id },           { $addToSet: { followers: req.user._id }, $pull: { followRequests: req.user._id } }),
    ]);

    // de-dup the "follow" notification
    await Notification.updateOne(
      { user: id, from: req.user._id, type: 'follow' },
      { $setOnInsert: { user: id, from: req.user._id, type: 'follow', seen: false } },
      { upsert: true }
    );

    if (wantsJSON(req)) return res.json({ ok: true, following: true });
    return res.redirect('/u/' + id);
  } catch (e) { next(e); }
};


/** DIRECT UNFOLLOW (POST /u/:id/unfollow) */
exports.unfollow = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!isObjectId(id)) return res.status(404).send('User not found');
    if (String(id) === String(req.user._id)) return res.status(400).send('Cannot unfollow yourself');

    await Promise.all([
      User.updateOne({ _id: req.user._id }, { $pull: { following: id } }),
      User.updateOne({ _id: id },           { $pull: { followers: req.user._id } }),
      Notification.deleteOne({ user: id, from: req.user._id, type: 'follow' }) // <-- remove the old “follow” notif
    ]);

    if (wantsJSON(req)) return res.json({ ok: true, following: false });
    return res.redirect('/u/' + id);
  } catch (e) { next(e); }
};


exports.listFollowers = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isObjectId(id)) return res.status(404).send('User not found');

    const user = await User.findById(id)
      .select('username avatarUrl followers')
      .populate('followers', 'username avatarUrl email')
      .lean();

    if (!user) return res.status(404).send('User not found');

    res.render('followers', { user: req.user || null, profileUser: user, list: user.followers });
  } catch (e) {
    console.error(e);
    res.status(500).send('Failed to load followers');
  }
};

exports.listFollowing = async (req, res) => {
  try {
    const { id } = req.params;
    if (!isObjectId(id)) return res.status(404).send('User not found');

    const user = await User.findById(id)
      .select('username avatarUrl following')
      .populate('following', 'username avatarUrl email')
      .lean();

    if (!user) return res.status(404).send('User not found');

    res.render('following', { user: req.user || null, profileUser: user, list: user.following });
  } catch (e) {
    console.error(e);
    res.status(500).send('Failed to load following');
  }
};
