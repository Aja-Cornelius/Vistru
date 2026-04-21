// ═══════════════════════════════════════════════════════════
//  VISTRU — Email Service
//  src/services/email.service.js
// ═══════════════════════════════════════════════════════════
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host   : process.env.SMTP_HOST,
  port   : parseInt(process.env.SMTP_PORT) || 587,
  secure : false,
  auth   : {
    user : process.env.SMTP_USER,
    pass : process.env.SMTP_PASS
  }
});

const FROM = `"${process.env.EMAIL_FROM_NAME || 'Vistru'}" <${process.env.EMAIL_FROM}>`;

// ── Shared HTML wrapper ──
const wrap = (content) => `
<!DOCTYPE html><html><head><meta charset="UTF-8">
<style>
  body { font-family: 'Helvetica Neue', Arial, sans-serif; background:#F5F7FA; margin:0; padding:0; }
  .container { max-width:560px; margin:40px auto; background:#fff; border-radius:12px; overflow:hidden; box-shadow:0 4px 20px rgba(0,0,0,0.08); }
  .header { background:#0B1F3A; padding:28px 32px; }
  .logo { font-size:1.4rem; font-weight:700; color:#fff; letter-spacing:-0.02em; }
  .logo span { color:#C9922A; }
  .body { padding:32px; color:#0B1F3A; }
  .otp-box { background:#F5E4C2; border:2px solid #C9922A; border-radius:10px; text-align:center; padding:20px; margin:24px 0; font-size:2.4rem; font-weight:700; letter-spacing:0.3em; color:#0B1F3A; font-family:monospace; }
  .btn { display:inline-block; background:#C9922A; color:#0B1F3A; padding:12px 28px; border-radius:7px; text-decoration:none; font-weight:700; font-size:0.9rem; margin:16px 0; }
  .note { font-size:0.8rem; color:#8FA3B8; margin-top:24px; line-height:1.7; }
  .footer { background:#F0F4F8; padding:16px 32px; font-size:0.75rem; color:#8FA3B8; text-align:center; }
</style></head><body>
<div class="container">
  <div class="header"><div class="logo">Vis<span>tru</span></div></div>
  <div class="body">${content}</div>
  <div class="footer">© 2025 Vistru Technologies Ltd · <a href="#" style="color:#C9922A">Privacy Policy</a> · <a href="#" style="color:#C9922A">Terms of Service</a></div>
</div></body></html>`;

// ── Send OTP email ──
const sendOTP = async ({ to, name, otp, purpose = 'verification' }) => {
  const subject = purpose === 'password_reset'
    ? 'Reset your Vistru password'
    : 'Your Vistru verification code';

  const content = `
    <p style="font-size:1rem;font-weight:600;margin-bottom:4px">Hi ${name},</p>
    <p style="color:#5A6B7E;margin-bottom:0">
      ${purpose === 'password_reset'
        ? 'You requested a password reset for your Vistru account. Use the code below:'
        : 'Use the code below to verify your email address and complete registration:'}
    </p>
    <div class="otp-box">${otp}</div>
    <p style="color:#5A6B7E;font-size:0.875rem;">This code expires in <strong>${process.env.OTP_EXPIRES_MINUTES || 10} minutes.</strong> If you did not request this, please ignore this email.</p>
    <div class="note">For security, never share this code with anyone — including Vistru staff.</div>`;

  await transporter.sendMail({ from: FROM, to, subject, html: wrap(content) });
};

// ── Account approved ──
const sendAccountApproved = async ({ to, name, role }) => {
  const roleMsg = {
    engineer : 'Your engineering licence has been verified. You can now receive project notifications and submit BOQs.',
    supplier : 'Your CAC registration has been verified. Your store is now visible to clients in your region.',
    lawyer   : 'Your legal credentials have been verified. You will now receive land verification and contract requests.'
  }[role] || 'Your account is now fully active.';

  const content = `
    <p style="font-size:1rem;font-weight:600;margin-bottom:4px">Hi ${name},</p>
    <p style="color:#5A6B7E;">Great news — your Vistru account has been <strong style="color:#1A7A4A">approved and activated! ✅</strong></p>
    <p style="color:#5A6B7E;margin-top:12px;">${roleMsg}</p>
    <a href="${process.env.FRONTEND_URL}" class="btn">Go to Dashboard →</a>
    <div class="note">Welcome to Vistru. If you have any questions, contact us at support@vistru.ng</div>`;

  await transporter.sendMail({
    from: FROM, to,
    subject: '✅ Your Vistru account is approved',
    html: wrap(content)
  });
};

// ── Milestone filed notification to client ──
const sendMilestoneFiled = async ({ to, clientName, engineerName, milestoneName, projectTitle, releaseUrl }) => {
  const content = `
    <p style="font-size:1rem;font-weight:600;margin-bottom:4px">Hi ${clientName},</p>
    <p style="color:#5A6B7E;">Your engineer <strong>${engineerName}</strong> has filed <strong>${milestoneName}</strong> as complete on project <em>${projectTitle}</em>.</p>
    <p style="color:#5A6B7E;margin-top:12px;">Please review the CCTV footage and AI report on your dashboard, then release escrow if you are satisfied.</p>
    <a href="${releaseUrl || process.env.FRONTEND_URL}" class="btn">Review & Release →</a>
    <div class="note">Escrow funds will only be released when you confirm completion. Do not release if work is unsatisfactory.</div>`;

  await transporter.sendMail({
    from: FROM, to,
    subject: `🏁 Milestone filed: ${milestoneName} — Action Required`,
    html: wrap(content)
  });
};

// ── Escrow released notification to engineer/supplier ──
const sendEscrowReleased = async ({ to, recipientName, amount, milestoneName, projectTitle }) => {
  const formattedAmount = '₦' + (amount / 100).toLocaleString('en-NG');
  const content = `
    <p style="font-size:1rem;font-weight:600;margin-bottom:4px">Hi ${recipientName},</p>
    <p style="color:#5A6B7E;">Your escrow payment of <strong style="color:#1A7A4A">${formattedAmount}</strong> for <strong>${milestoneName}</strong> on project <em>${projectTitle}</em> has been released. 🎉</p>
    <p style="color:#5A6B7E;margin-top:12px;">The funds will reflect in your registered account within 1–2 business days.</p>
    <a href="${process.env.FRONTEND_URL}" class="btn">View Earnings →</a>`;

  await transporter.sendMail({
    from: FROM, to,
    subject: `💰 Escrow Released: ${formattedAmount} — ${milestoneName}`,
    html: wrap(content)
  });
};

// ── Arbitration filed ──
const sendArbitrationFiled = async ({ to, recipientName, caseRef, projectTitle, lawyerName }) => {
  const content = `
    <p style="font-size:1rem;font-weight:600;margin-bottom:4px">Hi ${recipientName},</p>
    <p style="color:#5A6B7E;">An arbitration case (<strong>${caseRef}</strong>) has been filed against you on the project <em>${projectTitle}</em>.</p>
    <p style="color:#5A6B7E;margin-top:12px;">The assigned lawyer <strong>${lawyerName}</strong> will contact you to schedule proceedings. Please log in to view full case details.</p>
    <a href="${process.env.FRONTEND_URL}" class="btn">View Case →</a>
    <div class="note">Cooperating with the arbitration process is required by your platform agreement.</div>`;

  await transporter.sendMail({
    from: FROM, to,
    subject: `⚖️ Arbitration Case Filed — ${caseRef}`,
    html: wrap(content)
  });
};

module.exports = {
  sendOTP,
  sendAccountApproved,
  sendMilestoneFiled,
  sendEscrowReleased,
  sendArbitrationFiled
};
