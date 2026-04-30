// 🔥 FIREBASE КОНФИГУРАЦИЯ

import { initializeApp } from "firebase/app";
import { getDatabase, Database } from "firebase/database";

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  databaseURL: process.env.NEXT_PUBLIC_FIREBASE_DATABASE_URL,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

let app: any;
let database: Database | null = null;

export function initializeFirebase() {
  if (!app) {
    console.log("🔥 Инициализирую Firebase...");
    app = initializeApp(firebaseConfig);
    database = getDatabase(app);
    console.log("✅ Firebase инициализирован!");
  }
  return database;
}

export function getFirebaseDatabase(): Database {
  if (!database) {
    initializeFirebase();
  }
  return database!;
}

export { firebaseConfig };
