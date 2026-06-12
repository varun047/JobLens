import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from './components/ProtectedRoute';
import Navbar from './components/Navbar';
import Login from './pages/Login';
import Onboarding from './pages/Onboarding';
import Dashboard from './pages/Dashboard';
import Analyze from './pages/Analyze';

function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-[#0f0f0f] text-zinc-200 flex flex-col">
        <Navbar />
        <main className="flex-grow">
          <Routes>
            <Route path="/login" element={<Login />} />

            <Route
              path="/onboarding"
              element={
                <ProtectedRoute>
                  <Onboarding />
                </ProtectedRoute>
              }
            />

            <Route
              path="/dashboard"
              element={
                <ProtectedRoute>
                  <Dashboard />
                </ProtectedRoute>
              }
            />

            <Route
              path="/analyze"
              element={
                <ProtectedRoute>
                  <Analyze />
                </ProtectedRoute>
              }
            />

            {/* Redirect root and unknown paths to dashboard */}
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}

export default App;
