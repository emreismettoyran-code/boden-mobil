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
  /* Ana uygulama açıldıktan sonra mutlaka bir kez merkezi kaynağı yeniden eşitle. */
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
