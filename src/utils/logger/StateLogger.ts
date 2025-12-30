import { debugLog } from "./index";

/**
 * StateLogger tracks creep state transitions and queue behavior
 * Provides visibility into system behavior for debugging and optimization
 */
export class StateLogger {
  private static readonly LOG_INTERVAL = 10; // Log every 10 ticks
  private static readonly DEBUG_MODE = true; // Set to false to disable verbose logging

  /**
   * Logs a creep state change (e.g., harvesting → transferring)
   * Helps track creep behavior and identify bottlenecks
   */
  public static logStateChange(
    creepName: string,
    oldState: string,
    newState: string,
    role: string,
    additionalInfo?: Record<string, any>
  ): void {
    if (!StateLogger.DEBUG_MODE) return;

    if (Game.time % StateLogger.LOG_INTERVAL === 0) {
      const infoStr = additionalInfo
        ? ` | ${Object.entries(additionalInfo)
            .map(([k, v]) => `${k}=${v}`)
            .join(", ")}`
        : "";

      debugLog.info(
        `[StateChange] ${creepName} (${role}): ${oldState} → ${newState}${infoStr}`
      );
    }
  }

  /**
   * Logs a hauler's queue position and energy accumulation at source
   * Tracks queue efficiency and waiting times
   */
  public static logQueuePosition(
    creepName: string,
    sourceId: string,
    position: number,
    queueLength: number,
    energyAccumulated: number,
    energyThreshold: number
  ): void {
    if (!StateLogger.DEBUG_MODE) return;

    if (Game.time % StateLogger.LOG_INTERVAL === 0) {
      const readyStatus =
        energyAccumulated >= energyThreshold * (position + 1) ? "✓ READY" : "⏳ WAIT";

      debugLog.debug(
        `[Queue] ${creepName} @ Source${sourceId.slice(-4)}: pos=${position}/${queueLength} energy=${energyAccumulated}/${energyThreshold * (position + 1)} ${readyStatus}`
      );
    }
  }

  /**
   * Logs team assignment changes for harvesters and haulers
   */
  public static logTeamAssignment(
    creepName: string,
    role: string,
    sourceId: string,
    teamComposition?: { harvesters: number; haulers: number }
  ): void {
    if (!StateLogger.DEBUG_MODE) return;

    const teamStr = teamComposition
      ? ` | Team: ${teamComposition.harvesters}H ${teamComposition.haulers}U`
      : "";

    debugLog.info(`[TeamAssign] ${creepName} (${role}) assigned to Source${sourceId.slice(-4)}${teamStr}`);
  }

  /**
   * Logs source energy accumulation for queue efficiency tracking
   */
  public static logSourceAccumulation(
    sourceId: string,
    totalEnergy: number,
    droppedEnergyCount: number,
    queueLength: number
  ): void {
    if (!StateLogger.DEBUG_MODE) return;

    if (Game.time % (StateLogger.LOG_INTERVAL * 2) === 0) {
      debugLog.debug(
        `[Source] Source${sourceId.slice(-4)}: ${totalEnergy} energy | ${droppedEnergyCount} piles | Queue: ${queueLength}`
      );
    }
  }

  /**
   * Logs spawn sequence progress
   */
  public static logSpawnSequence(
    harvesters: number,
    haulers: number,
    step: string
  ): void {
    if (!StateLogger.DEBUG_MODE) return;

    if (Game.time % StateLogger.LOG_INTERVAL === 0) {
      debugLog.info(`[SpawnSeq] H:${harvesters} U:${haulers} | Step: ${step}`);
    }
  }

  /**
   * Toggle debug mode on/off
   */
  public static setDebugMode(enabled: boolean): void {
    (StateLogger as any).DEBUG_MODE = enabled;
    debugLog.info(`StateLogger debug mode: ${enabled ? "ON" : "OFF"}`);
  }

  /**
   * Get current memory snapshot for analysis
   */
  public static getMemorySnapshot(): Record<string, any> {
    return {
      timestamp: Game.time,
      sources: Memory.sources ? Object.keys(Memory.sources).length : 0,
      creeps: Object.keys(Game.creeps).length,
    };
  }
}
