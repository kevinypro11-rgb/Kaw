// Configuración de Firebase (rellena con tus credenciales del proyecto)
// Ir a: https://console.firebase.google.com > Project Settings > General > Your apps (Web)
// Copia el objeto de configuración y pégalo aquí.

// WARNING: Do NOT commit real Firebase credentials to version control.
// Fill these values with your Firebase project config before deploying.
// Consider using environment variables or a secure config management system.

window.Kaw = window.Kaw || {};
window.Kaw.firebaseConfig = {
  apiKey: "",
  authDomain: "",
  projectId: "",
  appId: "",
  // Opcionales:
  // storageBucket: "",
  // messagingSenderId: "",
  // measurementId: "",
};

// Simple runtime check to warn if config is incomplete
if (window.location.hostname !== "localhost" && window.location.hostname !== "127.0.0.1") {
  if (!window.Kaw.firebaseConfig.apiKey || !window.Kaw.firebaseConfig.projectId) {
    console.warn("La configuración de Firebase está incompleta. Por favor, rellena los campos necesarios antes de desplegar en producción.");
  }
}



