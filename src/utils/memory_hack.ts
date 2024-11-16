// /* eslint-disable */
// // https://github.com/screepers/screeps-snippets/blob/master/src/misc/JavaScript/Memory%20Cache.js

// let memhackMemory:Memory;

// export const memhack = {
//   load() {
//     const before = Game.cpu.getUsed()
//     memhackMemory = Memory;
//     console.log("[memhack] memory reset. deserialization: " + Math.ceil(Game.cpu.getUsed() - before) + "cpu");
//   },

//   beforeTick() {
//     if (memhackMemory) {
//       delete global.Memory;
//       global.Memory = memhackMemory;
//     }
//   },

//   afterTick() {
//     if (memhackMemory) {
//       RawMemory._parsed = Memory
//     }
//   },
// }
