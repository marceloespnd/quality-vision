import './styles/design-system.css'
import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import FirebaseAccess from './components/FirebaseAccess'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <FirebaseAccess><App /></FirebaseAccess>
  </React.StrictMode>,
)
