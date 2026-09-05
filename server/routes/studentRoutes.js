const express = require("express");
const router = express.Router();
const crypto = require("crypto");
const pool = require("../config/db");
const upload = require("../middleware/upload");
const auth = require("../middleware/auth");
const driveService = require("../services/driveService");
const emailService = require("../services/emailService");
const excelService = require("../services/excelService");
const aiVerificationService = require("../services/aiVerificationService");
const correctionService = require("../services/correctionService");
const fs = require("fs");
const path = require("path");

const documentFields = [
  { name: "score_card", maxCount: 1 },
  { name: "scoreCard", maxCount: 1 },
  { name: "hall_ticket", maxCount: 1 },
  { name: "hallTicket", maxCount: 1 },
  { name: "offer_letter", maxCount: 1 },
  { name: "offerLetter", maxCount: 1 },
  { name: "transcript", maxCount: 1 },
  { name: "marksheet", maxCount: 1 },
  { name: "other_docs", maxCount: 5 },
  { name: "otherDocs", maxCount: 5 },
];

const fieldToDocumentType = (field) => {
  if (field === "score_card" || field === "scoreCard") return "score_card";
  if (field === "hall_ticket" || field === "hallTicket") return "hall_ticket";
  if (field === "offer_letter" || field === "offerLetter")
    return "offer_letter";
  if (field === "transcript" || field === "marksheet") return "transcript";
  return "other";
};

const safeName = (value) =>
  String(value || "document")
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .slice(0, 120);
const hasFiles = (files, type) =>
  Object.entries(files || {}).some(
    ([field, values]) =>
      fieldToDocumentType(field) === type && values.length > 0,
  );
const calculateInitialStatus = (files) =>
  hasFiles(files, "offer_letter") &&
  (hasFiles(files, "score_card") || hasFiles(files, "hall_ticket"))
    ? "under_review"
    : "submitted";
const toBoolean = (value) =>
  value === true || value === "true" || value === "Yes";

function createApplicationId(passoutYear, department, id) {
  return `HEC-${passoutYear || new Date().getFullYear()}-${String(department || "GEN").toUpperCase()}-${String(id).padStart(5, "0")}`;
}

async function addStudentToAlumni(connection, student) {
  await connection.query(
    `INSERT INTO alumni (name, branch, passout_year, pg_university, pg_course, pg_country, email, phone, source_student_id, alumni_status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'active')
     ON DUPLICATE KEY UPDATE name = VALUES(name), pg_university = VALUES(pg_university), pg_course = VALUES(pg_course), pg_country = VALUES(pg_country), email = VALUES(email), phone = VALUES(phone), alumni_status = 'active'`,
    [
      student.name,
      student.department,
      student.passout_year,
      student.university || student.institute_admitted,
      student.pg_course,
      student.country,
      student.email,
      student.contact_no,
      student.id,
    ],
  );
}

async function processFiles(connection, student, files, isApproved = false) {
  if (!files || Object.keys(files).length === 0) return [];
  const issues = [];
  const verificationResults = [];
  const folderName = `${student.application_id}_${safeName(student.name)}`;
  const uploadsDir = path.join(__dirname, "..", "uploads", folderName);
  fs.mkdirSync(uploadsDir, { recursive: true });

  for (const [field, values] of Object.entries(files)) {
    for (const file of values) {
      const docType = fieldToDocumentType(field);
      const storedFilename = `${Date.now()}_${safeName(docType)}_${safeName(file.originalname)}`;
      const filePath = path.join(uploadsDir, storedFilename);
      fs.writeFileSync(filePath, file.buffer);

      let verification = {
        verificationStatus: "unverified",
        verificationResult: null,
        ocrText: null,
      };
      const extraction = await aiVerificationService.extractDocumentText(
        file.buffer,
        file.mimetype,
      );
      const structured = await aiVerificationService.verifyDocument({
        fileBuffer: file.buffer,
        mimeType: file.mimetype,
        documentType: docType,
        enteredData: {
          name: student.name,
          university: student.university || student.institute_admitted,
          department: student.department,
          course: student.pg_course,
          examName: student.entrance_exam_name,
          passingYear: student.passout_year,
          entranceScore: student.entrance_exam_score,
          tu4fId: student.tu4f_id,
        },
        extraction,
      });
      const statusMap = {
        verified: "pass",
        mismatch: "mismatch",
        needs_review: "manual_review",
      };
      verification = {
        verificationStatus: statusMap[structured.overallStatus] || "warning",
        verificationResult: structured,
        ocrText: structured.extractedText || extraction.text,
      };
      verificationResults.push({
        documentType: docType,
        fileName: file.originalname,
        ...structured,
      });
      if (structured.overallStatus !== "verified") {
        issues.push({
          documentType: docType,
          fileName: file.originalname,
          reason: structured.issues?.join(", ") || structured.summary,
        });
      }

      const storedPath = path
        .relative(path.join(__dirname, ".."), filePath)
        .replace(/\\/g, "/");
      await connection.query(
        `
                INSERT INTO documents (student_id, doc_type, original_name, file_name, file_path, file_size, mime_type, ocr_text, ocr_result, ai_verification_result, verification_status)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `,
        [
          student.id,
          docType,
          file.originalname,
          storedFilename,
          storedPath,
          file.size,
          file.mimetype,
          verification.ocrText,
          JSON.stringify({
            engine: extraction.engine,
            status: extraction.status,
          }),
          JSON.stringify(verification.verificationResult),
          verification.verificationStatus,
        ],
      );

      if (isApproved && student.drive_folder_id) {
        const driveFile = await driveService.uploadFileToDriveFolder(
          file,
          student.drive_folder_id,
          docType,
        );
        if (driveFile?.webViewLink) {
          await connection.query(
            "UPDATE documents SET file_path = ? WHERE student_id = ? AND file_name = ?",
            [driveFile.webViewLink, student.id, storedFilename],
          );
        }
      }
    }
  }
  const mismatches = verificationResults.filter(
    (result) => result.overallStatus === "mismatch",
  );
  const needsReview = verificationResults.some(
    (result) => result.overallStatus === "needs_review",
  );
  const overallStatus = mismatches.length
    ? "mismatch"
    : needsReview
      ? "needs_review"
      : verificationResults.length
        ? "verified"
        : "unverified";
  await connection.query(
    "UPDATE students SET ai_verification_result = ?, ai_confidence = ?, ai_issues = ?, ai_verification_status = ?, ai_verification_notes = ? WHERE id = ?",
    [
      JSON.stringify({ overallStatus, documents: verificationResults }),
      verificationResults.length
        ? Math.round(
            verificationResults.reduce(
              (total, result) => total + Number(result.confidence || 0),
              0,
            ) / verificationResults.length,
          )
        : 0,
      JSON.stringify(issues),
      overallStatus === "verified"
        ? "verified"
        : overallStatus === "mismatch"
          ? "discrepancy_detected"
          : overallStatus === "needs_review"
            ? "manual_check_needed"
            : "unverified",
      issues
        .map((issue) => `${issue.documentType}: ${issue.reason}`)
        .join(" | "),
      student.id,
    ],
  );
  return issues;
}

const applicationUpload = upload.fields(documentFields);

// Public student submission. No student account is required.
router.post("/", applicationUpload, async (req, res) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const body = req.body;
    const tu4f_id = String(body.tu4f_id || body.tu4fId || "").trim();
    const name = String(body.name || "").trim();
    const department = String(body.department || "").trim();
    const email = String(body.email || "")
      .trim()
      .toLowerCase();
    const admission_year =
      parseInt(body.admission_year || body.admissionYear, 10) ||
      new Date().getFullYear() - 4;
    const passout_year =
      parseInt(body.passout_year || body.passoutYear, 10) ||
      new Date().getFullYear();
    if (!tu4f_id || !name || !department || !email)
      return res.status(400).json({
        message: "TU4F ID, name, department, and email are required.",
      });

    const [existing] = await connection.query(
      "SELECT application_id, status FROM students WHERE tu4f_id = ? OR email = ? LIMIT 1",
      [tu4f_id, email],
    );
    if (existing.length)
      return res.status(409).json({
        message: `An application already exists for this TU4F ID or email. Use the correction link from your email if changes are required.`,
        applicationId: existing[0].application_id,
      });

    const files = req.files || {};
    const [result] = await connection.query(
      `
            INSERT INTO students (tu4f_id, name, university, department, admission_year, passout_year, ug_duration, contact_no, email, applying_for, higher_education, entrance_exam_appeared, entrance_exam_name, entrance_exam_score, country, institute_admitted, pg_duration, pg_course, status, ai_verification_status)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
      [
        tu4f_id,
        name,
        body.university || body.universityName || null,
        department,
        admission_year,
        passout_year,
        body.ug_duration || body.ugDuration || null,
        body.contact_no || body.contactNo || null,
        email,
        body.applying_for || body.applyingFor || null,
        toBoolean(body.higher_education || body.pursuingHigherEd),
        toBoolean(body.entrance_exam_appeared || body.appearedForExam),
        body.entrance_exam_name || body.examName || null,
        body.entrance_exam_score || body.examScore || null,
        body.country || null,
        body.institute_admitted || body.instituteAdmitted || null,
        body.pg_duration || body.pgDuration || null,
        body.pg_course || body.pgCourse || null,
        calculateInitialStatus(files),
        "unverified",
      ],
    );

    const applicationId = createApplicationId(
      passout_year,
      department,
      result.insertId,
    );
    await connection.query(
      "UPDATE students SET application_id = ? WHERE id = ?",
      [applicationId, result.insertId],
    );
    const [students] = await connection.query(
      "SELECT * FROM students WHERE id = ?",
      [result.insertId],
    );
    const student = students[0];
    const verificationIssues = await processFiles(connection, student, files);
    if (verificationIssues.length) {
      await connection.query(
        "UPDATE students SET status = 'under_review', ai_verification_notes = ? WHERE id = ?",
        [
          `Document verification requires attention: ${verificationIssues.map((issue) => issue.reason).join(" | ")}`,
          student.id,
        ],
      );
    }
    await connection.commit();

    emailService
      .sendSubmissionConfirmation({
        studentEmail: email,
        studentName: name,
        applicationId,
        tu4fId: tu4f_id,
        department,
        status: student.status,
      })
      .catch((error) =>
        console.error("Submission email failed:", error.message),
      );
    res.status(201).json({
      message: "Application submitted successfully",
      applicationId,
      status: student.status,
    });
  } catch (error) {
    await connection.rollback();
    console.error(error);
    res
      .status(500)
      .json({ message: "Internal server error", error: error.message });
  } finally {
    connection.release();
  }
});

// Secure correction access. The token is never stored in plaintext.
router.get("/correction/:token", async (req, res) => {
  try {
    const tokenHash = correctionService.hashCorrectionToken(req.params.token);
    const [rows] = await pool.query(
      "SELECT id, application_id, name, email, correction_reason, status FROM students WHERE correction_token_hash = ? AND correction_token_expires_at > NOW()",
      [tokenHash],
    );
    if (!rows.length)
      return res
        .status(404)
        .json({ message: "Correction link is invalid or expired." });
    res.json({ data: rows[0] });
  } catch (error) {
    res.status(500).json({ message: "Unable to open correction link." });
  }
});

router.post("/correction/:token", applicationUpload, async (req, res) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const tokenHash = correctionService.hashCorrectionToken(req.params.token);
    const [rows] = await connection.query(
      "SELECT * FROM students WHERE correction_token_hash = ? AND correction_token_expires_at > NOW()",
      [tokenHash],
    );
    if (!rows.length)
      return res
        .status(404)
        .json({ message: "Correction link is invalid or expired." });
    const student = rows[0];
    const allowed = {
      name: req.body.name,
      email: req.body.email,
      university: req.body.university,
      contact_no: req.body.contactNo,
      country: req.body.country,
      applying_for: req.body.applyingFor,
      institute_admitted: req.body.instituteAdmitted,
      pg_course: req.body.pgCourse,
      pg_duration: req.body.pgDuration,
      entrance_exam_name: req.body.examName,
      entrance_exam_score: req.body.examScore,
    };
    const updates = Object.entries(allowed)
      .filter(([, value]) => value !== undefined)
      .map(([key]) => `${key} = ?`);
    const values = Object.entries(allowed)
      .filter(([, value]) => value !== undefined)
      .map(([, value]) => value);
    updates.push(
      "status = ?",
      "correction_token_hash = NULL",
      "correction_token_expires_at = NULL",
      "correction_used_at = NOW()",
    );
    values.push("under_review");
    await connection.query(
      `UPDATE students SET ${updates.join(", ")} WHERE id = ?`,
      [...values, student.id],
    );
    const verificationIssues = await processFiles(
      connection,
      {
        ...student,
        ...Object.fromEntries(
          Object.entries(allowed).filter(([, value]) => value !== undefined),
        ),
      },
      req.files || {},
    );
    if (verificationIssues.length) {
      await connection.query(
        "UPDATE students SET status = 'under_review', ai_verification_notes = ? WHERE id = ?",
        [
          `Document verification requires attention: ${verificationIssues.map((issue) => issue.reason).join(" | ")}`,
          student.id,
        ],
      );
    }
    await connection.commit();
    res.json({
      message: "Correction submitted for review.",
      applicationId: student.application_id,
    });
  } catch (error) {
    await connection.rollback();
    console.error(error);
    res.status(500).json({ message: "Unable to submit correction." });
  } finally {
    connection.release();
  }
});

router.post("/:id/send-reminder", auth, async (req, res) => {
  try {
    const [rows] = await pool.query("SELECT * FROM students WHERE id = ?", [
      req.params.id,
    ]);
    if (!rows.length) {
      await connection.rollback();
      connection.release();
      return res.status(404).json({ message: "Student not found" });
    }
    const student = rows[0];
    await emailService.sendDocumentReminder({
      studentEmail: student.email,
      studentName: student.name,
      tu4fId: student.tu4f_id,
      status: student.status,
      notes: student.notes,
    });
    res.json({ message: "Reminder email sent" });
  } catch (error) {
    res.status(500).json({ message: "Failed to send reminder email" });
  }
});

router.get("/stats/summary", auth, async (req, res) => {
  try {
    const [rows] = await pool.query(
      "SELECT status, COUNT(*) AS count FROM students GROUP BY status",
    );
    const [total] = await pool.query("SELECT COUNT(*) AS count FROM students");
    const stats = Object.fromEntries(
      rows.map((row) => [row.status, row.count]),
    );
    res.json({ total: total[0].count, ...stats, by_status: rows });
  } catch (error) {
    res.status(500).json({ message: "Unable to load statistics" });
  }
});

router.get("/", auth, async (req, res) => {
  try {
    const {
      status,
      application_status,
      department,
      country,
      passout_year,
      review_status,
      ai_verification_status,
      ai_status,
      search,
      page = 1,
      limit = 10,
    } = req.query;
    let query = "SELECT * FROM students WHERE 1=1";
    const params = [];
    const add = (clause, value) => {
      if (value) {
        query += ` AND ${clause}`;
        params.push(value);
      }
    };
    add("status = ?", application_status || status);
    add("department = ?", department);
    add("country = ?", country);
    add("passout_year = ?", passout_year);
    add("review_status = ?", review_status);
    add(
      "ai_verification_status = ?",
      ai_verification_status ||
        (ai_status === "verified"
          ? "verified"
          : ai_status === "mismatch"
            ? "discrepancy_detected"
            : ai_status === "needs_review"
              ? "manual_check_needed"
              : undefined),
    );
    if (search) {
      query +=
        " AND (application_id LIKE ? OR name LIKE ? OR tu4f_id LIKE ? OR email LIKE ?)";
      params.push(`%${search}%`, `%${search}%`, `%${search}%`, `%${search}%`);
    }
    query += " ORDER BY created_at DESC";
    const offset = (Number(page) - 1) * Number(limit);
    const [students] = await pool.query(`${query} LIMIT ? OFFSET ?`, [
      ...params,
      Number(limit),
      offset,
    ]);
    const [count] = await pool.query(
      `SELECT COUNT(*) AS count FROM (${query}) AS filtered`,
      params,
    );
    for (const student of students) {
      const [docs] = await pool.query(
        "SELECT COUNT(*) AS count FROM documents WHERE student_id = ?",
        [student.id],
      );
      student.document_count = docs[0].count;
    }
    res.json({
      data: students,
      total: count[0].count,
      page: Number(page),
      limit: Number(limit),
    });
  } catch (error) {
    res.status(500).json({ message: "Unable to load applications" });
  }
});

router.get("/:id", auth, async (req, res) => {
  try {
    const [students] = await pool.query("SELECT * FROM students WHERE id = ?", [
      req.params.id,
    ]);
    if (!students.length)
      return res.status(404).json({ message: "Student not found" });
    const [documents] = await pool.query(
      "SELECT * FROM documents WHERE student_id = ?",
      [req.params.id],
    );
    res.json({ ...students[0], documents });
  } catch (error) {
    res.status(500).json({ message: "Unable to load application" });
  }
});

router.post("/:id/review/start", auth, async (req, res) => {
  await pool.query(
    "UPDATE students SET status = 'under_review' WHERE id = ? AND status NOT IN ('approved','rejected')",
    [req.params.id],
  );
  res.json({ message: "Review started" });
});

router.post("/:id/review/correction", auth, async (req, res) => {
  const reason = String(req.body.reason || "").trim();
  if (!reason)
    return res
      .status(400)
      .json({ message: "A correction reason is required." });
  try {
    const { token, tokenHash, expiresAt } =
      correctionService.createCorrectionToken();
    const [rows] = await pool.query("SELECT * FROM students WHERE id = ?", [
      req.params.id,
    ]);
    if (!rows.length)
      return res.status(404).json({ message: "Student not found" });
    const student = rows[0];
    await pool.query(
      "UPDATE students SET status = 'correction_required', correction_reason = ?, correction_token_hash = ?, correction_token_expires_at = ?, correction_requested_at = NOW(), notes = ? WHERE id = ?",
      [reason, tokenHash, expiresAt, req.body.remarks || reason, student.id],
    );
    const baseUrl = process.env.CLIENT_URL || "http://localhost:5173";
    await emailService.sendCorrectionRequired({
      studentEmail: student.email,
      studentName: student.name,
      applicationId: student.application_id,
      reason,
      correctionUrl: `${baseUrl}/correct/${token}`,
    });
    res.json({ message: "Correction request sent" });
  } catch (error) {
    res.status(500).json({ message: "Unable to request correction" });
  }
});

router.post("/:id/review/approve", auth, async (req, res) => {
  const addAlumni =
    req.body?.addAlumni === true || req.body?.addAlumni === "true";
  try {
    const connection = await pool.getConnection();
    await connection.beginTransaction();
    const [rows] = await connection.query(
      "SELECT * FROM students WHERE id = ?",
      [req.params.id],
    );
    if (!rows.length)
      return res.status(404).json({ message: "Student not found" });
    const student = rows[0];
    const folder = await driveService.createApprovedStudentStructure(student);
    if (process.env.HEC_PARENT_FOLDER_ID && !folder) {
      await connection.rollback();
      connection.release();
      return res.status(503).json({
        message:
          "Google Drive is configured but the HEC parent folder could not be accessed. Check the folder ID and share the folder with the service account.",
      });
    }
    await connection.query(
      "UPDATE students SET status = 'approved', approved_at = NOW(), drive_folder_id = ?, drive_folder_url = ?, review_status = 'checked' WHERE id = ?",
      [folder?.id || null, folder?.webViewLink || null, student.id],
    );
    if (addAlumni) await addStudentToAlumni(connection, student);
    await connection.commit();
    connection.release();
    if (folder?.id) {
      console.log(
        `\n========== UPLOADING DOCUMENTS TO GOOGLE DRIVE ==========`,
      );
      console.log(`Student: ${student.name}, Drive Folder ID: ${folder.id}`);
      console.log(`Folder Name: ${folder.name}`);
      console.log(`Folder Link: ${folder.webViewLink}`);

      const [documents] = await pool.query(
        "SELECT * FROM documents WHERE student_id = ? ORDER BY uploaded_at ASC",
        [req.params.id],
      );
      let uploadFailures = 0;
      console.log(
        `\n📋 Total documents found in database: ${documents.length}`,
      );

      if (documents.length === 0) {
        console.warn(
          `⚠️  WARNING: No documents found for this student in database!`,
        );
        console.log(`This means files were not saved during form submission.`);
      }

      for (let i = 0; i < documents.length; i++) {
        const doc = documents[i];
        console.log(`\n--- Document ${i + 1}/${documents.length} ---`);
        console.log(`File Name: ${doc.file_name}`);
        console.log(`Original Name: ${doc.original_name}`);
        console.log(`Document Type: ${doc.doc_type}`);
        console.log(`Stored Path: ${doc.file_path}`);
        console.log(
          `Current Path Type: ${doc.file_path?.includes("drive.google.com") ? "Drive Link" : "Local Path"}`,
        );

        // Skip if already has a Drive link
        if (doc.file_path && doc.file_path.includes("drive.google.com")) {
          console.log(`⚠️  Already has Drive link, skipping...`);
          console.log(`   Link: ${doc.file_path}`);
          continue;
        }

        const localPath = path.join(__dirname, "..", doc.file_path);
        console.log(`Full Local Path: ${localPath}`);
        const fileExists = fs.existsSync(localPath);
        console.log(`File Exists: ${fileExists}`);

        if (!fileExists) {
          console.error(`❌ ERROR: Local file NOT found!`);
          console.error(`   Expected at: ${localPath}`);
          console.warn(`   Document will be marked as missing`);
          await pool.query(
            "UPDATE documents SET verification_status = 'manual_review' WHERE id = ?",
            [doc.id],
          );
          uploadFailures += 1;
          continue;
        }

        try {
          const fileStats = fs.statSync(localPath);
          console.log(`✅ File found! Size: ${fileStats.size} bytes`);

          console.log(`\n📤 Uploading to Google Drive...`);
          const driveFile = await driveService.uploadLocalFileToFolder(
            localPath,
            doc.file_name,
            doc.mime_type,
            folder.id,
            doc.doc_type,
          );

          if (driveFile?.id) {
            console.log(`\n✅ UPLOAD SUCCESSFUL!`);
            console.log(`   Drive File ID: ${driveFile.id}`);
            console.log(`   Drive Name: ${driveFile.name}`);
            console.log(`   Drive Link: ${driveFile.webViewLink}`);

            if (driveFile.webViewLink) {
              await pool.query(
                "UPDATE documents SET file_path = ?, verification_status = 'verified' WHERE id = ?",
                [driveFile.webViewLink, doc.id],
              );
              console.log(`✅ Database updated with Drive link`);
            } else {
              console.warn(`⚠️  No webViewLink in response, using file ID`);
              const driveLink = `https://drive.google.com/file/d/${driveFile.id}/view`;
              await pool.query(
                "UPDATE documents SET file_path = ?, verification_status = 'verified' WHERE id = ?",
                [driveLink, doc.id],
              );
              console.log(`✅ Database updated with constructed Drive link`);
            }
          } else {
            console.error(`❌ UPLOAD FAILED!`);
            console.error(`   No file ID returned from Drive API`);
            console.error(`   Drive response: ${JSON.stringify(driveFile)}`);
            uploadFailures += 1;
          }
        } catch (uploadError) {
          uploadFailures += 1;
          console.error(`❌ UPLOAD ERROR for ${doc.file_name}:`);
          console.error(`   Error Message: ${uploadError.message}`);
          console.error(`   Error Type: ${uploadError.constructor.name}`);
          if (uploadError.response?.data) {
            console.error(`   Drive API Response:`, uploadError.response.data);
          }
          console.error(`   Full Error:`, uploadError);
        }
      }
      console.log(`\n========== DOCUMENT UPLOAD COMPLETE ==========\n`);
      if (uploadFailures > 0) {
        await pool.query(
          "UPDATE students SET status = 'approved', review_status = 'checked' WHERE id = ?",
          [student.id],
        );
        return res.status(200).json({
          message: `Application approved, but ${uploadFailures} document(s) could not be uploaded to Google Drive. Check Drive storage and permissions.`,
          driveFolderUrl: folder.webViewLink || null,
          driveUploadFailed: true,
        });
      }
    } else {
      console.warn(
        `⚠️  WARNING: No Drive folder created! Files cannot be uploaded.`,
      );
      console.log(`Check if:`);
      console.log(`  1. HEC_PARENT_FOLDER_ID environment variable is set`);
      console.log(`  2. Service account has access to the parent folder`);
      console.log(`  3. Service account email is shared with folder`);
    }
    await emailService.sendApprovalEmail({
      studentEmail: student.email,
      studentName: student.name,
      applicationId: student.application_id,
    });
    await excelService.syncMasterExcelToDrive();
    res.json({
      message: "Application approved",
      driveFolderUrl: folder?.webViewLink || null,
      addedToAlumni: addAlumni,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Unable to approve application" });
  }
});

router.post("/:id/review/reject", auth, async (req, res) => {
  const reason = String(req.body.reason || "").trim();
  if (!reason)
    return res.status(400).json({ message: "A rejection reason is required." });
  try {
    const [rows] = await pool.query("SELECT * FROM students WHERE id = ?", [
      req.params.id,
    ]);
    if (!rows.length)
      return res.status(404).json({ message: "Student not found" });
    const student = rows[0];
    await pool.query(
      "UPDATE students SET status = 'rejected', rejected_at = NOW(), notes = ?, review_status = 'checked' WHERE id = ?",
      [reason, student.id],
    );
    await emailService.sendRejectionEmail({
      studentEmail: student.email,
      studentName: student.name,
      applicationId: student.application_id,
      reason,
    });
    await excelService.syncMasterExcelToDrive();
    res.json({ message: "Application rejected" });
  } catch (error) {
    res.status(500).json({ message: "Unable to reject application" });
  }
});

router.patch("/:id/status", auth, async (req, res) => {
  const { review_status, status, notes } = req.body;
  const updates = [];
  const params = [];
  if (review_status !== undefined) {
    updates.push("review_status = ?");
    params.push(review_status);
  }
  if (status !== undefined) {
    updates.push("status = ?");
    params.push(status);
  }
  if (notes !== undefined) {
    updates.push("notes = ?");
    params.push(notes);
  }
  if (!updates.length)
    return res.status(400).json({ message: "No valid fields to update" });
  await pool.query(`UPDATE students SET ${updates.join(", ")} WHERE id = ?`, [
    ...params,
    req.params.id,
  ]);
  res.json({ message: "Application updated" });
});

router.delete("/:id", auth, async (req, res) => {
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [rows] = await connection.query(
      "SELECT * FROM students WHERE id = ?",
      [req.params.id],
    );
    if (!rows.length)
      return res.status(404).json({ message: "Student not found" });
    await connection.query("DELETE FROM students WHERE id = ?", [
      req.params.id,
    ]);
    const uploadsDir = path.join(
      __dirname,
      "..",
      "uploads",
      `${rows[0].application_id}_${safeName(rows[0].name)}`,
    );
    if (fs.existsSync(uploadsDir))
      fs.rmSync(uploadsDir, { recursive: true, force: true });
    await connection.commit();
    res.json({ message: "Application deleted" });
  } catch (error) {
    await connection.rollback();
    res.status(500).json({ message: "Unable to delete application" });
  } finally {
    connection.release();
  }
});

// Check Google Drive configuration status
router.get("/drive-status/check", auth, async (req, res) => {
  try {
    console.log("\n========== CHECKING GOOGLE DRIVE STATUS ==========");

    const driveStatus = await driveService.checkParentFolderAccess();

    console.log("Drive Configuration:", driveStatus);

    res.json({
      drive: driveStatus,
      localStorageReady: fs.existsSync(path.join(__dirname, "..", "uploads")),
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Error checking Drive status:", error);
    res.status(500).json({
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});

module.exports = router;
