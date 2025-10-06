const mongoose = require('mongoose');
const { Schema } = mongoose;

const userSchema = new Schema(
  {
    username:  { type: String, required: true, trim: true },
    email:     { type: String, required: true, unique: true, lowercase: true },
    password:  { type: String },
    googleId:  { type: String, index: true },
    age:       { type: Number },
    role:      { type: String, default: 'user' },
    avatarUrl: { type: String },

    followers: [{ type: Schema.Types.ObjectId, ref: 'user' }],
    following: [{ type: Schema.Types.ObjectId, ref: 'user' }],

    // === Login verification fields ===
    loginOtpHash:       { type: String },
    loginOtpExpiresAt:  { type: Date },
    loginPendingToken:  { type: String },
    loginOtpAttempts:   { type: Number, default: 0 }
  },
  { timestamps: true }
);

module.exports = mongoose.model('user', userSchema);
