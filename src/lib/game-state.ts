export type GameState = {
  machineTitle: string
  availableToyIds: string[]
  collectedToyIds: string[]
  activeRevealToyId: string | null
}

export function createInitialGameState(input: {
  machineTitle: string
  toyIds: string[]
}): GameState {
  return {
    machineTitle: input.machineTitle,
    availableToyIds: [...input.toyIds],
    collectedToyIds: [],
    activeRevealToyId: null,
  }
}

export function registerSuccessfulPickup(
  state: GameState,
  toyId: string,
): GameState {
  if (!state.availableToyIds.includes(toyId)) {
    return state
  }

  return {
    ...state,
    activeRevealToyId: toyId,
  }
}

export function dismissReveal(state: GameState): GameState {
  if (!state.activeRevealToyId) {
    return state
  }

  return {
    ...state,
    availableToyIds: state.availableToyIds.filter(
      (toyId) => toyId !== state.activeRevealToyId,
    ),
    collectedToyIds: [...state.collectedToyIds, state.activeRevealToyId],
    activeRevealToyId: null,
  }
}
