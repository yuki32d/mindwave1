const gamesKey = 'games';
const editor = document.getElementById('contentEditor');
const preview = document.getElementById('previewArea');

function loadData(key) {
    try { return JSON.parse(localStorage.getItem(key) || '[]'); }
    catch { return []; }
}

function saveData(key, data) {
    localStorage.setItem(key, JSON.stringify(data));
}

function updatePreview() {
    const text = editor.value;
    // Replace [word] with styled span
    const html = text.replace(/\[(.*?)\]/g, '<span class="blank-preview">$1</span>')
        .replace(/\n/g, '<br>');
    preview.innerHTML = html || '<span style="color: #666;">Preview will appear here...</span>';
}

editor.addEventListener('input', updatePreview);
updatePreview();

document.getElementById('fillinForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const text = editor.value;

    // Extract blanks
    const matches = text.match(/\[(.*?)\]/g);
    if (!matches || matches.length === 0) {
        alert('Please create at least one blank using [brackets].');
        return;
    }

    const blanks = matches.map(m => m.slice(1, -1)); // Remove brackets

    const formData = new FormData(e.target);
    const gameData = {
        type: 'syntax-fill',
        title: formData.get('title'),
        duration: parseInt(formData.get('duration')),
        content: text, // Raw content with brackets
        blanks: blanks,
        totalPoints: blanks.length * 10,
        status: 'active',
        published: true
    };

    try {
        const response = await fetch('/api/games', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(gameData)
        });

        if (response.ok) {
            alert('Syntax Game published successfully!');
            window.location.href = 'admin.html';
        } else {
            const error = await response.json();
            alert('Failed to publish game: ' + (error.message || 'Unknown error'));
        }
    } catch (err) {
        console.error('Error publishing game:', err);
        alert('Failed to publish game. Please check your connection.');
    }
});
