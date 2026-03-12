import React, { useState, useEffect, useContext } from 'react';
import { 
  View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, 
  Modal, TextInput, ScrollView, Alert, KeyboardAvoidingView, Platform 
} from 'react-native';
import { Picker } from '@react-native-picker/picker'; 
import { UserContext } from '../components/MyContexts';
import { PATHS } from '../utils/Paths';
import { moderateScale } from '../utils/metrics'; 
import { db } from "../lib/firebase"; 
import { collection, getDocs, query, orderBy, addDoc } from 'firebase/firestore';
import { COLORS } from '../theme';

const CustomerSelectScreen = () => {
  const { user, setCurrentCustomer } = useContext(UserContext);
  
  const [customers, setCustomers] = useState([]);
  const [selectedCust, setSelectedCust] = useState(null);
  const [loading, setLoading] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);

  // New Customer State
  const [custName, setCustName] = useState('');
  const [custLoc, setCustLoc] = useState('');
  const [custNumSites, setCustNumSites] = useState('');
  const [custContactName, setCustContactName] = useState('');
  const [custContactEmail, setCustContactEmail] = useState('');

  const fetchCustomers = async () => {
    if (!user?.companyId) return;
    setLoading(true);
    try {
      const customersRef = collection(db, PATHS.customers(user.companyId));
      const q = query(customersRef, orderBy("custName", "asc"));
      const querySnapshot = await getDocs(q);
      
      const custList = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      
      setCustomers(custList);
    } catch (error) {
      console.error("Firebase Error: ", error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, [user?.companyId]);

  const handleAddCustomer = async () => {
    if (!custName || !custLoc) return Alert.alert("Missing Info", "Name and Location are required.");
    
    setLoading(true);
    try {
      const customersRef = collection(db, PATHS.customers(user.companyId));
      await addDoc(customersRef, {
        custName,
        custLoc,
        custNumSites,
        custContactName,
        custContactEmail,
        createdAt: new Date().toISOString(),
        createdBy: user.uid
      });
      
      setModalVisible(false);
      setCustName(''); setCustLoc(''); setCustNumSites(''); setCustContactName(''); setCustContactEmail('');
      await fetchCustomers();
    } catch (error) {
      Alert.alert("Error", "Could not save customer.");
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = () => {
    if (!selectedCust) return;
    const customerData = customers.find(c => c.id === selectedCust);
    
    setCurrentCustomer({
      id: selectedCust,
      path: PATHS.customer(user.companyId, selectedCust),
      ...customerData 
    });
  };

  if (loading && customers.length === 0) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Select Customer Site</Text>
      
      <View style={styles.pickerContainer}>
        <Picker
          selectedValue={selectedCust}
          onValueChange={(itemValue) => setSelectedCust(itemValue)}
          style={styles.picker}
        >
          <Picker.Item label="Select a customer..." value={null} color="#999" />
          {customers.map(cust => (
            <Picker.Item key={cust.id} label={cust.custName} value={cust.id} color="#1A1A1A" />
          ))}
        </Picker>
      </View>

      <TouchableOpacity 
        style={[styles.confirmBtn, !selectedCust && styles.disabledBtn]} 
        onPress={handleConfirm}
        disabled={!selectedCust}
      >
        <Text style={styles.btnText}>PROCEED TO DASHBOARD</Text>
      </TouchableOpacity>

      <TouchableOpacity style={styles.addLink} onPress={() => setModalVisible(true)}>
        <Text style={styles.addLinkText}>+ Add New Customer</Text>
      </TouchableOpacity>

      <Modal visible={modalVisible} animationType="slide" transparent={true}>
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <Text style={styles.modalTitle}>New Customer</Text>
              
              <TextInput 
                style={styles.input} 
                placeholder="Customer Name" 
                placeholderTextColor="#9BA4A5"
                value={custName} 
                onChangeText={setCustName} 
              />
              <TextInput 
                style={styles.input} 
                placeholder="Location (City, State/Province)" 
                placeholderTextColor="#9BA4A5"
                value={custLoc} 
                onChangeText={setCustLoc} 
              />
              <TextInput 
                style={styles.input} 
                placeholder="# of Sites" 
                placeholderTextColor="#9BA4A5"
                keyboardType="numeric" 
                value={custNumSites} 
                onChangeText={setCustNumSites} 
              />
              
              <Text style={styles.sectionLabel}>Contact Details</Text>
              <TextInput 
                style={styles.input} 
                placeholder="Contact Person" 
                placeholderTextColor="#9BA4A5"
                value={custContactName} 
                onChangeText={setCustContactName} 
              />
              <TextInput 
                style={styles.input} 
                placeholder="Contact Email" 
                placeholderTextColor="#9BA4A5"
                keyboardType="email-address" 
                autoCapitalize="none" 
                value={custContactEmail} 
                onChangeText={setCustContactEmail} 
              />

              <TouchableOpacity style={styles.saveBtn} onPress={handleAddCustomer}>
                <Text style={styles.btnText}>SAVE CUSTOMER</Text>
              </TouchableOpacity>
              
              <TouchableOpacity style={styles.cancelBtn} onPress={() => setModalVisible(false)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: moderateScale(25), justifyContent: 'center', backgroundColor: COLORS.background },
  title: { fontSize: moderateScale(22), fontWeight: '800', marginBottom: moderateScale(30), textAlign: 'center', color: '#1A1A1A' },
  pickerContainer: { borderWidth: 1, borderColor: '#E0E0E0', borderRadius: moderateScale(12), marginBottom: moderateScale(20), backgroundColor: '#F9F9F9' },
  picker: { width: '100%', color: '#1A1A1A' },
  confirmBtn: { backgroundColor: COLORS.primary, paddingVertical: moderateScale(18), borderRadius: moderateScale(12), alignItems: 'center' },
  disabledBtn: { backgroundColor: '#CCC' },
  btnText: { color: '#FFF', fontWeight: 'bold', fontSize: moderateScale(16), letterSpacing: 1 },
  addLink: { marginTop: moderateScale(25), alignSelf: 'center' },
  addLinkText: { color: COLORS.primary, fontWeight: '700', fontSize: moderateScale(15) },
  
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#FFF', borderTopLeftRadius: moderateScale(20), borderTopRightRadius: moderateScale(20), padding: moderateScale(25), maxHeight: '90%' },
  modalTitle: { fontSize: moderateScale(20), fontWeight: 'bold', marginBottom: moderateScale(20), color: COLORS.primary },
  sectionLabel: { fontSize: moderateScale(12), fontWeight: 'bold', color: '#666', marginTop: moderateScale(10), marginBottom: moderateScale(5), textTransform: 'uppercase' },
  input: { 
    height: moderateScale(50), 
    borderWidth: 1, 
    borderColor: COLORS.primary, 
    borderRadius: moderateScale(10), 
    paddingHorizontal: moderateScale(15), 
    marginBottom: moderateScale(15), 
    fontSize: moderateScale(16),
    color: '#1A1A1A',
    backgroundColor: '#FFF'
  },
  saveBtn: { backgroundColor: COLORS.primary, paddingVertical: moderateScale(15), borderRadius: moderateScale(10), alignItems: 'center', marginTop: moderateScale(10) },
  cancelBtn: { paddingVertical: moderateScale(15), alignItems: 'center' },
  cancelBtnText: { color: '#666', fontWeight: '600' }
});

export default CustomerSelectScreen;