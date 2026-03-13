import React, { useContext, useState, useEffect, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import { writeBatch, arrayUnion, doc, collection, onSnapshot } from 'firebase/firestore';
import { UserContext } from '../components/MyContexts';
import { PATHS } from '../utils/Paths';
import { db } from '../lib/firebase';
import { ResolutionModal } from '../components/modals/MyModals';
import { getStatusColor } from '../utils/MyHelperFunctions';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { moderateScale, SCREEN_WIDTH } from '../utils/metrics';
import { COLORS } from '../theme';

export default function DashboardScreen({ navigation }) {
  const insets = useSafeAreaInsets();
  const { currentCustomer, user } = useContext(UserContext); 
  const [resolutionModalVisible, setResolutionModalVisible] = useState(false);
  const [selectedIssue, setSelectedIssue] = useState(null);
  const [pulseData, setPulseData] = useState({ activeIssues: [], recentEvents: [] });
  const [siteStats, setSiteStats] = useState({ numCranes: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!currentCustomer?.path) return;

    // A) Listen to the LIVE PULSE
    // Path: companies/{code}/customers/{id}/status/livePulse
    const pulseRef = doc(db, PATHS.livePulse(user.companyId, currentCustomer.id));
    const unsubPulse = onSnapshot(pulseRef, (snap) => {
      if (snap.exists()) {
        setPulseData(snap.data());
      }
      setLoading(false);
    }, (error) => {
      console.error("Pulse Sync Error:", error);
      setLoading(false);
    });

    // B) Listen to the PROFILE (The "Totals" for Health Math)
    // Path: companies/{code}/customers/{id}/assets/custProfile
    const profileRef = doc(db, currentCustomer.path, "assets", "custProfile");
    const unsubProfile = onSnapshot(profileRef, (snap) => {
      if (snap.exists()) setSiteStats(snap.data());
    });

    return () => {
      unsubPulse();
      unsubProfile();
    };
  }, [currentCustomer?.path]);

  const handleResolveSubmit = async (item, techNotes) => {
    if (!item || !currentCustomer?.path) return;

    try {
      const timestamp = new Date().toISOString();
      const batch = writeBatch(db);

      // A) UPDATE LIVE PULSE
      const pulseRef = doc(db, currentCustomer.path, "status", "livePulse");
      const updatedIssues = pulseData.activeIssues.filter(i => i.issueId !== item.issueId);
      
      batch.update(pulseRef, {
        activeIssues: updatedIssues,
        recentEvents: arrayUnion({
          type: 'REPAIR',
          unitId: item.unitId,
          summary: `Repair Completed: ${item.compDesc}`,
          date: timestamp,
          tech: user?.userDisplayName || 'Technician'
        })
      });

      // B) LOG TO EQUIPMENT SERVICE HISTORY
      // Updated path to use the hierarchical tenant structure
      const serviceLogRef = doc(collection(db, currentCustomer.path, "assets", "custProfile", "cranes", item.equipmentId, "serviceHistory"));
      
      batch.set(serviceLogRef, {
        date: timestamp,
        type: 'REPAIR_RESOLUTION',
        component: item.compDesc,
        originalInspector: item.inspector,
        originalIssue: item.techNotes,
        resolutionNotes: techNotes,
        technician: user?.userDisplayName
      });

      await batch.commit();
      
      setResolutionModalVisible(false);
      setSelectedIssue(null);
      Alert.alert("Success", "Repair logged and dashboard updated.");
    } catch (error) {
      console.error("Resolution Sync Error:", error);
      Alert.alert("Error", "Could not sync resolution.");
    }
  };

  // Helper to format the timestamp
  const formatTime = (ts) => {
    if (!ts) return '';
    const date = ts.toDate();
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const triggerResolution = (issue) => {
    setSelectedIssue(issue);
    setResolutionModalVisible(true);
  };

  // --- Derived Calculations ---
const counts = useMemo(() => {
  const issues = pulseData.activeIssues || [];
  return {
    repair: issues.filter(i => i.type === 'REPAIR').length,
    attention: issues.filter(i => i.type === 'ATTENTION').length,
    monitor: issues.filter(i => i.type === 'MONITOR' || i.type === 'MONITORING').length,
  };
}, [pulseData.activeIssues]);

const healthPercent = useMemo(() => {
  const total = siteStats.numCranes || 0;
  if (total === 0) return 100;
  // Unique count of equipment IDs that have an active issue
  const brokenUnits = new Set(pulseData.activeIssues?.map(i => i.equipmentId)).size;
  return Math.round(((total - brokenUnits) / total) * 100);
}, [siteStats.numCranes, pulseData.activeIssues]);

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom }]}>
      {/* HEADER: Contextual Site Name */}
      <View style={{ paddingHorizontal: moderateScale(15), paddingTop: moderateScale(10) }}>
        <Text style={styles.contextLabel}>{currentCustomer?.custName || "No Site Selected"}</Text>
      </View>

      <ScrollView 
        style={styles.container} 
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {/* SECTION 1: ACTION GRID */}
        <View style={styles.actionGrid}>
          <TouchableOpacity 
            style={styles.mainActionCard}
            onPress={() => navigation.navigate('QRScanner')}
          >
            <Ionicons name="qr-code-outline" size={moderateScale(40)} color={COLORS.primary} />
            <Text style={styles.actionText}>Scan QR Code</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.mainActionCard}
            onPress={() => navigation.navigate('MonitorList')}
          >
            <View>
              <Ionicons name="eye-outline" size={moderateScale(40)} color={COLORS.primary} />
              {counts.monitor > 0 && (
                <View style={styles.badge}>
                  <Text style={styles.badgeText}>{counts.monitor}</Text>
                </View>
              )}
            </View>
            <Text style={styles.actionText}>Monitoring</Text>
          </TouchableOpacity>
        </View>

        {/* SECTION 2: FLEET HEALTH STATS */}
        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={[styles.statNumber, { color: '#D32F2F' }]}>{counts.repair}</Text>
            <Text style={styles.statLabel}>Repairs</Text>
          </View>

          <View style={styles.statBox}>
            <Text style={[styles.statNumber, { color: '#FBC02D' }]}>{counts.attention}</Text>
            <Text style={styles.statLabel}>Attention</Text>
          </View>

          <View style={styles.statBox}>
            <Text style={[
              styles.statNumber, 
              { color: healthPercent > 90 ? '#4CAF50' : healthPercent > 70 ? '#FBC02D' : '#D32F2F' }
            ]}>
              {healthPercent}%
            </Text>
            <Text style={styles.statLabel}>Health</Text>
          </View>
        </View>

        {/* SECTION 3: ACTIVE FINDINGS (PULSE LIST) */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: 15 }}>
          <Text style={styles.sectionHeader}>Active Findings</Text>
          <Text style={{ fontSize: 10, color: '#999', marginBottom: 18 }}>HOLD TO RESOLVE</Text>
        </View>

        {loading ? (
          <ActivityIndicator color={COLORS.primary} size="large" style={{ marginTop: 20 }} />
        ) : pulseData.activeIssues?.length === 0 ? (
          <View style={styles.emptyActivity}>
            <Ionicons name="checkmark-circle-outline" size={40} color="#4CAF50" />
            <Text style={styles.emptyText}>All systems operational.</Text>
          </View>
        ) : (
          pulseData.activeIssues.map((issue) => (
            <TouchableOpacity 
              key={issue.issueId} 
              style={[
                styles.recentCard, 
                { borderLeftColor: getStatusColor(issue.type) }
              ]}
              onLongPress={() => triggerResolution(issue)} // Opens Resolution Modal
              onPress={() => Alert.alert(
              `${issue.unitId} Details`, 
              `Component: ${issue.compDesc}\n\nInspector: ${issue.inspector}\n\nNotes: ${issue.techNotes || "No notes"}`
            )}
            >
              <View style={styles.cardInfo}>
                <Text style={styles.unitName}>{issue.unitId}</Text>
                <Text style={styles.subDetailText}>{issue.compDesc}</Text>
                <Text style={styles.unitLocation}>
                  Logged: {new Date(issue.date).toLocaleDateString()}
                </Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color="#CCC" />
            </TouchableOpacity>
          ))
        )}

        {/* SECTION 4: RECENT ACTIVITY (OPTIONAL LOG) */}
        {/* You can map pulseData.recentEvents here if you want the "Feed" back */}

        <View style={{ height: moderateScale(100) }} />
      </ScrollView>

      {/* RESOLUTION MODAL: Imported from MyModals.js */}
      <ResolutionModal 
        visible={resolutionModalVisible}
        item={selectedIssue}
        onClose={() => setResolutionModalVisible(false)}
        onResolve={handleResolveSubmit} 
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F4F7F6' },
  content: { padding: moderateScale(15) },
  
  // SITE HEADER
  contextLabel: {
    fontSize: moderateScale(14),
    fontWeight: '700',
    color: COLORS.primary,
    marginBottom: moderateScale(10),
    textTransform: 'uppercase',
    letterSpacing: 1,
  },

  // ACTION GRID (QR & Monitoring)
  actionGrid: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    marginBottom: moderateScale(25) 
  },
  mainActionCard: {
    backgroundColor: '#FFF',
    width: (SCREEN_WIDTH / 2) - moderateScale(22),
    height: moderateScale(120),
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 5,
    position: 'relative', // Added for absolute positioning of icons/badges
  },
  actionText: { 
    marginTop: moderateScale(10), 
    fontWeight: '700', 
    fontSize: moderateScale(14), 
    color: '#333' 
  },

  // THE TOP-RIGHT EYE ICON
  monitorIconTopRight: {
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // BADGE (For the numbers on cards)
  badge: {
    position: 'absolute',
    top: -moderateScale(8),   // Lift it slightly above the icon
    right: -moderateScale(12), // Shift it to the right of the icon
    backgroundColor: '#FF3B30',
    borderRadius: moderateScale(10),
    minWidth: moderateScale(20),
    height: moderateScale(20),
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
    borderWidth: 2,
    borderColor: '#FFF', // Creates a "cutout" look against the icon
    zIndex: 10,
  },
  badgeText: { 
    color: '#FFF', 
    fontSize: moderateScale(10), 
    fontWeight: '800' 
  },

  // FLEET HEALTH STATS ROW
  statsRow: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    marginBottom: moderateScale(25) 
  },
  statBox: { 
    backgroundColor: '#FFF', 
    padding: moderateScale(12),
    borderRadius: 15, 
    width: '31%',
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 5,
  },
  statNumber: { 
    fontSize: moderateScale(20),
    fontWeight: 'bold', 
  },
  statLabel: { 
    fontSize: moderateScale(10),
    color: '#888',
    marginTop: moderateScale(4),
    fontWeight: '600'
  },

  // RECENT ACTIVITY SECTION
  sectionHeader: { 
    fontSize: moderateScale(18), 
    fontWeight: 'bold', 
    marginBottom: moderateScale(15), 
    color: '#1A1A1A' 
  },
  recentCard: {
    backgroundColor: '#FFF',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: moderateScale(15),
    borderRadius: 12,
    marginBottom: moderateScale(10),
    elevation: 2,
    borderLeftWidth: 5, // Visual "Status Strip"
  },
  cardInfo: { flex: 1, marginRight: moderateScale(10) },
  unitName: { fontSize: moderateScale(16), fontWeight: '600', color: '#333' },
  subDetailText: { 
    fontSize: moderateScale(13), 
    color: '#666', 
    marginTop: moderateScale(4), 
    fontStyle: 'italic' 
  },
  unitLocation: { fontSize: moderateScale(12), color: '#999', marginTop: moderateScale(2) },
  
  statusBadge: { 
    paddingHorizontal: moderateScale(8), 
    paddingVertical: moderateScale(4), 
    borderRadius: 6 
  },
  
  emptyActivity: { padding: moderateScale(20), alignItems: 'center' },
  emptyText: { color: '#AAA', fontStyle: 'italic' },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: moderateScale(20),
  },
  modalContent: {
    backgroundColor: '#FFF',
    borderRadius: 15,
    padding: moderateScale(20),
    elevation: 5,
  },
  modalTitle: { fontSize: 18, fontWeight: '800', color: '#333' },
  modalSubTitle: { fontSize: 14, color: '#666', marginBottom: 15 },
  modalInput: {
    backgroundColor: '#F9F9F9',
    borderRadius: 10,
    padding: 15,
    height: 100,
    textAlignVertical: 'top',
    borderWidth: 1,
    borderColor: '#EEE',
    marginBottom: 20,
  },
  modalBtnRow: { flexDirection: 'row', justifyContent: 'space-between' },
  cancelBtn: { padding: 15, flex: 1, alignItems: 'center' },
  confirmBtn: { 
    backgroundColor: '#4CAF50', 
    padding: 15, 
    flex: 1, 
    borderRadius: 10, 
    alignItems: 'center' 
  },
  confirmBtnText: { color: '#FFF', fontWeight: 'bold' },
  cancelBtnText: { color: '#999', fontWeight: '600' },
});