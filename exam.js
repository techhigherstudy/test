/* Exam engine (UI). Timing source of truth = HS.api.clock (server in backend phase). */
(function(){
const {$,$$,esc}=HS, E=HS_DATA.exam, u=HS.api.me();
if(!u){location.replace('index.html');return}
let at=HS.api.attempt();
if(!at){location.replace('instructions.html');return}
if(at.submitted){location.replace('result.html');return}
const paper=HS.api.paper(); const last=E.sections.length-1;
let qi=0, tick=null, draft='';

const secQs=()=>paper.filter(q=>q.section===E.sections[at.secIdx].id);
const hasAns=q=>{const a=at.answers[q.id];return a!==undefined&&a!==null&&a!==''};
const st=q=>{const a=hasAns(q),m=at.marked[q.id],v=at.visited[q.id];return a&&m?'ansmark':m?'mark':a?'ans':v?'na':''};
const save=()=>HS.api.saveState(at);
const persistPos=()=>{at.lastQ=at.lastQ||{};at.lastQ[at.secIdx]=qi;save()};

/* ---- section timing (server authoritative; handles long absences after refresh) ---- */
function syncSections(){
  let moved=false;
  while(at.secIdx<last && HS.api.clock.now()>=at.secEnds[at.secIdx]){HS.api.advance(at,at.secEnds[at.secIdx]);moved=true;qi=0}
  if(at.secIdx===last && HS.api.clock.now()>=at.secEnds[last]){finish(true);return 'done'}
  return moved?'moved':null;
}
function finish(auto){clearInterval(tick);HS.api.submit(at);if(auto)HS.toast('Time is up. Your test was submitted.');setTimeout(()=>location.href='result.html',auto?900:100)}

/* ---- render shell once ---- */
function shell(){
  $('#app').innerHTML=`
  <div class="ex-top"><div class="container row1" style="max-width:1500px">
    <div class="ex-logo"><img src="assets/img/logo.svg" alt="higher.study"></div>
    <div class="timer-box"><div><div class="lbl" id="tlabel"></div><div class="time" id="timer">00:00:00</div></div><button class="btn-submit" id="btn-submit-top">Submit Test</button></div>
  </div>
  <div class="ex-secbar"><div class="container" style="max-width:1500px" id="tabs"></div></div></div>
  <div class="ex-main"><div id="left"></div>
   <aside class="side"><div class="panel user"><div class="avatar">${HS.icons.user}</div><div><b>${esc(u.name)}</b><span>${esc(u.email)}</span></div></div><div class="panel palette" id="pal"></div></aside></div>`;
  $('#btn-submit-top').onclick=openSubmit;
}
function renderTabs(){
  $('#tabs').innerHTML=`<span class="lab">SECTIONS</span>`+E.sections.map((s,i)=>{
    const c=i<at.secIdx?'locked':i===at.secIdx?'active':'upcoming';
    return `<button class="sec-tab ${c}" data-i="${i}">${s.id}${i<at.secIdx?HS.icons.lock:''}</button>`}).join('');
  $('#tlabel').textContent=E.sections[at.secIdx].id+' TIME LEFT';
}
$('#app').addEventListener('click',e=>{
  const t=e.target.closest('.sec-tab');if(t){const i=+t.dataset.i;if(i<at.secIdx)HS.toast('This section is closed.','warn');else if(i>at.secIdx)HS.toast('This section opens after you finish the current one.','warn')}
});

/* ---- question render ---- */
function renderQ(){
  const qs=secQs(), q=qs[qi]; at.visited[q.id]=true; persistPos();
  const sel=at.answers[q.id];
  const opts=q.type==='TITA'?`
    <div class="tita"><input id="tita" inputmode="decimal" autocomplete="off" placeholder="Type your answer" value="${esc(sel??'')}">
     <div class="keypad">${[1,2,3,4,5,6,7,8,9,'.',0,'-'].map(k=>`<button type="button" data-k="${k}">${k}</button>`).join('')}<button type="button" class="wide" data-k="bk" style="grid-column:span 2">⌫ Backspace</button><button type="button" class="wide" data-k="clr">Clear</button></div>
     <button type="button" class="save" id="tita-save">Save answer</button></div>`
   :q.o.map((o,i)=>`<button class="opt ${sel===i?'sel':''}" data-o="${i}"><span class="k">${'ABCD'[i]}</span><span>${esc(o)}</span></button>`).join('');
  const isLastQ=qi===qs.length-1, isLastSec=at.secIdx===last;
  const next=isLastQ?(isLastSec?'Submit Test':'Next Section'):'Save & Next';
  $('#left').innerHTML=`
   ${q.passage?`<div class="panel passage" id="passage">${q.passage}</div>`:''}
   <div class="panel qcard"><div class="qhead"><div class="qno"><b>Question ${qi+1}</b> of ${qs.length}</div>
     <div class="tags"><span class="tag m">Marks +${q.marks}</span><span class="tag n">Negative ${q.neg===0?'0':q.neg}</span><span class="tag t">${q.type}</span></div></div>
     <div class="qtext">${esc(q.q)}</div>${opts}</div>
   <div class="panel footbar"><div class="l"><button class="btn-pill review" id="b-mark">Mark for Review &amp; Next</button><button class="btn-pill" id="b-clear">Clear Response</button></div>
     <div class="r"><button class="btn-pill" id="b-prev" ${qi===0?'disabled':''}>Previous</button><button class="primary ${isLastQ&&isLastSec?'final':''}" id="b-next">${next}</button></div></div>`;
  renderPal();
}
function renderPal(){
  const qs=secQs(), c={ans:0,na:0,nv:0,mk:0};
  qs.forEach(q=>{const s=st(q);if(s==='ans'||s==='ansmark')c.ans++;else if(s==='na')c.na++;else if(s==='')c.nv++;if(s==='mark'||s==='ansmark')c.mk++});
  $('#pal').innerHTML=`<div class="legend"><span><i style="background:var(--green)"></i>Answered (${c.ans})</span><span><i style="background:var(--danger)"></i>Not answered (${c.na})</span><span><i style="background:#e8e2de;border:1px solid #d6cdc7"></i>Not visited (${c.nv})</span><span><i style="background:var(--purple)"></i>Marked (${c.mk})</span></div>
   <div class="grid">${qs.map((q,i)=>`<button class="qb ${st(q)} ${i===qi?'cur':''}" data-i="${i}" aria-label="Question ${i+1}">${i+1}</button>`).join('')}</div>`;
}

/* ---- interactions ---- */
function go(i){qi=i;renderQ();window.scrollTo({top:0,behavior:'smooth'})}
function advanceQ(){const n=secQs().length;if(qi<n-1)go(qi+1);else renderQ()}
$('#app').addEventListener('click',e=>{
  const qs=secQs(),q=qs[qi];
  const o=e.target.closest('[data-o]');if(o){at.answers[q.id]=+o.dataset.o;save();HS.track('question_answered');renderQ();return}
  const b=e.target.closest('.qb');if(b){go(+b.dataset.i);return}
  const k=e.target.closest('[data-k]');if(k){const inp=$('#tita'),v=k.dataset.k;if(v==='bk')inp.value=inp.value.slice(0,-1);else if(v==='clr')inp.value='';else inp.value+=v;titaSave(inp.value);return}
  if(e.target.id==='tita-save'){titaSave($('#tita').value);HS.toast('Answer saved.');return}
  if(e.target.id==='b-clear'){delete at.answers[q.id];save();renderQ();return}
  if(e.target.id==='b-mark'){at.marked[q.id]=true;save();advanceQ();return}
  if(e.target.id==='b-prev'){if(qi>0)go(qi-1);return}
  if(e.target.id==='b-next'){
    if(qi<qs.length-1){at.marked[q.id]=false;save();go(qi+1)}
    else if(at.secIdx<last)openSection(); else openSubmit(); return}
});
document.addEventListener('input',e=>{if(e.target.id==='tita')titaSave(e.target.value)});
function titaSave(v){const q=secQs()[qi];v=v.replace(/[^0-9.\-]/g,'');const el=$('#tita');if(el&&el.value!==v)el.value=v;
  if(v==='')delete at.answers[q.id];else at.answers[q.id]=v;save();renderPal()}

/* ---- modals ---- */
document.addEventListener('click',e=>{if(e.target.closest('[data-close]')||e.target.classList.contains('overlay')){HS.closeModal('m-section');HS.closeModal('m-submit')}});
function openSection(){
  const un=secQs().filter(q=>!hasAns(q)).length, nxt=E.sections[at.secIdx+1].id;
  $('#m-section-txt').textContent=`You have ${un?`not completed this section. ${un} question${un>1?'s are':' is'} unanswered.`:'answered every question in this section.'} Do you still want to move to ${nxt}? You will not be able to return to this section once you leave.`;
  HS.openModal('m-section');
}
$('#m-section-go').onclick=()=>{HS.closeModal('m-section');HS.api.advance(at);qi=0;renderTabs();renderQ();window.scrollTo(0,0)};
function openSubmit(){
  const all=paper, ans=all.filter(hasAns).length, mk=all.filter(q=>at.marked[q.id]).length;
  $('#m-sum').innerHTML=`<div><span>Total questions</span><b>${all.length}</b></div><div><span>Answered</span><b>${ans}</b></div><div><span>Not answered</span><b>${all.length-ans}</b></div><div><span>Marked for review</span><b>${mk}</b></div><hr>`+
    E.sections.map(s=>{const qs=all.filter(q=>q.section===s.id);return `<div><span>${s.id} — unanswered</span><b>${qs.filter(q=>!hasAns(q)).length}</b></div>`}).join('');
  HS.openModal('m-submit');
}
$('#m-submit-go').onclick=()=>{HS.closeModal('m-submit');finish(false)};

/* ---- timer ---- */
function loop(){
  const r=syncSections();
  if(r==='done')return;
  if(r==='moved'){HS.toast('This section is closed.','warn');renderTabs();renderQ()}
  const left=Math.ceil((at.secEnds[at.secIdx]-HS.api.clock.now())/1000);
  const t=$('#timer');t.textContent=HS.fmt(left);t.classList.toggle('low',left<=300);
}
shell();
if(syncSections()!=='done'){
  qi=Math.min((at.lastQ&&at.lastQ[at.secIdx])||0,secQs().length-1);
  renderTabs();renderQ();loop();tick=setInterval(loop,250);
  window.addEventListener('beforeunload',e=>{if(!at.submitted){e.preventDefault();e.returnValue=''}});
}
})();
