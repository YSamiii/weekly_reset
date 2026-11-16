import test from 'node:test';
import assert from 'node:assert/strict';
import syncHandler from '../vercel-backend/api/sync.js';
import { isoSeconds, isoMinutes } from '../vercel-backend/api/_lib/youtube.js';

function mockResponse() {
  const headers = {};
  return {
    statusCode: 200, body: '',
    setHeader(key, value) { headers[key] = value; },
    end(value = '') { this.body = String(value); },
    json() { return JSON.parse(this.body); },
    headers
  };
}

test('YouTube durations are parsed in exact seconds', () => {
  assert.equal(isoSeconds('PT59S'), 59);
  assert.equal(isoSeconds('PT2M59S'), 179);
  assert.equal(isoSeconds('PT3M'), 180);
  assert.equal(isoSeconds('PT29M33S'), 1773);
  assert.equal(isoMinutes('PT29M33S'), 30);
  assert.equal(isoSeconds(''), 0);
});

test('sync excludes videos shorter than 180 seconds or missing duration', async () => {
  process.env.YOUTUBE_API_KEY = 'test-only-not-a-real-key';
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async (raw) => {
    const url = new URL(String(raw));
    let body;
    if (url.pathname.endsWith('/channels')) {
      body = { items:[{ id:'UC0123456789012345678901', snippet:{title:'Demo'}, contentDetails:{relatedPlaylists:{uploads:'UU0123'}} }] };
    } else if (url.pathname.endsWith('/playlistItems')) {
      body = { items: ['short59','short179','borderline180','normal181','missing'].map(videoId => ({ contentDetails:{videoId},snippet:{title:videoId} })) };
    } else if (url.pathname.endsWith('/videos')) {
      const durations = {short59:'PT59S',short179:'PT2M59S',borderline180:'PT3M',normal181:'PT3M1S'};
      body = { items:Object.entries(durations).map(([id,duration])=>({id,snippet:{title:id},contentDetails:{duration}})).concat([{id:'missing',snippet:{title:'missing'},contentDetails:{}}]) };
    } else throw new Error('Unexpected YouTube call: ' + url.pathname);
    return { ok:true, async json(){ return body; } };
  };
  try {
    const req={method:'POST',headers:{'x-forwarded-for':'198.51.100.42'},body:{channels:[{name:'Demo',identifier:'@demo'}],maxResults:10}};
    const res=mockResponse();
    await syncHandler(req,res);
    assert.equal(res.statusCode, 200, res.body);
    assert.equal(res.json().ok,true);
    assert.deepEqual(res.json().videos.map(x=>x.id),['borderline180','normal181']);
    assert.deepEqual(res.json().videos.map(x=>x.durationSeconds),[180,181]);
  } finally { globalThis.fetch=originalFetch; delete process.env.YOUTUBE_API_KEY; }
});
