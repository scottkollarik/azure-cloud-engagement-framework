import { useState } from 'react'
import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import ProjectBar from './ProjectBar'

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(true)

  return (
    <div className="flex min-h-screen bg-canvas">
      <Sidebar open={sidebarOpen} onToggle={() => setSidebarOpen(o => !o)} />
      <main
        className={`flex-1 min-w-0 transition-all duration-150 ${
          sidebarOpen ? 'ml-64' : 'ml-12'
        }`}
      >
        <ProjectBar />
        <div className="bg-glow min-h-screen">
          <Outlet />
        </div>
        <footer className="border-t border-border/40 bg-surface/60 px-6 py-3 text-center">
          <span className="text-2xs text-text-secondary/40 font-mono">
            © 2026 D. Scott Kollarik / Technologoo.io. All rights reserved.
          </span>
        </footer>
      </main>
    </div>
  )
}
