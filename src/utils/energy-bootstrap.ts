/**
 * Energy Bootstrap Module
 * Provides tiered spawn templates and safe-spawn logic for recovery from 0 energy scenarios
 * Ensures bot can recover from complete workforce loss (e.g., after attack)
 */

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * Spawn body tier levels for scaling creep complexity based on available energy
 */
export enum SpawnTier {
  EMERGENCY = "EMERGENCY",    // Minimal body for survival: 1 WORK + 1 MOVE + 1 CARRY (~200 energy)
  NORMAL = "NORMAL",          // Standard body for role: varies by role (~400-500 energy)
  ADVANCED = "ADVANCED"       // Optimized body for efficiency: varies by role (~800-1000 energy)
}

/**
 * Spawn template definition for a creep body composition
 */
export interface SpawnTemplate {
  tier: SpawnTier;
  body: BodyPartConstant[];
  energyCost: number;
  minEnergyRequired: number;  // Minimum energy in spawn to attempt this template
  maxEnergyUsage: number;     // Max energy this template will consume from spawn
  description: string;
}

/**
 * Result of a spawn attempt with diagnostic information
 */
export interface SpawnResult {
  success: boolean;
  templateUsed?: SpawnTemplate;
  reason?: string;
  energyNeeded?: number;
}

// ============================================================================
// ENERGY RESERVE THRESHOLDS
// ============================================================================

/**
 * Energy reserve configuration per controller level
 * Prevents spawning large bodies when energy is unpredictable
 */
export const ENERGY_RESERVE_THRESHOLDS: { [level: number]: number } = {
  1: 149,   // Level 1: minimal buffer, spawn at 150+
  2: 200,   // Level 2: slightly higher buffer for larger bodies
  3: 300,   // Level 3+: significant buffer for complex spawns
  4: 400,
  5: 500,
  6: 600,
  7: 700,
  8: 800
};

/**
 * Get the energy reserve threshold for a given controller level
 */
export function getEnergyReserveThreshold(level: number): number {
  return ENERGY_RESERVE_THRESHOLDS[Math.min(level, 8)] || ENERGY_RESERVE_THRESHOLDS[8];
}

// ============================================================================
// SPAWN TEMPLATES BY ROLE
// ============================================================================

/**
 * Emergency template: bare minimum for survival
 * 1 WORK (harvest) + 1 MOVE (mobility) + 1 CARRY (transport)
 * Energy cost: 200
 */
const EMERGENCY_TEMPLATE: SpawnTemplate = {
  tier: SpawnTier.EMERGENCY,
  body: [WORK, MOVE, CARRY],
  energyCost: 200,
  minEnergyRequired: 200,
  maxEnergyUsage: 200,
  description: "Emergency: 1 WORK + 1 MOVE + 1 CARRY (200 energy)"
};

/**
 * Harvester templates by tier
 */
export const HARVESTER_TEMPLATES: SpawnTemplate[] = [
  {
  tier: SpawnTier.EMERGENCY,
  body: [WORK, MOVE],
  energyCost: 150,
  minEnergyRequired: 150,
  maxEnergyUsage: 150,
  description: "Emergency: 1 WORK + 1 MOVE  (150 energy)"
},
  {
    tier: SpawnTier.NORMAL,
    body: [WORK, WORK, CARRY, MOVE, MOVE],
    energyCost: 350,
    minEnergyRequired: 350,
    maxEnergyUsage: 400,
    description: "Normal Harvester: 2 WORK + 1 CARRY + 2 MOVE (350 energy)"
  },
  {
    tier: SpawnTier.ADVANCED,
    body: [WORK, WORK, WORK, CARRY, CARRY, MOVE, MOVE, MOVE],
    energyCost: 550,
    minEnergyRequired: 500,
    maxEnergyUsage: 600,
    description: "Advanced Harvester: 3 WORK + 2 CARRY + 3 MOVE (550 energy)"
  }
];

/**
 * Hauler templates by tier
 * Optimized for energy transport with high CARRY ratio
 */
export const HAULER_TEMPLATES: SpawnTemplate[] = [
    {
  tier: SpawnTier.EMERGENCY,
  body: [CARRY, MOVE],
  energyCost: 100,
  minEnergyRequired: 100,
  maxEnergyUsage: 100,
  description: "Emergency: 1 CARRY + 1 MOVE  (100 energy)"
},
  {
    tier: SpawnTier.NORMAL,
    body: [CARRY, CARRY, CARRY, MOVE, MOVE],
    energyCost: 350,
    minEnergyRequired: 350,
    maxEnergyUsage: 400,
    description: "Normal Hauler: 3 CARRY + 2 MOVE (350 energy)"
  },
  {
    tier: SpawnTier.ADVANCED,
    body: [CARRY, CARRY, CARRY, CARRY, CARRY, MOVE, MOVE, MOVE],
    energyCost: 650,
    minEnergyRequired: 600,
    maxEnergyUsage: 700,
    description: "Advanced Hauler: 5 CARRY + 3 MOVE (650 energy)"
  }
];

/**
 * Builder templates by tier
 * Balanced WORK and CARRY for construction tasks
 */
export const BUILDER_TEMPLATES: SpawnTemplate[] = [
  EMERGENCY_TEMPLATE,
  {
    tier: SpawnTier.NORMAL,
    body: [WORK, CARRY, CARRY, MOVE, MOVE],
    energyCost: 350,
    minEnergyRequired: 350,
    maxEnergyUsage: 400,
    description: "Normal Builder: 1 WORK + 2 CARRY + 2 MOVE (350 energy)"
  },
  {
    tier: SpawnTier.ADVANCED,
    body: [WORK, WORK, CARRY, CARRY, CARRY, MOVE, MOVE, MOVE],
    energyCost: 550,
    minEnergyRequired: 500,
    maxEnergyUsage: 600,
    description: "Advanced Builder: 2 WORK + 3 CARRY + 3 MOVE (550 energy)"
  }
];

/**
 * Upgrader templates by tier
 * Optimized for controller upgrade with high WORK ratio
 */
export const UPGRADER_TEMPLATES: SpawnTemplate[] = [
  EMERGENCY_TEMPLATE,
  {
    tier: SpawnTier.NORMAL,
    body: [WORK, WORK, CARRY, MOVE, MOVE],
    energyCost: 350,
    minEnergyRequired: 350,
    maxEnergyUsage: 400,
    description: "Normal Upgrader: 2 WORK + 1 CARRY + 2 MOVE (350 energy)"
  },
  {
    tier: SpawnTier.ADVANCED,
    body: [WORK, WORK, WORK, CARRY, CARRY, MOVE, MOVE, MOVE],
    energyCost: 550,
    minEnergyRequired: 500,
    maxEnergyUsage: 600,
    description: "Advanced Upgrader: 3 WORK + 2 CARRY + 3 MOVE (550 energy)"
  }
];

/**
 * Defender templates by tier
 * Combat-focused with ATTACK and MOVE for survivability
 */
export const DEFENDER_TEMPLATES: SpawnTemplate[] = [
  EMERGENCY_TEMPLATE,
  {
    tier: SpawnTier.NORMAL,
    body: [ATTACK, ATTACK, MOVE, MOVE, MOVE],
    energyCost: 360,
    minEnergyRequired: 350,
    maxEnergyUsage: 400,
    description: "Normal Defender: 2 ATTACK + 3 MOVE (360 energy)"
  },
  {
    tier: SpawnTier.ADVANCED,
    body: [ATTACK, ATTACK, ATTACK, ATTACK, MOVE, MOVE, MOVE, MOVE],
    energyCost: 640,
    minEnergyRequired: 600,
    maxEnergyUsage: 700,
    description: "Advanced Defender: 4 ATTACK + 4 MOVE (640 energy)"
  }
];

/**
 * Ranger templates by tier
 * Ranged combat with RANGED_ATTACK and MOVE
 */
export const RANGER_TEMPLATES: SpawnTemplate[] = [
  EMERGENCY_TEMPLATE,
  {
    tier: SpawnTier.NORMAL,
    body: [RANGED_ATTACK, RANGED_ATTACK, MOVE, MOVE, MOVE],
    energyCost: 360,
    minEnergyRequired: 350,
    maxEnergyUsage: 400,
    description: "Normal Ranger: 2 RANGED_ATTACK + 3 MOVE (360 energy)"
  },
  {
    tier: SpawnTier.ADVANCED,
    body: [RANGED_ATTACK, RANGED_ATTACK, RANGED_ATTACK, MOVE, MOVE, MOVE, MOVE],
    energyCost: 530,
    minEnergyRequired: 500,
    maxEnergyUsage: 600,
    description: "Advanced Ranger: 3 RANGED_ATTACK + 4 MOVE (530 energy)"
  }
];

/**
 * Explorer templates by tier
 * Optimized for movement and discovery
 */
export const EXPLORER_TEMPLATES: SpawnTemplate[] = [
  EMERGENCY_TEMPLATE,
  {
    tier: SpawnTier.NORMAL,
    body: [MOVE, MOVE, MOVE, CARRY],
    energyCost: 350,
    minEnergyRequired: 350,
    maxEnergyUsage: 400,
    description: "Normal Explorer: 3 MOVE + 1 CARRY (350 energy)"
  },
  {
    tier: SpawnTier.ADVANCED,
    body: [MOVE, MOVE, MOVE, MOVE, MOVE, CARRY, CARRY],
    energyCost: 450,
    minEnergyRequired: 400,
    maxEnergyUsage: 500,
    description: "Advanced Explorer: 5 MOVE + 2 CARRY (450 energy)"
  }
];

// ============================================================================
// TEMPLATE RETRIEVAL FUNCTIONS
// ============================================================================

/**
 * Get all templates for a specific role
 */
export function getTemplatesForRole(role: string): SpawnTemplate[] {
  switch (role) {
    case "harvester":
      return HARVESTER_TEMPLATES;
    case "hauler":
      return HAULER_TEMPLATES;
    case "builder":
      return BUILDER_TEMPLATES;
    case "upgrader":
      return UPGRADER_TEMPLATES;
    case "defender":
      return DEFENDER_TEMPLATES;
    case "ranger":
      return RANGER_TEMPLATES;
    case "explorer":
      return EXPLORER_TEMPLATES;
    default:
      return [EMERGENCY_TEMPLATE];
  }
}

/**
 * Select the best spawn template based on available energy and spawn context
 * Prefers higher tiers when energy permits, falls back to emergency tier
 *
 * @param availableEnergy - Energy available in spawn
 * @param role - Creep role to spawn
 * @param controllerLevel - Current room controller level
 * @param isRecoveryMode - If true, prioritize emergency spawning
 * @returns Best available template or undefined if insufficient energy
 */
export function selectBestTemplate(
  availableEnergy: number,
  role: string,
  controllerLevel: number,
  isRecoveryMode: boolean = false,
  bypassReserves: boolean = false
): SpawnTemplate | undefined {
  const templates = getTemplatesForRole(role);
  const energyReserve = getEnergyReserveThreshold(controllerLevel);

  // Calculate available energy after reserve (unless bypassing reserves)
  const usableEnergy = bypassReserves ? availableEnergy : availableEnergy - energyReserve;

  // In recovery mode, prioritize emergency template to spawn ASAP
  if (isRecoveryMode) {
    const emergency = templates.find(t => t.tier === SpawnTier.EMERGENCY);
    if (emergency && usableEnergy >= emergency.minEnergyRequired) {
      return emergency;
    }
    return undefined;
  }

  // Normal mode: try to use best available tier
  // Iterate from highest to lowest tier
  const sortedTemplates = [...templates].reverse();

  for (const template of sortedTemplates) {
    if (usableEnergy >= template.minEnergyRequired) {
      return template;
    }
  }

  return undefined;
}

/**
 * Check if a spawn can safely spawn a creep without violating energy reserves
 *
 * @param spawn - The spawn structure
 * @param template - The template to attempt
 * @param controllerLevel - Current room controller level
 * @returns True if spawn has enough energy after reserves
 */
export function canSafelySpawn(
  spawn: StructureSpawn,
  template: SpawnTemplate,
  controllerLevel: number
): boolean {
  const energyReserve = getEnergyReserveThreshold(controllerLevel);
  const availableEnergy = spawn.store[RESOURCE_ENERGY];
  console.log('Available Energy:', availableEnergy, 'Template Cost:', template.energyCost, 'Energy Reserve:', energyReserve);
  return availableEnergy >= (template.energyCost + energyReserve);
}

/**
 * Calculate if the spawn is in recovery mode (insufficient energy for normal operations)
 * Recovery mode = available energy < 0.3 * energyCapacity AND no active harvesters
 *
 * @param spawn - The spawn structure
 * @param activeHarvesters - Number of active harvesters in the room
 * @returns True if in recovery mode
 */
export function isInRecoveryMode(spawn: StructureSpawn, activeHarvesters: number = 0): boolean {
  const energyRatio = spawn.store[RESOURCE_ENERGY] / spawn.store.getCapacity(RESOURCE_ENERGY);
  return energyRatio < 0.3 && activeHarvesters === 0;
}

// ============================================================================
// CONTAINER CACHING
// ============================================================================

/**
 * Cache structure for container locations in memory
 */
export interface ContainerCache {
  roomName: string;
  containerIds: Id<StructureContainer>[];
  storageIds: Id<StructureStorage>[];
  lastUpdated: number;
  updateInterval: number; // Ticks between updates
}

/**
 * Initialize container cache for a room in memory
 */
export function initializeContainerCache(roomName: string): void {
  if (!Memory.containers) {
    Memory.containers = {};
  }

  if (!Memory.containers[roomName]) {
    Memory.containers[roomName] = {
      roomName,
      containerIds: [],
      storageIds: [],
      lastUpdated: Game.time,
      updateInterval: 50 // Update every 50 ticks
    };
  }
}

/**
 * Update container cache for a room (if due)
 * Scans for containers and storage structures
 *
 * @param roomName - Room to update cache for
 * @returns True if cache was updated
 */
export function updateContainerCache(roomName: string): boolean {
  const room = Game.rooms[roomName];
  if (!room) return false;

  if (!Memory.containers) {
    Memory.containers = {};
  }

  const cache = Memory.containers[roomName];
  if (!cache) {
    initializeContainerCache(roomName);
    return updateContainerCache(roomName);
  }

  // Check if update is needed
  if (Game.time - cache.lastUpdated < cache.updateInterval) {
    return false;
  }

  // Scan for containers and storage
  const containers = room.find(FIND_STRUCTURES, {
    filter: (s: Structure) => s.structureType === STRUCTURE_CONTAINER
  }) as StructureContainer[];

  const storage = room.find(FIND_STRUCTURES, {
    filter: (s: Structure) => s.structureType === STRUCTURE_STORAGE
  }) as StructureStorage[];

  // Update cache
  cache.containerIds = containers.map(c => c.id);
  cache.storageIds = storage.map(s => s.id);
  cache.lastUpdated = Game.time;

  return true;
}

/**
 * Get cached container for a room (returns only valid, existing containers)
 *
 * @param roomName - Room to get containers from
 * @returns Array of valid container objects
 */
export function getCachedContainers(roomName: string): StructureContainer[] {
  if (!Memory.containers || !Memory.containers[roomName]) {
    initializeContainerCache(roomName);
    updateContainerCache(roomName);
  }

  const cache = Memory.containers ? Memory.containers[roomName] : undefined;
  if (!cache) return [];

  const containers: StructureContainer[] = [];

  for (const id of cache.containerIds) {
    const container = Game.getObjectById(id);
    if (container && container.structureType === STRUCTURE_CONTAINER) {
      containers.push(container);
    }
  }

  return containers;
}

/**
 * Get cached storage for a room (returns only valid, existing storage)
 *
 * @param roomName - Room to get storage from
export function getCachedStorage(roomName: string): StructureStorage[] {
  if (!Memory.containers || !Memory.containers[roomName]) {
    initializeContainerCache(roomName);
    updateContainerCache(roomName);
  }

  const cache = Memory.containers ? Memory.containers[roomName] : undefined;
  if (!cache) return [];

  const storages: StructureStorage[] = [];

  for (const id of cache.storageIds) {
    const storage = Game.getObjectById(id);
    if (storage && storage.structureType === STRUCTURE_STORAGE) {
      storages.push(storage);
    }
  }

  return storages;
}
  return storages;
}

/**
 * Clean up invalid entries from container cache (memory garbage collection)
 * Called periodically to remove references to destroyed structures
 */
export function cleanupContainerCache(roomName: string): void {
  if (!Memory.containers || !Memory.containers[roomName]) {
    return;
  }

  const cache = Memory.containers[roomName];

  // Filter out invalid IDs
  cache.containerIds = cache.containerIds.filter(id => {
    const obj = Game.getObjectById(id);
    return obj !== null && obj.structureType === STRUCTURE_CONTAINER;
  });

  cache.storageIds = cache.storageIds.filter(id => {
    const obj = Game.getObjectById(id);
    return obj !== null && obj.structureType === STRUCTURE_STORAGE;
  });
}

/**
 * Clear all container caches (useful for debugging or room resets)
 */
export function clearAllContainerCaches(): void {
  if (!Memory.containers) {
    Memory.containers = {};
  }
  Memory.containers = {};
}
