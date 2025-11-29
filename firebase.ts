// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth, signInAnonymously, onAuthStateChanged } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// TODO: 请将下方的占位符替换为您自己的 Firebase 项目配置
// 您可以从 Firebase 项目的控制台 -> 项目设置 中找到这些信息
// 在当前预览环境中，必须直接提供配置，因为没有构建过程来注入环境变量。
const firebaseConfig = {
  apiKey: "YOUR_API_KEY", // 替换为您的 API Key
  authDomain: "YOUR_AUTH_DOMAIN", // 替换为您的 Auth Domain
  projectId: "YOUR_PROJECT_ID", // 替换为您的 Project ID
  storageBucket: "YOUR_STORAGE_BUCKET", // 替换为您的 Storage Bucket
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID", // 替换为您的 Messaging Sender ID
  appId: "YOUR_APP_ID", // 替换为您的 App ID
  measurementId: "YOUR_MEASUREMENT_ID" // 替换为您的 Measurement ID
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
