# What a heavy consumer learned about zx-kit

Notes from building the tile-stealth game on `zx-kit@^0.46.1` over 2026-09-11/12 — a
game that uses more of the kit at once than anything else in this repo: the renderer,
the layer cache, glow, lighting-adjacent drawing, the ROM font and its blinking text,
`parseSCR`, AY loops, the beeper, save profiles with a migration, `pickLocale` and the
input layer. **This is feedback for the kit, not a list of complaints** — most of it
worked first time, and the two things that cost an hour are written down as the failure
modes they had, not as blame.

## What cost time, and why

**`refreshLayer` fails silently when you forget `invalidateLayer`.** The cache is
dirty-driven: the callback only runs while `dirty` is set. A game that rebuilds a cached
layer because its contents changed (a lamp going out, a grate opening) calls
`refreshLayer` again and *nothing happens* — no error, no warning, and the old picture
keeps blitting. It took reading canvas pixels in a browser to find it; every test passed.

Suggestions, cheapest first: mention `invalidateLayer` in `refreshLayer`'s own doc line
(the module comment has it, the function's does not); or accept an options bag,
`refreshLayer(layer, draw, { force: true })`; or return a boolean saying whether the
callback actually ran, so a caller can assert it in a test.

**The input layer has one action button.** `consumeFlag` (F / gamepad A) and
`consumePause` (P / Start) are the whole vocabulary. This game has four verbs — step,
ears, throw, wait — plus undo and a map, so everything past the throw is keyboard-only
and the gamepad can move and throw but not lower the rabbit's ears. A general
`consumeButton('b' | 'x' | 'y')`, or a way to register a key/button pair, would make
gamepad play possible for anything with more than one verb.

The game works around it by spending the buttons the kit has already spent. `consumePause`
(P / Start) is the ears, since a beat-based game has nothing to pause; `consumeDebug`
(Ctrl+Shift+B / **Y**) is waiting a beat, since this game has no debug overlay to toggle.
That is four verbs on a pad — walk, throw, ears, wait — and the cellar is finishable with
one, which it was not an hour ago.

It is worth being plain about what that means for the kit: **the pad's whole button
vocabulary here is three, and all three are named after something else.** A reader of
this game's input code has to be told that pause means ears and debug means wait. That
is not a bug in the workaround, it is the missing feature restated — `consumeButton('b' |
'x' | 'y')`, or a register-a-pair call, would let a game say what it means. And the
borrowing has a real edge: any game that wants *both* a debug overlay and a fourth verb
has run out, with no way to ask for another.

## What worked exactly as advertised

- **`glow`** — dropped in for a burning lamp and cost nothing measurable: 16.7 ms a
  frame with it, the same without. The "emissive, not brighter" framing is right; the
  halo reads as light without touching the flat palette.
- **`createLayerCache`** — the room is drawn once and blitted; the perf rule this repo
  learned the hard way is now a one-liner.
- **Save profiles** — a v1 → v2 migration (records, then records plus replay runs)
  landed with no drama, and storage that is off or full leaves the game playing.
- **`parseSCR` + memory-order reveal** — the loading screen loads like a tape because
  the kit hands over the screen in the Spectrum's own row order.
- **`playAYLoop` + `seq`** — three voices written as strings, and a loop that does not
  drift because the lengths are checked by a test rather than by ear.
- **`pickLocale`** — two tongues, one call, no framework.

## One thing that was our fault, worth repeating anyway

`drawBlinkingText` will happily render a control character as nothing at all. A stray
`\x18` sat in this game's map screen for hours: the marker "worked", drew nothing, and
no test noticed because the test asserted the layout, not the glyph. Not a kit bug —
but a `dev`-mode warning for a code point the ROM font cannot draw would have saved the
afternoon.
