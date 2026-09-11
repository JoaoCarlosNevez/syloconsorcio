/** @type {import('@commitlint/types').UserConfig} */
export default {
  extends: ['@commitlint/config-conventional'],
  rules: {
    // Enforce lowercase subject — no "Add feature", use "add feature"
    'subject-case': [2, 'never', ['sentence-case', 'start-case', 'pascal-case', 'upper-case']],
    // Commits must be in English (enforced by convention, not rule)
    'header-max-length': [2, 'always', 100],
  },
}
