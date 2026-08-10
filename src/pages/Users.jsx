import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import AppShell from '../components/AppShell'
import { usersApi } from '../api/endpoints'

export default function Users() {
  const [members, setMembers] = useState([])
  const [showInvite, setShowInvite] = useState(false)
  const [invite, setInvite] = useState({ full_name: '', email: '', role_name: 'Sales Rep' })
  const [error, setError] = useState('')
  const navigate = useNavigate()

  function load() {
    usersApi.list().then(setMembers).catch(() => {})
  }

  useEffect(load, [])

  async function sendInvite(e) {
    e.preventDefault()
    setError('')
    try {
      await usersApi.invite(invite)
      setInvite({ full_name: '', email: '', role_name: 'Sales Rep' })
      setShowInvite(false)
      load()
    } catch (err) {
      setError(err.response?.data?.detail || 'Could not send invite')
    }
  }

  return (
    <AppShell>
      <div className="scr-head">
        <h2>User management</h2>
        <span className="goal">Invite teammates and manage their access.</span>
      </div>

      <div className="rowx sp" style={{ marginBottom: 12 }}>
        <b style={{ font: '600 13px var(--d)' }}>Members · {members.length}</b>
        <button className="btn pri" onClick={() => setShowInvite((v) => !v)}>＋ Invite user</button>
      </div>

      {showInvite && (
        <div className="card" style={{ marginBottom: 14 }}>
          <b style={{ fontSize: 12.5 }}>Invite a teammate</b>
          {error && <div className="chip risk" style={{ marginTop: 6 }}>{error}</div>}
          <form onSubmit={sendInvite}>
            <div className="grid" style={{ gridTemplateColumns: '1fr 1fr 1fr', gap: 10, marginTop: 8 }}>
              <input required placeholder="Full name" value={invite.full_name}
                onChange={(e) => setInvite({ ...invite, full_name: e.target.value })} style={fieldInput} />
              <input required type="email" placeholder="Work email" value={invite.email}
                onChange={(e) => setInvite({ ...invite, email: e.target.value })} style={fieldInput} />
              <select value={invite.role_name} onChange={(e) => setInvite({ ...invite, role_name: e.target.value })} style={fieldInput}>
                <option>Sales Rep</option>
                <option>Manager</option>
                <option>Admin</option>
              </select>
            </div>
            <div className="rowx sp" style={{ marginTop: 9 }}>
              <span />
              <span className="rowx">
                <button type="button" className="btn ghost" onClick={() => setShowInvite(false)}>Cancel</button>
                <button className="btn pri">Send invite</button>
              </span>
            </div>
          </form>
        </div>
      )}

      <table className="qtable">
        <thead>
          <tr><th>Member</th><th>Role</th><th>Status</th><th></th></tr>
        </thead>
        <tbody>
          {members.map((m) => (
            <tr key={m.membership_id}>
              <td>
                <div className="rowx">
                  <span className="av a">{initials(m.full_name)}</span>
                  <div><b style={{ fontSize: 12.5 }}>{m.full_name}</b><div className="tiny">{m.email}</div></div>
                </div>
              </td>
              <td>{m.roles.map((r) => <span key={r} className="chip brand" style={{ marginRight: 4 }}>{r}</span>)}</td>
              <td>
                <span className={`chip ${m.status === 'active' ? 'ok' : m.status === 'invited' ? 'warn' : 'risk'}`}>
                  {m.status}
                </span>
              </td>
              <td>
                {m.status === 'invited' && (
                  <button className="btn ghost" onClick={() => usersApi.resendInvite(m.membership_id).then(load)}>Resend</button>
                )}
                {m.status === 'active' && !m.is_owner && (
                  <button className="btn ghost" onClick={() => usersApi.disable(m.membership_id).then(load)}>Disable</button>
                )}
                {m.status === 'disabled' && (
                  <button className="btn ghost" onClick={() => usersApi.enable(m.membership_id).then(load)}>Re-enable</button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="rowx sp" style={{ marginTop: 20 }}>
        <span />
        <button className="btn pri" onClick={() => navigate('/today')}>Team set up → Continue</button>
      </div>
    </AppShell>
  )
}

function initials(name) {
  return (name || '?').split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()
}

const fieldInput = {
  padding: '7px 9px', border: '1px solid var(--line)', borderRadius: 8,
  background: 'var(--surface)', color: 'var(--ink)', font: '500 12.5px var(--b)',
}
