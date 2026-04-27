
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

async function cleanup() {
    console.log("Starting cleanup...");
    const keepDays = ['2026-04-25', '2026-04-26'];

    // 1. Get all data
    const billsSnap = await getDocs(collection(db, 'bills'));
    const salarySnap = await getDocs(collection(db, 'salary'));
    const customersSnap = await getDocs(collection(db, 'customers'));
    const complaintsSnap = await getDocs(collection(db, 'complaints'));
    const workHoursSnap = await getDocs(collection(db, 'workHours'));

    const billsToKeep = billsSnap.docs.filter(d => {
        const data = d.data();
        const dateStr = data.generatedDate || data.createdAt || '';
        return keepDays.some(day => dateStr.startsWith(day));
    });

    const salaryToKeep = salarySnap.docs.filter(d => {
        const data = d.data();
        const dateStr = data.paymentDate || data.date || data.createdAt || '';
        return keepDays.some(day => dateStr.startsWith(day));
    });

    // Determine which customers to keep: 
    // a) Created on 25/26
    // b) Referenced by kept bills
    const referencedCustomerIds = new Set(billsToKeep.map(b => b.data().customerId));
    const customersToKeep = customersSnap.docs.filter(d => {
        const data = d.data();
        const createdOnKeepDay = keepDays.some(day => (data.createdAt || '').startsWith(day));
        return createdOnKeepDay || referencedCustomerIds.has(d.id);
    });

    const customerIdsToKeep = new Set(customersToKeep.map(c => c.id));
    const billIdsToKeep = new Set(billsToKeep.map(b => b.id));
    const salaryIdsToKeep = new Set(salaryToKeep.map(s => s.id));

    console.log(`Keeping ${customerIdsToKeep.size} customers, ${billIdsToKeep.size} bills, ${salaryIdsToKeep.size} salary records.`);

    // 2. Perform deletions
    let deleteCount = 0;

    const deleteFromCol = async (snap, keepIds, colName) => {
        for (const d of snap.docs) {
            if (!keepIds.has(d.id)) {
                await deleteDoc(doc(db, colName, d.id));
                deleteCount++;
            }
        }
    };

    // For complaints and workHours, we'll just keep 25/26 as well
    const complaintsToKeep = new Set(complaintsSnap.docs.filter(d => keepDays.some(day => (d.data().createdAt || '').startsWith(day))).map(d => d.id));
    const workHoursToKeep = new Set(workHoursSnap.docs.filter(d => keepDays.some(day => (d.data().date || d.data().createdAt || '').startsWith(day))).map(d => d.id));

    await deleteFromCol(billsSnap, billIdsToKeep, 'bills');
    await deleteFromCol(salarySnap, salaryIdsToKeep, 'salary');
    await deleteFromCol(customersSnap, customerIdsToKeep, 'customers');
    await deleteFromCol(complaintsSnap, complaintsToKeep, 'complaints');
    await deleteFromCol(workHoursSnap, workHoursToKeep, 'workHours');

    console.log(`Cleanup finished. Total deleted: ${deleteCount} records.`);
}

cleanup().catch(console.error);
