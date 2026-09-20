const http = require('http');
const fs = require('fs');
const path = require('path');
const { execFile } = require('child_process');
const { URL } = require('url');

const adminRoot = __dirname;
const homepageRoot = path.resolve(adminRoot, '..');
const dataRoot = path.join(adminRoot, 'data');
const inquiryRoot = path.join(adminRoot, 'inquiries');
const backupRoot = path.join(dataRoot, 'backups');
const tableName = 'qdm_inquiries';
const storageBucket = 'qdm-inquiry-files';
const port = Number(process.env.QDM_ADMIN_PORT || 5188);
const secretKey = String(process.env.QDM_SUPABASE_SECRET_KEY || '').trim();

function readProjectUrl() {
  const configPath = path.join(homepageRoot, 'assets', 'supabase-config.js');
  const source = fs.readFileSync(configPath, 'utf8');
  const match = source.match(/QDM_SUPABASE_URL\s*=\s*["']([^"']+)/);
  if (!match) throw new Error('assets/supabase-config.js에서 QDM Supabase URL을 찾지 못했습니다.');
  return match[1].replace(/\/+$/, '');
}

const supabaseUrl = readProjectUrl();

function ensureFolders() {
  [dataRoot, inquiryRoot, backupRoot].forEach((folder) => fs.mkdirSync(folder, { recursive: true }));
}

function apiHeaders(extra = {}) {
  if (!secretKey) throw new Error('QDM Supabase Secret key가 설정되지 않았습니다.');
  return { apikey: secretKey, ...extra };
}

function json(res, status, body) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store'
  });
  res.end(JSON.stringify(body));
}

function text(res, status, body) {
  res.writeHead(status, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end(body);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', (chunk) => {
      raw += chunk;
      if (raw.length > 1024 * 1024) {
        reject(new Error('요청 데이터가 너무 큽니다.'));
        req.destroy();
      }
    });
    req.on('end', () => {
      try {
        resolve(raw ? JSON.parse(raw) : {});
      } catch {
        reject(new Error('요청 형식이 올바르지 않습니다.'));
      }
    });
    req.on('error', reject);
  });
}

function safeFileName(value) {
  const cleaned = String(value || '')
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, '_')
    .replace(/\s+/g, ' ')
    .trim();
  return cleaned || '문의';
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function csvCell(value) {
  const textValue = Array.isArray(value) ? value.join(' | ') : String(value ?? '');
  return `"${textValue.replace(/"/g, '""')}"`;
}

function timestamp() {
  const now = new Date();
  const pad = (value) => String(value).padStart(2, '0');
  return `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
}

function encodedObjectPath(objectPath) {
  return String(objectPath).split('/').map(encodeURIComponent).join('/');
}

async function fetchRemoteInquiries() {
  const columns = [
    'id', 'created_at', 'submission_id', 'name', 'company', 'phone',
    'email', 'subject', 'message', 'attachments', 'status'
  ].join(',');
  const endpoint = `${supabaseUrl}/rest/v1/${tableName}?select=${columns}&order=created_at.desc`;
  const response = await fetch(endpoint, { headers: apiHeaders({ Accept: 'application/json' }) });
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Supabase 조회 실패 (${response.status}): ${detail}`);
  }
  return response.json();
}

function recordFolderName(record) {
  return `${record.id}_${safeFileName(record.name).slice(0, 50)}`;
}

function readLocalEntries() {
  ensureFolders();
  const records = [];
  for (const entry of fs.readdirSync(inquiryRoot, { withFileTypes: true })) {
    if (!entry.isDirectory() || entry.name.startsWith('.tmp-') || entry.name.includes('.backup-')) continue;
    const folder = path.join(inquiryRoot, entry.name);
    const dataPath = path.join(folder, 'data.json');
    if (!fs.existsSync(dataPath)) continue;
    try {
      const record = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
      record.__localFolder = folder;
      record.__folderName = entry.name;
      record.__backupComplete = isBackupComplete(record);
      records.push(record);
    } catch {
      // 손상된 폴더는 목록에서 제외하고 원본 파일은 그대로 둡니다.
    }
  }
  return records;
}

function isBackupComplete(record) {
  if (!record || !record.__localFolder) return false;
  const files = Array.isArray(record.local_attachments) ? record.local_attachments : [];
  return files.every((relativePath) => fs.existsSync(path.join(record.__localFolder, relativePath)));
}

function findLocalById(id) {
  return readLocalEntries().find((record) => String(record.id) === String(id));
}

function deleteLocalInquiry(id) {
  const local = findLocalById(id);
  if (!local || !local.__localFolder) throw new Error('PC에서 해당 보관 문의를 찾지 못했습니다.');

  const targetFolder = path.resolve(local.__localFolder);
  const resolvedInquiryRoot = path.resolve(inquiryRoot);
  if (path.dirname(targetFolder) !== resolvedInquiryRoot || !fs.statSync(targetFolder).isDirectory()) {
    throw new Error('삭제할 PC 보관 폴더의 위치가 올바르지 않습니다.');
  }

  fs.rmSync(targetFolder, { recursive: true, force: false });
  rebuildLocalCsv();
}

function inquiryHtml(record) {
  const attachments = Array.isArray(record.local_attachments) ? record.local_attachments : [];
  const attachmentRows = attachments.length
    ? attachments.map((file) => `<li><a href="${encodeURI(file)}">${escapeHtml(path.basename(file))}</a></li>`).join('')
    : '<li>첨부파일 없음</li>';
  return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(record.subject || 'QDM 문의·견적 요청')}</title>
  <style>
    body{font-family:Arial,"Noto Sans KR",sans-serif;margin:0;padding:32px;background:#f5f7fb;color:#172033}
    main{max-width:900px;margin:auto;background:#fff;padding:30px;border:1px solid #dce3ee;border-radius:14px}
    h1{color:#06306f}.meta{color:#667085}table{width:100%;border-collapse:collapse;margin-top:22px}
    th,td{border:1px solid #dce3ee;padding:12px;text-align:left;vertical-align:top}th{width:150px;background:#f1f5fb}
    .message{white-space:pre-wrap}a{color:#0b4fb3}
  </style>
</head>
<body><main>
  <h1>QDM 문의·견적 요청</h1>
  <p class="meta">접수번호 ${escapeHtml(record.id)} · ${escapeHtml(record.created_at || '')}</p>
  <table>
    <tr><th>이름</th><td>${escapeHtml(record.name)}</td></tr>
    <tr><th>회사명</th><td>${escapeHtml(record.company)}</td></tr>
    <tr><th>연락처</th><td>${escapeHtml(record.phone)}</td></tr>
    <tr><th>이메일</th><td>${escapeHtml(record.email)}</td></tr>
    <tr><th>문의 제목</th><td>${escapeHtml(record.subject)}</td></tr>
    <tr><th>문의 내용</th><td class="message">${escapeHtml(record.message)}</td></tr>
    <tr><th>첨부파일</th><td><ul>${attachmentRows}</ul></td></tr>
  </table>
</main></body></html>`;
}

async function fetchStorageObject(objectPath) {
  const endpoint = `${supabaseUrl}/storage/v1/object/${encodeURIComponent(storageBucket)}/${encodedObjectPath(objectPath)}`;
  const response = await fetch(endpoint, { headers: apiHeaders() });
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`첨부파일 다운로드 실패 (${response.status}): ${detail}`);
  }
  return Buffer.from(await response.arrayBuffer());
}

async function saveInquiryLocal(record) {
  ensureFolders();
  const existing = findLocalById(record.id);
  if (existing && existing.__backupComplete) return existing;

  const finalFolder = path.join(inquiryRoot, recordFolderName(record));
  const tempFolder = path.join(inquiryRoot, `.tmp-${record.id}-${Date.now()}`);
  fs.mkdirSync(tempFolder, { recursive: true });

  try {
    const localAttachments = [];
    const attachments = Array.isArray(record.attachments) ? record.attachments : [];
    if (attachments.length) fs.mkdirSync(path.join(tempFolder, 'attachments'), { recursive: true });

    for (let index = 0; index < attachments.length; index += 1) {
      const attachment = attachments[index];
      if (!attachment || !attachment.path) continue;
      const localName = `${index + 1}_${safeFileName(attachment.name || path.basename(attachment.path))}`;
      const relativePath = path.join('attachments', localName);
      const buffer = await fetchStorageObject(attachment.path);
      fs.writeFileSync(path.join(tempFolder, relativePath), buffer);
      localAttachments.push(relativePath);
    }

    const localRecord = {
      ...record,
      backed_up_at: new Date().toISOString(),
      local_attachments: localAttachments
    };
    fs.writeFileSync(path.join(tempFolder, 'data.json'), JSON.stringify(localRecord, null, 2), 'utf8');
    fs.writeFileSync(path.join(tempFolder, 'inquiry.html'), inquiryHtml(localRecord), 'utf8');

    if (fs.existsSync(finalFolder)) {
      const previousFolder = `${finalFolder}.backup-${timestamp()}`;
      fs.renameSync(finalFolder, previousFolder);
    }
    fs.renameSync(tempFolder, finalFolder);
    rebuildLocalCsv();
    return findLocalById(record.id);
  } catch (error) {
    fs.rmSync(tempFolder, { recursive: true, force: true });
    throw error;
  }
}

function rebuildLocalCsv() {
  ensureFolders();
  const records = readLocalEntries().sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)));
  const headers = ['접수번호', '접수일시', '이름', '회사명', '연락처', '이메일', '문의제목', '문의내용', '첨부파일', '백업일시'];
  const rows = records.map((record) => [
    record.id, record.created_at, record.name, record.company, record.phone,
    record.email, record.subject, record.message, record.local_attachments || [], record.backed_up_at
  ]);
  const csv = [headers, ...rows].map((row) => row.map(csvCell).join(',')).join('\r\n');
  const csvPath = path.join(dataRoot, 'qdm_inquiries.csv');
  if (fs.existsSync(csvPath)) {
    fs.copyFileSync(csvPath, path.join(backupRoot, `qdm_inquiries_${timestamp()}.csv`));
  }
  fs.writeFileSync(csvPath, `\uFEFF${csv}`, 'utf8');
}

async function deleteStorageObject(objectPath) {
  if (!objectPath) return;
  const endpoint = `${supabaseUrl}/storage/v1/object/${encodeURIComponent(storageBucket)}`;
  const response = await fetch(endpoint, {
    method: 'DELETE',
    headers: apiHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ prefixes: [objectPath] })
  });
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Supabase 첨부파일 삭제 실패 (${response.status}): ${detail}`);
  }
}

async function deleteRemoteInquiry(id) {
  const local = findLocalById(id);
  if (!local || !local.__backupComplete) {
    throw new Error('첨부파일까지 로컬 백업이 완료된 문의만 Supabase에서 삭제할 수 있습니다.');
  }

  const remote = (await fetchRemoteInquiries()).find((record) => String(record.id) === String(id));
  if (!remote) throw new Error('Supabase에서 해당 문의를 찾지 못했습니다.');

  for (const attachment of Array.isArray(remote.attachments) ? remote.attachments : []) {
    await deleteStorageObject(attachment.path);
  }

  const endpoint = `${supabaseUrl}/rest/v1/${tableName}?id=eq.${encodeURIComponent(id)}`;
  const response = await fetch(endpoint, {
    method: 'DELETE',
    headers: apiHeaders({ Prefer: 'return=minimal' })
  });
  if (!response.ok) {
    const detail = await response.text();
    throw new Error(`Supabase 문의 삭제 실패 (${response.status}): ${detail}`);
  }
}

function summary(record) {
  return {
    id: record.id,
    created_at: record.created_at,
    name: record.name || '',
    company: record.company || '',
    phone: record.phone || '',
    email: record.email || '',
    subject: record.subject || '',
    message: record.message || '',
    attachments: Array.isArray(record.attachments) ? record.attachments : [],
    local_attachments: Array.isArray(record.local_attachments) ? record.local_attachments : [],
    backed_up_at: record.backed_up_at || '',
    status: record.status || 'new'
  };
}

async function combinedInquiries() {
  const local = readLocalEntries();
  let remote = [];
  let remoteError = '';
  try {
    remote = await fetchRemoteInquiries();
  } catch (error) {
    remoteError = error.message;
  }

  const localMap = new Map(local.map((record) => [String(record.id), record]));
  const remoteMap = new Map(remote.map((record) => [String(record.id), record]));
  const ids = new Set([...localMap.keys(), ...remoteMap.keys()]);
  const inquiries = [...ids].map((id) => {
    const localRecord = localMap.get(id);
    const remoteRecord = remoteMap.get(id);
    const record = remoteRecord || localRecord;
    return {
      ...summary(record),
      source: remoteRecord && localRecord ? 'both' : remoteRecord ? 'remote' : 'local',
      backupComplete: Boolean(localRecord && localRecord.__backupComplete)
    };
  }).sort((a, b) => String(b.created_at).localeCompare(String(a.created_at)));

  return {
    inquiries,
    remoteCount: remote.length,
    localCount: local.length,
    remoteError
  };
}

async function handleApi(req, res, pathname) {
  if (req.method === 'GET' && pathname === '/api/config') {
    return json(res, 200, {
      adminVersion: 2,
      projectRef: new URL(supabaseUrl).hostname.split('.')[0],
      hasSecretKey: Boolean(secretKey)
    });
  }

  if (req.method === 'GET' && pathname === '/api/inquiries') {
    return json(res, 200, await combinedInquiries());
  }

  if (req.method === 'POST' && pathname === '/api/inquiries/backup') {
    const body = await readBody(req);
    const record = (await fetchRemoteInquiries()).find((item) => String(item.id) === String(body.id));
    if (!record) throw new Error('Supabase에서 해당 문의를 찾지 못했습니다.');
    await saveInquiryLocal(record);
    return json(res, 200, { ok: true });
  }

  if (req.method === 'POST' && pathname === '/api/inquiries/backup-all') {
    const records = await fetchRemoteInquiries();
    let count = 0;
    for (const record of records) {
      await saveInquiryLocal(record);
      count += 1;
    }
    rebuildLocalCsv();
    return json(res, 200, { ok: true, count });
  }

  if (req.method === 'POST' && pathname === '/api/inquiries/delete-remote') {
    const body = await readBody(req);
    await deleteRemoteInquiry(body.id);
    return json(res, 200, { ok: true });
  }

  if (req.method === 'POST' && pathname === '/api/inquiries/delete-local') {
    const body = await readBody(req);
    deleteLocalInquiry(body.id);
    return json(res, 200, { ok: true });
  }

  if (req.method === 'POST' && pathname === '/api/inquiries/delete-backed-up') {
    const records = await fetchRemoteInquiries();
    let count = 0;
    for (const record of records) {
      const local = findLocalById(record.id);
      if (!local || !local.__backupComplete) continue;
      await deleteRemoteInquiry(record.id);
      count += 1;
    }
    return json(res, 200, { ok: true, count });
  }

  return json(res, 404, { message: 'API 경로를 찾지 못했습니다.' });
}

function serveStatic(res, pathname) {
  let relativePath;
  try {
    relativePath = decodeURIComponent(pathname === '/' ? '/index.html' : pathname);
  } catch {
    return text(res, 400, '잘못된 경로입니다.');
  }
  const filePath = path.resolve(adminRoot, `.${relativePath}`);
  if (!filePath.startsWith(`${adminRoot}${path.sep}`)) return text(res, 403, '접근할 수 없습니다.');
  if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) return text(res, 404, '파일을 찾지 못했습니다.');
  const types = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.json': 'application/json; charset=utf-8'
  };
  res.writeHead(200, {
    'Content-Type': types[path.extname(filePath).toLowerCase()] || 'application/octet-stream',
    'Cache-Control': 'no-store'
  });
  fs.createReadStream(filePath).pipe(res);
}

ensureFolders();

const server = http.createServer(async (req, res) => {
  const host = String(req.headers.host || '');
  if (!/^((127\.0\.0\.1)|(localhost)):\d+$/.test(host)) return text(res, 403, '로컬 접속만 허용됩니다.');
  const requestUrl = new URL(req.url, `http://${host}`);
  try {
    if (requestUrl.pathname.startsWith('/api/')) {
      await handleApi(req, res, requestUrl.pathname);
    } else {
      serveStatic(res, requestUrl.pathname);
    }
  } catch (error) {
    json(res, 500, { message: error.message || '처리 중 오류가 발생했습니다.' });
  }
});

server.listen(port, '127.0.0.1', () => {
  const localUrl = `http://127.0.0.1:${port}`;
  console.log(`QDM local admin: ${localUrl}`);
  if (process.env.QDM_NO_OPEN !== '1') {
    execFile('cmd.exe', ['/c', 'start', '', localUrl], { windowsHide: true });
  }
});
