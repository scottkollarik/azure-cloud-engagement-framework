import { useContext } from 'react'
import { ProjectContext } from './projectContextValue'

export function useProject() {
  const ctx = useContext(ProjectContext)
  if (!ctx) throw new Error('useProject must be used inside ProjectProvider')
  return ctx
}
