// components/AppHeader.js
import React, { useContext } from 'react';
import { View, Text, Image, TouchableOpacity, StyleSheet } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { UserContext } from '../components/MyContexts';
import { COLORS } from '../theme';
import { Ionicons } from '@expo/vector-icons';
import { moderateScale } from '../utils/metrics';

export default function AppHeader({ title, navigation }) {
  const { currentCustomer, setCurrentCustomer } = useContext(UserContext);
  const { user } = useContext(UserContext);
  const insets = useSafeAreaInsets();

  const handleSwitchSite = () => {
    // This resets the app state
    setCurrentCustomer(null);
  };

  // Handle avatar logic

  const avatarSource = (user?.photo === 'default' || !user?.photo)
    ? require('../assets/default-avatar.png') 
    : { uri: user.photo };

  return (
    <View style={[
      styles.headerWrapper, 
      { paddingTop: insets.top } 
    ]}>
      <View style={styles.container}>
        <View style={styles.leftSection}>
        <Text style={styles.title}>{title}</Text>
          {currentCustomer && (
            <TouchableOpacity 
              onPress={handleSwitchSite} 
              style={styles.siteSelector}
              activeOpacity={0.7}
            >
              <Ionicons name="location" size={moderateScale(12)} color={COLORS.primary} />
              <Text style={styles.siteName} numberOfLines={1}>
                {currentCustomer.custName || 'Unknown Site'}
              </Text>
              <Ionicons name="chevron-down" size={moderateScale(12)} color="#999" style={{ marginLeft: 2 }} />
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.rightSection}>
          {/* Technician Info Stack */}
          <View style={styles.userInfo}>
            <Text style={styles.techLabel}>TECHNICIAN</Text>
            <Text style={styles.userName} numberOfLines={1}>
              {user?.userDisplayName || 'Active Tech'}
            </Text>
          </View>

          {/* Profile Picture */}
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
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  container: {
    height: moderateScale(65), 
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: moderateScale(15),
  },
  title: { 
    fontSize: moderateScale(18), 
    fontWeight: 'bold', 
    color: '#1A1A1A' 
  },
  rightSection: { 
    flexDirection: 'row', 
    alignItems: 'center' 
  },
  userInfo: {
    alignItems: 'flex-end',
    marginRight: moderateScale(10),
  },
  techLabel: {
    fontSize: moderateScale(9),
    fontWeight: '800',
    color: '#999',
    letterSpacing: 0.5,
  },
  userName: {
    fontSize: moderateScale(13),
    fontWeight: '600',
    color: '#333',
  },
  profileBtn: { 
    marginRight: moderateScale(8) 
  },
  profilePic: { 
    width: moderateScale(38), 
    height: moderateScale(38), 
    borderRadius: moderateScale(19),
    borderWidth: 1.5,
    borderColor: '#EEE'
  },
  menuBtn: { 
    padding: moderateScale(4) 
  },
  leftSection: {
    flex: 1, // Allows title/site to take available space
    justifyContent: 'center',
  },
  siteSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: moderateScale(2),
  },
  siteName: {
    fontSize: moderateScale(11),
    fontWeight: '700',
    color: '#666',
    marginLeft: moderateScale(3),
    maxWidth: moderateScale(120), // Prevents push against user info
  },
});