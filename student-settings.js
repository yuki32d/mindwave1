const currentUserEmail = localStorage.getItem('email') || 'student@example.com';
const currentUserName = localStorage.getItem('firstName') || 'Student';

function getInitials(name) {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

function loadSettings() {
    // Load saved settings from localStorage
    const settings = JSON.parse(localStorage.getItem('userSettings') || '{}');

    document.getElementById('displayName').value = settings.displayName || currentUserName;
    document.getElementById('bio').value = settings.bio || '';
    document.getElementById('studentId').value = settings.studentId || 'STU' + Date.now().toString().slice(-6);
    document.getElementById('email').value = currentUserEmail;
    document.getElementById('phone').value = settings.phone || '';
    document.getElementById('department').value = settings.department || '';
    document.getElementById('yearSemester').value = settings.yearSemester || '';

    // Load profile photo
    if (settings.profilePhoto) {
        document.getElementById('photoImage').src = settings.profilePhoto;
        document.getElementById('photoImage').style.display = 'block';
        document.getElementById('photoInitials').style.display = 'none';
    } else {
        document.getElementById('photoInitials').textContent = getInitials(settings.displayName || currentUserName);
    }

    // Load theme
    const theme = localStorage.getItem('theme') || 'dark';
    if (theme === 'light') {
        document.body.classList.add('light-theme');
        document.getElementById('themeToggle').classList.add('active');
    }
}

function saveSettings() {
    const displayName = document.getElementById('displayName').value;
    const bio = document.getElementById('bio').value;
    const phone = document.getElementById('phone').value;
    const department = document.getElementById('department').value;
    const yearSemester = document.getElementById('yearSemester').value;
    const studentId = document.getElementById('studentId').value;

    // Validate required fields
    if (!displayName) {
        alert('Display name is required!');
        return;
    }

    // Check password change
    const currentPassword = document.getElementById('currentPassword').value;
    const newPassword = document.getElementById('newPassword').value;
    const confirmPassword = document.getElementById('confirmPassword').value;

    if (newPassword || confirmPassword) {
        if (!currentPassword) {
            alert('Please enter your current password to change it.');
            return;
        }
        if (newPassword !== confirmPassword) {
            alert('New passwords do not match!');
            return;
        }
        if (newPassword.length < 8) {
            alert('Password must be at least 8 characters long!');
            return;
        }
        // In a real app, you would verify current password and update it here
        console.log('Password would be updated in a real implementation');
    }

    // Save settings
    const settings = {
        displayName,
        bio,
        phone,
        department,
        yearSemester,
        studentId,
        profilePhoto: document.getElementById('photoImage').src || null
    };

    localStorage.setItem('userSettings', JSON.stringify(settings));
    localStorage.setItem('firstName', displayName);

    // Show success message
    const successMsg = document.getElementById('successMessage');
    successMsg.style.display = 'block';
    setTimeout(() => {
        successMsg.style.display = 'none';
    }, 3000);

    // Clear password fields
    document.getElementById('currentPassword').value = '';
    document.getElementById('newPassword').value = '';
    document.getElementById('confirmPassword').value = '';
}

function removePhoto() {
    document.getElementById('photoImage').src = '';
    document.getElementById('photoImage').style.display = 'none';
    document.getElementById('photoInitials').style.display = 'flex';
    document.getElementById('photoInput').value = '';
}

function uploadPhoto() {
    document.getElementById('photoInput').click();
}

function cancelSettings() {
    window.location.href = 'homepage.html';
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', function () {
    // Upload photo button
    const uploadBtn = document.getElementById('uploadPhotoBtn') || document.querySelector('.upload-btn:not(.secondary)');
    if (uploadBtn) {
        uploadBtn.addEventListener('click', uploadPhoto);
    }

    // Remove photo button
    const removeBtn = document.getElementById('removePhotoBtn') || document.querySelector('.upload-btn.secondary');
    if (removeBtn) {
        removeBtn.addEventListener('click', removePhoto);
    }

    // Cancel button
    const cancelBtn = document.getElementById('cancelBtn') || document.querySelector('.cancel-btn');
    if (cancelBtn) {
        cancelBtn.addEventListener('click', cancelSettings);
    }

    // Save button
    const saveBtn = document.getElementById('saveBtn') || document.querySelector('.save-btn');
    if (saveBtn) {
        saveBtn.addEventListener('click', saveSettings);
    }

    // Photo upload handler
    document.getElementById('photoInput').addEventListener('change', function (e) {
        const file = e.target.files[0];
        if (file) {
            if (file.size > 2 * 1024 * 1024) {
                alert('File size must be less than 2MB!');
                return;
            }

            const reader = new FileReader();
            reader.onload = function (event) {
                document.getElementById('photoImage').src = event.target.result;
                document.getElementById('photoImage').style.display = 'block';
                document.getElementById('photoInitials').style.display = 'none';
            };
            reader.readAsDataURL(file);
        }
    });

    // Theme toggle
    document.getElementById('themeToggle').addEventListener('click', function () {
        this.classList.toggle('active');
        document.body.classList.toggle('light-theme');

        const theme = document.body.classList.contains('light-theme') ? 'light' : 'dark';
        localStorage.setItem('theme', theme);
    });

    // Initialize settings
    loadSettings();
});
