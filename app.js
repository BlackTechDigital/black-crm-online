(()=>{'use strict';
const PROJECT='https://mkotuyaoactpotvizqhg.supabase.co', K='black_crm_publishable_key';
const $=id=>document.getElementById(id), fmt=new Intl.NumberFormat('pt-BR',{style:'currency',currency:'BRL'});
let db=null,user=null,clients=[],editing=null;
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c]));
function show(id){for(const n of ['setup','login','app','editpanel','propanel'])$(n).classList.toggle('hide',n!==id);$('logout').classList.toggle('hide',!user)}
function msg(t,err=false){$('msg').textContent=t;$('msg').className=err?'error':'ok'}
function init(key){if(!window.supabase?.createClient){msg('Biblioteca do Supabase não carregou. Verifique a conexão com a internet.',true);return}
db=window.supabase.createClient(PROJECT,key,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:false}});
db.auth.onAuthStateChange((_event,session)=>{const previous=user?.id;user=session?.user||null;if(!user){show('login');clients=[]}else if(previous!==user.id){show('app');restoreGoal();setTimeout(load,0)}});
db.auth.getSession().then(({data,error})=>{if(error)throw error;user=data.session?.user||null;show(user?'app':'login');if(user){restoreGoal();load()}}).catch(e=>msg(e.message,true))}
const saved=localStorage.getItem(K);if(saved&&saved.startsWith('sb_publishable_'))init(saved);else show('setup');
$('connect').onclick=()=>{const k=$('key').value.trim();if(!/^sb_publishable_[A-Za-z0-9_-]+$/.test(k))return msg('Informe uma publishable key válida.',true);localStorage.setItem(K,k);init(k)};
$('signin').onclick=async()=>{if(!db)return;msg('Entrando...');const {error}=await db.auth.signInWithPassword({email:$('email').value.trim(),password:$('password').value});$('password').value='';if(error)msg('Não foi possível entrar. Confira e-mail, senha e confirmação da conta.',true)};
$('logout').onclick=async()=>{if(db)await db.auth.signOut();user=null;clients=[];show('login')};
function fromDb(c){return {id:c.id,name:c.nome,city:c.cidade||'',phone:c.whatsapp||'',status:c.status,amount:c.valor_proposta,next:c.proximo_contato||'',notes:c.observacoes||'',url:c.site||'',updated:c.atualizado_em||c.criado_em}}
function toDb(c){return {id:c.id,usuario_id:user.id,nome:c.name,cidade:c.city||null,whatsapp:c.phone||null,status:c.status,valor_proposta:c.amount===null?null:c.amount,proximo_contato:c.next||null,observacoes:c.notes||null,site:c.url||null}}
async function load(){if(!user)return;msg('Sincronizando...');const {data,error}=await db.from('clientes').select('*').order('criado_em',{ascending:false}).limit(1000);if(error)return msg('Falha ao carregar: '+error.message,true);clients=data.map(fromDb);render();msg('Sincronizado com o Supabase.')}
function render(){const q=$('search').value.toLowerCase();const list=clients.filter(c=>(c.name+' '+c.city).toLowerCase().includes(q));$('total').textContent=clients.length;$('won').textContent=clients.filter(c=>c.status==='Venda realizada').length;$('revenue').textContent=fmt.format(clients.filter(c=>c.status==='Venda realizada'&&c.amount!=null).reduce((s,c)=>s+Number(c.amount),0));$('rows').innerHTML=list.map(c=>`<tr><td><strong>${esc(c.name)}</strong><div class="muted">${esc(c.city)}</div></td><td>${esc(c.status)}</td><td>${c.amount==null?'—':fmt.format(c.amount)}</td><td>${esc(c.next||'—')}</td><td><button class="btn" data-edit="${esc(c.id)}">Editar</button></td></tr>`).join('')||'<tr><td colspan="5">Nenhuma empresa encontrada.</td></tr>';document.querySelectorAll('[data-edit]').forEach(b=>b.onclick=()=>edit(b.dataset.edit));renderExtra()}

const GOALS=[1000,2000,3000,5000,7500,10000,15000,20000,30000,50000,75000,100000];
let goalIndex=0;
function goalStorageKey(){return 'blacktech_crm_goal_v3_'+(user?.id||'guest')}
function restoreGoal(){try{const n=Number(localStorage.getItem(goalStorageKey()));goalIndex=Number.isInteger(n)&&n>=0&&n<GOALS.length?n:0}catch{goalIndex=0}}
function renderGoals(){
 const target=GOALS[goalIndex];
 const sold=clients.filter(c=>c.status==='Venda realizada'&&c.amount!=null).reduce((sum,c)=>sum+Number(c.amount),0);
 const percent=target>0?Math.min(100,Math.max(0,sold/target*100)):0;
 $('goalTarget').textContent=fmt.format(target);
 $('goalFill').style.width=percent+'%';
 $('goalTrack').setAttribute('aria-valuenow',String(Math.round(percent)));
 $('goalProgress').textContent=percent.toLocaleString('pt-BR',{maximumFractionDigits:1})+'% concluído';
 $('goalRemaining').textContent=sold>=target?'Meta alcançada!':('Faltam '+fmt.format(target-sold));
 $('goalNext').textContent=goalIndex+1<GOALS.length?fmt.format(GOALS[goalIndex+1]):'Último marco atingido';
 $('goalAdvance').disabled=sold<target||goalIndex>=GOALS.length-1;
 $('goalMessage').textContent=sold>=target?'🏆 Parabéns! Você atingiu esta meta. Avance quando quiser.':'Continue fechando vendas para alcançar o próximo marco.';
 const wrap=$('goalMilestones');wrap.replaceChildren();
 GOALS.forEach((value,i)=>{const chip=document.createElement('span');chip.className='goal-chip'+(i===goalIndex?' active':i<goalIndex?' done':'');chip.textContent=(i<goalIndex?'✓ ':'')+fmt.format(value);wrap.append(chip)});
}
$('goalAdvance').onclick=()=>{
 const sold=clients.filter(c=>c.status==='Venda realizada'&&c.amount!=null).reduce((sum,c)=>sum+Number(c.amount),0);
 if(sold<GOALS[goalIndex]||goalIndex>=GOALS.length-1)return;
 goalIndex++;try{localStorage.setItem(goalStorageKey(),String(goalIndex))}catch{}
 renderGoals();msg('Nova meta desbloqueada! 🚀');
};
const PIPELINE_STATUSES=['Prospecto','Contatado','Demonstração','Negociação','Venda realizada','Sem interesse'];
function renderExtra(){
 renderGoals();
 const today=new Date().toLocaleDateString('en-CA');
 const due=clients.filter(c=>c.next&&c.next<=today&&c.status!=='Venda realizada'&&c.status!=='Sem interesse');
 if($('negotiating'))$('negotiating').textContent=clients.filter(c=>c.status==='Negociação').length;
 if($('pending'))$('pending').textContent=due.length;
 const won=clients.filter(c=>c.status==='Venda realizada').length;
 if($('conversion'))$('conversion').textContent=(clients.length?Math.round(won/clients.length*100):0)+'%';
 const pipeline=$('pipeline');pipeline.replaceChildren();
 for(const status of PIPELINE_STATUSES){
  const items=clients.filter(c=>c.status===status);
  const col=document.createElement('section');col.className='kanban-col';col.dataset.status=status;
  const head=document.createElement('h3');head.textContent=status;const count=document.createElement('span');count.className='count';count.textContent=items.length;head.append(count);col.append(head);
  for(const c of items){const card=document.createElement('div');card.className='kanban-card';card.draggable=true;card.dataset.id=c.id;
   const name=document.createElement('strong');name.textContent=c.name;const city=document.createElement('small');city.textContent=c.city||'Cidade não informada';card.append(name,city);
   if(c.amount!=null){const price=document.createElement('small');price.textContent=fmt.format(c.amount);card.append(price)}
   const btn=document.createElement('button');btn.className='btn';btn.textContent='Editar';btn.onclick=()=>edit(c.id);card.append(btn);
   card.addEventListener('dragstart',e=>{e.dataTransfer.setData('text/plain',c.id);e.dataTransfer.effectAllowed='move'});col.append(card)}
  col.addEventListener('dragover',e=>{e.preventDefault();col.classList.add('drag-over')});col.addEventListener('dragleave',()=>col.classList.remove('drag-over'));
  col.addEventListener('drop',async e=>{e.preventDefault();col.classList.remove('drag-over');const id=e.dataTransfer.getData('text/plain');const c=clients.find(x=>x.id===id);if(!c||c.status===status)return;
   const old=c.status;c.status=status;render();const {error}=await db.from('clientes').update({status}).eq('id',id).eq('usuario_id',user.id);
   if(error){c.status=old;render();msg('Não foi possível alterar o status: '+error.message,true)}else msg('Etapa atualizada com sucesso.')});pipeline.append(col)
 }
 const chart=$('statusChart');chart.replaceChildren();
 for(const status of PIPELINE_STATUSES){const n=clients.filter(c=>c.status===status).length;const row=document.createElement('div');row.className='chart-row';
  const name=document.createElement('span');name.textContent=status;const track=document.createElement('div');track.className='chart-track';const fill=document.createElement('div');fill.className='chart-fill';fill.style.width=(clients.length?100*n/clients.length:0)+'%';track.append(fill);const value=document.createElement('strong');value.textContent=n;row.append(name,track,value);chart.append(row)}
 const follow=$('followups');follow.replaceChildren();const upcoming=clients.filter(c=>c.next&&c.status!=='Venda realizada'&&c.status!=='Sem interesse').sort((a,b)=>a.next.localeCompare(b.next)).slice(0,7);
 if(!upcoming.length){const empty=document.createElement('p');empty.className='muted';empty.textContent='Nenhum contato agendado.';follow.append(empty)}
 for(const c of upcoming){const row=document.createElement('div');row.className='followup';const label=document.createElement('div');const name=document.createElement('strong');name.textContent=c.name;const when=document.createElement('small');when.textContent=' · '+c.next+(c.next<today?' · Atrasado':c.next===today?' · Hoje':'');label.append(name,when);
 const btn=document.createElement('button');btn.className='btn';btn.textContent='Abrir';btn.onclick=()=>edit(c.id);row.append(label,btn);follow.append(row)}
}

$('search').oninput=render;$('reload').onclick=load;
function edit(id){editing=id||null;const c=clients.find(x=>x.id===id)||{};const f=$('form');for(const k of ['name','city','phone','status','amount','next','url','notes'])f.elements[k].value=c[k]??(k==='status'?'Prospecto':'');$('editTitle').textContent=id?'Editar empresa':'Nova empresa';show('editpanel')}
$('new').onclick=()=>edit(null);$('cancel').onclick=()=>show('app');
$('form').onsubmit=async e=>{e.preventDefault();const f=e.currentTarget,raw=Object.fromEntries(new FormData(f).entries());const c={...raw,id:editing||crypto.randomUUID(),name:raw.name.trim(),amount:raw.amount===''?null:Number(raw.amount)};if(!c.name||c.amount!==null&&(!Number.isFinite(c.amount)||c.amount<0))return msg('Confira os campos.',true);const {error}=await db.from('clientes').upsert(toDb(c),{onConflict:'id'});if(error)return msg('Não foi possível salvar: '+error.message,true);show('app');await load()};
$('export').onclick=()=>{const blob=new Blob([JSON.stringify({version:1,exportedAt:new Date().toISOString(),clients},null,2)],{type:'application/json'});const u=URL.createObjectURL(blob),a=document.createElement('a');a.href=u;a.download='black-crm-online-backup.json';a.click();setTimeout(()=>URL.revokeObjectURL(u),1000)};
$('import').onclick=()=>$('backup').click();
$('backup').onchange=async e=>{const file=e.target.files[0];e.target.value='';if(!file)return;if(file.size>5e6)return msg('Backup muito grande.',true);try{const obj=JSON.parse(await file.text());const statuses=['Prospecto','Contatado','Demonstração','Negociação','Venda realizada','Sem interesse'];if(obj.version!==1||!Array.isArray(obj.clients)||obj.clients.length>1000||!obj.clients.every(c=>c&&typeof c.name==='string'&&statuses.includes(c.status)))throw Error('Backup inválido');if(!confirm(`Importar ${obj.clients.length} empresas para sua conta online? Faça isso apenas uma vez para evitar duplicatas.`))return;const rows=obj.clients.map(c=>toDb({id:crypto.randomUUID(),name:String(c.name).slice(0,120),city:String(c.city||'').slice(0,100),phone:String(c.phone||'').slice(0,25),status:c.status,amount:c.amount==null||c.amount===''?null:Number(c.amount),next:c.next||'',notes:String(c.notes||'').slice(0,2000),url:String(c.url||'').slice(0,1000)}));for(let i=0;i<rows.length;i+=100){const {error}=await db.from('clientes').insert(rows.slice(i,i+100));if(error)throw Error(error.message)}await load();msg('Backup importado.')}catch(err){msg('Falha na importação: '+err.message,true)}};
$('proposal').onclick=()=>{const select=$('propClient');select.replaceChildren();for(const c of clients){const o=document.createElement('option');o.value=c.id;o.textContent=c.name;select.append(o)}show('propanel')};$('closeProp').onclick=()=>show('app');
$('print').onclick=()=>{const c=clients.find(x=>x.id===$('propClient').value);if(!c)return msg('Selecione uma empresa.',true);const price=Number($('price').value);if($('price').value===''||!Number.isFinite(price)||price<0)return msg('Informe o valor.',true);const service=$('service').value.trim(),details=$('details').value.trim();if(!service||!details)return msg('Preencha o serviço e a descrição.',true);const w=window.open('','_blank');if(!w)return msg('Permita pop-ups para gerar a proposta.',true);w.document.write(`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Proposta - ${esc(c.name)}</title><style>body{font:16px Arial,sans-serif;margin:50px;color:#13223a;line-height:1.6}header{background:#08152b;color:#fff;padding:24px;border-radius:12px}h2{color:#176ce0}.price{font-size:27px;background:#eaf3ff;padding:20px}p{white-space:pre-wrap}@media print{button{display:none}}</style></head><body><button onclick="print()">Salvar como PDF / Imprimir</button><header><h1>BLACK TECH</h1>Proposta comercial</header><h2>Cliente: ${esc(c.name)}</h2><p>Data: ${new Date().toLocaleDateString('pt-BR')}</p><h2>${esc(service)}</h2><p>${esc(details)}</p><p class="price">Investimento: ${fmt.format(price)}</p><p>Prazo: ${esc($('deadline').value||'A combinar')}</p><p>Proposta sujeita a confirmação de escopo e aceite.</p></body></html>`);w.document.close();w.focus()};
})();