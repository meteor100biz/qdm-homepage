const nodemailer = require("nodemailer");

const MAX_LENGTHS = {
  name: 80,
  company: 100,
  phone: 40,
  email: 160,
  field: 80,
  subject: 160,
  message: 5000
};

function value(input, key) {
  return String(input?.[key] || "").trim().slice(0, MAX_LENGTHS[key] || 200);
}

function escapeHtml(input) {
  return String(input).replace(/[&<>"']/g, (character) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  })[character]);
}

function validEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

module.exports = async function handler(request, response) {
  if (request.method !== "POST") {
    response.setHeader("Allow", "POST");
    return response.status(405).json({ message: "POST 요청만 허용됩니다." });
  }

  if (Number(request.headers["content-length"] || 0) > 30000) {
    return response.status(413).json({ message: "문의 내용이 너무 큽니다." });
  }

  let body;
  try {
    body = typeof request.body === "string" ? JSON.parse(request.body) : request.body;
  } catch {
    return response.status(400).json({ message: "올바른 문의 데이터가 아닙니다." });
  }
  if (String(body?.website || "").trim()) {
    return response.status(200).json({ ok: true });
  }

  const startedAt = Number(body?.startedAt || 0);
  if (!startedAt || Date.now() - startedAt < 2000) {
    return response.status(400).json({ message: "입력 내용을 확인한 후 다시 전송해주세요." });
  }

  const inquiry = Object.fromEntries(
    Object.keys(MAX_LENGTHS).map((key) => [key, value(body, key)])
  );

  if (!inquiry.name || !inquiry.phone || !inquiry.email || !inquiry.field || !inquiry.message) {
    return response.status(400).json({ message: "필수 항목을 모두 입력해주세요." });
  }
  if (!validEmail(inquiry.email)) {
    return response.status(400).json({ message: "이메일 주소를 확인해주세요." });
  }

  const smtpUser = String(process.env.DAUM_SMTP_USER || "").trim();
  const smtpPassword = String(process.env.DAUM_SMTP_APP_PASSWORD || "").trim();
  const from = String(process.env.CONTACT_FROM || "contact@qdm.co.kr").trim();
  const to = String(process.env.CONTACT_TO || "contact@qdm.co.kr").trim();
  if (!smtpUser || !smtpPassword) {
    console.error("Missing Daum SMTP environment variables");
    return response.status(503).json({ message: "메일 전송 설정이 완료되지 않았습니다." });
  }

  const transporter = nodemailer.createTransport({
    host: "smtp.daum.net",
    port: 465,
    secure: true,
    auth: { user: smtpUser, pass: smtpPassword }
  });

  const title = inquiry.subject || inquiry.field || "새 문의";
  const rows = [
    ["이름", inquiry.name],
    ["회사명", inquiry.company || "-"],
    ["연락처", inquiry.phone],
    ["회신 이메일", inquiry.email],
    ["문의 분야", inquiry.field],
    ["문의 제목", inquiry.subject || "-"]
  ];
  const text = `${rows.map(([label, content]) => `${label}: ${content}`).join("\n")}\n\n문의 내용\n${inquiry.message}`;
  const html = `<h2>QDM 홈페이지 문의</h2><table style="border-collapse:collapse">${rows.map(([label, content]) => `<tr><th style="padding:7px 12px;border:1px solid #ddd;text-align:left">${escapeHtml(label)}</th><td style="padding:7px 12px;border:1px solid #ddd">${escapeHtml(content)}</td></tr>`).join("")}</table><h3>문의 내용</h3><p style="white-space:pre-wrap">${escapeHtml(inquiry.message)}</p>`;

  try {
    await transporter.sendMail({
      from: `"QDM 홈페이지" <${from}>`,
      to,
      replyTo: inquiry.email,
      subject: `[QDM 홈페이지] ${title}`,
      text,
      html
    });
    return response.status(200).json({ ok: true });
  } catch (error) {
    console.error("Daum SMTP send failed", {
      code: error?.code,
      command: error?.command,
      responseCode: error?.responseCode,
      response: error?.response,
      message: error?.message
    });
    return response.status(500).json({ message: "메일 전송 중 오류가 발생했습니다." });
  }
};
