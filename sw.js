// sw.js
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', () => self.clients.claim());

// Listen for messages from the page
self.addEventListener('message', (event) => {
  const data = event.data || {};
  if (!data.action) return;

  if (data.action === 'showNotification') {
    const { title, body, tag } = data;
    // Show the notification and then inform clients that it was shown
    self.registration
      .showNotification(title, {
        body: body || '',
        tag: tag || undefined,
        icon: 'icon.png',
      })
      .then(() => {
        // Post a message to all clients so the page can mark the task completed
        self.clients.matchAll({ includeUncontrolled: true }).then((clientList) => {
          clientList.forEach((client) => {
            client.postMessage({ action: 'notificationShown', tag });
          });
        });
      });
  }

  // Optionally support immediate cancel by tag
  if (data.action === 'closeNotification' && data.tag) {
    // try to get and close any displayed notifications with the tag
    self.registration.getNotifications({ tag: data.tag }).then((notifs) => {
      notifs.forEach((n) => n.close());
    });
  }
});

// You can also handle notification click
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  // focus/open client window
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      if (clientList.length > 0) return clientList[0].focus();
      return self.clients.openWindow('/');
    }),
  );
});
