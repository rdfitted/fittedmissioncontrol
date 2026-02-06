import fs from 'fs/promises';
import path from 'path';

// Coordination file lives in workspace root
export const COORDINATION_FILE = path.join(process.cwd(), '..', '.claude', 'coordination.json');

// ============ Types ============

export interface FileOwnership {
  taskId: string;
  files: string[];
  agent?: string;
  since: number;  // Unix ms timestamp
}

export interface CoordinationData {
  version: string;
  lastUpdated: string;
  currentWork: Record<string, FileOwnership>;  // taskId -> ownership
  sharedResources: Record<string, unknown>;
  notes: string;
}

export interface ConflictWarning {
  file: string;
  ownedBy: string;     // taskId that owns it
  agent?: string;      // agent working on that task
  since: number;
}

export interface CoordinationResult {
  success: boolean;
  warnings: ConflictWarning[];
}

// ============ Helpers ============

/**
 * Load coordination.json, creating default if it doesn't exist
 */
export async function loadCoordination(): Promise<CoordinationData> {
  try {
    const content = await fs.readFile(COORDINATION_FILE, 'utf-8');
    return JSON.parse(content);
  } catch {
    // Create default coordination file
    const defaultData: CoordinationData = {
      version: '1.0',
      lastUpdated: new Date().toISOString(),
      currentWork: {},
      sharedResources: {},
      notes: 'Real-time coordination file. Agents check before starting work, update status during, mark complete after.',
    };
    
    // Ensure .claude directory exists
    const dir = path.dirname(COORDINATION_FILE);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(COORDINATION_FILE, JSON.stringify(defaultData, null, 2));
    
    return defaultData;
  }
}

/**
 * Save coordination.json
 */
export async function saveCoordination(data: CoordinationData): Promise<void> {
  data.lastUpdated = new Date().toISOString();
  
  // Ensure directory exists
  const dir = path.dirname(COORDINATION_FILE);
  await fs.mkdir(dir, { recursive: true });
  
  await fs.writeFile(COORDINATION_FILE, JSON.stringify(data, null, 2));
}

/**
 * Check for file conflicts with existing active tasks
 * Returns warnings but does NOT block
 */
export async function checkFileConflicts(
  taskId: string,
  files: string[]
): Promise<ConflictWarning[]> {
  if (!files || files.length === 0) return [];
  
  const data = await loadCoordination();
  const warnings: ConflictWarning[] = [];
  
  for (const file of files) {
    // Check each active task's files
    for (const [existingTaskId, ownership] of Object.entries(data.currentWork)) {
      // Skip self
      if (existingTaskId === taskId) continue;
      
      // Check for overlap (exact match or path containment)
      if (ownership.files.some(f => filesOverlap(file, f))) {
        warnings.push({
          file,
          ownedBy: existingTaskId,
          agent: ownership.agent,
          since: ownership.since,
        });
      }
    }
  }
  
  return warnings;
}

/**
 * Check if two file paths overlap
 * Handles exact match and directory containment
 */
function filesOverlap(fileA: string, fileB: string): boolean {
  const normA = normalizeFilePath(fileA);
  const normB = normalizeFilePath(fileB);
  
  // Exact match
  if (normA === normB) return true;
  
  // A is inside B's directory
  if (normA.startsWith(normB + '/')) return true;
  
  // B is inside A's directory
  if (normB.startsWith(normA + '/')) return true;
  
  return false;
}

/**
 * Normalize file path for comparison
 */
function normalizeFilePath(filePath: string): string {
  return filePath
    .replace(/\\/g, '/')  // Windows paths
    .replace(/^\.\//, '') // Remove leading ./
    .replace(/\/+/g, '/') // Multiple slashes
    .replace(/\/$/, '');  // Trailing slash
}

/**
 * Register file ownership for a task
 * Call when task becomes active (in-progress)
 */
export async function registerFileOwnership(
  taskId: string,
  files: string[],
  agent?: string
): Promise<CoordinationResult> {
  if (!files || files.length === 0) {
    return { success: true, warnings: [] };
  }
  
  // Check for conflicts first (warn, don't block)
  const warnings = await checkFileConflicts(taskId, files);
  
  // Register ownership anyway
  const data = await loadCoordination();
  
  data.currentWork[taskId] = {
    taskId,
    files,
    agent,
    since: Date.now(),
  };
  
  await saveCoordination(data);
  
  return { success: true, warnings };
}

/**
 * Release file ownership for a task
 * Call when task is completed or archived
 */
export async function releaseFileOwnership(taskId: string): Promise<void> {
  const data = await loadCoordination();
  
  if (data.currentWork[taskId]) {
    delete data.currentWork[taskId];
    await saveCoordination(data);
  }
}

/**
 * Update file list for an existing task
 */
export async function updateFileOwnership(
  taskId: string,
  files: string[],
  agent?: string
): Promise<CoordinationResult> {
  const data = await loadCoordination();
  const existing = data.currentWork[taskId];
  
  if (!files || files.length === 0) {
    // Remove ownership if files cleared
    if (existing) {
      delete data.currentWork[taskId];
      await saveCoordination(data);
    }
    return { success: true, warnings: [] };
  }
  
  // Check for conflicts on any new files
  const warnings = await checkFileConflicts(taskId, files);
  
  // Update ownership
  data.currentWork[taskId] = {
    taskId,
    files,
    agent: agent || existing?.agent,
    since: existing?.since || Date.now(),
  };
  
  await saveCoordination(data);
  
  return { success: true, warnings };
}

/**
 * Get current ownership status for display
 */
export async function getCoordinationStatus(): Promise<CoordinationData> {
  return loadCoordination();
}
