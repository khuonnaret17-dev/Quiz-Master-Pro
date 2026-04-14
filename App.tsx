
import * as React from 'react';
import { useState, useEffect, useCallback, useRef } from 'react';
import { Question, AppMode, SelectedQuizInfo, UserRole, Feedback, AppNotification, LoginRecord, PresenceRecord } from './types';
import { SECRET_CODE, INITIAL_QUESTIONS } from './constants';
import Header from './components/Header';
import AuthSection from './components/AuthSection';
import CreateSection from './components/CreateSection';
import PlaySection from './components/PlaySection';
import QuizGame from './components/QuizGame';
import NotificationToast from './components/NotificationToast';
import { initFirebase, syncQuestionsToFirebase, listenToQuestions, listenToFeedback, removeFeedback, listenToNotifications, removeNotification, sendManualNotification, logLogin, listenToLogins, removeLoginRecord, updatePresence, listenToPresence } from './services/firebaseService';

const App: React.FC = () => {
  const [quizData, setQuizData] = useState<Question[]>(INITIAL_QUESTIONS);
  const [feedbackList, setFeedbackList] = useState<Feedback[]>([]);
  const [notificationList, setNotificationList] = useState<AppNotification[]>([]);
  const [loginList, setLoginList] = useState<LoginRecord[]>([]);
  const [presenceList, setPresenceList] = useState<PresenceRecord[]>([]);
  const [mode, setMode] = useState<AppMode>('play');
  const [userRole, setUserRole] = useState<UserRole>(() => {
    return (localStorage.getItem('auth_role') as UserRole) || null;
  });
  const [username, setUsername] = useState<string>(() => {
    return localStorage.getItem('auth_username') || '';
  });
  const [activeQuiz, setActiveQuiz] = useState<SelectedQuizInfo | null>(null);
  const [activeNotification, setActiveNotification] = useState<AppNotification | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isCloudConnected, setIsCloudConnected] = useState<boolean | 'error'>(false);
  const isListeningRef = useRef(false);
  const lastNotificationIdRef = useRef<string | null>(null);
  const appLoadTimeRef = useRef<number>(Date.now());

  const APP_LOGO_URL = "https://i.postimg.cc/0ygmLdvR/3QCM_Ep4.png";

  /**
   * Strictly reconstructs objects to ensure they are plain POJOs
   * by aggressively casting all properties to primitives.
   * This prevents circular structure errors from hidden Firestore class properties.
   */
  const sanitizeQuestions = useCallback((data: any[]): Question[] => {
    if (!Array.isArray(data)) return [];
    
    return data.filter(q => q && typeof q === 'object').map(q => {
      // Determine type safely
      let type: 'mcq' | 'short' | 'explanation' = 'mcq';
      if (q.type === 'short') type = 'short';
      if (q.type === 'explanation') type = 'explanation';

      const cleanObj: Question = {
        subject: String(q.subject || 'មិនមានមុខវិជ្ជា'),
        question: String(q.question || ''),
        type: type,
        isActive: q.isActive !== false
      };

      if (type === 'mcq') {
        cleanObj.options = Array.isArray(q.options) 
          ? q.options.map((o: any) => String(o || '')) 
          : ['', '', '', ''];
        cleanObj.correct = typeof q.correct === 'number' ? q.correct : 0;
      } else {
        cleanObj.answer = String(q.answer || '');
      }

      return cleanObj;
    });
  }, []);

  const saveToLocal = useCallback((data: Question[]) => {
    try {
      // Create a completely fresh array of fresh objects to be absolutely safe
      const cleanData = data.map(q => {
        const base = {
          subject: String(q.subject),
          question: String(q.question),
          type: q.type,
          isActive: Boolean(q.isActive)
        };
        if (q.type === 'mcq') {
          return {
            ...base,
            options: Array.isArray(q.options) ? q.options.map(o => String(o)) : [],
            correct: Number(q.correct)
          };
        }
        return {
          ...base,
          answer: String(q.answer)
        };
      });
      localStorage.setItem('quiz_data', JSON.stringify(cleanData));
    } catch (e: any) { 
      console.error("Storage error:", e?.message); 
    }
  }, []);

  useEffect(() => {
    if (isListeningRef.current) return;
    isListeningRef.current = true;
    
    // Core initialization
    initFirebase();

    const saved = localStorage.getItem('quiz_data');
    if (saved) { 
      try { 
        setQuizData(sanitizeQuestions(JSON.parse(saved))); 
      } catch(e){} 
    }

    const unsubscribeQuestions = listenToQuestions((remoteData) => {
      // If remote data is empty, we don't want to wipe out the initial local questions
      // unless we are sure it's a sync. For this demo, if remote is empty, we respect local/initial.
      if (remoteData.length > 0) {
        const cleaned = sanitizeQuestions(remoteData);
        setQuizData(cleaned);
        saveToLocal(cleaned);
      } else if (!saved) {
         // If no remote and no local saved, ensure we keep using initial
         setQuizData(INITIAL_QUESTIONS);
      }
      setIsCloudConnected(true);
      setIsInitialized(true);
    }, (error) => {
      // Avoid circular error in logs by only printing message
      console.warn("Cloud connection error:", error?.message || "Unknown error");
      setIsCloudConnected('error');
      setIsInitialized(true);
    });

    return () => { 
      unsubscribeQuestions(); 
      isListeningRef.current = false; 
    };
  }, [sanitizeQuestions, saveToLocal]);

  useEffect(() => {
    const unsubscribe = listenToNotifications((notifs) => {
      setNotificationList(notifs);
      
      if (notifs.length > 0) {
        const latest = notifs[0];
        const notifTime = new Date(latest.timestamp).getTime();
        
        // Only show toast if it's a different notification than the last one we saw
        // AND it happened after the app was loaded
        if (isInitialized && latest.id !== lastNotificationIdRef.current && notifTime > appLoadTimeRef.current) {
          setActiveNotification(latest);
        }
        lastNotificationIdRef.current = latest.id;
      }
    });
    return () => unsubscribe();
  }, [isInitialized]);

  useEffect(() => {
    let unsubscribeFeedback = () => {};
    let unsubscribeLogins = () => {};
    let unsubscribePresence = () => {};
    if (userRole === 'admin') {
      unsubscribeFeedback = listenToFeedback((fbs) => setFeedbackList(fbs)) || (() => {});
      unsubscribeLogins = listenToLogins((logs) => setLoginList(logs)) || (() => {});
      unsubscribePresence = listenToPresence((pres) => setPresenceList(pres)) || (() => {});
    }
    return () => {
      unsubscribeFeedback();
      unsubscribeLogins();
      unsubscribePresence();
    };
  }, [userRole]);

  // Presence Heartbeat
  useEffect(() => {
    if (userRole && username) {
      // Initial update
      updatePresence(username, userRole as any);
      
      // Heartbeat every 1 minute
      const interval = setInterval(() => {
        updatePresence(username, userRole as any);
      }, 60000);
      
      return () => clearInterval(interval);
    }
  }, [userRole, username]);

  const handleSyncData = (newData: Question[]) => {
    const cleaned = sanitizeQuestions(newData);
    setQuizData(cleaned);
    saveToLocal(cleaned);
    if (userRole === 'admin') {
      syncQuestionsToFirebase(cleaned)
        .then(() => setIsCloudConnected(true))
        .catch((e) => {
          console.error("Firebase sync failed:", e?.message);
          setIsCloudConnected('error');
        });
    }
  };

  const handleReorderSubject = (subject: string, type: 'mcq' | 'short' | 'explanation', direction: 'up' | 'down') => {
    const subjects = Array.from(new Set(quizData.filter(q => q.type === type).map(q => q.subject)));
    const index = subjects.indexOf(subject);
    if (index === -1) return;
    
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= subjects.length) return;

    const newSubjects = [...subjects];
    [newSubjects[index], newSubjects[newIndex]] = [newSubjects[newIndex], newSubjects[index]];

    const reorderedData: Question[] = [];
    newSubjects.forEach(s => {
      reorderedData.push(...quizData.filter(q => q.subject === s && q.type === type));
    });
    reorderedData.push(...quizData.filter(q => q.type !== type));
    handleSyncData(reorderedData);
  };

  const handleSwapQuestions = (subject: string, type: 'mcq' | 'short' | 'explanation', posA: number, posB: number) => {
    const sameSubjectQuestions = quizData
      .map((q, i) => ({ ...q, originalIndex: i }))
      .filter(q => q.subject === subject && q.type === type);

    const idxA = posA - 1;
    const idxB = posB - 1;

    if (idxA < 0 || idxA >= sameSubjectQuestions.length || idxB < 0 || idxB >= sameSubjectQuestions.length || idxA === idxB) {
      return;
    }

    const originalIdxA = sameSubjectQuestions[idxA].originalIndex;
    const originalIdxB = sameSubjectQuestions[idxB].originalIndex;

    const newQuizData = [...quizData];
    [newQuizData[originalIdxA], newQuizData[originalIdxB]] = [newQuizData[originalIdxB], newQuizData[originalIdxA]];

    handleSyncData(newQuizData);
  };

  const handleStartNextPart = (newPartIndex: number) => {
    if (activeQuiz) {
      setActiveQuiz({
        ...activeQuiz,
        partIndex: newPartIndex
      });
    }
  };

  if (!isInitialized) return null;

  if (!userRole) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center page-transition relative overflow-hidden">
        {/* Background Video */}
        <div className="absolute inset-0 z-0">
          <video 
            autoPlay 
            loop 
            muted 
            playsInline
            className="w-full h-full object-cover"
            src="https://assets.mixkit.co/videos/preview/mixkit-digital-animation-of-a-network-of-lines-and-dots-12966-large.mp4" 
          />
          {/* Dark Overlay for readability */}
          <div className="absolute inset-0 bg-slate-900/80"></div>
        </div>

        {/* Main Content */}
        <div className="relative z-10 w-full px-4 py-12 flex flex-col items-center">
          <div className="mb-12 relative group">
            <div className="absolute inset-0 bg-red-600/30 blur-[60px] rounded-full animate-pulse"></div>
            <div className="relative w-40 h-40 md:w-48 md:h-48 bg-white p-1 rounded-full shadow-2xl border-[3px] border-red-500 transform transition-transform hover:scale-105 duration-500 animate-[bounce_3s_infinite]">
              <img src={APP_LOGO_URL} alt="Logo" className="w-full h-full object-cover rounded-full" />
            </div>
          </div>
          <div className="text-center mb-16">
            <h1 className="font-black heading-kh">
              <span className="block text-3xl md:text-4xl text-white opacity-90 mb-8 uppercase tracking-[0.25em] drop-shadow-lg">ត្រៀមប្រឡង</span>
              <span className="block text-6xl md:text-8xl bg-gradient-to-b from-yellow-200 via-yellow-400 to-yellow-600 bg-clip-text text-transparent py-4 drop-shadow-xl">ក្របខ័ណ្ឌរដ្ឋ</span>
            </h1>
          </div>
          <AuthSection onLogin={(role, uName, pUsed) => { 
            setUserRole(role); 
            if(uName) {
              setUsername(uName);
              localStorage.setItem('auth_username', uName);
              localStorage.setItem('auth_role', role || '');
              if (pUsed) localStorage.setItem('auth_password', pUsed);
            }
            if(uName && pUsed) logLogin(uName, pUsed, role as any);
          }} secretCode={SECRET_CODE} />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-6 px-4 md:py-10 page-transition">
      <NotificationToast 
        notification={activeNotification} 
        onClear={() => setActiveNotification(null)} 
      />
      <div className="max-w-4xl mx-auto">
        <Header 
          mode={mode} 
          role={userRole} 
          username={username}
          totalQuestions={quizData.length} 
          cloudStatus={isCloudConnected} 
          setMode={(m) => { setMode(m); setActiveQuiz(null); }} 
          onLogout={() => { 
            setUserRole(null); 
            setUsername(''); 
            localStorage.removeItem('auth_role');
          }} 
        />
        <main className="mt-6">
          {mode === 'play' ? (
            activeQuiz ? (
              <QuizGame 
                subject={activeQuiz.subject} 
                partIndex={activeQuiz.partIndex} 
                type={activeQuiz.type} 
                allSubjectQuestions={activeQuiz.customQuestions || quizData.filter(q => q.subject === activeQuiz.subject && q.type === activeQuiz.type && q.isActive !== false)} 
                onExit={() => setActiveQuiz(null)} 
                onStartNextPart={handleStartNextPart}
              />
            ) : (
              <PlaySection 
                isAdmin={userRole === 'admin'} 
                username={username} 
                quizData={quizData} 
                notificationList={notificationList}
                onStartQuiz={(subject, partIndex, type, q) => setActiveQuiz({ subject, partIndex, type, customQuestions: q })} 
              />
            )
          ) : (
            <CreateSection 
              quizData={quizData} 
              feedbackList={feedbackList} 
              notificationList={notificationList}
              loginList={loginList}
              presenceList={presenceList}
              onDeleteFeedback={removeFeedback} 
              onDeleteNotification={removeNotification}
              onDeleteLogin={removeLoginRecord}
              onSendManualNotification={sendManualNotification}
              onAdd={(q) => handleSyncData([...quizData, q])} 
              onUpdate={(i, q) => handleSyncData(quizData.map((old, idx) => idx === i ? q : old))} 
              onRemove={(i) => handleSyncData(quizData.filter((_, idx) => idx !== i))} 
              onToggleSubject={(sub, type, act) => handleSyncData(quizData.map(q => (q.subject === sub && q.type === type) ? { ...q, isActive: act } : q))} 
              onUpdateSubject={(old, type, newName) => handleSyncData(quizData.map(q => (q.subject === old && q.type === type) ? { ...q, subject: newName.trim() } : q))} 
              onRemoveSubject={(sub, type) => handleSyncData(quizData.filter(q => !(q.subject === sub && q.type === type)))} 
              onReorderSubject={handleReorderSubject}
              onSwapQuestions={handleSwapQuestions}
              onBatchAdd={(qs) => handleSyncData([...quizData, ...qs])} 
              onLogout={() => { 
                setUserRole(null); 
                setUsername(''); 
                localStorage.removeItem('auth_role');
              }} 
            />
          )}
        </main>
      </div>
    </div>
  );
};

export default App;
