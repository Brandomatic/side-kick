import React, { useContext } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, Alert, ScrollView } from 'react-native';
import { UserContext } from '../components/MyContexts';
import { auth } from '../lib/firebase';
import { signOut } from 'firebase/auth';
import { moderateScale } from '../utils/metrics';
import { COLORS } from '../theme';
import { Ionicons } from '@expo/vector-icons';

export default function ProfileScreen() {
  const { user, setUser } = useContext(UserContext);

  const handleLogout = async () => {
    Alert.alert("Logout", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      { 
        text: "Logout", 
        style: "destructive", 
        onPress: async () => {
          try {
            await signOut(auth);
            setUser(null); // This triggers the App.js switch back to Login
          } catch (error) {
            Alert.alert("Error", "Failed to log out.");
          }
        } 
      }
    ]);
  };

  const avatarSource = user?.userPhoto === 'default' 
    ? require('../assets/default-avatar.png') 
    : { uri: user?.userPhoto };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.headerCard}>
        <Image source={avatarSource} style={styles.profilePic} />
        <Text style={styles.userName}>{user?.userDisplayName || 'Technician'}</Text>
        <Text style={styles.userEmail}>{user?.userEmail}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Account Settings</Text>
        
        <TouchableOpacity style={styles.menuItem}>
          <Ionicons name="person-outline" size={22} color={COLORS.primary} />
          <Text style={styles.menuText}>Edit Profile</Text>
          <Ionicons name="chevron-forward" size={20} color="#CCC" />
        </TouchableOpacity>

        <TouchableOpacity style={styles.menuItem}>
          <Ionicons name="shield-checkmark-outline" size={22} color={COLORS.primary} />
          <Text style={styles.menuText}>Security & Password</Text>
          <Ionicons name="chevron-forward" size={20} color="#CCC" />
        </TouchableOpacity>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>App Preferences</Text>
        
        <TouchableOpacity style={styles.menuItem}>
          <Ionicons name="notifications-outline" size={22} color={COLORS.primary} />
          <Text style={styles.menuText}>Inspection Alerts</Text>
          <Ionicons name="chevron-forward" size={20} color="#CCC" />
        </TouchableOpacity>
      </View>

      <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
        <Ionicons name="log-out-outline" size={22} color="#FF3B30" />
        <Text style={styles.logoutText}>Sign Out</Text>
      </TouchableOpacity>

      <Text style={styles.versionText}>Side-Kick v1.0.2</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F4F7F6' },
  headerCard: {
    backgroundColor: '#FFF',
    paddingVertical: moderateScale(30),
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#EEE',
  },
  profilePic: {
    width: moderateScale(100),
    height: moderateScale(100),
    borderRadius: moderateScale(50),
    marginBottom: 15,
    borderWidth: 3,
    borderColor: COLORS.primary,
  },
  userName: { fontSize: moderateScale(22), fontWeight: 'bold', color: '#333' },
  userEmail: { fontSize: moderateScale(14), color: '#777', marginTop: 5 },
  section: { marginTop: 25, paddingHorizontal: moderateScale(15) },
  sectionTitle: { fontSize: 13, fontWeight: '700', color: '#888', textTransform: 'uppercase', marginBottom: 10, marginLeft: 5 },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF',
    padding: 15,
    borderRadius: 12,
    marginBottom: 8,
  },
  menuText: { flex: 1, marginLeft: 15, fontSize: 16, color: '#333', fontWeight: '500' },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 40,
    padding: 15,
  },
  logoutText: { color: '#FF3B30', fontWeight: 'bold', fontSize: 16, marginLeft: 10 },
  versionText: { textAlign: 'center', color: '#BBB', fontSize: 12, marginTop: 20, marginBottom: 40 }
});