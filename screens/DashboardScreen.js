import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, FlatList } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { moderateScale, SCREEN_WIDTH } from '../utils/metrics';
import { COLORS } from '../theme';

// Mock Data for "Recent Activity"
const RECENT_EQUIPMENT = [
  { id: '1', name: 'Tower Crane A-12', location: 'Site North', status: 'Clear', time: '2h ago' },
  { id: '2', name: 'Service Lift 04', location: 'Warehouse B', status: 'Warning', time: '5h ago' },
  { id: '3', name: 'Escalator E-09', location: 'Main Lobby', status: 'Clear', time: 'Yesterday' },
];

export default function DashboardScreen({ navigation }) {
  const insets = useSafeAreaInsets();

  return (
    <View style={[
      styles.container, 
      { paddingBottom: insets.bottom } // Dynamic padding
    ]}>
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        
        {/* SECTION: Action Buttons */}
        <View style={styles.actionGrid}>
          <TouchableOpacity 
            style={styles.mainActionCard}
            onPress={() => navigation.navigate('QRScanner')}
            >
            <Ionicons name="qr-code-outline" size={moderateScale(40)} color={COLORS.primary} />
            <Text style={styles.actionText}>Scan QR Code</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.mainActionCard}>
            <Ionicons name="mic-outline" size={moderateScale(40)} color={COLORS.primary} />
            <Text style={styles.actionText}>Voice Log</Text>
          </TouchableOpacity>
        </View>

        {/* SECTION: Quick Stats */}
        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statNumber}>12</Text>
            <Text style={styles.statLabel}>Pending</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={[styles.statNumber, { color: '#4CAF50' }]}>85%</Text>
            <Text style={styles.statLabel}>Fleet Health</Text>
          </View>
        </View>

        {/* SECTION: Recent Inspections */}
        <Text style={styles.sectionHeader}>Recent Activity</Text>
        {RECENT_EQUIPMENT.map((item) => (
          <TouchableOpacity key={item.id} 
          style={styles.recentCard}
          onPress={() => navigation.navigate('EquipmentDetail', { unitId: item.id })}
          >
            <View style={styles.cardInfo}>
              <Text style={styles.unitName}>{item.name}</Text>
              <Text style={styles.unitLocation}>{item.location} • {item.time}</Text>
            </View>
            <View style={[styles.statusBadge, { backgroundColor: item.status === 'Clear' ? '#E8F5E9' : '#FFEBEE' }]}>
              <Text style={{ color: item.status === 'Clear' ? '#2E7D32' : '#C62828', fontSize: 12, fontWeight: 'bold' }}>
                {item.status.toUpperCase()}
              </Text>
            </View>
          </TouchableOpacity>
        ))}

        {/* Spacing for floating tab bar */}
        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F4F7F6' },
  content: { padding: moderateScale(15) },
  actionGrid: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 25 },
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
  },
  actionText: { marginTop: 10, fontWeight: '700', fontSize: moderateScale(14), color: '#333' },
  statsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 25 },
  statBox: { backgroundColor: '#FFF', padding: 20, borderRadius: 15, width: '48%', alignItems: 'center' },
  statNumber: { fontSize: 24, fontWeight: 'bold', color: COLORS.primary },
  statLabel: { fontSize: 12, color: '#888' },
  sectionHeader: { fontSize: 18, fontWeight: 'bold', marginBottom: 15, color: '#1A1A1A' },
  recentCard: {
    backgroundColor: '#FFF',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    borderRadius: 12,
    marginBottom: 10,
  },
  unitName: { fontSize: 16, fontWeight: '600', color: '#333' },
  unitLocation: { fontSize: 13, color: '#777', marginTop: 2 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
});