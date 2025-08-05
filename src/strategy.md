## Initial Spawn strategy
### Step 0 - Prep resource finding logic
- create a single place to store the list of resource to be mined/harvested
- the hauler should go through each of them, there should be a single place to get the resouces, and it will cyrcle between the list, so each one will go through each one
    - similar logic will apply to the haulers, but in this case it will search for droped energy (the same time it's looking for rigt now) but it will only change the way to get the new target

### step 1
* Firs thing is to spawn a single harvester, the best for the current amount of energy
* then as fast as possible spawn 1 single hauler, it will have good speed
* Apply logic from step 0 to both harvester and hauler


### step 2
Once we have enough energy/full energy we'll start the second strategy which is to spawn
