import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyDwAAlJUS1R8xtzJyjs_rMbQnlyx9Nl4Ok",
  authDomain: "task-fini.firebaseapp.com",
  projectId: "task-fini",
  // ...other config values
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const db = getFirestore(app); 