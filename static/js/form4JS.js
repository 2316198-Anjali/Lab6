
let reflections = [];

function init() {
    getDate();
    submitted();
    initializeDateTime();
}

function getDate() {
    const d = new Date();
    let text = d.toDateString();
    document.getElementById("todayDate").innerHTML = text;
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
    
    let entry = { name, reflection };
    
    try {
        // Send POST request to Flask backend
        let response = await fetch("/api/reflections", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(entry)
        });
        
        if (response.ok) {
            document.myForm.reset();
            alert('Reflection submitted successfully!');
            submitted(); 
        } else {
            const error = await response.json();
            alert(`Error: ${error.error || 'Failed to submit reflection'}`);
        }
    } catch (error) {
        console.error('Network error:', error);
        alert('Failed to submit reflection. Please try again.');
    }
    
    return false; 
}

async function submitted() {
    let output = "";
    
    try {
        // Send GET request to Flask backend
        let response = await fetch("/api/reflections");
        
        if (response.ok) {
            reflections = await response.json();
            
            for (let r of reflections) {
                output += createReflectionHTML(r);
            }
            
            if (reflections.length === 0) {
                output = "<p style='color: #999; text-align: center;'>No reflections found.</p>";
            }
        } else {
            output = "<p style='color: #ff6b6b;'>Error loading reflections</p>";
        }
    } catch (error) {
        console.error('Error fetching reflections:', error);
        output = "<p style='color: #ff6b6b;'>Failed to load reflections</p>";
    }
    
    document.getElementById("viewAll").innerHTML = output;
}

function createReflectionHTML(r) {
    return `
        <div class="reflection-item" style="margin-bottom: 15px; padding: 15px; border-left: 3px solid palevioletred; background: #f9f9f9; border-radius: 4px;">
            <div style="display: flex; justify-content: between; align-items: flex-start;">
                <div style="flex-grow: 1;">
                    <b>${r.name}</b><br>
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
            submitted(); // Refresh the list
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
        
        submitted(); // Refresh the list
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