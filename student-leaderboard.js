const activityKey = 'student_activities';
const currentUserEmail = localStorage.getItem('email') || 'student@example.com';
let currentTimeFilter = 'all';
let currentGameFilter = 'all';

function loadActivities() {
    try {
        return JSON.parse(localStorage.getItem(activityKey) || '[]');
    } catch {
        return [];
    }
}

function filterActivities(activities) {
    let filtered = [...activities];

    // Time filter
    const now = new Date();
    if (currentTimeFilter === 'today') {
        const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        filtered = filtered.filter(a => new Date(a.completedAt) >= today);
    } else if (currentTimeFilter === 'week') {
        const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
        filtered = filtered.filter(a => new Date(a.completedAt) >= weekAgo);
    } else if (currentTimeFilter === 'month') {
        const monthAgo = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
        filtered = filtered.filter(a => new Date(a.completedAt) >= monthAgo);
    }

    // Game type filter
    if (currentGameFilter !== 'all') {
        const gameTypeMap = {
            'quiz': ['quiz'],
            'unjumble': ['unjumble', 'code-unjumble'],
            'sorter': ['sorter', 'tech-sorter'],
            'fillin': ['fillin', 'syntax-fill'],
            'sql': ['sql', 'sql-builder']
        };
        const validTypes = gameTypeMap[currentGameFilter] || [currentGameFilter];
        filtered = filtered.filter(a => validTypes.includes(a.gameType));
    }

    return filtered;
}

function aggregateLeaderboard() {
    const activities = filterActivities(loadActivities());
    const playerStats = {};

    activities.forEach(activity => {
        const email = activity.studentEmail;
        if (!playerStats[email]) {
            playerStats[email] = {
                email: email,
                name: activity.studentName || email.split('@')[0],
                totalPoints: 0,
                gamesPlayed: 0,
                totalAccuracy: 0,
                lastActivity: activity.completedAt
            };
        }

        playerStats[email].totalPoints += activity.rawScore || 0;
        playerStats[email].gamesPlayed += 1;
        playerStats[email].totalAccuracy += activity.score || 0;

        if (new Date(activity.completedAt) > new Date(playerStats[email].lastActivity)) {
            playerStats[email].lastActivity = activity.completedAt;
        }
    });

    // Calculate averages and convert to array
    const leaderboard = Object.values(playerStats).map(player => ({
        ...player,
        avgAccuracy: player.gamesPlayed > 0 ? Math.round(player.totalAccuracy / player.gamesPlayed) : 0
    }));

    // Sort by total points
    leaderboard.sort((a, b) => b.totalPoints - a.totalPoints);

    return leaderboard;
}

function getInitials(name) {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

function getAccuracyClass(accuracy) {
    if (accuracy >= 80) return 'high';
    if (accuracy >= 60) return 'medium';
    return 'low';
}

function renderPodium(leaderboard) {
    const podium = document.getElementById('podium');
    const top3 = leaderboard.slice(0, 3);

    if (top3.length === 0) {
        podium.innerHTML = '';
        return;
    }

    const medals = ['🥇', '🥈', '🥉'];
    const classes = ['gold', 'silver', 'bronze'];

    podium.innerHTML = top3.map((player, idx) => `
        <div class="podium-card ${classes[idx]}">
            <span class="medal">${medals[idx]}</span>
            <div class="podium-rank">#${idx + 1}</div>
            <div class="podium-name">${player.name}</div>
            <div class="podium-points">${player.totalPoints.toLocaleString()}</div>
            <div class="podium-stats">
                <div>
                    <div style="font-weight: 600;">${player.gamesPlayed}</div>
                    <div>Games</div>
                </div>
                <div>
                    <div style="font-weight: 600;" class="accuracy ${getAccuracyClass(player.avgAccuracy)}">${player.avgAccuracy}%</div>
                    <div>Accuracy</div>
                </div>
            </div>
        </div>
    `).join('');
}

function renderLeaderboard(leaderboard) {
    const body = document.getElementById('leaderboardBody');
    const startFrom = 4; // Start after podium (top 3)

    if (leaderboard.length === 0) {
        body.innerHTML = `
            <div class="empty-state">
                <h3>No data yet</h3>
                <p>Complete some games to see the leaderboard!</p>
            </div>
        `;
        return;
    }

    const maxPoints = leaderboard[0]?.totalPoints || 1;

    body.innerHTML = leaderboard.slice(startFrom - 1).map((player, idx) => {
        const rank = startFrom + idx;
        const isCurrentUser = player.email === currentUserEmail;
        const progressPercent = (player.totalPoints / maxPoints) * 100;

        return `
            <div class="leaderboard-row ${isCurrentUser ? 'current-user' : ''}">
                <div class="rank-cell">
                    <div class="rank-badge ${rank <= 3 ? 'top' : ''}">${rank}</div>
                </div>
                <div class="player-info">
                    <div class="player-avatar">${getInitials(player.name)}</div>
                    <div class="player-name">${player.name}${isCurrentUser ? ' (You)' : ''}</div>
                </div>
                <div>
                    <div class="points-cell">${player.totalPoints.toLocaleString()}</div>
                    <div class="progress-container">
                        <div class="progress-bar-fill" style="width: ${progressPercent}%"></div>
                    </div>
                </div>
                <div class="games-count">${player.gamesPlayed}</div>
                <div class="accuracy ${getAccuracyClass(player.avgAccuracy)}">${player.avgAccuracy}%</div>
            </div>
        `;
    }).join('');
}

function updatePersonalStats(leaderboard) {
    const currentPlayer = leaderboard.find(p => p.email === currentUserEmail);
    const rank = leaderboard.findIndex(p => p.email === currentUserEmail) + 1;

    if (currentPlayer) {
        document.getElementById('yourRank').textContent = rank > 0 ? `#${rank}` : '-';
        document.getElementById('yourPoints').textContent = currentPlayer.totalPoints.toLocaleString();
        document.getElementById('yourGames').textContent = currentPlayer.gamesPlayed;
        document.getElementById('yourAccuracy').textContent = `${currentPlayer.avgAccuracy}%`;
    } else {
        document.getElementById('yourRank').textContent = '-';
        document.getElementById('yourPoints').textContent = '0';
        document.getElementById('yourGames').textContent = '0';
        document.getElementById('yourAccuracy').textContent = '0%';
    }
}

function render() {
    const leaderboard = aggregateLeaderboard();
    renderPodium(leaderboard);
    renderLeaderboard(leaderboard);
    updatePersonalStats(leaderboard);
}

document.addEventListener('DOMContentLoaded', () => {
    // Filter event listeners
    document.querySelectorAll('[data-time]').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('[data-time]').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentTimeFilter = btn.dataset.time;
            render();
        });
    });

    document.querySelectorAll('[data-game]').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('[data-game]').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentGameFilter = btn.dataset.game;
            render();
        });
    });

    // Initial render
    render();
});
