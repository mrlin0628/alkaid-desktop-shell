import { spawn, type ChildProcess } from 'child_process';
import { resolve } from 'path';

class ProcessManager {
    private static instance: ProcessManager;
    private processes: Map<string, ChildProcess> = new Map();

    private constructor() { }

    public static getInstance(): ProcessManager {
        if (!ProcessManager.instance) {
            ProcessManager.instance = new ProcessManager();
        }
        return ProcessManager.instance;
    }

    public startVideoService(projectRoot: string): void {
        const id = 'video-downloader';
        if (this.processes.has(id)) {
            console.log(`[ProcessManager] ${id} is already running.`);
            return;
        }

        const cwd = resolve(projectRoot, 'api專案', '影片下載');
        console.log(`[ProcessManager] Starting ${id} in ${cwd}...`);

        // Using python directly instead of batch file to avoid window popup
        // Assuming dependencies are installed. If not, user might need to run the bat once manually or we can add pip install step here.
        const child = spawn('python', ['-m', 'src.server'], {
            cwd,
            shell: false, // Important to avoid window
            stdio: 'pipe'
        });

        this.registerProcess(id, child);
    }

    public startCloudService(projectRoot: string): void {
        const id = 'cloud-service';
        if (this.processes.has(id)) {
            console.log(`[ProcessManager] ${id} is already running.`);
            return;
        }

        const cwd = resolve(projectRoot, 'api專案', '雲端');
        console.log(`[ProcessManager] Starting ${id} in ${cwd}...`);

        const child = spawn('node', ['server.js'], {
            cwd,
            shell: false,
            stdio: 'pipe'
        });

        this.registerProcess(id, child);
    }

    private registerProcess(id: string, child: ChildProcess): void {
        this.processes.set(id, child);

        child.stdout?.on('data', (data) => {
            console.log(`[${id}] ${data.toString().trim()}`);
        });

        child.stderr?.on('data', (data) => {
            console.error(`[${id} ERROR] ${data.toString().trim()}`);
        });

        child.on('exit', (code) => {
            console.log(`[ProcessManager] ${id} exited with code ${code}`);
            this.processes.delete(id);
        });
    }

    public stopAll(): void {
        console.log('[ProcessManager] Stopping all background processes...');
        for (const [id, child] of this.processes) {
            console.log(`[ProcessManager] Killing ${id}...`);
            child.kill();
        }
        this.processes.clear();
    }
}

export const processManager = ProcessManager.getInstance();
