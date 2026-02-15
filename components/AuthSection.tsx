
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
    if (!trimmedUser) return alert("សូមបញ្ចូល Username!");
    const isValidPassword = passInput.length === 6 && passInput.startsWith('20') && passInput.endsWith('26');

    if (isValidPassword) {
      onLogin('user', trimmedUser);
    } else {
      alert("Password មិនត្រឹមត្រូវ!");
    }
  };

  return (
    <div className="page-transition relative max-w-5xl mx-auto px-4">
      {view === 'main' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-stretch">
          
          {/* Member Card - With Running Line Animation */}
          <div className="relative group rounded-[2.5rem] p-[3px] overflow-hidden transition-all duration-500 hover:-translate-y-2 hover:shadow-2xl shadow-xl h-full">
            {/* Animated Running Line (Blue) */}
            <div className="absolute inset-[-150%] bg-[conic-gradient(from_0deg_at_50%_50%,transparent_0%,transparent_85%,#3B82F6_100%)] animate-[spin_4s_linear_infinite]"></div>
            
            {/* Card Content */}
            <div className="relative bg-white rounded-[2.3rem] p-8 h-full flex flex-col items-center text-center z-10 overflow-hidden">
              {/* Background Decorations */}
              <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-blue-400 via-indigo-500 to-purple-500"></div>
              <div className="absolute -top-20 -right-20 w-60 h-60 bg-blue-50 rounded-full blur-3xl opacity-50 group-hover:opacity-80 transition-opacity duration-700"></div>
              <div className="absolute bottom-0 left-0 w-full h-32 bg-gradient-to-t from-white via-white to-transparent z-10"></div>
              
              <div className="relative flex flex-col items-center text-center z-20 h-full w-full">
                <div className="relative mb-6">
                  <div className="absolute inset-0 bg-blue-400 blur-2xl opacity-20 rounded-full group-hover:opacity-40 transition-opacity"></div>
                  <div className="w-24 h-24 bg-gradient-to-br from-white to-blue-50 rounded-[2rem] flex items-center justify-center text-5xl shadow-lg border border-blue-100 transform group-hover:scale-110 group-hover:rotate-3 transition-all duration-500">
                    👨‍🎓
                  </div>
                </div>
                
                <h2 className="text-3xl font-black heading-kh text-transparent bg-clip-text bg-gradient-to-r from-indigo-950 to-blue-800 mb-2">សមាជិក</h2>
                <p className="text-sm text-gray-500 font-medium small-kh mb-8">ចូលរៀន និងពង្រឹងសមត្ថភាព</p>
                
                <div className="w-full flex flex-col gap-5 mt-auto">
                  <button 
                    onClick={() => setView('user_login')} 
                    className="w-full py-4 rounded-2xl font-black heading-kh text-lg text-white bg-gradient-to-r from-indigo-600 to-blue-600 shadow-lg shadow-blue-500/30 hover:shadow-blue-500/50 hover:scale-[1.02] active:scale-[0.98] transition-all duration-300"
                  >
                    🔐 ចូលរៀន
                  </button>
                  
                  {/* Contact Section */}
                  <div className="bg-gradient-to-b from-slate-50 to-white p-5 rounded-2xl border-2 border-dashed border-indigo-200 relative mt-2 group/contact hover:border-indigo-400 transition-colors w-full">
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-indigo-600 to-blue-600 text-white px-4 py-1 rounded-full text-[10px] font-black heading-kh shadow-md tracking-wider whitespace-nowrap">
                       បើកគណនីដើម្បីប្រើប្រាស់
                    </div>
                    
                    <p className="text-sm font-black heading-kh text-indigo-900 mb-4 mt-2">✨ ទំនាក់ទំនងដើម្បីបើកគណនី ✨</p>
                    
                    <div className="grid grid-cols-2 gap-3">
                      <a href={ADMIN_CONTACTS.admin1} target="_blank" className="py-3 bg-white text-indigo-950 rounded-xl font-black heading-kh text-[11px] border border-gray-100 shadow-sm hover:shadow-md hover:border-blue-200 hover:-translate-y-1 transition-all flex items-center justify-center gap-2 group/btn">
                         <span className="text-blue-500 text-lg group-hover/btn:rotate-12 transition-transform">✈️</span> អ្នកគ្រប់គ្រង
                      </a>
                      <a href={ADMIN_CONTACTS.admin2} target="_blank" className="py-3 bg-white text-indigo-950 rounded-xl font-black heading-kh text-[11px] border border-gray-100 shadow-sm hover:shadow-md hover:border-blue-200 hover:-translate-y-1 transition-all flex items-center justify-center gap-2 group/btn">
                         <span className="text-blue-500 text-lg group-hover/btn:rotate-12 transition-transform">✈️</span> Master Quiz KH
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Admin Card - With Running Line Animation */}
          <div 
            onClick={() => setView('admin_login')}
            className="relative group rounded-[2.5rem] p-[3px] overflow-hidden transition-all duration-500 hover:-translate-y-2 hover:shadow-2xl shadow-xl h-full cursor-pointer"
          >
             {/* Animated Running Line (Red) */}
            <div className="absolute inset-[-150%] bg-[conic-gradient(from_0deg_at_50%_50%,transparent_0%,transparent_85%,#DC2626_100%)] animate-[spin_4s_linear_infinite]"></div>

            {/* Card Content */}
            <div className="relative bg-white rounded-[2.3rem] p-8 h-full flex flex-col items-center text-center z-10 overflow-hidden">
              {/* Background Decorations */}
              <div className="absolute top-0 left-0 w-full h-1.5 bg-gradient-to-r from-red-500 via-rose-500 to-pink-600"></div>
              <div className="absolute -top-20 -right-20 w-60 h-60 bg-red-50 rounded-full blur-3xl opacity-50 group-hover:opacity-80 transition-opacity duration-700"></div>
              
              <div className="relative flex flex-col items-center text-center z-20 h-full w-full">
                <div className="relative mb-6">
                  <div className="absolute inset-0 bg-red-400 blur-2xl opacity-20 rounded-full group-hover:opacity-40 transition-opacity"></div>
                  <div className="w-24 h-24 bg-gradient-to-br from-white to-red-50 rounded-[2rem] flex items-center justify-center text-5xl shadow-lg border border-red-100 transform group-hover:rotate-180 transition-all duration-1000 ease-in-out">
                    ⚙️
                  </div>
                </div>

                <h2 className="text-3xl font-black heading-kh text-transparent bg-clip-text bg-gradient-to-r from-red-900 to-rose-700 mb-2">ADMIN</h2>
                <p className="text-sm text-gray-500 font-medium small-kh mb-8">គ្រប់គ្រងប្រព័ន្ធ</p>
                
                <div className="mt-auto w-full">
                   <button className="w-full py-4 rounded-2xl font-black heading-kh text-lg text-white bg-gradient-to-r from-red-700 to-rose-600 shadow-lg shadow-red-500/30 group-hover:shadow-red-500/50 group-hover:scale-[1.02] active:scale-[0.98] transition-all duration-300">
                    គ្រប់គ្រង 🚀
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {(view === 'user_login' || view === 'admin_login') && (
        <div className="card-white-elegant p-8 md:p-12 text-center page-transition relative max-w-md mx-auto">
          <button 
            onClick={() => { setView('main'); setUserInput(''); setPassInput(''); }}
            className="absolute top-6 left-6 w-10 h-10 flex items-center justify-center bg-gray-100 rounded-xl hover:bg-maroon hover:text-white transition-all shadow-sm font-black text-xl z-20"
          >
            ←
          </button>
          
          <div className="relative mb-8 mt-2">
            <div className={`w-28 h-28 mx-auto rounded-[2rem] flex items-center justify-center text-5xl shadow-inner border border-gray-100 ${view === 'user_login' ? 'bg-blue-50 text-blue-600' : 'bg-red-50 text-red-600'}`}>
              {view === 'user_login' ? '👤' : '🔒'}
            </div>
            {/* Animated Ring */}
            <div className={`absolute inset-0 m-auto w-28 h-28 rounded-[2rem] border-2 ${view === 'user_login' ? 'border-blue-500' : 'border-red-500'} animate-ping opacity-20`}></div>
          </div>

          <h2 className={`text-2xl font-black heading-kh mb-2 ${view === 'user_login' ? 'text-indigo-950' : 'text-maroon-bold'}`}>
            {view === 'user_login' ? 'ចូលជាសមាជិក' : 'ចូលជា ADMIN'}
          </h2>
          <p className="text-xs small-kh text-gray-400 mb-8 uppercase tracking-widest">បញ្ជាក់អត្តសញ្ញាណ</p>

          <div className="space-y-6 mb-10 text-left">
            {view === 'user_login' && (
              <div className="group">
                <label className="text-[10px] font-black uppercase text-indigo-950 ml-4 mb-2 block tracking-widest small-kh group-focus-within:text-blue-600 transition-colors">Username</label>
                <input 
                  type="text" 
                  value={userInput} 
                  onChange={(e) => setUserInput(e.target.value)} 
                  className="input-elegant w-full px-6 py-4 rounded-2xl border-2 border-gray-100 focus:border-blue-500 focus:bg-blue-50/20 transition-all font-bold text-lg" 
                  placeholder="វាយឈ្មោះ..." 
                />
              </div>
            )}
            <div className="group">
              <label className={`text-[10px] font-black uppercase ml-4 mb-2 block tracking-widest small-kh transition-colors ${view === 'admin_login' ? 'text-maroon-bold group-focus-within:text-red-600' : 'text-indigo-950 group-focus-within:text-blue-600'}`}>
                {view === 'user_login' ? 'Password (៦ខ្ទង់)' : 'Admin Password'}
              </label>
              <input 
                type={view === 'user_login' ? 'text' : 'password'} 
                inputMode={view === 'user_login' ? 'numeric' : 'text'}
                value={passInput} 
                onChange={(e) => setPassInput(view === 'user_login' ? e.target.value.replace(/\D/g, '').slice(0, 6) : e.target.value)} 
                className={`input-elegant w-full px-6 py-4 rounded-2xl border-2 border-gray-100 focus:bg-opacity-20 transition-all font-bold text-lg ${view === 'admin_login' ? 'text-center tracking-[0.5em] focus:border-red-500 focus:bg-red-50' : 'focus:border-blue-500 focus:bg-blue-50'}`} 
                placeholder={view === 'user_login' ? "••••••" : "••••"}
                onKeyDown={(e) => e.key === 'Enter' && (view === 'user_login' ? handleUserVerify() : handleAdminVerify())} 
              />
            </div>
          </div>

          <button 
            onClick={view === 'user_login' ? handleUserVerify : handleAdminVerify} 
            className={`w-full py-4 rounded-2xl font-black heading-kh text-lg text-white shadow-xl hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 ${view === 'user_login' ? 'bg-gradient-to-r from-blue-600 to-indigo-700 shadow-blue-500/30' : 'bg-gradient-to-r from-red-600 to-rose-700 shadow-red-500/30'}`}
          >
            យល់ព្រម 🚀
          </button>
        </div>
      )}
    </div>
  );
};

export default AuthSection;
