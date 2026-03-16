import React, { useContext, useState, useEffect, useMemo } from 'react';
import { 
  Modal, View, Text, StyleSheet, ScrollView, 
  TouchableOpacity, TextInput, Switch, ActivityIndicator, KeyboardAvoidingView, Platform, TouchableWithoutFeedback, Keyboard
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
      <KeyboardAvoidingView 
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={[styles.modalContainer, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
            
            <View style={styles.modalHeader}>
              <TouchableOpacity onPress={onClose}>
                <Ionicons name="close" size={moderateScale(28)} color="#333" />
              </TouchableOpacity>
              <Text style={styles.modalTitle}>Technical Findings</Text>
              <View style={{ width: moderateScale(28) }} />
            </View>

            <ScrollView 
              contentContainerStyle={styles.reviewScrollPadding} 
              keyboardShouldPersistTaps="handled"
            >
              <Text style={styles.helperText}>Provide part details for items requiring attention.</Text>
              
              {items.map((item) => (
                <View key={item.id} style={styles.reviewCard}>
                  <View style={styles.cardHeader}>
                    <Text style={styles.cardLabel}>
                      {item.sectionName} : {item.label}
                    </Text>
                    <Text style={[styles.statusBadge, { color: getStatusColor(item.status) }]}>
                      {item.status === 'MONITOR' ? 'MONITORING' : item.status}
                    </Text>
                  </View>

                  <TextInput 
                    style={styles.reviewInput} 
                    placeholder="Part Model / Type" 
                    placeholderTextColor="#999" 
                    value={callDetails[item.id]?.model}
                    onChangeText={(val) => onUpdateDetail(item.id, 'model', val)}
                    returnKeyType="next"
                  />
                  <TextInput 
                    style={styles.reviewInput} 
                    placeholder="Serial Number" 
                    placeholderTextColor="#999" 
                    value={callDetails[item.id]?.serial}
                    onChangeText={(val) => onUpdateDetail(item.id, 'serial', val)}
                    returnKeyType="done"
                  />
                </View>
              ))}
            </ScrollView>

            <TouchableOpacity style={styles.primaryBtn} onPress={onProceed}>
              <Text style={styles.btnText}>NEXT: CUSTOMER REPORT</Text>
            </TouchableOpacity>
          </View>
        </TouchableWithoutFeedback>
      </KeyboardAvoidingView>
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
          <Text style={styles.helperText}>Summarize the findings for the inspection report.</Text>
          
          {/* NEW: Executive Summary - ALWAYS VISIBLE AT TOP */}
          <View style={[styles.card, { borderLeftWidth: 4, borderLeftColor: COLORS.primary }]}>
            <View style={styles.cardHeader}>
              <Text style={[styles.cardLabel, { color: COLORS.primary }]}>Service Performed / Summary</Text>
            </View>
            
            <TextInput 
              style={[styles.input, { height: moderateScale(100), textAlignVertical: 'top', backgroundColor: '#F0F7FF' }]} 
              multiline 
              placeholder="Enter overall inspection summary (e.g. Report to Follow)..."
              placeholderTextColor="#999"
              value={reportNotes["GLOBAL_SUMMARY"] || ""} 
              onChangeText={(val) => onUpdateNote("GLOBAL_SUMMARY", val)}
            />
            <Text style={{ fontSize: moderateScale(11), color: '#999', marginTop: 8, fontStyle: 'italic' }}>
              This summary appears at the top of the customer's inspection / report.
            </Text>
          </View>

          {/* Logic for Individual Findings */}
          {items.length > 0 && (
             <Text style={[styles.sectionHeader, { marginTop: moderateScale(10), marginBottom: moderateScale(10) }]}>
               Detailed Findings
             </Text>
          )}

          {items.map((item) => {
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
                  placeholder="Enter professional summary for this item..."
                  placeholderTextColor="#999"
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
          <TouchableOpacity onPress={onClose} disabled={isSubmitting}>
            <Ionicons name="chevron-back" size={28} color={isSubmitting ? "#CCC" : "#333"} />
          </TouchableOpacity>
          <Text style={styles.modalTitle}>Final Review</Text>
          <View style={{ width: 28 }} />
        </View>

        <ScrollView contentContainerStyle={styles.scrollPadding}>
          {isSubmitting ? (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', marginTop: moderateScale(100) }}>
              <ActivityIndicator size="large" color={COLORS.primary} />
              <Text style={{ marginTop: moderateScale(20), fontWeight: '700', color: '#666' }}>
                Synchronizing with Office...
              </Text>
              <Text style={{ fontSize: moderateScale(12), color: '#999', marginTop: 8 }}>
                Updating equipment history
              </Text>
            </View>
          ) : (
            <>
              {/* 1. EXECUTIVE SUMMARY - Prominent at the top */}
              <Text style={[styles.sectionHeader, { marginBottom: moderateScale(12) }]}>Inspection Summary</Text>
              <View style={[styles.reviewCard, { 
                backgroundColor: '#F0F7FF', 
                borderLeftColor: COLORS.primary, 
                marginBottom: moderateScale(25) 
              }]}>
                <Text style={[styles.reviewText, { fontStyle: 'italic', fontWeight: '600', color: '#333' }]}>
                "{data.reportNotes["GLOBAL_SUMMARY"] || 
                  (data.pendingItems.length === 0 
                    ? "No faults found. Unit in good working order." 
                    : `${data.pendingItems.length} ${data.pendingItems.length === 1 ? 'issue' : 'issues'} found. Report to Follow.`
                  )
                }"
              </Text>
              </View>

              {/* 2. LABOR SECTION */}
              <Text style={styles.sectionHeader}>Technicians & Labor</Text>
              <View style={{ marginBottom: moderateScale(20) }}>
                {data.techLogs.map(t => (
                  <Text key={t.id} style={[styles.reviewText, { marginBottom: 4 }]}>
                    • {t.name}: <Text style={{ fontWeight: '700' }}>{t.hours} hrs</Text>
                  </Text>
                ))}
              </View>

              <Text style={[styles.sectionHeader, { marginBottom: moderateScale(12) }]}>
                Findings & Repairs
              </Text>
              
              {/* 3. COMPLETED REPAIRS */}
              {data.resolvedDuringInspection?.map(repair => (
                <View key={`repair-${repair.id}`} style={[styles.reviewCard, { borderLeftColor: '#2E7D32', marginBottom: moderateScale(12) }]}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 }}>
                    <Text style={[styles.cardLabel, { color: '#2E7D32' }]}>REPAIR COMPLETED</Text>
                    <Ionicons name="checkmark-done-circle" size={moderateScale(20)} color="#2E7D32" />
                  </View>
                  <Text style={{ fontWeight: '700' }}>{repair.sectionName}: {repair.label}</Text>
                  <Text style={[styles.reviewSubText, { marginTop: 6, color: '#444' }]}>
                    <Text style={{ fontWeight: '800' }}>Resolution: </Text>{repair.resolvedNotes}
                  </Text>
                </View>
              ))}

              {/* 4. PENDING FINDINGS */}
              {data.pendingItems.map(item => (
                <View key={item.id} style={[styles.reviewCard, { marginBottom: moderateScale(12) }]}>
                  <Text style={styles.cardLabel}>{item.sectionName}: {item.label}</Text>
                  <View style={{ flexDirection: 'row', marginTop: 4, marginBottom: 6 }}>
                    <Text style={[styles.reviewSubText, { 
                      color: item.status?.toUpperCase() === 'REPAIR' ? '#D32F2F' : '#F57C00',
                      fontWeight: '800'
                    }]}>
                      {item.status?.toUpperCase()}
                    </Text>
                  </View>
                  <Text style={styles.reviewSubText}>
                    <Text style={{ fontWeight: '700' }}>Note: </Text>
                    {data.reportNotes[item.id] || item.notes || "No additional details."}
                  </Text>
                </View>
              ))}

              {/* Handle Empty State (Perfect Crane) */}
              {data.pendingItems.length === 0 && (!data.resolvedDuringInspection || data.resolvedDuringInspection.length === 0) && (
                <View style={{ alignItems: 'center', marginTop: 20 }}>
                  <Ionicons name="ribbon-outline" size={40} color="#999" />
                  <Text style={{ color: '#999', marginTop: 10 }}>No faults or repairs logged for this unit.</Text>
                </View>
              )}
            </>
          )}
        </ScrollView>

        <TouchableOpacity 
          style={[
            styles.primaryBtn, 
            { backgroundColor: isSubmitting ? '#9E9E9E' : '#2E7D32' }
          ]} 
          onPress={onSubmit}
          disabled={isSubmitting}
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

// --- UPDATED RESOLUTION MODAL ---
// This now handles both "Dashboard Pulse" and "Inspection Quick-Fix" context
export const ResolutionModal = ({ visible, item, onClose, onResolve }) => {
  const [repairNotes, setRepairNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Determine display text based on whether item comes from Dashboard or Inspection
  const componentTitle = item?.sectionName ? `${item.sectionName} : ${item.label}` : item?.compDesc;
  const originalFinding = item?.notes || item?.techNotes;

  const handleLocalResolve = async () => {
    if (!repairNotes.trim()) return;
    setIsSubmitting(true);
    await onResolve(item, repairNotes);
    setRepairNotes('');
    setIsSubmitting(false);
  };

  return (
    <Modal visible={visible} transparent animationType="fade">
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={styles.resOverlay}>
          <KeyboardAvoidingView 
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            style={{ width: '100%', alignItems: 'center' }}
          >
            <View style={styles.resContent}>
              <View style={styles.resHeader}>
                <View>
                  <Text style={styles.resTitle}>Repair Completed</Text>
                  <Text style={styles.resSubTitle}>Log resolution to history</Text>
                </View>
                <TouchableOpacity onPress={onClose}>
                  <Ionicons name="close-circle" size={moderateScale(24)} color="#CCC" />
                </TouchableOpacity>
              </View>

              <ScrollView bounces={false} showsVerticalScrollIndicator={false}>
                <View style={styles.resContextBox}>
                  <Text style={styles.resContextLabel}>COMPONENT</Text>
                  <Text style={styles.resContextMain}>{componentTitle}</Text>
                  {originalFinding && (
                    <Text style={styles.resContextSub}>
                      <Text style={{fontWeight: '800'}}>Finding: </Text>{originalFinding}
                    </Text>
                  )}
                </View>

                <Text style={styles.resInputLabel}>RESOLUTION / REPAIR NOTES</Text>
                <TextInput
                  style={styles.resInput}
                  placeholder="What work was performed to fix this?"
                  placeholderTextColor="#BBB"
                  multiline
                  value={repairNotes}
                  onChangeText={setRepairNotes}
                  returnKeyType="done"
                  blurOnSubmit={true}
                  onSubmitEditing={Keyboard.dismiss}
                />
              </ScrollView>

              <View style={styles.resButtonRow}>
                <TouchableOpacity style={styles.resCancelBtn} onPress={onClose}>
                  <Text style={styles.resCancelText}>CANCEL</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={[styles.resConfirmBtn, !repairNotes.trim() && { backgroundColor: '#EEE' }]} 
                  onPress={handleLocalResolve}
                  disabled={!repairNotes.trim() || isSubmitting}
                >
                  {isSubmitting ? (
                    <ActivityIndicator color="#FFF" />
                  ) : (
                    <Text style={styles.resConfirmText}>SUBMIT REPAIR</Text>
                  )}
                </TouchableOpacity>
              </View>
            </View>
          </KeyboardAvoidingView>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
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
    paddingTop: moderateScale(10)
  },
  modalTitle: { fontSize: moderateScale(18), fontWeight: 'bold' },
  resSubTitle: { fontSize: moderateScale(10), color: COLORS.primary, fontWeight: '800', textTransform: 'uppercase' },
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
  reviewSubText: { fontSize: moderateScale(12), color: '#666', fontStyle: 'italic' },
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
  reviewCard: {
    backgroundColor: '#FFF',
    borderRadius: moderateScale(10),
    padding: moderateScale(15),
    marginBottom: moderateScale(15),
    borderWidth: 1,
    borderColor: '#EEE',
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  reviewInput: {
    backgroundColor: '#F5F5F5',
    borderRadius: moderateScale(6),
    padding: moderateScale(12),
    fontSize: moderateScale(14),
    color: '#333',
    marginBottom: moderateScale(10),
    borderWidth: 1,
    borderColor: '#EEE',
  },
  reviewScrollPadding: {
    padding: moderateScale(16),
    paddingBottom: moderateScale(100), 
  },
  resOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  resContent: {
    backgroundColor: '#FFF',
    width: '92%',
    maxHeight: '85%',
    borderRadius: moderateScale(16),
    padding: moderateScale(20),
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 5,
  },
  resHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: moderateScale(15),
  },
  resTitle: { 
    fontSize: moderateScale(18), 
    fontWeight: '900', 
    color: '#333' 
  },
  resContextBox: {
    backgroundColor: '#F9F9F9',
    padding: moderateScale(15),
    borderRadius: moderateScale(10),
    borderLeftWidth: 5,
    borderLeftColor: '#2E7D32',
    marginBottom: moderateScale(20),
  },
  resContextLabel: { 
    fontSize: moderateScale(10), 
    fontWeight: '800', 
    color: '#999', 
    marginBottom: 4 
  },
  resContextMain: { 
    fontSize: moderateScale(15), 
    fontWeight: '700', 
    color: '#333' 
  },
  resContextSub: { 
    fontSize: moderateScale(13), 
    color: '#666', 
    marginTop: 4, 
    fontStyle: 'italic' 
  },
  resInputLabel: { 
    fontSize: moderateScale(11), 
    fontWeight: '800', 
    color: '#999', 
    marginBottom: 8,
    marginLeft: 4
  },
  resInput: {
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: moderateScale(10),
    padding: moderateScale(12),
    height: moderateScale(110),
    textAlignVertical: 'top',
    fontSize: moderateScale(14),
    marginBottom: moderateScale(10),
  },
  resButtonRow: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center',
    marginTop: moderateScale(10)
  },
  resCancelBtn: { 
    flex: 1, 
    alignItems: 'center' 
  },
  resCancelText: { 
    color: '#999', 
    fontWeight: '700',
    fontSize: moderateScale(14) 
  },
  resConfirmBtn: { 
    flex: 2, 
    backgroundColor: '#2E7D32', 
    paddingVertical: moderateScale(14), 
    borderRadius: moderateScale(10), 
    alignItems: 'center' 
  },
  resConfirmText: { 
    color: '#FFF', 
    fontWeight: '800',
    fontSize: moderateScale(14)
  },
});