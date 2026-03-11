import React, { useState, useContext, useEffect } from 'react';
import { 
  View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, 
  Alert, KeyboardAvoidingView, Platform, ActivityIndicator 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../lib/firebase"; 
import { UserContext } from '../components/MyContexts';
import { moderateScale } from '../utils/metrics'; 

// --- REUSABLE COLLAPSIBLE SECTION COMPONENT ---
const CollapsibleSection = ({ title, isOpen, toggle, children }) => (
  <View style={styles.sectionWrapper}>
    <TouchableOpacity style={styles.sectionHeader} onPress={toggle}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <Ionicons name={isOpen ? "chevron-up" : "chevron-down"} size={20} color="#666" />
    </TouchableOpacity>
    {isOpen && <View style={styles.sectionBody}>{children}</View>}
  </View>
);

// --- REUSABLE POWER TOGGLE COMPONENT ---
const PowerToggle = ({ label, isPowered, onToggle }) => (
  <View style={styles.toggleContainer}>
    <Text style={styles.toggleLabel}>{label} Power Source:</Text>
    <View style={styles.typeRow}>
      <TouchableOpacity 
        style={[styles.miniTab, isPowered && styles.activeTab]} 
        onPress={() => onToggle(true)}
      >
        <Text style={[styles.tabText, isPowered && styles.activeTabText]}>POWERED</Text>
      </TouchableOpacity>
      <TouchableOpacity 
        style={[styles.miniTab, !isPowered && styles.activeTabManual]} 
        onPress={() => onToggle(false)}
      >
        <Text style={[styles.tabText, !isPowered && styles.activeTabText]}>MANUAL</Text>
      </TouchableOpacity>
    </View>
  </View>
);

export default function AddEquipmentScreen({ navigation }) {
  const { currentCustomer, user } = useContext(UserContext);

  const [unitId, setUnitId] = useState('');
  const [equipType, setEquipType] = useState('SGUS'); 
  const [hoistType, setHoistType] = useState('Wire Rope');
  const [serialNum, setSerialNum] = useState('');
  const [officialCapacity, setOfficialCapacity] = useState('');

  const [sections, setSections] = useState({ bridge: false, hoist: false, trolley: false });
  const [isSaving, setIsSaving] = useState(false);

  // Added isPowered flags to the specs state
  const [specs, setSpecs] = useState({
    equipMfg: '',
    hMfg: '', hSN: '', hMod: '', hCap: '', hPowered: true,
    bMfg: '', bSN: '', bMod: '', bCap: '', bPowered: true,
    tMfg: '', tSN: '', tMod: '', tCap: '', tPowered: true,
  });

  useEffect(() => {
    const ratings = [specs.hCap, specs.bCap, specs.tCap]
      .map(v => parseFloat(v))
      .filter(v => !isNaN(v));
    
    if (ratings.length > 0) {
      setOfficialCapacity(Math.min(...ratings).toString());
    }
  }, [specs.hCap, specs.bCap, specs.tCap]);

  const updateSpec = (field, value) => setSpecs(prev => ({ ...prev, [field]: value }));
  const toggleSection = (section) => setSections(prev => ({ ...prev, [section]: !prev[section] }));

  const handleCreateAsset = async (stayOnScreen = false) => {
    if (!unitId.trim() || !serialNum.trim() || !officialCapacity.trim()) {
      Alert.alert("Required Fields", "Please fill Unit ID, Serial Number, and Capacity.");
      return;
    }

    setIsSaving(true);
    try {
      const craneIdSlug = unitId.trim().toLowerCase().replace(/\s+/g, '-');
      
      const newCraneData = {
        unitId: unitId.trim(),
        serialNum: serialNum.trim(),
        equipType,
        officialCapacity,
        equipMfg: specs.equipMfg,
        hoistType,
        // Saving the isPowered flags so the Checklist Util can filter electrical items
        hoistSpecs: { mfg: specs.hMfg, sn: specs.hSN, mod: specs.hMod, cap: specs.hCap, isPowered: specs.hPowered },
        bridgeSpecs: { mfg: specs.bMfg, sn: specs.bSN, mod: specs.bMod, cap: specs.bCap, isPowered: specs.bPowered },
        trolleySpecs: { mfg: specs.tMfg, sn: specs.tSN, mod: specs.tMod, cap: specs.tCap, isPowered: specs.tPowered },
        metadata: {
          addedBy: user?.uid,
          createdAt: serverTimestamp(),
        }
      };

      const docRef = doc(db, currentCustomer.path, 'cranes', craneIdSlug);
      await setDoc(docRef, newCraneData);

      if (stayOnScreen) {
        setUnitId(''); setSerialNum(''); setOfficialCapacity('');
        Alert.alert("Success", "Equipment added.");
      } else {
        navigation.goBack();
      }
    } catch (error) {
      Alert.alert("Error", "Save failed.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1 }}>
      <ScrollView style={styles.container} contentContainerStyle={styles.scrollContent}>
        
        <Text style={styles.title}>Register Equipment</Text>
        <Text style={styles.subText}>{currentCustomer?.name}</Text>

        <View style={styles.requiredBox}>
          <Text style={styles.label}>Unit ID / Asset # *</Text>
          <TextInput style={styles.input} value={unitId} onChangeText={setUnitId} placeholder="e.g. 19005" />

          <Text style={styles.label}>Equipment Serial # *</Text>
          <TextInput style={styles.input} value={serialNum} onChangeText={setSerialNum} placeholder="Bridge Serial" />

          <Text style={styles.label}>Unit Type *</Text>
          <View style={styles.typeRow}>
            {['SGUS', 'DGUS', 'DGTR', 'JIB'].map(t => (
              <TouchableOpacity key={t} style={[styles.miniTab, equipType === t && styles.activeTab]} onPress={() => setEquipType(t)}>
                <Text style={[styles.tabText, equipType === t && styles.activeTabText]}>{t}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.label}>Hoist Type (Sheet Logic) *</Text>
          <View style={styles.typeRow}>
            {['Wire Rope', 'Chain'].map(h => (
              <TouchableOpacity key={h} style={[styles.typeCard, hoistType === h && styles.selectedCard]} onPress={() => setHoistType(h)}>
                <Text style={[styles.typeText, hoistType === h && styles.selectedTypeText]}>{h}</Text>
              </TouchableOpacity>
            ))}
          </View>

          <Text style={styles.label}>Official Capacity (Tons) *</Text>
          <TextInput style={[styles.input, { fontWeight: 'bold' }]} value={officialCapacity} onChangeText={setOfficialCapacity} keyboardType="numeric" placeholder="Calculated from components" />
        </View>

        {/* BRIDGE SECTION */}
        <CollapsibleSection title="Bridge Specs" isOpen={sections.bridge} toggle={() => toggleSection('bridge')}>
          <PowerToggle label="Bridge" isPowered={specs.bPowered} onToggle={v => updateSpec('bPowered', v)} />
          <TextInput style={styles.input} placeholder="Bridge Mfg" onChangeText={v => updateSpec('bMfg', v)} />
          <TextInput style={styles.input} placeholder="Bridge Capacity" keyboardType="numeric" onChangeText={v => updateSpec('bCap', v)} />
          <TextInput style={styles.input} placeholder="Bridge Model" onChangeText={v => updateSpec('bMod', v)} />
        </CollapsibleSection>

        {/* HOIST SECTION */}
        <CollapsibleSection title="Hoist Specs" isOpen={sections.hoist} toggle={() => toggleSection('hoist')}>
          <PowerToggle label="Hoist" isPowered={specs.hPowered} onToggle={v => updateSpec('hPowered', v)} />
          <TextInput style={styles.input} placeholder="Hoist Mfg" onChangeText={v => updateSpec('hMfg', v)} />
          <TextInput style={styles.input} placeholder="Hoist Capacity" keyboardType="numeric" onChangeText={v => updateSpec('hCap', v)} />
          <TextInput style={styles.input} placeholder="Hoist Serial #" onChangeText={v => updateSpec('hSN', v)} />
        </CollapsibleSection>

        {/* TROLLEY SECTION */}
        <CollapsibleSection title="Trolley Specs" isOpen={sections.trolley} toggle={() => toggleSection('trolley')}>
          <PowerToggle label="Trolley" isPowered={specs.tPowered} onToggle={v => updateSpec('tPowered', v)} />
          <TextInput style={styles.input} placeholder="Trolley Mfg" onChangeText={v => updateSpec('tMfg', v)} />
          <TextInput style={styles.input} placeholder="Trolley Capacity" keyboardType="numeric" onChangeText={v => updateSpec('tCap', v)} />
        </CollapsibleSection>

        <View style={styles.buttonRow}>
          <TouchableOpacity style={styles.submitBtn} onPress={() => handleCreateAsset(false)} disabled={isSaving}>
            {isSaving ? <ActivityIndicator color="#FFF" /> : <Text style={styles.submitBtnText}>SAVE EQUIPMENT</Text>}
          </TouchableOpacity>
        </View>
        <View style={{height: 40}} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F4F7F6' },
  scrollContent: { padding: moderateScale(20) },
  title: { fontSize: moderateScale(22), fontWeight: 'bold', color: '#1A1A1A' },
  subText: { fontSize: moderateScale(14), color: '#666' },
  requiredBox: { backgroundColor: '#FFF', padding: moderateScale(15), borderRadius: 12, marginTop: 20, elevation: 2 },
  label: { fontSize: moderateScale(10), fontWeight: '800', color: '#888', marginBottom: 5, marginTop: 15, textTransform: 'uppercase' },
  input: { backgroundColor: '#F9F9F9', borderRadius: 8, padding: 12, borderWidth: 1, borderColor: '#EEE', marginBottom: 10 },
  typeRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  toggleContainer: { marginBottom: 15, borderBottomWidth: 1, borderBottomColor: '#F0F0F0', pb: 10 },
  toggleLabel: { fontSize: 10, fontWeight: '700', color: '#444', marginBottom: 8, textTransform: 'uppercase' },
  miniTab: { flex: 1, padding: 10, alignItems: 'center', backgroundColor: '#F0F0F0', marginHorizontal: 2, borderRadius: 6 },
  activeTab: { backgroundColor: '#10B981' }, // Green for Powered
  activeTabManual: { backgroundColor: '#F59E0B' }, // Orange for Manual
  tabText: { fontSize: 10, fontWeight: 'bold', color: '#666' },
  activeTabText: { color: '#FFF' },
  typeCard: { flex: 1, padding: 10, alignItems: 'center', backgroundColor: '#F0F0F0', marginHorizontal: 2, borderRadius: 6 },
  selectedCard: { backgroundColor: '#007AFF' },
  typeText: { fontSize: 11, fontWeight: 'bold', color: '#666' },
  selectedTypeText: { color: '#FFF' },
  sectionWrapper: { marginTop: 15, backgroundColor: '#FFF', borderRadius: 12, overflow: 'hidden', elevation: 1 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', padding: 15, alignItems: 'center', backgroundColor: '#FFF' },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: '#333' },
  sectionBody: { padding: 15, borderTopWidth: 1, borderTopColor: '#F4F4F4' },
  buttonRow: { marginTop: 30 },
  submitBtn: { backgroundColor: '#1A1A1A', padding: 18, borderRadius: 12, alignItems: 'center' },
  submitBtnText: { color: '#FFF', fontWeight: 'bold' }
});