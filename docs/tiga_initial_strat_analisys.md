# Tiga Initial Strategy Analysis
This is a strategy analysis from an youtube video from Tiga one of hte top players in Screeps: World.
Video Source [RCL5 at 15,855 ticks...](https://www.youtube.com/watch?v=JBAmxd6hq_o&t=320s)


## Initial Spawn
first he place his spawn (auto) and analyse the active energy sources of the room.
spawns a stationary harvester then a hauler, then double it, priotizing the harvester/miner (as he calls it).
then it after 2 haulers and 2 miners, he spawns 3 haulers wit a total of 2 miners|harvesters and 3 haulers.

### haulers strategy
they get one source (droped energy) as main target, it goes towards it be keep distance until there's enough distance and wait.
he usases queue to gather the energy, where each hauler get closes to the closes target droped source, waits it turns, it waits until enough energy to be carry (50 in tis case) to then have its turn, the next one will wait until next 50 to move it.

he keeps track of the drop energy from each source where he assigns 2 harvester per energy source and 4 haulers, they asign team to a source for a max of 8 per energy source, 2 harvs and 4 haulers.

haulers turns are in hold until that sum of drop energy is enough for them, then it turn green light for that hauler. for example I have 2 haulers with 50 carry capacity, I have 2 harvs and 2 droped sources of energy (by each harvs), those hauler assigned to those source (like a squad/team of workers) always circle around those drop energy sources, waiting their queue turns, and picking from each source until they are full and then they transfer and start the loop again.

first haulers have only 1 carry (50 carrying capacity) and probably 1 move.


my idea
in the state setter of each creep we can create a main logger that when the screep changes states it tell us, that way a hauler to start moving saying mvoing toward x target, when it stops it change sit state (as spected to this strategy) for something like waiting fro enough energy
