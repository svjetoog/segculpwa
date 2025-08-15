// firebase-messaging-sw.js

// Importamos los scripts de Firebase que necesitamos.
importScripts("https://www.gstatic.com/firebasejs/11.6.1/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/11.6.1/firebase-messaging-compat.js");

// IMPORTANTE:
// La configuración de Firebase para el Service Worker debe estar aquí.
// Es la misma que usas en tu app, pero la necesita en este archivo separado.
const firebaseConfig = {
    apiKey: "AIzaSyC3OUQBy8VpjDCBllgsCGu3sDQoGO-G8w0",
    authDomain: "betasegui-8cdaa.firebaseapp.com",
    projectId: "betasegui-8cdaa",
    storageBucket: "betasegui-8cdaa.firebasestorage.app",
    messagingSenderId: "995668670252",
    appId: "1:995668670252:web:0aa68d85263ce46354de89"
};

// Inicializamos la app de Firebase
firebase.initializeApp(firebaseConfig);

// Obtenemos una instancia del servicio de mensajería
const messaging = firebase.messaging();

// Este es el manejador que se activa cuando llega una notificación
// y la aplicación NO está en primer plano (está cerrada o en otra pestaña).
messaging.onBackgroundMessage((payload) => {
  console.log(
    "[firebase-messaging-sw.js] Mensaje recibido en segundo plano: ",
    payload
  );

  // Extraemos el título y el cuerpo de la notificación desde los datos recibidos.
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: "/images/icons/icon-192x192.png", // Puedes usar un ícono de tu app
  };

  // Usamos la API del Service Worker para mostrar la notificación nativa.
  self.registration.showNotification(notificationTitle, notificationOptions);
});