const express = require('express');
const multer = require('multer');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3030;

// Middleware
app.use(cors());
app.use(express.static('public')); // Serve frontend files

// Configure Multer for storage
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
}

// -----------------------------------------------------
// MIGRATION / INITIALIZATION
// Ensure "Default" folder exists and move root files there
// -----------------------------------------------------
const defaultFolder = path.join(uploadDir, 'Default');
if (!fs.existsSync(defaultFolder)) {
    fs.mkdirSync(defaultFolder);
}

// Move files in root 'uploads' to 'Default' to clean up
// Just doing a quick scan on startup
try {
    const rootItems = fs.readdirSync(uploadDir);
    rootItems.forEach(item => {
        const itemPath = path.join(uploadDir, item);
        const stats = fs.statSync(itemPath);
        if (stats.isFile()) {
            const limit = 50; // Safety limit
            console.log(`Migrating ${item} to Default folder...`);
            fs.renameSync(itemPath, path.join(defaultFolder, item));
        }
    });
} catch (e) {
    console.error("Migration error:", e);
}

// Security: Helper for path traversal prevention
function getSafePath(baseDir, subFolder = '', file = '') {
    // Resolve absolute path
    let resolved = path.resolve(baseDir, subFolder);
    if (file) {
        resolved = path.resolve(resolved, file);
    }
    const safeBase = path.resolve(baseDir);

    // Check if the resolved path starts with the base dir path (with separator)
    // or if it matches exactly the base directory (e.g. root upload folder)
    if (!resolved.startsWith(safeBase + path.sep) && resolved !== safeBase) {
        return null; // Path traversal detected
    }
    return resolved;
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        // Dynamic folder support
        const folder = req.query.folder || '';
        const dest = getSafePath(uploadDir, folder);

        if (!dest) {
            return cb(new Error("Access denied: Invalid folder path"));
        }

        // Ensure folder exists (should be created by API, but safety check)
        if (!fs.existsSync(dest)) {
            fs.mkdirSync(dest, { recursive: true });
        }

        cb(null, dest);
    },
    filename: (req, file, cb) => {
        // Handle non-ASCII filenames (common issue with Multer/Busboy)
        file.originalname = Buffer.from(file.originalname, 'latin1').toString('utf8');
        // Prevent embedded directory traversal characters in filename
        const safeName = path.basename(file.originalname);
        cb(null, safeName);
    }
});

const upload = multer({ storage: storage });

// --- Routes ---
// Create Folder Endpoint
app.post('/api/folders', (req, res) => {
    const folderName = req.query.name;
    if (!folderName) return res.status(400).json({ error: 'Folder name is required' });

    const folderPath = getSafePath(uploadDir, folderName);
    if (!folderPath || folderPath === path.resolve(uploadDir)) {
        return res.status(403).json({ error: 'Access denied: Invalid or restricted path' });
    }

    if (fs.existsSync(folderPath)) {
        return res.status(409).json({ error: 'Folder already exists' });
    }

    fs.mkdirSync(folderPath);
    res.json({ message: 'Folder created successfully' });
});

// Delete Folder Endpoint
app.delete('/api/folders', (req, res) => {
    const folderName = req.query.name;
    if (!folderName) return res.status(400).json({ error: 'Folder name is required' });

    const folderPath = getSafePath(uploadDir, folderName);
    if (!folderPath || folderPath === path.resolve(uploadDir)) {
        return res.status(403).json({ error: 'Access denied: Invalid or restricted path' });
    }

    if (!fs.existsSync(folderPath)) {
        return res.status(404).json({ error: 'Folder not found' });
    }

    // Recursive delete
    fs.rm(folderPath, { recursive: true, force: true }, (err) => {
        if (err) return res.status(500).json({ error: `Failed to delete folder: ${err.message}` });
        res.json({ message: 'Folder deleted successfully' });
    });
});

// Upload Endpoint (Modified for Folder Support)
app.post('/api/upload', (req, res) => {
    upload.single('file')(req, res, (err) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

        console.log(`File received: ${req.file.originalname} in ${req.query.folder || 'root'}`);
        res.json({ message: 'File uploaded successfully', filename: req.file.filename });
    });
});

// Download Endpoint (Force Download) - Modified for subfolders
app.get('/api/download/:filename', (req, res) => {
    const filename = req.params.filename;
    const folder = req.query.folder || '';

    // Ensure filename is just a single file name
    const safeFilename = path.basename(filename);
    const filePath = getSafePath(uploadDir, folder, safeFilename);

    if (!filePath) {
        return res.status(403).json({ error: 'Access denied: Invalid path' });
    }

    if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: 'File not found' });
    }

    res.download(filePath, safeFilename, (err) => {
        if (err) {
            console.error("Download error:", err);
            if (!res.headersSent) {
                res.status(500).send('Error downloading file');
            }
        }
    });
});

// Delete Endpoint
app.delete('/api/files/:filename', (req, res) => {
    const filename = req.params.filename;
    const safeFilename = path.basename(filename);
    const folder = req.query.folder || '';

    const filePath = getSafePath(uploadDir, folder, safeFilename);

    if (!filePath) {
        return res.status(403).json({ error: 'Access denied: Invalid path' });
    }

    fs.unlink(filePath, (err) => {
        if (err) {
            console.error(`Failed to delete ${safeFilename}:`, err);
            if (err.code === 'ENOENT') {
                return res.status(404).json({ error: 'File not found' });
            }
            return res.status(500).json({ error: 'Failed to delete file' });
        }

        console.log(`Deleted file: ${safeFilename}`);
        res.json({ message: 'File deleted successfully' });
    });
});

// List Files Endpoint (Modified for Folder Support)
app.get('/api/files', (req, res) => {
    const folder = req.query.folder || '';
    const targetDir = getSafePath(uploadDir, folder);

    if (!targetDir) {
        return res.status(403).json({ error: 'Access denied: Invalid path' });
    }

    if (!fs.existsSync(targetDir)) {
        return res.status(404).json({ error: 'Directory not found', path: targetDir });
    }

    fs.readdir(targetDir, { withFileTypes: true }, (err, dirents) => {
        if (err) {
            return res.status(500).json({ error: 'Unable to scan directory' });
        }

        const items = dirents.map(dirent => {
            const name = dirent.name;
            const itemPath = path.join(targetDir, name);

            try {
                const stats = fs.statSync(itemPath);
                return {
                    name: name,
                    type: dirent.isDirectory() ? 'folder' : 'file',
                    size: stats.size,
                    date: stats.mtime
                };
            } catch (e) {
                return null;
            }
        }).filter(item => item !== null);

        res.json(items);
    });
});

// Serve Uploaded Files
app.use('/uploads', express.static(uploadDir));

const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
    // Print LAN IP for user convenience
    const { networkInterfaces } = require('os');
    const nets = networkInterfaces();
    for (const name of Object.keys(nets)) {
        for (const net of nets[name]) {
            if (net.family === 'IPv4' && !net.internal) {
                console.log(`Network access: http://${net.address}:${PORT}`);
            }
        }
    }
});

server.on('error', (e) => {
    if (e.code === 'EADDRINUSE') {
        console.log(`Port ${PORT} is already in use. Server might already be running.`);
        process.exit(0); // Exit gracefully
    } else {
        console.error(e);
        process.exit(1);
    }
});
