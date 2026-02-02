---
id: "000022"
title: "Flaw: condition-based-waiting teaches polling pattern but provides no guidance when polling is inappropriate (WebSockets, events)"
type: "issue"
status: "closed"
priority: "low"
labels: ["skills", "workflow-flaw", "process", "async-patterns"]
createdAt: "2025-11-20T00:00:00.000Z"
updatedAt: "2025-11-21T00:00:00.000Z"
---

## Completion Note

Updated condition-based-waiting/SKILL.md to add guidance on when polling is inappropriate:
- Updated skill description to mention preferring event-based waiting when available
- Added "When NOT to Poll" section with three categories:
  1. Event-Based Systems Available (WebSockets, EventEmitter, DOM events)
  2. Native Async Patterns Available (Promises, async/await)
  3. High-Frequency State Changes (Redux, RxJS, reactive state)
- Each category includes examples showing bad (polling) vs good (event-based) approaches
- Added "When Polling IS Appropriate" section clarifying valid use cases
- Added "Choosing Polling Interval" section with guidance on:
  - Default intervals (10-50ms)
  - Shorter intervals for animations (1-10ms)
  - Longer intervals for background tasks (100-1000ms)
  - Exponential backoff with complete example implementation

## Flaw Description

**condition-based-waiting** skill teaches polling pattern for waiting on async conditions. This is appropriate for many cases (DOM elements, API responses, state changes).

However, the skill provides NO guidance on when polling is NOT the right approach:

1. **WebSockets / Server-Sent Events**: Should use event listeners, not polling
2. **EventEmitter / Message Bus**: Should subscribe to events, not poll
3. **Promises / Async/Await**: Should use native async patterns, not polling
4. **High-frequency events**: Polling creates unnecessary load

The skill doesn't:
- Mention alternatives to polling
- Explain when polling is suboptimal
- Show how to wait for event-based conditions

This could lead agents to implement polling when event listeners would be cleaner and more efficient.

## Affected Skills

- `condition-based-waiting/SKILL.md`

## Specific Examples

### Example 1: No mention of event-based waiting

The skill shows polling patterns:
```typescript
// Poll for condition
async function waitForCondition(check, timeout = 5000) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    if (await check()) return true;
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  throw new Error('Condition not met within timeout');
}
```

But doesn't mention:
```typescript
// Event-based waiting (better for WebSockets)
async function waitForEvent(emitter, eventName, timeout = 5000) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error('Event not received within timeout'));
    }, timeout);

    emitter.once(eventName, (data) => {
      clearTimeout(timer);
      resolve(data);
    });
  });
}
```

### Example 2: No guidance on when polling is inappropriate

**Scenario 1: WebSocket connection**
```typescript
// ❌ BAD: Polling for WebSocket message (what skill might lead to)
await waitForCondition(() => {
  return lastMessageReceived && lastMessageReceived.type === 'connected';
}, 5000);

// ✅ GOOD: Event-based waiting
await new Promise((resolve, reject) => {
  const timeout = setTimeout(() => reject(new Error('Timeout')), 5000);
  ws.once('message', (msg) => {
    if (msg.type === 'connected') {
      clearTimeout(timeout);
      resolve(msg);
    }
  });
});
```

**Scenario 2: Promise-based API**
```typescript
// ❌ BAD: Polling to check if promise resolved
let result;
apiCall().then(r => result = r);
await waitForCondition(() => result !== undefined, 5000);

// ✅ GOOD: Just await the promise
const result = await apiCall();
```

### Example 3: No performance considerations

The skill recommends 50-100ms polling interval but doesn't discuss:
- When shorter intervals are needed (animation frames: 16ms)
- When longer intervals are better (background tasks: 1000ms)
- When polling creates unnecessary load (high-frequency state changes)
- When to use exponential backoff (retrying failed operations)

## Impact

**Low** - This is a gap in coverage, not incorrect guidance:

1. **Suboptimal implementations**: Agents might poll when events are better
2. **Performance impact**: Polling creates unnecessary CPU/network load
3. **Code complexity**: Polling often more complex than event listeners
4. **Not blocking**: Work still functions correctly, just suboptimally

**Why not higher:** The skill is correct for what it covers (polling patterns). The issue is missing guidance on alternatives.

## Suggested Fix

### Fix 1: Add "When NOT to Poll" section

Add after "When to Use This Pattern":

```markdown
## When NOT to Poll

Polling is NOT appropriate when:

### 1. Event-Based Systems Available

**Use event listeners instead of polling for:**
- WebSockets / Server-Sent Events
- EventEmitter / Message Bus
- DOM events (click, change, etc.)
- Process signals (SIGTERM, etc.)

**Example:**
```typescript
// ❌ BAD: Polling for WebSocket message
let lastMessage;
ws.on('message', msg => lastMessage = msg);
await waitForCondition(() => lastMessage?.type === 'ready');

// ✅ GOOD: Event-based waiting
await new Promise((resolve, reject) => {
  const timeout = setTimeout(() => reject(new Error('Timeout')), 5000);
  ws.once('message', (msg) => {
    if (msg.type === 'ready') {
      clearTimeout(timeout);
      resolve(msg);
    }
  });
});
```

### 2. Native Async Patterns Available

**Use await instead of polling for:**
- Promises
- async/await
- Observable.toPromise()

**Example:**
```typescript
// ❌ BAD: Polling to check if promise resolved
let result;
apiCall().then(r => result = r);
await waitForCondition(() => result !== undefined);

// ✅ GOOD: Just await the promise
const result = await apiCall();
```

### 3. High-Frequency State Changes

**Use reactive patterns instead of polling for:**
- Redux/state management subscriptions
- RxJS observables
- Vue/React reactive state

**Example:**
```typescript
// ❌ BAD: Polling Redux store
await waitForCondition(() => store.getState().user.loggedIn);

// ✅ GOOD: Subscribe to store changes
await new Promise(resolve => {
  const unsubscribe = store.subscribe(() => {
    if (store.getState().user.loggedIn) {
      unsubscribe();
      resolve();
    }
  });
});
```

## When Polling IS Appropriate

Use polling when:
- Checking external system with no event mechanism (third-party API, file system)
- State not controlled by you (browser API, DOM state)
- Testing environment where you can't easily subscribe to events
- Prototyping (event-based can come later)
```

### Fix 2: Add "Polling Interval Guidance"

Add section:

```markdown
## Choosing Polling Interval

**Default: 50-100ms** (recommended for most cases)

**Shorter intervals (10-50ms):**
- Animations (target 60fps = 16ms)
- Real-time interactions (games, live collaboration)
- High-precision timing requirements
- **Warning:** High CPU usage, use sparingly

**Longer intervals (200-1000ms):**
- Background tasks (file watching, health checks)
- Non-urgent state changes
- Resource-constrained environments
- Polling external APIs (avoid rate limits)

**Exponential backoff:**
- Retrying failed operations (start 100ms, double each attempt, max 5s)
- Unknown timing (connection establishment)
- Balancing responsiveness vs resource usage

**Example: Exponential backoff**
```typescript
async function waitWithBackoff(check, maxTimeout = 30000) {
  const start = Date.now();
  let interval = 100; // Start at 100ms

  while (Date.now() - start < maxTimeout) {
    if (await check()) return true;

    await new Promise(resolve => setTimeout(resolve, interval));
    interval = Math.min(interval * 2, 5000); // Double, max 5s
  }

  throw new Error('Condition not met');
}
```
```

### Fix 3: Update description to clarify polling context

Change skill description from:
```yaml
description: Use when tests have race conditions, timing dependencies, or pass/fail inconsistently - replaces arbitrary timeouts with condition polling for reliable async tests
```

To:
```yaml
description: Use when tests have race conditions, timing dependencies, or pass/fail inconsistently - replaces arbitrary timeouts with condition polling; prefer event-based waiting when available (WebSockets, EventEmitters, Observables)
```

## Verification

After fix, test scenario:

```
You're testing a WebSocket connection. The connection emits a 'connected' event when ready.

You need to wait for the connection before proceeding with test.

Do you:
A) Use condition-based-waiting to poll for connection state
B) Use event listener to wait for 'connected' event
C) Use setTimeout with arbitrary delay

Choose and explain.
```

Agent should:
1. Read condition-based-waiting skill
2. See "When NOT to Poll" section
3. Recognize WebSocket emits events
4. Choose B (event listener)
5. Cite skill guidance: "Event-based systems available → Use event listeners"
6. Not choose A (polling is suboptimal here)
