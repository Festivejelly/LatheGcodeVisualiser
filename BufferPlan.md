# Plan A: Firmware Command Buffer (h4.ino)
# Plan B: Sender Protocol Update (TypeScript)

---

# Plan A — Firmware: Motion Command Buffer

## Context

`taskGcode` currently reads one line, calls `handleGcodeCommand()` synchronously (which blocks until the move completes), then sends `ok`. The sender can only send one command at a time. This causes full stops between every G1 move.

The fix: accept motion commands into a 16-entry ring buffer, send `ok` immediately, and drain the buffer in a separate executor. Real-time commands bypass the buffer entirely. Non-motion commands drain the buffer first (sync), then execute.

---

## Command classification

| Class | Examples | Behaviour |
|---|---|---|
| Real-time | `!` `~` `?` `^` `#` `$` | Handle immediately in reader, no `ok` |
| Motion | `G0` `G1` (and bare axis moves) | Push to ring buffer, send `ok` immediately |
| Sync (non-motion) | `G28` `G92` `M0` `M3` `T1` `F` `S` | Drain buffer first, execute, send `ok` |

`F` (feed rate) and `S` (spindle speed) mid-program are sync — they must take effect before the next motion, not after it.

---

## New data structures

```cpp
// In h4.ino (global scope, PSRAM-backed)
#define MOTION_BUFFER_SIZE 16

struct MotionCommand {
  char line[64];  // raw gcode line, null-terminated
};

MotionCommand MOTION_BUFFER_MEM[MOTION_BUFFER_SIZE];  // allocate in PSRAM
MotionCommand* motionBuffer = MOTION_BUFFER_MEM;

volatile int motionBufHead = 0;  // executor reads from here
volatile int motionBufTail = 0;  // reader writes here

// Buffer full:  (tail + 1) % SIZE == head
// Buffer empty: head == tail
```

Use `ps_malloc` in `setup()` to put the buffer in PSRAM if available, fall back to regular heap.

---

## Changes to `taskGcode` (reader side)

The reader task currently assembles a line then calls `handleGcodeCommand()`. Change it to:

1. Real-time single-char commands — unchanged, handled immediately, no `ok`
2. When a full line is ready:
   - Call `classifyGcode(line)` → returns `MOTION`, `SYNC`, or `REALTIME`
   - If `MOTION`: spin-wait until buffer has space, push line, send `ok` immediately
   - If `SYNC`: spin-wait until `motionBufHead == motionBufTail` (buffer drained), then call `handleGcodeCommand()` directly, then send `ok`
   - Empty lines: send `ok` immediately (unchanged)

```cpp
GcodeClass classifyGcode(const String& cmd) {
  // Strip N-prefix, trim
  String c = cmd; c.trim();
  if (c.length() == 0) return GCODE_EMPTY;
  char first = c.charAt(0);
  if (first == 'G') {
    int n = getInt(c, 'G');
    if (n == 0 || n == 1) return GCODE_MOTION;
    // G2/G3 arcs if ever added: GCODE_MOTION
    return GCODE_SYNC;
  }
  if (first == NAME_Z || first == NAME_X || first == NAME_Y) return GCODE_MOTION; // bare axis moves
  return GCODE_SYNC; // M, T, F, S, G28, G92, etc.
}
```

---

## New executor task

Add a new FreeRTOS task pinned to core 0 (alongside existing tasks):

```cpp
void taskGcodeExecutor(void* param) {
  while (emergencyStop == ESTOP_NONE) {
    if (motionBufHead == motionBufTail) {
      taskYIELD();
      continue;
    }
    String line = String(motionBuffer[motionBufHead].line);
    motionBufHead = (motionBufHead + 1) % MOTION_BUFFER_SIZE;
    handleGcodeCommand(line);
    // no Serial.println("ok") here — ok was already sent by reader
  }
}
```

Registered in `setup()`:
```cpp
xTaskCreatePinnedToCore(taskGcodeExecutor, "gcodeExec", 10000, NULL, 0, NULL, 0);
```

---

## E-stop interaction

`!` sets `stopRequested = true` and `controllerState = STATE_IDLE` immediately (real-time, unchanged).

The executor checks `controllerState != STATE_RUN` at the top of each `handleGcodeCommand` call — existing behaviour. When stop is received, the executor will abandon the current move mid-buffer (existing `stopRequested` check in `moveAxis`), then on the next loop iteration see `STATE_IDLE` and stop pulling from the buffer.

Add one explicit flush on stop:
```cpp
// In the '!' handler:
motionBufHead = motionBufTail;  // discard queued motion commands
```

---

## Ring buffer head/tail safety

`motionBufHead` is written only by the executor task. `motionBufTail` is written only by the reader task. Both are `volatile int`. On ESP32 (32-bit aligned int reads/writes are atomic), this is safe without a mutex for the single-producer/single-consumer case.

The reader spin-waits for space using `taskYIELD()` in the wait loop, not `vTaskDelay`, to stay responsive.

---

## Critical files

- [h4/h4.ino](h4/h4.ino) — all changes here
  - Line 874: `taskGcode` — modify reader to classify and buffer
  - Line 941: `handleGcodeCommand()` call — move to executor task
  - Line 1410: `setup()` — register new executor task, allocate PSRAM buffer
  - Lines 893–904: `!` handler — add buffer flush

## Non-motion commands that need sync (do NOT buffer these)

Based on existing code:
- `G28` (home) — [h4.ino:3376](h4/h4.ino#L3376)
- `G92` (set position) — [h4.ino:4062](h4/h4.ino#L4062)
- `M0`/`M1` (pause) — [h4.ino:2765](h4/h4.ino#L2765)
- `T` (tool change) — [h4.ino:4181](h4/h4.ino#L4181)
- `F` / `S` standalone lines
- All other M codes

---

## Verification

1. Send 10 consecutive `G1` moves from a terminal — all 10 `ok` responses arrive before motion completes, motion is continuous with no audible stutter between moves
2. Send `G1 Z10` then immediately `!` — motion stops cleanly, buffer discarded
3. Send `G1 Z10` then `G28 Z` — Z homes only after Z10 completes (sync behaviour correct)
4. Send `T1` mid-program — tool change prompt appears only after preceding moves finish
5. Send `~` during `M0` pause — resumes correctly (real-time, unchanged)

---
---

# Plan B (revised) — Sender: `src/sender.ts` Buffering Refactor

*This supersedes the original "Plan B" sketch further below where they disagree — that sketch was written against a hypothetical API (`peekNextLine`/`consumeLine`/`sendRaw`) that doesn't exist in the real sender. This revision is adapted directly to the actual `Sender` class in `src/sender.ts`, after reading it in full.*

## Context

The controller currently executes gcode strictly one line at a time: the sender writes a line, blocks until `ok`, writes the next. Plan A above describes the firmware side of a fix — a 16-slot motion ring buffer where `G0`/`G1`/bare-axis lines get an immediate `ok` on enqueue and run asynchronously, while non-motion ("sync") commands like `M0`, `G28`, `T1`, standalone `F`/`S` wait for the buffer to drain before executing, and real-time chars (`!`/`~`/`?`) bypass everything. This removes the stop-start stutter on runs of small fast moves.

This plan covers only the sender (`src/sender.ts`), which today is a single-in-flight-command state machine shared by `gcode.ts`, `planner.ts`, and `quicktasks.ts`. It needs to become pipeline-aware: send ahead up to 16 motion lines, track how many are unacknowledged, and keep gating sync commands on full drain — mirroring the firmware's own classifier so the two sides agree on what's a motion command vs. a sync command.

Decision already made with the user: line-highlighting in `planner.ts` (`getLineIndex()` / `notifyCurrentCommand`) will keep firing at **send time**, not at physical-completion time. Under pipelining this means the highlighted line can run up to 16 lines ahead of what the machine is actually cutting — accepted tradeoff, no new tracking needed for this.

## Design

### Field changes in `Sender` (`src/sender.ts:47-84`)

Today's single `lineIndex` conflates two things that pipelining pulls apart: "next line to send" and "lines fully acknowledged." Replace it with:

```ts
private static readonly MAX_BUFFER = 16; // matches firmware ring buffer size

private sendCursor = 0;       // next index in `this.lines` to consider sending
private ackedCount = 0;       // count of lines whose 'ok' has been received — drives progress/completion
private currentLineIndex = 0; // index of the most recently *sent* line — feeds getLineIndex() for planner's highlight
private inFlight = 0;         // pipelined motion lines sent, ok not yet received
private pumping = false;      // re-entrancy guard for pumpQueue()
```

`waitForOkOrError` stays, but narrows in meaning: it's now only set while a **sync** line (or a legacy single ad-hoc command) is in flight — motion lines pipeline via `inFlight` instead. `m0Waiting`, `m204Waiting`, `heldByHost`, `pauseReason`, `pauseGeneration` (`sender.ts:401-405`) are unchanged.

Invariant maintained throughout: `sendCursor - ackedCount === inFlight + (waitForOkOrError ? 1 : 0)`. Blank/comment-only lines advance `sendCursor` and `ackedCount` together (nothing sent, nothing to ack), which keeps the invariant true and makes completion detection (`ackedCount >= lines.length`) correct.

### Classifier (new private method, mirrors firmware's)

```ts
private classifyLine(line: string): 'motion' | 'sync' {
    const gMatch = line.match(/^(?:N\d+\s*)?G(\d+)/i);
    if (gMatch) {
        const n = parseInt(gMatch[1], 10);
        return (n === 0 || n === 1) ? 'motion' : 'sync';
    }
    if (/^[XZY]/i.test(line)) return 'motion'; // bare axis move, no G-word
    return 'sync'; // M-codes, T, G28/G92, standalone F/S, everything else
}
```

Only called on already comment-stripped, trimmed, non-empty lines (empty and true real-time chars `?`/`!`/`~` are handled elsewhere, unchanged).

### `pumpQueue()` replaces `writeCurrentLine()` (`sender.ts:587-614`)

Renamed because a single call can now send several motion lines in a burst. Update all 4 internal call sites (`resume()`, the two spots in `parseStatusPayload()`, and the ok-branch in `processResponse()`).

```ts
private async pumpQueue() {
    if (this.pumping) return;
    this.pumping = true;
    try {
        while (true) {
            if (this.waitForOkOrError) return;
            if (this.controllerState === 'waiting') return;

            if (this.sendCursor >= this.lines.length) {
                if (this.ackedCount >= this.lines.length) await this.done();
                return;
            }

            const raw = this.lines[this.sendCursor];
            const line = raw.split(';')[0].trim();
            if (!line) {
                this.sendCursor++;
                this.ackedCount++;
                continue;
            }

            const cls = this.classifyLine(line);

            if (cls === 'motion') {
                if (this.inFlight >= Sender.MAX_BUFFER) return; // buffer full, wait for an ok
                this.sendCursor++;
                this.inFlight++;
            } else {
                if (this.inFlight > 0) return; // sync: drain motion buffer first

                this.m0Waiting = /^\s*M0\b/i.test(line);
                if (this.m0Waiting) this.pauseGeneration++;
                this.pauseReason = this.m0Waiting ? this.extractPauseReasonFromM0(raw) : undefined;
                if (/^\s*M204\b/i.test(line)) this.m204Waiting = true;

                this.sendCursor++;
                this.waitForOkOrError = true;
            }

            this.currentLineIndex = this.sendCursor - 1;
            this.currentLine = line;
            this.notifyCurrentCommand(this.currentLine);

            appendLineToResponseEditor(`command: ${line}`);
            await this.write(line + '\n');

            if (cls !== 'motion') return; // sync: must wait for its own ok
            // motion: loop again, keep pipelining while buffer has room
        }
    } finally {
        this.pumping = false;
    }
}
```

The `m0Waiting`/`m204Waiting`/`pauseReason`/`pauseGeneration` block is moved verbatim into the sync branch — since M-codes always classify as sync, and sync only ever sends once `inFlight === 0`, the existing "pause only happens with nothing else pending" guarantee still holds.

### `processResponse()` ok-branch (`sender.ts:666-709`)

```ts
if (/^\s*ok\b/i.test(raw) || /\bok\b/i.test(raw)) {
    // ... existing formatting/logging unchanged ...
    if (this.m204Waiting && !this.waitForOkOrError) continue; // unchanged

    const wasSyncInFlight = this.waitForOkOrError;
    this.waitForOkOrError = false;
    this.ackedCount++;
    if (!wasSyncInFlight && this.inFlight > 0) this.inFlight--;

    this.notifyStatusChange();

    if (this.m0Waiting) continue;                     // unchanged
    if (this.m204Waiting) { void this.write('?'); continue; } // unchanged
    if (this.port && this.writer && !this.isDisconnecting && !this.waitForOkOrError) void this.write('?'); // unchanged

    await this.pumpQueue(); // may send 0, 1, or many queued motion lines
    continue;
}
```

`error:` handling (`sender.ts:656-664`) needs no change — it already calls `this.stop()` unconditionally, and `stop()` is updated below to reset `inFlight`.

### `stop()` / `resume()` / `done()` — reset `inFlight` too

```ts
private async done() {
    this.waitForOkOrError = false;
    this.lines = [];
    this.sendCursor = 0;
    this.ackedCount = 0;
    this.inFlight = 0;
    this.currentLineIndex = 0;
    this.currentLine = '';
    this.notifyStatusChange();
}

async stop() {
    this.error = '';
    await this.write('!');
    this.heldByHost = true;
    this.lines = [];
    this.sendCursor = 0;
    this.ackedCount = 0;
    this.inFlight = 0;
    this.currentLineIndex = 0;
    this.currentLine = '';
    this.notifyStatusChange();
}
```

`resume()`'s trailing `await this.writeCurrentLine();` becomes `await this.pumpQueue();`.

**Feed-hold path also needs the `inFlight` reset.** `sendCommand()`'s realtime branch (`sender.ts:486-491`) sends `!` directly and is used by `planner.ts`'s dedicated Feed Hold button, bypassing `stop()` entirely. Since firmware discards its ring buffer unconditionally on `!`, the sender must zero `inFlight` there too, or `ackedCount` will never catch up to `lines.length` again after a feed-hold (hanging `isStreaming()`/progress forever):

```ts
if (rt === '!' || rt === '~') {
    appendLineToResponseEditor(`command: ${rt}`);
    await this.write(rt);
    if (rt === '!') this.inFlight = 0;
    this.notifyStatusChange();
    return;
}
```

Note this deliberately does **not** clear `lines`/`sendCursor`/`ackedCount` here (unlike `stop()`) — this is the resumable feed-hold path used by planner's pause/resume UX, not an abort.

### `start()` / `sendCommands()` — priming the pipeline

Because `pumpQueue()`'s own loop already sends as many motion lines as fit, no separate "priming" logic is needed — reset state, then one `pumpQueue()` call:

```ts
async start(text: string, client: SenderClient) {
    if (!text) return;
    this.setActiveClient(client);
    this.lines = text.split('\n');
    this.sendCursor = 0;
    this.ackedCount = 0;
    this.inFlight = 0;
    this.currentLineIndex = 0;
    this.waitForOkOrError = false;
    await this.write('~');
    await this.pumpQueue();
    this.notifyStatusChange();
}
```

Same pattern for `sendCommands(commands, client)`.

### `sendCommand()` (single ad-hoc line — jog, MDI dropdown)

Route it through the same `pumpQueue()` path for consistency (one send-implementation instead of two that can drift). For a lone command with nothing queued behind it, motion-vs-sync classification is a no-op in practice — busy-until-ok holds either way. Leave the true real-time bypasses (`?`, `!`, `~`) untouched (plus the `inFlight = 0` addition above):

```ts
async sendCommand(command: string, client: SenderClient) {
    this.setActiveClient(client);
    const rt = command.trim();
    if (rt === '?') { /* unchanged */ }
    if (rt === '!' || rt === '~') { /* unchanged, + inFlight = 0 for '!' */ }

    this.lines = [command];
    this.sendCursor = 0;
    this.ackedCount = 0;
    this.inFlight = 0;
    this.currentLineIndex = 0;
    this.waitForOkOrError = false;
    await this.pumpQueue();
    this.notifyStatusChange();
}
```

### Accessors — exact post-refactor semantics

- `getLineIndex()` (`sender.ts:109-111`, read by `planner.ts:627` for the DOM highlight) → `return this.currentLineIndex;`
- `hasPendingLines()` (`sender.ts:318-321`) → `this.ackedCount < (this.lines?.length ?? 0)`
- `isStreaming()` (`sender.ts:395-399`) → `const total = this.lines?.length ?? 0; const acked = Math.min(this.ackedCount, total); return total > 0 && acked < total;` (the old `waitForOkOrError ||` prefix is subsumed — a sync line in flight always implies `ackedCount < total`)
- `shouldShowResume()` (`sender.ts:169-173`) → same shape, swap `lineIndex` for `ackedCount`
- `canResume()` (`sender.ts:435-438`) → unchanged
- `getStatus()` (`sender.ts:127-163`) → `progress = ackedCount / total` (same meaning as before, just correctly tracks acknowledgment instead of send-cursor). No new `SenderStatus` fields — nothing consumes buffer depth today, don't add it speculatively.

No changes needed in `planner.ts`, `gcode.ts`, or `quicktasks.ts` — they only consume the accessors above, whose contracts are preserved.

## Integration risk to flag: `#` (tool offsets query)

The Plan A command table above classifies `#` as **real-time** (handled immediately, no `ok`). But the sender's existing `getToolOffsets()` (`sender.ts:515-533`) sends `#` via `sendCommand()` and waits for a response containing **both** `toolOffsets:` and `ok` — meaning the *current* firmware does send `ok` after `#`. If Plan A is implemented exactly as tabled, this sender feature breaks (the wait will time out). This needs a decision on the firmware side: either keep `#` responding with `ok` (treat it as sync, not real-time, despite the table), or have the sender stop expecting `ok` for `#` and rely purely on the `toolOffsets:` payload. Worth resolving before/alongside implementing Plan A. (`^` and `$` from the same real-time row aren't used anywhere in the sender today, so no risk there.)

## Critical files (revised plan)

- `src/sender.ts` — all changes above
- `src/planner.ts` — verify-only (lines ~607-751), no edits expected
- `src/gcode.ts` — verify-only (lines ~142-175, 786-840), no edits expected
- `src/quicktasks.ts` — verify-only (lines ~850-875), no edits expected

## Verification (revised plan)

1. Load a file with 50+ consecutive `G1` moves, hit send — confirm (via response editor / console logging) that up to 16 `ok`s can be in flight and lines stream continuously rather than one-at-a-time.
2. Mixed file: several `G1`s, then `G28`, then more `G1`s — confirm `G28` only sends after the preceding motions are all acked, then motion resumes after `G28`'s own `ok`.
3. `M0` mid-file — confirm pause still triggers correctly (planner's paused modal appears) only once prior motion has drained, and `resume()` continues streaming afterward.
4. Hit Stop mid-run (both the main stop button calling `stop()` and planner's separate Feed Hold button calling `sendCommand('!', ...)`) — confirm `inFlight` and queue state reset so the UI doesn't get stuck thinking a job is still in progress.
5. Single jog button clicks and MDI dropdown commands still work one at a time as before.
6. Watch planner's line-highlight during a run of `G1`s — confirm it visibly advances ahead of physical motion (expected/accepted), and doesn't error or go out of range.
7. Confirm `getToolOffsets()` still resolves once firmware-side `#` behavior is settled (see integration risk above) — test against actual hardware once Plan A lands.

---
---

# Plan B (original sketch) — Sender: Protocol-Aware Command Streaming

## Context

The sender currently sends one command, waits for `ok`, sends the next. This works but means only one command is in-flight at a time. With firmware Plan A, the controller can buffer 16 motion commands. The sender needs to exploit this by sending ahead — up to buffer capacity — while tracking how many unacknowledged commands are in flight.

This is the standard grbl streaming protocol ("character counting" or "simple send/response" variant). We use the simpler **line counting** approach: track how many lines have been sent but not yet `ok`'d.

---

## Sender command classification (mirrors firmware)

The sender must classify each line before sending:

| Class | Behaviour |
|---|---|
| Real-time (`!` `~` `?`) | Send immediately, do NOT increment in-flight counter, do NOT wait for `ok` |
| Motion (`G0` `G1` + bare axis) | Send if `inFlight < MAX_BUFFER` (16), increment counter, `ok` decrements counter |
| Sync (`G28` `T` `M0` `F` `S` `G92` etc.) | Wait until `inFlight == 0`, send, wait for `ok` before continuing |

---

## Sender state changes

```typescript
const MAX_BUFFER = 16;
let inFlight = 0;  // commands sent, ok not yet received

function classifyLine(line: string): 'motion' | 'sync' | 'realtime' | 'empty' {
  const trimmed = line.trim().toUpperCase();
  if (!trimmed) return 'empty';
  if ('!~?'.includes(trimmed[0])) return 'realtime';
  const gMatch = trimmed.match(/^(?:N\d+\s+)?G(\d+)/);
  if (gMatch) {
    const n = parseInt(gMatch[1]);
    if (n === 0 || n === 1) return 'motion';
    return 'sync';
  }
  if (/^[XZY]/.test(trimmed)) return 'motion'; // bare axis moves
  return 'sync';
}

// On receiving 'ok':
function onOk() {
  if (inFlight > 0) inFlight--;
  sendNextIfAble();
}

// Main send loop:
async function sendNextIfAble() {
  const line = peekNextLine();
  if (!line) return;
  const cls = classifyLine(line);

  if (cls === 'realtime') {
    consumeLine();
    sendRaw(line);  // no ok expected
    sendNextIfAble();
  } else if (cls === 'motion') {
    if (inFlight >= MAX_BUFFER) return;  // wait for ok to free slot
    consumeLine();
    inFlight++;
    sendRaw(line);
    sendNextIfAble();  // immediately try next
  } else if (cls === 'sync') {
    if (inFlight > 0) return;  // wait for buffer to drain
    consumeLine();
    sendRaw(line);
    // do NOT call sendNextIfAble — wait for ok first
  } else {
    consumeLine();
    sendNextIfAble();
  }
}
```

---

## `!` (stop) handling in sender

When user hits stop:
1. Send `!` immediately (real-time, bypasses queue)
2. Clear the local pending-lines queue
3. Reset `inFlight = 0` (firmware discarded its buffer too)
4. Do not send more lines until user explicitly resumes or starts a new program

---

## `M0` (pause) handling in sender

`M0` is sync — sender drains in-flight before sending it, waits for `ok` (which firmware sends after entering HOLD). Sender then shows "paused — send ~ to resume" UI. On `~`, sender sends `~` as real-time, resumes streaming.

---

## Verification

1. Load a file with 50 consecutive `G1` moves — sender sends up to 16 before waiting, `ok`s arrive while moves execute, steady streaming throughout
2. Insert `T1` mid-file — sender drains in-flight to 0 before sending `T1`, waits for `ok`, then continues
3. Hit stop mid-run — `!` sent immediately, queue cleared, `inFlight` reset
4. `M0` pause — sender stalls after `ok` for `M0`, resumes on `~`
5. Mixed file: G1s, then G28, then more G1s — G28 waits for prior motion, G1s after stream freely
