import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';

const [source, html, library] = await Promise.all([
  readFile(new URL('../app.js', import.meta.url), 'utf8'),
  readFile(new URL('../index.html', import.meta.url), 'utf8'),
  readFile(new URL('../body-checkin.js', import.meta.url), 'utf8')
]);
const sandbox = {};
vm.runInNewContext(library, sandbox);
const body = sandbox.DailyBodyCheckin;

test('weekly form uses exactly one detailed persistent-area group', () => {
  const panel = html.split('<dialog id="assessmentDialog"')[1].split('</dialog>')[0];
  assert.equal((panel.match(/<fieldset/g) || []).length, 1);
  assert.match(panel, /id="persistentBodyAreaChoices"/);
  assert.doesNotMatch(panel, /name="pain"/);
  assert.match(panel, /持续性不适部位（可多选）/);
});

test('legacy foot, knee, lower-back and shoulder pain choices remain selected in the new UI', () => {
  assert.deepEqual(Array.from(body.weeklyAreasForAssessment({ pains:['foot','knee','back','shoulder'] })),
    ['foot','knee','lowBack','shoulder','neck']);
});

test('specific areas take precedence over their broad legacy categories', () => {
  const assessment = {
    pains:['back','shoulder','wrist','foot'],
    persistentBodyStatus:{ bodyAreas:['thoracic','shoulder','wrist'], pains:['back','shoulder','wrist'] }
  };
  assert.deepEqual(Array.from(body.weeklyAreasForAssessment(assessment)),
    ['thoracic','shoulder','wrist','foot']);
});

test('clearing all selected areas can remove legacy pain limits', () => {
  const reset = body.normalize({ pains:[],bodyAreas:[],persistent:true,redFlags:[] });
  assert.equal(reset.pains.length, 0);
  assert.equal(reset.bodyAreas.length, 0);
  assert.match(source, /pains:persistentBodyStatus\?\.pains\|\|\[\]/);
  assert.doesNotMatch(source, /querySelectorAll\('input\[name="pain"\]:checked'\)/);
});

test('English / Chinese dynamic body selector comes from one localized vocabulary', () => {
  const start = source.indexOf('const UI_ZH_EN = {');
  const end = source.indexOf('function systemLanguage()', start);
  assert.ok(start >= 0 && end > start);
  const list = {};
  const context = {
    DailyBodyCheckin:body,
    document:{getElementById:id => list[id] ||= {innerHTML:''}},
    lang:'en',
    currentLanguage:()=>context.lang,
    escapeHtml:s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;')
  };
  vm.runInNewContext(source.slice(start,end), context);
  context.renderBodyAreaChoices('persistentBodyAreaChoices','persistentBodyArea',['thoracic']);
  const english = list.persistentBodyAreaChoices.innerHTML;
  assert.equal((english.match(/name="persistentBodyArea"/g)||[]).length, Object.keys(body.AREAS).length);
  assert.match(english,/Thoracic \/ mid-back/);
  assert.match(english,/value="thoracic" checked/);
  assert.doesNotMatch(english, /[\u3400-\u9fff]/);
  context.lang='zh';
  context.renderBodyAreaChoices('dailyBodyAreaChoices','dailyBodyArea',['wrist']);
  const chinese = list.dailyBodyAreaChoices.innerHTML;
  assert.match(chinese,/胸椎／中背部/);
  assert.match(chinese,/value="wrist" checked/);
});

test('symptom and gripping trigger texts have English translations', () => {
  assert.match(source, /'酸紧':'Soreness \/ tightness'/);
  assert.match(source, /'疼痛':'Pain'/);
  assert.match(source, /'肿胀':'Swelling'/);
  assert.match(source, /'抓握／反复用拇指':'Gripping \/ repeated thumb use'/);
  assert.match(html, /body-checkin\.js\?v=3\.8\.4/);
  assert.match(html, /app\.js\?v=3\.8\.4/);
});
