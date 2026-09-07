var Mp=Object.defineProperty;var Sp=(i,e,t)=>e in i?Mp(i,e,{enumerable:!0,configurable:!0,writable:!0,value:t}):i[e]=t;var U=(i,e,t)=>Sp(i,typeof e!="symbol"?e+"":e,t);var Hi="v0.4.1-2026-09-07";function ec(i,e){return Math.atan2(e.y-i.y,e.x-i.x)}function tc(i,e,t){return(e.x-i.x)*(t.y-i.y)-(e.y-i.y)*(t.x-i.x)}function gu(i){let e=0;for(let t=0;t<i.length;t++){let n=i[t],s=i[(t+1)%i.length];e+=n.x*s.y-s.x*n.y}return e/2}function dt(i,e){let t=!1;for(let n=0,s=e.length-1;n<e.length;s=n++){let r=e[n],o=e[s];r.y>i.y!=o.y>i.y&&i.x<(o.x-r.x)*(i.y-r.y)/(o.y-r.y)+r.x&&(t=!t)}return t}function Wi(i){return{x:Math.round(i.x/1e-6)*1e-6,y:Math.round(i.y/1e-6)*1e-6,z:Math.round(i.z/1e-6)*1e-6}}function Ct(i){return`${Math.round(i.x/1e-6)},${Math.round(i.y/1e-6)},${Math.round(i.z/1e-6)}`}function tn(i,e){return Math.abs(i.x-e.x)<=5e-7&&Math.abs(i.y-e.y)<=5e-7&&Math.abs(i.z-e.z)<=5e-7}function St(i,e){return Math.hypot(i.x-e.x,i.y-e.y,i.z-e.z)}var Pe=(i,e)=>({x:i.x-e.x,y:i.y-e.y,z:i.z-e.z}),Ne=(i,e)=>({x:i.x+e.x,y:i.y+e.y,z:i.z+e.z}),Fe=(i,e)=>({x:i.x*e,y:i.y*e,z:i.z*e}),te=(i,e)=>i.x*e.x+i.y*e.y+i.z*e.z,Rt=(i,e)=>({x:i.y*e.z-i.z*e.y,y:i.z*e.x-i.x*e.z,z:i.x*e.y-i.y*e.x}),Gi=i=>Math.hypot(i.x,i.y,i.z);function xn(i){let e=Gi(i);return e>0?Fe(i,1/e):i}function Zs(i,e){let t=xn(i),n=e;return(Math.abs(t.x)>1e-9?t.x:Math.abs(t.y)>1e-9?t.y:t.z)<0&&(t=Fe(t,-1),n=-n),{n:t,d:n}}function gi(i,e,t){let n=Rt(Pe(e,i),Pe(t,i)),s=Gi(n),r=Math.max(St(i,e),St(i,t));if(s<=5e-7*r||r<=5e-7)return null;let o=xn(n);return Zs(o,te(o,i))}function nn(i,e){return Math.abs(te(i,e.n)-e.d)}function fs(i){let e=i.n,t=Math.abs(e.x),n=Math.abs(e.y),s=Math.abs(e.z),r=t<=n&&t<=s?{x:1,y:0,z:0}:n<=s?{x:0,y:1,z:0}:{x:0,y:0,z:1},o=xn(Rt(e,r)),a=Rt(e,o);return{u:o,v:a}}function yn(i,e){return{x:te(i,e.u),y:te(i,e.v)}}function xu(i,e,t){return Ne(Ne(Fe(t.u,i.x),Fe(t.v,i.y)),Fe(e.n,e.d))}function lo(i,e,t){let n=St(e,t);if(n<=5e-7)return tn(i,e);if(Gi(Rt(Pe(i,e),Pe(t,e)))/n>5e-7)return!1;let r=te(Pe(i,e),Pe(t,e))/(n*n);return r>=-5e-7/n&&r<=1+5e-7/n}function yu(i,e,t){let n=Pe(t,e),s=te(n,n);if(s===0)return St(i,e);let r=te(Pe(i,e),n)/s;return r=Math.max(0,Math.min(1,r)),St(i,Ne(e,Fe(n,r)))}function co(i,e,t,n){let s=Pe(e,i),r=Pe(n,t),o=Gi(s),a=Gi(r);if(o<=5e-7||a<=5e-7)return[];let l=Rt(s,r),c=Gi(l);if(c/(o*a)<1e-12){if(Gi(Rt(Pe(t,i),s))/o>5e-7)return[];let f=T=>te(Pe(T,i),s)/(o*o),b=f(t),M=f(n);b>M&&([b,M]=[M,b]);let v=Math.max(0,b),A=Math.min(1,M);if(A<v-5e-7/o)return[];let w=T=>Wi(Ne(i,Fe(s,T))),E=w(v),x=w(A);return tn(E,x)?[E]:[E,x]}if(Math.abs(te(Pe(t,i),l))/c>5e-7)return[];let d=c*c,u=te(Rt(Pe(t,i),r),l)/d,m=te(Rt(Pe(t,i),s),l)/d,p=5e-7/o,y=5e-7/a;return u<-p||u>1+p||m<-y||m>1+y?[]:[Wi(Ne(i,Fe(s,u)))]}var ho=class i{constructor(){U(this,"vertsById",new Map);U(this,"edgesById",new Map);U(this,"vertByKey",new Map);U(this,"nextV",1);U(this,"nextE",1)}vertices(){return[...this.vertsById.values()]}edges(){return[...this.edgesById.values()]}vertexCount(){return this.vertsById.size}edgeCount(){return this.edgesById.size}vertex(e){let t=this.vertsById.get(e);if(!t)throw new Error(`vertex ${e} \u4E0D\u5B58\u5728`);return t}edge(e){let t=this.edgesById.get(e);if(!t)throw new Error(`edge ${e} \u4E0D\u5B58\u5728`);return t}hasEdge(e){return this.edgesById.has(e)}hasVertex(e){return this.vertsById.has(e)}pt(e){let t=this.vertex(e);return{x:t.x,y:t.y,z:t.z}}otherEnd(e,t){return e.a===t?e.b:e.a}vertexAt(e){return this.vertByKey.get(Ct(e))}ensureVertex(e){let t=Ct(e),n=this.vertByKey.get(t);if(n!==void 0)return n;let s=this.nextV++;return this.vertsById.set(s,{id:s,x:e.x,y:e.y,z:e.z,edges:new Set}),this.vertByKey.set(t,s),s}edgeBetween(e,t){let n=this.vertex(e).edges;for(let s of n){let r=this.edge(s);if(r.a===t||r.b===t)return s}}addEdge(e,t){if(e===t)throw new Error("\u62D2\u7EDD\u81EA\u73AF\u8FB9");if(this.edgeBetween(e,t)!==void 0)throw new Error(`\u8FB9 ${e}-${t} \u5DF2\u5B58\u5728\uFF08\u91CD\u5408\u5373\u540C\u4E00\uFF0C\u8C03\u7528\u65B9\u5E94\u62A5 retrace\uFF09`);let n=this.nextE++;return this.edgesById.set(n,{id:n,a:e,b:t,faceLinks:[]}),this.vertex(e).edges.add(n),this.vertex(t).edges.add(n),n}removeEdge(e){let t=this.edge(e);this.edgesById.delete(e);for(let n of[t.a,t.b]){let s=this.vertex(n);s.edges.delete(e),s.edges.size===0&&(this.vertsById.delete(n),this.vertByKey.delete(Ct({x:s.x,y:s.y,z:s.z})))}}splitEdge(e,t){let n=this.edge(e),s=[...n.faceLinks],r=n.a,o=n.b;this.removeEdgeKeepVerts(e);let a=this.ensureVertex(t),l=this.addEdge(r,a),c=this.addEdge(a,o);return this.edge(l).faceLinks=[...s],this.edge(c).faceLinks=[...s],{v:a,e1:l,e2:c}}relocateVertices(e){for(let{id:t}of e){let n=this.vertex(t);this.vertByKey.delete(Ct({x:n.x,y:n.y,z:n.z}))}for(let{id:t,to:n}of e){let s=this.vertex(t),r=Ct(n);if(this.vertByKey.has(r))throw new Error("relocateVertices \u7EC8\u6001 key \u78B0\u649E\u2014\u2014\u5408\u5E76\u8BE5\u5728\u8C03\u7528\u65B9\u5148\u505A");s.x=n.x,s.y=n.y,s.z=n.z,this.vertByKey.set(r,t)}}replaceEdgeWithChain(e,t){let n=this.edge(e),s=[...n.faceLinks],r=n.a,o=n.b;this.removeEdgeKeepVerts(e);let a=[r,...t.map(c=>this.ensureVertex(c)),o],l=[];for(let c=0;c+1<a.length;c++){let h=a[c],d=a[c+1];if(h===d)continue;let u=this.edgeBetween(h,d);if(u!==void 0){l.push({edge:u,fwd:this.edge(u).a===h});continue}let m=this.addEdge(h,d);this.edge(m).faceLinks=[...s],l.push({edge:m,fwd:!0})}return l}relocateVertex(e,t){let n=this.vertex(e),s=Ct({x:n.x,y:n.y,z:n.z});if(this.vertByKey.get(Ct(t))!==void 0&&this.vertByKey.get(Ct(t))!==e)throw new Error("relocateVertex \u76EE\u6807\u683C\u70B9\u5DF2\u88AB\u5360\u7528\u2014\u2014sticky \u5408\u5E76\u8BE5\u5728\u8C03\u7528\u65B9\u5148\u505A");this.vertByKey.delete(s),n.x=t.x,n.y=t.y,n.z=t.z,this.vertByKey.set(Ct(t),e)}removeEdgeKeepVerts(e){let t=this.edge(e);this.edgesById.delete(e),this.vertex(t.a).edges.delete(e),this.vertex(t.b).edges.delete(e)}clone(){let e=new i;e.nextV=this.nextV,e.nextE=this.nextE;for(let[t,n]of this.vertsById)e.vertsById.set(t,{id:n.id,x:n.x,y:n.y,z:n.z,edges:new Set(n.edges)});for(let[t,n]of this.edgesById)e.edgesById.set(t,{id:n.id,a:n.a,b:n.b,faceLinks:[...n.faceLinks]});for(let[t,n]of this.vertByKey)e.vertByKey.set(t,n);return e}};function vu(i,e,t,n){let s=Wi(e),r=Wi(t);if(tn(s,r))return{created:[],retraced:[]};let o=St(s,r),a=p=>((p.x-s.x)*(r.x-s.x)+(p.y-s.y)*(r.y-s.y)+(p.z-s.z)*(r.z-s.z))/(o*o),l=new Map,c=p=>{l.set(Ct(p),p)};c(s),c(r);let h=new Map;for(let p of i.edges()){let y=i.pt(p.a),g=i.pt(p.b),f=co(s,r,y,g);for(let b of f)if(c(b),!tn(b,y)&&!tn(b,g)){let M=h.get(p.id)??[];M.push(b),h.set(p.id,M)}}for(let p of i.vertices()){let y={x:p.x,y:p.y,z:p.z};lo(y,s,r)&&c(y)}for(let[p,y]of h){let g=i.pt(i.edge(p).a);y.sort((b,M)=>St(g,b)-St(g,M));let f=p;for(let b of y){let{e1:M,e2:v}=i.splitEdge(f,b);n?.(f,M,v),f=v}}let d=[...l.values()].sort((p,y)=>a(p)-a(y)),u=[],m=[];for(let p=0;p+1<d.length;p++){let y=d[p],g=d[p+1];if(tn(y,g))continue;let f=i.ensureVertex(y),b=i.ensureVertex(g);if(f===b)continue;let M=i.edgeBetween(f,b);M!==void 0?m.push(M):u.push(i.addEdge(f,b))}return{created:u,retraced:m}}var wp=32;function nc(i){let e=!1;for(let t=0;t<wp;t++){let n=new Map,s=(o,a)=>{let l=n.get(o);l||(l=new Map,n.set(o,l)),l.set(Ct(a),a)},r=i.edges();for(let o=0;o<r.length;o++){let a=r[o],l=i.pt(a.a),c=i.pt(a.b);for(let h=o+1;h<r.length;h++){let d=r[h],u=i.pt(d.a),m=i.pt(d.b);for(let p of co(l,c,u,m))!tn(p,l)&&!tn(p,c)&&s(a.id,p),!tn(p,u)&&!tn(p,m)&&s(d.id,p)}for(let h of i.vertices()){if(h.id===a.a||h.id===a.b)continue;let d={x:h.x,y:h.y,z:h.z};lo(d,l,c)&&s(a.id,d)}}if(n.size===0)return{changed:e};e=!0;for(let[o,a]of n){if(!i.hasEdge(o))continue;let l=i.pt(i.edge(o).a),c=[...a.values()].sort((h,d)=>St(l,h)-St(l,d));i.replaceEdgeWithChain(o,c)}}throw new Error("planarize \u672A\u6536\u655B\uFF08>32 \u8F6E\uFF09\u2014\u2014\u91CF\u5316\u8FDE\u9501\u5F02\u5E38\uFF0C\u68C0\u67E5\u8F93\u5165\u51E0\u4F55")}function _u(i,e){let t=i.length;if(t<4)return null;let n=u=>{for(let m=1;m+1<u.length;m++){let p=gi(i[u[0]],i[u[m]],i[u[m+1]]);if(p)return p}return null},s=u=>{let m=n(u);return m?u.every(p=>nn(i[p],m)<=e):!0},r=[],o=[0,1];for(let u=2;u<t;u++){let m=[...o,u];s(m)?o=m:(r.push(o),o=[o[o.length-1],u])}let a=[...o,0];if(r.length&&s([...o,...r[0]])?r[0]=[...o,...r[0]]:s(a)?r.push(a):(r.push(o),r.push([o[o.length-1],0])),r.length<2)return null;let l=r.map(u=>u[0]),c=l.length,h=r.filter(u=>new Set(u).size>=3),d=[];if(c===2)d.push([l[0],l[1]]);else{for(let u=0;u<c;u++)d.push([l[u],l[(u+1)%c]]);if(c>=3){if(!s(l))return null;new Set(l).size>=3&&h.push([...l])}}return h.length?{pieces:h,creases:d}:null}var Mu=(i,e)=>`${i}:${e?"f":"r"}`;function Su(i,e){let t=e?.project??(g=>{let f=i.pt(g);return{x:f.x,y:f.y}}),n=e?.edges?[...e.edges].map(g=>i.edge(g)):i.edges(),s=new Map,r=g=>{let f=s.get(g);return f||(f=t(g),s.set(g,f)),f},o=new Map,a=new Set;for(let g of n)a.add(g.id),o.set(g.a,(o.get(g.a)??0)+1),o.set(g.b,(o.get(g.b)??0)+1);let l=[...o.entries()].filter(([,g])=>g===1).map(([g])=>g);for(;l.length;){let g=l.pop();if((o.get(g)??0)===1)for(let f of i.vertex(g).edges){if(!a.has(f))continue;a.delete(f);let b=i.edge(f);for(let M of[b.a,b.b]){let v=(o.get(M)??0)-1;o.set(M,v),v===1&&l.push(M)}}}if(a.size===0)return[];let c=new Map,h=g=>{let f=c.get(g);if(!f){f=[];let b=i.vertex(g);for(let M of b.edges){if(!a.has(M))continue;let v=i.otherEnd(i.edge(M),g);f.push({eid:M,to:v,angle:ec(r(g),r(v))})}f.sort((M,v)=>M.angle-v.angle),c.set(g,f)}return f},d=(g,f)=>{let b=h(f),M=ec(r(f),r(g)),v;for(let A=b.length-1;A>=0;A--)if(b[A].angle<M-1e-12){v=b[A];break}return v||(v=b[b.length-1]),v},u=new Set,m=[],p=[];for(let g of a){let f=i.edge(g);for(let b of[!0,!1]){if(u.has(Mu(g,b)))continue;let M=[],v=[],A=g,w=b?f.a:f.b,E=b?f.b:f.a;for(;;){let C=i.edge(A).a===w,R=Mu(A,C);if(u.has(R))break;u.add(R),M.push({edge:A,forward:C}),v.push(r(w));let L=d(w,E);w=E,E=L.to,A=L.eid}if(M.length<2)continue;let x=gu(v),T={edges:M,pts:v};x>1e-9?m.push({ring:T,area:x}):x<-1e-9&&p.push({ring:T,areaAbs:-x})}}let y=m.sort((g,f)=>g.area-f.area).map(g=>({outer:g.ring,holes:[],area:g.area}));for(let g of p){let f=g.ring.pts[0];for(let b of y)if(b.outer.pts.length&&Ep(b.outer,g.ring,f)){b.holes.push(g.ring),b.area-=g.areaAbs;break}}return y}function Ep(i,e,t){let n=new Set(i.edges.map(s=>s.edge));return e.edges.some(s=>n.has(s.edge))?!1:dt(t,i.pts)}function ps(i){let e=i.outer.pts.map(a=>a.y),t=Math.min(...e),n=Math.max(...e),s=[i.outer,...i.holes];for(let a=1;a<=8;a++){let l=t+(n-t)*a/(a+1);if(s.some(u=>u.pts.some(m=>Math.abs(m.y-l)<1e-9)))continue;let c=[];for(let u of s)for(let m=0;m<u.pts.length;m++){let p=u.pts[m],y=u.pts[(m+1)%u.pts.length];p.y>l!=y.y>l&&c.push(p.x+(l-p.y)*(y.x-p.x)/(y.y-p.y))}if(c.length<2)continue;c.sort((u,m)=>u-m);let h=NaN,d=-1;for(let u=0;u+1<c.length;u+=2){let m=c[u+1]-c[u];m>d&&(d=m,h=(c[u]+c[u+1])/2)}if(d>1e-9)return{x:h,y:l}}let r=i.outer.pts.reduce((a,l)=>a+l.x,0)/i.outer.pts.length,o=i.outer.pts.reduce((a,l)=>a+l.y,0)/i.outer.pts.length;return{x:r,y:o}}function wu(i,e){if(!dt(e,i.outer.pts))return!1;for(let t of i.holes)if(dt(e,t.pts))return!1;return!0}var Tp=1-1e-10,uo=class i{constructor(){U(this,"recs",new Map);U(this,"nextId",1)}all(){return[...this.recs.values()]}rec(e){let t=this.recs.get(e);if(!t)throw new Error(`plane ${e} \u4E0D\u5B58\u5728`);return t}ensure(e,t){for(let s of this.recs.values())if(te(s.plane.n,e.n)>=Tp&&Math.abs(s.plane.d-e.d)<=t)return s;let n={id:this.nextId++,plane:e,basis:fs(e)};return this.recs.set(n.id,n),n}prune(e){for(let t of[...this.recs.keys()])e.has(t)||this.recs.delete(t)}clone(){let e=new i;e.nextId=this.nextId;for(let[t,n]of this.recs)e.recs.set(t,n);return e}};function Eu(i,e,t,n){for(let a of i.vertices()){let l=[...a.edges],c=i.pt(a.id);for(let h=0;h<l.length;h++)for(let d=h+1;d<l.length;d++){let u=i.pt(i.otherEnd(i.edge(l[h]),a.id)),m=i.pt(i.otherEnd(i.edge(l[d]),a.id)),p=gi(c,u,m);p&&e.ensure(p,t)}}let s=new Map,r=i.edges();for(let a of e.all()){let l=[];for(let c of r)nn(i.pt(c.a),a.plane)<=t&&nn(i.pt(c.b),a.plane)<=t&&l.push(c.id);l.length>=3&&s.set(a.id,l)}let o=new Set([...s.keys(),...n]);return e.prune(o),s}var fo=class i{constructor(){U(this,"byId",new Map);U(this,"nextId",1)}faces(){return[...this.byId.values()]}face(e){return this.byId.get(e)}faceCount(){return this.byId.size}planeIds(){return new Set([...this.byId.values()].map(e=>e.planeId))}faceContains(e,t){if(!dt(t,e.outer.pts))return!1;for(let n of e.holes)if(dt(t,n.pts))return!1;return!0}occurrences(e,t){let n=0,s=!1,r=!1;for(let o of e.outer.edges)o.edge===t&&(n++,s=!0);for(let o of e.holes)for(let a of o.edges)a.edge===t&&(n++,r=!0);return{count:n,onOuter:s,onHole:r}}regionsByPlane(e,t,n){let s=Eu(e,t,n,this.planeIds()),r=new Map;for(let[o,a]of s){let l=t.rec(o),c=Su(e,{edges:a,project:h=>yn(e.pt(h),l.basis)});c.length&&r.set(o,c)}return r}reconcileConstructive(e,t,n,s,r,o){let a=o??this.captureSnaps(e);return this.settle(e,t,n,a,new Map,new Set,!0,void 0,"or",{zeroClaimKeep:!0,gestureEdges:s,toggleWith:r})}snapshotEraseVerdicts(e){let t={burst:new Set,mergePairs:[],heal:new Set};for(let n of e){let s=this.faces().map(o=>({f:o,occ:this.occurrences(o,n)})).filter(o=>o.occ.count>0);if(s.length===0)continue;let r=new Map;for(let o of s){let a=r.get(o.f.planeId)??[];a.push(o),r.set(o.f.planeId,a)}for(let o of r.values())if(o.length>=2)t.mergePairs.push([o[0].f.id,o[1].f.id]);else{let{f:a,occ:l}=o[0];l.count>=2||l.onHole?t.heal.add(a.id):t.burst.add(a.id)}}return t}reconcileErase(e,t,n,s){let r=[],o=new Map,a=m=>{let p=m;for(;o.get(p)!==void 0&&o.get(p)!==p;)p=o.get(p);return p};for(let[m,p]of s.mergePairs)o.has(m)||o.set(m,m),o.has(p)||o.set(p,p),o.set(a(m),a(p));let l=new Map;for(let m of o.keys()){let p=a(m);(l.get(p)??l.set(p,[]).get(p)).push(m)}let c=this.regionsByPlane(e,t,n),h=new Set,d=(m,p)=>(c.get(m)??[]).find(y=>!h.has(y)&&wu(y,p)),u=new Set(s.burst);for(let m of l.values()){let p=m.some(f=>u.has(f)),y,g;if(!p)for(let f of m){let b=this.byId.get(f);if(b&&(y=d(b.planeId,ps(b)),y)){g=b.planeId;break}}if(y&&g!==void 0){for(let b of m)this.byId.delete(b);let f=this.mint(g,y);h.add(y),r.push({type:"MERGE",from:m,into:f.id})}else for(let f of m)u.add(f)}for(let m of s.heal){if(u.has(m)||!this.byId.has(m))continue;let p=this.byId.get(m),y=d(p.planeId,ps(p));if(y){this.byId.delete(m);let g=this.mint(p.planeId,y);h.add(y),r.push({type:"ABSORB",from:m,into:g.id})}else u.add(m)}for(let m of u)this.byId.delete(m)&&r.push({type:"BURST",face:m});return this.rebuildFaceLinks(e),r}deleteSilently(e){return this.byId.delete(e)}renameFace(e,t){let n=this.byId.get(e);!n||this.byId.has(t)||(this.byId.delete(e),this.byId.set(t,{id:t,planeId:n.planeId,outer:n.outer,holes:n.holes}))}eraseFaces(e,t){let n=[];for(let s of t)this.byId.delete(s)&&n.push({type:"FACE_ERASED",face:s});return this.rebuildFaceLinks(e),n}reconcileCoverage(e,t,n,s,r,o,a,l,c="or"){return this.settle(e,t,n,s,r,o,a,l,c,{})}settle(e,t,n,s,r,o,a,l,c,h){let d=[];if(!a){for(let x of this.faces())this.refreshRingPts(e,t,x);this.rebuildFaceLinks(e);let E=[...o].filter(x=>this.byId.has(x));return E.length&&d.push({type:"STRETCH",faces:E}),d}let u=[],m=this.regionsByPlane(e,t,n),p=E=>{for(;r.has(E);)E=r.get(E);return E},y=E=>{let x=[];for(let T of E){let C=p(T);if(!e.hasVertex(C))continue;let R=e.pt(C);x.length&&R.x===x[x.length-1].x&&R.y===x[x.length-1].y&&R.z===x[x.length-1].z||x.push(R)}for(;x.length>=2&&x[0].x===x[x.length-1].x&&x[0].y===x[x.length-1].y&&x[0].z===x[x.length-1].z;)x.pop();return x},g=new Map,f=new Map;for(let E of this.faces()){let x=s.get(E.id),T=[],C=l?.get(E.id),R=C??(x?[x.outer]:[]);for(let L of R){let I=y(L);if(I.length<3)continue;let V=null;for(let j=0;j+2<I.length&&!V;j++)V=gi(I[j],I[j+1],I[j+2]);if(!V||!I.every(j=>nn(j,V)<=n))continue;let D=t.ensure(V,n),q=I.map(j=>yn(j,D.basis)),z=C?[]:(x?.holes??[]).map(j=>y(j).map(se=>yn(se,D.basis))),K=j=>Tu(j,q)+z.reduce((se,fe)=>se+(fe.length>=3?Tu(j,fe):0),0);for(let j of m.get(D.id)??[])T.some(se=>se.r===j)||Math.abs(K(ps(j)))>=1&&T.push({r:j,planeId:D.id})}g.set(E.id,T);for(let L of T){let I=f.get(L.r)??[];I.push(E.id),f.set(L.r,I)}}let b=new Map,M=new Map;for(let[E,x]of g){if(x.length<2)continue;this.byId.delete(E);let T=[];for(let C of x){let R=this.mint(C.planeId,C.r);T.push(R.id);let L=f.get(C.r);L[L.indexOf(E)]=R.id}b.set(E,T),d.push({type:"DIVIDE",from:E,into:T})}for(let[E,x]of f){let T=[...new Set(x)];if(T.length<2)continue;if(c==="xor"&&T.length%2===0){for(let L of T){let I=this.byId.get(L);I&&u.push(...this.ringEdgeIds(I)),this.byId.delete(L)&&d.push({type:"BURST",face:L})}f.set(E,[]);continue}let C=null;for(let L of T)C=this.byId.get(L)?.planeId??C,this.byId.delete(L);let R=this.mint(C,E);for(let L of T)b.set(L,[...b.get(L)??[],R.id]);d.push({type:"MERGE",from:T,into:R.id}),f.set(E,[R.id])}for(let[E,x]of g){if(b.has(E))continue;let T=this.byId.get(E);if(!T)continue;if(x.length===0){if(h.zeroClaimKeep)continue;this.byId.delete(E),d.push({type:"BURST",face:E});continue}let{r:C,planeId:R}=x[0];(f.get(C)??[])[0]===E&&(R===T.planeId?this.adopt(T,C):(this.byId.delete(E),this.byId.set(E,{id:E,planeId:R,outer:C.outer,holes:C.holes}),M.set(E,E)))}let v=h.gestureEdges,A=h.toggleWith;if(A&&v)for(let E of this.faces())E.outer.edges.every(x=>v.has(x.edge)||A.has(x.edge))&&(u.push(...this.ringEdgeIds(E)),this.byId.delete(E.id),d.push({type:"BURST",face:E.id}));if(v&&v.size){let E=new Set;for(let[,x]of g)for(let T of x)E.add(T.r);for(let[x,T]of m)for(let C of T)if(!E.has(C)&&!this.faces().some(R=>R.outer===C.outer)&&C.outer.edges.some(R=>v.has(R.edge))){let R=this.mint(x,C);d.push({type:"BIRTH",face:R.id})}}this.rebuildFaceLinks(e),this.buryEdges(e,u);let w=new Set;for(let E of o){this.byId.has(E)&&!b.has(E)&&!d.some(T=>T.type==="BURST"&&T.face===E)&&w.add(E);let x=M.get(E);x!==void 0&&w.add(x)}return w.size&&d.push({type:"STRETCH",faces:[...w]}),d}buryEdges(e,t){for(let n of t)e.hasEdge(n)&&e.edge(n).faceLinks.length===0&&e.removeEdge(n)}ringEdgeIds(e){let t=[];for(let n of[e.outer,...e.holes])for(let s of n.edges)t.push(s.edge);return t}captureSnaps(e){let t=new Map;for(let n of this.faces())t.set(n.id,{outer:an(e,n.outer),holes:n.holes.map(s=>an(e,s))});return t}clone(){let e=new i;e.nextId=this.nextId;let t=n=>({edges:n.edges.map(s=>({...s})),pts:n.pts.map(s=>({...s}))});for(let[n,s]of this.byId)e.byId.set(n,{id:s.id,planeId:s.planeId,outer:t(s.outer),holes:s.holes.map(t)});return e}mint(e,t){let n={id:this.nextId++,planeId:e,outer:t.outer,holes:t.holes};return this.byId.set(n.id,n),n}adopt(e,t){e.outer=t.outer,e.holes=t.holes}refreshRingPts(e,t,n){let s=t.rec(n.planeId).basis;for(let r of[n.outer,...n.holes])r.pts=r.edges.map(o=>yn(e.pt(o.forward?e.edge(o.edge).a:e.edge(o.edge).b),s))}rebuildFaceLinks(e){for(let t of e.edges())t.faceLinks=[];for(let t of this.byId.values())for(let n of[t.outer,...t.holes])for(let s of n.edges)e.hasEdge(s.edge)&&e.edge(s.edge).faceLinks.push(t.id)}};function Tu(i,e){let t=0;for(let n=0;n<e.length;n++){let s=e[n],r=e[(n+1)%e.length];s.y<=i.y?r.y>i.y&&tc(s,r,i)>0&&t++:r.y<=i.y&&tc(s,r,i)<0&&t--}return t}function an(i,e){let t=[],n=e.edges;for(let s=0;s<n.length;s++){let r=n[s];if(i.hasEdge(r.edge)){let o=i.edge(r.edge);t.push(r.forward?o.a:o.b)}else{let o=n[(s-1+n.length)%n.length];if(i.hasEdge(o.edge)){let a=i.edge(o.edge);t.push(o.forward?a.b:a.a)}}}return t}var po=i=>({x:i.x,y:i.y,z:i.z??0}),xi=class i{constructor(e){U(this,"_graph",new ho);U(this,"store",new fo);U(this,"eventLog",[]);U(this,"planes",new uo);U(this,"coplanarTol");this.coplanarTol=e?.coplanarTol??.001}get graph(){return this._graph}clone(){let e=new i({coplanarTol:this.coplanarTol});return e._graph=this._graph.clone(),e.store=this.store.clone(),e.planes=this.planes.clone(),e}addEdges(e){return this.addSegmentsMixed(e.map(([t,n])=>({a:t,b:n,gesture:!0})))}addSegmentsMixed(e,t,n){let s=this.store.captureSnaps(this.graph),r=new Set(n);for(let{a:o,b:a,gesture:l}of e){let c=vu(this.graph,po(o),po(a),(h,d,u)=>{r.delete(h)&&(r.add(d),r.add(u))});if(l){for(let h of c.created)r.add(h);for(let h of c.retraced)r.add(h)}}return this.emit(this.store.reconcileConstructive(this.graph,this.planes,this.coplanarTol,r,t,s))}eraseEdges(e){let t=[...new Set(e)].filter(s=>this.graph.hasEdge(s)),n=this.store.snapshotEraseVerdicts(t);for(let s of t)this.graph.removeEdge(s);return this.emit(this.store.reconcileErase(this.graph,this.planes,this.coplanarTol,n))}eraseFaces(e){return this.emit(this.store.eraseFaces(this.graph,e))}moveVertices(e,t="or"){let n=new Map;for(let p of this.store.faces())n.set(p.id,{outer:an(this.graph,p.outer),holes:p.holes.map(y=>an(this.graph,y))});let s=new Map;for(let p of e)this.graph.hasVertex(p.id)&&s.set(p.id,Wi(po(p.to)));let r=new Set;for(let p of s.keys())for(let y of this.graph.vertex(p).edges)for(let g of this.graph.edge(y).faceLinks)r.add(g);let o=new Map;for(let p of this.graph.vertices()){let y=s.get(p.id)??{x:p.x,y:p.y,z:p.z},g=Ct(y),f=o.get(g)??[];f.push(p.id),o.set(g,f)}let a=new Map,l=!1;for(let p of o.values()){if(p.length<2)continue;l=!0;let y=p.find(g=>!s.has(g))??Math.min(...p);for(let g of p)g!==y&&(a.set(g,y),this.absorbVertex(g,y),s.delete(g))}let c=[...s].filter(([p,y])=>this.graph.hasVertex(p)&&!tn(this.graph.pt(p),y)).map(([p,y])=>({id:p,to:y}));this.graph.relocateVertices(c);let{changed:h}=nc(this.graph),d=p=>{let y=p;for(;a.has(y);)y=a.get(y);return y},u=new Map;for(let[p,y]of n){if(y.holes.length)continue;let g=[];for(let v of y.outer){let A=d(v);this.graph.hasVertex(A)&&(g.length&&g[g.length-1]===A||g.push(A))}for(;g.length>=2&&g[0]===g[g.length-1];)g.pop();if(g.length<4)continue;let f=g.map(v=>this.graph.pt(v)),b=null;for(let v=0;v+2<f.length&&!b;v++)b=gi(f[v],f[v+1],f[v+2]);if(b&&f.every(v=>nn(v,b)<=this.coplanarTol))continue;let M=_u(f,this.coplanarTol);if(M){for(let[v,A]of M.creases){let w=g[v],E=g[A];w===E||this.graph.edgeBetween(w,E)!==void 0||this.graph.addEdge(w,E)}u.set(p,M.pieces.map(v=>v.map(A=>g[A])))}}u.size&&nc(this.graph);let m=l||h||r.size>0;return this.emit(this.store.reconcileCoverage(this.graph,this.planes,this.coplanarTol,n,a,r,m,u,t))}pushPull(e,t,n){let s=n?.settleLanding!==!1,r=this.store.face(e);if(!r)return[];let o=this.planes.rec(r.planeId),a=o.plane.n,l=Fe(a,t);if(Math.abs(t)<1e-6)return[];let c=new Set(this.graph.edges().map(I=>I.id)),h=[r.outer,...r.holes],d=new Map,u=new Set,m=new Set,p=new Map;for(let I=0;I<h.length;I++)for(let V of h[I].edges){let D=this.graph.edge(V.edge);u.add(D.id),p.set(D.id,I);let q=D.faceLinks.filter(z=>z!==e);q.length===0?(d.set(D.id,"move"),m.add(D.id)):q.every(z=>{let K=this.store.face(z);return K?Math.abs(te(this.planes.rec(K.planeId).plane.n,a))<=.001:!0})?d.set(D.id,"move"):d.set(D.id,"copy")}let y=new Map;for(let I of u){let V=this.graph.edge(I),D=d.get(I);for(let q of[V.a,V.b]){let z=y.get(q)??{hasMove:!1,hasCopy:!1};D==="move"?z.hasMove=!0:z.hasCopy=!0,y.set(q,z)}}for(let I of this.graph.edges()){if(u.has(I.id))continue;let V={a:y.get(I.a),b:y.get(I.b)};if(!V.a&&!V.b)continue;let D=this.graph.pt(I.a),q=this.graph.pt(I.b),z=Pe(q,D),K=Math.hypot(z.x,z.y,z.z);K>0&&Math.abs(te(Fe(z,1/K),a))>.999||(V.a&&(V.a.hasCopy=!0),V.b&&(V.b.hasCopy=!0))}let g=I=>{let V=y.get(I);return V.hasMove&&!V.hasCopy},f=new Map;for(let I of y.keys())f.set(I,this.graph.pt(I));let b=[],M=[...d.values()].some(I=>I==="copy")||[...y.values()].some(I=>I.hasCopy),v=I=>p.get(I)===0;for(let I of u){if(d.get(I)!=="copy")continue;let V=this.graph.edge(I);b.push({a:Ne(f.get(V.a),l),b:Ne(f.get(V.b),l),gesture:v(I)})}for(let I of[...u]){if(d.get(I)!=="move"||m.has(I))continue;let V=this.graph.edge(I);g(V.a)&&g(V.b)||(b.push({a:Ne(f.get(V.a),l),b:Ne(f.get(V.b),l),gesture:v(I)}),this.graph.removeEdge(I))}for(let I of[...m]){if(!this.graph.hasEdge(I))continue;let V=this.graph.edge(I);b.push({a:f.get(V.a),b:f.get(V.b),gesture:v(I)}),g(V.a)&&g(V.b)||(b.push({a:Ne(f.get(V.a),l),b:Ne(f.get(V.b),l),gesture:v(I)}),this.graph.removeEdge(I))}for(let[I,V]of y){let D=f.get(I);V.hasCopy?b.push({a:D,b:Ne(D,l),gesture:!0}):g(I)&&[...m].some(q=>{if(!c.has(q))return!1;let K=this.graph.hasEdge(q)?this.graph.edge(q):null;return K?K.a===I||K.b===I:!1})&&b.push({a:D,b:Ne(D,l),gesture:!0})}let A=null;if(M){let I=ps({outer:r.outer,holes:r.holes}),V=o.basis,D=Ne(Ne(Fe(V.u,I.x),Fe(V.v,I.y)),Fe(o.plane.n,o.plane.d));A=Ne(D,l),this.store.deleteSilently(e)}let w=new Set(this.store.faces().map(I=>I.id)),E=[...y.keys()].filter(I=>g(I)&&this.graph.hasVertex(I)).map(I=>({id:I,to:Ne(f.get(I),l)})),x=E.length?this.moveVertices(E,s?"xor":"or"):[],T=new Set([...u].filter(I=>d.get(I)==="move")),C=new Set;if(M)for(let I of u)d.get(I)==="move"&&v(I)&&this.graph.hasEdge(I)&&C.add(I);let R=b.length?this.addSegmentsMixed(b,s&&M?T:new Set,C):[],L=[];if(M&&A){let I=this.hitTest(A,this.coplanarTol).face;if(I!==void 0&&!w.has(I)){this.store.renameFace(I,e),this.store.rebuildFaceLinks(this.graph);for(let V of R)if(V.type==="BIRTH"&&V.face===I){let D=V;delete D.face,D.type="STRETCH",D.faces=[e];break}}else L=this.emit([{type:"FACE_ERASED",face:e}])}return[...x,...R,...L]}vertices(){return this.graph.vertices()}edges(){return this.graph.edges()}faces(){return this.store.faces()}face(e){return this.store.face(e)}log(){return this.eventLog}hitTest(e,t){let n=po(e),s,r=t;for(let l of this.graph.vertices()){let c=St(n,{x:l.x,y:l.y,z:l.z});c<=r&&(r=c,s=l.id)}if(s!==void 0)return{vertex:s};let o,a=t;for(let l of this.graph.edges()){let c=yu(n,this.graph.pt(l.a),this.graph.pt(l.b));c<=a&&(a=c,o=l.id)}if(o!==void 0)return{edge:o};for(let l of this.store.faces()){let c=this.planes.rec(l.planeId);if(!(nn(n,c.plane)>Math.max(t,this.coplanarTol))&&this.store.faceContains(l,yn(n,c.basis)))return{face:l.id}}return{}}faceRings3(e){let t=this.store.face(e);if(!t)return;let n=s=>s.edges.map(r=>this.graph.pt(r.forward?this.graph.edge(r.edge).a:this.graph.edge(r.edge).b));return{outer:n(t.outer),holes:t.holes.map(n)}}planeOf(e){return this.store.face(e)?this.planes.rec(this.store.face(e).planeId):void 0}emit(e){return this.eventLog.push(...e),e}absorbVertex(e,t){for(let n of[...this.graph.vertex(e).edges]){let s=this.graph.edge(n),r=this.graph.otherEnd(s,e);r!==t&&this.graph.edgeBetween(t,r)===void 0&&this.graph.addEdge(t,r),this.graph.removeEdge(n)}}};var Ap={x:0,y:0,z:1},Pp=5e3,Rp=.5,Au=4,Pu=.001,Ru=1e5,mo=class{constructor(){U(this,"target",{x:0,y:0,z:0});U(this,"yaw",-Math.PI/4);U(this,"pitch",Math.PI/6);U(this,"halfH",Au);U(this,"projection","ortho");U(this,"fovY",50*Math.PI/180);U(this,"nearMin",Rp)}eyeDir(){let e=Math.cos(this.pitch);return{x:e*Math.cos(this.yaw),y:e*Math.sin(this.yaw),z:Math.sin(this.pitch)}}eyeDist(){return this.projection==="persp"?this.halfH/Math.tan(this.fovY/2):Pp}eye(){return Ne(this.target,Fe(this.eyeDir(),this.eyeDist()))}forward(){return Fe(this.eyeDir(),-1)}right(){return xn(Rt(this.forward(),Ap))}up(){return Rt(this.right(),this.forward())}viewDir(e){return this.projection!=="persp"?this.eyeDir():xn(Pe(this.eye(),e))}orbit(e,t){this.yaw-=e*.008,this.pitch=Math.max(-1.55,Math.min(1.55,this.pitch+t*.008))}pan(e,t,n){let s=2*this.halfH/n.h;this.target=Ne(this.target,Ne(Fe(this.right(),-e*s),Fe(this.up(),t*s)))}zoomBy(e){this.halfH=Math.max(Pu,Math.min(Ru,this.halfH*e))}nearClamp(){return Math.min(this.nearMin,this.eyeDist()*.05)}zoomAt(e,t,n,s){let r=(t/s.w*2-1)*this.halfW(s),o=(1-n/s.h*2)*this.halfH,a=Ne(Ne(this.target,Fe(this.right(),r)),Fe(this.up(),o)),l=this.halfH;this.zoomBy(e);let c=this.halfH/l;this.target=Ne(a,Fe(Pe(this.target,a),c))}halfW(e){return this.halfH*e.w/e.h}angularPx(e,t){if(this.projection==="persp"){let o=Pe(e,this.eye()),a=Math.max(te(o,this.forward()),this.nearClamp()),l=Math.tan(this.fovY/2),c=te(o,this.right())/(a*l*(t.w/t.h)),h=te(o,this.up())/(a*l);return{x:(c*.5+.5)*t.w,y:(.5-h*.5)*t.h}}let n=Pe(e,this.target),s=te(n,this.right())/this.halfW(t),r=te(n,this.up())/this.halfH;return{x:(s*.5+.5)*t.w,y:(.5-r*.5)*t.h}}ray(e,t,n){if(this.projection==="persp"){let a=Math.tan(this.fovY/2),l=(e/n.w*2-1)*a*(n.w/n.h),c=(1-t/n.h*2)*a,h=xn(Ne(Ne(this.forward(),Fe(this.right(),l)),Fe(this.up(),c)));return{origin:this.eye(),dir:h}}let s=(e/n.w*2-1)*this.halfW(n),r=(1-t/n.h*2)*this.halfH;return{origin:Ne(Ne(this.eye(),Fe(this.right(),s)),Fe(this.up(),r)),dir:this.forward()}}setView(e){switch(e){case"iso":this.yaw=-Math.PI/4,this.pitch=.61;break;case"top":this.yaw=-Math.PI/2,this.pitch=1.55;break;case"front":this.yaw=-Math.PI/2,this.pitch=0;break;case"back":this.yaw=Math.PI/2,this.pitch=0;break;case"right":this.yaw=0,this.pitch=0;break;case"left":this.yaw=Math.PI,this.pitch=0;break}}fitPoints(e,t,n=Au){if(!e.length){this.target={x:0,y:0,z:0},this.halfH=n;return}let s=0,r=0,o=0;for(let u of e)s+=u.x,r+=u.y,o+=u.z;this.target={x:s/e.length,y:r/e.length,z:o/e.length};let a=this.right(),l=this.up(),c=0,h=0;for(let u of e){let m=Pe(u,this.target);c=Math.max(c,Math.abs(te(m,a))),h=Math.max(h,Math.abs(te(m,l)))}let d=t.w/t.h;this.halfH=Math.max(Pu,Math.min(Ru,Math.max(h,c/d)*1.25))}};function Xi(i,e,t,n){let s=te(t,e);if(Math.abs(s)<1e-9)return null;let r=(n-te(t,i))/s;return Ne(i,Fe(e,r))}function go(i,e,t,n){let s=te(e,n),r=1-s*s;if(Math.abs(r)<1e-9)return null;let o=Pe(t,i),a=(te(o,e)-s*te(o,n))/r;return Ne(i,Fe(e,a))}var yi={endpoint:90,origin:80,midpoint:70,intersection:65,edge:60,cross:55,axisLine:45,plane:10},jn={point:10,edge:7,line:3.5,combo:12},Cp=24,Ip=800,vi=i=>i.h/Ip,Iu=1e-5;function Lp(i,e){let t=te(i.dir,e.dir),n=1-t*t;if(Math.abs(n)<1e-9)return null;let s=Pe(i.a,e.a),r=te(i.dir,s),o=te(e.dir,s),a=(t*o-r)/n,l=(o-t*r)/n;if(i.len!==void 0&&(a<-1e-9||a>i.len+1e-9)||e.len!==void 0&&(l<-1e-9||l>e.len+1e-9))return null;let c={x:i.a.x+i.dir.x*a,y:i.a.y+i.dir.y*a,z:i.a.z+i.dir.z*a},h={x:e.a.x+e.dir.x*l,y:e.a.y+e.dir.y*l,z:e.a.z+e.dir.z*l};return St(c,h)>Iu?null:e.len!==void 0?h:c}function Dp(i,e,t,n){let{pf:s,vp:r}=i,o=n?.comboEps??jn.combo,a=s.ray(e.x,e.y,r),l=g=>s.angularPx(g,r),c=g=>{let f=l(g);return Math.hypot(f.x-e.x,f.y-e.y)},h=(g,f,b)=>{let M=l(g),v=l(b!==void 0?{x:g.x+f.x*b,y:g.y+f.y*b,z:g.z+f.z*b}:{x:g.x+f.x*100,y:g.y+f.y*100,z:g.z+f.z*100}),A=v.x-M.x,w=v.y-M.y,E=A*A+w*w;if(E===0)return Math.hypot(e.x-M.x,e.y-M.y);if(b!==void 0){let x=((e.x-M.x)*A+(e.y-M.y)*w)/E;return x=Math.max(0,Math.min(1,x)),Math.hypot(e.x-(M.x+x*A),e.y-(M.y+x*w))}return Math.abs((e.x-M.x)*w-(e.y-M.y)*A)/Math.sqrt(E)},d=[],u=[],m=n?.hidden;for(let g of t){let f=g.locus;if(f.dim===0){let b=c(f.p);b<=g.eps&&!(m&&m(f.p))&&d.push({p:f.p,dim:0,rank:g.rank,d:b,used:[g]})}else if(f.dim===1){let b=h(f.a,f.dir,f.len);if(b>g.eps)continue;let M=go(f.a,f.dir,a.origin,a.dir);if(!M)continue;let v=te(Pe(M,f.a),f.dir);f.len!==void 0&&(v=Math.max(0,Math.min(f.len,v)));let A=b;if(n?.spans1D){let E=f.len!==void 0?0:Math.abs(v)+1e5,x=f.len!==void 0?0:v-E,T=f.len!==void 0?f.len:v+E,C=n.spans1D(f.a,f.dir,x,T),R=null;for(let L of C)if(v>L[0]+1e-9&&v<L[1]-1e-9){R=L;break}if(R){let L=[R[0],R[1]].filter(V=>V>x+1e-9&&V<T-1e-9);if(!L.length)continue;v=L.reduce((V,D)=>Math.abs(D-v)<Math.abs(V-v)?D:V);let I={x:f.a.x+f.dir.x*v,y:f.a.y+f.dir.y*v,z:f.a.z+f.dir.z*v};if(A=c(I),A>g.eps)continue}}else if(m){let E={x:f.a.x+f.dir.x*v,y:f.a.y+f.dir.y*v,z:f.a.z+f.dir.z*v};if(m(E))continue}let w={x:f.a.x+f.dir.x*v,y:f.a.y+f.dir.y*v,z:f.a.z+f.dir.z*v};d.push({p:w,dim:1,rank:g.rank,d:A,used:[g]}),u.push({c:g,l:f})}else{let b=Xi(a.origin,a.dir,f.plane.n,f.plane.d);b&&d.push({p:b,dim:2,rank:g.rank,d:0,used:[g]})}}for(let g=0;g<u.length;g++)for(let f=g+1;f<u.length;f++){let b=Lp(u[g].l,u[f].l);if(!b||m&&m(b))continue;let M=c(b);M>o||d.push({p:b,dim:0,rank:Math.max(u[g].c.rank,u[f].c.rank),d:M,used:[u[g].c,u[f].c]})}if(!d.length)return null;let p={endpoint:0,origin:0,midpoint:0,axis:1,align:2,"edge-align":3,edge:4},y=g=>{let f=g.used[0]?.tag;return`${p[f?.kind??""]??9}|${f?.kind??""}|${f?.axis??""}|${f?.src?Ct(f.src):""}`};return d.sort((g,f)=>g.dim-f.dim||f.rank-g.rank||Math.round(g.d*2)-Math.round(f.d*2)||(y(g)<y(f)?-1:y(g)>y(f)?1:0)),d[0]}var sc={has:()=>!1,opaque:!1},Fp=[{axis:"x",dir:{x:1,y:0,z:0}},{axis:"y",dir:{x:0,y:1,z:0}},{axis:"z",dir:{x:0,y:0,z:1}}];function Up(i,e,t){return t?[...an(i.graph,e.outer),...e.holes.flatMap(n=>an(i.graph,n))].some(n=>t.has(n)):!1}function Lu(i,e,t){return t?t.faces?t.faces(e.id):Up(i,e,t):!1}function Du(i,e){if(!e||e.opaque)return;let t=new Set;for(let n of i.faces())Lu(i,n,e)&&t.add(n.id);return t.size?n=>t.has(n):void 0}function Np(i,e){let t=i.edges(),n=new Map,s=c=>{let h=c;for(;n.has(h)&&n.get(h)!==h;)h=n.get(h);return h},r=(c,h)=>{let d=s(c),u=s(h);d!==u&&n.set(d,u)},o=new Map;for(let c of t)for(let h of[c.a,c.b]){if(!e(h))continue;let d=o.get(h);d?d.push(c):o.set(h,[c])}for(let[c,h]of o){let d=i.graph.pt(c),u=h.map(p=>{let y=i.graph.pt(p.a===c?p.b:p.a),g=Pe(y,d),f=St(y,d);return f>0?Fe(g,1/f):null}),m=new Set;for(let p=0;p<h.length;p++)if(!(m.has(p)||!u[p])){for(let y=p+1;y<h.length;y++)if(!(m.has(y)||!u[y])&&te(u[p],u[y])<-(1-1e-9)){r(h[p].id,h[y].id),m.add(p),m.add(y);break}}}let a=new Map;for(let c of t){let h=s(c.id),d=a.get(h);d?d.push(c):a.set(h,[c])}let l=[];for(let c of a.values()){let h=new Map;for(let u of c)for(let m of[u.a,u.b])h.set(m,(h.get(m)??0)+1);let d=[...h].filter(([,u])=>u===1).map(([u])=>u);d.length===2&&(e(d[0])||e(d[1])||l.push({a:i.graph.pt(d[0]),b:i.graph.pt(d[1])}))}return l}function Js(i,e,t,n){let s=e.viewDir(t);for(let r of i.faces()){if(n?.(r.id))continue;let o=i.planeOf(r.id),a=i.face(r.id);if(!o||!a)continue;let l=te(o.plane.n,s);if(Math.abs(l)<1e-9)continue;let c=(o.plane.d-te(o.plane.n,t))/l;if(c<=1e-4)continue;let h=Ne(t,Fe(s,c)),d={x:te(h,o.basis.u),y:te(h,o.basis.v)};if(dt(d,a.outer.pts)&&!a.holes.some(u=>dt(d,u.pts)))return!0}return!1}function Op(i,e,t,n,s,r,o){let a=e.viewDir(Ne(t,Fe(n,(s+r)/2))),l=[];for(let h of i.faces()){if(o?.(h.id))continue;let d=i.planeOf(h.id),u=i.face(h.id);if(!d||!u)continue;let m=d.plane.n,p=d.plane.d,y=te(m,a);if(Math.abs(y)<1e-9)continue;let g=(p-te(m,t))/y,f=-te(m,n)/y,{u:b,v:M}=d.basis,v=te(t,b)+g*te(a,b),A=te(n,b)+f*te(a,b),w=te(t,M)+g*te(a,M),E=te(n,M)+f*te(a,M),x=[s,r];Math.abs(f)>1e-12&&x.push((1e-4-g)/f);for(let C of[u.outer.pts,...u.holes.map(R=>R.pts)])for(let R=0;R<C.length;R++){let L=C[R],I=C[(R+1)%C.length],V=I.x-L.x,D=I.y-L.y,q=-A*D+E*V;if(Math.abs(q)<1e-12)continue;let z=L.x-v,K=L.y-w,j=(-z*D+K*V)/q,se=(A*K-E*z)/q;se>=-1e-9&&se<=1+1e-9&&x.push(j)}let T=x.filter(C=>C>=s-1e-9&&C<=r+1e-9).sort((C,R)=>C-R);for(let C=0;C+1<T.length;C++){let R=T[C],L=T[C+1];if(L-R<1e-9)continue;let I=(R+L)/2;if(g+f*I<=1e-4)continue;let V={x:v+A*I,y:w+E*I};dt(V,u.outer.pts)&&(u.holes.some(D=>dt(V,D.pts))||l.push([R,L]))}}l.sort((h,d)=>h[0]-d[0]);let c=[];for(let h of l){let d=c[c.length-1];d&&h[0]<=d[1]+1e-9?d[1]=Math.max(d[1],h[1]):c.push([h[0],h[1]])}return c}function Bp(i){let e=[],{k:t}=i,n=h=>i.hand?.has(h)??!1,s=Du(t,i.hand),r=h=>i.pf?Js(t,i.pf,h,s):!1;for(let h of t.vertices()){if(n(h.id))continue;let d={x:h.x,y:h.y,z:h.z};r(d)||e.push({locus:{dim:0,p:d},rank:yi.endpoint,eps:jn.point,tag:{kind:"endpoint"}})}r({x:0,y:0,z:0})||e.push({locus:{dim:0,p:{x:0,y:0,z:0}},rank:yi.origin,eps:jn.point,tag:{kind:"origin"}});let o=Np(t,n);for(let{a:h,b:d}of o){let u=St(h,d);if(u<=0)continue;let m={x:(h.x+d.x)/2,y:(h.y+d.y)/2,z:(h.z+d.z)/2};r(m)||e.push({locus:{dim:0,p:m},rank:yi.midpoint,eps:jn.point,tag:{kind:"midpoint"}}),e.push({locus:{dim:1,a:h,dir:Fe(Pe(d,h),1/u),len:u},rank:yi.edge,eps:jn.edge,tag:{kind:"edge"}})}let a=[...Fp];if(i.basis){let h=d=>Math.abs(d.x)>.999||Math.abs(d.y)>.999||Math.abs(d.z)>.999;h(i.basis.u)||a.push({axis:"u",dir:i.basis.u}),h(i.basis.v)||a.push({axis:"v",dir:i.basis.v})}let l=new Set,c=(h,d)=>{let u=Ct(h);if(!l.has(u)){l.add(u);for(let{axis:m,dir:p}of a)e.push({locus:{dim:1,a:h,dir:p},rank:yi.axisLine,eps:jn.line,tag:{kind:d,src:h,axis:m}})}};if(i.lines!==!1){i.anchor&&c(i.anchor,"axis"),c({x:0,y:0,z:0},"align");for(let h of i.alignSources??[])c(h,"align")}{let h=o.map(({a:d,b:u})=>{let m=St(d,u);return m>0?{a:d,dir:Fe(Pe(u,d),1/m),ea:d,eb:u}:null}).filter(d=>d!==null);for(let d=0;d<h.length;d++)for(let u=d+1;u<h.length;u++){let m=zp(h[d],h[u]);m&&([h[d].ea,h[d].eb,h[u].ea,h[u].eb].some(p=>St(m,p)<=1e-6)||r(m)||e.push({locus:{dim:0,p:m},rank:yi.intersection,eps:jn.point,tag:{kind:"intersection"}}))}}{let h=t.faces().filter(d=>!Lu(t,d,i.hand));for(let d=0;d<h.length;d++)for(let u=d+1;u<h.length;u++)for(let m of kp(t,h[d].id,h[u].id))e.push({locus:{dim:1,a:m.a,dir:m.dir,len:m.len},rank:yi.cross,eps:jn.line,tag:{kind:"cross"}})}return e.push({locus:{dim:2,plane:i.plane},rank:yi.plane,eps:1/0,tag:{kind:"plane"}}),e}function zp(i,e){let t=te(i.dir,e.dir),n=1-t*t;if(Math.abs(n)<1e-9)return null;let s=Pe(i.a,e.a),r=te(i.dir,s),o=te(e.dir,s),a=(t*o-r)/n,l=(o-t*r)/n,c={x:i.a.x+i.dir.x*a,y:i.a.y+i.dir.y*a,z:i.a.z+i.dir.z*a},h={x:e.a.x+e.dir.x*l,y:e.a.y+e.dir.y*l,z:e.a.z+e.dir.z*l};return St(c,h)>Iu?null:c}function Cu(i,e,t){let n=[];for(let r of t)for(let o=0;o<r.length;o++){let a=r[o],l=r[(o+1)%r.length],c=l.x-a.x,h=l.y-a.y,d=c*e.y-h*e.x;if(Math.abs(d)<1e-12)continue;let u=((i.x-a.x)*e.y-(i.y-a.y)*e.x)/d;if(u<0||u>=1)continue;let m=Math.abs(e.x)>Math.abs(e.y)?(a.x+u*c-i.x)/e.x:(a.y+u*h-i.y)/e.y;n.push(m)}n.sort((r,o)=>r-o);let s=[];for(let r=0;r+1<n.length;r+=2)s.push([n[r],n[r+1]]);return s}function kp(i,e,t){let n=i.planeOf(e),s=i.planeOf(t),r=i.face(e),o=i.face(t);if(!n||!s||!r||!o)return[];let a=Rt(n.plane.n,s.plane.n),l=te(a,a);if(l<1e-12)return[];let c=Fe(Ne(Fe(Rt(s.plane.n,a),n.plane.d),Fe(Rt(a,n.plane.n),s.plane.d)),1/l),h=Fe(a,1/Math.sqrt(l)),d=f=>({p2:{x:te(c,f.basis.u),y:te(c,f.basis.v)},d2:{x:te(h,f.basis.u),y:te(h,f.basis.v)}}),u=d(n),m=d(s),p=Cu(u.p2,u.d2,[r.outer.pts,...r.holes.map(f=>f.pts)]),y=Cu(m.p2,m.d2,[o.outer.pts,...o.holes.map(f=>f.pts)]),g=[];for(let[f,b]of p)for(let[M,v]of y){let A=Math.max(f,M),w=Math.min(b,v);w-A<1e-9||g.push({a:{x:c.x+h.x*A,y:c.y+h.y*A,z:c.z+h.z*A},dir:h,len:w-A})}return g}function vn(i,e,t,n,s,r,o){let a=r/8,l=Du(i,o.hand),c=p=>Js(i,e,p,l),h=Bp({k:i,plane:o.plane.plane,basis:o.plane.basis,anchor:o.anchor,alignSources:o.alignSources,pf:e,lines:o.lines,hand:o.hand});if(a!==1)for(let p of h)p.eps!==1/0&&(p.eps*=a);let d=Dp({pf:e,vp:t},{x:n,y:s},h,{comboEps:jn.combo*a,hidden:c,spans1D:(p,y,g,f)=>Op(i,e,p,y,g,f,l)});if(!d)return{p:o.anchor??{x:0,y:0,z:0},kind:null};let u=[];for(let p of d.used)if(p.locus.dim===1&&(p.tag.kind==="axis"||p.tag.kind==="align")&&p.tag.src&&p.tag.axis)u.push({a:p.tag.src,b:d.p,axis:p.tag.axis});else if(p.locus.dim===1&&p.tag.kind==="cross"&&p.locus.len!==void 0){let y=p.locus;u.push({a:y.a,b:{x:y.a.x+y.dir.x*y.len,y:y.a.y+y.dir.y*y.len,z:y.a.z+y.dir.z*y.len},axis:"i"})}let m;if(d.used.length===2)m=d.used.some(p=>p.tag.kind==="edge")?"edge-align":"align-combo";else{let p=d.used[0].tag;m=p.kind==="endpoint"?"endpoint":p.kind==="origin"?"origin":p.kind==="midpoint"?"midpoint":p.kind==="intersection"?"intersection":p.kind==="cross"?"cross-line":p.kind==="edge"?"on-edge":p.kind==="axis"?p.axis==="u"||p.axis==="v"?"align":"axis-"+p.axis:p.kind==="align"?"align":p.kind==="plane"&&Gp(i,o.plane,d.p)?"on-face":null}return u.length?{p:d.p,kind:m,hints:u}:{p:d.p,kind:m}}var Vp=[{x:0,y:0,z:1},{x:0,y:1,z:0},{x:1,y:0,z:0}];function Hp(i,e){let t=Zs(i,te(i,e));return{plane:t,basis:fs(t)}}var ic=i=>Vp.map(e=>Hp(e,i));function xo(i,e){let t=i.forward();if(Math.abs(t.z)>=.34){let n=e.find(s=>Math.abs(s.plane.n.z)>.999);if(n)return n}return e.reduce((n,s)=>Math.abs(te(s.plane.n,t))>Math.abs(te(n.plane.n,t))?s:n)}function Fu(i){return xo(i,ic({x:0,y:0,z:0}))}function Gp(i,e,t){if(e.face===void 0)return!1;let n=i.face(e.face);if(!n)return!1;let s={x:te(t,e.basis.u),y:te(t,e.basis.v)};return dt(s,n.outer.pts)?!n.holes.some(r=>dt(s,r.pts)):!1}function Wp(i,e,t,n,s){let r=e.ray(n,s,t),o=null;for(let a of i.faces()){let l=i.planeOf(a.id);if(!l)continue;let c=te(l.plane.n,r.dir);if(Math.abs(c)<1e-9)continue;let h=(l.plane.d-te(l.plane.n,r.origin))/c;if(h<=0||o&&h>=o.t)continue;let d=Ne(r.origin,Fe(r.dir,h)),u={x:te(d,l.basis.u),y:te(d,l.basis.v)};dt(u,a.outer.pts)&&(a.holes.some(m=>dt(u,m.pts))||(o={t:h,plane:{plane:l.plane,basis:l.basis,face:a.id}}))}return o?.plane??null}function Xp(i,e,t,n,s,r,o){let a=null;for(let l of i.faces()){let c=i.planeOf(l.id);if(!c||nn(r,c.plane)>.001)continue;let h=i.faceRings3(l.id)?.outer;if(!h||h.length<3)continue;let d=h.map(m=>e.angularPx(m,t)),u=0;if(!dt({x:n,y:s},d)){u=1/0;for(let m=0;m<d.length;m++){let p=d[m],y=d[(m+1)%d.length],g=y.x-p.x,f=y.y-p.y,b=g*g+f*f,M=b>0?Math.max(0,Math.min(1,((n-p.x)*g+(s-p.y)*f)/b)):0;u=Math.min(u,Math.hypot(n-(p.x+M*g),s-(p.y+M*f)))}}u<=o&&(!a||u<a.d)&&(a={d:u,plane:{plane:c.plane,basis:c.basis,face:l.id}})}return a?.plane??null}function yo(i,e,t,n,s,r,o){let{p1:a,facePlane:l,alignSources:c,hand:h}=o;if(a){let m=Wp(i,e,t,n,s);if(m&&nn(a,m.plane)<=.001){let M=vn(i,e,t,n,s,r,{plane:m,anchor:a,alignSources:c,hand:h});return{plane:m,fixed:!1,snap:M}}let p=Xp(i,e,t,n,s,a,Cp*vi(t));if(p){let M=vn(i,e,t,n,s,r,{plane:p,anchor:a,alignSources:c,hand:h});return{plane:p,fixed:!1,snap:M}}let y=ic(a),g=xo(e,y),f=vn(i,e,t,n,s,r,{plane:g,anchor:a,alignSources:c,hand:h}),b=y.filter(M=>nn(f.p,M.plane)<=.001);return{plane:b.length?xo(e,b):g,fixed:!1,snap:f}}let d=l??Fu(e),u=vn(i,e,t,n,s,r,{plane:d,alignSources:c,hand:h});return u.kind===null||u.kind==="on-face"?{plane:d,fixed:!!l,snap:u}:{plane:xo(e,ic(u.p)),fixed:!1,snap:u}}function vo(i,e,t,n,s,r,o,a,l){let c=yo(i,e,t,s,r,o,{p1:n,alignSources:a,hand:l});return{plane:c.plane,snap:c.snap}}var oc=(()=>{let i=Zs({x:0,y:0,z:1},0);return{plane:i,basis:fs(i)}})(),rc=(i,e)=>Math.hypot(i.x-e.x,i.y-e.y);function qp(i,e,t){let n=(t.x-e.x)**2+(t.y-e.y)**2;return n===0?0:Math.max(0,Math.min(1,((i.x-e.x)*(t.x-e.x)+(i.y-e.y)*(t.y-e.y))/n))}function Yp(i,e,t){let n=(t.x-e.x)**2+(t.y-e.y)**2;if(n===0)return rc(i,e);let s=((i.x-e.x)*(t.x-e.x)+(i.y-e.y)*(t.y-e.y))/n;return s=Math.max(0,Math.min(1,s)),rc(i,{x:e.x+s*(t.x-e.x),y:e.y+s*(t.y-e.y)})}function On(i,e,t,n,s,r){let o={x:n,y:s},a,l=r;for(let u of i.vertices()){let m={x:u.x,y:u.y,z:u.z},p=rc(o,e.angularPx(m,t));p<=l&&!Js(i,e,m)&&(l=p,a=u.id)}if(a!==void 0)return{vertex:a};let c,h=r;for(let u of i.edges()){let m=i.graph.pt(u.a),p=i.graph.pt(u.b),y=e.angularPx(m,t),g=e.angularPx(p,t),f=Yp(o,y,g);if(f>h)continue;let b=qp(o,y,g),M={x:m.x+b*(p.x-m.x),y:m.y+b*(p.y-m.y),z:m.z+b*(p.z-m.z)};Js(i,e,M)||(h=f,c=u.id)}if(c!==void 0)return{edge:c};let d=js(i,e,t,n,s);return d!==void 0?{face:d}:{}}function js(i,e,t,n,s){let r=e.ray(n,s,t),o,a=1/0;for(let l of i.faces()){let c=i.planeOf(l.id);if(!c)continue;let h=Xi(r.origin,r.dir,c.plane.n,c.plane.d);if(!h)continue;let d=yn(h,c.basis);if(!dt(d,l.outer.pts)||l.holes.some(m=>dt(d,m.pts)))continue;let u=te(Pe(h,r.origin),r.dir);u<a&&(a=u,o=l.id)}return o}function ac(i,e,t,n,s){let r=On(i,e,t,n,s,.5);if(r.face!==void 0){let o=i.planeOf(r.face);return{plane:o.plane,basis:o.basis,face:r.face}}return oc}function lc(i,e,t,n,s,r,o){let a=On(i,e,t,n,s,.5),l=null;if(a.face!==void 0){let h=i.planeOf(a.face);l={plane:h.plane,basis:h.basis,face:a.face}}let c=yo(i,e,t,n,s,r,{facePlane:l,alignSources:o,hand:sc});return{fixed:c.fixed?c.plane:null,plane:c.plane,snap:c.snap}}function Uu(i,e,t,n){let s=o=>o.x>=n.minX&&o.x<=n.maxX&&o.y>=n.minY&&o.y<=n.maxY,r={edges:new Set,faces:new Set};for(let o of i.edges())s(e.angularPx(i.graph.pt(o.a),t))&&s(e.angularPx(i.graph.pt(o.b),t))&&r.edges.add(o.id);for(let o of i.faces()){let a=i.faceRings3(o.id);a&&a.outer.every(l=>s(e.angularPx(l,t)))&&r.faces.add(o.id)}return r}function cc(i,e,t,n){let s=yn(t,e),r=yn(n,e);if(Math.abs(s.x-r.x)<1e-9||Math.abs(s.y-r.y)<1e-9)return[];let o=(d,u)=>xu({x:d,y:u},i,e),a=o(s.x,s.y),l=o(r.x,s.y),c=o(r.x,r.y),h=o(s.x,r.y);return[[a,l],[l,c],[c,h],[h,a]]}var Mn=()=>({edges:new Set,faces:new Set});function hc(i,e){if(e.vertex!==void 0)return[e.vertex];if(e.edge!==void 0){let t=i.graph.edge(e.edge);return[t.a,t.b]}if(e.face!==void 0){let t=i.face(e.face);if(!t)return[];let n=new Set;for(let s of[t.outer,...t.holes])for(let r of s.edges){let o=i.graph.edge(r.edge);n.add(o.a),n.add(o.b)}return[...n]}return[]}function uc(i,e,t){return e.filter(n=>i.graph.hasVertex(n)).map(n=>{let s=i.graph.pt(n);return{id:n,to:{x:s.x+t.x,y:s.y+t.y,z:s.z+(t.z??0)}}})}function Nu(i,e){let t=new Set;for(let n of e.edges){if(!i.graph.hasEdge(n))continue;let s=i.graph.edge(n);t.add(s.a),t.add(s.b)}for(let n of e.faces)for(let s of hc(i,{face:n}))t.add(s);return[...t]}var Ra="185";var cd=0,Xc=1,hd=2;var Fr=1,ud=2,Bs=3,ai=0,jt=1,rn=2,Xn=0,ji=1,qc=2,Yc=3,$c=4,dd=5;var Ai=100,fd=101,pd=102,md=103,gd=104,xd=200,yd=201,vd=202,_d=203,qo=204,Yo=205,bd=206,Md=207,Sd=208,wd=209,Ed=210,Td=211,Ad=212,Pd=213,Rd=214,$o=0,Ko=1,Zo=2,Qi=3,Jo=4,jo=5,Qo=6,ea=7,Kc=0,Cd=1,Id=2,Cn=0,Zc=1,Jc=2,jc=3,Qc=4,eh=5,th=6,nh=7;var ih=300,Fi=301,is=302,Ca=303,Ia=304,Ur=306,ta=1e3,kn=1001,na=1002,Ot=1003,Ld=1004;var Nr=1005;var zt=1006,La=1007;var Ui=1008;var pn=1009,sh=1010,rh=1011,zs=1012,Da=1013,In=1014,Ln=1015,qn=1016,Fa=1017,Ua=1018,ks=1020,oh=35902,ah=35899,lh=1021,ch=1022,bn=1023,Vn=1026,Ni=1027,hh=1028,Na=1029,Oi=1030,Oa=1031;var Ba=1033,Or=33776,Br=33777,zr=33778,kr=33779,za=35840,ka=35841,Va=35842,Ha=35843,Ga=36196,Wa=37492,Xa=37496,qa=37488,Ya=37489,Vr=37490,$a=37491,Ka=37808,Za=37809,Ja=37810,ja=37811,Qa=37812,el=37813,tl=37814,nl=37815,il=37816,sl=37817,rl=37818,ol=37819,al=37820,ll=37821,cl=36492,hl=36494,ul=36495,dl=36283,fl=36284,Hr=36285,pl=36286;var ar=2300,ia=2301,Xo=2302,Uc=2303,Nc=2400,Oc=2401,Bc=2402;var Dd=3200;var uh=0,Fd=1,ci="",Zt="srgb",lr="srgb-linear",cr="linear",Qe="srgb";var Zi=7680;var zc=519,Ud=512,Nd=513,Od=514,ml=515,Bd=516,zd=517,gl=518,kd=519,sa=35044;var dh="300 es",An=2e3,hr=2001;function $p(i){for(let e=i.length-1;e>=0;--e)if(i[e]>=65535)return!0;return!1}function Kp(i){return ArrayBuffer.isView(i)&&!(i instanceof DataView)}function ur(i){return document.createElementNS("http://www.w3.org/1999/xhtml",i)}function Vd(){let i=ur("canvas");return i.style.display="block",i}var Ou={},Cs=null;function dr(...i){let e="THREE."+i.shift();Cs?Cs("log",e,...i):console.log(e,...i)}function Hd(i){let e=i[0];if(typeof e=="string"&&e.startsWith("TSL:")){let t=i[1];t&&t.isStackTrace?i[0]+=" "+t.getLocation():i[1]='Stack trace not available. Enable "THREE.Node.captureStackTrace" to capture stack traces.'}return i}function Ae(...i){i=Hd(i);let e="THREE."+i.shift();if(Cs)Cs("warn",e,...i);else{let t=i[0];t&&t.isStackTrace?console.warn(t.getError(e)):console.warn(e,...i)}}function Le(...i){i=Hd(i);let e="THREE."+i.shift();if(Cs)Cs("error",e,...i);else{let t=i[0];t&&t.isStackTrace?console.error(t.getError(e)):console.error(e,...i)}}function Ji(...i){let e=i.join(" ");e in Ou||(Ou[e]=!0,Ae(...i))}function Gd(i,e,t){return new Promise(function(n,s){function r(){switch(i.clientWaitSync(e,i.SYNC_FLUSH_COMMANDS_BIT,0)){case i.WAIT_FAILED:s();break;case i.TIMEOUT_EXPIRED:setTimeout(r,t);break;default:n()}}setTimeout(r,t)})}var Wd={[$o]:Ko,[Zo]:Qo,[Jo]:ea,[Qi]:jo,[Ko]:$o,[Qo]:Zo,[ea]:Jo,[jo]:Qi},Hn=class{addEventListener(e,t){this._listeners===void 0&&(this._listeners={});let n=this._listeners;n[e]===void 0&&(n[e]=[]),n[e].indexOf(t)===-1&&n[e].push(t)}hasEventListener(e,t){let n=this._listeners;return n===void 0?!1:n[e]!==void 0&&n[e].indexOf(t)!==-1}removeEventListener(e,t){let n=this._listeners;if(n===void 0)return;let s=n[e];if(s!==void 0){let r=s.indexOf(t);r!==-1&&s.splice(r,1)}}dispatchEvent(e){let t=this._listeners;if(t===void 0)return;let n=t[e.type];if(n!==void 0){e.target=this;let s=n.slice(0);for(let r=0,o=s.length;r<o;r++)s[r].call(this,e);e.target=null}}},Xt=["00","01","02","03","04","05","06","07","08","09","0a","0b","0c","0d","0e","0f","10","11","12","13","14","15","16","17","18","19","1a","1b","1c","1d","1e","1f","20","21","22","23","24","25","26","27","28","29","2a","2b","2c","2d","2e","2f","30","31","32","33","34","35","36","37","38","39","3a","3b","3c","3d","3e","3f","40","41","42","43","44","45","46","47","48","49","4a","4b","4c","4d","4e","4f","50","51","52","53","54","55","56","57","58","59","5a","5b","5c","5d","5e","5f","60","61","62","63","64","65","66","67","68","69","6a","6b","6c","6d","6e","6f","70","71","72","73","74","75","76","77","78","79","7a","7b","7c","7d","7e","7f","80","81","82","83","84","85","86","87","88","89","8a","8b","8c","8d","8e","8f","90","91","92","93","94","95","96","97","98","99","9a","9b","9c","9d","9e","9f","a0","a1","a2","a3","a4","a5","a6","a7","a8","a9","aa","ab","ac","ad","ae","af","b0","b1","b2","b3","b4","b5","b6","b7","b8","b9","ba","bb","bc","bd","be","bf","c0","c1","c2","c3","c4","c5","c6","c7","c8","c9","ca","cb","cc","cd","ce","cf","d0","d1","d2","d3","d4","d5","d6","d7","d8","d9","da","db","dc","dd","de","df","e0","e1","e2","e3","e4","e5","e6","e7","e8","e9","ea","eb","ec","ed","ee","ef","f0","f1","f2","f3","f4","f5","f6","f7","f8","f9","fa","fb","fc","fd","fe","ff"],Bu=1234567,rr=Math.PI/180,Is=180/Math.PI;function ri(){let i=Math.random()*4294967295|0,e=Math.random()*4294967295|0,t=Math.random()*4294967295|0,n=Math.random()*4294967295|0;return(Xt[i&255]+Xt[i>>8&255]+Xt[i>>16&255]+Xt[i>>24&255]+"-"+Xt[e&255]+Xt[e>>8&255]+"-"+Xt[e>>16&15|64]+Xt[e>>24&255]+"-"+Xt[t&63|128]+Xt[t>>8&255]+"-"+Xt[t>>16&255]+Xt[t>>24&255]+Xt[n&255]+Xt[n>>8&255]+Xt[n>>16&255]+Xt[n>>24&255]).toLowerCase()}function ke(i,e,t){return Math.max(e,Math.min(t,i))}function fh(i,e){return(i%e+e)%e}function Zp(i,e,t,n,s){return n+(i-e)*(s-n)/(t-e)}function Jp(i,e,t){return i!==e?(t-i)/(e-i):0}function or(i,e,t){return(1-t)*i+t*e}function jp(i,e,t,n){return or(i,e,1-Math.exp(-t*n))}function Qp(i,e=1){return e-Math.abs(fh(i,e*2)-e)}function em(i,e,t){return i<=e?0:i>=t?1:(i=(i-e)/(t-e),i*i*(3-2*i))}function tm(i,e,t){return i<=e?0:i>=t?1:(i=(i-e)/(t-e),i*i*i*(i*(i*6-15)+10))}function nm(i,e){return i+Math.floor(Math.random()*(e-i+1))}function im(i,e){return i+Math.random()*(e-i)}function sm(i){return i*(.5-Math.random())}function rm(i){i!==void 0&&(Bu=i);let e=Bu+=1831565813;return e=Math.imul(e^e>>>15,e|1),e^=e+Math.imul(e^e>>>7,e|61),((e^e>>>14)>>>0)/4294967296}function om(i){return i*rr}function am(i){return i*Is}function lm(i){return(i&i-1)===0&&i!==0}function cm(i){return Math.pow(2,Math.ceil(Math.log(i)/Math.LN2))}function hm(i){return Math.pow(2,Math.floor(Math.log(i)/Math.LN2))}function um(i,e,t,n,s){let r=Math.cos,o=Math.sin,a=r(t/2),l=o(t/2),c=r((e+n)/2),h=o((e+n)/2),d=r((e-n)/2),u=o((e-n)/2),m=r((n-e)/2),p=o((n-e)/2);switch(s){case"XYX":i.set(a*h,l*d,l*u,a*c);break;case"YZY":i.set(l*u,a*h,l*d,a*c);break;case"ZXZ":i.set(l*d,l*u,a*h,a*c);break;case"XZX":i.set(a*h,l*p,l*m,a*c);break;case"YXY":i.set(l*m,a*h,l*p,a*c);break;case"ZYZ":i.set(l*p,l*m,a*h,a*c);break;default:Ae("MathUtils: .setQuaternionFromProperEuler() encountered an unknown order: "+s)}}function Tn(i,e){switch(e.constructor){case Float32Array:return i;case Uint32Array:return i/4294967295;case Uint16Array:return i/65535;case Uint8Array:return i/255;case Int32Array:return Math.max(i/2147483647,-1);case Int16Array:return Math.max(i/32767,-1);case Int8Array:return Math.max(i/127,-1);default:throw new Error("THREE.MathUtils: Invalid component type.")}}function tt(i,e){switch(e.constructor){case Float32Array:return i;case Uint32Array:return Math.round(i*4294967295);case Uint16Array:return Math.round(i*65535);case Uint8Array:return Math.round(i*255);case Int32Array:return Math.round(i*2147483647);case Int16Array:return Math.round(i*32767);case Int8Array:return Math.round(i*127);default:throw new Error("THREE.MathUtils: Invalid component type.")}}var ph={DEG2RAD:rr,RAD2DEG:Is,generateUUID:ri,clamp:ke,euclideanModulo:fh,mapLinear:Zp,inverseLerp:Jp,lerp:or,damp:jp,pingpong:Qp,smoothstep:em,smootherstep:tm,randInt:nm,randFloat:im,randFloatSpread:sm,seededRandom:rm,degToRad:om,radToDeg:am,isPowerOfTwo:lm,ceilPowerOfTwo:cm,floorPowerOfTwo:hm,setQuaternionFromProperEuler:um,normalize:tt,denormalize:Tn},vh=class vh{constructor(e=0,t=0){this.x=e,this.y=t}get width(){return this.x}set width(e){this.x=e}get height(){return this.y}set height(e){this.y=e}set(e,t){return this.x=e,this.y=t,this}setScalar(e){return this.x=e,this.y=e,this}setX(e){return this.x=e,this}setY(e){return this.y=e,this}setComponent(e,t){switch(e){case 0:this.x=t;break;case 1:this.y=t;break;default:throw new Error("THREE.Vector2: index is out of range: "+e)}return this}getComponent(e){switch(e){case 0:return this.x;case 1:return this.y;default:throw new Error("THREE.Vector2: index is out of range: "+e)}}clone(){return new this.constructor(this.x,this.y)}copy(e){return this.x=e.x,this.y=e.y,this}add(e){return this.x+=e.x,this.y+=e.y,this}addScalar(e){return this.x+=e,this.y+=e,this}addVectors(e,t){return this.x=e.x+t.x,this.y=e.y+t.y,this}addScaledVector(e,t){return this.x+=e.x*t,this.y+=e.y*t,this}sub(e){return this.x-=e.x,this.y-=e.y,this}subScalar(e){return this.x-=e,this.y-=e,this}subVectors(e,t){return this.x=e.x-t.x,this.y=e.y-t.y,this}multiply(e){return this.x*=e.x,this.y*=e.y,this}multiplyScalar(e){return this.x*=e,this.y*=e,this}divide(e){return this.x/=e.x,this.y/=e.y,this}divideScalar(e){return this.multiplyScalar(1/e)}applyMatrix3(e){let t=this.x,n=this.y,s=e.elements;return this.x=s[0]*t+s[3]*n+s[6],this.y=s[1]*t+s[4]*n+s[7],this}min(e){return this.x=Math.min(this.x,e.x),this.y=Math.min(this.y,e.y),this}max(e){return this.x=Math.max(this.x,e.x),this.y=Math.max(this.y,e.y),this}clamp(e,t){return this.x=ke(this.x,e.x,t.x),this.y=ke(this.y,e.y,t.y),this}clampScalar(e,t){return this.x=ke(this.x,e,t),this.y=ke(this.y,e,t),this}clampLength(e,t){let n=this.length();return this.divideScalar(n||1).multiplyScalar(ke(n,e,t))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this}negate(){return this.x=-this.x,this.y=-this.y,this}dot(e){return this.x*e.x+this.y*e.y}cross(e){return this.x*e.y-this.y*e.x}lengthSq(){return this.x*this.x+this.y*this.y}length(){return Math.sqrt(this.x*this.x+this.y*this.y)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)}normalize(){return this.divideScalar(this.length()||1)}angle(){return Math.atan2(-this.y,-this.x)+Math.PI}angleTo(e){let t=Math.sqrt(this.lengthSq()*e.lengthSq());if(t===0)return Math.PI/2;let n=this.dot(e)/t;return Math.acos(ke(n,-1,1))}distanceTo(e){return Math.sqrt(this.distanceToSquared(e))}distanceToSquared(e){let t=this.x-e.x,n=this.y-e.y;return t*t+n*n}manhattanDistanceTo(e){return Math.abs(this.x-e.x)+Math.abs(this.y-e.y)}setLength(e){return this.normalize().multiplyScalar(e)}lerp(e,t){return this.x+=(e.x-this.x)*t,this.y+=(e.y-this.y)*t,this}lerpVectors(e,t,n){return this.x=e.x+(t.x-e.x)*n,this.y=e.y+(t.y-e.y)*n,this}equals(e){return e.x===this.x&&e.y===this.y}fromArray(e,t=0){return this.x=e[t],this.y=e[t+1],this}toArray(e=[],t=0){return e[t]=this.x,e[t+1]=this.y,e}fromBufferAttribute(e,t){return this.x=e.getX(t),this.y=e.getY(t),this}rotateAround(e,t){let n=Math.cos(t),s=Math.sin(t),r=this.x-e.x,o=this.y-e.y;return this.x=r*n-o*s+e.x,this.y=r*s+o*n+e.y,this}random(){return this.x=Math.random(),this.y=Math.random(),this}*[Symbol.iterator](){yield this.x,yield this.y}};vh.prototype.isVector2=!0;var Ge=vh,Gn=class{constructor(e=0,t=0,n=0,s=1){this.isQuaternion=!0,this._x=e,this._y=t,this._z=n,this._w=s}static slerpFlat(e,t,n,s,r,o,a){let l=n[s+0],c=n[s+1],h=n[s+2],d=n[s+3],u=r[o+0],m=r[o+1],p=r[o+2],y=r[o+3];if(d!==y||l!==u||c!==m||h!==p){let g=l*u+c*m+h*p+d*y;g<0&&(u=-u,m=-m,p=-p,y=-y,g=-g);let f=1-a;if(g<.9995){let b=Math.acos(g),M=Math.sin(b);f=Math.sin(f*b)/M,a=Math.sin(a*b)/M,l=l*f+u*a,c=c*f+m*a,h=h*f+p*a,d=d*f+y*a}else{l=l*f+u*a,c=c*f+m*a,h=h*f+p*a,d=d*f+y*a;let b=1/Math.sqrt(l*l+c*c+h*h+d*d);l*=b,c*=b,h*=b,d*=b}}e[t]=l,e[t+1]=c,e[t+2]=h,e[t+3]=d}static multiplyQuaternionsFlat(e,t,n,s,r,o){let a=n[s],l=n[s+1],c=n[s+2],h=n[s+3],d=r[o],u=r[o+1],m=r[o+2],p=r[o+3];return e[t]=a*p+h*d+l*m-c*u,e[t+1]=l*p+h*u+c*d-a*m,e[t+2]=c*p+h*m+a*u-l*d,e[t+3]=h*p-a*d-l*u-c*m,e}get x(){return this._x}set x(e){this._x=e,this._onChangeCallback()}get y(){return this._y}set y(e){this._y=e,this._onChangeCallback()}get z(){return this._z}set z(e){this._z=e,this._onChangeCallback()}get w(){return this._w}set w(e){this._w=e,this._onChangeCallback()}set(e,t,n,s){return this._x=e,this._y=t,this._z=n,this._w=s,this._onChangeCallback(),this}clone(){return new this.constructor(this._x,this._y,this._z,this._w)}copy(e){return this._x=e.x,this._y=e.y,this._z=e.z,this._w=e.w,this._onChangeCallback(),this}setFromEuler(e,t=!0){let n=e._x,s=e._y,r=e._z,o=e._order,a=Math.cos,l=Math.sin,c=a(n/2),h=a(s/2),d=a(r/2),u=l(n/2),m=l(s/2),p=l(r/2);switch(o){case"XYZ":this._x=u*h*d+c*m*p,this._y=c*m*d-u*h*p,this._z=c*h*p+u*m*d,this._w=c*h*d-u*m*p;break;case"YXZ":this._x=u*h*d+c*m*p,this._y=c*m*d-u*h*p,this._z=c*h*p-u*m*d,this._w=c*h*d+u*m*p;break;case"ZXY":this._x=u*h*d-c*m*p,this._y=c*m*d+u*h*p,this._z=c*h*p+u*m*d,this._w=c*h*d-u*m*p;break;case"ZYX":this._x=u*h*d-c*m*p,this._y=c*m*d+u*h*p,this._z=c*h*p-u*m*d,this._w=c*h*d+u*m*p;break;case"YZX":this._x=u*h*d+c*m*p,this._y=c*m*d+u*h*p,this._z=c*h*p-u*m*d,this._w=c*h*d-u*m*p;break;case"XZY":this._x=u*h*d-c*m*p,this._y=c*m*d-u*h*p,this._z=c*h*p+u*m*d,this._w=c*h*d+u*m*p;break;default:Ae("Quaternion: .setFromEuler() encountered an unknown order: "+o)}return t===!0&&this._onChangeCallback(),this}setFromAxisAngle(e,t){let n=t/2,s=Math.sin(n);return this._x=e.x*s,this._y=e.y*s,this._z=e.z*s,this._w=Math.cos(n),this._onChangeCallback(),this}setFromRotationMatrix(e){let t=e.elements,n=t[0],s=t[4],r=t[8],o=t[1],a=t[5],l=t[9],c=t[2],h=t[6],d=t[10],u=n+a+d;if(u>0){let m=.5/Math.sqrt(u+1);this._w=.25/m,this._x=(h-l)*m,this._y=(r-c)*m,this._z=(o-s)*m}else if(n>a&&n>d){let m=2*Math.sqrt(1+n-a-d);this._w=(h-l)/m,this._x=.25*m,this._y=(s+o)/m,this._z=(r+c)/m}else if(a>d){let m=2*Math.sqrt(1+a-n-d);this._w=(r-c)/m,this._x=(s+o)/m,this._y=.25*m,this._z=(l+h)/m}else{let m=2*Math.sqrt(1+d-n-a);this._w=(o-s)/m,this._x=(r+c)/m,this._y=(l+h)/m,this._z=.25*m}return this._onChangeCallback(),this}setFromUnitVectors(e,t){let n=e.dot(t)+1;return n<1e-8?(n=0,Math.abs(e.x)>Math.abs(e.z)?(this._x=-e.y,this._y=e.x,this._z=0,this._w=n):(this._x=0,this._y=-e.z,this._z=e.y,this._w=n)):(this._x=e.y*t.z-e.z*t.y,this._y=e.z*t.x-e.x*t.z,this._z=e.x*t.y-e.y*t.x,this._w=n),this.normalize()}angleTo(e){return 2*Math.acos(Math.abs(ke(this.dot(e),-1,1)))}rotateTowards(e,t){let n=this.angleTo(e);if(n===0)return this;let s=Math.min(1,t/n);return this.slerp(e,s),this}identity(){return this.set(0,0,0,1)}invert(){return this.conjugate()}conjugate(){return this._x*=-1,this._y*=-1,this._z*=-1,this._onChangeCallback(),this}dot(e){return this._x*e._x+this._y*e._y+this._z*e._z+this._w*e._w}lengthSq(){return this._x*this._x+this._y*this._y+this._z*this._z+this._w*this._w}length(){return Math.sqrt(this._x*this._x+this._y*this._y+this._z*this._z+this._w*this._w)}normalize(){let e=this.length();return e===0?(this._x=0,this._y=0,this._z=0,this._w=1):(e=1/e,this._x=this._x*e,this._y=this._y*e,this._z=this._z*e,this._w=this._w*e),this._onChangeCallback(),this}multiply(e){return this.multiplyQuaternions(this,e)}premultiply(e){return this.multiplyQuaternions(e,this)}multiplyQuaternions(e,t){let n=e._x,s=e._y,r=e._z,o=e._w,a=t._x,l=t._y,c=t._z,h=t._w;return this._x=n*h+o*a+s*c-r*l,this._y=s*h+o*l+r*a-n*c,this._z=r*h+o*c+n*l-s*a,this._w=o*h-n*a-s*l-r*c,this._onChangeCallback(),this}slerp(e,t){let n=e._x,s=e._y,r=e._z,o=e._w,a=this.dot(e);a<0&&(n=-n,s=-s,r=-r,o=-o,a=-a);let l=1-t;if(a<.9995){let c=Math.acos(a),h=Math.sin(c);l=Math.sin(l*c)/h,t=Math.sin(t*c)/h,this._x=this._x*l+n*t,this._y=this._y*l+s*t,this._z=this._z*l+r*t,this._w=this._w*l+o*t,this._onChangeCallback()}else this._x=this._x*l+n*t,this._y=this._y*l+s*t,this._z=this._z*l+r*t,this._w=this._w*l+o*t,this.normalize();return this}slerpQuaternions(e,t,n){return this.copy(e).slerp(t,n)}random(){let e=2*Math.PI*Math.random(),t=2*Math.PI*Math.random(),n=Math.random(),s=Math.sqrt(1-n),r=Math.sqrt(n);return this.set(s*Math.sin(e),s*Math.cos(e),r*Math.sin(t),r*Math.cos(t))}equals(e){return e._x===this._x&&e._y===this._y&&e._z===this._z&&e._w===this._w}fromArray(e,t=0){return this._x=e[t],this._y=e[t+1],this._z=e[t+2],this._w=e[t+3],this._onChangeCallback(),this}toArray(e=[],t=0){return e[t]=this._x,e[t+1]=this._y,e[t+2]=this._z,e[t+3]=this._w,e}fromBufferAttribute(e,t){return this._x=e.getX(t),this._y=e.getY(t),this._z=e.getZ(t),this._w=e.getW(t),this._onChangeCallback(),this}toJSON(){return this.toArray()}_onChange(e){return this._onChangeCallback=e,this}_onChangeCallback(){}*[Symbol.iterator](){yield this._x,yield this._y,yield this._z,yield this._w}},_h=class _h{constructor(e=0,t=0,n=0){this.x=e,this.y=t,this.z=n}set(e,t,n){return n===void 0&&(n=this.z),this.x=e,this.y=t,this.z=n,this}setScalar(e){return this.x=e,this.y=e,this.z=e,this}setX(e){return this.x=e,this}setY(e){return this.y=e,this}setZ(e){return this.z=e,this}setComponent(e,t){switch(e){case 0:this.x=t;break;case 1:this.y=t;break;case 2:this.z=t;break;default:throw new Error("THREE.Vector3: index is out of range: "+e)}return this}getComponent(e){switch(e){case 0:return this.x;case 1:return this.y;case 2:return this.z;default:throw new Error("THREE.Vector3: index is out of range: "+e)}}clone(){return new this.constructor(this.x,this.y,this.z)}copy(e){return this.x=e.x,this.y=e.y,this.z=e.z,this}add(e){return this.x+=e.x,this.y+=e.y,this.z+=e.z,this}addScalar(e){return this.x+=e,this.y+=e,this.z+=e,this}addVectors(e,t){return this.x=e.x+t.x,this.y=e.y+t.y,this.z=e.z+t.z,this}addScaledVector(e,t){return this.x+=e.x*t,this.y+=e.y*t,this.z+=e.z*t,this}sub(e){return this.x-=e.x,this.y-=e.y,this.z-=e.z,this}subScalar(e){return this.x-=e,this.y-=e,this.z-=e,this}subVectors(e,t){return this.x=e.x-t.x,this.y=e.y-t.y,this.z=e.z-t.z,this}multiply(e){return this.x*=e.x,this.y*=e.y,this.z*=e.z,this}multiplyScalar(e){return this.x*=e,this.y*=e,this.z*=e,this}multiplyVectors(e,t){return this.x=e.x*t.x,this.y=e.y*t.y,this.z=e.z*t.z,this}applyEuler(e){return this.applyQuaternion(zu.setFromEuler(e))}applyAxisAngle(e,t){return this.applyQuaternion(zu.setFromAxisAngle(e,t))}applyMatrix3(e){let t=this.x,n=this.y,s=this.z,r=e.elements;return this.x=r[0]*t+r[3]*n+r[6]*s,this.y=r[1]*t+r[4]*n+r[7]*s,this.z=r[2]*t+r[5]*n+r[8]*s,this}applyNormalMatrix(e){return this.applyMatrix3(e).normalize()}applyMatrix4(e){let t=this.x,n=this.y,s=this.z,r=e.elements,o=1/(r[3]*t+r[7]*n+r[11]*s+r[15]);return this.x=(r[0]*t+r[4]*n+r[8]*s+r[12])*o,this.y=(r[1]*t+r[5]*n+r[9]*s+r[13])*o,this.z=(r[2]*t+r[6]*n+r[10]*s+r[14])*o,this}applyQuaternion(e){let t=this.x,n=this.y,s=this.z,r=e.x,o=e.y,a=e.z,l=e.w,c=2*(o*s-a*n),h=2*(a*t-r*s),d=2*(r*n-o*t);return this.x=t+l*c+o*d-a*h,this.y=n+l*h+a*c-r*d,this.z=s+l*d+r*h-o*c,this}project(e){return this.applyMatrix4(e.matrixWorldInverse).applyMatrix4(e.projectionMatrix)}unproject(e){return this.applyMatrix4(e.projectionMatrixInverse).applyMatrix4(e.matrixWorld)}transformDirection(e){let t=this.x,n=this.y,s=this.z,r=e.elements;return this.x=r[0]*t+r[4]*n+r[8]*s,this.y=r[1]*t+r[5]*n+r[9]*s,this.z=r[2]*t+r[6]*n+r[10]*s,this.normalize()}divide(e){return this.x/=e.x,this.y/=e.y,this.z/=e.z,this}divideScalar(e){return this.multiplyScalar(1/e)}min(e){return this.x=Math.min(this.x,e.x),this.y=Math.min(this.y,e.y),this.z=Math.min(this.z,e.z),this}max(e){return this.x=Math.max(this.x,e.x),this.y=Math.max(this.y,e.y),this.z=Math.max(this.z,e.z),this}clamp(e,t){return this.x=ke(this.x,e.x,t.x),this.y=ke(this.y,e.y,t.y),this.z=ke(this.z,e.z,t.z),this}clampScalar(e,t){return this.x=ke(this.x,e,t),this.y=ke(this.y,e,t),this.z=ke(this.z,e,t),this}clampLength(e,t){let n=this.length();return this.divideScalar(n||1).multiplyScalar(ke(n,e,t))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this.z=Math.floor(this.z),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this.z=Math.ceil(this.z),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this.z=Math.round(this.z),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this.z=Math.trunc(this.z),this}negate(){return this.x=-this.x,this.y=-this.y,this.z=-this.z,this}dot(e){return this.x*e.x+this.y*e.y+this.z*e.z}lengthSq(){return this.x*this.x+this.y*this.y+this.z*this.z}length(){return Math.sqrt(this.x*this.x+this.y*this.y+this.z*this.z)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)+Math.abs(this.z)}normalize(){return this.divideScalar(this.length()||1)}setLength(e){return this.normalize().multiplyScalar(e)}lerp(e,t){return this.x+=(e.x-this.x)*t,this.y+=(e.y-this.y)*t,this.z+=(e.z-this.z)*t,this}lerpVectors(e,t,n){return this.x=e.x+(t.x-e.x)*n,this.y=e.y+(t.y-e.y)*n,this.z=e.z+(t.z-e.z)*n,this}cross(e){return this.crossVectors(this,e)}crossVectors(e,t){let n=e.x,s=e.y,r=e.z,o=t.x,a=t.y,l=t.z;return this.x=s*l-r*a,this.y=r*o-n*l,this.z=n*a-s*o,this}projectOnVector(e){let t=e.lengthSq();if(t===0)return this.set(0,0,0);let n=e.dot(this)/t;return this.copy(e).multiplyScalar(n)}projectOnPlane(e){return dc.copy(this).projectOnVector(e),this.sub(dc)}reflect(e){return this.sub(dc.copy(e).multiplyScalar(2*this.dot(e)))}angleTo(e){let t=Math.sqrt(this.lengthSq()*e.lengthSq());if(t===0)return Math.PI/2;let n=this.dot(e)/t;return Math.acos(ke(n,-1,1))}distanceTo(e){return Math.sqrt(this.distanceToSquared(e))}distanceToSquared(e){let t=this.x-e.x,n=this.y-e.y,s=this.z-e.z;return t*t+n*n+s*s}manhattanDistanceTo(e){return Math.abs(this.x-e.x)+Math.abs(this.y-e.y)+Math.abs(this.z-e.z)}setFromSpherical(e){return this.setFromSphericalCoords(e.radius,e.phi,e.theta)}setFromSphericalCoords(e,t,n){let s=Math.sin(t)*e;return this.x=s*Math.sin(n),this.y=Math.cos(t)*e,this.z=s*Math.cos(n),this}setFromCylindrical(e){return this.setFromCylindricalCoords(e.radius,e.theta,e.y)}setFromCylindricalCoords(e,t,n){return this.x=e*Math.sin(t),this.y=n,this.z=e*Math.cos(t),this}setFromMatrixPosition(e){let t=e.elements;return this.x=t[12],this.y=t[13],this.z=t[14],this}setFromMatrixScale(e){let t=this.setFromMatrixColumn(e,0).length(),n=this.setFromMatrixColumn(e,1).length(),s=this.setFromMatrixColumn(e,2).length();return this.x=t,this.y=n,this.z=s,this}setFromMatrixColumn(e,t){return this.fromArray(e.elements,t*4)}setFromMatrix3Column(e,t){return this.fromArray(e.elements,t*3)}setFromEuler(e){return this.x=e._x,this.y=e._y,this.z=e._z,this}setFromColor(e){return this.x=e.r,this.y=e.g,this.z=e.b,this}equals(e){return e.x===this.x&&e.y===this.y&&e.z===this.z}fromArray(e,t=0){return this.x=e[t],this.y=e[t+1],this.z=e[t+2],this}toArray(e=[],t=0){return e[t]=this.x,e[t+1]=this.y,e[t+2]=this.z,e}fromBufferAttribute(e,t){return this.x=e.getX(t),this.y=e.getY(t),this.z=e.getZ(t),this}random(){return this.x=Math.random(),this.y=Math.random(),this.z=Math.random(),this}randomDirection(){let e=Math.random()*Math.PI*2,t=Math.random()*2-1,n=Math.sqrt(1-t*t);return this.x=n*Math.cos(e),this.y=t,this.z=n*Math.sin(e),this}*[Symbol.iterator](){yield this.x,yield this.y,yield this.z}};_h.prototype.isVector3=!0;var N=_h,dc=new N,zu=new Gn,bh=class bh{constructor(e,t,n,s,r,o,a,l,c){this.elements=[1,0,0,0,1,0,0,0,1],e!==void 0&&this.set(e,t,n,s,r,o,a,l,c)}set(e,t,n,s,r,o,a,l,c){let h=this.elements;return h[0]=e,h[1]=s,h[2]=a,h[3]=t,h[4]=r,h[5]=l,h[6]=n,h[7]=o,h[8]=c,this}identity(){return this.set(1,0,0,0,1,0,0,0,1),this}copy(e){let t=this.elements,n=e.elements;return t[0]=n[0],t[1]=n[1],t[2]=n[2],t[3]=n[3],t[4]=n[4],t[5]=n[5],t[6]=n[6],t[7]=n[7],t[8]=n[8],this}extractBasis(e,t,n){return e.setFromMatrix3Column(this,0),t.setFromMatrix3Column(this,1),n.setFromMatrix3Column(this,2),this}setFromMatrix4(e){let t=e.elements;return this.set(t[0],t[4],t[8],t[1],t[5],t[9],t[2],t[6],t[10]),this}multiply(e){return this.multiplyMatrices(this,e)}premultiply(e){return this.multiplyMatrices(e,this)}multiplyMatrices(e,t){let n=e.elements,s=t.elements,r=this.elements,o=n[0],a=n[3],l=n[6],c=n[1],h=n[4],d=n[7],u=n[2],m=n[5],p=n[8],y=s[0],g=s[3],f=s[6],b=s[1],M=s[4],v=s[7],A=s[2],w=s[5],E=s[8];return r[0]=o*y+a*b+l*A,r[3]=o*g+a*M+l*w,r[6]=o*f+a*v+l*E,r[1]=c*y+h*b+d*A,r[4]=c*g+h*M+d*w,r[7]=c*f+h*v+d*E,r[2]=u*y+m*b+p*A,r[5]=u*g+m*M+p*w,r[8]=u*f+m*v+p*E,this}multiplyScalar(e){let t=this.elements;return t[0]*=e,t[3]*=e,t[6]*=e,t[1]*=e,t[4]*=e,t[7]*=e,t[2]*=e,t[5]*=e,t[8]*=e,this}determinant(){let e=this.elements,t=e[0],n=e[1],s=e[2],r=e[3],o=e[4],a=e[5],l=e[6],c=e[7],h=e[8];return t*o*h-t*a*c-n*r*h+n*a*l+s*r*c-s*o*l}invert(){let e=this.elements,t=e[0],n=e[1],s=e[2],r=e[3],o=e[4],a=e[5],l=e[6],c=e[7],h=e[8],d=h*o-a*c,u=a*l-h*r,m=c*r-o*l,p=t*d+n*u+s*m;if(p===0)return this.set(0,0,0,0,0,0,0,0,0);let y=1/p;return e[0]=d*y,e[1]=(s*c-h*n)*y,e[2]=(a*n-s*o)*y,e[3]=u*y,e[4]=(h*t-s*l)*y,e[5]=(s*r-a*t)*y,e[6]=m*y,e[7]=(n*l-c*t)*y,e[8]=(o*t-n*r)*y,this}transpose(){let e,t=this.elements;return e=t[1],t[1]=t[3],t[3]=e,e=t[2],t[2]=t[6],t[6]=e,e=t[5],t[5]=t[7],t[7]=e,this}getNormalMatrix(e){return this.setFromMatrix4(e).invert().transpose()}transposeIntoArray(e){let t=this.elements;return e[0]=t[0],e[1]=t[3],e[2]=t[6],e[3]=t[1],e[4]=t[4],e[5]=t[7],e[6]=t[2],e[7]=t[5],e[8]=t[8],this}setUvTransform(e,t,n,s,r,o,a){let l=Math.cos(r),c=Math.sin(r);return this.set(n*l,n*c,-n*(l*o+c*a)+o+e,-s*c,s*l,-s*(-c*o+l*a)+a+t,0,0,1),this}scale(e,t){return Ji("Matrix3: .scale() is deprecated. Use .makeScale() instead."),this.premultiply(fc.makeScale(e,t)),this}rotate(e){return Ji("Matrix3: .rotate() is deprecated. Use .makeRotation() instead."),this.premultiply(fc.makeRotation(-e)),this}translate(e,t){return Ji("Matrix3: .translate() is deprecated. Use .makeTranslation() instead."),this.premultiply(fc.makeTranslation(e,t)),this}makeTranslation(e,t){return e.isVector2?this.set(1,0,e.x,0,1,e.y,0,0,1):this.set(1,0,e,0,1,t,0,0,1),this}makeRotation(e){let t=Math.cos(e),n=Math.sin(e);return this.set(t,-n,0,n,t,0,0,0,1),this}makeScale(e,t){return this.set(e,0,0,0,t,0,0,0,1),this}equals(e){let t=this.elements,n=e.elements;for(let s=0;s<9;s++)if(t[s]!==n[s])return!1;return!0}fromArray(e,t=0){for(let n=0;n<9;n++)this.elements[n]=e[n+t];return this}toArray(e=[],t=0){let n=this.elements;return e[t]=n[0],e[t+1]=n[1],e[t+2]=n[2],e[t+3]=n[3],e[t+4]=n[4],e[t+5]=n[5],e[t+6]=n[6],e[t+7]=n[7],e[t+8]=n[8],e}clone(){return new this.constructor().fromArray(this.elements)}};bh.prototype.isMatrix3=!0;var Ue=bh,fc=new Ue,ku=new Ue().set(.4123908,.3575843,.1804808,.212639,.7151687,.0721923,.0193308,.1191948,.9505322),Vu=new Ue().set(3.2409699,-1.5373832,-.4986108,-.9692436,1.8759675,.0415551,.0556301,-.203977,1.0569715);function dm(){let i={enabled:!0,workingColorSpace:lr,spaces:{},convert:function(s,r,o){return this.enabled===!1||r===o||!r||!o||(this.spaces[r].transfer===Qe&&(s.r=oi(s.r),s.g=oi(s.g),s.b=oi(s.b)),this.spaces[r].primaries!==this.spaces[o].primaries&&(s.applyMatrix3(this.spaces[r].toXYZ),s.applyMatrix3(this.spaces[o].fromXYZ)),this.spaces[o].transfer===Qe&&(s.r=Rs(s.r),s.g=Rs(s.g),s.b=Rs(s.b))),s},workingToColorSpace:function(s,r){return this.convert(s,this.workingColorSpace,r)},colorSpaceToWorking:function(s,r){return this.convert(s,r,this.workingColorSpace)},getPrimaries:function(s){return this.spaces[s].primaries},getTransfer:function(s){return s===ci?cr:this.spaces[s].transfer},getToneMappingMode:function(s){return this.spaces[s].outputColorSpaceConfig.toneMappingMode||"standard"},getLuminanceCoefficients:function(s,r=this.workingColorSpace){return s.fromArray(this.spaces[r].luminanceCoefficients)},define:function(s){Object.assign(this.spaces,s)},_getMatrix:function(s,r,o){return s.copy(this.spaces[r].toXYZ).multiply(this.spaces[o].fromXYZ)},_getDrawingBufferColorSpace:function(s){return this.spaces[s].outputColorSpaceConfig.drawingBufferColorSpace},_getUnpackColorSpace:function(s=this.workingColorSpace){return this.spaces[s].workingColorSpaceConfig.unpackColorSpace},fromWorkingColorSpace:function(s,r){return Ji("ColorManagement: .fromWorkingColorSpace() has been renamed to .workingToColorSpace()."),i.workingToColorSpace(s,r)},toWorkingColorSpace:function(s,r){return Ji("ColorManagement: .toWorkingColorSpace() has been renamed to .colorSpaceToWorking()."),i.colorSpaceToWorking(s,r)}},e=[.64,.33,.3,.6,.15,.06],t=[.2126,.7152,.0722],n=[.3127,.329];return i.define({[lr]:{primaries:e,whitePoint:n,transfer:cr,toXYZ:ku,fromXYZ:Vu,luminanceCoefficients:t,workingColorSpaceConfig:{unpackColorSpace:Zt},outputColorSpaceConfig:{drawingBufferColorSpace:Zt}},[Zt]:{primaries:e,whitePoint:n,transfer:Qe,toXYZ:ku,fromXYZ:Vu,luminanceCoefficients:t,outputColorSpaceConfig:{drawingBufferColorSpace:Zt}}}),i}var qe=dm();function oi(i){return i<.04045?i*.0773993808:Math.pow(i*.9478672986+.0521327014,2.4)}function Rs(i){return i<.0031308?i*12.92:1.055*Math.pow(i,.41666)-.055}var ms,ra=class{static getDataURL(e,t="image/png"){if(/^data:/i.test(e.src)||typeof HTMLCanvasElement>"u")return e.src;let n;if(e instanceof HTMLCanvasElement)n=e;else{ms===void 0&&(ms=ur("canvas")),ms.width=e.width,ms.height=e.height;let s=ms.getContext("2d");e instanceof ImageData?s.putImageData(e,0,0):s.drawImage(e,0,0,e.width,e.height),n=ms}return n.toDataURL(t)}static sRGBToLinear(e){if(typeof HTMLImageElement<"u"&&e instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&e instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&e instanceof ImageBitmap){let t=ur("canvas");t.width=e.width,t.height=e.height;let n=t.getContext("2d");n.drawImage(e,0,0,e.width,e.height);let s=n.getImageData(0,0,e.width,e.height),r=s.data;for(let o=0;o<r.length;o++)r[o]=oi(r[o]/255)*255;return n.putImageData(s,0,0),t}else if(e.data){let t=e.data.slice(0);for(let n=0;n<t.length;n++)t instanceof Uint8Array||t instanceof Uint8ClampedArray?t[n]=Math.floor(oi(t[n]/255)*255):t[n]=oi(t[n]);return{data:t,width:e.width,height:e.height}}else return Ae("ImageUtils.sRGBToLinear(): Unsupported image type. No color space conversion applied."),e}},fm=0,Ls=class{constructor(e=null){this.isSource=!0,Object.defineProperty(this,"id",{value:fm++}),this.uuid=ri(),this.data=e,this.dataReady=!0,this.version=0}getSize(e){let t=this.data;return typeof HTMLVideoElement<"u"&&t instanceof HTMLVideoElement?e.set(t.videoWidth,t.videoHeight,0):typeof VideoFrame<"u"&&t instanceof VideoFrame?e.set(t.displayWidth,t.displayHeight,0):t!==null?e.set(t.width,t.height,t.depth||0):e.set(0,0,0),e}set needsUpdate(e){e===!0&&this.version++}toJSON(e){let t=e===void 0||typeof e=="string";if(!t&&e.images[this.uuid]!==void 0)return e.images[this.uuid];let n={uuid:this.uuid,url:""},s=this.data;if(s!==null){let r;if(Array.isArray(s)){r=[];for(let o=0,a=s.length;o<a;o++)s[o].isDataTexture?r.push(pc(s[o].image)):r.push(pc(s[o]))}else r=pc(s);n.url=r}return t||(e.images[this.uuid]=n),n}};function pc(i){return typeof HTMLImageElement<"u"&&i instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&i instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&i instanceof ImageBitmap?ra.getDataURL(i):i.data?{data:Array.from(i.data),width:i.width,height:i.height,type:i.data.constructor.name}:(Ae("Texture: Unable to serialize Texture."),{})}var pm=0,mc=new N,Jt=class i extends Hn{constructor(e=i.DEFAULT_IMAGE,t=i.DEFAULT_MAPPING,n=kn,s=kn,r=zt,o=Ui,a=bn,l=pn,c=i.DEFAULT_ANISOTROPY,h=ci){super(),this.isTexture=!0,Object.defineProperty(this,"id",{value:pm++}),this.uuid=ri(),this.name="",this.source=new Ls(e),this.mipmaps=[],this.mapping=t,this.channel=0,this.wrapS=n,this.wrapT=s,this.magFilter=r,this.minFilter=o,this.anisotropy=c,this.format=a,this.internalFormat=null,this.type=l,this.offset=new Ge(0,0),this.repeat=new Ge(1,1),this.center=new Ge(0,0),this.rotation=0,this.matrixAutoUpdate=!0,this.matrix=new Ue,this.generateMipmaps=!0,this.premultiplyAlpha=!1,this.flipY=!0,this.unpackAlignment=4,this.colorSpace=h,this.userData={},this.updateRanges=[],this.version=0,this.onUpdate=null,this.renderTarget=null,this.isRenderTargetTexture=!1,this.isArrayTexture=!!(e&&e.depth&&e.depth>1),this.pmremVersion=0,this.normalized=!1}get width(){return this.source.getSize(mc).x}get height(){return this.source.getSize(mc).y}get depth(){return this.source.getSize(mc).z}get image(){return this.source.data}set image(e){this.source.data=e}updateMatrix(){this.matrix.setUvTransform(this.offset.x,this.offset.y,this.repeat.x,this.repeat.y,this.rotation,this.center.x,this.center.y)}addUpdateRange(e,t){this.updateRanges.push({start:e,count:t})}clearUpdateRanges(){this.updateRanges.length=0}clone(){return new this.constructor().copy(this)}copy(e){return this.name=e.name,this.source=e.source,this.mipmaps=e.mipmaps.slice(0),this.mapping=e.mapping,this.channel=e.channel,this.wrapS=e.wrapS,this.wrapT=e.wrapT,this.magFilter=e.magFilter,this.minFilter=e.minFilter,this.anisotropy=e.anisotropy,this.format=e.format,this.internalFormat=e.internalFormat,this.type=e.type,this.normalized=e.normalized,this.offset.copy(e.offset),this.repeat.copy(e.repeat),this.center.copy(e.center),this.rotation=e.rotation,this.matrixAutoUpdate=e.matrixAutoUpdate,this.matrix.copy(e.matrix),this.generateMipmaps=e.generateMipmaps,this.premultiplyAlpha=e.premultiplyAlpha,this.flipY=e.flipY,this.unpackAlignment=e.unpackAlignment,this.colorSpace=e.colorSpace,this.renderTarget=e.renderTarget,this.isRenderTargetTexture=e.isRenderTargetTexture,this.isArrayTexture=e.isArrayTexture,this.userData=JSON.parse(JSON.stringify(e.userData)),this.needsUpdate=!0,this}setValues(e){for(let t in e){let n=e[t];if(n===void 0){Ae(`Texture.setValues(): parameter '${t}' has value of undefined.`);continue}let s=this[t];if(s===void 0){Ae(`Texture.setValues(): property '${t}' does not exist.`);continue}s&&n&&s.isVector2&&n.isVector2||s&&n&&s.isVector3&&n.isVector3||s&&n&&s.isMatrix3&&n.isMatrix3?s.copy(n):this[t]=n}}toJSON(e){let t=e===void 0||typeof e=="string";if(!t&&e.textures[this.uuid]!==void 0)return e.textures[this.uuid];let n={metadata:{version:4.7,type:"Texture",generator:"Texture.toJSON"},uuid:this.uuid,name:this.name,image:this.source.toJSON(e).uuid,mapping:this.mapping,channel:this.channel,repeat:[this.repeat.x,this.repeat.y],offset:[this.offset.x,this.offset.y],center:[this.center.x,this.center.y],rotation:this.rotation,wrap:[this.wrapS,this.wrapT],format:this.format,internalFormat:this.internalFormat,type:this.type,normalized:this.normalized,colorSpace:this.colorSpace,minFilter:this.minFilter,magFilter:this.magFilter,anisotropy:this.anisotropy,flipY:this.flipY,generateMipmaps:this.generateMipmaps,premultiplyAlpha:this.premultiplyAlpha,unpackAlignment:this.unpackAlignment};return Object.keys(this.userData).length>0&&(n.userData=this.userData),t||(e.textures[this.uuid]=n),n}dispose(){this.dispatchEvent({type:"dispose"})}transformUv(e){if(this.mapping!==ih)return e;if(e.applyMatrix3(this.matrix),e.x<0||e.x>1)switch(this.wrapS){case ta:e.x=e.x-Math.floor(e.x);break;case kn:e.x=e.x<0?0:1;break;case na:Math.abs(Math.floor(e.x)%2)===1?e.x=Math.ceil(e.x)-e.x:e.x=e.x-Math.floor(e.x);break}if(e.y<0||e.y>1)switch(this.wrapT){case ta:e.y=e.y-Math.floor(e.y);break;case kn:e.y=e.y<0?0:1;break;case na:Math.abs(Math.floor(e.y)%2)===1?e.y=Math.ceil(e.y)-e.y:e.y=e.y-Math.floor(e.y);break}return this.flipY&&(e.y=1-e.y),e}set needsUpdate(e){e===!0&&(this.version++,this.source.needsUpdate=!0)}set needsPMREMUpdate(e){e===!0&&this.pmremVersion++}};Jt.DEFAULT_IMAGE=null;Jt.DEFAULT_MAPPING=ih;Jt.DEFAULT_ANISOTROPY=1;var Mh=class Mh{constructor(e=0,t=0,n=0,s=1){this.x=e,this.y=t,this.z=n,this.w=s}get width(){return this.z}set width(e){this.z=e}get height(){return this.w}set height(e){this.w=e}set(e,t,n,s){return this.x=e,this.y=t,this.z=n,this.w=s,this}setScalar(e){return this.x=e,this.y=e,this.z=e,this.w=e,this}setX(e){return this.x=e,this}setY(e){return this.y=e,this}setZ(e){return this.z=e,this}setW(e){return this.w=e,this}setComponent(e,t){switch(e){case 0:this.x=t;break;case 1:this.y=t;break;case 2:this.z=t;break;case 3:this.w=t;break;default:throw new Error("THREE.Vector4: index is out of range: "+e)}return this}getComponent(e){switch(e){case 0:return this.x;case 1:return this.y;case 2:return this.z;case 3:return this.w;default:throw new Error("THREE.Vector4: index is out of range: "+e)}}clone(){return new this.constructor(this.x,this.y,this.z,this.w)}copy(e){return this.x=e.x,this.y=e.y,this.z=e.z,this.w=e.w!==void 0?e.w:1,this}add(e){return this.x+=e.x,this.y+=e.y,this.z+=e.z,this.w+=e.w,this}addScalar(e){return this.x+=e,this.y+=e,this.z+=e,this.w+=e,this}addVectors(e,t){return this.x=e.x+t.x,this.y=e.y+t.y,this.z=e.z+t.z,this.w=e.w+t.w,this}addScaledVector(e,t){return this.x+=e.x*t,this.y+=e.y*t,this.z+=e.z*t,this.w+=e.w*t,this}sub(e){return this.x-=e.x,this.y-=e.y,this.z-=e.z,this.w-=e.w,this}subScalar(e){return this.x-=e,this.y-=e,this.z-=e,this.w-=e,this}subVectors(e,t){return this.x=e.x-t.x,this.y=e.y-t.y,this.z=e.z-t.z,this.w=e.w-t.w,this}multiply(e){return this.x*=e.x,this.y*=e.y,this.z*=e.z,this.w*=e.w,this}multiplyScalar(e){return this.x*=e,this.y*=e,this.z*=e,this.w*=e,this}applyMatrix4(e){let t=this.x,n=this.y,s=this.z,r=this.w,o=e.elements;return this.x=o[0]*t+o[4]*n+o[8]*s+o[12]*r,this.y=o[1]*t+o[5]*n+o[9]*s+o[13]*r,this.z=o[2]*t+o[6]*n+o[10]*s+o[14]*r,this.w=o[3]*t+o[7]*n+o[11]*s+o[15]*r,this}divide(e){return this.x/=e.x,this.y/=e.y,this.z/=e.z,this.w/=e.w,this}divideScalar(e){return this.multiplyScalar(1/e)}setAxisAngleFromQuaternion(e){this.w=2*Math.acos(e.w);let t=Math.sqrt(1-e.w*e.w);return t<1e-4?(this.x=1,this.y=0,this.z=0):(this.x=e.x/t,this.y=e.y/t,this.z=e.z/t),this}setAxisAngleFromRotationMatrix(e){let t,n,s,r,l=e.elements,c=l[0],h=l[4],d=l[8],u=l[1],m=l[5],p=l[9],y=l[2],g=l[6],f=l[10];if(Math.abs(h-u)<.01&&Math.abs(d-y)<.01&&Math.abs(p-g)<.01){if(Math.abs(h+u)<.1&&Math.abs(d+y)<.1&&Math.abs(p+g)<.1&&Math.abs(c+m+f-3)<.1)return this.set(1,0,0,0),this;t=Math.PI;let M=(c+1)/2,v=(m+1)/2,A=(f+1)/2,w=(h+u)/4,E=(d+y)/4,x=(p+g)/4;return M>v&&M>A?M<.01?(n=0,s=.707106781,r=.707106781):(n=Math.sqrt(M),s=w/n,r=E/n):v>A?v<.01?(n=.707106781,s=0,r=.707106781):(s=Math.sqrt(v),n=w/s,r=x/s):A<.01?(n=.707106781,s=.707106781,r=0):(r=Math.sqrt(A),n=E/r,s=x/r),this.set(n,s,r,t),this}let b=Math.sqrt((g-p)*(g-p)+(d-y)*(d-y)+(u-h)*(u-h));return Math.abs(b)<.001&&(b=1),this.x=(g-p)/b,this.y=(d-y)/b,this.z=(u-h)/b,this.w=Math.acos((c+m+f-1)/2),this}setFromMatrixPosition(e){let t=e.elements;return this.x=t[12],this.y=t[13],this.z=t[14],this.w=t[15],this}min(e){return this.x=Math.min(this.x,e.x),this.y=Math.min(this.y,e.y),this.z=Math.min(this.z,e.z),this.w=Math.min(this.w,e.w),this}max(e){return this.x=Math.max(this.x,e.x),this.y=Math.max(this.y,e.y),this.z=Math.max(this.z,e.z),this.w=Math.max(this.w,e.w),this}clamp(e,t){return this.x=ke(this.x,e.x,t.x),this.y=ke(this.y,e.y,t.y),this.z=ke(this.z,e.z,t.z),this.w=ke(this.w,e.w,t.w),this}clampScalar(e,t){return this.x=ke(this.x,e,t),this.y=ke(this.y,e,t),this.z=ke(this.z,e,t),this.w=ke(this.w,e,t),this}clampLength(e,t){let n=this.length();return this.divideScalar(n||1).multiplyScalar(ke(n,e,t))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this.z=Math.floor(this.z),this.w=Math.floor(this.w),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this.z=Math.ceil(this.z),this.w=Math.ceil(this.w),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this.z=Math.round(this.z),this.w=Math.round(this.w),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this.z=Math.trunc(this.z),this.w=Math.trunc(this.w),this}negate(){return this.x=-this.x,this.y=-this.y,this.z=-this.z,this.w=-this.w,this}dot(e){return this.x*e.x+this.y*e.y+this.z*e.z+this.w*e.w}lengthSq(){return this.x*this.x+this.y*this.y+this.z*this.z+this.w*this.w}length(){return Math.sqrt(this.x*this.x+this.y*this.y+this.z*this.z+this.w*this.w)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)+Math.abs(this.z)+Math.abs(this.w)}normalize(){return this.divideScalar(this.length()||1)}setLength(e){return this.normalize().multiplyScalar(e)}lerp(e,t){return this.x+=(e.x-this.x)*t,this.y+=(e.y-this.y)*t,this.z+=(e.z-this.z)*t,this.w+=(e.w-this.w)*t,this}lerpVectors(e,t,n){return this.x=e.x+(t.x-e.x)*n,this.y=e.y+(t.y-e.y)*n,this.z=e.z+(t.z-e.z)*n,this.w=e.w+(t.w-e.w)*n,this}equals(e){return e.x===this.x&&e.y===this.y&&e.z===this.z&&e.w===this.w}fromArray(e,t=0){return this.x=e[t],this.y=e[t+1],this.z=e[t+2],this.w=e[t+3],this}toArray(e=[],t=0){return e[t]=this.x,e[t+1]=this.y,e[t+2]=this.z,e[t+3]=this.w,e}fromBufferAttribute(e,t){return this.x=e.getX(t),this.y=e.getY(t),this.z=e.getZ(t),this.w=e.getW(t),this}random(){return this.x=Math.random(),this.y=Math.random(),this.z=Math.random(),this.w=Math.random(),this}*[Symbol.iterator](){yield this.x,yield this.y,yield this.z,yield this.w}};Mh.prototype.isVector4=!0;var nt=Mh,oa=class extends Hn{constructor(e=1,t=1,n={}){super(),n=Object.assign({generateMipmaps:!1,internalFormat:null,minFilter:zt,depthBuffer:!0,stencilBuffer:!1,resolveDepthBuffer:!0,resolveStencilBuffer:!0,depthTexture:null,samples:0,count:1,depth:1,multiview:!1,useArrayDepthTexture:!1},n),this.isRenderTarget=!0,this.width=e,this.height=t,this.depth=n.depth,this.scissor=new nt(0,0,e,t),this.scissorTest=!1,this.viewport=new nt(0,0,e,t),this.textures=[];let s={width:e,height:t,depth:n.depth},r=new Jt(s),o=n.count;for(let a=0;a<o;a++)this.textures[a]=r.clone(),this.textures[a].isRenderTargetTexture=!0,this.textures[a].renderTarget=this;this._setTextureOptions(n),this.depthBuffer=n.depthBuffer,this.stencilBuffer=n.stencilBuffer,this.resolveDepthBuffer=n.resolveDepthBuffer,this.resolveStencilBuffer=n.resolveStencilBuffer,this._depthTexture=null,this.depthTexture=n.depthTexture,this.samples=n.samples,this.multiview=n.multiview,this.useArrayDepthTexture=n.useArrayDepthTexture}_setTextureOptions(e={}){let t={minFilter:zt,generateMipmaps:!1,flipY:!1,internalFormat:null};e.mapping!==void 0&&(t.mapping=e.mapping),e.wrapS!==void 0&&(t.wrapS=e.wrapS),e.wrapT!==void 0&&(t.wrapT=e.wrapT),e.wrapR!==void 0&&(t.wrapR=e.wrapR),e.magFilter!==void 0&&(t.magFilter=e.magFilter),e.minFilter!==void 0&&(t.minFilter=e.minFilter),e.format!==void 0&&(t.format=e.format),e.type!==void 0&&(t.type=e.type),e.anisotropy!==void 0&&(t.anisotropy=e.anisotropy),e.colorSpace!==void 0&&(t.colorSpace=e.colorSpace),e.flipY!==void 0&&(t.flipY=e.flipY),e.generateMipmaps!==void 0&&(t.generateMipmaps=e.generateMipmaps),e.internalFormat!==void 0&&(t.internalFormat=e.internalFormat);for(let n=0;n<this.textures.length;n++)this.textures[n].setValues(t)}get texture(){return this.textures[0]}set texture(e){this.textures[0]=e}set depthTexture(e){this._depthTexture!==null&&(this._depthTexture.renderTarget=null),e!==null&&(e.renderTarget=this),this._depthTexture=e}get depthTexture(){return this._depthTexture}setSize(e,t,n=1){if(this.width!==e||this.height!==t||this.depth!==n){this.width=e,this.height=t,this.depth=n;for(let s=0,r=this.textures.length;s<r;s++)this.textures[s].image.width=e,this.textures[s].image.height=t,this.textures[s].image.depth=n,this.textures[s].isData3DTexture!==!0&&(this.textures[s].isArrayTexture=this.textures[s].image.depth>1);this.dispose()}this.viewport.set(0,0,e,t),this.scissor.set(0,0,e,t)}clone(){return new this.constructor().copy(this)}copy(e){this.width=e.width,this.height=e.height,this.depth=e.depth,this.scissor.copy(e.scissor),this.scissorTest=e.scissorTest,this.viewport.copy(e.viewport),this.textures.length=0;for(let t=0,n=e.textures.length;t<n;t++){this.textures[t]=e.textures[t].clone(),this.textures[t].isRenderTargetTexture=!0,this.textures[t].renderTarget=this;let s=Object.assign({},e.textures[t].image);this.textures[t].source=new Ls(s)}return this.depthBuffer=e.depthBuffer,this.stencilBuffer=e.stencilBuffer,this.resolveDepthBuffer=e.resolveDepthBuffer,this.resolveStencilBuffer=e.resolveStencilBuffer,e.depthTexture!==null&&(this.depthTexture=e.depthTexture.clone()),this.samples=e.samples,this.multiview=e.multiview,this.useArrayDepthTexture=e.useArrayDepthTexture,this}dispose(){this.dispatchEvent({type:"dispose"})}},hn=class extends oa{constructor(e=1,t=1,n={}){super(e,t,n),this.isWebGLRenderTarget=!0}},fr=class extends Jt{constructor(e=null,t=1,n=1,s=1){super(null),this.isDataArrayTexture=!0,this.image={data:e,width:t,height:n,depth:s},this.magFilter=Ot,this.minFilter=Ot,this.wrapR=kn,this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1,this.layerUpdates=new Set}addLayerUpdate(e){this.layerUpdates.add(e)}clearLayerUpdates(){this.layerUpdates.clear()}};var aa=class extends Jt{constructor(e=null,t=1,n=1,s=1){super(null),this.isData3DTexture=!0,this.image={data:e,width:t,height:n,depth:s},this.magFilter=Ot,this.minFilter=Ot,this.wrapR=kn,this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1}};var Pa=class Pa{constructor(e,t,n,s,r,o,a,l,c,h,d,u,m,p,y,g){this.elements=[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1],e!==void 0&&this.set(e,t,n,s,r,o,a,l,c,h,d,u,m,p,y,g)}set(e,t,n,s,r,o,a,l,c,h,d,u,m,p,y,g){let f=this.elements;return f[0]=e,f[4]=t,f[8]=n,f[12]=s,f[1]=r,f[5]=o,f[9]=a,f[13]=l,f[2]=c,f[6]=h,f[10]=d,f[14]=u,f[3]=m,f[7]=p,f[11]=y,f[15]=g,this}identity(){return this.set(1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1),this}clone(){return new Pa().fromArray(this.elements)}copy(e){let t=this.elements,n=e.elements;return t[0]=n[0],t[1]=n[1],t[2]=n[2],t[3]=n[3],t[4]=n[4],t[5]=n[5],t[6]=n[6],t[7]=n[7],t[8]=n[8],t[9]=n[9],t[10]=n[10],t[11]=n[11],t[12]=n[12],t[13]=n[13],t[14]=n[14],t[15]=n[15],this}copyPosition(e){let t=this.elements,n=e.elements;return t[12]=n[12],t[13]=n[13],t[14]=n[14],this}setFromMatrix3(e){let t=e.elements;return this.set(t[0],t[3],t[6],0,t[1],t[4],t[7],0,t[2],t[5],t[8],0,0,0,0,1),this}extractBasis(e,t,n){return this.determinantAffine()===0?(e.set(1,0,0),t.set(0,1,0),n.set(0,0,1),this):(e.setFromMatrixColumn(this,0),t.setFromMatrixColumn(this,1),n.setFromMatrixColumn(this,2),this)}makeBasis(e,t,n){return this.set(e.x,t.x,n.x,0,e.y,t.y,n.y,0,e.z,t.z,n.z,0,0,0,0,1),this}extractRotation(e){if(e.determinantAffine()===0)return this.identity();let t=this.elements,n=e.elements,s=1/gs.setFromMatrixColumn(e,0).length(),r=1/gs.setFromMatrixColumn(e,1).length(),o=1/gs.setFromMatrixColumn(e,2).length();return t[0]=n[0]*s,t[1]=n[1]*s,t[2]=n[2]*s,t[3]=0,t[4]=n[4]*r,t[5]=n[5]*r,t[6]=n[6]*r,t[7]=0,t[8]=n[8]*o,t[9]=n[9]*o,t[10]=n[10]*o,t[11]=0,t[12]=0,t[13]=0,t[14]=0,t[15]=1,this}makeRotationFromEuler(e){let t=this.elements,n=e.x,s=e.y,r=e.z,o=Math.cos(n),a=Math.sin(n),l=Math.cos(s),c=Math.sin(s),h=Math.cos(r),d=Math.sin(r);if(e.order==="XYZ"){let u=o*h,m=o*d,p=a*h,y=a*d;t[0]=l*h,t[4]=-l*d,t[8]=c,t[1]=m+p*c,t[5]=u-y*c,t[9]=-a*l,t[2]=y-u*c,t[6]=p+m*c,t[10]=o*l}else if(e.order==="YXZ"){let u=l*h,m=l*d,p=c*h,y=c*d;t[0]=u+y*a,t[4]=p*a-m,t[8]=o*c,t[1]=o*d,t[5]=o*h,t[9]=-a,t[2]=m*a-p,t[6]=y+u*a,t[10]=o*l}else if(e.order==="ZXY"){let u=l*h,m=l*d,p=c*h,y=c*d;t[0]=u-y*a,t[4]=-o*d,t[8]=p+m*a,t[1]=m+p*a,t[5]=o*h,t[9]=y-u*a,t[2]=-o*c,t[6]=a,t[10]=o*l}else if(e.order==="ZYX"){let u=o*h,m=o*d,p=a*h,y=a*d;t[0]=l*h,t[4]=p*c-m,t[8]=u*c+y,t[1]=l*d,t[5]=y*c+u,t[9]=m*c-p,t[2]=-c,t[6]=a*l,t[10]=o*l}else if(e.order==="YZX"){let u=o*l,m=o*c,p=a*l,y=a*c;t[0]=l*h,t[4]=y-u*d,t[8]=p*d+m,t[1]=d,t[5]=o*h,t[9]=-a*h,t[2]=-c*h,t[6]=m*d+p,t[10]=u-y*d}else if(e.order==="XZY"){let u=o*l,m=o*c,p=a*l,y=a*c;t[0]=l*h,t[4]=-d,t[8]=c*h,t[1]=u*d+y,t[5]=o*h,t[9]=m*d-p,t[2]=p*d-m,t[6]=a*h,t[10]=y*d+u}return t[3]=0,t[7]=0,t[11]=0,t[12]=0,t[13]=0,t[14]=0,t[15]=1,this}makeRotationFromQuaternion(e){return this.compose(mm,e,gm)}lookAt(e,t,n){let s=this.elements;return ln.subVectors(e,t),ln.lengthSq()===0&&(ln.z=1),ln.normalize(),_i.crossVectors(n,ln),_i.lengthSq()===0&&(Math.abs(n.z)===1?ln.x+=1e-4:ln.z+=1e-4,ln.normalize(),_i.crossVectors(n,ln)),_i.normalize(),_o.crossVectors(ln,_i),s[0]=_i.x,s[4]=_o.x,s[8]=ln.x,s[1]=_i.y,s[5]=_o.y,s[9]=ln.y,s[2]=_i.z,s[6]=_o.z,s[10]=ln.z,this}multiply(e){return this.multiplyMatrices(this,e)}premultiply(e){return this.multiplyMatrices(e,this)}multiplyMatrices(e,t){let n=e.elements,s=t.elements,r=this.elements,o=n[0],a=n[4],l=n[8],c=n[12],h=n[1],d=n[5],u=n[9],m=n[13],p=n[2],y=n[6],g=n[10],f=n[14],b=n[3],M=n[7],v=n[11],A=n[15],w=s[0],E=s[4],x=s[8],T=s[12],C=s[1],R=s[5],L=s[9],I=s[13],V=s[2],D=s[6],q=s[10],z=s[14],K=s[3],j=s[7],se=s[11],fe=s[15];return r[0]=o*w+a*C+l*V+c*K,r[4]=o*E+a*R+l*D+c*j,r[8]=o*x+a*L+l*q+c*se,r[12]=o*T+a*I+l*z+c*fe,r[1]=h*w+d*C+u*V+m*K,r[5]=h*E+d*R+u*D+m*j,r[9]=h*x+d*L+u*q+m*se,r[13]=h*T+d*I+u*z+m*fe,r[2]=p*w+y*C+g*V+f*K,r[6]=p*E+y*R+g*D+f*j,r[10]=p*x+y*L+g*q+f*se,r[14]=p*T+y*I+g*z+f*fe,r[3]=b*w+M*C+v*V+A*K,r[7]=b*E+M*R+v*D+A*j,r[11]=b*x+M*L+v*q+A*se,r[15]=b*T+M*I+v*z+A*fe,this}multiplyScalar(e){let t=this.elements;return t[0]*=e,t[4]*=e,t[8]*=e,t[12]*=e,t[1]*=e,t[5]*=e,t[9]*=e,t[13]*=e,t[2]*=e,t[6]*=e,t[10]*=e,t[14]*=e,t[3]*=e,t[7]*=e,t[11]*=e,t[15]*=e,this}determinant(){let e=this.elements,t=e[0],n=e[4],s=e[8],r=e[12],o=e[1],a=e[5],l=e[9],c=e[13],h=e[2],d=e[6],u=e[10],m=e[14],p=e[3],y=e[7],g=e[11],f=e[15],b=l*m-c*u,M=a*m-c*d,v=a*u-l*d,A=o*m-c*h,w=o*u-l*h,E=o*d-a*h;return t*(y*b-g*M+f*v)-n*(p*b-g*A+f*w)+s*(p*M-y*A+f*E)-r*(p*v-y*w+g*E)}determinantAffine(){let e=this.elements,t=e[0],n=e[4],s=e[8],r=e[1],o=e[5],a=e[9],l=e[2],c=e[6],h=e[10];return t*(o*h-a*c)-n*(r*h-a*l)+s*(r*c-o*l)}transpose(){let e=this.elements,t;return t=e[1],e[1]=e[4],e[4]=t,t=e[2],e[2]=e[8],e[8]=t,t=e[6],e[6]=e[9],e[9]=t,t=e[3],e[3]=e[12],e[12]=t,t=e[7],e[7]=e[13],e[13]=t,t=e[11],e[11]=e[14],e[14]=t,this}setPosition(e,t,n){let s=this.elements;return e.isVector3?(s[12]=e.x,s[13]=e.y,s[14]=e.z):(s[12]=e,s[13]=t,s[14]=n),this}invert(){let e=this.elements,t=e[0],n=e[1],s=e[2],r=e[3],o=e[4],a=e[5],l=e[6],c=e[7],h=e[8],d=e[9],u=e[10],m=e[11],p=e[12],y=e[13],g=e[14],f=e[15],b=t*a-n*o,M=t*l-s*o,v=t*c-r*o,A=n*l-s*a,w=n*c-r*a,E=s*c-r*l,x=h*y-d*p,T=h*g-u*p,C=h*f-m*p,R=d*g-u*y,L=d*f-m*y,I=u*f-m*g,V=b*I-M*L+v*R+A*C-w*T+E*x;if(V===0)return this.set(0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0);let D=1/V;return e[0]=(a*I-l*L+c*R)*D,e[1]=(s*L-n*I-r*R)*D,e[2]=(y*E-g*w+f*A)*D,e[3]=(u*w-d*E-m*A)*D,e[4]=(l*C-o*I-c*T)*D,e[5]=(t*I-s*C+r*T)*D,e[6]=(g*v-p*E-f*M)*D,e[7]=(h*E-u*v+m*M)*D,e[8]=(o*L-a*C+c*x)*D,e[9]=(n*C-t*L-r*x)*D,e[10]=(p*w-y*v+f*b)*D,e[11]=(d*v-h*w-m*b)*D,e[12]=(a*T-o*R-l*x)*D,e[13]=(t*R-n*T+s*x)*D,e[14]=(y*M-p*A-g*b)*D,e[15]=(h*A-d*M+u*b)*D,this}scale(e){let t=this.elements,n=e.x,s=e.y,r=e.z;return t[0]*=n,t[4]*=s,t[8]*=r,t[1]*=n,t[5]*=s,t[9]*=r,t[2]*=n,t[6]*=s,t[10]*=r,t[3]*=n,t[7]*=s,t[11]*=r,this}getMaxScaleOnAxis(){let e=this.elements,t=e[0]*e[0]+e[1]*e[1]+e[2]*e[2],n=e[4]*e[4]+e[5]*e[5]+e[6]*e[6],s=e[8]*e[8]+e[9]*e[9]+e[10]*e[10];return Math.sqrt(Math.max(t,n,s))}makeTranslation(e,t,n){return e.isVector3?this.set(1,0,0,e.x,0,1,0,e.y,0,0,1,e.z,0,0,0,1):this.set(1,0,0,e,0,1,0,t,0,0,1,n,0,0,0,1),this}makeRotationX(e){let t=Math.cos(e),n=Math.sin(e);return this.set(1,0,0,0,0,t,-n,0,0,n,t,0,0,0,0,1),this}makeRotationY(e){let t=Math.cos(e),n=Math.sin(e);return this.set(t,0,n,0,0,1,0,0,-n,0,t,0,0,0,0,1),this}makeRotationZ(e){let t=Math.cos(e),n=Math.sin(e);return this.set(t,-n,0,0,n,t,0,0,0,0,1,0,0,0,0,1),this}makeRotationAxis(e,t){let n=Math.cos(t),s=Math.sin(t),r=1-n,o=e.x,a=e.y,l=e.z,c=r*o,h=r*a;return this.set(c*o+n,c*a-s*l,c*l+s*a,0,c*a+s*l,h*a+n,h*l-s*o,0,c*l-s*a,h*l+s*o,r*l*l+n,0,0,0,0,1),this}makeScale(e,t,n){return this.set(e,0,0,0,0,t,0,0,0,0,n,0,0,0,0,1),this}makeShear(e,t,n,s,r,o){return this.set(1,n,r,0,e,1,o,0,t,s,1,0,0,0,0,1),this}compose(e,t,n){let s=this.elements,r=t._x,o=t._y,a=t._z,l=t._w,c=r+r,h=o+o,d=a+a,u=r*c,m=r*h,p=r*d,y=o*h,g=o*d,f=a*d,b=l*c,M=l*h,v=l*d,A=n.x,w=n.y,E=n.z;return s[0]=(1-(y+f))*A,s[1]=(m+v)*A,s[2]=(p-M)*A,s[3]=0,s[4]=(m-v)*w,s[5]=(1-(u+f))*w,s[6]=(g+b)*w,s[7]=0,s[8]=(p+M)*E,s[9]=(g-b)*E,s[10]=(1-(u+y))*E,s[11]=0,s[12]=e.x,s[13]=e.y,s[14]=e.z,s[15]=1,this}decompose(e,t,n){let s=this.elements;e.x=s[12],e.y=s[13],e.z=s[14];let r=this.determinantAffine();if(r===0)return n.set(1,1,1),t.identity(),this;let o=gs.set(s[0],s[1],s[2]).length(),a=gs.set(s[4],s[5],s[6]).length(),l=gs.set(s[8],s[9],s[10]).length();r<0&&(o=-o),Sn.copy(this);let c=1/o,h=1/a,d=1/l;return Sn.elements[0]*=c,Sn.elements[1]*=c,Sn.elements[2]*=c,Sn.elements[4]*=h,Sn.elements[5]*=h,Sn.elements[6]*=h,Sn.elements[8]*=d,Sn.elements[9]*=d,Sn.elements[10]*=d,t.setFromRotationMatrix(Sn),n.x=o,n.y=a,n.z=l,this}makePerspective(e,t,n,s,r,o,a=An,l=!1){let c=this.elements,h=2*r/(t-e),d=2*r/(n-s),u=(t+e)/(t-e),m=(n+s)/(n-s),p,y;if(l)p=r/(o-r),y=o*r/(o-r);else if(a===An)p=-(o+r)/(o-r),y=-2*o*r/(o-r);else if(a===hr)p=-o/(o-r),y=-o*r/(o-r);else throw new Error("THREE.Matrix4.makePerspective(): Invalid coordinate system: "+a);return c[0]=h,c[4]=0,c[8]=u,c[12]=0,c[1]=0,c[5]=d,c[9]=m,c[13]=0,c[2]=0,c[6]=0,c[10]=p,c[14]=y,c[3]=0,c[7]=0,c[11]=-1,c[15]=0,this}makeOrthographic(e,t,n,s,r,o,a=An,l=!1){let c=this.elements,h=2/(t-e),d=2/(n-s),u=-(t+e)/(t-e),m=-(n+s)/(n-s),p,y;if(l)p=1/(o-r),y=o/(o-r);else if(a===An)p=-2/(o-r),y=-(o+r)/(o-r);else if(a===hr)p=-1/(o-r),y=-r/(o-r);else throw new Error("THREE.Matrix4.makeOrthographic(): Invalid coordinate system: "+a);return c[0]=h,c[4]=0,c[8]=0,c[12]=u,c[1]=0,c[5]=d,c[9]=0,c[13]=m,c[2]=0,c[6]=0,c[10]=p,c[14]=y,c[3]=0,c[7]=0,c[11]=0,c[15]=1,this}equals(e){let t=this.elements,n=e.elements;for(let s=0;s<16;s++)if(t[s]!==n[s])return!1;return!0}fromArray(e,t=0){for(let n=0;n<16;n++)this.elements[n]=e[n+t];return this}toArray(e=[],t=0){let n=this.elements;return e[t]=n[0],e[t+1]=n[1],e[t+2]=n[2],e[t+3]=n[3],e[t+4]=n[4],e[t+5]=n[5],e[t+6]=n[6],e[t+7]=n[7],e[t+8]=n[8],e[t+9]=n[9],e[t+10]=n[10],e[t+11]=n[11],e[t+12]=n[12],e[t+13]=n[13],e[t+14]=n[14],e[t+15]=n[15],e}};Pa.prototype.isMatrix4=!0;var at=Pa,gs=new N,Sn=new at,mm=new N(0,0,0),gm=new N(1,1,1),_i=new N,_o=new N,ln=new N,Hu=new at,Gu=new Gn,Pi=class i{constructor(e=0,t=0,n=0,s=i.DEFAULT_ORDER){this.isEuler=!0,this._x=e,this._y=t,this._z=n,this._order=s}get x(){return this._x}set x(e){this._x=e,this._onChangeCallback()}get y(){return this._y}set y(e){this._y=e,this._onChangeCallback()}get z(){return this._z}set z(e){this._z=e,this._onChangeCallback()}get order(){return this._order}set order(e){this._order=e,this._onChangeCallback()}set(e,t,n,s=this._order){return this._x=e,this._y=t,this._z=n,this._order=s,this._onChangeCallback(),this}clone(){return new this.constructor(this._x,this._y,this._z,this._order)}copy(e){return this._x=e._x,this._y=e._y,this._z=e._z,this._order=e._order,this._onChangeCallback(),this}setFromRotationMatrix(e,t=this._order,n=!0){let s=e.elements,r=s[0],o=s[4],a=s[8],l=s[1],c=s[5],h=s[9],d=s[2],u=s[6],m=s[10];switch(t){case"XYZ":this._y=Math.asin(ke(a,-1,1)),Math.abs(a)<.9999999?(this._x=Math.atan2(-h,m),this._z=Math.atan2(-o,r)):(this._x=Math.atan2(u,c),this._z=0);break;case"YXZ":this._x=Math.asin(-ke(h,-1,1)),Math.abs(h)<.9999999?(this._y=Math.atan2(a,m),this._z=Math.atan2(l,c)):(this._y=Math.atan2(-d,r),this._z=0);break;case"ZXY":this._x=Math.asin(ke(u,-1,1)),Math.abs(u)<.9999999?(this._y=Math.atan2(-d,m),this._z=Math.atan2(-o,c)):(this._y=0,this._z=Math.atan2(l,r));break;case"ZYX":this._y=Math.asin(-ke(d,-1,1)),Math.abs(d)<.9999999?(this._x=Math.atan2(u,m),this._z=Math.atan2(l,r)):(this._x=0,this._z=Math.atan2(-o,c));break;case"YZX":this._z=Math.asin(ke(l,-1,1)),Math.abs(l)<.9999999?(this._x=Math.atan2(-h,c),this._y=Math.atan2(-d,r)):(this._x=0,this._y=Math.atan2(a,m));break;case"XZY":this._z=Math.asin(-ke(o,-1,1)),Math.abs(o)<.9999999?(this._x=Math.atan2(u,c),this._y=Math.atan2(a,r)):(this._x=Math.atan2(-h,m),this._y=0);break;default:Ae("Euler: .setFromRotationMatrix() encountered an unknown order: "+t)}return this._order=t,n===!0&&this._onChangeCallback(),this}setFromQuaternion(e,t,n){return Hu.makeRotationFromQuaternion(e),this.setFromRotationMatrix(Hu,t,n)}setFromVector3(e,t=this._order){return this.set(e.x,e.y,e.z,t)}reorder(e){return Gu.setFromEuler(this),this.setFromQuaternion(Gu,e)}equals(e){return e._x===this._x&&e._y===this._y&&e._z===this._z&&e._order===this._order}fromArray(e){return this._x=e[0],this._y=e[1],this._z=e[2],e[3]!==void 0&&(this._order=e[3]),this._onChangeCallback(),this}toArray(e=[],t=0){return e[t]=this._x,e[t+1]=this._y,e[t+2]=this._z,e[t+3]=this._order,e}_onChange(e){return this._onChangeCallback=e,this}_onChangeCallback(){}*[Symbol.iterator](){yield this._x,yield this._y,yield this._z,yield this._order}};Pi.DEFAULT_ORDER="XYZ";var pr=class{constructor(){this.mask=1}set(e){this.mask=(1<<e|0)>>>0}enable(e){this.mask|=1<<e|0}enableAll(){this.mask=-1}toggle(e){this.mask^=1<<e|0}disable(e){this.mask&=~(1<<e|0)}disableAll(){this.mask=0}test(e){return(this.mask&e.mask)!==0}isEnabled(e){return(this.mask&(1<<e|0))!==0}},xm=0,Wu=new N,xs=new Gn,Qn=new at,bo=new N,Qs=new N,ym=new N,vm=new Gn,Xu=new N(1,0,0),qu=new N(0,1,0),Yu=new N(0,0,1),$u={type:"added"},_m={type:"removed"},ys={type:"childadded",child:null},gc={type:"childremoved",child:null},un=class i extends Hn{constructor(){super(),this.isObject3D=!0,Object.defineProperty(this,"id",{value:xm++}),this.uuid=ri(),this.name="",this.type="Object3D",this.parent=null,this.children=[],this.up=i.DEFAULT_UP.clone();let e=new N,t=new Pi,n=new Gn,s=new N(1,1,1);function r(){n.setFromEuler(t,!1)}function o(){t.setFromQuaternion(n,void 0,!1)}t._onChange(r),n._onChange(o),Object.defineProperties(this,{position:{configurable:!0,enumerable:!0,value:e},rotation:{configurable:!0,enumerable:!0,value:t},quaternion:{configurable:!0,enumerable:!0,value:n},scale:{configurable:!0,enumerable:!0,value:s},modelViewMatrix:{value:new at},normalMatrix:{value:new Ue}}),this.matrix=new at,this.matrixWorld=new at,this.matrixAutoUpdate=i.DEFAULT_MATRIX_AUTO_UPDATE,this.matrixWorldAutoUpdate=i.DEFAULT_MATRIX_WORLD_AUTO_UPDATE,this.matrixWorldNeedsUpdate=!1,this.layers=new pr,this.visible=!0,this.castShadow=!1,this.receiveShadow=!1,this.frustumCulled=!0,this.renderOrder=0,this.animations=[],this.customDepthMaterial=void 0,this.customDistanceMaterial=void 0,this.static=!1,this.userData={},this.pivot=null}onBeforeShadow(){}onAfterShadow(){}onBeforeRender(){}onAfterRender(){}applyMatrix4(e){this.matrixAutoUpdate&&this.updateMatrix(),this.matrix.premultiply(e),this.matrix.decompose(this.position,this.quaternion,this.scale)}applyQuaternion(e){return this.quaternion.premultiply(e),this}setRotationFromAxisAngle(e,t){this.quaternion.setFromAxisAngle(e,t)}setRotationFromEuler(e){this.quaternion.setFromEuler(e,!0)}setRotationFromMatrix(e){this.quaternion.setFromRotationMatrix(e)}setRotationFromQuaternion(e){this.quaternion.copy(e)}rotateOnAxis(e,t){return xs.setFromAxisAngle(e,t),this.quaternion.multiply(xs),this}rotateOnWorldAxis(e,t){return xs.setFromAxisAngle(e,t),this.quaternion.premultiply(xs),this}rotateX(e){return this.rotateOnAxis(Xu,e)}rotateY(e){return this.rotateOnAxis(qu,e)}rotateZ(e){return this.rotateOnAxis(Yu,e)}translateOnAxis(e,t){return Wu.copy(e).applyQuaternion(this.quaternion),this.position.add(Wu.multiplyScalar(t)),this}translateX(e){return this.translateOnAxis(Xu,e)}translateY(e){return this.translateOnAxis(qu,e)}translateZ(e){return this.translateOnAxis(Yu,e)}localToWorld(e){return this.updateWorldMatrix(!0,!1),e.applyMatrix4(this.matrixWorld)}worldToLocal(e){return this.updateWorldMatrix(!0,!1),e.applyMatrix4(Qn.copy(this.matrixWorld).invert())}lookAt(e,t,n){e.isVector3?bo.copy(e):bo.set(e,t,n);let s=this.parent;this.updateWorldMatrix(!0,!1),Qs.setFromMatrixPosition(this.matrixWorld),this.isCamera||this.isLight?Qn.lookAt(Qs,bo,this.up):Qn.lookAt(bo,Qs,this.up),this.quaternion.setFromRotationMatrix(Qn),s&&(Qn.extractRotation(s.matrixWorld),xs.setFromRotationMatrix(Qn),this.quaternion.premultiply(xs.invert()))}add(e){if(arguments.length>1){for(let t=0;t<arguments.length;t++)this.add(arguments[t]);return this}return e===this?(Le("Object3D.add: object can't be added as a child of itself.",e),this):(e&&e.isObject3D?(e.removeFromParent(),e.parent=this,this.children.push(e),e.dispatchEvent($u),ys.child=e,this.dispatchEvent(ys),ys.child=null):Le("Object3D.add: object not an instance of THREE.Object3D.",e),this)}remove(e){if(arguments.length>1){for(let n=0;n<arguments.length;n++)this.remove(arguments[n]);return this}let t=this.children.indexOf(e);return t!==-1&&(e.parent=null,this.children.splice(t,1),e.dispatchEvent(_m),gc.child=e,this.dispatchEvent(gc),gc.child=null),this}removeFromParent(){let e=this.parent;return e!==null&&e.remove(this),this}clear(){return this.remove(...this.children)}attach(e){return this.updateWorldMatrix(!0,!1),Qn.copy(this.matrixWorld).invert(),e.parent!==null&&(e.parent.updateWorldMatrix(!0,!1),Qn.multiply(e.parent.matrixWorld)),e.applyMatrix4(Qn),e.removeFromParent(),e.parent=this,this.children.push(e),e.updateWorldMatrix(!1,!0),e.dispatchEvent($u),ys.child=e,this.dispatchEvent(ys),ys.child=null,this}getObjectById(e){return this.getObjectByProperty("id",e)}getObjectByName(e){return this.getObjectByProperty("name",e)}getObjectByProperty(e,t){if(this[e]===t)return this;for(let n=0,s=this.children.length;n<s;n++){let o=this.children[n].getObjectByProperty(e,t);if(o!==void 0)return o}}getObjectsByProperty(e,t,n=[]){this[e]===t&&n.push(this);let s=this.children;for(let r=0,o=s.length;r<o;r++)s[r].getObjectsByProperty(e,t,n);return n}getWorldPosition(e){return this.updateWorldMatrix(!0,!1),e.setFromMatrixPosition(this.matrixWorld)}getWorldQuaternion(e){return this.updateWorldMatrix(!0,!1),this.matrixWorld.decompose(Qs,e,ym),e}getWorldScale(e){return this.updateWorldMatrix(!0,!1),this.matrixWorld.decompose(Qs,vm,e),e}getWorldDirection(e){this.updateWorldMatrix(!0,!1);let t=this.matrixWorld.elements;return e.set(t[8],t[9],t[10]).normalize()}raycast(){}traverse(e){e(this);let t=this.children;for(let n=0,s=t.length;n<s;n++)t[n].traverse(e)}traverseVisible(e){if(this.visible===!1)return;e(this);let t=this.children;for(let n=0,s=t.length;n<s;n++)t[n].traverseVisible(e)}traverseAncestors(e){let t=this.parent;t!==null&&(e(t),t.traverseAncestors(e))}updateMatrix(){this.matrix.compose(this.position,this.quaternion,this.scale);let e=this.pivot;if(e!==null){let t=e.x,n=e.y,s=e.z,r=this.matrix.elements;r[12]+=t-r[0]*t-r[4]*n-r[8]*s,r[13]+=n-r[1]*t-r[5]*n-r[9]*s,r[14]+=s-r[2]*t-r[6]*n-r[10]*s}this.matrixWorldNeedsUpdate=!0}updateMatrixWorld(e){this.matrixAutoUpdate&&this.updateMatrix(),(this.matrixWorldNeedsUpdate||e)&&(this.matrixWorldAutoUpdate===!0&&(this.parent===null?this.matrixWorld.copy(this.matrix):this.matrixWorld.multiplyMatrices(this.parent.matrixWorld,this.matrix)),this.matrixWorldNeedsUpdate=!1,e=!0);let t=this.children;for(let n=0,s=t.length;n<s;n++)t[n].updateMatrixWorld(e)}updateWorldMatrix(e,t,n=!1){let s=this.parent;if(e===!0&&s!==null&&s.updateWorldMatrix(!0,!1),this.matrixAutoUpdate&&this.updateMatrix(),(this.matrixWorldNeedsUpdate||n)&&(this.matrixWorldAutoUpdate===!0&&(this.parent===null?this.matrixWorld.copy(this.matrix):this.matrixWorld.multiplyMatrices(this.parent.matrixWorld,this.matrix)),this.matrixWorldNeedsUpdate=!1,n=!0),t===!0){let r=this.children;for(let o=0,a=r.length;o<a;o++)r[o].updateWorldMatrix(!1,!0,n)}}toJSON(e){let t=e===void 0||typeof e=="string",n={};t&&(e={geometries:{},materials:{},textures:{},images:{},shapes:{},skeletons:{},animations:{},nodes:{}},n.metadata={version:4.7,type:"Object",generator:"Object3D.toJSON"});let s={};s.uuid=this.uuid,s.type=this.type,this.name!==""&&(s.name=this.name),this.castShadow===!0&&(s.castShadow=!0),this.receiveShadow===!0&&(s.receiveShadow=!0),this.visible===!1&&(s.visible=!1),this.frustumCulled===!1&&(s.frustumCulled=!1),this.renderOrder!==0&&(s.renderOrder=this.renderOrder),this.static!==!1&&(s.static=this.static),Object.keys(this.userData).length>0&&(s.userData=this.userData),s.layers=this.layers.mask,s.matrix=this.matrix.toArray(),s.up=this.up.toArray(),this.pivot!==null&&(s.pivot=this.pivot.toArray()),this.matrixAutoUpdate===!1&&(s.matrixAutoUpdate=!1),this.morphTargetDictionary!==void 0&&(s.morphTargetDictionary=Object.assign({},this.morphTargetDictionary)),this.morphTargetInfluences!==void 0&&(s.morphTargetInfluences=this.morphTargetInfluences.slice()),this.isInstancedMesh&&(s.type="InstancedMesh",s.count=this.count,s.instanceMatrix=this.instanceMatrix.toJSON(),this.instanceColor!==null&&(s.instanceColor=this.instanceColor.toJSON())),this.isBatchedMesh&&(s.type="BatchedMesh",s.perObjectFrustumCulled=this.perObjectFrustumCulled,s.sortObjects=this.sortObjects,s.drawRanges=this._drawRanges,s.reservedRanges=this._reservedRanges,s.geometryInfo=this._geometryInfo.map(a=>({...a,boundingBox:a.boundingBox?a.boundingBox.toJSON():void 0,boundingSphere:a.boundingSphere?a.boundingSphere.toJSON():void 0})),s.instanceInfo=this._instanceInfo.map(a=>({...a})),s.availableInstanceIds=this._availableInstanceIds.slice(),s.availableGeometryIds=this._availableGeometryIds.slice(),s.nextIndexStart=this._nextIndexStart,s.nextVertexStart=this._nextVertexStart,s.geometryCount=this._geometryCount,s.maxInstanceCount=this._maxInstanceCount,s.maxVertexCount=this._maxVertexCount,s.maxIndexCount=this._maxIndexCount,s.geometryInitialized=this._geometryInitialized,s.matricesTexture=this._matricesTexture.toJSON(e),s.indirectTexture=this._indirectTexture.toJSON(e),this._colorsTexture!==null&&(s.colorsTexture=this._colorsTexture.toJSON(e)),this.boundingSphere!==null&&(s.boundingSphere=this.boundingSphere.toJSON()),this.boundingBox!==null&&(s.boundingBox=this.boundingBox.toJSON()));function r(a,l){return a[l.uuid]===void 0&&(a[l.uuid]=l.toJSON(e)),l.uuid}if(this.isScene)this.background&&(this.background.isColor?s.background=this.background.toJSON():this.background.isTexture&&(s.background=this.background.toJSON(e).uuid)),this.environment&&this.environment.isTexture&&this.environment.isRenderTargetTexture!==!0&&(s.environment=this.environment.toJSON(e).uuid);else if(this.isMesh||this.isLine||this.isPoints){s.geometry=r(e.geometries,this.geometry);let a=this.geometry.parameters;if(a!==void 0&&a.shapes!==void 0){let l=a.shapes;if(Array.isArray(l))for(let c=0,h=l.length;c<h;c++){let d=l[c];r(e.shapes,d)}else r(e.shapes,l)}}if(this.isSkinnedMesh&&(s.bindMode=this.bindMode,s.bindMatrix=this.bindMatrix.toArray(),this.skeleton!==void 0&&(r(e.skeletons,this.skeleton),s.skeleton=this.skeleton.uuid)),this.material!==void 0)if(Array.isArray(this.material)){let a=[];for(let l=0,c=this.material.length;l<c;l++)a.push(r(e.materials,this.material[l]));s.material=a}else s.material=r(e.materials,this.material);if(this.children.length>0){s.children=[];for(let a=0;a<this.children.length;a++)s.children.push(this.children[a].toJSON(e).object)}if(this.animations.length>0){s.animations=[];for(let a=0;a<this.animations.length;a++){let l=this.animations[a];s.animations.push(r(e.animations,l))}}if(t){let a=o(e.geometries),l=o(e.materials),c=o(e.textures),h=o(e.images),d=o(e.shapes),u=o(e.skeletons),m=o(e.animations),p=o(e.nodes);a.length>0&&(n.geometries=a),l.length>0&&(n.materials=l),c.length>0&&(n.textures=c),h.length>0&&(n.images=h),d.length>0&&(n.shapes=d),u.length>0&&(n.skeletons=u),m.length>0&&(n.animations=m),p.length>0&&(n.nodes=p)}return n.object=s,n;function o(a){let l=[];for(let c in a){let h=a[c];delete h.metadata,l.push(h)}return l}}clone(e){return new this.constructor().copy(this,e)}copy(e,t=!0){if(this.name=e.name,this.up.copy(e.up),this.position.copy(e.position),this.rotation.order=e.rotation.order,this.quaternion.copy(e.quaternion),this.scale.copy(e.scale),this.pivot=e.pivot!==null?e.pivot.clone():null,this.matrix.copy(e.matrix),this.matrixWorld.copy(e.matrixWorld),this.matrixAutoUpdate=e.matrixAutoUpdate,this.matrixWorldAutoUpdate=e.matrixWorldAutoUpdate,this.matrixWorldNeedsUpdate=e.matrixWorldNeedsUpdate,this.layers.mask=e.layers.mask,this.visible=e.visible,this.castShadow=e.castShadow,this.receiveShadow=e.receiveShadow,this.frustumCulled=e.frustumCulled,this.renderOrder=e.renderOrder,this.static=e.static,this.animations=e.animations.slice(),this.userData=JSON.parse(JSON.stringify(e.userData)),t===!0)for(let n=0;n<e.children.length;n++){let s=e.children[n];this.add(s.clone())}return this}};un.DEFAULT_UP=new N(0,1,0);un.DEFAULT_MATRIX_AUTO_UPDATE=!0;un.DEFAULT_MATRIX_WORLD_AUTO_UPDATE=!0;var si=class extends un{constructor(){super(),this.isGroup=!0,this.type="Group"}},bm={type:"move"},Ds=class{constructor(){this._targetRay=null,this._grip=null,this._hand=null}getHandSpace(){return this._hand===null&&(this._hand=new si,this._hand.matrixAutoUpdate=!1,this._hand.visible=!1,this._hand.joints={},this._hand.inputState={pinching:!1}),this._hand}getTargetRaySpace(){return this._targetRay===null&&(this._targetRay=new si,this._targetRay.matrixAutoUpdate=!1,this._targetRay.visible=!1,this._targetRay.hasLinearVelocity=!1,this._targetRay.linearVelocity=new N,this._targetRay.hasAngularVelocity=!1,this._targetRay.angularVelocity=new N),this._targetRay}getGripSpace(){return this._grip===null&&(this._grip=new si,this._grip.matrixAutoUpdate=!1,this._grip.visible=!1,this._grip.hasLinearVelocity=!1,this._grip.linearVelocity=new N,this._grip.hasAngularVelocity=!1,this._grip.angularVelocity=new N,this._grip.eventsEnabled=!1),this._grip}dispatchEvent(e){return this._targetRay!==null&&this._targetRay.dispatchEvent(e),this._grip!==null&&this._grip.dispatchEvent(e),this._hand!==null&&this._hand.dispatchEvent(e),this}connect(e){if(e&&e.hand){let t=this._hand;if(t)for(let n of e.hand.values())this._getHandJoint(t,n)}return this.dispatchEvent({type:"connected",data:e}),this}disconnect(e){return this.dispatchEvent({type:"disconnected",data:e}),this._targetRay!==null&&(this._targetRay.visible=!1),this._grip!==null&&(this._grip.visible=!1),this._hand!==null&&(this._hand.visible=!1),this}update(e,t,n){let s=null,r=null,o=null,a=this._targetRay,l=this._grip,c=this._hand;if(e&&t.session.visibilityState!=="visible-blurred"){if(c&&e.hand){o=!0;for(let y of e.hand.values()){let g=t.getJointPose(y,n),f=this._getHandJoint(c,y);g!==null&&(f.matrix.fromArray(g.transform.matrix),f.matrix.decompose(f.position,f.rotation,f.scale),f.matrixWorldNeedsUpdate=!0,f.jointRadius=g.radius),f.visible=g!==null}let h=c.joints["index-finger-tip"],d=c.joints["thumb-tip"],u=h.position.distanceTo(d.position),m=.02,p=.005;c.inputState.pinching&&u>m+p?(c.inputState.pinching=!1,this.dispatchEvent({type:"pinchend",handedness:e.handedness,target:this})):!c.inputState.pinching&&u<=m-p&&(c.inputState.pinching=!0,this.dispatchEvent({type:"pinchstart",handedness:e.handedness,target:this}))}else l!==null&&e.gripSpace&&(r=t.getPose(e.gripSpace,n),r!==null&&(l.matrix.fromArray(r.transform.matrix),l.matrix.decompose(l.position,l.rotation,l.scale),l.matrixWorldNeedsUpdate=!0,r.linearVelocity?(l.hasLinearVelocity=!0,l.linearVelocity.copy(r.linearVelocity)):l.hasLinearVelocity=!1,r.angularVelocity?(l.hasAngularVelocity=!0,l.angularVelocity.copy(r.angularVelocity)):l.hasAngularVelocity=!1,l.eventsEnabled&&l.dispatchEvent({type:"gripUpdated",data:e,target:this})));a!==null&&(s=t.getPose(e.targetRaySpace,n),s===null&&r!==null&&(s=r),s!==null&&(a.matrix.fromArray(s.transform.matrix),a.matrix.decompose(a.position,a.rotation,a.scale),a.matrixWorldNeedsUpdate=!0,s.linearVelocity?(a.hasLinearVelocity=!0,a.linearVelocity.copy(s.linearVelocity)):a.hasLinearVelocity=!1,s.angularVelocity?(a.hasAngularVelocity=!0,a.angularVelocity.copy(s.angularVelocity)):a.hasAngularVelocity=!1,this.dispatchEvent(bm)))}return a!==null&&(a.visible=s!==null),l!==null&&(l.visible=r!==null),c!==null&&(c.visible=o!==null),this}_getHandJoint(e,t){if(e.joints[t.jointName]===void 0){let n=new si;n.matrixAutoUpdate=!1,n.visible=!1,e.joints[t.jointName]=n,e.add(n)}return e.joints[t.jointName]}},Xd={aliceblue:15792383,antiquewhite:16444375,aqua:65535,aquamarine:8388564,azure:15794175,beige:16119260,bisque:16770244,black:0,blanchedalmond:16772045,blue:255,blueviolet:9055202,brown:10824234,burlywood:14596231,cadetblue:6266528,chartreuse:8388352,chocolate:13789470,coral:16744272,cornflowerblue:6591981,cornsilk:16775388,crimson:14423100,cyan:65535,darkblue:139,darkcyan:35723,darkgoldenrod:12092939,darkgray:11119017,darkgreen:25600,darkgrey:11119017,darkkhaki:12433259,darkmagenta:9109643,darkolivegreen:5597999,darkorange:16747520,darkorchid:10040012,darkred:9109504,darksalmon:15308410,darkseagreen:9419919,darkslateblue:4734347,darkslategray:3100495,darkslategrey:3100495,darkturquoise:52945,darkviolet:9699539,deeppink:16716947,deepskyblue:49151,dimgray:6908265,dimgrey:6908265,dodgerblue:2003199,firebrick:11674146,floralwhite:16775920,forestgreen:2263842,fuchsia:16711935,gainsboro:14474460,ghostwhite:16316671,gold:16766720,goldenrod:14329120,gray:8421504,green:32768,greenyellow:11403055,grey:8421504,honeydew:15794160,hotpink:16738740,indianred:13458524,indigo:4915330,ivory:16777200,khaki:15787660,lavender:15132410,lavenderblush:16773365,lawngreen:8190976,lemonchiffon:16775885,lightblue:11393254,lightcoral:15761536,lightcyan:14745599,lightgoldenrodyellow:16448210,lightgray:13882323,lightgreen:9498256,lightgrey:13882323,lightpink:16758465,lightsalmon:16752762,lightseagreen:2142890,lightskyblue:8900346,lightslategray:7833753,lightslategrey:7833753,lightsteelblue:11584734,lightyellow:16777184,lime:65280,limegreen:3329330,linen:16445670,magenta:16711935,maroon:8388608,mediumaquamarine:6737322,mediumblue:205,mediumorchid:12211667,mediumpurple:9662683,mediumseagreen:3978097,mediumslateblue:8087790,mediumspringgreen:64154,mediumturquoise:4772300,mediumvioletred:13047173,midnightblue:1644912,mintcream:16121850,mistyrose:16770273,moccasin:16770229,navajowhite:16768685,navy:128,oldlace:16643558,olive:8421376,olivedrab:7048739,orange:16753920,orangered:16729344,orchid:14315734,palegoldenrod:15657130,palegreen:10025880,paleturquoise:11529966,palevioletred:14381203,papayawhip:16773077,peachpuff:16767673,peru:13468991,pink:16761035,plum:14524637,powderblue:11591910,purple:8388736,rebeccapurple:6697881,red:16711680,rosybrown:12357519,royalblue:4286945,saddlebrown:9127187,salmon:16416882,sandybrown:16032864,seagreen:3050327,seashell:16774638,sienna:10506797,silver:12632256,skyblue:8900331,slateblue:6970061,slategray:7372944,slategrey:7372944,snow:16775930,springgreen:65407,steelblue:4620980,tan:13808780,teal:32896,thistle:14204888,tomato:16737095,turquoise:4251856,violet:15631086,wheat:16113331,white:16777215,whitesmoke:16119285,yellow:16776960,yellowgreen:10145074},bi={h:0,s:0,l:0},Mo={h:0,s:0,l:0};function xc(i,e,t){return t<0&&(t+=1),t>1&&(t-=1),t<1/6?i+(e-i)*6*t:t<1/2?e:t<2/3?i+(e-i)*6*(2/3-t):i}var We=class{constructor(e,t,n){return this.isColor=!0,this.r=1,this.g=1,this.b=1,this.set(e,t,n)}set(e,t,n){if(t===void 0&&n===void 0){let s=e;s&&s.isColor?this.copy(s):typeof s=="number"?this.setHex(s):typeof s=="string"&&this.setStyle(s)}else this.setRGB(e,t,n);return this}setScalar(e){return this.r=e,this.g=e,this.b=e,this}setHex(e,t=Zt){return e=Math.floor(e),this.r=(e>>16&255)/255,this.g=(e>>8&255)/255,this.b=(e&255)/255,qe.colorSpaceToWorking(this,t),this}setRGB(e,t,n,s=qe.workingColorSpace){return this.r=e,this.g=t,this.b=n,qe.colorSpaceToWorking(this,s),this}setHSL(e,t,n,s=qe.workingColorSpace){if(e=fh(e,1),t=ke(t,0,1),n=ke(n,0,1),t===0)this.r=this.g=this.b=n;else{let r=n<=.5?n*(1+t):n+t-n*t,o=2*n-r;this.r=xc(o,r,e+1/3),this.g=xc(o,r,e),this.b=xc(o,r,e-1/3)}return qe.colorSpaceToWorking(this,s),this}setStyle(e,t=Zt){function n(r){r!==void 0&&parseFloat(r)<1&&Ae("Color: Alpha component of "+e+" will be ignored.")}let s;if(s=/^(\w+)\(([^\)]*)\)/.exec(e)){let r,o=s[1],a=s[2];switch(o){case"rgb":case"rgba":if(r=/^\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(a))return n(r[4]),this.setRGB(Math.min(255,parseInt(r[1],10))/255,Math.min(255,parseInt(r[2],10))/255,Math.min(255,parseInt(r[3],10))/255,t);if(r=/^\s*(\d+)\%\s*,\s*(\d+)\%\s*,\s*(\d+)\%\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(a))return n(r[4]),this.setRGB(Math.min(100,parseInt(r[1],10))/100,Math.min(100,parseInt(r[2],10))/100,Math.min(100,parseInt(r[3],10))/100,t);break;case"hsl":case"hsla":if(r=/^\s*(\d*\.?\d+)\s*,\s*(\d*\.?\d+)\%\s*,\s*(\d*\.?\d+)\%\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(a))return n(r[4]),this.setHSL(parseFloat(r[1])/360,parseFloat(r[2])/100,parseFloat(r[3])/100,t);break;default:Ae("Color: Unknown color model "+e)}}else if(s=/^\#([A-Fa-f\d]+)$/.exec(e)){let r=s[1],o=r.length;if(o===3)return this.setRGB(parseInt(r.charAt(0),16)/15,parseInt(r.charAt(1),16)/15,parseInt(r.charAt(2),16)/15,t);if(o===6)return this.setHex(parseInt(r,16),t);Ae("Color: Invalid hex color "+e)}else if(e&&e.length>0)return this.setColorName(e,t);return this}setColorName(e,t=Zt){let n=Xd[e.toLowerCase()];return n!==void 0?this.setHex(n,t):Ae("Color: Unknown color "+e),this}clone(){return new this.constructor(this.r,this.g,this.b)}copy(e){return this.r=e.r,this.g=e.g,this.b=e.b,this}copySRGBToLinear(e){return this.r=oi(e.r),this.g=oi(e.g),this.b=oi(e.b),this}copyLinearToSRGB(e){return this.r=Rs(e.r),this.g=Rs(e.g),this.b=Rs(e.b),this}convertSRGBToLinear(){return this.copySRGBToLinear(this),this}convertLinearToSRGB(){return this.copyLinearToSRGB(this),this}getHex(e=Zt){return qe.workingToColorSpace(qt.copy(this),e),Math.round(ke(qt.r*255,0,255))*65536+Math.round(ke(qt.g*255,0,255))*256+Math.round(ke(qt.b*255,0,255))}getHexString(e=Zt){return("000000"+this.getHex(e).toString(16)).slice(-6)}getHSL(e,t=qe.workingColorSpace){qe.workingToColorSpace(qt.copy(this),t);let n=qt.r,s=qt.g,r=qt.b,o=Math.max(n,s,r),a=Math.min(n,s,r),l,c,h=(a+o)/2;if(a===o)l=0,c=0;else{let d=o-a;switch(c=h<=.5?d/(o+a):d/(2-o-a),o){case n:l=(s-r)/d+(s<r?6:0);break;case s:l=(r-n)/d+2;break;case r:l=(n-s)/d+4;break}l/=6}return e.h=l,e.s=c,e.l=h,e}getRGB(e,t=qe.workingColorSpace){return qe.workingToColorSpace(qt.copy(this),t),e.r=qt.r,e.g=qt.g,e.b=qt.b,e}getStyle(e=Zt){qe.workingToColorSpace(qt.copy(this),e);let t=qt.r,n=qt.g,s=qt.b;return e!==Zt?`color(${e} ${t.toFixed(3)} ${n.toFixed(3)} ${s.toFixed(3)})`:`rgb(${Math.round(t*255)},${Math.round(n*255)},${Math.round(s*255)})`}offsetHSL(e,t,n){return this.getHSL(bi),this.setHSL(bi.h+e,bi.s+t,bi.l+n)}add(e){return this.r+=e.r,this.g+=e.g,this.b+=e.b,this}addColors(e,t){return this.r=e.r+t.r,this.g=e.g+t.g,this.b=e.b+t.b,this}addScalar(e){return this.r+=e,this.g+=e,this.b+=e,this}sub(e){return this.r=Math.max(0,this.r-e.r),this.g=Math.max(0,this.g-e.g),this.b=Math.max(0,this.b-e.b),this}multiply(e){return this.r*=e.r,this.g*=e.g,this.b*=e.b,this}multiplyScalar(e){return this.r*=e,this.g*=e,this.b*=e,this}lerp(e,t){return this.r+=(e.r-this.r)*t,this.g+=(e.g-this.g)*t,this.b+=(e.b-this.b)*t,this}lerpColors(e,t,n){return this.r=e.r+(t.r-e.r)*n,this.g=e.g+(t.g-e.g)*n,this.b=e.b+(t.b-e.b)*n,this}lerpHSL(e,t){this.getHSL(bi),e.getHSL(Mo);let n=or(bi.h,Mo.h,t),s=or(bi.s,Mo.s,t),r=or(bi.l,Mo.l,t);return this.setHSL(n,s,r),this}setFromVector3(e){return this.r=e.x,this.g=e.y,this.b=e.z,this}applyMatrix3(e){let t=this.r,n=this.g,s=this.b,r=e.elements;return this.r=r[0]*t+r[3]*n+r[6]*s,this.g=r[1]*t+r[4]*n+r[7]*s,this.b=r[2]*t+r[5]*n+r[8]*s,this}equals(e){return e.r===this.r&&e.g===this.g&&e.b===this.b}fromArray(e,t=0){return this.r=e[t],this.g=e[t+1],this.b=e[t+2],this}toArray(e=[],t=0){return e[t]=this.r,e[t+1]=this.g,e[t+2]=this.b,e}fromBufferAttribute(e,t){return this.r=e.getX(t),this.g=e.getY(t),this.b=e.getZ(t),this}toJSON(){return this.getHex()}*[Symbol.iterator](){yield this.r,yield this.g,yield this.b}},qt=new We;We.NAMES=Xd;var mr=class extends un{constructor(){super(),this.isScene=!0,this.type="Scene",this.background=null,this.environment=null,this.fog=null,this.backgroundBlurriness=0,this.backgroundIntensity=1,this.backgroundRotation=new Pi,this.environmentIntensity=1,this.environmentRotation=new Pi,this.overrideMaterial=null,typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("observe",{detail:this}))}copy(e,t){return super.copy(e,t),e.background!==null&&(this.background=e.background.clone()),e.environment!==null&&(this.environment=e.environment.clone()),e.fog!==null&&(this.fog=e.fog.clone()),this.backgroundBlurriness=e.backgroundBlurriness,this.backgroundIntensity=e.backgroundIntensity,this.backgroundRotation.copy(e.backgroundRotation),this.environmentIntensity=e.environmentIntensity,this.environmentRotation.copy(e.environmentRotation),e.overrideMaterial!==null&&(this.overrideMaterial=e.overrideMaterial.clone()),this.matrixAutoUpdate=e.matrixAutoUpdate,this}toJSON(e){let t=super.toJSON(e);return this.fog!==null&&(t.object.fog=this.fog.toJSON()),this.backgroundBlurriness>0&&(t.object.backgroundBlurriness=this.backgroundBlurriness),this.backgroundIntensity!==1&&(t.object.backgroundIntensity=this.backgroundIntensity),t.object.backgroundRotation=this.backgroundRotation.toArray(),this.environmentIntensity!==1&&(t.object.environmentIntensity=this.environmentIntensity),t.object.environmentRotation=this.environmentRotation.toArray(),t}},wn=new N,ei=new N,yc=new N,ti=new N,vs=new N,_s=new N,Ku=new N,vc=new N,_c=new N,bc=new N,Mc=new nt,Sc=new nt,wc=new nt,Ti=class i{constructor(e=new N,t=new N,n=new N){this.a=e,this.b=t,this.c=n}static getNormal(e,t,n,s){s.subVectors(n,t),wn.subVectors(e,t),s.cross(wn);let r=s.lengthSq();return r>0?s.multiplyScalar(1/Math.sqrt(r)):s.set(0,0,0)}static getBarycoord(e,t,n,s,r){wn.subVectors(s,t),ei.subVectors(n,t),yc.subVectors(e,t);let o=wn.dot(wn),a=wn.dot(ei),l=wn.dot(yc),c=ei.dot(ei),h=ei.dot(yc),d=o*c-a*a;if(d===0)return r.set(0,0,0),null;let u=1/d,m=(c*l-a*h)*u,p=(o*h-a*l)*u;return r.set(1-m-p,p,m)}static containsPoint(e,t,n,s){return this.getBarycoord(e,t,n,s,ti)===null?!1:ti.x>=0&&ti.y>=0&&ti.x+ti.y<=1}static getInterpolation(e,t,n,s,r,o,a,l){return this.getBarycoord(e,t,n,s,ti)===null?(l.x=0,l.y=0,"z"in l&&(l.z=0),"w"in l&&(l.w=0),null):(l.setScalar(0),l.addScaledVector(r,ti.x),l.addScaledVector(o,ti.y),l.addScaledVector(a,ti.z),l)}static getInterpolatedAttribute(e,t,n,s,r,o){return Mc.setScalar(0),Sc.setScalar(0),wc.setScalar(0),Mc.fromBufferAttribute(e,t),Sc.fromBufferAttribute(e,n),wc.fromBufferAttribute(e,s),o.setScalar(0),o.addScaledVector(Mc,r.x),o.addScaledVector(Sc,r.y),o.addScaledVector(wc,r.z),o}static isFrontFacing(e,t,n,s){return wn.subVectors(n,t),ei.subVectors(e,t),wn.cross(ei).dot(s)<0}set(e,t,n){return this.a.copy(e),this.b.copy(t),this.c.copy(n),this}setFromPointsAndIndices(e,t,n,s){return this.a.copy(e[t]),this.b.copy(e[n]),this.c.copy(e[s]),this}setFromAttributeAndIndices(e,t,n,s){return this.a.fromBufferAttribute(e,t),this.b.fromBufferAttribute(e,n),this.c.fromBufferAttribute(e,s),this}clone(){return new this.constructor().copy(this)}copy(e){return this.a.copy(e.a),this.b.copy(e.b),this.c.copy(e.c),this}getArea(){return wn.subVectors(this.c,this.b),ei.subVectors(this.a,this.b),wn.cross(ei).length()*.5}getMidpoint(e){return e.addVectors(this.a,this.b).add(this.c).multiplyScalar(1/3)}getNormal(e){return i.getNormal(this.a,this.b,this.c,e)}getPlane(e){return e.setFromCoplanarPoints(this.a,this.b,this.c)}getBarycoord(e,t){return i.getBarycoord(e,this.a,this.b,this.c,t)}getInterpolation(e,t,n,s,r){return i.getInterpolation(e,this.a,this.b,this.c,t,n,s,r)}containsPoint(e){return i.containsPoint(e,this.a,this.b,this.c)}isFrontFacing(e){return i.isFrontFacing(this.a,this.b,this.c,e)}intersectsBox(e){return e.intersectsTriangle(this)}closestPointToPoint(e,t){let n=this.a,s=this.b,r=this.c,o,a;vs.subVectors(s,n),_s.subVectors(r,n),vc.subVectors(e,n);let l=vs.dot(vc),c=_s.dot(vc);if(l<=0&&c<=0)return t.copy(n);_c.subVectors(e,s);let h=vs.dot(_c),d=_s.dot(_c);if(h>=0&&d<=h)return t.copy(s);let u=l*d-h*c;if(u<=0&&l>=0&&h<=0)return o=l/(l-h),t.copy(n).addScaledVector(vs,o);bc.subVectors(e,r);let m=vs.dot(bc),p=_s.dot(bc);if(p>=0&&m<=p)return t.copy(r);let y=m*c-l*p;if(y<=0&&c>=0&&p<=0)return a=c/(c-p),t.copy(n).addScaledVector(_s,a);let g=h*p-m*d;if(g<=0&&d-h>=0&&m-p>=0)return Ku.subVectors(r,s),a=(d-h)/(d-h+(m-p)),t.copy(s).addScaledVector(Ku,a);let f=1/(g+y+u);return o=y*f,a=u*f,t.copy(n).addScaledVector(vs,o).addScaledVector(_s,a)}equals(e){return e.a.equals(this.a)&&e.b.equals(this.b)&&e.c.equals(this.c)}},dn=class{constructor(e=new N(1/0,1/0,1/0),t=new N(-1/0,-1/0,-1/0)){this.isBox3=!0,this.min=e,this.max=t}set(e,t){return this.min.copy(e),this.max.copy(t),this}setFromArray(e){this.makeEmpty();for(let t=0,n=e.length;t<n;t+=3)this.expandByPoint(En.fromArray(e,t));return this}setFromBufferAttribute(e){this.makeEmpty();for(let t=0,n=e.count;t<n;t++)this.expandByPoint(En.fromBufferAttribute(e,t));return this}setFromPoints(e){this.makeEmpty();for(let t=0,n=e.length;t<n;t++)this.expandByPoint(e[t]);return this}setFromCenterAndSize(e,t){let n=En.copy(t).multiplyScalar(.5);return this.min.copy(e).sub(n),this.max.copy(e).add(n),this}setFromObject(e,t=!1){return this.makeEmpty(),this.expandByObject(e,t)}clone(){return new this.constructor().copy(this)}copy(e){return this.min.copy(e.min),this.max.copy(e.max),this}makeEmpty(){return this.min.x=this.min.y=this.min.z=1/0,this.max.x=this.max.y=this.max.z=-1/0,this}isEmpty(){return this.max.x<this.min.x||this.max.y<this.min.y||this.max.z<this.min.z}getCenter(e){return this.isEmpty()?e.set(0,0,0):e.addVectors(this.min,this.max).multiplyScalar(.5)}getSize(e){return this.isEmpty()?e.set(0,0,0):e.subVectors(this.max,this.min)}expandByPoint(e){return this.min.min(e),this.max.max(e),this}expandByVector(e){return this.min.sub(e),this.max.add(e),this}expandByScalar(e){return this.min.addScalar(-e),this.max.addScalar(e),this}expandByObject(e,t=!1){e.updateWorldMatrix(!1,!1);let n=e.geometry;if(n!==void 0){let r=n.getAttribute("position");if(t===!0&&r!==void 0&&e.isInstancedMesh!==!0)for(let o=0,a=r.count;o<a;o++)e.isMesh===!0?e.getVertexPosition(o,En):En.fromBufferAttribute(r,o),En.applyMatrix4(e.matrixWorld),this.expandByPoint(En);else e.boundingBox!==void 0?(e.boundingBox===null&&e.computeBoundingBox(),So.copy(e.boundingBox)):(n.boundingBox===null&&n.computeBoundingBox(),So.copy(n.boundingBox)),So.applyMatrix4(e.matrixWorld),this.union(So)}let s=e.children;for(let r=0,o=s.length;r<o;r++)this.expandByObject(s[r],t);return this}containsPoint(e){return e.x>=this.min.x&&e.x<=this.max.x&&e.y>=this.min.y&&e.y<=this.max.y&&e.z>=this.min.z&&e.z<=this.max.z}containsBox(e){return this.min.x<=e.min.x&&e.max.x<=this.max.x&&this.min.y<=e.min.y&&e.max.y<=this.max.y&&this.min.z<=e.min.z&&e.max.z<=this.max.z}getParameter(e,t){return t.set((e.x-this.min.x)/(this.max.x-this.min.x),(e.y-this.min.y)/(this.max.y-this.min.y),(e.z-this.min.z)/(this.max.z-this.min.z))}intersectsBox(e){return e.max.x>=this.min.x&&e.min.x<=this.max.x&&e.max.y>=this.min.y&&e.min.y<=this.max.y&&e.max.z>=this.min.z&&e.min.z<=this.max.z}intersectsSphere(e){return this.clampPoint(e.center,En),En.distanceToSquared(e.center)<=e.radius*e.radius}intersectsPlane(e){let t,n;return e.normal.x>0?(t=e.normal.x*this.min.x,n=e.normal.x*this.max.x):(t=e.normal.x*this.max.x,n=e.normal.x*this.min.x),e.normal.y>0?(t+=e.normal.y*this.min.y,n+=e.normal.y*this.max.y):(t+=e.normal.y*this.max.y,n+=e.normal.y*this.min.y),e.normal.z>0?(t+=e.normal.z*this.min.z,n+=e.normal.z*this.max.z):(t+=e.normal.z*this.max.z,n+=e.normal.z*this.min.z),t<=-e.constant&&n>=-e.constant}intersectsTriangle(e){if(this.isEmpty())return!1;this.getCenter(er),wo.subVectors(this.max,er),bs.subVectors(e.a,er),Ms.subVectors(e.b,er),Ss.subVectors(e.c,er),Mi.subVectors(Ms,bs),Si.subVectors(Ss,Ms),qi.subVectors(bs,Ss);let t=[0,-Mi.z,Mi.y,0,-Si.z,Si.y,0,-qi.z,qi.y,Mi.z,0,-Mi.x,Si.z,0,-Si.x,qi.z,0,-qi.x,-Mi.y,Mi.x,0,-Si.y,Si.x,0,-qi.y,qi.x,0];return!Ec(t,bs,Ms,Ss,wo)||(t=[1,0,0,0,1,0,0,0,1],!Ec(t,bs,Ms,Ss,wo))?!1:(Eo.crossVectors(Mi,Si),t=[Eo.x,Eo.y,Eo.z],Ec(t,bs,Ms,Ss,wo))}clampPoint(e,t){return t.copy(e).clamp(this.min,this.max)}distanceToPoint(e){return this.clampPoint(e,En).distanceTo(e)}getBoundingSphere(e){return this.isEmpty()?e.makeEmpty():(this.getCenter(e.center),e.radius=this.getSize(En).length()*.5),e}intersect(e){return this.min.max(e.min),this.max.min(e.max),this.isEmpty()&&this.makeEmpty(),this}union(e){return this.min.min(e.min),this.max.max(e.max),this}applyMatrix4(e){return this.isEmpty()?this:(ni[0].set(this.min.x,this.min.y,this.min.z).applyMatrix4(e),ni[1].set(this.min.x,this.min.y,this.max.z).applyMatrix4(e),ni[2].set(this.min.x,this.max.y,this.min.z).applyMatrix4(e),ni[3].set(this.min.x,this.max.y,this.max.z).applyMatrix4(e),ni[4].set(this.max.x,this.min.y,this.min.z).applyMatrix4(e),ni[5].set(this.max.x,this.min.y,this.max.z).applyMatrix4(e),ni[6].set(this.max.x,this.max.y,this.min.z).applyMatrix4(e),ni[7].set(this.max.x,this.max.y,this.max.z).applyMatrix4(e),this.setFromPoints(ni),this)}translate(e){return this.min.add(e),this.max.add(e),this}equals(e){return e.min.equals(this.min)&&e.max.equals(this.max)}toJSON(){return{min:this.min.toArray(),max:this.max.toArray()}}fromJSON(e){return this.min.fromArray(e.min),this.max.fromArray(e.max),this}},ni=[new N,new N,new N,new N,new N,new N,new N,new N],En=new N,So=new dn,bs=new N,Ms=new N,Ss=new N,Mi=new N,Si=new N,qi=new N,er=new N,wo=new N,Eo=new N,Yi=new N;function Ec(i,e,t,n,s){for(let r=0,o=i.length-3;r<=o;r+=3){Yi.fromArray(i,r);let a=s.x*Math.abs(Yi.x)+s.y*Math.abs(Yi.y)+s.z*Math.abs(Yi.z),l=e.dot(Yi),c=t.dot(Yi),h=n.dot(Yi);if(Math.max(-Math.max(l,c,h),Math.min(l,c,h))>a)return!1}return!0}var Tt=new N,To=new Ge,Mm=0,sn=class extends Hn{constructor(e,t,n=!1){if(super(),Array.isArray(e))throw new TypeError("THREE.BufferAttribute: array should be a Typed Array.");this.isBufferAttribute=!0,Object.defineProperty(this,"id",{value:Mm++}),this.name="",this.array=e,this.itemSize=t,this.count=e!==void 0?e.length/t:0,this.normalized=n,this.usage=sa,this.updateRanges=[],this.gpuType=Ln,this.version=0}onUploadCallback(){}set needsUpdate(e){e===!0&&this.version++}setUsage(e){return this.usage=e,this}addUpdateRange(e,t){this.updateRanges.push({start:e,count:t})}clearUpdateRanges(){this.updateRanges.length=0}copy(e){return this.name=e.name,this.array=new e.array.constructor(e.array),this.itemSize=e.itemSize,this.count=e.count,this.normalized=e.normalized,this.usage=e.usage,this.gpuType=e.gpuType,this}copyAt(e,t,n){e*=this.itemSize,n*=t.itemSize;for(let s=0,r=this.itemSize;s<r;s++)this.array[e+s]=t.array[n+s];return this}copyArray(e){return this.array.set(e),this}applyMatrix3(e){if(this.itemSize===2)for(let t=0,n=this.count;t<n;t++)To.fromBufferAttribute(this,t),To.applyMatrix3(e),this.setXY(t,To.x,To.y);else if(this.itemSize===3)for(let t=0,n=this.count;t<n;t++)Tt.fromBufferAttribute(this,t),Tt.applyMatrix3(e),this.setXYZ(t,Tt.x,Tt.y,Tt.z);return this}applyMatrix4(e){for(let t=0,n=this.count;t<n;t++)Tt.fromBufferAttribute(this,t),Tt.applyMatrix4(e),this.setXYZ(t,Tt.x,Tt.y,Tt.z);return this}applyNormalMatrix(e){for(let t=0,n=this.count;t<n;t++)Tt.fromBufferAttribute(this,t),Tt.applyNormalMatrix(e),this.setXYZ(t,Tt.x,Tt.y,Tt.z);return this}transformDirection(e){for(let t=0,n=this.count;t<n;t++)Tt.fromBufferAttribute(this,t),Tt.transformDirection(e),this.setXYZ(t,Tt.x,Tt.y,Tt.z);return this}set(e,t=0){return this.array.set(e,t),this}getComponent(e,t){let n=this.array[e*this.itemSize+t];return this.normalized&&(n=Tn(n,this.array)),n}setComponent(e,t,n){return this.normalized&&(n=tt(n,this.array)),this.array[e*this.itemSize+t]=n,this}getX(e){let t=this.array[e*this.itemSize];return this.normalized&&(t=Tn(t,this.array)),t}setX(e,t){return this.normalized&&(t=tt(t,this.array)),this.array[e*this.itemSize]=t,this}getY(e){let t=this.array[e*this.itemSize+1];return this.normalized&&(t=Tn(t,this.array)),t}setY(e,t){return this.normalized&&(t=tt(t,this.array)),this.array[e*this.itemSize+1]=t,this}getZ(e){let t=this.array[e*this.itemSize+2];return this.normalized&&(t=Tn(t,this.array)),t}setZ(e,t){return this.normalized&&(t=tt(t,this.array)),this.array[e*this.itemSize+2]=t,this}getW(e){let t=this.array[e*this.itemSize+3];return this.normalized&&(t=Tn(t,this.array)),t}setW(e,t){return this.normalized&&(t=tt(t,this.array)),this.array[e*this.itemSize+3]=t,this}setXY(e,t,n){return e*=this.itemSize,this.normalized&&(t=tt(t,this.array),n=tt(n,this.array)),this.array[e+0]=t,this.array[e+1]=n,this}setXYZ(e,t,n,s){return e*=this.itemSize,this.normalized&&(t=tt(t,this.array),n=tt(n,this.array),s=tt(s,this.array)),this.array[e+0]=t,this.array[e+1]=n,this.array[e+2]=s,this}setXYZW(e,t,n,s,r){return e*=this.itemSize,this.normalized&&(t=tt(t,this.array),n=tt(n,this.array),s=tt(s,this.array),r=tt(r,this.array)),this.array[e+0]=t,this.array[e+1]=n,this.array[e+2]=s,this.array[e+3]=r,this}onUpload(e){return this.onUploadCallback=e,this}clone(){return new this.constructor(this.array,this.itemSize).copy(this)}toJSON(){let e={itemSize:this.itemSize,type:this.array.constructor.name,array:Array.from(this.array),normalized:this.normalized};return this.name!==""&&(e.name=this.name),this.usage!==sa&&(e.usage=this.usage),e}dispose(){this.dispatchEvent({type:"dispose"})}};var gr=class extends sn{constructor(e,t,n){super(new Uint16Array(e),t,n)}};var xr=class extends sn{constructor(e,t,n){super(new Uint32Array(e),t,n)}};var lt=class extends sn{constructor(e,t,n){super(new Float32Array(e),t,n)}},Sm=new dn,tr=new N,Tc=new N,Pn=class{constructor(e=new N,t=-1){this.isSphere=!0,this.center=e,this.radius=t}set(e,t){return this.center.copy(e),this.radius=t,this}setFromPoints(e,t){let n=this.center;t!==void 0?n.copy(t):Sm.setFromPoints(e).getCenter(n);let s=0;for(let r=0,o=e.length;r<o;r++)s=Math.max(s,n.distanceToSquared(e[r]));return this.radius=Math.sqrt(s),this}copy(e){return this.center.copy(e.center),this.radius=e.radius,this}isEmpty(){return this.radius<0}makeEmpty(){return this.center.set(0,0,0),this.radius=-1,this}containsPoint(e){return e.distanceToSquared(this.center)<=this.radius*this.radius}distanceToPoint(e){return e.distanceTo(this.center)-this.radius}intersectsSphere(e){let t=this.radius+e.radius;return e.center.distanceToSquared(this.center)<=t*t}intersectsBox(e){return e.intersectsSphere(this)}intersectsPlane(e){return Math.abs(e.distanceToPoint(this.center))<=this.radius}clampPoint(e,t){let n=this.center.distanceToSquared(e);return t.copy(e),n>this.radius*this.radius&&(t.sub(this.center).normalize(),t.multiplyScalar(this.radius).add(this.center)),t}getBoundingBox(e){return this.isEmpty()?(e.makeEmpty(),e):(e.set(this.center,this.center),e.expandByScalar(this.radius),e)}applyMatrix4(e){return this.center.applyMatrix4(e),this.radius=this.radius*e.getMaxScaleOnAxis(),this}translate(e){return this.center.add(e),this}expandByPoint(e){if(this.isEmpty())return this.center.copy(e),this.radius=0,this;tr.subVectors(e,this.center);let t=tr.lengthSq();if(t>this.radius*this.radius){let n=Math.sqrt(t),s=(n-this.radius)*.5;this.center.addScaledVector(tr,s/n),this.radius+=s}return this}union(e){return e.isEmpty()?this:this.isEmpty()?(this.copy(e),this):(this.center.equals(e.center)===!0?this.radius=Math.max(this.radius,e.radius):(Tc.subVectors(e.center,this.center).setLength(e.radius),this.expandByPoint(tr.copy(e.center).add(Tc)),this.expandByPoint(tr.copy(e.center).sub(Tc))),this)}equals(e){return e.center.equals(this.center)&&e.radius===this.radius}clone(){return new this.constructor().copy(this)}toJSON(){return{radius:this.radius,center:this.center.toArray()}}fromJSON(e){return this.radius=e.radius,this.center.fromArray(e.center),this}},wm=0,_n=new at,Ac=new un,ws=new N,cn=new dn,nr=new dn,Nt=new N,It=class i extends Hn{constructor(){super(),this.isBufferGeometry=!0,Object.defineProperty(this,"id",{value:wm++}),this.uuid=ri(),this.name="",this.type="BufferGeometry",this.index=null,this.indirect=null,this.indirectOffset=0,this.attributes={},this.morphAttributes={},this.morphTargetsRelative=!1,this.groups=[],this.boundingBox=null,this.boundingSphere=null,this.drawRange={start:0,count:1/0},this.userData={},this._transformed=!1}getIndex(){return this.index}setIndex(e){return Array.isArray(e)?this.index=new($p(e)?xr:gr)(e,1):this.index=e,this}setIndirect(e,t=0){return this.indirect=e,this.indirectOffset=t,this}getIndirect(){return this.indirect}getAttribute(e){return this.attributes[e]}setAttribute(e,t){return this.attributes[e]=t,this}deleteAttribute(e){return delete this.attributes[e],this}hasAttribute(e){return this.attributes[e]!==void 0}addGroup(e,t,n=0){this.groups.push({start:e,count:t,materialIndex:n})}clearGroups(){this.groups=[]}setDrawRange(e,t){this.drawRange.start=e,this.drawRange.count=t}applyMatrix4(e){let t=this.attributes.position;t!==void 0&&(t.applyMatrix4(e),t.needsUpdate=!0);let n=this.attributes.normal;if(n!==void 0){let r=new Ue().getNormalMatrix(e);n.applyNormalMatrix(r),n.needsUpdate=!0}let s=this.attributes.tangent;return s!==void 0&&(s.transformDirection(e),s.needsUpdate=!0),this.boundingBox!==null&&this.computeBoundingBox(),this.boundingSphere!==null&&this.computeBoundingSphere(),this._transformed=!0,this}applyQuaternion(e){return _n.makeRotationFromQuaternion(e),this.applyMatrix4(_n),this}rotateX(e){return _n.makeRotationX(e),this.applyMatrix4(_n),this}rotateY(e){return _n.makeRotationY(e),this.applyMatrix4(_n),this}rotateZ(e){return _n.makeRotationZ(e),this.applyMatrix4(_n),this}translate(e,t,n){return _n.makeTranslation(e,t,n),this.applyMatrix4(_n),this}scale(e,t,n){return _n.makeScale(e,t,n),this.applyMatrix4(_n),this}lookAt(e){return Ac.lookAt(e),Ac.updateMatrix(),this.applyMatrix4(Ac.matrix),this}center(){return this.computeBoundingBox(),this.boundingBox.getCenter(ws).negate(),this.translate(ws.x,ws.y,ws.z),this}setFromPoints(e){let t=this.getAttribute("position");if(t===void 0){let n=[];for(let s=0,r=e.length;s<r;s++){let o=e[s];n.push(o.x,o.y,o.z||0)}this.setAttribute("position",new lt(n,3))}else{let n=Math.min(e.length,t.count);for(let s=0;s<n;s++){let r=e[s];t.setXYZ(s,r.x,r.y,r.z||0)}e.length>t.count&&Ae("BufferGeometry: Buffer size too small for points data. Use .dispose() and create a new geometry."),t.needsUpdate=!0}return this}computeBoundingBox(){this.boundingBox===null&&(this.boundingBox=new dn);let e=this.attributes.position,t=this.morphAttributes.position;if(e&&e.isGLBufferAttribute){Le("BufferGeometry.computeBoundingBox(): GLBufferAttribute requires a manual bounding box.",this),this.boundingBox.set(new N(-1/0,-1/0,-1/0),new N(1/0,1/0,1/0));return}if(e!==void 0){if(this.boundingBox.setFromBufferAttribute(e),t)for(let n=0,s=t.length;n<s;n++){let r=t[n];cn.setFromBufferAttribute(r),this.morphTargetsRelative?(Nt.addVectors(this.boundingBox.min,cn.min),this.boundingBox.expandByPoint(Nt),Nt.addVectors(this.boundingBox.max,cn.max),this.boundingBox.expandByPoint(Nt)):(this.boundingBox.expandByPoint(cn.min),this.boundingBox.expandByPoint(cn.max))}}else this.boundingBox.makeEmpty();(isNaN(this.boundingBox.min.x)||isNaN(this.boundingBox.min.y)||isNaN(this.boundingBox.min.z))&&Le('BufferGeometry.computeBoundingBox(): Computed min/max have NaN values. The "position" attribute is likely to have NaN values.',this)}computeBoundingSphere(){this.boundingSphere===null&&(this.boundingSphere=new Pn);let e=this.attributes.position,t=this.morphAttributes.position;if(e&&e.isGLBufferAttribute){Le("BufferGeometry.computeBoundingSphere(): GLBufferAttribute requires a manual bounding sphere.",this),this.boundingSphere.set(new N,1/0);return}if(e){let n=this.boundingSphere.center;if(cn.setFromBufferAttribute(e),t)for(let r=0,o=t.length;r<o;r++){let a=t[r];nr.setFromBufferAttribute(a),this.morphTargetsRelative?(Nt.addVectors(cn.min,nr.min),cn.expandByPoint(Nt),Nt.addVectors(cn.max,nr.max),cn.expandByPoint(Nt)):(cn.expandByPoint(nr.min),cn.expandByPoint(nr.max))}cn.getCenter(n);let s=0;for(let r=0,o=e.count;r<o;r++)Nt.fromBufferAttribute(e,r),s=Math.max(s,n.distanceToSquared(Nt));if(t)for(let r=0,o=t.length;r<o;r++){let a=t[r],l=this.morphTargetsRelative;for(let c=0,h=a.count;c<h;c++)Nt.fromBufferAttribute(a,c),l&&(ws.fromBufferAttribute(e,c),Nt.add(ws)),s=Math.max(s,n.distanceToSquared(Nt))}this.boundingSphere.radius=Math.sqrt(s),isNaN(this.boundingSphere.radius)&&Le('BufferGeometry.computeBoundingSphere(): Computed radius is NaN. The "position" attribute is likely to have NaN values.',this)}}computeTangents(){let e=this.index,t=this.attributes;if(e===null||t.position===void 0||t.normal===void 0||t.uv===void 0){Le("BufferGeometry: .computeTangents() failed. Missing required attributes (index, position, normal or uv)");return}let n=t.position,s=t.normal,r=t.uv,o=this.getAttribute("tangent");(o===void 0||o.count!==n.count)&&(o=new sn(new Float32Array(4*n.count),4),this.setAttribute("tangent",o));let a=[],l=[];for(let x=0;x<n.count;x++)a[x]=new N,l[x]=new N;let c=new N,h=new N,d=new N,u=new Ge,m=new Ge,p=new Ge,y=new N,g=new N;function f(x,T,C){c.fromBufferAttribute(n,x),h.fromBufferAttribute(n,T),d.fromBufferAttribute(n,C),u.fromBufferAttribute(r,x),m.fromBufferAttribute(r,T),p.fromBufferAttribute(r,C),h.sub(c),d.sub(c),m.sub(u),p.sub(u);let R=1/(m.x*p.y-p.x*m.y);isFinite(R)&&(y.copy(h).multiplyScalar(p.y).addScaledVector(d,-m.y).multiplyScalar(R),g.copy(d).multiplyScalar(m.x).addScaledVector(h,-p.x).multiplyScalar(R),a[x].add(y),a[T].add(y),a[C].add(y),l[x].add(g),l[T].add(g),l[C].add(g))}let b=this.groups;b.length===0&&(b=[{start:0,count:e.count}]);for(let x=0,T=b.length;x<T;++x){let C=b[x],R=C.start,L=C.count;for(let I=R,V=R+L;I<V;I+=3)f(e.getX(I+0),e.getX(I+1),e.getX(I+2))}let M=new N,v=new N,A=new N,w=new N;function E(x){A.fromBufferAttribute(s,x),w.copy(A);let T=a[x];M.copy(T),M.sub(A.multiplyScalar(A.dot(T))).normalize(),v.crossVectors(w,T);let R=v.dot(l[x])<0?-1:1;o.setXYZW(x,M.x,M.y,M.z,R)}for(let x=0,T=b.length;x<T;++x){let C=b[x],R=C.start,L=C.count;for(let I=R,V=R+L;I<V;I+=3)E(e.getX(I+0)),E(e.getX(I+1)),E(e.getX(I+2))}this._transformed=!0}computeVertexNormals(){let e=this.index,t=this.getAttribute("position");if(t!==void 0){let n=this.getAttribute("normal");if(n===void 0||n.count!==t.count)n=new sn(new Float32Array(t.count*3),3),this.setAttribute("normal",n);else for(let u=0,m=n.count;u<m;u++)n.setXYZ(u,0,0,0);let s=new N,r=new N,o=new N,a=new N,l=new N,c=new N,h=new N,d=new N;if(e)for(let u=0,m=e.count;u<m;u+=3){let p=e.getX(u+0),y=e.getX(u+1),g=e.getX(u+2);s.fromBufferAttribute(t,p),r.fromBufferAttribute(t,y),o.fromBufferAttribute(t,g),h.subVectors(o,r),d.subVectors(s,r),h.cross(d),a.fromBufferAttribute(n,p),l.fromBufferAttribute(n,y),c.fromBufferAttribute(n,g),a.add(h),l.add(h),c.add(h),n.setXYZ(p,a.x,a.y,a.z),n.setXYZ(y,l.x,l.y,l.z),n.setXYZ(g,c.x,c.y,c.z)}else for(let u=0,m=t.count;u<m;u+=3)s.fromBufferAttribute(t,u+0),r.fromBufferAttribute(t,u+1),o.fromBufferAttribute(t,u+2),h.subVectors(o,r),d.subVectors(s,r),h.cross(d),n.setXYZ(u+0,h.x,h.y,h.z),n.setXYZ(u+1,h.x,h.y,h.z),n.setXYZ(u+2,h.x,h.y,h.z);this.normalizeNormals(),n.needsUpdate=!0}}normalizeNormals(){let e=this.attributes.normal;for(let t=0,n=e.count;t<n;t++)Nt.fromBufferAttribute(e,t),Nt.normalize(),e.setXYZ(t,Nt.x,Nt.y,Nt.z)}toNonIndexed(){function e(a,l){let c=a.array,h=a.itemSize,d=a.normalized,u=new c.constructor(l.length*h),m=0,p=0;for(let y=0,g=l.length;y<g;y++){a.isInterleavedBufferAttribute?m=l[y]*a.data.stride+a.offset:m=l[y]*h;for(let f=0;f<h;f++)u[p++]=c[m++]}return new sn(u,h,d)}if(this.index===null)return Ae("BufferGeometry.toNonIndexed(): BufferGeometry is already non-indexed."),this;let t=new i,n=this.index.array,s=this.attributes;for(let a in s){let l=s[a],c=e(l,n);t.setAttribute(a,c)}let r=this.morphAttributes;for(let a in r){let l=[],c=r[a];for(let h=0,d=c.length;h<d;h++){let u=c[h],m=e(u,n);l.push(m)}t.morphAttributes[a]=l}t.morphTargetsRelative=this.morphTargetsRelative;let o=this.groups;for(let a=0,l=o.length;a<l;a++){let c=o[a];t.addGroup(c.start,c.count,c.materialIndex)}return t}toJSON(){let e={metadata:{version:4.7,type:"BufferGeometry",generator:"BufferGeometry.toJSON"}};if(e.uuid=this.uuid,e.type=this.parameters!==void 0&&this._transformed===!0?"BufferGeometry":this.type,this.name!==""&&(e.name=this.name),Object.keys(this.userData).length>0&&(e.userData=this.userData),this.parameters!==void 0&&this._transformed!==!0){let l=this.parameters;for(let c in l)l[c]!==void 0&&(e[c]=l[c]);return e}e.data={attributes:{}};let t=this.index;t!==null&&(e.data.index={type:t.array.constructor.name,array:Array.prototype.slice.call(t.array)});let n=this.attributes;for(let l in n){let c=n[l];e.data.attributes[l]=c.toJSON(e.data)}let s={},r=!1;for(let l in this.morphAttributes){let c=this.morphAttributes[l],h=[];for(let d=0,u=c.length;d<u;d++){let m=c[d];h.push(m.toJSON(e.data))}h.length>0&&(s[l]=h,r=!0)}r&&(e.data.morphAttributes=s,e.data.morphTargetsRelative=this.morphTargetsRelative);let o=this.groups;o.length>0&&(e.data.groups=JSON.parse(JSON.stringify(o)));let a=this.boundingSphere;return a!==null&&(e.data.boundingSphere=a.toJSON()),e}clone(){return new this.constructor().copy(this)}copy(e){this.index=null,this.attributes={},this.morphAttributes={},this.groups=[],this.boundingBox=null,this.boundingSphere=null;let t={};this.name=e.name;let n=e.index;n!==null&&this.setIndex(n.clone());let s=e.attributes;for(let c in s){let h=s[c];this.setAttribute(c,h.clone(t))}let r=e.morphAttributes;for(let c in r){let h=[],d=r[c];for(let u=0,m=d.length;u<m;u++)h.push(d[u].clone(t));this.morphAttributes[c]=h}this.morphTargetsRelative=e.morphTargetsRelative;let o=e.groups;for(let c=0,h=o.length;c<h;c++){let d=o[c];this.addGroup(d.start,d.count,d.materialIndex)}let a=e.boundingBox;a!==null&&(this.boundingBox=a.clone());let l=e.boundingSphere;return l!==null&&(this.boundingSphere=l.clone()),this.drawRange.start=e.drawRange.start,this.drawRange.count=e.drawRange.count,this.userData=e.userData,this._transformed=e._transformed,this}dispose(){this.dispatchEvent({type:"dispose"})}},la=class{constructor(e,t){this.isInterleavedBuffer=!0,this.array=e,this.stride=t,this.count=e!==void 0?e.length/t:0,this.usage=sa,this.updateRanges=[],this.version=0,this.uuid=ri()}onUploadCallback(){}set needsUpdate(e){e===!0&&this.version++}setUsage(e){return this.usage=e,this}addUpdateRange(e,t){this.updateRanges.push({start:e,count:t})}clearUpdateRanges(){this.updateRanges.length=0}copy(e){return this.array=new e.array.constructor(e.array),this.count=e.count,this.stride=e.stride,this.usage=e.usage,this}copyAt(e,t,n){e*=this.stride,n*=t.stride;for(let s=0,r=this.stride;s<r;s++)this.array[e+s]=t.array[n+s];return this}set(e,t=0){return this.array.set(e,t),this}clone(e){e.arrayBuffers===void 0&&(e.arrayBuffers={}),this.array.buffer._uuid===void 0&&(this.array.buffer._uuid=ri()),e.arrayBuffers[this.array.buffer._uuid]===void 0&&(e.arrayBuffers[this.array.buffer._uuid]=this.array.slice(0).buffer);let t=new this.array.constructor(e.arrayBuffers[this.array.buffer._uuid]),n=new this.constructor(t,this.stride);return n.setUsage(this.usage),n}onUpload(e){return this.onUploadCallback=e,this}toJSON(e){return e.arrayBuffers===void 0&&(e.arrayBuffers={}),this.array.buffer._uuid===void 0&&(this.array.buffer._uuid=ri()),e.arrayBuffers[this.array.buffer._uuid]===void 0&&(e.arrayBuffers[this.array.buffer._uuid]=Array.from(new Uint32Array(this.array.buffer))),{uuid:this.uuid,buffer:this.array.buffer._uuid,type:this.array.constructor.name,stride:this.stride}}},Kt=new N,Rn=class i{constructor(e,t,n,s=!1){this.isInterleavedBufferAttribute=!0,this.name="",this.data=e,this.itemSize=t,this.offset=n,this.normalized=s}get count(){return this.data.count}get array(){return this.data.array}set needsUpdate(e){this.data.needsUpdate=e}applyMatrix4(e){for(let t=0,n=this.data.count;t<n;t++)Kt.fromBufferAttribute(this,t),Kt.applyMatrix4(e),this.setXYZ(t,Kt.x,Kt.y,Kt.z);return this}applyNormalMatrix(e){for(let t=0,n=this.count;t<n;t++)Kt.fromBufferAttribute(this,t),Kt.applyNormalMatrix(e),this.setXYZ(t,Kt.x,Kt.y,Kt.z);return this}transformDirection(e){for(let t=0,n=this.count;t<n;t++)Kt.fromBufferAttribute(this,t),Kt.transformDirection(e),this.setXYZ(t,Kt.x,Kt.y,Kt.z);return this}getComponent(e,t){let n=this.array[e*this.data.stride+this.offset+t];return this.normalized&&(n=Tn(n,this.array)),n}setComponent(e,t,n){return this.normalized&&(n=tt(n,this.array)),this.data.array[e*this.data.stride+this.offset+t]=n,this}setX(e,t){return this.normalized&&(t=tt(t,this.array)),this.data.array[e*this.data.stride+this.offset]=t,this}setY(e,t){return this.normalized&&(t=tt(t,this.array)),this.data.array[e*this.data.stride+this.offset+1]=t,this}setZ(e,t){return this.normalized&&(t=tt(t,this.array)),this.data.array[e*this.data.stride+this.offset+2]=t,this}setW(e,t){return this.normalized&&(t=tt(t,this.array)),this.data.array[e*this.data.stride+this.offset+3]=t,this}getX(e){let t=this.data.array[e*this.data.stride+this.offset];return this.normalized&&(t=Tn(t,this.array)),t}getY(e){let t=this.data.array[e*this.data.stride+this.offset+1];return this.normalized&&(t=Tn(t,this.array)),t}getZ(e){let t=this.data.array[e*this.data.stride+this.offset+2];return this.normalized&&(t=Tn(t,this.array)),t}getW(e){let t=this.data.array[e*this.data.stride+this.offset+3];return this.normalized&&(t=Tn(t,this.array)),t}setXY(e,t,n){return e=e*this.data.stride+this.offset,this.normalized&&(t=tt(t,this.array),n=tt(n,this.array)),this.data.array[e+0]=t,this.data.array[e+1]=n,this}setXYZ(e,t,n,s){return e=e*this.data.stride+this.offset,this.normalized&&(t=tt(t,this.array),n=tt(n,this.array),s=tt(s,this.array)),this.data.array[e+0]=t,this.data.array[e+1]=n,this.data.array[e+2]=s,this}setXYZW(e,t,n,s,r){return e=e*this.data.stride+this.offset,this.normalized&&(t=tt(t,this.array),n=tt(n,this.array),s=tt(s,this.array),r=tt(r,this.array)),this.data.array[e+0]=t,this.data.array[e+1]=n,this.data.array[e+2]=s,this.data.array[e+3]=r,this}clone(e){if(e===void 0){dr("InterleavedBufferAttribute.clone(): Cloning an interleaved buffer attribute will de-interleave buffer data.");let t=[];for(let n=0;n<this.count;n++){let s=n*this.data.stride+this.offset;for(let r=0;r<this.itemSize;r++)t.push(this.data.array[s+r])}return new sn(new this.array.constructor(t),this.itemSize,this.normalized)}else return e.interleavedBuffers===void 0&&(e.interleavedBuffers={}),e.interleavedBuffers[this.data.uuid]===void 0&&(e.interleavedBuffers[this.data.uuid]=this.data.clone(e)),new i(e.interleavedBuffers[this.data.uuid],this.itemSize,this.offset,this.normalized)}toJSON(e){if(e===void 0){dr("InterleavedBufferAttribute.toJSON(): Serializing an interleaved buffer attribute will de-interleave buffer data.");let t=[];for(let n=0;n<this.count;n++){let s=n*this.data.stride+this.offset;for(let r=0;r<this.itemSize;r++)t.push(this.data.array[s+r])}return{itemSize:this.itemSize,type:this.array.constructor.name,array:t,normalized:this.normalized}}else return e.interleavedBuffers===void 0&&(e.interleavedBuffers={}),e.interleavedBuffers[this.data.uuid]===void 0&&(e.interleavedBuffers[this.data.uuid]=this.data.toJSON(e)),{isInterleavedBufferAttribute:!0,itemSize:this.itemSize,data:this.data.uuid,offset:this.offset,normalized:this.normalized}}},Em=0,Ri=class extends Hn{constructor(){super(),this.isMaterial=!0,Object.defineProperty(this,"id",{value:Em++}),this.uuid=ri(),this.name="",this.type="Material",this.blending=ji,this.side=ai,this.vertexColors=!1,this.opacity=1,this.transparent=!1,this.alphaHash=!1,this.blendSrc=qo,this.blendDst=Yo,this.blendEquation=Ai,this.blendSrcAlpha=null,this.blendDstAlpha=null,this.blendEquationAlpha=null,this.blendColor=new We(0,0,0),this.blendAlpha=0,this.depthFunc=Qi,this.depthTest=!0,this.depthWrite=!0,this.stencilWriteMask=255,this.stencilFunc=zc,this.stencilRef=0,this.stencilFuncMask=255,this.stencilFail=Zi,this.stencilZFail=Zi,this.stencilZPass=Zi,this.stencilWrite=!1,this.clippingPlanes=null,this.clipIntersection=!1,this.clipShadows=!1,this.shadowSide=null,this.colorWrite=!0,this.precision=null,this.polygonOffset=!1,this.polygonOffsetFactor=0,this.polygonOffsetUnits=0,this.dithering=!1,this.alphaToCoverage=!1,this.premultipliedAlpha=!1,this.forceSinglePass=!1,this.allowOverride=!0,this.visible=!0,this.toneMapped=!0,this.userData={},this.version=0,this._alphaTest=0}get alphaTest(){return this._alphaTest}set alphaTest(e){this._alphaTest>0!=e>0&&this.version++,this._alphaTest=e}onBeforeRender(){}onBeforeCompile(){}customProgramCacheKey(){return this.onBeforeCompile.toString()}setValues(e){if(e!==void 0)for(let t in e){let n=e[t];if(n===void 0){Ae(`Material: parameter '${t}' has value of undefined.`);continue}let s=this[t];if(s===void 0){Ae(`Material: '${t}' is not a property of THREE.${this.type}.`);continue}s&&s.isColor?s.set(n):s&&s.isVector2&&n&&n.isVector2||s&&s.isEuler&&n&&n.isEuler||s&&s.isVector3&&n&&n.isVector3?s.copy(n):this[t]=n}}toJSON(e){let t=e===void 0||typeof e=="string";t&&(e={textures:{},images:{}});let n={metadata:{version:4.7,type:"Material",generator:"Material.toJSON"}};n.uuid=this.uuid,n.type=this.type,this.name!==""&&(n.name=this.name),this.color&&this.color.isColor&&(n.color=this.color.getHex()),this.roughness!==void 0&&(n.roughness=this.roughness),this.metalness!==void 0&&(n.metalness=this.metalness),this.sheen!==void 0&&(n.sheen=this.sheen),this.sheenColor&&this.sheenColor.isColor&&(n.sheenColor=this.sheenColor.getHex()),this.sheenRoughness!==void 0&&(n.sheenRoughness=this.sheenRoughness),this.emissive&&this.emissive.isColor&&(n.emissive=this.emissive.getHex()),this.emissiveIntensity!==void 0&&this.emissiveIntensity!==1&&(n.emissiveIntensity=this.emissiveIntensity),this.specular&&this.specular.isColor&&(n.specular=this.specular.getHex()),this.specularIntensity!==void 0&&(n.specularIntensity=this.specularIntensity),this.specularColor&&this.specularColor.isColor&&(n.specularColor=this.specularColor.getHex()),this.shininess!==void 0&&(n.shininess=this.shininess),this.clearcoat!==void 0&&(n.clearcoat=this.clearcoat),this.clearcoatRoughness!==void 0&&(n.clearcoatRoughness=this.clearcoatRoughness),this.clearcoatMap&&this.clearcoatMap.isTexture&&(n.clearcoatMap=this.clearcoatMap.toJSON(e).uuid),this.clearcoatRoughnessMap&&this.clearcoatRoughnessMap.isTexture&&(n.clearcoatRoughnessMap=this.clearcoatRoughnessMap.toJSON(e).uuid),this.clearcoatNormalMap&&this.clearcoatNormalMap.isTexture&&(n.clearcoatNormalMap=this.clearcoatNormalMap.toJSON(e).uuid,n.clearcoatNormalScale=this.clearcoatNormalScale.toArray()),this.sheenColorMap&&this.sheenColorMap.isTexture&&(n.sheenColorMap=this.sheenColorMap.toJSON(e).uuid),this.sheenRoughnessMap&&this.sheenRoughnessMap.isTexture&&(n.sheenRoughnessMap=this.sheenRoughnessMap.toJSON(e).uuid),this.dispersion!==void 0&&(n.dispersion=this.dispersion),this.iridescence!==void 0&&(n.iridescence=this.iridescence),this.iridescenceIOR!==void 0&&(n.iridescenceIOR=this.iridescenceIOR),this.iridescenceThicknessRange!==void 0&&(n.iridescenceThicknessRange=this.iridescenceThicknessRange),this.iridescenceMap&&this.iridescenceMap.isTexture&&(n.iridescenceMap=this.iridescenceMap.toJSON(e).uuid),this.iridescenceThicknessMap&&this.iridescenceThicknessMap.isTexture&&(n.iridescenceThicknessMap=this.iridescenceThicknessMap.toJSON(e).uuid),this.anisotropy!==void 0&&(n.anisotropy=this.anisotropy),this.anisotropyRotation!==void 0&&(n.anisotropyRotation=this.anisotropyRotation),this.anisotropyMap&&this.anisotropyMap.isTexture&&(n.anisotropyMap=this.anisotropyMap.toJSON(e).uuid),this.map&&this.map.isTexture&&(n.map=this.map.toJSON(e).uuid),this.matcap&&this.matcap.isTexture&&(n.matcap=this.matcap.toJSON(e).uuid),this.alphaMap&&this.alphaMap.isTexture&&(n.alphaMap=this.alphaMap.toJSON(e).uuid),this.lightMap&&this.lightMap.isTexture&&(n.lightMap=this.lightMap.toJSON(e).uuid,n.lightMapIntensity=this.lightMapIntensity),this.aoMap&&this.aoMap.isTexture&&(n.aoMap=this.aoMap.toJSON(e).uuid,n.aoMapIntensity=this.aoMapIntensity),this.bumpMap&&this.bumpMap.isTexture&&(n.bumpMap=this.bumpMap.toJSON(e).uuid,n.bumpScale=this.bumpScale),this.normalMap&&this.normalMap.isTexture&&(n.normalMap=this.normalMap.toJSON(e).uuid,n.normalMapType=this.normalMapType,n.normalScale=this.normalScale.toArray()),this.displacementMap&&this.displacementMap.isTexture&&(n.displacementMap=this.displacementMap.toJSON(e).uuid,n.displacementScale=this.displacementScale,n.displacementBias=this.displacementBias),this.roughnessMap&&this.roughnessMap.isTexture&&(n.roughnessMap=this.roughnessMap.toJSON(e).uuid),this.metalnessMap&&this.metalnessMap.isTexture&&(n.metalnessMap=this.metalnessMap.toJSON(e).uuid),this.emissiveMap&&this.emissiveMap.isTexture&&(n.emissiveMap=this.emissiveMap.toJSON(e).uuid),this.specularMap&&this.specularMap.isTexture&&(n.specularMap=this.specularMap.toJSON(e).uuid),this.specularIntensityMap&&this.specularIntensityMap.isTexture&&(n.specularIntensityMap=this.specularIntensityMap.toJSON(e).uuid),this.specularColorMap&&this.specularColorMap.isTexture&&(n.specularColorMap=this.specularColorMap.toJSON(e).uuid),this.envMap&&this.envMap.isTexture&&(n.envMap=this.envMap.toJSON(e).uuid,this.combine!==void 0&&(n.combine=this.combine)),this.envMapRotation!==void 0&&(n.envMapRotation=this.envMapRotation.toArray()),this.envMapIntensity!==void 0&&(n.envMapIntensity=this.envMapIntensity),this.reflectivity!==void 0&&(n.reflectivity=this.reflectivity),this.refractionRatio!==void 0&&(n.refractionRatio=this.refractionRatio),this.gradientMap&&this.gradientMap.isTexture&&(n.gradientMap=this.gradientMap.toJSON(e).uuid),this.transmission!==void 0&&(n.transmission=this.transmission),this.transmissionMap&&this.transmissionMap.isTexture&&(n.transmissionMap=this.transmissionMap.toJSON(e).uuid),this.thickness!==void 0&&(n.thickness=this.thickness),this.thicknessMap&&this.thicknessMap.isTexture&&(n.thicknessMap=this.thicknessMap.toJSON(e).uuid),this.attenuationDistance!==void 0&&this.attenuationDistance!==1/0&&(n.attenuationDistance=this.attenuationDistance),this.attenuationColor!==void 0&&(n.attenuationColor=this.attenuationColor.getHex()),this.size!==void 0&&(n.size=this.size),this.shadowSide!==null&&(n.shadowSide=this.shadowSide),this.sizeAttenuation!==void 0&&(n.sizeAttenuation=this.sizeAttenuation),this.blending!==ji&&(n.blending=this.blending),this.side!==ai&&(n.side=this.side),this.vertexColors===!0&&(n.vertexColors=!0),this.opacity<1&&(n.opacity=this.opacity),this.transparent===!0&&(n.transparent=!0),this.blendSrc!==qo&&(n.blendSrc=this.blendSrc),this.blendDst!==Yo&&(n.blendDst=this.blendDst),this.blendEquation!==Ai&&(n.blendEquation=this.blendEquation),this.blendSrcAlpha!==null&&(n.blendSrcAlpha=this.blendSrcAlpha),this.blendDstAlpha!==null&&(n.blendDstAlpha=this.blendDstAlpha),this.blendEquationAlpha!==null&&(n.blendEquationAlpha=this.blendEquationAlpha),this.blendColor&&this.blendColor.isColor&&(n.blendColor=this.blendColor.getHex()),this.blendAlpha!==0&&(n.blendAlpha=this.blendAlpha),this.depthFunc!==Qi&&(n.depthFunc=this.depthFunc),this.depthTest===!1&&(n.depthTest=this.depthTest),this.depthWrite===!1&&(n.depthWrite=this.depthWrite),this.colorWrite===!1&&(n.colorWrite=this.colorWrite),this.stencilWriteMask!==255&&(n.stencilWriteMask=this.stencilWriteMask),this.stencilFunc!==zc&&(n.stencilFunc=this.stencilFunc),this.stencilRef!==0&&(n.stencilRef=this.stencilRef),this.stencilFuncMask!==255&&(n.stencilFuncMask=this.stencilFuncMask),this.stencilFail!==Zi&&(n.stencilFail=this.stencilFail),this.stencilZFail!==Zi&&(n.stencilZFail=this.stencilZFail),this.stencilZPass!==Zi&&(n.stencilZPass=this.stencilZPass),this.stencilWrite===!0&&(n.stencilWrite=this.stencilWrite),this.rotation!==void 0&&this.rotation!==0&&(n.rotation=this.rotation),this.polygonOffset===!0&&(n.polygonOffset=!0),this.polygonOffsetFactor!==0&&(n.polygonOffsetFactor=this.polygonOffsetFactor),this.polygonOffsetUnits!==0&&(n.polygonOffsetUnits=this.polygonOffsetUnits),this.linewidth!==void 0&&this.linewidth!==1&&(n.linewidth=this.linewidth),this.dashSize!==void 0&&(n.dashSize=this.dashSize),this.gapSize!==void 0&&(n.gapSize=this.gapSize),this.scale!==void 0&&(n.scale=this.scale),this.dithering===!0&&(n.dithering=!0),this.alphaTest>0&&(n.alphaTest=this.alphaTest),this.alphaHash===!0&&(n.alphaHash=!0),this.alphaToCoverage===!0&&(n.alphaToCoverage=!0),this.premultipliedAlpha===!0&&(n.premultipliedAlpha=!0),this.forceSinglePass===!0&&(n.forceSinglePass=!0),this.allowOverride===!1&&(n.allowOverride=!1),this.wireframe===!0&&(n.wireframe=!0),this.wireframeLinewidth>1&&(n.wireframeLinewidth=this.wireframeLinewidth),this.wireframeLinecap!=="round"&&(n.wireframeLinecap=this.wireframeLinecap),this.wireframeLinejoin!=="round"&&(n.wireframeLinejoin=this.wireframeLinejoin),this.flatShading===!0&&(n.flatShading=!0),this.visible===!1&&(n.visible=!1),this.toneMapped===!1&&(n.toneMapped=!1),this.fog===!1&&(n.fog=!1),Object.keys(this.userData).length>0&&(n.userData=this.userData);function s(r){let o=[];for(let a in r){let l=r[a];delete l.metadata,o.push(l)}return o}if(t){let r=s(e.textures),o=s(e.images);r.length>0&&(n.textures=r),o.length>0&&(n.images=o)}return n}fromJSON(e,t){if(e.uuid!==void 0&&(this.uuid=e.uuid),e.name!==void 0&&(this.name=e.name),e.color!==void 0&&this.color!==void 0&&this.color.setHex(e.color),e.roughness!==void 0&&(this.roughness=e.roughness),e.metalness!==void 0&&(this.metalness=e.metalness),e.sheen!==void 0&&(this.sheen=e.sheen),e.sheenColor!==void 0&&(this.sheenColor=new We().setHex(e.sheenColor)),e.sheenRoughness!==void 0&&(this.sheenRoughness=e.sheenRoughness),e.emissive!==void 0&&this.emissive!==void 0&&this.emissive.setHex(e.emissive),e.specular!==void 0&&this.specular!==void 0&&this.specular.setHex(e.specular),e.specularIntensity!==void 0&&(this.specularIntensity=e.specularIntensity),e.specularColor!==void 0&&this.specularColor!==void 0&&this.specularColor.setHex(e.specularColor),e.shininess!==void 0&&(this.shininess=e.shininess),e.clearcoat!==void 0&&(this.clearcoat=e.clearcoat),e.clearcoatRoughness!==void 0&&(this.clearcoatRoughness=e.clearcoatRoughness),e.dispersion!==void 0&&(this.dispersion=e.dispersion),e.iridescence!==void 0&&(this.iridescence=e.iridescence),e.iridescenceIOR!==void 0&&(this.iridescenceIOR=e.iridescenceIOR),e.iridescenceThicknessRange!==void 0&&(this.iridescenceThicknessRange=e.iridescenceThicknessRange),e.transmission!==void 0&&(this.transmission=e.transmission),e.thickness!==void 0&&(this.thickness=e.thickness),e.attenuationDistance!==void 0&&(this.attenuationDistance=e.attenuationDistance),e.attenuationColor!==void 0&&this.attenuationColor!==void 0&&this.attenuationColor.setHex(e.attenuationColor),e.anisotropy!==void 0&&(this.anisotropy=e.anisotropy),e.anisotropyRotation!==void 0&&(this.anisotropyRotation=e.anisotropyRotation),e.fog!==void 0&&(this.fog=e.fog),e.flatShading!==void 0&&(this.flatShading=e.flatShading),e.blending!==void 0&&(this.blending=e.blending),e.combine!==void 0&&(this.combine=e.combine),e.side!==void 0&&(this.side=e.side),e.shadowSide!==void 0&&(this.shadowSide=e.shadowSide),e.opacity!==void 0&&(this.opacity=e.opacity),e.transparent!==void 0&&(this.transparent=e.transparent),e.alphaTest!==void 0&&(this.alphaTest=e.alphaTest),e.alphaHash!==void 0&&(this.alphaHash=e.alphaHash),e.depthFunc!==void 0&&(this.depthFunc=e.depthFunc),e.depthTest!==void 0&&(this.depthTest=e.depthTest),e.depthWrite!==void 0&&(this.depthWrite=e.depthWrite),e.colorWrite!==void 0&&(this.colorWrite=e.colorWrite),e.blendSrc!==void 0&&(this.blendSrc=e.blendSrc),e.blendDst!==void 0&&(this.blendDst=e.blendDst),e.blendEquation!==void 0&&(this.blendEquation=e.blendEquation),e.blendSrcAlpha!==void 0&&(this.blendSrcAlpha=e.blendSrcAlpha),e.blendDstAlpha!==void 0&&(this.blendDstAlpha=e.blendDstAlpha),e.blendEquationAlpha!==void 0&&(this.blendEquationAlpha=e.blendEquationAlpha),e.blendColor!==void 0&&this.blendColor!==void 0&&this.blendColor.setHex(e.blendColor),e.blendAlpha!==void 0&&(this.blendAlpha=e.blendAlpha),e.stencilWriteMask!==void 0&&(this.stencilWriteMask=e.stencilWriteMask),e.stencilFunc!==void 0&&(this.stencilFunc=e.stencilFunc),e.stencilRef!==void 0&&(this.stencilRef=e.stencilRef),e.stencilFuncMask!==void 0&&(this.stencilFuncMask=e.stencilFuncMask),e.stencilFail!==void 0&&(this.stencilFail=e.stencilFail),e.stencilZFail!==void 0&&(this.stencilZFail=e.stencilZFail),e.stencilZPass!==void 0&&(this.stencilZPass=e.stencilZPass),e.stencilWrite!==void 0&&(this.stencilWrite=e.stencilWrite),e.wireframe!==void 0&&(this.wireframe=e.wireframe),e.wireframeLinewidth!==void 0&&(this.wireframeLinewidth=e.wireframeLinewidth),e.wireframeLinecap!==void 0&&(this.wireframeLinecap=e.wireframeLinecap),e.wireframeLinejoin!==void 0&&(this.wireframeLinejoin=e.wireframeLinejoin),e.rotation!==void 0&&(this.rotation=e.rotation),e.linewidth!==void 0&&(this.linewidth=e.linewidth),e.dashSize!==void 0&&(this.dashSize=e.dashSize),e.gapSize!==void 0&&(this.gapSize=e.gapSize),e.scale!==void 0&&(this.scale=e.scale),e.polygonOffset!==void 0&&(this.polygonOffset=e.polygonOffset),e.polygonOffsetFactor!==void 0&&(this.polygonOffsetFactor=e.polygonOffsetFactor),e.polygonOffsetUnits!==void 0&&(this.polygonOffsetUnits=e.polygonOffsetUnits),e.dithering!==void 0&&(this.dithering=e.dithering),e.alphaToCoverage!==void 0&&(this.alphaToCoverage=e.alphaToCoverage),e.premultipliedAlpha!==void 0&&(this.premultipliedAlpha=e.premultipliedAlpha),e.forceSinglePass!==void 0&&(this.forceSinglePass=e.forceSinglePass),e.allowOverride!==void 0&&(this.allowOverride=e.allowOverride),e.visible!==void 0&&(this.visible=e.visible),e.toneMapped!==void 0&&(this.toneMapped=e.toneMapped),e.userData!==void 0&&(this.userData=e.userData),e.vertexColors!==void 0&&(typeof e.vertexColors=="number"?this.vertexColors=e.vertexColors>0:this.vertexColors=e.vertexColors),e.size!==void 0&&(this.size=e.size),e.sizeAttenuation!==void 0&&(this.sizeAttenuation=e.sizeAttenuation),e.map!==void 0&&(this.map=t[e.map]||null),e.matcap!==void 0&&(this.matcap=t[e.matcap]||null),e.alphaMap!==void 0&&(this.alphaMap=t[e.alphaMap]||null),e.bumpMap!==void 0&&(this.bumpMap=t[e.bumpMap]||null),e.bumpScale!==void 0&&(this.bumpScale=e.bumpScale),e.normalMap!==void 0&&(this.normalMap=t[e.normalMap]||null),e.normalMapType!==void 0&&(this.normalMapType=e.normalMapType),e.normalScale!==void 0){let n=e.normalScale;Array.isArray(n)===!1&&(n=[n,n]),this.normalScale=new Ge().fromArray(n)}return e.displacementMap!==void 0&&(this.displacementMap=t[e.displacementMap]||null),e.displacementScale!==void 0&&(this.displacementScale=e.displacementScale),e.displacementBias!==void 0&&(this.displacementBias=e.displacementBias),e.roughnessMap!==void 0&&(this.roughnessMap=t[e.roughnessMap]||null),e.metalnessMap!==void 0&&(this.metalnessMap=t[e.metalnessMap]||null),e.emissiveMap!==void 0&&(this.emissiveMap=t[e.emissiveMap]||null),e.emissiveIntensity!==void 0&&(this.emissiveIntensity=e.emissiveIntensity),e.specularMap!==void 0&&(this.specularMap=t[e.specularMap]||null),e.specularIntensityMap!==void 0&&(this.specularIntensityMap=t[e.specularIntensityMap]||null),e.specularColorMap!==void 0&&(this.specularColorMap=t[e.specularColorMap]||null),e.envMap!==void 0&&(this.envMap=t[e.envMap]||null),e.envMapRotation!==void 0&&this.envMapRotation.fromArray(e.envMapRotation),e.envMapIntensity!==void 0&&(this.envMapIntensity=e.envMapIntensity),e.reflectivity!==void 0&&(this.reflectivity=e.reflectivity),e.refractionRatio!==void 0&&(this.refractionRatio=e.refractionRatio),e.lightMap!==void 0&&(this.lightMap=t[e.lightMap]||null),e.lightMapIntensity!==void 0&&(this.lightMapIntensity=e.lightMapIntensity),e.aoMap!==void 0&&(this.aoMap=t[e.aoMap]||null),e.aoMapIntensity!==void 0&&(this.aoMapIntensity=e.aoMapIntensity),e.gradientMap!==void 0&&(this.gradientMap=t[e.gradientMap]||null),e.clearcoatMap!==void 0&&(this.clearcoatMap=t[e.clearcoatMap]||null),e.clearcoatRoughnessMap!==void 0&&(this.clearcoatRoughnessMap=t[e.clearcoatRoughnessMap]||null),e.clearcoatNormalMap!==void 0&&(this.clearcoatNormalMap=t[e.clearcoatNormalMap]||null),e.clearcoatNormalScale!==void 0&&(this.clearcoatNormalScale=new Ge().fromArray(e.clearcoatNormalScale)),e.iridescenceMap!==void 0&&(this.iridescenceMap=t[e.iridescenceMap]||null),e.iridescenceThicknessMap!==void 0&&(this.iridescenceThicknessMap=t[e.iridescenceThicknessMap]||null),e.transmissionMap!==void 0&&(this.transmissionMap=t[e.transmissionMap]||null),e.thicknessMap!==void 0&&(this.thicknessMap=t[e.thicknessMap]||null),e.anisotropyMap!==void 0&&(this.anisotropyMap=t[e.anisotropyMap]||null),e.sheenColorMap!==void 0&&(this.sheenColorMap=t[e.sheenColorMap]||null),e.sheenRoughnessMap!==void 0&&(this.sheenRoughnessMap=t[e.sheenRoughnessMap]||null),this}clone(){return new this.constructor().copy(this)}copy(e){this.name=e.name,this.blending=e.blending,this.side=e.side,this.vertexColors=e.vertexColors,this.opacity=e.opacity,this.transparent=e.transparent,this.blendSrc=e.blendSrc,this.blendDst=e.blendDst,this.blendEquation=e.blendEquation,this.blendSrcAlpha=e.blendSrcAlpha,this.blendDstAlpha=e.blendDstAlpha,this.blendEquationAlpha=e.blendEquationAlpha,this.blendColor.copy(e.blendColor),this.blendAlpha=e.blendAlpha,this.depthFunc=e.depthFunc,this.depthTest=e.depthTest,this.depthWrite=e.depthWrite,this.stencilWriteMask=e.stencilWriteMask,this.stencilFunc=e.stencilFunc,this.stencilRef=e.stencilRef,this.stencilFuncMask=e.stencilFuncMask,this.stencilFail=e.stencilFail,this.stencilZFail=e.stencilZFail,this.stencilZPass=e.stencilZPass,this.stencilWrite=e.stencilWrite;let t=e.clippingPlanes,n=null;if(t!==null){let s=t.length;n=new Array(s);for(let r=0;r!==s;++r)n[r]=t[r].clone()}return this.clippingPlanes=n,this.clipIntersection=e.clipIntersection,this.clipShadows=e.clipShadows,this.shadowSide=e.shadowSide,this.colorWrite=e.colorWrite,this.precision=e.precision,this.polygonOffset=e.polygonOffset,this.polygonOffsetFactor=e.polygonOffsetFactor,this.polygonOffsetUnits=e.polygonOffsetUnits,this.dithering=e.dithering,this.alphaTest=e.alphaTest,this.alphaHash=e.alphaHash,this.alphaToCoverage=e.alphaToCoverage,this.premultipliedAlpha=e.premultipliedAlpha,this.forceSinglePass=e.forceSinglePass,this.allowOverride=e.allowOverride,this.visible=e.visible,this.toneMapped=e.toneMapped,this.userData=JSON.parse(JSON.stringify(e.userData)),this}dispose(){this.dispatchEvent({type:"dispose"})}set needsUpdate(e){e===!0&&this.version++}};var ii=new N,Pc=new N,Ao=new N,wi=new N,Rc=new N,Po=new N,Cc=new N,yr=class{constructor(e=new N,t=new N(0,0,-1)){this.origin=e,this.direction=t}set(e,t){return this.origin.copy(e),this.direction.copy(t),this}copy(e){return this.origin.copy(e.origin),this.direction.copy(e.direction),this}at(e,t){return t.copy(this.origin).addScaledVector(this.direction,e)}lookAt(e){return this.direction.copy(e).sub(this.origin).normalize(),this}recast(e){return this.origin.copy(this.at(e,ii)),this}closestPointToPoint(e,t){t.subVectors(e,this.origin);let n=t.dot(this.direction);return n<0?t.copy(this.origin):t.copy(this.origin).addScaledVector(this.direction,n)}distanceToPoint(e){return Math.sqrt(this.distanceSqToPoint(e))}distanceSqToPoint(e){let t=ii.subVectors(e,this.origin).dot(this.direction);return t<0?this.origin.distanceToSquared(e):(ii.copy(this.origin).addScaledVector(this.direction,t),ii.distanceToSquared(e))}distanceSqToSegment(e,t,n,s){Pc.copy(e).add(t).multiplyScalar(.5),Ao.copy(t).sub(e).normalize(),wi.copy(this.origin).sub(Pc);let r=e.distanceTo(t)*.5,o=-this.direction.dot(Ao),a=wi.dot(this.direction),l=-wi.dot(Ao),c=wi.lengthSq(),h=Math.abs(1-o*o),d,u,m,p;if(h>0)if(d=o*l-a,u=o*a-l,p=r*h,d>=0)if(u>=-p)if(u<=p){let y=1/h;d*=y,u*=y,m=d*(d+o*u+2*a)+u*(o*d+u+2*l)+c}else u=r,d=Math.max(0,-(o*u+a)),m=-d*d+u*(u+2*l)+c;else u=-r,d=Math.max(0,-(o*u+a)),m=-d*d+u*(u+2*l)+c;else u<=-p?(d=Math.max(0,-(-o*r+a)),u=d>0?-r:Math.min(Math.max(-r,-l),r),m=-d*d+u*(u+2*l)+c):u<=p?(d=0,u=Math.min(Math.max(-r,-l),r),m=u*(u+2*l)+c):(d=Math.max(0,-(o*r+a)),u=d>0?r:Math.min(Math.max(-r,-l),r),m=-d*d+u*(u+2*l)+c);else u=o>0?-r:r,d=Math.max(0,-(o*u+a)),m=-d*d+u*(u+2*l)+c;return n&&n.copy(this.origin).addScaledVector(this.direction,d),s&&s.copy(Pc).addScaledVector(Ao,u),m}intersectSphere(e,t){ii.subVectors(e.center,this.origin);let n=ii.dot(this.direction),s=ii.dot(ii)-n*n,r=e.radius*e.radius;if(s>r)return null;let o=Math.sqrt(r-s),a=n-o,l=n+o;return l<0?null:a<0?this.at(l,t):this.at(a,t)}intersectsSphere(e){return e.radius<0?!1:this.distanceSqToPoint(e.center)<=e.radius*e.radius}distanceToPlane(e){let t=e.normal.dot(this.direction);if(t===0)return e.distanceToPoint(this.origin)===0?0:null;let n=-(this.origin.dot(e.normal)+e.constant)/t;return n>=0?n:null}intersectPlane(e,t){let n=this.distanceToPlane(e);return n===null?null:this.at(n,t)}intersectsPlane(e){let t=e.distanceToPoint(this.origin);return t===0||e.normal.dot(this.direction)*t<0}intersectBox(e,t){let n,s,r,o,a,l,c=1/this.direction.x,h=1/this.direction.y,d=1/this.direction.z,u=this.origin;return c>=0?(n=(e.min.x-u.x)*c,s=(e.max.x-u.x)*c):(n=(e.max.x-u.x)*c,s=(e.min.x-u.x)*c),h>=0?(r=(e.min.y-u.y)*h,o=(e.max.y-u.y)*h):(r=(e.max.y-u.y)*h,o=(e.min.y-u.y)*h),n>o||r>s||((r>n||isNaN(n))&&(n=r),(o<s||isNaN(s))&&(s=o),d>=0?(a=(e.min.z-u.z)*d,l=(e.max.z-u.z)*d):(a=(e.max.z-u.z)*d,l=(e.min.z-u.z)*d),n>l||a>s)||((a>n||n!==n)&&(n=a),(l<s||s!==s)&&(s=l),s<0)?null:this.at(n>=0?n:s,t)}intersectsBox(e){return this.intersectBox(e,ii)!==null}intersectTriangle(e,t,n,s,r){Rc.subVectors(t,e),Po.subVectors(n,e),Cc.crossVectors(Rc,Po);let o=this.direction.dot(Cc),a;if(o>0){if(s)return null;a=1}else if(o<0)a=-1,o=-o;else return null;wi.subVectors(this.origin,e);let l=a*this.direction.dot(Po.crossVectors(wi,Po));if(l<0)return null;let c=a*this.direction.dot(Rc.cross(wi));if(c<0||l+c>o)return null;let h=-a*wi.dot(Cc);return h<0?null:this.at(h/o,r)}applyMatrix4(e){return this.origin.applyMatrix4(e),this.direction.transformDirection(e),this}equals(e){return e.origin.equals(this.origin)&&e.direction.equals(this.direction)}clone(){return new this.constructor().copy(this)}},Wn=class extends Ri{constructor(e){super(),this.isMeshBasicMaterial=!0,this.type="MeshBasicMaterial",this.color=new We(16777215),this.map=null,this.lightMap=null,this.lightMapIntensity=1,this.aoMap=null,this.aoMapIntensity=1,this.specularMap=null,this.alphaMap=null,this.envMap=null,this.envMapRotation=new Pi,this.combine=Kc,this.reflectivity=1,this.refractionRatio=.98,this.wireframe=!1,this.wireframeLinewidth=1,this.wireframeLinecap="round",this.wireframeLinejoin="round",this.fog=!0,this.setValues(e)}copy(e){return super.copy(e),this.color.copy(e.color),this.map=e.map,this.lightMap=e.lightMap,this.lightMapIntensity=e.lightMapIntensity,this.aoMap=e.aoMap,this.aoMapIntensity=e.aoMapIntensity,this.specularMap=e.specularMap,this.alphaMap=e.alphaMap,this.envMap=e.envMap,this.envMapRotation.copy(e.envMapRotation),this.combine=e.combine,this.reflectivity=e.reflectivity,this.refractionRatio=e.refractionRatio,this.wireframe=e.wireframe,this.wireframeLinewidth=e.wireframeLinewidth,this.wireframeLinecap=e.wireframeLinecap,this.wireframeLinejoin=e.wireframeLinejoin,this.fog=e.fog,this}},Zu=new at,$i=new yr,Ro=new Pn,Ju=new N,Co=new N,Io=new N,Lo=new N,Ic=new N,Do=new N,ju=new N,Fo=new N,At=class extends un{constructor(e=new It,t=new Wn){super(),this.isMesh=!0,this.type="Mesh",this.geometry=e,this.material=t,this.morphTargetDictionary=void 0,this.morphTargetInfluences=void 0,this.count=1,this.updateMorphTargets()}copy(e,t){return super.copy(e,t),e.morphTargetInfluences!==void 0&&(this.morphTargetInfluences=e.morphTargetInfluences.slice()),e.morphTargetDictionary!==void 0&&(this.morphTargetDictionary=Object.assign({},e.morphTargetDictionary)),this.material=Array.isArray(e.material)?e.material.slice():e.material,this.geometry=e.geometry,this}updateMorphTargets(){let t=this.geometry.morphAttributes,n=Object.keys(t);if(n.length>0){let s=t[n[0]];if(s!==void 0){this.morphTargetInfluences=[],this.morphTargetDictionary={};for(let r=0,o=s.length;r<o;r++){let a=s[r].name||String(r);this.morphTargetInfluences.push(0),this.morphTargetDictionary[a]=r}}}}getVertexPosition(e,t){let n=this.geometry,s=n.attributes.position,r=n.morphAttributes.position,o=n.morphTargetsRelative;t.fromBufferAttribute(s,e);let a=this.morphTargetInfluences;if(r&&a){Do.set(0,0,0);for(let l=0,c=r.length;l<c;l++){let h=a[l],d=r[l];h!==0&&(Ic.fromBufferAttribute(d,e),o?Do.addScaledVector(Ic,h):Do.addScaledVector(Ic.sub(t),h))}t.add(Do)}return t}raycast(e,t){let n=this.geometry,s=this.material,r=this.matrixWorld;s!==void 0&&(n.boundingSphere===null&&n.computeBoundingSphere(),Ro.copy(n.boundingSphere),Ro.applyMatrix4(r),$i.copy(e.ray).recast(e.near),!(Ro.containsPoint($i.origin)===!1&&($i.intersectSphere(Ro,Ju)===null||$i.origin.distanceToSquared(Ju)>(e.far-e.near)**2))&&(Zu.copy(r).invert(),$i.copy(e.ray).applyMatrix4(Zu),!(n.boundingBox!==null&&$i.intersectsBox(n.boundingBox)===!1)&&this._computeIntersections(e,t,$i)))}_computeIntersections(e,t,n){let s,r=this.geometry,o=this.material,a=r.index,l=r.attributes.position,c=r.attributes.uv,h=r.attributes.uv1,d=r.attributes.normal,u=r.groups,m=r.drawRange;if(a!==null)if(Array.isArray(o))for(let p=0,y=u.length;p<y;p++){let g=u[p],f=o[g.materialIndex],b=Math.max(g.start,m.start),M=Math.min(a.count,Math.min(g.start+g.count,m.start+m.count));for(let v=b,A=M;v<A;v+=3){let w=a.getX(v),E=a.getX(v+1),x=a.getX(v+2);s=Uo(this,f,e,n,c,h,d,w,E,x),s&&(s.faceIndex=Math.floor(v/3),s.face.materialIndex=g.materialIndex,t.push(s))}}else{let p=Math.max(0,m.start),y=Math.min(a.count,m.start+m.count);for(let g=p,f=y;g<f;g+=3){let b=a.getX(g),M=a.getX(g+1),v=a.getX(g+2);s=Uo(this,o,e,n,c,h,d,b,M,v),s&&(s.faceIndex=Math.floor(g/3),t.push(s))}}else if(l!==void 0)if(Array.isArray(o))for(let p=0,y=u.length;p<y;p++){let g=u[p],f=o[g.materialIndex],b=Math.max(g.start,m.start),M=Math.min(l.count,Math.min(g.start+g.count,m.start+m.count));for(let v=b,A=M;v<A;v+=3){let w=v,E=v+1,x=v+2;s=Uo(this,f,e,n,c,h,d,w,E,x),s&&(s.faceIndex=Math.floor(v/3),s.face.materialIndex=g.materialIndex,t.push(s))}}else{let p=Math.max(0,m.start),y=Math.min(l.count,m.start+m.count);for(let g=p,f=y;g<f;g+=3){let b=g,M=g+1,v=g+2;s=Uo(this,o,e,n,c,h,d,b,M,v),s&&(s.faceIndex=Math.floor(g/3),t.push(s))}}}};function Tm(i,e,t,n,s,r,o,a){let l;if(e.side===jt?l=n.intersectTriangle(o,r,s,!0,a):l=n.intersectTriangle(s,r,o,e.side===ai,a),l===null)return null;Fo.copy(a),Fo.applyMatrix4(i.matrixWorld);let c=t.ray.origin.distanceTo(Fo);return c<t.near||c>t.far?null:{distance:c,point:Fo.clone(),object:i}}function Uo(i,e,t,n,s,r,o,a,l,c){i.getVertexPosition(a,Co),i.getVertexPosition(l,Io),i.getVertexPosition(c,Lo);let h=Tm(i,e,t,n,Co,Io,Lo,ju);if(h){let d=new N;Ti.getBarycoord(ju,Co,Io,Lo,d),s&&(h.uv=Ti.getInterpolatedAttribute(s,a,l,c,d,new Ge)),r&&(h.uv1=Ti.getInterpolatedAttribute(r,a,l,c,d,new Ge)),o&&(h.normal=Ti.getInterpolatedAttribute(o,a,l,c,d,new N),h.normal.dot(n.direction)>0&&h.normal.multiplyScalar(-1));let u={a,b:l,c,normal:new N,materialIndex:0};Ti.getNormal(Co,Io,Lo,u.normal),h.face=u,h.barycoord=d}return h}var ca=class extends Jt{constructor(e=null,t=1,n=1,s,r,o,a,l,c=Ot,h=Ot,d,u){super(null,o,a,l,c,h,s,r,d,u),this.isDataTexture=!0,this.image={data:e,width:t,height:n},this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1}};var Lc=new N,Am=new N,Pm=new Ue,zn=class{constructor(e=new N(1,0,0),t=0){this.isPlane=!0,this.normal=e,this.constant=t}set(e,t){return this.normal.copy(e),this.constant=t,this}setComponents(e,t,n,s){return this.normal.set(e,t,n),this.constant=s,this}setFromNormalAndCoplanarPoint(e,t){return this.normal.copy(e),this.constant=-t.dot(this.normal),this}setFromCoplanarPoints(e,t,n){let s=Lc.subVectors(n,t).cross(Am.subVectors(e,t)).normalize();return this.setFromNormalAndCoplanarPoint(s,e),this}copy(e){return this.normal.copy(e.normal),this.constant=e.constant,this}normalize(){let e=1/this.normal.length();return this.normal.multiplyScalar(e),this.constant*=e,this}negate(){return this.constant*=-1,this.normal.negate(),this}distanceToPoint(e){return this.normal.dot(e)+this.constant}distanceToSphere(e){return this.distanceToPoint(e.center)-e.radius}projectPoint(e,t){return t.copy(e).addScaledVector(this.normal,-this.distanceToPoint(e))}intersectLine(e,t,n=!0){let s=e.delta(Lc),r=this.normal.dot(s);if(r===0)return this.distanceToPoint(e.start)===0?t.copy(e.start):null;let o=-(e.start.dot(this.normal)+this.constant)/r;return n===!0&&(o<0||o>1)?null:t.copy(e.start).addScaledVector(s,o)}intersectsLine(e){let t=this.distanceToPoint(e.start),n=this.distanceToPoint(e.end);return t<0&&n>0||n<0&&t>0}intersectsBox(e){return e.intersectsPlane(this)}intersectsSphere(e){return e.intersectsPlane(this)}coplanarPoint(e){return e.copy(this.normal).multiplyScalar(-this.constant)}applyMatrix4(e,t){let n=t||Pm.getNormalMatrix(e),s=this.coplanarPoint(Lc).applyMatrix4(e),r=this.normal.applyMatrix3(n).normalize();return this.constant=-s.dot(r),this}translate(e){return this.constant-=e.dot(this.normal),this}equals(e){return e.normal.equals(this.normal)&&e.constant===this.constant}clone(){return new this.constructor().copy(this)}},Ki=new Pn,Rm=new Ge(.5,.5),No=new N,vr=class{constructor(e=new zn,t=new zn,n=new zn,s=new zn,r=new zn,o=new zn){this.planes=[e,t,n,s,r,o]}set(e,t,n,s,r,o){let a=this.planes;return a[0].copy(e),a[1].copy(t),a[2].copy(n),a[3].copy(s),a[4].copy(r),a[5].copy(o),this}copy(e){let t=this.planes;for(let n=0;n<6;n++)t[n].copy(e.planes[n]);return this}setFromProjectionMatrix(e,t=An,n=!1){let s=this.planes,r=e.elements,o=r[0],a=r[1],l=r[2],c=r[3],h=r[4],d=r[5],u=r[6],m=r[7],p=r[8],y=r[9],g=r[10],f=r[11],b=r[12],M=r[13],v=r[14],A=r[15];if(s[0].setComponents(c-o,m-h,f-p,A-b).normalize(),s[1].setComponents(c+o,m+h,f+p,A+b).normalize(),s[2].setComponents(c+a,m+d,f+y,A+M).normalize(),s[3].setComponents(c-a,m-d,f-y,A-M).normalize(),n)s[4].setComponents(l,u,g,v).normalize(),s[5].setComponents(c-l,m-u,f-g,A-v).normalize();else if(s[4].setComponents(c-l,m-u,f-g,A-v).normalize(),t===An)s[5].setComponents(c+l,m+u,f+g,A+v).normalize();else if(t===hr)s[5].setComponents(l,u,g,v).normalize();else throw new Error("THREE.Frustum.setFromProjectionMatrix(): Invalid coordinate system: "+t);return this}intersectsObject(e){if(e.boundingSphere!==void 0)e.boundingSphere===null&&e.computeBoundingSphere(),Ki.copy(e.boundingSphere).applyMatrix4(e.matrixWorld);else{let t=e.geometry;t.boundingSphere===null&&t.computeBoundingSphere(),Ki.copy(t.boundingSphere).applyMatrix4(e.matrixWorld)}return this.intersectsSphere(Ki)}intersectsSprite(e){Ki.center.set(0,0,0);let t=Rm.distanceTo(e.center);return Ki.radius=.7071067811865476+t,Ki.applyMatrix4(e.matrixWorld),this.intersectsSphere(Ki)}intersectsSphere(e){let t=this.planes,n=e.center,s=-e.radius;for(let r=0;r<6;r++)if(t[r].distanceToPoint(n)<s)return!1;return!0}intersectsBox(e){let t=this.planes;for(let n=0;n<6;n++){let s=t[n];if(No.x=s.normal.x>0?e.max.x:e.min.x,No.y=s.normal.y>0?e.max.y:e.min.y,No.z=s.normal.z>0?e.max.z:e.min.z,s.distanceToPoint(No)<0)return!1}return!0}containsPoint(e){let t=this.planes;for(let n=0;n<6;n++)if(t[n].distanceToPoint(e)<0)return!1;return!0}clone(){return new this.constructor().copy(this)}};var Fs=class extends Ri{constructor(e){super(),this.isLineBasicMaterial=!0,this.type="LineBasicMaterial",this.color=new We(16777215),this.map=null,this.linewidth=1,this.linecap="round",this.linejoin="round",this.fog=!0,this.setValues(e)}copy(e){return super.copy(e),this.color.copy(e.color),this.map=e.map,this.linewidth=e.linewidth,this.linecap=e.linecap,this.linejoin=e.linejoin,this.fog=e.fog,this}},ha=new N,ua=new N,Qu=new at,ir=new yr,Oo=new Pn,Dc=new N,ed=new N,_r=class extends un{constructor(e=new It,t=new Fs){super(),this.isLine=!0,this.type="Line",this.geometry=e,this.material=t,this.morphTargetDictionary=void 0,this.morphTargetInfluences=void 0,this.updateMorphTargets()}copy(e,t){return super.copy(e,t),this.material=Array.isArray(e.material)?e.material.slice():e.material,this.geometry=e.geometry,this}computeLineDistances(){let e=this.geometry;if(e.index===null){let t=e.attributes.position,n=[0];for(let s=1,r=t.count;s<r;s++)ha.fromBufferAttribute(t,s-1),ua.fromBufferAttribute(t,s),n[s]=n[s-1],n[s]+=ha.distanceTo(ua);e.setAttribute("lineDistance",new lt(n,1))}else Ae("Line.computeLineDistances(): Computation only possible with non-indexed BufferGeometry.");return this}raycast(e,t){let n=this.geometry,s=this.matrixWorld,r=e.params.Line.threshold,o=n.drawRange;if(n.boundingSphere===null&&n.computeBoundingSphere(),Oo.copy(n.boundingSphere),Oo.applyMatrix4(s),Oo.radius+=r,e.ray.intersectsSphere(Oo)===!1)return;Qu.copy(s).invert(),ir.copy(e.ray).applyMatrix4(Qu);let a=r/((this.scale.x+this.scale.y+this.scale.z)/3),l=a*a,c=this.isLineSegments?2:1,h=n.index,u=n.attributes.position;if(h!==null){let m=Math.max(0,o.start),p=Math.min(h.count,o.start+o.count);for(let y=m,g=p-1;y<g;y+=c){let f=h.getX(y),b=h.getX(y+1),M=Bo(this,e,ir,l,f,b,y);M&&t.push(M)}if(this.isLineLoop){let y=h.getX(p-1),g=h.getX(m),f=Bo(this,e,ir,l,y,g,p-1);f&&t.push(f)}}else{let m=Math.max(0,o.start),p=Math.min(u.count,o.start+o.count);for(let y=m,g=p-1;y<g;y+=c){let f=Bo(this,e,ir,l,y,y+1,y);f&&t.push(f)}if(this.isLineLoop){let y=Bo(this,e,ir,l,p-1,m,p-1);y&&t.push(y)}}}updateMorphTargets(){let t=this.geometry.morphAttributes,n=Object.keys(t);if(n.length>0){let s=t[n[0]];if(s!==void 0){this.morphTargetInfluences=[],this.morphTargetDictionary={};for(let r=0,o=s.length;r<o;r++){let a=s[r].name||String(r);this.morphTargetInfluences.push(0),this.morphTargetDictionary[a]=r}}}}};function Bo(i,e,t,n,s,r,o){let a=i.geometry.attributes.position;if(ha.fromBufferAttribute(a,s),ua.fromBufferAttribute(a,r),t.distanceSqToSegment(ha,ua,Dc,ed)>n)return;Dc.applyMatrix4(i.matrixWorld);let c=e.ray.origin.distanceTo(Dc);if(!(c<e.near||c>e.far))return{distance:c,point:ed.clone().applyMatrix4(i.matrixWorld),index:o,face:null,faceIndex:null,barycoord:null,object:i}}var br=class extends Jt{constructor(e=[],t=Fi,n,s,r,o,a,l,c,h){super(e,t,n,s,r,o,a,l,c,h),this.isCubeTexture=!0,this.flipY=!1}get images(){return this.image}set images(e){this.image=e}},Mr=class extends Jt{constructor(e,t,n,s,r,o,a,l,c){super(e,t,n,s,r,o,a,l,c),this.isCanvasTexture=!0,this.needsUpdate=!0}};var li=class extends Jt{constructor(e,t,n=In,s,r,o,a=Ot,l=Ot,c,h=Vn,d=1){if(h!==Vn&&h!==Ni)throw new Error("THREE.DepthTexture: format must be either THREE.DepthFormat or THREE.DepthStencilFormat");let u={width:e,height:t,depth:d};super(u,s,r,o,a,l,h,n,c),this.isDepthTexture=!0,this.flipY=!1,this.generateMipmaps=!1,this.compareFunction=null}copy(e){return super.copy(e),this.source=new Ls(Object.assign({},e.image)),this.compareFunction=e.compareFunction,this}toJSON(e){let t=super.toJSON(e);return this.compareFunction!==null&&(t.compareFunction=this.compareFunction),t}},da=class extends li{constructor(e,t=In,n=Fi,s,r,o=Ot,a=Ot,l,c=Vn){let h={width:e,height:e,depth:1},d=[h,h,h,h,h,h];super(e,e,t,n,s,r,o,a,l,c),this.image=d,this.isCubeDepthTexture=!0,this.isCubeTexture=!0}get images(){return this.image}set images(e){this.image=e}},Sr=class extends Jt{constructor(e=null){super(),this.sourceTexture=e,this.isExternalTexture=!0}copy(e){return super.copy(e),this.sourceTexture=e.sourceTexture,this}},Us=class i extends It{constructor(e=1,t=1,n=1,s=1,r=1,o=1){super(),this.type="BoxGeometry",this.parameters={width:e,height:t,depth:n,widthSegments:s,heightSegments:r,depthSegments:o};let a=this;s=Math.floor(s),r=Math.floor(r),o=Math.floor(o);let l=[],c=[],h=[],d=[],u=0,m=0;p("z","y","x",-1,-1,n,t,e,o,r,0),p("z","y","x",1,-1,n,t,-e,o,r,1),p("x","z","y",1,1,e,n,t,s,o,2),p("x","z","y",1,-1,e,n,-t,s,o,3),p("x","y","z",1,-1,e,t,n,s,r,4),p("x","y","z",-1,-1,e,t,-n,s,r,5),this.setIndex(l),this.setAttribute("position",new lt(c,3)),this.setAttribute("normal",new lt(h,3)),this.setAttribute("uv",new lt(d,2));function p(y,g,f,b,M,v,A,w,E,x,T){let C=v/E,R=A/x,L=v/2,I=A/2,V=w/2,D=E+1,q=x+1,z=0,K=0,j=new N;for(let se=0;se<q;se++){let fe=se*R-I;for(let ve=0;ve<D;ve++){let Ze=ve*C-L;j[y]=Ze*b,j[g]=fe*M,j[f]=V,c.push(j.x,j.y,j.z),j[y]=0,j[g]=0,j[f]=w>0?1:-1,h.push(j.x,j.y,j.z),d.push(ve/E),d.push(1-se/x),z+=1}}for(let se=0;se<x;se++)for(let fe=0;fe<E;fe++){let ve=u+fe+D*se,Ze=u+fe+D*(se+1),pt=u+(fe+1)+D*(se+1),Je=u+(fe+1)+D*se;l.push(ve,Ze,Je),l.push(Ze,pt,Je),K+=6}a.addGroup(m,K,T),m+=K,u+=z}}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(e){return new i(e.width,e.height,e.depth,e.widthSegments,e.heightSegments,e.depthSegments)}};function Cm(i,e,t=2){let n=e&&e.length,s=n?e[0]*t:i.length,r=qd(i,0,s,t,!0),o=[];if(!r||r.next===r.prev)return o;let a,l,c;if(n&&(r=Um(i,e,r,t)),i.length>80*t){a=i[0],l=i[1];let h=a,d=l;for(let u=t;u<s;u+=t){let m=i[u],p=i[u+1];m<a&&(a=m),p<l&&(l=p),m>h&&(h=m),p>d&&(d=p)}c=Math.max(h-a,d-l),c=c!==0?32767/c:0}return wr(r,o,t,a,l,c,0),o}function qd(i,e,t,n,s){let r;if(s===qm(i,e,t,n)>0)for(let o=e;o<t;o+=n)r=td(o/n|0,i[o],i[o+1],r);else for(let o=t-n;o>=e;o-=n)r=td(o/n|0,i[o],i[o+1],r);return r&&Ns(r,r.next)&&(Tr(r),r=r.next),r}function es(i,e){if(!i)return i;e||(e=i);let t=i,n;do if(n=!1,!t.steiner&&(Ns(t,t.next)||ft(t.prev,t,t.next)===0)){if(Tr(t),t=e=t.prev,t===t.next)break;n=!0}else t=t.next;while(n||t!==e);return e}function wr(i,e,t,n,s,r,o){if(!i)return;!o&&r&&km(i,n,s,r);let a=i;for(;i.prev!==i.next;){let l=i.prev,c=i.next;if(r?Lm(i,n,s,r):Im(i)){e.push(l.i,i.i,c.i),Tr(i),i=c.next,a=c.next;continue}if(i=c,i===a){o?o===1?(i=Dm(es(i),e),wr(i,e,t,n,s,r,2)):o===2&&Fm(i,e,t,n,s,r):wr(es(i),e,t,n,s,r,1);break}}}function Im(i){let e=i.prev,t=i,n=i.next;if(ft(e,t,n)>=0)return!1;let s=e.x,r=t.x,o=n.x,a=e.y,l=t.y,c=n.y,h=Math.min(s,r,o),d=Math.min(a,l,c),u=Math.max(s,r,o),m=Math.max(a,l,c),p=n.next;for(;p!==e;){if(p.x>=h&&p.x<=u&&p.y>=d&&p.y<=m&&sr(s,a,r,l,o,c,p.x,p.y)&&ft(p.prev,p,p.next)>=0)return!1;p=p.next}return!0}function Lm(i,e,t,n){let s=i.prev,r=i,o=i.next;if(ft(s,r,o)>=0)return!1;let a=s.x,l=r.x,c=o.x,h=s.y,d=r.y,u=o.y,m=Math.min(a,l,c),p=Math.min(h,d,u),y=Math.max(a,l,c),g=Math.max(h,d,u),f=kc(m,p,e,t,n),b=kc(y,g,e,t,n),M=i.prevZ,v=i.nextZ;for(;M&&M.z>=f&&v&&v.z<=b;){if(M.x>=m&&M.x<=y&&M.y>=p&&M.y<=g&&M!==s&&M!==o&&sr(a,h,l,d,c,u,M.x,M.y)&&ft(M.prev,M,M.next)>=0||(M=M.prevZ,v.x>=m&&v.x<=y&&v.y>=p&&v.y<=g&&v!==s&&v!==o&&sr(a,h,l,d,c,u,v.x,v.y)&&ft(v.prev,v,v.next)>=0))return!1;v=v.nextZ}for(;M&&M.z>=f;){if(M.x>=m&&M.x<=y&&M.y>=p&&M.y<=g&&M!==s&&M!==o&&sr(a,h,l,d,c,u,M.x,M.y)&&ft(M.prev,M,M.next)>=0)return!1;M=M.prevZ}for(;v&&v.z<=b;){if(v.x>=m&&v.x<=y&&v.y>=p&&v.y<=g&&v!==s&&v!==o&&sr(a,h,l,d,c,u,v.x,v.y)&&ft(v.prev,v,v.next)>=0)return!1;v=v.nextZ}return!0}function Dm(i,e){let t=i;do{let n=t.prev,s=t.next.next;!Ns(n,s)&&$d(n,t,t.next,s)&&Er(n,s)&&Er(s,n)&&(e.push(n.i,t.i,s.i),Tr(t),Tr(t.next),t=i=s),t=t.next}while(t!==i);return es(t)}function Fm(i,e,t,n,s,r){let o=i;do{let a=o.next.next;for(;a!==o.prev;){if(o.i!==a.i&&Gm(o,a)){let l=Kd(o,a);o=es(o,o.next),l=es(l,l.next),wr(o,e,t,n,s,r,0),wr(l,e,t,n,s,r,0);return}a=a.next}o=o.next}while(o!==i)}function Um(i,e,t,n){let s=[];for(let r=0,o=e.length;r<o;r++){let a=e[r]*n,l=r<o-1?e[r+1]*n:i.length,c=qd(i,a,l,n,!1);c===c.next&&(c.steiner=!0),s.push(Hm(c))}s.sort(Nm);for(let r=0;r<s.length;r++)t=Om(s[r],t);return t}function Nm(i,e){let t=i.x-e.x;if(t===0&&(t=i.y-e.y,t===0)){let n=(i.next.y-i.y)/(i.next.x-i.x),s=(e.next.y-e.y)/(e.next.x-e.x);t=n-s}return t}function Om(i,e){let t=Bm(i,e);if(!t)return e;let n=Kd(t,i);return es(n,n.next),es(t,t.next)}function Bm(i,e){let t=e,n=i.x,s=i.y,r=-1/0,o;if(Ns(i,t))return t;do{if(Ns(i,t.next))return t.next;if(s<=t.y&&s>=t.next.y&&t.next.y!==t.y){let d=t.x+(s-t.y)*(t.next.x-t.x)/(t.next.y-t.y);if(d<=n&&d>r&&(r=d,o=t.x<t.next.x?t:t.next,d===n))return o}t=t.next}while(t!==e);if(!o)return null;let a=o,l=o.x,c=o.y,h=1/0;t=o;do{if(n>=t.x&&t.x>=l&&n!==t.x&&Yd(s<c?n:r,s,l,c,s<c?r:n,s,t.x,t.y)){let d=Math.abs(s-t.y)/(n-t.x);Er(t,i)&&(d<h||d===h&&(t.x>o.x||t.x===o.x&&zm(o,t)))&&(o=t,h=d)}t=t.next}while(t!==a);return o}function zm(i,e){return ft(i.prev,i,e.prev)<0&&ft(e.next,i,i.next)<0}function km(i,e,t,n){let s=i;do s.z===0&&(s.z=kc(s.x,s.y,e,t,n)),s.prevZ=s.prev,s.nextZ=s.next,s=s.next;while(s!==i);s.prevZ.nextZ=null,s.prevZ=null,Vm(s)}function Vm(i){let e,t=1;do{let n=i,s;i=null;let r=null;for(e=0;n;){e++;let o=n,a=0;for(let c=0;c<t&&(a++,o=o.nextZ,!!o);c++);let l=t;for(;a>0||l>0&&o;)a!==0&&(l===0||!o||n.z<=o.z)?(s=n,n=n.nextZ,a--):(s=o,o=o.nextZ,l--),r?r.nextZ=s:i=s,s.prevZ=r,r=s;n=o}r.nextZ=null,t*=2}while(e>1);return i}function kc(i,e,t,n,s){return i=(i-t)*s|0,e=(e-n)*s|0,i=(i|i<<8)&16711935,i=(i|i<<4)&252645135,i=(i|i<<2)&858993459,i=(i|i<<1)&1431655765,e=(e|e<<8)&16711935,e=(e|e<<4)&252645135,e=(e|e<<2)&858993459,e=(e|e<<1)&1431655765,i|e<<1}function Hm(i){let e=i,t=i;do(e.x<t.x||e.x===t.x&&e.y<t.y)&&(t=e),e=e.next;while(e!==i);return t}function Yd(i,e,t,n,s,r,o,a){return(s-o)*(e-a)>=(i-o)*(r-a)&&(i-o)*(n-a)>=(t-o)*(e-a)&&(t-o)*(r-a)>=(s-o)*(n-a)}function sr(i,e,t,n,s,r,o,a){return!(i===o&&e===a)&&Yd(i,e,t,n,s,r,o,a)}function Gm(i,e){return i.next.i!==e.i&&i.prev.i!==e.i&&!Wm(i,e)&&(Er(i,e)&&Er(e,i)&&Xm(i,e)&&(ft(i.prev,i,e.prev)||ft(i,e.prev,e))||Ns(i,e)&&ft(i.prev,i,i.next)>0&&ft(e.prev,e,e.next)>0)}function ft(i,e,t){return(e.y-i.y)*(t.x-e.x)-(e.x-i.x)*(t.y-e.y)}function Ns(i,e){return i.x===e.x&&i.y===e.y}function $d(i,e,t,n){let s=ko(ft(i,e,t)),r=ko(ft(i,e,n)),o=ko(ft(t,n,i)),a=ko(ft(t,n,e));return!!(s!==r&&o!==a||s===0&&zo(i,t,e)||r===0&&zo(i,n,e)||o===0&&zo(t,i,n)||a===0&&zo(t,e,n))}function zo(i,e,t){return e.x<=Math.max(i.x,t.x)&&e.x>=Math.min(i.x,t.x)&&e.y<=Math.max(i.y,t.y)&&e.y>=Math.min(i.y,t.y)}function ko(i){return i>0?1:i<0?-1:0}function Wm(i,e){let t=i;do{if(t.i!==i.i&&t.next.i!==i.i&&t.i!==e.i&&t.next.i!==e.i&&$d(t,t.next,i,e))return!0;t=t.next}while(t!==i);return!1}function Er(i,e){return ft(i.prev,i,i.next)<0?ft(i,e,i.next)>=0&&ft(i,i.prev,e)>=0:ft(i,e,i.prev)<0||ft(i,i.next,e)<0}function Xm(i,e){let t=i,n=!1,s=(i.x+e.x)/2,r=(i.y+e.y)/2;do t.y>r!=t.next.y>r&&t.next.y!==t.y&&s<(t.next.x-t.x)*(r-t.y)/(t.next.y-t.y)+t.x&&(n=!n),t=t.next;while(t!==i);return n}function Kd(i,e){let t=Vc(i.i,i.x,i.y),n=Vc(e.i,e.x,e.y),s=i.next,r=e.prev;return i.next=e,e.prev=i,t.next=s,s.prev=t,n.next=t,t.prev=n,r.next=n,n.prev=r,n}function td(i,e,t,n){let s=Vc(i,e,t);return n?(s.next=n.next,s.prev=n,n.next.prev=s,n.next=s):(s.prev=s,s.next=s),s}function Tr(i){i.next.prev=i.prev,i.prev.next=i.next,i.prevZ&&(i.prevZ.nextZ=i.nextZ),i.nextZ&&(i.nextZ.prevZ=i.prevZ)}function Vc(i,e,t){return{i,x:e,y:t,prev:null,next:null,z:0,prevZ:null,nextZ:null,steiner:!1}}function qm(i,e,t,n){let s=0;for(let r=e,o=t-n;r<t;r+=n)s+=(i[o]-i[r])*(i[r+1]+i[o+1]),o=r;return s}var Hc=class{static triangulate(e,t,n=2){return Cm(e,t,n)}},Ar=class i{static area(e){let t=e.length,n=0;for(let s=t-1,r=0;r<t;s=r++)n+=e[s].x*e[r].y-e[r].x*e[s].y;return n*.5}static isClockWise(e){return i.area(e)<0}static triangulateShape(e,t){let n=[],s=[],r=[];nd(e),id(n,e);let o=e.length;t.forEach(nd);for(let l=0;l<t.length;l++)s.push(o),o+=t[l].length,id(n,t[l]);let a=Hc.triangulate(n,s);for(let l=0;l<a.length;l+=3)r.push(a.slice(l,l+3));return r}};function nd(i){let e=i.length;e>2&&i[e-1].equals(i[0])&&i.pop()}function id(i,e){for(let t=0;t<e.length;t++)i.push(e[t].x),i.push(e[t].y)}var ts=class i extends It{constructor(e=1,t=1,n=1,s=1){super(),this.type="PlaneGeometry",this.parameters={width:e,height:t,widthSegments:n,heightSegments:s};let r=e/2,o=t/2,a=Math.floor(n),l=Math.floor(s),c=a+1,h=l+1,d=e/a,u=t/l,m=[],p=[],y=[],g=[];for(let f=0;f<h;f++){let b=f*u-o;for(let M=0;M<c;M++){let v=M*d-r;p.push(v,-b,0),y.push(0,0,1),g.push(M/a),g.push(1-f/l)}}for(let f=0;f<l;f++)for(let b=0;b<a;b++){let M=b+c*f,v=b+c*(f+1),A=b+1+c*(f+1),w=b+1+c*f;m.push(M,v,w),m.push(v,A,w)}this.setIndex(m),this.setAttribute("position",new lt(p,3)),this.setAttribute("normal",new lt(y,3)),this.setAttribute("uv",new lt(g,2))}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(e){return new i(e.width,e.height,e.widthSegments,e.heightSegments)}},Pr=class i extends It{constructor(e=.5,t=1,n=32,s=1,r=0,o=Math.PI*2){super(),this.type="RingGeometry",this.parameters={innerRadius:e,outerRadius:t,thetaSegments:n,phiSegments:s,thetaStart:r,thetaLength:o},n=Math.max(3,n),s=Math.max(1,s);let a=[],l=[],c=[],h=[],d=e,u=(t-e)/s,m=new N,p=new Ge;for(let y=0;y<=s;y++){for(let g=0;g<=n;g++){let f=r+g/n*o;m.x=d*Math.cos(f),m.y=d*Math.sin(f),l.push(m.x,m.y,m.z),c.push(0,0,1),p.x=(m.x/t+1)/2,p.y=(m.y/t+1)/2,h.push(p.x,p.y)}d+=u}for(let y=0;y<s;y++){let g=y*(n+1);for(let f=0;f<n;f++){let b=f+g,M=b,v=b+n+1,A=b+n+2,w=b+1;a.push(M,v,w),a.push(v,A,w)}}this.setIndex(a),this.setAttribute("position",new lt(l,3)),this.setAttribute("normal",new lt(c,3)),this.setAttribute("uv",new lt(h,2))}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(e){return new i(e.innerRadius,e.outerRadius,e.thetaSegments,e.phiSegments,e.thetaStart,e.thetaLength)}};var Os=class i extends It{constructor(e=1,t=32,n=16,s=0,r=Math.PI*2,o=0,a=Math.PI){super(),this.type="SphereGeometry",this.parameters={radius:e,widthSegments:t,heightSegments:n,phiStart:s,phiLength:r,thetaStart:o,thetaLength:a},t=Math.max(3,Math.floor(t)),n=Math.max(2,Math.floor(n));let l=Math.min(o+a,Math.PI),c=0,h=[],d=new N,u=new N,m=[],p=[],y=[],g=[];for(let f=0;f<=n;f++){let b=[],M=f/n,v=o+M*a,A=e*Math.cos(v),w=Math.sqrt(e*e-A*A),E=0;f===0&&o===0?E=.5/t:f===n&&l===Math.PI&&(E=-.5/t);for(let x=0;x<=t;x++){let T=x/t,C=s+T*r;d.x=-w*Math.cos(C),d.y=A,d.z=w*Math.sin(C),p.push(d.x,d.y,d.z),u.copy(d).normalize(),y.push(u.x,u.y,u.z),g.push(T+E,1-M),b.push(c++)}h.push(b)}for(let f=0;f<n;f++)for(let b=0;b<t;b++){let M=h[f][b+1],v=h[f][b],A=h[f+1][b],w=h[f+1][b+1];(f!==0||o>0)&&m.push(M,v,w),(f!==n-1||l<Math.PI)&&m.push(v,A,w)}this.setIndex(m),this.setAttribute("position",new lt(p,3)),this.setAttribute("normal",new lt(y,3)),this.setAttribute("uv",new lt(g,2))}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(e){return new i(e.radius,e.widthSegments,e.heightSegments,e.phiStart,e.phiLength,e.thetaStart,e.thetaLength)}};var Rr=class extends It{constructor(e=null){if(super(),this.type="WireframeGeometry",this.parameters={geometry:e},e!==null){let t=[],n=new Set,s=new N,r=new N;if(e.index!==null){let o=e.attributes.position,a=e.index,l=e.groups;l.length===0&&(l=[{start:0,count:a.count,materialIndex:0}]);for(let c=0,h=l.length;c<h;++c){let d=l[c],u=d.start,m=d.count;for(let p=u,y=u+m;p<y;p+=3)for(let g=0;g<3;g++){let f=a.getX(p+g),b=a.getX(p+(g+1)%3);s.fromBufferAttribute(o,f),r.fromBufferAttribute(o,b),sd(s,r,n)===!0&&(t.push(s.x,s.y,s.z),t.push(r.x,r.y,r.z))}}}else{let o=e.attributes.position;for(let a=0,l=o.count/3;a<l;a++)for(let c=0;c<3;c++){let h=3*a+c,d=3*a+(c+1)%3;s.fromBufferAttribute(o,h),r.fromBufferAttribute(o,d),sd(s,r,n)===!0&&(t.push(s.x,s.y,s.z),t.push(r.x,r.y,r.z))}}this.setAttribute("position",new lt(t,3))}}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}};function sd(i,e,t){let n=`${i.x},${i.y},${i.z}-${e.x},${e.y},${e.z}`,s=`${e.x},${e.y},${e.z}-${i.x},${i.y},${i.z}`;return t.has(n)===!0||t.has(s)===!0?!1:(t.add(n),t.add(s),!0)}function ss(i){let e={};for(let t in i){e[t]={};for(let n in i[t]){let s=i[t][n];if(rd(s))s.isRenderTargetTexture?(Ae("UniformsUtils: Textures of render targets cannot be cloned via cloneUniforms() or mergeUniforms()."),e[t][n]=null):e[t][n]=s.clone();else if(Array.isArray(s))if(rd(s[0])){let r=[];for(let o=0,a=s.length;o<a;o++)r[o]=s[o].clone();e[t][n]=r}else e[t][n]=s.slice();else e[t][n]=s}}return e}function $t(i){let e={};for(let t=0;t<i.length;t++){let n=ss(i[t]);for(let s in n)e[s]=n[s]}return e}function rd(i){return i&&(i.isColor||i.isMatrix3||i.isMatrix4||i.isVector2||i.isVector3||i.isVector4||i.isTexture||i.isQuaternion)}function Ym(i){let e=[];for(let t=0;t<i.length;t++)e.push(i[t].clone());return e}function mh(i){let e=i.getRenderTarget();return e===null?i.outputColorSpace:e.isXRRenderTarget===!0?e.texture.colorSpace:qe.workingColorSpace}var Gr={clone:ss,merge:$t},$m=`void main() {
	gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
}`,Km=`void main() {
	gl_FragColor = vec4( 1.0, 0.0, 0.0, 1.0 );
}`,kt=class extends Ri{constructor(e){super(),this.isShaderMaterial=!0,this.type="ShaderMaterial",this.defines={},this.uniforms={},this.uniformsGroups=[],this.vertexShader=$m,this.fragmentShader=Km,this.linewidth=1,this.wireframe=!1,this.wireframeLinewidth=1,this.fog=!1,this.lights=!1,this.clipping=!1,this.forceSinglePass=!0,this.extensions={clipCullDistance:!1,multiDraw:!1},this.defaultAttributeValues={color:[1,1,1],uv:[0,0],uv1:[0,0]},this.index0AttributeName=void 0,this.uniformsNeedUpdate=!1,this.glslVersion=null,e!==void 0&&this.setValues(e)}copy(e){return super.copy(e),this.fragmentShader=e.fragmentShader,this.vertexShader=e.vertexShader,this.uniforms=ss(e.uniforms),this.uniformsGroups=Ym(e.uniformsGroups),this.defines=Object.assign({},e.defines),this.wireframe=e.wireframe,this.wireframeLinewidth=e.wireframeLinewidth,this.fog=e.fog,this.lights=e.lights,this.clipping=e.clipping,this.extensions=Object.assign({},e.extensions),this.glslVersion=e.glslVersion,this.defaultAttributeValues=Object.assign({},e.defaultAttributeValues),this.index0AttributeName=e.index0AttributeName,this.uniformsNeedUpdate=e.uniformsNeedUpdate,this}toJSON(e){let t=super.toJSON(e);t.glslVersion=this.glslVersion,t.uniforms={};for(let s in this.uniforms){let o=this.uniforms[s].value;o&&o.isTexture?t.uniforms[s]={type:"t",value:o.toJSON(e).uuid}:o&&o.isColor?t.uniforms[s]={type:"c",value:o.getHex()}:o&&o.isVector2?t.uniforms[s]={type:"v2",value:o.toArray()}:o&&o.isVector3?t.uniforms[s]={type:"v3",value:o.toArray()}:o&&o.isVector4?t.uniforms[s]={type:"v4",value:o.toArray()}:o&&o.isMatrix3?t.uniforms[s]={type:"m3",value:o.toArray()}:o&&o.isMatrix4?t.uniforms[s]={type:"m4",value:o.toArray()}:t.uniforms[s]={value:o}}Object.keys(this.defines).length>0&&(t.defines=this.defines),t.vertexShader=this.vertexShader,t.fragmentShader=this.fragmentShader,t.lights=this.lights,t.clipping=this.clipping;let n={};for(let s in this.extensions)this.extensions[s]===!0&&(n[s]=!0);return Object.keys(n).length>0&&(t.extensions=n),t}fromJSON(e,t){if(super.fromJSON(e,t),e.uniforms!==void 0)for(let n in e.uniforms){let s=e.uniforms[n];switch(this.uniforms[n]={},s.type){case"t":this.uniforms[n].value=t[s.value]||null;break;case"c":this.uniforms[n].value=new We().setHex(s.value);break;case"v2":this.uniforms[n].value=new Ge().fromArray(s.value);break;case"v3":this.uniforms[n].value=new N().fromArray(s.value);break;case"v4":this.uniforms[n].value=new nt().fromArray(s.value);break;case"m3":this.uniforms[n].value=new Ue().fromArray(s.value);break;case"m4":this.uniforms[n].value=new at().fromArray(s.value);break;default:this.uniforms[n].value=s.value}}if(e.defines!==void 0&&(this.defines=e.defines),e.vertexShader!==void 0&&(this.vertexShader=e.vertexShader),e.fragmentShader!==void 0&&(this.fragmentShader=e.fragmentShader),e.glslVersion!==void 0&&(this.glslVersion=e.glslVersion),e.extensions!==void 0)for(let n in e.extensions)this.extensions[n]=e.extensions[n];return e.lights!==void 0&&(this.lights=e.lights),e.clipping!==void 0&&(this.clipping=e.clipping),this}},fa=class extends kt{constructor(e){super(e),this.isRawShaderMaterial=!0,this.type="RawShaderMaterial"}};var pa=class extends Ri{constructor(e){super(),this.isMeshDepthMaterial=!0,this.type="MeshDepthMaterial",this.depthPacking=Dd,this.map=null,this.alphaMap=null,this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.wireframe=!1,this.wireframeLinewidth=1,this.setValues(e)}copy(e){return super.copy(e),this.depthPacking=e.depthPacking,this.map=e.map,this.alphaMap=e.alphaMap,this.displacementMap=e.displacementMap,this.displacementScale=e.displacementScale,this.displacementBias=e.displacementBias,this.wireframe=e.wireframe,this.wireframeLinewidth=e.wireframeLinewidth,this}},ma=class extends Ri{constructor(e){super(),this.isMeshDistanceMaterial=!0,this.type="MeshDistanceMaterial",this.map=null,this.alphaMap=null,this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.setValues(e)}copy(e){return super.copy(e),this.map=e.map,this.alphaMap=e.alphaMap,this.displacementMap=e.displacementMap,this.displacementScale=e.displacementScale,this.displacementBias=e.displacementBias,this}};function Vo(i,e){return!i||i.constructor===e?i:typeof e.BYTES_PER_ELEMENT=="number"?new e(i):Array.prototype.slice.call(i)}var Ci=class{constructor(e,t,n,s){this.parameterPositions=e,this._cachedIndex=0,this.resultBuffer=s!==void 0?s:new t.constructor(n),this.sampleValues=t,this.valueSize=n,this.settings=null,this.DefaultSettings_={}}evaluate(e){let t=this.parameterPositions,n=this._cachedIndex,s=t[n],r=t[n-1];n:{e:{let o;t:{i:if(!(e<s)){for(let a=n+2;;){if(s===void 0){if(e<r)break i;return n=t.length,this._cachedIndex=n,this.copySampleValue_(n-1)}if(n===a)break;if(r=s,s=t[++n],e<s)break e}o=t.length;break t}if(!(e>=r)){let a=t[1];e<a&&(n=2,r=a);for(let l=n-2;;){if(r===void 0)return this._cachedIndex=0,this.copySampleValue_(0);if(n===l)break;if(s=r,r=t[--n-1],e>=r)break e}o=n,n=0;break t}break n}for(;n<o;){let a=n+o>>>1;e<t[a]?o=a:n=a+1}if(s=t[n],r=t[n-1],r===void 0)return this._cachedIndex=0,this.copySampleValue_(0);if(s===void 0)return n=t.length,this._cachedIndex=n,this.copySampleValue_(n-1)}this._cachedIndex=n,this.intervalChanged_(n,r,s)}return this.interpolate_(n,r,e,s)}getSettings_(){return this.settings||this.DefaultSettings_}copySampleValue_(e){let t=this.resultBuffer,n=this.sampleValues,s=this.valueSize,r=e*s;for(let o=0;o!==s;++o)t[o]=n[r+o];return t}interpolate_(){throw new Error("THREE.Interpolant: Call to abstract method.")}intervalChanged_(){}},ga=class extends Ci{constructor(e,t,n,s){super(e,t,n,s),this._weightPrev=-0,this._offsetPrev=-0,this._weightNext=-0,this._offsetNext=-0,this.DefaultSettings_={endingStart:Nc,endingEnd:Nc}}intervalChanged_(e,t,n){let s=this.parameterPositions,r=e-2,o=e+1,a=s[r],l=s[o];if(a===void 0)switch(this.getSettings_().endingStart){case Oc:r=e,a=2*t-n;break;case Bc:r=s.length-2,a=t+s[r]-s[r+1];break;default:r=e,a=n}if(l===void 0)switch(this.getSettings_().endingEnd){case Oc:o=e,l=2*n-t;break;case Bc:o=1,l=n+s[1]-s[0];break;default:o=e-1,l=t}let c=(n-t)*.5,h=this.valueSize;this._weightPrev=c/(t-a),this._weightNext=c/(l-n),this._offsetPrev=r*h,this._offsetNext=o*h}interpolate_(e,t,n,s){let r=this.resultBuffer,o=this.sampleValues,a=this.valueSize,l=e*a,c=l-a,h=this._offsetPrev,d=this._offsetNext,u=this._weightPrev,m=this._weightNext,p=(n-t)/(s-t),y=p*p,g=y*p,f=-u*g+2*u*y-u*p,b=(1+u)*g+(-1.5-2*u)*y+(-.5+u)*p+1,M=(-1-m)*g+(1.5+m)*y+.5*p,v=m*g-m*y;for(let A=0;A!==a;++A)r[A]=f*o[h+A]+b*o[c+A]+M*o[l+A]+v*o[d+A];return r}},xa=class extends Ci{constructor(e,t,n,s){super(e,t,n,s)}interpolate_(e,t,n,s){let r=this.resultBuffer,o=this.sampleValues,a=this.valueSize,l=e*a,c=l-a,h=(n-t)/(s-t),d=1-h;for(let u=0;u!==a;++u)r[u]=o[c+u]*d+o[l+u]*h;return r}},ya=class extends Ci{constructor(e,t,n,s){super(e,t,n,s)}interpolate_(e){return this.copySampleValue_(e-1)}},va=class extends Ci{interpolate_(e,t,n,s){let r=this.resultBuffer,o=this.sampleValues,a=this.valueSize,l=e*a,c=l-a,h=this.inTangents,d=this.outTangents;if(!h||!d){let p=(n-t)/(s-t),y=1-p;for(let g=0;g!==a;++g)r[g]=o[c+g]*y+o[l+g]*p;return r}let u=a*2,m=e-1;for(let p=0;p!==a;++p){let y=o[c+p],g=o[l+p],f=m*u+p*2,b=d[f],M=d[f+1],v=e*u+p*2,A=h[v],w=h[v+1],E=(n-t)/(s-t),x,T,C,R,L;for(let I=0;I<8;I++){x=E*E,T=x*E,C=1-E,R=C*C,L=R*C;let D=L*t+3*R*E*b+3*C*x*A+T*s-n;if(Math.abs(D)<1e-10)break;let q=3*R*(b-t)+6*C*E*(A-b)+3*x*(s-A);if(Math.abs(q)<1e-10)break;E=E-D/q,E=Math.max(0,Math.min(1,E))}r[p]=L*y+3*R*E*M+3*C*x*w+T*g}return r}},fn=class{constructor(e,t,n,s){if(e===void 0)throw new Error("THREE.KeyframeTrack: track name is undefined");if(t===void 0||t.length===0)throw new Error("THREE.KeyframeTrack: no keyframes in track named "+e);this.name=e,this.times=Vo(t,this.TimeBufferType),this.values=Vo(n,this.ValueBufferType),this.setInterpolation(s||this.DefaultInterpolation)}static toJSON(e){let t=e.constructor,n;if(t.toJSON!==this.toJSON)n=t.toJSON(e);else{n={name:e.name,times:Vo(e.times,Array),values:Vo(e.values,Array)};let s=e.getInterpolation();s!==e.DefaultInterpolation&&(n.interpolation=s)}return n.type=e.ValueTypeName,n}InterpolantFactoryMethodDiscrete(e){return new ya(this.times,this.values,this.getValueSize(),e)}InterpolantFactoryMethodLinear(e){return new xa(this.times,this.values,this.getValueSize(),e)}InterpolantFactoryMethodSmooth(e){return new ga(this.times,this.values,this.getValueSize(),e)}InterpolantFactoryMethodBezier(e){let t=new va(this.times,this.values,this.getValueSize(),e);return this.settings&&(t.inTangents=this.settings.inTangents,t.outTangents=this.settings.outTangents),t}setInterpolation(e){let t;switch(e){case ar:t=this.InterpolantFactoryMethodDiscrete;break;case ia:t=this.InterpolantFactoryMethodLinear;break;case Xo:t=this.InterpolantFactoryMethodSmooth;break;case Uc:t=this.InterpolantFactoryMethodBezier;break}if(t===void 0){let n="unsupported interpolation for "+this.ValueTypeName+" keyframe track named "+this.name;if(this.createInterpolant===void 0)if(e!==this.DefaultInterpolation)this.setInterpolation(this.DefaultInterpolation);else throw new Error(n);return Ae("KeyframeTrack:",n),this}return this.createInterpolant=t,this}getInterpolation(){switch(this.createInterpolant){case this.InterpolantFactoryMethodDiscrete:return ar;case this.InterpolantFactoryMethodLinear:return ia;case this.InterpolantFactoryMethodSmooth:return Xo;case this.InterpolantFactoryMethodBezier:return Uc}}getValueSize(){return this.values.length/this.times.length}shift(e){if(e!==0){let t=this.times;for(let n=0,s=t.length;n!==s;++n)t[n]+=e}return this}scale(e){if(e!==1){let t=this.times;for(let n=0,s=t.length;n!==s;++n)t[n]*=e}return this}trim(e,t){let n=this.times,s=n.length,r=0,o=s-1;for(;r!==s&&n[r]<e;)++r;for(;o!==-1&&n[o]>t;)--o;if(++o,r!==0||o!==s){r>=o&&(o=Math.max(o,1),r=o-1);let a=this.getValueSize();this.times=n.slice(r,o),this.values=this.values.slice(r*a,o*a)}return this}validate(){let e=!0,t=this.getValueSize();t-Math.floor(t)!==0&&(Le("KeyframeTrack: Invalid value size in track.",this),e=!1);let n=this.times,s=this.values,r=n.length;r===0&&(Le("KeyframeTrack: Track is empty.",this),e=!1);let o=null;for(let a=0;a!==r;a++){let l=n[a];if(typeof l=="number"&&isNaN(l)){Le("KeyframeTrack: Time is not a valid number.",this,a,l),e=!1;break}if(o!==null&&o>l){Le("KeyframeTrack: Out of order keys.",this,a,l,o),e=!1;break}o=l}if(s!==void 0&&Kp(s))for(let a=0,l=s.length;a!==l;++a){let c=s[a];if(isNaN(c)){Le("KeyframeTrack: Value is not a valid number.",this,a,c),e=!1;break}}return e}optimize(){let e=this.times.slice(),t=this.values.slice(),n=this.getValueSize(),s=this.getInterpolation()===Xo,r=e.length-1,o=1;for(let a=1;a<r;++a){let l=!1,c=e[a],h=e[a+1];if(c!==h&&(a!==1||c!==e[0]))if(s)l=!0;else{let d=a*n,u=d-n,m=d+n;for(let p=0;p!==n;++p){let y=t[d+p];if(y!==t[u+p]||y!==t[m+p]){l=!0;break}}}if(l){if(a!==o){e[o]=e[a];let d=a*n,u=o*n;for(let m=0;m!==n;++m)t[u+m]=t[d+m]}++o}}if(r>0){e[o]=e[r];for(let a=r*n,l=o*n,c=0;c!==n;++c)t[l+c]=t[a+c];++o}return o!==e.length?(this.times=e.slice(0,o),this.values=t.slice(0,o*n)):(this.times=e,this.values=t),this}clone(){let e=this.times.slice(),t=this.values.slice(),n=this.constructor,s=new n(this.name,e,t);return s.createInterpolant=this.createInterpolant,s}};fn.prototype.ValueTypeName="";fn.prototype.TimeBufferType=Float32Array;fn.prototype.ValueBufferType=Float32Array;fn.prototype.DefaultInterpolation=ia;var Ii=class extends fn{constructor(e,t,n){super(e,t,n)}};Ii.prototype.ValueTypeName="bool";Ii.prototype.ValueBufferType=Array;Ii.prototype.DefaultInterpolation=ar;Ii.prototype.InterpolantFactoryMethodLinear=void 0;Ii.prototype.InterpolantFactoryMethodSmooth=void 0;var _a=class extends fn{constructor(e,t,n,s){super(e,t,n,s)}};_a.prototype.ValueTypeName="color";var ba=class extends fn{constructor(e,t,n,s){super(e,t,n,s)}};ba.prototype.ValueTypeName="number";var Ma=class extends Ci{constructor(e,t,n,s){super(e,t,n,s)}interpolate_(e,t,n,s){let r=this.resultBuffer,o=this.sampleValues,a=this.valueSize,l=(n-t)/(s-t),c=e*a;for(let h=c+a;c!==h;c+=4)Gn.slerpFlat(r,0,o,c-a,o,c,l);return r}},Cr=class extends fn{constructor(e,t,n,s){super(e,t,n,s)}InterpolantFactoryMethodLinear(e){return new Ma(this.times,this.values,this.getValueSize(),e)}};Cr.prototype.ValueTypeName="quaternion";Cr.prototype.InterpolantFactoryMethodSmooth=void 0;var Li=class extends fn{constructor(e,t,n){super(e,t,n)}};Li.prototype.ValueTypeName="string";Li.prototype.ValueBufferType=Array;Li.prototype.DefaultInterpolation=ar;Li.prototype.InterpolantFactoryMethodLinear=void 0;Li.prototype.InterpolantFactoryMethodSmooth=void 0;var Sa=class extends fn{constructor(e,t,n,s){super(e,t,n,s)}};Sa.prototype.ValueTypeName="vector";var wa=class{constructor(e,t,n){let s=this,r=!1,o=0,a=0,l,c=[];this.onStart=void 0,this.onLoad=e,this.onProgress=t,this.onError=n,this._abortController=null,this.itemStart=function(h){a++,r===!1&&s.onStart!==void 0&&s.onStart(h,o,a),r=!0},this.itemEnd=function(h){o++,s.onProgress!==void 0&&s.onProgress(h,o,a),o===a&&(r=!1,s.onLoad!==void 0&&s.onLoad())},this.itemError=function(h){s.onError!==void 0&&s.onError(h)},this.resolveURL=function(h){return h=h.normalize("NFC"),l?l(h):h},this.setURLModifier=function(h){return l=h,this},this.addHandler=function(h,d){return c.push(h,d),this},this.removeHandler=function(h){let d=c.indexOf(h);return d!==-1&&c.splice(d,2),this},this.getHandler=function(h){for(let d=0,u=c.length;d<u;d+=2){let m=c[d],p=c[d+1];if(m.global&&(m.lastIndex=0),m.test(h))return p}return null},this.abort=function(){return this.abortController.abort(),this._abortController=null,this}}get abortController(){return this._abortController||(this._abortController=new AbortController),this._abortController}},Zd=new wa,Ea=class{constructor(e){this.manager=e!==void 0?e:Zd,this.crossOrigin="anonymous",this.withCredentials=!1,this.path="",this.resourcePath="",this.requestHeader={},typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("observe",{detail:this}))}load(){}loadAsync(e,t){let n=this;return new Promise(function(s,r){n.load(e,s,t,r)})}parse(){}setCrossOrigin(e){return this.crossOrigin=e,this}setWithCredentials(e){return this.withCredentials=e,this}setPath(e){return this.path=e,this}setResourcePath(e){return this.resourcePath=e,this}setRequestHeader(e){return this.requestHeader=e,this}abort(){return this}};Ea.DEFAULT_MATERIAL_NAME="__DEFAULT";var Ho=new N,Go=new Gn,Bn=new N,Ir=class extends un{constructor(){super(),this.isCamera=!0,this.type="Camera",this.matrixWorldInverse=new at,this.projectionMatrix=new at,this.projectionMatrixInverse=new at,this.coordinateSystem=An,this._reversedDepth=!1}get reversedDepth(){return this._reversedDepth}copy(e,t){return super.copy(e,t),this.matrixWorldInverse.copy(e.matrixWorldInverse),this.projectionMatrix.copy(e.projectionMatrix),this.projectionMatrixInverse.copy(e.projectionMatrixInverse),this.coordinateSystem=e.coordinateSystem,this}getWorldDirection(e){return super.getWorldDirection(e).negate()}updateMatrixWorld(e){super.updateMatrixWorld(e),this.matrixWorld.decompose(Ho,Go,Bn),Bn.x===1&&Bn.y===1&&Bn.z===1?this.matrixWorldInverse.copy(this.matrixWorld).invert():this.matrixWorldInverse.compose(Ho,Go,Bn.set(1,1,1)).invert()}updateWorldMatrix(e,t,n=!1){super.updateWorldMatrix(e,t,n),this.matrixWorld.decompose(Ho,Go,Bn),Bn.x===1&&Bn.y===1&&Bn.z===1?this.matrixWorldInverse.copy(this.matrixWorld).invert():this.matrixWorldInverse.compose(Ho,Go,Bn.set(1,1,1)).invert()}clone(){return new this.constructor().copy(this)}},Ei=new N,od=new Ge,ad=new Ge,Yt=class extends Ir{constructor(e=50,t=1,n=.1,s=2e3){super(),this.isPerspectiveCamera=!0,this.type="PerspectiveCamera",this.fov=e,this.zoom=1,this.near=n,this.far=s,this.focus=10,this.aspect=t,this.view=null,this.filmGauge=35,this.filmOffset=0,this.updateProjectionMatrix()}copy(e,t){return super.copy(e,t),this.fov=e.fov,this.zoom=e.zoom,this.near=e.near,this.far=e.far,this.focus=e.focus,this.aspect=e.aspect,this.view=e.view===null?null:Object.assign({},e.view),this.filmGauge=e.filmGauge,this.filmOffset=e.filmOffset,this}setFocalLength(e){let t=.5*this.getFilmHeight()/e;this.fov=Is*2*Math.atan(t),this.updateProjectionMatrix()}getFocalLength(){let e=Math.tan(rr*.5*this.fov);return .5*this.getFilmHeight()/e}getEffectiveFOV(){return Is*2*Math.atan(Math.tan(rr*.5*this.fov)/this.zoom)}getFilmWidth(){return this.filmGauge*Math.min(this.aspect,1)}getFilmHeight(){return this.filmGauge/Math.max(this.aspect,1)}getViewBounds(e,t,n){Ei.set(-1,-1,.5).applyMatrix4(this.projectionMatrixInverse),t.set(Ei.x,Ei.y).multiplyScalar(-e/Ei.z),Ei.set(1,1,.5).applyMatrix4(this.projectionMatrixInverse),n.set(Ei.x,Ei.y).multiplyScalar(-e/Ei.z)}getViewSize(e,t){return this.getViewBounds(e,od,ad),t.subVectors(ad,od)}setViewOffset(e,t,n,s,r,o){this.aspect=e/t,this.view===null&&(this.view={enabled:!0,fullWidth:1,fullHeight:1,offsetX:0,offsetY:0,width:1,height:1}),this.view.enabled=!0,this.view.fullWidth=e,this.view.fullHeight=t,this.view.offsetX=n,this.view.offsetY=s,this.view.width=r,this.view.height=o,this.updateProjectionMatrix()}clearViewOffset(){this.view!==null&&(this.view.enabled=!1),this.updateProjectionMatrix()}updateProjectionMatrix(){let e=this.near,t=e*Math.tan(rr*.5*this.fov)/this.zoom,n=2*t,s=this.aspect*n,r=-.5*s,o=this.view;if(this.view!==null&&this.view.enabled){let l=o.fullWidth,c=o.fullHeight;r+=o.offsetX*s/l,t-=o.offsetY*n/c,s*=o.width/l,n*=o.height/c}let a=this.filmOffset;a!==0&&(r+=e*a/this.getFilmWidth()),this.projectionMatrix.makePerspective(r,r+s,t,t-n,e,this.far,this.coordinateSystem,this.reversedDepth),this.projectionMatrixInverse.copy(this.projectionMatrix).invert()}toJSON(e){let t=super.toJSON(e);return t.object.fov=this.fov,t.object.zoom=this.zoom,t.object.near=this.near,t.object.far=this.far,t.object.focus=this.focus,t.object.aspect=this.aspect,this.view!==null&&(t.object.view=Object.assign({},this.view)),t.object.filmGauge=this.filmGauge,t.object.filmOffset=this.filmOffset,t}};var ns=class extends Ir{constructor(e=-1,t=1,n=1,s=-1,r=.1,o=2e3){super(),this.isOrthographicCamera=!0,this.type="OrthographicCamera",this.zoom=1,this.view=null,this.left=e,this.right=t,this.top=n,this.bottom=s,this.near=r,this.far=o,this.updateProjectionMatrix()}copy(e,t){return super.copy(e,t),this.left=e.left,this.right=e.right,this.top=e.top,this.bottom=e.bottom,this.near=e.near,this.far=e.far,this.zoom=e.zoom,this.view=e.view===null?null:Object.assign({},e.view),this}setViewOffset(e,t,n,s,r,o){this.view===null&&(this.view={enabled:!0,fullWidth:1,fullHeight:1,offsetX:0,offsetY:0,width:1,height:1}),this.view.enabled=!0,this.view.fullWidth=e,this.view.fullHeight=t,this.view.offsetX=n,this.view.offsetY=s,this.view.width=r,this.view.height=o,this.updateProjectionMatrix()}clearViewOffset(){this.view!==null&&(this.view.enabled=!1),this.updateProjectionMatrix()}updateProjectionMatrix(){let e=(this.right-this.left)/(2*this.zoom),t=(this.top-this.bottom)/(2*this.zoom),n=(this.right+this.left)/2,s=(this.top+this.bottom)/2,r=n-e,o=n+e,a=s+t,l=s-t;if(this.view!==null&&this.view.enabled){let c=(this.right-this.left)/this.view.fullWidth/this.zoom,h=(this.top-this.bottom)/this.view.fullHeight/this.zoom;r+=c*this.view.offsetX,o=r+c*this.view.width,a-=h*this.view.offsetY,l=a-h*this.view.height}this.projectionMatrix.makeOrthographic(r,o,a,l,this.near,this.far,this.coordinateSystem,this.reversedDepth),this.projectionMatrixInverse.copy(this.projectionMatrix).invert()}toJSON(e){let t=super.toJSON(e);return t.object.zoom=this.zoom,t.object.left=this.left,t.object.right=this.right,t.object.top=this.top,t.object.bottom=this.bottom,t.object.near=this.near,t.object.far=this.far,this.view!==null&&(t.object.view=Object.assign({},this.view)),t}};var Lr=class extends It{constructor(){super(),this.isInstancedBufferGeometry=!0,this.type="InstancedBufferGeometry",this.instanceCount=1/0}copy(e){return super.copy(e),this.instanceCount=e.instanceCount,this}toJSON(){let e=super.toJSON();return e.instanceCount=this.instanceCount,e.isInstancedBufferGeometry=!0,e}};var Es=-90,Ts=1,Ta=class extends un{constructor(e,t,n){super(),this.type="CubeCamera",this.renderTarget=n,this.coordinateSystem=null,this.activeMipmapLevel=0;let s=new Yt(Es,Ts,e,t);s.layers=this.layers,this.add(s);let r=new Yt(Es,Ts,e,t);r.layers=this.layers,this.add(r);let o=new Yt(Es,Ts,e,t);o.layers=this.layers,this.add(o);let a=new Yt(Es,Ts,e,t);a.layers=this.layers,this.add(a);let l=new Yt(Es,Ts,e,t);l.layers=this.layers,this.add(l);let c=new Yt(Es,Ts,e,t);c.layers=this.layers,this.add(c)}updateCoordinateSystem(){let e=this.coordinateSystem,t=this.children.concat(),[n,s,r,o,a,l]=t;for(let c of t)this.remove(c);if(e===An)n.up.set(0,1,0),n.lookAt(1,0,0),s.up.set(0,1,0),s.lookAt(-1,0,0),r.up.set(0,0,-1),r.lookAt(0,1,0),o.up.set(0,0,1),o.lookAt(0,-1,0),a.up.set(0,1,0),a.lookAt(0,0,1),l.up.set(0,1,0),l.lookAt(0,0,-1);else if(e===hr)n.up.set(0,-1,0),n.lookAt(-1,0,0),s.up.set(0,-1,0),s.lookAt(1,0,0),r.up.set(0,0,1),r.lookAt(0,1,0),o.up.set(0,0,-1),o.lookAt(0,-1,0),a.up.set(0,-1,0),a.lookAt(0,0,1),l.up.set(0,-1,0),l.lookAt(0,0,-1);else throw new Error("THREE.CubeCamera.updateCoordinateSystem(): Invalid coordinate system: "+e);for(let c of t)this.add(c),c.updateMatrixWorld()}update(e,t){this.parent===null&&this.updateMatrixWorld();let{renderTarget:n,activeMipmapLevel:s}=this;this.coordinateSystem!==e.coordinateSystem&&(this.coordinateSystem=e.coordinateSystem,this.updateCoordinateSystem());let[r,o,a,l,c,h]=this.children,d=e.getRenderTarget(),u=e.getActiveCubeFace(),m=e.getActiveMipmapLevel(),p=e.xr.enabled;e.xr.enabled=!1;let y=n.texture.generateMipmaps;n.texture.generateMipmaps=!1;let g=!1;e.isWebGLRenderer===!0?g=e.state.buffers.depth.getReversed():g=e.reversedDepthBuffer,e.setRenderTarget(n,0,s),g&&e.autoClear===!1&&e.clearDepth(),e.render(t,r),e.setRenderTarget(n,1,s),g&&e.autoClear===!1&&e.clearDepth(),e.render(t,o),e.setRenderTarget(n,2,s),g&&e.autoClear===!1&&e.clearDepth(),e.render(t,a),e.setRenderTarget(n,3,s),g&&e.autoClear===!1&&e.clearDepth(),e.render(t,l),e.setRenderTarget(n,4,s),g&&e.autoClear===!1&&e.clearDepth(),e.render(t,c),n.texture.generateMipmaps=y,e.setRenderTarget(n,5,s),g&&e.autoClear===!1&&e.clearDepth(),e.render(t,h),e.setRenderTarget(d,u,m),e.xr.enabled=p,n.texture.needsPMREMUpdate=!0}},Aa=class extends Yt{constructor(e=[]){super(),this.isArrayCamera=!0,this.isMultiViewCamera=!1,this.cameras=e}};var gh="\\[\\]\\.:\\/",Zm=new RegExp("["+gh+"]","g"),xh="[^"+gh+"]",Jm="[^"+gh.replace("\\.","")+"]",jm=/((?:WC+[\/:])*)/.source.replace("WC",xh),Qm=/(WCOD+)?/.source.replace("WCOD",Jm),eg=/(?:\.(WC+)(?:\[(.+)\])?)?/.source.replace("WC",xh),tg=/\.(WC+)(?:\[(.+)\])?/.source.replace("WC",xh),ng=new RegExp("^"+jm+Qm+eg+tg+"$"),ig=["material","materials","bones","map"],Gc=class{constructor(e,t,n){let s=n||ut.parseTrackName(t);this._targetGroup=e,this._bindings=e.subscribe_(t,s)}getValue(e,t){this.bind();let n=this._targetGroup.nCachedObjects_,s=this._bindings[n];s!==void 0&&s.getValue(e,t)}setValue(e,t){let n=this._bindings;for(let s=this._targetGroup.nCachedObjects_,r=n.length;s!==r;++s)n[s].setValue(e,t)}bind(){let e=this._bindings;for(let t=this._targetGroup.nCachedObjects_,n=e.length;t!==n;++t)e[t].bind()}unbind(){let e=this._bindings;for(let t=this._targetGroup.nCachedObjects_,n=e.length;t!==n;++t)e[t].unbind()}},ut=class i{constructor(e,t,n){this.path=t,this.parsedPath=n||i.parseTrackName(t),this.node=i.findNode(e,this.parsedPath.nodeName),this.rootNode=e,this.getValue=this._getValue_unbound,this.setValue=this._setValue_unbound}static create(e,t,n){return e&&e.isAnimationObjectGroup?new i.Composite(e,t,n):new i(e,t,n)}static sanitizeNodeName(e){return e.replace(/\s/g,"_").replace(Zm,"")}static parseTrackName(e){let t=ng.exec(e);if(t===null)throw new Error("THREE.PropertyBinding: Cannot parse trackName: "+e);let n={nodeName:t[2],objectName:t[3],objectIndex:t[4],propertyName:t[5],propertyIndex:t[6]},s=n.nodeName&&n.nodeName.lastIndexOf(".");if(s!==void 0&&s!==-1){let r=n.nodeName.substring(s+1);ig.indexOf(r)!==-1&&(n.nodeName=n.nodeName.substring(0,s),n.objectName=r)}if(n.propertyName===null||n.propertyName.length===0)throw new Error("THREE.PropertyBinding: can not parse propertyName from trackName: "+e);return n}static findNode(e,t){if(t===void 0||t===""||t==="."||t===-1||t===e.name||t===e.uuid)return e;if(e.skeleton){let n=e.skeleton.getBoneByName(t);if(n!==void 0)return n}if(e.children){let n=function(r){for(let o=0;o<r.length;o++){let a=r[o];if(a.name===t||a.uuid===t)return a;let l=n(a.children);if(l)return l}return null},s=n(e.children);if(s)return s}return null}_getValue_unavailable(){}_setValue_unavailable(){}_getValue_direct(e,t){e[t]=this.targetObject[this.propertyName]}_getValue_array(e,t){let n=this.resolvedProperty;for(let s=0,r=n.length;s!==r;++s)e[t++]=n[s]}_getValue_arrayElement(e,t){e[t]=this.resolvedProperty[this.propertyIndex]}_getValue_toArray(e,t){this.resolvedProperty.toArray(e,t)}_setValue_direct(e,t){this.targetObject[this.propertyName]=e[t]}_setValue_direct_setNeedsUpdate(e,t){this.targetObject[this.propertyName]=e[t],this.targetObject.needsUpdate=!0}_setValue_direct_setMatrixWorldNeedsUpdate(e,t){this.targetObject[this.propertyName]=e[t],this.targetObject.matrixWorldNeedsUpdate=!0}_setValue_array(e,t){let n=this.resolvedProperty;for(let s=0,r=n.length;s!==r;++s)n[s]=e[t++]}_setValue_array_setNeedsUpdate(e,t){let n=this.resolvedProperty;for(let s=0,r=n.length;s!==r;++s)n[s]=e[t++];this.targetObject.needsUpdate=!0}_setValue_array_setMatrixWorldNeedsUpdate(e,t){let n=this.resolvedProperty;for(let s=0,r=n.length;s!==r;++s)n[s]=e[t++];this.targetObject.matrixWorldNeedsUpdate=!0}_setValue_arrayElement(e,t){this.resolvedProperty[this.propertyIndex]=e[t]}_setValue_arrayElement_setNeedsUpdate(e,t){this.resolvedProperty[this.propertyIndex]=e[t],this.targetObject.needsUpdate=!0}_setValue_arrayElement_setMatrixWorldNeedsUpdate(e,t){this.resolvedProperty[this.propertyIndex]=e[t],this.targetObject.matrixWorldNeedsUpdate=!0}_setValue_fromArray(e,t){this.resolvedProperty.fromArray(e,t)}_setValue_fromArray_setNeedsUpdate(e,t){this.resolvedProperty.fromArray(e,t),this.targetObject.needsUpdate=!0}_setValue_fromArray_setMatrixWorldNeedsUpdate(e,t){this.resolvedProperty.fromArray(e,t),this.targetObject.matrixWorldNeedsUpdate=!0}_getValue_unbound(e,t){this.bind(),this.getValue(e,t)}_setValue_unbound(e,t){this.bind(),this.setValue(e,t)}bind(){let e=this.node,t=this.parsedPath,n=t.objectName,s=t.propertyName,r=t.propertyIndex;if(e||(e=i.findNode(this.rootNode,t.nodeName),this.node=e),this.getValue=this._getValue_unavailable,this.setValue=this._setValue_unavailable,!e){Ae("PropertyBinding: No target node found for track: "+this.path+".");return}if(n){let c=t.objectIndex;switch(n){case"materials":if(!e.material){Le("PropertyBinding: Can not bind to material as node does not have a material.",this);return}if(!e.material.materials){Le("PropertyBinding: Can not bind to material.materials as node.material does not have a materials array.",this);return}e=e.material.materials;break;case"bones":if(!e.skeleton){Le("PropertyBinding: Can not bind to bones as node does not have a skeleton.",this);return}e=e.skeleton.bones;for(let h=0;h<e.length;h++)if(e[h].name===c){c=h;break}break;case"map":if("map"in e){e=e.map;break}if(!e.material){Le("PropertyBinding: Can not bind to material as node does not have a material.",this);return}if(!e.material.map){Le("PropertyBinding: Can not bind to material.map as node.material does not have a map.",this);return}e=e.material.map;break;default:if(e[n]===void 0){Le("PropertyBinding: Can not bind to objectName of node undefined.",this);return}e=e[n]}if(c!==void 0){if(e[c]===void 0){Le("PropertyBinding: Trying to bind to objectIndex of objectName, but is undefined.",this,e);return}e=e[c]}}let o=e[s];if(o===void 0){let c=t.nodeName;Le("PropertyBinding: Trying to update property for track: "+c+"."+s+" but it wasn't found.",e);return}let a=this.Versioning.None;this.targetObject=e,e.isMaterial===!0?a=this.Versioning.NeedsUpdate:e.isObject3D===!0&&(a=this.Versioning.MatrixWorldNeedsUpdate);let l=this.BindingType.Direct;if(r!==void 0){if(s==="morphTargetInfluences"){if(!e.geometry){Le("PropertyBinding: Can not bind to morphTargetInfluences because node does not have a geometry.",this);return}if(!e.geometry.morphAttributes){Le("PropertyBinding: Can not bind to morphTargetInfluences because node does not have a geometry.morphAttributes.",this);return}e.morphTargetDictionary[r]!==void 0&&(r=e.morphTargetDictionary[r])}l=this.BindingType.ArrayElement,this.resolvedProperty=o,this.propertyIndex=r}else o.fromArray!==void 0&&o.toArray!==void 0?(l=this.BindingType.HasFromToArray,this.resolvedProperty=o):Array.isArray(o)?(l=this.BindingType.EntireArray,this.resolvedProperty=o):this.propertyName=s;this.getValue=this.GetterByBindingType[l],this.setValue=this.SetterByBindingTypeAndVersioning[l][a]}unbind(){this.node=null,this.getValue=this._getValue_unbound,this.setValue=this._setValue_unbound}};ut.Composite=Gc;ut.prototype.BindingType={Direct:0,EntireArray:1,ArrayElement:2,HasFromToArray:3};ut.prototype.Versioning={None:0,NeedsUpdate:1,MatrixWorldNeedsUpdate:2};ut.prototype.GetterByBindingType=[ut.prototype._getValue_direct,ut.prototype._getValue_array,ut.prototype._getValue_arrayElement,ut.prototype._getValue_toArray];ut.prototype.SetterByBindingTypeAndVersioning=[[ut.prototype._setValue_direct,ut.prototype._setValue_direct_setNeedsUpdate,ut.prototype._setValue_direct_setMatrixWorldNeedsUpdate],[ut.prototype._setValue_array,ut.prototype._setValue_array_setNeedsUpdate,ut.prototype._setValue_array_setMatrixWorldNeedsUpdate],[ut.prototype._setValue_arrayElement,ut.prototype._setValue_arrayElement_setNeedsUpdate,ut.prototype._setValue_arrayElement_setMatrixWorldNeedsUpdate],[ut.prototype._setValue_fromArray,ut.prototype._setValue_fromArray_setNeedsUpdate,ut.prototype._setValue_fromArray_setMatrixWorldNeedsUpdate]];var hM=new Float32Array(1);var Di=class extends la{constructor(e,t,n=1){super(e,t),this.isInstancedInterleavedBuffer=!0,this.meshPerAttribute=n}copy(e){return super.copy(e),this.meshPerAttribute=e.meshPerAttribute,this}clone(e){let t=super.clone(e);return t.meshPerAttribute=this.meshPerAttribute,t}toJSON(e){let t=super.toJSON(e);return t.isInstancedInterleavedBuffer=!0,t.meshPerAttribute=this.meshPerAttribute,t}};var Sh=class Sh{constructor(e,t,n,s){this.elements=[1,0,0,1],e!==void 0&&this.set(e,t,n,s)}identity(){return this.set(1,0,0,1),this}fromArray(e,t=0){for(let n=0;n<4;n++)this.elements[n]=e[n+t];return this}set(e,t,n,s){let r=this.elements;return r[0]=e,r[2]=t,r[1]=n,r[3]=s,this}};Sh.prototype.isMatrix2=!0;var Wc=Sh;var ld=new N,Wo=new N,As=new N,Ps=new N,Fc=new N,sg=new N,rg=new N,Dr=class{constructor(e=new N,t=new N){this.start=e,this.end=t}set(e,t){return this.start.copy(e),this.end.copy(t),this}copy(e){return this.start.copy(e.start),this.end.copy(e.end),this}getCenter(e){return e.addVectors(this.start,this.end).multiplyScalar(.5)}delta(e){return e.subVectors(this.end,this.start)}distanceSq(){return this.start.distanceToSquared(this.end)}distance(){return this.start.distanceTo(this.end)}at(e,t){return this.delta(t).multiplyScalar(e).add(this.start)}closestPointToPointParameter(e,t){ld.subVectors(e,this.start),Wo.subVectors(this.end,this.start);let n=Wo.dot(Wo);if(n===0)return 0;let r=Wo.dot(ld)/n;return t&&(r=ke(r,0,1)),r}closestPointToPoint(e,t,n){let s=this.closestPointToPointParameter(e,t);return this.delta(n).multiplyScalar(s).add(this.start)}distanceSqToLine3(e,t=sg,n=rg){let s=10000000000000001e-32,r,o,a=this.start,l=e.start,c=this.end,h=e.end;As.subVectors(c,a),Ps.subVectors(h,l),Fc.subVectors(a,l);let d=As.dot(As),u=Ps.dot(Ps),m=Ps.dot(Fc);if(d<=s&&u<=s)return t.copy(a),n.copy(l),t.sub(n),t.dot(t);if(d<=s)r=0,o=m/u,o=ke(o,0,1);else{let p=As.dot(Fc);if(u<=s)o=0,r=ke(-p/d,0,1);else{let y=As.dot(Ps),g=d*u-y*y;g!==0?r=ke((y*m-p*u)/g,0,1):r=0,o=(y*r+m)/u,o<0?(o=0,r=ke(-p/d,0,1)):o>1&&(o=1,r=ke((y-p)/d,0,1))}}return t.copy(a).addScaledVector(As,r),n.copy(l).addScaledVector(Ps,o),t.distanceToSquared(n)}applyMatrix4(e){return this.start.applyMatrix4(e),this.end.applyMatrix4(e),this}equals(e){return e.start.equals(this.start)&&e.end.equals(this.end)}clone(){return new this.constructor().copy(this)}};function yh(i,e,t,n){let s=og(n);switch(t){case lh:return i*e;case hh:return i*e/s.components*s.byteLength;case Na:return i*e/s.components*s.byteLength;case Oi:return i*e*2/s.components*s.byteLength;case Oa:return i*e*2/s.components*s.byteLength;case ch:return i*e*3/s.components*s.byteLength;case bn:return i*e*4/s.components*s.byteLength;case Ba:return i*e*4/s.components*s.byteLength;case Or:case Br:return Math.floor((i+3)/4)*Math.floor((e+3)/4)*8;case zr:case kr:return Math.floor((i+3)/4)*Math.floor((e+3)/4)*16;case ka:case Ha:return Math.max(i,16)*Math.max(e,8)/4;case za:case Va:return Math.max(i,8)*Math.max(e,8)/2;case Ga:case Wa:case qa:case Ya:return Math.floor((i+3)/4)*Math.floor((e+3)/4)*8;case Xa:case Vr:case $a:return Math.floor((i+3)/4)*Math.floor((e+3)/4)*16;case Ka:return Math.floor((i+3)/4)*Math.floor((e+3)/4)*16;case Za:return Math.floor((i+4)/5)*Math.floor((e+3)/4)*16;case Ja:return Math.floor((i+4)/5)*Math.floor((e+4)/5)*16;case ja:return Math.floor((i+5)/6)*Math.floor((e+4)/5)*16;case Qa:return Math.floor((i+5)/6)*Math.floor((e+5)/6)*16;case el:return Math.floor((i+7)/8)*Math.floor((e+4)/5)*16;case tl:return Math.floor((i+7)/8)*Math.floor((e+5)/6)*16;case nl:return Math.floor((i+7)/8)*Math.floor((e+7)/8)*16;case il:return Math.floor((i+9)/10)*Math.floor((e+4)/5)*16;case sl:return Math.floor((i+9)/10)*Math.floor((e+5)/6)*16;case rl:return Math.floor((i+9)/10)*Math.floor((e+7)/8)*16;case ol:return Math.floor((i+9)/10)*Math.floor((e+9)/10)*16;case al:return Math.floor((i+11)/12)*Math.floor((e+9)/10)*16;case ll:return Math.floor((i+11)/12)*Math.floor((e+11)/12)*16;case cl:case hl:case ul:return Math.ceil(i/4)*Math.ceil(e/4)*16;case dl:case fl:return Math.ceil(i/4)*Math.ceil(e/4)*8;case Hr:case pl:return Math.ceil(i/4)*Math.ceil(e/4)*16}throw new Error(`Unable to determine texture byte length for ${t} format.`)}function og(i){switch(i){case pn:case sh:return{byteLength:1,components:1};case zs:case rh:case qn:return{byteLength:2,components:1};case Fa:case Ua:return{byteLength:2,components:4};case In:case Da:case Ln:return{byteLength:4,components:1};case oh:case ah:return{byteLength:4,components:3}}throw new Error(`THREE.TextureUtils: Unknown texture type ${i}.`)}typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("register",{detail:{revision:Ra}}));typeof window<"u"&&(window.__THREE__?Ae("WARNING: Multiple instances of Three.js being imported."):window.__THREE__=Ra);function _f(){let i=null,e=!1,t=null,n=null;function s(r,o){t(r,o),n=i.requestAnimationFrame(s)}return{start:function(){e!==!0&&t!==null&&i!==null&&(n=i.requestAnimationFrame(s),e=!0)},stop:function(){i!==null&&i.cancelAnimationFrame(n),e=!1},setAnimationLoop:function(r){t=r},setContext:function(r){i=r}}}function ag(i){let e=new WeakMap;function t(a,l){let c=a.array,h=a.usage,d=c.byteLength,u=i.createBuffer();i.bindBuffer(l,u),i.bufferData(l,c,h),a.onUploadCallback();let m;if(c instanceof Float32Array)m=i.FLOAT;else if(typeof Float16Array<"u"&&c instanceof Float16Array)m=i.HALF_FLOAT;else if(c instanceof Uint16Array)a.isFloat16BufferAttribute?m=i.HALF_FLOAT:m=i.UNSIGNED_SHORT;else if(c instanceof Int16Array)m=i.SHORT;else if(c instanceof Uint32Array)m=i.UNSIGNED_INT;else if(c instanceof Int32Array)m=i.INT;else if(c instanceof Int8Array)m=i.BYTE;else if(c instanceof Uint8Array)m=i.UNSIGNED_BYTE;else if(c instanceof Uint8ClampedArray)m=i.UNSIGNED_BYTE;else throw new Error("THREE.WebGLAttributes: Unsupported buffer data format: "+c);return{buffer:u,type:m,bytesPerElement:c.BYTES_PER_ELEMENT,version:a.version,size:d}}function n(a,l,c){let h=l.array,d=l.updateRanges;if(i.bindBuffer(c,a),d.length===0)i.bufferSubData(c,0,h);else{d.sort((m,p)=>m.start-p.start);let u=0;for(let m=1;m<d.length;m++){let p=d[u],y=d[m];y.start<=p.start+p.count+1?p.count=Math.max(p.count,y.start+y.count-p.start):(++u,d[u]=y)}d.length=u+1;for(let m=0,p=d.length;m<p;m++){let y=d[m];i.bufferSubData(c,y.start*h.BYTES_PER_ELEMENT,h,y.start,y.count)}l.clearUpdateRanges()}l.onUploadCallback()}function s(a){return a.isInterleavedBufferAttribute&&(a=a.data),e.get(a)}function r(a){a.isInterleavedBufferAttribute&&(a=a.data);let l=e.get(a);l&&(i.deleteBuffer(l.buffer),e.delete(a))}function o(a,l){if(a.isInterleavedBufferAttribute&&(a=a.data),a.isGLBufferAttribute){let h=e.get(a);(!h||h.version<a.version)&&e.set(a,{buffer:a.buffer,type:a.type,bytesPerElement:a.elementSize,version:a.version});return}let c=e.get(a);if(c===void 0)e.set(a,t(a,l));else if(c.version<a.version){if(c.size!==a.array.byteLength)throw new Error("THREE.WebGLAttributes: The size of the buffer attribute's array buffer does not match the original size. Resizing buffer attributes is not supported.");n(c.buffer,a,l),c.version=a.version}}return{get:s,remove:r,update:o}}var lg=`#ifdef USE_ALPHAHASH
	if ( diffuseColor.a < getAlphaHashThreshold( vPosition ) ) discard;
#endif`,cg=`#ifdef USE_ALPHAHASH
	const float ALPHA_HASH_SCALE = 0.05;
	float hash2D( vec2 value ) {
		return fract( 1.0e4 * sin( 17.0 * value.x + 0.1 * value.y ) * ( 0.1 + abs( sin( 13.0 * value.y + value.x ) ) ) );
	}
	float hash3D( vec3 value ) {
		return hash2D( vec2( hash2D( value.xy ), value.z ) );
	}
	float getAlphaHashThreshold( vec3 position ) {
		float maxDeriv = max(
			length( dFdx( position.xyz ) ),
			length( dFdy( position.xyz ) )
		);
		float pixScale = 1.0 / ( ALPHA_HASH_SCALE * maxDeriv );
		vec2 pixScales = vec2(
			exp2( floor( log2( pixScale ) ) ),
			exp2( ceil( log2( pixScale ) ) )
		);
		vec2 alpha = vec2(
			hash3D( floor( pixScales.x * position.xyz ) ),
			hash3D( floor( pixScales.y * position.xyz ) )
		);
		float lerpFactor = fract( log2( pixScale ) );
		float x = ( 1.0 - lerpFactor ) * alpha.x + lerpFactor * alpha.y;
		float a = min( lerpFactor, 1.0 - lerpFactor );
		vec3 cases = vec3(
			x * x / ( 2.0 * a * ( 1.0 - a ) ),
			( x - 0.5 * a ) / ( 1.0 - a ),
			1.0 - ( ( 1.0 - x ) * ( 1.0 - x ) / ( 2.0 * a * ( 1.0 - a ) ) )
		);
		float threshold = ( x < ( 1.0 - a ) )
			? ( ( x < a ) ? cases.x : cases.y )
			: cases.z;
		return clamp( threshold , 1.0e-6, 1.0 );
	}
#endif`,hg=`#ifdef USE_ALPHAMAP
	diffuseColor.a *= texture2D( alphaMap, vAlphaMapUv ).g;
#endif`,ug=`#ifdef USE_ALPHAMAP
	uniform sampler2D alphaMap;
#endif`,dg=`#ifdef USE_ALPHATEST
	#ifdef ALPHA_TO_COVERAGE
	diffuseColor.a = smoothstep( alphaTest, alphaTest + fwidth( diffuseColor.a ), diffuseColor.a );
	if ( diffuseColor.a == 0.0 ) discard;
	#else
	if ( diffuseColor.a < alphaTest ) discard;
	#endif
#endif`,fg=`#ifdef USE_ALPHATEST
	uniform float alphaTest;
#endif`,pg=`#ifdef USE_AOMAP
	float ambientOcclusion = ( texture2D( aoMap, vAoMapUv ).r - 1.0 ) * aoMapIntensity + 1.0;
	reflectedLight.indirectDiffuse *= ambientOcclusion;
	#if defined( USE_CLEARCOAT ) 
		clearcoatSpecularIndirect *= ambientOcclusion;
	#endif
	#if defined( USE_SHEEN ) 
		sheenSpecularIndirect *= ambientOcclusion;
	#endif
	#if defined( USE_ENVMAP ) && defined( STANDARD )
		float dotNV = saturate( dot( geometryNormal, geometryViewDir ) );
		reflectedLight.indirectSpecular *= computeSpecularOcclusion( dotNV, ambientOcclusion, material.roughness );
	#endif
#endif`,mg=`#ifdef USE_AOMAP
	uniform sampler2D aoMap;
	uniform float aoMapIntensity;
#endif`,gg=`#ifdef USE_BATCHING
	#if ! defined( GL_ANGLE_multi_draw )
	#define gl_DrawID _gl_DrawID
	uniform int _gl_DrawID;
	#endif
	uniform highp sampler2D batchingTexture;
	uniform highp usampler2D batchingIdTexture;
	mat4 getBatchingMatrix( const in float i ) {
		int size = textureSize( batchingTexture, 0 ).x;
		int j = int( i ) * 4;
		int x = j % size;
		int y = j / size;
		vec4 v1 = texelFetch( batchingTexture, ivec2( x, y ), 0 );
		vec4 v2 = texelFetch( batchingTexture, ivec2( x + 1, y ), 0 );
		vec4 v3 = texelFetch( batchingTexture, ivec2( x + 2, y ), 0 );
		vec4 v4 = texelFetch( batchingTexture, ivec2( x + 3, y ), 0 );
		return mat4( v1, v2, v3, v4 );
	}
	float getIndirectIndex( const in int i ) {
		int size = textureSize( batchingIdTexture, 0 ).x;
		int x = i % size;
		int y = i / size;
		return float( texelFetch( batchingIdTexture, ivec2( x, y ), 0 ).r );
	}
#endif
#ifdef USE_BATCHING_COLOR
	uniform sampler2D batchingColorTexture;
	vec4 getBatchingColor( const in float i ) {
		int size = textureSize( batchingColorTexture, 0 ).x;
		int j = int( i );
		int x = j % size;
		int y = j / size;
		return texelFetch( batchingColorTexture, ivec2( x, y ), 0 );
	}
#endif`,xg=`#ifdef USE_BATCHING
	mat4 batchingMatrix = getBatchingMatrix( getIndirectIndex( gl_DrawID ) );
#endif`,yg=`vec3 transformed = vec3( position );
#ifdef USE_ALPHAHASH
	vPosition = vec3( position );
#endif`,vg=`vec3 objectNormal = vec3( normal );
#ifdef USE_TANGENT
	vec3 objectTangent = vec3( tangent.xyz );
#endif`,_g=`float G_BlinnPhong_Implicit( ) {
	return 0.25;
}
float D_BlinnPhong( const in float shininess, const in float dotNH ) {
	return RECIPROCAL_PI * ( shininess * 0.5 + 1.0 ) * pow( dotNH, shininess );
}
vec3 BRDF_BlinnPhong( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, const in vec3 specularColor, const in float shininess ) {
	vec3 halfDir = normalize( lightDir + viewDir );
	float dotNH = saturate( dot( normal, halfDir ) );
	float dotVH = saturate( dot( viewDir, halfDir ) );
	vec3 F = F_Schlick( specularColor, 1.0, dotVH );
	float G = G_BlinnPhong_Implicit( );
	float D = D_BlinnPhong( shininess, dotNH );
	return F * ( G * D );
} // validated`,bg=`#ifdef USE_IRIDESCENCE
	const mat3 XYZ_TO_REC709 = mat3(
		 3.2404542, -0.9692660,  0.0556434,
		-1.5371385,  1.8760108, -0.2040259,
		-0.4985314,  0.0415560,  1.0572252
	);
	vec3 Fresnel0ToIor( vec3 fresnel0 ) {
		vec3 sqrtF0 = sqrt( fresnel0 );
		return ( vec3( 1.0 ) + sqrtF0 ) / ( vec3( 1.0 ) - sqrtF0 );
	}
	vec3 IorToFresnel0( vec3 transmittedIor, float incidentIor ) {
		return pow2( ( transmittedIor - vec3( incidentIor ) ) / ( transmittedIor + vec3( incidentIor ) ) );
	}
	float IorToFresnel0( float transmittedIor, float incidentIor ) {
		return pow2( ( transmittedIor - incidentIor ) / ( transmittedIor + incidentIor ));
	}
	vec3 evalSensitivity( float OPD, vec3 shift ) {
		float phase = 2.0 * PI * OPD * 1.0e-9;
		vec3 val = vec3( 5.4856e-13, 4.4201e-13, 5.2481e-13 );
		vec3 pos = vec3( 1.6810e+06, 1.7953e+06, 2.2084e+06 );
		vec3 var = vec3( 4.3278e+09, 9.3046e+09, 6.6121e+09 );
		vec3 xyz = val * sqrt( 2.0 * PI * var ) * cos( pos * phase + shift ) * exp( - pow2( phase ) * var );
		xyz.x += 9.7470e-14 * sqrt( 2.0 * PI * 4.5282e+09 ) * cos( 2.2399e+06 * phase + shift[ 0 ] ) * exp( - 4.5282e+09 * pow2( phase ) );
		xyz /= 1.0685e-7;
		vec3 rgb = XYZ_TO_REC709 * xyz;
		return rgb;
	}
	vec3 evalIridescence( float outsideIOR, float eta2, float cosTheta1, float thinFilmThickness, vec3 baseF0 ) {
		vec3 I;
		float iridescenceIOR = mix( outsideIOR, eta2, smoothstep( 0.0, 0.03, thinFilmThickness ) );
		float sinTheta2Sq = pow2( outsideIOR / iridescenceIOR ) * ( 1.0 - pow2( cosTheta1 ) );
		float cosTheta2Sq = 1.0 - sinTheta2Sq;
		if ( cosTheta2Sq < 0.0 ) {
			return vec3( 1.0 );
		}
		float cosTheta2 = sqrt( cosTheta2Sq );
		float R0 = IorToFresnel0( iridescenceIOR, outsideIOR );
		float R12 = F_Schlick( R0, 1.0, cosTheta1 );
		float T121 = 1.0 - R12;
		float phi12 = 0.0;
		if ( iridescenceIOR < outsideIOR ) phi12 = PI;
		float phi21 = PI - phi12;
		vec3 baseIOR = Fresnel0ToIor( clamp( baseF0, 0.0, 0.9999 ) );		vec3 R1 = IorToFresnel0( baseIOR, iridescenceIOR );
		vec3 R23 = F_Schlick( R1, 1.0, cosTheta2 );
		vec3 phi23 = vec3( 0.0 );
		if ( baseIOR[ 0 ] < iridescenceIOR ) phi23[ 0 ] = PI;
		if ( baseIOR[ 1 ] < iridescenceIOR ) phi23[ 1 ] = PI;
		if ( baseIOR[ 2 ] < iridescenceIOR ) phi23[ 2 ] = PI;
		float OPD = 2.0 * iridescenceIOR * thinFilmThickness * cosTheta2;
		vec3 phi = vec3( phi21 ) + phi23;
		vec3 R123 = clamp( R12 * R23, 1e-5, 0.9999 );
		vec3 r123 = sqrt( R123 );
		vec3 Rs = pow2( T121 ) * R23 / ( vec3( 1.0 ) - R123 );
		vec3 C0 = R12 + Rs;
		I = C0;
		vec3 Cm = Rs - T121;
		for ( int m = 1; m <= 2; ++ m ) {
			Cm *= r123;
			vec3 Sm = 2.0 * evalSensitivity( float( m ) * OPD, float( m ) * phi );
			I += Cm * Sm;
		}
		return max( I, vec3( 0.0 ) );
	}
#endif`,Mg=`#ifdef USE_BUMPMAP
	uniform sampler2D bumpMap;
	uniform float bumpScale;
	vec2 dHdxy_fwd() {
		vec2 dSTdx = dFdx( vBumpMapUv );
		vec2 dSTdy = dFdy( vBumpMapUv );
		float Hll = bumpScale * texture2D( bumpMap, vBumpMapUv ).x;
		float dBx = bumpScale * texture2D( bumpMap, vBumpMapUv + dSTdx ).x - Hll;
		float dBy = bumpScale * texture2D( bumpMap, vBumpMapUv + dSTdy ).x - Hll;
		return vec2( dBx, dBy );
	}
	vec3 perturbNormalArb( vec3 surf_pos, vec3 surf_norm, vec2 dHdxy, float faceDirection ) {
		vec3 vSigmaX = normalize( dFdx( surf_pos.xyz ) );
		vec3 vSigmaY = normalize( dFdy( surf_pos.xyz ) );
		vec3 vN = surf_norm;
		vec3 R1 = cross( vSigmaY, vN );
		vec3 R2 = cross( vN, vSigmaX );
		float fDet = dot( vSigmaX, R1 ) * faceDirection;
		vec3 vGrad = sign( fDet ) * ( dHdxy.x * R1 + dHdxy.y * R2 );
		return normalize( abs( fDet ) * surf_norm - vGrad );
	}
#endif`,Sg=`#if NUM_CLIPPING_PLANES > 0
	vec4 plane;
	#ifdef ALPHA_TO_COVERAGE
		float distanceToPlane, distanceGradient;
		float clipOpacity = 1.0;
		#pragma unroll_loop_start
		for ( int i = 0; i < UNION_CLIPPING_PLANES; i ++ ) {
			plane = clippingPlanes[ i ];
			distanceToPlane = - dot( vClipPosition, plane.xyz ) + plane.w;
			distanceGradient = fwidth( distanceToPlane ) / 2.0;
			clipOpacity *= smoothstep( - distanceGradient, distanceGradient, distanceToPlane );
			if ( clipOpacity == 0.0 ) discard;
		}
		#pragma unroll_loop_end
		#if UNION_CLIPPING_PLANES < NUM_CLIPPING_PLANES
			float unionClipOpacity = 1.0;
			#pragma unroll_loop_start
			for ( int i = UNION_CLIPPING_PLANES; i < NUM_CLIPPING_PLANES; i ++ ) {
				plane = clippingPlanes[ i ];
				distanceToPlane = - dot( vClipPosition, plane.xyz ) + plane.w;
				distanceGradient = fwidth( distanceToPlane ) / 2.0;
				unionClipOpacity *= 1.0 - smoothstep( - distanceGradient, distanceGradient, distanceToPlane );
			}
			#pragma unroll_loop_end
			clipOpacity *= 1.0 - unionClipOpacity;
		#endif
		diffuseColor.a *= clipOpacity;
		if ( diffuseColor.a == 0.0 ) discard;
	#else
		#pragma unroll_loop_start
		for ( int i = 0; i < UNION_CLIPPING_PLANES; i ++ ) {
			plane = clippingPlanes[ i ];
			if ( dot( vClipPosition, plane.xyz ) > plane.w ) discard;
		}
		#pragma unroll_loop_end
		#if UNION_CLIPPING_PLANES < NUM_CLIPPING_PLANES
			bool clipped = true;
			#pragma unroll_loop_start
			for ( int i = UNION_CLIPPING_PLANES; i < NUM_CLIPPING_PLANES; i ++ ) {
				plane = clippingPlanes[ i ];
				clipped = ( dot( vClipPosition, plane.xyz ) > plane.w ) && clipped;
			}
			#pragma unroll_loop_end
			if ( clipped ) discard;
		#endif
	#endif
#endif`,wg=`#if NUM_CLIPPING_PLANES > 0
	varying vec3 vClipPosition;
	uniform vec4 clippingPlanes[ NUM_CLIPPING_PLANES ];
#endif`,Eg=`#if NUM_CLIPPING_PLANES > 0
	varying vec3 vClipPosition;
#endif`,Tg=`#if NUM_CLIPPING_PLANES > 0
	vClipPosition = - mvPosition.xyz;
#endif`,Ag=`#if defined( USE_COLOR ) || defined( USE_COLOR_ALPHA )
	diffuseColor *= vColor;
#endif`,Pg=`#if defined( USE_COLOR ) || defined( USE_COLOR_ALPHA )
	varying vec4 vColor;
#endif`,Rg=`#if defined( USE_COLOR ) || defined( USE_COLOR_ALPHA ) || defined( USE_INSTANCING_COLOR ) || defined( USE_BATCHING_COLOR )
	varying vec4 vColor;
#endif`,Cg=`#if defined( USE_COLOR ) || defined( USE_COLOR_ALPHA ) || defined( USE_INSTANCING_COLOR ) || defined( USE_BATCHING_COLOR )
	vColor = vec4( 1.0 );
#endif
#ifdef USE_COLOR_ALPHA
	vColor *= color;
#elif defined( USE_COLOR )
	vColor.rgb *= color;
#endif
#ifdef USE_INSTANCING_COLOR
	vColor.rgb *= instanceColor.rgb;
#endif
#ifdef USE_BATCHING_COLOR
	vColor *= getBatchingColor( getIndirectIndex( gl_DrawID ) );
#endif`,Ig=`#define PI 3.141592653589793
#define PI2 6.283185307179586
#define PI_HALF 1.5707963267948966
#define RECIPROCAL_PI 0.3183098861837907
#define RECIPROCAL_PI2 0.15915494309189535
#define EPSILON 1e-6
#ifndef saturate
#define saturate( a ) clamp( a, 0.0, 1.0 )
#endif
#define whiteComplement( a ) ( 1.0 - saturate( a ) )
float pow2( const in float x ) { return x*x; }
vec3 pow2( const in vec3 x ) { return x*x; }
float pow3( const in float x ) { return x*x*x; }
float pow4( const in float x ) { float x2 = x*x; return x2*x2; }
float max3( const in vec3 v ) { return max( max( v.x, v.y ), v.z ); }
float average( const in vec3 v ) { return dot( v, vec3( 0.3333333 ) ); }
highp float rand( const in vec2 uv ) {
	const highp float a = 12.9898, b = 78.233, c = 43758.5453;
	highp float dt = dot( uv.xy, vec2( a,b ) ), sn = mod( dt, PI );
	return fract( sin( sn ) * c );
}
#ifdef HIGH_PRECISION
	float precisionSafeLength( vec3 v ) { return length( v ); }
#else
	float precisionSafeLength( vec3 v ) {
		float maxComponent = max3( abs( v ) );
		return length( v / maxComponent ) * maxComponent;
	}
#endif
struct IncidentLight {
	vec3 color;
	vec3 direction;
	bool visible;
};
struct ReflectedLight {
	vec3 directDiffuse;
	vec3 directSpecular;
	vec3 indirectDiffuse;
	vec3 indirectSpecular;
};
#ifdef USE_ALPHAHASH
	varying vec3 vPosition;
#endif
vec3 transformDirection( in vec3 dir, in mat4 matrix ) {
	return normalize( ( matrix * vec4( dir, 0.0 ) ).xyz );
}
#define inverseTransformDirection transformDirectionByInverseViewMatrix
vec3 transformNormalByInverseViewMatrix( in vec3 normal, in mat4 viewMatrix ) {
	return normalize( ( vec4( normal, 0.0 ) * viewMatrix ).xyz );
}
vec3 transformDirectionByInverseViewMatrix( in vec3 dir, in mat4 viewMatrix ) {
	return normalize( ( vec4( dir, 0.0 ) * viewMatrix ).xyz );
}
bool isPerspectiveMatrix( mat4 m ) {
	return m[ 2 ][ 3 ] == - 1.0;
}
vec2 equirectUv( in vec3 dir ) {
	float u = atan( dir.z, dir.x ) * RECIPROCAL_PI2 + 0.5;
	float v = asin( clamp( dir.y, - 1.0, 1.0 ) ) * RECIPROCAL_PI + 0.5;
	return vec2( u, v );
}
vec3 BRDF_Lambert( const in vec3 diffuseColor ) {
	return RECIPROCAL_PI * diffuseColor;
}
vec3 F_Schlick( const in vec3 f0, const in float f90, const in float dotVH ) {
	float fresnel = exp2( ( - 5.55473 * dotVH - 6.98316 ) * dotVH );
	return f0 * ( 1.0 - fresnel ) + ( f90 * fresnel );
}
float F_Schlick( const in float f0, const in float f90, const in float dotVH ) {
	float fresnel = exp2( ( - 5.55473 * dotVH - 6.98316 ) * dotVH );
	return f0 * ( 1.0 - fresnel ) + ( f90 * fresnel );
} // validated`,Lg=`#ifdef ENVMAP_TYPE_CUBE_UV
	#define cubeUV_minMipLevel 4.0
	#define cubeUV_minTileSize 16.0
	float getFace( vec3 direction ) {
		vec3 absDirection = abs( direction );
		float face = - 1.0;
		if ( absDirection.x > absDirection.z ) {
			if ( absDirection.x > absDirection.y )
				face = direction.x > 0.0 ? 0.0 : 3.0;
			else
				face = direction.y > 0.0 ? 1.0 : 4.0;
		} else {
			if ( absDirection.z > absDirection.y )
				face = direction.z > 0.0 ? 2.0 : 5.0;
			else
				face = direction.y > 0.0 ? 1.0 : 4.0;
		}
		return face;
	}
	vec2 getUV( vec3 direction, float face ) {
		vec2 uv;
		if ( face == 0.0 ) {
			uv = vec2( direction.z, direction.y ) / abs( direction.x );
		} else if ( face == 1.0 ) {
			uv = vec2( - direction.x, - direction.z ) / abs( direction.y );
		} else if ( face == 2.0 ) {
			uv = vec2( - direction.x, direction.y ) / abs( direction.z );
		} else if ( face == 3.0 ) {
			uv = vec2( - direction.z, direction.y ) / abs( direction.x );
		} else if ( face == 4.0 ) {
			uv = vec2( - direction.x, direction.z ) / abs( direction.y );
		} else {
			uv = vec2( direction.x, direction.y ) / abs( direction.z );
		}
		return 0.5 * ( uv + 1.0 );
	}
	vec3 bilinearCubeUV( sampler2D envMap, vec3 direction, float mipInt ) {
		float face = getFace( direction );
		float filterInt = max( cubeUV_minMipLevel - mipInt, 0.0 );
		mipInt = max( mipInt, cubeUV_minMipLevel );
		float faceSize = exp2( mipInt );
		highp vec2 uv = getUV( direction, face ) * ( faceSize - 2.0 ) + 1.0;
		if ( face > 2.0 ) {
			uv.y += faceSize;
			face -= 3.0;
		}
		uv.x += face * faceSize;
		uv.x += filterInt * 3.0 * cubeUV_minTileSize;
		uv.y += 4.0 * ( exp2( CUBEUV_MAX_MIP ) - faceSize );
		uv.x *= CUBEUV_TEXEL_WIDTH;
		uv.y *= CUBEUV_TEXEL_HEIGHT;
		#ifdef texture2DGradEXT
			return texture2DGradEXT( envMap, uv, vec2( 0.0 ), vec2( 0.0 ) ).rgb;
		#else
			return texture2D( envMap, uv ).rgb;
		#endif
	}
	#define cubeUV_r0 1.0
	#define cubeUV_m0 - 2.0
	#define cubeUV_r1 0.8
	#define cubeUV_m1 - 1.0
	#define cubeUV_r4 0.4
	#define cubeUV_m4 2.0
	#define cubeUV_r5 0.305
	#define cubeUV_m5 3.0
	#define cubeUV_r6 0.21
	#define cubeUV_m6 4.0
	float roughnessToMip( float roughness ) {
		float mip = 0.0;
		if ( roughness >= cubeUV_r1 ) {
			mip = ( cubeUV_r0 - roughness ) * ( cubeUV_m1 - cubeUV_m0 ) / ( cubeUV_r0 - cubeUV_r1 ) + cubeUV_m0;
		} else if ( roughness >= cubeUV_r4 ) {
			mip = ( cubeUV_r1 - roughness ) * ( cubeUV_m4 - cubeUV_m1 ) / ( cubeUV_r1 - cubeUV_r4 ) + cubeUV_m1;
		} else if ( roughness >= cubeUV_r5 ) {
			mip = ( cubeUV_r4 - roughness ) * ( cubeUV_m5 - cubeUV_m4 ) / ( cubeUV_r4 - cubeUV_r5 ) + cubeUV_m4;
		} else if ( roughness >= cubeUV_r6 ) {
			mip = ( cubeUV_r5 - roughness ) * ( cubeUV_m6 - cubeUV_m5 ) / ( cubeUV_r5 - cubeUV_r6 ) + cubeUV_m5;
		} else {
			mip = - 2.0 * log2( 1.16 * roughness );		}
		return mip;
	}
	vec4 textureCubeUV( sampler2D envMap, vec3 sampleDir, float roughness ) {
		float mip = clamp( roughnessToMip( roughness ), cubeUV_m0, CUBEUV_MAX_MIP );
		float mipF = fract( mip );
		float mipInt = floor( mip );
		vec3 color0 = bilinearCubeUV( envMap, sampleDir, mipInt );
		if ( mipF == 0.0 ) {
			return vec4( color0, 1.0 );
		} else {
			vec3 color1 = bilinearCubeUV( envMap, sampleDir, mipInt + 1.0 );
			return vec4( mix( color0, color1, mipF ), 1.0 );
		}
	}
#endif`,Dg=`vec3 transformedNormal = objectNormal;
#ifdef USE_TANGENT
	vec3 transformedTangent = objectTangent;
#endif
#ifdef USE_BATCHING
	mat3 bm = mat3( batchingMatrix );
	transformedNormal /= vec3( dot( bm[ 0 ], bm[ 0 ] ), dot( bm[ 1 ], bm[ 1 ] ), dot( bm[ 2 ], bm[ 2 ] ) );
	transformedNormal = bm * transformedNormal;
	#ifdef USE_TANGENT
		transformedTangent = bm * transformedTangent;
	#endif
#endif
#ifdef USE_INSTANCING
	mat3 im = mat3( instanceMatrix );
	transformedNormal /= vec3( dot( im[ 0 ], im[ 0 ] ), dot( im[ 1 ], im[ 1 ] ), dot( im[ 2 ], im[ 2 ] ) );
	transformedNormal = im * transformedNormal;
	#ifdef USE_TANGENT
		transformedTangent = im * transformedTangent;
	#endif
#endif
transformedNormal = normalMatrix * transformedNormal;
#ifdef FLIP_SIDED
	transformedNormal = - transformedNormal;
#endif
#ifdef USE_TANGENT
	transformedTangent = ( modelViewMatrix * vec4( transformedTangent, 0.0 ) ).xyz;
#endif`,Fg=`#ifdef USE_DISPLACEMENTMAP
	uniform sampler2D displacementMap;
	uniform float displacementScale;
	uniform float displacementBias;
#endif`,Ug=`#ifdef USE_DISPLACEMENTMAP
	transformed += normalize( objectNormal ) * ( texture2D( displacementMap, vDisplacementMapUv ).x * displacementScale + displacementBias );
#endif`,Ng=`#ifdef USE_EMISSIVEMAP
	vec4 emissiveColor = texture2D( emissiveMap, vEmissiveMapUv );
	#ifdef DECODE_VIDEO_TEXTURE_EMISSIVE
		emissiveColor = sRGBTransferEOTF( emissiveColor );
	#endif
	totalEmissiveRadiance *= emissiveColor.rgb;
#endif`,Og=`#ifdef USE_EMISSIVEMAP
	uniform sampler2D emissiveMap;
#endif`,Bg="gl_FragColor = linearToOutputTexel( gl_FragColor );",zg=`vec4 LinearTransferOETF( in vec4 value ) {
	return value;
}
vec4 sRGBTransferEOTF( in vec4 value ) {
	return vec4( mix( pow( value.rgb * 0.9478672986 + vec3( 0.0521327014 ), vec3( 2.4 ) ), value.rgb * 0.0773993808, vec3( lessThanEqual( value.rgb, vec3( 0.04045 ) ) ) ), value.a );
}
vec4 sRGBTransferOETF( in vec4 value ) {
	return vec4( mix( pow( value.rgb, vec3( 0.41666 ) ) * 1.055 - vec3( 0.055 ), value.rgb * 12.92, vec3( lessThanEqual( value.rgb, vec3( 0.0031308 ) ) ) ), value.a );
}`,kg=`#ifdef USE_ENVMAP
	#ifdef ENV_WORLDPOS
		vec3 cameraToFrag;
		if ( isOrthographic ) {
			cameraToFrag = normalize( vec3( - viewMatrix[ 0 ][ 2 ], - viewMatrix[ 1 ][ 2 ], - viewMatrix[ 2 ][ 2 ] ) );
		} else {
			cameraToFrag = normalize( vWorldPosition - cameraPosition );
		}
		vec3 worldNormal = transformNormalByInverseViewMatrix( normal, viewMatrix );
		#ifdef ENVMAP_MODE_REFLECTION
			vec3 reflectVec = reflect( cameraToFrag, worldNormal );
		#else
			vec3 reflectVec = refract( cameraToFrag, worldNormal, refractionRatio );
		#endif
	#else
		vec3 reflectVec = vReflect;
	#endif
	#ifdef ENVMAP_TYPE_CUBE
		vec4 envColor = textureCube( envMap, envMapRotation * reflectVec );
		#ifdef ENVMAP_BLENDING_MULTIPLY
			outgoingLight = mix( outgoingLight, outgoingLight * envColor.xyz, specularStrength * reflectivity );
		#elif defined( ENVMAP_BLENDING_MIX )
			outgoingLight = mix( outgoingLight, envColor.xyz, specularStrength * reflectivity );
		#elif defined( ENVMAP_BLENDING_ADD )
			outgoingLight += envColor.xyz * specularStrength * reflectivity;
		#endif
	#endif
#endif`,Vg=`#ifdef USE_ENVMAP
	uniform float envMapIntensity;
	uniform mat3 envMapRotation;
	#ifdef ENVMAP_TYPE_CUBE
		uniform samplerCube envMap;
	#else
		uniform sampler2D envMap;
	#endif
#endif`,Hg=`#ifdef USE_ENVMAP
	uniform float reflectivity;
	#if defined( USE_BUMPMAP ) || defined( USE_NORMALMAP ) || defined( PHONG ) || defined( LAMBERT )
		#define ENV_WORLDPOS
	#endif
	#ifdef ENV_WORLDPOS
		varying vec3 vWorldPosition;
		uniform float refractionRatio;
	#else
		varying vec3 vReflect;
	#endif
#endif`,Gg=`#ifdef USE_ENVMAP
	#if defined( USE_BUMPMAP ) || defined( USE_NORMALMAP ) || defined( PHONG ) || defined( LAMBERT )
		#define ENV_WORLDPOS
	#endif
	#ifdef ENV_WORLDPOS
		
		varying vec3 vWorldPosition;
	#else
		varying vec3 vReflect;
		uniform float refractionRatio;
	#endif
#endif`,Wg=`#ifdef USE_ENVMAP
	#ifdef ENV_WORLDPOS
		vWorldPosition = worldPosition.xyz;
	#else
		vec3 cameraToVertex;
		if ( isOrthographic ) {
			cameraToVertex = normalize( vec3( - viewMatrix[ 0 ][ 2 ], - viewMatrix[ 1 ][ 2 ], - viewMatrix[ 2 ][ 2 ] ) );
		} else {
			cameraToVertex = normalize( worldPosition.xyz - cameraPosition );
		}
		vec3 worldNormal = transformNormalByInverseViewMatrix( transformedNormal, viewMatrix );
		#ifdef ENVMAP_MODE_REFLECTION
			vReflect = reflect( cameraToVertex, worldNormal );
		#else
			vReflect = refract( cameraToVertex, worldNormal, refractionRatio );
		#endif
	#endif
#endif`,Xg=`#ifdef USE_FOG
	vFogDepth = - mvPosition.z;
#endif`,qg=`#ifdef USE_FOG
	varying float vFogDepth;
#endif`,Yg=`#ifdef USE_FOG
	#ifdef FOG_EXP2
		float fogFactor = 1.0 - exp( - fogDensity * fogDensity * vFogDepth * vFogDepth );
	#else
		float fogFactor = smoothstep( fogNear, fogFar, vFogDepth );
	#endif
	gl_FragColor.rgb = mix( gl_FragColor.rgb, fogColor, fogFactor );
#endif`,$g=`#ifdef USE_FOG
	uniform vec3 fogColor;
	varying float vFogDepth;
	#ifdef FOG_EXP2
		uniform float fogDensity;
	#else
		uniform float fogNear;
		uniform float fogFar;
	#endif
#endif`,Kg=`#ifdef USE_GRADIENTMAP
	uniform sampler2D gradientMap;
#endif
vec3 getGradientIrradiance( vec3 normal, vec3 lightDirection ) {
	float dotNL = dot( normal, lightDirection );
	vec2 coord = vec2( dotNL * 0.5 + 0.5, 0.0 );
	#ifdef USE_GRADIENTMAP
		return vec3( texture2D( gradientMap, coord ).r );
	#else
		vec2 fw = fwidth( coord ) * 0.5;
		return mix( vec3( 0.7 ), vec3( 1.0 ), smoothstep( 0.7 - fw.x, 0.7 + fw.x, coord.x ) );
	#endif
}`,Zg=`#ifdef USE_LIGHTMAP
	uniform sampler2D lightMap;
	uniform float lightMapIntensity;
#endif`,Jg=`LambertMaterial material;
material.diffuseColor = diffuseColor.rgb;
material.specularStrength = specularStrength;`,jg=`varying vec3 vViewPosition;
struct LambertMaterial {
	vec3 diffuseColor;
	float specularStrength;
};
void RE_Direct_Lambert( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in LambertMaterial material, inout ReflectedLight reflectedLight ) {
	float dotNL = saturate( dot( geometryNormal, directLight.direction ) );
	vec3 irradiance = dotNL * directLight.color;
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
void RE_IndirectDiffuse_Lambert( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in LambertMaterial material, inout ReflectedLight reflectedLight ) {
	reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
#define RE_Direct				RE_Direct_Lambert
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Lambert`,Qg=`uniform bool receiveShadow;
uniform vec3 ambientLightColor;
#if defined( USE_LIGHT_PROBES )
	uniform vec3 lightProbe[ 9 ];
#endif
vec3 shGetIrradianceAt( in vec3 normal, in vec3 shCoefficients[ 9 ] ) {
	float x = normal.x, y = normal.y, z = normal.z;
	vec3 result = shCoefficients[ 0 ] * 0.886227;
	result += shCoefficients[ 1 ] * 2.0 * 0.511664 * y;
	result += shCoefficients[ 2 ] * 2.0 * 0.511664 * z;
	result += shCoefficients[ 3 ] * 2.0 * 0.511664 * x;
	result += shCoefficients[ 4 ] * 2.0 * 0.429043 * x * y;
	result += shCoefficients[ 5 ] * 2.0 * 0.429043 * y * z;
	result += shCoefficients[ 6 ] * ( 0.743125 * z * z - 0.247708 );
	result += shCoefficients[ 7 ] * 2.0 * 0.429043 * x * z;
	result += shCoefficients[ 8 ] * 0.429043 * ( x * x - y * y );
	return result;
}
vec3 getLightProbeIrradiance( const in vec3 lightProbe[ 9 ], const in vec3 normal ) {
	vec3 worldNormal = transformNormalByInverseViewMatrix( normal, viewMatrix );
	vec3 irradiance = shGetIrradianceAt( worldNormal, lightProbe );
	return irradiance;
}
vec3 getAmbientLightIrradiance( const in vec3 ambientLightColor ) {
	vec3 irradiance = ambientLightColor;
	return irradiance;
}
float getDistanceAttenuation( const in float lightDistance, const in float cutoffDistance, const in float decayExponent ) {
	float distanceFalloff = 1.0 / max( pow( lightDistance, decayExponent ), 0.01 );
	if ( cutoffDistance > 0.0 ) {
		distanceFalloff *= pow2( saturate( 1.0 - pow4( lightDistance / cutoffDistance ) ) );
	}
	return distanceFalloff;
}
float getSpotAttenuation( const in float coneCosine, const in float penumbraCosine, const in float angleCosine ) {
	return smoothstep( coneCosine, penumbraCosine, angleCosine );
}
#if NUM_DIR_LIGHTS > 0
	struct DirectionalLight {
		vec3 direction;
		vec3 color;
	};
	uniform DirectionalLight directionalLights[ NUM_DIR_LIGHTS ];
	void getDirectionalLightInfo( const in DirectionalLight directionalLight, out IncidentLight light ) {
		light.color = directionalLight.color;
		light.direction = directionalLight.direction;
		light.visible = true;
	}
#endif
#if NUM_POINT_LIGHTS > 0
	struct PointLight {
		vec3 position;
		vec3 color;
		float distance;
		float decay;
	};
	uniform PointLight pointLights[ NUM_POINT_LIGHTS ];
	void getPointLightInfo( const in PointLight pointLight, const in vec3 geometryPosition, out IncidentLight light ) {
		vec3 lVector = pointLight.position - geometryPosition;
		light.direction = normalize( lVector );
		float lightDistance = length( lVector );
		light.color = pointLight.color;
		light.color *= getDistanceAttenuation( lightDistance, pointLight.distance, pointLight.decay );
		light.visible = ( light.color != vec3( 0.0 ) );
	}
#endif
#if NUM_SPOT_LIGHTS > 0
	struct SpotLight {
		vec3 position;
		vec3 direction;
		vec3 color;
		float distance;
		float decay;
		float coneCos;
		float penumbraCos;
	};
	uniform SpotLight spotLights[ NUM_SPOT_LIGHTS ];
	void getSpotLightInfo( const in SpotLight spotLight, const in vec3 geometryPosition, out IncidentLight light ) {
		vec3 lVector = spotLight.position - geometryPosition;
		light.direction = normalize( lVector );
		float angleCos = dot( light.direction, spotLight.direction );
		float spotAttenuation = getSpotAttenuation( spotLight.coneCos, spotLight.penumbraCos, angleCos );
		if ( spotAttenuation > 0.0 ) {
			float lightDistance = length( lVector );
			light.color = spotLight.color * spotAttenuation;
			light.color *= getDistanceAttenuation( lightDistance, spotLight.distance, spotLight.decay );
			light.visible = ( light.color != vec3( 0.0 ) );
		} else {
			light.color = vec3( 0.0 );
			light.visible = false;
		}
	}
#endif
#if NUM_RECT_AREA_LIGHTS > 0
	struct RectAreaLight {
		vec3 color;
		vec3 position;
		vec3 halfWidth;
		vec3 halfHeight;
	};
	uniform sampler2D ltc_1;	uniform sampler2D ltc_2;
	uniform RectAreaLight rectAreaLights[ NUM_RECT_AREA_LIGHTS ];
#endif
#if NUM_HEMI_LIGHTS > 0
	struct HemisphereLight {
		vec3 direction;
		vec3 skyColor;
		vec3 groundColor;
	};
	uniform HemisphereLight hemisphereLights[ NUM_HEMI_LIGHTS ];
	vec3 getHemisphereLightIrradiance( const in HemisphereLight hemiLight, const in vec3 normal ) {
		float dotNL = dot( normal, hemiLight.direction );
		float hemiDiffuseWeight = 0.5 * dotNL + 0.5;
		vec3 irradiance = mix( hemiLight.groundColor, hemiLight.skyColor, hemiDiffuseWeight );
		return irradiance;
	}
#endif
#include <lightprobes_pars_fragment>`,ex=`#ifdef USE_ENVMAP
	vec3 getIBLIrradiance( const in vec3 normal ) {
		#ifdef ENVMAP_TYPE_CUBE_UV
			vec3 worldNormal = transformNormalByInverseViewMatrix( normal, viewMatrix );
			vec4 envMapColor = textureCubeUV( envMap, envMapRotation * worldNormal, 1.0 );
			return PI * envMapColor.rgb * envMapIntensity;
		#else
			return vec3( 0.0 );
		#endif
	}
	vec3 getIBLRadiance( const in vec3 viewDir, const in vec3 normal, const in float roughness ) {
		#ifdef ENVMAP_TYPE_CUBE_UV
			vec3 reflectVec = reflect( - viewDir, normal );
			reflectVec = normalize( mix( reflectVec, normal, pow4( roughness ) ) );
			reflectVec = transformDirectionByInverseViewMatrix( reflectVec, viewMatrix );
			vec4 envMapColor = textureCubeUV( envMap, envMapRotation * reflectVec, roughness );
			return envMapColor.rgb * envMapIntensity;
		#else
			return vec3( 0.0 );
		#endif
	}
	#ifdef USE_ANISOTROPY
		vec3 getIBLAnisotropyRadiance( const in vec3 viewDir, const in vec3 normal, const in float roughness, const in vec3 bitangent, const in float anisotropy ) {
			#ifdef ENVMAP_TYPE_CUBE_UV
				vec3 bentNormal = cross( bitangent, viewDir );
				bentNormal = normalize( cross( bentNormal, bitangent ) );
				bentNormal = normalize( mix( bentNormal, normal, pow2( pow2( 1.0 - anisotropy * ( 1.0 - roughness ) ) ) ) );
				return getIBLRadiance( viewDir, bentNormal, roughness );
			#else
				return vec3( 0.0 );
			#endif
		}
	#endif
#endif`,tx=`ToonMaterial material;
material.diffuseColor = diffuseColor.rgb;`,nx=`varying vec3 vViewPosition;
struct ToonMaterial {
	vec3 diffuseColor;
};
void RE_Direct_Toon( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in ToonMaterial material, inout ReflectedLight reflectedLight ) {
	vec3 irradiance = getGradientIrradiance( geometryNormal, directLight.direction ) * directLight.color;
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
void RE_IndirectDiffuse_Toon( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in ToonMaterial material, inout ReflectedLight reflectedLight ) {
	reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
#define RE_Direct				RE_Direct_Toon
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Toon`,ix=`BlinnPhongMaterial material;
material.diffuseColor = diffuseColor.rgb;
material.specularColor = specular;
material.specularShininess = shininess;
material.specularStrength = specularStrength;`,sx=`varying vec3 vViewPosition;
struct BlinnPhongMaterial {
	vec3 diffuseColor;
	vec3 specularColor;
	float specularShininess;
	float specularStrength;
};
void RE_Direct_BlinnPhong( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in BlinnPhongMaterial material, inout ReflectedLight reflectedLight ) {
	float dotNL = saturate( dot( geometryNormal, directLight.direction ) );
	vec3 irradiance = dotNL * directLight.color;
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
	reflectedLight.directSpecular += irradiance * BRDF_BlinnPhong( directLight.direction, geometryViewDir, geometryNormal, material.specularColor, material.specularShininess ) * material.specularStrength;
}
void RE_IndirectDiffuse_BlinnPhong( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in BlinnPhongMaterial material, inout ReflectedLight reflectedLight ) {
	reflectedLight.indirectDiffuse += irradiance * BRDF_Lambert( material.diffuseColor );
}
#define RE_Direct				RE_Direct_BlinnPhong
#define RE_IndirectDiffuse		RE_IndirectDiffuse_BlinnPhong`,rx=`PhysicalMaterial material;
material.diffuseColor = diffuseColor.rgb;
material.diffuseContribution = diffuseColor.rgb * ( 1.0 - metalnessFactor );
material.metalness = metalnessFactor;
vec3 dxy = max( abs( dFdx( nonPerturbedNormal ) ), abs( dFdy( nonPerturbedNormal ) ) );
float geometryRoughness = max( max( dxy.x, dxy.y ), dxy.z );
material.roughness = max( roughnessFactor, 0.0525 );material.roughness += geometryRoughness;
material.roughness = min( material.roughness, 1.0 );
#ifdef IOR
	material.ior = ior;
	#ifdef USE_SPECULAR
		float specularIntensityFactor = specularIntensity;
		vec3 specularColorFactor = specularColor;
		#ifdef USE_SPECULAR_COLORMAP
			specularColorFactor *= texture2D( specularColorMap, vSpecularColorMapUv ).rgb;
		#endif
		#ifdef USE_SPECULAR_INTENSITYMAP
			specularIntensityFactor *= texture2D( specularIntensityMap, vSpecularIntensityMapUv ).a;
		#endif
		material.specularF90 = mix( specularIntensityFactor, 1.0, metalnessFactor );
	#else
		float specularIntensityFactor = 1.0;
		vec3 specularColorFactor = vec3( 1.0 );
		material.specularF90 = 1.0;
	#endif
	material.specularColor = min( pow2( ( material.ior - 1.0 ) / ( material.ior + 1.0 ) ) * specularColorFactor, vec3( 1.0 ) ) * specularIntensityFactor;
	material.specularColorBlended = mix( material.specularColor, diffuseColor.rgb, metalnessFactor );
#else
	material.specularColor = vec3( 0.04 );
	material.specularColorBlended = mix( material.specularColor, diffuseColor.rgb, metalnessFactor );
	material.specularF90 = 1.0;
#endif
#ifdef USE_CLEARCOAT
	material.clearcoat = clearcoat;
	material.clearcoatRoughness = clearcoatRoughness;
	material.clearcoatF0 = vec3( 0.04 );
	material.clearcoatF90 = 1.0;
	#ifdef USE_CLEARCOATMAP
		material.clearcoat *= texture2D( clearcoatMap, vClearcoatMapUv ).x;
	#endif
	#ifdef USE_CLEARCOAT_ROUGHNESSMAP
		material.clearcoatRoughness *= texture2D( clearcoatRoughnessMap, vClearcoatRoughnessMapUv ).y;
	#endif
	material.clearcoat = saturate( material.clearcoat );	material.clearcoatRoughness = max( material.clearcoatRoughness, 0.0525 );
	material.clearcoatRoughness += geometryRoughness;
	material.clearcoatRoughness = min( material.clearcoatRoughness, 1.0 );
#endif
#ifdef USE_DISPERSION
	material.dispersion = dispersion;
#endif
#ifdef USE_IRIDESCENCE
	material.iridescence = iridescence;
	material.iridescenceIOR = iridescenceIOR;
	#ifdef USE_IRIDESCENCEMAP
		material.iridescence *= texture2D( iridescenceMap, vIridescenceMapUv ).r;
	#endif
	#ifdef USE_IRIDESCENCE_THICKNESSMAP
		material.iridescenceThickness = (iridescenceThicknessMaximum - iridescenceThicknessMinimum) * texture2D( iridescenceThicknessMap, vIridescenceThicknessMapUv ).g + iridescenceThicknessMinimum;
	#else
		material.iridescenceThickness = iridescenceThicknessMaximum;
	#endif
#endif
#ifdef USE_SHEEN
	material.sheenColor = sheenColor;
	#ifdef USE_SHEEN_COLORMAP
		material.sheenColor *= texture2D( sheenColorMap, vSheenColorMapUv ).rgb;
	#endif
	material.sheenRoughness = clamp( sheenRoughness, 0.0001, 1.0 );
	#ifdef USE_SHEEN_ROUGHNESSMAP
		material.sheenRoughness *= texture2D( sheenRoughnessMap, vSheenRoughnessMapUv ).a;
	#endif
#endif
#ifdef USE_ANISOTROPY
	#ifdef USE_ANISOTROPYMAP
		mat2 anisotropyMat = mat2( anisotropyVector.x, anisotropyVector.y, - anisotropyVector.y, anisotropyVector.x );
		vec3 anisotropyPolar = texture2D( anisotropyMap, vAnisotropyMapUv ).rgb;
		vec2 anisotropyV = anisotropyMat * normalize( 2.0 * anisotropyPolar.rg - vec2( 1.0 ) ) * anisotropyPolar.b;
	#else
		vec2 anisotropyV = anisotropyVector;
	#endif
	material.anisotropy = length( anisotropyV );
	if( material.anisotropy == 0.0 ) {
		anisotropyV = vec2( 1.0, 0.0 );
	} else {
		anisotropyV /= material.anisotropy;
		material.anisotropy = saturate( material.anisotropy );
	}
	material.alphaT = mix( pow2( material.roughness ), 1.0, pow2( material.anisotropy ) );
	material.anisotropyT = tbn[ 0 ] * anisotropyV.x + tbn[ 1 ] * anisotropyV.y;
	material.anisotropyB = tbn[ 1 ] * anisotropyV.x - tbn[ 0 ] * anisotropyV.y;
#endif`,ox=`uniform sampler2D dfgLUT;
struct PhysicalMaterial {
	vec3 diffuseColor;
	vec3 diffuseContribution;
	vec3 specularColor;
	vec3 specularColorBlended;
	float roughness;
	float metalness;
	float specularF90;
	float dispersion;
	#ifdef USE_CLEARCOAT
		float clearcoat;
		float clearcoatRoughness;
		vec3 clearcoatF0;
		float clearcoatF90;
	#endif
	#ifdef USE_IRIDESCENCE
		float iridescence;
		float iridescenceIOR;
		float iridescenceThickness;
		vec3 iridescenceFresnel;
		vec3 iridescenceF0;
		vec3 iridescenceFresnelDielectric;
		vec3 iridescenceFresnelMetallic;
	#endif
	#ifdef USE_SHEEN
		vec3 sheenColor;
		float sheenRoughness;
	#endif
	#ifdef IOR
		float ior;
	#endif
	#ifdef USE_TRANSMISSION
		float transmission;
		float transmissionAlpha;
		float thickness;
		float attenuationDistance;
		vec3 attenuationColor;
	#endif
	#ifdef USE_ANISOTROPY
		float anisotropy;
		float alphaT;
		vec3 anisotropyT;
		vec3 anisotropyB;
	#endif
};
vec3 clearcoatSpecularDirect = vec3( 0.0 );
vec3 clearcoatSpecularIndirect = vec3( 0.0 );
vec3 sheenSpecularDirect = vec3( 0.0 );
vec3 sheenSpecularIndirect = vec3(0.0 );
vec3 Schlick_to_F0( const in vec3 f, const in float f90, const in float dotVH ) {
    float x = clamp( 1.0 - dotVH, 0.0, 1.0 );
    float x2 = x * x;
    float x5 = clamp( x * x2 * x2, 0.0, 0.9999 );
    return ( f - vec3( f90 ) * x5 ) / ( 1.0 - x5 );
}
float V_GGX_SmithCorrelated( const in float alpha, const in float dotNL, const in float dotNV ) {
	float a2 = pow2( alpha );
	float gv = dotNL * sqrt( a2 + ( 1.0 - a2 ) * pow2( dotNV ) );
	float gl = dotNV * sqrt( a2 + ( 1.0 - a2 ) * pow2( dotNL ) );
	return 0.5 / max( gv + gl, EPSILON );
}
float D_GGX( const in float alpha, const in float dotNH ) {
	float a2 = pow2( alpha );
	float denom = pow2( dotNH ) * ( a2 - 1.0 ) + 1.0;
	return RECIPROCAL_PI * a2 / pow2( denom );
}
#ifdef USE_ANISOTROPY
	float V_GGX_SmithCorrelated_Anisotropic( const in float alphaT, const in float alphaB, const in float dotTV, const in float dotBV, const in float dotTL, const in float dotBL, const in float dotNV, const in float dotNL ) {
		float gv = dotNL * length( vec3( alphaT * dotTV, alphaB * dotBV, dotNV ) );
		float gl = dotNV * length( vec3( alphaT * dotTL, alphaB * dotBL, dotNL ) );
		return 0.5 / max( gv + gl, EPSILON );
	}
	float D_GGX_Anisotropic( const in float alphaT, const in float alphaB, const in float dotNH, const in float dotTH, const in float dotBH ) {
		float a2 = alphaT * alphaB;
		highp vec3 v = vec3( alphaB * dotTH, alphaT * dotBH, a2 * dotNH );
		highp float v2 = dot( v, v );
		float w2 = a2 / v2;
		return RECIPROCAL_PI * a2 * pow2 ( w2 );
	}
#endif
#ifdef USE_CLEARCOAT
	vec3 BRDF_GGX_Clearcoat( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, const in PhysicalMaterial material) {
		vec3 f0 = material.clearcoatF0;
		float f90 = material.clearcoatF90;
		float roughness = material.clearcoatRoughness;
		float alpha = pow2( roughness );
		vec3 halfDir = normalize( lightDir + viewDir );
		float dotNL = saturate( dot( normal, lightDir ) );
		float dotNV = saturate( dot( normal, viewDir ) );
		float dotNH = saturate( dot( normal, halfDir ) );
		float dotVH = saturate( dot( viewDir, halfDir ) );
		vec3 F = F_Schlick( f0, f90, dotVH );
		float V = V_GGX_SmithCorrelated( alpha, dotNL, dotNV );
		float D = D_GGX( alpha, dotNH );
		return F * ( V * D );
	}
#endif
vec3 BRDF_GGX( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, const in PhysicalMaterial material ) {
	vec3 f0 = material.specularColorBlended;
	float f90 = material.specularF90;
	float roughness = material.roughness;
	float alpha = pow2( roughness );
	vec3 halfDir = normalize( lightDir + viewDir );
	float dotNL = saturate( dot( normal, lightDir ) );
	float dotNV = saturate( dot( normal, viewDir ) );
	float dotNH = saturate( dot( normal, halfDir ) );
	float dotVH = saturate( dot( viewDir, halfDir ) );
	vec3 F = F_Schlick( f0, f90, dotVH );
	#ifdef USE_IRIDESCENCE
		F = mix( F, material.iridescenceFresnel, material.iridescence );
	#endif
	#ifdef USE_ANISOTROPY
		float dotTL = dot( material.anisotropyT, lightDir );
		float dotTV = dot( material.anisotropyT, viewDir );
		float dotTH = dot( material.anisotropyT, halfDir );
		float dotBL = dot( material.anisotropyB, lightDir );
		float dotBV = dot( material.anisotropyB, viewDir );
		float dotBH = dot( material.anisotropyB, halfDir );
		float V = V_GGX_SmithCorrelated_Anisotropic( material.alphaT, alpha, dotTV, dotBV, dotTL, dotBL, dotNV, dotNL );
		float D = D_GGX_Anisotropic( material.alphaT, alpha, dotNH, dotTH, dotBH );
	#else
		float V = V_GGX_SmithCorrelated( alpha, dotNL, dotNV );
		float D = D_GGX( alpha, dotNH );
	#endif
	return F * ( V * D );
}
vec2 LTC_Uv( const in vec3 N, const in vec3 V, const in float roughness ) {
	const float LUT_SIZE = 64.0;
	const float LUT_SCALE = ( LUT_SIZE - 1.0 ) / LUT_SIZE;
	const float LUT_BIAS = 0.5 / LUT_SIZE;
	float dotNV = saturate( dot( N, V ) );
	vec2 uv = vec2( roughness, sqrt( 1.0 - dotNV ) );
	uv = uv * LUT_SCALE + LUT_BIAS;
	return uv;
}
float LTC_ClippedSphereFormFactor( const in vec3 f ) {
	float l = length( f );
	return max( ( l * l + f.z ) / ( l + 1.0 ), 0.0 );
}
vec3 LTC_EdgeVectorFormFactor( const in vec3 v1, const in vec3 v2 ) {
	float x = dot( v1, v2 );
	float y = abs( x );
	float a = 0.8543985 + ( 0.4965155 + 0.0145206 * y ) * y;
	float b = 3.4175940 + ( 4.1616724 + y ) * y;
	float v = a / b;
	float theta_sintheta = ( x > 0.0 ) ? v : 0.5 * inversesqrt( max( 1.0 - x * x, 1e-7 ) ) - v;
	return cross( v1, v2 ) * theta_sintheta;
}
vec3 LTC_Evaluate( const in vec3 N, const in vec3 V, const in vec3 P, const in mat3 mInv, const in vec3 rectCoords[ 4 ] ) {
	vec3 v1 = rectCoords[ 1 ] - rectCoords[ 0 ];
	vec3 v2 = rectCoords[ 3 ] - rectCoords[ 0 ];
	vec3 lightNormal = cross( v1, v2 );
	if( dot( lightNormal, P - rectCoords[ 0 ] ) < 0.0 ) return vec3( 0.0 );
	vec3 T1, T2;
	T1 = normalize( V - N * dot( V, N ) );
	T2 = - cross( N, T1 );
	mat3 mat = mInv * transpose( mat3( T1, T2, N ) );
	vec3 coords[ 4 ];
	coords[ 0 ] = mat * ( rectCoords[ 0 ] - P );
	coords[ 1 ] = mat * ( rectCoords[ 1 ] - P );
	coords[ 2 ] = mat * ( rectCoords[ 2 ] - P );
	coords[ 3 ] = mat * ( rectCoords[ 3 ] - P );
	coords[ 0 ] = normalize( coords[ 0 ] );
	coords[ 1 ] = normalize( coords[ 1 ] );
	coords[ 2 ] = normalize( coords[ 2 ] );
	coords[ 3 ] = normalize( coords[ 3 ] );
	vec3 vectorFormFactor = vec3( 0.0 );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 0 ], coords[ 1 ] );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 1 ], coords[ 2 ] );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 2 ], coords[ 3 ] );
	vectorFormFactor += LTC_EdgeVectorFormFactor( coords[ 3 ], coords[ 0 ] );
	float result = LTC_ClippedSphereFormFactor( vectorFormFactor );
	return vec3( result );
}
#if defined( USE_SHEEN )
float D_Charlie( float roughness, float dotNH ) {
	float alpha = pow2( roughness );
	float invAlpha = 1.0 / alpha;
	float cos2h = dotNH * dotNH;
	float sin2h = max( 1.0 - cos2h, 0.0078125 );
	return ( 2.0 + invAlpha ) * pow( sin2h, invAlpha * 0.5 ) / ( 2.0 * PI );
}
float V_Neubelt( float dotNV, float dotNL ) {
	return saturate( 1.0 / ( 4.0 * ( dotNL + dotNV - dotNL * dotNV ) ) );
}
vec3 BRDF_Sheen( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, vec3 sheenColor, const in float sheenRoughness ) {
	vec3 halfDir = normalize( lightDir + viewDir );
	float dotNL = saturate( dot( normal, lightDir ) );
	float dotNV = saturate( dot( normal, viewDir ) );
	float dotNH = saturate( dot( normal, halfDir ) );
	float D = D_Charlie( sheenRoughness, dotNH );
	float V = V_Neubelt( dotNV, dotNL );
	return sheenColor * ( D * V );
}
#endif
float IBLSheenBRDF( const in vec3 normal, const in vec3 viewDir, const in float roughness ) {
	float dotNV = saturate( dot( normal, viewDir ) );
	float r2 = roughness * roughness;
	float rInv = 1.0 / ( roughness + 0.1 );
	float a = -1.9362 + 1.0678 * roughness + 0.4573 * r2 - 0.8469 * rInv;
	float b = -0.6014 + 0.5538 * roughness - 0.4670 * r2 - 0.1255 * rInv;
	float DG = exp( a * dotNV + b );
	return saturate( DG );
}
vec3 EnvironmentBRDF( const in vec3 normal, const in vec3 viewDir, const in vec3 specularColor, const in float specularF90, const in float roughness ) {
	float dotNV = saturate( dot( normal, viewDir ) );
	vec2 fab = texture2D( dfgLUT, vec2( roughness, dotNV ) ).rg;
	return specularColor * fab.x + specularF90 * fab.y;
}
#ifdef USE_IRIDESCENCE
void computeMultiscatteringIridescence( const in vec3 normal, const in vec3 viewDir, const in vec3 specularColor, const in float specularF90, const in float iridescence, const in vec3 iridescenceF0, const in float roughness, inout vec3 singleScatter, inout vec3 multiScatter ) {
#else
void computeMultiscattering( const in vec3 normal, const in vec3 viewDir, const in vec3 specularColor, const in float specularF90, const in float roughness, inout vec3 singleScatter, inout vec3 multiScatter ) {
#endif
	float dotNV = saturate( dot( normal, viewDir ) );
	vec2 fab = texture2D( dfgLUT, vec2( roughness, dotNV ) ).rg;
	#ifdef USE_IRIDESCENCE
		vec3 Fr = mix( specularColor, iridescenceF0, iridescence );
	#else
		vec3 Fr = specularColor;
	#endif
	vec3 FssEss = Fr * fab.x + specularF90 * fab.y;
	float Ess = fab.x + fab.y;
	float Ems = 1.0 - Ess;
	vec3 Favg = Fr + ( 1.0 - Fr ) * 0.047619;	vec3 Fms = FssEss * Favg / ( 1.0 - Ems * Favg );
	singleScatter += FssEss;
	multiScatter += Fms * Ems;
}
vec3 BRDF_GGX_Multiscatter( const in vec3 lightDir, const in vec3 viewDir, const in vec3 normal, const in PhysicalMaterial material ) {
	vec3 singleScatter = BRDF_GGX( lightDir, viewDir, normal, material );
	float dotNL = saturate( dot( normal, lightDir ) );
	float dotNV = saturate( dot( normal, viewDir ) );
	vec2 dfgV = texture2D( dfgLUT, vec2( material.roughness, dotNV ) ).rg;
	vec2 dfgL = texture2D( dfgLUT, vec2( material.roughness, dotNL ) ).rg;
	vec3 FssEss_V = material.specularColorBlended * dfgV.x + material.specularF90 * dfgV.y;
	vec3 FssEss_L = material.specularColorBlended * dfgL.x + material.specularF90 * dfgL.y;
	float Ess_V = dfgV.x + dfgV.y;
	float Ess_L = dfgL.x + dfgL.y;
	float Ems_V = 1.0 - Ess_V;
	float Ems_L = 1.0 - Ess_L;
	vec3 Favg = material.specularColorBlended + ( 1.0 - material.specularColorBlended ) * 0.047619;
	vec3 Fms = FssEss_V * FssEss_L * Favg / ( 1.0 - Ems_V * Ems_L * Favg + EPSILON );
	float compensationFactor = Ems_V * Ems_L;
	vec3 multiScatter = Fms * compensationFactor;
	return singleScatter + multiScatter;
}
#if NUM_RECT_AREA_LIGHTS > 0
	void RE_Direct_RectArea_Physical( const in RectAreaLight rectAreaLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight ) {
		vec3 normal = geometryNormal;
		vec3 viewDir = geometryViewDir;
		vec3 position = geometryPosition;
		vec3 lightPos = rectAreaLight.position;
		vec3 halfWidth = rectAreaLight.halfWidth;
		vec3 halfHeight = rectAreaLight.halfHeight;
		vec3 lightColor = rectAreaLight.color;
		float roughness = material.roughness;
		vec3 rectCoords[ 4 ];
		rectCoords[ 0 ] = lightPos + halfWidth - halfHeight;		rectCoords[ 1 ] = lightPos - halfWidth - halfHeight;
		rectCoords[ 2 ] = lightPos - halfWidth + halfHeight;
		rectCoords[ 3 ] = lightPos + halfWidth + halfHeight;
		vec2 uv = LTC_Uv( normal, viewDir, roughness );
		vec4 t1 = texture2D( ltc_1, uv );
		vec4 t2 = texture2D( ltc_2, uv );
		mat3 mInv = mat3(
			vec3( t1.x, 0, t1.y ),
			vec3(    0, 1,    0 ),
			vec3( t1.z, 0, t1.w )
		);
		vec3 fresnel = ( material.specularColorBlended * t2.x + ( material.specularF90 - material.specularColorBlended ) * t2.y );
		reflectedLight.directSpecular += lightColor * fresnel * LTC_Evaluate( normal, viewDir, position, mInv, rectCoords );
		reflectedLight.directDiffuse += lightColor * material.diffuseContribution * LTC_Evaluate( normal, viewDir, position, mat3( 1.0 ), rectCoords );
		#ifdef USE_CLEARCOAT
			vec3 Ncc = geometryClearcoatNormal;
			vec2 uvClearcoat = LTC_Uv( Ncc, viewDir, material.clearcoatRoughness );
			vec4 t1Clearcoat = texture2D( ltc_1, uvClearcoat );
			vec4 t2Clearcoat = texture2D( ltc_2, uvClearcoat );
			mat3 mInvClearcoat = mat3(
				vec3( t1Clearcoat.x, 0, t1Clearcoat.y ),
				vec3(             0, 1,             0 ),
				vec3( t1Clearcoat.z, 0, t1Clearcoat.w )
			);
			vec3 fresnelClearcoat = material.clearcoatF0 * t2Clearcoat.x + ( material.clearcoatF90 - material.clearcoatF0 ) * t2Clearcoat.y;
			clearcoatSpecularDirect += lightColor * fresnelClearcoat * LTC_Evaluate( Ncc, viewDir, position, mInvClearcoat, rectCoords );
		#endif
	}
#endif
void RE_Direct_Physical( const in IncidentLight directLight, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight ) {
	float dotNL = saturate( dot( geometryNormal, directLight.direction ) );
	vec3 irradiance = dotNL * directLight.color;
	#ifdef USE_CLEARCOAT
		float dotNLcc = saturate( dot( geometryClearcoatNormal, directLight.direction ) );
		vec3 ccIrradiance = dotNLcc * directLight.color;
		clearcoatSpecularDirect += ccIrradiance * BRDF_GGX_Clearcoat( directLight.direction, geometryViewDir, geometryClearcoatNormal, material );
	#endif
	#ifdef USE_SHEEN
 
 		sheenSpecularDirect += irradiance * BRDF_Sheen( directLight.direction, geometryViewDir, geometryNormal, material.sheenColor, material.sheenRoughness );
 
 		float sheenAlbedoV = IBLSheenBRDF( geometryNormal, geometryViewDir, material.sheenRoughness );
 		float sheenAlbedoL = IBLSheenBRDF( geometryNormal, directLight.direction, material.sheenRoughness );
 
 		float sheenEnergyComp = 1.0 - max3( material.sheenColor ) * max( sheenAlbedoV, sheenAlbedoL );
 
 		irradiance *= sheenEnergyComp;
 
 	#endif
	reflectedLight.directSpecular += irradiance * BRDF_GGX_Multiscatter( directLight.direction, geometryViewDir, geometryNormal, material );
	reflectedLight.directDiffuse += irradiance * BRDF_Lambert( material.diffuseContribution );
}
void RE_IndirectDiffuse_Physical( const in vec3 irradiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight ) {
	vec3 diffuse = irradiance * BRDF_Lambert( material.diffuseContribution );
	#ifdef USE_SHEEN
		float sheenAlbedo = IBLSheenBRDF( geometryNormal, geometryViewDir, material.sheenRoughness );
		float sheenEnergyComp = 1.0 - max3( material.sheenColor ) * sheenAlbedo;
		diffuse *= sheenEnergyComp;
	#endif
	reflectedLight.indirectDiffuse += diffuse;
}
void RE_IndirectSpecular_Physical( const in vec3 radiance, const in vec3 irradiance, const in vec3 clearcoatRadiance, const in vec3 geometryPosition, const in vec3 geometryNormal, const in vec3 geometryViewDir, const in vec3 geometryClearcoatNormal, const in PhysicalMaterial material, inout ReflectedLight reflectedLight) {
	#ifdef USE_CLEARCOAT
		clearcoatSpecularIndirect += clearcoatRadiance * EnvironmentBRDF( geometryClearcoatNormal, geometryViewDir, material.clearcoatF0, material.clearcoatF90, material.clearcoatRoughness );
	#endif
	#ifdef USE_SHEEN
		sheenSpecularIndirect += irradiance * material.sheenColor * IBLSheenBRDF( geometryNormal, geometryViewDir, material.sheenRoughness ) * RECIPROCAL_PI;
 	#endif
	vec3 singleScatteringDielectric = vec3( 0.0 );
	vec3 multiScatteringDielectric = vec3( 0.0 );
	vec3 singleScatteringMetallic = vec3( 0.0 );
	vec3 multiScatteringMetallic = vec3( 0.0 );
	#ifdef USE_IRIDESCENCE
		computeMultiscatteringIridescence( geometryNormal, geometryViewDir, material.specularColor, material.specularF90, material.iridescence, material.iridescenceFresnelDielectric, material.roughness, singleScatteringDielectric, multiScatteringDielectric );
		computeMultiscatteringIridescence( geometryNormal, geometryViewDir, material.diffuseColor, material.specularF90, material.iridescence, material.iridescenceFresnelMetallic, material.roughness, singleScatteringMetallic, multiScatteringMetallic );
	#else
		computeMultiscattering( geometryNormal, geometryViewDir, material.specularColor, material.specularF90, material.roughness, singleScatteringDielectric, multiScatteringDielectric );
		computeMultiscattering( geometryNormal, geometryViewDir, material.diffuseColor, material.specularF90, material.roughness, singleScatteringMetallic, multiScatteringMetallic );
	#endif
	vec3 singleScattering = mix( singleScatteringDielectric, singleScatteringMetallic, material.metalness );
	vec3 multiScattering = mix( multiScatteringDielectric, multiScatteringMetallic, material.metalness );
	vec3 totalScatteringDielectric = singleScatteringDielectric + multiScatteringDielectric;
	vec3 diffuse = material.diffuseContribution * ( 1.0 - totalScatteringDielectric );
	vec3 cosineWeightedIrradiance = irradiance * RECIPROCAL_PI;
	vec3 indirectSpecular = radiance * singleScattering;
	indirectSpecular += multiScattering * cosineWeightedIrradiance;
	vec3 indirectDiffuse = diffuse * cosineWeightedIrradiance;
	#ifdef USE_SHEEN
		float sheenAlbedo = IBLSheenBRDF( geometryNormal, geometryViewDir, material.sheenRoughness );
		float sheenEnergyComp = 1.0 - max3( material.sheenColor ) * sheenAlbedo;
		indirectSpecular *= sheenEnergyComp;
		indirectDiffuse *= sheenEnergyComp;
	#endif
	reflectedLight.indirectSpecular += indirectSpecular;
	reflectedLight.indirectDiffuse += indirectDiffuse;
}
#define RE_Direct				RE_Direct_Physical
#define RE_Direct_RectArea		RE_Direct_RectArea_Physical
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Physical
#define RE_IndirectSpecular		RE_IndirectSpecular_Physical
float computeSpecularOcclusion( const in float dotNV, const in float ambientOcclusion, const in float roughness ) {
	return saturate( pow( dotNV + ambientOcclusion, exp2( - 16.0 * roughness - 1.0 ) ) - 1.0 + ambientOcclusion );
}`,ax=`
vec3 geometryPosition = - vViewPosition;
vec3 geometryNormal = normal;
vec3 geometryViewDir = ( isOrthographic ) ? vec3( 0, 0, 1 ) : normalize( vViewPosition );
vec3 geometryClearcoatNormal = vec3( 0.0 );
#ifdef USE_CLEARCOAT
	geometryClearcoatNormal = clearcoatNormal;
#endif
#ifdef USE_IRIDESCENCE
	float dotNVi = saturate( dot( normal, geometryViewDir ) );
	if ( material.iridescenceThickness == 0.0 ) {
		material.iridescence = 0.0;
	} else {
		material.iridescence = saturate( material.iridescence );
	}
	if ( material.iridescence > 0.0 ) {
		material.iridescenceFresnelDielectric = evalIridescence( 1.0, material.iridescenceIOR, dotNVi, material.iridescenceThickness, material.specularColor );
		material.iridescenceFresnelMetallic = evalIridescence( 1.0, material.iridescenceIOR, dotNVi, material.iridescenceThickness, material.diffuseColor );
		material.iridescenceFresnel = mix( material.iridescenceFresnelDielectric, material.iridescenceFresnelMetallic, material.metalness );
		material.iridescenceF0 = Schlick_to_F0( material.iridescenceFresnel, 1.0, dotNVi );
	}
#endif
IncidentLight directLight;
#if ( NUM_POINT_LIGHTS > 0 ) && defined( RE_Direct )
	PointLight pointLight;
	#if defined( USE_SHADOWMAP ) && NUM_POINT_LIGHT_SHADOWS > 0
	PointLightShadow pointLightShadow;
	#endif
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_POINT_LIGHTS; i ++ ) {
		pointLight = pointLights[ i ];
		getPointLightInfo( pointLight, geometryPosition, directLight );
		#if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_POINT_LIGHT_SHADOWS ) && ( defined( SHADOWMAP_TYPE_PCF ) || defined( SHADOWMAP_TYPE_BASIC ) )
		pointLightShadow = pointLightShadows[ i ];
		directLight.color *= ( directLight.visible && receiveShadow ) ? getPointShadow( pointShadowMap[ i ], pointLightShadow.shadowMapSize, pointLightShadow.shadowIntensity, pointLightShadow.shadowBias, pointLightShadow.shadowRadius, vPointShadowCoord[ i ], pointLightShadow.shadowCameraNear, pointLightShadow.shadowCameraFar ) : 1.0;
		#endif
		RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if ( NUM_SPOT_LIGHTS > 0 ) && defined( RE_Direct )
	SpotLight spotLight;
	vec4 spotColor;
	vec3 spotLightCoord;
	bool inSpotLightMap;
	#if defined( USE_SHADOWMAP ) && NUM_SPOT_LIGHT_SHADOWS > 0
	SpotLightShadow spotLightShadow;
	#endif
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_SPOT_LIGHTS; i ++ ) {
		spotLight = spotLights[ i ];
		getSpotLightInfo( spotLight, geometryPosition, directLight );
		#if ( UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS_WITH_MAPS )
		#define SPOT_LIGHT_MAP_INDEX UNROLLED_LOOP_INDEX
		#elif ( UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS )
		#define SPOT_LIGHT_MAP_INDEX NUM_SPOT_LIGHT_MAPS
		#else
		#define SPOT_LIGHT_MAP_INDEX ( UNROLLED_LOOP_INDEX - NUM_SPOT_LIGHT_SHADOWS + NUM_SPOT_LIGHT_SHADOWS_WITH_MAPS )
		#endif
		#if ( SPOT_LIGHT_MAP_INDEX < NUM_SPOT_LIGHT_MAPS )
			spotLightCoord = vSpotLightCoord[ i ].xyz / vSpotLightCoord[ i ].w;
			inSpotLightMap = all( lessThan( abs( spotLightCoord * 2. - 1. ), vec3( 1.0 ) ) );
			spotColor = texture2D( spotLightMap[ SPOT_LIGHT_MAP_INDEX ], spotLightCoord.xy );
			directLight.color = inSpotLightMap ? directLight.color * spotColor.rgb : directLight.color;
		#endif
		#undef SPOT_LIGHT_MAP_INDEX
		#if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS )
		spotLightShadow = spotLightShadows[ i ];
		directLight.color *= ( directLight.visible && receiveShadow ) ? getShadow( spotShadowMap[ i ], spotLightShadow.shadowMapSize, spotLightShadow.shadowIntensity, spotLightShadow.shadowBias, spotLightShadow.shadowRadius, vSpotLightCoord[ i ] ) : 1.0;
		#endif
		RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if ( NUM_DIR_LIGHTS > 0 ) && defined( RE_Direct )
	DirectionalLight directionalLight;
	#if defined( USE_SHADOWMAP ) && NUM_DIR_LIGHT_SHADOWS > 0
	DirectionalLightShadow directionalLightShadow;
	#endif
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_DIR_LIGHTS; i ++ ) {
		directionalLight = directionalLights[ i ];
		getDirectionalLightInfo( directionalLight, directLight );
		#if defined( USE_SHADOWMAP ) && ( UNROLLED_LOOP_INDEX < NUM_DIR_LIGHT_SHADOWS )
		directionalLightShadow = directionalLightShadows[ i ];
		directLight.color *= ( directLight.visible && receiveShadow ) ? getShadow( directionalShadowMap[ i ], directionalLightShadow.shadowMapSize, directionalLightShadow.shadowIntensity, directionalLightShadow.shadowBias, directionalLightShadow.shadowRadius, vDirectionalShadowCoord[ i ] ) : 1.0;
		#endif
		RE_Direct( directLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if ( NUM_RECT_AREA_LIGHTS > 0 ) && defined( RE_Direct_RectArea )
	RectAreaLight rectAreaLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_RECT_AREA_LIGHTS; i ++ ) {
		rectAreaLight = rectAreaLights[ i ];
		RE_Direct_RectArea( rectAreaLight, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
	}
	#pragma unroll_loop_end
#endif
#if defined( RE_IndirectDiffuse )
	vec3 iblIrradiance = vec3( 0.0 );
	vec3 irradiance = getAmbientLightIrradiance( ambientLightColor );
	#if defined( USE_LIGHT_PROBES )
		irradiance += getLightProbeIrradiance( lightProbe, geometryNormal );
	#endif
	#if ( NUM_HEMI_LIGHTS > 0 )
		#pragma unroll_loop_start
		for ( int i = 0; i < NUM_HEMI_LIGHTS; i ++ ) {
			irradiance += getHemisphereLightIrradiance( hemisphereLights[ i ], geometryNormal );
		}
		#pragma unroll_loop_end
	#endif
	#ifdef USE_LIGHT_PROBES_GRID
		vec3 probeWorldPos = ( ( vec4( geometryPosition, 1.0 ) - viewMatrix[ 3 ] ) * viewMatrix ).xyz;
		vec3 probeWorldNormal = transformNormalByInverseViewMatrix( geometryNormal, viewMatrix );
		irradiance += getLightProbeGridIrradiance( probeWorldPos, probeWorldNormal );
	#endif
#endif
#if defined( RE_IndirectSpecular )
	vec3 radiance = vec3( 0.0 );
	vec3 clearcoatRadiance = vec3( 0.0 );
#endif`,lx=`#if defined( RE_IndirectDiffuse )
	#ifdef USE_LIGHTMAP
		vec4 lightMapTexel = texture2D( lightMap, vLightMapUv );
		vec3 lightMapIrradiance = lightMapTexel.rgb * lightMapIntensity;
		irradiance += lightMapIrradiance;
	#endif
	#if defined( USE_ENVMAP ) && defined( ENVMAP_TYPE_CUBE_UV )
		#if defined( STANDARD ) || defined( LAMBERT ) || defined( PHONG )
			iblIrradiance += getIBLIrradiance( geometryNormal );
		#endif
	#endif
#endif
#if defined( USE_ENVMAP ) && defined( RE_IndirectSpecular )
	#ifdef USE_ANISOTROPY
		radiance += getIBLAnisotropyRadiance( geometryViewDir, geometryNormal, material.roughness, material.anisotropyB, material.anisotropy );
	#else
		radiance += getIBLRadiance( geometryViewDir, geometryNormal, material.roughness );
	#endif
	#ifdef USE_CLEARCOAT
		clearcoatRadiance += getIBLRadiance( geometryViewDir, geometryClearcoatNormal, material.clearcoatRoughness );
	#endif
#endif`,cx=`#if defined( RE_IndirectDiffuse )
	#if defined( LAMBERT ) || defined( PHONG )
		irradiance += iblIrradiance;
	#endif
	RE_IndirectDiffuse( irradiance, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
#endif
#if defined( RE_IndirectSpecular )
	RE_IndirectSpecular( radiance, iblIrradiance, clearcoatRadiance, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
#endif`,hx=`#ifdef USE_LIGHT_PROBES_GRID
uniform highp sampler3D probesSH;
uniform vec3 probesMin;
uniform vec3 probesMax;
uniform vec3 probesResolution;
vec3 getLightProbeGridIrradiance( vec3 worldPos, vec3 worldNormal ) {
	vec3 res = probesResolution;
	vec3 gridRange = probesMax - probesMin;
	vec3 resMinusOne = res - 1.0;
	vec3 probeSpacing = gridRange / resMinusOne;
	vec3 samplePos = worldPos + worldNormal * probeSpacing * 0.5;
	vec3 uvw = clamp( ( samplePos - probesMin ) / gridRange, 0.0, 1.0 );
	uvw = uvw * resMinusOne / res + 0.5 / res;
	float nz          = res.z;
	float paddedSlices = nz + 2.0;
	float atlasDepth  = 7.0 * paddedSlices;
	float uvZBase     = uvw.z * nz + 1.0;
	vec4 s0 = texture( probesSH, vec3( uvw.xy, ( uvZBase                       ) / atlasDepth ) );
	vec4 s1 = texture( probesSH, vec3( uvw.xy, ( uvZBase +       paddedSlices   ) / atlasDepth ) );
	vec4 s2 = texture( probesSH, vec3( uvw.xy, ( uvZBase + 2.0 * paddedSlices   ) / atlasDepth ) );
	vec4 s3 = texture( probesSH, vec3( uvw.xy, ( uvZBase + 3.0 * paddedSlices   ) / atlasDepth ) );
	vec4 s4 = texture( probesSH, vec3( uvw.xy, ( uvZBase + 4.0 * paddedSlices   ) / atlasDepth ) );
	vec4 s5 = texture( probesSH, vec3( uvw.xy, ( uvZBase + 5.0 * paddedSlices   ) / atlasDepth ) );
	vec4 s6 = texture( probesSH, vec3( uvw.xy, ( uvZBase + 6.0 * paddedSlices   ) / atlasDepth ) );
	vec3 c0 = s0.xyz;
	vec3 c1 = vec3( s0.w, s1.xy );
	vec3 c2 = vec3( s1.zw, s2.x );
	vec3 c3 = s2.yzw;
	vec3 c4 = s3.xyz;
	vec3 c5 = vec3( s3.w, s4.xy );
	vec3 c6 = vec3( s4.zw, s5.x );
	vec3 c7 = s5.yzw;
	vec3 c8 = s6.xyz;
	float x = worldNormal.x, y = worldNormal.y, z = worldNormal.z;
	vec3 result = c0 * 0.886227;
	result += c1 * 2.0 * 0.511664 * y;
	result += c2 * 2.0 * 0.511664 * z;
	result += c3 * 2.0 * 0.511664 * x;
	result += c4 * 2.0 * 0.429043 * x * y;
	result += c5 * 2.0 * 0.429043 * y * z;
	result += c6 * ( 0.743125 * z * z - 0.247708 );
	result += c7 * 2.0 * 0.429043 * x * z;
	result += c8 * 0.429043 * ( x * x - y * y );
	return max( result, vec3( 0.0 ) );
}
#endif`,ux=`#if defined( USE_LOGARITHMIC_DEPTH_BUFFER )
	gl_FragDepth = vIsPerspective == 0.0 ? gl_FragCoord.z : log2( vFragDepth ) * logDepthBufFC * 0.5;
#endif`,dx=`#if defined( USE_LOGARITHMIC_DEPTH_BUFFER )
	uniform float logDepthBufFC;
	varying float vFragDepth;
	varying float vIsPerspective;
#endif`,fx=`#ifdef USE_LOGARITHMIC_DEPTH_BUFFER
	varying float vFragDepth;
	varying float vIsPerspective;
#endif`,px=`#ifdef USE_LOGARITHMIC_DEPTH_BUFFER
	vFragDepth = 1.0 + gl_Position.w;
	vIsPerspective = float( isPerspectiveMatrix( projectionMatrix ) );
#endif`,mx=`#ifdef USE_MAP
	vec4 sampledDiffuseColor = texture2D( map, vMapUv );
	#ifdef DECODE_VIDEO_TEXTURE
		sampledDiffuseColor = sRGBTransferEOTF( sampledDiffuseColor );
	#endif
	diffuseColor *= sampledDiffuseColor;
#endif`,gx=`#ifdef USE_MAP
	uniform sampler2D map;
#endif`,xx=`#if defined( USE_MAP ) || defined( USE_ALPHAMAP )
	#if defined( USE_POINTS_UV )
		vec2 uv = vUv;
	#else
		vec2 uv = ( uvTransform * vec3( gl_PointCoord.x, 1.0 - gl_PointCoord.y, 1 ) ).xy;
	#endif
#endif
#ifdef USE_MAP
	diffuseColor *= texture2D( map, uv );
#endif
#ifdef USE_ALPHAMAP
	diffuseColor.a *= texture2D( alphaMap, uv ).g;
#endif`,yx=`#if defined( USE_POINTS_UV )
	varying vec2 vUv;
#else
	#if defined( USE_MAP ) || defined( USE_ALPHAMAP )
		uniform mat3 uvTransform;
	#endif
#endif
#ifdef USE_MAP
	uniform sampler2D map;
#endif
#ifdef USE_ALPHAMAP
	uniform sampler2D alphaMap;
#endif`,vx=`float metalnessFactor = metalness;
#ifdef USE_METALNESSMAP
	vec4 texelMetalness = texture2D( metalnessMap, vMetalnessMapUv );
	metalnessFactor *= texelMetalness.b;
#endif`,_x=`#ifdef USE_METALNESSMAP
	uniform sampler2D metalnessMap;
#endif`,bx=`#ifdef USE_INSTANCING_MORPH
	float morphTargetInfluences[ MORPHTARGETS_COUNT ];
	float morphTargetBaseInfluence = texelFetch( morphTexture, ivec2( 0, gl_InstanceID ), 0 ).r;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		morphTargetInfluences[i] =  texelFetch( morphTexture, ivec2( i + 1, gl_InstanceID ), 0 ).r;
	}
#endif`,Mx=`#if defined( USE_MORPHCOLORS )
	vColor *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		#if defined( USE_COLOR_ALPHA )
			if ( morphTargetInfluences[ i ] != 0.0 ) vColor += getMorph( gl_VertexID, i, 2 ) * morphTargetInfluences[ i ];
		#elif defined( USE_COLOR )
			if ( morphTargetInfluences[ i ] != 0.0 ) vColor += getMorph( gl_VertexID, i, 2 ).rgb * morphTargetInfluences[ i ];
		#endif
	}
#endif`,Sx=`#ifdef USE_MORPHNORMALS
	objectNormal *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		if ( morphTargetInfluences[ i ] != 0.0 ) objectNormal += getMorph( gl_VertexID, i, 1 ).xyz * morphTargetInfluences[ i ];
	}
#endif`,wx=`#ifdef USE_MORPHTARGETS
	#ifndef USE_INSTANCING_MORPH
		uniform float morphTargetBaseInfluence;
		uniform float morphTargetInfluences[ MORPHTARGETS_COUNT ];
	#endif
	uniform sampler2DArray morphTargetsTexture;
	uniform ivec2 morphTargetsTextureSize;
	vec4 getMorph( const in int vertexIndex, const in int morphTargetIndex, const in int offset ) {
		int texelIndex = vertexIndex * MORPHTARGETS_TEXTURE_STRIDE + offset;
		int y = texelIndex / morphTargetsTextureSize.x;
		int x = texelIndex - y * morphTargetsTextureSize.x;
		ivec3 morphUV = ivec3( x, y, morphTargetIndex );
		return texelFetch( morphTargetsTexture, morphUV, 0 );
	}
#endif`,Ex=`#ifdef USE_MORPHTARGETS
	transformed *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		if ( morphTargetInfluences[ i ] != 0.0 ) transformed += getMorph( gl_VertexID, i, 0 ).xyz * morphTargetInfluences[ i ];
	}
#endif`,Tx=`float faceDirection = gl_FrontFacing ? 1.0 : - 1.0;
#ifdef FLAT_SHADED
	vec3 fdx = dFdx( vViewPosition );
	vec3 fdy = dFdy( vViewPosition );
	vec3 normal = normalize( cross( fdx, fdy ) );
#else
	vec3 normal = normalize( vNormal );
	#ifdef DOUBLE_SIDED
		normal *= faceDirection;
	#endif
#endif
#if defined( USE_NORMALMAP_TANGENTSPACE ) || defined( USE_CLEARCOAT_NORMALMAP ) || defined( USE_ANISOTROPY )
	#ifdef USE_TANGENT
		mat3 tbn = mat3( normalize( vTangent ), normalize( vBitangent ), normal );
	#else
		mat3 tbn = getTangentFrame( - vViewPosition, normal,
		#if defined( USE_NORMALMAP )
			vNormalMapUv
		#elif defined( USE_CLEARCOAT_NORMALMAP )
			vClearcoatNormalMapUv
		#else
			vUv
		#endif
		);
	#endif
	#ifdef DOUBLE_SIDED
		tbn[0] *= faceDirection;
		tbn[1] *= faceDirection;
	#endif
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	#ifdef USE_TANGENT
		mat3 tbn2 = mat3( normalize( vTangent ), normalize( vBitangent ), normal );
	#else
		mat3 tbn2 = getTangentFrame( - vViewPosition, normal, vClearcoatNormalMapUv );
	#endif
	#ifdef DOUBLE_SIDED
		tbn2[0] *= faceDirection;
		tbn2[1] *= faceDirection;
	#endif
#endif
vec3 nonPerturbedNormal = normal;`,Ax=`#ifdef USE_NORMALMAP_OBJECTSPACE
	normal = texture2D( normalMap, vNormalMapUv ).xyz * 2.0 - 1.0;
	#ifdef FLIP_SIDED
		normal = - normal;
	#endif
	#ifdef DOUBLE_SIDED
		normal = normal * faceDirection;
	#endif
	normal = normalize( normalMatrix * normal );
#elif defined( USE_NORMALMAP_TANGENTSPACE )
	vec3 mapN = texture2D( normalMap, vNormalMapUv ).xyz * 2.0 - 1.0;
	#if defined( USE_PACKED_NORMALMAP )
		mapN = vec3( mapN.xy, sqrt( saturate( 1.0 - dot( mapN.xy, mapN.xy ) ) ) );
	#endif
	mapN.xy *= normalScale;
	normal = normalize( tbn * mapN );
#elif defined( USE_BUMPMAP )
	normal = perturbNormalArb( - vViewPosition, normal, dHdxy_fwd(), faceDirection );
#endif`,Px=`#ifndef FLAT_SHADED
	varying vec3 vNormal;
	#ifdef USE_TANGENT
		varying vec3 vTangent;
		varying vec3 vBitangent;
	#endif
#endif`,Rx=`#ifndef FLAT_SHADED
	varying vec3 vNormal;
	#ifdef USE_TANGENT
		varying vec3 vTangent;
		varying vec3 vBitangent;
	#endif
#endif`,Cx=`#ifndef FLAT_SHADED
	vNormal = normalize( transformedNormal );
	#ifdef USE_TANGENT
		vTangent = normalize( transformedTangent );
		vBitangent = normalize( cross( vNormal, vTangent ) * tangent.w );
		#ifdef FLIP_SIDED
			vBitangent = - vBitangent;
		#endif
	#endif
#endif`,Ix=`#ifdef USE_NORMALMAP
	uniform sampler2D normalMap;
	uniform vec2 normalScale;
#endif
#ifdef USE_NORMALMAP_OBJECTSPACE
	uniform mat3 normalMatrix;
#endif
#if ! defined ( USE_TANGENT ) && ( defined ( USE_NORMALMAP_TANGENTSPACE ) || defined ( USE_CLEARCOAT_NORMALMAP ) || defined( USE_ANISOTROPY ) )
	mat3 getTangentFrame( vec3 eye_pos, vec3 surf_norm, vec2 uv ) {
		vec3 q0 = dFdx( eye_pos.xyz );
		vec3 q1 = dFdy( eye_pos.xyz );
		vec2 st0 = dFdx( uv.st );
		vec2 st1 = dFdy( uv.st );
		vec3 N = surf_norm;
		vec3 q1perp = cross( q1, N );
		vec3 q0perp = cross( N, q0 );
		vec3 T = q1perp * st0.x + q0perp * st1.x;
		vec3 B = q1perp * st0.y + q0perp * st1.y;
		float det = max( dot( T, T ), dot( B, B ) );
		float scale = ( det == 0.0 ) ? 0.0 : inversesqrt( det );
		return mat3( T * scale, B * scale, N );
	}
#endif`,Lx=`#ifdef USE_CLEARCOAT
	vec3 clearcoatNormal = nonPerturbedNormal;
#endif`,Dx=`#ifdef USE_CLEARCOAT_NORMALMAP
	vec3 clearcoatMapN = texture2D( clearcoatNormalMap, vClearcoatNormalMapUv ).xyz * 2.0 - 1.0;
	clearcoatMapN.xy *= clearcoatNormalScale;
	clearcoatNormal = normalize( tbn2 * clearcoatMapN );
#endif`,Fx=`#ifdef USE_CLEARCOATMAP
	uniform sampler2D clearcoatMap;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	uniform sampler2D clearcoatNormalMap;
	uniform vec2 clearcoatNormalScale;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	uniform sampler2D clearcoatRoughnessMap;
#endif`,Ux=`#ifdef USE_IRIDESCENCEMAP
	uniform sampler2D iridescenceMap;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	uniform sampler2D iridescenceThicknessMap;
#endif`,Nx=`#ifdef OPAQUE
diffuseColor.a = 1.0;
#endif
#ifdef USE_TRANSMISSION
diffuseColor.a *= material.transmissionAlpha;
#endif
gl_FragColor = vec4( outgoingLight, diffuseColor.a );`,Ox=`vec3 packNormalToRGB( const in vec3 normal ) {
	return normalize( normal ) * 0.5 + 0.5;
}
vec3 unpackRGBToNormal( const in vec3 rgb ) {
	return 2.0 * rgb.xyz - 1.0;
}
const float PackUpscale = 256. / 255.;const float UnpackDownscale = 255. / 256.;const float ShiftRight8 = 1. / 256.;
const float Inv255 = 1. / 255.;
const vec4 PackFactors = vec4( 1.0, 256.0, 256.0 * 256.0, 256.0 * 256.0 * 256.0 );
const vec2 UnpackFactors2 = vec2( UnpackDownscale, 1.0 / PackFactors.g );
const vec3 UnpackFactors3 = vec3( UnpackDownscale / PackFactors.rg, 1.0 / PackFactors.b );
const vec4 UnpackFactors4 = vec4( UnpackDownscale / PackFactors.rgb, 1.0 / PackFactors.a );
vec4 packDepthToRGBA( const in float v ) {
	if( v <= 0.0 )
		return vec4( 0., 0., 0., 0. );
	if( v >= 1.0 )
		return vec4( 1., 1., 1., 1. );
	float vuf;
	float af = modf( v * PackFactors.a, vuf );
	float bf = modf( vuf * ShiftRight8, vuf );
	float gf = modf( vuf * ShiftRight8, vuf );
	return vec4( vuf * Inv255, gf * PackUpscale, bf * PackUpscale, af );
}
vec3 packDepthToRGB( const in float v ) {
	if( v <= 0.0 )
		return vec3( 0., 0., 0. );
	if( v >= 1.0 )
		return vec3( 1., 1., 1. );
	float vuf;
	float bf = modf( v * PackFactors.b, vuf );
	float gf = modf( vuf * ShiftRight8, vuf );
	return vec3( vuf * Inv255, gf * PackUpscale, bf );
}
vec2 packDepthToRG( const in float v ) {
	if( v <= 0.0 )
		return vec2( 0., 0. );
	if( v >= 1.0 )
		return vec2( 1., 1. );
	float vuf;
	float gf = modf( v * 256., vuf );
	return vec2( vuf * Inv255, gf );
}
float unpackRGBAToDepth( const in vec4 v ) {
	return dot( v, UnpackFactors4 );
}
float unpackRGBToDepth( const in vec3 v ) {
	return dot( v, UnpackFactors3 );
}
float unpackRGToDepth( const in vec2 v ) {
	return v.r * UnpackFactors2.r + v.g * UnpackFactors2.g;
}
vec4 pack2HalfToRGBA( const in vec2 v ) {
	vec4 r = vec4( v.x, fract( v.x * 255.0 ), v.y, fract( v.y * 255.0 ) );
	return vec4( r.x - r.y / 255.0, r.y, r.z - r.w / 255.0, r.w );
}
vec2 unpackRGBATo2Half( const in vec4 v ) {
	return vec2( v.x + ( v.y / 255.0 ), v.z + ( v.w / 255.0 ) );
}
float viewZToOrthographicDepth( const in float viewZ, const in float near, const in float far ) {
	return ( viewZ + near ) / ( near - far );
}
float orthographicDepthToViewZ( const in float depth, const in float near, const in float far ) {
	#ifdef USE_REVERSED_DEPTH_BUFFER
	
		return depth * ( far - near ) - far;
	#else
		return depth * ( near - far ) - near;
	#endif
}
float viewZToPerspectiveDepth( const in float viewZ, const in float near, const in float far ) {
	return ( ( near + viewZ ) * far ) / ( ( far - near ) * viewZ );
}
float perspectiveDepthToViewZ( const in float depth, const in float near, const in float far ) {
	
	#ifdef USE_REVERSED_DEPTH_BUFFER
		return ( near * far ) / ( ( near - far ) * depth - near );
	#else
		return ( near * far ) / ( ( far - near ) * depth - far );
	#endif
}`,Bx=`#ifdef PREMULTIPLIED_ALPHA
	gl_FragColor.rgb *= gl_FragColor.a;
#endif`,zx=`vec4 mvPosition = vec4( transformed, 1.0 );
#ifdef USE_BATCHING
	mvPosition = batchingMatrix * mvPosition;
#endif
#ifdef USE_INSTANCING
	mvPosition = instanceMatrix * mvPosition;
#endif
mvPosition = modelViewMatrix * mvPosition;
gl_Position = projectionMatrix * mvPosition;`,kx=`#ifdef DITHERING
	gl_FragColor.rgb = dithering( gl_FragColor.rgb );
#endif`,Vx=`#ifdef DITHERING
	vec3 dithering( vec3 color ) {
		float grid_position = rand( gl_FragCoord.xy );
		vec3 dither_shift_RGB = vec3( 0.25 / 255.0, -0.25 / 255.0, 0.25 / 255.0 );
		dither_shift_RGB = mix( 2.0 * dither_shift_RGB, -2.0 * dither_shift_RGB, grid_position );
		return color + dither_shift_RGB;
	}
#endif`,Hx=`float roughnessFactor = roughness;
#ifdef USE_ROUGHNESSMAP
	vec4 texelRoughness = texture2D( roughnessMap, vRoughnessMapUv );
	roughnessFactor *= texelRoughness.g;
#endif`,Gx=`#ifdef USE_ROUGHNESSMAP
	uniform sampler2D roughnessMap;
#endif`,Wx=`#if NUM_SPOT_LIGHT_COORDS > 0
	varying vec4 vSpotLightCoord[ NUM_SPOT_LIGHT_COORDS ];
#endif
#if NUM_SPOT_LIGHT_MAPS > 0
	uniform sampler2D spotLightMap[ NUM_SPOT_LIGHT_MAPS ];
#endif
#ifdef USE_SHADOWMAP
	#if NUM_DIR_LIGHT_SHADOWS > 0
		#if defined( SHADOWMAP_TYPE_PCF )
			uniform sampler2DShadow directionalShadowMap[ NUM_DIR_LIGHT_SHADOWS ];
		#else
			uniform sampler2D directionalShadowMap[ NUM_DIR_LIGHT_SHADOWS ];
		#endif
		varying vec4 vDirectionalShadowCoord[ NUM_DIR_LIGHT_SHADOWS ];
		struct DirectionalLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform DirectionalLightShadow directionalLightShadows[ NUM_DIR_LIGHT_SHADOWS ];
	#endif
	#if NUM_SPOT_LIGHT_SHADOWS > 0
		#if defined( SHADOWMAP_TYPE_PCF )
			uniform sampler2DShadow spotShadowMap[ NUM_SPOT_LIGHT_SHADOWS ];
		#else
			uniform sampler2D spotShadowMap[ NUM_SPOT_LIGHT_SHADOWS ];
		#endif
		struct SpotLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform SpotLightShadow spotLightShadows[ NUM_SPOT_LIGHT_SHADOWS ];
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
		#if defined( SHADOWMAP_TYPE_PCF )
			uniform samplerCubeShadow pointShadowMap[ NUM_POINT_LIGHT_SHADOWS ];
		#elif defined( SHADOWMAP_TYPE_BASIC )
			uniform samplerCube pointShadowMap[ NUM_POINT_LIGHT_SHADOWS ];
		#endif
		varying vec4 vPointShadowCoord[ NUM_POINT_LIGHT_SHADOWS ];
		struct PointLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
			float shadowCameraNear;
			float shadowCameraFar;
		};
		uniform PointLightShadow pointLightShadows[ NUM_POINT_LIGHT_SHADOWS ];
	#endif
	#if defined( SHADOWMAP_TYPE_PCF )
		float interleavedGradientNoise( vec2 position ) {
			return fract( 52.9829189 * fract( dot( position, vec2( 0.06711056, 0.00583715 ) ) ) );
		}
		vec2 vogelDiskSample( int sampleIndex, int samplesCount, float phi ) {
			const float goldenAngle = 2.399963229728653;
			float r = sqrt( ( float( sampleIndex ) + 0.5 ) / float( samplesCount ) );
			float theta = float( sampleIndex ) * goldenAngle + phi;
			return vec2( cos( theta ), sin( theta ) ) * r;
		}
	#endif
	#if defined( SHADOWMAP_TYPE_PCF )
		float getShadow( sampler2DShadow shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord ) {
			float shadow = 1.0;
			shadowCoord.xyz /= shadowCoord.w;
			shadowCoord.z += shadowBias;
			bool inFrustum = shadowCoord.x >= 0.0 && shadowCoord.x <= 1.0 && shadowCoord.y >= 0.0 && shadowCoord.y <= 1.0;
			bool frustumTest = inFrustum && shadowCoord.z <= 1.0;
			if ( frustumTest ) {
				vec2 texelSize = vec2( 1.0 ) / shadowMapSize;
				float radius = shadowRadius * texelSize.x;
				float phi = interleavedGradientNoise( gl_FragCoord.xy ) * PI2;
				shadow = (
					texture( shadowMap, vec3( shadowCoord.xy + vogelDiskSample( 0, 5, phi ) * radius, shadowCoord.z ) ) +
					texture( shadowMap, vec3( shadowCoord.xy + vogelDiskSample( 1, 5, phi ) * radius, shadowCoord.z ) ) +
					texture( shadowMap, vec3( shadowCoord.xy + vogelDiskSample( 2, 5, phi ) * radius, shadowCoord.z ) ) +
					texture( shadowMap, vec3( shadowCoord.xy + vogelDiskSample( 3, 5, phi ) * radius, shadowCoord.z ) ) +
					texture( shadowMap, vec3( shadowCoord.xy + vogelDiskSample( 4, 5, phi ) * radius, shadowCoord.z ) )
				) * 0.2;
			}
			return mix( 1.0, shadow, shadowIntensity );
		}
	#elif defined( SHADOWMAP_TYPE_VSM )
		float getShadow( sampler2D shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord ) {
			float shadow = 1.0;
			shadowCoord.xyz /= shadowCoord.w;
			#ifdef USE_REVERSED_DEPTH_BUFFER
				shadowCoord.z -= shadowBias;
			#else
				shadowCoord.z += shadowBias;
			#endif
			bool inFrustum = shadowCoord.x >= 0.0 && shadowCoord.x <= 1.0 && shadowCoord.y >= 0.0 && shadowCoord.y <= 1.0;
			bool frustumTest = inFrustum && shadowCoord.z <= 1.0;
			if ( frustumTest ) {
				vec2 distribution = texture2D( shadowMap, shadowCoord.xy ).rg;
				float mean = distribution.x;
				float variance = distribution.y * distribution.y;
				#ifdef USE_REVERSED_DEPTH_BUFFER
					float hard_shadow = step( mean, shadowCoord.z );
				#else
					float hard_shadow = step( shadowCoord.z, mean );
				#endif
				
				if ( hard_shadow == 1.0 ) {
					shadow = 1.0;
				} else {
					variance = max( variance, 0.0000001 );
					float d = shadowCoord.z - mean;
					float p_max = variance / ( variance + d * d );
					p_max = clamp( ( p_max - 0.3 ) / 0.65, 0.0, 1.0 );
					shadow = max( hard_shadow, p_max );
				}
			}
			return mix( 1.0, shadow, shadowIntensity );
		}
	#else
		float getShadow( sampler2D shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord ) {
			float shadow = 1.0;
			shadowCoord.xyz /= shadowCoord.w;
			#ifdef USE_REVERSED_DEPTH_BUFFER
				shadowCoord.z -= shadowBias;
			#else
				shadowCoord.z += shadowBias;
			#endif
			bool inFrustum = shadowCoord.x >= 0.0 && shadowCoord.x <= 1.0 && shadowCoord.y >= 0.0 && shadowCoord.y <= 1.0;
			bool frustumTest = inFrustum && shadowCoord.z <= 1.0;
			if ( frustumTest ) {
				float depth = texture2D( shadowMap, shadowCoord.xy ).r;
				#ifdef USE_REVERSED_DEPTH_BUFFER
					shadow = step( depth, shadowCoord.z );
				#else
					shadow = step( shadowCoord.z, depth );
				#endif
			}
			return mix( 1.0, shadow, shadowIntensity );
		}
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
	#if defined( SHADOWMAP_TYPE_PCF )
	float getPointShadow( samplerCubeShadow shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord, float shadowCameraNear, float shadowCameraFar ) {
		float shadow = 1.0;
		vec3 lightToPosition = shadowCoord.xyz;
		vec3 bd3D = normalize( lightToPosition );
		vec3 absVec = abs( lightToPosition );
		float viewSpaceZ = max( max( absVec.x, absVec.y ), absVec.z );
		if ( viewSpaceZ - shadowCameraFar <= 0.0 && viewSpaceZ - shadowCameraNear >= 0.0 ) {
			#ifdef USE_REVERSED_DEPTH_BUFFER
				float dp = ( shadowCameraNear * ( shadowCameraFar - viewSpaceZ ) ) / ( viewSpaceZ * ( shadowCameraFar - shadowCameraNear ) );
				dp -= shadowBias;
			#else
				float dp = ( shadowCameraFar * ( viewSpaceZ - shadowCameraNear ) ) / ( viewSpaceZ * ( shadowCameraFar - shadowCameraNear ) );
				dp += shadowBias;
			#endif
			float texelSize = shadowRadius / shadowMapSize.x;
			vec3 absDir = abs( bd3D );
			vec3 tangent = absDir.x > absDir.z ? vec3( 0.0, 1.0, 0.0 ) : vec3( 1.0, 0.0, 0.0 );
			tangent = normalize( cross( bd3D, tangent ) );
			vec3 bitangent = cross( bd3D, tangent );
			float phi = interleavedGradientNoise( gl_FragCoord.xy ) * PI2;
			vec2 sample0 = vogelDiskSample( 0, 5, phi );
			vec2 sample1 = vogelDiskSample( 1, 5, phi );
			vec2 sample2 = vogelDiskSample( 2, 5, phi );
			vec2 sample3 = vogelDiskSample( 3, 5, phi );
			vec2 sample4 = vogelDiskSample( 4, 5, phi );
			shadow = (
				texture( shadowMap, vec4( bd3D + ( tangent * sample0.x + bitangent * sample0.y ) * texelSize, dp ) ) +
				texture( shadowMap, vec4( bd3D + ( tangent * sample1.x + bitangent * sample1.y ) * texelSize, dp ) ) +
				texture( shadowMap, vec4( bd3D + ( tangent * sample2.x + bitangent * sample2.y ) * texelSize, dp ) ) +
				texture( shadowMap, vec4( bd3D + ( tangent * sample3.x + bitangent * sample3.y ) * texelSize, dp ) ) +
				texture( shadowMap, vec4( bd3D + ( tangent * sample4.x + bitangent * sample4.y ) * texelSize, dp ) )
			) * 0.2;
		}
		return mix( 1.0, shadow, shadowIntensity );
	}
	#elif defined( SHADOWMAP_TYPE_BASIC )
	float getPointShadow( samplerCube shadowMap, vec2 shadowMapSize, float shadowIntensity, float shadowBias, float shadowRadius, vec4 shadowCoord, float shadowCameraNear, float shadowCameraFar ) {
		float shadow = 1.0;
		vec3 lightToPosition = shadowCoord.xyz;
		vec3 absVec = abs( lightToPosition );
		float viewSpaceZ = max( max( absVec.x, absVec.y ), absVec.z );
		if ( viewSpaceZ - shadowCameraFar <= 0.0 && viewSpaceZ - shadowCameraNear >= 0.0 ) {
			float dp = ( shadowCameraFar * ( viewSpaceZ - shadowCameraNear ) ) / ( viewSpaceZ * ( shadowCameraFar - shadowCameraNear ) );
			dp += shadowBias;
			vec3 bd3D = normalize( lightToPosition );
			float depth = textureCube( shadowMap, bd3D ).r;
			#ifdef USE_REVERSED_DEPTH_BUFFER
				depth = 1.0 - depth;
			#endif
			shadow = step( dp, depth );
		}
		return mix( 1.0, shadow, shadowIntensity );
	}
	#endif
	#endif
#endif`,Xx=`#if NUM_SPOT_LIGHT_COORDS > 0
	uniform mat4 spotLightMatrix[ NUM_SPOT_LIGHT_COORDS ];
	varying vec4 vSpotLightCoord[ NUM_SPOT_LIGHT_COORDS ];
#endif
#ifdef USE_SHADOWMAP
	#if NUM_DIR_LIGHT_SHADOWS > 0
		uniform mat4 directionalShadowMatrix[ NUM_DIR_LIGHT_SHADOWS ];
		varying vec4 vDirectionalShadowCoord[ NUM_DIR_LIGHT_SHADOWS ];
		struct DirectionalLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform DirectionalLightShadow directionalLightShadows[ NUM_DIR_LIGHT_SHADOWS ];
	#endif
	#if NUM_SPOT_LIGHT_SHADOWS > 0
		struct SpotLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
		};
		uniform SpotLightShadow spotLightShadows[ NUM_SPOT_LIGHT_SHADOWS ];
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
		uniform mat4 pointShadowMatrix[ NUM_POINT_LIGHT_SHADOWS ];
		varying vec4 vPointShadowCoord[ NUM_POINT_LIGHT_SHADOWS ];
		struct PointLightShadow {
			float shadowIntensity;
			float shadowBias;
			float shadowNormalBias;
			float shadowRadius;
			vec2 shadowMapSize;
			float shadowCameraNear;
			float shadowCameraFar;
		};
		uniform PointLightShadow pointLightShadows[ NUM_POINT_LIGHT_SHADOWS ];
	#endif
#endif`,qx=`#if ( defined( USE_SHADOWMAP ) && ( NUM_DIR_LIGHT_SHADOWS > 0 || NUM_POINT_LIGHT_SHADOWS > 0 ) ) || ( NUM_SPOT_LIGHT_COORDS > 0 )
	#ifdef HAS_NORMAL
		vec3 shadowWorldNormal = transformNormalByInverseViewMatrix( transformedNormal, viewMatrix );
	#else
		vec3 shadowWorldNormal = vec3( 0.0 );
	#endif
	vec4 shadowWorldPosition;
#endif
#if defined( USE_SHADOWMAP )
	#if NUM_DIR_LIGHT_SHADOWS > 0
		#pragma unroll_loop_start
		for ( int i = 0; i < NUM_DIR_LIGHT_SHADOWS; i ++ ) {
			shadowWorldPosition = worldPosition + vec4( shadowWorldNormal * directionalLightShadows[ i ].shadowNormalBias, 0 );
			vDirectionalShadowCoord[ i ] = directionalShadowMatrix[ i ] * shadowWorldPosition;
		}
		#pragma unroll_loop_end
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0
		#pragma unroll_loop_start
		for ( int i = 0; i < NUM_POINT_LIGHT_SHADOWS; i ++ ) {
			shadowWorldPosition = worldPosition + vec4( shadowWorldNormal * pointLightShadows[ i ].shadowNormalBias, 0 );
			vPointShadowCoord[ i ] = pointShadowMatrix[ i ] * shadowWorldPosition;
		}
		#pragma unroll_loop_end
	#endif
#endif
#if NUM_SPOT_LIGHT_COORDS > 0
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_SPOT_LIGHT_COORDS; i ++ ) {
		shadowWorldPosition = worldPosition;
		#if ( defined( USE_SHADOWMAP ) && UNROLLED_LOOP_INDEX < NUM_SPOT_LIGHT_SHADOWS )
			shadowWorldPosition.xyz += shadowWorldNormal * spotLightShadows[ i ].shadowNormalBias;
		#endif
		vSpotLightCoord[ i ] = spotLightMatrix[ i ] * shadowWorldPosition;
	}
	#pragma unroll_loop_end
#endif`,Yx=`float getShadowMask() {
	float shadow = 1.0;
	#ifdef USE_SHADOWMAP
	#if NUM_DIR_LIGHT_SHADOWS > 0
	DirectionalLightShadow directionalLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_DIR_LIGHT_SHADOWS; i ++ ) {
		directionalLight = directionalLightShadows[ i ];
		shadow *= receiveShadow ? getShadow( directionalShadowMap[ i ], directionalLight.shadowMapSize, directionalLight.shadowIntensity, directionalLight.shadowBias, directionalLight.shadowRadius, vDirectionalShadowCoord[ i ] ) : 1.0;
	}
	#pragma unroll_loop_end
	#endif
	#if NUM_SPOT_LIGHT_SHADOWS > 0
	SpotLightShadow spotLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_SPOT_LIGHT_SHADOWS; i ++ ) {
		spotLight = spotLightShadows[ i ];
		shadow *= receiveShadow ? getShadow( spotShadowMap[ i ], spotLight.shadowMapSize, spotLight.shadowIntensity, spotLight.shadowBias, spotLight.shadowRadius, vSpotLightCoord[ i ] ) : 1.0;
	}
	#pragma unroll_loop_end
	#endif
	#if NUM_POINT_LIGHT_SHADOWS > 0 && ( defined( SHADOWMAP_TYPE_PCF ) || defined( SHADOWMAP_TYPE_BASIC ) )
	PointLightShadow pointLight;
	#pragma unroll_loop_start
	for ( int i = 0; i < NUM_POINT_LIGHT_SHADOWS; i ++ ) {
		pointLight = pointLightShadows[ i ];
		shadow *= receiveShadow ? getPointShadow( pointShadowMap[ i ], pointLight.shadowMapSize, pointLight.shadowIntensity, pointLight.shadowBias, pointLight.shadowRadius, vPointShadowCoord[ i ], pointLight.shadowCameraNear, pointLight.shadowCameraFar ) : 1.0;
	}
	#pragma unroll_loop_end
	#endif
	#endif
	return shadow;
}`,$x=`#ifdef USE_SKINNING
	mat4 boneMatX = getBoneMatrix( skinIndex.x );
	mat4 boneMatY = getBoneMatrix( skinIndex.y );
	mat4 boneMatZ = getBoneMatrix( skinIndex.z );
	mat4 boneMatW = getBoneMatrix( skinIndex.w );
#endif`,Kx=`#ifdef USE_SKINNING
	uniform mat4 bindMatrix;
	uniform mat4 bindMatrixInverse;
	uniform highp sampler2D boneTexture;
	mat4 getBoneMatrix( const in float i ) {
		int size = textureSize( boneTexture, 0 ).x;
		int j = int( i ) * 4;
		int x = j % size;
		int y = j / size;
		vec4 v1 = texelFetch( boneTexture, ivec2( x, y ), 0 );
		vec4 v2 = texelFetch( boneTexture, ivec2( x + 1, y ), 0 );
		vec4 v3 = texelFetch( boneTexture, ivec2( x + 2, y ), 0 );
		vec4 v4 = texelFetch( boneTexture, ivec2( x + 3, y ), 0 );
		return mat4( v1, v2, v3, v4 );
	}
#endif`,Zx=`#ifdef USE_SKINNING
	vec4 skinVertex = bindMatrix * vec4( transformed, 1.0 );
	vec4 skinned = vec4( 0.0 );
	skinned += boneMatX * skinVertex * skinWeight.x;
	skinned += boneMatY * skinVertex * skinWeight.y;
	skinned += boneMatZ * skinVertex * skinWeight.z;
	skinned += boneMatW * skinVertex * skinWeight.w;
	transformed = ( bindMatrixInverse * skinned ).xyz;
#endif`,Jx=`#ifdef USE_SKINNING
	mat4 skinMatrix = mat4( 0.0 );
	skinMatrix += skinWeight.x * boneMatX;
	skinMatrix += skinWeight.y * boneMatY;
	skinMatrix += skinWeight.z * boneMatZ;
	skinMatrix += skinWeight.w * boneMatW;
	skinMatrix = bindMatrixInverse * skinMatrix * bindMatrix;
	objectNormal = vec4( skinMatrix * vec4( objectNormal, 0.0 ) ).xyz;
	#ifdef USE_TANGENT
		objectTangent = vec4( skinMatrix * vec4( objectTangent, 0.0 ) ).xyz;
	#endif
#endif`,jx=`float specularStrength;
#ifdef USE_SPECULARMAP
	vec4 texelSpecular = texture2D( specularMap, vSpecularMapUv );
	specularStrength = texelSpecular.r;
#else
	specularStrength = 1.0;
#endif`,Qx=`#ifdef USE_SPECULARMAP
	uniform sampler2D specularMap;
#endif`,e0=`#if defined( TONE_MAPPING )
	gl_FragColor.rgb = toneMapping( gl_FragColor.rgb );
#endif`,t0=`#ifndef saturate
#define saturate( a ) clamp( a, 0.0, 1.0 )
#endif
uniform float toneMappingExposure;
vec3 LinearToneMapping( vec3 color ) {
	return saturate( toneMappingExposure * color );
}
vec3 ReinhardToneMapping( vec3 color ) {
	color *= toneMappingExposure;
	return saturate( color / ( vec3( 1.0 ) + color ) );
}
vec3 CineonToneMapping( vec3 color ) {
	color *= toneMappingExposure;
	color = max( vec3( 0.0 ), color - 0.004 );
	return pow( ( color * ( 6.2 * color + 0.5 ) ) / ( color * ( 6.2 * color + 1.7 ) + 0.06 ), vec3( 2.2 ) );
}
vec3 RRTAndODTFit( vec3 v ) {
	vec3 a = v * ( v + 0.0245786 ) - 0.000090537;
	vec3 b = v * ( 0.983729 * v + 0.4329510 ) + 0.238081;
	return a / b;
}
vec3 ACESFilmicToneMapping( vec3 color ) {
	const mat3 ACESInputMat = mat3(
		vec3( 0.59719, 0.07600, 0.02840 ),		vec3( 0.35458, 0.90834, 0.13383 ),
		vec3( 0.04823, 0.01566, 0.83777 )
	);
	const mat3 ACESOutputMat = mat3(
		vec3(  1.60475, -0.10208, -0.00327 ),		vec3( -0.53108,  1.10813, -0.07276 ),
		vec3( -0.07367, -0.00605,  1.07602 )
	);
	color *= toneMappingExposure / 0.6;
	color = ACESInputMat * color;
	color = RRTAndODTFit( color );
	color = ACESOutputMat * color;
	return saturate( color );
}
const mat3 LINEAR_REC2020_TO_LINEAR_SRGB = mat3(
	vec3( 1.6605, - 0.1246, - 0.0182 ),
	vec3( - 0.5876, 1.1329, - 0.1006 ),
	vec3( - 0.0728, - 0.0083, 1.1187 )
);
const mat3 LINEAR_SRGB_TO_LINEAR_REC2020 = mat3(
	vec3( 0.6274, 0.0691, 0.0164 ),
	vec3( 0.3293, 0.9195, 0.0880 ),
	vec3( 0.0433, 0.0113, 0.8956 )
);
vec3 agxDefaultContrastApprox( vec3 x ) {
	vec3 x2 = x * x;
	vec3 x4 = x2 * x2;
	return + 15.5 * x4 * x2
		- 40.14 * x4 * x
		+ 31.96 * x4
		- 6.868 * x2 * x
		+ 0.4298 * x2
		+ 0.1191 * x
		- 0.00232;
}
vec3 AgXToneMapping( vec3 color ) {
	const mat3 AgXInsetMatrix = mat3(
		vec3( 0.856627153315983, 0.137318972929847, 0.11189821299995 ),
		vec3( 0.0951212405381588, 0.761241990602591, 0.0767994186031903 ),
		vec3( 0.0482516061458583, 0.101439036467562, 0.811302368396859 )
	);
	const mat3 AgXOutsetMatrix = mat3(
		vec3( 1.1271005818144368, - 0.1413297634984383, - 0.14132976349843826 ),
		vec3( - 0.11060664309660323, 1.157823702216272, - 0.11060664309660294 ),
		vec3( - 0.016493938717834573, - 0.016493938717834257, 1.2519364065950405 )
	);
	const float AgxMinEv = - 12.47393;	const float AgxMaxEv = 4.026069;
	color *= toneMappingExposure;
	color = LINEAR_SRGB_TO_LINEAR_REC2020 * color;
	color = AgXInsetMatrix * color;
	color = max( color, 1e-10 );	color = log2( color );
	color = ( color - AgxMinEv ) / ( AgxMaxEv - AgxMinEv );
	color = clamp( color, 0.0, 1.0 );
	color = agxDefaultContrastApprox( color );
	color = AgXOutsetMatrix * color;
	color = pow( max( vec3( 0.0 ), color ), vec3( 2.2 ) );
	color = LINEAR_REC2020_TO_LINEAR_SRGB * color;
	color = clamp( color, 0.0, 1.0 );
	return color;
}
vec3 NeutralToneMapping( vec3 color ) {
	const float StartCompression = 0.8 - 0.04;
	const float Desaturation = 0.15;
	color *= toneMappingExposure;
	float x = min( color.r, min( color.g, color.b ) );
	float offset = x < 0.08 ? x - 6.25 * x * x : 0.04;
	color -= offset;
	float peak = max( color.r, max( color.g, color.b ) );
	if ( peak < StartCompression ) return color;
	float d = 1. - StartCompression;
	float newPeak = 1. - d * d / ( peak + d - StartCompression );
	color *= newPeak / peak;
	float g = 1. - 1. / ( Desaturation * ( peak - newPeak ) + 1. );
	return mix( color, vec3( newPeak ), g );
}
vec3 CustomToneMapping( vec3 color ) { return color; }`,n0=`#ifdef USE_TRANSMISSION
	material.transmission = transmission;
	material.transmissionAlpha = 1.0;
	material.thickness = thickness;
	material.attenuationDistance = attenuationDistance;
	material.attenuationColor = attenuationColor;
	#ifdef USE_TRANSMISSIONMAP
		material.transmission *= texture2D( transmissionMap, vTransmissionMapUv ).r;
	#endif
	#ifdef USE_THICKNESSMAP
		material.thickness *= texture2D( thicknessMap, vThicknessMapUv ).g;
	#endif
	vec3 pos = vWorldPosition;
	vec3 v = normalize( cameraPosition - pos );
	vec3 n = transformNormalByInverseViewMatrix( normal, viewMatrix );
	vec4 transmitted = getIBLVolumeRefraction(
		n, v, material.roughness, material.diffuseContribution, material.specularColorBlended, material.specularF90,
		pos, modelMatrix, viewMatrix, projectionMatrix, material.dispersion, material.ior, material.thickness,
		material.attenuationColor, material.attenuationDistance );
	material.transmissionAlpha = mix( material.transmissionAlpha, transmitted.a, material.transmission );
	totalDiffuse = mix( totalDiffuse, transmitted.rgb, material.transmission );
#endif`,i0=`#ifdef USE_TRANSMISSION
	uniform float transmission;
	uniform float thickness;
	uniform float attenuationDistance;
	uniform vec3 attenuationColor;
	#ifdef USE_TRANSMISSIONMAP
		uniform sampler2D transmissionMap;
	#endif
	#ifdef USE_THICKNESSMAP
		uniform sampler2D thicknessMap;
	#endif
	uniform vec2 transmissionSamplerSize;
	uniform sampler2D transmissionSamplerMap;
	uniform mat4 modelMatrix;
	uniform mat4 projectionMatrix;
	varying vec3 vWorldPosition;
	float w0( float a ) {
		return ( 1.0 / 6.0 ) * ( a * ( a * ( - a + 3.0 ) - 3.0 ) + 1.0 );
	}
	float w1( float a ) {
		return ( 1.0 / 6.0 ) * ( a *  a * ( 3.0 * a - 6.0 ) + 4.0 );
	}
	float w2( float a ){
		return ( 1.0 / 6.0 ) * ( a * ( a * ( - 3.0 * a + 3.0 ) + 3.0 ) + 1.0 );
	}
	float w3( float a ) {
		return ( 1.0 / 6.0 ) * ( a * a * a );
	}
	float g0( float a ) {
		return w0( a ) + w1( a );
	}
	float g1( float a ) {
		return w2( a ) + w3( a );
	}
	float h0( float a ) {
		return - 1.0 + w1( a ) / ( w0( a ) + w1( a ) );
	}
	float h1( float a ) {
		return 1.0 + w3( a ) / ( w2( a ) + w3( a ) );
	}
	vec4 bicubic( sampler2D tex, vec2 uv, vec4 texelSize, float lod ) {
		uv = uv * texelSize.zw + 0.5;
		vec2 iuv = floor( uv );
		vec2 fuv = fract( uv );
		float g0x = g0( fuv.x );
		float g1x = g1( fuv.x );
		float h0x = h0( fuv.x );
		float h1x = h1( fuv.x );
		float h0y = h0( fuv.y );
		float h1y = h1( fuv.y );
		vec2 p0 = ( vec2( iuv.x + h0x, iuv.y + h0y ) - 0.5 ) * texelSize.xy;
		vec2 p1 = ( vec2( iuv.x + h1x, iuv.y + h0y ) - 0.5 ) * texelSize.xy;
		vec2 p2 = ( vec2( iuv.x + h0x, iuv.y + h1y ) - 0.5 ) * texelSize.xy;
		vec2 p3 = ( vec2( iuv.x + h1x, iuv.y + h1y ) - 0.5 ) * texelSize.xy;
		return g0( fuv.y ) * ( g0x * textureLod( tex, p0, lod ) + g1x * textureLod( tex, p1, lod ) ) +
			g1( fuv.y ) * ( g0x * textureLod( tex, p2, lod ) + g1x * textureLod( tex, p3, lod ) );
	}
	vec4 textureBicubic( sampler2D sampler, vec2 uv, float lod ) {
		vec2 fLodSize = vec2( textureSize( sampler, int( lod ) ) );
		vec2 cLodSize = vec2( textureSize( sampler, int( lod + 1.0 ) ) );
		vec2 fLodSizeInv = 1.0 / fLodSize;
		vec2 cLodSizeInv = 1.0 / cLodSize;
		vec4 fSample = bicubic( sampler, uv, vec4( fLodSizeInv, fLodSize ), floor( lod ) );
		vec4 cSample = bicubic( sampler, uv, vec4( cLodSizeInv, cLodSize ), ceil( lod ) );
		return mix( fSample, cSample, fract( lod ) );
	}
	vec3 getVolumeTransmissionRay( const in vec3 n, const in vec3 v, const in float thickness, const in float ior, const in mat4 modelMatrix ) {
		vec3 refractionVector = refract( - v, normalize( n ), 1.0 / ior );
		vec3 modelScale;
		modelScale.x = length( vec3( modelMatrix[ 0 ].xyz ) );
		modelScale.y = length( vec3( modelMatrix[ 1 ].xyz ) );
		modelScale.z = length( vec3( modelMatrix[ 2 ].xyz ) );
		return normalize( refractionVector ) * thickness * modelScale;
	}
	float applyIorToRoughness( const in float roughness, const in float ior ) {
		return roughness * clamp( ior * 2.0 - 2.0, 0.0, 1.0 );
	}
	vec4 getTransmissionSample( const in vec2 fragCoord, const in float roughness, const in float ior ) {
		float lod = log2( transmissionSamplerSize.x ) * applyIorToRoughness( roughness, ior );
		return textureBicubic( transmissionSamplerMap, fragCoord.xy, lod );
	}
	vec3 volumeAttenuation( const in float transmissionDistance, const in vec3 attenuationColor, const in float attenuationDistance ) {
		if ( isinf( attenuationDistance ) ) {
			return vec3( 1.0 );
		} else {
			vec3 attenuationCoefficient = -log( attenuationColor ) / attenuationDistance;
			vec3 transmittance = exp( - attenuationCoefficient * transmissionDistance );			return transmittance;
		}
	}
	vec4 getIBLVolumeRefraction( const in vec3 n, const in vec3 v, const in float roughness, const in vec3 diffuseColor,
		const in vec3 specularColor, const in float specularF90, const in vec3 position, const in mat4 modelMatrix,
		const in mat4 viewMatrix, const in mat4 projMatrix, const in float dispersion, const in float ior, const in float thickness,
		const in vec3 attenuationColor, const in float attenuationDistance ) {
		vec4 transmittedLight;
		vec3 transmittance;
		#ifdef USE_DISPERSION
			float halfSpread = ( ior - 1.0 ) * 0.025 * dispersion;
			vec3 iors = vec3( ior - halfSpread, ior, ior + halfSpread );
			for ( int i = 0; i < 3; i ++ ) {
				vec3 transmissionRay = getVolumeTransmissionRay( n, v, thickness, iors[ i ], modelMatrix );
				vec3 refractedRayExit = position + transmissionRay;
				vec4 ndcPos = projMatrix * viewMatrix * vec4( refractedRayExit, 1.0 );
				vec2 refractionCoords = ndcPos.xy / ndcPos.w;
				refractionCoords += 1.0;
				refractionCoords /= 2.0;
				vec4 transmissionSample = getTransmissionSample( refractionCoords, roughness, iors[ i ] );
				transmittedLight[ i ] = transmissionSample[ i ];
				transmittedLight.a += transmissionSample.a;
				transmittance[ i ] = diffuseColor[ i ] * volumeAttenuation( length( transmissionRay ), attenuationColor, attenuationDistance )[ i ];
			}
			transmittedLight.a /= 3.0;
		#else
			vec3 transmissionRay = getVolumeTransmissionRay( n, v, thickness, ior, modelMatrix );
			vec3 refractedRayExit = position + transmissionRay;
			vec4 ndcPos = projMatrix * viewMatrix * vec4( refractedRayExit, 1.0 );
			vec2 refractionCoords = ndcPos.xy / ndcPos.w;
			refractionCoords += 1.0;
			refractionCoords /= 2.0;
			transmittedLight = getTransmissionSample( refractionCoords, roughness, ior );
			transmittance = diffuseColor * volumeAttenuation( length( transmissionRay ), attenuationColor, attenuationDistance );
		#endif
		vec3 attenuatedColor = transmittance * transmittedLight.rgb;
		vec3 F = EnvironmentBRDF( n, v, specularColor, specularF90, roughness );
		float transmittanceFactor = ( transmittance.r + transmittance.g + transmittance.b ) / 3.0;
		return vec4( ( 1.0 - F ) * attenuatedColor, 1.0 - ( 1.0 - transmittedLight.a ) * transmittanceFactor );
	}
#endif`,s0=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
	varying vec2 vUv;
#endif
#ifdef USE_MAP
	varying vec2 vMapUv;
#endif
#ifdef USE_ALPHAMAP
	varying vec2 vAlphaMapUv;
#endif
#ifdef USE_LIGHTMAP
	varying vec2 vLightMapUv;
#endif
#ifdef USE_AOMAP
	varying vec2 vAoMapUv;
#endif
#ifdef USE_BUMPMAP
	varying vec2 vBumpMapUv;
#endif
#ifdef USE_NORMALMAP
	varying vec2 vNormalMapUv;
#endif
#ifdef USE_EMISSIVEMAP
	varying vec2 vEmissiveMapUv;
#endif
#ifdef USE_METALNESSMAP
	varying vec2 vMetalnessMapUv;
#endif
#ifdef USE_ROUGHNESSMAP
	varying vec2 vRoughnessMapUv;
#endif
#ifdef USE_ANISOTROPYMAP
	varying vec2 vAnisotropyMapUv;
#endif
#ifdef USE_CLEARCOATMAP
	varying vec2 vClearcoatMapUv;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	varying vec2 vClearcoatNormalMapUv;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	varying vec2 vClearcoatRoughnessMapUv;
#endif
#ifdef USE_IRIDESCENCEMAP
	varying vec2 vIridescenceMapUv;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	varying vec2 vIridescenceThicknessMapUv;
#endif
#ifdef USE_SHEEN_COLORMAP
	varying vec2 vSheenColorMapUv;
#endif
#ifdef USE_SHEEN_ROUGHNESSMAP
	varying vec2 vSheenRoughnessMapUv;
#endif
#ifdef USE_SPECULARMAP
	varying vec2 vSpecularMapUv;
#endif
#ifdef USE_SPECULAR_COLORMAP
	varying vec2 vSpecularColorMapUv;
#endif
#ifdef USE_SPECULAR_INTENSITYMAP
	varying vec2 vSpecularIntensityMapUv;
#endif
#ifdef USE_TRANSMISSIONMAP
	uniform mat3 transmissionMapTransform;
	varying vec2 vTransmissionMapUv;
#endif
#ifdef USE_THICKNESSMAP
	uniform mat3 thicknessMapTransform;
	varying vec2 vThicknessMapUv;
#endif`,r0=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
	varying vec2 vUv;
#endif
#ifdef USE_MAP
	uniform mat3 mapTransform;
	varying vec2 vMapUv;
#endif
#ifdef USE_ALPHAMAP
	uniform mat3 alphaMapTransform;
	varying vec2 vAlphaMapUv;
#endif
#ifdef USE_LIGHTMAP
	uniform mat3 lightMapTransform;
	varying vec2 vLightMapUv;
#endif
#ifdef USE_AOMAP
	uniform mat3 aoMapTransform;
	varying vec2 vAoMapUv;
#endif
#ifdef USE_BUMPMAP
	uniform mat3 bumpMapTransform;
	varying vec2 vBumpMapUv;
#endif
#ifdef USE_NORMALMAP
	uniform mat3 normalMapTransform;
	varying vec2 vNormalMapUv;
#endif
#ifdef USE_DISPLACEMENTMAP
	uniform mat3 displacementMapTransform;
	varying vec2 vDisplacementMapUv;
#endif
#ifdef USE_EMISSIVEMAP
	uniform mat3 emissiveMapTransform;
	varying vec2 vEmissiveMapUv;
#endif
#ifdef USE_METALNESSMAP
	uniform mat3 metalnessMapTransform;
	varying vec2 vMetalnessMapUv;
#endif
#ifdef USE_ROUGHNESSMAP
	uniform mat3 roughnessMapTransform;
	varying vec2 vRoughnessMapUv;
#endif
#ifdef USE_ANISOTROPYMAP
	uniform mat3 anisotropyMapTransform;
	varying vec2 vAnisotropyMapUv;
#endif
#ifdef USE_CLEARCOATMAP
	uniform mat3 clearcoatMapTransform;
	varying vec2 vClearcoatMapUv;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	uniform mat3 clearcoatNormalMapTransform;
	varying vec2 vClearcoatNormalMapUv;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	uniform mat3 clearcoatRoughnessMapTransform;
	varying vec2 vClearcoatRoughnessMapUv;
#endif
#ifdef USE_SHEEN_COLORMAP
	uniform mat3 sheenColorMapTransform;
	varying vec2 vSheenColorMapUv;
#endif
#ifdef USE_SHEEN_ROUGHNESSMAP
	uniform mat3 sheenRoughnessMapTransform;
	varying vec2 vSheenRoughnessMapUv;
#endif
#ifdef USE_IRIDESCENCEMAP
	uniform mat3 iridescenceMapTransform;
	varying vec2 vIridescenceMapUv;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	uniform mat3 iridescenceThicknessMapTransform;
	varying vec2 vIridescenceThicknessMapUv;
#endif
#ifdef USE_SPECULARMAP
	uniform mat3 specularMapTransform;
	varying vec2 vSpecularMapUv;
#endif
#ifdef USE_SPECULAR_COLORMAP
	uniform mat3 specularColorMapTransform;
	varying vec2 vSpecularColorMapUv;
#endif
#ifdef USE_SPECULAR_INTENSITYMAP
	uniform mat3 specularIntensityMapTransform;
	varying vec2 vSpecularIntensityMapUv;
#endif
#ifdef USE_TRANSMISSIONMAP
	uniform mat3 transmissionMapTransform;
	varying vec2 vTransmissionMapUv;
#endif
#ifdef USE_THICKNESSMAP
	uniform mat3 thicknessMapTransform;
	varying vec2 vThicknessMapUv;
#endif`,o0=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
	vUv = vec3( uv, 1 ).xy;
#endif
#ifdef USE_MAP
	vMapUv = ( mapTransform * vec3( MAP_UV, 1 ) ).xy;
#endif
#ifdef USE_ALPHAMAP
	vAlphaMapUv = ( alphaMapTransform * vec3( ALPHAMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_LIGHTMAP
	vLightMapUv = ( lightMapTransform * vec3( LIGHTMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_AOMAP
	vAoMapUv = ( aoMapTransform * vec3( AOMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_BUMPMAP
	vBumpMapUv = ( bumpMapTransform * vec3( BUMPMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_NORMALMAP
	vNormalMapUv = ( normalMapTransform * vec3( NORMALMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_DISPLACEMENTMAP
	vDisplacementMapUv = ( displacementMapTransform * vec3( DISPLACEMENTMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_EMISSIVEMAP
	vEmissiveMapUv = ( emissiveMapTransform * vec3( EMISSIVEMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_METALNESSMAP
	vMetalnessMapUv = ( metalnessMapTransform * vec3( METALNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_ROUGHNESSMAP
	vRoughnessMapUv = ( roughnessMapTransform * vec3( ROUGHNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_ANISOTROPYMAP
	vAnisotropyMapUv = ( anisotropyMapTransform * vec3( ANISOTROPYMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_CLEARCOATMAP
	vClearcoatMapUv = ( clearcoatMapTransform * vec3( CLEARCOATMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	vClearcoatNormalMapUv = ( clearcoatNormalMapTransform * vec3( CLEARCOAT_NORMALMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	vClearcoatRoughnessMapUv = ( clearcoatRoughnessMapTransform * vec3( CLEARCOAT_ROUGHNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_IRIDESCENCEMAP
	vIridescenceMapUv = ( iridescenceMapTransform * vec3( IRIDESCENCEMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	vIridescenceThicknessMapUv = ( iridescenceThicknessMapTransform * vec3( IRIDESCENCE_THICKNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SHEEN_COLORMAP
	vSheenColorMapUv = ( sheenColorMapTransform * vec3( SHEEN_COLORMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SHEEN_ROUGHNESSMAP
	vSheenRoughnessMapUv = ( sheenRoughnessMapTransform * vec3( SHEEN_ROUGHNESSMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SPECULARMAP
	vSpecularMapUv = ( specularMapTransform * vec3( SPECULARMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SPECULAR_COLORMAP
	vSpecularColorMapUv = ( specularColorMapTransform * vec3( SPECULAR_COLORMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_SPECULAR_INTENSITYMAP
	vSpecularIntensityMapUv = ( specularIntensityMapTransform * vec3( SPECULAR_INTENSITYMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_TRANSMISSIONMAP
	vTransmissionMapUv = ( transmissionMapTransform * vec3( TRANSMISSIONMAP_UV, 1 ) ).xy;
#endif
#ifdef USE_THICKNESSMAP
	vThicknessMapUv = ( thicknessMapTransform * vec3( THICKNESSMAP_UV, 1 ) ).xy;
#endif`,a0=`#if defined( USE_ENVMAP ) || defined( DISTANCE ) || defined ( USE_SHADOWMAP ) || defined ( USE_TRANSMISSION ) || NUM_SPOT_LIGHT_COORDS > 0
	vec4 worldPosition = vec4( transformed, 1.0 );
	#ifdef USE_BATCHING
		worldPosition = batchingMatrix * worldPosition;
	#endif
	#ifdef USE_INSTANCING
		worldPosition = instanceMatrix * worldPosition;
	#endif
	worldPosition = modelMatrix * worldPosition;
#endif`,l0=`varying vec2 vUv;
uniform mat3 uvTransform;
void main() {
	vUv = ( uvTransform * vec3( uv, 1 ) ).xy;
	gl_Position = vec4( position.xy, 1.0, 1.0 );
}`,c0=`uniform sampler2D t2D;
uniform float backgroundIntensity;
varying vec2 vUv;
void main() {
	vec4 texColor = texture2D( t2D, vUv );
	#ifdef DECODE_VIDEO_TEXTURE
		texColor = vec4( mix( pow( texColor.rgb * 0.9478672986 + vec3( 0.0521327014 ), vec3( 2.4 ) ), texColor.rgb * 0.0773993808, vec3( lessThanEqual( texColor.rgb, vec3( 0.04045 ) ) ) ), texColor.w );
	#endif
	texColor.rgb *= backgroundIntensity;
	gl_FragColor = texColor;
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,h0=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
	gl_Position.z = gl_Position.w;
}`,u0=`#ifdef ENVMAP_TYPE_CUBE
	uniform samplerCube envMap;
#elif defined( ENVMAP_TYPE_CUBE_UV )
	uniform sampler2D envMap;
#endif
uniform float backgroundBlurriness;
uniform float backgroundIntensity;
uniform mat3 backgroundRotation;
varying vec3 vWorldDirection;
#include <cube_uv_reflection_fragment>
void main() {
	#ifdef ENVMAP_TYPE_CUBE
		vec4 texColor = textureCube( envMap, backgroundRotation * vWorldDirection );
	#elif defined( ENVMAP_TYPE_CUBE_UV )
		vec4 texColor = textureCubeUV( envMap, backgroundRotation * vWorldDirection, backgroundBlurriness );
	#else
		vec4 texColor = vec4( 0.0, 0.0, 0.0, 1.0 );
	#endif
	texColor.rgb *= backgroundIntensity;
	gl_FragColor = texColor;
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,d0=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
	gl_Position.z = gl_Position.w;
}`,f0=`uniform samplerCube tCube;
uniform float tFlip;
uniform float opacity;
varying vec3 vWorldDirection;
void main() {
	vec4 texColor = textureCube( tCube, vec3( tFlip * vWorldDirection.x, vWorldDirection.yz ) );
	gl_FragColor = texColor;
	gl_FragColor.a *= opacity;
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,p0=`#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
varying vec2 vHighPrecisionZW;
void main() {
	#include <uv_vertex>
	#include <batching_vertex>
	#include <skinbase_vertex>
	#include <morphinstance_vertex>
	#ifdef USE_DISPLACEMENTMAP
		#include <beginnormal_vertex>
		#include <morphnormal_vertex>
		#include <skinnormal_vertex>
	#endif
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vHighPrecisionZW = gl_Position.zw;
}`,m0=`#if DEPTH_PACKING == 3200
	uniform float opacity;
#endif
#include <common>
#include <packing>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
varying vec2 vHighPrecisionZW;
void main() {
	vec4 diffuseColor = vec4( 1.0 );
	#include <clipping_planes_fragment>
	#if DEPTH_PACKING == 3200
		diffuseColor.a = opacity;
	#endif
	#include <map_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <logdepthbuf_fragment>
	#ifdef USE_REVERSED_DEPTH_BUFFER
		float fragCoordZ = vHighPrecisionZW[ 0 ] / vHighPrecisionZW[ 1 ];
	#else
		float fragCoordZ = 0.5 * vHighPrecisionZW[ 0 ] / vHighPrecisionZW[ 1 ] + 0.5;
	#endif
	#if DEPTH_PACKING == 3200
		gl_FragColor = vec4( vec3( 1.0 - fragCoordZ ), opacity );
	#elif DEPTH_PACKING == 3201
		gl_FragColor = packDepthToRGBA( fragCoordZ );
	#elif DEPTH_PACKING == 3202
		gl_FragColor = vec4( packDepthToRGB( fragCoordZ ), 1.0 );
	#elif DEPTH_PACKING == 3203
		gl_FragColor = vec4( packDepthToRG( fragCoordZ ), 0.0, 1.0 );
	#endif
}`,g0=`#define DISTANCE
varying vec3 vWorldPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <batching_vertex>
	#include <skinbase_vertex>
	#include <morphinstance_vertex>
	#ifdef USE_DISPLACEMENTMAP
		#include <beginnormal_vertex>
		#include <morphnormal_vertex>
		#include <skinnormal_vertex>
	#endif
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <worldpos_vertex>
	#include <clipping_planes_vertex>
	vWorldPosition = worldPosition.xyz;
}`,x0=`#define DISTANCE
uniform vec3 referencePosition;
uniform float nearDistance;
uniform float farDistance;
varying vec3 vWorldPosition;
#include <common>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( 1.0 );
	#include <clipping_planes_fragment>
	#include <map_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	float dist = length( vWorldPosition - referencePosition );
	dist = ( dist - nearDistance ) / ( farDistance - nearDistance );
	dist = saturate( dist );
	gl_FragColor = vec4( dist, 0.0, 0.0, 1.0 );
}`,y0=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
}`,v0=`uniform sampler2D tEquirect;
varying vec3 vWorldDirection;
#include <common>
void main() {
	vec3 direction = normalize( vWorldDirection );
	vec2 sampleUV = equirectUv( direction );
	gl_FragColor = texture2D( tEquirect, sampleUV );
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,_0=`uniform float scale;
attribute float lineDistance;
varying float vLineDistance;
#include <common>
#include <uv_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	vLineDistance = scale * lineDistance;
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <fog_vertex>
}`,b0=`uniform vec3 diffuse;
uniform float opacity;
uniform float dashSize;
uniform float totalSize;
varying float vLineDistance;
#include <common>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <fog_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	if ( mod( vLineDistance, totalSize ) > dashSize ) {
		discard;
	}
	vec3 outgoingLight = vec3( 0.0 );
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	outgoingLight = diffuseColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
}`,M0=`#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <envmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#if defined ( USE_ENVMAP ) || defined ( USE_SKINNING )
		#include <beginnormal_vertex>
		#include <morphnormal_vertex>
		#include <skinbase_vertex>
		#include <skinnormal_vertex>
		#include <defaultnormal_vertex>
	#endif
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <worldpos_vertex>
	#include <envmap_vertex>
	#include <fog_vertex>
}`,S0=`uniform vec3 diffuse;
uniform float opacity;
#ifndef FLAT_SHADED
	varying vec3 vNormal;
#endif
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_pars_fragment>
#include <fog_pars_fragment>
#include <specularmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <specularmap_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	#ifdef USE_LIGHTMAP
		vec4 lightMapTexel = texture2D( lightMap, vLightMapUv );
		reflectedLight.indirectDiffuse += lightMapTexel.rgb * lightMapIntensity * RECIPROCAL_PI;
	#else
		reflectedLight.indirectDiffuse += vec3( 1.0 );
	#endif
	#include <aomap_fragment>
	reflectedLight.indirectDiffuse *= diffuseColor.rgb;
	vec3 outgoingLight = reflectedLight.indirectDiffuse;
	#include <envmap_fragment>
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,w0=`#define LAMBERT
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <envmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <envmap_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,E0=`#define LAMBERT
uniform vec3 diffuse;
uniform vec3 emissive;
uniform float opacity;
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <cube_uv_reflection_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_pars_fragment>
#include <envmap_physical_pars_fragment>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_lambert_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <specularmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <specularmap_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_lambert_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + totalEmissiveRadiance;
	#include <envmap_fragment>
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,T0=`#define MATCAP
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <color_pars_vertex>
#include <displacementmap_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <fog_vertex>
	vViewPosition = - mvPosition.xyz;
}`,A0=`#define MATCAP
uniform vec3 diffuse;
uniform float opacity;
uniform sampler2D matcap;
varying vec3 vViewPosition;
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <fog_pars_fragment>
#include <normal_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	vec3 viewDir = normalize( vViewPosition );
	vec3 x = normalize( vec3( viewDir.z, 0.0, - viewDir.x ) );
	vec3 y = cross( viewDir, x );
	vec2 uv = vec2( dot( x, normal ), dot( y, normal ) ) * 0.495 + 0.5;
	#ifdef USE_MATCAP
		vec4 matcapColor = texture2D( matcap, uv );
	#else
		vec4 matcapColor = vec4( vec3( mix( 0.2, 0.8, uv.y ) ), 1.0 );
	#endif
	vec3 outgoingLight = diffuseColor.rgb * matcapColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,P0=`#define NORMAL
#if defined( FLAT_SHADED ) || defined( USE_BUMPMAP ) || defined( USE_NORMALMAP_TANGENTSPACE )
	varying vec3 vViewPosition;
#endif
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphinstance_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
#if defined( FLAT_SHADED ) || defined( USE_BUMPMAP ) || defined( USE_NORMALMAP_TANGENTSPACE )
	vViewPosition = - mvPosition.xyz;
#endif
}`,R0=`#define NORMAL
uniform float opacity;
#if defined( FLAT_SHADED ) || defined( USE_BUMPMAP ) || defined( USE_NORMALMAP_TANGENTSPACE )
	varying vec3 vViewPosition;
#endif
#include <uv_pars_fragment>
#include <normal_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( 0.0, 0.0, 0.0, opacity );
	#include <clipping_planes_fragment>
	#include <logdepthbuf_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	gl_FragColor = vec4( normalize( normal ) * 0.5 + 0.5, diffuseColor.a );
	#ifdef OPAQUE
		gl_FragColor.a = 1.0;
	#endif
}`,C0=`#define PHONG
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <envmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphinstance_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <envmap_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,I0=`#define PHONG
uniform vec3 diffuse;
uniform vec3 emissive;
uniform vec3 specular;
uniform float shininess;
uniform float opacity;
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <cube_uv_reflection_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_pars_fragment>
#include <envmap_physical_pars_fragment>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_phong_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <specularmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <specularmap_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_phong_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + reflectedLight.directSpecular + reflectedLight.indirectSpecular + totalEmissiveRadiance;
	#include <envmap_fragment>
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,L0=`#define STANDARD
varying vec3 vViewPosition;
#ifdef USE_TRANSMISSION
	varying vec3 vWorldPosition;
#endif
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
#ifdef USE_TRANSMISSION
	vWorldPosition = worldPosition.xyz;
#endif
}`,D0=`#define STANDARD
#ifdef PHYSICAL
	#define IOR
	#define USE_SPECULAR
#endif
uniform vec3 diffuse;
uniform vec3 emissive;
uniform float roughness;
uniform float metalness;
uniform float opacity;
#ifdef IOR
	uniform float ior;
#endif
#ifdef USE_SPECULAR
	uniform float specularIntensity;
	uniform vec3 specularColor;
	#ifdef USE_SPECULAR_COLORMAP
		uniform sampler2D specularColorMap;
	#endif
	#ifdef USE_SPECULAR_INTENSITYMAP
		uniform sampler2D specularIntensityMap;
	#endif
#endif
#ifdef USE_CLEARCOAT
	uniform float clearcoat;
	uniform float clearcoatRoughness;
#endif
#ifdef USE_DISPERSION
	uniform float dispersion;
#endif
#ifdef USE_IRIDESCENCE
	uniform float iridescence;
	uniform float iridescenceIOR;
	uniform float iridescenceThicknessMinimum;
	uniform float iridescenceThicknessMaximum;
#endif
#ifdef USE_SHEEN
	uniform vec3 sheenColor;
	uniform float sheenRoughness;
	#ifdef USE_SHEEN_COLORMAP
		uniform sampler2D sheenColorMap;
	#endif
	#ifdef USE_SHEEN_ROUGHNESSMAP
		uniform sampler2D sheenRoughnessMap;
	#endif
#endif
#ifdef USE_ANISOTROPY
	uniform vec2 anisotropyVector;
	#ifdef USE_ANISOTROPYMAP
		uniform sampler2D anisotropyMap;
	#endif
#endif
varying vec3 vViewPosition;
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <iridescence_fragment>
#include <cube_uv_reflection_fragment>
#include <envmap_common_pars_fragment>
#include <envmap_physical_pars_fragment>
#include <fog_pars_fragment>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_physical_pars_fragment>
#include <transmission_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <clearcoat_pars_fragment>
#include <iridescence_pars_fragment>
#include <roughnessmap_pars_fragment>
#include <metalnessmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <roughnessmap_fragment>
	#include <metalnessmap_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <clearcoat_normal_fragment_begin>
	#include <clearcoat_normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_physical_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 totalDiffuse = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse;
	vec3 totalSpecular = reflectedLight.directSpecular + reflectedLight.indirectSpecular;
	#include <transmission_fragment>
	vec3 outgoingLight = totalDiffuse + totalSpecular + totalEmissiveRadiance;
	#ifdef USE_SHEEN
 
		outgoingLight = outgoingLight + sheenSpecularDirect + sheenSpecularIndirect;
 
 	#endif
	#ifdef USE_CLEARCOAT
		float dotNVcc = saturate( dot( geometryClearcoatNormal, geometryViewDir ) );
		vec3 Fcc = F_Schlick( material.clearcoatF0, material.clearcoatF90, dotNVcc );
		outgoingLight = outgoingLight * ( 1.0 - material.clearcoat * Fcc ) + ( clearcoatSpecularDirect + clearcoatSpecularIndirect ) * material.clearcoat;
	#endif
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,F0=`#define TOON
varying vec3 vViewPosition;
#include <common>
#include <batching_pars_vertex>
#include <uv_pars_vertex>
#include <displacementmap_pars_vertex>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <normal_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <shadowmap_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <normal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <displacementmap_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	vViewPosition = - mvPosition.xyz;
	#include <worldpos_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,U0=`#define TOON
uniform vec3 diffuse;
uniform vec3 emissive;
uniform float opacity;
#include <common>
#include <dithering_pars_fragment>
#include <color_pars_fragment>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <aomap_pars_fragment>
#include <lightmap_pars_fragment>
#include <emissivemap_pars_fragment>
#include <gradientmap_pars_fragment>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <normal_pars_fragment>
#include <lights_toon_pars_fragment>
#include <shadowmap_pars_fragment>
#include <bumpmap_pars_fragment>
#include <normalmap_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	ReflectedLight reflectedLight = ReflectedLight( vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ), vec3( 0.0 ) );
	vec3 totalEmissiveRadiance = emissive;
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <color_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	#include <normal_fragment_begin>
	#include <normal_fragment_maps>
	#include <emissivemap_fragment>
	#include <lights_toon_fragment>
	#include <lights_fragment_begin>
	#include <lights_fragment_maps>
	#include <lights_fragment_end>
	#include <aomap_fragment>
	vec3 outgoingLight = reflectedLight.directDiffuse + reflectedLight.indirectDiffuse + totalEmissiveRadiance;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
	#include <dithering_fragment>
}`,N0=`uniform float size;
uniform float scale;
#include <common>
#include <color_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
#ifdef USE_POINTS_UV
	varying vec2 vUv;
	uniform mat3 uvTransform;
#endif
void main() {
	#ifdef USE_POINTS_UV
		vUv = ( uvTransform * vec3( uv, 1 ) ).xy;
	#endif
	#include <color_vertex>
	#include <morphinstance_vertex>
	#include <morphcolor_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <project_vertex>
	gl_PointSize = size;
	#ifdef USE_SIZEATTENUATION
		bool isPerspective = isPerspectiveMatrix( projectionMatrix );
		if ( isPerspective ) gl_PointSize *= ( scale / - mvPosition.z );
	#endif
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <worldpos_vertex>
	#include <fog_vertex>
}`,O0=`uniform vec3 diffuse;
uniform float opacity;
#include <common>
#include <color_pars_fragment>
#include <map_particle_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <fog_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	vec3 outgoingLight = vec3( 0.0 );
	#include <logdepthbuf_fragment>
	#include <map_particle_fragment>
	#include <color_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	outgoingLight = diffuseColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
}`,B0=`#include <common>
#include <batching_pars_vertex>
#include <fog_pars_vertex>
#include <morphtarget_pars_vertex>
#include <skinning_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <shadowmap_pars_vertex>
void main() {
	#include <batching_vertex>
	#include <beginnormal_vertex>
	#include <morphinstance_vertex>
	#include <morphnormal_vertex>
	#include <skinbase_vertex>
	#include <skinnormal_vertex>
	#include <defaultnormal_vertex>
	#include <begin_vertex>
	#include <morphtarget_vertex>
	#include <skinning_vertex>
	#include <project_vertex>
	#include <logdepthbuf_vertex>
	#include <worldpos_vertex>
	#include <shadowmap_vertex>
	#include <fog_vertex>
}`,z0=`uniform vec3 color;
uniform float opacity;
#include <common>
#include <fog_pars_fragment>
#include <bsdfs>
#include <lights_pars_begin>
#include <logdepthbuf_pars_fragment>
#include <shadowmap_pars_fragment>
#include <shadowmask_pars_fragment>
void main() {
	#include <logdepthbuf_fragment>
	gl_FragColor = vec4( color, opacity * ( 1.0 - getShadowMask() ) );
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
	#include <premultiplied_alpha_fragment>
}`,k0=`uniform float rotation;
uniform vec2 center;
#include <common>
#include <uv_pars_vertex>
#include <fog_pars_vertex>
#include <logdepthbuf_pars_vertex>
#include <clipping_planes_pars_vertex>
void main() {
	#include <uv_vertex>
	vec4 mvPosition = modelViewMatrix[ 3 ];
	vec2 scale = vec2( length( modelMatrix[ 0 ].xyz ), length( modelMatrix[ 1 ].xyz ) );
	#ifndef USE_SIZEATTENUATION
		bool isPerspective = isPerspectiveMatrix( projectionMatrix );
		if ( isPerspective ) scale *= - mvPosition.z;
	#endif
	vec2 alignedPosition = ( position.xy - ( center - vec2( 0.5 ) ) ) * scale;
	vec2 rotatedPosition;
	rotatedPosition.x = cos( rotation ) * alignedPosition.x - sin( rotation ) * alignedPosition.y;
	rotatedPosition.y = sin( rotation ) * alignedPosition.x + cos( rotation ) * alignedPosition.y;
	mvPosition.xy += rotatedPosition;
	gl_Position = projectionMatrix * mvPosition;
	#include <logdepthbuf_vertex>
	#include <clipping_planes_vertex>
	#include <fog_vertex>
}`,V0=`uniform vec3 diffuse;
uniform float opacity;
#include <common>
#include <uv_pars_fragment>
#include <map_pars_fragment>
#include <alphamap_pars_fragment>
#include <alphatest_pars_fragment>
#include <alphahash_pars_fragment>
#include <fog_pars_fragment>
#include <logdepthbuf_pars_fragment>
#include <clipping_planes_pars_fragment>
void main() {
	vec4 diffuseColor = vec4( diffuse, opacity );
	#include <clipping_planes_fragment>
	vec3 outgoingLight = vec3( 0.0 );
	#include <logdepthbuf_fragment>
	#include <map_fragment>
	#include <alphamap_fragment>
	#include <alphatest_fragment>
	#include <alphahash_fragment>
	outgoingLight = diffuseColor.rgb;
	#include <opaque_fragment>
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
	#include <fog_fragment>
}`,Ve={alphahash_fragment:lg,alphahash_pars_fragment:cg,alphamap_fragment:hg,alphamap_pars_fragment:ug,alphatest_fragment:dg,alphatest_pars_fragment:fg,aomap_fragment:pg,aomap_pars_fragment:mg,batching_pars_vertex:gg,batching_vertex:xg,begin_vertex:yg,beginnormal_vertex:vg,bsdfs:_g,iridescence_fragment:bg,bumpmap_pars_fragment:Mg,clipping_planes_fragment:Sg,clipping_planes_pars_fragment:wg,clipping_planes_pars_vertex:Eg,clipping_planes_vertex:Tg,color_fragment:Ag,color_pars_fragment:Pg,color_pars_vertex:Rg,color_vertex:Cg,common:Ig,cube_uv_reflection_fragment:Lg,defaultnormal_vertex:Dg,displacementmap_pars_vertex:Fg,displacementmap_vertex:Ug,emissivemap_fragment:Ng,emissivemap_pars_fragment:Og,colorspace_fragment:Bg,colorspace_pars_fragment:zg,envmap_fragment:kg,envmap_common_pars_fragment:Vg,envmap_pars_fragment:Hg,envmap_pars_vertex:Gg,envmap_physical_pars_fragment:ex,envmap_vertex:Wg,fog_vertex:Xg,fog_pars_vertex:qg,fog_fragment:Yg,fog_pars_fragment:$g,gradientmap_pars_fragment:Kg,lightmap_pars_fragment:Zg,lights_lambert_fragment:Jg,lights_lambert_pars_fragment:jg,lights_pars_begin:Qg,lights_toon_fragment:tx,lights_toon_pars_fragment:nx,lights_phong_fragment:ix,lights_phong_pars_fragment:sx,lights_physical_fragment:rx,lights_physical_pars_fragment:ox,lights_fragment_begin:ax,lights_fragment_maps:lx,lights_fragment_end:cx,lightprobes_pars_fragment:hx,logdepthbuf_fragment:ux,logdepthbuf_pars_fragment:dx,logdepthbuf_pars_vertex:fx,logdepthbuf_vertex:px,map_fragment:mx,map_pars_fragment:gx,map_particle_fragment:xx,map_particle_pars_fragment:yx,metalnessmap_fragment:vx,metalnessmap_pars_fragment:_x,morphinstance_vertex:bx,morphcolor_vertex:Mx,morphnormal_vertex:Sx,morphtarget_pars_vertex:wx,morphtarget_vertex:Ex,normal_fragment_begin:Tx,normal_fragment_maps:Ax,normal_pars_fragment:Px,normal_pars_vertex:Rx,normal_vertex:Cx,normalmap_pars_fragment:Ix,clearcoat_normal_fragment_begin:Lx,clearcoat_normal_fragment_maps:Dx,clearcoat_pars_fragment:Fx,iridescence_pars_fragment:Ux,opaque_fragment:Nx,packing:Ox,premultiplied_alpha_fragment:Bx,project_vertex:zx,dithering_fragment:kx,dithering_pars_fragment:Vx,roughnessmap_fragment:Hx,roughnessmap_pars_fragment:Gx,shadowmap_pars_fragment:Wx,shadowmap_pars_vertex:Xx,shadowmap_vertex:qx,shadowmask_pars_fragment:Yx,skinbase_vertex:$x,skinning_pars_vertex:Kx,skinning_vertex:Zx,skinnormal_vertex:Jx,specularmap_fragment:jx,specularmap_pars_fragment:Qx,tonemapping_fragment:e0,tonemapping_pars_fragment:t0,transmission_fragment:n0,transmission_pars_fragment:i0,uv_pars_fragment:s0,uv_pars_vertex:r0,uv_vertex:o0,worldpos_vertex:a0,background_vert:l0,background_frag:c0,backgroundCube_vert:h0,backgroundCube_frag:u0,cube_vert:d0,cube_frag:f0,depth_vert:p0,depth_frag:m0,distance_vert:g0,distance_frag:x0,equirect_vert:y0,equirect_frag:v0,linedashed_vert:_0,linedashed_frag:b0,meshbasic_vert:M0,meshbasic_frag:S0,meshlambert_vert:w0,meshlambert_frag:E0,meshmatcap_vert:T0,meshmatcap_frag:A0,meshnormal_vert:P0,meshnormal_frag:R0,meshphong_vert:C0,meshphong_frag:I0,meshphysical_vert:L0,meshphysical_frag:D0,meshtoon_vert:F0,meshtoon_frag:U0,points_vert:N0,points_frag:O0,shadow_vert:B0,shadow_frag:z0,sprite_vert:k0,sprite_frag:V0},re={common:{diffuse:{value:new We(16777215)},opacity:{value:1},map:{value:null},mapTransform:{value:new Ue},alphaMap:{value:null},alphaMapTransform:{value:new Ue},alphaTest:{value:0}},specularmap:{specularMap:{value:null},specularMapTransform:{value:new Ue}},envmap:{envMap:{value:null},envMapRotation:{value:new Ue},reflectivity:{value:1},ior:{value:1.5},refractionRatio:{value:.98},dfgLUT:{value:null}},aomap:{aoMap:{value:null},aoMapIntensity:{value:1},aoMapTransform:{value:new Ue}},lightmap:{lightMap:{value:null},lightMapIntensity:{value:1},lightMapTransform:{value:new Ue}},bumpmap:{bumpMap:{value:null},bumpMapTransform:{value:new Ue},bumpScale:{value:1}},normalmap:{normalMap:{value:null},normalMapTransform:{value:new Ue},normalScale:{value:new Ge(1,1)}},displacementmap:{displacementMap:{value:null},displacementMapTransform:{value:new Ue},displacementScale:{value:1},displacementBias:{value:0}},emissivemap:{emissiveMap:{value:null},emissiveMapTransform:{value:new Ue}},metalnessmap:{metalnessMap:{value:null},metalnessMapTransform:{value:new Ue}},roughnessmap:{roughnessMap:{value:null},roughnessMapTransform:{value:new Ue}},gradientmap:{gradientMap:{value:null}},fog:{fogDensity:{value:25e-5},fogNear:{value:1},fogFar:{value:2e3},fogColor:{value:new We(16777215)}},lights:{ambientLightColor:{value:[]},lightProbe:{value:[]},directionalLights:{value:[],properties:{direction:{},color:{}}},directionalLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{}}},directionalShadowMatrix:{value:[]},spotLights:{value:[],properties:{color:{},position:{},direction:{},distance:{},coneCos:{},penumbraCos:{},decay:{}}},spotLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{}}},spotLightMap:{value:[]},spotLightMatrix:{value:[]},pointLights:{value:[],properties:{color:{},position:{},decay:{},distance:{}}},pointLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{},shadowCameraNear:{},shadowCameraFar:{}}},pointShadowMatrix:{value:[]},hemisphereLights:{value:[],properties:{direction:{},skyColor:{},groundColor:{}}},rectAreaLights:{value:[],properties:{color:{},position:{},width:{},height:{}}},ltc_1:{value:null},ltc_2:{value:null},probesSH:{value:null},probesMin:{value:new N},probesMax:{value:new N},probesResolution:{value:new N}},points:{diffuse:{value:new We(16777215)},opacity:{value:1},size:{value:1},scale:{value:1},map:{value:null},alphaMap:{value:null},alphaMapTransform:{value:new Ue},alphaTest:{value:0},uvTransform:{value:new Ue}},sprite:{diffuse:{value:new We(16777215)},opacity:{value:1},center:{value:new Ge(.5,.5)},rotation:{value:0},map:{value:null},mapTransform:{value:new Ue},alphaMap:{value:null},alphaMapTransform:{value:new Ue},alphaTest:{value:0}}},Qt={basic:{uniforms:$t([re.common,re.specularmap,re.envmap,re.aomap,re.lightmap,re.fog]),vertexShader:Ve.meshbasic_vert,fragmentShader:Ve.meshbasic_frag},lambert:{uniforms:$t([re.common,re.specularmap,re.envmap,re.aomap,re.lightmap,re.emissivemap,re.bumpmap,re.normalmap,re.displacementmap,re.fog,re.lights,{emissive:{value:new We(0)},envMapIntensity:{value:1}}]),vertexShader:Ve.meshlambert_vert,fragmentShader:Ve.meshlambert_frag},phong:{uniforms:$t([re.common,re.specularmap,re.envmap,re.aomap,re.lightmap,re.emissivemap,re.bumpmap,re.normalmap,re.displacementmap,re.fog,re.lights,{emissive:{value:new We(0)},specular:{value:new We(1118481)},shininess:{value:30},envMapIntensity:{value:1}}]),vertexShader:Ve.meshphong_vert,fragmentShader:Ve.meshphong_frag},standard:{uniforms:$t([re.common,re.envmap,re.aomap,re.lightmap,re.emissivemap,re.bumpmap,re.normalmap,re.displacementmap,re.roughnessmap,re.metalnessmap,re.fog,re.lights,{emissive:{value:new We(0)},roughness:{value:1},metalness:{value:0},envMapIntensity:{value:1}}]),vertexShader:Ve.meshphysical_vert,fragmentShader:Ve.meshphysical_frag},toon:{uniforms:$t([re.common,re.aomap,re.lightmap,re.emissivemap,re.bumpmap,re.normalmap,re.displacementmap,re.gradientmap,re.fog,re.lights,{emissive:{value:new We(0)}}]),vertexShader:Ve.meshtoon_vert,fragmentShader:Ve.meshtoon_frag},matcap:{uniforms:$t([re.common,re.bumpmap,re.normalmap,re.displacementmap,re.fog,{matcap:{value:null}}]),vertexShader:Ve.meshmatcap_vert,fragmentShader:Ve.meshmatcap_frag},points:{uniforms:$t([re.points,re.fog]),vertexShader:Ve.points_vert,fragmentShader:Ve.points_frag},dashed:{uniforms:$t([re.common,re.fog,{scale:{value:1},dashSize:{value:1},totalSize:{value:2}}]),vertexShader:Ve.linedashed_vert,fragmentShader:Ve.linedashed_frag},depth:{uniforms:$t([re.common,re.displacementmap]),vertexShader:Ve.depth_vert,fragmentShader:Ve.depth_frag},normal:{uniforms:$t([re.common,re.bumpmap,re.normalmap,re.displacementmap,{opacity:{value:1}}]),vertexShader:Ve.meshnormal_vert,fragmentShader:Ve.meshnormal_frag},sprite:{uniforms:$t([re.sprite,re.fog]),vertexShader:Ve.sprite_vert,fragmentShader:Ve.sprite_frag},background:{uniforms:{uvTransform:{value:new Ue},t2D:{value:null},backgroundIntensity:{value:1}},vertexShader:Ve.background_vert,fragmentShader:Ve.background_frag},backgroundCube:{uniforms:{envMap:{value:null},backgroundBlurriness:{value:0},backgroundIntensity:{value:1},backgroundRotation:{value:new Ue}},vertexShader:Ve.backgroundCube_vert,fragmentShader:Ve.backgroundCube_frag},cube:{uniforms:{tCube:{value:null},tFlip:{value:-1},opacity:{value:1}},vertexShader:Ve.cube_vert,fragmentShader:Ve.cube_frag},equirect:{uniforms:{tEquirect:{value:null}},vertexShader:Ve.equirect_vert,fragmentShader:Ve.equirect_frag},distance:{uniforms:$t([re.common,re.displacementmap,{referencePosition:{value:new N},nearDistance:{value:1},farDistance:{value:1e3}}]),vertexShader:Ve.distance_vert,fragmentShader:Ve.distance_frag},shadow:{uniforms:$t([re.lights,re.fog,{color:{value:new We(0)},opacity:{value:1}}]),vertexShader:Ve.shadow_vert,fragmentShader:Ve.shadow_frag}};Qt.physical={uniforms:$t([Qt.standard.uniforms,{clearcoat:{value:0},clearcoatMap:{value:null},clearcoatMapTransform:{value:new Ue},clearcoatNormalMap:{value:null},clearcoatNormalMapTransform:{value:new Ue},clearcoatNormalScale:{value:new Ge(1,1)},clearcoatRoughness:{value:0},clearcoatRoughnessMap:{value:null},clearcoatRoughnessMapTransform:{value:new Ue},dispersion:{value:0},iridescence:{value:0},iridescenceMap:{value:null},iridescenceMapTransform:{value:new Ue},iridescenceIOR:{value:1.3},iridescenceThicknessMinimum:{value:100},iridescenceThicknessMaximum:{value:400},iridescenceThicknessMap:{value:null},iridescenceThicknessMapTransform:{value:new Ue},sheen:{value:0},sheenColor:{value:new We(0)},sheenColorMap:{value:null},sheenColorMapTransform:{value:new Ue},sheenRoughness:{value:1},sheenRoughnessMap:{value:null},sheenRoughnessMapTransform:{value:new Ue},transmission:{value:0},transmissionMap:{value:null},transmissionMapTransform:{value:new Ue},transmissionSamplerSize:{value:new Ge},transmissionSamplerMap:{value:null},thickness:{value:0},thicknessMap:{value:null},thicknessMapTransform:{value:new Ue},attenuationDistance:{value:0},attenuationColor:{value:new We(0)},specularColor:{value:new We(1,1,1)},specularColorMap:{value:null},specularColorMapTransform:{value:new Ue},specularIntensity:{value:1},specularIntensityMap:{value:null},specularIntensityMapTransform:{value:new Ue},anisotropyVector:{value:new Ge},anisotropyMap:{value:null},anisotropyMapTransform:{value:new Ue}}]),vertexShader:Ve.meshphysical_vert,fragmentShader:Ve.meshphysical_frag};var xl={r:0,b:0,g:0},H0=new at,bf=new Ue;bf.set(-1,0,0,0,1,0,0,0,1);function G0(i,e,t,n,s,r){let o=new We(0),a=s===!0?0:1,l,c,h=null,d=0,u=null;function m(b){let M=b.isScene===!0?b.background:null;if(M&&M.isTexture){let v=b.backgroundBlurriness>0;M=e.get(M,v)}return M}function p(b){let M=!1,v=m(b);v===null?g(o,a):v&&v.isColor&&(g(v,1),M=!0);let A=i.xr.getEnvironmentBlendMode();A==="additive"?t.buffers.color.setClear(0,0,0,1,r):A==="alpha-blend"&&t.buffers.color.setClear(0,0,0,0,r),(i.autoClear||M)&&(t.buffers.depth.setTest(!0),t.buffers.depth.setMask(!0),t.buffers.color.setMask(!0),i.clear(i.autoClearColor,i.autoClearDepth,i.autoClearStencil))}function y(b,M){let v=m(M);v&&(v.isCubeTexture||v.mapping===Ur)?(c===void 0&&(c=new At(new Us(1,1,1),new kt({name:"BackgroundCubeMaterial",uniforms:ss(Qt.backgroundCube.uniforms),vertexShader:Qt.backgroundCube.vertexShader,fragmentShader:Qt.backgroundCube.fragmentShader,side:jt,depthTest:!1,depthWrite:!1,fog:!1,allowOverride:!1})),c.geometry.deleteAttribute("normal"),c.geometry.deleteAttribute("uv"),c.onBeforeRender=function(A,w,E){this.matrixWorld.copyPosition(E.matrixWorld)},Object.defineProperty(c.material,"envMap",{get:function(){return this.uniforms.envMap.value}}),n.update(c)),c.material.uniforms.envMap.value=v,c.material.uniforms.backgroundBlurriness.value=M.backgroundBlurriness,c.material.uniforms.backgroundIntensity.value=M.backgroundIntensity,c.material.uniforms.backgroundRotation.value.setFromMatrix4(H0.makeRotationFromEuler(M.backgroundRotation)).transpose(),v.isCubeTexture&&v.isRenderTargetTexture===!1&&c.material.uniforms.backgroundRotation.value.premultiply(bf),c.material.toneMapped=qe.getTransfer(v.colorSpace)!==Qe,(h!==v||d!==v.version||u!==i.toneMapping)&&(c.material.needsUpdate=!0,h=v,d=v.version,u=i.toneMapping),c.layers.enableAll(),b.unshift(c,c.geometry,c.material,0,0,null)):v&&v.isTexture&&(l===void 0&&(l=new At(new ts(2,2),new kt({name:"BackgroundMaterial",uniforms:ss(Qt.background.uniforms),vertexShader:Qt.background.vertexShader,fragmentShader:Qt.background.fragmentShader,side:ai,depthTest:!1,depthWrite:!1,fog:!1,allowOverride:!1})),l.geometry.deleteAttribute("normal"),Object.defineProperty(l.material,"map",{get:function(){return this.uniforms.t2D.value}}),n.update(l)),l.material.uniforms.t2D.value=v,l.material.uniforms.backgroundIntensity.value=M.backgroundIntensity,l.material.toneMapped=qe.getTransfer(v.colorSpace)!==Qe,v.matrixAutoUpdate===!0&&v.updateMatrix(),l.material.uniforms.uvTransform.value.copy(v.matrix),(h!==v||d!==v.version||u!==i.toneMapping)&&(l.material.needsUpdate=!0,h=v,d=v.version,u=i.toneMapping),l.layers.enableAll(),b.unshift(l,l.geometry,l.material,0,0,null))}function g(b,M){b.getRGB(xl,mh(i)),t.buffers.color.setClear(xl.r,xl.g,xl.b,M,r)}function f(){c!==void 0&&(c.geometry.dispose(),c.material.dispose(),c=void 0),l!==void 0&&(l.geometry.dispose(),l.material.dispose(),l=void 0)}return{getClearColor:function(){return o},setClearColor:function(b,M=1){o.set(b),a=M,g(o,a)},getClearAlpha:function(){return a},setClearAlpha:function(b){a=b,g(o,a)},render:p,addToRenderList:y,dispose:f}}function W0(i,e){let t=i.getParameter(i.MAX_VERTEX_ATTRIBS),n={},s=u(null),r=s,o=!1;function a(R,L,I,V,D){let q=!1,z=d(R,V,I,L);r!==z&&(r=z,c(r.object)),q=m(R,V,I,D),q&&p(R,V,I,D),D!==null&&e.update(D,i.ELEMENT_ARRAY_BUFFER),(q||o)&&(o=!1,v(R,L,I,V),D!==null&&i.bindBuffer(i.ELEMENT_ARRAY_BUFFER,e.get(D).buffer))}function l(){return i.createVertexArray()}function c(R){return i.bindVertexArray(R)}function h(R){return i.deleteVertexArray(R)}function d(R,L,I,V){let D=V.wireframe===!0,q=n[L.id];q===void 0&&(q={},n[L.id]=q);let z=R.isInstancedMesh===!0?R.id:0,K=q[z];K===void 0&&(K={},q[z]=K);let j=K[I.id];j===void 0&&(j={},K[I.id]=j);let se=j[D];return se===void 0&&(se=u(l()),j[D]=se),se}function u(R){let L=[],I=[],V=[];for(let D=0;D<t;D++)L[D]=0,I[D]=0,V[D]=0;return{geometry:null,program:null,wireframe:!1,newAttributes:L,enabledAttributes:I,attributeDivisors:V,object:R,attributes:{},index:null}}function m(R,L,I,V){let D=r.attributes,q=L.attributes,z=0,K=I.getAttributes();for(let j in K)if(K[j].location>=0){let fe=D[j],ve=q[j];if(ve===void 0&&(j==="instanceMatrix"&&R.instanceMatrix&&(ve=R.instanceMatrix),j==="instanceColor"&&R.instanceColor&&(ve=R.instanceColor)),fe===void 0||fe.attribute!==ve||ve&&fe.data!==ve.data)return!0;z++}return r.attributesNum!==z||r.index!==V}function p(R,L,I,V){let D={},q=L.attributes,z=0,K=I.getAttributes();for(let j in K)if(K[j].location>=0){let fe=q[j];fe===void 0&&(j==="instanceMatrix"&&R.instanceMatrix&&(fe=R.instanceMatrix),j==="instanceColor"&&R.instanceColor&&(fe=R.instanceColor));let ve={};ve.attribute=fe,fe&&fe.data&&(ve.data=fe.data),D[j]=ve,z++}r.attributes=D,r.attributesNum=z,r.index=V}function y(){let R=r.newAttributes;for(let L=0,I=R.length;L<I;L++)R[L]=0}function g(R){f(R,0)}function f(R,L){let I=r.newAttributes,V=r.enabledAttributes,D=r.attributeDivisors;I[R]=1,V[R]===0&&(i.enableVertexAttribArray(R),V[R]=1),D[R]!==L&&(i.vertexAttribDivisor(R,L),D[R]=L)}function b(){let R=r.newAttributes,L=r.enabledAttributes;for(let I=0,V=L.length;I<V;I++)L[I]!==R[I]&&(i.disableVertexAttribArray(I),L[I]=0)}function M(R,L,I,V,D,q,z){z===!0?i.vertexAttribIPointer(R,L,I,D,q):i.vertexAttribPointer(R,L,I,V,D,q)}function v(R,L,I,V){y();let D=V.attributes,q=I.getAttributes(),z=L.defaultAttributeValues;for(let K in q){let j=q[K];if(j.location>=0){let se=D[K];if(se===void 0&&(K==="instanceMatrix"&&R.instanceMatrix&&(se=R.instanceMatrix),K==="instanceColor"&&R.instanceColor&&(se=R.instanceColor)),se!==void 0){let fe=se.normalized,ve=se.itemSize,Ze=e.get(se);if(Ze===void 0)continue;let pt=Ze.buffer,Je=Ze.type,Q=Ze.bytesPerElement,ae=Je===i.INT||Je===i.UNSIGNED_INT||se.gpuType===Da;if(se.isInterleavedBufferAttribute){let ne=se.data,De=ne.stride,Oe=se.offset;if(ne.isInstancedInterleavedBuffer){for(let Ce=0;Ce<j.locationSize;Ce++)f(j.location+Ce,ne.meshPerAttribute);R.isInstancedMesh!==!0&&V._maxInstanceCount===void 0&&(V._maxInstanceCount=ne.meshPerAttribute*ne.count)}else for(let Ce=0;Ce<j.locationSize;Ce++)g(j.location+Ce);i.bindBuffer(i.ARRAY_BUFFER,pt);for(let Ce=0;Ce<j.locationSize;Ce++)M(j.location+Ce,ve/j.locationSize,Je,fe,De*Q,(Oe+ve/j.locationSize*Ce)*Q,ae)}else{if(se.isInstancedBufferAttribute){for(let ne=0;ne<j.locationSize;ne++)f(j.location+ne,se.meshPerAttribute);R.isInstancedMesh!==!0&&V._maxInstanceCount===void 0&&(V._maxInstanceCount=se.meshPerAttribute*se.count)}else for(let ne=0;ne<j.locationSize;ne++)g(j.location+ne);i.bindBuffer(i.ARRAY_BUFFER,pt);for(let ne=0;ne<j.locationSize;ne++)M(j.location+ne,ve/j.locationSize,Je,fe,ve*Q,ve/j.locationSize*ne*Q,ae)}}else if(z!==void 0){let fe=z[K];if(fe!==void 0)switch(fe.length){case 2:i.vertexAttrib2fv(j.location,fe);break;case 3:i.vertexAttrib3fv(j.location,fe);break;case 4:i.vertexAttrib4fv(j.location,fe);break;default:i.vertexAttrib1fv(j.location,fe)}}}}b()}function A(){T();for(let R in n){let L=n[R];for(let I in L){let V=L[I];for(let D in V){let q=V[D];for(let z in q)h(q[z].object),delete q[z];delete V[D]}}delete n[R]}}function w(R){if(n[R.id]===void 0)return;let L=n[R.id];for(let I in L){let V=L[I];for(let D in V){let q=V[D];for(let z in q)h(q[z].object),delete q[z];delete V[D]}}delete n[R.id]}function E(R){for(let L in n){let I=n[L];for(let V in I){let D=I[V];if(D[R.id]===void 0)continue;let q=D[R.id];for(let z in q)h(q[z].object),delete q[z];delete D[R.id]}}}function x(R){for(let L in n){let I=n[L],V=R.isInstancedMesh===!0?R.id:0,D=I[V];if(D!==void 0){for(let q in D){let z=D[q];for(let K in z)h(z[K].object),delete z[K];delete D[q]}delete I[V],Object.keys(I).length===0&&delete n[L]}}}function T(){C(),o=!0,r!==s&&(r=s,c(r.object))}function C(){s.geometry=null,s.program=null,s.wireframe=!1}return{setup:a,reset:T,resetDefaultState:C,dispose:A,releaseStatesOfGeometry:w,releaseStatesOfObject:x,releaseStatesOfProgram:E,initAttributes:y,enableAttribute:g,disableUnusedAttributes:b}}function X0(i,e,t){let n;function s(l){n=l}function r(l,c){i.drawArrays(n,l,c),t.update(c,n,1)}function o(l,c,h){h!==0&&(i.drawArraysInstanced(n,l,c,h),t.update(c,n,h))}function a(l,c,h){if(h===0)return;e.get("WEBGL_multi_draw").multiDrawArraysWEBGL(n,l,0,c,0,h);let u=0;for(let m=0;m<h;m++)u+=c[m];t.update(u,n,1)}this.setMode=s,this.render=r,this.renderInstances=o,this.renderMultiDraw=a}function q0(i,e,t,n){let s;function r(){if(s!==void 0)return s;if(e.has("EXT_texture_filter_anisotropic")===!0){let E=e.get("EXT_texture_filter_anisotropic");s=i.getParameter(E.MAX_TEXTURE_MAX_ANISOTROPY_EXT)}else s=0;return s}function o(E){return!(E!==bn&&n.convert(E)!==i.getParameter(i.IMPLEMENTATION_COLOR_READ_FORMAT))}function a(E){let x=E===qn&&(e.has("EXT_color_buffer_half_float")||e.has("EXT_color_buffer_float"));return!(E!==pn&&n.convert(E)!==i.getParameter(i.IMPLEMENTATION_COLOR_READ_TYPE)&&E!==Ln&&!x)}function l(E){if(E==="highp"){if(i.getShaderPrecisionFormat(i.VERTEX_SHADER,i.HIGH_FLOAT).precision>0&&i.getShaderPrecisionFormat(i.FRAGMENT_SHADER,i.HIGH_FLOAT).precision>0)return"highp";E="mediump"}return E==="mediump"&&i.getShaderPrecisionFormat(i.VERTEX_SHADER,i.MEDIUM_FLOAT).precision>0&&i.getShaderPrecisionFormat(i.FRAGMENT_SHADER,i.MEDIUM_FLOAT).precision>0?"mediump":"lowp"}let c=t.precision!==void 0?t.precision:"highp",h=l(c);h!==c&&(Ae("WebGLRenderer:",c,"not supported, using",h,"instead."),c=h);let d=t.logarithmicDepthBuffer===!0,u=t.reversedDepthBuffer===!0&&e.has("EXT_clip_control");t.reversedDepthBuffer===!0&&u===!1&&Ae("WebGLRenderer: Unable to use reversed depth buffer due to missing EXT_clip_control extension. Fallback to default depth buffer.");let m=i.getParameter(i.MAX_TEXTURE_IMAGE_UNITS),p=i.getParameter(i.MAX_VERTEX_TEXTURE_IMAGE_UNITS),y=i.getParameter(i.MAX_TEXTURE_SIZE),g=i.getParameter(i.MAX_CUBE_MAP_TEXTURE_SIZE),f=i.getParameter(i.MAX_VERTEX_ATTRIBS),b=i.getParameter(i.MAX_VERTEX_UNIFORM_VECTORS),M=i.getParameter(i.MAX_VARYING_VECTORS),v=i.getParameter(i.MAX_FRAGMENT_UNIFORM_VECTORS),A=i.getParameter(i.MAX_SAMPLES),w=i.getParameter(i.SAMPLES);return{isWebGL2:!0,getMaxAnisotropy:r,getMaxPrecision:l,textureFormatReadable:o,textureTypeReadable:a,precision:c,logarithmicDepthBuffer:d,reversedDepthBuffer:u,maxTextures:m,maxVertexTextures:p,maxTextureSize:y,maxCubemapSize:g,maxAttributes:f,maxVertexUniforms:b,maxVaryings:M,maxFragmentUniforms:v,maxSamples:A,samples:w}}function Y0(i){let e=this,t=null,n=0,s=!1,r=!1,o=new zn,a=new Ue,l={value:null,needsUpdate:!1};this.uniform=l,this.numPlanes=0,this.numIntersection=0,this.init=function(d,u){let m=d.length!==0||u||n!==0||s;return s=u,n=d.length,m},this.beginShadows=function(){r=!0,h(null)},this.endShadows=function(){r=!1},this.setGlobalState=function(d,u){t=h(d,u,0)},this.setState=function(d,u,m){let p=d.clippingPlanes,y=d.clipIntersection,g=d.clipShadows,f=i.get(d);if(!s||p===null||p.length===0||r&&!g)r?h(null):c();else{let b=r?0:n,M=b*4,v=f.clippingState||null;l.value=v,v=h(p,u,M,m);for(let A=0;A!==M;++A)v[A]=t[A];f.clippingState=v,this.numIntersection=y?this.numPlanes:0,this.numPlanes+=b}};function c(){l.value!==t&&(l.value=t,l.needsUpdate=n>0),e.numPlanes=n,e.numIntersection=0}function h(d,u,m,p){let y=d!==null?d.length:0,g=null;if(y!==0){if(g=l.value,p!==!0||g===null){let f=m+y*4,b=u.matrixWorldInverse;a.getNormalMatrix(b),(g===null||g.length<f)&&(g=new Float32Array(f));for(let M=0,v=m;M!==y;++M,v+=4)o.copy(d[M]).applyMatrix4(b,a),o.normal.toArray(g,v),g[v+3]=o.constant}l.value=g,l.needsUpdate=!0}return e.numPlanes=y,e.numIntersection=0,g}}var Bi=4,Jd=[.125,.215,.35,.446,.526,.582],rs=20,$0=256,Wr=new ns,jd=new We,wh=null,Eh=0,Th=0,Ah=!1,K0=new N,vl=class{constructor(e){this._renderer=e,this._pingPongRenderTarget=null,this._lodMax=0,this._cubeSize=0,this._sizeLods=[],this._sigmas=[],this._lodMeshes=[],this._backgroundBox=null,this._cubemapMaterial=null,this._equirectMaterial=null,this._blurMaterial=null,this._ggxMaterial=null}fromScene(e,t=0,n=.1,s=100,r={}){let{size:o=256,position:a=K0}=r;wh=this._renderer.getRenderTarget(),Eh=this._renderer.getActiveCubeFace(),Th=this._renderer.getActiveMipmapLevel(),Ah=this._renderer.xr.enabled,this._renderer.xr.enabled=!1,this._setSize(o);let l=this._allocateTargets();return l.depthBuffer=!0,this._sceneToCubeUV(e,n,s,l,a),t>0&&this._blur(l,0,0,t),this._applyPMREM(l),this._cleanup(l),l}fromEquirectangular(e,t=null){return this._fromTexture(e,t)}fromCubemap(e,t=null){return this._fromTexture(e,t)}compileCubemapShader(){this._cubemapMaterial===null&&(this._cubemapMaterial=tf(),this._compileMaterial(this._cubemapMaterial))}compileEquirectangularShader(){this._equirectMaterial===null&&(this._equirectMaterial=ef(),this._compileMaterial(this._equirectMaterial))}dispose(){this._dispose(),this._cubemapMaterial!==null&&this._cubemapMaterial.dispose(),this._equirectMaterial!==null&&this._equirectMaterial.dispose(),this._backgroundBox!==null&&(this._backgroundBox.geometry.dispose(),this._backgroundBox.material.dispose())}_setSize(e){this._lodMax=Math.floor(Math.log2(e)),this._cubeSize=Math.pow(2,this._lodMax)}_dispose(){this._blurMaterial!==null&&this._blurMaterial.dispose(),this._ggxMaterial!==null&&this._ggxMaterial.dispose(),this._pingPongRenderTarget!==null&&this._pingPongRenderTarget.dispose();for(let e=0;e<this._lodMeshes.length;e++)this._lodMeshes[e].geometry.dispose()}_cleanup(e){this._renderer.setRenderTarget(wh,Eh,Th),this._renderer.xr.enabled=Ah,e.scissorTest=!1,Vs(e,0,0,e.width,e.height)}_fromTexture(e,t){e.mapping===Fi||e.mapping===is?this._setSize(e.image.length===0?16:e.image[0].width||e.image[0].image.width):this._setSize(e.image.width/4),wh=this._renderer.getRenderTarget(),Eh=this._renderer.getActiveCubeFace(),Th=this._renderer.getActiveMipmapLevel(),Ah=this._renderer.xr.enabled,this._renderer.xr.enabled=!1;let n=t||this._allocateTargets();return this._textureToCubeUV(e,n),this._applyPMREM(n),this._cleanup(n),n}_allocateTargets(){let e=3*Math.max(this._cubeSize,112),t=4*this._cubeSize,n={magFilter:zt,minFilter:zt,generateMipmaps:!1,type:qn,format:bn,colorSpace:lr,depthBuffer:!1},s=Qd(e,t,n);if(this._pingPongRenderTarget===null||this._pingPongRenderTarget.width!==e||this._pingPongRenderTarget.height!==t){this._pingPongRenderTarget!==null&&this._dispose(),this._pingPongRenderTarget=Qd(e,t,n);let{_lodMax:r}=this;({lodMeshes:this._lodMeshes,sizeLods:this._sizeLods,sigmas:this._sigmas}=Z0(r)),this._blurMaterial=j0(r,e,t),this._ggxMaterial=J0(r,e,t)}return s}_compileMaterial(e){let t=new At(new It,e);this._renderer.compile(t,Wr)}_sceneToCubeUV(e,t,n,s,r){let l=new Yt(90,1,t,n),c=[1,-1,1,1,1,1],h=[1,1,1,-1,-1,-1],d=this._renderer,u=d.autoClear,m=d.toneMapping;d.getClearColor(jd),d.toneMapping=Cn,d.autoClear=!1,d.state.buffers.depth.getReversed()&&(d.setRenderTarget(s),d.clearDepth(),d.setRenderTarget(null)),this._backgroundBox===null&&(this._backgroundBox=new At(new Us,new Wn({name:"PMREM.Background",side:jt,depthWrite:!1,depthTest:!1})));let y=this._backgroundBox,g=y.material,f=!1,b=e.background;b?b.isColor&&(g.color.copy(b),e.background=null,f=!0):(g.color.copy(jd),f=!0);for(let M=0;M<6;M++){let v=M%3;v===0?(l.up.set(0,c[M],0),l.position.set(r.x,r.y,r.z),l.lookAt(r.x+h[M],r.y,r.z)):v===1?(l.up.set(0,0,c[M]),l.position.set(r.x,r.y,r.z),l.lookAt(r.x,r.y+h[M],r.z)):(l.up.set(0,c[M],0),l.position.set(r.x,r.y,r.z),l.lookAt(r.x,r.y,r.z+h[M]));let A=this._cubeSize;Vs(s,v*A,M>2?A:0,A,A),d.setRenderTarget(s),f&&d.render(y,l),d.render(e,l)}d.toneMapping=m,d.autoClear=u,e.background=b}_textureToCubeUV(e,t){let n=this._renderer,s=e.mapping===Fi||e.mapping===is;s?(this._cubemapMaterial===null&&(this._cubemapMaterial=tf()),this._cubemapMaterial.uniforms.flipEnvMap.value=e.isRenderTargetTexture===!1?-1:1):this._equirectMaterial===null&&(this._equirectMaterial=ef());let r=s?this._cubemapMaterial:this._equirectMaterial,o=this._lodMeshes[0];o.material=r;let a=r.uniforms;a.envMap.value=e;let l=this._cubeSize;Vs(t,0,0,3*l,2*l),n.setRenderTarget(t),n.render(o,Wr)}_applyPMREM(e){let t=this._renderer,n=t.autoClear;t.autoClear=!1;let s=this._lodMeshes.length;for(let r=1;r<s;r++)this._applyGGXFilter(e,r-1,r);t.autoClear=n}_applyGGXFilter(e,t,n){let s=this._renderer,r=this._pingPongRenderTarget,o=this._ggxMaterial,a=this._lodMeshes[n];a.material=o;let l=o.uniforms,c=n/(this._lodMeshes.length-1),h=t/(this._lodMeshes.length-1),d=Math.sqrt(c*c-h*h),u=0+c*1.25,m=d*u,{_lodMax:p}=this,y=this._sizeLods[n],g=3*y*(n>p-Bi?n-p+Bi:0),f=4*(this._cubeSize-y);l.envMap.value=e.texture,l.roughness.value=m,l.mipInt.value=p-t,Vs(r,g,f,3*y,2*y),s.setRenderTarget(r),s.render(a,Wr),l.envMap.value=r.texture,l.roughness.value=0,l.mipInt.value=p-n,Vs(e,g,f,3*y,2*y),s.setRenderTarget(e),s.render(a,Wr)}_blur(e,t,n,s,r){let o=this._pingPongRenderTarget;this._halfBlur(e,o,t,n,s,"latitudinal",r),this._halfBlur(o,e,n,n,s,"longitudinal",r)}_halfBlur(e,t,n,s,r,o,a){let l=this._renderer,c=this._blurMaterial;o!=="latitudinal"&&o!=="longitudinal"&&Le("blur direction must be either latitudinal or longitudinal!");let h=3,d=this._lodMeshes[s];d.material=c;let u=c.uniforms,m=this._sizeLods[n]-1,p=isFinite(r)?Math.PI/(2*m):2*Math.PI/(2*rs-1),y=r/p,g=isFinite(r)?1+Math.floor(h*y):rs;g>rs&&Ae(`sigmaRadians, ${r}, is too large and will clip, as it requested ${g} samples when the maximum is set to ${rs}`);let f=[],b=0;for(let E=0;E<rs;++E){let x=E/y,T=Math.exp(-x*x/2);f.push(T),E===0?b+=T:E<g&&(b+=2*T)}for(let E=0;E<f.length;E++)f[E]=f[E]/b;u.envMap.value=e.texture,u.samples.value=g,u.weights.value=f,u.latitudinal.value=o==="latitudinal",a&&(u.poleAxis.value=a);let{_lodMax:M}=this;u.dTheta.value=p,u.mipInt.value=M-n;let v=this._sizeLods[s],A=3*v*(s>M-Bi?s-M+Bi:0),w=4*(this._cubeSize-v);Vs(t,A,w,3*v,2*v),l.setRenderTarget(t),l.render(d,Wr)}};function Z0(i){let e=[],t=[],n=[],s=i,r=i-Bi+1+Jd.length;for(let o=0;o<r;o++){let a=Math.pow(2,s);e.push(a);let l=1/a;o>i-Bi?l=Jd[o-i+Bi-1]:o===0&&(l=0),t.push(l);let c=1/(a-2),h=-c,d=1+c,u=[h,h,d,h,d,d,h,h,d,d,h,d],m=6,p=6,y=3,g=2,f=1,b=new Float32Array(y*p*m),M=new Float32Array(g*p*m),v=new Float32Array(f*p*m);for(let w=0;w<m;w++){let E=w%3*2/3-1,x=w>2?0:-1,T=[E,x,0,E+2/3,x,0,E+2/3,x+1,0,E,x,0,E+2/3,x+1,0,E,x+1,0];b.set(T,y*p*w),M.set(u,g*p*w);let C=[w,w,w,w,w,w];v.set(C,f*p*w)}let A=new It;A.setAttribute("position",new sn(b,y)),A.setAttribute("uv",new sn(M,g)),A.setAttribute("faceIndex",new sn(v,f)),n.push(new At(A,null)),s>Bi&&s--}return{lodMeshes:n,sizeLods:e,sigmas:t}}function Qd(i,e,t){let n=new hn(i,e,t);return n.texture.mapping=Ur,n.texture.name="PMREM.cubeUv",n.scissorTest=!0,n}function Vs(i,e,t,n,s){i.viewport.set(e,t,n,s),i.scissor.set(e,t,n,s)}function J0(i,e,t){return new kt({name:"PMREMGGXConvolution",defines:{GGX_SAMPLES:$0,CUBEUV_TEXEL_WIDTH:1/e,CUBEUV_TEXEL_HEIGHT:1/t,CUBEUV_MAX_MIP:`${i}.0`},uniforms:{envMap:{value:null},roughness:{value:0},mipInt:{value:0}},vertexShader:Ml(),fragmentShader:`

			precision highp float;
			precision highp int;

			varying vec3 vOutputDirection;

			uniform sampler2D envMap;
			uniform float roughness;
			uniform float mipInt;

			#define ENVMAP_TYPE_CUBE_UV
			#include <cube_uv_reflection_fragment>

			#define PI 3.14159265359

			// Van der Corput radical inverse
			float radicalInverse_VdC(uint bits) {
				bits = (bits << 16u) | (bits >> 16u);
				bits = ((bits & 0x55555555u) << 1u) | ((bits & 0xAAAAAAAAu) >> 1u);
				bits = ((bits & 0x33333333u) << 2u) | ((bits & 0xCCCCCCCCu) >> 2u);
				bits = ((bits & 0x0F0F0F0Fu) << 4u) | ((bits & 0xF0F0F0F0u) >> 4u);
				bits = ((bits & 0x00FF00FFu) << 8u) | ((bits & 0xFF00FF00u) >> 8u);
				return float(bits) * 2.3283064365386963e-10; // / 0x100000000
			}

			// Hammersley sequence
			vec2 hammersley(uint i, uint N) {
				return vec2(float(i) / float(N), radicalInverse_VdC(i));
			}

			// GGX VNDF importance sampling (Eric Heitz 2018)
			// "Sampling the GGX Distribution of Visible Normals"
			// https://jcgt.org/published/0007/04/01/
			vec3 importanceSampleGGX_VNDF(vec2 Xi, vec3 V, float roughness) {
				float alpha = roughness * roughness;

				// Section 4.1: Orthonormal basis
				vec3 T1 = vec3(1.0, 0.0, 0.0);
				vec3 T2 = cross(V, T1);

				// Section 4.2: Parameterization of projected area
				float r = sqrt(Xi.x);
				float phi = 2.0 * PI * Xi.y;
				float t1 = r * cos(phi);
				float t2 = r * sin(phi);
				float s = 0.5 * (1.0 + V.z);
				t2 = (1.0 - s) * sqrt(1.0 - t1 * t1) + s * t2;

				// Section 4.3: Reprojection onto hemisphere
				vec3 Nh = t1 * T1 + t2 * T2 + sqrt(max(0.0, 1.0 - t1 * t1 - t2 * t2)) * V;

				// Section 3.4: Transform back to ellipsoid configuration
				return normalize(vec3(alpha * Nh.x, alpha * Nh.y, max(0.0, Nh.z)));
			}

			void main() {
				vec3 N = normalize(vOutputDirection);
				vec3 V = N; // Assume view direction equals normal for pre-filtering

				vec3 prefilteredColor = vec3(0.0);
				float totalWeight = 0.0;

				// For very low roughness, just sample the environment directly
				if (roughness < 0.001) {
					gl_FragColor = vec4(bilinearCubeUV(envMap, N, mipInt), 1.0);
					return;
				}

				// Tangent space basis for VNDF sampling
				vec3 up = abs(N.z) < 0.999 ? vec3(0.0, 0.0, 1.0) : vec3(1.0, 0.0, 0.0);
				vec3 tangent = normalize(cross(up, N));
				vec3 bitangent = cross(N, tangent);

				for(uint i = 0u; i < uint(GGX_SAMPLES); i++) {
					vec2 Xi = hammersley(i, uint(GGX_SAMPLES));

					// For PMREM, V = N, so in tangent space V is always (0, 0, 1)
					vec3 H_tangent = importanceSampleGGX_VNDF(Xi, vec3(0.0, 0.0, 1.0), roughness);

					// Transform H back to world space
					vec3 H = normalize(tangent * H_tangent.x + bitangent * H_tangent.y + N * H_tangent.z);
					vec3 L = normalize(2.0 * dot(V, H) * H - V);

					float NdotL = max(dot(N, L), 0.0);

					if(NdotL > 0.0) {
						// Sample environment at fixed mip level
						// VNDF importance sampling handles the distribution filtering
						vec3 sampleColor = bilinearCubeUV(envMap, L, mipInt);

						// Weight by NdotL for the split-sum approximation
						// VNDF PDF naturally accounts for the visible microfacet distribution
						prefilteredColor += sampleColor * NdotL;
						totalWeight += NdotL;
					}
				}

				if (totalWeight > 0.0) {
					prefilteredColor = prefilteredColor / totalWeight;
				}

				gl_FragColor = vec4(prefilteredColor, 1.0);
			}
		`,blending:Xn,depthTest:!1,depthWrite:!1})}function j0(i,e,t){let n=new Float32Array(rs),s=new N(0,1,0);return new kt({name:"SphericalGaussianBlur",defines:{n:rs,CUBEUV_TEXEL_WIDTH:1/e,CUBEUV_TEXEL_HEIGHT:1/t,CUBEUV_MAX_MIP:`${i}.0`},uniforms:{envMap:{value:null},samples:{value:1},weights:{value:n},latitudinal:{value:!1},dTheta:{value:0},mipInt:{value:0},poleAxis:{value:s}},vertexShader:Ml(),fragmentShader:`

			precision mediump float;
			precision mediump int;

			varying vec3 vOutputDirection;

			uniform sampler2D envMap;
			uniform int samples;
			uniform float weights[ n ];
			uniform bool latitudinal;
			uniform float dTheta;
			uniform float mipInt;
			uniform vec3 poleAxis;

			#define ENVMAP_TYPE_CUBE_UV
			#include <cube_uv_reflection_fragment>

			vec3 getSample( float theta, vec3 axis ) {

				float cosTheta = cos( theta );
				// Rodrigues' axis-angle rotation
				vec3 sampleDirection = vOutputDirection * cosTheta
					+ cross( axis, vOutputDirection ) * sin( theta )
					+ axis * dot( axis, vOutputDirection ) * ( 1.0 - cosTheta );

				return bilinearCubeUV( envMap, sampleDirection, mipInt );

			}

			void main() {

				vec3 axis = latitudinal ? poleAxis : cross( poleAxis, vOutputDirection );

				if ( all( equal( axis, vec3( 0.0 ) ) ) ) {

					axis = vec3( vOutputDirection.z, 0.0, - vOutputDirection.x );

				}

				axis = normalize( axis );

				gl_FragColor = vec4( 0.0, 0.0, 0.0, 1.0 );
				gl_FragColor.rgb += weights[ 0 ] * getSample( 0.0, axis );

				for ( int i = 1; i < n; i++ ) {

					if ( i >= samples ) {

						break;

					}

					float theta = dTheta * float( i );
					gl_FragColor.rgb += weights[ i ] * getSample( -1.0 * theta, axis );
					gl_FragColor.rgb += weights[ i ] * getSample( theta, axis );

				}

			}
		`,blending:Xn,depthTest:!1,depthWrite:!1})}function ef(){return new kt({name:"EquirectangularToCubeUV",uniforms:{envMap:{value:null}},vertexShader:Ml(),fragmentShader:`

			precision mediump float;
			precision mediump int;

			varying vec3 vOutputDirection;

			uniform sampler2D envMap;

			#include <common>

			void main() {

				vec3 outputDirection = normalize( vOutputDirection );
				vec2 uv = equirectUv( outputDirection );

				gl_FragColor = vec4( texture2D ( envMap, uv ).rgb, 1.0 );

			}
		`,blending:Xn,depthTest:!1,depthWrite:!1})}function tf(){return new kt({name:"CubemapToCubeUV",uniforms:{envMap:{value:null},flipEnvMap:{value:-1}},vertexShader:Ml(),fragmentShader:`

			precision mediump float;
			precision mediump int;

			uniform float flipEnvMap;

			varying vec3 vOutputDirection;

			uniform samplerCube envMap;

			void main() {

				gl_FragColor = textureCube( envMap, vec3( flipEnvMap * vOutputDirection.x, vOutputDirection.yz ) );

			}
		`,blending:Xn,depthTest:!1,depthWrite:!1})}function Ml(){return`

		precision mediump float;
		precision mediump int;

		attribute float faceIndex;

		varying vec3 vOutputDirection;

		// RH coordinate system; PMREM face-indexing convention
		vec3 getDirection( vec2 uv, float face ) {

			uv = 2.0 * uv - 1.0;

			vec3 direction = vec3( uv, 1.0 );

			if ( face == 0.0 ) {

				direction = direction.zyx; // ( 1, v, u ) pos x

			} else if ( face == 1.0 ) {

				direction = direction.xzy;
				direction.xz *= -1.0; // ( -u, 1, -v ) pos y

			} else if ( face == 2.0 ) {

				direction.x *= -1.0; // ( -u, v, 1 ) pos z

			} else if ( face == 3.0 ) {

				direction = direction.zyx;
				direction.xz *= -1.0; // ( -1, v, -u ) neg x

			} else if ( face == 4.0 ) {

				direction = direction.xzy;
				direction.xy *= -1.0; // ( -u, -1, v ) neg y

			} else if ( face == 5.0 ) {

				direction.z *= -1.0; // ( u, v, -1 ) neg z

			}

			return direction;

		}

		void main() {

			vOutputDirection = getDirection( uv, faceIndex );
			gl_Position = vec4( position, 1.0 );

		}
	`}var _l=class extends hn{constructor(e=1,t={}){super(e,e,t),this.isWebGLCubeRenderTarget=!0;let n={width:e,height:e,depth:1},s=[n,n,n,n,n,n];this.texture=new br(s),this._setTextureOptions(t),this.texture.isRenderTargetTexture=!0}fromEquirectangularTexture(e,t){this.texture.type=t.type,this.texture.colorSpace=t.colorSpace,this.texture.generateMipmaps=t.generateMipmaps,this.texture.minFilter=t.minFilter,this.texture.magFilter=t.magFilter;let n={uniforms:{tEquirect:{value:null}},vertexShader:`

				varying vec3 vWorldDirection;

				vec3 transformDirection( in vec3 dir, in mat4 matrix ) {

					return normalize( ( matrix * vec4( dir, 0.0 ) ).xyz );

				}

				void main() {

					vWorldDirection = transformDirection( position, modelMatrix );

					#include <begin_vertex>
					#include <project_vertex>

				}
			`,fragmentShader:`

				uniform sampler2D tEquirect;

				varying vec3 vWorldDirection;

				#include <common>

				void main() {

					vec3 direction = normalize( vWorldDirection );

					vec2 sampleUV = equirectUv( direction );

					gl_FragColor = texture2D( tEquirect, sampleUV );

				}
			`},s=new Us(5,5,5),r=new kt({name:"CubemapFromEquirect",uniforms:ss(n.uniforms),vertexShader:n.vertexShader,fragmentShader:n.fragmentShader,side:jt,blending:Xn});r.uniforms.tEquirect.value=t;let o=new At(s,r),a=t.minFilter;return t.minFilter===Ui&&(t.minFilter=zt),new Ta(1,10,this).update(e,o),t.minFilter=a,o.geometry.dispose(),o.material.dispose(),this}clear(e,t=!0,n=!0,s=!0){let r=e.getRenderTarget();for(let o=0;o<6;o++)e.setRenderTarget(this,o),e.clear(t,n,s);e.setRenderTarget(r)}};function Q0(i){let e=new WeakMap,t=new WeakMap,n=null;function s(u,m=!1){return u==null?null:m?o(u):r(u)}function r(u){if(u&&u.isTexture){let m=u.mapping;if(m===Ca||m===Ia)if(e.has(u)){let p=e.get(u).texture;return a(p,u.mapping)}else{let p=u.image;if(p&&p.height>0){let y=new _l(p.height);return y.fromEquirectangularTexture(i,u),e.set(u,y),u.addEventListener("dispose",c),a(y.texture,u.mapping)}else return null}}return u}function o(u){if(u&&u.isTexture){let m=u.mapping,p=m===Ca||m===Ia,y=m===Fi||m===is;if(p||y){let g=t.get(u),f=g!==void 0?g.texture.pmremVersion:0;if(u.isRenderTargetTexture&&u.pmremVersion!==f)return n===null&&(n=new vl(i)),g=p?n.fromEquirectangular(u,g):n.fromCubemap(u,g),g.texture.pmremVersion=u.pmremVersion,t.set(u,g),g.texture;if(g!==void 0)return g.texture;{let b=u.image;return p&&b&&b.height>0||y&&b&&l(b)?(n===null&&(n=new vl(i)),g=p?n.fromEquirectangular(u):n.fromCubemap(u),g.texture.pmremVersion=u.pmremVersion,t.set(u,g),u.addEventListener("dispose",h),g.texture):null}}}return u}function a(u,m){return m===Ca?u.mapping=Fi:m===Ia&&(u.mapping=is),u}function l(u){let m=0,p=6;for(let y=0;y<p;y++)u[y]!==void 0&&m++;return m===p}function c(u){let m=u.target;m.removeEventListener("dispose",c);let p=e.get(m);p!==void 0&&(e.delete(m),p.dispose())}function h(u){let m=u.target;m.removeEventListener("dispose",h);let p=t.get(m);p!==void 0&&(t.delete(m),p.dispose())}function d(){e=new WeakMap,t=new WeakMap,n!==null&&(n.dispose(),n=null)}return{get:s,dispose:d}}function ey(i){let e={};function t(n){if(e[n]!==void 0)return e[n];let s=i.getExtension(n);return e[n]=s,s}return{has:function(n){return t(n)!==null},init:function(){t("EXT_color_buffer_float"),t("WEBGL_clip_cull_distance"),t("OES_texture_float_linear"),t("EXT_color_buffer_half_float"),t("WEBGL_multisampled_render_to_texture"),t("WEBGL_render_shared_exponent")},get:function(n){let s=t(n);return s===null&&Ji("WebGLRenderer: "+n+" extension not supported."),s}}}function ty(i,e,t,n){let s={},r=new WeakMap;function o(d){let u=d.target;u.index!==null&&e.remove(u.index);for(let p in u.attributes)e.remove(u.attributes[p]);u.removeEventListener("dispose",o),delete s[u.id];let m=r.get(u);m&&(e.remove(m),r.delete(u)),n.releaseStatesOfGeometry(u),u.isInstancedBufferGeometry===!0&&delete u._maxInstanceCount,t.memory.geometries--}function a(d,u){return s[u.id]===!0||(u.addEventListener("dispose",o),s[u.id]=!0,t.memory.geometries++),u}function l(d){let u=d.attributes;for(let m in u)e.update(u[m],i.ARRAY_BUFFER)}function c(d){let u=[],m=d.index,p=d.attributes.position,y=0;if(p===void 0)return;if(m!==null){let b=m.array;y=m.version;for(let M=0,v=b.length;M<v;M+=3){let A=b[M+0],w=b[M+1],E=b[M+2];u.push(A,w,w,E,E,A)}}else{let b=p.array;y=p.version;for(let M=0,v=b.length/3-1;M<v;M+=3){let A=M+0,w=M+1,E=M+2;u.push(A,w,w,E,E,A)}}let g=new(p.count>=65535?xr:gr)(u,1);g.version=y;let f=r.get(d);f&&e.remove(f),r.set(d,g)}function h(d){let u=r.get(d);if(u){let m=d.index;m!==null&&u.version<m.version&&c(d)}else c(d);return r.get(d)}return{get:a,update:l,getWireframeAttribute:h}}function ny(i,e,t){let n;function s(d){n=d}let r,o;function a(d){r=d.type,o=d.bytesPerElement}function l(d,u){i.drawElements(n,u,r,d*o),t.update(u,n,1)}function c(d,u,m){m!==0&&(i.drawElementsInstanced(n,u,r,d*o,m),t.update(u,n,m))}function h(d,u,m){if(m===0)return;e.get("WEBGL_multi_draw").multiDrawElementsWEBGL(n,u,0,r,d,0,m);let y=0;for(let g=0;g<m;g++)y+=u[g];t.update(y,n,1)}this.setMode=s,this.setIndex=a,this.render=l,this.renderInstances=c,this.renderMultiDraw=h}function iy(i){let e={geometries:0,textures:0},t={frame:0,calls:0,triangles:0,points:0,lines:0};function n(r,o,a){switch(t.calls++,o){case i.TRIANGLES:t.triangles+=a*(r/3);break;case i.LINES:t.lines+=a*(r/2);break;case i.LINE_STRIP:t.lines+=a*(r-1);break;case i.LINE_LOOP:t.lines+=a*r;break;case i.POINTS:t.points+=a*r;break;default:Le("WebGLInfo: Unknown draw mode:",o);break}}function s(){t.calls=0,t.triangles=0,t.points=0,t.lines=0}return{memory:e,render:t,programs:null,autoReset:!0,reset:s,update:n}}function sy(i,e,t){let n=new WeakMap,s=new nt;function r(o,a,l){let c=o.morphTargetInfluences,h=a.morphAttributes.position||a.morphAttributes.normal||a.morphAttributes.color,d=h!==void 0?h.length:0,u=n.get(a);if(u===void 0||u.count!==d){let C=function(){x.dispose(),n.delete(a),a.removeEventListener("dispose",C)};var m=C;u!==void 0&&u.texture.dispose();let p=a.morphAttributes.position!==void 0,y=a.morphAttributes.normal!==void 0,g=a.morphAttributes.color!==void 0,f=a.morphAttributes.position||[],b=a.morphAttributes.normal||[],M=a.morphAttributes.color||[],v=0;p===!0&&(v=1),y===!0&&(v=2),g===!0&&(v=3);let A=a.attributes.position.count*v,w=1;A>e.maxTextureSize&&(w=Math.ceil(A/e.maxTextureSize),A=e.maxTextureSize);let E=new Float32Array(A*w*4*d),x=new fr(E,A,w,d);x.type=Ln,x.needsUpdate=!0;let T=v*4;for(let R=0;R<d;R++){let L=f[R],I=b[R],V=M[R],D=A*w*4*R;for(let q=0;q<L.count;q++){let z=q*T;p===!0&&(s.fromBufferAttribute(L,q),E[D+z+0]=s.x,E[D+z+1]=s.y,E[D+z+2]=s.z,E[D+z+3]=0),y===!0&&(s.fromBufferAttribute(I,q),E[D+z+4]=s.x,E[D+z+5]=s.y,E[D+z+6]=s.z,E[D+z+7]=0),g===!0&&(s.fromBufferAttribute(V,q),E[D+z+8]=s.x,E[D+z+9]=s.y,E[D+z+10]=s.z,E[D+z+11]=V.itemSize===4?s.w:1)}}u={count:d,texture:x,size:new Ge(A,w)},n.set(a,u),a.addEventListener("dispose",C)}if(o.isInstancedMesh===!0&&o.morphTexture!==null)l.getUniforms().setValue(i,"morphTexture",o.morphTexture,t);else{let p=0;for(let g=0;g<c.length;g++)p+=c[g];let y=a.morphTargetsRelative?1:1-p;l.getUniforms().setValue(i,"morphTargetBaseInfluence",y),l.getUniforms().setValue(i,"morphTargetInfluences",c)}l.getUniforms().setValue(i,"morphTargetsTexture",u.texture,t),l.getUniforms().setValue(i,"morphTargetsTextureSize",u.size)}return{update:r}}function ry(i,e,t,n,s){let r=new WeakMap;function o(c){let h=s.render.frame,d=c.geometry,u=e.get(c,d);if(r.get(u)!==h&&(e.update(u),r.set(u,h)),c.isInstancedMesh&&(c.hasEventListener("dispose",l)===!1&&c.addEventListener("dispose",l),r.get(c)!==h&&(t.update(c.instanceMatrix,i.ARRAY_BUFFER),c.instanceColor!==null&&t.update(c.instanceColor,i.ARRAY_BUFFER),r.set(c,h))),c.isSkinnedMesh){let m=c.skeleton;r.get(m)!==h&&(m.update(),r.set(m,h))}return u}function a(){r=new WeakMap}function l(c){let h=c.target;h.removeEventListener("dispose",l),n.releaseStatesOfObject(h),t.remove(h.instanceMatrix),h.instanceColor!==null&&t.remove(h.instanceColor)}return{update:o,dispose:a}}var oy={[Zc]:"LINEAR_TONE_MAPPING",[Jc]:"REINHARD_TONE_MAPPING",[jc]:"CINEON_TONE_MAPPING",[Qc]:"ACES_FILMIC_TONE_MAPPING",[th]:"AGX_TONE_MAPPING",[nh]:"NEUTRAL_TONE_MAPPING",[eh]:"CUSTOM_TONE_MAPPING"};function ay(i,e,t,n,s,r){let o=new hn(e,t,{type:i,depthBuffer:s,stencilBuffer:r,samples:n?4:0,depthTexture:s?new li(e,t):void 0}),a=new hn(e,t,{type:qn,depthBuffer:!1,stencilBuffer:!1}),l=new It;l.setAttribute("position",new lt([-1,3,0,-1,-1,0,3,-1,0],3)),l.setAttribute("uv",new lt([0,2,0,0,2,0],2));let c=new fa({uniforms:{tDiffuse:{value:null}},vertexShader:`
			precision highp float;

			uniform mat4 modelViewMatrix;
			uniform mat4 projectionMatrix;

			attribute vec3 position;
			attribute vec2 uv;

			varying vec2 vUv;

			void main() {
				vUv = uv;
				gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
			}`,fragmentShader:`
			precision highp float;

			uniform sampler2D tDiffuse;

			varying vec2 vUv;

			#include <tonemapping_pars_fragment>
			#include <colorspace_pars_fragment>

			void main() {
				gl_FragColor = texture2D( tDiffuse, vUv );

				#ifdef LINEAR_TONE_MAPPING
					gl_FragColor.rgb = LinearToneMapping( gl_FragColor.rgb );
				#elif defined( REINHARD_TONE_MAPPING )
					gl_FragColor.rgb = ReinhardToneMapping( gl_FragColor.rgb );
				#elif defined( CINEON_TONE_MAPPING )
					gl_FragColor.rgb = CineonToneMapping( gl_FragColor.rgb );
				#elif defined( ACES_FILMIC_TONE_MAPPING )
					gl_FragColor.rgb = ACESFilmicToneMapping( gl_FragColor.rgb );
				#elif defined( AGX_TONE_MAPPING )
					gl_FragColor.rgb = AgXToneMapping( gl_FragColor.rgb );
				#elif defined( NEUTRAL_TONE_MAPPING )
					gl_FragColor.rgb = NeutralToneMapping( gl_FragColor.rgb );
				#elif defined( CUSTOM_TONE_MAPPING )
					gl_FragColor.rgb = CustomToneMapping( gl_FragColor.rgb );
				#endif

				#ifdef SRGB_TRANSFER
					gl_FragColor = sRGBTransferOETF( gl_FragColor );
				#endif
			}`,depthTest:!1,depthWrite:!1}),h=new At(l,c),d=new ns(-1,1,1,-1,0,1),u=null,m=null,p=!1,y,g=null,f=[],b=!1;this.setSize=function(M,v){o.setSize(M,v),a.setSize(M,v);for(let A=0;A<f.length;A++){let w=f[A];w.setSize&&w.setSize(M,v)}},this.setEffects=function(M){f=M,b=f.length>0&&f[0].isRenderPass===!0;let v=o.width,A=o.height;for(let w=0;w<f.length;w++){let E=f[w];E.setSize&&E.setSize(v,A)}},this.begin=function(M,v){if(p||M.toneMapping===Cn&&f.length===0)return!1;if(g=v,v!==null){let A=v.width,w=v.height;(o.width!==A||o.height!==w)&&this.setSize(A,w)}return b===!1&&M.setRenderTarget(o),y=M.toneMapping,M.toneMapping=Cn,!0},this.hasRenderPass=function(){return b},this.end=function(M,v){M.toneMapping=y,p=!0;let A=o,w=a;for(let E=0;E<f.length;E++){let x=f[E];if(x.enabled!==!1&&(x.render(M,w,A,v),x.needsSwap!==!1)){let T=A;A=w,w=T}}if(u!==M.outputColorSpace||m!==M.toneMapping){u=M.outputColorSpace,m=M.toneMapping,c.defines={},qe.getTransfer(u)===Qe&&(c.defines.SRGB_TRANSFER="");let E=oy[m];E&&(c.defines[E]=""),c.needsUpdate=!0}c.uniforms.tDiffuse.value=A.texture,M.setRenderTarget(g),M.render(h,d),g=null,p=!1},this.isCompositing=function(){return p},this.dispose=function(){o.depthTexture&&o.depthTexture.dispose(),o.dispose(),a.dispose(),l.dispose(),c.dispose()}}var Mf=new Jt,Ch=new li(1,1),Sf=new fr,wf=new aa,Ef=new br,nf=[],sf=[],rf=new Float32Array(16),of=new Float32Array(9),af=new Float32Array(4);function Gs(i,e,t){let n=i[0];if(n<=0||n>0)return i;let s=e*t,r=nf[s];if(r===void 0&&(r=new Float32Array(s),nf[s]=r),e!==0){n.toArray(r,0);for(let o=1,a=0;o!==e;++o)a+=t,i[o].toArray(r,a)}return r}function Lt(i,e){if(i.length!==e.length)return!1;for(let t=0,n=i.length;t<n;t++)if(i[t]!==e[t])return!1;return!0}function Dt(i,e){for(let t=0,n=e.length;t<n;t++)i[t]=e[t]}function Sl(i,e){let t=sf[e];t===void 0&&(t=new Int32Array(e),sf[e]=t);for(let n=0;n!==e;++n)t[n]=i.allocateTextureUnit();return t}function ly(i,e){let t=this.cache;t[0]!==e&&(i.uniform1f(this.addr,e),t[0]=e)}function cy(i,e){let t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y)&&(i.uniform2f(this.addr,e.x,e.y),t[0]=e.x,t[1]=e.y);else{if(Lt(t,e))return;i.uniform2fv(this.addr,e),Dt(t,e)}}function hy(i,e){let t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z)&&(i.uniform3f(this.addr,e.x,e.y,e.z),t[0]=e.x,t[1]=e.y,t[2]=e.z);else if(e.r!==void 0)(t[0]!==e.r||t[1]!==e.g||t[2]!==e.b)&&(i.uniform3f(this.addr,e.r,e.g,e.b),t[0]=e.r,t[1]=e.g,t[2]=e.b);else{if(Lt(t,e))return;i.uniform3fv(this.addr,e),Dt(t,e)}}function uy(i,e){let t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z||t[3]!==e.w)&&(i.uniform4f(this.addr,e.x,e.y,e.z,e.w),t[0]=e.x,t[1]=e.y,t[2]=e.z,t[3]=e.w);else{if(Lt(t,e))return;i.uniform4fv(this.addr,e),Dt(t,e)}}function dy(i,e){let t=this.cache,n=e.elements;if(n===void 0){if(Lt(t,e))return;i.uniformMatrix2fv(this.addr,!1,e),Dt(t,e)}else{if(Lt(t,n))return;af.set(n),i.uniformMatrix2fv(this.addr,!1,af),Dt(t,n)}}function fy(i,e){let t=this.cache,n=e.elements;if(n===void 0){if(Lt(t,e))return;i.uniformMatrix3fv(this.addr,!1,e),Dt(t,e)}else{if(Lt(t,n))return;of.set(n),i.uniformMatrix3fv(this.addr,!1,of),Dt(t,n)}}function py(i,e){let t=this.cache,n=e.elements;if(n===void 0){if(Lt(t,e))return;i.uniformMatrix4fv(this.addr,!1,e),Dt(t,e)}else{if(Lt(t,n))return;rf.set(n),i.uniformMatrix4fv(this.addr,!1,rf),Dt(t,n)}}function my(i,e){let t=this.cache;t[0]!==e&&(i.uniform1i(this.addr,e),t[0]=e)}function gy(i,e){let t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y)&&(i.uniform2i(this.addr,e.x,e.y),t[0]=e.x,t[1]=e.y);else{if(Lt(t,e))return;i.uniform2iv(this.addr,e),Dt(t,e)}}function xy(i,e){let t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z)&&(i.uniform3i(this.addr,e.x,e.y,e.z),t[0]=e.x,t[1]=e.y,t[2]=e.z);else{if(Lt(t,e))return;i.uniform3iv(this.addr,e),Dt(t,e)}}function yy(i,e){let t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z||t[3]!==e.w)&&(i.uniform4i(this.addr,e.x,e.y,e.z,e.w),t[0]=e.x,t[1]=e.y,t[2]=e.z,t[3]=e.w);else{if(Lt(t,e))return;i.uniform4iv(this.addr,e),Dt(t,e)}}function vy(i,e){let t=this.cache;t[0]!==e&&(i.uniform1ui(this.addr,e),t[0]=e)}function _y(i,e){let t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y)&&(i.uniform2ui(this.addr,e.x,e.y),t[0]=e.x,t[1]=e.y);else{if(Lt(t,e))return;i.uniform2uiv(this.addr,e),Dt(t,e)}}function by(i,e){let t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z)&&(i.uniform3ui(this.addr,e.x,e.y,e.z),t[0]=e.x,t[1]=e.y,t[2]=e.z);else{if(Lt(t,e))return;i.uniform3uiv(this.addr,e),Dt(t,e)}}function My(i,e){let t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z||t[3]!==e.w)&&(i.uniform4ui(this.addr,e.x,e.y,e.z,e.w),t[0]=e.x,t[1]=e.y,t[2]=e.z,t[3]=e.w);else{if(Lt(t,e))return;i.uniform4uiv(this.addr,e),Dt(t,e)}}function Sy(i,e,t){let n=this.cache,s=t.allocateTextureUnit();n[0]!==s&&(i.uniform1i(this.addr,s),n[0]=s);let r;this.type===i.SAMPLER_2D_SHADOW?(Ch.compareFunction=t.isReversedDepthBuffer()?gl:ml,r=Ch):r=Mf,t.setTexture2D(e||r,s)}function wy(i,e,t){let n=this.cache,s=t.allocateTextureUnit();n[0]!==s&&(i.uniform1i(this.addr,s),n[0]=s),t.setTexture3D(e||wf,s)}function Ey(i,e,t){let n=this.cache,s=t.allocateTextureUnit();n[0]!==s&&(i.uniform1i(this.addr,s),n[0]=s),t.setTextureCube(e||Ef,s)}function Ty(i,e,t){let n=this.cache,s=t.allocateTextureUnit();n[0]!==s&&(i.uniform1i(this.addr,s),n[0]=s),t.setTexture2DArray(e||Sf,s)}function Ay(i){switch(i){case 5126:return ly;case 35664:return cy;case 35665:return hy;case 35666:return uy;case 35674:return dy;case 35675:return fy;case 35676:return py;case 5124:case 35670:return my;case 35667:case 35671:return gy;case 35668:case 35672:return xy;case 35669:case 35673:return yy;case 5125:return vy;case 36294:return _y;case 36295:return by;case 36296:return My;case 35678:case 36198:case 36298:case 36306:case 35682:return Sy;case 35679:case 36299:case 36307:return wy;case 35680:case 36300:case 36308:case 36293:return Ey;case 36289:case 36303:case 36311:case 36292:return Ty}}function Py(i,e){i.uniform1fv(this.addr,e)}function Ry(i,e){let t=Gs(e,this.size,2);i.uniform2fv(this.addr,t)}function Cy(i,e){let t=Gs(e,this.size,3);i.uniform3fv(this.addr,t)}function Iy(i,e){let t=Gs(e,this.size,4);i.uniform4fv(this.addr,t)}function Ly(i,e){let t=Gs(e,this.size,4);i.uniformMatrix2fv(this.addr,!1,t)}function Dy(i,e){let t=Gs(e,this.size,9);i.uniformMatrix3fv(this.addr,!1,t)}function Fy(i,e){let t=Gs(e,this.size,16);i.uniformMatrix4fv(this.addr,!1,t)}function Uy(i,e){i.uniform1iv(this.addr,e)}function Ny(i,e){i.uniform2iv(this.addr,e)}function Oy(i,e){i.uniform3iv(this.addr,e)}function By(i,e){i.uniform4iv(this.addr,e)}function zy(i,e){i.uniform1uiv(this.addr,e)}function ky(i,e){i.uniform2uiv(this.addr,e)}function Vy(i,e){i.uniform3uiv(this.addr,e)}function Hy(i,e){i.uniform4uiv(this.addr,e)}function Gy(i,e,t){let n=this.cache,s=e.length,r=Sl(t,s);Lt(n,r)||(i.uniform1iv(this.addr,r),Dt(n,r));let o;this.type===i.SAMPLER_2D_SHADOW?o=Ch:o=Mf;for(let a=0;a!==s;++a)t.setTexture2D(e[a]||o,r[a])}function Wy(i,e,t){let n=this.cache,s=e.length,r=Sl(t,s);Lt(n,r)||(i.uniform1iv(this.addr,r),Dt(n,r));for(let o=0;o!==s;++o)t.setTexture3D(e[o]||wf,r[o])}function Xy(i,e,t){let n=this.cache,s=e.length,r=Sl(t,s);Lt(n,r)||(i.uniform1iv(this.addr,r),Dt(n,r));for(let o=0;o!==s;++o)t.setTextureCube(e[o]||Ef,r[o])}function qy(i,e,t){let n=this.cache,s=e.length,r=Sl(t,s);Lt(n,r)||(i.uniform1iv(this.addr,r),Dt(n,r));for(let o=0;o!==s;++o)t.setTexture2DArray(e[o]||Sf,r[o])}function Yy(i){switch(i){case 5126:return Py;case 35664:return Ry;case 35665:return Cy;case 35666:return Iy;case 35674:return Ly;case 35675:return Dy;case 35676:return Fy;case 5124:case 35670:return Uy;case 35667:case 35671:return Ny;case 35668:case 35672:return Oy;case 35669:case 35673:return By;case 5125:return zy;case 36294:return ky;case 36295:return Vy;case 36296:return Hy;case 35678:case 36198:case 36298:case 36306:case 35682:return Gy;case 35679:case 36299:case 36307:return Wy;case 35680:case 36300:case 36308:case 36293:return Xy;case 36289:case 36303:case 36311:case 36292:return qy}}var Ih=class{constructor(e,t,n){this.id=e,this.addr=n,this.cache=[],this.type=t.type,this.setValue=Ay(t.type)}},Lh=class{constructor(e,t,n){this.id=e,this.addr=n,this.cache=[],this.type=t.type,this.size=t.size,this.setValue=Yy(t.type)}},Dh=class{constructor(e){this.id=e,this.seq=[],this.map={}}setValue(e,t,n){let s=this.seq;for(let r=0,o=s.length;r!==o;++r){let a=s[r];a.setValue(e,t[a.id],n)}}},Ph=/(\w+)(\])?(\[|\.)?/g;function lf(i,e){i.seq.push(e),i.map[e.id]=e}function $y(i,e,t){let n=i.name,s=n.length;for(Ph.lastIndex=0;;){let r=Ph.exec(n),o=Ph.lastIndex,a=r[1],l=r[2]==="]",c=r[3];if(l&&(a=a|0),c===void 0||c==="["&&o+2===s){lf(t,c===void 0?new Ih(a,i,e):new Lh(a,i,e));break}else{let d=t.map[a];d===void 0&&(d=new Dh(a),lf(t,d)),t=d}}}var Hs=class{constructor(e,t){this.seq=[],this.map={};let n=e.getProgramParameter(t,e.ACTIVE_UNIFORMS);for(let o=0;o<n;++o){let a=e.getActiveUniform(t,o),l=e.getUniformLocation(t,a.name);$y(a,l,this)}let s=[],r=[];for(let o of this.seq)o.type===e.SAMPLER_2D_SHADOW||o.type===e.SAMPLER_CUBE_SHADOW||o.type===e.SAMPLER_2D_ARRAY_SHADOW?s.push(o):r.push(o);s.length>0&&(this.seq=s.concat(r))}setValue(e,t,n,s){let r=this.map[t];r!==void 0&&r.setValue(e,n,s)}setOptional(e,t,n){let s=t[n];s!==void 0&&this.setValue(e,n,s)}static upload(e,t,n,s){for(let r=0,o=t.length;r!==o;++r){let a=t[r],l=n[a.id];l.needsUpdate!==!1&&a.setValue(e,l.value,s)}}static seqWithValue(e,t){let n=[];for(let s=0,r=e.length;s!==r;++s){let o=e[s];o.id in t&&n.push(o)}return n}};function cf(i,e,t){let n=i.createShader(e);return i.shaderSource(n,t),i.compileShader(n),n}var Ky=37297,Zy=0;function Jy(i,e){let t=i.split(`
`),n=[],s=Math.max(e-6,0),r=Math.min(e+6,t.length);for(let o=s;o<r;o++){let a=o+1;n.push(`${a===e?">":" "} ${a}: ${t[o]}`)}return n.join(`
`)}var hf=new Ue;function jy(i){qe._getMatrix(hf,qe.workingColorSpace,i);let e=`mat3( ${hf.elements.map(t=>t.toFixed(4))} )`;switch(qe.getTransfer(i)){case cr:return[e,"LinearTransferOETF"];case Qe:return[e,"sRGBTransferOETF"];default:return Ae("WebGLProgram: Unsupported color space: ",i),[e,"LinearTransferOETF"]}}function uf(i,e,t){let n=i.getShaderParameter(e,i.COMPILE_STATUS),r=(i.getShaderInfoLog(e)||"").trim();if(n&&r==="")return"";let o=/ERROR: 0:(\d+)/.exec(r);if(o){let a=parseInt(o[1]);return t.toUpperCase()+`

`+r+`

`+Jy(i.getShaderSource(e),a)}else return r}function Qy(i,e){let t=jy(e);return[`vec4 ${i}( vec4 value ) {`,`	return ${t[1]}( vec4( value.rgb * ${t[0]}, value.a ) );`,"}"].join(`
`)}var ev={[Zc]:"Linear",[Jc]:"Reinhard",[jc]:"Cineon",[Qc]:"ACESFilmic",[th]:"AgX",[nh]:"Neutral",[eh]:"Custom"};function tv(i,e){let t=ev[e];return t===void 0?(Ae("WebGLProgram: Unsupported toneMapping:",e),"vec3 "+i+"( vec3 color ) { return LinearToneMapping( color ); }"):"vec3 "+i+"( vec3 color ) { return "+t+"ToneMapping( color ); }"}var yl=new N;function nv(){qe.getLuminanceCoefficients(yl);let i=yl.x.toFixed(4),e=yl.y.toFixed(4),t=yl.z.toFixed(4);return["float luminance( const in vec3 rgb ) {",`	const vec3 weights = vec3( ${i}, ${e}, ${t} );`,"	return dot( weights, rgb );","}"].join(`
`)}function iv(i){return[i.extensionClipCullDistance?"#extension GL_ANGLE_clip_cull_distance : require":"",i.extensionMultiDraw?"#extension GL_ANGLE_multi_draw : require":""].filter(qr).join(`
`)}function sv(i){let e=[];for(let t in i){let n=i[t];n!==!1&&e.push("#define "+t+" "+n)}return e.join(`
`)}function rv(i,e){let t={},n=i.getProgramParameter(e,i.ACTIVE_ATTRIBUTES);for(let s=0;s<n;s++){let r=i.getActiveAttrib(e,s),o=r.name,a=1;r.type===i.FLOAT_MAT2&&(a=2),r.type===i.FLOAT_MAT3&&(a=3),r.type===i.FLOAT_MAT4&&(a=4),t[o]={type:r.type,location:i.getAttribLocation(e,o),locationSize:a}}return t}function qr(i){return i!==""}function df(i,e){let t=e.numSpotLightShadows+e.numSpotLightMaps-e.numSpotLightShadowsWithMaps;return i.replace(/NUM_DIR_LIGHTS/g,e.numDirLights).replace(/NUM_SPOT_LIGHTS/g,e.numSpotLights).replace(/NUM_SPOT_LIGHT_MAPS/g,e.numSpotLightMaps).replace(/NUM_SPOT_LIGHT_COORDS/g,t).replace(/NUM_RECT_AREA_LIGHTS/g,e.numRectAreaLights).replace(/NUM_POINT_LIGHTS/g,e.numPointLights).replace(/NUM_HEMI_LIGHTS/g,e.numHemiLights).replace(/NUM_DIR_LIGHT_SHADOWS/g,e.numDirLightShadows).replace(/NUM_SPOT_LIGHT_SHADOWS_WITH_MAPS/g,e.numSpotLightShadowsWithMaps).replace(/NUM_SPOT_LIGHT_SHADOWS/g,e.numSpotLightShadows).replace(/NUM_POINT_LIGHT_SHADOWS/g,e.numPointLightShadows)}function ff(i,e){return i.replace(/NUM_CLIPPING_PLANES/g,e.numClippingPlanes).replace(/UNION_CLIPPING_PLANES/g,e.numClippingPlanes-e.numClipIntersection)}var ov=/^[ \t]*#include +<([\w\d./]+)>/gm;function Fh(i){return i.replace(ov,lv)}var av=new Map;function lv(i,e){let t=Ve[e];if(t===void 0){let n=av.get(e);if(n!==void 0)t=Ve[n],Ae('WebGLRenderer: Shader chunk "%s" has been deprecated. Use "%s" instead.',e,n);else throw new Error("THREE.WebGLProgram: Can not resolve #include <"+e+">")}return Fh(t)}var cv=/#pragma unroll_loop_start\s+for\s*\(\s*int\s+i\s*=\s*(\d+)\s*;\s*i\s*<\s*(\d+)\s*;\s*i\s*\+\+\s*\)\s*{([\s\S]+?)}\s+#pragma unroll_loop_end/g;function pf(i){return i.replace(cv,hv)}function hv(i,e,t,n){let s="";for(let r=parseInt(e);r<parseInt(t);r++)s+=n.replace(/\[\s*i\s*\]/g,"[ "+r+" ]").replace(/UNROLLED_LOOP_INDEX/g,r);return s}function mf(i){let e=`precision ${i.precision} float;
	precision ${i.precision} int;
	precision ${i.precision} sampler2D;
	precision ${i.precision} samplerCube;
	precision ${i.precision} sampler3D;
	precision ${i.precision} sampler2DArray;
	precision ${i.precision} sampler2DShadow;
	precision ${i.precision} samplerCubeShadow;
	precision ${i.precision} sampler2DArrayShadow;
	precision ${i.precision} isampler2D;
	precision ${i.precision} isampler3D;
	precision ${i.precision} isamplerCube;
	precision ${i.precision} isampler2DArray;
	precision ${i.precision} usampler2D;
	precision ${i.precision} usampler3D;
	precision ${i.precision} usamplerCube;
	precision ${i.precision} usampler2DArray;
	`;return i.precision==="highp"?e+=`
#define HIGH_PRECISION`:i.precision==="mediump"?e+=`
#define MEDIUM_PRECISION`:i.precision==="lowp"&&(e+=`
#define LOW_PRECISION`),e}var uv={[Fr]:"SHADOWMAP_TYPE_PCF",[Bs]:"SHADOWMAP_TYPE_VSM"};function dv(i){return uv[i.shadowMapType]||"SHADOWMAP_TYPE_BASIC"}var fv={[Fi]:"ENVMAP_TYPE_CUBE",[is]:"ENVMAP_TYPE_CUBE",[Ur]:"ENVMAP_TYPE_CUBE_UV"};function pv(i){return i.envMap===!1?"ENVMAP_TYPE_CUBE":fv[i.envMapMode]||"ENVMAP_TYPE_CUBE"}var mv={[is]:"ENVMAP_MODE_REFRACTION"};function gv(i){return i.envMap===!1?"ENVMAP_MODE_REFLECTION":mv[i.envMapMode]||"ENVMAP_MODE_REFLECTION"}var xv={[Kc]:"ENVMAP_BLENDING_MULTIPLY",[Cd]:"ENVMAP_BLENDING_MIX",[Id]:"ENVMAP_BLENDING_ADD"};function yv(i){return i.envMap===!1?"ENVMAP_BLENDING_NONE":xv[i.combine]||"ENVMAP_BLENDING_NONE"}function vv(i){let e=i.envMapCubeUVHeight;if(e===null)return null;let t=Math.log2(e)-2,n=1/e;return{texelWidth:1/(3*Math.max(Math.pow(2,t),7*16)),texelHeight:n,maxMip:t}}function _v(i,e,t,n){let s=i.getContext(),r=t.defines,o=t.vertexShader,a=t.fragmentShader,l=dv(t),c=pv(t),h=gv(t),d=yv(t),u=vv(t),m=iv(t),p=sv(r),y=s.createProgram(),g,f,b=t.glslVersion?"#version "+t.glslVersion+`
`:"";t.isRawShaderMaterial?(g=["#define SHADER_TYPE "+t.shaderType,"#define SHADER_NAME "+t.shaderName,p].filter(qr).join(`
`),g.length>0&&(g+=`
`),f=["#define SHADER_TYPE "+t.shaderType,"#define SHADER_NAME "+t.shaderName,p].filter(qr).join(`
`),f.length>0&&(f+=`
`)):(g=[mf(t),"#define SHADER_TYPE "+t.shaderType,"#define SHADER_NAME "+t.shaderName,p,t.extensionClipCullDistance?"#define USE_CLIP_DISTANCE":"",t.batching?"#define USE_BATCHING":"",t.batchingColor?"#define USE_BATCHING_COLOR":"",t.instancing?"#define USE_INSTANCING":"",t.instancingColor?"#define USE_INSTANCING_COLOR":"",t.instancingMorph?"#define USE_INSTANCING_MORPH":"",t.useFog&&t.fog?"#define USE_FOG":"",t.useFog&&t.fogExp2?"#define FOG_EXP2":"",t.map?"#define USE_MAP":"",t.envMap?"#define USE_ENVMAP":"",t.envMap?"#define "+h:"",t.lightMap?"#define USE_LIGHTMAP":"",t.aoMap?"#define USE_AOMAP":"",t.bumpMap?"#define USE_BUMPMAP":"",t.normalMap?"#define USE_NORMALMAP":"",t.normalMapObjectSpace?"#define USE_NORMALMAP_OBJECTSPACE":"",t.normalMapTangentSpace?"#define USE_NORMALMAP_TANGENTSPACE":"",t.displacementMap?"#define USE_DISPLACEMENTMAP":"",t.emissiveMap?"#define USE_EMISSIVEMAP":"",t.anisotropy?"#define USE_ANISOTROPY":"",t.anisotropyMap?"#define USE_ANISOTROPYMAP":"",t.clearcoatMap?"#define USE_CLEARCOATMAP":"",t.clearcoatRoughnessMap?"#define USE_CLEARCOAT_ROUGHNESSMAP":"",t.clearcoatNormalMap?"#define USE_CLEARCOAT_NORMALMAP":"",t.iridescenceMap?"#define USE_IRIDESCENCEMAP":"",t.iridescenceThicknessMap?"#define USE_IRIDESCENCE_THICKNESSMAP":"",t.specularMap?"#define USE_SPECULARMAP":"",t.specularColorMap?"#define USE_SPECULAR_COLORMAP":"",t.specularIntensityMap?"#define USE_SPECULAR_INTENSITYMAP":"",t.roughnessMap?"#define USE_ROUGHNESSMAP":"",t.metalnessMap?"#define USE_METALNESSMAP":"",t.alphaMap?"#define USE_ALPHAMAP":"",t.alphaHash?"#define USE_ALPHAHASH":"",t.transmission?"#define USE_TRANSMISSION":"",t.transmissionMap?"#define USE_TRANSMISSIONMAP":"",t.thicknessMap?"#define USE_THICKNESSMAP":"",t.sheenColorMap?"#define USE_SHEEN_COLORMAP":"",t.sheenRoughnessMap?"#define USE_SHEEN_ROUGHNESSMAP":"",t.mapUv?"#define MAP_UV "+t.mapUv:"",t.alphaMapUv?"#define ALPHAMAP_UV "+t.alphaMapUv:"",t.lightMapUv?"#define LIGHTMAP_UV "+t.lightMapUv:"",t.aoMapUv?"#define AOMAP_UV "+t.aoMapUv:"",t.emissiveMapUv?"#define EMISSIVEMAP_UV "+t.emissiveMapUv:"",t.bumpMapUv?"#define BUMPMAP_UV "+t.bumpMapUv:"",t.normalMapUv?"#define NORMALMAP_UV "+t.normalMapUv:"",t.displacementMapUv?"#define DISPLACEMENTMAP_UV "+t.displacementMapUv:"",t.metalnessMapUv?"#define METALNESSMAP_UV "+t.metalnessMapUv:"",t.roughnessMapUv?"#define ROUGHNESSMAP_UV "+t.roughnessMapUv:"",t.anisotropyMapUv?"#define ANISOTROPYMAP_UV "+t.anisotropyMapUv:"",t.clearcoatMapUv?"#define CLEARCOATMAP_UV "+t.clearcoatMapUv:"",t.clearcoatNormalMapUv?"#define CLEARCOAT_NORMALMAP_UV "+t.clearcoatNormalMapUv:"",t.clearcoatRoughnessMapUv?"#define CLEARCOAT_ROUGHNESSMAP_UV "+t.clearcoatRoughnessMapUv:"",t.iridescenceMapUv?"#define IRIDESCENCEMAP_UV "+t.iridescenceMapUv:"",t.iridescenceThicknessMapUv?"#define IRIDESCENCE_THICKNESSMAP_UV "+t.iridescenceThicknessMapUv:"",t.sheenColorMapUv?"#define SHEEN_COLORMAP_UV "+t.sheenColorMapUv:"",t.sheenRoughnessMapUv?"#define SHEEN_ROUGHNESSMAP_UV "+t.sheenRoughnessMapUv:"",t.specularMapUv?"#define SPECULARMAP_UV "+t.specularMapUv:"",t.specularColorMapUv?"#define SPECULAR_COLORMAP_UV "+t.specularColorMapUv:"",t.specularIntensityMapUv?"#define SPECULAR_INTENSITYMAP_UV "+t.specularIntensityMapUv:"",t.transmissionMapUv?"#define TRANSMISSIONMAP_UV "+t.transmissionMapUv:"",t.thicknessMapUv?"#define THICKNESSMAP_UV "+t.thicknessMapUv:"",t.vertexTangents&&t.flatShading===!1?"#define USE_TANGENT":"",t.vertexNormals?"#define HAS_NORMAL":"",t.vertexColors?"#define USE_COLOR":"",t.vertexAlphas?"#define USE_COLOR_ALPHA":"",t.vertexUv1s?"#define USE_UV1":"",t.vertexUv2s?"#define USE_UV2":"",t.vertexUv3s?"#define USE_UV3":"",t.pointsUvs?"#define USE_POINTS_UV":"",t.flatShading?"#define FLAT_SHADED":"",t.skinning?"#define USE_SKINNING":"",t.morphTargets?"#define USE_MORPHTARGETS":"",t.morphNormals&&t.flatShading===!1?"#define USE_MORPHNORMALS":"",t.morphColors?"#define USE_MORPHCOLORS":"",t.morphTargetsCount>0?"#define MORPHTARGETS_TEXTURE_STRIDE "+t.morphTextureStride:"",t.morphTargetsCount>0?"#define MORPHTARGETS_COUNT "+t.morphTargetsCount:"",t.doubleSided?"#define DOUBLE_SIDED":"",t.flipSided?"#define FLIP_SIDED":"",t.shadowMapEnabled?"#define USE_SHADOWMAP":"",t.shadowMapEnabled?"#define "+l:"",t.sizeAttenuation?"#define USE_SIZEATTENUATION":"",t.numLightProbes>0?"#define USE_LIGHT_PROBES":"",t.logarithmicDepthBuffer?"#define USE_LOGARITHMIC_DEPTH_BUFFER":"",t.reversedDepthBuffer?"#define USE_REVERSED_DEPTH_BUFFER":"","uniform mat4 modelMatrix;","uniform mat4 modelViewMatrix;","uniform mat4 projectionMatrix;","uniform mat4 viewMatrix;","uniform mat3 normalMatrix;","uniform vec3 cameraPosition;","uniform bool isOrthographic;","#ifdef USE_INSTANCING","	attribute mat4 instanceMatrix;","#endif","#ifdef USE_INSTANCING_COLOR","	attribute vec3 instanceColor;","#endif","#ifdef USE_INSTANCING_MORPH","	uniform sampler2D morphTexture;","#endif","attribute vec3 position;","attribute vec3 normal;","attribute vec2 uv;","#ifdef USE_UV1","	attribute vec2 uv1;","#endif","#ifdef USE_UV2","	attribute vec2 uv2;","#endif","#ifdef USE_UV3","	attribute vec2 uv3;","#endif","#ifdef USE_TANGENT","	attribute vec4 tangent;","#endif","#if defined( USE_COLOR_ALPHA )","	attribute vec4 color;","#elif defined( USE_COLOR )","	attribute vec3 color;","#endif","#ifdef USE_SKINNING","	attribute vec4 skinIndex;","	attribute vec4 skinWeight;","#endif",`
`].filter(qr).join(`
`),f=[mf(t),"#define SHADER_TYPE "+t.shaderType,"#define SHADER_NAME "+t.shaderName,p,t.useFog&&t.fog?"#define USE_FOG":"",t.useFog&&t.fogExp2?"#define FOG_EXP2":"",t.alphaToCoverage?"#define ALPHA_TO_COVERAGE":"",t.map?"#define USE_MAP":"",t.matcap?"#define USE_MATCAP":"",t.envMap?"#define USE_ENVMAP":"",t.envMap?"#define "+c:"",t.envMap?"#define "+h:"",t.envMap?"#define "+d:"",u?"#define CUBEUV_TEXEL_WIDTH "+u.texelWidth:"",u?"#define CUBEUV_TEXEL_HEIGHT "+u.texelHeight:"",u?"#define CUBEUV_MAX_MIP "+u.maxMip+".0":"",t.lightMap?"#define USE_LIGHTMAP":"",t.aoMap?"#define USE_AOMAP":"",t.bumpMap?"#define USE_BUMPMAP":"",t.normalMap?"#define USE_NORMALMAP":"",t.normalMapObjectSpace?"#define USE_NORMALMAP_OBJECTSPACE":"",t.normalMapTangentSpace?"#define USE_NORMALMAP_TANGENTSPACE":"",t.packedNormalMap?"#define USE_PACKED_NORMALMAP":"",t.emissiveMap?"#define USE_EMISSIVEMAP":"",t.anisotropy?"#define USE_ANISOTROPY":"",t.anisotropyMap?"#define USE_ANISOTROPYMAP":"",t.clearcoat?"#define USE_CLEARCOAT":"",t.clearcoatMap?"#define USE_CLEARCOATMAP":"",t.clearcoatRoughnessMap?"#define USE_CLEARCOAT_ROUGHNESSMAP":"",t.clearcoatNormalMap?"#define USE_CLEARCOAT_NORMALMAP":"",t.dispersion?"#define USE_DISPERSION":"",t.iridescence?"#define USE_IRIDESCENCE":"",t.iridescenceMap?"#define USE_IRIDESCENCEMAP":"",t.iridescenceThicknessMap?"#define USE_IRIDESCENCE_THICKNESSMAP":"",t.specularMap?"#define USE_SPECULARMAP":"",t.specularColorMap?"#define USE_SPECULAR_COLORMAP":"",t.specularIntensityMap?"#define USE_SPECULAR_INTENSITYMAP":"",t.roughnessMap?"#define USE_ROUGHNESSMAP":"",t.metalnessMap?"#define USE_METALNESSMAP":"",t.alphaMap?"#define USE_ALPHAMAP":"",t.alphaTest?"#define USE_ALPHATEST":"",t.alphaHash?"#define USE_ALPHAHASH":"",t.sheen?"#define USE_SHEEN":"",t.sheenColorMap?"#define USE_SHEEN_COLORMAP":"",t.sheenRoughnessMap?"#define USE_SHEEN_ROUGHNESSMAP":"",t.transmission?"#define USE_TRANSMISSION":"",t.transmissionMap?"#define USE_TRANSMISSIONMAP":"",t.thicknessMap?"#define USE_THICKNESSMAP":"",t.vertexTangents&&t.flatShading===!1?"#define USE_TANGENT":"",t.vertexColors||t.instancingColor?"#define USE_COLOR":"",t.vertexAlphas||t.batchingColor?"#define USE_COLOR_ALPHA":"",t.vertexUv1s?"#define USE_UV1":"",t.vertexUv2s?"#define USE_UV2":"",t.vertexUv3s?"#define USE_UV3":"",t.pointsUvs?"#define USE_POINTS_UV":"",t.gradientMap?"#define USE_GRADIENTMAP":"",t.flatShading?"#define FLAT_SHADED":"",t.doubleSided?"#define DOUBLE_SIDED":"",t.flipSided?"#define FLIP_SIDED":"",t.shadowMapEnabled?"#define USE_SHADOWMAP":"",t.shadowMapEnabled?"#define "+l:"",t.premultipliedAlpha?"#define PREMULTIPLIED_ALPHA":"",t.numLightProbes>0?"#define USE_LIGHT_PROBES":"",t.numLightProbeGrids>0?"#define USE_LIGHT_PROBES_GRID":"",t.decodeVideoTexture?"#define DECODE_VIDEO_TEXTURE":"",t.decodeVideoTextureEmissive?"#define DECODE_VIDEO_TEXTURE_EMISSIVE":"",t.logarithmicDepthBuffer?"#define USE_LOGARITHMIC_DEPTH_BUFFER":"",t.reversedDepthBuffer?"#define USE_REVERSED_DEPTH_BUFFER":"","uniform mat4 viewMatrix;","uniform vec3 cameraPosition;","uniform bool isOrthographic;",t.toneMapping!==Cn?"#define TONE_MAPPING":"",t.toneMapping!==Cn?Ve.tonemapping_pars_fragment:"",t.toneMapping!==Cn?tv("toneMapping",t.toneMapping):"",t.dithering?"#define DITHERING":"",t.opaque?"#define OPAQUE":"",Ve.colorspace_pars_fragment,Qy("linearToOutputTexel",t.outputColorSpace),nv(),t.useDepthPacking?"#define DEPTH_PACKING "+t.depthPacking:"",`
`].filter(qr).join(`
`)),o=Fh(o),o=df(o,t),o=ff(o,t),a=Fh(a),a=df(a,t),a=ff(a,t),o=pf(o),a=pf(a),t.isRawShaderMaterial!==!0&&(b=`#version 300 es
`,g=[m,"#define attribute in","#define varying out","#define texture2D texture"].join(`
`)+`
`+g,f=["#define varying in",t.glslVersion===dh?"":"layout(location = 0) out highp vec4 pc_fragColor;",t.glslVersion===dh?"":"#define gl_FragColor pc_fragColor","#define gl_FragDepthEXT gl_FragDepth","#define texture2D texture","#define textureCube texture","#define texture2DProj textureProj","#define texture2DLodEXT textureLod","#define texture2DProjLodEXT textureProjLod","#define textureCubeLodEXT textureLod","#define texture2DGradEXT textureGrad","#define texture2DProjGradEXT textureProjGrad","#define textureCubeGradEXT textureGrad"].join(`
`)+`
`+f);let M=b+g+o,v=b+f+a,A=cf(s,s.VERTEX_SHADER,M),w=cf(s,s.FRAGMENT_SHADER,v);s.attachShader(y,A),s.attachShader(y,w),t.index0AttributeName!==void 0?s.bindAttribLocation(y,0,t.index0AttributeName):t.hasPositionAttribute===!0&&s.bindAttribLocation(y,0,"position"),s.linkProgram(y);function E(R){if(i.debug.checkShaderErrors){let L=s.getProgramInfoLog(y)||"",I=s.getShaderInfoLog(A)||"",V=s.getShaderInfoLog(w)||"",D=L.trim(),q=I.trim(),z=V.trim(),K=!0,j=!0;if(s.getProgramParameter(y,s.LINK_STATUS)===!1)if(K=!1,typeof i.debug.onShaderError=="function")i.debug.onShaderError(s,y,A,w);else{let se=uf(s,A,"vertex"),fe=uf(s,w,"fragment");Le("WebGLProgram: Shader Error "+s.getError()+" - VALIDATE_STATUS "+s.getProgramParameter(y,s.VALIDATE_STATUS)+`

Material Name: `+R.name+`
Material Type: `+R.type+`

Program Info Log: `+D+`
`+se+`
`+fe)}else D!==""?Ae("WebGLProgram: Program Info Log:",D):(q===""||z==="")&&(j=!1);j&&(R.diagnostics={runnable:K,programLog:D,vertexShader:{log:q,prefix:g},fragmentShader:{log:z,prefix:f}})}s.deleteShader(A),s.deleteShader(w),x=new Hs(s,y),T=rv(s,y)}let x;this.getUniforms=function(){return x===void 0&&E(this),x};let T;this.getAttributes=function(){return T===void 0&&E(this),T};let C=t.rendererExtensionParallelShaderCompile===!1;return this.isReady=function(){return C===!1&&(C=s.getProgramParameter(y,Ky)),C},this.destroy=function(){n.releaseStatesOfProgram(this),s.deleteProgram(y),this.program=void 0},this.type=t.shaderType,this.name=t.shaderName,this.id=Zy++,this.cacheKey=e,this.usedTimes=1,this.program=y,this.vertexShader=A,this.fragmentShader=w,this}var bv=0,Uh=class{constructor(){this.shaderCache=new Map,this.materialCache=new Map}update(e,t,n){let s=this._getShaderCacheForMaterial(e);return s.has(t)===!1&&(s.add(t),t.usedTimes++),s.has(n)===!1&&(s.add(n),n.usedTimes++),this}remove(e){let t=this.materialCache.get(e);for(let n of t)n.usedTimes--,n.usedTimes===0&&this.shaderCache.delete(n.code);return this.materialCache.delete(e),this}getVertexShaderStage(e){return this._getShaderStage(e.vertexShader)}getFragmentShaderStage(e){return this._getShaderStage(e.fragmentShader)}dispose(){this.shaderCache.clear(),this.materialCache.clear()}_getShaderCacheForMaterial(e){let t=this.materialCache,n=t.get(e);return n===void 0&&(n=new Set,t.set(e,n)),n}_getShaderStage(e){let t=this.shaderCache,n=t.get(e);return n===void 0&&(n=new Nh(e),t.set(e,n)),n}},Nh=class{constructor(e){this.id=bv++,this.code=e,this.usedTimes=0}};function Mv(i){return i===Oi||i===Vr||i===Hr}function Sv(i,e,t,n,s,r){let o=new pr,a=new Uh,l=new Set,c=[],h=new Map,d=n.logarithmicDepthBuffer,u=n.precision,m={MeshDepthMaterial:"depth",MeshDistanceMaterial:"distance",MeshNormalMaterial:"normal",MeshBasicMaterial:"basic",MeshLambertMaterial:"lambert",MeshPhongMaterial:"phong",MeshToonMaterial:"toon",MeshStandardMaterial:"physical",MeshPhysicalMaterial:"physical",MeshMatcapMaterial:"matcap",LineBasicMaterial:"basic",LineDashedMaterial:"dashed",PointsMaterial:"points",ShadowMaterial:"shadow",SpriteMaterial:"sprite"};function p(x){return l.add(x),x===0?"uv":`uv${x}`}function y(x,T,C,R,L,I){let V=R.fog,D=L.geometry,q=x.isMeshStandardMaterial||x.isMeshLambertMaterial||x.isMeshPhongMaterial?R.environment:null,z=x.isMeshStandardMaterial||x.isMeshLambertMaterial&&!x.envMap||x.isMeshPhongMaterial&&!x.envMap,K=e.get(x.envMap||q,z),j=K&&K.mapping===Ur?K.image.height:null,se=m[x.type];x.precision!==null&&(u=n.getMaxPrecision(x.precision),u!==x.precision&&Ae("WebGLProgram.getParameters:",x.precision,"not supported, using",u,"instead."));let fe=D.morphAttributes.position||D.morphAttributes.normal||D.morphAttributes.color,ve=fe!==void 0?fe.length:0,Ze=0;D.morphAttributes.position!==void 0&&(Ze=1),D.morphAttributes.normal!==void 0&&(Ze=2),D.morphAttributes.color!==void 0&&(Ze=3);let pt,Je,Q,ae;if(se){let _e=Qt[se];pt=_e.vertexShader,Je=_e.fragmentShader}else{pt=x.vertexShader,Je=x.fragmentShader;let _e=a.getVertexShaderStage(x),gt=a.getFragmentShaderStage(x);a.update(x,_e,gt),Q=_e.id,ae=gt.id}let ne=i.getRenderTarget(),De=i.state.buffers.depth.getReversed(),Oe=L.isInstancedMesh===!0,Ce=L.isBatchedMesh===!0,_t=!!x.map,Xe=!!x.matcap,st=!!K,je=!!x.aoMap,$e=!!x.lightMap,wt=!!x.bumpMap&&x.wireframe===!1,Pt=!!x.normalMap,Ut=!!x.displacementMap,Bt=!!x.emissiveMap,mt=!!x.metalnessMap,Et=!!x.roughnessMap,O=x.anisotropy>0,en=x.clearcoat>0,et=x.dispersion>0,P=x.iridescence>0,_=x.sheen>0,k=x.transmission>0,W=O&&!!x.anisotropyMap,Y=en&&!!x.clearcoatMap,ie=en&&!!x.clearcoatNormalMap,le=en&&!!x.clearcoatRoughnessMap,$=P&&!!x.iridescenceMap,J=P&&!!x.iridescenceThicknessMap,ce=_&&!!x.sheenColorMap,Se=_&&!!x.sheenRoughnessMap,de=!!x.specularMap,he=!!x.specularColorMap,Te=!!x.specularIntensityMap,Ie=k&&!!x.transmissionMap,Be=k&&!!x.thicknessMap,F=!!x.gradientMap,oe=!!x.alphaMap,Z=x.alphaTest>0,ue=!!x.alphaHash,ge=!!x.extensions,ee=Cn;x.toneMapped&&(ne===null||ne.isXRRenderTarget===!0)&&(ee=i.toneMapping);let Me={shaderID:se,shaderType:x.type,shaderName:x.name,vertexShader:pt,fragmentShader:Je,defines:x.defines,customVertexShaderID:Q,customFragmentShaderID:ae,isRawShaderMaterial:x.isRawShaderMaterial===!0,glslVersion:x.glslVersion,precision:u,batching:Ce,batchingColor:Ce&&L._colorsTexture!==null,instancing:Oe,instancingColor:Oe&&L.instanceColor!==null,instancingMorph:Oe&&L.morphTexture!==null,outputColorSpace:ne===null?i.outputColorSpace:ne.isXRRenderTarget===!0?ne.texture.colorSpace:qe.workingColorSpace,alphaToCoverage:!!x.alphaToCoverage,map:_t,matcap:Xe,envMap:st,envMapMode:st&&K.mapping,envMapCubeUVHeight:j,aoMap:je,lightMap:$e,bumpMap:wt,normalMap:Pt,displacementMap:Ut,emissiveMap:Bt,normalMapObjectSpace:Pt&&x.normalMapType===Fd,normalMapTangentSpace:Pt&&x.normalMapType===uh,packedNormalMap:Pt&&x.normalMapType===uh&&Mv(x.normalMap.format),metalnessMap:mt,roughnessMap:Et,anisotropy:O,anisotropyMap:W,clearcoat:en,clearcoatMap:Y,clearcoatNormalMap:ie,clearcoatRoughnessMap:le,dispersion:et,iridescence:P,iridescenceMap:$,iridescenceThicknessMap:J,sheen:_,sheenColorMap:ce,sheenRoughnessMap:Se,specularMap:de,specularColorMap:he,specularIntensityMap:Te,transmission:k,transmissionMap:Ie,thicknessMap:Be,gradientMap:F,opaque:x.transparent===!1&&x.blending===ji&&x.alphaToCoverage===!1,alphaMap:oe,alphaTest:Z,alphaHash:ue,combine:x.combine,mapUv:_t&&p(x.map.channel),aoMapUv:je&&p(x.aoMap.channel),lightMapUv:$e&&p(x.lightMap.channel),bumpMapUv:wt&&p(x.bumpMap.channel),normalMapUv:Pt&&p(x.normalMap.channel),displacementMapUv:Ut&&p(x.displacementMap.channel),emissiveMapUv:Bt&&p(x.emissiveMap.channel),metalnessMapUv:mt&&p(x.metalnessMap.channel),roughnessMapUv:Et&&p(x.roughnessMap.channel),anisotropyMapUv:W&&p(x.anisotropyMap.channel),clearcoatMapUv:Y&&p(x.clearcoatMap.channel),clearcoatNormalMapUv:ie&&p(x.clearcoatNormalMap.channel),clearcoatRoughnessMapUv:le&&p(x.clearcoatRoughnessMap.channel),iridescenceMapUv:$&&p(x.iridescenceMap.channel),iridescenceThicknessMapUv:J&&p(x.iridescenceThicknessMap.channel),sheenColorMapUv:ce&&p(x.sheenColorMap.channel),sheenRoughnessMapUv:Se&&p(x.sheenRoughnessMap.channel),specularMapUv:de&&p(x.specularMap.channel),specularColorMapUv:he&&p(x.specularColorMap.channel),specularIntensityMapUv:Te&&p(x.specularIntensityMap.channel),transmissionMapUv:Ie&&p(x.transmissionMap.channel),thicknessMapUv:Be&&p(x.thicknessMap.channel),alphaMapUv:oe&&p(x.alphaMap.channel),vertexTangents:!!D.attributes.tangent&&(Pt||O),vertexNormals:!!D.attributes.normal,vertexColors:x.vertexColors,vertexAlphas:x.vertexColors===!0&&!!D.attributes.color&&D.attributes.color.itemSize===4,pointsUvs:L.isPoints===!0&&!!D.attributes.uv&&(_t||oe),fog:!!V,useFog:x.fog===!0,fogExp2:!!V&&V.isFogExp2,flatShading:x.wireframe===!1&&(x.flatShading===!0||D.attributes.normal===void 0&&Pt===!1&&(x.isMeshLambertMaterial||x.isMeshPhongMaterial||x.isMeshStandardMaterial||x.isMeshPhysicalMaterial)),sizeAttenuation:x.sizeAttenuation===!0,logarithmicDepthBuffer:d,reversedDepthBuffer:De,skinning:L.isSkinnedMesh===!0,hasPositionAttribute:D.attributes.position!==void 0,morphTargets:D.morphAttributes.position!==void 0,morphNormals:D.morphAttributes.normal!==void 0,morphColors:D.morphAttributes.color!==void 0,morphTargetsCount:ve,morphTextureStride:Ze,numDirLights:T.directional.length,numPointLights:T.point.length,numSpotLights:T.spot.length,numSpotLightMaps:T.spotLightMap.length,numRectAreaLights:T.rectArea.length,numHemiLights:T.hemi.length,numDirLightShadows:T.directionalShadowMap.length,numPointLightShadows:T.pointShadowMap.length,numSpotLightShadows:T.spotShadowMap.length,numSpotLightShadowsWithMaps:T.numSpotLightShadowsWithMaps,numLightProbes:T.numLightProbes,numLightProbeGrids:I.length,numClippingPlanes:r.numPlanes,numClipIntersection:r.numIntersection,dithering:x.dithering,shadowMapEnabled:i.shadowMap.enabled&&C.length>0,shadowMapType:i.shadowMap.type,toneMapping:ee,decodeVideoTexture:_t&&x.map.isVideoTexture===!0&&qe.getTransfer(x.map.colorSpace)===Qe,decodeVideoTextureEmissive:Bt&&x.emissiveMap.isVideoTexture===!0&&qe.getTransfer(x.emissiveMap.colorSpace)===Qe,premultipliedAlpha:x.premultipliedAlpha,doubleSided:x.side===rn,flipSided:x.side===jt,useDepthPacking:x.depthPacking>=0,depthPacking:x.depthPacking||0,index0AttributeName:x.index0AttributeName,extensionClipCullDistance:ge&&x.extensions.clipCullDistance===!0&&t.has("WEBGL_clip_cull_distance"),extensionMultiDraw:(ge&&x.extensions.multiDraw===!0||Ce)&&t.has("WEBGL_multi_draw"),rendererExtensionParallelShaderCompile:t.has("KHR_parallel_shader_compile"),customProgramCacheKey:x.customProgramCacheKey()};return Me.vertexUv1s=l.has(1),Me.vertexUv2s=l.has(2),Me.vertexUv3s=l.has(3),l.clear(),Me}function g(x){let T=[];if(x.shaderID?T.push(x.shaderID):(T.push(x.customVertexShaderID),T.push(x.customFragmentShaderID)),x.defines!==void 0)for(let C in x.defines)T.push(C),T.push(x.defines[C]);return x.isRawShaderMaterial===!1&&(f(T,x),b(T,x),T.push(i.outputColorSpace)),T.push(x.customProgramCacheKey),T.join()}function f(x,T){x.push(T.precision),x.push(T.outputColorSpace),x.push(T.envMapMode),x.push(T.envMapCubeUVHeight),x.push(T.mapUv),x.push(T.alphaMapUv),x.push(T.lightMapUv),x.push(T.aoMapUv),x.push(T.bumpMapUv),x.push(T.normalMapUv),x.push(T.displacementMapUv),x.push(T.emissiveMapUv),x.push(T.metalnessMapUv),x.push(T.roughnessMapUv),x.push(T.anisotropyMapUv),x.push(T.clearcoatMapUv),x.push(T.clearcoatNormalMapUv),x.push(T.clearcoatRoughnessMapUv),x.push(T.iridescenceMapUv),x.push(T.iridescenceThicknessMapUv),x.push(T.sheenColorMapUv),x.push(T.sheenRoughnessMapUv),x.push(T.specularMapUv),x.push(T.specularColorMapUv),x.push(T.specularIntensityMapUv),x.push(T.transmissionMapUv),x.push(T.thicknessMapUv),x.push(T.combine),x.push(T.fogExp2),x.push(T.sizeAttenuation),x.push(T.morphTargetsCount),x.push(T.morphAttributeCount),x.push(T.numDirLights),x.push(T.numPointLights),x.push(T.numSpotLights),x.push(T.numSpotLightMaps),x.push(T.numHemiLights),x.push(T.numRectAreaLights),x.push(T.numDirLightShadows),x.push(T.numPointLightShadows),x.push(T.numSpotLightShadows),x.push(T.numSpotLightShadowsWithMaps),x.push(T.numLightProbes),x.push(T.shadowMapType),x.push(T.toneMapping),x.push(T.numClippingPlanes),x.push(T.numClipIntersection),x.push(T.depthPacking)}function b(x,T){o.disableAll(),T.instancing&&o.enable(0),T.instancingColor&&o.enable(1),T.instancingMorph&&o.enable(2),T.matcap&&o.enable(3),T.envMap&&o.enable(4),T.normalMapObjectSpace&&o.enable(5),T.normalMapTangentSpace&&o.enable(6),T.clearcoat&&o.enable(7),T.iridescence&&o.enable(8),T.alphaTest&&o.enable(9),T.vertexColors&&o.enable(10),T.vertexAlphas&&o.enable(11),T.vertexUv1s&&o.enable(12),T.vertexUv2s&&o.enable(13),T.vertexUv3s&&o.enable(14),T.vertexTangents&&o.enable(15),T.anisotropy&&o.enable(16),T.alphaHash&&o.enable(17),T.batching&&o.enable(18),T.dispersion&&o.enable(19),T.batchingColor&&o.enable(20),T.gradientMap&&o.enable(21),T.packedNormalMap&&o.enable(22),T.vertexNormals&&o.enable(23),x.push(o.mask),o.disableAll(),T.fog&&o.enable(0),T.useFog&&o.enable(1),T.flatShading&&o.enable(2),T.logarithmicDepthBuffer&&o.enable(3),T.reversedDepthBuffer&&o.enable(4),T.skinning&&o.enable(5),T.morphTargets&&o.enable(6),T.morphNormals&&o.enable(7),T.morphColors&&o.enable(8),T.premultipliedAlpha&&o.enable(9),T.shadowMapEnabled&&o.enable(10),T.doubleSided&&o.enable(11),T.flipSided&&o.enable(12),T.useDepthPacking&&o.enable(13),T.dithering&&o.enable(14),T.transmission&&o.enable(15),T.sheen&&o.enable(16),T.opaque&&o.enable(17),T.pointsUvs&&o.enable(18),T.decodeVideoTexture&&o.enable(19),T.decodeVideoTextureEmissive&&o.enable(20),T.alphaToCoverage&&o.enable(21),T.numLightProbeGrids>0&&o.enable(22),T.hasPositionAttribute&&o.enable(23),x.push(o.mask)}function M(x){let T=m[x.type],C;if(T){let R=Qt[T];C=Gr.clone(R.uniforms)}else C=x.uniforms;return C}function v(x,T){let C=h.get(T);return C!==void 0?++C.usedTimes:(C=new _v(i,T,x,s),c.push(C),h.set(T,C)),C}function A(x){if(--x.usedTimes===0){let T=c.indexOf(x);c[T]=c[c.length-1],c.pop(),h.delete(x.cacheKey),x.destroy()}}function w(x){a.remove(x)}function E(){a.dispose()}return{getParameters:y,getProgramCacheKey:g,getUniforms:M,acquireProgram:v,releaseProgram:A,releaseShaderCache:w,programs:c,dispose:E}}function wv(){let i=new WeakMap;function e(o){return i.has(o)}function t(o){let a=i.get(o);return a===void 0&&(a={},i.set(o,a)),a}function n(o){i.delete(o)}function s(o,a,l){i.get(o)[a]=l}function r(){i=new WeakMap}return{has:e,get:t,remove:n,update:s,dispose:r}}function Ev(i,e){return i.groupOrder!==e.groupOrder?i.groupOrder-e.groupOrder:i.renderOrder!==e.renderOrder?i.renderOrder-e.renderOrder:i.material.id!==e.material.id?i.material.id-e.material.id:i.materialVariant!==e.materialVariant?i.materialVariant-e.materialVariant:i.z!==e.z?i.z-e.z:i.id-e.id}function gf(i,e){return i.groupOrder!==e.groupOrder?i.groupOrder-e.groupOrder:i.renderOrder!==e.renderOrder?i.renderOrder-e.renderOrder:i.z!==e.z?e.z-i.z:i.id-e.id}function xf(){let i=[],e=0,t=[],n=[],s=[];function r(){e=0,t.length=0,n.length=0,s.length=0}function o(u){let m=0;return u.isInstancedMesh&&(m+=2),u.isSkinnedMesh&&(m+=1),m}function a(u,m,p,y,g,f){let b=i[e];return b===void 0?(b={id:u.id,object:u,geometry:m,material:p,materialVariant:o(u),groupOrder:y,renderOrder:u.renderOrder,z:g,group:f},i[e]=b):(b.id=u.id,b.object=u,b.geometry=m,b.material=p,b.materialVariant=o(u),b.groupOrder=y,b.renderOrder=u.renderOrder,b.z=g,b.group=f),e++,b}function l(u,m,p,y,g,f){let b=a(u,m,p,y,g,f);p.transmission>0?n.push(b):p.transparent===!0?s.push(b):t.push(b)}function c(u,m,p,y,g,f){let b=a(u,m,p,y,g,f);p.transmission>0?n.unshift(b):p.transparent===!0?s.unshift(b):t.unshift(b)}function h(u,m,p){t.length>1&&t.sort(u||Ev),n.length>1&&n.sort(m||gf),s.length>1&&s.sort(m||gf),p&&(t.reverse(),n.reverse(),s.reverse())}function d(){for(let u=e,m=i.length;u<m;u++){let p=i[u];if(p.id===null)break;p.id=null,p.object=null,p.geometry=null,p.material=null,p.group=null}}return{opaque:t,transmissive:n,transparent:s,init:r,push:l,unshift:c,finish:d,sort:h}}function Tv(){let i=new WeakMap;function e(n,s){let r=i.get(n),o;return r===void 0?(o=new xf,i.set(n,[o])):s>=r.length?(o=new xf,r.push(o)):o=r[s],o}function t(){i=new WeakMap}return{get:e,dispose:t}}function Av(){let i={};return{get:function(e){if(i[e.id]!==void 0)return i[e.id];let t;switch(e.type){case"DirectionalLight":t={direction:new N,color:new We};break;case"SpotLight":t={position:new N,direction:new N,color:new We,distance:0,coneCos:0,penumbraCos:0,decay:0};break;case"PointLight":t={position:new N,color:new We,distance:0,decay:0};break;case"HemisphereLight":t={direction:new N,skyColor:new We,groundColor:new We};break;case"RectAreaLight":t={color:new We,position:new N,halfWidth:new N,halfHeight:new N};break}return i[e.id]=t,t}}}function Pv(){let i={};return{get:function(e){if(i[e.id]!==void 0)return i[e.id];let t;switch(e.type){case"DirectionalLight":t={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new Ge};break;case"SpotLight":t={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new Ge};break;case"PointLight":t={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new Ge,shadowCameraNear:1,shadowCameraFar:1e3};break}return i[e.id]=t,t}}}var Rv=0;function Cv(i,e){return(e.castShadow?2:0)-(i.castShadow?2:0)+(e.map?1:0)-(i.map?1:0)}function Iv(i){let e=new Av,t=Pv(),n={version:0,hash:{directionalLength:-1,pointLength:-1,spotLength:-1,rectAreaLength:-1,hemiLength:-1,numDirectionalShadows:-1,numPointShadows:-1,numSpotShadows:-1,numSpotMaps:-1,numLightProbes:-1},ambient:[0,0,0],probe:[],directional:[],directionalShadow:[],directionalShadowMap:[],directionalShadowMatrix:[],spot:[],spotLightMap:[],spotShadow:[],spotShadowMap:[],spotLightMatrix:[],rectArea:[],rectAreaLTC1:null,rectAreaLTC2:null,point:[],pointShadow:[],pointShadowMap:[],pointShadowMatrix:[],hemi:[],numSpotLightShadowsWithMaps:0,numLightProbes:0};for(let c=0;c<9;c++)n.probe.push(new N);let s=new N,r=new at,o=new at;function a(c){let h=0,d=0,u=0;for(let T=0;T<9;T++)n.probe[T].set(0,0,0);let m=0,p=0,y=0,g=0,f=0,b=0,M=0,v=0,A=0,w=0,E=0;c.sort(Cv);for(let T=0,C=c.length;T<C;T++){let R=c[T],L=R.color,I=R.intensity,V=R.distance,D=null;if(R.shadow&&R.shadow.map&&(R.shadow.map.texture.format===Oi?D=R.shadow.map.texture:D=R.shadow.map.depthTexture||R.shadow.map.texture),R.isAmbientLight)h+=L.r*I,d+=L.g*I,u+=L.b*I;else if(R.isLightProbe){for(let q=0;q<9;q++)n.probe[q].addScaledVector(R.sh.coefficients[q],I);E++}else if(R.isDirectionalLight){let q=e.get(R);if(q.color.copy(R.color).multiplyScalar(R.intensity),R.castShadow){let z=R.shadow,K=t.get(R);K.shadowIntensity=z.intensity,K.shadowBias=z.bias,K.shadowNormalBias=z.normalBias,K.shadowRadius=z.radius,K.shadowMapSize=z.mapSize,n.directionalShadow[m]=K,n.directionalShadowMap[m]=D,n.directionalShadowMatrix[m]=R.shadow.matrix,b++}n.directional[m]=q,m++}else if(R.isSpotLight){let q=e.get(R);q.position.setFromMatrixPosition(R.matrixWorld),q.color.copy(L).multiplyScalar(I),q.distance=V,q.coneCos=Math.cos(R.angle),q.penumbraCos=Math.cos(R.angle*(1-R.penumbra)),q.decay=R.decay,n.spot[y]=q;let z=R.shadow;if(R.map&&(n.spotLightMap[A]=R.map,A++,z.updateMatrices(R),R.castShadow&&w++),n.spotLightMatrix[y]=z.matrix,R.castShadow){let K=t.get(R);K.shadowIntensity=z.intensity,K.shadowBias=z.bias,K.shadowNormalBias=z.normalBias,K.shadowRadius=z.radius,K.shadowMapSize=z.mapSize,n.spotShadow[y]=K,n.spotShadowMap[y]=D,v++}y++}else if(R.isRectAreaLight){let q=e.get(R);q.color.copy(L).multiplyScalar(I),q.halfWidth.set(R.width*.5,0,0),q.halfHeight.set(0,R.height*.5,0),n.rectArea[g]=q,g++}else if(R.isPointLight){let q=e.get(R);if(q.color.copy(R.color).multiplyScalar(R.intensity),q.distance=R.distance,q.decay=R.decay,R.castShadow){let z=R.shadow,K=t.get(R);K.shadowIntensity=z.intensity,K.shadowBias=z.bias,K.shadowNormalBias=z.normalBias,K.shadowRadius=z.radius,K.shadowMapSize=z.mapSize,K.shadowCameraNear=z.camera.near,K.shadowCameraFar=z.camera.far,n.pointShadow[p]=K,n.pointShadowMap[p]=D,n.pointShadowMatrix[p]=R.shadow.matrix,M++}n.point[p]=q,p++}else if(R.isHemisphereLight){let q=e.get(R);q.skyColor.copy(R.color).multiplyScalar(I),q.groundColor.copy(R.groundColor).multiplyScalar(I),n.hemi[f]=q,f++}}g>0&&(i.has("OES_texture_float_linear")===!0?(n.rectAreaLTC1=re.LTC_FLOAT_1,n.rectAreaLTC2=re.LTC_FLOAT_2):(n.rectAreaLTC1=re.LTC_HALF_1,n.rectAreaLTC2=re.LTC_HALF_2)),n.ambient[0]=h,n.ambient[1]=d,n.ambient[2]=u;let x=n.hash;(x.directionalLength!==m||x.pointLength!==p||x.spotLength!==y||x.rectAreaLength!==g||x.hemiLength!==f||x.numDirectionalShadows!==b||x.numPointShadows!==M||x.numSpotShadows!==v||x.numSpotMaps!==A||x.numLightProbes!==E)&&(n.directional.length=m,n.spot.length=y,n.rectArea.length=g,n.point.length=p,n.hemi.length=f,n.directionalShadow.length=b,n.directionalShadowMap.length=b,n.pointShadow.length=M,n.pointShadowMap.length=M,n.spotShadow.length=v,n.spotShadowMap.length=v,n.directionalShadowMatrix.length=b,n.pointShadowMatrix.length=M,n.spotLightMatrix.length=v+A-w,n.spotLightMap.length=A,n.numSpotLightShadowsWithMaps=w,n.numLightProbes=E,x.directionalLength=m,x.pointLength=p,x.spotLength=y,x.rectAreaLength=g,x.hemiLength=f,x.numDirectionalShadows=b,x.numPointShadows=M,x.numSpotShadows=v,x.numSpotMaps=A,x.numLightProbes=E,n.version=Rv++)}function l(c,h){let d=0,u=0,m=0,p=0,y=0,g=h.matrixWorldInverse;for(let f=0,b=c.length;f<b;f++){let M=c[f];if(M.isDirectionalLight){let v=n.directional[d];v.direction.setFromMatrixPosition(M.matrixWorld),s.setFromMatrixPosition(M.target.matrixWorld),v.direction.sub(s),v.direction.transformDirection(g),d++}else if(M.isSpotLight){let v=n.spot[m];v.position.setFromMatrixPosition(M.matrixWorld),v.position.applyMatrix4(g),v.direction.setFromMatrixPosition(M.matrixWorld),s.setFromMatrixPosition(M.target.matrixWorld),v.direction.sub(s),v.direction.transformDirection(g),m++}else if(M.isRectAreaLight){let v=n.rectArea[p];v.position.setFromMatrixPosition(M.matrixWorld),v.position.applyMatrix4(g),o.identity(),r.copy(M.matrixWorld),r.premultiply(g),o.extractRotation(r),v.halfWidth.set(M.width*.5,0,0),v.halfHeight.set(0,M.height*.5,0),v.halfWidth.applyMatrix4(o),v.halfHeight.applyMatrix4(o),p++}else if(M.isPointLight){let v=n.point[u];v.position.setFromMatrixPosition(M.matrixWorld),v.position.applyMatrix4(g),u++}else if(M.isHemisphereLight){let v=n.hemi[y];v.direction.setFromMatrixPosition(M.matrixWorld),v.direction.transformDirection(g),y++}}}return{setup:a,setupView:l,state:n}}function yf(i){let e=new Iv(i),t=[],n=[],s=[];function r(u){d.camera=u,t.length=0,n.length=0,s.length=0}function o(u){t.push(u)}function a(u){n.push(u)}function l(u){s.push(u)}function c(){e.setup(t)}function h(u){e.setupView(t,u)}let d={lightsArray:t,shadowsArray:n,lightProbeGridArray:s,camera:null,lights:e,transmissionRenderTarget:{},textureUnits:0};return{init:r,state:d,setupLights:c,setupLightsView:h,pushLight:o,pushShadow:a,pushLightProbeGrid:l}}function Lv(i){let e=new WeakMap;function t(s,r=0){let o=e.get(s),a;return o===void 0?(a=new yf(i),e.set(s,[a])):r>=o.length?(a=new yf(i),o.push(a)):a=o[r],a}function n(){e=new WeakMap}return{get:t,dispose:n}}var Dv=`void main() {
	gl_Position = vec4( position, 1.0 );
}`,Fv=`uniform sampler2D shadow_pass;
uniform vec2 resolution;
uniform float radius;
void main() {
	const float samples = float( VSM_SAMPLES );
	float mean = 0.0;
	float squared_mean = 0.0;
	float uvStride = samples <= 1.0 ? 0.0 : 2.0 / ( samples - 1.0 );
	float uvStart = samples <= 1.0 ? 0.0 : - 1.0;
	for ( float i = 0.0; i < samples; i ++ ) {
		float uvOffset = uvStart + i * uvStride;
		#ifdef HORIZONTAL_PASS
			vec2 distribution = texture2D( shadow_pass, ( gl_FragCoord.xy + vec2( uvOffset, 0.0 ) * radius ) / resolution ).rg;
			mean += distribution.x;
			squared_mean += distribution.y * distribution.y + distribution.x * distribution.x;
		#else
			float depth = texture2D( shadow_pass, ( gl_FragCoord.xy + vec2( 0.0, uvOffset ) * radius ) / resolution ).r;
			mean += depth;
			squared_mean += depth * depth;
		#endif
	}
	mean = mean / samples;
	squared_mean = squared_mean / samples;
	float std_dev = sqrt( max( 0.0, squared_mean - mean * mean ) );
	gl_FragColor = vec4( mean, std_dev, 0.0, 1.0 );
}`,Uv=[new N(1,0,0),new N(-1,0,0),new N(0,1,0),new N(0,-1,0),new N(0,0,1),new N(0,0,-1)],Nv=[new N(0,-1,0),new N(0,-1,0),new N(0,0,1),new N(0,0,-1),new N(0,-1,0),new N(0,-1,0)],vf=new at,Xr=new N,Rh=new N;function Ov(i,e,t){let n=new vr,s=new Ge,r=new Ge,o=new nt,a=new pa,l=new ma,c={},h=t.maxTextureSize,d={[ai]:jt,[jt]:ai,[rn]:rn},u=new kt({defines:{VSM_SAMPLES:8},uniforms:{shadow_pass:{value:null},resolution:{value:new Ge},radius:{value:4}},vertexShader:Dv,fragmentShader:Fv}),m=u.clone();m.defines.HORIZONTAL_PASS=1;let p=new It;p.setAttribute("position",new sn(new Float32Array([-1,-1,.5,3,-1,.5,-1,3,.5]),3));let y=new At(p,u),g=this;this.enabled=!1,this.autoUpdate=!0,this.needsUpdate=!1,this.type=Fr;let f=this.type;this.render=function(w,E,x){if(g.enabled===!1||g.autoUpdate===!1&&g.needsUpdate===!1||w.length===0)return;this.type===ud&&(Ae("WebGLShadowMap: PCFSoftShadowMap has been deprecated. Using PCFShadowMap instead."),this.type=Fr);let T=i.getRenderTarget(),C=i.getActiveCubeFace(),R=i.getActiveMipmapLevel(),L=i.state;L.setBlending(Xn),L.buffers.depth.getReversed()===!0?L.buffers.color.setClear(0,0,0,0):L.buffers.color.setClear(1,1,1,1),L.buffers.depth.setTest(!0),L.setScissorTest(!1);let I=f!==this.type;I&&E.traverse(function(V){V.material&&(Array.isArray(V.material)?V.material.forEach(D=>D.needsUpdate=!0):V.material.needsUpdate=!0)});for(let V=0,D=w.length;V<D;V++){let q=w[V],z=q.shadow;if(z===void 0){Ae("WebGLShadowMap:",q,"has no shadow.");continue}if(z.autoUpdate===!1&&z.needsUpdate===!1)continue;s.copy(z.mapSize);let K=z.getFrameExtents();s.multiply(K),r.copy(z.mapSize),(s.x>h||s.y>h)&&(s.x>h&&(r.x=Math.floor(h/K.x),s.x=r.x*K.x,z.mapSize.x=r.x),s.y>h&&(r.y=Math.floor(h/K.y),s.y=r.y*K.y,z.mapSize.y=r.y));let j=i.state.buffers.depth.getReversed();if(z.camera._reversedDepth=j,z.map===null||I===!0){if(z.map!==null&&(z.map.depthTexture!==null&&(z.map.depthTexture.dispose(),z.map.depthTexture=null),z.map.dispose()),this.type===Bs){if(q.isPointLight){Ae("WebGLShadowMap: VSM shadow maps are not supported for PointLights. Use PCF or BasicShadowMap instead.");continue}z.map=new hn(s.x,s.y,{format:Oi,type:qn,minFilter:zt,magFilter:zt,generateMipmaps:!1}),z.map.texture.name=q.name+".shadowMap",z.map.depthTexture=new li(s.x,s.y,Ln),z.map.depthTexture.name=q.name+".shadowMapDepth",z.map.depthTexture.format=Vn,z.map.depthTexture.compareFunction=null,z.map.depthTexture.minFilter=Ot,z.map.depthTexture.magFilter=Ot}else q.isPointLight?(z.map=new _l(s.x),z.map.depthTexture=new da(s.x,In)):(z.map=new hn(s.x,s.y),z.map.depthTexture=new li(s.x,s.y,In)),z.map.depthTexture.name=q.name+".shadowMap",z.map.depthTexture.format=Vn,this.type===Fr?(z.map.depthTexture.compareFunction=j?gl:ml,z.map.depthTexture.minFilter=zt,z.map.depthTexture.magFilter=zt):(z.map.depthTexture.compareFunction=null,z.map.depthTexture.minFilter=Ot,z.map.depthTexture.magFilter=Ot);z.camera.updateProjectionMatrix()}let se=z.map.isWebGLCubeRenderTarget?6:1;for(let fe=0;fe<se;fe++){if(z.map.isWebGLCubeRenderTarget)i.setRenderTarget(z.map,fe),i.clear();else{fe===0&&(i.setRenderTarget(z.map),i.clear());let ve=z.getViewport(fe);o.set(r.x*ve.x,r.y*ve.y,r.x*ve.z,r.y*ve.w),L.viewport(o)}if(q.isPointLight){let ve=z.camera,Ze=z.matrix,pt=q.distance||ve.far;pt!==ve.far&&(ve.far=pt,ve.updateProjectionMatrix()),Xr.setFromMatrixPosition(q.matrixWorld),ve.position.copy(Xr),Rh.copy(ve.position),Rh.add(Uv[fe]),ve.up.copy(Nv[fe]),ve.lookAt(Rh),ve.updateMatrixWorld(),Ze.makeTranslation(-Xr.x,-Xr.y,-Xr.z),vf.multiplyMatrices(ve.projectionMatrix,ve.matrixWorldInverse),z._frustum.setFromProjectionMatrix(vf,ve.coordinateSystem,ve.reversedDepth)}else z.updateMatrices(q);n=z.getFrustum(),v(E,x,z.camera,q,this.type)}z.isPointLightShadow!==!0&&this.type===Bs&&b(z,x),z.needsUpdate=!1}f=this.type,g.needsUpdate=!1,i.setRenderTarget(T,C,R)};function b(w,E){let x=e.update(y);u.defines.VSM_SAMPLES!==w.blurSamples&&(u.defines.VSM_SAMPLES=w.blurSamples,m.defines.VSM_SAMPLES=w.blurSamples,u.needsUpdate=!0,m.needsUpdate=!0),w.mapPass===null&&(w.mapPass=new hn(s.x,s.y,{format:Oi,type:qn})),u.uniforms.shadow_pass.value=w.map.depthTexture,u.uniforms.resolution.value=w.mapSize,u.uniforms.radius.value=w.radius,i.setRenderTarget(w.mapPass),i.clear(),i.renderBufferDirect(E,null,x,u,y,null),m.uniforms.shadow_pass.value=w.mapPass.texture,m.uniforms.resolution.value=w.mapSize,m.uniforms.radius.value=w.radius,i.setRenderTarget(w.map),i.clear(),i.renderBufferDirect(E,null,x,m,y,null)}function M(w,E,x,T){let C=null,R=x.isPointLight===!0?w.customDistanceMaterial:w.customDepthMaterial;if(R!==void 0)C=R;else if(C=x.isPointLight===!0?l:a,i.localClippingEnabled&&E.clipShadows===!0&&Array.isArray(E.clippingPlanes)&&E.clippingPlanes.length!==0||E.displacementMap&&E.displacementScale!==0||E.alphaMap&&E.alphaTest>0||E.map&&E.alphaTest>0||E.alphaToCoverage===!0){let L=C.uuid,I=E.uuid,V=c[L];V===void 0&&(V={},c[L]=V);let D=V[I];D===void 0&&(D=C.clone(),V[I]=D,E.addEventListener("dispose",A)),C=D}if(C.visible=E.visible,C.wireframe=E.wireframe,T===Bs?C.side=E.shadowSide!==null?E.shadowSide:E.side:C.side=E.shadowSide!==null?E.shadowSide:d[E.side],C.alphaMap=E.alphaMap,C.alphaTest=E.alphaToCoverage===!0?.5:E.alphaTest,C.map=E.map,C.clipShadows=E.clipShadows,C.clippingPlanes=E.clippingPlanes,C.clipIntersection=E.clipIntersection,C.displacementMap=E.displacementMap,C.displacementScale=E.displacementScale,C.displacementBias=E.displacementBias,C.wireframeLinewidth=E.wireframeLinewidth,C.linewidth=E.linewidth,x.isPointLight===!0&&C.isMeshDistanceMaterial===!0){let L=i.properties.get(C);L.light=x}return C}function v(w,E,x,T,C){if(w.visible===!1)return;if(w.layers.test(E.layers)&&(w.isMesh||w.isLine||w.isPoints)&&(w.castShadow||w.receiveShadow&&C===Bs)&&(!w.frustumCulled||n.intersectsObject(w))){w.modelViewMatrix.multiplyMatrices(x.matrixWorldInverse,w.matrixWorld);let I=e.update(w),V=w.material;if(Array.isArray(V)){let D=I.groups;for(let q=0,z=D.length;q<z;q++){let K=D[q],j=V[K.materialIndex];if(j&&j.visible){let se=M(w,j,T,C);w.onBeforeShadow(i,w,E,x,I,se,K),i.renderBufferDirect(x,null,I,se,w,K),w.onAfterShadow(i,w,E,x,I,se,K)}}}else if(V.visible){let D=M(w,V,T,C);w.onBeforeShadow(i,w,E,x,I,D,null),i.renderBufferDirect(x,null,I,D,w,null),w.onAfterShadow(i,w,E,x,I,D,null)}}let L=w.children;for(let I=0,V=L.length;I<V;I++)v(L[I],E,x,T,C)}function A(w){w.target.removeEventListener("dispose",A);for(let x in c){let T=c[x],C=w.target.uuid;C in T&&(T[C].dispose(),delete T[C])}}}function Bv(i,e){function t(){let F=!1,oe=new nt,Z=null,ue=new nt(0,0,0,0);return{setMask:function(ge){Z!==ge&&!F&&(i.colorMask(ge,ge,ge,ge),Z=ge)},setLocked:function(ge){F=ge},setClear:function(ge,ee,Me,_e,gt){gt===!0&&(ge*=_e,ee*=_e,Me*=_e),oe.set(ge,ee,Me,_e),ue.equals(oe)===!1&&(i.clearColor(ge,ee,Me,_e),ue.copy(oe))},reset:function(){F=!1,Z=null,ue.set(-1,0,0,0)}}}function n(){let F=!1,oe=!1,Z=null,ue=null,ge=null;return{setReversed:function(ee){if(oe!==ee){let Me=e.get("EXT_clip_control");ee?Me.clipControlEXT(Me.LOWER_LEFT_EXT,Me.ZERO_TO_ONE_EXT):Me.clipControlEXT(Me.LOWER_LEFT_EXT,Me.NEGATIVE_ONE_TO_ONE_EXT),oe=ee;let _e=ge;ge=null,this.setClear(_e)}},getReversed:function(){return oe},setTest:function(ee){ee?ne(i.DEPTH_TEST):De(i.DEPTH_TEST)},setMask:function(ee){Z!==ee&&!F&&(i.depthMask(ee),Z=ee)},setFunc:function(ee){if(oe&&(ee=Wd[ee]),ue!==ee){switch(ee){case $o:i.depthFunc(i.NEVER);break;case Ko:i.depthFunc(i.ALWAYS);break;case Zo:i.depthFunc(i.LESS);break;case Qi:i.depthFunc(i.LEQUAL);break;case Jo:i.depthFunc(i.EQUAL);break;case jo:i.depthFunc(i.GEQUAL);break;case Qo:i.depthFunc(i.GREATER);break;case ea:i.depthFunc(i.NOTEQUAL);break;default:i.depthFunc(i.LEQUAL)}ue=ee}},setLocked:function(ee){F=ee},setClear:function(ee){ge!==ee&&(ge=ee,oe&&(ee=1-ee),i.clearDepth(ee))},reset:function(){F=!1,Z=null,ue=null,ge=null,oe=!1}}}function s(){let F=!1,oe=null,Z=null,ue=null,ge=null,ee=null,Me=null,_e=null,gt=null;return{setTest:function(ct){F||(ct?ne(i.STENCIL_TEST):De(i.STENCIL_TEST))},setMask:function(ct){oe!==ct&&!F&&(i.stencilMask(ct),oe=ct)},setFunc:function(ct,Fn,Un){(Z!==ct||ue!==Fn||ge!==Un)&&(i.stencilFunc(ct,Fn,Un),Z=ct,ue=Fn,ge=Un)},setOp:function(ct,Fn,Un){(ee!==ct||Me!==Fn||_e!==Un)&&(i.stencilOp(ct,Fn,Un),ee=ct,Me=Fn,_e=Un)},setLocked:function(ct){F=ct},setClear:function(ct){gt!==ct&&(i.clearStencil(ct),gt=ct)},reset:function(){F=!1,oe=null,Z=null,ue=null,ge=null,ee=null,Me=null,_e=null,gt=null}}}let r=new t,o=new n,a=new s,l=new WeakMap,c=new WeakMap,h={},d={},u={},m=new WeakMap,p=[],y=null,g=!1,f=null,b=null,M=null,v=null,A=null,w=null,E=null,x=new We(0,0,0),T=0,C=!1,R=null,L=null,I=null,V=null,D=null,q=i.getParameter(i.MAX_COMBINED_TEXTURE_IMAGE_UNITS),z=!1,K=0,j=i.getParameter(i.VERSION);j.indexOf("WebGL")!==-1?(K=parseFloat(/^WebGL (\d)/.exec(j)[1]),z=K>=1):j.indexOf("OpenGL ES")!==-1&&(K=parseFloat(/^OpenGL ES (\d)/.exec(j)[1]),z=K>=2);let se=null,fe={},ve=i.getParameter(i.SCISSOR_BOX),Ze=i.getParameter(i.VIEWPORT),pt=new nt().fromArray(ve),Je=new nt().fromArray(Ze);function Q(F,oe,Z,ue){let ge=new Uint8Array(4),ee=i.createTexture();i.bindTexture(F,ee),i.texParameteri(F,i.TEXTURE_MIN_FILTER,i.NEAREST),i.texParameteri(F,i.TEXTURE_MAG_FILTER,i.NEAREST);for(let Me=0;Me<Z;Me++)F===i.TEXTURE_3D||F===i.TEXTURE_2D_ARRAY?i.texImage3D(oe,0,i.RGBA,1,1,ue,0,i.RGBA,i.UNSIGNED_BYTE,ge):i.texImage2D(oe+Me,0,i.RGBA,1,1,0,i.RGBA,i.UNSIGNED_BYTE,ge);return ee}let ae={};ae[i.TEXTURE_2D]=Q(i.TEXTURE_2D,i.TEXTURE_2D,1),ae[i.TEXTURE_CUBE_MAP]=Q(i.TEXTURE_CUBE_MAP,i.TEXTURE_CUBE_MAP_POSITIVE_X,6),ae[i.TEXTURE_2D_ARRAY]=Q(i.TEXTURE_2D_ARRAY,i.TEXTURE_2D_ARRAY,1,1),ae[i.TEXTURE_3D]=Q(i.TEXTURE_3D,i.TEXTURE_3D,1,1),r.setClear(0,0,0,1),o.setClear(1),a.setClear(0),ne(i.DEPTH_TEST),o.setFunc(Qi),wt(!1),Pt(Xc),ne(i.CULL_FACE),je(Xn);function ne(F){h[F]!==!0&&(i.enable(F),h[F]=!0)}function De(F){h[F]!==!1&&(i.disable(F),h[F]=!1)}function Oe(F,oe){return u[F]!==oe?(i.bindFramebuffer(F,oe),u[F]=oe,F===i.DRAW_FRAMEBUFFER&&(u[i.FRAMEBUFFER]=oe),F===i.FRAMEBUFFER&&(u[i.DRAW_FRAMEBUFFER]=oe),!0):!1}function Ce(F,oe){let Z=p,ue=!1;if(F){Z=m.get(oe),Z===void 0&&(Z=[],m.set(oe,Z));let ge=F.textures;if(Z.length!==ge.length||Z[0]!==i.COLOR_ATTACHMENT0){for(let ee=0,Me=ge.length;ee<Me;ee++)Z[ee]=i.COLOR_ATTACHMENT0+ee;Z.length=ge.length,ue=!0}}else Z[0]!==i.BACK&&(Z[0]=i.BACK,ue=!0);ue&&i.drawBuffers(Z)}function _t(F){return y!==F?(i.useProgram(F),y=F,!0):!1}let Xe={[Ai]:i.FUNC_ADD,[fd]:i.FUNC_SUBTRACT,[pd]:i.FUNC_REVERSE_SUBTRACT};Xe[md]=i.MIN,Xe[gd]=i.MAX;let st={[xd]:i.ZERO,[yd]:i.ONE,[vd]:i.SRC_COLOR,[qo]:i.SRC_ALPHA,[Ed]:i.SRC_ALPHA_SATURATE,[Sd]:i.DST_COLOR,[bd]:i.DST_ALPHA,[_d]:i.ONE_MINUS_SRC_COLOR,[Yo]:i.ONE_MINUS_SRC_ALPHA,[wd]:i.ONE_MINUS_DST_COLOR,[Md]:i.ONE_MINUS_DST_ALPHA,[Td]:i.CONSTANT_COLOR,[Ad]:i.ONE_MINUS_CONSTANT_COLOR,[Pd]:i.CONSTANT_ALPHA,[Rd]:i.ONE_MINUS_CONSTANT_ALPHA};function je(F,oe,Z,ue,ge,ee,Me,_e,gt,ct){if(F===Xn){g===!0&&(De(i.BLEND),g=!1);return}if(g===!1&&(ne(i.BLEND),g=!0),F!==dd){if(F!==f||ct!==C){if((b!==Ai||A!==Ai)&&(i.blendEquation(i.FUNC_ADD),b=Ai,A=Ai),ct)switch(F){case ji:i.blendFuncSeparate(i.ONE,i.ONE_MINUS_SRC_ALPHA,i.ONE,i.ONE_MINUS_SRC_ALPHA);break;case qc:i.blendFunc(i.ONE,i.ONE);break;case Yc:i.blendFuncSeparate(i.ZERO,i.ONE_MINUS_SRC_COLOR,i.ZERO,i.ONE);break;case $c:i.blendFuncSeparate(i.DST_COLOR,i.ONE_MINUS_SRC_ALPHA,i.ZERO,i.ONE);break;default:Le("WebGLState: Invalid blending: ",F);break}else switch(F){case ji:i.blendFuncSeparate(i.SRC_ALPHA,i.ONE_MINUS_SRC_ALPHA,i.ONE,i.ONE_MINUS_SRC_ALPHA);break;case qc:i.blendFuncSeparate(i.SRC_ALPHA,i.ONE,i.ONE,i.ONE);break;case Yc:Le("WebGLState: SubtractiveBlending requires material.premultipliedAlpha = true");break;case $c:Le("WebGLState: MultiplyBlending requires material.premultipliedAlpha = true");break;default:Le("WebGLState: Invalid blending: ",F);break}M=null,v=null,w=null,E=null,x.set(0,0,0),T=0,f=F,C=ct}return}ge=ge||oe,ee=ee||Z,Me=Me||ue,(oe!==b||ge!==A)&&(i.blendEquationSeparate(Xe[oe],Xe[ge]),b=oe,A=ge),(Z!==M||ue!==v||ee!==w||Me!==E)&&(i.blendFuncSeparate(st[Z],st[ue],st[ee],st[Me]),M=Z,v=ue,w=ee,E=Me),(_e.equals(x)===!1||gt!==T)&&(i.blendColor(_e.r,_e.g,_e.b,gt),x.copy(_e),T=gt),f=F,C=!1}function $e(F,oe){F.side===rn?De(i.CULL_FACE):ne(i.CULL_FACE);let Z=F.side===jt;oe&&(Z=!Z),wt(Z),F.blending===ji&&F.transparent===!1?je(Xn):je(F.blending,F.blendEquation,F.blendSrc,F.blendDst,F.blendEquationAlpha,F.blendSrcAlpha,F.blendDstAlpha,F.blendColor,F.blendAlpha,F.premultipliedAlpha),o.setFunc(F.depthFunc),o.setTest(F.depthTest),o.setMask(F.depthWrite),r.setMask(F.colorWrite);let ue=F.stencilWrite;a.setTest(ue),ue&&(a.setMask(F.stencilWriteMask),a.setFunc(F.stencilFunc,F.stencilRef,F.stencilFuncMask),a.setOp(F.stencilFail,F.stencilZFail,F.stencilZPass)),Bt(F.polygonOffset,F.polygonOffsetFactor,F.polygonOffsetUnits),F.alphaToCoverage===!0?ne(i.SAMPLE_ALPHA_TO_COVERAGE):De(i.SAMPLE_ALPHA_TO_COVERAGE)}function wt(F){R!==F&&(F?i.frontFace(i.CW):i.frontFace(i.CCW),R=F)}function Pt(F){F!==cd?(ne(i.CULL_FACE),F!==L&&(F===Xc?i.cullFace(i.BACK):F===hd?i.cullFace(i.FRONT):i.cullFace(i.FRONT_AND_BACK))):De(i.CULL_FACE),L=F}function Ut(F){F!==I&&(z&&i.lineWidth(F),I=F)}function Bt(F,oe,Z){F?(ne(i.POLYGON_OFFSET_FILL),(V!==oe||D!==Z)&&(V=oe,D=Z,o.getReversed()&&(oe=-oe),i.polygonOffset(oe,Z))):De(i.POLYGON_OFFSET_FILL)}function mt(F){F?ne(i.SCISSOR_TEST):De(i.SCISSOR_TEST)}function Et(F){F===void 0&&(F=i.TEXTURE0+q-1),se!==F&&(i.activeTexture(F),se=F)}function O(F,oe,Z){Z===void 0&&(se===null?Z=i.TEXTURE0+q-1:Z=se);let ue=fe[Z];ue===void 0&&(ue={type:void 0,texture:void 0},fe[Z]=ue),(ue.type!==F||ue.texture!==oe)&&(se!==Z&&(i.activeTexture(Z),se=Z),i.bindTexture(F,oe||ae[F]),ue.type=F,ue.texture=oe)}function en(){let F=fe[se];F!==void 0&&F.type!==void 0&&(i.bindTexture(F.type,null),F.type=void 0,F.texture=void 0)}function et(){try{i.compressedTexImage2D(...arguments)}catch(F){Le("WebGLState:",F)}}function P(){try{i.compressedTexImage3D(...arguments)}catch(F){Le("WebGLState:",F)}}function _(){try{i.texSubImage2D(...arguments)}catch(F){Le("WebGLState:",F)}}function k(){try{i.texSubImage3D(...arguments)}catch(F){Le("WebGLState:",F)}}function W(){try{i.compressedTexSubImage2D(...arguments)}catch(F){Le("WebGLState:",F)}}function Y(){try{i.compressedTexSubImage3D(...arguments)}catch(F){Le("WebGLState:",F)}}function ie(){try{i.texStorage2D(...arguments)}catch(F){Le("WebGLState:",F)}}function le(){try{i.texStorage3D(...arguments)}catch(F){Le("WebGLState:",F)}}function $(){try{i.texImage2D(...arguments)}catch(F){Le("WebGLState:",F)}}function J(){try{i.texImage3D(...arguments)}catch(F){Le("WebGLState:",F)}}function ce(F){return d[F]!==void 0?d[F]:i.getParameter(F)}function Se(F,oe){d[F]!==oe&&(i.pixelStorei(F,oe),d[F]=oe)}function de(F){pt.equals(F)===!1&&(i.scissor(F.x,F.y,F.z,F.w),pt.copy(F))}function he(F){Je.equals(F)===!1&&(i.viewport(F.x,F.y,F.z,F.w),Je.copy(F))}function Te(F,oe){let Z=c.get(oe);Z===void 0&&(Z=new WeakMap,c.set(oe,Z));let ue=Z.get(F);ue===void 0&&(ue=i.getUniformBlockIndex(oe,F.name),Z.set(F,ue))}function Ie(F,oe){let ue=c.get(oe).get(F);l.get(oe)!==ue&&(i.uniformBlockBinding(oe,ue,F.__bindingPointIndex),l.set(oe,ue))}function Be(){i.disable(i.BLEND),i.disable(i.CULL_FACE),i.disable(i.DEPTH_TEST),i.disable(i.POLYGON_OFFSET_FILL),i.disable(i.SCISSOR_TEST),i.disable(i.STENCIL_TEST),i.disable(i.SAMPLE_ALPHA_TO_COVERAGE),i.blendEquation(i.FUNC_ADD),i.blendFunc(i.ONE,i.ZERO),i.blendFuncSeparate(i.ONE,i.ZERO,i.ONE,i.ZERO),i.blendColor(0,0,0,0),i.colorMask(!0,!0,!0,!0),i.clearColor(0,0,0,0),i.depthMask(!0),i.depthFunc(i.LESS),o.setReversed(!1),i.clearDepth(1),i.stencilMask(4294967295),i.stencilFunc(i.ALWAYS,0,4294967295),i.stencilOp(i.KEEP,i.KEEP,i.KEEP),i.clearStencil(0),i.cullFace(i.BACK),i.frontFace(i.CCW),i.polygonOffset(0,0),i.activeTexture(i.TEXTURE0),i.bindFramebuffer(i.FRAMEBUFFER,null),i.bindFramebuffer(i.DRAW_FRAMEBUFFER,null),i.bindFramebuffer(i.READ_FRAMEBUFFER,null),i.useProgram(null),i.lineWidth(1),i.scissor(0,0,i.canvas.width,i.canvas.height),i.viewport(0,0,i.canvas.width,i.canvas.height),i.pixelStorei(i.PACK_ALIGNMENT,4),i.pixelStorei(i.UNPACK_ALIGNMENT,4),i.pixelStorei(i.UNPACK_FLIP_Y_WEBGL,!1),i.pixelStorei(i.UNPACK_PREMULTIPLY_ALPHA_WEBGL,!1),i.pixelStorei(i.UNPACK_COLORSPACE_CONVERSION_WEBGL,i.BROWSER_DEFAULT_WEBGL),i.pixelStorei(i.PACK_ROW_LENGTH,0),i.pixelStorei(i.PACK_SKIP_PIXELS,0),i.pixelStorei(i.PACK_SKIP_ROWS,0),i.pixelStorei(i.UNPACK_ROW_LENGTH,0),i.pixelStorei(i.UNPACK_IMAGE_HEIGHT,0),i.pixelStorei(i.UNPACK_SKIP_PIXELS,0),i.pixelStorei(i.UNPACK_SKIP_ROWS,0),i.pixelStorei(i.UNPACK_SKIP_IMAGES,0),h={},d={},se=null,fe={},u={},m=new WeakMap,p=[],y=null,g=!1,f=null,b=null,M=null,v=null,A=null,w=null,E=null,x=new We(0,0,0),T=0,C=!1,R=null,L=null,I=null,V=null,D=null,pt.set(0,0,i.canvas.width,i.canvas.height),Je.set(0,0,i.canvas.width,i.canvas.height),r.reset(),o.reset(),a.reset()}return{buffers:{color:r,depth:o,stencil:a},enable:ne,disable:De,bindFramebuffer:Oe,drawBuffers:Ce,useProgram:_t,setBlending:je,setMaterial:$e,setFlipSided:wt,setCullFace:Pt,setLineWidth:Ut,setPolygonOffset:Bt,setScissorTest:mt,activeTexture:Et,bindTexture:O,unbindTexture:en,compressedTexImage2D:et,compressedTexImage3D:P,texImage2D:$,texImage3D:J,pixelStorei:Se,getParameter:ce,updateUBOMapping:Te,uniformBlockBinding:Ie,texStorage2D:ie,texStorage3D:le,texSubImage2D:_,texSubImage3D:k,compressedTexSubImage2D:W,compressedTexSubImage3D:Y,scissor:de,viewport:he,reset:Be}}function zv(i,e,t,n,s,r,o){let a=e.has("WEBGL_multisampled_render_to_texture")?e.get("WEBGL_multisampled_render_to_texture"):null,l=typeof navigator>"u"?!1:/OculusBrowser/g.test(navigator.userAgent),c=new Ge,h=new WeakMap,d=new Set,u,m=new WeakMap,p=!1;try{p=typeof OffscreenCanvas<"u"&&new OffscreenCanvas(1,1).getContext("2d")!==null}catch{}function y(P,_){return p?new OffscreenCanvas(P,_):ur("canvas")}function g(P,_,k){let W=1,Y=et(P);if((Y.width>k||Y.height>k)&&(W=k/Math.max(Y.width,Y.height)),W<1)if(typeof HTMLImageElement<"u"&&P instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&P instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&P instanceof ImageBitmap||typeof VideoFrame<"u"&&P instanceof VideoFrame){let ie=Math.floor(W*Y.width),le=Math.floor(W*Y.height);u===void 0&&(u=y(ie,le));let $=_?y(ie,le):u;return $.width=ie,$.height=le,$.getContext("2d").drawImage(P,0,0,ie,le),Ae("WebGLRenderer: Texture has been resized from ("+Y.width+"x"+Y.height+") to ("+ie+"x"+le+")."),$}else return"data"in P&&Ae("WebGLRenderer: Image in DataTexture is too big ("+Y.width+"x"+Y.height+")."),P;return P}function f(P){return P.generateMipmaps}function b(P){i.generateMipmap(P)}function M(P){return P.isWebGLCubeRenderTarget?i.TEXTURE_CUBE_MAP:P.isWebGL3DRenderTarget?i.TEXTURE_3D:P.isWebGLArrayRenderTarget||P.isCompressedArrayTexture?i.TEXTURE_2D_ARRAY:i.TEXTURE_2D}function v(P,_,k,W,Y,ie=!1){if(P!==null){if(i[P]!==void 0)return i[P];Ae("WebGLRenderer: Attempt to use non-existing WebGL internal format '"+P+"'")}let le;W&&(le=e.get("EXT_texture_norm16"),le||Ae("WebGLRenderer: Unable to use normalized textures without EXT_texture_norm16 extension"));let $=_;if(_===i.RED&&(k===i.FLOAT&&($=i.R32F),k===i.HALF_FLOAT&&($=i.R16F),k===i.UNSIGNED_BYTE&&($=i.R8),k===i.UNSIGNED_SHORT&&le&&($=le.R16_EXT),k===i.SHORT&&le&&($=le.R16_SNORM_EXT)),_===i.RED_INTEGER&&(k===i.UNSIGNED_BYTE&&($=i.R8UI),k===i.UNSIGNED_SHORT&&($=i.R16UI),k===i.UNSIGNED_INT&&($=i.R32UI),k===i.BYTE&&($=i.R8I),k===i.SHORT&&($=i.R16I),k===i.INT&&($=i.R32I)),_===i.RG&&(k===i.FLOAT&&($=i.RG32F),k===i.HALF_FLOAT&&($=i.RG16F),k===i.UNSIGNED_BYTE&&($=i.RG8),k===i.UNSIGNED_SHORT&&le&&($=le.RG16_EXT),k===i.SHORT&&le&&($=le.RG16_SNORM_EXT)),_===i.RG_INTEGER&&(k===i.UNSIGNED_BYTE&&($=i.RG8UI),k===i.UNSIGNED_SHORT&&($=i.RG16UI),k===i.UNSIGNED_INT&&($=i.RG32UI),k===i.BYTE&&($=i.RG8I),k===i.SHORT&&($=i.RG16I),k===i.INT&&($=i.RG32I)),_===i.RGB_INTEGER&&(k===i.UNSIGNED_BYTE&&($=i.RGB8UI),k===i.UNSIGNED_SHORT&&($=i.RGB16UI),k===i.UNSIGNED_INT&&($=i.RGB32UI),k===i.BYTE&&($=i.RGB8I),k===i.SHORT&&($=i.RGB16I),k===i.INT&&($=i.RGB32I)),_===i.RGBA_INTEGER&&(k===i.UNSIGNED_BYTE&&($=i.RGBA8UI),k===i.UNSIGNED_SHORT&&($=i.RGBA16UI),k===i.UNSIGNED_INT&&($=i.RGBA32UI),k===i.BYTE&&($=i.RGBA8I),k===i.SHORT&&($=i.RGBA16I),k===i.INT&&($=i.RGBA32I)),_===i.RGB&&(k===i.UNSIGNED_SHORT&&le&&($=le.RGB16_EXT),k===i.SHORT&&le&&($=le.RGB16_SNORM_EXT),k===i.UNSIGNED_INT_5_9_9_9_REV&&($=i.RGB9_E5),k===i.UNSIGNED_INT_10F_11F_11F_REV&&($=i.R11F_G11F_B10F)),_===i.RGBA){let J=ie?cr:qe.getTransfer(Y);k===i.FLOAT&&($=i.RGBA32F),k===i.HALF_FLOAT&&($=i.RGBA16F),k===i.UNSIGNED_BYTE&&($=J===Qe?i.SRGB8_ALPHA8:i.RGBA8),k===i.UNSIGNED_SHORT&&le&&($=le.RGBA16_EXT),k===i.SHORT&&le&&($=le.RGBA16_SNORM_EXT),k===i.UNSIGNED_SHORT_4_4_4_4&&($=i.RGBA4),k===i.UNSIGNED_SHORT_5_5_5_1&&($=i.RGB5_A1)}return($===i.R16F||$===i.R32F||$===i.RG16F||$===i.RG32F||$===i.RGBA16F||$===i.RGBA32F)&&e.get("EXT_color_buffer_float"),$}function A(P,_){let k;return P?_===null||_===In||_===ks?k=i.DEPTH24_STENCIL8:_===Ln?k=i.DEPTH32F_STENCIL8:_===zs&&(k=i.DEPTH24_STENCIL8,Ae("DepthTexture: 16 bit depth attachment is not supported with stencil. Using 24-bit attachment.")):_===null||_===In||_===ks?k=i.DEPTH_COMPONENT24:_===Ln?k=i.DEPTH_COMPONENT32F:_===zs&&(k=i.DEPTH_COMPONENT16),k}function w(P,_){return f(P)===!0||P.isFramebufferTexture&&P.minFilter!==Ot&&P.minFilter!==zt?Math.log2(Math.max(_.width,_.height))+1:P.mipmaps!==void 0&&P.mipmaps.length>0?P.mipmaps.length:P.isCompressedTexture&&Array.isArray(P.image)?_.mipmaps.length:1}function E(P){let _=P.target;_.removeEventListener("dispose",E),T(_),_.isVideoTexture&&h.delete(_),_.isHTMLTexture&&d.delete(_)}function x(P){let _=P.target;_.removeEventListener("dispose",x),R(_)}function T(P){let _=n.get(P);if(_.__webglInit===void 0)return;let k=P.source,W=m.get(k);if(W){let Y=W[_.__cacheKey];Y.usedTimes--,Y.usedTimes===0&&C(P),Object.keys(W).length===0&&m.delete(k)}n.remove(P)}function C(P){let _=n.get(P);i.deleteTexture(_.__webglTexture);let k=P.source,W=m.get(k);delete W[_.__cacheKey],o.memory.textures--}function R(P){let _=n.get(P);if(P.depthTexture&&(P.depthTexture.dispose(),n.remove(P.depthTexture)),P.isWebGLCubeRenderTarget)for(let W=0;W<6;W++){if(Array.isArray(_.__webglFramebuffer[W]))for(let Y=0;Y<_.__webglFramebuffer[W].length;Y++)i.deleteFramebuffer(_.__webglFramebuffer[W][Y]);else i.deleteFramebuffer(_.__webglFramebuffer[W]);_.__webglDepthbuffer&&i.deleteRenderbuffer(_.__webglDepthbuffer[W])}else{if(Array.isArray(_.__webglFramebuffer))for(let W=0;W<_.__webglFramebuffer.length;W++)i.deleteFramebuffer(_.__webglFramebuffer[W]);else i.deleteFramebuffer(_.__webglFramebuffer);if(_.__webglDepthbuffer&&i.deleteRenderbuffer(_.__webglDepthbuffer),_.__webglMultisampledFramebuffer&&i.deleteFramebuffer(_.__webglMultisampledFramebuffer),_.__webglColorRenderbuffer)for(let W=0;W<_.__webglColorRenderbuffer.length;W++)_.__webglColorRenderbuffer[W]&&i.deleteRenderbuffer(_.__webglColorRenderbuffer[W]);_.__webglDepthRenderbuffer&&i.deleteRenderbuffer(_.__webglDepthRenderbuffer)}let k=P.textures;for(let W=0,Y=k.length;W<Y;W++){let ie=n.get(k[W]);ie.__webglTexture&&(i.deleteTexture(ie.__webglTexture),o.memory.textures--),n.remove(k[W])}n.remove(P)}let L=0;function I(){L=0}function V(){return L}function D(P){L=P}function q(){let P=L;return P>=s.maxTextures&&Ae("WebGLTextures: Trying to use "+P+" texture units while this GPU supports only "+s.maxTextures),L+=1,P}function z(P){let _=[];return _.push(P.wrapS),_.push(P.wrapT),_.push(P.wrapR||0),_.push(P.magFilter),_.push(P.minFilter),_.push(P.anisotropy),_.push(P.internalFormat),_.push(P.format),_.push(P.type),_.push(P.generateMipmaps),_.push(P.premultiplyAlpha),_.push(P.flipY),_.push(P.unpackAlignment),_.push(P.colorSpace),_.join()}function K(P,_){let k=n.get(P);if(P.isVideoTexture&&O(P),P.isRenderTargetTexture===!1&&P.isExternalTexture!==!0&&P.version>0&&k.__version!==P.version){let W=P.image;if(W===null)Ae("WebGLRenderer: Texture marked for update but no image data found.");else if(W.complete===!1)Ae("WebGLRenderer: Texture marked for update but image is incomplete");else{De(k,P,_);return}}else P.isExternalTexture&&(k.__webglTexture=P.sourceTexture?P.sourceTexture:null);t.bindTexture(i.TEXTURE_2D,k.__webglTexture,i.TEXTURE0+_)}function j(P,_){let k=n.get(P);if(P.isRenderTargetTexture===!1&&P.version>0&&k.__version!==P.version){De(k,P,_);return}else P.isExternalTexture&&(k.__webglTexture=P.sourceTexture?P.sourceTexture:null);t.bindTexture(i.TEXTURE_2D_ARRAY,k.__webglTexture,i.TEXTURE0+_)}function se(P,_){let k=n.get(P);if(P.isRenderTargetTexture===!1&&P.version>0&&k.__version!==P.version){De(k,P,_);return}t.bindTexture(i.TEXTURE_3D,k.__webglTexture,i.TEXTURE0+_)}function fe(P,_){let k=n.get(P);if(P.isCubeDepthTexture!==!0&&P.version>0&&k.__version!==P.version){Oe(k,P,_);return}t.bindTexture(i.TEXTURE_CUBE_MAP,k.__webglTexture,i.TEXTURE0+_)}let ve={[ta]:i.REPEAT,[kn]:i.CLAMP_TO_EDGE,[na]:i.MIRRORED_REPEAT},Ze={[Ot]:i.NEAREST,[Ld]:i.NEAREST_MIPMAP_NEAREST,[Nr]:i.NEAREST_MIPMAP_LINEAR,[zt]:i.LINEAR,[La]:i.LINEAR_MIPMAP_NEAREST,[Ui]:i.LINEAR_MIPMAP_LINEAR},pt={[Ud]:i.NEVER,[kd]:i.ALWAYS,[Nd]:i.LESS,[ml]:i.LEQUAL,[Od]:i.EQUAL,[gl]:i.GEQUAL,[Bd]:i.GREATER,[zd]:i.NOTEQUAL};function Je(P,_){if(_.type===Ln&&e.has("OES_texture_float_linear")===!1&&(_.magFilter===zt||_.magFilter===La||_.magFilter===Nr||_.magFilter===Ui||_.minFilter===zt||_.minFilter===La||_.minFilter===Nr||_.minFilter===Ui)&&Ae("WebGLRenderer: Unable to use linear filtering with floating point textures. OES_texture_float_linear not supported on this device."),i.texParameteri(P,i.TEXTURE_WRAP_S,ve[_.wrapS]),i.texParameteri(P,i.TEXTURE_WRAP_T,ve[_.wrapT]),(P===i.TEXTURE_3D||P===i.TEXTURE_2D_ARRAY)&&i.texParameteri(P,i.TEXTURE_WRAP_R,ve[_.wrapR]),i.texParameteri(P,i.TEXTURE_MAG_FILTER,Ze[_.magFilter]),i.texParameteri(P,i.TEXTURE_MIN_FILTER,Ze[_.minFilter]),_.compareFunction&&(i.texParameteri(P,i.TEXTURE_COMPARE_MODE,i.COMPARE_REF_TO_TEXTURE),i.texParameteri(P,i.TEXTURE_COMPARE_FUNC,pt[_.compareFunction])),e.has("EXT_texture_filter_anisotropic")===!0){if(_.magFilter===Ot||_.minFilter!==Nr&&_.minFilter!==Ui||_.type===Ln&&e.has("OES_texture_float_linear")===!1)return;if(_.anisotropy>1||n.get(_).__currentAnisotropy){let k=e.get("EXT_texture_filter_anisotropic");i.texParameterf(P,k.TEXTURE_MAX_ANISOTROPY_EXT,Math.min(_.anisotropy,s.getMaxAnisotropy())),n.get(_).__currentAnisotropy=_.anisotropy}}}function Q(P,_){let k=!1;P.__webglInit===void 0&&(P.__webglInit=!0,_.addEventListener("dispose",E));let W=_.source,Y=m.get(W);Y===void 0&&(Y={},m.set(W,Y));let ie=z(_);if(ie!==P.__cacheKey){Y[ie]===void 0&&(Y[ie]={texture:i.createTexture(),usedTimes:0},o.memory.textures++,k=!0),Y[ie].usedTimes++;let le=Y[P.__cacheKey];le!==void 0&&(Y[P.__cacheKey].usedTimes--,le.usedTimes===0&&C(_)),P.__cacheKey=ie,P.__webglTexture=Y[ie].texture}return k}function ae(P,_,k){return Math.floor(Math.floor(P/k)/_)}function ne(P,_,k,W){let ie=P.updateRanges;if(ie.length===0)t.texSubImage2D(i.TEXTURE_2D,0,0,0,_.width,_.height,k,W,_.data);else{ie.sort((Se,de)=>Se.start-de.start);let le=0;for(let Se=1;Se<ie.length;Se++){let de=ie[le],he=ie[Se],Te=de.start+de.count,Ie=ae(he.start,_.width,4),Be=ae(de.start,_.width,4);he.start<=Te+1&&Ie===Be&&ae(he.start+he.count-1,_.width,4)===Ie?de.count=Math.max(de.count,he.start+he.count-de.start):(++le,ie[le]=he)}ie.length=le+1;let $=t.getParameter(i.UNPACK_ROW_LENGTH),J=t.getParameter(i.UNPACK_SKIP_PIXELS),ce=t.getParameter(i.UNPACK_SKIP_ROWS);t.pixelStorei(i.UNPACK_ROW_LENGTH,_.width);for(let Se=0,de=ie.length;Se<de;Se++){let he=ie[Se],Te=Math.floor(he.start/4),Ie=Math.ceil(he.count/4),Be=Te%_.width,F=Math.floor(Te/_.width),oe=Ie,Z=1;t.pixelStorei(i.UNPACK_SKIP_PIXELS,Be),t.pixelStorei(i.UNPACK_SKIP_ROWS,F),t.texSubImage2D(i.TEXTURE_2D,0,Be,F,oe,Z,k,W,_.data)}P.clearUpdateRanges(),t.pixelStorei(i.UNPACK_ROW_LENGTH,$),t.pixelStorei(i.UNPACK_SKIP_PIXELS,J),t.pixelStorei(i.UNPACK_SKIP_ROWS,ce)}}function De(P,_,k){let W=i.TEXTURE_2D;(_.isDataArrayTexture||_.isCompressedArrayTexture)&&(W=i.TEXTURE_2D_ARRAY),_.isData3DTexture&&(W=i.TEXTURE_3D);let Y=Q(P,_),ie=_.source;t.bindTexture(W,P.__webglTexture,i.TEXTURE0+k);let le=n.get(ie);if(ie.version!==le.__version||Y===!0){if(t.activeTexture(i.TEXTURE0+k),(typeof ImageBitmap<"u"&&_.image instanceof ImageBitmap)===!1){let Z=qe.getPrimaries(qe.workingColorSpace),ue=_.colorSpace===ci?null:qe.getPrimaries(_.colorSpace),ge=_.colorSpace===ci||Z===ue?i.NONE:i.BROWSER_DEFAULT_WEBGL;t.pixelStorei(i.UNPACK_FLIP_Y_WEBGL,_.flipY),t.pixelStorei(i.UNPACK_PREMULTIPLY_ALPHA_WEBGL,_.premultiplyAlpha),t.pixelStorei(i.UNPACK_COLORSPACE_CONVERSION_WEBGL,ge)}t.pixelStorei(i.UNPACK_ALIGNMENT,_.unpackAlignment);let J=g(_.image,!1,s.maxTextureSize);J=en(_,J);let ce=r.convert(_.format,_.colorSpace),Se=r.convert(_.type),de=v(_.internalFormat,ce,Se,_.normalized,_.colorSpace,_.isVideoTexture);Je(W,_);let he,Te=_.mipmaps,Ie=_.isVideoTexture!==!0,Be=le.__version===void 0||Y===!0,F=ie.dataReady,oe=w(_,J);if(_.isDepthTexture)de=A(_.format===Ni,_.type),Be&&(Ie?t.texStorage2D(i.TEXTURE_2D,1,de,J.width,J.height):t.texImage2D(i.TEXTURE_2D,0,de,J.width,J.height,0,ce,Se,null));else if(_.isDataTexture)if(Te.length>0){Ie&&Be&&t.texStorage2D(i.TEXTURE_2D,oe,de,Te[0].width,Te[0].height);for(let Z=0,ue=Te.length;Z<ue;Z++)he=Te[Z],Ie?F&&t.texSubImage2D(i.TEXTURE_2D,Z,0,0,he.width,he.height,ce,Se,he.data):t.texImage2D(i.TEXTURE_2D,Z,de,he.width,he.height,0,ce,Se,he.data);_.generateMipmaps=!1}else Ie?(Be&&t.texStorage2D(i.TEXTURE_2D,oe,de,J.width,J.height),F&&ne(_,J,ce,Se)):t.texImage2D(i.TEXTURE_2D,0,de,J.width,J.height,0,ce,Se,J.data);else if(_.isCompressedTexture)if(_.isCompressedArrayTexture){Ie&&Be&&t.texStorage3D(i.TEXTURE_2D_ARRAY,oe,de,Te[0].width,Te[0].height,J.depth);for(let Z=0,ue=Te.length;Z<ue;Z++)if(he=Te[Z],_.format!==bn)if(ce!==null)if(Ie){if(F)if(_.layerUpdates.size>0){let ge=yh(he.width,he.height,_.format,_.type);for(let ee of _.layerUpdates){let Me=he.data.subarray(ee*ge/he.data.BYTES_PER_ELEMENT,(ee+1)*ge/he.data.BYTES_PER_ELEMENT);t.compressedTexSubImage3D(i.TEXTURE_2D_ARRAY,Z,0,0,ee,he.width,he.height,1,ce,Me)}_.clearLayerUpdates()}else t.compressedTexSubImage3D(i.TEXTURE_2D_ARRAY,Z,0,0,0,he.width,he.height,J.depth,ce,he.data)}else t.compressedTexImage3D(i.TEXTURE_2D_ARRAY,Z,de,he.width,he.height,J.depth,0,he.data,0,0);else Ae("WebGLRenderer: Attempt to load unsupported compressed texture format in .uploadTexture()");else Ie?F&&t.texSubImage3D(i.TEXTURE_2D_ARRAY,Z,0,0,0,he.width,he.height,J.depth,ce,Se,he.data):t.texImage3D(i.TEXTURE_2D_ARRAY,Z,de,he.width,he.height,J.depth,0,ce,Se,he.data)}else{Ie&&Be&&t.texStorage2D(i.TEXTURE_2D,oe,de,Te[0].width,Te[0].height);for(let Z=0,ue=Te.length;Z<ue;Z++)he=Te[Z],_.format!==bn?ce!==null?Ie?F&&t.compressedTexSubImage2D(i.TEXTURE_2D,Z,0,0,he.width,he.height,ce,he.data):t.compressedTexImage2D(i.TEXTURE_2D,Z,de,he.width,he.height,0,he.data):Ae("WebGLRenderer: Attempt to load unsupported compressed texture format in .uploadTexture()"):Ie?F&&t.texSubImage2D(i.TEXTURE_2D,Z,0,0,he.width,he.height,ce,Se,he.data):t.texImage2D(i.TEXTURE_2D,Z,de,he.width,he.height,0,ce,Se,he.data)}else if(_.isDataArrayTexture)if(Ie){if(Be&&t.texStorage3D(i.TEXTURE_2D_ARRAY,oe,de,J.width,J.height,J.depth),F)if(_.layerUpdates.size>0){let Z=yh(J.width,J.height,_.format,_.type);for(let ue of _.layerUpdates){let ge=J.data.subarray(ue*Z/J.data.BYTES_PER_ELEMENT,(ue+1)*Z/J.data.BYTES_PER_ELEMENT);t.texSubImage3D(i.TEXTURE_2D_ARRAY,0,0,0,ue,J.width,J.height,1,ce,Se,ge)}_.clearLayerUpdates()}else t.texSubImage3D(i.TEXTURE_2D_ARRAY,0,0,0,0,J.width,J.height,J.depth,ce,Se,J.data)}else t.texImage3D(i.TEXTURE_2D_ARRAY,0,de,J.width,J.height,J.depth,0,ce,Se,J.data);else if(_.isData3DTexture)Ie?(Be&&t.texStorage3D(i.TEXTURE_3D,oe,de,J.width,J.height,J.depth),F&&t.texSubImage3D(i.TEXTURE_3D,0,0,0,0,J.width,J.height,J.depth,ce,Se,J.data)):t.texImage3D(i.TEXTURE_3D,0,de,J.width,J.height,J.depth,0,ce,Se,J.data);else if(_.isFramebufferTexture){if(Be)if(Ie)t.texStorage2D(i.TEXTURE_2D,oe,de,J.width,J.height);else{let Z=J.width,ue=J.height;for(let ge=0;ge<oe;ge++)t.texImage2D(i.TEXTURE_2D,ge,de,Z,ue,0,ce,Se,null),Z>>=1,ue>>=1}}else if(_.isHTMLTexture){if("texElementImage2D"in i){let Z=i.canvas;if(Z.hasAttribute("layoutsubtree")||Z.setAttribute("layoutsubtree","true"),J.parentNode!==Z){Z.appendChild(J),d.add(_),Z.onpaint=ue=>{let ge=ue.changedElements;for(let ee of d)ge.includes(ee.image)&&(ee.needsUpdate=!0)},Z.requestPaint();return}if(i.texElementImage2D.length===3)i.texElementImage2D(i.TEXTURE_2D,i.RGBA8,J);else{let ge=i.RGBA,ee=i.RGBA,Me=i.UNSIGNED_BYTE;i.texElementImage2D(i.TEXTURE_2D,0,ge,ee,Me,J)}i.texParameteri(i.TEXTURE_2D,i.TEXTURE_MIN_FILTER,i.LINEAR),i.texParameteri(i.TEXTURE_2D,i.TEXTURE_WRAP_S,i.CLAMP_TO_EDGE),i.texParameteri(i.TEXTURE_2D,i.TEXTURE_WRAP_T,i.CLAMP_TO_EDGE)}}else if(Te.length>0){if(Ie&&Be){let Z=et(Te[0]);t.texStorage2D(i.TEXTURE_2D,oe,de,Z.width,Z.height)}for(let Z=0,ue=Te.length;Z<ue;Z++)he=Te[Z],Ie?F&&t.texSubImage2D(i.TEXTURE_2D,Z,0,0,ce,Se,he):t.texImage2D(i.TEXTURE_2D,Z,de,ce,Se,he);_.generateMipmaps=!1}else if(Ie){if(Be){let Z=et(J);t.texStorage2D(i.TEXTURE_2D,oe,de,Z.width,Z.height)}F&&t.texSubImage2D(i.TEXTURE_2D,0,0,0,ce,Se,J)}else t.texImage2D(i.TEXTURE_2D,0,de,ce,Se,J);f(_)&&b(W),le.__version=ie.version,_.onUpdate&&_.onUpdate(_)}P.__version=_.version}function Oe(P,_,k){if(_.image.length!==6)return;let W=Q(P,_),Y=_.source;t.bindTexture(i.TEXTURE_CUBE_MAP,P.__webglTexture,i.TEXTURE0+k);let ie=n.get(Y);if(Y.version!==ie.__version||W===!0){t.activeTexture(i.TEXTURE0+k);let le=qe.getPrimaries(qe.workingColorSpace),$=_.colorSpace===ci?null:qe.getPrimaries(_.colorSpace),J=_.colorSpace===ci||le===$?i.NONE:i.BROWSER_DEFAULT_WEBGL;t.pixelStorei(i.UNPACK_FLIP_Y_WEBGL,_.flipY),t.pixelStorei(i.UNPACK_PREMULTIPLY_ALPHA_WEBGL,_.premultiplyAlpha),t.pixelStorei(i.UNPACK_ALIGNMENT,_.unpackAlignment),t.pixelStorei(i.UNPACK_COLORSPACE_CONVERSION_WEBGL,J);let ce=_.isCompressedTexture||_.image[0].isCompressedTexture,Se=_.image[0]&&_.image[0].isDataTexture,de=[];for(let ee=0;ee<6;ee++)!ce&&!Se?de[ee]=g(_.image[ee],!0,s.maxCubemapSize):de[ee]=Se?_.image[ee].image:_.image[ee],de[ee]=en(_,de[ee]);let he=de[0],Te=r.convert(_.format,_.colorSpace),Ie=r.convert(_.type),Be=v(_.internalFormat,Te,Ie,_.normalized,_.colorSpace),F=_.isVideoTexture!==!0,oe=ie.__version===void 0||W===!0,Z=Y.dataReady,ue=w(_,he);Je(i.TEXTURE_CUBE_MAP,_);let ge;if(ce){F&&oe&&t.texStorage2D(i.TEXTURE_CUBE_MAP,ue,Be,he.width,he.height);for(let ee=0;ee<6;ee++){ge=de[ee].mipmaps;for(let Me=0;Me<ge.length;Me++){let _e=ge[Me];_.format!==bn?Te!==null?F?Z&&t.compressedTexSubImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+ee,Me,0,0,_e.width,_e.height,Te,_e.data):t.compressedTexImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+ee,Me,Be,_e.width,_e.height,0,_e.data):Ae("WebGLRenderer: Attempt to load unsupported compressed texture format in .setTextureCube()"):F?Z&&t.texSubImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+ee,Me,0,0,_e.width,_e.height,Te,Ie,_e.data):t.texImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+ee,Me,Be,_e.width,_e.height,0,Te,Ie,_e.data)}}}else{if(ge=_.mipmaps,F&&oe){ge.length>0&&ue++;let ee=et(de[0]);t.texStorage2D(i.TEXTURE_CUBE_MAP,ue,Be,ee.width,ee.height)}for(let ee=0;ee<6;ee++)if(Se){F?Z&&t.texSubImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+ee,0,0,0,de[ee].width,de[ee].height,Te,Ie,de[ee].data):t.texImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+ee,0,Be,de[ee].width,de[ee].height,0,Te,Ie,de[ee].data);for(let Me=0;Me<ge.length;Me++){let gt=ge[Me].image[ee].image;F?Z&&t.texSubImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+ee,Me+1,0,0,gt.width,gt.height,Te,Ie,gt.data):t.texImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+ee,Me+1,Be,gt.width,gt.height,0,Te,Ie,gt.data)}}else{F?Z&&t.texSubImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+ee,0,0,0,Te,Ie,de[ee]):t.texImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+ee,0,Be,Te,Ie,de[ee]);for(let Me=0;Me<ge.length;Me++){let _e=ge[Me];F?Z&&t.texSubImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+ee,Me+1,0,0,Te,Ie,_e.image[ee]):t.texImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+ee,Me+1,Be,Te,Ie,_e.image[ee])}}}f(_)&&b(i.TEXTURE_CUBE_MAP),ie.__version=Y.version,_.onUpdate&&_.onUpdate(_)}P.__version=_.version}function Ce(P,_,k,W,Y,ie){let le=r.convert(k.format,k.colorSpace),$=r.convert(k.type),J=v(k.internalFormat,le,$,k.normalized,k.colorSpace),ce=n.get(_),Se=n.get(k);if(Se.__renderTarget=_,!ce.__hasExternalTextures){let de=Math.max(1,_.width>>ie),he=Math.max(1,_.height>>ie);Y===i.TEXTURE_3D||Y===i.TEXTURE_2D_ARRAY?t.texImage3D(Y,ie,J,de,he,_.depth,0,le,$,null):t.texImage2D(Y,ie,J,de,he,0,le,$,null)}t.bindFramebuffer(i.FRAMEBUFFER,P),Et(_)?a.framebufferTexture2DMultisampleEXT(i.FRAMEBUFFER,W,Y,Se.__webglTexture,0,mt(_)):(Y===i.TEXTURE_2D||Y>=i.TEXTURE_CUBE_MAP_POSITIVE_X&&Y<=i.TEXTURE_CUBE_MAP_NEGATIVE_Z)&&i.framebufferTexture2D(i.FRAMEBUFFER,W,Y,Se.__webglTexture,ie),t.bindFramebuffer(i.FRAMEBUFFER,null)}function _t(P,_,k){if(i.bindRenderbuffer(i.RENDERBUFFER,P),_.depthBuffer){let W=_.depthTexture,Y=W&&W.isDepthTexture?W.type:null,ie=A(_.stencilBuffer,Y),le=_.stencilBuffer?i.DEPTH_STENCIL_ATTACHMENT:i.DEPTH_ATTACHMENT;Et(_)?a.renderbufferStorageMultisampleEXT(i.RENDERBUFFER,mt(_),ie,_.width,_.height):k?i.renderbufferStorageMultisample(i.RENDERBUFFER,mt(_),ie,_.width,_.height):i.renderbufferStorage(i.RENDERBUFFER,ie,_.width,_.height),i.framebufferRenderbuffer(i.FRAMEBUFFER,le,i.RENDERBUFFER,P)}else{let W=_.textures;for(let Y=0;Y<W.length;Y++){let ie=W[Y],le=r.convert(ie.format,ie.colorSpace),$=r.convert(ie.type),J=v(ie.internalFormat,le,$,ie.normalized,ie.colorSpace);Et(_)?a.renderbufferStorageMultisampleEXT(i.RENDERBUFFER,mt(_),J,_.width,_.height):k?i.renderbufferStorageMultisample(i.RENDERBUFFER,mt(_),J,_.width,_.height):i.renderbufferStorage(i.RENDERBUFFER,J,_.width,_.height)}}i.bindRenderbuffer(i.RENDERBUFFER,null)}function Xe(P,_,k){let W=_.isWebGLCubeRenderTarget===!0;if(t.bindFramebuffer(i.FRAMEBUFFER,P),!(_.depthTexture&&_.depthTexture.isDepthTexture))throw new Error("THREE.WebGLTextures: renderTarget.depthTexture must be an instance of THREE.DepthTexture.");let Y=n.get(_.depthTexture);if(Y.__renderTarget=_,(!Y.__webglTexture||_.depthTexture.image.width!==_.width||_.depthTexture.image.height!==_.height)&&(_.depthTexture.image.width=_.width,_.depthTexture.image.height=_.height,_.depthTexture.needsUpdate=!0),W){if(Y.__webglInit===void 0&&(Y.__webglInit=!0,_.depthTexture.addEventListener("dispose",E)),Y.__webglTexture===void 0){Y.__webglTexture=i.createTexture(),t.bindTexture(i.TEXTURE_CUBE_MAP,Y.__webglTexture),Je(i.TEXTURE_CUBE_MAP,_.depthTexture);let ce=r.convert(_.depthTexture.format),Se=r.convert(_.depthTexture.type),de;_.depthTexture.format===Vn?de=i.DEPTH_COMPONENT24:_.depthTexture.format===Ni&&(de=i.DEPTH24_STENCIL8);for(let he=0;he<6;he++)i.texImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+he,0,de,_.width,_.height,0,ce,Se,null)}}else K(_.depthTexture,0);let ie=Y.__webglTexture,le=mt(_),$=W?i.TEXTURE_CUBE_MAP_POSITIVE_X+k:i.TEXTURE_2D,J=_.depthTexture.format===Ni?i.DEPTH_STENCIL_ATTACHMENT:i.DEPTH_ATTACHMENT;if(_.depthTexture.format===Vn)Et(_)?a.framebufferTexture2DMultisampleEXT(i.FRAMEBUFFER,J,$,ie,0,le):i.framebufferTexture2D(i.FRAMEBUFFER,J,$,ie,0);else if(_.depthTexture.format===Ni)Et(_)?a.framebufferTexture2DMultisampleEXT(i.FRAMEBUFFER,J,$,ie,0,le):i.framebufferTexture2D(i.FRAMEBUFFER,J,$,ie,0);else throw new Error("THREE.WebGLTextures: Unknown depthTexture format.")}function st(P){let _=n.get(P),k=P.isWebGLCubeRenderTarget===!0;if(_.__boundDepthTexture!==P.depthTexture){let W=P.depthTexture;if(_.__depthDisposeCallback&&_.__depthDisposeCallback(),W){let Y=()=>{delete _.__boundDepthTexture,delete _.__depthDisposeCallback,W.removeEventListener("dispose",Y)};W.addEventListener("dispose",Y),_.__depthDisposeCallback=Y}_.__boundDepthTexture=W}if(P.depthTexture&&!_.__autoAllocateDepthBuffer)if(k)for(let W=0;W<6;W++)Xe(_.__webglFramebuffer[W],P,W);else{let W=P.texture.mipmaps;W&&W.length>0?Xe(_.__webglFramebuffer[0],P,0):Xe(_.__webglFramebuffer,P,0)}else if(k){_.__webglDepthbuffer=[];for(let W=0;W<6;W++)if(t.bindFramebuffer(i.FRAMEBUFFER,_.__webglFramebuffer[W]),_.__webglDepthbuffer[W]===void 0)_.__webglDepthbuffer[W]=i.createRenderbuffer(),_t(_.__webglDepthbuffer[W],P,!1);else{let Y=P.stencilBuffer?i.DEPTH_STENCIL_ATTACHMENT:i.DEPTH_ATTACHMENT,ie=_.__webglDepthbuffer[W];i.bindRenderbuffer(i.RENDERBUFFER,ie),i.framebufferRenderbuffer(i.FRAMEBUFFER,Y,i.RENDERBUFFER,ie)}}else{let W=P.texture.mipmaps;if(W&&W.length>0?t.bindFramebuffer(i.FRAMEBUFFER,_.__webglFramebuffer[0]):t.bindFramebuffer(i.FRAMEBUFFER,_.__webglFramebuffer),_.__webglDepthbuffer===void 0)_.__webglDepthbuffer=i.createRenderbuffer(),_t(_.__webglDepthbuffer,P,!1);else{let Y=P.stencilBuffer?i.DEPTH_STENCIL_ATTACHMENT:i.DEPTH_ATTACHMENT,ie=_.__webglDepthbuffer;i.bindRenderbuffer(i.RENDERBUFFER,ie),i.framebufferRenderbuffer(i.FRAMEBUFFER,Y,i.RENDERBUFFER,ie)}}t.bindFramebuffer(i.FRAMEBUFFER,null)}function je(P,_,k){let W=n.get(P);_!==void 0&&Ce(W.__webglFramebuffer,P,P.texture,i.COLOR_ATTACHMENT0,i.TEXTURE_2D,0),k!==void 0&&st(P)}function $e(P){let _=P.texture,k=n.get(P),W=n.get(_);P.addEventListener("dispose",x);let Y=P.textures,ie=P.isWebGLCubeRenderTarget===!0,le=Y.length>1;if(le||(W.__webglTexture===void 0&&(W.__webglTexture=i.createTexture()),W.__version=_.version,o.memory.textures++),ie){k.__webglFramebuffer=[];for(let $=0;$<6;$++)if(_.mipmaps&&_.mipmaps.length>0){k.__webglFramebuffer[$]=[];for(let J=0;J<_.mipmaps.length;J++)k.__webglFramebuffer[$][J]=i.createFramebuffer()}else k.__webglFramebuffer[$]=i.createFramebuffer()}else{if(_.mipmaps&&_.mipmaps.length>0){k.__webglFramebuffer=[];for(let $=0;$<_.mipmaps.length;$++)k.__webglFramebuffer[$]=i.createFramebuffer()}else k.__webglFramebuffer=i.createFramebuffer();if(le)for(let $=0,J=Y.length;$<J;$++){let ce=n.get(Y[$]);ce.__webglTexture===void 0&&(ce.__webglTexture=i.createTexture(),o.memory.textures++)}if(P.samples>0&&Et(P)===!1){k.__webglMultisampledFramebuffer=i.createFramebuffer(),k.__webglColorRenderbuffer=[],t.bindFramebuffer(i.FRAMEBUFFER,k.__webglMultisampledFramebuffer);for(let $=0;$<Y.length;$++){let J=Y[$];k.__webglColorRenderbuffer[$]=i.createRenderbuffer(),i.bindRenderbuffer(i.RENDERBUFFER,k.__webglColorRenderbuffer[$]);let ce=r.convert(J.format,J.colorSpace),Se=r.convert(J.type),de=v(J.internalFormat,ce,Se,J.normalized,J.colorSpace,P.isXRRenderTarget===!0),he=mt(P);i.renderbufferStorageMultisample(i.RENDERBUFFER,he,de,P.width,P.height),i.framebufferRenderbuffer(i.FRAMEBUFFER,i.COLOR_ATTACHMENT0+$,i.RENDERBUFFER,k.__webglColorRenderbuffer[$])}i.bindRenderbuffer(i.RENDERBUFFER,null),P.depthBuffer&&(k.__webglDepthRenderbuffer=i.createRenderbuffer(),_t(k.__webglDepthRenderbuffer,P,!0)),t.bindFramebuffer(i.FRAMEBUFFER,null)}}if(ie){t.bindTexture(i.TEXTURE_CUBE_MAP,W.__webglTexture),Je(i.TEXTURE_CUBE_MAP,_);for(let $=0;$<6;$++)if(_.mipmaps&&_.mipmaps.length>0)for(let J=0;J<_.mipmaps.length;J++)Ce(k.__webglFramebuffer[$][J],P,_,i.COLOR_ATTACHMENT0,i.TEXTURE_CUBE_MAP_POSITIVE_X+$,J);else Ce(k.__webglFramebuffer[$],P,_,i.COLOR_ATTACHMENT0,i.TEXTURE_CUBE_MAP_POSITIVE_X+$,0);f(_)&&b(i.TEXTURE_CUBE_MAP),t.unbindTexture()}else if(le){for(let $=0,J=Y.length;$<J;$++){let ce=Y[$],Se=n.get(ce),de=i.TEXTURE_2D;(P.isWebGL3DRenderTarget||P.isWebGLArrayRenderTarget)&&(de=P.isWebGL3DRenderTarget?i.TEXTURE_3D:i.TEXTURE_2D_ARRAY),t.bindTexture(de,Se.__webglTexture),Je(de,ce),Ce(k.__webglFramebuffer,P,ce,i.COLOR_ATTACHMENT0+$,de,0),f(ce)&&b(de)}t.unbindTexture()}else{let $=i.TEXTURE_2D;if((P.isWebGL3DRenderTarget||P.isWebGLArrayRenderTarget)&&($=P.isWebGL3DRenderTarget?i.TEXTURE_3D:i.TEXTURE_2D_ARRAY),t.bindTexture($,W.__webglTexture),Je($,_),_.mipmaps&&_.mipmaps.length>0)for(let J=0;J<_.mipmaps.length;J++)Ce(k.__webglFramebuffer[J],P,_,i.COLOR_ATTACHMENT0,$,J);else Ce(k.__webglFramebuffer,P,_,i.COLOR_ATTACHMENT0,$,0);f(_)&&b($),t.unbindTexture()}P.depthBuffer&&st(P)}function wt(P){let _=P.textures;for(let k=0,W=_.length;k<W;k++){let Y=_[k];if(f(Y)){let ie=M(P),le=n.get(Y).__webglTexture;t.bindTexture(ie,le),b(ie),t.unbindTexture()}}}let Pt=[],Ut=[];function Bt(P){if(P.samples>0){if(Et(P)===!1){let _=P.textures,k=P.width,W=P.height,Y=i.COLOR_BUFFER_BIT,ie=P.stencilBuffer?i.DEPTH_STENCIL_ATTACHMENT:i.DEPTH_ATTACHMENT,le=n.get(P),$=_.length>1;if($)for(let ce=0;ce<_.length;ce++)t.bindFramebuffer(i.FRAMEBUFFER,le.__webglMultisampledFramebuffer),i.framebufferRenderbuffer(i.FRAMEBUFFER,i.COLOR_ATTACHMENT0+ce,i.RENDERBUFFER,null),t.bindFramebuffer(i.FRAMEBUFFER,le.__webglFramebuffer),i.framebufferTexture2D(i.DRAW_FRAMEBUFFER,i.COLOR_ATTACHMENT0+ce,i.TEXTURE_2D,null,0);t.bindFramebuffer(i.READ_FRAMEBUFFER,le.__webglMultisampledFramebuffer);let J=P.texture.mipmaps;J&&J.length>0?t.bindFramebuffer(i.DRAW_FRAMEBUFFER,le.__webglFramebuffer[0]):t.bindFramebuffer(i.DRAW_FRAMEBUFFER,le.__webglFramebuffer);for(let ce=0;ce<_.length;ce++){if(P.resolveDepthBuffer&&(P.depthBuffer&&(Y|=i.DEPTH_BUFFER_BIT),P.stencilBuffer&&P.resolveStencilBuffer&&(Y|=i.STENCIL_BUFFER_BIT)),$){i.framebufferRenderbuffer(i.READ_FRAMEBUFFER,i.COLOR_ATTACHMENT0,i.RENDERBUFFER,le.__webglColorRenderbuffer[ce]);let Se=n.get(_[ce]).__webglTexture;i.framebufferTexture2D(i.DRAW_FRAMEBUFFER,i.COLOR_ATTACHMENT0,i.TEXTURE_2D,Se,0)}i.blitFramebuffer(0,0,k,W,0,0,k,W,Y,i.NEAREST),l===!0&&(Pt.length=0,Ut.length=0,Pt.push(i.COLOR_ATTACHMENT0+ce),P.depthBuffer&&P.resolveDepthBuffer===!1&&(Pt.push(ie),Ut.push(ie),i.invalidateFramebuffer(i.DRAW_FRAMEBUFFER,Ut)),i.invalidateFramebuffer(i.READ_FRAMEBUFFER,Pt))}if(t.bindFramebuffer(i.READ_FRAMEBUFFER,null),t.bindFramebuffer(i.DRAW_FRAMEBUFFER,null),$)for(let ce=0;ce<_.length;ce++){t.bindFramebuffer(i.FRAMEBUFFER,le.__webglMultisampledFramebuffer),i.framebufferRenderbuffer(i.FRAMEBUFFER,i.COLOR_ATTACHMENT0+ce,i.RENDERBUFFER,le.__webglColorRenderbuffer[ce]);let Se=n.get(_[ce]).__webglTexture;t.bindFramebuffer(i.FRAMEBUFFER,le.__webglFramebuffer),i.framebufferTexture2D(i.DRAW_FRAMEBUFFER,i.COLOR_ATTACHMENT0+ce,i.TEXTURE_2D,Se,0)}t.bindFramebuffer(i.DRAW_FRAMEBUFFER,le.__webglMultisampledFramebuffer)}else if(P.depthBuffer&&P.resolveDepthBuffer===!1&&l){let _=P.stencilBuffer?i.DEPTH_STENCIL_ATTACHMENT:i.DEPTH_ATTACHMENT;i.invalidateFramebuffer(i.DRAW_FRAMEBUFFER,[_])}}}function mt(P){return Math.min(s.maxSamples,P.samples)}function Et(P){let _=n.get(P);return P.samples>0&&e.has("WEBGL_multisampled_render_to_texture")===!0&&_.__useRenderToTexture!==!1}function O(P){let _=o.render.frame;h.get(P)!==_&&(h.set(P,_),P.update())}function en(P,_){let k=P.colorSpace,W=P.format,Y=P.type;return P.isCompressedTexture===!0||P.isVideoTexture===!0||k!==lr&&k!==ci&&(qe.getTransfer(k)===Qe?(W!==bn||Y!==pn)&&Ae("WebGLTextures: sRGB encoded textures have to use RGBAFormat and UnsignedByteType."):Le("WebGLTextures: Unsupported texture color space:",k)),_}function et(P){return typeof HTMLImageElement<"u"&&P instanceof HTMLImageElement?(c.width=P.naturalWidth||P.width,c.height=P.naturalHeight||P.height):typeof VideoFrame<"u"&&P instanceof VideoFrame?(c.width=P.displayWidth,c.height=P.displayHeight):(c.width=P.width,c.height=P.height),c}this.allocateTextureUnit=q,this.resetTextureUnits=I,this.getTextureUnits=V,this.setTextureUnits=D,this.setTexture2D=K,this.setTexture2DArray=j,this.setTexture3D=se,this.setTextureCube=fe,this.rebindTextures=je,this.setupRenderTarget=$e,this.updateRenderTargetMipmap=wt,this.updateMultisampleRenderTarget=Bt,this.setupDepthRenderbuffer=st,this.setupFrameBufferTexture=Ce,this.useMultisampledRTT=Et,this.isReversedDepthBuffer=function(){return t.buffers.depth.getReversed()}}function kv(i,e){function t(n,s=ci){let r,o=qe.getTransfer(s);if(n===pn)return i.UNSIGNED_BYTE;if(n===Fa)return i.UNSIGNED_SHORT_4_4_4_4;if(n===Ua)return i.UNSIGNED_SHORT_5_5_5_1;if(n===oh)return i.UNSIGNED_INT_5_9_9_9_REV;if(n===ah)return i.UNSIGNED_INT_10F_11F_11F_REV;if(n===sh)return i.BYTE;if(n===rh)return i.SHORT;if(n===zs)return i.UNSIGNED_SHORT;if(n===Da)return i.INT;if(n===In)return i.UNSIGNED_INT;if(n===Ln)return i.FLOAT;if(n===qn)return i.HALF_FLOAT;if(n===lh)return i.ALPHA;if(n===ch)return i.RGB;if(n===bn)return i.RGBA;if(n===Vn)return i.DEPTH_COMPONENT;if(n===Ni)return i.DEPTH_STENCIL;if(n===hh)return i.RED;if(n===Na)return i.RED_INTEGER;if(n===Oi)return i.RG;if(n===Oa)return i.RG_INTEGER;if(n===Ba)return i.RGBA_INTEGER;if(n===Or||n===Br||n===zr||n===kr)if(o===Qe)if(r=e.get("WEBGL_compressed_texture_s3tc_srgb"),r!==null){if(n===Or)return r.COMPRESSED_SRGB_S3TC_DXT1_EXT;if(n===Br)return r.COMPRESSED_SRGB_ALPHA_S3TC_DXT1_EXT;if(n===zr)return r.COMPRESSED_SRGB_ALPHA_S3TC_DXT3_EXT;if(n===kr)return r.COMPRESSED_SRGB_ALPHA_S3TC_DXT5_EXT}else return null;else if(r=e.get("WEBGL_compressed_texture_s3tc"),r!==null){if(n===Or)return r.COMPRESSED_RGB_S3TC_DXT1_EXT;if(n===Br)return r.COMPRESSED_RGBA_S3TC_DXT1_EXT;if(n===zr)return r.COMPRESSED_RGBA_S3TC_DXT3_EXT;if(n===kr)return r.COMPRESSED_RGBA_S3TC_DXT5_EXT}else return null;if(n===za||n===ka||n===Va||n===Ha)if(r=e.get("WEBGL_compressed_texture_pvrtc"),r!==null){if(n===za)return r.COMPRESSED_RGB_PVRTC_4BPPV1_IMG;if(n===ka)return r.COMPRESSED_RGB_PVRTC_2BPPV1_IMG;if(n===Va)return r.COMPRESSED_RGBA_PVRTC_4BPPV1_IMG;if(n===Ha)return r.COMPRESSED_RGBA_PVRTC_2BPPV1_IMG}else return null;if(n===Ga||n===Wa||n===Xa||n===qa||n===Ya||n===Vr||n===$a)if(r=e.get("WEBGL_compressed_texture_etc"),r!==null){if(n===Ga||n===Wa)return o===Qe?r.COMPRESSED_SRGB8_ETC2:r.COMPRESSED_RGB8_ETC2;if(n===Xa)return o===Qe?r.COMPRESSED_SRGB8_ALPHA8_ETC2_EAC:r.COMPRESSED_RGBA8_ETC2_EAC;if(n===qa)return r.COMPRESSED_R11_EAC;if(n===Ya)return r.COMPRESSED_SIGNED_R11_EAC;if(n===Vr)return r.COMPRESSED_RG11_EAC;if(n===$a)return r.COMPRESSED_SIGNED_RG11_EAC}else return null;if(n===Ka||n===Za||n===Ja||n===ja||n===Qa||n===el||n===tl||n===nl||n===il||n===sl||n===rl||n===ol||n===al||n===ll)if(r=e.get("WEBGL_compressed_texture_astc"),r!==null){if(n===Ka)return o===Qe?r.COMPRESSED_SRGB8_ALPHA8_ASTC_4x4_KHR:r.COMPRESSED_RGBA_ASTC_4x4_KHR;if(n===Za)return o===Qe?r.COMPRESSED_SRGB8_ALPHA8_ASTC_5x4_KHR:r.COMPRESSED_RGBA_ASTC_5x4_KHR;if(n===Ja)return o===Qe?r.COMPRESSED_SRGB8_ALPHA8_ASTC_5x5_KHR:r.COMPRESSED_RGBA_ASTC_5x5_KHR;if(n===ja)return o===Qe?r.COMPRESSED_SRGB8_ALPHA8_ASTC_6x5_KHR:r.COMPRESSED_RGBA_ASTC_6x5_KHR;if(n===Qa)return o===Qe?r.COMPRESSED_SRGB8_ALPHA8_ASTC_6x6_KHR:r.COMPRESSED_RGBA_ASTC_6x6_KHR;if(n===el)return o===Qe?r.COMPRESSED_SRGB8_ALPHA8_ASTC_8x5_KHR:r.COMPRESSED_RGBA_ASTC_8x5_KHR;if(n===tl)return o===Qe?r.COMPRESSED_SRGB8_ALPHA8_ASTC_8x6_KHR:r.COMPRESSED_RGBA_ASTC_8x6_KHR;if(n===nl)return o===Qe?r.COMPRESSED_SRGB8_ALPHA8_ASTC_8x8_KHR:r.COMPRESSED_RGBA_ASTC_8x8_KHR;if(n===il)return o===Qe?r.COMPRESSED_SRGB8_ALPHA8_ASTC_10x5_KHR:r.COMPRESSED_RGBA_ASTC_10x5_KHR;if(n===sl)return o===Qe?r.COMPRESSED_SRGB8_ALPHA8_ASTC_10x6_KHR:r.COMPRESSED_RGBA_ASTC_10x6_KHR;if(n===rl)return o===Qe?r.COMPRESSED_SRGB8_ALPHA8_ASTC_10x8_KHR:r.COMPRESSED_RGBA_ASTC_10x8_KHR;if(n===ol)return o===Qe?r.COMPRESSED_SRGB8_ALPHA8_ASTC_10x10_KHR:r.COMPRESSED_RGBA_ASTC_10x10_KHR;if(n===al)return o===Qe?r.COMPRESSED_SRGB8_ALPHA8_ASTC_12x10_KHR:r.COMPRESSED_RGBA_ASTC_12x10_KHR;if(n===ll)return o===Qe?r.COMPRESSED_SRGB8_ALPHA8_ASTC_12x12_KHR:r.COMPRESSED_RGBA_ASTC_12x12_KHR}else return null;if(n===cl||n===hl||n===ul)if(r=e.get("EXT_texture_compression_bptc"),r!==null){if(n===cl)return o===Qe?r.COMPRESSED_SRGB_ALPHA_BPTC_UNORM_EXT:r.COMPRESSED_RGBA_BPTC_UNORM_EXT;if(n===hl)return r.COMPRESSED_RGB_BPTC_SIGNED_FLOAT_EXT;if(n===ul)return r.COMPRESSED_RGB_BPTC_UNSIGNED_FLOAT_EXT}else return null;if(n===dl||n===fl||n===Hr||n===pl)if(r=e.get("EXT_texture_compression_rgtc"),r!==null){if(n===dl)return r.COMPRESSED_RED_RGTC1_EXT;if(n===fl)return r.COMPRESSED_SIGNED_RED_RGTC1_EXT;if(n===Hr)return r.COMPRESSED_RED_GREEN_RGTC2_EXT;if(n===pl)return r.COMPRESSED_SIGNED_RED_GREEN_RGTC2_EXT}else return null;return n===ks?i.UNSIGNED_INT_24_8:i[n]!==void 0?i[n]:null}return{convert:t}}var Vv=`
void main() {

	gl_Position = vec4( position, 1.0 );

}`,Hv=`
uniform sampler2DArray depthColor;
uniform float depthWidth;
uniform float depthHeight;

void main() {

	vec2 coord = vec2( gl_FragCoord.x / depthWidth, gl_FragCoord.y / depthHeight );

	if ( coord.x >= 1.0 ) {

		gl_FragDepth = texture( depthColor, vec3( coord.x - 1.0, coord.y, 1 ) ).r;

	} else {

		gl_FragDepth = texture( depthColor, vec3( coord.x, coord.y, 0 ) ).r;

	}

}`,Oh=class{constructor(){this.texture=null,this.mesh=null,this.depthNear=0,this.depthFar=0}init(e,t){if(this.texture===null){let n=new Sr(e.texture);(e.depthNear!==t.depthNear||e.depthFar!==t.depthFar)&&(this.depthNear=e.depthNear,this.depthFar=e.depthFar),this.texture=n}}getMesh(e){if(this.texture!==null&&this.mesh===null){let t=e.cameras[0].viewport,n=new kt({vertexShader:Vv,fragmentShader:Hv,uniforms:{depthColor:{value:this.texture},depthWidth:{value:t.z},depthHeight:{value:t.w}}});this.mesh=new At(new ts(20,20),n)}return this.mesh}reset(){this.texture=null,this.mesh=null}getDepthTexture(){return this.texture}},Bh=class extends Hn{constructor(e,t){super();let n=this,s=null,r=1,o=null,a="local-floor",l=1,c=null,h=null,d=null,u=null,m=null,p=null,y=typeof XRWebGLBinding<"u",g=new Oh,f={},b=t.getContextAttributes(),M=null,v=null,A=[],w=[],E=new Ge,x=null,T=new Yt;T.viewport=new nt;let C=new Yt;C.viewport=new nt;let R=[T,C],L=new Aa,I=null,V=null;this.cameraAutoUpdate=!0,this.enabled=!1,this.isPresenting=!1,this.getController=function(Q){let ae=A[Q];return ae===void 0&&(ae=new Ds,A[Q]=ae),ae.getTargetRaySpace()},this.getControllerGrip=function(Q){let ae=A[Q];return ae===void 0&&(ae=new Ds,A[Q]=ae),ae.getGripSpace()},this.getHand=function(Q){let ae=A[Q];return ae===void 0&&(ae=new Ds,A[Q]=ae),ae.getHandSpace()};function D(Q){let ae=w.indexOf(Q.inputSource);if(ae===-1)return;let ne=A[ae];ne!==void 0&&(ne.update(Q.inputSource,Q.frame,c||o),ne.dispatchEvent({type:Q.type,data:Q.inputSource}))}function q(){s.removeEventListener("select",D),s.removeEventListener("selectstart",D),s.removeEventListener("selectend",D),s.removeEventListener("squeeze",D),s.removeEventListener("squeezestart",D),s.removeEventListener("squeezeend",D),s.removeEventListener("end",q),s.removeEventListener("inputsourceschange",z);for(let Q=0;Q<A.length;Q++){let ae=w[Q];ae!==null&&(w[Q]=null,A[Q].disconnect(ae))}I=null,V=null,g.reset();for(let Q in f)delete f[Q];e.setRenderTarget(M),m=null,u=null,d=null,s=null,v=null,Je.stop(),n.isPresenting=!1,e.setPixelRatio(x),e.setSize(E.width,E.height,!1),n.dispatchEvent({type:"sessionend"})}this.setFramebufferScaleFactor=function(Q){r=Q,n.isPresenting===!0&&Ae("WebXRManager: Cannot change framebuffer scale while presenting.")},this.setReferenceSpaceType=function(Q){a=Q,n.isPresenting===!0&&Ae("WebXRManager: Cannot change reference space type while presenting.")},this.getReferenceSpace=function(){return c||o},this.setReferenceSpace=function(Q){c=Q},this.getBaseLayer=function(){return u!==null?u:m},this.getBinding=function(){return d===null&&y&&(d=new XRWebGLBinding(s,t)),d},this.getFrame=function(){return p},this.getSession=function(){return s},this.setSession=async function(Q){if(s=Q,s!==null){if(M=e.getRenderTarget(),s.addEventListener("select",D),s.addEventListener("selectstart",D),s.addEventListener("selectend",D),s.addEventListener("squeeze",D),s.addEventListener("squeezestart",D),s.addEventListener("squeezeend",D),s.addEventListener("end",q),s.addEventListener("inputsourceschange",z),b.xrCompatible!==!0&&await t.makeXRCompatible(),x=e.getPixelRatio(),e.getSize(E),y&&"createProjectionLayer"in XRWebGLBinding.prototype){let ne=null,De=null,Oe=null;b.depth&&(Oe=b.stencil?t.DEPTH24_STENCIL8:t.DEPTH_COMPONENT24,ne=b.stencil?Ni:Vn,De=b.stencil?ks:In);let Ce={colorFormat:t.RGBA8,depthFormat:Oe,scaleFactor:r};d=this.getBinding(),u=d.createProjectionLayer(Ce),s.updateRenderState({layers:[u]}),e.setPixelRatio(1),e.setSize(u.textureWidth,u.textureHeight,!1),v=new hn(u.textureWidth,u.textureHeight,{format:bn,type:pn,depthTexture:new li(u.textureWidth,u.textureHeight,De,void 0,void 0,void 0,void 0,void 0,void 0,ne),stencilBuffer:b.stencil,colorSpace:e.outputColorSpace,samples:b.antialias?4:0,resolveDepthBuffer:u.ignoreDepthValues===!1,resolveStencilBuffer:u.ignoreDepthValues===!1})}else{let ne={antialias:b.antialias,alpha:!0,depth:b.depth,stencil:b.stencil,framebufferScaleFactor:r};m=new XRWebGLLayer(s,t,ne),s.updateRenderState({baseLayer:m}),e.setPixelRatio(1),e.setSize(m.framebufferWidth,m.framebufferHeight,!1),v=new hn(m.framebufferWidth,m.framebufferHeight,{format:bn,type:pn,colorSpace:e.outputColorSpace,stencilBuffer:b.stencil,resolveDepthBuffer:m.ignoreDepthValues===!1,resolveStencilBuffer:m.ignoreDepthValues===!1})}v.isXRRenderTarget=!0,this.setFoveation(l),c=null,o=await s.requestReferenceSpace(a),Je.setContext(s),Je.start(),n.isPresenting=!0,n.dispatchEvent({type:"sessionstart"})}},this.getEnvironmentBlendMode=function(){if(s!==null)return s.environmentBlendMode},this.getDepthTexture=function(){return g.getDepthTexture()};function z(Q){for(let ae=0;ae<Q.removed.length;ae++){let ne=Q.removed[ae],De=w.indexOf(ne);De>=0&&(w[De]=null,A[De].disconnect(ne))}for(let ae=0;ae<Q.added.length;ae++){let ne=Q.added[ae],De=w.indexOf(ne);if(De===-1){for(let Ce=0;Ce<A.length;Ce++)if(Ce>=w.length){w.push(ne),De=Ce;break}else if(w[Ce]===null){w[Ce]=ne,De=Ce;break}if(De===-1)break}let Oe=A[De];Oe&&Oe.connect(ne)}}let K=new N,j=new N;function se(Q,ae,ne){K.setFromMatrixPosition(ae.matrixWorld),j.setFromMatrixPosition(ne.matrixWorld);let De=K.distanceTo(j),Oe=ae.projectionMatrix.elements,Ce=ne.projectionMatrix.elements,_t=Oe[14]/(Oe[10]-1),Xe=Oe[14]/(Oe[10]+1),st=(Oe[9]+1)/Oe[5],je=(Oe[9]-1)/Oe[5],$e=(Oe[8]-1)/Oe[0],wt=(Ce[8]+1)/Ce[0],Pt=_t*$e,Ut=_t*wt,Bt=De/(-$e+wt),mt=Bt*-$e;if(ae.matrixWorld.decompose(Q.position,Q.quaternion,Q.scale),Q.translateX(mt),Q.translateZ(Bt),Q.matrixWorld.compose(Q.position,Q.quaternion,Q.scale),Q.matrixWorldInverse.copy(Q.matrixWorld).invert(),Oe[10]===-1)Q.projectionMatrix.copy(ae.projectionMatrix),Q.projectionMatrixInverse.copy(ae.projectionMatrixInverse);else{let Et=_t+Bt,O=Xe+Bt,en=Pt-mt,et=Ut+(De-mt),P=st*Xe/O*Et,_=je*Xe/O*Et;Q.projectionMatrix.makePerspective(en,et,P,_,Et,O),Q.projectionMatrixInverse.copy(Q.projectionMatrix).invert()}}function fe(Q,ae){ae===null?Q.matrixWorld.copy(Q.matrix):Q.matrixWorld.multiplyMatrices(ae.matrixWorld,Q.matrix),Q.matrixWorldInverse.copy(Q.matrixWorld).invert()}this.updateCamera=function(Q){if(s===null)return;let ae=Q.near,ne=Q.far;g.texture!==null&&(g.depthNear>0&&(ae=g.depthNear),g.depthFar>0&&(ne=g.depthFar)),L.near=C.near=T.near=ae,L.far=C.far=T.far=ne,(I!==L.near||V!==L.far)&&(s.updateRenderState({depthNear:L.near,depthFar:L.far}),I=L.near,V=L.far),L.layers.mask=Q.layers.mask|6,T.layers.mask=L.layers.mask&-5,C.layers.mask=L.layers.mask&-3;let De=Q.parent,Oe=L.cameras;fe(L,De);for(let Ce=0;Ce<Oe.length;Ce++)fe(Oe[Ce],De);Oe.length===2?se(L,T,C):L.projectionMatrix.copy(T.projectionMatrix),ve(Q,L,De)};function ve(Q,ae,ne){ne===null?Q.matrix.copy(ae.matrixWorld):(Q.matrix.copy(ne.matrixWorld),Q.matrix.invert(),Q.matrix.multiply(ae.matrixWorld)),Q.matrix.decompose(Q.position,Q.quaternion,Q.scale),Q.updateMatrixWorld(!0),Q.projectionMatrix.copy(ae.projectionMatrix),Q.projectionMatrixInverse.copy(ae.projectionMatrixInverse),Q.isPerspectiveCamera&&(Q.fov=Is*2*Math.atan(1/Q.projectionMatrix.elements[5]),Q.zoom=1)}this.getCamera=function(){return L},this.getFoveation=function(){if(!(u===null&&m===null))return l},this.setFoveation=function(Q){l=Q,u!==null&&(u.fixedFoveation=Q),m!==null&&m.fixedFoveation!==void 0&&(m.fixedFoveation=Q)},this.hasDepthSensing=function(){return g.texture!==null},this.getDepthSensingMesh=function(){return g.getMesh(L)},this.getCameraTexture=function(Q){return f[Q]};let Ze=null;function pt(Q,ae){if(h=ae.getViewerPose(c||o),p=ae,h!==null){let ne=h.views;m!==null&&(e.setRenderTargetFramebuffer(v,m.framebuffer),e.setRenderTarget(v));let De=!1;ne.length!==L.cameras.length&&(L.cameras.length=0,De=!0);for(let Xe=0;Xe<ne.length;Xe++){let st=ne[Xe],je=null;if(m!==null)je=m.getViewport(st);else{let wt=d.getViewSubImage(u,st);je=wt.viewport,Xe===0&&(e.setRenderTargetTextures(v,wt.colorTexture,wt.depthStencilTexture),e.setRenderTarget(v))}let $e=R[Xe];$e===void 0&&($e=new Yt,$e.layers.enable(Xe),$e.viewport=new nt,R[Xe]=$e),$e.matrix.fromArray(st.transform.matrix),$e.matrix.decompose($e.position,$e.quaternion,$e.scale),$e.projectionMatrix.fromArray(st.projectionMatrix),$e.projectionMatrixInverse.copy($e.projectionMatrix).invert(),$e.viewport.set(je.x,je.y,je.width,je.height),Xe===0&&(L.matrix.copy($e.matrix),L.matrix.decompose(L.position,L.quaternion,L.scale)),De===!0&&L.cameras.push($e)}let Oe=s.enabledFeatures;if(Oe&&Oe.includes("depth-sensing")&&s.depthUsage=="gpu-optimized"&&y){d=n.getBinding();let Xe=d.getDepthInformation(ne[0]);Xe&&Xe.isValid&&Xe.texture&&g.init(Xe,s.renderState)}if(Oe&&Oe.includes("camera-access")&&y){e.state.unbindTexture(),d=n.getBinding();for(let Xe=0;Xe<ne.length;Xe++){let st=ne[Xe].camera;if(st){let je=f[st];je||(je=new Sr,f[st]=je);let $e=d.getCameraImage(st);je.sourceTexture=$e}}}}for(let ne=0;ne<A.length;ne++){let De=w[ne],Oe=A[ne];De!==null&&Oe!==void 0&&Oe.update(De,ae,c||o)}Ze&&Ze(Q,ae),ae.detectedPlanes&&n.dispatchEvent({type:"planesdetected",data:ae}),p=null}let Je=new _f;Je.setAnimationLoop(pt),this.setAnimationLoop=function(Q){Ze=Q},this.dispose=function(){}}},Gv=new at,Tf=new Ue;Tf.set(-1,0,0,0,1,0,0,0,1);function Wv(i,e){function t(g,f){g.matrixAutoUpdate===!0&&g.updateMatrix(),f.value.copy(g.matrix)}function n(g,f){f.color.getRGB(g.fogColor.value,mh(i)),f.isFog?(g.fogNear.value=f.near,g.fogFar.value=f.far):f.isFogExp2&&(g.fogDensity.value=f.density)}function s(g,f,b,M,v){f.isNodeMaterial?f.uniformsNeedUpdate=!1:f.isMeshBasicMaterial?r(g,f):f.isMeshLambertMaterial?(r(g,f),f.envMap&&(g.envMapIntensity.value=f.envMapIntensity)):f.isMeshToonMaterial?(r(g,f),d(g,f)):f.isMeshPhongMaterial?(r(g,f),h(g,f),f.envMap&&(g.envMapIntensity.value=f.envMapIntensity)):f.isMeshStandardMaterial?(r(g,f),u(g,f),f.isMeshPhysicalMaterial&&m(g,f,v)):f.isMeshMatcapMaterial?(r(g,f),p(g,f)):f.isMeshDepthMaterial?r(g,f):f.isMeshDistanceMaterial?(r(g,f),y(g,f)):f.isMeshNormalMaterial?r(g,f):f.isLineBasicMaterial?(o(g,f),f.isLineDashedMaterial&&a(g,f)):f.isPointsMaterial?l(g,f,b,M):f.isSpriteMaterial?c(g,f):f.isShadowMaterial?(g.color.value.copy(f.color),g.opacity.value=f.opacity):f.isShaderMaterial&&(f.uniformsNeedUpdate=!1)}function r(g,f){g.opacity.value=f.opacity,f.color&&g.diffuse.value.copy(f.color),f.emissive&&g.emissive.value.copy(f.emissive).multiplyScalar(f.emissiveIntensity),f.map&&(g.map.value=f.map,t(f.map,g.mapTransform)),f.alphaMap&&(g.alphaMap.value=f.alphaMap,t(f.alphaMap,g.alphaMapTransform)),f.bumpMap&&(g.bumpMap.value=f.bumpMap,t(f.bumpMap,g.bumpMapTransform),g.bumpScale.value=f.bumpScale,f.side===jt&&(g.bumpScale.value*=-1)),f.normalMap&&(g.normalMap.value=f.normalMap,t(f.normalMap,g.normalMapTransform),g.normalScale.value.copy(f.normalScale),f.side===jt&&g.normalScale.value.negate()),f.displacementMap&&(g.displacementMap.value=f.displacementMap,t(f.displacementMap,g.displacementMapTransform),g.displacementScale.value=f.displacementScale,g.displacementBias.value=f.displacementBias),f.emissiveMap&&(g.emissiveMap.value=f.emissiveMap,t(f.emissiveMap,g.emissiveMapTransform)),f.specularMap&&(g.specularMap.value=f.specularMap,t(f.specularMap,g.specularMapTransform)),f.alphaTest>0&&(g.alphaTest.value=f.alphaTest);let b=e.get(f),M=b.envMap,v=b.envMapRotation;M&&(g.envMap.value=M,g.envMapRotation.value.setFromMatrix4(Gv.makeRotationFromEuler(v)).transpose(),M.isCubeTexture&&M.isRenderTargetTexture===!1&&g.envMapRotation.value.premultiply(Tf),g.reflectivity.value=f.reflectivity,g.ior.value=f.ior,g.refractionRatio.value=f.refractionRatio),f.lightMap&&(g.lightMap.value=f.lightMap,g.lightMapIntensity.value=f.lightMapIntensity,t(f.lightMap,g.lightMapTransform)),f.aoMap&&(g.aoMap.value=f.aoMap,g.aoMapIntensity.value=f.aoMapIntensity,t(f.aoMap,g.aoMapTransform))}function o(g,f){g.diffuse.value.copy(f.color),g.opacity.value=f.opacity,f.map&&(g.map.value=f.map,t(f.map,g.mapTransform))}function a(g,f){g.dashSize.value=f.dashSize,g.totalSize.value=f.dashSize+f.gapSize,g.scale.value=f.scale}function l(g,f,b,M){g.diffuse.value.copy(f.color),g.opacity.value=f.opacity,g.size.value=f.size*b,g.scale.value=M*.5,f.map&&(g.map.value=f.map,t(f.map,g.uvTransform)),f.alphaMap&&(g.alphaMap.value=f.alphaMap,t(f.alphaMap,g.alphaMapTransform)),f.alphaTest>0&&(g.alphaTest.value=f.alphaTest)}function c(g,f){g.diffuse.value.copy(f.color),g.opacity.value=f.opacity,g.rotation.value=f.rotation,f.map&&(g.map.value=f.map,t(f.map,g.mapTransform)),f.alphaMap&&(g.alphaMap.value=f.alphaMap,t(f.alphaMap,g.alphaMapTransform)),f.alphaTest>0&&(g.alphaTest.value=f.alphaTest)}function h(g,f){g.specular.value.copy(f.specular),g.shininess.value=Math.max(f.shininess,1e-4)}function d(g,f){f.gradientMap&&(g.gradientMap.value=f.gradientMap)}function u(g,f){g.metalness.value=f.metalness,f.metalnessMap&&(g.metalnessMap.value=f.metalnessMap,t(f.metalnessMap,g.metalnessMapTransform)),g.roughness.value=f.roughness,f.roughnessMap&&(g.roughnessMap.value=f.roughnessMap,t(f.roughnessMap,g.roughnessMapTransform)),f.envMap&&(g.envMapIntensity.value=f.envMapIntensity)}function m(g,f,b){g.ior.value=f.ior,f.sheen>0&&(g.sheenColor.value.copy(f.sheenColor).multiplyScalar(f.sheen),g.sheenRoughness.value=f.sheenRoughness,f.sheenColorMap&&(g.sheenColorMap.value=f.sheenColorMap,t(f.sheenColorMap,g.sheenColorMapTransform)),f.sheenRoughnessMap&&(g.sheenRoughnessMap.value=f.sheenRoughnessMap,t(f.sheenRoughnessMap,g.sheenRoughnessMapTransform))),f.clearcoat>0&&(g.clearcoat.value=f.clearcoat,g.clearcoatRoughness.value=f.clearcoatRoughness,f.clearcoatMap&&(g.clearcoatMap.value=f.clearcoatMap,t(f.clearcoatMap,g.clearcoatMapTransform)),f.clearcoatRoughnessMap&&(g.clearcoatRoughnessMap.value=f.clearcoatRoughnessMap,t(f.clearcoatRoughnessMap,g.clearcoatRoughnessMapTransform)),f.clearcoatNormalMap&&(g.clearcoatNormalMap.value=f.clearcoatNormalMap,t(f.clearcoatNormalMap,g.clearcoatNormalMapTransform),g.clearcoatNormalScale.value.copy(f.clearcoatNormalScale),f.side===jt&&g.clearcoatNormalScale.value.negate())),f.dispersion>0&&(g.dispersion.value=f.dispersion),f.iridescence>0&&(g.iridescence.value=f.iridescence,g.iridescenceIOR.value=f.iridescenceIOR,g.iridescenceThicknessMinimum.value=f.iridescenceThicknessRange[0],g.iridescenceThicknessMaximum.value=f.iridescenceThicknessRange[1],f.iridescenceMap&&(g.iridescenceMap.value=f.iridescenceMap,t(f.iridescenceMap,g.iridescenceMapTransform)),f.iridescenceThicknessMap&&(g.iridescenceThicknessMap.value=f.iridescenceThicknessMap,t(f.iridescenceThicknessMap,g.iridescenceThicknessMapTransform))),f.transmission>0&&(g.transmission.value=f.transmission,g.transmissionSamplerMap.value=b.texture,g.transmissionSamplerSize.value.set(b.width,b.height),f.transmissionMap&&(g.transmissionMap.value=f.transmissionMap,t(f.transmissionMap,g.transmissionMapTransform)),g.thickness.value=f.thickness,f.thicknessMap&&(g.thicknessMap.value=f.thicknessMap,t(f.thicknessMap,g.thicknessMapTransform)),g.attenuationDistance.value=f.attenuationDistance,g.attenuationColor.value.copy(f.attenuationColor)),f.anisotropy>0&&(g.anisotropyVector.value.set(f.anisotropy*Math.cos(f.anisotropyRotation),f.anisotropy*Math.sin(f.anisotropyRotation)),f.anisotropyMap&&(g.anisotropyMap.value=f.anisotropyMap,t(f.anisotropyMap,g.anisotropyMapTransform))),g.specularIntensity.value=f.specularIntensity,g.specularColor.value.copy(f.specularColor),f.specularColorMap&&(g.specularColorMap.value=f.specularColorMap,t(f.specularColorMap,g.specularColorMapTransform)),f.specularIntensityMap&&(g.specularIntensityMap.value=f.specularIntensityMap,t(f.specularIntensityMap,g.specularIntensityMapTransform))}function p(g,f){f.matcap&&(g.matcap.value=f.matcap)}function y(g,f){let b=e.get(f).light;g.referencePosition.value.setFromMatrixPosition(b.matrixWorld),g.nearDistance.value=b.shadow.camera.near,g.farDistance.value=b.shadow.camera.far}return{refreshFogUniforms:n,refreshMaterialUniforms:s}}function Xv(i,e,t,n){let s={},r={},o=[],a=i.getParameter(i.MAX_UNIFORM_BUFFER_BINDINGS);function l(v,A){let w=A.program;n.uniformBlockBinding(v,w)}function c(v,A){let w=s[v.id];w===void 0&&(g(v),w=h(v),s[v.id]=w,v.addEventListener("dispose",b));let E=A.program;n.updateUBOMapping(v,E);let x=e.render.frame;r[v.id]!==x&&(u(v),r[v.id]=x)}function h(v){let A=d();v.__bindingPointIndex=A;let w=i.createBuffer(),E=v.__size,x=v.usage;return i.bindBuffer(i.UNIFORM_BUFFER,w),i.bufferData(i.UNIFORM_BUFFER,E,x),i.bindBuffer(i.UNIFORM_BUFFER,null),i.bindBufferBase(i.UNIFORM_BUFFER,A,w),w}function d(){for(let v=0;v<a;v++)if(o.indexOf(v)===-1)return o.push(v),v;return Le("WebGLRenderer: Maximum number of simultaneously usable uniforms groups reached."),0}function u(v){let A=s[v.id],w=v.uniforms,E=v.__cache;i.bindBuffer(i.UNIFORM_BUFFER,A);for(let x=0,T=w.length;x<T;x++){let C=w[x];if(Array.isArray(C))for(let R=0,L=C.length;R<L;R++)m(C[R],x,R,E);else m(C,x,0,E)}i.bindBuffer(i.UNIFORM_BUFFER,null)}function m(v,A,w,E){if(y(v,A,w,E)===!0){let x=v.__offset,T=v.value;if(Array.isArray(T)){let C=0;for(let R=0;R<T.length;R++){let L=T[R],I=f(L);p(L,v.__data,C),typeof L!="number"&&typeof L!="boolean"&&!L.isMatrix3&&!ArrayBuffer.isView(L)&&(C+=I.storage/Float32Array.BYTES_PER_ELEMENT)}}else p(T,v.__data,0);i.bufferSubData(i.UNIFORM_BUFFER,x,v.__data)}}function p(v,A,w){typeof v=="number"||typeof v=="boolean"?A[0]=v:v.isMatrix3?(A[0]=v.elements[0],A[1]=v.elements[1],A[2]=v.elements[2],A[3]=0,A[4]=v.elements[3],A[5]=v.elements[4],A[6]=v.elements[5],A[7]=0,A[8]=v.elements[6],A[9]=v.elements[7],A[10]=v.elements[8],A[11]=0):ArrayBuffer.isView(v)?A.set(new v.constructor(v.buffer,v.byteOffset,A.length)):v.toArray(A,w)}function y(v,A,w,E){let x=v.value,T=A+"_"+w;if(E[T]===void 0)return typeof x=="number"||typeof x=="boolean"?E[T]=x:ArrayBuffer.isView(x)?E[T]=x.slice():E[T]=x.clone(),!0;{let C=E[T];if(typeof x=="number"||typeof x=="boolean"){if(C!==x)return E[T]=x,!0}else{if(ArrayBuffer.isView(x))return!0;if(C.equals(x)===!1)return C.copy(x),!0}}return!1}function g(v){let A=v.uniforms,w=0,E=16;for(let T=0,C=A.length;T<C;T++){let R=Array.isArray(A[T])?A[T]:[A[T]];for(let L=0,I=R.length;L<I;L++){let V=R[L],D=Array.isArray(V.value)?V.value:[V.value];for(let q=0,z=D.length;q<z;q++){let K=D[q],j=f(K),se=w%E,fe=se%j.boundary,ve=se+fe;w+=fe,ve!==0&&E-ve<j.storage&&(w+=E-ve),V.__data=new Float32Array(j.storage/Float32Array.BYTES_PER_ELEMENT),V.__offset=w,w+=j.storage}}}let x=w%E;return x>0&&(w+=E-x),v.__size=w,v.__cache={},this}function f(v){let A={boundary:0,storage:0};return typeof v=="number"||typeof v=="boolean"?(A.boundary=4,A.storage=4):v.isVector2?(A.boundary=8,A.storage=8):v.isVector3||v.isColor?(A.boundary=16,A.storage=12):v.isVector4?(A.boundary=16,A.storage=16):v.isMatrix3?(A.boundary=48,A.storage=48):v.isMatrix4?(A.boundary=64,A.storage=64):v.isTexture?Ae("WebGLRenderer: Texture samplers can not be part of an uniforms group."):ArrayBuffer.isView(v)?(A.boundary=16,A.storage=v.byteLength):Ae("WebGLRenderer: Unsupported uniform value type.",v),A}function b(v){let A=v.target;A.removeEventListener("dispose",b);let w=o.indexOf(A.__bindingPointIndex);o.splice(w,1),i.deleteBuffer(s[A.id]),delete s[A.id],delete r[A.id]}function M(){for(let v in s)i.deleteBuffer(s[v]);o=[],s={},r={}}return{bind:l,update:c,dispose:M}}var qv=new Uint16Array([12469,15057,12620,14925,13266,14620,13807,14376,14323,13990,14545,13625,14713,13328,14840,12882,14931,12528,14996,12233,15039,11829,15066,11525,15080,11295,15085,10976,15082,10705,15073,10495,13880,14564,13898,14542,13977,14430,14158,14124,14393,13732,14556,13410,14702,12996,14814,12596,14891,12291,14937,11834,14957,11489,14958,11194,14943,10803,14921,10506,14893,10278,14858,9960,14484,14039,14487,14025,14499,13941,14524,13740,14574,13468,14654,13106,14743,12678,14818,12344,14867,11893,14889,11509,14893,11180,14881,10751,14852,10428,14812,10128,14765,9754,14712,9466,14764,13480,14764,13475,14766,13440,14766,13347,14769,13070,14786,12713,14816,12387,14844,11957,14860,11549,14868,11215,14855,10751,14825,10403,14782,10044,14729,9651,14666,9352,14599,9029,14967,12835,14966,12831,14963,12804,14954,12723,14936,12564,14917,12347,14900,11958,14886,11569,14878,11247,14859,10765,14828,10401,14784,10011,14727,9600,14660,9289,14586,8893,14508,8533,15111,12234,15110,12234,15104,12216,15092,12156,15067,12010,15028,11776,14981,11500,14942,11205,14902,10752,14861,10393,14812,9991,14752,9570,14682,9252,14603,8808,14519,8445,14431,8145,15209,11449,15208,11451,15202,11451,15190,11438,15163,11384,15117,11274,15055,10979,14994,10648,14932,10343,14871,9936,14803,9532,14729,9218,14645,8742,14556,8381,14461,8020,14365,7603,15273,10603,15272,10607,15267,10619,15256,10631,15231,10614,15182,10535,15118,10389,15042,10167,14963,9787,14883,9447,14800,9115,14710,8665,14615,8318,14514,7911,14411,7507,14279,7198,15314,9675,15313,9683,15309,9712,15298,9759,15277,9797,15229,9773,15166,9668,15084,9487,14995,9274,14898,8910,14800,8539,14697,8234,14590,7790,14479,7409,14367,7067,14178,6621,15337,8619,15337,8631,15333,8677,15325,8769,15305,8871,15264,8940,15202,8909,15119,8775,15022,8565,14916,8328,14804,8009,14688,7614,14569,7287,14448,6888,14321,6483,14088,6171,15350,7402,15350,7419,15347,7480,15340,7613,15322,7804,15287,7973,15229,8057,15148,8012,15046,7846,14933,7611,14810,7357,14682,7069,14552,6656,14421,6316,14251,5948,14007,5528,15356,5942,15356,5977,15353,6119,15348,6294,15332,6551,15302,6824,15249,7044,15171,7122,15070,7050,14949,6861,14818,6611,14679,6349,14538,6067,14398,5651,14189,5311,13935,4958,15359,4123,15359,4153,15356,4296,15353,4646,15338,5160,15311,5508,15263,5829,15188,6042,15088,6094,14966,6001,14826,5796,14678,5543,14527,5287,14377,4985,14133,4586,13869,4257,15360,1563,15360,1642,15358,2076,15354,2636,15341,3350,15317,4019,15273,4429,15203,4732,15105,4911,14981,4932,14836,4818,14679,4621,14517,4386,14359,4156,14083,3795,13808,3437,15360,122,15360,137,15358,285,15355,636,15344,1274,15322,2177,15281,2765,15215,3223,15120,3451,14995,3569,14846,3567,14681,3466,14511,3305,14344,3121,14037,2800,13753,2467,15360,0,15360,1,15359,21,15355,89,15346,253,15325,479,15287,796,15225,1148,15133,1492,15008,1749,14856,1882,14685,1886,14506,1783,14324,1608,13996,1398,13702,1183]),Yn=null;function Yv(){return Yn===null&&(Yn=new ca(qv,16,16,Oi,qn),Yn.name="DFG_LUT",Yn.minFilter=zt,Yn.magFilter=zt,Yn.wrapS=kn,Yn.wrapT=kn,Yn.generateMipmaps=!1,Yn.needsUpdate=!0),Yn}var bl=class{constructor(e={}){let{canvas:t=Vd(),context:n=null,depth:s=!0,stencil:r=!1,alpha:o=!1,antialias:a=!1,premultipliedAlpha:l=!0,preserveDrawingBuffer:c=!1,powerPreference:h="default",failIfMajorPerformanceCaveat:d=!1,reversedDepthBuffer:u=!1,outputBufferType:m=pn}=e;this.isWebGLRenderer=!0;let p;if(n!==null){if(typeof WebGLRenderingContext<"u"&&n instanceof WebGLRenderingContext)throw new Error("THREE.WebGLRenderer: WebGL 1 is not supported since r163.");p=n.getContextAttributes().alpha}else p=o;let y=m,g=new Set([Ba,Oa,Na]),f=new Set([pn,In,zs,ks,Fa,Ua]),b=new Uint32Array(4),M=new Int32Array(4),v=new N,A=null,w=null,E=[],x=[],T=null;this.domElement=t,this.debug={checkShaderErrors:!0,onShaderError:null},this.autoClear=!0,this.autoClearColor=!0,this.autoClearDepth=!0,this.autoClearStencil=!0,this.sortObjects=!0,this.clippingPlanes=[],this.localClippingEnabled=!1,this.toneMapping=Cn,this.toneMappingExposure=1,this.transmissionResolutionScale=1;let C=this,R=!1,L=null,I=null,V=null,D=null;this._outputColorSpace=Zt;let q=0,z=0,K=null,j=-1,se=null,fe=new nt,ve=new nt,Ze=null,pt=new We(0),Je=0,Q=t.width,ae=t.height,ne=1,De=null,Oe=null,Ce=new nt(0,0,Q,ae),_t=new nt(0,0,Q,ae),Xe=!1,st=new vr,je=!1,$e=!1,wt=new at,Pt=new N,Ut=new nt,Bt={background:null,fog:null,environment:null,overrideMaterial:null,isScene:!0},mt=!1;function Et(){return K===null?ne:1}let O=n;function en(S,B){return t.getContext(S,B)}try{let S={alpha:!0,depth:s,stencil:r,antialias:a,premultipliedAlpha:l,preserveDrawingBuffer:c,powerPreference:h,failIfMajorPerformanceCaveat:d};if("setAttribute"in t&&t.setAttribute("data-engine",`three.js r${Ra}`),t.addEventListener("webglcontextlost",gt,!1),t.addEventListener("webglcontextrestored",ct,!1),t.addEventListener("webglcontextcreationerror",Fn,!1),O===null){let B="webgl2";if(O=en(B,S),O===null)throw en(B)?new Error("THREE.WebGLRenderer: Error creating WebGL context with your selected attributes."):new Error("THREE.WebGLRenderer: Error creating WebGL context.")}}catch(S){throw Le("WebGLRenderer: "+S.message),S}let et,P,_,k,W,Y,ie,le,$,J,ce,Se,de,he,Te,Ie,Be,F,oe,Z,ue,ge,ee;function Me(){et=new ey(O),et.init(),ue=new kv(O,et),P=new q0(O,et,e,ue),_=new Bv(O,et),P.reversedDepthBuffer&&u&&_.buffers.depth.setReversed(!0),I=O.createFramebuffer(),V=O.createFramebuffer(),D=O.createFramebuffer(),k=new iy(O),W=new wv,Y=new zv(O,et,_,W,P,ue,k),ie=new Q0(C),le=new ag(O),ge=new W0(O,le),$=new ty(O,le,k,ge),J=new ry(O,$,le,ge,k),F=new sy(O,P,Y),Te=new Y0(W),ce=new Sv(C,ie,et,P,ge,Te),Se=new Wv(C,W),de=new Tv,he=new Lv(et),Be=new G0(C,ie,_,J,p,l),Ie=new Ov(C,J,P),ee=new Xv(O,k,P,_),oe=new X0(O,et,k),Z=new ny(O,et,k),k.programs=ce.programs,C.capabilities=P,C.extensions=et,C.properties=W,C.renderLists=de,C.shadowMap=Ie,C.state=_,C.info=k}Me(),y!==pn&&(T=new ay(y,t.width,t.height,a,s,r));let _e=new Bh(C,O);this.xr=_e,this.getContext=function(){return O},this.getContextAttributes=function(){return O.getContextAttributes()},this.forceContextLoss=function(){let S=et.get("WEBGL_lose_context");S&&S.loseContext()},this.forceContextRestore=function(){let S=et.get("WEBGL_lose_context");S&&S.restoreContext()},this.getPixelRatio=function(){return ne},this.setPixelRatio=function(S){S!==void 0&&(ne=S,this.setSize(Q,ae,!1))},this.getSize=function(S){return S.set(Q,ae)},this.setSize=function(S,B,X=!0){if(_e.isPresenting){Ae("WebGLRenderer: Can't change size while VR device is presenting.");return}Q=S,ae=B,t.width=Math.floor(S*ne),t.height=Math.floor(B*ne),X===!0&&(t.style.width=S+"px",t.style.height=B+"px"),T!==null&&T.setSize(t.width,t.height),this.setViewport(0,0,S,B)},this.getDrawingBufferSize=function(S){return S.set(Q*ne,ae*ne).floor()},this.setDrawingBufferSize=function(S,B,X){Q=S,ae=B,ne=X,t.width=Math.floor(S*X),t.height=Math.floor(B*X),this.setViewport(0,0,S,B)},this.setEffects=function(S){if(y===pn){Le("WebGLRenderer: setEffects() requires outputBufferType set to HalfFloatType or FloatType.");return}if(S){for(let B=0;B<S.length;B++)if(S[B].isOutputPass===!0){Ae("WebGLRenderer: OutputPass is not needed in setEffects(). Tone mapping and color space conversion are applied automatically.");break}}T.setEffects(S||[])},this.getCurrentViewport=function(S){return S.copy(fe)},this.getViewport=function(S){return S.copy(Ce)},this.setViewport=function(S,B,X,H){S.isVector4?Ce.set(S.x,S.y,S.z,S.w):Ce.set(S,B,X,H),_.viewport(fe.copy(Ce).multiplyScalar(ne).round())},this.getScissor=function(S){return S.copy(_t)},this.setScissor=function(S,B,X,H){S.isVector4?_t.set(S.x,S.y,S.z,S.w):_t.set(S,B,X,H),_.scissor(ve.copy(_t).multiplyScalar(ne).round())},this.getScissorTest=function(){return Xe},this.setScissorTest=function(S){_.setScissorTest(Xe=S)},this.setOpaqueSort=function(S){De=S},this.setTransparentSort=function(S){Oe=S},this.getClearColor=function(S){return S.copy(Be.getClearColor())},this.setClearColor=function(){Be.setClearColor(...arguments)},this.getClearAlpha=function(){return Be.getClearAlpha()},this.setClearAlpha=function(){Be.setClearAlpha(...arguments)},this.clear=function(S=!0,B=!0,X=!0){let H=0;if(S){let G=!1;if(K!==null){let me=K.texture.format;G=g.has(me)}if(G){let me=K.texture.type,ye=f.has(me),pe=Be.getClearColor(),be=Be.getClearAlpha(),we=pe.r,ze=pe.g,He=pe.b;ye?(b[0]=we,b[1]=ze,b[2]=He,b[3]=be,O.clearBufferuiv(O.COLOR,0,b)):(M[0]=we,M[1]=ze,M[2]=He,M[3]=be,O.clearBufferiv(O.COLOR,0,M))}else H|=O.COLOR_BUFFER_BIT}B&&(H|=O.DEPTH_BUFFER_BIT,this.state.buffers.depth.setMask(!0)),X&&(H|=O.STENCIL_BUFFER_BIT,this.state.buffers.stencil.setMask(4294967295)),H!==0&&O.clear(H)},this.clearColor=function(){this.clear(!0,!1,!1)},this.clearDepth=function(){this.clear(!1,!0,!1)},this.clearStencil=function(){this.clear(!1,!1,!0)},this.setNodesHandler=function(S){S.setRenderer(this),L=S},this.dispose=function(){t.removeEventListener("webglcontextlost",gt,!1),t.removeEventListener("webglcontextrestored",ct,!1),t.removeEventListener("webglcontextcreationerror",Fn,!1),Be.dispose(),de.dispose(),he.dispose(),W.dispose(),ie.dispose(),J.dispose(),ge.dispose(),ee.dispose(),ce.dispose(),_e.dispose(),_e.removeEventListener("sessionstart",lu),_e.removeEventListener("sessionend",cu),Vi.stop()};function gt(S){S.preventDefault(),dr("WebGLRenderer: Context Lost."),R=!0}function ct(){dr("WebGLRenderer: Context Restored."),R=!1;let S=k.autoReset,B=Ie.enabled,X=Ie.autoUpdate,H=Ie.needsUpdate,G=Ie.type;Me(),k.autoReset=S,Ie.enabled=B,Ie.autoUpdate=X,Ie.needsUpdate=H,Ie.type=G}function Fn(S){Le("WebGLRenderer: A WebGL context could not be created. Reason: ",S.statusMessage)}function Un(S){let B=S.target;B.removeEventListener("dispose",Un),mp(B)}function mp(S){gp(S),W.remove(S)}function gp(S){let B=W.get(S).programs;B!==void 0&&(B.forEach(function(X){ce.releaseProgram(X)}),S.isShaderMaterial&&ce.releaseShaderCache(S))}this.renderBufferDirect=function(S,B,X,H,G,me){B===null&&(B=Bt);let ye=G.isMesh&&G.matrixWorld.determinantAffine()<0,pe=vp(S,B,X,H,G);_.setMaterial(H,ye);let be=X.index,we=1;if(H.wireframe===!0){if(be=$.getWireframeAttribute(X),be===void 0)return;we=2}let ze=X.drawRange,He=X.attributes.position,Ee=ze.start*we,it=(ze.start+ze.count)*we;me!==null&&(Ee=Math.max(Ee,me.start*we),it=Math.min(it,(me.start+me.count)*we)),be!==null?(Ee=Math.max(Ee,0),it=Math.min(it,be.count)):He!=null&&(Ee=Math.max(Ee,0),it=Math.min(it,He.count));let bt=it-Ee;if(bt<0||bt===1/0)return;ge.setup(G,H,pe,X,be);let xt,rt=oe;if(be!==null&&(xt=le.get(be),rt=Z,rt.setIndex(xt)),G.isMesh)H.wireframe===!0?(_.setLineWidth(H.wireframeLinewidth*Et()),rt.setMode(O.LINES)):rt.setMode(O.TRIANGLES);else if(G.isLine){let Wt=H.linewidth;Wt===void 0&&(Wt=1),_.setLineWidth(Wt*Et()),G.isLineSegments?rt.setMode(O.LINES):G.isLineLoop?rt.setMode(O.LINE_LOOP):rt.setMode(O.LINE_STRIP)}else G.isPoints?rt.setMode(O.POINTS):G.isSprite&&rt.setMode(O.TRIANGLES);if(G.isBatchedMesh)if(et.get("WEBGL_multi_draw"))rt.renderMultiDraw(G._multiDrawStarts,G._multiDrawCounts,G._multiDrawCount);else{let Wt=G._multiDrawStarts,xe=G._multiDrawCounts,on=G._multiDrawCount,Ke=be?le.get(be).bytesPerElement:1,gn=W.get(H).currentProgram.getUniforms();for(let Nn=0;Nn<on;Nn++)gn.setValue(O,"_gl_DrawID",Nn),rt.render(Wt[Nn]/Ke,xe[Nn])}else if(G.isInstancedMesh)rt.renderInstances(Ee,bt,G.count);else if(X.isInstancedBufferGeometry){let Wt=X._maxInstanceCount!==void 0?X._maxInstanceCount:1/0,xe=Math.min(X.instanceCount,Wt);rt.renderInstances(Ee,bt,xe)}else rt.render(Ee,bt)};function au(S,B,X){S.transparent===!0&&S.side===rn&&S.forceSinglePass===!1?(S.side=jt,S.needsUpdate=!0,ao(S,B,X),S.side=ai,S.needsUpdate=!0,ao(S,B,X),S.side=rn):ao(S,B,X)}this.compile=function(S,B,X=null){X===null&&(X=S),w=he.get(X),w.init(B),x.push(w),X.traverseVisible(function(G){G.isLight&&G.layers.test(B.layers)&&(w.pushLight(G),G.castShadow&&w.pushShadow(G))}),S!==X&&S.traverseVisible(function(G){G.isLight&&G.layers.test(B.layers)&&(w.pushLight(G),G.castShadow&&w.pushShadow(G))}),w.setupLights();let H=new Set;return S.traverse(function(G){if(!(G.isMesh||G.isPoints||G.isLine||G.isSprite))return;let me=G.material;if(me)if(Array.isArray(me))for(let ye=0;ye<me.length;ye++){let pe=me[ye];au(pe,X,G),H.add(pe)}else au(me,X,G),H.add(me)}),w=x.pop(),H},this.compileAsync=function(S,B,X=null){let H=this.compile(S,B,X);return new Promise(G=>{function me(){if(H.forEach(function(ye){W.get(ye).currentProgram.isReady()&&H.delete(ye)}),H.size===0){G(S);return}setTimeout(me,10)}et.get("KHR_parallel_shader_compile")!==null?me():setTimeout(me,10)})};let jl=null;function xp(S){jl&&jl(S)}function lu(){Vi.stop()}function cu(){Vi.start()}let Vi=new _f;Vi.setAnimationLoop(xp),typeof self<"u"&&Vi.setContext(self),this.setAnimationLoop=function(S){jl=S,_e.setAnimationLoop(S),S===null?Vi.stop():Vi.start()},_e.addEventListener("sessionstart",lu),_e.addEventListener("sessionend",cu),this.render=function(S,B){if(B!==void 0&&B.isCamera!==!0){Le("WebGLRenderer.render: camera is not an instance of THREE.Camera.");return}if(R===!0)return;L!==null&&L.renderStart(S,B);let X=_e.enabled===!0&&_e.isPresenting===!0,H=T!==null&&(K===null||X)&&T.begin(C,K);if(S.matrixWorldAutoUpdate===!0&&S.updateMatrixWorld(),B.parent===null&&B.matrixWorldAutoUpdate===!0&&B.updateMatrixWorld(),_e.enabled===!0&&_e.isPresenting===!0&&(T===null||T.isCompositing()===!1)&&(_e.cameraAutoUpdate===!0&&_e.updateCamera(B),B=_e.getCamera()),S.isScene===!0&&S.onBeforeRender(C,S,B,K),w=he.get(S,x.length),w.init(B),w.state.textureUnits=Y.getTextureUnits(),x.push(w),wt.multiplyMatrices(B.projectionMatrix,B.matrixWorldInverse),st.setFromProjectionMatrix(wt,An,B.reversedDepth),$e=this.localClippingEnabled,je=Te.init(this.clippingPlanes,$e),A=de.get(S,E.length),A.init(),E.push(A),_e.enabled===!0&&_e.isPresenting===!0){let ye=C.xr.getDepthSensingMesh();ye!==null&&Ql(ye,B,-1/0,C.sortObjects)}Ql(S,B,0,C.sortObjects),A.finish(),C.sortObjects===!0&&A.sort(De,Oe,B.reversedDepth),mt=_e.enabled===!1||_e.isPresenting===!1||_e.hasDepthSensing()===!1,mt&&Be.addToRenderList(A,S),this.info.render.frame++,this.info.autoReset===!0&&this.info.reset(),je===!0&&Te.beginShadows();let G=w.state.shadowsArray;if(Ie.render(G,S,B),je===!0&&Te.endShadows(),(H&&T.hasRenderPass())===!1){let ye=A.opaque,pe=A.transmissive;if(w.setupLights(),B.isArrayCamera){let be=B.cameras;if(pe.length>0)for(let we=0,ze=be.length;we<ze;we++){let He=be[we];uu(ye,pe,S,He)}mt&&Be.render(S);for(let we=0,ze=be.length;we<ze;we++){let He=be[we];hu(A,S,He,He.viewport)}}else pe.length>0&&uu(ye,pe,S,B),mt&&Be.render(S),hu(A,S,B)}K!==null&&z===0&&(Y.updateMultisampleRenderTarget(K),Y.updateRenderTargetMipmap(K)),H&&T.end(C),S.isScene===!0&&S.onAfterRender(C,S,B),ge.resetDefaultState(),j=-1,se=null,x.pop(),x.length>0?(w=x[x.length-1],Y.setTextureUnits(w.state.textureUnits),je===!0&&Te.setGlobalState(C.clippingPlanes,w.state.camera)):w=null,E.pop(),E.length>0?A=E[E.length-1]:A=null,L!==null&&L.renderEnd()};function Ql(S,B,X,H){if(S.visible===!1)return;if(S.layers.test(B.layers)){if(S.isGroup)X=S.renderOrder;else if(S.isLOD)S.autoUpdate===!0&&S.update(B);else if(S.isLightProbeGrid)w.pushLightProbeGrid(S);else if(S.isLight)w.pushLight(S),S.castShadow&&w.pushShadow(S);else if(S.isSprite){if(!S.frustumCulled||st.intersectsSprite(S)){H&&Ut.setFromMatrixPosition(S.matrixWorld).applyMatrix4(wt);let ye=J.update(S),pe=S.material;pe.visible&&A.push(S,ye,pe,X,Ut.z,null)}}else if((S.isMesh||S.isLine||S.isPoints)&&(!S.frustumCulled||st.intersectsObject(S))){let ye=J.update(S),pe=S.material;if(H&&(S.boundingSphere!==void 0?(S.boundingSphere===null&&S.computeBoundingSphere(),Ut.copy(S.boundingSphere.center)):(ye.boundingSphere===null&&ye.computeBoundingSphere(),Ut.copy(ye.boundingSphere.center)),Ut.applyMatrix4(S.matrixWorld).applyMatrix4(wt)),Array.isArray(pe)){let be=ye.groups;for(let we=0,ze=be.length;we<ze;we++){let He=be[we],Ee=pe[He.materialIndex];Ee&&Ee.visible&&A.push(S,ye,Ee,X,Ut.z,He)}}else pe.visible&&A.push(S,ye,pe,X,Ut.z,null)}}let me=S.children;for(let ye=0,pe=me.length;ye<pe;ye++)Ql(me[ye],B,X,H)}function hu(S,B,X,H){let{opaque:G,transmissive:me,transparent:ye}=S;w.setupLightsView(X),je===!0&&Te.setGlobalState(C.clippingPlanes,X),H&&_.viewport(fe.copy(H)),G.length>0&&oo(G,B,X),me.length>0&&oo(me,B,X),ye.length>0&&oo(ye,B,X),_.buffers.depth.setTest(!0),_.buffers.depth.setMask(!0),_.buffers.color.setMask(!0),_.setPolygonOffset(!1)}function uu(S,B,X,H){if((X.isScene===!0?X.overrideMaterial:null)!==null)return;if(w.state.transmissionRenderTarget[H.id]===void 0){let Ee=et.has("EXT_color_buffer_half_float")||et.has("EXT_color_buffer_float");w.state.transmissionRenderTarget[H.id]=new hn(1,1,{generateMipmaps:!0,type:Ee?qn:pn,minFilter:Ui,samples:Math.max(4,P.samples),stencilBuffer:r,resolveDepthBuffer:!1,resolveStencilBuffer:!1,colorSpace:qe.workingColorSpace})}let me=w.state.transmissionRenderTarget[H.id],ye=H.viewport||fe;me.setSize(ye.z*C.transmissionResolutionScale,ye.w*C.transmissionResolutionScale);let pe=C.getRenderTarget(),be=C.getActiveCubeFace(),we=C.getActiveMipmapLevel();C.setRenderTarget(me),C.getClearColor(pt),Je=C.getClearAlpha(),Je<1&&C.setClearColor(16777215,.5),C.clear(),mt&&Be.render(X);let ze=C.toneMapping;C.toneMapping=Cn;let He=H.viewport;if(H.viewport!==void 0&&(H.viewport=void 0),w.setupLightsView(H),je===!0&&Te.setGlobalState(C.clippingPlanes,H),oo(S,X,H),Y.updateMultisampleRenderTarget(me),Y.updateRenderTargetMipmap(me),et.has("WEBGL_multisampled_render_to_texture")===!1){let Ee=!1;for(let it=0,bt=B.length;it<bt;it++){let xt=B[it],{object:rt,geometry:Wt,material:xe,group:on}=xt;if(xe.side===rn&&rt.layers.test(H.layers)){let Ke=xe.side;xe.side=jt,xe.needsUpdate=!0,du(rt,X,H,Wt,xe,on),xe.side=Ke,xe.needsUpdate=!0,Ee=!0}}Ee===!0&&(Y.updateMultisampleRenderTarget(me),Y.updateRenderTargetMipmap(me))}C.setRenderTarget(pe,be,we),C.setClearColor(pt,Je),He!==void 0&&(H.viewport=He),C.toneMapping=ze}function oo(S,B,X){let H=B.isScene===!0?B.overrideMaterial:null;for(let G=0,me=S.length;G<me;G++){let ye=S[G],{object:pe,geometry:be,group:we}=ye,ze=ye.material;ze.allowOverride===!0&&H!==null&&(ze=H),pe.layers.test(X.layers)&&du(pe,B,X,be,ze,we)}}function du(S,B,X,H,G,me){S.onBeforeRender(C,B,X,H,G,me),S.modelViewMatrix.multiplyMatrices(X.matrixWorldInverse,S.matrixWorld),S.normalMatrix.getNormalMatrix(S.modelViewMatrix),G.onBeforeRender(C,B,X,H,S,me),G.transparent===!0&&G.side===rn&&G.forceSinglePass===!1?(G.side=jt,G.needsUpdate=!0,C.renderBufferDirect(X,B,H,G,S,me),G.side=ai,G.needsUpdate=!0,C.renderBufferDirect(X,B,H,G,S,me),G.side=rn):C.renderBufferDirect(X,B,H,G,S,me),S.onAfterRender(C,B,X,H,G,me)}function ao(S,B,X){B.isScene!==!0&&(B=Bt);let H=W.get(S),G=w.state.lights,me=w.state.shadowsArray,ye=G.state.version,pe=ce.getParameters(S,G.state,me,B,X,w.state.lightProbeGridArray),be=ce.getProgramCacheKey(pe),we=H.programs;H.environment=S.isMeshStandardMaterial||S.isMeshLambertMaterial||S.isMeshPhongMaterial?B.environment:null,H.fog=B.fog;let ze=S.isMeshStandardMaterial||S.isMeshLambertMaterial&&!S.envMap||S.isMeshPhongMaterial&&!S.envMap;H.envMap=ie.get(S.envMap||H.environment,ze),H.envMapRotation=H.environment!==null&&S.envMap===null?B.environmentRotation:S.envMapRotation,we===void 0&&(S.addEventListener("dispose",Un),we=new Map,H.programs=we);let He=we.get(be);if(He!==void 0){if(H.currentProgram===He&&H.lightsStateVersion===ye)return pu(S,pe),He}else pe.uniforms=ce.getUniforms(S),L!==null&&S.isNodeMaterial&&L.build(S,X,pe),S.onBeforeCompile(pe,C),He=ce.acquireProgram(pe,be),we.set(be,He),H.uniforms=pe.uniforms;let Ee=H.uniforms;return(!S.isShaderMaterial&&!S.isRawShaderMaterial||S.clipping===!0)&&(Ee.clippingPlanes=Te.uniform),pu(S,pe),H.needsLights=bp(S),H.lightsStateVersion=ye,H.needsLights&&(Ee.ambientLightColor.value=G.state.ambient,Ee.lightProbe.value=G.state.probe,Ee.directionalLights.value=G.state.directional,Ee.directionalLightShadows.value=G.state.directionalShadow,Ee.spotLights.value=G.state.spot,Ee.spotLightShadows.value=G.state.spotShadow,Ee.rectAreaLights.value=G.state.rectArea,Ee.ltc_1.value=G.state.rectAreaLTC1,Ee.ltc_2.value=G.state.rectAreaLTC2,Ee.pointLights.value=G.state.point,Ee.pointLightShadows.value=G.state.pointShadow,Ee.hemisphereLights.value=G.state.hemi,Ee.directionalShadowMatrix.value=G.state.directionalShadowMatrix,Ee.spotLightMatrix.value=G.state.spotLightMatrix,Ee.spotLightMap.value=G.state.spotLightMap,Ee.pointShadowMatrix.value=G.state.pointShadowMatrix),H.lightProbeGrid=w.state.lightProbeGridArray.length>0,H.currentProgram=He,H.uniformsList=null,He}function fu(S){if(S.uniformsList===null){let B=S.currentProgram.getUniforms();S.uniformsList=Hs.seqWithValue(B.seq,S.uniforms)}return S.uniformsList}function pu(S,B){let X=W.get(S);X.outputColorSpace=B.outputColorSpace,X.batching=B.batching,X.batchingColor=B.batchingColor,X.instancing=B.instancing,X.instancingColor=B.instancingColor,X.instancingMorph=B.instancingMorph,X.skinning=B.skinning,X.morphTargets=B.morphTargets,X.morphNormals=B.morphNormals,X.morphColors=B.morphColors,X.morphTargetsCount=B.morphTargetsCount,X.numClippingPlanes=B.numClippingPlanes,X.numIntersection=B.numClipIntersection,X.vertexAlphas=B.vertexAlphas,X.vertexTangents=B.vertexTangents,X.toneMapping=B.toneMapping}function yp(S,B){if(S.length===0)return null;if(S.length===1)return S[0].texture!==null?S[0]:null;v.setFromMatrixPosition(B.matrixWorld);for(let X=0,H=S.length;X<H;X++){let G=S[X];if(G.texture!==null&&G.boundingBox.containsPoint(v))return G}return null}function vp(S,B,X,H,G){B.isScene!==!0&&(B=Bt),Y.resetTextureUnits();let me=B.fog,ye=H.isMeshStandardMaterial||H.isMeshLambertMaterial||H.isMeshPhongMaterial?B.environment:null,pe=K===null?C.outputColorSpace:K.isXRRenderTarget===!0?K.texture.colorSpace:qe.workingColorSpace,be=H.isMeshStandardMaterial||H.isMeshLambertMaterial&&!H.envMap||H.isMeshPhongMaterial&&!H.envMap,we=ie.get(H.envMap||ye,be),ze=H.vertexColors===!0&&!!X.attributes.color&&X.attributes.color.itemSize===4,He=!!X.attributes.tangent&&(!!H.normalMap||H.anisotropy>0),Ee=!!X.morphAttributes.position,it=!!X.morphAttributes.normal,bt=!!X.morphAttributes.color,xt=Cn;H.toneMapped&&(K===null||K.isXRRenderTarget===!0)&&(xt=C.toneMapping);let rt=X.morphAttributes.position||X.morphAttributes.normal||X.morphAttributes.color,Wt=rt!==void 0?rt.length:0,xe=W.get(H),on=w.state.lights;if(je===!0&&($e===!0||S!==se)){let ht=S===se&&H.id===j;Te.setState(H,S,ht)}let Ke=!1;H.version===xe.__version?(xe.needsLights&&xe.lightsStateVersion!==on.state.version||xe.outputColorSpace!==pe||G.isBatchedMesh&&xe.batching===!1||!G.isBatchedMesh&&xe.batching===!0||G.isBatchedMesh&&xe.batchingColor===!0&&G.colorTexture===null||G.isBatchedMesh&&xe.batchingColor===!1&&G.colorTexture!==null||G.isInstancedMesh&&xe.instancing===!1||!G.isInstancedMesh&&xe.instancing===!0||G.isSkinnedMesh&&xe.skinning===!1||!G.isSkinnedMesh&&xe.skinning===!0||G.isInstancedMesh&&xe.instancingColor===!0&&G.instanceColor===null||G.isInstancedMesh&&xe.instancingColor===!1&&G.instanceColor!==null||G.isInstancedMesh&&xe.instancingMorph===!0&&G.morphTexture===null||G.isInstancedMesh&&xe.instancingMorph===!1&&G.morphTexture!==null||xe.envMap!==we||H.fog===!0&&xe.fog!==me||xe.numClippingPlanes!==void 0&&(xe.numClippingPlanes!==Te.numPlanes||xe.numIntersection!==Te.numIntersection)||xe.vertexAlphas!==ze||xe.vertexTangents!==He||xe.morphTargets!==Ee||xe.morphNormals!==it||xe.morphColors!==bt||xe.toneMapping!==xt||xe.morphTargetsCount!==Wt||!!xe.lightProbeGrid!=w.state.lightProbeGridArray.length>0)&&(Ke=!0):(Ke=!0,xe.__version=H.version);let gn=xe.currentProgram;Ke===!0&&(gn=ao(H,B,G),L&&H.isNodeMaterial&&L.onUpdateProgram(H,gn,xe));let Nn=!1,fi=!1,us=!1,ot=gn.getUniforms(),Mt=xe.uniforms;if(_.useProgram(gn.program)&&(Nn=!0,fi=!0,us=!0),H.id!==j&&(j=H.id,fi=!0),xe.needsLights){let ht=yp(w.state.lightProbeGridArray,G);xe.lightProbeGrid!==ht&&(xe.lightProbeGrid=ht,fi=!0)}if(Nn||se!==S){_.buffers.depth.getReversed()&&S.reversedDepth!==!0&&(S._reversedDepth=!0,S.updateProjectionMatrix()),ot.setValue(O,"projectionMatrix",S.projectionMatrix),ot.setValue(O,"viewMatrix",S.matrixWorldInverse);let mi=ot.map.cameraPosition;mi!==void 0&&mi.setValue(O,Pt.setFromMatrixPosition(S.matrixWorld)),P.logarithmicDepthBuffer&&ot.setValue(O,"logDepthBufFC",2/(Math.log(S.far+1)/Math.LN2)),(H.isMeshPhongMaterial||H.isMeshToonMaterial||H.isMeshLambertMaterial||H.isMeshBasicMaterial||H.isMeshStandardMaterial||H.isShaderMaterial)&&ot.setValue(O,"isOrthographic",S.isOrthographicCamera===!0),se!==S&&(se=S,fi=!0,us=!0)}if(xe.needsLights&&(on.state.directionalShadowMap.length>0&&ot.setValue(O,"directionalShadowMap",on.state.directionalShadowMap,Y),on.state.spotShadowMap.length>0&&ot.setValue(O,"spotShadowMap",on.state.spotShadowMap,Y),on.state.pointShadowMap.length>0&&ot.setValue(O,"pointShadowMap",on.state.pointShadowMap,Y)),G.isSkinnedMesh){ot.setOptional(O,G,"bindMatrix"),ot.setOptional(O,G,"bindMatrixInverse");let ht=G.skeleton;ht&&(ht.boneTexture===null&&ht.computeBoneTexture(),ot.setValue(O,"boneTexture",ht.boneTexture,Y))}G.isBatchedMesh&&(ot.setOptional(O,G,"batchingTexture"),ot.setValue(O,"batchingTexture",G._matricesTexture,Y),ot.setOptional(O,G,"batchingIdTexture"),ot.setValue(O,"batchingIdTexture",G._indirectTexture,Y),ot.setOptional(O,G,"batchingColorTexture"),G._colorsTexture!==null&&ot.setValue(O,"batchingColorTexture",G._colorsTexture,Y));let pi=X.morphAttributes;if((pi.position!==void 0||pi.normal!==void 0||pi.color!==void 0)&&F.update(G,X,gn),(fi||xe.receiveShadow!==G.receiveShadow)&&(xe.receiveShadow=G.receiveShadow,ot.setValue(O,"receiveShadow",G.receiveShadow)),(H.isMeshStandardMaterial||H.isMeshLambertMaterial||H.isMeshPhongMaterial)&&H.envMap===null&&B.environment!==null&&(Mt.envMapIntensity.value=B.environmentIntensity),Mt.dfgLUT!==void 0&&(Mt.dfgLUT.value=Yv()),fi){if(ot.setValue(O,"toneMappingExposure",C.toneMappingExposure),xe.needsLights&&_p(Mt,us),me&&H.fog===!0&&Se.refreshFogUniforms(Mt,me),Se.refreshMaterialUniforms(Mt,H,ne,ae,w.state.transmissionRenderTarget[S.id]),xe.needsLights&&xe.lightProbeGrid){let ht=xe.lightProbeGrid;Mt.probesSH.value=ht.texture,Mt.probesMin.value.copy(ht.boundingBox.min),Mt.probesMax.value.copy(ht.boundingBox.max),Mt.probesResolution.value.copy(ht.resolution)}Hs.upload(O,fu(xe),Mt,Y)}if(H.isShaderMaterial&&H.uniformsNeedUpdate===!0&&(Hs.upload(O,fu(xe),Mt,Y),H.uniformsNeedUpdate=!1),H.isSpriteMaterial&&ot.setValue(O,"center",G.center),ot.setValue(O,"modelViewMatrix",G.modelViewMatrix),ot.setValue(O,"normalMatrix",G.normalMatrix),ot.setValue(O,"modelMatrix",G.matrixWorld),H.uniformsGroups!==void 0){let ht=H.uniformsGroups;for(let mi=0,ds=ht.length;mi<ds;mi++){let mu=ht[mi];ee.update(mu,gn),ee.bind(mu,gn)}}return gn}function _p(S,B){S.ambientLightColor.needsUpdate=B,S.lightProbe.needsUpdate=B,S.directionalLights.needsUpdate=B,S.directionalLightShadows.needsUpdate=B,S.pointLights.needsUpdate=B,S.pointLightShadows.needsUpdate=B,S.spotLights.needsUpdate=B,S.spotLightShadows.needsUpdate=B,S.rectAreaLights.needsUpdate=B,S.hemisphereLights.needsUpdate=B}function bp(S){return S.isMeshLambertMaterial||S.isMeshToonMaterial||S.isMeshPhongMaterial||S.isMeshStandardMaterial||S.isShadowMaterial||S.isShaderMaterial&&S.lights===!0}this.getActiveCubeFace=function(){return q},this.getActiveMipmapLevel=function(){return z},this.getRenderTarget=function(){return K},this.setRenderTargetTextures=function(S,B,X){let H=W.get(S);H.__autoAllocateDepthBuffer=S.resolveDepthBuffer===!1,H.__autoAllocateDepthBuffer===!1&&(H.__useRenderToTexture=!1),W.get(S.texture).__webglTexture=B,W.get(S.depthTexture).__webglTexture=H.__autoAllocateDepthBuffer?void 0:X,H.__hasExternalTextures=!0},this.setRenderTargetFramebuffer=function(S,B){let X=W.get(S);X.__webglFramebuffer=B,X.__useDefaultFramebuffer=B===void 0},this.setRenderTarget=function(S,B=0,X=0){K=S,q=B,z=X;let H=null,G=!1,me=!1;if(S){let pe=W.get(S);if(pe.__useDefaultFramebuffer!==void 0){_.bindFramebuffer(O.FRAMEBUFFER,pe.__webglFramebuffer),fe.copy(S.viewport),ve.copy(S.scissor),Ze=S.scissorTest,_.viewport(fe),_.scissor(ve),_.setScissorTest(Ze),j=-1;return}else if(pe.__webglFramebuffer===void 0)Y.setupRenderTarget(S);else if(pe.__hasExternalTextures)Y.rebindTextures(S,W.get(S.texture).__webglTexture,W.get(S.depthTexture).__webglTexture);else if(S.depthBuffer){let ze=S.depthTexture;if(pe.__boundDepthTexture!==ze){if(ze!==null&&W.has(ze)&&(S.width!==ze.image.width||S.height!==ze.image.height))throw new Error("THREE.WebGLRenderer: Attached DepthTexture is initialized to the incorrect size.");Y.setupDepthRenderbuffer(S)}}let be=S.texture;(be.isData3DTexture||be.isDataArrayTexture||be.isCompressedArrayTexture)&&(me=!0);let we=W.get(S).__webglFramebuffer;S.isWebGLCubeRenderTarget?(Array.isArray(we[B])?H=we[B][X]:H=we[B],G=!0):S.samples>0&&Y.useMultisampledRTT(S)===!1?H=W.get(S).__webglMultisampledFramebuffer:Array.isArray(we)?H=we[X]:H=we,fe.copy(S.viewport),ve.copy(S.scissor),Ze=S.scissorTest}else fe.copy(Ce).multiplyScalar(ne).floor(),ve.copy(_t).multiplyScalar(ne).floor(),Ze=Xe;if(X!==0&&(H=I),_.bindFramebuffer(O.FRAMEBUFFER,H)&&_.drawBuffers(S,H),_.viewport(fe),_.scissor(ve),_.setScissorTest(Ze),G){let pe=W.get(S.texture);O.framebufferTexture2D(O.FRAMEBUFFER,O.COLOR_ATTACHMENT0,O.TEXTURE_CUBE_MAP_POSITIVE_X+B,pe.__webglTexture,X)}else if(me){let pe=B;for(let be=0;be<S.textures.length;be++){let we=W.get(S.textures[be]);O.framebufferTextureLayer(O.FRAMEBUFFER,O.COLOR_ATTACHMENT0+be,we.__webglTexture,X,pe)}}else if(S!==null&&X!==0){let pe=W.get(S.texture);O.framebufferTexture2D(O.FRAMEBUFFER,O.COLOR_ATTACHMENT0,O.TEXTURE_2D,pe.__webglTexture,X)}j=-1},this.readRenderTargetPixels=function(S,B,X,H,G,me,ye,pe=0){if(!(S&&S.isWebGLRenderTarget)){Le("WebGLRenderer.readRenderTargetPixels: renderTarget is not THREE.WebGLRenderTarget.");return}let be=W.get(S).__webglFramebuffer;if(S.isWebGLCubeRenderTarget&&ye!==void 0&&(be=be[ye]),be){_.bindFramebuffer(O.FRAMEBUFFER,be);try{let we=S.textures[pe],ze=we.format,He=we.type;if(S.textures.length>1&&O.readBuffer(O.COLOR_ATTACHMENT0+pe),!P.textureFormatReadable(ze)){Le("WebGLRenderer.readRenderTargetPixels: renderTarget is not in RGBA or implementation defined format.");return}if(!P.textureTypeReadable(He)){Le("WebGLRenderer.readRenderTargetPixels: renderTarget is not in UnsignedByteType or implementation defined type.");return}B>=0&&B<=S.width-H&&X>=0&&X<=S.height-G&&O.readPixels(B,X,H,G,ue.convert(ze),ue.convert(He),me)}finally{let we=K!==null?W.get(K).__webglFramebuffer:null;_.bindFramebuffer(O.FRAMEBUFFER,we)}}},this.readRenderTargetPixelsAsync=async function(S,B,X,H,G,me,ye,pe=0){if(!(S&&S.isWebGLRenderTarget))throw new Error("THREE.WebGLRenderer.readRenderTargetPixels: renderTarget is not THREE.WebGLRenderTarget.");let be=W.get(S).__webglFramebuffer;if(S.isWebGLCubeRenderTarget&&ye!==void 0&&(be=be[ye]),be)if(B>=0&&B<=S.width-H&&X>=0&&X<=S.height-G){_.bindFramebuffer(O.FRAMEBUFFER,be);let we=S.textures[pe],ze=we.format,He=we.type;if(S.textures.length>1&&O.readBuffer(O.COLOR_ATTACHMENT0+pe),!P.textureFormatReadable(ze))throw new Error("THREE.WebGLRenderer.readRenderTargetPixelsAsync: renderTarget is not in RGBA or implementation defined format.");if(!P.textureTypeReadable(He))throw new Error("THREE.WebGLRenderer.readRenderTargetPixelsAsync: renderTarget is not in UnsignedByteType or implementation defined type.");let Ee=O.createBuffer();O.bindBuffer(O.PIXEL_PACK_BUFFER,Ee),O.bufferData(O.PIXEL_PACK_BUFFER,me.byteLength,O.STREAM_READ),O.readPixels(B,X,H,G,ue.convert(ze),ue.convert(He),0);let it=K!==null?W.get(K).__webglFramebuffer:null;_.bindFramebuffer(O.FRAMEBUFFER,it);let bt=O.fenceSync(O.SYNC_GPU_COMMANDS_COMPLETE,0);return O.flush(),await Gd(O,bt,4),O.bindBuffer(O.PIXEL_PACK_BUFFER,Ee),O.getBufferSubData(O.PIXEL_PACK_BUFFER,0,me),O.deleteBuffer(Ee),O.deleteSync(bt),me}else throw new Error("THREE.WebGLRenderer.readRenderTargetPixelsAsync: requested read bounds are out of range.")},this.copyFramebufferToTexture=function(S,B=null,X=0){let H=Math.pow(2,-X),G=Math.floor(S.image.width*H),me=Math.floor(S.image.height*H),ye=B!==null?B.x:0,pe=B!==null?B.y:0;Y.setTexture2D(S,0),O.copyTexSubImage2D(O.TEXTURE_2D,X,0,0,ye,pe,G,me),_.unbindTexture()},this.copyTextureToTexture=function(S,B,X=null,H=null,G=0,me=0){let ye,pe,be,we,ze,He,Ee,it,bt,xt=S.isCompressedTexture?S.mipmaps[me]:S.image;if(X!==null)ye=X.max.x-X.min.x,pe=X.max.y-X.min.y,be=X.isBox3?X.max.z-X.min.z:1,we=X.min.x,ze=X.min.y,He=X.isBox3?X.min.z:0;else{let Mt=Math.pow(2,-G);ye=Math.floor(xt.width*Mt),pe=Math.floor(xt.height*Mt),S.isDataArrayTexture?be=xt.depth:S.isData3DTexture?be=Math.floor(xt.depth*Mt):be=1,we=0,ze=0,He=0}H!==null?(Ee=H.x,it=H.y,bt=H.z):(Ee=0,it=0,bt=0);let rt=ue.convert(B.format),Wt=ue.convert(B.type),xe;B.isData3DTexture?(Y.setTexture3D(B,0),xe=O.TEXTURE_3D):B.isDataArrayTexture||B.isCompressedArrayTexture?(Y.setTexture2DArray(B,0),xe=O.TEXTURE_2D_ARRAY):(Y.setTexture2D(B,0),xe=O.TEXTURE_2D),_.activeTexture(O.TEXTURE0),_.pixelStorei(O.UNPACK_FLIP_Y_WEBGL,B.flipY),_.pixelStorei(O.UNPACK_PREMULTIPLY_ALPHA_WEBGL,B.premultiplyAlpha),_.pixelStorei(O.UNPACK_ALIGNMENT,B.unpackAlignment);let on=_.getParameter(O.UNPACK_ROW_LENGTH),Ke=_.getParameter(O.UNPACK_IMAGE_HEIGHT),gn=_.getParameter(O.UNPACK_SKIP_PIXELS),Nn=_.getParameter(O.UNPACK_SKIP_ROWS),fi=_.getParameter(O.UNPACK_SKIP_IMAGES);_.pixelStorei(O.UNPACK_ROW_LENGTH,xt.width),_.pixelStorei(O.UNPACK_IMAGE_HEIGHT,xt.height),_.pixelStorei(O.UNPACK_SKIP_PIXELS,we),_.pixelStorei(O.UNPACK_SKIP_ROWS,ze),_.pixelStorei(O.UNPACK_SKIP_IMAGES,He);let us=S.isDataArrayTexture||S.isData3DTexture,ot=B.isDataArrayTexture||B.isData3DTexture;if(S.isDepthTexture){let Mt=W.get(S),pi=W.get(B),ht=W.get(Mt.__renderTarget),mi=W.get(pi.__renderTarget);_.bindFramebuffer(O.READ_FRAMEBUFFER,ht.__webglFramebuffer),_.bindFramebuffer(O.DRAW_FRAMEBUFFER,mi.__webglFramebuffer);for(let ds=0;ds<be;ds++)us&&(O.framebufferTextureLayer(O.READ_FRAMEBUFFER,O.COLOR_ATTACHMENT0,W.get(S).__webglTexture,G,He+ds),O.framebufferTextureLayer(O.DRAW_FRAMEBUFFER,O.COLOR_ATTACHMENT0,W.get(B).__webglTexture,me,bt+ds)),O.blitFramebuffer(we,ze,ye,pe,Ee,it,ye,pe,O.DEPTH_BUFFER_BIT,O.NEAREST);_.bindFramebuffer(O.READ_FRAMEBUFFER,null),_.bindFramebuffer(O.DRAW_FRAMEBUFFER,null)}else if(G!==0||S.isRenderTargetTexture||W.has(S)){let Mt=W.get(S),pi=W.get(B);_.bindFramebuffer(O.READ_FRAMEBUFFER,V),_.bindFramebuffer(O.DRAW_FRAMEBUFFER,D);for(let ht=0;ht<be;ht++)us?O.framebufferTextureLayer(O.READ_FRAMEBUFFER,O.COLOR_ATTACHMENT0,Mt.__webglTexture,G,He+ht):O.framebufferTexture2D(O.READ_FRAMEBUFFER,O.COLOR_ATTACHMENT0,O.TEXTURE_2D,Mt.__webglTexture,G),ot?O.framebufferTextureLayer(O.DRAW_FRAMEBUFFER,O.COLOR_ATTACHMENT0,pi.__webglTexture,me,bt+ht):O.framebufferTexture2D(O.DRAW_FRAMEBUFFER,O.COLOR_ATTACHMENT0,O.TEXTURE_2D,pi.__webglTexture,me),G!==0?O.blitFramebuffer(we,ze,ye,pe,Ee,it,ye,pe,O.COLOR_BUFFER_BIT,O.NEAREST):ot?O.copyTexSubImage3D(xe,me,Ee,it,bt+ht,we,ze,ye,pe):O.copyTexSubImage2D(xe,me,Ee,it,we,ze,ye,pe);_.bindFramebuffer(O.READ_FRAMEBUFFER,null),_.bindFramebuffer(O.DRAW_FRAMEBUFFER,null)}else ot?S.isDataTexture||S.isData3DTexture?O.texSubImage3D(xe,me,Ee,it,bt,ye,pe,be,rt,Wt,xt.data):B.isCompressedArrayTexture?O.compressedTexSubImage3D(xe,me,Ee,it,bt,ye,pe,be,rt,xt.data):O.texSubImage3D(xe,me,Ee,it,bt,ye,pe,be,rt,Wt,xt):S.isDataTexture?O.texSubImage2D(O.TEXTURE_2D,me,Ee,it,ye,pe,rt,Wt,xt.data):S.isCompressedTexture?O.compressedTexSubImage2D(O.TEXTURE_2D,me,Ee,it,xt.width,xt.height,rt,xt.data):O.texSubImage2D(O.TEXTURE_2D,me,Ee,it,ye,pe,rt,Wt,xt);_.pixelStorei(O.UNPACK_ROW_LENGTH,on),_.pixelStorei(O.UNPACK_IMAGE_HEIGHT,Ke),_.pixelStorei(O.UNPACK_SKIP_PIXELS,gn),_.pixelStorei(O.UNPACK_SKIP_ROWS,Nn),_.pixelStorei(O.UNPACK_SKIP_IMAGES,fi),me===0&&B.generateMipmaps&&O.generateMipmap(xe),_.unbindTexture()},this.initRenderTarget=function(S){W.get(S).__webglFramebuffer===void 0&&Y.setupRenderTarget(S)},this.initTexture=function(S){S.isCubeTexture?Y.setTextureCube(S,0):S.isData3DTexture?Y.setTexture3D(S,0):S.isDataArrayTexture||S.isCompressedArrayTexture?Y.setTexture2DArray(S,0):Y.setTexture2D(S,0),_.unbindTexture()},this.resetState=function(){q=0,z=0,K=null,_.reset(),ge.reset()},typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("observe",{detail:this}))}get coordinateSystem(){return An}get outputColorSpace(){return this._outputColorSpace}set outputColorSpace(e){this._outputColorSpace=e;let t=this.getContext();t.drawingBufferColorSpace=qe._getDrawingBufferColorSpace(e),t.unpackColorSpace=qe._getUnpackColorSpace()}};var Af=new dn,wl=new N,$n=class extends Lr{constructor(){super(),this.isLineSegmentsGeometry=!0,this.type="LineSegmentsGeometry";let e=[-1,2,0,1,2,0,-1,1,0,1,1,0,-1,0,0,1,0,0,-1,-1,0,1,-1,0],t=[-1,2,1,2,-1,1,1,1,-1,-1,1,-1,-1,-2,1,-2],n=[0,2,1,2,3,1,2,4,3,4,5,3,4,6,5,6,7,5];this.setIndex(n),this.setAttribute("position",new lt(e,3)),this.setAttribute("uv",new lt(t,2))}applyMatrix4(e){let t=this.attributes.instanceStart,n=this.attributes.instanceEnd;return t!==void 0&&(t.applyMatrix4(e),n.applyMatrix4(e),t.needsUpdate=!0),this.boundingBox!==null&&this.computeBoundingBox(),this.boundingSphere!==null&&this.computeBoundingSphere(),this}setPositions(e){let t;e instanceof Float32Array?t=e:Array.isArray(e)&&(t=new Float32Array(e));let n=new Di(t,6,1);return this.setAttribute("instanceStart",new Rn(n,3,0)),this.setAttribute("instanceEnd",new Rn(n,3,3)),this.instanceCount=this.attributes.instanceStart.count,this.computeBoundingBox(),this.computeBoundingSphere(),this}setColors(e){let t;e instanceof Float32Array?t=e:Array.isArray(e)&&(t=new Float32Array(e));let n=new Di(t,6,1);return this.setAttribute("instanceColorStart",new Rn(n,3,0)),this.setAttribute("instanceColorEnd",new Rn(n,3,3)),this}fromWireframeGeometry(e){return this.setPositions(e.attributes.position.array),this}fromEdgesGeometry(e){return this.setPositions(e.attributes.position.array),this}fromMesh(e){return this.fromWireframeGeometry(new Rr(e.geometry)),this}fromLineSegments(e){let t=e.geometry;return this.setPositions(t.attributes.position.array),this}computeBoundingBox(){this.boundingBox===null&&(this.boundingBox=new dn);let e=this.attributes.instanceStart,t=this.attributes.instanceEnd;e!==void 0&&t!==void 0&&(this.boundingBox.setFromBufferAttribute(e),Af.setFromBufferAttribute(t),this.boundingBox.union(Af))}computeBoundingSphere(){this.boundingSphere===null&&(this.boundingSphere=new Pn),this.boundingBox===null&&this.computeBoundingBox();let e=this.attributes.instanceStart,t=this.attributes.instanceEnd;if(e!==void 0&&t!==void 0){let n=this.boundingSphere.center;this.boundingBox.getCenter(n);let s=0;for(let r=0,o=e.count;r<o;r++)wl.fromBufferAttribute(e,r),s=Math.max(s,n.distanceToSquared(wl)),wl.fromBufferAttribute(t,r),s=Math.max(s,n.distanceToSquared(wl));this.boundingSphere.radius=Math.sqrt(s),isNaN(this.boundingSphere.radius)&&console.error("THREE.LineSegmentsGeometry.computeBoundingSphere(): Computed radius is NaN. The instanced position data is likely to have NaN values.",this)}}toJSON(){}};re.line={worldUnits:{value:1},linewidth:{value:1},resolution:{value:new Ge},dashOffset:{value:0},dashScale:{value:1},dashSize:{value:1},gapSize:{value:1}};Qt.line={uniforms:Gr.merge([re.common,re.fog,re.line]),vertexShader:`
		#include <common>
		#include <color_pars_vertex>
		#include <fog_pars_vertex>
		#include <logdepthbuf_pars_vertex>
		#include <clipping_planes_pars_vertex>

		uniform float linewidth;
		uniform vec2 resolution;

		attribute vec3 instanceStart;
		attribute vec3 instanceEnd;

		attribute vec3 instanceColorStart;
		attribute vec3 instanceColorEnd;

		#ifdef WORLD_UNITS

			varying vec4 worldPos;
			varying vec3 worldStart;
			varying vec3 worldEnd;

			#ifdef USE_DASH

				varying vec2 vUv;

			#endif

		#else

			varying vec2 vUv;

		#endif

		#ifdef USE_DASH

			uniform float dashScale;
			attribute float instanceDistanceStart;
			attribute float instanceDistanceEnd;
			varying float vLineDistance;

		#endif

		float trimSegmentAlpha( const in vec4 start, const in vec4 end ) {

			// compute the interpolation factor needed to trim the segment so it terminates
			// between the camera plane and the near plane

			// conservative estimate of the near plane
			float a = projectionMatrix[ 2 ][ 2 ]; // 3nd entry in 3th column
			float b = projectionMatrix[ 3 ][ 2 ]; // 3nd entry in 4th column

			// we need different nearEstimate formula for reversed and default depth buffer
			// a is positive with a reversed depth buffer so it can be used for controlling the code flow
			float nearEstimate = ( a > 0.0 ) ? ( - b / ( a + 1.0 ) ) : ( - 0.5 * b / a );

			return ( nearEstimate - start.z ) / ( end.z - start.z );

		}

		void main() {

			#ifdef USE_COLOR

				vColor.xyz = ( position.y < 0.5 ) ? instanceColorStart : instanceColorEnd;

			#endif

			float aspect = resolution.x / resolution.y;

			// camera space
			vec4 start = modelViewMatrix * vec4( instanceStart, 1.0 );
			vec4 end = modelViewMatrix * vec4( instanceEnd, 1.0 );

			#ifdef USE_DASH

				float lineDistanceStart = dashScale * instanceDistanceStart;
				float lineDistanceEnd = dashScale * instanceDistanceEnd;

			#endif

			#ifdef WORLD_UNITS

				worldStart = start.xyz;
				worldEnd = end.xyz;

			#else

				vUv = uv;

			#endif

			// special case for perspective projection, and segments that terminate either in, or behind, the camera plane
			// clearly the gpu firmware has a way of addressing this issue when projecting into ndc space
			// but we need to perform ndc-space calculations in the shader, so we must address this issue directly
			// perhaps there is a more elegant solution -- WestLangley

			bool perspective = ( projectionMatrix[ 2 ][ 3 ] == - 1.0 ); // 4th entry in the 3rd column

			if ( perspective ) {

				if ( start.z < 0.0 && end.z >= 0.0 ) {

					float alpha = trimSegmentAlpha( start, end );
					end.xyz = mix( start.xyz, end.xyz, alpha );

					#ifdef USE_DASH

						lineDistanceEnd = mix( lineDistanceStart, lineDistanceEnd, alpha );

					#endif

				} else if ( end.z < 0.0 && start.z >= 0.0 ) {

					float alpha = trimSegmentAlpha( end, start );
					start.xyz = mix( end.xyz, start.xyz, alpha );

					#ifdef USE_DASH

						lineDistanceStart = mix( lineDistanceEnd, lineDistanceStart, alpha );

					#endif

				}

			}

			#ifdef USE_DASH

				vLineDistance = ( position.y < 0.5 ) ? lineDistanceStart : lineDistanceEnd;
				vUv = uv;

			#endif

			// clip space
			vec4 clipStart = projectionMatrix * start;
			vec4 clipEnd = projectionMatrix * end;

			// ndc space
			vec3 ndcStart = clipStart.xyz / clipStart.w;
			vec3 ndcEnd = clipEnd.xyz / clipEnd.w;

			// direction
			vec2 dir = ndcEnd.xy - ndcStart.xy;

			// account for clip-space aspect ratio
			dir.x *= aspect;
			dir = normalize( dir );

			#ifdef WORLD_UNITS

				vec3 worldDir = normalize( end.xyz - start.xyz );
				vec3 tmpFwd = normalize( mix( start.xyz, end.xyz, 0.5 ) );
				vec3 worldUp = normalize( cross( worldDir, tmpFwd ) );
				vec3 worldFwd = cross( worldDir, worldUp );
				worldPos = position.y < 0.5 ? start: end;

				// height offset
				float hw = linewidth * 0.5;
				worldPos.xyz += position.x < 0.0 ? hw * worldUp : - hw * worldUp;

				// don't extend the line if we're rendering dashes because we
				// won't be rendering the endcaps
				#ifndef USE_DASH

					// cap extension
					worldPos.xyz += position.y < 0.5 ? - hw * worldDir : hw * worldDir;

					// add width to the box
					worldPos.xyz += worldFwd * hw;

					// endcaps
					if ( position.y > 1.0 || position.y < 0.0 ) {

						worldPos.xyz -= worldFwd * 2.0 * hw;

					}

				#endif

				// project the worldpos
				vec4 clip = projectionMatrix * worldPos;

				// shift the depth of the projected points so the line
				// segments overlap neatly
				vec3 clipPose = ( position.y < 0.5 ) ? ndcStart : ndcEnd;
				clip.z = clipPose.z * clip.w;

			#else

				vec2 offset = vec2( dir.y, - dir.x );
				// undo aspect ratio adjustment
				dir.x /= aspect;
				offset.x /= aspect;

				// sign flip
				if ( position.x < 0.0 ) offset *= - 1.0;

				// endcaps
				if ( position.y < 0.0 ) {

					offset += - dir;

				} else if ( position.y > 1.0 ) {

					offset += dir;

				}

				// adjust for linewidth
				offset *= linewidth;

				// adjust for clip-space to screen-space conversion // maybe resolution should be based on viewport ...
				offset /= resolution.y;

				// select end
				vec4 clip = ( position.y < 0.5 ) ? clipStart : clipEnd;

				// back to clip space
				offset *= clip.w;

				clip.xy += offset;

			#endif

			gl_Position = clip;

			vec4 mvPosition = ( position.y < 0.5 ) ? start : end; // this is an approximation

			#include <logdepthbuf_vertex>
			#include <clipping_planes_vertex>
			#include <fog_vertex>

		}
		`,fragmentShader:`
		uniform vec3 diffuse;
		uniform float opacity;
		uniform float linewidth;

		#ifdef USE_DASH

			uniform float dashOffset;
			uniform float dashSize;
			uniform float gapSize;

		#endif

		varying float vLineDistance;

		#ifdef WORLD_UNITS

			varying vec4 worldPos;
			varying vec3 worldStart;
			varying vec3 worldEnd;

			#ifdef USE_DASH

				varying vec2 vUv;

			#endif

		#else

			varying vec2 vUv;

		#endif

		#include <common>
		#include <color_pars_fragment>
		#include <fog_pars_fragment>
		#include <logdepthbuf_pars_fragment>
		#include <clipping_planes_pars_fragment>

		vec2 closestLineToLine(vec3 p1, vec3 p2, vec3 p3, vec3 p4) {

			float mua;
			float mub;

			vec3 p13 = p1 - p3;
			vec3 p43 = p4 - p3;

			vec3 p21 = p2 - p1;

			float d1343 = dot( p13, p43 );
			float d4321 = dot( p43, p21 );
			float d1321 = dot( p13, p21 );
			float d4343 = dot( p43, p43 );
			float d2121 = dot( p21, p21 );

			float denom = d2121 * d4343 - d4321 * d4321;

			float numer = d1343 * d4321 - d1321 * d4343;

			mua = numer / denom;
			mua = clamp( mua, 0.0, 1.0 );
			mub = ( d1343 + d4321 * ( mua ) ) / d4343;
			mub = clamp( mub, 0.0, 1.0 );

			return vec2( mua, mub );

		}

		void main() {

			float alpha = opacity;
			vec4 diffuseColor = vec4( diffuse, alpha );

			#include <clipping_planes_fragment>

			#ifdef USE_DASH

				if ( vUv.y < - 1.0 || vUv.y > 1.0 ) discard; // discard endcaps

				if ( mod( vLineDistance + dashOffset, dashSize + gapSize ) > dashSize ) discard; // todo - FIX

			#endif

			#ifdef WORLD_UNITS

				// Find the closest points on the view ray and the line segment
				vec3 rayEnd = normalize( worldPos.xyz ) * 1e5;
				vec3 lineDir = worldEnd - worldStart;
				vec2 params = closestLineToLine( worldStart, worldEnd, vec3( 0.0, 0.0, 0.0 ), rayEnd );

				vec3 p1 = worldStart + lineDir * params.x;
				vec3 p2 = rayEnd * params.y;
				vec3 delta = p1 - p2;
				float len = length( delta );
				float norm = len / linewidth;

				#ifndef USE_DASH

					#ifdef USE_ALPHA_TO_COVERAGE

						float dnorm = fwidth( norm );
						alpha = 1.0 - smoothstep( 0.5 - dnorm, 0.5 + dnorm, norm );

					#else

						if ( norm > 0.5 ) {

							discard;

						}

					#endif

				#endif

			#else

				#ifdef USE_ALPHA_TO_COVERAGE

					// artifacts appear on some hardware if a derivative is taken within a conditional
					float a = vUv.x;
					float b = ( vUv.y > 0.0 ) ? vUv.y - 1.0 : vUv.y + 1.0;
					float len2 = a * a + b * b;
					float dlen = fwidth( len2 );

					if ( abs( vUv.y ) > 1.0 ) {

						alpha = 1.0 - smoothstep( 1.0 - dlen, 1.0 + dlen, len2 );

					}

				#else

					if ( abs( vUv.y ) > 1.0 ) {

						float a = vUv.x;
						float b = ( vUv.y > 0.0 ) ? vUv.y - 1.0 : vUv.y + 1.0;
						float len2 = a * a + b * b;

						if ( len2 > 1.0 ) discard;

					}

				#endif

			#endif

			#include <logdepthbuf_fragment>
			#include <color_fragment>

			gl_FragColor = vec4( diffuseColor.rgb, alpha );

			#include <tonemapping_fragment>
			#include <colorspace_fragment>
			#include <fog_fragment>
			#include <premultiplied_alpha_fragment>

		}
		`};var Ws=class extends kt{constructor(e){super({type:"LineMaterial",uniforms:Gr.clone(Qt.line.uniforms),vertexShader:Qt.line.vertexShader,fragmentShader:Qt.line.fragmentShader,clipping:!0}),this.isLineMaterial=!0,this.setValues(e)}get color(){return this.uniforms.diffuse.value}set color(e){this.uniforms.diffuse.value=e}get worldUnits(){return"WORLD_UNITS"in this.defines}set worldUnits(e){e===!0!==this.worldUnits&&(this.needsUpdate=!0),e===!0?this.defines.WORLD_UNITS="":delete this.defines.WORLD_UNITS}get linewidth(){return this.uniforms.linewidth.value}set linewidth(e){this.uniforms.linewidth&&(this.uniforms.linewidth.value=e)}get dashed(){return"USE_DASH"in this.defines}set dashed(e){e===!0!==this.dashed&&(this.needsUpdate=!0),e===!0?this.defines.USE_DASH="":delete this.defines.USE_DASH}get dashScale(){return this.uniforms.dashScale.value}set dashScale(e){this.uniforms.dashScale.value=e}get dashSize(){return this.uniforms.dashSize.value}set dashSize(e){this.uniforms.dashSize.value=e}get dashOffset(){return this.uniforms.dashOffset.value}set dashOffset(e){this.uniforms.dashOffset.value=e}get gapSize(){return this.uniforms.gapSize.value}set gapSize(e){this.uniforms.gapSize.value=e}get opacity(){return this.uniforms.opacity.value}set opacity(e){this.uniforms&&(this.uniforms.opacity.value=e)}get resolution(){return this.uniforms.resolution.value}set resolution(e){this.uniforms.resolution.value.copy(e)}get alphaToCoverage(){return"USE_ALPHA_TO_COVERAGE"in this.defines}set alphaToCoverage(e){this.defines&&(e===!0!==this.alphaToCoverage&&(this.needsUpdate=!0),e===!0?this.defines.USE_ALPHA_TO_COVERAGE="":delete this.defines.USE_ALPHA_TO_COVERAGE)}};var zh=new nt,Pf=new N,Rf=new N,Vt=new nt,Ht=new nt,Kn=new nt,kh=new N,Vh=new at,Gt=new Dr,Cf=new N,El=new dn,Tl=new Pn,Zn=new nt,Jn,os;function If(i,e,t){return Zn.set(0,0,-e,1).applyMatrix4(i.projectionMatrix),Zn.multiplyScalar(1/Zn.w),Zn.x=os/t.width,Zn.y=os/t.height,Zn.applyMatrix4(i.projectionMatrixInverse),Zn.multiplyScalar(1/Zn.w),Math.abs(Math.max(Zn.x,Zn.y))}function Kv(i,e){let t=i.matrixWorld,n=i.geometry,s=n.attributes.instanceStart,r=n.attributes.instanceEnd,o=Math.min(n.instanceCount,s.count);for(let a=0,l=o;a<l;a++){Gt.start.fromBufferAttribute(s,a),Gt.end.fromBufferAttribute(r,a),Gt.applyMatrix4(t);let c=new N,h=new N;Jn.distanceSqToSegment(Gt.start,Gt.end,h,c),h.distanceTo(c)<os*.5&&e.push({point:h,pointOnLine:c,distance:Jn.origin.distanceTo(h),object:i,face:null,faceIndex:a,uv:null,uv1:null})}}function Zv(i,e,t){let n=e.projectionMatrix,r=i.material.resolution,o=i.matrixWorld,a=i.geometry,l=a.attributes.instanceStart,c=a.attributes.instanceEnd,h=Math.min(a.instanceCount,l.count),d=-e.near;Jn.at(1,Kn),Kn.w=1,Kn.applyMatrix4(e.matrixWorldInverse),Kn.applyMatrix4(n),Kn.multiplyScalar(1/Kn.w),Kn.x*=r.x/2,Kn.y*=r.y/2,Kn.z=0,kh.copy(Kn),Vh.multiplyMatrices(e.matrixWorldInverse,o);for(let u=0,m=h;u<m;u++){if(Vt.fromBufferAttribute(l,u),Ht.fromBufferAttribute(c,u),Vt.w=1,Ht.w=1,Vt.applyMatrix4(Vh),Ht.applyMatrix4(Vh),Vt.z>d&&Ht.z>d)continue;if(Vt.z>d){let M=Vt.z-Ht.z,v=(Vt.z-d)/M;Vt.lerp(Ht,v)}else if(Ht.z>d){let M=Ht.z-Vt.z,v=(Ht.z-d)/M;Ht.lerp(Vt,v)}Vt.applyMatrix4(n),Ht.applyMatrix4(n),Vt.multiplyScalar(1/Vt.w),Ht.multiplyScalar(1/Ht.w),Vt.x*=r.x/2,Vt.y*=r.y/2,Ht.x*=r.x/2,Ht.y*=r.y/2,Gt.start.copy(Vt),Gt.start.z=0,Gt.end.copy(Ht),Gt.end.z=0;let y=Gt.closestPointToPointParameter(kh,!0);Gt.at(y,Cf);let g=ph.lerp(Vt.z,Ht.z,y),f=g>=-1&&g<=1,b=kh.distanceTo(Cf)<os*.5;if(f&&b){Gt.start.fromBufferAttribute(l,u),Gt.end.fromBufferAttribute(c,u),Gt.start.applyMatrix4(o),Gt.end.applyMatrix4(o);let M=new N,v=new N;Jn.distanceSqToSegment(Gt.start,Gt.end,v,M),t.push({point:v,pointOnLine:M,distance:Jn.origin.distanceTo(v),object:i,face:null,faceIndex:u,uv:null,uv1:null})}}}var as=class extends At{constructor(e=new $n,t=new Ws({color:Math.random()*16777215})){super(e,t),this.isLineSegments2=!0,this.type="LineSegments2"}computeLineDistances(){let e=this.geometry,t=e.attributes.instanceStart,n=e.attributes.instanceEnd,s=new Float32Array(2*t.count);for(let o=0,a=0,l=t.count;o<l;o++,a+=2)Pf.fromBufferAttribute(t,o),Rf.fromBufferAttribute(n,o),s[a]=a===0?0:s[a-1],s[a+1]=s[a]+Pf.distanceTo(Rf);let r=new Di(s,2,1);return e.setAttribute("instanceDistanceStart",new Rn(r,1,0)),e.setAttribute("instanceDistanceEnd",new Rn(r,1,1)),this}raycast(e,t){let n=this.material.worldUnits,s=e.camera;if(s===null&&!n&&console.error('LineSegments2: "Raycaster.camera" needs to be set in order to raycast against LineSegments2 while worldUnits is set to false.'),n===!1&&(this.material.resolution.x===0||this.material.resolution.y===0))return;let r=e.params.Line2!==void 0&&e.params.Line2.threshold||0;Jn=e.ray;let o=this.matrixWorld,a=this.geometry,l=this.material;os=l.linewidth+r,a.boundingSphere===null&&a.computeBoundingSphere(),Tl.copy(a.boundingSphere).applyMatrix4(o);let c;if(n)c=os*.5;else{let d=Math.max(s.near,Tl.distanceToPoint(Jn.origin));c=If(s,d,l.resolution)}if(Tl.radius+=c,Jn.intersectsSphere(Tl)===!1)return;a.boundingBox===null&&a.computeBoundingBox(),El.copy(a.boundingBox).applyMatrix4(o);let h;if(n)h=os*.5;else{let d=Math.max(s.near,El.distanceToPoint(Jn.origin));h=If(s,d,l.resolution)}El.expandByScalar(h),Jn.intersectsBox(El)!==!1&&(n?Kv(this,t):Zv(this,s,t))}onBeforeRender(e){let t=this.material.uniforms;t&&t.resolution&&(e.getViewport(zh),this.material.uniforms.resolution.value.set(zh.z,zh.w))}};var Ft={background:15921386,face:14079702,faceSelected:9417960,faceHover:11980784,edge:2763306,edgeWire:1118481,edgeSelected:2845872,edgeHot:13382451,grid:14276303,axisX:13382451,axisY:3050327,axisZ:2845872},Jv={endpoint:3050327,midpoint:42405,"on-edge":13382451,origin:9133302,align:9133302,"align-combo":9133302,"edge-align":13382451,intersection:1118481,"cross-line":1118481,"axis-x":Ft.axisX,"axis-y":Ft.axisY,"axis-z":Ft.axisZ,"h-stop":14251782,"on-face":2845872},jv={x:Ft.axisX,y:Ft.axisY,z:Ft.axisZ,u:8947848,v:8947848,i:1118481},Lf=3050327,Qv=13382451,e_=1.6,t_=1.2,n_=1.2,i_=2.5,s_=5,Yr=1,Hh=50,r_=32,o_=900,Df={foveation:0,framebufferScale:1},a_=`
  attribute vec3 aColor;
  varying vec3 vColor;
  varying vec3 vNormal;
  void main() {
    vColor = aColor;
    vNormal = normal;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }`,l_=`
  uniform vec3 uLight;
  varying vec3 vColor;
  varying vec3 vNormal;
  void main() {
    float k = 0.66 + 0.34 * abs(dot(normalize(vNormal), uLight));
    gl_FragColor = vec4(vColor * k, 1.0);   // vColor \u5DF2\u662F sRGB\uFF0C\u76F4\u63A5\u51FA\uFF08\u4E0E\u65E7 shade() \u540C\u503C\uFF09
  }`,c_=i=>[(i>>16&255)/255,(i>>8&255)/255,(i&255)/255],Al=class{constructor(e){U(this,"renderer");U(this,"scene");U(this,"camOrtho");U(this,"camPersp");U(this,"dpr",1);U(this,"flatRes",{w:1,h:1});U(this,"resolution");U(this,"lineMats",[]);U(this,"lineMatPx",[]);U(this,"faceMesh");U(this,"faceMat");U(this,"edgeLines");U(this,"edgeMat");U(this,"hintLines");U(this,"snapMarker");U(this,"arcLines");U(this,"landingRing");U(this,"faceKey","");U(this,"edgeKey","");U(this,"hintKey","");U(this,"kernelIds",new WeakMap);U(this,"nextKernelId",1);U(this,"scratchV",new N);U(this,"scratchV2",new N);U(this,"scratchM",new at);U(this,"tmpColor",new We);U(this,"rig");U(this,"controllers",[]);U(this,"grips",[]);U(this,"hands",["none","none"]);U(this,"pointerVis",[]);U(this,"wrist",null);U(this,"xr");this.renderer=new bl({canvas:e,antialias:!0,powerPreference:"high-performance"}),this.scene=new mr,this.scene.background=new We(Ft.background),this.camOrtho=new ns(-1,1,1,-1,.1,2e4),this.camPersp=new Yt(50,1,1,2e4),this.resolution=new Ge(1,1),this.scene.add(this.buildStatic()),this.faceMat=new kt({vertexShader:a_,fragmentShader:l_,uniforms:{uLight:{value:new N(0,0,1)}},side:rn,polygonOffset:!0,polygonOffsetFactor:1,polygonOffsetUnits:1}),this.faceMesh=new At(new It,this.faceMat),this.faceMesh.frustumCulled=!1,this.faceMesh.visible=!1,this.scene.add(this.faceMesh),this.edgeMat=this.lineMat(e_,{offset:!0,vertexColors:!0}),this.edgeLines=new as(new $n,this.edgeMat),this.edgeLines.frustumCulled=!1,this.edgeLines.visible=!1,this.scene.add(this.edgeLines),this.hintLines=new as(new $n,this.lineMat(t_,{offset:!0,vertexColors:!0})),this.hintLines.frustumCulled=!1,this.hintLines.visible=!1,this.scene.add(this.hintLines),this.snapMarker=new At(new Os(1,12,8),new Wn({color:16777215})),this.snapMarker.visible=!1,this.scene.add(this.snapMarker),this.arcLines=new as(new $n,this.lineMat(i_,{offset:!0})),this.arcLines.frustumCulled=!1,this.arcLines.visible=!1,this.scene.add(this.arcLines),this.landingRing=new At(new Pr(.22,.3,32),new Wn({color:Lf,side:rn,depthTest:!1,transparent:!0,opacity:.85})),this.landingRing.renderOrder=9,this.landingRing.visible=!1,this.scene.add(this.landingRing);let t=this.renderer.xr;t.enabled=!0,t.setReferenceSpaceType("local-floor"),t.setFoveation(Df.foveation),t.setFramebufferScaleFactor(Df.framebufferScale),this.rig=new si,this.rig.add(this.camPersp),this.scene.add(this.rig);for(let n=0;n<2;n++){let s=t.getController(n);s.addEventListener("connected",c=>{this.hands[n]=c.data?.handedness??"none"}),s.addEventListener("disconnected",()=>{this.hands[n]="none"});let r=new It().setFromPoints([new N(0,0,0),new N(0,0,-1)]),o=new _r(r,new Fs({color:2845872,transparent:!0,opacity:.8}));o.visible=!1;let a=new At(new Os(1,12,8),new Wn({color:2845872,depthTest:!1}));a.renderOrder=11,a.visible=!1,s.add(o),s.add(a),this.pointerVis.push({line:o,cursor:a}),this.controllers.push(s),this.rig.add(s);let l=t.getControllerGrip(n);this.grips.push(l),this.rig.add(l)}this.xr={isPresenting:()=>!!t.isPresenting,setSession:n=>t.setSession(n),session:()=>t.getSession()??null,frame:()=>t.getFrame()??null,refSpace:()=>t.getReferenceSpace()??null,on:(n,s)=>t.addEventListener(n,s)}}setXRQuality(e){e.foveation!==void 0&&this.renderer.xr.setFoveation(Math.max(0,Math.min(1,e.foveation))),e.framebufferScale!==void 0&&this.renderer.xr.setFramebufferScaleFactor(Math.max(.5,Math.min(2,e.framebufferScale)))}setRig(e){this.rig.position.set(e.origin.x,e.origin.y,e.origin.z),this.rig.rotation.set(Math.PI/2,0,e.heading,"ZYX"),this.rig.updateMatrixWorld(!0)}ctrlIndex(e){return this.hands.indexOf(e)}setPointerVisual(e,t){let n=this.ctrlIndex(e);if(n<0)return;let s=this.pointerVis[n];if(!t){s.line.visible=!1,s.cursor.visible=!1;return}let r=Math.max(.05,t.length);s.line.visible=!0,s.cursor.visible=!0,s.line.scale.set(1,1,r),s.cursor.position.set(0,0,-r),s.cursor.scale.setScalar(Math.max(.002,r*.004)),s.line.material.color.setHex(t.color),s.cursor.material.color.setHex(t.color)}attachWristPanel(e,t,n,s){this.detachWristPanel();let r=new Mr(e);r.colorSpace=Zt;let o=new At(new ts(t,n),new Wn({map:r,transparent:!0,side:rn,depthTest:!1}));o.renderOrder=12,o.position.set(0,.04,.09),o.rotation.set(-Math.PI/2+.35,0,0);let a=this.ctrlIndex(s);(a>=0?this.grips[a]:this.grips[s==="left"?0:1]).add(o),this.wrist={mesh:o,tex:r,inv:new at}}detachWristPanel(){this.wrist&&(this.wrist.mesh.parent?.remove(this.wrist.mesh),this.wrist.mesh.geometry.dispose(),this.wrist.mesh.material.dispose(),this.wrist.tex.dispose(),this.wrist=null)}updateWristTexture(){this.wrist&&(this.wrist.tex.needsUpdate=!0)}wristHit(e){if(!this.wrist)return null;let t=this.wrist.mesh;t.updateWorldMatrix(!0,!1),this.wrist.inv.copy(t.matrixWorld).invert();let n=this.scratchV.set(e.origin.x,e.origin.y,e.origin.z).applyMatrix4(this.wrist.inv),s=this.scratchV2.set(e.dir.x,e.dir.y,e.dir.z).transformDirection(this.wrist.inv);if(Math.abs(s.z)<1e-6)return null;let r=-n.z/s.z;if(r<=0)return null;let o=n.x+s.x*r,a=n.y+s.y*r,l=t.geometry.parameters.width/2,c=t.geometry.parameters.height/2;if(o<-l||o>l||a<-c||a>c)return null;let h=r*Math.hypot(e.dir.x,e.dir.y,e.dir.z);return{u:(o+l)/(2*l),v:1-(a+c)/(2*c),dist:h}}xrEye(){if(!this.renderer.xr.isPresenting)return null;let e=this.renderer.xr.getCamera();return this.scratchV.setFromMatrixPosition(e.matrixWorld)}setLoop(e){this.renderer.setAnimationLoop(e)}resize(e,t){this.renderer.xr.isPresenting||(this.dpr=t,this.renderer.setPixelRatio(t),this.renderer.setSize(e.w,e.h,!1),this.flatRes={w:e.w*t,h:e.h*t})}syncLineScale(e){let t=this.dpr,n=this.flatRes.w,s=this.flatRes.h;if(e){let r=this.renderer.xr.getCamera().cameras?.[0]?.viewport;r&&r.w>0&&(n=r.z,s=r.w,t=r.w/o_)}this.resolution.set(n,s);for(let r=0;r<this.lineMats.length;r++)this.lineMats[r].linewidth=this.lineMatPx[r]*t}worldPerPx(e,t,n){let s=this.xrEye();return s?Math.max(.2,Math.hypot(n.x-s.x,n.y-s.y,n.z-s.z))*(Math.PI/180)/r_:e.projection==="persp"?2*Math.max(te(Pe(n,e.eye()),e.forward()),e.nearClamp())*Math.tan(e.fovY/2)/t.h:2*e.halfH/t.h}syncCamera(e,t){let n=e.eye(),s=e.up(),r;if(e.projection==="persp"){r=this.camPersp;let o=e.eyeDist();r.fov=e.fovY*180/Math.PI,r.aspect=t.w/t.h,r.near=Math.max(e.nearClamp(),o*.02),r.far=o*40+100}else{r=this.camOrtho;let o=e.halfW(t);r.left=-o,r.right=o,r.top=e.halfH,r.bottom=-e.halfH;let a=e.eyeDist(),l=Math.max(500,e.halfH*100);r.near=Math.max(.1,a-l),r.far=a+l}return r.position.set(n.x,n.y,n.z),r.up.set(s.x,s.y,s.z),r.lookAt(e.target.x,e.target.y,e.target.z),r.updateProjectionMatrix(),r}kernelId(e){let t=this.kernelIds.get(e);return t===void 0&&(t=this.nextKernelId++,this.kernelIds.set(e,t)),t}render(e,t,n,s){let r=!!this.renderer.xr.isPresenting,o;r?(o=this.camPersp,o.near=s.near??.05,o.far=2e3):(this.rig.position.set(0,0,0),this.rig.rotation.set(0,0,0),o=this.syncCamera(t,n)),this.syncLineScale(r);let a=s.preview??e,l=this.kernelId(a),c=s.revision??0,h=[...s.selectionFaces].join(","),d=[...s.selectionEdges].join(","),u=r?this.xrKeyLight():h_(t);this.faceMat.uniforms.uLight.value.set(u.x,u.y,u.z);let m=`${l}:${c}:${h}:${s.hoverFace??""}`;m!==this.faceKey&&(this.faceKey=m,this.rebuildFaces(a,s));let p=`${l}:${c}:${d}:${[...s.scrubEdges].join(",")}:${s.hoverEdge??""}`;p!==this.edgeKey&&(this.edgeKey=p,this.rebuildEdges(a,s));let y=s.snap;if(y?.kind){let f=Jv[y.kind]??2845872,b=this.snapMarker;b.visible=!0,b.position.set(y.p.x,y.p.y,y.p.z),b.scale.setScalar(s_*this.worldPerPx(t,n,y.p)),b.material.color.setHex(f);let M=null;if(y.hints?.length?M=y.hints.map(v=>({a:v.a,b:v.b,color:jv[v.axis]??8947848})):y.kind.startsWith("axis")&&s.snapAnchor&&(M=[{a:s.snapAnchor,b:y.p,color:f}]),M){let v=M.map(A=>`${A.color}:${A.a.x},${A.a.y},${A.a.z},${A.b.x},${A.b.y},${A.b.z}`).join("|");if(v!==this.hintKey){this.hintKey=v;let A=[],w=[];for(let E of M){A.push(E.a.x,E.a.y,E.a.z,E.b.x,E.b.y,E.b.z);let x=this.tmpColor.setHex(E.color);w.push(x.r,x.g,x.b,x.r,x.g,x.b)}this.setLineGeometry(this.hintLines,A,w)}this.hintLines.visible=!0}else this.hintLines.visible=!1}else this.snapMarker.visible=!1,this.hintLines.visible=!1;let g=s.teleport;if(g&&g.points.length>=2){let f=g.valid?Lf:Qv,b=[];for(let M=0;M+1<g.points.length;M++){let v=g.points[M],A=g.points[M+1];b.push(v.x,v.y,v.z,A.x,A.y,A.z)}this.setLineGeometry(this.arcLines,b,null),this.arcLines.material.color.setHex(f),this.arcLines.visible=!0,g.landing?(this.landingRing.visible=!0,this.landingRing.position.set(g.landing.x,g.landing.y,g.landing.z+.01),this.landingRing.material.color.setHex(f)):this.landingRing.visible=!1}else this.arcLines.visible=!1,this.landingRing.visible=!1;this.renderer.render(this.scene,o)}rebuildFaces(e,t){let n=[],s=[],r=[];for(let l of e.faces()){let c=t.selectionFaces.has(l.id)?Ft.faceSelected:t.hoverFace===l.id?Ft.faceHover:Ft.face,h=e.planeOf(l.id);if(!h)continue;let d=h.plane.n,[u,m,p]=c_(c);for(let y of Gh(e,l.id))for(let g of y)n.push(g.x,g.y,g.z),s.push(d.x,d.y,d.z),r.push(u,m,p)}let o=this.faceMesh.geometry;if(!n.length){this.faceMesh.visible=!1;return}let a=new It;a.setAttribute("position",new lt(n,3)),a.setAttribute("normal",new lt(s,3)),a.setAttribute("aColor",new lt(r,3)),this.faceMesh.geometry=a,this.faceMesh.visible=!0,o.dispose()}rebuildEdges(e,t){let n=[],s=[];for(let r of e.edges()){let o=t.scrubEdges.has(r.id)||t.hoverEdge===r.id?Ft.edgeHot:t.selectionEdges.has(r.id)?Ft.edgeSelected:r.faceLinks.length===0?Ft.edgeWire:Ft.edge,a=e.graph.pt(r.a),l=e.graph.pt(r.b);n.push(a.x,a.y,a.z,l.x,l.y,l.z);let c=this.tmpColor.setHex(o);s.push(c.r,c.g,c.b,c.r,c.g,c.b)}if(!n.length){this.edgeLines.visible=!1;return}this.setLineGeometry(this.edgeLines,n,s),this.edgeLines.visible=!0}setLineGeometry(e,t,n){let s=e.geometry,r=new $n;r.setPositions(t),n&&r.setColors(n),e.geometry=r,s.dispose()}xrKeyLight(){let t=this.renderer.xr.getCamera().matrixWorld.elements,n={x:t[8],y:t[9],z:t[10]},s={x:t[4],y:t[5],z:t[6]},r={x:t[0],y:t[1],z:t[2]},o={x:n.x+s.x*.55+r.x*.35,y:n.y+s.y*.55+r.y*.35,z:n.z+s.z*.55+r.z*.35},a=Math.hypot(o.x,o.y,o.z)||1;return{x:o.x/a,y:o.y/a,z:o.z/a}}lineMat(e,t={}){let n=new Ws({color:16777215,linewidth:e,resolution:this.resolution,vertexColors:!!t.vertexColors,polygonOffset:!!t.offset,polygonOffsetFactor:-1,polygonOffsetUnits:-2});return this.lineMats.push(n),this.lineMatPx.push(e),n}buildStatic(){let e=[],t=[],n=(a,l,c,h,d,u,m)=>{e.push(a,l,c,h,d,u);let p=this.tmpColor.setHex(m);t.push(p.r,p.g,p.b,p.r,p.g,p.b)},s=Hh*Yr;for(let a=-Hh;a<=Hh;a++)a!==0&&(n(a*Yr,-s,0,a*Yr,s,0,Ft.grid),n(-s,a*Yr,0,s,a*Yr,0,Ft.grid));n(-s,0,0,s,0,0,Ft.axisX),n(0,-s,0,0,s,0,Ft.axisY),n(0,0,0,0,0,s,Ft.axisZ);let r=new $n;r.setPositions(e),r.setColors(t);let o=new as(r,this.lineMat(n_,{vertexColors:!0}));return o.frustumCulled=!1,o}};function h_(i){let e=i.eyeDir(),t=i.up(),n=i.right(),s={x:e.x+t.x*.55+n.x*.35,y:e.y+t.y*.55+n.y*.35,z:e.z+t.z*.55+n.z*.35},r=Math.hypot(s.x,s.y,s.z)||1;return{x:s.x/r,y:s.y/r,z:s.z/r}}function Gh(i,e){let t=i.face(e),n=i.planeOf(e);if(!t||!n)return[];let s=t.outer.pts.map(m=>new Ge(m.x,m.y)),r=t.holes.map(m=>m.pts.map(p=>new Ge(p.x,p.y))),o=Ar.triangulateShape(s,r),a=[...s,...r.flat()],{u:l,v:c}=n.basis,h=n.plane.n,d=n.plane.d,u=m=>({x:l.x*m.x+c.x*m.y+h.x*d,y:l.y*m.x+c.y*m.y+h.y*d,z:l.z*m.x+c.z*m.y+h.z*d});return o.map(([m,p,y])=>[u(a[m]),u(a[p]),u(a[y])])}var yt=(i,e)=>({x:i,y:e}),zi=(i,e,t,n)=>[[yt(i,e),yt(t,e)],[yt(t,e),yt(t,n)],[yt(t,n),yt(i,n)],[yt(i,n),yt(i,e)]],Xs=[{name:"\u65E5\u5B57",note:"\u4E24\u819C\u5171\u8FB9\u2014\u2014\u64E6\u4E2D\u7F1D\u8BE5 MERGE",batches:[zi(-1,-.6,1,.6),[[yt(-1,0),yt(1,0)]]],expectFaces:2},{name:"\u56DE\u5B57",note:"\u73AF\u5E26+\u5185\u5C9B\u2014\u2014\u5220\u5185\u819C\u518D\u64E6\u6D1E\u8FB9\u770B ABSORB",batches:[zi(-1,-1,1,1),zi(-.4,-.4,.4,.4)],expectFaces:2},{name:"\u4E09\u5C42\u56DE\u5B57",note:"\u6697\u7901\u2460\u73B0\u573A\uFF1A\u4E2D\u73AF\u64E6=ABSORB\uFF1F\u5185\u73AF\u64E6=BURST\uFF1F\uFF08\u63A8\u5BFC\u503C\u5F85\u771F\u673A SU \u88C1\u51B3\uFF09",batches:[zi(-1.2,-1.2,1.2,1.2),zi(-.75,-.75,.75,.75),zi(-.3,-.3,.3,.3)],expectFaces:3},{name:"\u7530\u5B57",note:"\u5341\u5B57\u5212\u5206\u2014\u2014\u56DB\u819C\uFF1B\u64E6\u5341\u5B57\u4EFB\u4E00\u81C2\u770B MERGE \u94FE",batches:[zi(-1,-1,1,1),[[yt(0,-1),yt(0,1)]],[[yt(-1,0),yt(1,0)]]],expectFaces:4},{name:"T \u89E6\u78B0",note:"\u5916\u6765\u7EBF T \u5230\u8FB9\u4E0A\u2014\u2014\u5207\u8FB9\u4E0D\u751F\u819C\uFF08\u624B\u52BF\u8FB9\u88C1\u51B3\u7684\u53CD\u4F8B\u4F4D\uFF09",batches:[zi(-1,-.6,1,.6),[[yt(0,.6),yt(0,1.4)]]],expectFaces:1},{name:"\u5F00\u53E3\u65B9",note:"\u4E09\u8FB9\u5F00\u53E3\u2014\u2014\u4E0D\u51FA\u819C\uFF1B\u4F60\u8865\u7B2C\u56DB\u7B14\u770B BIRTH\uFF08\u63CF\u4E00\u7B14\u5C31\u51FA\uFF09",batches:[[[yt(-.8,-.8),yt(.8,-.8)],[yt(.8,-.8),yt(.8,.8)],[yt(.8,.8),yt(-.8,.8)]]],expectFaces:0}];function Ff(i,e){return e.batches.map(t=>i.addEdges(t))}function Wh(i,e){switch(e.op){case"clear":return{kernel:new xi,events:[]};case"preset":{let t=new xi,n=Xs.find(s=>s.name===e.name);return{kernel:t,events:n?Ff(t,n).flat():[]}}case"addEdges":return{kernel:i,events:i.addEdges(e.segs)};case"eraseEdges":return{kernel:i,events:i.eraseEdges(e.ids)};case"eraseFaces":return{kernel:i,events:i.eraseFaces(e.ids)};case"eraseSelection":return{kernel:i,events:[...i.eraseFaces(e.faces),...i.eraseEdges(e.edges)]};case"move":return{kernel:i,events:i.moveVertices(e.moves)};case"pushpull":return{kernel:i,events:i.pushPull(e.face,e.dist)}}}var Pl=class{constructor(){U(this,"ops",[]);U(this,"undone",[])}canUndo(){return this.ops.length>0}canRedo(){return this.undone.length>0}size(){return this.ops.length}commit(e,t){return this.ops.push(t),this.undone=[],Wh(e,t)}undo(){return this.ops.length?(this.undone.push(this.ops.pop()),this.replay()):null}redo(e){let t=this.undone.pop();return t?(this.ops.push(t),Wh(e,t)):null}replay(){let e=new xi;for(let t of this.ops)e=Wh(e,t).kernel;return e}};var Nf=["select","line","rect","move","pp","erase","eraseFace"],u_=8,d_=6,f_={endpoint:10,origin:10,midpoint:10,"on-edge":7,"edge-align":12,"align-combo":12,align:5,"axis-x":5,"axis-y":5,"axis-z":5},Uf={endpoint:"\u7AEF\u70B9",midpoint:"\u4E2D\u70B9","on-edge":"\u8FB9\u4E0A",origin:"\u539F\u70B9","axis-x":"X \u8F74","axis-y":"Y \u8F74","axis-z":"Z \u8F74",align:"\u5171\u8F74","align-combo":"\u5171\u8F74\u89D2\u70B9","edge-align":"\u8FB9\u4E0A\xB7\u5171\u8F74",intersection:"\u4EA4\u70B9","cross-line":"\u4EA4\u7EBF","h-stop":"\u9AD8\u5EA6\u54AC\u5408","on-face":"\u9762\u4E0A"};function qh(i){switch(i.type){case"BIRTH":return`\u8BDE\u751F \u9762#${i.face}`;case"DIVIDE":return`\u5206\u5272 \u9762#${i.from} \u2192 ${i.into.map(e=>`#${e}`).join(" + ")}`;case"MERGE":return`\u5408\u5E76 ${i.from.map(e=>`#${e}`).join("+")} \u2192 \u9762#${i.into}`;case"ABSORB":return`\u541E\u6D1E \u9762#${i.from} \u2192 \u9762#${i.into}`;case"BURST":return`\u7834\u819C \u9762#${i.face}`;case"STRETCH":return`\u62C9\u4F38 ${i.faces.map(e=>`\u9762#${e}`).join(" ")}`;case"FACE_ERASED":return`\u5220\u819C \u9762#${i.face}`}}var Xh=(i,e)=>Math.hypot(i.x-e.x,i.y-e.y,i.z-e.z),ls=.01;function $r(i,e=1){let t=Math.abs(i)<1,n=t?i*100:i,s=Number(n.toFixed(e));return(Math.abs(n-s)>1e-6?"~":"")+s.toFixed(e)+(t?" cm":" m")}var Rl=class{constructor(e,t){this.canvas=e;this.host=t;U(this,"cam",new mo);U(this,"r3");U(this,"checkpoint",new xi);U(this,"journal",new Pl);U(this,"_tool","line");U(this,"_revision",0);U(this,"anchor3",null);U(this,"gesturePlane",oc);U(this,"rectFixed",null);U(this,"cursor3",null);U(this,"snapInfo",null);U(this,"moveVids",[]);U(this,"ppFace",null);U(this,"ppNormal",null);U(this,"ppH",0);U(this,"ppShellVids",new Set);U(this,"ppKnownVids",new Set);U(this,"ppStops",[]);U(this,"scrubAcc",new Set);U(this,"scrubbing",!1);U(this,"selection",Mn());U(this,"marqueeStart",null);U(this,"marqueeCur",null);U(this,"hoverEdge",null);U(this,"hoverFace",null);U(this,"live",null);U(this,"liveEvents",[]);U(this,"armed",!1);U(this,"canArm",!1);U(this,"downScreen",null);U(this,"justCommitted",!1);U(this,"charged",new Map);U(this,"dwell",null);U(this,"lastSnap",null);U(this,"clickTrain",null);U(this,"pointerFrame",null);U(this,"viewExtras",null);U(this,"drawSuspended",!1);this.r3=new Al(e),this.cam.pitch=.61,this.cam.projection="persp"}get tool(){return this._tool}get kernel(){return this.checkpoint}get renderer3(){return this.r3}get revision(){return this._revision}canUndo(){return this.journal.canUndo()}canRedo(){return this.journal.canRedo()}hasSelection(){return this.selection.edges.size>0||this.selection.faces.size>0}isGestureActive(){return this.gestureActive()}vp(){return{w:this.canvas.clientWidth,h:this.canvas.clientHeight}}setPointerFrame(e,t){this.pointerFrame=e?{pf:e,vp:t??{w:800,h:800}}:null}frame(){return this.pointerFrame?.pf??this.cam}fvp(){return this.pointerFrame?.vp??this.vp()}snapPx(){return u_*vi(this.fvp())}hitPx(){return d_*vi(this.fvp())}setTool(e){this._tool=e,this.cancelGesture(),this.host.changed(),this.draw()}cancel(){this.selection=Mn(),this.cancelGesture(),this.host.changed(),this.draw()}cancelGesture(){this.anchor3=null,this.moveVids=[],this.ppFace=null,this.ppNormal=null,this.ppShellVids=new Set,this.ppKnownVids=new Set,this.ppStops=[],this.ppH=0,this.rectFixed=null,this.lastSnap=null,this.armed=!1,this.canArm=!1,this.downScreen=null,this.justCommitted=!1,this.cursor3=null,this.snapInfo=null,this.scrubAcc=new Set,this.scrubbing=!1,this.marqueeStart=this.marqueeCur=null,this.hoverEdge=null,this.hoverFace=null,this.live=null,this.liveEvents=[],this.host.marquee(null),this.host.tip(null,0,0),this.host.hint(null)}commitOp(e){let t=this.journal.commit(this.checkpoint,e);return this.checkpoint=t.kernel,this._revision++,this.revalidateCharged(),this.host.changed(),t.events}emit(e){e.length&&this.host.events(e)}undo(){let e=this.journal.undo();e&&(this.checkpoint=e,this._revision++,this.revalidateCharged(),this.cancelGesture(),this.selection=Mn(),this.host.separator("\u64A4\u9500"),this.host.changed(),this.draw())}redo(){let e=this.journal.redo(this.checkpoint);e&&(this.checkpoint=e.kernel,this._revision++,this.revalidateCharged(),this.cancelGesture(),this.selection=Mn(),this.host.separator("\u91CD\u505A"),this.emit(e.events),this.host.changed(),this.draw())}clearAll(){this.cancelGesture(),this.selection=Mn(),this.clearCharged(),this.host.separator("\u6E05\u7A7A"),this.commitOp({op:"clear"}),this.draw()}applyPreset(e){let t=Xs.find(n=>n.name===e);return t?(this.cancelGesture(),this.selection=Mn(),this.clearCharged(),this.host.separator(`\u9884\u7F6E\uFF1A${t.name}\uFF08${t.note}\uFF09`),this.emit(this.commitOp({op:"preset",name:e})),this.draw(),!0):!1}addSegments(e,t){this.cancelGesture(),this.selection=Mn(),this.host.separator(t);let n=this.commitOp({op:"addEdges",segs:e});return this.emit(n),this.draw(),n}pickAt(e,t){return On(this.liveWorld(),this.frame(),this.fvp(),e,t,this.hitPx())}selectExpand(e,t,n=!1){let s=this.checkpoint,r=Mn(),o=a=>{let l=s.face(a);if(l){r.faces.add(a);for(let c of[l.outer,...l.holes])for(let h of c.edges)r.edges.add(h.edge)}};if(e.edge!==void 0){if(r.edges.add(e.edge),t>=1)for(let a of s.graph.edge(e.edge).faceLinks)r.faces.add(a)}else e.face!==void 0&&(t>=1?o(e.face):r.faces.add(e.face));if(t>=2&&(e.edge!==void 0||e.face!==void 0)){let a=[...r.edges],l=[...r.faces];for(;a.length||l.length;){let c=l.pop();if(c!==void 0){let u=s.face(c);if(u)for(let m of[u.outer,...u.holes])for(let p of m.edges)r.edges.has(p.edge)||(r.edges.add(p.edge),a.push(p.edge));continue}let h=a.pop();if(!s.graph.hasEdge(h))continue;let d=s.graph.edge(h);for(let u of d.faceLinks)r.faces.has(u)||(r.faces.add(u),l.push(u));for(let u of[d.a,d.b])for(let m of s.graph.vertex(u).edges)r.edges.has(m)||(r.edges.add(m),a.push(m))}}if(n){for(let a of r.edges)this.selection.edges.add(a);for(let a of r.faces)this.selection.faces.add(a)}else this.selection=r;return this.host.changed(),this.draw(),!0}deleteSelection(){this.hasSelection()&&(this.emit(this.commitOp({op:"eraseSelection",faces:[...this.selection.faces],edges:[...this.selection.edges]})),this.selection=Mn(),this.host.changed(),this.draw())}setView(e){this.cam.setView(e),this.draw()}zoomExtents(){this.cam.fitPoints(this.checkpoint.vertices(),this.vp()),this.draw()}toggleProjection(){this.cam.projection=this.cam.projection==="persp"?"ortho":"persp",this.host.changed(),this.draw()}alignSrcs(){return[...this.charged.values()]}chargePt(e){let t=`${e.x},${e.y},${e.z}`;for(this.charged.delete(t),this.charged.set(t,{...e});this.charged.size>3;)this.charged.delete(this.charged.keys().next().value)}trackCharge(e,t=300){if(!e||e.kind!=="endpoint"&&e.kind!=="midpoint"){this.dwell=null;return}let n=`${e.p.x},${e.p.y},${e.p.z}`;if(this.charged.has(n)){this.dwell=null;return}let s=performance.now();if(!this.dwell||this.dwell.key!==n){this.dwell={key:n,since:s};return}s-this.dwell.since>=t&&(this.chargePt(e.p),this.dwell=null)}revalidateCharged(){if(!this.charged.size)return;let e=new Set;for(let t of this.checkpoint.vertices())e.add(`${t.x},${t.y},${t.z}`);for(let t of this.checkpoint.edges()){let n=this.checkpoint.graph.pt(t.a),s=this.checkpoint.graph.pt(t.b);e.add(`${(n.x+s.x)/2},${(n.y+s.y)/2},${(n.z+s.z)/2}`)}for(let t of[...this.charged.keys()])e.has(t)||this.charged.delete(t)}clearCharged(){this.charged.clear(),this.dwell=null,this.lastSnap=null}applyHysteresis(e,t,n){if(e.kind!==null)return this.lastSnap=e,e;if(this.lastSnap?.kind){let s=this.frame().angularPx(this.lastSnap.p,this.vp());if(Math.hypot(t-s.x,n-s.y)<=(f_[this.lastSnap.kind]??8)*1.5*vi(this.fvp()))return this.lastSnap}return this.lastSnap=null,e}gestureActive(){return this.anchor3!==null||this.moveVids.length>0||this.scrubbing||this.marqueeStart!==null}liveWorld(){return this.gestureActive()?this.live??this.checkpoint:this.checkpoint}freshHand(e,t=!1){let n=new Set(this.checkpoint.vertices().map(r=>r.id)),s={has:r=>!n.has(r)||(e?.(r)??!1),opaque:t};if(this._tool==="line"||this._tool==="rect"){let r=new Set;for(let o of this.liveEvents)o.type==="BIRTH"&&r.add(o.face);s.faces=o=>r.has(o)}return s}computeLive(){this.live=null,this.liveEvents=[];let e=s=>{let r=this.checkpoint.clone();this.liveEvents=s(r),this.live=r},t=this._tool,n="";if(t==="line"&&this.anchor3&&this.cursor3){let s=this.anchor3,r=this.cursor3;n=`\u957F ${$r(Xh(s,r))}`,Xh(s,r)>=ls&&e(o=>o.addEdges([[s,r]]))}else if(t==="rect"&&this.anchor3&&this.cursor3){let{plane:s,basis:r}=this.gesturePlane,o=cc(s,r,this.anchor3,this.cursor3),a=Pe(this.cursor3,this.anchor3),l=a.x*r.u.x+a.y*r.u.y+a.z*r.u.z,c=a.x*r.v.x+a.y*r.v.y+a.z*r.v.z;n=`\u77E9\u5F62 ${$r(Math.abs(l))} \xD7 ${$r(Math.abs(c))}`,o.length&&e(h=>h.addEdges(o))}else if(t==="move"&&this.moveVids.length&&this.anchor3&&this.cursor3){let s=Pe(this.cursor3,this.anchor3),r=this.moveVids;Math.hypot(s.x,s.y,s.z)>=ls&&e(o=>o.moveVertices(uc(this.checkpoint,r,s)))}else if(t==="pp"&&this.ppFace!==null&&Math.abs(this.ppH)>=ls){let s=this.ppFace,r=this.ppH-Math.sign(this.ppH)*2e-6;e(o=>o.pushPull(s,r,{settleLanding:!1}))}else if(t==="eraseFace"&&this.hoverFace!==null){let s=this.hoverFace;e(r=>r.eraseFaces([s]))}if(this.live||n){let s=this.live?this.liveEvents.length?`\u9884\u89C8\uFF1A${this.liveEvents.map(qh).join("\uFF1B")}`:"\u9884\u89C8\uFF1A\u65E0\u819C\u53D8\u5316":"";this.host.hint([n,s].filter(Boolean).join(" \uFF5C "))}}lineSecondSnap(e,t){let n=vo(this.liveWorld(),this.frame(),this.fvp(),this.anchor3,e,t,this.snapPx(),this.alignSrcs(),this.freshHand());return this.gesturePlane=n.plane,n.snap}rectPlaneSnap(e,t){if(this.rectFixed)return this.snapInfo=vn(this.liveWorld(),this.frame(),this.fvp(),e,t,this.snapPx(),{plane:this.gesturePlane,alignSources:this.alignSrcs(),hand:this.freshHand()}),this.snapInfo.p;let n=vo(this.liveWorld(),this.frame(),this.fvp(),this.anchor3,e,t,this.snapPx(),this.alignSrcs(),this.freshHand());return this.gesturePlane=n.plane,this.snapInfo=n.snap,n.snap.p}setLoop(e){this.r3.setLoop(e)}batchDraw(e){this.drawSuspended=!0;try{e()}finally{this.drawSuspended=!1}this.draw()}draw(){this.drawSuspended||this.r3.render(this.checkpoint,this.cam,this.vp(),{...this.viewExtras?.()??{},selectionEdges:this.selection.edges,selectionFaces:this.selection.faces,scrubEdges:this.scrubAcc,hoverEdge:this.hoverEdge,hoverFace:this.hoverFace,preview:this.live,snap:this.snapInfo,snapAnchor:this.anchor3,revision:this._revision})}resize(e){this.r3.resize(this.vp(),e),this.draw()}updateTip(e,t){this.host.tip(this.snapInfo?.kind?Uf[this.snapInfo.kind]??this.snapInfo.kind:null,e,t)}pointerDown(e){let t=e;switch(this._tool){case"line":case"rect":{if(this.armed&&this.anchor3){this.justCommitted=!0,this._tool==="line"?this.commitLineTo(t.x,t.y):this.commitRectTo(t.x,t.y);break}if(this._tool==="rect"){let n=lc(this.liveWorld(),this.frame(),this.fvp(),t.x,t.y,this.snapPx(),this.alignSrcs());this.rectFixed=n.fixed,this.gesturePlane=n.plane,this.snapInfo=n.snap}else{let n=lc(this.liveWorld(),this.frame(),this.fvp(),t.x,t.y,this.snapPx(),this.alignSrcs());this.gesturePlane=n.plane,this.snapInfo=n.snap}this.anchor3=this.snapInfo.p,this.cursor3=this.anchor3,this.armed=!1,this.canArm=e.pointerType==="mouse",this.downScreen={x:t.x,y:t.y};break}case"pp":{if(this.armed&&this.ppFace!==null&&this.anchor3){this.justCommitted=!0,this.commitPP();break}let n={face:js(this.liveWorld(),this.frame(),this.fvp(),t.x,t.y)};if(n.face!==void 0){let s=this.checkpoint,r=s.planeOf(n.face);this.ppFace=n.face;let o=s.face(n.face);this.ppShellVids=new Set([...an(s.graph,o.outer),...o.holes.flatMap(c=>an(s.graph,c))]),this.ppKnownVids=new Set(s.vertices().map(c=>c.id)),this.ppNormal=r.plane.n,this.gesturePlane={plane:r.plane,basis:r.basis};let a=this.frame().ray(t.x,t.y,this.vp()),l=Xi(a.origin,a.dir,r.plane.n,r.plane.d);this.anchor3=l??s.faceRings3(n.face).outer[0];{let c=new Set;c.add(0);for(let h of s.vertices())c.add(Math.round(te(Pe(h,this.anchor3),r.plane.n)*1e6)/1e6);this.ppStops=[...c].sort((h,d)=>h-d)}this.cursor3=this.anchor3,this.ppH=0,this.armed=!1,this.canArm=e.pointerType==="mouse",this.downScreen={x:t.x,y:t.y},this.host.hint("\u63A8\u62C9\u4E2D\uFF1A\u6CBF\u6CD5\u5411\u62D6\u6216\u70B9\u4E24\u4E0B\u843D\u5B9A\uFF08\u6240\u89C1\u5373\u6240\u5F97\uFF1B\u5438\u70B9\u7EBF=\u53D6\u5176\u9AD8\u5EA6\uFF09")}break}case"move":{if(this.armed&&this.moveVids.length&&this.anchor3){this.justCommitted=!0,this.commitMoveTo(t.x,t.y);break}let n=On(this.liveWorld(),this.frame(),this.fvp(),t.x,t.y,this.hitPx()),s=this.hasSelection();this.moveVids=s?Nu(this.checkpoint,this.selection):hc(this.checkpoint,n),this.moveVids.length&&(this.gesturePlane=ac(this.liveWorld(),this.frame(),this.fvp(),t.x,t.y),this.anchor3=n.vertex!==void 0?this.checkpoint.graph.pt(n.vertex):vn(this.liveWorld(),this.frame(),this.fvp(),t.x,t.y,this.snapPx(),{plane:this.gesturePlane,alignSources:this.alignSrcs(),hand:this.freshHand()}).p,this.cursor3=this.anchor3,this.armed=!1,this.canArm=e.pointerType==="mouse",this.downScreen={x:t.x,y:t.y},this.host.hint(s?"\u79FB\u52A8\u9009\u533A\uFF1A\u53C2\u8003\u70B9\u5DF2\u62FE\u53D6\uFF0C\u62D6\u62FD\u6216\u70B9\u4E24\u4E0B\u653E\u7F6E":"\u79FB\u52A8\u4E2D\u2026\u62D6\u62FD\u6216\u70B9\u4E24\u4E0B\u653E\u7F6E\uFF08\u6240\u89C1\u5373\u6240\u5F97\uFF09"));break}case"erase":{this.scrubbing=!0,this.scrubAcc=new Set,this.hoverEdge=null;let n=On(this.liveWorld(),this.frame(),this.fvp(),t.x,t.y,this.hitPx());n.edge!==void 0&&this.scrubAcc.add(n.edge),this.computeLive();break}case"select":this.marqueeStart={x:t.x,y:t.y},this.marqueeCur={x:t.x,y:t.y};break;case"eraseFace":break}this.draw()}pointerMove(e){let t=e;if(!this.gestureActive()){this.snapInfo=null,this.hoverEdge=null,this.hoverFace=null;let n=this._tool;if(n==="line"||n==="rect"||n==="move"){let s=ac(this.liveWorld(),this.frame(),this.fvp(),t.x,t.y);this.snapInfo=this.applyHysteresis(vn(this.liveWorld(),this.frame(),this.fvp(),t.x,t.y,this.snapPx(),{plane:s,alignSources:this.alignSrcs(),hand:this.freshHand()}),t.x,t.y),this.trackCharge(this.snapInfo)}else n==="erase"?this.hoverEdge=On(this.liveWorld(),this.frame(),this.fvp(),t.x,t.y,this.hitPx()).edge??null:n==="eraseFace"&&(this.hoverFace=js(this.liveWorld(),this.frame(),this.fvp(),t.x,t.y)??null,this.computeLive());this.updateTip(e.clientX,e.clientY),this.draw();return}switch(this._tool){case"line":this.anchor3&&(this.snapInfo=this.applyHysteresis(this.lineSecondSnap(t.x,t.y),t.x,t.y),this.trackCharge(this.snapInfo,120),this.cursor3=this.snapInfo.p);break;case"rect":this.anchor3&&(this.cursor3=this.rectPlaneSnap(t.x,t.y));break;case"pp":this.ppTrack(t.x,t.y,e.travelPx);break;case"move":if(this.moveVids.length&&this.anchor3){let n=new Set(this.moveVids);this.snapInfo=this.applyHysteresis(vn(this.liveWorld(),this.frame(),this.fvp(),t.x,t.y,this.snapPx(),{plane:this.gesturePlane,anchor:this.anchor3,alignSources:this.alignSrcs(),hand:this.freshHand(s=>n.has(s))}),t.x,t.y),this.trackCharge(this.snapInfo,120),this.cursor3=this.snapInfo.p}break;case"erase":{let n=On(this.liveWorld(),this.frame(),this.fvp(),t.x,t.y,this.hitPx());n.edge!==void 0&&this.scrubAcc.add(n.edge);break}case"select":if(this.marqueeStart){this.marqueeCur={x:t.x,y:t.y};let n=Math.min(this.marqueeStart.x,t.x),s=Math.max(this.marqueeStart.x,t.x),r=Math.min(this.marqueeStart.y,t.y),o=Math.max(this.marqueeStart.y,t.y);this.host.marquee({x:n,y:r,w:s-n,h:o-r})}break;case"eraseFace":break}this._tool!=="select"&&this.computeLive(),this.updateTip(e.clientX,e.clientY),this.draw()}ppTrack(e,t,n){if(this.ppFace===null||!this.anchor3||!this.ppNormal)return;let s=this.anchor3,r=this.ppNormal,o=this.liveWorld(),a=this.ppH,l={has:p=>this.ppShellVids.has(p)||!this.ppKnownVids.has(p)&&Math.abs(te(Pe(o.graph.pt(p),s),r)-a)<.01,opaque:!0},c=this.applyHysteresis(vn(o,this.frame(),this.fvp(),e,t,this.snapPx(),{plane:this.gesturePlane,anchor:s,lines:!1,hand:l}),e,t);this.hoverFace=null;let h="",d=!1;if(c.kind!==null)this.snapInfo=c,this.ppH=te(Pe(c.p,s),r),h=`\uFF5C\u53D6${Uf[c.kind]??c.kind}\u9AD8\u5EA6`;else{this.snapInfo=null;let p=this.frame().ray(e,t,this.vp()),y=On(o,this.frame(),this.fvp(),e,t,.5).face,g=y!==void 0?o.planeOf(y):void 0,f=y!==void 0&&(()=>{let b=o.face(y);return b?[...an(o.graph,b.outer),...b.holes.flatMap(M=>an(o.graph,M))].some(l.has):!0})();if(y!==void 0&&y!==this.ppFace&&!f&&g&&Math.abs(te(g.plane.n,r))>.05){let b=Xi(p.origin,p.dir,g.plane.n,g.plane.d);b&&(this.ppH=te(Pe(b,s),r),this.hoverFace=y,h="\uFF5C\u53D6\u9762#"+y+" \u9AD8\u5EA6")}else{let b=go(s,r,p.origin,p.dir);b?this.ppH=te(Pe(b,s),r):d=!0;let M=this.frame().angularPx(s,this.vp()),v=this.frame().angularPx(Ne(s,r),this.vp()),A=Math.max(Math.hypot(v.x-M.x,v.y-M.y),.5),w=7*vi(this.fvp())/A,E=null;for(let x of this.ppStops)Math.abs(x-this.ppH)<=w&&(E===null||Math.abs(x-this.ppH)<Math.abs(E-this.ppH))&&(E=x);E!==null&&(this.ppH=E,h=`\uFF5C\u9AD8\u5EA6\u54AC\u5408 ${$r(E)}`,this.snapInfo={p:Ne(s,Fe(r,this.ppH)),kind:"h-stop"})}}this.cursor3=Ne(s,Fe(r,this.ppH));let u=n??(this.downScreen?Math.hypot(e-this.downScreen.x,t-this.downScreen.y):0),m=Math.abs(te(r,this.frame().viewDir(s)));if(u>16*vi(this.fvp())&&Math.abs(this.ppH)<ls&&(d||m>.9)){this.host.hint("\u63A8\u62C9\u6CA1\u52A8\uFF1A\u6B63\u5BF9\u7740\u8FD9\u5F20\u9762\u770B\uFF0C\u6CD5\u5411\u548C\u89C6\u7EBF\u5E73\u884C\uFF0C\u62D6\u4E0D\u51FA\u9AD8\u5EA6\u2014\u2014\u73AF\u7ED5\u4E00\u4E0B\u6362\u4E2A\u89D2\u5EA6\u518D\u62C9\uFF08Esc \u53D6\u6D88\uFF09");return}this.host.hint(`\u63A8\u62C9 h = ${$r(this.ppH)}${h}\uFF08\u677E\u624B/\u518D\u70B9\u843D\u5B9A\uFF1BEsc \u53D6\u6D88\uFF09`)}pointerUp(e){let t=e,n=()=>!!this.downScreen&&(e.travelPx??Math.hypot(t.x-this.downScreen.x,t.y-this.downScreen.y))<=4;switch(this._tool){case"line":{if(!this.anchor3)break;if(this.justCommitted){this.justCommitted=!1;break}if(this.canArm&&n()){this.armed=!0,this.host.hint("\u79FB\u52A8\u9884\u89C8\uFF0C\u518D\u70B9\u4E00\u4E0B\u843D\u7B14\uFF1BEsc \u53D6\u6D88");break}this.commitLineTo(t.x,t.y);break}case"rect":{if(!this.anchor3)break;if(this.justCommitted){this.justCommitted=!1;break}if(this.canArm&&n()){this.armed=!0,this.host.hint("\u79FB\u52A8\u9884\u89C8\uFF0C\u518D\u70B9\u4E00\u4E0B\u843D\u77E9\u5F62\uFF1BEsc \u53D6\u6D88");break}this.commitRectTo(t.x,t.y);break}case"pp":{if(this.ppFace===null||!this.anchor3){this.cancelGesture();break}if(this.justCommitted){this.justCommitted=!1;break}if(this.canArm&&n()){this.armed=!0,this.host.hint("\u63A8\u62C9\u4E2D\uFF1A\u79FB\u52A8\u5B9A\u9AD8\u5EA6\uFF0C\u518D\u70B9\u4E00\u4E0B\u843D\u5B9A\uFF1BEsc \u53D6\u6D88");break}this.commitPP();break}case"move":{if(!this.moveVids.length||!this.anchor3){this.cancelGesture();break}if(this.justCommitted){this.justCommitted=!1;break}if(this.canArm&&n()){this.armed=!0,this.host.hint("\u79FB\u52A8\u4E2D\uFF1A\u6240\u89C1\u5373\u6240\u5F97\u9884\u89C8\uFF0C\u518D\u70B9\u4E00\u4E0B\u653E\u7F6E\uFF1BEsc \u53D6\u6D88");break}this.commitMoveTo(t.x,t.y);break}case"erase":{let s=[...this.scrubAcc];this.cancelGesture(),s.length&&this.emit(this.commitOp({op:"eraseEdges",ids:s}));break}case"select":{if(!this.marqueeStart||!this.marqueeCur){this.cancelGesture();break}let s=e.shiftKey,r=Math.hypot(this.marqueeCur.x-this.marqueeStart.x,this.marqueeCur.y-this.marqueeStart.y)>4,o;if(r)o=Uu(this.checkpoint,this.frame(),this.fvp(),{minX:Math.min(this.marqueeStart.x,this.marqueeCur.x),maxX:Math.max(this.marqueeStart.x,this.marqueeCur.x),minY:Math.min(this.marqueeStart.y,this.marqueeCur.y),maxY:Math.max(this.marqueeStart.y,this.marqueeCur.y)});else{let a=performance.now(),l=this.clickTrain&&a-this.clickTrain.t<350&&Math.hypot(t.x-this.clickTrain.x,t.y-this.clickTrain.y)<=6*vi(this.fvp())?{t:a,x:t.x,y:t.y,n:this.clickTrain.n+1}:{t:a,x:t.x,y:t.y,n:1};this.clickTrain=l;let c=On(this.liveWorld(),this.frame(),this.fvp(),t.x,t.y,this.hitPx());if(l.n>=2){this.marqueeStart=this.marqueeCur=null,this.host.marquee(null),this.selectExpand(c,l.n>=3?2:1,s);break}o=Mn(),c.edge!==void 0?o.edges.add(c.edge):c.face!==void 0&&o.faces.add(c.face)}if(s){for(let a of o.edges)this.selection.edges.add(a);for(let a of o.faces)this.selection.faces.add(a)}else this.selection=o;this.marqueeStart=this.marqueeCur=null,this.host.marquee(null),this.host.changed();break}case"eraseFace":{let s={face:js(this.liveWorld(),this.frame(),this.fvp(),t.x,t.y)};this.cancelGesture(),s.face!==void 0&&this.emit(this.commitOp({op:"eraseFaces",ids:[s.face]}));break}}this.draw()}pointerLeave(){this.gestureActive()||(this.snapInfo=null,this.hoverEdge=null,this.hoverFace=null,this.live=null,this.host.tip(null,0,0),this.host.hint(null),this.draw())}commitLineTo(e,t){let n=this.anchor3,s=this.lineSecondSnap(e,t).p;if(Xh(n,s)<ls){this.cancelGesture();return}let r=this.commitOp({op:"addEdges",segs:[[n,s]]});this.emit(r),this.chargePt(n),this.chargePt(s),this.cancelGesture(),!(r.length>0)&&(this.anchor3=s,this.cursor3=s,this.armed=!0,this.host.hint("\u8FDE\u753B\u4E2D\uFF1A\u70B9\u4E0B\u4E00\u70B9\uFF1B\u51FA\u819C\u81EA\u52A8\u505C\uFF1BEsc \u6536\u7B14"))}commitRectTo(e,t){let n=this.rectPlaneSnap(e,t),s=cc(this.gesturePlane.plane,this.gesturePlane.basis,this.anchor3,n);this.cancelGesture(),s.length&&this.emit(this.commitOp({op:"addEdges",segs:s}))}commitPP(){let e=this.ppH,t=this.ppFace;this.cancelGesture(),Math.abs(e)>=ls&&this.emit(this.commitOp({op:"pushpull",face:t,dist:e}))}commitMoveTo(e,t){let n=new Set(this.moveVids),s=vn(this.liveWorld(),this.frame(),this.fvp(),e,t,this.snapPx(),{plane:this.gesturePlane,anchor:this.anchor3,alignSources:this.alignSrcs(),hand:this.freshHand(l=>n.has(l))}).p,r=Pe(s,this.anchor3),o=this.moveVids,a=Math.hypot(r.x,r.y,r.z);this.cancelGesture(),a>=ls&&this.emit(this.commitOp({op:"move",moves:uc(this.checkpoint,o,r)}))}};var hi=i=>{let e=(Math.round(i*1e6)/1e6).toString();return e==="-0"?"0":e};function Of(i,e={}){let t=[];t.push(`# CatsUp OBJ export${e.version?` (${e.version})`:""} \u2014 Z-up world written as Y-up (x, z, -y)`);let n=new Map,s=[],r=l=>{let c=`${hi(l.x)},${hi(l.y)},${hi(l.z)}`,h=n.get(c);return h===void 0&&(h=n.size+1,n.set(c,h),s.push(`v ${hi(l.x)} ${hi(l.z)} ${hi(-l.y)}`)),h},o=[],a=0;for(let l of i.faces()){let c=i.faceRings3(l.id);if(c)if(l.holes.length===0)o.push(`f ${c.outer.map(h=>r(h)).join(" ")}`);else if(e.triangulateHoled)for(let[h,d,u]of e.triangulateHoled(i,l.id))o.push(`f ${r(h)} ${r(d)} ${r(u)}`);else a++,o.push(`f ${c.outer.map(h=>r(h)).join(" ")}`)}for(let l of i.edges())l.faceLinks.length===0&&o.push(`l ${r(i.graph.pt(l.a))} ${r(i.graph.pt(l.b))}`);return a&&t.push(`# warning: ${a} face(s) with holes exported as outer ring only (no triangulator supplied)`),t.push("o catsup"),t.push(...s,...o),t.join(`
`)+`
`}function Bf(i,e={}){let t=e.maxSegments??3e3,n=[],s=new Set,r=[],o=0,a=0,l=d=>`${hi(d.x)},${hi(d.y)},${hi(d.z)}`,c=(d,u)=>{let m=l(d),p=l(u);if(m===p)return;let y=m<p?`${m}|${p}`:`${p}|${m}`;if(!s.has(y)&&(s.add(y),r.push([d,u]),r.length>t))throw new Error(`OBJ \u592A\u5927\uFF1A\u8D85\u8FC7 ${t} \u6761\u8FB9\uFF08\u9003\u751F\u53E3\u53EA\u63A5\u591A\u8FB9\u5F62\u5EFA\u6A21\u91CF\u7EA7\uFF0C\u4E0D\u63A5\u4E09\u89D2\u6C64\uFF09`)},h=d=>{let u=parseInt(d.split("/")[0],10);if(!Number.isFinite(u)||u===0)return null;let m=u>0?u-1:n.length+u;return n[m]??null};for(let d of i.split(/\r?\n/)){let u=d.trim();if(!u||u.startsWith("#"))continue;let m=u.split(/\s+/),p=m[0];if(p==="v"){let y=parseFloat(m[1]),g=parseFloat(m[2]),f=parseFloat(m[3]);if(![y,g,f].every(Number.isFinite))continue;n.push({x:y,y:-f,z:g})}else if(p==="f"||p==="l"){let y=m.slice(1).map(h).filter(g=>g!==null);if(y.length<2)continue;if(p==="f"){o++;for(let g=0;g<y.length;g++)c(y[g],y[(g+1)%y.length])}else{a++;for(let g=0;g+1<y.length;g++)c(y[g],y[g+1])}}}return{segs:r,vertices:n.length,faces:o,looseLines:a}}function zf(i,e,t){let n=new Map,s=!1,r=-1/0,o=null,a=null,l=w=>{let E=i.getBoundingClientRect();return{x:w.clientX-E.left,y:w.clientY-E.top}},c=w=>{let E=l(w);return{x:E.x,y:E.y,clientX:w.clientX,clientY:w.clientY,pointerType:w.pointerType,shiftKey:w.shiftKey}},h=()=>[...n.entries()].filter(([,w])=>w.type==="touch"),d=()=>[...n.values()].some(w=>w.role==="tool");function u(w){let E=performance.now();for(let[x,T]of h())(w||E-T.lastAt>8e3)&&n.delete(x);h().length<2&&(o=null),h().length===0&&(a=null)}function m(){let w=h();if(w.length<2)return;let[[,E],[,x]]=w;o={cx:(E.x+x.x)/2,cy:(E.y+x.y)/2,d:Math.hypot(E.x-x.x,E.y-x.y)},a||(a={firstDownTime:Math.min(...w.map(([,T])=>T.downAt)),isTap:!0,maxCount:0,start:new Map}),a.maxCount=Math.max(a.maxCount,w.length);for(let[T,C]of w)a.start.has(T)||a.start.set(T,{x:C.downX,y:C.downY}),C.role="multi"}function p(w){let E=l(w);try{i.setPointerCapture(w.pointerId)}catch{}let x=performance.now();u(w.pointerType==="pen");let T={type:w.pointerType,role:"hold",x:E.x,y:E.y,downX:E.x,downY:E.y,downAt:x,lastAt:x};if(w.pointerType==="mouse"?(w.button===0?T.role=d()?"hold":"tool":T.role=w.shiftKey?"pan":"orbit",w.preventDefault()):w.pointerType==="pen"?(s=!0,r=x,T.role=d()?"hold":"tool"):x-r<600?T.role="hold":!s&&t.fingerDraws()&&h().length===0&&!d()?T.role="tool":T.role="orbit",n.set(w.pointerId,T),w.pointerType==="touch"){let C=h();if(C.length>=2){for(let[,R]of C)R.role==="tool"&&e.cancel();m();return}}if(T.role==="tool"){if(t.toolBlocked?.()){T.role="hold";return}e.pointerDown(c(w))}}function y(w){let E=n.get(w.pointerId),x=l(w);if(!E){w.pointerType!=="touch"&&!d()&&(t.toolBlocked?.()?e.pointerLeave():e.pointerMove(c(w)));return}let T=x.x-E.x,C=x.y-E.y;switch(E.x=x.x,E.y=x.y,E.lastAt=performance.now(),w.pointerType==="pen"&&(r=E.lastAt),E.role){case"tool":e.pointerMove(c(w));return;case"orbit":if(t.look?.(T,C)){e.draw();return}e.cam.orbit(T,C),e.draw();return;case"pan":if(t.look?.(T,C)){e.draw();return}e.cam.pan(T,C,e.vp()),e.draw();return;case"multi":{if(a?.isTap)for(let[z,K]of h()){let j=a.start.get(z);if(j&&Math.hypot(K.x-j.x,K.y-j.y)>16){a.isTap=!1;break}}let R=h().filter(([,z])=>z.role==="multi");if(R.length<2||!o)return;let[[,L],[,I]]=R,V=(L.x+I.x)/2,D=(L.y+I.y)/2,q=Math.hypot(L.x-I.x,L.y-I.y);if(t.walking?.()){o.cx=V,o.cy=D,o.d=q;return}e.cam.pan(V-o.cx,D-o.cy,e.vp()),q>1&&o.d>1&&e.cam.zoomAt(o.d/q,V,D,e.vp()),o.cx=V,o.cy=D,o.d=q,e.draw();return}case"hold":return}}function g(w,E){let x=n.get(w.pointerId);if(!x)return;n.delete(w.pointerId);let T=performance.now();if(w.pointerType==="pen"&&(r=T),x.role==="tool"){E?e.cancel():e.pointerUp(c(w));return}if(w.pointerType!=="touch")return;let C=h();if(C.length===0){if(a){let R=T-a.firstDownTime,L=T-r<600;!E&&a.isTap&&R<250&&!L&&(a.maxCount===2?t.onUndo():a.maxCount>=3&&t.onRedo()),a=null,o=null;return}x.role==="orbit"&&!E&&T-x.downAt<250&&Math.hypot(x.x-x.downX,x.y-x.downY)<16&&T-r>=600&&e.cancel();return}x.role==="multi"&&(C.length>=2?m():(C[0][1].role="hold",o=null))}let f=w=>{if(w.preventDefault(),t.walking?.())return;let E=i.getBoundingClientRect();e.cam.zoomAt(w.deltaY>0?1.1:1/1.1,w.clientX-E.left,w.clientY-E.top,e.vp()),e.draw()},b=()=>{d()||e.pointerLeave()},M=w=>w.preventDefault(),v=w=>g(w,!1),A=w=>g(w,!0);return i.addEventListener("pointerdown",p),i.addEventListener("pointermove",y),i.addEventListener("pointerup",v),i.addEventListener("pointercancel",A),i.addEventListener("pointerleave",b),i.addEventListener("wheel",f,{passive:!1}),i.addEventListener("contextmenu",M),{penEverSeen:()=>s,dispose(){i.removeEventListener("pointerdown",p),i.removeEventListener("pointermove",y),i.removeEventListener("pointerup",v),i.removeEventListener("pointercancel",A),i.removeEventListener("pointerleave",b),i.removeEventListener("wheel",f),i.removeEventListener("contextmenu",M)}}}var kf=1e-9;function p_(i,e,t){let n=Pe(t,e),s=te(n,n);if(s===0)return e;let r=Math.max(0,Math.min(1,te(Pe(i,e),n)/s));return{x:e.x+n.x*r,y:e.y+n.y*r,z:e.z+n.z*r}}var Cl=class{constructor(e,t=0){U(this,"faces",[]);U(this,"floor",0);U(this,"revision",-1);e&&this.rebuild(e,t)}rebuild(e,t=0){this.revision=t,this.faces=[];let n=0;for(let s of e.vertices())s.z<n&&(n=s.z);this.floor=n;for(let s of e.faces()){let r=e.planeOf(s.id),o=e.faceRings3(s.id);if(!r||!o||o.outer.length<3)continue;let a=[o.outer,...o.holes],l={x:1/0,y:1/0,z:1/0},c={x:-1/0,y:-1/0,z:-1/0};for(let h of o.outer)h.x<l.x&&(l.x=h.x),h.y<l.y&&(l.y=h.y),h.z<l.z&&(l.z=h.z),h.x>c.x&&(c.x=h.x),h.y>c.y&&(c.y=h.y),h.z>c.z&&(c.z=h.z);this.faces.push({plane:r.plane,basis:r.basis,outer2:s.outer.pts,holes2:s.holes.map(h=>h.pts),rings3:a,min:l,max:c})}}faceCount(){return this.faces.length}floorZ(){return this.floor}inside(e,t){let n={x:te(t,e.basis.u),y:te(t,e.basis.v)};if(!dt(n,e.outer2))return!1;for(let s of e.holes2)if(dt(n,s))return!1;return!0}pushOut(e,t){let n={x:e.x,y:e.y,z:e.z},s=!1;for(let r of this.faces){if(n.x+t<r.min.x||n.x-t>r.max.x||n.y+t<r.min.y||n.y-t>r.max.y||n.z+t<r.min.z||n.z-t>r.max.z)continue;let o=r.plane.n,a=te(o,n)-r.plane.d;if(Math.abs(a)>=t)continue;let l={x:n.x-o.x*a,y:n.y-o.y*a,z:n.z-o.z*a};if(this.inside(r,l)){let u=(a>=0?1:-1)*(t-Math.abs(a));n.x+=o.x*u,n.y+=o.y*u,n.z+=o.z*u,s=!0;continue}let c=null,h=t;for(let d of r.rings3)for(let u=0;u<d.length;u++){let m=p_(n,d[u],d[(u+1)%d.length]),p=Math.hypot(n.x-m.x,n.y-m.y,n.z-m.z);p<h&&(h=p,c=m)}if(c&&h>1e-12){let d=(t-h)/h;n.x+=(n.x-c.x)*d,n.y+=(n.y-c.y)*d,n.z+=(n.z-c.z)*d,s=!0}}return s?{x:n.x-e.x,y:n.y-e.y,z:n.z-e.z}:null}floorBelow(e,t,n,s,r){let o=this.floor<=n+1e-9&&this.floor>=s-1e-9?this.floor:null;for(let a of this.faces){let l=a.plane.n;if(Math.abs(l.z)<r||e<a.min.x-1e-9||e>a.max.x+1e-9||t<a.min.y-1e-9||t>a.max.y+1e-9||a.max.z<s-1e-9||a.min.z>n+1e-9)continue;let c=(a.plane.d-l.x*e-l.y*t)/l.z;c>n+1e-9||c<s-1e-9||o!==null&&c<=o||this.inside(a,{x:e,y:t,z:c})&&(o=c)}return o}segmentHit(e,t){let n=null,s=Pe(t,e);if(Math.abs(s.z)>kf){let a=(this.floor-e.z)/s.z;a>=0&&a<=1&&(n={p:{x:e.x+s.x*a,y:e.y+s.y*a,z:this.floor},n:{x:0,y:0,z:1},t:a})}let r={x:Math.min(e.x,t.x),y:Math.min(e.y,t.y),z:Math.min(e.z,t.z)},o={x:Math.max(e.x,t.x),y:Math.max(e.y,t.y),z:Math.max(e.z,t.z)};for(let a of this.faces){if(o.x<a.min.x||r.x>a.max.x||o.y<a.min.y||r.y>a.max.y||o.z<a.min.z||r.z>a.max.z)continue;let l=a.plane.n,c=te(l,s);if(Math.abs(c)<kf)continue;let h=(a.plane.d-te(l,e))/c;if(h<0||h>1||n&&h>=n.t)continue;let d={x:e.x+s.x*h,y:e.y+s.y*h,z:e.z+s.z*h};this.inside(a,d)&&(n={p:d,n:l,t:h})}return n}};function Ys(i=1.7){return{walkX:0,walkY:0,dash:!1,turn:0,tpCharge:!1,tpBack:!1,tierStep:0,yawStep:0,jump:!1,crouch:!1,up:!1,down:!1,noclipToggle:!1,head:{local:{x:0,y:0,z:i},fwdLocal:{x:0,y:1,z:0}},aim:null}}function Gf(i){return{...i,turn:0,tierStep:0,yawStep:0,noclipToggle:!1}}var Il={ENTER:.6,EXIT:.4,SECTOR_HALF:30*Math.PI/180,HOLD_HALF:45*Math.PI/180},Vf={right:0,up:Math.PI/2,left:Math.PI,down:-Math.PI/2},Hf=(i,e)=>{let t=i-e;for(;t>Math.PI;)t-=2*Math.PI;for(;t<-Math.PI;)t+=2*Math.PI;return Math.abs(t)},Kr=class{constructor(){U(this,"dir","none")}update(e,t){let n=Math.hypot(e,t),s=Math.atan2(t,e);if(this.dir!=="none"){if(n>=Il.EXIT&&Hf(s,Vf[this.dir])<=Il.HOLD_HALF)return this.dir;this.dir="none"}if(n>=Il.ENTER){for(let r of["up","down","left","right"])if(Hf(s,Vf[r])<=Il.SECTOR_HALF){this.dir=r;break}}return this.dir}},ui=class{constructor(){U(this,"was",!1)}update(e,t){let n=e===t,s=n&&!this.was;return this.was=n,s}},Zr=class{constructor(){U(this,"was",!1)}update(e){let t=e&&!this.was;return this.was=e,t}},qs=class{constructor(e=.35){U(this,"lastDown",-1/0);U(this,"was",!1);U(this,"windowSec");this.windowSec=e}update(e,t){let n=e&&!this.was;if(this.was=e,!n)return!1;let s=t-this.lastDown<=this.windowSec;return this.lastDown=s?-1/0:t,s}};var Yh=[5,8,12,1/0],m_=1,g_=9.8,Wf=.04,x_=3,$h=300,Kh=.3,y_=.15,v_=Math.PI/4;function Xf(i,e,t,n){let s=n.g??g_,r=[e.origin],o=null;if(Number.isFinite(t)){let a=e.dir.x*t,l=e.dir.y*t,c=e.dir.z*t,h=e.origin;for(let d=Wf;d<=x_+1e-9;d+=Wf){let u={x:e.origin.x+a*d,y:e.origin.y+l*d,z:e.origin.z+c*d-.5*s*d*d};if(o=i.segmentHit(h,u),o){r.push(o.p);break}r.push(u),h=u}}else{let a={x:e.origin.x+e.dir.x*$h,y:e.origin.y+e.dir.y*$h,z:e.origin.z+e.dir.z*$h};o=i.segmentHit(e.origin,a),r.push(o?o.p:a)}return o?Math.abs(o.n.z)<n.minNz?{points:r,hit:o,valid:!1,reason:"slope"}:n.headroomOk(o.p)?{points:r,hit:o,valid:!0,reason:"ok"}:{points:r,hit:o,valid:!1,reason:"headroom"}:{points:r,hit:null,valid:!1,reason:"no-hit"}}var Zh=()=>({charging:!1,tier:m_,yawSteps:0,arc:null,cooldownUntil:-1,backHeld:0,last:null});function qf(i,e,t,n,s,r){if(i.charging){if(e.tierStep&&(i.tier=Math.max(0,Math.min(Yh.length-1,i.tier+e.tierStep))),e.yawStep&&(i.yawSteps+=e.yawStep),e.tpBack)return i.charging=!1,i.arc=null,i.yawSteps=0,i.cooldownUntil=t+Kh,{kind:"none"};if(e.tpCharge)return i.arc=e.aim?Xf(s,e.aim,Yh[i.tier]*r.v0Scale,r):null,{kind:"none"};i.charging=!1;let o=i.arc,a=i.yawSteps*v_;return i.arc=null,i.yawSteps=0,i.cooldownUntil=t+Kh,o?.valid&&o.hit?{kind:"jump",to:o.hit.p,headingDelta:a}:{kind:"none"}}if(e.tpCharge)return i.charging=!0,i.yawSteps=0,i.arc=e.aim?Xf(s,e.aim,Yh[i.tier]*r.v0Scale,r):null,{kind:"none"};if(e.tpBack&&t>=i.cooldownUntil){if(i.backHeld+=n,i.backHeld>=y_&&i.last)return i.backHeld=-1/0,i.cooldownUntil=t+Kh,{kind:"back",to:i.last.pos,heading:i.last.heading}}else i.backHeld=0;return{kind:"none"}}var cs={walkSpeed:3,dashSpeed:6,flySpeed:5,flyDashSpeed:12,jumpVel:5.5,gravity:25,gravityHeld:15,terminalVel:50,height:1.7,radius:.3,stepHeight:.3,stickDown:.3,followTau:.06,crouchMinHead:.75,crouchDrop:.7,substepLen:.3,substepCap:8,maxRoomscaleStep:.5,snapTurnDeg:45,maxSlopeDeg:50,stickDeadzone:.15,passivePushCap:.05},Ll=1/60,Yf=8;function __(i=cs){return{pos:{x:0,y:0,z:0},heading:0,trackingOrigin:{x:0,y:0},headZ:i.height,crouchDrop:0,velZ:0,grounded:!0,noclip:!1,scale:1,t:0,freezeReasons:new Set,discontinuity:!1,teleport:Zh()}}var Zf=i=>i.freezeReasons.size>0,Jf=i=>({x:-Math.sin(i),y:Math.cos(i)}),jf=i=>({x:Math.cos(i),y:Math.sin(i)});function di(i,e,t){let n=Jf(i),s=jf(i);return{x:s.x*e+n.x*t,y:s.y*e+n.y*t}}function b_(i,e,t){let n=Jf(i),s=jf(i);return{x:s.x*e+s.y*t,y:n.x*e+n.y*t}}function Qf(i,e){let t=e.radius,n=i-t,s=Math.min(e.stepHeight+t,n),r=(s+n)*.5;return{r:t,topZ:n,bottomZ:s,midZ:r,degenerate:n<=s+.01}}function M_(i,e,t,n,s){let r=Qf(e,n),o=0,a=l=>{if(s-o<=1e-9)return;let c=t.pushOut({x:i.x,y:i.y,z:i.z+l},r.r);if(!c)return;let h=Math.hypot(c.x,c.y,c.z);if(h===0)return;let d=1,u=s-o;h>u&&(d=u/h,h=u),i.x+=c.x*d,i.y+=c.y*d,i.z+=c.z*d,o+=h};return a(r.bottomZ),r.degenerate||(a(r.midZ),a(r.topZ)),o}function Jh(i,e,t,n,s=1/0){let r=s,o=0;for(let a=0;a<5;a++){let l=M_(i,e,t,n,r);if(o+=l,l<1e-6||Number.isFinite(r)&&(r-=l,r<=1e-6))break}return o}var S_=[[0,0],[1,0],[-1,0],[0,1],[0,-1]];function w_(i,e,t){let n=i.z+t.stepHeight,s=i.z-t.stickDown,r=t.radius*.7,o=Math.cos(t.maxSlopeDeg*Math.PI/180),a=null;for(let[l,c]of S_){let h=e.floorBelow(i.x+l*r,i.y+c*r,n,s,o);h!==null&&(a===null||h>a)&&(a=h)}return a}function E_(i,e,t,n,s,r=.02){if(t<=e)return t;let o=s.radius,a=c=>!!n.pushOut({x:i.x,y:i.y,z:i.z+c-o},o-r),l=e;for(let c=e+.05;c<t;c+=.05){if(a(c))return l;l=c}return a(t)?l:t}function T_(i,e,t){let n=Qf(t.height,t),s=.02;return!(e.pushOut({x:i.x,y:i.y,z:i.z+n.bottomZ},n.r-s)||!n.degenerate&&(e.pushOut({x:i.x,y:i.y,z:i.z+n.midZ},n.r-s)||e.pushOut({x:i.x,y:i.y,z:i.z+n.topZ},n.r-s)))}function $f(i,e,t,n,s){if(i.noclip){i.pos.x+=e,i.pos.y+=t;return}let r=Math.hypot(e,t),o=Math.min(s.substepCap,Math.max(1,Math.ceil(r/s.substepLen))),a=e/o,l=t/o;for(let c=0;c<o;c++)i.pos.x+=a,i.pos.y+=l,Jh(i.pos,i.headZ,n,s)}function A_(i,e,t,n,s){let r={x:t.head.local.x-i.trackingOrigin.x,y:t.head.local.y-i.trackingOrigin.y},o=di(i.heading,r.x,r.y);i.pos.x+=o.x,i.pos.y+=o.y,i.noclip||Jh(i.pos,i.headZ,n,s),i.trackingOrigin={x:t.head.local.x,y:t.head.local.y},i.heading+=e,i.discontinuity=!0}function P_(i,e,t,n,s=cs){i.t+=t;let r=Zf(i);{let a=1-Math.exp(-t/.1);i.crouchDrop+=((e.crouch?s.crouchDrop:0)-i.crouchDrop)*a;let l=Math.max(s.crouchMinHead,e.head.local.z-i.crouchDrop);i.noclip||l<=i.headZ?i.headZ=l:i.headZ=Math.max(s.crouchMinHead,E_(i.pos,i.headZ,l,n,s))}e.turn&&A_(i,e.turn*s.snapTurnDeg*Math.PI/180,e,n,s),e.noclipToggle&&(i.noclip=!i.noclip,i.velZ=0,i.noclip||(i.grounded=!1));let o=Math.hypot(e.walkX,e.walkY);if(o>=s.stickDeadzone){let a=Math.min(o,1)/o,l=R_(i.heading,e.head.fwdLocal),c=Math.hypot(l.x,l.y)||1,h=l.x/c,d=l.y/c,u=d,m=-h,p=(i.noclip?e.dash?s.flyDashSpeed:s.flySpeed:e.dash?s.dashSpeed:s.walkSpeed)*t*a;$f(i,(h*e.walkY+u*e.walkX)*p,(d*e.walkY+m*e.walkX)*p,n,s)}else{let a={x:e.head.local.x-i.trackingOrigin.x,y:e.head.local.y-i.trackingOrigin.y},l=di(i.heading,a.x,a.y),c=Math.hypot(l.x,l.y);if(c>s.maxRoomscaleStep)i.trackingOrigin={x:e.head.local.x,y:e.head.local.y};else if(c>1e-9){let h={x:i.pos.x,y:i.pos.y};$f(i,l.x,l.y,n,s);let d={x:i.pos.x-h.x,y:i.pos.y-h.y},u=b_(i.heading,d.x,d.y);i.trackingOrigin={x:i.trackingOrigin.x+u.x,y:i.trackingOrigin.y+u.y}}}if(i.noclip){let a=(e.dash?s.flyDashSpeed:s.flySpeed)*t;e.up&&(i.pos.z+=a),e.down&&(i.pos.z-=a),i.velZ=0,i.grounded=!0}else if(!r){e.jump&&i.grounded&&(i.velZ=s.jumpVel,i.grounded=!1);let a=i.pos.z,l=Jh(i.pos,i.headZ,n,s,s.passivePushCap);i.velZ>0&&i.pos.z<a-1e-4&&(i.velZ=0);let c=l>1e-6,h=i.velZ<=0?w_(i.pos,n,s):null;if(h!==null&&(!c||h>=i.pos.z-1e-6)){let d=1-Math.exp(-t/s.followTau);i.pos.z+=(h-i.pos.z)*d,i.velZ=0,i.grounded=!0}else if(c)i.velZ=0;else{i.grounded=!1;let d=e.jump&&i.velZ>0?s.gravityHeld:s.gravity;i.velZ-=d*t,i.velZ<-s.terminalVel&&(i.velZ=-s.terminalVel),i.pos.z+=i.velZ*t;let u=n.floorZ();i.pos.z<=u&&(i.pos.z=u,i.velZ=0,i.grounded=!0)}}if(r)i.teleport.charging&&(i.teleport.charging=!1,i.teleport.arc=null,i.teleport.yawSteps=0);else{let a=Math.cos(s.maxSlopeDeg*Math.PI/180),l=qf(i.teleport,e,i.t,t,n,{minNz:a,headroomOk:c=>T_(c,n,s),v0Scale:Math.sqrt(i.scale)});if(l.kind==="jump")i.teleport.last={pos:{...i.pos},heading:i.heading},Kf(i,l.to,i.heading+l.headingDelta,e);else if(l.kind==="back"){let c={pos:{...i.pos},heading:i.heading};Kf(i,l.to,l.heading,e),i.teleport.last=c}}}function R_(i,e){let t=di(i,e.x,e.y);return{x:t.x,y:t.y,z:e.z}}function Kf(i,e,t,n){i.pos={...e},i.heading=t,i.trackingOrigin={x:n.head.local.x,y:n.head.local.y},i.velZ=0,i.grounded=!0,i.discontinuity=!0}function Jr(i,e){let t=di(i.heading,i.trackingOrigin.x,i.trackingOrigin.y),n={x:i.pos.x-t.x,y:i.pos.y-t.y,z:i.pos.z-i.crouchDrop},s=di(i.heading,e.x,e.y);return{origin:n,heading:i.heading,headWorld:{x:n.x+s.x,y:n.y+s.y,z:n.z+e.z}}}var Dl=class{constructor(e,t=cs){U(this,"state");U(this,"acc",0);U(this,"prev");U(this,"cur");U(this,"lastHead",{x:0,y:0,z:1.7});U(this,"world");U(this,"cfg");this.world=e,this.cfg=t,this.state=__(t),this.prev=this.cur=Jr(this.state,this.lastHead)}freeze(e){this.state.freezeReasons.add(e)}thaw(e){this.state.freezeReasons.delete(e)}setFrozen(e,t){t?this.freeze(e):this.thaw(e)}isFrozen(){return Zf(this.state)}advance(e,t){this.lastHead=e.head.local,this.acc+=Math.min(t,.25);let n=0,s=!1,r=e;for(;this.acc>=Ll&&n<Yf;)this.prev=Jr(this.state,this.lastHead),P_(this.state,r,Ll,this.world,this.cfg),this.state.discontinuity&&(s=!0,this.state.discontinuity=!1),this.acc-=Ll,n++,r=Gf(r);n===Yf&&(this.acc=0),this.cur=Jr(this.state,this.lastHead),s&&(this.prev=this.cur)}pose(){let e=Math.max(0,Math.min(1,this.acc/Ll)),t={x:this.prev.origin.x+(this.cur.origin.x-this.prev.origin.x)*e,y:this.prev.origin.y+(this.cur.origin.y-this.prev.origin.y)*e,z:this.prev.origin.z+(this.cur.origin.z-this.prev.origin.z)*e},n=di(this.cur.heading,this.lastHead.x,this.lastHead.y);return{origin:t,heading:this.cur.heading,headWorld:{x:t.x+n.x,y:t.y+n.y,z:t.z+this.lastHead.z}}}reset(e,t,n){let s=this.state;s.pos={...e},s.heading=t,s.trackingOrigin={x:n.x,y:n.y},s.headZ=Math.max(this.cfg.crouchMinHead,n.z),s.velZ=0,s.grounded=!0,s.crouchDrop=0,s.teleport=Zh(),s.discontinuity=!1,this.lastHead=n,this.acc=0,this.prev=this.cur=Jr(s,n)}handleTrackingReset(e,t){let n=this.state;n.heading+=e,n.trackingOrigin={x:t.x,y:t.y},this.lastHead=t,this.prev=this.cur=Jr(n,t)}};var C_=new Set(["KeyW","KeyA","KeyS","KeyD","KeyQ","KeyE","Space","ControlLeft","ControlRight","ShiftLeft","ShiftRight","ArrowLeft","ArrowRight","ArrowUp","ArrowDown","KeyT","KeyG"]),Fl=class{constructor(){U(this,"down",new Set);U(this,"edges",[]);U(this,"_enabled",!1);U(this,"dblJump",new qs);U(this,"onKeyDown",e=>{if(!this._enabled)return;let t=e.target;t&&(t.tagName==="INPUT"||t.tagName==="TEXTAREA")||!C_.has(e.code)||e.metaKey||e.altKey||(!e.repeat&&!this.down.has(e.code)&&this.edges.push(e.code),this.down.add(e.code),e.preventDefault())});U(this,"onKeyUp",e=>{this.down.delete(e.code)});U(this,"onBlur",()=>{this.down.clear(),this.edges=[]})}attach(){window.addEventListener("keydown",this.onKeyDown),window.addEventListener("keyup",this.onKeyUp),window.addEventListener("blur",this.onBlur)}detach(){window.removeEventListener("keydown",this.onKeyDown),window.removeEventListener("keyup",this.onKeyUp),window.removeEventListener("blur",this.onBlur),this.onBlur()}setEnabled(e){this._enabled=e,e||this.onBlur()}isDown(e){return this.down.has(e)}read(e,t,n=performance.now()/1e3){let s=this.down,r=Ys();r.head=e,r.aim=t,r.walkX=(s.has("KeyD")?1:0)-(s.has("KeyA")?1:0),r.walkY=(s.has("KeyW")?1:0)-(s.has("KeyS")?1:0),r.dash=s.has("ShiftLeft")||s.has("ShiftRight"),r.jump=s.has("Space"),r.noclipToggle=this.dblJump.update(r.jump,n),r.crouch=s.has("ControlLeft")||s.has("ControlRight"),r.up=s.has("KeyE"),r.down=s.has("KeyQ"),r.tpCharge=s.has("KeyT"),r.tpBack=s.has("KeyG");let o=r.tpCharge;for(let a of this.edges)a==="ArrowLeft"?o?r.yawStep=1:r.turn=1:a==="ArrowRight"?o?r.yawStep=-1:r.turn=-1:a==="ArrowUp"&&o?r.tierStep=1:a==="ArrowDown"&&o&&(r.tierStep=-1);return this.edges=[],r}};var ep=.004,Ul=1.5,Nl=5,I_=.05,Ol=class{constructor(e,t){U(this,"world",new Cl);U(this,"sim",new Dl(this.world,cs));U(this,"flat",new Fl);U(this,"mode","orbit");U(this,"lookPitch",0);U(this,"saved",null);U(this,"cursor",{x:0,y:0});U(this,"externalInput",null);U(this,"editor");U(this,"canvas");U(this,"lastStance",null);this.editor=e,this.canvas=t,this.flat.attach(),t.addEventListener("pointermove",n=>{let s=t.getBoundingClientRect();this.cursor={x:n.clientX-s.left,y:n.clientY-s.top}})}getMode(){return this.mode}isWalking(){return this.mode==="walk"}isXR(){return this.mode==="xr"}enterXR(e){let t=this.editor.cam;this.mode==="orbit"&&(this.saved={target:{...t.target},yaw:t.yaw,pitch:t.pitch,halfH:t.halfH,projection:t.projection,nearMin:t.nearMin}),this.flat.setEnabled(!1),this.syncWorld(!0);let n=this.lastStance;if(!n){let s=t.forward(),r=t.target,o=this.world.floorBelow(r.x,r.y,r.z+50,this.world.floorZ()-1,.5);n={pos:{x:r.x,y:r.y,z:o??Math.max(r.z,this.world.floorZ())},heading:Math.atan2(-s.x,s.y)}}return this.mode="xr",this.externalInput=e,n}exitXR(){if(this.mode!=="xr")return;this.lastStance={pos:{...this.sim.state.pos},heading:this.sim.state.heading},this.externalInput=null,this.mode="orbit";let e=this.editor.cam;this.saved&&(e.target=this.saved.target,e.yaw=this.saved.yaw,e.pitch=this.saved.pitch,e.halfH=this.saved.halfH,e.projection=this.saved.projection,e.nearMin=this.saved.nearMin),this.editor.draw()}get noclip(){return this.sim.state.noclip}setNoclip(e){this.sim.state.noclip=e}enterWalk(){if(this.mode==="walk")return;let e=this.editor.cam;this.saved={target:{...e.target},yaw:e.yaw,pitch:e.pitch,halfH:e.halfH,projection:e.projection,nearMin:e.nearMin},this.syncWorld(!0);let t=e.forward(),n=Math.atan2(-t.x,t.y),s=e.target,o=this.world.floorBelow(s.x,s.y,s.z+50,this.world.floorZ()-1,.5)??Math.max(s.z,this.world.floorZ());this.sim.reset({x:s.x,y:s.y,z:o},n,{x:0,y:0,z:cs.height}),this.lookPitch=Math.max(-Ul,Math.min(Ul,Math.asin(Math.max(-1,Math.min(1,t.z))))),this.mode="walk",this.flat.setEnabled(!0),e.projection="persp",e.nearMin=I_,this.syncCamera()}exitWalk(){if(this.mode!=="walk")return;this.mode="orbit",this.flat.setEnabled(!1);let e=this.editor.cam;this.saved&&(e.target=this.saved.target,e.yaw=this.saved.yaw,e.pitch=this.saved.pitch,e.halfH=this.saved.halfH,e.projection=this.saved.projection,e.nearMin=this.saved.nearMin),this.editor.draw()}toggleWalk(){this.mode==="walk"?this.exitWalk():this.enterWalk()}look(e,t){return this.mode!=="walk"?!1:(this.sim.state.heading-=e*ep,this.lookPitch=Math.max(-Ul,Math.min(Ul,this.lookPitch-t*ep)),this.syncCamera(),!0)}syncWorld(e=!1){(e||this.world.revision!==this.editor.revision)&&this.world.rebuild(this.editor.kernel,this.editor.revision)}tick(e){if(this.mode==="orbit")return;this.syncWorld(),this.sim.setFrozen("gesture",this.editor.isGestureActive());let t=this.mode==="xr"&&this.externalInput?this.externalInput(e):this.readFlat();this.sim.advance(t,e),this.mode==="walk"&&this.syncCamera()}readFlat(){let e=this.lookPitch,t={local:{x:0,y:0,z:cs.height},fwdLocal:{x:0,y:Math.cos(e),z:Math.sin(e)}},n=this.editor.vp(),s=n.w>0&&n.h>0?this.editor.cam.ray(this.cursor.x,this.cursor.y,n):null;return this.flat.read(t,s)}pose(){return this.sim.pose()}syncCamera(){let e=this.editor.cam,t=this.sim.pose(),n=t.heading,s=this.lookPitch,r={x:-Math.sin(n)*Math.cos(s),y:Math.cos(n)*Math.cos(s),z:Math.sin(s)},o=t.headWorld;e.target={x:o.x+r.x*Nl,y:o.y+r.y*Nl,z:o.z+r.z*Nl},e.yaw=n-Math.PI/2,e.pitch=-s,e.halfH=Nl*Math.tan(e.fovY/2)}teleportArc(){let e=this.sim.state.teleport.arc;return e?{points:e.points,valid:e.valid,landing:e.valid&&e.hit?e.hit.p:null}:null}dispose(){this.flat.detach()}};var jr={w:800,h:800},L_=80*Math.PI/180,D_={x:0,y:0,z:1},Bl=class{constructor(){U(this,"origin",{x:0,y:0,z:0});U(this,"dir",{x:0,y:1,z:0});U(this,"rightV",{x:1,y:0,z:0});U(this,"upV",{x:0,y:0,z:1});U(this,"downDir",null);U(this,"fovY",L_)}set(e,t){this.origin=e.origin,this.dir=xn(e.dir);let n=Rt(this.dir,D_);Math.hypot(n.x,n.y,n.z)<.001&&(n=Rt(this.dir,t??{x:0,y:1,z:0})),this.rightV=xn(n),this.upV=Rt(this.rightV,this.dir)}current(){return{origin:this.origin,dir:this.dir}}cursor(){return{x:jr.w/2,y:jr.h/2}}markDown(){this.downDir=this.dir}travelPx(){if(!this.downDir)return 0;let e=Math.max(-1,Math.min(1,te(this.downDir,this.dir)));return Math.acos(e)/this.fovY*jr.h}ray(e,t,n){let s=Math.tan(this.fovY/2),r=(e/n.w*2-1)*s*(n.w/n.h),o=(1-t/n.h*2)*s,a=xn(Ne(Ne(this.dir,Fe(this.rightV,r)),Fe(this.upV,o)));return{origin:this.origin,dir:a}}angularPx(e,t){let n=Pe(e,this.origin),s=Math.max(te(n,this.dir),.01),r=Math.tan(this.fovY/2),o=te(n,this.rightV)/(s*r*(t.w/t.h)),a=te(n,this.upV)/(s*r);return{x:(o*.5+.5)*t.w,y:(.5-a*.5)*t.h}}viewDir(e){return xn(Pe(this.origin,e))}forward(){return this.dir}};var jh=i=>({x:i.x,y:-i.z,z:i.y});function F_(i,e){let{x:t,y:n,z:s,w:r}=i,o=2*(n*e.z-s*e.y),a=2*(s*e.x-t*e.z),l=2*(t*e.y-n*e.x);return{x:e.x+r*o+(n*l-s*a),y:e.y+r*a+(s*o-t*l),z:e.z+r*l+(t*a-n*o)}}var ip=i=>jh(F_(i,{x:0,y:0,z:-1}));function U_(i,e){let t=di(i.heading,e.x,e.y);return{x:i.origin.x+t.x,y:i.origin.y+t.y,z:i.origin.z+e.z}}function N_(i,e){let t=di(i.heading,e.x,e.y);return{x:t.x,y:t.y,z:e.z}}function tp(i,e){return{origin:U_(e,jh(i.position)),dir:N_(e,ip(i.orientation))}}function O_(i){return{local:jh(i.position),fwdLocal:ip(i.orientation)}}var np=()=>({present:!1,ray:null,gripRay:null,trigger:!1,triggerValue:0,squeeze:!1,stickPress:!1,a:!1,b:!1,axes:{x:0,y:0}}),zl=class{constructor(){U(this,"dpadL",new Kr);U(this,"dpadR",new Kr);U(this,"turnL",new ui);U(this,"turnR",new ui);U(this,"tierUp",new ui);U(this,"tierDown",new ui);U(this,"yawL",new ui);U(this,"yawR",new ui);U(this,"xEdge",new Zr);U(this,"yEdge",new Zr);U(this,"dblA",new qs);U(this,"lastHead",{local:{x:0,y:0,z:1.6},fwdLocal:{x:0,y:1,z:0}})}read(e,t,n,s,r,o=performance.now()/1e3){let a=np(),l=np(),c=null,h=t.getViewerPose(n);h&&(c={position:h.transform.position,orientation:h.transform.orientation},this.lastHead=O_(c));for(let g of e.inputSources){if(g.handedness!=="left"&&g.handedness!=="right")continue;let f=g.handedness==="left"?a:l;f.present=!0;let b=t.getPose(g.targetRaySpace,n);if(b&&(f.ray=tp({position:b.transform.position,orientation:b.transform.orientation},s)),g.gripSpace){let v=t.getPose(g.gripSpace,n);v&&(f.gripRay=tp({position:v.transform.position,orientation:v.transform.orientation},s))}let M=g.gamepad;if(M){let v=M.axes,A=Math.abs(v[2]??0)+Math.abs(v[3]??0),w=Math.abs(v[0]??0)+Math.abs(v[1]??0);f.axes=A>=w?{x:v[2]??0,y:-(v[3]??0)}:{x:v[0]??0,y:-(v[1]??0)},f.trigger=!!M.buttons[0]?.pressed,f.triggerValue=M.buttons[0]?.value??0,f.squeeze=!!M.buttons[1]?.pressed,f.stickPress=!!M.buttons[3]?.pressed,f.a=!!M.buttons[4]?.pressed,f.b=!!M.buttons[5]?.pressed}}let d=Ys();d.head=this.lastHead,d.aim=l.ray;let u=this.dpadR.update(l.axes.x,l.axes.y);this.turnL.update(u,"left")&&(d.turn=1),this.turnR.update(u,"right")&&(d.turn=-1),d.tpCharge=u==="up",d.tpBack=u==="down";let m=this.dpadL.update(a.axes.x,a.axes.y);d.tpCharge?(this.tierUp.update(m,"up")&&(d.tierStep=1),this.tierDown.update(m,"down")&&(d.tierStep=-1),this.yawL.update(m,"left")&&(d.yawStep=1),this.yawR.update(m,"right")&&(d.yawStep=-1)):(d.walkX=a.axes.x,d.walkY=a.axes.y,this.tierUp.update("none","up"),this.tierDown.update("none","down"),this.yawL.update("none","left"),this.yawR.update("none","right")),d.dash=a.stickPress,r?(d.up=l.a,d.down=l.b):(d.jump=l.a,d.crouch=l.b),d.noclipToggle=this.dblA.update(l.a,o);let p=this.xEdge.update(a.a),y=this.yEdge.update(a.b);return{input:d,left:a,right:l,undoEdge:p,redoEdge:y,head:c}}};function Dn(i,e,t=.7,n=60){if(i)for(let s of i.inputSources){if(e!=="both"&&s.handedness!==e)continue;let r=s.gamepad?.hapticActuators?.[0];r?.pulse&&r.pulse(t,n).catch(()=>{})}}var $s={w:512,h:520},Qh={w:.16,h:.1625},kl=new Map;function B_(i,e,t){let n=`${i}|${e}`;if(kl.has(n))return kl.get(n);let s=document.getElementById(i);if(!s||s.tagName.toLowerCase()!=="symbol")return kl.set(n,null),null;let r=["viewBox","fill","stroke","stroke-width","stroke-linecap","stroke-linejoin"].map(c=>{let h=s.getAttribute(c);return h?`${c}="${h.replace(/currentColor/g,e)}"`:""}).join(" "),o=s.innerHTML.replace(/currentColor/g,e),a=`<svg xmlns="http://www.w3.org/2000/svg" ${r} width="64" height="64">${o}</svg>`,l=new Image;return l.onload=t,l.src="data:image/svg+xml;charset=utf-8,"+encodeURIComponent(a),kl.set(n,l),l}var Hl=class{constructor(e){U(this,"canvas");U(this,"ctx");U(this,"cells",[]);U(this,"hover",null);U(this,"pressed",null);U(this,"dirty",!0);U(this,"model");this.model=e,this.canvas=document.createElement("canvas"),this.canvas.width=$s.w,this.canvas.height=$s.h,this.ctx=this.canvas.getContext("2d")}setHover(e){e!==this.hover&&(this.hover=e,this.dirty=!0)}setPressed(e){e!==this.pressed&&(this.pressed=e,this.dirty=!0)}hovered(){return this.hover}hit(e,t){let n=e*$s.w,s=t*$s.h;for(let r of this.cells)if(n>=r.x&&n<=r.x+r.w&&s>=r.y&&s<=r.y+r.h&&!r.item.disabled)return r.id;return null}redraw(e=!1){if(!this.dirty&&!e)return!1;this.dirty=!1;let t=this.ctx,n=$s.w,s=$s.h,r=()=>{this.dirty=!0};t.clearRect(0,0,n,s),t.fillStyle="rgba(255,255,255,0.92)",Vl(t,0,0,n,s,28),t.fill(),t.strokeStyle="rgba(0,0,0,0.12)",t.lineWidth=3,Vl(t,1.5,1.5,n-3,s-3,27),t.stroke(),this.cells=[];let o=18;t.fillStyle="#4a4a4a",t.font="22px system-ui, -apple-system, 'PingFang SC', 'Noto Sans CJK SC', sans-serif",t.textBaseline="top";let a=z_(t,this.model.status(),n-40,2);for(let f of a)t.fillText(f,20,o),o+=28;o=Math.max(o,18+2*28)+10;let l=this.model.tools().filter(f=>!f.hidden),c=(n-40-2*10)/3,h=96;l.forEach((f,b)=>{let M=20+b%3*(c+10),v=o+Math.floor(b/3)*(h+10);this.cell(f,M,v,c,h,r,!0)}),o+=Math.ceil(l.length/3)*(h+10)+8;let d=this.model.edits().filter(f=>!f.hidden),u=(n-40-(d.length-1)*10)/Math.max(1,d.length),m=72;d.forEach((f,b)=>this.cell(f,20+b*(u+10),o,u,m,r,!1)),o+=m+18;let p=this.model.vr().filter(f=>!f.hidden),y=(n-40-(p.length-1)*10)/Math.max(1,p.length),g=72;return p.forEach((f,b)=>this.cell(f,20+b*(y+10),o,y,g,r,!1)),o+=g+12,t.fillStyle="#8a8780",t.font="18px system-ui, sans-serif",t.textAlign="right",t.fillText(this.model.version,n-20,s-30),t.textAlign="left",!0}cell(e,t,n,s,r,o,a){let l=this.ctx;this.cells.push({id:e.id,x:t,y:n,w:s,h:r,item:e});let c=this.hover===e.id,h=this.pressed===e.id;l.fillStyle=e.disabled?"rgba(0,0,0,0.03)":e.active?"#2b6cb0":h?"#cfe0f5":c?"rgba(43,108,176,0.16)":"rgba(0,0,0,0.05)",Vl(l,t,n,s,r,14),l.fill(),c&&!e.disabled&&(l.strokeStyle="#2b6cb0",l.lineWidth=3,Vl(l,t+1.5,n+1.5,s-3,r-3,13),l.stroke());let d=e.disabled?"#b0aca4":e.active?"#ffffff":e.danger?"#c0392b":"#2a2a2a",u=a?40:30,m=n+r/2;if(e.icon){let p=B_(e.icon,d,o),y=t+s/2-u/2,g=a?n+12:n+r/2-u/2-(a?0:12);p&&p.complete&&p.naturalWidth>0&&l.drawImage(p,y,g,u,u),m=a?n+12+u+20:n+r/2+22}l.fillStyle=d,l.font=`${a?22:20}px system-ui, -apple-system, 'PingFang SC', 'Noto Sans CJK SC', sans-serif`,l.textAlign="center",l.textBaseline="middle",l.fillText(e.label,t+s/2,m),l.textAlign="left",l.textBaseline="top"}};function Vl(i,e,t,n,s,r){i.beginPath(),i.moveTo(e+r,t),i.lineTo(e+n-r,t),i.quadraticCurveTo(e+n,t,e+n,t+r),i.lineTo(e+n,t+s-r),i.quadraticCurveTo(e+n,t+s,e+n-r,t+s),i.lineTo(e+r,t+s),i.quadraticCurveTo(e,t+s,e,t+s-r),i.lineTo(e,t+r),i.quadraticCurveTo(e,t,e+r,t),i.closePath()}function z_(i,e,t,n){let s=[],r="";for(let o of e)if(i.measureText(r+o).width>t){if(s.push(r),r=o,s.length===n)return s[n-1]=s[n-1].slice(0,-1)+"\u2026",s}else r+=o;return r&&s.push(r),s}var k_=.3,V_=.6,Gl=class{constructor(e){U(this,"supported",!1);U(this,"presenting",!1);U(this,"xrInput",new zl);U(this,"frameIn",Ys());U(this,"firstFrame",!1);U(this,"spawn",null);U(this,"pendingResetYaw",null);U(this,"resetAttached",!1);U(this,"pointer",new Bl);U(this,"trigWas",!1);U(this,"toolDown",!1);U(this,"panelPressId",null);U(this,"holdT",0);U(this,"holdStage",0);U(this,"panel");U(this,"lastHint","");U(this,"opts");this.opts=e,this.panel=new Hl(e.hud);let t=e.editor.renderer3.xr;t.on("sessionstart",()=>this.onStart()),t.on("sessionend",()=>this.onEnd()),navigator.xr?.isSessionSupported("immersive-vr").then(n=>{this.supported=n,e.onChange()}).catch(()=>{})}isSupported(){return this.supported}isPresenting(){return this.presenting}enter(){!navigator.xr||this.presenting||navigator.xr.requestSession("immersive-vr",{optionalFeatures:["local-floor"]}).then(e=>this.opts.editor.renderer3.xr.setSession(e)).catch(e=>this.opts.log?.(`VR session failed: ${e.message}`))}exit(){this.opts.editor.renderer3.xr.session()?.end().catch(()=>{})}onStart(){let{editor:e,locomotion:t}=this.opts;this.presenting=!0,this.firstFrame=!0,this.resetAttached=!1,this.pendingResetYaw=null,this.trigWas=!1,this.toolDown=!1,this.panelPressId=null,this.holdStage=0,this.holdT=0,this.spawn=t.enterXR(()=>this.frameIn),e.setPointerFrame(this.pointer,jr),e.renderer3.attachWristPanel(this.panel.canvas,Qh.w,Qh.h,this.opts.leftHanded()?"right":"left"),this.panel.dirty=!0,this.opts.onChange()}onEnd(){let{editor:e,locomotion:t}=this.opts;this.presenting=!1,this.toolDown&&(e.cancel(),this.toolDown=!1),e.setPointerFrame(null),e.renderer3.detachWristPanel(),e.renderer3.setPointerVisual("left",null),e.renderer3.setPointerVisual("right",null),t.exitXR(),this.opts.onChange()}invalidatePanel(){this.panel.dirty=!0}tick(e){if(!this.presenting)return;let{editor:t,locomotion:n}=this.opts,s=t.renderer3,r=s.xr.session(),o=s.xr.frame(),a=s.xr.refSpace();if(!r||!o||!a)return;this.attachReset(a);let l=this.xrInput.read(r,o,a,n.pose(),n.noclip);this.firstFrame&&l.head&&this.spawn&&(n.sim.reset(this.spawn.pos,this.spawn.heading,l.input.head.local),this.firstFrame=!1,l=this.xrInput.read(r,o,a,n.pose(),n.noclip)),this.pendingResetYaw!==null&&l.head&&(n.sim.handleTrackingReset(this.pendingResetYaw,l.input.head.local),this.pendingResetYaw=null);let c=this.opts.leftHanded(),h=c?l.left:l.right,d=c?l.right:l.left,u=c?"left":"right";this.frameIn=l.input,n.tick(e),s.setRig(n.pose()),l.undoEdge&&(t.undo(),Dn(r,d===l.left?"left":"right",.4,40)),l.redoEdge&&(t.redo(),Dn(r,d===l.left?"left":"right",.4,40));let m=h.trigger,p=m&&!this.trigWas,y=!m&&this.trigWas;this.trigWas=m;let g=n.sim.state.teleport.charging;t.batchDraw(()=>{if(g){this.toolDown&&(t.cancel(),this.toolDown=!1,this.holdStage=0),this.panelPressId&&(this.panelPressId=null,this.panel.setPressed(null)),this.panel.hovered()&&this.panel.setHover(null),t.pointerLeave(),s.setPointerVisual(u,null);return}if(!h.ray){s.setPointerVisual(u,null);return}let b=s.wristHit(h.ray),M=b?this.panel.hit(b.u,b.v):null;if(b&&!this.toolDown)M!==this.panel.hovered()&&(this.panel.setHover(M),M&&Dn(r,u,.25,20)),p&&M&&(this.panelPressId=M,this.panel.setPressed(M),Dn(r,u,.6,40)),y&&this.panelPressId&&(M===this.panelPressId&&this.opts.hud.pick(M),this.panelPressId=null,this.panel.setPressed(null)),s.setPointerVisual(u,{length:b.dist,color:9133302}),this.toolDown||t.pointerLeave();else{this.panel.hovered()&&this.panel.setHover(null),this.panelPressId&&y&&(this.panelPressId=null,this.panel.setPressed(null)),this.pointer.set(h.ray);let v=this.pointer.cursor(),A=()=>({x:v.x,y:v.y,clientX:0,clientY:0,pointerType:"xr",shiftKey:!1,travelPx:this.pointer.travelPx()});t.tool==="select"?this.selectTick(p,m,y,e,r,u):this.panelPressId||(p?(this.pointer.markDown(),this.toolDown=!0,t.pointerDown(A()),Dn(r,u,.5,30)):y&&this.toolDown?(this.toolDown=!1,t.pointerUp(A()),Dn(r,u,.35,25)):t.pointerMove(A()));let w=n.world.segmentHit(h.ray.origin,{x:h.ray.origin.x+h.ray.dir.x*30,y:h.ray.origin.y+h.ray.dir.y*30,z:h.ray.origin.z+h.ray.dir.z*30});s.setPointerVisual(u,{length:w?w.t*30:3,color:this.toolDown?13382451:2845872})}});let f=this.opts.hud.status();f!==this.lastHint&&(this.lastHint=f,this.panel.dirty=!0),this.panel.redraw()&&s.updateWristTexture()}selectTick(e,t,n,s,r,o){let a=this.opts.editor,l=this.pointer.cursor();if(e&&(this.holdT=0,this.holdStage=0,this.pointer.markDown(),this.toolDown=!0),t&&this.toolDown){this.holdT+=s;let c=a.pickAt(l.x,l.y);this.holdStage===0&&this.holdT>=k_?(this.holdStage=1,a.selectExpand(c,1),Dn(r,o,.7,50)):this.holdStage===1&&this.holdT>=V_&&(this.holdStage=2,a.selectExpand(c,2),Dn(r,o,.9,50),setTimeout(()=>Dn(r,o,.9,50),90));return}if(n&&this.toolDown){this.toolDown=!1,this.holdStage===0&&(a.selectExpand(a.pickAt(l.x,l.y),0),Dn(r,o,.35,25)),this.holdStage=0;return}a.pointerMove({x:l.x,y:l.y,clientX:0,clientY:0,pointerType:"xr",shiftKey:!1})}attachReset(e){this.resetAttached||(this.resetAttached=!0,e.addEventListener("reset",t=>{let n=t.transform?.orientation;if(!n){this.pendingResetYaw=0;return}let s=2*(n.w*n.y+n.z*n.x),r=1-2*(n.y*n.y+n.x*n.x);this.pendingResetYaw=Math.atan2(s,r)}))}};var sp=new Set(["localhost","127.0.0.1","::1",""]);function rp(i){let e=location.pathname.includes("/dev/")||sp.has(location.hostname),t=null;async function n(){try{await i.onBeforeReload?.()}catch{}let o=t??await navigator.serviceWorker?.getRegistration()??null;if(!o||!o.waiting){location.reload();return}let a=!1,l=()=>{a||(a=!0,location.reload())};navigator.serviceWorker.addEventListener("controllerchange",l,{once:!0}),o.waiting.postMessage({type:"skip-waiting"}),setTimeout(l,5e3)}async function s(){await((l,c)=>Promise.race([Promise.resolve(l).catch(()=>{}),new Promise(h=>setTimeout(h,c))]))(i.onBeforeReload?.(),4e3);try{if(navigator.serviceWorker)for(let l of await navigator.serviceWorker.getRegistrations())await l.unregister().catch(()=>{});if(typeof caches<"u")for(let l of await caches.keys())await caches.delete(l).catch(()=>{})}catch{}let a=`${location.pathname}?reset=${Date.now()}`;setTimeout(()=>location.replace(a),150),setTimeout(()=>{location.href=a},2500)}let r=()=>{t?.update().catch(()=>{}),i.onForeground?.()};return document.addEventListener("visibilitychange",()=>{document.visibilityState==="visible"&&r()}),window.addEventListener("focus",r),"serviceWorker"in navigator&&!sp.has(location.hostname)&&(navigator.serviceWorker.addEventListener("message",o=>{o.data?.type==="asset-updated"&&i.onUpdateAvailable()}),navigator.serviceWorker.register("./service-worker.js").then(o=>{t=o,o.waiting&&navigator.serviceWorker.controller&&i.onUpdateAvailable(),o.addEventListener("updatefound",()=>{let a=o.installing;a&&a.addEventListener("statechange",()=>{a.state==="installed"&&navigator.serviceWorker.controller&&i.onUpdateAvailable()})}),setInterval(()=>{o.update().catch(()=>{})},10*60*1e3)}).catch(o=>{console.warn("[pwa] SW register failed",o)})),{isDevRoute:e,reload:n,forceReset:s}}function Qr(i,e={}){let{size:t,cls:n}=e;return`<svg ${['viewBox="0 0 24 24"',n?`class="${n}"`:'class="ico"',t?`width="${t}" height="${t}"`:"",'aria-hidden="true"'].filter(Boolean).join(" ")}><use href="#${i}"/></svg>`}var hs=null,eu=null;function op(){hs?.close()}function tu(i){return hs&&eu===i.anchor?(hs.close(),null):H_(i)}function H_(i){hs?.close();let e=document.createElement("div");e.className="popup-menu",e.setAttribute("role","menu"),document.body.appendChild(e);let t=!0,n=()=>{e.textContent="";for(let c of i.items()){if(c.separatorBefore){let d=document.createElement("div");d.className="menu-sep",e.appendChild(d)}let h=document.createElement("button");h.type="button",h.className="menu-item",h.disabled=!!c.disabled,h.innerHTML=`${c.icon?Qr(c.icon):'<span class="ico-gap"></span>'}<span class="menu-label"></span>${c.hint?'<span class="menu-hint"></span>':""}${c.checked?Qr("check",{cls:"ico menu-check"}):""}`,h.querySelector(".menu-label").textContent=c.label,c.hint&&(h.querySelector(".menu-hint").textContent=c.hint),h.addEventListener("click",()=>{i.onPick(c.id)==="keep"?n():a()}),e.appendChild(h)}s()},s=()=>{let c=i.anchor.getBoundingClientRect(),h=window.innerWidth,d=window.innerHeight;e.style.left="0px",e.style.top="0px";let u=e.offsetWidth,m=e.offsetHeight,p=i.align==="end"?c.right-u:c.left,y=c.bottom+4;p+u>h-6&&(p=h-6-u),p<6&&(p=6),y+m>d-6&&(y=Math.max(6,c.top-4-m)),e.style.left=`${p}px`,e.style.top=`${y}px`},r=c=>{let h=c.composedPath();h.includes(e)||h.includes(i.anchor)||a()},o=c=>{c.key==="Escape"&&(c.stopPropagation(),a())},a=()=>{t&&(t=!1,e.remove(),document.removeEventListener("pointerdown",r,!0),window.removeEventListener("keydown",o,!0),window.removeEventListener("resize",s),hs===l&&(hs=null,eu=null),i.anchor.classList.remove("is-open"))},l={el:e,close:a,refresh:n,isOpen:()=>t};return n(),i.anchor.classList.add("is-open"),setTimeout(()=>{t&&document.addEventListener("pointerdown",r,!0)},0),window.addEventListener("keydown",o,!0),window.addEventListener("resize",s),hs=l,eu=i.anchor,l}var eo=new Map,G_=0;function W_(){let i=document.getElementById("noticeStack");return i||(i=document.createElement("div"),i.id="noticeStack",document.body.appendChild(i)),i}function ki(i){let e=i.id??`n${++G_}`,t=i.level??"neutral",n=eo.get(e);n?.timer&&clearTimeout(n.timer);let s=n?.el??document.createElement("div");s.className=`toast toast-${t}`,s.setAttribute("role",t==="error"?"alert":"status"),s.textContent="";let r=document.createElement("span");r.className="toast-text",r.textContent=i.text,s.appendChild(r);let o=()=>{let h=eo.get(e);h&&(h.timer&&clearTimeout(h.timer),h.el.remove(),eo.delete(e))};if(i.actions?.length){let h=document.createElement("span");h.className="toast-actions";for(let d of i.actions){let u=document.createElement("button");u.type="button",u.className=d.primary?"toast-btn primary":"toast-btn",u.textContent=d.label,u.addEventListener("click",()=>{d.onClick(),o()}),h.appendChild(u)}s.appendChild(h)}let a=document.createElement("button");a.type="button",a.className="toast-x",a.setAttribute("aria-label","\u5173\u95ED"),a.textContent="\xD7",a.addEventListener("click",o),s.appendChild(a),n||W_().appendChild(s);let c=i.timeoutMs===null||i.timeoutMs===void 0&&(!!i.actions?.length||t==="error"||t==="warning")?null:window.setTimeout(o,i.timeoutMs??3500);return eo.set(e,{el:s,timer:c}),{id:e,close:o,isOpen:()=>eo.has(e)}}var vt=i=>{let e=document.getElementById(i);if(!e)throw new Error(`missing #${i}`);return e},Ks={get(i){try{return localStorage.getItem(`catsup.ui.${i}`)}catch{return null}},set(i,e){try{localStorage.setItem(`catsup.ui.${i}`,e)}catch{}}},no=Ks.get("fingerDraws")==="1",io=Ks.get("leftHanded")==="1",ql=Ks.get("lab")==="1"||new URLSearchParams(location.search).has("lab"),Yl=vt("board"),X_=vt("stage"),ro=vt("hint"),to=vt("tip"),nu=vt("marquee"),q_=vt("toolbar"),so=vt("labLog"),cp=vt("lab"),Y_=vt("build"),$_="\u753B\u7EBF L \xB7 \u77E9\u5F62 R \xB7 \u79FB\u52A8 M \xB7 \u63A8\u62C9 P \xB7 \u6A61\u76AE E \xB7 \u9009\u62E9 \u7A7A\u683C \uFF5C \u53F3\u952E/\u5355\u6307\u62D6=\u73AF\u7ED5 \xB7 \u53CC\u6307=\u5E73\u79FB\u7F29\u653E \xB7 \u6EDA\u8F6E=\u7F29\u653E \uFF5C Esc \u53D6\u6D88",K_="\u6B65\u884C\uFF1AWASD \u8D70 \xB7 Shift \u51B2\u523A \xB7 \u7A7A\u683C \u8DF3\uFF08\u53CC\u51FB=\u98DE\u884C\u5F00\u5173\uFF09\xB7 Ctrl \u8E72 \xB7 Q/E \u4E0B/\u4E0A \xB7 \u2190\u2192 \u8F6C\u8EAB \xB7 \u53F3\u952E\u62D6=\u770B \xB7 T \u6309\u4F4F\u7784\u51C6\u77AC\u79FB\uFF08\u2191\u2193 \u529B\u5EA6 \u2190\u2192 \u843D\u5730\u671D\u5411\uFF09\xB7 G \u56DE\u4E0A\u4E00\u70B9 \uFF5C \u5DE5\u5177 L R M P \xB7 \u9009\u62E9 Tab \xB7 \u6A61\u76AE X",Z_="VR\uFF1A\u5DE6\u6447\u6746\u8D70\uFF08\u6309\u4E0B\u51B2\u523A\uFF09\xB7 \u53F3\u6447\u6746 \u2190\u2192 \u8F6C\u8EAB \xB7 \u524D\u63A8\u7784\u51C6\u77AC\u79FB\uFF08\u5DE6\u6447\u6746 \u2191\u2193 \u529B\u5EA6 \u2190\u2192 \u843D\u5730\u671D\u5411\uFF09\xB7 \u540E\u62C9\u56DE\u4E0A\u4E00\u70B9 \xB7 A \u8DF3\uFF08\u53CC\u51FB=\u98DE\u884C\u5F00\u5173\uFF09B \u8E72 \xB7 \u6273\u673A\u753B \xB7 \u624B\u8155\u9762\u677F\u9009\u5DE5\u5177 \xB7 X/Y \u64A4\u9500\u91CD\u505A",Kl=()=>mn?.isPresenting()?Z_:Ye?.isWalking()?K_:$_,Re=new Rl(Yl,{hint:i=>{ro.textContent=i??Kl()},tip:(i,e,t)=>{i?(to.textContent=i,to.hidden=!1,to.style.left=`${e+14}px`,to.style.top=`${t-28}px`):to.hidden=!0},events:i=>tb(i),separator:i=>nb(i),marquee:i=>{if(!i){nu.hidden=!0;return}let e=Yl.getBoundingClientRect();nu.hidden=!1,Object.assign(nu.style,{left:`${e.left+i.x}px`,top:`${e.top+i.y}px`,width:`${i.w}px`,height:`${i.h}px`})},changed:()=>ru()}),J_=[{tool:"select",icon:"select",label:"\u9009\u62E9",key:"\u7A7A\u683C"},{tool:"line",icon:"line",label:"\u753B\u7EBF",key:"L"},{tool:"rect",icon:"rectangle",label:"\u77E9\u5F62",key:"R"},{tool:"move",icon:"move",label:"\u79FB\u52A8",key:"M"},{tool:"pp",icon:"push-pull",label:"\u63A8\u62C9",key:"P"},{tool:"erase",icon:"eraser",label:"\u6A61\u76AE",key:"E"}],$l={version:Hi,tools:()=>J_.map(i=>({id:i.tool,label:i.label,icon:i.icon,key:i.key,active:Re.tool===i.tool})),edits:()=>[{id:"undo",label:"\u64A4\u9500",icon:"arrow-undo",disabled:!Re.canUndo()},{id:"redo",label:"\u91CD\u505A",icon:"arrow-redo",disabled:!Re.canRedo()},{id:"delete",label:"\u5220\u9664",icon:"trash-can",danger:!0,hidden:!Re.hasSelection()}],vr:()=>[{id:"noclip",label:Ye.noclip?"\u98DE\u884C\u4E2D":"\u7A7F\u5899\u98DE\u884C",active:Ye.noclip},{id:"respawn",label:"\u56DE\u51FA\u751F\u70B9"},{id:"exitvr",label:"\u9000\u51FA VR",danger:!0}],status:()=>ro.textContent??"",pick:i=>{if(Nf.includes(i)){Re.setTool(i);return}switch(i){case"undo":Re.undo();break;case"redo":Re.redo();break;case"delete":Re.deleteSelection();break;case"noclip":Ye.setNoclip(!Ye.noclip),mn.invalidatePanel();break;case"respawn":{let e=Ye.sim.state;Ye.sim.reset({x:0,y:0,z:Math.max(0,Ye.world.floorZ())},e.heading,Ye.sim.state.trackingOrigin?{x:0,y:0,z:1.6}:{x:0,y:0,z:1.6});break}case"exitvr":mn.exit();break}}},su=new Map;for(let i of $l.tools()){let e=document.createElement("button");e.type="button",e.className="tool",e.title=`${i.label}\uFF08${i.key}\uFF09`,e.innerHTML=`${Qr(i.icon)}<span class="tool-label"></span>`,e.querySelector(".tool-label").textContent=i.label,e.addEventListener("click",()=>$l.pick(i.id)),q_.appendChild(e),su.set(i.id,e)}{let i=vt("labEraseFace");i.addEventListener("click",()=>Re.setTool("eraseFace")),su.set("eraseFace",i)}var hp=vt("btnUndo"),up=vt("btnRedo"),dp=vt("btnDelete"),ap=vt("btnMenu"),lp=vt("btnView"),j_=vt("btnFit");hp.addEventListener("click",()=>Re.undo());up.addEventListener("click",()=>Re.redo());dp.addEventListener("click",()=>Re.deleteSelection());j_.addEventListener("click",()=>Re.zoomExtents());lp.addEventListener("click",()=>tu({anchor:lp,align:"end",items:()=>[{id:"iso",label:"\u7B49\u8F74",icon:"persp-iso",disabled:Ye.isWalking()},{id:"top",label:"\u9876\u89C6",hint:"\u4FEF\u89C6",disabled:Ye.isWalking()},{id:"front",label:"\u524D\u89C6",hint:"\u5411\u5317\u770B",disabled:Ye.isWalking()},{id:"right",label:"\u53F3\u89C6",hint:"\u5411\u897F\u770B",disabled:Ye.isWalking()},{id:"back",label:"\u540E\u89C6",hint:"\u5411\u5357\u770B",disabled:Ye.isWalking()},{id:"left",label:"\u5DE6\u89C6",hint:"\u5411\u4E1C\u770B",disabled:Ye.isWalking()},{id:"persp",label:"\u900F\u89C6",checked:Re.cam.projection==="persp",separatorBefore:!0,disabled:Ye.isWalking()},{id:"walk",label:"\u6B65\u884C\u76F8\u673A",hint:"WASD \xB7 \u7A7A\u683C\u8DF3 \xB7 \u53F3\u952E\u62D6\u770B",checked:Ye.isWalking(),separatorBefore:!0},{id:"noclip",label:"\u7A7F\u5899\u98DE\u884C",hint:"\u53CC\u51FB\u7A7A\u683C\u5207\u6362 \xB7 Q/E \u4E0B/\u4E0A",checked:Ye.noclip,disabled:!Ye.isWalking()}],onPick:i=>{if(i==="persp")return Re.toggleProjection(),"keep";if(i==="walk")return eb(!Ye.isWalking()),"keep";if(i==="noclip")return Ye.setNoclip(!Ye.noclip),"keep";Re.setView(i)}}));ap.addEventListener("click",()=>tu({anchor:ap,items:()=>[{id:"export",label:"\u5BFC\u51FA OBJ\u2026",icon:"export",hint:"Blender \u9003\u751F\u53E3"},{id:"import",label:"\u5BFC\u5165 OBJ\u2026",icon:"import"},...mn.isSupported()?[{id:"vr",label:mn.isPresenting()?"\u9000\u51FA VR":"\u8FDB\u5165 VR",icon:"hand",separatorBefore:!0,hint:"Quest \xB7 \u624B\u8155\u9762\u677F"},{id:"lefthand",label:"VR \u5DE6\u624B\u6301\u7B14",checked:io,hint:"\u9762\u677F\u6362\u5230\u53F3\u624B"}]:[],{id:"finger",label:"\u624B\u6307\u4E5F\u80FD\u753B",checked:no,separatorBefore:!0,hint:sb.penEverSeen()?"\u5DF2\u89C1\u8FC7\u7B14\uFF0C\u624B\u6307=\u76F8\u673A":void 0},{id:"lab",label:"\u5B9E\u9A8C\u53F0\uFF08\u819C\u4E8B\u4EF6\u65E5\u5FD7 / \u573A\u666F\u9884\u7F6E\uFF09",checked:ql},{id:"clear",label:"\u6E05\u7A7A\u6A21\u578B",icon:"trash-can",separatorBefore:!0},{id:"help",label:"\u5FEB\u6377\u952E\u4E0E\u624B\u52BF",icon:"keyboard"},{id:"update",label:`\u5F3A\u5236\u66F4\u65B0\uFF08\u6E05\u7F13\u5B58\u91CD\u542F\uFF09\xB7 ${Hi}`,icon:"refresh"}],onPick:i=>{switch(i){case"export":ib();break;case"import":Xl.click();break;case"finger":return no=!no,Ks.set("fingerDraws",no?"1":"0"),"keep";case"lab":return pp(!ql),"keep";case"clear":ki({id:"clear",text:"\u6E05\u7A7A\u6574\u4E2A\u6A21\u578B\uFF1F\uFF08\u53EF\u64A4\u9500\uFF09",level:"warning",actions:[{label:"\u6E05\u7A7A",primary:!0,onClick:()=>Re.clearAll()},{label:"\u53D6\u6D88",onClick:()=>{}}]});break;case"help":Zl(!0);break;case"update":ou.forceReset();break;case"vr":mn.isPresenting()?mn.exit():mn.enter();break;case"lefthand":return io=!io,Ks.set("leftHanded",io?"1":"0"),"keep"}}}));var Ye=new Ol(Re,Yl);Re.viewExtras=()=>({near:Ye.isWalking()?.05:void 0,teleport:Ye.teleportArc()});{let i=new URLSearchParams(location.search),e=Number(i.get("xrfov")),t=Number(i.get("xrscale"));(i.has("xrfov")||i.has("xrscale"))&&Re.renderer3.setXRQuality({foveation:i.has("xrfov")&&Number.isFinite(e)?e:void 0,framebufferScale:i.has("xrscale")&&Number.isFinite(t)?t:void 0})}var Wl=0;function Q_(i){let e=Wl?Math.min(.1,(i-Wl)/1e3):.016666666666666666;Wl=i,mn.isPresenting()?mn.tick(e):(Ye.tick(e),Ye.sim.state.teleport.charging&&(Re.isGestureActive()&&Re.cancel(),Re.pointerLeave())),Re.draw()}function fp(){let i=Ye.isWalking()||mn.isPresenting();Wl=0,Re.setLoop(i?Q_:null)}var mn=new Gl({editor:Re,locomotion:Ye,hud:$l,leftHanded:()=>io,onChange:()=>{fp(),ru(),ro.textContent=Kl()},log:i=>console.warn(i)});function eb(i){i?Ye.enterWalk():Ye.exitWalk(),fp(),ro.textContent=Kl(),ru()}function ru(){for(let[i,e]of su)e.classList.toggle("active",i===Re.tool);hp.disabled=!Re.canUndo(),up.disabled=!Re.canRedo(),dp.hidden=!Re.hasSelection(),mn?.invalidatePanel()}function tb(i){for(let e of i){let t=document.createElement("div");t.className="ev",t.textContent=qh(e),so.prepend(t)}for(;so.childElementCount>400;)so.lastElementChild?.remove()}function nb(i){let e=document.createElement("div");e.className="sep",e.textContent=`\u2500\u2500 ${i} \u2500\u2500`,so.prepend(e)}{let i=vt("labPresets");for(let e of Xs){let t=document.createElement("button");t.type="button",t.textContent=e.name,t.title=e.note,t.addEventListener("click",()=>Re.applyPreset(e.name)),i.appendChild(t)}vt("labClearLog").addEventListener("click",()=>{so.textContent=""}),vt("labClose").addEventListener("click",()=>pp(!1))}function pp(i){ql=i,Ks.set("lab",i?"1":"0"),cp.hidden=!i,!i&&Re.tool==="eraseFace"&&Re.setTool("select"),requestAnimationFrame(Jl)}var iu=vt("help");function Zl(i){iu.hidden=!i}vt("helpClose").addEventListener("click",()=>Zl(!1));iu.addEventListener("click",i=>{i.target===iu&&Zl(!1)});var Xl=vt("objFile");function ib(){let i=Of(Re.kernel,{triangulateHoled:Gh,version:Hi}),e=new Blob([i],{type:"model/obj"}),t=URL.createObjectURL(e),n=document.createElement("a"),s=new Date().toISOString().slice(0,19).replace(/[:T]/g,"-");n.href=t,n.download=`catsup-${s}.obj`,document.body.appendChild(n),n.click(),n.remove(),setTimeout(()=>URL.revokeObjectURL(t),1e4),ki({text:`\u5DF2\u5BFC\u51FA ${n.download}\uFF08${Re.kernel.faces().length} \u9762 / ${Re.kernel.edges().length} \u8FB9\uFF09`,level:"info"})}Xl.addEventListener("change",async()=>{let i=Xl.files?.[0];if(Xl.value="",!!i)try{let e=Bf(await i.text());if(!e.segs.length){ki({text:"OBJ \u91CC\u6CA1\u6709\u53EF\u7528\u7684\u8FB9",level:"warning"});return}let t=Re.addSegments(e.segs,`\u5BFC\u5165 ${i.name}`);Re.zoomExtents(),ki({text:`\u5BFC\u5165 ${i.name}\uFF1A${e.segs.length} \u6761\u8FB9 \u2192 ${t.length} \u4E2A\u819C\u4E8B\u4EF6`,level:"info"})}catch(e){ki({text:`\u5BFC\u5165\u5931\u8D25\uFF1A${e.message}`,level:"error"})}});var sb=zf(Yl,Re,{fingerDraws:()=>no,onUndo:()=>Re.undo(),onRedo:()=>Re.redo(),look:(i,e)=>Ye.look(i,e),walking:()=>Ye.isWalking(),toolBlocked:()=>Ye.sim.state.teleport.charging});window.addEventListener("keydown",i=>{let e=i.target;if(!(e&&(e.tagName==="INPUT"||e.tagName==="TEXTAREA"))){if(!i.ctrlKey&&!i.metaKey&&!i.altKey){let t={" ":"select",l:"line",r:"rect",m:"move",p:"pp",e:"erase",tab:"select",x:"erase"},n=i.key.toLowerCase(),s=t[n],r=Ye.isWalking()&&(n===" "||n==="e");if(s&&!r){i.preventDefault(),Re.setTool(s);return}}if((i.ctrlKey||i.metaKey)&&(i.key==="z"||i.key==="Z")){i.preventDefault(),i.shiftKey?Re.redo():Re.undo();return}if((i.ctrlKey||i.metaKey)&&(i.key==="y"||i.key==="Y")){i.preventDefault(),Re.redo();return}if(i.key==="Delete"||i.key==="Backspace"){Re.hasSelection()&&(i.preventDefault(),Re.deleteSelection());return}i.key==="Escape"&&(op(),Zl(!1),Re.cancel())}});function Jl(){Re.resize(window.devicePixelRatio||1)}new ResizeObserver(Jl).observe(X_);window.addEventListener("resize",Jl);var ou=rp({onUpdateAvailable:()=>ki({id:"update",text:"\u6709\u65B0\u7248\u672C",level:"info",actions:[{label:"\u5237\u65B0",primary:!0,onClick:()=>{ou.reload()}}]})});Y_.textContent=`${Hi}${ou.isDevRoute?" \xB7 dev":""}`;new URLSearchParams(location.search).has("reset")&&ki({text:`\u5DF2\u6E05\u7F13\u5B58\u91CD\u542F \xB7 ${Hi}`,level:"info"});window.__catsup={editor:Re,locomotion:Ye,vr:mn,hud:$l,version:Hi};cp.hidden=!ql;Re.setTool("line");ro.textContent=Kl();Jl();
/**
 * @license
 * Copyright 2010-2026 Three.js Authors
 * SPDX-License-Identifier: MIT
 */
//# sourceMappingURL=catsup-a6fa43b3cf4d.mjs.map
