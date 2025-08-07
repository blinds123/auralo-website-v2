// Service Worker for Auralo Landing Page
// Implements offline capability and performance optimization from PRP

const CACHE_NAME = 'auralo-v1';
const urlsToCache = [
    '/',
    '/index-new.html',
    '/images/main-hoodie.jpg',
    '/images/slide-1_final_crushed_under_20kb.jpg',
    '/images/slide-2_final_crushed_under_20kb.jpg',
    '/images/slide-3_captioned_final_under_20kb.jpg',
    '/images/compressed_hoodie_review_Emma_black_30kb.jpg',
    '/images/compressed_hoodie_review_Sophia_30kb.jpg',
    '/images/compressed_hoodie_review_Madison_30kb.jpg'
];

// Install event - cache resources
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('Opened cache');
                return cache.addAll(urlsToCache);
            })
            .catch(err => {
                console.error('Cache installation failed:', err);
            })
    );
    // Force immediate activation
    self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('Deleting old cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
    // Take control immediately
    self.clients.claim();
});

// Fetch event - serve from cache when possible
self.addEventListener('fetch', event => {
    // Skip non-GET requests
    if (event.request.method !== 'GET') {
        return;
    }

    // Skip external API requests
    if (event.request.url.includes('simpleswap.io') || 
        event.request.url.includes('mercuryo')) {
        return;
    }

    event.respondWith(
        caches.match(event.request)
            .then(response => {
                // Return cached version if available
                if (response) {
                    return response;
                }

                // Clone the request for fetch
                const fetchRequest = event.request.clone();

                return fetch(fetchRequest).then(response => {
                    // Check if valid response
                    if (!response || response.status !== 200 || response.type !== 'basic') {
                        return response;
                    }

                    // Clone response for caching
                    const responseToCache = response.clone();

                    // Cache the fetched response
                    caches.open(CACHE_NAME)
                        .then(cache => {
                            cache.put(event.request, responseToCache);
                        });

                    return response;
                }).catch(err => {
                    // Return offline page if available
                    console.error('Fetch failed:', err);
                    return caches.match('/index-new.html');
                });
            })
    );
});

// Background sync for payment retries
self.addEventListener('sync', event => {
    if (event.tag === 'payment-retry') {
        event.waitUntil(
            // Retry payment submission
            retryPayment()
        );
    }
});

async function retryPayment() {
    // Get pending payments from IndexedDB or localStorage
    // Retry submission to SimpleSwap API
    console.log('Retrying payment submission...');
}

// Push notification support for order updates
self.addEventListener('push', event => {
    const options = {
        body: event.data ? event.data.text() : 'Your Auralo order has been updated!',
        icon: '/images/main-hoodie.jpg',
        badge: '/images/main-hoodie.jpg',
        vibrate: [100, 50, 100],
        data: {
            dateOfArrival: Date.now(),
            primaryKey: 1
        }
    };

    event.waitUntil(
        self.registration.showNotification('Auralo Update', options)
    );
});

// Notification click handler
self.addEventListener('notificationclick', event => {
    event.notification.close();
    event.waitUntil(
        clients.openWindow('/')
    );
});

// Message handler for cache management
self.addEventListener('message', event => {
    if (event.data.action === 'clearCache') {
        caches.delete(CACHE_NAME).then(() => {
            console.log('Cache cleared');
        });
    }
});

console.log('Service Worker loaded');