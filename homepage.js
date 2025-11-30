const API_BASE = window.location.origin;
const announcementsKey = 'announcements';
const updatesKey = 'mindwave_updates';
const gamesKey = 'mindwave_games';

function loadData(key) {
    try {
        return JSON.parse(localStorage.getItem(key) || '[]');
    } catch (error) {
        console.error('Failed to parse', key, error);
        return [];
    }
}

async function renderAnnouncements() {
    const container = document.getElementById('announcementFeed');
    try {
        const res = await fetch(`${API_BASE}/api/announcements`);
        const data = await res.json();

        const announcements = data.ok ? (data.announcements || []) : [];

        if (announcements.length === 0) {
            container.innerHTML = '<div class="empty-state">No announcements yet. Check back soon! 📨</div>';
            return;
        }

        container.innerHTML = announcements.map(item => {
            // Safety check: ensure content is not a full HTML page
            const body = item.body || item.text || '';
            if (body.includes('<html') || body.includes('<!DOCTYPE')) {
                return ''; // Skip corrupted items
            }
            return `
            <article class="feed-item">
                <h3>${item.title || 'Untitled Announcement'}</h3>
                <small>${item.audience || 'All Students'} • ${new Date(item.createdAt || Date.now()).toLocaleDateString()}</small>
                <p>${body}</p>
                <span class="tag green">Live</span>
            </article>
            `;
        }).join('');
    } catch (error) {
        console.error('Failed to fetch announcements:', error);
        container.innerHTML = '<div class="empty-state">Failed to load announcements.</div>';
    }
}

function renderUpdates() {
    const container = document.getElementById('updateFeed');
    // Updates are still local for now, but we must validate them
    const updates = loadData(updatesKey).slice(-4).reverse();

    if (updates.length === 0) {
        container.innerHTML = '<div class="empty-state">Progress updates will appear here when your mentors post them. 📘</div>';
        return;
    }

    container.innerHTML = updates.map(item => {
        // Safety check: ensure content is not a full HTML page
        const summary = item.summary || '';
        if (summary.includes('<html') || summary.includes('<!DOCTYPE')) {
            return ''; // Skip corrupted items
        }
        return `
        <article class="feed-item">
            <h3>${item.headline || 'Weekly Update'}</h3>
            <small>${item.date || ''}</small>
            <p>${summary}</p>
            <span class="tag blue">Update</span>
        </article>
    `;
    }).join('');
}

async function renderGames() {
    const container = document.getElementById('gameFeed');
    try {
        const res = await fetch(`${API_BASE}/api/games/published`);
        const data = await res.json();
        const games = data.ok ? (data.games || []).slice(-6).reverse() : [];

        if (games.length === 0) {
            container.innerHTML = '<div class="empty-state">Faculty games drop in this space. Nothing has gone live yet. 🎮</div>';
            return;
        }

        container.innerHTML = games.map((item, index) => `
            <article class="game-card" data-game-id="${item._id || item.id}" data-game-title="${item.title || 'Untitled Challenge'}" data-game-type="${item.type || ''}">
                <h3>${item.title || 'Untitled Challenge'}</h3>
                <p>${item.type || ''} • ${item.difficulty || ''}</p>
                <p style="margin-top: 12px;">${item.brief || ''}</p>
                <span class="tag pink play-btn" style="margin-top: 12px; cursor: pointer;">Play</span>
            </article>
        `).join('');

        // Add event delegation for play buttons
        container.querySelectorAll('.game-card').forEach(card => {
            const playBtn = card.querySelector('.play-btn');
            playBtn.addEventListener('click', () => {
                const gameId = card.dataset.gameId;
                const gameTitle = card.dataset.gameTitle;
                const gameType = card.dataset.gameType;
                startGame(gameId, gameTitle, gameType);
            });
        });
    } catch (error) {
        console.error('Failed to fetch games:', error);
        container.innerHTML = '<div class="empty-state">Failed to load games. Please refresh the page.</div>';
    }
}

// Activity tracking system
const activityKey = 'student_activities';

function getStudentEmail() {
    return localStorage.getItem('email') || 'guest@cmrit.ac.in';
}

function getStudentName() {
    return localStorage.getItem('firstName') || 'Guest';
}

function startGame(gameId, gameTitle, gameType) {
    const studentEmail = getStudentEmail();
    const studentName = getStudentName();

    // Record game start
    const activity = {
        id: Date.now().toString(36) + Math.random().toString(36).substr(2),
        gameId: gameId,
        gameTitle: gameTitle,
        gameType: gameType,
        studentEmail: studentEmail,
        studentName: studentName,
        startedAt: new Date().toISOString(),
        status: 'in-progress',
        score: 0,
        completedAt: null,
        timeTaken: null
    };

    // Store activity
    const activities = loadData(activityKey);
    activities.push(activity);
    localStorage.setItem(activityKey, JSON.stringify(activities));

    // Simulate game completion (in real scenario, this would be in the actual game page)
    // For demo purposes, we'll complete after 3-10 seconds with random score
    const simulatedTime = Math.floor(Math.random() * 7000) + 3000;

    setTimeout(() => {
        completeGame(activity.id, Math.floor(Math.random() * 40) + 60, simulatedTime);
    }, simulatedTime);

    alert(`Starting ${gameTitle}! Complete the game to track your progress.`);
}

function completeGame(activityId, score, timeTaken) {
    const activities = loadData(activityKey);
    const activityIndex = activities.findIndex(a => a.id === activityId);

    if (activityIndex !== -1) {
        activities[activityIndex].status = 'completed';
        activities[activityIndex].score = score;
        activities[activityIndex].completedAt = new Date().toISOString();
        activities[activityIndex].timeTaken = Math.floor(timeTaken / 1000); // in seconds
        localStorage.setItem(activityKey, JSON.stringify(activities));
    }
}

// Profile dropdown logic
const profileToggle = document.getElementById('profileToggle');
const profileDropdown = document.getElementById('profileDropdown');
const signOutBtn = document.getElementById('signOutBtn');

// Update profile toggle with user's name
const firstName = localStorage.getItem('firstName') || 'User';
const smallElement = profileToggle.querySelector('small');
if (smallElement) {
    smallElement.textContent = firstName;
}

if (profileToggle && profileDropdown) {
    profileToggle.addEventListener('click', () => {
        const isOpen = profileDropdown.style.display === 'flex';
        profileDropdown.style.display = isOpen ? 'none' : 'flex';
    });
    document.addEventListener('click', (event) => {
        if (!profileToggle.contains(event.target) && !profileDropdown.contains(event.target)) {
            profileDropdown.style.display = 'none';
        }
    });
}

async function performLogout() {
    try {
        await fetch(`${API_BASE}/api/logout`, {
            method: 'POST',
            credentials: 'include'
        });
    } catch (error) {
        console.error('Logout failed', error);
    } finally {
        localStorage.removeItem('mindwave_user');
        localStorage.removeItem('mindwave_token');
        document.cookie = 'mindwave_token=; Max-Age=0; path=/;';
        window.location.href = 'login.html';
    }
}

if (signOutBtn) {
    signOutBtn.addEventListener('click', performLogout);
}

function getReadAnnouncements() {
    try {
        return JSON.parse(localStorage.getItem('readAnnouncements') || '[]');
    } catch (error) {
        return [];
    }
}

function markAsRead(announcementId) {
    const read = getReadAnnouncements();
    if (!read.includes(announcementId)) {
        read.push(announcementId);
        localStorage.setItem('readAnnouncements', JSON.stringify(read));
    }
}

function getUnreadCount() {
    const announcements = loadData(announcementsKey);
    const read = getReadAnnouncements();
    return announcements.filter(ann => !read.includes(ann.id || ann.date + ann.title)).length;
}

function updateNotificationBadge() {
    const badge = document.getElementById('notificationBadge');
    const unreadCount = getUnreadCount();

    if (unreadCount > 0) {
        badge.textContent = unreadCount > 99 ? '99+' : unreadCount;
        badge.classList.remove('hidden');
    } else {
        badge.classList.add('hidden');
    }
}

async function fetchNotifications() {
    try {
        const res = await fetch(`${API_BASE}/api/notifications`);
        const data = await res.json();
        if (data.ok) {
            const notifications = data.notifications;
            const unreadCount = notifications.filter(n => !n.read).length;

            const badge = document.getElementById('notificationBadge');
            if (unreadCount > 0) {
                badge.textContent = unreadCount > 99 ? '99+' : unreadCount;
                badge.classList.remove('hidden');
            } else {
                badge.classList.add('hidden');
            }

            const dropdown = document.getElementById('notificationDropdown');
            if (notifications.length === 0) {
                dropdown.innerHTML = '<div style="padding: 20px; text-align: center; color: var(--text-muted);">No new notifications</div>';
            } else {
                dropdown.innerHTML = notifications.map(n => `
                    <div class="notification-item ${n.read ? '' : 'unread'}">
                        <h4>${n.title}</h4>
                        <p>${n.message}</p>
                        <small>${new Date(n.createdAt).toLocaleTimeString()}</small>
                        ${n.link ? `<a href="${n.link}" style="display:block; margin-top:4px; font-size:11px; color:var(--blue);">View</a>` : ''}
                    </div>
                `).join('');
            }
        }
    } catch (e) {
        console.error("Failed to fetch notifications", e);
    }
}

// Poll for notifications every 30 seconds
fetchNotifications();
setInterval(fetchNotifications, 30000);

// Bell click handler
const notificationBell = document.getElementById('notificationBell');
const notificationDropdown = document.getElementById('notificationDropdown');

if (notificationBell && notificationDropdown) {
    notificationBell.addEventListener('click', (e) => {
        e.stopPropagation();
        const isOpen = notificationDropdown.classList.contains('show');
        if (isOpen) {
            notificationDropdown.classList.remove('show');
        } else {
            notificationDropdown.classList.add('show');
        }
    });

    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
        if (!notificationBell.contains(e.target)) {
            notificationDropdown.classList.remove('show');
        }
    });

    // Handle announcement item clicks
    notificationDropdown.addEventListener('click', (e) => {
        const item = e.target.closest('.notification-item');
        if (item) {
            const annId = item.dataset.announcementId;
            markAsRead(annId);
            updateNotificationBadge();
            window.location.href = `announcements.html?id=${encodeURIComponent(annId)}`;
        }
    });
}

// Update notification badge on page load
updateNotificationBadge();

// Update badge periodically (every 2 seconds) to catch new announcements
setInterval(() => {
    updateNotificationBadge();
}, 2000);

renderAnnouncements();
renderUpdates();
renderGames();
