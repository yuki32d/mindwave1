const GAME_LIBRARY = [
    { icon: '🐛', title: 'Debug the Monolith', description: 'Find the bug in the code snippet.', brief: 'Identify logic errors, syntax bugs, or runtime issues in real code.', type: 'bug-hunt' },
    { icon: '❓', title: 'Quiz', description: 'Multiple choice blitz with instant feedback.', brief: '5-question pulse check on lecture concepts.', type: 'trivia-challenge' },
    { icon: '🃏', title: 'Flash cards', description: 'Prompt on the front, answer on the back.', brief: 'Build card deck for revision sprints.', type: 'memory-match' },
    { icon: '🎡', title: 'Spin the wheel', description: 'Randomize the next topic or challenge.', brief: 'Assign teams to a random debugging prompt.', type: 'brain-teasers' },
    { icon: '🗣️', title: 'Speaking cards', description: 'Deal prompts from a shuffled stack.', brief: 'Async speaking practice or stand-up topics.', type: 'strategy-games' },
    { icon: '🗂️', title: 'Tech Stack Sorter', description: 'Categorize technologies (Frontend vs Backend).', brief: 'Sort frameworks and libraries into correct stacks.', type: 'logic-games' },
    { icon: '🔍', title: 'Find the match', description: 'Eliminate answers until all tiles clear.', brief: 'Match issue tickets to fixes.', type: 'memory-match' },
    { icon: '⌨️', title: 'Syntax Fill-in', description: 'Drag keywords into code blanks.', brief: 'Test mastery of async/await or class syntax.', type: 'word-puzzle' },
    { icon: '🔤', title: 'Anagram', description: 'Unscramble letters to reveal key terms.', brief: 'Reinforce terminology with playful anagrams.', type: 'word-puzzle' },
    { icon: '🧩', title: 'Code Logic Unjumble', description: 'Reorder lines to fix the algorithm.', brief: 'Sequence logic for Binary Search or API calls.', type: 'logic-games' },
    { icon: '🕸️', title: 'SQL Query Builder', description: 'Drag blocks to build valid queries.', brief: 'Construct complex JOINs and subqueries.', type: 'brain-teasers' },
    { icon: '🧠', title: 'Matching pairs', description: 'Flip tiles to find every pair.', brief: 'Match bug reports with owners.', type: 'memory-match' }
];

const announcementForm = document.getElementById('announcementForm');
const updateForm = document.getElementById('updateForm');
const gameForm = document.getElementById('gameForm');
const API_BASE = window.location.origin;

// --- API Helpers ---
async function fetchAPI(endpoint, options = {}) {
    try {
        const res = await fetch(`${API_BASE}${endpoint}`, options);
        if (res.status === 401 || res.status === 403) {
            window.location.href = 'login.html';
            return null;
        }
        return await res.json();
    } catch (error) {
        console.error(`API Error ${endpoint}:`, error);
        return { ok: false, message: "Network error" };
    }
}

// --- Render Functions ---
function renderList(containerId, items, formatter) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = items.length === 0
        ? '<p style="color: var(--text-muted); margin: 0;">No entries yet.</p>'
        : items.map(formatter).join('');
}

function formatDate(isoString) {
    if (!isoString) return new Date().toLocaleString();
    return new Date(isoString).toLocaleString();
}

// --- Announcements ---
async function loadAnnouncements() {
    const data = await fetchAPI('/api/announcements');
    if (data && data.ok) {
        renderAnnouncements(data.announcements);
        document.getElementById('campaignCount').textContent = data.announcements.length;
    }
}

function renderAnnouncements(list) {
    renderList('announcementList', list, (item) => `
        <div class="list-item">
            <div style="display: flex; justify-content: space-between;">
                <h4>${item.title || 'Untitled'}</h4>
                <button onclick="deleteAnnouncement('${item._id}')" style="background: none; border: none; cursor: pointer; color: #ff3b30;">&times;</button>
            </div>
            <small>${item.audience} • ${formatDate(item.createdAt)}</small>
            <p style="margin-top: 8px;">${item.body}</p>
            <div class="tag green">Published</div>
        </div>
    `);
}

if (announcementForm) {
    announcementForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        const payload = {
            title: announcementForm.announcementTitle.value.trim(),
            body: announcementForm.announcementBody.value.trim(),
            audience: announcementForm.announcementAudience.value
        };
        const res = await fetchAPI('/api/announcements', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        if (res && res.ok) {
            announcementForm.reset();
            loadAnnouncements();
        } else {
            alert('Failed to publish: ' + (res ? res.message : 'Unknown error'));
        }
    });
}

window.deleteAnnouncement = async function (id) {
    if (!confirm("Delete this announcement?")) return;
    const res = await fetchAPI(`/api/announcements/${id}`, { method: 'DELETE' });
    if (res && res.ok) loadAnnouncements();
};

// --- Updates (Mock for now) ---
const updatesKey = 'mindwave_updates';
function loadUpdates() {
    try {
        const updates = JSON.parse(localStorage.getItem(updatesKey) || '[]');
        renderUpdates(updates);
    } catch (e) { }
}
function renderUpdates(list) {
    renderList('updateList', list.slice().reverse(), (item) => `
        <div class="list-item">
            <h4>${item.headline}</h4>
            <small>${item.date}</small>
            <p style="margin-top: 8px;">${item.summary}</p>
        </div>
    `);
}
if (updateForm) {
    updateForm.addEventListener('submit', (event) => {
        event.preventDefault();
        const next = {
            headline: updateForm.updateHeadline.value.trim(),
            summary: updateForm.updateSummary.value.trim(),
            date: new Date().toLocaleString()
        };
        const updates = JSON.parse(localStorage.getItem(updatesKey) || '[]');
        updates.push(next);
        localStorage.setItem(updatesKey, JSON.stringify(updates));
        updateForm.reset();
        loadUpdates();
    });
}

// --- Games ---
let allGames = []; // Store for filtering

async function loadGames() {
    const data = await fetchAPI('/api/games/my');
    if (data && data.ok) {
        allGames = data.games;
        applyFilters(); // Render with current filters
        document.getElementById('gamesCount').textContent = allGames.length;
    }
}

function renderGames(list) {
    renderList('gameList', list, (item) => `
        <div class="list-item">
            <div style="display: flex; justify-content: space-between; align-items: start;">
                <div>
                    <h4>${item.title}</h4>
                    <small>${item.type} • ${item.difficulty} • ${formatDate(item.createdAt)}</small>
                </div>
                <div style="display: flex; gap: 8px;">
                    <button onclick="deleteGame('${item._id}')" style="background: rgba(255, 59, 48, 0.1); color: #ff3b30; border: none; padding: 4px 8px; border-radius: 6px; cursor: pointer; font-size: 12px;">Delete</button>
                    <button onclick="window.open('student-game.html?id=${item._id}', '_blank')" style="background: rgba(255, 255, 255, 0.1); color: white; border: none; padding: 4px 8px; border-radius: 6px; cursor: pointer; font-size: 12px;">Preview</button>
                </div>
            </div>
            <p style="margin-top: 8px;">${item.brief}</p>
            <div class="tag pink">Interactive</div>
        </div>
    `);
}

if (gameForm) {
    gameForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        const payload = {
            title: gameForm.gameTitle.value.trim(),
            type: gameForm.gameType.value,
            difficulty: gameForm.gameDifficulty.value,
            brief: gameForm.gameBrief.value.trim()
        };
        const res = await fetchAPI('/api/games', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        if (res && res.ok) {
            gameForm.reset();
            loadGames();
            alert('Game created successfully!');
        } else {
            alert('Failed to create game: ' + (res ? res.message : 'Unknown error'));
        }
    });
}

window.deleteGame = async function (id) {
    if (confirm('Are you sure you want to delete this game?')) {
        const res = await fetchAPI(`/api/games/${id}`, { method: 'DELETE' });
        if (res && res.ok) {
            loadGames();
        } else {
            alert('Failed to delete: ' + (res ? res.message : 'Unknown error'));
        }
    }
};

// --- Filter Logic ---
const filterType = document.getElementById('filterType');
const filterDifficulty = document.getElementById('filterDifficulty');

function applyFilters() {
    const type = filterType ? filterType.value : 'all';
    const diff = filterDifficulty ? filterDifficulty.value : 'all';

    const filtered = allGames.filter(game => {
        const matchType = type === 'all' || game.type === type;
        const matchDiff = diff === 'all' || game.difficulty === diff;
        return matchType && matchDiff;
    });

    renderGames(filtered);
}

if (filterType) filterType.addEventListener('change', applyFilters);
if (filterDifficulty) filterDifficulty.addEventListener('change', applyFilters);

// --- Initialization ---
loadAnnouncements();
loadUpdates();
loadGames();

// --- Templates & Tools (Static/Local for now) ---
function renderGameTemplates() {
    const container = document.getElementById('gameTemplateGrid');
    if (!container) return;
    container.innerHTML = GAME_LIBRARY.map(template => `
        <article class="game-template-card" data-title="${template.title}" data-brief="${template.brief}" data-type="${template.type}">
            <div class="template-icon">${template.icon}</div>
            <h3>${template.title}</h3>
            <p>${template.description}</p>
        </article>
    `).join('');
}
renderGameTemplates();

// --- Event Listeners for Templates ---
const GAME_TOOLS = {
    'trivia': `<h3 style="margin: 0 0 12px; font-size: 16px;">Trivia / Quiz</h3><p style="color: #9ea4b6; margin-bottom: 16px;">Create a multi-question quiz with scoring and time limits.</p><button type="button" class="primary-btn" onclick="window.location.href='faculty-create-quiz.html'" style="width: 100%;">🚀 Open Quiz Builder</button>`,
    'flashcard': `<h3 style="margin: 0 0 12px; font-size: 16px;">Flashcard Set</h3><div style="display: grid; gap: 12px;"><div style="border: 1px solid rgba(255,255,255,0.1); padding: 12px; border-radius: 8px;"><input type="text" name="front" placeholder="Front (Term)" style="margin-bottom: 8px;" required><textarea name="back" placeholder="Back (Definition)" rows="2" required></textarea></div><button type="button" class="secondary-btn" style="width: 100%;">+ Add Another Card</button></div>`,
    'scavenger': `<h3 style="margin: 0 0 12px; font-size: 16px;">Scavenger Hunt Clue</h3><div style="display: grid; gap: 12px;"><textarea name="clue" placeholder="Clue text..." rows="2" required></textarea><input type="text" name="locationCode" placeholder="Location Code / Secret Word" required></div>`
};

document.getElementById('gameTemplateGrid')?.addEventListener('click', (event) => {
    const card = event.target.closest('.game-template-card');
    if (!card) return;
    const title = card.dataset.title;

    // Direct redirects
    const redirects = {
        'Debug the Monolith': 'faculty-create-debug.html',
        'Quiz': 'faculty-create-quiz.html',
        'Code Logic Unjumble': 'faculty-create-unjumble.html',
        'Tech Stack Sorter': 'faculty-create-sorter.html',
        'Syntax Fill-in': 'faculty-create-fillin.html',
        'SQL Query Builder': 'faculty-create-sql.html'
    };

    if (redirects[title]) {
        window.location.href = redirects[title];
        return;
    }

    // Visual selection & Form Fill
    document.querySelectorAll('.game-template-card').forEach(c => c.classList.remove('selected'));
    card.classList.add('selected');

    const brief = card.dataset.brief;
    const type = card.dataset.type;

    const gameTitle = document.getElementById('gameTitle');
    const gameDetails = document.getElementById('gameBrief');
    const gameType = document.getElementById('gameType');
    const dynamicTools = document.getElementById('dynamicGameTools');

    if (gameTitle) gameTitle.value = title;
    if (gameDetails) gameDetails.value = brief;
    if (gameType) {
        const option = [...gameType.options].find(opt => opt.value.toLowerCase().includes(type) || opt.text.toLowerCase().includes(title.split(' ')[0].toLowerCase()));
        if (option) gameType.value = option.value;
    }

    if (dynamicTools) {
        const toolKey = Object.keys(GAME_TOOLS).find(k => title.toLowerCase().includes(k)) || 'trivia';
        dynamicTools.innerHTML = GAME_TOOLS[toolKey] || '';
        dynamicTools.style.display = 'block';
        document.getElementById('gameForm')?.scrollIntoView({ behavior: 'smooth' });
    }
});

// --- Profile & Logout ---
const adminProfileToggle = document.getElementById('adminProfileToggle');
const adminProfileDropdown = document.getElementById('adminProfileDropdown');
const signOutControl = document.getElementById('signOutControl');
const gamesNavBtn = document.getElementById('gamesNavBtn');

if (adminProfileToggle && adminProfileDropdown) {
    adminProfileToggle.addEventListener('click', () => {
        const isOpen = adminProfileDropdown.style.display === 'flex';
        adminProfileDropdown.style.display = isOpen ? 'none' : 'flex';
    });
    document.addEventListener('click', (event) => {
        if (!adminProfileToggle.contains(event.target) && !adminProfileDropdown.contains(event.target)) {
            adminProfileDropdown.style.display = 'none';
        }
    });
}

async function performLogout() {
    try {
        await fetch(`${API_BASE}/api/logout`, { method: 'POST', credentials: 'include' });
    } catch (error) { console.error('Logout failed', error); }
    finally {
        localStorage.clear(); // Clear all local storage on logout
        window.location.href = 'login.html';
    }
}

if (signOutControl) signOutControl.addEventListener('click', performLogout);
if (gamesNavBtn) gamesNavBtn.addEventListener('click', () => document.getElementById('gamesPanel')?.scrollIntoView({ behavior: 'smooth' }));

// --- System Status Modal ---
async function showSystemStatus() {
    const modal = document.getElementById('statusModal');
    if (!modal) return;
    modal.style.display = 'flex';

    // Fetch real-time data
    try {
        // Get users count
        const users = JSON.parse(localStorage.getItem('users') || '[]');
        document.getElementById('statusTotalUsers').textContent = users.length;

        // Get active games count
        const gamesData = await fetchAPI('/api/games/published');
        if (gamesData && gamesData.ok) {
            document.getElementById('statusActiveGames').textContent = gamesData.games.length;
        }

        // Get announcements count
        const announcementsData = await fetchAPI('/api/announcements');
        if (announcementsData && announcementsData.ok) {
            document.getElementById('statusAnnouncements').textContent = announcementsData.announcements.length;
        }

        // Update timestamp
        document.getElementById('statusLastUpdated').textContent = new Date().toLocaleTimeString();
    } catch (error) {
        console.error('Failed to load system status:', error);
    }

    // Close on click outside
    modal.onclick = function (e) {
        if (e.target === modal) {
            modal.style.display = 'none';
        }
    }
}

// --- Event Listeners for Quick Actions ---
const analyticsBtn = document.getElementById('analyticsBtn');
if (analyticsBtn) {
    analyticsBtn.addEventListener('click', () => {
        window.location.href = 'analytics.html';
    });
}

const newGameBtn = document.getElementById('newGameBtn');
if (newGameBtn) {
    newGameBtn.addEventListener('click', () => {
        document.getElementById('gameForm').scrollIntoView({ behavior: 'smooth' });
    });
}

const announceBtn = document.getElementById('announceBtn');
if (announceBtn) {
    announceBtn.addEventListener('click', () => {
        document.getElementById('announcementForm').scrollIntoView({ behavior: 'smooth' });
    });
}

const updateBtn = document.getElementById('updateBtn');
if (updateBtn) {
    updateBtn.addEventListener('click', () => {
        document.getElementById('updateForm').scrollIntoView({ behavior: 'smooth' });
    });
}

const systemStatusBtn = document.getElementById('systemStatusBtn');
if (systemStatusBtn) {
    systemStatusBtn.addEventListener('click', showSystemStatus);
}
