// Student GitHub Integration

let repos = [];

async function init() {
    await loadRepos();
}

async function loadRepos() {
    try {
        const response = await fetch('/api/github/repos', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('mindwave_token')}`
            }
        });

        const data = await response.json();

        if (!data.connected) {
            showConnectPrompt();
            return;
        }

        repos = data.repos || [];
        renderRepos();
    } catch (error) {
        console.error('Error loading repos:', error);
        showError('Failed to load repositories');
    }
}

function showConnectPrompt() {
    const container = document.getElementById('panelGrid');
    container.innerHTML = `
        <div class="connect-prompt" style="text-align: center; padding: 60px 20px;">
            <div style="font-size: 64px; margin-bottom: 20px;">🐙</div>
            <h2 style="margin-bottom: 12px;">Connect GitHub</h2>
            <p style="color: var(--text-muted); margin-bottom: 32px; max-width: 500px; margin-left: auto; margin-right: auto;">
                Link your GitHub account to submit assignments, track commits, and build your portfolio directly in Mindwave.
            </p>
            <button id="connectBtn" class="primary-btn" style="background: #24292e; color: white; border: none; padding: 14px 28px; border-radius: 8px; font-weight: 600; cursor: pointer; font-size: 16px;">
                Connect GitHub
            </button>
        </div>
    `;

    document.getElementById('connectBtn').addEventListener('click', connectGitHub);
}

function connectGitHub() {
    window.location.href = '/auth/github';
}

function renderRepos() {
    const container = document.getElementById('panelGrid');

    if (repos.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 60px 20px; color: var(--text-muted);">
                <div style="font-size: 48px; margin-bottom: 16px;">📭</div>
                <p>No public repositories found.</p>
            </div>
        `;
        return;
    }

    container.innerHTML = repos.map(repo => `
        <div class="repo-card" data-owner="${repo.owner.login}" data-repo="${repo.name}" style="background: var(--gray-900); border-radius: 16px; border: 1px solid rgba(255, 255, 255, 0.08); padding: 24px; cursor: pointer; transition: transform 0.2s;">
            <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 16px;">
                <div>
                    <h3 style="margin: 0 0 8px; font-size: 18px; color: #58a6ff;">${repo.name}</h3>
                    <p style="margin: 0; color: var(--text-muted); font-size: 14px;">${repo.description || 'No description'}</p>
                </div>
                <div style="text-align: right;">
                    <span style="display: inline-block; padding: 4px 12px; background: rgba(255,255,255,0.1); border-radius: 999px; font-size: 12px;">${repo.language || 'Text'}</span>
                </div>
            </div>
            <div style="display: flex; gap: 16px; color: var(--text-muted); font-size: 13px;">
                <span>⭐ ${repo.stargazers_count}</span>
                <span>🍴 ${repo.forks_count}</span>
                <span>📅 ${new Date(repo.updated_at).toLocaleDateString()}</span>
            </div>
        </div>
    `).join('');

    // Attach event listeners
    document.querySelectorAll('.repo-card').forEach(card => {
        card.addEventListener('click', () => {
            showRepoDetails(card.dataset.owner, card.dataset.repo);
        });
    });
}

async function showRepoDetails(owner, repoName) {
    const modal = document.createElement('div');
    modal.className = 'repo-modal';
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0,0,0,0.8);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 1000;
        padding: 20px;
    `;

    modal.innerHTML = `
        <div style="background: #1c1f26; border-radius: 16px; max-width: 800px; width: 100%; max-height: 90vh; overflow-y: auto; position: relative;">
            <div style="padding: 32px; border-bottom: 1px solid rgba(255,255,255,0.08);">
                <button id="closeModalBtn" style="position: absolute; top: 24px; right: 24px; background: none; border: none; color: white; font-size: 24px; cursor: pointer;">×</button>
                <h2 style="margin: 0 0 8px;">${repoName}</h2>
                <p style="color: var(--text-muted);">Recent Commits</p>
            </div>
            <div id="commitsList" style="padding: 32px;">
                <div style="text-align: center; color: var(--text-muted);">Loading commits...</div>
            </div>
            <div style="padding: 24px 32px; border-top: 1px solid rgba(255,255,255,0.08); background: rgba(0,0,0,0.2);">
                <button id="submitAssignmentBtn" class="primary-btn" style="width: 100%; background: #2ea44f; color: white; border: none; padding: 12px; border-radius: 8px; font-weight: 600; cursor: pointer;">
                    Submit as Assignment
                </button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    document.getElementById('closeModalBtn').addEventListener('click', () => modal.remove());
    modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.remove();
    });

    document.getElementById('submitAssignmentBtn').addEventListener('click', async () => {
        if (confirm(`Submit ${repoName} as your assignment?`)) {
            try {
                const response = await fetch('/api/github/submit-assignment', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${localStorage.getItem('mindwave_token')}`
                    },
                    body: JSON.stringify({
                        repoUrl: `https://github.com/${owner}/${repoName}`,
                        comments: 'Submitted via Mindwave GitHub Integration'
                    })
                });
                const data = await response.json();
                if (data.ok) {
                    alert('Assignment submitted successfully! 🎉');
                    modal.remove();
                } else {
                    alert('Failed to submit assignment.');
                }
            } catch (error) {
                console.error('Submission error:', error);
                alert('Error submitting assignment.');
            }
        }
    });

    try {
        const response = await fetch(`/api/github/commits/${owner}/${repoName}`, {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('mindwave_token')}` }
        });
        const data = await response.json();

        const commitsContainer = document.getElementById('commitsList');
        if (data.commits && data.commits.length > 0) {
            commitsContainer.innerHTML = data.commits.map(commit => `
                <div style="padding: 16px; border-left: 2px solid #58a6ff; margin-bottom: 16px; background: rgba(255,255,255,0.02);">
                    <p style="margin: 0 0 4px; font-weight: 500;">${commit.commit.message}</p>
                    <div style="font-size: 12px; color: var(--text-muted); display: flex; justify-content: space-between;">
                        <span>${commit.commit.author.name}</span>
                        <span>${new Date(commit.commit.author.date).toLocaleDateString()}</span>
                    </div>
                </div>
            `).join('');
        } else {
            commitsContainer.innerHTML = '<p style="text-align: center; color: var(--text-muted);">No commits found.</p>';
        }
    } catch (error) {
        console.error('Error loading commits:', error);
        document.getElementById('commitsList').innerHTML = '<p style="text-align: center; color: #ff3b30;">Failed to load commits.</p>';
    }
}

function showError(message) {
    const container = document.getElementById('panelGrid');
    container.innerHTML = `
        <div style="text-align: center; padding: 60px 20px; color: #ff3b30;">
            <div style="font-size: 48px; margin-bottom: 16px;">⚠️</div>
            <p>${message}</p>
        </div>
    `;
}

init();
