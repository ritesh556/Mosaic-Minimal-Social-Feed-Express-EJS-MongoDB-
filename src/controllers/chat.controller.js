const mongoose = require('mongoose');
const User = require('../models/user');
const Chat = require('../models/chat');
const Message = require('../models/message');

const isObjectId = (id) => mongoose.Types.ObjectId.isValid(id);

// helpers
function sortedPair(a, b) { const [x, y] = [String(a), String(b)].sort(); return [x, y]; }
async function getOrCreateChat(aId, bId) {
  const pair = sortedPair(aId, bId);
  return Chat.findOneAndUpdate(
    { 'participants.0': pair[0], 'participants.1': pair[1] },
    { $setOnInsert: { participants: pair, lastMessageAt: new Date() } },
    { new: true, upsert: true }
  );
}
async function isMutualFollowers(aId, bId) {
  const [a, b] = await Promise.all([
    User.findById(aId).select('following').lean(),
    User.findById(bId).select('following').lean()
  ]);
  if (!a || !b) return false;
  const aFollowsB = (a.following || []).some(id => String(id) === String(bId));
  const bFollowsA = (b.following || []).some(id => String(id) === String(aId));
  return aFollowsB && bFollowsA;
}

// GET /chats  -> list with preview
exports.list = async (req, res) => {
  const me = req.user._id;
  const chats = await Chat.find({ participants: me }).sort({ lastMessageAt: -1 }).lean();

  const otherIds = chats.map(c => c.participants.find(p => String(p) !== String(me)));
  const others = await User.find({ _id: { $in: otherIds } }).select('username email avatarUrl').lean();
  const byId = new Map(others.map(u => [String(u._id), u]));

  const withPreview = await Promise.all(chats.map(async c => {
    const lastMsg = await Message.findOne({ chatId: c._id })
      .sort({ createdAt: -1 })
      .select('text from to createdAt')
      .lean();
    const otherId = c.participants.find(p => String(p) !== String(me));
    return { ...c, other: byId.get(String(otherId)) || null, lastMsg };
  }));

  res.json(withPreview);
};

// POST /chats/:userId/start
exports.start = async (req, res) => {
  const { userId } = req.params;
  if (!isObjectId(userId)) return res.status(404).send('User not found');
  if (String(userId) === String(req.user._id)) return res.status(400).send('Cannot chat with yourself');

  const ok = await isMutualFollowers(req.user._id, userId);
  if (!ok) return res.status(403).send('Chat allowed only between mutual followers');

  await getOrCreateChat(req.user._id, userId);
  // front-end ignores response; 204 is fine
  return res.status(204).end();
};

// GET /chats/:userId -> thread messages JSON
exports.thread = async (req, res) => {
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

  res.json({ chatId: chat._id, otherUserId: userId, messages });
};

// POST /chats/:userId/messages
exports.send = async (req, res) => {
  const { userId } = req.params;
  const text = (req.body.text || '').trim();
  if (!isObjectId(userId)) return res.status(404).send('User not found');
  if (!text) return res.status(400).send('Message cannot be empty');
  if (String(userId) === String(req.user._id)) return res.status(400).send('Cannot chat with yourself');

  const ok = await isMutualFollowers(req.user._id, userId);
  if (!ok) return res.status(403).send('Chat allowed only between mutual followers');

  const chat = await getOrCreateChat(req.user._id, userId);

  await Message.create({ chatId: chat._id, from: req.user._id, to: userId, text });
  await Chat.updateOne({ _id: chat._id }, { $set: { lastMessageAt: new Date() } });

  return res.status(204).end();
};
