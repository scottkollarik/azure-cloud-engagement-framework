import { useState, useCallback, useEffect } from 'react'
import { ProjectContext } from './projectContextValue'

const FILE_VERSION = '1'
const LOCAL_STORAGE_KEY = 'acef.project.draft'

const DEFAULT_PROJECT = {
  projectName: '',
  maturity: 'prototype',
  engagementBrief: {
    clientName: '',
    outcome: '',
    constraints: '',
  },
  engagementNotes: {
    assumptions: '',
    risks: '',
    decisions: '',
  },
  calculator: null,
  timeline: null,
  adrs: [],
}

function normalizeProject(data = {}) {
  const brief = data.engagementBrief ?? {}
  const notes = data.engagementNotes ?? {}

  return {
    projectName: data.meta?.projectName ?? data.projectName ?? DEFAULT_PROJECT.projectName,
    maturity: data.maturity ?? DEFAULT_PROJECT.maturity,
    engagementBrief: {
      clientName: brief.clientName ?? '',
      outcome: brief.outcome ?? brief.desiredOutcome ?? brief.businessProblem ?? '',
      constraints: brief.constraints ?? '',
    },
    engagementNotes: {
      assumptions: notes.assumptions ?? '',
      risks: notes.risks ?? '',
      decisions: notes.decisions ?? '',
    },
    calculator: data.calculator ?? null,
    timeline: data.timeline ?? null,
    adrs: data.adrs ?? [],
  }
}

function readLocalDraft() {
  if (typeof window === 'undefined') return DEFAULT_PROJECT

  try {
    const raw = window.localStorage.getItem(LOCAL_STORAGE_KEY)
    return raw ? normalizeProject(JSON.parse(raw)) : DEFAULT_PROJECT
  } catch {
    return DEFAULT_PROJECT
  }
}

export function ProjectProvider({ children }) {
  const [initialProject] = useState(readLocalDraft)
  const [projectName, setProjectName] = useState(initialProject.projectName)
  const [maturity, setMaturity] = useState(initialProject.maturity)
  const [engagementBrief, setEngagementBrief] = useState(initialProject.engagementBrief)
  const [engagementNotes, setEngagementNotes] = useState(initialProject.engagementNotes)
  const [calculator, setCalculator] = useState(initialProject.calculator)
  const [timeline, setTimeline] = useState(initialProject.timeline)
  const [adrs, setAdrs] = useState(initialProject.adrs)

  const setEngagementBriefState = useCallback(state => setEngagementBrief(prev => ({ ...prev, ...state })), [])
  const setEngagementNotesState = useCallback(state => setEngagementNotes(prev => ({ ...prev, ...state })), [])
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
    maturity,
    engagementBrief,
    engagementNotes,
    calculator,
    timeline,
    adrs,
  }), [projectName, maturity, engagementBrief, engagementNotes, calculator, timeline, adrs])

  useEffect(() => {
    window.localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(getProjectData()))
  }, [getProjectData])

  const loadProject = useCallback(data => {
    const next = normalizeProject(data)
    setProjectName(next.projectName)
    setMaturity(next.maturity)
    setEngagementBrief(next.engagementBrief)
    setEngagementNotes(next.engagementNotes)
    setCalculator(next.calculator)
    setTimeline(next.timeline)
    setAdrs(next.adrs)
  }, [])

  const hasEngagementWork = !!(
    maturity !== DEFAULT_PROJECT.maturity ||
    Object.values(engagementBrief).some(Boolean) ||
    Object.values(engagementNotes).some(Boolean)
  )
  const hasUnsavedWork = !!(hasEngagementWork || calculator || timeline || adrs.length)

  return (
    <ProjectContext.Provider value={{
      projectName, setProjectName,
      maturity, setMaturity,
      engagementBrief, setEngagementBrief: setEngagementBriefState,
      engagementNotes, setEngagementNotes: setEngagementNotesState,
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
