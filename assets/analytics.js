/* Anonymous, first-party QDM analytics. No form contents or full referrer URLs. */
(() => {
  if (window.__qdmAnalytics || !['qdm.co.kr', 'www.qdm.co.kr'].includes(location.hostname) || navigator.doNotTrack === '1') return;
  window.__qdmAnalytics = true;
  const uuid = () => crypto.randomUUID();
  let session;
  try {
    if (localStorage.getItem('qdm-analytics-opt-out') === '1') return;
    session = JSON.parse(localStorage.getItem('qdm-analytics-session') || 'null');
  } catch {}
  if (!session || typeof session.id !== 'string' || !Number.isFinite(session.time) || Date.now() - session.time > 1800000) {
    let referrer = '';
    try { referrer = new URL(document.referrer).hostname; } catch {}
    const params = new URLSearchParams(location.search);
    session = { id: uuid(), referrer: referrer === location.hostname ? '' : referrer,
      source: (params.get('utm_source') || '').slice(0, 100), campaign: (params.get('utm_campaign') || '').slice(0, 100), time: Date.now() };
  }
  const touch = () => { session.time = Date.now(); try { localStorage.setItem('qdm-analytics-session', JSON.stringify(session)); } catch {} };
  touch();
  const send = (event) => {
    if (Date.now() - session.time > 1800000) session = {id:uuid(),time:Date.now(),referrer:'',source:'',campaign:''};
    touch();
    if (!window.QDM_SUPABASE_URL || !window.QDM_SUPABASE_KEY) return;
    fetch(`${window.QDM_SUPABASE_URL}/rest/v1/rpc/qdm_track_event`, {
      method: 'POST', keepalive: true, headers: { 'Content-Type': 'application/json', apikey: window.QDM_SUPABASE_KEY },
      body: JSON.stringify({ p_session: session.id, p_event: event, p_path: location.pathname.slice(0, 500),
        p_referrer: session.referrer, p_source: session.source, p_campaign: session.campaign,
        p_language: document.documentElement.lang.startsWith('ja') ? 'ja' : 'ko', p_device: matchMedia('(max-width: 767px)').matches ? 'mobile' : 'desktop' })
    }).catch(() => {});
  };
  function start() {
    send('pageview');
    document.addEventListener('click', e => {
      const link = e.target.closest?.('a[href]');
      if (link?.protocol === 'tel:') send('phone');
      if (link?.protocol === 'mailto:') send('email');
    });
    window.addEventListener('qdm:inquiry-success', () => send('inquiry'));
  }
  if (window.QDM_SUPABASE_KEY) start();
  else {
    const config = document.createElement('script');
    config.src = '/assets/supabase-config.js'; config.onload = start;
    document.head.appendChild(config);
  }
})();
