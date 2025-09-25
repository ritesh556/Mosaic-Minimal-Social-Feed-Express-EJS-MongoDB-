const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const multer = require('multer');

const userModel = require('./modle/user'); 
const Post = require('./modle/post');

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
      .select('email username age role');   
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
    .populate('userId', 'username email')
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
  const myPosts = await Post.find({ userId: req.user._id })
    .sort({ createdAt: -1 })
    .select('title imageUrl likes createdAt') 
    .lean();

  res.render('userdashboard', { user: req.user, myPosts });
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
    .populate('userId', 'username email')
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
  await Post.updateOne(
    { _id: req.params.id, likes: { $ne: req.user._id } },
    { $addToSet: { likes: req.user._id } }
  );
 
  res.redirect('/feed');
});



app.post('/posts/:id/unlike', requireAuth, async (req, res) => {
  await Post.updateOne(
    { _id: req.params.id, likes: req.user._id },
    { $pull: { likes: req.user._id } }
  );
  res.redirect('/feed');
});

// JSON
app.get('/api/posts', async (req, res) => {
  const limit = Math.min(parseInt(req.query.limit)?.valueOf() || 50, 200);
  const posts = await Post.find({})
    .sort({ createdAt: -1 })
    .limit(limit)
    .populate('userId', 'username email')
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
      .populate('userId', 'username email')
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





app.listen(3000, () =>  console.log('http://localhost:3000'));
