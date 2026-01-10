import React, { useEffect, useState } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import authService from '../services/authService';
import LoadingSpinner from './LoadingSpinner';

const ProtectedRoute = ({ children, requireAuth = true, requireAdmin = false }) => {
  const [loading, setLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const location = useLocation();

  const checkAuth = async () => {
    try {
      const authenticated = authService.isAuthenticated();
      
      if (authenticated) {
        // Verify token is still valid
        const isValid = await authService.verifyToken();
        if (isValid) {
          setIsAuthenticated(true);
          setIsAdmin(authService.isAdmin());
        } else {
          setIsAuthenticated(false);
        }
      } else {
        setIsAuthenticated(false);
      }
    } catch (error) {
      console.error('Auth check error:', error);
      setIsAuthenticated(false);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkAuth();
  }, [location.pathname]); // Re-check when route changes

  // Listen for auth changes (login/logout events)
  useEffect(() => {
    const handleAuthChange = () => {
      checkAuth();
    };

    // Listen for custom events
    window.addEventListener('profileUpdated', handleAuthChange);
    window.addEventListener('authStateChanged', handleAuthChange);
    
    // Listen for storage changes (token/user changes)
    const handleStorageChange = (e) => {
      if (e.key === 'token' || e.key === 'user') {
        checkAuth();
      }
    };
    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('profileUpdated', handleAuthChange);
      window.removeEventListener('authStateChanged', handleAuthChange);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  if (loading) {
    return <LoadingSpinner message="Đang kiểm tra quyền truy cập..." />;
  }

  // If route requires authentication but user is not authenticated
  if (requireAuth && !isAuthenticated) {
    // Store the current location for redirect after login
    const returnPath = location.pathname + location.search;
    console.log('🔍 ProtectedRoute storing authReturnTo:', returnPath);
    localStorage.setItem('authReturnTo', returnPath);
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // If route requires admin but user is not admin
  if (requireAdmin && !isAdmin) {
    return <Navigate to="/" replace />;
  }

  // If route is for unauthenticated users only (like login/register) but user is authenticated
  // Note: We don't auto-redirect here to avoid race conditions with LoginPage's own redirect logic
  // LoginPage will handle redirect after successful login in its useEffect

  return children;
};

export default ProtectedRoute;