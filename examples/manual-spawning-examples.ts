/**
 * Manual Spawning Examples
 * 
 * This file contains examples of how to use the manual spawning system
 * in your Screeps TypeScript bot.
 */

import { 
  spawnCreep, 
  spawnHarvester, 
  spawnBuilder, 
  getSpawnStatus,
  getCurrentCreepCounts,
  needsMoreCreeps,
  getBodyPreview,
  ManualSpawner 
} from '../src/manual.spawner';
import { CreepRoleEnum } from '../src/types';

/**
 * Example 1: Basic spawning using convenience functions
 */
export function basicSpawningExample() {
  console.log("=== Basic Spawning Example ===");
  
  // Spawn different types of creeps
  const harvesterResult = spawnHarvester();
  console.log(`Harvester spawn: ${harvesterResult.message}`);
  
  const builderResult = spawnBuilder();
  console.log(`Builder spawn: ${builderResult.message}`);
  
  // Spawn using specific spawn
  const upgraderResult = spawnCreep(CreepRoleEnum.UPGRADER, 'Spawn1');
  console.log(`Upgrader spawn: ${upgraderResult.message}`);
}

/**
 * Example 2: Advanced spawning with custom configurations
 */
export function advancedSpawningExample() {
  console.log("=== Advanced Spawning Example ===");
  
  // Custom body configuration for a super harvester
  const superHarvesterBody = [WORK, WORK, WORK, WORK, CARRY, MOVE, MOVE];
  const result = spawnHarvester('Spawn1', superHarvesterBody);
  
  if (result.success) {
    console.log(`Spawned super harvester: ${result.creepName}`);
    console.log(`Energy cost: ${result.energyCost}`);
    console.log(`Body parts: ${result.bodyParts?.join(', ')}`);
  } else {
    console.log(`Failed to spawn super harvester: ${result.message}`);
  }
}

/**
 * Example 3: Checking spawn status before spawning
 */
export function statusCheckingExample() {
  console.log("=== Status Checking Example ===");
  
  // Check status of a specific spawn
  const spawnStatus = getSpawnStatus('Spawn1');
  if (spawnStatus) {
    console.log(`Spawn1 Status:`);
    console.log(`  Available: ${spawnStatus.available}`);
    console.log(`  Energy: ${spawnStatus.energyAvailable}/${spawnStatus.energyCapacity}`);
    console.log(`  Currently spawning: ${spawnStatus.currentSpawningCreep || 'None'}`);
    
    // Only spawn if conditions are good
    if (spawnStatus.available && spawnStatus.energyAvailable >= 300) {
      const result = spawnBuilder('Spawn1');
      console.log(`Conditional spawn result: ${result.message}`);
    } else {
      console.log("Conditions not met for spawning");
    }
  }
}

/**
 * Example 4: Smart spawning based on current needs
 */
export function smartSpawningExample() {
  console.log("=== Smart Spawning Example ===");
  
  // Get current creep counts
  const counts = getCurrentCreepCounts();
  console.log("Current creep counts:", counts);
  
  // Check what we need more of
  const roles = [
    CreepRoleEnum.HARVESTER,
    CreepRoleEnum.HAULER,
    CreepRoleEnum.BUILDER,
    CreepRoleEnum.UPGRADER
  ];
  
  for (const role of roles) {
    if (needsMoreCreeps(role)) {
      console.log(`Need more ${role}s`);
      
      // Preview what body would be used
      const preview = getBodyPreview(role);
      console.log(`  Would use ${preview.tier} tier body (${preview.cost} energy)`);
      
      // Spawn if we have enough energy
      const result = spawnCreep(role);
      console.log(`  Spawn result: ${result.message}`);
    } else {
      console.log(`Have enough ${role}s (${counts[role]})`);
    }
  }
}

/**
 * Example 5: Using the ManualSpawner class directly
 */
export function classBasedExample() {
  console.log("=== Class-Based Example ===");
  
  // Create a spawner instance
  const spawner = new ManualSpawner();
  
  // Get all spawn statuses
  const allStatuses = spawner.getAllSpawnStatuses();
  console.log("All spawn statuses:");
  for (const [spawnName, status] of Object.entries(allStatuses)) {
    console.log(`  ${spawnName}: ${status.available ? 'Available' : 'Busy'} (${status.energyAvailable} energy)`);
  }
  
  // Find and use the best spawn
  const bestSpawn = spawner.findBestSpawn(300);
  if (bestSpawn) {
    console.log(`Best spawn for 300 energy: ${bestSpawn.name}`);
    const result = spawner.spawnHarvester(bestSpawn.name);
    console.log(`Spawn result: ${result.message}`);
  } else {
    console.log("No suitable spawn found");
  }
}

/**
 * Example 6: Emergency spawning scenario
 */
export function emergencySpawningExample() {
  console.log("=== Emergency Spawning Example ===");
  
  const counts = getCurrentCreepCounts();
  
  // Emergency: No harvesters!
  if (counts.harvester === 0) {
    console.log("EMERGENCY: No harvesters! Spawning emergency harvester...");
    
    // Try to spawn with minimal energy requirements
    const emergencyBody = [WORK, WORK, MOVE]; // 250 energy
    const result = spawnHarvester(undefined, emergencyBody);
    
    if (result.success) {
      console.log(`Emergency harvester spawned: ${result.creepName}`);
    } else {
      console.log(`Failed to spawn emergency harvester: ${result.message}`);
      
      // Try even more basic body if that failed
      const basicBody = [WORK, MOVE]; // 150 energy
      const basicResult = spawnHarvester(undefined, basicBody);
      console.log(`Basic harvester result: ${basicResult.message}`);
    }
  }
}

/**
 * Example 7: Batch spawning multiple creeps
 */
export function batchSpawningExample() {
  console.log("=== Batch Spawning Example ===");
  
  const spawnQueue = [
    { type: CreepRoleEnum.HARVESTER, count: 2 },
    { type: CreepRoleEnum.HAULER, count: 3 },
    { type: CreepRoleEnum.BUILDER, count: 1 },
    { type: CreepRoleEnum.UPGRADER, count: 1 }
  ];
  
  for (const item of spawnQueue) {
    console.log(`Spawning ${item.count} ${item.type}(s):`);
    
    for (let i = 0; i < item.count; i++) {
      const result = spawnCreep(item.type);
      console.log(`  ${i + 1}. ${result.message}`);
      
      // Stop if we run out of spawns or energy
      if (!result.success && (result.code === ERR_BUSY || result.code === ERR_NOT_ENOUGH_ENERGY)) {
        console.log(`  Stopping batch spawn due to: ${result.message}`);
        break;
      }
    }
  }
}

/**
 * Run all examples (for testing purposes)
 */
export function runAllExamples() {
  console.log("Running all manual spawning examples...\n");
  
  try {
    basicSpawningExample();
    console.log();
    
    advancedSpawningExample();
    console.log();
    
    statusCheckingExample();
    console.log();
    
    smartSpawningExample();
    console.log();
    
    classBasedExample();
    console.log();
    
    emergencySpawningExample();
    console.log();
    
    batchSpawningExample();
    console.log();
    
    console.log("All examples completed!");
  } catch (error) {
    console.log(`Error running examples: ${error}`);
  }
}

// Export for console usage
// Usage: require('examples/manual-spawning-examples').runAllExamples()
export default {
  basicSpawningExample,
  advancedSpawningExample,
  statusCheckingExample,
  smartSpawningExample,
  classBasedExample,
  emergencySpawningExample,
  batchSpawningExample,
  runAllExamples
};
