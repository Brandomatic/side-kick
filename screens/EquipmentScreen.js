import React, { useState } from 'react';
import { View, Text, StyleSheet, FlatList, TextInput, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { moderateScale } from '../utils/metrics';
import { COLORS } from '../theme';

const MOCK_DATA = [
  { id: '101', name: 'Crane Alpha', type: 'Tower Crane', status: 'Clear' },
  { id: '102', name: 'Elevator 02', type: 'Passenger', status: 'Warning' },
  { id: '103', name: 'Escalator North', type: 'Heavy Duty', status: 'Overdue' },
  { id: '104', name: 'Hoist Unit 7', type: 'Material Hoist', status: 'Clear' },
];

export default function EquipmentScreen({ navigation }) {
  const [search, setSearch] = useState('');

  const renderItem = ({ item }) => (
    <TouchableOpacity 
      style={styles.card} 
      onPress={() => navigation.navigate('EquipmentDetail', { unitId: item.id })}
    >
      <View style={[styles.statusLine, { backgroundColor: getStatusColor(item.status) }]} />
      <View style={styles.cardContent}>
        <Text style={styles.unitName}>{item.name} <Text style={styles.unitId}>#{item.id}</Text></Text>
        <Text style={styles.unitType}>{item.type}</Text>
      </View>
      <Ionicons name="chevron-forward" size={20} color="#CCC" />
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.searchSection}>
        <Ionicons name="search" size={20} color="#888" style={{ marginRight: 10 }} />
        <TextInput 
          placeholder="Search by ID or Name..." 
          style={styles.searchInput}
          value={search}
          onChangeText={setSearch}
        />
      </View>

      <FlatList 
        data={MOCK_DATA}
        keyExtractor={item => item.id}
        renderItem={renderItem}
        contentContainerStyle={{ padding: moderateScale(15), paddingBottom: 100 }}
      />
    </View>
  );
}

const getStatusColor = (status) => {
  if (status === 'Clear') return '#4CAF50';
  if (status === 'Warning') return '#FFC107';
  return '#F44336';
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F4F7F6' },
  searchSection: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    margin: moderateScale(15),
    paddingHorizontal: 15,
    borderRadius: 10,
    height: moderateScale(50),
    elevation: 2,
    shadowOpacity: 0.1,
  },
  searchInput: { flex: 1, fontSize: 16 },
  card: {
    backgroundColor: '#FFF',
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    borderRadius: 10,
    overflow: 'hidden',
    paddingRight: 15,
  },
  statusLine: { width: 6, height: '100%' },
  cardContent: { flex: 1, padding: 15 },
  unitName: { fontSize: 18, fontWeight: 'bold', color: '#333' },
  unitId: { fontSize: 14, fontWeight: '400', color: '#888' },
  unitType: { fontSize: 14, color: '#666', marginTop: 4 }
});