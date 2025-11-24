
# Game Stategies and notes

Game logistics to find searses from other rooms.

To be able to find other rooms we need to use `Game.map` which that we can figure out other maps/rooms.
it have th emethod `describeExits` which receives a room name. So we can use it to find the other.
which if exist return which are on top, right botton and left.

```js
Game.map.describeExits("W52S5")
```
*returns*
```json
{
    "1": "W8N4",    // TOP
    "3": "W7N3",    // RIGHT
    "5": "W8N2",    // BOTTOM
    "7": "W9N3"     // LEFT
}
```


Which that I'd like to see which rooms are available (no obtained by other playes) next to me and include them into the resource gathering.

Also have a general resource management class, wherr it have store all the resouces location available next to use, also have a limited harvesters per source, and also for the haulers have a list of all drop location and cyclen then throughout all of them, moving to the next one base on it last target
