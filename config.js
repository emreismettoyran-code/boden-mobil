/* BODEN MOBİL — ortak merkezi veri sistemi (v3) */
window.BODEN_API_BASE='https://tddhbkafzkplnhfirmwa.supabase.co/functions/v1/boden-api';
window.BODEN_DATA_MODE='central';
window.BODEN_SHARED_STORE_KEY='boden-shared-state';
window.BODEN_CENTRAL=true;

(function(){
  const API=window.BODEN_API_BASE.replace(/\/$/,'');
  const nativeSet=Storage.prototype.setItem;
  const nativeRemove=Storage.prototype.removeItem;
  let ready=false;
  let centralHasData=false;
  let applying=false;
  const shouldSync=k=>k && !String(k).startsWith('boden_bridge_');

  const put=(k,v)=>fetch(API+'/state/'+encodeURIComponent(k),{
    method:'PUT',
    headers:{'Content-Type':'application/json'},
    body:JSON.stringify({value:String(v)})
  }).then(r=>{ if(!r.ok) throw new Error('PUT '+r.status); return r; });

  const del=(k)=>fetch(API+'/state/'+encodeURIComponent(k),{
    method:'DELETE'
  }).then(r=>{ if(!r.ok) throw new Error('DELETE '+r.status); return r; });

  /*
   * ÖNEMLİ: Uygulama localStorage kullanıyor. Bu nedenle merkezi kayıtları
   * uygulama kodu çalışmadan ÖNCE localStorage'a aynen indiriyoruz.
   * Böylece telefon, bilgisayar ve diğer cihazlar aynı veriyi açar.
   */
  function loadCentralBeforeApp(){
    try{
      const xhr=new XMLHttpRequest();
      xhr.open('GET',API,false);
      xhr.timeout=8000;
      xhr.setRequestHeader('Accept','application/json');
      xhr.send(null);
      if(xhr.status>=200 && xhr.status<300){
        const data=JSON.parse(xhr.responseText||'{}');
        const state=data && data.state && typeof data.state==='object' ? data.state : {};
        const keys=Object.keys(state).filter(shouldSync);
        if(keys.length){
          applying=true;
          for(const k of keys){
            const v=state[k];
            if(typeof v==='string') nativeSet.call(localStorage,k,v);
            else nativeSet.call(localStorage,k,JSON.stringify(v));
          }
          applying=false;
          centralHasData=true;
        }
        window.BODEN_CENTRAL_READY=true;
        window.BODEN_CENTRAL_ERROR='';
        document.documentElement.setAttribute('data-boden-data-mode','central');
        return true;
      }
      throw new Error('HTTP '+xhr.status);
    }catch(e){
      applying=false;
      window.BODEN_CENTRAL_READY=false;
      window.BODEN_CENTRAL_ERROR=String(e&&e.message||e);
      document.documentElement.setAttribute('data-boden-data-mode','local');
      return false;
    }
  }

  /* Önce merkezi veriyi yükle; sonra uygulama scriptleri çalışsın. */
  const loaded=loadCentralBeforeApp();
  ready=true;

  Storage.prototype.setItem=function(k,v){
    nativeSet.call(this,k,v);
    if(this===localStorage && ready && !applying && shouldSync(k)){
      put(String(k),String(v)).catch(()=>{});
    }
  };

  Storage.prototype.removeItem=function(k){
    nativeRemove.call(this,k);
    if(this===localStorage && ready && !applying && shouldSync(k)){
      del(String(k)).catch(()=>{});
    }
  };

  /* Eğer merkezi tablo gerçekten boşsa, bu cihazdaki ilk verileri merkeze çıkar. */
  if(!loaded){
    setTimeout(()=>{
      try{
        fetch(API,{cache:'no-store'}).then(r=>r.json()).then(data=>{
          const state=data&&data.state&&typeof data.state==='object'?data.state:{};
          if(Object.keys(state).length) return;
          const local={};
          for(let i=0;i<localStorage.length;i++){
            const k=localStorage.key(i);
            if(shouldSync(k)) local[k]=localStorage.getItem(k);
          }
          return Promise.all(Object.keys(local).map(k=>put(k,local[k])));
        }).catch(()=>{});
      }catch(e){}
    },1000);
  }

  window.addEventListener('load',()=>{
    window.BODEN_CENTRAL_READY=!!loaded;
    window.dispatchEvent(new Event('boden-central-ready'));
  },{once:true});
})();
