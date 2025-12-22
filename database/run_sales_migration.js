const mysql = require('mysql2/promise');
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const config = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 3306,
  user: process.env.DB_USERNAME || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_DATABASE || 'kfc_scm',
  multipleStatements: true,
};

async function runMigration() {
  let connection;
  
  try {
    console.log('Đang kết nối database...');
    connection = await mysql.createConnection(config);
    console.log('Đã kết nối database thành công');

    const fs = require('fs');
    const path = require('path');
    
    // Đọc file migration
    const migrationPath = path.join(__dirname, 'migration_add_sales_reference_type.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    console.log('Đang chạy migration...');
    
    // Thực thi migration
    await connection.query(migrationSQL);
    
    console.log('Migration thành công! Đã thêm SALES vào enum referenceType.');
    
    // Verify migration
    console.log('\nĐang kiểm tra migration...');
    const [result] = await connection.query(`
      SELECT COLUMN_TYPE 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = ? 
      AND TABLE_NAME = 'inventory_transactions' 
      AND COLUMN_NAME = 'referenceType'
    `, [config.database]);
    
    if (result.length > 0) {
      console.log('Enum referenceType hiện tại:', result[0].COLUMN_TYPE);
      if (result[0].COLUMN_TYPE.includes("'SALES'")) {
        console.log('✅ SALES đã được thêm vào enum thành công!');
      } else {
        console.log('⚠️  SALES chưa có trong enum. Vui lòng kiểm tra lại.');
      }
    }
    
  } catch (error) {
    console.error('Lỗi khi chạy migration:', error.message);
    if (error.code === 'ER_DUP_FIELDNAME' || error.message.includes('already exists')) {
      console.log('⚠️  Migration có thể đã được chạy trước đó.');
    } else {
      throw error;
    }
  } finally {
    if (connection) {
      await connection.end();
      console.log('\nĐã đóng kết nối database');
    }
  }
}

runMigration().catch(console.error);

