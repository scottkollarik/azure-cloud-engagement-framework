import { createContext, useContext, useState, useCallback } from 'react'

const FILE_VERSION = '1'

const DEFAULT_PROJECT = {
  projectName: '',
  calculator: null,
  timeline: null,
  adrs: [],
}

const ProjectContext = createContext(null)

export function ProjectProvider({ children }) {
  const [projectName, setProjectName] = useState('')
  const [calculator, setCalculator] = useState(null)
  const [timeline, setTimeline] = useState(null)
  const [adrs, setAdrs] = useState([])

  const setCalculatorState = useCallback(state => setCalculator(state), [])
  const setTimelineState   = useCallback(state => setTimeline(state), [])

  const saveAdr = useCallback(form => {
    setAdrs(prev => {
      const idx = prev.findIndex(a => a.adrNumber === form.adrNumber)
      if (idx >= 0) {
        const next = [...prev]
        next[idx] = form
        return next
      }
      return [...prev, form]
    })
  }, [])

  const deleteAdr = useCallback(adrNumber => {
    setAdrs(prev => prev.filter(a => a.adrNumber !== adrNumber))
  }, [])

  const getProjectData = useCallback(() => ({
    version: FILE_VERSION,
    meta: {
      projectName,
      savedAt: new Date().toISOString(),
    },
    calculator,
    timeline,
    adrs,
  }), [projectName, calculator, timeline, adrs])

  const loadProject = useCallback(data => {
    setProjectName(data.meta?.projectName ?? '')
    setCalculator(data.calculator ?? null)
    setTimeline(data.timeline ?? null)
    setAdrs(data.adrs ?? [])
  }, [])

  const hasUnsavedWork = !!(calculator || timeline || adrs.length)

  return (
    <ProjectContext.Provider value={{
      projectName, setProjectName,
      calculator, setCalculatorState,
      timeline, setTimelineState,
      adrs, saveAdr, deleteAdr,
      getProjectData, loadProject,
      hasUnsavedWork,
    }}>
      {children}
    </ProjectContext.Provider>
  )
}

export function useProject() {
  const ctx = useContext(ProjectContext)
  if (!ctx) throw new Error('useProject must be used inside ProjectProvider')
  return ctx
}
