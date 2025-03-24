// 1. Importar Workbox (versión actualizada)
importScripts('https://storage.googleapis.com/workbox-cdn/releases/6.5.4/workbox-sw.js');

const CACHE_NAME = 'recordatorios-v4';
const urlsToCache = [
    '/',
    '/index.html',
    '/styles.css',
    '/script.js',
    '/manifest.json',
    '/icon-192.png', // Asegúrate de que el nombre coincida con tus iconos
    '/icon-512.png',
    '/grabadora-de-voz.png'
];

// 2. Configurar Workbox
workbox.setConfig({ debug: false });
workbox.core.setLogLevel(workbox.core.LOG_LEVELS.warn);

// 3. Estrategia de caché
workbox.routing.registerRoute(
    /\.(?:html|css|js|json|png|jpg|svg)$/,
    new workbox.strategies.StaleWhileRevalidate({
        cacheName: CACHE_NAME,
        plugins: [
            new workbox.expiration.ExpirationPlugin({
                maxEntries: 50,
                purgeOnQuotaError: true
            })
        ]
    })
);

// 4. Control de notificaciones push
self.addEventListener('push', event => {
    const data = event.data?.json() || {};
    const options = {
        body: data.body || 'Tienes un recordatorio pendiente',
        icon: '/icon-192.png',
        badge: '/icon-192.png',
        data: { url: data.url || '/' }
    };
    event.waitUntil(self.registration.showNotification(data.title || 'Recordatorio', options));
});

// 5. Acción al hacer click en la notificación
self.addEventListener('notificationclick', event => {
    event.notification.close();
    event.waitUntil(clients.openWindow(event.notification.data.url));
});

// 6. Control de actualizaciones
self.addEventListener('message', event => {
    if (event.data === 'SKIP_WAITING') self.skipWaiting();
});
