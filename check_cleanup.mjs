
import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs } from "firebase/firestore";

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

async function checkDates() {
    const collections = ['customers', 'bills', 'salary'];
    const keepDays = ['2026-04-25', '2026-04-26'];

    for (const col of collections) {
        const snap = await getDocs(collection(db, col));
        const total = snap.docs.length;
        const toKeep = snap.docs.filter(d => {
            const data = d.data();
            const dateStr = data.generatedDate || data.paymentDate || data.date || data.createdAt || '';
            return keepDays.some(day => dateStr.startsWith(day));
        }).length;

        console.log(`${col}: Total ${total}, Selected (25/26): ${toKeep}`);
    }
}

checkDates().catch(console.error);
