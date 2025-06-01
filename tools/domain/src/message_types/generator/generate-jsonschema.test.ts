import { describe, it, expect, beforeEach } from 'vitest';
import { mkdirSync, readFileSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import path from 'path';

import { exportOpenApiComponents } from './generate-jsonschema';

const makeTmpPath = (filename: string) =>
  path.join(tmpdir(), `oas-export-test-${Math.random().toString(36).slice(2)}`, filename);

describe('exportOpenApiComponents', () => {
  let outputPath: string;
  let baseComponentsPath: string;

  const schemas = [
    {
      key: 'User',
      content: JSON.stringify({
        $schema: 'http://json-schema.org/draft-07/schema#',
        $id: 'User',
        type: 'object',
        properties: {
          id: { type: 'string' },
          name: { type: 'string' },
        },
      }),
    },
    {
      key: 'Account',
      content: JSON.stringify({
        $schema: 'http://json-schema.org/draft-07/schema#',
        $id: 'Account',
        type: 'object',
        properties: {
          accountId: { type: 'string' },
        },
      }),
    },
  ];

  beforeEach(() => {
    const dir = path.dirname(makeTmpPath('temp'));
    mkdirSync(dir, { recursive: true });

    outputPath = path.join(dir, 'output.json');

    baseComponentsPath = path.join(dir, 'base.yaml');
    writeFileSync(
      baseComponentsPath,
      `
components:
  securitySchemes:
    BearerAuth:
      type: http
      scheme: bearer
      bearerFormat: JWT`
    );
  });

  it('writes JSON schemas to components.schemas', async () => {
    await exportOpenApiComponents(schemas, outputPath);

    const result = JSON.parse(readFileSync(outputPath, 'utf8'));

    expect(result.components.schemas).toHaveProperty('User');
    expect(result.components.schemas).toHaveProperty('Account');
    expect(result.components.securitySchemes).toBeUndefined();
  });

  it('merges in base components from YAML file', async () => {
    await exportOpenApiComponents(schemas, outputPath, baseComponentsPath);

    const result = JSON.parse(readFileSync(outputPath, 'utf8'));

    expect(result.components.schemas.User).toBeDefined();
    expect(result.components.schemas.Account).toBeDefined();
    expect(result.components.securitySchemes.BearerAuth).toEqual({
      type: 'http',
      scheme: 'bearer',
      bearerFormat: 'JWT',
    });
  });

  it('throws if YAML is invalid', async () => {
    writeFileSync(baseComponentsPath, `components: { not: valid: yaml }`);

    const sut = exportOpenApiComponents(schemas, outputPath, baseComponentsPath);
    await expect(sut).rejects.toThrow();
  });
});