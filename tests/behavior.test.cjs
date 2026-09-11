const {test} = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');
const source = fs.readFileSync(path.join(__dirname, '../app.js'), 'utf8');

async function boot({reduced = false, stored = null, broken = false, storageBlocked = false} = {}) {
  const events = {}, documentEvents = {}, classes = new Set(), attributes = {};
  const rendererStates = [];
  let imports = 0, contextLoss;
  const control = {disabled:false,querySelector:()=>({textContent:''}),setAttribute:(key,value)=>attributes[key]=value,addEventListener:(name,fn)=>events[name]=fn};
  const media = {matches:reduced,addEventListener:(_,fn)=>events.motion=fn};
  const classList = {toggle:(name,on)=>on?classes.add(name):classes.delete(name),add:name=>classes.add(name),remove:name=>classes.delete(name)};
  const section = {id:'home',getBoundingClientRect:()=>({top:0})};
  const document = {
    hidden:false,documentElement:{classList,scrollHeight:2000},body:{classList},fonts:{ready:Promise.resolve()},
    querySelector:selector=>selector==='.effects-toggle'?control:selector==='.scroll-progress span'?{style:{}}:{},
    querySelectorAll:selector=>selector==='main > section'?[section]:[],
    addEventListener:(event,fn)=>documentEvents[event]=fn
  };
  const context = vm.createContext({document,matchMedia:query=>query.includes('prefers-reduced')?media:{matches:true},
    localStorage:{getItem:()=>{if(storageBlocked)throw Error('blocked');return stored;},setItem:(_,value)=>{if(storageBlocked)throw Error('blocked');stored=value;}},
    innerHeight:800,scrollY:0,addEventListener:()=>{},requestAnimationFrame:fn=>fn(),console:{warn:()=>{}}});
  const module = new vm.SourceTextModule(source,{context,importModuleDynamically:async()=>{
    imports++;
    if(broken)throw Error('WebGL unavailable');
    const stub = new vm.SyntheticModule(['createScene'],function(){
      this.setExport('createScene',(_canvas,onFailure)=>{contextLoss=onFailure;return {setEnabled:value=>rendererStates.push(value)};});
    },{context});
    await stub.link(()=>{}); await stub.evaluate(); return stub;
  }});
  await module.link(()=>{}); await module.evaluate();
  const settle = ()=>new Promise(resolve=>setImmediate(resolve));
  await settle();
  return {events,documentEvents,document,classes,attributes,control,media,rendererStates,settle,get imports(){return imports;},get stored(){return stored;},loseContext:()=>contextLoss()};
}

test('reduced motion starts with static content without downloading the scene',async()=>{
  const app=await boot({reduced:true});
  assert.equal(app.imports,0); assert.equal(app.attributes['aria-pressed'],'false'); assert.ok(app.classes.has('effects-off'));
});
test('saved preference survives toggling and system motion changes',async()=>{
  const app=await boot();
  assert.equal(app.imports,1); assert.ok(app.classes.has('scene-ready'));
  app.events.click(); assert.equal(app.stored,'off'); assert.equal(app.rendererStates.at(-1),false);
  app.media.matches=true; app.events.motion(); app.media.matches=false; app.events.motion();
  assert.equal(app.attributes['aria-pressed'],'false');
  app.events.click(); await app.settle(); assert.equal(app.imports,1); assert.equal(app.rendererStates.at(-1),true);
});
test('hidden documents pause rendering and visible documents resume',async()=>{
  const app=await boot(); app.document.hidden=true; app.documentEvents.visibilitychange();
  assert.equal(app.rendererStates.at(-1),false);
  app.document.hidden=false; app.documentEvents.visibilitychange(); assert.equal(app.rendererStates.at(-1),true);
});
test('failed scene loading leaves a static page and disabled effects control',async()=>{
  const app=await boot({broken:true}); assert.ok(app.classes.has('effects-off'));
  assert.equal(app.control.disabled,true); assert.equal(app.attributes['aria-pressed'],'false');
});
test('context loss switches from the live scene to the static artwork',async()=>{
  const app=await boot(); app.loseContext(); assert.ok(app.classes.has('effects-off'));
  assert.ok(!app.classes.has('scene-ready')); assert.equal(app.control.disabled,true);
});
test('blocked preference storage does not prevent controls from working',async()=>{
  const app=await boot({storageBlocked:true}); app.events.click(); assert.equal(app.attributes['aria-pressed'],'false');
});
