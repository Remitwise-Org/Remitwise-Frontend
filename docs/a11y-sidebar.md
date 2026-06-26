# Navigation Sidebar — Accessibility Documentation

## WCAG 2.1 AA Compliance

| Criterion | Implementation |
|-----------|---------------|
| **1.3.1 Info and Relationships** | `role="navigation"`, `role="menu"`, `role="menuitem"` |
| **2.1.1 Keyboard** | All interactive elements reachable via Tab; Arrow keys for item navigation |
| **2.1.2 No Keyboard Trap** | Focus trap only active when drawer is open; Escape restores focus |
| **2.4.3 Focus Order** | Tab order matches visual order; focus wraps circularly |
| **2.4.6 Headings and Labels** | `aria-label` on navigation, menu, and close button |
| **2.4.7 Focus Visible** | `focus:ring-2` with accent color on all focusable elements |
| **4.1.2 Name, Role, Value** | `aria-expanded`, `aria-current="page"`, `aria-modal` |

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `Tab` | Move to next focusable element |
| `Shift + Tab` | Move to previous focusable element |
| `ArrowDown` | Next menu item |
| `ArrowUp` | Previous menu item |
| `Home` | First menu item |
| `End` | Last menu item |
| `Escape` | Close drawer, return focus to trigger |

## Focus Management

1. **Opening**: Focus moves to first menu item
2. **Inside**: Focus is trapped within the drawer
3. **Closing**: Focus returns to the element that opened the drawer
4. **Closed**: All menu items have `tabIndex="-1"` (unfocusable)

## Screen Reader Testing

### VoiceOver (macOS)
1. `Cmd + F5` to enable
2. `Ctrl + Option + U` to open rotor
3. Navigate to "Form Controls" or "Landmarks"
4. Verify "Main navigation" landmark is present

### NVDA (Windows)
1. `Insert + F7` for elements list
2. Verify "Navigation" region appears
3. Arrow keys navigate menu items correctly

### TalkBack (Android)
1. Swipe right to navigate focus
2. Double-tap to activate
3. Draw "L" gesture for continuous reading

## Axe Testing

```bash
npm run test:e2e -- tests/e2e/navigation-a11y.spec.ts