# Google Drive File Upload Fix - Debugging Guide

## What Was Fixed

✅ **Enhanced Error Logging** - Now shows exactly where uploads fail
✅ **Better Stream Handling** - Uses file streams for more reliable uploads
✅ **Improved Path Validation** - Checks if files exist before uploading
✅ **Skip Existing Files** - Won't re-upload files already in Drive
✅ **Drive Status Check Endpoint** - New API to verify Drive configuration

---

## Testing Steps

### 1. Check Google Drive Status

First, verify Drive is properly configured:

```bash
curl -H "Authorization: Bearer YOUR_AUTH_TOKEN" \
  http://localhost:3000/api/students/drive-status/check
```

Expected response:

```json
{
  "drive": {
    "configured": true,
    "accessible": true,
    "folder": {
      "id": "your-parent-folder-id",
      "name": "HEC"
    }
  },
  "localStorageReady": true
}
```

**If configured is false**: Check your `.env` file for `HEC_PARENT_FOLDER_ID`
**If accessible is false**: Check service account permissions

---

### 2. Submit a Student Application

1. Go to the student form
2. Fill in all required fields
3. Upload documents:
   - Score Card (PDF/JPG)
   - Hall Ticket (PDF/JPG)
   - Offer Letter (PDF/JPG)
   - Any other documents

### 3. Watch Server Logs

When you **approve** the student, check the server console for:

```
========== UPLOADING DOCUMENTS TO GOOGLE DRIVE ==========
Student: John Doe, Drive Folder ID: xxxxxxxx
Total documents to upload: 3

--- Document 1/3 ---
File Name: 1725282930000_score_card_document.pdf
Document Type: score_card
Original Name: document.pdf
Stored Path: uploads/HEC-2026-IT-00016_John_Doe/...
Full Local Path: /path/to/server/uploads/...
File Exists: true
File Size: 245678 bytes
Starting upload to Drive...

📁 Creating/finding subfolder: Scorecard
✅ Subfolder ready: xxxxxxxx (Scorecard)
📤 Uploading new file to Drive...
✅ File uploaded successfully to Drive
   ID: xxxxxxxx
   Link: https://drive.google.com/file/d/...
✅ Database updated with Drive link
```

---

## Understanding the Logs

### ✅ Success Indicators

- `File read successfully: XXX bytes`
- `✅ Subfolder ready`
- `✅ File uploaded successfully`
- `✅ Database updated with Drive link`

### ❌ Error Indicators

- `❌ File does not exist` - Local file is missing
- `❌ Failed to create/find subfolder` - Drive permission issue
- `❌ API Errors` - Google Drive API error
- `Error type: [ErrorType]` - Check error message

---

## Folder Structure in Google Drive

After approval, files should be organized as:

```
HEC (Parent Folder)
└── 2026 (Passout Year)
    └── IT (Department)
        └── John Doe (Student Name)
            ├── Scorecard/
            │   └── document.pdf
            ├── Offer Letter/
            │   └── offer_letter.pdf
            ├── Hall Ticket/
            │   └── ticket.pdf
            └── Other Documents/
                └── doc1.pdf
```

---

## Troubleshooting

### Problem: "File does not exist"

**Solution**:

- Check if file was saved to local disk during submission
- Verify `uploads/` folder exists and has files
- Check permissions on server/uploads directory

### Problem: "Failed to create/find subfolder"

**Solution**:

- Check service account has Editor access to HEC folder
- Verify HEC_PARENT_FOLDER_ID is correct
- Try manually creating subfolders in Drive

### Problem: "No webViewLink returned"

**Solution**:

- File was uploaded but Drive didn't return a link
- Check server logs for complete error message
- Try re-approving the student

### Problem: Files not appearing in Drive

**Solution**:

1. Run the status check endpoint
2. Check server console for complete error logs
3. Verify service account email is shared with HEC folder
4. Check if Drive API quota is exhausted

---

## Environment Variables

Ensure your `.env` file has:

```
HEC_PARENT_FOLDER_ID=your-drive-folder-id
GOOGLE_APPLICATION_CREDENTIALS=credentials/service-account-key.json
```

---

## Files Modified

- `server/routes/studentRoutes.js` - Added detailed logging & status endpoint
- `server/services/driveService.js` - Improved upload functions with better error handling

---

## Next Steps if Still Having Issues

1. **Export full server logs**:

   ```bash
   npm run dev:server 2>&1 | tee server-logs.txt
   ```

2. **Check Drive folder permissions**:
   - Go to HEC folder in Drive
   - Click "Share"
   - Verify service account email has Editor access

3. **Test Drive API directly**:
   ```javascript
   // In driveService.js
   const testFolder = await drive.files.get({
     fileId: "HEC_FOLDER_ID",
     fields: "id, name",
   });
   console.log("Drive API works:", testFolder.data);
   ```

---

## Contact

If issues persist, share the server console output from the "UPLOADING DOCUMENTS TO GOOGLE DRIVE" section.
