import React, { useState } from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Dimensions } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useIsFocused } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { moderateScale } from '../utils/metrics';

const { width } = Dimensions.get('window');
const scannerSize = width * 0.7; // Size of the scanning square

export default function QRScannerScreen({ navigation }) {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [torch, setTorch] = useState(false);
  
  // 1. Hook to check if screen is visible
  const isFocused = useIsFocused();

  // 2. Permission handling
  if (!permission) return <View style={styles.container} />;
  
  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <Text style={styles.text}>Camera access is required to scan equipment.</Text>
        <TouchableOpacity style={styles.btn} onPress={requestPermission}>
          <Text style={styles.btnText}>Enable Camera</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // 3. Scan handler
  const handleBarCodeScanned = ({ data }) => {
    setScanned(true);
    // Vibrate or beep could be added here
    navigation.replace('EquipmentDetail', { unitId: data });
  };

  // 4. Battery Saver: Don't render camera if user navigated away
  if (!isFocused) return <View style={styles.container} />;

  return (
    <View style={styles.container}>
      {/* 1. The Camera sits in the background */}
      <CameraView
        style={StyleSheet.absoluteFillObject}
        enableTorch={torch}
        onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
        barcodeScannerSettings={{
          barcodeTypes: ['qr'],
        }}
      />

      {/* 2. The Overlay sits on top as a sibling, filling the same space */}
      <View style={styles.overlay} pointerEvents="box-none">
        <View style={styles.topSide} />
        
        <View style={styles.middleRow}>
          <View style={styles.side} />
          <View style={styles.viewfinder}>
            <View style={[styles.corner, styles.topRight]} />
            <View style={[styles.corner, styles.topLeft]} />
            <View style={[styles.corner, styles.bottomRight]} />
            <View style={[styles.corner, styles.bottomLeft]} />
          </View>
          <View style={styles.side} />
        </View>

        <View style={styles.bottomSide}>
          <Text style={styles.hintText}>Position QR code within the frame</Text>
          
          <View style={styles.controls}>
            <TouchableOpacity 
              style={styles.controlBtn} 
              onPress={() => setTorch(!torch)}
            >
              <Ionicons 
                name={torch ? "flash" : "flash-off"} 
                size={28} 
                color={torch ? "#FFD700" : "#FFF"} 
              />
              <Text style={styles.controlLabel}>Flash</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={styles.controlBtn} 
              onPress={() => navigation.goBack()}
            >
              <Ionicons name="close" size={28} color="#FFF" />
              <Text style={styles.controlLabel}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#000', justifyContent: 'center', alignItems: 'center' },
  overlay: { flex: 1, backgroundColor: 'transparent' },
  topSide: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)' },
  middleRow: { flexDirection: 'row', height: scannerSize },
  side: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)' },
  viewfinder: { width: scannerSize, backgroundColor: 'transparent', position: 'relative' },
  bottomSide: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', alignItems: 'center', paddingTop: 30 },
  
  // UI Elements
  corner: { position: 'absolute', width: 30, height: 30, borderColor: '#FFF', borderWidth: 4 },
  topRight: { top: 0, right: 0, borderBottomWidth: 0, borderLeftWidth: 0 },
  topLeft: { top: 0, left: 0, borderBottomWidth: 0, borderRightWidth: 0 },
  bottomRight: { bottom: 0, right: 0, borderTopWidth: 0, borderLeftWidth: 0 },
  bottomLeft: { bottom: 0, left: 0, borderTopWidth: 0, borderRightWidth: 0 },
  
  hintText: { color: '#FFF', fontSize: 16, marginBottom: 40, opacity: 0.8 },
  controls: { flexDirection: 'row', width: '80%', justifyContent: 'space-around' },
  controlBtn: { alignItems: 'center' },
  controlLabel: { color: '#FFF', fontSize: 12, marginTop: 5 },
  
  // Permission Styles
  text: { color: '#FFF', textAlign: 'center', padding: 20 },
  btn: { backgroundColor: '#007AFF', padding: 15, borderRadius: 10 },
  btnText: { color: '#FFF', fontWeight: 'bold' }
});