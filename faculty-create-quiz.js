// State
let questions = [];
const gamesKey = 'games';

function loadData(key) {
    try { return JSON.parse(localStorage.getItem(key) || '[]'); }
    catch { return []; }
}

function saveData(key, data) {
    localStorage.setItem(key, JSON.stringify(data));
}

function createQuestionHTML(id, index) {
    return `
        <div class="question-card" id="q-${id}">
            <button type="button" class="remove-btn" onclick="removeQuestion('${id}')">Remove</button>
            <h3>Question ${index + 1}</h3>
            
            <div style="margin-bottom: 16px;">
                <input type="text" name="q-${id}-text" placeholder="Type your question here..." required 
                    style="width: 100%; font-size: 16px; padding: 12px; background: rgba(0,0,0,0.2); border: 1px solid rgba(255,255,255,0.1); border-radius: 8px; color: white;">
            </div>

            <label style="font-size: 12px; margin-bottom: 8px; display: block;">Answer Options (Select the correct one)</label>
            <div class="options-grid">
                <div class="option-input">
                    <input type="radio" name="q-${id}-correct" value="0" required>
                    <input type="text" name="q-${id}-opt-0" placeholder="Option A" required>
                </div>
                <div class="option-input">
                    <input type="radio" name="q-${id}-correct" value="1">
                    <input type="text" name="q-${id}-opt-1" placeholder="Option B" required>
                </div>
                <div class="option-input">
                    <input type="radio" name="q-${id}-correct" value="2">
                    <input type="text" name="q-${id}-opt-2" placeholder="Option C">
                </div>
                <div class="option-input">
                    <input type="radio" name="q-${id}-correct" value="3">
                    <input type="text" name="q-${id}-opt-3" placeholder="Option D">
                </div>
            </div>

            <div style="margin-top: 16px; display: flex; align-items: center; gap: 12px;">
                <label style="margin: 0;">Points:</label>
                <input type="number" name="q-${id}-points" value="10" style="width: 80px;" onchange="updateTotalPoints()">
            </div>
        </div>
    `;
}

function addQuestion() {
    const id = Date.now().toString();
    questions.push({ id });
    renderQuestions();
}

window.removeQuestion = function (id) {
    questions = questions.filter(q => q.id !== id);
    renderQuestions();
};

function renderQuestions() {
    const container = document.getElementById('questionsContainer');
    // Save current values before re-rendering (simplified for prototype: just re-render logic)
    // In a real app, we'd append/remove DOM nodes to preserve state. 
    // For this version, let's append new ones only or rebuild carefully.

    // Re-building approach for simplicity, but we lose focus. 
    // Better: Just append the new one.

    // Let's rely on the array for order, but only append new ones if possible.
    // Actually, simplest robust way for this demo:
    // We won't re-render ALL. We will just append the new one.
    // But for 'remove', we need to remove the element.

    // Let's change strategy: 'questions' array tracks IDs.
    // We manipulate DOM directly.
}

// Better Implementation: Direct DOM manipulation
const container = document.getElementById('questionsContainer');
const addBtn = document.getElementById('addQuestionBtn');
const countSpan = document.getElementById('questionCount');
const pointsSpan = document.getElementById('totalPoints');

addBtn.addEventListener('click', () => {
    const id = Date.now().toString();
    const index = container.children.length;
    const div = document.createElement('div');
    div.innerHTML = createQuestionHTML(id, index);
    container.appendChild(div);
    updateStats();
});

window.removeQuestion = function (id) {
    const card = document.getElementById(`q-${id}`);
    if (card) {
        card.remove();
        // Renumber questions
        Array.from(container.children).forEach((child, idx) => {
            child.querySelector('h3').textContent = `Question ${idx + 1}`;
        });
        updateStats();
    }
};

window.updateTotalPoints = function () {
    updateStats();
}

function updateStats() {
    countSpan.textContent = container.children.length;
    let total = 0;
    container.querySelectorAll('input[name$="-points"]').forEach(input => {
        total += parseInt(input.value) || 0;
    });
    pointsSpan.textContent = total;
}

// Form Submission
document.getElementById('quizForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);

    // Parse Questions
    const questionNodes = container.querySelectorAll('.question-card');
    const parsedQuestions = Array.from(questionNodes).map(node => {
        const id = node.id.replace('q-', '');
        return {
            text: formData.get(`q-${id}-text`),
            options: [
                formData.get(`q-${id}-opt-0`),
                formData.get(`q-${id}-opt-1`),
                formData.get(`q-${id}-opt-2`),
                formData.get(`q-${id}-opt-3`)
            ].filter(Boolean), // Remove empty options
            correctIndex: parseInt(formData.get(`q-${id}-correct`)),
            points: parseInt(formData.get(`q-${id}-points`))
        };
    });

    if (parsedQuestions.length === 0) {
        alert('Please add at least one question.');
        return;
    }

    const quizData = {
        id: Date.now().toString(),
        type: 'quiz',
        title: formData.get('title'),
        description: formData.get('description'),
        duration: parseInt(formData.get('duration')),
        questions: parsedQuestions,
        totalPoints: parseInt(pointsSpan.textContent),
        createdAt: new Date().toISOString(),
        status: 'active'
    };

    const games = loadData(gamesKey);
    games.push(quizData);
    saveData(gamesKey, games);

    alert('Quiz published successfully!');
    window.location.href = 'admin.html';
});

// Add first question by default
addBtn.click();
