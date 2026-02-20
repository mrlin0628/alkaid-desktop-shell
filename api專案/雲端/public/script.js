document.addEventListener('DOMContentLoaded', () => {
    const dropZone = document.getElementById('drop-zone');
    const fileInput = document.getElementById('file-input');
    const uploadProgress = document.getElementById('upload-progress');
    const progressFill = document.getElementById('progress-fill');
    const progressText = document.getElementById('progress-text');
    const fileList = document.getElementById('file-list');
    const refreshBtn = document.getElementById('refresh-btn');

    // Load files on startup
    fetchFiles();

    // Event Listeners
    refreshBtn.addEventListener('click', fetchFiles);

    dropZone.addEventListener('click', () => fileInput.click());

    fileInput.addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            handleFiles(e.target.files);
        }
    });

    // Drag & Drop Events
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, preventDefaults, false);
    });

    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    ['dragenter', 'dragover'].forEach(eventName => {
        dropZone.addEventListener(eventName, highlight, false);
    });

    ['dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, unhighlight, false);
    });

    function highlight() {
        dropZone.classList.add('dragover');
    }

    function unhighlight() {
        dropZone.classList.remove('dragover');
    }

    dropZone.addEventListener('drop', handleDrop, false);

    function handleDrop(e) {
        const dt = e.dataTransfer;
        const files = dt.files;
        handleFiles(files);
    }

    function handleFiles(files) {
        ([...files]).forEach(uploadFile);
    }

    function uploadFile(file) {
        const url = '/api/upload';
        const formData = new FormData();
        formData.append('file', file);

        // Show Progress
        uploadProgress.classList.remove('hidden');
        progressFill.style.width = '0%';
        progressText.innerText = `Uploading ${file.name}...`;

        const xhr = new XMLHttpRequest();
        xhr.open('POST', url, true);

        xhr.upload.onprogress = function (e) {
            if (e.lengthComputable) {
                const percentComplete = (e.loaded / e.total) * 100;
                progressFill.style.width = percentComplete + '%';
            }
        };

        xhr.onload = function () {
            if (xhr.status == 200) {
                progressText.innerText = 'Upload Complete';
                setTimeout(() => {
                    uploadProgress.classList.add('hidden');
                    progressFill.style.width = '0%';
                }, 2000);
                fetchFiles();
            } else {
                progressText.innerText = 'Upload Failed';
            }
        };

        xhr.onerror = function () {
            progressText.innerText = 'Error uploading file';
        };

        xhr.send(formData);
    }

    async function fetchFiles() {
        try {
            const response = await fetch('/api/files');
            if (!response.ok) throw new Error('Failed to fetch files');
            const files = await response.json();
            renderFiles(files);
        } catch (error) {
            console.error('Error:', error);
            fileList.innerHTML = '<div class="loading-spinner">Error loading files</div>';
        }
    }

    function renderFiles(files) {
        fileList.innerHTML = '';
        if (files.length === 0) {
            fileList.innerHTML = '<div class="loading-spinner">No files uploaded yet</div>';
            return;
        }

        files.sort((a, b) => new Date(b.date) - new Date(a.date)); // Newest first

        files.forEach(file => {
            const item = document.createElement('a');
            item.href = `/uploads/${file.name}`;
            item.className = 'file-item';
            item.target = '_blank'; // Open in new tab

            const iconName = getIconForFile(file.name);

            item.innerHTML = `
                <ion-icon name="${iconName}" class="file-icon"></ion-icon>
                <div class="file-info">
                    <div class="file-name">${file.name}</div>
                    <div class="file-meta">
                        <span>${formatSize(file.size)}</span>
                        <span>•</span>
                        <span>${formatDate(file.date)}</span>
                    </div>
                </div>
                <ion-icon name="download-outline" class="action-icon"></ion-icon>
            `;
            fileList.appendChild(item);
        });
    }

    function formatSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    function formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }

    function getIconForFile(filename) {
        const ext = filename.split('.').pop().toLowerCase();
        if (['jpg', 'jpeg', 'png', 'gif', 'svg'].includes(ext)) return 'image-outline';
        if (['mp4', 'webm', 'mov'].includes(ext)) return 'videocam-outline';
        if (['mp3', 'wav'].includes(ext)) return 'musical-notes-outline';
        if (['pdf'].includes(ext)) return 'document-text-outline';
        if (['zip', 'rar', '7z'].includes(ext)) return 'file-tray-full-outline';
        if (['txt', 'md'].includes(ext)) return 'document-outline';
        return 'document-outline';
    }
});
