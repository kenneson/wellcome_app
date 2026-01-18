import 'dotenv/config';
import { prisma } from '../infrastructure/database/prismaClient';

async function main() {
    try {
        const users = await prisma.user.findMany();
        console.log('--- USERS IN DB ---');
        console.log(JSON.stringify(users, null, 2));
        console.log('--- END USERS ---');
    } catch (e) {
        console.error('Error fetching users:', e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
