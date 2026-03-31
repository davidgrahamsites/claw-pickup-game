import { useEffect, useEffectEvent, useMemo, useRef, useState } from 'react'
import type { ChangeEvent } from 'react'
import './App.css'

import {
  createInitialGameState,
  dismissReveal,
  registerSuccessfulPickup,
  type GameState,
} from './lib/game-state'
import {
  parseMachineDocument,
  serializeMachineDocument,
  type MachineDocument,
  type MachineToy,
  type ToyContentBlock,
} from './lib/machine-file'
import { sampleMachineDocument } from './lib/sample-machine'

type AppMode = 'setup' | 'play'

type DesktopBridge = {
  loadMachineFile: () => Promise<{ canceled: boolean; data?: string }>
  saveMachineFile: (
    defaultName: string,
    data: string,
  ) => Promise<{ canceled: boolean; path?: string }>
}

declare global {
  interface Window {
    clawDesktop?: DesktopBridge
  }
}

const CATCH_THRESHOLD = 0.11

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '')
}

function createId(prefix: string) {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return `${prefix}-${crypto.randomUUID()}`
  }

  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`
}

function createTextBlock(): ToyContentBlock {
  return {
    id: createId('text'),
    type: 'text',
    title: 'Prompt title',
    body: 'Type the classroom prompt, reflection question, or instructions here.',
  }
}

function createImageBlock(): ToyContentBlock {
  return {
    id: createId('image'),
    type: 'image',
    label: 'Image reveal',
    source: '',
  }
}

function createVideoBlock(): ToyContentBlock {
  return {
    id: createId('video'),
    type: 'video',
    label: 'Video reveal',
    source: '',
  }
}

function createToy(block: ToyContentBlock): MachineToy {
  return {
    id: createId('toy'),
    name:
      block.type === 'text'
        ? 'Prompt Pod'
        : block.type === 'image'
          ? 'Picture Pod'
          : 'Video Pod',
    color:
      block.type === 'text'
        ? '#ff8a5b'
        : block.type === 'image'
          ? '#ffd166'
          : '#7fe7dc',
    lane: 0.5,
    contents: [block],
  }
}

function buildGameState(document: MachineDocument): GameState {
  const initial = createInitialGameState({
    machineTitle: document.title,
    toyIds: document.toys.map((toy) => toy.id),
  })

  return document.session.collectedToyIds.reduce((state, toyId) => {
    if (!state.availableToyIds.includes(toyId)) {
      return state
    }

    return {
      ...state,
      availableToyIds: state.availableToyIds.filter((id) => id !== toyId),
      collectedToyIds: [...state.collectedToyIds, toyId],
    }
  }, initial)
}

function getFirstAvailableLane(document: MachineDocument, state: GameState) {
  const firstAvailableToy = document.toys.find((toy) =>
    state.availableToyIds.includes(toy.id),
  )

  return firstAvailableToy?.lane ?? 0.5
}

function downloadTextFile(filename: string, contents: string) {
  const blob = new Blob([contents], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}

async function fileToDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(new Error('Unable to read the selected file'))
    reader.readAsDataURL(file)
  })
}

function App() {
  const [machineDocument, setMachineDocument] = useState<MachineDocument>(
    sampleMachineDocument,
  )
  const [mode, setMode] = useState<AppMode>('setup')
  const [gameState, setGameState] = useState<GameState>(() =>
    buildGameState(sampleMachineDocument),
  )
  const [clawLane, setClawLane] = useState(() =>
    getFirstAvailableLane(sampleMachineDocument, buildGameState(sampleMachineDocument)),
  )
  const [statusMessage, setStatusMessage] = useState(
    'Build your classroom machine, then switch into play mode.',
  )
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const activeRevealToy = useMemo(
    () =>
      machineDocument.toys.find((toy) => toy.id === gameState.activeRevealToyId) ?? null,
    [gameState.activeRevealToyId, machineDocument.toys],
  )

  const remainingToyCount = gameState.availableToyIds.length

  function syncDocument(document: MachineDocument, nextMode?: AppMode) {
    const nextGameState = buildGameState(document)
    const targetMode = nextMode ?? mode

    setMachineDocument(document)
    setGameState(nextGameState)
    setClawLane(getFirstAvailableLane(document, nextGameState))

    if (targetMode !== mode) {
      setMode(targetMode)
    }
  }

  function updateDocument(updater: (current: MachineDocument) => MachineDocument) {
    setMachineDocument((current) => {
      const next = updater(current)
      setGameState((previous) => {
        const rebuilt = buildGameState({
          ...next,
          session: {
            collectedToyIds:
              previous.collectedToyIds.length > 0
                ? previous.collectedToyIds.filter((toyId) =>
                    next.toys.some((toy) => toy.id === toyId),
                  )
                : next.session.collectedToyIds,
          },
        })
        setClawLane(getFirstAvailableLane(next, rebuilt))
        return rebuilt
      })
      return next
    })
  }

  function enterPlayMode() {
    const sessionReadyDocument = {
      ...machineDocument,
      session: { collectedToyIds: [] },
    }
    syncDocument(sessionReadyDocument, 'play')
    setStatusMessage('Use left/right and drop the claw to reveal a classroom surprise.')
  }

  function returnToSetup() {
    const sessionDocument = {
      ...machineDocument,
      session: { collectedToyIds: [...gameState.collectedToyIds] },
    }
    syncDocument(sessionDocument, 'setup')
    setStatusMessage('Back in setup mode. Adjust toys, then save a new classroom file.')
  }

  function resetSession() {
    syncDocument(
      {
        ...machineDocument,
        session: { collectedToyIds: [] },
      },
      'play',
    )
    setStatusMessage('Session reset. The machine is full again.')
  }

  function handleDropClaw() {
    if (activeRevealToy) {
      return
    }

    const availableToys = machineDocument.toys.filter((toy) =>
      gameState.availableToyIds.includes(toy.id),
    )

    if (availableToys.length === 0) {
      setStatusMessage('Every toy has already been collected. Reset the session to play again.')
      return
    }

    const nearestToy = [...availableToys].sort(
      (left, right) => Math.abs(left.lane - clawLane) - Math.abs(right.lane - clawLane),
    )[0]

    if (!nearestToy || Math.abs(nearestToy.lane - clawLane) > CATCH_THRESHOLD) {
      setStatusMessage('Missed that one. Slide the claw a little closer and try again.')
      return
    }

    setGameState((state) => registerSuccessfulPickup(state, nearestToy.id))
    setStatusMessage(`${nearestToy.name} is opening on the main screen.`)
  }

  function handleDismissReveal() {
    setGameState((state) => {
      const next = dismissReveal(state)
      setClawLane(getFirstAvailableLane(machineDocument, next))
      return next
    })
    setStatusMessage('Reveal closed. That toy is now removed from the machine.')
  }

  const runDropClaw = useEffectEvent(() => {
    handleDropClaw()
  })

  const runDismissReveal = useEffectEvent(() => {
    handleDismissReveal()
  })

  useEffect(() => {
    if (mode !== 'play') {
      return undefined
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (activeRevealToy) {
        if (['Enter', 'Escape', ' '].includes(event.key)) {
          event.preventDefault()
          runDismissReveal()
        }
        return
      }

      if (event.key === 'ArrowLeft') {
        event.preventDefault()
        setClawLane((lane) => Math.max(0.08, lane - 0.08))
      }

      if (event.key === 'ArrowRight') {
        event.preventDefault()
        setClawLane((lane) => Math.min(0.92, lane + 0.08))
      }

      if (event.key === ' ' || event.key === 'Enter') {
        event.preventDefault()
        runDropClaw()
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [activeRevealToy, mode])

  async function handleSaveMachine() {
    const saveDocument: MachineDocument = {
      ...machineDocument,
      session: {
        collectedToyIds: [...gameState.collectedToyIds],
      },
    }

    const serialized = serializeMachineDocument(saveDocument)
    const filename = `${slugify(machineDocument.title || 'class-machine') || 'class-machine'}.claw.json`

    if (window.clawDesktop) {
      const result = await window.clawDesktop.saveMachineFile(filename, serialized)
      if (!result.canceled) {
        setStatusMessage(`Saved classroom machine${result.path ? ` to ${result.path}` : '.'}`)
      }
      return
    }

    downloadTextFile(filename, serialized)
    setStatusMessage('Downloaded the machine file from the browser fallback.')
  }

  async function handleLoadMachine() {
    if (window.clawDesktop) {
      const result = await window.clawDesktop.loadMachineFile()
      if (result.canceled || !result.data) {
        return
      }

      const parsed = parseMachineDocument(result.data)
      syncDocument(parsed, 'setup')
      setStatusMessage(`Loaded ${parsed.title}.`)
      return
    }

    fileInputRef.current?.click()
  }

  async function handleLoadInput(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    event.target.value = ''

    if (!file) {
      return
    }

    const contents = await file.text()
    const parsed = parseMachineDocument(contents)
    syncDocument(parsed, 'setup')
    setStatusMessage(`Loaded ${parsed.title}.`)
  }

  async function handleAssetSelection(
    event: ChangeEvent<HTMLInputElement>,
    toyId: string,
    contentId: string,
  ) {
    const file = event.target.files?.[0]
    event.target.value = ''

    if (!file) {
      return
    }

    const dataUrl = await fileToDataUrl(file)

    updateDocument((document) => ({
      ...document,
      toys: document.toys.map((toy) =>
        toy.id !== toyId
          ? toy
          : {
              ...toy,
              contents: toy.contents.map((content) =>
                content.id !== contentId || content.type === 'text'
                  ? content
                  : {
                      ...content,
                      source: dataUrl,
                    },
              ),
            },
      ),
    }))

    setStatusMessage(`Embedded ${file.name} into the machine file.`)
  }

  function addToy(blockFactory: () => ToyContentBlock) {
    const block = blockFactory()
    updateDocument((document) => ({
      ...document,
      toys: [...document.toys, createToy(block)],
    }))
    setStatusMessage('Added a new toy to the machine.')
  }

  function addBlock(toyId: string, blockFactory: () => ToyContentBlock) {
    updateDocument((document) => ({
      ...document,
      toys: document.toys.map((toy) =>
        toy.id !== toyId
          ? toy
          : {
              ...toy,
              contents: [...toy.contents, blockFactory()],
            },
      ),
    }))
  }

  return (
    <div className="app-shell">
      <input
        ref={fileInputRef}
        type="file"
        accept=".json,.claw.json,application/json"
        hidden
        onChange={handleLoadInput}
      />

      <header className="hero-panel">
        <div className="hero-copy">
          <p className="eyebrow">{mode === 'setup' ? 'Teacher authoring mode' : 'Live classroom mode'}</p>
          <h1>{mode === 'setup' ? 'Setup Studio' : 'Claw Pickup Classroom'}</h1>
          <p className="hero-text">
            Build a machine filled with prompts, pictures, and clips. Save it as one classroom file, then switch to play mode and reveal each toy fullscreen.
          </p>
        </div>

        <div className="hero-actions">
          <button className="primary-button" onClick={mode === 'setup' ? enterPlayMode : returnToSetup}>
            {mode === 'setup' ? 'Start Class Mode' : 'Return to Setup'}
          </button>
          <button className="secondary-button" onClick={handleSaveMachine}>
            Save Machine File
          </button>
          <button className="secondary-button" onClick={handleLoadMachine}>
            Load Machine File
          </button>
        </div>

        <p className="status-banner">{statusMessage}</p>
      </header>

      {mode === 'setup' ? (
        <main className="setup-grid">
          <section className="panel panel-form">
            <div className="panel-header">
              <div>
                <p className="panel-kicker">Machine settings</p>
                <h2>Lesson framing</h2>
              </div>
              <span className="pill">{machineDocument.toys.length} toys loaded</span>
            </div>

            <label className="field">
              <span>Machine title</span>
              <input
                value={machineDocument.title}
                onChange={(event) =>
                  updateDocument((document) => ({
                    ...document,
                    title: event.target.value,
                  }))
                }
              />
            </label>

            <label className="field">
              <span>Subtitle</span>
              <textarea
                rows={3}
                value={machineDocument.subtitle}
                onChange={(event) =>
                  updateDocument((document) => ({
                    ...document,
                    subtitle: event.target.value,
                  }))
                }
              />
            </label>

            <div className="button-row">
              <button className="primary-button" onClick={() => addToy(createTextBlock)}>
                Add Text Toy
              </button>
              <button className="secondary-button" onClick={() => addToy(createImageBlock)}>
                Add Image Toy
              </button>
              <button className="secondary-button" onClick={() => addToy(createVideoBlock)}>
                Add Video Toy
              </button>
            </div>
          </section>

          <section className="panel panel-preview">
            <div className="panel-header">
              <div>
                <p className="panel-kicker">Machine preview</p>
                <h2>Where each toy sits</h2>
              </div>
            </div>

            <div className="preview-stage">
              <div className="preview-rail" />
              <div className="preview-claw" style={{ left: `${getFirstAvailableLane(machineDocument, gameState) * 100}%` }} />
              <div className="preview-floor">
                {machineDocument.toys.map((toy) => (
                  <div
                    key={toy.id}
                    className="preview-toy"
                    style={{ left: `${toy.lane * 100}%`, background: toy.color }}
                    title={toy.name}
                  >
                    <span>{toy.name}</span>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="panel panel-toys">
            <div className="panel-header">
              <div>
                <p className="panel-kicker">Toy editor</p>
                <h2>Author each reveal</h2>
              </div>
            </div>

            <div className="toy-list">
              {machineDocument.toys.map((toy) => (
                <article key={toy.id} className="toy-card">
                  <div className="toy-card-header">
                    <div className="toy-chip" style={{ background: toy.color }} />
                    <strong>{toy.name}</strong>
                    <button
                      className="ghost-button"
                      onClick={() =>
                        updateDocument((document) => ({
                          ...document,
                          toys: document.toys.filter((candidate) => candidate.id !== toy.id),
                          session: {
                            collectedToyIds: document.session.collectedToyIds.filter((id) => id !== toy.id),
                          },
                        }))
                      }
                    >
                      Remove
                    </button>
                  </div>

                  <div className="toy-card-grid">
                    <label className="field">
                      <span>Toy name</span>
                      <input
                        value={toy.name}
                        onChange={(event) =>
                          updateDocument((document) => ({
                            ...document,
                            toys: document.toys.map((candidate) =>
                              candidate.id !== toy.id
                                ? candidate
                                : { ...candidate, name: event.target.value },
                            ),
                          }))
                        }
                      />
                    </label>

                    <label className="field">
                      <span>Glow color</span>
                      <input
                        type="color"
                        value={toy.color}
                        onChange={(event) =>
                          updateDocument((document) => ({
                            ...document,
                            toys: document.toys.map((candidate) =>
                              candidate.id !== toy.id
                                ? candidate
                                : { ...candidate, color: event.target.value },
                            ),
                          }))
                        }
                      />
                    </label>
                  </div>

                  <label className="field">
                    <span>Lane position</span>
                    <input
                      type="range"
                      min="0.08"
                      max="0.92"
                      step="0.04"
                      value={toy.lane}
                      onChange={(event) =>
                        updateDocument((document) => ({
                          ...document,
                          toys: document.toys.map((candidate) =>
                            candidate.id !== toy.id
                              ? candidate
                              : { ...candidate, lane: Number(event.target.value) },
                          ),
                        }))
                      }
                    />
                  </label>

                  <div className="content-list">
                    {toy.contents.map((content) => (
                      <section key={content.id} className="content-card">
                        <div className="content-card-header">
                          <span className="content-type">{content.type}</span>
                          <button
                            className="ghost-button"
                            onClick={() =>
                              updateDocument((document) => ({
                                ...document,
                                toys: document.toys.map((candidate) =>
                                  candidate.id !== toy.id
                                    ? candidate
                                    : {
                                        ...candidate,
                                        contents:
                                          candidate.contents.length === 1
                                            ? candidate.contents
                                            : candidate.contents.filter((block) => block.id !== content.id),
                                      },
                                ),
                              }))
                            }
                          >
                            Remove block
                          </button>
                        </div>

                        {content.type === 'text' ? (
                          <>
                            <label className="field">
                              <span>Title</span>
                              <input
                                value={content.title}
                                onChange={(event) =>
                                  updateDocument((document) => ({
                                    ...document,
                                    toys: document.toys.map((candidate) =>
                                      candidate.id !== toy.id
                                        ? candidate
                                        : {
                                            ...candidate,
                                            contents: candidate.contents.map((block) =>
                                              block.id !== content.id || block.type !== 'text'
                                                ? block
                                                : { ...block, title: event.target.value },
                                            ),
                                          },
                                    ),
                                  }))
                                }
                              />
                            </label>
                            <label className="field">
                              <span>Body</span>
                              <textarea
                                rows={4}
                                value={content.body}
                                onChange={(event) =>
                                  updateDocument((document) => ({
                                    ...document,
                                    toys: document.toys.map((candidate) =>
                                      candidate.id !== toy.id
                                        ? candidate
                                        : {
                                            ...candidate,
                                            contents: candidate.contents.map((block) =>
                                              block.id !== content.id || block.type !== 'text'
                                                ? block
                                                : { ...block, body: event.target.value },
                                            ),
                                          },
                                    ),
                                  }))
                                }
                              />
                            </label>
                          </>
                        ) : (
                          <>
                            <label className="field">
                              <span>Label</span>
                              <input
                                value={content.label}
                                onChange={(event) =>
                                  updateDocument((document) => ({
                                    ...document,
                                    toys: document.toys.map((candidate) =>
                                      candidate.id !== toy.id
                                        ? candidate
                                        : {
                                            ...candidate,
                                            contents: candidate.contents.map((block) =>
                                              block.id !== content.id || block.type === 'text'
                                                ? block
                                                : { ...block, label: event.target.value },
                                            ),
                                          },
                                    ),
                                  }))
                                }
                              />
                            </label>
                            <label className="field">
                              <span>{content.type === 'image' ? 'Image source' : 'Video source'}</span>
                              <input
                                value={content.source}
                                placeholder="Paste a data URL or use the embed button below"
                                onChange={(event) =>
                                  updateDocument((document) => ({
                                    ...document,
                                    toys: document.toys.map((candidate) =>
                                      candidate.id !== toy.id
                                        ? candidate
                                        : {
                                            ...candidate,
                                            contents: candidate.contents.map((block) =>
                                              block.id !== content.id || block.type === 'text'
                                                ? block
                                                : { ...block, source: event.target.value },
                                            ),
                                          },
                                    ),
                                  }))
                                }
                              />
                            </label>
                            <label className="file-button">
                              Embed {content.type === 'image' ? 'image' : 'video'}
                              <input
                                type="file"
                                accept={content.type === 'image' ? 'image/*' : 'video/*'}
                                onChange={(event) => handleAssetSelection(event, toy.id, content.id)}
                              />
                            </label>
                          </>
                        )}
                      </section>
                    ))}
                  </div>

                  <div className="button-row">
                    <button className="ghost-button" onClick={() => addBlock(toy.id, createTextBlock)}>
                      Add Text Block
                    </button>
                    <button className="ghost-button" onClick={() => addBlock(toy.id, createImageBlock)}>
                      Add Image Block
                    </button>
                    <button className="ghost-button" onClick={() => addBlock(toy.id, createVideoBlock)}>
                      Add Video Block
                    </button>
                  </div>
                </article>
              ))}
            </div>
          </section>
        </main>
      ) : (
        <main className="play-grid">
          <section className="panel play-panel">
            <div className="panel-header">
              <div>
                <p className="panel-kicker">Live machine</p>
                <h2>Machine Floor</h2>
              </div>
              <div className="play-stats">
                <span className="pill">{machineDocument.toys.length} toys loaded</span>
                <span className="pill">{remainingToyCount} toys remaining</span>
              </div>
            </div>

            <p className="play-subtitle">{machineDocument.subtitle}</p>

            <div className="machine-stage">
              <div className="machine-rail" />
              <div className="machine-string" style={{ left: `${clawLane * 100}%` }}>
                <div className="machine-claw" />
              </div>

              <div className="toy-floor">
                {machineDocument.toys
                  .filter((toy) => gameState.availableToyIds.includes(toy.id))
                  .map((toy) => (
                    <button
                      key={toy.id}
                      className="machine-toy"
                      style={{ left: `${toy.lane * 100}%`, background: toy.color }}
                      onClick={() => setClawLane(toy.lane)}
                    >
                      <span>{toy.name}</span>
                    </button>
                  ))}
              </div>
            </div>

            <div className="control-bar">
              <button className="secondary-button" onClick={() => setClawLane((lane) => Math.max(0.08, lane - 0.08))}>
                Move Left
              </button>
              <button className="primary-button" onClick={handleDropClaw}>
                Drop Claw
              </button>
              <button className="secondary-button" onClick={() => setClawLane((lane) => Math.min(0.92, lane + 0.08))}>
                Move Right
              </button>
              <button className="ghost-button" onClick={resetSession}>
                Reset Session
              </button>
            </div>
          </section>
        </main>
      )}

      {activeRevealToy ? (
        <section
          aria-label={activeRevealToy.name}
          className="reveal-overlay"
          role="dialog"
          aria-modal="true"
        >
          <div className="reveal-card">
            <div className="reveal-header">
              <div>
                <p className="panel-kicker">Toy collected</p>
                <h2>{activeRevealToy.name}</h2>
              </div>
              <span className="pill" style={{ background: activeRevealToy.color }}>
                Center screen reveal
              </span>
            </div>

            <div className="reveal-blocks">
              {activeRevealToy.contents.map((content) => (
                <article key={content.id} className="reveal-block">
                  {content.type === 'text' ? (
                    <>
                      <h3>{content.title}</h3>
                      <p>{content.body}</p>
                    </>
                  ) : content.type === 'image' ? (
                    <>
                      <p className="media-label">{content.label}</p>
                      {content.source ? (
                        <img src={content.source} alt={content.label} />
                      ) : (
                        <div className="empty-media">No image embedded yet.</div>
                      )}
                    </>
                  ) : (
                    <>
                      <p className="media-label">{content.label}</p>
                      {content.source ? (
                        <video controls autoPlay muted playsInline src={content.source} />
                      ) : (
                        <div className="empty-media">No video embedded yet.</div>
                      )}
                    </>
                  )}
                </article>
              ))}
            </div>

            <button className="primary-button continue-button" onClick={handleDismissReveal}>
              Continue
            </button>
          </div>
        </section>
      ) : null}
    </div>
  )
}

export default App
