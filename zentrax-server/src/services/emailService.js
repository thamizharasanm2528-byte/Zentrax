console.log("[Email] emailService.js loaded");
const nodemailer = require('nodemailer');

// Clean credentials in process.env to remove any enclosing double/single quotes from hosting panels
if (process.env.EMAIL_USER) {
  let user = process.env.EMAIL_USER.trim();
  if (user.startsWith('"') && user.endsWith('"')) user = user.slice(1, -1);
  else if (user.startsWith("'") && user.endsWith("'")) user = user.slice(1, -1);
  process.env.EMAIL_USER = user;
}
if (process.env.EMAIL_PASS) {
  let pass = process.env.EMAIL_PASS.trim();
  if (pass.startsWith('"') && pass.endsWith('"')) pass = pass.slice(1, -1);
  else if (pass.startsWith("'") && pass.endsWith("'")) pass = pass.slice(1, -1);
  process.env.EMAIL_PASS = pass;
}

// ─── Configure transporter using Gmail SMTP ───
console.log("EMAIL_USER:", process.env.EMAIL_USER);
console.log("EMAIL_PASS exists:", !!process.env.EMAIL_PASS);
const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,
  secure: false, // Use STARTTLS
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  },
  family: 4, // Force IPv4
  tls: {
    rejectUnauthorized: false
  }
});
// ─── Startup diagnostic: verify email credentials ───
if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
  transporter.verify()
    .then(() => console.log('[Email] ✅ SMTP connection verified — email service is ready'))
    .catch(err => console.error('[Email] ❌ SMTP verification FAILED:', err.message));
} else {
  console.warn('[Email] ⚠️  EMAIL_USER or EMAIL_PASS not set — emails will be skipped');
}

// ─── Shared Design Tokens ───
const BRAND = {
  primary: '#4f46e5',
  primaryDark: '#3730a3',
  primaryLight: '#e0e7ff',
  accent: '#06b6d4',
  success: '#059669',
  successBg: '#ecfdf5',
  warning: '#d97706',
  warningBg: '#fffbeb',
  danger: '#dc2626',
  dark: '#0f172a',
  text: '#1e293b',
  textSecondary: '#475569',
  textMuted: '#94a3b8',
  border: '#e2e8f0',
  bgBody: '#f1f5f9',
  bgCard: '#ffffff',
  bgSubtle: '#f8fafc',
  fontStack: "'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif",
  year: new Date().getFullYear()
};

/**
 * Build the shared HTML email shell (header + footer wrapper).
 * Content is injected into the body area.
 */
function buildEmailShell({ subtitle = 'Notification', bodyHtml }) {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>ZENTRAX — ${subtitle}</title>
</head>
<body style="margin:0; padding:0; background-color:${BRAND.bgBody}; font-family:${BRAND.fontStack}; -webkit-font-smoothing:antialiased;">

  <!-- Preheader (hidden text for inbox preview) -->
  <div style="display:none; max-height:0; overflow:hidden; font-size:1px; color:${BRAND.bgBody};">
    ZENTRAX — ${subtitle}
  </div>

  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${BRAND.bgBody};">
    <tr>
      <td align="center" style="padding:48px 16px;">

        <!-- Main Card -->
        <table width="600" cellpadding="0" cellspacing="0" border="0" style="max-width:600px; width:100%; background-color:${BRAND.bgCard}; border-radius:16px; overflow:hidden; border:1px solid ${BRAND.border}; box-shadow: 0 8px 32px rgba(0,0,0,0.06);">

          <!-- ══ HEADER ══ -->
          <tr>
            <td style="background: linear-gradient(135deg, ${BRAND.primary} 0%, ${BRAND.primaryDark} 100%); padding:36px 40px; text-align:center;">
              <table cellpadding="0" cellspacing="0" border="0" align="center">
                <tr>
                  <td style="background-color:rgba(255,255,255,0.15); border-radius:12px; padding:8px 20px;">
                    <p style="margin:0; font-size:22px; font-weight:800; color:#ffffff; letter-spacing:3px; font-family:${BRAND.fontStack};">ZENTRAX</p>
                  </td>
                </tr>
              </table>
              <p style="margin:12px 0 0; font-size:12px; color:rgba(255,255,255,0.7); letter-spacing:1.5px; text-transform:uppercase; font-family:${BRAND.fontStack};">${subtitle}</p>
            </td>
          </tr>

          <!-- ══ BODY ══ -->
          <tr>
            <td style="padding:40px 44px 36px;">
              ${bodyHtml}
            </td>
          </tr>

          <!-- ══ DIVIDER ══ -->
          <tr>
            <td style="padding:0 44px;">
              <table cellpadding="0" cellspacing="0" border="0" width="100%">
                <tr><td style="height:1px; background: linear-gradient(to right, transparent, ${BRAND.border}, transparent);"></td></tr>
              </table>
            </td>
          </tr>

          <!-- ══ FOOTER ══ -->
          <tr>
            <td style="padding:28px 44px 36px; text-align:center;">
              <p style="margin:0 0 6px; font-size:12px; font-weight:600; color:${BRAND.textSecondary}; font-family:${BRAND.fontStack};">ZENTRAX — Student Collaboration Platform</p>
              <p style="margin:0 0 4px; font-size:11px; color:${BRAND.textMuted}; font-family:${BRAND.fontStack};">This is an automated notification. Please do not reply to this email.</p>
              <p style="margin:0; font-size:11px; color:#cbd5e1; font-family:${BRAND.fontStack};">© ${BRAND.year} ZENTRAX. All rights reserved.</p>
            </td>
          </tr>

        </table>
        <!-- /Main Card -->

      </td>
    </tr>
  </table>

</body>
</html>`;
}

/**
 * Build a CTA button block.
 */
function buildCTA(label, link, color = BRAND.primary) {
  return `
      <table cellpadding="0" cellspacing="0" border="0" align="center" style="margin-top:32px;">
        <tr>
          <td style="background-color:${color}; border-radius:10px; box-shadow: 0 4px 14px rgba(79,70,229,0.25);">
            <a href="${link}" target="_blank" style="display:inline-block; padding:14px 40px; font-size:14px; font-weight:700; color:#ffffff; text-decoration:none; letter-spacing:0.3px; font-family:${BRAND.fontStack};">
              ${label} →
            </a>
          </td>
        </tr>
      </table>`;
}

/**
 * Build a detail row for info cards.
 */
function buildDetailRow(label, value) {
  if (!value || value === 'N/A') return '';
  return `
      <tr>
        <td style="padding:10px 0; color:${BRAND.textMuted}; font-size:12px; font-weight:700; text-transform:uppercase; letter-spacing:0.8px; width:130px; vertical-align:top; font-family:${BRAND.fontStack};">${label}</td>
        <td style="padding:10px 0; color:${BRAND.text}; font-size:14px; font-weight:500; line-height:1.5; font-family:${BRAND.fontStack};">${value}</td>
      </tr>`;
}


// ═══════════════════════════════════════════════════════════════════════════════
//  1. MENTOR NOTIFICATION EMAIL
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Send a professional HTML notification email (mentor/student actions).
 * 
 * @param {Object} options
 * @param {string} options.mentorEmail  — recipient email
 * @param {string} options.mentorName   — recipient display name
 * @param {string} options.studentName  — sender/actor display name
 * @param {string} options.projectName  — project title
 * @param {string} options.requestType  — e.g. "Mentorship Request", "Doubt Submission"
 * @param {string} options.message      — short summary or description
 * @returns {Promise<boolean>}          — true on success, false on failure (never throws)
 */
async function sendMentorNotificationEmail({ mentorEmail, mentorName, studentName, projectName, requestType, message }) {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.warn('[Email] EMAIL_USER or EMAIL_PASS not set — skipping email');
    return false;
  }

  if (!mentorEmail) {
    console.warn('[Email] No recipient email provided — skipping');
    return false;
  }

  const subject = `${requestType} — ZENTRAX Platform`;

  const bodyHtml = `
              <p style="margin:0 0 20px; color:${BRAND.text}; font-size:16px; line-height:1.6; font-family:${BRAND.fontStack};">
                Dear <strong>${mentorName || 'User'}</strong>,
              </p>
              <p style="margin:0 0 28px; color:${BRAND.textSecondary}; font-size:15px; line-height:1.7; font-family:${BRAND.fontStack};">
                We would like to inform you of a new activity on the ZENTRAX platform that requires your attention.
              </p>

              <!-- Details Card -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${BRAND.bgSubtle}; border-radius:12px; border:1px solid ${BRAND.border};">
                <tr>
                  <td style="padding:24px 28px;">

                    <!-- Badge -->
                    <table cellpadding="0" cellspacing="0" border="0" style="margin-bottom:16px;">
                      <tr>
                        <td style="background-color:${BRAND.primaryLight}; border-radius:6px; padding:5px 14px;">
                          <p style="margin:0; font-size:11px; font-weight:700; color:${BRAND.primary}; text-transform:uppercase; letter-spacing:1.2px; font-family:${BRAND.fontStack};">${requestType}</p>
                        </td>
                      </tr>
                    </table>

                    <table width="100%" cellpadding="0" cellspacing="0" border="0">
                      ${buildDetailRow('From', studentName)}
                      ${buildDetailRow('Project', projectName)}
                      ${message ? buildDetailRow('Details', message) : ''}
                    </table>
                  </td>
                </tr>
              </table>

              <p style="margin:28px 0 0; color:${BRAND.textSecondary}; font-size:14px; line-height:1.6; font-family:${BRAND.fontStack};">
                Please log in to your ZENTRAX dashboard to review and take the appropriate action at your earliest convenience.
              </p>

              ${buildCTA('Open Dashboard', 'http://localhost:5173')}
    `;

  const html = buildEmailShell({ subtitle: requestType, bodyHtml });

  try {
    await transporter.sendMail({
      from: `"ZENTRAX" <${process.env.EMAIL_USER}>`,
      to: mentorEmail,
      subject,
      html
    });
    console.log(`[Email] Notification sent to ${mentorEmail} (${requestType})`);
    return true;
  } catch (error) {
    console.error(`[Email] Failed to send notification: ${error.message}`);
    return false;
  }
}


// ═══════════════════════════════════════════════════════════════════════════════
//  2. WELCOME EMAIL
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Send a premium welcome email to a newly registered user.
 *
 * @param {Object} options
 * @param {string} options.userEmail  — recipient email
 * @param {string} options.userName   — recipient display name
 * @param {string} options.role       — 'student' or 'mentor'
 * @returns {Promise<boolean>}        — true on success, false on failure (never throws)
 */
async function sendWelcomeEmail({ userEmail, userName, role }) {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.warn('[Email] EMAIL_USER or EMAIL_PASS not set — skipping welcome email');
    return false;
  }

  if (!userEmail) {
    console.warn('[Email] No user email provided — skipping welcome email');
    return false;
  }

  const isStudent = role !== 'mentor';
  const displayRole = isStudent ? 'Student' : 'Mentor';
  const badgeBg = isStudent ? BRAND.successBg : '#f3e8ff';
  const badgeColor = isStudent ? BRAND.success : '#7c3aed';
  const badgeBorder = isStudent ? '#a7f3d0' : '#d8b4fe';

  const features = isStudent
    ? [
      { icon: '🚀', title: 'Project Management', desc: 'Create, manage, and track your academic projects from start to finish.' },
      { icon: '👥', title: 'Team Collaboration', desc: 'Find and join project teams with AI-powered skill matching.' },
      { icon: '🎓', title: 'Mentorship Access', desc: 'Connect with experienced mentors for expert guidance and feedback.' },
      { icon: '🤖', title: 'AI Assistant', desc: 'Get instant technical support powered by ZENTRAX-AI.' },
    ]
    : [
      { icon: '🧭', title: 'Student Guidance', desc: 'Guide and support students through their project development journey.' },
      { icon: '💬', title: 'Doubt Resolution', desc: 'Review and respond to student questions and technical challenges.' },
      { icon: '📋', title: 'Project Oversight', desc: 'Monitor project progress and provide timely, constructive feedback.' },
      { icon: '🤝', title: 'Live Sessions', desc: 'Conduct mentorship sessions to provide real-time guidance.' },
    ];

  const featureHtml = features.map(f => `
      <tr>
        <td style="padding:16px 20px; border-bottom:1px solid ${BRAND.border};">
          <table cellpadding="0" cellspacing="0" border="0" width="100%">
            <tr>
              <td width="44" style="vertical-align:top; padding-right:16px;">
                <div style="width:40px; height:40px; background-color:${BRAND.primaryLight}; border-radius:10px; text-align:center; line-height:40px; font-size:18px;">${f.icon}</div>
              </td>
              <td style="vertical-align:top;">
                <p style="margin:0 0 4px; font-size:14px; font-weight:700; color:${BRAND.text}; font-family:${BRAND.fontStack};">${f.title}</p>
                <p style="margin:0; font-size:13px; color:${BRAND.textSecondary}; line-height:1.5; font-family:${BRAND.fontStack};">${f.desc}</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>`).join('');

  const subject = `Welcome to ZENTRAX — Your Account is Ready`;

  const bodyHtml = `
              <p style="margin:0 0 20px; color:${BRAND.text}; font-size:16px; line-height:1.6; font-family:${BRAND.fontStack};">
                Dear <strong>${userName || 'User'}</strong>,
              </p>
              <p style="margin:0 0 24px; color:${BRAND.textSecondary}; font-size:15px; line-height:1.7; font-family:${BRAND.fontStack};">
                Thank you for registering on <strong style="color:${BRAND.primary};">ZENTRAX</strong>. Your account has been successfully created, and you are now ready to explore the platform.
              </p>

              <!-- Role Badge -->
              <table cellpadding="0" cellspacing="0" border="0" style="margin-bottom:28px;">
                <tr>
                  <td style="background-color:${badgeBg}; border:1px solid ${badgeBorder}; border-radius:8px; padding:8px 20px;">
                    <p style="margin:0; font-size:12px; font-weight:800; color:${badgeColor}; text-transform:uppercase; letter-spacing:1.2px; font-family:${BRAND.fontStack};">
                      ${displayRole} Account
                    </p>
                  </td>
                </tr>
              </table>

              <!-- Section Heading -->
              <p style="margin:0 0 16px; font-size:15px; font-weight:700; color:${BRAND.text}; font-family:${BRAND.fontStack};">
                As a ${displayRole}, you have access to the following features:
              </p>

              <!-- Features Card -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${BRAND.bgSubtle}; border-radius:12px; border:1px solid ${BRAND.border}; overflow:hidden;">
                ${featureHtml}
              </table>

              <p style="margin:28px 0 0; color:${BRAND.textSecondary}; font-size:14px; line-height:1.7; font-family:${BRAND.fontStack};">
                We are committed to supporting your academic journey. Should you require any assistance, please do not hesitate to reach out through the platform's support feature.
              </p>

              ${buildCTA(isStudent ? 'Go to Dashboard' : 'Open Mentor Dashboard', 'http://localhost:5173')}

              <p style="margin:28px 0 0; text-align:center; color:${BRAND.textMuted}; font-size:13px; font-family:${BRAND.fontStack};">
                Warm regards,<br>
                <strong style="color:${BRAND.primary};">The ZENTRAX Team</strong>
              </p>
    `;

  const html = buildEmailShell({ subtitle: 'Welcome', bodyHtml });

  try {
    await transporter.sendMail({
      from: `"ZENTRAX" <${process.env.EMAIL_USER}>`,
      to: userEmail,
      subject,
      html
    });
    console.log(`[Email] Welcome email sent to ${userEmail} (${displayRole})`);
    return true;
  } catch (error) {
    console.error(`[Email] Failed to send welcome email to ${userEmail}: ${error.message}`);
    return false;
  }
}


// ═══════════════════════════════════════════════════════════════════════════════
//  3. GENERIC NOTIFICATION EMAIL
// ═══════════════════════════════════════════════════════════════════════════════

/**
 * Send a professional generic notification email.
 *
 * @param {Object} options
 * @param {string} options.recipientEmail  — recipient email
 * @param {string} options.recipientName   — recipient display name
 * @param {string} options.subject         — email subject line
 * @param {string} options.title           — main heading inside the email
 * @param {string} options.message         — the notification message/body (HTML allowed)
 * @param {string} options.ctaLink         — optional CTA URL
 * @param {string} options.ctaLabel        — optional CTA label
 * @returns {Promise<boolean>}             — true on success (never throws)
 */
async function sendNotificationEmail({ recipientEmail, recipientName, subject, title, message, ctaLink = 'http://localhost:5173', ctaLabel = 'Open Dashboard' }) {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) return false;
  if (!recipientEmail) return false;

  const bodyHtml = `
              <p style="margin:0 0 20px; color:${BRAND.text}; font-size:16px; line-height:1.6; font-family:${BRAND.fontStack};">
                Dear <strong>${recipientName || 'User'}</strong>,
              </p>

              <!-- Title Banner -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background: linear-gradient(135deg, ${BRAND.primaryLight} 0%, #dbeafe 100%); border-radius:12px; border:1px solid ${BRAND.border}; margin-bottom:24px;">
                <tr>
                  <td style="padding:20px 28px;">
                    <p style="margin:0; font-size:18px; font-weight:800; color:${BRAND.primaryDark}; font-family:${BRAND.fontStack};">${title}</p>
                  </td>
                </tr>
              </table>

              <p style="margin:0 0 28px; color:${BRAND.textSecondary}; font-size:15px; line-height:1.8; font-family:${BRAND.fontStack};">
                ${message}
              </p>

              <p style="margin:0 0 0; color:${BRAND.textSecondary}; font-size:14px; line-height:1.6; font-family:${BRAND.fontStack};">
                Please visit your ZENTRAX dashboard to view the full details and take any necessary action.
              </p>

              ${buildCTA(ctaLabel, ctaLink)}
    `;

  const html = buildEmailShell({ subtitle: title, bodyHtml });

  try {
    await transporter.sendMail({
      from: `"ZENTRAX" <${process.env.EMAIL_USER}>`,
      to: recipientEmail,
      subject,
      html
    });
    console.log(`[Email] Notification sent to ${recipientEmail}: ${subject}`);
    return true;
  } catch (error) {
    console.error(`[Email] Failed to send notification: ${error.message}`);
    return false;
  }
}

/**
 * Send a premium mentor invite email with the registration code.
 *
 * @param {Object} options
 * @param {string} options.email  — recipient email
 * @param {string} options.name   — recipient name
 * @param {string} options.code   — the unique invite code
 * @returns {Promise<boolean>}    — true on success, false on failure (never throws)
 */
async function sendMentorInviteEmail({ email, name, code }) {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
    console.warn('[Email] EMAIL_USER or EMAIL_PASS not set — skipping invite email');
    return false;
  }

  if (!email) {
    console.warn('[Email] No email provided — skipping invite email');
    return false;
  }

  const signupLink = `https://zentraxplatform.netlify.app/signup?role=mentor&code=${code}&email=${encodeURIComponent(email)}`;
  const subject = `Invitation to join ZENTRAX as a Mentor`;

  const bodyHtml = `
              <p style="margin:0 0 20px; color:${BRAND.text}; font-size:16px; line-height:1.6; font-family:${BRAND.fontStack};">
                Dear <strong>${name || 'Mentor'}</strong>,
              </p>
              <p style="margin:0 0 24px; color:${BRAND.textSecondary}; font-size:15px; line-height:1.7; font-family:${BRAND.fontStack};">
                You have been invited to join the <strong style="color:${BRAND.primary};">ZENTRAX</strong> platform as a Mentor.
                As a mentor, you can guide students, help resolve technical doubts, monitor project progress, and host live sessions.
              </p>

              <!-- Invite Code Display Card -->
              <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${BRAND.bgSubtle}; border-radius:12px; border:1px solid ${BRAND.border}; margin-bottom:28px; text-align:center;">
                <tr>
                  <td style="padding:28px;">
                    <p style="margin:0 0 8px; font-size:12px; font-weight:700; color:${BRAND.textSecondary}; text-transform:uppercase; letter-spacing:1.5px; font-family:${BRAND.fontStack};">
                      Your Invite Code
                    </p>
                    <p style="margin:0; font-size:32px; font-weight:800; color:${BRAND.primary}; letter-spacing:4px; font-family:${BRAND.fontStack};">
                      ${code}
                    </p>
                    <p style="margin:12px 0 0; font-size:11px; color:${BRAND.textMuted}; font-family:${BRAND.fontStack};">
                      This code is bound to your email address and will expire in 72 hours.
                    </p>
                  </td>
                </tr>
              </table>

              <p style="margin:0 0 16px; color:${BRAND.textSecondary}; font-size:14px; line-height:1.7; font-family:${BRAND.fontStack};">
                Please click the button below to register and activate your mentor account:
              </p>

              ${buildCTA('Accept Invitation & Register', signupLink)}

              <p style="margin:28px 0 0; text-align:center; color:${BRAND.textMuted}; font-size:13px; font-family:${BRAND.fontStack};">
                Warm regards,<br>
                <strong style="color:${BRAND.primary};">The ZENTRAX Team</strong>
              </p>
    `;

  const html = buildEmailShell({ subtitle: 'Invitation', bodyHtml });

  try {
    await transporter.sendMail({
      from: `"ZENTRAX" <${process.env.EMAIL_USER}>`,
      to: email,
      subject,
      html
    });
    console.log(`[Email] Invite email sent to ${email} with code ${code}`);
    return true;
  } catch (error) {
    console.error(`[Email] Failed to send invite email to ${email}: ${error.message}`);
    return false;
  }
}

module.exports = { sendMentorNotificationEmail, sendWelcomeEmail, sendNotificationEmail, sendMentorInviteEmail };
