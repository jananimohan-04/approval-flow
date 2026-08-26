import type { VercelRequest, VercelResponse } from '@vercel/node';
import { executeProductionCronSync } from '../src/lib/services/cronSync';

export default async function handler(req: VercelRequest, res: VercelResponse) {
    if (req.method !== 'POST' && req.method !== 'GET') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    try {
        const authHeader = req.headers.authorization || '';
        if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const result = await executeProductionCronSync(process.env.CRON_SECRET || '');

        return res.status(200).json(result);
    } catch (e: any) {
        console.error('Vercel Cron execution failed:', e);
        return res.status(500).json({ error: 'Internal Server Error' });
    }
}
