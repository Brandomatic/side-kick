// --- COMPONENT DATA ---
const structureItems = [
  { id: '0', label: 'Run Rail' }, { id: '1', label: 'Bolts' }, { id: '2', label: 'Supports' },
  { id: '3', label: 'Bridge Rail' }, { id: '4', label: 'Bridge Track' }, { id: '5', label: 'End Stop' },
  { id: '6', label: 'Cable Reel/Bus Bar' }, { id: '7', label: 'Warning Device' }, { id: '8', label: 'Disconnect' },
  { id: '9', label: 'Capacity Signs' }, { id: '10', label: 'Lights' }, { id: '11', label: 'Radio' },
  { id: '12', label: 'Collectors/Shoes' }, { id: '13', label: 'Jib' }, { id: '14', label: 'Custom' },
];

const bridgeItems = [
  { id: '0', label: 'Motor/SEW A' }, { id: '1', label: 'Gear case A' }, { id: '2', label: 'Brakes A' },
  { id: '3', label: 'Motor/SEW B' }, { id: '4', label: 'Gear case B' }, { id: '5', label: 'Brakes B' },
  { id: '6', label: 'Wheels' }, { id: '7', label: 'Wheel Bearings' }, { id: '8', label: 'Guide Rollers' },
  { id: '9', label: 'Shaft Bearings' }, { id: '10', label: 'Bumpers' }, { id: '11', label: 'Rail Sweeps' },
  { id: '12', label: 'Limits' }, { id: '13', label: 'Drop Stops' }, { id: '14', label: 'End Truck' },
  { id: '15', label: 'Directional Signs' }, { id: '16', label: 'Contactors' }, { id: '17', label: 'Electrical' },
  { id: '18', label: 'Festooning' }, { id: '19', label: 'Custom' },
];

const ropeItems = [
  { id: '0', label: 'Motor' }, { id: '1', label: 'Gearcase' }, { id: '2', label: 'Brake' },
  { id: '3', label: 'Contactors' }, { id: '4', label: 'Upper Limit' }, { id: '5', label: 'Lower Limit' },
  { id: '6', label: 'Rope Guide' }, { id: '7', label: 'Load Limit' }, { id: '8', label: 'Upper Sheaves' },
  { id: '9', label: 'Bottom Block' }, { id: '10', label: 'Hook' }, { id: '11', label: 'Latch' },
  { id: '12', label: 'Wire Rope' }, { id: '13', label: 'Capacity Sign' }, { id: '14', label: 'Electrical' },
  { id: '15', label: 'Custom' },
];

const chainItems = [
  { id: '0', label: 'Chain' }, { id: '1', label: 'Cable' }, { id: '2', label: 'Top Hook' },
  { id: '3', label: 'Bottom Hook' }, { id: '4', label: 'Pocket Wheel' }, { id: '5', label: 'Limit Switch' },
  { id: '6', label: 'Housing' }, { id: '7', label: 'SWL' }, { id: '8', label: 'Motor' },
  { id: '9', label: 'Brake' }, { id: '10', label: 'Wiring' }, { id: '11', label: 'Springs' },
  { id: '12', label: 'Lubrication' }, { id: '13', label: 'Operating Controls' }, { id: '14', label: 'Air Systems' },
  { id: '15', label: 'Hand Chain' }, { id: '16', label: 'Custom' },
];

const trolleyRItems = [
  { id: '0', label: 'Motor' }, { id: '1', label: 'Brake' }, { id: '2', label: 'Wheels' },
  { id: '3', label: 'Wheels Bearings' }, { id: '4', label: 'Bumpers' }, { id: '5', label: 'Drop Stops' },
  { id: '6', label: 'Rail Sweeps' }, { id: '7', label: 'Shafts' }, { id: '8', label: 'Guide Rollers' },
  { id: '9', label: 'Toe Arm' }, { id: '10', label: 'Limits' }, { id: '11', label: 'Contactors' },
  { id: '12', label: 'Pendant' }, { id: '13', label: 'Pendant Cable' }, { id: '14', label: 'Electrical' },
  { id: '15', label: 'Festooning' }, { id: '16', label: 'Custom' },
];

const trolleyCItems = [
  { id: '0', label: 'Motor' }, { id: '1', label: 'Brake' }, { id: '2', label: 'Wheels' },
  { id: '3', label: 'Wheels Bearings' }, { id: '4', label: 'Bumpers' }, { id: '5', label: 'Drop Stops' },
  { id: '6', label: 'Rail Sweeps' }, { id: '7', label: 'Shafts' }, { id: '8', label: 'Guide Rollers' },
  { id: '9', label: 'Toe Arm' }, { id: '10', label: 'Limits' }, { id: '11', label: 'Contactors' },
  { id: '12', label: 'Pendant' }, { id: '13', label: 'Pendant Cable' }, { id: '14', label: 'Electrical' },
  { id: '15', label: 'Festooning' }, { id: '16', label: 'Derailers' }, { id: '17', label: 'Air' }, { id: '18', label: 'Custom' },
];

// --- LOGIC HELPER ---
const filterPoweredItems = (items, isPowered, isHoistSection = false) => {
  if (isPowered) return items;

  // Keywords that definitely indicate electrical/powered components
  let electricalKeywords = [
    'Motor', 'Contactor', 'Electrical', 'Festoon', 
    'Limit', 'Radio', 'Pendant', 'Wiring', 'SEW', 'Air'
  ];

  // Logic: For Hoists, we KEEP 'Brake' because of mechanical load brakes.
  // For Bridge/Trolley, we STRIP 'Brake' if they are manual.
  if (!isHoistSection) {
    electricalKeywords.push('Brake');
  }

  return items.filter(item => 
    !electricalKeywords.some(key => item.label.includes(key))
  );
};

// --- MAIN GENERATOR ---
export const generateChecklist = (equipment) => {
  const { equipType, hoistType, bridgeSpecs, trolleySpecs, hoistSpecs } = equipment;
  const checklist = [];

  // 1. Structure (Always Included)
  checklist.push({
    section: 'Structure',
    items: structureItems.map(item => ({
      ...item, id: `struct-${item.id}`, status: 'OK', notes: '', isMonitor: false
    }))
  });

  // 2. Bridge (Exclude if Jib, filter if Manual)
  if (equipType !== 'JIB' && equipType !== 'Jib') {
    const isPowered = bridgeSpecs?.isPowered !== false; 
    const filteredBridge = filterPoweredItems(bridgeItems, isPowered, false);
    checklist.push({
      section: 'Bridge',
      items: filteredBridge.map(item => ({
        ...item, id: `bridge-${item.id}`, status: 'OK', notes: '', isMonitor: false
      }))
    });
  }

  // 3. Hoist (Conditional on Rope vs Chain + Power)
  const isRope = hoistType === 'Wire Rope';
  const rawHoist = isRope ? ropeItems : chainItems;
  const isHoistPowered = hoistSpecs?.isPowered !== false;
  
  // Note: We set the 3rd argument to 'true' to preserve 'Brake' for manual hoists
  const filteredHoist = filterPoweredItems(rawHoist, isHoistPowered, true);
  
  checklist.push({
    section: `Hoist (${hoistType})`,
    items: filteredHoist.map(item => ({
      ...item, id: `hoist-${item.id}`, status: 'OK', notes: '', isMonitor: false
    }))
  });

  // 4. Trolley (Power filter)
  const rawTrolley = isRope ? trolleyRItems : trolleyCItems;
  const isTrolleyPowered = trolleySpecs?.isPowered !== false;
  const filteredTrolley = filterPoweredItems(rawTrolley, isTrolleyPowered, false);
  
  checklist.push({
    section: 'Trolley',
    items: filteredTrolley.map(item => ({
      ...item, id: `trolley-${item.id}`, status: 'OK', notes: '', isMonitor: false
    }))
  });

  return checklist;
};