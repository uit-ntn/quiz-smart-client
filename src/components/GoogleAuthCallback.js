import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import LoadingSpinner from './LoadingSpinner';

const GoogleAuthCallback = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { handleGoogleCallback } = useAuth();
  const [status, setStatus] = useState('processing');
  const [error, setError] = useState(null);

  useEffect(() => {
    const processCallback = async () => {
      try {
        const token = searchParams.get('token');
        const error = searchParams.get('error');

        if (error) {
          setError(decodeURIComponent(error));
          setStatus('error');
          return;
        }

        if (!token) {
          setError('Không nhận được token từ Google OAuth');
          setStatus('error');
          return;
        }

        // Handle the callback
        await handleGoogleCallback(token);
        setStatus('success');

        // Redirect to return URL or /topics
        const returnTo = localStorage.getItem('authReturnTo') || '/topics';
        localStorage.removeItem('authReturnTo');
        
        setTimeout(() => {
          navigate(returnTo, { replace: true });
        }, 1500);

      } catch (err) {
        console.error('Google auth callback error:', err);
        setError(err.message || 'Đã xảy ra lỗi trong quá trình đăng nhập');
        setStatus('error');
      }
    };

    processCallback();
  }, [searchParams, handleGoogleCallback, navigate]);

  const handleRetry = () => {
    const returnUrl = localStorage.getItem('authReturnTo') || '/';
    navigate('/login', { 
      state: { returnUrl },
      replace: true 
    });
  };

  const handleGoHome = () => {
    navigate('/', { replace: true });
  };

  if (status === 'processing') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <LoadingSpinner />
          <p className="mt-4 text-gray-600">Đang xử lý đăng nhập Google...</p>
        </div>
      </div>
    );
  }

  if (status === 'success') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 bg-green-100 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Đăng nhập thành công!</h2>
          <p className="text-gray-600">Đang chuyển hướng...</p>
        </div>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center max-w-md mx-auto">
          <div className="w-16 h-16 mx-auto mb-4 bg-red-100 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Đăng nhập thất bại</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <div className="space-x-4">
            <button
              onClick={handleRetry}
              className="inline-flex items-center px-4 py-2 bg-blue-600 border border-transparent rounded-md font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Thử lại
            </button>
            <button
              onClick={handleGoHome}
              className="inline-flex items-center px-4 py-2 bg-gray-300 border border-transparent rounded-md font-medium text-gray-700 hover:bg-gray-400 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
            >
              Về trang chủ
            </button>
          </div>
        </div>
      </div>
    );
  }

  return null;
};

export default GoogleAuthCallback;