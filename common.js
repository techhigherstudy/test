/* HS — shared helpers: layout (header/footer), toasts, modals, tracking */
window.HS=window.HS||{};
(function(){
const $=(s,r=document)=>r.querySelector(s), $$=(s,r=document)=>[...r.querySelectorAll(s)];
HS.$=$;HS.$$=$$;
HS.esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
HS.icons={
 chev:'<svg class="chev" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="1.8"><path d="m2 4 4 4 4-4"/></svg>',
 search:'<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>',
 eye:'<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/></svg>',
 eyeoff:'<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M3 3l18 18M10.6 6.2A9.8 9.8 0 0 1 12 6c6.4 0 10 6 10 6a17 17 0 0 1-3.2 3.9M6.4 7.6C3.9 9.3 2 12 2 12s3.6 7 10 7c1.6 0 3-.4 4.3-1"/></svg>',
 lock:'<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/></svg>',
 user:'<svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="8" r="4"/><path d="M4 21c1-4 4-6 8-6s7 2 8 6"/></svg>'
};
/* ---- lead/event tracking (backend: POST /api/events → lead_activities, never overwritten) ---- */
HS.track=function(type,extra){
  try{const k='hs_events';const ev=JSON.parse(localStorage.getItem(k)||'[]');
  ev.push({id:Date.now().toString(36)+Math.random().toString(36).slice(2,6),type,page:location.pathname,at:new Date().toISOString(),extra:extra||null});
  localStorage.setItem(k,JSON.stringify(ev.slice(-300)));}catch(e){}
  try{HS.sheet&&HS.sheet.event(type,extra)}catch(e){}
};
/* ---- toast ---- */
HS.toast=function(msg,kind){
  let w=$('.toast-wrap');if(!w){w=document.createElement('div');w.className='toast-wrap';document.body.appendChild(w)}
  const t=document.createElement('div');t.className='toast '+(kind||'');t.innerHTML=`<i>${kind==='warn'?'!':'✓'}</i><span>${HS.esc(msg)}</span>`;
  w.appendChild(t);setTimeout(()=>{t.style.opacity=0;t.style.transition='.3s';setTimeout(()=>t.remove(),300)},2800);
};
/* ---- simple modal helpers ---- */
HS.openModal=id=>{const o=document.getElementById(id);if(o){o.classList.add('open');document.body.style.overflow='hidden'}};
HS.closeModal=id=>{const o=document.getElementById(id);if(o){o.classList.remove('open');document.body.style.overflow=''}};
/* ---- site header / footer (becomes Blade partials, menu from CMS) ---- */
HS.cmsDefault={heroPre:'Prepare for CAT with',heroEm:'online mock tests',heroText:'Practice with realistic mock examinations, improve your preparation, evaluate your performance and identify areas for improvement.',
 menu:[{t:'Colleges',href:'https://higher.study/colleges'},{t:'Courses',href:'https://higher.study/courses'},{t:'Exams',href:'https://higher.study/exams'},{t:'Blog',href:'https://higher.study/blog'},{t:'Free Resources',badge:'FREE',href:'index.html#available-tests'},{t:'Tools',dd:1,href:'#'}],
 footerText:'Realistic mock tests, instant analysis and free counselling to help you get into your dream college.',contactEmail:'support@higher.study',banner:{on:false,text:''}};
HS.cms=function(){try{return Object.assign({},HS.cmsDefault,JSON.parse(localStorage.getItem('hs_cms')||'{}'))}catch(e){return HS.cmsDefault}};
HS.menu=HS.cms().menu.map(m=>{const d=HS.cmsDefault.menu.find(x=>x.t===m.t);return Object.assign({},m,m.href?{}:{href:d&&d.href||'#'})});
HS.ADMINS0=[{id:1,name:'Super Admin',email:'admin@higher.study',pw:'Admin@12345',role:'Super Admin',active:true},
 {id:2,name:'Priya (Content)',email:'content@higher.study',pw:'Content@12345',role:'Content Manager',active:true},
 {id:3,name:'Rahul (Leads)',email:'leads@higher.study',pw:'Leads@12345',role:'Lead Manager',active:true}];
/* Admin sign-in from the main login popup. Reads the same admin list the panel uses (includes admins created in the panel). Backend phase: one /login endpoint returns the role. */
HS.adminAuth=function(id,pw){try{const st=JSON.parse(localStorage.getItem('hs_admin_v2')||'null'),list=(st&&st.admins)||HS.ADMINS0;
  const a=list.find(x=>x.email.toLowerCase()===String(id).trim().toLowerCase()&&x.pw===pw&&x.active);
  if(a){localStorage.setItem('hs_admin_session',a.email);localStorage.setItem('hs_admin_via','main');return a}}catch(e){}return null};
HS.counsellingUrl=()=>(window.HS_CONFIG&&HS_CONFIG.COUNSELLING_URL)||'https://higher.study/enquiry/admissions-2026';
HS.isExternal=u=>/^https?:\/\//i.test(u)&&!u.startsWith(location.origin);
HS.header=function(crumbs){
  const u=HS.api&&HS.api.me();
  const nav=HS.menu.map(m=>`<a href="${HS.esc(m.href||'#')}"${HS.isExternal(m.href||'')?' target="_blank" rel="noopener"':''}>${m.t}${m.badge?`<span class="badge-free">${m.badge}</span>`:''}${m.dd?HS.icons.chev:''}</a>`).join('');
  let adm=null;try{adm=localStorage.getItem('hs_admin_session')}catch(e){}
  const admBtn=adm?`<a class="btn btn-outline" href="admin.html">Admin panel</a>`:'';
  const right=admBtn+(u?`<a class="btn btn-outline" href="result.html">My dashboard</a><a href="#" id="signout" style="font-weight:600">Sign out</a>`:`<button class="btn btn-primary btn-lg" data-open-register style="padding:14px 28px">Login / Register</button>`);
  const cr=(crumbs||[]).map((c,i)=>i===crumbs.length-1?`<span class="cur">${c[0]}</span>`:`<a href="${c[1]||'#'}">${c[0]}</a><span>›</span>`).join('');
  const bn=HS.cms().banner;document.getElementById('site-header').innerHTML=(bn&&bn.on&&bn.text?`<div style="background:var(--yellow);color:#4a2a00;text-align:center;padding:8px 16px;font-weight:700;font-size:14px">${HS.esc(bn.text)}</div>`:'')+`
  <header class="site-header"><div class="container bar">
    <a class="brand" href="index.html"><img src="logo.svg" alt="higher.study logo"><span>higher.study</span></a>
    <nav class="nav" id="nav">${nav}</nav>
    <div class="header-actions">${right}<button class="icon-btn hide-sm" aria-label="Search">${HS.icons.search}</button><button class="icon-btn hamburger" id="burger" aria-label="Menu"><svg width="26" height="26" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.2" fill="none"><path d="M3 6h18M3 12h18M3 18h18"/></svg></button></div>
  </div></header>
  <div class="crumbs"><div class="container">${cr}</div></div>`;
  $('#burger').onclick=()=>$('#nav').classList.toggle('open');
  const so=$('#signout');if(so)so.onclick=e=>{e.preventDefault();HS.api.logout();location.href='index.html'};
};
HS.footer=function(){
  const el=document.getElementById('site-footer');if(!el)return;
  el.innerHTML=`<footer class="site-footer"><div class="container"><div class="cols">
   <div><h4>higher.study</h4><p>${HS.esc(HS.cms().footerText)}</p><p>${HS.esc(HS.cms().contactEmail)}</p></div>
   <div><h4>Exams</h4><a href="#">CAT</a><a href="#">XAT</a><a href="#">SNAP</a><a href="#">NMAT</a></div>
   <div><h4>Resources</h4><a href="#">Free Resources</a><a href="#">Blog</a><a href="#">Tools</a></div>
   <div><h4>Company</h4><a href="#">About</a><a href="#">Contact</a><a href="#">Terms</a><a href="#">Privacy Policy</a></div>
  </div><div class="copy">© ${new Date().getFullYear()} higher.study. All rights reserved.</div></div></footer>`;
};
HS.fmt=sec=>{sec=Math.max(0,Math.floor(sec));const h=String(Math.floor(sec/3600)).padStart(2,'0'),m=String(Math.floor(sec%3600/60)).padStart(2,'0'),s=String(sec%60).padStart(2,'0');return `${h}:${m}:${s}`};

})();

/* ---------- Google Sheets copy (secondary). Queue -> Apps Script web app. MySQL stays primary in the backend phase. ---------- */
HS.cfg=()=>window.HS_CONFIG||{};
HS.sid=()=>{try{let s=localStorage.getItem('hs_sid');if(!s){s='S'+Date.now().toString(36)+Math.random().toString(36).slice(2,8);localStorage.setItem('hs_sid',s)}return s}catch(e){return'anon'}};
HS.sheet=(function(){
  const QK='hs_sheet_q',SK='hs_sheet_state';
  const gq=()=>{try{return JSON.parse(localStorage.getItem(QK)||'[]')}catch(e){return[]}};
  const sq=q=>{try{localStorage.setItem(QK,JSON.stringify(q.slice(-1000)))}catch(e){}};
  const gs=()=>{try{return JSON.parse(localStorage.getItem(SK)||'{}')}catch(e){return{}}};
  const ss=o=>{try{localStorage.setItem(SK,JSON.stringify(Object.assign(gs(),o)))}catch(e){}};
  let busy=false;
  const uid=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,8);
  async function flush(force){
    const c=HS.cfg(),q=gq();if(!c.SHEETS_URL||!q.length||busy)return;
    const st=gs();if(!force&&st.nextTry&&Date.now()<st.nextTry)return;
    busy=true;const batch=q.slice(0,25);
    try{
      // no-cors: the browser cannot read Apps Script's reply, so retries are made safe by unique ids (the script ignores repeats)
      await fetch(c.SHEETS_URL,{method:'POST',mode:'no-cors',keepalive:true,headers:{'Content-Type':'text/plain;charset=utf-8'},body:JSON.stringify({token:c.SHEETS_TOKEN,items:batch})});
      const done=new Set(batch.map(b=>b.eid));sq(gq().filter(b=>!done.has(b.eid)));
      ss({fails:0,nextTry:0,lastOk:new Date().toISOString(),sent:(gs().sent||0)+batch.length,lastErr:''});busy=false;if(gq().length)setTimeout(flush,250);
    }catch(e){const f=(gs().fails||0)+1;ss({fails:f,nextTry:Date.now()+Math.min(300000,2000*Math.pow(2,f)),lastErr:String(e&&e.message||e)});busy=false}
  }
  function send(tab,data,opt){opt=opt||{};const q=gq();q.push({eid:opt.id||tab+'-'+uid(),tab,mode:opt.mode||'append',data,at:new Date().toISOString()});sq(q);flush()}
  const dev=()=>/Mobi|Android/i.test(navigator.userAgent)?'Mobile':'Desktop';
  const br=()=>{const u=navigator.userAgent;return /Edg\//.test(u)?'Edge':/Chrome\//.test(u)?'Chrome':/Firefox\//.test(u)?'Firefox':/Safari\//.test(u)?'Safari':'Other'};
  const me=()=>{try{return window.HS&&HS.api&&HS.api.me()}catch(e){return null}};
  const att=()=>{try{return HS.api.attempt()}catch(e){return null}};
  const STAGE={website_visited:'Website Visited',start_test_clicked:'Start Test Clicked',registration_popup_opened:'Registration Popup Opened',registration_started:'Registration Started',registration_completed:'Registration Completed',instructions_viewed:'Instructions Viewed',exam_started:'Examination Started',exam_submitted:'Examination Submitted',result_viewed:'Result Viewed',counselling_button_clicked:'Counselling Button Clicked'};
  function lead(stage){const u=me();if(!u)return;const a=att(),utm=u.utm||{};
    send('All_Leads',{lead_id:u.leadId,student_id:u.studentId,name:u.name,mobile:u.mobile,email:u.email,registered_at:u.at,stage,exam:'CAT Full Length Mock 1',
      exam_started:a?'Yes':'No',exam_submitted:a&&a.submitted?'Yes':'No',marks:a&&a.result?a.result.marks:'',percentage:a&&a.result?a.result.percentage:'',
      source:utm.utm_source?'Campaign':'Direct',utm_source:utm.utm_source||'direct',utm_medium:utm.utm_medium||'none',utm_campaign:utm.utm_campaign||'none',device:dev(),browser:br(),landing_page:'/cat-mock-test',updated_at:new Date().toISOString()},{id:u.leadId,mode:'upsert'})}
  function event(type){
    if(type==='question_answered'||!STAGE[type])return;
    const u=me(),utm=(u&&u.utm)||(()=>{try{return Object.fromEntries(new URLSearchParams(location.search))}catch(e){return{}}})();
    if(type==='website_visited'){try{if(sessionStorage.getItem('hs_v'))return;sessionStorage.setItem('hs_v','1')}catch(e){}
      send('Website_Visitors',{session_id:HS.sid(),page:location.pathname,event_type:type,source:utm.utm_source?'Campaign':'Direct',utm_source:utm.utm_source||'direct',utm_medium:utm.utm_medium||'none',utm_campaign:utm.utm_campaign||'none',device:dev(),browser:br()});return}
    const row={event_time:new Date().toISOString(),lead_id:u?u.leadId:'',student_id:u?u.studentId:'',session_id:HS.sid(),exam:'CAT Full Length Mock 1',event_type:type,stage:STAGE[type],page:location.pathname,source:utm.utm_source||'direct',device:dev()};
    send('Lead_Stages',row);
    if(type==='exam_started'||type==='exam_submitted')send('Exam_Activity',{event_time:row.event_time,lead_id:row.lead_id,student_id:row.student_id,exam:row.exam,event_type:type,session_id:row.session_id});
    if(type==='registration_completed'&&u)send('Registrations',{lead_id:u.leadId,student_id:u.studentId,name:u.name,mobile:u.mobile,email:u.email,registered_at:u.at,source:utm.utm_source?'Campaign':'Direct',utm_source:utm.utm_source||'direct',utm_medium:utm.utm_medium||'none',utm_campaign:utm.utm_campaign||'none',device:dev(),browser:br(),landing_page:'/cat-mock-test'},{id:'REG-'+u.leadId,mode:'upsert'});
    if(['registration_completed','exam_started','exam_submitted','result_viewed','instructions_viewed'].includes(type))lead(STAGE[type]);
  }
  function results(at,rows){const u=me()||{},r=at.result;
    send('Exam_Results',{attempt_id:at.id,lead_id:u.leadId||'',student_id:u.studentId||'',name:u.name||'',exam:'CAT Full Length Mock 1',marks:r.marks,max_marks:r.max,percentage:r.percentage,attempted:r.attempted,correct:r.correct,wrong:r.wrong,accuracy:r.accuracy,time_taken_sec:r.timeTakenSec,submitted_at:new Date(at.submittedAt).toISOString(),
      VARC_marks:r.sections[0].marks,DILR_marks:r.sections[1].marks,QA_marks:r.sections[2].marks},{id:'RES-'+at.id,mode:'upsert'});
    (rows||[]).forEach(x=>send('Exam_Responses',Object.assign({attempt_id:at.id,lead_id:u.leadId||'',exam:'CAT Full Length Mock 1'},x),{id:'RSP-'+at.id+'-'+x.question_no,mode:'upsert'}));}
  async function ping(){const c=HS.cfg();if(!c.SHEETS_URL)return{ok:false,error:'SHEETS_URL is empty in config.js'};
    try{const r=await fetch(c.SHEETS_URL+(c.SHEETS_URL.includes('?')?'&':'?')+'action=ping&token='+encodeURIComponent(c.SHEETS_TOKEN));return await r.json()}catch(e){return{ok:false,error:'Could not read the reply (browser blocked it or the URL is wrong). Check the sheet for new rows instead.'}}}
  return {send,flush:()=>flush(true),event,lead,results,ping,status:()=>Object.assign({configured:!!HS.cfg().SHEETS_URL,pending:gq().length,sent:0,fails:0},gs())};
})();
setTimeout(()=>{try{HS.sheet.flush()}catch(e){}},1500);
window.addEventListener('online',()=>{try{HS.sheet.flush()}catch(e){}});
