import React, { useState } from 'react';
import { 
  View, Text, TextInput, TouchableOpacity, StyleSheet, 
  ScrollView, Alert, ActivityIndicator, KeyboardAvoidingView, Platform 
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons'; 
import { auth, db } from "../lib/firebase";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { doc, writeBatch } from 'firebase/firestore';
import { moderateScale } from '../utils/metrics';
import { COLORS } from '../theme';
import { PATHS } from '../utils/Paths';

export default function CompanyRegistration({ navigation }) {
  const insets = useSafeAreaInsets();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [generatedCode, setGeneratedCode] = useState('');

  // Primary Admin State
  const [companyName, setCompanyName] = useState('');
  const [companyLoc, setCompanyLoc] = useState('');
  const [adminName, setAdminName] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [adminConfirmPassword, setAdminConfirmPassword] = useState('');
  
  // Extra Admins State
  const [extraAdmins, setExtraAdmins] = useState([]); 

  const handleBackToLogin = () => {
    navigation.reset({
      index: 0,
      routes: [{ name: 'Login' }],
    });
  };

  const addAdminField = () => {
    if (extraAdmins.length < 2) {
      setExtraAdmins([...extraAdmins, { name: '', email: '', password: '', confirmPassword: '' }]);
    } else {
      Alert.alert("Limit Reached", "You can only add up to 2 additional admins.");
    }
  };

  const updateExtraAdmin = (index, field, value) => {
    const newAdmins = [...extraAdmins];
    newAdmins[index][field] = value;
    setExtraAdmins(newAdmins);
  };

  const removeExtraAdmin = (index) => {
    setExtraAdmins(extraAdmins.filter((_, i) => i !== index));
  };

  const validateUser = (email, password, confirm, name) => {
    const cleanEmail = email.trim().toLowerCase();
    if (!name.trim()) return "Full Name is required.";
    if (!cleanEmail.includes('@')) return "Invalid email address.";
    if (password.length < 6) return "Password must be at least 6 characters.";
    if (!/\d/.test(password)) return "Password needs at least one number.";
    if (password !== confirm) return "Passwords do not match!";
    return null; 
  };

  const handleRegisterCompany = async () => {
    const primaryError = validateUser(adminEmail, adminPassword, adminConfirmPassword, adminName);
    if (primaryError) return Alert.alert("Primary Admin Error", primaryError);
    if (!companyName || !companyLoc) return Alert.alert("Missing Info", "Please enter company details.");

    for (let i = 0; i < extraAdmins.length; i++) {
      const extraError = validateUser(extraAdmins[i].email, extraAdmins[i].password, extraAdmins[i].confirmPassword, extraAdmins[i].name);
      if (extraError) return Alert.alert(`Admin ${i + 2} Error`, extraError);
    }

    setLoading(true);
    const batch = writeBatch(db);
    const companyCode = Math.floor(100000 + Math.random() * 900000).toString();
    
    try {
      const adminsToCreate = [
        { name: adminName, email: adminEmail, password: adminPassword, priv: 'super' },
        ...extraAdmins.map(a => ({ ...a, priv: 'admin' }))
      ];

      for (const admin of adminsToCreate) {
        const userCred = await createUserWithEmailAndPassword(auth, admin.email.trim().toLowerCase(), admin.password);
        const uid = userCred.user.uid;

        const userRef = doc(db, PATHS.user(companyCode, uid));
        batch.set(userRef, {
          uid: uid,
          userEmail: admin.email.trim().toLowerCase(),
          userDisplayName: admin.name,
          role: 'admin',
          privilege: admin.priv,
          companyId: companyCode,
          userPhoto: "default",
          createdAt: new Date().toISOString()
        });
      }

      const initialTokens = {};
      for (let i = 1; i <= 6; i++) {
        const tKey = `SK-${Math.random().toString(36).substring(2, 7).toUpperCase()}`; 
        initialTokens[tKey] = { status: 'available', usedBy: null, createdAt: new Date().toISOString() };
      }

      const companyRef = doc(db, PATHS.company(companyCode));
      batch.set(companyRef, {
        companyName,
        companyLoc,
        companyCode,
        tokenCount: 6,
        tokens: initialTokens,
        createdAt: new Date().toISOString(),
      });

      await batch.commit();
      setGeneratedCode(companyCode);
      setSuccess(true);
    } catch (error) {
      Alert.alert("Registration Error", error.message);
    } finally {
      setLoading(false);
    }
  };

  const EmailDisclaimer = () => (
    <View style={styles.infoBox}>
      <Ionicons name="information-circle-outline" size={16} color="#004A99" />
      <Text style={styles.infoText}>
        This email will be used for professional reports. We recommend a workplace address.
      </Text>
    </View>
  );

  if (success) {
    return (
      <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
        <View style={styles.successCard}>
          <Text style={styles.successTitle}>Company Registered!</Text>
          <Text style={styles.successText}>Access Code:</Text>
          <View style={styles.codeBox}><Text style={styles.codeDisplay}>{generatedCode}</Text></View>
          <Text style={styles.warningText}>Keep this code private. Techs need it to join.</Text>
          <TouchableOpacity style={styles.primaryBtn} onPress={handleBackToLogin}>
            <Text style={styles.btnText}> BACK TO LOGIN </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.container}>
      <ScrollView contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 20, paddingBottom: insets.bottom + 20 }]}>
        
        {/* Header with Back Button */}
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={handleBackToLogin} style={styles.backBtn}>
            <Ionicons name="arrow-back" size={26} color={COLORS.primary} />
          </TouchableOpacity>
          <Text style={styles.title}>Register Company</Text>
          <View style={{ width: 26 }} /> 
        </View>
        
        <View style={styles.card}>
          <Text style={styles.sectionLabel}>Organization Details</Text>
          <TextInput style={styles.input} placeholder="Company Name" value={companyName} onChangeText={setCompanyName} />
          <TextInput style={styles.input} placeholder="Location (City, State)" value={companyLoc} onChangeText={setCompanyLoc} />

          <Text style={styles.sectionLabel}>Primary Admin</Text>
          <TextInput style={styles.input} placeholder="Full Name" value={adminName} onChangeText={setAdminName} />
          <TextInput style={styles.input} placeholder="Work Email" keyboardType="email-address" autoCapitalize="none" value={adminEmail} onChangeText={setAdminEmail} />
          
          <EmailDisclaimer />

          <TextInput style={[styles.input, { marginTop: moderateScale(10) }]} placeholder="Password" secureTextEntry value={adminPassword} onChangeText={setAdminPassword} />
          <TextInput style={styles.input} placeholder="Confirm Password" secureTextEntry value={adminConfirmPassword} onChangeText={setAdminConfirmPassword} />

          {extraAdmins.map((admin, index) => (
            <View key={index} style={styles.extraAdminWrapper}>
              <View style={styles.adminHeader}>
                <Text style={styles.sectionLabel}>Additional Admin {index + 2}</Text>
                <TouchableOpacity onPress={() => removeExtraAdmin(index)}>
                  <Text style={styles.removeText}>REMOVE</Text>
                </TouchableOpacity>
              </View>
              <TextInput style={styles.input} placeholder="Full Name" value={admin.name} onChangeText={(v) => updateExtraAdmin(index, 'name', v)} />
              <TextInput style={styles.input} placeholder="Work Email" keyboardType="email-address" autoCapitalize="none" value={admin.email} onChangeText={(v) => updateExtraAdmin(index, 'email', v)} />
              
              <EmailDisclaimer />

              <TextInput style={[styles.input, { marginTop: moderateScale(10) }]} placeholder="Password" secureTextEntry value={admin.password} onChangeText={(v) => updateExtraAdmin(index, 'password', v)} />
              <TextInput style={styles.input} placeholder="Confirm Password" secureTextEntry value={admin.confirmPassword} onChangeText={(v) => updateExtraAdmin(index, 'confirmPassword', v)} />
            </View>
          ))}

          {extraAdmins.length < 2 && (
            <TouchableOpacity style={styles.addBtn} onPress={addAdminField}>
              <Text style={styles.addBtnText}>+ ADD ANOTHER ADMIN ({extraAdmins.length}/2)</Text>
            </TouchableOpacity>
          )}

          <TouchableOpacity style={[styles.primaryBtn, loading && { opacity: 0.7 }]} onPress={handleRegisterCompany} disabled={loading}>
            {loading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.btnText}>CREATE COMPANY</Text>}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.background },
  scroll: { padding: moderateScale(20) },
  headerRow: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    marginBottom: moderateScale(25) 
  },
  backBtn: { padding: moderateScale(5) },
  title: { 
    fontSize: moderateScale(24), 
    fontWeight: 'bold', 
    color: COLORS.primary, 
    textAlign: 'center', 
    flex: 1 
  },
  card: { backgroundColor: '#FFF', padding: moderateScale(20), borderRadius: moderateScale(16), elevation: 4 },
  input: { 
    height: moderateScale(50), 
    borderWidth: 1, 
    borderColor: COLORS.primary, 
    backgroundColor: '#F8F9F9', 
    borderRadius: moderateScale(10), 
    paddingHorizontal: moderateScale(15), 
    marginBottom: moderateScale(12), 
    color: '#2C3E50', 
    fontSize: moderateScale(16)
  },
  sectionLabel: { 
    fontSize: moderateScale(12), 
    fontWeight: '900', 
    color: COLORS.primary, 
    marginTop: moderateScale(18), 
    marginBottom: moderateScale(8), 
    textTransform: 'uppercase',
    letterSpacing: 1
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: '#EBF5FF',
    padding: moderateScale(10),
    borderRadius: moderateScale(8),
    marginBottom: moderateScale(5),
    alignItems: 'center',
  },
  infoText: {
    fontSize: moderateScale(10),
    color: '#004A99',
    marginLeft: moderateScale(8),
    flex: 1,
    lineHeight: moderateScale(14)
  },
  extraAdminWrapper: { marginTop: 15, paddingTop: 15, borderTopWidth: 1, borderTopColor: '#F0F0F0' },
  adminHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  removeText: { color: '#D32F2F', fontSize: moderateScale(10), fontWeight: 'bold' },
  addBtn: { padding: 15, alignItems: 'center', marginTop: 10, borderStyle: 'dashed', borderWidth: 1, borderColor: COLORS.primary, borderRadius: 10 },
  addBtnText: { color: COLORS.primary, fontWeight: 'bold', fontSize: moderateScale(12) },
  primaryBtn: { backgroundColor: COLORS.primary, height: moderateScale(55), borderRadius: moderateScale(10), alignItems: 'center', justifyContent: 'center', marginTop: moderateScale(20) },
  btnText: { color: '#FFF', fontWeight: 'bold', fontSize: moderateScale(16) },
  successCard: { flex: 1, justifyContent: 'center', padding: moderateScale(30), alignItems: 'center' },
  successTitle: { fontSize: moderateScale(24), fontWeight: 'bold', color: '#2E7D32', marginBottom: moderateScale(10) },
  successText: { fontSize: moderateScale(16), color: '#666' },
  codeBox: { backgroundColor: '#F0F0F0', padding: moderateScale(20), borderRadius: moderateScale(15), marginVertical: moderateScale(25), width: '100%', alignItems: 'center' },
  codeDisplay: { fontSize: moderateScale(36), fontWeight: '900', letterSpacing: 5, color: '#1A1A1A' },
  warningText: { color: '#D32F2F', textAlign: 'center', fontWeight: 'bold', marginBottom: moderateScale(10), fontSize: moderateScale(14) }
});