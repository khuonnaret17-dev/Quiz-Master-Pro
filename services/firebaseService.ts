
import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { initializeFirestore, doc, setDoc, onSnapshot, Firestore, getFirestore, collection, addDoc, query, orderBy, deleteDoc } from 'firebase/firestore';
import { Question, Feedback } from '../types';

const firebaseConfig = {
  apiKey: "AIzaSyDw5UkwT6ab4rlel-g6KSmaKM9MgjUnIOs",
  authDomain: "quiz-master-kh.firebaseapp.com",
  projectId: "quiz-master-kh",
  storageBucket: "quiz-master-kh.firebasestorage.app",
  messagingSenderId: "1030981971798",
  appId: "1:1030981971798:web:5a7e6e86c0c593dca830f7",
  measurementId: "G-MQJYZ5ME91"
};

let db: Firestore | null = null;

export const initFirebase = (): Firestore | null => {
  if (db) return db;
  
  try {
    const apps = getApps();
    const app: FirebaseApp = apps.length === 0 ? initializeApp(firebaseConfig) : apps[0];
    
    db = initializeFirestore(app, {
      experimentalForceLongPolling: true,
      experimentalAutoDetectLongPolling: false,
      useFetchStreams: false,
    } as any);
    
    return db;
  } catch (e) {
    try {
      db = getFirestore();
      return db;
    } catch (innerErr) {
      console.error("Firebase critical failure:", innerErr);
      return null;
    }
  }
};

/**
 * មុខងារសម្រាប់ Questions
 */
const prepareDataForFirestore = (questions: Question[]): any[] => {
  if (!Array.isArray(questions)) return [];
  
  return questions.map(q => {
    const type = q.type === 'short' ? 'short' : 'mcq';
    if (type === 'mcq') {
      return {
        subject: String(q.subject || ''),
        question: String(q.question || ''),
        type: 'mcq',
        options: Array.isArray(q.options) ? q.options.map(o => String(o)) : [],
        correct: typeof q.correct === 'number' ? q.correct : 0,
        isActive: q.isActive !== false
      };
    } else {
      return {
        subject: String(q.subject || ''),
        question: String(q.question || ''),
        type: 'short',
        answer: String(q.answer || ''),
        isActive: q.isActive !== false
      };
    }
  });
};

export const syncQuestionsToFirebase = async (questions: Question[]) => {
  const database = initFirebase();
  if (!database) throw new Error("Database not initialized");
  
  try {
    const quizRef = doc(database, 'config', 'questions_data');
    const dataToSync = prepareDataForFirestore(questions);

    await setDoc(quizRef, { 
      questions: dataToSync, 
      updatedAt: new Date().toISOString() 
    });
  } catch (err) {
    console.error("Sync to Firebase failed:", err);
    throw err;
  }
};

export const listenToQuestions = (
  onUpdate: (questions: Question[]) => void, 
  onError: (error: any) => void
) => {
  const database = initFirebase();
  if (!database) {
    onError(new Error("No DB Connection"));
    return () => {};
  }
  
  const quizRef = doc(database, 'config', 'questions_data');
  
  return onSnapshot(quizRef, 
    (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        onUpdate(data.questions || []);
      } else {
        onUpdate([]);
      }
    },
    (error) => {
      console.error("Firestore real-time error:", error);
      onError(error);
    }
  );
};

/**
 * មុខងារថ្មីសម្រាប់មតិយោបល់ (Feedback)
 */
export const sendFeedback = async (username: string, text: string) => {
  const database = initFirebase();
  if (!database) return;
  try {
    const feedbackCol = collection(database, 'feedback');
    await addDoc(feedbackCol, {
      username,
      text,
      createdAt: new Date().toISOString()
    });
  } catch (e) {
    console.error("Error sending feedback:", e);
  }
};

export const listenToFeedback = (onUpdate: (feedback: Feedback[]) => void) => {
  const database = initFirebase();
  if (!database) return () => {};
  const feedbackCol = collection(database, 'feedback');
  const q = query(feedbackCol, orderBy('createdAt', 'desc'));
  
  return onSnapshot(q, (snapshot) => {
    const fbList = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Feedback[];
    onUpdate(fbList);
  });
};

export const removeFeedback = async (id: string) => {
  const database = initFirebase();
  if (!database) return;
  try {
    await deleteDoc(doc(database, 'feedback', id));
  } catch (e) {
    console.error("Error deleting feedback:", e);
  }
};
