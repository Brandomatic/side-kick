import React, { useState, useContext, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { COLORS } from '../theme';
import { UserContext } from '../components/MyContexts';

// Firebase imports
import { getAuth, createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { auth, db } from "../lib/firebase";
import { setDoc, doc } from "firebase/firestore";

export default function RegisterScreen({ navigation }) {
  const [isLoading, setIsLoading] = useState(false);
  const {user, setUser} = useContext(UserContext);
  const [userDisplayName, setUserDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState({});

  // Effect to reset input fields
      useEffect(() => {
        const unsubscribe = navigation.addListener('focus', () => {
          setUserDisplayName('');
          setUser(null);
          setEmail('');
          setPassword('');
        })
        return () => unsubscribe;
      }, [navigation]);

    //Effect to switch to Main App
    useEffect(() => {
      if (user !== null) {
        console.log('Logged in with:', user.uid);
        console.log('Logged in with privilege:', user.privilege);
        navigation.navigate('Main', {

        });
      }
      console.log('Login first Register run');
    }, [user]);

  //Signup functions  
  const validate = () => {
    let sErrors = {};
    if (!email.includes('@')) sErrors.email = "Invalid email address";
    if (password.length < 6) sErrors.password = "Password must be at least 6 characters";
    
    setErrors(sErrors);
    console.log("Validation Errors:", sErrors);
    return Object.keys(sErrors).length === 0;
  };

  const handleRegister = () => {
    if (!validate()) return;

    // 1. Trigger the loading state
    setIsLoading(true);
    createUserWithEmailAndPassword(auth, email, password)
    .then(userCredentials => {
      //Success
      console.log('user created');
      let currentUser = auth.currentUser;
      updateProfile(currentUser, {displayName: userDisplayName, photoURL: 'https://imgur.com/EwXaZ49'})
        .then(() => {
          //Success
          console.log('profile updated', userDisplayName);
          let userData = {              
            privilege: 1,
            userEmail: currentUser.email,
            uid: currentUser.uid,
            userDisplayName: userDisplayName,
            userPhoto: 'https://imgur.com/EwXaZ49'
          };

          setDoc(doc(db, 'users', currentUser.uid), userData)
            .then(doc => {
              //Success
              console.log('userDoc created', userData.userDisplayName);
              setUser(userData);
              setIsLoading(false);
            }).catch((errorSetDoc) => {
              // An error occurred
              console.log('SetDoc error', errorSetDoc);
              alert(errorSetDoc.message)});
        
      }).catch((errorUpdate) => {
        // An error occurred
        console.log('errorUpdate', errorUpdate);
        alert(errorUpdate.message);
      });
    }).catch((errorCreate) => {
      // An error occurred
      setIsLoading(false);
      console.log('errorCreate', errorCreate);
      alert(errorCreate.message);
    });
    
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Join Side-Kick</Text>
      
      <TextInput style={styles.input} 
      placeholder="Full Name / Display Name"
      onChangeText={(userName) => setUserDisplayName(userName)}
      />

      <TextInput 
        style={[styles.input, errors.email && styles.inputError]} 
        placeholder="Email"
        keyboardType="email-address"
        onChangeText={(email) => {setEmail(email); setErrors({})}}
      />
      {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}

      <TextInput 
        style={[styles.input, errors.password && styles.inputError]} 
        placeholder="Password" 
        secureTextEntry 
        onChangeText={(password) => {setPassword(password); setErrors({})}}
      />
      {errors.password && <Text style={styles.errorText}>{errors.password}</Text>}

            <TouchableOpacity 
              style={[styles.button, isLoading && { opacity: 0.7 }]} // Dim button when loading
              onPress={handleRegister}
              disabled={isLoading} // Prevent double taps
            >
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