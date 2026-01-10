import React, { createContext, useContext, useState, useEffect } from 'react';
import authService from '../services/authService';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);

  // Check authentication status on app load
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const token = authService.getToken();
        if (token) {
          // Verify token with backend
          const userData = await authService.getCurrentUser();
          setUser(userData);
          setIsAuthenticated(true);
        }
      } catch (error) {
        console.error('Auth check failed:', error);
        // Token might be invalid, clear it
        authService.logout();
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  // Listen for profile updates via custom event
  useEffect(() => {
    const handleProfileUpdate = (e) => {
      if (e.detail && e.detail.user) {
        setUser(e.detail.user);
      }
    };

    // Listen for custom event when profile is updated
    window.addEventListener('profileUpdated', handleProfileUpdate);

    // Also listen for storage events (from other tabs/windows)
    const handleStorageChange = (e) => {
      if (e.key === 'user' && e.newValue) {
        try {
          const newUser = JSON.parse(e.newValue);
          if (newUser && newUser._id) {
            setUser(newUser);
          }
        } catch (error) {
          console.error('Error parsing user from localStorage:', error);
        }
      }
    };
    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('profileUpdated', handleProfileUpdate);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  // Listen for localStorage changes to update user automatically
  useEffect(() => {
    const handleStorageChange = (e) => {
      if (e.key === 'user' && e.newValue) {
        try {
          const newUser = JSON.parse(e.newValue);
          if (newUser && newUser._id) {
            setUser(newUser);
          }
        } catch (error) {
          console.error('Error parsing user from localStorage:', error);
        }
      }
    };

    // Listen for storage events (from other tabs/windows)
    window.addEventListener('storage', handleStorageChange);

    // Also check localStorage periodically for same-tab updates
    const intervalId = setInterval(() => {
      try {
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
          const parsedUser = JSON.parse(storedUser);
          // Only update if user ID matches and data is different
          if (parsedUser && parsedUser._id && (!user || user._id !== parsedUser._id || JSON.stringify(user) !== storedUser)) {
            setUser(parsedUser);
          }
        }
      } catch (error) {
        // Ignore errors
      }
    }, 1000); // Check every second

    return () => {
      window.removeEventListener('storage', handleStorageChange);
      clearInterval(intervalId);
    };
  }, [user]);

  const login = async (credentials) => {
    try {
      const response = await authService.login(credentials);
      setUser(response.user);
      setIsAuthenticated(true);
      return response;
    } catch (error) {
      throw error;
    }
  };

  const register = async (userData) => {
    try {
      const response = await authService.register(userData);
      setUser(response.user);
      setIsAuthenticated(true);
      return response;
    } catch (error) {
      throw error;
    }
  };

  const logout = async () => {
    try {
      await authService.logout();
      setUser(null);
      setIsAuthenticated(false);
    } catch (error) {
      console.error('Logout error:', error);
      // Clear local state even if server logout fails
      setUser(null);
      setIsAuthenticated(false);
    }
  };

  const loginWithGoogle = async (returnUrl = null) => {
    try {
      await authService.initiateGoogleLogin(returnUrl);
      // No need to update state here, will be handled in callback
    } catch (error) {
      throw error;
    }
  };

  const handleGoogleCallback = async (token) => {
    try {
      const response = await authService.handleGoogleCallback(token);
      setUser(response.user);
      setIsAuthenticated(true);
      return response;
    } catch (error) {
      throw error;
    }
  };

  const updateUser = (userData) => {
    setUser(userData);
    // Update localStorage as well
    localStorage.setItem('user', JSON.stringify(userData));
  };

  const refreshAuth = async () => {
    try {
      const token = authService.getToken();
      if (token) {
        const userData = await authService.getCurrentUser();
        setUser(userData);
        setIsAuthenticated(true);
        return userData;
      } else {
        setUser(null);
        setIsAuthenticated(false);
      }
    } catch (error) {
      console.error('Auth refresh failed:', error);
      setUser(null);
      setIsAuthenticated(false);
      authService.logout();
    }
  };

  const value = {
    user,
    isAuthenticated,
    loading,
    login,
    register,
    logout,
    loginWithGoogle,
    handleGoogleCallback,
    updateUser,
    refreshAuth
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthContext;