var Bf=Object.defineProperty;var zf=(i,e,t)=>e in i?Bf(i,e,{enumerable:!0,configurable:!0,writable:!0,value:t}):i[e]=t;var ge=(i,e,t)=>zf(i,typeof e!="symbol"?e+"":e,t);var rs="v0.3.9-2026-09-07";function Uc(i,e){return Math.atan2(e.y-i.y,e.x-i.x)}function Nc(i,e,t){return(e.x-i.x)*(t.y-i.y)-(e.y-i.y)*(t.x-i.x)}function Yh(i){let e=0;for(let t=0;t<i.length;t++){let n=i[t],s=i[(t+1)%i.length];e+=n.x*s.y-s.x*n.y}return e/2}function Et(i,e){let t=!1;for(let n=0,s=e.length-1;n<e.length;s=n++){let r=e[n],a=e[s];r.y>i.y!=a.y>i.y&&i.x<(a.x-r.x)*(i.y-r.y)/(a.y-r.y)+r.x&&(t=!t)}return t}function Oi(i){return{x:Math.round(i.x/1e-6)*1e-6,y:Math.round(i.y/1e-6)*1e-6,z:Math.round(i.z/1e-6)*1e-6}}function At(i){return`${Math.round(i.x/1e-6)},${Math.round(i.y/1e-6)},${Math.round(i.z/1e-6)}`}function jt(i,e){return Math.abs(i.x-e.x)<=5e-7&&Math.abs(i.y-e.y)<=5e-7&&Math.abs(i.z-e.z)<=5e-7}function bt(i,e){return Math.hypot(i.x-e.x,i.y-e.y,i.z-e.z)}var Fe=(i,e)=>({x:i.x-e.x,y:i.y-e.y,z:i.z-e.z}),Ve=(i,e)=>({x:i.x+e.x,y:i.y+e.y,z:i.z+e.z}),ze=(i,e)=>({x:i.x*e,y:i.y*e,z:i.z*e}),ie=(i,e)=>i.x*e.x+i.y*e.y+i.z*e.z,qt=(i,e)=>({x:i.y*e.z-i.z*e.y,y:i.z*e.x-i.x*e.z,z:i.x*e.y-i.y*e.x}),Ni=i=>Math.hypot(i.x,i.y,i.z);function Bi(i){let e=Ni(i);return e>0?ze(i,1/e):i}function ks(i,e){let t=Bi(i),n=e;return(Math.abs(t.x)>1e-9?t.x:Math.abs(t.y)>1e-9?t.y:t.z)<0&&(t=ze(t,-1),n=-n),{n:t,d:n}}function li(i,e,t){let n=qt(Fe(e,i),Fe(t,i)),s=Ni(n),r=Math.max(bt(i,e),bt(i,t));if(s<=5e-7*r||r<=5e-7)return null;let a=Bi(n);return ks(a,ie(a,i))}function Qt(i,e){return Math.abs(ie(i,e.n)-e.d)}function as(i){let e=i.n,t=Math.abs(e.x),n=Math.abs(e.y),s=Math.abs(e.z),r=t<=n&&t<=s?{x:1,y:0,z:0}:n<=s?{x:0,y:1,z:0}:{x:0,y:0,z:1},a=Bi(qt(e,r)),o=qt(e,a);return{u:a,v:o}}function mn(i,e){return{x:ie(i,e.u),y:ie(i,e.v)}}function $h(i,e,t){return Ve(Ve(ze(t.u,i.x),ze(t.v,i.y)),ze(e.n,e.d))}function jr(i,e,t){let n=bt(e,t);if(n<=5e-7)return jt(i,e);if(Ni(qt(Fe(i,e),Fe(t,e)))/n>5e-7)return!1;let r=ie(Fe(i,e),Fe(t,e))/(n*n);return r>=-5e-7/n&&r<=1+5e-7/n}function Kh(i,e,t){let n=Fe(t,e),s=ie(n,n);if(s===0)return bt(i,e);let r=ie(Fe(i,e),n)/s;return r=Math.max(0,Math.min(1,r)),bt(i,Ve(e,ze(n,r)))}function Qr(i,e,t,n){let s=Fe(e,i),r=Fe(n,t),a=Ni(s),o=Ni(r);if(a<=5e-7||o<=5e-7)return[];let c=qt(s,r),l=Ni(c);if(l/(a*o)<1e-12){if(Ni(qt(Fe(t,i),s))/a>5e-7)return[];let p=T=>ie(Fe(T,i),s)/(a*a),b=p(t),E=p(n);b>E&&([b,E]=[E,b]);let v=Math.max(0,b),A=Math.min(1,E);if(A<v-5e-7/a)return[];let M=T=>Oi(Ve(i,ze(s,T))),w=M(v),x=M(A);return jt(w,x)?[w]:[w,x]}if(Math.abs(ie(Fe(t,i),c))/l>5e-7)return[];let d=l*l,u=ie(qt(Fe(t,i),r),c)/d,f=ie(qt(Fe(t,i),s),c)/d,m=5e-7/a,_=5e-7/o;return u<-m||u>1+m||f<-_||f>1+_?[]:[Oi(Ve(i,ze(s,u)))]}var ea=class i{constructor(){ge(this,"vertsById",new Map);ge(this,"edgesById",new Map);ge(this,"vertByKey",new Map);ge(this,"nextV",1);ge(this,"nextE",1)}vertices(){return[...this.vertsById.values()]}edges(){return[...this.edgesById.values()]}vertexCount(){return this.vertsById.size}edgeCount(){return this.edgesById.size}vertex(e){let t=this.vertsById.get(e);if(!t)throw new Error(`vertex ${e} \u4E0D\u5B58\u5728`);return t}edge(e){let t=this.edgesById.get(e);if(!t)throw new Error(`edge ${e} \u4E0D\u5B58\u5728`);return t}hasEdge(e){return this.edgesById.has(e)}hasVertex(e){return this.vertsById.has(e)}pt(e){let t=this.vertex(e);return{x:t.x,y:t.y,z:t.z}}otherEnd(e,t){return e.a===t?e.b:e.a}vertexAt(e){return this.vertByKey.get(At(e))}ensureVertex(e){let t=At(e),n=this.vertByKey.get(t);if(n!==void 0)return n;let s=this.nextV++;return this.vertsById.set(s,{id:s,x:e.x,y:e.y,z:e.z,edges:new Set}),this.vertByKey.set(t,s),s}edgeBetween(e,t){let n=this.vertex(e).edges;for(let s of n){let r=this.edge(s);if(r.a===t||r.b===t)return s}}addEdge(e,t){if(e===t)throw new Error("\u62D2\u7EDD\u81EA\u73AF\u8FB9");if(this.edgeBetween(e,t)!==void 0)throw new Error(`\u8FB9 ${e}-${t} \u5DF2\u5B58\u5728\uFF08\u91CD\u5408\u5373\u540C\u4E00\uFF0C\u8C03\u7528\u65B9\u5E94\u62A5 retrace\uFF09`);let n=this.nextE++;return this.edgesById.set(n,{id:n,a:e,b:t,faceLinks:[]}),this.vertex(e).edges.add(n),this.vertex(t).edges.add(n),n}removeEdge(e){let t=this.edge(e);this.edgesById.delete(e);for(let n of[t.a,t.b]){let s=this.vertex(n);s.edges.delete(e),s.edges.size===0&&(this.vertsById.delete(n),this.vertByKey.delete(At({x:s.x,y:s.y,z:s.z})))}}splitEdge(e,t){let n=this.edge(e),s=[...n.faceLinks],r=n.a,a=n.b;this.removeEdgeKeepVerts(e);let o=this.ensureVertex(t),c=this.addEdge(r,o),l=this.addEdge(o,a);return this.edge(c).faceLinks=[...s],this.edge(l).faceLinks=[...s],{v:o,e1:c,e2:l}}relocateVertices(e){for(let{id:t}of e){let n=this.vertex(t);this.vertByKey.delete(At({x:n.x,y:n.y,z:n.z}))}for(let{id:t,to:n}of e){let s=this.vertex(t),r=At(n);if(this.vertByKey.has(r))throw new Error("relocateVertices \u7EC8\u6001 key \u78B0\u649E\u2014\u2014\u5408\u5E76\u8BE5\u5728\u8C03\u7528\u65B9\u5148\u505A");s.x=n.x,s.y=n.y,s.z=n.z,this.vertByKey.set(r,t)}}replaceEdgeWithChain(e,t){let n=this.edge(e),s=[...n.faceLinks],r=n.a,a=n.b;this.removeEdgeKeepVerts(e);let o=[r,...t.map(l=>this.ensureVertex(l)),a],c=[];for(let l=0;l+1<o.length;l++){let h=o[l],d=o[l+1];if(h===d)continue;let u=this.edgeBetween(h,d);if(u!==void 0){c.push({edge:u,fwd:this.edge(u).a===h});continue}let f=this.addEdge(h,d);this.edge(f).faceLinks=[...s],c.push({edge:f,fwd:!0})}return c}relocateVertex(e,t){let n=this.vertex(e),s=At({x:n.x,y:n.y,z:n.z});if(this.vertByKey.get(At(t))!==void 0&&this.vertByKey.get(At(t))!==e)throw new Error("relocateVertex \u76EE\u6807\u683C\u70B9\u5DF2\u88AB\u5360\u7528\u2014\u2014sticky \u5408\u5E76\u8BE5\u5728\u8C03\u7528\u65B9\u5148\u505A");this.vertByKey.delete(s),n.x=t.x,n.y=t.y,n.z=t.z,this.vertByKey.set(At(t),e)}removeEdgeKeepVerts(e){let t=this.edge(e);this.edgesById.delete(e),this.vertex(t.a).edges.delete(e),this.vertex(t.b).edges.delete(e)}clone(){let e=new i;e.nextV=this.nextV,e.nextE=this.nextE;for(let[t,n]of this.vertsById)e.vertsById.set(t,{id:n.id,x:n.x,y:n.y,z:n.z,edges:new Set(n.edges)});for(let[t,n]of this.edgesById)e.edgesById.set(t,{id:n.id,a:n.a,b:n.b,faceLinks:[...n.faceLinks]});for(let[t,n]of this.vertByKey)e.vertByKey.set(t,n);return e}};function Zh(i,e,t,n){let s=Oi(e),r=Oi(t);if(jt(s,r))return{created:[],retraced:[]};let a=bt(s,r),o=m=>((m.x-s.x)*(r.x-s.x)+(m.y-s.y)*(r.y-s.y)+(m.z-s.z)*(r.z-s.z))/(a*a),c=new Map,l=m=>{c.set(At(m),m)};l(s),l(r);let h=new Map;for(let m of i.edges()){let _=i.pt(m.a),g=i.pt(m.b),p=Qr(s,r,_,g);for(let b of p)if(l(b),!jt(b,_)&&!jt(b,g)){let E=h.get(m.id)??[];E.push(b),h.set(m.id,E)}}for(let m of i.vertices()){let _={x:m.x,y:m.y,z:m.z};jr(_,s,r)&&l(_)}for(let[m,_]of h){let g=i.pt(i.edge(m).a);_.sort((b,E)=>bt(g,b)-bt(g,E));let p=m;for(let b of _){let{e1:E,e2:v}=i.splitEdge(p,b);n?.(p,E,v),p=v}}let d=[...c.values()].sort((m,_)=>o(m)-o(_)),u=[],f=[];for(let m=0;m+1<d.length;m++){let _=d[m],g=d[m+1];if(jt(_,g))continue;let p=i.ensureVertex(_),b=i.ensureVertex(g);if(p===b)continue;let E=i.edgeBetween(p,b);E!==void 0?f.push(E):u.push(i.addEdge(p,b))}return{created:u,retraced:f}}var Vf=32;function Oc(i){let e=!1;for(let t=0;t<Vf;t++){let n=new Map,s=(a,o)=>{let c=n.get(a);c||(c=new Map,n.set(a,c)),c.set(At(o),o)},r=i.edges();for(let a=0;a<r.length;a++){let o=r[a],c=i.pt(o.a),l=i.pt(o.b);for(let h=a+1;h<r.length;h++){let d=r[h],u=i.pt(d.a),f=i.pt(d.b);for(let m of Qr(c,l,u,f))!jt(m,c)&&!jt(m,l)&&s(o.id,m),!jt(m,u)&&!jt(m,f)&&s(d.id,m)}for(let h of i.vertices()){if(h.id===o.a||h.id===o.b)continue;let d={x:h.x,y:h.y,z:h.z};jr(d,c,l)&&s(o.id,d)}}if(n.size===0)return{changed:e};e=!0;for(let[a,o]of n){if(!i.hasEdge(a))continue;let c=i.pt(i.edge(a).a),l=[...o.values()].sort((h,d)=>bt(c,h)-bt(c,d));i.replaceEdgeWithChain(a,l)}}throw new Error("planarize \u672A\u6536\u655B\uFF08>32 \u8F6E\uFF09\u2014\u2014\u91CF\u5316\u8FDE\u9501\u5F02\u5E38\uFF0C\u68C0\u67E5\u8F93\u5165\u51E0\u4F55")}function Jh(i,e){let t=i.length;if(t<4)return null;let n=u=>{for(let f=1;f+1<u.length;f++){let m=li(i[u[0]],i[u[f]],i[u[f+1]]);if(m)return m}return null},s=u=>{let f=n(u);return f?u.every(m=>Qt(i[m],f)<=e):!0},r=[],a=[0,1];for(let u=2;u<t;u++){let f=[...a,u];s(f)?a=f:(r.push(a),a=[a[a.length-1],u])}let o=[...a,0];if(r.length&&s([...a,...r[0]])?r[0]=[...a,...r[0]]:s(o)?r.push(o):(r.push(a),r.push([a[a.length-1],0])),r.length<2)return null;let c=r.map(u=>u[0]),l=c.length,h=r.filter(u=>new Set(u).size>=3),d=[];if(l===2)d.push([c[0],c[1]]);else{for(let u=0;u<l;u++)d.push([c[u],c[(u+1)%l]]);if(l>=3){if(!s(c))return null;new Set(c).size>=3&&h.push([...c])}}return h.length?{pieces:h,creases:d}:null}var Qh=(i,e)=>`${i}:${e?"f":"r"}`;function eu(i,e){let t=e?.project??(g=>{let p=i.pt(g);return{x:p.x,y:p.y}}),n=e?.edges?[...e.edges].map(g=>i.edge(g)):i.edges(),s=new Map,r=g=>{let p=s.get(g);return p||(p=t(g),s.set(g,p)),p},a=new Map,o=new Set;for(let g of n)o.add(g.id),a.set(g.a,(a.get(g.a)??0)+1),a.set(g.b,(a.get(g.b)??0)+1);let c=[...a.entries()].filter(([,g])=>g===1).map(([g])=>g);for(;c.length;){let g=c.pop();if((a.get(g)??0)===1)for(let p of i.vertex(g).edges){if(!o.has(p))continue;o.delete(p);let b=i.edge(p);for(let E of[b.a,b.b]){let v=(a.get(E)??0)-1;a.set(E,v),v===1&&c.push(E)}}}if(o.size===0)return[];let l=new Map,h=g=>{let p=l.get(g);if(!p){p=[];let b=i.vertex(g);for(let E of b.edges){if(!o.has(E))continue;let v=i.otherEnd(i.edge(E),g);p.push({eid:E,to:v,angle:Uc(r(g),r(v))})}p.sort((E,v)=>E.angle-v.angle),l.set(g,p)}return p},d=(g,p)=>{let b=h(p),E=Uc(r(p),r(g)),v;for(let A=b.length-1;A>=0;A--)if(b[A].angle<E-1e-12){v=b[A];break}return v||(v=b[b.length-1]),v},u=new Set,f=[],m=[];for(let g of o){let p=i.edge(g);for(let b of[!0,!1]){if(u.has(Qh(g,b)))continue;let E=[],v=[],A=g,M=b?p.a:p.b,w=b?p.b:p.a;for(;;){let R=i.edge(A).a===M,C=Qh(A,R);if(u.has(C))break;u.add(C),E.push({edge:A,forward:R}),v.push(r(M));let D=d(M,w);M=w,w=D.to,A=D.eid}if(E.length<2)continue;let x=Yh(v),T={edges:E,pts:v};x>1e-9?f.push({ring:T,area:x}):x<-1e-9&&m.push({ring:T,areaAbs:-x})}}let _=f.sort((g,p)=>g.area-p.area).map(g=>({outer:g.ring,holes:[],area:g.area}));for(let g of m){let p=g.ring.pts[0];for(let b of _)if(b.outer.pts.length&&kf(b.outer,g.ring,p)){b.holes.push(g.ring),b.area-=g.areaAbs;break}}return _}function kf(i,e,t){let n=new Set(i.edges.map(s=>s.edge));return e.edges.some(s=>n.has(s.edge))?!1:Et(t,i.pts)}function os(i){let e=i.outer.pts.map(o=>o.y),t=Math.min(...e),n=Math.max(...e),s=[i.outer,...i.holes];for(let o=1;o<=8;o++){let c=t+(n-t)*o/(o+1);if(s.some(u=>u.pts.some(f=>Math.abs(f.y-c)<1e-9)))continue;let l=[];for(let u of s)for(let f=0;f<u.pts.length;f++){let m=u.pts[f],_=u.pts[(f+1)%u.pts.length];m.y>c!=_.y>c&&l.push(m.x+(c-m.y)*(_.x-m.x)/(_.y-m.y))}if(l.length<2)continue;l.sort((u,f)=>u-f);let h=NaN,d=-1;for(let u=0;u+1<l.length;u+=2){let f=l[u+1]-l[u];f>d&&(d=f,h=(l[u]+l[u+1])/2)}if(d>1e-9)return{x:h,y:c}}let r=i.outer.pts.reduce((o,c)=>o+c.x,0)/i.outer.pts.length,a=i.outer.pts.reduce((o,c)=>o+c.y,0)/i.outer.pts.length;return{x:r,y:a}}function tu(i,e){if(!Et(e,i.outer.pts))return!1;for(let t of i.holes)if(Et(e,t.pts))return!1;return!0}var Hf=1-1e-10,ta=class i{constructor(){ge(this,"recs",new Map);ge(this,"nextId",1)}all(){return[...this.recs.values()]}rec(e){let t=this.recs.get(e);if(!t)throw new Error(`plane ${e} \u4E0D\u5B58\u5728`);return t}ensure(e,t){for(let s of this.recs.values())if(ie(s.plane.n,e.n)>=Hf&&Math.abs(s.plane.d-e.d)<=t)return s;let n={id:this.nextId++,plane:e,basis:as(e)};return this.recs.set(n.id,n),n}prune(e){for(let t of[...this.recs.keys()])e.has(t)||this.recs.delete(t)}clone(){let e=new i;e.nextId=this.nextId;for(let[t,n]of this.recs)e.recs.set(t,n);return e}};function nu(i,e,t,n){for(let o of i.vertices()){let c=[...o.edges],l=i.pt(o.id);for(let h=0;h<c.length;h++)for(let d=h+1;d<c.length;d++){let u=i.pt(i.otherEnd(i.edge(c[h]),o.id)),f=i.pt(i.otherEnd(i.edge(c[d]),o.id)),m=li(l,u,f);m&&e.ensure(m,t)}}let s=new Map,r=i.edges();for(let o of e.all()){let c=[];for(let l of r)Qt(i.pt(l.a),o.plane)<=t&&Qt(i.pt(l.b),o.plane)<=t&&c.push(l.id);c.length>=3&&s.set(o.id,c)}let a=new Set([...s.keys(),...n]);return e.prune(a),s}var na=class i{constructor(){ge(this,"byId",new Map);ge(this,"nextId",1)}faces(){return[...this.byId.values()]}face(e){return this.byId.get(e)}faceCount(){return this.byId.size}planeIds(){return new Set([...this.byId.values()].map(e=>e.planeId))}faceContains(e,t){if(!Et(t,e.outer.pts))return!1;for(let n of e.holes)if(Et(t,n.pts))return!1;return!0}occurrences(e,t){let n=0,s=!1,r=!1;for(let a of e.outer.edges)a.edge===t&&(n++,s=!0);for(let a of e.holes)for(let o of a.edges)o.edge===t&&(n++,r=!0);return{count:n,onOuter:s,onHole:r}}regionsByPlane(e,t,n){let s=nu(e,t,n,this.planeIds()),r=new Map;for(let[a,o]of s){let c=t.rec(a),l=eu(e,{edges:o,project:h=>mn(e.pt(h),c.basis)});l.length&&r.set(a,l)}return r}reconcileConstructive(e,t,n,s,r,a){let o=a??this.captureSnaps(e);return this.settle(e,t,n,o,new Map,new Set,!0,void 0,"or",{zeroClaimKeep:!0,gestureEdges:s,toggleWith:r})}snapshotEraseVerdicts(e){let t={burst:new Set,mergePairs:[],heal:new Set};for(let n of e){let s=this.faces().map(a=>({f:a,occ:this.occurrences(a,n)})).filter(a=>a.occ.count>0);if(s.length===0)continue;let r=new Map;for(let a of s){let o=r.get(a.f.planeId)??[];o.push(a),r.set(a.f.planeId,o)}for(let a of r.values())if(a.length>=2)t.mergePairs.push([a[0].f.id,a[1].f.id]);else{let{f:o,occ:c}=a[0];c.count>=2||c.onHole?t.heal.add(o.id):t.burst.add(o.id)}}return t}reconcileErase(e,t,n,s){let r=[],a=new Map,o=f=>{let m=f;for(;a.get(m)!==void 0&&a.get(m)!==m;)m=a.get(m);return m};for(let[f,m]of s.mergePairs)a.has(f)||a.set(f,f),a.has(m)||a.set(m,m),a.set(o(f),o(m));let c=new Map;for(let f of a.keys()){let m=o(f);(c.get(m)??c.set(m,[]).get(m)).push(f)}let l=this.regionsByPlane(e,t,n),h=new Set,d=(f,m)=>(l.get(f)??[]).find(_=>!h.has(_)&&tu(_,m)),u=new Set(s.burst);for(let f of c.values()){let m=f.some(p=>u.has(p)),_,g;if(!m)for(let p of f){let b=this.byId.get(p);if(b&&(_=d(b.planeId,os(b)),_)){g=b.planeId;break}}if(_&&g!==void 0){for(let b of f)this.byId.delete(b);let p=this.mint(g,_);h.add(_),r.push({type:"MERGE",from:f,into:p.id})}else for(let p of f)u.add(p)}for(let f of s.heal){if(u.has(f)||!this.byId.has(f))continue;let m=this.byId.get(f),_=d(m.planeId,os(m));if(_){this.byId.delete(f);let g=this.mint(m.planeId,_);h.add(_),r.push({type:"ABSORB",from:f,into:g.id})}else u.add(f)}for(let f of u)this.byId.delete(f)&&r.push({type:"BURST",face:f});return this.rebuildFaceLinks(e),r}deleteSilently(e){return this.byId.delete(e)}renameFace(e,t){let n=this.byId.get(e);!n||this.byId.has(t)||(this.byId.delete(e),this.byId.set(t,{id:t,planeId:n.planeId,outer:n.outer,holes:n.holes}))}eraseFaces(e,t){let n=[];for(let s of t)this.byId.delete(s)&&n.push({type:"FACE_ERASED",face:s});return this.rebuildFaceLinks(e),n}reconcileCoverage(e,t,n,s,r,a,o,c,l="or"){return this.settle(e,t,n,s,r,a,o,c,l,{})}settle(e,t,n,s,r,a,o,c,l,h){let d=[];if(!o){for(let x of this.faces())this.refreshRingPts(e,t,x);this.rebuildFaceLinks(e);let w=[...a].filter(x=>this.byId.has(x));return w.length&&d.push({type:"STRETCH",faces:w}),d}let u=[],f=this.regionsByPlane(e,t,n),m=w=>{for(;r.has(w);)w=r.get(w);return w},_=w=>{let x=[];for(let T of w){let R=m(T);if(!e.hasVertex(R))continue;let C=e.pt(R);x.length&&C.x===x[x.length-1].x&&C.y===x[x.length-1].y&&C.z===x[x.length-1].z||x.push(C)}for(;x.length>=2&&x[0].x===x[x.length-1].x&&x[0].y===x[x.length-1].y&&x[0].z===x[x.length-1].z;)x.pop();return x},g=new Map,p=new Map;for(let w of this.faces()){let x=s.get(w.id),T=[],R=c?.get(w.id),C=R??(x?[x.outer]:[]);for(let D of C){let I=_(D);if(I.length<3)continue;let V=null;for(let J=0;J+2<I.length&&!V;J++)V=li(I[J],I[J+1],I[J+2]);if(!V||!I.every(J=>Qt(J,V)<=n))continue;let F=t.ensure(V,n),X=I.map(J=>mn(J,F.basis)),B=R?[]:(x?.holes??[]).map(J=>_(J).map(ne=>mn(ne,F.basis))),$=J=>iu(J,X)+B.reduce((ne,de)=>ne+(de.length>=3?iu(J,de):0),0);for(let J of f.get(F.id)??[])T.some(ne=>ne.r===J)||Math.abs($(os(J)))>=1&&T.push({r:J,planeId:F.id})}g.set(w.id,T);for(let D of T){let I=p.get(D.r)??[];I.push(w.id),p.set(D.r,I)}}let b=new Map,E=new Map;for(let[w,x]of g){if(x.length<2)continue;this.byId.delete(w);let T=[];for(let R of x){let C=this.mint(R.planeId,R.r);T.push(C.id);let D=p.get(R.r);D[D.indexOf(w)]=C.id}b.set(w,T),d.push({type:"DIVIDE",from:w,into:T})}for(let[w,x]of p){let T=[...new Set(x)];if(T.length<2)continue;if(l==="xor"&&T.length%2===0){for(let D of T){let I=this.byId.get(D);I&&u.push(...this.ringEdgeIds(I)),this.byId.delete(D)&&d.push({type:"BURST",face:D})}p.set(w,[]);continue}let R=null;for(let D of T)R=this.byId.get(D)?.planeId??R,this.byId.delete(D);let C=this.mint(R,w);for(let D of T)b.set(D,[...b.get(D)??[],C.id]);d.push({type:"MERGE",from:T,into:C.id}),p.set(w,[C.id])}for(let[w,x]of g){if(b.has(w))continue;let T=this.byId.get(w);if(!T)continue;if(x.length===0){if(h.zeroClaimKeep)continue;this.byId.delete(w),d.push({type:"BURST",face:w});continue}let{r:R,planeId:C}=x[0];(p.get(R)??[])[0]===w&&(C===T.planeId?this.adopt(T,R):(this.byId.delete(w),this.byId.set(w,{id:w,planeId:C,outer:R.outer,holes:R.holes}),E.set(w,w)))}let v=h.gestureEdges,A=h.toggleWith;if(A&&v)for(let w of this.faces())w.outer.edges.every(x=>v.has(x.edge)||A.has(x.edge))&&(u.push(...this.ringEdgeIds(w)),this.byId.delete(w.id),d.push({type:"BURST",face:w.id}));if(v&&v.size){let w=new Set;for(let[,x]of g)for(let T of x)w.add(T.r);for(let[x,T]of f)for(let R of T)if(!w.has(R)&&!this.faces().some(C=>C.outer===R.outer)&&R.outer.edges.some(C=>v.has(C.edge))){let C=this.mint(x,R);d.push({type:"BIRTH",face:C.id})}}this.rebuildFaceLinks(e),this.buryEdges(e,u);let M=new Set;for(let w of a){this.byId.has(w)&&!b.has(w)&&!d.some(T=>T.type==="BURST"&&T.face===w)&&M.add(w);let x=E.get(w);x!==void 0&&M.add(x)}return M.size&&d.push({type:"STRETCH",faces:[...M]}),d}buryEdges(e,t){for(let n of t)e.hasEdge(n)&&e.edge(n).faceLinks.length===0&&e.removeEdge(n)}ringEdgeIds(e){let t=[];for(let n of[e.outer,...e.holes])for(let s of n.edges)t.push(s.edge);return t}captureSnaps(e){let t=new Map;for(let n of this.faces())t.set(n.id,{outer:sn(e,n.outer),holes:n.holes.map(s=>sn(e,s))});return t}clone(){let e=new i;e.nextId=this.nextId;let t=n=>({edges:n.edges.map(s=>({...s})),pts:n.pts.map(s=>({...s}))});for(let[n,s]of this.byId)e.byId.set(n,{id:s.id,planeId:s.planeId,outer:t(s.outer),holes:s.holes.map(t)});return e}mint(e,t){let n={id:this.nextId++,planeId:e,outer:t.outer,holes:t.holes};return this.byId.set(n.id,n),n}adopt(e,t){e.outer=t.outer,e.holes=t.holes}refreshRingPts(e,t,n){let s=t.rec(n.planeId).basis;for(let r of[n.outer,...n.holes])r.pts=r.edges.map(a=>mn(e.pt(a.forward?e.edge(a.edge).a:e.edge(a.edge).b),s))}rebuildFaceLinks(e){for(let t of e.edges())t.faceLinks=[];for(let t of this.byId.values())for(let n of[t.outer,...t.holes])for(let s of n.edges)e.hasEdge(s.edge)&&e.edge(s.edge).faceLinks.push(t.id)}};function iu(i,e){let t=0;for(let n=0;n<e.length;n++){let s=e[n],r=e[(n+1)%e.length];s.y<=i.y?r.y>i.y&&Nc(s,r,i)>0&&t++:r.y<=i.y&&Nc(s,r,i)<0&&t--}return t}function sn(i,e){let t=[],n=e.edges;for(let s=0;s<n.length;s++){let r=n[s];if(i.hasEdge(r.edge)){let a=i.edge(r.edge);t.push(r.forward?a.a:a.b)}else{let a=n[(s-1+n.length)%n.length];if(i.hasEdge(a.edge)){let o=i.edge(a.edge);t.push(a.forward?o.b:o.a)}}}return t}var ia=i=>({x:i.x,y:i.y,z:i.z??0}),hi=class i{constructor(e){ge(this,"_graph",new ea);ge(this,"store",new na);ge(this,"eventLog",[]);ge(this,"planes",new ta);ge(this,"coplanarTol");this.coplanarTol=e?.coplanarTol??.001}get graph(){return this._graph}clone(){let e=new i({coplanarTol:this.coplanarTol});return e._graph=this._graph.clone(),e.store=this.store.clone(),e.planes=this.planes.clone(),e}addEdges(e){return this.addSegmentsMixed(e.map(([t,n])=>({a:t,b:n,gesture:!0})))}addSegmentsMixed(e,t,n){let s=this.store.captureSnaps(this.graph),r=new Set(n);for(let{a,b:o,gesture:c}of e){let l=Zh(this.graph,ia(a),ia(o),(h,d,u)=>{r.delete(h)&&(r.add(d),r.add(u))});if(c){for(let h of l.created)r.add(h);for(let h of l.retraced)r.add(h)}}return this.emit(this.store.reconcileConstructive(this.graph,this.planes,this.coplanarTol,r,t,s))}eraseEdges(e){let t=[...new Set(e)].filter(s=>this.graph.hasEdge(s)),n=this.store.snapshotEraseVerdicts(t);for(let s of t)this.graph.removeEdge(s);return this.emit(this.store.reconcileErase(this.graph,this.planes,this.coplanarTol,n))}eraseFaces(e){return this.emit(this.store.eraseFaces(this.graph,e))}moveVertices(e,t="or"){let n=new Map;for(let m of this.store.faces())n.set(m.id,{outer:sn(this.graph,m.outer),holes:m.holes.map(_=>sn(this.graph,_))});let s=new Map;for(let m of e)this.graph.hasVertex(m.id)&&s.set(m.id,Oi(ia(m.to)));let r=new Set;for(let m of s.keys())for(let _ of this.graph.vertex(m).edges)for(let g of this.graph.edge(_).faceLinks)r.add(g);let a=new Map;for(let m of this.graph.vertices()){let _=s.get(m.id)??{x:m.x,y:m.y,z:m.z},g=At(_),p=a.get(g)??[];p.push(m.id),a.set(g,p)}let o=new Map,c=!1;for(let m of a.values()){if(m.length<2)continue;c=!0;let _=m.find(g=>!s.has(g))??Math.min(...m);for(let g of m)g!==_&&(o.set(g,_),this.absorbVertex(g,_),s.delete(g))}let l=[...s].filter(([m,_])=>this.graph.hasVertex(m)&&!jt(this.graph.pt(m),_)).map(([m,_])=>({id:m,to:_}));this.graph.relocateVertices(l);let{changed:h}=Oc(this.graph),d=m=>{let _=m;for(;o.has(_);)_=o.get(_);return _},u=new Map;for(let[m,_]of n){if(_.holes.length)continue;let g=[];for(let v of _.outer){let A=d(v);this.graph.hasVertex(A)&&(g.length&&g[g.length-1]===A||g.push(A))}for(;g.length>=2&&g[0]===g[g.length-1];)g.pop();if(g.length<4)continue;let p=g.map(v=>this.graph.pt(v)),b=null;for(let v=0;v+2<p.length&&!b;v++)b=li(p[v],p[v+1],p[v+2]);if(b&&p.every(v=>Qt(v,b)<=this.coplanarTol))continue;let E=Jh(p,this.coplanarTol);if(E){for(let[v,A]of E.creases){let M=g[v],w=g[A];M===w||this.graph.edgeBetween(M,w)!==void 0||this.graph.addEdge(M,w)}u.set(m,E.pieces.map(v=>v.map(A=>g[A])))}}u.size&&Oc(this.graph);let f=c||h||r.size>0;return this.emit(this.store.reconcileCoverage(this.graph,this.planes,this.coplanarTol,n,o,r,f,u,t))}pushPull(e,t,n){let s=n?.settleLanding!==!1,r=this.store.face(e);if(!r)return[];let a=this.planes.rec(r.planeId),o=a.plane.n,c=ze(o,t);if(Math.abs(t)<1e-6)return[];let l=new Set(this.graph.edges().map(I=>I.id)),h=[r.outer,...r.holes],d=new Map,u=new Set,f=new Set,m=new Map;for(let I=0;I<h.length;I++)for(let V of h[I].edges){let F=this.graph.edge(V.edge);u.add(F.id),m.set(F.id,I);let X=F.faceLinks.filter(B=>B!==e);X.length===0?(d.set(F.id,"move"),f.add(F.id)):X.every(B=>{let $=this.store.face(B);return $?Math.abs(ie(this.planes.rec($.planeId).plane.n,o))<=.001:!0})?d.set(F.id,"move"):d.set(F.id,"copy")}let _=new Map;for(let I of u){let V=this.graph.edge(I),F=d.get(I);for(let X of[V.a,V.b]){let B=_.get(X)??{hasMove:!1,hasCopy:!1};F==="move"?B.hasMove=!0:B.hasCopy=!0,_.set(X,B)}}for(let I of this.graph.edges()){if(u.has(I.id))continue;let V={a:_.get(I.a),b:_.get(I.b)};if(!V.a&&!V.b)continue;let F=this.graph.pt(I.a),X=this.graph.pt(I.b),B=Fe(X,F),$=Math.hypot(B.x,B.y,B.z);$>0&&Math.abs(ie(ze(B,1/$),o))>.999||(V.a&&(V.a.hasCopy=!0),V.b&&(V.b.hasCopy=!0))}let g=I=>{let V=_.get(I);return V.hasMove&&!V.hasCopy},p=new Map;for(let I of _.keys())p.set(I,this.graph.pt(I));let b=[],E=[...d.values()].some(I=>I==="copy")||[..._.values()].some(I=>I.hasCopy),v=I=>m.get(I)===0;for(let I of u){if(d.get(I)!=="copy")continue;let V=this.graph.edge(I);b.push({a:Ve(p.get(V.a),c),b:Ve(p.get(V.b),c),gesture:v(I)})}for(let I of[...u]){if(d.get(I)!=="move"||f.has(I))continue;let V=this.graph.edge(I);g(V.a)&&g(V.b)||(b.push({a:Ve(p.get(V.a),c),b:Ve(p.get(V.b),c),gesture:v(I)}),this.graph.removeEdge(I))}for(let I of[...f]){if(!this.graph.hasEdge(I))continue;let V=this.graph.edge(I);b.push({a:p.get(V.a),b:p.get(V.b),gesture:v(I)}),g(V.a)&&g(V.b)||(b.push({a:Ve(p.get(V.a),c),b:Ve(p.get(V.b),c),gesture:v(I)}),this.graph.removeEdge(I))}for(let[I,V]of _){let F=p.get(I);V.hasCopy?b.push({a:F,b:Ve(F,c),gesture:!0}):g(I)&&[...f].some(X=>{if(!l.has(X))return!1;let $=this.graph.hasEdge(X)?this.graph.edge(X):null;return $?$.a===I||$.b===I:!1})&&b.push({a:F,b:Ve(F,c),gesture:!0})}let A=null;if(E){let I=os({outer:r.outer,holes:r.holes}),V=a.basis,F=Ve(Ve(ze(V.u,I.x),ze(V.v,I.y)),ze(a.plane.n,a.plane.d));A=Ve(F,c),this.store.deleteSilently(e)}let M=new Set(this.store.faces().map(I=>I.id)),w=[..._.keys()].filter(I=>g(I)&&this.graph.hasVertex(I)).map(I=>({id:I,to:Ve(p.get(I),c)})),x=w.length?this.moveVertices(w,s?"xor":"or"):[],T=new Set([...u].filter(I=>d.get(I)==="move")),R=new Set;if(E)for(let I of u)d.get(I)==="move"&&v(I)&&this.graph.hasEdge(I)&&R.add(I);let C=b.length?this.addSegmentsMixed(b,s&&E?T:new Set,R):[],D=[];if(E&&A){let I=this.hitTest(A,this.coplanarTol).face;if(I!==void 0&&!M.has(I)){this.store.renameFace(I,e),this.store.rebuildFaceLinks(this.graph);for(let V of C)if(V.type==="BIRTH"&&V.face===I){let F=V;delete F.face,F.type="STRETCH",F.faces=[e];break}}else D=this.emit([{type:"FACE_ERASED",face:e}])}return[...x,...C,...D]}vertices(){return this.graph.vertices()}edges(){return this.graph.edges()}faces(){return this.store.faces()}face(e){return this.store.face(e)}log(){return this.eventLog}hitTest(e,t){let n=ia(e),s,r=t;for(let c of this.graph.vertices()){let l=bt(n,{x:c.x,y:c.y,z:c.z});l<=r&&(r=l,s=c.id)}if(s!==void 0)return{vertex:s};let a,o=t;for(let c of this.graph.edges()){let l=Kh(n,this.graph.pt(c.a),this.graph.pt(c.b));l<=o&&(o=l,a=c.id)}if(a!==void 0)return{edge:a};for(let c of this.store.faces()){let l=this.planes.rec(c.planeId);if(!(Qt(n,l.plane)>Math.max(t,this.coplanarTol))&&this.store.faceContains(c,mn(n,l.basis)))return{face:c.id}}return{}}faceRings3(e){let t=this.store.face(e);if(!t)return;let n=s=>s.edges.map(r=>this.graph.pt(r.forward?this.graph.edge(r.edge).a:this.graph.edge(r.edge).b));return{outer:n(t.outer),holes:t.holes.map(n)}}planeOf(e){return this.store.face(e)?this.planes.rec(this.store.face(e).planeId):void 0}emit(e){return this.eventLog.push(...e),e}absorbVertex(e,t){for(let n of[...this.graph.vertex(e).edges]){let s=this.graph.edge(n),r=this.graph.otherEnd(s,e);r!==t&&this.graph.edgeBetween(t,r)===void 0&&this.graph.addEdge(t,r),this.graph.removeEdge(n)}}};var Gf={x:0,y:0,z:1},Wf=5e3,Xf=.5,sa=class{constructor(){ge(this,"target",{x:0,y:0,z:0});ge(this,"yaw",-Math.PI/4);ge(this,"pitch",Math.PI/6);ge(this,"halfH",300);ge(this,"projection","ortho");ge(this,"fovY",50*Math.PI/180)}eyeDir(){let e=Math.cos(this.pitch);return{x:e*Math.cos(this.yaw),y:e*Math.sin(this.yaw),z:Math.sin(this.pitch)}}eyeDist(){return this.projection==="persp"?this.halfH/Math.tan(this.fovY/2):Wf}eye(){return Ve(this.target,ze(this.eyeDir(),this.eyeDist()))}forward(){return ze(this.eyeDir(),-1)}right(){return Bi(qt(this.forward(),Gf))}up(){return qt(this.right(),this.forward())}viewDirAt(e){return this.projection!=="persp"?this.eyeDir():Bi(Fe(this.eye(),e))}orbit(e,t){this.yaw-=e*.008,this.pitch=Math.max(-1.55,Math.min(1.55,this.pitch+t*.008))}pan(e,t,n){let s=2*this.halfH/n.h;this.target=Ve(this.target,Ve(ze(this.right(),-e*s),ze(this.up(),t*s)))}zoomBy(e){this.halfH=Math.max(1,Math.min(1e5,this.halfH*e))}zoomAt(e,t,n,s){let r=(t/s.w*2-1)*this.halfW(s),a=(1-n/s.h*2)*this.halfH,o=Ve(Ve(this.target,ze(this.right(),r)),ze(this.up(),a)),c=this.halfH;this.zoomBy(e);let l=this.halfH/c;this.target=Ve(o,ze(Fe(this.target,o),l))}halfW(e){return this.halfH*e.w/e.h}worldToScreen(e,t){if(this.projection==="persp"){let a=Fe(e,this.eye()),o=Math.max(ie(a,this.forward()),Xf),c=Math.tan(this.fovY/2),l=ie(a,this.right())/(o*c*(t.w/t.h)),h=ie(a,this.up())/(o*c);return{x:(l*.5+.5)*t.w,y:(.5-h*.5)*t.h}}let n=Fe(e,this.target),s=ie(n,this.right())/this.halfW(t),r=ie(n,this.up())/this.halfH;return{x:(s*.5+.5)*t.w,y:(.5-r*.5)*t.h}}screenRay(e,t,n){if(this.projection==="persp"){let o=Math.tan(this.fovY/2),c=(e/n.w*2-1)*o*(n.w/n.h),l=(1-t/n.h*2)*o,h=Bi(Ve(Ve(this.forward(),ze(this.right(),c)),ze(this.up(),l)));return{origin:this.eye(),dir:h}}let s=(e/n.w*2-1)*this.halfW(n),r=(1-t/n.h*2)*this.halfH;return{origin:Ve(Ve(this.eye(),ze(this.right(),s)),ze(this.up(),r)),dir:this.forward()}}setView(e){switch(e){case"iso":this.yaw=-Math.PI/4,this.pitch=.61;break;case"top":this.yaw=-Math.PI/2,this.pitch=1.55;break;case"front":this.yaw=-Math.PI/2,this.pitch=0;break;case"back":this.yaw=Math.PI/2,this.pitch=0;break;case"right":this.yaw=0,this.pitch=0;break;case"left":this.yaw=Math.PI,this.pitch=0;break}}fitPoints(e,t,n=220){if(!e.length){this.target={x:0,y:0,z:0},this.halfH=n;return}let s=0,r=0,a=0;for(let u of e)s+=u.x,r+=u.y,a+=u.z;this.target={x:s/e.length,y:r/e.length,z:a/e.length};let o=this.right(),c=this.up(),l=0,h=0;for(let u of e){let f=Fe(u,this.target);l=Math.max(l,Math.abs(ie(f,o))),h=Math.max(h,Math.abs(ie(f,c)))}let d=t.w/t.h;this.halfH=Math.max(10,Math.max(h,l/d)*1.25)}};function zi(i,e,t,n){let s=ie(t,e);if(Math.abs(s)<1e-9)return null;let r=(n-ie(t,i))/s;return Ve(i,ze(e,r))}function ra(i,e,t,n){let s=ie(e,n),r=1-s*s;if(Math.abs(r)<1e-9)return null;let a=Fe(t,i),o=(ie(a,e)-s*ie(a,n))/r;return Ve(i,ze(e,o))}var ui={endpoint:90,origin:80,midpoint:70,intersection:65,edge:60,cross:55,axisLine:45,plane:10},$n={point:10,edge:7,line:3.5,combo:12},qf=24,Yf=800,Vi=i=>i.h/Yf,ru=1e-5;function $f(i,e){let t=ie(i.dir,e.dir),n=1-t*t;if(Math.abs(n)<1e-9)return null;let s=Fe(i.a,e.a),r=ie(i.dir,s),a=ie(e.dir,s),o=(t*a-r)/n,c=(a-t*r)/n;if(i.len!==void 0&&(o<-1e-9||o>i.len+1e-9)||e.len!==void 0&&(c<-1e-9||c>e.len+1e-9))return null;let l={x:i.a.x+i.dir.x*o,y:i.a.y+i.dir.y*o,z:i.a.z+i.dir.z*o},h={x:e.a.x+e.dir.x*c,y:e.a.y+e.dir.y*c,z:e.a.z+e.dir.z*c};return bt(l,h)>ru?null:e.len!==void 0?h:l}function Kf(i,e,t,n){let{cam:s,vp:r}=i,a=n?.comboEps??$n.combo,o=s.screenRay(e.x,e.y,r),c=g=>s.worldToScreen(g,r),l=g=>{let p=c(g);return Math.hypot(p.x-e.x,p.y-e.y)},h=(g,p,b)=>{let E=c(g),v=c(b!==void 0?{x:g.x+p.x*b,y:g.y+p.y*b,z:g.z+p.z*b}:{x:g.x+p.x*100,y:g.y+p.y*100,z:g.z+p.z*100}),A=v.x-E.x,M=v.y-E.y,w=A*A+M*M;if(w===0)return Math.hypot(e.x-E.x,e.y-E.y);if(b!==void 0){let x=((e.x-E.x)*A+(e.y-E.y)*M)/w;return x=Math.max(0,Math.min(1,x)),Math.hypot(e.x-(E.x+x*A),e.y-(E.y+x*M))}return Math.abs((e.x-E.x)*M-(e.y-E.y)*A)/Math.sqrt(w)},d=[],u=[],f=n?.hidden;for(let g of t){let p=g.locus;if(p.dim===0){let b=l(p.p);b<=g.eps&&!(f&&f(p.p))&&d.push({p:p.p,dim:0,rank:g.rank,d:b,used:[g]})}else if(p.dim===1){let b=h(p.a,p.dir,p.len);if(b>g.eps)continue;let E=ra(p.a,p.dir,o.origin,o.dir);if(!E)continue;let v=ie(Fe(E,p.a),p.dir);p.len!==void 0&&(v=Math.max(0,Math.min(p.len,v)));let A=b;if(n?.spans1D){let w=p.len!==void 0?0:Math.abs(v)+1e5,x=p.len!==void 0?0:v-w,T=p.len!==void 0?p.len:v+w,R=n.spans1D(p.a,p.dir,x,T),C=null;for(let D of R)if(v>D[0]+1e-9&&v<D[1]-1e-9){C=D;break}if(C){let D=[C[0],C[1]].filter(V=>V>x+1e-9&&V<T-1e-9);if(!D.length)continue;v=D.reduce((V,F)=>Math.abs(F-v)<Math.abs(V-v)?F:V);let I={x:p.a.x+p.dir.x*v,y:p.a.y+p.dir.y*v,z:p.a.z+p.dir.z*v};if(A=l(I),A>g.eps)continue}}else if(f){let w={x:p.a.x+p.dir.x*v,y:p.a.y+p.dir.y*v,z:p.a.z+p.dir.z*v};if(f(w))continue}let M={x:p.a.x+p.dir.x*v,y:p.a.y+p.dir.y*v,z:p.a.z+p.dir.z*v};d.push({p:M,dim:1,rank:g.rank,d:A,used:[g]}),u.push({c:g,l:p})}else{let b=zi(o.origin,o.dir,p.plane.n,p.plane.d);b&&d.push({p:b,dim:2,rank:g.rank,d:0,used:[g]})}}for(let g=0;g<u.length;g++)for(let p=g+1;p<u.length;p++){let b=$f(u[g].l,u[p].l);if(!b||f&&f(b))continue;let E=l(b);E>a||d.push({p:b,dim:0,rank:Math.max(u[g].c.rank,u[p].c.rank),d:E,used:[u[g].c,u[p].c]})}if(!d.length)return null;let m={endpoint:0,origin:0,midpoint:0,axis:1,align:2,"edge-align":3,edge:4},_=g=>{let p=g.used[0]?.tag;return`${m[p?.kind??""]??9}|${p?.kind??""}|${p?.axis??""}|${p?.src?At(p.src):""}`};return d.sort((g,p)=>g.dim-p.dim||p.rank-g.rank||Math.round(g.d*2)-Math.round(p.d*2)||(_(g)<_(p)?-1:_(g)>_(p)?1:0)),d[0]}var zc={has:()=>!1,opaque:!1},Zf=[{axis:"x",dir:{x:1,y:0,z:0}},{axis:"y",dir:{x:0,y:1,z:0}},{axis:"z",dir:{x:0,y:0,z:1}}];function Jf(i,e,t){return t?[...sn(i.graph,e.outer),...e.holes.flatMap(n=>sn(i.graph,n))].some(n=>t.has(n)):!1}function au(i,e,t){return t?t.faces?t.faces(e.id):Jf(i,e,t):!1}function ou(i,e){if(!e||e.opaque)return;let t=new Set;for(let n of i.faces())au(i,n,e)&&t.add(n.id);return t.size?n=>t.has(n):void 0}function jf(i,e){let t=i.edges(),n=new Map,s=l=>{let h=l;for(;n.has(h)&&n.get(h)!==h;)h=n.get(h);return h},r=(l,h)=>{let d=s(l),u=s(h);d!==u&&n.set(d,u)},a=new Map;for(let l of t)for(let h of[l.a,l.b]){if(!e(h))continue;let d=a.get(h);d?d.push(l):a.set(h,[l])}for(let[l,h]of a){let d=i.graph.pt(l),u=h.map(m=>{let _=i.graph.pt(m.a===l?m.b:m.a),g=Fe(_,d),p=bt(_,d);return p>0?ze(g,1/p):null}),f=new Set;for(let m=0;m<h.length;m++)if(!(f.has(m)||!u[m])){for(let _=m+1;_<h.length;_++)if(!(f.has(_)||!u[_])&&ie(u[m],u[_])<-(1-1e-9)){r(h[m].id,h[_].id),f.add(m),f.add(_);break}}}let o=new Map;for(let l of t){let h=s(l.id),d=o.get(h);d?d.push(l):o.set(h,[l])}let c=[];for(let l of o.values()){let h=new Map;for(let u of l)for(let f of[u.a,u.b])h.set(f,(h.get(f)??0)+1);let d=[...h].filter(([,u])=>u===1).map(([u])=>u);d.length===2&&(e(d[0])||e(d[1])||c.push({a:i.graph.pt(d[0]),b:i.graph.pt(d[1])}))}return c}function Hs(i,e,t,n){let s=e.viewDirAt(t);for(let r of i.faces()){if(n?.(r.id))continue;let a=i.planeOf(r.id),o=i.face(r.id);if(!a||!o)continue;let c=ie(a.plane.n,s);if(Math.abs(c)<1e-9)continue;let l=(a.plane.d-ie(a.plane.n,t))/c;if(l<=1e-4)continue;let h=Ve(t,ze(s,l)),d={x:ie(h,a.basis.u),y:ie(h,a.basis.v)};if(Et(d,o.outer.pts)&&!o.holes.some(u=>Et(d,u.pts)))return!0}return!1}function Qf(i,e,t,n,s,r,a){let o=e.viewDirAt(Ve(t,ze(n,(s+r)/2))),c=[];for(let h of i.faces()){if(a?.(h.id))continue;let d=i.planeOf(h.id),u=i.face(h.id);if(!d||!u)continue;let f=d.plane.n,m=d.plane.d,_=ie(f,o);if(Math.abs(_)<1e-9)continue;let g=(m-ie(f,t))/_,p=-ie(f,n)/_,{u:b,v:E}=d.basis,v=ie(t,b)+g*ie(o,b),A=ie(n,b)+p*ie(o,b),M=ie(t,E)+g*ie(o,E),w=ie(n,E)+p*ie(o,E),x=[s,r];Math.abs(p)>1e-12&&x.push((1e-4-g)/p);for(let R of[u.outer.pts,...u.holes.map(C=>C.pts)])for(let C=0;C<R.length;C++){let D=R[C],I=R[(C+1)%R.length],V=I.x-D.x,F=I.y-D.y,X=-A*F+w*V;if(Math.abs(X)<1e-12)continue;let B=D.x-v,$=D.y-M,J=(-B*F+$*V)/X,ne=(A*$-w*B)/X;ne>=-1e-9&&ne<=1+1e-9&&x.push(J)}let T=x.filter(R=>R>=s-1e-9&&R<=r+1e-9).sort((R,C)=>R-C);for(let R=0;R+1<T.length;R++){let C=T[R],D=T[R+1];if(D-C<1e-9)continue;let I=(C+D)/2;if(g+p*I<=1e-4)continue;let V={x:v+A*I,y:M+w*I};Et(V,u.outer.pts)&&(u.holes.some(F=>Et(V,F.pts))||c.push([C,D]))}}c.sort((h,d)=>h[0]-d[0]);let l=[];for(let h of c){let d=l[l.length-1];d&&h[0]<=d[1]+1e-9?d[1]=Math.max(d[1],h[1]):l.push([h[0],h[1]])}return l}function ep(i){let e=[],{k:t}=i,n=h=>i.hand?.has(h)??!1,s=ou(t,i.hand),r=h=>i.cam?Hs(t,i.cam,h,s):!1;for(let h of t.vertices()){if(n(h.id))continue;let d={x:h.x,y:h.y,z:h.z};r(d)||e.push({locus:{dim:0,p:d},rank:ui.endpoint,eps:$n.point,tag:{kind:"endpoint"}})}r({x:0,y:0,z:0})||e.push({locus:{dim:0,p:{x:0,y:0,z:0}},rank:ui.origin,eps:$n.point,tag:{kind:"origin"}});let a=jf(t,n);for(let{a:h,b:d}of a){let u=bt(h,d);if(u<=0)continue;let f={x:(h.x+d.x)/2,y:(h.y+d.y)/2,z:(h.z+d.z)/2};r(f)||e.push({locus:{dim:0,p:f},rank:ui.midpoint,eps:$n.point,tag:{kind:"midpoint"}}),e.push({locus:{dim:1,a:h,dir:ze(Fe(d,h),1/u),len:u},rank:ui.edge,eps:$n.edge,tag:{kind:"edge"}})}let o=[...Zf];if(i.basis){let h=d=>Math.abs(d.x)>.999||Math.abs(d.y)>.999||Math.abs(d.z)>.999;h(i.basis.u)||o.push({axis:"u",dir:i.basis.u}),h(i.basis.v)||o.push({axis:"v",dir:i.basis.v})}let c=new Set,l=(h,d)=>{let u=At(h);if(!c.has(u)){c.add(u);for(let{axis:f,dir:m}of o)e.push({locus:{dim:1,a:h,dir:m},rank:ui.axisLine,eps:$n.line,tag:{kind:d,src:h,axis:f}})}};if(i.lines!==!1){i.anchor&&l(i.anchor,"axis"),l({x:0,y:0,z:0},"align");for(let h of i.alignSources??[])l(h,"align")}{let h=a.map(({a:d,b:u})=>{let f=bt(d,u);return f>0?{a:d,dir:ze(Fe(u,d),1/f),ea:d,eb:u}:null}).filter(d=>d!==null);for(let d=0;d<h.length;d++)for(let u=d+1;u<h.length;u++){let f=tp(h[d],h[u]);f&&([h[d].ea,h[d].eb,h[u].ea,h[u].eb].some(m=>bt(f,m)<=1e-6)||r(f)||e.push({locus:{dim:0,p:f},rank:ui.intersection,eps:$n.point,tag:{kind:"intersection"}}))}}{let h=t.faces().filter(d=>!au(t,d,i.hand));for(let d=0;d<h.length;d++)for(let u=d+1;u<h.length;u++)for(let f of np(t,h[d].id,h[u].id))e.push({locus:{dim:1,a:f.a,dir:f.dir,len:f.len},rank:ui.cross,eps:$n.line,tag:{kind:"cross"}})}return e.push({locus:{dim:2,plane:i.plane},rank:ui.plane,eps:1/0,tag:{kind:"plane"}}),e}function tp(i,e){let t=ie(i.dir,e.dir),n=1-t*t;if(Math.abs(n)<1e-9)return null;let s=Fe(i.a,e.a),r=ie(i.dir,s),a=ie(e.dir,s),o=(t*a-r)/n,c=(a-t*r)/n,l={x:i.a.x+i.dir.x*o,y:i.a.y+i.dir.y*o,z:i.a.z+i.dir.z*o},h={x:e.a.x+e.dir.x*c,y:e.a.y+e.dir.y*c,z:e.a.z+e.dir.z*c};return bt(l,h)>ru?null:l}function su(i,e,t){let n=[];for(let r of t)for(let a=0;a<r.length;a++){let o=r[a],c=r[(a+1)%r.length],l=c.x-o.x,h=c.y-o.y,d=l*e.y-h*e.x;if(Math.abs(d)<1e-12)continue;let u=((i.x-o.x)*e.y-(i.y-o.y)*e.x)/d;if(u<0||u>=1)continue;let f=Math.abs(e.x)>Math.abs(e.y)?(o.x+u*l-i.x)/e.x:(o.y+u*h-i.y)/e.y;n.push(f)}n.sort((r,a)=>r-a);let s=[];for(let r=0;r+1<n.length;r+=2)s.push([n[r],n[r+1]]);return s}function np(i,e,t){let n=i.planeOf(e),s=i.planeOf(t),r=i.face(e),a=i.face(t);if(!n||!s||!r||!a)return[];let o=qt(n.plane.n,s.plane.n),c=ie(o,o);if(c<1e-12)return[];let l=ze(Ve(ze(qt(s.plane.n,o),n.plane.d),ze(qt(o,n.plane.n),s.plane.d)),1/c),h=ze(o,1/Math.sqrt(c)),d=p=>({p2:{x:ie(l,p.basis.u),y:ie(l,p.basis.v)},d2:{x:ie(h,p.basis.u),y:ie(h,p.basis.v)}}),u=d(n),f=d(s),m=su(u.p2,u.d2,[r.outer.pts,...r.holes.map(p=>p.pts)]),_=su(f.p2,f.d2,[a.outer.pts,...a.holes.map(p=>p.pts)]),g=[];for(let[p,b]of m)for(let[E,v]of _){let A=Math.max(p,E),M=Math.min(b,v);M-A<1e-9||g.push({a:{x:l.x+h.x*A,y:l.y+h.y*A,z:l.z+h.z*A},dir:h,len:M-A})}return g}function gn(i,e,t,n,s,r,a){let o=r/8,c=ou(i,a.hand),l=m=>Hs(i,e,m,c),h=ep({k:i,plane:a.plane.plane,basis:a.plane.basis,anchor:a.anchor,alignSources:a.alignSources,cam:e,lines:a.lines,hand:a.hand});if(o!==1)for(let m of h)m.eps!==1/0&&(m.eps*=o);let d=Kf({cam:e,vp:t},{x:n,y:s},h,{comboEps:$n.combo*o,hidden:l,spans1D:(m,_,g,p)=>Qf(i,e,m,_,g,p,c)});if(!d)return{p:a.anchor??{x:0,y:0,z:0},kind:null};let u=[];for(let m of d.used)if(m.locus.dim===1&&(m.tag.kind==="axis"||m.tag.kind==="align")&&m.tag.src&&m.tag.axis)u.push({a:m.tag.src,b:d.p,axis:m.tag.axis});else if(m.locus.dim===1&&m.tag.kind==="cross"&&m.locus.len!==void 0){let _=m.locus;u.push({a:_.a,b:{x:_.a.x+_.dir.x*_.len,y:_.a.y+_.dir.y*_.len,z:_.a.z+_.dir.z*_.len},axis:"i"})}let f;if(d.used.length===2)f=d.used.some(m=>m.tag.kind==="edge")?"edge-align":"align-combo";else{let m=d.used[0].tag;f=m.kind==="endpoint"?"endpoint":m.kind==="origin"?"origin":m.kind==="midpoint"?"midpoint":m.kind==="intersection"?"intersection":m.kind==="cross"?"cross-line":m.kind==="edge"?"on-edge":m.kind==="axis"?m.axis==="u"||m.axis==="v"?"align":"axis-"+m.axis:m.kind==="align"?"align":m.kind==="plane"&&rp(i,a.plane,d.p)?"on-face":null}return u.length?{p:d.p,kind:f,hints:u}:{p:d.p,kind:f}}var ip=[{x:0,y:0,z:1},{x:0,y:1,z:0},{x:1,y:0,z:0}];function sp(i,e){let t=ks(i,ie(i,e));return{plane:t,basis:as(t)}}var Bc=i=>ip.map(e=>sp(e,i));function aa(i,e){let t=i.forward();if(Math.abs(t.z)>=.34){let n=e.find(s=>Math.abs(s.plane.n.z)>.999);if(n)return n}return e.reduce((n,s)=>Math.abs(ie(s.plane.n,t))>Math.abs(ie(n.plane.n,t))?s:n)}function cu(i){return aa(i,Bc({x:0,y:0,z:0}))}function rp(i,e,t){if(e.face===void 0)return!1;let n=i.face(e.face);if(!n)return!1;let s={x:ie(t,e.basis.u),y:ie(t,e.basis.v)};return Et(s,n.outer.pts)?!n.holes.some(r=>Et(s,r.pts)):!1}function ap(i,e,t,n,s){let r=e.screenRay(n,s,t),a=null;for(let o of i.faces()){let c=i.planeOf(o.id);if(!c)continue;let l=ie(c.plane.n,r.dir);if(Math.abs(l)<1e-9)continue;let h=(c.plane.d-ie(c.plane.n,r.origin))/l;if(h<=0||a&&h>=a.t)continue;let d=Ve(r.origin,ze(r.dir,h)),u={x:ie(d,c.basis.u),y:ie(d,c.basis.v)};Et(u,o.outer.pts)&&(o.holes.some(f=>Et(u,f.pts))||(a={t:h,plane:{plane:c.plane,basis:c.basis,face:o.id}}))}return a?.plane??null}function op(i,e,t,n,s,r,a){let o=null;for(let c of i.faces()){let l=i.planeOf(c.id);if(!l||Qt(r,l.plane)>.001)continue;let h=i.faceRings3(c.id)?.outer;if(!h||h.length<3)continue;let d=h.map(f=>e.worldToScreen(f,t)),u=0;if(!Et({x:n,y:s},d)){u=1/0;for(let f=0;f<d.length;f++){let m=d[f],_=d[(f+1)%d.length],g=_.x-m.x,p=_.y-m.y,b=g*g+p*p,E=b>0?Math.max(0,Math.min(1,((n-m.x)*g+(s-m.y)*p)/b)):0;u=Math.min(u,Math.hypot(n-(m.x+E*g),s-(m.y+E*p)))}}u<=a&&(!o||u<o.d)&&(o={d:u,plane:{plane:l.plane,basis:l.basis,face:c.id}})}return o?.plane??null}function oa(i,e,t,n,s,r,a){let{p1:o,facePlane:c,alignSources:l,hand:h}=a;if(o){let f=ap(i,e,t,n,s);if(f&&Qt(o,f.plane)<=.001){let E=gn(i,e,t,n,s,r,{plane:f,anchor:o,alignSources:l,hand:h});return{plane:f,fixed:!1,snap:E}}let m=op(i,e,t,n,s,o,qf*Vi(t));if(m){let E=gn(i,e,t,n,s,r,{plane:m,anchor:o,alignSources:l,hand:h});return{plane:m,fixed:!1,snap:E}}let _=Bc(o),g=aa(e,_),p=gn(i,e,t,n,s,r,{plane:g,anchor:o,alignSources:l,hand:h}),b=_.filter(E=>Qt(p.p,E.plane)<=.001);return{plane:b.length?aa(e,b):g,fixed:!1,snap:p}}let d=c??cu(e),u=gn(i,e,t,n,s,r,{plane:d,alignSources:l,hand:h});return u.kind===null||u.kind==="on-face"?{plane:d,fixed:!!c,snap:u}:{plane:aa(e,Bc(u.p)),fixed:!1,snap:u}}function ca(i,e,t,n,s,r,a,o,c){let l=oa(i,e,t,s,r,a,{p1:n,alignSources:o,hand:c});return{plane:l.plane,snap:l.snap}}var kc=(()=>{let i=ks({x:0,y:0,z:1},0);return{plane:i,basis:as(i)}})(),Vc=(i,e)=>Math.hypot(i.x-e.x,i.y-e.y);function cp(i,e,t){let n=(t.x-e.x)**2+(t.y-e.y)**2;return n===0?0:Math.max(0,Math.min(1,((i.x-e.x)*(t.x-e.x)+(i.y-e.y)*(t.y-e.y))/n))}function lp(i,e,t){let n=(t.x-e.x)**2+(t.y-e.y)**2;if(n===0)return Vc(i,e);let s=((i.x-e.x)*(t.x-e.x)+(i.y-e.y)*(t.y-e.y))/n;return s=Math.max(0,Math.min(1,s)),Vc(i,{x:e.x+s*(t.x-e.x),y:e.y+s*(t.y-e.y)})}function Kn(i,e,t,n,s,r,a=i){let o={x:n,y:s},c,l=r;for(let f of i.vertices()){let m={x:f.x,y:f.y,z:f.z},_=Vc(o,e.worldToScreen(m,t));_<=l&&!Hs(a,e,m)&&(l=_,c=f.id)}if(c!==void 0)return{vertex:c};let h,d=r;for(let f of i.edges()){let m=i.graph.pt(f.a),_=i.graph.pt(f.b),g=e.worldToScreen(m,t),p=e.worldToScreen(_,t),b=lp(o,g,p);if(b>d)continue;let E=cp(o,g,p),v={x:m.x+E*(_.x-m.x),y:m.y+E*(_.y-m.y),z:m.z+E*(_.z-m.z)};Hs(a,e,v)||(d=b,h=f.id)}if(h!==void 0)return{edge:h};let u=Gs(i,e,t,n,s);return u!==void 0?{face:u}:{}}function Gs(i,e,t,n,s){let r=e.screenRay(n,s,t),a,o=1/0;for(let c of i.faces()){let l=i.planeOf(c.id);if(!l)continue;let h=zi(r.origin,r.dir,l.plane.n,l.plane.d);if(!h)continue;let d=mn(h,l.basis);if(!Et(d,c.outer.pts)||c.holes.some(f=>Et(d,f.pts)))continue;let u=ie(Fe(h,r.origin),r.dir);u<o&&(o=u,a=c.id)}return a}function Hc(i,e,t,n,s){let r=Kn(i,e,t,n,s,.5);if(r.face!==void 0){let a=i.planeOf(r.face);return{plane:a.plane,basis:a.basis,face:r.face}}return kc}function Gc(i,e,t,n,s,r,a){let o=Kn(i,e,t,n,s,.5),c=null;if(o.face!==void 0){let h=i.planeOf(o.face);c={plane:h.plane,basis:h.basis,face:o.face}}let l=oa(i,e,t,n,s,r,{facePlane:c,alignSources:a,hand:zc});return{fixed:l.fixed?l.plane:null,plane:l.plane,snap:l.snap}}function lu(i,e,t,n){let s=a=>a.x>=n.minX&&a.x<=n.maxX&&a.y>=n.minY&&a.y<=n.maxY,r={edges:new Set,faces:new Set};for(let a of i.edges())s(e.worldToScreen(i.graph.pt(a.a),t))&&s(e.worldToScreen(i.graph.pt(a.b),t))&&r.edges.add(a.id);for(let a of i.faces()){let o=i.faceRings3(a.id);o&&o.outer.every(c=>s(e.worldToScreen(c,t)))&&r.faces.add(a.id)}return r}function Wc(i,e,t,n){let s=mn(t,e),r=mn(n,e);if(Math.abs(s.x-r.x)<1e-9||Math.abs(s.y-r.y)<1e-9)return[];let a=(d,u)=>$h({x:d,y:u},i,e),o=a(s.x,s.y),c=a(r.x,s.y),l=a(r.x,r.y),h=a(s.x,r.y);return[[o,c],[c,l],[l,h],[h,o]]}var Dn=()=>({edges:new Set,faces:new Set});function Xc(i,e){if(e.vertex!==void 0)return[e.vertex];if(e.edge!==void 0){let t=i.graph.edge(e.edge);return[t.a,t.b]}if(e.face!==void 0){let t=i.face(e.face);if(!t)return[];let n=new Set;for(let s of[t.outer,...t.holes])for(let r of s.edges){let a=i.graph.edge(r.edge);n.add(a.a),n.add(a.b)}return[...n]}return[]}function qc(i,e,t){return e.filter(n=>i.graph.hasVertex(n)).map(n=>{let s=i.graph.pt(n);return{id:n,to:{x:s.x+t.x,y:s.y+t.y,z:s.z+(t.z??0)}}})}function hu(i,e){let t=new Set;for(let n of e.edges){if(!i.graph.hasEdge(n))continue;let s=i.graph.edge(n);t.add(s.a),t.add(s.b)}for(let n of e.faces)for(let s of Xc(i,{face:n}))t.add(s);return[...t]}var To="185";var Gu=0,Cl=1,Wu=2;var Ir=1,Xu=2,Ls=3,ni=0,Kt=1,_n=2,Hn=0,Yi=1,Rl=2,Il=3,Ll=4,qu=5;var vi=100,Yu=101,$u=102,Ku=103,Zu=104,Ju=200,ju=201,Qu=202,ed=203,Ua=204,Na=205,td=206,nd=207,id=208,sd=209,rd=210,ad=211,od=212,cd=213,ld=214,Oa=0,Ba=1,za=2,$i=3,Va=4,ka=5,Ha=6,Ga=7,Dl=0,hd=1,ud=2,An=0,Fl=1,Ul=2,Nl=3,Ol=4,Bl=5,zl=6,Vl=7;var kl=300,Pi=301,ji=302,Ao=303,Po=304,Lr=306,Wa=1e3,Nn=1001,Xa=1002,Dt=1003,dd=1004;var Dr=1005;var Ut=1006,Co=1007;var Ci=1008;var fn=1009,Hl=1010,Gl=1011,Ds=1012,Ro=1013,Pn=1014,Cn=1015,Gn=1016,Io=1017,Lo=1018,Fs=1020,Wl=35902,Xl=35899,ql=1021,Yl=1022,yn=1023,zn=1026,Ri=1027,$l=1028,Do=1029,Ii=1030,Fo=1031;var Uo=1033,Fr=33776,Ur=33777,Nr=33778,Or=33779,No=35840,Oo=35841,Bo=35842,zo=35843,Vo=36196,ko=37492,Ho=37496,Go=37488,Wo=37489,Br=37490,Xo=37491,qo=37808,Yo=37809,$o=37810,Ko=37811,Zo=37812,Jo=37813,jo=37814,Qo=37815,ec=37816,tc=37817,nc=37818,ic=37819,sc=37820,rc=37821,ac=36492,oc=36494,cc=36495,lc=36283,hc=36284,zr=36285,uc=36286;var er=2300,qa=2301,Fa=2302,yl=2303,vl=2400,bl=2401,Sl=2402;var fd=3200;var Kl=0,pd=1,si="",on="srgb",tr="srgb-linear",nr="linear",je="srgb";var Xi=7680;var Ml=519,md=512,gd=513,xd=514,dc=515,_d=516,yd=517,fc=518,vd=519,Ya=35044;var Zl="300 es",En=2e3,ir=2001;function hp(i){for(let e=i.length-1;e>=0;--e)if(i[e]>=65535)return!0;return!1}function up(i){return ArrayBuffer.isView(i)&&!(i instanceof DataView)}function sr(i){return document.createElementNS("http://www.w3.org/1999/xhtml",i)}function bd(){let i=sr("canvas");return i.style.display="block",i}var uu={},Ms=null;function rr(...i){let e="THREE."+i.shift();Ms?Ms("log",e,...i):console.log(e,...i)}function Sd(i){let e=i[0];if(typeof e=="string"&&e.startsWith("TSL:")){let t=i[1];t&&t.isStackTrace?i[0]+=" "+t.getLocation():i[1]='Stack trace not available. Enable "THREE.Node.captureStackTrace" to capture stack traces.'}return i}function Pe(...i){i=Sd(i);let e="THREE."+i.shift();if(Ms)Ms("warn",e,...i);else{let t=i[0];t&&t.isStackTrace?console.warn(t.getError(e)):console.warn(e,...i)}}function Ie(...i){i=Sd(i);let e="THREE."+i.shift();if(Ms)Ms("error",e,...i);else{let t=i[0];t&&t.isStackTrace?console.error(t.getError(e)):console.error(e,...i)}}function qi(...i){let e=i.join(" ");e in uu||(uu[e]=!0,Pe(...i))}function Md(i,e,t){return new Promise(function(n,s){function r(){switch(i.clientWaitSync(e,i.SYNC_FLUSH_COMMANDS_BIT,0)){case i.WAIT_FAILED:s();break;case i.TIMEOUT_EXPIRED:setTimeout(r,t);break;default:n()}}setTimeout(r,t)})}var Ed={[Oa]:Ba,[za]:Ha,[Va]:Ga,[$i]:ka,[Ba]:Oa,[Ha]:za,[Ga]:Va,[ka]:$i},Vn=class{addEventListener(e,t){this._listeners===void 0&&(this._listeners={});let n=this._listeners;n[e]===void 0&&(n[e]=[]),n[e].indexOf(t)===-1&&n[e].push(t)}hasEventListener(e,t){let n=this._listeners;return n===void 0?!1:n[e]!==void 0&&n[e].indexOf(t)!==-1}removeEventListener(e,t){let n=this._listeners;if(n===void 0)return;let s=n[e];if(s!==void 0){let r=s.indexOf(t);r!==-1&&s.splice(r,1)}}dispatchEvent(e){let t=this._listeners;if(t===void 0)return;let n=t[e.type];if(n!==void 0){e.target=this;let s=n.slice(0);for(let r=0,a=s.length;r<a;r++)s[r].call(this,e);e.target=null}}},Ht=["00","01","02","03","04","05","06","07","08","09","0a","0b","0c","0d","0e","0f","10","11","12","13","14","15","16","17","18","19","1a","1b","1c","1d","1e","1f","20","21","22","23","24","25","26","27","28","29","2a","2b","2c","2d","2e","2f","30","31","32","33","34","35","36","37","38","39","3a","3b","3c","3d","3e","3f","40","41","42","43","44","45","46","47","48","49","4a","4b","4c","4d","4e","4f","50","51","52","53","54","55","56","57","58","59","5a","5b","5c","5d","5e","5f","60","61","62","63","64","65","66","67","68","69","6a","6b","6c","6d","6e","6f","70","71","72","73","74","75","76","77","78","79","7a","7b","7c","7d","7e","7f","80","81","82","83","84","85","86","87","88","89","8a","8b","8c","8d","8e","8f","90","91","92","93","94","95","96","97","98","99","9a","9b","9c","9d","9e","9f","a0","a1","a2","a3","a4","a5","a6","a7","a8","a9","aa","ab","ac","ad","ae","af","b0","b1","b2","b3","b4","b5","b6","b7","b8","b9","ba","bb","bc","bd","be","bf","c0","c1","c2","c3","c4","c5","c6","c7","c8","c9","ca","cb","cc","cd","ce","cf","d0","d1","d2","d3","d4","d5","d6","d7","d8","d9","da","db","dc","dd","de","df","e0","e1","e2","e3","e4","e5","e6","e7","e8","e9","ea","eb","ec","ed","ee","ef","f0","f1","f2","f3","f4","f5","f6","f7","f8","f9","fa","fb","fc","fd","fe","ff"],du=1234567,Zs=Math.PI/180,Es=180/Math.PI;function Bn(){let i=Math.random()*4294967295|0,e=Math.random()*4294967295|0,t=Math.random()*4294967295|0,n=Math.random()*4294967295|0;return(Ht[i&255]+Ht[i>>8&255]+Ht[i>>16&255]+Ht[i>>24&255]+"-"+Ht[e&255]+Ht[e>>8&255]+"-"+Ht[e>>16&15|64]+Ht[e>>24&255]+"-"+Ht[t&63|128]+Ht[t>>8&255]+"-"+Ht[t>>16&255]+Ht[t>>24&255]+Ht[n&255]+Ht[n>>8&255]+Ht[n>>16&255]+Ht[n>>24&255]).toLowerCase()}function Ue(i,e,t){return Math.max(e,Math.min(t,i))}function Jl(i,e){return(i%e+e)%e}function dp(i,e,t,n,s){return n+(i-e)*(s-n)/(t-e)}function fp(i,e,t){return i!==e?(t-i)/(e-i):0}function Js(i,e,t){return(1-t)*i+t*e}function pp(i,e,t,n){return Js(i,e,1-Math.exp(-t*n))}function mp(i,e=1){return e-Math.abs(Jl(i,e*2)-e)}function gp(i,e,t){return i<=e?0:i>=t?1:(i=(i-e)/(t-e),i*i*(3-2*i))}function xp(i,e,t){return i<=e?0:i>=t?1:(i=(i-e)/(t-e),i*i*i*(i*(i*6-15)+10))}function _p(i,e){return i+Math.floor(Math.random()*(e-i+1))}function yp(i,e){return i+Math.random()*(e-i)}function vp(i){return i*(.5-Math.random())}function bp(i){i!==void 0&&(du=i);let e=du+=1831565813;return e=Math.imul(e^e>>>15,e|1),e^=e+Math.imul(e^e>>>7,e|61),((e^e>>>14)>>>0)/4294967296}function Sp(i){return i*Zs}function Mp(i){return i*Es}function Ep(i){return(i&i-1)===0&&i!==0}function wp(i){return Math.pow(2,Math.ceil(Math.log(i)/Math.LN2))}function Tp(i){return Math.pow(2,Math.floor(Math.log(i)/Math.LN2))}function Ap(i,e,t,n,s){let r=Math.cos,a=Math.sin,o=r(t/2),c=a(t/2),l=r((e+n)/2),h=a((e+n)/2),d=r((e-n)/2),u=a((e-n)/2),f=r((n-e)/2),m=a((n-e)/2);switch(s){case"XYX":i.set(o*h,c*d,c*u,o*l);break;case"YZY":i.set(c*u,o*h,c*d,o*l);break;case"ZXZ":i.set(c*d,c*u,o*h,o*l);break;case"XZX":i.set(o*h,c*m,c*f,o*l);break;case"YXY":i.set(c*f,o*h,c*m,o*l);break;case"ZYZ":i.set(c*m,c*f,o*h,o*l);break;default:Pe("MathUtils: .setQuaternionFromProperEuler() encountered an unknown order: "+s)}}function Mn(i,e){switch(e.constructor){case Float32Array:return i;case Uint32Array:return i/4294967295;case Uint16Array:return i/65535;case Uint8Array:return i/255;case Int32Array:return Math.max(i/2147483647,-1);case Int16Array:return Math.max(i/32767,-1);case Int8Array:return Math.max(i/127,-1);default:throw new Error("THREE.MathUtils: Invalid component type.")}}function et(i,e){switch(e.constructor){case Float32Array:return i;case Uint32Array:return Math.round(i*4294967295);case Uint16Array:return Math.round(i*65535);case Uint8Array:return Math.round(i*255);case Int32Array:return Math.round(i*2147483647);case Int16Array:return Math.round(i*32767);case Int8Array:return Math.round(i*127);default:throw new Error("THREE.MathUtils: Invalid component type.")}}var jl={DEG2RAD:Zs,RAD2DEG:Es,generateUUID:Bn,clamp:Ue,euclideanModulo:Jl,mapLinear:dp,inverseLerp:fp,lerp:Js,damp:pp,pingpong:mp,smoothstep:gp,smootherstep:xp,randInt:_p,randFloat:yp,randFloatSpread:vp,seededRandom:bp,degToRad:Sp,radToDeg:Mp,isPowerOfTwo:Ep,ceilPowerOfTwo:wp,floorPowerOfTwo:Tp,setQuaternionFromProperEuler:Ap,normalize:et,denormalize:Mn},sh=class sh{constructor(e=0,t=0){this.x=e,this.y=t}get width(){return this.x}set width(e){this.x=e}get height(){return this.y}set height(e){this.y=e}set(e,t){return this.x=e,this.y=t,this}setScalar(e){return this.x=e,this.y=e,this}setX(e){return this.x=e,this}setY(e){return this.y=e,this}setComponent(e,t){switch(e){case 0:this.x=t;break;case 1:this.y=t;break;default:throw new Error("THREE.Vector2: index is out of range: "+e)}return this}getComponent(e){switch(e){case 0:return this.x;case 1:return this.y;default:throw new Error("THREE.Vector2: index is out of range: "+e)}}clone(){return new this.constructor(this.x,this.y)}copy(e){return this.x=e.x,this.y=e.y,this}add(e){return this.x+=e.x,this.y+=e.y,this}addScalar(e){return this.x+=e,this.y+=e,this}addVectors(e,t){return this.x=e.x+t.x,this.y=e.y+t.y,this}addScaledVector(e,t){return this.x+=e.x*t,this.y+=e.y*t,this}sub(e){return this.x-=e.x,this.y-=e.y,this}subScalar(e){return this.x-=e,this.y-=e,this}subVectors(e,t){return this.x=e.x-t.x,this.y=e.y-t.y,this}multiply(e){return this.x*=e.x,this.y*=e.y,this}multiplyScalar(e){return this.x*=e,this.y*=e,this}divide(e){return this.x/=e.x,this.y/=e.y,this}divideScalar(e){return this.multiplyScalar(1/e)}applyMatrix3(e){let t=this.x,n=this.y,s=e.elements;return this.x=s[0]*t+s[3]*n+s[6],this.y=s[1]*t+s[4]*n+s[7],this}min(e){return this.x=Math.min(this.x,e.x),this.y=Math.min(this.y,e.y),this}max(e){return this.x=Math.max(this.x,e.x),this.y=Math.max(this.y,e.y),this}clamp(e,t){return this.x=Ue(this.x,e.x,t.x),this.y=Ue(this.y,e.y,t.y),this}clampScalar(e,t){return this.x=Ue(this.x,e,t),this.y=Ue(this.y,e,t),this}clampLength(e,t){let n=this.length();return this.divideScalar(n||1).multiplyScalar(Ue(n,e,t))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this}negate(){return this.x=-this.x,this.y=-this.y,this}dot(e){return this.x*e.x+this.y*e.y}cross(e){return this.x*e.y-this.y*e.x}lengthSq(){return this.x*this.x+this.y*this.y}length(){return Math.sqrt(this.x*this.x+this.y*this.y)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)}normalize(){return this.divideScalar(this.length()||1)}angle(){return Math.atan2(-this.y,-this.x)+Math.PI}angleTo(e){let t=Math.sqrt(this.lengthSq()*e.lengthSq());if(t===0)return Math.PI/2;let n=this.dot(e)/t;return Math.acos(Ue(n,-1,1))}distanceTo(e){return Math.sqrt(this.distanceToSquared(e))}distanceToSquared(e){let t=this.x-e.x,n=this.y-e.y;return t*t+n*n}manhattanDistanceTo(e){return Math.abs(this.x-e.x)+Math.abs(this.y-e.y)}setLength(e){return this.normalize().multiplyScalar(e)}lerp(e,t){return this.x+=(e.x-this.x)*t,this.y+=(e.y-this.y)*t,this}lerpVectors(e,t,n){return this.x=e.x+(t.x-e.x)*n,this.y=e.y+(t.y-e.y)*n,this}equals(e){return e.x===this.x&&e.y===this.y}fromArray(e,t=0){return this.x=e[t],this.y=e[t+1],this}toArray(e=[],t=0){return e[t]=this.x,e[t+1]=this.y,e}fromBufferAttribute(e,t){return this.x=e.getX(t),this.y=e.getY(t),this}rotateAround(e,t){let n=Math.cos(t),s=Math.sin(t),r=this.x-e.x,a=this.y-e.y;return this.x=r*n-a*s+e.x,this.y=r*s+a*n+e.y,this}random(){return this.x=Math.random(),this.y=Math.random(),this}*[Symbol.iterator](){yield this.x,yield this.y}};sh.prototype.isVector2=!0;var _e=sh,kn=class{constructor(e=0,t=0,n=0,s=1){this.isQuaternion=!0,this._x=e,this._y=t,this._z=n,this._w=s}static slerpFlat(e,t,n,s,r,a,o){let c=n[s+0],l=n[s+1],h=n[s+2],d=n[s+3],u=r[a+0],f=r[a+1],m=r[a+2],_=r[a+3];if(d!==_||c!==u||l!==f||h!==m){let g=c*u+l*f+h*m+d*_;g<0&&(u=-u,f=-f,m=-m,_=-_,g=-g);let p=1-o;if(g<.9995){let b=Math.acos(g),E=Math.sin(b);p=Math.sin(p*b)/E,o=Math.sin(o*b)/E,c=c*p+u*o,l=l*p+f*o,h=h*p+m*o,d=d*p+_*o}else{c=c*p+u*o,l=l*p+f*o,h=h*p+m*o,d=d*p+_*o;let b=1/Math.sqrt(c*c+l*l+h*h+d*d);c*=b,l*=b,h*=b,d*=b}}e[t]=c,e[t+1]=l,e[t+2]=h,e[t+3]=d}static multiplyQuaternionsFlat(e,t,n,s,r,a){let o=n[s],c=n[s+1],l=n[s+2],h=n[s+3],d=r[a],u=r[a+1],f=r[a+2],m=r[a+3];return e[t]=o*m+h*d+c*f-l*u,e[t+1]=c*m+h*u+l*d-o*f,e[t+2]=l*m+h*f+o*u-c*d,e[t+3]=h*m-o*d-c*u-l*f,e}get x(){return this._x}set x(e){this._x=e,this._onChangeCallback()}get y(){return this._y}set y(e){this._y=e,this._onChangeCallback()}get z(){return this._z}set z(e){this._z=e,this._onChangeCallback()}get w(){return this._w}set w(e){this._w=e,this._onChangeCallback()}set(e,t,n,s){return this._x=e,this._y=t,this._z=n,this._w=s,this._onChangeCallback(),this}clone(){return new this.constructor(this._x,this._y,this._z,this._w)}copy(e){return this._x=e.x,this._y=e.y,this._z=e.z,this._w=e.w,this._onChangeCallback(),this}setFromEuler(e,t=!0){let n=e._x,s=e._y,r=e._z,a=e._order,o=Math.cos,c=Math.sin,l=o(n/2),h=o(s/2),d=o(r/2),u=c(n/2),f=c(s/2),m=c(r/2);switch(a){case"XYZ":this._x=u*h*d+l*f*m,this._y=l*f*d-u*h*m,this._z=l*h*m+u*f*d,this._w=l*h*d-u*f*m;break;case"YXZ":this._x=u*h*d+l*f*m,this._y=l*f*d-u*h*m,this._z=l*h*m-u*f*d,this._w=l*h*d+u*f*m;break;case"ZXY":this._x=u*h*d-l*f*m,this._y=l*f*d+u*h*m,this._z=l*h*m+u*f*d,this._w=l*h*d-u*f*m;break;case"ZYX":this._x=u*h*d-l*f*m,this._y=l*f*d+u*h*m,this._z=l*h*m-u*f*d,this._w=l*h*d+u*f*m;break;case"YZX":this._x=u*h*d+l*f*m,this._y=l*f*d+u*h*m,this._z=l*h*m-u*f*d,this._w=l*h*d-u*f*m;break;case"XZY":this._x=u*h*d-l*f*m,this._y=l*f*d-u*h*m,this._z=l*h*m+u*f*d,this._w=l*h*d+u*f*m;break;default:Pe("Quaternion: .setFromEuler() encountered an unknown order: "+a)}return t===!0&&this._onChangeCallback(),this}setFromAxisAngle(e,t){let n=t/2,s=Math.sin(n);return this._x=e.x*s,this._y=e.y*s,this._z=e.z*s,this._w=Math.cos(n),this._onChangeCallback(),this}setFromRotationMatrix(e){let t=e.elements,n=t[0],s=t[4],r=t[8],a=t[1],o=t[5],c=t[9],l=t[2],h=t[6],d=t[10],u=n+o+d;if(u>0){let f=.5/Math.sqrt(u+1);this._w=.25/f,this._x=(h-c)*f,this._y=(r-l)*f,this._z=(a-s)*f}else if(n>o&&n>d){let f=2*Math.sqrt(1+n-o-d);this._w=(h-c)/f,this._x=.25*f,this._y=(s+a)/f,this._z=(r+l)/f}else if(o>d){let f=2*Math.sqrt(1+o-n-d);this._w=(r-l)/f,this._x=(s+a)/f,this._y=.25*f,this._z=(c+h)/f}else{let f=2*Math.sqrt(1+d-n-o);this._w=(a-s)/f,this._x=(r+l)/f,this._y=(c+h)/f,this._z=.25*f}return this._onChangeCallback(),this}setFromUnitVectors(e,t){let n=e.dot(t)+1;return n<1e-8?(n=0,Math.abs(e.x)>Math.abs(e.z)?(this._x=-e.y,this._y=e.x,this._z=0,this._w=n):(this._x=0,this._y=-e.z,this._z=e.y,this._w=n)):(this._x=e.y*t.z-e.z*t.y,this._y=e.z*t.x-e.x*t.z,this._z=e.x*t.y-e.y*t.x,this._w=n),this.normalize()}angleTo(e){return 2*Math.acos(Math.abs(Ue(this.dot(e),-1,1)))}rotateTowards(e,t){let n=this.angleTo(e);if(n===0)return this;let s=Math.min(1,t/n);return this.slerp(e,s),this}identity(){return this.set(0,0,0,1)}invert(){return this.conjugate()}conjugate(){return this._x*=-1,this._y*=-1,this._z*=-1,this._onChangeCallback(),this}dot(e){return this._x*e._x+this._y*e._y+this._z*e._z+this._w*e._w}lengthSq(){return this._x*this._x+this._y*this._y+this._z*this._z+this._w*this._w}length(){return Math.sqrt(this._x*this._x+this._y*this._y+this._z*this._z+this._w*this._w)}normalize(){let e=this.length();return e===0?(this._x=0,this._y=0,this._z=0,this._w=1):(e=1/e,this._x=this._x*e,this._y=this._y*e,this._z=this._z*e,this._w=this._w*e),this._onChangeCallback(),this}multiply(e){return this.multiplyQuaternions(this,e)}premultiply(e){return this.multiplyQuaternions(e,this)}multiplyQuaternions(e,t){let n=e._x,s=e._y,r=e._z,a=e._w,o=t._x,c=t._y,l=t._z,h=t._w;return this._x=n*h+a*o+s*l-r*c,this._y=s*h+a*c+r*o-n*l,this._z=r*h+a*l+n*c-s*o,this._w=a*h-n*o-s*c-r*l,this._onChangeCallback(),this}slerp(e,t){let n=e._x,s=e._y,r=e._z,a=e._w,o=this.dot(e);o<0&&(n=-n,s=-s,r=-r,a=-a,o=-o);let c=1-t;if(o<.9995){let l=Math.acos(o),h=Math.sin(l);c=Math.sin(c*l)/h,t=Math.sin(t*l)/h,this._x=this._x*c+n*t,this._y=this._y*c+s*t,this._z=this._z*c+r*t,this._w=this._w*c+a*t,this._onChangeCallback()}else this._x=this._x*c+n*t,this._y=this._y*c+s*t,this._z=this._z*c+r*t,this._w=this._w*c+a*t,this.normalize();return this}slerpQuaternions(e,t,n){return this.copy(e).slerp(t,n)}random(){let e=2*Math.PI*Math.random(),t=2*Math.PI*Math.random(),n=Math.random(),s=Math.sqrt(1-n),r=Math.sqrt(n);return this.set(s*Math.sin(e),s*Math.cos(e),r*Math.sin(t),r*Math.cos(t))}equals(e){return e._x===this._x&&e._y===this._y&&e._z===this._z&&e._w===this._w}fromArray(e,t=0){return this._x=e[t],this._y=e[t+1],this._z=e[t+2],this._w=e[t+3],this._onChangeCallback(),this}toArray(e=[],t=0){return e[t]=this._x,e[t+1]=this._y,e[t+2]=this._z,e[t+3]=this._w,e}fromBufferAttribute(e,t){return this._x=e.getX(t),this._y=e.getY(t),this._z=e.getZ(t),this._w=e.getW(t),this._onChangeCallback(),this}toJSON(){return this.toArray()}_onChange(e){return this._onChangeCallback=e,this}_onChangeCallback(){}*[Symbol.iterator](){yield this._x,yield this._y,yield this._z,yield this._w}},rh=class rh{constructor(e=0,t=0,n=0){this.x=e,this.y=t,this.z=n}set(e,t,n){return n===void 0&&(n=this.z),this.x=e,this.y=t,this.z=n,this}setScalar(e){return this.x=e,this.y=e,this.z=e,this}setX(e){return this.x=e,this}setY(e){return this.y=e,this}setZ(e){return this.z=e,this}setComponent(e,t){switch(e){case 0:this.x=t;break;case 1:this.y=t;break;case 2:this.z=t;break;default:throw new Error("THREE.Vector3: index is out of range: "+e)}return this}getComponent(e){switch(e){case 0:return this.x;case 1:return this.y;case 2:return this.z;default:throw new Error("THREE.Vector3: index is out of range: "+e)}}clone(){return new this.constructor(this.x,this.y,this.z)}copy(e){return this.x=e.x,this.y=e.y,this.z=e.z,this}add(e){return this.x+=e.x,this.y+=e.y,this.z+=e.z,this}addScalar(e){return this.x+=e,this.y+=e,this.z+=e,this}addVectors(e,t){return this.x=e.x+t.x,this.y=e.y+t.y,this.z=e.z+t.z,this}addScaledVector(e,t){return this.x+=e.x*t,this.y+=e.y*t,this.z+=e.z*t,this}sub(e){return this.x-=e.x,this.y-=e.y,this.z-=e.z,this}subScalar(e){return this.x-=e,this.y-=e,this.z-=e,this}subVectors(e,t){return this.x=e.x-t.x,this.y=e.y-t.y,this.z=e.z-t.z,this}multiply(e){return this.x*=e.x,this.y*=e.y,this.z*=e.z,this}multiplyScalar(e){return this.x*=e,this.y*=e,this.z*=e,this}multiplyVectors(e,t){return this.x=e.x*t.x,this.y=e.y*t.y,this.z=e.z*t.z,this}applyEuler(e){return this.applyQuaternion(fu.setFromEuler(e))}applyAxisAngle(e,t){return this.applyQuaternion(fu.setFromAxisAngle(e,t))}applyMatrix3(e){let t=this.x,n=this.y,s=this.z,r=e.elements;return this.x=r[0]*t+r[3]*n+r[6]*s,this.y=r[1]*t+r[4]*n+r[7]*s,this.z=r[2]*t+r[5]*n+r[8]*s,this}applyNormalMatrix(e){return this.applyMatrix3(e).normalize()}applyMatrix4(e){let t=this.x,n=this.y,s=this.z,r=e.elements,a=1/(r[3]*t+r[7]*n+r[11]*s+r[15]);return this.x=(r[0]*t+r[4]*n+r[8]*s+r[12])*a,this.y=(r[1]*t+r[5]*n+r[9]*s+r[13])*a,this.z=(r[2]*t+r[6]*n+r[10]*s+r[14])*a,this}applyQuaternion(e){let t=this.x,n=this.y,s=this.z,r=e.x,a=e.y,o=e.z,c=e.w,l=2*(a*s-o*n),h=2*(o*t-r*s),d=2*(r*n-a*t);return this.x=t+c*l+a*d-o*h,this.y=n+c*h+o*l-r*d,this.z=s+c*d+r*h-a*l,this}project(e){return this.applyMatrix4(e.matrixWorldInverse).applyMatrix4(e.projectionMatrix)}unproject(e){return this.applyMatrix4(e.projectionMatrixInverse).applyMatrix4(e.matrixWorld)}transformDirection(e){let t=this.x,n=this.y,s=this.z,r=e.elements;return this.x=r[0]*t+r[4]*n+r[8]*s,this.y=r[1]*t+r[5]*n+r[9]*s,this.z=r[2]*t+r[6]*n+r[10]*s,this.normalize()}divide(e){return this.x/=e.x,this.y/=e.y,this.z/=e.z,this}divideScalar(e){return this.multiplyScalar(1/e)}min(e){return this.x=Math.min(this.x,e.x),this.y=Math.min(this.y,e.y),this.z=Math.min(this.z,e.z),this}max(e){return this.x=Math.max(this.x,e.x),this.y=Math.max(this.y,e.y),this.z=Math.max(this.z,e.z),this}clamp(e,t){return this.x=Ue(this.x,e.x,t.x),this.y=Ue(this.y,e.y,t.y),this.z=Ue(this.z,e.z,t.z),this}clampScalar(e,t){return this.x=Ue(this.x,e,t),this.y=Ue(this.y,e,t),this.z=Ue(this.z,e,t),this}clampLength(e,t){let n=this.length();return this.divideScalar(n||1).multiplyScalar(Ue(n,e,t))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this.z=Math.floor(this.z),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this.z=Math.ceil(this.z),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this.z=Math.round(this.z),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this.z=Math.trunc(this.z),this}negate(){return this.x=-this.x,this.y=-this.y,this.z=-this.z,this}dot(e){return this.x*e.x+this.y*e.y+this.z*e.z}lengthSq(){return this.x*this.x+this.y*this.y+this.z*this.z}length(){return Math.sqrt(this.x*this.x+this.y*this.y+this.z*this.z)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)+Math.abs(this.z)}normalize(){return this.divideScalar(this.length()||1)}setLength(e){return this.normalize().multiplyScalar(e)}lerp(e,t){return this.x+=(e.x-this.x)*t,this.y+=(e.y-this.y)*t,this.z+=(e.z-this.z)*t,this}lerpVectors(e,t,n){return this.x=e.x+(t.x-e.x)*n,this.y=e.y+(t.y-e.y)*n,this.z=e.z+(t.z-e.z)*n,this}cross(e){return this.crossVectors(this,e)}crossVectors(e,t){let n=e.x,s=e.y,r=e.z,a=t.x,o=t.y,c=t.z;return this.x=s*c-r*o,this.y=r*a-n*c,this.z=n*o-s*a,this}projectOnVector(e){let t=e.lengthSq();if(t===0)return this.set(0,0,0);let n=e.dot(this)/t;return this.copy(e).multiplyScalar(n)}projectOnPlane(e){return Yc.copy(this).projectOnVector(e),this.sub(Yc)}reflect(e){return this.sub(Yc.copy(e).multiplyScalar(2*this.dot(e)))}angleTo(e){let t=Math.sqrt(this.lengthSq()*e.lengthSq());if(t===0)return Math.PI/2;let n=this.dot(e)/t;return Math.acos(Ue(n,-1,1))}distanceTo(e){return Math.sqrt(this.distanceToSquared(e))}distanceToSquared(e){let t=this.x-e.x,n=this.y-e.y,s=this.z-e.z;return t*t+n*n+s*s}manhattanDistanceTo(e){return Math.abs(this.x-e.x)+Math.abs(this.y-e.y)+Math.abs(this.z-e.z)}setFromSpherical(e){return this.setFromSphericalCoords(e.radius,e.phi,e.theta)}setFromSphericalCoords(e,t,n){let s=Math.sin(t)*e;return this.x=s*Math.sin(n),this.y=Math.cos(t)*e,this.z=s*Math.cos(n),this}setFromCylindrical(e){return this.setFromCylindricalCoords(e.radius,e.theta,e.y)}setFromCylindricalCoords(e,t,n){return this.x=e*Math.sin(t),this.y=n,this.z=e*Math.cos(t),this}setFromMatrixPosition(e){let t=e.elements;return this.x=t[12],this.y=t[13],this.z=t[14],this}setFromMatrixScale(e){let t=this.setFromMatrixColumn(e,0).length(),n=this.setFromMatrixColumn(e,1).length(),s=this.setFromMatrixColumn(e,2).length();return this.x=t,this.y=n,this.z=s,this}setFromMatrixColumn(e,t){return this.fromArray(e.elements,t*4)}setFromMatrix3Column(e,t){return this.fromArray(e.elements,t*3)}setFromEuler(e){return this.x=e._x,this.y=e._y,this.z=e._z,this}setFromColor(e){return this.x=e.r,this.y=e.g,this.z=e.b,this}equals(e){return e.x===this.x&&e.y===this.y&&e.z===this.z}fromArray(e,t=0){return this.x=e[t],this.y=e[t+1],this.z=e[t+2],this}toArray(e=[],t=0){return e[t]=this.x,e[t+1]=this.y,e[t+2]=this.z,e}fromBufferAttribute(e,t){return this.x=e.getX(t),this.y=e.getY(t),this.z=e.getZ(t),this}random(){return this.x=Math.random(),this.y=Math.random(),this.z=Math.random(),this}randomDirection(){let e=Math.random()*Math.PI*2,t=Math.random()*2-1,n=Math.sqrt(1-t*t);return this.x=n*Math.cos(e),this.y=t,this.z=n*Math.sin(e),this}*[Symbol.iterator](){yield this.x,yield this.y,yield this.z}};rh.prototype.isVector3=!0;var L=rh,Yc=new L,fu=new kn,ah=class ah{constructor(e,t,n,s,r,a,o,c,l){this.elements=[1,0,0,0,1,0,0,0,1],e!==void 0&&this.set(e,t,n,s,r,a,o,c,l)}set(e,t,n,s,r,a,o,c,l){let h=this.elements;return h[0]=e,h[1]=s,h[2]=o,h[3]=t,h[4]=r,h[5]=c,h[6]=n,h[7]=a,h[8]=l,this}identity(){return this.set(1,0,0,0,1,0,0,0,1),this}copy(e){let t=this.elements,n=e.elements;return t[0]=n[0],t[1]=n[1],t[2]=n[2],t[3]=n[3],t[4]=n[4],t[5]=n[5],t[6]=n[6],t[7]=n[7],t[8]=n[8],this}extractBasis(e,t,n){return e.setFromMatrix3Column(this,0),t.setFromMatrix3Column(this,1),n.setFromMatrix3Column(this,2),this}setFromMatrix4(e){let t=e.elements;return this.set(t[0],t[4],t[8],t[1],t[5],t[9],t[2],t[6],t[10]),this}multiply(e){return this.multiplyMatrices(this,e)}premultiply(e){return this.multiplyMatrices(e,this)}multiplyMatrices(e,t){let n=e.elements,s=t.elements,r=this.elements,a=n[0],o=n[3],c=n[6],l=n[1],h=n[4],d=n[7],u=n[2],f=n[5],m=n[8],_=s[0],g=s[3],p=s[6],b=s[1],E=s[4],v=s[7],A=s[2],M=s[5],w=s[8];return r[0]=a*_+o*b+c*A,r[3]=a*g+o*E+c*M,r[6]=a*p+o*v+c*w,r[1]=l*_+h*b+d*A,r[4]=l*g+h*E+d*M,r[7]=l*p+h*v+d*w,r[2]=u*_+f*b+m*A,r[5]=u*g+f*E+m*M,r[8]=u*p+f*v+m*w,this}multiplyScalar(e){let t=this.elements;return t[0]*=e,t[3]*=e,t[6]*=e,t[1]*=e,t[4]*=e,t[7]*=e,t[2]*=e,t[5]*=e,t[8]*=e,this}determinant(){let e=this.elements,t=e[0],n=e[1],s=e[2],r=e[3],a=e[4],o=e[5],c=e[6],l=e[7],h=e[8];return t*a*h-t*o*l-n*r*h+n*o*c+s*r*l-s*a*c}invert(){let e=this.elements,t=e[0],n=e[1],s=e[2],r=e[3],a=e[4],o=e[5],c=e[6],l=e[7],h=e[8],d=h*a-o*l,u=o*c-h*r,f=l*r-a*c,m=t*d+n*u+s*f;if(m===0)return this.set(0,0,0,0,0,0,0,0,0);let _=1/m;return e[0]=d*_,e[1]=(s*l-h*n)*_,e[2]=(o*n-s*a)*_,e[3]=u*_,e[4]=(h*t-s*c)*_,e[5]=(s*r-o*t)*_,e[6]=f*_,e[7]=(n*c-l*t)*_,e[8]=(a*t-n*r)*_,this}transpose(){let e,t=this.elements;return e=t[1],t[1]=t[3],t[3]=e,e=t[2],t[2]=t[6],t[6]=e,e=t[5],t[5]=t[7],t[7]=e,this}getNormalMatrix(e){return this.setFromMatrix4(e).invert().transpose()}transposeIntoArray(e){let t=this.elements;return e[0]=t[0],e[1]=t[3],e[2]=t[6],e[3]=t[1],e[4]=t[4],e[5]=t[7],e[6]=t[2],e[7]=t[5],e[8]=t[8],this}setUvTransform(e,t,n,s,r,a,o){let c=Math.cos(r),l=Math.sin(r);return this.set(n*c,n*l,-n*(c*a+l*o)+a+e,-s*l,s*c,-s*(-l*a+c*o)+o+t,0,0,1),this}scale(e,t){return qi("Matrix3: .scale() is deprecated. Use .makeScale() instead."),this.premultiply($c.makeScale(e,t)),this}rotate(e){return qi("Matrix3: .rotate() is deprecated. Use .makeRotation() instead."),this.premultiply($c.makeRotation(-e)),this}translate(e,t){return qi("Matrix3: .translate() is deprecated. Use .makeTranslation() instead."),this.premultiply($c.makeTranslation(e,t)),this}makeTranslation(e,t){return e.isVector2?this.set(1,0,e.x,0,1,e.y,0,0,1):this.set(1,0,e,0,1,t,0,0,1),this}makeRotation(e){let t=Math.cos(e),n=Math.sin(e);return this.set(t,-n,0,n,t,0,0,0,1),this}makeScale(e,t){return this.set(e,0,0,0,t,0,0,0,1),this}equals(e){let t=this.elements,n=e.elements;for(let s=0;s<9;s++)if(t[s]!==n[s])return!1;return!0}fromArray(e,t=0){for(let n=0;n<9;n++)this.elements[n]=e[n+t];return this}toArray(e=[],t=0){let n=this.elements;return e[t]=n[0],e[t+1]=n[1],e[t+2]=n[2],e[t+3]=n[3],e[t+4]=n[4],e[t+5]=n[5],e[t+6]=n[6],e[t+7]=n[7],e[t+8]=n[8],e}clone(){return new this.constructor().fromArray(this.elements)}};ah.prototype.isMatrix3=!0;var De=ah,$c=new De,pu=new De().set(.4123908,.3575843,.1804808,.212639,.7151687,.0721923,.0193308,.1191948,.9505322),mu=new De().set(3.2409699,-1.5373832,-.4986108,-.9692436,1.8759675,.0415551,.0556301,-.203977,1.0569715);function Pp(){let i={enabled:!0,workingColorSpace:tr,spaces:{},convert:function(s,r,a){return this.enabled===!1||r===a||!r||!a||(this.spaces[r].transfer===je&&(s.r=ti(s.r),s.g=ti(s.g),s.b=ti(s.b)),this.spaces[r].primaries!==this.spaces[a].primaries&&(s.applyMatrix3(this.spaces[r].toXYZ),s.applyMatrix3(this.spaces[a].fromXYZ)),this.spaces[a].transfer===je&&(s.r=Ss(s.r),s.g=Ss(s.g),s.b=Ss(s.b))),s},workingToColorSpace:function(s,r){return this.convert(s,this.workingColorSpace,r)},colorSpaceToWorking:function(s,r){return this.convert(s,r,this.workingColorSpace)},getPrimaries:function(s){return this.spaces[s].primaries},getTransfer:function(s){return s===si?nr:this.spaces[s].transfer},getToneMappingMode:function(s){return this.spaces[s].outputColorSpaceConfig.toneMappingMode||"standard"},getLuminanceCoefficients:function(s,r=this.workingColorSpace){return s.fromArray(this.spaces[r].luminanceCoefficients)},define:function(s){Object.assign(this.spaces,s)},_getMatrix:function(s,r,a){return s.copy(this.spaces[r].toXYZ).multiply(this.spaces[a].fromXYZ)},_getDrawingBufferColorSpace:function(s){return this.spaces[s].outputColorSpaceConfig.drawingBufferColorSpace},_getUnpackColorSpace:function(s=this.workingColorSpace){return this.spaces[s].workingColorSpaceConfig.unpackColorSpace},fromWorkingColorSpace:function(s,r){return qi("ColorManagement: .fromWorkingColorSpace() has been renamed to .workingToColorSpace()."),i.workingToColorSpace(s,r)},toWorkingColorSpace:function(s,r){return qi("ColorManagement: .toWorkingColorSpace() has been renamed to .colorSpaceToWorking()."),i.colorSpaceToWorking(s,r)}},e=[.64,.33,.3,.6,.15,.06],t=[.2126,.7152,.0722],n=[.3127,.329];return i.define({[tr]:{primaries:e,whitePoint:n,transfer:nr,toXYZ:pu,fromXYZ:mu,luminanceCoefficients:t,workingColorSpaceConfig:{unpackColorSpace:on},outputColorSpaceConfig:{drawingBufferColorSpace:on}},[on]:{primaries:e,whitePoint:n,transfer:je,toXYZ:pu,fromXYZ:mu,luminanceCoefficients:t,outputColorSpaceConfig:{drawingBufferColorSpace:on}}}),i}var We=Pp();function ti(i){return i<.04045?i*.0773993808:Math.pow(i*.9478672986+.0521327014,2.4)}function Ss(i){return i<.0031308?i*12.92:1.055*Math.pow(i,.41666)-.055}var cs,$a=class{static getDataURL(e,t="image/png"){if(/^data:/i.test(e.src)||typeof HTMLCanvasElement>"u")return e.src;let n;if(e instanceof HTMLCanvasElement)n=e;else{cs===void 0&&(cs=sr("canvas")),cs.width=e.width,cs.height=e.height;let s=cs.getContext("2d");e instanceof ImageData?s.putImageData(e,0,0):s.drawImage(e,0,0,e.width,e.height),n=cs}return n.toDataURL(t)}static sRGBToLinear(e){if(typeof HTMLImageElement<"u"&&e instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&e instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&e instanceof ImageBitmap){let t=sr("canvas");t.width=e.width,t.height=e.height;let n=t.getContext("2d");n.drawImage(e,0,0,e.width,e.height);let s=n.getImageData(0,0,e.width,e.height),r=s.data;for(let a=0;a<r.length;a++)r[a]=ti(r[a]/255)*255;return n.putImageData(s,0,0),t}else if(e.data){let t=e.data.slice(0);for(let n=0;n<t.length;n++)t instanceof Uint8Array||t instanceof Uint8ClampedArray?t[n]=Math.floor(ti(t[n]/255)*255):t[n]=ti(t[n]);return{data:t,width:e.width,height:e.height}}else return Pe("ImageUtils.sRGBToLinear(): Unsupported image type. No color space conversion applied."),e}},Cp=0,ws=class{constructor(e=null){this.isSource=!0,Object.defineProperty(this,"id",{value:Cp++}),this.uuid=Bn(),this.data=e,this.dataReady=!0,this.version=0}getSize(e){let t=this.data;return typeof HTMLVideoElement<"u"&&t instanceof HTMLVideoElement?e.set(t.videoWidth,t.videoHeight,0):typeof VideoFrame<"u"&&t instanceof VideoFrame?e.set(t.displayWidth,t.displayHeight,0):t!==null?e.set(t.width,t.height,t.depth||0):e.set(0,0,0),e}set needsUpdate(e){e===!0&&this.version++}toJSON(e){let t=e===void 0||typeof e=="string";if(!t&&e.images[this.uuid]!==void 0)return e.images[this.uuid];let n={uuid:this.uuid,url:""},s=this.data;if(s!==null){let r;if(Array.isArray(s)){r=[];for(let a=0,o=s.length;a<o;a++)s[a].isDataTexture?r.push(Kc(s[a].image)):r.push(Kc(s[a]))}else r=Kc(s);n.url=r}return t||(e.images[this.uuid]=n),n}};function Kc(i){return typeof HTMLImageElement<"u"&&i instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&i instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&i instanceof ImageBitmap?$a.getDataURL(i):i.data?{data:Array.from(i.data),width:i.width,height:i.height,type:i.data.constructor.name}:(Pe("Texture: Unable to serialize Texture."),{})}var Rp=0,Zc=new L,tn=class i extends Vn{constructor(e=i.DEFAULT_IMAGE,t=i.DEFAULT_MAPPING,n=Nn,s=Nn,r=Ut,a=Ci,o=yn,c=fn,l=i.DEFAULT_ANISOTROPY,h=si){super(),this.isTexture=!0,Object.defineProperty(this,"id",{value:Rp++}),this.uuid=Bn(),this.name="",this.source=new ws(e),this.mipmaps=[],this.mapping=t,this.channel=0,this.wrapS=n,this.wrapT=s,this.magFilter=r,this.minFilter=a,this.anisotropy=l,this.format=o,this.internalFormat=null,this.type=c,this.offset=new _e(0,0),this.repeat=new _e(1,1),this.center=new _e(0,0),this.rotation=0,this.matrixAutoUpdate=!0,this.matrix=new De,this.generateMipmaps=!0,this.premultiplyAlpha=!1,this.flipY=!0,this.unpackAlignment=4,this.colorSpace=h,this.userData={},this.updateRanges=[],this.version=0,this.onUpdate=null,this.renderTarget=null,this.isRenderTargetTexture=!1,this.isArrayTexture=!!(e&&e.depth&&e.depth>1),this.pmremVersion=0,this.normalized=!1}get width(){return this.source.getSize(Zc).x}get height(){return this.source.getSize(Zc).y}get depth(){return this.source.getSize(Zc).z}get image(){return this.source.data}set image(e){this.source.data=e}updateMatrix(){this.matrix.setUvTransform(this.offset.x,this.offset.y,this.repeat.x,this.repeat.y,this.rotation,this.center.x,this.center.y)}addUpdateRange(e,t){this.updateRanges.push({start:e,count:t})}clearUpdateRanges(){this.updateRanges.length=0}clone(){return new this.constructor().copy(this)}copy(e){return this.name=e.name,this.source=e.source,this.mipmaps=e.mipmaps.slice(0),this.mapping=e.mapping,this.channel=e.channel,this.wrapS=e.wrapS,this.wrapT=e.wrapT,this.magFilter=e.magFilter,this.minFilter=e.minFilter,this.anisotropy=e.anisotropy,this.format=e.format,this.internalFormat=e.internalFormat,this.type=e.type,this.normalized=e.normalized,this.offset.copy(e.offset),this.repeat.copy(e.repeat),this.center.copy(e.center),this.rotation=e.rotation,this.matrixAutoUpdate=e.matrixAutoUpdate,this.matrix.copy(e.matrix),this.generateMipmaps=e.generateMipmaps,this.premultiplyAlpha=e.premultiplyAlpha,this.flipY=e.flipY,this.unpackAlignment=e.unpackAlignment,this.colorSpace=e.colorSpace,this.renderTarget=e.renderTarget,this.isRenderTargetTexture=e.isRenderTargetTexture,this.isArrayTexture=e.isArrayTexture,this.userData=JSON.parse(JSON.stringify(e.userData)),this.needsUpdate=!0,this}setValues(e){for(let t in e){let n=e[t];if(n===void 0){Pe(`Texture.setValues(): parameter '${t}' has value of undefined.`);continue}let s=this[t];if(s===void 0){Pe(`Texture.setValues(): property '${t}' does not exist.`);continue}s&&n&&s.isVector2&&n.isVector2||s&&n&&s.isVector3&&n.isVector3||s&&n&&s.isMatrix3&&n.isMatrix3?s.copy(n):this[t]=n}}toJSON(e){let t=e===void 0||typeof e=="string";if(!t&&e.textures[this.uuid]!==void 0)return e.textures[this.uuid];let n={metadata:{version:4.7,type:"Texture",generator:"Texture.toJSON"},uuid:this.uuid,name:this.name,image:this.source.toJSON(e).uuid,mapping:this.mapping,channel:this.channel,repeat:[this.repeat.x,this.repeat.y],offset:[this.offset.x,this.offset.y],center:[this.center.x,this.center.y],rotation:this.rotation,wrap:[this.wrapS,this.wrapT],format:this.format,internalFormat:this.internalFormat,type:this.type,normalized:this.normalized,colorSpace:this.colorSpace,minFilter:this.minFilter,magFilter:this.magFilter,anisotropy:this.anisotropy,flipY:this.flipY,generateMipmaps:this.generateMipmaps,premultiplyAlpha:this.premultiplyAlpha,unpackAlignment:this.unpackAlignment};return Object.keys(this.userData).length>0&&(n.userData=this.userData),t||(e.textures[this.uuid]=n),n}dispose(){this.dispatchEvent({type:"dispose"})}transformUv(e){if(this.mapping!==kl)return e;if(e.applyMatrix3(this.matrix),e.x<0||e.x>1)switch(this.wrapS){case Wa:e.x=e.x-Math.floor(e.x);break;case Nn:e.x=e.x<0?0:1;break;case Xa:Math.abs(Math.floor(e.x)%2)===1?e.x=Math.ceil(e.x)-e.x:e.x=e.x-Math.floor(e.x);break}if(e.y<0||e.y>1)switch(this.wrapT){case Wa:e.y=e.y-Math.floor(e.y);break;case Nn:e.y=e.y<0?0:1;break;case Xa:Math.abs(Math.floor(e.y)%2)===1?e.y=Math.ceil(e.y)-e.y:e.y=e.y-Math.floor(e.y);break}return this.flipY&&(e.y=1-e.y),e}set needsUpdate(e){e===!0&&(this.version++,this.source.needsUpdate=!0)}set needsPMREMUpdate(e){e===!0&&this.pmremVersion++}};tn.DEFAULT_IMAGE=null;tn.DEFAULT_MAPPING=kl;tn.DEFAULT_ANISOTROPY=1;var oh=class oh{constructor(e=0,t=0,n=0,s=1){this.x=e,this.y=t,this.z=n,this.w=s}get width(){return this.z}set width(e){this.z=e}get height(){return this.w}set height(e){this.w=e}set(e,t,n,s){return this.x=e,this.y=t,this.z=n,this.w=s,this}setScalar(e){return this.x=e,this.y=e,this.z=e,this.w=e,this}setX(e){return this.x=e,this}setY(e){return this.y=e,this}setZ(e){return this.z=e,this}setW(e){return this.w=e,this}setComponent(e,t){switch(e){case 0:this.x=t;break;case 1:this.y=t;break;case 2:this.z=t;break;case 3:this.w=t;break;default:throw new Error("THREE.Vector4: index is out of range: "+e)}return this}getComponent(e){switch(e){case 0:return this.x;case 1:return this.y;case 2:return this.z;case 3:return this.w;default:throw new Error("THREE.Vector4: index is out of range: "+e)}}clone(){return new this.constructor(this.x,this.y,this.z,this.w)}copy(e){return this.x=e.x,this.y=e.y,this.z=e.z,this.w=e.w!==void 0?e.w:1,this}add(e){return this.x+=e.x,this.y+=e.y,this.z+=e.z,this.w+=e.w,this}addScalar(e){return this.x+=e,this.y+=e,this.z+=e,this.w+=e,this}addVectors(e,t){return this.x=e.x+t.x,this.y=e.y+t.y,this.z=e.z+t.z,this.w=e.w+t.w,this}addScaledVector(e,t){return this.x+=e.x*t,this.y+=e.y*t,this.z+=e.z*t,this.w+=e.w*t,this}sub(e){return this.x-=e.x,this.y-=e.y,this.z-=e.z,this.w-=e.w,this}subScalar(e){return this.x-=e,this.y-=e,this.z-=e,this.w-=e,this}subVectors(e,t){return this.x=e.x-t.x,this.y=e.y-t.y,this.z=e.z-t.z,this.w=e.w-t.w,this}multiply(e){return this.x*=e.x,this.y*=e.y,this.z*=e.z,this.w*=e.w,this}multiplyScalar(e){return this.x*=e,this.y*=e,this.z*=e,this.w*=e,this}applyMatrix4(e){let t=this.x,n=this.y,s=this.z,r=this.w,a=e.elements;return this.x=a[0]*t+a[4]*n+a[8]*s+a[12]*r,this.y=a[1]*t+a[5]*n+a[9]*s+a[13]*r,this.z=a[2]*t+a[6]*n+a[10]*s+a[14]*r,this.w=a[3]*t+a[7]*n+a[11]*s+a[15]*r,this}divide(e){return this.x/=e.x,this.y/=e.y,this.z/=e.z,this.w/=e.w,this}divideScalar(e){return this.multiplyScalar(1/e)}setAxisAngleFromQuaternion(e){this.w=2*Math.acos(e.w);let t=Math.sqrt(1-e.w*e.w);return t<1e-4?(this.x=1,this.y=0,this.z=0):(this.x=e.x/t,this.y=e.y/t,this.z=e.z/t),this}setAxisAngleFromRotationMatrix(e){let t,n,s,r,c=e.elements,l=c[0],h=c[4],d=c[8],u=c[1],f=c[5],m=c[9],_=c[2],g=c[6],p=c[10];if(Math.abs(h-u)<.01&&Math.abs(d-_)<.01&&Math.abs(m-g)<.01){if(Math.abs(h+u)<.1&&Math.abs(d+_)<.1&&Math.abs(m+g)<.1&&Math.abs(l+f+p-3)<.1)return this.set(1,0,0,0),this;t=Math.PI;let E=(l+1)/2,v=(f+1)/2,A=(p+1)/2,M=(h+u)/4,w=(d+_)/4,x=(m+g)/4;return E>v&&E>A?E<.01?(n=0,s=.707106781,r=.707106781):(n=Math.sqrt(E),s=M/n,r=w/n):v>A?v<.01?(n=.707106781,s=0,r=.707106781):(s=Math.sqrt(v),n=M/s,r=x/s):A<.01?(n=.707106781,s=.707106781,r=0):(r=Math.sqrt(A),n=w/r,s=x/r),this.set(n,s,r,t),this}let b=Math.sqrt((g-m)*(g-m)+(d-_)*(d-_)+(u-h)*(u-h));return Math.abs(b)<.001&&(b=1),this.x=(g-m)/b,this.y=(d-_)/b,this.z=(u-h)/b,this.w=Math.acos((l+f+p-1)/2),this}setFromMatrixPosition(e){let t=e.elements;return this.x=t[12],this.y=t[13],this.z=t[14],this.w=t[15],this}min(e){return this.x=Math.min(this.x,e.x),this.y=Math.min(this.y,e.y),this.z=Math.min(this.z,e.z),this.w=Math.min(this.w,e.w),this}max(e){return this.x=Math.max(this.x,e.x),this.y=Math.max(this.y,e.y),this.z=Math.max(this.z,e.z),this.w=Math.max(this.w,e.w),this}clamp(e,t){return this.x=Ue(this.x,e.x,t.x),this.y=Ue(this.y,e.y,t.y),this.z=Ue(this.z,e.z,t.z),this.w=Ue(this.w,e.w,t.w),this}clampScalar(e,t){return this.x=Ue(this.x,e,t),this.y=Ue(this.y,e,t),this.z=Ue(this.z,e,t),this.w=Ue(this.w,e,t),this}clampLength(e,t){let n=this.length();return this.divideScalar(n||1).multiplyScalar(Ue(n,e,t))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this.z=Math.floor(this.z),this.w=Math.floor(this.w),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this.z=Math.ceil(this.z),this.w=Math.ceil(this.w),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this.z=Math.round(this.z),this.w=Math.round(this.w),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this.z=Math.trunc(this.z),this.w=Math.trunc(this.w),this}negate(){return this.x=-this.x,this.y=-this.y,this.z=-this.z,this.w=-this.w,this}dot(e){return this.x*e.x+this.y*e.y+this.z*e.z+this.w*e.w}lengthSq(){return this.x*this.x+this.y*this.y+this.z*this.z+this.w*this.w}length(){return Math.sqrt(this.x*this.x+this.y*this.y+this.z*this.z+this.w*this.w)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)+Math.abs(this.z)+Math.abs(this.w)}normalize(){return this.divideScalar(this.length()||1)}setLength(e){return this.normalize().multiplyScalar(e)}lerp(e,t){return this.x+=(e.x-this.x)*t,this.y+=(e.y-this.y)*t,this.z+=(e.z-this.z)*t,this.w+=(e.w-this.w)*t,this}lerpVectors(e,t,n){return this.x=e.x+(t.x-e.x)*n,this.y=e.y+(t.y-e.y)*n,this.z=e.z+(t.z-e.z)*n,this.w=e.w+(t.w-e.w)*n,this}equals(e){return e.x===this.x&&e.y===this.y&&e.z===this.z&&e.w===this.w}fromArray(e,t=0){return this.x=e[t],this.y=e[t+1],this.z=e[t+2],this.w=e[t+3],this}toArray(e=[],t=0){return e[t]=this.x,e[t+1]=this.y,e[t+2]=this.z,e[t+3]=this.w,e}fromBufferAttribute(e,t){return this.x=e.getX(t),this.y=e.getY(t),this.z=e.getZ(t),this.w=e.getW(t),this}random(){return this.x=Math.random(),this.y=Math.random(),this.z=Math.random(),this.w=Math.random(),this}*[Symbol.iterator](){yield this.x,yield this.y,yield this.z,yield this.w}};oh.prototype.isVector4=!0;var tt=oh,Ka=class extends Vn{constructor(e=1,t=1,n={}){super(),n=Object.assign({generateMipmaps:!1,internalFormat:null,minFilter:Ut,depthBuffer:!0,stencilBuffer:!1,resolveDepthBuffer:!0,resolveStencilBuffer:!0,depthTexture:null,samples:0,count:1,depth:1,multiview:!1,useArrayDepthTexture:!1},n),this.isRenderTarget=!0,this.width=e,this.height=t,this.depth=n.depth,this.scissor=new tt(0,0,e,t),this.scissorTest=!1,this.viewport=new tt(0,0,e,t),this.textures=[];let s={width:e,height:t,depth:n.depth},r=new tn(s),a=n.count;for(let o=0;o<a;o++)this.textures[o]=r.clone(),this.textures[o].isRenderTargetTexture=!0,this.textures[o].renderTarget=this;this._setTextureOptions(n),this.depthBuffer=n.depthBuffer,this.stencilBuffer=n.stencilBuffer,this.resolveDepthBuffer=n.resolveDepthBuffer,this.resolveStencilBuffer=n.resolveStencilBuffer,this._depthTexture=null,this.depthTexture=n.depthTexture,this.samples=n.samples,this.multiview=n.multiview,this.useArrayDepthTexture=n.useArrayDepthTexture}_setTextureOptions(e={}){let t={minFilter:Ut,generateMipmaps:!1,flipY:!1,internalFormat:null};e.mapping!==void 0&&(t.mapping=e.mapping),e.wrapS!==void 0&&(t.wrapS=e.wrapS),e.wrapT!==void 0&&(t.wrapT=e.wrapT),e.wrapR!==void 0&&(t.wrapR=e.wrapR),e.magFilter!==void 0&&(t.magFilter=e.magFilter),e.minFilter!==void 0&&(t.minFilter=e.minFilter),e.format!==void 0&&(t.format=e.format),e.type!==void 0&&(t.type=e.type),e.anisotropy!==void 0&&(t.anisotropy=e.anisotropy),e.colorSpace!==void 0&&(t.colorSpace=e.colorSpace),e.flipY!==void 0&&(t.flipY=e.flipY),e.generateMipmaps!==void 0&&(t.generateMipmaps=e.generateMipmaps),e.internalFormat!==void 0&&(t.internalFormat=e.internalFormat);for(let n=0;n<this.textures.length;n++)this.textures[n].setValues(t)}get texture(){return this.textures[0]}set texture(e){this.textures[0]=e}set depthTexture(e){this._depthTexture!==null&&(this._depthTexture.renderTarget=null),e!==null&&(e.renderTarget=this),this._depthTexture=e}get depthTexture(){return this._depthTexture}setSize(e,t,n=1){if(this.width!==e||this.height!==t||this.depth!==n){this.width=e,this.height=t,this.depth=n;for(let s=0,r=this.textures.length;s<r;s++)this.textures[s].image.width=e,this.textures[s].image.height=t,this.textures[s].image.depth=n,this.textures[s].isData3DTexture!==!0&&(this.textures[s].isArrayTexture=this.textures[s].image.depth>1);this.dispose()}this.viewport.set(0,0,e,t),this.scissor.set(0,0,e,t)}clone(){return new this.constructor().copy(this)}copy(e){this.width=e.width,this.height=e.height,this.depth=e.depth,this.scissor.copy(e.scissor),this.scissorTest=e.scissorTest,this.viewport.copy(e.viewport),this.textures.length=0;for(let t=0,n=e.textures.length;t<n;t++){this.textures[t]=e.textures[t].clone(),this.textures[t].isRenderTargetTexture=!0,this.textures[t].renderTarget=this;let s=Object.assign({},e.textures[t].image);this.textures[t].source=new ws(s)}return this.depthBuffer=e.depthBuffer,this.stencilBuffer=e.stencilBuffer,this.resolveDepthBuffer=e.resolveDepthBuffer,this.resolveStencilBuffer=e.resolveStencilBuffer,e.depthTexture!==null&&(this.depthTexture=e.depthTexture.clone()),this.samples=e.samples,this.multiview=e.multiview,this.useArrayDepthTexture=e.useArrayDepthTexture,this}dispose(){this.dispatchEvent({type:"dispose"})}},cn=class extends Ka{constructor(e=1,t=1,n={}){super(e,t,n),this.isWebGLRenderTarget=!0}},ar=class extends tn{constructor(e=null,t=1,n=1,s=1){super(null),this.isDataArrayTexture=!0,this.image={data:e,width:t,height:n,depth:s},this.magFilter=Dt,this.minFilter=Dt,this.wrapR=Nn,this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1,this.layerUpdates=new Set}addLayerUpdate(e){this.layerUpdates.add(e)}clearLayerUpdates(){this.layerUpdates.clear()}};var Za=class extends tn{constructor(e=null,t=1,n=1,s=1){super(null),this.isData3DTexture=!0,this.image={data:e,width:t,height:n,depth:s},this.magFilter=Dt,this.minFilter=Dt,this.wrapR=Nn,this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1}};var wo=class wo{constructor(e,t,n,s,r,a,o,c,l,h,d,u,f,m,_,g){this.elements=[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1],e!==void 0&&this.set(e,t,n,s,r,a,o,c,l,h,d,u,f,m,_,g)}set(e,t,n,s,r,a,o,c,l,h,d,u,f,m,_,g){let p=this.elements;return p[0]=e,p[4]=t,p[8]=n,p[12]=s,p[1]=r,p[5]=a,p[9]=o,p[13]=c,p[2]=l,p[6]=h,p[10]=d,p[14]=u,p[3]=f,p[7]=m,p[11]=_,p[15]=g,this}identity(){return this.set(1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1),this}clone(){return new wo().fromArray(this.elements)}copy(e){let t=this.elements,n=e.elements;return t[0]=n[0],t[1]=n[1],t[2]=n[2],t[3]=n[3],t[4]=n[4],t[5]=n[5],t[6]=n[6],t[7]=n[7],t[8]=n[8],t[9]=n[9],t[10]=n[10],t[11]=n[11],t[12]=n[12],t[13]=n[13],t[14]=n[14],t[15]=n[15],this}copyPosition(e){let t=this.elements,n=e.elements;return t[12]=n[12],t[13]=n[13],t[14]=n[14],this}setFromMatrix3(e){let t=e.elements;return this.set(t[0],t[3],t[6],0,t[1],t[4],t[7],0,t[2],t[5],t[8],0,0,0,0,1),this}extractBasis(e,t,n){return this.determinantAffine()===0?(e.set(1,0,0),t.set(0,1,0),n.set(0,0,1),this):(e.setFromMatrixColumn(this,0),t.setFromMatrixColumn(this,1),n.setFromMatrixColumn(this,2),this)}makeBasis(e,t,n){return this.set(e.x,t.x,n.x,0,e.y,t.y,n.y,0,e.z,t.z,n.z,0,0,0,0,1),this}extractRotation(e){if(e.determinantAffine()===0)return this.identity();let t=this.elements,n=e.elements,s=1/ls.setFromMatrixColumn(e,0).length(),r=1/ls.setFromMatrixColumn(e,1).length(),a=1/ls.setFromMatrixColumn(e,2).length();return t[0]=n[0]*s,t[1]=n[1]*s,t[2]=n[2]*s,t[3]=0,t[4]=n[4]*r,t[5]=n[5]*r,t[6]=n[6]*r,t[7]=0,t[8]=n[8]*a,t[9]=n[9]*a,t[10]=n[10]*a,t[11]=0,t[12]=0,t[13]=0,t[14]=0,t[15]=1,this}makeRotationFromEuler(e){let t=this.elements,n=e.x,s=e.y,r=e.z,a=Math.cos(n),o=Math.sin(n),c=Math.cos(s),l=Math.sin(s),h=Math.cos(r),d=Math.sin(r);if(e.order==="XYZ"){let u=a*h,f=a*d,m=o*h,_=o*d;t[0]=c*h,t[4]=-c*d,t[8]=l,t[1]=f+m*l,t[5]=u-_*l,t[9]=-o*c,t[2]=_-u*l,t[6]=m+f*l,t[10]=a*c}else if(e.order==="YXZ"){let u=c*h,f=c*d,m=l*h,_=l*d;t[0]=u+_*o,t[4]=m*o-f,t[8]=a*l,t[1]=a*d,t[5]=a*h,t[9]=-o,t[2]=f*o-m,t[6]=_+u*o,t[10]=a*c}else if(e.order==="ZXY"){let u=c*h,f=c*d,m=l*h,_=l*d;t[0]=u-_*o,t[4]=-a*d,t[8]=m+f*o,t[1]=f+m*o,t[5]=a*h,t[9]=_-u*o,t[2]=-a*l,t[6]=o,t[10]=a*c}else if(e.order==="ZYX"){let u=a*h,f=a*d,m=o*h,_=o*d;t[0]=c*h,t[4]=m*l-f,t[8]=u*l+_,t[1]=c*d,t[5]=_*l+u,t[9]=f*l-m,t[2]=-l,t[6]=o*c,t[10]=a*c}else if(e.order==="YZX"){let u=a*c,f=a*l,m=o*c,_=o*l;t[0]=c*h,t[4]=_-u*d,t[8]=m*d+f,t[1]=d,t[5]=a*h,t[9]=-o*h,t[2]=-l*h,t[6]=f*d+m,t[10]=u-_*d}else if(e.order==="XZY"){let u=a*c,f=a*l,m=o*c,_=o*l;t[0]=c*h,t[4]=-d,t[8]=l*h,t[1]=u*d+_,t[5]=a*h,t[9]=f*d-m,t[2]=m*d-f,t[6]=o*h,t[10]=_*d+u}return t[3]=0,t[7]=0,t[11]=0,t[12]=0,t[13]=0,t[14]=0,t[15]=1,this}makeRotationFromQuaternion(e){return this.compose(Ip,e,Lp)}lookAt(e,t,n){let s=this.elements;return rn.subVectors(e,t),rn.lengthSq()===0&&(rn.z=1),rn.normalize(),di.crossVectors(n,rn),di.lengthSq()===0&&(Math.abs(n.z)===1?rn.x+=1e-4:rn.z+=1e-4,rn.normalize(),di.crossVectors(n,rn)),di.normalize(),la.crossVectors(rn,di),s[0]=di.x,s[4]=la.x,s[8]=rn.x,s[1]=di.y,s[5]=la.y,s[9]=rn.y,s[2]=di.z,s[6]=la.z,s[10]=rn.z,this}multiply(e){return this.multiplyMatrices(this,e)}premultiply(e){return this.multiplyMatrices(e,this)}multiplyMatrices(e,t){let n=e.elements,s=t.elements,r=this.elements,a=n[0],o=n[4],c=n[8],l=n[12],h=n[1],d=n[5],u=n[9],f=n[13],m=n[2],_=n[6],g=n[10],p=n[14],b=n[3],E=n[7],v=n[11],A=n[15],M=s[0],w=s[4],x=s[8],T=s[12],R=s[1],C=s[5],D=s[9],I=s[13],V=s[2],F=s[6],X=s[10],B=s[14],$=s[3],J=s[7],ne=s[11],de=s[15];return r[0]=a*M+o*R+c*V+l*$,r[4]=a*w+o*C+c*F+l*J,r[8]=a*x+o*D+c*X+l*ne,r[12]=a*T+o*I+c*B+l*de,r[1]=h*M+d*R+u*V+f*$,r[5]=h*w+d*C+u*F+f*J,r[9]=h*x+d*D+u*X+f*ne,r[13]=h*T+d*I+u*B+f*de,r[2]=m*M+_*R+g*V+p*$,r[6]=m*w+_*C+g*F+p*J,r[10]=m*x+_*D+g*X+p*ne,r[14]=m*T+_*I+g*B+p*de,r[3]=b*M+E*R+v*V+A*$,r[7]=b*w+E*C+v*F+A*J,r[11]=b*x+E*D+v*X+A*ne,r[15]=b*T+E*I+v*B+A*de,this}multiplyScalar(e){let t=this.elements;return t[0]*=e,t[4]*=e,t[8]*=e,t[12]*=e,t[1]*=e,t[5]*=e,t[9]*=e,t[13]*=e,t[2]*=e,t[6]*=e,t[10]*=e,t[14]*=e,t[3]*=e,t[7]*=e,t[11]*=e,t[15]*=e,this}determinant(){let e=this.elements,t=e[0],n=e[4],s=e[8],r=e[12],a=e[1],o=e[5],c=e[9],l=e[13],h=e[2],d=e[6],u=e[10],f=e[14],m=e[3],_=e[7],g=e[11],p=e[15],b=c*f-l*u,E=o*f-l*d,v=o*u-c*d,A=a*f-l*h,M=a*u-c*h,w=a*d-o*h;return t*(_*b-g*E+p*v)-n*(m*b-g*A+p*M)+s*(m*E-_*A+p*w)-r*(m*v-_*M+g*w)}determinantAffine(){let e=this.elements,t=e[0],n=e[4],s=e[8],r=e[1],a=e[5],o=e[9],c=e[2],l=e[6],h=e[10];return t*(a*h-o*l)-n*(r*h-o*c)+s*(r*l-a*c)}transpose(){let e=this.elements,t;return t=e[1],e[1]=e[4],e[4]=t,t=e[2],e[2]=e[8],e[8]=t,t=e[6],e[6]=e[9],e[9]=t,t=e[3],e[3]=e[12],e[12]=t,t=e[7],e[7]=e[13],e[13]=t,t=e[11],e[11]=e[14],e[14]=t,this}setPosition(e,t,n){let s=this.elements;return e.isVector3?(s[12]=e.x,s[13]=e.y,s[14]=e.z):(s[12]=e,s[13]=t,s[14]=n),this}invert(){let e=this.elements,t=e[0],n=e[1],s=e[2],r=e[3],a=e[4],o=e[5],c=e[6],l=e[7],h=e[8],d=e[9],u=e[10],f=e[11],m=e[12],_=e[13],g=e[14],p=e[15],b=t*o-n*a,E=t*c-s*a,v=t*l-r*a,A=n*c-s*o,M=n*l-r*o,w=s*l-r*c,x=h*_-d*m,T=h*g-u*m,R=h*p-f*m,C=d*g-u*_,D=d*p-f*_,I=u*p-f*g,V=b*I-E*D+v*C+A*R-M*T+w*x;if(V===0)return this.set(0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0);let F=1/V;return e[0]=(o*I-c*D+l*C)*F,e[1]=(s*D-n*I-r*C)*F,e[2]=(_*w-g*M+p*A)*F,e[3]=(u*M-d*w-f*A)*F,e[4]=(c*R-a*I-l*T)*F,e[5]=(t*I-s*R+r*T)*F,e[6]=(g*v-m*w-p*E)*F,e[7]=(h*w-u*v+f*E)*F,e[8]=(a*D-o*R+l*x)*F,e[9]=(n*R-t*D-r*x)*F,e[10]=(m*M-_*v+p*b)*F,e[11]=(d*v-h*M-f*b)*F,e[12]=(o*T-a*C-c*x)*F,e[13]=(t*C-n*T+s*x)*F,e[14]=(_*E-m*A-g*b)*F,e[15]=(h*A-d*E+u*b)*F,this}scale(e){let t=this.elements,n=e.x,s=e.y,r=e.z;return t[0]*=n,t[4]*=s,t[8]*=r,t[1]*=n,t[5]*=s,t[9]*=r,t[2]*=n,t[6]*=s,t[10]*=r,t[3]*=n,t[7]*=s,t[11]*=r,this}getMaxScaleOnAxis(){let e=this.elements,t=e[0]*e[0]+e[1]*e[1]+e[2]*e[2],n=e[4]*e[4]+e[5]*e[5]+e[6]*e[6],s=e[8]*e[8]+e[9]*e[9]+e[10]*e[10];return Math.sqrt(Math.max(t,n,s))}makeTranslation(e,t,n){return e.isVector3?this.set(1,0,0,e.x,0,1,0,e.y,0,0,1,e.z,0,0,0,1):this.set(1,0,0,e,0,1,0,t,0,0,1,n,0,0,0,1),this}makeRotationX(e){let t=Math.cos(e),n=Math.sin(e);return this.set(1,0,0,0,0,t,-n,0,0,n,t,0,0,0,0,1),this}makeRotationY(e){let t=Math.cos(e),n=Math.sin(e);return this.set(t,0,n,0,0,1,0,0,-n,0,t,0,0,0,0,1),this}makeRotationZ(e){let t=Math.cos(e),n=Math.sin(e);return this.set(t,-n,0,0,n,t,0,0,0,0,1,0,0,0,0,1),this}makeRotationAxis(e,t){let n=Math.cos(t),s=Math.sin(t),r=1-n,a=e.x,o=e.y,c=e.z,l=r*a,h=r*o;return this.set(l*a+n,l*o-s*c,l*c+s*o,0,l*o+s*c,h*o+n,h*c-s*a,0,l*c-s*o,h*c+s*a,r*c*c+n,0,0,0,0,1),this}makeScale(e,t,n){return this.set(e,0,0,0,0,t,0,0,0,0,n,0,0,0,0,1),this}makeShear(e,t,n,s,r,a){return this.set(1,n,r,0,e,1,a,0,t,s,1,0,0,0,0,1),this}compose(e,t,n){let s=this.elements,r=t._x,a=t._y,o=t._z,c=t._w,l=r+r,h=a+a,d=o+o,u=r*l,f=r*h,m=r*d,_=a*h,g=a*d,p=o*d,b=c*l,E=c*h,v=c*d,A=n.x,M=n.y,w=n.z;return s[0]=(1-(_+p))*A,s[1]=(f+v)*A,s[2]=(m-E)*A,s[3]=0,s[4]=(f-v)*M,s[5]=(1-(u+p))*M,s[6]=(g+b)*M,s[7]=0,s[8]=(m+E)*w,s[9]=(g-b)*w,s[10]=(1-(u+_))*w,s[11]=0,s[12]=e.x,s[13]=e.y,s[14]=e.z,s[15]=1,this}decompose(e,t,n){let s=this.elements;e.x=s[12],e.y=s[13],e.z=s[14];let r=this.determinantAffine();if(r===0)return n.set(1,1,1),t.identity(),this;let a=ls.set(s[0],s[1],s[2]).length(),o=ls.set(s[4],s[5],s[6]).length(),c=ls.set(s[8],s[9],s[10]).length();r<0&&(a=-a),vn.copy(this);let l=1/a,h=1/o,d=1/c;return vn.elements[0]*=l,vn.elements[1]*=l,vn.elements[2]*=l,vn.elements[4]*=h,vn.elements[5]*=h,vn.elements[6]*=h,vn.elements[8]*=d,vn.elements[9]*=d,vn.elements[10]*=d,t.setFromRotationMatrix(vn),n.x=a,n.y=o,n.z=c,this}makePerspective(e,t,n,s,r,a,o=En,c=!1){let l=this.elements,h=2*r/(t-e),d=2*r/(n-s),u=(t+e)/(t-e),f=(n+s)/(n-s),m,_;if(c)m=r/(a-r),_=a*r/(a-r);else if(o===En)m=-(a+r)/(a-r),_=-2*a*r/(a-r);else if(o===ir)m=-a/(a-r),_=-a*r/(a-r);else throw new Error("THREE.Matrix4.makePerspective(): Invalid coordinate system: "+o);return l[0]=h,l[4]=0,l[8]=u,l[12]=0,l[1]=0,l[5]=d,l[9]=f,l[13]=0,l[2]=0,l[6]=0,l[10]=m,l[14]=_,l[3]=0,l[7]=0,l[11]=-1,l[15]=0,this}makeOrthographic(e,t,n,s,r,a,o=En,c=!1){let l=this.elements,h=2/(t-e),d=2/(n-s),u=-(t+e)/(t-e),f=-(n+s)/(n-s),m,_;if(c)m=1/(a-r),_=a/(a-r);else if(o===En)m=-2/(a-r),_=-(a+r)/(a-r);else if(o===ir)m=-1/(a-r),_=-r/(a-r);else throw new Error("THREE.Matrix4.makeOrthographic(): Invalid coordinate system: "+o);return l[0]=h,l[4]=0,l[8]=0,l[12]=u,l[1]=0,l[5]=d,l[9]=0,l[13]=f,l[2]=0,l[6]=0,l[10]=m,l[14]=_,l[3]=0,l[7]=0,l[11]=0,l[15]=1,this}equals(e){let t=this.elements,n=e.elements;for(let s=0;s<16;s++)if(t[s]!==n[s])return!1;return!0}fromArray(e,t=0){for(let n=0;n<16;n++)this.elements[n]=e[n+t];return this}toArray(e=[],t=0){let n=this.elements;return e[t]=n[0],e[t+1]=n[1],e[t+2]=n[2],e[t+3]=n[3],e[t+4]=n[4],e[t+5]=n[5],e[t+6]=n[6],e[t+7]=n[7],e[t+8]=n[8],e[t+9]=n[9],e[t+10]=n[10],e[t+11]=n[11],e[t+12]=n[12],e[t+13]=n[13],e[t+14]=n[14],e[t+15]=n[15],e}};wo.prototype.isMatrix4=!0;var at=wo,ls=new L,vn=new at,Ip=new L(0,0,0),Lp=new L(1,1,1),di=new L,la=new L,rn=new L,gu=new at,xu=new kn,bi=class i{constructor(e=0,t=0,n=0,s=i.DEFAULT_ORDER){this.isEuler=!0,this._x=e,this._y=t,this._z=n,this._order=s}get x(){return this._x}set x(e){this._x=e,this._onChangeCallback()}get y(){return this._y}set y(e){this._y=e,this._onChangeCallback()}get z(){return this._z}set z(e){this._z=e,this._onChangeCallback()}get order(){return this._order}set order(e){this._order=e,this._onChangeCallback()}set(e,t,n,s=this._order){return this._x=e,this._y=t,this._z=n,this._order=s,this._onChangeCallback(),this}clone(){return new this.constructor(this._x,this._y,this._z,this._order)}copy(e){return this._x=e._x,this._y=e._y,this._z=e._z,this._order=e._order,this._onChangeCallback(),this}setFromRotationMatrix(e,t=this._order,n=!0){let s=e.elements,r=s[0],a=s[4],o=s[8],c=s[1],l=s[5],h=s[9],d=s[2],u=s[6],f=s[10];switch(t){case"XYZ":this._y=Math.asin(Ue(o,-1,1)),Math.abs(o)<.9999999?(this._x=Math.atan2(-h,f),this._z=Math.atan2(-a,r)):(this._x=Math.atan2(u,l),this._z=0);break;case"YXZ":this._x=Math.asin(-Ue(h,-1,1)),Math.abs(h)<.9999999?(this._y=Math.atan2(o,f),this._z=Math.atan2(c,l)):(this._y=Math.atan2(-d,r),this._z=0);break;case"ZXY":this._x=Math.asin(Ue(u,-1,1)),Math.abs(u)<.9999999?(this._y=Math.atan2(-d,f),this._z=Math.atan2(-a,l)):(this._y=0,this._z=Math.atan2(c,r));break;case"ZYX":this._y=Math.asin(-Ue(d,-1,1)),Math.abs(d)<.9999999?(this._x=Math.atan2(u,f),this._z=Math.atan2(c,r)):(this._x=0,this._z=Math.atan2(-a,l));break;case"YZX":this._z=Math.asin(Ue(c,-1,1)),Math.abs(c)<.9999999?(this._x=Math.atan2(-h,l),this._y=Math.atan2(-d,r)):(this._x=0,this._y=Math.atan2(o,f));break;case"XZY":this._z=Math.asin(-Ue(a,-1,1)),Math.abs(a)<.9999999?(this._x=Math.atan2(u,l),this._y=Math.atan2(o,r)):(this._x=Math.atan2(-h,f),this._y=0);break;default:Pe("Euler: .setFromRotationMatrix() encountered an unknown order: "+t)}return this._order=t,n===!0&&this._onChangeCallback(),this}setFromQuaternion(e,t,n){return gu.makeRotationFromQuaternion(e),this.setFromRotationMatrix(gu,t,n)}setFromVector3(e,t=this._order){return this.set(e.x,e.y,e.z,t)}reorder(e){return xu.setFromEuler(this),this.setFromQuaternion(xu,e)}equals(e){return e._x===this._x&&e._y===this._y&&e._z===this._z&&e._order===this._order}fromArray(e){return this._x=e[0],this._y=e[1],this._z=e[2],e[3]!==void 0&&(this._order=e[3]),this._onChangeCallback(),this}toArray(e=[],t=0){return e[t]=this._x,e[t+1]=this._y,e[t+2]=this._z,e[t+3]=this._order,e}_onChange(e){return this._onChangeCallback=e,this}_onChangeCallback(){}*[Symbol.iterator](){yield this._x,yield this._y,yield this._z,yield this._order}};bi.DEFAULT_ORDER="XYZ";var or=class{constructor(){this.mask=1}set(e){this.mask=(1<<e|0)>>>0}enable(e){this.mask|=1<<e|0}enableAll(){this.mask=-1}toggle(e){this.mask^=1<<e|0}disable(e){this.mask&=~(1<<e|0)}disableAll(){this.mask=0}test(e){return(this.mask&e.mask)!==0}isEnabled(e){return(this.mask&(1<<e|0))!==0}},Dp=0,_u=new L,hs=new kn,Zn=new at,ha=new L,Ws=new L,Fp=new L,Up=new kn,yu=new L(1,0,0),vu=new L(0,1,0),bu=new L(0,0,1),Su={type:"added"},Np={type:"removed"},us={type:"childadded",child:null},Jc={type:"childremoved",child:null},ln=class i extends Vn{constructor(){super(),this.isObject3D=!0,Object.defineProperty(this,"id",{value:Dp++}),this.uuid=Bn(),this.name="",this.type="Object3D",this.parent=null,this.children=[],this.up=i.DEFAULT_UP.clone();let e=new L,t=new bi,n=new kn,s=new L(1,1,1);function r(){n.setFromEuler(t,!1)}function a(){t.setFromQuaternion(n,void 0,!1)}t._onChange(r),n._onChange(a),Object.defineProperties(this,{position:{configurable:!0,enumerable:!0,value:e},rotation:{configurable:!0,enumerable:!0,value:t},quaternion:{configurable:!0,enumerable:!0,value:n},scale:{configurable:!0,enumerable:!0,value:s},modelViewMatrix:{value:new at},normalMatrix:{value:new De}}),this.matrix=new at,this.matrixWorld=new at,this.matrixAutoUpdate=i.DEFAULT_MATRIX_AUTO_UPDATE,this.matrixWorldAutoUpdate=i.DEFAULT_MATRIX_WORLD_AUTO_UPDATE,this.matrixWorldNeedsUpdate=!1,this.layers=new or,this.visible=!0,this.castShadow=!1,this.receiveShadow=!1,this.frustumCulled=!0,this.renderOrder=0,this.animations=[],this.customDepthMaterial=void 0,this.customDistanceMaterial=void 0,this.static=!1,this.userData={},this.pivot=null}onBeforeShadow(){}onAfterShadow(){}onBeforeRender(){}onAfterRender(){}applyMatrix4(e){this.matrixAutoUpdate&&this.updateMatrix(),this.matrix.premultiply(e),this.matrix.decompose(this.position,this.quaternion,this.scale)}applyQuaternion(e){return this.quaternion.premultiply(e),this}setRotationFromAxisAngle(e,t){this.quaternion.setFromAxisAngle(e,t)}setRotationFromEuler(e){this.quaternion.setFromEuler(e,!0)}setRotationFromMatrix(e){this.quaternion.setFromRotationMatrix(e)}setRotationFromQuaternion(e){this.quaternion.copy(e)}rotateOnAxis(e,t){return hs.setFromAxisAngle(e,t),this.quaternion.multiply(hs),this}rotateOnWorldAxis(e,t){return hs.setFromAxisAngle(e,t),this.quaternion.premultiply(hs),this}rotateX(e){return this.rotateOnAxis(yu,e)}rotateY(e){return this.rotateOnAxis(vu,e)}rotateZ(e){return this.rotateOnAxis(bu,e)}translateOnAxis(e,t){return _u.copy(e).applyQuaternion(this.quaternion),this.position.add(_u.multiplyScalar(t)),this}translateX(e){return this.translateOnAxis(yu,e)}translateY(e){return this.translateOnAxis(vu,e)}translateZ(e){return this.translateOnAxis(bu,e)}localToWorld(e){return this.updateWorldMatrix(!0,!1),e.applyMatrix4(this.matrixWorld)}worldToLocal(e){return this.updateWorldMatrix(!0,!1),e.applyMatrix4(Zn.copy(this.matrixWorld).invert())}lookAt(e,t,n){e.isVector3?ha.copy(e):ha.set(e,t,n);let s=this.parent;this.updateWorldMatrix(!0,!1),Ws.setFromMatrixPosition(this.matrixWorld),this.isCamera||this.isLight?Zn.lookAt(Ws,ha,this.up):Zn.lookAt(ha,Ws,this.up),this.quaternion.setFromRotationMatrix(Zn),s&&(Zn.extractRotation(s.matrixWorld),hs.setFromRotationMatrix(Zn),this.quaternion.premultiply(hs.invert()))}add(e){if(arguments.length>1){for(let t=0;t<arguments.length;t++)this.add(arguments[t]);return this}return e===this?(Ie("Object3D.add: object can't be added as a child of itself.",e),this):(e&&e.isObject3D?(e.removeFromParent(),e.parent=this,this.children.push(e),e.dispatchEvent(Su),us.child=e,this.dispatchEvent(us),us.child=null):Ie("Object3D.add: object not an instance of THREE.Object3D.",e),this)}remove(e){if(arguments.length>1){for(let n=0;n<arguments.length;n++)this.remove(arguments[n]);return this}let t=this.children.indexOf(e);return t!==-1&&(e.parent=null,this.children.splice(t,1),e.dispatchEvent(Np),Jc.child=e,this.dispatchEvent(Jc),Jc.child=null),this}removeFromParent(){let e=this.parent;return e!==null&&e.remove(this),this}clear(){return this.remove(...this.children)}attach(e){return this.updateWorldMatrix(!0,!1),Zn.copy(this.matrixWorld).invert(),e.parent!==null&&(e.parent.updateWorldMatrix(!0,!1),Zn.multiply(e.parent.matrixWorld)),e.applyMatrix4(Zn),e.removeFromParent(),e.parent=this,this.children.push(e),e.updateWorldMatrix(!1,!0),e.dispatchEvent(Su),us.child=e,this.dispatchEvent(us),us.child=null,this}getObjectById(e){return this.getObjectByProperty("id",e)}getObjectByName(e){return this.getObjectByProperty("name",e)}getObjectByProperty(e,t){if(this[e]===t)return this;for(let n=0,s=this.children.length;n<s;n++){let a=this.children[n].getObjectByProperty(e,t);if(a!==void 0)return a}}getObjectsByProperty(e,t,n=[]){this[e]===t&&n.push(this);let s=this.children;for(let r=0,a=s.length;r<a;r++)s[r].getObjectsByProperty(e,t,n);return n}getWorldPosition(e){return this.updateWorldMatrix(!0,!1),e.setFromMatrixPosition(this.matrixWorld)}getWorldQuaternion(e){return this.updateWorldMatrix(!0,!1),this.matrixWorld.decompose(Ws,e,Fp),e}getWorldScale(e){return this.updateWorldMatrix(!0,!1),this.matrixWorld.decompose(Ws,Up,e),e}getWorldDirection(e){this.updateWorldMatrix(!0,!1);let t=this.matrixWorld.elements;return e.set(t[8],t[9],t[10]).normalize()}raycast(){}traverse(e){e(this);let t=this.children;for(let n=0,s=t.length;n<s;n++)t[n].traverse(e)}traverseVisible(e){if(this.visible===!1)return;e(this);let t=this.children;for(let n=0,s=t.length;n<s;n++)t[n].traverseVisible(e)}traverseAncestors(e){let t=this.parent;t!==null&&(e(t),t.traverseAncestors(e))}updateMatrix(){this.matrix.compose(this.position,this.quaternion,this.scale);let e=this.pivot;if(e!==null){let t=e.x,n=e.y,s=e.z,r=this.matrix.elements;r[12]+=t-r[0]*t-r[4]*n-r[8]*s,r[13]+=n-r[1]*t-r[5]*n-r[9]*s,r[14]+=s-r[2]*t-r[6]*n-r[10]*s}this.matrixWorldNeedsUpdate=!0}updateMatrixWorld(e){this.matrixAutoUpdate&&this.updateMatrix(),(this.matrixWorldNeedsUpdate||e)&&(this.matrixWorldAutoUpdate===!0&&(this.parent===null?this.matrixWorld.copy(this.matrix):this.matrixWorld.multiplyMatrices(this.parent.matrixWorld,this.matrix)),this.matrixWorldNeedsUpdate=!1,e=!0);let t=this.children;for(let n=0,s=t.length;n<s;n++)t[n].updateMatrixWorld(e)}updateWorldMatrix(e,t,n=!1){let s=this.parent;if(e===!0&&s!==null&&s.updateWorldMatrix(!0,!1),this.matrixAutoUpdate&&this.updateMatrix(),(this.matrixWorldNeedsUpdate||n)&&(this.matrixWorldAutoUpdate===!0&&(this.parent===null?this.matrixWorld.copy(this.matrix):this.matrixWorld.multiplyMatrices(this.parent.matrixWorld,this.matrix)),this.matrixWorldNeedsUpdate=!1,n=!0),t===!0){let r=this.children;for(let a=0,o=r.length;a<o;a++)r[a].updateWorldMatrix(!1,!0,n)}}toJSON(e){let t=e===void 0||typeof e=="string",n={};t&&(e={geometries:{},materials:{},textures:{},images:{},shapes:{},skeletons:{},animations:{},nodes:{}},n.metadata={version:4.7,type:"Object",generator:"Object3D.toJSON"});let s={};s.uuid=this.uuid,s.type=this.type,this.name!==""&&(s.name=this.name),this.castShadow===!0&&(s.castShadow=!0),this.receiveShadow===!0&&(s.receiveShadow=!0),this.visible===!1&&(s.visible=!1),this.frustumCulled===!1&&(s.frustumCulled=!1),this.renderOrder!==0&&(s.renderOrder=this.renderOrder),this.static!==!1&&(s.static=this.static),Object.keys(this.userData).length>0&&(s.userData=this.userData),s.layers=this.layers.mask,s.matrix=this.matrix.toArray(),s.up=this.up.toArray(),this.pivot!==null&&(s.pivot=this.pivot.toArray()),this.matrixAutoUpdate===!1&&(s.matrixAutoUpdate=!1),this.morphTargetDictionary!==void 0&&(s.morphTargetDictionary=Object.assign({},this.morphTargetDictionary)),this.morphTargetInfluences!==void 0&&(s.morphTargetInfluences=this.morphTargetInfluences.slice()),this.isInstancedMesh&&(s.type="InstancedMesh",s.count=this.count,s.instanceMatrix=this.instanceMatrix.toJSON(),this.instanceColor!==null&&(s.instanceColor=this.instanceColor.toJSON())),this.isBatchedMesh&&(s.type="BatchedMesh",s.perObjectFrustumCulled=this.perObjectFrustumCulled,s.sortObjects=this.sortObjects,s.drawRanges=this._drawRanges,s.reservedRanges=this._reservedRanges,s.geometryInfo=this._geometryInfo.map(o=>({...o,boundingBox:o.boundingBox?o.boundingBox.toJSON():void 0,boundingSphere:o.boundingSphere?o.boundingSphere.toJSON():void 0})),s.instanceInfo=this._instanceInfo.map(o=>({...o})),s.availableInstanceIds=this._availableInstanceIds.slice(),s.availableGeometryIds=this._availableGeometryIds.slice(),s.nextIndexStart=this._nextIndexStart,s.nextVertexStart=this._nextVertexStart,s.geometryCount=this._geometryCount,s.maxInstanceCount=this._maxInstanceCount,s.maxVertexCount=this._maxVertexCount,s.maxIndexCount=this._maxIndexCount,s.geometryInitialized=this._geometryInitialized,s.matricesTexture=this._matricesTexture.toJSON(e),s.indirectTexture=this._indirectTexture.toJSON(e),this._colorsTexture!==null&&(s.colorsTexture=this._colorsTexture.toJSON(e)),this.boundingSphere!==null&&(s.boundingSphere=this.boundingSphere.toJSON()),this.boundingBox!==null&&(s.boundingBox=this.boundingBox.toJSON()));function r(o,c){return o[c.uuid]===void 0&&(o[c.uuid]=c.toJSON(e)),c.uuid}if(this.isScene)this.background&&(this.background.isColor?s.background=this.background.toJSON():this.background.isTexture&&(s.background=this.background.toJSON(e).uuid)),this.environment&&this.environment.isTexture&&this.environment.isRenderTargetTexture!==!0&&(s.environment=this.environment.toJSON(e).uuid);else if(this.isMesh||this.isLine||this.isPoints){s.geometry=r(e.geometries,this.geometry);let o=this.geometry.parameters;if(o!==void 0&&o.shapes!==void 0){let c=o.shapes;if(Array.isArray(c))for(let l=0,h=c.length;l<h;l++){let d=c[l];r(e.shapes,d)}else r(e.shapes,c)}}if(this.isSkinnedMesh&&(s.bindMode=this.bindMode,s.bindMatrix=this.bindMatrix.toArray(),this.skeleton!==void 0&&(r(e.skeletons,this.skeleton),s.skeleton=this.skeleton.uuid)),this.material!==void 0)if(Array.isArray(this.material)){let o=[];for(let c=0,l=this.material.length;c<l;c++)o.push(r(e.materials,this.material[c]));s.material=o}else s.material=r(e.materials,this.material);if(this.children.length>0){s.children=[];for(let o=0;o<this.children.length;o++)s.children.push(this.children[o].toJSON(e).object)}if(this.animations.length>0){s.animations=[];for(let o=0;o<this.animations.length;o++){let c=this.animations[o];s.animations.push(r(e.animations,c))}}if(t){let o=a(e.geometries),c=a(e.materials),l=a(e.textures),h=a(e.images),d=a(e.shapes),u=a(e.skeletons),f=a(e.animations),m=a(e.nodes);o.length>0&&(n.geometries=o),c.length>0&&(n.materials=c),l.length>0&&(n.textures=l),h.length>0&&(n.images=h),d.length>0&&(n.shapes=d),u.length>0&&(n.skeletons=u),f.length>0&&(n.animations=f),m.length>0&&(n.nodes=m)}return n.object=s,n;function a(o){let c=[];for(let l in o){let h=o[l];delete h.metadata,c.push(h)}return c}}clone(e){return new this.constructor().copy(this,e)}copy(e,t=!0){if(this.name=e.name,this.up.copy(e.up),this.position.copy(e.position),this.rotation.order=e.rotation.order,this.quaternion.copy(e.quaternion),this.scale.copy(e.scale),this.pivot=e.pivot!==null?e.pivot.clone():null,this.matrix.copy(e.matrix),this.matrixWorld.copy(e.matrixWorld),this.matrixAutoUpdate=e.matrixAutoUpdate,this.matrixWorldAutoUpdate=e.matrixWorldAutoUpdate,this.matrixWorldNeedsUpdate=e.matrixWorldNeedsUpdate,this.layers.mask=e.layers.mask,this.visible=e.visible,this.castShadow=e.castShadow,this.receiveShadow=e.receiveShadow,this.frustumCulled=e.frustumCulled,this.renderOrder=e.renderOrder,this.static=e.static,this.animations=e.animations.slice(),this.userData=JSON.parse(JSON.stringify(e.userData)),t===!0)for(let n=0;n<e.children.length;n++){let s=e.children[n];this.add(s.clone())}return this}};ln.DEFAULT_UP=new L(0,1,0);ln.DEFAULT_MATRIX_AUTO_UPDATE=!0;ln.DEFAULT_MATRIX_WORLD_AUTO_UPDATE=!0;var On=class extends ln{constructor(){super(),this.isGroup=!0,this.type="Group"}},Op={type:"move"},Ts=class{constructor(){this._targetRay=null,this._grip=null,this._hand=null}getHandSpace(){return this._hand===null&&(this._hand=new On,this._hand.matrixAutoUpdate=!1,this._hand.visible=!1,this._hand.joints={},this._hand.inputState={pinching:!1}),this._hand}getTargetRaySpace(){return this._targetRay===null&&(this._targetRay=new On,this._targetRay.matrixAutoUpdate=!1,this._targetRay.visible=!1,this._targetRay.hasLinearVelocity=!1,this._targetRay.linearVelocity=new L,this._targetRay.hasAngularVelocity=!1,this._targetRay.angularVelocity=new L),this._targetRay}getGripSpace(){return this._grip===null&&(this._grip=new On,this._grip.matrixAutoUpdate=!1,this._grip.visible=!1,this._grip.hasLinearVelocity=!1,this._grip.linearVelocity=new L,this._grip.hasAngularVelocity=!1,this._grip.angularVelocity=new L,this._grip.eventsEnabled=!1),this._grip}dispatchEvent(e){return this._targetRay!==null&&this._targetRay.dispatchEvent(e),this._grip!==null&&this._grip.dispatchEvent(e),this._hand!==null&&this._hand.dispatchEvent(e),this}connect(e){if(e&&e.hand){let t=this._hand;if(t)for(let n of e.hand.values())this._getHandJoint(t,n)}return this.dispatchEvent({type:"connected",data:e}),this}disconnect(e){return this.dispatchEvent({type:"disconnected",data:e}),this._targetRay!==null&&(this._targetRay.visible=!1),this._grip!==null&&(this._grip.visible=!1),this._hand!==null&&(this._hand.visible=!1),this}update(e,t,n){let s=null,r=null,a=null,o=this._targetRay,c=this._grip,l=this._hand;if(e&&t.session.visibilityState!=="visible-blurred"){if(l&&e.hand){a=!0;for(let _ of e.hand.values()){let g=t.getJointPose(_,n),p=this._getHandJoint(l,_);g!==null&&(p.matrix.fromArray(g.transform.matrix),p.matrix.decompose(p.position,p.rotation,p.scale),p.matrixWorldNeedsUpdate=!0,p.jointRadius=g.radius),p.visible=g!==null}let h=l.joints["index-finger-tip"],d=l.joints["thumb-tip"],u=h.position.distanceTo(d.position),f=.02,m=.005;l.inputState.pinching&&u>f+m?(l.inputState.pinching=!1,this.dispatchEvent({type:"pinchend",handedness:e.handedness,target:this})):!l.inputState.pinching&&u<=f-m&&(l.inputState.pinching=!0,this.dispatchEvent({type:"pinchstart",handedness:e.handedness,target:this}))}else c!==null&&e.gripSpace&&(r=t.getPose(e.gripSpace,n),r!==null&&(c.matrix.fromArray(r.transform.matrix),c.matrix.decompose(c.position,c.rotation,c.scale),c.matrixWorldNeedsUpdate=!0,r.linearVelocity?(c.hasLinearVelocity=!0,c.linearVelocity.copy(r.linearVelocity)):c.hasLinearVelocity=!1,r.angularVelocity?(c.hasAngularVelocity=!0,c.angularVelocity.copy(r.angularVelocity)):c.hasAngularVelocity=!1,c.eventsEnabled&&c.dispatchEvent({type:"gripUpdated",data:e,target:this})));o!==null&&(s=t.getPose(e.targetRaySpace,n),s===null&&r!==null&&(s=r),s!==null&&(o.matrix.fromArray(s.transform.matrix),o.matrix.decompose(o.position,o.rotation,o.scale),o.matrixWorldNeedsUpdate=!0,s.linearVelocity?(o.hasLinearVelocity=!0,o.linearVelocity.copy(s.linearVelocity)):o.hasLinearVelocity=!1,s.angularVelocity?(o.hasAngularVelocity=!0,o.angularVelocity.copy(s.angularVelocity)):o.hasAngularVelocity=!1,this.dispatchEvent(Op)))}return o!==null&&(o.visible=s!==null),c!==null&&(c.visible=r!==null),l!==null&&(l.visible=a!==null),this}_getHandJoint(e,t){if(e.joints[t.jointName]===void 0){let n=new On;n.matrixAutoUpdate=!1,n.visible=!1,e.joints[t.jointName]=n,e.add(n)}return e.joints[t.jointName]}},wd={aliceblue:15792383,antiquewhite:16444375,aqua:65535,aquamarine:8388564,azure:15794175,beige:16119260,bisque:16770244,black:0,blanchedalmond:16772045,blue:255,blueviolet:9055202,brown:10824234,burlywood:14596231,cadetblue:6266528,chartreuse:8388352,chocolate:13789470,coral:16744272,cornflowerblue:6591981,cornsilk:16775388,crimson:14423100,cyan:65535,darkblue:139,darkcyan:35723,darkgoldenrod:12092939,darkgray:11119017,darkgreen:25600,darkgrey:11119017,darkkhaki:12433259,darkmagenta:9109643,darkolivegreen:5597999,darkorange:16747520,darkorchid:10040012,darkred:9109504,darksalmon:15308410,darkseagreen:9419919,darkslateblue:4734347,darkslategray:3100495,darkslategrey:3100495,darkturquoise:52945,darkviolet:9699539,deeppink:16716947,deepskyblue:49151,dimgray:6908265,dimgrey:6908265,dodgerblue:2003199,firebrick:11674146,floralwhite:16775920,forestgreen:2263842,fuchsia:16711935,gainsboro:14474460,ghostwhite:16316671,gold:16766720,goldenrod:14329120,gray:8421504,green:32768,greenyellow:11403055,grey:8421504,honeydew:15794160,hotpink:16738740,indianred:13458524,indigo:4915330,ivory:16777200,khaki:15787660,lavender:15132410,lavenderblush:16773365,lawngreen:8190976,lemonchiffon:16775885,lightblue:11393254,lightcoral:15761536,lightcyan:14745599,lightgoldenrodyellow:16448210,lightgray:13882323,lightgreen:9498256,lightgrey:13882323,lightpink:16758465,lightsalmon:16752762,lightseagreen:2142890,lightskyblue:8900346,lightslategray:7833753,lightslategrey:7833753,lightsteelblue:11584734,lightyellow:16777184,lime:65280,limegreen:3329330,linen:16445670,magenta:16711935,maroon:8388608,mediumaquamarine:6737322,mediumblue:205,mediumorchid:12211667,mediumpurple:9662683,mediumseagreen:3978097,mediumslateblue:8087790,mediumspringgreen:64154,mediumturquoise:4772300,mediumvioletred:13047173,midnightblue:1644912,mintcream:16121850,mistyrose:16770273,moccasin:16770229,navajowhite:16768685,navy:128,oldlace:16643558,olive:8421376,olivedrab:7048739,orange:16753920,orangered:16729344,orchid:14315734,palegoldenrod:15657130,palegreen:10025880,paleturquoise:11529966,palevioletred:14381203,papayawhip:16773077,peachpuff:16767673,peru:13468991,pink:16761035,plum:14524637,powderblue:11591910,purple:8388736,rebeccapurple:6697881,red:16711680,rosybrown:12357519,royalblue:4286945,saddlebrown:9127187,salmon:16416882,sandybrown:16032864,seagreen:3050327,seashell:16774638,sienna:10506797,silver:12632256,skyblue:8900331,slateblue:6970061,slategray:7372944,slategrey:7372944,snow:16775930,springgreen:65407,steelblue:4620980,tan:13808780,teal:32896,thistle:14204888,tomato:16737095,turquoise:4251856,violet:15631086,wheat:16113331,white:16777215,whitesmoke:16119285,yellow:16776960,yellowgreen:10145074},fi={h:0,s:0,l:0},ua={h:0,s:0,l:0};function jc(i,e,t){return t<0&&(t+=1),t>1&&(t-=1),t<1/6?i+(e-i)*6*t:t<1/2?e:t<2/3?i+(e-i)*6*(2/3-t):i}var Xe=class{constructor(e,t,n){return this.isColor=!0,this.r=1,this.g=1,this.b=1,this.set(e,t,n)}set(e,t,n){if(t===void 0&&n===void 0){let s=e;s&&s.isColor?this.copy(s):typeof s=="number"?this.setHex(s):typeof s=="string"&&this.setStyle(s)}else this.setRGB(e,t,n);return this}setScalar(e){return this.r=e,this.g=e,this.b=e,this}setHex(e,t=on){return e=Math.floor(e),this.r=(e>>16&255)/255,this.g=(e>>8&255)/255,this.b=(e&255)/255,We.colorSpaceToWorking(this,t),this}setRGB(e,t,n,s=We.workingColorSpace){return this.r=e,this.g=t,this.b=n,We.colorSpaceToWorking(this,s),this}setHSL(e,t,n,s=We.workingColorSpace){if(e=Jl(e,1),t=Ue(t,0,1),n=Ue(n,0,1),t===0)this.r=this.g=this.b=n;else{let r=n<=.5?n*(1+t):n+t-n*t,a=2*n-r;this.r=jc(a,r,e+1/3),this.g=jc(a,r,e),this.b=jc(a,r,e-1/3)}return We.colorSpaceToWorking(this,s),this}setStyle(e,t=on){function n(r){r!==void 0&&parseFloat(r)<1&&Pe("Color: Alpha component of "+e+" will be ignored.")}let s;if(s=/^(\w+)\(([^\)]*)\)/.exec(e)){let r,a=s[1],o=s[2];switch(a){case"rgb":case"rgba":if(r=/^\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(o))return n(r[4]),this.setRGB(Math.min(255,parseInt(r[1],10))/255,Math.min(255,parseInt(r[2],10))/255,Math.min(255,parseInt(r[3],10))/255,t);if(r=/^\s*(\d+)\%\s*,\s*(\d+)\%\s*,\s*(\d+)\%\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(o))return n(r[4]),this.setRGB(Math.min(100,parseInt(r[1],10))/100,Math.min(100,parseInt(r[2],10))/100,Math.min(100,parseInt(r[3],10))/100,t);break;case"hsl":case"hsla":if(r=/^\s*(\d*\.?\d+)\s*,\s*(\d*\.?\d+)\%\s*,\s*(\d*\.?\d+)\%\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(o))return n(r[4]),this.setHSL(parseFloat(r[1])/360,parseFloat(r[2])/100,parseFloat(r[3])/100,t);break;default:Pe("Color: Unknown color model "+e)}}else if(s=/^\#([A-Fa-f\d]+)$/.exec(e)){let r=s[1],a=r.length;if(a===3)return this.setRGB(parseInt(r.charAt(0),16)/15,parseInt(r.charAt(1),16)/15,parseInt(r.charAt(2),16)/15,t);if(a===6)return this.setHex(parseInt(r,16),t);Pe("Color: Invalid hex color "+e)}else if(e&&e.length>0)return this.setColorName(e,t);return this}setColorName(e,t=on){let n=wd[e.toLowerCase()];return n!==void 0?this.setHex(n,t):Pe("Color: Unknown color "+e),this}clone(){return new this.constructor(this.r,this.g,this.b)}copy(e){return this.r=e.r,this.g=e.g,this.b=e.b,this}copySRGBToLinear(e){return this.r=ti(e.r),this.g=ti(e.g),this.b=ti(e.b),this}copyLinearToSRGB(e){return this.r=Ss(e.r),this.g=Ss(e.g),this.b=Ss(e.b),this}convertSRGBToLinear(){return this.copySRGBToLinear(this),this}convertLinearToSRGB(){return this.copyLinearToSRGB(this),this}getHex(e=on){return We.workingToColorSpace(Gt.copy(this),e),Math.round(Ue(Gt.r*255,0,255))*65536+Math.round(Ue(Gt.g*255,0,255))*256+Math.round(Ue(Gt.b*255,0,255))}getHexString(e=on){return("000000"+this.getHex(e).toString(16)).slice(-6)}getHSL(e,t=We.workingColorSpace){We.workingToColorSpace(Gt.copy(this),t);let n=Gt.r,s=Gt.g,r=Gt.b,a=Math.max(n,s,r),o=Math.min(n,s,r),c,l,h=(o+a)/2;if(o===a)c=0,l=0;else{let d=a-o;switch(l=h<=.5?d/(a+o):d/(2-a-o),a){case n:c=(s-r)/d+(s<r?6:0);break;case s:c=(r-n)/d+2;break;case r:c=(n-s)/d+4;break}c/=6}return e.h=c,e.s=l,e.l=h,e}getRGB(e,t=We.workingColorSpace){return We.workingToColorSpace(Gt.copy(this),t),e.r=Gt.r,e.g=Gt.g,e.b=Gt.b,e}getStyle(e=on){We.workingToColorSpace(Gt.copy(this),e);let t=Gt.r,n=Gt.g,s=Gt.b;return e!==on?`color(${e} ${t.toFixed(3)} ${n.toFixed(3)} ${s.toFixed(3)})`:`rgb(${Math.round(t*255)},${Math.round(n*255)},${Math.round(s*255)})`}offsetHSL(e,t,n){return this.getHSL(fi),this.setHSL(fi.h+e,fi.s+t,fi.l+n)}add(e){return this.r+=e.r,this.g+=e.g,this.b+=e.b,this}addColors(e,t){return this.r=e.r+t.r,this.g=e.g+t.g,this.b=e.b+t.b,this}addScalar(e){return this.r+=e,this.g+=e,this.b+=e,this}sub(e){return this.r=Math.max(0,this.r-e.r),this.g=Math.max(0,this.g-e.g),this.b=Math.max(0,this.b-e.b),this}multiply(e){return this.r*=e.r,this.g*=e.g,this.b*=e.b,this}multiplyScalar(e){return this.r*=e,this.g*=e,this.b*=e,this}lerp(e,t){return this.r+=(e.r-this.r)*t,this.g+=(e.g-this.g)*t,this.b+=(e.b-this.b)*t,this}lerpColors(e,t,n){return this.r=e.r+(t.r-e.r)*n,this.g=e.g+(t.g-e.g)*n,this.b=e.b+(t.b-e.b)*n,this}lerpHSL(e,t){this.getHSL(fi),e.getHSL(ua);let n=Js(fi.h,ua.h,t),s=Js(fi.s,ua.s,t),r=Js(fi.l,ua.l,t);return this.setHSL(n,s,r),this}setFromVector3(e){return this.r=e.x,this.g=e.y,this.b=e.z,this}applyMatrix3(e){let t=this.r,n=this.g,s=this.b,r=e.elements;return this.r=r[0]*t+r[3]*n+r[6]*s,this.g=r[1]*t+r[4]*n+r[7]*s,this.b=r[2]*t+r[5]*n+r[8]*s,this}equals(e){return e.r===this.r&&e.g===this.g&&e.b===this.b}fromArray(e,t=0){return this.r=e[t],this.g=e[t+1],this.b=e[t+2],this}toArray(e=[],t=0){return e[t]=this.r,e[t+1]=this.g,e[t+2]=this.b,e}fromBufferAttribute(e,t){return this.r=e.getX(t),this.g=e.getY(t),this.b=e.getZ(t),this}toJSON(){return this.getHex()}*[Symbol.iterator](){yield this.r,yield this.g,yield this.b}},Gt=new Xe;Xe.NAMES=wd;var cr=class extends ln{constructor(){super(),this.isScene=!0,this.type="Scene",this.background=null,this.environment=null,this.fog=null,this.backgroundBlurriness=0,this.backgroundIntensity=1,this.backgroundRotation=new bi,this.environmentIntensity=1,this.environmentRotation=new bi,this.overrideMaterial=null,typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("observe",{detail:this}))}copy(e,t){return super.copy(e,t),e.background!==null&&(this.background=e.background.clone()),e.environment!==null&&(this.environment=e.environment.clone()),e.fog!==null&&(this.fog=e.fog.clone()),this.backgroundBlurriness=e.backgroundBlurriness,this.backgroundIntensity=e.backgroundIntensity,this.backgroundRotation.copy(e.backgroundRotation),this.environmentIntensity=e.environmentIntensity,this.environmentRotation.copy(e.environmentRotation),e.overrideMaterial!==null&&(this.overrideMaterial=e.overrideMaterial.clone()),this.matrixAutoUpdate=e.matrixAutoUpdate,this}toJSON(e){let t=super.toJSON(e);return this.fog!==null&&(t.object.fog=this.fog.toJSON()),this.backgroundBlurriness>0&&(t.object.backgroundBlurriness=this.backgroundBlurriness),this.backgroundIntensity!==1&&(t.object.backgroundIntensity=this.backgroundIntensity),t.object.backgroundRotation=this.backgroundRotation.toArray(),this.environmentIntensity!==1&&(t.object.environmentIntensity=this.environmentIntensity),t.object.environmentRotation=this.environmentRotation.toArray(),t}},bn=new L,Jn=new L,Qc=new L,jn=new L,ds=new L,fs=new L,Mu=new L,el=new L,tl=new L,nl=new L,il=new tt,sl=new tt,rl=new tt,_i=class i{constructor(e=new L,t=new L,n=new L){this.a=e,this.b=t,this.c=n}static getNormal(e,t,n,s){s.subVectors(n,t),bn.subVectors(e,t),s.cross(bn);let r=s.lengthSq();return r>0?s.multiplyScalar(1/Math.sqrt(r)):s.set(0,0,0)}static getBarycoord(e,t,n,s,r){bn.subVectors(s,t),Jn.subVectors(n,t),Qc.subVectors(e,t);let a=bn.dot(bn),o=bn.dot(Jn),c=bn.dot(Qc),l=Jn.dot(Jn),h=Jn.dot(Qc),d=a*l-o*o;if(d===0)return r.set(0,0,0),null;let u=1/d,f=(l*c-o*h)*u,m=(a*h-o*c)*u;return r.set(1-f-m,m,f)}static containsPoint(e,t,n,s){return this.getBarycoord(e,t,n,s,jn)===null?!1:jn.x>=0&&jn.y>=0&&jn.x+jn.y<=1}static getInterpolation(e,t,n,s,r,a,o,c){return this.getBarycoord(e,t,n,s,jn)===null?(c.x=0,c.y=0,"z"in c&&(c.z=0),"w"in c&&(c.w=0),null):(c.setScalar(0),c.addScaledVector(r,jn.x),c.addScaledVector(a,jn.y),c.addScaledVector(o,jn.z),c)}static getInterpolatedAttribute(e,t,n,s,r,a){return il.setScalar(0),sl.setScalar(0),rl.setScalar(0),il.fromBufferAttribute(e,t),sl.fromBufferAttribute(e,n),rl.fromBufferAttribute(e,s),a.setScalar(0),a.addScaledVector(il,r.x),a.addScaledVector(sl,r.y),a.addScaledVector(rl,r.z),a}static isFrontFacing(e,t,n,s){return bn.subVectors(n,t),Jn.subVectors(e,t),bn.cross(Jn).dot(s)<0}set(e,t,n){return this.a.copy(e),this.b.copy(t),this.c.copy(n),this}setFromPointsAndIndices(e,t,n,s){return this.a.copy(e[t]),this.b.copy(e[n]),this.c.copy(e[s]),this}setFromAttributeAndIndices(e,t,n,s){return this.a.fromBufferAttribute(e,t),this.b.fromBufferAttribute(e,n),this.c.fromBufferAttribute(e,s),this}clone(){return new this.constructor().copy(this)}copy(e){return this.a.copy(e.a),this.b.copy(e.b),this.c.copy(e.c),this}getArea(){return bn.subVectors(this.c,this.b),Jn.subVectors(this.a,this.b),bn.cross(Jn).length()*.5}getMidpoint(e){return e.addVectors(this.a,this.b).add(this.c).multiplyScalar(1/3)}getNormal(e){return i.getNormal(this.a,this.b,this.c,e)}getPlane(e){return e.setFromCoplanarPoints(this.a,this.b,this.c)}getBarycoord(e,t){return i.getBarycoord(e,this.a,this.b,this.c,t)}getInterpolation(e,t,n,s,r){return i.getInterpolation(e,this.a,this.b,this.c,t,n,s,r)}containsPoint(e){return i.containsPoint(e,this.a,this.b,this.c)}isFrontFacing(e){return i.isFrontFacing(this.a,this.b,this.c,e)}intersectsBox(e){return e.intersectsTriangle(this)}closestPointToPoint(e,t){let n=this.a,s=this.b,r=this.c,a,o;ds.subVectors(s,n),fs.subVectors(r,n),el.subVectors(e,n);let c=ds.dot(el),l=fs.dot(el);if(c<=0&&l<=0)return t.copy(n);tl.subVectors(e,s);let h=ds.dot(tl),d=fs.dot(tl);if(h>=0&&d<=h)return t.copy(s);let u=c*d-h*l;if(u<=0&&c>=0&&h<=0)return a=c/(c-h),t.copy(n).addScaledVector(ds,a);nl.subVectors(e,r);let f=ds.dot(nl),m=fs.dot(nl);if(m>=0&&f<=m)return t.copy(r);let _=f*l-c*m;if(_<=0&&l>=0&&m<=0)return o=l/(l-m),t.copy(n).addScaledVector(fs,o);let g=h*m-f*d;if(g<=0&&d-h>=0&&f-m>=0)return Mu.subVectors(r,s),o=(d-h)/(d-h+(f-m)),t.copy(s).addScaledVector(Mu,o);let p=1/(g+_+u);return a=_*p,o=u*p,t.copy(n).addScaledVector(ds,a).addScaledVector(fs,o)}equals(e){return e.a.equals(this.a)&&e.b.equals(this.b)&&e.c.equals(this.c)}},hn=class{constructor(e=new L(1/0,1/0,1/0),t=new L(-1/0,-1/0,-1/0)){this.isBox3=!0,this.min=e,this.max=t}set(e,t){return this.min.copy(e),this.max.copy(t),this}setFromArray(e){this.makeEmpty();for(let t=0,n=e.length;t<n;t+=3)this.expandByPoint(Sn.fromArray(e,t));return this}setFromBufferAttribute(e){this.makeEmpty();for(let t=0,n=e.count;t<n;t++)this.expandByPoint(Sn.fromBufferAttribute(e,t));return this}setFromPoints(e){this.makeEmpty();for(let t=0,n=e.length;t<n;t++)this.expandByPoint(e[t]);return this}setFromCenterAndSize(e,t){let n=Sn.copy(t).multiplyScalar(.5);return this.min.copy(e).sub(n),this.max.copy(e).add(n),this}setFromObject(e,t=!1){return this.makeEmpty(),this.expandByObject(e,t)}clone(){return new this.constructor().copy(this)}copy(e){return this.min.copy(e.min),this.max.copy(e.max),this}makeEmpty(){return this.min.x=this.min.y=this.min.z=1/0,this.max.x=this.max.y=this.max.z=-1/0,this}isEmpty(){return this.max.x<this.min.x||this.max.y<this.min.y||this.max.z<this.min.z}getCenter(e){return this.isEmpty()?e.set(0,0,0):e.addVectors(this.min,this.max).multiplyScalar(.5)}getSize(e){return this.isEmpty()?e.set(0,0,0):e.subVectors(this.max,this.min)}expandByPoint(e){return this.min.min(e),this.max.max(e),this}expandByVector(e){return this.min.sub(e),this.max.add(e),this}expandByScalar(e){return this.min.addScalar(-e),this.max.addScalar(e),this}expandByObject(e,t=!1){e.updateWorldMatrix(!1,!1);let n=e.geometry;if(n!==void 0){let r=n.getAttribute("position");if(t===!0&&r!==void 0&&e.isInstancedMesh!==!0)for(let a=0,o=r.count;a<o;a++)e.isMesh===!0?e.getVertexPosition(a,Sn):Sn.fromBufferAttribute(r,a),Sn.applyMatrix4(e.matrixWorld),this.expandByPoint(Sn);else e.boundingBox!==void 0?(e.boundingBox===null&&e.computeBoundingBox(),da.copy(e.boundingBox)):(n.boundingBox===null&&n.computeBoundingBox(),da.copy(n.boundingBox)),da.applyMatrix4(e.matrixWorld),this.union(da)}let s=e.children;for(let r=0,a=s.length;r<a;r++)this.expandByObject(s[r],t);return this}containsPoint(e){return e.x>=this.min.x&&e.x<=this.max.x&&e.y>=this.min.y&&e.y<=this.max.y&&e.z>=this.min.z&&e.z<=this.max.z}containsBox(e){return this.min.x<=e.min.x&&e.max.x<=this.max.x&&this.min.y<=e.min.y&&e.max.y<=this.max.y&&this.min.z<=e.min.z&&e.max.z<=this.max.z}getParameter(e,t){return t.set((e.x-this.min.x)/(this.max.x-this.min.x),(e.y-this.min.y)/(this.max.y-this.min.y),(e.z-this.min.z)/(this.max.z-this.min.z))}intersectsBox(e){return e.max.x>=this.min.x&&e.min.x<=this.max.x&&e.max.y>=this.min.y&&e.min.y<=this.max.y&&e.max.z>=this.min.z&&e.min.z<=this.max.z}intersectsSphere(e){return this.clampPoint(e.center,Sn),Sn.distanceToSquared(e.center)<=e.radius*e.radius}intersectsPlane(e){let t,n;return e.normal.x>0?(t=e.normal.x*this.min.x,n=e.normal.x*this.max.x):(t=e.normal.x*this.max.x,n=e.normal.x*this.min.x),e.normal.y>0?(t+=e.normal.y*this.min.y,n+=e.normal.y*this.max.y):(t+=e.normal.y*this.max.y,n+=e.normal.y*this.min.y),e.normal.z>0?(t+=e.normal.z*this.min.z,n+=e.normal.z*this.max.z):(t+=e.normal.z*this.max.z,n+=e.normal.z*this.min.z),t<=-e.constant&&n>=-e.constant}intersectsTriangle(e){if(this.isEmpty())return!1;this.getCenter(Xs),fa.subVectors(this.max,Xs),ps.subVectors(e.a,Xs),ms.subVectors(e.b,Xs),gs.subVectors(e.c,Xs),pi.subVectors(ms,ps),mi.subVectors(gs,ms),ki.subVectors(ps,gs);let t=[0,-pi.z,pi.y,0,-mi.z,mi.y,0,-ki.z,ki.y,pi.z,0,-pi.x,mi.z,0,-mi.x,ki.z,0,-ki.x,-pi.y,pi.x,0,-mi.y,mi.x,0,-ki.y,ki.x,0];return!al(t,ps,ms,gs,fa)||(t=[1,0,0,0,1,0,0,0,1],!al(t,ps,ms,gs,fa))?!1:(pa.crossVectors(pi,mi),t=[pa.x,pa.y,pa.z],al(t,ps,ms,gs,fa))}clampPoint(e,t){return t.copy(e).clamp(this.min,this.max)}distanceToPoint(e){return this.clampPoint(e,Sn).distanceTo(e)}getBoundingSphere(e){return this.isEmpty()?e.makeEmpty():(this.getCenter(e.center),e.radius=this.getSize(Sn).length()*.5),e}intersect(e){return this.min.max(e.min),this.max.min(e.max),this.isEmpty()&&this.makeEmpty(),this}union(e){return this.min.min(e.min),this.max.max(e.max),this}applyMatrix4(e){return this.isEmpty()?this:(Qn[0].set(this.min.x,this.min.y,this.min.z).applyMatrix4(e),Qn[1].set(this.min.x,this.min.y,this.max.z).applyMatrix4(e),Qn[2].set(this.min.x,this.max.y,this.min.z).applyMatrix4(e),Qn[3].set(this.min.x,this.max.y,this.max.z).applyMatrix4(e),Qn[4].set(this.max.x,this.min.y,this.min.z).applyMatrix4(e),Qn[5].set(this.max.x,this.min.y,this.max.z).applyMatrix4(e),Qn[6].set(this.max.x,this.max.y,this.min.z).applyMatrix4(e),Qn[7].set(this.max.x,this.max.y,this.max.z).applyMatrix4(e),this.setFromPoints(Qn),this)}translate(e){return this.min.add(e),this.max.add(e),this}equals(e){return e.min.equals(this.min)&&e.max.equals(this.max)}toJSON(){return{min:this.min.toArray(),max:this.max.toArray()}}fromJSON(e){return this.min.fromArray(e.min),this.max.fromArray(e.max),this}},Qn=[new L,new L,new L,new L,new L,new L,new L,new L],Sn=new L,da=new hn,ps=new L,ms=new L,gs=new L,pi=new L,mi=new L,ki=new L,Xs=new L,fa=new L,pa=new L,Hi=new L;function al(i,e,t,n,s){for(let r=0,a=i.length-3;r<=a;r+=3){Hi.fromArray(i,r);let o=s.x*Math.abs(Hi.x)+s.y*Math.abs(Hi.y)+s.z*Math.abs(Hi.z),c=e.dot(Hi),l=t.dot(Hi),h=n.dot(Hi);if(Math.max(-Math.max(c,l,h),Math.min(c,l,h))>o)return!1}return!0}var wt=new L,ma=new _e,Bp=0,en=class extends Vn{constructor(e,t,n=!1){if(super(),Array.isArray(e))throw new TypeError("THREE.BufferAttribute: array should be a Typed Array.");this.isBufferAttribute=!0,Object.defineProperty(this,"id",{value:Bp++}),this.name="",this.array=e,this.itemSize=t,this.count=e!==void 0?e.length/t:0,this.normalized=n,this.usage=Ya,this.updateRanges=[],this.gpuType=Cn,this.version=0}onUploadCallback(){}set needsUpdate(e){e===!0&&this.version++}setUsage(e){return this.usage=e,this}addUpdateRange(e,t){this.updateRanges.push({start:e,count:t})}clearUpdateRanges(){this.updateRanges.length=0}copy(e){return this.name=e.name,this.array=new e.array.constructor(e.array),this.itemSize=e.itemSize,this.count=e.count,this.normalized=e.normalized,this.usage=e.usage,this.gpuType=e.gpuType,this}copyAt(e,t,n){e*=this.itemSize,n*=t.itemSize;for(let s=0,r=this.itemSize;s<r;s++)this.array[e+s]=t.array[n+s];return this}copyArray(e){return this.array.set(e),this}applyMatrix3(e){if(this.itemSize===2)for(let t=0,n=this.count;t<n;t++)ma.fromBufferAttribute(this,t),ma.applyMatrix3(e),this.setXY(t,ma.x,ma.y);else if(this.itemSize===3)for(let t=0,n=this.count;t<n;t++)wt.fromBufferAttribute(this,t),wt.applyMatrix3(e),this.setXYZ(t,wt.x,wt.y,wt.z);return this}applyMatrix4(e){for(let t=0,n=this.count;t<n;t++)wt.fromBufferAttribute(this,t),wt.applyMatrix4(e),this.setXYZ(t,wt.x,wt.y,wt.z);return this}applyNormalMatrix(e){for(let t=0,n=this.count;t<n;t++)wt.fromBufferAttribute(this,t),wt.applyNormalMatrix(e),this.setXYZ(t,wt.x,wt.y,wt.z);return this}transformDirection(e){for(let t=0,n=this.count;t<n;t++)wt.fromBufferAttribute(this,t),wt.transformDirection(e),this.setXYZ(t,wt.x,wt.y,wt.z);return this}set(e,t=0){return this.array.set(e,t),this}getComponent(e,t){let n=this.array[e*this.itemSize+t];return this.normalized&&(n=Mn(n,this.array)),n}setComponent(e,t,n){return this.normalized&&(n=et(n,this.array)),this.array[e*this.itemSize+t]=n,this}getX(e){let t=this.array[e*this.itemSize];return this.normalized&&(t=Mn(t,this.array)),t}setX(e,t){return this.normalized&&(t=et(t,this.array)),this.array[e*this.itemSize]=t,this}getY(e){let t=this.array[e*this.itemSize+1];return this.normalized&&(t=Mn(t,this.array)),t}setY(e,t){return this.normalized&&(t=et(t,this.array)),this.array[e*this.itemSize+1]=t,this}getZ(e){let t=this.array[e*this.itemSize+2];return this.normalized&&(t=Mn(t,this.array)),t}setZ(e,t){return this.normalized&&(t=et(t,this.array)),this.array[e*this.itemSize+2]=t,this}getW(e){let t=this.array[e*this.itemSize+3];return this.normalized&&(t=Mn(t,this.array)),t}setW(e,t){return this.normalized&&(t=et(t,this.array)),this.array[e*this.itemSize+3]=t,this}setXY(e,t,n){return e*=this.itemSize,this.normalized&&(t=et(t,this.array),n=et(n,this.array)),this.array[e+0]=t,this.array[e+1]=n,this}setXYZ(e,t,n,s){return e*=this.itemSize,this.normalized&&(t=et(t,this.array),n=et(n,this.array),s=et(s,this.array)),this.array[e+0]=t,this.array[e+1]=n,this.array[e+2]=s,this}setXYZW(e,t,n,s,r){return e*=this.itemSize,this.normalized&&(t=et(t,this.array),n=et(n,this.array),s=et(s,this.array),r=et(r,this.array)),this.array[e+0]=t,this.array[e+1]=n,this.array[e+2]=s,this.array[e+3]=r,this}onUpload(e){return this.onUploadCallback=e,this}clone(){return new this.constructor(this.array,this.itemSize).copy(this)}toJSON(){let e={itemSize:this.itemSize,type:this.array.constructor.name,array:Array.from(this.array),normalized:this.normalized};return this.name!==""&&(e.name=this.name),this.usage!==Ya&&(e.usage=this.usage),e}dispose(){this.dispatchEvent({type:"dispose"})}};var lr=class extends en{constructor(e,t,n){super(new Uint16Array(e),t,n)}};var hr=class extends en{constructor(e,t,n){super(new Uint32Array(e),t,n)}};var lt=class extends en{constructor(e,t,n){super(new Float32Array(e),t,n)}},zp=new hn,qs=new L,ol=new L,wn=class{constructor(e=new L,t=-1){this.isSphere=!0,this.center=e,this.radius=t}set(e,t){return this.center.copy(e),this.radius=t,this}setFromPoints(e,t){let n=this.center;t!==void 0?n.copy(t):zp.setFromPoints(e).getCenter(n);let s=0;for(let r=0,a=e.length;r<a;r++)s=Math.max(s,n.distanceToSquared(e[r]));return this.radius=Math.sqrt(s),this}copy(e){return this.center.copy(e.center),this.radius=e.radius,this}isEmpty(){return this.radius<0}makeEmpty(){return this.center.set(0,0,0),this.radius=-1,this}containsPoint(e){return e.distanceToSquared(this.center)<=this.radius*this.radius}distanceToPoint(e){return e.distanceTo(this.center)-this.radius}intersectsSphere(e){let t=this.radius+e.radius;return e.center.distanceToSquared(this.center)<=t*t}intersectsBox(e){return e.intersectsSphere(this)}intersectsPlane(e){return Math.abs(e.distanceToPoint(this.center))<=this.radius}clampPoint(e,t){let n=this.center.distanceToSquared(e);return t.copy(e),n>this.radius*this.radius&&(t.sub(this.center).normalize(),t.multiplyScalar(this.radius).add(this.center)),t}getBoundingBox(e){return this.isEmpty()?(e.makeEmpty(),e):(e.set(this.center,this.center),e.expandByScalar(this.radius),e)}applyMatrix4(e){return this.center.applyMatrix4(e),this.radius=this.radius*e.getMaxScaleOnAxis(),this}translate(e){return this.center.add(e),this}expandByPoint(e){if(this.isEmpty())return this.center.copy(e),this.radius=0,this;qs.subVectors(e,this.center);let t=qs.lengthSq();if(t>this.radius*this.radius){let n=Math.sqrt(t),s=(n-this.radius)*.5;this.center.addScaledVector(qs,s/n),this.radius+=s}return this}union(e){return e.isEmpty()?this:this.isEmpty()?(this.copy(e),this):(this.center.equals(e.center)===!0?this.radius=Math.max(this.radius,e.radius):(ol.subVectors(e.center,this.center).setLength(e.radius),this.expandByPoint(qs.copy(e.center).add(ol)),this.expandByPoint(qs.copy(e.center).sub(ol))),this)}equals(e){return e.center.equals(this.center)&&e.radius===this.radius}clone(){return new this.constructor().copy(this)}toJSON(){return{radius:this.radius,center:this.center.toArray()}}fromJSON(e){return this.radius=e.radius,this.center.fromArray(e.center),this}},Vp=0,xn=new at,cl=new ln,xs=new L,an=new hn,Ys=new hn,Lt=new L,Nt=class i extends Vn{constructor(){super(),this.isBufferGeometry=!0,Object.defineProperty(this,"id",{value:Vp++}),this.uuid=Bn(),this.name="",this.type="BufferGeometry",this.index=null,this.indirect=null,this.indirectOffset=0,this.attributes={},this.morphAttributes={},this.morphTargetsRelative=!1,this.groups=[],this.boundingBox=null,this.boundingSphere=null,this.drawRange={start:0,count:1/0},this.userData={},this._transformed=!1}getIndex(){return this.index}setIndex(e){return Array.isArray(e)?this.index=new(hp(e)?hr:lr)(e,1):this.index=e,this}setIndirect(e,t=0){return this.indirect=e,this.indirectOffset=t,this}getIndirect(){return this.indirect}getAttribute(e){return this.attributes[e]}setAttribute(e,t){return this.attributes[e]=t,this}deleteAttribute(e){return delete this.attributes[e],this}hasAttribute(e){return this.attributes[e]!==void 0}addGroup(e,t,n=0){this.groups.push({start:e,count:t,materialIndex:n})}clearGroups(){this.groups=[]}setDrawRange(e,t){this.drawRange.start=e,this.drawRange.count=t}applyMatrix4(e){let t=this.attributes.position;t!==void 0&&(t.applyMatrix4(e),t.needsUpdate=!0);let n=this.attributes.normal;if(n!==void 0){let r=new De().getNormalMatrix(e);n.applyNormalMatrix(r),n.needsUpdate=!0}let s=this.attributes.tangent;return s!==void 0&&(s.transformDirection(e),s.needsUpdate=!0),this.boundingBox!==null&&this.computeBoundingBox(),this.boundingSphere!==null&&this.computeBoundingSphere(),this._transformed=!0,this}applyQuaternion(e){return xn.makeRotationFromQuaternion(e),this.applyMatrix4(xn),this}rotateX(e){return xn.makeRotationX(e),this.applyMatrix4(xn),this}rotateY(e){return xn.makeRotationY(e),this.applyMatrix4(xn),this}rotateZ(e){return xn.makeRotationZ(e),this.applyMatrix4(xn),this}translate(e,t,n){return xn.makeTranslation(e,t,n),this.applyMatrix4(xn),this}scale(e,t,n){return xn.makeScale(e,t,n),this.applyMatrix4(xn),this}lookAt(e){return cl.lookAt(e),cl.updateMatrix(),this.applyMatrix4(cl.matrix),this}center(){return this.computeBoundingBox(),this.boundingBox.getCenter(xs).negate(),this.translate(xs.x,xs.y,xs.z),this}setFromPoints(e){let t=this.getAttribute("position");if(t===void 0){let n=[];for(let s=0,r=e.length;s<r;s++){let a=e[s];n.push(a.x,a.y,a.z||0)}this.setAttribute("position",new lt(n,3))}else{let n=Math.min(e.length,t.count);for(let s=0;s<n;s++){let r=e[s];t.setXYZ(s,r.x,r.y,r.z||0)}e.length>t.count&&Pe("BufferGeometry: Buffer size too small for points data. Use .dispose() and create a new geometry."),t.needsUpdate=!0}return this}computeBoundingBox(){this.boundingBox===null&&(this.boundingBox=new hn);let e=this.attributes.position,t=this.morphAttributes.position;if(e&&e.isGLBufferAttribute){Ie("BufferGeometry.computeBoundingBox(): GLBufferAttribute requires a manual bounding box.",this),this.boundingBox.set(new L(-1/0,-1/0,-1/0),new L(1/0,1/0,1/0));return}if(e!==void 0){if(this.boundingBox.setFromBufferAttribute(e),t)for(let n=0,s=t.length;n<s;n++){let r=t[n];an.setFromBufferAttribute(r),this.morphTargetsRelative?(Lt.addVectors(this.boundingBox.min,an.min),this.boundingBox.expandByPoint(Lt),Lt.addVectors(this.boundingBox.max,an.max),this.boundingBox.expandByPoint(Lt)):(this.boundingBox.expandByPoint(an.min),this.boundingBox.expandByPoint(an.max))}}else this.boundingBox.makeEmpty();(isNaN(this.boundingBox.min.x)||isNaN(this.boundingBox.min.y)||isNaN(this.boundingBox.min.z))&&Ie('BufferGeometry.computeBoundingBox(): Computed min/max have NaN values. The "position" attribute is likely to have NaN values.',this)}computeBoundingSphere(){this.boundingSphere===null&&(this.boundingSphere=new wn);let e=this.attributes.position,t=this.morphAttributes.position;if(e&&e.isGLBufferAttribute){Ie("BufferGeometry.computeBoundingSphere(): GLBufferAttribute requires a manual bounding sphere.",this),this.boundingSphere.set(new L,1/0);return}if(e){let n=this.boundingSphere.center;if(an.setFromBufferAttribute(e),t)for(let r=0,a=t.length;r<a;r++){let o=t[r];Ys.setFromBufferAttribute(o),this.morphTargetsRelative?(Lt.addVectors(an.min,Ys.min),an.expandByPoint(Lt),Lt.addVectors(an.max,Ys.max),an.expandByPoint(Lt)):(an.expandByPoint(Ys.min),an.expandByPoint(Ys.max))}an.getCenter(n);let s=0;for(let r=0,a=e.count;r<a;r++)Lt.fromBufferAttribute(e,r),s=Math.max(s,n.distanceToSquared(Lt));if(t)for(let r=0,a=t.length;r<a;r++){let o=t[r],c=this.morphTargetsRelative;for(let l=0,h=o.count;l<h;l++)Lt.fromBufferAttribute(o,l),c&&(xs.fromBufferAttribute(e,l),Lt.add(xs)),s=Math.max(s,n.distanceToSquared(Lt))}this.boundingSphere.radius=Math.sqrt(s),isNaN(this.boundingSphere.radius)&&Ie('BufferGeometry.computeBoundingSphere(): Computed radius is NaN. The "position" attribute is likely to have NaN values.',this)}}computeTangents(){let e=this.index,t=this.attributes;if(e===null||t.position===void 0||t.normal===void 0||t.uv===void 0){Ie("BufferGeometry: .computeTangents() failed. Missing required attributes (index, position, normal or uv)");return}let n=t.position,s=t.normal,r=t.uv,a=this.getAttribute("tangent");(a===void 0||a.count!==n.count)&&(a=new en(new Float32Array(4*n.count),4),this.setAttribute("tangent",a));let o=[],c=[];for(let x=0;x<n.count;x++)o[x]=new L,c[x]=new L;let l=new L,h=new L,d=new L,u=new _e,f=new _e,m=new _e,_=new L,g=new L;function p(x,T,R){l.fromBufferAttribute(n,x),h.fromBufferAttribute(n,T),d.fromBufferAttribute(n,R),u.fromBufferAttribute(r,x),f.fromBufferAttribute(r,T),m.fromBufferAttribute(r,R),h.sub(l),d.sub(l),f.sub(u),m.sub(u);let C=1/(f.x*m.y-m.x*f.y);isFinite(C)&&(_.copy(h).multiplyScalar(m.y).addScaledVector(d,-f.y).multiplyScalar(C),g.copy(d).multiplyScalar(f.x).addScaledVector(h,-m.x).multiplyScalar(C),o[x].add(_),o[T].add(_),o[R].add(_),c[x].add(g),c[T].add(g),c[R].add(g))}let b=this.groups;b.length===0&&(b=[{start:0,count:e.count}]);for(let x=0,T=b.length;x<T;++x){let R=b[x],C=R.start,D=R.count;for(let I=C,V=C+D;I<V;I+=3)p(e.getX(I+0),e.getX(I+1),e.getX(I+2))}let E=new L,v=new L,A=new L,M=new L;function w(x){A.fromBufferAttribute(s,x),M.copy(A);let T=o[x];E.copy(T),E.sub(A.multiplyScalar(A.dot(T))).normalize(),v.crossVectors(M,T);let C=v.dot(c[x])<0?-1:1;a.setXYZW(x,E.x,E.y,E.z,C)}for(let x=0,T=b.length;x<T;++x){let R=b[x],C=R.start,D=R.count;for(let I=C,V=C+D;I<V;I+=3)w(e.getX(I+0)),w(e.getX(I+1)),w(e.getX(I+2))}this._transformed=!0}computeVertexNormals(){let e=this.index,t=this.getAttribute("position");if(t!==void 0){let n=this.getAttribute("normal");if(n===void 0||n.count!==t.count)n=new en(new Float32Array(t.count*3),3),this.setAttribute("normal",n);else for(let u=0,f=n.count;u<f;u++)n.setXYZ(u,0,0,0);let s=new L,r=new L,a=new L,o=new L,c=new L,l=new L,h=new L,d=new L;if(e)for(let u=0,f=e.count;u<f;u+=3){let m=e.getX(u+0),_=e.getX(u+1),g=e.getX(u+2);s.fromBufferAttribute(t,m),r.fromBufferAttribute(t,_),a.fromBufferAttribute(t,g),h.subVectors(a,r),d.subVectors(s,r),h.cross(d),o.fromBufferAttribute(n,m),c.fromBufferAttribute(n,_),l.fromBufferAttribute(n,g),o.add(h),c.add(h),l.add(h),n.setXYZ(m,o.x,o.y,o.z),n.setXYZ(_,c.x,c.y,c.z),n.setXYZ(g,l.x,l.y,l.z)}else for(let u=0,f=t.count;u<f;u+=3)s.fromBufferAttribute(t,u+0),r.fromBufferAttribute(t,u+1),a.fromBufferAttribute(t,u+2),h.subVectors(a,r),d.subVectors(s,r),h.cross(d),n.setXYZ(u+0,h.x,h.y,h.z),n.setXYZ(u+1,h.x,h.y,h.z),n.setXYZ(u+2,h.x,h.y,h.z);this.normalizeNormals(),n.needsUpdate=!0}}normalizeNormals(){let e=this.attributes.normal;for(let t=0,n=e.count;t<n;t++)Lt.fromBufferAttribute(e,t),Lt.normalize(),e.setXYZ(t,Lt.x,Lt.y,Lt.z)}toNonIndexed(){function e(o,c){let l=o.array,h=o.itemSize,d=o.normalized,u=new l.constructor(c.length*h),f=0,m=0;for(let _=0,g=c.length;_<g;_++){o.isInterleavedBufferAttribute?f=c[_]*o.data.stride+o.offset:f=c[_]*h;for(let p=0;p<h;p++)u[m++]=l[f++]}return new en(u,h,d)}if(this.index===null)return Pe("BufferGeometry.toNonIndexed(): BufferGeometry is already non-indexed."),this;let t=new i,n=this.index.array,s=this.attributes;for(let o in s){let c=s[o],l=e(c,n);t.setAttribute(o,l)}let r=this.morphAttributes;for(let o in r){let c=[],l=r[o];for(let h=0,d=l.length;h<d;h++){let u=l[h],f=e(u,n);c.push(f)}t.morphAttributes[o]=c}t.morphTargetsRelative=this.morphTargetsRelative;let a=this.groups;for(let o=0,c=a.length;o<c;o++){let l=a[o];t.addGroup(l.start,l.count,l.materialIndex)}return t}toJSON(){let e={metadata:{version:4.7,type:"BufferGeometry",generator:"BufferGeometry.toJSON"}};if(e.uuid=this.uuid,e.type=this.parameters!==void 0&&this._transformed===!0?"BufferGeometry":this.type,this.name!==""&&(e.name=this.name),Object.keys(this.userData).length>0&&(e.userData=this.userData),this.parameters!==void 0&&this._transformed!==!0){let c=this.parameters;for(let l in c)c[l]!==void 0&&(e[l]=c[l]);return e}e.data={attributes:{}};let t=this.index;t!==null&&(e.data.index={type:t.array.constructor.name,array:Array.prototype.slice.call(t.array)});let n=this.attributes;for(let c in n){let l=n[c];e.data.attributes[c]=l.toJSON(e.data)}let s={},r=!1;for(let c in this.morphAttributes){let l=this.morphAttributes[c],h=[];for(let d=0,u=l.length;d<u;d++){let f=l[d];h.push(f.toJSON(e.data))}h.length>0&&(s[c]=h,r=!0)}r&&(e.data.morphAttributes=s,e.data.morphTargetsRelative=this.morphTargetsRelative);let a=this.groups;a.length>0&&(e.data.groups=JSON.parse(JSON.stringify(a)));let o=this.boundingSphere;return o!==null&&(e.data.boundingSphere=o.toJSON()),e}clone(){return new this.constructor().copy(this)}copy(e){this.index=null,this.attributes={},this.morphAttributes={},this.groups=[],this.boundingBox=null,this.boundingSphere=null;let t={};this.name=e.name;let n=e.index;n!==null&&this.setIndex(n.clone());let s=e.attributes;for(let l in s){let h=s[l];this.setAttribute(l,h.clone(t))}let r=e.morphAttributes;for(let l in r){let h=[],d=r[l];for(let u=0,f=d.length;u<f;u++)h.push(d[u].clone(t));this.morphAttributes[l]=h}this.morphTargetsRelative=e.morphTargetsRelative;let a=e.groups;for(let l=0,h=a.length;l<h;l++){let d=a[l];this.addGroup(d.start,d.count,d.materialIndex)}let o=e.boundingBox;o!==null&&(this.boundingBox=o.clone());let c=e.boundingSphere;return c!==null&&(this.boundingSphere=c.clone()),this.drawRange.start=e.drawRange.start,this.drawRange.count=e.drawRange.count,this.userData=e.userData,this._transformed=e._transformed,this}dispose(){this.dispatchEvent({type:"dispose"})}},Ja=class{constructor(e,t){this.isInterleavedBuffer=!0,this.array=e,this.stride=t,this.count=e!==void 0?e.length/t:0,this.usage=Ya,this.updateRanges=[],this.version=0,this.uuid=Bn()}onUploadCallback(){}set needsUpdate(e){e===!0&&this.version++}setUsage(e){return this.usage=e,this}addUpdateRange(e,t){this.updateRanges.push({start:e,count:t})}clearUpdateRanges(){this.updateRanges.length=0}copy(e){return this.array=new e.array.constructor(e.array),this.count=e.count,this.stride=e.stride,this.usage=e.usage,this}copyAt(e,t,n){e*=this.stride,n*=t.stride;for(let s=0,r=this.stride;s<r;s++)this.array[e+s]=t.array[n+s];return this}set(e,t=0){return this.array.set(e,t),this}clone(e){e.arrayBuffers===void 0&&(e.arrayBuffers={}),this.array.buffer._uuid===void 0&&(this.array.buffer._uuid=Bn()),e.arrayBuffers[this.array.buffer._uuid]===void 0&&(e.arrayBuffers[this.array.buffer._uuid]=this.array.slice(0).buffer);let t=new this.array.constructor(e.arrayBuffers[this.array.buffer._uuid]),n=new this.constructor(t,this.stride);return n.setUsage(this.usage),n}onUpload(e){return this.onUploadCallback=e,this}toJSON(e){return e.arrayBuffers===void 0&&(e.arrayBuffers={}),this.array.buffer._uuid===void 0&&(this.array.buffer._uuid=Bn()),e.arrayBuffers[this.array.buffer._uuid]===void 0&&(e.arrayBuffers[this.array.buffer._uuid]=Array.from(new Uint32Array(this.array.buffer))),{uuid:this.uuid,buffer:this.array.buffer._uuid,type:this.array.constructor.name,stride:this.stride}}},Yt=new L,Tn=class i{constructor(e,t,n,s=!1){this.isInterleavedBufferAttribute=!0,this.name="",this.data=e,this.itemSize=t,this.offset=n,this.normalized=s}get count(){return this.data.count}get array(){return this.data.array}set needsUpdate(e){this.data.needsUpdate=e}applyMatrix4(e){for(let t=0,n=this.data.count;t<n;t++)Yt.fromBufferAttribute(this,t),Yt.applyMatrix4(e),this.setXYZ(t,Yt.x,Yt.y,Yt.z);return this}applyNormalMatrix(e){for(let t=0,n=this.count;t<n;t++)Yt.fromBufferAttribute(this,t),Yt.applyNormalMatrix(e),this.setXYZ(t,Yt.x,Yt.y,Yt.z);return this}transformDirection(e){for(let t=0,n=this.count;t<n;t++)Yt.fromBufferAttribute(this,t),Yt.transformDirection(e),this.setXYZ(t,Yt.x,Yt.y,Yt.z);return this}getComponent(e,t){let n=this.array[e*this.data.stride+this.offset+t];return this.normalized&&(n=Mn(n,this.array)),n}setComponent(e,t,n){return this.normalized&&(n=et(n,this.array)),this.data.array[e*this.data.stride+this.offset+t]=n,this}setX(e,t){return this.normalized&&(t=et(t,this.array)),this.data.array[e*this.data.stride+this.offset]=t,this}setY(e,t){return this.normalized&&(t=et(t,this.array)),this.data.array[e*this.data.stride+this.offset+1]=t,this}setZ(e,t){return this.normalized&&(t=et(t,this.array)),this.data.array[e*this.data.stride+this.offset+2]=t,this}setW(e,t){return this.normalized&&(t=et(t,this.array)),this.data.array[e*this.data.stride+this.offset+3]=t,this}getX(e){let t=this.data.array[e*this.data.stride+this.offset];return this.normalized&&(t=Mn(t,this.array)),t}getY(e){let t=this.data.array[e*this.data.stride+this.offset+1];return this.normalized&&(t=Mn(t,this.array)),t}getZ(e){let t=this.data.array[e*this.data.stride+this.offset+2];return this.normalized&&(t=Mn(t,this.array)),t}getW(e){let t=this.data.array[e*this.data.stride+this.offset+3];return this.normalized&&(t=Mn(t,this.array)),t}setXY(e,t,n){return e=e*this.data.stride+this.offset,this.normalized&&(t=et(t,this.array),n=et(n,this.array)),this.data.array[e+0]=t,this.data.array[e+1]=n,this}setXYZ(e,t,n,s){return e=e*this.data.stride+this.offset,this.normalized&&(t=et(t,this.array),n=et(n,this.array),s=et(s,this.array)),this.data.array[e+0]=t,this.data.array[e+1]=n,this.data.array[e+2]=s,this}setXYZW(e,t,n,s,r){return e=e*this.data.stride+this.offset,this.normalized&&(t=et(t,this.array),n=et(n,this.array),s=et(s,this.array),r=et(r,this.array)),this.data.array[e+0]=t,this.data.array[e+1]=n,this.data.array[e+2]=s,this.data.array[e+3]=r,this}clone(e){if(e===void 0){rr("InterleavedBufferAttribute.clone(): Cloning an interleaved buffer attribute will de-interleave buffer data.");let t=[];for(let n=0;n<this.count;n++){let s=n*this.data.stride+this.offset;for(let r=0;r<this.itemSize;r++)t.push(this.data.array[s+r])}return new en(new this.array.constructor(t),this.itemSize,this.normalized)}else return e.interleavedBuffers===void 0&&(e.interleavedBuffers={}),e.interleavedBuffers[this.data.uuid]===void 0&&(e.interleavedBuffers[this.data.uuid]=this.data.clone(e)),new i(e.interleavedBuffers[this.data.uuid],this.itemSize,this.offset,this.normalized)}toJSON(e){if(e===void 0){rr("InterleavedBufferAttribute.toJSON(): Serializing an interleaved buffer attribute will de-interleave buffer data.");let t=[];for(let n=0;n<this.count;n++){let s=n*this.data.stride+this.offset;for(let r=0;r<this.itemSize;r++)t.push(this.data.array[s+r])}return{itemSize:this.itemSize,type:this.array.constructor.name,array:t,normalized:this.normalized}}else return e.interleavedBuffers===void 0&&(e.interleavedBuffers={}),e.interleavedBuffers[this.data.uuid]===void 0&&(e.interleavedBuffers[this.data.uuid]=this.data.toJSON(e)),{isInterleavedBufferAttribute:!0,itemSize:this.itemSize,data:this.data.uuid,offset:this.offset,normalized:this.normalized}}},kp=0,Si=class extends Vn{constructor(){super(),this.isMaterial=!0,Object.defineProperty(this,"id",{value:kp++}),this.uuid=Bn(),this.name="",this.type="Material",this.blending=Yi,this.side=ni,this.vertexColors=!1,this.opacity=1,this.transparent=!1,this.alphaHash=!1,this.blendSrc=Ua,this.blendDst=Na,this.blendEquation=vi,this.blendSrcAlpha=null,this.blendDstAlpha=null,this.blendEquationAlpha=null,this.blendColor=new Xe(0,0,0),this.blendAlpha=0,this.depthFunc=$i,this.depthTest=!0,this.depthWrite=!0,this.stencilWriteMask=255,this.stencilFunc=Ml,this.stencilRef=0,this.stencilFuncMask=255,this.stencilFail=Xi,this.stencilZFail=Xi,this.stencilZPass=Xi,this.stencilWrite=!1,this.clippingPlanes=null,this.clipIntersection=!1,this.clipShadows=!1,this.shadowSide=null,this.colorWrite=!0,this.precision=null,this.polygonOffset=!1,this.polygonOffsetFactor=0,this.polygonOffsetUnits=0,this.dithering=!1,this.alphaToCoverage=!1,this.premultipliedAlpha=!1,this.forceSinglePass=!1,this.allowOverride=!0,this.visible=!0,this.toneMapped=!0,this.userData={},this.version=0,this._alphaTest=0}get alphaTest(){return this._alphaTest}set alphaTest(e){this._alphaTest>0!=e>0&&this.version++,this._alphaTest=e}onBeforeRender(){}onBeforeCompile(){}customProgramCacheKey(){return this.onBeforeCompile.toString()}setValues(e){if(e!==void 0)for(let t in e){let n=e[t];if(n===void 0){Pe(`Material: parameter '${t}' has value of undefined.`);continue}let s=this[t];if(s===void 0){Pe(`Material: '${t}' is not a property of THREE.${this.type}.`);continue}s&&s.isColor?s.set(n):s&&s.isVector2&&n&&n.isVector2||s&&s.isEuler&&n&&n.isEuler||s&&s.isVector3&&n&&n.isVector3?s.copy(n):this[t]=n}}toJSON(e){let t=e===void 0||typeof e=="string";t&&(e={textures:{},images:{}});let n={metadata:{version:4.7,type:"Material",generator:"Material.toJSON"}};n.uuid=this.uuid,n.type=this.type,this.name!==""&&(n.name=this.name),this.color&&this.color.isColor&&(n.color=this.color.getHex()),this.roughness!==void 0&&(n.roughness=this.roughness),this.metalness!==void 0&&(n.metalness=this.metalness),this.sheen!==void 0&&(n.sheen=this.sheen),this.sheenColor&&this.sheenColor.isColor&&(n.sheenColor=this.sheenColor.getHex()),this.sheenRoughness!==void 0&&(n.sheenRoughness=this.sheenRoughness),this.emissive&&this.emissive.isColor&&(n.emissive=this.emissive.getHex()),this.emissiveIntensity!==void 0&&this.emissiveIntensity!==1&&(n.emissiveIntensity=this.emissiveIntensity),this.specular&&this.specular.isColor&&(n.specular=this.specular.getHex()),this.specularIntensity!==void 0&&(n.specularIntensity=this.specularIntensity),this.specularColor&&this.specularColor.isColor&&(n.specularColor=this.specularColor.getHex()),this.shininess!==void 0&&(n.shininess=this.shininess),this.clearcoat!==void 0&&(n.clearcoat=this.clearcoat),this.clearcoatRoughness!==void 0&&(n.clearcoatRoughness=this.clearcoatRoughness),this.clearcoatMap&&this.clearcoatMap.isTexture&&(n.clearcoatMap=this.clearcoatMap.toJSON(e).uuid),this.clearcoatRoughnessMap&&this.clearcoatRoughnessMap.isTexture&&(n.clearcoatRoughnessMap=this.clearcoatRoughnessMap.toJSON(e).uuid),this.clearcoatNormalMap&&this.clearcoatNormalMap.isTexture&&(n.clearcoatNormalMap=this.clearcoatNormalMap.toJSON(e).uuid,n.clearcoatNormalScale=this.clearcoatNormalScale.toArray()),this.sheenColorMap&&this.sheenColorMap.isTexture&&(n.sheenColorMap=this.sheenColorMap.toJSON(e).uuid),this.sheenRoughnessMap&&this.sheenRoughnessMap.isTexture&&(n.sheenRoughnessMap=this.sheenRoughnessMap.toJSON(e).uuid),this.dispersion!==void 0&&(n.dispersion=this.dispersion),this.iridescence!==void 0&&(n.iridescence=this.iridescence),this.iridescenceIOR!==void 0&&(n.iridescenceIOR=this.iridescenceIOR),this.iridescenceThicknessRange!==void 0&&(n.iridescenceThicknessRange=this.iridescenceThicknessRange),this.iridescenceMap&&this.iridescenceMap.isTexture&&(n.iridescenceMap=this.iridescenceMap.toJSON(e).uuid),this.iridescenceThicknessMap&&this.iridescenceThicknessMap.isTexture&&(n.iridescenceThicknessMap=this.iridescenceThicknessMap.toJSON(e).uuid),this.anisotropy!==void 0&&(n.anisotropy=this.anisotropy),this.anisotropyRotation!==void 0&&(n.anisotropyRotation=this.anisotropyRotation),this.anisotropyMap&&this.anisotropyMap.isTexture&&(n.anisotropyMap=this.anisotropyMap.toJSON(e).uuid),this.map&&this.map.isTexture&&(n.map=this.map.toJSON(e).uuid),this.matcap&&this.matcap.isTexture&&(n.matcap=this.matcap.toJSON(e).uuid),this.alphaMap&&this.alphaMap.isTexture&&(n.alphaMap=this.alphaMap.toJSON(e).uuid),this.lightMap&&this.lightMap.isTexture&&(n.lightMap=this.lightMap.toJSON(e).uuid,n.lightMapIntensity=this.lightMapIntensity),this.aoMap&&this.aoMap.isTexture&&(n.aoMap=this.aoMap.toJSON(e).uuid,n.aoMapIntensity=this.aoMapIntensity),this.bumpMap&&this.bumpMap.isTexture&&(n.bumpMap=this.bumpMap.toJSON(e).uuid,n.bumpScale=this.bumpScale),this.normalMap&&this.normalMap.isTexture&&(n.normalMap=this.normalMap.toJSON(e).uuid,n.normalMapType=this.normalMapType,n.normalScale=this.normalScale.toArray()),this.displacementMap&&this.displacementMap.isTexture&&(n.displacementMap=this.displacementMap.toJSON(e).uuid,n.displacementScale=this.displacementScale,n.displacementBias=this.displacementBias),this.roughnessMap&&this.roughnessMap.isTexture&&(n.roughnessMap=this.roughnessMap.toJSON(e).uuid),this.metalnessMap&&this.metalnessMap.isTexture&&(n.metalnessMap=this.metalnessMap.toJSON(e).uuid),this.emissiveMap&&this.emissiveMap.isTexture&&(n.emissiveMap=this.emissiveMap.toJSON(e).uuid),this.specularMap&&this.specularMap.isTexture&&(n.specularMap=this.specularMap.toJSON(e).uuid),this.specularIntensityMap&&this.specularIntensityMap.isTexture&&(n.specularIntensityMap=this.specularIntensityMap.toJSON(e).uuid),this.specularColorMap&&this.specularColorMap.isTexture&&(n.specularColorMap=this.specularColorMap.toJSON(e).uuid),this.envMap&&this.envMap.isTexture&&(n.envMap=this.envMap.toJSON(e).uuid,this.combine!==void 0&&(n.combine=this.combine)),this.envMapRotation!==void 0&&(n.envMapRotation=this.envMapRotation.toArray()),this.envMapIntensity!==void 0&&(n.envMapIntensity=this.envMapIntensity),this.reflectivity!==void 0&&(n.reflectivity=this.reflectivity),this.refractionRatio!==void 0&&(n.refractionRatio=this.refractionRatio),this.gradientMap&&this.gradientMap.isTexture&&(n.gradientMap=this.gradientMap.toJSON(e).uuid),this.transmission!==void 0&&(n.transmission=this.transmission),this.transmissionMap&&this.transmissionMap.isTexture&&(n.transmissionMap=this.transmissionMap.toJSON(e).uuid),this.thickness!==void 0&&(n.thickness=this.thickness),this.thicknessMap&&this.thicknessMap.isTexture&&(n.thicknessMap=this.thicknessMap.toJSON(e).uuid),this.attenuationDistance!==void 0&&this.attenuationDistance!==1/0&&(n.attenuationDistance=this.attenuationDistance),this.attenuationColor!==void 0&&(n.attenuationColor=this.attenuationColor.getHex()),this.size!==void 0&&(n.size=this.size),this.shadowSide!==null&&(n.shadowSide=this.shadowSide),this.sizeAttenuation!==void 0&&(n.sizeAttenuation=this.sizeAttenuation),this.blending!==Yi&&(n.blending=this.blending),this.side!==ni&&(n.side=this.side),this.vertexColors===!0&&(n.vertexColors=!0),this.opacity<1&&(n.opacity=this.opacity),this.transparent===!0&&(n.transparent=!0),this.blendSrc!==Ua&&(n.blendSrc=this.blendSrc),this.blendDst!==Na&&(n.blendDst=this.blendDst),this.blendEquation!==vi&&(n.blendEquation=this.blendEquation),this.blendSrcAlpha!==null&&(n.blendSrcAlpha=this.blendSrcAlpha),this.blendDstAlpha!==null&&(n.blendDstAlpha=this.blendDstAlpha),this.blendEquationAlpha!==null&&(n.blendEquationAlpha=this.blendEquationAlpha),this.blendColor&&this.blendColor.isColor&&(n.blendColor=this.blendColor.getHex()),this.blendAlpha!==0&&(n.blendAlpha=this.blendAlpha),this.depthFunc!==$i&&(n.depthFunc=this.depthFunc),this.depthTest===!1&&(n.depthTest=this.depthTest),this.depthWrite===!1&&(n.depthWrite=this.depthWrite),this.colorWrite===!1&&(n.colorWrite=this.colorWrite),this.stencilWriteMask!==255&&(n.stencilWriteMask=this.stencilWriteMask),this.stencilFunc!==Ml&&(n.stencilFunc=this.stencilFunc),this.stencilRef!==0&&(n.stencilRef=this.stencilRef),this.stencilFuncMask!==255&&(n.stencilFuncMask=this.stencilFuncMask),this.stencilFail!==Xi&&(n.stencilFail=this.stencilFail),this.stencilZFail!==Xi&&(n.stencilZFail=this.stencilZFail),this.stencilZPass!==Xi&&(n.stencilZPass=this.stencilZPass),this.stencilWrite===!0&&(n.stencilWrite=this.stencilWrite),this.rotation!==void 0&&this.rotation!==0&&(n.rotation=this.rotation),this.polygonOffset===!0&&(n.polygonOffset=!0),this.polygonOffsetFactor!==0&&(n.polygonOffsetFactor=this.polygonOffsetFactor),this.polygonOffsetUnits!==0&&(n.polygonOffsetUnits=this.polygonOffsetUnits),this.linewidth!==void 0&&this.linewidth!==1&&(n.linewidth=this.linewidth),this.dashSize!==void 0&&(n.dashSize=this.dashSize),this.gapSize!==void 0&&(n.gapSize=this.gapSize),this.scale!==void 0&&(n.scale=this.scale),this.dithering===!0&&(n.dithering=!0),this.alphaTest>0&&(n.alphaTest=this.alphaTest),this.alphaHash===!0&&(n.alphaHash=!0),this.alphaToCoverage===!0&&(n.alphaToCoverage=!0),this.premultipliedAlpha===!0&&(n.premultipliedAlpha=!0),this.forceSinglePass===!0&&(n.forceSinglePass=!0),this.allowOverride===!1&&(n.allowOverride=!1),this.wireframe===!0&&(n.wireframe=!0),this.wireframeLinewidth>1&&(n.wireframeLinewidth=this.wireframeLinewidth),this.wireframeLinecap!=="round"&&(n.wireframeLinecap=this.wireframeLinecap),this.wireframeLinejoin!=="round"&&(n.wireframeLinejoin=this.wireframeLinejoin),this.flatShading===!0&&(n.flatShading=!0),this.visible===!1&&(n.visible=!1),this.toneMapped===!1&&(n.toneMapped=!1),this.fog===!1&&(n.fog=!1),Object.keys(this.userData).length>0&&(n.userData=this.userData);function s(r){let a=[];for(let o in r){let c=r[o];delete c.metadata,a.push(c)}return a}if(t){let r=s(e.textures),a=s(e.images);r.length>0&&(n.textures=r),a.length>0&&(n.images=a)}return n}fromJSON(e,t){if(e.uuid!==void 0&&(this.uuid=e.uuid),e.name!==void 0&&(this.name=e.name),e.color!==void 0&&this.color!==void 0&&this.color.setHex(e.color),e.roughness!==void 0&&(this.roughness=e.roughness),e.metalness!==void 0&&(this.metalness=e.metalness),e.sheen!==void 0&&(this.sheen=e.sheen),e.sheenColor!==void 0&&(this.sheenColor=new Xe().setHex(e.sheenColor)),e.sheenRoughness!==void 0&&(this.sheenRoughness=e.sheenRoughness),e.emissive!==void 0&&this.emissive!==void 0&&this.emissive.setHex(e.emissive),e.specular!==void 0&&this.specular!==void 0&&this.specular.setHex(e.specular),e.specularIntensity!==void 0&&(this.specularIntensity=e.specularIntensity),e.specularColor!==void 0&&this.specularColor!==void 0&&this.specularColor.setHex(e.specularColor),e.shininess!==void 0&&(this.shininess=e.shininess),e.clearcoat!==void 0&&(this.clearcoat=e.clearcoat),e.clearcoatRoughness!==void 0&&(this.clearcoatRoughness=e.clearcoatRoughness),e.dispersion!==void 0&&(this.dispersion=e.dispersion),e.iridescence!==void 0&&(this.iridescence=e.iridescence),e.iridescenceIOR!==void 0&&(this.iridescenceIOR=e.iridescenceIOR),e.iridescenceThicknessRange!==void 0&&(this.iridescenceThicknessRange=e.iridescenceThicknessRange),e.transmission!==void 0&&(this.transmission=e.transmission),e.thickness!==void 0&&(this.thickness=e.thickness),e.attenuationDistance!==void 0&&(this.attenuationDistance=e.attenuationDistance),e.attenuationColor!==void 0&&this.attenuationColor!==void 0&&this.attenuationColor.setHex(e.attenuationColor),e.anisotropy!==void 0&&(this.anisotropy=e.anisotropy),e.anisotropyRotation!==void 0&&(this.anisotropyRotation=e.anisotropyRotation),e.fog!==void 0&&(this.fog=e.fog),e.flatShading!==void 0&&(this.flatShading=e.flatShading),e.blending!==void 0&&(this.blending=e.blending),e.combine!==void 0&&(this.combine=e.combine),e.side!==void 0&&(this.side=e.side),e.shadowSide!==void 0&&(this.shadowSide=e.shadowSide),e.opacity!==void 0&&(this.opacity=e.opacity),e.transparent!==void 0&&(this.transparent=e.transparent),e.alphaTest!==void 0&&(this.alphaTest=e.alphaTest),e.alphaHash!==void 0&&(this.alphaHash=e.alphaHash),e.depthFunc!==void 0&&(this.depthFunc=e.depthFunc),e.depthTest!==void 0&&(this.depthTest=e.depthTest),e.depthWrite!==void 0&&(this.depthWrite=e.depthWrite),e.colorWrite!==void 0&&(this.colorWrite=e.colorWrite),e.blendSrc!==void 0&&(this.blendSrc=e.blendSrc),e.blendDst!==void 0&&(this.blendDst=e.blendDst),e.blendEquation!==void 0&&(this.blendEquation=e.blendEquation),e.blendSrcAlpha!==void 0&&(this.blendSrcAlpha=e.blendSrcAlpha),e.blendDstAlpha!==void 0&&(this.blendDstAlpha=e.blendDstAlpha),e.blendEquationAlpha!==void 0&&(this.blendEquationAlpha=e.blendEquationAlpha),e.blendColor!==void 0&&this.blendColor!==void 0&&this.blendColor.setHex(e.blendColor),e.blendAlpha!==void 0&&(this.blendAlpha=e.blendAlpha),e.stencilWriteMask!==void 0&&(this.stencilWriteMask=e.stencilWriteMask),e.stencilFunc!==void 0&&(this.stencilFunc=e.stencilFunc),e.stencilRef!==void 0&&(this.stencilRef=e.stencilRef),e.stencilFuncMask!==void 0&&(this.stencilFuncMask=e.stencilFuncMask),e.stencilFail!==void 0&&(this.stencilFail=e.stencilFail),e.stencilZFail!==void 0&&(this.stencilZFail=e.stencilZFail),e.stencilZPass!==void 0&&(this.stencilZPass=e.stencilZPass),e.stencilWrite!==void 0&&(this.stencilWrite=e.stencilWrite),e.wireframe!==void 0&&(this.wireframe=e.wireframe),e.wireframeLinewidth!==void 0&&(this.wireframeLinewidth=e.wireframeLinewidth),e.wireframeLinecap!==void 0&&(this.wireframeLinecap=e.wireframeLinecap),e.wireframeLinejoin!==void 0&&(this.wireframeLinejoin=e.wireframeLinejoin),e.rotation!==void 0&&(this.rotation=e.rotation),e.linewidth!==void 0&&(this.linewidth=e.linewidth),e.dashSize!==void 0&&(this.dashSize=e.dashSize),e.gapSize!==void 0&&(this.gapSize=e.gapSize),e.scale!==void 0&&(this.scale=e.scale),e.polygonOffset!==void 0&&(this.polygonOffset=e.polygonOffset),e.polygonOffsetFactor!==void 0&&(this.polygonOffsetFactor=e.polygonOffsetFactor),e.polygonOffsetUnits!==void 0&&(this.polygonOffsetUnits=e.polygonOffsetUnits),e.dithering!==void 0&&(this.dithering=e.dithering),e.alphaToCoverage!==void 0&&(this.alphaToCoverage=e.alphaToCoverage),e.premultipliedAlpha!==void 0&&(this.premultipliedAlpha=e.premultipliedAlpha),e.forceSinglePass!==void 0&&(this.forceSinglePass=e.forceSinglePass),e.allowOverride!==void 0&&(this.allowOverride=e.allowOverride),e.visible!==void 0&&(this.visible=e.visible),e.toneMapped!==void 0&&(this.toneMapped=e.toneMapped),e.userData!==void 0&&(this.userData=e.userData),e.vertexColors!==void 0&&(typeof e.vertexColors=="number"?this.vertexColors=e.vertexColors>0:this.vertexColors=e.vertexColors),e.size!==void 0&&(this.size=e.size),e.sizeAttenuation!==void 0&&(this.sizeAttenuation=e.sizeAttenuation),e.map!==void 0&&(this.map=t[e.map]||null),e.matcap!==void 0&&(this.matcap=t[e.matcap]||null),e.alphaMap!==void 0&&(this.alphaMap=t[e.alphaMap]||null),e.bumpMap!==void 0&&(this.bumpMap=t[e.bumpMap]||null),e.bumpScale!==void 0&&(this.bumpScale=e.bumpScale),e.normalMap!==void 0&&(this.normalMap=t[e.normalMap]||null),e.normalMapType!==void 0&&(this.normalMapType=e.normalMapType),e.normalScale!==void 0){let n=e.normalScale;Array.isArray(n)===!1&&(n=[n,n]),this.normalScale=new _e().fromArray(n)}return e.displacementMap!==void 0&&(this.displacementMap=t[e.displacementMap]||null),e.displacementScale!==void 0&&(this.displacementScale=e.displacementScale),e.displacementBias!==void 0&&(this.displacementBias=e.displacementBias),e.roughnessMap!==void 0&&(this.roughnessMap=t[e.roughnessMap]||null),e.metalnessMap!==void 0&&(this.metalnessMap=t[e.metalnessMap]||null),e.emissiveMap!==void 0&&(this.emissiveMap=t[e.emissiveMap]||null),e.emissiveIntensity!==void 0&&(this.emissiveIntensity=e.emissiveIntensity),e.specularMap!==void 0&&(this.specularMap=t[e.specularMap]||null),e.specularIntensityMap!==void 0&&(this.specularIntensityMap=t[e.specularIntensityMap]||null),e.specularColorMap!==void 0&&(this.specularColorMap=t[e.specularColorMap]||null),e.envMap!==void 0&&(this.envMap=t[e.envMap]||null),e.envMapRotation!==void 0&&this.envMapRotation.fromArray(e.envMapRotation),e.envMapIntensity!==void 0&&(this.envMapIntensity=e.envMapIntensity),e.reflectivity!==void 0&&(this.reflectivity=e.reflectivity),e.refractionRatio!==void 0&&(this.refractionRatio=e.refractionRatio),e.lightMap!==void 0&&(this.lightMap=t[e.lightMap]||null),e.lightMapIntensity!==void 0&&(this.lightMapIntensity=e.lightMapIntensity),e.aoMap!==void 0&&(this.aoMap=t[e.aoMap]||null),e.aoMapIntensity!==void 0&&(this.aoMapIntensity=e.aoMapIntensity),e.gradientMap!==void 0&&(this.gradientMap=t[e.gradientMap]||null),e.clearcoatMap!==void 0&&(this.clearcoatMap=t[e.clearcoatMap]||null),e.clearcoatRoughnessMap!==void 0&&(this.clearcoatRoughnessMap=t[e.clearcoatRoughnessMap]||null),e.clearcoatNormalMap!==void 0&&(this.clearcoatNormalMap=t[e.clearcoatNormalMap]||null),e.clearcoatNormalScale!==void 0&&(this.clearcoatNormalScale=new _e().fromArray(e.clearcoatNormalScale)),e.iridescenceMap!==void 0&&(this.iridescenceMap=t[e.iridescenceMap]||null),e.iridescenceThicknessMap!==void 0&&(this.iridescenceThicknessMap=t[e.iridescenceThicknessMap]||null),e.transmissionMap!==void 0&&(this.transmissionMap=t[e.transmissionMap]||null),e.thicknessMap!==void 0&&(this.thicknessMap=t[e.thicknessMap]||null),e.anisotropyMap!==void 0&&(this.anisotropyMap=t[e.anisotropyMap]||null),e.sheenColorMap!==void 0&&(this.sheenColorMap=t[e.sheenColorMap]||null),e.sheenRoughnessMap!==void 0&&(this.sheenRoughnessMap=t[e.sheenRoughnessMap]||null),this}clone(){return new this.constructor().copy(this)}copy(e){this.name=e.name,this.blending=e.blending,this.side=e.side,this.vertexColors=e.vertexColors,this.opacity=e.opacity,this.transparent=e.transparent,this.blendSrc=e.blendSrc,this.blendDst=e.blendDst,this.blendEquation=e.blendEquation,this.blendSrcAlpha=e.blendSrcAlpha,this.blendDstAlpha=e.blendDstAlpha,this.blendEquationAlpha=e.blendEquationAlpha,this.blendColor.copy(e.blendColor),this.blendAlpha=e.blendAlpha,this.depthFunc=e.depthFunc,this.depthTest=e.depthTest,this.depthWrite=e.depthWrite,this.stencilWriteMask=e.stencilWriteMask,this.stencilFunc=e.stencilFunc,this.stencilRef=e.stencilRef,this.stencilFuncMask=e.stencilFuncMask,this.stencilFail=e.stencilFail,this.stencilZFail=e.stencilZFail,this.stencilZPass=e.stencilZPass,this.stencilWrite=e.stencilWrite;let t=e.clippingPlanes,n=null;if(t!==null){let s=t.length;n=new Array(s);for(let r=0;r!==s;++r)n[r]=t[r].clone()}return this.clippingPlanes=n,this.clipIntersection=e.clipIntersection,this.clipShadows=e.clipShadows,this.shadowSide=e.shadowSide,this.colorWrite=e.colorWrite,this.precision=e.precision,this.polygonOffset=e.polygonOffset,this.polygonOffsetFactor=e.polygonOffsetFactor,this.polygonOffsetUnits=e.polygonOffsetUnits,this.dithering=e.dithering,this.alphaTest=e.alphaTest,this.alphaHash=e.alphaHash,this.alphaToCoverage=e.alphaToCoverage,this.premultipliedAlpha=e.premultipliedAlpha,this.forceSinglePass=e.forceSinglePass,this.allowOverride=e.allowOverride,this.visible=e.visible,this.toneMapped=e.toneMapped,this.userData=JSON.parse(JSON.stringify(e.userData)),this}dispose(){this.dispatchEvent({type:"dispose"})}set needsUpdate(e){e===!0&&this.version++}};var ei=new L,ll=new L,ga=new L,gi=new L,hl=new L,xa=new L,ul=new L,ur=class{constructor(e=new L,t=new L(0,0,-1)){this.origin=e,this.direction=t}set(e,t){return this.origin.copy(e),this.direction.copy(t),this}copy(e){return this.origin.copy(e.origin),this.direction.copy(e.direction),this}at(e,t){return t.copy(this.origin).addScaledVector(this.direction,e)}lookAt(e){return this.direction.copy(e).sub(this.origin).normalize(),this}recast(e){return this.origin.copy(this.at(e,ei)),this}closestPointToPoint(e,t){t.subVectors(e,this.origin);let n=t.dot(this.direction);return n<0?t.copy(this.origin):t.copy(this.origin).addScaledVector(this.direction,n)}distanceToPoint(e){return Math.sqrt(this.distanceSqToPoint(e))}distanceSqToPoint(e){let t=ei.subVectors(e,this.origin).dot(this.direction);return t<0?this.origin.distanceToSquared(e):(ei.copy(this.origin).addScaledVector(this.direction,t),ei.distanceToSquared(e))}distanceSqToSegment(e,t,n,s){ll.copy(e).add(t).multiplyScalar(.5),ga.copy(t).sub(e).normalize(),gi.copy(this.origin).sub(ll);let r=e.distanceTo(t)*.5,a=-this.direction.dot(ga),o=gi.dot(this.direction),c=-gi.dot(ga),l=gi.lengthSq(),h=Math.abs(1-a*a),d,u,f,m;if(h>0)if(d=a*c-o,u=a*o-c,m=r*h,d>=0)if(u>=-m)if(u<=m){let _=1/h;d*=_,u*=_,f=d*(d+a*u+2*o)+u*(a*d+u+2*c)+l}else u=r,d=Math.max(0,-(a*u+o)),f=-d*d+u*(u+2*c)+l;else u=-r,d=Math.max(0,-(a*u+o)),f=-d*d+u*(u+2*c)+l;else u<=-m?(d=Math.max(0,-(-a*r+o)),u=d>0?-r:Math.min(Math.max(-r,-c),r),f=-d*d+u*(u+2*c)+l):u<=m?(d=0,u=Math.min(Math.max(-r,-c),r),f=u*(u+2*c)+l):(d=Math.max(0,-(a*r+o)),u=d>0?r:Math.min(Math.max(-r,-c),r),f=-d*d+u*(u+2*c)+l);else u=a>0?-r:r,d=Math.max(0,-(a*u+o)),f=-d*d+u*(u+2*c)+l;return n&&n.copy(this.origin).addScaledVector(this.direction,d),s&&s.copy(ll).addScaledVector(ga,u),f}intersectSphere(e,t){ei.subVectors(e.center,this.origin);let n=ei.dot(this.direction),s=ei.dot(ei)-n*n,r=e.radius*e.radius;if(s>r)return null;let a=Math.sqrt(r-s),o=n-a,c=n+a;return c<0?null:o<0?this.at(c,t):this.at(o,t)}intersectsSphere(e){return e.radius<0?!1:this.distanceSqToPoint(e.center)<=e.radius*e.radius}distanceToPlane(e){let t=e.normal.dot(this.direction);if(t===0)return e.distanceToPoint(this.origin)===0?0:null;let n=-(this.origin.dot(e.normal)+e.constant)/t;return n>=0?n:null}intersectPlane(e,t){let n=this.distanceToPlane(e);return n===null?null:this.at(n,t)}intersectsPlane(e){let t=e.distanceToPoint(this.origin);return t===0||e.normal.dot(this.direction)*t<0}intersectBox(e,t){let n,s,r,a,o,c,l=1/this.direction.x,h=1/this.direction.y,d=1/this.direction.z,u=this.origin;return l>=0?(n=(e.min.x-u.x)*l,s=(e.max.x-u.x)*l):(n=(e.max.x-u.x)*l,s=(e.min.x-u.x)*l),h>=0?(r=(e.min.y-u.y)*h,a=(e.max.y-u.y)*h):(r=(e.max.y-u.y)*h,a=(e.min.y-u.y)*h),n>a||r>s||((r>n||isNaN(n))&&(n=r),(a<s||isNaN(s))&&(s=a),d>=0?(o=(e.min.z-u.z)*d,c=(e.max.z-u.z)*d):(o=(e.max.z-u.z)*d,c=(e.min.z-u.z)*d),n>c||o>s)||((o>n||n!==n)&&(n=o),(c<s||s!==s)&&(s=c),s<0)?null:this.at(n>=0?n:s,t)}intersectsBox(e){return this.intersectBox(e,ei)!==null}intersectTriangle(e,t,n,s,r){hl.subVectors(t,e),xa.subVectors(n,e),ul.crossVectors(hl,xa);let a=this.direction.dot(ul),o;if(a>0){if(s)return null;o=1}else if(a<0)o=-1,a=-a;else return null;gi.subVectors(this.origin,e);let c=o*this.direction.dot(xa.crossVectors(gi,xa));if(c<0)return null;let l=o*this.direction.dot(hl.cross(gi));if(l<0||c+l>a)return null;let h=-o*gi.dot(ul);return h<0?null:this.at(h/a,r)}applyMatrix4(e){return this.origin.applyMatrix4(e),this.direction.transformDirection(e),this}equals(e){return e.origin.equals(this.origin)&&e.direction.equals(this.direction)}clone(){return new this.constructor().copy(this)}},Mi=class extends Si{constructor(e){super(),this.isMeshBasicMaterial=!0,this.type="MeshBasicMaterial",this.color=new Xe(16777215),this.map=null,this.lightMap=null,this.lightMapIntensity=1,this.aoMap=null,this.aoMapIntensity=1,this.specularMap=null,this.alphaMap=null,this.envMap=null,this.envMapRotation=new bi,this.combine=Dl,this.reflectivity=1,this.refractionRatio=.98,this.wireframe=!1,this.wireframeLinewidth=1,this.wireframeLinecap="round",this.wireframeLinejoin="round",this.fog=!0,this.setValues(e)}copy(e){return super.copy(e),this.color.copy(e.color),this.map=e.map,this.lightMap=e.lightMap,this.lightMapIntensity=e.lightMapIntensity,this.aoMap=e.aoMap,this.aoMapIntensity=e.aoMapIntensity,this.specularMap=e.specularMap,this.alphaMap=e.alphaMap,this.envMap=e.envMap,this.envMapRotation.copy(e.envMapRotation),this.combine=e.combine,this.reflectivity=e.reflectivity,this.refractionRatio=e.refractionRatio,this.wireframe=e.wireframe,this.wireframeLinewidth=e.wireframeLinewidth,this.wireframeLinecap=e.wireframeLinecap,this.wireframeLinejoin=e.wireframeLinejoin,this.fog=e.fog,this}},Eu=new at,Gi=new ur,_a=new wn,wu=new L,ya=new L,va=new L,ba=new L,dl=new L,Sa=new L,Tu=new L,Ma=new L,Ot=class extends ln{constructor(e=new Nt,t=new Mi){super(),this.isMesh=!0,this.type="Mesh",this.geometry=e,this.material=t,this.morphTargetDictionary=void 0,this.morphTargetInfluences=void 0,this.count=1,this.updateMorphTargets()}copy(e,t){return super.copy(e,t),e.morphTargetInfluences!==void 0&&(this.morphTargetInfluences=e.morphTargetInfluences.slice()),e.morphTargetDictionary!==void 0&&(this.morphTargetDictionary=Object.assign({},e.morphTargetDictionary)),this.material=Array.isArray(e.material)?e.material.slice():e.material,this.geometry=e.geometry,this}updateMorphTargets(){let t=this.geometry.morphAttributes,n=Object.keys(t);if(n.length>0){let s=t[n[0]];if(s!==void 0){this.morphTargetInfluences=[],this.morphTargetDictionary={};for(let r=0,a=s.length;r<a;r++){let o=s[r].name||String(r);this.morphTargetInfluences.push(0),this.morphTargetDictionary[o]=r}}}}getVertexPosition(e,t){let n=this.geometry,s=n.attributes.position,r=n.morphAttributes.position,a=n.morphTargetsRelative;t.fromBufferAttribute(s,e);let o=this.morphTargetInfluences;if(r&&o){Sa.set(0,0,0);for(let c=0,l=r.length;c<l;c++){let h=o[c],d=r[c];h!==0&&(dl.fromBufferAttribute(d,e),a?Sa.addScaledVector(dl,h):Sa.addScaledVector(dl.sub(t),h))}t.add(Sa)}return t}raycast(e,t){let n=this.geometry,s=this.material,r=this.matrixWorld;s!==void 0&&(n.boundingSphere===null&&n.computeBoundingSphere(),_a.copy(n.boundingSphere),_a.applyMatrix4(r),Gi.copy(e.ray).recast(e.near),!(_a.containsPoint(Gi.origin)===!1&&(Gi.intersectSphere(_a,wu)===null||Gi.origin.distanceToSquared(wu)>(e.far-e.near)**2))&&(Eu.copy(r).invert(),Gi.copy(e.ray).applyMatrix4(Eu),!(n.boundingBox!==null&&Gi.intersectsBox(n.boundingBox)===!1)&&this._computeIntersections(e,t,Gi)))}_computeIntersections(e,t,n){let s,r=this.geometry,a=this.material,o=r.index,c=r.attributes.position,l=r.attributes.uv,h=r.attributes.uv1,d=r.attributes.normal,u=r.groups,f=r.drawRange;if(o!==null)if(Array.isArray(a))for(let m=0,_=u.length;m<_;m++){let g=u[m],p=a[g.materialIndex],b=Math.max(g.start,f.start),E=Math.min(o.count,Math.min(g.start+g.count,f.start+f.count));for(let v=b,A=E;v<A;v+=3){let M=o.getX(v),w=o.getX(v+1),x=o.getX(v+2);s=Ea(this,p,e,n,l,h,d,M,w,x),s&&(s.faceIndex=Math.floor(v/3),s.face.materialIndex=g.materialIndex,t.push(s))}}else{let m=Math.max(0,f.start),_=Math.min(o.count,f.start+f.count);for(let g=m,p=_;g<p;g+=3){let b=o.getX(g),E=o.getX(g+1),v=o.getX(g+2);s=Ea(this,a,e,n,l,h,d,b,E,v),s&&(s.faceIndex=Math.floor(g/3),t.push(s))}}else if(c!==void 0)if(Array.isArray(a))for(let m=0,_=u.length;m<_;m++){let g=u[m],p=a[g.materialIndex],b=Math.max(g.start,f.start),E=Math.min(c.count,Math.min(g.start+g.count,f.start+f.count));for(let v=b,A=E;v<A;v+=3){let M=v,w=v+1,x=v+2;s=Ea(this,p,e,n,l,h,d,M,w,x),s&&(s.faceIndex=Math.floor(v/3),s.face.materialIndex=g.materialIndex,t.push(s))}}else{let m=Math.max(0,f.start),_=Math.min(c.count,f.start+f.count);for(let g=m,p=_;g<p;g+=3){let b=g,E=g+1,v=g+2;s=Ea(this,a,e,n,l,h,d,b,E,v),s&&(s.faceIndex=Math.floor(g/3),t.push(s))}}}};function Hp(i,e,t,n,s,r,a,o){let c;if(e.side===Kt?c=n.intersectTriangle(a,r,s,!0,o):c=n.intersectTriangle(s,r,a,e.side===ni,o),c===null)return null;Ma.copy(o),Ma.applyMatrix4(i.matrixWorld);let l=t.ray.origin.distanceTo(Ma);return l<t.near||l>t.far?null:{distance:l,point:Ma.clone(),object:i}}function Ea(i,e,t,n,s,r,a,o,c,l){i.getVertexPosition(o,ya),i.getVertexPosition(c,va),i.getVertexPosition(l,ba);let h=Hp(i,e,t,n,ya,va,ba,Tu);if(h){let d=new L;_i.getBarycoord(Tu,ya,va,ba,d),s&&(h.uv=_i.getInterpolatedAttribute(s,o,c,l,d,new _e)),r&&(h.uv1=_i.getInterpolatedAttribute(r,o,c,l,d,new _e)),a&&(h.normal=_i.getInterpolatedAttribute(a,o,c,l,d,new L),h.normal.dot(n.direction)>0&&h.normal.multiplyScalar(-1));let u={a:o,b:c,c:l,normal:new L,materialIndex:0};_i.getNormal(ya,va,ba,u.normal),h.face=u,h.barycoord=d}return h}var ja=class extends tn{constructor(e=null,t=1,n=1,s,r,a,o,c,l=Dt,h=Dt,d,u){super(null,a,o,c,l,h,s,r,d,u),this.isDataTexture=!0,this.image={data:e,width:t,height:n},this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1}};var fl=new L,Gp=new L,Wp=new De,Un=class{constructor(e=new L(1,0,0),t=0){this.isPlane=!0,this.normal=e,this.constant=t}set(e,t){return this.normal.copy(e),this.constant=t,this}setComponents(e,t,n,s){return this.normal.set(e,t,n),this.constant=s,this}setFromNormalAndCoplanarPoint(e,t){return this.normal.copy(e),this.constant=-t.dot(this.normal),this}setFromCoplanarPoints(e,t,n){let s=fl.subVectors(n,t).cross(Gp.subVectors(e,t)).normalize();return this.setFromNormalAndCoplanarPoint(s,e),this}copy(e){return this.normal.copy(e.normal),this.constant=e.constant,this}normalize(){let e=1/this.normal.length();return this.normal.multiplyScalar(e),this.constant*=e,this}negate(){return this.constant*=-1,this.normal.negate(),this}distanceToPoint(e){return this.normal.dot(e)+this.constant}distanceToSphere(e){return this.distanceToPoint(e.center)-e.radius}projectPoint(e,t){return t.copy(e).addScaledVector(this.normal,-this.distanceToPoint(e))}intersectLine(e,t,n=!0){let s=e.delta(fl),r=this.normal.dot(s);if(r===0)return this.distanceToPoint(e.start)===0?t.copy(e.start):null;let a=-(e.start.dot(this.normal)+this.constant)/r;return n===!0&&(a<0||a>1)?null:t.copy(e.start).addScaledVector(s,a)}intersectsLine(e){let t=this.distanceToPoint(e.start),n=this.distanceToPoint(e.end);return t<0&&n>0||n<0&&t>0}intersectsBox(e){return e.intersectsPlane(this)}intersectsSphere(e){return e.intersectsPlane(this)}coplanarPoint(e){return e.copy(this.normal).multiplyScalar(-this.constant)}applyMatrix4(e,t){let n=t||Wp.getNormalMatrix(e),s=this.coplanarPoint(fl).applyMatrix4(e),r=this.normal.applyMatrix3(n).normalize();return this.constant=-s.dot(r),this}translate(e){return this.constant-=e.dot(this.normal),this}equals(e){return e.normal.equals(this.normal)&&e.constant===this.constant}clone(){return new this.constructor().copy(this)}},Wi=new wn,Xp=new _e(.5,.5),wa=new L,dr=class{constructor(e=new Un,t=new Un,n=new Un,s=new Un,r=new Un,a=new Un){this.planes=[e,t,n,s,r,a]}set(e,t,n,s,r,a){let o=this.planes;return o[0].copy(e),o[1].copy(t),o[2].copy(n),o[3].copy(s),o[4].copy(r),o[5].copy(a),this}copy(e){let t=this.planes;for(let n=0;n<6;n++)t[n].copy(e.planes[n]);return this}setFromProjectionMatrix(e,t=En,n=!1){let s=this.planes,r=e.elements,a=r[0],o=r[1],c=r[2],l=r[3],h=r[4],d=r[5],u=r[6],f=r[7],m=r[8],_=r[9],g=r[10],p=r[11],b=r[12],E=r[13],v=r[14],A=r[15];if(s[0].setComponents(l-a,f-h,p-m,A-b).normalize(),s[1].setComponents(l+a,f+h,p+m,A+b).normalize(),s[2].setComponents(l+o,f+d,p+_,A+E).normalize(),s[3].setComponents(l-o,f-d,p-_,A-E).normalize(),n)s[4].setComponents(c,u,g,v).normalize(),s[5].setComponents(l-c,f-u,p-g,A-v).normalize();else if(s[4].setComponents(l-c,f-u,p-g,A-v).normalize(),t===En)s[5].setComponents(l+c,f+u,p+g,A+v).normalize();else if(t===ir)s[5].setComponents(c,u,g,v).normalize();else throw new Error("THREE.Frustum.setFromProjectionMatrix(): Invalid coordinate system: "+t);return this}intersectsObject(e){if(e.boundingSphere!==void 0)e.boundingSphere===null&&e.computeBoundingSphere(),Wi.copy(e.boundingSphere).applyMatrix4(e.matrixWorld);else{let t=e.geometry;t.boundingSphere===null&&t.computeBoundingSphere(),Wi.copy(t.boundingSphere).applyMatrix4(e.matrixWorld)}return this.intersectsSphere(Wi)}intersectsSprite(e){Wi.center.set(0,0,0);let t=Xp.distanceTo(e.center);return Wi.radius=.7071067811865476+t,Wi.applyMatrix4(e.matrixWorld),this.intersectsSphere(Wi)}intersectsSphere(e){let t=this.planes,n=e.center,s=-e.radius;for(let r=0;r<6;r++)if(t[r].distanceToPoint(n)<s)return!1;return!0}intersectsBox(e){let t=this.planes;for(let n=0;n<6;n++){let s=t[n];if(wa.x=s.normal.x>0?e.max.x:e.min.x,wa.y=s.normal.y>0?e.max.y:e.min.y,wa.z=s.normal.z>0?e.max.z:e.min.z,s.distanceToPoint(wa)<0)return!1}return!0}containsPoint(e){let t=this.planes;for(let n=0;n<6;n++)if(t[n].distanceToPoint(e)<0)return!1;return!0}clone(){return new this.constructor().copy(this)}};var As=class extends Si{constructor(e){super(),this.isLineBasicMaterial=!0,this.type="LineBasicMaterial",this.color=new Xe(16777215),this.map=null,this.linewidth=1,this.linecap="round",this.linejoin="round",this.fog=!0,this.setValues(e)}copy(e){return super.copy(e),this.color.copy(e.color),this.map=e.map,this.linewidth=e.linewidth,this.linecap=e.linecap,this.linejoin=e.linejoin,this.fog=e.fog,this}},Qa=new L,eo=new L,Au=new at,$s=new ur,Ta=new wn,pl=new L,Pu=new L,to=class extends ln{constructor(e=new Nt,t=new As){super(),this.isLine=!0,this.type="Line",this.geometry=e,this.material=t,this.morphTargetDictionary=void 0,this.morphTargetInfluences=void 0,this.updateMorphTargets()}copy(e,t){return super.copy(e,t),this.material=Array.isArray(e.material)?e.material.slice():e.material,this.geometry=e.geometry,this}computeLineDistances(){let e=this.geometry;if(e.index===null){let t=e.attributes.position,n=[0];for(let s=1,r=t.count;s<r;s++)Qa.fromBufferAttribute(t,s-1),eo.fromBufferAttribute(t,s),n[s]=n[s-1],n[s]+=Qa.distanceTo(eo);e.setAttribute("lineDistance",new lt(n,1))}else Pe("Line.computeLineDistances(): Computation only possible with non-indexed BufferGeometry.");return this}raycast(e,t){let n=this.geometry,s=this.matrixWorld,r=e.params.Line.threshold,a=n.drawRange;if(n.boundingSphere===null&&n.computeBoundingSphere(),Ta.copy(n.boundingSphere),Ta.applyMatrix4(s),Ta.radius+=r,e.ray.intersectsSphere(Ta)===!1)return;Au.copy(s).invert(),$s.copy(e.ray).applyMatrix4(Au);let o=r/((this.scale.x+this.scale.y+this.scale.z)/3),c=o*o,l=this.isLineSegments?2:1,h=n.index,u=n.attributes.position;if(h!==null){let f=Math.max(0,a.start),m=Math.min(h.count,a.start+a.count);for(let _=f,g=m-1;_<g;_+=l){let p=h.getX(_),b=h.getX(_+1),E=Aa(this,e,$s,c,p,b,_);E&&t.push(E)}if(this.isLineLoop){let _=h.getX(m-1),g=h.getX(f),p=Aa(this,e,$s,c,_,g,m-1);p&&t.push(p)}}else{let f=Math.max(0,a.start),m=Math.min(u.count,a.start+a.count);for(let _=f,g=m-1;_<g;_+=l){let p=Aa(this,e,$s,c,_,_+1,_);p&&t.push(p)}if(this.isLineLoop){let _=Aa(this,e,$s,c,m-1,f,m-1);_&&t.push(_)}}}updateMorphTargets(){let t=this.geometry.morphAttributes,n=Object.keys(t);if(n.length>0){let s=t[n[0]];if(s!==void 0){this.morphTargetInfluences=[],this.morphTargetDictionary={};for(let r=0,a=s.length;r<a;r++){let o=s[r].name||String(r);this.morphTargetInfluences.push(0),this.morphTargetDictionary[o]=r}}}}};function Aa(i,e,t,n,s,r,a){let o=i.geometry.attributes.position;if(Qa.fromBufferAttribute(o,s),eo.fromBufferAttribute(o,r),t.distanceSqToSegment(Qa,eo,pl,Pu)>n)return;pl.applyMatrix4(i.matrixWorld);let l=e.ray.origin.distanceTo(pl);if(!(l<e.near||l>e.far))return{distance:l,point:Pu.clone().applyMatrix4(i.matrixWorld),index:a,face:null,faceIndex:null,barycoord:null,object:i}}var Cu=new L,Ru=new L,fr=class extends to{constructor(e,t){super(e,t),this.isLineSegments=!0,this.type="LineSegments"}computeLineDistances(){let e=this.geometry;if(e.index===null){let t=e.attributes.position,n=[];for(let s=0,r=t.count;s<r;s+=2)Cu.fromBufferAttribute(t,s),Ru.fromBufferAttribute(t,s+1),n[s]=s===0?0:n[s-1],n[s+1]=n[s]+Cu.distanceTo(Ru);e.setAttribute("lineDistance",new lt(n,1))}else Pe("LineSegments.computeLineDistances(): Computation only possible with non-indexed BufferGeometry.");return this}};var pr=class extends tn{constructor(e=[],t=Pi,n,s,r,a,o,c,l,h){super(e,t,n,s,r,a,o,c,l,h),this.isCubeTexture=!0,this.flipY=!1}get images(){return this.image}set images(e){this.image=e}};var ii=class extends tn{constructor(e,t,n=Pn,s,r,a,o=Dt,c=Dt,l,h=zn,d=1){if(h!==zn&&h!==Ri)throw new Error("THREE.DepthTexture: format must be either THREE.DepthFormat or THREE.DepthStencilFormat");let u={width:e,height:t,depth:d};super(u,s,r,a,o,c,h,n,l),this.isDepthTexture=!0,this.flipY=!1,this.generateMipmaps=!1,this.compareFunction=null}copy(e){return super.copy(e),this.source=new ws(Object.assign({},e.image)),this.compareFunction=e.compareFunction,this}toJSON(e){let t=super.toJSON(e);return this.compareFunction!==null&&(t.compareFunction=this.compareFunction),t}},no=class extends ii{constructor(e,t=Pn,n=Pi,s,r,a=Dt,o=Dt,c,l=zn){let h={width:e,height:e,depth:1},d=[h,h,h,h,h,h];super(e,e,t,n,s,r,a,o,c,l),this.image=d,this.isCubeDepthTexture=!0,this.isCubeTexture=!0}get images(){return this.image}set images(e){this.image=e}},mr=class extends tn{constructor(e=null){super(),this.sourceTexture=e,this.isExternalTexture=!0}copy(e){return super.copy(e),this.sourceTexture=e.sourceTexture,this}},Ps=class i extends Nt{constructor(e=1,t=1,n=1,s=1,r=1,a=1){super(),this.type="BoxGeometry",this.parameters={width:e,height:t,depth:n,widthSegments:s,heightSegments:r,depthSegments:a};let o=this;s=Math.floor(s),r=Math.floor(r),a=Math.floor(a);let c=[],l=[],h=[],d=[],u=0,f=0;m("z","y","x",-1,-1,n,t,e,a,r,0),m("z","y","x",1,-1,n,t,-e,a,r,1),m("x","z","y",1,1,e,n,t,s,a,2),m("x","z","y",1,-1,e,n,-t,s,a,3),m("x","y","z",1,-1,e,t,n,s,r,4),m("x","y","z",-1,-1,e,t,-n,s,r,5),this.setIndex(c),this.setAttribute("position",new lt(l,3)),this.setAttribute("normal",new lt(h,3)),this.setAttribute("uv",new lt(d,2));function m(_,g,p,b,E,v,A,M,w,x,T){let R=v/w,C=A/x,D=v/2,I=A/2,V=M/2,F=w+1,X=x+1,B=0,$=0,J=new L;for(let ne=0;ne<X;ne++){let de=ne*C-I;for(let ve=0;ve<F;ve++){let Ke=ve*R-D;J[_]=Ke*b,J[g]=de*E,J[p]=V,l.push(J.x,J.y,J.z),J[_]=0,J[g]=0,J[p]=M>0?1:-1,h.push(J.x,J.y,J.z),d.push(ve/w),d.push(1-ne/x),B+=1}}for(let ne=0;ne<x;ne++)for(let de=0;de<w;de++){let ve=u+de+F*ne,Ke=u+de+F*(ne+1),dt=u+(de+1)+F*(ne+1),Ze=u+(de+1)+F*ne;c.push(ve,Ke,Ze),c.push(Ke,dt,Ze),$+=6}o.addGroup(f,$,T),f+=$,u+=B}}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(e){return new i(e.width,e.height,e.depth,e.widthSegments,e.heightSegments,e.depthSegments)}};var un=class{constructor(){this.type="Curve",this.arcLengthDivisions=200,this.needsUpdate=!1,this.cacheArcLengths=null}getPoint(){Pe("Curve: .getPoint() not implemented.")}getPointAt(e,t){let n=this.getUtoTmapping(e);return this.getPoint(n,t)}getPoints(e=5){let t=[];for(let n=0;n<=e;n++)t.push(this.getPoint(n/e));return t}getSpacedPoints(e=5){let t=[];for(let n=0;n<=e;n++)t.push(this.getPointAt(n/e));return t}getLength(){let e=this.getLengths();return e[e.length-1]}getLengths(e=this.arcLengthDivisions){if(this.cacheArcLengths&&this.cacheArcLengths.length===e+1&&!this.needsUpdate)return this.cacheArcLengths;this.needsUpdate=!1;let t=[],n,s=this.getPoint(0),r=0;t.push(0);for(let a=1;a<=e;a++)n=this.getPoint(a/e),r+=n.distanceTo(s),t.push(r),s=n;return this.cacheArcLengths=t,t}updateArcLengths(){this.needsUpdate=!0,this.getLengths()}getUtoTmapping(e,t=null){let n=this.getLengths(),s=0,r=n.length,a;t?a=t:a=e*n[r-1];let o=0,c=r-1,l;for(;o<=c;)if(s=Math.floor(o+(c-o)/2),l=n[s]-a,l<0)o=s+1;else if(l>0)c=s-1;else{c=s;break}if(s=c,n[s]===a)return s/(r-1);let h=n[s],u=n[s+1]-h,f=(a-h)/u;return(s+f)/(r-1)}getTangent(e,t){let s=e-1e-4,r=e+1e-4;s<0&&(s=0),r>1&&(r=1);let a=this.getPoint(s),o=this.getPoint(r),c=t||(a.isVector2?new _e:new L);return c.copy(o).sub(a).normalize(),c}getTangentAt(e,t){let n=this.getUtoTmapping(e);return this.getTangent(n,t)}computeFrenetFrames(e,t=!1){let n=new L,s=[],r=[],a=[],o=new L,c=new at;for(let f=0;f<=e;f++){let m=f/e;s[f]=this.getTangentAt(m,new L)}r[0]=new L,a[0]=new L;let l=Number.MAX_VALUE,h=Math.abs(s[0].x),d=Math.abs(s[0].y),u=Math.abs(s[0].z);h<=l&&(l=h,n.set(1,0,0)),d<=l&&(l=d,n.set(0,1,0)),u<=l&&n.set(0,0,1),o.crossVectors(s[0],n).normalize(),r[0].crossVectors(s[0],o),a[0].crossVectors(s[0],r[0]);for(let f=1;f<=e;f++){if(r[f]=r[f-1].clone(),a[f]=a[f-1].clone(),o.crossVectors(s[f-1],s[f]),o.length()>Number.EPSILON){o.normalize();let m=Math.acos(Ue(s[f-1].dot(s[f]),-1,1));r[f].applyMatrix4(c.makeRotationAxis(o,m))}a[f].crossVectors(s[f],r[f])}if(t===!0){let f=Math.acos(Ue(r[0].dot(r[e]),-1,1));f/=e,s[0].dot(o.crossVectors(r[0],r[e]))>0&&(f=-f);for(let m=1;m<=e;m++)r[m].applyMatrix4(c.makeRotationAxis(s[m],f*m)),a[m].crossVectors(s[m],r[m])}return{tangents:s,normals:r,binormals:a}}clone(){return new this.constructor().copy(this)}copy(e){return this.arcLengthDivisions=e.arcLengthDivisions,this}toJSON(){let e={metadata:{version:4.7,type:"Curve",generator:"Curve.toJSON"}};return e.arcLengthDivisions=this.arcLengthDivisions,e.type=this.type,e}fromJSON(e){return this.arcLengthDivisions=e.arcLengthDivisions,this}},Cs=class extends un{constructor(e=0,t=0,n=1,s=1,r=0,a=Math.PI*2,o=!1,c=0){super(),this.isEllipseCurve=!0,this.type="EllipseCurve",this.aX=e,this.aY=t,this.xRadius=n,this.yRadius=s,this.aStartAngle=r,this.aEndAngle=a,this.aClockwise=o,this.aRotation=c}getPoint(e,t=new _e){let n=t,s=Math.PI*2,r=this.aEndAngle-this.aStartAngle,a=Math.abs(r)<Number.EPSILON;for(;r<0;)r+=s;for(;r>s;)r-=s;r<Number.EPSILON&&(a?r=0:r=s),this.aClockwise===!0&&!a&&(r===s?r=-s:r=r-s);let o=this.aStartAngle+e*r,c=this.aX+this.xRadius*Math.cos(o),l=this.aY+this.yRadius*Math.sin(o);if(this.aRotation!==0){let h=Math.cos(this.aRotation),d=Math.sin(this.aRotation),u=c-this.aX,f=l-this.aY;c=u*h-f*d+this.aX,l=u*d+f*h+this.aY}return n.set(c,l)}copy(e){return super.copy(e),this.aX=e.aX,this.aY=e.aY,this.xRadius=e.xRadius,this.yRadius=e.yRadius,this.aStartAngle=e.aStartAngle,this.aEndAngle=e.aEndAngle,this.aClockwise=e.aClockwise,this.aRotation=e.aRotation,this}toJSON(){let e=super.toJSON();return e.aX=this.aX,e.aY=this.aY,e.xRadius=this.xRadius,e.yRadius=this.yRadius,e.aStartAngle=this.aStartAngle,e.aEndAngle=this.aEndAngle,e.aClockwise=this.aClockwise,e.aRotation=this.aRotation,e}fromJSON(e){return super.fromJSON(e),this.aX=e.aX,this.aY=e.aY,this.xRadius=e.xRadius,this.yRadius=e.yRadius,this.aStartAngle=e.aStartAngle,this.aEndAngle=e.aEndAngle,this.aClockwise=e.aClockwise,this.aRotation=e.aRotation,this}},io=class extends Cs{constructor(e,t,n,s,r,a){super(e,t,n,n,s,r,a),this.isArcCurve=!0,this.type="ArcCurve"}};function Ql(){let i=0,e=0,t=0,n=0;function s(r,a,o,c){i=r,e=o,t=-3*r+3*a-2*o-c,n=2*r-2*a+o+c}return{initCatmullRom:function(r,a,o,c,l){s(a,o,l*(o-r),l*(c-a))},initNonuniformCatmullRom:function(r,a,o,c,l,h,d){let u=(a-r)/l-(o-r)/(l+h)+(o-a)/h,f=(o-a)/h-(c-a)/(h+d)+(c-o)/d;u*=h,f*=h,s(a,o,u,f)},calc:function(r){let a=r*r,o=a*r;return i+e*r+t*a+n*o}}}var Iu=new L,Lu=new L,ml=new Ql,gl=new Ql,xl=new Ql,so=class extends un{constructor(e=[],t=!1,n="centripetal",s=.5){super(),this.isCatmullRomCurve3=!0,this.type="CatmullRomCurve3",this.points=e,this.closed=t,this.curveType=n,this.tension=s}getPoint(e,t=new L){let n=t,s=this.points,r=s.length,a=(r-(this.closed?0:1))*e,o=Math.floor(a),c=a-o;this.closed?o+=o>0?0:(Math.floor(Math.abs(o)/r)+1)*r:c===0&&o===r-1&&(o=r-2,c=1);let l,h;this.closed||o>0?l=s[(o-1)%r]:(Lu.subVectors(s[0],s[1]).add(s[0]),l=Lu);let d=s[o%r],u=s[(o+1)%r];if(this.closed||o+2<r?h=s[(o+2)%r]:(Iu.subVectors(s[r-1],s[r-2]).add(s[r-1]),h=Iu),this.curveType==="centripetal"||this.curveType==="chordal"){let f=this.curveType==="chordal"?.5:.25,m=Math.pow(l.distanceToSquared(d),f),_=Math.pow(d.distanceToSquared(u),f),g=Math.pow(u.distanceToSquared(h),f);_<1e-4&&(_=1),m<1e-4&&(m=_),g<1e-4&&(g=_),ml.initNonuniformCatmullRom(l.x,d.x,u.x,h.x,m,_,g),gl.initNonuniformCatmullRom(l.y,d.y,u.y,h.y,m,_,g),xl.initNonuniformCatmullRom(l.z,d.z,u.z,h.z,m,_,g)}else this.curveType==="catmullrom"&&(ml.initCatmullRom(l.x,d.x,u.x,h.x,this.tension),gl.initCatmullRom(l.y,d.y,u.y,h.y,this.tension),xl.initCatmullRom(l.z,d.z,u.z,h.z,this.tension));return n.set(ml.calc(c),gl.calc(c),xl.calc(c)),n}copy(e){super.copy(e),this.points=[];for(let t=0,n=e.points.length;t<n;t++){let s=e.points[t];this.points.push(s.clone())}return this.closed=e.closed,this.curveType=e.curveType,this.tension=e.tension,this}toJSON(){let e=super.toJSON();e.points=[];for(let t=0,n=this.points.length;t<n;t++){let s=this.points[t];e.points.push(s.toArray())}return e.closed=this.closed,e.curveType=this.curveType,e.tension=this.tension,e}fromJSON(e){super.fromJSON(e),this.points=[];for(let t=0,n=e.points.length;t<n;t++){let s=e.points[t];this.points.push(new L().fromArray(s))}return this.closed=e.closed,this.curveType=e.curveType,this.tension=e.tension,this}};function Du(i,e,t,n,s){let r=(n-e)*.5,a=(s-t)*.5,o=i*i,c=i*o;return(2*t-2*n+r+a)*c+(-3*t+3*n-2*r-a)*o+r*i+t}function qp(i,e){let t=1-i;return t*t*e}function Yp(i,e){return 2*(1-i)*i*e}function $p(i,e){return i*i*e}function js(i,e,t,n){return qp(i,e)+Yp(i,t)+$p(i,n)}function Kp(i,e){let t=1-i;return t*t*t*e}function Zp(i,e){let t=1-i;return 3*t*t*i*e}function Jp(i,e){return 3*(1-i)*i*i*e}function jp(i,e){return i*i*i*e}function Qs(i,e,t,n,s){return Kp(i,e)+Zp(i,t)+Jp(i,n)+jp(i,s)}var gr=class extends un{constructor(e=new _e,t=new _e,n=new _e,s=new _e){super(),this.isCubicBezierCurve=!0,this.type="CubicBezierCurve",this.v0=e,this.v1=t,this.v2=n,this.v3=s}getPoint(e,t=new _e){let n=t,s=this.v0,r=this.v1,a=this.v2,o=this.v3;return n.set(Qs(e,s.x,r.x,a.x,o.x),Qs(e,s.y,r.y,a.y,o.y)),n}copy(e){return super.copy(e),this.v0.copy(e.v0),this.v1.copy(e.v1),this.v2.copy(e.v2),this.v3.copy(e.v3),this}toJSON(){let e=super.toJSON();return e.v0=this.v0.toArray(),e.v1=this.v1.toArray(),e.v2=this.v2.toArray(),e.v3=this.v3.toArray(),e}fromJSON(e){return super.fromJSON(e),this.v0.fromArray(e.v0),this.v1.fromArray(e.v1),this.v2.fromArray(e.v2),this.v3.fromArray(e.v3),this}},ro=class extends un{constructor(e=new L,t=new L,n=new L,s=new L){super(),this.isCubicBezierCurve3=!0,this.type="CubicBezierCurve3",this.v0=e,this.v1=t,this.v2=n,this.v3=s}getPoint(e,t=new L){let n=t,s=this.v0,r=this.v1,a=this.v2,o=this.v3;return n.set(Qs(e,s.x,r.x,a.x,o.x),Qs(e,s.y,r.y,a.y,o.y),Qs(e,s.z,r.z,a.z,o.z)),n}copy(e){return super.copy(e),this.v0.copy(e.v0),this.v1.copy(e.v1),this.v2.copy(e.v2),this.v3.copy(e.v3),this}toJSON(){let e=super.toJSON();return e.v0=this.v0.toArray(),e.v1=this.v1.toArray(),e.v2=this.v2.toArray(),e.v3=this.v3.toArray(),e}fromJSON(e){return super.fromJSON(e),this.v0.fromArray(e.v0),this.v1.fromArray(e.v1),this.v2.fromArray(e.v2),this.v3.fromArray(e.v3),this}},xr=class extends un{constructor(e=new _e,t=new _e){super(),this.isLineCurve=!0,this.type="LineCurve",this.v1=e,this.v2=t}getPoint(e,t=new _e){let n=t;return e===1?n.copy(this.v2):(n.copy(this.v2).sub(this.v1),n.multiplyScalar(e).add(this.v1)),n}getPointAt(e,t){return this.getPoint(e,t)}getTangent(e,t=new _e){return t.subVectors(this.v2,this.v1).normalize()}getTangentAt(e,t){return this.getTangent(e,t)}copy(e){return super.copy(e),this.v1.copy(e.v1),this.v2.copy(e.v2),this}toJSON(){let e=super.toJSON();return e.v1=this.v1.toArray(),e.v2=this.v2.toArray(),e}fromJSON(e){return super.fromJSON(e),this.v1.fromArray(e.v1),this.v2.fromArray(e.v2),this}},ao=class extends un{constructor(e=new L,t=new L){super(),this.isLineCurve3=!0,this.type="LineCurve3",this.v1=e,this.v2=t}getPoint(e,t=new L){let n=t;return e===1?n.copy(this.v2):(n.copy(this.v2).sub(this.v1),n.multiplyScalar(e).add(this.v1)),n}getPointAt(e,t){return this.getPoint(e,t)}getTangent(e,t=new L){return t.subVectors(this.v2,this.v1).normalize()}getTangentAt(e,t){return this.getTangent(e,t)}copy(e){return super.copy(e),this.v1.copy(e.v1),this.v2.copy(e.v2),this}toJSON(){let e=super.toJSON();return e.v1=this.v1.toArray(),e.v2=this.v2.toArray(),e}fromJSON(e){return super.fromJSON(e),this.v1.fromArray(e.v1),this.v2.fromArray(e.v2),this}},_r=class extends un{constructor(e=new _e,t=new _e,n=new _e){super(),this.isQuadraticBezierCurve=!0,this.type="QuadraticBezierCurve",this.v0=e,this.v1=t,this.v2=n}getPoint(e,t=new _e){let n=t,s=this.v0,r=this.v1,a=this.v2;return n.set(js(e,s.x,r.x,a.x),js(e,s.y,r.y,a.y)),n}copy(e){return super.copy(e),this.v0.copy(e.v0),this.v1.copy(e.v1),this.v2.copy(e.v2),this}toJSON(){let e=super.toJSON();return e.v0=this.v0.toArray(),e.v1=this.v1.toArray(),e.v2=this.v2.toArray(),e}fromJSON(e){return super.fromJSON(e),this.v0.fromArray(e.v0),this.v1.fromArray(e.v1),this.v2.fromArray(e.v2),this}},oo=class extends un{constructor(e=new L,t=new L,n=new L){super(),this.isQuadraticBezierCurve3=!0,this.type="QuadraticBezierCurve3",this.v0=e,this.v1=t,this.v2=n}getPoint(e,t=new L){let n=t,s=this.v0,r=this.v1,a=this.v2;return n.set(js(e,s.x,r.x,a.x),js(e,s.y,r.y,a.y),js(e,s.z,r.z,a.z)),n}copy(e){return super.copy(e),this.v0.copy(e.v0),this.v1.copy(e.v1),this.v2.copy(e.v2),this}toJSON(){let e=super.toJSON();return e.v0=this.v0.toArray(),e.v1=this.v1.toArray(),e.v2=this.v2.toArray(),e}fromJSON(e){return super.fromJSON(e),this.v0.fromArray(e.v0),this.v1.fromArray(e.v1),this.v2.fromArray(e.v2),this}},yr=class extends un{constructor(e=[]){super(),this.isSplineCurve=!0,this.type="SplineCurve",this.points=e}getPoint(e,t=new _e){let n=t,s=this.points,r=(s.length-1)*e,a=Math.floor(r),o=r-a,c=s[a===0?a:a-1],l=s[a],h=s[a>s.length-2?s.length-1:a+1],d=s[a>s.length-3?s.length-1:a+2];return n.set(Du(o,c.x,l.x,h.x,d.x),Du(o,c.y,l.y,h.y,d.y)),n}copy(e){super.copy(e),this.points=[];for(let t=0,n=e.points.length;t<n;t++){let s=e.points[t];this.points.push(s.clone())}return this}toJSON(){let e=super.toJSON();e.points=[];for(let t=0,n=this.points.length;t<n;t++){let s=this.points[t];e.points.push(s.toArray())}return e}fromJSON(e){super.fromJSON(e),this.points=[];for(let t=0,n=e.points.length;t<n;t++){let s=e.points[t];this.points.push(new _e().fromArray(s))}return this}},Fu=Object.freeze({__proto__:null,ArcCurve:io,CatmullRomCurve3:so,CubicBezierCurve:gr,CubicBezierCurve3:ro,EllipseCurve:Cs,LineCurve:xr,LineCurve3:ao,QuadraticBezierCurve:_r,QuadraticBezierCurve3:oo,SplineCurve:yr}),co=class extends un{constructor(){super(),this.type="CurvePath",this.curves=[],this.autoClose=!1}add(e){this.curves.push(e)}closePath(){let e=this.curves[0].getPoint(0),t=this.curves[this.curves.length-1].getPoint(1);if(!e.equals(t)){let n=e.isVector2===!0?"LineCurve":"LineCurve3";this.curves.push(new Fu[n](t,e))}return this}getPoint(e,t){let n=e*this.getLength(),s=this.getCurveLengths(),r=0;for(;r<s.length;){if(s[r]>=n){let a=s[r]-n,o=this.curves[r],c=o.getLength(),l=c===0?0:1-a/c;return o.getPointAt(l,t)}r++}return null}getLength(){let e=this.getCurveLengths();return e[e.length-1]}updateArcLengths(){this.needsUpdate=!0,this.cacheLengths=null,this.getCurveLengths()}getCurveLengths(){if(this.cacheLengths&&this.cacheLengths.length===this.curves.length)return this.cacheLengths;let e=[],t=0;for(let n=0,s=this.curves.length;n<s;n++)t+=this.curves[n].getLength(),e.push(t);return this.cacheLengths=e,e}getSpacedPoints(e=40){let t=[];for(let n=0;n<=e;n++)t.push(this.getPoint(n/e));return this.autoClose&&t.push(t[0]),t}getPoints(e=12){let t=[],n;for(let s=0,r=this.curves;s<r.length;s++){let a=r[s],o=a.isEllipseCurve?e*2:a.isLineCurve||a.isLineCurve3?1:a.isSplineCurve?e*a.points.length:e,c=a.getPoints(o);for(let l=0;l<c.length;l++){let h=c[l];n&&n.equals(h)||(t.push(h),n=h)}}return this.autoClose&&t.length>1&&!t[t.length-1].equals(t[0])&&t.push(t[0]),t}copy(e){super.copy(e),this.curves=[];for(let t=0,n=e.curves.length;t<n;t++){let s=e.curves[t];this.curves.push(s.clone())}return this.autoClose=e.autoClose,this}toJSON(){let e=super.toJSON();e.autoClose=this.autoClose,e.curves=[];for(let t=0,n=this.curves.length;t<n;t++){let s=this.curves[t];e.curves.push(s.toJSON())}return e}fromJSON(e){super.fromJSON(e),this.autoClose=e.autoClose,this.curves=[];for(let t=0,n=e.curves.length;t<n;t++){let s=e.curves[t];this.curves.push(new Fu[s.type]().fromJSON(s))}return this}},Ki=class extends co{constructor(e){super(),this.type="Path",this.currentPoint=new _e,e&&this.setFromPoints(e)}setFromPoints(e){this.moveTo(e[0].x,e[0].y);for(let t=1,n=e.length;t<n;t++)this.lineTo(e[t].x,e[t].y);return this}moveTo(e,t){return this.currentPoint.set(e,t),this}lineTo(e,t){let n=new xr(this.currentPoint.clone(),new _e(e,t));return this.curves.push(n),this.currentPoint.set(e,t),this}quadraticCurveTo(e,t,n,s){let r=new _r(this.currentPoint.clone(),new _e(e,t),new _e(n,s));return this.curves.push(r),this.currentPoint.set(n,s),this}bezierCurveTo(e,t,n,s,r,a){let o=new gr(this.currentPoint.clone(),new _e(e,t),new _e(n,s),new _e(r,a));return this.curves.push(o),this.currentPoint.set(r,a),this}splineThru(e){let t=[this.currentPoint.clone()].concat(e),n=new yr(t);return this.curves.push(n),this.currentPoint.copy(e[e.length-1]),this}arc(e,t,n,s,r,a){let o=this.currentPoint.x,c=this.currentPoint.y;return this.absarc(e+o,t+c,n,s,r,a),this}absarc(e,t,n,s,r,a){return this.absellipse(e,t,n,n,s,r,a),this}ellipse(e,t,n,s,r,a,o,c){let l=this.currentPoint.x,h=this.currentPoint.y;return this.absellipse(e+l,t+h,n,s,r,a,o,c),this}absellipse(e,t,n,s,r,a,o,c){let l=new Cs(e,t,n,s,r,a,o,c);if(this.curves.length>0){let d=l.getPoint(0);d.equals(this.currentPoint)||this.lineTo(d.x,d.y)}this.curves.push(l);let h=l.getPoint(1);return this.currentPoint.copy(h),this}copy(e){return super.copy(e),this.currentPoint.copy(e.currentPoint),this}toJSON(){let e=super.toJSON();return e.currentPoint=this.currentPoint.toArray(),e}fromJSON(e){return super.fromJSON(e),this.currentPoint.fromArray(e.currentPoint),this}},Rs=class extends Ki{constructor(e){super(e),this.uuid=Bn(),this.type="Shape",this.holes=[]}getPointsHoles(e){let t=[];for(let n=0,s=this.holes.length;n<s;n++)t[n]=this.holes[n].getPoints(e);return t}extractPoints(e){return{shape:this.getPoints(e),holes:this.getPointsHoles(e)}}copy(e){super.copy(e),this.holes=[];for(let t=0,n=e.holes.length;t<n;t++){let s=e.holes[t];this.holes.push(s.clone())}return this}toJSON(){let e=super.toJSON();e.uuid=this.uuid,e.holes=[];for(let t=0,n=this.holes.length;t<n;t++){let s=this.holes[t];e.holes.push(s.toJSON())}return e}fromJSON(e){super.fromJSON(e),this.uuid=e.uuid,this.holes=[];for(let t=0,n=e.holes.length;t<n;t++){let s=e.holes[t];this.holes.push(new Ki().fromJSON(s))}return this}};function Qp(i,e,t=2){let n=e&&e.length,s=n?e[0]*t:i.length,r=Td(i,0,s,t,!0),a=[];if(!r||r.next===r.prev)return a;let o,c,l;if(n&&(r=sm(i,e,r,t)),i.length>80*t){o=i[0],c=i[1];let h=o,d=c;for(let u=t;u<s;u+=t){let f=i[u],m=i[u+1];f<o&&(o=f),m<c&&(c=m),f>h&&(h=f),m>d&&(d=m)}l=Math.max(h-o,d-c),l=l!==0?32767/l:0}return vr(r,a,t,o,c,l,0),a}function Td(i,e,t,n,s){let r;if(s===mm(i,e,t,n)>0)for(let a=e;a<t;a+=n)r=Uu(a/n|0,i[a],i[a+1],r);else for(let a=t-n;a>=e;a-=n)r=Uu(a/n|0,i[a],i[a+1],r);return r&&Is(r,r.next)&&(Sr(r),r=r.next),r}function Zi(i,e){if(!i)return i;e||(e=i);let t=i,n;do if(n=!1,!t.steiner&&(Is(t,t.next)||ut(t.prev,t,t.next)===0)){if(Sr(t),t=e=t.prev,t===t.next)break;n=!0}else t=t.next;while(n||t!==e);return e}function vr(i,e,t,n,s,r,a){if(!i)return;!a&&r&&lm(i,n,s,r);let o=i;for(;i.prev!==i.next;){let c=i.prev,l=i.next;if(r?tm(i,n,s,r):em(i)){e.push(c.i,i.i,l.i),Sr(i),i=l.next,o=l.next;continue}if(i=l,i===o){a?a===1?(i=nm(Zi(i),e),vr(i,e,t,n,s,r,2)):a===2&&im(i,e,t,n,s,r):vr(Zi(i),e,t,n,s,r,1);break}}}function em(i){let e=i.prev,t=i,n=i.next;if(ut(e,t,n)>=0)return!1;let s=e.x,r=t.x,a=n.x,o=e.y,c=t.y,l=n.y,h=Math.min(s,r,a),d=Math.min(o,c,l),u=Math.max(s,r,a),f=Math.max(o,c,l),m=n.next;for(;m!==e;){if(m.x>=h&&m.x<=u&&m.y>=d&&m.y<=f&&Ks(s,o,r,c,a,l,m.x,m.y)&&ut(m.prev,m,m.next)>=0)return!1;m=m.next}return!0}function tm(i,e,t,n){let s=i.prev,r=i,a=i.next;if(ut(s,r,a)>=0)return!1;let o=s.x,c=r.x,l=a.x,h=s.y,d=r.y,u=a.y,f=Math.min(o,c,l),m=Math.min(h,d,u),_=Math.max(o,c,l),g=Math.max(h,d,u),p=El(f,m,e,t,n),b=El(_,g,e,t,n),E=i.prevZ,v=i.nextZ;for(;E&&E.z>=p&&v&&v.z<=b;){if(E.x>=f&&E.x<=_&&E.y>=m&&E.y<=g&&E!==s&&E!==a&&Ks(o,h,c,d,l,u,E.x,E.y)&&ut(E.prev,E,E.next)>=0||(E=E.prevZ,v.x>=f&&v.x<=_&&v.y>=m&&v.y<=g&&v!==s&&v!==a&&Ks(o,h,c,d,l,u,v.x,v.y)&&ut(v.prev,v,v.next)>=0))return!1;v=v.nextZ}for(;E&&E.z>=p;){if(E.x>=f&&E.x<=_&&E.y>=m&&E.y<=g&&E!==s&&E!==a&&Ks(o,h,c,d,l,u,E.x,E.y)&&ut(E.prev,E,E.next)>=0)return!1;E=E.prevZ}for(;v&&v.z<=b;){if(v.x>=f&&v.x<=_&&v.y>=m&&v.y<=g&&v!==s&&v!==a&&Ks(o,h,c,d,l,u,v.x,v.y)&&ut(v.prev,v,v.next)>=0)return!1;v=v.nextZ}return!0}function nm(i,e){let t=i;do{let n=t.prev,s=t.next.next;!Is(n,s)&&Pd(n,t,t.next,s)&&br(n,s)&&br(s,n)&&(e.push(n.i,t.i,s.i),Sr(t),Sr(t.next),t=i=s),t=t.next}while(t!==i);return Zi(t)}function im(i,e,t,n,s,r){let a=i;do{let o=a.next.next;for(;o!==a.prev;){if(a.i!==o.i&&dm(a,o)){let c=Cd(a,o);a=Zi(a,a.next),c=Zi(c,c.next),vr(a,e,t,n,s,r,0),vr(c,e,t,n,s,r,0);return}o=o.next}a=a.next}while(a!==i)}function sm(i,e,t,n){let s=[];for(let r=0,a=e.length;r<a;r++){let o=e[r]*n,c=r<a-1?e[r+1]*n:i.length,l=Td(i,o,c,n,!1);l===l.next&&(l.steiner=!0),s.push(um(l))}s.sort(rm);for(let r=0;r<s.length;r++)t=am(s[r],t);return t}function rm(i,e){let t=i.x-e.x;if(t===0&&(t=i.y-e.y,t===0)){let n=(i.next.y-i.y)/(i.next.x-i.x),s=(e.next.y-e.y)/(e.next.x-e.x);t=n-s}return t}function am(i,e){let t=om(i,e);if(!t)return e;let n=Cd(t,i);return Zi(n,n.next),Zi(t,t.next)}function om(i,e){let t=e,n=i.x,s=i.y,r=-1/0,a;if(Is(i,t))return t;do{if(Is(i,t.next))return t.next;if(s<=t.y&&s>=t.next.y&&t.next.y!==t.y){let d=t.x+(s-t.y)*(t.next.x-t.x)/(t.next.y-t.y);if(d<=n&&d>r&&(r=d,a=t.x<t.next.x?t:t.next,d===n))return a}t=t.next}while(t!==e);if(!a)return null;let o=a,c=a.x,l=a.y,h=1/0;t=a;do{if(n>=t.x&&t.x>=c&&n!==t.x&&Ad(s<l?n:r,s,c,l,s<l?r:n,s,t.x,t.y)){let d=Math.abs(s-t.y)/(n-t.x);br(t,i)&&(d<h||d===h&&(t.x>a.x||t.x===a.x&&cm(a,t)))&&(a=t,h=d)}t=t.next}while(t!==o);return a}function cm(i,e){return ut(i.prev,i,e.prev)<0&&ut(e.next,i,i.next)<0}function lm(i,e,t,n){let s=i;do s.z===0&&(s.z=El(s.x,s.y,e,t,n)),s.prevZ=s.prev,s.nextZ=s.next,s=s.next;while(s!==i);s.prevZ.nextZ=null,s.prevZ=null,hm(s)}function hm(i){let e,t=1;do{let n=i,s;i=null;let r=null;for(e=0;n;){e++;let a=n,o=0;for(let l=0;l<t&&(o++,a=a.nextZ,!!a);l++);let c=t;for(;o>0||c>0&&a;)o!==0&&(c===0||!a||n.z<=a.z)?(s=n,n=n.nextZ,o--):(s=a,a=a.nextZ,c--),r?r.nextZ=s:i=s,s.prevZ=r,r=s;n=a}r.nextZ=null,t*=2}while(e>1);return i}function El(i,e,t,n,s){return i=(i-t)*s|0,e=(e-n)*s|0,i=(i|i<<8)&16711935,i=(i|i<<4)&252645135,i=(i|i<<2)&858993459,i=(i|i<<1)&1431655765,e=(e|e<<8)&16711935,e=(e|e<<4)&252645135,e=(e|e<<2)&858993459,e=(e|e<<1)&1431655765,i|e<<1}function um(i){let e=i,t=i;do(e.x<t.x||e.x===t.x&&e.y<t.y)&&(t=e),e=e.next;while(e!==i);return t}function Ad(i,e,t,n,s,r,a,o){return(s-a)*(e-o)>=(i-a)*(r-o)&&(i-a)*(n-o)>=(t-a)*(e-o)&&(t-a)*(r-o)>=(s-a)*(n-o)}function Ks(i,e,t,n,s,r,a,o){return!(i===a&&e===o)&&Ad(i,e,t,n,s,r,a,o)}function dm(i,e){return i.next.i!==e.i&&i.prev.i!==e.i&&!fm(i,e)&&(br(i,e)&&br(e,i)&&pm(i,e)&&(ut(i.prev,i,e.prev)||ut(i,e.prev,e))||Is(i,e)&&ut(i.prev,i,i.next)>0&&ut(e.prev,e,e.next)>0)}function ut(i,e,t){return(e.y-i.y)*(t.x-e.x)-(e.x-i.x)*(t.y-e.y)}function Is(i,e){return i.x===e.x&&i.y===e.y}function Pd(i,e,t,n){let s=Ca(ut(i,e,t)),r=Ca(ut(i,e,n)),a=Ca(ut(t,n,i)),o=Ca(ut(t,n,e));return!!(s!==r&&a!==o||s===0&&Pa(i,t,e)||r===0&&Pa(i,n,e)||a===0&&Pa(t,i,n)||o===0&&Pa(t,e,n))}function Pa(i,e,t){return e.x<=Math.max(i.x,t.x)&&e.x>=Math.min(i.x,t.x)&&e.y<=Math.max(i.y,t.y)&&e.y>=Math.min(i.y,t.y)}function Ca(i){return i>0?1:i<0?-1:0}function fm(i,e){let t=i;do{if(t.i!==i.i&&t.next.i!==i.i&&t.i!==e.i&&t.next.i!==e.i&&Pd(t,t.next,i,e))return!0;t=t.next}while(t!==i);return!1}function br(i,e){return ut(i.prev,i,i.next)<0?ut(i,e,i.next)>=0&&ut(i,i.prev,e)>=0:ut(i,e,i.prev)<0||ut(i,i.next,e)<0}function pm(i,e){let t=i,n=!1,s=(i.x+e.x)/2,r=(i.y+e.y)/2;do t.y>r!=t.next.y>r&&t.next.y!==t.y&&s<(t.next.x-t.x)*(r-t.y)/(t.next.y-t.y)+t.x&&(n=!n),t=t.next;while(t!==i);return n}function Cd(i,e){let t=wl(i.i,i.x,i.y),n=wl(e.i,e.x,e.y),s=i.next,r=e.prev;return i.next=e,e.prev=i,t.next=s,s.prev=t,n.next=t,t.prev=n,r.next=n,n.prev=r,n}function Uu(i,e,t,n){let s=wl(i,e,t);return n?(s.next=n.next,s.prev=n,n.next.prev=s,n.next=s):(s.prev=s,s.next=s),s}function Sr(i){i.next.prev=i.prev,i.prev.next=i.next,i.prevZ&&(i.prevZ.nextZ=i.nextZ),i.nextZ&&(i.nextZ.prevZ=i.prevZ)}function wl(i,e,t){return{i,x:e,y:t,prev:null,next:null,z:0,prevZ:null,nextZ:null,steiner:!1}}function mm(i,e,t,n){let s=0;for(let r=e,a=t-n;r<t;r+=n)s+=(i[a]-i[r])*(i[r+1]+i[a+1]),a=r;return s}var Tl=class{static triangulate(e,t,n=2){return Qp(e,t,n)}},yi=class i{static area(e){let t=e.length,n=0;for(let s=t-1,r=0;r<t;s=r++)n+=e[s].x*e[r].y-e[r].x*e[s].y;return n*.5}static isClockWise(e){return i.area(e)<0}static triangulateShape(e,t){let n=[],s=[],r=[];Nu(e),Ou(n,e);let a=e.length;t.forEach(Nu);for(let c=0;c<t.length;c++)s.push(a),a+=t[c].length,Ou(n,t[c]);let o=Tl.triangulate(n,s);for(let c=0;c<o.length;c+=3)r.push(o.slice(c,c+3));return r}};function Nu(i){let e=i.length;e>2&&i[e-1].equals(i[0])&&i.pop()}function Ou(i,e){for(let t=0;t<e.length;t++)i.push(e[t].x),i.push(e[t].y)}var Mr=class i extends Nt{constructor(e=1,t=1,n=1,s=1){super(),this.type="PlaneGeometry",this.parameters={width:e,height:t,widthSegments:n,heightSegments:s};let r=e/2,a=t/2,o=Math.floor(n),c=Math.floor(s),l=o+1,h=c+1,d=e/o,u=t/c,f=[],m=[],_=[],g=[];for(let p=0;p<h;p++){let b=p*u-a;for(let E=0;E<l;E++){let v=E*d-r;m.push(v,-b,0),_.push(0,0,1),g.push(E/o),g.push(1-p/c)}}for(let p=0;p<c;p++)for(let b=0;b<o;b++){let E=b+l*p,v=b+l*(p+1),A=b+1+l*(p+1),M=b+1+l*p;f.push(E,v,M),f.push(v,A,M)}this.setIndex(f),this.setAttribute("position",new lt(m,3)),this.setAttribute("normal",new lt(_,3)),this.setAttribute("uv",new lt(g,2))}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(e){return new i(e.width,e.height,e.widthSegments,e.heightSegments)}};var Er=class i extends Nt{constructor(e=new Rs([new _e(0,.5),new _e(-.5,-.5),new _e(.5,-.5)]),t=12){super(),this.type="ShapeGeometry",this.parameters={shapes:e,curveSegments:t};let n=[],s=[],r=[],a=[],o=0,c=0;if(Array.isArray(e)===!1)l(e);else for(let h=0;h<e.length;h++)l(e[h]),this.addGroup(o,c,h),o+=c,c=0;this.setIndex(n),this.setAttribute("position",new lt(s,3)),this.setAttribute("normal",new lt(r,3)),this.setAttribute("uv",new lt(a,2));function l(h){let d=s.length/3,u=h.extractPoints(t),f=u.shape,m=u.holes;yi.isClockWise(f)===!1&&(f=f.reverse());for(let g=0,p=m.length;g<p;g++){let b=m[g];yi.isClockWise(b)===!0&&(m[g]=b.reverse())}let _=yi.triangulateShape(f,m);for(let g=0,p=m.length;g<p;g++){let b=m[g];f=f.concat(b)}for(let g=0,p=f.length;g<p;g++){let b=f[g];s.push(b.x,b.y,0),r.push(0,0,1),a.push(b.x,b.y)}for(let g=0,p=_.length;g<p;g++){let b=_[g],E=b[0]+d,v=b[1]+d,A=b[2]+d;n.push(E,v,A),c+=3}}}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}toJSON(){let e=super.toJSON(),t=this.parameters.shapes;return gm(t,e)}static fromJSON(e,t){let n=[];for(let s=0,r=e.shapes.length;s<r;s++){let a=t[e.shapes[s]];n.push(a)}return new i(n,e.curveSegments)}};function gm(i,e){if(e.shapes=[],Array.isArray(i))for(let t=0,n=i.length;t<n;t++){let s=i[t];e.shapes.push(s.uuid)}else e.shapes.push(i.uuid);return e}var wr=class i extends Nt{constructor(e=1,t=32,n=16,s=0,r=Math.PI*2,a=0,o=Math.PI){super(),this.type="SphereGeometry",this.parameters={radius:e,widthSegments:t,heightSegments:n,phiStart:s,phiLength:r,thetaStart:a,thetaLength:o},t=Math.max(3,Math.floor(t)),n=Math.max(2,Math.floor(n));let c=Math.min(a+o,Math.PI),l=0,h=[],d=new L,u=new L,f=[],m=[],_=[],g=[];for(let p=0;p<=n;p++){let b=[],E=p/n,v=a+E*o,A=e*Math.cos(v),M=Math.sqrt(e*e-A*A),w=0;p===0&&a===0?w=.5/t:p===n&&c===Math.PI&&(w=-.5/t);for(let x=0;x<=t;x++){let T=x/t,R=s+T*r;d.x=-M*Math.cos(R),d.y=A,d.z=M*Math.sin(R),m.push(d.x,d.y,d.z),u.copy(d).normalize(),_.push(u.x,u.y,u.z),g.push(T+w,1-E),b.push(l++)}h.push(b)}for(let p=0;p<n;p++)for(let b=0;b<t;b++){let E=h[p][b+1],v=h[p][b],A=h[p+1][b],M=h[p+1][b+1];(p!==0||a>0)&&f.push(E,v,M),(p!==n-1||c<Math.PI)&&f.push(v,A,M)}this.setIndex(f),this.setAttribute("position",new lt(m,3)),this.setAttribute("normal",new lt(_,3)),this.setAttribute("uv",new lt(g,2))}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(e){return new i(e.radius,e.widthSegments,e.heightSegments,e.phiStart,e.phiLength,e.thetaStart,e.thetaLength)}};var Tr=class extends Nt{constructor(e=null){if(super(),this.type="WireframeGeometry",this.parameters={geometry:e},e!==null){let t=[],n=new Set,s=new L,r=new L;if(e.index!==null){let a=e.attributes.position,o=e.index,c=e.groups;c.length===0&&(c=[{start:0,count:o.count,materialIndex:0}]);for(let l=0,h=c.length;l<h;++l){let d=c[l],u=d.start,f=d.count;for(let m=u,_=u+f;m<_;m+=3)for(let g=0;g<3;g++){let p=o.getX(m+g),b=o.getX(m+(g+1)%3);s.fromBufferAttribute(a,p),r.fromBufferAttribute(a,b),Bu(s,r,n)===!0&&(t.push(s.x,s.y,s.z),t.push(r.x,r.y,r.z))}}}else{let a=e.attributes.position;for(let o=0,c=a.count/3;o<c;o++)for(let l=0;l<3;l++){let h=3*o+l,d=3*o+(l+1)%3;s.fromBufferAttribute(a,h),r.fromBufferAttribute(a,d),Bu(s,r,n)===!0&&(t.push(s.x,s.y,s.z),t.push(r.x,r.y,r.z))}}this.setAttribute("position",new lt(t,3))}}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}};function Bu(i,e,t){let n=`${i.x},${i.y},${i.z}-${e.x},${e.y},${e.z}`,s=`${e.x},${e.y},${e.z}-${i.x},${i.y},${i.z}`;return t.has(n)===!0||t.has(s)===!0?!1:(t.add(n),t.add(s),!0)}function Qi(i){let e={};for(let t in i){e[t]={};for(let n in i[t]){let s=i[t][n];if(zu(s))s.isRenderTargetTexture?(Pe("UniformsUtils: Textures of render targets cannot be cloned via cloneUniforms() or mergeUniforms()."),e[t][n]=null):e[t][n]=s.clone();else if(Array.isArray(s))if(zu(s[0])){let r=[];for(let a=0,o=s.length;a<o;a++)r[a]=s[a].clone();e[t][n]=r}else e[t][n]=s.slice();else e[t][n]=s}}return e}function Xt(i){let e={};for(let t=0;t<i.length;t++){let n=Qi(i[t]);for(let s in n)e[s]=n[s]}return e}function zu(i){return i&&(i.isColor||i.isMatrix3||i.isMatrix4||i.isVector2||i.isVector3||i.isVector4||i.isTexture||i.isQuaternion)}function xm(i){let e=[];for(let t=0;t<i.length;t++)e.push(i[t].clone());return e}function eh(i){let e=i.getRenderTarget();return e===null?i.outputColorSpace:e.isXRRenderTarget===!0?e.texture.colorSpace:We.workingColorSpace}var Vr={clone:Qi,merge:Xt},_m=`void main() {
	gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
}`,ym=`void main() {
	gl_FragColor = vec4( 1.0, 0.0, 0.0, 1.0 );
}`,$t=class extends Si{constructor(e){super(),this.isShaderMaterial=!0,this.type="ShaderMaterial",this.defines={},this.uniforms={},this.uniformsGroups=[],this.vertexShader=_m,this.fragmentShader=ym,this.linewidth=1,this.wireframe=!1,this.wireframeLinewidth=1,this.fog=!1,this.lights=!1,this.clipping=!1,this.forceSinglePass=!0,this.extensions={clipCullDistance:!1,multiDraw:!1},this.defaultAttributeValues={color:[1,1,1],uv:[0,0],uv1:[0,0]},this.index0AttributeName=void 0,this.uniformsNeedUpdate=!1,this.glslVersion=null,e!==void 0&&this.setValues(e)}copy(e){return super.copy(e),this.fragmentShader=e.fragmentShader,this.vertexShader=e.vertexShader,this.uniforms=Qi(e.uniforms),this.uniformsGroups=xm(e.uniformsGroups),this.defines=Object.assign({},e.defines),this.wireframe=e.wireframe,this.wireframeLinewidth=e.wireframeLinewidth,this.fog=e.fog,this.lights=e.lights,this.clipping=e.clipping,this.extensions=Object.assign({},e.extensions),this.glslVersion=e.glslVersion,this.defaultAttributeValues=Object.assign({},e.defaultAttributeValues),this.index0AttributeName=e.index0AttributeName,this.uniformsNeedUpdate=e.uniformsNeedUpdate,this}toJSON(e){let t=super.toJSON(e);t.glslVersion=this.glslVersion,t.uniforms={};for(let s in this.uniforms){let a=this.uniforms[s].value;a&&a.isTexture?t.uniforms[s]={type:"t",value:a.toJSON(e).uuid}:a&&a.isColor?t.uniforms[s]={type:"c",value:a.getHex()}:a&&a.isVector2?t.uniforms[s]={type:"v2",value:a.toArray()}:a&&a.isVector3?t.uniforms[s]={type:"v3",value:a.toArray()}:a&&a.isVector4?t.uniforms[s]={type:"v4",value:a.toArray()}:a&&a.isMatrix3?t.uniforms[s]={type:"m3",value:a.toArray()}:a&&a.isMatrix4?t.uniforms[s]={type:"m4",value:a.toArray()}:t.uniforms[s]={value:a}}Object.keys(this.defines).length>0&&(t.defines=this.defines),t.vertexShader=this.vertexShader,t.fragmentShader=this.fragmentShader,t.lights=this.lights,t.clipping=this.clipping;let n={};for(let s in this.extensions)this.extensions[s]===!0&&(n[s]=!0);return Object.keys(n).length>0&&(t.extensions=n),t}fromJSON(e,t){if(super.fromJSON(e,t),e.uniforms!==void 0)for(let n in e.uniforms){let s=e.uniforms[n];switch(this.uniforms[n]={},s.type){case"t":this.uniforms[n].value=t[s.value]||null;break;case"c":this.uniforms[n].value=new Xe().setHex(s.value);break;case"v2":this.uniforms[n].value=new _e().fromArray(s.value);break;case"v3":this.uniforms[n].value=new L().fromArray(s.value);break;case"v4":this.uniforms[n].value=new tt().fromArray(s.value);break;case"m3":this.uniforms[n].value=new De().fromArray(s.value);break;case"m4":this.uniforms[n].value=new at().fromArray(s.value);break;default:this.uniforms[n].value=s.value}}if(e.defines!==void 0&&(this.defines=e.defines),e.vertexShader!==void 0&&(this.vertexShader=e.vertexShader),e.fragmentShader!==void 0&&(this.fragmentShader=e.fragmentShader),e.glslVersion!==void 0&&(this.glslVersion=e.glslVersion),e.extensions!==void 0)for(let n in e.extensions)this.extensions[n]=e.extensions[n];return e.lights!==void 0&&(this.lights=e.lights),e.clipping!==void 0&&(this.clipping=e.clipping),this}},lo=class extends $t{constructor(e){super(e),this.isRawShaderMaterial=!0,this.type="RawShaderMaterial"}};var ho=class extends Si{constructor(e){super(),this.isMeshDepthMaterial=!0,this.type="MeshDepthMaterial",this.depthPacking=fd,this.map=null,this.alphaMap=null,this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.wireframe=!1,this.wireframeLinewidth=1,this.setValues(e)}copy(e){return super.copy(e),this.depthPacking=e.depthPacking,this.map=e.map,this.alphaMap=e.alphaMap,this.displacementMap=e.displacementMap,this.displacementScale=e.displacementScale,this.displacementBias=e.displacementBias,this.wireframe=e.wireframe,this.wireframeLinewidth=e.wireframeLinewidth,this}},uo=class extends Si{constructor(e){super(),this.isMeshDistanceMaterial=!0,this.type="MeshDistanceMaterial",this.map=null,this.alphaMap=null,this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.setValues(e)}copy(e){return super.copy(e),this.map=e.map,this.alphaMap=e.alphaMap,this.displacementMap=e.displacementMap,this.displacementScale=e.displacementScale,this.displacementBias=e.displacementBias,this}};function Ra(i,e){return!i||i.constructor===e?i:typeof e.BYTES_PER_ELEMENT=="number"?new e(i):Array.prototype.slice.call(i)}var Ei=class{constructor(e,t,n,s){this.parameterPositions=e,this._cachedIndex=0,this.resultBuffer=s!==void 0?s:new t.constructor(n),this.sampleValues=t,this.valueSize=n,this.settings=null,this.DefaultSettings_={}}evaluate(e){let t=this.parameterPositions,n=this._cachedIndex,s=t[n],r=t[n-1];n:{e:{let a;t:{i:if(!(e<s)){for(let o=n+2;;){if(s===void 0){if(e<r)break i;return n=t.length,this._cachedIndex=n,this.copySampleValue_(n-1)}if(n===o)break;if(r=s,s=t[++n],e<s)break e}a=t.length;break t}if(!(e>=r)){let o=t[1];e<o&&(n=2,r=o);for(let c=n-2;;){if(r===void 0)return this._cachedIndex=0,this.copySampleValue_(0);if(n===c)break;if(s=r,r=t[--n-1],e>=r)break e}a=n,n=0;break t}break n}for(;n<a;){let o=n+a>>>1;e<t[o]?a=o:n=o+1}if(s=t[n],r=t[n-1],r===void 0)return this._cachedIndex=0,this.copySampleValue_(0);if(s===void 0)return n=t.length,this._cachedIndex=n,this.copySampleValue_(n-1)}this._cachedIndex=n,this.intervalChanged_(n,r,s)}return this.interpolate_(n,r,e,s)}getSettings_(){return this.settings||this.DefaultSettings_}copySampleValue_(e){let t=this.resultBuffer,n=this.sampleValues,s=this.valueSize,r=e*s;for(let a=0;a!==s;++a)t[a]=n[r+a];return t}interpolate_(){throw new Error("THREE.Interpolant: Call to abstract method.")}intervalChanged_(){}},fo=class extends Ei{constructor(e,t,n,s){super(e,t,n,s),this._weightPrev=-0,this._offsetPrev=-0,this._weightNext=-0,this._offsetNext=-0,this.DefaultSettings_={endingStart:vl,endingEnd:vl}}intervalChanged_(e,t,n){let s=this.parameterPositions,r=e-2,a=e+1,o=s[r],c=s[a];if(o===void 0)switch(this.getSettings_().endingStart){case bl:r=e,o=2*t-n;break;case Sl:r=s.length-2,o=t+s[r]-s[r+1];break;default:r=e,o=n}if(c===void 0)switch(this.getSettings_().endingEnd){case bl:a=e,c=2*n-t;break;case Sl:a=1,c=n+s[1]-s[0];break;default:a=e-1,c=t}let l=(n-t)*.5,h=this.valueSize;this._weightPrev=l/(t-o),this._weightNext=l/(c-n),this._offsetPrev=r*h,this._offsetNext=a*h}interpolate_(e,t,n,s){let r=this.resultBuffer,a=this.sampleValues,o=this.valueSize,c=e*o,l=c-o,h=this._offsetPrev,d=this._offsetNext,u=this._weightPrev,f=this._weightNext,m=(n-t)/(s-t),_=m*m,g=_*m,p=-u*g+2*u*_-u*m,b=(1+u)*g+(-1.5-2*u)*_+(-.5+u)*m+1,E=(-1-f)*g+(1.5+f)*_+.5*m,v=f*g-f*_;for(let A=0;A!==o;++A)r[A]=p*a[h+A]+b*a[l+A]+E*a[c+A]+v*a[d+A];return r}},po=class extends Ei{constructor(e,t,n,s){super(e,t,n,s)}interpolate_(e,t,n,s){let r=this.resultBuffer,a=this.sampleValues,o=this.valueSize,c=e*o,l=c-o,h=(n-t)/(s-t),d=1-h;for(let u=0;u!==o;++u)r[u]=a[l+u]*d+a[c+u]*h;return r}},mo=class extends Ei{constructor(e,t,n,s){super(e,t,n,s)}interpolate_(e){return this.copySampleValue_(e-1)}},go=class extends Ei{interpolate_(e,t,n,s){let r=this.resultBuffer,a=this.sampleValues,o=this.valueSize,c=e*o,l=c-o,h=this.inTangents,d=this.outTangents;if(!h||!d){let m=(n-t)/(s-t),_=1-m;for(let g=0;g!==o;++g)r[g]=a[l+g]*_+a[c+g]*m;return r}let u=o*2,f=e-1;for(let m=0;m!==o;++m){let _=a[l+m],g=a[c+m],p=f*u+m*2,b=d[p],E=d[p+1],v=e*u+m*2,A=h[v],M=h[v+1],w=(n-t)/(s-t),x,T,R,C,D;for(let I=0;I<8;I++){x=w*w,T=x*w,R=1-w,C=R*R,D=C*R;let F=D*t+3*C*w*b+3*R*x*A+T*s-n;if(Math.abs(F)<1e-10)break;let X=3*C*(b-t)+6*R*w*(A-b)+3*x*(s-A);if(Math.abs(X)<1e-10)break;w=w-F/X,w=Math.max(0,Math.min(1,w))}r[m]=D*_+3*C*w*E+3*R*x*M+T*g}return r}},dn=class{constructor(e,t,n,s){if(e===void 0)throw new Error("THREE.KeyframeTrack: track name is undefined");if(t===void 0||t.length===0)throw new Error("THREE.KeyframeTrack: no keyframes in track named "+e);this.name=e,this.times=Ra(t,this.TimeBufferType),this.values=Ra(n,this.ValueBufferType),this.setInterpolation(s||this.DefaultInterpolation)}static toJSON(e){let t=e.constructor,n;if(t.toJSON!==this.toJSON)n=t.toJSON(e);else{n={name:e.name,times:Ra(e.times,Array),values:Ra(e.values,Array)};let s=e.getInterpolation();s!==e.DefaultInterpolation&&(n.interpolation=s)}return n.type=e.ValueTypeName,n}InterpolantFactoryMethodDiscrete(e){return new mo(this.times,this.values,this.getValueSize(),e)}InterpolantFactoryMethodLinear(e){return new po(this.times,this.values,this.getValueSize(),e)}InterpolantFactoryMethodSmooth(e){return new fo(this.times,this.values,this.getValueSize(),e)}InterpolantFactoryMethodBezier(e){let t=new go(this.times,this.values,this.getValueSize(),e);return this.settings&&(t.inTangents=this.settings.inTangents,t.outTangents=this.settings.outTangents),t}setInterpolation(e){let t;switch(e){case er:t=this.InterpolantFactoryMethodDiscrete;break;case qa:t=this.InterpolantFactoryMethodLinear;break;case Fa:t=this.InterpolantFactoryMethodSmooth;break;case yl:t=this.InterpolantFactoryMethodBezier;break}if(t===void 0){let n="unsupported interpolation for "+this.ValueTypeName+" keyframe track named "+this.name;if(this.createInterpolant===void 0)if(e!==this.DefaultInterpolation)this.setInterpolation(this.DefaultInterpolation);else throw new Error(n);return Pe("KeyframeTrack:",n),this}return this.createInterpolant=t,this}getInterpolation(){switch(this.createInterpolant){case this.InterpolantFactoryMethodDiscrete:return er;case this.InterpolantFactoryMethodLinear:return qa;case this.InterpolantFactoryMethodSmooth:return Fa;case this.InterpolantFactoryMethodBezier:return yl}}getValueSize(){return this.values.length/this.times.length}shift(e){if(e!==0){let t=this.times;for(let n=0,s=t.length;n!==s;++n)t[n]+=e}return this}scale(e){if(e!==1){let t=this.times;for(let n=0,s=t.length;n!==s;++n)t[n]*=e}return this}trim(e,t){let n=this.times,s=n.length,r=0,a=s-1;for(;r!==s&&n[r]<e;)++r;for(;a!==-1&&n[a]>t;)--a;if(++a,r!==0||a!==s){r>=a&&(a=Math.max(a,1),r=a-1);let o=this.getValueSize();this.times=n.slice(r,a),this.values=this.values.slice(r*o,a*o)}return this}validate(){let e=!0,t=this.getValueSize();t-Math.floor(t)!==0&&(Ie("KeyframeTrack: Invalid value size in track.",this),e=!1);let n=this.times,s=this.values,r=n.length;r===0&&(Ie("KeyframeTrack: Track is empty.",this),e=!1);let a=null;for(let o=0;o!==r;o++){let c=n[o];if(typeof c=="number"&&isNaN(c)){Ie("KeyframeTrack: Time is not a valid number.",this,o,c),e=!1;break}if(a!==null&&a>c){Ie("KeyframeTrack: Out of order keys.",this,o,c,a),e=!1;break}a=c}if(s!==void 0&&up(s))for(let o=0,c=s.length;o!==c;++o){let l=s[o];if(isNaN(l)){Ie("KeyframeTrack: Value is not a valid number.",this,o,l),e=!1;break}}return e}optimize(){let e=this.times.slice(),t=this.values.slice(),n=this.getValueSize(),s=this.getInterpolation()===Fa,r=e.length-1,a=1;for(let o=1;o<r;++o){let c=!1,l=e[o],h=e[o+1];if(l!==h&&(o!==1||l!==e[0]))if(s)c=!0;else{let d=o*n,u=d-n,f=d+n;for(let m=0;m!==n;++m){let _=t[d+m];if(_!==t[u+m]||_!==t[f+m]){c=!0;break}}}if(c){if(o!==a){e[a]=e[o];let d=o*n,u=a*n;for(let f=0;f!==n;++f)t[u+f]=t[d+f]}++a}}if(r>0){e[a]=e[r];for(let o=r*n,c=a*n,l=0;l!==n;++l)t[c+l]=t[o+l];++a}return a!==e.length?(this.times=e.slice(0,a),this.values=t.slice(0,a*n)):(this.times=e,this.values=t),this}clone(){let e=this.times.slice(),t=this.values.slice(),n=this.constructor,s=new n(this.name,e,t);return s.createInterpolant=this.createInterpolant,s}};dn.prototype.ValueTypeName="";dn.prototype.TimeBufferType=Float32Array;dn.prototype.ValueBufferType=Float32Array;dn.prototype.DefaultInterpolation=qa;var wi=class extends dn{constructor(e,t,n){super(e,t,n)}};wi.prototype.ValueTypeName="bool";wi.prototype.ValueBufferType=Array;wi.prototype.DefaultInterpolation=er;wi.prototype.InterpolantFactoryMethodLinear=void 0;wi.prototype.InterpolantFactoryMethodSmooth=void 0;var xo=class extends dn{constructor(e,t,n,s){super(e,t,n,s)}};xo.prototype.ValueTypeName="color";var _o=class extends dn{constructor(e,t,n,s){super(e,t,n,s)}};_o.prototype.ValueTypeName="number";var yo=class extends Ei{constructor(e,t,n,s){super(e,t,n,s)}interpolate_(e,t,n,s){let r=this.resultBuffer,a=this.sampleValues,o=this.valueSize,c=(n-t)/(s-t),l=e*o;for(let h=l+o;l!==h;l+=4)kn.slerpFlat(r,0,a,l-o,a,l,c);return r}},Ar=class extends dn{constructor(e,t,n,s){super(e,t,n,s)}InterpolantFactoryMethodLinear(e){return new yo(this.times,this.values,this.getValueSize(),e)}};Ar.prototype.ValueTypeName="quaternion";Ar.prototype.InterpolantFactoryMethodSmooth=void 0;var Ti=class extends dn{constructor(e,t,n){super(e,t,n)}};Ti.prototype.ValueTypeName="string";Ti.prototype.ValueBufferType=Array;Ti.prototype.DefaultInterpolation=er;Ti.prototype.InterpolantFactoryMethodLinear=void 0;Ti.prototype.InterpolantFactoryMethodSmooth=void 0;var vo=class extends dn{constructor(e,t,n,s){super(e,t,n,s)}};vo.prototype.ValueTypeName="vector";var bo=class{constructor(e,t,n){let s=this,r=!1,a=0,o=0,c,l=[];this.onStart=void 0,this.onLoad=e,this.onProgress=t,this.onError=n,this._abortController=null,this.itemStart=function(h){o++,r===!1&&s.onStart!==void 0&&s.onStart(h,a,o),r=!0},this.itemEnd=function(h){a++,s.onProgress!==void 0&&s.onProgress(h,a,o),a===o&&(r=!1,s.onLoad!==void 0&&s.onLoad())},this.itemError=function(h){s.onError!==void 0&&s.onError(h)},this.resolveURL=function(h){return h=h.normalize("NFC"),c?c(h):h},this.setURLModifier=function(h){return c=h,this},this.addHandler=function(h,d){return l.push(h,d),this},this.removeHandler=function(h){let d=l.indexOf(h);return d!==-1&&l.splice(d,2),this},this.getHandler=function(h){for(let d=0,u=l.length;d<u;d+=2){let f=l[d],m=l[d+1];if(f.global&&(f.lastIndex=0),f.test(h))return m}return null},this.abort=function(){return this.abortController.abort(),this._abortController=null,this}}get abortController(){return this._abortController||(this._abortController=new AbortController),this._abortController}},Rd=new bo,So=class{constructor(e){this.manager=e!==void 0?e:Rd,this.crossOrigin="anonymous",this.withCredentials=!1,this.path="",this.resourcePath="",this.requestHeader={},typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("observe",{detail:this}))}load(){}loadAsync(e,t){let n=this;return new Promise(function(s,r){n.load(e,s,t,r)})}parse(){}setCrossOrigin(e){return this.crossOrigin=e,this}setWithCredentials(e){return this.withCredentials=e,this}setPath(e){return this.path=e,this}setResourcePath(e){return this.resourcePath=e,this}setRequestHeader(e){return this.requestHeader=e,this}abort(){return this}};So.DEFAULT_MATERIAL_NAME="__DEFAULT";var Ia=new L,La=new kn,Fn=new L,Pr=class extends ln{constructor(){super(),this.isCamera=!0,this.type="Camera",this.matrixWorldInverse=new at,this.projectionMatrix=new at,this.projectionMatrixInverse=new at,this.coordinateSystem=En,this._reversedDepth=!1}get reversedDepth(){return this._reversedDepth}copy(e,t){return super.copy(e,t),this.matrixWorldInverse.copy(e.matrixWorldInverse),this.projectionMatrix.copy(e.projectionMatrix),this.projectionMatrixInverse.copy(e.projectionMatrixInverse),this.coordinateSystem=e.coordinateSystem,this}getWorldDirection(e){return super.getWorldDirection(e).negate()}updateMatrixWorld(e){super.updateMatrixWorld(e),this.matrixWorld.decompose(Ia,La,Fn),Fn.x===1&&Fn.y===1&&Fn.z===1?this.matrixWorldInverse.copy(this.matrixWorld).invert():this.matrixWorldInverse.compose(Ia,La,Fn.set(1,1,1)).invert()}updateWorldMatrix(e,t,n=!1){super.updateWorldMatrix(e,t,n),this.matrixWorld.decompose(Ia,La,Fn),Fn.x===1&&Fn.y===1&&Fn.z===1?this.matrixWorldInverse.copy(this.matrixWorld).invert():this.matrixWorldInverse.compose(Ia,La,Fn.set(1,1,1)).invert()}clone(){return new this.constructor().copy(this)}},xi=new L,Vu=new _e,ku=new _e,Wt=class extends Pr{constructor(e=50,t=1,n=.1,s=2e3){super(),this.isPerspectiveCamera=!0,this.type="PerspectiveCamera",this.fov=e,this.zoom=1,this.near=n,this.far=s,this.focus=10,this.aspect=t,this.view=null,this.filmGauge=35,this.filmOffset=0,this.updateProjectionMatrix()}copy(e,t){return super.copy(e,t),this.fov=e.fov,this.zoom=e.zoom,this.near=e.near,this.far=e.far,this.focus=e.focus,this.aspect=e.aspect,this.view=e.view===null?null:Object.assign({},e.view),this.filmGauge=e.filmGauge,this.filmOffset=e.filmOffset,this}setFocalLength(e){let t=.5*this.getFilmHeight()/e;this.fov=Es*2*Math.atan(t),this.updateProjectionMatrix()}getFocalLength(){let e=Math.tan(Zs*.5*this.fov);return .5*this.getFilmHeight()/e}getEffectiveFOV(){return Es*2*Math.atan(Math.tan(Zs*.5*this.fov)/this.zoom)}getFilmWidth(){return this.filmGauge*Math.min(this.aspect,1)}getFilmHeight(){return this.filmGauge/Math.max(this.aspect,1)}getViewBounds(e,t,n){xi.set(-1,-1,.5).applyMatrix4(this.projectionMatrixInverse),t.set(xi.x,xi.y).multiplyScalar(-e/xi.z),xi.set(1,1,.5).applyMatrix4(this.projectionMatrixInverse),n.set(xi.x,xi.y).multiplyScalar(-e/xi.z)}getViewSize(e,t){return this.getViewBounds(e,Vu,ku),t.subVectors(ku,Vu)}setViewOffset(e,t,n,s,r,a){this.aspect=e/t,this.view===null&&(this.view={enabled:!0,fullWidth:1,fullHeight:1,offsetX:0,offsetY:0,width:1,height:1}),this.view.enabled=!0,this.view.fullWidth=e,this.view.fullHeight=t,this.view.offsetX=n,this.view.offsetY=s,this.view.width=r,this.view.height=a,this.updateProjectionMatrix()}clearViewOffset(){this.view!==null&&(this.view.enabled=!1),this.updateProjectionMatrix()}updateProjectionMatrix(){let e=this.near,t=e*Math.tan(Zs*.5*this.fov)/this.zoom,n=2*t,s=this.aspect*n,r=-.5*s,a=this.view;if(this.view!==null&&this.view.enabled){let c=a.fullWidth,l=a.fullHeight;r+=a.offsetX*s/c,t-=a.offsetY*n/l,s*=a.width/c,n*=a.height/l}let o=this.filmOffset;o!==0&&(r+=e*o/this.getFilmWidth()),this.projectionMatrix.makePerspective(r,r+s,t,t-n,e,this.far,this.coordinateSystem,this.reversedDepth),this.projectionMatrixInverse.copy(this.projectionMatrix).invert()}toJSON(e){let t=super.toJSON(e);return t.object.fov=this.fov,t.object.zoom=this.zoom,t.object.near=this.near,t.object.far=this.far,t.object.focus=this.focus,t.object.aspect=this.aspect,this.view!==null&&(t.object.view=Object.assign({},this.view)),t.object.filmGauge=this.filmGauge,t.object.filmOffset=this.filmOffset,t}};var Ji=class extends Pr{constructor(e=-1,t=1,n=1,s=-1,r=.1,a=2e3){super(),this.isOrthographicCamera=!0,this.type="OrthographicCamera",this.zoom=1,this.view=null,this.left=e,this.right=t,this.top=n,this.bottom=s,this.near=r,this.far=a,this.updateProjectionMatrix()}copy(e,t){return super.copy(e,t),this.left=e.left,this.right=e.right,this.top=e.top,this.bottom=e.bottom,this.near=e.near,this.far=e.far,this.zoom=e.zoom,this.view=e.view===null?null:Object.assign({},e.view),this}setViewOffset(e,t,n,s,r,a){this.view===null&&(this.view={enabled:!0,fullWidth:1,fullHeight:1,offsetX:0,offsetY:0,width:1,height:1}),this.view.enabled=!0,this.view.fullWidth=e,this.view.fullHeight=t,this.view.offsetX=n,this.view.offsetY=s,this.view.width=r,this.view.height=a,this.updateProjectionMatrix()}clearViewOffset(){this.view!==null&&(this.view.enabled=!1),this.updateProjectionMatrix()}updateProjectionMatrix(){let e=(this.right-this.left)/(2*this.zoom),t=(this.top-this.bottom)/(2*this.zoom),n=(this.right+this.left)/2,s=(this.top+this.bottom)/2,r=n-e,a=n+e,o=s+t,c=s-t;if(this.view!==null&&this.view.enabled){let l=(this.right-this.left)/this.view.fullWidth/this.zoom,h=(this.top-this.bottom)/this.view.fullHeight/this.zoom;r+=l*this.view.offsetX,a=r+l*this.view.width,o-=h*this.view.offsetY,c=o-h*this.view.height}this.projectionMatrix.makeOrthographic(r,a,o,c,this.near,this.far,this.coordinateSystem,this.reversedDepth),this.projectionMatrixInverse.copy(this.projectionMatrix).invert()}toJSON(e){let t=super.toJSON(e);return t.object.zoom=this.zoom,t.object.left=this.left,t.object.right=this.right,t.object.top=this.top,t.object.bottom=this.bottom,t.object.near=this.near,t.object.far=this.far,this.view!==null&&(t.object.view=Object.assign({},this.view)),t}};var Cr=class extends Nt{constructor(){super(),this.isInstancedBufferGeometry=!0,this.type="InstancedBufferGeometry",this.instanceCount=1/0}copy(e){return super.copy(e),this.instanceCount=e.instanceCount,this}toJSON(){let e=super.toJSON();return e.instanceCount=this.instanceCount,e.isInstancedBufferGeometry=!0,e}};var _s=-90,ys=1,Mo=class extends ln{constructor(e,t,n){super(),this.type="CubeCamera",this.renderTarget=n,this.coordinateSystem=null,this.activeMipmapLevel=0;let s=new Wt(_s,ys,e,t);s.layers=this.layers,this.add(s);let r=new Wt(_s,ys,e,t);r.layers=this.layers,this.add(r);let a=new Wt(_s,ys,e,t);a.layers=this.layers,this.add(a);let o=new Wt(_s,ys,e,t);o.layers=this.layers,this.add(o);let c=new Wt(_s,ys,e,t);c.layers=this.layers,this.add(c);let l=new Wt(_s,ys,e,t);l.layers=this.layers,this.add(l)}updateCoordinateSystem(){let e=this.coordinateSystem,t=this.children.concat(),[n,s,r,a,o,c]=t;for(let l of t)this.remove(l);if(e===En)n.up.set(0,1,0),n.lookAt(1,0,0),s.up.set(0,1,0),s.lookAt(-1,0,0),r.up.set(0,0,-1),r.lookAt(0,1,0),a.up.set(0,0,1),a.lookAt(0,-1,0),o.up.set(0,1,0),o.lookAt(0,0,1),c.up.set(0,1,0),c.lookAt(0,0,-1);else if(e===ir)n.up.set(0,-1,0),n.lookAt(-1,0,0),s.up.set(0,-1,0),s.lookAt(1,0,0),r.up.set(0,0,1),r.lookAt(0,1,0),a.up.set(0,0,-1),a.lookAt(0,-1,0),o.up.set(0,-1,0),o.lookAt(0,0,1),c.up.set(0,-1,0),c.lookAt(0,0,-1);else throw new Error("THREE.CubeCamera.updateCoordinateSystem(): Invalid coordinate system: "+e);for(let l of t)this.add(l),l.updateMatrixWorld()}update(e,t){this.parent===null&&this.updateMatrixWorld();let{renderTarget:n,activeMipmapLevel:s}=this;this.coordinateSystem!==e.coordinateSystem&&(this.coordinateSystem=e.coordinateSystem,this.updateCoordinateSystem());let[r,a,o,c,l,h]=this.children,d=e.getRenderTarget(),u=e.getActiveCubeFace(),f=e.getActiveMipmapLevel(),m=e.xr.enabled;e.xr.enabled=!1;let _=n.texture.generateMipmaps;n.texture.generateMipmaps=!1;let g=!1;e.isWebGLRenderer===!0?g=e.state.buffers.depth.getReversed():g=e.reversedDepthBuffer,e.setRenderTarget(n,0,s),g&&e.autoClear===!1&&e.clearDepth(),e.render(t,r),e.setRenderTarget(n,1,s),g&&e.autoClear===!1&&e.clearDepth(),e.render(t,a),e.setRenderTarget(n,2,s),g&&e.autoClear===!1&&e.clearDepth(),e.render(t,o),e.setRenderTarget(n,3,s),g&&e.autoClear===!1&&e.clearDepth(),e.render(t,c),e.setRenderTarget(n,4,s),g&&e.autoClear===!1&&e.clearDepth(),e.render(t,l),n.texture.generateMipmaps=_,e.setRenderTarget(n,5,s),g&&e.autoClear===!1&&e.clearDepth(),e.render(t,h),e.setRenderTarget(d,u,f),e.xr.enabled=m,n.texture.needsPMREMUpdate=!0}},Eo=class extends Wt{constructor(e=[]){super(),this.isArrayCamera=!0,this.isMultiViewCamera=!1,this.cameras=e}};var th="\\[\\]\\.:\\/",vm=new RegExp("["+th+"]","g"),nh="[^"+th+"]",bm="[^"+th.replace("\\.","")+"]",Sm=/((?:WC+[\/:])*)/.source.replace("WC",nh),Mm=/(WCOD+)?/.source.replace("WCOD",bm),Em=/(?:\.(WC+)(?:\[(.+)\])?)?/.source.replace("WC",nh),wm=/\.(WC+)(?:\[(.+)\])?/.source.replace("WC",nh),Tm=new RegExp("^"+Sm+Mm+Em+wm+"$"),Am=["material","materials","bones","map"],Al=class{constructor(e,t,n){let s=n||ht.parseTrackName(t);this._targetGroup=e,this._bindings=e.subscribe_(t,s)}getValue(e,t){this.bind();let n=this._targetGroup.nCachedObjects_,s=this._bindings[n];s!==void 0&&s.getValue(e,t)}setValue(e,t){let n=this._bindings;for(let s=this._targetGroup.nCachedObjects_,r=n.length;s!==r;++s)n[s].setValue(e,t)}bind(){let e=this._bindings;for(let t=this._targetGroup.nCachedObjects_,n=e.length;t!==n;++t)e[t].bind()}unbind(){let e=this._bindings;for(let t=this._targetGroup.nCachedObjects_,n=e.length;t!==n;++t)e[t].unbind()}},ht=class i{constructor(e,t,n){this.path=t,this.parsedPath=n||i.parseTrackName(t),this.node=i.findNode(e,this.parsedPath.nodeName),this.rootNode=e,this.getValue=this._getValue_unbound,this.setValue=this._setValue_unbound}static create(e,t,n){return e&&e.isAnimationObjectGroup?new i.Composite(e,t,n):new i(e,t,n)}static sanitizeNodeName(e){return e.replace(/\s/g,"_").replace(vm,"")}static parseTrackName(e){let t=Tm.exec(e);if(t===null)throw new Error("THREE.PropertyBinding: Cannot parse trackName: "+e);let n={nodeName:t[2],objectName:t[3],objectIndex:t[4],propertyName:t[5],propertyIndex:t[6]},s=n.nodeName&&n.nodeName.lastIndexOf(".");if(s!==void 0&&s!==-1){let r=n.nodeName.substring(s+1);Am.indexOf(r)!==-1&&(n.nodeName=n.nodeName.substring(0,s),n.objectName=r)}if(n.propertyName===null||n.propertyName.length===0)throw new Error("THREE.PropertyBinding: can not parse propertyName from trackName: "+e);return n}static findNode(e,t){if(t===void 0||t===""||t==="."||t===-1||t===e.name||t===e.uuid)return e;if(e.skeleton){let n=e.skeleton.getBoneByName(t);if(n!==void 0)return n}if(e.children){let n=function(r){for(let a=0;a<r.length;a++){let o=r[a];if(o.name===t||o.uuid===t)return o;let c=n(o.children);if(c)return c}return null},s=n(e.children);if(s)return s}return null}_getValue_unavailable(){}_setValue_unavailable(){}_getValue_direct(e,t){e[t]=this.targetObject[this.propertyName]}_getValue_array(e,t){let n=this.resolvedProperty;for(let s=0,r=n.length;s!==r;++s)e[t++]=n[s]}_getValue_arrayElement(e,t){e[t]=this.resolvedProperty[this.propertyIndex]}_getValue_toArray(e,t){this.resolvedProperty.toArray(e,t)}_setValue_direct(e,t){this.targetObject[this.propertyName]=e[t]}_setValue_direct_setNeedsUpdate(e,t){this.targetObject[this.propertyName]=e[t],this.targetObject.needsUpdate=!0}_setValue_direct_setMatrixWorldNeedsUpdate(e,t){this.targetObject[this.propertyName]=e[t],this.targetObject.matrixWorldNeedsUpdate=!0}_setValue_array(e,t){let n=this.resolvedProperty;for(let s=0,r=n.length;s!==r;++s)n[s]=e[t++]}_setValue_array_setNeedsUpdate(e,t){let n=this.resolvedProperty;for(let s=0,r=n.length;s!==r;++s)n[s]=e[t++];this.targetObject.needsUpdate=!0}_setValue_array_setMatrixWorldNeedsUpdate(e,t){let n=this.resolvedProperty;for(let s=0,r=n.length;s!==r;++s)n[s]=e[t++];this.targetObject.matrixWorldNeedsUpdate=!0}_setValue_arrayElement(e,t){this.resolvedProperty[this.propertyIndex]=e[t]}_setValue_arrayElement_setNeedsUpdate(e,t){this.resolvedProperty[this.propertyIndex]=e[t],this.targetObject.needsUpdate=!0}_setValue_arrayElement_setMatrixWorldNeedsUpdate(e,t){this.resolvedProperty[this.propertyIndex]=e[t],this.targetObject.matrixWorldNeedsUpdate=!0}_setValue_fromArray(e,t){this.resolvedProperty.fromArray(e,t)}_setValue_fromArray_setNeedsUpdate(e,t){this.resolvedProperty.fromArray(e,t),this.targetObject.needsUpdate=!0}_setValue_fromArray_setMatrixWorldNeedsUpdate(e,t){this.resolvedProperty.fromArray(e,t),this.targetObject.matrixWorldNeedsUpdate=!0}_getValue_unbound(e,t){this.bind(),this.getValue(e,t)}_setValue_unbound(e,t){this.bind(),this.setValue(e,t)}bind(){let e=this.node,t=this.parsedPath,n=t.objectName,s=t.propertyName,r=t.propertyIndex;if(e||(e=i.findNode(this.rootNode,t.nodeName),this.node=e),this.getValue=this._getValue_unavailable,this.setValue=this._setValue_unavailable,!e){Pe("PropertyBinding: No target node found for track: "+this.path+".");return}if(n){let l=t.objectIndex;switch(n){case"materials":if(!e.material){Ie("PropertyBinding: Can not bind to material as node does not have a material.",this);return}if(!e.material.materials){Ie("PropertyBinding: Can not bind to material.materials as node.material does not have a materials array.",this);return}e=e.material.materials;break;case"bones":if(!e.skeleton){Ie("PropertyBinding: Can not bind to bones as node does not have a skeleton.",this);return}e=e.skeleton.bones;for(let h=0;h<e.length;h++)if(e[h].name===l){l=h;break}break;case"map":if("map"in e){e=e.map;break}if(!e.material){Ie("PropertyBinding: Can not bind to material as node does not have a material.",this);return}if(!e.material.map){Ie("PropertyBinding: Can not bind to material.map as node.material does not have a map.",this);return}e=e.material.map;break;default:if(e[n]===void 0){Ie("PropertyBinding: Can not bind to objectName of node undefined.",this);return}e=e[n]}if(l!==void 0){if(e[l]===void 0){Ie("PropertyBinding: Trying to bind to objectIndex of objectName, but is undefined.",this,e);return}e=e[l]}}let a=e[s];if(a===void 0){let l=t.nodeName;Ie("PropertyBinding: Trying to update property for track: "+l+"."+s+" but it wasn't found.",e);return}let o=this.Versioning.None;this.targetObject=e,e.isMaterial===!0?o=this.Versioning.NeedsUpdate:e.isObject3D===!0&&(o=this.Versioning.MatrixWorldNeedsUpdate);let c=this.BindingType.Direct;if(r!==void 0){if(s==="morphTargetInfluences"){if(!e.geometry){Ie("PropertyBinding: Can not bind to morphTargetInfluences because node does not have a geometry.",this);return}if(!e.geometry.morphAttributes){Ie("PropertyBinding: Can not bind to morphTargetInfluences because node does not have a geometry.morphAttributes.",this);return}e.morphTargetDictionary[r]!==void 0&&(r=e.morphTargetDictionary[r])}c=this.BindingType.ArrayElement,this.resolvedProperty=a,this.propertyIndex=r}else a.fromArray!==void 0&&a.toArray!==void 0?(c=this.BindingType.HasFromToArray,this.resolvedProperty=a):Array.isArray(a)?(c=this.BindingType.EntireArray,this.resolvedProperty=a):this.propertyName=s;this.getValue=this.GetterByBindingType[c],this.setValue=this.SetterByBindingTypeAndVersioning[c][o]}unbind(){this.node=null,this.getValue=this._getValue_unbound,this.setValue=this._setValue_unbound}};ht.Composite=Al;ht.prototype.BindingType={Direct:0,EntireArray:1,ArrayElement:2,HasFromToArray:3};ht.prototype.Versioning={None:0,NeedsUpdate:1,MatrixWorldNeedsUpdate:2};ht.prototype.GetterByBindingType=[ht.prototype._getValue_direct,ht.prototype._getValue_array,ht.prototype._getValue_arrayElement,ht.prototype._getValue_toArray];ht.prototype.SetterByBindingTypeAndVersioning=[[ht.prototype._setValue_direct,ht.prototype._setValue_direct_setNeedsUpdate,ht.prototype._setValue_direct_setMatrixWorldNeedsUpdate],[ht.prototype._setValue_array,ht.prototype._setValue_array_setNeedsUpdate,ht.prototype._setValue_array_setMatrixWorldNeedsUpdate],[ht.prototype._setValue_arrayElement,ht.prototype._setValue_arrayElement_setNeedsUpdate,ht.prototype._setValue_arrayElement_setMatrixWorldNeedsUpdate],[ht.prototype._setValue_fromArray,ht.prototype._setValue_fromArray_setNeedsUpdate,ht.prototype._setValue_fromArray_setMatrixWorldNeedsUpdate]];var Zv=new Float32Array(1);var Ai=class extends Ja{constructor(e,t,n=1){super(e,t),this.isInstancedInterleavedBuffer=!0,this.meshPerAttribute=n}copy(e){return super.copy(e),this.meshPerAttribute=e.meshPerAttribute,this}clone(e){let t=super.clone(e);return t.meshPerAttribute=this.meshPerAttribute,t}toJSON(e){let t=super.toJSON(e);return t.isInstancedInterleavedBuffer=!0,t.meshPerAttribute=this.meshPerAttribute,t}};var ch=class ch{constructor(e,t,n,s){this.elements=[1,0,0,1],e!==void 0&&this.set(e,t,n,s)}identity(){return this.set(1,0,0,1),this}fromArray(e,t=0){for(let n=0;n<4;n++)this.elements[n]=e[n+t];return this}set(e,t,n,s){let r=this.elements;return r[0]=e,r[2]=t,r[1]=n,r[3]=s,this}};ch.prototype.isMatrix2=!0;var Pl=ch;var Hu=new L,Da=new L,vs=new L,bs=new L,_l=new L,Pm=new L,Cm=new L,Rr=class{constructor(e=new L,t=new L){this.start=e,this.end=t}set(e,t){return this.start.copy(e),this.end.copy(t),this}copy(e){return this.start.copy(e.start),this.end.copy(e.end),this}getCenter(e){return e.addVectors(this.start,this.end).multiplyScalar(.5)}delta(e){return e.subVectors(this.end,this.start)}distanceSq(){return this.start.distanceToSquared(this.end)}distance(){return this.start.distanceTo(this.end)}at(e,t){return this.delta(t).multiplyScalar(e).add(this.start)}closestPointToPointParameter(e,t){Hu.subVectors(e,this.start),Da.subVectors(this.end,this.start);let n=Da.dot(Da);if(n===0)return 0;let r=Da.dot(Hu)/n;return t&&(r=Ue(r,0,1)),r}closestPointToPoint(e,t,n){let s=this.closestPointToPointParameter(e,t);return this.delta(n).multiplyScalar(s).add(this.start)}distanceSqToLine3(e,t=Pm,n=Cm){let s=10000000000000001e-32,r,a,o=this.start,c=e.start,l=this.end,h=e.end;vs.subVectors(l,o),bs.subVectors(h,c),_l.subVectors(o,c);let d=vs.dot(vs),u=bs.dot(bs),f=bs.dot(_l);if(d<=s&&u<=s)return t.copy(o),n.copy(c),t.sub(n),t.dot(t);if(d<=s)r=0,a=f/u,a=Ue(a,0,1);else{let m=vs.dot(_l);if(u<=s)a=0,r=Ue(-m/d,0,1);else{let _=vs.dot(bs),g=d*u-_*_;g!==0?r=Ue((_*f-m*u)/g,0,1):r=0,a=(_*r+f)/u,a<0?(a=0,r=Ue(-m/d,0,1)):a>1&&(a=1,r=Ue((_-m)/d,0,1))}}return t.copy(o).addScaledVector(vs,r),n.copy(c).addScaledVector(bs,a),t.distanceToSquared(n)}applyMatrix4(e){return this.start.applyMatrix4(e),this.end.applyMatrix4(e),this}equals(e){return e.start.equals(this.start)&&e.end.equals(this.end)}clone(){return new this.constructor().copy(this)}};function ih(i,e,t,n){let s=Rm(n);switch(t){case ql:return i*e;case $l:return i*e/s.components*s.byteLength;case Do:return i*e/s.components*s.byteLength;case Ii:return i*e*2/s.components*s.byteLength;case Fo:return i*e*2/s.components*s.byteLength;case Yl:return i*e*3/s.components*s.byteLength;case yn:return i*e*4/s.components*s.byteLength;case Uo:return i*e*4/s.components*s.byteLength;case Fr:case Ur:return Math.floor((i+3)/4)*Math.floor((e+3)/4)*8;case Nr:case Or:return Math.floor((i+3)/4)*Math.floor((e+3)/4)*16;case Oo:case zo:return Math.max(i,16)*Math.max(e,8)/4;case No:case Bo:return Math.max(i,8)*Math.max(e,8)/2;case Vo:case ko:case Go:case Wo:return Math.floor((i+3)/4)*Math.floor((e+3)/4)*8;case Ho:case Br:case Xo:return Math.floor((i+3)/4)*Math.floor((e+3)/4)*16;case qo:return Math.floor((i+3)/4)*Math.floor((e+3)/4)*16;case Yo:return Math.floor((i+4)/5)*Math.floor((e+3)/4)*16;case $o:return Math.floor((i+4)/5)*Math.floor((e+4)/5)*16;case Ko:return Math.floor((i+5)/6)*Math.floor((e+4)/5)*16;case Zo:return Math.floor((i+5)/6)*Math.floor((e+5)/6)*16;case Jo:return Math.floor((i+7)/8)*Math.floor((e+4)/5)*16;case jo:return Math.floor((i+7)/8)*Math.floor((e+5)/6)*16;case Qo:return Math.floor((i+7)/8)*Math.floor((e+7)/8)*16;case ec:return Math.floor((i+9)/10)*Math.floor((e+4)/5)*16;case tc:return Math.floor((i+9)/10)*Math.floor((e+5)/6)*16;case nc:return Math.floor((i+9)/10)*Math.floor((e+7)/8)*16;case ic:return Math.floor((i+9)/10)*Math.floor((e+9)/10)*16;case sc:return Math.floor((i+11)/12)*Math.floor((e+9)/10)*16;case rc:return Math.floor((i+11)/12)*Math.floor((e+11)/12)*16;case ac:case oc:case cc:return Math.ceil(i/4)*Math.ceil(e/4)*16;case lc:case hc:return Math.ceil(i/4)*Math.ceil(e/4)*8;case zr:case uc:return Math.ceil(i/4)*Math.ceil(e/4)*16}throw new Error(`Unable to determine texture byte length for ${t} format.`)}function Rm(i){switch(i){case fn:case Hl:return{byteLength:1,components:1};case Ds:case Gl:case Gn:return{byteLength:2,components:1};case Io:case Lo:return{byteLength:2,components:4};case Pn:case Ro:case Cn:return{byteLength:4,components:1};case Wl:case Xl:return{byteLength:4,components:3}}throw new Error(`THREE.TextureUtils: Unknown texture type ${i}.`)}typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("register",{detail:{revision:To}}));typeof window<"u"&&(window.__THREE__?Pe("WARNING: Multiple instances of Three.js being imported."):window.__THREE__=To);function Qd(){let i=null,e=!1,t=null,n=null;function s(r,a){t(r,a),n=i.requestAnimationFrame(s)}return{start:function(){e!==!0&&t!==null&&i!==null&&(n=i.requestAnimationFrame(s),e=!0)},stop:function(){i!==null&&i.cancelAnimationFrame(n),e=!1},setAnimationLoop:function(r){t=r},setContext:function(r){i=r}}}function Im(i){let e=new WeakMap;function t(o,c){let l=o.array,h=o.usage,d=l.byteLength,u=i.createBuffer();i.bindBuffer(c,u),i.bufferData(c,l,h),o.onUploadCallback();let f;if(l instanceof Float32Array)f=i.FLOAT;else if(typeof Float16Array<"u"&&l instanceof Float16Array)f=i.HALF_FLOAT;else if(l instanceof Uint16Array)o.isFloat16BufferAttribute?f=i.HALF_FLOAT:f=i.UNSIGNED_SHORT;else if(l instanceof Int16Array)f=i.SHORT;else if(l instanceof Uint32Array)f=i.UNSIGNED_INT;else if(l instanceof Int32Array)f=i.INT;else if(l instanceof Int8Array)f=i.BYTE;else if(l instanceof Uint8Array)f=i.UNSIGNED_BYTE;else if(l instanceof Uint8ClampedArray)f=i.UNSIGNED_BYTE;else throw new Error("THREE.WebGLAttributes: Unsupported buffer data format: "+l);return{buffer:u,type:f,bytesPerElement:l.BYTES_PER_ELEMENT,version:o.version,size:d}}function n(o,c,l){let h=c.array,d=c.updateRanges;if(i.bindBuffer(l,o),d.length===0)i.bufferSubData(l,0,h);else{d.sort((f,m)=>f.start-m.start);let u=0;for(let f=1;f<d.length;f++){let m=d[u],_=d[f];_.start<=m.start+m.count+1?m.count=Math.max(m.count,_.start+_.count-m.start):(++u,d[u]=_)}d.length=u+1;for(let f=0,m=d.length;f<m;f++){let _=d[f];i.bufferSubData(l,_.start*h.BYTES_PER_ELEMENT,h,_.start,_.count)}c.clearUpdateRanges()}c.onUploadCallback()}function s(o){return o.isInterleavedBufferAttribute&&(o=o.data),e.get(o)}function r(o){o.isInterleavedBufferAttribute&&(o=o.data);let c=e.get(o);c&&(i.deleteBuffer(c.buffer),e.delete(o))}function a(o,c){if(o.isInterleavedBufferAttribute&&(o=o.data),o.isGLBufferAttribute){let h=e.get(o);(!h||h.version<o.version)&&e.set(o,{buffer:o.buffer,type:o.type,bytesPerElement:o.elementSize,version:o.version});return}let l=e.get(o);if(l===void 0)e.set(o,t(o,c));else if(l.version<o.version){if(l.size!==o.array.byteLength)throw new Error("THREE.WebGLAttributes: The size of the buffer attribute's array buffer does not match the original size. Resizing buffer attributes is not supported.");n(l.buffer,o,c),l.version=o.version}}return{get:s,remove:r,update:a}}var Lm=`#ifdef USE_ALPHAHASH
	if ( diffuseColor.a < getAlphaHashThreshold( vPosition ) ) discard;
#endif`,Dm=`#ifdef USE_ALPHAHASH
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
#endif`,Fm=`#ifdef USE_ALPHAMAP
	diffuseColor.a *= texture2D( alphaMap, vAlphaMapUv ).g;
#endif`,Um=`#ifdef USE_ALPHAMAP
	uniform sampler2D alphaMap;
#endif`,Nm=`#ifdef USE_ALPHATEST
	#ifdef ALPHA_TO_COVERAGE
	diffuseColor.a = smoothstep( alphaTest, alphaTest + fwidth( diffuseColor.a ), diffuseColor.a );
	if ( diffuseColor.a == 0.0 ) discard;
	#else
	if ( diffuseColor.a < alphaTest ) discard;
	#endif
#endif`,Om=`#ifdef USE_ALPHATEST
	uniform float alphaTest;
#endif`,Bm=`#ifdef USE_AOMAP
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
#endif`,zm=`#ifdef USE_AOMAP
	uniform sampler2D aoMap;
	uniform float aoMapIntensity;
#endif`,Vm=`#ifdef USE_BATCHING
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
#endif`,km=`#ifdef USE_BATCHING
	mat4 batchingMatrix = getBatchingMatrix( getIndirectIndex( gl_DrawID ) );
#endif`,Hm=`vec3 transformed = vec3( position );
#ifdef USE_ALPHAHASH
	vPosition = vec3( position );
#endif`,Gm=`vec3 objectNormal = vec3( normal );
#ifdef USE_TANGENT
	vec3 objectTangent = vec3( tangent.xyz );
#endif`,Wm=`float G_BlinnPhong_Implicit( ) {
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
} // validated`,Xm=`#ifdef USE_IRIDESCENCE
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
#endif`,qm=`#ifdef USE_BUMPMAP
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
#endif`,Ym=`#if NUM_CLIPPING_PLANES > 0
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
#endif`,$m=`#if NUM_CLIPPING_PLANES > 0
	varying vec3 vClipPosition;
	uniform vec4 clippingPlanes[ NUM_CLIPPING_PLANES ];
#endif`,Km=`#if NUM_CLIPPING_PLANES > 0
	varying vec3 vClipPosition;
#endif`,Zm=`#if NUM_CLIPPING_PLANES > 0
	vClipPosition = - mvPosition.xyz;
#endif`,Jm=`#if defined( USE_COLOR ) || defined( USE_COLOR_ALPHA )
	diffuseColor *= vColor;
#endif`,jm=`#if defined( USE_COLOR ) || defined( USE_COLOR_ALPHA )
	varying vec4 vColor;
#endif`,Qm=`#if defined( USE_COLOR ) || defined( USE_COLOR_ALPHA ) || defined( USE_INSTANCING_COLOR ) || defined( USE_BATCHING_COLOR )
	varying vec4 vColor;
#endif`,eg=`#if defined( USE_COLOR ) || defined( USE_COLOR_ALPHA ) || defined( USE_INSTANCING_COLOR ) || defined( USE_BATCHING_COLOR )
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
#endif`,tg=`#define PI 3.141592653589793
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
} // validated`,ng=`#ifdef ENVMAP_TYPE_CUBE_UV
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
#endif`,ig=`vec3 transformedNormal = objectNormal;
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
#endif`,sg=`#ifdef USE_DISPLACEMENTMAP
	uniform sampler2D displacementMap;
	uniform float displacementScale;
	uniform float displacementBias;
#endif`,rg=`#ifdef USE_DISPLACEMENTMAP
	transformed += normalize( objectNormal ) * ( texture2D( displacementMap, vDisplacementMapUv ).x * displacementScale + displacementBias );
#endif`,ag=`#ifdef USE_EMISSIVEMAP
	vec4 emissiveColor = texture2D( emissiveMap, vEmissiveMapUv );
	#ifdef DECODE_VIDEO_TEXTURE_EMISSIVE
		emissiveColor = sRGBTransferEOTF( emissiveColor );
	#endif
	totalEmissiveRadiance *= emissiveColor.rgb;
#endif`,og=`#ifdef USE_EMISSIVEMAP
	uniform sampler2D emissiveMap;
#endif`,cg="gl_FragColor = linearToOutputTexel( gl_FragColor );",lg=`vec4 LinearTransferOETF( in vec4 value ) {
	return value;
}
vec4 sRGBTransferEOTF( in vec4 value ) {
	return vec4( mix( pow( value.rgb * 0.9478672986 + vec3( 0.0521327014 ), vec3( 2.4 ) ), value.rgb * 0.0773993808, vec3( lessThanEqual( value.rgb, vec3( 0.04045 ) ) ) ), value.a );
}
vec4 sRGBTransferOETF( in vec4 value ) {
	return vec4( mix( pow( value.rgb, vec3( 0.41666 ) ) * 1.055 - vec3( 0.055 ), value.rgb * 12.92, vec3( lessThanEqual( value.rgb, vec3( 0.0031308 ) ) ) ), value.a );
}`,hg=`#ifdef USE_ENVMAP
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
#endif`,ug=`#ifdef USE_ENVMAP
	uniform float envMapIntensity;
	uniform mat3 envMapRotation;
	#ifdef ENVMAP_TYPE_CUBE
		uniform samplerCube envMap;
	#else
		uniform sampler2D envMap;
	#endif
#endif`,dg=`#ifdef USE_ENVMAP
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
#endif`,fg=`#ifdef USE_ENVMAP
	#if defined( USE_BUMPMAP ) || defined( USE_NORMALMAP ) || defined( PHONG ) || defined( LAMBERT )
		#define ENV_WORLDPOS
	#endif
	#ifdef ENV_WORLDPOS
		
		varying vec3 vWorldPosition;
	#else
		varying vec3 vReflect;
		uniform float refractionRatio;
	#endif
#endif`,pg=`#ifdef USE_ENVMAP
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
#endif`,mg=`#ifdef USE_FOG
	vFogDepth = - mvPosition.z;
#endif`,gg=`#ifdef USE_FOG
	varying float vFogDepth;
#endif`,xg=`#ifdef USE_FOG
	#ifdef FOG_EXP2
		float fogFactor = 1.0 - exp( - fogDensity * fogDensity * vFogDepth * vFogDepth );
	#else
		float fogFactor = smoothstep( fogNear, fogFar, vFogDepth );
	#endif
	gl_FragColor.rgb = mix( gl_FragColor.rgb, fogColor, fogFactor );
#endif`,_g=`#ifdef USE_FOG
	uniform vec3 fogColor;
	varying float vFogDepth;
	#ifdef FOG_EXP2
		uniform float fogDensity;
	#else
		uniform float fogNear;
		uniform float fogFar;
	#endif
#endif`,yg=`#ifdef USE_GRADIENTMAP
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
}`,vg=`#ifdef USE_LIGHTMAP
	uniform sampler2D lightMap;
	uniform float lightMapIntensity;
#endif`,bg=`LambertMaterial material;
material.diffuseColor = diffuseColor.rgb;
material.specularStrength = specularStrength;`,Sg=`varying vec3 vViewPosition;
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
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Lambert`,Mg=`uniform bool receiveShadow;
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
#include <lightprobes_pars_fragment>`,Eg=`#ifdef USE_ENVMAP
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
#endif`,wg=`ToonMaterial material;
material.diffuseColor = diffuseColor.rgb;`,Tg=`varying vec3 vViewPosition;
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
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Toon`,Ag=`BlinnPhongMaterial material;
material.diffuseColor = diffuseColor.rgb;
material.specularColor = specular;
material.specularShininess = shininess;
material.specularStrength = specularStrength;`,Pg=`varying vec3 vViewPosition;
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
#define RE_IndirectDiffuse		RE_IndirectDiffuse_BlinnPhong`,Cg=`PhysicalMaterial material;
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
#endif`,Rg=`uniform sampler2D dfgLUT;
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
}`,Ig=`
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
#endif`,Lg=`#if defined( RE_IndirectDiffuse )
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
#endif`,Dg=`#if defined( RE_IndirectDiffuse )
	#if defined( LAMBERT ) || defined( PHONG )
		irradiance += iblIrradiance;
	#endif
	RE_IndirectDiffuse( irradiance, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
#endif
#if defined( RE_IndirectSpecular )
	RE_IndirectSpecular( radiance, iblIrradiance, clearcoatRadiance, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
#endif`,Fg=`#ifdef USE_LIGHT_PROBES_GRID
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
#endif`,Ug=`#if defined( USE_LOGARITHMIC_DEPTH_BUFFER )
	gl_FragDepth = vIsPerspective == 0.0 ? gl_FragCoord.z : log2( vFragDepth ) * logDepthBufFC * 0.5;
#endif`,Ng=`#if defined( USE_LOGARITHMIC_DEPTH_BUFFER )
	uniform float logDepthBufFC;
	varying float vFragDepth;
	varying float vIsPerspective;
#endif`,Og=`#ifdef USE_LOGARITHMIC_DEPTH_BUFFER
	varying float vFragDepth;
	varying float vIsPerspective;
#endif`,Bg=`#ifdef USE_LOGARITHMIC_DEPTH_BUFFER
	vFragDepth = 1.0 + gl_Position.w;
	vIsPerspective = float( isPerspectiveMatrix( projectionMatrix ) );
#endif`,zg=`#ifdef USE_MAP
	vec4 sampledDiffuseColor = texture2D( map, vMapUv );
	#ifdef DECODE_VIDEO_TEXTURE
		sampledDiffuseColor = sRGBTransferEOTF( sampledDiffuseColor );
	#endif
	diffuseColor *= sampledDiffuseColor;
#endif`,Vg=`#ifdef USE_MAP
	uniform sampler2D map;
#endif`,kg=`#if defined( USE_MAP ) || defined( USE_ALPHAMAP )
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
#endif`,Hg=`#if defined( USE_POINTS_UV )
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
#endif`,Gg=`float metalnessFactor = metalness;
#ifdef USE_METALNESSMAP
	vec4 texelMetalness = texture2D( metalnessMap, vMetalnessMapUv );
	metalnessFactor *= texelMetalness.b;
#endif`,Wg=`#ifdef USE_METALNESSMAP
	uniform sampler2D metalnessMap;
#endif`,Xg=`#ifdef USE_INSTANCING_MORPH
	float morphTargetInfluences[ MORPHTARGETS_COUNT ];
	float morphTargetBaseInfluence = texelFetch( morphTexture, ivec2( 0, gl_InstanceID ), 0 ).r;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		morphTargetInfluences[i] =  texelFetch( morphTexture, ivec2( i + 1, gl_InstanceID ), 0 ).r;
	}
#endif`,qg=`#if defined( USE_MORPHCOLORS )
	vColor *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		#if defined( USE_COLOR_ALPHA )
			if ( morphTargetInfluences[ i ] != 0.0 ) vColor += getMorph( gl_VertexID, i, 2 ) * morphTargetInfluences[ i ];
		#elif defined( USE_COLOR )
			if ( morphTargetInfluences[ i ] != 0.0 ) vColor += getMorph( gl_VertexID, i, 2 ).rgb * morphTargetInfluences[ i ];
		#endif
	}
#endif`,Yg=`#ifdef USE_MORPHNORMALS
	objectNormal *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		if ( morphTargetInfluences[ i ] != 0.0 ) objectNormal += getMorph( gl_VertexID, i, 1 ).xyz * morphTargetInfluences[ i ];
	}
#endif`,$g=`#ifdef USE_MORPHTARGETS
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
#endif`,Kg=`#ifdef USE_MORPHTARGETS
	transformed *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		if ( morphTargetInfluences[ i ] != 0.0 ) transformed += getMorph( gl_VertexID, i, 0 ).xyz * morphTargetInfluences[ i ];
	}
#endif`,Zg=`float faceDirection = gl_FrontFacing ? 1.0 : - 1.0;
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
vec3 nonPerturbedNormal = normal;`,Jg=`#ifdef USE_NORMALMAP_OBJECTSPACE
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
#endif`,jg=`#ifndef FLAT_SHADED
	varying vec3 vNormal;
	#ifdef USE_TANGENT
		varying vec3 vTangent;
		varying vec3 vBitangent;
	#endif
#endif`,Qg=`#ifndef FLAT_SHADED
	varying vec3 vNormal;
	#ifdef USE_TANGENT
		varying vec3 vTangent;
		varying vec3 vBitangent;
	#endif
#endif`,ex=`#ifndef FLAT_SHADED
	vNormal = normalize( transformedNormal );
	#ifdef USE_TANGENT
		vTangent = normalize( transformedTangent );
		vBitangent = normalize( cross( vNormal, vTangent ) * tangent.w );
		#ifdef FLIP_SIDED
			vBitangent = - vBitangent;
		#endif
	#endif
#endif`,tx=`#ifdef USE_NORMALMAP
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
#endif`,nx=`#ifdef USE_CLEARCOAT
	vec3 clearcoatNormal = nonPerturbedNormal;
#endif`,ix=`#ifdef USE_CLEARCOAT_NORMALMAP
	vec3 clearcoatMapN = texture2D( clearcoatNormalMap, vClearcoatNormalMapUv ).xyz * 2.0 - 1.0;
	clearcoatMapN.xy *= clearcoatNormalScale;
	clearcoatNormal = normalize( tbn2 * clearcoatMapN );
#endif`,sx=`#ifdef USE_CLEARCOATMAP
	uniform sampler2D clearcoatMap;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	uniform sampler2D clearcoatNormalMap;
	uniform vec2 clearcoatNormalScale;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	uniform sampler2D clearcoatRoughnessMap;
#endif`,rx=`#ifdef USE_IRIDESCENCEMAP
	uniform sampler2D iridescenceMap;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	uniform sampler2D iridescenceThicknessMap;
#endif`,ax=`#ifdef OPAQUE
diffuseColor.a = 1.0;
#endif
#ifdef USE_TRANSMISSION
diffuseColor.a *= material.transmissionAlpha;
#endif
gl_FragColor = vec4( outgoingLight, diffuseColor.a );`,ox=`vec3 packNormalToRGB( const in vec3 normal ) {
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
}`,cx=`#ifdef PREMULTIPLIED_ALPHA
	gl_FragColor.rgb *= gl_FragColor.a;
#endif`,lx=`vec4 mvPosition = vec4( transformed, 1.0 );
#ifdef USE_BATCHING
	mvPosition = batchingMatrix * mvPosition;
#endif
#ifdef USE_INSTANCING
	mvPosition = instanceMatrix * mvPosition;
#endif
mvPosition = modelViewMatrix * mvPosition;
gl_Position = projectionMatrix * mvPosition;`,hx=`#ifdef DITHERING
	gl_FragColor.rgb = dithering( gl_FragColor.rgb );
#endif`,ux=`#ifdef DITHERING
	vec3 dithering( vec3 color ) {
		float grid_position = rand( gl_FragCoord.xy );
		vec3 dither_shift_RGB = vec3( 0.25 / 255.0, -0.25 / 255.0, 0.25 / 255.0 );
		dither_shift_RGB = mix( 2.0 * dither_shift_RGB, -2.0 * dither_shift_RGB, grid_position );
		return color + dither_shift_RGB;
	}
#endif`,dx=`float roughnessFactor = roughness;
#ifdef USE_ROUGHNESSMAP
	vec4 texelRoughness = texture2D( roughnessMap, vRoughnessMapUv );
	roughnessFactor *= texelRoughness.g;
#endif`,fx=`#ifdef USE_ROUGHNESSMAP
	uniform sampler2D roughnessMap;
#endif`,px=`#if NUM_SPOT_LIGHT_COORDS > 0
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
#endif`,mx=`#if NUM_SPOT_LIGHT_COORDS > 0
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
#endif`,gx=`#if ( defined( USE_SHADOWMAP ) && ( NUM_DIR_LIGHT_SHADOWS > 0 || NUM_POINT_LIGHT_SHADOWS > 0 ) ) || ( NUM_SPOT_LIGHT_COORDS > 0 )
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
#endif`,xx=`float getShadowMask() {
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
}`,_x=`#ifdef USE_SKINNING
	mat4 boneMatX = getBoneMatrix( skinIndex.x );
	mat4 boneMatY = getBoneMatrix( skinIndex.y );
	mat4 boneMatZ = getBoneMatrix( skinIndex.z );
	mat4 boneMatW = getBoneMatrix( skinIndex.w );
#endif`,yx=`#ifdef USE_SKINNING
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
#endif`,vx=`#ifdef USE_SKINNING
	vec4 skinVertex = bindMatrix * vec4( transformed, 1.0 );
	vec4 skinned = vec4( 0.0 );
	skinned += boneMatX * skinVertex * skinWeight.x;
	skinned += boneMatY * skinVertex * skinWeight.y;
	skinned += boneMatZ * skinVertex * skinWeight.z;
	skinned += boneMatW * skinVertex * skinWeight.w;
	transformed = ( bindMatrixInverse * skinned ).xyz;
#endif`,bx=`#ifdef USE_SKINNING
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
#endif`,Sx=`float specularStrength;
#ifdef USE_SPECULARMAP
	vec4 texelSpecular = texture2D( specularMap, vSpecularMapUv );
	specularStrength = texelSpecular.r;
#else
	specularStrength = 1.0;
#endif`,Mx=`#ifdef USE_SPECULARMAP
	uniform sampler2D specularMap;
#endif`,Ex=`#if defined( TONE_MAPPING )
	gl_FragColor.rgb = toneMapping( gl_FragColor.rgb );
#endif`,wx=`#ifndef saturate
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
vec3 CustomToneMapping( vec3 color ) { return color; }`,Tx=`#ifdef USE_TRANSMISSION
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
#endif`,Ax=`#ifdef USE_TRANSMISSION
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
#endif`,Px=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
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
#endif`,Cx=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
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
#endif`,Rx=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
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
#endif`,Ix=`#if defined( USE_ENVMAP ) || defined( DISTANCE ) || defined ( USE_SHADOWMAP ) || defined ( USE_TRANSMISSION ) || NUM_SPOT_LIGHT_COORDS > 0
	vec4 worldPosition = vec4( transformed, 1.0 );
	#ifdef USE_BATCHING
		worldPosition = batchingMatrix * worldPosition;
	#endif
	#ifdef USE_INSTANCING
		worldPosition = instanceMatrix * worldPosition;
	#endif
	worldPosition = modelMatrix * worldPosition;
#endif`,Lx=`varying vec2 vUv;
uniform mat3 uvTransform;
void main() {
	vUv = ( uvTransform * vec3( uv, 1 ) ).xy;
	gl_Position = vec4( position.xy, 1.0, 1.0 );
}`,Dx=`uniform sampler2D t2D;
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
}`,Fx=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
	gl_Position.z = gl_Position.w;
}`,Ux=`#ifdef ENVMAP_TYPE_CUBE
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
}`,Nx=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
	gl_Position.z = gl_Position.w;
}`,Ox=`uniform samplerCube tCube;
uniform float tFlip;
uniform float opacity;
varying vec3 vWorldDirection;
void main() {
	vec4 texColor = textureCube( tCube, vec3( tFlip * vWorldDirection.x, vWorldDirection.yz ) );
	gl_FragColor = texColor;
	gl_FragColor.a *= opacity;
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,Bx=`#include <common>
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
}`,zx=`#if DEPTH_PACKING == 3200
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
}`,Vx=`#define DISTANCE
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
}`,kx=`#define DISTANCE
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
}`,Hx=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
}`,Gx=`uniform sampler2D tEquirect;
varying vec3 vWorldDirection;
#include <common>
void main() {
	vec3 direction = normalize( vWorldDirection );
	vec2 sampleUV = equirectUv( direction );
	gl_FragColor = texture2D( tEquirect, sampleUV );
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,Wx=`uniform float scale;
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
}`,Xx=`uniform vec3 diffuse;
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
}`,qx=`#include <common>
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
}`,Yx=`uniform vec3 diffuse;
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
}`,$x=`#define LAMBERT
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
}`,Kx=`#define LAMBERT
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
}`,Zx=`#define MATCAP
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
}`,Jx=`#define MATCAP
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
}`,jx=`#define NORMAL
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
}`,Qx=`#define NORMAL
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
}`,e0=`#define PHONG
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
}`,t0=`#define PHONG
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
}`,n0=`#define STANDARD
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
}`,i0=`#define STANDARD
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
}`,s0=`#define TOON
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
}`,r0=`#define TOON
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
}`,a0=`uniform float size;
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
}`,o0=`uniform vec3 diffuse;
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
}`,c0=`#include <common>
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
}`,l0=`uniform vec3 color;
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
}`,h0=`uniform float rotation;
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
}`,u0=`uniform vec3 diffuse;
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
}`,ke={alphahash_fragment:Lm,alphahash_pars_fragment:Dm,alphamap_fragment:Fm,alphamap_pars_fragment:Um,alphatest_fragment:Nm,alphatest_pars_fragment:Om,aomap_fragment:Bm,aomap_pars_fragment:zm,batching_pars_vertex:Vm,batching_vertex:km,begin_vertex:Hm,beginnormal_vertex:Gm,bsdfs:Wm,iridescence_fragment:Xm,bumpmap_pars_fragment:qm,clipping_planes_fragment:Ym,clipping_planes_pars_fragment:$m,clipping_planes_pars_vertex:Km,clipping_planes_vertex:Zm,color_fragment:Jm,color_pars_fragment:jm,color_pars_vertex:Qm,color_vertex:eg,common:tg,cube_uv_reflection_fragment:ng,defaultnormal_vertex:ig,displacementmap_pars_vertex:sg,displacementmap_vertex:rg,emissivemap_fragment:ag,emissivemap_pars_fragment:og,colorspace_fragment:cg,colorspace_pars_fragment:lg,envmap_fragment:hg,envmap_common_pars_fragment:ug,envmap_pars_fragment:dg,envmap_pars_vertex:fg,envmap_physical_pars_fragment:Eg,envmap_vertex:pg,fog_vertex:mg,fog_pars_vertex:gg,fog_fragment:xg,fog_pars_fragment:_g,gradientmap_pars_fragment:yg,lightmap_pars_fragment:vg,lights_lambert_fragment:bg,lights_lambert_pars_fragment:Sg,lights_pars_begin:Mg,lights_toon_fragment:wg,lights_toon_pars_fragment:Tg,lights_phong_fragment:Ag,lights_phong_pars_fragment:Pg,lights_physical_fragment:Cg,lights_physical_pars_fragment:Rg,lights_fragment_begin:Ig,lights_fragment_maps:Lg,lights_fragment_end:Dg,lightprobes_pars_fragment:Fg,logdepthbuf_fragment:Ug,logdepthbuf_pars_fragment:Ng,logdepthbuf_pars_vertex:Og,logdepthbuf_vertex:Bg,map_fragment:zg,map_pars_fragment:Vg,map_particle_fragment:kg,map_particle_pars_fragment:Hg,metalnessmap_fragment:Gg,metalnessmap_pars_fragment:Wg,morphinstance_vertex:Xg,morphcolor_vertex:qg,morphnormal_vertex:Yg,morphtarget_pars_vertex:$g,morphtarget_vertex:Kg,normal_fragment_begin:Zg,normal_fragment_maps:Jg,normal_pars_fragment:jg,normal_pars_vertex:Qg,normal_vertex:ex,normalmap_pars_fragment:tx,clearcoat_normal_fragment_begin:nx,clearcoat_normal_fragment_maps:ix,clearcoat_pars_fragment:sx,iridescence_pars_fragment:rx,opaque_fragment:ax,packing:ox,premultiplied_alpha_fragment:cx,project_vertex:lx,dithering_fragment:hx,dithering_pars_fragment:ux,roughnessmap_fragment:dx,roughnessmap_pars_fragment:fx,shadowmap_pars_fragment:px,shadowmap_pars_vertex:mx,shadowmap_vertex:gx,shadowmask_pars_fragment:xx,skinbase_vertex:_x,skinning_pars_vertex:yx,skinning_vertex:vx,skinnormal_vertex:bx,specularmap_fragment:Sx,specularmap_pars_fragment:Mx,tonemapping_fragment:Ex,tonemapping_pars_fragment:wx,transmission_fragment:Tx,transmission_pars_fragment:Ax,uv_pars_fragment:Px,uv_pars_vertex:Cx,uv_vertex:Rx,worldpos_vertex:Ix,background_vert:Lx,background_frag:Dx,backgroundCube_vert:Fx,backgroundCube_frag:Ux,cube_vert:Nx,cube_frag:Ox,depth_vert:Bx,depth_frag:zx,distance_vert:Vx,distance_frag:kx,equirect_vert:Hx,equirect_frag:Gx,linedashed_vert:Wx,linedashed_frag:Xx,meshbasic_vert:qx,meshbasic_frag:Yx,meshlambert_vert:$x,meshlambert_frag:Kx,meshmatcap_vert:Zx,meshmatcap_frag:Jx,meshnormal_vert:jx,meshnormal_frag:Qx,meshphong_vert:e0,meshphong_frag:t0,meshphysical_vert:n0,meshphysical_frag:i0,meshtoon_vert:s0,meshtoon_frag:r0,points_vert:a0,points_frag:o0,shadow_vert:c0,shadow_frag:l0,sprite_vert:h0,sprite_frag:u0},se={common:{diffuse:{value:new Xe(16777215)},opacity:{value:1},map:{value:null},mapTransform:{value:new De},alphaMap:{value:null},alphaMapTransform:{value:new De},alphaTest:{value:0}},specularmap:{specularMap:{value:null},specularMapTransform:{value:new De}},envmap:{envMap:{value:null},envMapRotation:{value:new De},reflectivity:{value:1},ior:{value:1.5},refractionRatio:{value:.98},dfgLUT:{value:null}},aomap:{aoMap:{value:null},aoMapIntensity:{value:1},aoMapTransform:{value:new De}},lightmap:{lightMap:{value:null},lightMapIntensity:{value:1},lightMapTransform:{value:new De}},bumpmap:{bumpMap:{value:null},bumpMapTransform:{value:new De},bumpScale:{value:1}},normalmap:{normalMap:{value:null},normalMapTransform:{value:new De},normalScale:{value:new _e(1,1)}},displacementmap:{displacementMap:{value:null},displacementMapTransform:{value:new De},displacementScale:{value:1},displacementBias:{value:0}},emissivemap:{emissiveMap:{value:null},emissiveMapTransform:{value:new De}},metalnessmap:{metalnessMap:{value:null},metalnessMapTransform:{value:new De}},roughnessmap:{roughnessMap:{value:null},roughnessMapTransform:{value:new De}},gradientmap:{gradientMap:{value:null}},fog:{fogDensity:{value:25e-5},fogNear:{value:1},fogFar:{value:2e3},fogColor:{value:new Xe(16777215)}},lights:{ambientLightColor:{value:[]},lightProbe:{value:[]},directionalLights:{value:[],properties:{direction:{},color:{}}},directionalLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{}}},directionalShadowMatrix:{value:[]},spotLights:{value:[],properties:{color:{},position:{},direction:{},distance:{},coneCos:{},penumbraCos:{},decay:{}}},spotLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{}}},spotLightMap:{value:[]},spotLightMatrix:{value:[]},pointLights:{value:[],properties:{color:{},position:{},decay:{},distance:{}}},pointLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{},shadowCameraNear:{},shadowCameraFar:{}}},pointShadowMatrix:{value:[]},hemisphereLights:{value:[],properties:{direction:{},skyColor:{},groundColor:{}}},rectAreaLights:{value:[],properties:{color:{},position:{},width:{},height:{}}},ltc_1:{value:null},ltc_2:{value:null},probesSH:{value:null},probesMin:{value:new L},probesMax:{value:new L},probesResolution:{value:new L}},points:{diffuse:{value:new Xe(16777215)},opacity:{value:1},size:{value:1},scale:{value:1},map:{value:null},alphaMap:{value:null},alphaMapTransform:{value:new De},alphaTest:{value:0},uvTransform:{value:new De}},sprite:{diffuse:{value:new Xe(16777215)},opacity:{value:1},center:{value:new _e(.5,.5)},rotation:{value:0},map:{value:null},mapTransform:{value:new De},alphaMap:{value:null},alphaMapTransform:{value:new De},alphaTest:{value:0}}},Zt={basic:{uniforms:Xt([se.common,se.specularmap,se.envmap,se.aomap,se.lightmap,se.fog]),vertexShader:ke.meshbasic_vert,fragmentShader:ke.meshbasic_frag},lambert:{uniforms:Xt([se.common,se.specularmap,se.envmap,se.aomap,se.lightmap,se.emissivemap,se.bumpmap,se.normalmap,se.displacementmap,se.fog,se.lights,{emissive:{value:new Xe(0)},envMapIntensity:{value:1}}]),vertexShader:ke.meshlambert_vert,fragmentShader:ke.meshlambert_frag},phong:{uniforms:Xt([se.common,se.specularmap,se.envmap,se.aomap,se.lightmap,se.emissivemap,se.bumpmap,se.normalmap,se.displacementmap,se.fog,se.lights,{emissive:{value:new Xe(0)},specular:{value:new Xe(1118481)},shininess:{value:30},envMapIntensity:{value:1}}]),vertexShader:ke.meshphong_vert,fragmentShader:ke.meshphong_frag},standard:{uniforms:Xt([se.common,se.envmap,se.aomap,se.lightmap,se.emissivemap,se.bumpmap,se.normalmap,se.displacementmap,se.roughnessmap,se.metalnessmap,se.fog,se.lights,{emissive:{value:new Xe(0)},roughness:{value:1},metalness:{value:0},envMapIntensity:{value:1}}]),vertexShader:ke.meshphysical_vert,fragmentShader:ke.meshphysical_frag},toon:{uniforms:Xt([se.common,se.aomap,se.lightmap,se.emissivemap,se.bumpmap,se.normalmap,se.displacementmap,se.gradientmap,se.fog,se.lights,{emissive:{value:new Xe(0)}}]),vertexShader:ke.meshtoon_vert,fragmentShader:ke.meshtoon_frag},matcap:{uniforms:Xt([se.common,se.bumpmap,se.normalmap,se.displacementmap,se.fog,{matcap:{value:null}}]),vertexShader:ke.meshmatcap_vert,fragmentShader:ke.meshmatcap_frag},points:{uniforms:Xt([se.points,se.fog]),vertexShader:ke.points_vert,fragmentShader:ke.points_frag},dashed:{uniforms:Xt([se.common,se.fog,{scale:{value:1},dashSize:{value:1},totalSize:{value:2}}]),vertexShader:ke.linedashed_vert,fragmentShader:ke.linedashed_frag},depth:{uniforms:Xt([se.common,se.displacementmap]),vertexShader:ke.depth_vert,fragmentShader:ke.depth_frag},normal:{uniforms:Xt([se.common,se.bumpmap,se.normalmap,se.displacementmap,{opacity:{value:1}}]),vertexShader:ke.meshnormal_vert,fragmentShader:ke.meshnormal_frag},sprite:{uniforms:Xt([se.sprite,se.fog]),vertexShader:ke.sprite_vert,fragmentShader:ke.sprite_frag},background:{uniforms:{uvTransform:{value:new De},t2D:{value:null},backgroundIntensity:{value:1}},vertexShader:ke.background_vert,fragmentShader:ke.background_frag},backgroundCube:{uniforms:{envMap:{value:null},backgroundBlurriness:{value:0},backgroundIntensity:{value:1},backgroundRotation:{value:new De}},vertexShader:ke.backgroundCube_vert,fragmentShader:ke.backgroundCube_frag},cube:{uniforms:{tCube:{value:null},tFlip:{value:-1},opacity:{value:1}},vertexShader:ke.cube_vert,fragmentShader:ke.cube_frag},equirect:{uniforms:{tEquirect:{value:null}},vertexShader:ke.equirect_vert,fragmentShader:ke.equirect_frag},distance:{uniforms:Xt([se.common,se.displacementmap,{referencePosition:{value:new L},nearDistance:{value:1},farDistance:{value:1e3}}]),vertexShader:ke.distance_vert,fragmentShader:ke.distance_frag},shadow:{uniforms:Xt([se.lights,se.fog,{color:{value:new Xe(0)},opacity:{value:1}}]),vertexShader:ke.shadow_vert,fragmentShader:ke.shadow_frag}};Zt.physical={uniforms:Xt([Zt.standard.uniforms,{clearcoat:{value:0},clearcoatMap:{value:null},clearcoatMapTransform:{value:new De},clearcoatNormalMap:{value:null},clearcoatNormalMapTransform:{value:new De},clearcoatNormalScale:{value:new _e(1,1)},clearcoatRoughness:{value:0},clearcoatRoughnessMap:{value:null},clearcoatRoughnessMapTransform:{value:new De},dispersion:{value:0},iridescence:{value:0},iridescenceMap:{value:null},iridescenceMapTransform:{value:new De},iridescenceIOR:{value:1.3},iridescenceThicknessMinimum:{value:100},iridescenceThicknessMaximum:{value:400},iridescenceThicknessMap:{value:null},iridescenceThicknessMapTransform:{value:new De},sheen:{value:0},sheenColor:{value:new Xe(0)},sheenColorMap:{value:null},sheenColorMapTransform:{value:new De},sheenRoughness:{value:1},sheenRoughnessMap:{value:null},sheenRoughnessMapTransform:{value:new De},transmission:{value:0},transmissionMap:{value:null},transmissionMapTransform:{value:new De},transmissionSamplerSize:{value:new _e},transmissionSamplerMap:{value:null},thickness:{value:0},thicknessMap:{value:null},thicknessMapTransform:{value:new De},attenuationDistance:{value:0},attenuationColor:{value:new Xe(0)},specularColor:{value:new Xe(1,1,1)},specularColorMap:{value:null},specularColorMapTransform:{value:new De},specularIntensity:{value:1},specularIntensityMap:{value:null},specularIntensityMapTransform:{value:new De},anisotropyVector:{value:new _e},anisotropyMap:{value:null},anisotropyMapTransform:{value:new De}}]),vertexShader:ke.meshphysical_vert,fragmentShader:ke.meshphysical_frag};var pc={r:0,b:0,g:0},d0=new at,ef=new De;ef.set(-1,0,0,0,1,0,0,0,1);function f0(i,e,t,n,s,r){let a=new Xe(0),o=s===!0?0:1,c,l,h=null,d=0,u=null;function f(b){let E=b.isScene===!0?b.background:null;if(E&&E.isTexture){let v=b.backgroundBlurriness>0;E=e.get(E,v)}return E}function m(b){let E=!1,v=f(b);v===null?g(a,o):v&&v.isColor&&(g(v,1),E=!0);let A=i.xr.getEnvironmentBlendMode();A==="additive"?t.buffers.color.setClear(0,0,0,1,r):A==="alpha-blend"&&t.buffers.color.setClear(0,0,0,0,r),(i.autoClear||E)&&(t.buffers.depth.setTest(!0),t.buffers.depth.setMask(!0),t.buffers.color.setMask(!0),i.clear(i.autoClearColor,i.autoClearDepth,i.autoClearStencil))}function _(b,E){let v=f(E);v&&(v.isCubeTexture||v.mapping===Lr)?(l===void 0&&(l=new Ot(new Ps(1,1,1),new $t({name:"BackgroundCubeMaterial",uniforms:Qi(Zt.backgroundCube.uniforms),vertexShader:Zt.backgroundCube.vertexShader,fragmentShader:Zt.backgroundCube.fragmentShader,side:Kt,depthTest:!1,depthWrite:!1,fog:!1,allowOverride:!1})),l.geometry.deleteAttribute("normal"),l.geometry.deleteAttribute("uv"),l.onBeforeRender=function(A,M,w){this.matrixWorld.copyPosition(w.matrixWorld)},Object.defineProperty(l.material,"envMap",{get:function(){return this.uniforms.envMap.value}}),n.update(l)),l.material.uniforms.envMap.value=v,l.material.uniforms.backgroundBlurriness.value=E.backgroundBlurriness,l.material.uniforms.backgroundIntensity.value=E.backgroundIntensity,l.material.uniforms.backgroundRotation.value.setFromMatrix4(d0.makeRotationFromEuler(E.backgroundRotation)).transpose(),v.isCubeTexture&&v.isRenderTargetTexture===!1&&l.material.uniforms.backgroundRotation.value.premultiply(ef),l.material.toneMapped=We.getTransfer(v.colorSpace)!==je,(h!==v||d!==v.version||u!==i.toneMapping)&&(l.material.needsUpdate=!0,h=v,d=v.version,u=i.toneMapping),l.layers.enableAll(),b.unshift(l,l.geometry,l.material,0,0,null)):v&&v.isTexture&&(c===void 0&&(c=new Ot(new Mr(2,2),new $t({name:"BackgroundMaterial",uniforms:Qi(Zt.background.uniforms),vertexShader:Zt.background.vertexShader,fragmentShader:Zt.background.fragmentShader,side:ni,depthTest:!1,depthWrite:!1,fog:!1,allowOverride:!1})),c.geometry.deleteAttribute("normal"),Object.defineProperty(c.material,"map",{get:function(){return this.uniforms.t2D.value}}),n.update(c)),c.material.uniforms.t2D.value=v,c.material.uniforms.backgroundIntensity.value=E.backgroundIntensity,c.material.toneMapped=We.getTransfer(v.colorSpace)!==je,v.matrixAutoUpdate===!0&&v.updateMatrix(),c.material.uniforms.uvTransform.value.copy(v.matrix),(h!==v||d!==v.version||u!==i.toneMapping)&&(c.material.needsUpdate=!0,h=v,d=v.version,u=i.toneMapping),c.layers.enableAll(),b.unshift(c,c.geometry,c.material,0,0,null))}function g(b,E){b.getRGB(pc,eh(i)),t.buffers.color.setClear(pc.r,pc.g,pc.b,E,r)}function p(){l!==void 0&&(l.geometry.dispose(),l.material.dispose(),l=void 0),c!==void 0&&(c.geometry.dispose(),c.material.dispose(),c=void 0)}return{getClearColor:function(){return a},setClearColor:function(b,E=1){a.set(b),o=E,g(a,o)},getClearAlpha:function(){return o},setClearAlpha:function(b){o=b,g(a,o)},render:m,addToRenderList:_,dispose:p}}function p0(i,e){let t=i.getParameter(i.MAX_VERTEX_ATTRIBS),n={},s=u(null),r=s,a=!1;function o(C,D,I,V,F){let X=!1,B=d(C,V,I,D);r!==B&&(r=B,l(r.object)),X=f(C,V,I,F),X&&m(C,V,I,F),F!==null&&e.update(F,i.ELEMENT_ARRAY_BUFFER),(X||a)&&(a=!1,v(C,D,I,V),F!==null&&i.bindBuffer(i.ELEMENT_ARRAY_BUFFER,e.get(F).buffer))}function c(){return i.createVertexArray()}function l(C){return i.bindVertexArray(C)}function h(C){return i.deleteVertexArray(C)}function d(C,D,I,V){let F=V.wireframe===!0,X=n[D.id];X===void 0&&(X={},n[D.id]=X);let B=C.isInstancedMesh===!0?C.id:0,$=X[B];$===void 0&&($={},X[B]=$);let J=$[I.id];J===void 0&&(J={},$[I.id]=J);let ne=J[F];return ne===void 0&&(ne=u(c()),J[F]=ne),ne}function u(C){let D=[],I=[],V=[];for(let F=0;F<t;F++)D[F]=0,I[F]=0,V[F]=0;return{geometry:null,program:null,wireframe:!1,newAttributes:D,enabledAttributes:I,attributeDivisors:V,object:C,attributes:{},index:null}}function f(C,D,I,V){let F=r.attributes,X=D.attributes,B=0,$=I.getAttributes();for(let J in $)if($[J].location>=0){let de=F[J],ve=X[J];if(ve===void 0&&(J==="instanceMatrix"&&C.instanceMatrix&&(ve=C.instanceMatrix),J==="instanceColor"&&C.instanceColor&&(ve=C.instanceColor)),de===void 0||de.attribute!==ve||ve&&de.data!==ve.data)return!0;B++}return r.attributesNum!==B||r.index!==V}function m(C,D,I,V){let F={},X=D.attributes,B=0,$=I.getAttributes();for(let J in $)if($[J].location>=0){let de=X[J];de===void 0&&(J==="instanceMatrix"&&C.instanceMatrix&&(de=C.instanceMatrix),J==="instanceColor"&&C.instanceColor&&(de=C.instanceColor));let ve={};ve.attribute=de,de&&de.data&&(ve.data=de.data),F[J]=ve,B++}r.attributes=F,r.attributesNum=B,r.index=V}function _(){let C=r.newAttributes;for(let D=0,I=C.length;D<I;D++)C[D]=0}function g(C){p(C,0)}function p(C,D){let I=r.newAttributes,V=r.enabledAttributes,F=r.attributeDivisors;I[C]=1,V[C]===0&&(i.enableVertexAttribArray(C),V[C]=1),F[C]!==D&&(i.vertexAttribDivisor(C,D),F[C]=D)}function b(){let C=r.newAttributes,D=r.enabledAttributes;for(let I=0,V=D.length;I<V;I++)D[I]!==C[I]&&(i.disableVertexAttribArray(I),D[I]=0)}function E(C,D,I,V,F,X,B){B===!0?i.vertexAttribIPointer(C,D,I,F,X):i.vertexAttribPointer(C,D,I,V,F,X)}function v(C,D,I,V){_();let F=V.attributes,X=I.getAttributes(),B=D.defaultAttributeValues;for(let $ in X){let J=X[$];if(J.location>=0){let ne=F[$];if(ne===void 0&&($==="instanceMatrix"&&C.instanceMatrix&&(ne=C.instanceMatrix),$==="instanceColor"&&C.instanceColor&&(ne=C.instanceColor)),ne!==void 0){let de=ne.normalized,ve=ne.itemSize,Ke=e.get(ne);if(Ke===void 0)continue;let dt=Ke.buffer,Ze=Ke.type,j=Ke.bytesPerElement,ae=Ze===i.INT||Ze===i.UNSIGNED_INT||ne.gpuType===Ro;if(ne.isInterleavedBufferAttribute){let ee=ne.data,Le=ee.stride,Ne=ne.offset;if(ee.isInstancedInterleavedBuffer){for(let Ce=0;Ce<J.locationSize;Ce++)p(J.location+Ce,ee.meshPerAttribute);C.isInstancedMesh!==!0&&V._maxInstanceCount===void 0&&(V._maxInstanceCount=ee.meshPerAttribute*ee.count)}else for(let Ce=0;Ce<J.locationSize;Ce++)g(J.location+Ce);i.bindBuffer(i.ARRAY_BUFFER,dt);for(let Ce=0;Ce<J.locationSize;Ce++)E(J.location+Ce,ve/J.locationSize,Ze,de,Le*j,(Ne+ve/J.locationSize*Ce)*j,ae)}else{if(ne.isInstancedBufferAttribute){for(let ee=0;ee<J.locationSize;ee++)p(J.location+ee,ne.meshPerAttribute);C.isInstancedMesh!==!0&&V._maxInstanceCount===void 0&&(V._maxInstanceCount=ne.meshPerAttribute*ne.count)}else for(let ee=0;ee<J.locationSize;ee++)g(J.location+ee);i.bindBuffer(i.ARRAY_BUFFER,dt);for(let ee=0;ee<J.locationSize;ee++)E(J.location+ee,ve/J.locationSize,Ze,de,ve*j,ve/J.locationSize*ee*j,ae)}}else if(B!==void 0){let de=B[$];if(de!==void 0)switch(de.length){case 2:i.vertexAttrib2fv(J.location,de);break;case 3:i.vertexAttrib3fv(J.location,de);break;case 4:i.vertexAttrib4fv(J.location,de);break;default:i.vertexAttrib1fv(J.location,de)}}}}b()}function A(){T();for(let C in n){let D=n[C];for(let I in D){let V=D[I];for(let F in V){let X=V[F];for(let B in X)h(X[B].object),delete X[B];delete V[F]}}delete n[C]}}function M(C){if(n[C.id]===void 0)return;let D=n[C.id];for(let I in D){let V=D[I];for(let F in V){let X=V[F];for(let B in X)h(X[B].object),delete X[B];delete V[F]}}delete n[C.id]}function w(C){for(let D in n){let I=n[D];for(let V in I){let F=I[V];if(F[C.id]===void 0)continue;let X=F[C.id];for(let B in X)h(X[B].object),delete X[B];delete F[C.id]}}}function x(C){for(let D in n){let I=n[D],V=C.isInstancedMesh===!0?C.id:0,F=I[V];if(F!==void 0){for(let X in F){let B=F[X];for(let $ in B)h(B[$].object),delete B[$];delete F[X]}delete I[V],Object.keys(I).length===0&&delete n[D]}}}function T(){R(),a=!0,r!==s&&(r=s,l(r.object))}function R(){s.geometry=null,s.program=null,s.wireframe=!1}return{setup:o,reset:T,resetDefaultState:R,dispose:A,releaseStatesOfGeometry:M,releaseStatesOfObject:x,releaseStatesOfProgram:w,initAttributes:_,enableAttribute:g,disableUnusedAttributes:b}}function m0(i,e,t){let n;function s(c){n=c}function r(c,l){i.drawArrays(n,c,l),t.update(l,n,1)}function a(c,l,h){h!==0&&(i.drawArraysInstanced(n,c,l,h),t.update(l,n,h))}function o(c,l,h){if(h===0)return;e.get("WEBGL_multi_draw").multiDrawArraysWEBGL(n,c,0,l,0,h);let u=0;for(let f=0;f<h;f++)u+=l[f];t.update(u,n,1)}this.setMode=s,this.render=r,this.renderInstances=a,this.renderMultiDraw=o}function g0(i,e,t,n){let s;function r(){if(s!==void 0)return s;if(e.has("EXT_texture_filter_anisotropic")===!0){let w=e.get("EXT_texture_filter_anisotropic");s=i.getParameter(w.MAX_TEXTURE_MAX_ANISOTROPY_EXT)}else s=0;return s}function a(w){return!(w!==yn&&n.convert(w)!==i.getParameter(i.IMPLEMENTATION_COLOR_READ_FORMAT))}function o(w){let x=w===Gn&&(e.has("EXT_color_buffer_half_float")||e.has("EXT_color_buffer_float"));return!(w!==fn&&n.convert(w)!==i.getParameter(i.IMPLEMENTATION_COLOR_READ_TYPE)&&w!==Cn&&!x)}function c(w){if(w==="highp"){if(i.getShaderPrecisionFormat(i.VERTEX_SHADER,i.HIGH_FLOAT).precision>0&&i.getShaderPrecisionFormat(i.FRAGMENT_SHADER,i.HIGH_FLOAT).precision>0)return"highp";w="mediump"}return w==="mediump"&&i.getShaderPrecisionFormat(i.VERTEX_SHADER,i.MEDIUM_FLOAT).precision>0&&i.getShaderPrecisionFormat(i.FRAGMENT_SHADER,i.MEDIUM_FLOAT).precision>0?"mediump":"lowp"}let l=t.precision!==void 0?t.precision:"highp",h=c(l);h!==l&&(Pe("WebGLRenderer:",l,"not supported, using",h,"instead."),l=h);let d=t.logarithmicDepthBuffer===!0,u=t.reversedDepthBuffer===!0&&e.has("EXT_clip_control");t.reversedDepthBuffer===!0&&u===!1&&Pe("WebGLRenderer: Unable to use reversed depth buffer due to missing EXT_clip_control extension. Fallback to default depth buffer.");let f=i.getParameter(i.MAX_TEXTURE_IMAGE_UNITS),m=i.getParameter(i.MAX_VERTEX_TEXTURE_IMAGE_UNITS),_=i.getParameter(i.MAX_TEXTURE_SIZE),g=i.getParameter(i.MAX_CUBE_MAP_TEXTURE_SIZE),p=i.getParameter(i.MAX_VERTEX_ATTRIBS),b=i.getParameter(i.MAX_VERTEX_UNIFORM_VECTORS),E=i.getParameter(i.MAX_VARYING_VECTORS),v=i.getParameter(i.MAX_FRAGMENT_UNIFORM_VECTORS),A=i.getParameter(i.MAX_SAMPLES),M=i.getParameter(i.SAMPLES);return{isWebGL2:!0,getMaxAnisotropy:r,getMaxPrecision:c,textureFormatReadable:a,textureTypeReadable:o,precision:l,logarithmicDepthBuffer:d,reversedDepthBuffer:u,maxTextures:f,maxVertexTextures:m,maxTextureSize:_,maxCubemapSize:g,maxAttributes:p,maxVertexUniforms:b,maxVaryings:E,maxFragmentUniforms:v,maxSamples:A,samples:M}}function x0(i){let e=this,t=null,n=0,s=!1,r=!1,a=new Un,o=new De,c={value:null,needsUpdate:!1};this.uniform=c,this.numPlanes=0,this.numIntersection=0,this.init=function(d,u){let f=d.length!==0||u||n!==0||s;return s=u,n=d.length,f},this.beginShadows=function(){r=!0,h(null)},this.endShadows=function(){r=!1},this.setGlobalState=function(d,u){t=h(d,u,0)},this.setState=function(d,u,f){let m=d.clippingPlanes,_=d.clipIntersection,g=d.clipShadows,p=i.get(d);if(!s||m===null||m.length===0||r&&!g)r?h(null):l();else{let b=r?0:n,E=b*4,v=p.clippingState||null;c.value=v,v=h(m,u,E,f);for(let A=0;A!==E;++A)v[A]=t[A];p.clippingState=v,this.numIntersection=_?this.numPlanes:0,this.numPlanes+=b}};function l(){c.value!==t&&(c.value=t,c.needsUpdate=n>0),e.numPlanes=n,e.numIntersection=0}function h(d,u,f,m){let _=d!==null?d.length:0,g=null;if(_!==0){if(g=c.value,m!==!0||g===null){let p=f+_*4,b=u.matrixWorldInverse;o.getNormalMatrix(b),(g===null||g.length<p)&&(g=new Float32Array(p));for(let E=0,v=f;E!==_;++E,v+=4)a.copy(d[E]).applyMatrix4(b,o),a.normal.toArray(g,v),g[v+3]=a.constant}c.value=g,c.needsUpdate=!0}return e.numPlanes=_,e.numIntersection=0,g}}var Li=4,Id=[.125,.215,.35,.446,.526,.582],es=20,_0=256,kr=new Ji,Ld=new Xe,lh=null,hh=0,uh=0,dh=!1,y0=new L,gc=class{constructor(e){this._renderer=e,this._pingPongRenderTarget=null,this._lodMax=0,this._cubeSize=0,this._sizeLods=[],this._sigmas=[],this._lodMeshes=[],this._backgroundBox=null,this._cubemapMaterial=null,this._equirectMaterial=null,this._blurMaterial=null,this._ggxMaterial=null}fromScene(e,t=0,n=.1,s=100,r={}){let{size:a=256,position:o=y0}=r;lh=this._renderer.getRenderTarget(),hh=this._renderer.getActiveCubeFace(),uh=this._renderer.getActiveMipmapLevel(),dh=this._renderer.xr.enabled,this._renderer.xr.enabled=!1,this._setSize(a);let c=this._allocateTargets();return c.depthBuffer=!0,this._sceneToCubeUV(e,n,s,c,o),t>0&&this._blur(c,0,0,t),this._applyPMREM(c),this._cleanup(c),c}fromEquirectangular(e,t=null){return this._fromTexture(e,t)}fromCubemap(e,t=null){return this._fromTexture(e,t)}compileCubemapShader(){this._cubemapMaterial===null&&(this._cubemapMaterial=Ud(),this._compileMaterial(this._cubemapMaterial))}compileEquirectangularShader(){this._equirectMaterial===null&&(this._equirectMaterial=Fd(),this._compileMaterial(this._equirectMaterial))}dispose(){this._dispose(),this._cubemapMaterial!==null&&this._cubemapMaterial.dispose(),this._equirectMaterial!==null&&this._equirectMaterial.dispose(),this._backgroundBox!==null&&(this._backgroundBox.geometry.dispose(),this._backgroundBox.material.dispose())}_setSize(e){this._lodMax=Math.floor(Math.log2(e)),this._cubeSize=Math.pow(2,this._lodMax)}_dispose(){this._blurMaterial!==null&&this._blurMaterial.dispose(),this._ggxMaterial!==null&&this._ggxMaterial.dispose(),this._pingPongRenderTarget!==null&&this._pingPongRenderTarget.dispose();for(let e=0;e<this._lodMeshes.length;e++)this._lodMeshes[e].geometry.dispose()}_cleanup(e){this._renderer.setRenderTarget(lh,hh,uh),this._renderer.xr.enabled=dh,e.scissorTest=!1,Us(e,0,0,e.width,e.height)}_fromTexture(e,t){e.mapping===Pi||e.mapping===ji?this._setSize(e.image.length===0?16:e.image[0].width||e.image[0].image.width):this._setSize(e.image.width/4),lh=this._renderer.getRenderTarget(),hh=this._renderer.getActiveCubeFace(),uh=this._renderer.getActiveMipmapLevel(),dh=this._renderer.xr.enabled,this._renderer.xr.enabled=!1;let n=t||this._allocateTargets();return this._textureToCubeUV(e,n),this._applyPMREM(n),this._cleanup(n),n}_allocateTargets(){let e=3*Math.max(this._cubeSize,112),t=4*this._cubeSize,n={magFilter:Ut,minFilter:Ut,generateMipmaps:!1,type:Gn,format:yn,colorSpace:tr,depthBuffer:!1},s=Dd(e,t,n);if(this._pingPongRenderTarget===null||this._pingPongRenderTarget.width!==e||this._pingPongRenderTarget.height!==t){this._pingPongRenderTarget!==null&&this._dispose(),this._pingPongRenderTarget=Dd(e,t,n);let{_lodMax:r}=this;({lodMeshes:this._lodMeshes,sizeLods:this._sizeLods,sigmas:this._sigmas}=v0(r)),this._blurMaterial=S0(r,e,t),this._ggxMaterial=b0(r,e,t)}return s}_compileMaterial(e){let t=new Ot(new Nt,e);this._renderer.compile(t,kr)}_sceneToCubeUV(e,t,n,s,r){let c=new Wt(90,1,t,n),l=[1,-1,1,1,1,1],h=[1,1,1,-1,-1,-1],d=this._renderer,u=d.autoClear,f=d.toneMapping;d.getClearColor(Ld),d.toneMapping=An,d.autoClear=!1,d.state.buffers.depth.getReversed()&&(d.setRenderTarget(s),d.clearDepth(),d.setRenderTarget(null)),this._backgroundBox===null&&(this._backgroundBox=new Ot(new Ps,new Mi({name:"PMREM.Background",side:Kt,depthWrite:!1,depthTest:!1})));let _=this._backgroundBox,g=_.material,p=!1,b=e.background;b?b.isColor&&(g.color.copy(b),e.background=null,p=!0):(g.color.copy(Ld),p=!0);for(let E=0;E<6;E++){let v=E%3;v===0?(c.up.set(0,l[E],0),c.position.set(r.x,r.y,r.z),c.lookAt(r.x+h[E],r.y,r.z)):v===1?(c.up.set(0,0,l[E]),c.position.set(r.x,r.y,r.z),c.lookAt(r.x,r.y+h[E],r.z)):(c.up.set(0,l[E],0),c.position.set(r.x,r.y,r.z),c.lookAt(r.x,r.y,r.z+h[E]));let A=this._cubeSize;Us(s,v*A,E>2?A:0,A,A),d.setRenderTarget(s),p&&d.render(_,c),d.render(e,c)}d.toneMapping=f,d.autoClear=u,e.background=b}_textureToCubeUV(e,t){let n=this._renderer,s=e.mapping===Pi||e.mapping===ji;s?(this._cubemapMaterial===null&&(this._cubemapMaterial=Ud()),this._cubemapMaterial.uniforms.flipEnvMap.value=e.isRenderTargetTexture===!1?-1:1):this._equirectMaterial===null&&(this._equirectMaterial=Fd());let r=s?this._cubemapMaterial:this._equirectMaterial,a=this._lodMeshes[0];a.material=r;let o=r.uniforms;o.envMap.value=e;let c=this._cubeSize;Us(t,0,0,3*c,2*c),n.setRenderTarget(t),n.render(a,kr)}_applyPMREM(e){let t=this._renderer,n=t.autoClear;t.autoClear=!1;let s=this._lodMeshes.length;for(let r=1;r<s;r++)this._applyGGXFilter(e,r-1,r);t.autoClear=n}_applyGGXFilter(e,t,n){let s=this._renderer,r=this._pingPongRenderTarget,a=this._ggxMaterial,o=this._lodMeshes[n];o.material=a;let c=a.uniforms,l=n/(this._lodMeshes.length-1),h=t/(this._lodMeshes.length-1),d=Math.sqrt(l*l-h*h),u=0+l*1.25,f=d*u,{_lodMax:m}=this,_=this._sizeLods[n],g=3*_*(n>m-Li?n-m+Li:0),p=4*(this._cubeSize-_);c.envMap.value=e.texture,c.roughness.value=f,c.mipInt.value=m-t,Us(r,g,p,3*_,2*_),s.setRenderTarget(r),s.render(o,kr),c.envMap.value=r.texture,c.roughness.value=0,c.mipInt.value=m-n,Us(e,g,p,3*_,2*_),s.setRenderTarget(e),s.render(o,kr)}_blur(e,t,n,s,r){let a=this._pingPongRenderTarget;this._halfBlur(e,a,t,n,s,"latitudinal",r),this._halfBlur(a,e,n,n,s,"longitudinal",r)}_halfBlur(e,t,n,s,r,a,o){let c=this._renderer,l=this._blurMaterial;a!=="latitudinal"&&a!=="longitudinal"&&Ie("blur direction must be either latitudinal or longitudinal!");let h=3,d=this._lodMeshes[s];d.material=l;let u=l.uniforms,f=this._sizeLods[n]-1,m=isFinite(r)?Math.PI/(2*f):2*Math.PI/(2*es-1),_=r/m,g=isFinite(r)?1+Math.floor(h*_):es;g>es&&Pe(`sigmaRadians, ${r}, is too large and will clip, as it requested ${g} samples when the maximum is set to ${es}`);let p=[],b=0;for(let w=0;w<es;++w){let x=w/_,T=Math.exp(-x*x/2);p.push(T),w===0?b+=T:w<g&&(b+=2*T)}for(let w=0;w<p.length;w++)p[w]=p[w]/b;u.envMap.value=e.texture,u.samples.value=g,u.weights.value=p,u.latitudinal.value=a==="latitudinal",o&&(u.poleAxis.value=o);let{_lodMax:E}=this;u.dTheta.value=m,u.mipInt.value=E-n;let v=this._sizeLods[s],A=3*v*(s>E-Li?s-E+Li:0),M=4*(this._cubeSize-v);Us(t,A,M,3*v,2*v),c.setRenderTarget(t),c.render(d,kr)}};function v0(i){let e=[],t=[],n=[],s=i,r=i-Li+1+Id.length;for(let a=0;a<r;a++){let o=Math.pow(2,s);e.push(o);let c=1/o;a>i-Li?c=Id[a-i+Li-1]:a===0&&(c=0),t.push(c);let l=1/(o-2),h=-l,d=1+l,u=[h,h,d,h,d,d,h,h,d,d,h,d],f=6,m=6,_=3,g=2,p=1,b=new Float32Array(_*m*f),E=new Float32Array(g*m*f),v=new Float32Array(p*m*f);for(let M=0;M<f;M++){let w=M%3*2/3-1,x=M>2?0:-1,T=[w,x,0,w+2/3,x,0,w+2/3,x+1,0,w,x,0,w+2/3,x+1,0,w,x+1,0];b.set(T,_*m*M),E.set(u,g*m*M);let R=[M,M,M,M,M,M];v.set(R,p*m*M)}let A=new Nt;A.setAttribute("position",new en(b,_)),A.setAttribute("uv",new en(E,g)),A.setAttribute("faceIndex",new en(v,p)),n.push(new Ot(A,null)),s>Li&&s--}return{lodMeshes:n,sizeLods:e,sigmas:t}}function Dd(i,e,t){let n=new cn(i,e,t);return n.texture.mapping=Lr,n.texture.name="PMREM.cubeUv",n.scissorTest=!0,n}function Us(i,e,t,n,s){i.viewport.set(e,t,n,s),i.scissor.set(e,t,n,s)}function b0(i,e,t){return new $t({name:"PMREMGGXConvolution",defines:{GGX_SAMPLES:_0,CUBEUV_TEXEL_WIDTH:1/e,CUBEUV_TEXEL_HEIGHT:1/t,CUBEUV_MAX_MIP:`${i}.0`},uniforms:{envMap:{value:null},roughness:{value:0},mipInt:{value:0}},vertexShader:yc(),fragmentShader:`

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
		`,blending:Hn,depthTest:!1,depthWrite:!1})}function S0(i,e,t){let n=new Float32Array(es),s=new L(0,1,0);return new $t({name:"SphericalGaussianBlur",defines:{n:es,CUBEUV_TEXEL_WIDTH:1/e,CUBEUV_TEXEL_HEIGHT:1/t,CUBEUV_MAX_MIP:`${i}.0`},uniforms:{envMap:{value:null},samples:{value:1},weights:{value:n},latitudinal:{value:!1},dTheta:{value:0},mipInt:{value:0},poleAxis:{value:s}},vertexShader:yc(),fragmentShader:`

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
		`,blending:Hn,depthTest:!1,depthWrite:!1})}function Fd(){return new $t({name:"EquirectangularToCubeUV",uniforms:{envMap:{value:null}},vertexShader:yc(),fragmentShader:`

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
		`,blending:Hn,depthTest:!1,depthWrite:!1})}function Ud(){return new $t({name:"CubemapToCubeUV",uniforms:{envMap:{value:null},flipEnvMap:{value:-1}},vertexShader:yc(),fragmentShader:`

			precision mediump float;
			precision mediump int;

			uniform float flipEnvMap;

			varying vec3 vOutputDirection;

			uniform samplerCube envMap;

			void main() {

				gl_FragColor = textureCube( envMap, vec3( flipEnvMap * vOutputDirection.x, vOutputDirection.yz ) );

			}
		`,blending:Hn,depthTest:!1,depthWrite:!1})}function yc(){return`

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
	`}var xc=class extends cn{constructor(e=1,t={}){super(e,e,t),this.isWebGLCubeRenderTarget=!0;let n={width:e,height:e,depth:1},s=[n,n,n,n,n,n];this.texture=new pr(s),this._setTextureOptions(t),this.texture.isRenderTargetTexture=!0}fromEquirectangularTexture(e,t){this.texture.type=t.type,this.texture.colorSpace=t.colorSpace,this.texture.generateMipmaps=t.generateMipmaps,this.texture.minFilter=t.minFilter,this.texture.magFilter=t.magFilter;let n={uniforms:{tEquirect:{value:null}},vertexShader:`

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
			`},s=new Ps(5,5,5),r=new $t({name:"CubemapFromEquirect",uniforms:Qi(n.uniforms),vertexShader:n.vertexShader,fragmentShader:n.fragmentShader,side:Kt,blending:Hn});r.uniforms.tEquirect.value=t;let a=new Ot(s,r),o=t.minFilter;return t.minFilter===Ci&&(t.minFilter=Ut),new Mo(1,10,this).update(e,a),t.minFilter=o,a.geometry.dispose(),a.material.dispose(),this}clear(e,t=!0,n=!0,s=!0){let r=e.getRenderTarget();for(let a=0;a<6;a++)e.setRenderTarget(this,a),e.clear(t,n,s);e.setRenderTarget(r)}};function M0(i){let e=new WeakMap,t=new WeakMap,n=null;function s(u,f=!1){return u==null?null:f?a(u):r(u)}function r(u){if(u&&u.isTexture){let f=u.mapping;if(f===Ao||f===Po)if(e.has(u)){let m=e.get(u).texture;return o(m,u.mapping)}else{let m=u.image;if(m&&m.height>0){let _=new xc(m.height);return _.fromEquirectangularTexture(i,u),e.set(u,_),u.addEventListener("dispose",l),o(_.texture,u.mapping)}else return null}}return u}function a(u){if(u&&u.isTexture){let f=u.mapping,m=f===Ao||f===Po,_=f===Pi||f===ji;if(m||_){let g=t.get(u),p=g!==void 0?g.texture.pmremVersion:0;if(u.isRenderTargetTexture&&u.pmremVersion!==p)return n===null&&(n=new gc(i)),g=m?n.fromEquirectangular(u,g):n.fromCubemap(u,g),g.texture.pmremVersion=u.pmremVersion,t.set(u,g),g.texture;if(g!==void 0)return g.texture;{let b=u.image;return m&&b&&b.height>0||_&&b&&c(b)?(n===null&&(n=new gc(i)),g=m?n.fromEquirectangular(u):n.fromCubemap(u),g.texture.pmremVersion=u.pmremVersion,t.set(u,g),u.addEventListener("dispose",h),g.texture):null}}}return u}function o(u,f){return f===Ao?u.mapping=Pi:f===Po&&(u.mapping=ji),u}function c(u){let f=0,m=6;for(let _=0;_<m;_++)u[_]!==void 0&&f++;return f===m}function l(u){let f=u.target;f.removeEventListener("dispose",l);let m=e.get(f);m!==void 0&&(e.delete(f),m.dispose())}function h(u){let f=u.target;f.removeEventListener("dispose",h);let m=t.get(f);m!==void 0&&(t.delete(f),m.dispose())}function d(){e=new WeakMap,t=new WeakMap,n!==null&&(n.dispose(),n=null)}return{get:s,dispose:d}}function E0(i){let e={};function t(n){if(e[n]!==void 0)return e[n];let s=i.getExtension(n);return e[n]=s,s}return{has:function(n){return t(n)!==null},init:function(){t("EXT_color_buffer_float"),t("WEBGL_clip_cull_distance"),t("OES_texture_float_linear"),t("EXT_color_buffer_half_float"),t("WEBGL_multisampled_render_to_texture"),t("WEBGL_render_shared_exponent")},get:function(n){let s=t(n);return s===null&&qi("WebGLRenderer: "+n+" extension not supported."),s}}}function w0(i,e,t,n){let s={},r=new WeakMap;function a(d){let u=d.target;u.index!==null&&e.remove(u.index);for(let m in u.attributes)e.remove(u.attributes[m]);u.removeEventListener("dispose",a),delete s[u.id];let f=r.get(u);f&&(e.remove(f),r.delete(u)),n.releaseStatesOfGeometry(u),u.isInstancedBufferGeometry===!0&&delete u._maxInstanceCount,t.memory.geometries--}function o(d,u){return s[u.id]===!0||(u.addEventListener("dispose",a),s[u.id]=!0,t.memory.geometries++),u}function c(d){let u=d.attributes;for(let f in u)e.update(u[f],i.ARRAY_BUFFER)}function l(d){let u=[],f=d.index,m=d.attributes.position,_=0;if(m===void 0)return;if(f!==null){let b=f.array;_=f.version;for(let E=0,v=b.length;E<v;E+=3){let A=b[E+0],M=b[E+1],w=b[E+2];u.push(A,M,M,w,w,A)}}else{let b=m.array;_=m.version;for(let E=0,v=b.length/3-1;E<v;E+=3){let A=E+0,M=E+1,w=E+2;u.push(A,M,M,w,w,A)}}let g=new(m.count>=65535?hr:lr)(u,1);g.version=_;let p=r.get(d);p&&e.remove(p),r.set(d,g)}function h(d){let u=r.get(d);if(u){let f=d.index;f!==null&&u.version<f.version&&l(d)}else l(d);return r.get(d)}return{get:o,update:c,getWireframeAttribute:h}}function T0(i,e,t){let n;function s(d){n=d}let r,a;function o(d){r=d.type,a=d.bytesPerElement}function c(d,u){i.drawElements(n,u,r,d*a),t.update(u,n,1)}function l(d,u,f){f!==0&&(i.drawElementsInstanced(n,u,r,d*a,f),t.update(u,n,f))}function h(d,u,f){if(f===0)return;e.get("WEBGL_multi_draw").multiDrawElementsWEBGL(n,u,0,r,d,0,f);let _=0;for(let g=0;g<f;g++)_+=u[g];t.update(_,n,1)}this.setMode=s,this.setIndex=o,this.render=c,this.renderInstances=l,this.renderMultiDraw=h}function A0(i){let e={geometries:0,textures:0},t={frame:0,calls:0,triangles:0,points:0,lines:0};function n(r,a,o){switch(t.calls++,a){case i.TRIANGLES:t.triangles+=o*(r/3);break;case i.LINES:t.lines+=o*(r/2);break;case i.LINE_STRIP:t.lines+=o*(r-1);break;case i.LINE_LOOP:t.lines+=o*r;break;case i.POINTS:t.points+=o*r;break;default:Ie("WebGLInfo: Unknown draw mode:",a);break}}function s(){t.calls=0,t.triangles=0,t.points=0,t.lines=0}return{memory:e,render:t,programs:null,autoReset:!0,reset:s,update:n}}function P0(i,e,t){let n=new WeakMap,s=new tt;function r(a,o,c){let l=a.morphTargetInfluences,h=o.morphAttributes.position||o.morphAttributes.normal||o.morphAttributes.color,d=h!==void 0?h.length:0,u=n.get(o);if(u===void 0||u.count!==d){let R=function(){x.dispose(),n.delete(o),o.removeEventListener("dispose",R)};var f=R;u!==void 0&&u.texture.dispose();let m=o.morphAttributes.position!==void 0,_=o.morphAttributes.normal!==void 0,g=o.morphAttributes.color!==void 0,p=o.morphAttributes.position||[],b=o.morphAttributes.normal||[],E=o.morphAttributes.color||[],v=0;m===!0&&(v=1),_===!0&&(v=2),g===!0&&(v=3);let A=o.attributes.position.count*v,M=1;A>e.maxTextureSize&&(M=Math.ceil(A/e.maxTextureSize),A=e.maxTextureSize);let w=new Float32Array(A*M*4*d),x=new ar(w,A,M,d);x.type=Cn,x.needsUpdate=!0;let T=v*4;for(let C=0;C<d;C++){let D=p[C],I=b[C],V=E[C],F=A*M*4*C;for(let X=0;X<D.count;X++){let B=X*T;m===!0&&(s.fromBufferAttribute(D,X),w[F+B+0]=s.x,w[F+B+1]=s.y,w[F+B+2]=s.z,w[F+B+3]=0),_===!0&&(s.fromBufferAttribute(I,X),w[F+B+4]=s.x,w[F+B+5]=s.y,w[F+B+6]=s.z,w[F+B+7]=0),g===!0&&(s.fromBufferAttribute(V,X),w[F+B+8]=s.x,w[F+B+9]=s.y,w[F+B+10]=s.z,w[F+B+11]=V.itemSize===4?s.w:1)}}u={count:d,texture:x,size:new _e(A,M)},n.set(o,u),o.addEventListener("dispose",R)}if(a.isInstancedMesh===!0&&a.morphTexture!==null)c.getUniforms().setValue(i,"morphTexture",a.morphTexture,t);else{let m=0;for(let g=0;g<l.length;g++)m+=l[g];let _=o.morphTargetsRelative?1:1-m;c.getUniforms().setValue(i,"morphTargetBaseInfluence",_),c.getUniforms().setValue(i,"morphTargetInfluences",l)}c.getUniforms().setValue(i,"morphTargetsTexture",u.texture,t),c.getUniforms().setValue(i,"morphTargetsTextureSize",u.size)}return{update:r}}function C0(i,e,t,n,s){let r=new WeakMap;function a(l){let h=s.render.frame,d=l.geometry,u=e.get(l,d);if(r.get(u)!==h&&(e.update(u),r.set(u,h)),l.isInstancedMesh&&(l.hasEventListener("dispose",c)===!1&&l.addEventListener("dispose",c),r.get(l)!==h&&(t.update(l.instanceMatrix,i.ARRAY_BUFFER),l.instanceColor!==null&&t.update(l.instanceColor,i.ARRAY_BUFFER),r.set(l,h))),l.isSkinnedMesh){let f=l.skeleton;r.get(f)!==h&&(f.update(),r.set(f,h))}return u}function o(){r=new WeakMap}function c(l){let h=l.target;h.removeEventListener("dispose",c),n.releaseStatesOfObject(h),t.remove(h.instanceMatrix),h.instanceColor!==null&&t.remove(h.instanceColor)}return{update:a,dispose:o}}var R0={[Fl]:"LINEAR_TONE_MAPPING",[Ul]:"REINHARD_TONE_MAPPING",[Nl]:"CINEON_TONE_MAPPING",[Ol]:"ACES_FILMIC_TONE_MAPPING",[zl]:"AGX_TONE_MAPPING",[Vl]:"NEUTRAL_TONE_MAPPING",[Bl]:"CUSTOM_TONE_MAPPING"};function I0(i,e,t,n,s,r){let a=new cn(e,t,{type:i,depthBuffer:s,stencilBuffer:r,samples:n?4:0,depthTexture:s?new ii(e,t):void 0}),o=new cn(e,t,{type:Gn,depthBuffer:!1,stencilBuffer:!1}),c=new Nt;c.setAttribute("position",new lt([-1,3,0,-1,-1,0,3,-1,0],3)),c.setAttribute("uv",new lt([0,2,0,0,2,0],2));let l=new lo({uniforms:{tDiffuse:{value:null}},vertexShader:`
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
			}`,depthTest:!1,depthWrite:!1}),h=new Ot(c,l),d=new Ji(-1,1,1,-1,0,1),u=null,f=null,m=!1,_,g=null,p=[],b=!1;this.setSize=function(E,v){a.setSize(E,v),o.setSize(E,v);for(let A=0;A<p.length;A++){let M=p[A];M.setSize&&M.setSize(E,v)}},this.setEffects=function(E){p=E,b=p.length>0&&p[0].isRenderPass===!0;let v=a.width,A=a.height;for(let M=0;M<p.length;M++){let w=p[M];w.setSize&&w.setSize(v,A)}},this.begin=function(E,v){if(m||E.toneMapping===An&&p.length===0)return!1;if(g=v,v!==null){let A=v.width,M=v.height;(a.width!==A||a.height!==M)&&this.setSize(A,M)}return b===!1&&E.setRenderTarget(a),_=E.toneMapping,E.toneMapping=An,!0},this.hasRenderPass=function(){return b},this.end=function(E,v){E.toneMapping=_,m=!0;let A=a,M=o;for(let w=0;w<p.length;w++){let x=p[w];if(x.enabled!==!1&&(x.render(E,M,A,v),x.needsSwap!==!1)){let T=A;A=M,M=T}}if(u!==E.outputColorSpace||f!==E.toneMapping){u=E.outputColorSpace,f=E.toneMapping,l.defines={},We.getTransfer(u)===je&&(l.defines.SRGB_TRANSFER="");let w=R0[f];w&&(l.defines[w]=""),l.needsUpdate=!0}l.uniforms.tDiffuse.value=A.texture,E.setRenderTarget(g),E.render(h,d),g=null,m=!1},this.isCompositing=function(){return m},this.dispose=function(){a.depthTexture&&a.depthTexture.dispose(),a.dispose(),o.dispose(),c.dispose(),l.dispose()}}var tf=new tn,mh=new ii(1,1),nf=new ar,sf=new Za,rf=new pr,Nd=[],Od=[],Bd=new Float32Array(16),zd=new Float32Array(9),Vd=new Float32Array(4);function Os(i,e,t){let n=i[0];if(n<=0||n>0)return i;let s=e*t,r=Nd[s];if(r===void 0&&(r=new Float32Array(s),Nd[s]=r),e!==0){n.toArray(r,0);for(let a=1,o=0;a!==e;++a)o+=t,i[a].toArray(r,o)}return r}function Pt(i,e){if(i.length!==e.length)return!1;for(let t=0,n=i.length;t<n;t++)if(i[t]!==e[t])return!1;return!0}function Ct(i,e){for(let t=0,n=e.length;t<n;t++)i[t]=e[t]}function vc(i,e){let t=Od[e];t===void 0&&(t=new Int32Array(e),Od[e]=t);for(let n=0;n!==e;++n)t[n]=i.allocateTextureUnit();return t}function L0(i,e){let t=this.cache;t[0]!==e&&(i.uniform1f(this.addr,e),t[0]=e)}function D0(i,e){let t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y)&&(i.uniform2f(this.addr,e.x,e.y),t[0]=e.x,t[1]=e.y);else{if(Pt(t,e))return;i.uniform2fv(this.addr,e),Ct(t,e)}}function F0(i,e){let t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z)&&(i.uniform3f(this.addr,e.x,e.y,e.z),t[0]=e.x,t[1]=e.y,t[2]=e.z);else if(e.r!==void 0)(t[0]!==e.r||t[1]!==e.g||t[2]!==e.b)&&(i.uniform3f(this.addr,e.r,e.g,e.b),t[0]=e.r,t[1]=e.g,t[2]=e.b);else{if(Pt(t,e))return;i.uniform3fv(this.addr,e),Ct(t,e)}}function U0(i,e){let t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z||t[3]!==e.w)&&(i.uniform4f(this.addr,e.x,e.y,e.z,e.w),t[0]=e.x,t[1]=e.y,t[2]=e.z,t[3]=e.w);else{if(Pt(t,e))return;i.uniform4fv(this.addr,e),Ct(t,e)}}function N0(i,e){let t=this.cache,n=e.elements;if(n===void 0){if(Pt(t,e))return;i.uniformMatrix2fv(this.addr,!1,e),Ct(t,e)}else{if(Pt(t,n))return;Vd.set(n),i.uniformMatrix2fv(this.addr,!1,Vd),Ct(t,n)}}function O0(i,e){let t=this.cache,n=e.elements;if(n===void 0){if(Pt(t,e))return;i.uniformMatrix3fv(this.addr,!1,e),Ct(t,e)}else{if(Pt(t,n))return;zd.set(n),i.uniformMatrix3fv(this.addr,!1,zd),Ct(t,n)}}function B0(i,e){let t=this.cache,n=e.elements;if(n===void 0){if(Pt(t,e))return;i.uniformMatrix4fv(this.addr,!1,e),Ct(t,e)}else{if(Pt(t,n))return;Bd.set(n),i.uniformMatrix4fv(this.addr,!1,Bd),Ct(t,n)}}function z0(i,e){let t=this.cache;t[0]!==e&&(i.uniform1i(this.addr,e),t[0]=e)}function V0(i,e){let t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y)&&(i.uniform2i(this.addr,e.x,e.y),t[0]=e.x,t[1]=e.y);else{if(Pt(t,e))return;i.uniform2iv(this.addr,e),Ct(t,e)}}function k0(i,e){let t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z)&&(i.uniform3i(this.addr,e.x,e.y,e.z),t[0]=e.x,t[1]=e.y,t[2]=e.z);else{if(Pt(t,e))return;i.uniform3iv(this.addr,e),Ct(t,e)}}function H0(i,e){let t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z||t[3]!==e.w)&&(i.uniform4i(this.addr,e.x,e.y,e.z,e.w),t[0]=e.x,t[1]=e.y,t[2]=e.z,t[3]=e.w);else{if(Pt(t,e))return;i.uniform4iv(this.addr,e),Ct(t,e)}}function G0(i,e){let t=this.cache;t[0]!==e&&(i.uniform1ui(this.addr,e),t[0]=e)}function W0(i,e){let t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y)&&(i.uniform2ui(this.addr,e.x,e.y),t[0]=e.x,t[1]=e.y);else{if(Pt(t,e))return;i.uniform2uiv(this.addr,e),Ct(t,e)}}function X0(i,e){let t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z)&&(i.uniform3ui(this.addr,e.x,e.y,e.z),t[0]=e.x,t[1]=e.y,t[2]=e.z);else{if(Pt(t,e))return;i.uniform3uiv(this.addr,e),Ct(t,e)}}function q0(i,e){let t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z||t[3]!==e.w)&&(i.uniform4ui(this.addr,e.x,e.y,e.z,e.w),t[0]=e.x,t[1]=e.y,t[2]=e.z,t[3]=e.w);else{if(Pt(t,e))return;i.uniform4uiv(this.addr,e),Ct(t,e)}}function Y0(i,e,t){let n=this.cache,s=t.allocateTextureUnit();n[0]!==s&&(i.uniform1i(this.addr,s),n[0]=s);let r;this.type===i.SAMPLER_2D_SHADOW?(mh.compareFunction=t.isReversedDepthBuffer()?fc:dc,r=mh):r=tf,t.setTexture2D(e||r,s)}function $0(i,e,t){let n=this.cache,s=t.allocateTextureUnit();n[0]!==s&&(i.uniform1i(this.addr,s),n[0]=s),t.setTexture3D(e||sf,s)}function K0(i,e,t){let n=this.cache,s=t.allocateTextureUnit();n[0]!==s&&(i.uniform1i(this.addr,s),n[0]=s),t.setTextureCube(e||rf,s)}function Z0(i,e,t){let n=this.cache,s=t.allocateTextureUnit();n[0]!==s&&(i.uniform1i(this.addr,s),n[0]=s),t.setTexture2DArray(e||nf,s)}function J0(i){switch(i){case 5126:return L0;case 35664:return D0;case 35665:return F0;case 35666:return U0;case 35674:return N0;case 35675:return O0;case 35676:return B0;case 5124:case 35670:return z0;case 35667:case 35671:return V0;case 35668:case 35672:return k0;case 35669:case 35673:return H0;case 5125:return G0;case 36294:return W0;case 36295:return X0;case 36296:return q0;case 35678:case 36198:case 36298:case 36306:case 35682:return Y0;case 35679:case 36299:case 36307:return $0;case 35680:case 36300:case 36308:case 36293:return K0;case 36289:case 36303:case 36311:case 36292:return Z0}}function j0(i,e){i.uniform1fv(this.addr,e)}function Q0(i,e){let t=Os(e,this.size,2);i.uniform2fv(this.addr,t)}function e_(i,e){let t=Os(e,this.size,3);i.uniform3fv(this.addr,t)}function t_(i,e){let t=Os(e,this.size,4);i.uniform4fv(this.addr,t)}function n_(i,e){let t=Os(e,this.size,4);i.uniformMatrix2fv(this.addr,!1,t)}function i_(i,e){let t=Os(e,this.size,9);i.uniformMatrix3fv(this.addr,!1,t)}function s_(i,e){let t=Os(e,this.size,16);i.uniformMatrix4fv(this.addr,!1,t)}function r_(i,e){i.uniform1iv(this.addr,e)}function a_(i,e){i.uniform2iv(this.addr,e)}function o_(i,e){i.uniform3iv(this.addr,e)}function c_(i,e){i.uniform4iv(this.addr,e)}function l_(i,e){i.uniform1uiv(this.addr,e)}function h_(i,e){i.uniform2uiv(this.addr,e)}function u_(i,e){i.uniform3uiv(this.addr,e)}function d_(i,e){i.uniform4uiv(this.addr,e)}function f_(i,e,t){let n=this.cache,s=e.length,r=vc(t,s);Pt(n,r)||(i.uniform1iv(this.addr,r),Ct(n,r));let a;this.type===i.SAMPLER_2D_SHADOW?a=mh:a=tf;for(let o=0;o!==s;++o)t.setTexture2D(e[o]||a,r[o])}function p_(i,e,t){let n=this.cache,s=e.length,r=vc(t,s);Pt(n,r)||(i.uniform1iv(this.addr,r),Ct(n,r));for(let a=0;a!==s;++a)t.setTexture3D(e[a]||sf,r[a])}function m_(i,e,t){let n=this.cache,s=e.length,r=vc(t,s);Pt(n,r)||(i.uniform1iv(this.addr,r),Ct(n,r));for(let a=0;a!==s;++a)t.setTextureCube(e[a]||rf,r[a])}function g_(i,e,t){let n=this.cache,s=e.length,r=vc(t,s);Pt(n,r)||(i.uniform1iv(this.addr,r),Ct(n,r));for(let a=0;a!==s;++a)t.setTexture2DArray(e[a]||nf,r[a])}function x_(i){switch(i){case 5126:return j0;case 35664:return Q0;case 35665:return e_;case 35666:return t_;case 35674:return n_;case 35675:return i_;case 35676:return s_;case 5124:case 35670:return r_;case 35667:case 35671:return a_;case 35668:case 35672:return o_;case 35669:case 35673:return c_;case 5125:return l_;case 36294:return h_;case 36295:return u_;case 36296:return d_;case 35678:case 36198:case 36298:case 36306:case 35682:return f_;case 35679:case 36299:case 36307:return p_;case 35680:case 36300:case 36308:case 36293:return m_;case 36289:case 36303:case 36311:case 36292:return g_}}var gh=class{constructor(e,t,n){this.id=e,this.addr=n,this.cache=[],this.type=t.type,this.setValue=J0(t.type)}},xh=class{constructor(e,t,n){this.id=e,this.addr=n,this.cache=[],this.type=t.type,this.size=t.size,this.setValue=x_(t.type)}},_h=class{constructor(e){this.id=e,this.seq=[],this.map={}}setValue(e,t,n){let s=this.seq;for(let r=0,a=s.length;r!==a;++r){let o=s[r];o.setValue(e,t[o.id],n)}}},fh=/(\w+)(\])?(\[|\.)?/g;function kd(i,e){i.seq.push(e),i.map[e.id]=e}function __(i,e,t){let n=i.name,s=n.length;for(fh.lastIndex=0;;){let r=fh.exec(n),a=fh.lastIndex,o=r[1],c=r[2]==="]",l=r[3];if(c&&(o=o|0),l===void 0||l==="["&&a+2===s){kd(t,l===void 0?new gh(o,i,e):new xh(o,i,e));break}else{let d=t.map[o];d===void 0&&(d=new _h(o),kd(t,d)),t=d}}}var Ns=class{constructor(e,t){this.seq=[],this.map={};let n=e.getProgramParameter(t,e.ACTIVE_UNIFORMS);for(let a=0;a<n;++a){let o=e.getActiveUniform(t,a),c=e.getUniformLocation(t,o.name);__(o,c,this)}let s=[],r=[];for(let a of this.seq)a.type===e.SAMPLER_2D_SHADOW||a.type===e.SAMPLER_CUBE_SHADOW||a.type===e.SAMPLER_2D_ARRAY_SHADOW?s.push(a):r.push(a);s.length>0&&(this.seq=s.concat(r))}setValue(e,t,n,s){let r=this.map[t];r!==void 0&&r.setValue(e,n,s)}setOptional(e,t,n){let s=t[n];s!==void 0&&this.setValue(e,n,s)}static upload(e,t,n,s){for(let r=0,a=t.length;r!==a;++r){let o=t[r],c=n[o.id];c.needsUpdate!==!1&&o.setValue(e,c.value,s)}}static seqWithValue(e,t){let n=[];for(let s=0,r=e.length;s!==r;++s){let a=e[s];a.id in t&&n.push(a)}return n}};function Hd(i,e,t){let n=i.createShader(e);return i.shaderSource(n,t),i.compileShader(n),n}var y_=37297,v_=0;function b_(i,e){let t=i.split(`
`),n=[],s=Math.max(e-6,0),r=Math.min(e+6,t.length);for(let a=s;a<r;a++){let o=a+1;n.push(`${o===e?">":" "} ${o}: ${t[a]}`)}return n.join(`
`)}var Gd=new De;function S_(i){We._getMatrix(Gd,We.workingColorSpace,i);let e=`mat3( ${Gd.elements.map(t=>t.toFixed(4))} )`;switch(We.getTransfer(i)){case nr:return[e,"LinearTransferOETF"];case je:return[e,"sRGBTransferOETF"];default:return Pe("WebGLProgram: Unsupported color space: ",i),[e,"LinearTransferOETF"]}}function Wd(i,e,t){let n=i.getShaderParameter(e,i.COMPILE_STATUS),r=(i.getShaderInfoLog(e)||"").trim();if(n&&r==="")return"";let a=/ERROR: 0:(\d+)/.exec(r);if(a){let o=parseInt(a[1]);return t.toUpperCase()+`

`+r+`

`+b_(i.getShaderSource(e),o)}else return r}function M_(i,e){let t=S_(e);return[`vec4 ${i}( vec4 value ) {`,`	return ${t[1]}( vec4( value.rgb * ${t[0]}, value.a ) );`,"}"].join(`
`)}var E_={[Fl]:"Linear",[Ul]:"Reinhard",[Nl]:"Cineon",[Ol]:"ACESFilmic",[zl]:"AgX",[Vl]:"Neutral",[Bl]:"Custom"};function w_(i,e){let t=E_[e];return t===void 0?(Pe("WebGLProgram: Unsupported toneMapping:",e),"vec3 "+i+"( vec3 color ) { return LinearToneMapping( color ); }"):"vec3 "+i+"( vec3 color ) { return "+t+"ToneMapping( color ); }"}var mc=new L;function T_(){We.getLuminanceCoefficients(mc);let i=mc.x.toFixed(4),e=mc.y.toFixed(4),t=mc.z.toFixed(4);return["float luminance( const in vec3 rgb ) {",`	const vec3 weights = vec3( ${i}, ${e}, ${t} );`,"	return dot( weights, rgb );","}"].join(`
`)}function A_(i){return[i.extensionClipCullDistance?"#extension GL_ANGLE_clip_cull_distance : require":"",i.extensionMultiDraw?"#extension GL_ANGLE_multi_draw : require":""].filter(Gr).join(`
`)}function P_(i){let e=[];for(let t in i){let n=i[t];n!==!1&&e.push("#define "+t+" "+n)}return e.join(`
`)}function C_(i,e){let t={},n=i.getProgramParameter(e,i.ACTIVE_ATTRIBUTES);for(let s=0;s<n;s++){let r=i.getActiveAttrib(e,s),a=r.name,o=1;r.type===i.FLOAT_MAT2&&(o=2),r.type===i.FLOAT_MAT3&&(o=3),r.type===i.FLOAT_MAT4&&(o=4),t[a]={type:r.type,location:i.getAttribLocation(e,a),locationSize:o}}return t}function Gr(i){return i!==""}function Xd(i,e){let t=e.numSpotLightShadows+e.numSpotLightMaps-e.numSpotLightShadowsWithMaps;return i.replace(/NUM_DIR_LIGHTS/g,e.numDirLights).replace(/NUM_SPOT_LIGHTS/g,e.numSpotLights).replace(/NUM_SPOT_LIGHT_MAPS/g,e.numSpotLightMaps).replace(/NUM_SPOT_LIGHT_COORDS/g,t).replace(/NUM_RECT_AREA_LIGHTS/g,e.numRectAreaLights).replace(/NUM_POINT_LIGHTS/g,e.numPointLights).replace(/NUM_HEMI_LIGHTS/g,e.numHemiLights).replace(/NUM_DIR_LIGHT_SHADOWS/g,e.numDirLightShadows).replace(/NUM_SPOT_LIGHT_SHADOWS_WITH_MAPS/g,e.numSpotLightShadowsWithMaps).replace(/NUM_SPOT_LIGHT_SHADOWS/g,e.numSpotLightShadows).replace(/NUM_POINT_LIGHT_SHADOWS/g,e.numPointLightShadows)}function qd(i,e){return i.replace(/NUM_CLIPPING_PLANES/g,e.numClippingPlanes).replace(/UNION_CLIPPING_PLANES/g,e.numClippingPlanes-e.numClipIntersection)}var R_=/^[ \t]*#include +<([\w\d./]+)>/gm;function yh(i){return i.replace(R_,L_)}var I_=new Map;function L_(i,e){let t=ke[e];if(t===void 0){let n=I_.get(e);if(n!==void 0)t=ke[n],Pe('WebGLRenderer: Shader chunk "%s" has been deprecated. Use "%s" instead.',e,n);else throw new Error("THREE.WebGLProgram: Can not resolve #include <"+e+">")}return yh(t)}var D_=/#pragma unroll_loop_start\s+for\s*\(\s*int\s+i\s*=\s*(\d+)\s*;\s*i\s*<\s*(\d+)\s*;\s*i\s*\+\+\s*\)\s*{([\s\S]+?)}\s+#pragma unroll_loop_end/g;function Yd(i){return i.replace(D_,F_)}function F_(i,e,t,n){let s="";for(let r=parseInt(e);r<parseInt(t);r++)s+=n.replace(/\[\s*i\s*\]/g,"[ "+r+" ]").replace(/UNROLLED_LOOP_INDEX/g,r);return s}function $d(i){let e=`precision ${i.precision} float;
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
#define LOW_PRECISION`),e}var U_={[Ir]:"SHADOWMAP_TYPE_PCF",[Ls]:"SHADOWMAP_TYPE_VSM"};function N_(i){return U_[i.shadowMapType]||"SHADOWMAP_TYPE_BASIC"}var O_={[Pi]:"ENVMAP_TYPE_CUBE",[ji]:"ENVMAP_TYPE_CUBE",[Lr]:"ENVMAP_TYPE_CUBE_UV"};function B_(i){return i.envMap===!1?"ENVMAP_TYPE_CUBE":O_[i.envMapMode]||"ENVMAP_TYPE_CUBE"}var z_={[ji]:"ENVMAP_MODE_REFRACTION"};function V_(i){return i.envMap===!1?"ENVMAP_MODE_REFLECTION":z_[i.envMapMode]||"ENVMAP_MODE_REFLECTION"}var k_={[Dl]:"ENVMAP_BLENDING_MULTIPLY",[hd]:"ENVMAP_BLENDING_MIX",[ud]:"ENVMAP_BLENDING_ADD"};function H_(i){return i.envMap===!1?"ENVMAP_BLENDING_NONE":k_[i.combine]||"ENVMAP_BLENDING_NONE"}function G_(i){let e=i.envMapCubeUVHeight;if(e===null)return null;let t=Math.log2(e)-2,n=1/e;return{texelWidth:1/(3*Math.max(Math.pow(2,t),7*16)),texelHeight:n,maxMip:t}}function W_(i,e,t,n){let s=i.getContext(),r=t.defines,a=t.vertexShader,o=t.fragmentShader,c=N_(t),l=B_(t),h=V_(t),d=H_(t),u=G_(t),f=A_(t),m=P_(r),_=s.createProgram(),g,p,b=t.glslVersion?"#version "+t.glslVersion+`
`:"";t.isRawShaderMaterial?(g=["#define SHADER_TYPE "+t.shaderType,"#define SHADER_NAME "+t.shaderName,m].filter(Gr).join(`
`),g.length>0&&(g+=`
`),p=["#define SHADER_TYPE "+t.shaderType,"#define SHADER_NAME "+t.shaderName,m].filter(Gr).join(`
`),p.length>0&&(p+=`
`)):(g=[$d(t),"#define SHADER_TYPE "+t.shaderType,"#define SHADER_NAME "+t.shaderName,m,t.extensionClipCullDistance?"#define USE_CLIP_DISTANCE":"",t.batching?"#define USE_BATCHING":"",t.batchingColor?"#define USE_BATCHING_COLOR":"",t.instancing?"#define USE_INSTANCING":"",t.instancingColor?"#define USE_INSTANCING_COLOR":"",t.instancingMorph?"#define USE_INSTANCING_MORPH":"",t.useFog&&t.fog?"#define USE_FOG":"",t.useFog&&t.fogExp2?"#define FOG_EXP2":"",t.map?"#define USE_MAP":"",t.envMap?"#define USE_ENVMAP":"",t.envMap?"#define "+h:"",t.lightMap?"#define USE_LIGHTMAP":"",t.aoMap?"#define USE_AOMAP":"",t.bumpMap?"#define USE_BUMPMAP":"",t.normalMap?"#define USE_NORMALMAP":"",t.normalMapObjectSpace?"#define USE_NORMALMAP_OBJECTSPACE":"",t.normalMapTangentSpace?"#define USE_NORMALMAP_TANGENTSPACE":"",t.displacementMap?"#define USE_DISPLACEMENTMAP":"",t.emissiveMap?"#define USE_EMISSIVEMAP":"",t.anisotropy?"#define USE_ANISOTROPY":"",t.anisotropyMap?"#define USE_ANISOTROPYMAP":"",t.clearcoatMap?"#define USE_CLEARCOATMAP":"",t.clearcoatRoughnessMap?"#define USE_CLEARCOAT_ROUGHNESSMAP":"",t.clearcoatNormalMap?"#define USE_CLEARCOAT_NORMALMAP":"",t.iridescenceMap?"#define USE_IRIDESCENCEMAP":"",t.iridescenceThicknessMap?"#define USE_IRIDESCENCE_THICKNESSMAP":"",t.specularMap?"#define USE_SPECULARMAP":"",t.specularColorMap?"#define USE_SPECULAR_COLORMAP":"",t.specularIntensityMap?"#define USE_SPECULAR_INTENSITYMAP":"",t.roughnessMap?"#define USE_ROUGHNESSMAP":"",t.metalnessMap?"#define USE_METALNESSMAP":"",t.alphaMap?"#define USE_ALPHAMAP":"",t.alphaHash?"#define USE_ALPHAHASH":"",t.transmission?"#define USE_TRANSMISSION":"",t.transmissionMap?"#define USE_TRANSMISSIONMAP":"",t.thicknessMap?"#define USE_THICKNESSMAP":"",t.sheenColorMap?"#define USE_SHEEN_COLORMAP":"",t.sheenRoughnessMap?"#define USE_SHEEN_ROUGHNESSMAP":"",t.mapUv?"#define MAP_UV "+t.mapUv:"",t.alphaMapUv?"#define ALPHAMAP_UV "+t.alphaMapUv:"",t.lightMapUv?"#define LIGHTMAP_UV "+t.lightMapUv:"",t.aoMapUv?"#define AOMAP_UV "+t.aoMapUv:"",t.emissiveMapUv?"#define EMISSIVEMAP_UV "+t.emissiveMapUv:"",t.bumpMapUv?"#define BUMPMAP_UV "+t.bumpMapUv:"",t.normalMapUv?"#define NORMALMAP_UV "+t.normalMapUv:"",t.displacementMapUv?"#define DISPLACEMENTMAP_UV "+t.displacementMapUv:"",t.metalnessMapUv?"#define METALNESSMAP_UV "+t.metalnessMapUv:"",t.roughnessMapUv?"#define ROUGHNESSMAP_UV "+t.roughnessMapUv:"",t.anisotropyMapUv?"#define ANISOTROPYMAP_UV "+t.anisotropyMapUv:"",t.clearcoatMapUv?"#define CLEARCOATMAP_UV "+t.clearcoatMapUv:"",t.clearcoatNormalMapUv?"#define CLEARCOAT_NORMALMAP_UV "+t.clearcoatNormalMapUv:"",t.clearcoatRoughnessMapUv?"#define CLEARCOAT_ROUGHNESSMAP_UV "+t.clearcoatRoughnessMapUv:"",t.iridescenceMapUv?"#define IRIDESCENCEMAP_UV "+t.iridescenceMapUv:"",t.iridescenceThicknessMapUv?"#define IRIDESCENCE_THICKNESSMAP_UV "+t.iridescenceThicknessMapUv:"",t.sheenColorMapUv?"#define SHEEN_COLORMAP_UV "+t.sheenColorMapUv:"",t.sheenRoughnessMapUv?"#define SHEEN_ROUGHNESSMAP_UV "+t.sheenRoughnessMapUv:"",t.specularMapUv?"#define SPECULARMAP_UV "+t.specularMapUv:"",t.specularColorMapUv?"#define SPECULAR_COLORMAP_UV "+t.specularColorMapUv:"",t.specularIntensityMapUv?"#define SPECULAR_INTENSITYMAP_UV "+t.specularIntensityMapUv:"",t.transmissionMapUv?"#define TRANSMISSIONMAP_UV "+t.transmissionMapUv:"",t.thicknessMapUv?"#define THICKNESSMAP_UV "+t.thicknessMapUv:"",t.vertexTangents&&t.flatShading===!1?"#define USE_TANGENT":"",t.vertexNormals?"#define HAS_NORMAL":"",t.vertexColors?"#define USE_COLOR":"",t.vertexAlphas?"#define USE_COLOR_ALPHA":"",t.vertexUv1s?"#define USE_UV1":"",t.vertexUv2s?"#define USE_UV2":"",t.vertexUv3s?"#define USE_UV3":"",t.pointsUvs?"#define USE_POINTS_UV":"",t.flatShading?"#define FLAT_SHADED":"",t.skinning?"#define USE_SKINNING":"",t.morphTargets?"#define USE_MORPHTARGETS":"",t.morphNormals&&t.flatShading===!1?"#define USE_MORPHNORMALS":"",t.morphColors?"#define USE_MORPHCOLORS":"",t.morphTargetsCount>0?"#define MORPHTARGETS_TEXTURE_STRIDE "+t.morphTextureStride:"",t.morphTargetsCount>0?"#define MORPHTARGETS_COUNT "+t.morphTargetsCount:"",t.doubleSided?"#define DOUBLE_SIDED":"",t.flipSided?"#define FLIP_SIDED":"",t.shadowMapEnabled?"#define USE_SHADOWMAP":"",t.shadowMapEnabled?"#define "+c:"",t.sizeAttenuation?"#define USE_SIZEATTENUATION":"",t.numLightProbes>0?"#define USE_LIGHT_PROBES":"",t.logarithmicDepthBuffer?"#define USE_LOGARITHMIC_DEPTH_BUFFER":"",t.reversedDepthBuffer?"#define USE_REVERSED_DEPTH_BUFFER":"","uniform mat4 modelMatrix;","uniform mat4 modelViewMatrix;","uniform mat4 projectionMatrix;","uniform mat4 viewMatrix;","uniform mat3 normalMatrix;","uniform vec3 cameraPosition;","uniform bool isOrthographic;","#ifdef USE_INSTANCING","	attribute mat4 instanceMatrix;","#endif","#ifdef USE_INSTANCING_COLOR","	attribute vec3 instanceColor;","#endif","#ifdef USE_INSTANCING_MORPH","	uniform sampler2D morphTexture;","#endif","attribute vec3 position;","attribute vec3 normal;","attribute vec2 uv;","#ifdef USE_UV1","	attribute vec2 uv1;","#endif","#ifdef USE_UV2","	attribute vec2 uv2;","#endif","#ifdef USE_UV3","	attribute vec2 uv3;","#endif","#ifdef USE_TANGENT","	attribute vec4 tangent;","#endif","#if defined( USE_COLOR_ALPHA )","	attribute vec4 color;","#elif defined( USE_COLOR )","	attribute vec3 color;","#endif","#ifdef USE_SKINNING","	attribute vec4 skinIndex;","	attribute vec4 skinWeight;","#endif",`
`].filter(Gr).join(`
`),p=[$d(t),"#define SHADER_TYPE "+t.shaderType,"#define SHADER_NAME "+t.shaderName,m,t.useFog&&t.fog?"#define USE_FOG":"",t.useFog&&t.fogExp2?"#define FOG_EXP2":"",t.alphaToCoverage?"#define ALPHA_TO_COVERAGE":"",t.map?"#define USE_MAP":"",t.matcap?"#define USE_MATCAP":"",t.envMap?"#define USE_ENVMAP":"",t.envMap?"#define "+l:"",t.envMap?"#define "+h:"",t.envMap?"#define "+d:"",u?"#define CUBEUV_TEXEL_WIDTH "+u.texelWidth:"",u?"#define CUBEUV_TEXEL_HEIGHT "+u.texelHeight:"",u?"#define CUBEUV_MAX_MIP "+u.maxMip+".0":"",t.lightMap?"#define USE_LIGHTMAP":"",t.aoMap?"#define USE_AOMAP":"",t.bumpMap?"#define USE_BUMPMAP":"",t.normalMap?"#define USE_NORMALMAP":"",t.normalMapObjectSpace?"#define USE_NORMALMAP_OBJECTSPACE":"",t.normalMapTangentSpace?"#define USE_NORMALMAP_TANGENTSPACE":"",t.packedNormalMap?"#define USE_PACKED_NORMALMAP":"",t.emissiveMap?"#define USE_EMISSIVEMAP":"",t.anisotropy?"#define USE_ANISOTROPY":"",t.anisotropyMap?"#define USE_ANISOTROPYMAP":"",t.clearcoat?"#define USE_CLEARCOAT":"",t.clearcoatMap?"#define USE_CLEARCOATMAP":"",t.clearcoatRoughnessMap?"#define USE_CLEARCOAT_ROUGHNESSMAP":"",t.clearcoatNormalMap?"#define USE_CLEARCOAT_NORMALMAP":"",t.dispersion?"#define USE_DISPERSION":"",t.iridescence?"#define USE_IRIDESCENCE":"",t.iridescenceMap?"#define USE_IRIDESCENCEMAP":"",t.iridescenceThicknessMap?"#define USE_IRIDESCENCE_THICKNESSMAP":"",t.specularMap?"#define USE_SPECULARMAP":"",t.specularColorMap?"#define USE_SPECULAR_COLORMAP":"",t.specularIntensityMap?"#define USE_SPECULAR_INTENSITYMAP":"",t.roughnessMap?"#define USE_ROUGHNESSMAP":"",t.metalnessMap?"#define USE_METALNESSMAP":"",t.alphaMap?"#define USE_ALPHAMAP":"",t.alphaTest?"#define USE_ALPHATEST":"",t.alphaHash?"#define USE_ALPHAHASH":"",t.sheen?"#define USE_SHEEN":"",t.sheenColorMap?"#define USE_SHEEN_COLORMAP":"",t.sheenRoughnessMap?"#define USE_SHEEN_ROUGHNESSMAP":"",t.transmission?"#define USE_TRANSMISSION":"",t.transmissionMap?"#define USE_TRANSMISSIONMAP":"",t.thicknessMap?"#define USE_THICKNESSMAP":"",t.vertexTangents&&t.flatShading===!1?"#define USE_TANGENT":"",t.vertexColors||t.instancingColor?"#define USE_COLOR":"",t.vertexAlphas||t.batchingColor?"#define USE_COLOR_ALPHA":"",t.vertexUv1s?"#define USE_UV1":"",t.vertexUv2s?"#define USE_UV2":"",t.vertexUv3s?"#define USE_UV3":"",t.pointsUvs?"#define USE_POINTS_UV":"",t.gradientMap?"#define USE_GRADIENTMAP":"",t.flatShading?"#define FLAT_SHADED":"",t.doubleSided?"#define DOUBLE_SIDED":"",t.flipSided?"#define FLIP_SIDED":"",t.shadowMapEnabled?"#define USE_SHADOWMAP":"",t.shadowMapEnabled?"#define "+c:"",t.premultipliedAlpha?"#define PREMULTIPLIED_ALPHA":"",t.numLightProbes>0?"#define USE_LIGHT_PROBES":"",t.numLightProbeGrids>0?"#define USE_LIGHT_PROBES_GRID":"",t.decodeVideoTexture?"#define DECODE_VIDEO_TEXTURE":"",t.decodeVideoTextureEmissive?"#define DECODE_VIDEO_TEXTURE_EMISSIVE":"",t.logarithmicDepthBuffer?"#define USE_LOGARITHMIC_DEPTH_BUFFER":"",t.reversedDepthBuffer?"#define USE_REVERSED_DEPTH_BUFFER":"","uniform mat4 viewMatrix;","uniform vec3 cameraPosition;","uniform bool isOrthographic;",t.toneMapping!==An?"#define TONE_MAPPING":"",t.toneMapping!==An?ke.tonemapping_pars_fragment:"",t.toneMapping!==An?w_("toneMapping",t.toneMapping):"",t.dithering?"#define DITHERING":"",t.opaque?"#define OPAQUE":"",ke.colorspace_pars_fragment,M_("linearToOutputTexel",t.outputColorSpace),T_(),t.useDepthPacking?"#define DEPTH_PACKING "+t.depthPacking:"",`
`].filter(Gr).join(`
`)),a=yh(a),a=Xd(a,t),a=qd(a,t),o=yh(o),o=Xd(o,t),o=qd(o,t),a=Yd(a),o=Yd(o),t.isRawShaderMaterial!==!0&&(b=`#version 300 es
`,g=[f,"#define attribute in","#define varying out","#define texture2D texture"].join(`
`)+`
`+g,p=["#define varying in",t.glslVersion===Zl?"":"layout(location = 0) out highp vec4 pc_fragColor;",t.glslVersion===Zl?"":"#define gl_FragColor pc_fragColor","#define gl_FragDepthEXT gl_FragDepth","#define texture2D texture","#define textureCube texture","#define texture2DProj textureProj","#define texture2DLodEXT textureLod","#define texture2DProjLodEXT textureProjLod","#define textureCubeLodEXT textureLod","#define texture2DGradEXT textureGrad","#define texture2DProjGradEXT textureProjGrad","#define textureCubeGradEXT textureGrad"].join(`
`)+`
`+p);let E=b+g+a,v=b+p+o,A=Hd(s,s.VERTEX_SHADER,E),M=Hd(s,s.FRAGMENT_SHADER,v);s.attachShader(_,A),s.attachShader(_,M),t.index0AttributeName!==void 0?s.bindAttribLocation(_,0,t.index0AttributeName):t.hasPositionAttribute===!0&&s.bindAttribLocation(_,0,"position"),s.linkProgram(_);function w(C){if(i.debug.checkShaderErrors){let D=s.getProgramInfoLog(_)||"",I=s.getShaderInfoLog(A)||"",V=s.getShaderInfoLog(M)||"",F=D.trim(),X=I.trim(),B=V.trim(),$=!0,J=!0;if(s.getProgramParameter(_,s.LINK_STATUS)===!1)if($=!1,typeof i.debug.onShaderError=="function")i.debug.onShaderError(s,_,A,M);else{let ne=Wd(s,A,"vertex"),de=Wd(s,M,"fragment");Ie("WebGLProgram: Shader Error "+s.getError()+" - VALIDATE_STATUS "+s.getProgramParameter(_,s.VALIDATE_STATUS)+`

Material Name: `+C.name+`
Material Type: `+C.type+`

Program Info Log: `+F+`
`+ne+`
`+de)}else F!==""?Pe("WebGLProgram: Program Info Log:",F):(X===""||B==="")&&(J=!1);J&&(C.diagnostics={runnable:$,programLog:F,vertexShader:{log:X,prefix:g},fragmentShader:{log:B,prefix:p}})}s.deleteShader(A),s.deleteShader(M),x=new Ns(s,_),T=C_(s,_)}let x;this.getUniforms=function(){return x===void 0&&w(this),x};let T;this.getAttributes=function(){return T===void 0&&w(this),T};let R=t.rendererExtensionParallelShaderCompile===!1;return this.isReady=function(){return R===!1&&(R=s.getProgramParameter(_,y_)),R},this.destroy=function(){n.releaseStatesOfProgram(this),s.deleteProgram(_),this.program=void 0},this.type=t.shaderType,this.name=t.shaderName,this.id=v_++,this.cacheKey=e,this.usedTimes=1,this.program=_,this.vertexShader=A,this.fragmentShader=M,this}var X_=0,vh=class{constructor(){this.shaderCache=new Map,this.materialCache=new Map}update(e,t,n){let s=this._getShaderCacheForMaterial(e);return s.has(t)===!1&&(s.add(t),t.usedTimes++),s.has(n)===!1&&(s.add(n),n.usedTimes++),this}remove(e){let t=this.materialCache.get(e);for(let n of t)n.usedTimes--,n.usedTimes===0&&this.shaderCache.delete(n.code);return this.materialCache.delete(e),this}getVertexShaderStage(e){return this._getShaderStage(e.vertexShader)}getFragmentShaderStage(e){return this._getShaderStage(e.fragmentShader)}dispose(){this.shaderCache.clear(),this.materialCache.clear()}_getShaderCacheForMaterial(e){let t=this.materialCache,n=t.get(e);return n===void 0&&(n=new Set,t.set(e,n)),n}_getShaderStage(e){let t=this.shaderCache,n=t.get(e);return n===void 0&&(n=new bh(e),t.set(e,n)),n}},bh=class{constructor(e){this.id=X_++,this.code=e,this.usedTimes=0}};function q_(i){return i===Ii||i===Br||i===zr}function Y_(i,e,t,n,s,r){let a=new or,o=new vh,c=new Set,l=[],h=new Map,d=n.logarithmicDepthBuffer,u=n.precision,f={MeshDepthMaterial:"depth",MeshDistanceMaterial:"distance",MeshNormalMaterial:"normal",MeshBasicMaterial:"basic",MeshLambertMaterial:"lambert",MeshPhongMaterial:"phong",MeshToonMaterial:"toon",MeshStandardMaterial:"physical",MeshPhysicalMaterial:"physical",MeshMatcapMaterial:"matcap",LineBasicMaterial:"basic",LineDashedMaterial:"dashed",PointsMaterial:"points",ShadowMaterial:"shadow",SpriteMaterial:"sprite"};function m(x){return c.add(x),x===0?"uv":`uv${x}`}function _(x,T,R,C,D,I){let V=C.fog,F=D.geometry,X=x.isMeshStandardMaterial||x.isMeshLambertMaterial||x.isMeshPhongMaterial?C.environment:null,B=x.isMeshStandardMaterial||x.isMeshLambertMaterial&&!x.envMap||x.isMeshPhongMaterial&&!x.envMap,$=e.get(x.envMap||X,B),J=$&&$.mapping===Lr?$.image.height:null,ne=f[x.type];x.precision!==null&&(u=n.getMaxPrecision(x.precision),u!==x.precision&&Pe("WebGLProgram.getParameters:",x.precision,"not supported, using",u,"instead."));let de=F.morphAttributes.position||F.morphAttributes.normal||F.morphAttributes.color,ve=de!==void 0?de.length:0,Ke=0;F.morphAttributes.position!==void 0&&(Ke=1),F.morphAttributes.normal!==void 0&&(Ke=2),F.morphAttributes.color!==void 0&&(Ke=3);let dt,Ze,j,ae;if(ne){let be=Zt[ne];dt=be.vertexShader,Ze=be.fragmentShader}else{dt=x.vertexShader,Ze=x.fragmentShader;let be=o.getVertexShaderStage(x),pt=o.getFragmentShaderStage(x);o.update(x,be,pt),j=be.id,ae=pt.id}let ee=i.getRenderTarget(),Le=i.state.buffers.depth.getReversed(),Ne=D.isInstancedMesh===!0,Ce=D.isBatchedMesh===!0,_t=!!x.map,Ge=!!x.matcap,it=!!$,Je=!!x.aoMap,Ye=!!x.lightMap,St=!!x.bumpMap&&x.wireframe===!1,Tt=!!x.normalMap,It=!!x.displacementMap,Ft=!!x.emissiveMap,ft=!!x.metalnessMap,Mt=!!x.roughnessMap,N=x.anisotropy>0,Jt=x.clearcoat>0,Qe=x.dispersion>0,P=x.iridescence>0,y=x.sheen>0,z=x.transmission>0,G=N&&!!x.anisotropyMap,q=Jt&&!!x.clearcoatMap,te=Jt&&!!x.clearcoatNormalMap,oe=Jt&&!!x.clearcoatRoughnessMap,Y=P&&!!x.iridescenceMap,Z=P&&!!x.iridescenceThicknessMap,ce=y&&!!x.sheenColorMap,Ee=y&&!!x.sheenRoughnessMap,ue=!!x.specularMap,le=!!x.specularColorMap,Ae=!!x.specularIntensityMap,Re=z&&!!x.transmissionMap,Oe=z&&!!x.thicknessMap,U=!!x.gradientMap,re=!!x.alphaMap,K=x.alphaTest>0,he=!!x.alphaHash,me=!!x.extensions,Q=An;x.toneMapped&&(ee===null||ee.isXRRenderTarget===!0)&&(Q=i.toneMapping);let Me={shaderID:ne,shaderType:x.type,shaderName:x.name,vertexShader:dt,fragmentShader:Ze,defines:x.defines,customVertexShaderID:j,customFragmentShaderID:ae,isRawShaderMaterial:x.isRawShaderMaterial===!0,glslVersion:x.glslVersion,precision:u,batching:Ce,batchingColor:Ce&&D._colorsTexture!==null,instancing:Ne,instancingColor:Ne&&D.instanceColor!==null,instancingMorph:Ne&&D.morphTexture!==null,outputColorSpace:ee===null?i.outputColorSpace:ee.isXRRenderTarget===!0?ee.texture.colorSpace:We.workingColorSpace,alphaToCoverage:!!x.alphaToCoverage,map:_t,matcap:Ge,envMap:it,envMapMode:it&&$.mapping,envMapCubeUVHeight:J,aoMap:Je,lightMap:Ye,bumpMap:St,normalMap:Tt,displacementMap:It,emissiveMap:Ft,normalMapObjectSpace:Tt&&x.normalMapType===pd,normalMapTangentSpace:Tt&&x.normalMapType===Kl,packedNormalMap:Tt&&x.normalMapType===Kl&&q_(x.normalMap.format),metalnessMap:ft,roughnessMap:Mt,anisotropy:N,anisotropyMap:G,clearcoat:Jt,clearcoatMap:q,clearcoatNormalMap:te,clearcoatRoughnessMap:oe,dispersion:Qe,iridescence:P,iridescenceMap:Y,iridescenceThicknessMap:Z,sheen:y,sheenColorMap:ce,sheenRoughnessMap:Ee,specularMap:ue,specularColorMap:le,specularIntensityMap:Ae,transmission:z,transmissionMap:Re,thicknessMap:Oe,gradientMap:U,opaque:x.transparent===!1&&x.blending===Yi&&x.alphaToCoverage===!1,alphaMap:re,alphaTest:K,alphaHash:he,combine:x.combine,mapUv:_t&&m(x.map.channel),aoMapUv:Je&&m(x.aoMap.channel),lightMapUv:Ye&&m(x.lightMap.channel),bumpMapUv:St&&m(x.bumpMap.channel),normalMapUv:Tt&&m(x.normalMap.channel),displacementMapUv:It&&m(x.displacementMap.channel),emissiveMapUv:Ft&&m(x.emissiveMap.channel),metalnessMapUv:ft&&m(x.metalnessMap.channel),roughnessMapUv:Mt&&m(x.roughnessMap.channel),anisotropyMapUv:G&&m(x.anisotropyMap.channel),clearcoatMapUv:q&&m(x.clearcoatMap.channel),clearcoatNormalMapUv:te&&m(x.clearcoatNormalMap.channel),clearcoatRoughnessMapUv:oe&&m(x.clearcoatRoughnessMap.channel),iridescenceMapUv:Y&&m(x.iridescenceMap.channel),iridescenceThicknessMapUv:Z&&m(x.iridescenceThicknessMap.channel),sheenColorMapUv:ce&&m(x.sheenColorMap.channel),sheenRoughnessMapUv:Ee&&m(x.sheenRoughnessMap.channel),specularMapUv:ue&&m(x.specularMap.channel),specularColorMapUv:le&&m(x.specularColorMap.channel),specularIntensityMapUv:Ae&&m(x.specularIntensityMap.channel),transmissionMapUv:Re&&m(x.transmissionMap.channel),thicknessMapUv:Oe&&m(x.thicknessMap.channel),alphaMapUv:re&&m(x.alphaMap.channel),vertexTangents:!!F.attributes.tangent&&(Tt||N),vertexNormals:!!F.attributes.normal,vertexColors:x.vertexColors,vertexAlphas:x.vertexColors===!0&&!!F.attributes.color&&F.attributes.color.itemSize===4,pointsUvs:D.isPoints===!0&&!!F.attributes.uv&&(_t||re),fog:!!V,useFog:x.fog===!0,fogExp2:!!V&&V.isFogExp2,flatShading:x.wireframe===!1&&(x.flatShading===!0||F.attributes.normal===void 0&&Tt===!1&&(x.isMeshLambertMaterial||x.isMeshPhongMaterial||x.isMeshStandardMaterial||x.isMeshPhysicalMaterial)),sizeAttenuation:x.sizeAttenuation===!0,logarithmicDepthBuffer:d,reversedDepthBuffer:Le,skinning:D.isSkinnedMesh===!0,hasPositionAttribute:F.attributes.position!==void 0,morphTargets:F.morphAttributes.position!==void 0,morphNormals:F.morphAttributes.normal!==void 0,morphColors:F.morphAttributes.color!==void 0,morphTargetsCount:ve,morphTextureStride:Ke,numDirLights:T.directional.length,numPointLights:T.point.length,numSpotLights:T.spot.length,numSpotLightMaps:T.spotLightMap.length,numRectAreaLights:T.rectArea.length,numHemiLights:T.hemi.length,numDirLightShadows:T.directionalShadowMap.length,numPointLightShadows:T.pointShadowMap.length,numSpotLightShadows:T.spotShadowMap.length,numSpotLightShadowsWithMaps:T.numSpotLightShadowsWithMaps,numLightProbes:T.numLightProbes,numLightProbeGrids:I.length,numClippingPlanes:r.numPlanes,numClipIntersection:r.numIntersection,dithering:x.dithering,shadowMapEnabled:i.shadowMap.enabled&&R.length>0,shadowMapType:i.shadowMap.type,toneMapping:Q,decodeVideoTexture:_t&&x.map.isVideoTexture===!0&&We.getTransfer(x.map.colorSpace)===je,decodeVideoTextureEmissive:Ft&&x.emissiveMap.isVideoTexture===!0&&We.getTransfer(x.emissiveMap.colorSpace)===je,premultipliedAlpha:x.premultipliedAlpha,doubleSided:x.side===_n,flipSided:x.side===Kt,useDepthPacking:x.depthPacking>=0,depthPacking:x.depthPacking||0,index0AttributeName:x.index0AttributeName,extensionClipCullDistance:me&&x.extensions.clipCullDistance===!0&&t.has("WEBGL_clip_cull_distance"),extensionMultiDraw:(me&&x.extensions.multiDraw===!0||Ce)&&t.has("WEBGL_multi_draw"),rendererExtensionParallelShaderCompile:t.has("KHR_parallel_shader_compile"),customProgramCacheKey:x.customProgramCacheKey()};return Me.vertexUv1s=c.has(1),Me.vertexUv2s=c.has(2),Me.vertexUv3s=c.has(3),c.clear(),Me}function g(x){let T=[];if(x.shaderID?T.push(x.shaderID):(T.push(x.customVertexShaderID),T.push(x.customFragmentShaderID)),x.defines!==void 0)for(let R in x.defines)T.push(R),T.push(x.defines[R]);return x.isRawShaderMaterial===!1&&(p(T,x),b(T,x),T.push(i.outputColorSpace)),T.push(x.customProgramCacheKey),T.join()}function p(x,T){x.push(T.precision),x.push(T.outputColorSpace),x.push(T.envMapMode),x.push(T.envMapCubeUVHeight),x.push(T.mapUv),x.push(T.alphaMapUv),x.push(T.lightMapUv),x.push(T.aoMapUv),x.push(T.bumpMapUv),x.push(T.normalMapUv),x.push(T.displacementMapUv),x.push(T.emissiveMapUv),x.push(T.metalnessMapUv),x.push(T.roughnessMapUv),x.push(T.anisotropyMapUv),x.push(T.clearcoatMapUv),x.push(T.clearcoatNormalMapUv),x.push(T.clearcoatRoughnessMapUv),x.push(T.iridescenceMapUv),x.push(T.iridescenceThicknessMapUv),x.push(T.sheenColorMapUv),x.push(T.sheenRoughnessMapUv),x.push(T.specularMapUv),x.push(T.specularColorMapUv),x.push(T.specularIntensityMapUv),x.push(T.transmissionMapUv),x.push(T.thicknessMapUv),x.push(T.combine),x.push(T.fogExp2),x.push(T.sizeAttenuation),x.push(T.morphTargetsCount),x.push(T.morphAttributeCount),x.push(T.numDirLights),x.push(T.numPointLights),x.push(T.numSpotLights),x.push(T.numSpotLightMaps),x.push(T.numHemiLights),x.push(T.numRectAreaLights),x.push(T.numDirLightShadows),x.push(T.numPointLightShadows),x.push(T.numSpotLightShadows),x.push(T.numSpotLightShadowsWithMaps),x.push(T.numLightProbes),x.push(T.shadowMapType),x.push(T.toneMapping),x.push(T.numClippingPlanes),x.push(T.numClipIntersection),x.push(T.depthPacking)}function b(x,T){a.disableAll(),T.instancing&&a.enable(0),T.instancingColor&&a.enable(1),T.instancingMorph&&a.enable(2),T.matcap&&a.enable(3),T.envMap&&a.enable(4),T.normalMapObjectSpace&&a.enable(5),T.normalMapTangentSpace&&a.enable(6),T.clearcoat&&a.enable(7),T.iridescence&&a.enable(8),T.alphaTest&&a.enable(9),T.vertexColors&&a.enable(10),T.vertexAlphas&&a.enable(11),T.vertexUv1s&&a.enable(12),T.vertexUv2s&&a.enable(13),T.vertexUv3s&&a.enable(14),T.vertexTangents&&a.enable(15),T.anisotropy&&a.enable(16),T.alphaHash&&a.enable(17),T.batching&&a.enable(18),T.dispersion&&a.enable(19),T.batchingColor&&a.enable(20),T.gradientMap&&a.enable(21),T.packedNormalMap&&a.enable(22),T.vertexNormals&&a.enable(23),x.push(a.mask),a.disableAll(),T.fog&&a.enable(0),T.useFog&&a.enable(1),T.flatShading&&a.enable(2),T.logarithmicDepthBuffer&&a.enable(3),T.reversedDepthBuffer&&a.enable(4),T.skinning&&a.enable(5),T.morphTargets&&a.enable(6),T.morphNormals&&a.enable(7),T.morphColors&&a.enable(8),T.premultipliedAlpha&&a.enable(9),T.shadowMapEnabled&&a.enable(10),T.doubleSided&&a.enable(11),T.flipSided&&a.enable(12),T.useDepthPacking&&a.enable(13),T.dithering&&a.enable(14),T.transmission&&a.enable(15),T.sheen&&a.enable(16),T.opaque&&a.enable(17),T.pointsUvs&&a.enable(18),T.decodeVideoTexture&&a.enable(19),T.decodeVideoTextureEmissive&&a.enable(20),T.alphaToCoverage&&a.enable(21),T.numLightProbeGrids>0&&a.enable(22),T.hasPositionAttribute&&a.enable(23),x.push(a.mask)}function E(x){let T=f[x.type],R;if(T){let C=Zt[T];R=Vr.clone(C.uniforms)}else R=x.uniforms;return R}function v(x,T){let R=h.get(T);return R!==void 0?++R.usedTimes:(R=new W_(i,T,x,s),l.push(R),h.set(T,R)),R}function A(x){if(--x.usedTimes===0){let T=l.indexOf(x);l[T]=l[l.length-1],l.pop(),h.delete(x.cacheKey),x.destroy()}}function M(x){o.remove(x)}function w(){o.dispose()}return{getParameters:_,getProgramCacheKey:g,getUniforms:E,acquireProgram:v,releaseProgram:A,releaseShaderCache:M,programs:l,dispose:w}}function $_(){let i=new WeakMap;function e(a){return i.has(a)}function t(a){let o=i.get(a);return o===void 0&&(o={},i.set(a,o)),o}function n(a){i.delete(a)}function s(a,o,c){i.get(a)[o]=c}function r(){i=new WeakMap}return{has:e,get:t,remove:n,update:s,dispose:r}}function K_(i,e){return i.groupOrder!==e.groupOrder?i.groupOrder-e.groupOrder:i.renderOrder!==e.renderOrder?i.renderOrder-e.renderOrder:i.material.id!==e.material.id?i.material.id-e.material.id:i.materialVariant!==e.materialVariant?i.materialVariant-e.materialVariant:i.z!==e.z?i.z-e.z:i.id-e.id}function Kd(i,e){return i.groupOrder!==e.groupOrder?i.groupOrder-e.groupOrder:i.renderOrder!==e.renderOrder?i.renderOrder-e.renderOrder:i.z!==e.z?e.z-i.z:i.id-e.id}function Zd(){let i=[],e=0,t=[],n=[],s=[];function r(){e=0,t.length=0,n.length=0,s.length=0}function a(u){let f=0;return u.isInstancedMesh&&(f+=2),u.isSkinnedMesh&&(f+=1),f}function o(u,f,m,_,g,p){let b=i[e];return b===void 0?(b={id:u.id,object:u,geometry:f,material:m,materialVariant:a(u),groupOrder:_,renderOrder:u.renderOrder,z:g,group:p},i[e]=b):(b.id=u.id,b.object=u,b.geometry=f,b.material=m,b.materialVariant=a(u),b.groupOrder=_,b.renderOrder=u.renderOrder,b.z=g,b.group=p),e++,b}function c(u,f,m,_,g,p){let b=o(u,f,m,_,g,p);m.transmission>0?n.push(b):m.transparent===!0?s.push(b):t.push(b)}function l(u,f,m,_,g,p){let b=o(u,f,m,_,g,p);m.transmission>0?n.unshift(b):m.transparent===!0?s.unshift(b):t.unshift(b)}function h(u,f,m){t.length>1&&t.sort(u||K_),n.length>1&&n.sort(f||Kd),s.length>1&&s.sort(f||Kd),m&&(t.reverse(),n.reverse(),s.reverse())}function d(){for(let u=e,f=i.length;u<f;u++){let m=i[u];if(m.id===null)break;m.id=null,m.object=null,m.geometry=null,m.material=null,m.group=null}}return{opaque:t,transmissive:n,transparent:s,init:r,push:c,unshift:l,finish:d,sort:h}}function Z_(){let i=new WeakMap;function e(n,s){let r=i.get(n),a;return r===void 0?(a=new Zd,i.set(n,[a])):s>=r.length?(a=new Zd,r.push(a)):a=r[s],a}function t(){i=new WeakMap}return{get:e,dispose:t}}function J_(){let i={};return{get:function(e){if(i[e.id]!==void 0)return i[e.id];let t;switch(e.type){case"DirectionalLight":t={direction:new L,color:new Xe};break;case"SpotLight":t={position:new L,direction:new L,color:new Xe,distance:0,coneCos:0,penumbraCos:0,decay:0};break;case"PointLight":t={position:new L,color:new Xe,distance:0,decay:0};break;case"HemisphereLight":t={direction:new L,skyColor:new Xe,groundColor:new Xe};break;case"RectAreaLight":t={color:new Xe,position:new L,halfWidth:new L,halfHeight:new L};break}return i[e.id]=t,t}}}function j_(){let i={};return{get:function(e){if(i[e.id]!==void 0)return i[e.id];let t;switch(e.type){case"DirectionalLight":t={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new _e};break;case"SpotLight":t={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new _e};break;case"PointLight":t={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new _e,shadowCameraNear:1,shadowCameraFar:1e3};break}return i[e.id]=t,t}}}var Q_=0;function ey(i,e){return(e.castShadow?2:0)-(i.castShadow?2:0)+(e.map?1:0)-(i.map?1:0)}function ty(i){let e=new J_,t=j_(),n={version:0,hash:{directionalLength:-1,pointLength:-1,spotLength:-1,rectAreaLength:-1,hemiLength:-1,numDirectionalShadows:-1,numPointShadows:-1,numSpotShadows:-1,numSpotMaps:-1,numLightProbes:-1},ambient:[0,0,0],probe:[],directional:[],directionalShadow:[],directionalShadowMap:[],directionalShadowMatrix:[],spot:[],spotLightMap:[],spotShadow:[],spotShadowMap:[],spotLightMatrix:[],rectArea:[],rectAreaLTC1:null,rectAreaLTC2:null,point:[],pointShadow:[],pointShadowMap:[],pointShadowMatrix:[],hemi:[],numSpotLightShadowsWithMaps:0,numLightProbes:0};for(let l=0;l<9;l++)n.probe.push(new L);let s=new L,r=new at,a=new at;function o(l){let h=0,d=0,u=0;for(let T=0;T<9;T++)n.probe[T].set(0,0,0);let f=0,m=0,_=0,g=0,p=0,b=0,E=0,v=0,A=0,M=0,w=0;l.sort(ey);for(let T=0,R=l.length;T<R;T++){let C=l[T],D=C.color,I=C.intensity,V=C.distance,F=null;if(C.shadow&&C.shadow.map&&(C.shadow.map.texture.format===Ii?F=C.shadow.map.texture:F=C.shadow.map.depthTexture||C.shadow.map.texture),C.isAmbientLight)h+=D.r*I,d+=D.g*I,u+=D.b*I;else if(C.isLightProbe){for(let X=0;X<9;X++)n.probe[X].addScaledVector(C.sh.coefficients[X],I);w++}else if(C.isDirectionalLight){let X=e.get(C);if(X.color.copy(C.color).multiplyScalar(C.intensity),C.castShadow){let B=C.shadow,$=t.get(C);$.shadowIntensity=B.intensity,$.shadowBias=B.bias,$.shadowNormalBias=B.normalBias,$.shadowRadius=B.radius,$.shadowMapSize=B.mapSize,n.directionalShadow[f]=$,n.directionalShadowMap[f]=F,n.directionalShadowMatrix[f]=C.shadow.matrix,b++}n.directional[f]=X,f++}else if(C.isSpotLight){let X=e.get(C);X.position.setFromMatrixPosition(C.matrixWorld),X.color.copy(D).multiplyScalar(I),X.distance=V,X.coneCos=Math.cos(C.angle),X.penumbraCos=Math.cos(C.angle*(1-C.penumbra)),X.decay=C.decay,n.spot[_]=X;let B=C.shadow;if(C.map&&(n.spotLightMap[A]=C.map,A++,B.updateMatrices(C),C.castShadow&&M++),n.spotLightMatrix[_]=B.matrix,C.castShadow){let $=t.get(C);$.shadowIntensity=B.intensity,$.shadowBias=B.bias,$.shadowNormalBias=B.normalBias,$.shadowRadius=B.radius,$.shadowMapSize=B.mapSize,n.spotShadow[_]=$,n.spotShadowMap[_]=F,v++}_++}else if(C.isRectAreaLight){let X=e.get(C);X.color.copy(D).multiplyScalar(I),X.halfWidth.set(C.width*.5,0,0),X.halfHeight.set(0,C.height*.5,0),n.rectArea[g]=X,g++}else if(C.isPointLight){let X=e.get(C);if(X.color.copy(C.color).multiplyScalar(C.intensity),X.distance=C.distance,X.decay=C.decay,C.castShadow){let B=C.shadow,$=t.get(C);$.shadowIntensity=B.intensity,$.shadowBias=B.bias,$.shadowNormalBias=B.normalBias,$.shadowRadius=B.radius,$.shadowMapSize=B.mapSize,$.shadowCameraNear=B.camera.near,$.shadowCameraFar=B.camera.far,n.pointShadow[m]=$,n.pointShadowMap[m]=F,n.pointShadowMatrix[m]=C.shadow.matrix,E++}n.point[m]=X,m++}else if(C.isHemisphereLight){let X=e.get(C);X.skyColor.copy(C.color).multiplyScalar(I),X.groundColor.copy(C.groundColor).multiplyScalar(I),n.hemi[p]=X,p++}}g>0&&(i.has("OES_texture_float_linear")===!0?(n.rectAreaLTC1=se.LTC_FLOAT_1,n.rectAreaLTC2=se.LTC_FLOAT_2):(n.rectAreaLTC1=se.LTC_HALF_1,n.rectAreaLTC2=se.LTC_HALF_2)),n.ambient[0]=h,n.ambient[1]=d,n.ambient[2]=u;let x=n.hash;(x.directionalLength!==f||x.pointLength!==m||x.spotLength!==_||x.rectAreaLength!==g||x.hemiLength!==p||x.numDirectionalShadows!==b||x.numPointShadows!==E||x.numSpotShadows!==v||x.numSpotMaps!==A||x.numLightProbes!==w)&&(n.directional.length=f,n.spot.length=_,n.rectArea.length=g,n.point.length=m,n.hemi.length=p,n.directionalShadow.length=b,n.directionalShadowMap.length=b,n.pointShadow.length=E,n.pointShadowMap.length=E,n.spotShadow.length=v,n.spotShadowMap.length=v,n.directionalShadowMatrix.length=b,n.pointShadowMatrix.length=E,n.spotLightMatrix.length=v+A-M,n.spotLightMap.length=A,n.numSpotLightShadowsWithMaps=M,n.numLightProbes=w,x.directionalLength=f,x.pointLength=m,x.spotLength=_,x.rectAreaLength=g,x.hemiLength=p,x.numDirectionalShadows=b,x.numPointShadows=E,x.numSpotShadows=v,x.numSpotMaps=A,x.numLightProbes=w,n.version=Q_++)}function c(l,h){let d=0,u=0,f=0,m=0,_=0,g=h.matrixWorldInverse;for(let p=0,b=l.length;p<b;p++){let E=l[p];if(E.isDirectionalLight){let v=n.directional[d];v.direction.setFromMatrixPosition(E.matrixWorld),s.setFromMatrixPosition(E.target.matrixWorld),v.direction.sub(s),v.direction.transformDirection(g),d++}else if(E.isSpotLight){let v=n.spot[f];v.position.setFromMatrixPosition(E.matrixWorld),v.position.applyMatrix4(g),v.direction.setFromMatrixPosition(E.matrixWorld),s.setFromMatrixPosition(E.target.matrixWorld),v.direction.sub(s),v.direction.transformDirection(g),f++}else if(E.isRectAreaLight){let v=n.rectArea[m];v.position.setFromMatrixPosition(E.matrixWorld),v.position.applyMatrix4(g),a.identity(),r.copy(E.matrixWorld),r.premultiply(g),a.extractRotation(r),v.halfWidth.set(E.width*.5,0,0),v.halfHeight.set(0,E.height*.5,0),v.halfWidth.applyMatrix4(a),v.halfHeight.applyMatrix4(a),m++}else if(E.isPointLight){let v=n.point[u];v.position.setFromMatrixPosition(E.matrixWorld),v.position.applyMatrix4(g),u++}else if(E.isHemisphereLight){let v=n.hemi[_];v.direction.setFromMatrixPosition(E.matrixWorld),v.direction.transformDirection(g),_++}}}return{setup:o,setupView:c,state:n}}function Jd(i){let e=new ty(i),t=[],n=[],s=[];function r(u){d.camera=u,t.length=0,n.length=0,s.length=0}function a(u){t.push(u)}function o(u){n.push(u)}function c(u){s.push(u)}function l(){e.setup(t)}function h(u){e.setupView(t,u)}let d={lightsArray:t,shadowsArray:n,lightProbeGridArray:s,camera:null,lights:e,transmissionRenderTarget:{},textureUnits:0};return{init:r,state:d,setupLights:l,setupLightsView:h,pushLight:a,pushShadow:o,pushLightProbeGrid:c}}function ny(i){let e=new WeakMap;function t(s,r=0){let a=e.get(s),o;return a===void 0?(o=new Jd(i),e.set(s,[o])):r>=a.length?(o=new Jd(i),a.push(o)):o=a[r],o}function n(){e=new WeakMap}return{get:t,dispose:n}}var iy=`void main() {
	gl_Position = vec4( position, 1.0 );
}`,sy=`uniform sampler2D shadow_pass;
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
}`,ry=[new L(1,0,0),new L(-1,0,0),new L(0,1,0),new L(0,-1,0),new L(0,0,1),new L(0,0,-1)],ay=[new L(0,-1,0),new L(0,-1,0),new L(0,0,1),new L(0,0,-1),new L(0,-1,0),new L(0,-1,0)],jd=new at,Hr=new L,ph=new L;function oy(i,e,t){let n=new dr,s=new _e,r=new _e,a=new tt,o=new ho,c=new uo,l={},h=t.maxTextureSize,d={[ni]:Kt,[Kt]:ni,[_n]:_n},u=new $t({defines:{VSM_SAMPLES:8},uniforms:{shadow_pass:{value:null},resolution:{value:new _e},radius:{value:4}},vertexShader:iy,fragmentShader:sy}),f=u.clone();f.defines.HORIZONTAL_PASS=1;let m=new Nt;m.setAttribute("position",new en(new Float32Array([-1,-1,.5,3,-1,.5,-1,3,.5]),3));let _=new Ot(m,u),g=this;this.enabled=!1,this.autoUpdate=!0,this.needsUpdate=!1,this.type=Ir;let p=this.type;this.render=function(M,w,x){if(g.enabled===!1||g.autoUpdate===!1&&g.needsUpdate===!1||M.length===0)return;this.type===Xu&&(Pe("WebGLShadowMap: PCFSoftShadowMap has been deprecated. Using PCFShadowMap instead."),this.type=Ir);let T=i.getRenderTarget(),R=i.getActiveCubeFace(),C=i.getActiveMipmapLevel(),D=i.state;D.setBlending(Hn),D.buffers.depth.getReversed()===!0?D.buffers.color.setClear(0,0,0,0):D.buffers.color.setClear(1,1,1,1),D.buffers.depth.setTest(!0),D.setScissorTest(!1);let I=p!==this.type;I&&w.traverse(function(V){V.material&&(Array.isArray(V.material)?V.material.forEach(F=>F.needsUpdate=!0):V.material.needsUpdate=!0)});for(let V=0,F=M.length;V<F;V++){let X=M[V],B=X.shadow;if(B===void 0){Pe("WebGLShadowMap:",X,"has no shadow.");continue}if(B.autoUpdate===!1&&B.needsUpdate===!1)continue;s.copy(B.mapSize);let $=B.getFrameExtents();s.multiply($),r.copy(B.mapSize),(s.x>h||s.y>h)&&(s.x>h&&(r.x=Math.floor(h/$.x),s.x=r.x*$.x,B.mapSize.x=r.x),s.y>h&&(r.y=Math.floor(h/$.y),s.y=r.y*$.y,B.mapSize.y=r.y));let J=i.state.buffers.depth.getReversed();if(B.camera._reversedDepth=J,B.map===null||I===!0){if(B.map!==null&&(B.map.depthTexture!==null&&(B.map.depthTexture.dispose(),B.map.depthTexture=null),B.map.dispose()),this.type===Ls){if(X.isPointLight){Pe("WebGLShadowMap: VSM shadow maps are not supported for PointLights. Use PCF or BasicShadowMap instead.");continue}B.map=new cn(s.x,s.y,{format:Ii,type:Gn,minFilter:Ut,magFilter:Ut,generateMipmaps:!1}),B.map.texture.name=X.name+".shadowMap",B.map.depthTexture=new ii(s.x,s.y,Cn),B.map.depthTexture.name=X.name+".shadowMapDepth",B.map.depthTexture.format=zn,B.map.depthTexture.compareFunction=null,B.map.depthTexture.minFilter=Dt,B.map.depthTexture.magFilter=Dt}else X.isPointLight?(B.map=new xc(s.x),B.map.depthTexture=new no(s.x,Pn)):(B.map=new cn(s.x,s.y),B.map.depthTexture=new ii(s.x,s.y,Pn)),B.map.depthTexture.name=X.name+".shadowMap",B.map.depthTexture.format=zn,this.type===Ir?(B.map.depthTexture.compareFunction=J?fc:dc,B.map.depthTexture.minFilter=Ut,B.map.depthTexture.magFilter=Ut):(B.map.depthTexture.compareFunction=null,B.map.depthTexture.minFilter=Dt,B.map.depthTexture.magFilter=Dt);B.camera.updateProjectionMatrix()}let ne=B.map.isWebGLCubeRenderTarget?6:1;for(let de=0;de<ne;de++){if(B.map.isWebGLCubeRenderTarget)i.setRenderTarget(B.map,de),i.clear();else{de===0&&(i.setRenderTarget(B.map),i.clear());let ve=B.getViewport(de);a.set(r.x*ve.x,r.y*ve.y,r.x*ve.z,r.y*ve.w),D.viewport(a)}if(X.isPointLight){let ve=B.camera,Ke=B.matrix,dt=X.distance||ve.far;dt!==ve.far&&(ve.far=dt,ve.updateProjectionMatrix()),Hr.setFromMatrixPosition(X.matrixWorld),ve.position.copy(Hr),ph.copy(ve.position),ph.add(ry[de]),ve.up.copy(ay[de]),ve.lookAt(ph),ve.updateMatrixWorld(),Ke.makeTranslation(-Hr.x,-Hr.y,-Hr.z),jd.multiplyMatrices(ve.projectionMatrix,ve.matrixWorldInverse),B._frustum.setFromProjectionMatrix(jd,ve.coordinateSystem,ve.reversedDepth)}else B.updateMatrices(X);n=B.getFrustum(),v(w,x,B.camera,X,this.type)}B.isPointLightShadow!==!0&&this.type===Ls&&b(B,x),B.needsUpdate=!1}p=this.type,g.needsUpdate=!1,i.setRenderTarget(T,R,C)};function b(M,w){let x=e.update(_);u.defines.VSM_SAMPLES!==M.blurSamples&&(u.defines.VSM_SAMPLES=M.blurSamples,f.defines.VSM_SAMPLES=M.blurSamples,u.needsUpdate=!0,f.needsUpdate=!0),M.mapPass===null&&(M.mapPass=new cn(s.x,s.y,{format:Ii,type:Gn})),u.uniforms.shadow_pass.value=M.map.depthTexture,u.uniforms.resolution.value=M.mapSize,u.uniforms.radius.value=M.radius,i.setRenderTarget(M.mapPass),i.clear(),i.renderBufferDirect(w,null,x,u,_,null),f.uniforms.shadow_pass.value=M.mapPass.texture,f.uniforms.resolution.value=M.mapSize,f.uniforms.radius.value=M.radius,i.setRenderTarget(M.map),i.clear(),i.renderBufferDirect(w,null,x,f,_,null)}function E(M,w,x,T){let R=null,C=x.isPointLight===!0?M.customDistanceMaterial:M.customDepthMaterial;if(C!==void 0)R=C;else if(R=x.isPointLight===!0?c:o,i.localClippingEnabled&&w.clipShadows===!0&&Array.isArray(w.clippingPlanes)&&w.clippingPlanes.length!==0||w.displacementMap&&w.displacementScale!==0||w.alphaMap&&w.alphaTest>0||w.map&&w.alphaTest>0||w.alphaToCoverage===!0){let D=R.uuid,I=w.uuid,V=l[D];V===void 0&&(V={},l[D]=V);let F=V[I];F===void 0&&(F=R.clone(),V[I]=F,w.addEventListener("dispose",A)),R=F}if(R.visible=w.visible,R.wireframe=w.wireframe,T===Ls?R.side=w.shadowSide!==null?w.shadowSide:w.side:R.side=w.shadowSide!==null?w.shadowSide:d[w.side],R.alphaMap=w.alphaMap,R.alphaTest=w.alphaToCoverage===!0?.5:w.alphaTest,R.map=w.map,R.clipShadows=w.clipShadows,R.clippingPlanes=w.clippingPlanes,R.clipIntersection=w.clipIntersection,R.displacementMap=w.displacementMap,R.displacementScale=w.displacementScale,R.displacementBias=w.displacementBias,R.wireframeLinewidth=w.wireframeLinewidth,R.linewidth=w.linewidth,x.isPointLight===!0&&R.isMeshDistanceMaterial===!0){let D=i.properties.get(R);D.light=x}return R}function v(M,w,x,T,R){if(M.visible===!1)return;if(M.layers.test(w.layers)&&(M.isMesh||M.isLine||M.isPoints)&&(M.castShadow||M.receiveShadow&&R===Ls)&&(!M.frustumCulled||n.intersectsObject(M))){M.modelViewMatrix.multiplyMatrices(x.matrixWorldInverse,M.matrixWorld);let I=e.update(M),V=M.material;if(Array.isArray(V)){let F=I.groups;for(let X=0,B=F.length;X<B;X++){let $=F[X],J=V[$.materialIndex];if(J&&J.visible){let ne=E(M,J,T,R);M.onBeforeShadow(i,M,w,x,I,ne,$),i.renderBufferDirect(x,null,I,ne,M,$),M.onAfterShadow(i,M,w,x,I,ne,$)}}}else if(V.visible){let F=E(M,V,T,R);M.onBeforeShadow(i,M,w,x,I,F,null),i.renderBufferDirect(x,null,I,F,M,null),M.onAfterShadow(i,M,w,x,I,F,null)}}let D=M.children;for(let I=0,V=D.length;I<V;I++)v(D[I],w,x,T,R)}function A(M){M.target.removeEventListener("dispose",A);for(let x in l){let T=l[x],R=M.target.uuid;R in T&&(T[R].dispose(),delete T[R])}}}function cy(i,e){function t(){let U=!1,re=new tt,K=null,he=new tt(0,0,0,0);return{setMask:function(me){K!==me&&!U&&(i.colorMask(me,me,me,me),K=me)},setLocked:function(me){U=me},setClear:function(me,Q,Me,be,pt){pt===!0&&(me*=be,Q*=be,Me*=be),re.set(me,Q,Me,be),he.equals(re)===!1&&(i.clearColor(me,Q,Me,be),he.copy(re))},reset:function(){U=!1,K=null,he.set(-1,0,0,0)}}}function n(){let U=!1,re=!1,K=null,he=null,me=null;return{setReversed:function(Q){if(re!==Q){let Me=e.get("EXT_clip_control");Q?Me.clipControlEXT(Me.LOWER_LEFT_EXT,Me.ZERO_TO_ONE_EXT):Me.clipControlEXT(Me.LOWER_LEFT_EXT,Me.NEGATIVE_ONE_TO_ONE_EXT),re=Q;let be=me;me=null,this.setClear(be)}},getReversed:function(){return re},setTest:function(Q){Q?ee(i.DEPTH_TEST):Le(i.DEPTH_TEST)},setMask:function(Q){K!==Q&&!U&&(i.depthMask(Q),K=Q)},setFunc:function(Q){if(re&&(Q=Ed[Q]),he!==Q){switch(Q){case Oa:i.depthFunc(i.NEVER);break;case Ba:i.depthFunc(i.ALWAYS);break;case za:i.depthFunc(i.LESS);break;case $i:i.depthFunc(i.LEQUAL);break;case Va:i.depthFunc(i.EQUAL);break;case ka:i.depthFunc(i.GEQUAL);break;case Ha:i.depthFunc(i.GREATER);break;case Ga:i.depthFunc(i.NOTEQUAL);break;default:i.depthFunc(i.LEQUAL)}he=Q}},setLocked:function(Q){U=Q},setClear:function(Q){me!==Q&&(me=Q,re&&(Q=1-Q),i.clearDepth(Q))},reset:function(){U=!1,K=null,he=null,me=null,re=!1}}}function s(){let U=!1,re=null,K=null,he=null,me=null,Q=null,Me=null,be=null,pt=null;return{setTest:function(ot){U||(ot?ee(i.STENCIL_TEST):Le(i.STENCIL_TEST))},setMask:function(ot){re!==ot&&!U&&(i.stencilMask(ot),re=ot)},setFunc:function(ot,Rn,In){(K!==ot||he!==Rn||me!==In)&&(i.stencilFunc(ot,Rn,In),K=ot,he=Rn,me=In)},setOp:function(ot,Rn,In){(Q!==ot||Me!==Rn||be!==In)&&(i.stencilOp(ot,Rn,In),Q=ot,Me=Rn,be=In)},setLocked:function(ot){U=ot},setClear:function(ot){pt!==ot&&(i.clearStencil(ot),pt=ot)},reset:function(){U=!1,re=null,K=null,he=null,me=null,Q=null,Me=null,be=null,pt=null}}}let r=new t,a=new n,o=new s,c=new WeakMap,l=new WeakMap,h={},d={},u={},f=new WeakMap,m=[],_=null,g=!1,p=null,b=null,E=null,v=null,A=null,M=null,w=null,x=new Xe(0,0,0),T=0,R=!1,C=null,D=null,I=null,V=null,F=null,X=i.getParameter(i.MAX_COMBINED_TEXTURE_IMAGE_UNITS),B=!1,$=0,J=i.getParameter(i.VERSION);J.indexOf("WebGL")!==-1?($=parseFloat(/^WebGL (\d)/.exec(J)[1]),B=$>=1):J.indexOf("OpenGL ES")!==-1&&($=parseFloat(/^OpenGL ES (\d)/.exec(J)[1]),B=$>=2);let ne=null,de={},ve=i.getParameter(i.SCISSOR_BOX),Ke=i.getParameter(i.VIEWPORT),dt=new tt().fromArray(ve),Ze=new tt().fromArray(Ke);function j(U,re,K,he){let me=new Uint8Array(4),Q=i.createTexture();i.bindTexture(U,Q),i.texParameteri(U,i.TEXTURE_MIN_FILTER,i.NEAREST),i.texParameteri(U,i.TEXTURE_MAG_FILTER,i.NEAREST);for(let Me=0;Me<K;Me++)U===i.TEXTURE_3D||U===i.TEXTURE_2D_ARRAY?i.texImage3D(re,0,i.RGBA,1,1,he,0,i.RGBA,i.UNSIGNED_BYTE,me):i.texImage2D(re+Me,0,i.RGBA,1,1,0,i.RGBA,i.UNSIGNED_BYTE,me);return Q}let ae={};ae[i.TEXTURE_2D]=j(i.TEXTURE_2D,i.TEXTURE_2D,1),ae[i.TEXTURE_CUBE_MAP]=j(i.TEXTURE_CUBE_MAP,i.TEXTURE_CUBE_MAP_POSITIVE_X,6),ae[i.TEXTURE_2D_ARRAY]=j(i.TEXTURE_2D_ARRAY,i.TEXTURE_2D_ARRAY,1,1),ae[i.TEXTURE_3D]=j(i.TEXTURE_3D,i.TEXTURE_3D,1,1),r.setClear(0,0,0,1),a.setClear(1),o.setClear(0),ee(i.DEPTH_TEST),a.setFunc($i),St(!1),Tt(Cl),ee(i.CULL_FACE),Je(Hn);function ee(U){h[U]!==!0&&(i.enable(U),h[U]=!0)}function Le(U){h[U]!==!1&&(i.disable(U),h[U]=!1)}function Ne(U,re){return u[U]!==re?(i.bindFramebuffer(U,re),u[U]=re,U===i.DRAW_FRAMEBUFFER&&(u[i.FRAMEBUFFER]=re),U===i.FRAMEBUFFER&&(u[i.DRAW_FRAMEBUFFER]=re),!0):!1}function Ce(U,re){let K=m,he=!1;if(U){K=f.get(re),K===void 0&&(K=[],f.set(re,K));let me=U.textures;if(K.length!==me.length||K[0]!==i.COLOR_ATTACHMENT0){for(let Q=0,Me=me.length;Q<Me;Q++)K[Q]=i.COLOR_ATTACHMENT0+Q;K.length=me.length,he=!0}}else K[0]!==i.BACK&&(K[0]=i.BACK,he=!0);he&&i.drawBuffers(K)}function _t(U){return _!==U?(i.useProgram(U),_=U,!0):!1}let Ge={[vi]:i.FUNC_ADD,[Yu]:i.FUNC_SUBTRACT,[$u]:i.FUNC_REVERSE_SUBTRACT};Ge[Ku]=i.MIN,Ge[Zu]=i.MAX;let it={[Ju]:i.ZERO,[ju]:i.ONE,[Qu]:i.SRC_COLOR,[Ua]:i.SRC_ALPHA,[rd]:i.SRC_ALPHA_SATURATE,[id]:i.DST_COLOR,[td]:i.DST_ALPHA,[ed]:i.ONE_MINUS_SRC_COLOR,[Na]:i.ONE_MINUS_SRC_ALPHA,[sd]:i.ONE_MINUS_DST_COLOR,[nd]:i.ONE_MINUS_DST_ALPHA,[ad]:i.CONSTANT_COLOR,[od]:i.ONE_MINUS_CONSTANT_COLOR,[cd]:i.CONSTANT_ALPHA,[ld]:i.ONE_MINUS_CONSTANT_ALPHA};function Je(U,re,K,he,me,Q,Me,be,pt,ot){if(U===Hn){g===!0&&(Le(i.BLEND),g=!1);return}if(g===!1&&(ee(i.BLEND),g=!0),U!==qu){if(U!==p||ot!==R){if((b!==vi||A!==vi)&&(i.blendEquation(i.FUNC_ADD),b=vi,A=vi),ot)switch(U){case Yi:i.blendFuncSeparate(i.ONE,i.ONE_MINUS_SRC_ALPHA,i.ONE,i.ONE_MINUS_SRC_ALPHA);break;case Rl:i.blendFunc(i.ONE,i.ONE);break;case Il:i.blendFuncSeparate(i.ZERO,i.ONE_MINUS_SRC_COLOR,i.ZERO,i.ONE);break;case Ll:i.blendFuncSeparate(i.DST_COLOR,i.ONE_MINUS_SRC_ALPHA,i.ZERO,i.ONE);break;default:Ie("WebGLState: Invalid blending: ",U);break}else switch(U){case Yi:i.blendFuncSeparate(i.SRC_ALPHA,i.ONE_MINUS_SRC_ALPHA,i.ONE,i.ONE_MINUS_SRC_ALPHA);break;case Rl:i.blendFuncSeparate(i.SRC_ALPHA,i.ONE,i.ONE,i.ONE);break;case Il:Ie("WebGLState: SubtractiveBlending requires material.premultipliedAlpha = true");break;case Ll:Ie("WebGLState: MultiplyBlending requires material.premultipliedAlpha = true");break;default:Ie("WebGLState: Invalid blending: ",U);break}E=null,v=null,M=null,w=null,x.set(0,0,0),T=0,p=U,R=ot}return}me=me||re,Q=Q||K,Me=Me||he,(re!==b||me!==A)&&(i.blendEquationSeparate(Ge[re],Ge[me]),b=re,A=me),(K!==E||he!==v||Q!==M||Me!==w)&&(i.blendFuncSeparate(it[K],it[he],it[Q],it[Me]),E=K,v=he,M=Q,w=Me),(be.equals(x)===!1||pt!==T)&&(i.blendColor(be.r,be.g,be.b,pt),x.copy(be),T=pt),p=U,R=!1}function Ye(U,re){U.side===_n?Le(i.CULL_FACE):ee(i.CULL_FACE);let K=U.side===Kt;re&&(K=!K),St(K),U.blending===Yi&&U.transparent===!1?Je(Hn):Je(U.blending,U.blendEquation,U.blendSrc,U.blendDst,U.blendEquationAlpha,U.blendSrcAlpha,U.blendDstAlpha,U.blendColor,U.blendAlpha,U.premultipliedAlpha),a.setFunc(U.depthFunc),a.setTest(U.depthTest),a.setMask(U.depthWrite),r.setMask(U.colorWrite);let he=U.stencilWrite;o.setTest(he),he&&(o.setMask(U.stencilWriteMask),o.setFunc(U.stencilFunc,U.stencilRef,U.stencilFuncMask),o.setOp(U.stencilFail,U.stencilZFail,U.stencilZPass)),Ft(U.polygonOffset,U.polygonOffsetFactor,U.polygonOffsetUnits),U.alphaToCoverage===!0?ee(i.SAMPLE_ALPHA_TO_COVERAGE):Le(i.SAMPLE_ALPHA_TO_COVERAGE)}function St(U){C!==U&&(U?i.frontFace(i.CW):i.frontFace(i.CCW),C=U)}function Tt(U){U!==Gu?(ee(i.CULL_FACE),U!==D&&(U===Cl?i.cullFace(i.BACK):U===Wu?i.cullFace(i.FRONT):i.cullFace(i.FRONT_AND_BACK))):Le(i.CULL_FACE),D=U}function It(U){U!==I&&(B&&i.lineWidth(U),I=U)}function Ft(U,re,K){U?(ee(i.POLYGON_OFFSET_FILL),(V!==re||F!==K)&&(V=re,F=K,a.getReversed()&&(re=-re),i.polygonOffset(re,K))):Le(i.POLYGON_OFFSET_FILL)}function ft(U){U?ee(i.SCISSOR_TEST):Le(i.SCISSOR_TEST)}function Mt(U){U===void 0&&(U=i.TEXTURE0+X-1),ne!==U&&(i.activeTexture(U),ne=U)}function N(U,re,K){K===void 0&&(ne===null?K=i.TEXTURE0+X-1:K=ne);let he=de[K];he===void 0&&(he={type:void 0,texture:void 0},de[K]=he),(he.type!==U||he.texture!==re)&&(ne!==K&&(i.activeTexture(K),ne=K),i.bindTexture(U,re||ae[U]),he.type=U,he.texture=re)}function Jt(){let U=de[ne];U!==void 0&&U.type!==void 0&&(i.bindTexture(U.type,null),U.type=void 0,U.texture=void 0)}function Qe(){try{i.compressedTexImage2D(...arguments)}catch(U){Ie("WebGLState:",U)}}function P(){try{i.compressedTexImage3D(...arguments)}catch(U){Ie("WebGLState:",U)}}function y(){try{i.texSubImage2D(...arguments)}catch(U){Ie("WebGLState:",U)}}function z(){try{i.texSubImage3D(...arguments)}catch(U){Ie("WebGLState:",U)}}function G(){try{i.compressedTexSubImage2D(...arguments)}catch(U){Ie("WebGLState:",U)}}function q(){try{i.compressedTexSubImage3D(...arguments)}catch(U){Ie("WebGLState:",U)}}function te(){try{i.texStorage2D(...arguments)}catch(U){Ie("WebGLState:",U)}}function oe(){try{i.texStorage3D(...arguments)}catch(U){Ie("WebGLState:",U)}}function Y(){try{i.texImage2D(...arguments)}catch(U){Ie("WebGLState:",U)}}function Z(){try{i.texImage3D(...arguments)}catch(U){Ie("WebGLState:",U)}}function ce(U){return d[U]!==void 0?d[U]:i.getParameter(U)}function Ee(U,re){d[U]!==re&&(i.pixelStorei(U,re),d[U]=re)}function ue(U){dt.equals(U)===!1&&(i.scissor(U.x,U.y,U.z,U.w),dt.copy(U))}function le(U){Ze.equals(U)===!1&&(i.viewport(U.x,U.y,U.z,U.w),Ze.copy(U))}function Ae(U,re){let K=l.get(re);K===void 0&&(K=new WeakMap,l.set(re,K));let he=K.get(U);he===void 0&&(he=i.getUniformBlockIndex(re,U.name),K.set(U,he))}function Re(U,re){let he=l.get(re).get(U);c.get(re)!==he&&(i.uniformBlockBinding(re,he,U.__bindingPointIndex),c.set(re,he))}function Oe(){i.disable(i.BLEND),i.disable(i.CULL_FACE),i.disable(i.DEPTH_TEST),i.disable(i.POLYGON_OFFSET_FILL),i.disable(i.SCISSOR_TEST),i.disable(i.STENCIL_TEST),i.disable(i.SAMPLE_ALPHA_TO_COVERAGE),i.blendEquation(i.FUNC_ADD),i.blendFunc(i.ONE,i.ZERO),i.blendFuncSeparate(i.ONE,i.ZERO,i.ONE,i.ZERO),i.blendColor(0,0,0,0),i.colorMask(!0,!0,!0,!0),i.clearColor(0,0,0,0),i.depthMask(!0),i.depthFunc(i.LESS),a.setReversed(!1),i.clearDepth(1),i.stencilMask(4294967295),i.stencilFunc(i.ALWAYS,0,4294967295),i.stencilOp(i.KEEP,i.KEEP,i.KEEP),i.clearStencil(0),i.cullFace(i.BACK),i.frontFace(i.CCW),i.polygonOffset(0,0),i.activeTexture(i.TEXTURE0),i.bindFramebuffer(i.FRAMEBUFFER,null),i.bindFramebuffer(i.DRAW_FRAMEBUFFER,null),i.bindFramebuffer(i.READ_FRAMEBUFFER,null),i.useProgram(null),i.lineWidth(1),i.scissor(0,0,i.canvas.width,i.canvas.height),i.viewport(0,0,i.canvas.width,i.canvas.height),i.pixelStorei(i.PACK_ALIGNMENT,4),i.pixelStorei(i.UNPACK_ALIGNMENT,4),i.pixelStorei(i.UNPACK_FLIP_Y_WEBGL,!1),i.pixelStorei(i.UNPACK_PREMULTIPLY_ALPHA_WEBGL,!1),i.pixelStorei(i.UNPACK_COLORSPACE_CONVERSION_WEBGL,i.BROWSER_DEFAULT_WEBGL),i.pixelStorei(i.PACK_ROW_LENGTH,0),i.pixelStorei(i.PACK_SKIP_PIXELS,0),i.pixelStorei(i.PACK_SKIP_ROWS,0),i.pixelStorei(i.UNPACK_ROW_LENGTH,0),i.pixelStorei(i.UNPACK_IMAGE_HEIGHT,0),i.pixelStorei(i.UNPACK_SKIP_PIXELS,0),i.pixelStorei(i.UNPACK_SKIP_ROWS,0),i.pixelStorei(i.UNPACK_SKIP_IMAGES,0),h={},d={},ne=null,de={},u={},f=new WeakMap,m=[],_=null,g=!1,p=null,b=null,E=null,v=null,A=null,M=null,w=null,x=new Xe(0,0,0),T=0,R=!1,C=null,D=null,I=null,V=null,F=null,dt.set(0,0,i.canvas.width,i.canvas.height),Ze.set(0,0,i.canvas.width,i.canvas.height),r.reset(),a.reset(),o.reset()}return{buffers:{color:r,depth:a,stencil:o},enable:ee,disable:Le,bindFramebuffer:Ne,drawBuffers:Ce,useProgram:_t,setBlending:Je,setMaterial:Ye,setFlipSided:St,setCullFace:Tt,setLineWidth:It,setPolygonOffset:Ft,setScissorTest:ft,activeTexture:Mt,bindTexture:N,unbindTexture:Jt,compressedTexImage2D:Qe,compressedTexImage3D:P,texImage2D:Y,texImage3D:Z,pixelStorei:Ee,getParameter:ce,updateUBOMapping:Ae,uniformBlockBinding:Re,texStorage2D:te,texStorage3D:oe,texSubImage2D:y,texSubImage3D:z,compressedTexSubImage2D:G,compressedTexSubImage3D:q,scissor:ue,viewport:le,reset:Oe}}function ly(i,e,t,n,s,r,a){let o=e.has("WEBGL_multisampled_render_to_texture")?e.get("WEBGL_multisampled_render_to_texture"):null,c=typeof navigator>"u"?!1:/OculusBrowser/g.test(navigator.userAgent),l=new _e,h=new WeakMap,d=new Set,u,f=new WeakMap,m=!1;try{m=typeof OffscreenCanvas<"u"&&new OffscreenCanvas(1,1).getContext("2d")!==null}catch{}function _(P,y){return m?new OffscreenCanvas(P,y):sr("canvas")}function g(P,y,z){let G=1,q=Qe(P);if((q.width>z||q.height>z)&&(G=z/Math.max(q.width,q.height)),G<1)if(typeof HTMLImageElement<"u"&&P instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&P instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&P instanceof ImageBitmap||typeof VideoFrame<"u"&&P instanceof VideoFrame){let te=Math.floor(G*q.width),oe=Math.floor(G*q.height);u===void 0&&(u=_(te,oe));let Y=y?_(te,oe):u;return Y.width=te,Y.height=oe,Y.getContext("2d").drawImage(P,0,0,te,oe),Pe("WebGLRenderer: Texture has been resized from ("+q.width+"x"+q.height+") to ("+te+"x"+oe+")."),Y}else return"data"in P&&Pe("WebGLRenderer: Image in DataTexture is too big ("+q.width+"x"+q.height+")."),P;return P}function p(P){return P.generateMipmaps}function b(P){i.generateMipmap(P)}function E(P){return P.isWebGLCubeRenderTarget?i.TEXTURE_CUBE_MAP:P.isWebGL3DRenderTarget?i.TEXTURE_3D:P.isWebGLArrayRenderTarget||P.isCompressedArrayTexture?i.TEXTURE_2D_ARRAY:i.TEXTURE_2D}function v(P,y,z,G,q,te=!1){if(P!==null){if(i[P]!==void 0)return i[P];Pe("WebGLRenderer: Attempt to use non-existing WebGL internal format '"+P+"'")}let oe;G&&(oe=e.get("EXT_texture_norm16"),oe||Pe("WebGLRenderer: Unable to use normalized textures without EXT_texture_norm16 extension"));let Y=y;if(y===i.RED&&(z===i.FLOAT&&(Y=i.R32F),z===i.HALF_FLOAT&&(Y=i.R16F),z===i.UNSIGNED_BYTE&&(Y=i.R8),z===i.UNSIGNED_SHORT&&oe&&(Y=oe.R16_EXT),z===i.SHORT&&oe&&(Y=oe.R16_SNORM_EXT)),y===i.RED_INTEGER&&(z===i.UNSIGNED_BYTE&&(Y=i.R8UI),z===i.UNSIGNED_SHORT&&(Y=i.R16UI),z===i.UNSIGNED_INT&&(Y=i.R32UI),z===i.BYTE&&(Y=i.R8I),z===i.SHORT&&(Y=i.R16I),z===i.INT&&(Y=i.R32I)),y===i.RG&&(z===i.FLOAT&&(Y=i.RG32F),z===i.HALF_FLOAT&&(Y=i.RG16F),z===i.UNSIGNED_BYTE&&(Y=i.RG8),z===i.UNSIGNED_SHORT&&oe&&(Y=oe.RG16_EXT),z===i.SHORT&&oe&&(Y=oe.RG16_SNORM_EXT)),y===i.RG_INTEGER&&(z===i.UNSIGNED_BYTE&&(Y=i.RG8UI),z===i.UNSIGNED_SHORT&&(Y=i.RG16UI),z===i.UNSIGNED_INT&&(Y=i.RG32UI),z===i.BYTE&&(Y=i.RG8I),z===i.SHORT&&(Y=i.RG16I),z===i.INT&&(Y=i.RG32I)),y===i.RGB_INTEGER&&(z===i.UNSIGNED_BYTE&&(Y=i.RGB8UI),z===i.UNSIGNED_SHORT&&(Y=i.RGB16UI),z===i.UNSIGNED_INT&&(Y=i.RGB32UI),z===i.BYTE&&(Y=i.RGB8I),z===i.SHORT&&(Y=i.RGB16I),z===i.INT&&(Y=i.RGB32I)),y===i.RGBA_INTEGER&&(z===i.UNSIGNED_BYTE&&(Y=i.RGBA8UI),z===i.UNSIGNED_SHORT&&(Y=i.RGBA16UI),z===i.UNSIGNED_INT&&(Y=i.RGBA32UI),z===i.BYTE&&(Y=i.RGBA8I),z===i.SHORT&&(Y=i.RGBA16I),z===i.INT&&(Y=i.RGBA32I)),y===i.RGB&&(z===i.UNSIGNED_SHORT&&oe&&(Y=oe.RGB16_EXT),z===i.SHORT&&oe&&(Y=oe.RGB16_SNORM_EXT),z===i.UNSIGNED_INT_5_9_9_9_REV&&(Y=i.RGB9_E5),z===i.UNSIGNED_INT_10F_11F_11F_REV&&(Y=i.R11F_G11F_B10F)),y===i.RGBA){let Z=te?nr:We.getTransfer(q);z===i.FLOAT&&(Y=i.RGBA32F),z===i.HALF_FLOAT&&(Y=i.RGBA16F),z===i.UNSIGNED_BYTE&&(Y=Z===je?i.SRGB8_ALPHA8:i.RGBA8),z===i.UNSIGNED_SHORT&&oe&&(Y=oe.RGBA16_EXT),z===i.SHORT&&oe&&(Y=oe.RGBA16_SNORM_EXT),z===i.UNSIGNED_SHORT_4_4_4_4&&(Y=i.RGBA4),z===i.UNSIGNED_SHORT_5_5_5_1&&(Y=i.RGB5_A1)}return(Y===i.R16F||Y===i.R32F||Y===i.RG16F||Y===i.RG32F||Y===i.RGBA16F||Y===i.RGBA32F)&&e.get("EXT_color_buffer_float"),Y}function A(P,y){let z;return P?y===null||y===Pn||y===Fs?z=i.DEPTH24_STENCIL8:y===Cn?z=i.DEPTH32F_STENCIL8:y===Ds&&(z=i.DEPTH24_STENCIL8,Pe("DepthTexture: 16 bit depth attachment is not supported with stencil. Using 24-bit attachment.")):y===null||y===Pn||y===Fs?z=i.DEPTH_COMPONENT24:y===Cn?z=i.DEPTH_COMPONENT32F:y===Ds&&(z=i.DEPTH_COMPONENT16),z}function M(P,y){return p(P)===!0||P.isFramebufferTexture&&P.minFilter!==Dt&&P.minFilter!==Ut?Math.log2(Math.max(y.width,y.height))+1:P.mipmaps!==void 0&&P.mipmaps.length>0?P.mipmaps.length:P.isCompressedTexture&&Array.isArray(P.image)?y.mipmaps.length:1}function w(P){let y=P.target;y.removeEventListener("dispose",w),T(y),y.isVideoTexture&&h.delete(y),y.isHTMLTexture&&d.delete(y)}function x(P){let y=P.target;y.removeEventListener("dispose",x),C(y)}function T(P){let y=n.get(P);if(y.__webglInit===void 0)return;let z=P.source,G=f.get(z);if(G){let q=G[y.__cacheKey];q.usedTimes--,q.usedTimes===0&&R(P),Object.keys(G).length===0&&f.delete(z)}n.remove(P)}function R(P){let y=n.get(P);i.deleteTexture(y.__webglTexture);let z=P.source,G=f.get(z);delete G[y.__cacheKey],a.memory.textures--}function C(P){let y=n.get(P);if(P.depthTexture&&(P.depthTexture.dispose(),n.remove(P.depthTexture)),P.isWebGLCubeRenderTarget)for(let G=0;G<6;G++){if(Array.isArray(y.__webglFramebuffer[G]))for(let q=0;q<y.__webglFramebuffer[G].length;q++)i.deleteFramebuffer(y.__webglFramebuffer[G][q]);else i.deleteFramebuffer(y.__webglFramebuffer[G]);y.__webglDepthbuffer&&i.deleteRenderbuffer(y.__webglDepthbuffer[G])}else{if(Array.isArray(y.__webglFramebuffer))for(let G=0;G<y.__webglFramebuffer.length;G++)i.deleteFramebuffer(y.__webglFramebuffer[G]);else i.deleteFramebuffer(y.__webglFramebuffer);if(y.__webglDepthbuffer&&i.deleteRenderbuffer(y.__webglDepthbuffer),y.__webglMultisampledFramebuffer&&i.deleteFramebuffer(y.__webglMultisampledFramebuffer),y.__webglColorRenderbuffer)for(let G=0;G<y.__webglColorRenderbuffer.length;G++)y.__webglColorRenderbuffer[G]&&i.deleteRenderbuffer(y.__webglColorRenderbuffer[G]);y.__webglDepthRenderbuffer&&i.deleteRenderbuffer(y.__webglDepthRenderbuffer)}let z=P.textures;for(let G=0,q=z.length;G<q;G++){let te=n.get(z[G]);te.__webglTexture&&(i.deleteTexture(te.__webglTexture),a.memory.textures--),n.remove(z[G])}n.remove(P)}let D=0;function I(){D=0}function V(){return D}function F(P){D=P}function X(){let P=D;return P>=s.maxTextures&&Pe("WebGLTextures: Trying to use "+P+" texture units while this GPU supports only "+s.maxTextures),D+=1,P}function B(P){let y=[];return y.push(P.wrapS),y.push(P.wrapT),y.push(P.wrapR||0),y.push(P.magFilter),y.push(P.minFilter),y.push(P.anisotropy),y.push(P.internalFormat),y.push(P.format),y.push(P.type),y.push(P.generateMipmaps),y.push(P.premultiplyAlpha),y.push(P.flipY),y.push(P.unpackAlignment),y.push(P.colorSpace),y.join()}function $(P,y){let z=n.get(P);if(P.isVideoTexture&&N(P),P.isRenderTargetTexture===!1&&P.isExternalTexture!==!0&&P.version>0&&z.__version!==P.version){let G=P.image;if(G===null)Pe("WebGLRenderer: Texture marked for update but no image data found.");else if(G.complete===!1)Pe("WebGLRenderer: Texture marked for update but image is incomplete");else{Le(z,P,y);return}}else P.isExternalTexture&&(z.__webglTexture=P.sourceTexture?P.sourceTexture:null);t.bindTexture(i.TEXTURE_2D,z.__webglTexture,i.TEXTURE0+y)}function J(P,y){let z=n.get(P);if(P.isRenderTargetTexture===!1&&P.version>0&&z.__version!==P.version){Le(z,P,y);return}else P.isExternalTexture&&(z.__webglTexture=P.sourceTexture?P.sourceTexture:null);t.bindTexture(i.TEXTURE_2D_ARRAY,z.__webglTexture,i.TEXTURE0+y)}function ne(P,y){let z=n.get(P);if(P.isRenderTargetTexture===!1&&P.version>0&&z.__version!==P.version){Le(z,P,y);return}t.bindTexture(i.TEXTURE_3D,z.__webglTexture,i.TEXTURE0+y)}function de(P,y){let z=n.get(P);if(P.isCubeDepthTexture!==!0&&P.version>0&&z.__version!==P.version){Ne(z,P,y);return}t.bindTexture(i.TEXTURE_CUBE_MAP,z.__webglTexture,i.TEXTURE0+y)}let ve={[Wa]:i.REPEAT,[Nn]:i.CLAMP_TO_EDGE,[Xa]:i.MIRRORED_REPEAT},Ke={[Dt]:i.NEAREST,[dd]:i.NEAREST_MIPMAP_NEAREST,[Dr]:i.NEAREST_MIPMAP_LINEAR,[Ut]:i.LINEAR,[Co]:i.LINEAR_MIPMAP_NEAREST,[Ci]:i.LINEAR_MIPMAP_LINEAR},dt={[md]:i.NEVER,[vd]:i.ALWAYS,[gd]:i.LESS,[dc]:i.LEQUAL,[xd]:i.EQUAL,[fc]:i.GEQUAL,[_d]:i.GREATER,[yd]:i.NOTEQUAL};function Ze(P,y){if(y.type===Cn&&e.has("OES_texture_float_linear")===!1&&(y.magFilter===Ut||y.magFilter===Co||y.magFilter===Dr||y.magFilter===Ci||y.minFilter===Ut||y.minFilter===Co||y.minFilter===Dr||y.minFilter===Ci)&&Pe("WebGLRenderer: Unable to use linear filtering with floating point textures. OES_texture_float_linear not supported on this device."),i.texParameteri(P,i.TEXTURE_WRAP_S,ve[y.wrapS]),i.texParameteri(P,i.TEXTURE_WRAP_T,ve[y.wrapT]),(P===i.TEXTURE_3D||P===i.TEXTURE_2D_ARRAY)&&i.texParameteri(P,i.TEXTURE_WRAP_R,ve[y.wrapR]),i.texParameteri(P,i.TEXTURE_MAG_FILTER,Ke[y.magFilter]),i.texParameteri(P,i.TEXTURE_MIN_FILTER,Ke[y.minFilter]),y.compareFunction&&(i.texParameteri(P,i.TEXTURE_COMPARE_MODE,i.COMPARE_REF_TO_TEXTURE),i.texParameteri(P,i.TEXTURE_COMPARE_FUNC,dt[y.compareFunction])),e.has("EXT_texture_filter_anisotropic")===!0){if(y.magFilter===Dt||y.minFilter!==Dr&&y.minFilter!==Ci||y.type===Cn&&e.has("OES_texture_float_linear")===!1)return;if(y.anisotropy>1||n.get(y).__currentAnisotropy){let z=e.get("EXT_texture_filter_anisotropic");i.texParameterf(P,z.TEXTURE_MAX_ANISOTROPY_EXT,Math.min(y.anisotropy,s.getMaxAnisotropy())),n.get(y).__currentAnisotropy=y.anisotropy}}}function j(P,y){let z=!1;P.__webglInit===void 0&&(P.__webglInit=!0,y.addEventListener("dispose",w));let G=y.source,q=f.get(G);q===void 0&&(q={},f.set(G,q));let te=B(y);if(te!==P.__cacheKey){q[te]===void 0&&(q[te]={texture:i.createTexture(),usedTimes:0},a.memory.textures++,z=!0),q[te].usedTimes++;let oe=q[P.__cacheKey];oe!==void 0&&(q[P.__cacheKey].usedTimes--,oe.usedTimes===0&&R(y)),P.__cacheKey=te,P.__webglTexture=q[te].texture}return z}function ae(P,y,z){return Math.floor(Math.floor(P/z)/y)}function ee(P,y,z,G){let te=P.updateRanges;if(te.length===0)t.texSubImage2D(i.TEXTURE_2D,0,0,0,y.width,y.height,z,G,y.data);else{te.sort((Ee,ue)=>Ee.start-ue.start);let oe=0;for(let Ee=1;Ee<te.length;Ee++){let ue=te[oe],le=te[Ee],Ae=ue.start+ue.count,Re=ae(le.start,y.width,4),Oe=ae(ue.start,y.width,4);le.start<=Ae+1&&Re===Oe&&ae(le.start+le.count-1,y.width,4)===Re?ue.count=Math.max(ue.count,le.start+le.count-ue.start):(++oe,te[oe]=le)}te.length=oe+1;let Y=t.getParameter(i.UNPACK_ROW_LENGTH),Z=t.getParameter(i.UNPACK_SKIP_PIXELS),ce=t.getParameter(i.UNPACK_SKIP_ROWS);t.pixelStorei(i.UNPACK_ROW_LENGTH,y.width);for(let Ee=0,ue=te.length;Ee<ue;Ee++){let le=te[Ee],Ae=Math.floor(le.start/4),Re=Math.ceil(le.count/4),Oe=Ae%y.width,U=Math.floor(Ae/y.width),re=Re,K=1;t.pixelStorei(i.UNPACK_SKIP_PIXELS,Oe),t.pixelStorei(i.UNPACK_SKIP_ROWS,U),t.texSubImage2D(i.TEXTURE_2D,0,Oe,U,re,K,z,G,y.data)}P.clearUpdateRanges(),t.pixelStorei(i.UNPACK_ROW_LENGTH,Y),t.pixelStorei(i.UNPACK_SKIP_PIXELS,Z),t.pixelStorei(i.UNPACK_SKIP_ROWS,ce)}}function Le(P,y,z){let G=i.TEXTURE_2D;(y.isDataArrayTexture||y.isCompressedArrayTexture)&&(G=i.TEXTURE_2D_ARRAY),y.isData3DTexture&&(G=i.TEXTURE_3D);let q=j(P,y),te=y.source;t.bindTexture(G,P.__webglTexture,i.TEXTURE0+z);let oe=n.get(te);if(te.version!==oe.__version||q===!0){if(t.activeTexture(i.TEXTURE0+z),(typeof ImageBitmap<"u"&&y.image instanceof ImageBitmap)===!1){let K=We.getPrimaries(We.workingColorSpace),he=y.colorSpace===si?null:We.getPrimaries(y.colorSpace),me=y.colorSpace===si||K===he?i.NONE:i.BROWSER_DEFAULT_WEBGL;t.pixelStorei(i.UNPACK_FLIP_Y_WEBGL,y.flipY),t.pixelStorei(i.UNPACK_PREMULTIPLY_ALPHA_WEBGL,y.premultiplyAlpha),t.pixelStorei(i.UNPACK_COLORSPACE_CONVERSION_WEBGL,me)}t.pixelStorei(i.UNPACK_ALIGNMENT,y.unpackAlignment);let Z=g(y.image,!1,s.maxTextureSize);Z=Jt(y,Z);let ce=r.convert(y.format,y.colorSpace),Ee=r.convert(y.type),ue=v(y.internalFormat,ce,Ee,y.normalized,y.colorSpace,y.isVideoTexture);Ze(G,y);let le,Ae=y.mipmaps,Re=y.isVideoTexture!==!0,Oe=oe.__version===void 0||q===!0,U=te.dataReady,re=M(y,Z);if(y.isDepthTexture)ue=A(y.format===Ri,y.type),Oe&&(Re?t.texStorage2D(i.TEXTURE_2D,1,ue,Z.width,Z.height):t.texImage2D(i.TEXTURE_2D,0,ue,Z.width,Z.height,0,ce,Ee,null));else if(y.isDataTexture)if(Ae.length>0){Re&&Oe&&t.texStorage2D(i.TEXTURE_2D,re,ue,Ae[0].width,Ae[0].height);for(let K=0,he=Ae.length;K<he;K++)le=Ae[K],Re?U&&t.texSubImage2D(i.TEXTURE_2D,K,0,0,le.width,le.height,ce,Ee,le.data):t.texImage2D(i.TEXTURE_2D,K,ue,le.width,le.height,0,ce,Ee,le.data);y.generateMipmaps=!1}else Re?(Oe&&t.texStorage2D(i.TEXTURE_2D,re,ue,Z.width,Z.height),U&&ee(y,Z,ce,Ee)):t.texImage2D(i.TEXTURE_2D,0,ue,Z.width,Z.height,0,ce,Ee,Z.data);else if(y.isCompressedTexture)if(y.isCompressedArrayTexture){Re&&Oe&&t.texStorage3D(i.TEXTURE_2D_ARRAY,re,ue,Ae[0].width,Ae[0].height,Z.depth);for(let K=0,he=Ae.length;K<he;K++)if(le=Ae[K],y.format!==yn)if(ce!==null)if(Re){if(U)if(y.layerUpdates.size>0){let me=ih(le.width,le.height,y.format,y.type);for(let Q of y.layerUpdates){let Me=le.data.subarray(Q*me/le.data.BYTES_PER_ELEMENT,(Q+1)*me/le.data.BYTES_PER_ELEMENT);t.compressedTexSubImage3D(i.TEXTURE_2D_ARRAY,K,0,0,Q,le.width,le.height,1,ce,Me)}y.clearLayerUpdates()}else t.compressedTexSubImage3D(i.TEXTURE_2D_ARRAY,K,0,0,0,le.width,le.height,Z.depth,ce,le.data)}else t.compressedTexImage3D(i.TEXTURE_2D_ARRAY,K,ue,le.width,le.height,Z.depth,0,le.data,0,0);else Pe("WebGLRenderer: Attempt to load unsupported compressed texture format in .uploadTexture()");else Re?U&&t.texSubImage3D(i.TEXTURE_2D_ARRAY,K,0,0,0,le.width,le.height,Z.depth,ce,Ee,le.data):t.texImage3D(i.TEXTURE_2D_ARRAY,K,ue,le.width,le.height,Z.depth,0,ce,Ee,le.data)}else{Re&&Oe&&t.texStorage2D(i.TEXTURE_2D,re,ue,Ae[0].width,Ae[0].height);for(let K=0,he=Ae.length;K<he;K++)le=Ae[K],y.format!==yn?ce!==null?Re?U&&t.compressedTexSubImage2D(i.TEXTURE_2D,K,0,0,le.width,le.height,ce,le.data):t.compressedTexImage2D(i.TEXTURE_2D,K,ue,le.width,le.height,0,le.data):Pe("WebGLRenderer: Attempt to load unsupported compressed texture format in .uploadTexture()"):Re?U&&t.texSubImage2D(i.TEXTURE_2D,K,0,0,le.width,le.height,ce,Ee,le.data):t.texImage2D(i.TEXTURE_2D,K,ue,le.width,le.height,0,ce,Ee,le.data)}else if(y.isDataArrayTexture)if(Re){if(Oe&&t.texStorage3D(i.TEXTURE_2D_ARRAY,re,ue,Z.width,Z.height,Z.depth),U)if(y.layerUpdates.size>0){let K=ih(Z.width,Z.height,y.format,y.type);for(let he of y.layerUpdates){let me=Z.data.subarray(he*K/Z.data.BYTES_PER_ELEMENT,(he+1)*K/Z.data.BYTES_PER_ELEMENT);t.texSubImage3D(i.TEXTURE_2D_ARRAY,0,0,0,he,Z.width,Z.height,1,ce,Ee,me)}y.clearLayerUpdates()}else t.texSubImage3D(i.TEXTURE_2D_ARRAY,0,0,0,0,Z.width,Z.height,Z.depth,ce,Ee,Z.data)}else t.texImage3D(i.TEXTURE_2D_ARRAY,0,ue,Z.width,Z.height,Z.depth,0,ce,Ee,Z.data);else if(y.isData3DTexture)Re?(Oe&&t.texStorage3D(i.TEXTURE_3D,re,ue,Z.width,Z.height,Z.depth),U&&t.texSubImage3D(i.TEXTURE_3D,0,0,0,0,Z.width,Z.height,Z.depth,ce,Ee,Z.data)):t.texImage3D(i.TEXTURE_3D,0,ue,Z.width,Z.height,Z.depth,0,ce,Ee,Z.data);else if(y.isFramebufferTexture){if(Oe)if(Re)t.texStorage2D(i.TEXTURE_2D,re,ue,Z.width,Z.height);else{let K=Z.width,he=Z.height;for(let me=0;me<re;me++)t.texImage2D(i.TEXTURE_2D,me,ue,K,he,0,ce,Ee,null),K>>=1,he>>=1}}else if(y.isHTMLTexture){if("texElementImage2D"in i){let K=i.canvas;if(K.hasAttribute("layoutsubtree")||K.setAttribute("layoutsubtree","true"),Z.parentNode!==K){K.appendChild(Z),d.add(y),K.onpaint=he=>{let me=he.changedElements;for(let Q of d)me.includes(Q.image)&&(Q.needsUpdate=!0)},K.requestPaint();return}if(i.texElementImage2D.length===3)i.texElementImage2D(i.TEXTURE_2D,i.RGBA8,Z);else{let me=i.RGBA,Q=i.RGBA,Me=i.UNSIGNED_BYTE;i.texElementImage2D(i.TEXTURE_2D,0,me,Q,Me,Z)}i.texParameteri(i.TEXTURE_2D,i.TEXTURE_MIN_FILTER,i.LINEAR),i.texParameteri(i.TEXTURE_2D,i.TEXTURE_WRAP_S,i.CLAMP_TO_EDGE),i.texParameteri(i.TEXTURE_2D,i.TEXTURE_WRAP_T,i.CLAMP_TO_EDGE)}}else if(Ae.length>0){if(Re&&Oe){let K=Qe(Ae[0]);t.texStorage2D(i.TEXTURE_2D,re,ue,K.width,K.height)}for(let K=0,he=Ae.length;K<he;K++)le=Ae[K],Re?U&&t.texSubImage2D(i.TEXTURE_2D,K,0,0,ce,Ee,le):t.texImage2D(i.TEXTURE_2D,K,ue,ce,Ee,le);y.generateMipmaps=!1}else if(Re){if(Oe){let K=Qe(Z);t.texStorage2D(i.TEXTURE_2D,re,ue,K.width,K.height)}U&&t.texSubImage2D(i.TEXTURE_2D,0,0,0,ce,Ee,Z)}else t.texImage2D(i.TEXTURE_2D,0,ue,ce,Ee,Z);p(y)&&b(G),oe.__version=te.version,y.onUpdate&&y.onUpdate(y)}P.__version=y.version}function Ne(P,y,z){if(y.image.length!==6)return;let G=j(P,y),q=y.source;t.bindTexture(i.TEXTURE_CUBE_MAP,P.__webglTexture,i.TEXTURE0+z);let te=n.get(q);if(q.version!==te.__version||G===!0){t.activeTexture(i.TEXTURE0+z);let oe=We.getPrimaries(We.workingColorSpace),Y=y.colorSpace===si?null:We.getPrimaries(y.colorSpace),Z=y.colorSpace===si||oe===Y?i.NONE:i.BROWSER_DEFAULT_WEBGL;t.pixelStorei(i.UNPACK_FLIP_Y_WEBGL,y.flipY),t.pixelStorei(i.UNPACK_PREMULTIPLY_ALPHA_WEBGL,y.premultiplyAlpha),t.pixelStorei(i.UNPACK_ALIGNMENT,y.unpackAlignment),t.pixelStorei(i.UNPACK_COLORSPACE_CONVERSION_WEBGL,Z);let ce=y.isCompressedTexture||y.image[0].isCompressedTexture,Ee=y.image[0]&&y.image[0].isDataTexture,ue=[];for(let Q=0;Q<6;Q++)!ce&&!Ee?ue[Q]=g(y.image[Q],!0,s.maxCubemapSize):ue[Q]=Ee?y.image[Q].image:y.image[Q],ue[Q]=Jt(y,ue[Q]);let le=ue[0],Ae=r.convert(y.format,y.colorSpace),Re=r.convert(y.type),Oe=v(y.internalFormat,Ae,Re,y.normalized,y.colorSpace),U=y.isVideoTexture!==!0,re=te.__version===void 0||G===!0,K=q.dataReady,he=M(y,le);Ze(i.TEXTURE_CUBE_MAP,y);let me;if(ce){U&&re&&t.texStorage2D(i.TEXTURE_CUBE_MAP,he,Oe,le.width,le.height);for(let Q=0;Q<6;Q++){me=ue[Q].mipmaps;for(let Me=0;Me<me.length;Me++){let be=me[Me];y.format!==yn?Ae!==null?U?K&&t.compressedTexSubImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+Q,Me,0,0,be.width,be.height,Ae,be.data):t.compressedTexImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+Q,Me,Oe,be.width,be.height,0,be.data):Pe("WebGLRenderer: Attempt to load unsupported compressed texture format in .setTextureCube()"):U?K&&t.texSubImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+Q,Me,0,0,be.width,be.height,Ae,Re,be.data):t.texImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+Q,Me,Oe,be.width,be.height,0,Ae,Re,be.data)}}}else{if(me=y.mipmaps,U&&re){me.length>0&&he++;let Q=Qe(ue[0]);t.texStorage2D(i.TEXTURE_CUBE_MAP,he,Oe,Q.width,Q.height)}for(let Q=0;Q<6;Q++)if(Ee){U?K&&t.texSubImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+Q,0,0,0,ue[Q].width,ue[Q].height,Ae,Re,ue[Q].data):t.texImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+Q,0,Oe,ue[Q].width,ue[Q].height,0,Ae,Re,ue[Q].data);for(let Me=0;Me<me.length;Me++){let pt=me[Me].image[Q].image;U?K&&t.texSubImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+Q,Me+1,0,0,pt.width,pt.height,Ae,Re,pt.data):t.texImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+Q,Me+1,Oe,pt.width,pt.height,0,Ae,Re,pt.data)}}else{U?K&&t.texSubImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+Q,0,0,0,Ae,Re,ue[Q]):t.texImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+Q,0,Oe,Ae,Re,ue[Q]);for(let Me=0;Me<me.length;Me++){let be=me[Me];U?K&&t.texSubImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+Q,Me+1,0,0,Ae,Re,be.image[Q]):t.texImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+Q,Me+1,Oe,Ae,Re,be.image[Q])}}}p(y)&&b(i.TEXTURE_CUBE_MAP),te.__version=q.version,y.onUpdate&&y.onUpdate(y)}P.__version=y.version}function Ce(P,y,z,G,q,te){let oe=r.convert(z.format,z.colorSpace),Y=r.convert(z.type),Z=v(z.internalFormat,oe,Y,z.normalized,z.colorSpace),ce=n.get(y),Ee=n.get(z);if(Ee.__renderTarget=y,!ce.__hasExternalTextures){let ue=Math.max(1,y.width>>te),le=Math.max(1,y.height>>te);q===i.TEXTURE_3D||q===i.TEXTURE_2D_ARRAY?t.texImage3D(q,te,Z,ue,le,y.depth,0,oe,Y,null):t.texImage2D(q,te,Z,ue,le,0,oe,Y,null)}t.bindFramebuffer(i.FRAMEBUFFER,P),Mt(y)?o.framebufferTexture2DMultisampleEXT(i.FRAMEBUFFER,G,q,Ee.__webglTexture,0,ft(y)):(q===i.TEXTURE_2D||q>=i.TEXTURE_CUBE_MAP_POSITIVE_X&&q<=i.TEXTURE_CUBE_MAP_NEGATIVE_Z)&&i.framebufferTexture2D(i.FRAMEBUFFER,G,q,Ee.__webglTexture,te),t.bindFramebuffer(i.FRAMEBUFFER,null)}function _t(P,y,z){if(i.bindRenderbuffer(i.RENDERBUFFER,P),y.depthBuffer){let G=y.depthTexture,q=G&&G.isDepthTexture?G.type:null,te=A(y.stencilBuffer,q),oe=y.stencilBuffer?i.DEPTH_STENCIL_ATTACHMENT:i.DEPTH_ATTACHMENT;Mt(y)?o.renderbufferStorageMultisampleEXT(i.RENDERBUFFER,ft(y),te,y.width,y.height):z?i.renderbufferStorageMultisample(i.RENDERBUFFER,ft(y),te,y.width,y.height):i.renderbufferStorage(i.RENDERBUFFER,te,y.width,y.height),i.framebufferRenderbuffer(i.FRAMEBUFFER,oe,i.RENDERBUFFER,P)}else{let G=y.textures;for(let q=0;q<G.length;q++){let te=G[q],oe=r.convert(te.format,te.colorSpace),Y=r.convert(te.type),Z=v(te.internalFormat,oe,Y,te.normalized,te.colorSpace);Mt(y)?o.renderbufferStorageMultisampleEXT(i.RENDERBUFFER,ft(y),Z,y.width,y.height):z?i.renderbufferStorageMultisample(i.RENDERBUFFER,ft(y),Z,y.width,y.height):i.renderbufferStorage(i.RENDERBUFFER,Z,y.width,y.height)}}i.bindRenderbuffer(i.RENDERBUFFER,null)}function Ge(P,y,z){let G=y.isWebGLCubeRenderTarget===!0;if(t.bindFramebuffer(i.FRAMEBUFFER,P),!(y.depthTexture&&y.depthTexture.isDepthTexture))throw new Error("THREE.WebGLTextures: renderTarget.depthTexture must be an instance of THREE.DepthTexture.");let q=n.get(y.depthTexture);if(q.__renderTarget=y,(!q.__webglTexture||y.depthTexture.image.width!==y.width||y.depthTexture.image.height!==y.height)&&(y.depthTexture.image.width=y.width,y.depthTexture.image.height=y.height,y.depthTexture.needsUpdate=!0),G){if(q.__webglInit===void 0&&(q.__webglInit=!0,y.depthTexture.addEventListener("dispose",w)),q.__webglTexture===void 0){q.__webglTexture=i.createTexture(),t.bindTexture(i.TEXTURE_CUBE_MAP,q.__webglTexture),Ze(i.TEXTURE_CUBE_MAP,y.depthTexture);let ce=r.convert(y.depthTexture.format),Ee=r.convert(y.depthTexture.type),ue;y.depthTexture.format===zn?ue=i.DEPTH_COMPONENT24:y.depthTexture.format===Ri&&(ue=i.DEPTH24_STENCIL8);for(let le=0;le<6;le++)i.texImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+le,0,ue,y.width,y.height,0,ce,Ee,null)}}else $(y.depthTexture,0);let te=q.__webglTexture,oe=ft(y),Y=G?i.TEXTURE_CUBE_MAP_POSITIVE_X+z:i.TEXTURE_2D,Z=y.depthTexture.format===Ri?i.DEPTH_STENCIL_ATTACHMENT:i.DEPTH_ATTACHMENT;if(y.depthTexture.format===zn)Mt(y)?o.framebufferTexture2DMultisampleEXT(i.FRAMEBUFFER,Z,Y,te,0,oe):i.framebufferTexture2D(i.FRAMEBUFFER,Z,Y,te,0);else if(y.depthTexture.format===Ri)Mt(y)?o.framebufferTexture2DMultisampleEXT(i.FRAMEBUFFER,Z,Y,te,0,oe):i.framebufferTexture2D(i.FRAMEBUFFER,Z,Y,te,0);else throw new Error("THREE.WebGLTextures: Unknown depthTexture format.")}function it(P){let y=n.get(P),z=P.isWebGLCubeRenderTarget===!0;if(y.__boundDepthTexture!==P.depthTexture){let G=P.depthTexture;if(y.__depthDisposeCallback&&y.__depthDisposeCallback(),G){let q=()=>{delete y.__boundDepthTexture,delete y.__depthDisposeCallback,G.removeEventListener("dispose",q)};G.addEventListener("dispose",q),y.__depthDisposeCallback=q}y.__boundDepthTexture=G}if(P.depthTexture&&!y.__autoAllocateDepthBuffer)if(z)for(let G=0;G<6;G++)Ge(y.__webglFramebuffer[G],P,G);else{let G=P.texture.mipmaps;G&&G.length>0?Ge(y.__webglFramebuffer[0],P,0):Ge(y.__webglFramebuffer,P,0)}else if(z){y.__webglDepthbuffer=[];for(let G=0;G<6;G++)if(t.bindFramebuffer(i.FRAMEBUFFER,y.__webglFramebuffer[G]),y.__webglDepthbuffer[G]===void 0)y.__webglDepthbuffer[G]=i.createRenderbuffer(),_t(y.__webglDepthbuffer[G],P,!1);else{let q=P.stencilBuffer?i.DEPTH_STENCIL_ATTACHMENT:i.DEPTH_ATTACHMENT,te=y.__webglDepthbuffer[G];i.bindRenderbuffer(i.RENDERBUFFER,te),i.framebufferRenderbuffer(i.FRAMEBUFFER,q,i.RENDERBUFFER,te)}}else{let G=P.texture.mipmaps;if(G&&G.length>0?t.bindFramebuffer(i.FRAMEBUFFER,y.__webglFramebuffer[0]):t.bindFramebuffer(i.FRAMEBUFFER,y.__webglFramebuffer),y.__webglDepthbuffer===void 0)y.__webglDepthbuffer=i.createRenderbuffer(),_t(y.__webglDepthbuffer,P,!1);else{let q=P.stencilBuffer?i.DEPTH_STENCIL_ATTACHMENT:i.DEPTH_ATTACHMENT,te=y.__webglDepthbuffer;i.bindRenderbuffer(i.RENDERBUFFER,te),i.framebufferRenderbuffer(i.FRAMEBUFFER,q,i.RENDERBUFFER,te)}}t.bindFramebuffer(i.FRAMEBUFFER,null)}function Je(P,y,z){let G=n.get(P);y!==void 0&&Ce(G.__webglFramebuffer,P,P.texture,i.COLOR_ATTACHMENT0,i.TEXTURE_2D,0),z!==void 0&&it(P)}function Ye(P){let y=P.texture,z=n.get(P),G=n.get(y);P.addEventListener("dispose",x);let q=P.textures,te=P.isWebGLCubeRenderTarget===!0,oe=q.length>1;if(oe||(G.__webglTexture===void 0&&(G.__webglTexture=i.createTexture()),G.__version=y.version,a.memory.textures++),te){z.__webglFramebuffer=[];for(let Y=0;Y<6;Y++)if(y.mipmaps&&y.mipmaps.length>0){z.__webglFramebuffer[Y]=[];for(let Z=0;Z<y.mipmaps.length;Z++)z.__webglFramebuffer[Y][Z]=i.createFramebuffer()}else z.__webglFramebuffer[Y]=i.createFramebuffer()}else{if(y.mipmaps&&y.mipmaps.length>0){z.__webglFramebuffer=[];for(let Y=0;Y<y.mipmaps.length;Y++)z.__webglFramebuffer[Y]=i.createFramebuffer()}else z.__webglFramebuffer=i.createFramebuffer();if(oe)for(let Y=0,Z=q.length;Y<Z;Y++){let ce=n.get(q[Y]);ce.__webglTexture===void 0&&(ce.__webglTexture=i.createTexture(),a.memory.textures++)}if(P.samples>0&&Mt(P)===!1){z.__webglMultisampledFramebuffer=i.createFramebuffer(),z.__webglColorRenderbuffer=[],t.bindFramebuffer(i.FRAMEBUFFER,z.__webglMultisampledFramebuffer);for(let Y=0;Y<q.length;Y++){let Z=q[Y];z.__webglColorRenderbuffer[Y]=i.createRenderbuffer(),i.bindRenderbuffer(i.RENDERBUFFER,z.__webglColorRenderbuffer[Y]);let ce=r.convert(Z.format,Z.colorSpace),Ee=r.convert(Z.type),ue=v(Z.internalFormat,ce,Ee,Z.normalized,Z.colorSpace,P.isXRRenderTarget===!0),le=ft(P);i.renderbufferStorageMultisample(i.RENDERBUFFER,le,ue,P.width,P.height),i.framebufferRenderbuffer(i.FRAMEBUFFER,i.COLOR_ATTACHMENT0+Y,i.RENDERBUFFER,z.__webglColorRenderbuffer[Y])}i.bindRenderbuffer(i.RENDERBUFFER,null),P.depthBuffer&&(z.__webglDepthRenderbuffer=i.createRenderbuffer(),_t(z.__webglDepthRenderbuffer,P,!0)),t.bindFramebuffer(i.FRAMEBUFFER,null)}}if(te){t.bindTexture(i.TEXTURE_CUBE_MAP,G.__webglTexture),Ze(i.TEXTURE_CUBE_MAP,y);for(let Y=0;Y<6;Y++)if(y.mipmaps&&y.mipmaps.length>0)for(let Z=0;Z<y.mipmaps.length;Z++)Ce(z.__webglFramebuffer[Y][Z],P,y,i.COLOR_ATTACHMENT0,i.TEXTURE_CUBE_MAP_POSITIVE_X+Y,Z);else Ce(z.__webglFramebuffer[Y],P,y,i.COLOR_ATTACHMENT0,i.TEXTURE_CUBE_MAP_POSITIVE_X+Y,0);p(y)&&b(i.TEXTURE_CUBE_MAP),t.unbindTexture()}else if(oe){for(let Y=0,Z=q.length;Y<Z;Y++){let ce=q[Y],Ee=n.get(ce),ue=i.TEXTURE_2D;(P.isWebGL3DRenderTarget||P.isWebGLArrayRenderTarget)&&(ue=P.isWebGL3DRenderTarget?i.TEXTURE_3D:i.TEXTURE_2D_ARRAY),t.bindTexture(ue,Ee.__webglTexture),Ze(ue,ce),Ce(z.__webglFramebuffer,P,ce,i.COLOR_ATTACHMENT0+Y,ue,0),p(ce)&&b(ue)}t.unbindTexture()}else{let Y=i.TEXTURE_2D;if((P.isWebGL3DRenderTarget||P.isWebGLArrayRenderTarget)&&(Y=P.isWebGL3DRenderTarget?i.TEXTURE_3D:i.TEXTURE_2D_ARRAY),t.bindTexture(Y,G.__webglTexture),Ze(Y,y),y.mipmaps&&y.mipmaps.length>0)for(let Z=0;Z<y.mipmaps.length;Z++)Ce(z.__webglFramebuffer[Z],P,y,i.COLOR_ATTACHMENT0,Y,Z);else Ce(z.__webglFramebuffer,P,y,i.COLOR_ATTACHMENT0,Y,0);p(y)&&b(Y),t.unbindTexture()}P.depthBuffer&&it(P)}function St(P){let y=P.textures;for(let z=0,G=y.length;z<G;z++){let q=y[z];if(p(q)){let te=E(P),oe=n.get(q).__webglTexture;t.bindTexture(te,oe),b(te),t.unbindTexture()}}}let Tt=[],It=[];function Ft(P){if(P.samples>0){if(Mt(P)===!1){let y=P.textures,z=P.width,G=P.height,q=i.COLOR_BUFFER_BIT,te=P.stencilBuffer?i.DEPTH_STENCIL_ATTACHMENT:i.DEPTH_ATTACHMENT,oe=n.get(P),Y=y.length>1;if(Y)for(let ce=0;ce<y.length;ce++)t.bindFramebuffer(i.FRAMEBUFFER,oe.__webglMultisampledFramebuffer),i.framebufferRenderbuffer(i.FRAMEBUFFER,i.COLOR_ATTACHMENT0+ce,i.RENDERBUFFER,null),t.bindFramebuffer(i.FRAMEBUFFER,oe.__webglFramebuffer),i.framebufferTexture2D(i.DRAW_FRAMEBUFFER,i.COLOR_ATTACHMENT0+ce,i.TEXTURE_2D,null,0);t.bindFramebuffer(i.READ_FRAMEBUFFER,oe.__webglMultisampledFramebuffer);let Z=P.texture.mipmaps;Z&&Z.length>0?t.bindFramebuffer(i.DRAW_FRAMEBUFFER,oe.__webglFramebuffer[0]):t.bindFramebuffer(i.DRAW_FRAMEBUFFER,oe.__webglFramebuffer);for(let ce=0;ce<y.length;ce++){if(P.resolveDepthBuffer&&(P.depthBuffer&&(q|=i.DEPTH_BUFFER_BIT),P.stencilBuffer&&P.resolveStencilBuffer&&(q|=i.STENCIL_BUFFER_BIT)),Y){i.framebufferRenderbuffer(i.READ_FRAMEBUFFER,i.COLOR_ATTACHMENT0,i.RENDERBUFFER,oe.__webglColorRenderbuffer[ce]);let Ee=n.get(y[ce]).__webglTexture;i.framebufferTexture2D(i.DRAW_FRAMEBUFFER,i.COLOR_ATTACHMENT0,i.TEXTURE_2D,Ee,0)}i.blitFramebuffer(0,0,z,G,0,0,z,G,q,i.NEAREST),c===!0&&(Tt.length=0,It.length=0,Tt.push(i.COLOR_ATTACHMENT0+ce),P.depthBuffer&&P.resolveDepthBuffer===!1&&(Tt.push(te),It.push(te),i.invalidateFramebuffer(i.DRAW_FRAMEBUFFER,It)),i.invalidateFramebuffer(i.READ_FRAMEBUFFER,Tt))}if(t.bindFramebuffer(i.READ_FRAMEBUFFER,null),t.bindFramebuffer(i.DRAW_FRAMEBUFFER,null),Y)for(let ce=0;ce<y.length;ce++){t.bindFramebuffer(i.FRAMEBUFFER,oe.__webglMultisampledFramebuffer),i.framebufferRenderbuffer(i.FRAMEBUFFER,i.COLOR_ATTACHMENT0+ce,i.RENDERBUFFER,oe.__webglColorRenderbuffer[ce]);let Ee=n.get(y[ce]).__webglTexture;t.bindFramebuffer(i.FRAMEBUFFER,oe.__webglFramebuffer),i.framebufferTexture2D(i.DRAW_FRAMEBUFFER,i.COLOR_ATTACHMENT0+ce,i.TEXTURE_2D,Ee,0)}t.bindFramebuffer(i.DRAW_FRAMEBUFFER,oe.__webglMultisampledFramebuffer)}else if(P.depthBuffer&&P.resolveDepthBuffer===!1&&c){let y=P.stencilBuffer?i.DEPTH_STENCIL_ATTACHMENT:i.DEPTH_ATTACHMENT;i.invalidateFramebuffer(i.DRAW_FRAMEBUFFER,[y])}}}function ft(P){return Math.min(s.maxSamples,P.samples)}function Mt(P){let y=n.get(P);return P.samples>0&&e.has("WEBGL_multisampled_render_to_texture")===!0&&y.__useRenderToTexture!==!1}function N(P){let y=a.render.frame;h.get(P)!==y&&(h.set(P,y),P.update())}function Jt(P,y){let z=P.colorSpace,G=P.format,q=P.type;return P.isCompressedTexture===!0||P.isVideoTexture===!0||z!==tr&&z!==si&&(We.getTransfer(z)===je?(G!==yn||q!==fn)&&Pe("WebGLTextures: sRGB encoded textures have to use RGBAFormat and UnsignedByteType."):Ie("WebGLTextures: Unsupported texture color space:",z)),y}function Qe(P){return typeof HTMLImageElement<"u"&&P instanceof HTMLImageElement?(l.width=P.naturalWidth||P.width,l.height=P.naturalHeight||P.height):typeof VideoFrame<"u"&&P instanceof VideoFrame?(l.width=P.displayWidth,l.height=P.displayHeight):(l.width=P.width,l.height=P.height),l}this.allocateTextureUnit=X,this.resetTextureUnits=I,this.getTextureUnits=V,this.setTextureUnits=F,this.setTexture2D=$,this.setTexture2DArray=J,this.setTexture3D=ne,this.setTextureCube=de,this.rebindTextures=Je,this.setupRenderTarget=Ye,this.updateRenderTargetMipmap=St,this.updateMultisampleRenderTarget=Ft,this.setupDepthRenderbuffer=it,this.setupFrameBufferTexture=Ce,this.useMultisampledRTT=Mt,this.isReversedDepthBuffer=function(){return t.buffers.depth.getReversed()}}function hy(i,e){function t(n,s=si){let r,a=We.getTransfer(s);if(n===fn)return i.UNSIGNED_BYTE;if(n===Io)return i.UNSIGNED_SHORT_4_4_4_4;if(n===Lo)return i.UNSIGNED_SHORT_5_5_5_1;if(n===Wl)return i.UNSIGNED_INT_5_9_9_9_REV;if(n===Xl)return i.UNSIGNED_INT_10F_11F_11F_REV;if(n===Hl)return i.BYTE;if(n===Gl)return i.SHORT;if(n===Ds)return i.UNSIGNED_SHORT;if(n===Ro)return i.INT;if(n===Pn)return i.UNSIGNED_INT;if(n===Cn)return i.FLOAT;if(n===Gn)return i.HALF_FLOAT;if(n===ql)return i.ALPHA;if(n===Yl)return i.RGB;if(n===yn)return i.RGBA;if(n===zn)return i.DEPTH_COMPONENT;if(n===Ri)return i.DEPTH_STENCIL;if(n===$l)return i.RED;if(n===Do)return i.RED_INTEGER;if(n===Ii)return i.RG;if(n===Fo)return i.RG_INTEGER;if(n===Uo)return i.RGBA_INTEGER;if(n===Fr||n===Ur||n===Nr||n===Or)if(a===je)if(r=e.get("WEBGL_compressed_texture_s3tc_srgb"),r!==null){if(n===Fr)return r.COMPRESSED_SRGB_S3TC_DXT1_EXT;if(n===Ur)return r.COMPRESSED_SRGB_ALPHA_S3TC_DXT1_EXT;if(n===Nr)return r.COMPRESSED_SRGB_ALPHA_S3TC_DXT3_EXT;if(n===Or)return r.COMPRESSED_SRGB_ALPHA_S3TC_DXT5_EXT}else return null;else if(r=e.get("WEBGL_compressed_texture_s3tc"),r!==null){if(n===Fr)return r.COMPRESSED_RGB_S3TC_DXT1_EXT;if(n===Ur)return r.COMPRESSED_RGBA_S3TC_DXT1_EXT;if(n===Nr)return r.COMPRESSED_RGBA_S3TC_DXT3_EXT;if(n===Or)return r.COMPRESSED_RGBA_S3TC_DXT5_EXT}else return null;if(n===No||n===Oo||n===Bo||n===zo)if(r=e.get("WEBGL_compressed_texture_pvrtc"),r!==null){if(n===No)return r.COMPRESSED_RGB_PVRTC_4BPPV1_IMG;if(n===Oo)return r.COMPRESSED_RGB_PVRTC_2BPPV1_IMG;if(n===Bo)return r.COMPRESSED_RGBA_PVRTC_4BPPV1_IMG;if(n===zo)return r.COMPRESSED_RGBA_PVRTC_2BPPV1_IMG}else return null;if(n===Vo||n===ko||n===Ho||n===Go||n===Wo||n===Br||n===Xo)if(r=e.get("WEBGL_compressed_texture_etc"),r!==null){if(n===Vo||n===ko)return a===je?r.COMPRESSED_SRGB8_ETC2:r.COMPRESSED_RGB8_ETC2;if(n===Ho)return a===je?r.COMPRESSED_SRGB8_ALPHA8_ETC2_EAC:r.COMPRESSED_RGBA8_ETC2_EAC;if(n===Go)return r.COMPRESSED_R11_EAC;if(n===Wo)return r.COMPRESSED_SIGNED_R11_EAC;if(n===Br)return r.COMPRESSED_RG11_EAC;if(n===Xo)return r.COMPRESSED_SIGNED_RG11_EAC}else return null;if(n===qo||n===Yo||n===$o||n===Ko||n===Zo||n===Jo||n===jo||n===Qo||n===ec||n===tc||n===nc||n===ic||n===sc||n===rc)if(r=e.get("WEBGL_compressed_texture_astc"),r!==null){if(n===qo)return a===je?r.COMPRESSED_SRGB8_ALPHA8_ASTC_4x4_KHR:r.COMPRESSED_RGBA_ASTC_4x4_KHR;if(n===Yo)return a===je?r.COMPRESSED_SRGB8_ALPHA8_ASTC_5x4_KHR:r.COMPRESSED_RGBA_ASTC_5x4_KHR;if(n===$o)return a===je?r.COMPRESSED_SRGB8_ALPHA8_ASTC_5x5_KHR:r.COMPRESSED_RGBA_ASTC_5x5_KHR;if(n===Ko)return a===je?r.COMPRESSED_SRGB8_ALPHA8_ASTC_6x5_KHR:r.COMPRESSED_RGBA_ASTC_6x5_KHR;if(n===Zo)return a===je?r.COMPRESSED_SRGB8_ALPHA8_ASTC_6x6_KHR:r.COMPRESSED_RGBA_ASTC_6x6_KHR;if(n===Jo)return a===je?r.COMPRESSED_SRGB8_ALPHA8_ASTC_8x5_KHR:r.COMPRESSED_RGBA_ASTC_8x5_KHR;if(n===jo)return a===je?r.COMPRESSED_SRGB8_ALPHA8_ASTC_8x6_KHR:r.COMPRESSED_RGBA_ASTC_8x6_KHR;if(n===Qo)return a===je?r.COMPRESSED_SRGB8_ALPHA8_ASTC_8x8_KHR:r.COMPRESSED_RGBA_ASTC_8x8_KHR;if(n===ec)return a===je?r.COMPRESSED_SRGB8_ALPHA8_ASTC_10x5_KHR:r.COMPRESSED_RGBA_ASTC_10x5_KHR;if(n===tc)return a===je?r.COMPRESSED_SRGB8_ALPHA8_ASTC_10x6_KHR:r.COMPRESSED_RGBA_ASTC_10x6_KHR;if(n===nc)return a===je?r.COMPRESSED_SRGB8_ALPHA8_ASTC_10x8_KHR:r.COMPRESSED_RGBA_ASTC_10x8_KHR;if(n===ic)return a===je?r.COMPRESSED_SRGB8_ALPHA8_ASTC_10x10_KHR:r.COMPRESSED_RGBA_ASTC_10x10_KHR;if(n===sc)return a===je?r.COMPRESSED_SRGB8_ALPHA8_ASTC_12x10_KHR:r.COMPRESSED_RGBA_ASTC_12x10_KHR;if(n===rc)return a===je?r.COMPRESSED_SRGB8_ALPHA8_ASTC_12x12_KHR:r.COMPRESSED_RGBA_ASTC_12x12_KHR}else return null;if(n===ac||n===oc||n===cc)if(r=e.get("EXT_texture_compression_bptc"),r!==null){if(n===ac)return a===je?r.COMPRESSED_SRGB_ALPHA_BPTC_UNORM_EXT:r.COMPRESSED_RGBA_BPTC_UNORM_EXT;if(n===oc)return r.COMPRESSED_RGB_BPTC_SIGNED_FLOAT_EXT;if(n===cc)return r.COMPRESSED_RGB_BPTC_UNSIGNED_FLOAT_EXT}else return null;if(n===lc||n===hc||n===zr||n===uc)if(r=e.get("EXT_texture_compression_rgtc"),r!==null){if(n===lc)return r.COMPRESSED_RED_RGTC1_EXT;if(n===hc)return r.COMPRESSED_SIGNED_RED_RGTC1_EXT;if(n===zr)return r.COMPRESSED_RED_GREEN_RGTC2_EXT;if(n===uc)return r.COMPRESSED_SIGNED_RED_GREEN_RGTC2_EXT}else return null;return n===Fs?i.UNSIGNED_INT_24_8:i[n]!==void 0?i[n]:null}return{convert:t}}var uy=`
void main() {

	gl_Position = vec4( position, 1.0 );

}`,dy=`
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

}`,Sh=class{constructor(){this.texture=null,this.mesh=null,this.depthNear=0,this.depthFar=0}init(e,t){if(this.texture===null){let n=new mr(e.texture);(e.depthNear!==t.depthNear||e.depthFar!==t.depthFar)&&(this.depthNear=e.depthNear,this.depthFar=e.depthFar),this.texture=n}}getMesh(e){if(this.texture!==null&&this.mesh===null){let t=e.cameras[0].viewport,n=new $t({vertexShader:uy,fragmentShader:dy,uniforms:{depthColor:{value:this.texture},depthWidth:{value:t.z},depthHeight:{value:t.w}}});this.mesh=new Ot(new Mr(20,20),n)}return this.mesh}reset(){this.texture=null,this.mesh=null}getDepthTexture(){return this.texture}},Mh=class extends Vn{constructor(e,t){super();let n=this,s=null,r=1,a=null,o="local-floor",c=1,l=null,h=null,d=null,u=null,f=null,m=null,_=typeof XRWebGLBinding<"u",g=new Sh,p={},b=t.getContextAttributes(),E=null,v=null,A=[],M=[],w=new _e,x=null,T=new Wt;T.viewport=new tt;let R=new Wt;R.viewport=new tt;let C=[T,R],D=new Eo,I=null,V=null;this.cameraAutoUpdate=!0,this.enabled=!1,this.isPresenting=!1,this.getController=function(j){let ae=A[j];return ae===void 0&&(ae=new Ts,A[j]=ae),ae.getTargetRaySpace()},this.getControllerGrip=function(j){let ae=A[j];return ae===void 0&&(ae=new Ts,A[j]=ae),ae.getGripSpace()},this.getHand=function(j){let ae=A[j];return ae===void 0&&(ae=new Ts,A[j]=ae),ae.getHandSpace()};function F(j){let ae=M.indexOf(j.inputSource);if(ae===-1)return;let ee=A[ae];ee!==void 0&&(ee.update(j.inputSource,j.frame,l||a),ee.dispatchEvent({type:j.type,data:j.inputSource}))}function X(){s.removeEventListener("select",F),s.removeEventListener("selectstart",F),s.removeEventListener("selectend",F),s.removeEventListener("squeeze",F),s.removeEventListener("squeezestart",F),s.removeEventListener("squeezeend",F),s.removeEventListener("end",X),s.removeEventListener("inputsourceschange",B);for(let j=0;j<A.length;j++){let ae=M[j];ae!==null&&(M[j]=null,A[j].disconnect(ae))}I=null,V=null,g.reset();for(let j in p)delete p[j];e.setRenderTarget(E),f=null,u=null,d=null,s=null,v=null,Ze.stop(),n.isPresenting=!1,e.setPixelRatio(x),e.setSize(w.width,w.height,!1),n.dispatchEvent({type:"sessionend"})}this.setFramebufferScaleFactor=function(j){r=j,n.isPresenting===!0&&Pe("WebXRManager: Cannot change framebuffer scale while presenting.")},this.setReferenceSpaceType=function(j){o=j,n.isPresenting===!0&&Pe("WebXRManager: Cannot change reference space type while presenting.")},this.getReferenceSpace=function(){return l||a},this.setReferenceSpace=function(j){l=j},this.getBaseLayer=function(){return u!==null?u:f},this.getBinding=function(){return d===null&&_&&(d=new XRWebGLBinding(s,t)),d},this.getFrame=function(){return m},this.getSession=function(){return s},this.setSession=async function(j){if(s=j,s!==null){if(E=e.getRenderTarget(),s.addEventListener("select",F),s.addEventListener("selectstart",F),s.addEventListener("selectend",F),s.addEventListener("squeeze",F),s.addEventListener("squeezestart",F),s.addEventListener("squeezeend",F),s.addEventListener("end",X),s.addEventListener("inputsourceschange",B),b.xrCompatible!==!0&&await t.makeXRCompatible(),x=e.getPixelRatio(),e.getSize(w),_&&"createProjectionLayer"in XRWebGLBinding.prototype){let ee=null,Le=null,Ne=null;b.depth&&(Ne=b.stencil?t.DEPTH24_STENCIL8:t.DEPTH_COMPONENT24,ee=b.stencil?Ri:zn,Le=b.stencil?Fs:Pn);let Ce={colorFormat:t.RGBA8,depthFormat:Ne,scaleFactor:r};d=this.getBinding(),u=d.createProjectionLayer(Ce),s.updateRenderState({layers:[u]}),e.setPixelRatio(1),e.setSize(u.textureWidth,u.textureHeight,!1),v=new cn(u.textureWidth,u.textureHeight,{format:yn,type:fn,depthTexture:new ii(u.textureWidth,u.textureHeight,Le,void 0,void 0,void 0,void 0,void 0,void 0,ee),stencilBuffer:b.stencil,colorSpace:e.outputColorSpace,samples:b.antialias?4:0,resolveDepthBuffer:u.ignoreDepthValues===!1,resolveStencilBuffer:u.ignoreDepthValues===!1})}else{let ee={antialias:b.antialias,alpha:!0,depth:b.depth,stencil:b.stencil,framebufferScaleFactor:r};f=new XRWebGLLayer(s,t,ee),s.updateRenderState({baseLayer:f}),e.setPixelRatio(1),e.setSize(f.framebufferWidth,f.framebufferHeight,!1),v=new cn(f.framebufferWidth,f.framebufferHeight,{format:yn,type:fn,colorSpace:e.outputColorSpace,stencilBuffer:b.stencil,resolveDepthBuffer:f.ignoreDepthValues===!1,resolveStencilBuffer:f.ignoreDepthValues===!1})}v.isXRRenderTarget=!0,this.setFoveation(c),l=null,a=await s.requestReferenceSpace(o),Ze.setContext(s),Ze.start(),n.isPresenting=!0,n.dispatchEvent({type:"sessionstart"})}},this.getEnvironmentBlendMode=function(){if(s!==null)return s.environmentBlendMode},this.getDepthTexture=function(){return g.getDepthTexture()};function B(j){for(let ae=0;ae<j.removed.length;ae++){let ee=j.removed[ae],Le=M.indexOf(ee);Le>=0&&(M[Le]=null,A[Le].disconnect(ee))}for(let ae=0;ae<j.added.length;ae++){let ee=j.added[ae],Le=M.indexOf(ee);if(Le===-1){for(let Ce=0;Ce<A.length;Ce++)if(Ce>=M.length){M.push(ee),Le=Ce;break}else if(M[Ce]===null){M[Ce]=ee,Le=Ce;break}if(Le===-1)break}let Ne=A[Le];Ne&&Ne.connect(ee)}}let $=new L,J=new L;function ne(j,ae,ee){$.setFromMatrixPosition(ae.matrixWorld),J.setFromMatrixPosition(ee.matrixWorld);let Le=$.distanceTo(J),Ne=ae.projectionMatrix.elements,Ce=ee.projectionMatrix.elements,_t=Ne[14]/(Ne[10]-1),Ge=Ne[14]/(Ne[10]+1),it=(Ne[9]+1)/Ne[5],Je=(Ne[9]-1)/Ne[5],Ye=(Ne[8]-1)/Ne[0],St=(Ce[8]+1)/Ce[0],Tt=_t*Ye,It=_t*St,Ft=Le/(-Ye+St),ft=Ft*-Ye;if(ae.matrixWorld.decompose(j.position,j.quaternion,j.scale),j.translateX(ft),j.translateZ(Ft),j.matrixWorld.compose(j.position,j.quaternion,j.scale),j.matrixWorldInverse.copy(j.matrixWorld).invert(),Ne[10]===-1)j.projectionMatrix.copy(ae.projectionMatrix),j.projectionMatrixInverse.copy(ae.projectionMatrixInverse);else{let Mt=_t+Ft,N=Ge+Ft,Jt=Tt-ft,Qe=It+(Le-ft),P=it*Ge/N*Mt,y=Je*Ge/N*Mt;j.projectionMatrix.makePerspective(Jt,Qe,P,y,Mt,N),j.projectionMatrixInverse.copy(j.projectionMatrix).invert()}}function de(j,ae){ae===null?j.matrixWorld.copy(j.matrix):j.matrixWorld.multiplyMatrices(ae.matrixWorld,j.matrix),j.matrixWorldInverse.copy(j.matrixWorld).invert()}this.updateCamera=function(j){if(s===null)return;let ae=j.near,ee=j.far;g.texture!==null&&(g.depthNear>0&&(ae=g.depthNear),g.depthFar>0&&(ee=g.depthFar)),D.near=R.near=T.near=ae,D.far=R.far=T.far=ee,(I!==D.near||V!==D.far)&&(s.updateRenderState({depthNear:D.near,depthFar:D.far}),I=D.near,V=D.far),D.layers.mask=j.layers.mask|6,T.layers.mask=D.layers.mask&-5,R.layers.mask=D.layers.mask&-3;let Le=j.parent,Ne=D.cameras;de(D,Le);for(let Ce=0;Ce<Ne.length;Ce++)de(Ne[Ce],Le);Ne.length===2?ne(D,T,R):D.projectionMatrix.copy(T.projectionMatrix),ve(j,D,Le)};function ve(j,ae,ee){ee===null?j.matrix.copy(ae.matrixWorld):(j.matrix.copy(ee.matrixWorld),j.matrix.invert(),j.matrix.multiply(ae.matrixWorld)),j.matrix.decompose(j.position,j.quaternion,j.scale),j.updateMatrixWorld(!0),j.projectionMatrix.copy(ae.projectionMatrix),j.projectionMatrixInverse.copy(ae.projectionMatrixInverse),j.isPerspectiveCamera&&(j.fov=Es*2*Math.atan(1/j.projectionMatrix.elements[5]),j.zoom=1)}this.getCamera=function(){return D},this.getFoveation=function(){if(!(u===null&&f===null))return c},this.setFoveation=function(j){c=j,u!==null&&(u.fixedFoveation=j),f!==null&&f.fixedFoveation!==void 0&&(f.fixedFoveation=j)},this.hasDepthSensing=function(){return g.texture!==null},this.getDepthSensingMesh=function(){return g.getMesh(D)},this.getCameraTexture=function(j){return p[j]};let Ke=null;function dt(j,ae){if(h=ae.getViewerPose(l||a),m=ae,h!==null){let ee=h.views;f!==null&&(e.setRenderTargetFramebuffer(v,f.framebuffer),e.setRenderTarget(v));let Le=!1;ee.length!==D.cameras.length&&(D.cameras.length=0,Le=!0);for(let Ge=0;Ge<ee.length;Ge++){let it=ee[Ge],Je=null;if(f!==null)Je=f.getViewport(it);else{let St=d.getViewSubImage(u,it);Je=St.viewport,Ge===0&&(e.setRenderTargetTextures(v,St.colorTexture,St.depthStencilTexture),e.setRenderTarget(v))}let Ye=C[Ge];Ye===void 0&&(Ye=new Wt,Ye.layers.enable(Ge),Ye.viewport=new tt,C[Ge]=Ye),Ye.matrix.fromArray(it.transform.matrix),Ye.matrix.decompose(Ye.position,Ye.quaternion,Ye.scale),Ye.projectionMatrix.fromArray(it.projectionMatrix),Ye.projectionMatrixInverse.copy(Ye.projectionMatrix).invert(),Ye.viewport.set(Je.x,Je.y,Je.width,Je.height),Ge===0&&(D.matrix.copy(Ye.matrix),D.matrix.decompose(D.position,D.quaternion,D.scale)),Le===!0&&D.cameras.push(Ye)}let Ne=s.enabledFeatures;if(Ne&&Ne.includes("depth-sensing")&&s.depthUsage=="gpu-optimized"&&_){d=n.getBinding();let Ge=d.getDepthInformation(ee[0]);Ge&&Ge.isValid&&Ge.texture&&g.init(Ge,s.renderState)}if(Ne&&Ne.includes("camera-access")&&_){e.state.unbindTexture(),d=n.getBinding();for(let Ge=0;Ge<ee.length;Ge++){let it=ee[Ge].camera;if(it){let Je=p[it];Je||(Je=new mr,p[it]=Je);let Ye=d.getCameraImage(it);Je.sourceTexture=Ye}}}}for(let ee=0;ee<A.length;ee++){let Le=M[ee],Ne=A[ee];Le!==null&&Ne!==void 0&&Ne.update(Le,ae,l||a)}Ke&&Ke(j,ae),ae.detectedPlanes&&n.dispatchEvent({type:"planesdetected",data:ae}),m=null}let Ze=new Qd;Ze.setAnimationLoop(dt),this.setAnimationLoop=function(j){Ke=j},this.dispose=function(){}}},fy=new at,af=new De;af.set(-1,0,0,0,1,0,0,0,1);function py(i,e){function t(g,p){g.matrixAutoUpdate===!0&&g.updateMatrix(),p.value.copy(g.matrix)}function n(g,p){p.color.getRGB(g.fogColor.value,eh(i)),p.isFog?(g.fogNear.value=p.near,g.fogFar.value=p.far):p.isFogExp2&&(g.fogDensity.value=p.density)}function s(g,p,b,E,v){p.isNodeMaterial?p.uniformsNeedUpdate=!1:p.isMeshBasicMaterial?r(g,p):p.isMeshLambertMaterial?(r(g,p),p.envMap&&(g.envMapIntensity.value=p.envMapIntensity)):p.isMeshToonMaterial?(r(g,p),d(g,p)):p.isMeshPhongMaterial?(r(g,p),h(g,p),p.envMap&&(g.envMapIntensity.value=p.envMapIntensity)):p.isMeshStandardMaterial?(r(g,p),u(g,p),p.isMeshPhysicalMaterial&&f(g,p,v)):p.isMeshMatcapMaterial?(r(g,p),m(g,p)):p.isMeshDepthMaterial?r(g,p):p.isMeshDistanceMaterial?(r(g,p),_(g,p)):p.isMeshNormalMaterial?r(g,p):p.isLineBasicMaterial?(a(g,p),p.isLineDashedMaterial&&o(g,p)):p.isPointsMaterial?c(g,p,b,E):p.isSpriteMaterial?l(g,p):p.isShadowMaterial?(g.color.value.copy(p.color),g.opacity.value=p.opacity):p.isShaderMaterial&&(p.uniformsNeedUpdate=!1)}function r(g,p){g.opacity.value=p.opacity,p.color&&g.diffuse.value.copy(p.color),p.emissive&&g.emissive.value.copy(p.emissive).multiplyScalar(p.emissiveIntensity),p.map&&(g.map.value=p.map,t(p.map,g.mapTransform)),p.alphaMap&&(g.alphaMap.value=p.alphaMap,t(p.alphaMap,g.alphaMapTransform)),p.bumpMap&&(g.bumpMap.value=p.bumpMap,t(p.bumpMap,g.bumpMapTransform),g.bumpScale.value=p.bumpScale,p.side===Kt&&(g.bumpScale.value*=-1)),p.normalMap&&(g.normalMap.value=p.normalMap,t(p.normalMap,g.normalMapTransform),g.normalScale.value.copy(p.normalScale),p.side===Kt&&g.normalScale.value.negate()),p.displacementMap&&(g.displacementMap.value=p.displacementMap,t(p.displacementMap,g.displacementMapTransform),g.displacementScale.value=p.displacementScale,g.displacementBias.value=p.displacementBias),p.emissiveMap&&(g.emissiveMap.value=p.emissiveMap,t(p.emissiveMap,g.emissiveMapTransform)),p.specularMap&&(g.specularMap.value=p.specularMap,t(p.specularMap,g.specularMapTransform)),p.alphaTest>0&&(g.alphaTest.value=p.alphaTest);let b=e.get(p),E=b.envMap,v=b.envMapRotation;E&&(g.envMap.value=E,g.envMapRotation.value.setFromMatrix4(fy.makeRotationFromEuler(v)).transpose(),E.isCubeTexture&&E.isRenderTargetTexture===!1&&g.envMapRotation.value.premultiply(af),g.reflectivity.value=p.reflectivity,g.ior.value=p.ior,g.refractionRatio.value=p.refractionRatio),p.lightMap&&(g.lightMap.value=p.lightMap,g.lightMapIntensity.value=p.lightMapIntensity,t(p.lightMap,g.lightMapTransform)),p.aoMap&&(g.aoMap.value=p.aoMap,g.aoMapIntensity.value=p.aoMapIntensity,t(p.aoMap,g.aoMapTransform))}function a(g,p){g.diffuse.value.copy(p.color),g.opacity.value=p.opacity,p.map&&(g.map.value=p.map,t(p.map,g.mapTransform))}function o(g,p){g.dashSize.value=p.dashSize,g.totalSize.value=p.dashSize+p.gapSize,g.scale.value=p.scale}function c(g,p,b,E){g.diffuse.value.copy(p.color),g.opacity.value=p.opacity,g.size.value=p.size*b,g.scale.value=E*.5,p.map&&(g.map.value=p.map,t(p.map,g.uvTransform)),p.alphaMap&&(g.alphaMap.value=p.alphaMap,t(p.alphaMap,g.alphaMapTransform)),p.alphaTest>0&&(g.alphaTest.value=p.alphaTest)}function l(g,p){g.diffuse.value.copy(p.color),g.opacity.value=p.opacity,g.rotation.value=p.rotation,p.map&&(g.map.value=p.map,t(p.map,g.mapTransform)),p.alphaMap&&(g.alphaMap.value=p.alphaMap,t(p.alphaMap,g.alphaMapTransform)),p.alphaTest>0&&(g.alphaTest.value=p.alphaTest)}function h(g,p){g.specular.value.copy(p.specular),g.shininess.value=Math.max(p.shininess,1e-4)}function d(g,p){p.gradientMap&&(g.gradientMap.value=p.gradientMap)}function u(g,p){g.metalness.value=p.metalness,p.metalnessMap&&(g.metalnessMap.value=p.metalnessMap,t(p.metalnessMap,g.metalnessMapTransform)),g.roughness.value=p.roughness,p.roughnessMap&&(g.roughnessMap.value=p.roughnessMap,t(p.roughnessMap,g.roughnessMapTransform)),p.envMap&&(g.envMapIntensity.value=p.envMapIntensity)}function f(g,p,b){g.ior.value=p.ior,p.sheen>0&&(g.sheenColor.value.copy(p.sheenColor).multiplyScalar(p.sheen),g.sheenRoughness.value=p.sheenRoughness,p.sheenColorMap&&(g.sheenColorMap.value=p.sheenColorMap,t(p.sheenColorMap,g.sheenColorMapTransform)),p.sheenRoughnessMap&&(g.sheenRoughnessMap.value=p.sheenRoughnessMap,t(p.sheenRoughnessMap,g.sheenRoughnessMapTransform))),p.clearcoat>0&&(g.clearcoat.value=p.clearcoat,g.clearcoatRoughness.value=p.clearcoatRoughness,p.clearcoatMap&&(g.clearcoatMap.value=p.clearcoatMap,t(p.clearcoatMap,g.clearcoatMapTransform)),p.clearcoatRoughnessMap&&(g.clearcoatRoughnessMap.value=p.clearcoatRoughnessMap,t(p.clearcoatRoughnessMap,g.clearcoatRoughnessMapTransform)),p.clearcoatNormalMap&&(g.clearcoatNormalMap.value=p.clearcoatNormalMap,t(p.clearcoatNormalMap,g.clearcoatNormalMapTransform),g.clearcoatNormalScale.value.copy(p.clearcoatNormalScale),p.side===Kt&&g.clearcoatNormalScale.value.negate())),p.dispersion>0&&(g.dispersion.value=p.dispersion),p.iridescence>0&&(g.iridescence.value=p.iridescence,g.iridescenceIOR.value=p.iridescenceIOR,g.iridescenceThicknessMinimum.value=p.iridescenceThicknessRange[0],g.iridescenceThicknessMaximum.value=p.iridescenceThicknessRange[1],p.iridescenceMap&&(g.iridescenceMap.value=p.iridescenceMap,t(p.iridescenceMap,g.iridescenceMapTransform)),p.iridescenceThicknessMap&&(g.iridescenceThicknessMap.value=p.iridescenceThicknessMap,t(p.iridescenceThicknessMap,g.iridescenceThicknessMapTransform))),p.transmission>0&&(g.transmission.value=p.transmission,g.transmissionSamplerMap.value=b.texture,g.transmissionSamplerSize.value.set(b.width,b.height),p.transmissionMap&&(g.transmissionMap.value=p.transmissionMap,t(p.transmissionMap,g.transmissionMapTransform)),g.thickness.value=p.thickness,p.thicknessMap&&(g.thicknessMap.value=p.thicknessMap,t(p.thicknessMap,g.thicknessMapTransform)),g.attenuationDistance.value=p.attenuationDistance,g.attenuationColor.value.copy(p.attenuationColor)),p.anisotropy>0&&(g.anisotropyVector.value.set(p.anisotropy*Math.cos(p.anisotropyRotation),p.anisotropy*Math.sin(p.anisotropyRotation)),p.anisotropyMap&&(g.anisotropyMap.value=p.anisotropyMap,t(p.anisotropyMap,g.anisotropyMapTransform))),g.specularIntensity.value=p.specularIntensity,g.specularColor.value.copy(p.specularColor),p.specularColorMap&&(g.specularColorMap.value=p.specularColorMap,t(p.specularColorMap,g.specularColorMapTransform)),p.specularIntensityMap&&(g.specularIntensityMap.value=p.specularIntensityMap,t(p.specularIntensityMap,g.specularIntensityMapTransform))}function m(g,p){p.matcap&&(g.matcap.value=p.matcap)}function _(g,p){let b=e.get(p).light;g.referencePosition.value.setFromMatrixPosition(b.matrixWorld),g.nearDistance.value=b.shadow.camera.near,g.farDistance.value=b.shadow.camera.far}return{refreshFogUniforms:n,refreshMaterialUniforms:s}}function my(i,e,t,n){let s={},r={},a=[],o=i.getParameter(i.MAX_UNIFORM_BUFFER_BINDINGS);function c(v,A){let M=A.program;n.uniformBlockBinding(v,M)}function l(v,A){let M=s[v.id];M===void 0&&(g(v),M=h(v),s[v.id]=M,v.addEventListener("dispose",b));let w=A.program;n.updateUBOMapping(v,w);let x=e.render.frame;r[v.id]!==x&&(u(v),r[v.id]=x)}function h(v){let A=d();v.__bindingPointIndex=A;let M=i.createBuffer(),w=v.__size,x=v.usage;return i.bindBuffer(i.UNIFORM_BUFFER,M),i.bufferData(i.UNIFORM_BUFFER,w,x),i.bindBuffer(i.UNIFORM_BUFFER,null),i.bindBufferBase(i.UNIFORM_BUFFER,A,M),M}function d(){for(let v=0;v<o;v++)if(a.indexOf(v)===-1)return a.push(v),v;return Ie("WebGLRenderer: Maximum number of simultaneously usable uniforms groups reached."),0}function u(v){let A=s[v.id],M=v.uniforms,w=v.__cache;i.bindBuffer(i.UNIFORM_BUFFER,A);for(let x=0,T=M.length;x<T;x++){let R=M[x];if(Array.isArray(R))for(let C=0,D=R.length;C<D;C++)f(R[C],x,C,w);else f(R,x,0,w)}i.bindBuffer(i.UNIFORM_BUFFER,null)}function f(v,A,M,w){if(_(v,A,M,w)===!0){let x=v.__offset,T=v.value;if(Array.isArray(T)){let R=0;for(let C=0;C<T.length;C++){let D=T[C],I=p(D);m(D,v.__data,R),typeof D!="number"&&typeof D!="boolean"&&!D.isMatrix3&&!ArrayBuffer.isView(D)&&(R+=I.storage/Float32Array.BYTES_PER_ELEMENT)}}else m(T,v.__data,0);i.bufferSubData(i.UNIFORM_BUFFER,x,v.__data)}}function m(v,A,M){typeof v=="number"||typeof v=="boolean"?A[0]=v:v.isMatrix3?(A[0]=v.elements[0],A[1]=v.elements[1],A[2]=v.elements[2],A[3]=0,A[4]=v.elements[3],A[5]=v.elements[4],A[6]=v.elements[5],A[7]=0,A[8]=v.elements[6],A[9]=v.elements[7],A[10]=v.elements[8],A[11]=0):ArrayBuffer.isView(v)?A.set(new v.constructor(v.buffer,v.byteOffset,A.length)):v.toArray(A,M)}function _(v,A,M,w){let x=v.value,T=A+"_"+M;if(w[T]===void 0)return typeof x=="number"||typeof x=="boolean"?w[T]=x:ArrayBuffer.isView(x)?w[T]=x.slice():w[T]=x.clone(),!0;{let R=w[T];if(typeof x=="number"||typeof x=="boolean"){if(R!==x)return w[T]=x,!0}else{if(ArrayBuffer.isView(x))return!0;if(R.equals(x)===!1)return R.copy(x),!0}}return!1}function g(v){let A=v.uniforms,M=0,w=16;for(let T=0,R=A.length;T<R;T++){let C=Array.isArray(A[T])?A[T]:[A[T]];for(let D=0,I=C.length;D<I;D++){let V=C[D],F=Array.isArray(V.value)?V.value:[V.value];for(let X=0,B=F.length;X<B;X++){let $=F[X],J=p($),ne=M%w,de=ne%J.boundary,ve=ne+de;M+=de,ve!==0&&w-ve<J.storage&&(M+=w-ve),V.__data=new Float32Array(J.storage/Float32Array.BYTES_PER_ELEMENT),V.__offset=M,M+=J.storage}}}let x=M%w;return x>0&&(M+=w-x),v.__size=M,v.__cache={},this}function p(v){let A={boundary:0,storage:0};return typeof v=="number"||typeof v=="boolean"?(A.boundary=4,A.storage=4):v.isVector2?(A.boundary=8,A.storage=8):v.isVector3||v.isColor?(A.boundary=16,A.storage=12):v.isVector4?(A.boundary=16,A.storage=16):v.isMatrix3?(A.boundary=48,A.storage=48):v.isMatrix4?(A.boundary=64,A.storage=64):v.isTexture?Pe("WebGLRenderer: Texture samplers can not be part of an uniforms group."):ArrayBuffer.isView(v)?(A.boundary=16,A.storage=v.byteLength):Pe("WebGLRenderer: Unsupported uniform value type.",v),A}function b(v){let A=v.target;A.removeEventListener("dispose",b);let M=a.indexOf(A.__bindingPointIndex);a.splice(M,1),i.deleteBuffer(s[A.id]),delete s[A.id],delete r[A.id]}function E(){for(let v in s)i.deleteBuffer(s[v]);a=[],s={},r={}}return{bind:c,update:l,dispose:E}}var gy=new Uint16Array([12469,15057,12620,14925,13266,14620,13807,14376,14323,13990,14545,13625,14713,13328,14840,12882,14931,12528,14996,12233,15039,11829,15066,11525,15080,11295,15085,10976,15082,10705,15073,10495,13880,14564,13898,14542,13977,14430,14158,14124,14393,13732,14556,13410,14702,12996,14814,12596,14891,12291,14937,11834,14957,11489,14958,11194,14943,10803,14921,10506,14893,10278,14858,9960,14484,14039,14487,14025,14499,13941,14524,13740,14574,13468,14654,13106,14743,12678,14818,12344,14867,11893,14889,11509,14893,11180,14881,10751,14852,10428,14812,10128,14765,9754,14712,9466,14764,13480,14764,13475,14766,13440,14766,13347,14769,13070,14786,12713,14816,12387,14844,11957,14860,11549,14868,11215,14855,10751,14825,10403,14782,10044,14729,9651,14666,9352,14599,9029,14967,12835,14966,12831,14963,12804,14954,12723,14936,12564,14917,12347,14900,11958,14886,11569,14878,11247,14859,10765,14828,10401,14784,10011,14727,9600,14660,9289,14586,8893,14508,8533,15111,12234,15110,12234,15104,12216,15092,12156,15067,12010,15028,11776,14981,11500,14942,11205,14902,10752,14861,10393,14812,9991,14752,9570,14682,9252,14603,8808,14519,8445,14431,8145,15209,11449,15208,11451,15202,11451,15190,11438,15163,11384,15117,11274,15055,10979,14994,10648,14932,10343,14871,9936,14803,9532,14729,9218,14645,8742,14556,8381,14461,8020,14365,7603,15273,10603,15272,10607,15267,10619,15256,10631,15231,10614,15182,10535,15118,10389,15042,10167,14963,9787,14883,9447,14800,9115,14710,8665,14615,8318,14514,7911,14411,7507,14279,7198,15314,9675,15313,9683,15309,9712,15298,9759,15277,9797,15229,9773,15166,9668,15084,9487,14995,9274,14898,8910,14800,8539,14697,8234,14590,7790,14479,7409,14367,7067,14178,6621,15337,8619,15337,8631,15333,8677,15325,8769,15305,8871,15264,8940,15202,8909,15119,8775,15022,8565,14916,8328,14804,8009,14688,7614,14569,7287,14448,6888,14321,6483,14088,6171,15350,7402,15350,7419,15347,7480,15340,7613,15322,7804,15287,7973,15229,8057,15148,8012,15046,7846,14933,7611,14810,7357,14682,7069,14552,6656,14421,6316,14251,5948,14007,5528,15356,5942,15356,5977,15353,6119,15348,6294,15332,6551,15302,6824,15249,7044,15171,7122,15070,7050,14949,6861,14818,6611,14679,6349,14538,6067,14398,5651,14189,5311,13935,4958,15359,4123,15359,4153,15356,4296,15353,4646,15338,5160,15311,5508,15263,5829,15188,6042,15088,6094,14966,6001,14826,5796,14678,5543,14527,5287,14377,4985,14133,4586,13869,4257,15360,1563,15360,1642,15358,2076,15354,2636,15341,3350,15317,4019,15273,4429,15203,4732,15105,4911,14981,4932,14836,4818,14679,4621,14517,4386,14359,4156,14083,3795,13808,3437,15360,122,15360,137,15358,285,15355,636,15344,1274,15322,2177,15281,2765,15215,3223,15120,3451,14995,3569,14846,3567,14681,3466,14511,3305,14344,3121,14037,2800,13753,2467,15360,0,15360,1,15359,21,15355,89,15346,253,15325,479,15287,796,15225,1148,15133,1492,15008,1749,14856,1882,14685,1886,14506,1783,14324,1608,13996,1398,13702,1183]),Wn=null;function xy(){return Wn===null&&(Wn=new ja(gy,16,16,Ii,Gn),Wn.name="DFG_LUT",Wn.minFilter=Ut,Wn.magFilter=Ut,Wn.wrapS=Nn,Wn.wrapT=Nn,Wn.generateMipmaps=!1,Wn.needsUpdate=!0),Wn}var _c=class{constructor(e={}){let{canvas:t=bd(),context:n=null,depth:s=!0,stencil:r=!1,alpha:a=!1,antialias:o=!1,premultipliedAlpha:c=!0,preserveDrawingBuffer:l=!1,powerPreference:h="default",failIfMajorPerformanceCaveat:d=!1,reversedDepthBuffer:u=!1,outputBufferType:f=fn}=e;this.isWebGLRenderer=!0;let m;if(n!==null){if(typeof WebGLRenderingContext<"u"&&n instanceof WebGLRenderingContext)throw new Error("THREE.WebGLRenderer: WebGL 1 is not supported since r163.");m=n.getContextAttributes().alpha}else m=a;let _=f,g=new Set([Uo,Fo,Do]),p=new Set([fn,Pn,Ds,Fs,Io,Lo]),b=new Uint32Array(4),E=new Int32Array(4),v=new L,A=null,M=null,w=[],x=[],T=null;this.domElement=t,this.debug={checkShaderErrors:!0,onShaderError:null},this.autoClear=!0,this.autoClearColor=!0,this.autoClearDepth=!0,this.autoClearStencil=!0,this.sortObjects=!0,this.clippingPlanes=[],this.localClippingEnabled=!1,this.toneMapping=An,this.toneMappingExposure=1,this.transmissionResolutionScale=1;let R=this,C=!1,D=null,I=null,V=null,F=null;this._outputColorSpace=on;let X=0,B=0,$=null,J=-1,ne=null,de=new tt,ve=new tt,Ke=null,dt=new Xe(0),Ze=0,j=t.width,ae=t.height,ee=1,Le=null,Ne=null,Ce=new tt(0,0,j,ae),_t=new tt(0,0,j,ae),Ge=!1,it=new dr,Je=!1,Ye=!1,St=new at,Tt=new L,It=new tt,Ft={background:null,fog:null,environment:null,overrideMaterial:null,isScene:!0},ft=!1;function Mt(){return $===null?ee:1}let N=n;function Jt(S,O){return t.getContext(S,O)}try{let S={alpha:!0,depth:s,stencil:r,antialias:o,premultipliedAlpha:c,preserveDrawingBuffer:l,powerPreference:h,failIfMajorPerformanceCaveat:d};if("setAttribute"in t&&t.setAttribute("data-engine",`three.js r${To}`),t.addEventListener("webglcontextlost",pt,!1),t.addEventListener("webglcontextrestored",ot,!1),t.addEventListener("webglcontextcreationerror",Rn,!1),N===null){let O="webgl2";if(N=Jt(O,S),N===null)throw Jt(O)?new Error("THREE.WebGLRenderer: Error creating WebGL context with your selected attributes."):new Error("THREE.WebGLRenderer: Error creating WebGL context.")}}catch(S){throw Ie("WebGLRenderer: "+S.message),S}let Qe,P,y,z,G,q,te,oe,Y,Z,ce,Ee,ue,le,Ae,Re,Oe,U,re,K,he,me,Q;function Me(){Qe=new E0(N),Qe.init(),he=new hy(N,Qe),P=new g0(N,Qe,e,he),y=new cy(N,Qe),P.reversedDepthBuffer&&u&&y.buffers.depth.setReversed(!0),I=N.createFramebuffer(),V=N.createFramebuffer(),F=N.createFramebuffer(),z=new A0(N),G=new $_,q=new ly(N,Qe,y,G,P,he,z),te=new M0(R),oe=new Im(N),me=new p0(N,oe),Y=new w0(N,oe,z,me),Z=new C0(N,Y,oe,me,z),U=new P0(N,P,q),Ae=new x0(G),ce=new Y_(R,te,Qe,P,me,Ae),Ee=new py(R,G),ue=new Z_,le=new ny(Qe),Oe=new f0(R,te,y,Z,m,c),Re=new oy(R,Z,P),Q=new my(N,z,P,y),re=new m0(N,Qe,z),K=new T0(N,Qe,z),z.programs=ce.programs,R.capabilities=P,R.extensions=Qe,R.properties=G,R.renderLists=ue,R.shadowMap=Re,R.state=y,R.info=z}Me(),_!==fn&&(T=new I0(_,t.width,t.height,o,s,r));let be=new Mh(R,N);this.xr=be,this.getContext=function(){return N},this.getContextAttributes=function(){return N.getContextAttributes()},this.forceContextLoss=function(){let S=Qe.get("WEBGL_lose_context");S&&S.loseContext()},this.forceContextRestore=function(){let S=Qe.get("WEBGL_lose_context");S&&S.restoreContext()},this.getPixelRatio=function(){return ee},this.setPixelRatio=function(S){S!==void 0&&(ee=S,this.setSize(j,ae,!1))},this.getSize=function(S){return S.set(j,ae)},this.setSize=function(S,O,W=!0){if(be.isPresenting){Pe("WebGLRenderer: Can't change size while VR device is presenting.");return}j=S,ae=O,t.width=Math.floor(S*ee),t.height=Math.floor(O*ee),W===!0&&(t.style.width=S+"px",t.style.height=O+"px"),T!==null&&T.setSize(t.width,t.height),this.setViewport(0,0,S,O)},this.getDrawingBufferSize=function(S){return S.set(j*ee,ae*ee).floor()},this.setDrawingBufferSize=function(S,O,W){j=S,ae=O,ee=W,t.width=Math.floor(S*W),t.height=Math.floor(O*W),this.setViewport(0,0,S,O)},this.setEffects=function(S){if(_===fn){Ie("WebGLRenderer: setEffects() requires outputBufferType set to HalfFloatType or FloatType.");return}if(S){for(let O=0;O<S.length;O++)if(S[O].isOutputPass===!0){Pe("WebGLRenderer: OutputPass is not needed in setEffects(). Tone mapping and color space conversion are applied automatically.");break}}T.setEffects(S||[])},this.getCurrentViewport=function(S){return S.copy(de)},this.getViewport=function(S){return S.copy(Ce)},this.setViewport=function(S,O,W,k){S.isVector4?Ce.set(S.x,S.y,S.z,S.w):Ce.set(S,O,W,k),y.viewport(de.copy(Ce).multiplyScalar(ee).round())},this.getScissor=function(S){return S.copy(_t)},this.setScissor=function(S,O,W,k){S.isVector4?_t.set(S.x,S.y,S.z,S.w):_t.set(S,O,W,k),y.scissor(ve.copy(_t).multiplyScalar(ee).round())},this.getScissorTest=function(){return Ge},this.setScissorTest=function(S){y.setScissorTest(Ge=S)},this.setOpaqueSort=function(S){Le=S},this.setTransparentSort=function(S){Ne=S},this.getClearColor=function(S){return S.copy(Oe.getClearColor())},this.setClearColor=function(){Oe.setClearColor(...arguments)},this.getClearAlpha=function(){return Oe.getClearAlpha()},this.setClearAlpha=function(){Oe.setClearAlpha(...arguments)},this.clear=function(S=!0,O=!0,W=!0){let k=0;if(S){let H=!1;if($!==null){let pe=$.texture.format;H=g.has(pe)}if(H){let pe=$.texture.type,ye=p.has(pe),fe=Oe.getClearColor(),Se=Oe.getClearAlpha(),we=fe.r,Be=fe.g,He=fe.b;ye?(b[0]=we,b[1]=Be,b[2]=He,b[3]=Se,N.clearBufferuiv(N.COLOR,0,b)):(E[0]=we,E[1]=Be,E[2]=He,E[3]=Se,N.clearBufferiv(N.COLOR,0,E))}else k|=N.COLOR_BUFFER_BIT}O&&(k|=N.DEPTH_BUFFER_BIT,this.state.buffers.depth.setMask(!0)),W&&(k|=N.STENCIL_BUFFER_BIT,this.state.buffers.stencil.setMask(4294967295)),k!==0&&N.clear(k)},this.clearColor=function(){this.clear(!0,!1,!1)},this.clearDepth=function(){this.clear(!1,!0,!1)},this.clearStencil=function(){this.clear(!1,!1,!0)},this.setNodesHandler=function(S){S.setRenderer(this),D=S},this.dispose=function(){t.removeEventListener("webglcontextlost",pt,!1),t.removeEventListener("webglcontextrestored",ot,!1),t.removeEventListener("webglcontextcreationerror",Rn,!1),Oe.dispose(),ue.dispose(),le.dispose(),G.dispose(),te.dispose(),Z.dispose(),me.dispose(),Q.dispose(),ce.dispose(),be.dispose(),be.removeEventListener("sessionstart",zh),be.removeEventListener("sessionend",Vh),Ui.stop()};function pt(S){S.preventDefault(),rr("WebGLRenderer: Context Lost."),C=!0}function ot(){rr("WebGLRenderer: Context Restored."),C=!1;let S=z.autoReset,O=Re.enabled,W=Re.autoUpdate,k=Re.needsUpdate,H=Re.type;Me(),z.autoReset=S,Re.enabled=O,Re.autoUpdate=W,Re.needsUpdate=k,Re.type=H}function Rn(S){Ie("WebGLRenderer: A WebGL context could not be created. Reason: ",S.statusMessage)}function In(S){let O=S.target;O.removeEventListener("dispose",In),If(O)}function If(S){Lf(S),G.remove(S)}function Lf(S){let O=G.get(S).programs;O!==void 0&&(O.forEach(function(W){ce.releaseProgram(W)}),S.isShaderMaterial&&ce.releaseShaderCache(S))}this.renderBufferDirect=function(S,O,W,k,H,pe){O===null&&(O=Ft);let ye=H.isMesh&&H.matrixWorld.determinantAffine()<0,fe=Uf(S,O,W,k,H);y.setMaterial(k,ye);let Se=W.index,we=1;if(k.wireframe===!0){if(Se=Y.getWireframeAttribute(W),Se===void 0)return;we=2}let Be=W.drawRange,He=W.attributes.position,Te=Be.start*we,nt=(Be.start+Be.count)*we;pe!==null&&(Te=Math.max(Te,pe.start*we),nt=Math.min(nt,(pe.start+pe.count)*we)),Se!==null?(Te=Math.max(Te,0),nt=Math.min(nt,Se.count)):He!=null&&(Te=Math.max(Te,0),nt=Math.min(nt,He.count));let yt=nt-Te;if(yt<0||yt===1/0)return;me.setup(H,k,fe,W,Se);let mt,st=re;if(Se!==null&&(mt=oe.get(Se),st=K,st.setIndex(mt)),H.isMesh)k.wireframe===!0?(y.setLineWidth(k.wireframeLinewidth*Mt()),st.setMode(N.LINES)):st.setMode(N.TRIANGLES);else if(H.isLine){let kt=k.linewidth;kt===void 0&&(kt=1),y.setLineWidth(kt*Mt()),H.isLineSegments?st.setMode(N.LINES):H.isLineLoop?st.setMode(N.LINE_LOOP):st.setMode(N.LINE_STRIP)}else H.isPoints?st.setMode(N.POINTS):H.isSprite&&st.setMode(N.TRIANGLES);if(H.isBatchedMesh)if(Qe.get("WEBGL_multi_draw"))st.renderMultiDraw(H._multiDrawStarts,H._multiDrawCounts,H._multiDrawCount);else{let kt=H._multiDrawStarts,xe=H._multiDrawCounts,nn=H._multiDrawCount,$e=Se?oe.get(Se).bytesPerElement:1,pn=G.get(k).currentProgram.getUniforms();for(let Ln=0;Ln<nn;Ln++)pn.setValue(N,"_gl_DrawID",Ln),st.render(kt[Ln]/$e,xe[Ln])}else if(H.isInstancedMesh)st.renderInstances(Te,yt,H.count);else if(W.isInstancedBufferGeometry){let kt=W._maxInstanceCount!==void 0?W._maxInstanceCount:1/0,xe=Math.min(W.instanceCount,kt);st.renderInstances(Te,yt,xe)}else st.render(Te,yt)};function Bh(S,O,W){S.transparent===!0&&S.side===_n&&S.forceSinglePass===!1?(S.side=Kt,S.needsUpdate=!0,Jr(S,O,W),S.side=ni,S.needsUpdate=!0,Jr(S,O,W),S.side=_n):Jr(S,O,W)}this.compile=function(S,O,W=null){W===null&&(W=S),M=le.get(W),M.init(O),x.push(M),W.traverseVisible(function(H){H.isLight&&H.layers.test(O.layers)&&(M.pushLight(H),H.castShadow&&M.pushShadow(H))}),S!==W&&S.traverseVisible(function(H){H.isLight&&H.layers.test(O.layers)&&(M.pushLight(H),H.castShadow&&M.pushShadow(H))}),M.setupLights();let k=new Set;return S.traverse(function(H){if(!(H.isMesh||H.isPoints||H.isLine||H.isSprite))return;let pe=H.material;if(pe)if(Array.isArray(pe))for(let ye=0;ye<pe.length;ye++){let fe=pe[ye];Bh(fe,W,H),k.add(fe)}else Bh(pe,W,H),k.add(pe)}),M=x.pop(),k},this.compileAsync=function(S,O,W=null){let k=this.compile(S,O,W);return new Promise(H=>{function pe(){if(k.forEach(function(ye){G.get(ye).currentProgram.isReady()&&k.delete(ye)}),k.size===0){H(S);return}setTimeout(pe,10)}Qe.get("KHR_parallel_shader_compile")!==null?pe():setTimeout(pe,10)})};let Dc=null;function Df(S){Dc&&Dc(S)}function zh(){Ui.stop()}function Vh(){Ui.start()}let Ui=new Qd;Ui.setAnimationLoop(Df),typeof self<"u"&&Ui.setContext(self),this.setAnimationLoop=function(S){Dc=S,be.setAnimationLoop(S),S===null?Ui.stop():Ui.start()},be.addEventListener("sessionstart",zh),be.addEventListener("sessionend",Vh),this.render=function(S,O){if(O!==void 0&&O.isCamera!==!0){Ie("WebGLRenderer.render: camera is not an instance of THREE.Camera.");return}if(C===!0)return;D!==null&&D.renderStart(S,O);let W=be.enabled===!0&&be.isPresenting===!0,k=T!==null&&($===null||W)&&T.begin(R,$);if(S.matrixWorldAutoUpdate===!0&&S.updateMatrixWorld(),O.parent===null&&O.matrixWorldAutoUpdate===!0&&O.updateMatrixWorld(),be.enabled===!0&&be.isPresenting===!0&&(T===null||T.isCompositing()===!1)&&(be.cameraAutoUpdate===!0&&be.updateCamera(O),O=be.getCamera()),S.isScene===!0&&S.onBeforeRender(R,S,O,$),M=le.get(S,x.length),M.init(O),M.state.textureUnits=q.getTextureUnits(),x.push(M),St.multiplyMatrices(O.projectionMatrix,O.matrixWorldInverse),it.setFromProjectionMatrix(St,En,O.reversedDepth),Ye=this.localClippingEnabled,Je=Ae.init(this.clippingPlanes,Ye),A=ue.get(S,w.length),A.init(),w.push(A),be.enabled===!0&&be.isPresenting===!0){let ye=R.xr.getDepthSensingMesh();ye!==null&&Fc(ye,O,-1/0,R.sortObjects)}Fc(S,O,0,R.sortObjects),A.finish(),R.sortObjects===!0&&A.sort(Le,Ne,O.reversedDepth),ft=be.enabled===!1||be.isPresenting===!1||be.hasDepthSensing()===!1,ft&&Oe.addToRenderList(A,S),this.info.render.frame++,this.info.autoReset===!0&&this.info.reset(),Je===!0&&Ae.beginShadows();let H=M.state.shadowsArray;if(Re.render(H,S,O),Je===!0&&Ae.endShadows(),(k&&T.hasRenderPass())===!1){let ye=A.opaque,fe=A.transmissive;if(M.setupLights(),O.isArrayCamera){let Se=O.cameras;if(fe.length>0)for(let we=0,Be=Se.length;we<Be;we++){let He=Se[we];Hh(ye,fe,S,He)}ft&&Oe.render(S);for(let we=0,Be=Se.length;we<Be;we++){let He=Se[we];kh(A,S,He,He.viewport)}}else fe.length>0&&Hh(ye,fe,S,O),ft&&Oe.render(S),kh(A,S,O)}$!==null&&B===0&&(q.updateMultisampleRenderTarget($),q.updateRenderTargetMipmap($)),k&&T.end(R),S.isScene===!0&&S.onAfterRender(R,S,O),me.resetDefaultState(),J=-1,ne=null,x.pop(),x.length>0?(M=x[x.length-1],q.setTextureUnits(M.state.textureUnits),Je===!0&&Ae.setGlobalState(R.clippingPlanes,M.state.camera)):M=null,w.pop(),w.length>0?A=w[w.length-1]:A=null,D!==null&&D.renderEnd()};function Fc(S,O,W,k){if(S.visible===!1)return;if(S.layers.test(O.layers)){if(S.isGroup)W=S.renderOrder;else if(S.isLOD)S.autoUpdate===!0&&S.update(O);else if(S.isLightProbeGrid)M.pushLightProbeGrid(S);else if(S.isLight)M.pushLight(S),S.castShadow&&M.pushShadow(S);else if(S.isSprite){if(!S.frustumCulled||it.intersectsSprite(S)){k&&It.setFromMatrixPosition(S.matrixWorld).applyMatrix4(St);let ye=Z.update(S),fe=S.material;fe.visible&&A.push(S,ye,fe,W,It.z,null)}}else if((S.isMesh||S.isLine||S.isPoints)&&(!S.frustumCulled||it.intersectsObject(S))){let ye=Z.update(S),fe=S.material;if(k&&(S.boundingSphere!==void 0?(S.boundingSphere===null&&S.computeBoundingSphere(),It.copy(S.boundingSphere.center)):(ye.boundingSphere===null&&ye.computeBoundingSphere(),It.copy(ye.boundingSphere.center)),It.applyMatrix4(S.matrixWorld).applyMatrix4(St)),Array.isArray(fe)){let Se=ye.groups;for(let we=0,Be=Se.length;we<Be;we++){let He=Se[we],Te=fe[He.materialIndex];Te&&Te.visible&&A.push(S,ye,Te,W,It.z,He)}}else fe.visible&&A.push(S,ye,fe,W,It.z,null)}}let pe=S.children;for(let ye=0,fe=pe.length;ye<fe;ye++)Fc(pe[ye],O,W,k)}function kh(S,O,W,k){let{opaque:H,transmissive:pe,transparent:ye}=S;M.setupLightsView(W),Je===!0&&Ae.setGlobalState(R.clippingPlanes,W),k&&y.viewport(de.copy(k)),H.length>0&&Zr(H,O,W),pe.length>0&&Zr(pe,O,W),ye.length>0&&Zr(ye,O,W),y.buffers.depth.setTest(!0),y.buffers.depth.setMask(!0),y.buffers.color.setMask(!0),y.setPolygonOffset(!1)}function Hh(S,O,W,k){if((W.isScene===!0?W.overrideMaterial:null)!==null)return;if(M.state.transmissionRenderTarget[k.id]===void 0){let Te=Qe.has("EXT_color_buffer_half_float")||Qe.has("EXT_color_buffer_float");M.state.transmissionRenderTarget[k.id]=new cn(1,1,{generateMipmaps:!0,type:Te?Gn:fn,minFilter:Ci,samples:Math.max(4,P.samples),stencilBuffer:r,resolveDepthBuffer:!1,resolveStencilBuffer:!1,colorSpace:We.workingColorSpace})}let pe=M.state.transmissionRenderTarget[k.id],ye=k.viewport||de;pe.setSize(ye.z*R.transmissionResolutionScale,ye.w*R.transmissionResolutionScale);let fe=R.getRenderTarget(),Se=R.getActiveCubeFace(),we=R.getActiveMipmapLevel();R.setRenderTarget(pe),R.getClearColor(dt),Ze=R.getClearAlpha(),Ze<1&&R.setClearColor(16777215,.5),R.clear(),ft&&Oe.render(W);let Be=R.toneMapping;R.toneMapping=An;let He=k.viewport;if(k.viewport!==void 0&&(k.viewport=void 0),M.setupLightsView(k),Je===!0&&Ae.setGlobalState(R.clippingPlanes,k),Zr(S,W,k),q.updateMultisampleRenderTarget(pe),q.updateRenderTargetMipmap(pe),Qe.has("WEBGL_multisampled_render_to_texture")===!1){let Te=!1;for(let nt=0,yt=O.length;nt<yt;nt++){let mt=O[nt],{object:st,geometry:kt,material:xe,group:nn}=mt;if(xe.side===_n&&st.layers.test(k.layers)){let $e=xe.side;xe.side=Kt,xe.needsUpdate=!0,Gh(st,W,k,kt,xe,nn),xe.side=$e,xe.needsUpdate=!0,Te=!0}}Te===!0&&(q.updateMultisampleRenderTarget(pe),q.updateRenderTargetMipmap(pe))}R.setRenderTarget(fe,Se,we),R.setClearColor(dt,Ze),He!==void 0&&(k.viewport=He),R.toneMapping=Be}function Zr(S,O,W){let k=O.isScene===!0?O.overrideMaterial:null;for(let H=0,pe=S.length;H<pe;H++){let ye=S[H],{object:fe,geometry:Se,group:we}=ye,Be=ye.material;Be.allowOverride===!0&&k!==null&&(Be=k),fe.layers.test(W.layers)&&Gh(fe,O,W,Se,Be,we)}}function Gh(S,O,W,k,H,pe){S.onBeforeRender(R,O,W,k,H,pe),S.modelViewMatrix.multiplyMatrices(W.matrixWorldInverse,S.matrixWorld),S.normalMatrix.getNormalMatrix(S.modelViewMatrix),H.onBeforeRender(R,O,W,k,S,pe),H.transparent===!0&&H.side===_n&&H.forceSinglePass===!1?(H.side=Kt,H.needsUpdate=!0,R.renderBufferDirect(W,O,k,H,S,pe),H.side=ni,H.needsUpdate=!0,R.renderBufferDirect(W,O,k,H,S,pe),H.side=_n):R.renderBufferDirect(W,O,k,H,S,pe),S.onAfterRender(R,O,W,k,H,pe)}function Jr(S,O,W){O.isScene!==!0&&(O=Ft);let k=G.get(S),H=M.state.lights,pe=M.state.shadowsArray,ye=H.state.version,fe=ce.getParameters(S,H.state,pe,O,W,M.state.lightProbeGridArray),Se=ce.getProgramCacheKey(fe),we=k.programs;k.environment=S.isMeshStandardMaterial||S.isMeshLambertMaterial||S.isMeshPhongMaterial?O.environment:null,k.fog=O.fog;let Be=S.isMeshStandardMaterial||S.isMeshLambertMaterial&&!S.envMap||S.isMeshPhongMaterial&&!S.envMap;k.envMap=te.get(S.envMap||k.environment,Be),k.envMapRotation=k.environment!==null&&S.envMap===null?O.environmentRotation:S.envMapRotation,we===void 0&&(S.addEventListener("dispose",In),we=new Map,k.programs=we);let He=we.get(Se);if(He!==void 0){if(k.currentProgram===He&&k.lightsStateVersion===ye)return Xh(S,fe),He}else fe.uniforms=ce.getUniforms(S),D!==null&&S.isNodeMaterial&&D.build(S,W,fe),S.onBeforeCompile(fe,R),He=ce.acquireProgram(fe,Se),we.set(Se,He),k.uniforms=fe.uniforms;let Te=k.uniforms;return(!S.isShaderMaterial&&!S.isRawShaderMaterial||S.clipping===!0)&&(Te.clippingPlanes=Ae.uniform),Xh(S,fe),k.needsLights=Of(S),k.lightsStateVersion=ye,k.needsLights&&(Te.ambientLightColor.value=H.state.ambient,Te.lightProbe.value=H.state.probe,Te.directionalLights.value=H.state.directional,Te.directionalLightShadows.value=H.state.directionalShadow,Te.spotLights.value=H.state.spot,Te.spotLightShadows.value=H.state.spotShadow,Te.rectAreaLights.value=H.state.rectArea,Te.ltc_1.value=H.state.rectAreaLTC1,Te.ltc_2.value=H.state.rectAreaLTC2,Te.pointLights.value=H.state.point,Te.pointLightShadows.value=H.state.pointShadow,Te.hemisphereLights.value=H.state.hemi,Te.directionalShadowMatrix.value=H.state.directionalShadowMatrix,Te.spotLightMatrix.value=H.state.spotLightMatrix,Te.spotLightMap.value=H.state.spotLightMap,Te.pointShadowMatrix.value=H.state.pointShadowMatrix),k.lightProbeGrid=M.state.lightProbeGridArray.length>0,k.currentProgram=He,k.uniformsList=null,He}function Wh(S){if(S.uniformsList===null){let O=S.currentProgram.getUniforms();S.uniformsList=Ns.seqWithValue(O.seq,S.uniforms)}return S.uniformsList}function Xh(S,O){let W=G.get(S);W.outputColorSpace=O.outputColorSpace,W.batching=O.batching,W.batchingColor=O.batchingColor,W.instancing=O.instancing,W.instancingColor=O.instancingColor,W.instancingMorph=O.instancingMorph,W.skinning=O.skinning,W.morphTargets=O.morphTargets,W.morphNormals=O.morphNormals,W.morphColors=O.morphColors,W.morphTargetsCount=O.morphTargetsCount,W.numClippingPlanes=O.numClippingPlanes,W.numIntersection=O.numClipIntersection,W.vertexAlphas=O.vertexAlphas,W.vertexTangents=O.vertexTangents,W.toneMapping=O.toneMapping}function Ff(S,O){if(S.length===0)return null;if(S.length===1)return S[0].texture!==null?S[0]:null;v.setFromMatrixPosition(O.matrixWorld);for(let W=0,k=S.length;W<k;W++){let H=S[W];if(H.texture!==null&&H.boundingBox.containsPoint(v))return H}return null}function Uf(S,O,W,k,H){O.isScene!==!0&&(O=Ft),q.resetTextureUnits();let pe=O.fog,ye=k.isMeshStandardMaterial||k.isMeshLambertMaterial||k.isMeshPhongMaterial?O.environment:null,fe=$===null?R.outputColorSpace:$.isXRRenderTarget===!0?$.texture.colorSpace:We.workingColorSpace,Se=k.isMeshStandardMaterial||k.isMeshLambertMaterial&&!k.envMap||k.isMeshPhongMaterial&&!k.envMap,we=te.get(k.envMap||ye,Se),Be=k.vertexColors===!0&&!!W.attributes.color&&W.attributes.color.itemSize===4,He=!!W.attributes.tangent&&(!!k.normalMap||k.anisotropy>0),Te=!!W.morphAttributes.position,nt=!!W.morphAttributes.normal,yt=!!W.morphAttributes.color,mt=An;k.toneMapped&&($===null||$.isXRRenderTarget===!0)&&(mt=R.toneMapping);let st=W.morphAttributes.position||W.morphAttributes.normal||W.morphAttributes.color,kt=st!==void 0?st.length:0,xe=G.get(k),nn=M.state.lights;if(Je===!0&&(Ye===!0||S!==ne)){let ct=S===ne&&k.id===J;Ae.setState(k,S,ct)}let $e=!1;k.version===xe.__version?(xe.needsLights&&xe.lightsStateVersion!==nn.state.version||xe.outputColorSpace!==fe||H.isBatchedMesh&&xe.batching===!1||!H.isBatchedMesh&&xe.batching===!0||H.isBatchedMesh&&xe.batchingColor===!0&&H.colorTexture===null||H.isBatchedMesh&&xe.batchingColor===!1&&H.colorTexture!==null||H.isInstancedMesh&&xe.instancing===!1||!H.isInstancedMesh&&xe.instancing===!0||H.isSkinnedMesh&&xe.skinning===!1||!H.isSkinnedMesh&&xe.skinning===!0||H.isInstancedMesh&&xe.instancingColor===!0&&H.instanceColor===null||H.isInstancedMesh&&xe.instancingColor===!1&&H.instanceColor!==null||H.isInstancedMesh&&xe.instancingMorph===!0&&H.morphTexture===null||H.isInstancedMesh&&xe.instancingMorph===!1&&H.morphTexture!==null||xe.envMap!==we||k.fog===!0&&xe.fog!==pe||xe.numClippingPlanes!==void 0&&(xe.numClippingPlanes!==Ae.numPlanes||xe.numIntersection!==Ae.numIntersection)||xe.vertexAlphas!==Be||xe.vertexTangents!==He||xe.morphTargets!==Te||xe.morphNormals!==nt||xe.morphColors!==yt||xe.toneMapping!==mt||xe.morphTargetsCount!==kt||!!xe.lightProbeGrid!=M.state.lightProbeGridArray.length>0)&&($e=!0):($e=!0,xe.__version=k.version);let pn=xe.currentProgram;$e===!0&&(pn=Jr(k,O,H),D&&k.isNodeMaterial&&D.onUpdateProgram(k,pn,xe));let Ln=!1,ai=!1,is=!1,rt=pn.getUniforms(),vt=xe.uniforms;if(y.useProgram(pn.program)&&(Ln=!0,ai=!0,is=!0),k.id!==J&&(J=k.id,ai=!0),xe.needsLights){let ct=Ff(M.state.lightProbeGridArray,H);xe.lightProbeGrid!==ct&&(xe.lightProbeGrid=ct,ai=!0)}if(Ln||ne!==S){y.buffers.depth.getReversed()&&S.reversedDepth!==!0&&(S._reversedDepth=!0,S.updateProjectionMatrix()),rt.setValue(N,"projectionMatrix",S.projectionMatrix),rt.setValue(N,"viewMatrix",S.matrixWorldInverse);let ci=rt.map.cameraPosition;ci!==void 0&&ci.setValue(N,Tt.setFromMatrixPosition(S.matrixWorld)),P.logarithmicDepthBuffer&&rt.setValue(N,"logDepthBufFC",2/(Math.log(S.far+1)/Math.LN2)),(k.isMeshPhongMaterial||k.isMeshToonMaterial||k.isMeshLambertMaterial||k.isMeshBasicMaterial||k.isMeshStandardMaterial||k.isShaderMaterial)&&rt.setValue(N,"isOrthographic",S.isOrthographicCamera===!0),ne!==S&&(ne=S,ai=!0,is=!0)}if(xe.needsLights&&(nn.state.directionalShadowMap.length>0&&rt.setValue(N,"directionalShadowMap",nn.state.directionalShadowMap,q),nn.state.spotShadowMap.length>0&&rt.setValue(N,"spotShadowMap",nn.state.spotShadowMap,q),nn.state.pointShadowMap.length>0&&rt.setValue(N,"pointShadowMap",nn.state.pointShadowMap,q)),H.isSkinnedMesh){rt.setOptional(N,H,"bindMatrix"),rt.setOptional(N,H,"bindMatrixInverse");let ct=H.skeleton;ct&&(ct.boneTexture===null&&ct.computeBoneTexture(),rt.setValue(N,"boneTexture",ct.boneTexture,q))}H.isBatchedMesh&&(rt.setOptional(N,H,"batchingTexture"),rt.setValue(N,"batchingTexture",H._matricesTexture,q),rt.setOptional(N,H,"batchingIdTexture"),rt.setValue(N,"batchingIdTexture",H._indirectTexture,q),rt.setOptional(N,H,"batchingColorTexture"),H._colorsTexture!==null&&rt.setValue(N,"batchingColorTexture",H._colorsTexture,q));let oi=W.morphAttributes;if((oi.position!==void 0||oi.normal!==void 0||oi.color!==void 0)&&U.update(H,W,pn),(ai||xe.receiveShadow!==H.receiveShadow)&&(xe.receiveShadow=H.receiveShadow,rt.setValue(N,"receiveShadow",H.receiveShadow)),(k.isMeshStandardMaterial||k.isMeshLambertMaterial||k.isMeshPhongMaterial)&&k.envMap===null&&O.environment!==null&&(vt.envMapIntensity.value=O.environmentIntensity),vt.dfgLUT!==void 0&&(vt.dfgLUT.value=xy()),ai){if(rt.setValue(N,"toneMappingExposure",R.toneMappingExposure),xe.needsLights&&Nf(vt,is),pe&&k.fog===!0&&Ee.refreshFogUniforms(vt,pe),Ee.refreshMaterialUniforms(vt,k,ee,ae,M.state.transmissionRenderTarget[S.id]),xe.needsLights&&xe.lightProbeGrid){let ct=xe.lightProbeGrid;vt.probesSH.value=ct.texture,vt.probesMin.value.copy(ct.boundingBox.min),vt.probesMax.value.copy(ct.boundingBox.max),vt.probesResolution.value.copy(ct.resolution)}Ns.upload(N,Wh(xe),vt,q)}if(k.isShaderMaterial&&k.uniformsNeedUpdate===!0&&(Ns.upload(N,Wh(xe),vt,q),k.uniformsNeedUpdate=!1),k.isSpriteMaterial&&rt.setValue(N,"center",H.center),rt.setValue(N,"modelViewMatrix",H.modelViewMatrix),rt.setValue(N,"normalMatrix",H.normalMatrix),rt.setValue(N,"modelMatrix",H.matrixWorld),k.uniformsGroups!==void 0){let ct=k.uniformsGroups;for(let ci=0,ss=ct.length;ci<ss;ci++){let qh=ct[ci];Q.update(qh,pn),Q.bind(qh,pn)}}return pn}function Nf(S,O){S.ambientLightColor.needsUpdate=O,S.lightProbe.needsUpdate=O,S.directionalLights.needsUpdate=O,S.directionalLightShadows.needsUpdate=O,S.pointLights.needsUpdate=O,S.pointLightShadows.needsUpdate=O,S.spotLights.needsUpdate=O,S.spotLightShadows.needsUpdate=O,S.rectAreaLights.needsUpdate=O,S.hemisphereLights.needsUpdate=O}function Of(S){return S.isMeshLambertMaterial||S.isMeshToonMaterial||S.isMeshPhongMaterial||S.isMeshStandardMaterial||S.isShadowMaterial||S.isShaderMaterial&&S.lights===!0}this.getActiveCubeFace=function(){return X},this.getActiveMipmapLevel=function(){return B},this.getRenderTarget=function(){return $},this.setRenderTargetTextures=function(S,O,W){let k=G.get(S);k.__autoAllocateDepthBuffer=S.resolveDepthBuffer===!1,k.__autoAllocateDepthBuffer===!1&&(k.__useRenderToTexture=!1),G.get(S.texture).__webglTexture=O,G.get(S.depthTexture).__webglTexture=k.__autoAllocateDepthBuffer?void 0:W,k.__hasExternalTextures=!0},this.setRenderTargetFramebuffer=function(S,O){let W=G.get(S);W.__webglFramebuffer=O,W.__useDefaultFramebuffer=O===void 0},this.setRenderTarget=function(S,O=0,W=0){$=S,X=O,B=W;let k=null,H=!1,pe=!1;if(S){let fe=G.get(S);if(fe.__useDefaultFramebuffer!==void 0){y.bindFramebuffer(N.FRAMEBUFFER,fe.__webglFramebuffer),de.copy(S.viewport),ve.copy(S.scissor),Ke=S.scissorTest,y.viewport(de),y.scissor(ve),y.setScissorTest(Ke),J=-1;return}else if(fe.__webglFramebuffer===void 0)q.setupRenderTarget(S);else if(fe.__hasExternalTextures)q.rebindTextures(S,G.get(S.texture).__webglTexture,G.get(S.depthTexture).__webglTexture);else if(S.depthBuffer){let Be=S.depthTexture;if(fe.__boundDepthTexture!==Be){if(Be!==null&&G.has(Be)&&(S.width!==Be.image.width||S.height!==Be.image.height))throw new Error("THREE.WebGLRenderer: Attached DepthTexture is initialized to the incorrect size.");q.setupDepthRenderbuffer(S)}}let Se=S.texture;(Se.isData3DTexture||Se.isDataArrayTexture||Se.isCompressedArrayTexture)&&(pe=!0);let we=G.get(S).__webglFramebuffer;S.isWebGLCubeRenderTarget?(Array.isArray(we[O])?k=we[O][W]:k=we[O],H=!0):S.samples>0&&q.useMultisampledRTT(S)===!1?k=G.get(S).__webglMultisampledFramebuffer:Array.isArray(we)?k=we[W]:k=we,de.copy(S.viewport),ve.copy(S.scissor),Ke=S.scissorTest}else de.copy(Ce).multiplyScalar(ee).floor(),ve.copy(_t).multiplyScalar(ee).floor(),Ke=Ge;if(W!==0&&(k=I),y.bindFramebuffer(N.FRAMEBUFFER,k)&&y.drawBuffers(S,k),y.viewport(de),y.scissor(ve),y.setScissorTest(Ke),H){let fe=G.get(S.texture);N.framebufferTexture2D(N.FRAMEBUFFER,N.COLOR_ATTACHMENT0,N.TEXTURE_CUBE_MAP_POSITIVE_X+O,fe.__webglTexture,W)}else if(pe){let fe=O;for(let Se=0;Se<S.textures.length;Se++){let we=G.get(S.textures[Se]);N.framebufferTextureLayer(N.FRAMEBUFFER,N.COLOR_ATTACHMENT0+Se,we.__webglTexture,W,fe)}}else if(S!==null&&W!==0){let fe=G.get(S.texture);N.framebufferTexture2D(N.FRAMEBUFFER,N.COLOR_ATTACHMENT0,N.TEXTURE_2D,fe.__webglTexture,W)}J=-1},this.readRenderTargetPixels=function(S,O,W,k,H,pe,ye,fe=0){if(!(S&&S.isWebGLRenderTarget)){Ie("WebGLRenderer.readRenderTargetPixels: renderTarget is not THREE.WebGLRenderTarget.");return}let Se=G.get(S).__webglFramebuffer;if(S.isWebGLCubeRenderTarget&&ye!==void 0&&(Se=Se[ye]),Se){y.bindFramebuffer(N.FRAMEBUFFER,Se);try{let we=S.textures[fe],Be=we.format,He=we.type;if(S.textures.length>1&&N.readBuffer(N.COLOR_ATTACHMENT0+fe),!P.textureFormatReadable(Be)){Ie("WebGLRenderer.readRenderTargetPixels: renderTarget is not in RGBA or implementation defined format.");return}if(!P.textureTypeReadable(He)){Ie("WebGLRenderer.readRenderTargetPixels: renderTarget is not in UnsignedByteType or implementation defined type.");return}O>=0&&O<=S.width-k&&W>=0&&W<=S.height-H&&N.readPixels(O,W,k,H,he.convert(Be),he.convert(He),pe)}finally{let we=$!==null?G.get($).__webglFramebuffer:null;y.bindFramebuffer(N.FRAMEBUFFER,we)}}},this.readRenderTargetPixelsAsync=async function(S,O,W,k,H,pe,ye,fe=0){if(!(S&&S.isWebGLRenderTarget))throw new Error("THREE.WebGLRenderer.readRenderTargetPixels: renderTarget is not THREE.WebGLRenderTarget.");let Se=G.get(S).__webglFramebuffer;if(S.isWebGLCubeRenderTarget&&ye!==void 0&&(Se=Se[ye]),Se)if(O>=0&&O<=S.width-k&&W>=0&&W<=S.height-H){y.bindFramebuffer(N.FRAMEBUFFER,Se);let we=S.textures[fe],Be=we.format,He=we.type;if(S.textures.length>1&&N.readBuffer(N.COLOR_ATTACHMENT0+fe),!P.textureFormatReadable(Be))throw new Error("THREE.WebGLRenderer.readRenderTargetPixelsAsync: renderTarget is not in RGBA or implementation defined format.");if(!P.textureTypeReadable(He))throw new Error("THREE.WebGLRenderer.readRenderTargetPixelsAsync: renderTarget is not in UnsignedByteType or implementation defined type.");let Te=N.createBuffer();N.bindBuffer(N.PIXEL_PACK_BUFFER,Te),N.bufferData(N.PIXEL_PACK_BUFFER,pe.byteLength,N.STREAM_READ),N.readPixels(O,W,k,H,he.convert(Be),he.convert(He),0);let nt=$!==null?G.get($).__webglFramebuffer:null;y.bindFramebuffer(N.FRAMEBUFFER,nt);let yt=N.fenceSync(N.SYNC_GPU_COMMANDS_COMPLETE,0);return N.flush(),await Md(N,yt,4),N.bindBuffer(N.PIXEL_PACK_BUFFER,Te),N.getBufferSubData(N.PIXEL_PACK_BUFFER,0,pe),N.deleteBuffer(Te),N.deleteSync(yt),pe}else throw new Error("THREE.WebGLRenderer.readRenderTargetPixelsAsync: requested read bounds are out of range.")},this.copyFramebufferToTexture=function(S,O=null,W=0){let k=Math.pow(2,-W),H=Math.floor(S.image.width*k),pe=Math.floor(S.image.height*k),ye=O!==null?O.x:0,fe=O!==null?O.y:0;q.setTexture2D(S,0),N.copyTexSubImage2D(N.TEXTURE_2D,W,0,0,ye,fe,H,pe),y.unbindTexture()},this.copyTextureToTexture=function(S,O,W=null,k=null,H=0,pe=0){let ye,fe,Se,we,Be,He,Te,nt,yt,mt=S.isCompressedTexture?S.mipmaps[pe]:S.image;if(W!==null)ye=W.max.x-W.min.x,fe=W.max.y-W.min.y,Se=W.isBox3?W.max.z-W.min.z:1,we=W.min.x,Be=W.min.y,He=W.isBox3?W.min.z:0;else{let vt=Math.pow(2,-H);ye=Math.floor(mt.width*vt),fe=Math.floor(mt.height*vt),S.isDataArrayTexture?Se=mt.depth:S.isData3DTexture?Se=Math.floor(mt.depth*vt):Se=1,we=0,Be=0,He=0}k!==null?(Te=k.x,nt=k.y,yt=k.z):(Te=0,nt=0,yt=0);let st=he.convert(O.format),kt=he.convert(O.type),xe;O.isData3DTexture?(q.setTexture3D(O,0),xe=N.TEXTURE_3D):O.isDataArrayTexture||O.isCompressedArrayTexture?(q.setTexture2DArray(O,0),xe=N.TEXTURE_2D_ARRAY):(q.setTexture2D(O,0),xe=N.TEXTURE_2D),y.activeTexture(N.TEXTURE0),y.pixelStorei(N.UNPACK_FLIP_Y_WEBGL,O.flipY),y.pixelStorei(N.UNPACK_PREMULTIPLY_ALPHA_WEBGL,O.premultiplyAlpha),y.pixelStorei(N.UNPACK_ALIGNMENT,O.unpackAlignment);let nn=y.getParameter(N.UNPACK_ROW_LENGTH),$e=y.getParameter(N.UNPACK_IMAGE_HEIGHT),pn=y.getParameter(N.UNPACK_SKIP_PIXELS),Ln=y.getParameter(N.UNPACK_SKIP_ROWS),ai=y.getParameter(N.UNPACK_SKIP_IMAGES);y.pixelStorei(N.UNPACK_ROW_LENGTH,mt.width),y.pixelStorei(N.UNPACK_IMAGE_HEIGHT,mt.height),y.pixelStorei(N.UNPACK_SKIP_PIXELS,we),y.pixelStorei(N.UNPACK_SKIP_ROWS,Be),y.pixelStorei(N.UNPACK_SKIP_IMAGES,He);let is=S.isDataArrayTexture||S.isData3DTexture,rt=O.isDataArrayTexture||O.isData3DTexture;if(S.isDepthTexture){let vt=G.get(S),oi=G.get(O),ct=G.get(vt.__renderTarget),ci=G.get(oi.__renderTarget);y.bindFramebuffer(N.READ_FRAMEBUFFER,ct.__webglFramebuffer),y.bindFramebuffer(N.DRAW_FRAMEBUFFER,ci.__webglFramebuffer);for(let ss=0;ss<Se;ss++)is&&(N.framebufferTextureLayer(N.READ_FRAMEBUFFER,N.COLOR_ATTACHMENT0,G.get(S).__webglTexture,H,He+ss),N.framebufferTextureLayer(N.DRAW_FRAMEBUFFER,N.COLOR_ATTACHMENT0,G.get(O).__webglTexture,pe,yt+ss)),N.blitFramebuffer(we,Be,ye,fe,Te,nt,ye,fe,N.DEPTH_BUFFER_BIT,N.NEAREST);y.bindFramebuffer(N.READ_FRAMEBUFFER,null),y.bindFramebuffer(N.DRAW_FRAMEBUFFER,null)}else if(H!==0||S.isRenderTargetTexture||G.has(S)){let vt=G.get(S),oi=G.get(O);y.bindFramebuffer(N.READ_FRAMEBUFFER,V),y.bindFramebuffer(N.DRAW_FRAMEBUFFER,F);for(let ct=0;ct<Se;ct++)is?N.framebufferTextureLayer(N.READ_FRAMEBUFFER,N.COLOR_ATTACHMENT0,vt.__webglTexture,H,He+ct):N.framebufferTexture2D(N.READ_FRAMEBUFFER,N.COLOR_ATTACHMENT0,N.TEXTURE_2D,vt.__webglTexture,H),rt?N.framebufferTextureLayer(N.DRAW_FRAMEBUFFER,N.COLOR_ATTACHMENT0,oi.__webglTexture,pe,yt+ct):N.framebufferTexture2D(N.DRAW_FRAMEBUFFER,N.COLOR_ATTACHMENT0,N.TEXTURE_2D,oi.__webglTexture,pe),H!==0?N.blitFramebuffer(we,Be,ye,fe,Te,nt,ye,fe,N.COLOR_BUFFER_BIT,N.NEAREST):rt?N.copyTexSubImage3D(xe,pe,Te,nt,yt+ct,we,Be,ye,fe):N.copyTexSubImage2D(xe,pe,Te,nt,we,Be,ye,fe);y.bindFramebuffer(N.READ_FRAMEBUFFER,null),y.bindFramebuffer(N.DRAW_FRAMEBUFFER,null)}else rt?S.isDataTexture||S.isData3DTexture?N.texSubImage3D(xe,pe,Te,nt,yt,ye,fe,Se,st,kt,mt.data):O.isCompressedArrayTexture?N.compressedTexSubImage3D(xe,pe,Te,nt,yt,ye,fe,Se,st,mt.data):N.texSubImage3D(xe,pe,Te,nt,yt,ye,fe,Se,st,kt,mt):S.isDataTexture?N.texSubImage2D(N.TEXTURE_2D,pe,Te,nt,ye,fe,st,kt,mt.data):S.isCompressedTexture?N.compressedTexSubImage2D(N.TEXTURE_2D,pe,Te,nt,mt.width,mt.height,st,mt.data):N.texSubImage2D(N.TEXTURE_2D,pe,Te,nt,ye,fe,st,kt,mt);y.pixelStorei(N.UNPACK_ROW_LENGTH,nn),y.pixelStorei(N.UNPACK_IMAGE_HEIGHT,$e),y.pixelStorei(N.UNPACK_SKIP_PIXELS,pn),y.pixelStorei(N.UNPACK_SKIP_ROWS,Ln),y.pixelStorei(N.UNPACK_SKIP_IMAGES,ai),pe===0&&O.generateMipmaps&&N.generateMipmap(xe),y.unbindTexture()},this.initRenderTarget=function(S){G.get(S).__webglFramebuffer===void 0&&q.setupRenderTarget(S)},this.initTexture=function(S){S.isCubeTexture?q.setTextureCube(S,0):S.isData3DTexture?q.setTexture3D(S,0):S.isDataArrayTexture||S.isCompressedArrayTexture?q.setTexture2DArray(S,0):q.setTexture2D(S,0),y.unbindTexture()},this.resetState=function(){X=0,B=0,$=null,y.reset(),me.reset()},typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("observe",{detail:this}))}get coordinateSystem(){return En}get outputColorSpace(){return this._outputColorSpace}set outputColorSpace(e){this._outputColorSpace=e;let t=this.getContext();t.drawingBufferColorSpace=We._getDrawingBufferColorSpace(e),t.unpackColorSpace=We._getUnpackColorSpace()}};var of=new hn,bc=new L,Bs=class extends Cr{constructor(){super(),this.isLineSegmentsGeometry=!0,this.type="LineSegmentsGeometry";let e=[-1,2,0,1,2,0,-1,1,0,1,1,0,-1,0,0,1,0,0,-1,-1,0,1,-1,0],t=[-1,2,1,2,-1,1,1,1,-1,-1,1,-1,-1,-2,1,-2],n=[0,2,1,2,3,1,2,4,3,4,5,3,4,6,5,6,7,5];this.setIndex(n),this.setAttribute("position",new lt(e,3)),this.setAttribute("uv",new lt(t,2))}applyMatrix4(e){let t=this.attributes.instanceStart,n=this.attributes.instanceEnd;return t!==void 0&&(t.applyMatrix4(e),n.applyMatrix4(e),t.needsUpdate=!0),this.boundingBox!==null&&this.computeBoundingBox(),this.boundingSphere!==null&&this.computeBoundingSphere(),this}setPositions(e){let t;e instanceof Float32Array?t=e:Array.isArray(e)&&(t=new Float32Array(e));let n=new Ai(t,6,1);return this.setAttribute("instanceStart",new Tn(n,3,0)),this.setAttribute("instanceEnd",new Tn(n,3,3)),this.instanceCount=this.attributes.instanceStart.count,this.computeBoundingBox(),this.computeBoundingSphere(),this}setColors(e){let t;e instanceof Float32Array?t=e:Array.isArray(e)&&(t=new Float32Array(e));let n=new Ai(t,6,1);return this.setAttribute("instanceColorStart",new Tn(n,3,0)),this.setAttribute("instanceColorEnd",new Tn(n,3,3)),this}fromWireframeGeometry(e){return this.setPositions(e.attributes.position.array),this}fromEdgesGeometry(e){return this.setPositions(e.attributes.position.array),this}fromMesh(e){return this.fromWireframeGeometry(new Tr(e.geometry)),this}fromLineSegments(e){let t=e.geometry;return this.setPositions(t.attributes.position.array),this}computeBoundingBox(){this.boundingBox===null&&(this.boundingBox=new hn);let e=this.attributes.instanceStart,t=this.attributes.instanceEnd;e!==void 0&&t!==void 0&&(this.boundingBox.setFromBufferAttribute(e),of.setFromBufferAttribute(t),this.boundingBox.union(of))}computeBoundingSphere(){this.boundingSphere===null&&(this.boundingSphere=new wn),this.boundingBox===null&&this.computeBoundingBox();let e=this.attributes.instanceStart,t=this.attributes.instanceEnd;if(e!==void 0&&t!==void 0){let n=this.boundingSphere.center;this.boundingBox.getCenter(n);let s=0;for(let r=0,a=e.count;r<a;r++)bc.fromBufferAttribute(e,r),s=Math.max(s,n.distanceToSquared(bc)),bc.fromBufferAttribute(t,r),s=Math.max(s,n.distanceToSquared(bc));this.boundingSphere.radius=Math.sqrt(s),isNaN(this.boundingSphere.radius)&&console.error("THREE.LineSegmentsGeometry.computeBoundingSphere(): Computed radius is NaN. The instanced position data is likely to have NaN values.",this)}}toJSON(){}};se.line={worldUnits:{value:1},linewidth:{value:1},resolution:{value:new _e},dashOffset:{value:0},dashScale:{value:1},dashSize:{value:1},gapSize:{value:1}};Zt.line={uniforms:Vr.merge([se.common,se.fog,se.line]),vertexShader:`
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
		`};var zs=class extends $t{constructor(e){super({type:"LineMaterial",uniforms:Vr.clone(Zt.line.uniforms),vertexShader:Zt.line.vertexShader,fragmentShader:Zt.line.fragmentShader,clipping:!0}),this.isLineMaterial=!0,this.setValues(e)}get color(){return this.uniforms.diffuse.value}set color(e){this.uniforms.diffuse.value=e}get worldUnits(){return"WORLD_UNITS"in this.defines}set worldUnits(e){e===!0!==this.worldUnits&&(this.needsUpdate=!0),e===!0?this.defines.WORLD_UNITS="":delete this.defines.WORLD_UNITS}get linewidth(){return this.uniforms.linewidth.value}set linewidth(e){this.uniforms.linewidth&&(this.uniforms.linewidth.value=e)}get dashed(){return"USE_DASH"in this.defines}set dashed(e){e===!0!==this.dashed&&(this.needsUpdate=!0),e===!0?this.defines.USE_DASH="":delete this.defines.USE_DASH}get dashScale(){return this.uniforms.dashScale.value}set dashScale(e){this.uniforms.dashScale.value=e}get dashSize(){return this.uniforms.dashSize.value}set dashSize(e){this.uniforms.dashSize.value=e}get dashOffset(){return this.uniforms.dashOffset.value}set dashOffset(e){this.uniforms.dashOffset.value=e}get gapSize(){return this.uniforms.gapSize.value}set gapSize(e){this.uniforms.gapSize.value=e}get opacity(){return this.uniforms.opacity.value}set opacity(e){this.uniforms&&(this.uniforms.opacity.value=e)}get resolution(){return this.uniforms.resolution.value}set resolution(e){this.uniforms.resolution.value.copy(e)}get alphaToCoverage(){return"USE_ALPHA_TO_COVERAGE"in this.defines}set alphaToCoverage(e){this.defines&&(e===!0!==this.alphaToCoverage&&(this.needsUpdate=!0),e===!0?this.defines.USE_ALPHA_TO_COVERAGE="":delete this.defines.USE_ALPHA_TO_COVERAGE)}};var Eh=new tt,cf=new L,lf=new L,Bt=new tt,zt=new tt,Xn=new tt,wh=new L,Th=new at,Vt=new Rr,hf=new L,Sc=new hn,Mc=new wn,qn=new tt,Yn,ts;function uf(i,e,t){return qn.set(0,0,-e,1).applyMatrix4(i.projectionMatrix),qn.multiplyScalar(1/qn.w),qn.x=ts/t.width,qn.y=ts/t.height,qn.applyMatrix4(i.projectionMatrixInverse),qn.multiplyScalar(1/qn.w),Math.abs(Math.max(qn.x,qn.y))}function yy(i,e){let t=i.matrixWorld,n=i.geometry,s=n.attributes.instanceStart,r=n.attributes.instanceEnd,a=Math.min(n.instanceCount,s.count);for(let o=0,c=a;o<c;o++){Vt.start.fromBufferAttribute(s,o),Vt.end.fromBufferAttribute(r,o),Vt.applyMatrix4(t);let l=new L,h=new L;Yn.distanceSqToSegment(Vt.start,Vt.end,h,l),h.distanceTo(l)<ts*.5&&e.push({point:h,pointOnLine:l,distance:Yn.origin.distanceTo(h),object:i,face:null,faceIndex:o,uv:null,uv1:null})}}function vy(i,e,t){let n=e.projectionMatrix,r=i.material.resolution,a=i.matrixWorld,o=i.geometry,c=o.attributes.instanceStart,l=o.attributes.instanceEnd,h=Math.min(o.instanceCount,c.count),d=-e.near;Yn.at(1,Xn),Xn.w=1,Xn.applyMatrix4(e.matrixWorldInverse),Xn.applyMatrix4(n),Xn.multiplyScalar(1/Xn.w),Xn.x*=r.x/2,Xn.y*=r.y/2,Xn.z=0,wh.copy(Xn),Th.multiplyMatrices(e.matrixWorldInverse,a);for(let u=0,f=h;u<f;u++){if(Bt.fromBufferAttribute(c,u),zt.fromBufferAttribute(l,u),Bt.w=1,zt.w=1,Bt.applyMatrix4(Th),zt.applyMatrix4(Th),Bt.z>d&&zt.z>d)continue;if(Bt.z>d){let E=Bt.z-zt.z,v=(Bt.z-d)/E;Bt.lerp(zt,v)}else if(zt.z>d){let E=zt.z-Bt.z,v=(zt.z-d)/E;zt.lerp(Bt,v)}Bt.applyMatrix4(n),zt.applyMatrix4(n),Bt.multiplyScalar(1/Bt.w),zt.multiplyScalar(1/zt.w),Bt.x*=r.x/2,Bt.y*=r.y/2,zt.x*=r.x/2,zt.y*=r.y/2,Vt.start.copy(Bt),Vt.start.z=0,Vt.end.copy(zt),Vt.end.z=0;let _=Vt.closestPointToPointParameter(wh,!0);Vt.at(_,hf);let g=jl.lerp(Bt.z,zt.z,_),p=g>=-1&&g<=1,b=wh.distanceTo(hf)<ts*.5;if(p&&b){Vt.start.fromBufferAttribute(c,u),Vt.end.fromBufferAttribute(l,u),Vt.start.applyMatrix4(a),Vt.end.applyMatrix4(a);let E=new L,v=new L;Yn.distanceSqToSegment(Vt.start,Vt.end,v,E),t.push({point:v,pointOnLine:E,distance:Yn.origin.distanceTo(v),object:i,face:null,faceIndex:u,uv:null,uv1:null})}}}var Ec=class extends Ot{constructor(e=new Bs,t=new zs({color:Math.random()*16777215})){super(e,t),this.isLineSegments2=!0,this.type="LineSegments2"}computeLineDistances(){let e=this.geometry,t=e.attributes.instanceStart,n=e.attributes.instanceEnd,s=new Float32Array(2*t.count);for(let a=0,o=0,c=t.count;a<c;a++,o+=2)cf.fromBufferAttribute(t,a),lf.fromBufferAttribute(n,a),s[o]=o===0?0:s[o-1],s[o+1]=s[o]+cf.distanceTo(lf);let r=new Ai(s,2,1);return e.setAttribute("instanceDistanceStart",new Tn(r,1,0)),e.setAttribute("instanceDistanceEnd",new Tn(r,1,1)),this}raycast(e,t){let n=this.material.worldUnits,s=e.camera;if(s===null&&!n&&console.error('LineSegments2: "Raycaster.camera" needs to be set in order to raycast against LineSegments2 while worldUnits is set to false.'),n===!1&&(this.material.resolution.x===0||this.material.resolution.y===0))return;let r=e.params.Line2!==void 0&&e.params.Line2.threshold||0;Yn=e.ray;let a=this.matrixWorld,o=this.geometry,c=this.material;ts=c.linewidth+r,o.boundingSphere===null&&o.computeBoundingSphere(),Mc.copy(o.boundingSphere).applyMatrix4(a);let l;if(n)l=ts*.5;else{let d=Math.max(s.near,Mc.distanceToPoint(Yn.origin));l=uf(s,d,c.resolution)}if(Mc.radius+=l,Yn.intersectsSphere(Mc)===!1)return;o.boundingBox===null&&o.computeBoundingBox(),Sc.copy(o.boundingBox).applyMatrix4(a);let h;if(n)h=ts*.5;else{let d=Math.max(s.near,Sc.distanceToPoint(Yn.origin));h=uf(s,d,c.resolution)}Sc.expandByScalar(h),Yn.intersectsBox(Sc)!==!1&&(n?yy(this,t):vy(this,s,t))}onBeforeRender(e){let t=this.material.uniforms;t&&t.resolution&&(e.getViewport(Eh),this.material.uniforms.resolution.value.set(Eh.z,Eh.w))}};var Rt={background:15921386,face:14079702,faceSelected:9417960,faceHover:11980784,edge:2763306,edgeWire:1118481,edgeSelected:2845872,edgeHot:13382451,grid:14276303,axisX:13382451,axisY:3050327,axisZ:2845872,charged:9133302},by={endpoint:3050327,midpoint:42405,"on-edge":13382451,origin:9133302,align:9133302,"align-combo":9133302,"edge-align":13382451,intersection:1118481,"cross-line":1118481,"axis-x":Rt.axisX,"axis-y":Rt.axisY,"axis-z":Rt.axisZ,"h-stop":14251782,"on-face":2845872},Sy={x:Rt.axisX,y:Rt.axisY,z:Rt.axisZ,u:8947848,v:8947848,i:1118481},My=1.6,df=1.2,Ah=1.4,wc=class{constructor(e){ge(this,"renderer");ge(this,"scene");ge(this,"camOrtho");ge(this,"camPersp");ge(this,"staticGroup");ge(this,"dyn",null);ge(this,"dpr",1);ge(this,"lineMats",[]);ge(this,"resolution");this.renderer=new _c({canvas:e,antialias:!0}),this.scene=new cr,this.scene.background=new Xe(Rt.background),this.camOrtho=new Ji(-1,1,1,-1,.1,2e4),this.camPersp=new Wt(50,1,1,2e4),this.resolution=new _e(1,1),this.staticGroup=this.buildStatic(),this.scene.add(this.staticGroup)}resize(e,t){this.dpr=t,this.renderer.setPixelRatio(t),this.renderer.setSize(e.w,e.h,!1),this.resolution.set(e.w*t,e.h*t)}worldPerPx(e,t,n){return e.projection==="persp"?2*Math.max(ie(Fe(n,e.eye()),e.forward()),.5)*Math.tan(e.fovY/2)/t.h:2*e.halfH/t.h}syncCamera(e,t){let n=e.eye(),s=e.up(),r;if(e.projection==="persp"){r=this.camPersp;let a=e.eyeDist();r.fov=e.fovY*180/Math.PI,r.aspect=t.w/t.h,r.near=Math.max(.5,a*.02),r.far=a*40+5e3}else{r=this.camOrtho;let a=e.halfW(t);r.left=-a,r.right=a,r.top=e.halfH,r.bottom=-e.halfH,r.near=.1,r.far=2e4}return r.position.set(n.x,n.y,n.z),r.up.set(s.x,s.y,s.z),r.lookAt(e.target.x,e.target.y,e.target.z),r.updateProjectionMatrix(),r}render(e,t,n,s){let r=this.syncCamera(t,n);this.dyn&&(this.scene.remove(this.dyn),this.dyn.traverse(h=>{h.geometry?.dispose(),h.material?.dispose?.()}));let a=new On,o=s.preview??e,c=Ey(t);for(let h of o.faces()){let d=s.selectionFaces.has(h.id)?Rt.faceSelected:s.hoverFace===h.id?Rt.faceHover:Rt.face,u=o.planeOf(h.id),f=u?Math.abs(ie(u.plane.n,c)):1,m=Ty(o,h.id,wy(d,.66+.34*f));m&&a.add(m)}let l=new Map;for(let h of o.edges()){let d=s.scrubEdges.has(h.id)||s.hoverEdge===h.id?Rt.edgeHot:s.selectionEdges.has(h.id)?Rt.edgeSelected:h.faceLinks.length===0?Rt.edgeWire:Rt.edge,u=l.get(d)??l.set(d,[]).get(d),f=o.graph.pt(h.a),m=o.graph.pt(h.b);u.push(f.x,f.y,f.z,m.x,m.y,m.z)}for(let[h,d]of l)a.add(this.fatLines(d,h,My,{offset:!0}));if(s.charged?.length)for(let h of s.charged)a.add(this.marker(h,Rt.charged,4,t,n));if(s.snap?.kind){let h=by[s.snap.kind]??2845872;if(a.add(this.marker(s.snap.p,h,5,t,n)),s.snap.hints?.length)for(let d of s.snap.hints)a.add(this.fatLines([d.a.x,d.a.y,d.a.z,d.b.x,d.b.y,d.b.z],Sy[d.axis]??8947848,df,{offset:!0}));else if(s.snap.kind.startsWith("axis")&&s.snapAnchor){let d=s.snapAnchor,u=s.snap.p;a.add(this.fatLines([d.x,d.y,d.z,u.x,u.y,u.z],h,df,{offset:!0}))}}this.dyn=a,this.scene.add(a),this.renderer.render(this.scene,r)}marker(e,t,n,s,r){let a=n*this.worldPerPx(s,r,e),o=new Ot(new wr(a,12,8),new Mi({color:t,depthTest:!1}));return o.renderOrder=10,o.position.set(e.x,e.y,e.z),o}fatLines(e,t,n,s={}){let r=new Bs;r.setPositions(e);let a=new zs({color:t,linewidth:n*this.dpr,resolution:this.resolution,depthTest:!s.overlay,polygonOffset:!!s.offset,polygonOffsetFactor:-1,polygonOffsetUnits:-2}),o=new Ec(r,a);return s.overlay&&(o.renderOrder=10),o}buildStatic(){let e=new On,t=[],n=20,s=50;for(let o=-n;o<=n;o++)o!==0&&(t.push(o*s,-n*s,0,o*s,n*s,0),t.push(-n*s,o*s,0,n*s,o*s,0));let r=new Nt;r.setAttribute("position",new lt(t,3)),e.add(new fr(r,new As({color:Rt.grid})));let a=n*s;return e.add(this.fatLines([-a,0,0,a,0,0],Rt.axisX,Ah)),e.add(this.fatLines([0,-a,0,0,a,0],Rt.axisY,Ah)),e.add(this.fatLines([0,0,0,0,0,a],Rt.axisZ,Ah)),e}};function Ey(i){let e=i.eyeDir(),t=i.up(),n=i.right(),s={x:e.x+t.x*.55+n.x*.35,y:e.y+t.y*.55+n.y*.35,z:e.z+t.z*.55+n.z*.35},r=Math.hypot(s.x,s.y,s.z)||1;return{x:s.x/r,y:s.y/r,z:s.z/r}}function wy(i,e){let t=n=>Math.max(0,Math.min(255,Math.round(n*e)));return t(i>>16&255)<<16|t(i>>8&255)<<8|t(i&255)}function Ty(i,e,t){let n=i.face(e),s=i.planeOf(e);if(!n||!s)return null;let r=new Rs(n.outer.pts.map(f=>new _e(f.x,f.y)));for(let f of n.holes)r.holes.push(new Ki(f.pts.map(m=>new _e(m.x,m.y))));let a=new Er(r),{u:o,v:c}=s.basis,l=s.plane.n,h=s.plane.d,d=new at;d.set(o.x,c.x,l.x,l.x*h,o.y,c.y,l.y,l.y*h,o.z,c.z,l.z,l.z*h,0,0,0,1),a.applyMatrix4(d);let u=new Mi({color:t,side:_n,polygonOffset:!0,polygonOffsetFactor:1,polygonOffsetUnits:1});return new Ot(a,u)}function ff(i,e){let t=i.face(e),n=i.planeOf(e);if(!t||!n)return[];let s=t.outer.pts.map(f=>new _e(f.x,f.y)),r=t.holes.map(f=>f.pts.map(m=>new _e(m.x,m.y))),a=yi.triangulateShape(s,r),o=[...s,...r.flat()],{u:c,v:l}=n.basis,h=n.plane.n,d=n.plane.d,u=f=>({x:c.x*f.x+l.x*f.y+h.x*d,y:c.y*f.x+l.y*f.y+h.y*d,z:c.z*f.x+l.z*f.y+h.z*d});return a.map(([f,m,_])=>[u(o[f]),u(o[m]),u(o[_])])}var gt=(i,e)=>({x:i,y:e}),Di=(i,e,t,n)=>[[gt(i,e),gt(t,e)],[gt(t,e),gt(t,n)],[gt(t,n),gt(i,n)],[gt(i,n),gt(i,e)]],Vs=[{name:"\u65E5\u5B57",note:"\u4E24\u819C\u5171\u8FB9\u2014\u2014\u64E6\u4E2D\u7F1D\u8BE5 MERGE",batches:[Di(-100,-60,100,60),[[gt(-100,0),gt(100,0)]]],expectFaces:2},{name:"\u56DE\u5B57",note:"\u73AF\u5E26+\u5185\u5C9B\u2014\u2014\u5220\u5185\u819C\u518D\u64E6\u6D1E\u8FB9\u770B ABSORB",batches:[Di(-100,-100,100,100),Di(-40,-40,40,40)],expectFaces:2},{name:"\u4E09\u5C42\u56DE\u5B57",note:"\u6697\u7901\u2460\u73B0\u573A\uFF1A\u4E2D\u73AF\u64E6=ABSORB\uFF1F\u5185\u73AF\u64E6=BURST\uFF1F\uFF08\u63A8\u5BFC\u503C\u5F85\u771F\u673A SU \u88C1\u51B3\uFF09",batches:[Di(-120,-120,120,120),Di(-75,-75,75,75),Di(-30,-30,30,30)],expectFaces:3},{name:"\u7530\u5B57",note:"\u5341\u5B57\u5212\u5206\u2014\u2014\u56DB\u819C\uFF1B\u64E6\u5341\u5B57\u4EFB\u4E00\u81C2\u770B MERGE \u94FE",batches:[Di(-100,-100,100,100),[[gt(0,-100),gt(0,100)]],[[gt(-100,0),gt(100,0)]]],expectFaces:4},{name:"T \u89E6\u78B0",note:"\u5916\u6765\u7EBF T \u5230\u8FB9\u4E0A\u2014\u2014\u5207\u8FB9\u4E0D\u751F\u819C\uFF08\u624B\u52BF\u8FB9\u88C1\u51B3\u7684\u53CD\u4F8B\u4F4D\uFF09",batches:[Di(-100,-60,100,60),[[gt(0,60),gt(0,140)]]],expectFaces:1},{name:"\u5F00\u53E3\u65B9",note:"\u4E09\u8FB9\u5F00\u53E3\u2014\u2014\u4E0D\u51FA\u819C\uFF1B\u4F60\u8865\u7B2C\u56DB\u7B14\u770B BIRTH\uFF08\u63CF\u4E00\u7B14\u5C31\u51FA\uFF09",batches:[[[gt(-80,-80),gt(80,-80)],[gt(80,-80),gt(80,80)],[gt(80,80),gt(-80,80)]]],expectFaces:0}];function pf(i,e){return e.batches.map(t=>i.addEdges(t))}function Ph(i,e){switch(e.op){case"clear":return{kernel:new hi,events:[]};case"preset":{let t=new hi,n=Vs.find(s=>s.name===e.name);return{kernel:t,events:n?pf(t,n).flat():[]}}case"addEdges":return{kernel:i,events:i.addEdges(e.segs)};case"eraseEdges":return{kernel:i,events:i.eraseEdges(e.ids)};case"eraseFaces":return{kernel:i,events:i.eraseFaces(e.ids)};case"eraseSelection":return{kernel:i,events:[...i.eraseFaces(e.faces),...i.eraseEdges(e.edges)]};case"move":return{kernel:i,events:i.moveVertices(e.moves)};case"pushpull":return{kernel:i,events:i.pushPull(e.face,e.dist)}}}var Tc=class{constructor(){ge(this,"ops",[]);ge(this,"undone",[])}canUndo(){return this.ops.length>0}canRedo(){return this.undone.length>0}size(){return this.ops.length}commit(e,t){return this.ops.push(t),this.undone=[],Ph(e,t)}undo(){return this.ops.length?(this.undone.push(this.ops.pop()),this.replay()):null}redo(e){let t=this.undone.pop();return t?(this.ops.push(t),Ph(e,t)):null}replay(){let e=new hi;for(let t of this.ops)e=Ph(e,t).kernel;return e}};var Ay=8,Py=6,Cy={endpoint:10,origin:10,midpoint:10,"on-edge":7,"edge-align":12,"align-combo":12,align:5,"axis-x":5,"axis-y":5,"axis-z":5},mf={endpoint:"\u7AEF\u70B9",midpoint:"\u4E2D\u70B9","on-edge":"\u8FB9\u4E0A",origin:"\u539F\u70B9","axis-x":"X \u8F74","axis-y":"Y \u8F74","axis-z":"Z \u8F74",align:"\u5171\u8F74","align-combo":"\u5171\u8F74\u89D2\u70B9","edge-align":"\u8FB9\u4E0A\xB7\u5171\u8F74",intersection:"\u4EA4\u70B9","cross-line":"\u4EA4\u7EBF","h-stop":"\u9AD8\u5EA6\u54AC\u5408","on-face":"\u9762\u4E0A"};function Rh(i){switch(i.type){case"BIRTH":return`\u8BDE\u751F \u9762#${i.face}`;case"DIVIDE":return`\u5206\u5272 \u9762#${i.from} \u2192 ${i.into.map(e=>`#${e}`).join(" + ")}`;case"MERGE":return`\u5408\u5E76 ${i.from.map(e=>`#${e}`).join("+")} \u2192 \u9762#${i.into}`;case"ABSORB":return`\u541E\u6D1E \u9762#${i.from} \u2192 \u9762#${i.into}`;case"BURST":return`\u7834\u819C \u9762#${i.face}`;case"STRETCH":return`\u62C9\u4F38 ${i.faces.map(e=>`\u9762#${e}`).join(" ")}`;case"FACE_ERASED":return`\u5220\u819C \u9762#${i.face}`}}var Ch=(i,e)=>Math.hypot(i.x-e.x,i.y-e.y,i.z-e.z);function Wr(i,e=1){let t=Number(i.toFixed(e));return(Math.abs(i-t)>1e-6?"~":"")+t.toFixed(e)}var Ac=class{constructor(e,t){this.canvas=e;this.host=t;ge(this,"cam",new sa);ge(this,"r3");ge(this,"checkpoint",new hi);ge(this,"journal",new Tc);ge(this,"_tool","line");ge(this,"anchor3",null);ge(this,"gesturePlane",kc);ge(this,"rectFixed",null);ge(this,"cursor3",null);ge(this,"snapInfo",null);ge(this,"moveVids",[]);ge(this,"ppFace",null);ge(this,"ppNormal",null);ge(this,"ppH",0);ge(this,"ppShellVids",new Set);ge(this,"ppKnownVids",new Set);ge(this,"ppStops",[]);ge(this,"scrubAcc",new Set);ge(this,"scrubbing",!1);ge(this,"selection",Dn());ge(this,"marqueeStart",null);ge(this,"marqueeCur",null);ge(this,"hoverEdge",null);ge(this,"hoverFace",null);ge(this,"live",null);ge(this,"liveEvents",[]);ge(this,"armed",!1);ge(this,"canArm",!1);ge(this,"downScreen",null);ge(this,"justCommitted",!1);ge(this,"charged",new Map);ge(this,"dwell",null);ge(this,"lastSnap",null);this.r3=new wc(e),this.cam.pitch=.61,this.cam.halfH=220,this.cam.projection="persp"}get tool(){return this._tool}get kernel(){return this.checkpoint}canUndo(){return this.journal.canUndo()}canRedo(){return this.journal.canRedo()}hasSelection(){return this.selection.edges.size>0||this.selection.faces.size>0}isGestureActive(){return this.gestureActive()}vp(){return{w:this.canvas.clientWidth,h:this.canvas.clientHeight}}snapPx(){return Ay*Vi(this.vp())}hitPx(){return Py*Vi(this.vp())}setTool(e){this._tool=e,this.cancelGesture(),this.host.changed(),this.draw()}cancel(){this.selection=Dn(),this.cancelGesture(),this.host.changed(),this.draw()}cancelGesture(){this.anchor3=null,this.moveVids=[],this.ppFace=null,this.ppNormal=null,this.ppShellVids=new Set,this.ppKnownVids=new Set,this.ppStops=[],this.ppH=0,this.rectFixed=null,this.lastSnap=null,this.armed=!1,this.canArm=!1,this.downScreen=null,this.justCommitted=!1,this.cursor3=null,this.snapInfo=null,this.scrubAcc=new Set,this.scrubbing=!1,this.marqueeStart=this.marqueeCur=null,this.hoverEdge=null,this.hoverFace=null,this.live=null,this.liveEvents=[],this.host.marquee(null),this.host.tip(null,0,0),this.host.hint(null)}commitOp(e){let t=this.journal.commit(this.checkpoint,e);return this.checkpoint=t.kernel,this.revalidateCharged(),this.host.changed(),t.events}emit(e){e.length&&this.host.events(e)}undo(){let e=this.journal.undo();e&&(this.checkpoint=e,this.revalidateCharged(),this.cancelGesture(),this.selection=Dn(),this.host.separator("\u64A4\u9500"),this.host.changed(),this.draw())}redo(){let e=this.journal.redo(this.checkpoint);e&&(this.checkpoint=e.kernel,this.revalidateCharged(),this.cancelGesture(),this.selection=Dn(),this.host.separator("\u91CD\u505A"),this.emit(e.events),this.host.changed(),this.draw())}clearAll(){this.cancelGesture(),this.selection=Dn(),this.clearCharged(),this.host.separator("\u6E05\u7A7A"),this.commitOp({op:"clear"}),this.draw()}applyPreset(e){let t=Vs.find(n=>n.name===e);return t?(this.cancelGesture(),this.selection=Dn(),this.clearCharged(),this.host.separator(`\u9884\u7F6E\uFF1A${t.name}\uFF08${t.note}\uFF09`),this.emit(this.commitOp({op:"preset",name:e})),this.draw(),!0):!1}addSegments(e,t){this.cancelGesture(),this.selection=Dn(),this.host.separator(t);let n=this.commitOp({op:"addEdges",segs:e});return this.emit(n),this.draw(),n}deleteSelection(){this.hasSelection()&&(this.emit(this.commitOp({op:"eraseSelection",faces:[...this.selection.faces],edges:[...this.selection.edges]})),this.selection=Dn(),this.host.changed(),this.draw())}setView(e){this.cam.setView(e),this.draw()}zoomExtents(){this.cam.fitPoints(this.checkpoint.vertices(),this.vp()),this.draw()}toggleProjection(){this.cam.projection=this.cam.projection==="persp"?"ortho":"persp",this.host.changed(),this.draw()}alignSrcs(){return[...this.charged.values()]}chargePt(e){let t=`${e.x},${e.y},${e.z}`;for(this.charged.delete(t),this.charged.set(t,{...e});this.charged.size>3;)this.charged.delete(this.charged.keys().next().value)}trackCharge(e,t=300){if(!e||e.kind!=="endpoint"&&e.kind!=="midpoint"){this.dwell=null;return}let n=`${e.p.x},${e.p.y},${e.p.z}`;if(this.charged.has(n)){this.dwell=null;return}let s=performance.now();if(!this.dwell||this.dwell.key!==n){this.dwell={key:n,since:s};return}s-this.dwell.since>=t&&(this.chargePt(e.p),this.dwell=null)}revalidateCharged(){if(!this.charged.size)return;let e=new Set;for(let t of this.checkpoint.vertices())e.add(`${t.x},${t.y},${t.z}`);for(let t of this.checkpoint.edges()){let n=this.checkpoint.graph.pt(t.a),s=this.checkpoint.graph.pt(t.b);e.add(`${(n.x+s.x)/2},${(n.y+s.y)/2},${(n.z+s.z)/2}`)}for(let t of[...this.charged.keys()])e.has(t)||this.charged.delete(t)}clearCharged(){this.charged.clear(),this.dwell=null,this.lastSnap=null}applyHysteresis(e,t,n){if(e.kind!==null)return this.lastSnap=e,e;if(this.lastSnap?.kind){let s=this.cam.worldToScreen(this.lastSnap.p,this.vp());if(Math.hypot(t-s.x,n-s.y)<=(Cy[this.lastSnap.kind]??8)*1.5*Vi(this.vp()))return this.lastSnap}return this.lastSnap=null,e}gestureActive(){return this.anchor3!==null||this.moveVids.length>0||this.scrubbing||this.marqueeStart!==null}liveWorld(){return this.gestureActive()?this.live??this.checkpoint:this.checkpoint}freshHand(e,t=!1){let n=new Set(this.checkpoint.vertices().map(r=>r.id)),s={has:r=>!n.has(r)||(e?.(r)??!1),opaque:t};if(this._tool==="line"||this._tool==="rect"){let r=new Set;for(let a of this.liveEvents)a.type==="BIRTH"&&r.add(a.face);s.faces=a=>r.has(a)}return s}computeLive(){this.live=null,this.liveEvents=[];let e=s=>{let r=this.checkpoint.clone();this.liveEvents=s(r),this.live=r},t=this._tool,n="";if(t==="line"&&this.anchor3&&this.cursor3){let s=this.anchor3,r=this.cursor3;n=`\u957F ${Wr(Ch(s,r))}`,Ch(s,r)>=1&&e(a=>a.addEdges([[s,r]]))}else if(t==="rect"&&this.anchor3&&this.cursor3){let{plane:s,basis:r}=this.gesturePlane,a=Wc(s,r,this.anchor3,this.cursor3),o=Fe(this.cursor3,this.anchor3),c=o.x*r.u.x+o.y*r.u.y+o.z*r.u.z,l=o.x*r.v.x+o.y*r.v.y+o.z*r.v.z;n=`\u77E9\u5F62 ${Wr(Math.abs(c))} \xD7 ${Wr(Math.abs(l))}`,a.length&&e(h=>h.addEdges(a))}else if(t==="move"&&this.moveVids.length&&this.anchor3&&this.cursor3){let s=Fe(this.cursor3,this.anchor3),r=this.moveVids;Math.hypot(s.x,s.y,s.z)>=.3&&e(a=>a.moveVertices(qc(this.checkpoint,r,s)))}else if(t==="pp"&&this.ppFace!==null&&Math.abs(this.ppH)>=.3){let s=this.ppFace,r=this.ppH-Math.sign(this.ppH)*2e-6;e(a=>a.pushPull(s,r,{settleLanding:!1}))}else if(t==="erase"&&this.scrubbing&&this.scrubAcc.size){let s=[...this.scrubAcc];e(r=>r.eraseEdges(s))}else if(t==="eraseFace"&&this.hoverFace!==null){let s=this.hoverFace;e(r=>r.eraseFaces([s]))}if(this.live||n){let s=this.live?this.liveEvents.length?`\u9884\u89C8\uFF1A${this.liveEvents.map(Rh).join("\uFF1B")}`:"\u9884\u89C8\uFF1A\u65E0\u819C\u53D8\u5316":"";this.host.hint([n,s].filter(Boolean).join(" \uFF5C "))}}lineSecondSnap(e,t){let n=ca(this.liveWorld(),this.cam,this.vp(),this.anchor3,e,t,this.snapPx(),this.alignSrcs(),this.freshHand());return this.gesturePlane=n.plane,n.snap}rectPlaneSnap(e,t){if(this.rectFixed)return this.snapInfo=gn(this.liveWorld(),this.cam,this.vp(),e,t,this.snapPx(),{plane:this.gesturePlane,alignSources:this.alignSrcs(),hand:this.freshHand()}),this.snapInfo.p;let n=ca(this.liveWorld(),this.cam,this.vp(),this.anchor3,e,t,this.snapPx(),this.alignSrcs(),this.freshHand());return this.gesturePlane=n.plane,this.snapInfo=n.snap,n.snap.p}draw(){this.r3.render(this.checkpoint,this.cam,this.vp(),{selectionEdges:this.selection.edges,selectionFaces:this.selection.faces,scrubEdges:this.scrubAcc,hoverEdge:this.hoverEdge,hoverFace:this.hoverFace,preview:this.live,snap:this.snapInfo,snapAnchor:this.anchor3,charged:this.alignSrcs()})}resize(e){this.r3.resize(this.vp(),e),this.draw()}updateTip(e,t){this.host.tip(this.snapInfo?.kind?mf[this.snapInfo.kind]??this.snapInfo.kind:null,e,t)}pointerDown(e){let t=e;switch(this._tool){case"line":case"rect":{if(this.armed&&this.anchor3){this.justCommitted=!0,this._tool==="line"?this.commitLineTo(t.x,t.y):this.commitRectTo(t.x,t.y);break}if(this._tool==="rect"){let n=Gc(this.liveWorld(),this.cam,this.vp(),t.x,t.y,this.snapPx(),this.alignSrcs());this.rectFixed=n.fixed,this.gesturePlane=n.plane,this.snapInfo=n.snap}else{let n=Gc(this.liveWorld(),this.cam,this.vp(),t.x,t.y,this.snapPx(),this.alignSrcs());this.gesturePlane=n.plane,this.snapInfo=n.snap}this.anchor3=this.snapInfo.p,this.cursor3=this.anchor3,this.armed=!1,this.canArm=e.pointerType==="mouse",this.downScreen={x:t.x,y:t.y};break}case"pp":{if(this.armed&&this.ppFace!==null&&this.anchor3){this.justCommitted=!0,this.commitPP();break}let n={face:Gs(this.liveWorld(),this.cam,this.vp(),t.x,t.y)};if(n.face!==void 0){let s=this.checkpoint,r=s.planeOf(n.face);this.ppFace=n.face;let a=s.face(n.face);this.ppShellVids=new Set([...sn(s.graph,a.outer),...a.holes.flatMap(l=>sn(s.graph,l))]),this.ppKnownVids=new Set(s.vertices().map(l=>l.id)),this.ppNormal=r.plane.n,this.gesturePlane={plane:r.plane,basis:r.basis};let o=this.cam.screenRay(t.x,t.y,this.vp()),c=zi(o.origin,o.dir,r.plane.n,r.plane.d);this.anchor3=c??s.faceRings3(n.face).outer[0];{let l=new Set;l.add(0);for(let h of s.vertices())l.add(Math.round(ie(Fe(h,this.anchor3),r.plane.n)*1e6)/1e6);this.ppStops=[...l].sort((h,d)=>h-d)}this.cursor3=this.anchor3,this.ppH=0,this.armed=!1,this.canArm=e.pointerType==="mouse",this.downScreen={x:t.x,y:t.y},this.host.hint("\u63A8\u62C9\u4E2D\uFF1A\u6CBF\u6CD5\u5411\u62D6\u6216\u70B9\u4E24\u4E0B\u843D\u5B9A\uFF08\u6240\u89C1\u5373\u6240\u5F97\uFF1B\u5438\u70B9\u7EBF=\u53D6\u5176\u9AD8\u5EA6\uFF09")}break}case"move":{if(this.armed&&this.moveVids.length&&this.anchor3){this.justCommitted=!0,this.commitMoveTo(t.x,t.y);break}let n=Kn(this.liveWorld(),this.cam,this.vp(),t.x,t.y,this.hitPx()),s=this.hasSelection();this.moveVids=s?hu(this.checkpoint,this.selection):Xc(this.checkpoint,n),this.moveVids.length&&(this.gesturePlane=Hc(this.liveWorld(),this.cam,this.vp(),t.x,t.y),this.anchor3=n.vertex!==void 0?this.checkpoint.graph.pt(n.vertex):gn(this.liveWorld(),this.cam,this.vp(),t.x,t.y,this.snapPx(),{plane:this.gesturePlane,alignSources:this.alignSrcs(),hand:this.freshHand()}).p,this.cursor3=this.anchor3,this.armed=!1,this.canArm=e.pointerType==="mouse",this.downScreen={x:t.x,y:t.y},this.host.hint(s?"\u79FB\u52A8\u9009\u533A\uFF1A\u53C2\u8003\u70B9\u5DF2\u62FE\u53D6\uFF0C\u62D6\u62FD\u6216\u70B9\u4E24\u4E0B\u653E\u7F6E":"\u79FB\u52A8\u4E2D\u2026\u62D6\u62FD\u6216\u70B9\u4E24\u4E0B\u653E\u7F6E\uFF08\u6240\u89C1\u5373\u6240\u5F97\uFF09"));break}case"erase":{this.scrubbing=!0,this.scrubAcc=new Set,this.hoverEdge=null;let n=Kn(this.liveWorld(),this.cam,this.vp(),t.x,t.y,this.hitPx());n.edge!==void 0&&this.scrubAcc.add(n.edge),this.computeLive();break}case"select":this.marqueeStart={x:t.x,y:t.y},this.marqueeCur={x:t.x,y:t.y};break;case"eraseFace":break}this.draw()}pointerMove(e){let t=e;if(!this.gestureActive()){this.snapInfo=null,this.hoverEdge=null,this.hoverFace=null;let n=this._tool;if(n==="line"||n==="rect"||n==="move"){let s=Hc(this.liveWorld(),this.cam,this.vp(),t.x,t.y);this.snapInfo=this.applyHysteresis(gn(this.liveWorld(),this.cam,this.vp(),t.x,t.y,this.snapPx(),{plane:s,alignSources:this.alignSrcs(),hand:this.freshHand()}),t.x,t.y),this.trackCharge(this.snapInfo)}else n==="erase"?this.hoverEdge=Kn(this.liveWorld(),this.cam,this.vp(),t.x,t.y,this.hitPx(),this.checkpoint).edge??null:n==="eraseFace"&&(this.hoverFace=Gs(this.liveWorld(),this.cam,this.vp(),t.x,t.y)??null,this.computeLive());this.updateTip(e.clientX,e.clientY),this.draw();return}switch(this._tool){case"line":this.anchor3&&(this.snapInfo=this.applyHysteresis(this.lineSecondSnap(t.x,t.y),t.x,t.y),this.trackCharge(this.snapInfo,120),this.cursor3=this.snapInfo.p);break;case"rect":this.anchor3&&(this.cursor3=this.rectPlaneSnap(t.x,t.y));break;case"pp":this.ppTrack(t.x,t.y);break;case"move":if(this.moveVids.length&&this.anchor3){let n=new Set(this.moveVids);this.snapInfo=this.applyHysteresis(gn(this.liveWorld(),this.cam,this.vp(),t.x,t.y,this.snapPx(),{plane:this.gesturePlane,anchor:this.anchor3,alignSources:this.alignSrcs(),hand:this.freshHand(s=>n.has(s))}),t.x,t.y),this.trackCharge(this.snapInfo,120),this.cursor3=this.snapInfo.p}break;case"erase":{let n=Kn(this.liveWorld(),this.cam,this.vp(),t.x,t.y,this.hitPx(),this.checkpoint);n.edge!==void 0&&this.scrubAcc.add(n.edge);break}case"select":if(this.marqueeStart){this.marqueeCur={x:t.x,y:t.y};let n=Math.min(this.marqueeStart.x,t.x),s=Math.max(this.marqueeStart.x,t.x),r=Math.min(this.marqueeStart.y,t.y),a=Math.max(this.marqueeStart.y,t.y);this.host.marquee({x:n,y:r,w:s-n,h:a-r})}break;case"eraseFace":break}this._tool!=="select"&&this.computeLive(),this.updateTip(e.clientX,e.clientY),this.draw()}ppTrack(e,t){if(this.ppFace===null||!this.anchor3||!this.ppNormal)return;let n=this.anchor3,s=this.ppNormal,r=this.liveWorld(),a=this.ppH,o={has:f=>this.ppShellVids.has(f)||!this.ppKnownVids.has(f)&&Math.abs(ie(Fe(r.graph.pt(f),n),s)-a)<.01,opaque:!0},c=this.applyHysteresis(gn(r,this.cam,this.vp(),e,t,this.snapPx(),{plane:this.gesturePlane,anchor:n,lines:!1,hand:o}),e,t);this.hoverFace=null;let l="",h=!1;if(c.kind!==null)this.snapInfo=c,this.ppH=ie(Fe(c.p,n),s),l=`\uFF5C\u53D6${mf[c.kind]??c.kind}\u9AD8\u5EA6`;else{this.snapInfo=null;let f=this.cam.screenRay(e,t,this.vp()),m=Kn(r,this.cam,this.vp(),e,t,.5).face,_=m!==void 0?r.planeOf(m):void 0,g=m!==void 0&&(()=>{let p=r.face(m);return p?[...sn(r.graph,p.outer),...p.holes.flatMap(b=>sn(r.graph,b))].some(o.has):!0})();if(m!==void 0&&m!==this.ppFace&&!g&&_&&Math.abs(ie(_.plane.n,s))>.05){let p=zi(f.origin,f.dir,_.plane.n,_.plane.d);p&&(this.ppH=ie(Fe(p,n),s),this.hoverFace=m,l="\uFF5C\u53D6\u9762#"+m+" \u9AD8\u5EA6")}else{let p=ra(n,s,f.origin,f.dir);p?this.ppH=ie(Fe(p,n),s):h=!0;let b=this.cam.worldToScreen(n,this.vp()),E=this.cam.worldToScreen(Ve(n,s),this.vp()),v=Math.max(Math.hypot(E.x-b.x,E.y-b.y),.5),A=7*Vi(this.vp())/v,M=null;for(let w of this.ppStops)Math.abs(w-this.ppH)<=A&&(M===null||Math.abs(w-this.ppH)<Math.abs(M-this.ppH))&&(M=w);M!==null&&(this.ppH=M,l=`\uFF5C\u9AD8\u5EA6\u54AC\u5408 ${Wr(M)}`,this.snapInfo={p:Ve(n,ze(s,this.ppH)),kind:"h-stop"})}}this.cursor3=Ve(n,ze(s,this.ppH));let d=this.downScreen?Math.hypot(e-this.downScreen.x,t-this.downScreen.y):0,u=Math.abs(ie(s,this.cam.viewDirAt(n)));if(d>16*Vi(this.vp())&&Math.abs(this.ppH)<.3&&(h||u>.9)){this.host.hint("\u63A8\u62C9\u6CA1\u52A8\uFF1A\u6B63\u5BF9\u7740\u8FD9\u5F20\u9762\u770B\uFF0C\u6CD5\u5411\u548C\u89C6\u7EBF\u5E73\u884C\uFF0C\u62D6\u4E0D\u51FA\u9AD8\u5EA6\u2014\u2014\u73AF\u7ED5\u4E00\u4E0B\u6362\u4E2A\u89D2\u5EA6\u518D\u62C9\uFF08Esc \u53D6\u6D88\uFF09");return}this.host.hint(`\u63A8\u62C9 h = ${Wr(this.ppH)}${l}\uFF08\u677E\u624B/\u518D\u70B9\u843D\u5B9A\uFF1BEsc \u53D6\u6D88\uFF09`)}pointerUp(e){let t=e,n=()=>!!this.downScreen&&Math.hypot(t.x-this.downScreen.x,t.y-this.downScreen.y)<=4;switch(this._tool){case"line":{if(!this.anchor3)break;if(this.justCommitted){this.justCommitted=!1;break}if(this.canArm&&n()){this.armed=!0,this.host.hint("\u79FB\u52A8\u9884\u89C8\uFF0C\u518D\u70B9\u4E00\u4E0B\u843D\u7B14\uFF1BEsc \u53D6\u6D88");break}this.commitLineTo(t.x,t.y);break}case"rect":{if(!this.anchor3)break;if(this.justCommitted){this.justCommitted=!1;break}if(this.canArm&&n()){this.armed=!0,this.host.hint("\u79FB\u52A8\u9884\u89C8\uFF0C\u518D\u70B9\u4E00\u4E0B\u843D\u77E9\u5F62\uFF1BEsc \u53D6\u6D88");break}this.commitRectTo(t.x,t.y);break}case"pp":{if(this.ppFace===null||!this.anchor3){this.cancelGesture();break}if(this.justCommitted){this.justCommitted=!1;break}if(this.canArm&&n()){this.armed=!0,this.host.hint("\u63A8\u62C9\u4E2D\uFF1A\u79FB\u52A8\u5B9A\u9AD8\u5EA6\uFF0C\u518D\u70B9\u4E00\u4E0B\u843D\u5B9A\uFF1BEsc \u53D6\u6D88");break}this.commitPP();break}case"move":{if(!this.moveVids.length||!this.anchor3){this.cancelGesture();break}if(this.justCommitted){this.justCommitted=!1;break}if(this.canArm&&n()){this.armed=!0,this.host.hint("\u79FB\u52A8\u4E2D\uFF1A\u6240\u89C1\u5373\u6240\u5F97\u9884\u89C8\uFF0C\u518D\u70B9\u4E00\u4E0B\u653E\u7F6E\uFF1BEsc \u53D6\u6D88");break}this.commitMoveTo(t.x,t.y);break}case"erase":{let s=[...this.scrubAcc];this.cancelGesture(),s.length&&this.emit(this.commitOp({op:"eraseEdges",ids:s}));break}case"select":{if(!this.marqueeStart||!this.marqueeCur){this.cancelGesture();break}let s=e.shiftKey,r=Math.hypot(this.marqueeCur.x-this.marqueeStart.x,this.marqueeCur.y-this.marqueeStart.y)>4,a;if(r)a=lu(this.checkpoint,this.cam,this.vp(),{minX:Math.min(this.marqueeStart.x,this.marqueeCur.x),maxX:Math.max(this.marqueeStart.x,this.marqueeCur.x),minY:Math.min(this.marqueeStart.y,this.marqueeCur.y),maxY:Math.max(this.marqueeStart.y,this.marqueeCur.y)});else{a=Dn();let o=Kn(this.liveWorld(),this.cam,this.vp(),t.x,t.y,this.hitPx());o.edge!==void 0?a.edges.add(o.edge):o.face!==void 0&&a.faces.add(o.face)}if(s){for(let o of a.edges)this.selection.edges.add(o);for(let o of a.faces)this.selection.faces.add(o)}else this.selection=a;this.marqueeStart=this.marqueeCur=null,this.host.marquee(null),this.host.changed();break}case"eraseFace":{let s={face:Gs(this.liveWorld(),this.cam,this.vp(),t.x,t.y)};this.cancelGesture(),s.face!==void 0&&this.emit(this.commitOp({op:"eraseFaces",ids:[s.face]}));break}}this.draw()}pointerLeave(){this.gestureActive()||(this.snapInfo=null,this.hoverEdge=null,this.hoverFace=null,this.live=null,this.host.tip(null,0,0),this.host.hint(null),this.draw())}commitLineTo(e,t){let n=this.anchor3,s=this.lineSecondSnap(e,t).p;if(Ch(n,s)<1){this.cancelGesture();return}let r=this.commitOp({op:"addEdges",segs:[[n,s]]});this.emit(r),this.chargePt(n),this.chargePt(s),this.cancelGesture(),!(r.length>0)&&(this.anchor3=s,this.cursor3=s,this.armed=!0,this.host.hint("\u8FDE\u753B\u4E2D\uFF1A\u70B9\u4E0B\u4E00\u70B9\uFF1B\u51FA\u819C\u81EA\u52A8\u505C\uFF1BEsc \u6536\u7B14"))}commitRectTo(e,t){let n=this.rectPlaneSnap(e,t),s=Wc(this.gesturePlane.plane,this.gesturePlane.basis,this.anchor3,n);this.cancelGesture(),s.length&&this.emit(this.commitOp({op:"addEdges",segs:s}))}commitPP(){let e=this.ppH,t=this.ppFace;this.cancelGesture(),Math.abs(e)>=.3&&this.emit(this.commitOp({op:"pushpull",face:t,dist:e}))}commitMoveTo(e,t){let n=new Set(this.moveVids),s=gn(this.liveWorld(),this.cam,this.vp(),e,t,this.snapPx(),{plane:this.gesturePlane,anchor:this.anchor3,alignSources:this.alignSrcs(),hand:this.freshHand(c=>n.has(c))}).p,r=Fe(s,this.anchor3),a=this.moveVids,o=Math.hypot(r.x,r.y,r.z);this.cancelGesture(),o>=.3&&this.emit(this.commitOp({op:"move",moves:qc(this.checkpoint,a,r)}))}};var ri=i=>{let e=(Math.round(i*1e6)/1e6).toString();return e==="-0"?"0":e};function gf(i,e={}){let t=[];t.push(`# CatsUp OBJ export${e.version?` (${e.version})`:""} \u2014 Z-up world written as Y-up (x, z, -y)`);let n=new Map,s=[],r=c=>{let l=`${ri(c.x)},${ri(c.y)},${ri(c.z)}`,h=n.get(l);return h===void 0&&(h=n.size+1,n.set(l,h),s.push(`v ${ri(c.x)} ${ri(c.z)} ${ri(-c.y)}`)),h},a=[],o=0;for(let c of i.faces()){let l=i.faceRings3(c.id);if(l)if(c.holes.length===0)a.push(`f ${l.outer.map(h=>r(h)).join(" ")}`);else if(e.triangulateHoled)for(let[h,d,u]of e.triangulateHoled(i,c.id))a.push(`f ${r(h)} ${r(d)} ${r(u)}`);else o++,a.push(`f ${l.outer.map(h=>r(h)).join(" ")}`)}for(let c of i.edges())c.faceLinks.length===0&&a.push(`l ${r(i.graph.pt(c.a))} ${r(i.graph.pt(c.b))}`);return o&&t.push(`# warning: ${o} face(s) with holes exported as outer ring only (no triangulator supplied)`),t.push("o catsup"),t.push(...s,...a),t.join(`
`)+`
`}function xf(i,e={}){let t=e.maxSegments??3e3,n=[],s=new Set,r=[],a=0,o=0,c=d=>`${ri(d.x)},${ri(d.y)},${ri(d.z)}`,l=(d,u)=>{let f=c(d),m=c(u);if(f===m)return;let _=f<m?`${f}|${m}`:`${m}|${f}`;if(!s.has(_)&&(s.add(_),r.push([d,u]),r.length>t))throw new Error(`OBJ \u592A\u5927\uFF1A\u8D85\u8FC7 ${t} \u6761\u8FB9\uFF08\u9003\u751F\u53E3\u53EA\u63A5\u591A\u8FB9\u5F62\u5EFA\u6A21\u91CF\u7EA7\uFF0C\u4E0D\u63A5\u4E09\u89D2\u6C64\uFF09`)},h=d=>{let u=parseInt(d.split("/")[0],10);if(!Number.isFinite(u)||u===0)return null;let f=u>0?u-1:n.length+u;return n[f]??null};for(let d of i.split(/\r?\n/)){let u=d.trim();if(!u||u.startsWith("#"))continue;let f=u.split(/\s+/),m=f[0];if(m==="v"){let _=parseFloat(f[1]),g=parseFloat(f[2]),p=parseFloat(f[3]);if(![_,g,p].every(Number.isFinite))continue;n.push({x:_,y:-p,z:g})}else if(m==="f"||m==="l"){let _=f.slice(1).map(h).filter(g=>g!==null);if(_.length<2)continue;if(m==="f"){a++;for(let g=0;g<_.length;g++)l(_[g],_[(g+1)%_.length])}else{o++;for(let g=0;g+1<_.length;g++)l(_[g],_[g+1])}}}return{segs:r,vertices:n.length,faces:a,looseLines:o}}function _f(i,e,t){let n=new Map,s=!1,r=-1/0,a=null,o=null,c=M=>{let w=i.getBoundingClientRect();return{x:M.clientX-w.left,y:M.clientY-w.top}},l=M=>{let w=c(M);return{x:w.x,y:w.y,clientX:M.clientX,clientY:M.clientY,pointerType:M.pointerType,shiftKey:M.shiftKey}},h=()=>[...n.entries()].filter(([,M])=>M.type==="touch"),d=()=>[...n.values()].some(M=>M.role==="tool");function u(M){let w=performance.now();for(let[x,T]of h())(M||w-T.lastAt>8e3)&&n.delete(x);h().length<2&&(a=null),h().length===0&&(o=null)}function f(){let M=h();if(M.length<2)return;let[[,w],[,x]]=M;a={cx:(w.x+x.x)/2,cy:(w.y+x.y)/2,d:Math.hypot(w.x-x.x,w.y-x.y)},o||(o={firstDownTime:Math.min(...M.map(([,T])=>T.downAt)),isTap:!0,maxCount:0,start:new Map}),o.maxCount=Math.max(o.maxCount,M.length);for(let[T,R]of M)o.start.has(T)||o.start.set(T,{x:R.downX,y:R.downY}),R.role="multi"}function m(M){let w=c(M);try{i.setPointerCapture(M.pointerId)}catch{}let x=performance.now();u(M.pointerType==="pen");let T={type:M.pointerType,role:"hold",x:w.x,y:w.y,downX:w.x,downY:w.y,downAt:x,lastAt:x};if(M.pointerType==="mouse"?(M.button===0?T.role=d()?"hold":"tool":T.role=M.shiftKey?"pan":"orbit",M.preventDefault()):M.pointerType==="pen"?(s=!0,r=x,T.role=d()?"hold":"tool"):x-r<600?T.role="hold":!s&&t.fingerDraws()&&h().length===0&&!d()?T.role="tool":T.role="orbit",n.set(M.pointerId,T),M.pointerType==="touch"){let R=h();if(R.length>=2){for(let[,C]of R)C.role==="tool"&&e.cancel();f();return}}T.role==="tool"&&e.pointerDown(l(M))}function _(M){let w=n.get(M.pointerId),x=c(M);if(!w){M.pointerType!=="touch"&&!d()&&e.pointerMove(l(M));return}let T=x.x-w.x,R=x.y-w.y;switch(w.x=x.x,w.y=x.y,w.lastAt=performance.now(),M.pointerType==="pen"&&(r=w.lastAt),w.role){case"tool":e.pointerMove(l(M));return;case"orbit":e.cam.orbit(T,R),e.draw();return;case"pan":e.cam.pan(T,R,e.vp()),e.draw();return;case"multi":{if(o?.isTap)for(let[B,$]of h()){let J=o.start.get(B);if(J&&Math.hypot($.x-J.x,$.y-J.y)>16){o.isTap=!1;break}}let C=h().filter(([,B])=>B.role==="multi");if(C.length<2||!a)return;let[[,D],[,I]]=C,V=(D.x+I.x)/2,F=(D.y+I.y)/2,X=Math.hypot(D.x-I.x,D.y-I.y);e.cam.pan(V-a.cx,F-a.cy,e.vp()),X>1&&a.d>1&&e.cam.zoomAt(a.d/X,V,F,e.vp()),a.cx=V,a.cy=F,a.d=X,e.draw();return}case"hold":return}}function g(M,w){let x=n.get(M.pointerId);if(!x)return;n.delete(M.pointerId);let T=performance.now();if(M.pointerType==="pen"&&(r=T),x.role==="tool"){w?e.cancel():e.pointerUp(l(M));return}if(M.pointerType!=="touch")return;let R=h();if(R.length===0){if(o){let C=T-o.firstDownTime,D=T-r<600;!w&&o.isTap&&C<250&&!D&&(o.maxCount===2?t.onUndo():o.maxCount>=3&&t.onRedo()),o=null,a=null;return}x.role==="orbit"&&!w&&T-x.downAt<250&&Math.hypot(x.x-x.downX,x.y-x.downY)<16&&T-r>=600&&e.cancel();return}x.role==="multi"&&(R.length>=2?f():(R[0][1].role="hold",a=null))}let p=M=>{M.preventDefault();let w=i.getBoundingClientRect();e.cam.zoomAt(M.deltaY>0?1.1:1/1.1,M.clientX-w.left,M.clientY-w.top,e.vp()),e.draw()},b=()=>{d()||e.pointerLeave()},E=M=>M.preventDefault(),v=M=>g(M,!1),A=M=>g(M,!0);return i.addEventListener("pointerdown",m),i.addEventListener("pointermove",_),i.addEventListener("pointerup",v),i.addEventListener("pointercancel",A),i.addEventListener("pointerleave",b),i.addEventListener("wheel",p,{passive:!1}),i.addEventListener("contextmenu",E),{penEverSeen:()=>s,dispose(){i.removeEventListener("pointerdown",m),i.removeEventListener("pointermove",_),i.removeEventListener("pointerup",v),i.removeEventListener("pointercancel",A),i.removeEventListener("pointerleave",b),i.removeEventListener("wheel",p),i.removeEventListener("contextmenu",E)}}}var yf=new Set(["localhost","127.0.0.1","::1",""]);function vf(i){let e=location.pathname.includes("/dev/")||yf.has(location.hostname),t=null;async function n(){try{await i.onBeforeReload?.()}catch{}let a=t??await navigator.serviceWorker?.getRegistration()??null;if(!a||!a.waiting){location.reload();return}let o=!1,c=()=>{o||(o=!0,location.reload())};navigator.serviceWorker.addEventListener("controllerchange",c,{once:!0}),a.waiting.postMessage({type:"skip-waiting"}),setTimeout(c,5e3)}async function s(){await((c,l)=>Promise.race([Promise.resolve(c).catch(()=>{}),new Promise(h=>setTimeout(h,l))]))(i.onBeforeReload?.(),4e3);try{if(navigator.serviceWorker)for(let c of await navigator.serviceWorker.getRegistrations())await c.unregister().catch(()=>{});if(typeof caches<"u")for(let c of await caches.keys())await caches.delete(c).catch(()=>{})}catch{}let o=`${location.pathname}?reset=${Date.now()}`;setTimeout(()=>location.replace(o),150),setTimeout(()=>{location.href=o},2500)}let r=()=>{t?.update().catch(()=>{}),i.onForeground?.()};return document.addEventListener("visibilitychange",()=>{document.visibilityState==="visible"&&r()}),window.addEventListener("focus",r),"serviceWorker"in navigator&&!yf.has(location.hostname)&&(navigator.serviceWorker.addEventListener("message",a=>{a.data?.type==="asset-updated"&&i.onUpdateAvailable()}),navigator.serviceWorker.register("./service-worker.js").then(a=>{t=a,a.waiting&&navigator.serviceWorker.controller&&i.onUpdateAvailable(),a.addEventListener("updatefound",()=>{let o=a.installing;o&&o.addEventListener("statechange",()=>{o.state==="installed"&&navigator.serviceWorker.controller&&i.onUpdateAvailable()})}),setInterval(()=>{a.update().catch(()=>{})},10*60*1e3)}).catch(a=>{console.warn("[pwa] SW register failed",a)})),{isDevRoute:e,reload:n,forceReset:s}}function Xr(i,e={}){let{size:t,cls:n}=e;return`<svg ${['viewBox="0 0 24 24"',n?`class="${n}"`:'class="ico"',t?`width="${t}" height="${t}"`:"",'aria-hidden="true"'].filter(Boolean).join(" ")}><use href="#${i}"/></svg>`}var ns=null,Ih=null;function bf(){ns?.close()}function Lh(i){return ns&&Ih===i.anchor?(ns.close(),null):Ry(i)}function Ry(i){ns?.close();let e=document.createElement("div");e.className="popup-menu",e.setAttribute("role","menu"),document.body.appendChild(e);let t=!0,n=()=>{e.textContent="";for(let l of i.items()){if(l.separatorBefore){let d=document.createElement("div");d.className="menu-sep",e.appendChild(d)}let h=document.createElement("button");h.type="button",h.className="menu-item",h.disabled=!!l.disabled,h.innerHTML=`${l.icon?Xr(l.icon):'<span class="ico-gap"></span>'}<span class="menu-label"></span>${l.hint?'<span class="menu-hint"></span>':""}${l.checked?Xr("check",{cls:"ico menu-check"}):""}`,h.querySelector(".menu-label").textContent=l.label,l.hint&&(h.querySelector(".menu-hint").textContent=l.hint),h.addEventListener("click",()=>{i.onPick(l.id)==="keep"?n():o()}),e.appendChild(h)}s()},s=()=>{let l=i.anchor.getBoundingClientRect(),h=window.innerWidth,d=window.innerHeight;e.style.left="0px",e.style.top="0px";let u=e.offsetWidth,f=e.offsetHeight,m=i.align==="end"?l.right-u:l.left,_=l.bottom+4;m+u>h-6&&(m=h-6-u),m<6&&(m=6),_+f>d-6&&(_=Math.max(6,l.top-4-f)),e.style.left=`${m}px`,e.style.top=`${_}px`},r=l=>{let h=l.composedPath();h.includes(e)||h.includes(i.anchor)||o()},a=l=>{l.key==="Escape"&&(l.stopPropagation(),o())},o=()=>{t&&(t=!1,e.remove(),document.removeEventListener("pointerdown",r,!0),window.removeEventListener("keydown",a,!0),window.removeEventListener("resize",s),ns===c&&(ns=null,Ih=null),i.anchor.classList.remove("is-open"))},c={el:e,close:o,refresh:n,isOpen:()=>t};return n(),i.anchor.classList.add("is-open"),setTimeout(()=>{t&&document.addEventListener("pointerdown",r,!0)},0),window.addEventListener("keydown",a,!0),window.addEventListener("resize",s),ns=c,Ih=i.anchor,c}var qr=new Map,Iy=0;function Ly(){let i=document.getElementById("noticeStack");return i||(i=document.createElement("div"),i.id="noticeStack",document.body.appendChild(i)),i}function Fi(i){let e=i.id??`n${++Iy}`,t=i.level??"neutral",n=qr.get(e);n?.timer&&clearTimeout(n.timer);let s=n?.el??document.createElement("div");s.className=`toast toast-${t}`,s.setAttribute("role",t==="error"?"alert":"status"),s.textContent="";let r=document.createElement("span");r.className="toast-text",r.textContent=i.text,s.appendChild(r);let a=()=>{let h=qr.get(e);h&&(h.timer&&clearTimeout(h.timer),h.el.remove(),qr.delete(e))};if(i.actions?.length){let h=document.createElement("span");h.className="toast-actions";for(let d of i.actions){let u=document.createElement("button");u.type="button",u.className=d.primary?"toast-btn primary":"toast-btn",u.textContent=d.label,u.addEventListener("click",()=>{d.onClick(),a()}),h.appendChild(u)}s.appendChild(h)}let o=document.createElement("button");o.type="button",o.className="toast-x",o.setAttribute("aria-label","\u5173\u95ED"),o.textContent="\xD7",o.addEventListener("click",a),s.appendChild(o),n||Ly().appendChild(s);let l=i.timeoutMs===null||i.timeoutMs===void 0&&(!!i.actions?.length||t==="error"||t==="warning")?null:window.setTimeout(a,i.timeoutMs??3500);return qr.set(e,{el:s,timer:l}),{id:e,close:a,isOpen:()=>qr.has(e)}}var xt=i=>{let e=document.getElementById(i);if(!e)throw new Error(`missing #${i}`);return e},Rc={get(i){try{return localStorage.getItem(`catsup.ui.${i}`)}catch{return null}},set(i,e){try{localStorage.setItem(`catsup.ui.${i}`,e)}catch{}}},$r=Rc.get("fingerDraws")==="1",Cc=Rc.get("lab")==="1"||new URLSearchParams(location.search).has("lab"),Fh=xt("board"),Dy=xt("stage"),Ef=xt("hint"),Yr=xt("tip"),Dh=xt("marquee"),Fy=xt("toolbar"),Kr=xt("labLog"),wf=xt("lab"),Uy=xt("build"),Tf="\u753B\u7EBF L \xB7 \u77E9\u5F62 R \xB7 \u79FB\u52A8 M \xB7 \u63A8\u62C9 P \xB7 \u6A61\u76AE E \xB7 \u9009\u62E9 \u7A7A\u683C \uFF5C \u53F3\u952E/\u5355\u6307\u62D6=\u73AF\u7ED5 \xB7 \u53CC\u6307=\u5E73\u79FB\u7F29\u653E \xB7 \u6EDA\u8F6E=\u7F29\u653E \uFF5C Esc \u53D6\u6D88",qe=new Ac(Fh,{hint:i=>{Ef.textContent=i??Tf},tip:(i,e,t)=>{i?(Yr.textContent=i,Yr.hidden=!1,Yr.style.left=`${e+14}px`,Yr.style.top=`${t-28}px`):Yr.hidden=!0},events:i=>zy(i),separator:i=>Vy(i),marquee:i=>{if(!i){Dh.hidden=!0;return}let e=Fh.getBoundingClientRect();Dh.hidden=!1,Object.assign(Dh.style,{left:`${e.left+i.x}px`,top:`${e.top+i.y}px`,width:`${i.w}px`,height:`${i.h}px`})},changed:()=>By()}),Ny=[{tool:"select",icon:"select",label:"\u9009\u62E9",key:"\u7A7A\u683C"},{tool:"line",icon:"line",label:"\u753B\u7EBF",key:"L"},{tool:"rect",icon:"rectangle",label:"\u77E9\u5F62",key:"R"},{tool:"move",icon:"move",label:"\u79FB\u52A8",key:"M"},{tool:"pp",icon:"push-pull",label:"\u63A8\u62C9",key:"P"},{tool:"erase",icon:"eraser",label:"\u6A61\u76AE",key:"E"}],Nh=new Map;for(let i of Ny){let e=document.createElement("button");e.type="button",e.className="tool",e.title=`${i.label}\uFF08${i.key}\uFF09`,e.innerHTML=`${Xr(i.icon)}<span class="tool-label"></span>`,e.querySelector(".tool-label").textContent=i.label,e.addEventListener("click",()=>qe.setTool(i.tool)),Fy.appendChild(e),Nh.set(i.tool,e)}{let i=xt("labEraseFace");i.addEventListener("click",()=>qe.setTool("eraseFace")),Nh.set("eraseFace",i)}var Af=xt("btnUndo"),Pf=xt("btnRedo"),Cf=xt("btnDelete"),Sf=xt("btnMenu"),Mf=xt("btnView"),Oy=xt("btnFit");Af.addEventListener("click",()=>qe.undo());Pf.addEventListener("click",()=>qe.redo());Cf.addEventListener("click",()=>qe.deleteSelection());Oy.addEventListener("click",()=>qe.zoomExtents());Mf.addEventListener("click",()=>Lh({anchor:Mf,align:"end",items:()=>[{id:"iso",label:"\u7B49\u8F74",icon:"persp-iso"},{id:"top",label:"\u9876\u89C6",hint:"\u4FEF\u89C6"},{id:"front",label:"\u524D\u89C6",hint:"\u5411\u5317\u770B"},{id:"right",label:"\u53F3\u89C6",hint:"\u5411\u897F\u770B"},{id:"back",label:"\u540E\u89C6",hint:"\u5411\u5357\u770B"},{id:"left",label:"\u5DE6\u89C6",hint:"\u5411\u4E1C\u770B"},{id:"persp",label:"\u900F\u89C6",checked:qe.cam.projection==="persp",separatorBefore:!0}],onPick:i=>{if(i==="persp")return qe.toggleProjection(),"keep";qe.setView(i)}}));Sf.addEventListener("click",()=>Lh({anchor:Sf,items:()=>[{id:"export",label:"\u5BFC\u51FA OBJ\u2026",icon:"export",hint:"Blender \u9003\u751F\u53E3"},{id:"import",label:"\u5BFC\u5165 OBJ\u2026",icon:"import"},{id:"finger",label:"\u624B\u6307\u4E5F\u80FD\u753B",checked:$r,separatorBefore:!0,hint:Hy.penEverSeen()?"\u5DF2\u89C1\u8FC7\u7B14\uFF0C\u624B\u6307=\u76F8\u673A":void 0},{id:"lab",label:"\u5B9E\u9A8C\u53F0\uFF08\u819C\u4E8B\u4EF6\u65E5\u5FD7 / \u573A\u666F\u9884\u7F6E\uFF09",checked:Cc},{id:"clear",label:"\u6E05\u7A7A\u6A21\u578B",icon:"trash-can",separatorBefore:!0},{id:"help",label:"\u5FEB\u6377\u952E\u4E0E\u624B\u52BF",icon:"keyboard"},{id:"update",label:`\u5F3A\u5236\u66F4\u65B0\uFF08\u6E05\u7F13\u5B58\u91CD\u542F\uFF09\xB7 ${rs}`,icon:"refresh"}],onPick:i=>{switch(i){case"export":ky();break;case"import":Pc.click();break;case"finger":return $r=!$r,Rc.set("fingerDraws",$r?"1":"0"),"keep";case"lab":return Rf(!Cc),"keep";case"clear":Fi({id:"clear",text:"\u6E05\u7A7A\u6574\u4E2A\u6A21\u578B\uFF1F\uFF08\u53EF\u64A4\u9500\uFF09",level:"warning",actions:[{label:"\u6E05\u7A7A",primary:!0,onClick:()=>qe.clearAll()},{label:"\u53D6\u6D88",onClick:()=>{}}]});break;case"help":Ic(!0);break;case"update":Oh.forceReset();break}}}));function By(){for(let[i,e]of Nh)e.classList.toggle("active",i===qe.tool);Af.disabled=!qe.canUndo(),Pf.disabled=!qe.canRedo(),Cf.hidden=!qe.hasSelection()}function zy(i){for(let e of i){let t=document.createElement("div");t.className="ev",t.textContent=Rh(e),Kr.prepend(t)}for(;Kr.childElementCount>400;)Kr.lastElementChild?.remove()}function Vy(i){let e=document.createElement("div");e.className="sep",e.textContent=`\u2500\u2500 ${i} \u2500\u2500`,Kr.prepend(e)}{let i=xt("labPresets");for(let e of Vs){let t=document.createElement("button");t.type="button",t.textContent=e.name,t.title=e.note,t.addEventListener("click",()=>qe.applyPreset(e.name)),i.appendChild(t)}xt("labClearLog").addEventListener("click",()=>{Kr.textContent=""}),xt("labClose").addEventListener("click",()=>Rf(!1))}function Rf(i){Cc=i,Rc.set("lab",i?"1":"0"),wf.hidden=!i,!i&&qe.tool==="eraseFace"&&qe.setTool("select"),requestAnimationFrame(Lc)}var Uh=xt("help");function Ic(i){Uh.hidden=!i}xt("helpClose").addEventListener("click",()=>Ic(!1));Uh.addEventListener("click",i=>{i.target===Uh&&Ic(!1)});var Pc=xt("objFile");function ky(){let i=gf(qe.kernel,{triangulateHoled:ff,version:rs}),e=new Blob([i],{type:"model/obj"}),t=URL.createObjectURL(e),n=document.createElement("a"),s=new Date().toISOString().slice(0,19).replace(/[:T]/g,"-");n.href=t,n.download=`catsup-${s}.obj`,document.body.appendChild(n),n.click(),n.remove(),setTimeout(()=>URL.revokeObjectURL(t),1e4),Fi({text:`\u5DF2\u5BFC\u51FA ${n.download}\uFF08${qe.kernel.faces().length} \u9762 / ${qe.kernel.edges().length} \u8FB9\uFF09`,level:"info"})}Pc.addEventListener("change",async()=>{let i=Pc.files?.[0];if(Pc.value="",!!i)try{let e=xf(await i.text());if(!e.segs.length){Fi({text:"OBJ \u91CC\u6CA1\u6709\u53EF\u7528\u7684\u8FB9",level:"warning"});return}let t=qe.addSegments(e.segs,`\u5BFC\u5165 ${i.name}`);qe.zoomExtents(),Fi({text:`\u5BFC\u5165 ${i.name}\uFF1A${e.segs.length} \u6761\u8FB9 \u2192 ${t.length} \u4E2A\u819C\u4E8B\u4EF6`,level:"info"})}catch(e){Fi({text:`\u5BFC\u5165\u5931\u8D25\uFF1A${e.message}`,level:"error"})}});var Hy=_f(Fh,qe,{fingerDraws:()=>$r,onUndo:()=>qe.undo(),onRedo:()=>qe.redo()});window.addEventListener("keydown",i=>{let e=i.target;if(!(e&&(e.tagName==="INPUT"||e.tagName==="TEXTAREA"))){if(!i.ctrlKey&&!i.metaKey&&!i.altKey){let n={" ":"select",l:"line",r:"rect",m:"move",p:"pp",e:"erase"}[i.key.toLowerCase()];if(n){i.preventDefault(),qe.setTool(n);return}}if((i.ctrlKey||i.metaKey)&&(i.key==="z"||i.key==="Z")){i.preventDefault(),i.shiftKey?qe.redo():qe.undo();return}if((i.ctrlKey||i.metaKey)&&(i.key==="y"||i.key==="Y")){i.preventDefault(),qe.redo();return}if(i.key==="Delete"||i.key==="Backspace"){qe.hasSelection()&&(i.preventDefault(),qe.deleteSelection());return}i.key==="Escape"&&(bf(),Ic(!1),qe.cancel())}});function Lc(){qe.resize(window.devicePixelRatio||1)}new ResizeObserver(Lc).observe(Dy);window.addEventListener("resize",Lc);var Oh=vf({onUpdateAvailable:()=>Fi({id:"update",text:"\u6709\u65B0\u7248\u672C",level:"info",actions:[{label:"\u5237\u65B0",primary:!0,onClick:()=>{Oh.reload()}}]})});Uy.textContent=`${rs}${Oh.isDevRoute?" \xB7 dev":""}`;new URLSearchParams(location.search).has("reset")&&Fi({text:`\u5DF2\u6E05\u7F13\u5B58\u91CD\u542F \xB7 ${rs}`,level:"info"});window.__catsup={editor:qe,version:rs};wf.hidden=!Cc;qe.setTool("line");Ef.textContent=Tf;Lc();
/**
 * @license
 * Copyright 2010-2026 Three.js Authors
 * SPDX-License-Identifier: MIT
 */
//# sourceMappingURL=catsup-ce42b0fb4ed9.mjs.map
