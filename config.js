/* BODEN + PERSONEL MESAİ — merkezi veri */
window.BODEN_API_BASE='https://tddhbkafzkplnhfirmwa.supabase.co/functions/v1/boden-api';
window.BODEN_DATA_MODE='central'; window.BODEN_CENTRAL=true;
(function(){
 const API=window.BODEN_API_BASE.replace(/\/$/,'');
 const PKEY='personel-mesai-v2-people', RKEY='personel-mesai-v2-records';
 const origSet=Storage.prototype.setItem, origRemove=Storage.prototype.removeItem; let applying=false;
 const get=()=>fetch(API,{cache:'no-store'}).then(r=>{if(!r.ok)throw Error('HTTP '+r.status);return r.json()});
 const put=(k,v)=>fetch(API+'/state/'+encodeURIComponent(k),{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({value:String(v)})});
 async function sync(){
  try{
   const d=await get(), state=d.state||{};
   /* Personel verisi daha önce yalnızca bilgisayarda kalmışsa merkezi kayda ilk kez aktar. */
   for(const k of [PKEY,RKEY]){
    const local=localStorage.getItem(k);
    if(state[k]===undefined && local!==null) await put(k,local);
   }
   const fresh=(await get()).state||{};
   applying=true;
   for(const k of Object.keys(fresh)){
    if(k===PKEY||k===RKEY||String(k).startsWith('personel-mesai-')) origSet.call(localStorage,k,String(fresh[k]));
   }
   applying=false;
   window.BODEN_CENTRAL_READY=true; window.BODEN_CLOUD_ONLINE=true;
   document.documentElement.setAttribute('data-boden-data-mode','central');
   window.dispatchEvent(new Event('central-personel-ready'));
  }catch(e){applying=false;window.BODEN_CENTRAL_READY=false;window.BODEN_CENTRAL_ERROR=String(e);}
 }
 Storage.prototype.setItem=function(k,v){origSet.call(this,k,v);if(this===localStorage&&!applying&&(k===PKEY||k===RKEY))put(k,v).catch(()=>{});};
 Storage.prototype.removeItem=function(k){origRemove.call(this,k);if(this===localStorage&&!applying&&(k===PKEY||k===RKEY))fetch(API+'/state/'+encodeURIComponent(k),{method:'DELETE'}).catch(()=>{});};
 window.BODEN_REFRESH_CENTRAL=sync; if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',sync,{once:true});else sync();
})();
