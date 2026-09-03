const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const upload = require('../middleware/upload');
const auth = require('../middleware/auth');
const driveService = require('../services/driveService');
const emailService = require('../services/emailService');
const excelService = require('../services/excelService');
const aiVerificationService = require('../services/aiVerificationService');
const fs = require('fs');
const path = require('path');

// Determine status based on documents provided
const calculateStatus = (files, body) => {
    const hasOfferLetter = (files.offer_letter && files.offer_letter.length > 0) || (files.offerLetter && files.offerLetter.length > 0);
    const hasScoreCard = (files.score_card && files.score_card.length > 0) || (files.scoreCard && files.scoreCard.length > 0);
    const hasHallTicket = (files.hall_ticket && files.hall_ticket.length > 0) || (files.hallTicket && files.hallTicket.length > 0);
    const hasAnyDoc = hasOfferLetter || hasScoreCard || hasHallTicket || (files.transcript && files.transcript.length > 0) || (files.other_docs && files.other_docs.length > 0) || (files.otherDocs && files.otherDocs.length > 0);

    // 1. COMPLETED: Both admission offer letter AND exam document (Score Card or Hall Ticket) uploaded
    if (hasOfferLetter && (hasScoreCard || hasHallTicket)) return 'completed';

    // 2. PARTIAL: At least one document uploaded (e.g. Score Card only, Hall Ticket only, or Offer Letter only)
    if (hasAnyDoc) return 'partial';

    // 3. PENDING: Submitted info but no documents attached yet
    return 'pending';
};

// POST /api/students
router.post('/', upload.fields([
    { name: 'score_card', maxCount: 1 },
    { name: 'scoreCard', maxCount: 1 },
    { name: 'hall_ticket', maxCount: 1 },
    { name: 'hallTicket', maxCount: 1 },
    { name: 'offer_letter', maxCount: 1 },
    { name: 'offerLetter', maxCount: 1 },
    { name: 'transcript', maxCount: 1 },
    { name: 'other_docs', maxCount: 5 },
    { name: 'otherDocs', maxCount: 5 }
]), async (req, res) => {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        const tu4f_id = req.body.tu4f_id || req.body.tu4fId;
        const name = req.body.name;
        const department = req.body.department;
        const admission_year = parseInt(req.body.admission_year || req.body.admissionYear) || (new Date().getFullYear() - 4);
        const passout_year = parseInt(req.body.passout_year || req.body.passoutYear) || new Date().getFullYear();
        const ug_duration = req.body.ug_duration || req.body.ugDuration || null;
        const contact_no = req.body.contact_no || req.body.contactNo || null;
        const email = req.body.email;
        const applying_for = req.body.applying_for || req.body.applyingFor || null;
        const higher_education = req.body.higher_education === 'Yes' || req.body.higher_education === 'true' || req.body.higher_education === true || req.body.pursuingHigherEd === 'Yes' || req.body.pursuingHigherEd === 'true' || req.body.pursuingHigherEd === true;
        const entrance_exam_appeared = req.body.entrance_exam_appeared === 'Yes' || req.body.entrance_exam_appeared === 'true' || req.body.entrance_exam_appeared === true || req.body.appearedForExam === 'Yes' || req.body.appearedForExam === 'true' || req.body.appearedForExam === true;
        const entrance_exam_name = req.body.entrance_exam_name || req.body.examName || null;
        const entrance_exam_score = req.body.entrance_exam_score || req.body.examScore || null;
        const country = req.body.country || null;
        const institute_admitted = req.body.institute_admitted || req.body.instituteAdmitted || null;
        const pg_duration = req.body.pg_duration || req.body.pgDuration || null;
        const pg_course = req.body.pg_course || req.body.pgCourse || null;

        if (!tu4f_id || !name || !department) {
            return res.status(400).json({ message: 'TU4F ID, Name, and Department are required.' });
        }

        // Check if student with same TU4F ID exists
        const [existingId] = await connection.query('SELECT id FROM students WHERE tu4f_id = ?', [tu4f_id]);
        if (existingId.length > 0) {
            return res.status(400).json({ message: `Student with TU4F ID "${tu4f_id}" has already submitted an application.` });
        }

        // Check if student with same Email exists
        if (email) {
            const [existingEmail] = await connection.query('SELECT id FROM students WHERE email = ?', [email]);
            if (existingEmail.length > 0) {
                return res.status(400).json({ message: `An application has already been submitted using the email address "${email}".` });
            }
        }

        const status = calculateStatus(req.files || {}, req.body);
        const folderName = `${department}_${tu4f_id}_${name}_${passout_year || '2026'}`.replace(/[^a-zA-Z0-9_]/g, '');
        
        // Google Drive Integration
        let driveFolderUrl = null;
        let driveFolderId = null;
        const driveFolder = await driveService.createStudentDriveFolder(folderName);
        if (driveFolder) {
            driveFolderId = driveFolder.id;
            driveFolderUrl = driveFolder.webViewLink;
            if (email) {
                await driveService.shareDriveFolder(driveFolder.id, email, 'reader');
            }
        } else {
            driveFolderUrl = `/uploads/${folderName}`;
        }

        // AI Document Verification
        let aiScoreExtracted = null;
        let aiVerificationStatus = 'unverified';
        let aiVerificationNotes = '';

        const scoreCardFiles = (req.files && (req.files.score_card || req.files.scoreCard)) || [];
        if (scoreCardFiles.length > 0 && entrance_exam_score) {
            const scoreCardFile = scoreCardFiles[0];
            const aiResult = await aiVerificationService.verifyScoreCardDocument(
                scoreCardFile.buffer,
                scoreCardFile.mimetype,
                entrance_exam_name,
                entrance_exam_score
            );
            aiScoreExtracted = aiResult.extractedScore;
            aiVerificationStatus = aiResult.verificationStatus;
            aiVerificationNotes = aiResult.verificationNotes;
        }

        // Insert student
        const [result] = await connection.query(`
            INSERT INTO students (
                tu4f_id, name, department, admission_year, passout_year,
                ug_duration, contact_no, email, applying_for, higher_education,
                entrance_exam_appeared, entrance_exam_name, entrance_exam_score,
                country, institute_admitted, pg_duration, pg_course, drive_folder_url,
                ai_score_extracted, ai_verification_status, ai_verification_notes, status
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [
            tu4f_id, name, department, admission_year, passout_year,
            ug_duration, contact_no, email, applying_for, higher_education,
            entrance_exam_appeared, entrance_exam_name, entrance_exam_score,
            country, institute_admitted, pg_duration, pg_course, driveFolderUrl,
            aiScoreExtracted, aiVerificationStatus, aiVerificationNotes, status
        ]);

        const studentId = result.insertId;

        // Save files (both local backup and Google Drive if available)
        const uploadsDir = path.join(__dirname, '..', 'uploads', folderName);
        if (!fs.existsSync(uploadsDir)) {
            fs.mkdirSync(uploadsDir, { recursive: true });
        }

        if (req.files) {
            const docPromises = [];
            for (const [field, files] of Object.entries(req.files)) {
                for (const file of files) {
                    let docType = 'other';
                    if (field === 'score_card' || field === 'scoreCard') docType = 'score_card';
                    else if (field === 'hall_ticket' || field === 'hallTicket') docType = 'hall_ticket';
                    else if (field === 'offer_letter' || field === 'offerLetter') docType = 'offer_letter';
                    else if (field === 'transcript') docType = 'transcript';

                    const fileName = `${docType}_${file.originalname}`;
                    const filePath = path.join(uploadsDir, fileName);
                    
                    fs.writeFileSync(filePath, file.buffer);

                    // Upload to Google Drive if drive folder exists
                    let fileDriveUrl = null;
                    if (driveFolderId) {
                        const driveFile = await driveService.uploadFileToDriveFolder(file, driveFolderId, docType);
                        if (driveFile) fileDriveUrl = driveFile.webViewLink;
                    }

                    const storedPath = fileDriveUrl || path.relative(path.join(__dirname, '..'), filePath);

                    docPromises.push(
                        connection.query(`
                            INSERT INTO documents (
                                student_id, doc_type, original_name, file_name, file_path, file_size, mime_type
                            ) VALUES (?, ?, ?, ?, ?, ?, ?)
                        `, [studentId, docType, file.originalname, fileName, storedPath, file.size, file.mimetype])
                    );
                }
            }
            await Promise.all(docPromises);
        }

        await connection.commit();

        // Auto-sync master Excel file directly to Google Drive
        excelService.syncMasterExcelToDrive().catch(err => console.error('Error syncing Excel to Drive:', err));

        // Send automated confirmation email asynchronously
        emailService.sendSubmissionConfirmation({
            studentEmail: email,
            studentName: name,
            tu4fId: tu4f_id,
            department: department,
            status: status,
            driveFolderUrl: driveFolderUrl
        }).catch(err => console.error('Error sending confirmation email:', err));

        res.status(201).json({ 
            message: 'Student record created successfully', 
            studentId, 
            folderName,
            driveFolderUrl
        });
    } catch (error) {
        await connection.rollback();
        console.error(error);
        res.status(500).json({ message: 'Internal server error', error: error.message });
    } finally {
        connection.release();
    }
});

// POST /api/students/:id/send-reminder
router.post('/:id/send-reminder', auth, async (req, res) => {
    try {
        const [students] = await pool.query('SELECT * FROM students WHERE id = ?', [req.params.id]);
        if (students.length === 0) return res.status(404).json({ message: 'Student not found' });

        const s = students[0];
        const sent = await emailService.sendDocumentReminder({
            studentEmail: s.email,
            studentName: s.name,
            tu4fId: s.tu4f_id,
            status: s.status,
            notes: s.notes
        });

        if (sent) {
            res.json({ message: `Reminder email sent to ${s.email}` });
        } else {
            res.status(500).json({ message: 'Failed to send reminder email' });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal server error', error: error.message });
    }
});

// GET /api/students/stats/summary — must be BEFORE /:id routes
router.get('/stats/summary', async (req, res) => {
    try {
        const [totalCount] = await pool.query('SELECT COUNT(*) as count FROM students');
        const [statusCounts] = await pool.query('SELECT status, COUNT(*) as count FROM students GROUP BY status');
        const [countryCounts] = await pool.query('SELECT country, COUNT(*) as count FROM students WHERE country IS NOT NULL GROUP BY country');
        const [deptCounts] = await pool.query('SELECT department, COUNT(*) as count FROM students GROUP BY department');
        
        res.json({
            total: totalCount[0].count,
            by_status: statusCounts,
            by_country: countryCounts,
            by_department: deptCounts
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal server error', error: error.message });
    }
});

// GET /api/students
router.get('/', async (req, res) => {
    try {
        const { status, department, country, review_status, search, page = 1, limit = 10 } = req.query;
        let query = 'SELECT * FROM students WHERE 1=1';
        const params = [];

        if (status) {
            query += ' AND status = ?';
            params.push(status);
        }
        if (department) {
            query += ' AND department = ?';
            params.push(department);
        }
        if (country) {
            query += ' AND country = ?';
            params.push(country);
        }
        if (review_status) {
            query += ' AND review_status = ?';
            params.push(review_status);
        }
        if (search) {
            query += ' AND (name LIKE ? OR tu4f_id LIKE ? OR email LIKE ?)';
            params.push(`%${search}%`, `%${search}%`, `%${search}%`);
        }

        query += ' ORDER BY created_at DESC';

        const offset = (page - 1) * limit;
        const pagedQuery = `${query} LIMIT ? OFFSET ?`;
        
        const [students] = await pool.query(pagedQuery, [...params, parseInt(limit), parseInt(offset)]);
        const [countResult] = await pool.query(`SELECT COUNT(*) as count FROM (${query}) AS sub`, params);
        
        // get document counts
        for (const student of students) {
            const [docs] = await pool.query('SELECT COUNT(*) as docCount FROM documents WHERE student_id = ?', [student.id]);
            student.document_count = docs[0].docCount;
        }

        res.json({
            data: students,
            total: countResult[0].count,
            page: parseInt(page),
            limit: parseInt(limit)
        });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal server error', error: error.message });
    }
});

// GET /api/students/:id
router.get('/:id', async (req, res) => {
    try {
        const [students] = await pool.query('SELECT * FROM students WHERE id = ?', [req.params.id]);
        if (students.length === 0) return res.status(404).json({ message: 'Student not found' });
        
        const [documents] = await pool.query('SELECT * FROM documents WHERE student_id = ?', [req.params.id]);
        
        res.json({ ...students[0], documents });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal server error', error: error.message });
    }
});

// PATCH /api/students/:id/status
router.patch('/:id/status', auth, async (req, res) => {
    try {
        const { review_status, status, notes } = req.body;
        const updates = [];
        const params = [];
        
        if (review_status !== undefined) {
            updates.push('review_status = ?');
            params.push(review_status);
        }
        if (status !== undefined) {
            updates.push('status = ?');
            params.push(status);
        }
        if (notes !== undefined) {
            updates.push('notes = ?');
            params.push(notes);
        }
        
        if (updates.length === 0) return res.status(400).json({ message: 'No valid fields to update' });
        
        params.push(req.params.id);
        await pool.query(`UPDATE students SET ${updates.join(', ')} WHERE id = ?`, params);
        
        // Auto-sync updated records to Master Excel on Google Drive
        excelService.syncMasterExcelToDrive().catch(err => console.error('Error syncing Excel to Drive:', err));

        res.json({ message: 'Status updated successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal server error', error: error.message });
    }
});

// PUT /api/students/:id
router.put('/:id', auth, async (req, res) => {
    try {
        const updateData = { ...req.body };
        delete updateData.id; // Prevent updating ID
        delete updateData.tu4f_id; // Prevent updating tu4f_id
        
        const keys = Object.keys(updateData);
        if (keys.length === 0) return res.status(400).json({ message: 'No fields to update' });
        
        const setClause = keys.map(k => `${k} = ?`).join(', ');
        const values = Object.values(updateData);
        
        await pool.query(`UPDATE students SET ${setClause} WHERE id = ?`, [...values, req.params.id]);
        
        // Auto-sync updated records to Master Excel on Google Drive
        excelService.syncMasterExcelToDrive().catch(err => console.error('Error syncing Excel to Drive:', err));

        res.json({ message: 'Student updated successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal server error', error: error.message });
    }
});

// DELETE /api/students/:id
router.delete('/:id', auth, async (req, res) => {
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();
        const [student] = await connection.query('SELECT * FROM students WHERE id = ?', [req.params.id]);
        if (student.length === 0) return res.status(404).json({ message: 'Student not found' });
        
        const s = student[0];
        const folderName = `${s.department}_${s.tu4f_id}_${s.name}_${s.passout_year}`.replace(/[^a-zA-Z0-9_]/g, '');
        const uploadsDir = path.join(__dirname, '..', 'uploads', folderName);
        
        await connection.query('DELETE FROM students WHERE id = ?', [req.params.id]);
        
        if (fs.existsSync(uploadsDir)) {
            fs.rmSync(uploadsDir, { recursive: true, force: true });
        }
        
        await connection.commit();
        res.json({ message: 'Student and related files deleted successfully' });
    } catch (error) {
        await connection.rollback();
        console.error(error);
        res.status(500).json({ message: 'Internal server error', error: error.message });
    } finally {
        connection.release();
    }
});

module.exports = router;

