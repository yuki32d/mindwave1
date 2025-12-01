// Student Courses Page - Google Classroom Integration

let courses = [];
let selectedCourseId = null;

async function init() {
    await loadCourses();
}

async function loadCourses() {
    try {
        const response = await fetch('/api/classroom/courses', {
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('mindwave_token')}`
            }
        });

        const data = await response.json();

        if (!data.connected) {
            showConnectPrompt();
            return;
        }

        courses = data.courses || [];
        renderCourses();
    } catch (error) {
        console.error('Error loading courses:', error);
        showError('Failed to load courses');
    }
}

function showConnectPrompt() {
    const container = document.getElementById('panelGrid');
    container.innerHTML = `
        <div class="connect-prompt" style="text-align: center; padding: 60px 20px;">
            <div style="font-size: 64px; margin-bottom: 20px;">📚</div>
            <h2 style="margin-bottom: 12px;">Connect Google Classroom</h2>
            <p style="color: var(--text-muted); margin-bottom: 32px; max-width: 500px; margin-left: auto; margin-right: auto;">
                Link your Google Classroom account to view your courses, assignments, and materials directly in Mindwave.
            </p>
            <button id="connectBtn" class="primary-btn" style="background: #0f62fe; color: white; border: none; padding: 14px 28px; border-radius: 8px; font-weight: 600; cursor: pointer; font-size: 16px;">
                Connect Google Classroom
            </button>
        </div>
    `;

    // Attach event listener after rendering
    document.getElementById('connectBtn').addEventListener('click', connectGoogleClassroom);
}

function connectGoogleClassroom() {
    window.location.href = '/auth/google';
}

function renderCourses() {
    const container = document.getElementById('panelGrid');

    if (courses.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 60px 20px; color: var(--text-muted);">
                <div style="font-size: 48px; margin-bottom: 16px;">📭</div>
                <p>No active courses found in your Google Classroom.</p>
            </div>
        `;
        return;
    }

    container.innerHTML = courses.map(course => `
        <div class="course-card" data-course-id="${course.id}" style="cursor: pointer; transition: transform 0.2s;">
            <div class="course-header" style="padding: 24px; border-bottom: 1px solid rgba(255,255,255,0.08);">
                <h3 style="margin: 0 0 8px; font-size: 20px;">${course.name}</h3>
                <p style="margin: 0; color: var(--text-muted); font-size: 14px;">${course.section || 'No section'}</p>
                ${course.descriptionHeading ? `<p style="margin: 8px 0 0; font-size: 14px;">${course.descriptionHeading}</p>` : ''}
            </div>
            <div class="course-footer" style="padding: 16px 24px; display: flex; justify-content: space-between; align-items: center;">
                <span style="font-size: 13px; color: var(--text-muted);">
                    ${course.courseState === 'ACTIVE' ? '🟢 Active' : '⚪ Inactive'}
                </span>
                <a href="${course.alternateLink}" target="_blank" class="classroom-link" style="color: #0f62fe; text-decoration: none; font-size: 13px; font-weight: 500;">
                    Open in Classroom →
                </a>
            </div>
        </div>
    `).join('');

    // Attach event listeners to course cards
    document.querySelectorAll('.course-card').forEach(card => {
        card.addEventListener('click', (e) => {
            // Don't trigger if clicking the external link
            if (e.target.closest('.classroom-link')) return;
            const courseId = card.dataset.courseId;
            selectCourse(courseId);
        });
    });
}

async function selectCourse(courseId) {
    selectedCourseId = courseId;
    const course = courses.find(c => c.id === courseId);

    // Show course details modal
    showCourseDetails(course);
}

async function showCourseDetails(course) {
    const modal = document.createElement('div');
    modal.className = 'course-modal';
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
        <div style="background: #1c1f26; border-radius: 16px; max-width: 900px; width: 100%; max-height: 90vh; overflow-y: auto; position: relative;">
            <div style="padding: 32px; border-bottom: 1px solid rgba(255,255,255,0.08); position: sticky; top: 0; background: #1c1f26; z-index: 1;">
                <button id="closeModalBtn" style="position: absolute; top: 24px; right: 24px; background: none; border: none; color: white; font-size: 24px; cursor: pointer; padding: 8px;">×</button>
                <h2 style="margin: 0 0 8px;">${course.name}</h2>
                <p style="margin: 0; color: var(--text-muted);">${course.section || 'No section'}</p>
            </div>
            <div id="courseDetailsContent" style="padding: 32px;">
                <div style="text-align: center; padding: 40px; color: var(--text-muted);">
                    Loading course details...
                </div>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    // Attach close button event listener
    document.getElementById('closeModalBtn').addEventListener('click', () => modal.remove());

    // Close on background click
    modal.addEventListener('click', (e) => {
        if (e.target === modal) modal.remove();
    });

    // Load coursework and materials
    await loadCourseDetails(course.id);
}

async function loadCourseDetails(courseId) {
    const content = document.getElementById('courseDetailsContent');

    try {
        // Fetch coursework and materials in parallel
        const [courseworkRes, materialsRes] = await Promise.all([
            fetch(`/api/classroom/coursework/${courseId}`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('mindwave_token')}` }
            }),
            fetch(`/api/classroom/materials/${courseId}`, {
                headers: { 'Authorization': `Bearer ${localStorage.getItem('mindwave_token')}` }
            })
        ]);

        const courseworkData = await courseworkRes.json();
        const materialsData = await materialsRes.json();

        const coursework = courseworkData.coursework || [];
        const materials = materialsData.materials || [];

        content.innerHTML = `
            <div style="display: grid; gap: 32px;">
                <div>
                    <h3 style="margin: 0 0 16px; font-size: 18px;">📝 Assignments (${coursework.length})</h3>
                    ${coursework.length > 0 ? `
                        <div style="display: grid; gap: 12px;">
                            ${coursework.map(work => `
                                <div style="padding: 16px; background: rgba(255,255,255,0.04); border-radius: 12px; border: 1px solid rgba(255,255,255,0.08);">
                                    <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 8px;">
                                        <h4 style="margin: 0; font-size: 16px;">${work.title}</h4>
                                        ${work.dueDate ? `<span style="font-size: 13px; color: #ff9500; background: rgba(255,149,0,0.1); padding: 4px 12px; border-radius: 999px;">Due: ${formatDate(work.dueDate)}</span>` : ''}
                                    </div>
                                    ${work.description ? `<p style="margin: 8px 0 0; color: var(--text-muted); font-size: 14px;">${work.description}</p>` : ''}
                                    ${work.alternateLink ? `<a href="${work.alternateLink}" target="_blank" style="display: inline-block; margin-top: 12px; color: #0f62fe; text-decoration: none; font-size: 13px; font-weight: 500;">View Assignment →</a>` : ''}
                                </div>
                            `).join('')}
                        </div>
                    ` : '<p style="color: var(--text-muted); font-size: 14px;">No assignments yet</p>'}
                </div>

                <div>
                    <h3 style="margin: 0 0 16px; font-size: 18px;">📚 Materials (${materials.length})</h3>
                    ${materials.length > 0 ? `
                        <div style="display: grid; gap: 12px;">
                            ${materials.map(material => `
                                <div style="padding: 16px; background: rgba(255,255,255,0.04); border-radius: 12px; border: 1px solid rgba(255,255,255,0.08);">
                                    <h4 style="margin: 0 0 8px; font-size: 16px;">${material.title}</h4>
                                    ${material.description ? `<p style="margin: 0; color: var(--text-muted); font-size: 14px;">${material.description}</p>` : ''}
                                    ${material.alternateLink ? `<a href="${material.alternateLink}" target="_blank" style="display: inline-block; margin-top: 12px; color: #0f62fe; text-decoration: none; font-size: 13px; font-weight: 500;">View Material →</a>` : ''}
                                </div>
                            `).join('')}
                        </div>
                    ` : '<p style="color: var(--text-muted); font-size: 14px;">No materials yet</p>'}
                </div>
            </div>
        `;
    } catch (error) {
        console.error('Error loading course details:', error);
        content.innerHTML = `
            <div style="text-align: center; padding: 40px; color: #ff3b30;">
                <p>Failed to load course details</p>
            </div>
        `;
    }
}

function formatDate(dateObj) {
    if (!dateObj) return '';
    const { year, month, day } = dateObj;
    return `${month}/${day}/${year}`;
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

// Initialize on page load
init();
