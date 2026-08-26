const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const auth = require('../middleware/auth');

// GET /api/alumni
router.get('/', async (req, res) => {
    try {
        const { country, university, course, branch, search } = req.query;
        let query = 'SELECT * FROM alumni WHERE 1=1';
        const params = [];

        if (country) {
            query += ' AND pg_country = ?';
            params.push(country);
        }
        if (university) {
            query += ' AND pg_university LIKE ?';
            params.push(`%${university}%`);
        }
        if (course) {
            query += ' AND pg_course LIKE ?';
            params.push(`%${course}%`);
        }
        if (branch) {
            query += ' AND branch = ?';
            params.push(branch);
        }
        if (search) {
            query += ' AND (name LIKE ? OR current_company LIKE ?)';
            params.push(`%${search}%`, `%${search}%`);
        }

        query += ' ORDER BY created_at DESC';

        const [alumni] = await pool.query(query, params);
        res.json(alumni);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal server error', error: error.message });
    }
});

// GET /api/alumni/:id
router.get('/:id', async (req, res) => {
    try {
        const [alumni] = await pool.query('SELECT * FROM alumni WHERE id = ?', [req.params.id]);
        if (alumni.length === 0) return res.status(404).json({ message: 'Alumni not found' });
        res.json(alumni[0]);
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal server error', error: error.message });
    }
});

// POST /api/alumni
router.post('/', auth, async (req, res) => {
    try {
        const { name, branch, passout_year, pg_university, pg_course, pg_country, pg_city, current_company, designation, email, linkedin_url, phone, willing_to_mentor, areas_of_help, photo_url } = req.body;
        
        const areasJson = JSON.stringify(areas_of_help || []);
        
        const [result] = await pool.query(`
            INSERT INTO alumni (name, branch, passout_year, pg_university, pg_course, pg_country, pg_city, current_company, designation, email, linkedin_url, phone, willing_to_mentor, areas_of_help, photo_url)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `, [name, branch, passout_year, pg_university, pg_course, pg_country, pg_city, current_company, designation, email, linkedin_url, phone, willing_to_mentor, areasJson, photo_url]);
        
        res.status(201).json({ message: 'Alumni created successfully', id: result.insertId });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal server error', error: error.message });
    }
});

// PUT /api/alumni/:id
router.put('/:id', auth, async (req, res) => {
    try {
        const updateData = { ...req.body };
        delete updateData.id;
        
        if (updateData.areas_of_help) {
            updateData.areas_of_help = JSON.stringify(updateData.areas_of_help);
        }

        const keys = Object.keys(updateData);
        if (keys.length === 0) return res.status(400).json({ message: 'No fields to update' });
        
        const setClause = keys.map(k => `${k} = ?`).join(', ');
        const values = Object.values(updateData);
        
        await pool.query(`UPDATE alumni SET ${setClause} WHERE id = ?`, [...values, req.params.id]);
        res.json({ message: 'Alumni updated successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal server error', error: error.message });
    }
});

// DELETE /api/alumni/:id
router.delete('/:id', auth, async (req, res) => {
    try {
        await pool.query('DELETE FROM alumni WHERE id = ?', [req.params.id]);
        res.json({ message: 'Alumni deleted successfully' });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal server error', error: error.message });
    }
});

const emailService = require('../services/emailService');

// POST /api/alumni/:id/connect
router.post('/:id/connect', async (req, res) => {
    try {
        const [alumniRows] = await pool.query('SELECT * FROM alumni WHERE id = ?', [req.params.id]);
        if (alumniRows.length === 0) return res.status(404).json({ message: 'Alumni not found' });

        const alumnus = alumniRows[0];
        const { studentName, studentEmail, studentPhone, studentBranch, targetCountry, message } = req.body;

        if (!studentName || !studentEmail || !message) {
            return res.status(400).json({ message: 'Student Name, Email, and Message are required' });
        }

        const sent = await emailService.sendAlumniConnectRequest({
            alumniEmail: alumnus.email,
            alumniName: alumnus.name,
            studentName,
            studentEmail,
            studentPhone,
            studentBranch,
            targetCountry,
            message
        });

        if (sent) {
            res.json({ message: `Mentorship request sent to ${alumnus.name} successfully!` });
        } else {
            res.status(500).json({ message: 'Failed to send connect request email' });
        }
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: 'Internal server error', error: error.message });
    }
});

module.exports = router;
