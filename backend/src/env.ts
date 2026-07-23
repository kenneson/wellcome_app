import dotenv from 'dotenv';
import path from 'path';

// Explicitly load .env from backend root
dotenv.config({ path: path.join(__dirname, '../.env') });
