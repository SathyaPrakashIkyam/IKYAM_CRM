// Builds deep links that open a real meeting invite or email compose window
// in the user's chosen provider, prefilled from a CRM activity.
// No backend call involved — these are plain URLs opened with window.open().

function pad(n) {
  return String(n).padStart(2, '0')
}

function toCompactIso(date) {
  // Outlook deep link wants YYYY-MM-DDTHH:mm:ss with NO timezone suffix — and
  // critically, Outlook reads that string as wall-clock time in the viewer's
  // own calendar timezone, not UTC. So this must use the local get* getters
  // (not toISOString(), which is always UTC) or a time picked as, say,
  // 12:08 PM local ends up showing as 06:38 AM once Outlook renders it.
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `T${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
}

function toGoogleIso(date) {
  // Google Calendar wants YYYYMMDDTHHmmssZ
  return date.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
}

function meetingWindow(dueAt, durationMinutes = 30) {
  const start = dueAt ? new Date(dueAt) : new Date()
  const end = new Date(start.getTime() + durationMinutes * 60000)
  return { start, end }
}

export function buildGoogleMeetingLink(activity, attendeeEmail) {
  const { start, end } = meetingWindow(activity.due_at)
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: activity.subject || 'Meeting',
    dates: `${toGoogleIso(start)}/${toGoogleIso(end)}`,
    add: attendeeEmail || '',
  })
  return `https://calendar.google.com/calendar/render?${params.toString()}`
}

export function buildOutlookMeetingLink(activity, attendeeEmail) {
  const { start, end } = meetingWindow(activity.due_at)
  const params = new URLSearchParams({
    subject: activity.subject || 'Meeting',
    startdt: toCompactIso(start),
    enddt: toCompactIso(end),
    to: attendeeEmail || '',
  })
  return `https://outlook.office.com/calendar/0/deeplink/compose?${params.toString()}`
}

export function buildGmailComposeLink(activity, toEmail) {
  const params = new URLSearchParams({
    view: 'cm',
    fs: '1',
    to: toEmail || '',
    su: activity.subject || '',
  })
  return `https://mail.google.com/mail/?${params.toString()}`
}

export function buildOutlookComposeLink(activity, toEmail) {
  const params = new URLSearchParams({
    to: toEmail || '',
    subject: activity.subject || '',
  })
  return `https://outlook.office.com/mail/deeplink/compose?${params.toString()}`
}

// Guesses which calendar/mail provider the logged-in user is on, purely from
// their login email's domain. No account settings screen needed for this —
// gmail/googlemail addresses go to Google, everything else (incl. company
// domains on Microsoft 365, which is the common case for a work email) goes
// to Outlook/Teams.
export function detectProviderFromEmail(email) {
  if (!email) return 'outlook'
  const domain = email.split('@')[1]?.toLowerCase() || ''
  if (domain === 'gmail.com' || domain === 'googlemail.com') return 'google'
  return 'outlook'
}

// provider: 'google' | 'outlook'
export function openActivityInProvider(activity, provider, attendeeEmail) {
  let url
  if (activity.activity_type === 'meeting') {
    url = provider === 'outlook'
      ? buildOutlookMeetingLink(activity, attendeeEmail)
      : buildGoogleMeetingLink(activity, attendeeEmail)
  } else if (activity.activity_type === 'email') {
    url = provider === 'outlook'
      ? buildOutlookComposeLink(activity, attendeeEmail)
      : buildGmailComposeLink(activity, attendeeEmail)
  } else {
    return
  }
  window.open(url, '_blank', 'noopener,noreferrer')
}
