import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function testRoomManagement() {
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  try {
    console.log('开始测试房间管理功能...');

    // Step 1: Navigate to login page
    console.log('1. 导航到登录页面...');
    await page.goto('http://localhost:5174/login');
    await page.waitForTimeout(2000);

    // Step 2: Login with test user
    console.log('2. 使用测试用户登录...');
    await page.fill('#email', '172296329@qq.com');
    await page.fill('#password', '123456');
    await page.click('button[type="submit"]');
    await page.waitForTimeout(3000);

    // Step 3: Navigate to dashboard
    console.log('3. 导航到仪表板...');
    await page.goto('http://localhost:5174/dashboard');
    await page.waitForTimeout(2000);

    // Step 4: Navigate to room list
    console.log('4. 导航到房间列表...');
    await page.click('button:has-text("查看房间")');
    await page.waitForTimeout(2000);

    // Step 5: Create a room
    console.log('5. 创建房间...');
    await page.click('button:has-text("创建房间")');
    await page.waitForTimeout(1000);

    // Fill in room details
    await page.fill('input#roomName', '测试房间-' + Date.now());
    await page.fill('input#roomPassword', '123456');
    await page.click('button:has-text("创建房间")');
    await page.waitForTimeout(3000);

    // Take screenshot
    await page.screenshot({ path: 'tests/screenshots/room-management-test-create-room.png' });
    console.log('✅ 房间创建成功');

    // Step 6: View room details
    console.log('6. 查看房间详情...');
    const roomCards = await page.locator('.room-card').all();
    if (roomCards.length > 0) {
      await roomCards[0].click();
      await page.waitForTimeout(2000);

      // Take screenshot
      await page.screenshot({ path: 'tests/screenshots/room-management-test-room-detail.png' });
      console.log('✅ 房间详情查看成功');
    } else {
      console.error('❌ 没有找到房间卡片');
    }

    // Step 7: Edit room
    console.log('7. 编辑房间...');
    const editButton = page.locator('button:has-text("编辑房间")');
    if (await editButton.isVisible()) {
      await editButton.click();
      await page.waitForTimeout(1000);

      // Fill in new room details
      await page.fill('input[type="text"]', '编辑后的房间名称');
      await page.click('button:has-text("保存")');
      await page.waitForTimeout(2000);

      // Take screenshot
      await page.screenshot({ path: 'tests/screenshots/room-management-test-edit-room.png' });
      console.log('✅ 房间编辑成功');
    } else {
      console.error('❌ 没有找到编辑按钮');
    }

    // Step 8: Test joining a room
    console.log('8. 测试加入房间...');
    await page.click('button:has-text("关闭")');
    await page.waitForTimeout(2000);

    await page.click('button:has-text("加入房间")');
    await page.waitForTimeout(2000);

    // Fill in room ID (use a random ID that doesn't exist)
    const nonExistentRoomId = '00000000-0000-0000-0000-000000000000';
    console.log('Using non-existent room ID:', nonExistentRoomId);
    await page.fill('input#roomId', nonExistentRoomId);
    
    // Wait a bit before clicking
    await page.waitForTimeout(1000);
    
    await page.click('button:has-text("加入房间")');
    
    // Wait for the response
    await page.waitForTimeout(8000);

    // Take screenshot
    await page.screenshot({ path: 'tests/screenshots/room-management-test-join-room.png' });

    // Check all messages on the page
    const allText = await page.textContent('body');
    console.log('Page text:', allText);
    
    // Check if join failed
    const errorMessage = page.locator('.error-message');
    const errorVisible = await errorMessage.isVisible();
    console.log('Error message visible:', errorVisible);
    
    if (errorVisible) {
      const errorText = await errorMessage.textContent();
      console.log('✅ 加入房间失败（预期行为）:', errorText);
    } else {
      console.error('❌ 加入房间成功（不应该发生）');
      
      // Check if success message is visible
      const successMessage = page.locator('.success-message');
      const successVisible = await successMessage.isVisible();
      console.log('Success message visible:', successVisible);
      if (successVisible) {
        const successText = await successMessage.textContent();
        console.log('Success message:', successText);
      }
    }

    console.log('测试完成！');
  } catch (error) {
    console.error('❌ 测试失败:', error);
    await page.screenshot({ path: 'tests/screenshots/room-management-test-error.png' });
  } finally {
    await browser.close();
  }
}

// Ensure screenshots directory exists
const screenshotsDir = path.join(__dirname, 'tests', 'screenshots');
if (!fs.existsSync(screenshotsDir)) {
  fs.mkdirSync(screenshotsDir, { recursive: true });
}

testRoomManagement();
