# Screeps Typescript Starter

Screeps Typescript Starter is a starting point for a Screeps AI written in Typescript. It provides everything you need to start writing your AI whilst leaving `main.ts` as empty as possible.

## Basic Usage

You will need:

- [Node.JS](https://nodejs.org/en/download) (10.x || 12.x)
- A Package Manager ([Yarn](https://yarnpkg.com/en/docs/getting-started) or [npm](https://docs.npmjs.com/getting-started/installing-node))
- Rollup CLI (Optional, install via `npm install -g rollup`)

Download the latest source [here](https://github.com/screepers/screeps-typescript-starter/archive/master.zip) and extract it to a folder.

Open the folder in your terminal and run your package manager to install the required packages and TypeScript declaration files:

```bash
# npm
npm install

# yarn
yarn
```

Fire up your preferred editor with typescript installed and you are good to go!

### Game Features

- **Game Statistics UI** - A comprehensive UI system for monitoring your colony's status. See the [documentation](docs/ui/game-stats-ui.md) for setup and usage.

### Rollup and code upload

Screeps Typescript Starter uses rollup to compile your typescript and upload it to a screeps server.

Move or copy `screeps.sample.json` to `screeps.json` and edit it, changing the credentials and optionally adding or removing some of the destinations.

Running `rollup -c` will compile your code and do a "dry run", preparing the code for upload but not actually pushing it. Running `rollup -c --environment DEST:main` will compile your code, and then upload it to a screeps server using the `main` config from `screeps.json`.

You can use `-cw` instead of `-c` to automatically re-run when your source code changes - for example, `rollup -cw --environment DEST:main` will automatically upload your code to the `main` configuration every time your code is changed.

Finally, there are also NPM scripts that serve as aliases for these commands in `package.json` for IDE integration. Running `npm run push-main` is equivalent to `rollup -c --environment DEST:main`, and `npm run watch-sim` is equivalent to `rollup -cw --dest sim`.

#### Important! To upload code to a private server, you must have [screepsmod-auth](https://github.com/ScreepsMods/screepsmod-auth) installed and configured!

## Typings

The type definitions for Screeps come from [typed-screeps](https://github.com/screepers/typed-screeps). If you find a problem or have a suggestion, please open an issue there.

## TO DO:
* [ ] Re-organize, clean, refactor, and improve the code
  * [x] Add global exports
    * [x] Re-organize to allow terminal access for activating features, calling spawns, etc.
  * [x] Create a class for main logic handling
* [ ] Apply patterns like SOLID, Repository, etc.
* [ ] Add ability to consider nearby rooms with resources for harvesting and energy pickup
* [ ] Implement task-based system for creeps for better control and visibility of pending actions
  * [ ] Display pending spawn tasks, e.g., which spawn is next
* [ ] [**POSPONED**] Install auth mod on the server for easier private code transfer
  * [ ] Add password
  * [ ] Configure credentials
  * [ ] Test deploy to private/local server
  * [ ] Document the correct process
## Documentation

We've also spent some time reworking the documentation from the ground-up, which is now generated through [Gitbooks](https://www.gitbook.com/). Includes all the essentials to get you up and running with Screeps AI development in TypeScript, as well as various other tips and tricks to further improve your development workflow.

Maintaining the docs will also become a more community-focused effort, which means you too, can take part in improving the docs for this starter kit.

To visit the docs, [click here](https://screepers.gitbook.io/screeps-typescript-starter/).

### Local Documentation

For detailed information about this project's implementation, strategies, and systems, see the [Documentation Index](docs/README.md). It includes guides for:

- **Strategy & Planning**: Roadmap, game strategies, and implementation plans
- **Code Documentation**: Creep types, logging system, and spawning API
- **Technical Guides**: Setup, deployment, and development workflows

## Contributing

Issues, Pull Requests, and contribution to the docs are welcome! See our [Contributing Guidelines](CONTRIBUTING.md) for more details.
