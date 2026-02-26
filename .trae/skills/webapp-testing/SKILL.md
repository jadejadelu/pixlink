---
name: "webapp-testing"
description: "Automated web application testing using Playwright. Invoke when user asks to test frontend functionality, UI verification, or perform automated browser testing."
---

# Webapp Testing Skill

This skill provides automated web application testing capabilities using Playwright. It enables functional testing, UI verification, and automated browser testing for local web applications.

## Core Capabilities

1. **Automated Functional Testing**
   - Execute test scenarios with natural language instructions
   - Test user flows like registration, login, room management
   - Validate form submissions and API interactions

2. **Element Reconnaissance**
   - Automatically list all buttons, inputs, and interactive elements
   - Analyze page structure and component hierarchy
   - Identify testable elements on the page

3. **Console Log Capture**
   - Capture browser console logs during testing
   - Identify JavaScript errors and warnings
   - Debug frontend issues through log analysis

4. **Static HTML Testing**
   - Validate page structure and content
   - Check for accessibility issues
   - Verify responsive design elements

5. **Screenshot and Visual Testing**
   - Capture full-page screenshots
   - Compare visual states across different actions
   - Document UI changes and regressions

## When to Use

Invoke this skill when:
- User asks to test frontend functionality
- User requests UI verification or validation
- User wants to perform automated browser testing
- User needs to test user flows (login, registration, room management)
- User wants to capture screenshots or console logs
- User requests regression testing for existing features

## Usage Examples

- "Test the login flow and verify it works correctly"
- "Take a screenshot of the dashboard page"
- "List all buttons and inputs on the registration page"
- "Check for console errors during room creation"
- "Verify that the room list displays correctly"
- "Test the complete user registration and activation flow"

## Setup Requirements

- Playwright must be installed in the project
- The web application should be running on a local server
- Browser drivers should be configured for testing

## Testing Approach

1. **Functional Testing**: Execute user scenarios and validate expected outcomes
2. **UI Verification**: Check visual elements, layout, and responsive behavior
3. **Console Monitoring**: Capture and analyze browser console logs for errors
4. **Element Analysis**: Identify and interact with page elements programmatically
5. **Screenshot Documentation**: Capture visual states for documentation and debugging

## Output Format

Test results include:
- Pass/fail status for each test scenario
- Console log captures with error details
- Screenshots of key page states
- Element lists and their properties
- Recommendations for fixing identified issues

## Best Practices

- Start with element reconnaissance to understand page structure
- Use natural language to describe test scenarios clearly
- Capture console logs to identify hidden errors
- Take screenshots at critical points in the user flow
- Test both happy paths and error scenarios
- Verify responsive behavior across different viewport sizes
