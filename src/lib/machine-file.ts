export type TextContentBlock = {
  id: string
  type: 'text'
  title: string
  body: string
}

export type ImageContentBlock = {
  id: string
  type: 'image'
  label: string
  source: string
}

export type VideoContentBlock = {
  id: string
  type: 'video'
  label: string
  source: string
}

export type ToyContentBlock =
  | TextContentBlock
  | ImageContentBlock
  | VideoContentBlock

export type MachineToy = {
  id: string
  name: string
  color: string
  lane: number
  contents: ToyContentBlock[]
}

export type MachineDocument = {
  version: 1
  title: string
  subtitle: string
  createdAt: string
  toys: MachineToy[]
  session: {
    collectedToyIds: string[]
  }
}

function isContentBlock(value: unknown): value is ToyContentBlock {
  if (!value || typeof value !== 'object') {
    return false
  }

  const block = value as Record<string, unknown>

  if (typeof block.id !== 'string' || typeof block.type !== 'string') {
    return false
  }

  switch (block.type) {
    case 'text':
      return (
        typeof block.title === 'string' &&
        typeof block.body === 'string'
      )
    case 'image':
    case 'video':
      return (
        typeof block.label === 'string' &&
        typeof block.source === 'string'
      )
    default:
      return false
  }
}

function isMachineToy(value: unknown): value is MachineToy {
  if (!value || typeof value !== 'object') {
    return false
  }

  const toy = value as Record<string, unknown>

  return (
    typeof toy.id === 'string' &&
    typeof toy.name === 'string' &&
    typeof toy.color === 'string' &&
    typeof toy.lane === 'number' &&
    Array.isArray(toy.contents) &&
    toy.contents.every(isContentBlock)
  )
}

export function parseMachineDocument(serialized: string): MachineDocument {
  const parsed = JSON.parse(serialized) as Record<string, unknown>

  if (
    parsed.version !== 1 ||
    typeof parsed.title !== 'string' ||
    typeof parsed.subtitle !== 'string' ||
    typeof parsed.createdAt !== 'string' ||
    !Array.isArray(parsed.toys) ||
    !parsed.toys.every(isMachineToy) ||
    !parsed.session ||
    typeof parsed.session !== 'object'
  ) {
    throw new Error('Invalid machine document')
  }

  const session = parsed.session as Record<string, unknown>

  if (
    !Array.isArray(session.collectedToyIds) ||
    !session.collectedToyIds.every((value) => typeof value === 'string')
  ) {
    throw new Error('Invalid machine document session')
  }

  return {
    version: 1,
    title: parsed.title,
    subtitle: parsed.subtitle,
    createdAt: parsed.createdAt,
    toys: parsed.toys,
    session: {
      collectedToyIds: session.collectedToyIds,
    },
  }
}

export function serializeMachineDocument(document: MachineDocument): string {
  return JSON.stringify(document, null, 2)
}
