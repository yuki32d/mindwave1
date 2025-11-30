document.addEventListener('DOMContentLoaded', function () {
    const loginForm = document.getElementById('login-form');
    const errorMessageDiv = document.getElementById('error-message');

    console.log("login.html script loaded");

    loginForm.addEventListener('submit', async function (e) {
        e.preventDefault();
        console.log("Login form submitted");
        errorMessageDiv.textContent = '';

        const email = document.getElementById('username').value.trim();
        const password = document.getElementById('password').value;
        const roleInput = document.querySelector('input[name="role"]:checked');
        const role = roleInput ? roleInput.value : 'student';

        console.log("Login attempt with:", { email, role });

        if (!email || !password) {
            errorMessageDiv.textContent = 'Email and password are required.';
            console.log("Validation failed: empty email or password");
            return;
        }

        try {
            const response = await fetch('/api/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                credentials: 'include',
                body: JSON.stringify({ email, password, role })
            });

            console.log("Fetch response received", response);

            const data = await response.json();

            console.log("API response JSON", data);

            if (response.ok && data.ok) {
                localStorage.setItem('loggedIn', 'true');
                localStorage.setItem('email', email);
                localStorage.setItem('role', role);

                if (role === 'admin') {
                    window.location.href = 'admin.html';
                } else {
                    window.location.href = 'homepage.html';
                }
            } else {
                errorMessageDiv.textContent = data.message || 'Login issue. Please try again.';
                console.log("Login error:", data.message);
            }
        } catch (err) {
            errorMessageDiv.textContent = 'Network error. Please try again later.';
            console.error('Login error:', err);
        }
    });
});
