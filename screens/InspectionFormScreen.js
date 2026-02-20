import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  TextInput, 
  Alert, 
  Keyboard,
  Modal
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CRANE_CHECKLIST_TEMPLATE } from '../utils/Checklists';
import { COLORS } from '../theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { moderateScale, IS_IOS } from '../utils/metrics';
import { generateChecklist } from '../utils/Checklists';

export default function InspectionFormScreen({ route, navigation }) {
  const { unitId, craneConfig } = route.params;
  const insets = useSafeAreaInsets();
  
  // --- STATE ---
  const [collapsedSections, setCollapsedSections] = useState({});
  const [isListening, setIsListening] = useState(false);
  const [isManifestExpanded, setIsManifestExpanded] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [checklist, setChecklist] = useState(() => 
    generateChecklist(craneConfig || { hoistType: 'Chain' })
  );

  // --- MODAL STATE ---
  const [noteModalVisible, setNoteModalVisible] = useState(false);
  const [activeItem, setActiveItem] = useState(null); // { sIdx, iIdx }
  const [tempNote, setTempNote] = useState("");

  // --- LOGIC ---
  const issueManifest = checklist.flatMap(s => 
    s.items
      .filter(i => i.status !== 'OK' || i.isMonitor)
      .map(item => ({
        ...item,
        // Prefix the label with the section name for the summary view
        displayLabel: `${s.section}: ${item.label}` 
      }))
  );

  const toggleSection = (sectionName) => {
    setCollapsedSections(prev => ({ ...prev, [sectionName]: !prev[sectionName] }));
  };

  const updateItemProperty = (sIdx, iIdx, props) => {
    const next = [...checklist];
    next[sIdx].items[iIdx] = { ...next[sIdx].items[iIdx], ...props };
    setChecklist(next);
  };

  const markSectionOK = (sIdx) => {
    const newChecklist = [...checklist];
    newChecklist[sIdx].items = newChecklist[sIdx].items.map(item => ({ ...item, status: 'OK' }));
    setChecklist(newChecklist);
  };

  const toggleStatus = (sIdx, iIdx) => {
    const item = checklist[sIdx].items[iIdx];
    if (item.status === 'OK') updateItemProperty(sIdx, iIdx, { status: 'ATTENTION' });
    else if (item.status === 'ATTENTION') updateItemProperty(sIdx, iIdx, { status: 'REPAIR' });
    else {
      if (item.notes || item.isMonitor) {
        Alert.alert("Reset Component?", "Clear notes and remove from issue list?", [
          { text: "Keep Notes", onPress: () => updateItemProperty(sIdx, iIdx, { status: 'OK' }) },
          { text: "Clear Everything", style: "destructive", onPress: () => updateItemProperty(sIdx, iIdx, { status: 'OK', notes: '', isMonitor: undefined }) },
          { text: "Cancel", style: "cancel" }
        ]);
      } else updateItemProperty(sIdx, iIdx, { status: 'OK' });
    }
  };

  const promptMonitorStatus = (sIdx, iIdx) => {
    Alert.alert(
      "Flag as 'Monitor'?",
      "Add this to the Equipment Watchlist for future inspections?",
      [
        { text: "Yes, Monitor", onPress: () => updateItemProperty(sIdx, iIdx, { isMonitor: true }) },
        { text: "No, Just Note", onPress: () => updateItemProperty(sIdx, iIdx, { isMonitor: false }) }
      ]
    );
  };

  // --- MODAL ACTIONS ---
  const openNoteModal = (sIdx, iIdx, currentNotes) => {
    setActiveItem({ sIdx, iIdx });
    setTempNote(currentNotes || "");
    setNoteModalVisible(true);
  };

  const handleSaveAndInquiry = () => {
    if (!activeItem) return;
    const { sIdx, iIdx } = activeItem;
    
    updateItemProperty(sIdx, iIdx, { notes: tempNote });
    setNoteModalVisible(false);

    const item = checklist[sIdx].items[iIdx];
    
    // CHANGE: Trigger if isMonitor is NOT true. 
    // This ensures that even if it was 'false' (Reset), it prompts again.
    if (item.status === 'OK' && tempNote.trim().length > 0 && item.isMonitor !== true) {
      setTimeout(() => promptMonitorStatus(sIdx, iIdx), 500);
    }
    
    setActiveItem(null);
  };

  const handleCancelModal = () => {
    setTempNote("");
    setNoteModalVisible(false);
    setActiveItem(null);
  };

  // --- VOICE COMMAND (PRESERVED) ---
  const handleVoiceCommand = (text) => {
    if (!text) return;
    const commands = text.toLowerCase().split(/\band\b|\balso\b|\bbut\b|[,.]/);
    const newChecklist = [...checklist];
    let foundAnyMatch = false;

    commands.forEach((command) => {
      const input = command.trim();
      if (input.length < 3) return;
      newChecklist.forEach((section, sIdx) => {
        section.items.forEach((item, iIdx) => {
          const itemLabel = item.label.toLowerCase();
          if (input.includes(itemLabel) || (input.includes("hoist") && itemLabel.includes("hoist"))) {
            foundAnyMatch = true;
            let newStatus = item.status;
            if (input.includes("repair") || input.includes("bad")) newStatus = "REPAIR";
            else if (input.includes("caution") || input.includes("attention")) newStatus = "ATTENTION";
            else if (input.includes("ok") || input.includes("good")) newStatus = "OK";
            newChecklist[sIdx].items[iIdx].status = newStatus;
            newChecklist[sIdx].items[iIdx].notes = `[Voice]: ${input}`;
          }
        });
      });
    });
    if (foundAnyMatch) setChecklist(newChecklist);
  };

  const startListeningSimulator = () => {
    setIsListening(true);
    setTranscript("Listening...");
    setTimeout(() => {
      const mock = "Hoist Motor is bad and support columns are loose";
      setTranscript(mock);
      setTimeout(() => { setIsListening(false); handleVoiceCommand(mock); }, 1500);
    }, 1000);
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      
      {/* FIXED HEADER */}
      <View style={styles.appHeader}>
        <TouchableOpacity onPress={() => navigation.goBack()}><Ionicons name="chevron-back" size={24} color="#333" /></TouchableOpacity>
        <Text style={styles.headerTitle}>Inspection: {unitId}</Text>
        <TouchableOpacity onPress={() => Alert.alert("Submit", "Done?")}><Ionicons name="send" size={20} color={COLORS.primary} /></TouchableOpacity>
      </View>

      {/* STICKY MANIFEST */}
      {issueManifest.length > 0 && (
        <View style={styles.manifestContainer}>
          <TouchableOpacity style={styles.manifestHeader} onPress={() => setIsManifestExpanded(!isManifestExpanded)}>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Ionicons name="list-circle" size={20} color={COLORS.primary} />
              <Text style={styles.manifestLabel}>{issueManifest.length} Pending Actions</Text>
            </View>
            <Ionicons name={isManifestExpanded ? "chevron-up" : "chevron-down"} size={18} color="#999" />
          </TouchableOpacity>
          {isManifestExpanded && (
            <View style={styles.manifestVerticalList}>
              {issueManifest.map((item, idx) => (
                <View key={idx} style={styles.manifestRow}>
                  <View style={[styles.statusIndicator, { backgroundColor: item.status === 'REPAIR' ? '#FF5252' : item.isMonitor ? COLORS.primary : '#FFC107' }]} />
                  <Text style={styles.manifestItemName}>{item.displayLabel}</Text>
                </View>
              ))}
            </View>
          )}
        </View>
      )}

      {/* MAIN LIST */}
      <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
        {checklist.map((section, sIdx) => {
          const isCollapsed = !collapsedSections[section.section];
          const issues = section.items.filter(item => item.status !== 'OK' || item.isMonitor);
          return (
            <View key={section.section} style={styles.sectionCard}>
              <TouchableOpacity onPress={() => toggleSection(section.section)} style={styles.sectionHeader}>
                <View style={styles.sectionTitleRow}>
                  <Ionicons name={isCollapsed ? "chevron-forward" : "chevron-down"} size={18} color="#666" />
                  <Text style={styles.sectionTitle}>{section.section}</Text>
                  {issues.length > 0 && <View style={styles.issueBadge}><Text style={styles.issueBadgeText}>{issues.length}</Text></View>}
                </View>
                <TouchableOpacity onPress={() => markSectionOK(sIdx)} style={styles.bulkOkBtn}>
                  <Ionicons name="checkmark-done" size={14} color={COLORS.primary} /><Text style={styles.bulkOkText}>ALL OK</Text>
                </TouchableOpacity>
              </TouchableOpacity>

              {isCollapsed && issues.map((item) => (
                <View key={`promoted-${item.id}`} style={styles.promotedIssueRow}>
                  <Ionicons name={item.isMonitor ? "eye" : "warning"} size={14} color={item.status === 'REPAIR' ? '#FF5252' : item.isMonitor ? COLORS.primary : '#FFC107'} />
                  <Text style={styles.promotedIssueText}>{item.label}</Text>
                </View>
              ))}

              {!isCollapsed && section.items.map((item, iIdx) => (
                <View key={item.id} style={styles.itemWrapper}>
                  <View style={styles.itemRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.itemLabel}>{item.label}</Text>
                      <Text style={[styles.statusLabel, { color: item.status === 'REPAIR' ? '#FF5252' : item.status === 'ATTENTION' ? '#FFC107' : '#4CAF50' }]}>
                        {item.isMonitor ? 'MONITORING' : item.status}
                      </Text>
                    </View>
                    <TouchableOpacity onPress={() => toggleStatus(sIdx, iIdx)} style={[styles.statusToggle, { backgroundColor: item.status === 'REPAIR' ? '#FF5252' : item.status === 'ATTENTION' ? '#FFC107' : '#4CAF50' }]}>
                      <Ionicons name={item.status === 'OK' ? "checkmark" : "alert"} size={20} color="#FFF" />
                    </TouchableOpacity>
                  </View>
                  
                  {/* NOTES TRIGGER */}
                  <TouchableOpacity 
                    style={styles.notesTrigger} 
                    onPress={() => openNoteModal(sIdx, iIdx, item.notes)}
                  >
                    <Text style={{ color: item.notes ? '#333' : '#999', fontSize: 13 }}>
                      {item.notes || "Tap to add details..."}
                    </Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          );
        })}
      </ScrollView>

      {/* MODAL OVERLAY */}
      <Modal visible={noteModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Item Details</Text>
            <Text style={styles.modalSubTitle}>{activeItem ? checklist[activeItem.sIdx].items[activeItem.iIdx].label : ""}</Text>
            
            <TextInput
              style={styles.modalInput}
              multiline
              autoFocus
              value={tempNote}
              onChangeText={setTempNote}
              placeholder="Enter observations..."
              returnKeyType="done"
              blurOnSubmit={true}
              onSubmitEditing={() => Keyboard.dismiss()} // Only hides keys for review!
            />
            
            <View style={styles.modalButtons}>
              <TouchableOpacity style={styles.cancelBtn} onPress={handleCancelModal}>
                <Text style={{ color: '#FF5252', fontWeight: 'bold' }}>CANCEL</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveBtn} onPress={handleSaveAndInquiry}>
                <Text style={{ color: '#FFF', fontWeight: 'bold' }}>SAVE & DONE</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* FLOATING MIC */}
      <TouchableOpacity style={[styles.micBtn, isListening && styles.micBtnActive]} onPress={startListeningSimulator}>
        <Ionicons name="mic" size={32} color="#FFF" />
      </TouchableOpacity>

      {isListening && (
        <View style={styles.transcriptOverlay}><Text style={styles.transcriptText}>{transcript}</Text></View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F4F7F6' },
  appHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 15, height: 55, backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#EEE' },
  headerTitle: { fontSize: 17, fontWeight: 'bold' },
  manifestContainer: { backgroundColor: '#FFF', marginHorizontal: 15, marginTop: 10, borderRadius: 10, borderWidth: 1, borderColor: '#EEE', overflow: 'hidden' },
  manifestHeader: { flexDirection: 'row', justifyContent: 'space-between', padding: 12, backgroundColor: '#F9F9F9' },
  manifestLabel: { fontSize: 13, fontWeight: '700', marginLeft: 8 },
  manifestVerticalList: { padding: 10, borderTopWidth: 1, borderTopColor: '#EEE' },
  manifestRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 5 },
  statusIndicator: { width: 4, height: 20, borderRadius: 2, marginRight: 10 },
  manifestItemName: { fontSize: 13, color: '#333' },
  scrollContainer: { padding: 15, paddingBottom: 120 },
  sectionCard: { backgroundColor: '#FFF', borderRadius: 12, padding: 15, marginBottom: 20, elevation: 2 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between' },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center' },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', marginLeft: 5 },
  issueBadge: { backgroundColor: '#FF5252', borderRadius: 10, paddingHorizontal: 6, marginLeft: 8 },
  issueBadgeText: { color: '#FFF', fontSize: 10, fontWeight: 'bold' },
  bulkOkBtn: { flexDirection: 'row', alignItems: 'center' },
  bulkOkText: { fontSize: 10, color: COLORS.primary, marginLeft: 3, fontWeight: 'bold' },
  promotedIssueRow: { flexDirection: 'row', alignItems: 'center', marginTop: 10 },
  promotedIssueText: { fontSize: 13, marginLeft: 10, color: '#555' },
  itemWrapper: { marginTop: 15, borderTopWidth: 1, borderTopColor: '#F0F0F0', paddingTop: 15 },
  itemRow: { flexDirection: 'row', justifyContent: 'space-between' },
  itemLabel: { fontSize: 14, fontWeight: '600' },
  statusLabel: { fontSize: 10, fontWeight: 'bold' },
  statusToggle: { width: 40, height: 40, borderRadius: 20, justifyContent: 'center', alignItems: 'center' },
  notesTrigger: { marginTop: 10, backgroundColor: '#F9F9F9', borderRadius: 8, padding: 12, borderWidth: 1, borderColor: '#EEE' },
  micBtn: { position: 'absolute', bottom: 30, right: 30, width: 65, height: 65, borderRadius: 35, backgroundColor: '#1A1A1A', justifyContent: 'center', alignItems: 'center', elevation: 5 },
  micBtnActive: { backgroundColor: '#FF5252' },
  transcriptOverlay: { position: 'absolute', bottom: 110, left: 20, right: 20, backgroundColor: 'rgba(0,0,0,0.85)', padding: 15, borderRadius: 10 },
  transcriptText: { color: '#FFF', textAlign: 'center' },
  // MODAL STYLES
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { width: '85%', backgroundColor: '#FFF', borderRadius: 15, padding: 20 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 5 },
  modalSubTitle: { fontSize: 14, color: '#666', marginBottom: 15 },
  modalInput: { backgroundColor: '#F5F5F5', borderRadius: 10, padding: 12, minHeight: 120, textAlignVertical: 'top', fontSize: 16 },
  modalButtons: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 20 },
  saveBtn: { backgroundColor: COLORS.primary, paddingVertical: 10, paddingHorizontal: 20, borderRadius: 8, marginLeft: 15 },
  cancelBtn: { paddingVertical: 10 }
});