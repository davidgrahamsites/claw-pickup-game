import type { MachineDocument } from './machine-file'

const starburstArt = encodeURIComponent(`
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 480 320">
    <defs>
      <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stop-color="#ffe0a3" />
        <stop offset="100%" stop-color="#ff8a5b" />
      </linearGradient>
    </defs>
    <rect width="480" height="320" fill="url(#bg)" rx="32" />
    <circle cx="130" cy="120" r="72" fill="#fff4d0" opacity="0.8" />
    <circle cx="350" cy="180" r="96" fill="#ffd166" opacity="0.6" />
    <path d="M240 40 260 122 344 96 292 164 372 216 284 226 300 310 240 252 180 310 196 226 108 216 188 164 136 96 220 122Z" fill="#7b2cbf" opacity="0.88" />
    <text x="240" y="182" font-size="34" text-anchor="middle" font-family="Trebuchet MS, sans-serif" fill="#fff8ef">Picture Prompt</text>
  </svg>
`)

const storyCardArt = encodeURIComponent(`
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 480 320">
    <rect width="480" height="320" fill="#071833" rx="32" />
    <rect x="42" y="44" width="396" height="232" rx="24" fill="#0e2f58" stroke="#7fe7dc" stroke-width="8" />
    <path d="M180 110 L320 160 L180 210 Z" fill="#ffe082" />
    <text x="240" y="92" font-size="26" text-anchor="middle" font-family="Trebuchet MS, sans-serif" fill="#dff7f2">Video-ready toy</text>
    <text x="240" y="264" font-size="22" text-anchor="middle" font-family="Trebuchet MS, sans-serif" fill="#7fe7dc">Replace with your class clip</text>
  </svg>
`)

export const sampleMachineDocument: MachineDocument = {
  version: 1,
  title: 'Claw Pickup Classroom',
  subtitle: 'Each toy holds a prompt, picture, or class clip.',
  createdAt: '2026-03-30T21:00:00.000Z',
  toys: [
    {
      id: 'toy-haiku',
      name: 'Haiku Capsule',
      color: '#ff8a5b',
      lane: 0.24,
      contents: [
        {
          id: 'haiku-text',
          type: 'text',
          title: 'Quick write challenge',
          body: 'Write a spring haiku in three lines. Read it out loud before the next player takes a turn.',
        },
      ],
    },
    {
      id: 'toy-picture',
      name: 'Picture Prism',
      color: '#ffd166',
      lane: 0.5,
      contents: [
        {
          id: 'picture-image',
          type: 'image',
          label: 'Reference art',
          source: `data:image/svg+xml;charset=UTF-8,${starburstArt}`,
        },
        {
          id: 'picture-text',
          type: 'text',
          title: 'Talk prompt',
          body: 'Describe what this image could represent in today’s lesson before you reveal the next toy.',
        },
      ],
    },
    {
      id: 'toy-video',
      name: 'Story Reel',
      color: '#7fe7dc',
      lane: 0.76,
      contents: [
        {
          id: 'story-text',
          type: 'text',
          title: 'Clip placeholder',
          body: 'Swap this toy to a local class video in setup mode, then use it as a surprise discussion break.',
        },
        {
          id: 'story-image',
          type: 'image',
          label: 'Video placeholder',
          source: `data:image/svg+xml;charset=UTF-8,${storyCardArt}`,
        },
      ],
    },
  ],
  session: {
    collectedToyIds: [],
  },
}
