// components/AppHeader.js
import React, { useContext } from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet, SafeAreaView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { UserContext } from '../components/MyContexts';
import { COLORS } from '../theme';
import { Ionicons } from '@expo/vector-icons';
import { moderateScale } from '../utils/metrics';

export default function AppHeader({ title, navigation }) {
  const { user } = useContext(UserContext);
  const insets = useSafeAreaInsets();

  const avatarSource = user?.userPhoto === 'default' 
    ? require('../assets/default-avatar.png') 
    : { uri: user?.userPhoto };

  return (
    <View style={[
      styles.headerWrapper, // New base style for the background
      { paddingTop: insets.top } // This replaces SafeAreaView's job
    ]}>
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
    </View>
  );
}

const styles = StyleSheet.create({
  headerWrapper: {
    backgroundColor: '#FFF', // Or whatever your header background color is
    // No flex: 1 here, we want it to hug the content
  },
  container: {
    height: moderateScale(60), // Fixed height for the header content
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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