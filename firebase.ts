// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth, signInAnonymously, onAuthStateChanged } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// TODO: 请将此处替换为您自己的 Firebase 项目配置
// 您可以从 Firebase 项目的控制台 -> 项目设置 中找到这些信息
const firebaseConfig = {
  apiKey: "AIzaSyAFUC-Vc-vBJITVnh2oM369ONG71RSGyXE",
  authDomain: "kolckm-bca2f.firebaseapp.com",
  projectId: "kolckm-bca2f",
  storageBucket: "kolckm-bca2f.firebasestorage.app",
  messagingSenderId: "840830636040",
  appId: "1:840830636040:web:91a511ed8453eb11d401bd",
  measurementId: "G-4DREL3119C"
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
