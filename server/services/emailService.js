const nodemailer = require("nodemailer");
require("dotenv").config();

let transporter = null;

function initMailer() {
  const user =
    process.env.SMTP_GMAIL_USER || "shravaniraut2324@ternaengg.ac.in";
  const pass = process.env.SMTP_GMAIL_APP_PASSWORD;

  if (pass) {
    transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: user,
        pass: pass,
      },
    });
    console.log(`Nodemailer initialized with Gmail SMTP (${user})`);
  } else {
    console.log(
      "SMTP App Password not set in .env. Email service will run in simulation mode (logging emails to console).",
    );
  }
}

initMailer();

/**
 * Send confirmation email to student after form submission
 */
async function sendSubmissionConfirmation({
  studentEmail,
  studentName,
  tu4fId,
  applicationId,
  department,
  status,
  driveFolderUrl,
}) {
  const subject = `[HEC] Application Received — ${studentName} (${applicationId || tu4fId})`;
  const html = `
        <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
            <div style="background: linear-gradient(135deg, #1e1b4b 0%, #312e81 100%); color: #ffffff; padding: 24px; text-align: center;">
                <h1 style="margin: 0; font-size: 22px;">Terna Engineering College</h1>
                <p style="margin: 4px 0 0; font-size: 14px; color: #c7d2fe;">Higher Education Cell (HEC)</p>
            </div>
            <div style="padding: 24px; color: #334155; line-height: 1.6;">
                <p>Dear <strong>${studentName}</strong>,</p>
                <p>Thank you for submitting your higher education application details to the Higher Education Cell.</p>
                
                <div style="background-color: #f8fafc; border-left: 4px solid #4f46e5; padding: 16px; margin: 20px 0; border-radius: 4px;">
                    <p style="margin: 0 0 8px;"><strong>Application ID:</strong> ${applicationId || "Pending"}</p>
                    <p style="margin: 0 0 8px;"><strong>TU4F ID:</strong> ${tu4fId}</p>
                    <p style="margin: 0 0 8px;"><strong>Department:</strong> ${department}</p>
                    <p style="margin: 0 0 8px;"><strong>Status:</strong> <span style="text-transform: capitalize; font-weight: bold; color: ${status === "completed" ? "#16a34a" : status === "partial" ? "#d97706" : "#dc2626"};">${status}</span></p>
                    ${driveFolderUrl ? `<p style="margin: 0;"><strong>Documents Folder:</strong> <a href="${driveFolderUrl}" target="_blank" style="color: #4f46e5; font-weight: bold;">View Uploaded Files</a></p>` : ""}
                </div>

                <p>Our faculty in-charge will review your submitted documents. If any required documents are missing, you will receive a follow-up email from HEC.</p>
                <p>Best regards,<br><strong>Higher Education Cell</strong><br>Terna Engineering College</p>
            </div>
            <div style="background-color: #f1f5f9; padding: 12px 24px; text-align: center; font-size: 12px; color: #64748b;">
                This is an automated notification from TEC Higher Education Cell.
            </div>
        </div>
    `;

  if (transporter && studentEmail) {
    try {
      await transporter.sendMail({
        from: `"TEC Higher Education Cell" <${process.env.SMTP_GMAIL_USER || "shravaniraut2324@ternaengg.ac.in"}>`,
        to: studentEmail,
        subject: subject,
        html: html,
      });
      console.log(`Confirmation email sent to ${studentEmail}`);
      return true;
    } catch (err) {
      console.error(`Failed to send email to ${studentEmail}:`, err.message);
      return false;
    }
  } else {
    console.log(`[SIMULATION EMAIL] To: ${studentEmail} | Subject: ${subject}`);
    return true;
  }
}

async function sendCorrectionRequired({
  studentEmail,
  studentName,
  applicationId,
  reason,
  correctionUrl,
}) {
  const subject = `[HEC] Correction required for ${applicationId}`;
  const html = `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #334155; line-height: 1.6;">
        <h2>Higher Education Cell - Correction Required</h2>
        <p>Dear <strong>${studentName}</strong>,</p>
        <p>Your application <strong>${applicationId}</strong> needs a correction before it can be approved.</p>
        <p><strong>Reason:</strong> ${reason}</p>
        <p><a href="${correctionUrl}" style="display:inline-block;padding:12px 18px;background:#4f46e5;color:#fff;text-decoration:none;border-radius:6px;">Open secure correction form</a></p>
        <p>This secure link expires in 48 hours and can be used once.</p>
    </div>`;
  return sendMailOrSimulate({
    to: studentEmail,
    subject,
    html,
    label: "CORRECTION REQUIRED",
  });
}

async function sendApprovalEmail({ studentEmail, studentName, applicationId }) {
  const subject = `[HEC] Application approved - ${applicationId}`;
  const html = `<p>Dear <strong>${studentName}</strong>,</p><p>Your Higher Education Cell application <strong>${applicationId}</strong> has been approved by the HEC team.</p>`;
  return sendMailOrSimulate({
    to: studentEmail,
    subject,
    html,
    label: "APPROVAL",
  });
}

async function sendRejectionEmail({
  studentEmail,
  studentName,
  applicationId,
  reason,
}) {
  const subject = `[HEC] Application update - ${applicationId}`;
  const html = `<p>Dear <strong>${studentName}</strong>,</p><p>Your application <strong>${applicationId}</strong> was rejected after review.</p><p><strong>Reason:</strong> ${reason || "Please contact the Higher Education Cell for details."}</p>`;
  return sendMailOrSimulate({
    to: studentEmail,
    subject,
    html,
    label: "REJECTION",
  });
}

async function sendMailOrSimulate({ to, subject, html, label }) {
  if (transporter && to) {
    try {
      await transporter.sendMail({
        from: `"TEC Higher Education Cell" <${process.env.SMTP_GMAIL_USER}>`,
        to,
        subject,
        html,
      });
      return true;
    } catch (error) {
      console.error(`Failed to send ${label} email:`, error.message);
      return false;
    }
  }
  console.log(`[SIMULATION ${label}] To: ${to} | Subject: ${subject}`);
  return true;
}

/**
 * Send document reminder email to student
 */
async function sendDocumentReminder({
  studentEmail,
  studentName,
  tu4fId,
  status,
  notes,
}) {
  const subject = `[ACTION REQUIRED] HEC Document Submission Reminder — ${studentName}`;
  const html = `
        <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
            <div style="background: linear-gradient(135deg, #7c2d12 0%, #9a3412 100%); color: #ffffff; padding: 24px; text-align: center;">
                <h1 style="margin: 0; font-size: 22px;">Terna Engineering College</h1>
                <p style="margin: 4px 0 0; font-size: 14px; color: #ffedd5;">Higher Education Cell (HEC) — Document Reminder</p>
            </div>
            <div style="padding: 24px; color: #334155; line-height: 1.6;">
                <p>Dear <strong>${studentName}</strong> (${tu4fId}),</p>
                <p>This is a reminder from the Higher Education Cell regarding your higher education documentation submission.</p>
                
                <div style="background-color: #fff7ed; border-left: 4px solid #ea580c; padding: 16px; margin: 20px 0; border-radius: 4px;">
                    <p style="margin: 0 0 8px;"><strong>Current Submission Status:</strong> <span style="color: #c2410c; font-weight: bold; text-transform: capitalize;">${status}</span></p>
                    ${notes ? `<p style="margin: 0;"><strong>Faculty Note:</strong> ${notes}</p>` : '<p style="margin: 0;">Please submit your missing score card, hall ticket, or university offer letter to complete your record.</p>'}
                </div>

                <p>Kindly submit your missing documents at the earliest to update your status to <strong>Completed</strong>.</p>
                <p>Best regards,<br><strong>Higher Education Cell</strong><br>Terna Engineering College</p>
            </div>
        </div>
    `;

  if (transporter && studentEmail) {
    try {
      await transporter.sendMail({
        from: `"TEC Higher Education Cell" <${process.env.SMTP_GMAIL_USER || "shravaniraut2324@ternaengg.ac.in"}>`,
        to: studentEmail,
        subject: subject,
        html: html,
      });
      console.log(`Reminder email sent to ${studentEmail}`);
      return true;
    } catch (err) {
      console.error(
        `Failed to send reminder email to ${studentEmail}:`,
        err.message,
      );
      return false;
    }
  } else {
    console.log(
      `[SIMULATION REMINDER] To: ${studentEmail} | Subject: ${subject}`,
    );
    return true;
  }
}

/**
 * Notify the HEC admin when uploaded document verification needs attention.
 */
async function sendDocumentVerificationAlert({
  applicationId,
  studentName,
  studentEmail,
  issues,
}) {
  const adminEmail = process.env.ADMIN_EMAIL || process.env.SMTP_GMAIL_USER;
  const subject = `[HEC] Document verification alert - ${applicationId}`;
  const issueRows = (issues || [])
    .map(
      (issue) =>
        `<li><strong>${issue.documentType}</strong> (${issue.fileName}): ${issue.reason}</li>`,
    )
    .join("");
  const html = `<div style="font-family: Arial, sans-serif; line-height: 1.6; color: #334155;">
    <h2>Document verification requires attention</h2>
    <p>Application <strong>${applicationId}</strong> for <strong>${studentName}</strong> (${studentEmail}) has document verification issues.</p>
    <ul>${issueRows}</ul>
    <p>Please review the uploaded documents in the admin dashboard.</p>
  </div>`;

  return sendMailOrSimulate({
    to: adminEmail,
    subject,
    html,
    label: "DOCUMENT VERIFICATION ALERT",
  });
}

/**
 * Send Alumni Connect request email
 */
async function sendAlumniConnectRequest({
  alumniEmail,
  alumniName,
  studentName,
  studentEmail,
  studentPhone,
  studentBranch,
  targetCountry,
  message,
}) {
  const subject = `[Alumni Mentorship Request] A student from Terna Engg College would like to connect!`;
  const html = `
        <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden;">
            <div style="background: linear-gradient(135deg, #0f766e 0%, #115e59 100%); color: #ffffff; padding: 24px; text-align: center;">
                <h1 style="margin: 0; font-size: 22px;">Terna Engineering College</h1>
                <p style="margin: 4px 0 0; font-size: 14px; color: #ccfbf1;">Alumni Mentorship Network</p>
            </div>
            <div style="padding: 24px; color: #334155; line-height: 1.6;">
                <p>Hello <strong>${alumniName}</strong>,</p>
                <p>A junior student from Terna Engineering College is seeking your guidance for higher studies in <strong>${targetCountry || "abroad"}</strong>!</p>
                
                <div style="background-color: #f0fdf4; border-left: 4px solid #0d9488; padding: 16px; margin: 20px 0; border-radius: 4px;">
                    <p style="margin: 0 0 8px;"><strong>Student Name:</strong> ${studentName}</p>
                    <p style="margin: 0 0 8px;"><strong>Branch:</strong> ${studentBranch}</p>
                    <p style="margin: 0 0 8px;"><strong>Email:</strong> <a href="mailto:${studentEmail}">${studentEmail}</a></p>
                    ${studentPhone ? `<p style="margin: 0 0 8px;"><strong>Phone:</strong> ${studentPhone}</p>` : ""}
                    <p style="margin: 8px 0 0;"><strong>Message:</strong></p>
                    <p style="margin: 4px 0 0; font-style: italic; color: #1e293b;">"${message}"</p>
                </div>

                <p>If you'd be happy to share your advice, please reply directly to <a href="mailto:${studentEmail}">${studentEmail}</a>.</p>
                <p>Thank you for giving back to the Terna community!</p>
                <p>Best regards,<br><strong>Higher Education Cell</strong><br>Terna Engineering College</p>
            </div>
        </div>
    `;

  if (transporter && alumniEmail) {
    try {
      await transporter.sendMail({
        from: `"TEC Higher Education Cell" <${process.env.SMTP_GMAIL_USER || "shravaniraut2324@ternaengg.ac.in"}>`,
        to: alumniEmail,
        subject: subject,
        html: html,
        replyTo: studentEmail,
      });
      console.log(`Alumni connect request sent to ${alumniEmail}`);
      return true;
    } catch (err) {
      console.error(
        `Failed to send connect request to ${alumniEmail}:`,
        err.message,
      );
      return false;
    }
  } else {
    console.log(
      `[SIMULATION ALUMNI CONNECT] To: ${alumniEmail} | Student: ${studentName} <${studentEmail}>`,
    );
    return true;
  }
}

module.exports = {
  sendSubmissionConfirmation,
  sendDocumentReminder,
  sendDocumentVerificationAlert,
  sendAlumniConnectRequest,
  sendCorrectionRequired,
  sendApprovalEmail,
  sendRejectionEmail,
};
