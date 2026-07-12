const blockedEmployees = new Set();
let EmployeeScanBlock = null;

function initModel(mongoose) {
  if (EmployeeScanBlock) return EmployeeScanBlock;

  const schema = new mongoose.Schema({
    employeeId: { type: String, required: true, unique: true, index: true },
    blocked: { type: Boolean, default: true },
    abuseType: { type: String, default: 'unknown' },
    reason: { type: String, default: '' },
    blockedAt: { type: Date, default: Date.now },
    unlockedAt: { type: Date, default: null },
    unlockedByAdminId: { type: String, default: null },
    unlockedByEmail: { type: String, default: null },
    unlockedByRole: { type: String, default: null },
    unlockedByName: { type: String, default: null },
  });

  EmployeeScanBlock = mongoose.model('EmployeeScanBlock', schema);
  return EmployeeScanBlock;
}

async function loadBlockedEmployees() {
  if (!EmployeeScanBlock) return;

  const docs = await EmployeeScanBlock.find({ blocked: true }).select('employeeId').lean();
  blockedEmployees.clear();
  for (const doc of docs) {
    blockedEmployees.add(String(doc.employeeId));
  }
  console.log(`🔒 [SCAN BLOCK] Loaded ${blockedEmployees.size} blocked employee scanner(s)`);
}

function isEmployeeScanBlocked(employeeId) {
  if (!employeeId) return false;
  return blockedEmployees.has(String(employeeId));
}

async function blockEmployeeScan(employeeId, abuseType, reason) {
  const id = String(employeeId);
  blockedEmployees.add(id);

  if (!EmployeeScanBlock) {
    console.warn('🔒 [SCAN BLOCK] Model not initialized — block kept in memory only');
    return;
  }

  await EmployeeScanBlock.findOneAndUpdate(
    { employeeId: id },
    {
      employeeId: id,
      blocked: true,
      abuseType: abuseType || 'unknown',
      reason: reason || '',
      blockedAt: new Date(),
      unlockedAt: null,
      unlockedByAdminId: null,
      unlockedByEmail: null,
      unlockedByRole: null,
      unlockedByName: null,
    },
    { upsert: true, new: true }
  );

  console.log(`🔒 [SCAN BLOCK] Blocked employee scanner: ${id} (${abuseType})`);
}

async function unblockEmployeeScan(employeeId, supervisor) {
  const id = String(employeeId);
  blockedEmployees.delete(id);

  if (!EmployeeScanBlock) return;

  await EmployeeScanBlock.findOneAndUpdate(
    { employeeId: id },
    {
      blocked: false,
      unlockedAt: new Date(),
      unlockedByAdminId: supervisor.adminId || null,
      unlockedByEmail: supervisor.email || null,
      unlockedByRole: supervisor.role || null,
      unlockedByName: supervisor.fullName || null,
    }
  );

  console.log(`🔓 [SCAN BLOCK] Unblocked employee scanner: ${id} by ${supervisor.email}`);
}

module.exports = {
  initModel,
  loadBlockedEmployees,
  isEmployeeScanBlocked,
  blockEmployeeScan,
  unblockEmployeeScan,
};
