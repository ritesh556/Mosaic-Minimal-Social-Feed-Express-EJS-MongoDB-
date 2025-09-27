// modle/message.js
const mongoose = require('mongoose');
const { Schema } = mongoose;

const MessageSchema = new Schema(
  {
    chatId: { type: Schema.Types.ObjectId, ref: 'chat', required: true, index: true },
    from:   { type: Schema.Types.ObjectId, ref: 'user', required: true, index: true },
    to:     { type: Schema.Types.ObjectId, ref: 'user', required: true, index: true },
    text:   { type: String, required: true, maxlength: 2000 },
    readAt: { type: Date, default: null }
  },
  { timestamps: true }
);

MessageSchema.index({ chatId: 1, createdAt: -1 });

module.exports = mongoose.model('message', MessageSchema);
