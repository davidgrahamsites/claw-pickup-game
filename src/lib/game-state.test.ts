import { describe, expect, it } from 'vitest'

import {
  createInitialGameState,
  dismissReveal,
  registerSuccessfulPickup,
} from './game-state'

describe('game state transitions', () => {
  it('removes a toy from the machine after its fullscreen reveal is dismissed', () => {
    const state = createInitialGameState({
      machineTitle: 'Class machine',
      toyIds: ['toy-a', 'toy-b'],
    })

    const afterPickup = registerSuccessfulPickup(state, 'toy-a')
    expect(afterPickup.activeRevealToyId).toBe('toy-a')
    expect(afterPickup.availableToyIds).toEqual(['toy-a', 'toy-b'])

    const afterDismiss = dismissReveal(afterPickup)

    expect(afterDismiss.activeRevealToyId).toBeNull()
    expect(afterDismiss.collectedToyIds).toEqual(['toy-a'])
    expect(afterDismiss.availableToyIds).toEqual(['toy-b'])
  })
})
