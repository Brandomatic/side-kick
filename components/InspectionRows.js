import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Modal, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../theme';
import { moderateScale } from '../utils/metrics';
import { styles } from '../styles/inspectionStyles';

export const InspectionItem = ({ item, onUpdate }) => {
  const [noteModal, setNoteModal] = useState(false);
  const [tempNote, setTempNote] = useState(item.notes || "");

  const getStatusColor = (status) => {
    if (item.isMonitor) return COLORS.primary;
    switch (status) {
      case 'REPAIR': return COLORS.danger;
      case 'ATTENTION': return COLORS.warning;
      default: return '#EEEEEE'; // Neutral light grey for OK
    }
  };

  const toggleStatus = () => {
    const map = { 'OK': 'ATTENTION', 'ATTENTION': 'REPAIR', 'REPAIR': 'OK' };
    // If we toggle status manually, we turn off the monitor eye
    onUpdate({ status: map[item.status] || 'OK', isMonitor: false });
  };

  const toggleMonitor = () => {
    const newMonitorState = !item.isMonitor;
    // If Monitor turns ON, status MUST be OK per your logic
    onUpdate({ 
      isMonitor: newMonitorState, 
      status: newMonitorState ? 'OK' : item.status 
    });
  };

  return (
    <View style={styles.itemWrapper}>
      <View style={styles.itemRow}>
        <View style={{ flex: 1 }}>
          <Text style={styles.itemLabel}>{item.label}</Text>
          <Text style={[styles.statusSubLabel, { color: getStatusColor(item.status) }]}>
            {item.isMonitor ? "• MONITORING" : `• ${item.status}`}
          </Text>
        </View>

        <View style={styles.itemActions}>
          {/* MONITOR CIRCLE */}
          <TouchableOpacity 
            style={[styles.actionCircle, item.isMonitor && { backgroundColor: COLORS.primary, borderColor: COLORS.primary }]} 
            onPress={toggleMonitor}
          >
            <Ionicons 
              name={item.isMonitor ? "eye" : "eye-outline"} 
              size={moderateScale(16)} 
              color={item.isMonitor ? COLORS.white : COLORS.gray} 
            />
          </TouchableOpacity>

          {/* NOTE CIRCLE */}
          <TouchableOpacity 
            style={[styles.actionCircle, { marginHorizontal: moderateScale(8) }, item.notes && { borderColor: COLORS.primary }]} 
            onPress={() => setNoteModal(true)}
          >
            <Ionicons 
              name="pencil" 
              size={moderateScale(16)} 
              color={item.notes ? COLORS.primary : COLORS.gray} 
            />
          </TouchableOpacity>

          {/* STATUS PILL (Modern Toggle) */}
          <TouchableOpacity 
            style={[styles.statusPill, { backgroundColor: getStatusColor(item.status) }]} 
            onPress={toggleStatus}
          >
            <Ionicons 
              name={item.status === 'OK' ? "checkmark-circle" : "alert-circle"} 
              size={moderateScale(20)} 
              color={item.status === 'OK' ? '#999' : COLORS.white} 
            />
          </TouchableOpacity>
        </View>
      </View>

      {/* INLINE NOTE PREVIEW (Matches the clean summary look) */}
      {item.notes ? (
        <View style={styles.inlineNoteBox}>
          <Text style={styles.inlineNoteText} numberOfLines={2}>"{item.notes}"</Text>
        </View>
      ) : null}

      {/* MODAL (Kept existing structure for reliability) */}
      <Modal visible={noteModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Item Details</Text>
            <TextInput 
              style={styles.modalInput} 
              multiline 
              value={tempNote} 
              onChangeText={setTempNote} 
              placeholder="Enter findings..." 
              autoFocus
            />
            <TouchableOpacity 
              style={styles.saveBtn} 
              onPress={() => { onUpdate({ notes: tempNote }); setNoteModal(false); }}
            >
              <Text style={styles.saveBtnText}>SAVE DETAILS</Text>
            </TouchableOpacity>
            
            <TouchableOpacity style={{marginTop: 15, alignItems: 'center'}} onPress={() => setNoteModal(false)}>
              <Text style={{color: COLORS.gray}}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};