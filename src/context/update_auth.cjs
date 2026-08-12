const fs = require('fs');
const file = 'c:/Users/Great Nation/OneDrive/Documents/CalebDeck/src/context/AuthContext.tsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  '    productsUsed?: string[];',
  '    productsUsed?: string[];\n    avatar?: string;'
);

content = content.replace(
  "import { doc, getDoc } from 'firebase/firestore';",
  "import { doc, getDoc, onSnapshot } from 'firebase/firestore';"
);

const oldBlock = `                try {
                    const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid));
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
                        });
                    } else {
                        // User authenticated but not in database (should not happen for pure admin/rider app, but safe fallback)
                        setUser(firebaseUser);
                    }
                } catch (error) {
                    console.error("Error fetching user role:", error);
                    setUser(firebaseUser);
                }`;

const newBlock = `                // Use onSnapshot to get real-time updates for user profile (like avatar changes)
                const unsubscribeSnapshot = onSnapshot(doc(db, 'users', firebaseUser.uid), (userDoc) => {
                    if (userDoc.exists()) {
                        const userData = userDoc.data();
                        setUser(prevUser => ({
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
                        }));
                    } else {
                        setUser(firebaseUser);
                    }
                    setLoading(false);
                }, (error) => {
                    console.error("Error fetching user role:", error);
                    setUser(firebaseUser);
                    setLoading(false);
                });
                
                // Return this to cleanup if needed, though onAuthStateChanged covers main unmounts
                return () => unsubscribeSnapshot();`;

content = content.replace(oldBlock, newBlock);

// Remove the old setLoading(false) which is now inside the snapshot callback
content = content.replace(
  `            } else {\n                setUser(null);\n            }\n            setLoading(false);`,
  `            } else {\n                setUser(null);\n                setLoading(false);\n            }`
);


fs.writeFileSync(file, content);
console.log('Done');
