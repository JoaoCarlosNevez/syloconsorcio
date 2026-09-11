// App — entry point do frontend SyloCRM.
//
// Renders the BrowserRouter + AppRouter.
// In dev: ?showcase=1 renders the design system component showcase.

import { BrowserRouter } from 'react-router-dom'
import { AppRouter } from './router'
import { Showcase } from './showcase/Showcase'

function App() {
  // In dev: ?showcase=1 renders the design system showcase
  if (import.meta.env.DEV && new URLSearchParams(window.location.search).has('showcase')) {
    return <Showcase />
  }

  return (
    <BrowserRouter>
      <AppRouter />
    </BrowserRouter>
  )
}

export default App
