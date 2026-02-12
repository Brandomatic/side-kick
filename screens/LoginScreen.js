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
  const [errors, setErrors] = useState({});

  // Effect to reset input fields
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      setEmail('');
      setPassword('');
    })
    return () => unsubscribe;
  }, [navigation]);

  //Effect to switch to internal app navigation
  useEffect(() => {
    if (user !== null) {
      setIsLoading(false);
      navigation.reset({
      index: 0,
      routes: [{ name: 'MainTabs' }],
    });
      console.log('Logged in with:', user.uid);
      console.log('Logged in with privilege:', user.privilege);
    };
  }, [user]);

  // SIGN IN FUNCTIONS
  const validate = () => {
    let sErrors = {};

    // Check if the email exists and is in a valid format
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail.includes('@')) sErrors.email = "Invalid email address";

    // Check if the password exists and isn't just whitespace
    if (!password || password.trim().length === 0) {
      sErrors.password = "Password is required";
    }
    
    setErrors(sErrors);
    console.log("Validation Errors:", sErrors);
    return Object.keys(sErrors).length === 0;
  };

  const getUserData = async (uid) => {
    try {
      const docRef = doc(db, 'users', uid);
      const userDoc = await getDoc(docRef);
      
      if (userDoc.exists()) {
        const docData = userDoc.data();
        const tempUserData = {
          privilege: docData.privilege,
          userEmail: docData.userEmail,
          uid: docData.uid,
          userDisplayName: docData.userDisplayName,
          userPhoto: docData.userPhoto,
        };
        setUser(tempUserData); // Set global context directly
      } else {
        console.log("No such document in Firestore!");
      }
    } catch (error) {
      alert("Error fetching profile: " + error.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = () => {
    if (!validate()) return;

    // 1. Trigger the loading state
    setIsLoading(true);
    //Firebase signin function
    signInWithEmailAndPassword(auth, email, password)
      .then(userCredentials => {
        getUserData(userCredentials.user.uid);
      })
      .catch(errorSignIn => {
        setIsLoading(false);
        console.log('Login Error Code:', errorSignIn.code);

        let userFriendlyMessage = "An unexpected error occurred. Please try again.";

        // Group common credential errors for security
        if (
          errorSignIn.code === 'auth/user-not-found' || 
          errorSignIn.code === 'auth/wrong-password' || 
          errorSignIn.code === 'auth/invalid-credential' ||
          errorSignIn.code === 'auth/invalid-email'
        ) {
          userFriendlyMessage = "Invalid email or password. Please check your credentials.";
        } else if (errorSignIn.code === 'auth/too-many-requests') {
          userFriendlyMessage = "Too many failed attempts. Please try again later.";
        } else if (errorSignIn.code === 'auth/network-request-failed') {
          userFriendlyMessage = "Network error. Please check your internet connection.";
        }

        Alert.alert("Login Failed", userFriendlyMessage);
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
        returnKeyType="next"
        onChangeText={(email) => {setEmail(email); setErrors({})}}
      />
      {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}

      <TextInput 
        style={[styles.input, errors.password && styles.inputError]} 
        placeholder="Password" 
        secureTextEntry
        autoCapitalize="none"
        returnKeyType="done"
        onChangeText={(txt) => {setPassword(txt); setErrors({})}}
      />
      {errors.password && <Text style={styles.errorText}>{errors.password}</Text>}

      <TouchableOpacity 
      style={[
        styles.button, 
        // This adds 70% opacity when loading
        isLoading && { opacity: 0.7 },
        // This adds 50% opacity if fields are empty (Optional but nice)
        (!email || !password) && { opacity: 0.5 } 
        ]} 
        onPress={handleLogin}
        // Prevent clicking while loading or empty
        disabled={isLoading || !email || !password}>
        {/* Show loading spinner when isLoading is true, otherwise show "Log In" text */}
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