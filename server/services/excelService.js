const exceljs = require("exceljs");
const pool = require("../config/db");
const driveService = require("./driveService");
const fs = require("fs");
const path = require("path");

let masterSync = Promise.resolve();

/**
 * Generates formatted Excel workbook buffer for all student records
 */
async function generateExcelBuffer() {
  const [students] = await pool.query(
    "SELECT * FROM students ORDER BY created_at DESC",
  );
  const [documents] = await pool.query(`
        SELECT id, student_id, doc_type, original_name, file_name, file_path, file_size, mime_type
        FROM documents
        ORDER BY student_id, uploaded_at, id
    `);
  const documentsByStudent = new Map();

  documents.forEach((document) => {
    const studentDocuments = documentsByStudent.get(document.student_id) || [];
    studentDocuments.push(document);
    documentsByStudent.set(document.student_id, studentDocuments);
  });

  students.forEach((student) => {
    student.documents = documentsByStudent.get(student.id) || [];
    student.document_count = student.documents.length;
  });

  const workbook = new exceljs.Workbook();
  workbook.creator = "TEC Higher Education Cell";
  workbook.created = new Date();

  const worksheet = workbook.addWorksheet("HEC Student Data", {
    views: [{ state: "frozen", ySplit: 1 }],
  });

  worksheet.columns = [
    { header: "Serial No.", key: "serial", width: 10 },
    { header: "Date", key: "date", width: 14 },
    { header: "TU4F ID", key: "tu4f_id", width: 18 },
    { header: "Name", key: "name", width: 25 },
    { header: "Department", key: "department", width: 14 },
    { header: "UG Duration", key: "ug_duration", width: 14 },
    { header: "Contact No", key: "contact_no", width: 16 },
    { header: "Email ID", key: "email", width: 30 },
    { header: "Applying For", key: "applying_for", width: 14 },
    { header: "Exam and Score", key: "exam_score", width: 22 },
    { header: "Country", key: "country", width: 15 },
    { header: "Institute Admitted", key: "institute_admitted", width: 28 },
    { header: "PG Duration", key: "pg_duration", width: 14 },
    { header: "PG Course", key: "pg_course", width: 20 },
    { header: "Documents Uploaded", key: "documents", width: 18 },
    { header: "Drive Folder", key: "drive_folder", width: 24 },
    { header: "Status", key: "status", width: 14 },
    { header: "Review Status", key: "review_status", width: 14 },
    { header: "Notes", key: "notes", width: 30 },
  ];
  worksheet.autoFilter = "A1:S1";

  // Style header row
  const headerRow = worksheet.getRow(1);
  headerRow.font = {
    name: "Calibri",
    bold: true,
    color: { argb: "FFFFFFFF" },
    size: 11,
  };
  headerRow.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF1A1A2E" },
  };
  headerRow.alignment = {
    vertical: "middle",
    horizontal: "center",
    wrapText: true,
  };
  headerRow.height = 28;

  students.forEach((student, index) => {
    const examScore = student.entrance_exam_name
      ? `${student.entrance_exam_name}: ${student.entrance_exam_score || "N/A"}`
      : "N/A";

    const row = worksheet.addRow({
      serial: index + 1,
      date: student.date_submitted
        ? new Date(student.date_submitted).toLocaleDateString("en-IN")
        : "",
      tu4f_id: student.tu4f_id,
      name: student.name,
      department: student.department,
      ug_duration: student.ug_duration || "",
      contact_no: student.contact_no,
      email: student.email,
      applying_for: student.applying_for || "",
      exam_score: examScore,
      country: student.country || "",
      institute_admitted: student.institute_admitted || "",
      pg_duration: student.pg_duration || "",
      pg_course: student.pg_course || "",
      documents: student.document_count
        ? `${student.document_count} file(s) - See Uploaded Files`
        : "0 files",
      drive_folder: student.drive_folder_url
        ? {
            text: "Open folder",
            hyperlink: student.drive_folder_url,
          }
        : "",
      status: student.status
        ? student.status.charAt(0).toUpperCase() +
          student.status.slice(1).replace("_", " ")
        : "Pending",
      review_status:
        student.review_status === "checked" ? "✅ Checked" : "⬜ Unchecked",
      notes: student.notes || "",
    });

    row.alignment = { vertical: "middle" };

    if (student.documents.length > 0) {
      const documentCell = row.getCell("documents");
      const firstDocument = student.documents[0];
      documentCell.value = {
        text: `${student.document_count} file(s) - Open files`,
        hyperlink: `#'Uploaded Files'!A${documents.findIndex((document) => document.id === firstDocument.id) + 2}`,
      };
      documentCell.font = { color: { argb: "FF0563C1" }, underline: true };
    }
    if (student.drive_folder_url) {
      row.getCell("drive_folder").font = {
        color: { argb: "FF0563C1" },
        underline: true,
      };
    }

    // Approved rows are black; all other rows are red for quick review.
    row.font = {
      color: { argb: student.status === "approved" ? "FF000000" : "FFFF0000" },
    };
  });

  worksheet.eachRow((row) => {
    row.eachCell((cell) => {
      cell.border = {
        top: { style: "thin", color: { argb: "FFE0E0E0" } },
        left: { style: "thin", color: { argb: "FFE0E0E0" } },
        bottom: { style: "thin", color: { argb: "FFE0E0E0" } },
        right: { style: "thin", color: { argb: "FFE0E0E0" } },
      };
    });
  });

  const filesWorksheet = workbook.addWorksheet("Uploaded Files", {
    views: [{ state: "frozen", ySplit: 1 }],
  });
  filesWorksheet.columns = [
    { header: "Student ID", key: "student_id", width: 18 },
    { header: "Student Name", key: "student_name", width: 25 },
    { header: "Document Type", key: "doc_type", width: 18 },
    { header: "Original File Name", key: "original_name", width: 34 },
    { header: "File Size", key: "file_size", width: 14 },
    { header: "Open File", key: "file_link", width: 20 },
    { header: "Preview", key: "preview", width: 18 },
  ];
  filesWorksheet.autoFilter = "A1:G1";

  const fileHeaderRow = filesWorksheet.getRow(1);
  fileHeaderRow.font = {
    name: "Calibri",
    bold: true,
    color: { argb: "FFFFFFFF" },
    size: 11,
  };
  fileHeaderRow.fill = {
    type: "pattern",
    pattern: "solid",
    fgColor: { argb: "FF167D9A" },
  };
  fileHeaderRow.alignment = {
    vertical: "middle",
    horizontal: "center",
    wrapText: true,
  };
  fileHeaderRow.height = 28;

  const publicServerUrl = (
    process.env.PUBLIC_SERVER_URL ||
    process.env.SERVER_URL ||
    "http://localhost:5000"
  ).replace(/\/$/, "");
  const studentById = new Map(students.map((student) => [student.id, student]));

  documents.forEach((document) => {
    const student = studentById.get(document.student_id);
    const storedPath = document.file_path || "";
    const fileUrl = /^https?:\/\//i.test(storedPath)
      ? storedPath
      : `${publicServerUrl}/${storedPath.replace(/^\/+/, "").replace(/\\/g, "/")}`;
    const fileRow = filesWorksheet.addRow({
      student_id: student?.tu4f_id || document.student_id,
      student_name: student?.name || "",
      doc_type: document.doc_type || "other",
      original_name:
        document.original_name || document.file_name || "Uploaded file",
      file_size: document.file_size
        ? `${Math.ceil(document.file_size / 1024)} KB`
        : "",
      file_link: { text: "Open file", hyperlink: fileUrl },
      preview: "",
    });

    fileRow.alignment = { vertical: "middle", wrapText: true };
    fileRow.getCell("file_link").font = {
      color: { argb: "FF0563C1" },
      underline: true,
    };

    const localFilePath = !/^https?:\/\//i.test(storedPath)
      ? path.resolve(__dirname, "..", storedPath)
      : null;
    if (
      localFilePath &&
      fs.existsSync(localFilePath) &&
      /^image\/(png|jpeg|jpg)$/i.test(document.mime_type || "")
    ) {
      const extension = document.mime_type.toLowerCase().includes("png")
        ? "png"
        : "jpeg";
      const imageId = workbook.addImage({ filename: localFilePath, extension });
      filesWorksheet.addImage(imageId, {
        tl: { col: 6, row: fileRow.number - 1 },
        ext: { width: 100, height: 75 },
      });
      fileRow.height = 60;
      fileRow.getCell("preview").value = "Embedded image";
    }
  });

  filesWorksheet.eachRow((row) => {
    row.eachCell((cell) => {
      cell.border = {
        top: { style: "thin", color: { argb: "FFE0E0E0" } },
        left: { style: "thin", color: { argb: "FFE0E0E0" } },
        bottom: { style: "thin", color: { argb: "FFE0E0E0" } },
        right: { style: "thin", color: { argb: "FFE0E0E0" } },
      };
    });
  });

  return await workbook.xlsx.writeBuffer();
}

/**
 * Auto-syncs the master Excel file directly to Google Drive parent folder
 */
async function syncMasterExcelToDrive() {
  const sync = masterSync.then(async () => {
    try {
      const buffer = await generateExcelBuffer();
      const parentFolderId = process.env.HEC_PARENT_FOLDER_ID;

      const masterFile = {
        originalname: "HEC_Master_Student_Data.xlsx",
        mimetype:
          "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        buffer,
      };

      const result = await driveService.upsertFileInDriveFolder(
        masterFile,
        parentFolderId,
      );
      if (result) {
        console.log(
          `Auto-synced Master Excel to Google Drive: ${result.webViewLink}`,
        );
        return result.webViewLink;
      }

      console.log(
        "Master Excel was generated locally, but Google Drive sync was skipped or failed.",
      );
      return null;
    } catch (error) {
      console.error("Error auto-syncing Master Excel to Drive:", error.message);
      return null;
    }
  });

  masterSync = sync.catch(() => null);
  return sync;
}

module.exports = {
  generateExcelBuffer,
  syncMasterExcelToDrive,
};
