import { chromium } from 'playwright';

async function testJoinRoomSimple() {
  console.log('Testing room joining with simple approach...');
  
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();
  
  try {
    // Test data for existing user
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
    await page.click('button:has-text("查看房间")');
    await page.waitForTimeout(2000);
    
    // Step 5: Click join room button
    console.log('5. Clicking join room button...');
    await page.click('button:has-text("加入房间")');
    await page.waitForTimeout(2000);
    
    // Step 6: Fill in random room ID
    console.log('6. Filling in random room ID...');
    const randomRoomId = 'random-room-id-' + Date.now();
    console.log('Using random room ID:', randomRoomId);
    
    // Use more specific selector for room ID input
    const roomIdInput = page.locator('.join-room input#roomId');
    if (await roomIdInput.isVisible()) {
      console.log('✅ SUCCESS: Found room ID input');
      await roomIdInput.fill(randomRoomId);
      // Verify the input was filled correctly
      const filledValue = await roomIdInput.inputValue();
      console.log('✅ SUCCESS: Room ID input filled with:', filledValue);
    } else {
      console.error('❌ ERROR: Could not find room ID input');
      return;
    }
    
    // Step 7: Click join button
    console.log('7. Clicking join button...');
    
    // Use more specific selector for join button
    const joinButton = page.locator('.join-room button:has-text("加入房间")');
    if (await joinButton.isVisible()) {
      console.log('✅ SUCCESS: Found join button');
      
      // Check if the button is disabled
      const isDisabled = await joinButton.isDisabled();
      console.log('Join button disabled:', isDisabled);
      
      await joinButton.click();
      console.log('✅ SUCCESS: Clicked join button');
      
      // Wait a bit for the button to change state
      await page.waitForTimeout(1000);
      
      // Check if the button is now disabled (loading state)
      const isDisabledAfterClick = await joinButton.isDisabled();
      console.log('Join button disabled after click:', isDisabledAfterClick);
    } else {
      console.error('❌ ERROR: Could not find join button');
      return;
    }
    
    await page.waitForTimeout(5000);
    
    // Step 8: Check if join failed
    console.log('8. Checking if join failed...');
    
    // Take screenshot for debugging
    await page.screenshot({ path: 'tests/screenshots/join-room-after-click.png' });
    
    // Wait for either error or success message to appear
    try {
      await page.waitForFunction(() => {
        return document.querySelector('.error-message') || document.querySelector('.success-message');
      }, { timeout: 10000 });
    } catch (error) {
      console.error('❌ ERROR: Timeout waiting for message to appear');
      // Take screenshot for debugging
      await page.screenshot({ path: 'tests/screenshots/join-room-timeout.png' });
      
      // Check if the join button is still disabled (loading)
      const joinButton = page.locator('.join-room button:has-text("加入房间")');
      if (await joinButton.isDisabled()) {
        console.error('❌ ERROR: Join button is still disabled, indicating loading state');
      }
      
      // Check if the form is still visible
      const joinRoomForm = page.locator('.join-room');
      if (await joinRoomForm.isVisible()) {
        console.log('✅ Join room form is still visible');
      } else {
        console.error('❌ ERROR: Join room form is not visible');
      }
      
      return;
    }
    
    // Check for error message
    const errorMessage = page.locator('.join-room .error-message');
    if (await errorMessage.isVisible()) {
      const errorText = await errorMessage.textContent();
      console.log('✅ SUCCESS: Got expected error:', errorText);
      // Take screenshot for debugging
      await page.screenshot({ path: 'tests/screenshots/join-room-error-visible.png' });
    } else {
      // Check for success message
      const successMessage = page.locator('.join-room .success-message');
      if (await successMessage.isVisible()) {
        const successText = await successMessage.textContent();
        console.error('❌ ERROR: Joined room successfully with random ID - this should not happen!');
        console.error('Success message:', successText);
        // Take screenshot for debugging
        await page.screenshot({ path: 'tests/screenshots/join-room-success-bug.png' });
        
        // Check browser console logs for more information
        const consoleLogs = [];
        page.on('console', msg => {
          consoleLogs.push(msg.text());
        });
        console.log('Browser console logs:', consoleLogs);
      } else {
        console.error('❌ ERROR: No response!');
        // Take screenshot for debugging
        await page.screenshot({ path: 'tests/screenshots/join-room-no-response.png' });
      }
    }
    
  } catch (error) {
    console.error('❌ Test failed with error:', error);
    // Take screenshot for debugging
    await page.screenshot({ path: 'tests/screenshots/join-room-error.png' });
  } finally {
    // Close browser
    await browser.close();
    console.log('Test completed!');
  }
}

testJoinRoomSimple();
