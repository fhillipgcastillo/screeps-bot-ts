export type LevelDefinition = {
  harvesters: {
    min: number,
    max: number
  },
  builders: {
    min: number,
    max: number
  },
  upgraders: {
    min: number,
    max: number
  },
  rangers: {
    min: number,
    max: number
  },
  defenders: {
    min: number,
    max: number
  },
  haulers: {
    min: number,
    max: number
  }
};
export type LevelDefinitions = {
  [name: string]: LevelDefinition
};

export const levelDefinitions: LevelDefinitions = {
  "1": {
    harvesters: {
      min: 2,
      max: 3
    },
    haulers: {
      min: 4,
      max: 6,
    },
    builders: {
      min: 3,
      max: 3
    },
    upgraders: {
      min: 1,
      max: 1
    },
    rangers: {
      min: 0,
      max: 2,
    },
    defenders: {
      min: 0,
      max: 2,
    },
  },
  "2": {
    harvesters: {
      min: 4,
      max: 7
    },
    builders: {
      min: 2,
      max: 8
    },
    upgraders: {
      min: 2,
      max: 4
    },
    rangers: {
      min: 2,
      max: 5,
    },
    defenders: {
      min: 2,
      max: 5,
    },
    haulers: {
      min: 8,
      max: 14,
    }
  },
  "3": {
    harvesters: {
      min: 8,
      max: 12
    },
    builders: {
      min: 8,
      max: 12
    },
    upgraders: {
      min: 3,
      max: 8
    },
    rangers: {
      min: 4,
      max: 10,
    },
    defenders: {
      min: 4,
      max: 10,
    },
    haulers: {
      min: 10,
      max: 15,
    }
  },

}
