// Global Theme Initialization Script
// Add this script to all student pages to enable theme persistence

(function () {
    // 1. Load saved theme preference (Light/Dark)
    const savedTheme = localStorage.getItem('theme') || 'dark';
    if (savedTheme === 'light') {
        document.documentElement.classList.add('light-theme');
        if (document.body) document.body.classList.add('light-theme');
    }

    // 2. Load saved accent color
    const savedAccent = localStorage.getItem('accentColor');
    if (savedAccent) {
        document.documentElement.style.setProperty('--blue', savedAccent);
        document.documentElement.style.setProperty('--primary', savedAccent);
    }

    // 3. Check Maintenance Mode (Redirect students if active)
    const maintenanceMode = localStorage.getItem('maintenanceMode') === 'true';
    const userRole = localStorage.getItem('role'); // Assuming 'faculty' or 'student' is stored here

    // Simple check: If maintenance is on, and we are NOT on the admin/login pages, and user is NOT faculty
    if (maintenanceMode &&
        !window.location.href.includes('admin.html') &&
        !window.location.href.includes('faculty') &&
        !window.location.href.includes('login') &&
        userRole !== 'faculty') {

        // Create a full-screen overlay if it doesn't exist
        window.addEventListener('DOMContentLoaded', () => {
            document.body.innerHTML = `
                <div style="height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center; background: #0f111a; color: white; font-family: sans-serif; text-align: center; padding: 20px;">
                    <h1 style="font-size: 48px; margin-bottom: 16px;">🚧</h1>
                    <h2 style="margin-bottom: 8px;">Under Maintenance</h2>
                    <p style="color: #9ea4b6; max-width: 400px;">We're making things better. Please check back in a few minutes.</p>
                </div>
            `;
        });
    }

    // Listen for changes
    window.addEventListener('storage', function (e) {
        if (e.key === 'theme') {
            if (e.newValue === 'light') {
                document.documentElement.classList.add('light-theme');
                if (document.body) document.body.classList.add('light-theme');
            } else {
                document.documentElement.classList.remove('light-theme');
                if (document.body) document.body.classList.remove('light-theme');
            }
        }
        if (e.key === 'accentColor') {
            document.documentElement.style.setProperty('--blue', e.newValue);
            document.documentElement.style.setProperty('--primary', e.newValue);
        }
        if (e.key === 'maintenanceMode' && e.newValue === 'true' && userRole !== 'faculty') {
            window.location.reload(); // Reload to trigger the maintenance screen
        }
    });
})();
