const { chromium } = require('playwright');
(async()=>{
 const b=await chromium.launch(); const p=await b.newPage();
 p.on('pageerror',e=>console.log('ERR',e.message));
 console.log('goto'); await p.goto('file://'+process.cwd()+'/three/codex_game_r2/index.html',{waitUntil:'domcontentloaded',timeout:10000}).catch(e=>console.log('goto fail',e.message));
 console.log('loaded');
 const seq=[]; let corner=0;
 for(let i=0;i<110;i++){
   const l=await Promise.race([p.evaluate(()=>document.getElementById('lives').textContent.trim()), new Promise(r=>setTimeout(()=>r('HANG'),3000))]);
   if(seq[seq.length-1]!==l){seq.push(l);console.log(i,l);}
   if(l==='HANG') break;
   if(i%10==0){ await p.mouse.move(400,500); await p.keyboard.press('Space');
     const a=await p.$('#action'); if(a && await a.isVisible()) await a.click({timeout:1000}).catch(()=>{});
     corner=1-corner; await p.mouse.move(corner?5:1000,500);}
   await p.waitForTimeout(250);
 }
 process.exit(0);
})();
