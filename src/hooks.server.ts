import { processManager } from '$lib/server/processManager';
import { redirect } from '@sveltejs/kit';
import type { Handle } from '@sveltejs/kit';

export const handle: Handle = async ({ event, resolve }) => {
    // Check if the route requires authentication
    // Protect everything except /login and static assets (which are handled before hooks usually, but to be safe)
    if (!event.url.pathname.startsWith('/login') && !event.url.pathname.startsWith('/api/') && !event.url.pathname.startsWith('/_app/')) {
        const session = event.cookies.get('alkaid_session');

        // If not authenticated, redirect to login page immediately, blocking content load
        if (session !== 'authenticated') {
            throw redirect(303, '/login');
        }
    }

    const response = await resolve(event);
    return response;
};

// Handle cleanup on process exit
if (typeof process !== 'undefined') {
    process.on('exit', () => {
        processManager.stopAll();
    });

    process.on('SIGINT', () => {
        processManager.stopAll();
        process.exit();
    });

    process.on('SIGTERM', () => {
        processManager.stopAll();
        process.exit();
    });
}
