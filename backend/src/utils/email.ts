import nodemailer from 'nodemailer';

// This is the configuration for our (test) mail server
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '587'),
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

interface EmailOptions {
  to: string;
  subject: string;
  text: string; // Plain text body
  html: string; // HTML body
}

export const sendEmail = async (options: EmailOptions) => {
  try {
    const info = await transporter.sendMail({
      from: `"Smart Attend" <${process.env.SMTP_USER}>`, // sender address
      to: options.to,
      subject: options.subject,
      text: options.text,
      html: options.html,
    });

    console.log('Email sent: %s', info.messageId);
    // You can preview the sent email at the URL Nodemailer gives you
    if (info.messageId) {
      const previewUrl = nodemailer.getTestMessageUrl(info);
      if (previewUrl) {
        console.log('Preview URL: %s', previewUrl);
      }
    }
  } catch (error) {
    console.error('Error sending email:', error);
    throw error;
  }
};

