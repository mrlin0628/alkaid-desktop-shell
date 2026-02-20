import { json } from '@sveltejs/kit';
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import { writeFile, mkdir } from 'fs/promises';

export async function POST({ request }) {
    let filePath = '';
    let modelSize = 'base';
    let device = 'cpu';

    // Handle both JSON and Multipart data
    const contentType = request.headers.get('content-type') || '';

    try {
        if (contentType.includes('multipart/form-data')) {
            const formData = await request.formData();
            const file = formData.get('file') as File;
            modelSize = (formData.get('modelSize') as string) || 'base';
            device = (formData.get('device') as string) || 'cpu';

            if (!file) {
                return json({ error: 'No file uploaded' }, { status: 400 });
            }

            // Ensure temp directory exists
            const tempDir = path.join(process.cwd(), 'temp');
            await mkdir(tempDir, { recursive: true });

            // Create unique filename
            const filename = `${Date.now()}-${file.name}`;
            filePath = path.join(tempDir, filename);

            // Write file
            const buffer = Buffer.from(await file.arrayBuffer());
            await writeFile(filePath, buffer);
        } else {
            const body = await request.json();
            filePath = body.filePath;
            modelSize = body.modelSize;
            device = body.device;
        }
    } catch (err: any) {
        console.error('Error processing request body:', err);
        return json({ error: `Failed to process request: ${err.message}` }, { status: 500 });
    }

    if (!filePath) {
        return json({ error: 'File path is required' }, { status: 400 });
    }

    // Validate file exists
    if (!fs.existsSync(filePath)) {
        return json({ error: 'File not found' }, { status: 404 });
    }

    const pythonScript = 'c:\\程式\\音檔轉換\\cli_runner.py';
    const pythonExe = 'c:\\程式\\音檔轉換\\venv\\Scripts\\python.exe';
    const cwd = 'c:\\程式\\音檔轉換';

    const stream = new ReadableStream({
        start(controller) {
            const args = ['-u', pythonScript, filePath, '--model', modelSize || 'base', '--device', device || 'cpu'];

            const pythonProcess = spawn(pythonExe, args, {
                cwd,
                env: {
                    ...process.env,
                    PYTHONIOENCODING: 'utf-8'
                }
            });

            // Buffer to handle split lines across chunks
            let buffer = '';

            const processBuffer = () => {
                const lines = buffer.split('\n');
                // Keep the last chunk if it's not empty (it might be an incomplete line)
                // If the buffer ends with \n, the last element of lines will be empty string, which is fine
                buffer = lines.pop() || '';

                for (const line of lines) {
                    const trimmed = line.trim();
                    if (!trimmed) continue;

                    // Try to parse as JSON Result
                    try {
                        const result = JSON.parse(trimmed);
                        // Validate it looks like our expected result structure (has text, segments, etc) or just assume valid JSON is result if script only outputs logs or result
                        // However, standard logs might not be JSON.
                        // Our python script likely outputs raw text for logs and JSON for result.
                        // But to be safe, let's treat any valid JSON as a potential result or structured log.
                        // The previous code assumed if it parses, it's a result. We'll stick to that but add a check if possible.
                        controller.enqueue(`data: ${JSON.stringify({ type: 'result', data: result })}\n\n`);
                    } catch (e) {
                        // Not JSON, treat as log
                        controller.enqueue(`data: ${JSON.stringify({ type: 'log', message: trimmed })}\n\n`);
                    }
                }
            };

            pythonProcess.stdout.on('data', (data) => {
                buffer += data.toString();
                processBuffer();
            });

            pythonProcess.stderr.on('data', (data) => {
                // stderr might also need buffering if it sends partial lines, but usually less critical for flow control
                // For safety, let's just send as is or simple buffer if needed. 
                // Let's send directly as log for now to avoid complexity, usually stderr is prompt.
                controller.enqueue(`data: ${JSON.stringify({ type: 'log', message: data.toString() })}\n\n`);
            });

            pythonProcess.on('close', (code) => {
                // Process any remaining buffer
                if (buffer.trim()) {
                    try {
                        const result = JSON.parse(buffer.trim());
                        controller.enqueue(`data: ${JSON.stringify({ type: 'result', data: result })}\n\n`);
                    } catch (e) {
                        controller.enqueue(`data: ${JSON.stringify({ type: 'log', message: buffer.trim() })}\n\n`);
                    }
                }

                // Determine success based on code. Note: some scripts might exit 0 even on soft error, but we handled errors via try/catch in python
                if (code !== 0) {
                    // check if we haven't already closed controller
                    try {
                        controller.enqueue(`data: ${JSON.stringify({ type: 'error', message: `Process exited with code ${code}` })}\n\n`);
                    } catch { }
                }

                // Cleanup temp file if it was uploaded
                if (contentType.includes('multipart/form-data')) {
                    fs.unlink(filePath, (err) => {
                        if (err) console.error('Failed to delete temp file:', err);
                    });
                }

                controller.close();
            });

            pythonProcess.on('error', (err) => {
                controller.enqueue(`data: ${JSON.stringify({ type: 'error', message: err.message })}\n\n`);
                controller.close();
            });
        }
    });

    return new Response(stream, {
        headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            'Connection': 'keep-alive'
        }
    });
}
