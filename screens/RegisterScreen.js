import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { COLORS } from '../theme';
import { WIPIcon } from '../components/WIPIcon';

export default function RegisterScreen({ navigation }) {
  const [isLoading, setIsLoading] = useState(false);
  const [userName, setUserName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState({});

  
  const validate = () => {
    let sErrors = {};
    if (!email.includes('@')) sErrors.email = "Invalid email address";
    if (password.length < 6) sErrors.password = "Password must be at least 6 characters";
    
    setErrors(sErrors);
    return Object.keys(sErrors).length === 0;
  };

  const handleRegister = () => {    
    if (!validate()) return;

    setIsLoading(true);
  
    // Simulate registration delay
    setTimeout(() => {
      setIsLoading(false);
      alert("Account Created!");
      navigation.navigate('Main');
    }, 2000);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Join Side-Kick</Text>
      
      <TextInput style={styles.input} 
      placeholder="Full Name" 
      onChangeText={(txt) => setUserName(txt)}
      />

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