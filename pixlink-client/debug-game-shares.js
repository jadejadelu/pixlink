import { chromium } from '@playwright/test';

async function debugGameShares() {
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

    // Get current user info from localStorage
    const userInfo = await page.evaluate(() => {
      return JSON.parse(localStorage.getItem('pixlink_user') || '{}');
    });
    console.log('Current user info:', userInfo);

    // Navigate to room list first
    console.log('Looking for "查看房间" button on dashboard...');
    const viewRoomsButton = page.locator('button:has-text("查看房间")');
    if (await viewRoomsButton.count() > 0) {
      console.log('Found "查看房间" button, clicking...');
      await viewRoomsButton.click();
      await page.waitForTimeout(3000); // Wait for room list to load
    } else {
      console.log('"查看房间" button not found, looking for alternative navigation...');
      return;
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
      return;
    }

    // Now we should be on the room detail page
    console.log('On room detail page, checking for tabs...');
    
    // Click on the "游戏共享" tab
    console.log('Looking for game share tab...');
    const gameShareTab = page.locator('button:has-text("游戏共享")');
    if (await gameShareTab.count() > 0) {
      console.log('Found game share tab, clicking...');
      await gameShareTab.click();
      await page.waitForTimeout(2000);
    } else {
      console.log('Game share tab not found!');
      return;
    }

    // Get all game shares data
    const gameSharesData = await page.evaluate(() => {
      // Find the Vue component instance that holds the game shares data
      // We'll look for the game share items and extract their data
      const gameShareItems = Array.from(document.querySelectorAll('.game-share-item'));
      return gameShareItems.map(item => {
        const titleElement = item.querySelector('h4');
        const title = titleElement ? titleElement.textContent.trim() : '';
        const tagElements = item.querySelectorAll('.tag');
        const tags = Array.from(tagElements).map(tag => tag.textContent.trim());
        
        // Check if this item has creator actions (pause/resume/delete buttons)
        const hasCreatorActions = item.querySelector('.creator-actions') !== null;
        const hasDeleteButton = item.querySelector('.btn-delete') !== null;
        const isCurrentUserCreator = hasCreatorActions; // If creator actions exist, this user is the creator
        
        return {
          title,
          tags,
          hasCreatorActions,
          hasDeleteButton,
          isCurrentUserCreator
        };
      });
    });
    
    console.log('Game shares data:', gameSharesData);
    
    // Count how many shares belong to current user
    const userSharesCount = gameSharesData.filter(share => share.isCurrentUserCreator).length;
    console.log(`Current user is creator of ${userSharesCount} game shares out of ${gameSharesData.length} total`);
    
    // Take screenshot of the game share section
    await page.screenshot({ path: 'debug-game-shares.png', fullPage: true });
    console.log('Debug screenshot saved as debug-game-shares.png');
    
  } catch (error) {
    console.error('Error during debug:', error);
    await page.screenshot({ path: 'debug-error-screenshot.png', fullPage: true });
  } finally {
    await browser.close();
  }
}

debugGameShares().catch(console.error);