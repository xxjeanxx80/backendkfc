const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

async function runMigration() {
  let connection;
  
  try {
    // Kết nối database
    connection = await mysql.createConnection({
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || 3306,
      user: process.env.DB_USERNAME || 'root',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_DATABASE || 'kfc_scm',
      multipleStatements: true,
    });

    console.log('Connected to database');

    // Đọc file migration
    const migrationSQL = fs.readFileSync(
      path.join(__dirname, 'migration_temperature_logs.sql'),
      'utf8'
    );

    // Chạy migration
    console.log('Running migration...');
    await connection.query(migrationSQL);
    
    console.log('Migration completed successfully!');
    
    // Kiểm tra kết quả
    const [rows] = await connection.query(`
      SELECT COLUMN_NAME, DATA_TYPE, COLUMN_DEFAULT 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'temperature_logs'
      ORDER BY ORDINAL_POSITION
    `, [process.env.DB_DATABASE || 'kfc_scm']);
    
    console.log('\nTable structure:');
    console.table(rows);
    
  } catch (error) {
    console.error('Migration failed:', error.message);
    process.exit(1);
  } finally {
    if (connection) {
      await connection.end();
      console.log('\nDatabase connection closed');
    }
  }
}

runMigration();

