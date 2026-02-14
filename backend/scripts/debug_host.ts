import 'dotenv/config';
import { prisma } from '../src/infrastructure/database/prismaClient';

async function main() {
    try {
        console.log('Connecting to database...');
        const event = await prisma.event.findFirst({
            orderBy: { createdAt: 'desc' },
            include: { host: true }
        });

        console.log('EVENT_DEBUG_START');
        if (event) {
            console.log(JSON.stringify(event, null, 2));
        } else {
            console.log('No event found.');
        }
        console.log('EVENT_DEBUG_END');

    } catch (e) {
        console.error('Error:', e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
