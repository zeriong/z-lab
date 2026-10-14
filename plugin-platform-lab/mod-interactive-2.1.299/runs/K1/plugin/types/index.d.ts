export type Five = string

declare module 'claude-code' {
  interface PluginState {
    'ask-probe': { five: Five }
  }
}
