import test from 'node:test'
import assert from 'node:assert/strict'
import { filterAuthorizedRoles, getLandingPath, isAuthorizedWorkspace, roleCatalog, validateAccessRequest } from './auth.js'

test('landing path sends users to the right protected surface', () => {
  assert.equal(getLandingPath({ roles: [] }), '/login')
  assert.equal(getLandingPath({ roles: [{ id: 'legal-officer' }] }), '/dashboard')
  assert.equal(getLandingPath({ roles: [{ id: 'legal-officer' }, { id: 'revenue-officer' }] }), '/workspace')
  assert.equal(getLandingPath(null), '/login')
})

test('authenticated users without roles stay outside the dashboard flow', () => {
  assert.equal(getLandingPath({ roles: [] }), '/login')
})

test('access requests validate official fields without a role field', () => {
  assert.match(validateAccessRequest({}), /Complete all official details/)
  assert.match(validateAccessRequest({ fullName: 'A', email: 'bad', employeeId: '1', department: 'D', designation: 'O', authority: 'A' }), /valid official email/)
  assert.equal(validateAccessRequest({ fullName: 'A', email: 'a@nic.in', employeeId: '1', department: 'D', designation: 'O', authority: 'A' }), '')
  assert.deepEqual(Object.keys(roleCatalog), ['Project Authority', 'Revenue Officer', 'Legal Officer', 'Compensation Officer'])
})

test('only known roles from trusted auth data survive filtering', () => {
  const roles = filterAuthorizedRoles(['Revenue Officer', 'Self Assigned Admin', 'Legal Officer'])
  assert.deepEqual(roles.map(role => role.label), ['Revenue Officer', 'Legal Officer'])
  assert.equal(isAuthorizedWorkspace({ roles }, roles[0]), true)
  assert.equal(isAuthorizedWorkspace({ roles }, { id: 'admin', label: 'Self Assigned Admin' }), false)
})
