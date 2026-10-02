import './styles/design-system.css'
import './styles/liquid-glass.css'
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import FirebaseAccess from './components/FirebaseAccess'

const savedTheme = localStorage.getItem('quality-vision-theme')
document.documentElement.dataset.theme = ['light', 'dark'].includes(savedTheme)
  ? savedTheme
  : window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <FirebaseAccess><App /></FirebaseAccess>
  </React.StrictMode>,
)
