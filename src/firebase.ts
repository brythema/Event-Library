/**
 * Firebase client bootstrap. This config is public web data by design
 * (Firebase web configs identify, not authorize, a project).
 */
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

export const FIREBASE_CONFIG = {
  apiKey: 'AIzaSyDfrZZfqYWjE8dGTYbbpE-AK4lemIJlPYE',
  authDomain: 'iron-mint-announcements.firebaseapp.com',
  projectId: 'iron-mint-announcements',
  storageBucket: 'iron-mint-announcements.firebasestorage.app',
  messagingSenderId: '821595945224',
  appId: '1:821595945224:web:1b6e9bc5505da4b47294bd',
};

const app = getApps().length ? getApp() : initializeApp(FIREBASE_CONFIG);

export const auth = getAuth(app);
export const db = getFirestore(app);
