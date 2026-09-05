const pool = require("../config/db");

const studentColumns = {
  application_id: "VARCHAR(40) UNIQUE",
  university: "VARCHAR(255)",
  correction_reason: "TEXT",
  correction_token_hash: "CHAR(64)",
  correction_token_expires_at: "DATETIME",
  correction_requested_at: "DATETIME",
  correction_used_at: "DATETIME",
  approved_at: "DATETIME",
  rejected_at: "DATETIME",
  drive_folder_id: "VARCHAR(255)",
  ai_verification_result: "JSON",
  ai_confidence: "DECIMAL(5,2)",
  ai_issues: "JSON",
};

const documentColumns = {
  ocr_text: "LONGTEXT",
  ocr_result: "JSON",
  ai_verification_result: "JSON",
  verification_status:
    "ENUM('unverified','pass','warning','mismatch','manual_review') DEFAULT 'unverified'",
  admin_verification_status:
    "ENUM('pending','verified','rejected') DEFAULT 'pending'",
  updated_at: "TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP",
};

const alumniColumns = {
  source_student_id: "INT UNIQUE",
  alumni_status: "ENUM('active','inactive') DEFAULT 'active'",
};

async function addMissingColumns(conn, table, columns) {
  for (const [name, definition] of Object.entries(columns)) {
    const [rows] = await conn.query(`SHOW COLUMNS FROM ${table} LIKE ?`, [
      name,
    ]);
    if (rows.length === 0) {
      await conn.query(`ALTER TABLE ${table} ADD COLUMN ${name} ${definition}`);
    }
  }
}

async function addIndexIfMissing(conn, table, indexName, columnName) {
  const [rows] = await conn.query(
    `SHOW INDEX FROM ${table} WHERE Key_name = ?`,
    [indexName],
  );
  if (rows.length === 0) {
    await conn.query(
      `ALTER TABLE ${table} ADD INDEX ${indexName} (${columnName})`,
    );
  }
}

async function runMigration() {
  try {
    const conn = await pool.getConnection();
    await addMissingColumns(conn, "students", studentColumns);
    await addMissingColumns(conn, "documents", documentColumns);
    await addMissingColumns(conn, "alumni", alumniColumns);
    await conn.query(
      "ALTER TABLE students MODIFY COLUMN status ENUM('submitted','under_review','correction_required','approved','rejected','pending','partial','completed','follow_up') DEFAULT 'submitted'",
    );
    await conn.query(
      "UPDATE students SET status = 'submitted' WHERE status IN ('pending','partial','completed')",
    );
    await addIndexIfMissing(conn, "students", "idx_students_status", "status");
    await addIndexIfMissing(
      conn,
      "students",
      "idx_students_passout_year",
      "passout_year",
    );
    await addIndexIfMissing(
      conn,
      "students",
      "idx_students_correction_token",
      "correction_token_hash",
    );
    await conn.query(
      "UPDATE students SET application_id = CONCAT('HEC-', YEAR(COALESCE(created_at, NOW())), '-', department, '-', LPAD(id, 5, '0')) WHERE application_id IS NULL",
    );
    console.log("Workflow migration completed.");
    conn.release();
    process.exit(0);
  } catch (err) {
    console.error("Migration failed:", err.message);
    process.exit(1);
  }
}

runMigration();
