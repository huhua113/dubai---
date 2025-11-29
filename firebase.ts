// FIX: Add a triple-slash directive to include Vite's client types, which defines `import.meta.env` for TypeScript.
/// <reference types="vite/client" />

// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth, signInAnonymously, onAuthStateChanged } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// TODO: 请在您的 Netlify 部署环境中设置以下环境变量。
// Netlify > Site settings > Build & deploy > Environment > Environment variables
// 重要：所有变量名必须以 "VITE_" 开头，Vite 才会将其暴露给前端代码。
const firebaseConfig = {
  apiKey: import.meta.env.VITE_API_KEY,
  authDomain: import.meta.env.VITE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_APP_ID,
  measurementId: import.meta.env.VITE_MEASUREMENT_ID
};


// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// 为用户匿名登录，以便他们可以访问数据库
onAuthStateChanged(auth, (user) => {
    if (user) {
      // 用户已登录
      console.log('User signed in anonymously:', user.uid);
    } else {
      // 用户未登录，尝试进行匿名登录
      signInAnonymously(auth).catch((error) => {
          console.error("Anonymous sign-in failed:", error);
      });
    }
});


export { db, auth };
