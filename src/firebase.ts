import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';
import { getAuth, setPersistence, browserSessionPersistence } from 'firebase/auth';

// Your web app's Firebase configuration
// Replace these values with your own from the Firebase Console
// Go to: https://console.firebase.google.com/
// 1. Create a new project or select existing one
// 2. Click on the web icon (</>) to add a web app
// 3. Register your app and copy the config object here
const firebaseConfig = {
  apiKey: "AIzaSyDHQZjZcmTzVp4DepnVB8eWiNw3rg7LAH4",
  authDomain: "todo-app-d185e.firebaseapp.com",
  projectId: "todo-app-d185e",
  storageBucket: "todo-app-d185e.firebasestorage.app",
  messagingSenderId: "689629206821",
  appId: "1:689629206821:web:3533ee32c010dd0ca4a2cc"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);

// Set auth persistence to session only (won't persist across browser restarts)
setPersistence(auth, browserSessionPersistence).catch((error) => {
  console.error("Error setting auth persistence:", error);
});