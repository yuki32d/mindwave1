const gamesKey = 'games';
let categories = [];
let items = [];

function loadData(key) {
    try { return JSON.parse(localStorage.getItem(key) || '[]'); }
    catch { return []; }
}

function saveData(key, data) {
    localStorage.setItem(key, JSON.stringify(data));
}

function addCategory() {
    const input = document.getElementById('newCatInput');
    const val = input.value.trim();
    if (val && !categories.includes(val)) {
        categories.push(val);
        input.value = '';
        renderCategories();
        renderItemRows(); // Update dropdowns
    }
}

function removeCategory(cat) {
    categories = categories.filter(c => c !== cat);
    renderCategories();
    renderItemRows();
}

function renderCategories() {
    const container = document.getElementById('categoryList');
    container.innerHTML = categories.map(cat => `
        <div class="category-tag">
            ${cat}
            <span class="remove-cat" data-category="${cat}">×</span>
        </div>
    `).join('');
}

function addItemRow() {
    const container = document.getElementById('itemsContainer');
    const div = document.createElement('div');
    div.className = 'item-input-row';
    div.innerHTML = `
        <input type="text" class="item-name" placeholder="Item Name (e.g. MongoDB)" required>
        <select class="item-cat" required>
            <option value="" disabled selected>Select Category</option>
            ${categories.map(c => `<option value="${c}">${c}</option>`).join('')}
        </select>
        <button type="button" class="remove-item-btn" style="color: #ff375f; background: none; border: none; cursor: pointer;">Remove</button>
    `;
    container.appendChild(div);
}

function renderItemRows() {
    // Re-populate dropdowns for existing rows
    document.querySelectorAll('.item-cat').forEach(select => {
        const currentVal = select.value;
        select.innerHTML = `
            <option value="" disabled ${!currentVal ? 'selected' : ''}>Select Category</option>
            ${categories.map(c => `<option value="${c}" ${c === currentVal ? 'selected' : ''}>${c}</option>`).join('')}
        `;
    });
}

// Event listeners
document.getElementById('addCategoryBtn').addEventListener('click', addCategory);
document.getElementById('addItemBtn').addEventListener('click', addItemRow);
document.getElementById('cancelBtn').addEventListener('click', () => {
    window.location.href = 'admin.html';
});

// Event delegation for dynamically created elements
document.getElementById('categoryList').addEventListener('click', (e) => {
    if (e.target.classList.contains('remove-cat')) {
        const category = e.target.dataset.category;
        removeCategory(category);
    }
});

document.getElementById('itemsContainer').addEventListener('click', (e) => {
    if (e.target.classList.contains('remove-item-btn')) {
        e.target.parentElement.remove();
    }
});

// Add initial item row
addItemRow();

document.getElementById('sorterForm').addEventListener('submit', async (e) => {
    e.preventDefault();

    if (categories.length < 2) {
        alert('Please define at least 2 categories.');
        return;
    }

    const itemRows = document.querySelectorAll('.item-input-row');
    const gameItems = [];

    itemRows.forEach(row => {
        const name = row.querySelector('.item-name').value.trim();
        const cat = row.querySelector('.item-cat').value;
        if (name && cat) {
            gameItems.push({ name, category: cat });
        }
    });

    if (gameItems.length < 2) {
        alert('Please add at least 2 items to sort.');
        return;
    }

    const formData = new FormData(e.target);
    const gameData = {
        type: 'tech-sorter',
        title: formData.get('title'),
        duration: parseInt(formData.get('duration')),
        categories: categories,
        items: gameItems,
        totalPoints: gameItems.length * 10,
        status: 'active',
        published: true
    };

    try {
        const response = await fetch('/api/games', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(gameData)
        });

        if (response.ok) {
            alert('Sorter Game published successfully!');
            window.location.href = 'admin.html';
        } else {
            const error = await response.json();
            alert('Failed to publish game: ' + (error.message || 'Unknown error'));
        }
    } catch (err) {
        console.error('Error publishing game:', err);
        alert('Failed to publish game. Please check your connection.');
    }
});
