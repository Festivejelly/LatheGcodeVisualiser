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

# Plan B — Sender: Protocol-Aware Command Streaming

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
