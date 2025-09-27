const mongoose = require('mongoose');
const { Schema, Types } = mongoose;


const commentSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: 'user', required: true },
    text:   { type: String, required: true, trim: true, maxlength: 500 },
  },
  { timestamps: { createdAt: true, updatedAt: false } }
);

const postSchema = new Schema(
  {
    userId:   { type: Schema.Types.ObjectId, ref: 'user', required: true, index: true }, 
    title:    { type: String, required: true, trim: true, maxlength: 150 },
    imageUrl: { type: String, required: true, trim: true }, 
    likes:    [{ type: Types.ObjectId, ref: 'user' }], 
    comments: [commentSchema],    
  },
  { timestamps: true }
);


postSchema.index({ createdAt: -1 });
postSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model('Post', postSchema);
