import { initializeApp, getApps, getApp } from 'firebase/app';
import { initializeFirestore, doc, setDoc, onSnapshot } from 'firebase/firestore';
import { Question } from '../types';

/**
 * ⚠️ បញ្ជាក់៖ ដើម្បីបាត់ Error "permission-denied" អ្នកត្រូវ៖
 * ១. ចូលទៅ Firebase Console > Firestore Database > Rules
 * ២. កែទៅជា៖
 *    service cloud.firestore {
 *      match /databases/{database}/documents {
 *        match /{document=**} {
 *          allow read, write: if true; // សម្រាប់តេស្តសាកល្បង
 *        }
 *      }
 *    }
 */

const firebaseConfig = {
  apiKey: "AIzaSyDw5UkwT6ab4rlel-g6KSmaKM9MgjUnIOs",
  authDomain: "quiz-master-kh.firebaseapp.com",
  projectId: "quiz-master-kh",
  storageBucket: "quiz-master-kh.firebasestorage.app",
  messagingSenderId: "1030981971798",
  appId: "1:1030981971798:web:5a7e6e86c0c593dca830f7",
  measurementId: "G-MQJYZ5ME91"
};

let db: any = null;

export const initFirebase = () => {
  try {
    // បង្ការការតម្លើងម្ដងហើយម្ដងទៀត និងដោះស្រាយបញ្ហា Connectivity Timeout
    const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
    
    // បង្ខំឱ្យប្រើ Long Polling ដើម្បីជៀសវាងបញ្ហា WebSocket មិនឆ្លើយតបក្នុងរយៈពេល 10 វិនាទី
    db = initializeFirestore(app, {
      experimentalForceLongPolling: true,
      useFetchStreams: false // បន្ថែមស្ថិរភាពសម្រាប់ Browser មួយចំនួន
    });
    
    return db;
  } catch (e) {
    console.error("Firebase initialization failed:", e);
    return null;
  }
};

export const syncQuestionsToFirebase = async (questions: Question[]) => {
  if (!db) throw new Error("Database not initialized");
  const quizRef = doc(db, 'config', 'questions_data');
  await setDoc(quizRef, { 
    questions, 
    updatedAt: new Date().toISOString() 
  });
};

export const listenToQuestions = (
  onUpdate: (questions: Question[]) => void, 
  onError: (error: any) => void
) => {
  if (!db) {
    onError(new Error("No DB"));
    return () => {};
  }
  
  const quizRef = doc(db, 'config', 'questions_data');
  
  return onSnapshot(quizRef, 
    (docSnap) => {
      if (docSnap.exists()) {
        onUpdate(docSnap.data().questions || []);
      } else {
        onUpdate([]);
      }
    },
    (error) => {
      // បោះកំហុសទៅ UI ដើម្បីឱ្យដឹងថា Sync មិនដំណើរការ
      onError(error);
    }
  );
};
