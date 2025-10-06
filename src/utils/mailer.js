// utils/mailer.js
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail', // uses well-known Gmail SMTP settings
  auth: {
    user: process.env.GMAIL_USER,        // your Gmail address
    pass: process.env.GMAIL_APP_PASSWORD 
  }
});

async function sendLoginOTP(toEmail, code) {
  const mail = {
    from: `"Mosaic" <${process.env.GMAIL_USER}>`,
    to: toEmail,
    subject: 'Your login verification code',
    text: `Your verification code is: ${code}. It expires in 10 minutes.`,
    html: `<p>Your verification code is:</p>
           <p style="font-size:22px;letter-spacing:3px;"><b>${code}</b></p>
           <p>It expires in 10 minutes.</p>`
  };
  await transporter.sendMail(mail);
}

module.exports = { sendLoginOTP };
