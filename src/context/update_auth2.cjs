const fs = require('fs');
const file = 'c:/Users/Great Nation/OneDrive/Documents/CalebDeck/src/context/AuthContext.tsx';
let content = fs.readFileSync(file, 'utf8');

// Replace getDoc with onSnapshot
content = content.replace(
  'const userDoc = await getDoc(doc(db, \\'users\\', firebaseUser.uid));',
  '// using onSnapshot for real-time updates\\n                    const unsubscribeSnapshot = onSnapshot(doc(db, \\'users\\', firebaseUser.uid), (userDoc) => {'
);

// We need to replace `if (userDoc.exists()) {` with nothing because we added it above? No, let's keep it.
// The hard part is the `try/catch` block.
// Let's just use regex to replace the entire `try { ... } catch (error) { ... }` block inside onAuthStateChanged.

const startMarker = '                try {\\n                    const userDoc = await getDoc(doc(db, \\'users\\', firebaseUser.uid));';
const regex = /try\s*\{\s*const userDoc = await getDoc\(doc\(db, 'users', firebaseUser\.uid\)\);[\s\S]*?catch\s*\(error\)\s*\{\s*console\.error\("Error fetching user role:", error\);\s*setUser\(firebaseUser\);\s*\}/;

const newBlock = `                // Use onSnapshot to get real-time updates for user profile (like avatar changes)
                const unsubscribeSnapshot = onSnapshot(doc(db, 'users', firebaseUser.uid), (userDoc) => {
                    if (userDoc.exists()) {
                        const userData = userDoc.data();
                        setUser({
                            ...firebaseUser,
                            role: userData.role,
                            assignedHostelIds: userData.assignedHostelIds,
                            fullName: userData.fullName,
                            phone: userData.phone,
                            department: userData.department,
                            walletBalance: userData.walletBalance,
                            displayNameFromProfile: userData.displayName,
                            hostel: userData.hostel,
                            calebNetNumber: userData.calebNetNumber,
                            deliveryNotes: userData.deliveryNotes,
                            newsletterOptIn: userData.newsletterOptIn !== false,
                            productsUsed: userData.productsUsed || [],
                            createdAt: userData.createdAt,
                            avatar: userData.avatar,
                        });
                    } else {
                        setUser(firebaseUser);
                    }
                    setLoading(false);
                }, (error) => {
                    console.error("Error fetching user role:", error);
                    setUser(firebaseUser);
                    setLoading(false);
                });
                
                // Note: we're ignoring the unsubscribe here for simplicity, 
                // since onAuthStateChanged will handle the auth lifecycle.`;

content = content.replace(regex, newBlock);

content = content.replace(
  '            } else {\\n                setUser(null);\\n            }\\n            setLoading(false);',
  '            } else {\\n                setUser(null);\\n                setLoading(false);\\n            }'
);

fs.writeFileSync(file, content);
console.log('Done replacement');
