importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.8.0/firebase-messaging-compat.js');

const firebaseConfig = {
    apiKey: "AIzaSyDbr-xJrP6YfBVevjZmG_TwbH4PNRPlZQg",
    authDomain: "calebdeck-1f4bc.firebaseapp.com",
    projectId: "calebdeck-1f4bc",
    storageBucket: "calebdeck-1f4bc.firebasestorage.app",
    messagingSenderId: "233667503194",
    appId: "1:233667503194:web:ad2416772de6ba323ee463",
    measurementId: "G-369CGCG8XN"
};

firebase.initializeApp(firebaseConfig);
const messaging = firebase.messaging();

// Handle background messages
messaging.onBackgroundMessage((payload) => {
    console.log('[firebase-messaging-sw.js] Received background message ', payload);

    const notificationTitle = payload.notification?.title || 'CalebDeck Update';
    const notificationOptions = {
        body: payload.notification?.body,
        icon: '/calebdeck-logo.jpeg',
        badge: '/calebdeck-logo.jpeg',
        data: payload.data,
    };

    self.registration.showNotification(notificationTitle, notificationOptions);
});

// Handle notification click
self.addEventListener('notificationclick', (event) => {
    event.notification.close();

    const linkToOpen = event.notification.data?.link || '/';

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
            // Check if there is already a window/tab open with the target URL
            for (let i = 0; i < windowClients.length; i++) {
                const client = windowClients[i];
                if (client.url === linkToOpen && 'focus' in client) {
                    return client.focus();
                }
            }
            // If none, open a new window
            if (clients.openWindow) {
                return clients.openWindow(linkToOpen);
            }
        })
    );
});
