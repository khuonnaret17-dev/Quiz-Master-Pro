
import * as React from 'react';
import { useState, useMemo } from 'react';
import { Question } from '../types';
import { ADMIN_CONTACTS } from '../constants';

interface PlaySectionProps {
  quizData: Question[];
  onStartQuiz: (subject: string, partIndex: number, type: 'mcq' | 'short', customQuestions?: Question[], isMixed?: boolean) => void;
}

const PlaySection: React.FC<PlaySectionProps> = ({ quizData, onStartQuiz }) => {
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
  const [activeType, setActiveType] = useState<'mcq' | 'short'>('mcq');
  const [searchQuery, setSearchQuery] = useState('');
  const [viewingQuestion, setViewingQuestion] = useState<Question | null>(null);
  
  // States សម្រាប់ Mixed Mode
  const [playMode, setPlayMode] = useState<'by-subject' | 'mixed'>('by-subject');
  const [selectedMixSubjects, setSelectedMixSubjects] = useState<string[]>([]);
  const [mixCount, setMixCount] = useState<number>(20);
  
  const KHMER_DIGITS = ['០', '១', '២', '៣', '៤', '៥', '៦', '៧', '៨', '៩'];
  const KHMER_PREFIXES = ['ក', 'ខ', 'គ', 'ឃ'];
  
  const toKhmerNumeral = (n: number) => {
    return n.toString().split('').map(digit => KHMER_DIGITS[parseInt(digit)] || digit).join('');
  };

  const activeQuestions = quizData.filter((q: Question) => q.isActive !== false);
  
  const subjects: string[] = Array.from(new Set(activeQuestions.filter(q => q.type === activeType).map((item: Question) => item.subject)));

  const handleToggleMixSubject = (sub: string) => {
    setSelectedMixSubjects(prev => 
      prev.includes(sub) ? prev.filter(s => s !== sub) : [...prev, sub]
    );
  };

  const handleStartMixedTest = () => {
    if (selectedMixSubjects.length === 0) return alert("សូមជ្រើសរើសមុខវិជ្ជាយ៉ាងហោចណាស់មួយ!");
    
    // ចាប់យកសំណួរពីមុខវិជ្ជាដែលបានជ្រើសរើស
    let pool = activeQuestions.filter(q => q.type === activeType && selectedMixSubjects.includes(q.subject));
    
    // Shuffle pool
    const shuffled = [...pool].sort(() => Math.random() - 0.5);
    
    // កាត់យកតាមចំនួនដែលចង់បាន
    const selected = shuffled.slice(0, mixCount);
    
    if (selected.length === 0) return alert("មិនមានសំណួរក្នុងមុខវិជ្ជាដែលបានជ្រើសរើសឡើយ!");
    
    onStartQuiz("តេស្តចម្រុះ", 0, activeType, selected, true);
  };

  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];
    return activeQuestions.filter(q => 
      q.type === activeType && 
      (q.question.toLowerCase().includes(searchQuery.toLowerCase()) || 
       (q.answer && q.answer.toLowerCase().includes(searchQuery.toLowerCase())))
    );
  }, [activeQuestions, searchQuery, activeType]);

  if (selectedSubject) {
    const subjectQuestions = activeQuestions.filter((q: Question) => q.subject === selectedSubject && q.type === activeType);
    const totalQuestions = subjectQuestions.length;
    const itemsPerPart = 10;
    const totalParts = Math.ceil(totalQuestions / itemsPerPart);

    return (
      <div className="animate-fadeIn space-y-6">
        <div className="glass-card p-6 md:p-8 rounded-[2.5rem] flex flex-col md:flex-row items-center gap-6 mb-8 border border-white/50 shadow-xl">
          <button onClick={() => setSelectedSubject(null)} className="p-5 bg-maroon/5 hover:bg-maroon hover:text-white rounded-2xl transition-all active:scale-90 shrink-0 shadow-sm">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M15 19l-7-7 7-7" /></svg>
          </button>
          <div className="text-center md:text-left">
            <h2 className="text-3xl font-black heading-kh text-maroon">{selectedSubject}</h2>
            <p className="text-sm small-kh text-gray-500 mt-1">ប្រភេទ៖ {activeType === 'mcq' ? 'QCM' : 'Q & A'} (ភាគនីមួយៗមាន ១០ សំណួរ)</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {Array.from({ length: totalParts }).map((_, i) => (
            <button key={i} onClick={() => onStartQuiz(selectedSubject, i, activeType)} className="glass-card p-8 rounded-[2rem] text-left transition-all active:scale-95 group shadow-md hover:shadow-xl border border-white/40">
              <div className="flex justify-between items-center">
                <div>
                  <span className="text-[10px] font-black text-maroon/60 uppercase tracking-widest mb-2 block">ភាគទី {toKhmerNumeral(i + 1)}</span>
                  <h4 className="text-xl font-black heading-kh !text-maroon">សំណួរទី {toKhmerNumeral(i * 10 + 1)} ដល់ {toKhmerNumeral(Math.min((i + 1) * 10, totalQuestions))}</h4>
                </div>
                <div className="w-14 h-14 rounded-2xl bg-maroon/5 flex items-center justify-center text-maroon group-hover:bg-maroon group-hover:text-white transition-all">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M9 5l7 7-7 7" /></svg>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fadeIn space-y-8 pb-20">
      {/* Question Detail Modal */}
      {viewingQuestion && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[150] flex items-center justify-center p-4 animate-fadeIn">
          <div className="glass-card w-full max-w-2xl rounded-[3rem] p-8 md:p-12 shadow-2xl border-2 border-white relative max-h-[90vh] overflow-y-auto custom-scrollbar">
            <button onClick={() => setViewingQuestion(null)} className="absolute top-6 right-6 w-12 h-12 flex items-center justify-center bg-gray-100 rounded-2xl hover:bg-maroon hover:text-white transition-all">✕</button>
            <div className="mb-8">
              <span className="bg-maroon/10 text-maroon px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest">{viewingQuestion.subject}</span>
              <h3 className="text-2xl md:text-3xl font-black heading-kh text-maroon mt-4 leading-relaxed">{viewingQuestion.question}</h3>
            </div>
            {viewingQuestion.type === 'mcq' ? (
              <div className="grid gap-3">
                {viewingQuestion.options?.map((opt, i) => (
                  <div key={i} className={`p-5 rounded-2xl border-2 flex items-center gap-4 ${i === viewingQuestion.correct ? 'bg-green-50 border-green-500 ring-4 ring-green-100' : 'bg-white border-gray-100'}`}>
                    <span className={`w-10 h-10 rounded-xl flex items-center justify-center font-black ${i === viewingQuestion.correct ? 'bg-green-500 text-white' : 'bg-gray-100 text-maroon'}`}>{KHMER_PREFIXES[i]}</span>
                    <span className={`flex-1 font-bold small-kh ${i === viewingQuestion.correct ? 'text-green-800' : 'text-gray-700'}`}>{opt}</span>
                    {i === viewingQuestion.correct && <span className="text-xl">✅</span>}
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-green-50/50 border-l-8 border-green-500 rounded-r-3xl p-8">
                <p className="font-black text-green-700 heading-kh text-xl mb-2">ចម្លើយ ៖</p>
                <div className="text-gray-800 leading-loose small-kh font-medium text-lg md:text-xl whitespace-pre-wrap">{viewingQuestion.answer}</div>
              </div>
            )}
            <div className="mt-10 flex justify-center">
              <button onClick={() => setViewingQuestion(null)} className="bg-maroon text-white font-black px-12 py-4 rounded-full shadow-xl hover:brightness-110 transition-all heading-kh">យល់ព្រម</button>
            </div>
          </div>
        </div>
      )}

      {/* Main Mode Tabs */}
      <div className="flex flex-col items-center gap-6">
        <div className="bg-white/40 backdrop-blur-md p-1.5 rounded-[2rem] border border-white/60 shadow-lg flex">
          <button 
            onClick={() => setPlayMode('by-subject')} 
            className={`px-6 sm:px-10 py-3 rounded-full font-black heading-kh text-sm transition-all ${playMode === 'by-subject' ? 'bg-white text-maroon shadow-md scale-105' : 'text-gray-500 hover:text-gray-700'}`}
          >
            តាមមុខវិជ្ជា
          </button>
          <button 
            onClick={() => setPlayMode('mixed')} 
            className={`px-6 sm:px-10 py-3 rounded-full font-black heading-kh text-sm transition-all ${playMode === 'mixed' ? 'bg-white text-maroon shadow-md scale-105' : 'text-gray-500 hover:text-gray-700'}`}
          >
            តេស្តចម្រុះ ⚡
          </button>
        </div>

        {/* Search Bar only for By-Subject or Hidden in Mixed */}
        {playMode === 'by-subject' && (
          <div className="w-full max-w-2xl relative group">
            <input 
              type="text" 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={`ស្វែងរកសំណួរក្នុងផ្នែក ${activeType === 'mcq' ? 'QCM' : 'Q & A'}...`} 
              className="w-full pl-14 pr-14 py-5 bg-white/80 backdrop-blur-md border border-white/60 rounded-[2rem] outline-none focus:ring-4 focus:ring-maroon/10 focus:bg-white transition-all shadow-xl heading-kh text-maroon placeholder:text-gray-300"
            />
            <div className="absolute left-6 top-5 text-maroon/30 group-focus-within:text-maroon transition-colors">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>
        )}
      </div>

      {playMode === 'mixed' ? (
        <div className="animate-fadeIn space-y-8">
          <div className="glass-card rounded-[2.5rem] p-8 md:p-12 border border-white/60 shadow-xl">
            <h3 className="text-2xl font-black heading-kh text-maroon mb-8 text-center">រៀបចំវិញ្ញាសាចម្រុះ</h3>
            
            <div className="space-y-8">
              {/* Type Toggle */}
              <div className="flex justify-center">
                <div className="flex bg-gray-100 p-1 rounded-2xl">
                  <button onClick={() => setActiveType('mcq')} className={`px-6 py-2 rounded-xl text-xs font-black transition-all ${activeType === 'mcq' ? 'bg-white text-blue-700 shadow-sm' : 'text-gray-400'}`}>QCM</button>
                  <button onClick={() => setActiveType('short')} className={`px-6 py-2 rounded-xl text-xs font-black transition-all ${activeType === 'short' ? 'bg-white text-orange-700 shadow-sm' : 'text-gray-400'}`}>Q & A</button>
                </div>
              </div>

              {/* Subject Selection Grid */}
              <div className="space-y-4">
                <label className="text-[10px] font-black uppercase text-gray-400 block ml-2">ជ្រើសរើសមុខវិជ្ជា (ជ្រើសបានលើសពីមួយ)</label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {subjects.map((sub, i) => (
                    <button 
                      key={i} 
                      onClick={() => handleToggleMixSubject(sub)}
                      className={`p-4 rounded-2xl border-2 transition-all flex items-center justify-between group ${selectedMixSubjects.includes(sub) ? 'bg-maroon/5 border-maroon text-maroon' : 'bg-white border-gray-100 text-gray-600 hover:border-maroon/30'}`}
                    >
                      <span className="text-xs font-bold small-kh truncate flex-1">{sub}</span>
                      <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all ${selectedMixSubjects.includes(sub) ? 'bg-maroon border-maroon text-white scale-110' : 'border-gray-200'}`}>
                        {selectedMixSubjects.includes(sub) && <span className="text-[10px]">✓</span>}
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Count Selection */}
              <div className="space-y-4">
                <label className="text-[10px] font-black uppercase text-gray-400 block ml-2">ចំនួនសំណួរដែលត្រូវបង្ហាញ</label>
                <div className="flex flex-wrap gap-3">
                  {[10, 20, 30, 50, 100].map(count => (
                    <button 
                      key={count} 
                      onClick={() => setMixCount(count)}
                      className={`px-6 py-3 rounded-xl font-black text-xs transition-all ${mixCount === count ? 'bg-maroon text-white shadow-lg scale-105' : 'bg-gray-100 text-gray-400 hover:bg-gray-200'}`}
                    >
                      {toKhmerNumeral(count)} សំណួរ
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-6">
                <button 
                  onClick={handleStartMixedTest}
                  className="w-full bg-maroon text-white font-black py-5 rounded-[2rem] shadow-xl hover:brightness-110 transition-all heading-kh text-xl flex items-center justify-center gap-3"
                >
                  ⚡ ចាប់ផ្ដើមធ្វើតេស្តចម្រុះ
                </button>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Original By-Subject View */
        <div className="space-y-8">
          <div className="flex justify-center gap-4 mb-4">
            <button onClick={() => setActiveType('mcq')} className={`px-8 py-3 rounded-full font-black heading-kh text-sm transition-all ${activeType === 'mcq' ? 'bg-maroon text-white shadow-md' : 'bg-white/40 text-gray-500'}`}>QCM</button>
            <button onClick={() => setActiveType('short')} className={`px-8 py-3 rounded-full font-black heading-kh text-sm transition-all ${activeType === 'short' ? 'bg-maroon text-white shadow-md' : 'bg-white/40 text-gray-500'}`}>Q & A</button>
          </div>

          {searchQuery.trim() ? (
            <div className="grid grid-cols-1 gap-4">
              {searchResults.map((q, idx) => (
                <div key={idx} onClick={() => setViewingQuestion(q)} className="glass-card rounded-[2rem] p-6 border border-white/60 shadow-lg cursor-pointer hover:border-maroon/30 transition-all group active:scale-[0.98]">
                  <h4 className="text-lg font-bold text-maroon heading-kh leading-relaxed line-clamp-2">{q.question}</h4>
                  <p className="text-[10px] font-black text-gray-400 mt-4 uppercase">មុខវិជ្ជា៖ {q.subject}</p>
                </div>
              ))}
            </div>
          ) : (
            subjects.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {subjects.map((sub: string, i: number) => {
                  const count = activeQuestions.filter(q => q.subject === sub && q.type === activeType).length;
                  return (
                    <button key={i} onClick={() => setSelectedSubject(sub)} className="glass-card p-10 rounded-[3rem] text-center transition-all border-4 border-transparent hover:border-maroon/20 hover:shadow-2xl group flex flex-col items-center shadow-lg">
                      <div className="w-20 h-20 bg-maroon/5 rounded-[2rem] flex items-center justify-center text-4xl mb-6 group-hover:scale-110 transition-transform">
                        {activeType === 'mcq' ? '📑' : '🖊️'}
                      </div>
                      <h3 className="text-2xl font-black mb-3 heading-kh !text-maroon">{sub}</h3>
                      <div className={`flex items-center gap-2 font-black text-[10px] px-5 py-2 rounded-full text-white shadow-md ${activeType === 'mcq' ? 'bg-blue-600' : 'bg-orange-600'}`}>
                        <span>មាន {toKhmerNumeral(count)} សំណួរ</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            ) : (
              <div className="py-24 text-center glass-card rounded-[3rem] border border-dashed border-gray-200">
                <div className="text-8xl mb-8 opacity-40">📭</div>
                <h3 className="text-2xl font-black mb-3 heading-kh !text-maroon">មិនទាន់មានសំណួរ</h3>
              </div>
            )
          )}
        </div>
      )}

      {/* Footer Contact */}
      <div className="mt-12 flex flex-col items-center gap-5">
        <p className="text-[11px] font-black uppercase text-gray-400">មានបញ្ហា ឬចង់បើកគណនីបន្ថែម ៖</p>
        <div className="flex gap-8">
          <a href={ADMIN_CONTACTS.admin1} target="_blank" className="flex items-center gap-2 text-sm font-bold text-indigo-600 hover:underline small-kh animate-breathing">
            <span>អ្នកគ្រប់គ្រង</span>
          </a>
          <a href={ADMIN_CONTACTS.admin2} target="_blank" className="flex items-center gap-2 text-sm font-bold text-indigo-600 hover:underline small-kh animate-breathing" style={{ animationDelay: '1s' }}>
            <span>Master Quiz KH</span>
          </a>
        </div>
      </div>
    </div>
  );
};

export default PlaySection;
