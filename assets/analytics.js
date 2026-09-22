/* Anonymous, first-party QDM analytics. No form contents or full referrer URLs. */
(() => {
  if (window.__qdmAnalytics || !['qdm.co.kr', 'www.qdm.co.kr'].includes(location.hostname)) return;
  window.__qdmAnalytics = true;
  const trackingMode = new URLSearchParams(location.search).get('qdm_tracking');
  const optOutKey = 'qdm-analytics-opt-out';
  if (trackingMode === 'off' || trackingMode === 'on') {
    let saved = false;
    try {
      if (trackingMode === 'off') localStorage.setItem(optOutKey, '1');
      else localStorage.removeItem(optOutKey);
      localStorage.removeItem('qdm-analytics-session');
      saved = trackingMode === 'off' ? localStorage.getItem(optOutKey) === '1' : localStorage.getItem(optOutKey) !== '1';
    } catch {}
    const showNotice = () => {
      const notice = document.createElement('div');
      notice.setAttribute('role', 'status');
      notice.style.cssText = 'position:fixed;bottom:16px;left:16px;right:16px;z-index:99999;padding:16px;background:#082e68;color:white;border-radius:10px;font:14px/1.6 sans-serif;box-shadow:0 4px 20px #0003';
      notice.textContent = trackingMode === 'off'
        ? (saved ? '이 브라우저의 QDM 방문 분석 수집을 중지했습니다. 다른 페이지로 이동해도 유지됩니다.' : '현재 페이지는 방문 분석에서 제외됩니다. 브라우저 저장이 차단되어 다른 페이지에서는 제외 설정이 유지되지 않을 수 있습니다.')
        : (saved ? '이 브라우저의 QDM 방문 분석 제외 설정을 해제했습니다. 브라우저의 추적 거부 설정은 계속 존중합니다.' : '브라우저 저장이 차단되어 제외 설정을 해제하지 못했습니다.');
      const close = document.createElement('button');
      close.type = 'button'; close.textContent = '닫기';
      close.style.cssText = 'margin-left:16px;padding:5px 12px;cursor:pointer';
      close.onclick = () => notice.remove(); notice.appendChild(close);
      document.body.appendChild(notice);
    };
    if (document.body) showNotice(); else document.addEventListener('DOMContentLoaded',showNotice,{once:true});
  }
  const excluded = () => {
    if (trackingMode === 'off' || navigator.doNotTrack === '1') return true;
    try { return localStorage.getItem(optOutKey) === '1'; } catch { return false; }
  };
  if (excluded()) return;
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
    if (excluded()) return;
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
