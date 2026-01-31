
import * as React from 'react';
import { useState, useMemo, useRef, useEffect } from 'react';
import { Question, QuizState } from '../types';

interface QuizGameProps {
  subject: string;
  partIndex: number;
  type: 'mcq' | 'short';
  allSubjectQuestions: Question[];
  onExit: () => void;
  onStartNextPart?: (newPartIndex: number) => void;
}

const QuizGame: React.FC<QuizGameProps> = ({ subject, partIndex, type, allSubjectQuestions, onExit, onStartNextPart }) => {
  const KHMER_PREFIXES = ['ក', 'ខ', 'គ', 'ឃ'];
  const KHMER_DIGITS = ['០', '១', '២', '៣', '៤', '៥', '៦', '៧', '៨', '៩'];
  
  const toKhmerNumeral = (n: number) => {
    return n.toString().split('').map(digit => KHMER_DIGITS[parseInt(digit)] || digit).join('');
  };

  const SOUND_URLS = {
    correct: 'https://assets.mixkit.co/active_storage/sfx/600/600-preview.mp3',
    wrong: 'https://assets.mixkit.co/active_storage/sfx/951/951-preview.mp3'
  };

  const [isMuted, setIsMuted] = useState(false);
  const [shakeIndex, setShakeIndex] = useState<number | null>(null);
  const correctAudioRef = useRef<HTMLAudioElement | null>(null);
  const wrongAudioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    correctAudioRef.current = new Audio(SOUND_URLS.correct);
    wrongAudioRef.current = new Audio(SOUND_URLS.wrong);
    return () => {
      correctAudioRef.current?.pause();
      wrongAudioRef.current?.pause();
    };
  }, []);

  const partQuestions = useMemo(() => {
    const start = partIndex * 10;
    const subset = allSubjectQuestions.slice(start, start + 10);
    
    if (type === 'mcq') {
      return subset.map((q: Question) => {
        if (q.options) {
          const opts = q.options.map((opt, idx) => ({ text: opt, isCorrect: idx === q.correct }));
          const shuffled = [...opts].sort(() => Math.random() - 0.5);
          return { ...q, options: shuffled.map(o => o.text), correct: shuffled.findIndex(o => o.isCorrect) };
        }
        return q;
      }).sort(() => Math.random() - 0.5);
    }
    return subset;
  }, [allSubjectQuestions, partIndex, type]);

  const [state, setState] = useState<QuizState>({
    currentQuestionIndex: 0,
    score: 0,
    isFinished: false,
    selectedAnswer: null,
    userInput: '',
    showCorrect: false,
    userAnswers: [],
    isReviewing: false
  });

  const totalParts = Math.ceil(allSubjectQuestions.length / 10);

  const playSound = (t: 'correct' | 'wrong') => {
    if (isMuted) return;
    const audio = t === 'correct' ? correctAudioRef.current : wrongAudioRef.current;
    if (audio) { 
      audio.currentTime = 0; 
      audio.play().catch(() => {}); 
    }
  };

  const handleMCQSelect = (idx: number) => {
    if (state.selectedAnswer !== null || state.isFinished) return;
    const isCorrect = idx === partQuestions[state.currentQuestionIndex].correct;
    
    if (isCorrect) playSound('correct');
    else { playSound('wrong'); setShakeIndex(idx); setTimeout(() => setShakeIndex(null), 500); }

    setState(prev => ({
      ...prev,
      selectedAnswer: idx,
      showCorrect: true,
      score: isCorrect ? prev.score + 1 : prev.score,
      userAnswers: [...prev.userAnswers, idx]
    }));
  };

  const handleNext = () => {
    if (state.currentQuestionIndex + 1 < partQuestions.length) {
      setState(prev => ({ 
        ...prev, 
        currentQuestionIndex: prev.currentQuestionIndex + 1, 
        selectedAnswer: null, 
        userInput: '', 
        showCorrect: false 
      }));
    } else setState(prev => ({ ...prev, isFinished: true }));
  };

  // --- SHORT ANSWER LIST VIEW ---
  if (type === 'short') {
    return (
      <div className="animate-fadeIn space-y-6 pb-20">
        {/* Header - Now scrolls with content (Removed sticky and top-4) */}
        <div className="glass-card rounded-[2.5rem] p-6 md:p-8 flex items-center justify-between border border-white/50 shadow-xl">
          <div className="flex items-center gap-4">
            <button onClick={onExit} className="w-12 h-12 flex items-center justify-center bg-maroon/5 text-maroon rounded-2xl hover:bg-maroon hover:text-white transition-all shadow-sm">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M15 19l-7-7 7-7" /></svg>
            </button>
            <div>
              <h2 className="text-xl md:text-2xl font-black heading-kh text-maroon leading-tight">{subject}</h2>
              <p className="text-[10px] font-black uppercase tracking-widest text-gray-400">ភាគទី {toKhmerNumeral(partIndex + 1)} - កម្រងសំណួរចម្លើយ</p>
            </div>
          </div>
          <div className="hidden sm:block bg-maroon text-white px-5 py-2.5 rounded-full font-black text-xs uppercase shadow-lg shadow-maroon/20">
            សរុប៖ {toKhmerNumeral(partQuestions.length)} សំណួរ
          </div>
        </div>

        <div className="space-y-8">
          {partQuestions.length > 0 ? (
            partQuestions.map((q, idx) => (
              <div key={idx} className="glass-card rounded-[2.5rem] p-8 md:p-12 border border-white/60 shadow-xl transition-all hover:shadow-2xl animate-fadeIn">
                <div className="flex gap-2 items-start mb-6">
                  <span className="text-xl md:text-2xl font-black heading-kh text-maroon shrink-0">
                    {toKhmerNumeral(partIndex * 10 + idx + 1)}.
                  </span>
                  <h3 className="text-xl md:text-2xl font-black heading-kh text-maroon leading-relaxed">
                    {q.question}
                  </h3>
                </div>
                <div className="bg-green-50/40 border-l-8 border-green-500 rounded-r-[2rem] p-6 md:p-8 relative overflow-hidden">
                  <div className="flex flex-col md:flex-row gap-2">
                    <span className="shrink-0 font-black text-green-700 heading-kh text-lg md:text-xl">ចម្លើយ ៖</span>
                    <div className="flex-1 text-gray-800 line-height-relaxed small-kh font-medium text-lg md:text-xl whitespace-pre-wrap">
                      {q.answer}
                    </div>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="glass-card rounded-[2.5rem] py-20 text-center border-dashed border-2 border-gray-200">
              <div className="text-6xl mb-4 opacity-20">📭</div>
              <p className="text-gray-400 small-kh italic">មិនទាន់មានសំណួរក្នុងភាគនេះឡើយ</p>
            </div>
          )}

          {/* Part Selection Menu for Short Answer */}
          <div className="glass-card rounded-[2.5rem] p-8 mt-12 border border-white/60 shadow-xl">
            <h3 className="text-center text-maroon font-black heading-kh mb-6">ជ្រើសរើសភាគផ្សេងទៀត</h3>
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-3">
              {Array.from({ length: totalParts }).map((_, i) => (
                <button 
                  key={i} 
                  disabled={i === partIndex}
                  onClick={() => {
                    onStartNextPart && onStartNextPart(i);
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                  }}
                  className={`py-3 rounded-xl font-black text-xs transition-all ${i === partIndex ? 'bg-maroon text-white shadow-inner opacity-50' : 'bg-maroon/5 text-maroon hover:bg-maroon hover:text-white shadow-sm'}`}
                >
                  ភាគ {toKhmerNumeral(i + 1)}
                </button>
              ))}
            </div>
          </div>

          <div className="flex justify-center gap-4 pt-10">
            <button onClick={onExit} className="bg-white border-2 border-maroon text-maroon font-black px-12 py-5 rounded-[2.5rem] shadow-xl hover:bg-maroon hover:text-white transition-all heading-kh text-xl">
              🏠 ត្រឡប់ទៅមឺនុយ
            </button>
          </div>
        </div>
      </div>
    );
  }

  // --- MCQ REVIEW VIEW ---
  if (state.isReviewing) {
    return (
      <div className="glass-card rounded-[2.5rem] p-6 md:p-10 animate-fadeIn border-2 border-maroon/20 flex flex-col h-[85vh]">
        <div className="flex justify-between items-center mb-6 border-b border-gray-100 pb-4">
          <h2 className="text-2xl font-black heading-kh text-maroon">ពិនិត្យឡើងវិញ 👁️</h2>
          <button onClick={() => setState(prev => ({ ...prev, isReviewing: false }))} className="bg-maroon text-white px-6 py-2 rounded-full font-bold">ត្រឡប់ក្រោយ</button>
        </div>
        <div className="flex-1 overflow-y-auto pr-4 custom-scrollbar space-y-8">
          {partQuestions.map((q, qIdx) => (
            <div key={qIdx} className="bg-white/50 p-6 rounded-3xl border border-gray-100">
              <h4 className="font-bold mb-4 heading-kh text-maroon flex gap-3">
                <span className="shrink-0 bg-maroon/10 w-8 h-8 flex items-center justify-center rounded-lg">{toKhmerNumeral(qIdx + 1)}</span>
                {q.question}
              </h4>
              <div className="grid gap-2">
                {q.options?.map((opt, oIdx) => {
                  const isCorrect = oIdx === q.correct;
                  const isUserChoice = oIdx === state.userAnswers[qIdx];
                  return (
                    <div key={oIdx} className={`p-3 rounded-xl border flex items-center gap-3 text-sm ${isCorrect ? 'bg-green-50 border-green-500 font-bold' : isUserChoice ? 'bg-red-50 border-red-500' : 'bg-white border-gray-100 opacity-60'}`}>
                      <span className="w-5">{KHMER_PREFIXES[oIdx]}.</span>
                      <span className="flex-1">{opt}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // --- MCQ RESULT VIEW ---
  if (state.isFinished) {
    const percentage = Math.round((state.score / partQuestions.length) * 100);
    return (
      <div className="animate-fadeIn space-y-6">
        <div className="glass-card rounded-[3rem] p-12 text-center border-2 border-white shadow-2xl">
          <div className="text-8xl mb-6">🏆</div>
          <h2 className="text-3xl font-black mb-4 heading-kh text-maroon">លទ្ធផលនៃការធ្វើតេស្ត</h2>
          <div className="text-8xl font-black text-indigo-600 my-8 tabular-nums">{toKhmerNumeral(percentage)}%</div>
          <p className="text-xl mb-12 small-kh text-gray-600">អ្នកឆ្លើយត្រូវ {toKhmerNumeral(state.score)} / {toKhmerNumeral(partQuestions.length)}</p>
          
          <div className="flex flex-col md:flex-row gap-4 max-w-xl mx-auto">
            <button onClick={() => setState(prev => ({ ...prev, isReviewing: true }))} className="flex-1 bg-white border-2 border-gray-200 text-gray-600 font-black py-4 rounded-2xl shadow-sm hover:border-maroon hover:text-maroon transition-all">ពិនិត្យចម្លើយ 👁️</button>
            <button onClick={onExit} className="flex-1 bg-white border-2 border-maroon text-maroon font-black py-4 rounded-2xl shadow-sm hover:bg-maroon hover:text-white transition-all">ត្រឡប់ទៅវិញ 🏠</button>
          </div>
        </div>

        {/* Part Selection Menu for MCQ */}
        <div className="glass-card rounded-[3rem] p-10 border-2 border-white shadow-xl">
          <div className="flex items-center gap-3 mb-8 justify-center">
            <div className="h-px bg-maroon/20 flex-1"></div>
            <h3 className="text-xl font-black heading-kh text-maroon shrink-0 px-4">ជ្រើសរើសភាគផ្សេងទៀត</h3>
            <div className="h-px bg-maroon/20 flex-1"></div>
          </div>
          
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 gap-4">
            {Array.from({ length: totalParts }).map((_, i) => (
              <button 
                key={i} 
                disabled={i === partIndex}
                onClick={() => onStartNextPart && onStartNextPart(i)}
                className={`group relative p-4 rounded-2xl border-2 transition-all overflow-hidden ${
                  i === partIndex 
                  ? 'bg-maroon/5 border-maroon/10 grayscale cursor-not-allowed opacity-50' 
                  : 'bg-white border-gray-100 hover:border-maroon hover:shadow-lg active:scale-95'
                }`}
              >
                <div className={`text-xs font-black uppercase mb-1 ${i === partIndex ? 'text-gray-400' : 'text-maroon/60'}`}>ភាគ</div>
                <div className={`text-3xl font-black tabular-nums ${i === partIndex ? 'text-gray-300' : 'text-maroon'}`}>{toKhmerNumeral(i + 1)}</div>
                {i === partIndex && (
                  <div className="absolute top-1 right-2 text-[8px] font-black bg-maroon/10 text-maroon px-1.5 py-0.5 rounded">បច្ចុប្បន្ន</div>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // --- MCQ QUESTION VIEW ---
  const currentQ = partQuestions[state.currentQuestionIndex];
  return (
    <div className="glass-card rounded-[3rem] p-8 md:p-12 animate-fadeIn border-2 border-white flex flex-col min-h-[550px]">
      <div className="flex justify-between items-start mb-10">
        <div className="flex flex-col">
          <span className="text-maroon font-black text-[10px] uppercase tracking-widest opacity-60">{subject} - QCM</span>
          <div className="flex items-end gap-2">
            <span className="text-4xl font-black text-maroon">{toKhmerNumeral(state.currentQuestionIndex + 1)}</span>
            <span className="text-sm font-bold text-gray-400 mb-1">/ {toKhmerNumeral(partQuestions.length)}</span>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <button onClick={() => setIsMuted(!isMuted)} className={`w-12 h-12 flex items-center justify-center rounded-2xl transition-all shadow-md ${isMuted ? 'bg-gray-100 text-gray-400' : 'bg-maroon/5 text-maroon'}`}>
            {isMuted ? '🔇' : '🔊'}
          </button>
          <div className="bg-indigo-600 text-white px-6 py-3 rounded-2xl shadow-lg font-black text-xl tabular-nums">ពិន្ទុ៖ {toKhmerNumeral(state.score)}</div>
          <button onClick={() => { if(confirm("ចាកចេញ?")) onExit(); }} className="w-12 h-12 flex items-center justify-center bg-red-50 text-red-500 rounded-2xl">✕</button>
        </div>
      </div>

      <div className="flex-1 flex flex-col">
        {currentQ ? (
          <>
            <h2 className="text-2xl font-bold mb-10 heading-kh text-maroon leading-relaxed">{currentQ.question}</h2>
            <div className="grid grid-cols-1 gap-4">
              {currentQ.options?.map((opt, i) => {
                let style = "bg-white border-gray-100 hover:border-indigo-300 text-gray-700";
                if (state.showCorrect) {
                  if (i === currentQ.correct) style = "bg-green-50 border-green-500 text-green-800 ring-4 ring-green-100";
                  else if (i === state.selectedAnswer) style = "bg-red-50 border-red-500 text-red-800";
                  else style = "opacity-40 grayscale-[0.5]";
                }
                return (
                  <button key={i} onClick={() => handleMCQSelect(i)} disabled={state.showCorrect} className={`text-left p-6 rounded-2xl border-2 transition-all font-bold text-lg flex items-center gap-5 small-kh ${style} ${shakeIndex === i ? 'animate-bounce' : ''}`}>
                    <span className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center text-maroon font-black shrink-0">{KHMER_PREFIXES[i]}</span>
                    <span className="flex-1">{opt}</span>
                  </button>
                );
              })}
            </div>
          </>
        ) : (
          <div className="text-center py-20 text-gray-400 italic">កំពុងរៀបចំសំណួរ...</div>
        )}
      </div>

      {state.showCorrect && (
        <button onClick={handleNext} className="mt-12 w-full bg-indigo-600 text-white font-black py-6 rounded-[2rem] shadow-2xl text-xl animate-fadeIn hover:brightness-110 transition-all">
          {state.currentQuestionIndex + 1 === partQuestions.length ? "បង្ហាញលទ្ធផល ✨" : "សំណួរបន្ទាប់ →"}
        </button>
      )}
    </div>
  );
};

export default QuizGame;
