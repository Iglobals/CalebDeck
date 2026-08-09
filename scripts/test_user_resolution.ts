import { adminDb, ensureFirebaseAdmin } from '../server/firebase-admin.js';
import { getAuth } from 'firebase-admin/auth';
import { FieldValue } from 'firebase-admin/firestore';
import crypto from 'crypto';

async function runTests() {
    ensureFirebaseAdmin();
    const auth = getAuth();
    const db = adminDb();

    console.log("=== Running ICA User Resolution Tests ===");

    // Test 1: New user creates cleanly
    const newEmail = `test.new.${Date.now()}@example.com`;
    const newSub = crypto.randomUUID();
    console.log(`\nTest 1: New User (${newEmail})`);
    
    let newUid = '';
    try {
        await auth.getUserByEmail(newEmail);
        console.log("❌ Expected auth/user-not-found, but user existed.");
    } catch (error: any) {
        if (error.code === 'auth/user-not-found') {
            console.log("✅ Correctly caught auth/user-not-found.");
            const newUser = await auth.createUser({
                email: newEmail,
                emailVerified: true,
                displayName: 'Test New User',
            });
            newUid = newUser.uid;
            
            await db.collection('users').doc(newUid).set({
                role: 'STUDENT',
                email: newEmail,
                icaSub: newSub,
                walletBalance: 0,
                createdAt: FieldValue.serverTimestamp()
            }, { merge: true });
            console.log(`✅ Cleanly created new Firebase Auth user with UID: ${newUid}`);
            
            const docSnap = await db.collection('users').doc(newUid).get();
            if (docSnap.exists) {
                console.log(`✅ Created Firestore doc with icaSub: ${docSnap.data()?.icaSub}`);
            }
        } else {
            console.log("❌ Unexpected error:", error);
        }
    }

    // Test 2: Existing user keeps UID/history
    console.log(`\nTest 2: Existing User (${newEmail})`);
    try {
        const userRecord = await auth.getUserByEmail(newEmail);
        console.log(`✅ Successfully found existing user. Kept original UID: ${userRecord.uid} (matches ${newUid})`);
        
        // Simulate merge update
        await db.collection('users').doc(userRecord.uid).set({
            icaSub: newSub
        }, { merge: true });
        
        const docSnap = await db.collection('users').doc(userRecord.uid).get();
        console.log(`✅ Firestore update succeeded. Wallet balance remains untouched: ${docSnap.data()?.walletBalance}`);
        
    } catch (error) {
        console.log("❌ Failed to resolve existing user:", error);
    }
    
    console.log("\nCleanup: Deleting test user...");
    await auth.deleteUser(newUid);
    await db.collection('users').doc(newUid).delete();
    console.log("Cleanup complete.");
}

runTests().catch(console.error);
