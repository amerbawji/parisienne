import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Home } from './pages/Home';
import { Cart } from './pages/Cart';
import { Admin } from './pages/Admin';
import { TrackOrder } from './pages/TrackOrder';

// Marketing page — code-split so ordering customers never download it.
const Landing = lazy(() => import('./pages/Landing').then((m) => ({ default: m.Landing })));

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route
          path="/"
          element={
            <Suspense fallback={<div style={{ minHeight: '100vh', background: '#050f21' }} />}>
              <Landing />
            </Suspense>
          }
        />
        <Route path="/menu" element={<Home />} />
        <Route path="/cart" element={<Cart />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="/track" element={<TrackOrder />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
