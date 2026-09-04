const { google } = require('googleapis');
const path = require('path');
const fs = require('fs');
const { Readable } = require('stream');

let drive = null;

// Initialize Google Drive API client
function initDriveClient() {
    try {
        const configuredPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
        const credentialsPath = configuredPath
            ? (path.isAbsolute(configuredPath) ? configuredPath : path.resolve(__dirname, '../..', configuredPath))
            : path.join(__dirname, '../../credentials/service-account-key.json');
        
        if (fs.existsSync(credentialsPath)) {
            const auth = new google.auth.GoogleAuth({
                keyFile: credentialsPath,
                scopes: ['https://www.googleapis.com/auth/drive'],
            });
            drive = google.drive({ version: 'v3', auth });
            console.log('Google Drive API client initialized successfully with Service Account key.');
            return true;
        } else {
            console.log('Google Drive key file not found at:', credentialsPath);
            console.log('System will fall back to local disk storage.');
            return false;
        }
    } catch (error) {
        console.error('Error initializing Google Drive client:', error.message);
        return false;
    }
}

// Try to initialize on load
initDriveClient();

/**
 * Creates a folder inside a specified parent folder on Google Drive
 * @param {string} folderName - e.g., "IT_TU4F2026001_StudentName_2026"
 * @param {string} parentFolderId - ID of parent HEC drive folder
 * @returns {Promise<{ id: string, name: string, webViewLink: string } | null>}
 */
async function createStudentDriveFolder(folderName, parentFolderId = process.env.HEC_PARENT_FOLDER_ID) {
    if (!drive) {
        const reInit = initDriveClient();
        if (!reInit) return null;
    }

    try {
        const fileMetadata = {
            name: folderName,
            mimeType: 'application/vnd.google-apps.folder',
            parents: parentFolderId ? [parentFolderId] : [],
        };

        const response = await drive.files.create({
            requestBody: fileMetadata,
            fields: 'id, name, webViewLink',
            supportsAllDrives: true,
        });

        console.log(`Created Google Drive folder "${folderName}" with ID: ${response.data.id}`);
        return response.data;
    } catch (error) {
        console.error('Error creating Google Drive folder:', error.message);
        return null;
    }
}

/**
 * Uploads a file buffer directly to a specific Google Drive folder
 * @param {Object} file - Express multer file object (memoryStorage)
 * @param {string} folderId - Target Google Drive folder ID
 * @param {string} docTypePrefix - Prefix e.g. "score_card_"
 * @returns {Promise<{ id: string, name: string, webViewLink: string, webContentLink: string } | null>}
 */
async function uploadFileToDriveFolder(file, folderId, docTypePrefix = '') {
    if (!drive || !folderId) return null;

    try {
        const bufferStream = new Readable();
        bufferStream.push(file.buffer);
        bufferStream.push(null);

        const fileName = docTypePrefix ? `${docTypePrefix}_${file.originalname}` : file.originalname;

        const fileMetadata = {
            name: fileName,
            parents: [folderId],
        };

        const media = {
            mimeType: file.mimetype,
            body: bufferStream,
        };

        const response = await drive.files.create({
            requestBody: fileMetadata,
            media: media,
            fields: 'id, name, webViewLink, webContentLink, size',
            supportsAllDrives: true,
        });

        console.log(`Uploaded file "${fileName}" to Google Drive folder ${folderId}`);
        return response.data;
    } catch (error) {
        console.error('Error uploading file to Google Drive:', error.message);
        return null;
    }
}

/**
 * Creates the file once, then updates that same file on subsequent syncs.
 * @param {Object} file - Express multer-compatible file object
 * @param {string} folderId - Target Google Drive folder ID
 * @returns {Promise<{ id: string, name: string, webViewLink: string } | null>}
 */
async function upsertFileInDriveFolder(file, folderId) {
    if (!folderId) {
        console.log('Google Drive parent folder is not configured. Skipping master file sync.');
        return null;
    }

    if (!drive) {
        const reInit = initDriveClient();
        if (!reInit) return null;
    }

    try {
        const escapedName = file.originalname.replace(/'/g, "\\'");
        const existing = await drive.files.list({
            q: `'${folderId}' in parents and name = '${escapedName}' and trashed = false`,
            fields: 'files(id, name, webViewLink)',
            supportsAllDrives: true,
            includeItemsFromAllDrives: true,
            corpora: 'allDrives',
        });

        const bufferStream = new Readable({ read() {} });
        bufferStream.push(file.buffer);
        bufferStream.push(null);

        const media = {
            mimeType: file.mimetype,
            body: bufferStream,
        };

        const currentFile = existing.data.files[0];
        if (currentFile) {
            const response = await drive.files.update({
                fileId: currentFile.id,
                media,
                fields: 'id, name, webViewLink',
                supportsAllDrives: true,
            });

            for (const duplicate of existing.data.files.slice(1)) {
                await drive.files.delete({ fileId: duplicate.id, supportsAllDrives: true });
            }

            console.log(`Updated master Excel file in Google Drive: ${response.data.id}`);
            return response.data;
        }

        const response = await drive.files.create({
            requestBody: {
                name: file.originalname,
                parents: [folderId],
            },
            media,
            fields: 'id, name, webViewLink',
            supportsAllDrives: true,
        });
        console.log(`Created master Excel file in Google Drive: ${response.data.id}`);
        return response.data;
    } catch (error) {
        console.error('Error upserting file in Google Drive:', error.message);
        return null;
    }
}

/**
 * Share a folder with a specific email
 * @param {string} folderId 
 * @param {string} userEmail 
 * @param {'reader' | 'writer'} role 
 */
async function shareDriveFolder(folderId, userEmail, role = 'reader') {
    if (!drive || !folderId || !userEmail) return null;

    try {
        const response = await drive.permissions.create({
            fileId: folderId,
            requestBody: {
                type: 'user',
                role: role,
                emailAddress: userEmail,
            },
            sendNotificationEmail: false,
            fields: 'id, emailAddress, role',
            supportsAllDrives: true,
        });

        console.log(`Shared Drive folder ${folderId} with ${userEmail}`);
        return response.data;
    } catch (error) {
        console.error('Error sharing Drive folder:', error.message);
        return null;
    }
}

module.exports = {
    initDriveClient,
    createStudentDriveFolder,
    uploadFileToDriveFolder,
    upsertFileInDriveFolder,
    shareDriveFolder
};
