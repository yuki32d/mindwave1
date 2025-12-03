// Student Profile JavaScript
// This file contains all the logic for the student profile page

const activityKey = 'student_activities';
const currentUserEmail = localStorage.getItem('email') || 'student@example.com';
const currentUserName = localStorage.getItem('firstName') || 'Student';

function loadActivities() {
    try {
        return JSON.parse(localStorage.getItem(activityKey) || '[]');
    } catch {
        return [];
    }
}

function getInitials(name) {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
}

function calculateStats() {
    const activities = loadActivities().filter(a => a.studentEmail === currentUserEmail && a.status === 'completed');

    const totalPoints = activities.reduce((sum, a) => sum + (a.rawScore || 0), 0);
    const gamesCompleted = activities.length;
    const avgAccuracy = gamesCompleted > 0
        ? Math.round(activities.reduce((sum, a) => sum + (a.score || 0), 0) / gamesCompleted)
        : 0;
    const totalTime = activities.reduce((sum, a) => sum + (a.timeTaken || 0), 0);

    // Calculate streak
    const dates = activities.map(a => new Date(a.completedAt).toDateString()).filter((v, i, a) => a.indexOf(v) === i).sort();
    let streak = 0;
    const today = new Date().toDateString();
    if (dates.includes(today) || (dates.length > 0 && dates[dates.length - 1] === new Date(Date.now() - 86400000).toDateString())) {
        streak = 1;
        for (let i = dates.length - 2; i >= 0; i--) {
            const diff = (new Date(dates[i + 1]) - new Date(dates[i])) / 86400000;
            if (diff === 1) streak++;
            else break;
        }
    }

    return { totalPoints, gamesCompleted, avgAccuracy, totalTime, streak };
}

function calculateRank() {
    const allActivities = loadActivities();
    const playerStats = {};

    allActivities.forEach(activity => {
        const email = activity.studentEmail;
        if (!playerStats[email]) {
            playerStats[email] = { email, totalPoints: 0 };
        }
        playerStats[email].totalPoints += activity.rawScore || 0;
    });

    const leaderboard = Object.values(playerStats).sort((a, b) => b.totalPoints - a.totalPoints);
    const rank = leaderboard.findIndex(p => p.email === currentUserEmail) + 1;
    return rank > 0 ? rank : '-';
}

function calculateSkills() {
    const activities = loadActivities().filter(a => a.studentEmail === currentUserEmail && a.status === 'completed');
    const skills = {};

    const gameTypeMap = {
        'quiz': 'Quiz',
        'unjumble': 'Logic Unjumble',
        'code-unjumble': 'Logic Unjumble',
        'sorter': 'Tech Sorter',
        'tech-sorter': 'Tech Sorter',
        'fillin': 'Syntax Fill-in',
        'syntax-fill': 'Syntax Fill-in',
        'sql': 'SQL Builder',
        'sql-builder': 'SQL Builder'
    };

    activities.forEach(a => {
        const type = gameTypeMap[a.gameType] || a.gameType;
        if (!skills[type]) {
            skills[type] = { count: 0, totalScore: 0 };
        }
        skills[type].count++;
        skills[type].totalScore += a.score || 0;
    });

    return Object.entries(skills).map(([name, data]) => ({
        name,
        avgScore: Math.round(data.totalScore / data.count),
        count: data.count
    }));
}

function checkAchievements() {
    const activities = loadActivities().filter(a => a.studentEmail === currentUserEmail && a.status === 'completed');
    const stats = calculateStats();

    const achievements = [
        {
            id: 'perfect_score',
            name: 'Perfect Score',
            desc: 'Score 100% on any game',
            icon: '💯',
            unlocked: activities.some(a => a.score === 100)
        },
        {
            id: 'speed_demon',
            name: 'Speed Demon',
            desc: 'Complete a game in under 2 minutes',
            icon: '⚡',
            unlocked: activities.some(a => (a.timeTaken || 0) < 120)
        },
        {
            id: 'consistent_learner',
            name: 'Consistent Learner',
            desc: 'Maintain a 7-day streak',
            icon: '🔥',
            unlocked: stats.streak >= 7
        },
        {
            id: 'quiz_master',
            name: 'Quiz Master',
            desc: 'Complete 10 quizzes',
            icon: '📚',
            unlocked: activities.filter(a => a.gameType === 'quiz').length >= 10
        },
        {
            id: 'sql_wizard',
            name: 'SQL Wizard',
            desc: 'Perfect score on SQL game',
            icon: '🧙',
            unlocked: activities.some(a => (a.gameType === 'sql' || a.gameType === 'sql-builder') && a.score === 100)
        },
        {
            id: 'first_game',
            name: 'First Steps',
            desc: 'Complete your first game',
            icon: '🎯',
            unlocked: activities.length > 0
        }
    ];

    return achievements;
}

function renderOverview() {
    const stats = calculateStats();
    const rank = calculateRank();

    document.getElementById('totalPoints').textContent = stats.totalPoints.toLocaleString();
    document.getElementById('currentRank').textContent = rank !== '-' ? `#${rank}` : '-';
    document.getElementById('gamesCompleted').textContent = stats.gamesCompleted;
    document.getElementById('avgAccuracy').textContent = `${stats.avgAccuracy}%`;
    document.getElementById('totalTime').textContent = `${Math.floor(stats.totalTime / 60)}m`;
    document.getElementById('currentStreak').textContent = stats.streak;

    // Skills
    const skills = calculateSkills();
    const skillsGrid = document.getElementById('skillsGrid');
    skillsGrid.innerHTML = skills.map(skill => `
        <div class="skill-item">
            <div class="skill-header">
                <div class="skill-name">${skill.name}</div>
                <div class="skill-score">${skill.avgScore}%</div>
            </div>
            <div class="skill-bar">
                <div class="skill-fill" style="width: ${skill.avgScore}%"></div>
            </div>
            <p style="margin: 8px 0 0; font-size: 12px; color: #9ea4b6;">${skill.count} games played</p>
        </div>
    `).join('');
}

function renderActivity() {
    const activities = loadActivities()
        .filter(a => a.studentEmail === currentUserEmail && a.status === 'completed')
        .sort((a, b) => new Date(b.completedAt) - new Date(a.completedAt))
        .slice(0, 10);

    const activityList = document.getElementById('activityList');

    if (activities.length === 0) {
        activityList.innerHTML = '<p style="color: #9ea4b6; text-align: center; padding: 32px;">No activity yet. Start playing games!</p>';
        return;
    }

    activityList.innerHTML = activities.map(a => {
        const date = new Date(a.completedAt);
        const timeAgo = getTimeAgo(date);

        return `
            <div class="activity-item">
                <div class="activity-icon">🎮</div>
                <div class="activity-info">
                    <h4>${a.gameTitle}</h4>
                    <p>${a.gameType} • ${timeAgo}</p>
                </div>
                <div class="activity-score">${a.score}%</div>
                <div class="activity-time">${Math.floor((a.timeTaken || 0) / 60)}m ${(a.timeTaken || 0) % 60}s</div>
            </div>
        `;
    }).join('');
}

function renderAchievements() {
    const achievements = checkAchievements();
    const achievementsGrid = document.getElementById('achievementsGrid');

    achievementsGrid.innerHTML = achievements.map(ach => `
        <div class="achievement-card ${ach.unlocked ? 'unlocked' : 'locked'}">
            <span class="achievement-icon">${ach.icon}</span>
            <div class="achievement-name">${ach.name}</div>
            <div class="achievement-desc">${ach.desc}</div>
            ${ach.unlocked ? '<p style="margin-top: 8px; color: #34c759; font-size: 12px;">✓ Unlocked</p>' : '<p style="margin-top: 8px; color: #9ea4b6; font-size: 12px;">🔒 Locked</p>'}
        </div>
    `).join('');
}

function renderSettings() {
    document.getElementById('displayName').value = currentUserName;
    document.getElementById('emailInput').value = currentUserEmail;
}

function getTimeAgo(date) {
    const seconds = Math.floor((new Date() - date) / 1000);
    if (seconds < 60) return 'Just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
}

function switchTab(tabName, targetButton) {
    // Update tab buttons
    document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
    if (targetButton) targetButton.classList.add('active');

    // Update tab content
    document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
    document.getElementById(tabName).classList.add('active');

    // Render content
    if (tabName === 'overview') renderOverview();
    else if (tabName === 'activity') renderActivity();
    else if (tabName === 'achievements') renderAchievements();
    else if (tabName === 'settings') renderSettings();
}

function saveSettings() {
    const displayName = document.getElementById('displayName').value;
    if (displayName) {
        localStorage.setItem('firstName', displayName);
        document.getElementById('profileName').textContent = displayName;
        alert('Settings saved successfully!');
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function () {
    // Event Listeners - Tab switching
    document.querySelectorAll('[data-tab]').forEach(btn => {
        btn.addEventListener('click', function () {
            const tabName = this.getAttribute('data-tab');
            switchTab(tabName, this);
        });
    });

    // Save settings button
    const saveBtn = document.getElementById('saveSettingsBtn');
    if (saveBtn) {
        saveBtn.addEventListener('click', saveSettings);
    }

    // Toggle switches
    document.getElementById('privacyToggle').addEventListener('click', function () {
        this.classList.toggle('active');
    });

    document.getElementById('notifToggle').addEventListener('click', function () {
        this.classList.toggle('active');
    });

    // Initialize profile
    document.getElementById('profileName').textContent = currentUserName;
    document.getElementById('profileEmail').textContent = currentUserEmail;
    document.getElementById('profileAvatar').textContent = getInitials(currentUserName);

    const rank = calculateRank();
    document.getElementById('rankBadge').textContent = rank !== '-' ? `🏆 Rank #${rank}` : '🏆 Unranked';

    renderOverview();
});
