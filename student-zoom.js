// Student Zoom Integration

let meetings = [];

async function init() {
    await loadMeetings();
}

async function loadMeetings() {
    try {
        const response = await fetch('/api/zoom/meetings', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('mindwave_token')}`
            }
        });

        const data = await response.json();

        if (!data.connected) {
            showConnectPrompt();
            return;
        }

        meetings = data.meetings || [];
        renderMeetings();
        loadRecordings(); // Load recordings in background
    } catch (error) {
        console.error('Error loading meetings:', error);
        showError('Failed to load meetings');
    }
}

function showConnectPrompt() {
    const container = document.getElementById('panelGrid');
    container.innerHTML = `
        <div class="connect-prompt" style="text-align: center; padding: 60px 20px;">
            <div style="font-size: 64px; margin-bottom: 20px;">🎥</div>
            <h2 style="margin-bottom: 12px;">Connect Zoom</h2>
            <p style="color: var(--text-muted); margin-bottom: 32px; max-width: 500px; margin-left: auto; margin-right: auto;">
                Link your Zoom account to view upcoming classes, join meetings, and access recordings directly in Mindwave.
            </p>
            <button id="connectBtn" class="primary-btn" style="background: #2D8CFF; color: white; border: none; padding: 14px 28px; border-radius: 8px; font-weight: 600; cursor: pointer; font-size: 16px;">
                Connect Zoom
            </button>
        </div>
    `;

    document.getElementById('connectBtn').addEventListener('click', connectZoom);
}

function connectZoom() {
    window.location.href = '/auth/zoom';
}

function renderMeetings() {
    const container = document.getElementById('panelGrid');

    if (meetings.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 60px 20px; color: var(--text-muted);">
                <div style="font-size: 48px; margin-bottom: 16px;">📅</div>
                <p>No upcoming meetings found.</p>
            </div>
        `;
    } else {
        container.innerHTML = `
            <h3 style="grid-column: 1/-1; margin-bottom: 16px;">Upcoming Meetings</h3>
            ${meetings.map(meeting => `
                <div class="meeting-card" style="background: var(--gray-900); border-radius: 16px; border: 1px solid rgba(255, 255, 255, 0.08); padding: 24px;">
                    <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 16px;">
                        <div>
                            <h4 style="margin: 0 0 8px; font-size: 18px;">${meeting.topic}</h4>
                            <p style="margin: 0; color: var(--text-muted); font-size: 14px;">ID: ${meeting.id}</p>
                        </div>
                        <span style="background: rgba(45, 140, 255, 0.1); color: #2D8CFF; padding: 4px 12px; border-radius: 999px; font-size: 12px;">
                            ${meeting.type === 2 ? 'Scheduled' : 'Recurring'}
                        </span>
                    </div>
                    <div style="margin-bottom: 24px; color: var(--text-muted); font-size: 14px;">
                        <div style="margin-bottom: 8px;">📅 ${new Date(meeting.start_time).toLocaleDateString()}</div>
                        <div>⏰ ${new Date(meeting.start_time).toLocaleTimeString()} (${meeting.duration} mins)</div>
                    </div>
                    <a href="${meeting.join_url}" target="_blank" class="primary-btn" style="display: block; text-align: center; background: #2D8CFF; color: white; text-decoration: none; padding: 12px; border-radius: 8px; font-weight: 600;">
                        Join Meeting
                    </a>
                </div>
            `).join('')}
            <div id="recordingsSection" style="grid-column: 1/-1; margin-top: 32px;"></div>
        `;
    }
}

async function loadRecordings() {
    try {
        const response = await fetch('/api/zoom/recordings', {
            headers: { 'Authorization': `Bearer ${localStorage.getItem('mindwave_token')}` }
        });
        const data = await response.json();

        const section = document.getElementById('recordingsSection');
        if (section && data.recordings && data.recordings.length > 0) {
            section.innerHTML = `
                <h3 style="margin-bottom: 16px;">Recent Recordings</h3>
                <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 24px;">
                    ${data.recordings.map(rec => `
                        <div style="background: rgba(255,255,255,0.02); border-radius: 12px; padding: 16px; border: 1px solid rgba(255,255,255,0.05);">
                            <h4 style="margin: 0 0 8px; font-size: 16px;">${rec.topic}</h4>
                            <p style="color: var(--text-muted); font-size: 13px; margin-bottom: 12px;">${new Date(rec.start_time).toLocaleDateString()}</p>
                            <a href="${rec.share_url}" target="_blank" style="color: #2D8CFF; text-decoration: none; font-size: 14px; font-weight: 500;">Watch Recording →</a>
                        </div>
                    `).join('')}
                </div>
            `;
        }
    } catch (error) {
        console.error('Error loading recordings:', error);
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
