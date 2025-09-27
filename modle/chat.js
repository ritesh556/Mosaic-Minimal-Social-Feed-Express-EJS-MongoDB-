// models/chat.js
const mongoose = require('mongoose');
const { Schema } = mongoose;

const ChatSchema = new Schema(
  {
    participants: [{
      type: Schema.Types.ObjectId,
      ref: 'user',
      required: true,
    }], // always length 2, we’ll enforce sort below
    lastMessageAt: { type: Date, default: Date.now }
  },
  { timestamps: true }
);

// Always keep participants sorted so [A,B] === [B,A]
ChatSchema.pre('validate', function(next) {
  if (Array.isArray(this.participants) && this.participants.length === 2) {
    this.participants = this.participants
      .map(id => String(id))
      .sort((a,b) => (a < b ? -1 : a > b ? 1 : 0))
      .map(id => mongoose.Types.ObjectId(id));
  }
  next();
});


ChatSchema.index(
  { 'participants.0': 1, 'participants.1': 1 },
  {
    unique: true,
    // ensure it only applies when both positions exist
    partialFilterExpression: {
      'participants.0': { $exists: true },
      'participants.1': { $exists: true },
    },
  }
);

module.exports = mongoose.model('chat', ChatSchema);
