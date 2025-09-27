const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const multer = require('multer');


const mongoose = require('mongoose');
const isObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

const userModel = require('./modle/user'); 
const Post = require('./modle/post');
const Chat = require('./modle/chat');
const Message = require('./modle/message');

const app = express();




app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views')); 
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use(cookieParser());
app.use('/uploads', express.static(path.join(__dirname, 'public', 'uploads')));



const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, 'public', 'uploads')),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname || '');
    const safeBase = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, safeBase + ext.toLowerCase());
  }
});

const fileFilter = (req, file, cb) => {
 
  const ok = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/avif'].includes(file.mimetype);
  cb(null, ok);
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB
});

app.use(async (req, res, next) => {
  const token = req.cookies?.token;
  if (!token) { req.user = null; return next(); }

  try {
    const payload = jwt.verify(token, 'onepiece');
    const dbUser = await userModel
      .findById(payload.id)
      .select('email username age role avatarUrl');   
    req.user = dbUser ? dbUser.toObject() : null;
  } catch {
    req.user = null;
  }
  next();
});


app.use((req, res, next) => {
  res.locals.user = req.user || null;
  next();
});

function requireAuth(req, res, next) {
  if (!req.user) return res.redirect('/login');
  next();
}




app.get('/', async (req, res) => {
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
});



app.get('/register', (req, res) => {
  res.render('register', { user: req.user || null });
});



app.post('/create', async (req, res) => {
  const { username, email, password, age } = req.body;
  try {
    const existingUser = await userModel.findOne({email})
    if(existingUser){
     return res.send({err:"user allready exist"})
    }
    const hash = await bcrypt.hash(password, 10);
  
    const createdUser = await userModel.create({
      
      username,
      email,
      password: hash,
      age,
    });

   res.redirect('/login')
  } catch (e) {
    console.error(e);
    res.status(400).send({ error: 'Could not create user' });
  }
});

// Upload or set avatar URL
app.post('/me/avatar', requireAuth, upload.single('avatar'), async (req, res) => {
  try {
    let final = (req.body.avatarUrl || '').trim();
    if (req.file) final = '/uploads/' + req.file.filename;

    if (!final) return res.status(400).send('Provide an avatar file or URL');

    await userModel.findByIdAndUpdate(req.user._id, { avatarUrl: final });
    res.redirect('/dashboard');
  } catch (e) {
    console.error(e);
    res.status(500).send('Failed to update avatar');
  }
});


// Login page
app.get('/login', (req, res) => {
  if (req.user) return res.redirect('/dashboard');
  res.render('login');
});

// Handle login
app.post('/login', async (req, res) => {
  const user = await userModel.findOne({ email: req.body.email });
  if (!user) return res.render('login', { error: 'User not found' });

  const match = await bcrypt.compare(req.body.password, user.password);
  if (!match) return res.render('login', { error: 'Incorrect password' });


  const token = jwt.sign({ id: user._id }, 'onepiece', { expiresIn: '7d' });

  res.cookie('token', token, {
    httpOnly: true,
    maxAge: 7 * 24 * 60 * 60 * 1000,
   
  });

  return res.redirect('/dashboard');
});

// Protected dashboard

app.get('/dashboard', requireAuth, async (req, res) => {
  try {
    // Your posts
    const myPosts = await Post.find({ userId: req.user._id })
      .sort({ createdAt: -1 })
      .select('title imageUrl likes createdAt')
      .lean();

    // Followers / Following (limit preview to 12)
    const rel = await userModel
      .findById(req.user._id)
      .select('followers following')
      .populate({ path: 'followers', select: 'username email avatarUrl', options: { limit: 12 } })
      .populate({ path: 'following', select: 'username email avatarUrl', options: { limit: 12 } })
      .lean();

    const followersPreview = rel?.followers || [];
    const followingPreview = rel?.following || [];
    const followersCount = rel?.followers?.length || 0;
    const followingCount = rel?.following?.length || 0;

    res.render('userdashboard', {
      user: req.user,
      myPosts,
      followersPreview,
      followingPreview,
      followersCount,
      followingCount
    });
  } catch (e) {
    console.error(e);
    res.status(500).send('Failed to load dashboard');
  }
});


// Logout
app.get('/logout', (req, res) => {
  res.clearCookie('token');
  return res.redirect('/login');
});




app.post('/posts', requireAuth, upload.single('image'), async (req, res) => {
  try {
    const { title, imageUrl } = req.body;

    
    let finalImageUrl = imageUrl?.trim();

    if (req.file) {
      finalImageUrl = '/uploads/' + req.file.filename;
    }

    if (!title?.trim() || !finalImageUrl) {
      return res.status(400).render('post_new', { error: 'Title and an image (file or URL) are required' });
    }

    await Post.create({
      userId: req.user._id,
      title: title.trim(),
      imageUrl: finalImageUrl
    });

    res.redirect('/feed');
  } catch (err) {
    console.error(err);
    res.status(500).render('post_new', { error: 'Something went wrong while creating the post.' });
  }
});
app.get('/feed', async (req, res) => {
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
});




app.post('/posts/:id/like', requireAuth, async (req, res) => {
  try {
    await Post.updateOne(
      { _id: req.params.id, likes: { $ne: req.user._id } },
      { $addToSet: { likes: req.user._id } }
    );
    res.redirect(req.get('Referer') || '/posts/' + req.params.id);
  } catch (err) {
    console.error(err);
    res.status(500).send('Failed to like post');
  }
});

app.post('/posts/:id/unlike', requireAuth, async (req, res) => {
  try {
    await Post.updateOne(
      { _id: req.params.id, likes: req.user._id },
      { $pull: { likes: req.user._id } }
    );
    res.redirect(req.get('Referer') || '/posts/' + req.params.id);
  } catch (err) {
    console.error(err);
    res.status(500).send('Failed to unlike post');
  }
});


// JSON
app.get('/api/posts', async (req, res) => {
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
});




app.post('/posts/:id/delete', requireAuth, async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).send('Post not found');

    // allow  for admin
    if (String(post.userId) !== String(req.user._id) && req.user.role !== 'admin') {
      return res.status(403).send('Forbidden');
    }

    await Post.findByIdAndDelete(req.params.id);
    res.redirect('/feed');
  } catch (err) {
    console.error(err);
    res.status(500).send('Error deleting post');
  }
});



app.get('/posts/new', async (req, res) => {
  try {
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    const posts = await Post.find({ createdAt: { $gte: weekAgo } })
      .sort({ createdAt: -1 })
      .limit(100)
        .populate('userId', 'username email avatarUrl role') 
      .populate('comments.userId', 'username email avatarUrl')
      .lean();

    const uid = req.user?._id?.toString();
    const shaped = posts.map((p) => ({
      ...p,
      likesCount: (p.likes || []).length,
      likedByMe: uid ? (p.likes || []).some((id) => String(id) === uid) : false,
    }));

    res.render('newpost', {
      user: req.user || null,
      posts: shaped,
      weekStartISO: weekAgo.toISOString(),
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Failed to load this week’s posts');
  }
});

// CREATE a comment
app.post('/posts/:id/comments', requireAuth, async (req, res) => {
  try {
    const text = (req.body.text || '').trim();
    if (!text) return res.status(400).send('Comment cannot be empty');
    if (text.length > 300) return res.status(400).send('Comment too long');

    await Post.updateOne(
      { _id: req.params.id },
      { $push: { comments: { userId: req.user._id, text } } }
    );

    // send the user back to the post they commented on
    res.redirect('/feed#post-' + req.params.id);
  } catch (e) {
    console.error(e);
    res.status(500).send('Failed to add comment');
  }
});

// DELETE a comment (author, post owner, or admin)
app.post('/posts/:postId/comments/:commentId/delete', requireAuth, async (req, res) => {
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

    await Post.updateOne(
      { _id: req.params.postId },
      { $pull: { comments: { _id: req.params.commentId } } }
    );

    res.redirect('/feed#post-' + req.params.postId);
  } catch (e) {
    console.error(e);
    res.status(500).send('Failed to delete comment');
  }
});
// VIEW a single post
app.get('/posts/:id', async (req, res) => {
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

    const post = {
      ...p,
      likesCount: (p.likes || []).length,
      likedByMe
    };

    return res.render('post_show', {
      user: req.user || null,
      post
    });
  } catch (e) {
    console.error(e);
    return res.status(500).send('Failed to load post');
  }
});




// Visit someone’s profile

// Visit someone’s profile (with follower/following previews)
app.get('/u/:id', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    if (!isObjectId(id)) return res.status(404).send('User not found');

    // 1) Load profile user (unpopulated followers/following for counts)
    const profileUser = await userModel
      .findById(id)
      .select('username email avatarUrl role followers following createdAt')
      .lean();
    if (!profileUser) return res.status(404).send('User not found');

    // 2) Load posts authored by this user
    const posts = await Post.find({ userId: id })
      .sort({ createdAt: -1 })
      .limit(60)
      .populate('userId', 'username email avatarUrl role')
      .lean();

    // 3) Shape posts with like counts / likedByMe
    const uid = req.user?._id?.toString();
    const shaped = posts.map(p => ({
      ...p,
      likesCount: (p.likes || []).length,
      likedByMe: uid ? (p.likes || []).some(pid => String(pid) === uid) : false,
    }));

    // 4) Stats
    const stats = {
      postsCount: shaped.length,
      totalLoves: shaped.reduce((sum, p) => sum + (p.likesCount || 0), 0),
      followersCount: (profileUser.followers || []).length,
      followingCount: (profileUser.following || []).length,
      joined: profileUser.createdAt ? new Date(profileUser.createdAt) : null
    };

    // 5) Viewer flags
    const isMe = String(req.user._id) === String(id);
    const isFollowing =
      !isMe && (profileUser.followers || []).some(fid => String(fid) === String(req.user._id));

    // 6) Follower / following previews (populated, limited)
    const rel = await userModel
      .findById(id)
      .select('followers following')
      .populate({ path: 'followers', select: 'username email avatarUrl', options: { limit: 12 } })
      .populate({ path: 'following', select: 'username email avatarUrl', options: { limit: 12 } })
      .lean();

    const followersPreview = rel?.followers || [];
    const followingPreview = rel?.following || [];

    // 7) Render
    res.render('profile', {
      user: req.user || null,
      profileUser,
      posts: shaped,
      stats,
      isMe,
      isFollowing,
      followersPreview,
      followingPreview
    });
  } catch (e) {
    console.error(e);
    res.status(500).send('Failed to load profile');
  }
});



// FOLLOW someone
app.post('/u/:id/follow', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    if (!isObjectId(id)) return res.status(404).send('User not found');
    if (String(req.user._id) === String(id)) return res.status(400).send('Cannot follow yourself');

    // add to my following
    await userModel.updateOne(
      { _id: req.user._id },
      { $addToSet: { following: id } }
    );

    // add me to their followers
    await userModel.updateOne(
      { _id: id },
      { $addToSet: { followers: req.user._id } }
    );

    // back to the profile
    return res.redirect('/u/' + id);
  } catch (e) {
    console.error(e);
    return res.status(500).send('Failed to follow');
  }
});

// UNFOLLOW someone
app.post('/u/:id/unfollow', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    if (!isObjectId(id)) return res.status(404).send('User not found');
    if (String(req.user._id) === String(id)) return res.status(400).send('Cannot unfollow yourself');

    await userModel.updateOne(
      { _id: req.user._id },
      { $pull: { following: id } }
    );

    await userModel.updateOne(
      { _id: id },
      { $pull: { followers: req.user._id } }
    );

    return res.redirect('/u/' + id);
  } catch (e) {
    console.error(e);
    return res.status(500).send('Failed to unfollow');
  }
});
// See a user's followers
app.get('/u/:id/followers', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    if (!isObjectId(id)) return res.status(404).send('User not found');

    const user = await userModel
      .findById(id)
      .select('username avatarUrl followers')
      .populate('followers', 'username avatarUrl email')
      .lean();

    if (!user) return res.status(404).send('User not found');

    res.render('followers', {
      user: req.user || null,
      profileUser: user,
      list: user.followers
    });
  } catch (e) {
    console.error(e);
    res.status(500).send('Failed to load followers');
  }
});

// See a user's following
app.get('/u/:id/following', requireAuth, async (req, res) => {
  try {
    const { id } = req.params;
    if (!isObjectId(id)) return res.status(404).send('User not found');

    const user = await userModel
      .findById(id)
      .select('username avatarUrl following')
      .populate('following', 'username avatarUrl email')
      .lean();

    if (!user) return res.status(404).send('User not found');

    res.render('following', {
      
      user: req.user || null,
      profileUser: user,
      list: user.following
    });

    
  } catch (e) {
    console.error(e);
    res.status(500).send('Failed to load following');
  }
});

//chat 
async function isMutualFollowers(aId, bId) {
  const [a, b] = await Promise.all([
    userModel.findById(aId).select('following').lean(),
    userModel.findById(bId).select('following').lean()
  ]);
  if (!a || !b) return false;
  const aFollowsB = (a.following || []).some(id => String(id) === String(bId));
  const bFollowsA = (b.following || []).some(id => String(id) === String(aId));
  return aFollowsB && bFollowsA;
}

// sorted pair helper so [A,B] and [B,A] map to same chat
function sortedPair(a, b) {
  const [x, y] = [String(a), String(b)].sort();
  return [x, y];
}

async function getOrCreateChat(aId, bId) {
  const pair = sortedPair(aId, bId);

  // Atomic find-or-create to avoid races/duplicates
  const chat = await Chat.findOneAndUpdate(
    { 'participants.0': pair[0], 'participants.1': pair[1] },
    { $setOnInsert: { participants: pair, lastMessageAt: new Date() } },
    { new: true, upsert: true }
  );

  return chat;
}




//list all chats
app.get('/chats', requireAuth, async (req, res) => {
  const chats = await Chat.find({ participants: req.user._id })
    .sort({ lastMessageAt: -1 })
    .lean();

  // find the "other" participant & fetch their basic info
  const otherIds = chats.map(c => c.participants.find(p => String(p) !== String(req.user._id)));
  const others = await userModel.find({ _id: { $in: otherIds } })
    .select('username email avatarUrl')
    .lean();

  const othersById = new Map(others.map(u => [String(u._id), u]));

  // (optional) fetch last message text preview
  const withPreview = await Promise.all(chats.map(async c => {
    const lastMsg = await Message.findOne({ chatId: c._id })
      .sort({ createdAt: -1 })
      .select('text from to createdAt')
      .lean();
    const other = othersById.get(String(c.participants.find(p => String(p) !== String(req.user._id))));
    return { ...c, other, lastMsg };
  }));

  // If you have a view: res.render('chats_index', { user: req.user, chats: withPreview })
  res.json(withPreview); // simple JSON for now
});

// Start/open a chat with userId (only if mutual followers)
app.post('/chats/:userId/start', requireAuth, async (req, res) => {
  const { userId } = req.params;
  if (!isObjectId(userId)) return res.status(404).send('User not found');
  if (String(userId) === String(req.user._id)) return res.status(400).send('Cannot chat with yourself');

  const ok = await isMutualFollowers(req.user._id, userId);
  if (!ok) return res.status(403).send('Chat allowed only between mutual followers');

  const chat = await getOrCreateChat(req.user._id, userId);
  return res.redirect(`/chats/${userId}`);
});

// View a chat with userId (messages)
app.get('/chats/:userId', requireAuth, async (req, res) => {
  const { userId } = req.params;
  if (!isObjectId(userId)) return res.status(404).send('User not found');
  if (String(userId) === String(req.user._id)) return res.status(400).send('Cannot chat with yourself');

  const ok = await isMutualFollowers(req.user._id, userId);
  if (!ok) return res.status(403).send('Chat allowed only between mutual followers');

  const chat = await getOrCreateChat(req.user._id, userId);
  const messages = await Message.find({ chatId: chat._id })
    .sort({ createdAt: 1 })
    .limit(200)
    .populate('from', 'username avatarUrl')
    .populate('to', 'username avatarUrl')
    .lean();

  // If you have a view: res.render('chat_show', { user: req.user, otherUserId: userId, chat, messages })
  res.json({ chatId: chat._id, otherUserId: userId, messages });
});

// Send a message to userId
app.post('/chats/:userId/messages', requireAuth, async (req, res) => {
  const { userId } = req.params;
  const { text } = req.body;
  if (!isObjectId(userId)) return res.status(404).send('User not found');
  if (!text || !text.trim()) return res.status(400).send('Message cannot be empty');
  if (String(userId) === String(req.user._id)) return res.status(400).send('Cannot chat with yourself');

  const ok = await isMutualFollowers(req.user._id, userId);
  if (!ok) return res.status(403).send('Chat allowed only between mutual followers');

  const chat = await getOrCreateChat(req.user._id, userId);

  await Message.create({
    chatId: chat._id,
    from: req.user._id,
    to: userId,
    text: text.trim()
  });

  await Chat.updateOne({ _id: chat._id }, { $set: { lastMessageAt: new Date() } });

  // If using form posts:
  const back = req.get('Referer');
  return res.redirect(back && back.includes(`/chats/${userId}`) ? back : `/chats/${userId}`);
});






app.listen(3000, () =>  console.log('http://localhost:3000'));
