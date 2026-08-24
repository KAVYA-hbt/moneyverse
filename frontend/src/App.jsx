import { BrowserRouter, Routes, Route } from 'react-router-dom'
import LandingPage from './pages/LandingPage.jsx'
import UserDetailsPage from './pages/UserDetailsPage.jsx'
import GamePage from './pages/GamePage.jsx'
import AdminRedirect from './pages/AdminRedirect.jsx'
import { LanguageProvider } from './i18n/LanguageContext.jsx'

function App() {
  return (
    <LanguageProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/details" element={<UserDetailsPage />} />
          <Route path="/game" element={<GamePage />} />
          {/* Not linked from any nav/menu -- staff-only entry point, see AdminRedirect.jsx.
              Registered at both paths since staff reach it either directly or by appending
              /admin while already on /game. */}
          <Route path="/admin" element={<AdminRedirect />} />
          <Route path="/game/admin" element={<AdminRedirect />} />
        </Routes>
      </BrowserRouter>
    </LanguageProvider>
  )
}

export default App
