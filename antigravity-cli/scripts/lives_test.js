const { chromium } = require('playwright');
(async()=>{
 const b=await chromium.launch(); 
 for (const r of process.argv.slice(2)){
 const p=await b.newPage();
 await p.goto('file://'+process.cwd()+'/three/'+r+'/index.html');
 await p.waitForTimeout(500);
 const seq=[]; let corner=0;
 for(let i=0;i<50;i++){
   const l=await p.evaluate(()=>{const e=document.getElementById('lives');return e?e.textContent.trim():null});
   if(seq[seq.length-1]!==l){ seq.push(l); console.log(i,l);}
   if(i%10==0){ // launch from center, then move paddle to alternating corner
     await p.mouse.move(400,500); await p.keyboard.press('Space');
     const a=await p.$('#action'); if(a && await a.isVisible()) await a.click().catch(()=>{});
     await p.waitForTimeout(50);
     corner=1-corner; await p.mouse.move(corner?5:1000,500);
   }
   await p.waitForTimeout(250);
 }
 console.log(r, JSON.stringify(seq));
 await p.close();}
 await b.close();
})();
