import { chromium } from '@playwright/test';

async function testGameShareWithExistingAccount() {
  // Launch the browser
  const browser = await chromium.launch({ headless: false }); // Set to true if you don't want to see the browser UI
  const page = await browser.newPage();

  try {
    // Navigate to the application
    await page.goto('http://localhost:5173');

    // Wait for the page to load
    await page.waitForTimeout(2000);

    // Look for login button and click it
    const loginButton = await page.locator('button:has-text("登录")');
    if (await loginButton.count() > 0) {
      console.log('Found login button, clicking...');
      await loginButton.click();
    }

    // Fill login form with provided credentials
    await page.fill('input[type="email"], input[type="text"]', '172296329@qq.com');
    await page.fill('input[type="password"]', '123456');
    
    // Submit login form
    await page.locator('button:has-text("登录"), button:has-text("Login"), button[type="submit"]').click();
    await page.waitForTimeout(3000); // Wait for login to process

    // Look for any room in the list and click it
    const roomButton = await page.locator('button:has-text("test"), button:has-text("Test Room"), button:has-text("房间"), .room-item, .room-card').first();
    if (await roomButton.count() > 0) {
      console.log('Found a room, clicking...');
      await roomButton.click();
      await page.waitForTimeout(2000);
    } else {
      console.log('No rooms found, trying to create a room...');
      // Try to create a room if none exist
      const createRoomButton = await page.locator('button:has-text("创建房间"), button:has-text("New Room")');
      if (await createRoomButton.count() > 0) {
        await createRoomButton.click();
        await page.waitForTimeout(1000);
        
        // Fill room name
        await page.fill('input[placeholder*="房间名"], input[placeholder*="name"]', 'Test Room');
        
        // Submit room creation
        await page.locator('button:has-text("创建"), button:has-text("Submit")').click();
        await page.waitForTimeout(2000);
        
        // Click on the newly created room
        const newRoomButton = await page.locator('button:has-text("Test Room")').first();
        if (await newRoomButton.count() > 0) {
          await newRoomButton.click();
          await page.waitForTimeout(2000);
        }
      }
    }

    // Look for the game share tab or section
    const gameShareTab = await page.locator('button:has-text("游戏共享"), button:has-text("Game Share"), .game-share-tab');
    if (await gameShareTab.count() > 0) {
      console.log('Found game share tab, clicking...');
      await gameShareTab.first().click();
      await page.waitForTimeout(2000);
    }

    // Look for game share elements
    const gameShareListVisible = await page.locator('.game-share-list').isVisible();
    console.log('Game share list visible:', gameShareListVisible);

    if (gameShareListVisible) {
      // Look for pause/resume/delete buttons
      const pauseButtons = await page.locator('button:has-text("暂停分享")').count();
      const resumeButtons = await page.locator('button:has-text("继续分享")').count();
      const deleteButtons = await page.locator('button:has-text("删除")').count();
      console.log(`Found ${pauseButtons} pause buttons, ${resumeButtons} resume buttons, ${deleteButtons} delete buttons`);

      // Look for status badges
      const statusBadges = await page.locator('.status-badge').count();
      console.log(`Found ${statusBadges} status badges`);

      if (statusBadges > 0) {
        const badgeTexts = await page.locator('.status-badge').allInnerTexts();
        console.log('Status badge texts:', badgeTexts);
      }

      // Look for join buttons
      const joinButtons = await page.locator('button:has-text("加入游戏")').count();
      console.log(`Found ${joinButtons} join buttons`);
    }

    // Take a screenshot of the current state
    await page.screenshot({ path: 'game-share-existing-account-test.png', fullPage: true });

    console.log('Test completed. Screenshot saved as game-share-existing-account-test.png');
  } catch (error) {
    console.error('Error during test:', error);
    await page.screenshot({ path: 'error-screenshot-existing-account.png', fullPage: true });
  } finally {
    await browser.close();
  }
}

testGameShareWithExistingAccount().catch(console.error);