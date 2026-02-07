/* ═══════════════════════════════════════════════════════════════
   🕎 SERVICE WORKER — Bússola para Jerusalém (PWA)
   © 2026 Marcos Fernando — C4 Corporation
   
   Cache-first para assets estáticos, Network-first para API
   ═══════════════════════════════════════════════════════════════ */

const CACHE_NAME = 'bussola-jerusalem-v2';
const STATIC_CACHE = 'bussola-static-v2';
const API_CACHE = 'bussola-api-v2';

// Assets estáticos para pré-cache (Shell do App)
const STATIC_ASSETS = [
    './',
    './index.html',
    './manifest.json',
    './css/style.css',
    './js/app.js',
    './js/compass.js',
    './js/geolocation.js',
    './js/maps.js',
    './js/pix.js',
    './js/music.js',
    './js/community.js',
    './assets/img/icon-192.png',
    './assets/img/icon-512.png'
];

// CDN resources to cache
const CDN_ASSETS = [
    'https://cdn.jsdelivr.net/npm/qrcodejs@1.0.0/qrcode.min.js',
    'https://fonts.googleapis.com/css2?family=Cinzel+Decorative:wght@400;700&family=Cinzel:wght@400;700&family=Frank+Ruhl+Libre:wght@400;700&display=swap',
    'https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js',
    'https://www.gstatic.com/firebasejs/10.14.1/firebase-auth-compat.js',
    'https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore-compat.js'
];

// ─── INSTALL ───
self.addEventListener('install', event => {
    console.log('🕎 Service Worker: Instalando...');
    event.waitUntil(
        caches.open(STATIC_CACHE)
            .then(cache => {
                console.log('📦 Cacheando assets estáticos...');
                return cache.addAll(STATIC_ASSETS).catch(err => {
                    console.warn('⚠️ Falha ao cachear alguns assets:', err);
                    // Cacheia individualmente para não falhar tudo
                    return Promise.allSettled(
                        STATIC_ASSETS.map(url => cache.add(url).catch(() => {}))
                    );
                });
            })
            .then(() => {
                // Cacheia CDN assets separadamente
                return caches.open(STATIC_CACHE).then(cache => 
                    Promise.allSettled(
                        CDN_ASSETS.map(url => cache.add(url).catch(() => {}))
                    )
                );
            })
            .then(() => self.skipWaiting())
    );
});

// ─── ACTIVATE ───
self.addEventListener('activate', event => {
    console.log('🕎 Service Worker: Ativando...');
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames
                    .filter(name => name !== STATIC_CACHE && name !== API_CACHE)
                    .map(name => {
                        console.log(`🗑️ Removendo cache antigo: ${name}`);
                        return caches.delete(name);
                    })
            );
        }).then(() => self.clients.claim())
    );
});

// ─── FETCH ───
self.addEventListener('fetch', event => {
    const { request } = event;
    const url = new URL(request.url);

    // Ignora requests não-GET
    if (request.method !== 'GET') return;

    // Ignora chrome-extension, etc
    if (!url.protocol.startsWith('http')) return;

    // API requests → Network-first com fallback para cache
    if (url.pathname.startsWith('/api/')) {
        event.respondWith(networkFirstStrategy(request));
        return;
    }

    // Google Static Maps → Network-first (mapa muda com posição)
    if (url.hostname === 'maps.googleapis.com') {
        event.respondWith(networkFirstStrategy(request));
        return;
    }

    // Firebase/Firestore requests — Network-first (dados em tempo real)
    if (url.hostname.includes('googleapis.com') || url.hostname.includes('firebaseio.com') ||
        url.hostname.includes('firestore.googleapis.com')) {
        event.respondWith(networkFirstStrategy(request));
        return;
    }

    // Google Identity Services — Network-only (auth)
    if (url.hostname === 'accounts.google.com') {
        return; // Deixa o browser resolver
    }

    // Todos os outros → Cache-first
    event.respondWith(cacheFirstStrategy(request));
});

// ─── ESTRATÉGIAS ───

/**
 * Cache-first: tenta cache, fallback para rede
 */
async function cacheFirstStrategy(request) {
    const cached = await caches.match(request);
    if (cached) return cached;

    try {
        const response = await fetch(request);
        // Cacheia resposta válida
        if (response.ok) {
            const cache = await caches.open(STATIC_CACHE);
            cache.put(request, response.clone());
        }
        return response;
    } catch (error) {
        // Fallback offline para páginas HTML
        if (request.destination === 'document') {
            return caches.match('./index.html');
        }
        return new Response('Offline', { status: 503 });
    }
}

/**
 * Network-first: tenta rede, fallback para cache
 */
async function networkFirstStrategy(request) {
    try {
        const response = await fetch(request);
        // Cacheia respostas de API válidas
        if (response.ok) {
            const cache = await caches.open(API_CACHE);
            cache.put(request, response.clone());
        }
        return response;
    } catch (error) {
        const cached = await caches.match(request);
        if (cached) return cached;

        return new Response(
            JSON.stringify({ error: 'Sem conexão', offline: true }),
            { status: 503, headers: { 'Content-Type': 'application/json' } }
        );
    }
}

// ─── BACKGROUND SYNC (futuro) ───
self.addEventListener('sync', event => {
    if (event.tag === 'sync-posts') {
        console.log('🔄 Sincronizando posts pendentes...');
        // TODO: Implementar sync de posts offline
    }
});

// ─── PUSH NOTIFICATIONS (futuro) ───
self.addEventListener('push', event => {
    if (!event.data) return;

    const data = event.data.json();
    event.waitUntil(
        self.registration.showNotification(data.title || '🕎 Bússola para Jerusalém', {
            body: data.body || 'Nova notificação da comunidade',
            icon: '/assets/img/icon-192.png',
            badge: '/assets/img/icon-72.png',
            tag: data.tag || 'default',
            data: data.url || '/'
        })
    );
});

self.addEventListener('notificationclick', event => {
    event.notification.close();
    event.waitUntil(
        clients.openWindow(event.notification.data || '/')
    );
});
