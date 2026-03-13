import { StyleSheet } from 'react-native';
import { moderateScale } from '../utils/metrics';
import { COLORS } from '../theme';

export const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#F0F2F5' // Darker, neutral background
  },
  scrollContainer: { 
    paddingHorizontal: moderateScale(16),
    paddingBottom: moderateScale(100)
  },
  // --- CARD STYLES ---
  sectionCard: { 
    backgroundColor: '#FFFFFF', 
    borderRadius: moderateScale(12), 
    marginBottom: moderateScale(16),
    borderWidth: 1,
    borderColor: '#E0E0E0',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    overflow: 'hidden'
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: moderateScale(16),
    backgroundColor: '#FFFFFF'
  },
  titleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1
  },
  sectionTitle: {
    fontSize: moderateScale(16),
    fontWeight: '800',
    color: '#1A1A1A',
    marginRight: moderateScale(8)
  },
  // --- BADGE ---
  badge: {
    backgroundColor: '#FFE5E5',
    width: moderateScale(22),
    height: moderateScale(22),
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FF4D4D'
  },
  badgeText: {
    color: '#FF4D4D',
    fontSize: moderateScale(11),
    fontWeight: 'bold'
  },
  // --- ALL OK PILL ---
  okPill: {
    backgroundColor: '#E8F5E9',
    paddingHorizontal: moderateScale(12),
    paddingVertical: moderateScale(6),
    borderRadius: moderateScale(6),
    borderWidth: 1,
    borderColor: '#C8E6C9'
  },
  okPillText: {
    color: '#2E7D32',
    fontSize: moderateScale(11),
    fontWeight: '800'
  },
  // --- FINDINGS PREVIEW ---
  findingsSummary: {
    padding: moderateScale(12),
    backgroundColor: '#FAFAFA',
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0'
  },
  findingRow: {
    flexDirection: 'row',
    marginBottom: 4
  },
  findingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FF4D4D',
    marginTop: 6,
    marginRight: 8
  },
  findingText: {
    fontSize: moderateScale(12),
    color: '#666',
    flex: 1
  }
});