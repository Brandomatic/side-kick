import { db, auth } from '../lib/firebase';
import { collection, doc, setDoc } from 'firebase/firestore';
import { COLORS } from '../theme';

/**
 * UNIFIED ACTIVITY LOGGING
 * Saves a 'receipt' to the Global Activity feed and the specific Crane's Service Log.
 */
export const saveActivity = async (currentCustomerId, user, type, data) => {
  try {
    const activityRef = doc(collection(db, "customers", currentCustomerId, "recentActivity"));
    const serviceLogRef = doc(collection(db, "customers", currentCustomerId, "assets", "custProfile", "cranes", data.equipmentId, "serviceLogs"), activityRef.id);

    const activityPayload = {
      activityId: activityRef.id,
      type: type, // 'Inspection', 'Repair', 'Monitoring Resolved', etc.
      equipmentId: data.equipmentId,
      userDisplayName: user.userDisplayName || "Technician",
      userId: auth.currentUser?.uid,
      date: new Date().toISOString(),
      
      compDesc: data.compDesc || null, 
      summary: data.summary || "", 
      
      // Clean up undefined values before they hit Firestore
      details: JSON.parse(JSON.stringify(data.details || {}, (k, v) => v === undefined ? null : v))
    };

    await Promise.all([
      setDoc(activityRef, activityPayload),
      setDoc(serviceLogRef, activityPayload)
    ]);

    return activityRef.id;
  } catch (err) {
    console.error("Helper Function Error (saveActivity):", err);
    throw err;
  }
};

export const getStatusColor = (status) => {
  const s = status?.toUpperCase();

  switch (s) {
    case 'REPAIR':
    case 'FAIL':
      return COLORS.repair; // Must match the key in your COLORS object

    case 'ATTENTION':
    case 'WARN':
    case 'WARNING':
      return COLORS.attention;

    case 'MONITOR':
    case 'MONITORING':
      return COLORS.monitor;

    case 'OK':
    case 'PASS':
    case 'HEALTHY':
      return COLORS.success;

    default:
      // CHANGE THIS to a different color (like Gray) to test if it's failing
      return COLORS.textMuted; 
  }
};

/**
 * SIMPLE DATE FORMATTER
 */
export const formatDate = (isoString) => {
  if (!isoString) return "";
  const date = new Date(isoString);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
};