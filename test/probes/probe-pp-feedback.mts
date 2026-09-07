// pp 双通道反馈回路探针（吸附世界=中间态−壳−新生帽平面；遮挡=中间态；高度通道停靠）
// created by Claude Fable 5, 2026-09-03；用法：node --experimental-strip-types test/probes/probe-pp-feedback.mts（非 npm test 的一部分，手动跑）
const ROOT = new URL("../..", import.meta.url).pathname.replace(/\/$/, "");   // 仓根（2026-09-06 进仓，由 tools/ gitignored 区搬来）
const { Kernel } = await import(ROOT+"/src/kernel/kernel.ts");
const { OrbitCamera, closestOnAxis } = await import(ROOT+"/src/editor/camera.ts");
const { GROUND, snapPoint } = await import(ROOT+"/src/editor/pick.ts");
const { ringVidsTolerant } = await import(ROOT+"/src/kernel/face-lifecycle.ts");
const { dot3, sub3, add3, scale3 } = await import(ROOT+"/src/kernel/geom.ts");
const VP={w:800,h:600};
const box=(k,x0,y0,w,d,h)=>{ const pts=[{x:x0,y:y0,z:0},{x:x0+w,y:y0,z:0},{x:x0+w,y:y0+d,z:0},{x:x0,y:y0+d,z:0}];
  const before=new Set(k.faces().map(f=>f.id));
  k.addEdges([0,1,2,3].map(i=>[pts[i],pts[(i+1)%4]]));
  const fid=k.faces().find(f=>!before.has(f.id)).id;
  k.pushPull(fid,h); };

function run(label, mkScene, anchor, path, tremor){
  const k=new Kernel(); mkScene(k);
  const top=k.faces().find(f=>{const r=k.faceRings3(f.id);return r&&r.outer.every(p=>Math.abs(p.z-30)<1e-6)&&r.outer.every(p=>p.x<=41);}).id;
  const cam=new OrbitCamera(); cam.target={x:30,y:20,z:15}; cam.halfH=70;
  const n={x:0,y:0,z:1};
  const fRec=k.face(top);
  const rim=new Set(ringVidsTolerant(k.graph,fRec.outer));
  const shell=new Set(rim);   // v0.2.24 壳集=帽环本身（底四边可吸；穿体由 opaque 遮挡接管）
  const known=new Set(k.vertices().map(v=>v.id));
  const stops=new Set([0]); for(const v of k.vertices()) stops.add(Math.round(dot3(sub3(v,anchor),n)*1e6)/1e6);
  const stopsArr=[...stops].sort((a,b)=>a-b);
  let h=0, pv=null, prev="", seq=[], frame=0;
  for(const wpt of path){
    const s0=cam.worldToScreen(wpt,VP);
    const s={x:s0.x+(tremor?(frame%2?0.6:-0.6):0), y:s0.y+(tremor?(frame%3?0.4:-0.5):0)};
    const wk=pv??k; const hNow=h;
    const excl=(vid)=> shell.has(vid) || (!known.has(vid) && Math.abs(dot3(sub3(wk.graph.pt(vid),anchor),n)-hNow)<0.01);
    const sn=snapPoint(wk,cam,VP,s.x,s.y,8,{plane:GROUND,anchor,lines:false,hand:{has:excl,opaque:true}});
    let kind, refh;
    if(sn.kind!==null){ h=dot3(sub3(sn.p,anchor),n); kind=sn.kind; }
    else{
      const ray=cam.screenRay(s.x,s.y,VP); const q=closestOnAxis(anchor,n,ray.origin,ray.dir);
      if(q) h=dot3(sub3(q,anchor),n);
      const sc0=cam.worldToScreen(anchor,VP), sc1=cam.worldToScreen(add3(anchor,n),VP);
      const ppu=Math.max(Math.hypot(sc1.x-sc0.x,sc1.y-sc0.y),0.5), epsH=7/ppu;
      let best=null; for(const st of stopsArr) if(Math.abs(st-h)<=epsH&&(best===null||Math.abs(st-h)<Math.abs(best-h))) best=st;
      if(best!==null){ h=best; kind="h-stop"; } else kind="(slide)";
    }
    pv=Math.abs(h)>=0.3?(()=>{const c=k.clone();c.pushPull(top,h-Math.sign(h)*2e-6,{settleLanding:false});return c;})():null;
    const key=kind+"|"+h.toFixed(1);
    if(key!==prev){ seq.push(`f${frame}:${kind} h=${h.toFixed(1)}`); prev=key; }
    frame++;
  }
  // 真抖 = 相邻换挡间隔 ≤2 帧连续 ≥3 次
  let flaps=0; const fs=seq.map(x=>+x.match(/^f(\d+)/)[1]);
  for(let i=2;i<fs.length;i++) if(fs[i]-fs[i-1]<=2&&fs[i-1]-fs[i-2]<=2) flaps++;
  console.log(`\n== ${label} == 换挡${seq.length} 密集翻转${flaps}`);
  console.log(seq.join(" "));
}
const descend=(x,y,z0,z1,n)=>Array.from({length:n+1},(_,i)=>({x,y,z:z0+(z1-z0)*i/n}));
const hover=(x,y,zc,amp,n)=>Array.from({length:n+1},(_,i)=>({x,y,z:zc+amp*Math.sin(i*0.7)}));
const solo=(k)=>box(k,0,0,40,40,30);
const withTall=(k)=>{ box(k,0,0,40,40,30); box(k,42,0,30,40,50); };   // 旁边高箱（不共墙，近邻）
run("P1 下推 anchor中央 无抖", solo, {x:20,y:20,z:30}, descend(20,20,30,0.5,120), false);
run("P2 下推 anchor前棱 手抖", solo, {x:17,y:0,z:30}, descend(17,0,30,0.5,120), true);
run("P3 贴底悬停 手抖", solo, {x:17,y:0,z:30}, hover(17,0,1.2,1.5,80), true);
run("P4 上拉 手抖", solo, {x:17,y:0,z:30}, descend(17,0,30,45,120), true);
run("P5 上拉过邻箱顶高（h-stop=20 咬合）", withTall, {x:20,y:20,z:30}, descend(20,20,30,55,140), true);
run("P6 下推穿透底面（h 越过 -30 继续）", solo, {x:20,y:20,z:30}, descend(20,20,30,-12,140), true);
