import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import App from './App.tsx'
import Pricing from './pages/Pricing.tsx'
import Dashboard from './pages/Dashboard.tsx'
import { ClerkProvider, useAuth } from '@clerk/clerk-react'
import { ConvexProvider, ConvexReactClient } from 'convex/react'
import { ConvexProviderWithClerk } from 'convex/react-clerk'
import { authEnabled } from './lib/convexApi'
import { initPostHog } from './lib/posthog'

if ('scrollRestoration' in history) history.scrollRestoration = 'manual';
initPostHog();

const pk = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY as string | undefined
const convexUrl = (import.meta.env.VITE_CONVEX_URL as string | undefined) || 'https://placeholder.convex.cloud'
const convex = new ConvexReactClient(convexUrl)

const routes = (
  <BrowserRouter>
    <Routes>
      <Route path="/" element={<App />} />
      <Route path="/pricing" element={<Pricing />} />
      <Route path="/create" element={<Dashboard />} />
    </Routes>
  </BrowserRouter>
)

// Clerk (Google sign-in) activates when the publishable key is set; Convex is always provided.
function Root() {
  if (authEnabled && pk) {
    return (
      <ClerkProvider publishableKey={pk} afterSignOutUrl="/"
        signInForceRedirectUrl="/create" signUpForceRedirectUrl="/create">
        <ConvexProviderWithClerk client={convex} useAuth={useAuth}>
          {routes}
        </ConvexProviderWithClerk>
      </ClerkProvider>
    )
  }
  return <ConvexProvider client={convex}>{routes}</ConvexProvider>
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Root />
  </StrictMode>,
)
