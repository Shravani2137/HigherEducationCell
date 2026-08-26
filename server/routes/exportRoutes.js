const express = require('express');
const router = express.Router();
const exceljs = require('exceljs');
const pool = require('../config/db');
const auth = require('../middleware/auth');

// GET /api/export/excel
router.get('/excel', auth, async (req, res) => {
    try {
        const [students] = await pool.query('SELECT * FROM students ORDER BY created_at DESC');

        // Get document counts for each student
        for (const student of students) {
            const [docs] = await pool.query('SELECT COUNT(*) as docCount FROM documents WHERE student_id = ?', [student.id]);
            student.document_count = docs[0].docCount;
        }

        const workbook = new exceljs.Workbook();
        workbook.creator = 'TEC Higher Education Cell';
        workbook.created = new Date();
        const worksheet = workbook.addWorksheet('HEC Student Data', {
            views: [{ state: 'frozen', ySplit: 1 }],
        });

        worksheet.columns = [
            { header: 'Serial No.', key: 'serial', width: 10 },
            { header: 'Date', key: 'date', width: 14 },
            { header: 'TU4F ID', key: 'tu4f_id', width: 18 },
            { header: 'Name', key: 'name', width: 25 },
            { header: 'Department', key: 'department', width: 14 },
            { header: 'UG Duration', key: 'ug_duration', width: 14 },
            { header: 'Contact No', key: 'contact_no', width: 16 },
            { header: 'Email ID', key: 'email', width: 30 },
            { header: 'Applying For', key: 'applying_for', width: 14 },
            { header: 'Exam and Score', key: 'exam_score', width: 22 },
            { header: 'Country', key: 'country', width: 15 },
            { header: 'Institute Admitted', key: 'institute_admitted', width: 28 },
            { header: 'PG Duration', key: 'pg_duration', width: 14 },
            { header: 'PG Course', key: 'pg_course', width: 20 },
            { header: 'Documents Uploaded', key: 'documents', width: 18 },
            { header: 'Status', key: 'status', width: 14 },
            { header: 'Review', key: 'review_status', width: 12 },
            { header: 'Notes', key: 'notes', width: 30 },
        ];

        // Style header row
        const headerRow = worksheet.getRow(1);
        headerRow.font = { name: 'Calibri', bold: true, color: { argb: 'FFFFFFFF' }, size: 11 };
        headerRow.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF1A1A2E' } };
        headerRow.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
        headerRow.height = 28;

        students.forEach((student, index) => {
            const examScore = student.entrance_exam_name
                ? `${student.entrance_exam_name}: ${student.entrance_exam_score || 'N/A'}`
                : 'N/A';

            const row = worksheet.addRow({
                serial: index + 1,
                date: student.date_submitted ? new Date(student.date_submitted).toLocaleDateString('en-IN') : '',
                tu4f_id: student.tu4f_id,
                name: student.name,
                department: student.department,
                ug_duration: student.ug_duration || '',
                contact_no: student.contact_no,
                email: student.email,
                applying_for: student.applying_for || '',
                exam_score: examScore,
                country: student.country || '',
                institute_admitted: student.institute_admitted || '',
                pg_duration: student.pg_duration || '',
                pg_course: student.pg_course || '',
                documents: `${student.document_count} file(s)`,
                status: student.status.charAt(0).toUpperCase() + student.status.slice(1).replace('_', ' '),
                review_status: student.review_status === 'checked' ? '✅ Checked' : '⬜ Unchecked',
                notes: student.notes || '',
            });

            row.alignment = { vertical: 'middle' };

            // Color code based on review status and status
            if (student.review_status === 'checked') {
                row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD6EAF8' } }; // Soft blue
            } else if (student.status === 'completed') {
                row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFD5F5E3' } }; // Soft green
            } else if (student.status === 'partial') {
                row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFEF9E7' } }; // Soft amber
            } else if (student.status === 'pending') {
                row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFADBD8' } }; // Soft red
            } else if (student.status === 'follow_up') {
                row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFDEBD0' } }; // Soft orange
            }
        });

        // Add borders to all cells
        worksheet.eachRow((row) => {
            row.eachCell((cell) => {
                cell.border = {
                    top: { style: 'thin', color: { argb: 'FFE0E0E0' } },
                    left: { style: 'thin', color: { argb: 'FFE0E0E0' } },
                    bottom: { style: 'thin', color: { argb: 'FFE0E0E0' } },
                    right: { style: 'thin', color: { argb: 'FFE0E0E0' } },
                };
            });
        });

        const fileName = `HEC_Students_${new Date().toISOString().split('T')[0]}.xlsx`;
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename=${fileName}`);

        await workbook.xlsx.write(res);
        res.end();
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal server error', error: error.message });
    }
});

module.exports = router;
