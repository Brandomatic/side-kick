import React, { createContext, useState, useEffect } from 'react';
import { auth, db } from "../lib/firebase";
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';

export const UserContext = createContext();

export const UserProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [currentCustomer, setCurrentCustomer] = useState({
    id: 'defaultCustomer',
    name: 'Rocanville Potash',
  });
  const [currentEquipment, setCurrentEquipment] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          // 1. Reference your user document using the UID
          const userDocRef = doc(db, 'users', firebaseUser.uid);
          const userDocSnap = await getDoc(userDocRef);

          if (userDocSnap.exists()) {
            const userData = userDocSnap.data();
            
            // 2. Map your specific labels (userDisplayName, etc.) to the context
            setUser({
              uid: firebaseUser.uid,
              email: firebaseUser.email,
              displayName: userData.userDisplayName || 'Technician',
              privilege: userData.privilege || 1,
              photo: userData.userPhoto || 'default'
            });
          } else {
            // Fallback if the doc doesn't exist yet
            setUser({
              uid: firebaseUser.uid,
              email: firebaseUser.email,
              displayName: 'New Tech'
            });
          }
        } catch (error) {
          console.error("Error fetching user profile:", error);
        }
      } else {
        setUser(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  return (
    <UserContext.Provider value={{ 
      user, 
      setUser,
      currentCustomer, 
      setCurrentCustomer,
      currentEquipment,
      setCurrentEquipment 
    }}>
      {!loading && children}
    </UserContext.Provider>
  );
};