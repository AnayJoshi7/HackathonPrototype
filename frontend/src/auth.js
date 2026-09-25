const SESSION_KEY = 'nlams.auth.session'

/** @typedef {'Project Authority'|'Revenue Officer'|'Legal Officer'|'Compensation Officer'} WorkspaceRole */
/** @typedef {{ id: string, label: WorkspaceRole, description: string }} AuthorizedWorkspace */
/** @typedef {{ id: string, email: string, displayName: string, roles: AuthorizedWorkspace[] }} AuthenticatedUser */

const roleCatalog = {
  'Project Authority': 'Manage infrastructure projects, acquisition progress and overall project status.',
  'Revenue Officer': 'Review land records, ownership history and parcel verification.',
  'Legal Officer': 'Track disputes, court status and affected parcels.',
  'Compensation Officer': 'Review valuation, compensation and payment status.'
}

const demoUsers = {
  'revenue@nic.in': ['Project Authority', 'Revenue Officer', 'Legal Officer', 'Compensation Officer'],
  'legal@nic.in': ['Legal Officer'],
  'pending@nic.in': []
}

export function filterAuthorizedRoles(labels) {
  return labels
    .filter(label => Object.prototype.hasOwnProperty.call(roleCatalog, label))
    .map(label => ({ id: label.toLowerCase().replaceAll(' ', '-'), label, description: roleCatalog[label] }))
}

/**
 * Replace this adapter with the authenticated API client when the identity service is available.
 * Roles are deliberately derived inside the trusted adapter and never accepted from form input.
 */
export async function authenticate(credentials) {
  await new Promise(resolve => globalThis.setTimeout(resolve, 250))
  const email = credentials.email.trim().toLowerCase()
  const roles = demoUsers[email]
  if (!email || !credentials.password) throw new Error('Enter your official email or user ID and password.')
  if (!roles) throw new Error('Authentication failed. Use an authorized demo identity or contact system support.')

  const user = {
    id: email,
    email,
    displayName: email.split('@')[0],
    roles: filterAuthorizedRoles(roles)
  }
  persistSession({ user, workspace: null })
  return user
}

export async function submitAccessRequest(details) {
  await new Promise(resolve => globalThis.setTimeout(resolve, 350))
  return { accepted: true, reference: `REQ-${Date.now().toString(36).toUpperCase()}`, details }
}

export function persistSession(session) {
  window.sessionStorage.setItem(SESSION_KEY, JSON.stringify(session))
}

export function readSession() {
  try {
    return JSON.parse(window.sessionStorage.getItem(SESSION_KEY) || 'null')
  } catch {
    return null
  }
}

export function setWorkspace(workspace) {
  const session = readSession()
  if (!isAuthorizedWorkspace(session?.user, workspace)) throw new Error('That workspace is not authorized for this user.')
  persistSession({ ...session, workspace })
}

export function isAuthorizedWorkspace(user, workspace) {
  return Boolean(user?.roles?.some(role => role.id === workspace?.id && role.label === workspace?.label))
}

export function clearSession() {
  window.sessionStorage.removeItem(SESSION_KEY)
}

export function getLandingPath(user) {
  if (!user?.roles?.length) return '/login'
  return user.roles.length === 1 ? '/dashboard' : '/workspace'
}

export function validateAccessRequest(details) {
  const requiredFields = ['fullName', 'email', 'employeeId', 'department', 'designation', 'authority']
  const missing = requiredFields.filter(field => !details[field]?.trim())
  if (missing.length) return 'Complete all official details before submitting your request.'
  if (!/^\S+@\S+\.\S+$/.test(details.email)) return 'Enter a valid official email address.'
  return ''
}

export { roleCatalog }
