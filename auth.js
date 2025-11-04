// --- Lógica de Autenticación con Firebase ---
(() => {
  const { qs, qsa } = window.Kaw;
  let auth, googleProvider, facebookProvider;
  let firebaseInitialized = false;

  function initFirebase() {
    if (firebaseInitialized) return;
    try {
      if (firebase && window.Kaw.firebaseConfig && window.Kaw.firebaseConfig.apiKey) {
        firebase.initializeApp(window.Kaw.firebaseConfig);
        auth = firebase.auth();
        googleProvider = new firebase.auth.GoogleAuthProvider();
        facebookProvider = new firebase.auth.FacebookAuthProvider();
        
        auth.onAuthStateChanged(handleAuthStateChange);
        firebaseInitialized = true;
      } else {
        console.warn("Firebase no está configurado. La autenticación estará deshabilitada.");
        hideAuthFeatures();
      }
    } catch (e) {
      console.error("Error inicializando Firebase:", e);
      hideAuthFeatures();
    }
  }

  function hideAuthFeatures() {
    qsa('.auth-box, .auth-modal').forEach(el => el.style.display = 'none');
  }

  function handleAuthStateChange(user) {
    const authBox = qs('.auth-box');
    if (!authBox) return;

    if (user) {
      // Usuario ha iniciado sesión
      authBox.innerHTML = `
        <div class="user-menu">
          <div class="user-info">
            <span>Hola, ${user.displayName || user.email.split('@')[0]}</span>
          </div>
          <button class="btn-logout">Cerrar Sesión</button>
        </div>
      `;
      qs('.btn-logout').addEventListener('click', () => auth.signOut());
      closeAuthModal();
    } else {
      // Usuario no ha iniciado sesión
      authBox.innerHTML = `
        <button class="btn-auth">Ingresar</button>
      `;
      qs('.btn-auth').addEventListener('click', openAuthModal);
    }
  }

  function openAuthModal() {
    let modal = qs('#auth-modal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'auth-modal';
      modal.className = 'auth-modal';
      modal.innerHTML = `
        <div class="auth-content">
          <button class="auth-close">&times;</button>
          <div class="auth-tabs">
            <button class="auth-tab active" data-tab="login">Ingresar</button>
            <button class="auth-tab" data-tab="register">Registrarse</button>
          </div>
          <!-- Panel de Login -->
          <div class="auth-panel" id="login-panel">
            <button class="btn-social google"><span class="social-ico g"></span> Continuar con Google</button>
            <div class="auth-sep">o</div>
            <label for="login-email">Email</label>
            <input type="email" id="login-email" required>
            <label for="login-pass">Contraseña</label>
            <input type="password" id="login-pass" required>
            <div class="auth-error"></div>
            <button class="btn btn-login">Ingresar</button>
          </div>
          <!-- Panel de Registro -->
          <div class="auth-panel hidden" id="register-panel">
            <label for="reg-email">Email</label>
            <input type="email" id="reg-email" required>
            <label for="reg-pass">Contraseña</label>
            <input type="password" id="reg-pass" required>
            <div class="auth-error"></div>
            <button class="btn btn-register">Registrarse</button>
          </div>
        </div>
      `;
      document.body.appendChild(modal);
      setupAuthModalEvents(modal);
    }
    modal.style.display = 'flex';
  }

  function closeAuthModal() {
    const modal = qs('#auth-modal');
    if (modal) modal.style.display = 'none';
  }

  function setupAuthModalEvents(modal) {
    modal.addEventListener('click', e => {
      if (e.target === modal || e.target.matches('.auth-close')) {
        closeAuthModal();
      }
      // Pestañas
      if (e.target.matches('.auth-tab')) {
        const tabName = e.target.dataset.tab;
        qsa('.auth-tab').forEach(t => t.classList.remove('active'));
        e.target.classList.add('active');
        qsa('.auth-panel').forEach(p => p.classList.add('hidden'));
        qs(`#${tabName}-panel`).classList.remove('hidden');
      }
      // Acciones
      if (e.target.matches('.btn-login')) handleEmailLogin();
      if (e.target.matches('.btn-register')) handleEmailRegister();
      if (e.target.matches('.btn-social.google')) handleSocialLogin(googleProvider);
    });
  }

  async function handleEmailLogin() {
    const email = qs('#login-email').value;
    const pass = qs('#login-pass').value;
    const errorEl = qs('#login-panel .auth-error');
    try {
      await auth.signInWithEmailAndPassword(email, pass);
    } catch (e) {
      errorEl.textContent = "Error: " + e.message;
    }
  }

  async function handleEmailRegister() {
    const email = qs('#reg-email').value;
    const pass = qs('#reg-pass').value;
    const errorEl = qs('#register-panel .auth-error');
    try {
      await auth.createUserWithEmailAndPassword(email, pass);
    } catch (e) {
      errorEl.textContent = "Error: " + e.message;
    }
  }

  async function handleSocialLogin(provider) {
    const googleBtn = qs('.btn-social.google');
    const errorEl = qs('#login-panel .auth-error');
    errorEl.textContent = '';
    
    try {
      if (googleBtn) {
        googleBtn.disabled = true;
        googleBtn.setAttribute('aria-busy', 'true');
        googleBtn.dataset.originalText = googleBtn.textContent;
        googleBtn.textContent = 'Cargando...';
      }
      await auth.signInWithPopup(provider);
    } catch (e) {
      errorEl.textContent = "Error de inicio de sesión social: " + e.message;
    } finally {
      if (googleBtn) {
        googleBtn.disabled = false;
        googleBtn.removeAttribute('aria-busy');
        if (googleBtn.dataset.originalText) {
          googleBtn.textContent = googleBtn.dataset.originalText;
          delete googleBtn.dataset.originalText;
        }
      }
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initFirebase);
  } else {
    initFirebase();
  }
})();
