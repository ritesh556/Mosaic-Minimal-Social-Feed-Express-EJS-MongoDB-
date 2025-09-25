const mongoose = require('mongoose');
const { Schema, Types } = mongoose;

const postSchema = new Schema(
  {
    userId:   { type: Schema.Types.ObjectId, ref: 'user', required: true, index: true }, 
    title:    { type: String, required: true, trim: true, maxlength: 150 },
    imageUrl: { type: String, required: true, trim: true }, 
    likes:    [{ type: Types.ObjectId, ref: 'user' }],     
  },
  { timestamps: true }
);


postSchema.index({ createdAt: -1 });
postSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model('Post', postSchema);
