
import * as React from 'react';
import { useState, useEffect, useCallback, useRef } from 'react';
import { Question, AppMode, SelectedQuizInfo, UserRole } from './types';
import { INITIAL_QUESTIONS, SECRET_CODE } from './constants';
import Header from './components/Header';
import AuthSection from './components/AuthSection';
import CreateSection from './components/CreateSection';
import PlaySection from './components/PlaySection';
import QuizGame from './components/QuizGame';
import { initFirebase, syncQuestionsToFirebase, listenToQuestions } from './services/firebaseService';

const App: React.FC = () => {
  const [quizData, setQuizData] = useState<Question[]>([]);
  const [mode, setMode] = useState<AppMode>('play');
  const [userRole, setUserRole] = useState<UserRole>(null);
  const [activeQuiz, setActiveQuiz] = useState<SelectedQuizInfo | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isCloudConnected, setIsCloudConnected] = useState<boolean | 'error'>(false);
  const isListeningRef = useRef(false);

  const sanitizeQuestions = useCallback((data: any[]): Question[] => {
    if (!Array.isArray(data)) return [];
    
    return data
      .filter(q => q && typeof q === 'object')
      .map(q => {
        const type = q.type === 'short' ? 'short' : 'mcq';
        
        const sanitized: Question = {
          subject: String(q.subject || ''),
          question: String(q.question || ''),
          type: type,
          isActive: q.isActive !== false
        };
        
        if (type === 'mcq') {
          sanitized.options = Array.isArray(q.options) 
            ? q.options.map((o: any) => String(o || ''))
            : ['', '', '', ''];
          sanitized.correct = typeof q.correct === 'number' ? q.correct : 0;
        } else {
          sanitized.answer = String(q.answer || '');
        }
        
        return sanitized;
      });
  }, []);

  const saveToLocal = useCallback((data: Question[]) => {
    try {
      const sanitized = sanitizeQuestions(data);
      const jsonString = JSON.stringify(sanitized);
      localStorage.setItem('quiz_data', jsonString);
    } catch (e) {
      console.error("JSON Stringify Error in saveToLocal:", e);
    }
  }, [sanitizeQuestions]);

  useEffect(() => {
    if (isListeningRef.current) return;
    isListeningRef.current = true;

    initFirebase();
    
    const saved = localStorage.getItem('quiz_data');
    if (saved) {
      try { 
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          setQuizData(sanitizeQuestions(parsed));
        }
      } catch (e) {
        console.error("Local storage load error:", e);
      }
    }

    const unsubscribe = listenToQuestions(
      (remoteData) => {
        const cleaned = sanitizeQuestions(remoteData);
        setQuizData(cleaned);
        saveToLocal(cleaned);
        setIsCloudConnected(true);
        setIsInitialized(true);
      },
      (error) => {
        setIsCloudConnected('error');
        if (!isInitialized) {
          if (quizData.length === 0 && !saved) {
            setQuizData(sanitizeQuestions(INITIAL_QUESTIONS));
          }
          setIsInitialized(true);
        }
      }
    );

    const timer = setTimeout(() => { 
      if (!isInitialized) {
        setIsInitialized(true); 
      }
    }, 5000);
    
    return () => { 
      unsubscribe(); 
      clearTimeout(timer);
      isListeningRef.current = false;
    };
  }, [sanitizeQuestions, saveToLocal, isInitialized, quizData.length]);

  const handleSyncData = (newData: Question[]) => {
    try {
      const sanitized = sanitizeQuestions(newData);
      setQuizData(sanitized);
      saveToLocal(sanitized);
      
      if (userRole === 'admin') {
        syncQuestionsToFirebase(sanitized)
          .then(() => setIsCloudConnected(true))
          .catch((err) => {
            console.error("Cloud sync operation failed:", err);
            setIsCloudConnected('error');
          });
      }
    } catch (e) {
      console.error("Critical error in handleSyncData:", e);
    }
  };

  const handleAddQuestion = (q: Question) => handleSyncData([...quizData, { ...q, isActive: q.isActive ?? true }]);
  const handleUpdateQuestion = (idx: number, updatedQ: Question) => handleSyncData(quizData.map((q, i) => i === idx ? { ...updatedQ } : q));
  const handleRemoveQuestion = (idx: number) => handleSyncData(quizData.filter((_, i) => i !== idx));
  
  const handleToggleSubject = (sub: string, type: 'mcq' | 'short', active: boolean) => {
    handleSyncData(quizData.map(q => (q.subject === sub && q.type === type) ? { ...q, isActive: active } : q));
  };

  const handleUpdateSubject = (oldName: string, type: 'mcq' | 'short', newName: string) => {
    if (!newName.trim() || oldName === newName) return;
    handleSyncData(quizData.map(q => (q.subject === oldName && q.type === type) ? { ...q, subject: newName.trim() } : q));
  };

  const handleRemoveSubject = (sub: string, type: 'mcq' | 'short') => { 
    const typeText = type === 'mcq' ? 'QCM' : 'Q & A';
    if (confirm(`លុបមុខវិជ្ជា "${sub}" ក្នុងផ្នែក ${typeText}?`)) {
      handleSyncData(quizData.filter(q => !(q.subject === sub && q.type === type))); 
    }
  };

  const handleReorderSubject = (subjectName: string, type: 'mcq' | 'short', direction: 'up' | 'down') => {
    const currentTypeQuestions = quizData.filter(q => q.type === type);
    const subjectsInOrder: string[] = [];
    currentTypeQuestions.forEach(q => {
      if (!subjectsInOrder.includes(q.subject)) subjectsInOrder.push(q.subject);
    });

    const index = subjectsInOrder.indexOf(subjectName);
    if (index === -1) return;

    const newSubjectsOrder = [...subjectsInOrder];
    if (direction === 'up' && index > 0) {
      [newSubjectsOrder[index], newSubjectsOrder[index - 1]] = [newSubjectsOrder[index - 1], newSubjectsOrder[index]];
    } else if (direction === 'down' && index < newSubjectsOrder.length - 1) {
      [newSubjectsOrder[index], newSubjectsOrder[index + 1]] = [newSubjectsOrder[index + 1], newSubjectsOrder[index]];
    } else return;

    const otherTypeQuestions = quizData.filter(q => q.type !== type);
    const reorderedQuestions: Question[] = [];
    newSubjectsOrder.forEach(sub => {
      reorderedQuestions.push(...currentTypeQuestions.filter(q => q.subject === sub));
    });

    handleSyncData([...reorderedQuestions, ...otherTypeQuestions]);
  };

  const handleBatchAdd = (qs: Question[]) => handleSyncData([...quizData, ...qs.map(q => ({ ...q, isActive: q.isActive ?? true }))]);

  if (!isInitialized) return null;

  if (!userRole) {
    return (
      <div className="min-h-screen py-12 px-4 flex items-center justify-center">
        <div className="max-w-2xl w-full">
          <div className="khmer-decorative-frame text-center animate-fadeIn !py-12">
            <div className="khmer-corner corner-tl"></div><div className="khmer-corner corner-tr"></div>
            <div className="khmer-corner corner-bl"></div><div className="khmer-corner corner-br"></div>
            <h1 className="text-3xl md:text-5xl font-black heading-kh text-maroon py-6 px-4">ប្រព័ន្ធគ្រប់គ្រងសំណួរចម្លើយ</h1>
          </div>
          <AuthSection onLogin={(role) => setUserRole(role)} secretCode={SECRET_CODE} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-6 px-4 md:py-12">
      <div className="max-w-4xl mx-auto">
        <Header 
          mode={mode} 
          role={userRole} 
          totalQuestions={quizData.length} 
          cloudStatus={isCloudConnected}
          setMode={(m: AppMode) => { setMode(m); setActiveQuiz(null); }} 
          onLogout={() => setUserRole(null)} 
        />
        <main className="mt-8">
          {mode === 'play' ? (
            activeQuiz ? (
              <QuizGame 
                key={`quiz-${activeQuiz.subject}-${activeQuiz.partIndex}-${activeQuiz.type}`}
                subject={activeQuiz.subject} 
                partIndex={activeQuiz.partIndex}
                type={activeQuiz.type}
                // បើសិនជាតេស្តចម្រុះ ប្រើសំណួរដែលបានផ្ញើមកស្រាប់ បើមិនមែនទេទើប Filter តាម Subject
                allSubjectQuestions={activeQuiz.customQuestions || quizData.filter(q => q.subject === activeQuiz.subject && q.type === activeQuiz.type)}
                onExit={() => setActiveQuiz(null)}
                onStartNextPart={activeQuiz.isMixed ? undefined : (newPartIndex) => {
                  setActiveQuiz(prev => prev ? { ...prev, partIndex: newPartIndex } : null);
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
              />
            ) : (
              <PlaySection 
                quizData={quizData} 
                onStartQuiz={(subject, partIndex, type, customQuestions, isMixed) => 
                  setActiveQuiz({ subject, partIndex, type, customQuestions, isMixed })
                } 
              />
            )
          ) : (
            <CreateSection 
              quizData={quizData} 
              onAdd={handleAddQuestion} 
              onUpdate={handleUpdateQuestion} 
              onRemove={handleRemoveQuestion} 
              onToggleSubject={handleToggleSubject} 
              onUpdateSubject={handleUpdateSubject}
              onRemoveSubject={handleRemoveSubject} 
              onReorderSubject={handleReorderSubject}
              onBatchAdd={handleBatchAdd} 
              onLogout={() => setUserRole(null)} 
            />
          )}
        </main>
      </div>
    </div>
  );
};

export default App;
