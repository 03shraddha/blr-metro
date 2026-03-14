import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './styles/index.css'
import App from './App.jsx'
import { ThemeProvider } from './context/ThemeContext.jsx'

const loadingScreen = document.getElementById('loading-screen')
if (loadingScreen) {
  loadingScreen.classList.add('fade-out')
  setTimeout(() => loadingScreen.remove(), 500)
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ThemeProvider>
      <App />
    </ThemeProvider>
  </StrictMode>,
)
