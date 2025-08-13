// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
// TODO: Add SDKs for Firebase products that you want to use
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAVs4FvvtQe9gVHo7KgBytd_dy_opa-o_A",
  authDomain: "habrecha-a69d3.firebaseapp.com",
  projectId: "habrecha-a69d3",
  storageBucket: "habrecha-a69d3.firebasestorage.app",
  messagingSenderId: "640242845106",
  appId: "1:640242845106:web:b891bcc3b7a9612be690ab"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const storage = getStorage(app);