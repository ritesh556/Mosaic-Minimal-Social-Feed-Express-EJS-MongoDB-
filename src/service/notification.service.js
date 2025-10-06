const Notification = require('../models/notification');

async function notifyNewPost(authorId, postId, followerIds = []) {
  if (!followerIds.length) return;
  const docs = followerIds.map(uid => ({
    user: uid,
    type: 'new-post',
    from: authorId,
    post: postId,
    seen: false
  }));
  await Notification.insertMany(docs);
}

async function notifyFollowRequest(targetUserId, fromUserId) {
  await Notification.create({ user: targetUserId, type: 'follow-request', from: fromUserId });
}

async function notifyFollowAccepted(requesterId, byUserId) {
  await Notification.create({ user: requesterId, type: 'follow-accepted', from: byUserId });
}

module.exports = { notifyNewPost, notifyFollowRequest, notifyFollowAccepted };
