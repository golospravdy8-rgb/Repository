// Test script to verify session time tracking

async function testSessionTracking() {
  console.log('🧪 Testing session time tracking...\n');

  const testPhone = `test_${Date.now()}`;
  const testUser = {
    phone: testPhone,
    firstName: 'Test',
    lastName: 'User',
  };

  try {
    // Step 1: Register user
    console.log('1️⃣  Registering user...');
    const regRes = await fetch('http://localhost:3006/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'register', ...testUser }),
    });
    const regData = await regRes.json();
    console.log(`   ✅ Registered: ${testUser.firstName} ${testUser.lastName}`);

    // Step 2: Send heartbeat (join)
    console.log('2️⃣  Sending heartbeat (joining chat)...');
    const hbRes = await fetch('http://localhost:3006/api/chat/heartbeat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        phone: testPhone,
        name: `${testUser.firstName} ${testUser.lastName}`,
        role: 'guest',
        room: 'general',
      }),
    });
    console.log(`   ✅ Heartbeat sent`);

    // Step 3: Check participants list
    console.log('3️⃣  Checking participants list...');
    const pRes = await fetch('http://localhost:3006/api/chat/participants');
    const pData = await pRes.json();
    const testMember = pData.members?.find((m) => m.phone === testPhone);

    if (testMember) {
      console.log(`   ✅ Found user in participants`);
      console.log(`   joinedAt: ${testMember.joinedAt}`);
      console.log(`   leftAt: ${testMember.leftAt}`);
      console.log(`   isOnline: ${testMember.isOnline}`);

      if (testMember.joinedAt && !testMember.leftAt && testMember.isOnline) {
        console.log(`\n✅ SUCCESS: Session times are being tracked correctly!`);
      } else {
        console.log(`\n⚠️  WARNING: Some fields missing or incorrect`);
      }
    } else {
      console.log(`   ❌ User not found in participants`);
    }

    // Step 4: Send logout signal
    console.log('\n4️⃣  Sending logout signal...');
    const loRes = await fetch('http://localhost:3006/api/chat/logout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone: testPhone }),
    });
    console.log(`   ✅ Logout sent`);

    // Step 5: Check participants again
    console.log('5️⃣  Checking participants list after logout...');
    const p2Res = await fetch('http://localhost:3006/api/chat/participants');
    const p2Data = await p2Res.json();
    const testMember2 = p2Data.members?.find((m) => m.phone === testPhone);

    if (testMember2) {
      console.log(`   ✅ Found user in participants`);
      console.log(`   joinedAt: ${testMember2.joinedAt}`);
      console.log(`   leftAt: ${testMember2.leftAt}`);
      console.log(`   isOnline: ${testMember2.isOnline}`);

      if (testMember2.leftAt && !testMember2.isOnline) {
        console.log(`\n✅ SUCCESS: Logout is being tracked correctly!`);
      } else {
        console.log(`\n⚠️  WARNING: Logout may not be tracked properly`);
      }
    }

  } catch (err) {
    console.error('❌ Test failed:', err.message);
  }
}

testSessionTracking();
