import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
    apiKey: "AIzaSyCizvZ27xh1_7lmG9WCyp4_hNg_hMulM4Y",
    authDomain: "sln-networks.firebaseapp.com",
    projectId: "sln-networks",
    storageBucket: "sln-networks.firebasestorage.app",
    messagingSenderId: "310506557816",
    appId: "1:310506557816:web:14fac20b5fd8e1f0c0788d",
    measurementId: "G-9PW6YHMG1N"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);
