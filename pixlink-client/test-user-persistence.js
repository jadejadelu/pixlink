import { chromium } from '@playwright/test';

async function testUserPersistence() {
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

    // Check user info immediately after login
    const userInfoDirect = await page.evaluate(() => {
      const user = window.store?.getUser();
      return user ? { id: user.id, email: user.email, nickname: user.nickname } : null;
    });
    console.log('User info immediately after login:', userInfoDirect);

    // Check localStorage directly
    const localStorageUser = await page.evaluate(() => {
      return localStorage.getItem('pixlink_user');
    });
    console.log('User in localStorage:', localStorageUser);

    // Refresh the page
    console.log('Refreshing page...');
    await page.reload();
    await page.waitForTimeout(3000);

    // Check user info after refresh
    const userInfoAfterRefresh = await page.evaluate(() => {
      const user = window.store?.getUser();
      return user ? { id: user.id, email: user.email, nickname: user.nickname } : null;
    });
    console.log('User info after refresh:', userInfoAfterRefresh);

    // Check localStorage after refresh
    const localStorageUserAfterRefresh = await page.evaluate(() => {
      return localStorage.getItem('pixlink_user');
    });
    console.log('User in localStorage after refresh:', localStorageUserAfterRefresh);

    // Navigate to room list
    console.log('Navigating to room list...');
    const viewRoomsButton = page.locator('button:has-text("查看房间")');
    if (await viewRoomsButton.count() > 0) {
      console.log('Found "查看房间" button, clicking...');
      await viewRoomsButton.click();
      await page.waitForTimeout(3000);
    }

    // Navigate to a room
    const roomCard = page.locator('.room-card').first();
    if (await roomCard.count() > 0) {
      console.log('Found a room card, clicking...');
      await roomCard.click();
      await page.waitForTimeout(3000);
    }

    // Go to game shares tab
    const gameShareTab = page.locator('button:has-text("游戏共享")');
    if (await gameShareTab.count() > 0) {
      console.log('Found game share tab, clicking...');
      await gameShareTab.click();
      await page.waitForTimeout(2000);
    }

    // Check if we can identify the current user as game share creator now
    const hasCreatorActions = await page.evaluate(() => {
      return document.querySelector('.creator-actions') !== null;
    });
    console.log('Has creator actions (pause/resume/delete buttons):', hasCreatorActions);

    await page.screenshot({ path: 'user-persistence-test.png', fullPage: true });
    console.log('Screenshot saved as user-persistence-test.png');

  } catch (error) {
    console.error('Error during test:', error);
    await page.screenshot({ path: 'user-persistence-error.png', fullPage: true });
  } finally {
    await browser.close();
  }
}

testUserPersistence().catch(console.error);