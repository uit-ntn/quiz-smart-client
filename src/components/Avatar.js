import React, { useState } from 'react';

const Avatar = ({ 
  src, 
  alt = 'User', 
  fallback = '👤', 
  size = 'md',
  className = '',
  borderColor = 'border-blue-200',
  gradientFrom = 'from-blue-500',
  gradientTo = 'to-indigo-600'
}) => {
  const [imageStatus, setImageStatus] = useState('loading'); // 'loading', 'loaded', 'error'

  // Size classes - responsive trên mobile
  const sizeClasses = {
    sm: 'w-8 h-8 md:w-10 md:h-10',
    md: 'w-12 h-12 md:w-14 md:h-14', 
    lg: 'w-14 h-14 md:w-16 md:h-16',
    xl: 'w-16 h-16 md:w-20 md:h-20'
  };

  const textSizeClasses = {
    sm: 'text-xs md:text-sm',
    md: 'text-sm md:text-base',
    lg: 'text-base md:text-lg', 
    xl: 'text-lg md:text-xl'
  };

  const handleImageLoad = () => {
    setImageStatus('loaded');
  };

  const handleImageError = () => {
    setImageStatus('error');
  };

  const baseClasses = `${sizeClasses[size]} rounded-xl object-cover border-2 ${borderColor} ${className}`;

  return (
    <div className={`relative ${sizeClasses[size]} flex-shrink-0 z-0`}>
      {/* Loading spinner - hiện khi đang loading */}
      {imageStatus === 'loading' && src && (
        <div className={`${sizeClasses[size]} rounded-xl border-4 border-slate-200 border-t-blue-500 border-r-blue-500 border-b-transparent border-l-transparent animate-spin absolute inset-0`} />
      )}

      {/* Image - hiện khi load thành công */}
      {src && (
        <img 
          src={src}
          alt={alt}
          className={`${baseClasses} transition-opacity duration-300 ${
            imageStatus === 'loaded' ? 'opacity-100 relative' : 'opacity-0 absolute inset-0'
          }`}
          onLoad={handleImageLoad}
          onError={handleImageError}
        />
      )}

      {/* Fallback - hiện khi không có src hoặc load lỗi */}
      {(!src || imageStatus === 'error') && (
        <div className={`${sizeClasses[size]} rounded-xl flex items-center justify-center font-bold ${textSizeClasses[size]} bg-gradient-to-br ${gradientFrom} ${gradientTo} text-white border-2 ${borderColor} ${
          imageStatus === 'error' && src ? 'transition-opacity duration-300 opacity-100' : ''
        }`}>
          {typeof fallback === 'string' && fallback.length === 1 ? fallback.toUpperCase() : fallback}
        </div>
      )}
    </div>
  );
};

export default Avatar;