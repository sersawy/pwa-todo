self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', () => self.clients.claim());

self.addEventListener('message', (event) => {
  const data = event.data || {};
  if (!data.action) return;

  if (data.action === 'showNotification') {
    const { title, body, id } = data;
    self.registration
      .showNotification(title, {
        body: body || '',
        id: id,
        icon: 'icon.png',
      })
      .then(() => {
        self.clients.matchAll({ includeUncontrolled: true }).then((clientList) => {
          clientList.forEach((client) => {
            client.postMessage({ action: 'notificationShown', id });
          });
        });
      });
  }
});
