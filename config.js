/* BODEN MOBİL — ortak merkezi veri sistemi (v4) */
window.BODEN_API_BASE='https://tddhbkafzkplnhfirmwa.supabase.co/functions/v1/boden-api';
window.BODEN_DATA_MODE='central';
window.BODEN_SHARED_STORE_KEY='boden-shared-state';
window.BODEN_CENTRAL=true;
(function(){
  const API=window.BODEN_API_BASE.replace(/\/$/,'');
  const nativeSet=Storage.prototype.setItem;
  const nativeRemove=Storage.prototype.removeItem;
  let ready=false;
  let applying=false;
  const shouldSync=k=>k && !String(k).startsWith('boden_bridge_');
  const put=(k,v)=>fetch(API+'/state/'+encodeURIComponent(k),{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({value:String(v)})}).then(r=>{if(!r.ok)throw new Error('PUT '+r.status);return r;});
  const del=(k)=>fetch(API+'/state/'+encodeURIComponent(k),{method:'DELETE'}).then(r=>{if(!r.ok)throw new Error('DELETE '+r.status);return r;});
  function applyState(state){
    applying=true;
    try{Object.keys(state||{}).filter(shouldSync).forEach(k=>{const v=state[k];nativeSet.call(localStorage,k,typeof v==='string'?v:JSON.stringify(v));});}
    finally{applying=false;}
  }
  function fetchCentral(){
    return fetch(API,{cache:'no-store',headers:{Accept:'application/json'}}).then(r=>{if(!r.ok)throw new Error('HTTP '+r.status);return r.json();}).then(data=>{
      const state=data&&data.state&&typeof data.state==='object'?data.state:{};
      applyState(state);
      window.BODEN_CENTRAL_READY=true;
      window.BODEN_CENTRAL_ERROR='';
      window.BODEN_CLOUD_ONLINE=true;
      document.documentElement.setAttribute('data-boden-data-mode','central');
      return state;
    });
  }
  function uploadLocalIfCentralEmpty(state){
    if(Object.keys(state||{}).length)return Promise.resolve();
    const local={};
    for(let i=0;i<localStorage.length;i++){const k=localStorage.key(i);if(shouldSync(k))local[k]=localStorage.getItem(k);}
    return Promise.all(Object.keys(local).map(k=>put(k,local[k])));
  }
  window.BODEN_REFRESH_CENTRAL=function(){return fetchCentral();};
  try{
    const xhr=new XMLHttpRequest();
    xhr.open('GET',API,false); xhr.timeout=8000; xhr.setRequestHeader('Accept','application/json'); xhr.send(null);
    if(xhr.status>=200&&xhr.status<300){const data=JSON.parse(xhr.responseText||'{}');applyState(data&&data.state||{});window.BODEN_CENTRAL_READY=true;window.BODEN_CLOUD_ONLINE=true;}
    else throw new Error('HTTP '+xhr.status);
  }catch(e){window.BODEN_CENTRAL_READY=false;window.BODEN_CENTRAL_ERROR=String(e&&e.message||e);document.documentElement.setAttribute('data-boden-data-mode','local');}
  ready=true;
  Storage.prototype.setItem=function(k,v){nativeSet.call(this,k,v);if(this===localStorage&&ready&&!applying&&shouldSync(k))put(String(k),String(v)).catch(()=>{});};
  Storage.prototype.removeItem=function(k){nativeRemove.call(this,k);if(this===localStorage&&ready&&!applying&&shouldSync(k))del(String(k)).catch(()=>{});};
  window.addEventListener('load',function(){
    fetch(API,{cache:'no-store',headers:{Accept:'application/json'}}).then(r=>{if(!r.ok)throw new Error('HTTP '+r.status);return r.json();}).then(data=>{
      const state=data&&data.state&&typeof data.state==='object'?data.state:{};
      if(Object.keys(state).length){
        applyState(state);
        window.BODEN_CENTRAL_READY=true;window.BODEN_CLOUD_ONLINE=true;
        document.documentElement.setAttribute('data-boden-data-mode','central');
        if(typeof window.renderHistory==='function')try{window.renderHistory();}catch(e){}
        if(typeof window.renderBook==='function')try{window.renderBook();}catch(e){}
      }else return uploadLocalIfCentralEmpty(state);
    }).catch(e=>{window.BODEN_CENTRAL_READY=false;window.BODEN_CENTRAL_ERROR=String(e&&e.message||e);});
    window.dispatchEvent(new Event('boden-central-ready'));
  },{once:true});
})();

/* PERSONEL MESAİ — Mesai Nedeni / Yapılan İş sütunu */
(function(){
  function safeParse(v){try{return JSON.parse(v)}catch(e){return null}}
  function collectRecords(){
    const out=[];
    for(let i=0;i<localStorage.length;i++){
      const k=localStorage.key(i), v=localStorage.getItem(k), x=safeParse(v);
      if(!x)continue;
      const walk=(node)=>{
        if(Array.isArray(node)){
          if(node.some(r=>r&&typeof r==='object'&&('reason' in r || 'mesaiNedeni' in r || 'yapilanIs' in r))){
            node.forEach(r=>{if(r&&typeof r==='object'&&('reason' in r || 'mesaiNedeni' in r || 'yapilanIs' in r))out.push(r)})
          }else node.forEach(walk);
        }else if(node&&typeof node==='object')Object.values(node).forEach(walk);
      };
      walk(x);
    }
    const seen=new Set();
    return out.filter(r=>{const id=JSON.stringify(r);if(seen.has(id))return false;seen.add(id);return true});
  }
  function reasonOf(r){return String(r.reason??r.mesaiNedeni??r.yapilanIs??r.work??r.description??'').trim()}
  function normalize(s){return String(s??'').toLocaleLowerCase('tr-TR').replace(/\s+/g,' ').trim()}
  function decorateHistory(){
    const tables=[...document.querySelectorAll('.history-table')];
    if(!tables.length)return;
    const records=collectRecords();
    tables.forEach(table=>{
      const head=table.tHead?.rows?.[0];
      const body=table.tBodies?.[0];
      if(!head||!body)return;
      if(![...head.cells].some(c=>normalize(c.textContent).includes('mesai nedeni'))){
        const th=document.createElement('th');th.textContent='Mesai Nedeni / Yapılan İş';head.appendChild(th);
      }
      const rows=[...body.rows].filter(r=>!r.classList.contains('empty'));
      rows.forEach((row,idx)=>{
        if(row.cells[row.cells.length-1]?.dataset?.reasonColumn==='1')return;
        let reason='';
        const rowText=normalize(row.textContent);
        let best=null,bestScore=0;
        records.forEach(r=>{
          const values=[r.date,r.mDate,r.personName,r.person,r.name,r.firstName,r.lastName,r.type,r.mType,r.status,r.mStatus].filter(Boolean).map(normalize);
          let score=0;values.forEach(v=>{if(v&&rowText.includes(v))score+=v.length>5?2:1});
          if(score>bestScore){bestScore=score;best=r}
        });
        if(best)reason=reasonOf(best);
        if(!reason&&records[idx])reason=reasonOf(records[idx]);
        const td=document.createElement('td');td.dataset.reasonColumn='1';td.className='left';td.textContent=reason||'—';row.appendChild(td);
      });
    });
  }
  function hook(){
    decorateHistory();
    if(typeof window.renderHistory==='function'&&!window.renderHistory.__reasonWrapped){
      const original=window.renderHistory;
      const wrapped=function(){const result=original.apply(this,arguments);setTimeout(decorateHistory,0);setTimeout(decorateHistory,100);return result};
      wrapped.__reasonWrapped=true;window.renderHistory=wrapped;
    }
    const obs=new MutationObserver(()=>decorateHistory());
    obs.observe(document.body,{childList:true,subtree:true});
    window.addEventListener('boden-central-ready',()=>setTimeout(decorateHistory,100));
    window.addEventListener('load',()=>setTimeout(decorateHistory,300),{once:true});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',hook,{once:true});else hook();
})();
