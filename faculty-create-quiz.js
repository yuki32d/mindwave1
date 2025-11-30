// Quiz Creation - Clean version with API integration
function createQuestionHTML(id, index) {
    return `
        <div class="question-card" id="q-${id}">
            <h3>Question ${index + 1}</h3>
            <button type="button" class="remove-btn" onclick="removeQuestion('${id}')">Remove</button>
            
            <label>Question Text</label>
            <input type="text" name="q-${id}-text" placeholder="Enter your question..." required>
            
            <label>Options (Select the correct one)</label>
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
            
            <div style="margin-top: 16px;">
                <label>Points for this question</label>
                <input type="number" name="q-${id}-points" value="10" min="1" oninput="updateTotalPoints()">
            </div>
        </div>
    `;
}

document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, initializing quiz form');

    const container = document.getElementById('questionsContainer');
    const addBtn = document.getElementById('addQuestionBtn');
    const countSpan = document.getElementById('questionCount');
    const pointsSpan = document.getElementById('totalPoints');

    if (!container || !addBtn || !countSpan || !pointsSpan) {
        console.error('Required elements not found!', { container, addBtn, countSpan, pointsSpan });
        alert('Error: Page elements not found. Please refresh the page.');
        return;
    }

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
    const quizForm = document.getElementById('quizForm');
    if (!quizForm) {
        console.error('Quiz form not found!');
        alert('Error: Quiz form not found. Please refresh the page.');
        return;
    }

    quizForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        console.log('=== QUIZ FORM SUBMITTED ===');
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
            type: 'quiz',
            title: formData.get('title'),
            description: formData.get('description'),
            duration: parseInt(formData.get('duration')),
            questions: parsedQuestions,
            totalPoints: parseInt(pointsSpan.textContent),
            status: 'active',
            published: true
        };

        console.log('=== QUIZ DATA PREPARED ===');
        console.log('Title:', quizData.title);
        console.log('Questions:', quizData.questions.length);
        console.log('Full data:', JSON.stringify(quizData, null, 2));

        try {
            console.log('=== SENDING POST REQUEST TO /api/games ===');
            const response = await fetch('/api/games', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(quizData)
            });

            console.log('=== RESPONSE RECEIVED ===');
            console.log('Status:', response.status);
            console.log('OK:', response.ok);

            if (response.ok) {
                const result = await response.json();
                console.log('=== SUCCESS ===');
                console.log('Game created:', result.game);
                alert('Quiz published successfully!');
                window.location.href = 'admin.html';
            } else {
                const error = await response.json();
                console.error('=== ERROR RESPONSE ===');
                console.error('Error:', error);
                alert('Failed to publish quiz: ' + (error.message || 'Unknown error'));
            }
        } catch (err) {
            console.error('=== FETCH ERROR ===');
            console.error('Error:', err);
            alert('Failed to publish quiz. Please check your connection.');
        }
    });

    // Add first question by default
    addBtn.click();
});
