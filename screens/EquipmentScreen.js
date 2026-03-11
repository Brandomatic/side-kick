import React, { useContext, useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity, 
  FlatList, 
  ActivityIndicator,
  StatusBar 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// MODULAR FIREBASE IMPORTS
import { collection, onSnapshot } from "firebase/firestore"; 
import { auth, db } from "../lib/firebase";

import { UserContext } from '../components/MyContexts';
import { moderateScale } from '../utils/metrics';
import { COLORS } from '../theme';

export default function EquipmentScreen({ navigation }) {
  const { currentCustomer, user, setCurrentEquipment } = useContext(UserContext);
  const [loading, setLoading] = useState(true);
  const [cranes, setCranes] = useState([]);

  useEffect(() => {
    // ✅ Logic updated: Use the full path from context
    if (!currentCustomer?.path) {
      setLoading(false);
      return;
    }
    
    // Path: companies/{companyId}/customers/{customerId}/cranes
    // (Note: Adjusted to point to the 'cranes' sub-collection within your tenant path)
    const craneRef = collection(db, currentCustomer.path, 'cranes');

    const unsubscribe = onSnapshot(craneRef, (snapshot) => {
      const craneData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));
      
      setCranes(craneData);
      setLoading(false);
    }, (error) => {
      console.error("Equipment Sync Error:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [currentCustomer?.path]); // Depend on the path for re-syncs

  const handleSelectEquipment = (item) => {
    setCurrentEquipment(item);
    navigation.navigate('EquipmentDetail');
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={COLORS.primary || "#1A1A1A"} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />
      
      <View style={styles.subHeader}>
        <Text style={styles.customerText}>
          {currentCustomer?.name || 'Select Customer'}
        </Text>
      </View>

      <FlatList
        data={cranes}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        renderItem={({ item }) => (
          <TouchableOpacity 
            style={styles.equipmentCard}
            onPress={() => handleSelectEquipment(item)}
          >
            <View style={styles.cardInfo}>
              <View style={styles.iconBox}>
                <Ionicons name="construct" size={moderateScale(22)} color="#444" />
              </View>
              <View>
                <Text style={styles.unitIdText}>{item.unitId || 'Unknown Unit'}</Text>
                <Text style={styles.specText}>
                  {item.specs?.hoistType || 'No Type'} • {item.specs?.capacity || '0 Ton'}
                </Text>
              </View>
            </View>
            <Ionicons name="chevron-forward" size={moderateScale(20)} color="#CCC" />
          </TouchableOpacity>
        )}
        
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconCircle}>
              <Ionicons name="layers-outline" size={moderateScale(60)} color="#DDD" />
            </View>
            <Text style={styles.emptyTitle}>No Equipment Found</Text>
            <Text style={styles.emptySubtext}>
              No units registered for {currentCustomer?.name}. Add a crane to begin.
            </Text>
            <TouchableOpacity 
              style={styles.primaryAddBtn}
              onPress={() => navigation.navigate('AddEquipment')}
            >
              <Text style={styles.primaryAddBtnText}>Add First Crane</Text>
            </TouchableOpacity>
          </View>
        }
      />

      {cranes.length > 0 && (
        <TouchableOpacity 
          style={styles.fab} 
          onPress={() => {
            setCurrentEquipment(null);
            navigation.navigate('AddEquipment')
          }}
        >
          <Ionicons name="add" size={moderateScale(32)} color="#FFF" />
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#F4F7F6' 
  },
  loadingContainer: { 
    flex: 1, 
    justifyContent: 'center', 
    alignItems: 'center' 
  },
  subHeader: {
    paddingHorizontal: moderateScale(20),
    paddingTop: moderateScale(20),
    paddingBottom: moderateScale(10),
    backgroundColor: '#F4F7F6',
  },
  customerText: { 
    fontSize: moderateScale(24), 
    fontWeight: 'bold', 
    color: '#1A1A1A' 
  },
  listContent: { 
    flexGrow: 1,
    padding: moderateScale(20),
    paddingBottom: moderateScale(120) 
  },
  equipmentCard: {
    backgroundColor: '#FFF',
    padding: moderateScale(15),
    borderRadius: moderateScale(16),
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: moderateScale(12),
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: moderateScale(8),
    shadowOffset: { width: 0, height: 2 }
  },
  cardInfo: { 
    flexDirection: 'row', 
    alignItems: 'center' 
  },
  iconBox: {
    width: moderateScale(45),
    height: moderateScale(45),
    borderRadius: moderateScale(12),
    backgroundColor: '#F0F0F0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: moderateScale(15)
  },
  unitIdText: { 
    fontSize: moderateScale(18), 
    fontWeight: 'bold', 
    color: '#1A1A1A' 
  },
  specText: { 
    fontSize: moderateScale(13), 
    color: '#666', 
    marginTop: moderateScale(2) 
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: moderateScale(80),
  },
  emptyIconCircle: {
    width: moderateScale(120),
    height: moderateScale(120),
    borderRadius: moderateScale(60),
    backgroundColor: '#EAEAEA',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: moderateScale(20)
  },
  emptyTitle: { 
    fontSize: moderateScale(20), 
    fontWeight: 'bold', 
    color: '#333' 
  },
  emptySubtext: { 
    fontSize: moderateScale(14), 
    color: '#999', 
    textAlign: 'center', 
    marginTop: moderateScale(10),
    paddingHorizontal: moderateScale(40)
  },
  primaryAddBtn: {
    backgroundColor: '#1A1A1A',
    paddingVertical: moderateScale(16),
    paddingHorizontal: moderateScale(40),
    borderRadius: moderateScale(12),
    marginTop: moderateScale(30),
  },
  primaryAddBtnText: { 
    color: '#FFF', 
    fontWeight: 'bold', 
    fontSize: moderateScale(16) 
  },
  fab: {
    position: 'absolute',
    bottom: moderateScale(30), 
    right: moderateScale(25),
    width: moderateScale(65),
    height: moderateScale(65),
    borderRadius: moderateScale(32.5),
    backgroundColor: '#1A1A1A',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
  },
});