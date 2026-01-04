
import * as React from 'react';
import { useState, useEffect } from 'react';
import { Question, AppMode, SelectedQuizInfo } from './types';
import { INITIAL_QUESTIONS, SECRET_CODE } from './constants';
import Header from './components/Header';
import AuthSection from './components/AuthSection';
import CreateSection from './components/CreateSection';
import PlaySection from './components/PlaySection';
import QuizGame from './components/QuizGame';

const App: React.FC = () => {
  const [quizData, setQuizData] = useState<Question[]>([]);
  const [mode, setMode] = useState<AppMode>('play');
  const [isAdmin, setIsAdmin] = useState(false);
  const [activeQuiz, setActiveQuiz] = useState<SelectedQuizInfo | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const encodedData = urlParams.get('data');

    if (encodedData) {
      try {
        const binaryString = atob(encodedData);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        const decodedStr = new TextDecoder().decode(bytes);
        const decodedData = JSON.parse(decodedStr);

        if (Array.isArray(decodedData)) {
          setQuizData(decodedData);
          localStorage.setItem('quiz_data', JSON.stringify(decodedData));
        }
      } catch (e) {
        console.error("Error decoding data:", e);
        loadLocalData();
      }
    } else {
      loadLocalData();
    }
    setIsInitialized(true);
  }, []);

  const loadLocalData = () => {
    const saved = localStorage.getItem('quiz_data');
    if (saved) {
      try {
        setQuizData(JSON.parse(saved));
      } catch (e) {
        setQuizData(INITIAL_QUESTIONS);
      }
    } else {
      setQuizData(INITIAL_QUESTIONS);
    }
  };

  useEffect(() => {
    if (isInitialized) {
      localStorage.setItem('quiz_data', JSON.stringify(quizData));
    }
  }, [quizData, isInitialized]);

  const handleAddQuestion = (q: Question) => {
    setQuizData(prev => [...prev, { ...q, isActive: q.isActive ?? true }]);
  };

  const handleUpdateQuestion = (index: number, updatedQ: Question) => {
    setQuizData(prev => prev.map((q, i) => i === index ? { ...updatedQ, isActive: q.isActive } : q));
  };

  const handleRemoveQuestion = (index: number) => {
    setQuizData(prev => prev.filter((_, i) => i !== index));
  };

  const handleToggleSubject = (subjectName: string, active: boolean) => {
    setQuizData(prev => prev.map(q => q.subject === subjectName ? { ...q, isActive: active } : q));
  };

  const handleBatchAdd = (qs: Question[]) => {
    setQuizData(prev => [...prev, ...qs.map(q => ({ ...q, isActive: q.isActive ?? true }))]);
  };

  if (!isInitialized) return null;

  return (
    <div className="min-h-screen py-6 px-4 md:py-12">
      <div className="max-w-3xl mx-auto">
        <Header 
          mode={mode} 
          setMode={(m: AppMode) => {
            setMode(m);
            setActiveQuiz(null);
            if (m === 'play') window.history.replaceState({}, '', window.location.pathname);
          }} 
        />

        <main className="mt-8">
          {mode === 'play' ? (
            activeQuiz ? (
              <QuizGame 
                subject={activeQuiz.subject} 
                partIndex={activeQuiz.partIndex}
                allSubjectQuestions={quizData.filter(q => q.subject === activeQuiz.subject)}
                onExit={() => setActiveQuiz(null)}
              />
            ) : (
              <PlaySection 
                quizData={quizData} 
                onStartQuiz={(subject: string, partIndex: number) => setActiveQuiz({ subject, partIndex })} 
              />
            )
          ) : (
            isAdmin ? (
              <CreateSection 
                quizData={quizData} 
                onAdd={handleAddQuestion} 
                onUpdate={handleUpdateQuestion}
                onRemove={handleRemoveQuestion}
                onToggleSubject={handleToggleSubject}
                onLogout={() => setIsAdmin(false)}
                onBatchAdd={handleBatchAdd} 
              />
            ) : (
              <AuthSection onVerify={(pass: string) => {
                if (pass === SECRET_CODE) setIsAdmin(true);
                else alert("លេខកូដមិនត្រឹមត្រូវ!");
              }} />
            )
          )}
        </main>
      </div>
    </div>
  );
};

export default App;
