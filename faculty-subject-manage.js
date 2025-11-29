// Get subject ID from URL
const urlParams = new URLSearchParams(window.location.search);
const subjectId = urlParams.get('id');
const API_BASE = window.location.protocol === 'file:' ? 'http://localhost:8081' : '';

let allMaterials = [];
let currentEditId = null;

// Initialize page
async function init() {
    if (!subjectId) {
        alert('No subject selected');
        window.location.href = 'faculty-courses.html';
        return;
    }

    await loadSubject();
    await loadMaterials();
    setupUploadZone();
}

// Load subject details
async function loadSubject() {
    try {
        const res = await fetch(`${API_BASE}/api/subjects`);
        const data = await res.json();

        if (data.ok) {
            const subject = data.subjects.find(s => s._id === subjectId);
            if (subject) {
                document.getElementById('subjectName').textContent = `${subject.icon} ${subject.name}`;
                document.getElementById('subjectDescription').textContent = subject.description || '';
                document.title = `MINDWAVE – ${subject.name}`;
            }
        }
    } catch (error) {
        console.error('Failed to load subject:', error);
    }
}

// Load materials
async function loadMaterials() {
    try {
        const res = await fetch(`${API_BASE}/api/materials/${subjectId}`);
        const data = await res.json();

        if (data.ok) {
            allMaterials = data.materials;
            renderMaterials(allMaterials);
            updateStats();
            updateFolderFilter();
        }
    } catch (error) {
        console.error('Failed to load materials:', error);
    }
}

// Render materials
function renderMaterials(materials) {
    const grid = document.getElementById('materialsGrid');

    if (materials.length === 0) {
        grid.innerHTML = `
            <div class="empty-state">
                <div class="icon">📁</div>
                <h3>No materials found</h3>
                <p>Try adjusting your filters or upload new materials!</p>
            </div>
        `;
        return;
    }

    // Sort: pinned first, then by date
    materials.sort((a, b) => {
        if (a.pinned && !b.pinned) return -1;
        if (!a.pinned && b.pinned) return 1;
        return new Date(b.createdAt) - new Date(a.createdAt);
    });

    grid.innerHTML = materials.map(m => {
        const icon = getFileIcon(m.type);
        const badgeClass = `badge-${m.type.toLowerCase()}`;
        const fileSize = formatFileSize(m.fileSize);
        const date = new Date(m.createdAt).toLocaleDateString();

        return `
            <div class="material-card ${m.pinned ? 'pinned' : ''}">
                ${m.pinned ? '<div class="pin-badge">📌 Pinned</div>' : ''}
                <div class="file-icon">${icon}</div>
                <div class="file-type-badge ${badgeClass}">${m.type}</div>
                <div class="material-title">${m.title}</div>
                <div class="material-meta">
                    ${m.folder} • ${fileSize} • ${date}<br>
                    ${m.downloads || 0} downloads
                    ${m.description ? `<br><small>${m.description}</small>` : ''}
                </div>
                <div class="material-actions">
                    <button onclick="downloadMaterial('${m._id}', '${m.fileUrl}')">⬇️ Download</button>
                    <button onclick="editMaterial('${m._id}')">✏️ Edit</button>
                    <button onclick="togglePin('${m._id}', ${!m.pinned})">📌 ${m.pinned ? 'Unpin' : 'Pin'}</button>
                    <button onclick="deleteMaterial('${m._id}')">🗑️ Delete</button>
                </div>
            </div>
        `;
    }).join('');
}

// Get file icon
function getFileIcon(type) {
    const icons = {
        'PDF': '📄',
        'PPT': '📊',
        'DOC': '📝',
        'Image': '🖼️',
        'Video': '📹',
        'file': '📁'
    };
    return icons[type] || '📁';
}

// Format file size
function formatFileSize(bytes) {
    if (!bytes) return 'Unknown';
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

// Update stats
function updateStats() {
    document.getElementById('totalMaterials').textContent = allMaterials.length;
    const totalDownloads = allMaterials.reduce((sum, m) => sum + (m.downloads || 0), 0);
    document.getElementById('totalDownloads').textContent = totalDownloads;
}

// Update folder filter
function updateFolderFilter() {
    const folders = [...new Set(allMaterials.map(m => m.folder))];
    const select = document.getElementById('folderFilter');
    select.innerHTML = '<option value="">All Folders</option>' +
        folders.map(f => `<option value="${f}">${f}</option>`).join('');
}

// Filter materials
function filterMaterials() {
    const search = document.getElementById('searchInput').value.toLowerCase();
    const folder = document.getElementById('folderFilter').value;
    const type = document.getElementById('typeFilter').value;

    const filtered = allMaterials.filter(m => {
        const matchSearch = m.title.toLowerCase().includes(search) ||
            (m.description && m.description.toLowerCase().includes(search));
        const matchFolder = !folder || m.folder === folder;
        const matchType = !type || m.type === type;
        return matchSearch && matchFolder && matchType;
    });

    renderMaterials(filtered);
}

// Setup upload zone
function setupUploadZone() {
    const zone = document.getElementById('uploadZone');
    const input = document.getElementById('fileInput');

    zone.addEventListener('click', () => input.click());

    zone.addEventListener('dragover', (e) => {
        e.preventDefault();
        zone.classList.add('drag-over');
    });

    zone.addEventListener('dragleave', () => {
        zone.classList.remove('drag-over');
    });

    zone.addEventListener('drop', (e) => {
        e.preventDefault();
        zone.classList.remove('drag-over');
        const files = e.dataTransfer.files;
        uploadFiles(files);
    });

    input.addEventListener('change', (e) => {
        uploadFiles(e.target.files);
    });
}

// Upload files
async function uploadFiles(files) {
    if (files.length === 0) return;

    const progressBar = document.getElementById('uploadProgress');
    const progressFill = document.getElementById('progressFill');
    progressBar.style.display = 'block';
    progressFill.style.width = '0%';

    const formData = new FormData();
    formData.append('subjectId', subjectId);
    formData.append('folder', 'General');

    for (let file of files) {
        formData.append('files', file);
    }

    try {
        progressFill.style.width = '50%';

        const res = await fetch(`${API_BASE}/api/materials/bulk`, {
            method: 'POST',
            body: formData
        });

        const data = await res.json();
        progressFill.style.width = '100%';

        if (data.ok) {
            alert(`Successfully uploaded ${data.count} file(s)!`);
            await loadMaterials();
            document.getElementById('fileInput').value = '';
        } else {
            alert('Upload failed: ' + data.message);
        }
    } catch (error) {
        console.error('Upload error:', error);
        alert('Upload failed. Make sure you are logged in as admin.');
    } finally {
        setTimeout(() => {
            progressBar.style.display = 'none';
            progressFill.style.width = '0%';
        }, 1000);
    }
}

// Download material
async function downloadMaterial(id, fileUrl) {
    // Track download
    try {
        await fetch(`${API_BASE}/api/materials/${id}/download`, {
            method: 'POST'
        });
    } catch (error) {
        console.error('Failed to track download:', error);
    }

    // Download file
    const url = window.location.protocol === 'file:' ? `${API_BASE}${fileUrl}` : fileUrl;
    window.open(url, '_blank');
}

// Edit material
function editMaterial(id) {
    const material = allMaterials.find(m => m._id === id);
    if (!material) return;

    currentEditId = id;
    document.getElementById('editTitle').value = material.title;
    document.getElementById('editDescription').value = material.description || '';
    document.getElementById('editFolder').value = material.folder;
    document.getElementById('editPinned').checked = material.pinned;

    document.getElementById('editModal').classList.add('active');
}

// Save edit
async function saveEdit() {
    if (!currentEditId) return;

    const title = document.getElementById('editTitle').value;
    const description = document.getElementById('editDescription').value;
    const folder = document.getElementById('editFolder').value;
    const pinned = document.getElementById('editPinned').checked;

    try {
        const res = await fetch(`${API_BASE}/api/materials/${currentEditId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ title, description, folder, pinned })
        });

        const data = await res.json();
        if (data.ok) {
            alert('Material updated successfully!');
            closeEditModal();
            await loadMaterials();
        } else {
            alert('Update failed: ' + data.message);
        }
    } catch (error) {
        console.error('Update error:', error);
        alert('Update failed. Make sure you are logged in as admin.');
    }
}

// Close edit modal
function closeEditModal() {
    document.getElementById('editModal').classList.remove('active');
    currentEditId = null;
}

// Toggle pin
async function togglePin(id, pinned) {
    try {
        const res = await fetch(`${API_BASE}/api/materials/${id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ pinned })
        });

        const data = await res.json();
        if (data.ok) {
            await loadMaterials();
        } else {
            alert('Failed to update pin status');
        }
    } catch (error) {
        console.error('Pin error:', error);
    }
}

// Delete material
async function deleteMaterial(id) {
    if (!confirm('Are you sure you want to delete this material?')) return;

    try {
        const res = await fetch(`${API_BASE}/api/materials/${id}`, {
            method: 'DELETE'
        });

        const data = await res.json();
        if (data.ok) {
            alert('Material deleted successfully!');
            await loadMaterials();
        } else {
            alert('Delete failed: ' + data.message);
        }
    } catch (error) {
        console.error('Delete error:', error);
        alert('Delete failed. Make sure you are logged in as admin.');
    }
}

// Show notification modal
function showNotificationModal() {
    document.getElementById('notificationModal').classList.add('active');
}

// Close notification modal
function closeNotificationModal() {
    document.getElementById('notificationModal').classList.remove('active');
}

// Send notification
async function sendNotification() {
    const title = document.getElementById('notifTitle').value;
    const message = document.getElementById('notifMessage').value;

    if (!title || !message) {
        alert('Please fill in all fields');
        return;
    }

    try {
        const res = await fetch(`${API_BASE}/api/notifications/send`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                title,
                message,
                recipientRole: 'student',
                link: `/student-courses.html?subject=${subjectId}`
            })
        });

        const data = await res.json();
        if (data.ok) {
            alert('Notification sent successfully!');
            closeNotificationModal();
            document.getElementById('notifTitle').value = '';
            document.getElementById('notifMessage').value = '';
        } else {
            alert('Failed to send notification: ' + data.message);
        }
    } catch (error) {
        console.error('Notification error:', error);
        alert('Failed to send notification. Make sure you are logged in as admin.');
    }
}

// Toggle view (placeholder for future grid/list toggle)
function toggleView() {
    alert('View toggle feature coming soon!');
}

// Initialize on load
init();
