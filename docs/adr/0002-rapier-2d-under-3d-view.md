# Rapier 2D physics under a 3D view

Gameplay is strictly planar (no jumping, falling or meaningful height), so the simulation uses Rapier 2D and the view maps simulation `(x, y)` onto the 3D ground plane `(x, 0, z)`. This keeps bodies, shape queries and state snapshots simpler than Rapier 3D with a locked vertical axis. The cost is accepted: adding real verticality later means migrating the physics to 3D.
