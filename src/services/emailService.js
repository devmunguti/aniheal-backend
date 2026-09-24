const { Resend } = require('resend');
const config = require('../config/environment');

const getResendClient = () => {
  const apiKey = process.env.RESEND_API_KEY || config.resend?.apiKey;
  if (apiKey && apiKey !== 're_xxxxxxxxx' && apiKey.startsWith('re_')) {
    return new Resend(apiKey);
  }
  return null;
};

/**
 * Dynamically fetch configured alert destination email from WebsiteSettings
 */
const getNotificationEmail = async (key, fallback = 'hello.aniheal@gmail.com') => {
  try {
    const WebsiteSettings = require('../models/WebsiteSettings');
    const settings = await WebsiteSettings.findOne().lean();
    if (settings?.notificationEmails?.[key] && settings.notificationEmails[key].trim()) {
      return settings.notificationEmails[key].trim();
    }
  } catch (err) {
    // ignore and use fallback
  }
  return process.env.CLINIC_ADMIN_EMAIL || fallback;
};

/**
 * Universal email dispatcher with automatic fallback handling
 */
const sendEmailWithFallback = async ({ to, subject, html, logLabel = 'NOTIFICATION' }) => {
  const client = getResendClient();
  const recipient = Array.isArray(to) ? to : [to];

  if (!client) {
    console.log(`[${logLabel} MOCK/DEV] To: ${recipient.join(', ')} | Subject: ${subject}`);
    return {
      success: true,
      deliveredVia: 'console_dev_fallback',
      id: 'mock_' + Date.now(),
    };
  }

  const primaryFrom = process.env.RESEND_FROM_EMAIL || config.resend?.fromEmail || 'AniHeal Security <auth@aniheal.co.ke>';
  const fallbackFrom = process.env.RESEND_FALLBACK_FROM || config.resend?.fallbackFromEmail || 'AniHeal <onboarding@resend.dev>';

  try {
    console.log(`[RESEND SENDING] Dispatching ${logLabel} to ${recipient.join(', ')} from ${primaryFrom}...`);
    const res = await client.emails.send({
      from: primaryFrom,
      to: recipient,
      subject,
      html,
    });

    if (res.error) {
      console.warn(`[RESEND WARNING] ${logLabel} primary send failed:`, res.error.message);
      console.log(`[RESEND SENDING] Retrying ${logLabel} with fallback sender ${fallbackFrom}...`);
      const fallbackRes = await client.emails.send({
        from: fallbackFrom,
        to: recipient,
        subject,
        html,
      });

      if (fallbackRes.error) {
        console.error(`[RESEND ERROR] ${logLabel} fallback failed:`, fallbackRes.error.message);
        return { success: true, deliveredVia: 'fallback_console', id: 'dev_' + Date.now() };
      }

      console.log(`[RESEND SUCCESS] ${logLabel} delivered via fallback. ID:`, fallbackRes.data?.id);
      return { success: true, deliveredVia: 'resend_fallback', data: fallbackRes.data };
    }

    console.log(`[RESEND SUCCESS] ${logLabel} delivered via primary. ID:`, res.data?.id);
    return { success: true, deliveredVia: 'resend_primary', data: res.data };
  } catch (err) {
    console.error(`[RESEND EXCEPTION] ${logLabel}:`, err.message);
    return { success: true, deliveredVia: 'exception_console', id: 'dev_' + Date.now() };
  }
};

/**
 * Standard Email Wrapper Template
 */
const wrapEmailTemplate = ({ title, preheader, bodyHtml, alertBoxHtml = '' }) => {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
</head>
<body style="margin: 0; padding: 0; background-color: #f4f6f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #1e293b;">
  <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f4f6f5; padding: 32px 16px;">
    <tr>
      <td align="center">
        <table width="100%" max-width="580" cellpadding="0" cellspacing="0" border="0" style="max-width: 580px; background-color: #ffffff; border-radius: 20px; overflow: hidden; box-shadow: 0 4px 20px rgba(0, 0, 0, 0.06); border: 1px solid #e2e8f0;">
          
          <!-- Brand Header -->
          <tr>
            <td style="background-color: #14532d; padding: 28px 32px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 800; letter-spacing: -0.5px;">
                AniHeal <span style="font-weight: 300; opacity: 0.9;">Veterinary Solutions</span>
              </h1>
              <p style="margin: 6px 0 0 0; color: #86efac; font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 1.5px;">
                ${preheader}
              </p>
            </td>
          </tr>

          <!-- Body Content -->
          <tr>
            <td style="padding: 36px 32px 24px 32px;">
              ${bodyHtml}
              ${alertBoxHtml}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f8fafc; padding: 20px 32px; border-top: 1px solid #e2e8f0; text-align: center;">
              <p style="margin: 0; color: #64748b; font-size: 11px;">
                AniHeal Vetspace Solutions Ltd <br>
                Syokimau Katani Rd, Nairobi, Kenya • 24/7 Hotline: +254 726 587 044                 
              </p>
              <p style="margin: 8px 0 0 0; color: #94a3b8; font-size: 10px;">
                This is an automated system notification from the AniHeal Veterinary Care Platform.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;
};

/* =========================================================================
   1. OTP AUTHENTICATION
   ========================================================================= */
const buildOtpEmailHtml = ({ recipientName, otpCode, expiryMinutes = 10 }) => {
  const body = `
    <h2 style="margin: 0 0 12px 0; color: #0f172a; font-size: 20px; font-weight: 700;">
      Your One-Time Login Passcode
    </h2>
    <p style="margin: 0 0 20px 0; color: #475569; font-size: 14px; line-height: 1.6;">
      Hello <strong>${recipientName || 'Authorized Clinician'}</strong>,<br>
      A request was received to sign in to the AniHeal Clinical Management Platform. Use the one-time passcode below to verify your session:
    </p>

    <!-- OTP Display Box -->
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin: 24px 0;">
      <tr>
        <td align="center" style="background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%); border: 2px dashed #16a34a; border-radius: 16px; padding: 24px 16px;">
          <span style="font-family: 'Courier New', Courier, monospace; font-size: 38px; font-weight: 800; letter-spacing: 8px; color: #14532d; display: inline-block;">
            ${otpCode}
          </span>
          <p style="margin: 8px 0 0 0; font-size: 12px; color: #15803d; font-weight: 600;">
            ⏱ Expires in ${expiryMinutes} minutes
          </p>
        </td>
      </tr>
    </table>
  `;

  const alertBox = `
    <div style="background-color: #f8fafc; border-left: 4px solid #0284c7; border-radius: 8px; padding: 12px 16px; margin-top: 24px;">
      <p style="margin: 0; font-size: 12px; color: #334155; line-height: 1.5;">
        <strong>Security Reminder:</strong> AniHeal staff will never ask you for this code. If you did not attempt to sign in, please disregard this email or notify the administrative team immediately.
      </p>
    </div>
  `;

  return wrapEmailTemplate({
    title: 'Your AniHeal Security Passcode',
    preheader: 'Authentication Security Passcode',
    bodyHtml: body,
    alertBoxHtml: alertBox,
  });
};

const sendOtpEmail = async ({ to, name, otpCode, expiryMinutes = 10 }) => {
  const html = buildOtpEmailHtml({ recipientName: name, otpCode, expiryMinutes });
  return sendEmailWithFallback({
    to,
    subject: `Your AniHeal Login Verification Code: ${otpCode}`,
    html,
    logLabel: 'OTP',
  });
};

/* =========================================================================
   2. STAFF / ADMIN PROVISIONING
   ========================================================================= */
const buildAccountCreatedEmailHtml = ({
  recipientName,
  email,
  tempPassword,
  role = 'editor',
  portalUrl = 'https://aniheal.co.ke/admin/login',
}) => {
  const roleDisplayMap = {
    superadmin: 'Super Administrator (Full System Privileges)',
    admin: 'Administrator (Staff & Content Management)',
    vet: 'Field Veterinary Officer (Clinical Ops & Patients)',
    editor: 'Content Editor (Services & Media)',
    user: 'Standard Staff Member',
  };
  const roleTitle = roleDisplayMap[role] || role;

  const body = `
    <h2 style="margin: 0 0 12px 0; color: #0f172a; font-size: 20px; font-weight: 700;">
      Welcome to the ANIHEAL VETSPACE Portal
    </h2>
    <p style="margin: 0 0 20px 0; color: #475569; font-size: 14px; line-height: 1.6;">
      Hello <strong>${recipientName || 'Team Member'}</strong>,<br>
      An administrative staff account has been provisioned for you on the <strong>AniHeal Vetspace solutions Clinical Management Platform</strong>.
    </p>

    <!-- Credentials Card -->
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 14px; margin: 20px 0; overflow: hidden;">
      <tr>
        <td style="padding: 16px 20px; border-bottom: 1px solid #e2e8f0; font-size: 13px; color: #64748b; font-weight: 600; width: 35%;">
          Assigned Role:
        </td>
        <td style="padding: 16px 20px; border-bottom: 1px solid #e2e8f0; font-size: 14px; color: #0f172a; font-weight: 700;">
          ${roleTitle}
        </td>
      </tr>
      <tr>
        <td style="padding: 16px 20px; border-bottom: 1px solid #e2e8f0; font-size: 13px; color: #64748b; font-weight: 600;">
          Login Email:
        </td>
        <td style="padding: 16px 20px; border-bottom: 1px solid #e2e8f0; font-size: 14px; color: #14532d; font-weight: 700; font-family: monospace;">
          ${email}
        </td>
      </tr>
      <tr>
        <td style="padding: 16px 20px; font-size: 13px; color: #64748b; font-weight: 600;">
          Temporary Password:
        </td>
        <td style="padding: 16px 20px; font-size: 15px; color: #dc2626; font-weight: 800; font-family: monospace; letter-spacing: 1px;">
          ${tempPassword}
        </td>
      </tr>
    </table>

    <!-- First Login Instructions -->
    <div style="background-color: #f0fdf4; border-left: 4px solid #16a34a; border-radius: 8px; padding: 14px 16px; margin: 24px 0;">
      <h4 style="margin: 0 0 6px 0; color: #14532d; font-size: 13px; font-weight: 700;">
        First-Time Sign In Workflow (2FA):
      </h4>
      <ol style="margin: 0; padding-left: 18px; color: #166534; font-size: 12px; line-height: 1.6;">
        <li>Visit the Staff Portal and enter your <strong>Email</strong> and <strong>Temporary Password</strong>.</li>
        <li>A 6-digit verification passcode (OTP) will be dispatched to this email address.</li>
        <li>Upon entering the code, you will be prompted to <strong>set your private permanent password</strong>.</li>
      </ol>
    </div>

    <!-- CTA Button -->
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin: 28px 0 16px 0;">
      <tr>
        <td align="center">
          <a href="${portalUrl}" target="_blank" style="display: inline-block; background-color: #16a34a; color: #ffffff; text-decoration: none; font-size: 14px; font-weight: 700; padding: 14px 32px; border-radius: 50px; box-shadow: 0 4px 12px rgba(22, 163, 74, 0.3);">
            Access Staff Login Portal &rarr;
          </a>
        </td>
      </tr>
    </table>
  `;

  const alertBox = `
    <p style="margin: 20px 0 0 0; font-size: 11px; color: #94a3b8; text-align: center; line-height: 1.5;">
      For security reasons, never share your login credentials. If you did not expect this account invitation, please notify AniHeal security immediately.
    </p>
  `;

  return wrapEmailTemplate({
    title: 'Your AniHeal Staff Account Credentials',
    preheader: 'Staff & Administrator Provisioning',
    bodyHtml: body,
    alertBoxHtml: alertBox,
  });
};

const sendAccountCreatedEmail = async ({
  to,
  name,
  email,
  tempPassword,
  role = 'editor',
  portalUrl,
}) => {
  const targetPortalUrl = portalUrl || process.env.PORTAL_URL || 'https://aniheal.co.ke/admin/login';
  const html = buildAccountCreatedEmailHtml({
    recipientName: name,
    email: email || to,
    tempPassword,
    role,
    portalUrl: targetPortalUrl,
  });
  return sendEmailWithFallback({
    to,
    subject: `Welcome to AniHeal: Your Staff Account & Access Credentials`,
    html,
    logLabel: 'STAFF_WELCOME',
  });
};

/* =========================================================================
   3. PASSWORD CHANGED SECURITY ALERT
   ========================================================================= */
const buildPasswordChangedEmailHtml = ({ recipientName, email, timestamp = new Date() }) => {
  const dateFormatted = new Intl.DateTimeFormat('en-KE', {
    dateStyle: 'full',
    timeStyle: 'medium',
    timeZone: 'Africa/Nairobi',
  }).format(timestamp);

  const body = `
    <h2 style="margin: 0 0 12px 0; color: #0f172a; font-size: 20px; font-weight: 700;">
      Password Changed Successfully
    </h2>
    <p style="margin: 0 0 20px 0; color: #475569; font-size: 14px; line-height: 1.6;">
      Hello <strong>${recipientName || 'AniHeal User'}</strong>,<br>
      This is a confirmation that the password for your account (<strong>${email}</strong>) was successfully changed on <strong>${dateFormatted} EAT</strong>.
    </p>
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 12px; padding: 16px; margin: 20px 0;">
      <tr>
        <td>
          <p style="margin: 0; color: #166534; font-size: 13px; font-weight: 600;">
            ✓ Your new password is now active for all future logins across the web and mobile platforms.
          </p>
        </td>
      </tr>
    </table>
  `;

  const alertBox = `
    <div style="background-color: #fef2f2; border-left: 4px solid #ef4444; border-radius: 8px; padding: 14px 16px; margin-top: 24px;">
      <p style="margin: 0; font-size: 12px; color: #991b1b; line-height: 1.5;">
        <strong>Didn't make this change?</strong> If you did not perform this password change, please contact our security team immediately at <strong>+254 726 587 044</strong> or reply to lock your account.
      </p>
    </div>
  `;

  return wrapEmailTemplate({
    title: 'Password Changed Confirmation',
    preheader: 'Account Security Notice',
    bodyHtml: body,
    alertBoxHtml: alertBox,
  });
};

const sendPasswordChangedEmail = async ({ to, name, email }) => {
  const html = buildPasswordChangedEmailHtml({ recipientName: name, email: email || to });
  return sendEmailWithFallback({
    to,
    subject: 'Security Alert: Your AniHeal Password Was Changed',
    html,
    logLabel: 'PASSWORD_CHANGED',
  });
};

/* =========================================================================
   4. APPOINTMENT TRIAGE NOTIFICATIONS (FARMER & CLINIC)
   ========================================================================= */
const buildAppointmentConfirmationEmailHtml = ({ appointment }) => {
  const tierBadges = {
    emergency: '<span style="background-color: #fee2e2; color: #991b1b; padding: 4px 10px; border-radius: 20px; font-size: 12px; font-weight: 700; text-transform: uppercase;">🚨 Critical / Emergency</span>',
    morning: '<span style="background-color: #fef3c7; color: #92400e; padding: 4px 10px; border-radius: 20px; font-size: 12px; font-weight: 700; text-transform: uppercase;">🌅 Morning Dispatch</span>',
    afternoon: '<span style="background-color: #e0e7ff; color: #3730a3; padding: 4px 10px; border-radius: 20px; font-size: 12px; font-weight: 700; text-transform: uppercase;">🌤 Afternoon Dispatch</span>',
    standard: '<span style="background-color: #f1f5f9; color: #475569; padding: 4px 10px; border-radius: 20px; font-size: 12px; font-weight: 700; text-transform: uppercase;">📋 Standard Routine</span>',
  };

  const badge = tierBadges[appointment.dispatchTier] || tierBadges.morning;

  const body = `
    <h2 style="margin: 0 0 12px 0; color: #0f172a; font-size: 20px; font-weight: 700;">
      Veterinary Triage Ticket Confirmed
    </h2>
    <p style="margin: 0 0 20px 0; color: #475569; font-size: 14px; line-height: 1.6;">
      Dear <strong>${appointment.farmerName}</strong>,<br>
      Thank you for contacting AniHeal Vetspace solutions. Your triage appointment ticket has been received and routed to our mobile veterinary dispatch unit.
    </p>

    <!-- Ticket Summary Card -->
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 14px; margin: 20px 0; overflow: hidden;">
      <tr>
        <td style="padding: 14px 18px; border-bottom: 1px solid #e2e8f0; font-size: 13px; color: #64748b; font-weight: 600; width: 38%;">
          Ticket Reference:
        </td>
        <td style="padding: 14px 18px; border-bottom: 1px solid #e2e8f0; font-size: 15px; color: #14532d; font-weight: 800; font-family: monospace;">
          ${appointment.ticketRef}
        </td>
      </tr>
      <tr>
        <td style="padding: 14px 18px; border-bottom: 1px solid #e2e8f0; font-size: 13px; color: #64748b; font-weight: 600;">
          Dispatch Urgency:
        </td>
        <td style="padding: 14px 18px; border-bottom: 1px solid #e2e8f0;">
          ${badge}
        </td>
      </tr>
      <tr>
        <td style="padding: 14px 18px; border-bottom: 1px solid #e2e8f0; font-size: 13px; color: #64748b; font-weight: 600;">
          Service Category:
        </td>
        <td style="padding: 14px 18px; border-bottom: 1px solid #e2e8f0; font-size: 13px; color: #0f172a; font-weight: 700;">
          ${appointment.clinicalService}
        </td>
      </tr>
      <tr>
        <td style="padding: 14px 18px; border-bottom: 1px solid #e2e8f0; font-size: 13px; color: #64748b; font-weight: 600;">
          Target Species / Herd:
        </td>
        <td style="padding: 14px 18px; border-bottom: 1px solid #e2e8f0; font-size: 13px; color: #0f172a;">
          <strong>${appointment.speciesType}</strong> (${appointment.affectedCount || 1} affected of ${appointment.totalHeadcount || 1} total)
        </td>
      </tr>
      <tr>
        <td style="padding: 14px 18px; border-bottom: 1px solid #e2e8f0; font-size: 13px; color: #64748b; font-weight: 600;">
          Location / County:
        </td>
        <td style="padding: 14px 18px; border-bottom: 1px solid #e2e8f0; font-size: 13px; color: #0f172a;">
          ${appointment.county} ${appointment.landmarks ? `(${appointment.landmarks})` : ''}
        </td>
      </tr>
      <tr>
        <td style="padding: 14px 18px; font-size: 13px; color: #64748b; font-weight: 600;">
          Reported Symptoms:
        </td>
        <td style="padding: 14px 18px; font-size: 13px; color: #334155; font-style: italic;">
          "${appointment.symptomsDescription}"
        </td>
      </tr>
    </table>
  `;

  const alertBox = `
    <div style="background-color: #f0fdf4; border-left: 4px solid #16a34a; border-radius: 8px; padding: 14px 16px; margin-top: 20px;">
      <h4 style="margin: 0 0 6px 0; color: #14532d; font-size: 13px; font-weight: 700;">What happens next?</h4>
      <p style="margin: 0; font-size: 12px; color: #166534; line-height: 1.5;">
        A licensed AniHeal veterinarian will call your phone number (<strong>${appointment.phone}</strong>) shortly to verify clinical observations and provide an ETA for on-farm visit or clinic reception.
      </p>
    </div>
  `;

  return wrapEmailTemplate({
    title: `Triage Ticket ${appointment.ticketRef} Confirmed`,
    preheader: 'Veterinary Triage & Dispatch',
    bodyHtml: body,
    alertBoxHtml: alertBox,
  });
};

const sendAppointmentConfirmationEmail = async ({ to, appointment }) => {
  if (!to) return { success: false, reason: 'No recipient email' };
  const html = buildAppointmentConfirmationEmailHtml({ appointment });
  return sendEmailWithFallback({
    to,
    subject: `AniHeal Triage Confirmation: Ticket ${appointment.ticketRef}`,
    html,
    logLabel: 'APPOINTMENT_CONFIRMATION',
  });
};

const sendAppointmentInternalAlertEmail = async ({ appointment, to }) => {
  const adminEmail = to || (await getNotificationEmail('triageAlertEmail', 'hello.aniheal@gmail.com'));
  const body = `
    <h2 style="margin: 0 0 12px 0; color: #dc2626; font-size: 20px; font-weight: 700;">
      🚨 Incoming Clinical Triage Ticket: ${appointment.ticketRef}
    </h2>
    <p style="margin: 0 0 20px 0; color: #475569; font-size: 14px; line-height: 1.6;">
      A new veterinary triage request requires clinical review and officer assignment.
    </p>
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 14px; margin: 20px 0;">
      <tr>
        <td style="padding: 12px 16px; border-bottom: 1px solid #e2e8f0; font-weight: 600; color: #64748b;">Farmer:</td>
        <td style="padding: 12px 16px; border-bottom: 1px solid #e2e8f0; font-weight: 700; color: #0f172a;">${appointment.farmerName} (${appointment.phone})</td>
      </tr>
      <tr>
        <td style="padding: 12px 16px; border-bottom: 1px solid #e2e8f0; font-weight: 600; color: #64748b;">County &amp; Hub:</td>
        <td style="padding: 12px 16px; border-bottom: 1px solid #e2e8f0; font-weight: 700; color: #0f172a;">${appointment.county} | ${appointment.assignedHub || 'Auto'}</td>
      </tr>
      <tr>
        <td style="padding: 12px 16px; border-bottom: 1px solid #e2e8f0; font-weight: 600; color: #64748b;">Species &amp; Service:</td>
        <td style="padding: 12px 16px; border-bottom: 1px solid #e2e8f0; font-weight: 700; color: #0f172a;">${appointment.speciesType} — ${appointment.clinicalService}</td>
      </tr>
      <tr>
        <td style="padding: 12px 16px; border-bottom: 1px solid #e2e8f0; font-weight: 600; color: #64748b;">Priority Tier:</td>
        <td style="padding: 12px 16px; border-bottom: 1px solid #e2e8f0; font-weight: 800; color: #dc2626;">${appointment.dispatchTier?.toUpperCase()}</td>
      </tr>
      <tr>
        <td style="padding: 12px 16px; font-weight: 600; color: #64748b;">Clinical Summary:</td>
        <td style="padding: 12px 16px; color: #334155;">${appointment.symptomsDescription}</td>
      </tr>
    </table>
    <div style="text-align: center; margin: 24px 0;">
      <a href="tel:${appointment.phone}" style="display: inline-block; background-color: #14532d; color: #ffffff; text-decoration: none; font-size: 13px; font-weight: 700; padding: 12px 24px; border-radius: 50px; margin-right: 8px;">
        📞 Call Farmer (${appointment.phone})
      </a>
      <a href="https://aniheal.co.ke/admin/appointments" style="display: inline-block; background-color: #16a34a; color: #ffffff; text-decoration: none; font-size: 13px; font-weight: 700; padding: 12px 24px; border-radius: 50px;">
        Open Admin Portal &rarr;
      </a>
    </div>
  `;

  const html = wrapEmailTemplate({
    title: `[Triage Alert] ${appointment.ticketRef} - ${appointment.county}`,
    preheader: 'Clinical Operations Alert',
    bodyHtml: body,
  });

  return sendEmailWithFallback({
    to: adminEmail,
    subject: `🚨 [TRIAGE ${appointment.dispatchTier?.toUpperCase()}] Ticket ${appointment.ticketRef} - ${appointment.farmerName} (${appointment.county})`,
    html,
    logLabel: 'INTERNAL_APPOINTMENT_ALERT',
  });
};

const sendAppointmentStatusUpdateEmail = async ({
  to,
  appointment,
  previousStatus,
  newStatus,
  assignedClinician,
  clinicalNotes,
}) => {
  if (!to) return { success: false, reason: 'No recipient email' };

  const statusDisplayMap = {
    pending: 'Under Review',
    contacted: 'Farmer Contacted & Scheduled',
    dispatched: 'Clinician En Route / Dispatched',
    completed: 'Clinical Visit Completed',
    cancelled: 'Cancelled',
  };

  const body = `
    <h2 style="margin: 0 0 12px 0; color: #0f172a; font-size: 20px; font-weight: 700;">
      Appointment Status Updated: ${statusDisplayMap[newStatus] || newStatus}
    </h2>
    <p style="margin: 0 0 20px 0; color: #475569; font-size: 14px; line-height: 1.6;">
      Dear <strong>${appointment.farmerName}</strong>,<br>
      The status for your veterinary appointment (Ticket <strong>${appointment.ticketRef}</strong>) has been updated to: <strong style="color: #16a34a;">${statusDisplayMap[newStatus] || newStatus}</strong>.
    </p>

    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 14px; margin: 20px 0;">
      <tr>
        <td style="padding: 14px 18px; border-bottom: 1px solid #e2e8f0; font-size: 13px; color: #64748b; font-weight: 600; width: 38%;">
          Ticket Reference:
        </td>
        <td style="padding: 14px 18px; border-bottom: 1px solid #e2e8f0; font-size: 14px; color: #14532d; font-weight: 800; font-family: monospace;">
          ${appointment.ticketRef}
        </td>
      </tr>
      ${assignedClinician
      ? `
      <tr>
        <td style="padding: 14px 18px; border-bottom: 1px solid #e2e8f0; font-size: 13px; color: #64748b; font-weight: 600;">
          Assigned Veterinarian:
        </td>
        <td style="padding: 14px 18px; border-bottom: 1px solid #e2e8f0; font-size: 14px; color: #0f172a; font-weight: 700;">
          Dr. ${assignedClinician}
        </td>
      </tr>
      `
      : ''
    }
      ${clinicalNotes
      ? `
      <tr>
        <td style="padding: 14px 18px; font-size: 13px; color: #64748b; font-weight: 600;">
          Clinical Notes / Advice:
        </td>
        <td style="padding: 14px 18px; font-size: 13px; color: #334155;">
          ${clinicalNotes}
        </td>
      </tr>
      `
      : ''
    }
    </table>
  `;

  const alertBox = `
    <div style="background-color: #f0fdf4; border-left: 4px solid #16a34a; border-radius: 8px; padding: 14px 16px; margin-top: 20px;">
      <p style="margin: 0; font-size: 12px; color: #166534; line-height: 1.5;">
        Need urgent adjustments or have further questions? Reach our emergency dispatch desk anytime at <strong>+254 726 587 044</strong>.
      </p>
    </div>
  `;

  const html = wrapEmailTemplate({
    title: `Ticket ${appointment.ticketRef} Status Update`,
    preheader: 'Veterinary Care Status Update',
    bodyHtml: body,
    alertBoxHtml: alertBox,
  });

  return sendEmailWithFallback({
    to,
    subject: `AniHeal Update: Ticket ${appointment.ticketRef} is now ${statusDisplayMap[newStatus] || newStatus}`,
    html,
    logLabel: 'APPOINTMENT_STATUS_UPDATE',
  });
};

/* =========================================================================
   5. PRODUCT ORDERS (CUSTOMER RECEIPT & INTERNAL ALERT)
   ========================================================================= */
const buildOrderConfirmationEmailHtml = ({ order }) => {
  const itemsRows = (order.items || [])
    .map(
      (item) => `
      <tr>
        <td style="padding: 12px 16px; border-bottom: 1px solid #e2e8f0; font-size: 13px; color: #0f172a;">
          <strong>${item.name || item.product?.name || 'Veterinary Product'}</strong>
        </td>
        <td style="padding: 12px 16px; border-bottom: 1px solid #e2e8f0; font-size: 13px; color: #64748b; text-align: center;">
          ${item.quantity}
        </td>
        <td style="padding: 12px 16px; border-bottom: 1px solid #e2e8f0; font-size: 13px; color: #64748b; text-align: right;">
          KES ${(item.unitPrice || 0).toLocaleString()}
        </td>
        <td style="padding: 12px 16px; border-bottom: 1px solid #e2e8f0; font-size: 13px; color: #0f172a; font-weight: 700; text-align: right;">
          KES ${(item.subtotal || item.quantity * item.unitPrice || 0).toLocaleString()}
        </td>
      </tr>
    `
    )
    .join('');

  const body = `
    <h2 style="margin: 0 0 12px 0; color: #0f172a; font-size: 20px; font-weight: 700;">
      Order Received: ${order.orderNumber}
    </h2>
    <p style="margin: 0 0 20px 0; color: #475569; font-size: 14px; line-height: 1.6;">
      Dear <strong>${order.customerName}</strong>,<br>
      Thank you for purchasing with AniHeal Vetspace solutions. Your order has been registered and is being prepared for fulfillment.
    </p>

    <!-- Itemized Table -->
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 14px; margin: 20px 0; overflow: hidden;">
      <thead>
        <tr style="background-color: #e2e8f0;">
          <th style="padding: 12px 16px; font-size: 12px; font-weight: 700; color: #475569; text-align: left;">Item</th>
          <th style="padding: 12px 16px; font-size: 12px; font-weight: 700; color: #475569; text-align: center;">Qty</th>
          <th style="padding: 12px 16px; font-size: 12px; font-weight: 700; color: #475569; text-align: right;">Price</th>
          <th style="padding: 12px 16px; font-size: 12px; font-weight: 700; color: #475569; text-align: right;">Total</th>
        </tr>
      </thead>
      <tbody>
        ${itemsRows}
      </tbody>
      <tfoot>
        <tr style="background-color: #f0fdf4;">
          <td colspan="3" style="padding: 14px 16px; font-size: 14px; font-weight: 700; color: #14532d; text-align: right;">
            Grand Total:
          </td>
          <td style="padding: 14px 16px; font-size: 16px; font-weight: 800; color: #14532d; text-align: right;">
            KES ${(order.totalAmount || 0).toLocaleString()}
          </td>
        </tr>
      </tfoot>
    </table>

    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="margin: 16px 0;">
      <tr>
        <td style="font-size: 13px; color: #64748b;">
          <strong>Delivery Destination:</strong> ${order.county} ${order.deliveryAddress ? `— ${order.deliveryAddress}` : ''}<br>
          <strong>Contact Phone:</strong> ${order.customerPhone}
        </td>
      </tr>
    </table>
  `;

  const alertBox = `
    <div style="background-color: #f0fdf4; border-left: 4px solid #16a34a; border-radius: 8px; padding: 14px 16px; margin-top: 20px;">
      <h4 style="margin: 0 0 6px 0; color: #14532d; font-size: 13px; font-weight: 700;">M-Pesa Payment Instructions:</h4>
      <p style="margin: 0; font-size: 12px; color: #166534; line-height: 1.5;">
        You can settle via M-Pesa Buy Goods / Till or upon delivery confirmation. Our dispatch team will call you to confirm dispatch times and payment reference.
      </p>
    </div>
  `;

  return wrapEmailTemplate({
    title: `Order Receipt ${order.orderNumber}`,
    preheader: 'Veterinary Product Order Receipt',
    bodyHtml: body,
    alertBoxHtml: alertBox,
  });
};

const sendOrderConfirmationEmail = async ({ to, order }) => {
  if (!to) return { success: false, reason: 'No recipient email' };
  const html = buildOrderConfirmationEmailHtml({ order });
  return sendEmailWithFallback({
    to,
    subject: `AniHeal Order Confirmation: ${order.orderNumber} (KES ${(order.totalAmount || 0).toLocaleString()})`,
    html,
    logLabel: 'ORDER_CONFIRMATION',
  });
};

const sendOrderInternalAlertEmail = async ({ order, to }) => {
  const adminEmail = to || (await getNotificationEmail('orderAlertEmail', 'hello.aniheal@gmail.com'));
  const body = `
    <h2 style="margin: 0 0 12px 0; color: #14532d; font-size: 20px; font-weight: 700;">
      📦 New Store Order Received: ${order.orderNumber}
    </h2>
    <p style="margin: 0 0 16px 0; color: #475569; font-size: 14px;">
      Customer: <strong>${order.customerName}</strong> (${order.customerPhone}) | County: <strong>${order.county}</strong><br>
      Total Value: <strong>KES ${(order.totalAmount || 0).toLocaleString()}</strong> (${(order.items || []).length} items)
    </p>
    <div style="text-align: center; margin: 24px 0;">
      <a href="tel:${order.customerPhone}" style="display: inline-block; background-color: #14532d; color: #ffffff; text-decoration: none; font-size: 13px; font-weight: 700; padding: 12px 24px; border-radius: 50px; margin-right: 8px;">
        📞 Call Customer
      </a>
      <a href="https://aniheal.co.ke/admin/products" style="display: inline-block; background-color: #16a34a; color: #ffffff; text-decoration: none; font-size: 13px; font-weight: 700; padding: 12px 24px; border-radius: 50px;">
        Fulfill in Admin Portal &rarr;
      </a>
    </div>
  `;

  const html = wrapEmailTemplate({
    title: `[New Order] ${order.orderNumber}`,
    preheader: 'Store Fulfillment Alert',
    bodyHtml: body,
  });

  return sendEmailWithFallback({
    to: adminEmail,
    subject: `📦 [NEW ORDER] ${order.orderNumber} - ${order.customerName} (KES ${(order.totalAmount || 0).toLocaleString()})`,
    html,
    logLabel: 'INTERNAL_ORDER_ALERT',
  });
};

const sendOrderStatusUpdateEmail = async ({ to, order, previousStatus, newStatus, trackingNotes }) => {
  if (!to) return { success: false, reason: 'No recipient email' };

  const statusLabels = {
    pending: 'Order Received',
    processing: 'Processing & Packaging in Pharmacy',
    fulfilled: 'Dispatched & Out for Delivery',
    cancelled: 'Order Cancelled',
  };

  const body = `
    <h2 style="margin: 0 0 12px 0; color: #0f172a; font-size: 20px; font-weight: 700;">
      Order Status Update: ${statusLabels[newStatus] || newStatus}
    </h2>
    <p style="margin: 0 0 20px 0; color: #475569; font-size: 14px; line-height: 1.6;">
      Dear <strong>${order.customerName}</strong>,<br>
      Your order <strong>${order.orderNumber}</strong> has been updated to: <strong style="color: #16a34a;">${statusLabels[newStatus] || newStatus}</strong>.
    </p>

    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 14px; margin: 20px 0;">
      <tr>
        <td style="padding: 14px 18px; border-bottom: 1px solid #e2e8f0; font-size: 13px; color: #64748b; font-weight: 600; width: 38%;">
          Order Number:
        </td>
        <td style="padding: 14px 18px; border-bottom: 1px solid #e2e8f0; font-size: 14px; color: #14532d; font-weight: 800; font-family: monospace;">
          ${order.orderNumber}
        </td>
      </tr>
      <tr>
        <td style="padding: 14px 18px; border-bottom: 1px solid #e2e8f0; font-size: 13px; color: #64748b; font-weight: 600;">
          Payment Status:
        </td>
        <td style="padding: 14px 18px; border-bottom: 1px solid #e2e8f0; font-size: 14px; color: #0f172a; font-weight: 700; text-transform: capitalize;">
          ${order.paymentStatus || 'Pending'}
        </td>
      </tr>
      ${trackingNotes
      ? `
      <tr>
        <td style="padding: 14px 18px; font-size: 13px; color: #64748b; font-weight: 600;">
          Dispatch Notes:
        </td>
        <td style="padding: 14px 18px; font-size: 13px; color: #334155;">
          ${trackingNotes}
        </td>
      </tr>
      `
      : ''
    }
    </table>
  `;

  const html = wrapEmailTemplate({
    title: `Order ${order.orderNumber} Status Update`,
    preheader: 'Store Order Status Update',
    bodyHtml: body,
  });

  return sendEmailWithFallback({
    to,
    subject: `AniHeal Order Update: ${order.orderNumber} is now ${statusLabels[newStatus] || newStatus}`,
    html,
    logLabel: 'ORDER_STATUS_UPDATE',
  });
};

/* =========================================================================
   6. ANIMAL INSURANCE (APPLICATION ACKNOWLEDGEMENT & ACTIVATION CERTIFICATE)
   ========================================================================= */
const buildInsuranceSubscriptionEmailHtml = ({ subscription, planName }) => {
  const body = `
    <h2 style="margin: 0 0 12px 0; color: #0f172a; font-size: 20px; font-weight: 700;">
      Insurance Application Received
    </h2>
    <p style="margin: 0 0 20px 0; color: #475569; font-size: 14px; line-height: 1.6;">
      Dear <strong>${subscription.applicantName}</strong>,<br>
      Thank you for choosing AniHeal Animal Care Insurance. Your policy enrollment application has been logged into our underwriting system.
    </p>

    <!-- Application Summary -->
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 14px; margin: 20px 0;">
      <tr>
        <td style="padding: 14px 18px; border-bottom: 1px solid #e2e8f0; font-size: 13px; color: #64748b; font-weight: 600; width: 38%;">
          Application Ref:
        </td>
        <td style="padding: 14px 18px; border-bottom: 1px solid #e2e8f0; font-size: 14px; color: #14532d; font-weight: 800; font-family: monospace;">
          ${subscription.applicationNumber}
        </td>
      </tr>
      <tr>
        <td style="padding: 14px 18px; border-bottom: 1px solid #e2e8f0; font-size: 13px; color: #64748b; font-weight: 600;">
          Insurance Plan:
        </td>
        <td style="padding: 14px 18px; border-bottom: 1px solid #e2e8f0; font-size: 14px; color: #0f172a; font-weight: 700;">
          ${planName || 'Livestock Care Coverage'}
        </td>
      </tr>
      <tr>
        <td style="padding: 14px 18px; border-bottom: 1px solid #e2e8f0; font-size: 13px; color: #64748b; font-weight: 600;">
          Target Animal / Herd:
        </td>
        <td style="padding: 14px 18px; border-bottom: 1px solid #e2e8f0; font-size: 13px; color: #0f172a;">
          ${subscription.species} (${subscription.animalCount || 1} Head) ${subscription.animalName ? `— ${subscription.animalName}` : ''}
        </td>
      </tr>
      <tr>
        <td style="padding: 14px 18px; font-size: 13px; color: #64748b; font-weight: 600;">
          Preferred Billing:
        </td>
        <td style="padding: 14px 18px; font-size: 13px; color: #0f172a; text-transform: capitalize;">
          ${subscription.preferredBilling || 'Monthly'}
        </td>
      </tr>
    </table>
  `;

  const alertBox = `
    <div style="background-color: #f0fdf4; border-left: 4px solid #16a34a; border-radius: 8px; padding: 14px 16px; margin-top: 20px;">
      <h4 style="margin: 0 0 6px 0; color: #14532d; font-size: 13px; font-weight: 700;">Next Steps: Underwriting Assessment</h4>
      <p style="margin: 0; font-size: 12px; color: #166534; line-height: 1.5;">
        An AniHeal underwriting veterinary officer will review the health history and contact you to arrange identification tagging / microchip validation within 24 to 48 hours.
      </p>
    </div>
  `;

  return wrapEmailTemplate({
    title: `Insurance Application ${subscription.applicationNumber}`,
    preheader: 'Livestock Care & Health Insurance',
    bodyHtml: body,
    alertBoxHtml: alertBox,
  });
};

const sendInsuranceSubscriptionEmail = async ({ to, subscription, planName }) => {
  if (!to) return { success: false, reason: 'No recipient email' };
  const html = buildInsuranceSubscriptionEmailHtml({ subscription, planName });
  return sendEmailWithFallback({
    to,
    subject: `AniHeal Insurance Application Received: ${subscription.applicationNumber}`,
    html,
    logLabel: 'INSURANCE_SUBSCRIPTION',
  });
};

const sendInsuranceInternalAlertEmail = async ({ subscription, planName, to }) => {
  const adminEmail = to || (await getNotificationEmail('insuranceAlertEmail', 'hello.aniheal@gmail.com'));
  const body = `
    <h2 style="margin: 0 0 12px 0; color: #14532d; font-size: 20px; font-weight: 700;">
      🛡️ New Insurance Policy Application: ${subscription.applicationNumber}
    </h2>
    <p style="margin: 0 0 16px 0; color: #475569; font-size: 14px;">
      Applicant: <strong>${subscription.applicantName}</strong> (${subscription.applicantPhone}) | County: <strong>${subscription.county}</strong><br>
      Plan: <strong>${planName}</strong> | Species: <strong>${subscription.species}</strong> (${subscription.animalCount} head)
    </p>
    <div style="text-align: center; margin: 24px 0;">
      <a href="tel:${subscription.applicantPhone}" style="display: inline-block; background-color: #14532d; color: #ffffff; text-decoration: none; font-size: 13px; font-weight: 700; padding: 12px 24px; border-radius: 50px; margin-right: 8px;">
        📞 Call Applicant
      </a>
      <a href="https://aniheal.co.ke/admin/insurance" style="display: inline-block; background-color: #16a34a; color: #ffffff; text-decoration: none; font-size: 13px; font-weight: 700; padding: 12px 24px; border-radius: 50px;">
        Convert to Policy &rarr;
      </a>
    </div>
  `;

  const html = wrapEmailTemplate({
    title: `[Insurance Application] ${subscription.applicationNumber}`,
    preheader: 'Underwriting Desk Alert',
    bodyHtml: body,
  });

  return sendEmailWithFallback({
    to: adminEmail,
    subject: `🛡️ [NEW INSURANCE] ${subscription.applicationNumber} - ${subscription.applicantName} (${subscription.species})`,
    html,
    logLabel: 'INTERNAL_INSURANCE_ALERT',
  });
};

const buildInsurancePolicyActivatedEmailHtml = ({ policy, owner, animal, plan }) => {
  const startDateStr = new Date(policy.startDate || Date.now()).toLocaleDateString('en-KE', {
    dateStyle: 'medium',
  });
  const expiryDateStr = new Date(policy.expiryDate || Date.now()).toLocaleDateString('en-KE', {
    dateStyle: 'medium',
  });

  const body = `
    <h2 style="margin: 0 0 12px 0; color: #14532d; font-size: 20px; font-weight: 700;">
      🎉 Insurance Policy Activated: ${policy.policyNumber}
    </h2>
    <p style="margin: 0 0 20px 0; color: #475569; font-size: 14px; line-height: 1.6;">
      Dear <strong>${owner.name}</strong>,<br>
      Congratulations! Your AniHeal Animal Care Insurance coverage has been officially activated. Your policy certificate details are listed below:
    </p>

    <!-- Certificate Card -->
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color: #f8fafc; border: 2px solid #16a34a; border-radius: 14px; margin: 20px 0; overflow: hidden;">
      <tr style="background-color: #14532d;">
        <td colspan="2" style="padding: 12px 18px; color: #ffffff; font-size: 14px; font-weight: 700;">
          Official Certificate of Veterinary Insurance Coverage
        </td>
      </tr>
      <tr>
        <td style="padding: 12px 18px; border-bottom: 1px solid #e2e8f0; font-size: 13px; color: #64748b; font-weight: 600; width: 38%;">
          Policy Number:
        </td>
        <td style="padding: 12px 18px; border-bottom: 1px solid #e2e8f0; font-size: 15px; color: #14532d; font-weight: 800; font-family: monospace;">
          ${policy.policyNumber}
        </td>
      </tr>
      <tr>
        <td style="padding: 12px 18px; border-bottom: 1px solid #e2e8f0; font-size: 13px; color: #64748b; font-weight: 600;">
          Insured Animal:
        </td>
        <td style="padding: 12px 18px; border-bottom: 1px solid #e2e8f0; font-size: 13px; color: #0f172a; font-weight: 700;">
          ${animal?.animalName || 'Insured Animal'} (Tag / Chip: ${animal?.tagOrChipId || 'N/A'})
        </td>
      </tr>
      <tr>
        <td style="padding: 12px 18px; border-bottom: 1px solid #e2e8f0; font-size: 13px; color: #64748b; font-weight: 600;">
          Coverage Limit:
        </td>
        <td style="padding: 12px 18px; border-bottom: 1px solid #e2e8f0; font-size: 14px; color: #16a34a; font-weight: 800;">
          KES ${(policy.coverageLimit || 150000).toLocaleString()}
        </td>
      </tr>
      <tr>
        <td style="padding: 12px 18px; border-bottom: 1px solid #e2e8f0; font-size: 13px; color: #64748b; font-weight: 600;">
          Premium &amp; Billing:
        </td>
        <td style="padding: 12px 18px; border-bottom: 1px solid #e2e8f0; font-size: 13px; color: #0f172a;">
          KES ${(policy.premium || 0).toLocaleString()} / ${policy.billingPeriod || 'monthly'}
        </td>
      </tr>
      <tr>
        <td style="padding: 12px 18px; font-size: 13px; color: #64748b; font-weight: 600;">
          Coverage Term:
        </td>
        <td style="padding: 12px 18px; font-size: 13px; color: #0f172a;">
          ${startDateStr} to ${expiryDateStr}
        </td>
      </tr>
    </table>
  `;

  const alertBox = `
    <div style="background-color: #f0fdf4; border-left: 4px solid #16a34a; border-radius: 8px; padding: 14px 16px; margin-top: 20px;">
      <h4 style="margin: 0 0 6px 0; color: #14532d; font-size: 13px; font-weight: 700;">Emergency Veterinary Care &amp; Claims</h4>
      <p style="margin: 0; font-size: 12px; color: #166534; line-height: 1.5;">
        Whenever clinical attention is required, quote Policy <strong>${policy.policyNumber}</strong> to any authorized AniHeal vet for cashless treatment according to your benefit schedule.
      </p>
    </div>
  `;

  return wrapEmailTemplate({
    title: `Certificate of Insurance ${policy.policyNumber}`,
    preheader: 'Active Policy Certificate',
    bodyHtml: body,
    alertBoxHtml: alertBox,
  });
};

const sendInsurancePolicyActivatedEmail = async ({ to, policy, owner, animal, plan }) => {
  if (!to) return { success: false, reason: 'No recipient email' };
  const html = buildInsurancePolicyActivatedEmailHtml({ policy, owner, animal, plan });
  return sendEmailWithFallback({
    to,
    subject: `🎉 AniHeal Policy Certificate Activated: ${policy.policyNumber}`,
    html,
    logLabel: 'POLICY_ACTIVATED',
  });
};

module.exports = {
  // OTP
  sendOtpEmail,
  buildOtpEmailHtml,
  // Staff account
  sendAccountCreatedEmail,
  buildAccountCreatedEmailHtml,
  // Password change
  sendPasswordChangedEmail,
  buildPasswordChangedEmailHtml,
  // Appointments
  sendAppointmentConfirmationEmail,
  sendAppointmentInternalAlertEmail,
  sendAppointmentStatusUpdateEmail,
  // Product orders
  sendOrderConfirmationEmail,
  sendOrderInternalAlertEmail,
  sendOrderStatusUpdateEmail,
  // Insurance
  sendInsuranceSubscriptionEmail,
  sendInsuranceInternalAlertEmail,
  sendInsurancePolicyActivatedEmail,
};
