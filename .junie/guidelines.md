# TippMaster Client Development Guidelines

## Build/Configuration Instructions

### Prerequisites
- **Node.js**: Version ^28 || ^26 || ^24 || ^22 || ^20 || ^18
- **Package Manager**: npm >= 6.13.4 or yarn >= 1.21.1

### Project Setup
```bash
npm install
# or
yarn install
```

### Development Scripts
```bash
# Start development server (opens browser automatically)
npm run dev

# Build for production
npm run build

# Run linting
npm run lint

# Run tests
npm test

# Run tests once (non-watch mode)
npm test -- --run
```

### Framework Configuration
- **Framework**: Quasar Vue.js v2.16.0 with Vite
- **Vue**: v3.4.18 with Composition API
- **TypeScript**: v5.5.3 in strict mode
- **Router**: Vue Router v4 with hash mode
- **State Management**: Pinia v3.0.1

### Browser Support
- **Target**: ES2022, Firefox 115+, Chrome 115+, Safari 14+
- **CSS Processing**: Autoprefixer targeting last 4 versions of major browsers
- **Fonts**: Roboto font with Material Icons

## Testing Information

### Test Framework
- **Test Runner**: Vitest v3.2.4
- **Test Environment**: jsdom
- **Component Testing**: @vue/test-utils v2.4.6
- **Global Test APIs**: Available (describe, it, expect)

### Test Structure
Tests are located in `src/components/__tests__/` directory with `.test.ts` extension.

### Running Tests
```bash
# Run tests in watch mode
npm test

# Run tests once
npm test -- --run

# Run specific test file
npm test -- --run src/components/__tests_old___/YourTest.test.ts
```

### Test Example
```typescript
import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import YourComponent from '../YourComponent.vue'

describe('YourComponent', () => {
  it('renders properly', () => {
    const wrapper = mount(YourComponent, {
      props: {
        title: 'Test Title',
        // Include all required props
        meta: { totalCount: 10 },
        active: true
      }
    })
    
    expect(wrapper.text()).toContain('Test Title')
  })

  it('handles interactions', async () => {
    const wrapper = mount(YourComponent, { /* props */ })
    
    await wrapper.find('button').trigger('click')
    expect(wrapper.emitted()).toHaveProperty('click')
  })
})
```

### Adding New Tests
1. Create test files in `src/components/__tests__/` with `.test.ts` extension
2. Import required testing utilities from vitest and @vue/test-utils
3. Always provide all required props when mounting components
4. Use `await` for async interactions (clicks, input changes)
5. Test both rendering and user interactions

## Code Style & Development Guidelines

### TypeScript Configuration
- **Strict mode**: Enabled
- **Type imports**: Must use `type` keyword for type-only imports
- **Vue shims**: Enabled for .vue file support
- **Path alias**: `@` points to `./src` directory

### ESLint Rules
- **Base**: Vue essential rules + TypeScript recommended
- **Custom Rules**:
  - Consistent type imports enforced
  - No debugger statements in production
  - Promise reject errors allowed
- **File patterns**: `./src*/**/*.{ts,js,cjs,mjs,vue}`

### Code Style Best Practices
```typescript
// ✅ Correct type import
import type { Todo, Meta } from './models'
import { ref, computed } from 'vue'

// ✅ Component props with TypeScript
interface Props {
  title: string
  meta: Meta
  active: boolean
  todos?: Todo[]
}

const props = withDefaults(defineProps<Props>(), {
  todos: () => []
})

// ✅ Composition API usage
const count = ref(0)
const doubleCount = computed(() => count.value * 2)
```

### Development Workflow
1. **Linting**: Run `npm run lint` before committing
2. **Type checking**: Enabled via vite-plugin-checker during development
3. **Hot reload**: Available in development mode
4. **Browser opening**: Automatic on `npm run dev`

### File Structure
```
src/
├── components/          # Vue components
│   └── __tests__/      # Component tests
├── stores/             # Pinia stores
├── router/             # Vue Router configuration
├── assets/             # Static assets
└── App.vue            # Root component
```

### Common Pitfalls
- **Testing**: Always provide all required props when mounting components
- **Type imports**: Use `import type` for type-only imports to avoid bundling issues
- **CSS**: Remember to include required props in component interfaces
- **Debugging**: Use debugger statements only in development (ESLint will catch production usage)

### Build Output
- **Development**: Served via Vite dev server
- **Production**: Static files in `dist/` directory
- **TypeScript**: Compiled to JavaScript with source maps
- **CSS**: Processed with Autoprefixer for cross-browser compatibility
