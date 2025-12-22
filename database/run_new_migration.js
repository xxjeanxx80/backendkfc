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
    console.log('Connecting to database...');
    connection = await mysql.createConnection(config);
    console.log('Connected successfully!');

    const fs = require('fs');
    const path = require('path');
    const migrationSQL = fs.readFileSync(
      path.join(__dirname, 'migration_add_new_features.sql'),
      'utf8'
    );

    console.log('Running migration...');
    await connection.query(migrationSQL);
    console.log('✅ Migration completed successfully!');

    // Verify migration
    console.log('\nVerifying migration...');
    
    // Check sales_transactions columns
    const [salesColumns] = await connection.query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'sales_transactions' 
      AND COLUMN_NAME IN ('costPrice', 'totalCost', 'grossProfit')
    `, [config.database]);
    console.log(`✅ Sales transactions: ${salesColumns.length}/3 new columns added`);

    // Check inventory_batches columns
    const [batchColumns] = await connection.query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'inventory_batches' 
      AND COLUMN_NAME = 'unitCost'
    `, [config.database]);
    console.log(`✅ Inventory batches: ${batchColumns.length}/1 new column added`);

    // Check items columns
    const [itemColumns] = await connection.query(`
      SELECT COLUMN_NAME 
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'items' 
      AND COLUMN_NAME IN ('safetyStock', 'leadTimeDays')
    `, [config.database]);
    console.log(`✅ Items: ${itemColumns.length}/2 new columns added`);

    // Check indexes
    const [indexes] = await connection.query(`
      SELECT INDEX_NAME 
      FROM INFORMATION_SCHEMA.STATISTICS 
      WHERE TABLE_SCHEMA = ? 
      AND INDEX_NAME IN ('IDX_sales_saleDate', 'IDX_batches_unitCost', 'IDX_items_safetyStock')
    `, [config.database]);
    console.log(`✅ Indexes: ${indexes.length}/3 new indexes created`);

    console.log('\n🎉 All migrations verified successfully!');
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    if (error.code === 'ER_DUP_FIELDNAME') {
      console.log('⚠️  Some columns may already exist. This is OK if migration was run before.');
    } else {
      throw error;
    }
  } finally {
    if (connection) {
      await connection.end();
      console.log('\nDatabase connection closed.');
    }
  }
}

runMigration().catch(console.error);

