import { GameManager } from "GameManager";
import { CreepRole, BaseCreepMemory } from "./src/types";
import { SpawnResult, SpawnStatus, ManualSpawner } from "./src/manual.spawner";
import { UIDisplayOptions, GameStatistics, GameStatsUI } from "./src/ui";

declare global {
   /*
    Example types, expand on these or remove them and add your own.
    Note: Values, properties defined here do no fully *exist* by this type definiton alone.
          You must also give them an implemention if you would like to use them. (ex. actually setting a `role` property in a Creeps memory)

    Types added in this `global` block are in an ambient, global context. This is needed because `main.ts` is a module file (uses import or export).
    Interfaces matching on name from @types/screeps will be merged. This is how you can extend the 'built-in' interfaces from @types/screeps.
  */
  // Memory extension samples
  interface Memory {
    uuid: number;
    log: any;
  }

  /**
   * Enhanced CreepMemory interface with type-safe role system
   * This extends the base Screeps CreepMemory interface with our custom types
   */
  interface CreepMemory extends BaseCreepMemory {
    role: CreepRole;
    room: string;
    working: boolean;

    // Common state flags
    building?: boolean;
    upgrading?: boolean;
    harvesting?: boolean;
    transfering?: boolean;
    haulering?: boolean;

    // Common target properties
    target?: Id<_HasId>;
    source?: Id<Source>;
    sourceTarget?: Id<Source>;
    prevSourceTarget?: Id<Source>;
    prevTargets?: Id<Source>[];
    resourceTarget?: Id<Resource | Structure | Tombstone | Ruin>;
    prevResourceTarget?: Id<Resource | Structure | Tombstone | Ruin>;
    prevResourceTargets?: Id<Resource | Structure | Tombstone | Ruin>[];

    // Role-specific properties
    sourceTargetId?: Id<Source>; // For harvesters
    lastStep?: boolean; // For harvesters
    buildTarget?: Id<ConstructionSite>; // For builders
    prevBuildTarget?: Id<ConstructionSite>; // For builders
    nextRole?: CreepRole; // For explorers

    // Index signature for additional properties
    [name: string]: any;
  }

  // Syntax for adding proprties to `global` (ex "global.log")
  namespace NodeJS {
    interface Global {
      log: any;
      gm: GameManager;

      // Manual Spawner Functions - accessible from game console
      spawnCreep: (creepType: CreepRole, spawnName?: string, customBody?: BodyPartConstant[], customName?: string) => SpawnResult;
      spawnHarvester: (spawnName?: string, customBody?: BodyPartConstant[]) => SpawnResult;
      spawnHauler: (spawnName?: string, customBody?: BodyPartConstant[]) => SpawnResult;
      spawnBuilder: (spawnName?: string, customBody?: BodyPartConstant[]) => SpawnResult;
      spawnUpgrader: (spawnName?: string, customBody?: BodyPartConstant[]) => SpawnResult;
      spawnDefender: (spawnName?: string, customBody?: BodyPartConstant[]) => SpawnResult;
      spawnRanger: (spawnName?: string, customBody?: BodyPartConstant[]) => SpawnResult;
      spawnExplorer: (spawnName?: string, customBody?: BodyPartConstant[], nextRole?: CreepRole) => SpawnResult;

      // Spawn Status and Information Functions
      getSpawnStatus: (spawnName: string) => SpawnStatus | null;
      getAllSpawnStatuses: () => Record<string, SpawnStatus>;
      getCurrentCreepCounts: () => Record<CreepRole, number>;
      needsMoreCreeps: (role: CreepRole, roomName?: string) => boolean;
      getBodyPreview: (role: CreepRole, availableEnergy?: number, energyCapacity?: number) => {
        body: BodyPartConstant[];
        cost: number;
        tier: string;
      };

      // Manual Spawner Instance Access
      getManualSpawner: (spawnManager?: any) => ManualSpawner;

      // UI Functions - accessible from game console
      showCreeps: (options?: UIDisplayOptions) => void;
      showRooms: (options?: UIDisplayOptions) => void;
      showStats: (options?: UIDisplayOptions) => void;
      showVisual: (roomName?: string, x?: number, y?: number) => void;
      getStats: () => GameStatistics;
      creeps: () => void;
      rooms: () => void;
      toggleVisual: () => void;
      helpUI: () => void;
      getGameStatsUI: () => GameStatsUI;
    }
  }
}

export {};
