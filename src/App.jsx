import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Layout from './components/Layout'
import Landing from './pages/Landing'
import Framework from './pages/Framework'
import EngagementTiers from './pages/EngagementTiers'
import Patterns from './pages/Patterns'
import PatternDetail from './pages/PatternDetail'
import Calculator from './pages/Calculator'
import ReferenceArchitectures from './pages/ReferenceArchitectures'
import ReferenceArchitectureDetail from './pages/ReferenceArchitectureDetail'
import AiWorkloads from './pages/AiWorkloads'
import Adr from './pages/Adr'
import Timeline from './pages/Timeline'
import Troubleshooting from './pages/Troubleshooting'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Landing />} />
          <Route path="framework" element={<Framework />} />
          <Route path="engagement-tiers" element={<EngagementTiers />} />
          <Route path="patterns" element={<Patterns />} />
          <Route path="patterns/:slug" element={<PatternDetail />} />
          <Route path="calculator" element={<Calculator />} />
          <Route path="reference-architectures" element={<ReferenceArchitectures />} />
          <Route path="reference-architectures/:slug" element={<ReferenceArchitectureDetail />} />
          <Route path="ai-workloads" element={<AiWorkloads />} />
          <Route path="adr" element={<Adr />} />
          <Route path="timeline" element={<Timeline />} />
          <Route path="troubleshooting" element={<Troubleshooting />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
