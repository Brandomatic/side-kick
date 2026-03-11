import React, { useContext, useState, useEffect, useMemo } from 'react';
import { 
  Modal, View, Text, StyleSheet, ScrollView, 
  TouchableOpacity, TextInput, Switch, ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getStatusColor } from '../../utils/MyHelperFunctions';
import { moderateScale } from '../../utils/metrics';
import { COLORS } from '../../theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// --- PHASE 2: FINDINGS REVIEW ---
export const FindingsReviewModal = ({ visible, onClose, items, callDetails, onUpdateDetail, onProceed }) => {
  const insets = useSafeAreaInsets();

  return (
    <Modal visible={visible} animationType="slide">
      {/* 1. Use padding instead of SafeAreaView per your requirement */}
      <View style={[styles.modalContainer, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
        <View style={styles.modalHeader}>
          <TouchableOpacity onPress={onClose}><Ionicons name="close" size={28} /></TouchableOpacity>
          <Text style={styles.modalTitle}>Technical Findings</Text>
          <View style={{ width: 28 }} />
        </View>

        <ScrollView contentContainerStyle={styles.scrollPadding}>
          <Text style={styles.helperText}>Provide part details for items requiring attention.</Text>
          
          {items.map((item) => (
            <View key={item.id} style={styles.card}>
              <View style={styles.cardHeader}>
                {/* 3. Prepend Section Name to Label (e.g. Hoist : Brake) */}
                <Text style={styles.cardLabel}>
                  {item.sectionName} : {item.label}
                </Text>
                <Text style={[styles.statusBadge, { color: getStatusColor(item.status) }]}>
                  {item.status === 'MONITOR' ? 'MONITORING' : item.status}
                </Text>
              </View>

              {/* 2. Added placeholderTextColor for better visibility */}
              <TextInput 
                style={styles.input} 
                placeholder="Part Model / Type" 
                placeholderTextColor="#999" 
                value={callDetails[item.id]?.model}
                onChangeText={(val) => onUpdateDetail(item.id, 'model', val)}
              />
              <TextInput 
                style={styles.input} 
                placeholder="Serial Number" 
                placeholderTextColor="#999" 
                value={callDetails[item.id]?.serial}
                onChangeText={(val) => onUpdateDetail(item.id, 'serial', val)}
              />
            </View>
          ))}
        </ScrollView>
        <TouchableOpacity style={styles.primaryBtn} onPress={onProceed}>
          <Text style={styles.btnText}>NEXT: CUSTOMER REPORT</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
};

// --- PHASE 3: CUSTOMER REPORT ---
export const CustomerReportModal = ({ visible, onClose, items, reportNotes, onUpdateNote, onProceed }) => {
  const insets = useSafeAreaInsets();

  return (
    <Modal visible={visible} animationType="slide">
      <View style={[styles.modalContainer, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
        <View style={styles.modalHeader}>
          <TouchableOpacity onPress={onClose}><Ionicons name="chevron-back" size={28} /></TouchableOpacity>
          <Text style={styles.modalTitle}>Customer Summary</Text>
          <View style={{ width: 28 }} />
        </View>

        <ScrollView contentContainerStyle={styles.scrollPadding}>
          <Text style={styles.helperText}>Summarize the findings for the client report.</Text>
          
          {items.map((item) => {
          // Logic: Use polished note if Brandon has typed one, 
          // otherwise default to the Phase 1 Raw/Voice notes.
          const displayValue = reportNotes[item.id] !== undefined 
            ? reportNotes[item.id] 
            : (item.notes || "");

          return (
            <View key={item.id} style={styles.card}>
              <View style={styles.cardHeader}>
                <Text style={styles.cardLabel}>{item.sectionName} : {item.label}</Text>
              </View>
              
              <TextInput 
                style={[styles.input, { height: moderateScale(100), textAlignVertical: 'top' }]} 
                multiline 
                placeholder="Enter professional summary..."
                placeholderTextColor="#999"
                // This 'value' prop ensures the Phase 1 notes are there by default
                value={displayValue} 
                onChangeText={(val) => onUpdateNote(item.id, val)}
              />
            </View>
          );
        })}
        </ScrollView>

        <TouchableOpacity style={styles.primaryBtn} onPress={onProceed}>
          <Text style={styles.btnText}>NEXT: TEAM & LABOR</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
};

// --- PHASE 4: LABOR & LOGISTICS ---
export const LaborModal = ({ visible, onClose, techLogs, onUpdateLogs, onProceed }) => {
  // Use insets for padding as per our container rule
  const insets = useSafeAreaInsets();

  const addTechnician = () => {
    onUpdateLogs([...techLogs, { id: new Date().toISOString(), name: '', hours: '' }]);
  };

  const removeTechnician = (id) => {
    onUpdateLogs(techLogs.filter(tech => tech.id !== id));
  };

  const updateTech = (index, field, value) => {
    const updated = [...techLogs];
    updated[index][field] = value;
    onUpdateLogs(updated);
  };

  return (
    <Modal visible={visible} animationType="slide">
      <View style={[styles.modalContainer, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
        
        {/* Header */}
        <View style={styles.modalHeader}>
          <TouchableOpacity onPress={onClose}>
            <Ionicons name="close" size={28} color="#333" />
          </TouchableOpacity>
          <Text style={styles.modalTitle}>Team & Labor</Text>
          <TouchableOpacity onPress={addTechnician} style={styles.headerAction}>
            <Text style={styles.addTechText}>Add</Text>
            <Ionicons name="person-add" size={22} color={COLORS.primary} />
          </TouchableOpacity>
        </View>

        <ScrollView contentContainerStyle={styles.scrollPadding}>
          <Text style={styles.helperText}>Record hours for everyone on site.</Text>
          
          {techLogs.map((log, index) => (
            <View key={log.id} style={styles.laborCard}>
              <View style={styles.laborHeaderRow}>
                <Text style={styles.cardLabel}>
                  {index === 0 ? "Lead Technician" : `Assistant ${index}`}
                </Text>
                {index !== 0 && (
                  <TouchableOpacity onPress={() => removeTechnician(log.id)} style={styles.removeTechBtn}>
                    <Ionicons name="trash-outline" size={18} color="#FF5252" />
                  </TouchableOpacity>
                )}
              </View>

              <Text style={styles.laborLabel}>Full Name</Text>
              <TextInput 
                style={styles.input} 
                placeholder="Technician Name" 
                value={log.name} 
                onChangeText={(val) => updateTech(index, 'name', val)}
              />

              <View style={{ marginTop: moderateScale(10) }}>
                <Text style={styles.laborLabel}>Hours Worked</Text>
                <TextInput 
                  style={styles.input} 
                  placeholder="0.0" 
                  keyboardType="numeric"
                  value={log.hours}
                  onChangeText={(val) => updateTech(index, 'hours', val)}
                />
              </View>
            </View>
          ))}
        </ScrollView>

        {/* Footer Action */}
        <TouchableOpacity style={styles.primaryBtn} onPress={onProceed}>
          <Text style={styles.btnText}>REVIEW & SUBMIT</Text>
        </TouchableOpacity>
        
      </View>
    </Modal>
  );
};

export const FinalReviewModal = ({ visible, onClose, data, onSubmit, isSubmitting }) => {
  const insets = useSafeAreaInsets();
  
  return (
    <Modal visible={visible} animationType="slide">
      <View style={[styles.modalContainer, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
        <View style={styles.modalHeader}>
          <TouchableOpacity onPress={onClose}><Ionicons name="chevron-back" size={28} /></TouchableOpacity>
          <Text style={styles.modalTitle}>Final Review</Text>
          <View style={{ width: 28 }} />
        </View>

        <ScrollView contentContainerStyle={styles.scrollPadding}>
          <Text style={styles.sectionHeader}>Technicians</Text>
          {data.techLogs.map(t => (
            <Text key={t.id} style={styles.reviewText}>{t.name}: {t.hours} hrs</Text>
          ))}

          <Text style={[styles.sectionHeader, { marginTop: 20 }]}>Findings Summary</Text>
          {data.pendingItems.map(item => (
            <View key={item.id} style={styles.reviewCard}>
              <Text style={styles.cardLabel}>{item.sectionName}: {item.label}</Text>
              <Text style={styles.reviewSubText}>Status: {item.status}</Text>
              <Text style={styles.reviewSubText}>Note: {data.reportNotes[item.id] || "No note provided"}</Text>
            </View>
          ))}
        </ScrollView>

        <TouchableOpacity 
          style={[
            styles.primaryBtn, 
            { backgroundColor: isSubmitting ? '#9E9E9E' : '#2E7D32' }
          ]} 
          onPress={onSubmit}
          disabled={isSubmitting} // Disable interaction
        >
          {isSubmitting ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={styles.btnText}>SUBMIT TO OFFICE</Text>
          )}
        </TouchableOpacity>
      </View>
    </Modal>
  );
};

export const ResolutionModal = ({ visible, item, onClose, onResolve }) => {
  const [repairNotes, setRepairNotes] = useState('');

  return (
    <Modal visible={visible} transparent animationType="slide">
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Resolve Finding</Text>
          <Text style={styles.modalSubTitle}>{item?.unitId} - {item?.compDesc}</Text>
          
          <TextInput
            style={styles.modalInput}
            placeholder="Describe the resolution (e.g., 'Adjusted limit switch')"
            multiline
            value={repairNotes}
            onChangeText={setRepairNotes}
          />

          <View style={styles.modalButtons}>
            <TouchableOpacity onPress={onClose} style={[styles.btn, styles.cancelBtn]}>
              <Text style={styles.btnText}>Cancel</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              onPress={() => onResolve(item, repairNotes)} 
              style={[styles.btn, styles.confirmBtn]}
            >
              <Text style={styles.btnText}>Submit Resolution</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  // --- EXISTING MODAL STYLES ---
  modalContainer: { flex: 1, backgroundColor: '#F8F9FA' },
  modalHeader: { 
    height: moderateScale(70), 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    paddingHorizontal: moderateScale(20), 
    backgroundColor: '#FFF', 
    borderBottomWidth: 1, 
    borderBottomColor: '#EEE',
    paddingTop: moderateScale(20)
  },
  modalTitle: { fontSize: moderateScale(18), fontWeight: 'bold' },
  scrollPadding: { padding: moderateScale(20) },
  helperText: { fontSize: moderateScale(13), color: '#666', marginBottom: moderateScale(20) },
  card: { backgroundColor: '#FFF', padding: moderateScale(15), borderRadius: moderateScale(12), marginBottom: moderateScale(15), elevation: 2 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: moderateScale(10) },
  cardLabel: { fontWeight: 'bold', fontSize: moderateScale(15) },
  statusBadge: { fontWeight: '800', fontSize: moderateScale(12) },
  input: { borderBottomWidth: 1, borderBottomColor: '#EEE', paddingVertical: moderateScale(8), marginBottom: moderateScale(10), fontSize: moderateScale(14) },
  primaryBtn: { backgroundColor: '#1A1A1A', margin: moderateScale(20), padding: moderateScale(18), borderRadius: moderateScale(12), alignItems: 'center' },
  btnText: { color: '#FFF', fontWeight: 'bold', fontSize: moderateScale(14) },
  sectionHeader: { fontSize: moderateScale(16), fontWeight: '800', color: '#333' },
  reviewText: { fontSize: moderateScale(14), color: '#444', marginVertical: 2 },
  reviewCard: { borderLeftWidth: 4, borderLeftColor: COLORS.primary, paddingLeft: 10, marginVertical: 10 },
  reviewSubText: { fontSize: moderateScale(12), color: '#666', fontStyle: 'italic' },
  
  // --- LABOR / TECH LOG STYLES ---
  laborCard: {
    backgroundColor: '#FFF',
    padding: moderateScale(15),
    borderRadius: moderateScale(12),
    marginBottom: moderateScale(15),
    borderWidth: 1,
    borderColor: '#EEE',
  },
  laborHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: moderateScale(12),
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    paddingBottom: moderateScale(8)
  },
  laborLabel: {
    fontSize: moderateScale(12),
    fontWeight: '700',
    color: COLORS.primary,
    marginBottom: moderateScale(4),
    textTransform: 'uppercase'
  },
  removeTechBtn: { padding: moderateScale(4) },
  addTechText: {
    fontSize: moderateScale(14),
    fontWeight: 'bold',
    color: COLORS.primary,
    marginRight: moderateScale(5)
  },
  headerAction: { flexDirection: 'row', alignItems: 'center' },

  // --- NEW RESOLUTION MODAL STYLES (CENTERED OVERLAY) ---
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: moderateScale(20),
  },
  modalContent: {
    width: '100%',
    backgroundColor: '#FFFFFF',
    borderRadius: moderateScale(16),
    padding: moderateScale(24),
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
  },
  modalSubTitle: {
    fontSize: moderateScale(14),
    color: '#666',
    marginBottom: moderateScale(20),
    fontStyle: 'italic',
  },
  modalInput: {
    backgroundColor: '#F8F9FA',
    borderRadius: moderateScale(10),
    padding: moderateScale(15),
    height: moderateScale(120),
    textAlignVertical: 'top',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    fontSize: moderateScale(15),
    color: '#333',
    marginBottom: moderateScale(20),
  },
  modalButtons: {
  flexDirection: 'row',
  justifyContent: 'space-between',
  marginTop: moderateScale(20),
},
btn: {
  flex: 0.48, // Give them almost half width each
  padding: moderateScale(12),
  borderRadius: moderateScale(8),
  alignItems: 'center',
},
cancelBtn: { backgroundColor: '#EEE' },
confirmBtn: { backgroundColor: COLORS.primary },
});