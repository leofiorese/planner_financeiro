import mysql from 'mysql2/promise';

/**
 * Global variable for caching the connection pool during development
 * to avoid exhausting connections on hot reloads.
 */
let pool: mysql.Pool;

export function getDbConnection() {
    if (!pool) {
        if (!process.env.DB_HOST || !process.env.DB_USER || !process.env.DB_NAME) {
            console.error("Missing database environment variables (DB_HOST, DB_USER, DB_NAME).");
        }

        pool = mysql.createPool({
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
            database: process.env.DB_NAME || 'finance_planner',
            waitForConnections: true,
            connectionLimit: 10,
            queueLimit: 0,
        });

        console.log('✅ MySQL Pool created successfully');
    }

    return pool;
}
