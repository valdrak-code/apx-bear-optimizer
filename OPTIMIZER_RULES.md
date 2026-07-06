# APX Optimization Engine Rules

Version: 2.3.1 Dev

## Purpose
APX Tools exists to maximize Bear Hunt damage, minimize wasted troops, and explain why each recommendation was selected.

## Core Formation Integrity Rules

1. **Infantry Minimum**
   - Joiner and Rally Leader Formations should never intentionally drop Infantry to 0.
   - Minimum target: 1 Infantry per Formation.

2. **Cavalry Floor**
   - Cavalry should target at least 10% of a Formation when the player has enough Cavalry.
   - If the player does not have enough Cavalry, the optimizer may use all available Cavalry and continue building the best viable Formation.

3. **Archer Maximization**
   - After Infantry and Cavalry integrity rules are satisfied, remaining capacity should favor Archers.
   - The optimizer should not chase 100% Archer Formations.

4. **Joiner Viability Protection**
   - Advanced Rally Leader improvements may not weaken recommended Joiner Formations below 70% Archers.

5. **Advanced Rally Leader Progression**
   - Standard target: 10% Infantry / 10% Cavalry / 80% Archers.
   - Advanced milestone: 1 Infantry / 10% Cavalry / 90% Archers.
   - The optimizer should detect this automatically rather than requiring a manual user setting.

6. **Shared Archer Growth**
   - Once Joiners are roughly 80%+ Archers, extra Archer capacity should be allowed to improve both Joiner and Rally Leader Formations rather than only one side.

7. **Coach Discipline**
   - APX Coach should not recommend reducing marches solely to chase 100% Archers.
   - Practical coaching ceiling: 90% Archer Joiner Formation.

8. **Rally Leader Priority Investigation**
   - Rally Leader Priority must be evaluated to determine whether it provides meaningful value.
   - If it cannot reliably protect both Joiners and Rally Leader, it should be revised, renamed, or removed.

## Future Notes
These rules should be updated any time a new gameplay-tested optimizer rule is added.


## v2.3.4 Rally Leader Progression

- Rally Leader Formation displays both exact troop counts and percentage share.
- Once joiners reach 80%+ Archers, the optimizer may begin sharing excess Archers with the Rally Leader.
- Advanced Leader progression still requires joiners to remain at or above 70% Archers.
- When joiners are already elite, avoid overfeeding joiner Archer ratio while the Leader march remains below the advanced 90% Archer milestone.


## v2.3.4 Advanced Joiner Cap Preservation
When Advanced Rally Leader mode is active, joiner formations should still push toward the Alliance Rally Cap Limit when they remain at or above 70% Archers. The optimizer should not choose smaller joiner formations solely to preserve an 80% Archer ratio if Cavalry can safely fill the remaining capacity.
