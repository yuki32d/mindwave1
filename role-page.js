const PAGE_CONTENT = {
    student: {
        dashboard: {
            title: 'Student Dashboard',
            subtitle: 'Track your streaks, upcoming commitments, and focus areas across every classroom experience.',
            cards: [
                { tag: 'Today', title: 'Focus Playlist', body: 'Finish the logic puzzle drop, respond to 2 community prompts, and log your reflection.' },
                { tag: 'Progress', title: 'Momentum Score', body: '87% completion this sprint. Keep the streak alive with one more activity today.' },
                { tag: 'Community', title: 'Squad Pulse', body: 'Studio Nova is collaborating on the Telegram bot challenge at 5 PM.' }
            ]
        },
        courses: {
            title: 'Courses & Paths',
            subtitle: 'Jump into the next lesson, review unlocked resources, or replay a previous sprint.',
            cards: [
                { tag: 'Active', title: 'Frontend Bootcamp', body: 'Lesson 6 unlocked: layout grids and component libraries.' },
                { tag: 'Upcoming', title: 'Automation Studio', body: 'Starts Monday. Prep checklist is available now.' },
                { tag: 'On Deck', title: 'Design Ops Lab', body: 'Waitlisted. Faculty will confirm spots this Friday.' }
            ]
        },
        community: {
            title: 'Community Lounge',
            subtitle: 'Stay connected with peers, swap resources, and celebrate creative wins.',
            cards: [
                { tag: 'Now', title: 'AMA with Alex', body: 'Bring your toughest Supabase questions. Starts in 40 minutes.' },
                { tag: 'Clubs', title: 'Makers Circle', body: 'Share a prototype or ask for async critique every Thursday.' },
                { tag: 'Shoutouts', title: 'Wall of Wins', body: 'Add your highlight to keep the momentum for everyone.' }
            ]
        },
        audience: {
            title: 'Audience Insights',
            subtitle: 'Understand how your contributions resonate across the Mindwave network.',
            cards: [
                { tag: 'Reach', title: 'Peer Mentions', body: '5 teammates referenced your quiz answers this week.' },
                { tag: 'Feedback', title: 'Warm Signals', body: '9 emoji reactions on your strategy post.' },
                { tag: 'Opportunities', title: 'Collab Invites', body: 'Two faculties invited you to join pilot cohorts.' },
            ],
            subtitle: 'Resources curated for quick troubleshooting and human support.',
            cards: [
                { tag: 'Guides', title: 'How to submit a game score', body: 'Step-by-step walkthroughs and short videos.' },
                { tag: 'Support', title: 'Live Cohort Lead', body: 'Ping the #support channel for a 15-minute check-in.' },
                { tag: 'Status', title: 'Systems Health', body: 'All services operational. No incidents reported.' }
            ]
        },
        settings: {
            title: 'Student Settings',
            subtitle: 'Manage identity, devices, and integrations tied to your account.',
            cards: [
                { tag: 'Profile', title: 'Identity Kit', body: 'Avatar, bio, and preferred pronouns updated last week.' },
                { tag: 'Security', title: 'Passkey', body: 'Multi-factor authentication enabled.' },
                { tag: 'Integrations', title: 'Connected Apps', body: 'Notion, Google Drive, and Figma linked.' }
            ]
        }
    },
    faculty: {
        dashboard: {
            title: 'Faculty Command Center',
            subtitle: 'Monitor learner energy, schedule drops, and jump into conversations when needed.',
            cards: [
                { tag: 'Health', title: 'Engagement Pulse', body: 'Cohort Beta dipped 6% yesterday. Nudge queued.' },
                { tag: 'Pipeline', title: 'Content Calendar', body: 'Next game release draft due tomorrow.' },
                { tag: 'Mentorship', title: '1:1 Queue', body: 'Three students waiting for async feedback.' }
            ]
        },
        courses: {
            title: 'Course Architecture',
            subtitle: 'Design new experiences, adjust pacing, and publish supporting artifacts.',
            cards: [
                { tag: 'Active', title: 'AI Coding Sprint', body: 'Module 3 draft ready for peer review.' },
                { tag: 'Iteration', title: 'Feedback Loop', body: 'Students requested more live debugging demos.' },
                { tag: 'Assets', title: 'Resource Vault', body: 'Add two Loom walkthroughs before Thursday.' }
            ]
        },
        community: {
            title: 'Community Stewardship',
            subtitle: 'Host rituals, moderate channels, and surface student highlights.',
            cards: [
                { tag: 'Events', title: 'Town Hall Kit', body: 'Slides prepped. Schedule AMA follow-up thread.' },
                { tag: 'Moderation', title: 'Flagged Posts', body: 'Review two items in Community Hub.' },
                { tag: 'Spotlights', title: 'Brag Board', body: 'Nominate projects for Friday showcase.' }
            ]
        },
        audience: {
            title: 'Audience Intelligence',
            subtitle: 'Understand where students engage, lurk, or request additional support.',
            cards: [
                { tag: 'Signals', title: 'Heatmap', body: 'Quiz Battle retains 92% of viewers.' },
                { tag: 'Segments', title: 'Cohort Personas', body: 'Upload new research notes to the strategy vault.' },
                { tag: 'Opportunities', title: 'Partnerships', body: 'Two partner schools asked for pilot seats.' }
            ]
        },
        setup: {
            title: 'Operational Setup',
            subtitle: 'Configure workflows, automation, and staff permissions.',
            cards: [
                { tag: 'Automation', title: 'Workflow Recipes', body: 'Reminder bot now pings silent cohorts after 36h.' },
                { tag: 'Team', title: 'Role Matrix', body: 'Add Maya as co-owner on Courses.' },
                { tag: 'Compliance', title: 'Audit Trail', body: 'Export logs scheduled nightly.' }
            ]
        },
        help: {
            title: 'Faculty Support',
            subtitle: 'Direct line to the ClassroomIO success team and facilitator guides.',
            cards: [
                { tag: 'Guides', title: 'Launch Playbook', body: 'Templates for announcements, games, and retro emails.' },
                { tag: 'Support', title: 'Success Partner', body: 'Book a 30-minute strategy review.' },
                { tag: 'Status', title: 'Incident Desk', body: 'Subscribe to alerts for enterprise tenants.' }
            ]
        },
        settings: {
            title: 'Faculty Settings',
            subtitle: 'Secure admin tools, manage integrations, and review permissions.',
            cards: [
                { tag: 'Security', title: 'Admin MFA', body: 'Hardware keys enforced for all faculty accounts.' },
                { tag: 'Integrations', title: 'Data Bridge', body: 'Syncing nightly with SIS + Slack.' },
                { tag: 'Branding', title: 'Theme Controls', body: 'Upload new logo pack for Spring term.' }
            ]
        }
    }
};

async function hydrateRolePage() {
    const body = document.body;
    if (!body) return;
    const role = body.dataset.role || 'student';
    const section = body.dataset.section || 'dashboard';
    const heroEyebrow = document.getElementById('heroEyebrow');
    const pageTitle = document.getElementById('pageTitle');
    const pageSubtitle = document.getElementById('pageSubtitle');
    const panelGrid = document.getElementById('panelGrid');

    const API_BASE = window.location.protocol === 'file:' ? 'http://localhost:8081' : '';

    let config =
        (PAGE_CONTENT[role] && PAGE_CONTENT[role][section]) ||
        {
            title: 'Mindwave Space',
            subtitle: 'Content coming soon.',
            cards: [{ tag: 'Info', title: 'Placeholder', body: 'This section is under construction.' }]
        };

    if (section === 'courses') {
        try {
            const res = await fetch(`${API_BASE}/api/subjects`);
            const data = await res.json();

            if (data.ok && data.subjects.length > 0) {
                config.cards = data.subjects.map(s => ({
                    tag: s.code,
                    title: `${s.icon || '📚'} ${s.name}`,
                    body: s.description || 'No description available.',
                    id: s._id
                }));
            } else {
                config.cards = [{ tag: 'Empty', title: 'No Subjects Found', body: 'No subjects have been added yet.' }];
            }
        } catch (e) {
            console.error("Failed to fetch subjects", e);
            config.cards = [{
                tag: 'Error',
                title: 'Connection Failed',
                body: 'Could not connect to the server. Ensure <code>node server.js</code> is running.'
            }];
        }
    }

    if (heroEyebrow) {
        heroEyebrow.textContent = `${role === 'faculty' ? 'Faculty' : 'Student'} Space`;
    }
    if (pageTitle) pageTitle.textContent = config.title;
    if (pageSubtitle) pageSubtitle.textContent = config.subtitle;

    const renderCards = (cards) => {
        if (!panelGrid) return;
        panelGrid.innerHTML = cards.map(
            (card) => `
            <article class="panel-card">
                <div class="panel-tag">${card.tag || 'Update'}</div>
                <h2>${card.title || 'Item'}</h2>
                <p>${card.body || ''}</p>
                ${(role === 'faculty' || role === 'admin') && card.id ? `
                <div class="panel-actions" style="margin-top: 16px;">
                    <a href="faculty-subject-manage.html?id=${card.id}" class="ghost-link" style="font-size: 13px; padding: 6px 12px; cursor: pointer; text-decoration: none;">Manage Subject →</a>
                </div>` : ''}
                ${(role === 'student') && card.id ? `
                <div class="panel-actions" style="margin-top: 16px;">
                    <button onclick="viewMaterials('${card.id}', '${card.title.replace(/'/g, "\\'")}')" class="ghost-link" style="font-size: 13px; padding: 6px 12px; cursor: pointer;">View Materials</button>
                </div>` : ''}
            </article>
        `
        ).join('');
    };

    renderCards(config.cards);

    // Student View Logic
    if (role === 'student') {
        window.viewMaterials = async (subjectId, subjectName) => {
            try {
                const res = await fetch(`${API_BASE}/api/materials/${subjectId}`);
                const data = await res.json();

                if (data.ok) {
                    const materials = data.materials;
                    const backBtn = `<button onclick="location.reload()" class="ghost-link" style="margin-bottom: 20px;">← Back to Subjects</button>`;
                    const header = `<h2>${subjectName} - Materials</h2>`;

                    if (materials.length === 0) {
                        panelGrid.innerHTML = `${backBtn}${header}<p>No materials uploaded yet.</p>`;
                        return;
                    }

                    const listHtml = materials.map(m => {
                        let fileUrl = m.fileUrl;
                        if (window.location.protocol === 'file:') {
                            fileUrl = `${API_BASE}${m.fileUrl}`;
                        }
                        return `
                        <div class="panel-card" style="margin-bottom: 16px; display: flex; justify-content: space-between; align-items: center;">
                            <div>
                                <div class="panel-tag">${m.type}</div>
                                <h3 style="margin: 0;">${m.title}</h3>
                                <small style="color: var(--text-muted);">Uploaded ${new Date(m.createdAt).toLocaleDateString()}</small>
                            </div>
                            <a href="${fileUrl}" target="_blank" class="ghost-link" download>Download</a>
                        </div>
                    `;
                    }).join('');

                    panelGrid.innerHTML = `${backBtn}${header}<div style="display: flex; flex-direction: column;">${listHtml}</div>`;
                } else {
                    alert('Failed to load materials.');
                }
            } catch (e) {
                console.error(e);
                alert('Connection error.');
            }
        };
    }
}

hydrateRolePage();