<!DOCTYPE html>
<html lang="en">

<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>MINDWAVE – Play Game</title>
    <link rel="stylesheet" href="role-page.css">
    <link rel="stylesheet" href="theme.css">
    <script src="theme-init.js"></script>
    <style>
        .game-container {
            max-width: 800px;
            margin: 0 auto;
        }

        .game-card {
            background: rgba(255, 255, 255, 0.03);
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 16px;
            padding: 24px;
            margin-bottom: 16px;
            transition: all 0.2s;
            cursor: pointer;
        }

        .game-card:hover {
            background: rgba(255, 255, 255, 0.08);
            transform: translateY(-2px);
        }

        .game-card h3 {
            margin: 0 0 8px;
            font-size: 18px;
        }

        .game-card p {
            margin: 0 0 16px;
            color: #9ea4b6;
            font-size: 14px;
        }

        .meta-tag {
            display: inline-flex;
            align-items: center;
            gap: 6px;
            padding: 4px 10px;
            border-radius: 999px;
            background: rgba(15, 98, 254, 0.15);
            color: #4da0ff;
            font-size: 12px;
        }

        /* Game Player Styles */
        .player-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 32px;
            padding-bottom: 16px;
            border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        }

        .timer {
            font-family: monospace;
            font-size: 24px;
            color: #ff9f0a;
        }

        .question-display {
            background: rgba(15, 17, 27, 0.6);
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 24px;
            padding: 32px;
        }

        .option-btn {
            display: block;
            width: 100%;
            text-align: left;
            padding: 16px 20px;
            margin-bottom: 12px;
            background: rgba(255, 255, 255, 0.05);
            border: 1px solid rgba(255, 255, 255, 0.1);
            border-radius: 12px;
            color: white;
            cursor: pointer;
            transition: all 0.2s;
            font-size: 16px;
        }

        .option-btn:hover {
            background: rgba(255, 255, 255, 0.1);
        }

        .option-btn.selected {
            background: rgba(15, 98, 254, 0.2);
            border-color: #0f62fe;
        }

        .progress-bar {
            height: 6px;
            background: rgba(255, 255, 255, 0.1);
            border-radius: 999px;
            margin-top: 24px;
            overflow: hidden;
        }

        .progress-fill {
            height: 100%;
            background: #34c759;
            transition: width 0.3s ease;
        }

        .submit-btn {
            background: #0f62fe;
            color: white;
            border: none;
            padding: 12px 24px;
            border-radius: 8px;
            font-size: 16px;
            cursor: pointer;
            transition: background 0.2s;
        }

        .submit-btn:hover {
            background: #0353e9;
        }

        .error-message {
            color: #ff3b30;
            background: rgba(255, 59, 48, 0.1);
            padding: 16px;
            border-radius: 8px;
            margin-top: 16px;
            border: 1px solid rgba(255, 59, 48, 0.2);
        }
    </style>
</head>

<body>
    <div class="page-shell">
        <header class="hero">
            <a class="ghost-link" href="homepage.html" id="backLink">← Back to Dashboard</a>
            <p class="eyebrow">Active Assignments</p>
            <h1 id="pageTitle">Game Center</h1>
            <p class="lede" id="pageDesc">Complete your assigned quizzes and challenges to earn points.</p>
        </header>

        <!-- NEW: Gamification Dashboard -->
        <div class="gamification-dash"
            style="margin-bottom: 32px; background: linear-gradient(90deg, #1c1f26 0%, #111319 100%); border-radius: 20px; padding: 24px; border: 1px solid rgba(255,255,255,0.08); display: flex; flex-wrap: wrap; gap: 24px; align-items: center;">
            <div style="flex: 1; min-width: 200px;">
                <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                    <strong style="font-size: 18px;">Level <span id="playerLevel">1</span></strong>
                    <span style="color: #34c759;" id="playerRank">Novice</span>
                </div>
                <div style="height: 8px; background: rgba(255,255,255,0.1); border-radius: 99px; overflow: hidden;">
                    <div id="xpBar" style="width: 0%; height: 100%; background: #34c759; transition: width 0.5s ease;">
                    </div>
                </div>
                <div
                    style="margin-top: 6px; font-size: 12px; color: #9ea4b6; display: flex; justify-content: space-between;">
                    <span id="currentXP">0 XP</span>
                    <span id="nextLevelXP">100 XP</span>
                </div>
            </div>

            <div style="display: flex; gap: 24px;">
                <div style="text-align: center;">
                    <div style="font-size: 24px;">🔥 <span id="streakCount">0</span></div>
                    <div style="font-size: 12px; color: #9ea4b6; margin-top: 4px;">Day Streak</div>
                </div>
                <div style="text-align: center;">
                    <div style="font-size: 24px;">🏆 <span id="totalWins">0</span></div>
                    <div style="font-size: 12px; color: #9ea4b6; margin-top: 4px;">Wins</div>
                </div>
            </div>
        </div>

        <!-- NEW: Filter Tabs -->
        <div class="filter-tabs"
            style="display: flex; gap: 12px; margin-bottom: 24px; overflow-x: auto; padding-bottom: 4px;">
            <button onclick="filterGames('all')" class="filter-btn active"
                style="background: rgba(255,255,255,0.1); border: none; padding: 8px 16px; border-radius: 99px; color: white; cursor: pointer;">All</button>
            <button onclick="filterGames('quiz')" class="filter-btn"
                style="background: transparent; border: 1px solid rgba(255,255,255,0.1); padding: 8px 16px; border-radius: 99px; color: #9ea4b6; cursor: pointer;">Quizzes</button>
            <button onclick="filterGames('logic')" class="filter-btn"
                style="background: transparent; border: 1px solid rgba(255,255,255,0.1); padding: 8px 16px; border-radius: 99px; color: #9ea4b6; cursor: pointer;">Logic</button>
            <button onclick="filterGames('builder')" class="filter-btn"
                style="background: transparent; border: 1px solid rgba(255,255,255,0.1); padding: 8px 16px; border-radius: 99px; color: #9ea4b6; cursor: pointer;">Builders</button>
        </div>

        <div class="game-container" id="appContainer">
            <!-- Content injected here -->
        </div>
    </div>

    <script>
        const gamesKey = 'games';
        const activityKey = 'student_activities';
        const currentUserEmail = localStorage.getItem('email') || 'student@example.com';
        const currentUserName = localStorage.getItem('firstName') || 'Student';
        let timerInterval; // Moved to top to avoid TDZ error

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
            updatePlayerStats(); // Load stats
            const games = loadData(gamesKey).reverse(); // Newest first
            window.allGames = games; // Store for filtering
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
            // Update UI
            document.querySelectorAll('.filter-btn').forEach(btn => {
                btn.style.background = 'transparent';
                btn.style.color = '#9ea4b6';
                btn.style.border = '1px solid rgba(255,255,255,0.1)';
            });
            event.target.style.background = 'rgba(255,255,255,0.1)';
            event.target.style.color = 'white';
            event.target.style.border = 'none';

            // Filter Logic
            if (type === 'all') return renderGameList(window.allGames);

            const filtered = window.allGames.filter(g => {
                if (type === 'quiz') return g.type === 'quiz' || g.type === 'trivia-challenge';
                if (type === 'logic') return g.type.includes('unjumble') || g.type.includes('sorter') || g.type.includes('logic');
                if (type === 'builder') return g.type.includes('sql') || g.type.includes('fill');
                return false;
            });
            renderGameList(filtered);
        };

        function updatePlayerStats() {
            const activities = loadData(activityKey);
            const totalScore = activities.reduce((acc, curr) => acc + (curr.rawScore || 0), 0);
            const wins = activities.length;

            // Level Logic: Level = sqrt(totalScore / 100)
            const level = Math.floor(Math.sqrt(totalScore / 100)) + 1;
            const nextLevelXP = Math.pow(level, 2) * 100;
            const currentLevelBaseXP = Math.pow(level - 1, 2) * 100;
            const progress = ((totalScore - currentLevelBaseXP) / (nextLevelXP - currentLevelBaseXP)) * 100;

            document.getElementById('playerLevel').textContent = level;
            document.getElementById('currentXP').textContent = totalScore + ' XP';
            document.getElementById('nextLevelXP').textContent = nextLevelXP + ' XP';
            document.getElementById('xpBar').style.width = Math.max(0, Math.min(100, progress)) + '%';
            document.getElementById('totalWins').textContent = wins;

            // Simple Rank Names
            const ranks = ['Novice', 'Apprentice', 'Scholar', 'Expert', 'Master', 'Grandmaster'];
            document.getElementById('playerRank').textContent = ranks[Math.min(level - 1, ranks.length - 1)];
        }

        // Confetti Effect
        function fireConfetti() {
            const count = 200;
            const defaults = { origin: { y: 0.7 } };

            function fire(particleRatio, opts) {
                // Simple CSS/JS confetti implementation or placeholder if library not present
                // For now, we'll create simple DOM elements
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
            fire();
        }

        function getGameMeta(game) {
            if (game.type === 'quiz') return (game.questions ? game.questions.length : 0) + ' Questions';
            if (game.type === 'unjumble' || game.type === 'code-unjumble') return (game.lines ? game.lines.length : 0) + ' Lines';
            if (game.type === 'sorter' || game.type === 'tech-sorter') return (game.items ? game.items.length : 0) + ' Items';
            let startTime = Date.now();

            // Shuffle lines for the game
            let shuffledLines = [...(game.lines || [])].map((line, idx) => ({ text: line, originalIndex: idx }))
                .sort(() => Math.random() - 0.5);

            function render() {
                container.innerHTML = `
                    <div class="player-header"><span>Reorder the Code</span><span class="timer">⏱️</span></div>
                    <div class="question-display">
                        <p style="margin-bottom: 24px; color: #9ea4b6;">Click lines to move them up/down to fix the logic.</p>
                        <div id="code-lines" style="display: flex; flex-direction: column; gap: 8px;">
                            ${shuffledLines.map((line, idx) => `
                                <div class="option-btn" style="cursor: pointer; display: flex; justify-content: space-between;" onclick="moveLine(${idx})">
                                    <span style="font-family: monospace;">${line.text}</span>
                                    <span style="color: #666;">↕</span>
                                </div>
                            `).join('')}
                        </div>
                        <button class="submit-btn" onclick="checkUnjumble()" style="margin-top: 32px; width: 100%;">Submit Solution</button>
                    </div>
                `;
            }

            // Simple swap interaction
            let selectedIdx = null;

            window.moveLine = (idx) => {
                if (selectedIdx === null) {
                    selectedIdx = idx;
                    // Re-render to show selection
                    const lines = document.querySelectorAll('#code-lines > div');
                    lines[idx].style.borderColor = '#0f62fe';
                    lines[idx].style.background = 'rgba(15, 98, 254, 0.1)';
                } else {
                    // Swap
                    const temp = shuffledLines[selectedIdx];
                    shuffledLines[selectedIdx] = shuffledLines[idx];
                    shuffledLines[idx] = temp;
                    selectedIdx = null;
                    render();
                }
            };

            window.checkUnjumble = () => {
                // Check if order matches original (0, 1, 2, 3...)
                let correct = 0;
                shuffledLines.forEach((line, idx) => {
                    if (line.originalIndex === idx) correct++;
                });

                // Calculate score based on accuracy
                const accuracy = correct / (game.lines ? game.lines.length : 1);
                const score = Math.round(accuracy * game.totalPoints);

                saveResult(game, score, game.totalPoints, startTime);
                showResult(container, score, game.totalPoints, startTime);
            };

            // Start timer AFTER checkUnjumble is defined
            startTimer(game.duration || 10, '#appContainer', window.checkUnjumble);
            render();
        }

        // --- 3. Tech Sorter Engine ---
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

        // --- 4. Syntax Fill-in Engine ---
        function playFillIn(game, container) {
            let startTime = Date.now();

            // Create a map of blank index -> selected word
            let filledBlanks = {};
            let wordBank = [...(game.blanks || [])].sort(() => Math.random() - 0.5);

            function render() {
                // Replace blanks in content with drop zones
                let blankIndex = 0;

                // We need to carefully replace [word] with a placeholder
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
                // Find first empty blank
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

        // --- 5. SQL Builder Engine ---
        function playSQL(game, container) {
            let startTime = Date.now();

            let builtQuery = [];
            // Combine correct blocks and distractors, then shuffle
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

                        <div style="display: flex; flex-wrap: wrap; gap: 8px;">
                            ${availableBlocks.map((block, idx) => `
                                <button onclick="addToQuery('${block}', ${idx})" style="background: rgba(255,255,255,0.1); color: white; border: 1px solid rgba(255,255,255,0.1); padding: 6px 12px; border-radius: 4px; cursor: pointer;">${block}</button>
                            `).join('')}
                        </div>

                        <button class="submit-btn" onclick="checkSQL()" style="margin-top: 32px; width: 100%;">Run Query</button>
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
                builtQuery.splice(idx, 1);
                availableBlocks.push(block);
                render();
            };

            window.checkSQL = () => {
                const userString = builtQuery.join(' ');
                // Simple string comparison (ignoring extra spaces)
                const isCorrect = userString.trim() === (game.correctQuery || '').trim();
                const score = isCorrect ? game.totalPoints : 0;

                saveResult(game, score, game.totalPoints, startTime);
                showResult(container, score, game.totalPoints, startTime);
            };

            startTimer(game.duration || 10, '#appContainer', window.checkSQL);
            render();
        }

        // --- Helpers ---
        function saveResult(game, score, total, startTime) {
            const timeTaken = Math.floor((Date.now() - startTime) / 1000);
            const activities = loadData(activityKey);

            // Check for Double XP Event
            const isDoubleXP = localStorage.getItem('doubleXP') === 'true';
            const finalScore = isDoubleXP ? score * 2 : score;
            const finalTotal = isDoubleXP ? total * 2 : total;

            activities.push({
                gameId: game.id,
                gameTitle: game.title,
                gameType: game.type,
                studentEmail: currentUserEmail,
                studentName: currentUserName,
                score: Math.round((score / total) * 100) || 0,
                rawScore: finalScore,
                totalPoints: finalTotal,
                timeTaken: timeTaken,
                status: 'completed',
                startedAt: new Date(startTime).toISOString(),
                completedAt: new Date().toISOString(),
                xpBonus: isDoubleXP ? '2x Event' : null
            });
            saveData(activityKey, activities);
        }

        function showResult(container, score, total, startTime) {
            clearInterval(timerInterval); // Stop timer
            const timeTaken = Math.floor((Date.now() - startTime) / 1000);
            container.innerHTML = `
                <div style="text-align: center; padding: 48px; background: rgba(15, 17, 27, 0.8); border-radius: 24px; border: 1px solid rgba(255,255,255,0.1);">
                    <h1 style="font-size: 48px; margin-bottom: 16px;">🎉 Challenge Complete!</h1>
                    <p style="font-size: 20px; color: #9ea4b6; margin-bottom: 32px;">You scored <strong>${score} / ${total}</strong> points.</p>
                    <div style="display: inline-grid; grid-template-columns: 1fr 1fr; gap: 24px; text-align: left; margin-bottom: 32px;">
                        <div class="pill-stat" style="background: rgba(255,255,255,0.05); padding: 20px; border-radius: 16px;">
                            <h3 style="margin:0; font-size: 14px; color: #9ea4b6;">Accuracy</h3>
                            <strong style="font-size: 24px;">${Math.round((score / total) * 100) || 0}%</strong>
                        </div>
                        <div class="pill-stat" style="background: rgba(255,255,255,0.05); padding: 20px; border-radius: 16px;">
                            <h3 style="margin:0; font-size: 14px; color: #9ea4b6;">Time Taken</h3>
                            <strong style="font-size: 24px;">${Math.floor(timeTaken / 60)}m ${timeTaken % 60}s</strong>
                        </div>
                    </div>
                    <div><button class="submit-btn" onclick="window.location.href='student-game.html'">Return to Dashboard</button></div>
                </div>
                <script>fireConfetti();<\/script>
            `;
        }

        function startTimer(duration, containerSelector, onFinish) {
            let timer = duration * 60;
            clearInterval(timerInterval);

            // Initial display update immediately
            setTimeout(() => updateDisplay(timer), 0);

            timerInterval = setInterval(() => {
                timer--;
                updateDisplay(timer);

                if (timer < 0) {
                    clearInterval(timerInterval);
                    onFinish();
                }
            }, 1000);

            function updateDisplay(t) {
                if (t < 0) t = 0;
                const minutes = Math.floor(t / 60);
                const seconds = t % 60;
                const display = document.querySelector(`${containerSelector} .timer`);
                if (display) {
                    display.textContent = `⏱️ ${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
                    if (t < 60) display.style.color = '#ff3b30'; // Red when low
                }
            }
        }
    </script>
</body>

</html>