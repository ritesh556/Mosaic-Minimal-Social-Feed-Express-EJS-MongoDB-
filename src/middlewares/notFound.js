// Sends a nice 404 depending on the client's Accept header
module.exports = (req, res) => {
  if (req.accepts('html')) {
    // If you have a 404.ejs view, render it:
    try {
      return res.status(404).render('404', { user: req.user || null });
    } catch (_) {
      // fallback if view doesn't exist
    }
  }
  if (req.accepts('json')) {
    return res.status(404).json({ error: 'Not found' });
  }
  return res.status(404).type('txt').send('Not found');
};
