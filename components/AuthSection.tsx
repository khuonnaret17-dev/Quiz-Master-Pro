
import * as React from 'react';
import { useState } from 'react';

interface AuthSectionProps {
  onVerify: (pass: string) => void;
}

const AuthSection: React.FC<AuthSectionProps> = ({ onVerify }) => {
  const [pass, setPass] = useState('');

  return (
    <div className="animate-fadeIn">
      <div className="glass-card rounded-3xl shadow-xl p-10 text-center max-w-sm mx-auto border border-white/50">
        <div className="text-5xl mb-6">🔒</div>
        <h2 className="text-2xl font-bold mb-3 heading-kh">តំបន់សុវត្ថិភាព</h2>
        <p className="text-sm mb-8 leading-relaxed small-kh">សូមបញ្ចូលលេខកូដសម្ងាត់ដើម្បីគ្រប់គ្រង និងបង្កើតសំណួរថ្មី</p>
        <input 
          type="password" 
          value={pass}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPass(e.target.value)}
          className="w-full px-5 py-3.5 rounded-2xl border border-gray-200 focus:ring-4 focus:ring-indigo-100 outline-none text-center mb-6 transition-all small-kh" 
          placeholder="លេខកូដសម្ងាត់"
          onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => e.key === 'Enter' && onVerify(pass)}
        />
        <button 
          onClick={() => onVerify(pass)}
          className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-4 rounded-2xl transition-all shadow-md active:scale-[0.98] small-kh"
        >
          ផ្ទៀងផ្ទាត់
        </button>
      </div>
    </div>
  );
};

export default AuthSection;
