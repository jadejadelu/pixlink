import { chromium } from '@playwright/test';

async function testGameShareWithFixedAuthFlow() {
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

    // Refresh the page to trigger the fixed logic
    console.log('Refreshing page to trigger fixed authentication flow...');
    await page.reload();
    await page.waitForTimeout(3000);

    // Navigate to room list first
    console.log('Looking for "查看房间" button on dashboard...');
    const viewRoomsButton = page.locator('button:has-text("查看房间")');
    if (await viewRoomsButton.count() > 0) {
      console.log('Found "查看房间" button, clicking...');
      await viewRoomsButton.click();
      await page.waitForTimeout(3000); // Wait for room list to load
    } else {
      console.log('"查看房间" button not found, looking for alternative navigation...');
      // Alternative: Look for room-related elements on the dashboard
      const roomElements = page.locator('button:has-text("房间管理"), .rooms, button:has-text("房间")');
      if (await roomElements.count() > 0) {
        console.log('Found room-related element, clicking...');
        await roomElements.first().click();
        await page.waitForTimeout(3000);
      } else {
        console.log('No room navigation found on dashboard, exiting test...');
        await page.screenshot({ path: 'no-room-nav-found.png', fullPage: true });
        return;
      }
    }

    // Now we should be on the room list page
    console.log('On room list page, looking for rooms...');
    const roomCard = page.locator('.room-card').first();
    if (await roomCard.count() > 0) {
      console.log('Found a room card, clicking...');
      await roomCard.click();
      await page.waitForTimeout(3000); // Wait for room detail to load
    } else {
      console.log('No rooms found in room list, exiting test...');
      await page.screenshot({ path: 'no-rooms-in-list.png', fullPage: true });
      return;
    }

    // Now we should be on the room detail page
    console.log('On room detail page, checking for tabs...');
    
    // Check if the tab navigation is visible
    const tabNavigation = await page.locator('.tab-navigation').isVisible();
    console.log('Tab navigation visible:', tabNavigation);
    
    if (tabNavigation) {
      // Click on the "游戏共享" tab
      console.log('Looking for game share tab...');
      const gameShareTab = page.locator('button:has-text("游戏共享")');
      if (await gameShareTab.count() > 0) {
        console.log('Found game share tab, clicking...');
        await gameShareTab.click();
        await page.waitForTimeout(2000);
      } else {
        console.log('Game share tab not found!');
        // List all available tabs
        const allTabs = await page.locator('.tab-btn').allInnerTexts();
        console.log('All available tabs:', allTabs);
        await page.screenshot({ path: 'no-game-share-tab-after-fix.png', fullPage: true });
        return;
      }
    } else {
      console.log('Tab navigation not visible on room detail page!');
      // Check if there's a "查看详情" button in room cards
      const viewDetailButtons = await page.locator('button:has-text("查看详情")').count();
      console.log(`Found ${viewDetailButtons} "查看详情" buttons`);
      
      if (viewDetailButtons > 0) {
        // Maybe we're still on the room list page despite clicking
        const viewDetailButton = page.locator('button:has-text("查看详情")').first();
        console.log('Clicking "查看详情" button...');
        await viewDetailButton.click();
        await page.waitForTimeout(3000);
        
        // Try again to find the game share tab
        console.log('After clicking "查看详情", looking for game share tab...');
        const gameShareTab = page.locator('button:has-text("游戏共享")');
        if (await gameShareTab.count() > 0) {
          console.log('Found game share tab, clicking...');
          await gameShareTab.click();
          await page.waitForTimeout(2000);
        } else {
          console.log('Game share tab still not found!');
          const allTabs = await page.locator('.tab-btn').allInnerTexts();
          console.log('All available tabs:', allTabs);
          await page.screenshot({ path: 'no-game-share-tab-after-fix.png', fullPage: true });
          return;
        }
      } else {
        await page.screenshot({ path: 'room-detail-no-tabs.png', fullPage: true });
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
      await page.screenshot({ path: 'game-share-section-after-fix.png', fullPage: true });
      
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
    } else {
      console.log('Game share section not visible');
      await page.screenshot({ path: 'game-share-not-visible-after-fix.png', fullPage: true });
      
      // Check for any elements that might indicate the issue
      const allButtons = await page.locator('button').allInnerTexts();
      console.log('All buttons on page:', allButtons.slice(0, 20)); // First 20 buttons
      
      const allDivClasses = await page.locator('div[class*="tab"]').all();
      console.log('Number of divs with "tab" in class:', allDivClasses.length);
    }

    // Take final screenshot
    await page.screenshot({ path: 'final-test-after-fix.png', fullPage: true });
    console.log('Test completed successfully!');
  } catch (error) {
    console.error('Error during test:', error);
    await page.screenshot({ path: 'error-screenshot-after-fix.png', fullPage: true });
  } finally {
    await browser.close();
  }
}

testGameShareWithFixedAuthFlow().catch(console.error);