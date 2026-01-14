// Simple install button handler
let deferredPrompt;

window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  
  const installBtn = document.getElementById('installBtn');
  if (installBtn) {
    installBtn.style.display = 'inline-block';
  }
});

function handleInstallClick() {
  const installBtn = document.getElementById('installBtn');
  
  if (!deferredPrompt) {
    alert('Install not available');
    return;
  }
  
  installBtn.style.display = 'none';
  
  deferredPrompt.prompt();
  deferredPrompt.userChoice.then((result) => {
    if (result.outcome === 'accepted') {
      console.log('User installed the app');
    } else {
      installBtn.style.display = 'inline-block';
    }
    deferredPrompt = null;
  });
}

function updateStatus() {
  const status = document.getElementById('onlineStatus');
  if (status) {
    if (navigator.onLine) {
      status.textContent = '?? Online';
      status.className = 'status-online';
    } else {
      status.textContent = '?? Offline';
      status.className = 'status-offline';
    }
  }
}

window.addEventListener('online', updateStatus);
window.addEventListener('offline', updateStatus);
window.addEventListener('load', updateStatus);
