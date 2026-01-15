let deferredPrompt;
let isInstalled = false;

function checkInstallStatus() {
  if (window.matchMedia('(display-mode: standalone)').matches ||
      window.navigator.standalone === true) {
    isInstalled = true;
    return true;
  }

  if (localStorage.getItem('pwa-installed') === 'true') {
    isInstalled = true;
    return true;
  }

  return false;
}

function initInstallButton() {
  const installBtn = document.getElementById('installBtn');
  if (!installBtn) return;

  if (checkInstallStatus()) {
    // Already installed -> never show
    installBtn.style.display = 'none';
  } else {
    // Not installed -> ALWAYS show on load
    installBtn.style.display = 'inline-block';
  }
}

window.addEventListener('beforeinstallprompt', (e) => {
  console.log('[Install] beforeinstallprompt event fired');
  e.preventDefault();
  deferredPrompt = e;
  // Do NOT hide/show button here – initInstallButton controls that
});

function handleInstallClick() {
  const installBtn = document.getElementById('installBtn');
  if (!installBtn) return;

  if (!deferredPrompt) {
    // No prompt available right now
    alert('Install not available right now. The app may already be installed or your browser has temporarily blocked the prompt.');
    return;
  }

  installBtn.style.display = 'none';

  deferredPrompt.prompt();
  deferredPrompt.userChoice.then((result) => {
    if (result.outcome === 'accepted') {
      console.log('[Install] User accepted installation');
      localStorage.setItem('pwa-installed', 'true');
      isInstalled = true;
    } else {
      console.log('[Install] User dismissed installation');
      // User cancelled -> allow them to try again
      if (!isInstalled) {
        installBtn.style.display = 'inline-block';
      }
    }
    deferredPrompt = null;
  });
}

window.addEventListener('appinstalled', () => {
  console.log('[Install] App successfully installed');
  localStorage.setItem('pwa-installed', 'true');
  isInstalled = true;
  const installBtn = document.getElementById('installBtn');
  if (installBtn) installBtn.style.display = 'none';
});

function updateStatus() {
  const status = document.getElementById('onlineStatus');
  if (status) {
    if (navigator.onLine) {
      status.textContent = '🟢 Online';
      status.className = 'status-online';
    } else {
      status.textContent = '🔴 Offline';
      status.className = 'status-offline';
    }
  }
}

window.addEventListener('online', updateStatus);
window.addEventListener('offline', updateStatus);

window.addEventListener('load', () => {
  updateStatus();
  initInstallButton();
});
