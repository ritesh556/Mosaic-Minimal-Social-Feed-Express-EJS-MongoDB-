const mongoose = require('mongoose')

mongoose.connect("mongodb://127.0.0.1:27017/authtestapp")


const { Schema } = mongoose;

const userSchema = new Schema(
  {
    username: { type: String, required: true, trim: true },
    email:    { type: String, required: true, unique: true, lowercase: true },
    password: { type: String, required: true },
    age:      { type: Number },
    role:     { type: String, default: 'user' },
    avatarUrl:{ type: String },

    
    followers: [{ type: Schema.Types.ObjectId, ref: 'user' }],
    following: [{ type: Schema.Types.ObjectId, ref: 'user' }],
  },
  { timestamps: true }
);




module.exports = mongoose.model('user', userSchema);