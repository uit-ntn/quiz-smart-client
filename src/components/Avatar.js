import React, { useState } from 'react';

const Avatar = ({ 
  src, 
  alt = 'User', 
  fallback = '👤', 
  size = 'md',
  className = '',
  borderColor = 'border-indigo-400',
  gradientFrom = 'from-violet-600',
  gradientTo = 'to-indigo-700'
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

  // Tạo fallback text từ alt (tên người dùng) nếu không có fallback được truyền vào
  const getFallbackText = () => {
    if (fallback && fallback !== '👤') {
      return typeof fallback === 'string' && fallback.length === 1 
        ? fallback.toUpperCase() 
        : fallback;
    }
    
    if (alt && alt !== 'User') {
      const words = alt.trim().split(/\s+/).filter(word => word.length > 0);
      if (words.length > 0) {
        if (words.length === 1) {
          return words[0].substring(0, 2).toUpperCase();
        }
        return (words[0][0] + words[1][0]).toUpperCase();
      }
    }
    
    return '👤';
  };

  // Keep a single source of truth for size: the wrapper.
  // Img/fallback use w-full/h-full to avoid layout "jump" when loading state toggles.
  const baseClasses = `w-full h-full rounded-xl object-cover border-[3px] ${borderColor} ${className} shadow-md`;
  const fallbackText = getFallbackText();

  return (
    <div className={`relative ${sizeClasses[size]} flex-shrink-0 z-0`}>
      {/* Loading spinner */}
      {imageStatus === 'loading' && src && (
        <div
          className="rounded-xl border-[3px] border-indigo-200 border-t-violet-600 border-r-indigo-500 border-b-transparent border-l-transparent animate-spin absolute inset-0 shadow-md"
        />
      )}

      {/* Image */}
      {src && (
        <img 
          src={src}
          alt={alt}
          className={`${baseClasses} transition-opacity duration-300 block ${
            imageStatus === 'loaded' ? 'opacity-100 relative' : 'opacity-0 absolute inset-0'
          }`}
          onLoad={handleImageLoad}
          onError={handleImageError}
        />
      )}

      {/* Fallback */}
      {(!src || imageStatus === 'error') && (
        <div className={`w-full h-full rounded-xl flex items-center justify-center font-extrabold ${textSizeClasses[size]} bg-gradient-to-br ${gradientFrom} ${gradientTo} text-white border-[3px] ${borderColor} shadow-md ${
          imageStatus === 'error' && src ? 'transition-opacity duration-300 opacity-100' : ''
        }`}>
          {fallbackText}
        </div>
      )}
    </div>
  );
};

export default Avatar;