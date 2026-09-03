const pool = require('../config/db');

async function runMigration() {
    try {
        const conn = await pool.getConnection();
        const [cols] = await conn.query("SHOW COLUMNS FROM students LIKE 'ai_verification_status'");
        if (cols.length === 0) {
            await conn.query(`
                ALTER TABLE students 
                ADD COLUMN ai_score_extracted VARCHAR(100), 
                ADD COLUMN ai_verification_status ENUM('unverified', 'verified', 'discrepancy_detected', 'manual_check_needed') DEFAULT 'unverified', 
                ADD COLUMN ai_verification_notes TEXT;
            `);
            console.log('Successfully added AI verification columns to database!');
        } else {
            console.log('AI verification columns already exist in database.');
        }
        conn.release();
        process.exit(0);
    } catch (err) {
        console.error('Migration failed:', err.message);
        process.exit(1);
    }
}

runMigration();
