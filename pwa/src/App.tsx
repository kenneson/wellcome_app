import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { supabase } from './lib/supabase';

// Pages
import { Login } from './pages/Login';
import { Home } from './pages/Home';
import { CreateEvent } from './pages/CreateEvent';

function PrivateRoute({ children, session }: { children: any, session: any }) {
  return session ? children : <Navigate to="/login" />;
}

export function App() {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });
  }, []);

  if (loading) {
    return <div className="page-container" style={{ justifyContent: 'center', alignItems: 'center' }}>Carregando...</div>;
  }

  return (
    <Router>
      <Routes>
        <Route path="/login" element={session ? <Navigate to="/" /> : <Login />} />
        
        <Route 
          path="/" 
          element={
            <PrivateRoute session={session}>
              <Home />
            </PrivateRoute>
          } 
        />
        <Route 
          path="/create" 
          element={
            <PrivateRoute session={session}>
              <CreateEvent />
            </PrivateRoute>
          } 
        />
      </Routes>
    </Router>
  );
}

export default App;
