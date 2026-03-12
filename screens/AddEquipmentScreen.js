import React, { useState, useContext, useEffect } from 'react';
import { 
  View, Text, StyleSheet, TextInput, TouchableOpacity, ScrollView, 
  Alert, KeyboardAvoidingView, Platform, ActivityIndicator,
  TouchableWithoutFeedback, Keyboard 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { doc, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../lib/firebase"; 
import { UserContext } from '../components/MyContexts';
import { PATHS } from '../utils/Paths';
import { moderateScale } from '../utils/metrics'; 
import { COLORS } from '../theme';

// --- REUSABLE COLLAPSIBLE SECTION COMPONENT ---
const CollapsibleSection = ({ title, isOpen, toggle, children }) => (
  <View style={styles.sectionWrapper}>
    <TouchableOpacity style={styles.sectionHeader} onPress={toggle} activeOpacity={0.7}>
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
  const { user, currentCustomer } = useContext(UserContext);

  const [unitId, setUnitId] = useState('');
  const [equipType, setEquipType] = useState('SGUS'); 
  const [hoistType, setHoistType] = useState('Wire Rope');
  const [serialNum, setSerialNum] = useState('');
  const [officialCapacity, setOfficialCapacity] = useState('');
  const [capacityUnit, setCapacityUnit] = useState('TONS');

  const [sections, setSections] = useState({ bridge: false, hoist: false, trolley: false });
  const [isSaving, setIsSaving] = useState(false);

  // Specs state holds all modular data
  const [specs, setSpecs] = useState({
    equipMfg: '',
    hMfg: '', hSN: '', hMod: '', hCap: '', hPowered: true,
    bMfg: '', bSN: '', bMod: '', bCap: '', bPowered: true,
    tMfg: '', tSN: '', tMod: '', tCap: '', tPowered: true,
  });

  // Auto-calculate capacity based on the lowest rated component
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

  const handleCreateAsset = async () => {
    Keyboard.dismiss();
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
        capacityUnit, 
        equipMfg: specs.equipMfg,
        hoistType,
        hoistSpecs: { mfg: specs.hMfg, sn: specs.hSN, mod: specs.hMod, cap: specs.hCap, isPowered: specs.hPowered },
        bridgeSpecs: { mfg: specs.bMfg, sn: specs.bSN, mod: specs.bMod, cap: specs.bCap, isPowered: specs.bPowered },
        trolleySpecs: { mfg: specs.tMfg, sn: specs.tSN, mod: specs.tMod, cap: specs.tCap, isPowered: specs.tPowered },
        metadata: {
          addedBy: user?.uid,
          createdAt: serverTimestamp(),
        }
      };

      const cranePath = PATHS.crane(user.companyId, currentCustomer.id, craneIdSlug);
      await setDoc(doc(db, cranePath), newCraneData);

      Alert.alert("Success", `${unitId} registered successfully.`);
      navigation.goBack();
      
    } catch (error) {
      console.error("Firebase Error:", error);
      Alert.alert("Error", "Save failed. Check your connection.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
      <View style={styles.container}>
        <KeyboardAvoidingView 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'} 
          style={{ flex: 1 }}
          keyboardVerticalOffset={Platform.OS === 'ios' ? moderateScale(90) : 0}
        >
          <ScrollView 
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
          >
            <Text style={styles.title}>Register Equipment</Text>
            <Text style={styles.subText}>{currentCustomer?.custName}</Text>

            <View style={styles.requiredBox}>
              <Text style={styles.label}>Unit ID / Asset # *</Text>
              <TextInput 
                style={styles.input} 
                value={unitId} 
                onChangeText={setUnitId} 
                placeholder="e.g. 19005" 
                placeholderTextColor="#9BA4A5"
              />

              <Text style={styles.label}>Equipment Serial # *</Text>
              <TextInput 
                style={styles.input} 
                value={serialNum} 
                onChangeText={setSerialNum} 
                placeholder="Main System Serial" 
                placeholderTextColor="#9BA4A5"
              />

              <Text style={styles.label}>Unit Type *</Text>
              <View style={styles.typeRow}>
                {['SGUS', 'DGUS', 'DGTR', 'JIB'].map(t => (
                  <TouchableOpacity 
                    key={t} 
                    style={[styles.miniTab, equipType === t && styles.activeTabBlue]} 
                    onPress={() => setEquipType(t)}
                  >
                    <Text style={[styles.tabText, equipType === t && styles.activeTabText]}>{t}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <Text style={styles.label}>Hoist Type *</Text>
              <View style={styles.typeRow}>
                {['Wire Rope', 'Chain'].map(h => (
                  <TouchableOpacity 
                    key={h} 
                    style={[styles.typeCard, hoistType === h && styles.selectedCard]} 
                    onPress={() => setHoistType(h)}
                  >
                    <Text style={[styles.typeText, hoistType === h && styles.selectedTypeText]}>{h}</Text>
                  </TouchableOpacity>
                ))}
              </View>

              <View style={styles.labelRow}>
                <Text style={styles.labelInline}>Official Capacity *</Text>
                <View style={styles.toggleRowSmall}>
                  <TouchableOpacity 
                    style={[styles.unitBtn, capacityUnit === 'TONS' && styles.unitBtnActive]} 
                    onPress={() => setCapacityUnit('TONS')}
                  >
                    <Text style={[styles.unitBtnText, capacityUnit === 'TONS' && styles.unitBtnTextActive]}>TONS</Text>
                  </TouchableOpacity>
                  <TouchableOpacity 
                    style={[styles.unitBtn, capacityUnit === 'TONNES' && styles.unitBtnActive]} 
                    onPress={() => setCapacityUnit('TONNES')}
                  >
                    <Text style={[styles.unitBtnText, capacityUnit === 'TONNES' && styles.unitBtnTextActive]}>TONNES</Text>
                  </TouchableOpacity>
                </View>
              </View>
              <TextInput 
                style={[styles.input, { fontWeight: 'bold' }]} 
                value={officialCapacity} 
                onChangeText={setOfficialCapacity} 
                keyboardType="numeric" 
                placeholder="Capacity" 
                placeholderTextColor="#9BA4A5"
              />
            </View>

            {/* BRIDGE SECTION - Controlled values retain data on collapse */}
            <CollapsibleSection title="Bridge Specs" isOpen={sections.bridge} toggle={() => toggleSection('bridge')}>
              <PowerToggle label="Bridge" isPowered={specs.bPowered} onToggle={v => updateSpec('bPowered', v)} />
              <TextInput style={styles.input} placeholder="Bridge Mfg" value={specs.bMfg} onChangeText={v => updateSpec('bMfg', v)} />
              <TextInput style={styles.input} placeholder="Bridge Capacity" value={specs.bCap} keyboardType="numeric" onChangeText={v => updateSpec('bCap', v)} />
              <TextInput style={styles.input} placeholder="Bridge Model" value={specs.bMod} onChangeText={v => updateSpec('bMod', v)} />
              <TextInput style={styles.input} placeholder="Bridge Serial #" value={specs.bSN} onChangeText={v => updateSpec('bSN', v)} />
            </CollapsibleSection>

            {/* HOIST SECTION - Controlled values retain data on collapse */}
            <CollapsibleSection title="Hoist Specs" isOpen={sections.hoist} toggle={() => toggleSection('hoist')}>
              <PowerToggle label="Hoist" isPowered={specs.hPowered} onToggle={v => updateSpec('hPowered', v)} />
              <TextInput style={styles.input} placeholder="Hoist Mfg" value={specs.hMfg} onChangeText={v => updateSpec('hMfg', v)} />
              <TextInput style={styles.input} placeholder="Hoist Capacity" value={specs.hCap} keyboardType="numeric" onChangeText={v => updateSpec('hCap', v)} />
              <TextInput style={styles.input} placeholder="Hoist Model #" value={specs.hMod} onChangeText={v => updateSpec('hMod', v)} />
              <TextInput style={styles.input} placeholder="Hoist Serial #" value={specs.hSN} onChangeText={v => updateSpec('hSN', v)} />
            </CollapsibleSection>

            {/* TROLLEY SECTION - Controlled values retain data on collapse */}
            <CollapsibleSection title="Trolley Specs" isOpen={sections.trolley} toggle={() => toggleSection('trolley')}>
              <PowerToggle label="Trolley" isPowered={specs.tPowered} onToggle={v => updateSpec('tPowered', v)} />
              <TextInput style={styles.input} placeholder="Trolley Mfg" value={specs.tMfg} onChangeText={v => updateSpec('tMfg', v)} />
              <TextInput style={styles.input} placeholder="Trolley Capacity" value={specs.tCap} keyboardType="numeric" onChangeText={v => updateSpec('tCap', v)} />
              <TextInput style={styles.input} placeholder="Trolley Model #" value={specs.tMod} onChangeText={v => updateSpec('tMod', v)} />
              <TextInput style={styles.input} placeholder="Trolley Serial #" value={specs.tSN} onChangeText={v => updateSpec('tSN', v)} />
            </CollapsibleSection>

            <View style={styles.buttonRow}>
              <TouchableOpacity 
                style={styles.submitBtn} 
                onPress={handleCreateAsset} 
                disabled={isSaving}
              >
                {isSaving ? <ActivityIndicator color="#FFF" /> : <Text style={styles.submitBtnText}>SAVE EQUIPMENT</Text>}
              </TouchableOpacity>
            </View>
            <View style={{height: moderateScale(100)}} />
          </ScrollView>
        </KeyboardAvoidingView>
      </View>
    </TouchableWithoutFeedback>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F4F7F6' },
  scrollContent: { padding: moderateScale(20) },
  title: { fontSize: moderateScale(22), fontWeight: 'bold', color: '#1A1A1A' },
  subText: { fontSize: moderateScale(14), color: '#666' },
  requiredBox: { backgroundColor: '#FFF', padding: moderateScale(15), borderRadius: moderateScale(12), marginTop: moderateScale(20), elevation: 2 },
  label: { fontSize: moderateScale(10), fontWeight: '800', color: '#888', marginBottom: 5, marginTop: 15, textTransform: 'uppercase' },
  labelInline: { fontSize: moderateScale(10), fontWeight: '800', color: '#888', textTransform: 'uppercase' },
  labelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 15, marginBottom: 8 },
  input: { backgroundColor: '#F9F9F9', borderRadius: 8, padding: 12, borderWidth: 1, borderColor: '#EEE', marginBottom: 10, color: '#1A1A1A', fontSize: moderateScale(16) },
  typeRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  toggleContainer: { marginBottom: 15, borderBottomWidth: 1, borderBottomColor: '#F4F4F4', paddingBottom: 10 },
  toggleLabel: { fontSize: 10, fontWeight: '700', color: '#444', marginBottom: 8, textTransform: 'uppercase' },
  miniTab: { flex: 1, padding: 10, alignItems: 'center', backgroundColor: '#F0F0F0', marginHorizontal: 2, borderRadius: 6 },
  activeTab: { backgroundColor: '#10B981' }, 
  activeTabBlue: { backgroundColor: '#007AFF' },
  activeTabManual: { backgroundColor: '#F59E0B' }, 
  tabText: { fontSize: 10, fontWeight: 'bold', color: '#666' },
  activeTabText: { color: '#FFF' },
  typeCard: { flex: 1, padding: 10, alignItems: 'center', backgroundColor: '#F0F0F0', marginHorizontal: 2, borderRadius: 6 },
  selectedCard: { backgroundColor: '#007AFF' },
  typeText: { fontSize: 11, fontWeight: 'bold', color: '#666' },
  selectedTypeText: { color: '#FFF' },
  toggleRowSmall: { flexDirection: 'row', width: moderateScale(140), height: moderateScale(30), borderWidth: 1, borderColor: '#007AFF', borderRadius: moderateScale(6), overflow: 'hidden' },
  unitBtn: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FFF' },
  unitBtnActive: { backgroundColor: '#007AFF' },
  unitBtnText: { fontSize: moderateScale(10), fontWeight: 'bold', color: '#007AFF' },
  unitBtnTextActive: { color: '#FFF' },
  sectionWrapper: { marginTop: 15, backgroundColor: '#FFF', borderRadius: 12, overflow: 'hidden', elevation: 1 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', padding: 15, alignItems: 'center', backgroundColor: '#FFF' },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: '#333' },
  sectionBody: { padding: 15, borderTopWidth: 1, borderTopColor: '#F4F4F4' },
  buttonRow: { marginTop: 30 },
  submitBtn: { backgroundColor: '#1A1A1A', padding: 18, borderRadius: 12, alignItems: 'center' },
  submitBtnText: { color: '#FFF', fontWeight: 'bold', fontSize: moderateScale(16) }
});