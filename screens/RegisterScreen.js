import React, { useState, useContext, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { COLORS } from '../theme';
import { UserContext } from '../components/MyContexts';

// Firebase imports
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { auth, db } from "../lib/firebase";
import { setDoc, doc } from "firebase/firestore";

export default function RegisterScreen({ navigation }) {
  const [isLoading, setIsLoading] = useState(false);
  const {user, setUser} = useContext(UserContext);
  const [userDisplayName, setUserDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [errors, setErrors] = useState({});

  // Effect to reset input fields
      useEffect(() => {
        const unsubscribe = navigation.addListener('focus', () => {
          setUserDisplayName('');
          setEmail('');
          setPassword('');
          setConfirmPassword('');
          setErrors({});
        })
        return () => unsubscribe;
      }, [navigation]);

  //Effect to switch to internal app navigation
  useEffect(() => {
    if (user !== null) {
      setIsLoading(false);
      navigation.reset({
      index: 0,
      routes: [{ name: 'Main' }],
    });
      console.log('Logged in with:', user.uid);
      console.log('Logged in with privilege:', user.privilege);
    };
  }, [user]);

  //Signup functions  
  const validate = () => {
    let sErrors = {};
    const cleanEmail = email.trim().toLowerCase();

    if (!cleanEmail.includes('@')) sErrors.email = "Invalid email address";
    
    // Password checks
    if (password.length < 6) {
      sErrors.password = "Password must be at least 6 characters";
    } else if (!/\d/.test(password)) {
      // Check if it contains at least one number
      sErrors.password = "Password needs at least one number";
    } else if (password === "123456" || password === "password") {
      sErrors.password = "This password is too common!";
    } else if (password !== confirmPassword) {
      sErrors.confirmPassword = "Passwords do not match!";
    }

    setErrors(sErrors);
    return Object.keys(sErrors).length === 0;
  };

  const handleRegister = async () => {
  if (!validate()) return;

  const cleanEmail = email.trim().toLowerCase();
  setIsLoading(true);

  try {
    // 1. Create the Auth User
    const userCredentials = await createUserWithEmailAndPassword(auth, cleanEmail, password);
    const currentUser = userCredentials.user;
    console.log('User created:', currentUser.uid);

    const userData = {              
      privilege: 1,
      userEmail: cleanEmail, // use local state for speed
      uid: currentUser.uid,
      userDisplayName: userDisplayName,
      userPhoto: "default"
    };

    await setDoc(doc(db, 'users', currentUser.uid), userData);
    console.log('User data saved to Firestore:', userData);
    
    // 3. Finalize
    setUser(userData);
    
  } catch (error) {
    setIsLoading(false);
    console.error('Registration Error:', error.code);
    
    // Custom error messages for users
    if (error.code === 'auth/email-already-in-use') {
      alert("That email is already registered!");
    } else {
      alert(error.message);
    }
  }};

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Join Side-Kick</Text>
      
      <TextInput style={styles.input} 
      placeholder="Full Name / Display Name"
      returnKeyType="next"
      onChangeText={(userName) => setUserDisplayName(userName)}
      />

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
        returnKeyType="next"
        onChangeText={(password) => {setPassword(password); setErrors({})}}
      />
      {errors.password && <Text style={styles.errorText}>{errors.password}</Text>}

      <TextInput 
        style={[styles.input, errors.confirmPassword && styles.inputError]}
        placeholder="Confirm Password" 
        secureTextEntry
        autoCapitalize="none" 
        returnKeyType="done"
        onChangeText={(passwordConfirm) => {setConfirmPassword(passwordConfirm); setErrors({})}}
      />
      {errors.confirmPassword && <Text style={styles.errorText}>{errors.confirmPassword}</Text>}

      <TouchableOpacity 
        style={[
          styles.button, 
          // This adds 70% opacity when loading
          isLoading && { opacity: 0.7 },
          // This adds 50% opacity if fields are empty (Optional but nice)
          (!email || !password) && { opacity: 0.5 } 
          ]} 
          onPress={handleRegister}
          // Prevent clicking while loading or empty
          disabled={isLoading || !email || !password}>
          {/* Show loading spinner when isLoading is true, otherwise show "Register" text */}
          {isLoading ? (
            <ActivityIndicator color="#FFFFFF" /> 
          ) : (
            <Text style={styles.buttonText}>Register</Text>
          )}
        </TouchableOpacity>

      <TouchableOpacity onPress={() => navigation.goBack()} style={styles.link}>
        <Text style={styles.linkText}>Already have an account? Log In</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background, padding: 30, justifyContent: 'center', alignContent: 'center' },
  title: { fontSize: 28, fontWeight: 'bold', color: COLORS.primary, marginBottom: 60 },
  input: { height: 55, borderWidth: 1, borderColor: '#DDD', borderRadius: 12, paddingHorizontal: 15, marginBottom: 10, marginTop: 5  },
  inputError: { borderColor: 'red' },
  errorText: { color: 'red', fontSize: 12, marginBottom: 5, marginLeft: 10 },
  button: { backgroundColor: COLORS.primary, height: 55, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginTop: 5 },
  buttonText: { color: '#FFF', fontSize: 18, fontWeight: '700' },
  link: { marginTop: 20 },
  linkText: { color: COLORS.primary, fontWeight: '600' }
});