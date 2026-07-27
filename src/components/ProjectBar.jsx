import { useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { useProject } from '../context/useProject'
import { downloadProjectFile, readProjectFile } from '../utils/projectFile'

const TOOL_PATHS = new Set(['/framework', '/calculator', '/adr', '/timeline'])

export default function ProjectBar() {
  const { projectName, setProjectName, getProjectData, loadProject, hasUnsavedWork } = useProject()
  const { pathname } = useLocation()
  const fileInputRef = useRef(null)
  const [loadError, setLoadError] = useState(null)
  const [saved, setSaved] = useState(false)
  const isTool = TOOL_PATHS.has(pathname)

  function handleSave() {
    downloadProjectFile(getProjectData())
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  async function handleFileChange(e) {
    const file = e.target.files[0]
    if (!file) return
    setLoadError(null)
    try {
      const data = await readProjectFile(file)
      loadProject(data)
    } catch (err) {
      setLoadError(err.message)
    } finally {
      e.target.value = ''
    }
  }

  // On read-only pages: only show if a project is loaded, as a minimal indicator
  if (!isTool) {
    if (!projectName) return null
    return (
      <div className="border-b border-border/40 bg-surface/60 px-6 py-1.5 flex items-center gap-3">
        <span className="text-2xs font-semibold uppercase tracking-widest text-text-secondary/50 font-display shrink-0">
          Project
        </span>
        <span className="text-xs font-mono text-text-secondary/60">{projectName}</span>
      </div>
    )
  }

  return (
    <div className="border-b border-border bg-surface px-6 py-2 flex items-center gap-4">
      <span className="text-2xs font-semibold uppercase tracking-widest text-text-secondary font-display shrink-0">
        Project
      </span>
      <input
        type="text"
        value={projectName}
        onChange={e => setProjectName(e.target.value)}
        placeholder="Engagement name…"
        className="flex-1 max-w-xs bg-canvas border border-border text-text-primary font-mono text-xs px-3 py-1 focus:border-accent focus:outline-none placeholder:text-text-secondary/50"
      />
      <span className="text-text-secondary/30 text-2xs font-mono">.acef.json</span>

      <div className="flex items-center gap-2 ml-auto">
        {loadError && (
          <span className="text-critical text-2xs font-mono">{loadError}</span>
        )}
        <button
          onClick={() => fileInputRef.current?.click()}
          className="flex items-center gap-1.5 px-3 py-1 border border-border text-text-secondary hover:text-text-primary hover:border-accent/50 text-xs font-display transition-colors"
        >
          <FolderIcon /> Load
        </button>
        <button
          onClick={handleSave}
          disabled={!hasUnsavedWork && !projectName}
          className={`flex items-center gap-1.5 px-3 py-1 text-xs font-display transition-colors ${
            saved
              ? 'border border-positive text-positive'
              : 'border border-accent text-accent hover:bg-accent hover:text-white'
          } disabled:opacity-30 disabled:cursor-not-allowed`}
        >
          <SaveIcon />
          {saved ? 'Exported ✓' : 'Export'}
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".json,.acef.json"
          className="hidden"
          onChange={handleFileChange}
        />
      </div>
    </div>
  )
}

function SaveIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="square" d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z" />
      <polyline strokeLinecap="square" points="17 21 17 13 7 13 7 21" />
      <polyline strokeLinecap="square" points="7 3 7 8 15 8" />
    </svg>
  )
}

function FolderIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="square" d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z" />
    </svg>
  )
}
