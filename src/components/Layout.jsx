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
      </main>
    </div>
  )
}
