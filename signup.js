document.addEventListener('DOMContentLoaded', function () {
    // Check for Registration Gate
    const regOpen = localStorage.getItem('registrationOpen');
    if (regOpen === 'false') {
        document.querySelector('.auth-card').innerHTML = `
            <div style="text-align: center; padding: 24px;">
                <h2 style="margin-bottom: 16px;">🚫 Registration Closed</h2>
                <p style="color: var(--muted);">New signups are currently disabled by the faculty.</p>
                <a href="login.html" class="primary-btn" style="display: inline-block; margin-top: 24px; text-decoration: none;">Back to Login</a>
            </div>
        `;
    }
    const STUDENT_EMAIL_REGEX = /\.mca25@cmrit\.ac\.in$/i;
    const ADMIN_EMAIL_REGEX = /\.mca@cmrit\.ac\.in$/i;

    function updatePlaceholder() {
        const role = document.querySelector('input[name="role"]:checked').value;
        const emailInput = document.getElementById('email');
        emailInput.placeholder = role === 'student'
            ? 'student.mca25@cmrit.ac.in'
            : 'admin.mca@cmrit.ac.in';
    }

    updatePlaceholder();

    document.querySelectorAll('input[name="role"]').forEach(radio => {
        radio.addEventListener('change', updatePlaceholder);
    });

    document.getElementById('signup-form').addEventListener('submit', async function (event) {
        event.preventDefault();
        const name = document.getElementById('name').value.trim();
        const email = document.getElementById('email').value.trim().toLowerCase();
        const password = document.getElementById('password').value.trim();
        const role = document.querySelector('input[name="role"]:checked').value;

        const emailValid = role === 'admin'
            ? ADMIN_EMAIL_REGEX.test(email)
            : STUDENT_EMAIL_REGEX.test(email);
        if (!emailValid) {
            alert('Invalid Email Address. Only campus emails are accepted.');
            return;
        }

        try {
            const response = await fetch('/api/signup', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ name, email, password, role })
            });
            const data = await response.json();

            if (!data.ok) {
                alert(data.message || 'Unable to sign up.');
                return;
            }

            alert('Sign up successful! You can log in now.');
            window.location.href = 'login.html';
        } catch (error) {
            console.error(error);
            alert('Unable to sign up. Please try again.');
        }
    });
});
