/* BODEN + PERSONEL MESAİ — merkezi ortak veri v3
   Merkezi veri kaynak: Supabase.
   Amaç: telefon, bilgisayar ve diğer cihazların aynı kayıtları görmesi.
*/
window.BODEN_API_BASE='https://tddhbkafzkplnhfirmwa.supabase.co/functions/v1/boden-api';
window.BODEN_DATA_MODE='central';
window.BODEN_CENTRAL=true;
(function(){
  const API=window.BODEN_API_BASE.replace(/\/$/,'');
  const origSet=Storage.prototype.setItem;
  const origRemove=Storage.prototype.removeItem;
  let applying=false;
  let booted=false;
  let syncing=false;

  const ignored=(k)=>{
    k=String(k||'');
    return !k || k.startsWith('supabase.') || k.startsWith('sb-') || k==='BODEN_CENTRAL_READY';
  };

  const get=()=>fetch(API,{cache:'no-store'}).then(r=>{
    if(!r.ok) throw Error('HTTP '+r.status);
    return r.json();
  });

  const put=(k,v)=>fetch(API+'/state/'+encodeURIComponent(k),{
    method:'PUT',headers:{'Content-Type':'application/json'},
    body:JSON.stringify({value:String(v)})
  });

  const del=(k)=>fetch(API+'/state/'+encodeURIComponent(k),{method:'DELETE'});

  function refreshApp(){
    try{ if(typeof window.render==='function') window.render(); }catch(e){}
    try{ if(typeof window.renderFinal==='function') window.renderFinal(); }catch(e){}
    try{ if(typeof window.renderV6==='function') window.renderV6(); }catch(e){}
    try{ if(typeof window.renderHistory==='function') window.renderHistory(); }catch(e){}
    try{ window.dispatchEvent(new Event('boden-data-refreshed')); }catch(e){}
  }

  async function sync(){
    if(syncing) return;
    syncing=true;
    try{
      const first=await get();
      const state=first.state||{};

      /* Merkezi kaydı bulunan anahtarlar MERKEZİ KAYNAKTIR.
         Sadece merkezde olmayan anahtarlar cihazdan merkeze aktarılır. */
      const localKeys=[];
      for(let i=0;i<localStorage.length;i++){
        const k=localStorage.key(i);
        if(!ignored(k)) localKeys.push(k);
      }
      for(const k of localKeys){
        if(state[k]===undefined){
          const v=localStorage.getItem(k);
          if(v!==null) await put(k,v);
        }
      }

      /* Güncel merkezi kayıtları bu cihazın localStorage alanına uygula. */
      const fresh=(await get()).state||{};
      applying=true;
      for(const k of Object.keys(fresh)){
        if(!ignored(k)) origSet.call(localStorage,k,String(fresh[k]));
      }
      applying=false;
      booted=true;
      window.BODEN_CENTRAL_READY=true;
      window.BODEN_CLOUD_ONLINE=true;
      document.documentElement.setAttribute('data-boden-data-mode','central');
      window.dispatchEvent(new Event('central-personel-ready'));
      window.dispatchEvent(new Event('boden-central-ready'));

      /* Sayfa merkezi veri gelmeden çizilmişse yeniden çiz. */
      refreshApp();
      setTimeout(refreshApp,100);
      setTimeout(refreshApp,500);
      setTimeout(refreshApp,1500);
    }catch(e){
      applying=false;
      window.BODEN_CENTRAL_READY=false;
      window.BODEN_CENTRAL_ERROR=String(e);
      console.error('BODEN merkezi veri bağlantısı:',e);
    }finally{
      syncing=false;
    }
  }

  /* Uygulama veri kaydettiği anda aynı kayıt merkeze de yazılır. */
  Storage.prototype.setItem=function(k,v){
    origSet.call(this,k,v);
    if(this===localStorage && !applying && booted && !ignored(k)) put(k,v).catch(()=>{});
  };

  Storage.prototype.removeItem=function(k){
    origRemove.call(this,k);
    if(this===localStorage && !applying && booted && !ignored(k)) del(k).catch(()=>{});
  };

  window.BODEN_REFRESH_CENTRAL=sync;

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',sync,{once:true});
  else sync();

  /* Başka telefon/bilgisayardan yapılan değişiklikleri otomatik getir. */
  setInterval(sync,5000);
})();
