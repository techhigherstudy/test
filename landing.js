(function(){
const {$,$$,esc}=HS;
HS.header([['Home','index.html'],['CAT mock test']]);HS.footer();HS.track('website_visited');
{const c=HS.cms();$('#hero-h1').innerHTML=esc(c.heroPre)+' <em>'+esc(c.heroEm)+'</em>';$('#hero-p').textContent=c.heroText}
let mode='register', cat='full', exams=[];

/* ---- stats (backend: GET /api/stats — all from DB) ---- */
HS.api.stats().then(s=>{$('#stats').innerHTML=[['Examinations',s.exams],['Registered students',s.students],['Questions',s.questions],['Mock attempts',s.attempts]].map(x=>`<div><b>${x[1]}</b><span>${x[0]}</span></div>`).join('')});

/* ---- exam list ---- */
function renderTests(){
  const list=exams.filter(e=>e.category===cat);
  $('#tests').innerHTML=list.length?list.map(e=>`
   <article class="card test-card"><h3>${esc(e.title)}</h3><p>${esc(e.description)}</p>
    <div class="meta">${e.duration} min · ${e.totalQuestions} questions · ${e.totalMarks} marks · ${e.difficulty} · ${e.free?'Free':'Paid'} · ${e.attempts} attempt${e.attempts>1?'s':''}</div>
    ${e.available?`<button class="btn btn-primary" data-start="${e.id}">${startLabel(e)}</button>`:`<button class="btn btn-ghost" disabled style="opacity:.7;cursor:not-allowed">Coming soon</button>`}</article>`).join('')
   :`<div class="card empty" style="grid-column:1/-1">New tests in this category are coming soon.</div>`;
}
function startLabel(e){const at=HS.api.attempt();if(at&&at.submitted)return'View result';if(at)return'Resume test';return e.free?'Start free test':'Start test'}
HS.api.exams().then(e=>{exams=e;renderTests()});
$('#tabs').onclick=e=>{const b=e.target.closest('button');if(!b)return;$$('#tabs button').forEach(x=>x.classList.toggle('active',x===b));cat=b.dataset.cat;renderTests()};
$('#tests').onclick=e=>{if(!e.target.closest('[data-start]'))return;HS.track('start_test_clicked');
  const at=HS.api.attempt();
  if(HS.api.me()){location.href=at&&at.submitted?'result.html':at?'exam.html':'instructions.html';return}
  openReg('register')};
document.addEventListener('click',e=>{if(e.target.closest('[data-open-register]')){e.preventDefault();openReg('login')}});
$('#cta-counsel').href=HS.counsellingUrl();$('#cta-counsel').addEventListener('click',()=>HS.track('counselling_button_clicked'));

/* ---- modal ---- */
function setMode(m){mode=m;const reg=m==='register';
  $('#reg-title').textContent=reg?'Register to attempt CAT Mock Test 1':'Log in to your account';
  $('#reg-sub').textContent=reg?'All fields are required. Already registered? Log in below.':'Use your registered email or mobile number.';
  ['name','mobile'].forEach(f=>$(`[data-f=${f}]`).style.display=reg?'':'none');
  $('[data-f=email] label').textContent=reg?'Email address':'Email or mobile number';
  $('#f-email').type=reg?'email':'text';$('#f-email').placeholder=reg?'you@example.com':'Email or 10-digit mobile';
  $('#pw-label').textContent=reg?'Password (only to log back in and view your result)':'Password';
  $('#f-pw').autocomplete=reg?'new-password':'current-password';
  $('#reg-checks').style.display=reg?'':'none';
  $('#reg-submit').textContent=reg?'Start Test':'Log in';
  $('#reg-switch').innerHTML=reg?'Already registered? <a id="switch-link">Log in</a>':'New here? <a id="switch-link">Register</a>';
  $$('.field').forEach(f=>f.classList.remove('err'));
}
function openReg(m){setMode(m);HS.track('registration_popup_opened');HS.openModal('reg-overlay');setTimeout(()=>$(m==='register'?'#f-name':'#f-email').focus(),50)}
$('#reg-overlay').addEventListener('click',e=>{if(e.target.id==='reg-overlay'||e.target.closest('[data-close]'))HS.closeModal('reg-overlay');if(e.target.id==='switch-link')setMode(mode==='register'?'login':'register')});
document.addEventListener('keydown',e=>{if(e.key==='Escape')HS.closeModal('reg-overlay')});
const pw=$('#f-pw'),tg=$('#pw-toggle');tg.innerHTML=HS.icons.eye;
tg.onclick=()=>{const h=pw.type==='password';pw.type=h?'text':'password';tg.innerHTML=h?HS.icons.eyeoff:HS.icons.eye;tg.setAttribute('aria-label',h?'Hide password':'Show password')};
$('#f-mobile').addEventListener('input',e=>e.target.value=e.target.value.replace(/\D/g,''));
$('#reg-form').addEventListener('change',e=>{if(e.target.id==='f-terms')$('[data-f=terms]').classList.remove('err')});
let started=false;$('#reg-form').addEventListener('input',e=>{const f=e.target.closest('.field');if(f)f.classList.remove('err');if(e.target.id==='f-terms')$('[data-f=terms]').classList.remove('err');if(!started){started=true;HS.track('registration_started')}});
function flag(f,bad,msg){const el=$(`[data-f=${f}]`);el.classList.toggle('err',bad);if(msg&&bad)el.querySelector('.msg').textContent=msg;return bad}

$('#reg-form').addEventListener('submit',async e=>{
  e.preventDefault();const btn=$('#reg-submit');
  const v={name:$('#f-name').value.trim(),mobile:$('#f-mobile').value.trim(),email:$('#f-email').value.trim(),password:pw.value};
  let bad=false;
  if(mode==='register'){
    bad|=flag('name',v.name.length<2);bad|=flag('mobile',!/^[6-9]\d{9}$/.test(v.mobile));
    bad|=flag('email',!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v.email));bad|=flag('password',v.password.length<8);
    bad|=flag('terms',!$('#f-terms').checked);
  }else{bad|=flag('email',!v.email,'Enter your email or mobile.');bad|=flag('password',!v.password,'Enter your password.')}
  if(bad)return;
  btn.disabled=true;const old=btn.textContent;btn.textContent=mode==='register'?'Saving your details…':'Logging in…';btn.style.opacity=.6;
  try{
    if(mode==='register'){await HS.api.register({name:v.name,mobile:v.mobile,email:v.email,password:v.password});HS.toast('Details saved.')}
    else{const adm=HS.adminAuth(v.email,v.password);if(adm){HS.toast('Welcome, '+adm.name+'. Opening the admin panel…');setTimeout(()=>location.href='admin.html',500);return}await HS.api.login({id:v.email,password:v.password});HS.toast('Welcome back!')}
    const at=HS.api.attempt();setTimeout(()=>location.href=at&&at.submitted?'result.html':at?'exam.html':'instructions.html',500);
  }catch(err){flag(err.field||'email',true,err.message||'Something went wrong.');btn.disabled=false;btn.textContent=old;btn.style.opacity=1}
});
})();
