import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout'
import SinglePost from './pages/SinglePost'
import Startup from './pages/Startup'
import StartupDetail from './pages/StartupDetail'
import Diagnosis from './pages/Diagnosis'
import DiagnosisAccountDetail from './pages/DiagnosisAccountDetail'
import Settings from './pages/Settings'
import './index.css'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<SinglePost />} />
          <Route path="history" element={<Navigate to="/" replace />} />
          <Route path="startup" element={<Startup />} />
          <Route path="startup/:id" element={<StartupDetail />} />
          <Route path="diagnosis">
            <Route index element={<Diagnosis />} />
            <Route path="account/:accountId" element={<DiagnosisAccountDetail />} />
          </Route>
          <Route path="settings" element={<Settings />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}
