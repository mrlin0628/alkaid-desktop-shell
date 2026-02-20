import { fail, redirect } from '@sveltejs/kit';
import type { Actions } from './$types';
import { env } from '$env/dynamic/private';

// Helper for crypto hashing to match python script's sha256
async function sha256(message: string) {
    const msgBuffer = new TextEncoder().encode(message);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

export const actions = {
    default: async ({ request, cookies }) => {
        const data = await request.formData();
        const password = data.get('password');

        if (!password || typeof password !== 'string') {
            return fail(400, { incorrect: true });
        }

        try {
            const inputHash = await sha256(password);

            // Check against environment variable
            const storedHash = env.ADMIN_PASSWORD_HASH;

            if (!storedHash) {
                console.error("ADMIN_PASSWORD_HASH not configured in environment.");
                return fail(500, { error: 'Server misconfiguration' });
            }

            if (inputHash === storedHash) {
                // Determine cookie domain strategy if needed, but defaults are usually fine
                // Use session cookie (no maxAge = browser close)
                cookies.set('alkaid_session', 'authenticated', {
                    path: '/',
                    httpOnly: true,
                    sameSite: 'strict',
                    secure: process.env.NODE_ENV === 'production'
                });

                // Success! Redirect to home
                throw redirect(303, '/');
            } else {
                return fail(401, { incorrect: true });
            }
        } catch (err: unknown) {
            if (err && typeof err === 'object' && 'status' in err && err.status === 303) throw err; // Re-throw redirects
            console.error("Login Error: ", err);
            return fail(500, { error: 'Internal error' });
        }
    }
} satisfies Actions;
