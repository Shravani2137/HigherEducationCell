const { google } = require("googleapis");
const fs = require("fs");
const { Readable } = require("stream");
const driveOAuth = require("./driveOAuth");

let drive = null;

// ============================================================
// GET HEC PARENT FOLDER ID
// ============================================================

function getParentFolderId() {
  const configured = String(process.env.HEC_PARENT_FOLDER_ID || "").trim();

  if (!configured) {
    return null;
  }

  // Supports either:
  // 1. Folder ID
  // 2. Full Google Drive folder URL

  const match = configured.match(/\/folders\/([a-zA-Z0-9_-]+)/);

  return match ? match[1] : configured;
}

// ============================================================
// INITIALIZE GOOGLE DRIVE API CLIENT
// USING OAUTH 2.0
// ============================================================

function initDriveClient() {
  try {
    const auth = driveOAuth.getAuthenticatedOAuthClient();

    if (!auth) {
      console.log("⚠️ Google Drive OAuth token not found.");

      console.log("Please authorize Google Drive using:");

      console.log("http://localhost:5000/api/auth/google");

      drive = null;

      return false;
    }

    drive = google.drive({
      version: "v3",
      auth,
    });

    console.log(
      "✅ Google Drive API client initialized successfully with OAuth 2.0.",
    );

    return true;
  } catch (error) {
    console.error(
      "❌ Google Drive OAuth initialization failed:",
      error.message,
    );

    drive = null;

    return false;
  }
}

// ============================================================
// TRY TO INITIALIZE ON LOAD
// ============================================================

initDriveClient();

// ============================================================
// CREATE STUDENT DRIVE FOLDER
// ============================================================

async function createStudentDriveFolder(
  folderName,
  parentFolderId = getParentFolderId(),
) {
  if (!drive) {
    const reInit = initDriveClient();

    if (!reInit) {
      return null;
    }
  }

  if (!parentFolderId) {
    console.error("❌ HEC parent folder ID is missing.");

    return null;
  }

  try {
    console.log(`\n📁 Creating student folder: ${folderName}`);

    console.log(`📂 Parent folder: ${parentFolderId}`);

    const fileMetadata = {
      name: folderName,
      mimeType: "application/vnd.google-apps.folder",
      parents: [parentFolderId],
    };

    const response = await drive.files.create({
      requestBody: fileMetadata,

      fields: "id, name, webViewLink",

      supportsAllDrives: true,
    });

    console.log(`✅ Created Google Drive folder "${folderName}"`);

    console.log(`🆔 Folder ID: ${response.data.id}`);

    console.log(`🔗 Link: ${response.data.webViewLink || "Not available"}`);

    return response.data;
  } catch (error) {
    console.error("❌ Error creating Google Drive folder:");

    console.error(error.response?.data || error.message);

    return null;
  }
}

// ============================================================
// FIND OR CREATE FOLDER
// ============================================================

async function findOrCreateFolder(name, parentId) {
  if (!drive) {
    const reInit = initDriveClient();

    if (!reInit) {
      return null;
    }
  }

  if (!parentId) {
    console.error("❌ Parent folder ID missing.");

    return null;
  }

  try {
    console.log(`\n📁 findOrCreateFolder: "${name}"`);

    console.log(`📂 Parent ID: ${parentId}`);

    const escapedName = String(name).replace(/'/g, "\\'");

    // --------------------------------------------------------
    // FIND EXISTING FOLDER
    // --------------------------------------------------------

    const existing = await drive.files.list({
      q:
        `'${parentId}' in parents ` +
        `and name = '${escapedName}' ` +
        `and mimeType = 'application/vnd.google-apps.folder' ` +
        `and trashed = false`,

      fields: "files(id, name, mimeType, webViewLink)",

      supportsAllDrives: true,

      includeItemsFromAllDrives: true,
    });

    if (existing.data.files && existing.data.files.length > 0) {
      console.log(`✅ Folder found: ${existing.data.files[0].id}`);

      return existing.data.files[0];
    }

    // --------------------------------------------------------
    // CREATE NEW FOLDER
    // --------------------------------------------------------

    console.log(`📁 Folder does not exist. Creating: "${name}"`);

    const response = await drive.files.create({
      requestBody: {
        name: name,
        mimeType: "application/vnd.google-apps.folder",
        parents: [parentId],
      },

      fields: "id, name, mimeType, webViewLink",

      supportsAllDrives: true,
    });

    console.log(`✅ Folder created: ${response.data.id}`);

    return response.data;
  } catch (error) {
    console.error(`❌ Error in findOrCreateFolder (${name}):`);

    console.error("Status:", error.response?.status);

    console.error("API Error:", error.response?.data || error.message);

    return null;
  }
}

// ============================================================
// CREATE APPROVED STUDENT STRUCTURE
//
// HEC
//   └── Passing Year
//       └── Department
//           └── Student Name
// ============================================================

async function createApprovedStudentStructure(student) {
  if (!drive) {
    const initialized = initDriveClient();

    if (!initialized) {
      return null;
    }
  }

  const parentFolderId = getParentFolderId();

  if (!parentFolderId) {
    console.error("❌ HEC_PARENT_FOLDER_ID is not configured.");

    return null;
  }

  try {
    console.log("\n========================================");

    console.log("📁 CREATING APPROVED STUDENT STRUCTURE");

    console.log("========================================");

    console.log(`👤 Student: ${student.name}`);

    console.log(`🆔 TU4F ID: ${student.tu4f_id}`);

    console.log(`📅 Passout Year: ${student.passout_year}`);

    console.log(`🏫 Department: ${student.department}`);

    // --------------------------------------------------------
    // YEAR
    // --------------------------------------------------------

    const yearFolder = await findOrCreateFolder(
      String(student.passout_year),
      parentFolderId,
    );

    if (!yearFolder) {
      console.error("❌ Failed to create/find year folder.");

      return null;
    }

    console.log(`✅ Year folder: ${yearFolder.id}`);

    // --------------------------------------------------------
    // DEPARTMENT
    // --------------------------------------------------------

    const departmentFolder = await findOrCreateFolder(
      student.department,
      yearFolder.id,
    );

    if (!departmentFolder) {
      console.error("❌ Failed to create/find department folder.");

      return null;
    }

    console.log(`✅ Department folder: ${departmentFolder.id}`);

    // --------------------------------------------------------
    // STUDENT
    // --------------------------------------------------------

    const studentFolder = await findOrCreateFolder(
      student.name,
      departmentFolder.id,
    );

    if (!studentFolder) {
      console.error("❌ Failed to create/find student folder.");

      return null;
    }

    console.log(`✅ Student folder: ${studentFolder.id}`);

    console.log("\n✅ COMPLETE DRIVE STRUCTURE READY");

    console.log(
      `${yearFolder.name} > ` +
        `${departmentFolder.name} > ` +
        `${studentFolder.name}`,
    );

    return studentFolder;
  } catch (error) {
    console.error("❌ Error creating approved Drive structure:");

    console.error(error.response?.data || error.message);

    console.error(error.stack);

    return null;
  }
}

// ============================================================
// CHECK WHETHER DRIVE IS CONFIGURED
// ============================================================

function isDriveConfigured() {
  return Boolean(drive && getParentFolderId());
}

// ============================================================
// CHECK HEC PARENT FOLDER ACCESS
// ============================================================

async function checkParentFolderAccess() {
  try {
    // --------------------------------------------------------
    // INITIALIZE DRIVE IF NECESSARY
    // --------------------------------------------------------

    if (!drive) {
      const initialized = initDriveClient();

      if (!initialized || !drive) {
        return {
          success: false,
          message: "Google Drive OAuth is not authorized.",
        };
      }
    }

    // --------------------------------------------------------
    // GET PARENT FOLDER ID
    // --------------------------------------------------------

    const parentFolderId = getParentFolderId();

    if (!parentFolderId) {
      return {
        success: false,
        message: "HEC_PARENT_FOLDER_ID is missing in .env",
      };
    }

    console.log("\n🔍 Checking HEC parent folder access...");

    console.log(`🆔 Parent Folder ID: ${parentFolderId}`);

    // --------------------------------------------------------
    // ACCESS FOLDER
    // --------------------------------------------------------

    const response = await drive.files.get({
      fileId: parentFolderId,

      fields: "id,name,mimeType,webViewLink,parents",
    });

    const folder = response.data;

    // --------------------------------------------------------
    // VERIFY FOLDER TYPE
    // --------------------------------------------------------

    if (folder.mimeType !== "application/vnd.google-apps.folder") {
      return {
        success: false,

        message:
          "HEC_PARENT_FOLDER_ID does not point to a Google Drive folder.",
      };
    }

    console.log("\n✅ HEC PARENT FOLDER ACCESSED SUCCESSFULLY");

    console.log(`📁 Folder Name: ${folder.name}`);

    console.log(`🆔 Folder ID: ${folder.id}`);

    console.log(`🔗 Folder Link: ${folder.webViewLink || "Not available"}`);

    return {
      success: true,
      folder,
    };
  } catch (error) {
    console.error("\n❌ UNABLE TO ACCESS HEC PARENT FOLDER");

    console.error("Status:", error.response?.status || "Unknown");

    console.error("API Error:", error.response?.data || error.message);

    let message = "Unable to access HEC parent folder.";

    if (error.response?.status === 404) {
      message =
        "HEC parent folder was not found. Check HEC_PARENT_FOLDER_ID in .env.";
    }

    if (error.response?.status === 403) {
      message =
        "Google Drive permission denied. Make sure the HEC folder is accessible from the Google account used during OAuth authorization.";
    }

    return {
      success: false,
      message,
    };
  }
}

// ============================================================
// UPLOAD LOCAL FILE TO DRIVE
// ============================================================

async function uploadLocalFileToFolder(
  filePath,
  originalName,
  mimeType,
  folderId,
  documentType = "other",
) {
  if (!drive) {
    const initialized = initDriveClient();

    if (!initialized) {
      return null;
    }
  }

  if (!folderId) {
    console.error("❌ Folder ID missing.");

    return null;
  }

  try {
    console.log("\n📤 uploadLocalFileToFolder started");

    console.log(`📄 File: ${originalName}`);

    console.log(`📂 Folder: ${folderId}`);

    console.log(`📌 Document Type: ${documentType}`);

    // --------------------------------------------------------
    // VERIFY LOCAL FILE
    // --------------------------------------------------------

    if (!fs.existsSync(filePath)) {
      console.error(`❌ File does not exist: ${filePath}`);

      return null;
    }

    const buffer = fs.readFileSync(filePath);

    console.log(`✅ File read successfully: ${buffer.length} bytes`);

    // --------------------------------------------------------
    // DOCUMENT FOLDER NAMES
    // --------------------------------------------------------

    const folderNames = {
      hall_ticket: "Hall Ticket",
      transcript: "Marksheet",
      score_card: "Scorecard",
      offer_letter: "Offer Letter",
      other: "Other Documents",
    };

    const folderName = folderNames[documentType] || "Other Documents";

    // --------------------------------------------------------
    // CREATE/FIND DOCUMENT SUBFOLDER
    // --------------------------------------------------------

    console.log(`📁 Finding/Creating subfolder: ${folderName}`);

    const documentFolder = await findOrCreateFolder(folderName, folderId);

    if (!documentFolder) {
      console.error(`❌ Failed to create/find subfolder: ${folderName}`);

      return null;
    }

    console.log(`✅ Document subfolder ready: ${documentFolder.id}`);

    // --------------------------------------------------------
    // REMOVE TIMESTAMP PREFIX
    // --------------------------------------------------------

    const storedPrefix = new RegExp(`^\\d+_${documentType}_`);

    const driveFileName = originalName.replace(storedPrefix, "");

    console.log(`📄 Final Drive filename: ${driveFileName}`);

    // --------------------------------------------------------
    // CREATE STREAM
    // --------------------------------------------------------

    const bufferStream = Readable.from([buffer]);

    const fileMetadata = {
      name: driveFileName,
      parents: [documentFolder.id],
    };

    // --------------------------------------------------------
    // UPLOAD FILE
    // --------------------------------------------------------

    console.log("📤 Uploading file to Google Drive...");

    const response = await drive.files.create({
      requestBody: fileMetadata,

      media: {
        mimeType,
        body: bufferStream,
      },

      fields: "id,name,webViewLink,webContentLink,size,createdTime",

      supportsAllDrives: true,
    });

    console.log("\n✅ FILE UPLOADED SUCCESSFULLY TO GOOGLE DRIVE");

    console.log(`🆔 Drive ID: ${response.data.id}`);

    console.log(`📄 Name: ${response.data.name}`);

    console.log(`📦 Size: ${response.data.size || "Unknown"} bytes`);

    console.log(`🔗 Link: ${response.data.webViewLink || "Not available"}`);

    return response.data;
  } catch (error) {
    console.error("\n❌ ERROR UPLOADING APPROVED DOCUMENT");

    console.error("Status:", error.response?.status);

    console.error("API Error:", error.response?.data || error.message);

    return null;
  }
}

// ============================================================
// UPLOAD MULTER FILE TO DRIVE
// ============================================================

async function uploadFileToDriveFolder(file, folderId, docTypePrefix = "") {
  if (!drive) {
    const initialized = initDriveClient();

    if (!initialized) {
      return null;
    }
  }

  if (!folderId) {
    console.error("❌ Folder ID missing.");

    return null;
  }

  try {
    console.log("\n📤 uploadFileToDriveFolder");

    console.log(`📄 File: ${file.originalname}`);

    console.log(`📦 Size: ${file.buffer.length} bytes`);

    console.log(`📂 Folder: ${folderId}`);

    if (docTypePrefix) {
      console.log(`📌 Prefix: ${docTypePrefix}`);
    }

    const fileName = docTypePrefix
      ? `${docTypePrefix}_${file.originalname}`
      : file.originalname;

    const fileMetadata = {
      name: fileName,
      parents: [folderId],
    };

    const bufferStream = Readable.from([file.buffer]);

    const media = {
      mimeType: file.mimetype,
      body: bufferStream,
    };

    console.log(`📤 Creating file in Drive: ${fileName}`);

    const response = await drive.files.create({
      requestBody: fileMetadata,

      media,

      fields: "id,name,webViewLink,webContentLink,size",

      supportsAllDrives: true,
    });

    console.log("\n✅ FILE UPLOADED SUCCESSFULLY");

    console.log(`🆔 ID: ${response.data.id}`);

    console.log(`🔗 Link: ${response.data.webViewLink || "Not available"}`);

    return response.data;
  } catch (error) {
    console.error("\n❌ ERROR UPLOADING FILE TO GOOGLE DRIVE");

    console.error("Status:", error.response?.status);

    console.error("API Error:", error.response?.data || error.message);

    return null;
  }
}

// ============================================================
// UPSERT FILE IN DRIVE
// USED FOR EXCEL / MASTER FILE SYNCHRONIZATION
// ============================================================

async function upsertFileInDriveFolder(file, folderId) {
  if (!folderId) {
    console.log(
      "Google Drive parent folder is not configured. Skipping master file sync.",
    );

    return null;
  }

  if (!drive) {
    const initialized = initDriveClient();

    if (!initialized) {
      return null;
    }
  }

  try {
    const escapedName = file.originalname.replace(/'/g, "\\'");

    const existing = await drive.files.list({
      q:
        `'${folderId}' in parents ` +
        `and name = '${escapedName}' ` +
        `and trashed = false`,

      fields: "files(id,name,webViewLink)",

      supportsAllDrives: true,

      includeItemsFromAllDrives: true,
    });

    const bufferStream = Readable.from([file.buffer]);

    const media = {
      mimeType: file.mimetype,
      body: bufferStream,
    };

    const currentFile = existing.data.files?.[0];

    // --------------------------------------------------------
    // UPDATE EXISTING FILE
    // --------------------------------------------------------

    if (currentFile) {
      const response = await drive.files.update({
        fileId: currentFile.id,

        media,

        fields: "id,name,webViewLink",

        supportsAllDrives: true,
      });

      // Remove duplicate files
      for (const duplicate of existing.data.files.slice(1)) {
        await drive.files.delete({
          fileId: duplicate.id,

          supportsAllDrives: true,
        });
      }

      console.log(
        `✅ Updated master Excel file in Google Drive: ${response.data.id}`,
      );

      return response.data;
    }

    // --------------------------------------------------------
    // CREATE NEW FILE
    // --------------------------------------------------------

    const response = await drive.files.create({
      requestBody: {
        name: file.originalname,
        parents: [folderId],
      },

      media,

      fields: "id,name,webViewLink",

      supportsAllDrives: true,
    });

    console.log(
      `✅ Created master Excel file in Google Drive: ${response.data.id}`,
    );

    return response.data;
  } catch (error) {
    console.error("❌ Error upserting file in Google Drive:");

    console.error(error.response?.data || error.message);

    return null;
  }
}

// ============================================================
// SHARE DRIVE FOLDER
// ============================================================

async function shareDriveFolder(folderId, userEmail, role = "reader") {
  if (!drive) {
    const initialized = initDriveClient();

    if (!initialized) {
      return null;
    }
  }

  if (!folderId || !userEmail) {
    return null;
  }

  try {
    const response = await drive.permissions.create({
      fileId: folderId,

      requestBody: {
        type: "user",
        role,
        emailAddress: userEmail,
      },

      sendNotificationEmail: false,

      fields: "id,emailAddress,role",

      supportsAllDrives: true,
    });

    console.log(`✅ Shared Drive folder ${folderId} with ${userEmail}`);

    return response.data;
  } catch (error) {
    console.error("❌ Error sharing Drive folder:");

    console.error(error.response?.data || error.message);

    return null;
  }
}

// ============================================================
// EXPORTS
// ============================================================

module.exports = {
  initDriveClient,
  getParentFolderId,
  isDriveConfigured,
  checkParentFolderAccess,
  createStudentDriveFolder,
  createApprovedStudentStructure,
  uploadLocalFileToFolder,
  uploadFileToDriveFolder,
  upsertFileInDriveFolder,
  shareDriveFolder,
};
