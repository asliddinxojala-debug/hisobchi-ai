/* HISOBCHI AI 5.0 — vanilla JS. Bo'limlar: yordamchilar, Store, Parser (AI ga almashtiriladi), ko'rinishlar, byudjet, zaxira/demo, PWA, hodisalar */
const $=s=>document.querySelector(s),pad=n=>String(n).padStart(2,'0');
const iso=d=>`${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`; // mahalliy sana (UTC emas)
const todayS=()=>iso(new Date()),addD=n=>{const d=new Date();d.setDate(d.getDate()+n);return iso(d)};
const fmt=n=>String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g,' ')+" so'm";
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const uid=()=>Date.now()*1000+Math.floor(Math.random()*1000);
const MON=['yan','fev','mar','apr','may','iyn','iyl','avg','sen','okt','noy','dek'];
const MFULL=['yanvar','fevral','mart','aprel','may','iyun','iyul','avgust','sentabr','oktabr','noyabr','dekabr'];
const lab=d=>d===todayS()?'Bugun':d===addD(-1)?'Kecha':d===addD(1)?'Ertaga':`${+d.slice(8)} ${MON[+d.slice(5,7)-1]} ${d.slice(0,4)}`;
const CAT={income:['Maosh','Freelance','Sovg\'a','Boshqa'],expense:['Oziq-ovqat','Transport','Uy-joy','Aloqa','Ta\'lim','Salomatlik','Kiyim','Ko\'ngilochar','Boshqa']};
const COL=['#7c5cff','#3b9cff','#2ee6a6','#ffc857','#ff6b81','#c084fc','#22d3ee','#fb923c','#a3e635'];

/* ---- Store ---- */
const KEY='hisobchi-v2',okD=d=>/^\d{4}-\d\d-\d\d$/.test(d||'');
const Store={
 load(){let d=null;try{d=JSON.parse(localStorage.getItem(KEY))}catch{}
  [2,3,4].forEach(v=>{if(d&&d.v===v&&!localStorage.getItem(KEY+'-v'+v+'-backup'))try{localStorage.setItem(KEY+'-v'+v+'-backup',JSON.stringify(d))}catch{}});
  return this.norm(d,true)},
 norm(d,legacy){const a=x=>Array.isArray(x)?x:[];
  if(!d||typeof d!=='object'||![2,3,4,5].includes(d.v)){d={v:2,tx:[],debts:[],rem:[]};if(legacy)try{a(JSON.parse(localStorage.getItem('hisobchi-transactions'))).forEach(x=>d.tx.push({id:x.id||uid(),type:x.type,amount:x.amount,date:x.date,category:x.category||'Boshqa',note:x.name||'',createdAt:x.id||Date.now()}))}catch{}}
  const tx=a(d.tx).filter(x=>+x.amount>0&&okD(x.date)&&CAT[x.type]).map(x=>({...x,amount:+x.amount})),debts=a(d.debts).filter(x=>+x.amount>0&&okD(x.date)).map(x=>({...x,amount:+x.amount})),rem=a(d.rem).filter(x=>x.text&&okD(x.date)).map(x=>({type:'task',repeat:'once',time:'',amount:0,note:'',dom:+x.date.slice(8),...x,amount:+x.amount||0,nk:x.nk!==undefined?x.nk:(x.notified?x.date:'')}));
  if(legacy&&tx.length+debts.length+rem.length<a(d.tx).length+a(d.debts).length+a(d.rem).length)try{localStorage.setItem(KEY+'-backup',JSON.stringify(d))}catch{}
  const goals=a(d.goals).filter(g=>g&&g.name&&+g.target>0).map(g=>({start:0,deadline:'',note:'',...g,target:+g.target,start:+g.start||0,contribs:a(g.contribs).filter(c=>+c.amount>0&&okD(c.date)).map(c=>({...c,amount:+c.amount}))}));
  const budgets={};if(d.budgets&&typeof d.budgets==='object')Object.entries(d.budgets).forEach(([k,v])=>{if(CAT.expense.includes(k)&&+v>0)budgets[k]=Math.round(+v)});
  return{v:5,tx,debts,rem,goals,budgets}},
 save(){try{localStorage.setItem(KEY,JSON.stringify(db))}catch{toast("Saqlab bo'lmadi: brauzer xotirasi to'la yoki o'chirilgan.")}}};
let db=Store.load(),page='dash',draft=null;
let chat=[{r:'a',t:"Assalomu alaykum! Men HISOBCHI AI. Oddiy tilda yozing, masalan:\n• «Bozorga 150 ming sarfladim»\n• «Bugun do'stimga 200 ming qarz berdim. 10-dekabr kuni eslat»\n• «Telefon uchun 5 mln jamg'armoqchiman, 1-iyungacha»\n• «Oziq-ovqatga oyiga 2 mln limit qo'y»\nSavol ham bering: «Balansim qancha?», «Byudjetim qanday?», «Maqsadlarim qanday?»\nSaqlashdan oldin har doim tasdig'ingizni so'rayman."}];

/* ---- Parser: keyinchalik haqiqiy AI bilan almashtiring ----
   Shartnoma: Parser.understand(text, draft) -> Promise<{draft|null, ask?:string, reply?:string}>
   draft: {kind:'tx'|'debt'|'rem', ...maydonlar, missing:[...]}. */
const Q={amount:"Qancha summa? (masalan: 200 ming)",type:"Bu daromadmi yoki xarajatmi?",dir:"Qarzni siz berdingizmi yoki oldingizmi?",person:"Kim bilan bo'lgan qarz? Ismini yozing.",date:"Qaysi sanaga eslatay? (masalan: 10-dekabr yoki ertaga)",name:"Maqsad nomi nima? (masalan: Telefon sotib olish)",cat:"Qaysi kategoriya uchun limit? ("+CAT.expense.join(', ')+")"};
const Parser={
 norm:s=>s.toLowerCase().replace(/[‘’`ʻʼ]/g,"'"),
 async understand(raw,d){const t=this.norm(raw);
  if(/\bbekor\b/.test(t))return{draft:null,reply:"Bekor qilindi."};
  if(!(d&&d.missing.length)&&this.isQ(t))return{draft:d,answer:Answer.reply(t)};
  if(d&&d.missing.length)this.fill(d,t,raw);else{d=this.parse(t,raw);
   if(!d)return{draft:null,reply:"Tushunmadim. Summa va nima haqida ekanini yozing, masalan: «Bozorga 150 ming sarfladim» yoki «Ertaga elektr to'lovini eslat»."}}
  d.missing=this.check(d);return{draft:d,ask:d.missing.length?Q[d.missing[0]]:null}},
 dates(t){let target=null,op=todayS();
  const re=new RegExp(`(\\d{1,2})[-\\s]*(${MFULL.join('|')})`);
  let rest=t.replace(/\b(\d{4})-(\d\d)-(\d\d)\b/,(m,y,mo,dd)=>{const x=new Date(+y,+mo-1,+dd);if(x.getMonth()===+mo-1&&x.getDate()===+dd){if(/eslat|qaytar|muddat/.test(t))target=m;else op=m}return' '});rest=rest.replace(re,(m,dd,mo)=>{const mi=MFULL.indexOf(mo),n=new Date();let d=new Date(n.getFullYear(),mi,+dd);
   if(d.getMonth()!==mi)return' ';if(iso(d)<todayS())d=new Date(n.getFullYear()+1,mi,+dd);target=iso(d);return' '});
  if(/kecha/.test(t))op=addD(-1);if(!target){if(/indinga/.test(t))target=addD(2);else if(/ertaga/.test(t))target=addD(1)}
  let time='',repeat='once',dom=0;
  rest=rest.replace(/(?:soat\s*)?\b(\d{1,2}):(\d{2})\b/,(m,h,mi)=>{if(+h<24&&+mi<60)time=pad(+h)+':'+mi;return' '});
  if(!time)rest=rest.replace(/soat\s*(\d{1,2})\b(?!:)/,(m,h)=>{if(+h<24)time=pad(+h)+':00';return' '});
  rest=rest.replace(/har\s*oy\w*(?:\s*(\d{1,2})(?:[-\s]*sana\w*)?)?/,(m,d)=>{repeat='monthly';if(d)dom=+d;return' '});
  if(/har\s*kun/.test(t))repeat='daily';if(/har\s*hafta/.test(t))repeat='weekly';
  if(repeat==='monthly'&&dom&&!target){const n=new Date(),dm=(y,mo)=>Math.min(dom,new Date(y,mo+1,0).getDate());let c=new Date(n.getFullYear(),n.getMonth(),dm(n.getFullYear(),n.getMonth()));if(iso(c)<todayS())c=new Date(n.getFullYear(),n.getMonth()+1,dm(n.getFullYear(),n.getMonth()+1));target=iso(c)}
  return{op,target,rest,time,repeat,dom}},
 isQ(t){return/\?|\bqancha\b|\bqaysi\b|\bnima\b|\bkimga\b|\bkimdan\b/.test(t)&&!this.amount(this.dates(t).rest)},
 amount(s){const m=s.match(/(\d+(?:[.,]\d+)?(?:\s\d{3})*)\s*(mln|million|ming|k\b)?/);if(!m)return null;
  const n=parseFloat(m[1].replace(/\s/g,'').replace(',','.')),k=m[2]==='ming'||m[2]==='k'?1e3:m[2]?1e6:1,v=Math.round(n*k);return v>0?v:null},
 type(t){return/sarfla|ishlat|to'ladim|sotib|xarajat|chiqim|ketdi|xarid/.test(t)?'expense':/daromad|maosh|oylik|topdim|tushdi|kirim|oldim|oldi\b|foyda/.test(t)?'income':null},
 cat(t,type){const M=type==='income'?{Maosh:/maosh|oylik/,Freelance:/freelance|loyiha|buyurtma/}:{'Oziq-ovqat':/non|bozor|ovqat|go'sht|market|meva|restoran/,Transport:/taksi|benzin|avtobus|metro|yo'l|mashina/,'Uy-joy':/ijara|kommunal|gaz|svet|elektr|suv/,Aloqa:/internet|telefon|aloqa/,"Ta'lim":/kurs|kitob|o'qish|maktab/,Salomatlik:/dori|shifokor|dorixona|klinika/,Kiyim:/kiyim|ko'ylak|poyabzal/,"Ko'ngilochar":/kino|o'yin|konsert|dam olish/};
  if(type==='expense'){const n=this.catName(t);if(n&&n!=='Boshqa')return n}
  for(const[k,re]of Object.entries(M))if(re.test(t))return k;return'Boshqa'},
 catName(t){for(const k of CAT.expense)if(new RegExp(k.toLowerCase().replace('-','[-\\s]?')).test(t))return k;return null},
 budCat(t){const n=this.catName(t);if(n)return n;const c=this.cat(t,'expense');return c==='Boshqa'?null:c},
 goalName(raw){const n=this.norm(raw),m=n.match(/^(?:maqsad\s*:?\s*)?(.+?)\s+uchun\b/);let s=m?m[1]:n.replace(/maqsad\w*\s*:?/,' ');
  s=s.replace(new RegExp(`\\d{1,2}[-\\s]*(${MFULL.join('|')})\\w*`,'g'),' ').replace(/\d+(?:[.,]\d+)?/g,' ').replace(/(^|\s)(mln|million|ming|so'm|som|k|jamg'\w*|yig'\w*|to'pla\w*|\w*gacha|oyiga|qo'y\w*|qil\w*|menda|bor|kerak|ertaga|bugun)(?=\s|$|[,.!])/g,' ').replace(/[,.!:;?]+/g,' ').replace(/\s+/g,' ').trim();
  return s.length>=2?s.charAt(0).toUpperCase()+s.slice(1,60):null},
 person(t,raw){const n=raw.match(/([A-ZА-Я][a-zа-я']+)(?:ga|dan)\b/);if(n)return n[1];
  const r=t.match(/\b(do'st|aka|uka|opa|singil|ota|dada|ona|qo'shni|hamkasb)\w*/);return r?(r[0].replace(/(ga|dan)$/,'')).replace(/^./,c=>c.toUpperCase()):null},
 remDraft(t,raw,D,amount){const T=/qarz/.test(t)?(/olgan|olaman|olish/.test(t)?'debttake':'debtback'):/kommunal|gaz|svet|elektr|suv\b/.test(t)?'utility':/internet|telefon|aloqa/.test(t)?'telecom':/obuna|netflix|spotify|youtube/.test(t)?'sub':/rejalashtir|xarid/.test(t)?'planned':'task';
  return{kind:'rem',text:raw.trim().replace(/[.!\s]+$/,''),amount:amount||0,date:D.target||(/bugun/.test(t)?todayS():null),time:D.time,repeat:D.repeat,dom:D.dom,type:T,note:''}},
 parse(t,raw){const D=this.dates(t),amount=this.amount(D.rest),remind=/eslat/.test(t)?D.target:null,note=raw.trim();
  if(!/eslat/.test(t)&&/\blimit|byudjet|budjet/.test(t))return{kind:'bud',amount,category:this.budCat(t)};
  if(!/eslat|qarz/.test(t)&&/maqsad|jamg'ar|yig'moqchi|to'plamoqchi|yig'ib/.test(t))return{kind:'goal',amount,name:this.goalName(raw),deadline:D.target||'',note:''};
  if(/eslat/.test(t)&&!/berdim|oldim|sarfladim|ishlatdim|to'ladim|topdim|tushdi|ketdi/.test(t))return this.remDraft(t,raw,D,amount);
  if(/qarz/.test(t))return{kind:'debt',dir:/berdim|bergan/.test(t)?'gave':/oldim|olgan/.test(t)?'took':null,person:this.person(t,raw),amount,date:D.op,due:D.target||'',note,remind};
  if(!amount&&/eslat/.test(t))return this.remDraft(t,raw,D,amount);
  if(!amount)return null;const type=this.type(t);
  return{kind:'tx',type,amount,date:D.op,category:this.cat(t,type),note,remind}},
 fill(d,t,raw){const k=d.missing[0],D=this.dates(t);
  if(k==='amount')d.amount=this.amount(D.rest);
  if(k==='type'){d.type=/daromad|kirim/.test(t)?'income':/xarajat|chiqim/.test(t)?'expense':null;if(d.type)d.category=this.cat(d.note.toLowerCase(),d.type)}
  if(k==='dir')d.dir=/berdim|bergan/.test(t)?'gave':/oldim|olgan/.test(t)?'took':null;
  if(k==='person')d.person=raw.trim().slice(0,40)||null;
  if(k==='name')d.name=raw.trim().replace(/[.!]+$/,'').slice(0,60)||null;
  if(k==='cat')d.category=this.budCat(t);
  if(k==='date'){const x=D.target||(/bugun/.test(t)?todayS():null);if(x){d.date=x;d.remind=x;if(D.time)d.time=D.time}}},
 check(d){const m=[];
  if(d.kind==='tx'){if(!d.amount)m.push('amount');if(!d.type)m.push('type')}
  if(d.kind==='debt'){if(!d.amount)m.push('amount');if(!d.dir)m.push('dir');if(!d.person)m.push('person')}
  if(d.kind==='rem'&&!d.date)m.push('date');
  if(d.kind==='goal'){if(!d.amount)m.push('amount');if(!d.name)m.push('name')}
  if(d.kind==='bud'){if(d.category&&d.old===undefined)d.old=db.budgets[d.category]||0;if(!d.category)m.push('cat');if(!d.amount)m.push('amount')}return m}};

/* ---- Moliyaviy savollarga javob: faqat saqlangan ma'lumotdan hisoblanadi ---- */
const Answer={NO:"Bu haqida hali ma'lumot yo'q.",
 reply(t){const mk=todayS().slice(0,7),M=x=>x.date.startsWith(mk),ex=db.tx.filter(x=>x.type==='expense'),inc=sum(db.tx,x=>x.type==='income'),exp=sum(ex),open=db.debts.filter(d=>d.status==='pending');
  const by=(a,f)=>{const o={};a.forEach(x=>o[f(x)]=(o[f(x)]||0)+x.amount);return Object.entries(o).sort((a,b)=>b[1]-a[1])};
  const list=a=>by(a,d=>d.person).map(([n,v])=>`• ${n}: ${fmt(v)}`).join('\n'),g=open.filter(d=>d.dir==='gave'),k=open.filter(d=>d.dir==='took');
  if(/balans|qoldiq/.test(t))return db.tx.length?`Balansingiz ${fmt(inc-exp)} (daromad ${fmt(inc)} − xarajat ${fmt(exp)}). Qarzlar hisobga olinmagan.`:this.NO;
  if(/qarz/.test(t)){if(!open.length)return"Kutilayotgan qarz yo'q.";
   if(/kimga|berganman/.test(t))return g.length?"Siz qarz bergansiz:\n"+list(g):"Kutilayotgan berilgan qarz yo'q.";
   if(/kimdan|olganman/.test(t))return k.length?"Siz qarz olgansiz:\n"+list(k):"Kutilayotgan olingan qarz yo'q.";
   return`Kutilayotgan qarzlar: sizga qaytarilishi kerak ${fmt(sum(g))}, siz qaytarishingiz kerak ${fmt(sum(k))}.`}
  if(/maqsad/.test(t))return db.goals.length?"Jamg'arma maqsadlari:\n"+db.goals.map(g=>`• ${g.name}: ${fmt(gSaved(g))} / ${fmt(g.target)} (${Math.min(100,Math.round(gSaved(g)/g.target*100))}%)`).join('\n'):"Jamg'arma maqsadi hali yo'q.";
  if(/tejad|jamg/.test(t)){const im=sum(db.tx,x=>x.type==='income'&&M(x)),em=sum(ex,M);return im||em?`Bu oy: daromad ${fmt(im)}, xarajat ${fmt(em)}, farq ${fmt(im-em)}${im<em?' (xarajat ko\'p)':''}. Jami farq: ${fmt(inc-exp)}. Bu hisoblangan farq, alohida jamg'arma hisobi emas.`:this.NO}
  if(/katta/.test(t)){const m=ex.slice().sort((a,b)=>b.amount-a.amount)[0];return m?`Eng katta bitta xarajat: ${fmt(m.amount)} — ${m.category}${m.note?' ('+m.note+')':''}, ${lab(m.date)}.`:this.NO}
  if(/kategor|ko'proq|ko'p/.test(t)){const c=by(ex,x=>x.category);return c.length?`Eng ko'p "${c[0][0]}" kategoriyasiga ketgan: ${fmt(c[0][1])} (${Math.round(c[0][1]/exp*100)}%).`:this.NO}
  if(/byudjet|budjet|limit/.test(t)){const b=budStat();return b.length?"Bu oy byudjet holati:\n"+b.map(x=>`• ${x.k}: ${fmt(x.spent)} / ${fmt(x.lim)} (${x.p}%)${x.p>=100?' — limitdan oshgan!':x.p>=80?' — limitga yaqin':''}`).join('\n'):"Byudjet limiti hali qo'yilmagan. Masalan: «Oziq-ovqatga oyiga 2 mln limit qo'y»."}
  if(/daromad|maosh/.test(t)){const im=sum(db.tx,x=>x.type==='income'&&M(x));return im?`Bu oy daromadingiz ${fmt(im)}.`:"Bu oy hali daromad kiritilmagan."}
  if(/xarajat|sarfla|ishlat|ketdi/.test(t))return ex.length?`Bu oy xarajatingiz ${fmt(sum(ex,M))} (${ex.filter(M).length} ta yozuv).`:this.NO;
  return"Bu savolga javob bera olmayman. So'rang: balans, bu oy xarajat, qarzlar, eng katta xarajat, qaysi kategoriya, tejash, byudjet, maqsadlar."}};

/* ---- Saqlash amallari ---- */
const COLL={tx:'tx',debt:'debts',rem:'rem'};
function build(kind,f,old={}){const id=old.id||uid(),a=Math.round(+f.amount);
 if(kind==='tx')return{id,type:f.type,amount:a,date:f.date,category:f.category,note:(f.note||'').trim(),createdAt:old.createdAt||Date.now()};
 if(kind==='debt')return{id,dir:f.dir,person:(f.person||'').trim(),amount:a,date:f.date,due:f.due||'',note:(f.note||'').trim(),status:f.status||'pending'};
 return{id,text:(f.text||'').trim(),amount:a||0,date:f.date,time:f.time||'',note:(f.note||'').trim(),type:f.type||'task',repeat:f.repeat||'once',dom:+f.dom||(old.date===f.date&&old.dom)||+f.date.slice(8),done:!!old.done,nk:(old.date===f.date&&(old.time||'')===(f.time||''))?old.nk||'':''}}
function upsert(kind,it){const c=db[COLL[kind]],i=c.findIndex(x=>x.id===it.id);i>=0?c[i]=it:c.push(it)}
function remFor(d,it){if(!d.remind||d.kind==='rem')return;
 const txt=d.kind==='debt'?(it.dir==='gave'?`${it.person}dan ${fmt(it.amount)} qarzni qaytarishni so'rang`:`${it.person}ga ${fmt(it.amount)} qarzni qaytaring`):(it.note||'Eslatma');
 db.rem.push(build('rem',{text:txt,date:d.remind,amount:it.amount,type:d.kind==='debt'?(it.dir==='gave'?'debtback':'debttake'):'planned'}))}
function commit(d){if(d.saved)return false;
 if(d.kind==='goal'){d.saved=true;db.goals.push({id:uid(),name:d.name,target:Math.round(d.amount),start:0,deadline:d.deadline||'',note:'',contribs:[],createdAt:Date.now()});Store.save();return true}
 if(d.kind==='bud'){d.saved=true;db.budgets[d.category]=Math.round(d.amount);Store.save();return true}
 const it=build(d.kind,d),sig=x=>[x.type,x.dir,x.person,x.amount,x.date,x.category,x.text].join('|');
 if(db[COLL[d.kind]].some(x=>sig(x)===sig(it)&&Date.now()-(x.createdAt||x.id/1000)<60000))return false;
 d.saved=true;upsert(d.kind,it);remFor(d,it);Store.save();return true}
const CK={tx:t=>t.type==='income'?'Daromad':'Xarajat',debt:t=>t.dir==='gave'?'Qarz berish':'Qarz olish',rem:()=>'Eslatma',goal:()=>"🎯 Jamg'arma maqsadi",bud:()=>'💰 Byudjet limiti'};
function cardHTML(d,active){const rows=[];const R=(k,v)=>v&&rows.push(`<div class="kv"><span>${k}</span><b>${esc(v)}</b></div>`);
 if(d.kind==='goal'){R('Nomi',d.name);R('Kerakli summa',fmt(d.amount));R('Muddat',d.deadline?lab(d.deadline):'belgilanmagan');if(d.deadline){const mo=Math.max(1,Math.ceil(dn(d.deadline)/30.4375));R('Oyiga kerak',fmt(Math.ceil(d.amount/mo)))}}
 else if(d.kind==='bud'){const sp=sum(db.tx,x=>x.type==='expense'&&x.category===d.category&&x.date.startsWith(todayS().slice(0,7)));R('Kategoriya',d.category);R('Oylik limit',fmt(d.amount));R('Bu oy sarflangan',fmt(sp));if(d.old)R('Eski limit',fmt(d.old))}
 else if(d.kind==='rem'){R('Matn',d.text);R('Tur',RT[d.type]);R('Sana',lab(d.date));R('Vaqt',d.time||"ko'rsatilmagan (09:00 da eslatiladi)");R('Miqdor',d.amount&&fmt(d.amount));R('Takrorlanish',RP[d.repeat])}else{R('Summa',fmt(d.amount));R('Sana',lab(d.date));
  if(d.kind==='tx')R('Kategoriya',d.category);else{R('Kim',d.person);R('Qaytarish muddati',d.due&&lab(d.due))}
  R('Eslatma',d.remind&&lab(d.remind))}
 return`<div class="cf ${active?'':'old'}"><h4>${CK[d.kind](d)}</h4>${rows.join('')}${active?`<div class="bt"><button class="btn" data-a="ok">Tasdiqlash</button><button class="btn sec" data-a="editd">Tahrirlash</button><button class="btn red" data-a="no">Bekor qilish</button></div>`:''}</div>`}

/* ---- Ko'rinishlar ---- */
const sum=(a,f=()=>true)=>a.filter(f).reduce((s,x)=>s+x.amount,0),empty=t=>`<div class="empty">${t}</div>`;
const rowTx=(t,act=1)=>`<div class="row"><i class="ic ${t.type}">${t.type==='income'?'↗':'↘'}</i><div class="rb"><b>${esc(t.category)}</b><small>${lab(t.date)}${t.note?' · '+esc(t.note):''}</small></div><strong class="${t.type}">${t.type==='income'?'+':'−'}${fmt(t.amount)}</strong>${act?`<span class="acts"><button data-a="edit" data-k="tx" data-id="${t.id}" title="Tahrirlash">✎</button><button data-a="del" data-k="tx" data-id="${t.id}" title="O'chirish">×</button></span>`:''}</div>`;
const acts=(k,id)=>`<span class="acts"><button data-a="edit" data-k="${k}" data-id="${id}" title="Tahrirlash">✎</button><button data-a="del" data-k="${k}" data-id="${id}" title="O'chirish">×</button></span>`;
const RT={debtback:'Qarz qaytarish',debttake:'Qarz olish',utility:"Kommunal to'lov",telecom:'Internet / telefon',sub:'Oylik obuna',planned:'Rejalashtirilgan xarajat',task:'Shaxsiy vazifa'},RP={once:'Bir marta',daily:'Har kuni',weekly:'Har hafta',monthly:'Har oy'},RI={debtback:'↩',debttake:'↪',utility:'💡',telecom:'📶',sub:'🔁',planned:'🗓',task:'✔'};
const nowT=()=>{const n=new Date();return pad(n.getHours())+':'+pad(n.getMinutes())},dn=d=>Math.round((new Date(d+'T00:00:00')-new Date(todayS()+'T00:00:00'))/864e5);
const isOver=r=>!r.done&&(r.date<todayS()||(r.date===todayS()&&r.time&&r.time<nowT()));
const sect=r=>r.done?'done':isOver(r)?'over':r.date===todayS()?'today':r.date===addD(1)?'tom':'up';
const rel=n=>n<0?`${-n} kun oldin`:n===0?'Bugun':n===1?'Ertaga':`${n} kundan keyin`;
function nextDate(r){const[y,m,d]=r.date.split('-').map(Number);if(r.repeat==='daily'||r.repeat==='weekly')return iso(new Date(y,m-1,d+(r.repeat==='daily'?1:7)));
 const l=new Date(y,m+1,0).getDate(),dom=r.dom||d;return iso(new Date(y,m,Math.min(dom,new Date(y,m+1,0).getDate())))}
function doneRem(r){if(r.done){r.done=false;return}if(r.repeat==='once'){r.done=true;return}
 let g=0;do{r.date=nextDate(r)}while(r.date<=todayS()&&++g<500);r.nk='';toast("Bajarildi. Keyingi eslatma: "+lab(r.date))}
function analyze(){const L=[],P=db.rem.filter(r=>!r.done),ov=P.filter(isOver),td=P.filter(r=>sect(r)==='today');
 if(ov.length)L.push(`Muddati o'tgan ${ov.length} ta majburiyat bor: ${ov.slice(0,2).map(r=>r.text).join('; ')}`);
 if(td.length)L.push(`Bugun bajarilmagan ${td.length} ta eslatma mavjud.`);
 P.filter(r=>!isOver(r)&&dn(r.date)>=1&&dn(r.date)<=7).sort((x,y)=>x.date.localeCompare(y.date)).slice(0,4).forEach(r=>L.push(`${rel(dn(r.date))}: ${r.text}${r.amount?' — '+fmt(r.amount):''}`));
 db.debts.filter(d=>d.status==='pending'&&d.due&&dn(d.due)<=7&&!db.rem.some(r=>!r.done&&r.date===d.due&&r.text.includes(d.person))).slice(0,3).forEach(d=>L.push(`${rel(dn(d.due))}: ${d.dir==='gave'?'qarz qaytarilishi kerak':'qarzni qaytarish kerak'} — ${d.person}, ${fmt(d.amount)}`));
 return L.length?L:[db.rem.length?"Yaqin 7 kunda majburiyat yo'q.":"Hali eslatma kiritilmagan."]}
function remBlock(){const p=db.rem.filter(r=>!r.done),up=p.filter(r=>!isOver(r)&&dn(r.date)<=7&&r.amount>0);
 const S=(l,v,s,c)=>`<div class="card stat rs ${c}" data-a="nav" data-p="rem"><small>${l}</small><h2>${v}</h2><small>${s}</small></div>`;
 return`<div class="grid">${S('Bugungi eslatmalar',p.filter(r=>sect(r)==='today').length,'ta','')}${S("Yaqinlashayotgan to'lovlar",up.length,fmt(sum(up)),'')}${S("Muddati o'tgan",p.filter(isOver).length,'ta majburiyat','late')}${S('Bajarilgan',db.rem.filter(r=>r.done).length,'ta eslatma','ok')}</div>
 <div class="card" style="margin-bottom:16px"><h3>⏰ Yaqinlashayotgan majburiyatlar</h3>${analyze().map(x=>`<p class="sub" style="margin:6px 0">• ${esc(x)}</p>`).join('')}</div>`}
const RS={over:['late',"Muddati o'tgan"],today:['today','Bugun'],tom:['tom','Ertaga'],up:['','Kutilmoqda'],done:['ok','Bajarilgan']};
const remRow=r=>{const[c,l]=RS[sect(r)];return`<div class="row rr ${c}"><i class="ic">${RI[r.type]||'⏰'}</i><div class="rb"><b style="${r.done?'text-decoration:line-through;opacity:.6':''}">${esc(r.text)}</b><small>${lab(r.date)}${r.time?' · '+esc(r.time):''}${r.amount?' · '+fmt(r.amount):''}${r.repeat!=='once'?' · '+RP[r.repeat]:''}${r.note?' · '+esc(r.note):''}</small></div><span class="pill ${c}">${l}</span><span class="acts"><button data-a="toggle" data-k="rem" data-id="${r.id}" title="${r.done?'Qaytarish':'Bajarildi'}">${r.done?'↺':'✓'}</button><button data-a="edit" data-k="rem" data-id="${r.id}" title="Tahrirlash">✎</button><button data-a="del" data-k="rem" data-id="${r.id}" title="O'chirish">×</button></span></div>`};
function calHTML(){const{y,m}=cal,off=(new Date(y,m,1).getDay()+6)%7,days=new Date(y,m+1,0).getDate(),by={};db.rem.forEach(r=>(by[r.date]=by[r.date]||[]).push(r));let c='<i></i>'.repeat(off);
 for(let d=1;d<=days;d++){const k=`${y}-${pad(m+1)}-${pad(d)}`,l=by[k]||[],cl=l.length?(l.some(isOver)?'late':l.every(r=>r.done)?'ok':'pend'):'';c+=`<button class="cd ${k===todayS()?'td':''} ${k===cal.sel?'sel':''} ${cl}" data-a="cday" data-d="${k}">${d}${l.length?`<b>${l.length}</b>`:''}</button>`}
 return`<div class="cal"><div class="ch"><button data-a="cprev" aria-label="Oldingi oy">‹</button><b>${MFULL[m]} ${y}</b><button data-a="cnext" aria-label="Keyingi oy">›</button></div><div class="cw">${['Du','Se','Ch','Pa','Ju','Sh','Ya'].map(x=>`<span>${x}</span>`).join('')}</div><div class="cg">${c}</div></div>`}
const mk=(y,m)=>{const d=new Date(y,m,1);return`${d.getFullYear()}-${pad(d.getMonth()+1)}`};
const gSaved=g=>g.start+g.contribs.reduce((s,c)=>s+c.amount,0);
/* ---- Byudjet: kategoriya bo'yicha oylik limit ---- */
function budStat(k=todayS().slice(0,7)){return Object.entries(db.budgets).map(([c,lim])=>{const spent=sum(db.tx,x=>x.type==='expense'&&x.category===c&&x.date.startsWith(k));return{k:c,lim,spent,p:Math.round(spent/lim*100)}}).sort((a,b)=>b.p-a.p)}
const bcls=p=>p>=100?'over':p>=80?'warn':'';
function mstat(k){const t=db.tx.filter(x=>x.date.startsWith(k)),ex=t.filter(x=>x.type==='expense'),inc=sum(t,x=>x.type==='income'),exp=sum(ex),cats={};ex.forEach(x=>cats[x.category]=(cats[x.category]||0)+x.amount);
 const sv=db.goals.reduce((s,g)=>s+g.contribs.filter(c=>c.date.startsWith(k)).reduce((a,c)=>a+c.amount,0),0);
 return{k,n:t.length,ne:ex.length,inc,exp,net:inc-exp,cats,sv,top:Object.entries(cats).sort((a,b)=>b[1]-a[1])[0],big:ex.slice().sort((a,b)=>b.amount-a.amount)[0]}}
function forecast(){const n=new Date(),ms=[];for(let i=1;i<=3;i++){const s=mstat(mk(n.getFullYear(),n.getMonth()-i));if(s.n)ms.push(s)}
 if(ms.length<2)return null;const r=f=>[Math.min(...ms.map(f)),Math.max(...ms.map(f))];return{n:ms.length,inc:r(s=>s.inc),exp:r(s=>s.exp),net:r(s=>s.net),avgNet:Math.round(ms.reduce((a,s)=>a+s.net,0)/ms.length)}}
function recsFor(c,p){if(c.ne<3)return[`Tavsiya uchun kamida 3 ta xarajat kerak. Bu oy ${c.ne} ta kiritilgan.`];const r=[];
 Object.entries(db.budgets).forEach(([k,lim])=>{const v=c.cats[k]||0;if(v>lim)r.push(`"${k}" uchun oylik limit (${fmt(lim)}) ${fmt(v-lim)} ga oshib ketgan.`);else if(v>=lim*.8)r.push(`"${k}" limitining ${Math.round(v/lim*100)}% i ishlatilgan — qolgan ${fmt(lim-v)}.`)});
 if(p.n)Object.entries(c.cats).filter(([k,v])=>p.cats[k]>0&&v>=p.cats[k]*1.2&&v-p.cats[k]>=c.exp*.05).sort((a,b)=>b[1]-a[1]).slice(0,2).forEach(([k,v])=>r.push(`Bu oy "${k}" xarajatlaringiz oshgan: ${fmt(v)} (o'tgan oy ${fmt(p.cats[k])}).`));
 const sh=Math.round(c.top[1]/c.exp*100);if(sh>=40)r.push(`"${c.top[0]}" xarajatlaringiz umumiy xarajatning katta qismini (${sh}%) tashkil qilmoqda.`);
 r.push(c.net>0?`Daromadingizdan ${fmt(c.net)} ortgan. Uning bir qismini (masalan, 10% — ${fmt(Math.round(c.net/10))}) jamg'arishga ajratishingiz mumkin.`:`Bu oy xarajat daromaddan ${c.net<0?fmt(-c.net)+' ga ':''}ko'p yoki teng. Kategoriyalarni ko'rib chiqish foydali bo'lishi mumkin.`);
 r.push(`Keyingi oy xarajatlarini rejalashtirish foydali: bu oygi xarajat ${fmt(c.exp)} edi.`);return r}
function plan(g){const s=gSaved(g),rem=g.target-s,f=forecast();if(rem<=0)return"Maqsadga erishildingiz. Tabriklaymiz!";
 if(g.deadline){const d=dn(g.deadline);if(d<0)return`Muddat ${-d} kun oldin o'tgan. Qolgan: ${fmt(rem)}. Muddatni yangilashingiz mumkin.`;
  const mo=Math.max(1,Math.ceil(d/30.4375)),per=Math.ceil(rem/mo);return`Qolgan ${fmt(rem)}, muddatgacha taxminan ${mo} oy. Oyiga taxminan ${fmt(per)} ajratish kerak.${f&&f.avgNet>0?` O'rtacha oylik sof farqingiz ${fmt(f.avgNet)}${per>f.avgNet?' — reja undan katta, muddat yoki summani moslashtirish mumkin.':'.'}`:''}`}
 return f&&f.avgNet>0?`Qolgan ${fmt(rem)}. Oyiga o'rtacha ${fmt(f.avgNet)} ajratsangiz, taxminan ${Math.ceil(rem/f.avgNet)} oy kerak (taxmin, kafolat emas).`:`Qolgan ${fmt(rem)}. Muddat belgilang yoki ma'lumot ko'paygach taxminiy vaqtni hisoblab beraman.`}
const dlt=(a,b,up,has)=>{if(!has)return'—';const d=a-b;if(!d)return"o'zgarishsiz";const p=b?Math.round(Math.abs(d)/Math.abs(b)*100):null;return`<span class="${(d>0)===up?'income':'du'}">${d>0?'↑':'↓'} ${fmt(Math.abs(d))}${p!==null?` (${p}%)`:''}</span>`};
const gc=g=>{const s=gSaved(g),p=Math.min(100,Math.round(s/g.target*100));return`<div class="card" style="margin-bottom:14px"><div class="row" style="border:0;padding:0"><i class="ic">🎯</i><div class="rb"><b>${esc(g.name)}</b><small>${g.deadline?'Muddat: '+lab(g.deadline):'Muddat belgilanmagan'}${g.note?' · '+esc(g.note):''}</small></div><span class="acts"><button data-a="cadd" data-id="${g.id}" title="Summa qo'shish">＋</button><button data-a="undoc" data-id="${g.id}" title="Oxirgi qo'shimchani bekor qilish">↺</button><button data-a="edit" data-k="goals" data-id="${g.id}" title="Tahrirlash">✎</button><button data-a="del" data-k="goals" data-id="${g.id}" title="O'chirish">×</button></span></div><div class="pg ${p>=100?'done':''}"><i style="width:${p}%"></i></div><div class="sub"><b>${fmt(s)}</b> / ${fmt(g.target)} · ${p}%</div><p class="sub" style="margin-top:6px">${esc(plan(g))}</p></div>`};
function recs(){const mk=todayS().slice(0,7),pd=new Date();pd.setDate(1);pd.setMonth(pd.getMonth()-1);const pk=iso(pd).slice(0,7),ex=db.tx.filter(t=>t.type==='expense');
 if(ex.length<3)return[`Tavsiya uchun kamida 3 ta xarajat kerak. Hozir ${ex.length} ta kiritilgan.`];
 const o={};ex.forEach(t=>o[t.category]=(o[t.category]||0)+t.amount);const[tc,tv]=Object.entries(o).sort((a,b)=>b[1]-a[1])[0],r=[`Xarajatlarning ${Math.round(tv/sum(ex)*100)}% i "${tc}" kategoriyasiga ketgan.`],cm=sum(ex,t=>t.date.startsWith(mk)),cp=sum(ex,t=>t.date.startsWith(pk));
 if(cp>0){const p=Math.round((cm-cp)/cp*100);r.push(p>0?`Bu oy hozirgacha xarajat o'tgan oyning to'liq xarajatidan ${p}% ko'p.`:`Bu oy hozirgacha xarajat o'tgan oydagidan ${100-Math.round(cm/cp*100)}% kam.`)}else r.push("O'tgan oy ma'lumoti yo'q, taqqoslab bo'lmaydi.");
 const im=sum(db.tx,t=>t.type==='income'&&t.date.startsWith(mk));if(im>0)r.push(cm<im?`Bu oy daromaddan ${fmt(im-cm)} qolgan. Jamg'arma uchun bir qismini ajratishni o'ylab ko'ring.`:`Bu oy xarajat daromaddan ${fmt(cm-im)} ko'p.`);return r}
const V={
 dash(){if(!db.tx.length&&!db.debts.length&&!db.rem.length&&!db.goals.length)return`<div class="hero card"><h2>Xush kelibsiz! 👋</h2><p class="sub">HISOBCHI AI — pulingizni o'zbek tilida, oddiy gap bilan boshqaradigan yordamchi. Yozing: «Bozorga 150 ming sarfladim» — qolganini AI o'zi tushunadi.</p>
  <div class="steps"><div><b>1</b><span>AI yordamchiga oddiy gap bilan yozing yoki gapiring 🎤</span></div><div><b>2</b><span>Byudjet limiti va jamg'arma maqsadi qo'ying</span></div><div><b>3</b><span>Tahlil, tavsiya va keyingi oy taxminini oling</span></div></div>
  <div class="bt2"><button class="btn" data-a="demo">✨ Demo ma'lumot bilan ko'rish</button><button class="btn sec" data-a="nav" data-p="ai">✦ AI yordamchiga yozish</button></div></div>`;
  const inc=sum(db.tx,t=>t.type==='income'),exp=sum(db.tx,t=>t.type==='expense'),
  gave=sum(db.debts,d=>d.dir==='gave'&&d.status==='pending'),took=sum(db.debts,d=>d.dir==='took'&&d.status==='pending'),
  late=db.rem.filter(isOver).length,ms=[];
  for(let i=5;i>=0;i--){const d=new Date();d.setDate(1);d.setMonth(d.getMonth()-i);const k=iso(d).slice(0,7);
   ms.push({n:MON[d.getMonth()],i:sum(db.tx,t=>t.type==='income'&&t.date.startsWith(k)),e:sum(db.tx,t=>t.type==='expense'&&t.date.startsWith(k))})}
  const mx=Math.max(1,...ms.flatMap(m=>[m.i,m.e])),cats={};db.tx.filter(t=>t.type==='expense').forEach(t=>cats[t.category]=(cats[t.category]||0)+t.amount);
  const ce=Object.entries(cats).sort((a,b)=>b[1]-a[1]);let acc=0;
  const stops=ce.map(([,v],i)=>{const s=acc/exp*100;acc+=v;return`${COL[i%COL.length]} ${s}% ${acc/exp*100}%`}).join(',');
  const rec=db.tx.slice().sort((a,b)=>b.date.localeCompare(a.date)||b.createdAt-a.createdAt).slice(0,5);
  const bw=budStat().filter(b=>b.p>=80),le=localStorage.getItem(KEY+'-last-export'),nrec=db.tx.length+db.debts.length+db.rem.length,sn=localStorage.getItem(KEY+'-hint-snooze'),oldB=nrec>=20&&(!le||dn(le)<-30)&&(!sn||dn(sn)<-30);
  return`${late?`<div class="warn"><span>⏰ ${late} ta eslatma muddati kelgan</span><button class="btn sec" data-a="nav" data-p="rem">Ko'rish</button></div>`:''}
  ${bw.length?`<div class="warn ${bw.some(b=>b.p>=100)?'bad':''}"><span>💰 Byudjet: ${bw.map(b=>`${esc(b.k)} ${b.p}% (${b.p>=100?'oshgan':'yaqin'})`).join(' · ')}</span><button class="btn sec" data-a="nav" data-p="bud">Byudjet</button></div>`:''}
  ${oldB?`<div class="warn info"><span>💾 ${nrec} ta yozuvingiz faqat shu brauzerda. Zaxira nusxa oling — brauzer tozalansa yo'qolmasin.</span><button class="btn sec" data-a="exp">Nusxa olish</button></div>`:''}
  <div class="grid"><div class="card stat main"><small>Umumiy balans</small><h2>${fmt(inc-exp)}</h2><small>Daromad − xarajat</small></div>
  <div class="card stat"><small>Jami daromad</small><h2 class="income">${fmt(inc)}</h2></div><div class="card stat"><small>Jami xarajat</small><h2 class="expense">${fmt(exp)}</h2></div>
  <div class="card stat"><small>Qarzlar (kutilmoqda)</small><h2>${fmt(gave+took)}</h2><small>Sizga: ${fmt(gave)} · Siz: ${fmt(took)}</small></div></div>
  ${remBlock()}
  <div class="card" style="margin-bottom:16px"><h3>✦ AI tavsiyalari</h3>${recs().map(x=>`<p class="sub" style="margin:6px 0">• ${esc(x)}</p>`).join('')}<p class="sub" style="margin-top:8px;font-size:12px">Faqat kiritilgan ma'lumotlarga asoslangan; moliyaviy kafolat emas.</p></div>
  <div class="two"><div class="card"><h3>Oylik statistika (oxirgi 6 oy)</h3>${db.tx.length?`<div class="chart">${ms.map(m=>`<div class="bg"><div class="bs"><div class="bar i" style="height:${m.i/mx*100}%" title="Daromad: ${fmt(m.i)}"></div><div class="bar e" style="height:${m.e/mx*100}%" title="Xarajat: ${fmt(m.e)}"></div></div><small>${m.n}</small></div>`).join('')}</div><p class="sub" style="margin-top:8px"><span class="income">■</span> daromad <span class="expense">■</span> xarajat</p>`:empty("Hali operatsiya yo'q.")}</div>
  <div class="card"><h3>Xarajatlar diagrammasi</h3>${exp?`<div class="donut"><div class="dn" style="background:conic-gradient(${stops})"></div><div class="lg">${ce.map(([k,v],i)=>`<div><i style="background:${COL[i%COL.length]}"></i><span>${esc(k)}</span><b>${Math.round(v/exp*100)}%</b></div>`).join('')}</div></div>`:empty("Xarajat kiritilmagan.")}</div></div>
  <div class="card"><h3>Oxirgi operatsiyalar</h3>${rec.length?rec.map(t=>rowTx(t,0)).join(''):empty("Birinchi operatsiyani qo'shing yoki AI yordamchiga yozing.")}</div>`},
 list(type){const ms=[...new Set(db.tx.filter(t=>t.type===type).map(t=>t.date.slice(0,7)))].sort().reverse();
  return`<div class="flt"><input id="fq" type="search" placeholder="🔍 Qidirish: izoh, kategoriya, summa" value="${esc(flt.q)}" aria-label="Qidirish"><select id="fm" aria-label="Oy"><option value="">Barcha oylar</option>${ms.map(k=>`<option value="${k}" ${k===flt.m?'selected':''}>${MFULL[+k.slice(5)-1]} ${k.slice(0,4)}</option>`).join('')}</select><select id="fc" aria-label="Kategoriya"><option value="">Barcha kategoriyalar</option>${CAT[type].map(c=>`<option value="${esc(c)}" ${c===flt.c?'selected':''}>${esc(c)}</option>`).join('')}</select></div><div class="card" id="lr">${listBody(type)}</div>`},
 bud(){const b=budStat(),k=todayS().slice(0,7),n=new Date(),dim=new Date(n.getFullYear(),n.getMonth()+1,0).getDate(),day=n.getDate(),left=dim-day+1;
  const tl=b.reduce((a,x)=>a+x.lim,0),ts=b.reduce((a,x)=>a+x.spent,0),S=(l,v,s,cl='')=>`<div class="card stat"><small>${l}</small><h2 class="${cl}">${v}</h2><small>${s}</small></div>`;
  const free=CAT.expense.filter(c=>!db.budgets[c]).map(c=>[c,sum(db.tx,x=>x.type==='expense'&&x.category===c&&x.date.startsWith(k))]).filter(x=>x[1]>0).sort((a,b)=>b[1]-a[1]);
  if(!b.length)return`<div class="card hero"><h2>💰 Byudjet limitlari</h2><p class="sub">Har bir kategoriya uchun oylik limit qo'ying — ilova sarf qanchaga yetganini kuzatib, 80% va 100% da ogohlantiradi.</p><div class="bt2"><button class="btn" data-a="budset">Limit qo'yish</button><button class="btn sec" data-a="nav" data-p="ai">AI orqali: «Oziq-ovqatga 2 mln limit qo'y»</button></div></div>${free.length?`<div class="card"><h3>Bu oy limitsiz xarajatlar</h3>${free.map(([c,v])=>`<div class="row"><div class="rb"><b>${esc(c)}</b></div><strong>${fmt(v)}</strong><button class="btn sec sm" data-a="budset" data-c="${esc(c)}">Limit</button></div>`).join('')}</div>`:''}`;
  return`<p class="sub" style="margin-bottom:12px">${MFULL[n.getMonth()]} ${n.getFullYear()} · oy tugashiga ${left} kun qoldi</p><div class="grid">${S('Jami oylik limit',fmt(tl),b.length+' ta kategoriya')}${S('Sarflangan',fmt(ts),Math.round(ts/tl*100)+'%',ts>tl?'expense':'')}${S('Qolgan',fmt(Math.max(0,tl-ts)),ts>tl?fmt(ts-tl)+' oshgan':'limit doirasida',ts>tl?'expense':'income')}${S('Kunlik sarf imkoni',fmt(Math.max(0,(tl-ts)/left)),'oy oxirigacha har kuni')}</div>
  <div class="card" style="margin-bottom:16px"><h3>Kategoriyalar</h3>${b.map(x=>{const exp=x.lim*day/dim,fast=x.p<100&&x.spent>exp*1.15;return`<div class="bud"><div class="bh"><b>${esc(x.k)}</b><span class="pill ${x.p>=100?'late':x.p>=80?'':'ok'}">${x.p}%</span><span class="acts"><button data-a="budset" data-c="${esc(x.k)}" title="Tahrirlash">✎</button></span></div><div class="pg ${bcls(x.p)}"><i style="width:${Math.min(100,x.p)}%"></i><em style="left:${day/dim*100}%" title="Bugungi kun"></em></div><div class="sub">${fmt(x.spent)} / ${fmt(x.lim)} · ${x.p>=100?`<span class="expense">${fmt(x.spent-x.lim)} oshgan</span>`:`qolgan ${fmt(x.lim-x.spent)} (kuniga ~${fmt((x.lim-x.spent)/left)})`}${fast?' · <span class="du">⚡ oy tezligidan oldinda</span>':''}</div></div>`}).join('')}<p class="sub" style="margin-top:10px;font-size:12px">Chiziqdagi oq belgi — oyning bugungi kuni. Sarf undan oldinda bo'lsa, oy oxirigacha limit yetmasligi mumkin.</p></div>
  ${free.length?`<div class="card"><h3>Bu oy limitsiz xarajatlar</h3>${free.map(([c,v])=>`<div class="row"><div class="rb"><b>${esc(c)}</b></div><strong>${fmt(v)}</strong><button class="btn sec sm" data-a="budset" data-c="${esc(c)}">Limit</button></div>`).join('')}</div>`:''}`},
 set(){const n=db.tx.length+db.debts.length+db.rem.length+db.goals.length,kb=(new Blob([localStorage.getItem(KEY)||'']).size/1024).toFixed(1),le=localStorage.getItem(KEY+'-last-export'),sa=matchMedia('(display-mode: standalone)').matches||navigator.standalone;
  return`<div class="two"><div class="card"><h3>📲 Ilovani o'rnatish</h3>${sa?"<p class=\"sub\">Ilova o'rnatilgan holda ishlayapti ✓</p>":installEvt?`<p class="sub">Telefon yoki kompyuterga ilova sifatida o'rnating — bosh ekrandan ochiladi va internetsiz ham ishlaydi.</p><button class="btn" data-a="install" style="margin-top:10px">📲 O'rnatish</button>`:`<p class="sub">Android / Chrome: brauzer menyusi (⋮) → «Ilovani o'rnatish».<br>iPhone / Safari: «Ulashish» (⬆) → «Bosh ekranga qo'shish».</p>`}<p class="sub" style="margin-top:8px">Oflayn rejim: ${swOk?'faol ✓':"o'chiq (HTTPS yoki localhost kerak)"}</p></div>
  <div class="card"><h3>💾 Zaxira nusxa</h3><p class="sub">${n} ta yozuv · ${kb} KB${le?' · oxirgi nusxa: '+lab(le):' · hali nusxa olinmagan'}</p><div class="bt2"><button class="btn" data-a="exp">⬇ JSON yuklab olish</button><button class="btn sec" data-a="imp">⬆ JSON dan tiklash</button><button class="btn sec" data-a="csv">📄 Excel (CSV)</button></div><p class="sub" style="margin-top:8px;font-size:12px">JSON — boshqa telefon yoki kompyuterga ko'chirish uchun. CSV — Excel'da ochish uchun.</p></div></div>
  <div class="two"><div class="card"><h3>✨ Demo ma'lumot</h3><p class="sub">Imkoniyatlarni ko'rish uchun 6 oylik namunaviy daromad, xarajat, qarz, eslatma, byudjet va maqsadlar yuklanadi. Hozirgi ma'lumotlaringiz avval xotiraga nusxalanadi.</p><div class="bt2"><button class="btn" data-a="demo">Demo yuklash</button>${localStorage.getItem(KEY+'-before-demo')?`<button class="btn sec" data-a="undemo">↺ Demodan oldingi holat</button>`:''}</div></div>
  <div class="card"><h3>🗑 Tozalash</h3><p class="sub">Barcha yozuvlar shu qurilmadan o'chiriladi. Avval zaxira nusxa olishni tavsiya qilamiz.</p><button class="btn red" data-a="wipe" style="margin-top:10px">Hammasini o'chirish</button></div></div>
  <div class="card"><h3>ℹ️ HISOBCHI AI 5.0 haqida</h3><p class="sub">Ma'lumotlar hech qayerga yuborilmaydi — faqat shu qurilmada saqlanadi. AI yordamchi o'zbek tilidagi oddiy gaplarni tushunadi va saqlashdan oldin doim tasdiq so'raydi. Tavsiya va taxminlar faqat kiritilgan ma'lumotlarga asoslanadi; moliyaviy kafolat emas.</p></div>`},
 debts(){const l=db.debts.slice().sort((a,b)=>(a.status==='paid')-(b.status==='paid')||(a.due||'9').localeCompare(b.due||'9'));
  return`<div class="card">${l.length?l.map(d=>{const late=d.status==='pending'&&d.due&&d.due<todayS();
   return`<div class="row"><i class="ic">${d.dir==='gave'?'↗':'↙'}</i><div class="rb"><b>${d.dir==='gave'?'Qarz berdim':'Qarz oldim'}: ${esc(d.person)}</b><small>${lab(d.date)}${d.due?' · muddat: '+lab(d.due):''}${d.note?' · '+esc(d.note):''}</small></div><strong>${fmt(d.amount)}</strong><button class="pill ${d.status==='paid'?'ok':late?'late':''}" data-a="toggle" data-k="debts" data-id="${d.id}">${d.status==='paid'?'Qaytarildi':late?'Muddati o\'tgan':'Kutilmoqda'}</button>${acts('debts',d.id)}</div>`}).join(''):empty("Qarzlar yo'q.")}</div>`},
 rem(){const N='Notification'in window,p=N&&Notification.permission,g={};db.rem.forEach(r=>(g[sect(r)]=g[sect(r)]||[]).push(r));
  Object.values(g).forEach(a=>a.sort((x,y)=>(x.date+(x.time||'')).localeCompare(y.date+(y.time||''))));
  const secs=[['over',"Muddati o'tgan eslatmalar"],['today','Bugungi eslatmalar'],['tom','Ertangi eslatmalar'],['up','Kelgusi eslatmalar'],['done','Bajarilgan eslatmalar']],selL=cal.sel?db.rem.filter(r=>r.date===cal.sel):[];
  return`<div class="two"><div class="card"><h3>Bildirishnoma</h3><p class="sub">${!N?"Bu brauzer bildirishnomani qo'llamaydi. Eslatmalar ilova ichida (xabar va Umumiy sahifada) ko'rinadi.":p==='granted'?"Yoqilgan. Eslatma vaqti kelganda chiqadi, lekin faqat sahifa/brauzer ochiq bo'lganda. Yopiq holatda ishlashi uchun server push kerak (README).":p==='denied'?"Ruxsat berilmagan. Eslatmalar ilova ichida (xabar va Umumiy sahifada) ko'rinadi. Yoqish uchun brauzer sozlamalarida ruxsat bering.":"Ruxsat so'ralmagan. Ruxsatsiz eslatmalar ilova ichida ko'rinadi."}</p><p class="sub" style="margin-top:6px">Service Worker: ${swOk?'faol':"yo'q (HTTPS yoki localhost kerak)"}</p>${N&&p==='default'?`<button class="btn" style="margin-top:10px" data-a="notif">Bildirishnomani yoqish</button>`:''}</div>
  <div class="card"><h3>✦ AI tahlili</h3>${analyze().map(x=>`<p class="sub" style="margin:6px 0">• ${esc(x)}</p>`).join('')}</div></div>
  <div class="card" style="margin-bottom:6px"><h3>Kalendar</h3>${calHTML()}${cal.sel?`<h3 style="margin:14px 0 4px">${lab(cal.sel)}</h3>${selL.length?selL.map(remRow).join(''):empty("Bu kunda eslatma yo'q.")}`:''}</div>
  ${secs.filter(([k])=>g[k]).map(([k,l])=>`<div class="sech"><h3>${l}</h3><span>${g[k].length} ta</span></div><div class="card">${g[k].map(remRow).join('')}</div>`).join('')||empty("Eslatmalar yo'q. «+ Eslatma» tugmasi yoki AI chat orqali qo'shing.")}`},
 an(){const{y,m}=anS,c=mstat(mk(y,m)),p=mstat(mk(y,m-1)),mn=`<div class="mn"><button data-a="anp" aria-label="Oldingi oy">‹</button><b>${MFULL[m]} ${y}</b><button data-a="ann" aria-label="Keyingi oy">›</button></div>`;
  if(!c.n)return mn+`<div class="card">${empty("Bu oy uchun ma'lumot yo'q — tahlil mavjud emas.")}</div>`;
  const S=(l,v,s,cl='')=>`<div class="card stat"><small>${l}</small><h2 class="${cl}">${v}</h2><small>${s}</small></div>`,ce=Object.entries(c.cats).sort((a,b)=>b[1]-a[1]),f=forecast(),ms=[];
  for(let i=5;i>=0;i--){const d=new Date(y,m-i,1),s=mstat(mk(d.getFullYear(),d.getMonth()));ms.push({n:MON[d.getMonth()],i:s.inc,e:s.exp})}const mx=Math.max(1,...ms.flatMap(x=>[x.i,x.e]));
  return mn+`<div class="grid">${S('Jami daromad',fmt(c.inc),c.n+' ta operatsiya','income')}${S('Jami xarajat',fmt(c.exp),c.ne+' ta xarajat','expense')}${S('Sof farq',fmt(c.net),c.net>=0?"Daromad xarajatdan ko'p":"Xarajat daromaddan ko'p",c.net>=0?'income':'expense')}${S("Jamg'arilgan summa",fmt(c.sv),"Maqsadlarda jami: "+fmt(db.goals.reduce((a,g)=>a+gSaved(g),0)))}</div>
  <div class="two"><div class="card"><h3>Oldingi oy bilan taqqoslash</h3>${p.n?`<div class="cmp h"><span></span><span>Bu oy</span><span>O'tgan oy</span><span>O'zgarish</span></div>${[['Daromad','inc',1],['Xarajat','exp',0],['Sof farq','net',1]].map(([l,k,u])=>`<div class="cmp"><span>${l}</span><b>${fmt(c[k])}</b><span>${fmt(p[k])}</span><span>${dlt(c[k],p[k],!!u,1)}</span></div>`).join('')}`:empty("O'tgan oy ma'lumoti yo'q — taqqoslab bo'lmaydi.")}</div>
  <div class="card"><h3>Asosiy ko'rsatkichlar</h3><p class="sub">Eng ko'p xarajat kategoriyasi</p><b>${c.top?`${esc(c.top[0])} — ${fmt(c.top[1])} (${Math.round(c.top[1]/c.exp*100)}%)`:'—'}</b><p class="sub" style="margin-top:10px">Eng katta xarajat</p><b>${c.big?`${fmt(c.big.amount)} — ${esc(c.big.category)}${c.big.note?' ('+esc(c.big.note)+')':''}, ${lab(c.big.date)}`:"xarajat yo'q"}</b></div></div>
  <div class="two"><div class="card"><h3>Kategoriyalar bo'yicha xarajat</h3>${ce.length?ce.map(([k,v])=>`<div class="cr"><span>${esc(k)}</span><div class="pg"><i style="width:${v/c.exp*100}%"></i></div><span style="text-align:right"><b>${fmt(v)}</b><br><small>${p.cats[k]?dlt(v,p.cats[k],false,1):(p.n?'yangi':'—')}</small></span></div>`).join(''):empty("Xarajat kiritilmagan.")}</div>
  <div class="card"><h3>Oxirgi 6 oy</h3><div class="chart">${ms.map(x=>`<div class="bg"><div class="bs"><div class="bar i" style="height:${x.i/mx*100}%" title="Daromad: ${fmt(x.i)}"></div><div class="bar e" style="height:${x.e/mx*100}%" title="Xarajat: ${fmt(x.e)}"></div></div><small>${x.n}</small></div>`).join('')}</div><p class="sub" style="margin-top:8px"><span class="income">■</span> daromad <span class="expense">■</span> xarajat</p></div></div>
  <div class="two"><div class="card"><h3>✦ AI tavsiyalari</h3>${recsFor(c,p).map(x=>`<p class="sub" style="margin:6px 0">• ${esc(x)}</p>`).join('')}<p class="sub" style="margin-top:8px;font-size:12px">Faqat kiritilgan ma'lumotlarga asoslangan; moliyaviy kafolat emas.</p></div>
  <div class="card"><h3>Keyingi oy taxmini</h3>${f?`<p class="sub">Oxirgi ${f.n} ta to'liq oy oralig'i asosida:</p><div class="cmp"><span>Daromad</span><b>${fmt(f.inc[0])} – ${fmt(f.inc[1])}</b></div><div class="cmp"><span>Xarajat</span><b>${fmt(f.exp[0])} – ${fmt(f.exp[1])}</b></div><div class="cmp"><span>Sof farq</span><b>${fmt(f.net[0])} – ${fmt(f.net[1])}</b></div><p class="sub" style="margin-top:8px;font-size:12px">Bu faqat o'tgan oylardagi oraliq (taxmin). Kelajakdagi natija bundan farq qilishi mumkin.</p>`:empty("Taxmin uchun kamida 2 ta oldingi oy ma'lumoti kerak.")}</div></div>`},
 goals(){return db.goals.length?db.goals.map(gc).join('')+`<p class="sub">Qo'shilgan summalar balansdan ayirilmaydi — maqsadlar alohida kuzatiladi.</p>`:`<div class="card">${empty("Jamg'arma maqsadi yo'q. «+ Maqsad» tugmasi bilan qo'shing, masalan: Telefon sotib olish.")}</div>`},
 ai(){return`<div class="card chat"><div class="msgs" id="ms">${chat.map(m=>m.card?cardHTML(m.card,m.card===draft&&!m.card.missing.length):`<div class="m ${m.r}${m.err?' err':''}">${esc(m.t)}</div>`).join('')}${typing?'<div class="m a typ"><i></i><i></i><i></i></div>':''}</div>
  <div class="chips">${["Bozorga 150 ming sarfladim","Bugun 3 mln maosh oldim","Ertaga internet to'lovini eslat","Telefon uchun 5 mln jamg'armoqchiman","Oziq-ovqatga oyiga 2 mln limit qo'y","Byudjetim qanday?"].map(x=>`<button data-a="chip" data-t="${esc(x)}">${esc(x)}</button>`).join('')}</div>
  <form class="cin" id="cf"><input id="ci" autocomplete="off" placeholder="Masalan: Kecha taksiga 25 ming to'ladim" aria-label="Xabar"><button type="button" class="btn sec" id="mic" data-a="mic" title="Ovoz bilan yozish" aria-label="Mikrofon">🎤</button><button class="btn" aria-label="Yuborish">➤</button></form></div>`}};
const PAGES=[['dash','▦','Umumiy ko\'rinish'],['income','↗','Daromadlar'],['expense','↘','Xarajatlar'],['debts','⇄','Qarzlar'],['an','📊','Tahlil'],['bud','💰','Byudjet'],['goals','🎯',"Jamg'arma"],['ai','✦','AI yordamchi'],['rem','⏰','Eslatmalar'],['set','⚙','Sozlamalar']];
const ADD={income:['income',"+ Daromad"],expense:['expense',"+ Xarajat"],debts:['debt',"+ Qarz"],rem:['rem',"+ Eslatma"],goals:['goal',"+ Maqsad"],bud:['bud',"✎ Limitlar"]};
let flt={q:'',m:'',c:''},installEvt=null;
function listBody(type){const q=flt.q.trim().toLowerCase().replace(/\s/g,''),l=db.tx.filter(t=>t.type===type&&(!flt.m||t.date.startsWith(flt.m))&&(!flt.c||t.category===flt.c)&&(!q||(t.note+t.category+t.amount+lab(t.date)).toLowerCase().replace(/\s/g,'').includes(q))).sort((a,b)=>b.date.localeCompare(a.date)||b.createdAt-a.createdAt),f=flt.q||flt.m||flt.c;
 return`<p class="sub">${f?'Topildi':'Jami'}: <b class="${type}">${fmt(sum(l))}</b> · ${l.length} ta yozuv${f?' · <button class="lnk" data-a="fclr">filtrni tozalash</button>':''}</p>${l.length?l.map(t=>rowTx(t)).join(''):empty(f?"Bu filtr bo'yicha yozuv topilmadi.":"Hozircha yozuv yo'q.")}`}
function route(){$('#nav').innerHTML=PAGES.map(([k,i,n])=>`<button class="${k===page?'on':''}" data-a="nav" data-p="${k}"><span>${i}</span>${n}</button>`).join('');
 $('#ttl').textContent=PAGES.find(p=>p[0]===page)[2];$('#view').innerHTML=page==='income'||page==='expense'?V.list(page):V[page]();
 const a=ADD[page],b=$('#top');b.hidden=!a;if(a)b.textContent=a[1];
 if(page==='ai'){const m=$('#ms');m.scrollTop=m.scrollHeight;$('#ci').focus({preventScroll:true})}}
function go(p){if(p!==page)flt={q:'',m:'',c:''};page=p;try{history.replaceState(null,'',p==='dash'?location.pathname:'?p='+p)}catch{}$('#side').classList.remove('open');$('#bd').classList.remove('open');route()}

/* ---- Forma ---- */
const F=(l,n,t,v='',x='')=>`<label>${l}<input name="${n}" type="${t}" value="${esc(v)}" ${x}></label>`;
const S=(l,n,o,v)=>`<label>${l}<select name="${n}">${o.map(x=>{const[a,b]=Array.isArray(x)?x:[x,x];return`<option value="${esc(a)}" ${a===v?'selected':''}>${esc(b)}</option>`}).join('')}</select></label>`;
function openForm(kind,it={},after){const isTx=kind==='income'||kind==='expense',k=isTx?'tx':kind,type=isTx?kind:it.type;
 const title=(it.id?'Tahrirlash: ':"Qo'shish: ")+{income:'daromad',expense:'xarajat',debt:'qarz',rem:'eslatma'}[kind];let h='';
 if(isTx)h=F('Miqdor (so\'m)','amount','number',it.amount||'','min="1" step="1" required')+F('Sana','date','date',it.date||todayS(),'required')+S('Kategoriya','category',CAT[type],it.category)+F('Izoh','note','text',it.note||'','maxlength="80"');
 if(kind==='debt')h=S('Turi','dir',[['gave','Qarz berdim'],['took','Qarz oldim']],it.dir||'gave')+F('Kim bilan','person','text',it.person||'','required maxlength="40"')+F('Miqdor (so\'m)','amount','number',it.amount||'','min="1" step="1" required')+`<div class="fr">${F('Sana','date','date',it.date||todayS(),'required')}${F('Qaytarish muddati','due','date',it.due||'')}</div>`+S('Holati','status',[['pending','Kutilmoqda'],['paid','Qaytarildi']],it.status||'pending')+F('Izoh','note','text',it.note||'','maxlength="80"');
 if(kind==='rem')h=F('Eslatma nomi','text','text',it.text||'','required maxlength="100"')+`<div class="fr">${F('Sana','date','date',it.date||todayS(),'required')}${F('Vaqt','time','time',it.time||'')}</div>`+F("Miqdor (ixtiyoriy, so'm)",'amount','number',it.amount||'','min="0" step="1"')+`<div class="fr">${S('Turi','type',Object.entries(RT),it.type||'task')}${S('Takrorlanish','repeat',Object.entries(RP),it.repeat||'once')}</div>`+F('Izoh','note','text',it.note||'','maxlength="80"');
 const m=$('#modal');m.hidden=false;m.innerHTML=`<form class="mod" id="mf"><h2>${title}</h2>${h}<div class="bt"><button type="button" class="btn sec" data-a="close">Bekor qilish</button><button class="btn">Saqlash</button></div></form>`;
 const first=m.querySelector('input,select');first&&first.focus();
 $('#mf').onsubmit=e=>{e.preventDefault();if(e.target.dataset.s)return;const f=Object.fromEntries(new FormData(e.target));if(isTx)f.type=type;
  if(kind!=='rem'&&!(+f.amount>0)){toast("Summani to'g'ri kiriting.");return}
  e.target.dataset.s=1;const out=build(k,f,it);upsert(k,out);after?after(out):Store.save();Store.save();m.hidden=true;route();toast('Saqlandi.')}}
function modal2(title,h,fn){const m=$('#modal');m.hidden=false;m.innerHTML=`<form class="mod" id="mf"><h2>${title}</h2>${h}<div class="bt"><button type="button" class="btn sec" data-a="close">Bekor qilish</button><button class="btn">Saqlash</button></div></form>`;const i=m.querySelector('input');i&&i.focus();
 $('#mf').onsubmit=e=>{e.preventDefault();if(e.target.dataset.s)return;if(fn(Object.fromEntries(new FormData(e.target)))===false)return;e.target.dataset.s=1;Store.save();m.hidden=true;route();toast('Saqlandi.')}}
const openGoal=(it={})=>modal2(it.id?'Tahrirlash: maqsad':"Qo'shish: jamg'arma maqsadi",F('Maqsad nomi','name','text',it.name||'','required maxlength="60" placeholder="Masalan: Telefon sotib olish"')+F("Kerakli summa (so'm)",'target','number',it.target||'','min="1" step="1" required')+F("Hozirgacha yig'ilgan (ixtiyoriy)",'start','number',it.start||'','min="0" step="1"')+F('Muddat (ixtiyoriy)','deadline','date',it.deadline||'')+F('Izoh','note','text',it.note||'','maxlength="80"'),v=>{
 const t=Math.round(+v.target),st=Math.round(+v.start)||0;if(!v.name.trim()||!(t>0)||st<0){toast("Nomi va summani to'g'ri kiriting.");return false}
 const o={id:it.id||uid(),name:v.name.trim(),target:t,start:st,deadline:v.deadline||'',note:v.note.trim(),contribs:it.contribs||[],createdAt:it.createdAt||Date.now()},i=db.goals.findIndex(x=>x.id===o.id);i>=0?db.goals[i]=o:db.goals.push(o)});
const openContrib=g=>modal2("Summa qo'shish: "+esc(g.name),F("Summa (so'm)",'amount','number','','min="1" step="1" required')+F('Sana','date','date',todayS(),'required'),v=>{const a=Math.round(+v.amount);if(!(a>0)||!okD(v.date)){toast("Summani to'g'ri kiriting.");return false}g.contribs.push({id:uid(),amount:a,date:v.date})});
const openBud=focus=>{modal2("Oylik byudjet limitlari",`<p class="sub">Limit qo'ymoqchi bo'lmagan kategoriyani bo'sh qoldiring.</p>`+CAT.expense.map(c=>F(c+" (so'm)",c,'number',db.budgets[c]||'','min="0" step="1000" placeholder="limit yo\'q"')).join(''),v=>{
 const nb={};for(const[c,x]of Object.entries(v)){const n=Math.round(+x);if(CAT.expense.includes(c)&&n>0)nb[c]=n}db.budgets=nb});
 if(focus){const i=[...document.querySelectorAll('#mf input')].find(x=>x.name===focus);if(i){i.focus();i.scrollIntoView({block:'center'})}}};

/* ---- Zaxira nusxa, CSV, demo ---- */
function dl(name,text,mime){const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([text],{type:mime}));a.download=name;document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove()},800)}
function exportJSON(){dl(`hisobchi-zaxira-${todayS()}.json`,JSON.stringify({app:'HISOBCHI AI',exported:new Date().toISOString(),...db},null,1),'application/json');try{localStorage.setItem(KEY+'-last-export',todayS())}catch{}route();toast('Zaxira nusxa yuklab olindi.')}
function exportCSV(){const q=v=>{const s=String(v??'');return/[;"\n]/.test(s)?'"'+s.replace(/"/g,'""')+'"':s};
 const rows=[['Sana','Turi','Kategoriya',"Summa (so'm)",'Izoh']].concat(db.tx.slice().sort((a,b)=>a.date.localeCompare(b.date)).map(t=>[t.date,t.type==='income'?'Daromad':'Xarajat',t.category,t.type==='income'?t.amount:-t.amount,t.note]));
 if(db.debts.length)rows.push([],['Qarzlar'],['Sana','Turi','Kim',"Summa (so'm)",'Muddat','Holati','Izoh'],...db.debts.map(d=>[d.date,d.dir==='gave'?'Berilgan':'Olingan',d.person,d.amount,d.due,d.status==='paid'?'Qaytarildi':'Kutilmoqda',d.note]));
 dl(`hisobchi-${todayS()}.csv`,'﻿'+rows.map(r=>r.map(q).join(';')).join('\r\n'),'text/csv;charset=utf-8');toast('CSV yuklab olindi — Excel bilan oching.')}
function importJSON(file){const r=new FileReader();r.onload=()=>{let o;try{o=JSON.parse(r.result)}catch{toast("Fayl o'qilmadi: JSON emas.");return}
 if(!o||typeof o!=='object'||!Array.isArray(o.tx)){toast("Bu HISOBCHI zaxira fayli emas.");return}
 const nd=Store.norm({...o,v:[2,3,4,5].includes(o.v)?o.v:5}),n=nd.tx.length+nd.debts.length+nd.rem.length+nd.goals.length;
 if(!confirm(`Fayldagi ${n} ta yozuv hozirgi ma'lumotlar o'rniga yuklanadi. Davom etasizmi?`))return;
 try{localStorage.setItem(KEY+'-before-import',JSON.stringify(db))}catch{}db=nd;Store.save();route();toast(`Tiklandi: ${n} ta yozuv.`)};r.readAsText(file)}
function demoData(){let s=20261124,c=0;const R=()=>(s=(s*16807)%2147483647)/2147483647,pick=a=>a[Math.floor(R()*a.length)],id=()=>Date.now()*1000+(c++),now=new Date(),tx=[];
 const E=[['Oziq-ovqat',[60,420],['Bozor','Korzinka','Non va sut','Restoran','Meva-sabzavot','Go\'sht'],8],['Transport',[15,110],['Taksi','Benzin','Metro'],6],['Uy-joy',[380,850],['Kommunal to\'lovlar'],1],['Aloqa',[70,150],['Internet','Telefon'],2],["Ta'lim",[250,600],['Ingliz tili kursi','Kitob'],1],['Salomatlik',[40,250],['Dorixona','Stomatolog'],1],['Kiyim',[150,650],['Poyabzal',"Ko'ylak",'Kurtka'],1],["Ko'ngilochar",[50,280],['Kino',"Do'stlar bilan kafe",'Bouling'],2]];
 for(let i=5;i>=0;i--){const d0=new Date(now.getFullYear(),now.getMonth()-i,1),y=d0.getFullYear(),m=d0.getMonth(),last=i?new Date(y,m+1,0).getDate():now.getDate();
  const add=(type,cat,amt,d,note)=>tx.push({id:id(),type,category:cat,amount:Math.max(1000,Math.round(amt/1000)*1000),date:iso(new Date(y,m,Math.min(d,last))),note,createdAt:Date.now()+c});
  add('income','Maosh',(6.5+R()*1.2)*1e6,5,'Oylik maosh');if(R()>.35)add('income','Freelance',(0.8+R()*1.6)*1e6,2+Math.floor(R()*25),'Dizayn loyihasi');
  E.forEach(([cat,[a,b],notes,n])=>{const k=Math.max(1,Math.round(n*(0.75+R()*.5)));for(let j=0;j<k;j++)add('expense',cat,(a+R()*(b-a))*1000*(i===0&&cat==='Oziq-ovqat'?1.35:1),1+Math.floor(R()*28),pick(notes))})}
 const nd=(dom)=>{const y=now.getFullYear(),m=now.getMonth();let d=new Date(y,m,dom);if(iso(d)<todayS())d=new Date(y,m+1,dom);return iso(d)};
 const rem=(text,date,type,amount=0,repeat='once',dom=0,time='')=>({id:id(),text,amount,date,time,note:'',type,repeat,dom:dom||+date.slice(8),done:false,nk:date+'T'+(time||'09:00')<todayS()?date+'T'+(time||'09:00'):''});
 const mago=n=>iso(new Date(now.getFullYear(),now.getMonth()-n,10));
 return{v:5,tx,
  debts:[{id:id(),dir:'gave',person:'Aziz',amount:500000,date:addD(-12),due:addD(4),note:"Telefon ta'miri uchun",status:'pending'},{id:id(),dir:'took',person:'Sardor aka',amount:1200000,date:addD(-40),due:addD(-2),note:'',status:'pending'},{id:id(),dir:'gave',person:'Dilnoza',amount:300000,date:addD(-50),due:addD(-30),note:'',status:'paid'}],
  rem:[rem("Internet to'lovi",nd(15),'telecom',100000,'monthly',15),rem("Kommunal to'lovlar",nd(10),'utility',450000,'monthly',10),rem('Aziz qarzni qaytarishi',addD(4),'debtback',500000),rem("Sardor akaga qarzni qaytarish",addD(-2),'debttake',1200000),rem("Ingliz tili kursi to'lovi",addD(1),'planned',400000,'once',0,'10:00')],
  goals:[{id:id(),name:'Noutbuk sotib olish',target:9000000,start:1500000,deadline:iso(new Date(now.getFullYear(),now.getMonth()+6,1)),note:'MacBook Air',contribs:[4,3,2,1,0].map(n=>({id:id(),amount:600000+n*100000,date:n?mago(n):todayS()})),createdAt:Date.now()},{id:id(),name:'Samarqandga sayohat',target:3000000,start:0,deadline:'',note:'Oila bilan',contribs:[2,1].map(n=>({id:id(),amount:400000,date:mago(n)})),createdAt:Date.now()}],
  budgets:{'Oziq-ovqat':2200000,Transport:500000,"Ko'ngilochar":450000,Kiyim:700000}}}
function loadDemo(){const has=db.tx.length+db.debts.length+db.rem.length+db.goals.length;
 if(has&&!confirm("Demo ma'lumot hozirgi ma'lumotlar o'rniga yuklanadi (ular «Sozlamalar»dan qaytarib olinadi). Davom etasizmi?"))return;
 if(has)try{localStorage.setItem(KEY+'-before-demo',JSON.stringify(db))}catch{}try{localStorage.setItem(KEY+'-hint-snooze',todayS())}catch{}db=demoData();Store.save();anS={y:new Date().getFullYear(),m:new Date().getMonth()};go('dash');toast("Demo ma'lumot yuklandi ✨")}
function toast(t){const e=$('#toast');e.textContent=t;e.classList.add('on');clearTimeout(toast.t);toast.t=setTimeout(()=>e.classList.remove('on'),2800)}

/* ---- Chat ---- */
let typing=false,cal={y:new Date().getFullYear(),m:new Date().getMonth(),sel:null},anS={y:new Date().getFullYear(),m:new Date().getMonth()};
async function send(t){t=t.trim();if(!t||typing)return;chat.push({r:'u',t});typing=true;route();
 try{const r=await Parser.understand(t,draft);await new Promise(x=>setTimeout(x,450));
  if(r.answer){chat.push({r:'a',t:r.answer});draft=r.draft}else{draft=r.draft;if(!draft)chat.push({r:'a',t:r.reply});else if(r.ask)chat.push({r:'a',t:r.ask});else chat.push({r:'a',card:draft})}}
 catch(e){console.error(e);chat.push({r:'a',t:"Xatolik yuz berdi. Qayta urinib ko'ring.",err:1})}
 typing=false;route()}
/* ---- Ovozli kiritish (Web Speech API). Matn yuborilmaydi: avval tahrirlanadi ---- */
function mic(){const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
 if(!SR){toast("Bu brauzer ovozli kiritishni qo'llamaydi (Chrome tavsiya etiladi). Yozib kiriting.");return}
 if(mic.r){mic.r.stop();return}const r=new SR();r.lang='uz-UZ';r.interimResults=false;
 r.onstart=()=>{const b=$('#mic');b&&b.classList.add('rec');toast("Eshitmoqdaman... gapiring")};
 r.onresult=e=>{const i=$('#ci');if(i){i.value=(i.value+' '+e.results[0][0].transcript).trim();i.focus()}};
 r.onerror=e=>toast(e.error==='not-allowed'||e.error==='service-not-allowed'?"Mikrofon ruxsati berilmagan. Brauzer sozlamalarida ruxsat bering.":e.error==='language-not-supported'?"Bu qurilma o'zbek tilini tanimaydi. Yozib kiriting.":e.error==='no-speech'?"Ovoz eshitilmadi.":"Ovoz tanilmadi ("+e.error+").");
 r.onend=()=>{mic.r=null;const b=$('#mic');b&&b.classList.remove('rec')};mic.r=r;try{r.start()}catch{mic.r=null}}

/* ---- Bildirishnoma ---- */
let swOk=false;
async function fire(r){const body=r.text+(r.amount?' · '+fmt(r.amount):''),tag='r'+r.id+r.nk;
 if('Notification'in window&&Notification.permission==='granted'){try{const reg=navigator.serviceWorker&&await navigator.serviceWorker.getRegistration();if(reg)await reg.showNotification('HISOBCHI AI',{body,tag});else new Notification('HISOBCHI AI',{body,tag});return}catch{}}
 toast('⏰ '+body)}
let lastMin='';
async function checkRem(){const n=new Date(),ns=iso(n),nt=pad(n.getHours())+':'+pad(n.getMinutes()),due=[];let ch=false;
 db.rem.forEach(r=>{const tm=r.time||'09:00',key=r.date+'T'+tm;if(r.done||r.nk===key||r.date>ns||(r.date===ns&&tm>nt))return;r.nk=key;ch=true;if(n-new Date(r.date+'T'+tm+':00')<864e5)due.push(r)});
 if(ch)Store.save();const sk=ns+(page==='rem'||page==='dash'?nt:'');if(!due.length&&sk===lastMin)return;lastMin=sk;for(const r of due.slice(0,5))await fire(r);const ae=document.activeElement;if(!(ae&&/INPUT|SELECT|TEXTAREA/.test(ae.tagName)&&$('#view').contains(ae)&&ae.value))route()}
/* ---- Hodisalar ---- */
document.addEventListener('click',e=>{const el=e.target.closest('[data-a]');if(!el)return;const a=el.dataset.a,k=el.dataset.k,id=+el.dataset.id;
 if(a==='nav')go(el.dataset.p);
 else if(a==='close')$('#modal').hidden=true;
 else if(a==='del'){if(confirm("Bu yozuvni o'chirasizmi?")){db[k]=db[k].filter(x=>x.id!==id);Store.save();route();toast("O'chirildi.")}}
 else if(a==='edit'){const it=db[k].find(x=>x.id===id);if(it&&k==='goals')openGoal(it);else if(it)openForm(k==='tx'?it.type:k==='debts'?'debt':'rem',it)}
 else if(a==='toggle'){const it=db[k].find(x=>x.id===id);if(it){if(k==='debts')it.status=it.status==='paid'?'pending':'paid';else doneRem(it);Store.save();route()}}
 else if(a==='notif')Notification.requestPermission().then(()=>{route();checkRem()});
 else if(a==='chip')send(el.dataset.t);
 else if(a==='mic')mic();
 else if(a==='cday'){cal.sel=cal.sel===el.dataset.d?null:el.dataset.d;route()}
 else if(a==='cprev'||a==='cnext'){cal.m+=a==='cnext'?1:-1;if(cal.m>11){cal.m=0;cal.y++}if(cal.m<0){cal.m=11;cal.y--}route()}
 else if(a==='anp'||a==='ann'){anS.m+=a==='ann'?1:-1;if(anS.m>11){anS.m=0;anS.y++}if(anS.m<0){anS.m=11;anS.y--}route()}
 else if(a==='cadd'){const g=db.goals.find(x=>x.id===id);g&&openContrib(g)}
 else if(a==='undoc'){const g=db.goals.find(x=>x.id===id);if(g&&g.contribs.length&&confirm("Oxirgi qo'shilgan summani bekor qilasizmi?")){g.contribs.pop();Store.save();route()}}
 else if(a==='ok'){const s=commit(draft);chat.push({r:'a',t:s?"Saqlandi ✓":"Bu yozuv hozirgina saqlangan, takrorlanmadi."});draft=null;route()}
 else if(a==='no'){draft=null;chat.push({r:'a',t:"Bekor qilindi, hech narsa saqlanmadi."});route()}
 else if(a==='demo')loadDemo();
 else if(a==='undemo'){const s=localStorage.getItem(KEY+'-before-demo');if(s&&confirm("Demodan oldingi ma'lumotlaringiz qaytarilsinmi?")){let o=null;try{o=JSON.parse(s)}catch{}if(o){db=Store.norm(o);Store.save();localStorage.removeItem(KEY+'-before-demo');route();toast('Qaytarildi.')}}}
 else if(a==='wipe'){if(confirm("Barcha ma'lumotlar o'chiriladi. Ishonchingiz komilmi?")){try{localStorage.setItem(KEY+'-before-wipe',JSON.stringify(db))}catch{}db=Store.norm(null);Store.save();go('dash');toast("Tozalandi.")}}
 else if(a==='exp')exportJSON();
 else if(a==='csv')exportCSV();
 else if(a==='imp')$('#imp').click();
 else if(a==='install'&&installEvt){installEvt.prompt();installEvt.userChoice.finally(()=>{installEvt=null;route()})}
 else if(a==='budset')openBud(el.dataset.c);
 else if(a==='fclr'){flt={q:'',m:'',c:''};route()}
 else if(a==='editd'&&(draft.kind==='goal'||draft.kind==='bud')){const d=draft;if(d.kind==='goal')openGoal({name:d.name||'',target:d.amount||'',deadline:d.deadline||''});else{openBud(d.category);const i=[...document.querySelectorAll('#mf input')].find(x=>x.name===d.category);if(i&&d.amount)i.value=d.amount}
  const f=$('#mf'),old=f.onsubmit;f.onsubmit=ev=>{old(ev);if(!$('#modal').hidden)return;draft=null;chat.push({r:'a',t:"Tahrirlangan yozuv saqlandi ✓"});route()}}
 else if(a==='editd'){const d=draft;openForm(d.kind==='tx'?(d.type||'expense'):d.kind,d,out=>{remFor(d,out)});
  const f=$('#mf'),old=f.onsubmit;f.onsubmit=ev=>{old(ev);if(!$('#modal').hidden)return;draft=null;chat.push({r:'a',t:"Tahrirlangan yozuv saqlandi ✓"});route()}}});
document.addEventListener('submit',e=>{if(e.target.id==='cf'){e.preventDefault();const i=$('#ci'),v=i.value;i.value='';send(v)}});
$('#top').onclick=()=>{const k=ADD[page][0];k==='goal'?openGoal():k==='bud'?openBud():openForm(k)};
document.addEventListener('input',e=>{const id=e.target.id;if(!['fq','fm','fc'].includes(id))return;flt[{fq:'q',fm:'m',fc:'c'}[id]]=e.target.value;const l=$('#lr');if(l)l.innerHTML=listBody(page)});
$('#imp').onchange=e=>{const f=e.target.files[0];if(f)importJSON(f);e.target.value=''};
window.addEventListener('beforeinstallprompt',e=>{e.preventDefault();installEvt=e;if(page==='set')route()});
window.addEventListener('appinstalled',()=>{installEvt=null;toast("Ilova o'rnatildi ✓")});
const netS=()=>{$('#net').textContent=navigator.onLine?'':'· 📴 Oflayn rejim'};window.addEventListener('online',netS);window.addEventListener('offline',netS);netS();
{const p=new URLSearchParams(location.search).get('p');if(p&&PAGES.some(x=>x[0]===p))page=p}
$('#menu').onclick=()=>{$('#side').classList.toggle('open');$('#bd').classList.toggle('open')};$('#bd').onclick=()=>go(page);
$('#modal').addEventListener('mousedown',e=>{if(e.target.id==='modal')e.target.hidden=true});
document.addEventListener('keydown',e=>{if(e.key==='Escape')$('#modal').hidden=true});
if('serviceWorker'in navigator&&(location.protocol==='https:'||location.hostname==='localhost'))navigator.serviceWorker.register('sw.js').then(()=>navigator.serviceWorker.ready).then(()=>{swOk=true;if(page==='rem')route()}).catch(()=>{});
document.addEventListener('visibilitychange',()=>{if(!document.hidden)checkRem()});
route();checkRem();setInterval(checkRem,30000);
