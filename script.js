const API_URL = 'http://127.0.0.1:3001/api';

// State
let files = [];
let currentIndex = 0;
let trashList = [];
let keepList = [];

// DOM Elements
const screenSetup = document.getElementById('screen-setup');
const screenSwiping = document.getElementById('screen-swiping');
const screenSummary = document.getElementById('screen-summary');
const screenCredits = document.getElementById('screen-credits');
const btnScan = document.getElementById('btn-scan');
const btnBrowse = document.getElementById('btn-browse');
const btnEndSession = document.getElementById('btn-end-session');
const btnCredits = document.getElementById('btn-credits');
const btnCloseCredits = document.getElementById('btn-close-credits');

const dirInput = document.getElementById('dir-input');
const setupLoader = document.getElementById('setup-loader');
const setupError = document.getElementById('setup-error');
const deck = document.getElementById('deck');
const counter = document.getElementById('counter');

const btnKeep = document.getElementById('btn-keep');
const btnTrash = document.getElementById('btn-trash');

const statKept = document.getElementById('stat-kept');
const statTrashed = document.getElementById('stat-trashed');
const statStorage = document.getElementById('stat-storage');
const trashListEl = document.getElementById('trash-list');
const btnConfirmDelete = document.getElementById('btn-confirm-delete');
const btnCancel = document.getElementById('btn-cancel');

// Formatting
function formatSize(bytes) {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Staggered entry animation
function animateIn(container, selector = ':scope > *', baseDelay = 80) {
    const children = container.querySelectorAll(selector);
    children.forEach((el, i) => {
        el.style.opacity = '0';
        el.style.transform = 'translateY(16px)';
        el.style.filter = 'blur(4px)';
        el.style.transition = 'none';
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                el.style.transition = `opacity 700ms cubic-bezier(0.32, 0.72, 0, 1) ${i * baseDelay}ms,
                                       transform 700ms cubic-bezier(0.32, 0.72, 0, 1) ${i * baseDelay}ms,
                                       filter 700ms cubic-bezier(0.32, 0.72, 0, 1) ${i * baseDelay}ms`;
                el.style.opacity = '1';
                el.style.transform = 'translateY(0)';
                el.style.filter = 'blur(0)';
            });
        });
    });
}

function showScreen(screen) {
    document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
    screen.classList.add('active');

    if (screen === screenSwiping) {
        btnEndSession.style.display = 'flex';
    } else {
        btnEndSession.style.display = 'none';
    }

    // Staggered entry animations
    const inner = screen.querySelector('.glass-panel-inner');
    if (inner) {
        animateIn(inner, ':scope > *', 60);
    } else if (screen === screenSwiping) {
        const sidebar = screen.querySelector('.controls-sidebar');
        if (sidebar) {
            animateIn(sidebar, ':scope > *', 100);
        }
    }
}

// Initial load animation
document.addEventListener('DOMContentLoaded', () => {
    const setupInner = document.getElementById('setup-inner');
    if (setupInner) {
        setupInner.style.opacity = '1';
        animateIn(setupInner, ':scope > *', 100);
    }
});

// 1. Setup & Scan
btnBrowse.addEventListener('click', async () => {
    if (window.pywebview && window.pywebview.api) {
        const path = await window.pywebview.api.select_folder();
        if (path) {
            dirInput.value = path;
        }
    } else {
        alert("Desktop API not ready or unavailable.");
    }
});

btnScan.addEventListener('click', async () => {
    const path = dirInput.value.trim();

    const filters = {
        images: document.getElementById('chk-images').checked,
        videos: document.getElementById('chk-videos').checked,
        audio: document.getElementById('chk-audio').checked,
        documents: document.getElementById('chk-documents').checked,
        folders: document.getElementById('chk-folders').checked,
        others: document.getElementById('chk-others').checked
    };

    if (!path) {
        setupError.textContent = 'Please select a directory path first';
        setupError.style.display = 'block';
        return;
    }

    btnScan.disabled = true;
    setupLoader.style.display = 'block';
    setupError.style.display = 'none';

    try {
        const res = await fetch(`${API_URL}/scan`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ path, filters })
        });

        const data = await res.json();

        if (data.error) throw new Error(data.error);
        if (!data.files || data.files.length === 0) {
            throw new Error('No files found matching criteria in this directory.');
        }

        files = data.files;
        currentIndex = 0;
        trashList = [];
        keepList = [];

        await renderDeck();
        showScreen(screenSwiping);

    } catch (err) {
        setupError.textContent = err.message;
        setupError.style.display = 'block';
    } finally {
        btnScan.disabled = false;
        setupLoader.style.display = 'none';
        btnScan.innerHTML = '<span>Scan Directory</span><span class="btn-icon-circle"><i class="ph-light ph-magnifying-glass"></i></span>';
    }
});

btnEndSession.addEventListener('click', () => {
    finishSession();
});

btnCredits.addEventListener('click', () => {
    showScreen(screenCredits);
    btnEndSession.style.display = 'none';
});

btnCloseCredits.addEventListener('click', () => {
    if (files.length > 0 && currentIndex < files.length) {
        showScreen(screenSwiping);
        btnEndSession.style.display = 'flex';
    } else {
        showScreen(screenSetup);
    }
});

// 2. Deck Management
async function renderDeck() {
    deck.innerHTML = '';

    const cardsToRender = files.slice(currentIndex, currentIndex + 3).reverse();

    for (let i = 0; i < cardsToRender.length; i++) {
        const file = cardsToRender[i];
        const card = await createCard(file);
        const actualIndex = currentIndex + (cardsToRender.length - 1 - i);
        card.dataset.index = actualIndex;

        const offset = cardsToRender.length - 1 - i;
        if (offset > 0) {
            card.style.transform = `scale(${1 - (offset * 0.05)}) translateY(${offset * 20}px)`;
            card.style.zIndex = 5 - offset;
        } else {
            card.style.zIndex = 10;
            makeDraggable(card);
        }

        deck.appendChild(card);
    }

    updateCounter();

    if (currentIndex >= files.length) {
        finishSession();
    }
}

function updateCounter() {
    counter.textContent = `${Math.min(currentIndex + 1, files.length)} / ${files.length}`;
}

async function generateMediaHtml(file) {
    if (file.type === 'folder') {
        let previewHtml = '';
        if (file.preview_files && file.preview_files.length > 0) {
            previewHtml = '<ul class="folder-preview-list">';
            file.preview_files.forEach(f => {
                previewHtml += `<li><i class="ph-light ph-file" style="font-size:0.85rem"></i> ${f}</li>`;
            });
            previewHtml += '</ul>';
        }

        return `
            <div class="audio-wrap" style="width: 100%;">
                <i class="ph-light ph-folder" style="font-size: 5rem; color: #fbbf24; display: block;"></i>
                <h2 style="margin-top: 1rem; color: var(--text-main); font-weight: 700; letter-spacing: -0.01em;">${file.name}</h2>
                <p style="color: var(--text-muted); font-size: 0.95rem; margin-top: 0.5rem;">${file.summary}</p>
                ${previewHtml}
            </div>
        `;
    }

    const mediaUrl = `${API_URL}/media?path=${encodeURIComponent(file.path)}`;

    if (file.type === 'image') {
        return `<img src="${mediaUrl}" alt="${file.name}" draggable="false">`;
    }
    if (file.type === 'video') {
        return `<video src="${mediaUrl}" controls autoplay muted loop playsinline></video>`;
    }
    if (file.type === 'audio') {
        return `
            <div class="audio-wrap">
                <i class="ph-light ph-music-note"></i>
                <audio src="${mediaUrl}" controls style="width: 100%"></audio>
            </div>
        `;
    }
    if (file.type === 'document' && file.mime && !file.mime.includes('pdf')) {
        try {
            const res = await fetch(`${API_URL}/text?path=${encodeURIComponent(file.path)}`);
            const data = await res.json();
            const safeContent = (data.content || '').replace(/</g, "&lt;").replace(/>/g, "&gt;");
            return `
                <div class="text-preview">${safeContent || '<i>Empty File / Binary unreadable</i>'}</div>
            `;
        } catch (e) {
            console.error(e);
        }
    }

    return `
        <div class="audio-wrap">
            <i class="ph-light ph-file file-icon"></i>
        </div>
    `;
}

async function createCard(file) {
    const card = document.createElement('div');
    card.className = 'card';

    const mediaHtml = await generateMediaHtml(file);
    const displaySize = file.type === 'folder' ? 'DIR' : formatSize(file.size);

    card.innerHTML = `
        <div class="stamp stamp-keep">KEEP</div>
        <div class="stamp stamp-trash">TRASH</div>

        <div class="card-inner">
            <div class="card-media">
                ${mediaHtml}
            </div>

            <div class="card-info">
                <div style="display: flex; justify-content: space-between; align-items:flex-start;">
                    <div class="type-badge">${file.type}</div>
                    <button class="btn-open-location" title="Open file location in Explorer">
                        <i class="ph-light ph-arrow-square-out"></i> Show
                    </button>
                </div>

                <h3>${file.name}</h3>
                <div class="size">${displaySize}</div>
                <div class="path">${file.path}</div>
            </div>
        </div>
    `;

    const btnOpen = card.querySelector('.btn-open-location');
    if (btnOpen) {
        btnOpen.addEventListener('mousedown', e => e.stopPropagation());
        btnOpen.addEventListener('touchstart', e => e.stopPropagation());
        btnOpen.addEventListener('click', (e) => {
            e.stopPropagation();
            if (window.pywebview && window.pywebview.api) {
                window.pywebview.api.open_file_location(file.path);
            }
        });
    }

    return card;
}

// 3. Swipe Logic
function makeDraggable(card) {
    let isDragging = false;
    let startX = 0, startY = 0;

    const interactiveTags = ['AUDIO', 'VIDEO', 'INPUT', 'BUTTON', 'A'];

    const keepStamp = card.querySelector('.stamp-keep');
    const trashStamp = card.querySelector('.stamp-trash');

    const onTouchStart = (e) => {
        if (interactiveTags.includes(e.target.tagName)) return;

        isDragging = true;
        startX = e.type.includes('mouse') ? e.clientX : e.touches[0].clientX;
        startY = e.type.includes('mouse') ? e.clientY : e.touches[0].clientY;
        card.style.transition = 'none';
        document.body.style.cursor = 'grabbing';
    };

    const onTouchMove = (e) => {
        if (!isDragging) return;
        e.preventDefault();
        const x = e.type.includes('mouse') ? e.clientX : e.touches[0].clientX;
        const y = e.type.includes('mouse') ? e.clientY : e.touches[0].clientY;

        const deltaX = x - startX;
        const deltaY = y - startY;
        const rotate = deltaX * 0.03;

        card.style.setProperty('--x', `${deltaX}px`);
        card.style.setProperty('--y', `${deltaY}px`);
        card.style.setProperty('--r', `${rotate}deg`);

        if (deltaX > 50) {
            keepStamp.style.opacity = Math.min(deltaX / 150, 1);
            trashStamp.style.opacity = 0;
            card.style.borderColor = `rgba(52, 211, 153, ${Math.min(deltaX / 150, 1)})`;
        } else if (deltaX < -50) {
            trashStamp.style.opacity = Math.min(Math.abs(deltaX) / 150, 1);
            keepStamp.style.opacity = 0;
            card.style.borderColor = `rgba(248, 113, 113, ${Math.min(Math.abs(deltaX) / 150, 1)})`;
        } else {
            keepStamp.style.opacity = 0;
            trashStamp.style.opacity = 0;
            card.style.borderColor = 'var(--glass-border)';
        }
    };

    const onTouchEnd = (e) => {
        if (!isDragging) return;
        isDragging = false;
        document.body.style.cursor = 'default';

        const currentX = parseFloat(card.style.getPropertyValue('--x') || 0);
        const threshold = window.innerWidth * 0.15;

        card.classList.add('animate');

        if (currentX > threshold) {
            swipe('right', card);
        } else if (currentX < -threshold) {
            swipe('left', card);
        } else {
            card.style.setProperty('--x', '0px');
            card.style.setProperty('--y', '0px');
            card.style.setProperty('--r', '0deg');
            card.style.borderColor = 'var(--glass-border)';
            keepStamp.style.opacity = 0;
            trashStamp.style.opacity = 0;

            setTimeout(() => {
                card.classList.remove('animate');
            }, 400);
        }
    };

    card.addEventListener('mousedown', onTouchStart);
    window.addEventListener('mousemove', onTouchMove, { passive: false });
    window.addEventListener('mouseup', onTouchEnd);

    card.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('touchmove', onTouchMove, { passive: false });
    window.addEventListener('touchend', onTouchEnd);
}

function swipe(direction, cardObj = null) {
    const card = cardObj || deck.lastElementChild;
    if (!card) return;

    const isRight = direction === 'right';
    const moveOutWidth = window.innerWidth * 1.5;

    if (!card.classList.contains('animate')) {
        card.classList.add('animate');
    }

    card.style.setProperty('--x', isRight ? `${moveOutWidth}px` : `-${moveOutWidth}px`);
    card.style.setProperty('--y', '100px');
    card.style.setProperty('--r', isRight ? '45deg' : '-45deg');

    const file = files[currentIndex];
    if (!isRight) {
        trashList.push(file);
    } else {
        keepList.push(file);
    }

    currentIndex++;

    setTimeout(() => {
        renderDeck();
    }, 350);
}

// Controls
function handleControlClick(isRight, btn) {
    if (deck.children.length === 0) return;

    btn.style.transform = 'scale(0.85)';
    setTimeout(() => {
        btn.style.transform = '';
    }, 150);

    swipe(isRight ? 'right' : 'left');
}

btnKeep.addEventListener('click', () => handleControlClick(true, btnKeep));
btnTrash.addEventListener('click', () => handleControlClick(false, btnTrash));

// 4. Summary
function finishSession() {
    statKept.textContent = keepList.length + (files.length - currentIndex);
    statTrashed.textContent = trashList.length;

    let totalSaved = 0;
    trashList.forEach(f => { totalSaved += f.size || 0; });
    statStorage.textContent = formatSize(totalSaved);

    trashListEl.innerHTML = '';
    trashList.forEach(file => {
        const displaySize = file.type === 'folder' ? 'DIR' : formatSize(file.size);
        trashListEl.innerHTML += `
            <div class="file-item">
                <span class="name" title="${file.path}">${file.name}</span>
                <span class="size">${displaySize}</span>
            </div>
        `;
    });

    showScreen(screenSummary);
}

btnCancel.addEventListener('click', () => {
    files = [];
    currentIndex = 0;
    trashList = [];
    keepList = [];
    showScreen(screenSetup);
});

btnConfirmDelete.addEventListener('click', async () => {
    if (trashList.length === 0) {
        showScreen(screenSetup);
        return;
    }

    btnConfirmDelete.disabled = true;
    btnConfirmDelete.innerHTML = '<div class="spinner" style="width:18px;height:18px;border-width:2px;margin:0"></div> <span>Moving...</span>';

    const paths = trashList.map(f => f.path);

    try {
        const res = await fetch(`${API_URL}/cleanup`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ paths })
        });

        const data = await res.json();
        let errorMsg = data.errors.length > 0 ? "Failed on " + data.errors.length + " items." : "";
        alert("Successfully moved " + data.success + " items to the Recycle Bin. " + errorMsg);

        files = [];
        trashList = [];
        keepList = [];
        showScreen(screenSetup);

    } catch (err) {
        alert('Error: ' + err.message);
    } finally {
        btnConfirmDelete.disabled = false;
        btnConfirmDelete.innerHTML = '<span>Move to Recycle Bin</span><span class="btn-icon-circle"><i class="ph-light ph-trash"></i></span>';
    }
});
