# Roguelite Prototype

A solo, top-down action roguelite in which a Player guides a Hero through a Run of combat Rooms. Co-op is a future goal, not part of the prototype.

## Language

### People and characters

**Player**:
The human playing the game: the source of inputs and the owner of everything that persists between Runs.
_Avoid_: User, gamer

**Hero**:
The character a Player controls inside a Room.
_Avoid_: Player (for the character), avatar, character

**Enemy**:
A hostile character in a Room that the Hero must defeat.
_Avoid_: Monster, mob, creep

### Run structure

**Run**:
One attempt at clearing an ordered sequence of Rooms, ending in the Hero's death or in victory.
_Avoid_: Attempt, game, session

**Room**:
A closed combat space within a Run; defeating every Enemy in it opens the way to the next Room.
_Avoid_: Level, stage, floor, map

**Room Template**:
A handcrafted layout from which a Room is created.
_Avoid_: Prefab, level design

**Run Seed**:
The value from which all of a Run's random choices are drawn.
_Avoid_: Random seed, RNG state

### Combat

**Attack**:
A melee strike made of three successive phases: Windup, Active Phase and Recovery.
_Avoid_: Hit, swing, strike

**Windup**:
The opening phase of an Attack, visible to the opponent but not yet harmful.
_Avoid_: Telegraph, startup, anticipation

**Active Phase**:
The phase of an Attack during which it deals damage.
_Avoid_: Hit frames, damage window

**Recovery**:
The closing phase of an Attack, harmless, before the attacker can act again.
_Avoid_: Cooldown, endlag

**Dash**:
A short burst of movement that cancels the Hero's current action and makes the Hero invulnerable while it lasts.
_Avoid_: Dodge, roll, blink

### Progression

**Upgrade**:
A stat improvement chosen after clearing a Room, lost when the Run ends.
_Avoid_: Boon, bonus, perk, power-up

**Talent**:
A permanent improvement bought with Gold between Runs.
_Avoid_: Mastery, meta-upgrade, unlock

**Gold**:
The currency earned by defeating Enemies during a Run and spent on Talents.
_Avoid_: Coins, money, shards

**Profile**:
Everything a Player keeps between Runs: Gold and Talents.
_Avoid_: Save, account, meta state
