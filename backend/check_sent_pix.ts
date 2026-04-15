import { PrismaClient } from '@prisma/client';
import * as dotenv from 'dotenv';
dotenv.config();

const prisma = new PrismaClient();

async function run() {
    try {
        console.log("=== SAQUES RECENTES NO BD ===");
        const withdrawals = await prisma.withdrawalRequest.findMany({
            take: 5,
            orderBy: { updatedAt: 'desc' }
        });
        console.log(JSON.stringify(withdrawals, null, 2));
    } catch(e) { console.error(e); }
}
run();
