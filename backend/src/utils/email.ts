import nodemailer from 'nodemailer';

// Helper function to convert HTML to plain text (for spam prevention)
// This ensures we always have a text fallback even if only HTML is provided
const htmlToText = (html: string): string => {
  // Remove HTML tags
  let text = html.replace(/<[^>]*>/g, '');
  // Decode common HTML entities
  text = text.replace(/&nbsp;/g, ' ');
  text = text.replace(/&amp;/g, '&');
  text = text.replace(/&lt;/g, '<');
  text = text.replace(/&gt;/g, '>');
  text = text.replace(/&quot;/g, '"');
  text = text.replace(/&#39;/g, "'");
  // Clean up multiple whitespaces and newlines
  text = text.replace(/\s+/g, ' ').trim();
  return text;
};

// Configure Gmail SMTP transporter for production
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: false, // Port 587 uses STARTTLS, not SSL/TLS
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

interface EmailOptions {
  to: string;
  subject: string;
  text?: string; // Plain text body (optional, will be generated from HTML if not provided)
  html: string; // HTML body
}

export const sendEmail = async (options: EmailOptions) => {
  try {
    // Spam Prevention: Ensure we always have both HTML and text versions
    // If text is not provided, generate it from HTML
    const plainText = options.text || htmlToText(options.html);

    // Spam Prevention: "From" address must match authenticated SMTP_USER
    // Using "AttendMark Support" as the display name, but email must be SMTP_USER
    const fromAddress = `"AttendMark Support" <${process.env.SMTP_USER}>`;

    const info = await transporter.sendMail({
      from: fromAddress, // Must match authenticated user to prevent spam flagging
      to: options.to,
      subject: options.subject,
      text: plainText, // Always include plain text version (spam prevention)
      html: options.html, // HTML version
    });

    console.log('✅ Email sent successfully');
    console.log('   Message ID:', info.messageId);
    console.log('   To:', options.to);
    console.log('   Subject:', options.subject);
    
    // Only show preview URL in development/test mode (not for Gmail production)
    if (process.env.NODE_ENV !== 'production' && info.messageId) {
      const previewUrl = nodemailer.getTestMessageUrl(info);
      if (previewUrl) {
        console.log('   Preview URL:', previewUrl);
      }
    }
  } catch (error: any) {
    // Enhanced error logging for troubleshooting
    console.error('❌ Error sending email:');
    console.error('   To:', options.to);
    console.error('   Subject:', options.subject);
    console.error('   Error Code:', error.code);
    console.error('   Error Message:', error.message);
    
    // Specific warning for authentication errors (common Gmail issue)
    if (error.code === 'EAUTH') {
      console.error('⚠️  AUTHENTICATION ERROR:');
      console.error('   - Check that SMTP_USER is your full Gmail address');
      console.error('   - Verify SMTP_PASS is an App Password (not your regular password)');
      console.error('   - Ensure 2-Step Verification is enabled in your Google Account');
      console.error('   - Generate a new App Password at: https://myaccount.google.com/apppasswords');
    }
    
    // Additional error details if available
    if (error.response) {
      console.error('   SMTP Response:', error.response);
    }
    if (error.responseCode) {
      console.error('   Response Code:', error.responseCode);
    }
    
    throw error;
  }
};

