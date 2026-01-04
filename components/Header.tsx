
import * as React from 'react';
import { AppMode } from '../types';

interface HeaderProps {
  mode: AppMode;
  setMode: (mode: AppMode) => void;
}

const Header: React.FC<HeaderProps> = ({ mode, setMode }) => {
  return (
    <div className="text-center mb-10 animate-fadeIn">
      <h1 className="text-5xl font-black mb-8 tracking-tight heading-kh text-maroon header-glow-maroon">
        កម្រងសំណួរពហុចម្លើយ
      </h1>
      <div className="inline-flex p-1.5 bg-white/20 backdrop-blur-md rounded-full shadow-2xl border border-white/30">
        <button 
          onClick={() => setMode('play')}
          className={`px-10 py-3 rounded-full font-bold transition-all text-sm tracking-wide ${
            mode === 'play' 
            ? 'bg-white text-indigo-900 shadow-xl' 
            : 'text-white hover:bg-white/10'
          }`}
        >
          សម្រាប់តេស្តសមត្ថភាព
        </button>
        <button 
          onClick={() => setMode('create')}
          className={`px-10 py-3 rounded-full font-bold transition-all text-sm tracking-wide ${
            mode === 'create' 
            ? 'bg-white text-indigo-900 shadow-xl' 
            : 'text-white hover:bg-white/10'
          }`}
        >
          បង្កើតសំណួរថ្មី
        </button>
      </div>
    </div>
  );
};

export default Header;
