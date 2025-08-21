import { config } from '@vue/test-utils'
import { vi } from 'vitest'

// Mock Quasar components as simple div elements
const mockQuasarComponents = {
  'q-card': {
    template: '<div class="q-card"><slot /></div>'
  },
  'q-card-section': {
    template: '<div class="q-card-section"><slot /></div>'
  },
  'q-input': {
    template: '<input class="q-input" :value="modelValue" @input="$emit(\'update:modelValue\', $event.target.value)" />',
    props: ['modelValue', 'label', 'placeholder', 'hint', 'rules', 'outlined', 'loading', 'disable', 'autofocus'],
    emits: ['update:modelValue']
  },
  'q-btn': {
    template: '<button class="q-btn" :type="type" :disabled="disable || loading" @click="$emit(\'click\')"><slot /></button>',
    props: ['type', 'color', 'loading', 'disable', 'outline'],
    emits: ['click']
  },
  'q-form': {
    template: '<form class="q-form" @submit="$emit(\'submit\', $event)"><slot /></form>',
    emits: ['submit']
  },
  'q-banner': {
    template: '<div class="q-banner"><slot name="avatar" /><slot /></div>',
    props: ['class', 'rounded', 'color', 'textColor']
  },
  'q-icon': {
    template: '<i class="q-icon">{{ name }}</i>',
    props: ['name']
  },
  'q-chip': {
    template: '<span class="q-chip" :class="[color, textColor]"><i v-if="icon">{{ icon }}</i><slot /></span>',
    props: ['color', 'textColor', 'icon', 'size']
  },
  'q-header': {
    template: '<header class="q-header" :class="[elevated]"><slot /></header>',
    props: ['elevated']
  },
  'q-toolbar': {
    template: '<div class="q-toolbar"><slot /></div>'
  },
  'q-toolbar-title': {
    template: '<div class="q-toolbar-title"><slot /></div>'
  },
  'q-page-container': {
    template: '<main class="q-page-container"><slot /></main>'
  },
  'q-page': {
    template: '<div class="q-page" :class="[padding]"><slot /></div>',
    props: ['class', 'padding']
  },
  'q-footer': {
    template: '<footer class="q-footer"><slot /></footer>',
    props: ['class']
  }
}

// Configure global components for all tests
config.global.components = mockQuasarComponents

// Mock window.setInterval and clearInterval globally
Object.defineProperty(window, 'setInterval', {
  value: vi.fn(() => 123)
})
Object.defineProperty(window, 'clearInterval', {
  value: vi.fn()
})

// Mock localStorage globally
const localStorageMock = {
  getItem: vi.fn(),
  setItem: vi.fn(),
  removeItem: vi.fn(),
  clear: vi.fn()
}
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock
})
