import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { MemoryRouter } from 'react-router-dom'
import { ProjectProvider } from '../context/ProjectContext'
import Framework from './Framework'

function renderFramework() {
  return render(
    <ProjectProvider>
      <MemoryRouter>
        <Framework />
      </MemoryRouter>
    </ProjectProvider>,
  )
}

beforeEach(() => {
  localStorage.clear()
})

describe('Framework', () => {
  it('keeps the engagement brief compact', async () => {
    const user = userEvent.setup()
    renderFramework()

    await user.click(screen.getByRole('button', { name: /engagement brief/i }))

    expect(screen.getByLabelText('Client / org')).toBeInTheDocument()
    expect(screen.getByLabelText('Outcome')).toBeInTheDocument()
    expect(screen.getByLabelText('Constraints')).toBeInTheDocument()
    expect(screen.queryByLabelText('Business problem')).not.toBeInTheDocument()
    expect(screen.queryByLabelText('Success criteria')).not.toBeInTheDocument()
  })

  it('shows the client lens when a framework phase is expanded', async () => {
    const user = userEvent.setup()
    renderFramework()

    await user.click(screen.getAllByRole('button', { name: /deconstruct constraints and targets/i })[0])

    expect(screen.getByText('Client Lens')).toBeInTheDocument()
    expect(screen.getByText('Architect Questions')).toBeInTheDocument()
    expect(screen.getByText('Done When')).toBeInTheDocument()
    expect(screen.getByText(/What outcome is the client trying to protect or improve/i)).toBeInTheDocument()
  })
})
