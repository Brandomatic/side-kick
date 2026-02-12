// components/AppHeader.js
import React, { useContext } from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, SafeAreaView } from 'react-native';
import { UserContext } from '../components/MyContexts';
import { Ionicons } from '@expo/vector-icons';
import { moderateScale } from '../utils/metrics';

export default function AppHeader({ title, navigation }) {
  const { user } = useContext(UserContext);

  const avatarSource = user?.userPhoto === 'default' 
    ? require('../assets/default-avatar.png') 
    : { uri: user?.userPhoto };

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Text style={styles.title}>{title}</Text>

        <View style={styles.rightSection}>
          <TouchableOpacity 
            onPress={() => navigation.navigate('Profile')}
            style={styles.profileBtn}
          >
            <Image source={avatarSource} style={styles.profilePic} />
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuBtn}>
            <Ionicons name="ellipsis-vertical" size={moderateScale(22)} color="#333" />
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { backgroundColor: '#FFF', borderBottomWidth: 1, borderBottomColor: '#EEE' },
  container: {
    height: moderateScale(60),
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: moderateScale(15),
  },
  title: { fontSize: moderateScale(20), fontWeight: 'bold', color: '#1A1A1A' },
  rightSection: { flexDirection: 'row', alignItems: 'center' },
  profileBtn: { marginRight: moderateScale(12) },
  profilePic: { 
    width: moderateScale(36), 
    height: moderateScale(36), 
    borderRadius: moderateScale(18),
    borderWidth: 1,
    borderColor: '#DDD'
  },
  menuBtn: { padding: moderateScale(4) }
});