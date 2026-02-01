
import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { initializeFirestore, doc, setDoc, onSnapshot, Firestore, getFirestore } from 'firebase/firestore';
import { Question } from '../types';

/**
 * ⚠️ ដំណោះស្រាយសម្រាប់បញ្ហា Firestore Connection Timeout (10 seconds):
 * ១. បង្ខំឱ្យប្រើ Long Polling (experimentalForceLongPolling)
 * ២. បិទការស្វែងរក Network Type (experimentalAutoDetectLongPolling: false)
 * ៣. បិទ Fetch Streams ដើម្បីជៀសវាងការស្ទះក្នុង Browser មួយចំនួន
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

let db: Firestore | null = null;

export const initFirebase = (): Firestore | null => {
  if (db) return db;
  
  try {
    const apps = getApps();
    const app: FirebaseApp = apps.length === 0 ? initializeApp(firebaseConfig) : apps[0];
    
    // ការកំណត់កម្រិតខ្ពស់ដើម្បីដោះស្រាយបញ្ហា Network/Proxy និង Timeout 10s
    db = initializeFirestore(app, {
      experimentalForceLongPolling: true,
      experimentalAutoDetectLongPolling: false,
      useFetchStreams: false, // បន្ថែមដើម្បីជួយដល់ល្បឿនតភ្ជាប់ក្នុងបណ្ដាញយឺត
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
 * មុខងារសម្អាតទិន្នន័យឱ្យទៅជា Plain Object សុទ្ធសាធមុននឹងផ្ញើទៅ Firestore
 * ដើម្បីជៀសវាង error "Converting circular structure to JSON"
 */
const prepareDataForFirestore = (questions: Question[]): any[] => {
  if (!Array.isArray(questions)) return [];
  
  return questions.map(q => {
    // បង្កើត object ថ្មីដោយជ្រើសរើសយកតែ key ដែលចាំបាច់ និងជា Primitive Type
    const cleaned: any = {
      subject: String(q.subject || ''),
      question: String(q.question || ''),
      type: q.type === 'short' ? 'short' : 'mcq',
      isActive: q.isActive !== false
    };

    if (cleaned.type === 'mcq') {
      cleaned.options = Array.isArray(q.options) 
        ? q.options.map(o => String(o || '')) 
        : ['', '', '', ''];
      cleaned.correct = Number(q.correct) || 0;
    } else {
      cleaned.answer = String(q.answer || '');
    }

    return cleaned;
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
      // កែសម្រួលការចាប់ Error កុំឱ្យវាបង្ហាញ Warning រំខានច្រើនពេកក្នុង Console ពេល Network មិនល្អ
      if (error.code === 'unavailable' || error.message.includes('10 seconds')) {
        console.warn("Firestore backend is taking too long. Continuing in offline mode...");
      } else {
        console.error("Firestore real-time error:", error);
      }
      onError(error);
    }
  );
};
