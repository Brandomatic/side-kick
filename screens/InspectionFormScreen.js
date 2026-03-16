import React, { useState, useEffect, useContext, useMemo } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  TextInput, 
  Alert, 
  Keyboard,
  Modal,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { UserContext } from '../components/MyContexts';
import { PATHS } from '../utils/Paths';
import { COLORS } from '../theme';
import { moderateScale } from '../utils/metrics';
import { generateChecklist } from '../utils/Checklists';
import { saveActivity } from '../utils/MyHelperFunctions';
import { 
  FindingsReviewModal, 
  CustomerReportModal, 
  LaborModal, 
  FinalReviewModal,
  ResolutionModal
} from '../components/modals/MyModals';
import { auth, db } from "../lib/firebase";
import { 
  doc, collection, setDoc, arrayUnion, writeBatch, 
  onSnapshot, query, orderBy, deleteDoc, getDoc
} from 'firebase/firestore';

export default function InspectionFormScreen({ navigation }) {
  const { currentEquipment, user, currentCustomer } = useContext(UserContext);
  const insets = useSafeAreaInsets();
  
  // --- STATE ---
  const [collapsedSections, setCollapsedSections] = useState({});
  const [isListening, setIsListening] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [checklist, setChecklist] = useState([]);
  const [helpModalVisible, setHelpModalVisible] = useState(false);
  const [pendingCollapsed, setPendingCollapsed] = useState(true);
  const [reviewModalVisible, setReviewModalVisible] = useState(false);
  const [reportModalVisible, setReportModalVisible] = useState(false); // New Phase 3 Modal
  const [callDetails, setCallDetails] = useState({}); 
  const [finalReportNotes, setFinalReportNotes] = useState({}); // Stores the "polished" descriptions
  const [logisticsModalVisible, setLogisticsModalVisible] = useState(false);
  const [finalReviewVisible, setFinalReviewVisible] = useState(false);
  const [inspectionType, setInspectionType] = useState('Monthly');
  const [activePulse, setActivePulse] = useState([]);
  const [repairModalVisible, setRepairModalVisible] = useState(false);
  const [itemToRepair, setItemToRepair] = useState(null);
  const [resolvedDuringInspection, setResolvedDuringInspection] = useState([]);

  const inspectionTypes = [
    'Monthly', 
    '6-Week', 
    '12-Week', 
    '6-Month', 
    'Annual'
  ];

  // Default entry for the current user
  const [techLogs, setTechLogs] = useState([
    { 
      id: user.uid, 
      name: user.userDisplayName || "Main Tech", 
      hours: "2.0", 
      date: new Date().toISOString()
    }
  ]);
  

  // --- MODAL STATE ---
  const [noteModalVisible, setNoteModalVisible] = useState(false);
  const [activeItem, setActiveItem] = useState(null); 
  const [tempNote, setTempNote] = useState("");

  useEffect(() => {
    if (currentEquipment) {
      const data = generateChecklist(currentEquipment);
      setChecklist(data);
      const initialCollapseState = {};
      data.forEach(section => { initialCollapseState[section.section] = true; });
      setCollapsedSections(initialCollapseState);
    }
  }, [currentEquipment]);

  useEffect(() => {
  if (!currentCustomer?.id || !currentEquipment?.unitId) return;

  // Listen to the live issues already on this crane
  const pulseUnsub = onSnapshot(
    collection(db, PATHS.activeIssues(user.companyId, currentCustomer.id, currentEquipment.unitId)), 
    (snap) => {
      const issues = snap.docs.map(doc => ({ 
        id: doc.id, 
        ...doc.data(), 
        isPriorIssue: true // Flag to distinguish from new findings
      }));
      setActivePulse(issues);
    }
  );

  return () => pulseUnsub();
}, [currentEquipment?.unitId]);

  const handleFinalSubmit = async () => {
  setIsSubmitting(true);
  const companyId = user?.companyId;

  // Immediately close modal to prevent the "Double Card" UI flicker
    setFinalReviewVisible(false);

    if (!companyId || !currentCustomer?.id || !currentEquipment?.id) {
      Alert.alert("Error", "Missing required IDs for submission.");
      setIsSubmitting(false);
      setFinalReviewVisible(true);
      return;
    }

    try {
      const batch = writeBatch(db); 
      const timestamp = new Date().toISOString();
      const reportId = doc(collection(db, "temp")).id;

      const cranePath = PATHS.crane(companyId, currentCustomer.id, currentEquipment.id);
      const logPath = PATHS.serviceLogs(companyId, currentCustomer.id, currentEquipment.id);
      const pulsePath = PATHS.livePulse(companyId, currentCustomer.id);
      const pendingPath = PATHS.inspectionsPending(companyId, currentCustomer.id);

      // --- 1. FETCH CURRENT GLOBAL PULSE FOR CLEANING ---
      const pulseRef = doc(db, pulsePath);
      const pulseSnap = await getDoc(pulseRef);
      let activeIssuesArray = [];
      if (pulseSnap.exists()) {
        activeIssuesArray = pulseSnap.data().activeIssues || [];
      }

      const resolvedIds = resolvedDuringInspection.map(r => r.issueId || r.id);
      const updatedIds = pendingItems.map(p => p.issueId).filter(id => id != null);

      const filteredPulse = activeIssuesArray.filter(
        issue => !resolvedIds.includes(issue.issueId) && !updatedIds.includes(issue.issueId)
      );

      // --- 2. DATA CLEANING & FINDINGS MAPPING ---
      const cleanedChecklist = checklist.map(section => ({
        ...section,
        items: section.items.map(item => ({
          label: item.label || "Unknown Item",
          status: item.status || "OK",
          notes: item.notes || "",
          isMonitor: !!item.isMonitor,
          id: item.id || Math.random().toString(36).substr(2, 9)
        }))
      }));

      // Prepare Finding Objects (Mapping specific customer notes from Phase 3)
      const findingsForBatch = pendingItems.map(item => {
        const finalIssueId = item.issueId || doc(collection(db, "temp")).id; 
        
        return {
          issueId: finalIssueId,
          unitId: currentEquipment?.unitId || "Unknown Unit",
          equipmentId: currentEquipment?.id || "Unknown ID",
          inspector: user?.userDisplayName || "Unknown Inspector",
          type: item.status?.toUpperCase() || "REPAIR", 
          compDesc: `${item.sectionName || 'Section'} : ${item.label || 'Component'}`,
          sectionName: item.sectionName,
          label: item.label,
          status: item.status.toUpperCase(),
          // Matches the TextInput keys in your CustomerReportModal (Modal 3)
          techNotes: finalReportNotes[item.id] || item.notes || "",
          date: timestamp,
          reportId: reportId
        };
      });

      // --- 3. PACKAGE ONE: The Legal Archive ---
      const archiveRef = doc(db, pendingPath, reportId);
      batch.set(archiveRef, {
        reportId,
        inspectionType: inspectionType || "Standard Inspection",
        inspector: user?.userDisplayName || "System Admin",
        unitId: currentEquipment?.unitId || "N/A",
        equipmentId: currentEquipment?.id,
        date: timestamp,
        fullChecklist: cleanedChecklist, 
        techLogs: techLogs || [],
        status: "AWAITING_WO_PO",
        // Include the executive summary in the archive
        globalSummary: finalReportNotes["GLOBAL_SUMMARY"] 
      });

      // --- 4. PACKAGE TWO: Global Live Pulse ---
      batch.set(pulseRef, {
        lastUpdate: timestamp,
        activeIssues: [...filteredPulse, ...findingsForBatch], 
        recentEvents: arrayUnion(
          {
            type: 'INSPECTION',
            unitId: currentEquipment.unitId,
            summary: `${inspectionType} Completed`,
            date: timestamp
          },
          ...resolvedDuringInspection.map(item => ({
            type: 'REPAIR',
            unitId: currentEquipment.unitId,
            summary: `FIXED: ${item.label}`,
            date: timestamp
          }))
        )
      }, { merge: true });

      // --- 5. PACKAGE THREE: Service Log (History Cards) ---
      const mainLogRef = doc(collection(db, logPath));
      batch.set(mainLogRef, {
        date: timestamp,
        inspectionType,
        inspector: user.userDisplayName,
        // Pulls the Editable Summary from Phase 3
        summary: finalReportNotes["GLOBAL_SUMMARY"], 
        findings: pendingItems.map(item => `${item.sectionName} : ${item.label}`),
        reportId,
        topSeverity: pendingItems.some(i => i.status.toUpperCase() === 'REPAIR') ? 'HIGH' : 'OK',
        hasIssues: pendingItems.length > 0
      });

      resolvedDuringInspection.forEach(item => {
        const resLogRef = doc(collection(db, logPath));
        batch.set(resLogRef, {
          date: timestamp,
          logType: "REPAIR_RESOLVED",
          inspectionType: "Repair Resolution", 
          summary: `Fixed during ${inspectionType}`,
          inspector: user.userDisplayName,
          compDesc: `${item.sectionName} : ${item.label}`,
          resolvedDetails: item.resolvedNotes,
          initialDiagnosisDetails: item.notes || "Prior issue resolved",
          unitId: currentEquipment.unitId,
          topSeverity: 'OK'
        });
      });

      // --- 6. PACKAGE FOUR: Individual Asset Updates ---
      findingsForBatch.forEach(obj => {
        const activeIssueRef = doc(db, cranePath, "activeIssues", obj.issueId);
        batch.set(activeIssueRef, obj, { merge: true });
      });

      resolvedIds.forEach(id => {
        const issueRef = doc(db, cranePath, "activeIssues", id);
        batch.delete(issueRef);
      });

      await batch.commit();

      Alert.alert("Success", "Inspection Submitted.", [
        { text: "OK", onPress: () => {
          setTimeout(() => { navigation.popToTop(); }, 100);
        }}
      ]);

    } catch (err) {
      console.error("SUBMIT ERROR: ", err);
      Alert.alert("Error", "Could not submit inspection.");
      setFinalReviewVisible(true);
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- LOGIC: PENDING CALLS (Summary at top) ---
  const pendingItems = useMemo(() => {
  const currentFindings = [];
  checklist.forEach(section => {
    section.items.forEach(item => {
      if (item.status === 'REPAIR' || item.status === 'ATTENTION' || item.isMonitor === true) {
        currentFindings.push({ ...item, sectionName: section.section, isNewFinding: true });
      }
    });
  });

  // Filter out any prior issues that were resolved during this session
  const activePrior = activePulse.filter(ap => 
    !resolvedDuringInspection.find(r => r.id === ap.id)
  );

  return [...activePrior, ...currentFindings];
}, [checklist, activePulse, resolvedDuringInspection]);

  if (!currentEquipment) return null;

  const updateCallDetail = (itemId, field, value) => {
    setCallDetails(prev => ({
      ...prev,
      [itemId]: { 
        ...(prev[itemId] || {}), // Uses itemId and provides a fallback object
        [field]: value 
      }
    }));
  };

  const updateReportNote = (itemId, value) => {
    setFinalReportNotes(prev => ({
      ...prev,
      [itemId]: value
    }));
  };

  // Triggered when Technician finishes Phase 2
  const proceedToCustomerReport = () => {
    setReviewModalVisible(false);
    setReportModalVisible(true);
  };

  // Triggered when Technician finishes Phase 3
  const proceedToLogistics = () => {
    const cleanedNotes = { ...finalReportNotes };

    // Loop through our findings to ensure every note is "Client Ready"
    pendingItems.forEach(item => {
      // Use what Brandon typed, or fall back to the Phase 1 notes
      let currentText = cleanedNotes[item.id] !== undefined 
        ? cleanedNotes[item.id] 
        : (item.notes || "");

      // Strip the prefix and any extra whitespace
      if (currentText.startsWith("[Voice]: ")) {
        cleanedNotes[item.id] = currentText.replace("[Voice]: ", "").trim();
      } else {
        cleanedNotes[item.id] = currentText.trim();
      }
    });

    // Save the polished versions and move to the next modal
    setFinalReportNotes(cleanedNotes);
    setReportModalVisible(false);
    setLogisticsModalVisible(true);
  };

  // --- HELPERS ---
  const getNextStatus = (currentStatus) => {
    switch (currentStatus) {
      case 'OK': 
        return 'ATTENTION'; // Move to Yellow
      case 'ATTENTION': 
        return 'MONITOR';   // Move to Blue
      case 'MONITOR': 
        return 'REPAIR';    // Move to Red
      case 'REPAIR': 
        return 'OK';         // Reset to Green
      default: 
        return 'OK';
    }
  };
  

  const getStatusColor = (status) => {
    switch (status) {
      case 'REPAIR': return '#FF5252';
      case 'ATTENTION': return '#FFC107';
      default: return '#4CAF50';
    }
  };

  const updateItemProperty = (sIdx, iIdx, props) => {
    const item = checklist[sIdx].items[iIdx];
    
    // Check if it's a Custom item and we are changing status/monitoring
    if (item.label === 'Custom' && (props.status || props.isMonitor !== undefined)) {
      Alert.prompt(
        "Component Name",
        "What is the name of this custom component?",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "OK",
            onPress: (newName) => {
              const updatedProps = { ...props, label: newName || 'Custom' };
              applyUpdate(sIdx, iIdx, updatedProps);
            }
          }
        ],
        "plain-text"
      );
      return;
    }

    applyUpdate(sIdx, iIdx, props);
  };

  const applyUpdate = (sIdx, iIdx, props) => {
    const next = [...checklist];
    let updatedProps = { ...props };
    if (props.status === 'REPAIR') updatedProps.isMonitor = false;
    
    next[sIdx].items[iIdx] = { ...next[sIdx].items[iIdx], ...updatedProps };
    setChecklist(next);
  };

  const markSectionOK = (sIdx) => {
    const next = [...checklist];
    next[sIdx].items = next[sIdx].items.map(item => ({ 
      ...item, 
      status: 'OK', 
      isMonitor: false 
    }));
    setChecklist(next);
  };

  // --- VOICE LOGIC ---
  const handleVoiceCommand = (text) => {
    if (!text) return;
    const phrases = text.toLowerCase().split(/\band\b|\balso\b|[,.]/);
    const newChecklist = [...checklist];
    let matchFound = false;

    phrases.forEach((phrase) => {
      const input = phrase.trim();
      if (!input) return;

      let anchor = null;
      if (input.includes('hoist')) anchor = 'hoist';
      else if (input.includes('trolley')) anchor = 'trolley';
      else if (input.includes('bridge')) anchor = 'bridge';
      else if (input.includes('structure')) anchor = 'structure';

      newChecklist.forEach((section, sIdx) => {
        const sectionName = section.section.toLowerCase();
        if (anchor && !sectionName.includes(anchor)) return;

        section.items.forEach((item, iIdx) => {
          const label = item.label.toLowerCase();
          if (input.includes(label)) {
            matchFound = true;
            const isAttention = input.includes('attention') || input.includes('monitor');
            const status = isAttention ? 'ATTENTION' : 'REPAIR';

            newChecklist[sIdx].items[iIdx] = {
              ...newChecklist[sIdx].items[iIdx],
              status: status,
              isMonitor: isAttention,
              notes: `[Voice]: ${input.charAt(0).toUpperCase() + input.slice(1)}`
            };
          }
        });
      });
    });

    if (matchFound) setChecklist([...newChecklist]);
  };

  const startListeningSimulator = () => {
    setIsListening(true);
    setTranscript("Listening...");
    setTimeout(() => {
      const mock = "Hoist motor is grinding and trolley motor is running hot and trolley festooning needs replacing";
      setTranscript(mock);
      setTimeout(() => { 
        setIsListening(false); 
        handleVoiceCommand(mock); 
      }, 1500);
    }, 1000);
  };

  const handleInspectionRepair = (item, repairNotes) => {
  const resolutionEntry = {
    ...item,
    resolvedNotes: repairNotes,
    resolvedAt: new Date().toISOString(),
    logType: "REPAIR_RESOLVED"
  };

  setResolvedDuringInspection(prev => [...prev, resolutionEntry]);
  setRepairModalVisible(false);
  
  // If it was a new finding in the checklist, reset that checklist item to OK
    if (item.isNewFinding) {
      // Logic to find sIdx and iIdx and set to 'OK'
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* HEADER: Fixes the blank spot by moving notch padding here */}
      <View style={styles.appHeader}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="chevron-back" size={moderateScale(24)} color="#333" />
          </TouchableOpacity>
        <Text style={styles.headerTitle}>{currentEquipment.unitId} Inspection</Text>
        <TouchableOpacity onPress={() => setHelpModalVisible(true)}>
          <Ionicons name="help-circle-outline" size={moderateScale(22)} color="#666" />
        </TouchableOpacity>
      </View>

      {/* PENDING CALLS SUMMARY */}
      {pendingItems.length > 0 && (
        <View style={styles.pendingContainer}>
          <TouchableOpacity 
            style={styles.pendingHeader} 
            onPress={() => setPendingCollapsed(!pendingCollapsed)}
          >
            <View style={styles.pendingTitleRow}>
              <View style={styles.pendingCountBadge}>
                <Text style={styles.pendingCountText}>{pendingItems.length}</Text>
              </View>
              <Text style={styles.pendingTitle}>Pending Calls</Text>
            </View>
            <Ionicons 
              name={pendingCollapsed ? "chevron-down" : "chevron-up"} 
              size={moderateScale(20)} 
              color="#007AFF" 
            />
          </TouchableOpacity>

          {!pendingCollapsed && (
            <ScrollView style={styles.pendingList} nestedScrollEnabled={true}>
              {pendingItems.map((item, index) => (
                <View key={`pending-${index}`} style={styles.pendingItem}>
                  <View style={[styles.statusDot, { backgroundColor: getStatusColor(item.status) }]} />
                  <View style={{flex: 1}}>
                    <View style={{flexDirection: 'row', alignItems: 'center'}}>
                      <Text style={styles.pendingLabel}>{item.sectionName} {item.label}</Text>
                      {item.isPriorIssue && (
                        <View style={styles.priorIssueBadge}>
                          <Text style={styles.priorIssueText}>PRIOR ISSUE</Text>
                        </View>
                      )}
                    </View>
                    {item.notes && <Text style={styles.pendingNote} numberOfLines={2}>{item.notes}</Text>}
                  </View>

                  {/* REPAIR BUTTON (Opposite the Mic logic conceptually) */}
                  <TouchableOpacity 
                    style={styles.repairSmallBtn}
                    onPress={() => {
                      setItemToRepair(item);
                      setRepairModalVisible(true);
                    }}
                  >
                    <Ionicons name="construct" size={14} color="#FFF" />
                    <Text style={styles.repairSmallText}>Repair</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </ScrollView>
          )}
        </View>
      )}

      <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
        {/* INSPECTION TYPE SELECTOR */}
        <View style={styles.typeSelectorContainer}>
          <Text style={styles.typeLabel}>Select Inspection Type:</Text>
          <View style={styles.typeGrid}>
            {inspectionTypes.map((type) => (
              <TouchableOpacity 
                key={type} 
                onPress={() => setInspectionType(type)}
                style={[
                  styles.typeOption, 
                  inspectionType === type && styles.typeOptionActive
                ]}
              >
                <Ionicons 
                  name={inspectionType === type ? "radio-button-on" : "radio-button-off"} 
                  size={moderateScale(18)} 
                  color={inspectionType === type ? "#007AFF" : "#CCC"} 
                />
                <Text style={[
                  styles.typeOptionText, 
                  inspectionType === type && styles.typeOptionTextActive
                ]}>{type}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {checklist.map((section, sIdx) => {
          const isCollapsed = collapsedSections[section.section];
          const issues = section.items.filter(item => item.status !== 'OK' || item.isMonitor);
          
          return (
            <View key={section.section} style={styles.sectionCard}>
              <View style={styles.sectionHeader}>
                <TouchableOpacity 
                  onPress={() => setCollapsedSections(prev => ({ ...prev, [section.section]: !isCollapsed }))} 
                  style={styles.sectionTitleRow}
                >
                  <Ionicons name={isCollapsed ? "chevron-forward" : "chevron-down"} size={moderateScale(18)} color="#666" />
                  <Text style={styles.sectionTitle}>{section.section}</Text>
                  {issues.length > 0 && (
                    <View style={styles.issueBadge}><Text style={styles.issueBadgeText}>{issues.length}</Text></View>
                  )}
                </TouchableOpacity>
                <TouchableOpacity onPress={() => markSectionOK(sIdx)} style={styles.bulkOkBtn}>
                   <Ionicons name="checkmark-done" size={14} color="#007AFF" />
                   <Text style={styles.bulkOkText}>ALL OK</Text>
                </TouchableOpacity>
              </View>

              {!isCollapsed && section.items.map((item, iIdx) => (
                <View key={item.id} style={styles.itemWrapper}>
                  <View style={styles.itemRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.itemLabel}>{item.label}</Text>
                      <Text style={[styles.statusSubLabel, { color: getStatusColor(item.status) }]}>
                        {item.status === 'MONITOR' ? "MONITORING" : item.status}
                      </Text>
                    </View>

                    {/* MONITOR TOGGLE (EYE) */}
                    <TouchableOpacity 
                      style={[styles.monitorBtn, item.status === 'MONITOR' && styles.monitorBtnActive]}
                      onPress={() => {
                        const isCurrentlyMonitoring = item.status === 'MONITOR';
                        // If it's already Blue, reset to Green (OK). 
                        // If it's anything else (Red/Yellow/Green), force it to Blue (MONITOR).
                        updateItemProperty(sIdx, iIdx, { 
                          status: isCurrentlyMonitoring ? 'OK' : 'MONITOR',
                          isMonitor: !isCurrentlyMonitoring
                        });
                      }}
                    >
                      <Ionicons 
                        name={item.isMonitor ? "eye" : "eye-outline"} 
                        size={moderateScale(18)} 
                        color={item.isMonitor ? "#FFF" : "#666"} 
                      />
                    </TouchableOpacity>

                    {/* STATUS TOGGLE */}
                    <TouchableOpacity 
                      style={[styles.statusToggle, { backgroundColor: getStatusColor(item.status) }]}
                      onPress={() => {
                        const next = getNextStatus(item.status);
                        updateItemProperty(sIdx, iIdx, { status: next });
                      }}
                    >
                      <Ionicons name={item.status === 'OK' ? "checkmark" : "alert"} size={moderateScale(20)} color="#FFF" />
                    </TouchableOpacity>
                  </View>
                  <TouchableOpacity style={styles.notesTrigger} onPress={() => { setActiveItem({ sIdx, iIdx }); setTempNote(item.notes || ""); setNoteModalVisible(true); }}>
                    <Text style={{ color: item.notes ? '#333' : '#999', fontSize: moderateScale(13) }}>{item.notes || "Tap to add details..."}</Text>
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          );
        })}
      </ScrollView>

      {/* FOOTER ACTION BUTTON */}
      <View style={styles.footerContainer}>
        <TouchableOpacity 
          style={[
            styles.reviewBtn, 
            pendingItems.length === 0 && { backgroundColor: COLORS.primary } // Optional: different color for "Clean"
          ]} 
          onPress={() => {
            if (pendingItems.length > 0) {
              setReviewModalVisible(true);
            } else {
              // Perfect Crane Logic: 
              // We set a global summary since there are no specific item IDs to attach notes to
              const cleanNote = `${inspectionType} inspection completed. No faults found.`;
              setFinalReportNotes({ GLOBAL_SUMMARY: cleanNote }); 
              setReportModalVisible(true);
            }
          }}
        >
          <Text style={styles.reviewBtnText}>
            {pendingItems.length > 0 
              ? `REVIEW ${pendingItems.length} FINDINGS` 
              : "NEXT: CUSTOMER REPORT"}
          </Text>
          <Ionicons 
            name={pendingItems.length > 0 ? "list" : "checkmark-circle"} 
            size={moderateScale(18)} 
            color="#FFF" 
            style={{ marginLeft: moderateScale(8) }}
          />
        </TouchableOpacity>
      </View>

      {/* MIC & MODALS */}
      <TouchableOpacity style={[styles.micBtn, isListening && styles.micBtnActive]} onPress={startListeningSimulator}>
        <Ionicons name="mic" size={moderateScale(32)} color="#FFF" />
      </TouchableOpacity>
      {isListening && <View style={styles.transcriptOverlay}><Text style={styles.transcriptText}>{transcript}</Text></View>}
      
      <Modal visible={noteModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}><Text style={styles.modalTitle}>Item Details</Text><TouchableOpacity onPress={() => setNoteModalVisible(false)}><Ionicons name="close-circle" size={28} color="#999" /></TouchableOpacity></View>
            <TextInput style={styles.modalInput} multiline autoFocus value={tempNote} onChangeText={setTempNote} placeholder="Enter findings..." blurOnSubmit={true} onSubmitEditing={() => Keyboard.dismiss()} returnKeyType="done" />
            <TouchableOpacity style={styles.saveBtn} onPress={() => { if (activeItem) updateItemProperty(activeItem.sIdx, activeItem.iIdx, { notes: tempNote }); setNoteModalVisible(false); }}>
              <Text style={styles.saveBtnText}>SAVE & DONE</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* STEP 2: REVIEW CALLS MODAL */}
      <FindingsReviewModal 
        visible={reviewModalVisible}
        onClose={() => setReviewModalVisible(false)}
        items={pendingItems} // This is your useMemo'd list of non-OK items
        callDetails={callDetails}
        onUpdateDetail={updateCallDetail}
        onProceed={proceedToCustomerReport}
      />

      {/* PHASE 3: CUSTOMER REPORT LAYER */}
      <CustomerReportModal 
        visible={reportModalVisible}
        onClose={() => setReportModalVisible(false)}
        items={pendingItems}
        reportNotes={finalReportNotes}
        onUpdateNote={updateReportNote}
        onProceed={proceedToLogistics}
      />

      {/* PHASE 4: LOGISTICS & METADATA */}
      <LaborModal 
        visible={logisticsModalVisible}
        onClose={() => setLogisticsModalVisible(false)}
        techLogs={techLogs}
        onUpdateLogs={setTechLogs} // Passes the state setter directly
        onProceed={() => {
          setLogisticsModalVisible(false);
          setFinalReviewVisible(true);
        }}
      />

      {/* PHASE 5: FINAL REVIEW & SUBMISSION */}
      <FinalReviewModal 
        visible={finalReviewVisible}
        isSubmitting={isSubmitting}
        onClose={() => setFinalReviewVisible(false)}
        data={{
          techLogs: techLogs,
          pendingItems: pendingItems,
          reportNotes: finalReportNotes,
          resolvedDuringInspection: resolvedDuringInspection // <--- ADD THIS LINE
        }}
        onSubmit={handleFinalSubmit}
      />

      {/* RESOLUTION MODAL */}
      <ResolutionModal 
        visible={repairModalVisible}
        item={itemToRepair}
        onClose={() => {
          setRepairModalVisible(false);
          setItemToRepair(null);
        }}
        onResolve={handleInspectionRepair}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F4F7F6' },
  appHeader: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    paddingHorizontal: moderateScale(15),
    paddingTop: Platform.OS === 'ios' ? 5 : 5, 
    height: Platform.OS === 'ios' ? 65 : 65, 
    backgroundColor: '#FFF', 
    borderBottomWidth: 1, 
    borderBottomColor: '#EEE' 
  },
  headerTitle: { fontSize: moderateScale(17), fontWeight: 'bold' },
  scrollContainer: { padding: moderateScale(15), paddingBottom: moderateScale(110) },
  pendingContainer: { backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#EEE', elevation: 3, zIndex: 10 },
  pendingHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: moderateScale(15), backgroundColor: '#F8F9FA' },
  pendingTitleRow: { flexDirection: 'row', alignItems: 'center' },
  pendingCountBadge: { backgroundColor: '#FF5252', width: moderateScale(22), height: moderateScale(22), borderRadius: 11, justifyContent: 'center', alignItems: 'center', marginRight: 10 },
  pendingCountText: { color: '#FFF', fontSize: moderateScale(12), fontWeight: 'bold' },
  pendingTitle: { fontSize: moderateScale(15), fontWeight: '700', color: '#333' },
  pendingList: { paddingHorizontal: moderateScale(15), paddingBottom: moderateScale(10), maxHeight: moderateScale(200) },
  pendingItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: moderateScale(8), borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  statusDot: { width: 8, height: 8, borderRadius: 4, marginRight: 10 },
  pendingLabel: { fontSize: moderateScale(13), fontWeight: '600', color: '#444' },
  pendingNote: { fontSize: moderateScale(11), color: '#888', fontStyle: 'italic' },
  pendingStatusText: { fontSize: moderateScale(10), fontWeight: '800', marginLeft: 10 },
  monitorBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#007AFF', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, marginRight: 8 },
  monitorBadgeText: { color: '#FFF', fontSize: 8, fontWeight: 'bold', marginLeft: 3 },
  sectionCard: { backgroundColor: '#FFF', borderRadius: moderateScale(12), padding: moderateScale(15), marginBottom: moderateScale(15), elevation: 2 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionTitleRow: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  sectionTitle: { fontSize: moderateScale(15), fontWeight: 'bold', marginLeft: moderateScale(8) },
  bulkOkBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F0F7FF', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  bulkOkText: { fontSize: 10, color: '#007AFF', marginLeft: 4, fontWeight: '800' },
  issueBadge: { backgroundColor: '#FF5252', borderRadius: moderateScale(10), paddingHorizontal: moderateScale(6), marginLeft: moderateScale(8) },
  issueBadgeText: { color: '#FFF', fontSize: moderateScale(10), fontWeight: 'bold' },
  itemWrapper: { marginTop: moderateScale(15), borderTopWidth: 1, borderTopColor: '#F0F0F0', paddingTop: moderateScale(10) },
  itemRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  itemLabel: { fontSize: moderateScale(14), fontWeight: '600' },
  statusSubLabel: { fontSize: moderateScale(10), fontWeight: '800', marginTop: 2 },
  monitorBtn: { width: moderateScale(38), height: moderateScale(38), borderRadius: 19, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F0F0F0', marginRight: 10, borderWidth: 1, borderColor: '#DDD' },
  monitorBtnActive: { backgroundColor: '#007AFF', borderColor: '#0056b3' },
  statusToggle: { width: moderateScale(38), height: moderateScale(38), borderRadius: 19, justifyContent: 'center', alignItems: 'center' },
  notesTrigger: { marginTop: moderateScale(10), backgroundColor: '#F9F9F9', borderRadius: moderateScale(8), padding: moderateScale(12), borderWidth: 1, borderColor: '#EEE' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-start', paddingTop: moderateScale(80) },
  modalContent: { marginHorizontal: 20, backgroundColor: '#FFF', borderRadius: 20, padding: 20, elevation: 20 },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  modalTitle: { fontSize: 18, fontWeight: 'bold' },
  modalInput: { backgroundColor: '#F5F5F5', borderRadius: 12, padding: 15, fontSize: 16, minHeight: 120, textAlignVertical: 'top' },
  saveBtn: { backgroundColor: '#1A1A1A', padding: 15, borderRadius: 12, alignItems: 'center', marginTop: 15 },
  saveBtnText: { color: '#FFF', fontWeight: 'bold' },
  micBtn: { position: 'absolute', bottom: moderateScale(30), right: moderateScale(30), width: moderateScale(65), height: moderateScale(65), borderRadius: 35, backgroundColor: '#1A1A1A', justifyContent: 'center', alignItems: 'center', elevation: 10 },
  micBtnActive: { backgroundColor: '#FF5252' },
  transcriptOverlay: { position: 'absolute', bottom: moderateScale(110), left: 20, right: 20, backgroundColor: 'rgba(0,0,0,0.9)', padding: 15, borderRadius: 12 },
  transcriptText: { color: '#FFF', textAlign: 'center', fontWeight: 'bold' },
  footerContainer: {
    position: 'absolute',
    bottom: moderateScale(100), // Sits above the Mic button
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingHorizontal: moderateScale(20),
  },
  reviewBtn: {
    backgroundColor: '#007AFF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: moderateScale(14),
    paddingHorizontal: moderateScale(25),
    borderRadius: moderateScale(30),
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  reviewBtnText: {
    color: '#FFF',
    fontSize: moderateScale(14),
    fontWeight: '800',
    marginRight: 10,
    letterSpacing: 1,
  },
  reviewInstruction: { fontSize: moderateScale(13), color: '#666', marginBottom: 20 },
  reviewCard: { backgroundColor: '#F8F9FA', borderRadius: 12, padding: 15, marginBottom: 15, borderWidth: 1, borderColor: '#EEE' },
  reviewItemHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  reviewItemLabel: { 
    fontSize: moderateScale(14), 
    fontWeight: '700', 
    color: '#333',
    textTransform: 'capitalize' // Ensures 'hoist ; motor' looks professional
  },
  inputGrid: { flexDirection: 'row', justifyContent: 'space-between' },
  inputWrapper: { width: '48%' },
  inputLabel: { fontSize: 10, color: '#888', fontWeight: 'bold', marginBottom: 4, textTransform: 'uppercase' },
  smallInput: { backgroundColor: '#FFF', borderWidth: 1, borderColor: '#DDD', borderRadius: 6, padding: 8, fontSize: 14 },
  modalFooter: { padding: 20, borderTopWidth: 1, borderTopColor: '#EEE' },
  proceedBtn: { backgroundColor: '#28a745', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 16, borderRadius: 12 },
  proceedBtnText: { color: '#FFF', fontWeight: 'bold', marginRight: 10 },
  reviewGroup: {
    marginBottom: 25,
  },
  reviewSectionHeader: {
    fontSize: moderateScale(12),
    fontWeight: '800',
    color: '#007AFF',
    marginBottom: 10,
    letterSpacing: 1,
    paddingLeft: 5,
  },
  reviewCard: { 
    backgroundColor: '#F8F9FA', 
    borderRadius: 12, 
    padding: 15, 
    marginBottom: 10, // Reduced margin since they are grouped
    borderWidth: 1, 
    borderColor: '#EEE' 
  },
  modalMainContainer: {
    backgroundColor: '#FFF',
    // Ensures the content starts below the camera/notch area
    paddingTop: Platform.OS === 'ios' ? moderateScale(45) : moderateScale(10), 
    flex: 1,
  },
  reportCard: { backgroundColor: '#FFF', borderRadius: 12, padding: 15, marginBottom: 15, borderWidth: 1, borderColor: '#DDD' },
  reportHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  reportItemPath: { fontSize: moderateScale(12), fontWeight: 'bold', color: '#666' },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 },
  statusBadgeText: { color: '#FFF', fontSize: 10, fontWeight: '800' },
  reportEditor: { backgroundColor: '#F9F9F9', borderRadius: 8, padding: 12, fontSize: 14, color: '#333', minHeight: 60, borderWidth: 1, borderColor: '#EEE' },
  logCard: { backgroundColor: '#FFF', borderRadius: 12, padding: 15, marginBottom: 15, borderWidth: 1, borderColor: '#DDD', elevation: 2 },
  logHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  techNameInput: { fontSize: 16, fontWeight: 'bold', color: '#333', flex: 1, borderBottomWidth: 1, borderBottomColor: '#EEE', paddingVertical: 4 },
  dateDisplay: { 
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: '#F9F9F9', borderWidth: 1, borderColor: '#DDD', borderRadius: 6, padding: 8
  },
  typeSelectorContainer: {
    backgroundColor: '#FFF',
    padding: moderateScale(15),
    borderRadius: 12,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#EEE'
  },
  typeGrid: {
    marginTop: 5,
  },
  typeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: moderateScale(10),
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  typeOptionActive: {
    backgroundColor: '#F0F7FF', // Light blue highlight
    borderRadius: 8,
    paddingHorizontal: 10,
    marginHorizontal: -10,
  },
  typeOptionText: {
    fontSize: moderateScale(14),
    color: '#444',
    marginLeft: 10,
    fontWeight: '500'
  },
  typeOptionTextActive: {
    color: '#007AFF',
    fontWeight: '700'
  },
  finalHeaderCard: { 
    backgroundColor: '#1A1A1A', 
    padding: 20, 
    borderRadius: 12, 
    marginBottom: 10,
    alignItems: 'center',
    justifyContent: 'center',
    height: moderateScale(80), 
  },
  finalStatusText: { color: '#28a745', fontWeight: '800', fontSize: 15, marginTop: 4 },
  
  passStatementBox: { 
    flexDirection: 'row', 
    backgroundColor: '#F0FFF4', 
    padding: 15, 
    borderRadius: 8, 
    borderWidth: 1, 
    borderColor: '#C6F6D5',
    marginBottom: 20,
    alignItems: 'center'
  },
  passStatementText: { 
    flex: 1, 
    fontSize: 12, 
    color: '#22543D', 
    marginLeft: 10, 
    fontStyle: 'italic' 
  },

  monitorTag: { 
    flexDirection: 'row', 
    alignItems: 'center', 
    marginTop: 10, 
    paddingTop: 10, 
    borderTopWidth: 1, 
    borderTopColor: '#EBF5FF' 
  },
  monitorTagText: { 
    fontSize: 11, 
    color: '#007AFF', 
    fontWeight: '600', 
    marginLeft: 6 
  },

  finalLogDate: { fontSize: 11, color: '#999', marginTop: 2 },
  sectionDivider: {
    marginTop: moderateScale(25),
    marginBottom: moderateScale(10),
    borderBottomWidth: 2,
    borderBottomColor: '#F0F0F0',
    paddingBottom: moderateScale(5),
  },
  sectionTitleMain: {
    fontSize: moderateScale(16),
    fontWeight: '800',
    color: '#1A1A1A',
    letterSpacing: 0.5,
  },
  finalFindingCard: {
    backgroundColor: '#FFF',
    borderRadius: moderateScale(8),
    marginBottom: moderateScale(12),
    padding: moderateScale(12),
    borderWidth: 1,
    borderColor: '#EEE',
    borderLeftWidth: 5, // Status color highlight
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    elevation: 2,
  },
  findingTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: moderateScale(8),
  },
  itemIndex: {
    fontSize: moderateScale(10),
    fontWeight: 'bold',
    color: '#999',
    marginRight: moderateScale(8),
  },
  statusBadgeSmall: {
    paddingHorizontal: moderateScale(6),
    paddingVertical: moderateScale(2),
    borderRadius: moderateScale(4),
    marginLeft: 'auto',
  },
  findingBody: {
    paddingLeft: moderateScale(18), // Indents the notes relative to the header
  },
  monitorBoxIndented: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: moderateScale(8),
    padding: moderateScale(8),
    backgroundColor: '#F0F7FF',
    borderRadius: moderateScale(6),
  },
  monitorTextIndented: {
    fontSize: moderateScale(11),
    color: '#007AFF',
    fontWeight: '600',
    marginLeft: moderateScale(6),
    fontStyle: 'italic',
  },
  laborContainerCard: {
    backgroundColor: '#FFF',
    borderRadius: moderateScale(8),
    borderWidth: 1,
    borderColor: '#EEE',
    overflow: 'hidden',
    marginBottom: moderateScale(30),
  },
  laborRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: moderateScale(15),
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
  },
  techDisplayName: {
    fontSize: moderateScale(14),
    fontWeight: '700',
    color: '#333',
  },
  techDateDisplay: {
    fontSize: moderateScale(12),
    color: '#999',
  },
  laborHoursBadge: {
    backgroundColor: '#F0F0F0',
    paddingHorizontal: moderateScale(10),
    paddingVertical: moderateScale(4),
    borderRadius: moderateScale(15),
  },
  hoursText: {
    fontSize: moderateScale(13),
    fontWeight: 'bold',
    color: '#444',
  },
  priorIssueBadge: {
    backgroundColor: '#F0F0F0',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 8,
    borderWidth: 1,
    borderColor: '#DDD'
  },
  priorIssueText: {
    fontSize: 8,
    fontWeight: '800',
    color: '#666'
  },
  repairSmallBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#2E7D32',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    marginLeft: 10
  },
  repairSmallText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: '900',
    marginLeft: 4
  }
});