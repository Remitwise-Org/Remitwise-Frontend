import { describe, it, expect } from 'vitest';
import { ESLint } from 'eslint';

describe('ESLint Rules', () => {
  it('bans useEffect with no dependency array', async () => {
    const eslint = new ESLint({
      useEslintrc: true,
      overrideConfig: {
        // Ensure we treat the input as a module to allow import statements if needed
        parserOptions: {
          ecmaVersion: 2022,
          sourceType: 'module',
        },
      },
    });

    const code = `
      import { useEffect } from 'react';
      
      export function MyComponent() {
        useEffect(() => {
          console.log('Running on every render');
        });
        return null;
      }
    `;

    const results = await eslint.lintText(code);
    const messages = results[0].messages;

    const noRestrictedSyntaxMessage = messages.find(
      (msg) => msg.ruleId === 'no-restricted-syntax'
    );

    expect(noRestrictedSyntaxMessage).toBeDefined();
    expect(noRestrictedSyntaxMessage?.message).toContain('useEffect with no dependency array is banned');
  });

  it('allows useEffect with empty dependency array', async () => {
    const eslint = new ESLint({
      useEslintrc: true,
      overrideConfig: {
        parserOptions: {
          ecmaVersion: 2022,
          sourceType: 'module',
        },
      },
    });

    const code = `
      import { useEffect } from 'react';
      
      export function MyComponent() {
        useEffect(() => {
          console.log('Running once');
        }, []);
        return null;
      }
    `;

    const results = await eslint.lintText(code);
    const messages = results[0].messages;

    const noRestrictedSyntaxMessage = messages.find(
      (msg) => msg.ruleId === 'no-restricted-syntax'
    );

    expect(noRestrictedSyntaxMessage).toBeUndefined();
  });

  it('allows useEffect with dependencies', async () => {
    const eslint = new ESLint({
      useEslintrc: true,
      overrideConfig: {
        parserOptions: {
          ecmaVersion: 2022,
          sourceType: 'module',
        },
      },
    });

    const code = `
      import { useEffect } from 'react';
      
      export function MyComponent({ id }) {
        useEffect(() => {
          console.log('Running when id changes');
        }, [id]);
        return null;
      }
    `;

    const results = await eslint.lintText(code);
    const messages = results[0].messages;

    const noRestrictedSyntaxMessage = messages.find(
      (msg) => msg.ruleId === 'no-restricted-syntax'
    );

    expect(noRestrictedSyntaxMessage).toBeUndefined();
  });

  it('bans useState with an initial function call', async () => {
    const eslint = new ESLint({
      useEslintrc: true,
      overrideConfig: {
        parserOptions: {
          ecmaVersion: 2022,
          sourceType: 'module',
        },
      },
    });

    const code = `
      import { useState } from 'react';
      
      export function MyComponent() {
        const [state, setState] = useState(myExpensiveInit());
        return null;
      }
    `;

    const results = await eslint.lintText(code);
    const messages = results[0].messages;

    const noRestrictedSyntaxMessage = messages.find(
      (msg) => msg.ruleId === 'no-restricted-syntax'
    );

    expect(noRestrictedSyntaxMessage).toBeDefined();
    expect(noRestrictedSyntaxMessage?.message).toContain('useState with an initial function call runs on every render');
  });

  it('allows useState with a lazy initializer arrow function', async () => {
    const eslint = new ESLint({
      useEslintrc: true,
      overrideConfig: {
        parserOptions: {
          ecmaVersion: 2022,
          sourceType: 'module',
        },
      },
    });

    const code = `
      import { useState } from 'react';
      
      export function MyComponent() {
        const [state, setState] = useState(() => myExpensiveInit());
        return null;
      }
    `;

    const results = await eslint.lintText(code);
    const messages = results[0].messages;

    const noRestrictedSyntaxMessage = messages.find(
      (msg) => msg.ruleId === 'no-restricted-syntax' && msg.message.includes('useState')
    );

    expect(noRestrictedSyntaxMessage).toBeUndefined();
  });

  it('allows useState with a simple value', async () => {
    const eslint = new ESLint({
      useEslintrc: true,
      overrideConfig: {
        parserOptions: {
          ecmaVersion: 2022,
          sourceType: 'module',
        },
      },
    });

    const code = `
      import { useState } from 'react';
      
      export function MyComponent() {
        const [state, setState] = useState(0);
        return null;
      }
    `;

    const results = await eslint.lintText(code);
    const messages = results[0].messages;

    const noRestrictedSyntaxMessage = messages.find(
      (msg) => msg.ruleId === 'no-restricted-syntax' && msg.message.includes('useState')
    );

    expect(noRestrictedSyntaxMessage).toBeUndefined();
  });
});
