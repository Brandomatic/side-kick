import React, { useEffect, useState, useContext } from 'react';
import { 
  View, Text, TextInput, TouchableOpacity, StyleSheet, Image, 
  Alert, ActivityIndicator, KeyboardAvoidingView, Platform, 
  TouchableWithoutFeedback, Keyboard // Added Keyboard
} from 'react-native';
import { UserContext } from '../components/MyContexts';
import { COLORS } from '../theme';
import { moderateScale } from '../utils/metrics';
import { PATHS } from '../utils/Paths';

// Firebase imports
import { auth, db } from "../lib/firebase";
import { signInWithEmailAndPassword } from "firebase/auth";
import { doc, getDoc } from 'firebase/firestore';

export default function LoginScreen({ navigation }) {
  const [isLoading, setIsLoading] = useState(false);
  const [isValidatingCompany, setIsValidatingCompany] = useState(false);
  const [isCompanyVerified, setIsCompanyVerified] = useState(false);
  
  const [companyId, setCompanyId] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  const { user, setUser } = useContext(UserContext);
  const [errors, setErrors] = useState({});

  // Reset inputs on focus
  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      setEmail('');
      setPassword('');
      setErrors({});
    });
    return unsubscribe;
  }, [navigation]);

  // Route to CustomerSelect once logged in
  useEffect(() => {
    if (user !== null) {
      setIsLoading(false);
      navigation.reset({
        index: 0,
        routes: [{ name: 'MainTabs' }],
      });
    }
  }, [user]);

  // --- STEP 1: VERIFY COMPANY ---
  const handleVerifyCompany = async () => {
    Keyboard.dismiss(); // Dismiss keyboard on button press
    const cleanID = companyId.trim().toUpperCase();
    if (!cleanID) {
      return Alert.alert("Error", "Please enter a company access code.");
    }

    setIsValidatingCompany(true);
    try {
      const companyRef = doc(db, PATHS.company(cleanID));
      const companySnap = await getDoc(companyRef);

      if (companySnap.exists()) {
        setIsCompanyVerified(true);
      } else {
        Alert.alert("Invalid Code", "That company code does not exist.");
      }
    } catch (error) {
      Alert.alert("Error", "Could not verify company at this time.");
    } finally {
      setIsValidatingCompany(false);
    }
  };

  // --- STEP 2: SIGN IN FUNCTIONS ---
  const validate = () => {
    let sErrors = {};
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail.includes('@')) sErrors.email = "Invalid email address";
    if (!password || password.trim().length === 0) sErrors.password = "Password is required";
    
    setErrors(sErrors);
    return Object.keys(sErrors).length === 0;
  };

  const getUserData = async (uid) => {
    try {
      const cleanID = companyId.trim().toUpperCase();
      const docRef = doc(db, PATHS.user(cleanID, uid));
      const userDoc = await getDoc(docRef);
      
      if (userDoc.exists()) {
        const docData = userDoc.data();
        setUser({
          ...docData,
          companyId: cleanID, 
        });
      } else {
        Alert.alert("Access Denied", "User record not found under this company code.");
        setIsLoading(false);
      }
    } catch (error) {
      Alert.alert("Error fetching profile", error.message);
      setIsLoading(false);
    }
  };

  const handleLogin = () => {
    Keyboard.dismiss(); // Dismiss keyboard on button press
    if (!validate()) return;
    setIsLoading(true);

    signInWithEmailAndPassword(auth, email, password)
      .then(userCredentials => {
        getUserData(userCredentials.user.uid);
      })
      .catch(errorSignIn => {
        setIsLoading(false);
        Alert.alert("Login Failed", "Invalid email or password for this company.");
      });
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
        style={styles.container}
      >
        <View style={styles.inner}>
          <Image source={require('../assets/icon.png')} style={styles.logo} />
          <Text style={styles.title}>SIDE-KICK</Text>

          {!isCompanyVerified ? (
            <View style={styles.card}>
              <View style={styles.titleRow}>
                <Text style={styles.cardTitle}>Company Access</Text>
                <TouchableOpacity 
                  onPress={() => Alert.alert(
                    "Company Access Code", 
                    "Unique 6-digit organization code. Contact your admin if you don't have it."
                  )}
                  style={styles.infoBtn}
                >
                  <Text style={styles.infoIcon}>ⓘ</Text> 
                </TouchableOpacity>
              </View>
              <TextInput 
                style={styles.input} 
                placeholder="Enter Company Code"
                placeholderTextColor="#999"
                autoCapitalize="characters"
                keyboardType="numeric"
                value={companyId}
                onChangeText={setCompanyId}
              />
              <TouchableOpacity 
                style={styles.button} 
                onPress={handleVerifyCompany} 
                disabled={isValidatingCompany}
              >
                {isValidatingCompany ? <ActivityIndicator color="#FFF" /> : <Text style={styles.buttonText}>Verify Company</Text>}
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

              <TextInput 
                style={[styles.input, errors.email && styles.inputError]} 
                placeholder="Email"
                keyboardType="email-address"
                value={email}
                onChangeText={(txt) => {setEmail(txt); setErrors({})}}
              />
              {errors.email && <Text style={styles.errorText}>{errors.email}</Text>}

              <TextInput 
                style={[styles.input, errors.password && styles.inputError]} 
                placeholder="Password" 
                secureTextEntry
                autoCapitalize="none"
                value={password}
                onChangeText={(txt) => {setPassword(txt); setErrors({})}}
              />
              {errors.password && <Text style={styles.errorText}>{errors.password}</Text>}

              <TouchableOpacity 
                style={[styles.button, (isLoading || !email || !password) && { opacity: 0.7 }]} 
                onPress={handleLogin}
                disabled={isLoading || !email || !password}
              >
                {isLoading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.buttonText}>Log In</Text>}
              </TouchableOpacity>
            </View>
          )}

          <TouchableOpacity 
            onPress={() => navigation.navigate('Register', { prefilledCode: companyId })} 
            style={styles.registerLink}
          >
            <Text style={styles.footerText}>Need a tech account? <Text style={styles.registerText}>Register</Text></Text>
          </TouchableOpacity>

          <TouchableOpacity 
            onPress={() => navigation.navigate('Company Registration')} 
            style={styles.companyRegLink}
          >
            <Text style={styles.goldText}>Register a new company</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  inner: { flex: 1, padding: moderateScale(30), justifyContent: 'center' },
  logo: { width: moderateScale(120), height: moderateScale(120), alignSelf: 'center', marginBottom: moderateScale(20), borderRadius: moderateScale(20) },
  title: { fontSize: moderateScale(28), fontWeight: 'bold', textAlign: 'center', color: COLORS.primary, marginBottom: moderateScale(40) },
  card: { backgroundColor: '#FFF', padding: moderateScale(20), borderRadius: moderateScale(16), elevation: 4 },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: moderateScale(15) },
  cardTitle: { fontSize: moderateScale(18), fontWeight: '700', color: '#333' },
  infoBtn: { padding: moderateScale(5) },
  infoIcon: { fontSize: moderateScale(20), color: COLORS.primary, fontWeight: 'bold' },
  input: { height: moderateScale(55), borderWidth: 1, borderColor: COLORS.primary, borderRadius: moderateScale(12), paddingHorizontal: moderateScale(15), marginBottom: moderateScale(10), fontSize: moderateScale(16), color: '#333' },
  inputError: { borderColor: 'red' },
  errorText: { color: 'red', fontSize: moderateScale(12), marginBottom: moderateScale(5), marginLeft: moderateScale(5) },
  button: { backgroundColor: COLORS.primary, height: moderateScale(55), borderRadius: moderateScale(12), alignItems: 'center', justifyContent: 'center', marginTop: moderateScale(10) },
  buttonText: { color: '#FFF', fontSize: moderateScale(18), fontWeight: '700' },
  verifiedRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: moderateScale(15), paddingBottom: moderateScale(10), borderBottomWidth: 1, borderBottomColor: '#EEE' },
  verifiedText: { fontSize: moderateScale(14), fontWeight: 'bold', color: '#2E7D32' },
  editText: { fontSize: moderateScale(14), color: COLORS.primary, textDecorationLine: 'underline' },
  registerLink: { marginTop: moderateScale(25), alignSelf: 'center' },
  footerText: { color: '#666', fontSize: moderateScale(14) },
  registerText: { color: COLORS.primary, fontSize: moderateScale(16), fontWeight: '700' },
  companyRegLink: { marginTop: moderateScale(20), alignSelf: 'center' },
  goldText: { color: '#EAB308', fontSize: moderateScale(15), fontWeight: '700', textDecorationLine: 'underline' }
});