/**
 * Simple Keyword Matcher
 * Logic: Take transcribed text and find matches in the Checklist
 */
export const parseInspectionSpeech = (transcript, checklist) => {
  const text = transcript.toLowerCase();
  
  // 1. Identify Status (Priority)
  let detectedStatus = null;
  if (text.includes('bad') || text.includes('repair') || text.includes('broken')) detectedStatus = 'REPAIR';
  else if (text.includes('caution') || text.includes('watch') || text.includes('loose')) detectedStatus = 'ATTENTION';
  else if (text.includes('good') || text.includes('okay') || text.includes('fine')) detectedStatus = 'OK';

  // 2. Identify the Component
  let targetSectionIndex = -1;
  let targetItemIndex = -1;

  checklist.forEach((section, sIdx) => {
    section.items.forEach((item, iIdx) => {
      // Check if the technician mentioned the label (e.g., "Hoist Motor")
      if (text.includes(item.label.toLowerCase())) {
        targetSectionIndex = sIdx;
        targetItemIndex = iIdx;
      }
    });
  });

  return {
    sectionIndex: targetSectionIndex,
    itemIndex: targetItemIndex,
    status: detectedStatus,
    originalText: transcript
  };
};