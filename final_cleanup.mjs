
import { initializeApp } from "firebase/app";
import { getFirestore, collection, getDocs, deleteDoc, doc, query, where } from "firebase/firestore";

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

const namesToDelete = [
    "NIKHIL JAGGARI", "venu", "gowtham", "sujay", "chinnu", "mani",
    "jaggari nikhil", "Jane Smith", "jaggari sree", "jaggari vionda", "jaggari akhil"
];

async function finalCleanup() {
    console.log("Starting final cleanup of specific data...");

    // 1. Find the target customers
    const customersSnap = await getDocs(collection(db, 'customers'));
    const customerIdsToDelete = new Set();

    for (const d of customersSnap.docs) {
        const name = (d.data().name || '').toLowerCase();
        if (namesToDelete.some(n => name === n.toLowerCase())) {
            customerIdsToDelete.add(d.id);
            console.log(`Marking customer for deletion: ${d.data().name} (${d.id})`);
        }
    }

    if (customerIdsToDelete.size === 0) {
        console.log("No matching customers found.");
        return;
    }

    // 2. Delete Bills associated with these customers
    const billsSnap = await getDocs(collection(db, 'bills'));
    let billsDeleted = 0;
    for (const d of billsSnap.docs) {
        if (customerIdsToDelete.has(d.data().customerId)) {
            await deleteDoc(doc(db, 'bills', d.id));
            billsDeleted++;
        }
    }
    console.log(`Deleted ${billsDeleted} bills.`);

    // 3. Delete Salary associated with these users (if they were also workers)
    // Note: Sujay, Mani, Nikhil Jaggari might be workers too.
    const salarySnap = await getDocs(collection(db, 'salary'));
    let salaryDeleted = 0;
    for (const d of salarySnap.docs) {
        if (customerIdsToDelete.has(d.data().workerId) || customerIdsToDelete.has(d.data().userId)) {
            await deleteDoc(doc(db, 'salary', d.id));
            salaryDeleted++;
        }
    }
    console.log(`Deleted ${salaryDeleted} salary records.`);

    // 4. Delete the Customers themselves
    let customersDeleted = 0;
    for (const id of customerIdsToDelete) {
        await deleteDoc(doc(db, 'customers', id));
        customersDeleted++;
    }
    console.log(`Deleted ${customersDeleted} customers.`);

    console.log("Cleanup finished.");
}

finalCleanup().catch(console.error);
