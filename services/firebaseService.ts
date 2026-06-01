
// Fix: Using @firebase/app and @firebase/firestore instead of the top-level firebase/app
// and firebase/firestore to resolve module resolution errors in certain build environments
// where the modular SDK's named exports are not correctly identified.
import { initializeApp, getApps } from "@firebase/app";
import { 
  getFirestore, 
  initializeFirestore, 
  doc, 
  setDoc, 
  onSnapshot, 
  Firestore, 
  collection, 
  addDoc, 
  query, 
  orderBy, 
  deleteDoc,
  writeBatch
} from '@firebase/firestore';
import { Question, Feedback, AppNotification, LoginRecord, PresenceRecord } from '../types';

const firebaseConfig = {
  apiKey: "AIzaSyDw5UkwT6ab4rlel-g6KSmaKM9MgjUnIOs",
  authDomain: "quiz-master-kh.firebaseapp.com",
  projectId: "quiz-master-kh",
  storageBucket: "quiz-master-kh.firebasestorage.app",
  messagingSenderId: "1030981971798",
  appId: "1:1030981971798:web:5a7e6e86c0c593dca830f7",
  measurementId: "G-MQJYZ5ME91"
};

let dbInstance: Firestore | null = null;

/**
 * Initializes Firebase and Firestore.
 * Standardizes version usage and ensures proper component registration.
 * Uses long polling to circumvent backend connectivity timeouts.
 */
export const initFirebase = (): Firestore => {
  if (dbInstance) return dbInstance;
  
  try {
    const apps = getApps();
    const app = apps.length === 0 ? initializeApp(firebaseConfig) : apps[0];
    
    // Use initializeFirestore as primary to force experimental transport settings
    // which help with connectivity issues ("Backend didn't respond").
    try {
      dbInstance = initializeFirestore(app, {
        experimentalForceLongPolling: true,
        experimentalAutoDetectLongPolling: true,
      });
    } catch (err) {
      console.warn("Explicit initialization failed, falling back to getFirestore...");
      dbInstance = getFirestore(app);
    }
    
    return dbInstance!;
  } catch (e: any) {
    console.error("Firebase Critical Error during init:", e?.message);
    throw e;
  }
};

const prepareDataForFirestore = (questions: Question[]): any[] => {
  if (!Array.isArray(questions)) return [];
  return questions.map(q => {
    // FIX: Correctly determine the type. 
    // Previously, anything not 'short' defaulted to 'mcq', causing 'explanation' to be lost.
    let type = 'mcq';
    if (q.type === 'short') type = 'short';
    if (q.type === 'explanation') type = 'explanation';

    const base = {
      subject: String(q.subject || ''),
      question: String(q.question || ''),
      type: type,
      isActive: q.isActive !== false
    };

    if (type === 'mcq') {
      return {
        ...base,
        options: Array.isArray(q.options) ? q.options.map(o => String(o)) : ["", "", "", ""],
        correct: typeof q.correct === 'number' ? q.correct : 0,
      };
    } else {
      // Both 'short' and 'explanation' use the 'answer' field
      return {
        ...base,
        answer: String(q.answer || ''),
      };
    }
  });
};

export const syncQuestionsToFirebase = async (questions: Question[]) => {
  const database = initFirebase();
  try {
    const dataToSync = prepareDataForFirestore(questions);
    const CHUNK_SIZE = 200; // Keep chunks small enough to definitely fit 1MB
    const chunkCount = Math.ceil(dataToSync.length / CHUNK_SIZE);

    const batch = writeBatch(database);

    // Write chunks
    for (let i = 0; i < chunkCount; i++) {
      const chunk = dataToSync.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE);
      const chunkRef = doc(database, 'config', `questions_part_${i}`);
      batch.set(chunkRef, { questions: chunk });
    }

    // Update manifest
    const manifestRef = doc(database, 'config', 'questions_manifest');
    batch.set(manifestRef, { 
      chunkCount: chunkCount,
      updatedAt: new Date().toISOString() 
    });

    // Also send a notification
    const notificationCol = collection(database, 'notifications');
    const newNotifRef = doc(notificationCol);
    batch.set(newNotifRef, {
      message: "មានការកែប្រែ ឬបន្ថែមសំណួរថ្មីៗក្នុងប្រព័ន្ធ!",
      timestamp: new Date().toISOString(),
      type: 'info'
    });

    await batch.commit();
  } catch (err: any) {
    console.error("Sync error:", err?.message);
    throw err;
  }
};

export const listenToNotifications = (onUpdate: (notifications: AppNotification[]) => void) => {
  const database = initFirebase();
  const notificationCol = collection(database, 'notifications');
  const q = query(notificationCol, orderBy('timestamp', 'desc'));
  
  return onSnapshot(q, (snapshot) => {
    const list = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        message: String(data.message || ''),
        timestamp: String(data.timestamp || ''),
        type: (data.type as any) || 'info'
      };
    });
    onUpdate(list);
  });
};

export const removeNotification = async (id: string) => {
  const database = initFirebase();
  try {
    await deleteDoc(doc(database, 'notifications', id));
  } catch (e: any) {
    console.error("Delete error:", e?.message);
  }
};

export const sendManualNotification = async (message: string, type: 'info' | 'success' | 'warning' = 'info') => {
  const database = initFirebase();
  try {
    const notificationCol = collection(database, 'notifications');
    await addDoc(notificationCol, {
      message: String(message),
      timestamp: new Date().toISOString(),
      type: type
    });
  } catch (e: any) {
    console.error("Manual notification error:", e?.message);
    throw e;
  }
};

export const listenToQuestions = (
  onUpdate: (questions: Question[]) => void, 
  onError: (error: any) => void
) => {
  const database = initFirebase();
  
  // Track listeners to cleanup
  let manifestUnsubscribe: (() => void) | null = null;
  let chunkUnsubscribes: (() => void)[] = [];
  
  // Local state to merge chunks
  let chunksData: { [key: number]: Question[] } = {};
  let expectedChunkCount = 0;

  const manifestRef = doc(database, 'config', 'questions_manifest');
  
  manifestUnsubscribe = onSnapshot(manifestRef, (snap) => {
    if (snap.exists()) {
      const data = snap.data();
      const newChunkCount = data.chunkCount || 0;
      
      // If chunk count is the same, we might still have individual chunk updates
      // but if it changes, we need to reset listeners
      if (newChunkCount !== expectedChunkCount) {
        // Cleanup old chunk listeners
        chunkUnsubscribes.forEach(unsub => unsub());
        chunkUnsubscribes = [];
        chunksData = {};
        expectedChunkCount = newChunkCount;

        if (expectedChunkCount === 0) {
          onUpdate([]);
          return;
        }

        // Create new chunk listeners
        for (let i = 0; i < expectedChunkCount; i++) {
          const chunkRef = doc(database, 'config', `questions_part_${i}`);
          const unsub = onSnapshot(chunkRef, (cSnap) => {
            if (cSnap.exists()) {
              chunksData[i] = cSnap.data().questions || [];
            } else {
              chunksData[i] = [];
            }

            // Only update when we have data for all chunks
            if (Object.keys(chunksData).length === expectedChunkCount) {
              const fullList: Question[] = [];
              for (let j = 0; j < expectedChunkCount; j++) {
                fullList.push(...(chunksData[j] || []));
              }
              onUpdate(fullList);
            }
          }, onError);
          chunkUnsubscribes.push(unsub);
        }
      }
    } else {
      // Fallback for first time or before migration
      // Try to check the legacy single document
      const legacyRef = doc(database, 'config', 'questions_data');
      const unsub = onSnapshot(legacyRef, (lSnap) => {
        if (lSnap.exists()) {
          onUpdate(lSnap.data().questions || []);
        } else {
          onUpdate([]);
        }
      }, onError);
      chunkUnsubscribes.push(unsub);
    }
  }, onError);

  return () => {
    if (manifestUnsubscribe) manifestUnsubscribe();
    chunkUnsubscribes.forEach(unsub => unsub());
  };
};

export const sendFeedback = async (username: string, text: string) => {
  const database = initFirebase();
  try {
    const feedbackCol = collection(database, 'feedback');
    await addDoc(feedbackCol, {
      username: String(username),
      text: String(text),
      createdAt: new Date().toISOString()
    });
  } catch (e: any) {
    console.error("Feedback error:", e?.message);
  }
};

export const listenToFeedback = (onUpdate: (feedback: Feedback[]) => void) => {
  const database = initFirebase();
  const feedbackCol = collection(database, 'feedback');
  const q = query(feedbackCol, orderBy('createdAt', 'desc'));
  
  return onSnapshot(q, (snapshot) => {
    const fbList = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        username: String(data.username || 'Anonymous'),
        text: String(data.text || ''),
        createdAt: String(data.createdAt || new Date().toISOString())
      };
    }) as Feedback[];
    onUpdate(fbList);
  });
};

export const removeFeedback = async (id: string) => {
  const database = initFirebase();
  try {
    await deleteDoc(doc(database, 'feedback', id));
  } catch (e: any) {
    console.error("Delete error:", e?.message);
  }
};

export const logLogin = async (username: string, passwordUsed: string, role: 'user' | 'admin') => {
  const database = initFirebase();
  try {
    const loginCol = collection(database, 'logins');
    await addDoc(loginCol, {
      username: String(username),
      passwordUsed: String(passwordUsed),
      role: role,
      timestamp: new Date().toISOString()
    });
  } catch (e: any) {
    console.error("Login log error:", e?.message);
  }
};

export const listenToLogins = (onUpdate: (logins: LoginRecord[]) => void) => {
  const database = initFirebase();
  const loginCol = collection(database, 'logins');
  const q = query(loginCol, orderBy('timestamp', 'desc'));
  
  return onSnapshot(q, (snapshot) => {
    const list = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        username: String(data.username || ''),
        passwordUsed: String(data.passwordUsed || ''),
        role: (data.role as any) || 'user',
        timestamp: String(data.timestamp || '')
      };
    });
    onUpdate(list);
  });
};

export const removeLoginRecord = async (id: string) => {
  const database = initFirebase();
  try {
    await deleteDoc(doc(database, 'logins', id));
  } catch (e: any) {
    console.error("Delete login error:", e?.message);
  }
};

export const updatePresence = async (username: string, role: 'user' | 'admin') => {
  const database = initFirebase();
  try {
    // Use username as doc ID to keep it unique per user
    const presenceRef = doc(database, 'presence', username);
    await setDoc(presenceRef, {
      username,
      role,
      lastSeen: new Date().toISOString()
    });
  } catch (e: any) {
    console.error("Presence update error:", e?.message);
  }
};

export const listenToPresence = (onUpdate: (presence: PresenceRecord[]) => void) => {
  const database = initFirebase();
  const presenceCol = collection(database, 'presence');
  
  return onSnapshot(presenceCol, (snapshot) => {
    const list = snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        username: String(data.username || ''),
        role: (data.role as any) || 'user',
        lastSeen: String(data.lastSeen || '')
      };
    });
    onUpdate(list);
  });
};
