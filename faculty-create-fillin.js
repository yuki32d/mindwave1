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

document.getElementById('fillinForm').addEventListener('submit', (e) => {
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
        id: Date.now().toString(),
        type: 'syntax-fill',
        title: formData.get('title'),
        duration: parseInt(formData.get('duration')),
        content: text, // Raw content with brackets
        blanks: blanks,
        totalPoints: blanks.length * 10,
        createdAt: new Date().toISOString(),
        status: 'active'
    };

    const games = loadData(gamesKey);
    games.push(gameData);
    saveData(gamesKey, games);

    alert('Syntax Game published successfully!');
    window.location.href = 'admin.html';
});
