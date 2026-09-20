/* eslint-disable no-restricted-globals */
// Firebase Messaging & Web Push Service Worker for Shivshahi Doors

self.addEventListener('install', (event) => {
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(self.clients.claim());
});

// Handle incoming background push notifications
self.addEventListener('push', (event) => {
  let notificationData = {
    title: 'Shivshahi Doors Update',
    body: 'Check out our new door designs and woodcraft updates.',
    icon: '/assets/app-icon.svg',
    badge: '/assets/app-icon.svg',
    image: undefined,
    data: { url: '/' },
  };

  if (event.data) {
    try {
      const payload = event.data.json();

      // FCM Web Push payload format
      if (payload.notification) {
        notificationData.title = payload.notification.title || notificationData.title;
        notificationData.body = payload.notification.body || notificationData.body;
        notificationData.icon = payload.notification.icon || notificationData.icon;
        notificationData.image = payload.notification.image || payload.data?.image || undefined;
      } else if (payload.data) {
        notificationData.title = payload.data.title || notificationData.title;
        notificationData.body = payload.data.body || payload.data.message || notificationData.body;
        notificationData.image = payload.data.image || undefined;
      }

      // Merge custom data attributes
      const customData = payload.data || {};
      notificationData.data = {
        url: customData.url || customData.deepLink || payload.fcmOptions?.link || '/',
        category: customData.category || 'important_updates',
        doorId: customData.doorId || '',
        campaignId: customData.campaignId || '',
        receivedAt: Date.now(),
      };
    } catch (e) {
      // Fallback if plain text
      notificationData.body = event.data.text();
    }
  }

  const options = {
    body: notificationData.body,
    icon: notificationData.icon || '/assets/app-icon.svg',
    badge: notificationData.badge || '/assets/app-icon.svg',
    image: notificationData.image,
    vibrate: [200, 100, 200],
    tag: notificationData.data.campaignId || 'door-update',
    renotify: true,
    requireInteraction: true,
    data: notificationData.data,
    actions: [
      { action: 'open', title: 'View Details' },
      { action: 'dismiss', title: 'Dismiss' },
    ],
  };

  event.waitUntil(
    self.registration.showNotification(notificationData.title, options)
  );
});

// Handle notification tap / click
self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  if (event.action === 'dismiss') {
    return;
  }

  const notificationData = event.notification.data || {};
  let targetUrl = notificationData.url || '/';

  // Ensure absolute URL
  try {
    targetUrl = new URL(targetUrl, self.location.origin).href;
  } catch (e) {
    targetUrl = self.location.origin;
  }

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      // Check if there is already a window/tab open with the app
      for (const client of clientList) {
        if (client.url.startsWith(self.location.origin) && 'focus' in client) {
          // Post message to the app so React router can handle deep link seamlessly
          client.postMessage({
            type: 'NOTIFICATION_DEEP_LINK',
            data: notificationData,
            targetUrl,
          });
          return client.focus();
        }
      }

      // If no window is open, open a new window at the target URL
      if (self.clients.openWindow) {
        return self.clients.openWindow(targetUrl);
      }
    })
  );
});

// Broadcast messages from push to foreground clients
self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});
