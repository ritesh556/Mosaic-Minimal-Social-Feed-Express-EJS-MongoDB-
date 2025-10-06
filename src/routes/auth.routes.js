const router = require('express').Router();
const auth = require('../controllers/auth.controller');

router.get('/login', auth.loginPage);
router.post('/login', auth.loginSubmit);
router.get('/register', auth.registerPage);
router.post('/create', auth.registerSubmit);
router.get('/verify', auth.verifyPage);
router.post('/verify', auth.verifySubmit);
router.post('/resend-otp', auth.resendOTP);
router.get('/logout', auth.logout);

module.exports = router;
