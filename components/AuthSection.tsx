
import * as React from 'react';
import { useState } from 'react';
import { UserRole } from '../types';

interface AuthSectionProps {
  onLogin: (role: UserRole) => void;
  secretCode: string;
}

const AuthSection: React.FC<AuthSectionProps> = ({ onLogin, secretCode }) => {
  const [showAdminInput, setShowAdminInput] = useState(false);
  const [pass, setPass] = useState('');

  const handleAdminVerify = () => {
    if (pass === secretCode) {
      onLogin('admin');
    } else {
      alert("លេខកូដសម្ងាត់មិនត្រឹមត្រូវ!");
    }
  };

  return (
    <div className="animate-fadeIn space-y-6">
      {!showAdminInput ? (
        <div className="grid grid-cols-1 gap-4">
          <button 
            onClick={() => onLogin('user')}
            className="glass-card p-8 rounded-3xl border border-white/50 text-center hover:bg-indigo-50 transition-all group"
          >
            <div className="text-5xl mb-4 group-hover:scale-110 transition-transform">🎓</div>
            <h2 className="text-xl font-bold heading-kh text-indigo-900">សម្រាប់សមាជិក</h2>
            <p className="text-xs text-gray-500 mt-2 small-kh">សម្រាប់ធ្វើតេស្តសមត្ថភាព</p>
          </button>

          <button 
            onClick={() => setShowAdminInput(true)}
            className="glass-card p-8 rounded-3xl border border-white/50 text-center hover:bg-maroon hover:bg-opacity-5 transition-all group"
          >
            <div className="text-5xl mb-4 group-hover:scale-110 transition-transform">⚙️</div>
            <h2 className="text-xl font-bold heading-kh text-maroon">សម្រាប់អ្នកគ្រប់គ្រង</h2>
            <p className="text-xs text-gray-500 mt-2 small-kh">សម្រាប់គ្រប់គ្រងសំណួរ</p>
          </button>
        </div>
      ) : (
        <div className="glass-card rounded-3xl shadow-xl p-10 text-center border border-white/50">
          <button 
            onClick={() => setShowAdminInput(false)}
            className="absolute top-4 left-4 p-2 text-gray-400 hover:text-maroon transition-colors"
          >
            ← ត្រឡប់ក្រោយ
          </button>
          <div className="text-5xl mb-6">🔒</div>
          <h2 className="text-2xl font-bold mb-3 heading-kh">ផ្ទៀងផ្ទាត់អ្នកគ្រប់គ្រង</h2>
          <p className="text-sm mb-8 leading-relaxed small-kh text-gray-500">សូមបញ្ចូលលេខកូដសម្ងាត់</p>
          <input 
            type="password" 
            value={pass}
            autoFocus
            onChange={(e) => setPass(e.target.value)}
            className="w-full px-5 py-3.5 rounded-2xl border border-gray-200 focus:ring-4 focus:ring-maroon focus:ring-opacity-10 outline-none text-center mb-6 transition-all small-kh" 
            placeholder="លេខកូដសម្ងាត់"
            onKeyDown={(e) => e.key === 'Enter' && handleAdminVerify()}
          />
          <button 
            onClick={handleAdminVerify}
            className="w-full bg-maroon text-white font-bold py-4 rounded-2xl transition-all shadow-md active:scale-[0.98] small-kh hover:bg-maroon-dark"
          >
            ផ្ទៀងផ្ទាត់
          </button>
        </div>
      )}
    </div>
  );
};

export default AuthSection;
