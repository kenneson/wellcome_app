import { defineConfig } from '@prisma/config';
import 'dotenv/config'; // Ensure env vars are loaded for the config file

export default defineConfig({
    datasource: {
        url: process.env.DATABASE_URL,
    },
});
