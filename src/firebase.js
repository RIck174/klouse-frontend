import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyBipl8D3PDRl308qPWtEOd4nxregi5YJ6s",
  authDomain: "klouse-4908b.firebaseapp.com",
  projectId: "klouse-4908b",
  storageBucket: "klouse-4908b.firebasestorage.app",
  messagingSenderId: "655687799283",
  appId: "1:655687799283:web:2dd2428ac933b4adf60286",
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
