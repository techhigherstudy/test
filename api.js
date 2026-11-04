/* HS.api — mock backend (localStorage). Every method mirrors a planned Laravel endpoint,
   so the backend phase only replaces the bodies with fetch() calls. */
(function(){
const K={user:'hs_user',attempt:'hs_attempt',users:'hs_users'};
const get=(k,d)=>{try{return JSON.parse(localStorage.getItem(k))??d}catch(e){return d}};
const set=(k,v)=>{try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}};
const D=window.HS_DATA, exam=D.exam, QS=D.questions;
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const uid=p=>p+Date.now().toString(36).toUpperCase()+Math.floor(Math.random()*999);
// Server clock: backend will return `serverNow`; client keeps only the offset (browser clock changes can't move the timer).
const clock={offset:0,now(){return Date.now()+this.offset}};
function publicQ(q){const {a,ans,sol,...rest}=q;return rest}   // never ship answer keys to the exam page

// Demo account for testing the prototype (removed in the backend phase)
(function(){const us=get(K.users,[]);if(!us.some(u=>u.email==='demo@higher.study')){us.push({studentId:'STU-DEMO',leadId:'LD-DEMO',name:'Demo Student',mobile:'9876543210',email:'demo@higher.study',pw:btoa('Demo@12345'),at:new Date().toISOString(),utm:{}});set(K.users,us)}})();
function catalog(){const ov=get('hs_exam_ov',{}),nw=get('hs_exam_new',[]);return D.catalog.concat(nw).map(e=>Object.assign({},e,ov[e.id]||{})).filter(e=>e.published!==false&&!e.deleted)}
HS.api={
  clock,
  /* GET /api/exams */ async exams(){await sleep(60);return catalog()},
  /* GET /api/stats */ async stats(){return {exams:catalog().length,students:(get(K.users,[])).length,questions:QS.length,attempts:get(K.attempt)?1:0}},
  /* GET /api/me */ me(){return get(K.user,null)},
  /* POST /api/register */ async register(p){
    await sleep(900);
    const users=get(K.users,[]);
    if(users.some(u=>u.mobile===p.mobile||u.email===p.email)) throw {field:'email',message:'This mobile or email is already registered. Please log in.'};
    const u={studentId:uid('STU'),leadId:uid('LD'),name:p.name,mobile:p.mobile,email:p.email,pw:btoa(p.password),at:new Date().toISOString(),utm:Object.fromEntries(new URLSearchParams(location.search))};
    users.push(u);set(K.users,users);set(K.user,u);HS.track('registration_completed');return u;},
  /* POST /api/login */ async login(p){
    await sleep(700);const u=get(K.users,[]).find(x=>(x.email===p.id||x.mobile===p.id)&&x.pw===btoa(p.password));
    if(!u) throw {field:'password',message:'Incorrect details. Please try again.'};set(K.user,u);return u;},
  /* POST /api/logout */ logout(){try{localStorage.removeItem(K.user)}catch(e){}},
  /* POST /api/attempts/start */ async start(){
    let at=get(K.attempt,null);
    if(at&&at.examId===exam.id) return at;
    const now=clock.now();
    at={id:uid('ATT'),examId:exam.id,startedAt:now,secIdx:0,secStart:now,secEnds:[now+exam.sections[0].minutes*60000],
        answers:{},visited:{},marked:{},submitted:false,lastQ:{}};
    set(K.attempt,at);HS.track('exam_started');return at;},
  attempt(){return get(K.attempt,null)},
  paper(){return QS.map(publicQ)},
  /* PUT /api/attempts/:id/answers  (batched/idempotent) */ saveState(at){set(K.attempt,at);return at},
  /* POST /api/attempts/:id/advance-section */ advance(at,startAt){
    const now=startAt??clock.now(); at.secIdx++; at.secStart=now; at.secEnds[at.secIdx]=now+exam.sections[at.secIdx].minutes*60000; set(K.attempt,at); return at;},
  /* POST /api/attempts/:id/submit */ submit(at){
    if(at.submitted) return at; at.submitted=true; at.submittedAt=clock.now(); at.result=score(at); set(K.attempt,at); HS.track('exam_submitted');
    try{HS.sheet&&HS.sheet.results(at,QS.filter(q=>{const r=at.answers[q.id];return r!==undefined&&r!==''}).map(q=>{const r=at.answers[q.id],ok=q.type==='TITA'?norm(r)===norm(q.ans):r===q.a;return {question_no:q.no,section:q.section,type:q.type,response:q.type==='TITA'?r:'ABCD'[r],is_correct:ok?'Yes':'No',marks_awarded:ok?3:q.neg}}))}catch(e){}
    return at;},
  /* GET /api/attempts/:id/result */ result(){const at=get(K.attempt,null);return at&&at.submitted?at:null},
  reset(){try{localStorage.removeItem(K.attempt)}catch(e){}}
};
function norm(s){return String(s||'').trim().replace(/^\+/,'')}
function score(at){
  const secs=exam.sections.map(s=>({id:s.id,name:s.name,total:s.count,attempted:0,correct:0,wrong:0,marks:0,max:s.count*3}));
  const bySec=Object.fromEntries(secs.map(s=>[s.id,s]));
  QS.forEach(q=>{const r=at.answers[q.id];const s=bySec[q.section];
    if(r===undefined||r===null||r==='') return; s.attempted++;
    const ok=q.type==='TITA'?norm(r)===norm(q.ans):r===q.a;
    if(ok){s.correct++;s.marks+=3}else{s.wrong++;s.marks+=q.neg}});
  const t=secs.reduce((a,s)=>({attempted:a.attempted+s.attempted,correct:a.correct+s.correct,wrong:a.wrong+s.wrong,marks:a.marks+s.marks}),{attempted:0,correct:0,wrong:0,marks:0});
  return {sections:secs,...t,total:QS.length,max:exam.totalMarks,
    percentage:+(Math.max(t.marks,0)/exam.totalMarks*100).toFixed(2),
    accuracy:t.attempted?+(t.correct/t.attempted*100).toFixed(1):0,
    timeTakenSec:Math.round((at.submittedAt-at.startedAt)/1000)};
}
HS.keys=function(){return QS}; // used by result page for solutions (backend: only after submission)
})();
