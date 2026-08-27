/* BODEN MOBİL — ortak merkezi veri köprüsü */
window.BODEN_API_BASE='https://tddhbkafzkplnhfirmwa.supabase.co/functions/v1/boden-api';
window.BODEN_DATA_MODE='central';
window.BODEN_SHARED_STORE_KEY='boden-shared-state';
window.BODEN_CENTRAL=true;

(function(){
  const API=window.BODEN_API_BASE;
  const originalSet=Storage.prototype.setItem;
  const originalRemove=Storage.prototype.removeItem;
  let ready=false;
  let applying=false;
  const shouldSync=k=>k && !String(k).startsWith('boden_bridge_');
  const put=(k,v)=>fetch(API+'/state/'+encodeURIComponent(k),{
    method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({value:v})
  }).catch(()=>{});

  Storage.prototype.setItem=function(k,v){
    originalSet.call(this,k,v);
    if(this===localStorage && ready && !applying && shouldSync(k)) put(String(k),String(v));
  };
  Storage.prototype.removeItem=function(k){
    originalRemove.call(this,k);
    if(this===localStorage && ready && !applying && shouldSync(k))
      fetch(API+'/state/'+encodeURIComponent(k),{method:'DELETE'}).catch(()=>{});
  };

  async function centralSync(){
    try{
      const r=await fetch(API,{cache:'no-store'});
      if(!r.ok) throw new Error('central '+r.status);
      const data=await r.json();
      const state=data && data.state && typeof data.state==='object' ? data.state : {};
      const keys=Object.keys(state);
      applying=true;
      if(keys.length){
        for(const k of keys){
          const val=state[k];
          if(localStorage.getItem(k)===null && typeof val==='string') originalSet.call(localStorage,k,val);
        }
      }else{
        const local={};
        for(let i=0;i<localStorage.length;i++){
          const k=localStorage.key(i);
          if(shouldSync(k)) local[k]=localStorage.getItem(k);
        }
        for(const k of Object.keys(local)) await put(k,local[k]);
      }
      applying=false;
      ready=true;
      window.BODEN_CENTRAL_READY=true;
      document.documentElement.setAttribute('data-boden-data-mode','central');
      window.dispatchEvent(new Event('boden-central-ready'));
    }catch(e){
      applying=false;
      ready=true;
      window.BODEN_CENTRAL_READY=false;
      document.documentElement.setAttribute('data-boden-data-mode','local');
    }
  }
  window.addEventListener('load',centralSync,{once:true});
})();
