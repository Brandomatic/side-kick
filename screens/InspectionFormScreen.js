// import React, { useState, useEffect, useContext, useMemo } from 'react';
// import { 
//   View, 
//   Text, 
//   StyleSheet, 
//   ScrollView, 
//   TouchableOpacity, 
//   TextInput, 
//   Alert, 
//   Keyboard,
//   Modal,
//   Platform,
// } from 'react-native';
// import { Ionicons } from '@expo/vector-icons';
// import { UserContext } from '../components/MyContexts';
// import { COLORS } from '../theme';
// import { moderateScale } from '../utils/metrics';
// import { generateChecklist } from '../utils/Checklists';
// import { saveActivity } from '../utils/MyHelperFunctions';
// import { 
//   FindingsReviewModal, 
//   CustomerReportModal, 
//   LaborModal, 
//   FinalReviewModal,
// } from '../components/modals/MyModals';
// import { auth, db } from "../lib/firebase";
// // Add writeBatch to your firestore imports
// import { doc, collection, setDoc, arrayUnion, writeBatch } from 'firebase/firestore';

// export default function InspectionFormScreen({ navigation }) {
//   const { currentEquipment, user, currentCustomer } = useContext(UserContext);
  
//   // --- STATE ---
//   const [collapsedSections, setCollapsedSections] = useState({});
//   const [isListening, setIsListening] = useState(false);
//   const [isSubmitting, setIsSubmitting] = useState(false);
//   const [transcript, setTranscript] = useState("");
//   const [checklist, setChecklist] = useState([]);
//   const [helpModalVisible, setHelpModalVisible] = useState(false);
//   const [pendingCollapsed, setPendingCollapsed] = useState(true);
//   const [reviewModalVisible, setReviewModalVisible] = useState(false);
//   const [reportModalVisible, setReportModalVisible] = useState(false); // New Phase 3 Modal
//   const [callDetails, setCallDetails] = useState({}); 
//   const [finalReportNotes, setFinalReportNotes] = useState({}); // Stores the "polished" descriptions
//   const [logisticsModalVisible, setLogisticsModalVisible] = useState(false);
//   const [finalReviewVisible, setFinalReviewVisible] = useState(false);
//   const [inspectionType, setInspectionType] = useState('Monthly'); // Default
//   const [cranes, setCranes] = useState([]);
//   const [loading, setLoading] = useState(true);

//   const inspectionTypes = [
//     'Monthly', 
//     '6-Week', 
//     '12-Week', 
//     '6-Month', 
//     'Annual'
//   ];

//   // Default entry for the current user
//   const [techLogs, setTechLogs] = useState([
//     { 
//       id: user.uid, 
//       name: user.userDisplayName || "Main Tech", 
//       hours: "2.0", 
//       date: new Date().toISOString()
//     }
//   ]);
  

//   // --- MODAL STATE ---
//   const [noteModalVisible, setNoteModalVisible] = useState(false);
//   const [activeItem, setActiveItem] = useState(null); 
//   const [tempNote, setTempNote] = useState("");

//   useEffect(() => {
//     if (currentEquipment) {
//       const data = generateChecklist(currentEquipment.specs);
//       setChecklist(data);
//       const initialCollapseState = {};
//       data.forEach(section => { initialCollapseState[section.section] = true; });
//       setCollapsedSections(initialCollapseState);
//     }
//   }, [currentEquipment]);

//   const handleFinalSubmit = async () => {
//     setIsSubmitting(true);
//     try {
//       const batch = writeBatch(db); 
//       const reportId = doc(collection(db, "temp")).id;
//       const timestamp = new Date().toISOString();
//       const basePath = `customers/${currentCustomer.id}/assets/custProfile/cranes/${currentEquipment.unitId}`;

//       // --- DATA CLEANING ---
//       const cleanedChecklist = checklist.map(section => ({
//         ...section,
//         items: section.items.map(item => ({
//           label: item.label || "Unknown Item",
//           status: item.status || "OK",
//           notes: item.notes || "",
//           isMonitor: !!item.isMonitor,
//           id: item.id || Math.random().toString(36).substr(2, 9)
//         }))
//       }));

//       // --- PACKAGE ONE: The Legal Archive ---
//       const archiveRef = doc(db, "customers", currentCustomer.id, "inspections_pending", reportId);
//       batch.set(archiveRef, {
//         reportId,
//         inspectionType: inspectionType || "Standard Inspection",
//         inspector: user?.userDisplayName || "System Admin",
//         unitId: currentEquipment?.unitId || "N/A",
//         date: timestamp,
//         fullChecklist: cleanedChecklist, 
//         techLogs: techLogs || [],
//         status: "AWAITING_WO_PO"
//       });

//       // --- PACKAGE TWO: Global Live Pulse (Customer Overview) ---
//       const currentFindings = pendingItems.map(item => ({
//         issueId: doc(collection(db, "temp")).id,
//         unitId: currentEquipment?.unitId || "Unknown Unit",
//         equipmentId: currentEquipment?.id || "Unknown ID",
//         inspector: user?.userDisplayName || "Unknown Inspector",
//         type: item.status?.toUpperCase() || "REPAIR", 
//         compDesc: `${item.sectionName || 'Section'} : ${item.label || 'Component'}`,
//         techNotes: item.notes || "",
//         date: timestamp
//       }));

//       const pulseRef = doc(db, "customers", currentCustomer.id, "status", "livePulse");
//       batch.set(pulseRef, {
//         lastUpdate: timestamp,
//         activeIssues: arrayUnion(...currentFindings),
//         recentEvents: arrayUnion({
//           type: 'INSPECTION',
//           unitId: currentEquipment.unitId,
//           summary: `${inspectionType} Completed`,
//           date: timestamp
//         })
//       }, { merge: true });

//       // --- PACKAGE THREE: The Service Log (History Entry) ---
//       const issueCount = pendingItems.length;
//       const summaryText = issueCount === 0 ? "No faults found" : `${issueCount} issue${issueCount > 1 ? 's' : ''} found`;
//       const findingLabels = pendingItems.map(item => `${item.sectionName} : ${item.label}`);
      
//       const repairCount = pendingItems.filter(item => item.status?.toUpperCase() === 'REPAIR').length;
//       const attentionCount = pendingItems.filter(item => item.status?.toUpperCase() === 'ATTENTION').length;
//       const monitorCount = pendingItems.filter(item => item.status?.toUpperCase() === 'MONITOR').length;

//       const topSeverity = repairCount > 0 ? 'HIGH' : (attentionCount > 0 ? 'MEDIUM' : (monitorCount > 0 ? 'LOW' : 'OK'));

//       const serviceLogRef = doc(collection(db, basePath, "serviceLogs"));
//       batch.set(serviceLogRef, {
//         date: timestamp,
//         inspectionType,
//         inspector: user.userDisplayName,
//         summary: summaryText,
//         findings: findingLabels,
//         reportId,
//         repairCount,
//         attentionCount,
//         monitorCount,
//         topSeverity,
//         hasIssues: (repairCount + attentionCount + monitorCount) > 0
//       });

//       // --- NEW PACKAGE FOUR: The Asset Pulse (Active Issues List) ---
//       // This ensures items stay flagged until fixed
//       pendingItems.forEach(item => {
//         // Create a unique but predictable ID so we don't double-log the same component
//         const issueId = `${item.sectionName}-${item.label}`.replace(/\s+/g, '');
//         const activeIssueRef = doc(db, basePath, "activeIssues", issueId);

//         batch.set(activeIssueRef, {
//           sectionName: item.sectionName,
//           label: item.label,
//           status: item.status.toUpperCase(),
//           notes: item.notes || "",
//           date: timestamp,
//           inspector: user.userDisplayName,
//           reportId: reportId
//         }, { merge: true });
//       });

//       // --- EXECUTE ---
//       await batch.commit();

//       Alert.alert("Success", "Inspection Submitted.", [
//         { text: "OK", onPress: () => {
//           setFinalReviewVisible(false); 
//           setTimeout(() => { navigation.popToTop(); }, 100);
//         }}
//       ]);

//     } catch (err) {
//       console.error("SUBMIT ERROR: ", err);
//       Alert.alert("Error", "Could not submit inspection.");
//     } finally {
//       setIsSubmitting(false);
//     }
//   };

//   // --- LOGIC: PENDING CALLS (Summary at top) ---
//   const pendingItems = useMemo(() => {
//     const pending = [];
//     checklist.forEach(section => {
//       section.items.forEach(item => {
//         // Capture anything flagged as Repair, Attention, or Monitoring
//         if (item.status === 'REPAIR' || item.status === 'ATTENTION' || item.isMonitor === true) {
//           pending.push({ 
//             ...item, 
//             sectionName: section.section // This feeds the "Hoist : Brake" label
//           });
//         }
//       });
//     });
//     return pending;
//   }, [checklist]);

//   if (!currentEquipment) return null;

//   const updateCallDetail = (itemId, field, value) => {
//     setCallDetails(prev => ({
//       ...prev,
//       [itemId]: { 
//         ...(prev[itemId] || {}), // Uses itemId and provides a fallback object
//         [field]: value 
//       }
//     }));
//   };

//   const updateReportNote = (itemId, value) => {
//     setFinalReportNotes(prev => ({
//       ...prev,
//       [itemId]: value
//     }));
//   };

//   // Triggered when Technician finishes Phase 2
//   const proceedToCustomerReport = () => {
//     setReviewModalVisible(false);
//     setReportModalVisible(true);
//   };

//   // Triggered when Technician finishes Phase 3
//   const proceedToLogistics = () => {
//     const cleanedNotes = { ...finalReportNotes };

//     // Loop through our findings to ensure every note is "Client Ready"
//     pendingItems.forEach(item => {
//       // Use what Brandon typed, or fall back to the Phase 1 notes
//       let currentText = cleanedNotes[item.id] !== undefined 
//         ? cleanedNotes[item.id] 
//         : (item.notes || "");

//       // Strip the prefix and any extra whitespace
//       if (currentText.startsWith("[Voice]: ")) {
//         cleanedNotes[item.id] = currentText.replace("[Voice]: ", "").trim();
//       } else {
//         cleanedNotes[item.id] = currentText.trim();
//       }
//     });

//     // Save the polished versions and move to the next modal
//     setFinalReportNotes(cleanedNotes);
//     setReportModalVisible(false);
//     setLogisticsModalVisible(true);
//   };

//   // --- HELPERS ---
//   const getNextStatus = (currentStatus) => {
//     switch (currentStatus) {
//       case 'OK': 
//         return 'ATTENTION'; // Move to Yellow
//       case 'ATTENTION': 
//         return 'MONITOR';   // Move to Blue
//       case 'MONITOR': 
//         return 'REPAIR';    // Move to Red
//       case 'REPAIR': 
//         return 'OK';         // Reset to Green
//       default: 
//         return 'OK';
//     }
//   };
  

//   const getStatusColor = (status) => {
//     switch (status) {
//       case 'REPAIR': return '#FF5252';
//       case 'ATTENTION': return '#FFC107';
//       default: return '#4CAF50';
//     }
//   };

//   const updateItemProperty = (sIdx, iIdx, props) => {
//     const item = checklist[sIdx].items[iIdx];
    
//     // Check if it's a Custom item and we are changing status/monitoring
//     if (item.label === 'Custom' && (props.status || props.isMonitor !== undefined)) {
//       Alert.prompt(
//         "Component Name",
//         "What is the name of this custom component?",
//         [
//           { text: "Cancel", style: "cancel" },
//           {
//             text: "OK",
//             onPress: (newName) => {
//               const updatedProps = { ...props, label: newName || 'Custom' };
//               applyUpdate(sIdx, iIdx, updatedProps);
//             }
//           }
//         ],
//         "plain-text"
//       );
//       return;
//     }

//     applyUpdate(sIdx, iIdx, props);
//   };

//   const applyUpdate = (sIdx, iIdx, props) => {
//     const next = [...checklist];
//     let updatedProps = { ...props };
//     if (props.status === 'REPAIR') updatedProps.isMonitor = false;
    
//     next[sIdx].items[iIdx] = { ...next[sIdx].items[iIdx], ...updatedProps };
//     setChecklist(next);
//   };

//   const markSectionOK = (sIdx) => {
//     const next = [...checklist];
//     next[sIdx].items = next[sIdx].items.map(item => ({ 
//       ...item, 
//       status: 'OK', 
//       isMonitor: false 
//     }));
//     setChecklist(next);
//   };

//   // --- VOICE LOGIC ---
//   const handleVoiceCommand = (text) => {
//     if (!text) return;
//     const phrases = text.toLowerCase().split(/\band\b|\balso\b|[,.]/);
//     const newChecklist = [...checklist];
//     let matchFound = false;

//     phrases.forEach((phrase) => {
//       const input = phrase.trim();
//       if (!input) return;

//       let anchor = null;
//       if (input.includes('hoist')) anchor = 'hoist';
//       else if (input.includes('trolley')) anchor = 'trolley';
//       else if (input.includes('bridge')) anchor = 'bridge';
//       else if (input.includes('structure')) anchor = 'structure';

//       newChecklist.forEach((section, sIdx) => {
//         const sectionName = section.section.toLowerCase();
//         if (anchor && !sectionName.includes(anchor)) return;

//         section.items.forEach((item, iIdx) => {
//           const label = item.label.toLowerCase();
//           if (input.includes(label)) {
//             matchFound = true;
//             const isAttention = input.includes('attention') || input.includes('monitor');
//             const status = isAttention ? 'ATTENTION' : 'REPAIR';

//             newChecklist[sIdx].items[iIdx] = {
//               ...newChecklist[sIdx].items[iIdx],
//               status: status,
//               isMonitor: isAttention,
//               notes: `[Voice]: ${input.charAt(0).toUpperCase() + input.slice(1)}`
//             };
//           }
//         });
//       });
//     });

//     if (matchFound) setChecklist([...newChecklist]);
//   };

//   const startListeningSimulator = () => {
//     setIsListening(true);
//     setTranscript("Listening...");
//     setTimeout(() => {
//       const mock = "Hoist motor is grinding and trolley motor is running hot";
//       setTranscript(mock);
//       setTimeout(() => { 
//         setIsListening(false); 
//         handleVoiceCommand(mock); 
//       }, 1500);
//     }, 1000);
//   };

//   return (
//     <View style={styles.container}>
//       {/* HEADER: Fixes the blank spot by moving notch padding here */}
//       <View style={styles.appHeader}>
//         <TouchableOpacity onPress={() => navigation.goBack()}>
//           <Ionicons name="chevron-back" size={moderateScale(24)} color="#333" />
//         </TouchableOpacity>
//         <Text style={styles.headerTitle}>{currentEquipment.unitId} Inspection</Text>
//         <TouchableOpacity onPress={() => setHelpModalVisible(true)}>
//           <Ionicons name="help-circle-outline" size={moderateScale(22)} color="#666" />
//         </TouchableOpacity>
//       </View>

//       {/* PENDING CALLS SUMMARY */}
//       {pendingItems.length > 0 && (
//         <View style={styles.pendingContainer}>
//           <TouchableOpacity 
//             style={styles.pendingHeader} 
//             onPress={() => setPendingCollapsed(!pendingCollapsed)}
//           >
//             <View style={styles.pendingTitleRow}>
//               <View style={styles.pendingCountBadge}>
//                 <Text style={styles.pendingCountText}>{pendingItems.length}</Text>
//               </View>
//               <Text style={styles.pendingTitle}>Pending Calls</Text>
//             </View>
//             <Ionicons 
//               name={pendingCollapsed ? "chevron-down" : "chevron-up"} 
//               size={moderateScale(20)} 
//               color="#007AFF" 
//             />
//           </TouchableOpacity>

//           {!pendingCollapsed && (
//             <ScrollView style={styles.pendingList} nestedScrollEnabled={true}>
//               {pendingItems.map((item, index) => (
//                 <View key={`pending-${index}`} style={styles.pendingItem}>
//                   <View style={[styles.statusDot, { backgroundColor: getStatusColor(item.status) }]} />
//                   <View style={{flex: 1}}>
//                     <Text style={styles.pendingLabel}>{item.sectionName} {item.label}</Text>
//                     {item.notes && <Text style={styles.pendingNote} numberOfLines={2}>{item.notes}</Text>}
//                   </View>
//                   {item.isMonitor && (
//                     <View style={styles.monitorBadge}>
//                       <Ionicons name="eye" size={10} color="#FFF" />
//                       <Text style={styles.monitorBadgeText}>MONITOR</Text>
//                     </View>
//                   )}
//                   <Text style={[styles.pendingStatusText, { color: getStatusColor(item.status) }]}>{item.status}</Text>
//                 </View>
//               ))}
//             </ScrollView>
//           )}
//         </View>
//       )}

//       <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
//         {/* INSPECTION TYPE SELECTOR */}
//         <View style={styles.typeSelectorContainer}>
//           <Text style={styles.typeLabel}>Select Inspection Type:</Text>
//           <View style={styles.typeGrid}>
//             {inspectionTypes.map((type) => (
//               <TouchableOpacity 
//                 key={type} 
//                 onPress={() => setInspectionType(type)}
//                 style={[
//                   styles.typeOption, 
//                   inspectionType === type && styles.typeOptionActive
//                 ]}
//               >
//                 <Ionicons 
//                   name={inspectionType === type ? "radio-button-on" : "radio-button-off"} 
//                   size={moderateScale(18)} 
//                   color={inspectionType === type ? "#007AFF" : "#CCC"} 
//                 />
//                 <Text style={[
//                   styles.typeOptionText, 
//                   inspectionType === type && styles.typeOptionTextActive
//                 ]}>{type}</Text>
//               </TouchableOpacity>
//             ))}
//           </View>
//         </View>

//         {checklist.map((section, sIdx) => {
//           const isCollapsed = collapsedSections[section.section];
//           const issues = section.items.filter(item => item.status !== 'OK' || item.isMonitor);
          
//           return (
//             <View key={section.section} style={styles.sectionCard}>
//               <View style={styles.sectionHeader}>
//                 <TouchableOpacity 
//                   onPress={() => setCollapsedSections(prev => ({ ...prev, [section.section]: !isCollapsed }))} 
//                   style={styles.sectionTitleRow}
//                 >
//                   <Ionicons name={isCollapsed ? "chevron-forward" : "chevron-down"} size={moderateScale(18)} color="#666" />
//                   <Text style={styles.sectionTitle}>{section.section}</Text>
//                   {issues.length > 0 && (
//                     <View style={styles.issueBadge}><Text style={styles.issueBadgeText}>{issues.length}</Text></View>
//                   )}
//                 </TouchableOpacity>
//                 <TouchableOpacity onPress={() => markSectionOK(sIdx)} style={styles.bulkOkBtn}>
//                    <Ionicons name="checkmark-done" size={14} color="#007AFF" />
//                    <Text style={styles.bulkOkText}>ALL OK</Text>
//                 </TouchableOpacity>
//               </View>

//               {!isCollapsed && section.items.map((item, iIdx) => (
//                 <View key={item.id} style={styles.itemWrapper}>
//                   <View style={styles.itemRow}>
//                     <View style={{ flex: 1 }}>
//                       <Text style={styles.itemLabel}>{item.label}</Text>
//                       <Text style={[styles.statusSubLabel, { color: getStatusColor(item.status) }]}>
//                         {item.status === 'MONITOR' ? "MONITORING" : item.status}
//                       </Text>
//                     </View>

//                     {/* MONITOR TOGGLE (EYE) */}
//                     <TouchableOpacity 
//                       style={[styles.monitorBtn, item.status === 'MONITOR' && styles.monitorBtnActive]}
//                       onPress={() => {
//                         const isCurrentlyMonitoring = item.status === 'MONITOR';
//                         // If it's already Blue, reset to Green (OK). 
//                         // If it's anything else (Red/Yellow/Green), force it to Blue (MONITOR).
//                         updateItemProperty(sIdx, iIdx, { 
//                           status: isCurrentlyMonitoring ? 'OK' : 'MONITOR',
//                           isMonitor: !isCurrentlyMonitoring
//                         });
//                       }}
//                     >
//                       <Ionicons 
//                         name={item.isMonitor ? "eye" : "eye-outline"} 
//                         size={moderateScale(18)} 
//                         color={item.isMonitor ? "#FFF" : "#666"} 
//                       />
//                     </TouchableOpacity>

//                     {/* STATUS TOGGLE */}
//                     <TouchableOpacity 
//                       style={[styles.statusToggle, { backgroundColor: getStatusColor(item.status) }]}
//                       onPress={() => {
//                         const next = getNextStatus(item.status);
//                         updateItemProperty(sIdx, iIdx, { status: next });
//                       }}
//                     >
//                       <Ionicons name={item.status === 'OK' ? "checkmark" : "alert"} size={moderateScale(20)} color="#FFF" />
//                     </TouchableOpacity>
//                   </View>
//                   <TouchableOpacity style={styles.notesTrigger} onPress={() => { setActiveItem({ sIdx, iIdx }); setTempNote(item.notes || ""); setNoteModalVisible(true); }}>
//                     <Text style={{ color: item.notes ? '#333' : '#999', fontSize: moderateScale(13) }}>{item.notes || "Tap to add details..."}</Text>
//                   </TouchableOpacity>
//                 </View>
//               ))}
//             </View>
//           );
//         })}
//       </ScrollView>

//       {/* FOOTER ACTION BUTTON */}
//       {pendingItems.length > 0 && (
//         <View style={styles.footerContainer}>
//           <TouchableOpacity 
//             style={styles.reviewBtn} 
//             onPress={() => setReviewModalVisible(true)}
//           >
//             <Text style={styles.reviewBtnText}>REVIEW {pendingItems.length} FINDINGS</Text>
//             <Ionicons name="arrow-forward" size={moderateScale(18)} color="#FFF" />
//           </TouchableOpacity>
//         </View>
//       )}

//       {/* MIC & MODALS */}
//       <TouchableOpacity style={[styles.micBtn, isListening && styles.micBtnActive]} onPress={startListeningSimulator}>
//         <Ionicons name="mic" size={moderateScale(32)} color="#FFF" />
//       </TouchableOpacity>
//       {isListening && <View style={styles.transcriptOverlay}><Text style={styles.transcriptText}>{transcript}</Text></View>}
      
//       <Modal visible={noteModalVisible} transparent animationType="fade">
//         <View style={styles.modalOverlay}>
//           <View style={styles.modalContent}>
//             <View style={styles.modalHeader}><Text style={styles.modalTitle}>Item Details</Text><TouchableOpacity onPress={() => setNoteModalVisible(false)}><Ionicons name="close-circle" size={28} color="#999" /></TouchableOpacity></View>
//             <TextInput style={styles.modalInput} multiline autoFocus value={tempNote} onChangeText={setTempNote} placeholder="Enter findings..." blurOnSubmit={true} onSubmitEditing={() => Keyboard.dismiss()} returnKeyType="done" />
//             <TouchableOpacity style={styles.saveBtn} onPress={() => { if (activeItem) updateItemProperty(activeItem.sIdx, activeItem.iIdx, { notes: tempNote }); setNoteModalVisible(false); }}>
//               <Text style={styles.saveBtnText}>SAVE & DONE</Text>
//             </TouchableOpacity>
//           </View>
//         </View>
//       </Modal>

//       {/* STEP 2: REVIEW CALLS MODAL */}
//       <FindingsReviewModal 
//         visible={reviewModalVisible}
//         onClose={() => setReviewModalVisible(false)}
//         items={pendingItems} // This is your useMemo'd list of non-OK items
//         callDetails={callDetails}
//         onUpdateDetail={updateCallDetail}
//         onProceed={proceedToCustomerReport}
//       />

//       {/* PHASE 3: CUSTOMER REPORT LAYER */}
//       <CustomerReportModal 
//         visible={reportModalVisible}
//         onClose={() => setReportModalVisible(false)}
//         items={pendingItems}
//         reportNotes={finalReportNotes}
//         onUpdateNote={updateReportNote}
//         onProceed={proceedToLogistics}
//       />

//       {/* PHASE 4: LOGISTICS & METADATA */}
//       <LaborModal 
//         visible={logisticsModalVisible}
//         onClose={() => setLogisticsModalVisible(false)}
//         techLogs={techLogs}
//         onUpdateLogs={setTechLogs} // Passes the state setter directly
//         onProceed={() => {
//           setLogisticsModalVisible(false);
//           setFinalReviewVisible(true);
//         }}
//       />

//       {/* PHASE 5: FINAL REVIEW & SUBMISSION */}
//       <FinalReviewModal 
//         visible={finalReviewVisible}
//         isSubmitting={isSubmitting}
//         onClose={() => setFinalReviewVisible(false)}
//         data={{
//           techLogs: techLogs,
//           pendingItems: pendingItems,
//           reportNotes: finalReportNotes
//         }}
//         onSubmit={handleFinalSubmit}
//       />
//     </View>
//   );
// }

// const styles = StyleSheet.create({
//   container: { flex: 1, backgroundColor: '#F4F7F6' },
//   appHeader: { 
//     flexDirection: 'row', 
//     alignItems: 'center', 
//     justifyContent: 'space-between', 
//     paddingHorizontal: moderateScale(15),
//     paddingTop: Platform.OS === 'ios' ? 5 : 5, 
//     height: Platform.OS === 'ios' ? 65 : 65, 
//     backgroundColor: '#FFF', 
//     borderBottomWidth: 1, 
//     borderBottomColor: '#EEE' 
//   },
//   headerTitle: { fontSize: moderateScale(17), fontWeight: 'bold' },
//   scrollContainer: { padding: moderateScale(15), paddingBottom: moderateScale(110) },
//   pendingContainer: { backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#EEE', elevation: 3, zIndex: 10 },
//   pendingHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: moderateScale(15), backgroundColor: '#F8F9FA' },
//   pendingTitleRow: { flexDirection: 'row', alignItems: 'center' },
//   pendingCountBadge: { backgroundColor: '#FF5252', width: moderateScale(22), height: moderateScale(22), borderRadius: 11, justifyContent: 'center', alignItems: 'center', marginRight: 10 },
//   pendingCountText: { color: '#FFF', fontSize: moderateScale(12), fontWeight: 'bold' },
//   pendingTitle: { fontSize: moderateScale(15), fontWeight: '700', color: '#333' },
//   pendingList: { paddingHorizontal: moderateScale(15), paddingBottom: moderateScale(10), maxHeight: moderateScale(200) },
//   pendingItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: moderateScale(8), borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
//   statusDot: { width: 8, height: 8, borderRadius: 4, marginRight: 10 },
//   pendingLabel: { fontSize: moderateScale(13), fontWeight: '600', color: '#444' },
//   pendingNote: { fontSize: moderateScale(11), color: '#888', fontStyle: 'italic' },
//   pendingStatusText: { fontSize: moderateScale(10), fontWeight: '800', marginLeft: 10 },
//   monitorBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#007AFF', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, marginRight: 8 },
//   monitorBadgeText: { color: '#FFF', fontSize: 8, fontWeight: 'bold', marginLeft: 3 },
//   sectionCard: { backgroundColor: '#FFF', borderRadius: moderateScale(12), padding: moderateScale(15), marginBottom: moderateScale(15), elevation: 2 },
//   sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
//   sectionTitleRow: { flexDirection: 'row', alignItems: 'center', flex: 1 },
//   sectionTitle: { fontSize: moderateScale(15), fontWeight: 'bold', marginLeft: moderateScale(8) },
//   bulkOkBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F0F7FF', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
//   bulkOkText: { fontSize: 10, color: '#007AFF', marginLeft: 4, fontWeight: '800' },
//   issueBadge: { backgroundColor: '#FF5252', borderRadius: moderateScale(10), paddingHorizontal: moderateScale(6), marginLeft: moderateScale(8) },
//   issueBadgeText: { color: '#FFF', fontSize: moderateScale(10), fontWeight: 'bold' },
//   itemWrapper: { marginTop: moderateScale(15), borderTopWidth: 1, borderTopColor: '#F0F0F0', paddingTop: moderateScale(10) },
//   itemRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
//   itemLabel: { fontSize: moderateScale(14), fontWeight: '600' },
//   statusSubLabel: { fontSize: moderateScale(10), fontWeight: '800', marginTop: 2 },
//   monitorBtn: { width: moderateScale(38), height: moderateScale(38), borderRadius: 19, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F0F0F0', marginRight: 10, borderWidth: 1, borderColor: '#DDD' },
//   monitorBtnActive: { backgroundColor: '#007AFF', borderColor: '#0056b3' },
//   statusToggle: { width: moderateScale(38), height: moderateScale(38), borderRadius: 19, justifyContent: 'center', alignItems: 'center' },
//   notesTrigger: { marginTop: moderateScale(10), backgroundColor: '#F9F9F9', borderRadius: moderateScale(8), padding: moderateScale(12), borderWidth: 1, borderColor: '#EEE' },
//   modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-start', paddingTop: moderateScale(80) },
//   modalContent: { marginHorizontal: 20, backgroundColor: '#FFF', borderRadius: 20, padding: 20, elevation: 20 },
//   modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
//   modalTitle: { fontSize: 18, fontWeight: 'bold' },
//   modalInput: { backgroundColor: '#F5F5F5', borderRadius: 12, padding: 15, fontSize: 16, minHeight: 120, textAlignVertical: 'top' },
//   saveBtn: { backgroundColor: '#1A1A1A', padding: 15, borderRadius: 12, alignItems: 'center', marginTop: 15 },
//   saveBtnText: { color: '#FFF', fontWeight: 'bold' },
//   micBtn: { position: 'absolute', bottom: moderateScale(30), right: moderateScale(30), width: moderateScale(65), height: moderateScale(65), borderRadius: 35, backgroundColor: '#1A1A1A', justifyContent: 'center', alignItems: 'center', elevation: 10 },
//   micBtnActive: { backgroundColor: '#FF5252' },
//   transcriptOverlay: { position: 'absolute', bottom: moderateScale(110), left: 20, right: 20, backgroundColor: 'rgba(0,0,0,0.9)', padding: 15, borderRadius: 12 },
//   transcriptText: { color: '#FFF', textAlign: 'center', fontWeight: 'bold' },
//   footerContainer: {
//     position: 'absolute',
//     bottom: moderateScale(100), // Sits above the Mic button
//     left: 0,
//     right: 0,
//     alignItems: 'center',
//     paddingHorizontal: moderateScale(20),
//   },
//   reviewBtn: {
//     backgroundColor: '#007AFF',
//     flexDirection: 'row',
//     alignItems: 'center',
//     justifyContent: 'center',
//     paddingVertical: moderateScale(14),
//     paddingHorizontal: moderateScale(25),
//     borderRadius: moderateScale(30),
//     elevation: 5,
//     shadowColor: '#000',
//     shadowOffset: { width: 0, height: 2 },
//     shadowOpacity: 0.25,
//     shadowRadius: 3.84,
//   },
//   reviewBtnText: {
//     color: '#FFF',
//     fontSize: moderateScale(14),
//     fontWeight: '800',
//     marginRight: 10,
//     letterSpacing: 1,
//   },
//   reviewInstruction: { fontSize: moderateScale(13), color: '#666', marginBottom: 20 },
//   reviewCard: { backgroundColor: '#F8F9FA', borderRadius: 12, padding: 15, marginBottom: 15, borderWidth: 1, borderColor: '#EEE' },
//   reviewItemHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
//   reviewItemLabel: { 
//     fontSize: moderateScale(14), 
//     fontWeight: '700', 
//     color: '#333',
//     textTransform: 'capitalize' // Ensures 'hoist ; motor' looks professional
//   },
//   inputGrid: { flexDirection: 'row', justifyContent: 'space-between' },
//   inputWrapper: { width: '48%' },
//   inputLabel: { fontSize: 10, color: '#888', fontWeight: 'bold', marginBottom: 4, textTransform: 'uppercase' },
//   smallInput: { backgroundColor: '#FFF', borderWidth: 1, borderColor: '#DDD', borderRadius: 6, padding: 8, fontSize: 14 },
//   modalFooter: { padding: 20, borderTopWidth: 1, borderTopColor: '#EEE' },
//   proceedBtn: { backgroundColor: '#28a745', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 16, borderRadius: 12 },
//   proceedBtnText: { color: '#FFF', fontWeight: 'bold', marginRight: 10 },
//   reviewGroup: {
//     marginBottom: 25,
//   },
//   reviewSectionHeader: {
//     fontSize: moderateScale(12),
//     fontWeight: '800',
//     color: '#007AFF',
//     marginBottom: 10,
//     letterSpacing: 1,
//     paddingLeft: 5,
//   },
//   reviewCard: { 
//     backgroundColor: '#F8F9FA', 
//     borderRadius: 12, 
//     padding: 15, 
//     marginBottom: 10, // Reduced margin since they are grouped
//     borderWidth: 1, 
//     borderColor: '#EEE' 
//   },
//   modalMainContainer: {
//     backgroundColor: '#FFF',
//     // Ensures the content starts below the camera/notch area
//     paddingTop: Platform.OS === 'ios' ? moderateScale(45) : moderateScale(10), 
//     flex: 1,
//   },
//   reportCard: { backgroundColor: '#FFF', borderRadius: 12, padding: 15, marginBottom: 15, borderWidth: 1, borderColor: '#DDD' },
//   reportHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
//   reportItemPath: { fontSize: moderateScale(12), fontWeight: 'bold', color: '#666' },
//   statusBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 },
//   statusBadgeText: { color: '#FFF', fontSize: 10, fontWeight: '800' },
//   reportEditor: { backgroundColor: '#F9F9F9', borderRadius: 8, padding: 12, fontSize: 14, color: '#333', minHeight: 60, borderWidth: 1, borderColor: '#EEE' },
//   logCard: { backgroundColor: '#FFF', borderRadius: 12, padding: 15, marginBottom: 15, borderWidth: 1, borderColor: '#DDD', elevation: 2 },
//   logHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
//   techNameInput: { fontSize: 16, fontWeight: 'bold', color: '#333', flex: 1, borderBottomWidth: 1, borderBottomColor: '#EEE', paddingVertical: 4 },
//   dateDisplay: { 
//     flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
//     backgroundColor: '#F9F9F9', borderWidth: 1, borderColor: '#DDD', borderRadius: 6, padding: 8
//   },
//   typeSelectorContainer: {
//     backgroundColor: '#FFF',
//     padding: moderateScale(15),
//     borderRadius: 12,
//     marginBottom: 15,
//     borderWidth: 1,
//     borderColor: '#EEE'
//   },
//   typeGrid: {
//     marginTop: 5,
//   },
//   typeOption: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     paddingVertical: moderateScale(10),
//     borderBottomWidth: 1,
//     borderBottomColor: '#F0F0F0',
//   },
//   typeOptionActive: {
//     backgroundColor: '#F0F7FF', // Light blue highlight
//     borderRadius: 8,
//     paddingHorizontal: 10,
//     marginHorizontal: -10,
//   },
//   typeOptionText: {
//     fontSize: moderateScale(14),
//     color: '#444',
//     marginLeft: 10,
//     fontWeight: '500'
//   },
//   typeOptionTextActive: {
//     color: '#007AFF',
//     fontWeight: '700'
//   },
//   finalHeaderCard: { 
//     backgroundColor: '#1A1A1A', 
//     padding: 20, 
//     borderRadius: 12, 
//     marginBottom: 10,
//     alignItems: 'center',
//     justifyContent: 'center',
//     height: moderateScale(80), 
//   },
//   finalStatusText: { color: '#28a745', fontWeight: '800', fontSize: 15, marginTop: 4 },
  
//   passStatementBox: { 
//     flexDirection: 'row', 
//     backgroundColor: '#F0FFF4', 
//     padding: 15, 
//     borderRadius: 8, 
//     borderWidth: 1, 
//     borderColor: '#C6F6D5',
//     marginBottom: 20,
//     alignItems: 'center'
//   },
//   passStatementText: { 
//     flex: 1, 
//     fontSize: 12, 
//     color: '#22543D', 
//     marginLeft: 10, 
//     fontStyle: 'italic' 
//   },

//   monitorTag: { 
//     flexDirection: 'row', 
//     alignItems: 'center', 
//     marginTop: 10, 
//     paddingTop: 10, 
//     borderTopWidth: 1, 
//     borderTopColor: '#EBF5FF' 
//   },
//   monitorTagText: { 
//     fontSize: 11, 
//     color: '#007AFF', 
//     fontWeight: '600', 
//     marginLeft: 6 
//   },

//   finalLogDate: { fontSize: 11, color: '#999', marginTop: 2 },
//   sectionDivider: {
//     marginTop: moderateScale(25),
//     marginBottom: moderateScale(10),
//     borderBottomWidth: 2,
//     borderBottomColor: '#F0F0F0',
//     paddingBottom: moderateScale(5),
//   },
//   sectionTitleMain: {
//     fontSize: moderateScale(16),
//     fontWeight: '800',
//     color: '#1A1A1A',
//     letterSpacing: 0.5,
//   },
//   finalFindingCard: {
//     backgroundColor: '#FFF',
//     borderRadius: moderateScale(8),
//     marginBottom: moderateScale(12),
//     padding: moderateScale(12),
//     borderWidth: 1,
//     borderColor: '#EEE',
//     borderLeftWidth: 5, // Status color highlight
//     shadowColor: '#000',
//     shadowOffset: { width: 0, height: 1 },
//     shadowOpacity: 0.05,
//     elevation: 2,
//   },
//   findingTopRow: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     marginBottom: moderateScale(8),
//   },
//   itemIndex: {
//     fontSize: moderateScale(10),
//     fontWeight: 'bold',
//     color: '#999',
//     marginRight: moderateScale(8),
//   },
//   statusBadgeSmall: {
//     paddingHorizontal: moderateScale(6),
//     paddingVertical: moderateScale(2),
//     borderRadius: moderateScale(4),
//     marginLeft: 'auto',
//   },
//   findingBody: {
//     paddingLeft: moderateScale(18), // Indents the notes relative to the header
//   },
//   monitorBoxIndented: {
//     flexDirection: 'row',
//     alignItems: 'center',
//     marginTop: moderateScale(8),
//     padding: moderateScale(8),
//     backgroundColor: '#F0F7FF',
//     borderRadius: moderateScale(6),
//   },
//   monitorTextIndented: {
//     fontSize: moderateScale(11),
//     color: '#007AFF',
//     fontWeight: '600',
//     marginLeft: moderateScale(6),
//     fontStyle: 'italic',
//   },
//   laborContainerCard: {
//     backgroundColor: '#FFF',
//     borderRadius: moderateScale(8),
//     borderWidth: 1,
//     borderColor: '#EEE',
//     overflow: 'hidden',
//     marginBottom: moderateScale(30),
//   },
//   laborRow: {
//     flexDirection: 'row',
//     justifyContent: 'space-between',
//     alignItems: 'center',
//     padding: moderateScale(15),
//     borderBottomWidth: 1,
//     borderBottomColor: '#F5F5F5',
//   },
//   techDisplayName: {
//     fontSize: moderateScale(14),
//     fontWeight: '700',
//     color: '#333',
//   },
//   techDateDisplay: {
//     fontSize: moderateScale(12),
//     color: '#999',
//   },
//   laborHoursBadge: {
//     backgroundColor: '#F0F0F0',
//     paddingHorizontal: moderateScale(10),
//     paddingVertical: moderateScale(4),
//     borderRadius: moderateScale(15),
//   },
//   hoursText: {
//     fontSize: moderateScale(13),
//     fontWeight: 'bold',
//     color: '#444',
//   },
// });

import React, { useState, useEffect, useContext, useMemo } from 'react';
import { 
  View, Text, StyleSheet, ScrollView, TouchableOpacity, 
  TextInput, Alert, Keyboard, Modal, Platform 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { UserContext } from '../components/MyContexts';
import { COLORS } from '../theme';
import { moderateScale } from '../utils/metrics';
import { generateChecklist } from '../utils/Checklists';
import { 
  FindingsReviewModal, 
  CustomerReportModal, 
  LaborModal, 
  FinalReviewModal 
} from '../components/modals/MyModals';
import { db } from "../lib/firebase";
import { doc, collection, arrayUnion, writeBatch } from 'firebase/firestore';

export default function InspectionFormScreen({ navigation }) {
  // currentEquipment now contains our new hoistSpecs, bridgeSpecs, etc.
  const { currentEquipment, user, currentCustomer } = useContext(UserContext);
  
  // --- STATE ---
  const [checklist, setChecklist] = useState([]);
  const [collapsedSections, setCollapsedSections] = useState({});
  const [inspectionType, setInspectionType] = useState('Monthly');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Logic States
  const [pendingCollapsed, setPendingCollapsed] = useState(true);
  const [noteModalVisible, setNoteModalVisible] = useState(false);
  const [activeItem, setActiveItem] = useState(null); 
  const [tempNote, setTempNote] = useState("");

  // Modal Flow States
  const [reviewModalVisible, setReviewModalVisible] = useState(false);
  const [reportModalVisible, setReportModalVisible] = useState(false); 
  const [logisticsModalVisible, setLogisticsModalVisible] = useState(false);
  const [finalReviewVisible, setFinalReviewVisible] = useState(false);

  // New Phase States
  const [callDetails, setCallDetails] = useState({}); 
  const [finalReportNotes, setFinalReportNotes] = useState({});
  const [techLogs, setTechLogs] = useState([
    { 
      id: user.uid, 
      name: user.userDisplayName || "Lead Technician", 
      hours: "2.0", 
      date: new Date().toISOString()
    }
  ]);

  const inspectionTypes = ['Monthly', '6-Week', '12-Week', '6-Month', 'Annual'];

  // --- CHECKLIST GENERATION (Type-Aware) ---
  useEffect(() => {
    if (currentEquipment) {
      // Pass the whole equipment object so the utility can check equipType/hoistType
      const fullData = generateChecklist(currentEquipment);
      
      // Filter out sections based on Equipment Type
      // e.g., If Jib, remove "Bridge" sections
      const filteredData = fullData.filter(section => {
        const name = section.section.toLowerCase();
        if (currentEquipment.equipType === 'Jib' && name.includes('bridge')) {
          return false;
        }
        return true;
      });

      setChecklist(filteredData);
      
      // Auto-collapse sections by default
      const initialCollapseState = {};
      filteredData.forEach(section => { initialCollapseState[section.section] = true; });
      setCollapsedSections(initialCollapseState);
    }
  }, [currentEquipment]);

  // --- LOGIC: PENDING CALLS ---
  const pendingItems = useMemo(() => {
    const pending = [];
    checklist.forEach(section => {
      section.items.forEach(item => {
        if (item.status === 'REPAIR' || item.status === 'ATTENTION' || item.isMonitor) {
          pending.push({ ...item, sectionName: section.section });
        }
      });
    });
    return pending;
  }, [checklist]);

  // Helper for updating modal data
  const updateCallDetail = (itemId, field, value) => {
    setCallDetails(prev => ({
      ...prev,
      [itemId]: { ...(prev[itemId] || {}), [field]: value }
    }));
  };

  const updateReportNote = (itemId, value) => {
    setFinalReportNotes(prev => ({ ...prev, [itemId]: value }));
  };

  // Triggered when Technician finishes Phase 3 (Customer Report)
  const proceedToLogistics = () => {
    const cleanedNotes = { ...finalReportNotes };
    pendingItems.forEach(item => {
      let currentText = cleanedNotes[item.id] !== undefined 
        ? cleanedNotes[item.id] 
        : (item.notes || "");

      // Strip voice prefixes for the professional report
      cleanedNotes[item.id] = currentText.replace("[Voice]: ", "").trim();
    });
    setFinalReportNotes(cleanedNotes);
    setReportModalVisible(false);
    setLogisticsModalVisible(true);
  };

  const handleFinalSubmit = async () => {
    setIsSubmitting(true);
    try {
      const batch = writeBatch(db); 
      const reportId = doc(collection(db, "temp")).id;
      const timestamp = new Date().toISOString();
      
      // NEW PATH: Matching our Equipment Profile structure
      const basePath = `customers/${currentCustomer.id}/cranes/${currentEquipment.unitId}`;

      // --- PACKAGE ONE: The Inspection Archive ---
      const archiveRef = doc(db, "customers", currentCustomer.id, "inspections_pending", reportId);
      batch.set(archiveRef, {
        reportId,
        inspectionType,
        inspector: user?.userDisplayName || "Technician",
        unitId: currentEquipment.unitId,
        equipType: currentEquipment.equipType,
        date: timestamp,
        fullChecklist: checklist, 
        techLogs,
        // Stamping the specs as they exist TODAY
        equipmentSnapShot: {
          hoistSpecs: currentEquipment.hoistSpecs || {},
          bridgeSpecs: currentEquipment.bridgeSpecs || {},
          trolleySpecs: currentEquipment.trolleySpecs || {},
          officialCapacity: currentEquipment.officialCapacity || 'N/A'
        },
        status: "AWAITING_REVIEW"
      });

      // --- PACKAGE TWO: The Service Log (History Entry) ---
      const repairCount = pendingItems.filter(i => i.status === 'REPAIR').length;
      const attentionCount = pendingItems.filter(i => i.status === 'ATTENTION').length;
      const monitorCount = pendingItems.filter(i => i.isMonitor).length;
      
      const serviceLogRef = doc(collection(db, basePath, "serviceLogs"));
      batch.set(serviceLogRef, {
        date: timestamp,
        inspectionType,
        inspector: user.userDisplayName,
        summary: pendingItems.length === 0 ? "No issues found" : `${pendingItems.length} items flagged`,
        findings: pendingItems.map(item => `${item.sectionName}: ${item.label}`),
        reportId,
        hasIssues: (repairCount + attentionCount) > 0,
        severity: repairCount > 0 ? 'REPAIR' : (attentionCount > 0 ? 'ATTENTION' : 'HEALTHY')
      });

      // --- PACKAGE THREE: Live Pulse (Active Issues List) ---
      // We clear the old activeIssues for this unit first (handled via a separate delete in production logic usually)
      // For now, we update/set the current flagged items
      pendingItems.forEach(item => {
        const issueId = `${item.sectionName}-${item.label}`.replace(/\s+/g, '');
        const activeIssueRef = doc(db, basePath, "activeIssues", issueId);
        batch.set(activeIssueRef, {
          sectionName: item.sectionName,
          label: item.label,
          status: item.status,
          notes: finalReportNotes[item.id] || item.notes || "",
          date: timestamp,
          inspector: user.userDisplayName,
          reportId
        }, { merge: true });
      });

      await batch.commit();

      Alert.alert("Success", "Inspection report synced to cloud.", [
        { text: "OK", onPress: () => {
          setFinalReviewVisible(false); 
          setTimeout(() => { navigation.popToTop(); }, 100);
        }}
      ]);

    } catch (err) {
      console.error("SUBMIT ERROR: ", err);
      Alert.alert("Submission Failed", "Please check your connection and try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- UI HELPERS ---
  const getNextStatus = (currentStatus) => {
    const sequence = { 'OK': 'ATTENTION', 'ATTENTION': 'MONITOR', 'MONITOR': 'REPAIR', 'REPAIR': 'OK' };
    return sequence[currentStatus] || 'OK';
  };

  const getStatusColor = (status) => {
    if (status === 'REPAIR') return '#EF4444';
    if (status === 'ATTENTION') return '#F59E0B';
    if (status === 'MONITOR') return '#3B82F6';
    return '#10B981';
  };

  const updateItemProperty = (sIdx, iIdx, props) => {
    const next = [...checklist];
    next[sIdx].items[iIdx] = { ...next[sIdx].items[iIdx], ...props };
    setChecklist(next);
  };

  return (
    <View style={styles.container}>
      {/* HEADER - No SafeAreaView, manual notch padding */}
      <View style={styles.appHeader}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="chevron-back" size={moderateScale(24)} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{currentEquipment.unitId} Inspection</Text>
        <View style={{ width: moderateScale(24) }} /> 
      </View>

      {/* PENDING SUMMARY (Floating Header) */}
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
              <Text style={styles.pendingTitle}>Active Findings</Text>
            </View>
            <Ionicons name={pendingCollapsed ? "chevron-down" : "chevron-up"} size={18} color="#007AFF" />
          </TouchableOpacity>
          {!pendingCollapsed && (
            <ScrollView style={styles.pendingList} nestedScrollEnabled>
              {pendingItems.map((item, idx) => (
                <View key={idx} style={styles.pendingItem}>
                  <View style={[styles.statusDot, { backgroundColor: getStatusColor(item.status) }]} />
                  <Text style={styles.pendingLabel}>{item.sectionName} : {item.label}</Text>
                </View>
              ))}
            </ScrollView>
          )}
        </View>
      )}

      <ScrollView contentContainerStyle={styles.scrollContainer} keyboardShouldPersistTaps="handled">
        {/* TYPE SELECTOR */}
        <View style={styles.typeSelectorContainer}>
          <Text style={styles.typeLabel}>Interval:</Text>
          <View style={styles.typeGrid}>
            {inspectionTypes.map((type) => (
              <TouchableOpacity 
                key={type} 
                onPress={() => setInspectionType(type)}
                style={[styles.typeOption, inspectionType === type && styles.typeOptionActive]}
              >
                <Text style={[styles.typeOptionText, inspectionType === type && styles.typeOptionTextActive]}>{type}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* DYNAMIC CHECKLIST */}
        {checklist.map((section, sIdx) => (
          <View key={section.section} style={styles.sectionCard}>
            <TouchableOpacity 
              style={styles.sectionHeader}
              onPress={() => setCollapsedSections(prev => ({...prev, [section.section]: !prev[section.section]}))}
            >
              <Text style={styles.sectionTitle}>{section.section}</Text>
              <Ionicons name={collapsedSections[section.section] ? "chevron-forward" : "chevron-down"} size={18} color="#999" />
            </TouchableOpacity>

            {!collapsedSections[section.section] && section.items.map((item, iIdx) => (
              <View key={item.id} style={styles.itemWrapper}>
                <View style={styles.itemRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.itemLabel}>{item.label}</Text>
                    <Text style={[styles.statusSubLabel, { color: getStatusColor(item.status) }]}>{item.status}</Text>
                  </View>

                  <TouchableOpacity 
                    style={[styles.statusToggle, { backgroundColor: getStatusColor(item.status) }]}
                    onPress={() => updateItemProperty(sIdx, iIdx, { status: getNextStatus(item.status) })}
                  >
                    <Ionicons name={item.status === 'OK' ? "checkmark" : "alert"} size={20} color="#FFF" />
                  </TouchableOpacity>
                </View>
                
                <TouchableOpacity 
                  style={styles.notesTrigger} 
                  onPress={() => { setActiveItem({ sIdx, iIdx }); setTempNote(item.notes || ""); setNoteModalVisible(true); }}
                >
                  <Text style={{ color: item.notes ? '#333' : '#AAA', fontSize: moderateScale(12) }}>
                    {item.notes || "Tap to add specific findings..."}
                  </Text>
                </TouchableOpacity>
              </View>
            ))}
          </View>
        ))}
      </ScrollView>

      {/* FOOTER ACTIONS */}
      {pendingItems.length > 0 && (
        <View style={styles.footerContainer}>
          <TouchableOpacity style={styles.reviewBtn} onPress={() => setReviewModalVisible(true)}>
            <Text style={styles.reviewBtnText}>REVIEW {pendingItems.length} FINDINGS</Text>
            <Ionicons name="arrow-forward" size={18} color="#FFF" />
          </TouchableOpacity>
        </View>
      )}

      {/* MODALS (Review, Report, Labor, Final) */}
      <FindingsReviewModal 
        visible={reviewModalVisible} 
        onClose={() => setReviewModalVisible(false)} 
        items={pendingItems}
        onProceed={() => { setReviewModalVisible(false); setReportModalVisible(true); }} 
      />

      <CustomerReportModal 
        visible={reportModalVisible} 
        onClose={() => setReportModalVisible(false)} 
        items={pendingItems} 
        reportNotes={finalReportNotes}
        onUpdateNote={updateReportNote}
        onProceed={proceedToLogistics} 
      />

      <LaborModal 
        visible={logisticsModalVisible} 
        onClose={() => setLogisticsModalVisible(false)} 
        techLogs={techLogs} 
        onUpdateLogs={setTechLogs} 
        onProceed={() => { setLogisticsModalVisible(false); setFinalReviewVisible(true); }} 
      />

      <FinalReviewModal 
        visible={finalReviewVisible} 
        isSubmitting={isSubmitting}
        data={{ techLogs, pendingItems, reportNotes: finalReportNotes }}
        onSubmit={handleFinalSubmit}
        onClose={() => setFinalReviewVisible(false)} 
      />

      {/* NOTES MODAL */}
      <Modal visible={noteModalVisible} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <TextInput 
              style={styles.modalInput} 
              multiline value={tempNote} 
              onChangeText={setTempNote} 
              placeholder="Internal technical notes..." 
            />
            <TouchableOpacity 
              style={styles.saveBtn} 
              onPress={() => { updateItemProperty(activeItem.sIdx, activeItem.iIdx, { notes: tempNote }); setNoteModalVisible(false); }}
            >
              <Text style={styles.saveBtnText}>SAVE NOTE</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F4F7F6' },
  appHeader: { 
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', 
    paddingHorizontal: moderateScale(15), paddingTop: Platform.OS === 'ios' ? 50 : 20, 
    height: Platform.OS === 'ios' ? 95 : 70, backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#EEE' 
  },
  headerTitle: { fontSize: moderateScale(17), fontWeight: 'bold', color: '#1A1A1A' },
  scrollContainer: { padding: moderateScale(15), paddingBottom: moderateScale(120) },
  pendingContainer: { backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#EEE', elevation: 3, zIndex: 10 },
  pendingHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: moderateScale(15) },
  pendingTitleRow: { flexDirection: 'row', alignItems: 'center' },
  pendingCountBadge: { backgroundColor: '#EF4444', width: moderateScale(20), height: moderateScale(20), borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginRight: 10 },
  pendingCountText: { color: '#FFF', fontSize: moderateScale(11), fontWeight: 'bold' },
  pendingTitle: { fontSize: moderateScale(14), fontWeight: '700', color: '#333' },
  pendingList: { paddingHorizontal: moderateScale(15), paddingBottom: moderateScale(10), maxHeight: moderateScale(150) },
  pendingItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: moderateScale(6) },
  statusDot: { width: 6, height: 6, borderRadius: 3, marginRight: 10 },
  pendingLabel: { fontSize: moderateScale(12), color: '#666' },
  typeSelectorContainer: { backgroundColor: '#FFF', padding: moderateScale(15), borderRadius: 12, marginBottom: 15 },
  typeLabel: { fontSize: 10, fontWeight: '800', color: '#999', textTransform: 'uppercase', marginBottom: 10 },
  typeGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  typeOption: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, backgroundColor: '#F3F4F6', marginRight: 8, marginBottom: 8 },
  typeOptionActive: { backgroundColor: '#007AFF' },
  typeOptionText: { fontSize: 12, color: '#666', fontWeight: '600' },
  typeOptionTextActive: { color: '#FFF' },
  sectionCard: { backgroundColor: '#FFF', borderRadius: 12, padding: moderateScale(15), marginBottom: 15, elevation: 2 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionTitle: { fontSize: moderateScale(15), fontWeight: 'bold', color: '#1A1A1A' },
  itemWrapper: { marginTop: moderateScale(15), borderTopWidth: 1, borderTopColor: '#F9FAFB', paddingTop: moderateScale(10) },
  itemRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  itemLabel: { fontSize: moderateScale(14), fontWeight: '600', color: '#333' },
  statusSubLabel: { fontSize: 9, fontWeight: '900', marginTop: 2, textTransform: 'uppercase' },
  statusToggle: { width: moderateScale(36), height: moderateScale(36), borderRadius: 18, justifyContent: 'center', alignItems: 'center' },
  notesTrigger: { marginTop: moderateScale(8), backgroundColor: '#F9FAFB', borderRadius: 8, padding: 10, borderWidth: 1, borderColor: '#F3F4F6' },
  footerContainer: { position: 'absolute', bottom: moderateScale(30), left: 0, right: 0, alignItems: 'center' },
  reviewBtn: { backgroundColor: '#007AFF', flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 25, borderRadius: 30, elevation: 5 },
  reviewBtnText: { color: '#FFF', fontSize: 13, fontWeight: '800', marginRight: 10 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
  modalContent: { backgroundColor: '#FFF', borderRadius: 20, padding: 20 },
  modalInput: { backgroundColor: '#F3F4F6', borderRadius: 12, padding: 15, minHeight: 100, textAlignVertical: 'top' },
  saveBtn: { backgroundColor: '#1A1A1A', padding: 15, borderRadius: 12, alignItems: 'center', marginTop: 15 },
  saveBtnText: { color: '#FFF', fontWeight: 'bold' }
});