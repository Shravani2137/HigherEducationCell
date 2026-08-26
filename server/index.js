const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const bcrypt = require('bcryptjs');
const pool = require('./config/db');

// Import routes
const studentRoutes = require('./routes/studentRoutes');
const alumniRoutes = require('./routes/alumniRoutes');
const authRoutes = require('./routes/authRoutes');
const exportRoutes = require('./routes/exportRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Create uploads directory if not exists
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
    console.log(`Created uploads directory at ${uploadsDir}`);
}

// Static serve for uploads
app.use('/uploads', express.static(uploadsDir));

// Routes
app.use('/api/students', studentRoutes);
app.use('/api/alumni', alumniRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/export', exportRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ message: 'Something went wrong!', error: err.message });
});

// Setup Server & DB
const startServer = async () => {
    try {
        // Hash admin password on startup
        const plainAdminPass = process.env.ADMIN_PASSWORD || 'TernaHEC@2026';
        const salt = await bcrypt.genSalt(10);
        process.env.ADMIN_HASH = await bcrypt.hash(plainAdminPass, salt);
        console.log('Admin password hashed and ready.');

        // Verify DB Connection & Init Schema
        const connection = await pool.getConnection();
        console.log('Connected to MySQL database.');

        // Optional: you can run the schema.sql script here to ensure tables exist
        const schemaPath = path.join(__dirname, 'db', 'schema.sql');
        if (fs.existsSync(schemaPath)) {
            const schemaSql = fs.readFileSync(schemaPath, 'utf8');
            const statements = schemaSql.split(';').filter(s => s.trim().length > 0);
            for (const statement of statements) {
                await connection.query(statement);
            }
            console.log('Schema synchronized.');
        }

        connection.release();

        app.listen(PORT, () => {
            console.log(`Server is running on port ${PORT}`);
        });

    } catch (error) {
        console.error('Failed to start server:', error);
        process.exit(1);
    }
};

startServer();
