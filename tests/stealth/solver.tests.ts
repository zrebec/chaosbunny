import { describe, it, expect } from 'vitest'
import { fewestSightings, solve } from '../../src/stealth/solver.js'
import { testRoom } from './helpers.js'

describe('solve and fewestSightings', () => {
  it('answer null for a room with no way out', () => {
    const shut = testRoom(['#R#D'])
    expect(solve(shut)).toBeNull()
    expect(fewestSightings(shut)).toBeNull()
  })

  it('find the walk out of an empty room, unseen', () => {
    const room = testRoom(['#R..D'])
    expect(solve(room)).toHaveLength(3)
    expect(fewestSightings(room)).toBe(0)
  })

  it('count a ? that no way round avoids', () => {
    // A fox below looks straight up at the one cell under the door. Walls hide the approach,
    // nothing hides that cell: one beat in view, one ?, then out through the door.
    const room = testRoom(['###D###', '#R.....', '###.###', '###.###'], [{ route: [[3, 3]], facing: 'up' }])
    expect(solve(room)).toHaveLength(3)
    expect(fewestSightings(room)).toBe(1)
  })
})
