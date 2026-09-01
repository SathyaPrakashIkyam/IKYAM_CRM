import { useEffect, useState } from 'react'
import AppShell from '../components/AppShell'
import { rolesApi } from '../api/endpoints'
import '../styles/ikyam-mock.css'
import './RoleManagement.css'

const ACTION_LABELS = {
  view: 'View',
  create: 'Create',
  edit: 'Edit',
  delete: 'Delete',
  approve: 'Approve',
  export: 'Export',
  import: 'Import',
}
// Fixed display order only — which of these actually show up as columns is
// derived below from the real module list, not assumed. If nothing in this
// backend ever supports e.g. Export, that column never renders at all.
const ACTION_ORDER = ['view', 'create', 'edit', 'delete', 'approve', 'export', 'import']

// Mirrors backend roles/role_modules.py's COMPANY_ADMIN_LOCKED_MODULES —
// the server re-applies this floor on every save regardless of what gets
// submitted, so these render as permanently on rather than let an admin
// think they can uncheck them and then be surprised when they don't stay
// off. Kept in sync by hand since it's a tiny, rarely-changed list.
const COMPANY_ADMIN_LOCKED_MODULES = ['PRODUCTS', 'USER_MGMT', 'SETTINGS', 'ROLE_MGMT']

export default function RoleManagement() {
  const [roles, setRoles] = useState([])
  const [modules, setModules] = useState([])
  const [search, setSearch] = useState('')
  const [selectedRoleId, setSelectedRoleId] = useState(null)
  const [permissions, setPermissions] = useState({})
  const [showNewRole, setShowNewRole] = useState(false)
  const [newRoleName, setNewRoleName] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [saveOk, setSaveOk] = useState(false)

  function load() {
    rolesApi.list().then((list) => {
      setRoles(list)
      if (!selectedRoleId && list.length > 0) {
        selectRole(list[0])
      }
    })
    rolesApi.modules().then(setModules)
  }

  useEffect(load, [])

  function selectRole(role) {
    setSelectedRoleId(role.id)
    setPermissions(role.permissions || {})
    setSaveError('')
    setSaveOk(false)
  }

  const selectedRole = roles.find((r) => r.id === selectedRoleId) || null
  const isCompanyAdminRole = selectedRole?.name === 'Company Admin'
  const isLocked = (moduleCode) => isCompanyAdminRole && COMPANY_ADMIN_LOCKED_MODULES.includes(moduleCode)

  // Only show a column for an action if some real module actually supports
  // it — e.g. nothing in this app has Export/Import yet, so those columns
  // simply don't exist rather than showing as a wall of dashes.
  const visibleActions = ACTION_ORDER.filter((a) => modules.some((m) => m.actions.includes(a)))

  const filteredRoles = roles.filter((r) => r.name.toLowerCase().includes(search.toLowerCase()))

  function toggle(moduleCode, action) {
    if (isLocked(moduleCode)) return // Company Admin's floor — always on, can't be unchecked
    setPermissions((prev) => ({
      ...prev,
      [moduleCode]: {
        ...prev[moduleCode],
        [action]: !prev[moduleCode]?.[action],
      },
    }))
  }

  function selectAll() {
    const next = {}
    modules.forEach((m) => {
      next[m.module_code] = {}
      m.actions.forEach((a) => { next[m.module_code][a] = true })
    })
    setPermissions(next)
  }

  function clearAll() {
    const next = {}
    modules.forEach((m) => {
      next[m.module_code] = {}
      // Company Admin's locked modules stay on even through Clear All —
      // the server would put them right back anyway on save.
      m.actions.forEach((a) => { next[m.module_code][a] = !isLocked(m.module_code) ? false : true })
    })
    setPermissions(next)
  }

  function cancelChanges() {
    if (selectedRole) setPermissions(selectedRole.permissions || {})
  }

  async function savePermissions() {
    if (!selectedRole) return
    setSaving(true)
    setSaveError('')
    setSaveOk(false)
    try {
      const updated = await rolesApi.update(selectedRole.id, { permissions })
      setRoles((prev) => prev.map((r) => (r.id === updated.id ? updated : r)))
      // The server re-applies Company Admin's locked floor on every save —
      // reflect exactly what it actually persisted, not just what we sent.
      setPermissions(updated.permissions || {})
      setSaveOk(true)
      setTimeout(() => setSaveOk(false), 2500)
    } catch (err) {
      setSaveError(
        err.response?.data?.detail || err.message || 'Could not save — please try again.'
      )
    } finally {
      setSaving(false)
    }
  }

  async function createRole(e) {
    e.preventDefault()
    if (!newRoleName.trim()) return
    setSaveError('')
    try {
      const created = await rolesApi.create({ name: newRoleName.trim(), permissions: {} })
      setRoles((prev) => [...prev, created])
      setNewRoleName('')
      setShowNewRole(false)
      selectRole(created)
    } catch (err) {
      setSaveError(err.response?.data?.detail || err.message || 'Could not create role.')
    }
  }

  async function removeRole(role) {
    if (role.is_system) return
    setSaveError('')
    try {
      await rolesApi.remove(role.id)
      setRoles((prev) => prev.filter((r) => r.id !== role.id))
      if (selectedRoleId === role.id) setSelectedRoleId(null)
    } catch (err) {
      setSaveError(err.response?.data?.detail || err.message || 'Could not delete role.')
    }
  }

  return (
    <AppShell>
      <div className="ikyam-mock role-mgmt-page">
        <div className="role-mgmt-grid">
          <div className="card role-mgmt-rolelist">
            <div className="role-mgmt-header">
              <div className="role-mgmt-icon">🛡</div>
              <div>
                <b style={{ font: '700 16px var(--d)' }}>Role Master &amp; Permissions</b>
                <div className="tiny" style={{ marginTop: 3, color: 'var(--mut)' }}>
                  Create custom roles and configure module-level access permissions for each role.
                </div>
              </div>
            </div>

            <div className="rowx sp" style={{ margin: '14px 0 10px' }}>
              <span className="tiny">All Roles <b className="chip">{roles.length}</b></span>
              <button className="btn pri" style={{ padding: '6px 12px' }} onClick={() => setShowNewRole((v) => !v)}>＋ Create New Role</button>
            </div>

            {showNewRole && (
              <form className="rowx" style={{ marginBottom: 10, gap: 6 }} onSubmit={createRole}>
                <input value={newRoleName} onChange={(e) => setNewRoleName(e.target.value)} placeholder="New role name…" style={roleInput} />
                <button className="btn pri" style={{ padding: '6px 11px' }}>Save</button>
              </form>
            )}

            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search roles…"
              style={{ ...roleInput, width: '100%', marginBottom: 10 }}
            />

            <div className="role-mgmt-list">
              {filteredRoles.map((role) => (
                <div
                  key={role.id}
                  className={`role-mgmt-row ${selectedRoleId === role.id ? 'sel' : ''}`}
                  onClick={() => selectRole(role)}
                >
                  <div className="role-mgmt-row-icon">🛡</div>
                  <div style={{ flex: 1 }}>
                    <div className="rowx" style={{ gap: 6 }}>
                      <b style={{ fontSize: 13 }}>{role.name}</b>
                      <span className={`chip ${role.is_system ? '' : 'ok'}`} style={{ fontSize: 9.5 }}>
                        {role.is_system ? 'SYSTEM' : 'CUSTOM'}
                      </span>
                    </div>
                    <div className="tiny" style={{ color: 'var(--green-ink)' }}>● Active</div>
                  </div>
                  {!role.is_system && (
                    <span className="role-mgmt-delete" onClick={(e) => { e.stopPropagation(); removeRole(role) }} title="Delete role">🗑</span>
                  )}
                </div>
              ))}
              {filteredRoles.length === 0 && <div className="tiny" style={{ padding: 10 }}>No roles found.</div>}
            </div>
          </div>

          <div className="card role-mgmt-permissions">
            {!selectedRole ? (
              <div className="tiny" style={{ padding: 20 }}>Select a role to configure its permissions.</div>
            ) : (
              <>
                <div className="rowx sp" style={{ flexWrap: 'wrap', gap: 10 }}>
                  <div className="rowx" style={{ gap: 10 }}>
                    <div className="role-mgmt-icon">🛡</div>
                    <div>
                      <b style={{ font: '700 15px var(--d)' }}>Module Permissions</b>
                      <div className="tiny" style={{ color: 'var(--mut)' }}>Enable or disable capabilities per module for {selectedRole.name}</div>
                    </div>
                  </div>
                  <div className="rowx" style={{ gap: 8, flexWrap: 'wrap' }}>
                    <button className="btn ghost" onClick={clearAll}>Clear All</button>
                    <button className="btn ghost" onClick={selectAll}>Select All</button>
                    <button className="btn ghost" onClick={cancelChanges}>Cancel</button>
                    <button className="btn pri" onClick={savePermissions} disabled={saving}>
                      {saving ? 'Saving…' : '💾 Save Role & Permissions'}
                    </button>
                  </div>
                </div>

                {isCompanyAdminRole && (
                  <div className="tiny" style={{ marginTop: 8, color: 'var(--mut)' }}>
                    🔒 Products, User Management, Settings and Role Management stay permanently on for Company
                    Admin — they can't be revoked, so an admin can never get locked out of the app.
                  </div>
                )}
                {saveError && (
                  <div className="tiny" style={{ marginTop: 8, color: 'var(--orange-ink)' }}>⚠ {saveError}</div>
                )}
                {saveOk && (
                  <div className="tiny" style={{ marginTop: 8, color: 'var(--green-ink)' }}>✓ Saved</div>
                )}

                <div className="role-mgmt-table-wrap">
                  <table className="role-mgmt-table">
                    <thead>
                      <tr>
                        <th>Module</th>
                        {visibleActions.map((a) =><th key={a}>{ACTION_LABELS[a]}</th>)}
                      </tr>
                    </thead>
                    <tbody>
                      {modules.map((m) => (
                        <tr key={m.module_code}>
                          <td>
                            <b style={{ fontSize: 12.5 }}>{m.module_name}</b>
                            {isLocked(m.module_code) && <span title="Always on for Company Admin" style={{ marginLeft: 5 }}>🔒</span>}
                            <div className="tiny" style={{ color: 'var(--mut)' }}>{m.description}</div>
                          </td>
                          {visibleActions.map((a) =>(
                            <td key={a} className="role-mgmt-cell">
                              {m.actions.includes(a) ? (
                                <input
                                  type="checkbox"
                                  checked={!!permissions[m.module_code]?.[a]}
                                  disabled={isLocked(m.module_code)}
                                  title={isLocked(m.module_code) ? 'Always on for Company Admin' : undefined}
                                  onChange={() => toggle(m.module_code, a)}
                                />
                              ) : (
                                <span className="tiny" style={{ color: 'var(--faint)' }}>—</span>
                              )}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  )
}

const roleInput = {
  padding: '7px 10px', border: '1px solid var(--line)', borderRadius: 8,
  background: 'var(--surface)', color: 'var(--ink)', font: '500 12.5px var(--b)',
}
