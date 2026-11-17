/**
 * Applies a SQL file to the configured MySQL database.
 *
 * Usage (from backend/):
 *   npm run db:migrate -- wishlist_migration.sql      -> backend/database/migrations/wishlist_migration.sql
 *   npm run db:migrate -- ../schema.sql              -> paths are resolved relative to database/migrations/
 *
 * Connection settings come from backend/.env (DB_HOST, DB_PORT, DB_USER, DB_PASSWORD, DB_NAME).
 */
import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import mysql from 'mysql2/promise';

dotenv.config({ path: path.resolve(__dirname, '../.env'), quiet: true });

async function run(): Promise<void> {
  const fileArg = process.argv[2];
  if (!fileArg) {
    console.error('Usage: npm run db:migrate -- <file.sql>');
    process.exit(1);
  }

  const migrationsDir = path.resolve(__dirname, '../database/migrations');
  const filePath = path.resolve(migrationsDir, fileArg);
  if (!fs.existsSync(filePath)) {
    console.error(`Migration file not found: ${filePath}`);
    process.exit(1);
  }

  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'finance_planner',
    // Migration files contain several statements (CREATE TABLE + CREATE INDEX ...).
    multipleStatements: true,
  });

  try {
    const sql = fs.readFileSync(filePath, 'utf-8');
    await connection.query(sql);
    console.log(`Migration successful: ${path.relative(process.cwd(), filePath)}`);
  } finally {
    await connection.end();
  }
}

run().catch((error) => {
  console.error('Migration failed', error);
  process.exit(1);
});
