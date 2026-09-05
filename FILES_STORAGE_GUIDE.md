# File Storage and Upload to Google Drive - Complete Guide

## 🔍 How Files Are Stored

### Step 1: Student Submits Form

1. Student uploads files through the form
2. Files are saved **locally** on the server at:

   ```
   server/uploads/[APPLICATION_ID]_[STUDENT_NAME]/
   ```

   Example:

   ```
   server/uploads/HEC-2026-IT-00016_john_doe/
   ```

3. File is renamed with timestamp for uniqueness:

   ```
   1725282930000_score_card_document.pdf
   ```

4. File entry is stored in **documents** table with:
   - `file_path`: Local path to file
   - `original_name`: Original filename
   - `file_name`: Renamed filename with timestamp
   - `doc_type`: Document category (score_card, offer_letter, etc.)

### Step 2: Admin Approves Student

1. Admin clicks "Approve" button
2. System creates folder structure in Google Drive:

   ```
   HEC (Parent Folder)
   └── [YEAR] (e.g., 2026)
       └── [DEPARTMENT] (e.g., IT)
           └── [STUDENT_NAME] (e.g., John Doe)
               ├── Scorecard/
               ├── Offer Letter/
               ├── Hall Ticket/
               └── Other Documents/
   ```

3. System uploads each file from local disk to the correct Drive subfolder
4. Database is updated with the Google Drive link

---

## ✅ Complete Flow Checklist

### Before Submitting:

- [ ] `.env` file has `HEC_PARENT_FOLDER_ID` set
- [ ] `credentials/service-account-key.json` exists and is valid
- [ ] Service account email has access to HEC folder in Drive

### During Submission:

Files should be saved locally. Check:

```bash
ls server/uploads/
```

You should see folder(s) with format: `[APP_ID]_[STUDENT_NAME]/`

### Before Approval:

- [ ] Database has documents saved
- [ ] Run: `SELECT * FROM documents WHERE student_id = ?`
- [ ] You should see entries with `file_path` starting with `uploads/`

### During Approval:

Watch server logs for:

```
========== UPLOADING DOCUMENTS TO GOOGLE DRIVE ==========
Student: John Doe, Drive Folder ID: xxxxx
Folder Name: John Doe
Folder Link: https://drive.google.com/...

📋 Total documents found in database: 3

--- Document 1/3 ---
File Name: 1725282930000_score_card_document.pdf
Original Name: document.pdf
Document Type: score_card
✅ File found! Size: 245678 bytes

📤 Uploading to Google Drive...
✅ UPLOAD SUCCESSFUL!
   Drive File ID: xxxxx
   Drive Name: document.pdf
   Drive Link: https://drive.google.com/file/d/xxxxx/view
✅ Database updated with Drive link
```

### After Approval:

- [ ] Check Google Drive - folders and files should be visible
- [ ] Run database query:
  ```sql
  SELECT file_path FROM documents WHERE student_id = ?
  ```
- [ ] `file_path` should now contain Google Drive link (starting with `https://drive.google.com/`)

---

## 🔧 Troubleshooting

### Issue 1: "No documents found for this student in database"

**Problem**: Files were submitted but not saved to database

**Solution**:

1. Check if `uploads/` folder has files:
   ```bash
   ls -la server/uploads/
   find server/uploads -type f
   ```
2. If files exist locally but not in database:
   - Check server logs for errors during submission
   - Verify AI verification service is working
   - Check database connection

**Fix**: Resubmit the form and watch for errors

---

### Issue 2: "File Exists: false" - Local file not found

**Problem**: Database has entry but file is missing from disk

**Causes**:

1. File was deleted or moved
2. Wrong file path stored in database
3. Uploads folder permissions changed

**Solutions**:

1. Check exact path in logs:
   ```
   Expected at: /path/to/server/uploads/HEC-2026-IT-00016_john_doe/1725282930000_score_card_document.pdf
   ```
2. Verify file exists:
   ```bash
   ls -l "/path/to/server/uploads/HEC-2026-IT-00016_john_doe/"
   ```
3. Check file permissions:
   ```bash
   chmod 755 server/uploads
   chmod -R 644 server/uploads/*
   ```

---

### Issue 3: "Drive Folder Creation Failed"

**Problem**: No folders created in Google Drive

**Logs Will Show**:

```
❌ ERROR: Failed to create/find subfolder: Scorecard
```

**Causes**:

1. `HEC_PARENT_FOLDER_ID` not set
2. Service account has no access
3. Invalid folder ID format

**Solutions**:

A. Check environment variable:

```bash
echo $HEC_PARENT_FOLDER_ID
```

Should output a folder ID like: `1a2b3c4d5e6f7g8h9i0j`

B. Test Drive connection:

```javascript
// Add this to server index.js temporarily
const driveService = require("./services/driveService");
(async () => {
  const status = await driveService.checkParentFolderAccess();
  console.log("Drive Status:", status);
})();
```

C. Fix permissions:

1. Go to Google Drive
2. Find HEC folder
3. Share it with service account email
4. Give "Editor" access

---

### Issue 4: Upload Returns No File ID

**Problem**: File seems to upload but no ID returned

**Logs Will Show**:

```
❌ UPLOAD FAILED!
   No file ID returned from Drive API
   Drive response: null
```

**Causes**:

1. Stream handling issue
2. Drive API quota exceeded
3. File too large
4. Corrupted file buffer

**Solutions**:

1. Check file size - ensure < 100MB
2. Check Drive API quota at: https://console.cloud.google.com/apis/
3. Check file is valid: `file file.pdf` should show: "PDF document"
4. Restart server to reset streams

---

### Issue 5: Files Upload But Not Showing in Drive

**Problem**: Logs show success but files not visible in Drive

**Causes**:

1. Files in nested subfolders (user not checking deeply)
2. Files uploading to shared drive, not regular folder
3. Refresh issue

**Solutions**:

1. Check folder structure:
   ```
   HEC → [Year] → [Department] → [Student Name]
        → Scorecard/ ← Check inside these
        → Offer Letter/
        → Hall Ticket/
   ```
2. Refresh Google Drive: F5
3. Check file by ID directly:
   ```
   https://drive.google.com/file/d/[FILE_ID]/view
   ```

---

## 📊 Database Verification

### Check if documents are saved:

```sql
SELECT
  s.application_id,
  s.name,
  d.doc_type,
  d.original_name,
  d.file_name,
  d.file_path,
  CASE
    WHEN d.file_path LIKE 'https://%' THEN 'DRIVE LINK ✅'
    WHEN d.file_path LIKE 'uploads/%' THEN 'LOCAL PATH ⚠️'
    ELSE 'UNKNOWN'
  END AS storage_location
FROM students s
LEFT JOIN documents d ON s.id = d.student_id
WHERE s.application_id = 'HEC-2026-IT-00016'
ORDER BY d.created_at;
```

**Expected Output:**

```
| Application ID     | Name      | Doc Type    | Original Name | File Name                    | File Path (Drive Link)              | Location      |
|-------------------|-----------|-------------|---------------|--------|---------------------------------------------|---------------|
| HEC-2026-IT-00016 | John Doe  | score_card  | scorecard.pdf | 172528...score_card_scorecard.pdf | https://drive.google.com/file/d/xxx | DRIVE LINK ✅ |
| HEC-2026-IT-00016 | John Doe  | offer_letter | letter.pdf   | 172528...offer_letter_letter.pdf  | https://drive.google.com/file/d/xxx | DRIVE LINK ✅ |
```

---

## 🧪 Manual Testing

### Test 1: Submit a Student Application

1. Go to student form
2. Fill all required fields
3. Upload test files (small PDFs)
4. Submit

**Verify**:

```bash
ls server/uploads/
```

Should see folder with uploaded files

### Test 2: Approve the Student

1. Go to admin dashboard
2. Find submitted student
3. Click "Approve"
4. **Watch server logs closely**

**Look for**:

- ✅ "Folder structure created"
- ✅ "UPLOAD SUCCESSFUL!"
- ✅ "Database updated with Drive link"

### Test 3: Verify in Google Drive

1. Go to Google Drive
2. Open HEC folder
3. Navigate: Year → Department → Student Name
4. Inside should be subfolders with uploaded files

### Test 4: Check Database

```sql
SELECT file_path FROM documents
WHERE student_id = (SELECT id FROM students WHERE application_id = 'HEC-2026-IT-00016');
```

All `file_path` values should be Google Drive links

---

## 📝 Server Logs to Collect

When reporting issues, collect these logs:

### 1. Form Submission Logs

Look for:

```
INSERT INTO documents
✅ File written to disk
✅ Database record created
```

### 2. Approval Logs

Look for:

```
========== UPLOADING DOCUMENTS TO GOOGLE DRIVE ==========
[all upload results]
========== DOCUMENT UPLOAD COMPLETE ==========
```

### 3. Drive Status Check

Run endpoint and save response:

```bash
curl -H "Authorization: Bearer YOUR_TOKEN" \
  http://localhost:3000/api/students/drive-status/check | jq
```

---

## 🚀 Quick Fixes

### Files stuck in "local storage" after approval?

```bash
# Stop server
npm run dev:server &
# In separate terminal, after seeing server running:
# Go to admin and re-approve the student
# Watch logs for upload
```

### Mass fix: Upload all existing local files to Drive

This requires a manual endpoint (not implemented yet).
Create issue for `reuploadAllDocuments` endpoint if needed.

### Clear all data and start fresh:

```bash
# Backup first!
rm -rf server/uploads/*
mysql -u root school_db < db/schema.sql
npm run migrate
```

---

## 📞 Getting Help

When reporting issues, provide:

1. **Application ID** - from student record
2. **Student Name** - to find in logs
3. **Full server logs** - from submission to approval
4. **Screenshot** - of where files should appear
5. **Error message** - exact error text

Use this command to capture logs:

```bash
npm run dev:server 2>&1 | tee upload-debug.log
# Then perform the action and save upload-debug.log
```
