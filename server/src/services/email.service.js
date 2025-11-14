import nodemailer from 'nodemailer'

let transporter = null

function validateSmtpEnv() {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env
  return Boolean(SMTP_HOST && SMTP_PORT && SMTP_USER && SMTP_PASS)
}

function ensureTransporter() {
  if (transporter) return transporter
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_SECURE } = process.env
  if (!validateSmtpEnv()) return null
  transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT),
    secure: String(SMTP_SECURE||'true') === 'true',
    auth: { user: SMTP_USER, pass: SMTP_PASS }
  })
  return transporter
}

export async function sendEmail({ to, subject, text = '', html = '' }) {
  const from = process.env.MAIL_FROM || process.env.SMTP_USER
  const tx = ensureTransporter()
  if (!tx) {
    console.log('[email] skipped (missing SMTP env)', { to, subject })
    return { ok: false, skipped: true }
  }
  const maxAttempts = 3
  let lastErr = null
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const info = await tx.sendMail({ from, to, subject, text, html })
      return { ok: true, messageId: info.messageId }
    } catch (err) {
      lastErr = err
      const backoff = Math.min(2000 * attempt, 5000)
      if (attempt < maxAttempts) await new Promise(r => setTimeout(r, backoff))
    }
  }
  console.error('[email] failed after retries', { to, subject, error: String(lastErr) })
  return { ok: false, error: String(lastErr) }
}

// Simple templates for Milestone 4 notifications
export function renderEmailTemplate(type, data = {}) {
  const title = { due_reminder: 'Task due reminder', inactivity: 'Inactivity alert', health_alert: 'Project health alert' }[type] || (data.subject || 'Notification')
  const body = (() => {
    if (type === 'due_reminder') return `The task "${data.taskTitle||''}" is due ${data.when||'soon'}.`.
      replace(/\s+/g,' ').trim()
    if (type === 'inactivity') return `No updates on "${data.scope||'your tasks'}" for ${data.days||'some'} days.`
    if (type === 'health_alert') return data.message || 'Please review the project health metrics.'
    return data.text || ''
  })()
  const html = `
    <div style="font-family:Inter,Segoe UI,Arial,sans-serif;line-height:1.6;color:#111">
      <h2 style="margin:0 0 8px">${escapeHtml(title)}</h2>
      <p style="margin:0 0 12px">${escapeHtml(body)}</p>
      ${data.link ? `<p style="margin:0 0 12px"><a href="${escapeAttr(data.link)}" style="color:#4f46e5;text-decoration:none">Open in Taskmate</a></p>` : ''}
      <hr style="border:none;border-top:1px solid #eee;margin:16px 0"/>
      <div style="font-size:12px;color:#666">This is an automated message. Do not reply.</div>
    </div>`
  const text = `${title}\n\n${body}${data.link ? `\n\nOpen: ${data.link}` : ''}`
  return { subject: data.subject || title, text, html }
}

export async function sendTemplatedEmail(to, type, data = {}) {
  const t = renderEmailTemplate(type, data)
  return sendEmail({ to, subject: t.subject, text: t.text, html: t.html })
}

function escapeHtml(s='') { return String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c])) }
function escapeAttr(s='') { return String(s).replace(/"/g, '&quot;') }
