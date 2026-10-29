// Requires Playwright; optionally set BROWSER_EXECUTABLE to a local Chromium.
const {chromium}=require('playwright');const fs=require('fs');const assert=require('node:assert/strict');const path=require('path');
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.BROWSER_EXECUTABLE,args:['--no-sandbox','--disable-gpu','--disable-software-rasterizer','--disable-dev-shm-usage']});
 const root=path.resolve(__dirname,'..')+'/',html=fs.readFileSync(root+'index.html','utf8').replace(/<script[\s\S]*?<\/script>/g,'').replace(/<link[^>]*>/g,'');
 const errors=[];const page=await browser.newPage({viewport:{width:1180,height:900}});page.on('pageerror',e=>errors.push(e.message));
 await page.route('http://writing.test/**',route=>route.fulfill({contentType:'text/html',body:html}));await page.goto('http://writing.test/');
 for(const p of [root+'app.css',root+'../gi-mobile-nav.css',root+'../gi-cream-theme.css',root+'analytics.css'])await page.addStyleTag({content:fs.readFileSync(p,'utf8')});
 await page.evaluate(()=>{
  window.ESCRITA_SUPABASE_URL='mock';window.ESCRITA_SUPABASE_KEY='mock';window.rows=Array.from({length:22},(_,i)=>({id:String(i),user_id:'u',category:'Criatividade',prompt:['Uma ideia que mudou com o tempo','Uma lembrança de infância','O que você aprendeu esta semana?'][i%3],content:'Texto de exemplo.',word_count:100+i,duration_seconds:360+(i%8)*75,written_at:new Date(Date.now()-i*864e5).toISOString(),nota:i===21?null:5.7+i%8*.4,analise:i===21?'':`Sua ideia se desenvolve com clareza.\n\nObserve como os detalhes ajudam a sustentar o argumento. Continue explorando exemplos concretos e variações no ritmo das frases.`,tipo_escrita:i===21?'':['Reflexiva','Narrativa','Argumentativa','Descritiva'][i%4]}));
  window.supabase={createClient:()=>({auth:{getSession:async()=>({data:{session:{user:{id:'u'}}}})},from:()=>({select(){return this},eq(){return this},order(){return this},async range(a,b){if(window.failRead)return {data:null,error:{message:'Test failure'}};return {data:window.rows.slice(a,b+1),error:null}}})})};
 });
 for(const p of ['analytics-core.js','app.js','analytics.js'])await page.addScriptTag({content:fs.readFileSync(root+p,'utf8')});
 await page.locator('[data-nav="analyses"]').click();await page.waitForFunction(()=>document.getElementById('waTotal').textContent==='22');
 assert.equal(await page.locator('#view-analyses.active').count(),1);assert.equal(await page.locator('#waComments details').count(),21);assert.equal(await page.locator('#waScatterChart circle').count(),21);assert.equal(await page.locator('#waHistoryChart circle').count(),21);
 assert.equal(await page.locator('#waUniqueDays').textContent(),'textos em 22 dias únicos');
 assert.equal(await page.locator('#waWordsPerMinute').textContent(),'11,0');
 assert.equal(await page.locator('#waTypeChart .wa-type-average').count(),5);
 assert((await page.locator('#waFrequencyComparison').textContent()).includes('vs. geral'));
 const geometry=await page.locator('#waHistoryChart').evaluate(el=>({path:el.querySelector('path[stroke]').getAttribute('d'),xs:[...el.querySelectorAll('circle')].map(c=>Number(c.getAttribute('cx')))}));
 assert(geometry.path.includes('C '));const step=geometry.xs[1]-geometry.xs[0];assert(geometry.xs.slice(1).every((x,i)=>Math.abs(x-geometry.xs[i]-step)<1e-6));
 await page.locator('#waComments summary').first().click();assert(await page.locator('#waComments details').first().getAttribute('open')!==null);await page.locator('#waExpandAll').click();assert.equal(await page.locator('#waComments details[open]').count(),21);await page.locator('#waExpandAll').click();assert.equal(await page.locator('#waComments details[open]').count(),0);
 await page.locator('#waScatterChart circle').last().click();assert(await page.locator('#waScatterChart .wa-chart-caption').isVisible());await page.screenshot({path:'/tmp/writing-analyses-desktop.png',fullPage:true});
 for(const viewport of [{width:1194,height:834},{width:834,height:1194}]){
  await page.setViewportSize(viewport);
  const fit=await page.locator('#waHistoryChart svg').evaluate(svg=>{const r=svg.getBoundingClientRect(),p=svg.parentElement.getBoundingClientRect();return {width:r.width,parent:p.width,height:r.height,ratio:r.width/r.height};});
  assert(Math.abs(fit.width-fit.parent)<1);assert(Math.abs(fit.ratio-600/260)<.01);
  assert.equal(await page.locator('#waHistorySubtitle,#waGradeCount').count(),0);
  await page.screenshot({path:`/tmp/writing-ipad-${viewport.width}.png`,fullPage:true});
 }
 await page.setViewportSize({width:390,height:844});await page.screenshot({path:'/tmp/writing-analyses-mobile.png',fullPage:true});
 assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));await page.evaluate(()=>document.documentElement.dataset.theme='dark');await page.screenshot({path:'/tmp/writing-analyses-dark-mobile.png',fullPage:true});
 await page.locator('[data-nav="history"]').click();assert(await page.locator('#view-history').evaluate(e=>e.classList.contains('active')));
 await page.locator('[data-nav="home"]').click();assert(await page.locator('#categoryPills').isVisible());
 await page.evaluate(()=>{window.rows=[]});await page.locator('[data-nav="analyses"]').click();await page.waitForFunction(()=>document.getElementById('waTotal').textContent==='0');assert.equal(await page.locator('#waAverage').textContent(),'—');
 await page.evaluate(()=>{window.failRead=true});await page.locator('[data-nav="analyses"]').click();await page.waitForFunction(()=>document.getElementById('waStatus').textContent.includes('Não consegui'));
 assert.deepEqual(errors,[]);console.log('PASS: tab navigation, Supabase field mapping, charts, comment toggles, mobile overflow, existing history/home, empty state, load failure.');await browser.close();
})().catch(e=>{console.error(e);process.exit(1)});
