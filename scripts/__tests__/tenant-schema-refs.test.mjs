/**
 * Every tenants/<slug>/{metadata,tokens}.json names a JSON Schema in `$schema`.
 * Editors and validators resolve that path relative to the file, so it has to
 * point at a file that exists, and the tenant files have to satisfy it.
 */

import { describe, it, expect } from 'vitest';
import { existsSync, readdirSync, readFileSync } from 'fs';
import { dirname, join, relative, resolve } from 'path';
import { fileURLToPath } from 'url';

const REPO_ROOT = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const TENANTS_DIR = join(REPO_ROOT, 'tenants');
const METADATA_SCHEMA = join(REPO_ROOT, 'hirobius.tenant-metadata.schema.json');

function readJson(file) {
  return JSON.parse(readFileSync(file, 'utf8'));
}

function tenantFiles(fileName) {
  return readdirSync(TENANTS_DIR, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => join(TENANTS_DIR, entry.name, fileName))
    .filter((file) => existsSync(file));
}

const metadataFiles = tenantFiles('metadata.json');
const tokenFiles = tenantFiles('tokens.json');

function label(file) {
  return relative(REPO_ROOT, file).replace(/\\/g, '/');
}

describe('tenant $schema references', () => {
  it('finds tenant files to check', () => {
    expect(metadataFiles.length).toBeGreaterThan(0);
    expect(tokenFiles.length).toBeGreaterThan(0);
  });

  it('every $schema resolves to a file that exists', () => {
    const broken = [...metadataFiles, ...tokenFiles]
      .map((file) => ({ file, ref: readJson(file).$schema }))
      .filter(
        ({ file, ref }) => typeof ref !== 'string' || !existsSync(resolve(dirname(file), ref)),
      )
      .map(({ file, ref }) => `${label(file)} -> ${ref}`);
    expect(broken).toEqual([]);
  });

  it('metadata.json files point at the tenant metadata schema', () => {
    const wrong = metadataFiles
      .filter((file) => resolve(dirname(file), readJson(file).$schema) !== METADATA_SCHEMA)
      .map(label);
    expect(wrong).toEqual([]);
  });
});

describe('hirobius.tenant-metadata.schema.json', () => {
  it('requires the fields check-tenant-tokens.mjs enforces (M2) and its status values (M3)', () => {
    const schema = readJson(METADATA_SCHEMA);
    expect(schema.required).toEqual(
      expect.arrayContaining(['slug', 'displayName', 'tier', 'status']),
    );
    expect(schema.properties.status.enum).toEqual(['scaffold', 'active', 'archived']);
    expect(schema.properties.tier.enum).toEqual([1, 2, 3]);
  });

  it('every tenant metadata.json has the required fields and no undeclared top-level keys', () => {
    const schema = readJson(METADATA_SCHEMA);
    const declared = new Set(Object.keys(schema.properties));
    const problems = [];
    for (const file of metadataFiles) {
      const meta = readJson(file);
      for (const field of schema.required) {
        if (!(field in meta)) problems.push(`${label(file)} missing ${field}`);
      }
      for (const key of Object.keys(meta)) {
        if (!declared.has(key)) problems.push(`${label(file)} has undeclared key ${key}`);
      }
      if (!schema.properties.status.enum.includes(meta.status)) {
        problems.push(`${label(file)} status ${meta.status}`);
      }
      if (!schema.properties.tier.enum.includes(meta.tier)) {
        problems.push(`${label(file)} tier ${meta.tier}`);
      }
    }
    expect(problems).toEqual([]);
  });
});
