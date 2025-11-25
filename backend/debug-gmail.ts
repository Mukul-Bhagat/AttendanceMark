import nodemailer from 'nodemailer';

async function debugGmail() {
  console.log('--- DIRECT CREDENTIAL TEST ---');
  
  // DIRECTLY USING CREDENTIALS (NO .ENV)
  const user = 'taskmateai.app@gmail.com';
  const pass = 'orzpbbakilauhhdc'; 

  console.log(`Testing User: ${user}`);
  console.log(`Testing Pass: ${pass}`);

  const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    auth: {
      user: user,
      pass: pass,
    },
  });

  try {
    await transporter.verify();
    console.log('✅ SUCCESS! These credentials work perfectly.');
    console.log('👉 The issue is in how your .env file is being read.');
  } catch (error: any) {
    console.log('❌ FAILED: Google rejected these specific credentials.');
    console.log('👉 Error:', error.response);
    console.log('👉 SOLUTION: You MUST generate a NEW App Password.');
  }
}

debugGmail();