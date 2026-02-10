import React, { useEffect, useState, useContext } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Image, Alert, ActivityIndicator } from 'react-native';
import { UserContext } from '../components/MyContexts';
import { COLORS } from '../theme';
import { Ionicons } from '@expo/vector-icons';

// Firebase imports
import { auth, db } from "../lib/firebase";
import { signInWithEmailAndPassword } from "firebase/auth";
import { doc, getDoc } from 'firebase/firestore';

import { authPersist } from "../lib/firebase";

export default function LoginScreen({ navigation }) {
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const {user, setUser} = useContext(UserContext);
  const [userData, setUserData] = useState(null);
  const [errors, setErrors] = useState({});

  // Effect to reset input fields
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      setUser(null);
      setEmail('');
      setPassword('');
    })
    return () => unsubscribe;
  }, [navigation]);

  //Effect to switch to internal app navigation
  useEffect(() => {
    if (user !== null) {
      console.log('Logged in with:', user.uid);
      console.log('Logged in with privilege:', user.privilege);
      setIsLoading(false);
      navigation.navigate('Main', {

      });
    } else if (userData !== null) {
      console.log('Setting user from userData:', userData);
      setUser(userData); 
    }
    setIsLoading(false);
  }, [user, userData]);

  // SIGN IN FUNCTIONS
  const validate = () => {
    let sErrors = {};
    if (!email.includes('@')) sErrors.email = "Invalid email address";
    if (password.length < 6) sErrors.password = "Password must be at least 6 characters";
    
    setErrors(sErrors);
    console.log("Validation Errors:", sErrors);
    return Object.keys(sErrors).length === 0;
  };

  const getUserData = () => {
    let currentUser = auth.currentUser;
    let docRef = doc(db, 'users', currentUser.uid);
    getDoc(docRef)
    .then((doc) => {
      let docData = doc.data();
      let tempUserData = {
        privilege: docData.privilege,
        userEmail: docData.userEmail,
        uid: docData.uid,
        userDisplayName: docData.userDisplayName,
        userPhoto: docData.userPhoto,
      }
      setUserData(tempUserData);
    }).catch((errorGetDoc) => {
      console.log('in getDoc error');
      alert(errorGetDoc.message);        
    });
    
  };

  const handleLogin = () => {
    if (!validate()) return;

    // 1. Trigger the loading state
    setIsLoading(true);
    //Firebase signin function
    signInWithEmailAndPassword(auth, email, password)
      .then(userCredentials => {
        getUserData();
      })
      .catch(errorSignIn => {
        setIsLoading(false);
        console.log('in signIn error')
        alert(errorSignIn.message)
      });
  };

  return (
    <View style={styles.container}>      

      <Image source={require('../assets/icon.png')} style={styles.logo} />

      <Text style={styles.title}>SIDE-KICK</Text>

      <TextInput 
        style={[styles.input, errors.email && styles.inputError]} 
        placeholder="Email"
        keyboardType="email-address"
        onChangeText={(txt) => {setEmail(txt); setErrors({})}}
      />
      {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}

      <TextInput 
        style={[styles.input, errors.password && styles.inputError]} 
        placeholder="Password" 
        secureTextEntry 
        onChangeText={(txt) => {setPassword(txt); setErrors({})}}
      />
      {errors.password && <Text style={styles.errorText}>{errors.password}</Text>}

      <TouchableOpacity 
        style={[styles.button, isLoading && { opacity: 0.7 }]} // Dim button when loading
        onPress={handleLogin}
        disabled={isLoading} // Prevent double taps
      >
        {isLoading ? (
          <ActivityIndicator color="#FFFFFF" /> 
        ) : (
          <Text style={styles.buttonText}>Log In</Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity 
        onPress={() => navigation.navigate('Register')} 
        style={styles.registerLink}>
          <Text style={styles.footerText}>Don't have an account? <Text style={styles.registerText}>Register</Text>
          </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background, padding: 30, justifyContent: 'center', alignContent: 'center' },
  title: { fontSize: 28, fontWeight: 'bold', textAlign: 'center', color: COLORS.primary, marginBottom: 60 },
  input: { height: 55, borderWidth: 1, borderColor: '#DDD', borderRadius: 12, paddingHorizontal: 15, marginBottom: 10, marginTop: 5 },
  inputError: { borderColor: 'red' },
  errorText: { color: 'red', fontSize: 12, marginBottom: 5, marginLeft: 5 },
  button: { backgroundColor: COLORS.primary, height: 55, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginTop: 5 },
  buttonText: { color: '#FFF', fontSize: 18, fontWeight: '700' },
  logo: {
    width: 180,    // Set a specific size for your login screen logo
    height: 180,
    alignSelf: 'center',
    marginBottom: 60,
    borderRadius: 20, // Optional: gives your logo rounded corners
  },
  registerLink: {
    marginTop: 25,
    alignSelf: 'center',
  },
  footerText: {
    color: '#666',
    fontSize: 14,
  },
  registerText: {
    color: COLORS.primary,
    fontSize: 16,
    fontWeight: '700',
  },
});