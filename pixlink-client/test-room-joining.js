import { chromium } from 'playwright';

async function testRoomJoining() {
  console.log('Starting room joining test...');
  
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  try {
    // Test data
    const testUser = {
      email: '172296329@qq.com',
      password: '123456'
    };
    
    // Step 1: Go to login page
    console.log('1. Navigating to login page...');
    await page.goto('http://localhost:5173');
    await page.waitForTimeout(1000);
    
    // Step 2: Login with test user
    console.log('2. Logging in with test user...');
    await page.fill('#email', testUser.email);
    await page.fill('#password', testUser.password);
    await page.click('button[type="submit"]');
    await page.waitForTimeout(3000);
    
    // Step 3: Manually navigate to dashboard
    console.log('3. Navigating to dashboard...');
    await page.goto('http://localhost:5173');
    await page.waitForTimeout(2000);
    
    // Step 4: Navigate to room list
    console.log('4. Navigating to room list...');
    const roomManagementSection = page.locator('.rooms');
    const viewRoomsButton = roomManagementSection.locator('button:has-text("查看房间")');
    await viewRoomsButton.click();
    await page.waitForTimeout(2000);
    
    // Step 5: Check room list
    console.log('5. Checking room list...');
    const roomListSection = page.locator('.room-list');
    if (await roomListSection.isVisible()) {
      console.log('✅ SUCCESS: Room list section is visible');
      
      // Step 6: Check for join room button
      const joinRoomButton = roomListSection.locator('button:has-text("加入房间")');
      if (await joinRoomButton.isVisible()) {
        console.log('✅ SUCCESS: Join room button is visible');
        
        // Step 7: Click join room button
        console.log('6. Clicking join room button...');
        await joinRoomButton.click();
        await page.waitForTimeout(2000);
        
        // Step 8: Check if join room form is visible
        const joinRoomForm = page.locator('.join-room');
        if (await joinRoomForm.isVisible()) {
          console.log('✅ SUCCESS: Join room form is visible');
          
          // Step 9: Fill in room ID (use a valid room ID from your test environment)
          console.log('7. Filling in room ID...');
          // Note: You'll need to replace this with a valid room ID from your test environment
          // For this test, we'll just check if the form is working
          
          // Check if room ID input is visible
          const roomIdInput = joinRoomForm.locator('#roomId');
          if (await roomIdInput.isVisible()) {
            console.log('✅ SUCCESS: Room ID input is visible');
          } else {
            console.error('❌ ERROR: Room ID input not found');
          }
          
          // Check if join button is visible
          const joinButton = joinRoomForm.locator('button:has-text("加入")');
          if (await joinButton.isVisible()) {
            console.log('✅ SUCCESS: Join button is visible');
          } else {
            console.error('❌ ERROR: Join button not found');
          }
          
        } else {
          console.error('❌ ERROR: Join room form not found');
        }
        
      } else {
        console.error('❌ ERROR: Join room button not found');
      }
      
    } else {
      console.error('❌ ERROR: Room list section not found');
    }
    
  } catch (error) {
    console.error('❌ Test failed with error:', error);
  } finally {
    // Take screenshot for debugging
    await page.screenshot({ path: 'tests/screenshots/room-joining-test.png' });
    
    // Close browser
    await browser.close();
    console.log('Test completed!');
  }
}

testRoomJoining();
