import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  TextInput, 
  Alert, 
  KeyboardAvoidingView 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { CRANE_CHECKLIST_TEMPLATE } from '../utils/Checklists';
import { COLORS } from '../theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
// Updated Imports
import { moderateScale, IS_IOS } from '../utils/metrics';

export default function InspectionFormScreen({ route, navigation }) {
  const { unitId } = route.params;
  const insets = useSafeAreaInsets();
  const [checklist, setChecklist] = useState(CRANE_CHECKLIST_TEMPLATE);
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState("");

  const toggleStatus = (sIdx, iIdx) => {
    const newChecklist = [...checklist];
    const current = newChecklist[sIdx].items[iIdx].status;
    const next = current === 'OK' ? 'ATTENTION' : current === 'ATTENTION' ? 'REPAIR' : 'OK';
    newChecklist[sIdx].items[iIdx].status = next;
    setChecklist(newChecklist);
  };

  const markSectionOK = (sIdx) => {
    const newChecklist = [...checklist];
    newChecklist[sIdx].items = newChecklist[sIdx].items.map(item => ({ ...item, status: 'OK' }));
    setChecklist(newChecklist);
  };

  const handleVoiceCommand = (text) => {
    if (!text) return;
    const input = text.toLowerCase();
    const newChecklist = [...checklist];
    let foundMatch = false;

    newChecklist.forEach((section, sIdx) => {
      section.items.forEach((item, iIdx) => {
        const itemLabel = item.label.toLowerCase();

        // console.log(`Checking speech: "${input}" | Label: "${itemLabel}"`);

        // Define mapping for components that might be spoken differently
        const matchesHoist = input.includes("hoist") && itemLabel.includes("hoist");
        const matchesTrolley = input.includes("trolley") && itemLabel.includes("trolley");
        const matchesBridge = input.includes("bridge") && itemLabel.includes("bridge");
        const matchesStructure = (input.includes("structure") || input.includes("column")) && itemLabel.includes("column");
        
        // FUZZY MATCH: If the spoken text contains the item label 
        // OR if the item label contains a key part of the spoken text
        if (input.includes(itemLabel) || matchesHoist || matchesTrolley || matchesBridge || matchesStructure) {
          foundMatch = true;
          
          // Determine Status
          if (input.includes("repair") || input.includes("bad") || input.includes("fail") || input.includes("broken")) {
            newChecklist[sIdx].items[iIdx].status = "REPAIR";
          } else if (input.includes("caution") || input.includes("loose") || input.includes("attention")) {
            newChecklist[sIdx].items[iIdx].status = "ATTENTION";
          } else if (input.includes("ok") || input.includes("good") || input.includes("pass")) {
            newChecklist[sIdx].items[iIdx].status = "OK";
          }

          // Add the note
          const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
          newChecklist[sIdx].items[iIdx].notes = `[Voice ${timestamp}]: ${text}`;
        }
      });
    });

    if (foundMatch) {
      setChecklist(newChecklist); // This triggers the UI refresh
    } else {
      console.log("Side-Kick couldn't match speech to a component:", input);
    }
  };

  const startListeningSimulator = () => {
    setIsListening(true);
    setTranscript("Listening...");
    setTimeout(() => {
      const mockSpeech = "Hoist Motor and Brakes needs repair";
      setTranscript(mockSpeech);
      setTimeout(() => {
        setIsListening(false);
        handleVoiceCommand(mockSpeech);
      }, 1500);
    }, 1000);
  };

  return (
    <KeyboardAvoidingView behavior={IS_IOS ? 'padding' : 'height'} style={{ flex: 1 }}>
      <View style={[styles.container, { paddingBottom: insets.bottom }]}>
        <ScrollView contentContainerStyle={styles.scrollContainer}>
          <Text style={styles.headerText}>Inspecting: {unitId}</Text>
          
          {checklist.map((section, sIdx) => (
            <View key={section.section} style={styles.sectionCard}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>{section.section}</Text>
                <TouchableOpacity onPress={() => markSectionOK(sIdx)} style={styles.bulkOkBtn}>
                  <Ionicons name="checkmark-done" size={moderateScale(16)} color={COLORS.primary} />
                  <Text style={styles.bulkOkText}>ALL OK</Text>
                </TouchableOpacity>
              </View>
              
              {section.items.map((item, iIdx) => (
                <View key={item.id} style={styles.itemWrapper}>
                  <View style={styles.itemRow}>
                    <View style={styles.itemInfo}>
                      <Text style={styles.itemLabel}>{item.label}</Text>
                      <Text style={[styles.statusLabel, { color: item.status === 'REPAIR' ? '#FF5252' : item.status === 'ATTENTION' ? '#FFC107' : '#4CAF50' }]}>
                        {item.status}
                      </Text>
                    </View>
                    <TouchableOpacity 
                      onPress={() => toggleStatus(sIdx, iIdx)}
                      style={[styles.statusToggle, { backgroundColor: item.status === 'REPAIR' ? '#FF5252' : item.status === 'ATTENTION' ? '#FFC107' : '#4CAF50' }]}
                    >
                      <Ionicons name={item.status === 'OK' ? "checkmark" : "alert"} size={moderateScale(20)} color="#FFF" />
                    </TouchableOpacity>
                  </View>
                  <View style={styles.notesContainer}>
                    <TextInput
                      style={styles.noteInput}
                      placeholder="Details..."
                      value={item.notes}
                      onChangeText={(t) => {
                        const next = [...checklist];
                        next[sIdx].items[iIdx].notes = t;
                        setChecklist(next);
                      }}
                      multiline
                    />
                  </View>
                </View>
              ))}
            </View>
          ))}
        </ScrollView>

        {isListening && (
          <View style={styles.transcriptOverlay}>
            <Text style={styles.transcriptText}>{transcript}</Text>
          </View>
        )}

        <TouchableOpacity 
          style={[styles.micBtn, isListening && styles.micBtnActive]} 
          onPress={startListeningSimulator}
        >
          <Ionicons name="mic" size={moderateScale(32)} color="#FFF" />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F4F7F6' },
  scrollContainer: { padding: moderateScale(15), paddingBottom: moderateScale(120) },
  headerText: { fontSize: moderateScale(14), color: '#666', marginBottom: moderateScale(10) },
  sectionCard: { backgroundColor: '#FFF', borderRadius: moderateScale(12), padding: moderateScale(15), marginBottom: moderateScale(20), elevation: 3 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: moderateScale(15), borderBottomWidth: 1, borderBottomColor: '#F0F0F0', paddingBottom: moderateScale(10) },
  sectionTitle: { fontSize: moderateScale(17), fontWeight: 'bold' },
  bulkOkBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#E8F0FE', padding: moderateScale(6), borderRadius: moderateScale(6) },
  bulkOkText: { fontSize: moderateScale(11), color: COLORS.primary, marginLeft: moderateScale(4), fontWeight: 'bold' },
  itemWrapper: { marginBottom: moderateScale(15) },
  itemRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  itemLabel: { fontSize: moderateScale(15), fontWeight: '600' },
  statusLabel: { fontSize: moderateScale(11), fontWeight: 'bold', textTransform: 'uppercase' },
  statusToggle: { width: moderateScale(46), height: moderateScale(46), borderRadius: moderateScale(23), justifyContent: 'center', alignItems: 'center' },
  notesContainer: { marginTop: moderateScale(8), backgroundColor: '#F9F9F9', borderRadius: moderateScale(8), paddingHorizontal: moderateScale(10) },
  noteInput: { fontSize: moderateScale(13), minHeight: moderateScale(40) },
  micBtn: { position: 'absolute', bottom: moderateScale(30), right: moderateScale(30), width: moderateScale(70), height: moderateScale(70), borderRadius: moderateScale(35), backgroundColor: '#1A1A1A', justifyContent: 'center', alignItems: 'center', elevation: 10 },
  micBtnActive: { backgroundColor: '#FF5252' },
  transcriptOverlay: { position: 'absolute', bottom: moderateScale(110), left: moderateScale(20), right: moderateScale(20), backgroundColor: 'rgba(0,0,0,0.8)', padding: moderateScale(15), borderRadius: moderateScale(10) },
  transcriptText: { color: '#FFF', textAlign: 'center', fontSize: moderateScale(14) }
});