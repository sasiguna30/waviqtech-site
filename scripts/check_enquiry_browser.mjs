// Offline browser tests. Requires a local headless Chrome with remote debugging.
// No real email or Turnstile requests: provider/config requests are intercepted.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
const root = process.cwd();
const types = {'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.png':'image/png'};
const server = http.createServer(async (req,res) => {
  try {
    const name = decodeURIComponent(new URL(req.url,'http://localhost').pathname);
    const file = path.resolve(root,'.'+name);
    if (!file.startsWith(root+path.sep) || !types[path.extname(file)]) throw Error();
    res.setHeader('Content-Type',types[path.extname(file)]);
    res.end(await fs.readFile(file));
  } catch { res.statusCode=404;res.end(); }
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const origin='http://127.0.0.1:'+server.address().port;
const debug=process.env.CHROME_DEBUG_URL || 'http://127.0.0.1:9223';
let ws,target;
try {
  target=await (await fetch(debug+'/json/new?about:blank',{method:'PUT'})).json();
  ws=new WebSocket(target.webSocketDebuggerUrl);
  await new Promise(resolve=>ws.onopen=resolve);
  let id=0;const pending=new Map();
  ws.onmessage=event=>{const m=JSON.parse(event.data);if(m.id){const p=pending.get(m.id);pending.delete(m.id);if(m.error)p.reject(Error(m.error.message));else p.resolve(m.result);}};
  const call=(method,params={})=>new Promise((resolve,reject)=>{pending.set(++id,{resolve,reject});ws.send(JSON.stringify({id,method,params}));});
  const evaluate=async expression=>{const r=await call('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true});if(r.exceptionDetails)throw Error(r.exceptionDetails.text);return r.result.value;};
  const until=async expression=>{for(let i=0;i<100;i++){if(await evaluate(expression))return;await new Promise(r=>setTimeout(r,20));}throw Error('Browser condition timed out: '+expression);};
  await call('Page.enable');
  let injected;
  async function load(mode,width=375){
    if(injected)await call('Page.removeScriptToEvaluateOnNewDocument',{identifier:injected});
    const script=`(() => {
      const mode=${JSON.stringify(mode)};
      const state=window.__enquiryTest={mode,submitted:[],calls:[],hold:false};
      window.fetch=async (url,options={})=>{
        const value=String(url);state.calls.push(value);
        if(value.endsWith('assets/enquiry-config.json'))return Response.json({enabled:mode!=='disabled',apiBaseUrl:'https://api.example.test'});
        if(value.endsWith('/config'))return Response.json(mode==='not-ready'?{enabled:false}:{enabled:true,turnstileSiteKey:'mock-public-key'},{status:mode==='not-ready'?503:200});
        if(value.endsWith('/submit')){
          state.submitted.push(JSON.parse(options.body));
          if(state.hold)await new Promise(resolve=>state.release=resolve);
          if(state.mode==='network')throw Error('Offline');
          const code=Number(state.mode);
          if(code)return Response.json({accepted:false,fields:code===422?['email']:[]},{status:code});
          if(state.mode==='malformed')return Response.json({ok:true});
          return Response.json({accepted:true});
        }
        throw Error('Unexpected network request');
      };
      const append=HTMLHeadElement.prototype.append;
      HTMLHeadElement.prototype.append=function(...items){
        if(items[0]?.src?.startsWith('https://challenges.cloudflare.com/turnstile/')){
          window.turnstile={render:(selector,opts)=>{state.captcha=opts;setTimeout(()=>opts.callback('mock-token'),0);return 'mock-widget';},reset:()=>setTimeout(()=>state.captcha.callback('mock-token'),0)};
          setTimeout(()=>items[0].onload(),0);return;
        }
        return append.apply(this,items);
      };
    })();`;
    injected=(await call('Page.addScriptToEvaluateOnNewDocument',{source:script})).identifier;
    await call('Emulation.setDeviceMetricsOverride',{width,height:900,deviceScaleFactor:1,mobile:false});
    await call('Page.navigate',{url:origin+'/contact.html'});
    await until("document.readyState==='complete' && Boolean(document.querySelector('#enquiry-form')) && Boolean(window.__enquiryTest)");
    if(!['disabled','not-ready'].includes(mode))await until("!document.querySelector('#enquiry-form button').disabled");
    else await until("window.__enquiryTest.calls.length>="+(mode==='disabled'?1:2));
  }
  const fill=()=>evaluate(`(()=>{const f=document.querySelector('#enquiry-form');Object.entries({name:'Example Visitor',email:'visitor@example.com',phone:'+1 343 555 0123',country:'Canada',enquiry:'Service and pricing question.'}).forEach(([k,v])=>{f.elements[k].value=v;f.elements[k].dispatchEvent(new Event('input',{bubbles:true}))})})()`);
  const submit=()=>evaluate("document.querySelector('#enquiry-form').dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}))");
  let checks=0;
  for(const mode of ['disabled','not-ready']){
    await load(mode);await submit();
    assert(await evaluate("document.querySelector('#enquiry-form fieldset').disabled && document.querySelector('#enquiry-form button').disabled && window.__enquiryTest.submitted.length===0 && document.querySelector('#enquiry-status').textContent.includes('unavailable')"));checks++;
  }
  await load('success');await submit();
  assert.equal(await evaluate('window.__enquiryTest.submitted.length'),0);checks++;
  await fill();await evaluate("document.querySelector('#enquiry-form').elements.phone.value='123'");await submit();
  assert.equal(await evaluate('window.__enquiryTest.submitted.length'),0);checks++;
  for(const mode of ['422','400','429','502','503','malformed','network']){
    await load(mode);await fill();await submit();
    await until("document.querySelector('#enquiry-status').dataset.state==='error'");
    assert(await evaluate("document.querySelector('#enquiry-form').elements.name.value==='Example Visitor' && document.querySelector('#enquiry-form').elements.enquiry.value==='Service and pricing question.' && !document.querySelector('#enquiry-form fieldset').disabled"));checks++;
  }
  await load('502');await fill();await submit();
  await until("document.querySelector('#enquiry-status').dataset.state==='error' && !document.querySelector('#enquiry-form button').disabled");
  await submit();await until('window.__enquiryTest.submitted.length===2');
  assert(await evaluate('window.__enquiryTest.submitted[0].request_id===window.__enquiryTest.submitted[1].request_id'));checks++;
  await until("!document.querySelector('#enquiry-form button').disabled");
  await evaluate("document.querySelector('#enquiry-form').elements.enquiry.value='Changed question';window.__enquiryTest.mode='success';window.__enquiryTest.hold=true");
  await submit();await submit();await until('window.__enquiryTest.submitted.length===3');
  assert(await evaluate("window.__enquiryTest.submitted[1].request_id!==window.__enquiryTest.submitted[2].request_id && document.querySelector('#enquiry-form button').disabled && document.querySelector('#enquiry-status').dataset.state!=='success'"));checks++;
  await evaluate('window.__enquiryTest.release()');
  await until("document.querySelector('#enquiry-status').dataset.state==='success'");
  assert(await evaluate("document.querySelector('#enquiry-status').textContent.includes('saved and accepted for email delivery') && document.querySelector('#enquiry-form').elements.enquiry.value==='' && window.__enquiryTest.submitted.length===3"));checks++;
  for(const width of [375,768,1440]){
    await load('success',width);await fill();
    assert(await evaluate('document.documentElement.scrollWidth<=innerWidth'));checks++;
  }
  console.log('PASS '+checks+' enquiry browser checks: disabled configuration, validation, provider/spam/rate/network failures, retained fields, idempotent retries, duplicate prevention, accepted-only success and responsive form. No real messages sent.');
} finally {
  if(ws)ws.close();
  if(target)await fetch(debug+'/json/close/'+target.id).catch(()=>{});
  server.close();
}
