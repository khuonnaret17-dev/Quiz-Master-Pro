
import * as React from 'react';
import { useState } from 'react';
import { UserRole } from '../types';
import { ADMIN_CONTACTS, SECRET_CODE } from '../constants';

interface AuthSectionProps {
  onLogin: (role: UserRole, username?: string) => void;
  secretCode: string;
}

const AuthSection: React.FC<AuthSectionProps> = ({ onLogin, secretCode }) => {
  const [view, setView] = useState<'main' | 'user_login' | 'admin_login'>('main');
  const [userInput, setUserInput] = useState('');
  const [passInput, setPassInput] = useState('');

  const handleAdminVerify = () => {
    if (passInput === SECRET_CODE) {
      onLogin('admin', 'Administrator');
    } else {
      alert("លេខកូដសម្ងាត់អ្នកគ្រប់គ្រងមិនត្រឹមត្រូវ!");
    }
  };

  const handleUserVerify = () => {
    const trimmedUser = userInput.trim();
    
    // លក្ខខណ្ឌ ១៖ Username មិនអាចទទេ
    if (!trimmedUser) {
      alert("សូមបញ្ចូល Username!");
      return;
    }

    // លក្ខខណ្ឌ ២៖ Password ត្រូវមាន ៦ខ្ទង់ ផ្ដើមដោយ ២០ និង បញ្ចប់ដោយ ២៦
    const isValidPassword = passInput.length === 6 && 
                            passInput.startsWith('20') && 
                            passInput.endsWith('26');

    if (isValidPassword) {
      onLogin('user', trimmedUser);
    } else {
      alert("Password មិនត្រឹមត្រូវ! ត្រូវមាន ៦ខ្ទង់ និងផ្ដើមដោយ ២០...២៦ (ឧទាហរណ៍៖ ២០០១២៦)");
    }
  };

  const renderBackButton = () => (
    <button 
      onClick={() => { 
        setView('main'); 
        setUserInput(''); 
        setPassInput(''); 
      }}
      className="absolute top-6 left-6 w-10 h-10 flex items-center justify-center bg-gray-100/80 backdrop-blur-md rounded-xl hover:bg-maroon hover:text-white transition-all z-20 shadow-sm"
    >
      ←
    </button>
  );

  return (
    <div className="animate-fadeIn relative">
      {view === 'main' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="glass-card p-8 rounded-[2.5rem] border border-white/50 shadow-2xl flex flex-col items-center text-center group">
            <div className="text-6xl mb-6 group-hover:scale-110 transition-transform duration-500">🎓</div>
            <h2 className="text-2xl font-black heading-kh text-indigo-900 mb-4">សម្រាប់សមាជិក</h2>
            <div className="space-y-3 w-full">
              <button 
                onClick={() => setView('user_login')} 
                className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-black heading-kh text-sm shadow-lg hover:bg-indigo-700 transition-all flex items-center justify-center gap-2 mb-4"
              >
                🔐 ចូលធ្វើតេស្ត (Login)
              </button>
              
              <div className="grid grid-cols-1 gap-3 mt-4">
                <p className="text-[10px] font-black uppercase text-gray-400 mb-1">ទំនាក់ទំនងបើកគណនី ៖</p>
                <a 
                  href={ADMIN_CONTACTS.admin1} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="w-full py-3.5 bg-blue-600 text-white rounded-2xl font-black heading-kh text-[11px] shadow-lg animate-breathing flex items-center justify-center gap-2"
                >
                  📱 អ្នកគ្រប់គ្រង
                </a>
                <a 
                  href={ADMIN_CONTACTS.admin2} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="w-full py-3.5 bg-blue-500 text-white rounded-2xl font-black heading-kh text-[11px] shadow-lg animate-breathing flex items-center justify-center gap-2"
                  style={{ animationDelay: '1s' }}
                >
                  📱 Master Quiz KH
                </a>
              </div>
            </div>
          </div>

          <button 
            onClick={() => setView('admin_login')} 
            className="glass-card p-8 rounded-[2.5rem] border border-white/50 shadow-2xl flex flex-col items-center text-center hover:bg-maroon/5 transition-all group"
          >
            <div className="text-6xl mb-6 group-hover:rotate-12 transition-transform duration-500">⚙️</div>
            <h2 className="text-2xl font-black heading-kh text-maroon mb-2">អ្នកគ្រប់គ្រង</h2>
            <p className="text-xs small-kh text-gray-400 mb-6">សម្រាប់រៀបចំ និងគ្រប់គ្រងសំណួរ</p>
            <div className="mt-auto w-full py-4 border-2 border-maroon/20 rounded-2xl text-maroon font-black heading-kh text-sm group-hover:bg-maroon group-hover:text-white transition-all">
              ចូលត្រួតពិនិត្យ
            </div>
          </button>
        </div>
      )}

      {view === 'user_login' && (
        <div className="glass-card rounded-[3rem] shadow-2xl p-10 md:p-12 text-center border-2 border-white animate-fadeIn relative">
          {renderBackButton()}
          <div className="text-6xl mb-6">🔑</div>
          <h2 className="text-2xl font-black heading-kh text-indigo-900 mb-2">Login</h2>
          <p className="text-xs small-kh text-gray-400 mb-8">សូមបញ្ចូល Username និង Password ដើម្បីចាប់ផ្ដើម</p>
          <div className="space-y-5 mb-8 text-left">
            <div>
              <label className="text-[11px] font-black uppercase text-indigo-900 ml-4 mb-2 block">Username</label>
              <input 
                type="text" 
                value={userInput} 
                onChange={(e) => setUserInput(e.target.value)} 
                className="w-full px-6 py-4 rounded-2xl border border-gray-100 bg-gray-50/50 outline-none focus:ring-4 focus:ring-indigo-500/10 focus:bg-white transition-all font-bold text-indigo-900" 
                placeholder="Username" 
              />
            </div>
            <div>
              <label className="text-[11px] font-black uppercase text-indigo-900 ml-4 mb-2 block">Password</label>
              <input 
                type="text" 
                inputMode="numeric"
                value={passInput} 
                onChange={(e) => setPassInput(e.target.value.replace(/\D/g, '').slice(0, 6))} 
                className="w-full px-6 py-4 rounded-2xl border border-gray-100 bg-gray-50/50 outline-none focus:ring-4 focus:ring-indigo-500/10 focus:bg-white transition-all font-bold tracking-widest text-indigo-900" 
                placeholder="Password" 
                onKeyDown={(e) => e.key === 'Enter' && handleUserVerify()} 
              />
            </div>
          </div>
          <button 
            onClick={handleUserVerify} 
            className="w-full bg-indigo-600 text-white font-black py-5 rounded-3xl shadow-xl hover:brightness-110 active:scale-95 transition-all heading-kh text-lg"
          >
            ចូលតេស្តឥឡូវនេះ
          </button>
        </div>
      )}

      {view === 'admin_login' && (
        <div className="glass-card rounded-[3rem] shadow-2xl p-10 md:p-12 text-center border-2 border-white animate-fadeIn relative">
          {renderBackButton()}
          <div className="text-6xl mb-6">🔒</div>
          <h2 className="text-2xl font-black heading-kh text-maroon mb-2">Admin Login</h2>
          <p className="text-xs small-kh text-gray-400 mb-8">សូមបញ្ចូលលេខកូដសម្ងាត់សម្រាប់ Admin</p>
          <input 
            type="password" 
            value={passInput} 
            autoFocus 
            onChange={(e) => setPassInput(e.target.value)} 
            className="w-full px-6 py-5 rounded-2xl border-2 border-gray-100 focus:border-maroon outline-none text-center mb-8 transition-all heading-kh text-2xl tracking-[1rem]" 
            placeholder="••••" 
            onKeyDown={(e) => e.key === 'Enter' && handleAdminVerify()} 
          />
          <button 
            onClick={handleAdminVerify} 
            className="w-full bg-maroon text-white font-black py-5 rounded-3xl shadow-xl hover:brightness-110 active:scale-95 transition-all heading-kh text-lg"
          >
            ផ្ទៀងផ្ទាត់ Admin
          </button>
        </div>
      )}
    </div>
  );
};

export default AuthSection;
