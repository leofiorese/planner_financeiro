import mysql from 'mysql2/promise';
import fs from 'fs';
import path from 'path';

async function run() {
  try {
    const connection = await mysql.createConnection({
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASSWORD || '',
        database: process.env.DB_NAME || 'finance_planner',
    });
    
    const sql = fs.readFileSync(path.join(process.cwd(), 'wishlist_migration.sql'), 'utf-8');
    await connection.query(sql);
    console.log("Migration successful");
    process.exit(0);
  } catch (e) {
    console.error("Migration failed", e);
    process.exit(1);
  }
}
run();
