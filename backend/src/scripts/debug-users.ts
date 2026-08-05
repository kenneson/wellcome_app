import 'dotenv/config';
import { prisma } from '../infrastructure/database/prismaClient';

async function main() {
    try {
        const users = await prisma.user.count();
        console.log(`Users in database: ${users}`);
    } catch (e) {
        console.error('Error fetching users:', e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
