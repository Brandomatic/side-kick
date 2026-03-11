import React, { useState, useContext, useEffect } from 'react';
import { 
  View, Text, TextInput, TouchableOpacity, StyleSheet, 
  Alert, ActivityIndicator, ScrollView, KeyboardAvoidingView, Platform 
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { COLORS } from '../theme';
import { moderateScale } from '../utils/metrics';
import { UserContext } from '../components/MyContexts';
import { PATHS } from '../utils/Paths';

// Firebase imports
import { createUserWithEmailAndPassword } from "firebase/auth";
import { auth, db } from "../lib/firebase";
import { setDoc, doc, getDoc } from "firebase/firestore";

export default function RegisterScreen({ navigation, route }) {
  const insets = useSafeAreaInsets();
  const { prefilledCode } = route.params || {};
  const { user, setUser } = useContext(UserContext);

  const [isLoading, setIsLoading] = useState(false);
  const [isValidatingCompany, setIsValidatingCompany] = useState(false);
  const [isCompanyVerified, setIsCompanyVerified] = useState(false);

  const [userDisplayName, setUserDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [companyId, setCompanyId] = useState(prefilledCode || '');
  const [errors, setErrors] = useState({});

  // Reset inputs on focus
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      setUserDisplayName('');
      setEmail('');
      setPassword('');
      setConfirmPassword('');
      setErrors({});
    });
    return unsubscribe;
  }, [navigation]);

  // Navigate once user context is set
  useEffect(() => {
    if (user !== null) {
      setIsLoading(false);
      navigation.reset({
        index: 0,
        routes: [{ name: 'MainTabs' }],
      });
    }
  }, [user]);

  // Handle prefilled code from Login
  useEffect(() => {
    if (prefilledCode) {
      handleAutoVerify(prefilledCode);
    }
  }, [prefilledCode]);

  const handleAutoVerify = async (code) => {
    setIsValidatingCompany(true);
    try {
      // Using PATHS.company logic
      const companyRef = doc(db, PATHS.company(code.trim().toUpperCase()));
      const companySnap = await getDoc(companyRef);
      
      if (companySnap.exists()) {
        setIsCompanyVerified(true);
      } else if (!prefilledCode) {
        Alert.alert("Invalid Code", "This company code does not exist.");
      }
    } catch (error) {
      console.error("Verification error", error);
    } finally {
      setIsValidatingCompany(false);
    }
  };

  const validate = () => {
    let sErrors = {};
    if (password.length < 6) sErrors.password = "Min 6 characters";
    if (password !== confirmPassword) sErrors.confirmPassword = "Passwords do not match";
    if (!email.includes('@')) sErrors.email = "Invalid email";
    
    setErrors(sErrors);
    return Object.keys(sErrors).length === 0;
  };

  const handleRegister = async () => {
    if (!validate()) return;
    setIsLoading(true);

    const cleanEmail = email.trim().toLowerCase();
    const cleanCID = companyId.trim().toUpperCase();

    try {
      const userCredentials = await createUserWithEmailAndPassword(auth, cleanEmail, password);
      const currentUser = userCredentials.user;

      const userData = {              
        uid: currentUser.uid,
        userEmail: cleanEmail,
        userDisplayName: userDisplayName,
        role: 'tech',            // Standard Technician role
        privilege: 1,           
        companyId: cleanCID,    
        userPhoto: "default",
        createdAt: new Date().toISOString()
      };

      // WRITE LOGIC: Using PATHS.user(companyId, uid)
      const userDocRef = doc(db, PATHS.user(cleanCID, currentUser.uid));
      await setDoc(userDocRef, userData);
      
      setUser(userData);
      
    } catch (error) {
      setIsLoading(false);
      Alert.alert("Registration Error", error.message);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
      <ScrollView contentContainerStyle={[styles.inner, { paddingTop: insets.top + 20 }]}>
        <Text style={styles.title}>Technician Join</Text>

        {!isCompanyVerified ? (
          <View style={styles.card}>
            <Text style={styles.sectionLabel}>Enter Company Access Code</Text>
            <TextInput 
              style={styles.input} 
              autoCapitalize="characters"
              placeholder="Code (e.g. AB1234)"
              value={companyId}
              onChangeText={setCompanyId}
            />
            <TouchableOpacity style={styles.button} onPress={() => handleAutoVerify(companyId)}>
               {isValidatingCompany ? <ActivityIndicator color="#FFF" /> : <Text style={styles.buttonText}>Verify</Text>}
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.card}>
             <View style={styles.verifiedRow}>
              <Text style={styles.verifiedText}>Company: {companyId.toUpperCase()}</Text>
              <TouchableOpacity onPress={() => setIsCompanyVerified(false)}>
                <Text style={styles.editText}>Change</Text>
              </TouchableOpacity>
            </View>

            <TextInput style={styles.input} placeholder="Full Name" onChangeText={setUserDisplayName} />
            <TextInput style={[styles.input, errors.email && styles.inputError]} placeholder="Email" keyboardType="email-address" autoCapitalize="none" onChangeText={(t) => setEmail(t)} />
            <TextInput style={[styles.input, errors.password && styles.inputError]} placeholder="Password" secureTextEntry onChangeText={(t) => setPassword(t)} />
            <TextInput style={[styles.input, errors.confirmPassword && styles.inputError]} placeholder="Confirm Password" secureTextEntry onChangeText={(t) => setConfirmPassword(t)} />

            <TouchableOpacity style={styles.button} onPress={handleRegister} disabled={isLoading}>
              {isLoading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.buttonText}>Register</Text>}
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  inner: { padding: moderateScale(25), flexGrow: 1, justifyContent: 'center' },
  title: { fontSize: moderateScale(28), fontWeight: 'bold', color: COLORS.primary, textAlign: 'center', marginBottom: moderateScale(30) },
  card: { backgroundColor: '#FFF', padding: moderateScale(20), borderRadius: moderateScale(16), elevation: 4 },
  sectionLabel: { fontSize: moderateScale(11), fontWeight: '800', color: COLORS.primary, marginBottom: moderateScale(10), textTransform: 'uppercase' },
  input: { height: moderateScale(55), borderWidth: 1, borderColor: '#B2BABB', backgroundColor: '#F8F9F9', borderRadius: moderateScale(12), paddingHorizontal: moderateScale(15), marginBottom: moderateScale(10), fontSize: moderateScale(16) },
  inputError: { borderColor: 'red' },
  errorText: { color: 'red', fontSize: moderateScale(12), marginBottom: moderateScale(5) },
  button: { backgroundColor: COLORS.primary, height: moderateScale(55), borderRadius: moderateScale(12), alignItems: 'center', justifyContent: 'center', marginTop: moderateScale(10) },
  buttonText: { color: '#FFF', fontSize: moderateScale(18), fontWeight: '700' },
  verifiedRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: moderateScale(20), paddingBottom: moderateScale(10), borderBottomWidth: 1, borderBottomColor: '#EEE' },
  verifiedText: { fontSize: moderateScale(14), fontWeight: 'bold', color: '#2E7D32' },
  editText: { fontSize: moderateScale(14), color: COLORS.primary, textDecorationLine: 'underline' }
});