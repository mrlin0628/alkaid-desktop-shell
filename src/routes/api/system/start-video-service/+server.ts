import { json } from '@sveltejs/kit';
import { processManager } from '$lib/server/processManager';

export async function POST() {
    try {
        const projectRoot = process.cwd();
        processManager.startVideoService(projectRoot);
        return json({ status: 'initiated', message: 'Video service background process initiated' });
    } catch (error) {
        return json({ status: 'error', message: String(error) }, { status: 500 });
    }
}
