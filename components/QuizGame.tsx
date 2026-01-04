
import * as React from 'react';
import { useState, useMemo } from 'react';
import { Question, QuizState } from '../types';

interface QuizGameProps {
  subject: string;
  partIndex: number;
  allSubjectQuestions: Question[];
  onExit: () => void;
}

const QuizGame: React.FC<QuizGameProps> = ({ subject, partIndex, allSubjectQuestions, onExit }) => {
  const KHMER_PREFIXES = ['ក', 'ខ', 'គ', 'ឃ'];
  
  const SOUND_URLS = {
    correct: 'https://assets.mixkit.co/active_storage/sfx/600/600-preview.mp3',
    wrong: 'https://assets.mixkit.co/active_storage/sfx/951/951-preview.mp3'
  };

  const [isMuted, setIsMuted] = useState(false);
  const [shakeIndex, setShakeIndex] = useState<number | null>(null);

  const partQuestions = useMemo(() => {
    const start = partIndex * 10;
    const end = start + 10;
    const subset = allSubjectQuestions.slice(start, end);

    if (subset.length === 0) return [];

    return subset.map((q: Question) => {
      const optionsWithStatus = q.options.map((opt: string, idx: number) => ({
        text: opt,
        isCorrect: idx === q.correct
      }));

      const shuffledOptions = [...optionsWithStatus].sort(() => Math.random() - 0.5);
      const newCorrectIndex = shuffledOptions.findIndex(o => o.isCorrect);

      return {
        ...q,
        options: shuffledOptions.map(o => o.text),
        correct: newCorrectIndex
      };
    }).sort(() => Math.random() - 0.5);
  }, [allSubjectQuestions, partIndex]);

  const [state, setState] = useState<QuizState>({
    currentQuestionIndex: 0,
    score: 0,
    isFinished: false,
    selectedAnswer: null,
    showCorrect: false
  });

  const playSound = (type: 'correct' | 'wrong') => {
    if (isMuted) return;
    try {
      const audio = new Audio(SOUND_URLS[type]);
      audio.volume = 0.4;
      audio.play().catch(() => {});
    } catch (e) {}
  };

  if (partQuestions.length === 0) {
    return (
      <div className="glass-card rounded-[3rem] p-12 text-center animate-fadeIn border border-white/50">
        <div className="text-6xl mb-6">⚠️</div>
        <h2 className="text-2xl font-bold mb-6 heading-kh text-maroon">មិនមានសំណួរក្នុងភាគនេះទេ</h2>
        <button onClick={onExit} className="bg-indigo-600 text-white px-8 py-3 rounded-2xl font-bold small-kh">ត្រឡប់ក្រោយ</button>
      </div>
    );
  }

  const currentQuestion = partQuestions[state.currentQuestionIndex];
  
  if (!currentQuestion) {
    if (!state.isFinished) setState(prev => ({ ...prev, isFinished: true }));
    return null;
  }

  const progress = ((state.currentQuestionIndex + 1) / partQuestions.length) * 100;

  const handleSelect = (idx: number) => {
    if (state.selectedAnswer !== null || state.isFinished) return;
    
    const isCorrect = idx === currentQuestion.correct;
    
    if (isCorrect) {
      playSound('correct');
    } else {
      playSound('wrong');
      setShakeIndex(idx);
      setTimeout(() => setShakeIndex(null), 500);
    }

    setState(prev => ({
      ...prev,
      selectedAnswer: idx,
      showCorrect: true,
      score: isCorrect ? prev.score + 1 : prev.score
    }));
  };

  const handleNext = () => {
    if (state.currentQuestionIndex + 1 < partQuestions.length) {
      setState(prev => ({
        ...prev,
        currentQuestionIndex: prev.currentQuestionIndex + 1,
        selectedAnswer: null,
        showCorrect: false
      }));
    } else {
      setState(prev => ({ ...prev, isFinished: true }));
    }
  };

  if (state.isFinished) {
    const percentage = Math.round((state.score / partQuestions.length) * 100);
    return (
      <div className="glass-card rounded-[3rem] shadow-2xl p-12 text-center animate-fadeIn border border-white/50">
        <div className="text-7xl mb-8 animate-bounce">✨</div>
        <h2 className="text-3xl font-black mb-4 heading-kh !text-maroon">ការតេស្តត្រូវបានបញ្ចប់!</h2>
        <div className="text-8xl font-black text-indigo-600 my-10 tracking-tighter">{percentage}%</div>
        <p className="text-xl mb-12 font-medium small-kh">អ្នកឆ្លើយត្រូវ {state.score} ក្នុងចំណោម {partQuestions.length} សំណួរ</p>
        <button 
          onClick={onExit}
          className="w-full bg-gray-900 hover:bg-black text-white font-bold py-5 rounded-3xl transition-all shadow-xl active:scale-[0.98] small-kh"
        >
          ត្រឡប់ទៅជ្រើសរើសភាគ
        </button>
      </div>
    );
  }

  return (
    <div className="glass-card rounded-[3rem] shadow-2xl p-8 md:p-12 min-h-[550px] flex flex-col animate-fadeIn border border-white/50 relative">
      <style>{`
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          20%, 60% { transform: translateX(-10px); }
          40%, 80% { transform: translateX(10px); }
        }
        .shake-animation {
          animation: shake 0.4s ease-in-out;
        }
      `}</style>

      <button 
        onClick={() => setIsMuted(!isMuted)}
        className="absolute top-8 right-8 p-3 rounded-full bg-indigo-50 text-indigo-600 hover:bg-indigo-100 transition-all z-10"
      >
        {isMuted ? (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14.001c0 .891-1.077 1.337-1.707.707L5.586 15z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" /></svg>
        ) : (
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14.001c0 .891-1.077 1.337-1.707.707L5.586 15z" /></svg>
        )}
      </button>

      <div className="flex justify-between items-center mb-10 pr-12">
        <div className="flex flex-col">
          <span className="text-indigo-600 font-black text-sm uppercase tracking-widest mb-1 small-kh">{subject} - ភាគ {partIndex + 1}</span>
          <span className="text-xs font-bold small-kh text-gray-500 tracking-wide">សំណួរទី {state.currentQuestionIndex + 1} នៃ {partQuestions.length}</span>
          <div className="w-40 h-2 bg-gray-100 rounded-full mt-3 overflow-hidden">
            <div className="h-full bg-indigo-600 transition-all duration-500" style={{ width: `${progress}%` }}></div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold uppercase small-kh text-gray-400">ពិន្ទុ</span>
          <div className="bg-indigo-600 text-white font-black px-5 py-2 rounded-2xl shadow-lg shadow-indigo-200">{state.score}</div>
        </div>
      </div>

      <div className="flex-1">
        <h2 className="text-2xl md:text-3xl font-bold mb-10 leading-snug heading-kh !text-maroon pr-4">{currentQuestion.question}</h2>
        <div className="grid grid-cols-1 gap-4">
          {currentQuestion.options.map((opt: string, i: number) => {
            let statusClass = "border-gray-100 bg-white hover:border-indigo-200 hover:bg-indigo-50/30 text-gray-700";
            let icon = <div className="w-6 h-6 rounded-full border-2 border-gray-200 flex items-center justify-center text-[10px] font-bold text-gray-400 uppercase">{KHMER_PREFIXES[i]}</div>;

            if (state.showCorrect) {
              if (i === currentQuestion.correct) {
                statusClass = "border-green-500 bg-green-50 text-green-800 scale-[1.02] shadow-md";
                icon = <div className="w-7 h-7 rounded-full bg-green-500 flex items-center justify-center text-white text-[12px]">✓</div>;
              } else if (i === state.selectedAnswer) {
                statusClass = "border-red-500 bg-red-50 text-red-800";
                icon = <div className="w-7 h-7 rounded-full bg-red-500 flex items-center justify-center text-white text-[12px]">✕</div>;
              } else {
                statusClass = "border-gray-100 bg-gray-50/50 opacity-50";
              }
            }

            return (
              <button 
                key={i}
                onClick={() => handleSelect(i)}
                disabled={state.showCorrect}
                className={`text-left px-7 py-5 rounded-[1.5rem] border-2 transition-all font-semibold text-lg flex items-center justify-between group active:scale-[0.99] small-kh ${statusClass} ${shakeIndex === i ? 'shake-animation' : ''}`}
              >
                <div className="flex items-start gap-3">
                  <span className="font-bold text-indigo-900 opacity-60">{KHMER_PREFIXES[i]}.</span>
                  <span>{opt}</span>
                </div>
                {icon}
              </button>
            );
          })}
        </div>
      </div>

      {state.showCorrect && (
        <button 
          onClick={handleNext}
          className="mt-12 w-full bg-indigo-600 hover:bg-indigo-700 text-white font-black py-5 rounded-[2rem] transition-all shadow-xl shadow-indigo-100 active:scale-[0.98] animate-fadeIn small-kh"
        >
          {state.currentQuestionIndex + 1 === partQuestions.length ? "បង្ហាញលទ្ធផល ✨" : "សំណួរបន្ទាប់ →"}
        </button>
      )}
    </div>
  );
};

export default QuizGame;
