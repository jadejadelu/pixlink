import { chromium } from 'playwright';

async function testJoinRoom() {
  console.log('Testing room joining functionality...');
  
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
    
    // Step 3: Check current page
    console.log('3. Checking current page...');
    const currentUrl = page.url();
    console.log('Current URL:', currentUrl);
    
    // Step 4: Manually navigate to dashboard
    console.log('4. Navigating to dashboard...');
    await page.goto('http://localhost:5173');
    await page.waitForTimeout(2000);
    
    // Step 5: Check if we're on dashboard
    const dashboardHeader = page.locator('.dashboard-header');
    if (await dashboardHeader.isVisible()) {
      console.log('✅ SUCCESS: On dashboard page');
      
      // Step 6: Navigate to room list
      console.log('5. Navigating to room list...');
      const roomManagementSection = page.locator('.rooms');
      if (await roomManagementSection.isVisible()) {
        console.log('✅ SUCCESS: Room management section found');
        
        const viewRoomsButton = roomManagementSection.locator('button:has-text("查看房间")');
        if (await viewRoomsButton.isVisible()) {
          console.log('✅ SUCCESS: "查看房间" button found');
          await viewRoomsButton.click();
          await page.waitForTimeout(2000);
          
          // Step 7: Check if we're on room list page
          const roomListSection = page.locator('.room-list');
          if (await roomListSection.isVisible()) {
            console.log('✅ SUCCESS: On room list page');
            
            // Step 8: Click join room button
            console.log('6. Clicking join room button...');
            const joinRoomButton = roomListSection.locator('button:has-text("加入房间")');
            if (await joinRoomButton.isVisible()) {
              console.log('✅ SUCCESS: "加入房间" button found');
              await joinRoomButton.click();
              await page.waitForTimeout(2000);
              
              // Step 9: Check if join room form is visible
              const joinRoomForm = page.locator('.join-room');
              if (await joinRoomForm.isVisible()) {
                console.log('✅ SUCCESS: Join room form is visible');
                
                // Step 10: Fill in room ID (use a valid room ID from the first user's list)
                console.log('7. Filling in room ID...');
                // Note: You'll need to replace this with a valid room ID from the first user's list
                // For this test, we'll use a placeholder - you should replace it with an actual room ID
                const testRoomId = 'test-room-id-123'; // Replace with actual room ID
                await page.fill('#roomId', testRoomId);
                
                // Step 11: Click join button
                console.log('8. Clicking join button...');
                await page.click('button:has-text("加入房间")');
                await page.waitForTimeout(3000);
                
                // Step 12: Check if join successful
                console.log('9. Checking if join successful...');
                const successMessage = page.locator('.success-message');
                const errorMessage = page.locator('.error-message');
                
                if (await successMessage.isVisible()) {
                  console.log('✅ SUCCESS: Joined room successfully!');
                  
                  // Step 13: Check room list
                  console.log('10. Checking room list...');
                  await page.waitForTimeout(2000);
                  const rooms = page.locator('.room-card');
                  const roomCount = await rooms.count();
                  console.log('Number of rooms:', roomCount);
                  
                  if (roomCount > 0) {
                    console.log('✅ SUCCESS: Room appears in list!');
                  } else {
                    console.error('❌ ERROR: Room not in list!');
                  }
                  
                } else if (await errorMessage.isVisible()) {
                  const errorText = await errorMessage.textContent();
                  console.error('❌ ERROR:', errorText);
                } else {
                  console.error('❌ ERROR: No response!');
                }
                
              } else {
                console.error('❌ ERROR: Join room form not found');
              }
              
            } else {
              console.error('❌ ERROR: "加入房间" button not found');
            }
            
          } else {
            console.error('❌ ERROR: Not on room list page');
          }
          
        } else {
          console.error('❌ ERROR: "查看房间" button not found');
        }
        
      } else {
        console.error('❌ ERROR: Room management section not found');
      }
      
    } else {
      console.error('❌ ERROR: Not on dashboard page');
    }
    
  } catch (error) {
    console.error('❌ Test failed with error:', error);
  } finally {
    // Take screenshot for debugging
    await page.screenshot({ path: 'tests/screenshots/join-room-test.png' });
    
    // Close browser
    await browser.close();
    console.log('Test completed!');
  }
}

testJoinRoom();
