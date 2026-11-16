import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source = fs.readFileSync(new URL('../app.js', import.meta.url), 'utf8');
function part(from, until) {
  const begin = source.indexOf(from);
  const end = source.indexOf(until, begin + from.length);
  assert.ok(begin >= 0 && end > begin, 'Could not extract app section: ' + from);
  return source.slice(begin, end);
}

function harness() {
  const ctx = {
    TZ:'America/Toronto',
    currentLocale:()=> 'en-CA',
    state:{ assessment:{mode:'stable'}, plansByWeek:{}, planMetaByWeek:{}, weekPreferencesByStart:{}, weekScheduleStartDay:'monday', plan:[], feedback:[] },
    saveState:()=>{ ctx.saved += 1; }, saved:0, selectedWeekStart:'2026-11-16',
    determineMode:()=> 'stable',
    approvedPlanVideos:()=>[],
    videoRotationStats:()=>new Map(),
    recentRotationBlockedIds:()=>new Set(),
    menstrualContextForDate:()=>({active:false}),
    menstrualTemplateForDay:template=>template,
    buildRationale:()=> '训练安排',
    chooseUniqueVideo:(_approved,_template,_used,_assessment,index)=>({
      id:'video-'+index,title:'Workout '+index,channel:'Test',duration:15,
      focus:'pilates',position:'mat',risk:'low',url:'',thumbnail:''
    })
  };
  vm.createContext(ctx);
  vm.runInContext(
    part('function torontoDate(', 'function menstrualEndDate(')
    + part('const dayTemplates = [', 'function daysBetweenIso(')
    + part('function buildWeeklyPlan(', 'function markPlanLocked(')
    + part('function migrateLegacyWeekSchedule(', 'function repairRetiredChannelSlots('),
    ctx
  );
  return ctx;
}

test('week starts Monday and ends Sunday, including year boundary', ()=>{
  const c=harness();
  const dates=['2026-11-14','2026-11-15','2026-11-16','2026-11-22','2026-11-23','2026-01-01'];
  const expected=['2026-11-09','2026-11-09','2026-11-16','2026-11-16','2026-11-23','2025-12-29'];
  dates.forEach((date,index)=>assert.equal(c.startOfPlanWeek(date),expected[index]));
  assert.deepEqual(Array.from(c.getWeekDates('2026-11-16')),[
    '2026-11-16','2026-11-17','2026-11-18','2026-11-19','2026-11-20','2026-11-21','2026-11-22'
  ]);
});

test('new plans contain five workout days, weekend fixed rest, no weekend video', ()=>{
  const c=harness();
  const plan=Array.from(c.buildWeeklyPlan('2026-11-16'));
  assert.equal(plan.length,7);
  assert.equal(plan.filter(x=>!!x.videoId).length,5);
  assert.deepEqual(plan.slice(5).map(x=>[x.day,x.videoId,x.fixedRest]),[
    ['周六',null,true],['周日',null,true]
  ]);
  assert.ok(plan.slice(5).every(x=>x.rationale.includes('固定休息')));
});

test('regeneration preserves past weekdays and still blocks weekend training', ()=>{
  const c=harness();
  const old={
    date:'2026-11-16',day:'周一',videoId:'past-video',category:'已完成的 Pilates',
    videoSnapshot:{id:'past-video'}
  };
  const plan=Array.from(c.buildWeeklyPlan('2026-11-16',{
    existingPlan:[old],
    preserveBeforeDate:'2026-11-17'
  }));
  assert.equal(plan[0].videoId,'past-video');
  assert.equal(plan[0].category,'已完成的 Pilates');
  assert.ok(plan.slice(5).every(x=>!x.videoId&&x.fixedRest));
});

test('old Saturday weeks migrate by exact date; keep historical workout and feedback', ()=>{
  const c=harness();
  const dates=Array.from({length:7},(_,i)=>c.addDays('2026-11-14',i));
  const oldPlan=dates.map((date,i)=>({
    date,day:['周六','周日','周一','周二','周三','周四','周五'][i],
    videoId:'original-'+i,category:'旧计划 '+i,videoSnapshot:{id:'original-'+i}
  }));
  const feedback=[{date:'2026-11-15',videoId:'original-1',status:'completed',minutes:15}];
  c.state={
    assessment:{mode:'stable'},
    weekScheduleStartDay:'saturday',
    plan:oldPlan,
    plansByWeek:{'2026-11-14':oldPlan},
    planMetaByWeek:{'2026-11-14':{locked:true}},
    weekPreferencesByStart:{'2026-11-14':{excludedChannels:['MIZI']}},
    feedback
  };
  const migrated=c.migrateLegacyWeekSchedule('2026-11-16');
  assert.equal(migrated,true);
  assert.equal(c.state.weekScheduleStartDay,'monday');
  assert.deepEqual(Object.keys(c.state.plansByWeek).sort(),['2026-11-09','2026-11-16']);
  const history=c.state.plansByWeek['2026-11-09'];
  assert.equal(history.find(x=>x.date==='2026-11-15').videoId,'original-1');
  assert.equal(c.state.feedback,feedback);
  const current=c.state.plansByWeek['2026-11-16'];
  assert.equal(current.length,7);
  assert.equal(current[0].videoId,'original-2');
  assert.equal(current[4].videoId,'original-6');
  assert.ok(current.slice(5).every(x=>x.videoId===null && x.fixedRest));
  assert.deepEqual(Array.from(c.state.weekPreferencesByStart['2026-11-16'].excludedChannels),['MIZI']);
  assert.equal(c.state.plan,c.state.plansByWeek['2026-11-16']);
  assert.equal(c.selectedWeekStart,'2026-11-16');
  assert.equal(c.saved,1);
  assert.equal(c.migrateLegacyWeekSchedule('2026-11-16'),false);
  assert.equal(c.saved,1);
});

test('manual light/challenge actions cannot override Saturday or Sunday rest', () => {
  const c=harness();
  c.window={};
  const messages=[];
  c.showToast=msg=>messages.push(msg);
  vm.runInContext(
    part('window.applyDailyEnergySuggestion = function(', 'function saveDailyStatus(')
    + part('window.swapPlan = function(', 'function hydrateFeedbackFields('),
    c
  );
  c.window.applyDailyEnergySuggestion('2026-11-21');
  c.window.swapPlan('2026-11-21');
  c.window.challengePlan('2026-11-22');
  assert.equal(messages.length,3);
  assert.ok(messages.every(message=>message.includes('周末')||message.includes('周六')));
});
