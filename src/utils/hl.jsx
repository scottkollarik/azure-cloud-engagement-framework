import { Link } from 'react-router-dom'

/**
 * Highlights named entities in prose text:
 * - Land / Scale / Govern → tier colors
 * - Step NN → accent-colored link to /framework?open=step-N
 */
export function hl(text) {
  return text.split(/(Land|Scale|Govern|Step\s+\d+)/).map((part, i) => {
    if (part === 'Land')   return <span key={i} className="text-tier-land font-semibold">Land</span>
    if (part === 'Scale')  return <span key={i} className="text-tier-scale font-semibold">Scale</span>
    if (part === 'Govern') return <span key={i} className="text-tier-govern font-semibold">Govern</span>
    if (/^Step\s+\d+$/.test(part)) {
      const num = parseInt(part.match(/\d+/)[0], 10)
      return (
        <Link
          key={i}
          to={`/framework?open=step-${num}`}
          className="font-mono text-accent font-semibold hover:underline decoration-accent/40"
        >
          {part}
        </Link>
      )
    }
    return part
  })
}
