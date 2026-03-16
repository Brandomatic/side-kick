import React, { useState, useEffect, useContext, useMemo } from 'react';
import { 
  View, 
  Text, 
  FlatList, 
  StyleSheet, 
  ActivityIndicator, 
  TouchableOpacity,
  Alert
} from 'react-native';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { UserContext } from '../components/MyContexts';
import { PATHS } from '../utils/Paths';
import { moderateScale } from '../utils/metrics';
import { COLORS } from '../theme';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function MonitorWatchlistScreen() {
  const { currentCustomer, user } = useContext(UserContext);
  const insets = useSafeAreaInsets();
  
  const [activeIssues, setActiveIssues] = useState([]);
  const [loading, setLoading] = useState(true);

  // 1. Listen to the same Live Pulse document as the Dashboard
  useEffect(() => {
    if (!currentCustomer?.id || !user?.companyId) return;

    const pulseRef = doc(db, PATHS.livePulse(user.companyId, currentCustomer.id));
    
    const unsubscribe = onSnapshot(pulseRef, (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setActiveIssues(data.activeIssues || []);
      }
      setLoading(false);
    }, (err) => {
      console.error("Pulse Listener Error:", err);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [currentCustomer?.id]);

  // 2. Pull only the items where type is "MONITOR"
  const monitorItems = useMemo(() => {
    return activeIssues.filter(issue => issue.type === "MONITOR");
  }, [activeIssues]);

  const renderMonitorCard = ({ item }) => (
    <TouchableOpacity 
      style={styles.monitorCard}
      activeOpacity={0.7}
      onPress={() => Alert.alert(
        item.unitId,
        `Component: ${item.compDesc}\n\nNotes: ${item.techNotes}\n\nInspector: ${item.inspector}`
      )}
    >
      <View style={styles.cardHeader}>
        <View style={styles.unitBadge}>
          <Text style={styles.unitText}>UNIT {item.unitId}</Text>
        </View>
        <Text style={styles.dateText}>
          {new Date(item.date).toLocaleDateString()}
        </Text>
      </View>

      <Text style={styles.compTitle}>{item.compDesc}</Text>
      
      {item.techNotes && (
        <Text style={styles.notesText} numberOfLines={3}>
          {item.techNotes}
        </Text>
      )}

      <View style={styles.footer}>
        <View style={styles.techInfo}>
          <Ionicons name="person-circle-outline" size={moderateScale(14)} color="#AAA" />
          <Text style={styles.techName}>{item.inspector}</Text>
        </View>
        <Ionicons name="eye" size={moderateScale(18)} color={COLORS.primary} />
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color={COLORS.primary} />
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingBottom: insets.bottom }]}>
      <View style={styles.headerInfo}>
        <Text style={styles.siteLabel}>{currentCustomer?.custName}</Text>
        <Text style={styles.countLabel}>{monitorItems.length} Items Watching</Text>
      </View>

      <FlatList
        data={monitorItems}
        keyExtractor={(item) => item.issueId}
        renderItem={renderMonitorCard}
        contentContainerStyle={styles.listPadding}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Ionicons name="shield-checkmark" size={moderateScale(50)} color="#DDD" />
            <Text style={styles.emptyText}>No active monitoring items.</Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F4F7F6' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  headerInfo: {
    padding: moderateScale(15),
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#EEE',
  },
  siteLabel: { fontSize: moderateScale(14), fontWeight: '800', color: '#333', textTransform: 'uppercase' },
  countLabel: { fontSize: moderateScale(12), color: COLORS.primary, fontWeight: '600', marginTop: 2 },
  listPadding: { padding: moderateScale(15) },
  monitorCard: {
    backgroundColor: '#FFF',
    borderRadius: moderateScale(12),
    padding: moderateScale(15),
    marginBottom: moderateScale(15),
    borderLeftWidth: moderateScale(4),
    borderLeftColor: COLORS.primary, // Using primary blue for "Watch"
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 5,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: moderateScale(10) },
  unitBadge: { backgroundColor: '#333', paddingHorizontal: moderateScale(8), paddingVertical: moderateScale(2), borderRadius: moderateScale(4) },
  unitText: { color: '#FFF', fontSize: moderateScale(10), fontWeight: 'bold' },
  dateText: { fontSize: moderateScale(11), color: '#999' },
  compTitle: { fontSize: moderateScale(16), fontWeight: '700', color: '#1A1A1A' },
  notesText: { fontSize: moderateScale(13), color: '#666', marginTop: moderateScale(6), lineHeight: moderateScale(18), fontStyle: 'italic' },
  footer: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    alignItems: 'center', 
    marginTop: moderateScale(15), 
    paddingTop: moderateScale(10), 
    borderTopWidth: 1, 
    borderTopColor: '#F5F5F5' 
  },
  techInfo: { flexDirection: 'row', alignItems: 'center' },
  techName: { fontSize: moderateScale(11), color: '#AAA', marginLeft: moderateScale(4) },
  emptyState: { alignItems: 'center', marginTop: moderateScale(80) },
  emptyText: { color: '#AAA', marginTop: moderateScale(10), fontSize: moderateScale(14) }
});