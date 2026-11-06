/**
 * Tests for scripts/check-walkthrough-evidence.mjs (hds#1148): committed
 * walkthrough media must carry an evidence file that says it was recorded
 * with every gate green, and not with --allow-red.
 */

import { describe, it, expect } from 'vitest';
import { mkdirSync, mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import {
  checkWalkthroughEvidence,
  writeWalkthroughEvidence,
  EVIDENCE_FILE,
} from '../check-walkthrough-evidence.mjs';

const sha = (s) => createHash('sha256').update(s).digest('hex');

/** A media folder with an mp4, a poster and a vtt, plus optional evidence. */
function folder(evidence) {
  const dir = mkdtempSync(path.join(tmpdir(), 'wt-ev-'));
  const media = { 'walkthrough.mp4': 'mp4', 'poster.jpg': 'jpg', 'walkthrough.vtt': 'WEBVTT' };
  for (const [f, body] of Object.entries(media)) writeFileSync(path.join(dir, f), body);
  if (evidence) {
    const files = Object.fromEntries(Object.entries(media).map(([f, b]) => [f, sha(b)]));
    writeFileSync(path.join(dir, EVIDENCE_FILE), JSON.stringify(evidence(files)));
  }
  return dir;
}

const green = (files) => ({
  recordedAt: '2026-11-06T04:40:00Z',
  commit: 'abc1234',
  allowRed: false,
  gates: { 'check:figma-drift': 0, 'check:figma-release': 0 },
  files,
});

describe('checkWalkthroughEvidence', () => {
  it('passes media recorded with every gate green', () => {
    expect(checkWalkthroughEvidence(folder(green))).toEqual([]);
  });

  it('passes when there is no media folder at all', () => {
    expect(checkWalkthroughEvidence(path.join(tmpdir(), 'no-such-walkthrough'))).toEqual([]);
  });

  it('fails media with no evidence file', () => {
    expect(checkWalkthroughEvidence(folder(null)).join('\n')).toMatch(
      /no walkthrough\.evidence\.json/,
    );
  });

  it('fails media recorded with --allow-red', () => {
    const dir = folder((files) => ({ ...green(files), allowRed: true }));
    expect(checkWalkthroughEvidence(dir).join('\n')).toMatch(/--allow-red/);
  });

  it('fails media recorded while a gate was red', () => {
    const dir = folder((files) => ({
      ...green(files),
      gates: { 'check:figma-drift': 0, 'check:figma-release': 1 },
    }));
    expect(checkWalkthroughEvidence(dir).join('\n')).toMatch(/check:figma-release exited 1/);
  });

  it('fails when a media file changed after the evidence was written', () => {
    const dir = folder(green);
    writeFileSync(path.join(dir, 'walkthrough.mp4'), 'swapped');
    expect(checkWalkthroughEvidence(dir).join('\n')).toMatch(/walkthrough\.mp4 does not match/);
  });

  it('fails a media file the evidence does not list', () => {
    const dir = folder(green);
    writeFileSync(path.join(dir, 'extra.webm'), 'x');
    expect(checkWalkthroughEvidence(dir).join('\n')).toMatch(/extra\.webm is not in/);
  });

  it('fails evidence that leaves out a required gate', () => {
    const dir = folder((files) => ({ ...green(files), gates: { other: 0 } }));
    expect(checkWalkthroughEvidence(dir).join('\n')).toMatch(/does not list check:figma-drift/);
  });

  it('checks hidden files too', () => {
    const dir = folder(green);
    writeFileSync(path.join(dir, '.red.mp4'), 'x');
    expect(checkWalkthroughEvidence(dir).join('\n')).toMatch(/\.red\.mp4 is not in/);
  });

  it('reports a subfolder instead of crashing', () => {
    const dir = folder(green);
    mkdirSync(path.join(dir, 'old'));
    expect(checkWalkthroughEvidence(dir).join('\n')).toMatch(/old is not a file/);
  });

  it('fails evidence that is not valid JSON', () => {
    const dir = folder(green);
    writeFileSync(path.join(dir, EVIDENCE_FILE), '{');
    expect(checkWalkthroughEvidence(dir).join('\n')).toMatch(/not valid JSON/);
  });
});

describe('writeWalkthroughEvidence', () => {
  const facts = { commit: 'abc1234', gates: { 'check:figma-drift': 0, 'check:figma-release': 0 } };

  it('writes evidence the check accepts for green media', () => {
    const dir = folder(null);
    writeWalkthroughEvidence(dir, { ...facts, allowRed: false });
    expect(checkWalkthroughEvidence(dir)).toEqual([]);
  });

  it('writes evidence the check rejects for an --allow-red recording', () => {
    const dir = folder(null);
    writeWalkthroughEvidence(dir, {
      ...facts,
      allowRed: true,
      gates: { 'check:figma-drift': 0, 'check:figma-release': 1 },
    });
    const problems = checkWalkthroughEvidence(dir).join('\n');
    expect(problems).toMatch(/--allow-red/);
    expect(problems).toMatch(/check:figma-release exited 1/);
  });
});
