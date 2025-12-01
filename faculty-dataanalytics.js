// Faculty Data Analytics - MINDWAVE
// Displays student activity, game performance, and engagement metrics

const activityKey = 'student_activities';
const usersKey = 'users';

function loadData(key) {
    try { return JSON.parse(localStorage.getItem(key) || '[]'); }
    catch (error) { console.error('Failed to parse', key, error); return []; }
}

function formatTime(seconds) {
    if (!seconds) return 'N/A';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return mins > 0 ? `${mins}m ${secs}s` : `${secs}s`;
}

function meetsPerformanceCriteria(studentActivities, timeRange) {
    const completed = studentActivities.filter(a => a.status === 'completed').length;
    if (timeRange === '7') return completed > 14;
    else if (timeRange === '30') return completed > 51;
    else {
        if (studentActivities.length === 0) return false;
        const firstActivity = new Date(Math.min(...studentActivities.map(a => new Date(a.startedAt || a.completedAt))));
        const now = new Date();
        const months = (now - firstActivity) / (1000 * 60 * 60 * 24 * 30);
        return months > 0 && (completed / months) > 45;
    }
}

function renderAnalytics() {
    const activities = loadData(activityKey);
    const totalCompleted = activities.filter(a => a.status === 'completed').length;
    const totalPlayed = activities.length;
    const users = loadData(usersKey);
    const uniqueStudents = [...new Set(activities.map(a => a.studentEmail))];
    const engagementRate = users.length > 0 ? Math.floor((uniqueStudents.length / users.length) * 100) : 0;
    const studentStats = {};
    activities.forEach(activity => {
        if (!studentStats[activity.studentEmail]) {
            studentStats[activity.studentEmail] = { name: activity.studentName, completed: 0, totalScore: 0, count: 0 };
        }
        if (activity.status === 'completed') {
            studentStats[activity.studentEmail].completed++;
            studentStats[activity.studentEmail].totalScore += activity.score || 0;
            studentStats[activity.studentEmail].count++;
        }
    });
    const topPerformer = Object.entries(studentStats).sort((a, b) => b[1].totalScore - a[1].totalScore)[0];
    const consistentStudents = Object.values(studentStats).filter(s => s.completed >= 3).length;
    const analyticsGrid = document.getElementById('analyticsGrid');
    analyticsGrid.innerHTML = `
        <article class="insight-card"><h3>Games Played</h3><strong>${totalPlayed}</strong><div class="trend"> Total attempts across all games</div><div class="bar-meter"><div class="bar-fill" style="width: ${Math.min(100, (totalPlayed / 50) * 100)}%;"></div></div></article>
        <article class="insight-card"><h3>Total Engagement</h3><strong>${engagementRate}%</strong><div class="trend"> ${uniqueStudents.length} of ${users.length} students active</div><div class="bar-meter"><div class="bar-fill" style="width: ${engagementRate};"></div></div></article>
        <article class="insight-card"><h3>Top Performer</h3><strong>${topPerformer ? topPerformer[1].name : 'N/A'}</strong><div class="trend"> ${topPerformer ? topPerformer[1].totalScore : 0} total points</div><div class="bar-meter"><div class="bar-fill" style="width: ${topPerformer ? Math.min(100, (topPerformer[1].totalScore / 500) * 100) : 0}%;"></div></div></article>
        <article class="insight-card"><h3>Consistent Students</h3><strong>${consistentStudents}</strong><div class="trend"> Completed 3+ games</div><div class="bar-meter"><div class="bar-fill" style="width: ${Math.min(100, (consistentStudents / users.length) * 100)}%;"></div></div></article>
    `;
}

function renderGameBreakdown() {
    const activities = loadData(activityKey);
    const gameStats = {};
    activities.forEach(activity => {
        if (!gameStats[activity.gameId]) {
            gameStats[activity.gameId] = { title: activity.gameTitle, type: activity.gameType, completions: 0, scores: [], times: [], students: {} };
        }
        if (activity.status === 'completed') {
            gameStats[activity.gameId].completions++;
            if (activity.score) gameStats[activity.gameId].scores.push(activity.score);
            if (activity.timeTaken) gameStats[activity.gameId].times.push(activity.timeTaken);
            if (!gameStats[activity.gameId].students[activity.studentEmail] || (gameStats[activity.gameId].students[activity.studentEmail].score || 0) < activity.score) {
                gameStats[activity.gameId].students[activity.studentEmail] = { name: activity.studentName, score: activity.score };
            }
        }
    });
    const gameBreakdownTable = document.getElementById('gameBreakdownTable');
    if (Object.keys(gameStats).length === 0) {
        gameBreakdownTable.innerHTML = '<tr><td colspan="5" style="text-align: center; color: #9ea4b6;">No game data available yet</td></tr>';
        return;
    }
    gameBreakdownTable.innerHTML = Object.entries(gameStats).sort((a, b) => b[1].completions - a[1].completions).map(([id, stats]) => {
        const avgScore = stats.scores.length > 0 ? Math.floor(stats.scores.reduce((a, b) => a + b, 0) / stats.scores.length) : 0;
        const avgTime = stats.times.length > 0 ? Math.floor(stats.times.reduce((a, b) => a + b, 0) / stats.times.length) : 0;
        const topScorer = Object.values(stats.students).sort((a, b) => b.score - a.score)[0];
        return `<tr><td><span class="tag blue">${stats.title}</span></td><td>${stats.completions}</td><td>${avgScore}%</td><td>${formatTime(avgTime)}</td><td>${topScorer ? `${topScorer.name} (${topScorer.score}%)` : 'N/A'}</td></tr>`;
    }).join('');
}

function getFilters() {
    const filterForm = document.getElementById('filterForm');
    return {
        timeRange: filterForm.timeRange.value,
        topPerformerOnly: filterForm.topPerformerOnly.checked,
        engagementDetails: filterForm.engagementDetails.checked,
        bottomLiners: filterForm.bottomLiners.checked
    };
}

function filterByTimeRange(activities, days) {
    if (days === 'all') return activities;
    const cutoff = new Date();
    cutoff.setDate(cutoff.getDate() - Number(days));
    return activities.filter(activity => new Date(activity.startedAt || activity.completedAt) >= cutoff);
}

function getTopAndBottomPerformers(studentStats) {
    const studentsArray = Object.entries(studentStats);
    const sortedByScore = studentsArray.sort((a, b) => b[1].avgScore - a[1].avgScore);
    const topPerformers = sortedByScore.slice(0, 3).map(s => s[0]);
    const bottomPerformers = sortedByScore.slice(-3).map(s => s[0]);
    return { topPerformers, bottomPerformers };
}

function renderTopPerformers() {
    const filters = getFilters();
    let activities = loadData(activityKey);
    activities = filterByTimeRange(activities, filters.timeRange);
    const studentStats = {};
    const studentActivitiesByEmail = {};
    activities.forEach(activity => {
        if (!studentActivitiesByEmail[activity.studentEmail]) studentActivitiesByEmail[activity.studentEmail] = [];
        studentActivitiesByEmail[activity.studentEmail].push(activity);
        if (!studentStats[activity.studentEmail]) {
            studentStats[activity.studentEmail] = { name: activity.studentName, email: activity.studentEmail, completed: 0, scores: [], totalTime: 0 };
        }
        if (activity.status === 'completed') {
            studentStats[activity.studentEmail].completed++;
            if (activity.score) studentStats[activity.studentEmail].scores.push(activity.score);
            if (activity.timeTaken) studentStats[activity.studentEmail].totalTime += activity.timeTaken;
        }
    });
    let students = Object.values(studentStats).filter(s => s.completed > 0);
    if (filters.topPerformerOnly) {
        students = students.filter(s => meetsPerformanceCriteria(studentActivitiesByEmail[s.email], filters.timeRange));
    }
    students = students.sort((a, b) => {
        const avgA = a.scores.length > 0 ? a.scores.reduce((x, y) => x + y, 0) / a.scores.length : 0;
        const avgB = b.scores.length > 0 ? b.scores.reduce((x, y) => x + y, 0) / b.scores.length : 0;
        return avgB - avgA;
    }).slice(0, 10);
    const topPerformersTable = document.getElementById('topPerformersTable');
    if (students.length === 0) {
        topPerformersTable.innerHTML = '<tr><td colspan="5" style="text-align: center; color: #9ea4b6;">No student activity yet</td></tr>';
        return;
    }
    const topAndBottom = getTopAndBottomPerformers(Object.fromEntries(students.map(s => [s.email, { avgScore: s.scores.length > 0 ? s.scores.reduce((x, y) => x + y, 0) / s.scores.length : 0 }])));
    topPerformersTable.innerHTML = students.map(student => {
        const avgScore = student.scores.length > 0 ? Math.floor(student.scores.reduce((a, b) => a + b, 0) / student.scores.length) : 0;
        let highlightClass = '';
        if (topAndBottom.topPerformers.includes(student.email)) highlightClass = 'highlight-green';
        if (topAndBottom.bottomPerformers.includes(student.email)) highlightClass = 'highlight-red';
        return `<tr class="${highlightClass}"><td><strong>${student.name}</strong></td><td>${student.email}</td><td>${student.completed}</td><td>${avgScore}%</td><td>${formatTime(student.totalTime)}</td></tr>`;
    }).join('');
}

function renderStudentActivity() {
    const filters = getFilters();
    let activities = loadData(activityKey);
    activities = filterByTimeRange(activities, filters.timeRange);
    const studentStats = {};
    const studentActivitiesByEmail = {};
    activities.forEach(activity => {
        if (!studentActivitiesByEmail[activity.studentEmail]) studentActivitiesByEmail[activity.studentEmail] = [];
        studentActivitiesByEmail[activity.studentEmail].push(activity);
        if (!studentStats[activity.studentEmail]) {
            studentStats[activity.studentEmail] = { name: activity.studentName, email: activity.studentEmail, lastActive: activity.startedAt || activity.completedAt, total: 0, completed: 0, scores: [] };
        }
        studentStats[activity.studentEmail].total++;
        if (activity.status === 'completed') {
            studentStats[activity.studentEmail].completed++;
            if (activity.score) studentStats[activity.studentEmail].scores.push(activity.score);
        }
        const activityTime = activity.startedAt || activity.completedAt;
        if (new Date(activityTime) > new Date(studentStats[activity.studentEmail].lastActive)) {
            studentStats[activity.studentEmail].lastActive = activityTime;
        }
    });
    let students = Object.values(studentStats);
    if (filters.engagementDetails) {
        students = students.filter(s => {
            const rate = s.total > 0 ? (s.completed / s.total) * 100 : 0;
            return rate > 70;
        });
    }
    if (filters.bottomLiners) {
        const bottomSorted = students.filter(s => s.completed > 0).sort((a, b) => {
            const avgA = a.scores.length > 0 ? a.scores.reduce((x, y) => x + y, 0) / a.scores.length : 0;
            const avgB = b.scores.length > 0 ? b.scores.reduce((x, y) => x + y, 0) / b.scores.length : 0;
            return avgA - avgB;
        }).slice(0, 10);
        students = bottomSorted;
    }
    const studentActivityTable = document.getElementById('studentActivityTable');
    const sortedStudents = filters.bottomLiners ? students : students.sort((a, b) => new Date(b.lastActive) - new Date(a.lastActive));
    if (sortedStudents.length === 0) {
        studentActivityTable.innerHTML = '<tr><td colspan="5" style="text-align: center; color: #9ea4b6;">No student activity tracked yet</td></tr>';
        return;
    }
    const topAndBottom = getTopAndBottomPerformers(Object.fromEntries(students.map(s => [s.email, { avgScore: s.scores.length > 0 ? s.scores.reduce((x, y) => x + y, 0) / s.scores.length : 0 }])));
    studentActivityTable.innerHTML = sortedStudents.map(student => {
        const completionRate = student.total > 0 ? Math.floor((student.completed / student.total) * 100) : 0;
        const lastActive = new Date(student.lastActive).toLocaleString();
        let highlightClass = '';
        if (topAndBottom.topPerformers.includes(student.email)) highlightClass = 'highlight-green';
        if (topAndBottom.bottomPerformers.includes(student.email)) highlightClass = 'highlight-red';
        return `<tr class="${highlightClass}"><td><strong>${student.name}</strong></td><td>${student.email}</td><td>${lastActive}</td><td>${student.total}</td><td>${completionRate}%</td></tr>`;
    }).join('');
}

function updateDashboard() {
    renderAnalytics();
    renderGameBreakdown();
    renderTopPerformers();
    renderStudentActivity();
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    updateDashboard();

    const filterToggleBtn = document.getElementById('filterToggleBtn');
    const filterPanel = document.getElementById('filterPanel');
    filterToggleBtn.addEventListener('click', () => {
        const isHidden = filterPanel.style.display === 'none';
        filterPanel.style.display = isHidden ? 'block' : 'none';
    });

    document.addEventListener('click', (e) => {
        if (!filterToggleBtn.contains(e.target) && !filterPanel.contains(e.target)) {
            filterPanel.style.display = 'none';
        }
    });

    const filterForm = document.getElementById('filterForm');
    filterForm.addEventListener('change', () => { updateDashboard(); });

    // Auto-refresh every 3 seconds
    setInterval(updateDashboard, 3000);
});
