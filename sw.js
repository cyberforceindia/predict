self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => e.waitUntil(self.clients.claim()));

self.addEventListener('fetch', e => {
  const url = e.request.url;
  if (url.includes('ar-lottery01.com') || url.includes('api.telegram.org') || url.includes('fonts.')) {
    e.respondWith(fetch(e.request).catch(() => new Response('', {status:503})));
    return;
  }
  e.respondWith(
    caches.open('hub-v4').then(c =>
      c.match(e.request).then(hit => hit || fetch(e.request).then(r => { c.put(e.request, r.clone()); return r; }))
    )
  );
});

self.addEventListener('sync', e => { if(e.tag==='pred-sync') e.waitUntil(bgPoll()); });
self.addEventListener('periodicsync', e => { if(e.tag==='pred-periodic') e.waitUntil(bgPoll()); });

async function bgPoll() {
  try {
    const r = await fetch('https://draw.ar-lottery01.com/WinGo/WinGo_1M/GetHistoryIssuePage.json?t='+Date.now());
    const j = await r.json();
    const rows = j?.data?.list;
    if(!rows?.length) return;
    const all = await self.clients.matchAll({includeUncontrolled:true});
    all.forEach(c => c.postMessage({type:'BG_DATA', rows}));
  } catch(_){}
}

self.addEventListener('message', e => {
  if(e.data?.type==='LOSS_ALERT') {
    self.registration.showNotification('⚠️ HACKER HUB', {
      body: e.data.streak + ' CONSECUTIVE LOSSES — Pause & review!',
      tag:'loss', renotify:true, vibrate:[300,150,300,150,300]
    });
  }
  if(e.data?.type==='WIN_ALERT') {
    self.registration.showNotification('⚡ BIG MONEY HIT!', {
      body: 'Numbers predicted correctly!',
      tag:'win', renotify:true, vibrate:[100,50,100,50,500]
    });
  }
});

self.addEventListener('notificationclick', e => {
  e.notification.close();
  e.waitUntil(clients.matchAll({type:'window'}).then(l => l.length ? l[0].focus() : clients.openWindow('./')));
});
