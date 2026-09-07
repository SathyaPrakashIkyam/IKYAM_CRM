import api from './client'

// ---- Auth / onboarding ----------------------------------------------------

export const authApi = {
  createWorkspace: (body) => api.post('/auth/onboarding/workspace', body).then((r) => r.data),
  createCompany: (body) => api.post('/auth/onboarding/company', body).then((r) => r.data),
  login: (body) => api.post('/user_master/login-authenticate', body).then((r) => r.data),
  logout: () => api.post('/user_master/logout'),
  me: () => api.get('/auth/me').then((r) => r.data),
}

export const onboardingApi = {
  getAllForms: () => api.get('/get_all_onboarding_forms').then((r) => r.data),
  addCompanyDetails: (body) => api.post('/add_company_details', body).then((r) => r.data),
  updateCompanyDetails: (onboardingId, body) =>
    api.put(`/update_company_details/${onboardingId}`, body).then((r) => r.data),
  approveCompanyDetails: (onboardingId) =>
    api.post(`/onboarding_company_details_approve_by_onboardingId/${onboardingId}`).then((r) => r.data),
  addOnboardingLogo: (onboardingId, formData) =>
    api
      .post(`/add_onboarding_logo/${onboardingId}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      .then((r) => r.data),
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

export const userMasterApi = {
  getAllUsers: (schemaId) =>
    api
      .get('/user_master/get_all_users', { params: { schema_id: schemaId || '' } })
      .then((r) => r.data),
  addUserMaster: (body) => api.post('/user_master/add-usermaster', body).then((r) => r.data),
  updateUserMaster: (userId, body) =>
    api.patch(`/user_master/update_user/${userId}`, body).then((r) => r.data),
  updateUserStatus: (userId, active) =>
    api.put(`/user_master/update_user_status/${userId}/${active}`).then((r) => r.data),
  adminChangePassword: (userId, newPassword) =>
    api
      .post('/user_master/admin/change_password', { user_id: userId, new_password: newPassword })
      .then((r) => r.data),
}

export const leadsApi = {
  list: (companyId, statusFilter) =>
    api.get('/leads', { params: { company_id: companyId, status_filter: statusFilter } }).then((r) => r.data),
  create: (companyId, body) => api.post('/leads', body, { params: { company_id: companyId } }).then((r) => r.data),
  update: (companyId, id, body) => api.put(`/leads/${id}`, body, { params: { company_id: companyId } }).then((r) => r.data),
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
  taxCodes: () => api.get('/quotes/meta/tax-codes').then((r) => r.data),
}

export const productGroupsApi = {
  list: () => api.get('/product-groups').then((r) => r.data),
  create: (body) => api.post('/product-groups', body).then((r) => r.data),
}

export const uomsApi = {
  list: () => api.get('/uoms').then((r) => r.data),
  create: (body) => api.post('/uoms', body).then((r) => r.data),
}

export const currenciesApi = {
  list: () => api.get('/currencies').then((r) => r.data),
  create: (body) => api.post('/currencies', body).then((r) => r.data),
}

export const productsApi = {
  list: (companyId) => api.get('/products', { params: { company_id: companyId } }).then((r) => r.data),
  create: (companyId, body) => api.post('/products', body, { params: { company_id: companyId } }).then((r) => r.data),
  get: (id) => api.get(`/products/${id}`).then((r) => r.data),
  update: (id, body) => api.patch(`/products/${id}`, body).then((r) => r.data),
  companySource: () => api.get('/products/meta/company-source').then((r) => r.data.source),
}

export const priceListsApi = {
  list: (companyId) => api.get('/price-lists', { params: { company_id: companyId } }).then((r) => r.data),
  create: (companyId, body) => api.post('/price-lists', body, { params: { company_id: companyId } }).then((r) => r.data),
  items: (priceListId) => api.get(`/price-lists/${priceListId}/items`).then((r) => r.data),
  setItem: (priceListId, body) => api.post(`/price-lists/${priceListId}/items`, body).then((r) => r.data),
  removeItem: (priceListId, productId) => api.delete(`/price-lists/${priceListId}/items/${productId}`),
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
  analytics: (companyId, period = 'this_quarter') =>
    api.get('/dashboard/analytics', { params: { company_id: companyId, period } }).then((r) => r.data),
}

export const reportsApi = {
  pipelineByStage: (companyId, period = 'all_time', owner = 'team') =>
    api.get('/reports/pipeline-by-stage', { params: { company_id: companyId, period, owner } }).then((r) => r.data),
  winLoss: (companyId, period = 'all_time', owner = 'team') =>
    api.get('/reports/win-loss', { params: { company_id: companyId, period, owner } }).then((r) => r.data),
  leadsBySource: (companyId, period = 'all_time', owner = 'team') =>
    api.get('/reports/leads-by-source', { params: { company_id: companyId, period, owner } }).then((r) => r.data),
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
}

export const syncApi = {
  summary: () => api.get('/sync/summary').then((r) => r.data),
  failedJobs: () => api.get('/sync/jobs/failed').then((r) => r.data),
  retryJob: (id) => api.post(`/sync/jobs/${id}/retry`).then((r) => r.data),
  conflicts: () => api.get('/sync/conflicts').then((r) => r.data),
  resolveConflict: (id, resolution) =>
    api.post(`/sync/conflicts/${id}/resolve`, { resolution }).then((r) => r.data),
  connections: () => api.get('/sync/connections').then((r) => r.data),
  fieldMappings: () => api.get('/sync/field-mappings').then((r) => r.data),
  watermarks: () => api.get('/sync/watermarks').then((r) => r.data),
}

export const rolesApi = {
  modules: () => api.get('/roles/modules').then((r) => r.data),
  list: () => api.get('/roles').then((r) => r.data),
  create: (body) => api.post('/roles', body).then((r) => r.data),
  update: (id, body) => api.patch(`/roles/${id}`, body).then((r) => r.data),
  remove: (id) => api.delete(`/roles/${id}`),
  myPermissions: () => api.get('/roles/my-permissions').then((r) => r.data),
}

export const aiChatApi = {
  // schemaId is only needed for a Super Admin managing a specific company's
  // keys — a Company Admin's own token already implies their schema, so
  // omitting it there just uses that.
  keys: (schemaId) => api.get('/ai/keys', { params: schemaId ? { schema_id: schemaId } : {} }).then((r) => r.data),
  addKey: (gemini_api_key, schemaId) =>
    api.post('/ai/keys', { gemini_api_key, ...(schemaId ? { schema_id: schemaId } : {}) }).then((r) => r.data),
  deactivateKey: (id, schemaId) =>
    api.delete(`/ai/keys/${id}`, { params: schemaId ? { schema_id: schemaId } : {} }),
  sessions: () => api.get('/ai/chat/sessions').then((r) => r.data),
  history: (sessionId) => api.get('/ai/chat/history', { params: { session_id: sessionId } }).then((r) => r.data),
}
