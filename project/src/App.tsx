import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout'
import SinglePost from './pages/SinglePost'
import History from './pages/History'
import Startup from './pages/Startup'
import StartupDetail from './pages/StartupDetail'
import Diagnosis from './pages/Diagnosis'
import DiagnosisDetail from './pages/DiagnosisDetail'
import Settings from './pages/Settings'
import './index.css'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<SinglePost />} />
          <Route path="history" element={<History />} />
          <Route path="startup" element={<Startup />} />
          <Route path="startup/:id" element={<StartupDetail />} />
          <Route path="diagnosis" element={<Diagnosis />} />
          <Route path="diagnosis/:id" element={<DiagnosisDetail />} />
          <Route path="settings" element={<Settings />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
