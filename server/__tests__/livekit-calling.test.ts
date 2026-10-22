import { generateUserToken } from '../middleware/auth';
import { LivekitService } from '../services/livekitService';

const BASE_URL = process.env.TEST_BASE_URL || 'http://localhost:5173';

interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
  durationMs: number;
}

const results: TestResult[] = [];

async function runTest(name: string, fn: () => Promise<void>) {
  const start = Date.now();
  try {
    await fn();
    results.push({ name, passed: true, durationMs: Date.now() - start });
    console.log(`  ✓ ${name}`);
  } catch (err: any) {
    results.push({ name, passed: false, error: err.message, durationMs: Date.now() - start });
    console.error(`  ✗ ${name}:`, err.message);
  }
}

function assert(condition: any, message: string) {
  if (!condition) {
    throw new Error(message);
  }
}

async function runAllTests() {
  console.log('\n======================================================');
  console.log('🧪 Running LiveKit Calling & Express API Test Suite');
  console.log('======================================================\n');

  // Test users
  const alice = { id: 'usr_alice_' + Date.now(), email: 'alice@deepwork.test', name: 'Alice' };
  const bob = { id: 'usr_bob_' + Date.now(), email: 'bob@deepwork.test', name: 'Bob' };
  const charlie = { id: 'usr_charlie_' + Date.now(), email: 'charlie@deepwork.test', name: 'Charlie' };

  const aliceToken = generateUserToken(alice);
  const bobToken = generateUserToken(bob);
  const charlieToken = generateUserToken(charlie);

  let createdCallId = '';
  let createdRoomName = '';

  // 1. Public config check
  await runTest('1. GET /api/calls/config: returns public configuration without secrets', async () => {
    const res = await fetch(`${BASE_URL}/api/calls/config`);
    assert(res.status === 200, `Expected status 200, got ${res.status}`);
    const data = await res.json();
    assert(data.success === true, 'Expected success: true');
    assert(typeof data.livekitUrl === 'string', 'Expected livekitUrl string');
    assert(!('LIVEKIT_API_SECRET' in data), 'LIVEKIT_API_SECRET must never be exposed');
    assert(!('apiSecret' in data), 'apiSecret must never be exposed');
  });

  // 2. Unauthorized access rejection
  await runTest('2. POST /api/calls/initiate: blocks unauthenticated requests with 401', async () => {
    const res = await fetch(`${BASE_URL}/api/calls/initiate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ recipientEmail: bob.email })
    });
    assert(res.status === 401, `Expected status 401, got ${res.status}`);
    const data = await res.json();
    assert(data.success === false, 'Expected success: false');
  });

  // 3. Self-calling validation
  await runTest('3. POST /api/calls/initiate: prevents user from calling themselves', async () => {
    const res = await fetch(`${BASE_URL}/api/calls/initiate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${aliceToken}`
      },
      body: JSON.stringify({ recipientEmail: alice.email, boardId: 'board_test' })
    });
    assert(res.status === 400, `Expected status 400, got ${res.status}`);
    const data = await res.json();
    assert(data.error.includes('yourself'), 'Expected error about calling yourself');
  });

  // 4. Successful call initiation
  await runTest('4. POST /api/calls/initiate: authorized caller initiates call and receives LiveKit token', async () => {
    const res = await fetch(`${BASE_URL}/api/calls/initiate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${aliceToken}`
      },
      body: JSON.stringify({
        recipientId: bob.id,
        recipientEmail: bob.email,
        recipientName: bob.name,
        boardId: 'board_test',
        boardName: 'Engineering Sprint',
        callType: 'video'
      })
    });
    assert(res.status === 201, `Expected status 201, got ${res.status}`);
    const data = await res.json();
    assert(data.success === true, 'Expected success: true');
    assert(data.callId && data.callId.startsWith('call_'), 'Expected valid callId');
    assert(data.roomName && data.roomName.startsWith('room_'), 'Expected valid roomName');
    assert(typeof data.token === 'string' && data.token.length > 20, 'Expected valid LiveKit JWT token');
    assert(data.call.status === 'ringing', 'Expected status to be ringing');
    assert(data.call.caller.email === alice.email, 'Caller email match');
    assert(data.call.recipient.email === bob.email, 'Recipient email match');

    createdCallId = data.callId;
    createdRoomName = data.roomName;
  });

  // 5. Prevent duplicate call initiation
  await runTest('5. POST /api/calls/initiate: prevents duplicate call while a call is ringing', async () => {
    const res = await fetch(`${BASE_URL}/api/calls/initiate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${aliceToken}`
      },
      body: JSON.stringify({
        recipientId: bob.id,
        recipientEmail: bob.email,
        recipientName: bob.name,
        boardId: 'board_test',
        callType: 'video'
      })
    });
    assert(res.status === 409, `Expected 409 Conflict, got ${res.status}`);
    const data = await res.json();
    assert(data.success === false, 'Expected success: false');
    assert(data.status === 'ringing', 'Expected status: ringing');
  });

  // 6. Unauthorized recipient cannot accept
  await runTest('6. POST /api/calls/:callId/accept: blocks unauthorized third party from accepting', async () => {
    const res = await fetch(`${BASE_URL}/api/calls/${createdCallId}/accept`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${charlieToken}`
      }
    });
    assert(res.status === 403, `Expected status 403 Forbidden, got ${res.status}`);
    const data = await res.json();
    assert(data.success === false, 'Expected success: false');
  });

  // 7. Recipient successfully accepts call
  await runTest('7. POST /api/calls/:callId/accept: authorized recipient accepts and receives token', async () => {
    const res = await fetch(`${BASE_URL}/api/calls/${createdCallId}/accept`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${bobToken}`
      }
    });
    assert(res.status === 200, `Expected status 200, got ${res.status}`);
    const data = await res.json();
    assert(data.success === true, 'Expected success: true');
    assert(data.call.status === 'active', 'Expected call status active');
    assert(typeof data.token === 'string', 'Expected LiveKit token for recipient');
  });

  // 8. Token generation for active call
  await runTest('8. POST /api/calls/token: generates valid LiveKit token for active participant', async () => {
    const res = await fetch(`${BASE_URL}/api/calls/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${aliceToken}`
      },
      body: JSON.stringify({ callId: createdCallId })
    });
    assert(res.status === 200, `Expected status 200, got ${res.status}`);
    const data = await res.json();
    assert(data.success === true, 'Expected success: true');
    assert(data.roomName === createdRoomName, 'Expected matching roomName');
    assert(typeof data.token === 'string', 'Expected token string');
  });

  // 9. Unauthorized user cannot terminate call
  await runTest('9. POST /api/calls/:callId/end: blocks unauthorized third party from ending call', async () => {
    const res = await fetch(`${BASE_URL}/api/calls/${createdCallId}/end`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${charlieToken}`
      }
    });
    assert(res.status === 403, `Expected 403, got ${res.status}`);
  });

  // 10. Participant ends call cleanly
  await runTest('10. POST /api/calls/:callId/end: participant ends call, sets status to ended and calculates duration', async () => {
    const res = await fetch(`${BASE_URL}/api/calls/${createdCallId}/end`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${aliceToken}`
      }
    });
    assert(res.status === 200, `Expected 200, got ${res.status}`);
    const data = await res.json();
    assert(data.success === true, 'Expected success: true');
    assert(data.status === 'ended', 'Expected status ended');
    assert(typeof data.durationSeconds === 'number', 'Expected durationSeconds number');
  });

  // 11. Cannot accept already ended call
  await runTest('11. POST /api/calls/:callId/accept: rejects accept on call that has ended', async () => {
    const res = await fetch(`${BASE_URL}/api/calls/${createdCallId}/accept`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${bobToken}`
      }
    });
    assert(res.status === 400, `Expected 400 Bad Request, got ${res.status}`);
    const data = await res.json();
    assert(data.success === false, 'Expected success: false');
    assert(data.status === 'ended', 'Expected status ended');
  });

  // 12. Non-existent call returns 404
  await runTest('12. GET /api/calls/:callId: returns 404 for unknown callId', async () => {
    const res = await fetch(`${BASE_URL}/api/calls/call_nonexistent_12345`, {
      headers: {
        'Authorization': `Bearer ${aliceToken}`
      }
    });
    assert(res.status === 404, `Expected 404 Not Found, got ${res.status}`);
  });

  console.log('\n======================================================');
  const passedCount = results.filter(r => r.passed).length;
  console.log(`📊 Results: ${passedCount}/${results.length} tests passed`);
  console.log('======================================================\n');

  if (passedCount !== results.length) {
    process.exit(1);
  }
}

runAllTests().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
