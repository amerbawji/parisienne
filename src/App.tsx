import { lazy, Suspense, useEffect } from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { Home } from './pages/Home';
import { Cart } from './pages/Cart';
import { Admin } from './pages/Admin';
import { TrackOrder } from './pages/TrackOrder';

// Marketing page — code-split so ordering customers never download it.
const Landing = lazy(() => import('./pages/Landing').then((m) => ({ default: m.Landing })));

/** Browsers keep the old scroll position across client-side navigation. */
function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

function App() {
  return (
    <BrowserRouter>
      <ScrollToTop />
      <Routes>
        {/* The menu is the front door. The landing page stays built and
            reachable at /landing, but nothing links to it. */}
        <Route path="/" element={<Home />} />
        <Route path="/menu" element={<Home />} />
        <Route
          path="/landing"
          element={
            <Suspense fallback={<div style={{ minHeight: '100vh', background: '#050f21' }} />}>
              <Landing />
            </Suspense>
          }
        />
        <Route path="/cart" element={<Cart />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="/track" element={<TrackOrder />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
