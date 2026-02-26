import { chromium } from '@playwright/test';

async function testRefreshBehavior() {
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

    // Check if we're on the identity upload page
    const identityPageVisible = await page.locator('text=上传Identity文件').isVisible() || 
                                await page.locator('text=Upload Identity File').isVisible();
    
    if (identityPageVisible) {
      console.log('Currently on identity upload page. This might be expected for first-time login.');
      
      // Since the user likely has a certificate ID stored, let's simulate refreshing the page
      // to test the fix
      console.log('Refreshing page to test the fix...');
      await page.reload();
      await page.waitForTimeout(3000);
      
      // Check if we're still on the identity page or moved to dashboard
      const stillOnIdentityPage = await page.locator('text=上传Identity文件').isVisible() || 
                                  await page.locator('text=Upload Identity File').isVisible();
      
      if (stillOnIdentityPage) {
        console.log('Still on identity upload page after refresh');
      } else {
        console.log('Successfully navigated away from identity upload page after refresh');
        
        // Look for dashboard elements
        const dashboardElements = await page.locator('text=房间列表|Room List').isVisible() ||
                                 await page.locator('button:has-text("创建房间")').count() > 0 ||
                                 await page.locator('button:has-text("New Room")').count() > 0;
        
        if (dashboardElements) {
          console.log('Successfully on dashboard');
        }
      }
    } else {
      console.log('Not on identity upload page, likely already authenticated');
      
      // Look for dashboard elements
      const dashboardElements = await page.locator('text=房间列表|Room List').isVisible() ||
                               await page.locator('button:has-text("创建房间")').count() > 0 ||
                               await page.locator('button:has-text("New Room")').count() > 0;
      
      if (dashboardElements) {
        console.log('Successfully on dashboard');
      }
    }

    // Take a screenshot of the current state
    await page.screenshot({ path: 'refresh-behavior-test.png', fullPage: true });
    console.log('Test completed. Screenshot saved as refresh-behavior-test.png');
  } catch (error) {
    console.error('Error during test:', error);
    await page.screenshot({ path: 'error-refresh-behavior.png', fullPage: true });
  } finally {
    await browser.close();
  }
}

testRefreshBehavior().catch(console.error);