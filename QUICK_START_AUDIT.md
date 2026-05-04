# ⚡ QUICK START AUDIT (30 seconds)

## What is this?

Complete diagnostic of rim physics system. No code changes, only measurement and analysis.

## How to start?

### Option 1: Copy Full Prompt
1. Open `RIM_PHYSICS_FULL_AUDIT_PROMPT.md`
2. Select all (Ctrl+A)
3. Copy (Ctrl+C)
4. Go to Claude Code Chat
5. Paste (Ctrl+V)
6. Press Enter
7. Wait 15-20 minutes for complete analysis

### Option 2: Quick Questions
Ask Claude Code directly:
```
Run full rim physics audit:
1. Find HOOP_R, SCALE, RIM_RADIUS_M values
2. Check for double inflation (any × 1.08 or × 1.1)
3. Check for pixel contamination in collision detection
4. Check for redundant collision functions
5. Create summary table with all findings
```

## What happens?

Claude Code will:
- Read all physics code files
- Measure visual rim (px) and physics rim (m)
- Check for hidden double physics
- Check for assist/arcade logic
- Create detailed report with problems found
- NOT change any code

## What will the report show?

✅ Visual rim size  
✅ Physics rim size  
✅ Are they aligned?  
✅ Is there double inflation?  
✅ Is there pixel contamination?  
✅ Are there redundant collision detections?  
✅ Is there arcade assist?  
✅ All problems with exact line numbers  
✅ Recommendations for fixes  

## Timeline

- **Duration**: 15-20 minutes
- **Output**: Full diagnostic report (2000+ words)
- **Safe**: No code changes, analysis only
- **Reversible**: Can undo any changes with Ctrl+Z

## Next Steps

After audit completes:
1. Review the report
2. Identify main problems
3. Ask Claude Code for minimal fixes
4. Apply fixes one by one
5. Test each fix

## Files This Audits

- `components/public/RucheekGameCanvas.tsx` — visual rim, physics constants
- `components/public/basketball-physics-engine.ts` — collision detection, rim physics
- `lib/game/rimPhysicsConfig.ts` — rim parameters
- Any other physics-related files

## Expected Problems

Audit may find:
- ✅ Visual-physics mismatch (pixels vs meters)
- ✅ Double inflation factors
- ✅ Redundant collision detection
- ✅ Pixel values used in physics calculations
- ✅ Assist/arcade logic still in code
- ✅ Gate vs trajectory scoring conflicts

## Quick Reference

| Value | Expected | Found? |
|-------|----------|--------|
| RIM_RADIUS_M | 0.225m | __ |
| RIM_TUBE_R_M | 0.009m | __ |
| EFFECTIVE_RIM_RADIUS | 0.235m | __ |
| HOOP_R | 27px | __ |
| SCALE | varies | __ |
| Double inflation | NO | __ |
| Pixel contamination | NO | __ |
| Double physics | NO | __ |

## How to Check Results

After audit finishes:
1. Read the "SUMMARY TABLE" section
2. Look for ❌ marks (problems)
3. Check "PROBLEMS FOUND" list
4. Review "ROOT CAUSE ANALYSIS"
5. Follow "RECOMMENDATIONS"

---

**Ready?** → Copy RIM_PHYSICS_FULL_AUDIT_PROMPT.md and paste into Claude Code Chat
