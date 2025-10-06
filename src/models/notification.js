const mongoose = require('mongoose');
const { Schema, Types } = mongoose;

const notificationSchema = new Schema({
  user: { type: Types.ObjectId, ref: 'user', required: true, index: true }, 
  type: { 
    type: String, 
    enum: ['new-post', 'follow-request', 'follow-accepted', 'follow'], 
    required: true
  },
  from: { type: Types.ObjectId, ref: 'user' },    
  post: { type: Types.ObjectId, ref: 'Post' },     
  seen: { type: Boolean, default: false, index: true }
}, { timestamps: { createdAt: true, updatedAt: false } });

notificationSchema.index({ user: 1, seen: 1, createdAt: -1 });

module.exports = mongoose.model('Notification', notificationSchema);
