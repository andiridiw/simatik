import { initializeApp, getApps } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// ✅ CONFIG YANG BENAR DARI FIREBASE CONSOLE
const firebaseConfig = {
  apiKey: "AIzaSyBiak6W4J4guiBpHSxlMUannM7DEfVHoCc",
  authDomain: "simatik-ba941.firebaseapp.com",
  projectId: "simatik-ba941",
  storageBucket: "simatik-ba941.firebasestorage.app",
  messagingSenderId: "687422003677",
  appId: "1:687422003677:web:bbe22dccc924f693e0fe34"
};

// Inisialisasi Firebase
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

export const auth = getAuth(app);
export const db = getFirestore(app);

console.log('✅ Firebase berhasil diinisialisasi!');