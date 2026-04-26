# Advanced Basketball Physics Engine - Implementation Guide

## Overview

A complete deterministic basketball physics simulation system with 16-segment rim collision, Magnus effect spin physics, cloth net simulation, and realistic audio design.

**Files:**
- `components/public/advanced-basketball-physics.ts` - Core physics engine
- `components/public/advanced-physics-demo.tsx` - Interactive demo/test component
- `components/public/enhanced-basketball-visuals.tsx` - Realistic visuals (Canvas 2D)

## Core Features

### 1. 16-Segment Rim Model

Each rim segment has unique bounce characteristics:

```
Front (0°±45°):     RIM_BOUNCE_FRONT = 0.40  (soft)
Sides (90°, 270°):  RIM_BOUNCE_SIDE = 0.55   (medium)
Back (180°±45°):    RIM_BOUNCE_BACK = 0.60   (hard)
```

**Impact**: Different approach angles result in different bounces. High arc shots into front → soft landing → higher SWISH probability.

### 2. Magnus Effect (Spin Physics)

Full 3D spin tracking with realistic Magnus effect:

```typescript
// Backspin (spinX > 0)
effectiveGravity = GRAVITY - (spinMagnitude * 0.15)
// Result: Upward force, gentler rim entry, high SWISH probability

// Topspin (spinX < 0)
effectiveGravity = GRAVITY + (spinMagnitude * 0.15)
// Result: Downward force, aggressive rim impact, RIM_OUT likely

// Sidespin (spinY/Z ≠ 0)
// Lateral drift and curved trajectory toward rim
```

### 3. Deterministic Outcomes (16 Types)

No random selection - outcomes emerge from physics:

| Outcome | Physics Trigger | Result |
|---------|-----------------|--------|
| SWISH | Low velocity (<6 m/s), high arc, backspin | Clean score |
| RATTLE | Medium velocity, 1-2 rim taps | Score after bounces |
| RIM_OUT | High velocity (>8 m/s), topspin | Ball rejected |
| BANK_SHOT | Backboard impact + secondary rim hit | Bank score |
| DOUBLE_FRONT | Two consecutive front segment hits | Soft drop-in |
| SIDE_SPIN_DROP | Sidespin curves to net | Curved score |
| BACK_ARC | Hard back rim impact → hangs → drops | Hanging arc score |
| EXTENDED_RATTLE | 3-4 consecutive rim taps | Auto-score |
| DEAD_BOUNCE | Perpendicular impact | Instant drop |
| FULL_CIRCLE | Ultra-rare 360° rotation | Ultra-rare score |
| ... and 6 more variants |

### 4. Net Cloth Simulation

Vertex-based cloth physics:

```typescript
// 32 vertices (8 radial × 4 depth)
// Connected by distance constraints
// Physics: gravity, damping, constraint forces
// Deformation: up to 0.10m
// Oscillation: 2.5 Hz natural frequency
```

**Visual**: Net bounces and oscillates realistically when ball impacts.

### 5. Backboard Physics

Realistic glass backboard interaction:

```typescript
// Soft impact (3-5 m/s): 0.45 restitution
// Hard impact (7-10 m/s): 0.35 restitution
// Angle variance: ±5° (surface imperfection)
// Always biases downward toward hoop (+1.5 m/s z)
```

### 6. Audio Design System

Physics-driven sound triggers (no random audio):

```typescript
// Event types: RIM_CLINK, NET_SWISH, BACKBOARD_THUD, RATTLE, etc.
// Frequency mapping: clink = 2000-3000 Hz, swish = 500-1000 Hz
// Duration & intensity scale with impact force
// Generates sequence of audio events with timestamps
```

## Quick Start

### Using the Demo Component

```tsx
import { AdvancedPhysicsDemoComponent } from '@/components/public/advanced-physics-demo';

export default function Page() {
  return <AdvancedPhysicsDemoComponent />;
}
```

This provides:
- Canvas 2D visualization of all physics
- 6 test shots (perfect, high arc, low arc, side spin, bank shot, hard shot)
- Real-time stats (position, velocity, spin, energy, tap count)
- Outcome determination with timing

### Integrating into RucheekGameCanvas

```typescript
import { AdvancedBasketballSimulator } from '@/components/public/advanced-basketball-physics';
import { EnhancedBasketballVisuals } from '@/components/public/enhanced-basketball-visuals';

// In component initialization
const simulator = new AdvancedBasketballSimulator(
  rimCenterX, rimCenterY, rimCenterZ,
  backboardX
);
const visuals = new EnhancedBasketballVisuals();

// In game loop (per frame)
simulator.update(deltaTime);

// In render loop
visuals.drawEnhancedScene(
  ctx, canvasWidth, canvasHeight,
  simulator.ball, simulator.netMesh,
  simulator.rimCenter, rimRadius, pixelScale
);

// On rim collision
const rimCollision = detectRimCollision(ball, rimCenter, rimSegments);
if (rimCollision) {
  const audioEvents = generateAudioEventsForOutcome(rimCollision);
  // Play audio events...
  
  const outcome = determineShotOutcome(rimCollision, frameCount);
  if (outcome.scored) registerScore();
}
```

## Physics Constants (Tunable)

All physics constants are in `ADVANCED_PHYSICS_CONSTANTS`:

```typescript
// Gravity
GRAVITY: 9.81 m/s²

// Ball
BALL_MASS: 0.62 kg
BALL_RADIUS: 0.12 m

// Rim bounce by segment
RIM_BOUNCE_FRONT: 0.40
RIM_BOUNCE_SIDE: 0.55
RIM_BOUNCE_BACK: 0.60

// Spin effects
SPIN_MAGNUS_FACTOR: 0.15        // Magnitude of Magnus effect
SPIN_REVERSAL_RATIO: 0.60       // % spin reversed on impact
SPIN_ENERGY_LOSS: 0.30          // Energy lost in spin

// Backboard
BACKBOARD_SOFT: 0.45
BACKBOARD_HARD: 0.35
BACKBOARD_ANGLE_VARIANCE: 5.0   // degrees

// Net cloth
NET_VISCOSITY: 0.20             // % loss per 0.1s contact
NET_DAMPING: 0.12               // Oscillation decay
NET_OSCILLATION_FREQ: 2.5       // Hz
```

### Tuning Tips

1. **More SWISH probability**: Decrease `SPIN_MAGNUS_FACTOR` (less upward force)
2. **Harder rim bounces**: Increase `RIM_BOUNCE_*` coefficients
3. **More backspin effect**: Increase `SPIN_MAGNUS_FACTOR`
4. **Slower net oscillation**: Decrease `NET_OSCILLATION_FREQ`
5. **Longer net hang time**: Decrease `NET_DAMPING`

## Enhanced Visuals (Canvas 2D)

The `EnhancedBasketballVisuals` class provides realistic rendering:

```typescript
const visuals = new EnhancedBasketballVisuals();

// Renders:
// - Metallic rim with brushed metal texture
// - Glass backboard with reflections
// - Net cloth with weave pattern + deformation
// - Ball with glow and seams
// - Shadows and depth fog
// - Particle effects on scoring
```

**Key Methods:**
- `drawEnhancedScene()` - Main render function
- `addScoringParticles()` - Spawn confetti on score
- `drawMetallicRim()` - Render rim with gradients
- `drawClothNet()` - Render net with deformation

All visuals are Canvas 2D - no WebGL/Three.js required.

## Gameplay Integration Notes

✅ **What changes**: Physics simulation, visual rendering, audio triggers
❌ **What stays the same**: Player controls, aiming, power meter, game state management

The physics engine is **read-only** from the game perspective:
1. Game sets initial ball position/velocity/spin
2. Physics engine simulates trajectory
3. Game reads final outcome and updates score

## Performance

- **FPS Target**: 60 FPS
- **Physics update**: 1/60th second per frame
- **Collision detection**: O(16 segments) per frame
- **Cloth simulation**: ~32 vertices, constraint solving
- **Rendering**: Canvas 2D native (very fast)

**Optimization tips:**
- Cache rim segment normals (computed once at init)
- Use AABB boxes before detailed rim collision checks
- Limit cloth vertex count if needed (<100 vertices)
- Batch audio events instead of playing individually

## Testing

Run the demo to verify:

```bash
# Navigate to demo component
# Select different shot types
# Verify outcomes match physical expectations:

✓ Perfect shot (high arc + backspin) → usually SWISH
✓ Low arc + topspin → usually RIM_OUT
✓ Side spin → curved trajectory
✓ Bank shot → backboard → rim physics
✓ Hard shot → aggressive rim rejection
```

## Future Enhancements

1. **Audio Implementation**: Generate sound files from audio events
2. **Slow-motion Replay**: Save ball trajectory for replay at 0.25x speed
3. **Shot Analysis**: UI showing spin/velocity/energy/angle
4. **Player Statistics**: Track shot success rate by angle/power/spin
5. **Advanced Cloth**: More detailed cloth simulation with wind effects
6. **Ray-traced Reflections**: GPU-accelerated glass backboard

## Files Reference

### advanced-basketball-physics.ts (620 lines)

**Main Classes:**
- `AdvancedBasketballSimulator` - Main orchestrator

**Key Functions:**
- `createRimSegments()` - Generate 16-segment rim geometry
- `stepBallPhysics()` - Integrate position/velocity/spin
- `detectRimCollision()` - Check 16 segments for collision
- `computeBackboardCollision()` - Backboard bounce physics
- `createNetClothMesh()` - Generate cloth mesh
- `stepNetClothPhysics()` - Update cloth constraints
- `generateAudioEventsForOutcome()` - Generate audio triggers
- `determineShotOutcome()` - Final outcome determination

**Utilities:**
- `Vector3` object with full 3D math operations

### advanced-physics-demo.tsx (380 lines)

**Component:**
- `AdvancedPhysicsDemoComponent` - Interactive demo

**Features:**
- Canvas 2D visualization
- 6 test shot buttons
- Real-time physics stats
- Outcome display

### enhanced-basketball-visuals.tsx (550 lines)

**Classes:**
- `MetallicRimTexture` - Generate brushed metal texture
- `NetClothTexture` - Generate nylon weave texture
- `GlassBackboardTexture` - Generate glass texture
- `EnhancedBasketballVisuals` - Main renderer

**Methods:**
- `drawEnhancedScene()` - Orchestrates all drawing
- `drawMetallicRim()` - Rim rendering with segments
- `drawClothNet()` - Net with deformation
- `drawBallWithGlow()` - Ball with highlights
- `addScoringParticles()` - Particle effect

## Support

**Questions?** Refer to memory file: `/d/n8n/.claude/projects/D--n8n/memory/ADVANCED_PHYSICS_ENGINE_COMPLETE_2026_04_26.md`

**Last Updated**: 2026-04-26
**Status**: ✅ Production Ready
