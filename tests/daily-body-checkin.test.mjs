import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const source = await readFile(new URL('../body-checkin.js', import.meta.url), 'utf8');
const sandbox = {};
vm.runInNewContext(source, sandbox);
const body = sandbox.DailyBodyCheckin;

test('legacy pain values remain readable and map to today check-in areas', () => {
  const normalized = body.normalize({ pains:['back','shoulder','foot'] });
  assert.deepEqual(Array.from(normalized.bodyAreas), ['lowBack','shoulder','neck','foot']);
  assert.deepEqual(Array.from(normalized.pains), ['back','shoulder','foot']);
});

test('new areas feed the existing broad safety categories', () => {
  const normalized = body.normalize({ bodyAreas:['thoracic','wrist','thumb','hand'] });
  assert.ok(normalized.pains.includes('back'));
  assert.ok(normalized.pains.includes('wrist'));
  assert.ok(normalized.bodyAreas.includes('thoracic'));
});

test('wrist loading avoids identified wrist-bearing movements without banning Pilates', () => {
  const status = body.normalize({ bodyAreas:['wrist'], symptoms:['pain'], triggers:['wristBearing'] });
  assert.equal(body.conflictsWithVideo({ title:'10 Minute Plank Pilates' }, status), true);
  assert.equal(body.conflictsWithVideo({ title:'Gentle Pilates Mobility' }, status), false);
});

test('thoracic constraints depend on the reported trigger and named movement', () => {
  const status = body.normalize({ bodyAreas:['thoracic'], symptoms:['tight'], triggers:['rotation'] });
  assert.equal(body.conflictsWithVideo({ title:'Deep Spinal Twist for Mobility' }, status), true);
  assert.equal(body.conflictsWithVideo({ title:'Gentle Pilates' }, status), false);
  assert.equal(body.conflictsWithVideo({ title:'Deep Spinal Twist' }, { bodyAreas:['thoracic'], symptoms:['tight'] }), false);
});

test('tendon conditions are not inferred and red flags hold all workout choices', () => {
  assert.equal(body.normalize({ bodyAreas:['thumb'], symptoms:['pain'] }).knownCondition, 'none');
  const flagged = body.normalize({ redFlags:['chestBreath'] });
  assert.equal(body.requiresRest(flagged), true);
  assert.equal(body.conflictsWithVideo({ title:'Any workout' }, flagged), true);
  assert.equal(body.requiresRest(body.normalize({})), false);
});

test('the check-in is wired into daily planning and the quick no-discomfort action', async () => {
  const app = await readFile(new URL('../app.js', import.meta.url), 'utf8');
  const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
  assert.match(app, /DailyBodyCheckin\.conflictsWithVideo\(video, assessment\.bodyStatus\)/);
  assert.match(app, /DailyBodyCheckin\.requiresRest\(dayAssessment\.bodyStatus\)/);
  assert.match(html, /id="dailyNoDiscomfort"/);
  assert.match(html, /id="dailyBodyAreaChoices"/);
  assert.match(html, /id="persistentBodyAreaChoices"/);
  assert.match(app, /renderBodyAreaChoices\('dailyBodyAreaChoices', 'dailyBodyArea'/);
  assert.match(app, /renderBodyAreaChoices\('persistentBodyAreaChoices', 'persistentBodyArea'/);
  assert.equal(body.AREAS.thoracic, '胸椎／中背部');
  assert.equal(body.AREAS.wrist, '手腕');
});

