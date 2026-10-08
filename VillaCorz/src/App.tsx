import { useState } from 'react'
import HomePage from './assets/components/pages/HomePage'
import Auth from './assets/components/auth/Auth'

function App() {
  const [count, setCount] = useState(0)

  return (
    <section>
      <HomePage />
      <Auth />
    </section>
  )
}

export default App
