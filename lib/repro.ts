export function generateReproScript(events: any[]): string {
    let script = `import { test, expect } from '@playwright/test';\n\n`;
    script += `test('repro friction incident', async ({ page }) => {\n`;

    // Default start - if first event isn't nav, assume home or the first page seen
    if (events.length > 0) {
        script += `  // Initial state\n`;
        // script += `  await page.goto('http://localhost:3000${events[0].page}');\n`; 
    }

    events.forEach(event => {
        const meta = typeof event.meta === 'string' ? JSON.parse(event.meta) : event.meta || {};

        switch (event.type) {
            case 'nav':
                script += `  await page.goto('http://localhost:3000${event.page}');\n`;
                break;

            case 'click':
                if (meta.testId) {
                    script += `  await page.getByTestId('${meta.testId}').click();\n`;
                } else if (meta.id) {
                    script += `  await page.locator('#${meta.id}').click();\n`;
                } else if (meta.text) {
                    script += `  await page.getByText('${meta.text}').click();\n`;
                } else {
                    script += `  // Ambiguous click at (${meta.x}, ${meta.y})\n`;
                    script += `  await page.mouse.click(${meta.x || 0}, ${meta.y || 0});\n`;
                }
                break;

            case 'friction_detected':
                script += `  // FRICTION DETECTED: ${meta.trigger_type}\n`;
                if (meta.trigger_type === 'rage_click') {
                    script += `  // Simulating rage clicks\n`;
                    const selector = meta.selector || 'body';
                    script += `  for (let i = 0; i < 5; i++) {\n`;
                    script += `     await page.locator('${selector}').click({ delay: 50 });\n`;
                    script += `  }\n`;
                }
                break;

            case 'goal_complete':
                script += `  // Goal Complete\n`;
                script += `  expect(await page.content()).toContain('Success');\n`;
                break;
        }
    });

    script += `});`;
    return script;
}
