# AI UI Generator

High-end dark theme UI generator with three-page flow:
- Landing page
- Login page
- Dashboard (generator workspace)

## Login Flow

- You can always reach the login page from landing.
- You can always continue from login to dashboard:
  - `Sign In` (normal form submit)
  - `Continue to Dashboard` (fast-track/demo)

No hard auth backend is required for this prototype flow.

## Project Structure

- `index.html`: UI layout with locally built Tailwind CSS
- `src/app.ts`: application orchestration and event wiring
- `src/types.ts`: shared types
- `src/config/constants.ts`: central constants
- `src/services/auth.service.ts`: login resolution and guest session logic
- `src/services/generator.service.ts`: prompt validation and preview generation
- `src/services/storage.service.ts`: localStorage persistence
- `src/ui/chat.ts`: chat bubble rendering
- `src/ui/view.ts`: landing/login/dashboard view switching
- `src/utils/dom.ts`: DOM helper utilities
- `src/utils/helpers.ts`: formatting/time/download helpers
- `tailwind.config.js`: Tailwind theme extension config
- `src/styles/tailwind.css`: Tailwind input stylesheet

## Development

1. Install dependencies
   - `npm install`
2. Build (typecheck + bundle + Tailwind CSS build)
   - `npm run build`
3. Open app
   - `index.html`

## Output

- Bundled browser script: `dist/app.js`
- Generated Tailwind stylesheet: `dist/tailwind.css`

