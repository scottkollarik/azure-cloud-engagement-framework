import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it } from 'vitest'
import { ProjectProvider } from './ProjectContext'
import { useProject } from './useProject'

const STORAGE_KEY = 'acef.project.draft'

function Probe() {
  const {
    projectName,
    setProjectName,
    maturity,
    setMaturity,
    engagementBrief,
    setEngagementBrief,
    engagementNotes,
    setEngagementNotes,
    getProjectData,
    loadProject,
  } = useProject()

  return (
    <div>
      <p data-testid="project-name">{projectName}</p>
      <p data-testid="maturity">{maturity}</p>
      <p data-testid="outcome">{engagementBrief.outcome}</p>
      <p data-testid="constraints">{engagementBrief.constraints}</p>
      <p data-testid="risks">{engagementNotes.risks}</p>
      <p data-testid="exported">{JSON.stringify(getProjectData().engagementBrief)}</p>
      <button onClick={() => setProjectName('Contoso modernization')}>Set name</button>
      <button onClick={() => setMaturity('pilot')}>Set pilot</button>
      <button onClick={() => setEngagementBrief({ clientName: 'Contoso', outcome: 'Reduce outage risk', constraints: 'No Standard tiers' })}>
        Set brief
      </button>
      <button onClick={() => setEngagementNotes({ risks: 'Unvalidated DR process' })}>Set risk</button>
      <button
        onClick={() => loadProject({
          version: '1',
          meta: { projectName: 'Legacy import' },
          maturity: 'production',
          engagementBrief: {
            clientName: 'Legacy client',
            businessProblem: 'Old business problem field',
            constraints: 'Legacy constraint',
          },
          engagementNotes: { decisions: 'Keep import compatible' },
        })}
      >
        Load legacy
      </button>
    </div>
  )
}

function renderProbe() {
  return render(
    <ProjectProvider>
      <Probe />
    </ProjectProvider>,
  )
}

beforeEach(() => {
  localStorage.clear()
})

describe('ProjectProvider', () => {
  it('persists engagement draft changes to localStorage and restores them on remount', async () => {
    const user = userEvent.setup()
    const view = renderProbe()

    await user.click(screen.getByRole('button', { name: 'Set name' }))
    await user.click(screen.getByRole('button', { name: 'Set pilot' }))
    await user.click(screen.getByRole('button', { name: 'Set brief' }))
    await user.click(screen.getByRole('button', { name: 'Set risk' }))

    await waitFor(() => {
      const draft = JSON.parse(localStorage.getItem(STORAGE_KEY))
      expect(draft.meta.projectName).toBe('Contoso modernization')
      expect(draft.maturity).toBe('pilot')
      expect(draft.engagementBrief).toEqual({
        clientName: 'Contoso',
        outcome: 'Reduce outage risk',
        constraints: 'No Standard tiers',
      })
      expect(draft.engagementNotes.risks).toBe('Unvalidated DR process')
    })

    view.unmount()
    renderProbe()

    expect(screen.getByTestId('project-name')).toHaveTextContent('Contoso modernization')
    expect(screen.getByTestId('maturity')).toHaveTextContent('pilot')
    expect(screen.getByTestId('outcome')).toHaveTextContent('Reduce outage risk')
    expect(screen.getByTestId('constraints')).toHaveTextContent('No Standard tiers')
    expect(screen.getByTestId('risks')).toHaveTextContent('Unvalidated DR process')
  })

  it('normalizes older imported engagement brief fields into the compact outcome field', async () => {
    const user = userEvent.setup()
    renderProbe()

    await user.click(screen.getByRole('button', { name: 'Load legacy' }))

    expect(screen.getByTestId('project-name')).toHaveTextContent('Legacy import')
    expect(screen.getByTestId('maturity')).toHaveTextContent('production')
    expect(screen.getByTestId('outcome')).toHaveTextContent('Old business problem field')
    expect(screen.getByTestId('constraints')).toHaveTextContent('Legacy constraint')
    expect(screen.getByTestId('exported')).toHaveTextContent('Old business problem field')
  })
})
