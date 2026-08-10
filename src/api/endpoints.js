import api from './client'

// ---- Auth / onboarding ----------------------------------------------------

export const authApi = {
  createWorkspace: (body) => api.post('/auth/onboarding/workspace', body).then((r) => r.data),
  createCompany: (body) => api.post('/auth/onboarding/company', body).then((r) => r.data),
  login: (body) => api.post('/auth/login', body).then((r) => r.data),
  logout: () => api.post('/auth/logout'),
  me: () => api.get('/auth/me').then((r) => r.data),
}

export const companiesApi = {
  list: () => api.get('/companies').then((r) => r.data),
}

export const usersApi = {
  list: (companyId) => api.get('/users', { params: { company_id: companyId } }).then((r) => r.data),
  invite: (body) => api.post('/users/invite', body).then((r) => r.data),
  resendInvite: (membershipId) => api.post(`/users/${membershipId}/resend-invite`),
  disable: (membershipId) => api.post(`/users/${membershipId}/disable`),
  enable: (membershipId) => api.post(`/users/${membershipId}/enable`),
  roles: () => api.get('/users/roles').then((r) => r.data),
  updateRole: (roleId, permissions) => api.patch(`/users/roles/${roleId}`, { permissions }).then((r) => r.data),
  teams: () => api.get('/users/teams').then((r) => r.data),
  territories: () => api.get('/users/territories').then((r) => r.data),
}

export const leadsApi = {
  list: (companyId, statusFilter) =>
    api.get('/leads', { params: { company_id: companyId, status_filter: statusFilter } }).then((r) => r.data),
  create: (companyId, body) => api.post('/leads', body, { params: { company_id: companyId } }).then((r) => r.data),
  get: (id) => api.get(`/leads/${id}`).then((r) => r.data),
  disqualify: (id, reason) => api.post(`/leads/${id}/disqualify`, { reason }).then((r) => r.data),
  convert: (id, body) => api.post(`/leads/${id}/convert`, body || {}).then((r) => r.data),
}

export const accountsApi = {
  list: (companyId) => api.get('/accounts', { params: { company_id: companyId } }).then((r) => r.data),
  create: (companyId, body) => api.post('/accounts', body, { params: { company_id: companyId } }).then((r) => r.data),
  get: (id) => api.get(`/accounts/${id}`).then((r) => r.data),
  update: (id, body) => api.patch(`/accounts/${id}`, body).then((r) => r.data),
  contacts: (id) => api.get(`/accounts/${id}/contacts`).then((r) => r.data),
  opportunities: (id) => api.get(`/accounts/${id}/opportunities`).then((r) => r.data),
  quotes: (id) => api.get(`/accounts/${id}/quotes`).then((r) => r.data),
}

export const contactsApi = {
  list: (companyId) => api.get('/contacts', { params: { company_id: companyId } }).then((r) => r.data),
  create: (companyId, body) => api.post('/contacts', body, { params: { company_id: companyId } }).then((r) => r.data),
  get: (id) => api.get(`/contacts/${id}`).then((r) => r.data),
  update: (id, body) => api.patch(`/contacts/${id}`, body).then((r) => r.data),
}

export const opportunitiesApi = {
  kanban: (companyId) => api.get('/opportunities/kanban', { params: { company_id: companyId } }).then((r) => r.data),
  list: (companyId) => api.get('/opportunities', { params: { company_id: companyId } }).then((r) => r.data),
  create: (companyId, body) =>
    api.post('/opportunities', body, { params: { company_id: companyId } }).then((r) => r.data),
  get: (id) => api.get(`/opportunities/${id}`).then((r) => r.data),
  moveStage: (id, toStageId) =>
    api.post(`/opportunities/${id}/move-stage`, { to_stage_id: toStageId }).then((r) => r.data),
  close: (id, body) => api.post(`/opportunities/${id}/close`, body).then((r) => r.data),
}

export const quotesApi = {
  list: (companyId) => api.get('/quotes', { params: { company_id: companyId } }).then((r) => r.data),
  create: (companyId, body) => api.post('/quotes', body, { params: { company_id: companyId } }).then((r) => r.data),
  get: (id) => api.get(`/quotes/${id}`).then((r) => r.data),
  send: (id) => api.post(`/quotes/${id}/send`).then((r) => r.data),
  markAccepted: (id) => api.post(`/quotes/${id}/mark-accepted`).then((r) => r.data),
}

export const activitiesApi = {
  list: (companyId, params) =>
    api.get('/activities', { params: { company_id: companyId, ...params } }).then((r) => r.data),
  create: (companyId, body) =>
    api.post('/activities', body, { params: { company_id: companyId } }).then((r) => r.data),
  forRecord: (objectType, recordId) =>
    api.get(`/activities/for/${objectType}/${recordId}`).then((r) => r.data),
  complete: (id, outcome) => api.post(`/activities/${id}/complete`, { outcome }).then((r) => r.data),
  reopen: (id) => api.post(`/activities/${id}/reopen`).then((r) => r.data),
}

export const dashboardApi = {
  today: (companyId) => api.get('/dashboard/today', { params: { company_id: companyId } }).then((r) => r.data),
  quarter: (companyId) => api.get('/dashboard/quarter', { params: { company_id: companyId } }).then((r) => r.data),
}

export const reportsApi = {
  pipelineByStage: (companyId) =>
    api.get('/reports/pipeline-by-stage', { params: { company_id: companyId } }).then((r) => r.data),
  winLoss: (companyId) => api.get('/reports/win-loss', { params: { company_id: companyId } }).then((r) => r.data),
  leadsBySource: (companyId) =>
    api.get('/reports/leads-by-source', { params: { company_id: companyId } }).then((r) => r.data),
  save: (body) => api.post('/reports/save', body).then((r) => r.data),
  saved: () => api.get('/reports/saved').then((r) => r.data),
}

export const notificationsApi = {
  list: () => api.get('/notifications').then((r) => r.data),
  markRead: (id) => api.post(`/notifications/${id}/read`).then((r) => r.data),
  markAllRead: () => api.post('/notifications/mark-all-read'),
}

export const settingsApi = {
  getGeneral: () => api.get('/settings/general').then((r) => r.data),
  updateGeneral: (body) => api.patch('/settings/general', body).then((r) => r.data),
  customFields: () => api.get('/settings/custom-fields').then((r) => r.data),
  createCustomField: (body) => api.post('/settings/custom-fields', body).then((r) => r.data),
  apiKeys: () => api.get('/settings/api-keys').then((r) => r.data),
  createApiKey: (name) => api.post('/settings/api-keys', null, { params: { name } }).then((r) => r.data),
  revokeApiKey: (id) => api.post(`/settings/api-keys/${id}/revoke`),
  webhooks: () => api.get('/settings/webhooks').then((r) => r.data),
  createWebhook: (body) => api.post('/settings/webhooks', body).then((r) => r.data),
}

export const syncApi = {
  summary: () => api.get('/sync/summary').then((r) => r.data),
  failedJobs: () => api.get('/sync/jobs/failed').then((r) => r.data),
  retryJob: (id) => api.post(`/sync/jobs/${id}/retry`).then((r) => r.data),
  conflicts: () => api.get('/sync/conflicts').then((r) => r.data),
  resolveConflict: (id, resolution) =>
    api.post(`/sync/conflicts/${id}/resolve`, { resolution }).then((r) => r.data),
}
