import { json } from '@sveltejs/kit';

export async function POST({ request }) {
    const stream = new ReadableStream({
        async start(controller) {
            const encoder = new TextEncoder();

            // Helper to send logs
            const sendLog = (msg: string) => {
                const data = JSON.stringify({ type: 'log', message: msg });
                controller.enqueue(encoder.encode(`data: ${data}\n\n`));
            };

            const sendResult = (data: any) => {
                const jsonStr = JSON.stringify({ type: 'result', data });
                controller.enqueue(encoder.encode(`data: ${jsonStr}\n\n`));
            };

            try {
                // Simulate initialization
                sendLog("Initializing test environment...");
                await new Promise(r => setTimeout(r, 1000));

                sendLog("Loading model 'test-mock'...");
                await new Promise(r => setTimeout(r, 1000));

                // Simulate processing with sparse logs
                const totalSteps = 5;
                const durationPerStep = 1000; // 1 second per step

                // We'll simulate a 10s video
                // Step 1: 00:00 -> 00:02
                sendLog("Processing chunk 1 --> 00:02.000");
                await new Promise(r => setTimeout(r, 2000));

                // Step 2: 00:02 -> 00:05
                sendLog("Processing chunk 2 --> 00:05.000");
                await new Promise(r => setTimeout(r, 3000));

                // Step 3: Big gap to test interpolation slowing down
                // 00:05 -> 00:06 (slow process)
                sendLog("Processing chunk 3 --> 00:06.000");
                await new Promise(r => setTimeout(r, 2000));

                // Step 4: Fast burst
                sendLog("Processing chunk 4 --> 00:09.000");
                await new Promise(r => setTimeout(r, 500));

                // Final Step: Simulate "Mixed content" bug
                // Send a log and a result in the same chunk, or very close
                sendLog("Finalizing...");

                // Construct a tricky chunk that might confuse simple parsers
                // Note: The real server sends chunks which might contain multiple SSE messages
                // or split messages. Here we construct a valid SSE stream but maybe burst it.

                // Emulating the "Missing Result" scenario:
                // sending text that looks like a log immediately followed by result

                const mixedPayload = `data: ${JSON.stringify({ type: 'log', message: "Almost done..." })}\n\ndata: ${JSON.stringify({ type: 'result', data: { text: "This is a TEST transcription result. If you see this, the test PASSED." } })}\n\n`;

                controller.enqueue(encoder.encode(mixedPayload));

            } catch (e: any) {
                const error = JSON.stringify({ type: 'error', message: e.message });
                controller.enqueue(encoder.encode(`data: ${error}\n\n`));
            } finally {
                controller.close();
            }
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
