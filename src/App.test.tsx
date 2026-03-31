import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'

import App from './App'

describe('classroom claw game flow', () => {
  it('starts in setup mode and removes a revealed toy after the class dismisses it', async () => {
    const user = userEvent.setup()

    render(<App />)

    expect(
      screen.getByRole('heading', { name: /setup studio/i }),
    ).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /start class mode/i }))

    expect(
      screen.getByRole('heading', { name: /claw pickup classroom/i }),
    ).toBeInTheDocument()
    expect(screen.getByText(/3 toys loaded/i)).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /drop claw/i }))

    expect(
      await screen.findByRole('dialog', { name: /haiku capsule/i }),
    ).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /continue/i }))

    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
    expect(screen.getByText(/2 toys remaining/i)).toBeInTheDocument()
  })
})
