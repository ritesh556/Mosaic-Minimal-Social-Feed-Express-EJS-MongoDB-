const path = require('path');
const multer = require('multer');
const fs = require('fs');

const uploadsDir = path.join(process.cwd(), 'src', 'public', 'uploads');
fs.mkdirSync(uploadsDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (_, __, cb) => cb(null, uploadsDir),
  filename: (_, file, cb) => {
    const ext = path.extname(file.originalname || '').toLowerCase();
    const safeBase = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, safeBase + ext);
  }
});

const fileFilter = (_, file, cb) => {
  const ok = ['image/jpeg','image/png','image/webp','image/gif','image/avif'].includes(file.mimetype);
  cb(null, ok);
};

const upload = multer({ storage, fileFilter, limits: { fileSize: 5 * 1024 * 1024 }});
module.exports = upload;
