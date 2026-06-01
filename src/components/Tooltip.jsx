import { useState } from 'react'

export default function Tooltip({ content, children }) {
  const [visible, setVisible] = useState(false)

  return (
    <span
      className="relative inline-flex items-center"
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
    >
      {children}
      {visible && (
        <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 z-50 pointer-events-none">
          <span className="block bg-surface border border-border text-text-secondary font-body text-xs px-3 py-2 whitespace-nowrap shadow-card">
            {content}
          </span>
          <span className="block w-2 h-2 bg-surface border-r border-b border-border rotate-45 mx-auto -mt-1" />
        </span>
      )}
    </span>
  )
}
