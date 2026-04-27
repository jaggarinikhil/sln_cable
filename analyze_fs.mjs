
import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, deleteDoc, doc } from "firebase/firestore";

const firebaseConfig = {
    apiKey: "AIzaSyCizvZ27xh1_7lmG9WCyp4_hNg_hMulM4Y",
    authDomain: "sln-networks.firebaseapp.com",
    projectId: "sln-networks",
    storageBucket: "sln-networks.firebasestorage.app",
    messagingSenderId: "310506557816",
    appId: "1:310506557816:web:14fac20b5fd8e1f0c0788d"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

async function analyzeData() {
    const collections = ['customers', 'bills', 'salary', 'complaints', 'workHours'];

    for (const col of collections) {
        const snap = await getDocs(collection(db, col));
        console.log(`Collection: ${col}, Total Docs: ${snap.docs.length}`);

        const dates = snap.docs.map(d => {
            const data = d.data();
            return data.generatedDate || data.paymentDate || data.date || data.createdAt || data.month;
        }).filter(Boolean);

        if (dates.length > 0) {
            dates.sort();
            console.log(`  Range: ${dates[0]} to ${dates[dates.length - 1]}`);
        }
    }
}

analyzeData().catch(console.error);
