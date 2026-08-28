/* BODEN MOBİL — MERKEZİ VERİ SİSTEMİ */
window.BODEN_API_BASE='https://tddhbkafzkplnhfirmwa.supabase.co/functions/v1/boden-api';
window.BODEN_DATA_MODE='central';
window.BODEN_CENTRAL=true;
(function(){
 const API=window.BODEN_API_BASE.replace(/\/$/,''), nativeSet=Storage.prototype.setItem, nativeRemove=Storage.prototype.removeItem;
 let ready=false, applying=false;
 const syncKey=k=>k && !String(k).startsWith('boden_bridge_');
 const put=(k,v)=>fetch(API+'/state/'+encodeURIComponent(k),{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({value:String(v)})}).catch(()=>{});
 const del=k=>fetch(API+'/state/'+encodeURIComponent(k),{method:'DELETE'}).catch(()=>{});
 const parse=v=>{try{return JSON.parse(v)}catch{return null}};
 function mergeArray(a,b){
   if(!Array.isArray(a)||!Array.isArray(b))return null;
   const map=new Map();
   [...a,...b].forEach(x=>{if(!x||typeof x!=='object')return;const id=String(x.id||x._id||JSON.stringify(x));map.set(id,x)});
   return [...map.values()];
 }
 function applyState(state){
   applying=true;
   try{Object.keys(state||{}).filter(syncKey).forEach(k=>{
     const remote=state[k], local=localStorage.getItem(k);
     const ra=parse(remote),la=parse(local), merged=mergeArray(la,ra);
     if(merged) nativeSet.call(localStorage,k,JSON.stringify(merged));
     else nativeSet.call(localStorage,k,typeof remote==='string'?remote:JSON.stringify(remote));
   })}finally{applying=false}
 }
 function getCentral(){return fetch(API,{cache:'no-store',headers:{Accept:'application/json'}}).then(r=>{if(!r.ok)throw Error('HTTP '+r.status);return r.json()})}
 window.BODEN_REFRESH_CENTRAL=function(){return getCentral().then(d=>{applyState(d.state||{});return d.state||{}})};
 try{
   const x=new XMLHttpRequest();x.open('GET',API,false);x.timeout=8000;x.setRequestHeader('Accept','application/json');x.send(null);
   if(x.status>=200&&x.status<300){const d=JSON.parse(x.responseText||'{}');applyState(d.state||{});window.BODEN_CENTRAL_READY=true;window.BODEN_CLOUD_ONLINE=true;}
   else throw Error('HTTP '+x.status);
 }catch(e){window.BODEN_CENTRAL_READY=false;window.BODEN_CLOUD_ONLINE=false;window.BODEN_CENTRAL_ERROR=String(e);}
 ready=true;
 Storage.prototype.setItem=function(k,v){nativeSet.call(this,k,v);if(this===localStorage&&ready&&!applying&&syncKey(k))put(k,v)};
 Storage.prototype.removeItem=function(k){nativeRemove.call(this,k);if(this===localStorage&&ready&&!applying&&syncKey(k))del(k)};
 window.addEventListener('load',async()=>{
   try{
     const d=await getCentral(),state=d.state||{};
     const important=['personel-mesai-v2-people','personel-mesai-v2-records'];
     for(const k of important){
       const local=localStorage.getItem(k), remote=state[k], la=parse(local), ra=parse(remote), merged=mergeArray(la,ra);
       if(merged){nativeSet.call(localStorage,k,JSON.stringify(merged));await put(k,JSON.stringify(merged));}
       else if(local!==null&&!remote){await put(k,local);}
     }
     window.BODEN_CENTRAL_READY=true;window.BODEN_CLOUD_ONLINE=true;
     document.documentElement.setAttribute('data-boden-data-mode','central');
     window.dispatchEvent(new Event('boden-central-ready'));
     setTimeout(()=>{if(typeof window.renderHistory==='function')try{window.renderHistory()}catch(e){}},150);
   }catch(e){window.BODEN_CENTRAL_READY=false;window.BODEN_CLOUD_ONLINE=false;}
 },{once:true});
})();
