This directory contains the necessary to run the `screeps-launcher` server. this help us to run the server, with mods included for the server without inconvinients. avoiding issues of tools versions and more.

Github repo: [AlinaNova21/screeps-launcher](https://github.com/AlinaNova21/screeps-launcher).

I used the sample config file and their docker compose file, which includes the and environment with the launcher itself, mongo db and redis.

## Configuration
Before running the docker we need to create the config file based on `config.sample.yml`.
```
cp config.sample.yml config.yml
```

Try to change anything desire from the `config.yml` file and avoid changing the `*.sample.yml`.

try getting the STEAM api key to modify the config file.

After you all set and happy about the configurations run the docker composer

## running
```bash
docker compose up
```

