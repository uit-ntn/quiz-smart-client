import React, { useEffect } from 'react';
import { BrowserRouter as Router } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import AppRoutes from './routes/AppRoutes';

function App() {
  useEffect(() => {
    const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';
    const HEARTBEAT_URL =
      process.env.REACT_APP_PING_URL ||
      `${API_BASE_URL.replace(/\/+$/, '')}/topics?limit=1`;

    const pingBackend = () => {
      // Fire-and-forget heartbeat to keep backend warm/connected.
      fetch(HEARTBEAT_URL, {
        method: 'GET',
        cache: 'no-store',
        keepalive: true,
      }).catch(() => {});
    };

    pingBackend();
    const intervalId = window.setInterval(pingBackend, 5000);
    return () => window.clearInterval(intervalId);
  }, []);

  return (
    <Router>
      <AuthProvider>
        <div className="flex flex-col min-h-screen">
          <main className="flex-grow">
            <AppRoutes />
          </main>
        </div>
      </AuthProvider>
    </Router>
  );
}

export default App;
