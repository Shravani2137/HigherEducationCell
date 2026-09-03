const { google } = require('googleapis');
const path = require('path');
const fs = require('fs');

let sheets = null;

function initSheetsClient() {
    try {
        const credentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS || path.join(__dirname, '../../credentials/service-account-key.json');
        
        if (fs.existsSync(credentialsPath)) {
            const auth = new google.auth.GoogleAuth({
                keyFile: credentialsPath,
                scopes: ['https://www.googleapis.com/auth/spreadsheets'],
            });
            sheets = google.sheets({ version: 'v4', auth });
            console.log('Google Sheets API client initialized successfully.');
            return true;
        } else {
            return false;
        }
    } catch (error) {
        console.error('Error initializing Google Sheets client:', error.message);
        return false;
    }
}

initSheetsClient();

/**
 * Appends a student record row directly to a live Google Sheet
 * @param {Object} studentData 
 */
async function appendStudentToGoogleSheet(studentData) {
    const spreadsheetId = process.env.HEC_GOOGLE_SHEET_ID;
    if (!spreadsheetId) {
        console.log('HEC_GOOGLE_SHEET_ID not set in .env. Skipping live Google Sheets sync.');
        return null;
    }

    if (!sheets) {
        const ok = initSheetsClient();
        if (!ok) return null;
    }

    try {
        const examScore = studentData.entrance_exam_name 
            ? `${studentData.entrance_exam_name}: ${studentData.entrance_exam_score || 'N/A'}`
            : 'N/A';

        const rowValues = [[
            studentData.serial_no || '',
            studentData.date_submitted ? new Date(studentData.date_submitted).toLocaleDateString('en-IN') : new Date().toLocaleDateString('en-IN'),
            studentData.tu4f_id || '',
            studentData.name || '',
            studentData.department || '',
            studentData.ug_duration || '',
            studentData.contact_no || '',
            studentData.email || '',
            studentData.applying_for || '',
            examScore,
            studentData.country || '',
            studentData.institute_admitted || '',
            studentData.pg_duration || '',
            studentData.pg_course || '',
            studentData.documents_count ? `${studentData.documents_count} file(s)` : '0 file(s)',
            studentData.status || 'pending',
            studentData.review_status || 'unchecked',
            studentData.drive_folder_url || ''
        ]];

        const response = await sheets.spreadsheets.values.append({
            spreadsheetId: spreadsheetId,
            range: 'Sheet1!A:R',
            valueInputOption: 'USER_ENTERED',
            insertDataOption: 'INSERT_ROWS',
            requestBody: { values: rowValues },
        });

        console.log(`Live Google Sheet updated! Appended row for student ${studentData.name}`);
        return response.data;
    } catch (error) {
        console.error('Error appending row to Google Sheet:', error.message);
        return null;
    }
}

module.exports = {
    appendStudentToGoogleSheet
};
