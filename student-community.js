// Student Community JavaScript

let currentPage = 1;
let currentSort = 'recent';
let currentTag = null;
let currentSearch = '';
let isLoading = false;
let hasMorePosts = true;

// DOM Elements
const postsContainer = document.getElementById('postsContainer');
const loadingSpinner = document.getElementById('loadingSpinner');
const createPostBtn = document.getElementById('createPostBtn');
const myPostsBtn = document.getElementById('myPostsBtn');
const createPostModal = document.getElementById('createPostModal');
const postDetailModal = document.getElementById('postDetailModal');
const closeModalBtn = document.getElementById('closeModalBtn');
const closeDetailModalBtn = document.getElementById('closeDetailModalBtn');
const cancelPostBtn = document.getElementById('cancelPostBtn');
const createPostForm = document.getElementById('createPostForm');
const postTypeSelect = document.getElementById('postType');
const mediaUploadGroup = document.getElementById('mediaUploadGroup');
const projectUrlGroup = document.getElementById('projectUrlGroup');
const searchInput = document.getElementById('searchInput');
const filterButtons = document.querySelectorAll('.filter-btn');
const loadMoreBtn = document.getElementById('loadMoreBtn');
const loadMoreContainer = document.getElementById('loadMoreContainer');
const trendingTagsContainer = document.getElementById('tagList');

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    loadPosts();
    loadTrendingTags();
    setupEventListeners();
});

// Event Listeners
function setupEventListeners() {
    createPostBtn.addEventListener('click', () => openCreatePostModal());
    closeModalBtn.addEventListener('click', () => closeCreatePostModal());
    closeDetailModalBtn.addEventListener('click', () => closePostDetailModal());
    cancelPostBtn.addEventListener('click', () => closeCreatePostModal());
    createPostForm.addEventListener('submit', handleCreatePost);

    postTypeSelect.addEventListener('change', (e) => {
        const type = e.target.value;
        mediaUploadGroup.style.display = (type === 'image' || type === 'video') ? 'block' : 'none';
        projectUrlGroup.style.display = type === 'project' ? 'block' : 'none';
    });

    filterButtons.forEach(btn => {
        btn.addEventListener('click', (e) => {
            filterButtons.forEach(b => b.classList.remove('active'));
            e.target.classList.add('active');
            currentSort = e.target.dataset.sort;
            currentPage = 1;
            hasMorePosts = true;
            loadPosts(true);
        });
    });

    searchInput.addEventListener('input', debounce((e) => {
        currentSearch = e.target.value;
        currentPage = 1;
        hasMorePosts = true;
        loadPosts(true);
    }, 500));

    loadMoreBtn.addEventListener('click', () => {
        currentPage++;
        loadPosts(false);
    });

    myPostsBtn.addEventListener('click', showMyPosts);

    // Close modals on outside click
    createPostModal.addEventListener('click', (e) => {
        if (e.target === createPostModal) closeCreatePostModal();
    });
    postDetailModal.addEventListener('click', (e) => {
        if (e.target === postDetailModal) closePostDetailModal();
    });
}

// Load Posts
async function loadPosts(reset = true) {
    if (isLoading) return;
    isLoading = true;

    if (reset) {
        postsContainer.innerHTML = '<div class="loading-spinner" id="loadingSpinner"><div class="spinner"></div><p>Loading posts...</p></div>';
    }

    try {
        const params = new URLSearchParams({
            sort: currentSort,
            page: currentPage,
            limit: 20
        });

        if (currentTag) params.append('tag', currentTag);
        if (currentSearch) params.append('search', currentSearch);

        const response = await fetch(`/api/community/posts?${params}`);
        const data = await response.json();

        if (data.ok) {
            if (reset) {
                postsContainer.innerHTML = '';
            } else {
                // Remove loading spinner if exists
                const spinner = document.getElementById('loadingSpinner');
                if (spinner) spinner.remove();
            }

            if (data.posts.length === 0 && reset) {
                postsContainer.innerHTML = `
                    <div class="empty-state">
                        <div class="empty-state-icon">📭</div>
                        <h3>No posts yet</h3>
                        <p>Be the first to share something with the community!</p>
                    </div>
                `;
                loadMoreContainer.style.display = 'none';
            } else {
                data.posts.forEach(post => renderPost(post));

                // Show/hide load more button
                hasMorePosts = data.pagination.page < data.pagination.pages;
                loadMoreContainer.style.display = hasMorePosts ? 'block' : 'none';
            }
        }
    } catch (error) {
        console.error('Error loading posts:', error);
        postsContainer.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">⚠️</div>
                <h3>Error loading posts</h3>
                <p>Please try again later.</p>
            </div>
        `;
    } finally {
        isLoading = false;
    }
}

// Render Post Card
function renderPost(post) {
    const postCard = document.createElement('div');
    postCard.className = `post-card ${post.isPinned ? 'pinned' : ''}`;
    postCard.dataset.postId = post._id;

    const authorInitial = post.author?.name?.charAt(0).toUpperCase() || 'U';
    const authorName = post.author?.name || 'Unknown User';
    const timeAgo = getTimeAgo(new Date(post.createdAt));

    let mediaHTML = '';
    if (post.mediaUrl) {
        if (post.postType === 'image') {
            mediaHTML = `<div class="post-media"><img src="${post.mediaUrl}" alt="${post.title}"></div>`;
        } else if (post.postType === 'video') {
            mediaHTML = `<div class="post-media"><video controls src="${post.mediaUrl}"></video></div>`;
        }
    }

    let tagsHTML = '';
    if (post.tags && post.tags.length > 0) {
        tagsHTML = `<div class="post-tags">${post.tags.map(tag => `<span class="post-tag">#${tag}</span>`).join('')}</div>`;
    }

    postCard.innerHTML = `
        ${post.isPinned ? '<div style="color: #ff9f0a; font-size: 12px; font-weight: 600; margin-bottom: 8px;">📌 PINNED POST</div>' : ''}
        <div class="post-header">
            <div class="post-avatar">${authorInitial}</div>
            <div class="post-author-info">
                <p class="post-author-name">${authorName}</p>
                <p class="post-timestamp">${timeAgo}</p>
            </div>
            <span class="post-type-badge ${post.postType}">${post.postType}</span>
        </div>
        <h3 class="post-title">${escapeHtml(post.title)}</h3>
        <p class="post-content">${escapeHtml(post.content)}</p>
        ${mediaHTML}
        ${tagsHTML}
        <div class="post-footer">
            <div class="post-action" onclick="toggleLike('${post._id}', event)">
                <span class="post-action-icon">❤️</span>
                <span class="like-count">${post.likeCount || 0}</span>
            </div>
            <div class="post-action">
                <span class="post-action-icon">💬</span>
                <span>${post.commentCount || 0}</span>
            </div>
            <div class="post-action">
                <span class="post-action-icon">👁️</span>
                <span>${post.viewCount || 0}</span>
            </div>
        </div>
    `;

    postCard.addEventListener('click', (e) => {
        // Don't open detail if clicking on action buttons
        if (!e.target.closest('.post-action')) {
            openPostDetail(post._id);
        }
    });

    postsContainer.appendChild(postCard);
}

// Toggle Like
async function toggleLike(postId, event) {
    event.stopPropagation();

    try {
        const response = await fetch(`/api/community/posts/${postId}/like`, {
            method: 'POST',
            credentials: 'include'
        });
        const data = await response.json();

        if (data.ok) {
            const postCard = document.querySelector(`[data-post-id="${postId}"]`);
            const likeCount = postCard.querySelector('.like-count');
            likeCount.textContent = data.likeCount;

            const likeAction = postCard.querySelector('.post-action');
            if (data.liked) {
                likeAction.classList.add('liked');
            } else {
                likeAction.classList.remove('liked');
            }
        }
    } catch (error) {
        console.error('Error toggling like:', error);
    }
}

// Open Post Detail
async function openPostDetail(postId) {
    try {
        // Increment view count
        fetch(`/api/community/posts/${postId}/view`, { method: 'POST' });

        const response = await fetch(`/api/community/posts/${postId}`);
        const data = await response.json();

        if (data.ok) {
            renderPostDetail(data.post, data.comments);
            postDetailModal.classList.add('active');
        }
    } catch (error) {
        console.error('Error loading post detail:', error);
    }
}

// Render Post Detail
function renderPostDetail(post, comments) {
    const authorInitial = post.author?.name?.charAt(0).toUpperCase() || 'U';
    const authorName = post.author?.name || 'Unknown User';
    const timeAgo = getTimeAgo(new Date(post.createdAt));

    let mediaHTML = '';
    if (post.mediaUrl) {
        if (post.postType === 'image') {
            mediaHTML = `<div class="post-media"><img src="${post.mediaUrl}" alt="${post.title}"></div>`;
        } else if (post.postType === 'video') {
            mediaHTML = `<div class="post-media"><video controls src="${post.mediaUrl}"></video></div>`;
        }
    }

    let tagsHTML = '';
    if (post.tags && post.tags.length > 0) {
        tagsHTML = `<div class="post-tags">${post.tags.map(tag => `<span class="post-tag">#${tag}</span>`).join('')}</div>`;
    }

    const detailContent = document.getElementById('postDetailContent');
    detailContent.innerHTML = `
        <div class="post-detail">
            <div class="post-header">
                <div class="post-avatar">${authorInitial}</div>
                <div class="post-author-info">
                    <p class="post-author-name">${authorName}</p>
                    <p class="post-timestamp">${timeAgo}</p>
                </div>
                <span class="post-type-badge ${post.postType}">${post.postType}</span>
            </div>
            <h2 class="post-title">${escapeHtml(post.title)}</h2>
            <div style="color: var(--text-muted); line-height: 1.6; white-space: pre-wrap;">${escapeHtml(post.content)}</div>
            ${mediaHTML}
            ${post.projectUrl ? `<p><strong>Project URL:</strong> <a href="${post.projectUrl}" target="_blank" style="color: #4da0ff;">${post.projectUrl}</a></p>` : ''}
            ${tagsHTML}
            <div class="post-footer">
                <div class="post-action" onclick="toggleLike('${post._id}', event)">
                    <span class="post-action-icon">❤️</span>
                    <span class="like-count">${post.likeCount || 0}</span>
                </div>
                <div class="post-action">
                    <span class="post-action-icon">💬</span>
                    <span>${post.commentCount || 0}</span>
                </div>
                <div class="post-action">
                    <span class="post-action-icon">👁️</span>
                    <span>${post.viewCount || 0}</span>
                </div>
            </div>
        </div>
        <div class="comments-section">
            <h3>Comments (${comments.length})</h3>
            <div class="comment-form" style="margin: 16px 0;">
                <textarea id="newCommentText" placeholder="Write a comment..." style="width: 100%; padding: 12px; border-radius: 8px; background: rgba(255,255,255,0.05); border: 1px solid rgba(255,255,255,0.1); color: white; min-height: 80px;"></textarea>
                <button onclick="addComment('${post._id}')" class="primary-btn" style="margin-top: 8px;">Post Comment</button>
            </div>
            <div id="commentsList">
                ${comments.map(comment => renderComment(comment)).join('')}
            </div>
        </div>
    `;
}

// Render Comment
function renderComment(comment) {
    if (comment.isDeleted) return '';

    const authorInitial = comment.author?.name?.charAt(0).toUpperCase() || 'U';
    const authorName = comment.author?.name || 'Unknown User';
    const timeAgo = getTimeAgo(new Date(comment.createdAt));

    let repliesHTML = '';
    if (comment.replies && comment.replies.length > 0) {
        repliesHTML = `<div class="comment-replies">${comment.replies.map(reply => renderComment(reply)).join('')}</div>`;
    }

    return `
        <div class="comment-card">
            <div class="comment-header">
                <div class="comment-avatar">${authorInitial}</div>
                <span class="comment-author">${authorName}</span>
                <span class="comment-time">${timeAgo}</span>
            </div>
            <div class="comment-content">${escapeHtml(comment.content)}</div>
            <div class="comment-actions">
                <span class="comment-action" onclick="toggleCommentLike('${comment._id}')">❤️ ${comment.likeCount || 0}</span>
                <span class="comment-action" onclick="replyToComment('${comment._id}')">Reply</span>
            </div>
            ${repliesHTML}
        </div>
    `;
}

// Add Comment
async function addComment(postId) {
    const commentText = document.getElementById('newCommentText').value.trim();
    if (!commentText) return;

    try {
        const response = await fetch(`/api/community/posts/${postId}/comments`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            credentials: 'include',
            body: JSON.stringify({ content: commentText })
        });

        const data = await response.json();
        if (data.ok) {
            document.getElementById('newCommentText').value = '';
            openPostDetail(postId); // Refresh post detail
        }
    } catch (error) {
        console.error('Error adding comment:', error);
    }
}

// Toggle Comment Like
async function toggleCommentLike(commentId) {
    try {
        const response = await fetch(`/api/community/comments/${commentId}/like`, {
            method: 'POST',
            credentials: 'include'
        });
        const data = await response.json();
        if (data.ok) {
            // Refresh the current post detail
            const postId = document.querySelector('.post-detail').dataset.postId;
            if (postId) openPostDetail(postId);
        }
    } catch (error) {
        console.error('Error toggling comment like:', error);
    }
}

// Create Post
async function handleCreatePost(e) {
    e.preventDefault();

    const formData = new FormData();
    formData.append('title', document.getElementById('postTitle').value);
    formData.append('content', document.getElementById('postContent').value);
    formData.append('postType', document.getElementById('postType').value);
    formData.append('tags', document.getElementById('postTags').value);

    const projectUrl = document.getElementById('projectUrl').value;
    if (projectUrl) formData.append('projectUrl', projectUrl);

    const mediaFile = document.getElementById('mediaFile').files[0];
    if (mediaFile) formData.append('media', mediaFile);

    try {
        const response = await fetch('/api/community/posts', {
            method: 'POST',
            credentials: 'include',
            body: formData
        });

        const data = await response.json();
        if (data.ok) {
            closeCreatePostModal();
            createPostForm.reset();
            currentPage = 1;
            loadPosts(true);
        } else {
            alert(data.message || 'Error creating post');
        }
    } catch (error) {
        console.error('Error creating post:', error);
        alert('Error creating post. Please try again.');
    }
}

// Load Trending Tags
async function loadTrendingTags() {
    try {
        const response = await fetch('/api/community/tags/trending');
        const data = await response.json();

        if (data.ok && data.tags.length > 0) {
            trendingTagsContainer.innerHTML = data.tags.map(tag =>
                `<span class="tag-chip" onclick="filterByTag('${tag.tag}')">
                    #${tag.tag} <span class="count">(${tag.count})</span>
                </span>`
            ).join('');
        } else {
            trendingTagsContainer.innerHTML = '<p style="color: var(--text-muted); font-size: 13px;">No trending tags yet</p>';
        }
    } catch (error) {
        console.error('Error loading trending tags:', error);
    }
}

// Filter by Tag
function filterByTag(tag) {
    currentTag = tag;
    currentPage = 1;
    hasMorePosts = true;
    loadPosts(true);
}

// Show My Posts
async function showMyPosts() {
    try {
        const meResponse = await fetch('/api/me', { credentials: 'include' });
        const meData = await meResponse.json();

        if (meData.ok) {
            const response = await fetch(`/api/community/users/${meData.user._id}/posts`);
            const data = await response.json();

            if (data.ok) {
                postsContainer.innerHTML = '';
                if (data.posts.length === 0) {
                    postsContainer.innerHTML = `
                        <div class="empty-state">
                            <div class="empty-state-icon">📝</div>
                            <h3>No posts yet</h3>
                            <p>Create your first post to get started!</p>
                        </div>
                    `;
                } else {
                    data.posts.forEach(post => renderPost(post));
                }
                loadMoreContainer.style.display = 'none';
            }
        }
    } catch (error) {
        console.error('Error loading my posts:', error);
    }
}

// Modal Functions
function openCreatePostModal() {
    createPostModal.classList.add('active');
}

function closeCreatePostModal() {
    createPostModal.classList.remove('active');
}

function closePostDetailModal() {
    postDetailModal.classList.remove('active');
}

// Utility Functions
function getTimeAgo(date) {
    const seconds = Math.floor((new Date() - date) / 1000);

    const intervals = {
        year: 31536000,
        month: 2592000,
        week: 604800,
        day: 86400,
        hour: 3600,
        minute: 60
    };

    for (const [unit, secondsInUnit] of Object.entries(intervals)) {
        const interval = Math.floor(seconds / secondsInUnit);
        if (interval >= 1) {
            return `${interval} ${unit}${interval > 1 ? 's' : ''} ago`;
        }
    }

    return 'just now';
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Make functions globally available
window.toggleLike = toggleLike;
window.addComment = addComment;
window.toggleCommentLike = toggleCommentLike;
window.filterByTag = filterByTag;
