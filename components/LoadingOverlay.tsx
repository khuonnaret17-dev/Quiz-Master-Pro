
import * as React from 'react';

interface LoadingOverlayProps {
  message: string;
}

const LoadingOverlay: React.FC<LoadingOverlayProps> = ({ message }) => {
  return (
    <div className="fixed inset-0 bg-indigo-900/20 backdrop-blur-sm z-50 flex items-center justify-center p-6">
      <div className="bg-white rounded-[2.5rem] shadow-2xl p-10 max-w-sm w-full text-center animate-fadeIn">
        <div className="relative w-20 h-20 mx-auto mb-6">
          <div className="absolute inset-0 border-4 border-indigo-100 rounded-full"></div>
          <div className="absolute inset-0 border-4 border-indigo-600 rounded-full border-t-transparent animate-spin"></div>
          <div className="absolute inset-0 flex items-center justify-center text-2xl">✨</div>
        </div>
        <h3 className="text-xl font-bold text-gray-800 mb-2">សូមរង់ចាំបន្តិច</h3>
        <p className="text-gray-500 text-sm leading-relaxed">{message}</p>
      </div>
    </div>
  );
};

export default LoadingOverlay;
