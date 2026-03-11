// utils/paths.js

const ROOT = (companyId) => `companies/${companyId}`;

export const PATHS = {
  // --- COMPANY & USERS ---
  company: (companyId) => ROOT(companyId),
  
  users: (companyId) => `${ROOT(companyId)}/users`,
  
  user: (companyId, uid) => `${ROOT(companyId)}/users/${uid}`,

  // --- CUSTOMER & ASSET TREE ---
  customers: (companyId) => `${ROOT(companyId)}/customers`,

  customer: (companyId, customerId) => 
    `${ROOT(companyId)}/customers/${customerId}`,

  cranes: (companyId, customerId) => 
    `${ROOT(companyId)}/customers/${customerId}/assets/custProfile/cranes`,

  crane: (companyId, customerId, unitId) => 
    `${ROOT(companyId)}/customers/${customerId}/assets/custProfile/cranes/${unitId}`,

  // --- SUB-COLLECTIONS ---
  serviceLogs: (companyId, customerId, unitId) => 
    `${ROOT(companyId)}/customers/${customerId}/assets/custProfile/cranes/${unitId}/serviceLogs`,
};