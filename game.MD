# chaosBunny — Development Guide

chaosBunny is a ZX Spectrum-inspired browser game built with `zx-kit`.

## Core fantasy

A cute rabbit is trapped deep underground and must climb from a dark cave system back to the moonlit surface. The game should feel dark, atmospheric, and slightly scary, but never cruel. Enemies are cave creatures reacting to light, not things to kill.

## Technical priorities

Use `zx-kit` idiomatically:

* Use `TileMap` for the world.
* Use bitmap sprites for the rabbit, projectiles, pickups, and enemies.
* Use pixel-perfect collision as a design pillar.
* Use AABB only as a broad-phase optimization.
* Use `masksOverlap()` for final entity-vs-entity hit decisions.
* Use `pixelSolidCount()` for pixel-aware tile contact where full-tile collision is not accurate enough.
* Do not trigger pickups, enemy damage, projectile hits, or player damage from bounding boxes alone.

## Collision rule

A collision is real only when at least one opaque pixel overlaps another opaque pixel.

Examples:

* The rabbit collects a carrot only if the rabbit mask overlaps the carrot mask.
* A spider hurts the rabbit only if the spider mask overlaps the rabbit mask.
* A carrot projectile affects a spider only if the projectile mask overlaps the spider mask.
* A projectile must not hit early because of tile distance, bounding-box prediction, or timing approximation.

## Game feel

The rabbit should be cute and expressive. Movement should feel precise, not slippery. Jumping should be readable and responsive. The cave should feel dangerous because of darkness and limited visibility, not because of unfair collision.

## Audio

Use both sound systems:

* AY chip: looping atmospheric background music.
* Beeper: short SFX for jump, landing, shooting, pickup, damage, menu blips.

AY should provide three-channel mood: melody, bass drone, and cave/noise texture. Beeper should remain sharp and physical.

## Lighting

Implement a limited light system:

* Rabbit carries a soft light radius.
* Carrot shots briefly illuminate the cave.
* Some enemies react to light.
* Distant tiles should fall into darkness.
* Prefer ZX-style palette and dithering over modern smooth lighting.

## Internationalization

Use `pickLocale()` from the start. Keep the default language in `strings.ts` and add localized string packs such as `strings.sk.ts`.

All UI text must go through the locale object.

## Non-lethal enemy design

Enemies should not die. They retreat, curl up, hide, or become inactive.

Spider example:

* The spider descends on a thread.
* If it touches the rabbit by pixel mask overlap, the rabbit is hurt.
* If hit by a carrot shot by pixel mask overlap, the spider curls up and retracts.
* Once curled, it does not respawn in the same room.

## First prototype scope

Build one playable room with:

1. Rabbit movement.
2. One tilemap cave room.
3. Pixel-perfect carrot pickup.
4. One descending spider.
5. One carrot shot.
6. AY background loop.
7. Beeper SFX.
8. Runtime locale selection.
9. A simple darkness/light overlay.

# Agent Task Brief — chaosBunny

You are helping develop chaosBunny, a pixel-perfect cave escape game built on `zx-kit`.

## Goal

Design and implement the best small but extensible game model for a dark, cute, ZX Spectrum-inspired rabbit platformer.

The player controls a rabbit trying to escape from an underground cave to the surface.

## Required design constraints

* Use `zx-kit`.
* Use tilemaps for the first version.
* Preserve pixel-perfect gameplay.
* Use final collision checks based on bitmap masks, not bounding boxes.
* Use `masksOverlap()` for entity-to-entity collision.
* Use `pixelSolidCount()` where tile collision must respect actual opaque pixels.
* Use AY for background music.
* Use beeper for SFX.
* Use `pickLocale()` for runtime language selection.
* Include a cave lighting system.
* Enemies must not die; they should retreat, curl up, hide, or become inactive.

## Suggested architecture

Use a small entity model:

* `PlayerEntity`
* `ProjectileEntity`
* `SpiderEntity`
* `PickupEntity`
* `LightSource`
* `RoomState`

Each entity should have:

* position in game pixels
* bitmap
* pixel mask
* state
* update function
* render function

Do not lock the player to the tile grid. The tilemap is the world; sprites move freely in pixel space.

## Collision policy

AABB may be used only for broad-phase filtering.

Final collision must use mask overlap:

```ts
if (masksOverlap(A_MASK, ax, ay, B_MASK, bx, by) > 0) {
  // real collision
}
```

For the carrot shot, define an 8x1 bitmap with only 4 solid pixels. The projectile may only affect a spider when its real opaque pixels overlap the spider mask.

## First milestone

Create a one-room vertical slice:

* Title screen with a large cute rabbit portrait.
* One cave room.
* Player movement: left, right, jump, fire.
* One carrot pickup.
* One descending spider.
* One carrot projectile.
* Pixel-perfect pickup detection.
* Pixel-perfect spider contact.
* Pixel-perfect projectile hit.
* AY background loop.
* Beeper jump/shoot/pickup/hit sounds.
* Basic light radius around the player.
* `pickLocale()` with English and Slovak strings.

## Evaluation criteria

The prototype is successful only if:

* No pickup happens before visible pixel contact.
* No enemy hit happens before visible pixel contact.
* No player damage happens before visible pixel contact.
* The game feels dark but readable.
* The rabbit remains cute and expressive.
* The code stays small enough to grow into a real game.

