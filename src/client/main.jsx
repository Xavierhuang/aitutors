import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './App.css'
import { ConversationProvider } from './contexts/ConversationContext';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ConversationProvider>
      <App />
    </ConversationProvider>
  </React.StrictMode>
) 