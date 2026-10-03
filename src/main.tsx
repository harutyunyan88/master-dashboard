import '@fontsource-variable/inter'
import '@fontsource/noto-sans-armenian/400.css'
import '@fontsource/noto-sans-armenian/600.css'
import './i18n/index.ts'
import './index.css'

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

import App from './App.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
