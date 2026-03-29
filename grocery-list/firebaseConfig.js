import { initializeApp } from 'firebase/app';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyByAZ_FqztAWdsVXLVZQcT_wOf_4sdOghs",
    authDomain: "grocery-list-bb640.firebaseapp.com",
      projectId: "grocery-list-bb640",
        storageBucket: "grocery-list-bb640.firebasestorage.app",
          messagingSenderId: "498646662350",
            appId: "1:498646662350:web:f9a605ded2a07d7c94249f"
            };

            const app = initializeApp(firebaseConfig);
            export const db = getFirestore(app);