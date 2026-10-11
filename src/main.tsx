import './styles/tailwind.css'
import './styles/design-system.css'
import './styles/liquid-glass.css'
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.tsx'
import FirebaseAccess from './components/FirebaseAccess.tsx'

const savedTheme = localStorage.getItem('quality-vision-theme') || ''
document.documentElement.dataset.theme = ['light', 'dark'].includes(savedTheme)
  ? savedTheme
  : window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'

const root = document.getElementById('root')
if (!root) throw new Error('Application root was not found.')
ReactDOM.createRoot(root).render(
  <React.StrictMode>
    <FirebaseAccess><App /></FirebaseAccess>
  </React.StrictMode>,
)
