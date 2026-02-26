import { test, expect } from '@playwright/test';

test.describe('Basic Page Navigation', () => {
  test('should display login page', async ({ page }) => {
    await page.goto('/');
    
    // Check if login page is displayed
    await expect(page.locator('h1')).toContainText('PixLink');
    await expect(page.locator('h2')).toContainText('登录');
    
    // Take screenshot
    await page.screenshot({ path: 'tests/screenshots/basic-login-page.png' });
    
    // List all buttons on the page
    const buttons = await page.locator('button').all();
    console.log('Buttons found:', buttons.length);
    for (let i = 0; i < buttons.length; i++) {
      const buttonText = await buttons[i].textContent();
      console.log(`Button ${i + 1}:`, buttonText);
    }
  });

  test('should navigate to register page', async ({ page }) => {
    await page.goto('/');
    
    // Click on register link
    await page.click('a:has-text("立即注册")');
    await page.waitForTimeout(1000);
    
    // Check if register page is displayed
    await expect(page.locator('h2')).toContainText('注册');
    
    // Take screenshot
    await page.screenshot({ path: 'tests/screenshots/basic-register-page.png' });
    
    // List all form inputs
    const inputs = await page.locator('input').all();
    console.log('Inputs found:', inputs.length);
    for (let i = 0; i < inputs.length; i++) {
      const inputType = await inputs[i].getAttribute('type');
      const inputName = await inputs[i].getAttribute('name');
      const inputPlaceholder = await inputs[i].getAttribute('placeholder');
      console.log(`Input ${i + 1}:`, { type: inputType, name: inputName, placeholder: inputPlaceholder });
    }
  });
});

test.describe('Authentication Flow', () => {
  test('should check if user exists in database', async ({ page, request }) => {
    // Try to login with a test user
    const response = await request.post('http://localhost:3000/api/auth/login', {
      data: {
        email: 'test@example.com',
        password: 'test123456',
        deviceId: 'test_device_123'
      }
    });
    
    console.log('Login response status:', response.status());
    const responseBody = await response.json();
    console.log('Login response body:', JSON.stringify(responseBody, null, 2));
    
    // Take screenshot of current page
    await page.goto('/');
    await page.screenshot({ path: 'tests/screenshots/api-test-result.png' });
  });

  test('should register a new user', async ({ page, request }) => {
    const testEmail = `test${Date.now()}@example.com`;
    
    // Register a new user
    const response = await request.post('http://localhost:3000/api/auth/register', {
      data: {
        email: testEmail,
        nickname: 'Test User',
        password: 'test123456'
      }
    });
    
    console.log('Register response status:', response.status());
    const responseBody = await response.json();
    console.log('Register response body:', JSON.stringify(responseBody, null, 2));
    
    // Take screenshot
    await page.screenshot({ path: 'tests/screenshots/api-register-result.png' });
  });
});

test.describe('Dashboard Access', () => {
  test('should manually set auth token and access dashboard', async ({ page }) => {
    // Set auth token in localStorage
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.setItem('auth_token', 'test_token_for_testing');
      localStorage.setItem('user', JSON.stringify({
        id: 'test_user_id',
        email: 'test@example.com',
        nickname: 'Test User',
        status: 'ACTIVE'
      }));
    });
    
    // Reload page
    await page.reload();
    await page.waitForTimeout(2000);
    
    // Check current page
    const h1Text = await page.locator('h1').textContent();
    console.log('Page H1 text:', h1Text);
    
    // Take screenshot
    await page.screenshot({ path: 'tests/screenshots/manual-auth-dashboard.png' });
    
    // List all buttons
    const buttons = await page.locator('button').all();
    console.log('Buttons found:', buttons.length);
    for (let i = 0; i < buttons.length; i++) {
      const buttonText = await buttons[i].textContent();
      console.log(`Button ${i + 1}:`, buttonText);
    }
  });
});

test.describe('Console Error Detection', () => {
  test('should capture console errors on login page', async ({ page }) => {
    const consoleErrors: string[] = [];
    const consoleWarnings: string[] = [];
    
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      } else if (msg.type() === 'warning') {
        consoleWarnings.push(msg.text());
      }
    });
    
    // Navigate to login page
    await page.goto('/');
    await page.waitForTimeout(2000);
    
    // Check for console errors
    console.log('Console errors:', consoleErrors);
    console.log('Console warnings:', consoleWarnings);
    
    // Take screenshot
    await page.screenshot({ path: 'tests/screenshots/console-errors-login.png' });
    
    if (consoleErrors.length > 0) {
      console.error('Found console errors:', consoleErrors);
    }
  });
});
