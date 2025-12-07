import { CreepRole, CreepRoleEnum } from "../types";
import { getCurrentCreepCounts } from "../manual.spawner";
import { getCurrentSpawnTier } from "../utils/energy-bootstrap";

/**
 * Interface for UI display options
 */
export interface UIDisplayOptions {
  showHeader?: boolean;
  showTotal?: boolean;
  showEmptyRoles?: boolean;
  colorize?: boolean;
  compact?: boolean;
}

/**
 * Interface for room statistics
 */
export interface RoomStats {
  name: string;
  energyAvailable: number;
  energyCapacity: number;
  controllerLevel?: number;
  spawns: number;
  spawnTier: string;
}

/**
 * Interface for comprehensive game statistics
 */
export interface GameStatistics {
  creepCounts: Record<CreepRole, number>;
  totalCreeps: number;
  roomStats: RoomStats[];
  gameTime: number;
}

/**
 * Main UI class for displaying game statistics
 */
export class GameStatsUI {
  private static instance: GameStatsUI | null = null;
  private lastUpdateTick: number = 0;
  private cachedStats: GameStatistics | null = null;

  /**
   * Singleton pattern - get the global UI instance
   */
  public static getInstance(): GameStatsUI {
    if (!GameStatsUI.instance) {
      GameStatsUI.instance = new GameStatsUI();
    }
    return GameStatsUI.instance;
  }

  /**
   * Get current game statistics
   */
  public getGameStatistics(): GameStatistics {
    // Cache stats for the current tick to avoid multiple calculations
    if (this.cachedStats && this.lastUpdateTick === Game.time) {
      return this.cachedStats;
    }

    const creepCounts = getCurrentCreepCounts();
    const totalCreeps = Object.values(creepCounts).reduce((sum, count) => sum + count, 0);

    const roomStats: RoomStats[] = Object.values(Game.rooms).map(room => ({
      name: room.name,
      energyAvailable: room.energyAvailable,
      energyCapacity: room.energyCapacityAvailable,
      controllerLevel: room.controller?.level,
      spawns: room.find(FIND_MY_SPAWNS).length,
      spawnTier: getCurrentSpawnTier(room)
    }));

    this.cachedStats = {
      creepCounts,
      totalCreeps,
      roomStats,
      gameTime: Game.time
    };

    this.lastUpdateTick = Game.time;
    return this.cachedStats;
  }

  /**
   * Display creep statistics in console format
   */
  public displayCreepStats(options: UIDisplayOptions = {}): string {
    const defaultOptions: UIDisplayOptions = {
      showHeader: true,
      showTotal: true,
      showEmptyRoles: false,
      colorize: true,
      compact: false
    };

    const opts = { ...defaultOptions, ...options };
    const stats = this.getGameStatistics();
    const lines: string[] = [];

    // Header
    if (opts.showHeader) {
      const header = opts.compact ? "Creeps:" : "=== Creep Statistics ===";
      lines.push(opts.colorize ? `<span style='color:#00ff00'>${header}</span>` : header);
    }

    // Role counts
    const roleEntries = Object.entries(stats.creepCounts) as [CreepRole, number][];

    for (const [role, count] of roleEntries) {
      if (!opts.showEmptyRoles && count === 0) continue;

      const roleName = this.formatRoleName(role);
      const countStr = count.toString();

      if (opts.compact) {
        lines.push(`${roleName}: ${countStr}`);
      } else {
        const line = `${roleName.padEnd(12)}: ${countStr.padStart(3)}`;
        if (opts.colorize) {
          const color = count === 0 ? '#ff6666' : '#66ff66';
          lines.push(`<span style='color:${color}'>${line}</span>`);
        } else {
          lines.push(line);
        }
      }
    }

    // Total
    if (opts.showTotal) {
      const totalLine = opts.compact ?
        `Total: ${stats.totalCreeps}` :
        `${'Total'.padEnd(12)}: ${stats.totalCreeps.toString().padStart(3)}`;

      if (opts.colorize) {
        lines.push(`<span style='color:#ffff00'>${totalLine}</span>`);
      } else {
        lines.push(totalLine);
      }
    }

    return lines.join('\n');
  }

  /**
   * Display room statistics
   */
  public displayRoomStats(options: UIDisplayOptions = {}): string {
    const opts = { showHeader: true, colorize: true, ...options };
    const stats = this.getGameStatistics();
    const lines: string[] = [];

    if (opts.showHeader) {
      const header = "=== Room Statistics ===";
      lines.push(opts.colorize ? `<span style='color:#00ff00'>${header}</span>` : header);
    }

    for (const room of stats.roomStats) {
      const energyPercent = Math.round((room.energyAvailable / room.energyCapacity) * 100);
      const levelStr = room.controllerLevel ? `RCL${room.controllerLevel}` : 'No Controller';

      const roomLine = `${room.name}: ${levelStr}, Tier: ${room.spawnTier}, Energy: ${room.energyAvailable}/${room.energyCapacity} (${energyPercent}%), Spawns: ${room.spawns}`;

      if (opts.colorize) {
        const energyColor = energyPercent > 80 ? '#66ff66' : energyPercent > 50 ? '#ffff66' : '#ff6666';
        lines.push(`<span style='color:${energyColor}'>${roomLine}</span>`);
      } else {
        lines.push(roomLine);
      }
    }

    return lines.join('\n');
  }

  /**
   * Display comprehensive game overview
   */
  public displayGameOverview(options: UIDisplayOptions = {}): string {
    const opts = { showHeader: true, colorize: true, ...options };
    const stats = this.getGameStatistics();
    const lines: string[] = [];

    if (opts.showHeader) {
      const header = `=== Game Overview (Tick ${stats.gameTime}) ===`;
      lines.push(opts.colorize ? `<span style='color:#00ffff'>${header}</span>` : header);
    }

    // Spawning pause state (spawn pause affects only spawning; creeps continue)
    try {
      const gm = (global as any).gm;
      const spawnState = gm && typeof gm.isSpawningPaused === 'function' && gm.isSpawningPaused()
        ? '⏸️ PAUSED (creeps active)'
        : '▶️ ACTIVE';

      const spawnLine = opts.colorize ? `<span style='color:#ffcc00'>Spawning: ${spawnState}</span>` : `Spawning: ${spawnState}`;
      lines.push(spawnLine);
      lines.push('');
    } catch (e) {
      // ignore if global.gm not available
    }

    // Room claiming state summary (if Memory.rooms exists)
    try {
      if ((Memory as any).rooms) {
        const rooms = (Memory as any).rooms;
        const claimed = Object.keys(rooms).filter(r => rooms[r].claimed).length;
        const discovered = Object.keys(rooms).filter(r => rooms[r].discovered && !rooms[r].claimed && !rooms[r].unsafe).length;
        const unsafe = Object.keys(rooms).filter(r => rooms[r].unsafe).length;

        const roomLine = opts.colorize ? `<span style='color:#aaffaa'>Rooms - Claimed: ${claimed}, Discovered: ${discovered}, Unsafe: ${unsafe}</span>` : `Rooms - Claimed: ${claimed}, Discovered: ${discovered}, Unsafe: ${unsafe}`;
        lines.push(roomLine);
        lines.push('');
      }
    } catch (e) {
      // ignore
    }

    // Creep summary
    lines.push(this.displayCreepStats({ ...opts, showHeader: false, compact: true }));
    lines.push(''); // Empty line

    // Room summary
    lines.push(this.displayRoomStats({ ...opts, showHeader: false }));

    return lines.join('\n');
  }

  /**
   * Format role name for display
   */
  private formatRoleName(role: CreepRole): string {
    return role.charAt(0).toUpperCase() + role.slice(1);
  }

  /**
   * Display stats as visual overlay in a specific room
   */
  public displayVisualOverlay(roomName: string, x: number = 1, y: number = 1): void {
    const room = Game.rooms[roomName];
    if (!room) return;

    const stats = this.getGameStatistics();
    const visual = room.visual;

    let currentY = y;

    // Title
    visual.text('Creep Stats', x, currentY, {
      color: '#00ff00',
      font: 0.6,
      align: 'left'
    });
    currentY += 0.8;

    // Spawn Tier
    const roomStats = stats.roomStats.find(r => r.name === roomName);
    if (roomStats) {
      visual.text(`Tier: ${roomStats.spawnTier}`, x, currentY, {
        color: '#00ffff',
        font: 0.5,
        align: 'left'
      });
      currentY += 0.6;
    }

    // Role counts
    const roleEntries = Object.entries(stats.creepCounts) as [CreepRole, number][];
    for (const [role, count] of roleEntries) {
      if (count === 0) continue;

      const text = `${this.formatRoleName(role)}: ${count}`;
      const color = count > 0 ? '#66ff66' : '#ff6666';

      visual.text(text, x, currentY, {
        color,
        font: 0.5,
        align: 'left'
      });
      currentY += 0.6;
    }

    // Total
    visual.text(`Total: ${stats.totalCreeps}`, x, currentY, {
      color: '#ffff00',
      font: 0.5,
      align: 'left'
    });
  }
}

/**
 * Convenience function to get the UI instance
 */
export function getGameStatsUI(): GameStatsUI {
  return GameStatsUI.getInstance();
}
