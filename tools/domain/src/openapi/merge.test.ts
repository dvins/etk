import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { readFileSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { parse } from 'yaml';
import path from 'node:path';

import { mergeOpenApiSchemas } from './merge';

const tmpDir = path.join(__dirname, '__tmp__');

beforeAll(() => {
  mkdirSync(tmpDir, { recursive: true });
});

afterAll(() => {
  rmSync(tmpDir, { recursive: true, force: true });
});

const writeYaml = (filename: string, content: string): string => {
  const fullPath = path.join(tmpDir, filename);
  writeFileSync(fullPath, content);
  return fullPath;
};

describe('mergeOpenApiSchemas', () => {
  it('prefixes by filename (default)', async () => {
    const fileA = writeYaml('a.yaml', schemaA);
    const fileB = writeYaml('b.yaml', schemaB);
    const outputFile = path.join(tmpDir, 'filename-prefix.yaml');

    await mergeOpenApiSchemas([fileA, fileB], outputFile, [], { treeShake: false });

    const result = parse(readFileSync(outputFile, 'utf8'));

    expect(result.paths['/a/hello']).toBeDefined();
    expect(result.paths['/b/world']).toBeDefined();
  });

  it('prefixes using custom prefixNames (custom)', async () => {
    const fileA = writeYaml('one.yaml', schemaA);
    const fileB = writeYaml('two.yaml', schemaB);
    const outputFile = path.join(tmpDir, 'custom-prefix.yaml');

    await mergeOpenApiSchemas([fileA, fileB], outputFile, [], {
      pathPrefix: 'custom',
      prefixNames: ['auth', 'user'],
      treeShake: false,
    });

    const result = parse(readFileSync(outputFile, 'utf8'));

    expect(result.paths['/auth/hello']).toBeDefined();
    expect(result.paths['/user/world']).toBeDefined();
  });

  it('does not prefix paths when pathPrefixing is "none"', async () => {
    const fileA = writeYaml('noprefix-a.yaml', schemaA);
    const fileB = writeYaml('noprefix-b.yaml', schemaB);
    const outputFile = path.join(tmpDir, 'no-prefix.yaml');

    await mergeOpenApiSchemas([fileA, fileB], outputFile, [], {
      pathPrefix: 'none',
      treeShake: false,
    });

    const result = parse(readFileSync(outputFile, 'utf8'));

    expect(result.paths['/hello']).toBeDefined();
    expect(result.paths['/world']).toBeDefined();
  });

  it('merges schemas and retains metadata from the first', async () => {
    const fileA = writeYaml('meta-a.yaml', schemaA);
    const fileB = writeYaml('meta-b.yaml', schemaB);
    const outputFile = path.join(tmpDir, 'output.yaml');

    await mergeOpenApiSchemas([fileA, fileB], outputFile, [], { treeShake: false });

    const result = parse(readFileSync(outputFile, 'utf8'));

    // Metadata assertions
    expect(result.openapi).toBe('3.1.0');
    expect(result.info.title).toBe('Schema A');
    expect(result.info.version).toBe('1.0.0');
    expect(result.info.description).toBe('First schema');
    expect(result.info.summary).toBe('Summary A');
    expect(result.info.termsOfService).toBe('https://tos.example.com');
    expect(result.info.contact).toEqual({
      name: 'Example Support',
      email: 'support@example.com',
    });
    expect(result.info.license).toEqual({
      name: 'MIT',
      url: 'https://opensource.org/licenses/MIT',
    });

    expect(result.servers?.[0]?.url).toBe('https://api.a.com');

    // Components
    expect(result.components.schemas.Hello).toBeDefined();
    expect(result.components.schemas.World).toBeDefined();
  });

  it('removes unused components when treeShake is enabled (default)', async () => {
    const input = writeYaml('shake.yaml', `
openapi: 3.1.0
info:
  title: Tree Shake Test
  version: 1.0.0
paths:
  /ping:
    get:
      summary: Ping
      responses:
        '200':
          description: OK
components:
  schemas:
    UnusedSchema:
      type: object
      properties:
        unused:
          type: string
    UsedSchema:
      type: object
      properties:
        message:
          type: string
`);

    const output = path.join(tmpDir, 'shaken.yaml');

    // Reference UsedSchema so it's preserved
    const reference = `
paths:
  /ping:
    get:
      responses:
        '200':
          description: OK
          content:
            application/json:
              schema:
                $ref: '#/components/schemas/UsedSchema'
`;

    const pingFile = writeYaml('ping.yaml', reference);

    await mergeOpenApiSchemas([input, pingFile], output);

    const result = parse(readFileSync(output, 'utf8'));
    expect(result.components?.schemas?.UsedSchema).toBeDefined();
    expect(result.components?.schemas?.UnusedSchema).toBeUndefined();
  });

  it('throws an error when no schemas are provided', async () => {
    const dummyOutput = '/tmp/merged.yaml';

    const sut = mergeOpenApiSchemas([], dummyOutput);

    await expect(() => sut).rejects.toThrowError(/at least one openapi schema path/i);
  });

  it('throws an error when no output path is provided', async () => {
    // @ts-expect-error: purposely omitting required argument to simulate user error
    const sut = mergeOpenApiSchemas(['some-schema.yaml'])

    await expect(() => sut).rejects.toThrowError(/output file path must be provided/i);
  });
});

const schemaA = `
openapi: 3.1.0
info:
  title: Schema A
  version: 1.0.0
  description: First schema
  summary: Summary A
  termsOfService: https://tos.example.com
  contact:
    name: Example Support
    email: support@example.com
  license:
    name: MIT
    url: https://opensource.org/licenses/MIT
servers:
  - url: https://api.a.com
paths:
  /hello:
    get:
      summary: Hello world
      responses:
        '200':
          description: OK
components:
  schemas:
    Hello:
      type: object
      properties:
        message:
          type: string
`;

const schemaB = `
openapi: 3.1.0
info:
  title: Schema B
  version: 1.1.0
paths:
  /world:
    get:
      summary: World hello
      responses:
        '200':
          description: OK
components:
  schemas:
    World:
      type: object
      properties:
        name:
          type: string
`;
