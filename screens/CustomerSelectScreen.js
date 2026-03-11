import React, { useState, useEffect, useContext } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator } from 'react-native';
import { Picker } from '@react-native-picker/picker'; 
import { UserContext } from '../components/MyContexts';
import { moderateScale } from '../utils/metrics'; 
import { db } from "../lib/firebase"; 
import { collection, getDocs, query, orderBy } from 'firebase/firestore';
import { COLORS } from '../theme';

const CustomerSelectScreen = () => {
  const { user, setCurrentCustomer } = useContext(UserContext);
  
  const [customers, setCustomers] = useState([]);
  const [selectedCust, setSelectedCust] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCustomers = async () => {
      if (!user?.companyId) {
        console.error("No Company ID found in user context.");
        setLoading(false);
        return;
      }

      try {
        // ✅ Updated Pathing: Querying customers specific to this company
        const customersRef = collection(db, "companies", user.companyId, "customers");
        const q = query(customersRef, orderBy("custName", "asc"));
        const querySnapshot = await getDocs(q);
        
        const custList = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        
        setCustomers(custList);
      } catch (error) {
        console.error("Firebase Error: ", error.code, error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchCustomers();
  }, [user?.companyId]);

  const handleConfirm = () => {
    if (!selectedCust) return;
    
    const customerData = customers.find(c => c.id === selectedCust);
    
    // ✅ Updated Path: Reflects the new tenant structure
    setCurrentCustomer({
      id: selectedCust,
      name: customerData.custName, 
      location: customerData.custLocation,
      path: `companies/${user.companyId}/customers/${selectedCust}`,
      ...customerData 
    });
  };

  if (loading) {
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
            <Picker.Item 
              key={cust.id} 
              label={cust.custName}
              value={cust.id} 
              color="#1A1A1A"
            />
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
    </View>
  );
};

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    padding: moderateScale(25), 
    justifyContent: 'center', 
    backgroundColor: COLORS.background || '#FFF' 
  },
  title: { 
    fontSize: moderateScale(22), 
    fontWeight: '800', 
    marginBottom: moderateScale(30), 
    textAlign: 'center',
    color: '#1A1A1A'
  },
  pickerContainer: { 
    borderWidth: 1, 
    borderColor: '#E0E0E0', 
    borderRadius: moderateScale(12), 
    marginBottom: moderateScale(40),
    backgroundColor: '#F9F9F9',
    justifyContent: 'center',
    minHeight: moderateScale(60), // Adjusted for better touch target
  },
  picker: {
    width: '100%',
    color: '#1A1A1A',
  },
  confirmBtn: { 
    backgroundColor: COLORS.primary || '#007AFF', 
    paddingVertical: moderateScale(18), 
    borderRadius: moderateScale(12), 
    alignItems: 'center',
    elevation: 4,
    shadowColor: COLORS.primary || '#007AFF',
    shadowOffset: { width: 0, height: moderateScale(4) },
    shadowOpacity: 0.2,
    shadowRadius: moderateScale(5),
  },
  disabledBtn: {
    backgroundColor: '#CCC',
    elevation: 0,
    shadowOpacity: 0
  },
  btnText: { 
    color: '#FFF', 
    fontWeight: 'bold', 
    fontSize: moderateScale(16),
    letterSpacing: 1
  }
});

export default CustomerSelectScreen;