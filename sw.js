/* 情侣点菜 Service Worker：只负责推送通知，不做缓存拦截 */
self.addEventListener('install', () => self.skipWaiting())
self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()))

self.addEventListener('push', (e) => {
  let d = {}
  try { d = e.data ? e.data.json() : {} } catch (err) { d = { body: e.data && e.data.text() } }
  e.waitUntil(self.registration.showNotification(d.title || '情侣点菜 💕', {
    body: d.body || '',
    icon: 'icon-192.png',
    badge: 'icon-192.png',
    tag: d.tag || 'love-menu',
    data: { url: './' }
  }))
})

self.addEventListener('notificationclick', (e) => {
  e.notification.close()
  e.waitUntil(self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((list) => {
    for (const c of list) {
      if ('focus' in c) return c.focus()
    }
    return self.clients.openWindow('./')
  }))
})
