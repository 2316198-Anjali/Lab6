const navTemplate = `
  <nav class="navbar">
    <ul>
        <li><a href="/index" data-page="index">Home</a></li>
        <li><a href="/" data-page="journal">Journal</a></li>
        <li><a href="/projects" data-page="projects">Projects</a></li>
        <li><a href="/about" data-page="about">About</a></li>
    </ul>
  </nav>
`;

function insertNavigation() {
    const header = document.querySelector('.header');
    if (header) {
        header.insertAdjacentHTML('afterend', navTemplate);
        setActiveNavItem();
    }
}
function setActiveNavItem() {
    const currentPage = getCurrentPage();
    const navLinks = document.querySelectorAll('.navbar a');

    navLinks.forEach(link => {
        link.classList.remove('active');
        if (link.getAttribute('data-page') === currentPage) {
            link.classList.add('active');
        }
    });
}
function getCurrentPage() {
    const path = window.location.pathname;

    const route = path.replace(/^\/|\/$/g, '');

    switch (route) {
        case '':
            return 'journal';  // Root path /
        case 'index':
            return 'index';
        case 'projects':
            return 'projects';
        case 'about':
            return 'about';
        default:
            return 'journal';
    }
}

let reflections = [];

function init() {
    getDate();
    submitted();
    initializeDateTime();
}

function getDate() {
    const d = new Date();
    let text = d.toDateString();
    const todayDateEl = document.getElementById("todayDate");
    if (todayDateEl) {
        todayDateEl.innerHTML = text;
    }
}

function initializeDateTime() {
    function updateDateTime() {
        const now = new Date();
        const dateTimeString = now.toLocaleDateString() + ' ' + now.toLocaleTimeString();
        const datetimeElement = document.getElementById('live-datetime');
        if (datetimeElement) {
            datetimeElement.textContent = dateTimeString;
        }
    }
    
    updateDateTime();
    setInterval(updateDateTime, 1000);
}

async function checkReflection(event) {
    if (event) {
        event.preventDefault();
    }

    const name = document.getElementById("fname").value.trim();
    const reflection = document.getElementById("reflection").value.trim();
    
    if (!name) {
        alert("Name is required.");
        return false;
    }
    
    if (!reflection || reflection.length < 10) {
        alert("Reflection must be at least 10 characters long.");
        return false;
    }
    
    // Get canvas image as data URL only if something is drawn
    let canvasImage = null;
    if (canvas && ctx) {
        const blank = document.createElement('canvas');
        blank.width = canvas.width;
        blank.height = canvas.height;
        const isBlank = canvas.toDataURL() === blank.toDataURL();
        if (!isBlank) {
            canvasImage = canvas.toDataURL('image/png');
        }
    }

    const entry = {
        id: Date.now().toString(),
        name,
        reflection,
        date: new Date().toDateString(),
        timestamp: new Date().toISOString(),
        synced: false,
        canvasImage: canvasImage
    };
    
    try {
        if (navigator.onLine) {
            const response = await fetch("/api/reflections", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    name: entry.name,
                    reflection: entry.reflection,
                    canvasImage: entry.canvasImage
                })
            });
            
            if (response.ok) {
                const serverReflection = await response.json();
                
                if (typeof offlineDB !== 'undefined') {
                    serverReflection.synced = true;
                    await offlineDB.saveReflection(serverReflection);
                }
                
                resetJournalForm();
                alert('Reflection submitted successfully!');
                await submitted();
            } else {
                throw new Error('Server error');
            }
        } else {
            if (typeof offlineDB !== 'undefined') {
                await offlineDB.saveReflection(entry);
                await offlineDB.addToSyncQueue('POST', entry);
                
                resetJournalForm();
                alert('Saved offline! Will sync when online.');
                await submitted();
            } else {
                alert('Cannot save offline. IndexedDB not available.');
            }
        }
    } catch (error) {
        console.error('Error saving reflection:', error);
        
        if (typeof offlineDB !== 'undefined') {
            try {
                await offlineDB.saveReflection(entry);
                await offlineDB.addToSyncQueue('POST', entry);
                
                resetJournalForm();
                alert('Saved offline! Will sync when online.');
                await submitted();
            } catch (dbError) {
                console.error('Failed to save offline:', dbError);
                alert('Failed to save reflection');
            }
        } else {
            alert('Failed to submit reflection. Please try again.');
        }
    }
    
    return false;
}

async function submitted() {
    const viewAllEl = document.getElementById("viewAll");
    if (!viewAllEl) {
        console.log('No viewAll element on this page');
        return;
    }
    
    let output = "";
    
    try {
        if (navigator.onLine) {
            const response = await fetch("/api/reflections");
            
            if (response.ok) {
                reflections = await response.json();
                
                if (typeof offlineDB !== 'undefined') {
                    for (const r of reflections) {
                        r.synced = true;
                        await offlineDB.saveReflection(r);
                    }
                }
            } else {
                throw new Error('Server error');
            }
        } else {
            if (typeof offlineDB !== 'undefined') {
                reflections = await offlineDB.getAllReflections();
                console.log('Loaded reflections from IndexedDB (offline)');
            } else {
                reflections = [];
            }
        }
        
        for (let r of reflections) {
            output += createReflectionHTML(r);
        }
        
        if (reflections.length === 0) {
            output = "<p style='color: #999; text-align: center;'>No reflections found.</p>";
        }
    } catch (error) {
        console.error('Error fetching reflections:', error);
        
        if (typeof offlineDB !== 'undefined') {
            try {
                reflections = await offlineDB.getAllReflections();
                console.log('Loaded reflections from IndexedDB (fallback)');
                
                for (let r of reflections) {
                    output += createReflectionHTML(r);
                }
                
                if (reflections.length === 0) {
                    output = "<p style='color: #999; text-align: center;'>No reflections found.</p>";
                }
            } catch (dbError) {
                output = "<p style='color: #ff6b6b;'>Failed to load reflections</p>";
            }
        } else {
            output = "<p style='color: #ff6b6b;'>Failed to load reflections</p>";
        }
    }
    
    viewAllEl.innerHTML = output;
}

function createReflectionHTML(r) {
    const syncBadge = r.synced === false ? 
        ' <span style="background: #ff9800; color: white; padding: 2px 8px; border-radius: 10px; font-size: 11px;">Pending</span>' : 
        '';

    console.log('Reflection canvas image:', r.canvas_image);
    
    // Prefer server-saved file, fall back to base64 for unsynced items
    let imgSrc = null;
    if (r.canvas_image) {
        imgSrc = `/static/canvas_images/${r.canvas_image}`;
    } else if (r.canvasImage) {
        imgSrc = r.canvasImage; // base64 data URL
    }

    const canvasImgHtml = imgSrc ? `
        <div style="margin-top: 8px;">
            <img src="${imgSrc}" alt="Canvas reflection"
                 style="max-width:100%; border:1px solid #ddd; border-radius:4px;">
        </div>
    ` : '';
    
    return `
        <div class="reflection-item" style="margin-bottom: 15px; padding: 15px; border-left: 3px solid palevioletred; background: #f9f9f9; border-radius: 4px;">
            <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                <div style="flex-grow: 1;">
                    <b>${r.name}</b>${syncBadge}<br>
                    <i>${r.date}</i><br>
                    <span class="reflection-content">${r.reflection}</span>
                    ${canvasImgHtml}
                </div>
                <div style="margin-left: 10px;">
                    <button onclick="deleteReflection('${r.id}')" class="action-btn delete-btn" title="Delete">Delete</button>
                </div>
            </div>
        </div>
    `;
}

async function deleteReflection(id) {
    if (!confirm("Are you sure you want to delete this reflection?")) {
        return;
    }
    
    try {
        let response = await fetch(`/api/reflections/${id}`, {
            method: "DELETE"
        });
        
        if (response.ok) {
            await submitted();
            showMessage("Reflection deleted successfully!");
        } else {
            const error = await response.json();
            showMessage(`Error: ${error.error || 'Failed to delete reflection'}`);
        }
    } catch (error) {
        console.error('Error deleting reflection:', error);
        showMessage('Failed to delete reflection. Please try again.');
    }
}

async function clearAllReflections() {
    if (!confirm("Are you sure you want to delete ALL reflections? This cannot be undone.")) {
        return;
    }
    
    try {
        for (let reflection of reflections) {
            await fetch(`/api/reflections/${reflection.id}`, { method: "DELETE" });
        }
        
        await submitted(); 
        showMessage("All reflections deleted successfully!");
    } catch (error) {
        console.error('Error clearing reflections:', error);
        showMessage('Error clearing reflections. Please try again.' );
    }
}

async function exportReflections() {
    try {
        if (reflections.length === 0) {
            showMessage("No reflections to export!" );
            return;
        }
        
        const jsonString = JSON.stringify(reflections, null, 4);
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `reflections_export_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        showMessage("Reflections exported successfully!");
    } catch (error) {
        console.error('Error exporting reflections:', error);
        showMessage('Export failed. Please try again.' );
    }
}

function showMessage(message) {
    alert(message);
}

// Function to initialize everything
function initializePage() {
    insertNavigation();
    initCanvas();
    
    // Initialize offline sync when online
    window.addEventListener('online', async () => {
        console.log('Back online!');
        if (typeof offlineDB !== 'undefined') {
            const queue = await offlineDB.getSyncQueue();
            if (queue.length > 0) {
                console.log(`Syncing ${queue.length} pending items...`);
                alert(`Syncing ${queue.length} pending reflections...`);
                await syncPendingData();
            }
        }
    });
    
    window.addEventListener('offline', () => {
        console.log('Gone offline');
        alert('You are offline. New reflections will be saved locally.');
    });
    
    console.log('All features initialized successfully');
}

/**
 * Sync pending data when back online
 */
async function syncPendingData() {
    if (typeof offlineDB === 'undefined') return;
    
    try {
        const queue = await offlineDB.getSyncQueue();
        
        for (const item of queue) {
            try {
                if (item.type === 'POST') {
                    const response = await fetch('/api/reflections', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            name: item.data.name,
                            reflection: item.data.reflection,
                            canvasImage: item.data.canvasImage || null
                        })
                    });
                    
                    if (response.ok) {
                        const serverReflection = await response.json();
                        
                        await offlineDB.deleteReflection(item.data.id);
                        serverReflection.synced = true;
                        await offlineDB.saveReflection(serverReflection);
                        await offlineDB.removeFromSyncQueue(item.queueId);
                        
                        console.log('Synced:', item.data.name);
                    }
                } else if (item.type === 'DELETE') {
                    const response = await fetch(`/api/reflections/${item.data.id}`, {
                        method: 'DELETE'
                    });
                    
                    if (response.ok) {
                        await offlineDB.removeFromSyncQueue(item.queueId);
                        console.log('Synced deletion:', item.data.id);
                    }
                }
            } catch (error) {
                console.error('Failed to sync item:', error);
            }
        }
        
        alert('All data synced successfully!');
        await submitted();
        
    } catch (error) {
        console.error('Sync failed:', error);
        alert('Sync failed. Will retry later.');
    }
}

// === Creative Canvas (drawing pad) ===
let canvas, ctx;
let drawing = false;
let lastX = 0;
let lastY = 0;
let startX = 0;
let startY = 0;
let currentShape = 'free';
let brushSize = 3;
let brushColor = '#db7093';
let previewImage = null; // for shape preview

function resetJournalForm() {
    const form = document.forms['myForm'];
    if (!form) return;

    // Manually clear ONLY the text inputs / textarea
    const nameInput = document.getElementById('fname');
    const reflectionInput = document.getElementById('reflection');

    if (nameInput) nameInput.value = '';
    if (reflectionInput) reflectionInput.value = '';

    // Reset only the text fields / textarea
    //form.reset();

    // Clear the canvas drawing but KEEP UI settings (size preset, brush slider value, mode dropdown)
    clearCanvas();
}

function initCanvas() {
    canvas = document.getElementById('reflectionCanvas');
    if (!canvas) return; // Not on this page

    ctx = canvas.getContext('2d');
    ctx.lineWidth = brushSize;
    ctx.lineCap = 'round';
    ctx.strokeStyle = brushColor;

    const colorInput = document.getElementById('canvasColor');
    const sizeInput = document.getElementById('canvasBrushSize');
    const sizeLabel = document.getElementById('brushSizeValue');
    const shapeSelect = document.getElementById('canvasShape');
    const sizePreset = document.getElementById('canvasSizePreset');

    if (colorInput) {
        brushColor = colorInput.value || brushColor;
        ctx.strokeStyle = brushColor;
        colorInput.addEventListener('input', () => {
            brushColor = colorInput.value;
            ctx.strokeStyle = brushColor;
        });
    }

    if (sizeInput) {
        brushSize = parseInt(sizeInput.value, 10) || brushSize;
        ctx.lineWidth = brushSize;
        if (sizeLabel) sizeLabel.textContent = brushSize;
        sizeInput.addEventListener('input', () => {
            brushSize = parseInt(sizeInput.value, 10) || 1;
            ctx.lineWidth = brushSize;
            if (sizeLabel) sizeLabel.textContent = brushSize;
        });
    }

    if (shapeSelect) {
        currentShape = shapeSelect.value;
        shapeSelect.addEventListener('change', () => {
            currentShape = shapeSelect.value;
        });
    }

    // Initialize size preset to match current canvas size, if possible
    if (sizePreset) {
        const currentValue = `${canvas.width}x${canvas.height}`;
        const options = Array.from(sizePreset.options).map(o => o.value);
        if (options.includes(currentValue)) {
            sizePreset.value = currentValue;
        } else {
            sizePreset.value = '500x300';
        }
    }

    // Mouse events
    canvas.addEventListener('mousedown', startDraw);
    canvas.addEventListener('mousemove', draw);
    canvas.addEventListener('mouseup', endDraw);
    canvas.addEventListener('mouseleave', endDraw);

    // Touch events (for mobile)
    canvas.addEventListener('touchstart', startDrawTouch, { passive: false });
    canvas.addEventListener('touchmove', drawTouch, { passive: false });
    canvas.addEventListener('touchend', endDrawTouch);
}

function resizeCanvasFromPreset() {
    if (!canvas || !ctx) return;
    const sizePreset = document.getElementById('canvasSizePreset');
    if (!sizePreset) return;

    const value = sizePreset.value; // e.g. "600x400"
    const [wStr, hStr] = value.split('x');
    const newW = parseInt(wStr, 10);
    const newH = parseInt(hStr, 10);
    if (isNaN(newW) || isNaN(newH)) return;

    canvas.width = newW;
    canvas.height = newH;

    ctx.lineWidth = brushSize;
    ctx.lineCap = 'round';
    ctx.strokeStyle = brushColor;
}

function getCanvasPos(event) {
    const rect = canvas.getBoundingClientRect();
    return {
        x: event.clientX - rect.left,
        y: event.clientY - rect.top
    };
}

function startDraw(e) {
    drawing = true;
    const pos = getCanvasPos(e);
    lastX = pos.x;
    lastY = pos.y;
    startX = pos.x;
    startY = pos.y;

    if (currentShape !== 'free') {
        // Save current canvas for shape preview
        previewImage = ctx.getImageData(0, 0, canvas.width, canvas.height);
    }
}

function draw(e) {
    if (!drawing) return;
    const pos = getCanvasPos(e);

    if (currentShape === 'free') {
        ctx.beginPath();
        ctx.moveTo(lastX, lastY);
        ctx.lineTo(pos.x, pos.y);
        ctx.strokeStyle = brushColor;
        ctx.lineWidth = brushSize;
        ctx.stroke();
        lastX = pos.x;
        lastY = pos.y;
    } else {
        // Shape preview
        if (previewImage) {
            ctx.putImageData(previewImage, 0, 0);
        }
        ctx.strokeStyle = brushColor;
        ctx.lineWidth = brushSize;

        if (currentShape === 'rect') {
            const w = pos.x - startX;
            const h = pos.y - startY;
            ctx.strokeRect(startX, startY, w, h);
        } else if (currentShape === 'circle') {
            const radius = Math.sqrt(Math.pow(pos.x - startX, 2) + Math.pow(pos.y - startY, 2));
            ctx.beginPath();
            ctx.arc(startX, startY, radius, 0, Math.PI * 2);
            ctx.stroke();
        } else if (currentShape === 'line') {
            ctx.beginPath();
            ctx.moveTo(startX, startY);
            ctx.lineTo(pos.x, pos.y);
            ctx.stroke();
        }
    }
}

function endDraw() {
    drawing = false;
    previewImage = null;
}

function startDrawTouch(e) {
    e.preventDefault();
    if (e.touches.length === 0) return;
    drawing = true;
    const touch = e.touches[0];
    const rect = canvas.getBoundingClientRect();
    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;
    lastX = x;
    lastY = y;
    startX = x;
    startY = y;

    if (currentShape !== 'free') {
        previewImage = ctx.getImageData(0, 0, canvas.width, canvas.height);
    }
}

function drawTouch(e) {
    e.preventDefault();
    if (!drawing || e.touches.length === 0) return;
    const touch = e.touches[0];
    const rect = canvas.getBoundingClientRect();
    const x = touch.clientX - rect.left;
    const y = touch.clientY - rect.top;

    if (currentShape === 'free') {
        ctx.beginPath();
        ctx.moveTo(lastX, lastY);
        ctx.lineTo(x, y);
        ctx.strokeStyle = brushColor;
        ctx.lineWidth = brushSize;
        ctx.stroke();
        lastX = x;
        lastY = y;
    } else {
        if (previewImage) {
            ctx.putImageData(previewImage, 0, 0);
        }
        ctx.strokeStyle = brushColor;
        ctx.lineWidth = brushSize;

        if (currentShape === 'rect') {
            const w = x - startX;
            const h = y - startY;
            ctx.strokeRect(startX, startY, w, h);
        } else if (currentShape === 'circle') {
            const radius = Math.sqrt(Math.pow(x - startX, 2) + Math.pow(y - startY, 2));
            ctx.beginPath();
            ctx.arc(startX, startY, radius, 0, Math.PI * 2);
            ctx.stroke();
        } else if (currentShape === 'line') {
            ctx.beginPath();
            ctx.moveTo(startX, startY);
            ctx.lineTo(x, y);
            ctx.stroke();
        }
    }
}

function endDrawTouch() {
    drawing = false;
    previewImage = null;
}

function clearCanvas() {
    if (!canvas || !ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializePage);
} else {
    initializePage();
}