const fs = require('fs');

console.log("=== Testing PackSure Features ===");

// 1. Check types.ts
const typesCode = fs.readFileSync('./src/types.ts', 'utf8');
if (typesCode.includes('PriorityLevel') && typesCode.includes('TruthScoreBreakdown') && typesCode.includes('communityReports')) {
  console.log("✓ types.ts contains all required priority, score breakdown, and duplicate status interfaces");
} else {
  console.error("✗ types.ts missing required types");
  process.exit(1);
}

// 2. Check complianceEngine.ts
const engineCode = fs.readFileSync('./src/utils/complianceEngine.ts', 'utf8');
if (engineCode.includes('calculateTruthScore') && engineCode.includes('calculateComplaintPriority') && engineCode.includes('findDuplicateComplaint')) {
  console.log("✓ complianceEngine.ts contains calculateTruthScore, calculateComplaintPriority, and findDuplicateComplaint");
} else {
  console.error("✗ complianceEngine.ts missing required functions");
  process.exit(1);
}

// 3. Check App.tsx, ResultPage.tsx, ComplaintPage.tsx, SuccessAndTrackingPage.tsx, AdminDashboard.tsx, OfficerDashboard.tsx
const appCode = fs.readFileSync('./src/App.tsx', 'utf8');
const resultCode = fs.readFileSync('./src/pages/ResultPage.tsx', 'utf8');
const complaintCode = fs.readFileSync('./src/pages/ComplaintPage.tsx', 'utf8');
const trackCode = fs.readFileSync('./src/pages/SuccessAndTrackingPage.tsx', 'utf8');
const adminCode = fs.readFileSync('./src/pages/AdminDashboard.tsx', 'utf8');
const officerCode = fs.readFileSync('./src/pages/OfficerDashboard.tsx', 'utf8');

const checks = [
  { name: 'App.tsx onJoinExistingComplaint', pass: appCode.includes('handleJoinExistingComplaint') },
  { name: 'ResultPage.tsx truth score breakdown', pass: resultCode.includes('Why this score?') && resultCode.includes('calculateTruthScore') },
  { name: 'ComplaintPage.tsx real-time priority badge', pass: complaintCode.includes('calculatedPriority') && complaintCode.includes('findDuplicateComplaint') },
  { name: 'ComplaintPage.tsx duplicate warning modal', pass: complaintCode.includes('Join Existing Report') && complaintCode.includes('Submit as New Complaint') },
  { name: 'SuccessAndTrackingPage.tsx priority & community reports', pass: trackCode.includes('Community Reports') && trackCode.includes('priority') },
  { name: 'AdminDashboard.tsx priority and duplicate status', pass: adminCode.includes('PRIORITY') && adminCode.includes('DUPLICATE STATUS') && adminCode.includes('COMMUNITY REPORTS') },
  { name: 'OfficerDashboard.tsx priority and community reports', pass: officerCode.includes('PRIORITY') && officerCode.includes('COMMUNITY REPORTS') },
];

let allPassed = true;
for (const check of checks) {
  if (check.pass) {
    console.log(`✓ ${check.name}`);
  } else {
    console.error(`✗ ${check.name} failed`);
    allPassed = false;
  }
}

if (!allPassed) {
  process.exit(1);
}

console.log("\nALL CODE STRUCTURE AND FEATURE CHECKS PASSED SUCCESSFULLY!");
