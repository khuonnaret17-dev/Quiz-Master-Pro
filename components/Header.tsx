import * as React from 'react';
import { AppMode, UserRole } from '../types';

interface HeaderProps {
  mode: AppMode;
  role: UserRole;
  totalQuestions: number;
  cloudStatus?: boolean | 'error';
  setMode: (mode: AppMode) => void;
  onLogout: () => void;
}

const Header: React.FC<HeaderProps> = ({ mode, role, totalQuestions, cloudStatus, setMode, onLogout }) => {
  return (
    <div className="text-center mb-10 animate-fadeIn flex flex-col items-center">
      {/* ចំណងជើងធំ */}
      <div className="relative inline-block px-4">
        <h1 className="text-4xl md:text-5xl lg:text-6xl font-black mb-6 tracking-tight heading-kh text-maroon header-glow-maroon leading-[1.6] drop-shadow-sm py-2">
          ត្រៀមប្រឡងក្របខ័ណ្ឌរដ្ឋ
        </h1>
      </div>

      {/* របារព័ត៌មាន និងប៊ូតុងចាកចេញ */}
      <div className="flex flex-wrap justify-center items-center gap-4 mb-8 w-full max-w-2xl px-4">
        {/* បង្ហាញចំនួនសំណួរសរុប */}
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-black uppercase tracking-widest text-blue-700 bg-blue-50/50 backdrop-blur-md px-5 py-2.5 rounded-full border border-blue-100 shadow-sm small-kh whitespace-nowrap flex items-center gap-3">
            សំណួរសរុប៖ <span className="text-base font-black">{totalQuestions}</span> 📝
          </span>
        </div>
        
        {/* ប៊ូតុងចាកចេញ */}
        <button 
          onClick={onLogout}
          className="group flex items-center gap-2 text-[11px] font-bold bg-white/40 hover:bg-maroon hover:text-white backdrop-blur-md px-6 py-2.5 rounded-full text-maroon border border-white/60 transition-all duration-300 shadow-sm hover:shadow-maroon/20 active:scale-95 small-kh"
        >
          <span>ចាកចេញពីប្រព័ន្ធ</span>
          <span className="group-hover:translate-x-1 transition-transform">🚪</span>
        </button>
      </div>

      {/* ម៉ឺនុយប្តូរ Mode សម្រាប់ Admin */}
      {role === 'admin' && (
        <div className="inline-flex p-1.5 bg-white/30 backdrop-blur-xl rounded-[2rem] shadow-xl border border-white/50 animate-fadeIn">
          <button 
            onClick={() => setMode('play')}
            className={`px-6 sm:px-10 py-3 rounded-full font-bold transition-all text-xs sm:text-sm tracking-wide heading-kh ${
              mode === 'play' 
              ? 'bg-white text-maroon shadow-lg transform scale-105' 
              : 'text-maroon/60 hover:text-maroon hover:bg-white/20'
            }`}
          >
            តេស្តសមត្ថភាព
          </button>
          <button 
            onClick={() => setMode('create')}
            className={`px-6 sm:px-10 py-3 rounded-full font-bold transition-all text-xs sm:text-sm tracking-wide heading-kh ${
              mode === 'create' 
              ? 'bg-white text-maroon shadow-lg transform scale-105' 
              : 'text-maroon/60 hover:text-maroon hover:bg-white/20'
            }`}
          >
            គ្រប់គ្រងសំណួរ
          </button>
        </div>
      )}
    </div>
  );
};

export default Header;
