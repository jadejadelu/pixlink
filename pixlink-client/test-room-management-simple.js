import { chromium } from 'playwright';

async function testRoomManagement() {
  console.log('Starting simple room management test...');
  
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
    
    // Step 3: Check current page
    console.log('3. Checking current page...');
    const currentUrl = page.url();
    console.log('Current URL:', currentUrl);
    
    const h1Text = await page.locator('h1').textContent();
    console.log('Page H1:', h1Text);
    
    const h2Text = await page.locator('h2').textContent();
    console.log('Page H2:', h2Text);
    
    // Step 4: Check if we're on identity upload page
    const isIdentityPage = await page.locator('.identity-container').isVisible();
    const isPermitPage = await page.locator('.permit-container').isVisible();
    const isDashboardPage = await page.locator('.dashboard-container').isVisible();
    
    console.log('Is on identity page:', isIdentityPage);
    console.log('Is on permit page:', isPermitPage);
    console.log('Is on dashboard page:', isDashboardPage);
    
    // Step 5: Check if auth token is stored
    const authToken = await page.evaluate(() => {
      return localStorage.getItem('auth_token');
    });
    console.log('Auth token stored:', authToken ? 'Yes' : 'No');
    
    // Step 6: If we have auth token, manually navigate to dashboard
    if (authToken) {
      console.log('4. Auth token found, manually navigating to dashboard...');
      await page.goto('http://localhost:5173');
      await page.waitForTimeout(2000);
      
      // Check if we're now on dashboard
      const newIsDashboardPage = await page.locator('.dashboard-container').isVisible();
      console.log('Now on dashboard page:', newIsDashboardPage);
      
      if (newIsDashboardPage) {
        console.log('✅ SUCCESS: On dashboard page');
        
        // Step 7: Look for room management section
        console.log('5. Looking for room management section...');
        const roomManagementSection = page.locator('.rooms');
        if (await roomManagementSection.isVisible()) {
          console.log('✅ SUCCESS: Room management section found');
          
          // Step 8: Look for "查看房间" button
          const viewRoomsButton = roomManagementSection.locator('button:has-text("查看房间")');
          if (await viewRoomsButton.isVisible()) {
            console.log('✅ SUCCESS: "查看房间" button found');
            
            // Step 9: Click the button
            console.log('6. Clicking "查看房间" button...');
            await viewRoomsButton.click();
            await page.waitForTimeout(2000);
            
            // Step 10: Check if we're still authenticated
            const newH1Text = await page.locator('h1').textContent();
            console.log('Page H1 after navigation:', newH1Text);
            
            if (newH1Text?.includes('登录')) {
              console.error('❌ ERROR: Redirected to login page when accessing room list');
            } else {
              console.log('✅ SUCCESS: Stayed on authenticated page');
            }
            
            // Step 11: Check room list
            console.log('7. Checking room list...');
            const roomListSection = page.locator('.room-list');
            if (await roomListSection.isVisible()) {
              console.log('✅ SUCCESS: Room list section is visible');
              
              // Step 12: Check for create and join buttons
              const createRoomButton = roomListSection.locator('button:has-text("创建房间")');
              const joinRoomButton = roomListSection.locator('button:has-text("加入房间")');
              
              if (await createRoomButton.isVisible()) {
                console.log('✅ SUCCESS: Create room button is visible');
              } else {
                console.error('❌ ERROR: Create room button not found');
              }
              
              if (await joinRoomButton.isVisible()) {
                console.log('✅ SUCCESS: Join room button is visible');
              } else {
                console.error('❌ ERROR: Join room button not found');
              }
              
              // Step 13: Create a test room
              console.log('8. Creating a test room...');
              if (await createRoomButton.isVisible()) {
                await createRoomButton.click();
                await page.waitForTimeout(2000);
                
                // Fill in room details
              await page.fill('#roomName', 'Test Room ' + Date.now());
              await page.selectOption('#roomVisibility', 'PUBLIC');
              
              // Submit form
              await page.click('button:has-text("创建房间")');
                await page.waitForTimeout(3000);
                
                // Check if room created successfully
                const successMessage = page.locator('.success-message');
                if (await successMessage.isVisible()) {
                  console.log('✅ SUCCESS: Room created successfully');
                } else {
                  console.error('❌ ERROR: Room creation failed');
                }
                
                // Step 14: Check if room appears in list
                console.log('9. Checking if room appears in list...');
                const rooms = page.locator('.room-card');
                const roomCount = await rooms.count();
                console.log('Number of rooms in list:', roomCount);
                
                if (roomCount > 0) {
                  console.log('✅ SUCCESS: Room list is not empty');
                } else {
                  console.error('❌ ERROR: Room list is empty');
                }
              }
              
            } else {
              console.error('❌ ERROR: Room list section not found');
            }
            
          } else {
            console.error('❌ ERROR: "查看房间" button not found');
          }
          
        } else {
          console.error('❌ ERROR: Room management section not found');
        }
        
      } else {
        console.error('❌ ERROR: Could not navigate to dashboard');
      }
      
    } else {
      console.error('❌ ERROR: No auth token found');
    }
    
  } catch (error) {
    console.error('❌ Test failed with error:', error);
  } finally {
    // Take screenshot for debugging
    await page.screenshot({ path: 'tests/screenshots/room-management-test-simple.png' });
    
    // Close browser
    await browser.close();
    console.log('Test completed!');
  }
}

testRoomManagement();
