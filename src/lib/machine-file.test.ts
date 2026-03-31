import { describe, expect, it } from 'vitest'

import {
  parseMachineDocument,
  serializeMachineDocument,
  type MachineDocument,
} from './machine-file'

describe('machine document persistence', () => {
  it('round-trips a classroom machine with embedded toy content', () => {
    const machine: MachineDocument = {
      version: 1,
      title: 'Poetry lesson machine',
      subtitle: 'Pick a toy to reveal the prompt',
      createdAt: '2026-03-30T21:00:00.000Z',
      toys: [
        {
          id: 'poem-1',
          name: 'Haiku capsule',
          color: '#ff8a5b',
          lane: 0.3,
          contents: [
            {
              id: 'content-text',
              type: 'text',
              title: 'Prompt',
              body: 'Write a spring haiku in three lines.',
            },
            {
              id: 'content-image',
              type: 'image',
              label: 'Reference image',
              source: 'data:image/png;base64,abc123',
            },
          ],
        },
      ],
      session: {
        collectedToyIds: ['poem-1'],
      },
    }

    const serialized = serializeMachineDocument(machine)
    const restored = parseMachineDocument(serialized)

    expect(restored).toEqual(machine)
  })
})
