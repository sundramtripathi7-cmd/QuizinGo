const nodemailer = require("nodemailer");

let transporter;

function getTransporter() {
  if (transporter) return transporter;
  const { EMAIL_HOST, EMAIL_USER, EMAIL_PASS } = process.env;
  if (!EMAIL_HOST || !EMAIL_USER || !EMAIL_PASS) return null;

  transporter = nodemailer.createTransport({
    host: EMAIL_HOST,
    port: Number(process.env.EMAIL_PORT) || 587,
    secure: process.env.EMAIL_SECURE === "true",
    auth: { user: EMAIL_USER, pass: EMAIL_PASS },
  });
  return transporter;
}

function otpHtml(code, purpose) {
  const action = purpose === "register" ? "finish creating your QuizInGo account" : "sign in to QuizInGo";
  return `
    <div style="font-family:Outfit,Segoe UI,sans-serif;max-width:480px;margin:0 auto;padding:24px;color:#102a2a">
      <h2 style="color:#0f766e;margin:0 0 12px">QuizInGo</h2>
      <p style="margin:0 0 16px">Use this one-time code to ${action}. It expires in 10 minutes.</p>
      <p style="font-size:32px;letter-spacing:8px;font-weight:800;background:#dff7f2;padding:16px 20px;border-radius:12px;text-align:center;color:#0b5a54">${code}</p>
      <p style="color:#5f6f6f;font-size:13px;margin:16px 0 0">If you did not request this, you can ignore this email.</p>
    </div>
  `;
}

async function sendOtpEmail(to, code, purpose) {
  const transport = getTransporter();
  const from = process.env.EMAIL_FROM || process.env.EMAIL_USER || "QuizInGo <no-reply@quizingo.local>";
  const subject = purpose === "register" ? "Your QuizInGo verification code" : "Your QuizInGo sign-in code";
  const text = `Your QuizInGo code is ${code}. It expires in 10 minutes.`;

  if (!transport) {
    console.log(`[otp] ${to} (${purpose}): ${code}  — set EMAIL_HOST / EMAIL_USER / EMAIL_PASS to send mail`);
    return { sent: false };
  }

  await transport.sendMail({
    from,
    to,
    subject,
    text,
    html: otpHtml(code, purpose),
  });
  return { sent: true };
}

module.exports = { sendOtpEmail, getTransporter };
