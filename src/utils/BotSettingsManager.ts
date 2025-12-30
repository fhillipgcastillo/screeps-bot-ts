import { debugLog } from "./logger";

/**
 * Manages bot settings and configuration
 * Allows runtime modification of spawn patterns and team sizes
 */
export class BotSettingsManager {
  private static readonly DEFAULT_MAX_HARVESTERS = 2;
  private static readonly HAULER_MULTIPLIER = 2; // Haulers = Harvesters * 2

  /**
   * Initialize bot settings if not already done
   */
  public static initializeSettings(): void {
    if (!Memory.botSettings) {
      Memory.botSettings = {
        defaultMaxHarvesters: this.DEFAULT_MAX_HARVESTERS,
        sourceMaxHarvesters: {}
      };
      debugLog.info("Bot settings initialized with defaults");
    }
  }

  /**
   * Get max harvesters for a specific source
   * Returns per-source override if exists, otherwise returns default
   */
  public static getMaxHarvesters(sourceId: string): number {
    this.initializeSettings();
    const settings = Memory.botSettings!;

    // Check for per-source override
    if (settings.sourceMaxHarvesters && settings.sourceMaxHarvesters[sourceId]) {
      return settings.sourceMaxHarvesters[sourceId];
    }

    return settings.defaultMaxHarvesters || this.DEFAULT_MAX_HARVESTERS;
  }

  /**
   * Get max haulers for a specific source (always double the harvesters)
   */
  public static getMaxHaulers(sourceId: string): number {
    return this.getMaxHarvesters(sourceId) * this.HAULER_MULTIPLIER;
  }

  /**
   * Set default max harvesters for all sources (unless overridden per-source)
   */
  public static setDefaultMaxHarvesters(count: number): string {
    this.initializeSettings();
    if (count < 1) {
      return "❌ Max harvesters must be at least 1";
    }
    Memory.botSettings!.defaultMaxHarvesters = count;
    debugLog.info(`Default max harvesters set to ${count}`);
    return `✅ Default max harvesters set to ${count} (haulers: ${count * this.HAULER_MULTIPLIER})`;
  }

  /**
   * Set max harvesters for a specific source
   * If reducing team size, removes excess creeps (LIFO) and re-assigns them
   */
  public static setSourceMaxHarvesters(sourceId: string, count: number): string {
    this.initializeSettings();
    if (count < 1) {
      return "❌ Max harvesters must be at least 1";
    }

    if (!Memory.botSettings!.sourceMaxHarvesters) {
      Memory.botSettings!.sourceMaxHarvesters = {};
    }

    const oldMaxHarvesters = this.getMaxHarvesters(sourceId);
    const newMaxHarvesters = count;
    const newMaxHaulers = count * this.HAULER_MULTIPLIER;

    // Set the new value
    Memory.botSettings!.sourceMaxHarvesters[sourceId] = count;

    // If decreasing team size, remove excess creeps
    if (newMaxHarvesters < oldMaxHarvesters) {
      this.handleTeamSizeReduction(sourceId, newMaxHarvesters, newMaxHaulers);
    }

    const haulerCount = newMaxHaulers;
    debugLog.info(`Source ${sourceId} max harvesters set to ${count}`);
    return `✅ Source ${sourceId.slice(-4)} max harvesters set to ${count} (haulers: ${haulerCount})`;
  }

  /**
   * Handles team size reduction by removing excess creeps (LIFO)
   * and re-assigning them to other teams
   */
  private static handleTeamSizeReduction(sourceId: string, newMaxHarvesters: number, newMaxHaulers: number): void {
    if (!Memory.sources || !Memory.sources[sourceId]) {
      return;
    }

    const sourceMemory = Memory.sources[sourceId];
    const team = sourceMemory.team;
    const removedCreeps: Array<{ name: string; role: string }> = [];

    // Remove excess haulers (LIFO - from the end)
    if (team.haulers && team.haulers.length > newMaxHaulers) {
      const excessCount = team.haulers.length - newMaxHaulers;
      for (let i = 0; i < excessCount; i++) {
        const creepName = team.haulers.pop();
        if (creepName) {
          removedCreeps.push({ name: creepName, role: "hauler" });
          debugLog.info(`Removed hauler ${creepName} from Source${sourceId.slice(-4)} team (team reduced)`);
        }
      }
    }

    // Remove excess harvesters (LIFO - from the end)
    if (team.harvesters && team.harvesters.length > newMaxHarvesters) {
      const excessCount = team.harvesters.length - newMaxHarvesters;
      for (let i = 0; i < excessCount; i++) {
        const creepName = team.harvesters.pop();
        if (creepName) {
          removedCreeps.push({ name: creepName, role: "harvester" });
          debugLog.info(`Removed harvester ${creepName} from Source${sourceId.slice(-4)} team (team reduced)`);
        }
      }
    }

    // Update team max values
    team.maxHarvesters = newMaxHarvesters;
    team.maxHaulers = newMaxHaulers;

    // Re-assign removed creeps to other teams
    this.reassignCreeps(removedCreeps);
  }

  /**
   * Re-assigns creeps to other available teams
   * Checks if creeps already have a team assigned, only re-assigns if needed
   */
  private static reassignCreeps(creeps: Array<{ name: string; role: string }>): void {
    const sources = this.getAllSources();
    if (sources.length === 0) return;

    for (const creepInfo of creeps) {
      const creep = Game.creeps[creepInfo.name];
      if (!creep) continue;

      // Check if creep already has a different team assigned
      if (creep.memory.sourceId && creep.memory.sourceId !== "") {
        debugLog.debug(`Creep ${creepInfo.name} already assigned to ${creep.memory.sourceId}, skipping re-assignment`);
        continue;
      }

      // Find a team with available slots for this role
      let targetSourceId: string | undefined;

      if (creepInfo.role === "harvester") {
        for (const source of sources) {
          if (!Memory.sources || !Memory.sources[source.id]) continue;
          const team = Memory.sources[source.id].team;
          if (team.harvesters.length < team.maxHarvesters) {
            targetSourceId = source.id;
            break;
          }
        }
      } else if (creepInfo.role === "hauler") {
        for (const source of sources) {
          if (!Memory.sources || !Memory.sources[source.id]) continue;
          const team = Memory.sources[source.id].team;
          if (team.harvesters.length > 0 && team.haulers.length < team.maxHaulers) {
            targetSourceId = source.id;
            break;
          }
        }
      }

      // Assign creep to new team
      if (targetSourceId) {
        creep.memory.sourceId = targetSourceId;
        const team = Memory.sources![targetSourceId].team;

        if (creepInfo.role === "harvester") {
          team.harvesters.push(creepInfo.name);
          debugLog.info(`Re-assigned ${creepInfo.name} (Harvester) to Source${targetSourceId.slice(-4)}`);
        } else if (creepInfo.role === "hauler") {
          team.haulers.push(creepInfo.name);
          debugLog.info(`Re-assigned ${creepInfo.name} (Hauler) to Source${targetSourceId.slice(-4)}`);
        }
      } else {
        debugLog.warn(`No available team slot for ${creepInfo.role} ${creepInfo.name}, creep will be unassigned`);
      }
    }
  }

  /**
   * Get all sources in the current room
   */
  private static getAllSources(): Source[] {
    const rooms = Object.keys(Game.rooms);
    if (rooms.length === 0) return [];
    const room = Game.rooms[rooms[0]];
    return room ? room.find(FIND_SOURCES) : [];
  }

  /**
   * Reset a source to use the default max harvesters
   */
  public static resetSourceMaxHarvesters(sourceId: string): string {
    if (Memory.botSettings?.sourceMaxHarvesters && Memory.botSettings.sourceMaxHarvesters[sourceId]) {
      delete Memory.botSettings.sourceMaxHarvesters[sourceId];
      const defaultMax = Memory.botSettings.defaultMaxHarvesters || this.DEFAULT_MAX_HARVESTERS;
      const haulerCount = defaultMax * this.HAULER_MULTIPLIER;
      return `✅ Source ${sourceId.slice(-4)} reset to default (${defaultMax}H, ${haulerCount}U)`;
    }
    return `ℹ️ Source ${sourceId.slice(-4)} already using default`;
  }

  /**
   * Get current settings display
   */
  public static getSettings(): string {
    this.initializeSettings();
    const settings = Memory.botSettings!;
    let output = "=== Bot Settings ===\n";
    output += `Default Max Harvesters: ${settings.defaultMaxHarvesters}\n`;
    output += `Default Max Haulers: ${(settings.defaultMaxHarvesters || 2) * 2}\n`;

    if (settings.sourceMaxHarvesters && Object.keys(settings.sourceMaxHarvesters).length > 0) {
      output += "\nPer-Source Overrides:\n";
      for (const sourceId in settings.sourceMaxHarvesters) {
        const harvesters = settings.sourceMaxHarvesters[sourceId];
        const haulers = harvesters * this.HAULER_MULTIPLIER;
        output += `  Source${sourceId.slice(-4)}: ${harvesters}H, ${haulers}U\n`;
      }
    } else {
      output += "\nNo per-source overrides configured\n";
    }

    return output;
  }
}
