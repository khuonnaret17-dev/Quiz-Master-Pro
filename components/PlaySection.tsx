
import * as React from 'react';
import { useState } from 'react';
import { Question } from '../types';

interface PlaySectionProps {
  quizData: Question[];
  onStartQuiz: (subject: string, partIndex: number) => void;
}

const PlaySection: React.FC<PlaySectionProps> = ({ quizData, onStartQuiz }) => {
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null);
  
  const activeQuestions = quizData.filter((q: Question) => q.isActive !== false);
  const subjects: string[] = Array.from(new Set(activeQuestions.map((item: Question) => item.subject)));

  const handleSubjectClick = (sub: string) => {
    setSelectedSubject(sub);
  };

  if (selectedSubject) {
    const subjectQuestions = activeQuestions.filter((q: Question) => q.subject === selectedSubject);
    const totalQuestions = subjectQuestions.length;
    const itemsPerPart = 10;
    const totalParts = Math.ceil(totalQuestions / itemsPerPart);

    return (
      <div className="animate-fadeIn space-y-6">
        <div className="flex items-center gap-4 mb-6">
          <button 
            onClick={() => setSelectedSubject(null)}
            className="p-3 bg-white/80 hover:bg-white rounded-full shadow-md transition-all active:scale-90"
          >
            <svg className="w-6 h-6 text-indigo-900" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 19l-7-7 7-7" /></svg>
          </button>
          <h2 className="text-3xl font-black heading-kh text-maroon header-glow-maroon">ជ្រើសរើសភាគ ({selectedSubject})</h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {Array.from({ length: totalParts }).map((_, i) => {
            const start = i * itemsPerPart + 1;
            const end = Math.min((i + 1) * itemsPerPart, totalQuestions);
            return (
              <button
                key={i}
                onClick={() => onStartQuiz(selectedSubject, i)}
                className="glass-card p-6 rounded-2xl border-2 border-transparent hover:border-indigo-400 text-left transition-all active:scale-95 group"
              >
                <div className="flex justify-between items-center">
                  <div>
                    <span className="text-xs font-bold text-indigo-600 uppercase tracking-widest block mb-1">ភាគទី {i + 1}</span>
                    <h4 className="text-lg font-bold heading-kh !text-maroon">សំណួរទី {start} ដល់ {end}</h4>
                  </div>
                  <div className="w-10 h-10 rounded-full bg-indigo-50 flex items-center justify-center text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-colors">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" /></svg>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fadeIn">
      {subjects.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {subjects.map((sub: string, i: number) => {
            const count = activeQuestions.filter((q: Question) => q.subject === sub).length;
            return (
              <button
                key={i}
                onClick={() => handleSubjectClick(sub)}
                className="glass-card p-10 rounded-[2.5rem] text-center transition-all border-4 border-transparent hover:border-indigo-400 hover:shadow-2xl group active:scale-[0.98] flex flex-col items-center"
              >
                <div className="text-5xl mb-6 transform group-hover:scale-110 transition-transform">📝</div>
                <h3 className="text-2xl font-black mb-2 heading-kh !text-maroon">{sub}</h3>
                <p className="font-bold text-sm bg-indigo-50 px-4 py-1.5 rounded-full small-kh text-indigo-700">មានចំនួន {count} សំណួរ</p>
              </button>
            );
          })}
        </div>
      ) : (
        <div className="py-24 text-center glass-card rounded-[3rem] shadow-xl border border-white/50">
          <div className="text-7xl mb-6">🔍</div>
          <h3 className="text-2xl font-bold mb-2 heading-kh !text-maroon">មិនទាន់មានមុខវិជ្ជាទេ</h3>
          <p className="text-gray-500 leading-relaxed italic small-kh">បច្ចុប្បន្នមិនទាន់មានមុខវិជ្ជាដែលត្រូវបាន "បើក" សម្រាប់តេស្តនៅឡើយទេ។</p>
        </div>
      )}
    </div>
  );
};

export default PlaySection;
