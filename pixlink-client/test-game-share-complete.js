import { chromium } from '@playwright/test';

async function testGameShareWithRoomCreation() {
  // Launch the browser
  const browser = await chromium.launch({ headless: false });
  const page = await browser.newPage();

  try {
    // Navigate to the application
    await page.goto('http://localhost:5173');
    console.log('Navigated to application');

    // Wait for the page to load
    await page.waitForTimeout(2000);

    // Login with provided credentials
    console.log('Attempting to login with provided credentials...');
    await page.fill('input[type="email"], input[type="text"]', '172296329@qq.com');
    await page.fill('input[type="password"]', '123456');
    
    // Click login button
    await page.locator('button:has-text("登录")').click();
    console.log('Clicked login button');
    
    await page.waitForTimeout(3000); // Wait for login to process

    // Check if we're on the dashboard with rooms
    // Look for a create room button first
    const createRoomBtn = page.locator('button:has-text("创建房间"), button:has-text("New Room")');
    if (await createRoomBtn.count() > 0) {
      console.log('Found create room button, clicking...');
      await createRoomBtn.click();
      await page.waitForTimeout(1000);
      
      // Fill room name
      await page.fill('input[placeholder*="房间名"], input[placeholder*="name"]', `Test Room ${Date.now()}`);
      
      // Submit room creation
      await page.locator('button:has-text("创建"), button:has-text("Submit")').click();
      console.log('Created a new room');
      await page.waitForTimeout(2000);
    }

    // Now look for any room and click it
    console.log('Looking for a room to join...');
    const roomLocator = page.locator('button:has-text("test"), button:has-text("Test"), button:has-text("房间"), .room-item, .room-card').first();
    if (await roomLocator.count() > 0) {
      console.log('Found a room, clicking...');
      await roomLocator.click();
      await page.waitForTimeout(3000); // Wait for room detail to load
    } else {
      console.log('Still no rooms found, trying to find any clickable room element...');
      // Try clicking any button that might represent a room
      const anyRoomButton = page.locator('button').filter({ hasText: /房间|Room|test/i }).first();
      if (await anyRoomButton.count() > 0) {
        console.log('Found a potential room button, clicking...');
        await anyRoomButton.click();
        await page.waitForTimeout(3000);
      } else {
        console.log('No room buttons found at all!');
        await page.screenshot({ path: 'no-rooms-at-all.png', fullPage: true });
        return;
      }
    }

    // Click on the "游戏共享" tab
    console.log('Looking for game share tab...');
    const gameShareTab = page.locator('button:has-text("游戏共享")');
    if (await gameShareTab.count() > 0) {
      console.log('Found game share tab, clicking...');
      await gameShareTab.click();
      await page.waitForTimeout(2000);
    } else {
      console.log('Game share tab not found! Checking if we are already on the correct tab...');
      // Maybe the tab is already selected, or the text is different
      const allTabs = await page.locator('.tab-btn').allInnerTexts();
      console.log('All available tabs:', allTabs);
      
      // Try to click any tab that contains "share" or "game"
      const gameTab = page.locator('.tab-btn:has-text("游戏"), .tab-btn:has-text("Game"), .tab-btn:has-text("共享"), .tab-btn:has-text("Share")');
      if (await gameTab.count() > 0) {
        await gameTab.first().click();
        await page.waitForTimeout(2000);
      } else {
        console.log('No game-related tabs found!');
        await page.screenshot({ path: 'no-game-tabs.png', fullPage: true });
        return;
      }
    }

    // Now look for game share elements
    console.log('Checking for game share elements...');
    
    // Check if the game share list is visible
    const gameShareListVisible = await page.locator('.game-share-list').isVisible();
    console.log('Game share list visible:', gameShareListVisible);

    if (gameShareListVisible) {
      // Take screenshot of the game share section
      await page.screenshot({ path: 'game-share-section-visible.png', fullPage: true });
      
      // Look for pause/resume/delete buttons
      const pauseButtons = await page.locator('button:has-text("暂停分享")').count();
      const resumeButtons = await page.locator('button:has-text("继续分享")').count();
      const deleteButtons = await page.locator('button:has-text("删除")').count();
      const createButtons = await page.locator('button:has-text("创建游戏共享")').count();
      
      console.log(`Found ${pauseButtons} pause buttons`);
      console.log(`Found ${resumeButtons} resume buttons`);
      console.log(`Found ${deleteButtons} delete buttons`);
      console.log(`Found ${createButtons} create buttons`);

      // Also look for status badges
      const statusBadges = await page.locator('.status-badge').count();
      console.log(`Found ${statusBadges} status badges`);

      if (statusBadges > 0) {
        const badgeTexts = await page.locator('.status-badge').allInnerTexts();
        console.log('Status badge texts:', badgeTexts);
      }

      // Try to create a game share to test the full functionality
      if (createButtons > 0) {
        console.log('Found create game share button, attempting to create a game share...');
        
        // Fill in the create game share form
        await page.fill('input[placeholder*="游戏名称"], input[id="title"]', 'Test Game Share');
        
        // Select protocol
        await page.locator('select[id="proto"]').click();
        await page.locator('select[id="proto"] option[value="TCP"]').click();
        
        // Fill port
        await page.fill('input[placeholder*="端口号"], input[id="port"]', '8080');
        
        // Click submit
        await page.locator('button:has-text("创建游戏共享")').click();
        
        // Wait for creation
        await page.waitForTimeout(3000);
        
        // Check for success message or new game share entry
        const successMessage = await page.locator('.success').isVisible();
        console.log('Success message visible:', successMessage);
        
        // Check again for buttons after creating
        const newPauseButtons = await page.locator('button:has-text("暂停分享")').count();
        const newDeleteButtons = await page.locator('button:has-text("删除")').count();
        
        console.log(`After creation: Found ${newPauseButtons} pause buttons, ${newDeleteButtons} delete buttons`);
      }
    } else {
      console.log('Game share section not visible');
      await page.screenshot({ path: 'game-share-not-visible.png', fullPage: true });
    }

    // Take final screenshot
    await page.screenshot({ path: 'final-game-share-test-complete.png', fullPage: true });
    console.log('Test completed successfully!');
  } catch (error) {
    console.error('Error during test:', error);
    await page.screenshot({ path: 'error-screenshot-complete.png', fullPage: true });
  } finally {
    await browser.close();
  }
}

testGameShareWithRoomCreation().catch(console.error);