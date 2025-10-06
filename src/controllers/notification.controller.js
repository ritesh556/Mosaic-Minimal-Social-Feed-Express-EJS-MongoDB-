const Notification = require('../models/notification');
const mongoose = require('mongoose');

exports.unseenCount = async (req, res, next) => {
  try {
    const count = await Notification.countDocuments({ user: req.user._id, seen: false });
    res.json({ count });
  } catch (e) { next(e); }
};

exports.list = async (req, res, next) => {
  try {
    const items = await Notification.find({ user: req.user._id })
      .sort({ createdAt: -1 }).limit(100)
      .populate('from', 'username avatarUrl')
      .populate('post', 'title imageUrl')
      .lean();

    // render or json; for your panel you used JSON:
    res.json(items);
  } catch (e) { next(e); }
};

exports.markOne = async (req, res, next) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) return res.status(404).send('Not found');
    await Notification.updateOne({ _id: id, user: req.user._id }, { $set: { seen: true } });
    res.redirect(req.get('Referer') || '/notifications');
  } catch (e) { next(e); }
};

exports.markAll = async (req, res, next) => {
  try {
    await Notification.updateMany({ user: req.user._id, seen: false }, { $set: { seen: true } });
    res.redirect(req.get('Referer') || '/notifications');
  } catch (e) { next(e); }
};
