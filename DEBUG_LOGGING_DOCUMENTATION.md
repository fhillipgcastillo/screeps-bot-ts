# Debug Logging System Documentation

## Overview

The debug logging system provides centralized console output management for the Screeps bot, completely separate from the UI Visual system. It allows you to control whether debug messages appear in the terminal console.

## Features

- **Debug Flag Control**: Toggle debug output on/off from the game console
- **Centralized Logging**: All console output goes through a single logging system
- **Multiple Log Levels**: debug, info, warn, error, log, and force
- **Automatic Formatting**: Includes timestamps, prefixes, and log levels
- **Error Handling**: Errors are always shown regardless of debug mode

## Console Commands

### Basic Debug Control

```javascript
// Enable debug logging - shows all debug messages in terminal
enableDebug()

// Disable debug logging - hides debug messages from terminal  
disableDebug()

// Toggle debug logging on/off
toggleDebug()

// Check if debug logging is currently enabled
isDebugEnabled()  // returns true/false
```

### GameManager Access

```javascript
// Access through the global game manager instance
gm.enableDebug()
gm.disableDebug() 
gm.toggleDebug()
gm.isDebugEnabled()
```

## Log Levels

### Debug Messages (only shown when debug mode is enabled)
- `debugLog.debug(message, ...args)` - Debug information
- `debugLog.info(message, ...args)` - Informational messages  
- `debugLog.warn(message, ...args)` - Warning messages
- `debugLog.log(message, ...args)` - General log messages

### Always Shown Messages
- `debugLog.error(message, ...args)` - Error messages (always displayed)
- `debugLog.force(message, ...args)` - Force display regardless of debug mode

## Usage Examples

### In Game Console
```javascript
// Enable debug mode to see all logging output
enableDebug()

// Your bot will now show debug messages like:
// [12345][DEBUG] Room Energy 300/300
// [12345][INFO] Creep spawned successfully
// [12345][WARN] No construction sites found

// Disable debug mode to hide debug output
disableDebug()

// Only errors and forced messages will show
```

### In Code
```javascript
import { debugLog } from "./utils/Logger";

// Debug information (only shown when debug enabled)
debugLog.debug("Processing creep", creep.name);
debugLog.info("Energy level", creep.store.energy);
debugLog.warn("Low energy warning", creep.name);

// Always shown regardless of debug mode
debugLog.error("Critical error occurred", error);
debugLog.force("Important system message");
```

## Default Behavior

- **Debug mode starts disabled** (debug = false)
- **Error messages are always shown** regardless of debug mode
- **Pause/resume messages use force** to always display
- **UI functions still use console.log directly** for user output

## Integration

The logging system is integrated throughout the codebase:

- **GameManager**: Tick logging, error handling, memory cleanup
- **SpawnManager**: Debug spawn information, defensive spawning alerts
- **Role Files**: Error handling, movement issues, target problems
- **UI System**: Error messages and status updates
- **ErrorMapper**: Source map error display

## Message Format

All log messages include:
- **Timestamp**: `[Game.time]` 
- **Log Level**: `[DEBUG]`, `[INFO]`, `[WARN]`, `[ERROR]`, `[FORCE]`
- **Message**: Your custom message
- **Arguments**: Additional data (objects are JSON stringified)

Example output:
```
[12345][DEBUG] Room Energy 300/300
[12346][WARN] Enemies in the room - spawning defensive units
[12347][ERROR] Invalid role: undefined for creep Harvester1
```

## Benefits

1. **Clean Console**: Only see relevant information when you need it
2. **Easy Debugging**: Toggle debug mode on when investigating issues
3. **Performance**: Reduced console spam in production
4. **Consistency**: Standardized logging format across all modules
5. **Flexibility**: Different log levels for different types of information

## Migration Notes

All existing `console.log` calls have been replaced with appropriate debug logging:
- Debug information → `debugLog.debug()`
- Warnings → `debugLog.warn()`  
- Errors → `debugLog.error()`
- Important status → `debugLog.force()`

The UI display functions (`showCreeps`, `showRooms`, etc.) continue to use `console.log` directly since they are meant to display output to the user.
