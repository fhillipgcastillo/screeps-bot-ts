import { debugLog } from "./Logger";

/**
 * Interface for objects that have an ID
 */
interface Identifiable {
  id: string;
}

/**
 * Interface for Room Memory extension to support round-robin assignment
 */
interface RoomResourceAssignmentMemory {
  lastAssignedIds?: {
    [role: string]: string;
  };
}

/**
 * Get the next resource target for a creep using a round-robin strategy based on the last assigned ID.
 * This ensures that creeps of the same role are distributed evenly across available targets,
 * while preserving the order of the input targets (e.g., closest first).
 *
 * @param room - The room where the assignment is happening
 * @param role - The role of the creep requesting a target
 * @param targets - The list of available targets (Resources, Structures, Tombstones, Ruins)
 * @returns The selected target or null if no targets are available
 */
export function getNextResourceTarget<T extends Identifiable>(
  room: Room,
  role: string,
  targets: T[]
): T | null {
  if (!targets || targets.length === 0) {
    return null;
  }

  // Do NOT sort targets. We assume they are passed in the desired order (e.g., by distance).

  // Access room memory safely
  if (!room.memory) {
    return targets[0];
  }

  // Initialize assignment memory if needed
  const roomMemory = room.memory as RoomMemory & RoomResourceAssignmentMemory;
  if (!roomMemory.lastAssignedIds) {
    roomMemory.lastAssignedIds = {};
  }

  // Get the ID of the last target assigned to this role
  const lastAssignedId = roomMemory.lastAssignedIds[role];

  // Find the index of the last assigned target in the CURRENT list
  // If lastAssignedId is undefined or not found, foundIndex will be -1
  const foundIndex = targets.findIndex(t => t.id === lastAssignedId);

  // Calculate the next index
  // If foundIndex is -1 (not found/new), nextIndex becomes 0 (start of list)
  // If foundIndex is last element, nextIndex becomes 0 (wrap around)
  const nextIndex = (foundIndex + 1) % targets.length;

  // Select the target
  const selectedTarget = targets[nextIndex];

  // Update memory with the new assignment
  roomMemory.lastAssignedIds[role] = selectedTarget.id;

  debugLog.debug(`[ResourceAssignment] Room ${room.name} Role ${role}: Assigned target ${nextIndex}/${targets.length} (${selectedTarget.id})`);

  return selectedTarget;
}
