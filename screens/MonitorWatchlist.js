import React, { useState, useEffect, useContext } from 'react';
import { 
  View, 
  Text, 
  FlatList, 
  StyleSheet, 
  TouchableOpacity, 
  ActivityIndicator, 
  Modal, 
  TextInput, 
  KeyboardAvoidingView, 
  Platform,
  Alert 
} from 'react-native';
import { UserContext } from '../components/MyContexts';
import { db, auth } from '../lib/firebase';
import { 
  writeBatch, 
  doc, 
  collection, 
  serverTimestamp, 
  onSnapshot, 
  query, 
  orderBy 
} from 'firebase/firestore';
import { moderateScale } from '../utils/metrics';
import { COLORS } from '../theme';
import { Ionicons } from '@expo/vector-icons';

export default function MonitorWatchlistScreen({ navigation }) {
  const { currentCustomer, user } = useContext(UserContext);
  
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const [selectedItem, setSelectedItem] = useState(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [resolutionDetails, setResolutionDetails] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // 1. Listen for active monitor items at this tenant's site
  useEffect(() => {
    // ✅ Updated to use the hierarchical path
    if (!currentCustomer?.path) return;

    const q = query(
      collection(db, `${currentCustomer.path}/activeMonitorItems`),
      orderBy('date', 'desc')
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const monitorData = snapshot.docs.map(doc => ({ 
        id: doc.id, 
        ...doc.data() 
      }));
      setItems(monitorData);
      setLoading(false);
    }, (err) => {
      console.error("Monitor Listener Error:", err);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [currentCustomer?.path]);

  const handleOpenResolve = (item) => {
    setSelectedItem(item);
    setModalVisible(true);
  };

  // 2. The Atomic Swap: Clear from active, Log to Crane, Log to Dashboard
  const processResolution = async () => {
    if (!selectedItem || !resolutionDetails.trim() || !currentCustomer?.path) return;

    setIsSubmitting(true);
    const batch = writeBatch(db);

    // ✅ New Paths: Targeting the tenant sub-collections
    const globalMonitorRef = doc(db, `${currentCustomer.path}/activeMonitorItems/${selectedItem.id}`);
    
    // Path for the specific crane inside the tenant assets
    const craneMonitorRef = doc(db, `${currentCustomer.path}/assets/custProfile/cranes/${selectedItem.unitID}/activeMonitorItems/${selectedItem.id}`);
    
    // Permanent Crane Service Log
    const logRef = doc(collection(db, `${currentCustomer.path}/assets/custProfile/cranes/${selectedItem.unitID}/serviceLogs`));
    
    // Global Tenant Dashboard Feed
    const activityRef = doc(collection(db, `${currentCustomer.path}/recentActivity`));

    // DELETE Operations (Clean up the "Watchlist")
    batch.delete(globalMonitorRef);
    batch.delete(craneMonitorRef);

    // SET Operations (Create the history)
    batch.set(logRef, {
      serviceID: logRef.id,
      logType: "Monitor Resolved",
      compDesc: selectedItem.compDesc,
      initialDiagnosisDate: selectedItem.date, 
      initialDiagnosisDetails: selectedItem.details,
      resolvedDate: serverTimestamp(),
      resolvedDetails: resolutionDetails,
      resolvedByName: user?.userDisplayName || 'Technician',
      resolvedByUid: auth.currentUser?.uid,
      unitID: selectedItem.unitID,
      monitorID: selectedItem.id 
    });

    batch.set(activityRef, {
      activityID: activityRef.id,
      type: "Repair",
      title: `${selectedItem.unitID}: ${selectedItem.compDesc}`,
      subtitle: resolutionDetails,
      timestamp: serverTimestamp(),
      techName: user?.userDisplayName || 'Tech',
      unitID: selectedItem.unitID
    });

    try {
      await batch.commit();
      setModalVisible(false);
      setSelectedItem(null);
      setResolutionDetails('');
      Alert.alert("Success", "Issue resolved and logged.");
    } catch (error) {
      console.error("Monitor Resolution Batch failed: ", error);
      Alert.alert("Error", "Could not save resolution.");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) return <View style={styles.center}><ActivityIndicator size="large" color={COLORS.primary} /></View>;

  return (
    <View style={styles.container}>
      <FlatList
        data={items}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listPadding}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <View style={styles.unitBadge}>
                <Text style={styles.unitText}>UNIT {item.unitID}</Text>
              </View>
              <Text style={styles.dateText}>
                {item.date?.toDate ? item.date.toDate().toLocaleDateString() : 'Recent'}
              </Text>
            </View>

            <Text style={styles.compTitle}>{item.compDesc}</Text>
            <Text style={styles.detailsText}>{item.details}</Text>
            
            <View style={styles.footer}>
              <Text style={styles.techName}>Logged by: {item.userDisplayName}</Text>
              <TouchableOpacity 
                style={styles.resolveBtn}
                onPress={() => handleOpenResolve(item)}
              >
                <Ionicons name="checkmark-circle" size={18} color="#FFF" />
                <Text style={styles.resolveBtnText}>RESOLVE</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="shield-checkmark-outline" size={60} color="#CCC" />
            <Text style={styles.emptyText}>All systems clear at {currentCustomer?.custName}</Text>
          </View>
        }
      />

      <Modal visible={modalVisible} animationType="slide" transparent={true}>
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Resolve Monitor Status</Text>

            <View style={styles.contextBox}>
              <Text style={styles.label}>ORIGINAL FINDING ({selectedItem?.unitID}):</Text>
              <Text style={styles.originalText}>{selectedItem?.compDesc}</Text>
              <Text style={styles.originalDetails}>{selectedItem?.details}</Text>
            </View>

            <Text style={styles.inputLabel}>Work Performed / Resolution</Text>
            <TextInput
              style={styles.textInput}
              placeholder="Describe what was done..."
              placeholderTextColor="#999"
              multiline
              value={resolutionDetails}
              onChangeText={setResolutionDetails}
            />

            <View style={styles.buttonRow}>
              <TouchableOpacity 
                style={styles.cancelBtn} 
                onPress={() => { setModalVisible(false); setResolutionDetails(''); }}
              >
                <Text style={styles.cancelText}>CANCEL</Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.confirmBtn, (!resolutionDetails.trim() || isSubmitting) && styles.disabledBtn]} 
                onPress={processResolution}
                disabled={!resolutionDetails.trim() || isSubmitting}
              >
                {isSubmitting ? (
                  <ActivityIndicator color="#FFF" />
                ) : (
                  <Text style={styles.confirmText}>COMPLETE & LOG</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F4F7F6' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  listPadding: { padding: moderateScale(15) },
  card: { 
    backgroundColor: '#FFF', 
    borderRadius: moderateScale(12), 
    padding: moderateScale(15), 
    marginBottom: moderateScale(15),
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 4
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  unitBadge: { backgroundColor: '#333', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 },
  unitText: { color: '#FFF', fontSize: 10, fontWeight: 'bold' },
  dateText: { fontSize: 11, color: '#999' },
  compTitle: { fontSize: moderateScale(16), fontWeight: '700', color: '#1A1A1A' },
  detailsText: { fontSize: moderateScale(14), color: '#666', marginTop: 5, lineHeight: 20 },
  footer: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    marginTop: 15, 
    paddingTop: 10, 
    borderTopWidth: 1, 
    borderTopColor: '#F0F0F0' 
  },
  techName: { fontSize: 11, color: '#AAA', fontStyle: 'italic' },
  resolveBtn: { 
    flexDirection: 'row', 
    backgroundColor: '#2E7D32', 
    paddingHorizontal: 12, 
    paddingVertical: 8, 
    borderRadius: 6, 
    alignItems: 'center' 
  },
  resolveBtnText: { color: '#FFF', fontWeight: 'bold', fontSize: 12, marginLeft: 5 },
  emptyState: { alignItems: 'center', marginTop: 100 },
  emptyText: { color: '#999', marginTop: 10, fontSize: 16 },
  
  // Modal Styles
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: moderateScale(20) },
  modalContent: { backgroundColor: '#FFF', borderRadius: moderateScale(16), padding: moderateScale(20) },
  modalTitle: { fontSize: moderateScale(18), fontWeight: '800', color: '#333', marginBottom: moderateScale(15), textAlign: 'center' },
  contextBox: { backgroundColor: '#F5F7F9', padding: moderateScale(12), borderRadius: moderateScale(8), marginBottom: moderateScale(20), borderLeftWidth: 4, borderLeftColor: COLORS.primary },
  label: { fontSize: moderateScale(10), fontWeight: '800', color: '#888', marginBottom: 4 },
  originalText: { fontSize: moderateScale(14), fontWeight: '700', color: '#333' },
  originalDetails: { fontSize: moderateScale(13), color: '#666', marginTop: 4, fontStyle: 'italic' },
  inputLabel: { fontSize: moderateScale(12), fontWeight: '700', color: '#333', marginBottom: 8 },
  textInput: { borderWidth: 1, borderColor: '#E0E0E0', borderRadius: moderateScale(8), padding: moderateScale(12), height: moderateScale(100), textAlignVertical: 'top', fontSize: moderateScale(14), marginBottom: moderateScale(20) },
  buttonRow: { flexDirection: 'row', justifyContent: 'flex-end', alignItems: 'center' },
  cancelBtn: { paddingHorizontal: moderateScale(20) },
  cancelText: { color: '#888', fontWeight: '700', fontSize: moderateScale(14) },
  confirmBtn: { backgroundColor: '#2E7D32', paddingVertical: moderateScale(12), paddingHorizontal: moderateScale(20), borderRadius: moderateScale(8), minWidth: moderateScale(100), alignItems: 'center' },
  disabledBtn: { backgroundColor: '#CCC' },
  confirmText: { color: '#FFF', fontWeight: 'bold', fontSize: moderateScale(14) }
});