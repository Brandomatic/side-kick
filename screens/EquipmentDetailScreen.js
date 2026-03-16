import React, { useContext, useState, useEffect } from 'react';
import { 
  View, Text, StyleSheet, TouchableOpacity, ScrollView, 
  ActivityIndicator, Modal, FlatList, Dimensions
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { UserContext } from '../components/MyContexts';
import { PATHS } from '../utils/Paths';
import { db } from '../lib/firebase';
import { collection, onSnapshot, query, orderBy, limit } from 'firebase/firestore';
import { moderateScale } from '../utils/metrics';
import { COLORS } from '../theme';
import { getStatusColor } from '../utils/MyHelperFunctions';

const SpecRow = ({ label, value }) => {
  // Only hide if the value is truly null, undefined, or an empty string
  if (value === undefined || value === null || value === '') return null;
  
  return (
    <View style={styles.row}>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
    </View>
  );
};

const HistoryCard = ({ log }) => {
  // Determine color and title based on the type of work
  const isRepair = log.logType === "Monitor Resolved" || log.logType === "Repair";
  const statusColor = isRepair ? '#2E7D32' : (log.hasIssues ? '#EF4444' : '#10B981');
  const title = log.logType === "Monitor Resolved" ? "Repair/Monitor Resolved" : `${log.inspectionType || 'Standard'} Inspection`;

  return (
    <View style={[styles.historyCard, { borderLeftColor: statusColor }]}>
      <View style={styles.cardHeader}>
        <View style={{flexDirection: 'row', alignItems: 'center'}}>
          <Ionicons 
            name={isRepair ? "construct" : "clipboard"} 
            size={14} 
            color={statusColor} 
            style={{marginRight: 6}} 
          />
          <Text style={styles.logTitle}>{title}</Text>
        </View>
        <Text style={styles.logDate}>
          {log.date ? new Date(log.date).toLocaleDateString() : 'Recent'}
        </Text>
      </View>

      <Text style={[styles.logSummary, { color: statusColor }]}>
        {log.logType === "Monitor Resolved" ? log.compDesc : log.summary}
      </Text>

      {/* Logic for showing resolution notes vs findings */}
      {log.resolvedDetails ? (
        <Text style={styles.bulletItem}>{log.resolvedDetails}</Text>
      ) : (
        log.findings?.length > 0 && (
          <View style={styles.bulletContainer}>
            {log.findings.map((f, i) => <Text key={i} style={styles.bulletItem}>• {f}</Text>)}
          </View>
        )
      )}

      <View style={styles.footnoteRow}>
        <Text style={styles.techNote}>By: {log.inspector || log.resolvedByName}</Text>
      </View>
    </View>
  );
};

export default function EquipmentDetailScreen({ navigation }) {
  const { currentEquipment, currentCustomer, user } = useContext(UserContext);
  const [isSpecsExpanded, setIsSpecsExpanded] = useState(false);
  
  // Data States
  const [logs, setLogs] = useState([]);
  const [fullLogs, setFullLogs] = useState([]);
  const [activePulse, setActivePulse] = useState([]); 
  const [loading, setLoading] = useState(true);

  // Modal States
  const [historyModalVisible, setHistoryModalVisible] = useState(false);
  const [monitorModalVisible, setMonitorModalVisible] = useState(false);

  useEffect(() => {
    if (!currentCustomer?.path || !currentEquipment?.unitId) return;
    
    // 1. Live Pulse (Active issues)
    const pulseUnsub = onSnapshot(collection(db, PATHS.activeIssues(user.companyId, currentCustomer.id, currentEquipment.unitId)), (snap) => {
      setActivePulse(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    // 2. Recent Service Logs (Limit 5)
    const recentLogsQuery = query(
      collection(db, PATHS.serviceLogs(user.companyId, currentCustomer.id, currentEquipment.unitId)), 
      orderBy('date', 'desc'), 
      limit(5)
    );
    const recentUnsub = onSnapshot(recentLogsQuery, (snap) => {
      setLogs(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    });

    // 3. Full Logs (For Modal)
    const fullLogsQuery = query(collection(db, PATHS.serviceLogs(user.companyId, currentCustomer.id, currentEquipment.unitId)), orderBy('date', 'desc'));
    const fullUnsub = onSnapshot(fullLogsQuery, (snap) => {
      setFullLogs(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    return () => { 
      pulseUnsub();
      recentUnsub(); 
      fullUnsub(); 
    };
  }, [currentCustomer?.path, currentEquipment?.unitId]);

  // --- DERIVED STATS ---
  const repairCount = activePulse.filter(i => i.status === 'REPAIR').length;
  const attentionCount = activePulse.filter(i => i.status === 'ATTENTION').length;
  const monitorCount = activePulse.filter(i => i.status === 'MONITOR').length;

  const currentStatus = repairCount > 0 ? 'REPAIR' : attentionCount > 0 ? 'ATTENTION' : monitorCount > 0 ? 'MONITOR' : 'HEALTHY';
  const e = currentEquipment;

  const handleViewReport = (reportId) => {
    console.log("Navigating to report:", reportId);
  };

  if (!e) return <View style={styles.center}><Text>No equipment selected.</Text></View>;

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* Header Section */}
        <View style={styles.headerSection}>
          <View style={[styles.iconCircle, { borderColor: getStatusColor(currentStatus), borderWidth: 3 }]}>
            <Ionicons name="build" size={moderateScale(40)} color={COLORS.primary} />
            <View style={[styles.statusFlag, { backgroundColor: getStatusColor(currentStatus) }]}>
               <Ionicons 
                name={currentStatus === 'REPAIR' ? 'alert' : (currentStatus === 'HEALTHY' ? 'checkmark' : 'eye')} 
                size={12} color="#FFF" 
              />
            </View>
          </View>

          <Text style={styles.unitId}>{e.unitId}</Text>
          <Text style={styles.subDetailText}>{e.equipType} | SN: {e.serialNum || 'No SN'}</Text>
          
          <View style={styles.severityContainer}>
            {repairCount > 0 && (
              <View style={styles.statusLine}>
                <View style={[styles.inlineBadge, { backgroundColor: getStatusColor('REPAIR') }]}><Text style={styles.badgeTextInline}>{repairCount}</Text></View>
                <Text style={[styles.severityText, { color: getStatusColor('REPAIR') }]}>ITEM NEEDS IMMEDIATE ATTENTION</Text>
              </View>
            )}
            {attentionCount > 0 && (
              <View style={styles.statusLine}>
                <View style={[styles.inlineBadge, { backgroundColor: getStatusColor('ATTENTION') }]}><Text style={styles.badgeTextInline}>{attentionCount}</Text></View>
                <Text style={[styles.severityText, { color: getStatusColor('ATTENTION') }]}>ITEM NEEDS ATTENTION</Text>
              </View>
            )}
            {currentStatus === 'HEALTHY' && !loading && (
              <View style={styles.statusLine}>
                <Ionicons name="checkmark-circle" size={16} color={getStatusColor('HEALTHY')} style={{marginRight: 5}} />
                <Text style={[styles.severityText, { color: getStatusColor('HEALTHY') }]}>UNIT HEALTHY</Text>
              </View>
            )}
          </View>

          {activePulse.length > 0 && (
            <TouchableOpacity style={styles.monitorIndicator} onPress={() => setMonitorModalVisible(true)}>
              <View style={styles.eyeBox}>
                <Ionicons name="eye" size={14} color="#FFF" />
                <Text style={styles.monitorText}>Active Issues</Text>
              </View>
              <View style={styles.miniBadge}><Text style={styles.miniBadgeText}>{activePulse.length}</Text></View>
            </TouchableOpacity>
          )}
        </View>

        {/* Technical Specs Card */}
        <View style={styles.infoCard}>
          <View style={styles.sectionHeaderRow}>
            <Text style={styles.sectionTitle}>Unit Specifications</Text>
            <TouchableOpacity 
              onPress={() => setIsSpecsExpanded(!isSpecsExpanded)}
              style={styles.expandBtn}
            >
              <Text style={styles.expandBtnText}>{isSpecsExpanded ? 'Hide Details' : 'View Details'}</Text>
              <Ionicons 
                name={isSpecsExpanded ? "chevron-up" : "chevron-down"} 
                size={moderateScale(14)} 
                color={COLORS.primary} 
              />
            </TouchableOpacity>
          </View>

          <SpecRow label="Official Capacity" value={e.officialCapacity ? `${e.officialCapacity} Tons` : 'N/A'} />
          <SpecRow label="Manufacturer" value={e.equipMfg} />
          <SpecRow label="Hoist Type" value={e.hoistType} />
          <SpecRow label="Unit Type" value={e.equipType} />

          {/* COLLAPSIBLE SUB-SECTIONS */}
          {isSpecsExpanded && (
            <View style={styles.collapsibleContent}>
              {(e.bridgeSpecs?.mfg || e.bridgeSpecs?.sn) && (
                <View style={styles.specSubSection}>
                  <Text style={styles.miniHeader}>BRIDGE</Text>
                  <SpecRow label="Mfg" value={e.bridgeSpecs?.mfg} />
                  <SpecRow label="Serial" value={e.bridgeSpecs?.sn} />
                  <SpecRow label="Model" value={e.bridgeSpecs?.mod} />
                  <SpecRow label="Capacity" value={e.bridgeSpecs?.cap} />
                </View>
              )}

              {(e.hoistSpecs?.mfg || e.hoistSpecs?.sn) && (
                <View style={styles.specSubSection}>
                  <Text style={styles.miniHeader}>HOIST</Text>
                  <SpecRow label="Mfg" value={e.hoistSpecs?.mfg} />
                  <SpecRow label="Serial" value={e.hoistSpecs?.sn} />
                  <SpecRow label="Model" value={e.hoistSpecs?.mod} />
                  <SpecRow label="Capacity" value={e.hoistSpecs?.cap} />
                </View>
              )}

              {e.trolleySpecs && Object.keys(e.trolleySpecs).length > 0 && (
                <View style={styles.specSubSection}>
                  <Text style={styles.miniHeader}>TROLLEY</Text>
                  <SpecRow label="Mfg" value={e.trolleySpecs.mfg || "N/A"} />
                  <SpecRow label="Serial" value={e.trolleySpecs.sn || "N/A"} />
                  <SpecRow label="Model" value={e.trolleySpecs.mod || "N/A"} />
                  <SpecRow label="Capacity" value={e.trolleySpecs.cap ? `${e.trolleySpecs.cap} Ton` : "N/A"} />
                </View>
              )}
            </View>
          )}
        </View>

        {/* History Section */}
        <View style={styles.sectionHeaderRow}>
          <Text style={styles.sectionTitle}>Recent Service</Text>
          {fullLogs.length > 5 && (
            <TouchableOpacity onPress={() => setHistoryModalVisible(true)}>
              <Text style={styles.viewAllText}>View full history →</Text>
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.logList}>
          {loading ? (
            <ActivityIndicator color={COLORS.primary} />
          ) : logs.length > 0 ? (
            logs.map((log) => (
              <HistoryCard 
                key={log.id} 
                log={log} 
                onPress={() => {
                  // setSelectedReport(log);  Set the specific log for the modal
                  // setHistoryReviewVisible(true);  Open the ServiceHistoryModal
                }} 
              />
            ))
          ) : (
            <Text style={styles.emptyText}>No inspection records found.</Text>
          )}
        </View>

        <View style={{ height: moderateScale(100) }} />
      </ScrollView>

      {/* Pinned Action */}
      <View style={styles.bottomActionContainer}>
        <TouchableOpacity style={styles.actionButton} onPress={() => navigation.navigate('InspectionForm')}>
          <Ionicons name="clipboard-outline" size={24} color="#FFF" />
          <Text style={styles.actionButtonText}>START NEW INSPECTION</Text>
        </TouchableOpacity>
      </View>

      {/* MODALS (History and Pulse) */}
      <Modal visible={historyModalVisible} animationType="slide">
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Full Service History</Text>
            <TouchableOpacity onPress={() => setHistoryModalVisible(false)}><Ionicons name="close" size={28} color="#333" /></TouchableOpacity>
          </View>
          <FlatList 
            data={fullLogs} 
            contentContainerStyle={{ padding: moderateScale(20), paddingBottom: 40 }}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => <HistoryCard log={item} onPress={() => { setHistoryModalVisible(false); handleViewReport(item.reportId); }} />}
          />
        </View>
      </Modal>

      <Modal visible={monitorModalVisible} transparent animationType="fade">
        <View style={styles.darkOverlay}>
          <View style={styles.popupContent}>
            <Text style={styles.modalTitle}>Currently Flagged Items</Text>
            <ScrollView style={{maxHeight: 400, marginTop: 10}}>
              {activePulse.map(item => (
                <View key={item.id} style={styles.monitorItem}>
                  <Ionicons name="alert-circle" size={18} color={getStatusColor(item.status)} />
                  <View style={{marginLeft: 10, flex: 1}}>
                    <Text style={styles.monitorComp}>{item.sectionName}: {item.label}</Text>
                    <Text style={styles.monitorDetails}>{item.techNotes || item.notes || "No Notes"}</Text>
                  </View>
                </View>
              ))}
            </ScrollView>
            <TouchableOpacity style={styles.closePopup} onPress={() => setMonitorModalVisible(false)}><Text style={styles.closePopupText}>Close</Text></TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F8F9FA' },
  scrollContent: { padding: moderateScale(20) },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  headerSection: { alignItems: 'center', marginBottom: 25 },
  iconCircle: { width: 90, height: 90, borderRadius: 45, backgroundColor: '#FFF', justifyContent: 'center', alignItems: 'center', elevation: 4, marginBottom: 15, position: 'relative' },
  unitId: { fontSize: 26, fontWeight: 'bold', color: '#1A1A1A' },
  subDetailText: { fontSize: moderateScale(14), color: '#666', fontWeight: '600', marginTop: 2 },
  statusFlag: { position: 'absolute', bottom: 0, right: 0, width: moderateScale(24), height: moderateScale(24), borderRadius: 12, borderWidth: 3, borderColor: '#F8F9FA', justifyContent: 'center', alignItems: 'center', elevation: 2 },
  infoCard: { backgroundColor: '#FFF', borderRadius: 15, padding: 20, marginBottom: 20, elevation: 2 },
  specSubSection: { marginTop: 15, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#F0F0F0' },
  miniHeader: { fontSize: 10, fontWeight: '900', color: '#1A1A1A', marginBottom: 5, letterSpacing: 1 },
  sectionTitle: { fontSize: 12, fontWeight: '800', color: '#888', textTransform: 'uppercase', letterSpacing: 0.5 },
  sectionHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 },
  viewAllText: { fontSize: 13, color: '#2563EB', fontWeight: '600' },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#F8F9FA' },
  label: { color: '#666', fontSize: moderateScale(13) },
  value: { fontWeight: '700', fontSize: moderateScale(13), color: '#333' },
  historyCard: { backgroundColor: '#FFF', padding: moderateScale(15), borderRadius: 12, marginBottom: moderateScale(15), elevation: 2, borderLeftWidth: 5 },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 5 },
  logTitle: { fontSize: moderateScale(14), fontWeight: '800', color: '#333' },
  logDate: { fontSize: moderateScale(11), color: '#999' },
  logSummary: { fontSize: moderateScale(14), fontWeight: '700', marginTop: 5 },
  bulletContainer: { marginTop: 8, paddingLeft: 5, borderLeftWidth: 1, borderLeftColor: '#F0F0F0', marginLeft: 2 },
  bulletItem: { fontSize: moderateScale(12), color: '#4B5563', lineHeight: 18 },
  footnoteRow: { marginTop: 10, paddingTop: 6, borderTopWidth: 1, borderTopColor: '#F9FAFB', alignItems: 'flex-end' },
  techNote: { fontSize: moderateScale(10), color: '#9CA3AF', fontStyle: 'italic' },
  bottomActionContainer: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: '#F8F9FA', paddingHorizontal: moderateScale(20), paddingBottom: moderateScale(30), paddingTop: moderateScale(10), borderTopWidth: 1, borderTopColor: '#EEE' },
  actionButton: { backgroundColor: '#1A1A1A', flexDirection: 'row', height: moderateScale(60), borderRadius: 12, justifyContent: 'center', alignItems: 'center', elevation: 5 },
  actionButtonText: { color: '#FFF', fontSize: 16, fontWeight: 'bold', marginLeft: 10 },
  severityContainer: { alignItems: 'center', marginTop: moderateScale(5), width: '100%' },
  statusLine: { flexDirection: 'row', alignItems: 'center', marginBottom: moderateScale(4) },
  inlineBadge: { width: moderateScale(18), height: moderateScale(18), borderRadius: 9, justifyContent: 'center', alignItems: 'center', marginRight: moderateScale(8) },
  badgeTextInline: { color: '#FFF', fontSize: moderateScale(10), fontWeight: '900' },
  severityText: { fontSize: moderateScale(11), fontWeight: '800', textTransform: 'uppercase' },
  monitorIndicator: { flexDirection: 'row', marginTop: 10, alignItems: 'center' },
  eyeBox: { backgroundColor: '#1A1A1A', flexDirection: 'row', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, alignItems: 'center' },
  monitorText: { color: '#FFF', fontSize: 11, fontWeight: 'bold', marginLeft: 5 },
  miniBadge: { backgroundColor: '#EF4444', width: 18, height: 18, borderRadius: 9, justifyContent: 'center', alignItems: 'center', marginLeft: -5, marginTop: -15, borderWidth: 2, borderColor: '#F8F9FA' },
  miniBadgeText: { color: '#FFF', fontSize: 9, fontWeight: 'bold' },
  modalContainer: { flex: 1, backgroundColor: '#F8F9FA' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', padding: 20, backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#EEE' },
  modalTitle: { fontSize: 18, fontWeight: 'bold' },
  darkOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 25 },
  popupContent: { backgroundColor: '#FFF', borderRadius: 20, padding: 20 },
  monitorItem: { flexDirection: 'row', marginBottom: 15, paddingBottom: 10, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
  monitorComp: { fontWeight: 'bold', color: '#333' },
  monitorDetails: { fontSize: 12, color: '#666' },
  closePopup: { backgroundColor: '#F3F4F6', padding: 12, borderRadius: 10, alignItems: 'center', marginTop: 10 },
  closePopupText: { fontWeight: 'bold', color: '#333' },
  expandBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F0F4F8',
    paddingHorizontal: moderateScale(10),
    paddingVertical: moderateScale(4),
    borderRadius: moderateScale(6),
  },
  expandBtnText: {
    fontSize: moderateScale(11),
    fontWeight: '700',
    color: COLORS.primary,
    marginRight: moderateScale(4),
  },
  collapsibleContent: {
    marginTop: moderateScale(5),
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    paddingTop: moderateScale(5),
  },
});