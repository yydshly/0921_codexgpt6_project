import test from 'node:test';
import assert from 'node:assert/strict';
import {assetUrl} from '../src/assetUrl.js';
test('preset assets resolve on a project subpath without rewriting project content',()=>{
  assert.equal(assetUrl('/assets/moon.png','/0921_codexgpt6_project/'),'/0921_codexgpt6_project/assets/moon.png');
  assert.equal(assetUrl('/assets/moon.png','/'),'/assets/moon.png');
  assert.equal(assetUrl('/assets/moon.png','/project'),'/project/assets/moon.png');
});
test('embedded media and user object URLs remain portable',()=>{
  for(const source of ['data:image/png;base64,AQID','blob:https://example.test/abc',undefined])assert.equal(assetUrl(source,'/project/'),source);
});
