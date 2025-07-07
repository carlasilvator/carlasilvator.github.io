
// firebase-messaging-sw.js      
importScripts("https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js");      
importScripts("https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js");      
      
firebase.initializeApp({      
  apiKey: "AIzaSyBtTc7yWNfNkG0oVSbpq0V9A6DHTgZoGBM",      
  authDomain: "works-rawan.firebaseapp.com",      
  projectId: "works-rawan",      
  storageBucket: "works-rawan.appspot.com",      
  messagingSenderId: "986254083746",      
  appId: "1:986254083746:web:17f7db0389c94473f0b9fb"      
});      
      
const messaging = firebase.messaging();      
      
messaging.onBackgroundMessage(function(payload) {      
  console.log("Received background message ", payload);      
  const { title, body } = payload.notification;      
      
  self.registration.showNotification(title, {      
    body,      
    icon: "/icon.png"      
  });      
});
