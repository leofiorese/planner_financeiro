import path from 'path';
import dotenv from 'dotenv';

// Always load backend/.env, regardless of the current working directory
// (works from both src/config and dist/config).
dotenv.config({ path: path.resolve(__dirname, '../../.env'), quiet: true });

export const env = {
  port: Number(process.env.PORT) || 3001,
  host: process.env.HOST || 'localhost',
};
