import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, FlatList } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { moderateScale } from '../utils/metrics';
import { COLORS } from '../theme';

// Mock Data for a specific unit's history
const INSPECTION_HISTORY = [
  { id: '1', date: 'Feb 10, 2026', tech: 'John Doe', action: 'Monthly Safety Check', status: 'Passed' },
  { id: '2', date: 'Jan 15, 2026', tech: 'Mike Smith', action: 'Cable Lubrication', status: 'Repaired' },
  { id: '3', date: 'Dec 12, 2025', tech: 'John Doe', action: 'Annual Certification', status: 'Passed' },
];

export default function EquipmentDetailScreen({ route, navigation }) {
  const { unitId } = route.params || { unitId: 'Unknown' };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        
        {/* SECTION: Unit Header Card */}
        <View style={styles.headerCard}>
          <View style={styles.iconCircle}>
            <Ionicons name="construct" size={moderateScale(40)} color={COLORS.primary} />
          </View>
          <Text style={styles.unitTitle}>Crane Alpha-7</Text>
          <Text style={styles.unitSub}>ID: {unitId} • Location: North Sector</Text>
          
          <View style={styles.badgeRow}>
            <View style={[styles.statusBadge, { backgroundColor: '#E8F5E9' }]}>
              <Text style={{ color: '#2E7D32', fontWeight: 'bold' }}>ACTIVE</Text>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: '#FFF3E0' }]}>
              <Text style={{ color: '#E65100', fontWeight: 'bold' }}>CERTIFIED</Text>
            </View>
          </View>
        </View>

        {/* SECTION: Quick Stats */}
        <View style={styles.specsContainer}>
          <Text style={styles.sectionTitle}>Specifications</Text>
          <View style={styles.specRow}>
            <Text style={styles.specLabel}>Model:</Text>
            <Text style={styles.specValue}>Terex CC 8800</Text>
          </View>
          <View style={styles.specRow}>
            <Text style={styles.specLabel}>Last Weight Test:</Text>
            <Text style={styles.specValue}>Nov 2025</Text>
          </View>
        </View>

        {/* SECTION: History Timeline */}
        <Text style={styles.sectionTitle}>Inspection History</Text>
        {INSPECTION_HISTORY.map((item, index) => (
          <View key={item.id} style={styles.timelineItem}>
            <View style={styles.timelineLeft}>
              <View style={styles.dot} />
              {index !== INSPECTION_HISTORY.length - 1 && <View style={styles.line} />}
            </View>
            <View style={styles.timelineRight}>
              <Text style={styles.historyDate}>{item.date}</Text>
              <Text style={styles.historyAction}>{item.action}</Text>
              <Text style={styles.historyTech}>By: {item.tech}</Text>
            </View>
          </View>
        ))}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* FLOATING ACTION BUTTON: Start Inspection */}
      <TouchableOpacity 
        style={styles.fab}
        onPress={() => alert('Opening Checklist...')}
      >
        <Ionicons name="clipboard-outline" size={24} color="#FFF" />
        <Text style={styles.fabText}>New Inspection</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F4F7F6' },
  scrollContent: { padding: moderateScale(20) },
  headerCard: {
    backgroundColor: '#FFF',
    borderRadius: 20,
    padding: 25,
    alignItems: 'center',
    marginBottom: 20,
    elevation: 4,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 10,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#F0F4FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
  },
  unitTitle: { fontSize: 22, fontWeight: 'bold', color: '#333' },
  unitSub: { fontSize: 14, color: '#888', marginTop: 5 },
  badgeRow: { flexDirection: 'row', marginTop: 15 },
  statusBadge: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 20, marginRight: 10 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#1A1A1A', marginBottom: 15, marginTop: 10 },
  specsContainer: { backgroundColor: '#FFF', padding: 15, borderRadius: 12, marginBottom: 25 },
  specRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  specLabel: { color: '#888' },
  specValue: { fontWeight: '600', color: '#333' },
  timelineItem: { flexDirection: 'row', minHeight: 70 },
  timelineLeft: { alignItems: 'center', marginRight: 15 },
  dot: { width: 12, height: 12, borderRadius: 6, backgroundColor: COLORS.primary },
  line: { width: 2, flex: 1, backgroundColor: '#DDD' },
  timelineRight: { paddingBottom: 20 },
  historyDate: { fontSize: 12, color: '#888', fontWeight: '600' },
  historyAction: { fontSize: 16, fontWeight: 'bold', color: '#333' },
  historyTech: { fontSize: 14, color: '#666' },
  fab: {
    position: 'absolute',
    bottom: 30,
    right: 20,
    left: 20,
    backgroundColor: COLORS.primary,
    height: 60,
    borderRadius: 30,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
  },
  fabText: { color: '#FFF', fontSize: 18, fontWeight: 'bold', marginLeft: 10 },
});