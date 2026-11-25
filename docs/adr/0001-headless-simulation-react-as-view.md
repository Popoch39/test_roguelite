# Headless simulation, React Three Fiber as a view only

Co-op with an authoritative server is a future goal, so the game simulation must be able to run without a browser. All game rules and physics live in `src/sim`, a pure TypeScript module that imports nothing from React, three.js or the DOM: it advances in fixed 60 Hz ticks from per-tick Player commands, draws all randomness from the Run Seed, and keeps its state serializable. React Three Fiber only renders that state, interpolated between ticks; the Profile and the between-Run screens stay outside the simulation.

## Considered Options

- `@react-three/rapier` with game logic in components and `useFrame`: the fastest to write, rejected because it ties the simulation to React's render tree, so a server could not reuse it.
- Bit-exact deterministic simulation (lockstep or rollback): rejected as too constraining. Server-authoritative co-op only needs a headless simulation fed with data-only inputs.

## Consequences

- No `Math.random`, wall-clock time or DOM access in `src/sim`; a lint rule enforces the import boundary.
- The Run's flow (combat, Upgrade choice, end of Run) lives in the simulation and choices arrive as commands, so a server can later own a whole Run.
