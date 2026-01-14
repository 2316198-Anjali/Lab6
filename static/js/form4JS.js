
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

async function checkReflection() {
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
    
    const entry = {
        id: Date.now().toString(),
        name,
        reflection,
        date: new Date().toDateString(),
        timestamp: new Date().toISOString(),
        synced: false
    };
    
    try {
        if (navigator.onLine) {
            const response = await fetch("/api/reflections", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ name: entry.name, reflection: entry.reflection })
            });
            
            if (response.ok) {
                const serverReflection = await response.json();
                
                if (typeof offlineDB !== 'undefined') {
                    serverReflection.synced = true;
                    await offlineDB.saveReflection(serverReflection);
                }
                
                document.myForm.reset();
                alert('? Reflection submitted successfully!');
                await submitted();
            } else {
                throw new Error('Server error');
            }
        } else {
            if (typeof offlineDB !== 'undefined') {
                await offlineDB.saveReflection(entry);
                await offlineDB.addToSyncQueue('POST', entry);
                
                document.myForm.reset();
                alert('?? Saved offline! Will sync when online.');
                await submitted();
            } else {
                alert('? Cannot save offline. IndexedDB not available.');
            }
        }
    } catch (error) {
        console.error('Error saving reflection:', error);
        
        if (typeof offlineDB !== 'undefined') {
            try {
                await offlineDB.saveReflection(entry);
                await offlineDB.addToSyncQueue('POST', entry);
                
                document.myForm.reset();
                alert('?? Saved offline! Will sync when online.');
                await submitted();
            } catch (dbError) {
                console.error('Failed to save offline:', dbError);
                alert('? Failed to save reflection');
            }
        } else {
            alert('? Failed to submit reflection. Please try again.');
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
                console.log('?? Loaded reflections from IndexedDB (offline)');
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
                console.log('?? Loaded reflections from IndexedDB (fallback)');
                
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
        ' <span style="background: #ff9800; color: white; padding: 2px 8px; border-radius: 10px; font-size: 11px;">?? Pending</span>' : 
        '';
    
    return `
        <div class="reflection-item" style="margin-bottom: 15px; padding: 15px; border-left: 3px solid palevioletred; background: #f9f9f9; border-radius: 4px;">
            <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                <div style="flex-grow: 1;">
                    <b>${r.name}</b>${syncBadge}<br>
                    <i>${r.date}</i><br>
                    <span class="reflection-content">${r.reflection}</span>
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
    
    // Initialize offline sync when online
    window.addEventListener('online', async () => {
        console.log('?? Back online!');
        if (typeof offlineDB !== 'undefined') {
            const queue = await offlineDB.getSyncQueue();
            if (queue.length > 0) {
                console.log(`?? Syncing ${queue.length} pending items...`);
                alert(`Syncing ${queue.length} pending reflections...`);
                await syncPendingData();
            }
        }
    });
    
    window.addEventListener('offline', () => {
        console.log('?? Gone offline');
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
                    // Sync new reflection
                    const response = await fetch('/api/reflections', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            name: item.data.name,
                            reflection: item.data.reflection
                        })
                    });
                    
                    if (response.ok) {
                        const serverReflection = await response.json();
                        
                        await offlineDB.deleteReflection(item.data.id);
                        serverReflection.synced = true;
                        await offlineDB.saveReflection(serverReflection);
                        await offlineDB.removeFromSyncQueue(item.queueId);
                        
                        console.log('? Synced:', item.data.name);
                    }
                } else if (item.type === 'DELETE') {
                    const response = await fetch(`/api/reflections/${item.data.id}`, {
                        method: 'DELETE'
                    });
                    
                    if (response.ok) {
                        await offlineDB.removeFromSyncQueue(item.queueId);
                        console.log('? Synced deletion:', item.data.id);
                    }
                }
            } catch (error) {
                console.error('Failed to sync item:', error);
            }
        }
        
        alert('? All data synced successfully!');
        await submitted(); // Refresh display
        
    } catch (error) {
        console.error('Sync failed:', error);
        alert('? Sync failed. Will retry later.');
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializePage);
} else {
    initializePage();
}