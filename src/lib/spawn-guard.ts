/**
 * spawn-guard.ts - Pre-spawn validation for workflow enforcement (mc-002)
 * 
 * Validates that a task is eligible for agent spawn:
 * - Task file must exist
 * - Status must be 'ready' OR valid emergency override
 * 
 * Call validateSpawn() BEFORE spawning any agent for task work.
 */

import { getTaskById, Task } from './tasks';

export interface SpawnValidationResult {
  blocked: boolean;
  reason?: string;
  bypassed?: boolean;  // True if emergency override was used
  task?: Task;
}

/**
 * Validate whether an agent can be spawned for a given task.
 * 
 * @param taskId - The task ID to validate
 * @returns SpawnValidationResult indicating if spawn is allowed
 * 
 * @example
 * const result = await validateSpawn('mc-002');
 * if (result.blocked) {
 *   console.error(`Cannot spawn: ${result.reason}`);
 *   return;
 * }
 * // Proceed with spawn...
 */
export async function validateSpawn(taskId: string): Promise<SpawnValidationResult> {
  // Check task exists
  const task = await getTaskById(taskId);
  if (!task) {
    return { 
      blocked: true, 
      reason: `Task file not found: ${taskId}` 
    };
  }
  
  // Emergency override bypasses all checks (Ryan-only)
  if (task.emergencyOverride?.authorizedBy?.toLowerCase() === 'ryan') {
    return { 
      blocked: false, 
      bypassed: true,
      task 
    };
  }
  
  // Check status is 'completed' (ready for deployment/spawn)
  if (task.status !== 'completed') {
    return { 
      blocked: true, 
      reason: `Task status is '${task.status}' — must be 'completed' to spawn (or Ryan can authorize emergency override)`,
      task
    };
  }
  
  return { 
    blocked: false,
    task 
  };
}

/**
 * Quick check if task is spawn-ready (convenience wrapper)
 */
export async function isSpawnReady(taskId: string): Promise<boolean> {
  const result = await validateSpawn(taskId);
  return !result.blocked;
}
