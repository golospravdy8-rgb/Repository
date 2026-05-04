# === STAGE 1: АНАЛИЗ ТЕКУЩЕЙ РЕАЛИЗАЦИИ КОЛЬЦА ===

**Дата анализа**: 2026-05-02 21:15 UTC
**Статус**: ✅완成 (Анализ завершён)

---

## 📊 ВИЗУАЛЬНЫЕ ПАРАМЕТРЫ (Pixels)

```
HOOP_X (pixels): 110 * scaleX          (адаптируется к canvas)
HOOP_Y (pixels): 307 * scaleY          (адаптируется к canvas)
HOOP_R (pixels): 27 * scaleX           (визуальный радиус кольца)
HOOP_RADIUS (pixels): 22 * scaleX      (используется в gate расчетах)
rimRadiusY_px: Не найдена (используется HOOP_R = 27px)
```

**МАСШТАБИРОВАНИЕ**: Uniform scale = `Math.min(canvas.width / 860, canvas.height / 624)`

**ЦЕНТР КОЛЬЦА (визуальный)**:
- Использует HOOP_X, HOOP_Y из базовых координат (860x624)
- Масштабируется при инициализации canvas

---

## ⚙️ ФИЗИЧЕСКИЕ ПАРАМЕТРЫ (SI метры)

### Текущие константы в `rimPhysicsConfig.ts`:

```typescript
rimRadius: 27,                // pixels только в конфиге
rimWidth: 7,                  // pixels
rimRestitution: 0.25,         // ❌ НЕПРАВИЛЬНО! Должно быть 0.45
rimFriction: 0.82,            // ❌ НЕПРАВИЛЬНО! Должно быть 0.35
```

### В `basketball-physics-engine.ts`:

**Линия 179**: `const EFFECTIVE_RIM_RADIUS = C.RIM_RADIUS_M * 1.08 + RIM_TOLERANCE;`
- RIM_TOLERANCE = 0.015 (15mm)
- EFFECTIVE_RIM_RADIUS = RIM_RADIUS_M * 1.08 + 0.015

**Линия 94 (applyRimImpulse)**:
- `const J_n = -(1 + C.E_RIM) * vn;`
- Использует E_RIM из PhysicsConstantsM

**Линия 105** (Tangential damping):
- `b.vx *= 0.8;` (80% velocity retained)

---

## 🔄 КОЛЛИЗИОННАЯ МОДЕЛЬ

**Тип**: CCD (Continuous Collision Detection) с 8-точечной проверкой

**Точек проверки**: 8 точек вокруг кольца
- Система пропускает верхние и нижние точки (|cos(angle)| < 0.25)
- Проверяет только боковые точки (слева и справа)

**Функция**: `checkAllCollisions()` (линия 170)
- Вызывает `sweepSphereVsSphere()` для каждой точки кольца
- Находит ближайшую коллизию (bestT)
- Применяет impulse через `applyRimImpulse()`

**CCD алгоритм** (`sweepSphereVsSphere`, линия 74):
- Использует квадратное уравнение для пересечения сфер
- Проверяет временной интервал [1e-6, dt]
- Возвращает точку контакта, время и нормали

---

## 📐 ВИЗУАЛЬНО-ФИЗИЧЕСКОЕ ВЫРАВНИВАНИЕ

### ТЕКУЩЕЕ СОСТОЯНИЕ:

```
Визуальное кольцо:
  - Center (px): (110 * scaleX, 307 * scaleY)
  - Radius (px): 27 * scaleX
  - Shape: CIRCLE в 2D (не эллипс!)

Физическое кольцо:
  - Center (м): (110 * scaleX / SCALE, 307 * scaleY / SCALE)
  - Radius (м): RIM_RADIUS_M ← НЕДЕТЕРМИНИРОВАН!
  - Shape: ИДЕАЛЬНЫЙ КРУГ (8-точечная проверка)

Масштаб преобразования:
  - SCALE = Math.min(W, H) / 15.0
  - RIM_RADIUS_M = (HOOP_R / SCALE) в physics engine
  - = (27 * scaleX) / SCALE ≈ 0.27м (при SCALE=100)

✅ ВЫРАВНИВАНИЕ: ДА! Визуальный центр совпадает с физическим
```

---

## 🎯 КЛЮЧЕВЫЕ ОБНАРУЖЕННЫЕ ПРОБЛЕМЫ

### ⚠️ ПРОБЛЕМА #1: Неверные коэффициенты упругости и трения

**Текущие значения** (в rimPhysicsConfig.ts):
```typescript
rimRestitution: 0.25,   // ❌ Очень мягкий отскок
rimFriction: 0.82,      // ❌ Слишком высокое трение
```

**Стефан Репо требует**:
```typescript
E_RIM: 0.45             // ✅ Реалистичный отскок NBA
MU_RIM: 0.35            // ✅ Реалистичное трение NBA
```

**Влияние**: Мяч в игре отскакивает слишком мало, почти "прилипает" к кольцу

---

### ⚠️ ПРОБЛЕМА #2: RIM_RADIUS_M не оптимален

**Текущие значения**:
- HOOP_R = 27px (визуально)
- RIM_RADIUS_M = 27 * scaleX / SCALE ≈ 0.18-0.27м (зависит от canvas)

**ФИБА требует**:
- RIM_DIAMETER = 0.45м
- RIM_RADIUS_M = 0.225м (постоянный, не зависит от scaleX!)

**Влияние**: Размер кольца нестабилен при разных размерах canvas

---

### ⚠️ ПРОБЛЕМА #3: RIM_TUBE_R_M не соответствует физическому размеру

**Текущие значения**:
- RIM_TUBE_R_M = (5 * scaleX) / SCALE ≈ 0.05м

**ФИБА требует**:
- Толщина трубки = 0.018м (18mm)
- RIM_TUBE_R_M = 0.009м (половина толщины)

**Влияние**: Толщина трубки в 2.5x больше, чем у настоящего баскетбольного кольца

---

## 📋 ПАРАМЕТРЫ ПЕРЕД ИНТЕГРАЦИЕЙ

```
┌─────────────────────────────────────────────────────────────┐
│ ПАРАМЕТР              │ ТЕКУЩЕЕ       │ ПОСЛЕ (Stefan)      │
├─────────────────────────────────────────────────────────────┤
│ RIM_RADIUS_M          │ 0.18-0.27м    │ 0.225м (ФИБА)       │
│ RIM_TUBE_R_M          │ ~0.05м        │ 0.009м (ФИБА)       │
│ RIM_THICKNESS_M       │ ~0.08m        │ 0.018м (ФИБА)       │
│ E_RIM (restitution)   │ 0.25 ❌       │ 0.45 ✅             │
│ MU_RIM (friction)     │ 0.82 ❌       │ 0.35 ✅             │
│ BALL_RADIUS_M         │ 0.12м         │ 0.12075м (ФИБА)     │
│ GRAVITY               │ 9.81 м/с²     │ 9.81 м/с² ✓         │
│ FIXED_DT              │ 1/120         │ 1/120 ✓             │
│ HOOP_X_M              │ calc'd        │ calc'd (no change)  │
│ HOOP_Y_M              │ calc'd        │ calc'd (no change)  │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔒 ЗАПРЕЩЁННЫЕ ЗОНЫ (НЕ МЕНЯТЬ)

```
❌ Ball launch system (3-click mechanic) — линии 1900-2000+
❌ integratePhysics() — линия 61-72
❌ sweepSphereVsSphere() — линия 74-90 (CCD алгоритм)
❌ checkAllCollisions() — архитектура (только константы!)
❌ Gravity = 9.81 m/s²
❌ FIXED_DT = 1/120
❌ Rendering system (Canvas, scaling)
❌ Magnus effect (MAGNUS_COEFFICIENT = 0.06)
❌ Firebase & Multiplayer
```

---

## ✅ РАЗРЕШЁННЫЕ ЗОНЫ (МОЖНО МЕНЯТЬ)

```
✅ rimPhysicsConfig.ts — все параметры
✅ Rim constants в physics engine:
   - C.RIM_RADIUS_M
   - C.RIM_TUBE_R_M
   - C.E_RIM
   - C.MU_RIM
   - EFFECTIVE_RIM_RADIUS вычисление
✅ Добавить новый файл metricsConversion.ts
✅ Добавить логирование в RucheekGameCanvas.tsx
```

---

## 📝 ИТОГОВЫЙ ВЕРДИКТ STAGE 1

✅ **Анализ завершён успешно**

**Текущее состояние**: Работает, но физика упругости кольца неправильна

**Путь к исправлению**: 
1. Обновить коэффициенты: E_RIM (0.25→0.45), MU_RIM (0.82→0.35)
2. Стандартизировать размеры кольца по ФИБА
3. Создать файл конвертации для трекинга констант
4. Добавить валидацию при инициализации

**Риски**: НИЗКИЕ
- Все изменения в параметрах только, архитектура не менялась
- Gravity и FIXED_DT остаются SI-pure
- Коллизионный алгоритм без изменений

**Next Step**: STAGE 2 — Создание файла metricsConversion.ts
