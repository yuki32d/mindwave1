// Student Game Engine - MINDWAVE
// All game logic and player stats

const gamesKey = 'games';
const activityKey = 'student_activities';
const currentUserEmail = localStorage.getItem('email') || 'student@example.com';
const currentUserName = localStorage.getItem('firstName') || 'Student';
let timerInterval;

function loadData(key) {
    try { return JSON.parse(localStorage.getItem(key) || '[]'); }
    catch { return []; }
}

function saveData(key, data) {
    localStorage.setItem(key, JSON.stringify(data));
}

// Router logic
const urlParams = new URLSearchParams(window.location.search);
const gameId = urlParams.get('id');

if (gameId) {
    initGamePlayer(gameId);
} else {
    initGameLobby();
}

function initGameLobby() {
    updatePlayerStats();
    const games = loadData(gamesKey).reverse();
    window.allGames = games;
    renderGameList(games);
}


function renderGameList(games) {
    const container = document.getElementById('appContainer');

    if (games.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 48px; color: #9ea4b6;">
                <h2>No active games found</h2>
                <p>Check back later for new assignments.</p>
            </div>
        `;
        return;
    }

    container.innerHTML = games.map(game => `
        <article class="game-card" onclick="window.location.href='?id=${game.id}'">
            <div style="display: flex; justify-content: space-between; align-items: start;">
                <h3>${game.title}</h3>
                <span class="meta-tag">${getGameMeta(game)}</span>
            </div>
            <p>${game.description || 'No description provided.'}</p>
            <div style="display: flex; gap: 12px; font-size: 13px; color: #9ea4b6;">
                <span>⏱️ ${game.duration || 10} mins</span>
                <span>🎮 ${formatGameType(game.type)}</span>
            </div>
        </article>
    `).join('');
}

window.filterGames = function (type) {
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.style.background = 'transparent';
        btn.style.color = '#9ea4b6';
        btn.style.border = '1px solid rgba(255,255,255,0.1)';
    });
    event.target.style.background = 'rgba(255,255,255,0.1)';
    event.target.style.color = 'white';
    event.target.style.border = 'none';

    if (type === 'all') return renderGameList(window.allGames);

    const filtered = window.allGames.filter(g => {
        if (type === 'quiz') return g.type === 'quiz' || g.type === 'trivia-challenge';
        if (type === 'logic') return g.type.includes('unjumble') || g.type.includes('sorter') || g.type.includes('logic') || g.type === 'bug-hunt';
        if (type === 'builder') return g.type.includes('sql') || g.type.includes('fill');
        return false;
    });
    renderGameList(filtered);
};

function updatePlayerStats() {
    const activities = loadData(activityKey);
    const totalScore = activities.reduce((acc, curr) => acc + (curr.rawScore || 0), 0);
    const wins = activities.length;

    const level = Math.floor(Math.sqrt(totalScore / 100)) + 1;
    const nextLevelXP = Math.pow(level, 2) * 100;
    const currentLevelBaseXP = Math.pow(level - 1, 2) * 100;
    const progress = ((totalScore - currentLevelBaseXP) / (nextLevelXP - currentLevelBaseXP)) * 100;

    document.getElementById('playerLevel').textContent = level;
    document.getElementById('currentXP').textContent = totalScore + ' XP';
    document.getElementById('nextLevelXP').textContent = nextLevelXP + ' XP';
    document.getElementById('xpBar').style.width = Math.max(0, Math.min(100, progress)) + '%';
    document.getElementById('totalWins').textContent = wins;

    const ranks = ['Novice', 'Apprentice', 'Scholar', 'Expert', 'Master', 'Grandmaster'];
    document.getElementById('playerRank').textContent = ranks[Math.min(level - 1, ranks.length - 1)];
}

function getGameMeta(game) {
    if (game.type === 'quiz') return (game.questions ? game.questions.length : 0) + ' Questions';
    if (game.type === 'unjumble' || game.type === 'code-unjumble') return (game.lines ? game.lines.length : 0) + ' Lines';
    if (game.type === 'sorter' || game.type === 'tech-sorter') return (game.items ? game.items.length : 0) + ' Items';
    if (game.type === 'fillin' || game.type === 'syntax-fill') return (game.blanks ? game.blanks.length : 0) + ' Blanks';
    if (game.type === 'sql' || game.type === 'sql-builder') return (game.blocks ? game.blocks.length : 0) + ' Blocks';
    if (game.type === 'bug-hunt') return (game.bugCount || 0) + ' Bugs';
    return 'Game';
}

function formatGameType(type) {
    if (type === 'quiz') return 'Quiz';
    if (type === 'unjumble' || type === 'code-unjumble') return 'Logic Unjumble';
    if (type === 'sorter' || type === 'tech-sorter') return 'Tech Sorter';
    if (type === 'fillin' || type === 'syntax-fill') return 'Syntax Fill-in';
    if (type === 'sql' || type === 'sql-builder') return 'SQL Builder';
    if (type === 'bug-hunt') return 'Debug the Monolith';
    return 'Challenge';
}

function initGamePlayer(gameId) {
    const games = loadData(gamesKey);
    const game = games.find(g => g.id === gameId);

    if (!game) {
        alert('Game not found!');
        window.location.href = 'student-game.html';
        return;
    }

    document.getElementById('pageTitle').textContent = game.title;
    document.getElementById('pageDesc').textContent = game.description || 'Complete the challenge to earn points.';
    const backLink = document.getElementById('backLink');
    backLink.href = 'student-game.html';
    backLink.textContent = '← Quit Game';

    const container = document.getElementById('appContainer');

    try {
        switch (game.type) {
            case 'quiz':
                playQuiz(game, container);
                break;
            case 'unjumble':
            case 'code-unjumble':
                playUnjumble(game, container);
                break;
            case 'sorter':
            case 'tech-sorter':
                playSorter(game, container);
                break;
            case 'fillin':
            case 'syntax-fill':
                playFillIn(game, container);
                break;
            case 'sql':
            case 'sql-builder':
                playSQL(game, container);
                break;
            case 'bug-hunt':
                playDebug(game, container);
                break;
            default:
                if (game.questions) {
                    playQuiz(game, container);
                } else {
                    container.innerHTML = '<p>Unknown game type.</p>';
                }
        }
    } catch (err) {
        console.error('Game Error:', err);
        container.innerHTML = `
            <div class="error-message">
                <h3>Something went wrong</h3>
                <p>We couldn't load this game. Error: ${err.message}</p>
                <button class="secondary-btn" onclick="window.location.reload()" style="margin-top: 12px; background: rgba(0,0,0,0.2); border: 1px solid white; color: white; padding: 8px 16px; border-radius: 4px; cursor: pointer;">Try Again</button>
            </div>
        `;
    }
}

// === GAME ENGINES ===

function playQuiz(game, container) {
    let currentQuestionIndex = 0;
    let score = 0;
    let startTime = Date.now();
    const questions = game.questions || [];

    function render() {
        if (currentQuestionIndex >= questions.length) {
            return finish();
        }

        const q = questions[currentQuestionIndex];
        const progress = ((currentQuestionIndex) / questions.length) * 100;

        container.innerHTML = `
            <div class="player-header"><span>Question ${currentQuestionIndex + 1} of ${questions.length}</span><span class="timer">⏱️</span></div>
            <div class="question-display">
                <h2 style="font-size: 24px; margin-bottom: 32px;">${q.text}</h2>
                <div class="options-grid">
                    ${q.options.map((opt, idx) => `<button class="option-btn" onclick="handleAnswer(${idx})">${opt}</button>`).join('')}
                </div>
                <div class="progress-bar"><div class="progress-fill" style="width: ${progress}%"></div></div>
            </div>
        `;
    }

    window.handleAnswer = (selectedIndex) => {
        const q = questions[currentQuestionIndex];
        if (selectedIndex === q.correct) score += 10;
        currentQuestionIndex++;
        render();
    };

    function finish() {
        const totalPoints = questions.length * 10;
        saveResult(game, score, totalPoints, startTime);
        showResult(container, score, totalPoints, startTime);
    }

    startTimer(game.duration || 10, '#appContainer', finish);
    render();
}

function playUnjumble(game, container) {
    let startTime = Date.now();
    let shuffledLines = [...(game.lines || [])].map((line, idx) => ({ text: line, originalIndex: idx }))
        .sort(() => Math.random() - 0.5);
    let selectedIdx = null;

    function render() {
        container.innerHTML = `
            <div class="player-header"><span>Reorder the Code</span><span class="timer">⏱️</span></div>
            <div class="question-display">
                <p style="margin-bottom: 24px; color: #9ea4b6;">Click two lines to swap them. Arrange in correct order.</p>
                <div id="code-lines" style="display: flex; flex-direction: column; gap: 8px;">
                    ${shuffledLines.map((line, idx) => `
                        <div class="option-btn" style="cursor: pointer; display: flex; justify-content: space-between; ${selectedIdx === idx ? 'border-color: #0f62fe; background: rgba(15, 98, 254, 0.1);' : ''}" onclick="moveLine(${idx})">
                            <span style="font-family: monospace;">${line.text}</span>
                            <span style="color: #666;">↕</span>
                        </div>
                    `).join('')}
                </div>
                <button class="submit-btn" onclick="checkUnjumble()" style="margin-top: 32px; width: 100%;">Submit Solution</button>
            </div>
        `;
    }

    window.moveLine = (idx) => {
        if (selectedIdx === null) {
            selectedIdx = idx;
        } else {
            const temp = shuffledLines[selectedIdx];
            shuffledLines[selectedIdx] = shuffledLines[idx];
            shuffledLines[idx] = temp;
            selectedIdx = null;
        }
        render();
    };

    window.checkUnjumble = () => {
        let correct = 0;
        shuffledLines.forEach((line, idx) => {
            if (line.originalIndex === idx) correct++;
        });
        const accuracy = correct / (game.lines ? game.lines.length : 1);
        const score = Math.round(accuracy * game.totalPoints);
        saveResult(game, score, game.totalPoints, startTime);
        showResult(container, score, game.totalPoints, startTime);
    };

    startTimer(game.duration || 10, '#appContainer', window.checkUnjumble);
    render();
}

function playSorter(game, container) {
    let remainingItems = [...(game.items || [])];
    let score = 0;
    let startTime = Date.now();
    let currentItem = remainingItems.pop();

    function render() {
        if (!currentItem) return finish();

        container.innerHTML = `
            <div class="player-header"><span>Sort the Item</span><span class="timer">⏱️</span></div>
            <div class="question-display" style="text-align: center;">
                <h2 style="font-size: 32px; margin-bottom: 32px;">${currentItem.name}</h2>
                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 16px;">
                    ${(game.categories || []).map(cat => `
                        <button class="option-btn" onclick="sortItem('${cat}')" style="text-align: center; height: 100px; display: flex; align-items: center; justify-content: center; font-size: 18px;">
                            ${cat}
                        </button>
                    `).join('')}
                </div>
                <p style="margin-top: 24px; color: #9ea4b6;">${remainingItems.length} items remaining</p>
            </div>
        `;
    }

    window.sortItem = (cat) => {
        if (cat === currentItem.category) score += 10;
        currentItem = remainingItems.pop();
        render();
    };

    function finish() {
        saveResult(game, score, game.totalPoints, startTime);
        showResult(container, score, game.totalPoints, startTime);
    }

    startTimer(game.duration || 10, '#appContainer', finish);
    render();
}

function playFillIn(game, container) {
    let startTime = Date.now();
    let filledBlanks = {};
    let wordBank = [...(game.blanks || [])].sort(() => Math.random() - 0.5);

    function render() {
        let blankIndex = 0;
        const parts = (game.content || '').split(/(\[.*?\])/g);

        const renderedContent = parts.map(part => {
            if (part.startsWith('[') && part.endsWith(']')) {
                const idx = blankIndex++;
                const filled = filledBlanks[idx];
                return `<span onclick="clearBlank(${idx})" style="display: inline-block; min-width: 60px; border-bottom: 2px solid var(--blue); color: var(--blue); text-align: center; cursor: pointer; margin: 0 4px;">${filled || '___'}</span>`;
            }
            return part;
        }).join('').replace(/\n/g, '<br>');

        container.innerHTML = `
            <div class="player-header"><span>Fill in the blanks</span><span class="timer">⏱️</span></div>
            <div class="question-display">
                <div style="font-family: monospace; line-height: 2; margin-bottom: 32px; background: rgba(0,0,0,0.2); padding: 16px; border-radius: 8px;">
                    ${renderedContent}
                </div>
                <div style="display: flex; flex-wrap: wrap; gap: 12px;">
                    ${wordBank.map((word, idx) => `
                        <button class="option-btn" onclick="useWord('${word}', ${idx})" style="width: auto; padding: 8px 16px; margin: 0; ${Object.values(filledBlanks).includes(word) ? 'opacity: 0.5; pointer-events: none;' : ''}">
                            ${word}
                        </button>
                    `).join('')}
                </div>
                <button class="submit-btn" onclick="checkFillIn()" style="margin-top: 32px; width: 100%;">Submit</button>
            </div>
        `;
    }

    window.useWord = (word, wordIdx) => {
        for (let i = 0; i < (game.blanks || []).length; i++) {
            if (!filledBlanks[i]) {
                filledBlanks[i] = word;
                render();
                return;
            }
        }
    };

    window.clearBlank = (idx) => {
        delete filledBlanks[idx];
        render();
    };

    window.checkFillIn = () => {
        let correct = 0;
        (game.blanks || []).forEach((ans, idx) => {
            if (filledBlanks[idx] === ans) correct++;
        });
        const score = Math.round((correct / (game.blanks ? game.blanks.length : 1)) * game.totalPoints);
        saveResult(game, score, game.totalPoints, startTime);
        showResult(container, score, game.totalPoints, startTime);
    };

    startTimer(game.duration || 10, '#appContainer', window.checkFillIn);
    render();
}

function playSQL(game, container) {
    let startTime = Date.now();
    let builtQuery = [];
    let availableBlocks = [...(game.blocks || []), ...(game.distractors || [])].sort(() => Math.random() - 0.5);

    function render() {
        container.innerHTML = `
            <div class="player-header"><span>Build the Query</span><span class="timer">⏱️</span></div>
            <div class="question-display">
                <p style="margin-bottom: 16px; color: #9ea4b6;">${game.description || ''}</p>
                <div style="min-height: 60px; background: rgba(0,0,0,0.3); border: 1px dashed rgba(255,255,255,0.2); border-radius: 8px; padding: 12px; display: flex; flex-wrap: wrap; gap: 8px; margin-bottom: 24px;">
                    ${builtQuery.map((block, idx) => `
                        <button onclick="removeFromQuery(${idx})" style="background: var(--blue); color: white; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer;">${block}</button>
                    `).join('')}
                </div>
                <div style="display: flex; flex-wrap: wrap; gap: 12px;">
                    ${availableBlocks.map((block, idx) => `
                        <button class="option-btn" onclick="addToQuery('${block}', ${idx})" style="width: auto; padding: 8px 16px; margin: 0;">
                            ${block}
                        </button>
                    `).join('')}
                </div>
                <button class="submit-btn" onclick="checkSQL()" style="margin-top: 32px; width: 100%;">Submit Query</button>
            </div>
        `;
    }

    window.addToQuery = (block, idx) => {
        builtQuery.push(block);
        availableBlocks.splice(idx, 1);
        render();
    };

    window.removeFromQuery = (idx) => {
        const block = builtQuery[idx];
        availableBlocks.push(block);
        builtQuery.splice(idx, 1);
        render();
    };

    window.checkSQL = () => {
        const correctQuery = (game.blocks || []).join(' ');
        const userQuery = builtQuery.join(' ');
        const score = correctQuery === userQuery ? game.totalPoints : Math.round((builtQuery.filter((b, i) => b === game.blocks[i]).length / game.blocks.length) * game.totalPoints);
        saveResult(game, score, game.totalPoints, startTime);
        showResult(container, score, game.totalPoints, startTime);
    };

    startTimer(game.duration || 10, '#appContainer', window.checkSQL);
    render();
}

// NEW: Debug the Monolith - Code Editor Version
function playDebug(game, container) {
    let startTime = Date.now();
    let studentEditor;

    function render() {
        container.innerHTML = `
            <div class="player-header"><span>Debug the Code</span><span class="timer">⏱️</span></div>
            <div class="question-display">
                <p style="margin-bottom: 16px; color: #9ea4b6;">${game.description || 'Fix the bugs in the code below'}</p>
                
                <div style="margin-bottom: 24px;">
                    <h4 style="margin: 0 0 12px; font-size: 14px; color: #ff3b30;">🐛 Buggy Code (Read-Only)</h4>
                    <textarea id="buggyCodeDisplay"></textarea>
                </div>

                <div>
                    <h4 style="margin: 0 0 12px; font-size: 14px; color: #34c759;">✅ Your Fix (Write your corrected code here)</h4>
                    <textarea id="studentCodeEditor"></textarea>
                </div>

                <button class="submit-btn" onclick="checkDebug()" style="margin-top: 24px; width: 100%;">Submit Fix</button>
            </div>
        `;

        // Initialize CodeMirror editors
        setTimeout(() => {
            const mode = game.language === 'python' ? 'python' :
                game.language === 'java' ? 'text/x-java' :
                    game.language === 'cpp' ? 'text/x-c++src' : 'javascript';

            // Buggy code (read-only)
            const buggyEditor = CodeMirror.fromTextArea(document.getElementById('buggyCodeDisplay'), {
                mode: mode,
                theme: 'dracula',
                lineNumbers: true,
                readOnly: true
            });
            buggyEditor.setValue(game.buggyCode || '');

            // Student editor (editable)
            studentEditor = CodeMirror.fromTextArea(document.getElementById('studentCodeEditor'), {
                mode: mode,
                theme: 'dracula',
                lineNumbers: true,
                indentUnit: 4,
                tabSize: 4
            });
            studentEditor.setValue(game.buggyCode || ''); // Pre-fill with buggy code
        }, 100);
    }

    window.checkDebug = () => {
        if (!studentEditor) {
            alert('Editor not loaded yet, please wait...');
            return;
        }

        const studentCode = studentEditor.getValue();
        const perfectCode = game.perfectCode || '';

        // Calculate similarity
        const similarity = calculateSimilarity(studentCode, perfectCode);
        const score = Math.round((similarity / 100) * game.totalPoints);

        saveResult(game, score, game.totalPoints, startTime);

        // Show result with explanation
        container.innerHTML = `
            <div class="question-display" style="text-align: center;">
                <h2 style="font-size: 32px; margin-bottom: 24px;">${similarity >= 90 ? '🎉 Excellent!' : similarity >= 70 ? '👍 Good Job!' : '💡 Keep Learning'}</h2>
                <p style="font-size: 48px; font-weight: 700; background: linear-gradient(135deg, #4da0ff 0%, #a78bfa 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; margin: 24px 0;">${score}/${game.totalPoints}</p>
                <p style="color: #9ea4b6; margin-bottom: 24px;">Code Similarity: ${similarity}%</p>
                
                <div style="background: rgba(255,255,255,0.05); padding: 20px; border-radius: 12px; margin: 24px 0; text-align: left;">
                    <h3 style="margin: 0 0 12px;">📝 Explanation</h3>
                    <p style="color: #9ea4b6; line-height: 1.6;">${game.explanation || 'No explanation provided.'}</p>
                    
                    ${similarity < 100 ? `
                        <details style="margin-top: 16px;">
                            <summary style="cursor: pointer; color: #4da0ff;">View Perfect Solution</summary>
                            <pre style="background: #1e1e1e; padding: 16px; border-radius: 8px; margin-top: 12px; overflow-x: auto;"><code>${escapeHtml(perfectCode)}</code></pre>
                        </details>
                    ` : ''}
                </div>
                
                <button class="primary-btn" onclick="window.location.href='student-game.html'" style="width: 100%;">Back to Games</button>
            </div>
        `;

        if (similarity >= 70) {
            fireConfetti();
        }
    };

    startTimer(game.duration || 15, '#appContainer', window.checkDebug);
    render();
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// === HELPER FUNCTIONS ===

function saveResult(game, score, totalPoints, startTime) {
    const timeTaken = Math.floor((Date.now() - startTime) / 1000);
    const percentage = Math.round((score / totalPoints) * 100);

    const doubleXP = localStorage.getItem('doubleXP') === 'true';
    const rawScore = doubleXP ? score * 2 : score;

    const activity = {
        id: Date.now().toString(36) + Math.random().toString(36).substr(2),
        gameId: game.id,
        gameTitle: game.title,
        gameType: game.type,
        studentEmail: currentUserEmail,
        studentName: currentUserName,
        score: percentage,
        rawScore: rawScore,
        timeTaken: timeTaken,
        completedAt: new Date().toISOString(),
        status: 'completed'
    };

    const activities = loadData(activityKey);
    activities.push(activity);
    saveData(activityKey, activities);
}

function showResult(container, score, totalPoints, startTime) {
    const percentage = Math.round((score / totalPoints) * 100);
    const timeTaken = Math.floor((Date.now() - startTime) / 1000);

    container.innerHTML = `
        <div class="question-display" style="text-align: center;">
            <h2 style="font-size: 32px; margin-bottom: 24px;">${percentage >= 70 ? '🎉 Great Job!' : '💪 Keep Practicing'}</h2>
            <p style="font-size: 48px; font-weight: 700; background: linear-gradient(135deg, #4da0ff 0%, #a78bfa 100%); -webkit-background-clip: text; -webkit-text-fill-color: transparent; margin: 24px 0;">${score}/${totalPoints}</p>
            <p style="color: #9ea4b6; margin-bottom: 32px;">Completed in ${Math.floor(timeTaken / 60)}m ${timeTaken % 60}s</p>
            <button class="primary-btn" onclick="window.location.href='student-game.html'" style="width: 100%;">Back to Games</button>
        </div>
    `;

    if (percentage >= 70) {
        fireConfetti();
    }
}

function startTimer(durationMinutes, containerSelector, onFinish) {
    let timer = durationMinutes * 60;

    function updateDisplay(t) {
        if (t < 0) t = 0;
        const minutes = Math.floor(t / 60);
        const seconds = t % 60;
        const display = document.querySelector(`${containerSelector} .timer`);
        if (display) {
            display.textContent = `⏱️ ${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
            if (t < 60) display.style.color = '#ff3b30';
        }
    }

    setTimeout(() => updateDisplay(timer), 0);

    timerInterval = setInterval(() => {
        timer--;
        updateDisplay(timer);

        if (timer < 0) {
            clearInterval(timerInterval);
            onFinish();
        }
    }, 1000);
}

function fireConfetti() {
    for (let i = 0; i < 50; i++) {
        const c = document.createElement('div');
        c.style.position = 'fixed';
        c.style.left = Math.random() * 100 + 'vw';
        c.style.top = '-10px';
        c.style.width = '10px';
        c.style.height = '10px';
        c.style.backgroundColor = ['#ff3b30', '#ff9f0a', '#34c759', '#0f62fe'][Math.floor(Math.random() * 4)];
        c.style.zIndex = '9999';
        c.style.transition = 'top 2s ease-in, transform 2s ease-in';
        document.body.appendChild(c);

        setTimeout(() => {
            c.style.top = '110vh';
            c.style.transform = `rotate(${Math.random() * 360}deg)`;
        }, 10);

        setTimeout(() => c.remove(), 2000);
    }
}
