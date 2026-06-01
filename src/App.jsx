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
import IacReference from './pages/IacReference'
import Tradeoffs from './pages/Tradeoffs'
import ApplicationPatterns from './pages/ApplicationPatterns'
import IdentityDesign from './pages/IdentityDesign'
import NetworkDesign from './pages/NetworkDesign'
import ObservabilityDesign from './pages/ObservabilityDesign'
import MicroservicesDesign from './pages/MicroservicesDesign'
import CachingDesign from './pages/CachingDesign'

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
          <Route path="iac" element={<IacReference />} />
          <Route path="tradeoffs" element={<Tradeoffs />} />
          <Route path="application-patterns" element={<ApplicationPatterns />} />
          <Route path="identity-design" element={<IdentityDesign />} />
          <Route path="network-design" element={<NetworkDesign />} />
          <Route path="observability-design" element={<ObservabilityDesign />} />
          <Route path="microservices-design" element={<MicroservicesDesign />} />
          <Route path="caching-design" element={<CachingDesign />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
