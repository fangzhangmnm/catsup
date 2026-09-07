var Zp=Object.defineProperty;var $p=(i,e,t)=>e in i?Zp(i,e,{enumerable:!0,configurable:!0,writable:!0,value:t}):i[e]=t;var V=(i,e,t)=>$p(i,typeof e!="symbol"?e+"":e,t);var Gi="v0.3.10-2026-09-07";function xc(i,e){return Math.atan2(e.y-i.y,e.x-i.x)}function yc(i,e,t){return(e.x-i.x)*(t.y-i.y)-(e.y-i.y)*(t.x-i.x)}function Ou(i){let e=0;for(let t=0;t<i.length;t++){let n=i[t],s=i[(t+1)%i.length];e+=n.x*s.y-s.x*n.y}return e/2}function dt(i,e){let t=!1;for(let n=0,s=e.length-1;n<e.length;s=n++){let r=e[n],o=e[s];r.y>i.y!=o.y>i.y&&i.x<(o.x-r.x)*(i.y-r.y)/(o.y-r.y)+r.x&&(t=!t)}return t}function Xi(i){return{x:Math.round(i.x/1e-6)*1e-6,y:Math.round(i.y/1e-6)*1e-6,z:Math.round(i.z/1e-6)*1e-6}}function Ct(i){return`${Math.round(i.x/1e-6)},${Math.round(i.y/1e-6)},${Math.round(i.z/1e-6)}`}function tn(i,e){return Math.abs(i.x-e.x)<=5e-7&&Math.abs(i.y-e.y)<=5e-7&&Math.abs(i.z-e.z)<=5e-7}function Mt(i,e){return Math.hypot(i.x-e.x,i.y-e.y,i.z-e.z)}var Re=(i,e)=>({x:i.x-e.x,y:i.y-e.y,z:i.z-e.z}),Be=(i,e)=>({x:i.x+e.x,y:i.y+e.y,z:i.z+e.z}),Ue=(i,e)=>({x:i.x*e,y:i.y*e,z:i.z*e}),te=(i,e)=>i.x*e.x+i.y*e.y+i.z*e.z,Rt=(i,e)=>({x:i.y*e.z-i.z*e.y,y:i.z*e.x-i.x*e.z,z:i.x*e.y-i.y*e.x}),Wi=i=>Math.hypot(i.x,i.y,i.z);function yn(i){let e=Wi(i);return e>0?Ue(i,1/e):i}function er(i,e){let t=yn(i),n=e;return(Math.abs(t.x)>1e-9?t.x:Math.abs(t.y)>1e-9?t.y:t.z)<0&&(t=Ue(t,-1),n=-n),{n:t,d:n}}function gi(i,e,t){let n=Rt(Re(e,i),Re(t,i)),s=Wi(n),r=Math.max(Mt(i,e),Mt(i,t));if(s<=5e-7*r||r<=5e-7)return null;let o=yn(n);return er(o,te(o,i))}function nn(i,e){return Math.abs(te(i,e.n)-e.d)}function ms(i){let e=i.n,t=Math.abs(e.x),n=Math.abs(e.y),s=Math.abs(e.z),r=t<=n&&t<=s?{x:1,y:0,z:0}:n<=s?{x:0,y:1,z:0}:{x:0,y:0,z:1},o=yn(Rt(e,r)),a=Rt(e,o);return{u:o,v:a}}function vn(i,e){return{x:te(i,e.u),y:te(i,e.v)}}function Bu(i,e,t){return Be(Be(Ue(t.u,i.x),Ue(t.v,i.y)),Ue(e.n,e.d))}function yo(i,e,t){let n=Mt(e,t);if(n<=5e-7)return tn(i,e);if(Wi(Rt(Re(i,e),Re(t,e)))/n>5e-7)return!1;let r=te(Re(i,e),Re(t,e))/(n*n);return r>=-5e-7/n&&r<=1+5e-7/n}function zu(i,e,t){let n=Re(t,e),s=te(n,n);if(s===0)return Mt(i,e);let r=te(Re(i,e),n)/s;return r=Math.max(0,Math.min(1,r)),Mt(i,Be(e,Ue(n,r)))}function vo(i,e,t,n){let s=Re(e,i),r=Re(n,t),o=Wi(s),a=Wi(r);if(o<=5e-7||a<=5e-7)return[];let l=Rt(s,r),c=Wi(l);if(c/(o*a)<1e-12){if(Wi(Rt(Re(t,i),s))/o>5e-7)return[];let p=T=>te(Re(T,i),s)/(o*o),b=p(t),S=p(n);b>S&&([b,S]=[S,b]);let _=Math.max(0,b),A=Math.min(1,S);if(A<_-5e-7/o)return[];let w=T=>Xi(Be(i,Ue(s,T))),E=w(_),y=w(A);return tn(E,y)?[E]:[E,y]}if(Math.abs(te(Re(t,i),l))/c>5e-7)return[];let d=c*c,u=te(Rt(Re(t,i),r),l)/d,f=te(Rt(Re(t,i),s),l)/d,m=5e-7/o,x=5e-7/a;return u<-m||u>1+m||f<-x||f>1+x?[]:[Xi(Be(i,Ue(s,u)))]}var _o=class i{constructor(){V(this,"vertsById",new Map);V(this,"edgesById",new Map);V(this,"vertByKey",new Map);V(this,"nextV",1);V(this,"nextE",1)}vertices(){return[...this.vertsById.values()]}edges(){return[...this.edgesById.values()]}vertexCount(){return this.vertsById.size}edgeCount(){return this.edgesById.size}vertex(e){let t=this.vertsById.get(e);if(!t)throw new Error(`vertex ${e} \u4E0D\u5B58\u5728`);return t}edge(e){let t=this.edgesById.get(e);if(!t)throw new Error(`edge ${e} \u4E0D\u5B58\u5728`);return t}hasEdge(e){return this.edgesById.has(e)}hasVertex(e){return this.vertsById.has(e)}pt(e){let t=this.vertex(e);return{x:t.x,y:t.y,z:t.z}}otherEnd(e,t){return e.a===t?e.b:e.a}vertexAt(e){return this.vertByKey.get(Ct(e))}ensureVertex(e){let t=Ct(e),n=this.vertByKey.get(t);if(n!==void 0)return n;let s=this.nextV++;return this.vertsById.set(s,{id:s,x:e.x,y:e.y,z:e.z,edges:new Set}),this.vertByKey.set(t,s),s}edgeBetween(e,t){let n=this.vertex(e).edges;for(let s of n){let r=this.edge(s);if(r.a===t||r.b===t)return s}}addEdge(e,t){if(e===t)throw new Error("\u62D2\u7EDD\u81EA\u73AF\u8FB9");if(this.edgeBetween(e,t)!==void 0)throw new Error(`\u8FB9 ${e}-${t} \u5DF2\u5B58\u5728\uFF08\u91CD\u5408\u5373\u540C\u4E00\uFF0C\u8C03\u7528\u65B9\u5E94\u62A5 retrace\uFF09`);let n=this.nextE++;return this.edgesById.set(n,{id:n,a:e,b:t,faceLinks:[]}),this.vertex(e).edges.add(n),this.vertex(t).edges.add(n),n}removeEdge(e){let t=this.edge(e);this.edgesById.delete(e);for(let n of[t.a,t.b]){let s=this.vertex(n);s.edges.delete(e),s.edges.size===0&&(this.vertsById.delete(n),this.vertByKey.delete(Ct({x:s.x,y:s.y,z:s.z})))}}splitEdge(e,t){let n=this.edge(e),s=[...n.faceLinks],r=n.a,o=n.b;this.removeEdgeKeepVerts(e);let a=this.ensureVertex(t),l=this.addEdge(r,a),c=this.addEdge(a,o);return this.edge(l).faceLinks=[...s],this.edge(c).faceLinks=[...s],{v:a,e1:l,e2:c}}relocateVertices(e){for(let{id:t}of e){let n=this.vertex(t);this.vertByKey.delete(Ct({x:n.x,y:n.y,z:n.z}))}for(let{id:t,to:n}of e){let s=this.vertex(t),r=Ct(n);if(this.vertByKey.has(r))throw new Error("relocateVertices \u7EC8\u6001 key \u78B0\u649E\u2014\u2014\u5408\u5E76\u8BE5\u5728\u8C03\u7528\u65B9\u5148\u505A");s.x=n.x,s.y=n.y,s.z=n.z,this.vertByKey.set(r,t)}}replaceEdgeWithChain(e,t){let n=this.edge(e),s=[...n.faceLinks],r=n.a,o=n.b;this.removeEdgeKeepVerts(e);let a=[r,...t.map(c=>this.ensureVertex(c)),o],l=[];for(let c=0;c+1<a.length;c++){let h=a[c],d=a[c+1];if(h===d)continue;let u=this.edgeBetween(h,d);if(u!==void 0){l.push({edge:u,fwd:this.edge(u).a===h});continue}let f=this.addEdge(h,d);this.edge(f).faceLinks=[...s],l.push({edge:f,fwd:!0})}return l}relocateVertex(e,t){let n=this.vertex(e),s=Ct({x:n.x,y:n.y,z:n.z});if(this.vertByKey.get(Ct(t))!==void 0&&this.vertByKey.get(Ct(t))!==e)throw new Error("relocateVertex \u76EE\u6807\u683C\u70B9\u5DF2\u88AB\u5360\u7528\u2014\u2014sticky \u5408\u5E76\u8BE5\u5728\u8C03\u7528\u65B9\u5148\u505A");this.vertByKey.delete(s),n.x=t.x,n.y=t.y,n.z=t.z,this.vertByKey.set(Ct(t),e)}removeEdgeKeepVerts(e){let t=this.edge(e);this.edgesById.delete(e),this.vertex(t.a).edges.delete(e),this.vertex(t.b).edges.delete(e)}clone(){let e=new i;e.nextV=this.nextV,e.nextE=this.nextE;for(let[t,n]of this.vertsById)e.vertsById.set(t,{id:n.id,x:n.x,y:n.y,z:n.z,edges:new Set(n.edges)});for(let[t,n]of this.edgesById)e.edgesById.set(t,{id:n.id,a:n.a,b:n.b,faceLinks:[...n.faceLinks]});for(let[t,n]of this.vertByKey)e.vertByKey.set(t,n);return e}};function ku(i,e,t,n){let s=Xi(e),r=Xi(t);if(tn(s,r))return{created:[],retraced:[]};let o=Mt(s,r),a=m=>((m.x-s.x)*(r.x-s.x)+(m.y-s.y)*(r.y-s.y)+(m.z-s.z)*(r.z-s.z))/(o*o),l=new Map,c=m=>{l.set(Ct(m),m)};c(s),c(r);let h=new Map;for(let m of i.edges()){let x=i.pt(m.a),g=i.pt(m.b),p=vo(s,r,x,g);for(let b of p)if(c(b),!tn(b,x)&&!tn(b,g)){let S=h.get(m.id)??[];S.push(b),h.set(m.id,S)}}for(let m of i.vertices()){let x={x:m.x,y:m.y,z:m.z};yo(x,s,r)&&c(x)}for(let[m,x]of h){let g=i.pt(i.edge(m).a);x.sort((b,S)=>Mt(g,b)-Mt(g,S));let p=m;for(let b of x){let{e1:S,e2:_}=i.splitEdge(p,b);n?.(p,S,_),p=_}}let d=[...l.values()].sort((m,x)=>a(m)-a(x)),u=[],f=[];for(let m=0;m+1<d.length;m++){let x=d[m],g=d[m+1];if(tn(x,g))continue;let p=i.ensureVertex(x),b=i.ensureVertex(g);if(p===b)continue;let S=i.edgeBetween(p,b);S!==void 0?f.push(S):u.push(i.addEdge(p,b))}return{created:u,retraced:f}}var Kp=32;function vc(i){let e=!1;for(let t=0;t<Kp;t++){let n=new Map,s=(o,a)=>{let l=n.get(o);l||(l=new Map,n.set(o,l)),l.set(Ct(a),a)},r=i.edges();for(let o=0;o<r.length;o++){let a=r[o],l=i.pt(a.a),c=i.pt(a.b);for(let h=o+1;h<r.length;h++){let d=r[h],u=i.pt(d.a),f=i.pt(d.b);for(let m of vo(l,c,u,f))!tn(m,l)&&!tn(m,c)&&s(a.id,m),!tn(m,u)&&!tn(m,f)&&s(d.id,m)}for(let h of i.vertices()){if(h.id===a.a||h.id===a.b)continue;let d={x:h.x,y:h.y,z:h.z};yo(d,l,c)&&s(a.id,d)}}if(n.size===0)return{changed:e};e=!0;for(let[o,a]of n){if(!i.hasEdge(o))continue;let l=i.pt(i.edge(o).a),c=[...a.values()].sort((h,d)=>Mt(l,h)-Mt(l,d));i.replaceEdgeWithChain(o,c)}}throw new Error("planarize \u672A\u6536\u655B\uFF08>32 \u8F6E\uFF09\u2014\u2014\u91CF\u5316\u8FDE\u9501\u5F02\u5E38\uFF0C\u68C0\u67E5\u8F93\u5165\u51E0\u4F55")}function Vu(i,e){let t=i.length;if(t<4)return null;let n=u=>{for(let f=1;f+1<u.length;f++){let m=gi(i[u[0]],i[u[f]],i[u[f+1]]);if(m)return m}return null},s=u=>{let f=n(u);return f?u.every(m=>nn(i[m],f)<=e):!0},r=[],o=[0,1];for(let u=2;u<t;u++){let f=[...o,u];s(f)?o=f:(r.push(o),o=[o[o.length-1],u])}let a=[...o,0];if(r.length&&s([...o,...r[0]])?r[0]=[...o,...r[0]]:s(a)?r.push(a):(r.push(o),r.push([o[o.length-1],0])),r.length<2)return null;let l=r.map(u=>u[0]),c=l.length,h=r.filter(u=>new Set(u).size>=3),d=[];if(c===2)d.push([l[0],l[1]]);else{for(let u=0;u<c;u++)d.push([l[u],l[(u+1)%c]]);if(c>=3){if(!s(l))return null;new Set(l).size>=3&&h.push([...l])}}return h.length?{pieces:h,creases:d}:null}var Gu=(i,e)=>`${i}:${e?"f":"r"}`;function Wu(i,e){let t=e?.project??(g=>{let p=i.pt(g);return{x:p.x,y:p.y}}),n=e?.edges?[...e.edges].map(g=>i.edge(g)):i.edges(),s=new Map,r=g=>{let p=s.get(g);return p||(p=t(g),s.set(g,p)),p},o=new Map,a=new Set;for(let g of n)a.add(g.id),o.set(g.a,(o.get(g.a)??0)+1),o.set(g.b,(o.get(g.b)??0)+1);let l=[...o.entries()].filter(([,g])=>g===1).map(([g])=>g);for(;l.length;){let g=l.pop();if((o.get(g)??0)===1)for(let p of i.vertex(g).edges){if(!a.has(p))continue;a.delete(p);let b=i.edge(p);for(let S of[b.a,b.b]){let _=(o.get(S)??0)-1;o.set(S,_),_===1&&l.push(S)}}}if(a.size===0)return[];let c=new Map,h=g=>{let p=c.get(g);if(!p){p=[];let b=i.vertex(g);for(let S of b.edges){if(!a.has(S))continue;let _=i.otherEnd(i.edge(S),g);p.push({eid:S,to:_,angle:xc(r(g),r(_))})}p.sort((S,_)=>S.angle-_.angle),c.set(g,p)}return p},d=(g,p)=>{let b=h(p),S=xc(r(p),r(g)),_;for(let A=b.length-1;A>=0;A--)if(b[A].angle<S-1e-12){_=b[A];break}return _||(_=b[b.length-1]),_},u=new Set,f=[],m=[];for(let g of a){let p=i.edge(g);for(let b of[!0,!1]){if(u.has(Gu(g,b)))continue;let S=[],_=[],A=g,w=b?p.a:p.b,E=b?p.b:p.a;for(;;){let C=i.edge(A).a===w,R=Gu(A,C);if(u.has(R))break;u.add(R),S.push({edge:A,forward:C}),_.push(r(w));let D=d(w,E);w=E,E=D.to,A=D.eid}if(S.length<2)continue;let y=Ou(_),T={edges:S,pts:_};y>1e-9?f.push({ring:T,area:y}):y<-1e-9&&m.push({ring:T,areaAbs:-y})}}let x=f.sort((g,p)=>g.area-p.area).map(g=>({outer:g.ring,holes:[],area:g.area}));for(let g of m){let p=g.ring.pts[0];for(let b of x)if(b.outer.pts.length&&Jp(b.outer,g.ring,p)){b.holes.push(g.ring),b.area-=g.areaAbs;break}}return x}function Jp(i,e,t){let n=new Set(i.edges.map(s=>s.edge));return e.edges.some(s=>n.has(s.edge))?!1:dt(t,i.pts)}function gs(i){let e=i.outer.pts.map(a=>a.y),t=Math.min(...e),n=Math.max(...e),s=[i.outer,...i.holes];for(let a=1;a<=8;a++){let l=t+(n-t)*a/(a+1);if(s.some(u=>u.pts.some(f=>Math.abs(f.y-l)<1e-9)))continue;let c=[];for(let u of s)for(let f=0;f<u.pts.length;f++){let m=u.pts[f],x=u.pts[(f+1)%u.pts.length];m.y>l!=x.y>l&&c.push(m.x+(l-m.y)*(x.x-m.x)/(x.y-m.y))}if(c.length<2)continue;c.sort((u,f)=>u-f);let h=NaN,d=-1;for(let u=0;u+1<c.length;u+=2){let f=c[u+1]-c[u];f>d&&(d=f,h=(c[u]+c[u+1])/2)}if(d>1e-9)return{x:h,y:l}}let r=i.outer.pts.reduce((a,l)=>a+l.x,0)/i.outer.pts.length,o=i.outer.pts.reduce((a,l)=>a+l.y,0)/i.outer.pts.length;return{x:r,y:o}}function Xu(i,e){if(!dt(e,i.outer.pts))return!1;for(let t of i.holes)if(dt(e,t.pts))return!1;return!0}var jp=1-1e-10,bo=class i{constructor(){V(this,"recs",new Map);V(this,"nextId",1)}all(){return[...this.recs.values()]}rec(e){let t=this.recs.get(e);if(!t)throw new Error(`plane ${e} \u4E0D\u5B58\u5728`);return t}ensure(e,t){for(let s of this.recs.values())if(te(s.plane.n,e.n)>=jp&&Math.abs(s.plane.d-e.d)<=t)return s;let n={id:this.nextId++,plane:e,basis:ms(e)};return this.recs.set(n.id,n),n}prune(e){for(let t of[...this.recs.keys()])e.has(t)||this.recs.delete(t)}clone(){let e=new i;e.nextId=this.nextId;for(let[t,n]of this.recs)e.recs.set(t,n);return e}};function qu(i,e,t,n){for(let a of i.vertices()){let l=[...a.edges],c=i.pt(a.id);for(let h=0;h<l.length;h++)for(let d=h+1;d<l.length;d++){let u=i.pt(i.otherEnd(i.edge(l[h]),a.id)),f=i.pt(i.otherEnd(i.edge(l[d]),a.id)),m=gi(c,u,f);m&&e.ensure(m,t)}}let s=new Map,r=i.edges();for(let a of e.all()){let l=[];for(let c of r)nn(i.pt(c.a),a.plane)<=t&&nn(i.pt(c.b),a.plane)<=t&&l.push(c.id);l.length>=3&&s.set(a.id,l)}let o=new Set([...s.keys(),...n]);return e.prune(o),s}var So=class i{constructor(){V(this,"byId",new Map);V(this,"nextId",1)}faces(){return[...this.byId.values()]}face(e){return this.byId.get(e)}faceCount(){return this.byId.size}planeIds(){return new Set([...this.byId.values()].map(e=>e.planeId))}faceContains(e,t){if(!dt(t,e.outer.pts))return!1;for(let n of e.holes)if(dt(t,n.pts))return!1;return!0}occurrences(e,t){let n=0,s=!1,r=!1;for(let o of e.outer.edges)o.edge===t&&(n++,s=!0);for(let o of e.holes)for(let a of o.edges)a.edge===t&&(n++,r=!0);return{count:n,onOuter:s,onHole:r}}regionsByPlane(e,t,n){let s=qu(e,t,n,this.planeIds()),r=new Map;for(let[o,a]of s){let l=t.rec(o),c=Wu(e,{edges:a,project:h=>vn(e.pt(h),l.basis)});c.length&&r.set(o,c)}return r}reconcileConstructive(e,t,n,s,r,o){let a=o??this.captureSnaps(e);return this.settle(e,t,n,a,new Map,new Set,!0,void 0,"or",{zeroClaimKeep:!0,gestureEdges:s,toggleWith:r})}snapshotEraseVerdicts(e){let t={burst:new Set,mergePairs:[],heal:new Set};for(let n of e){let s=this.faces().map(o=>({f:o,occ:this.occurrences(o,n)})).filter(o=>o.occ.count>0);if(s.length===0)continue;let r=new Map;for(let o of s){let a=r.get(o.f.planeId)??[];a.push(o),r.set(o.f.planeId,a)}for(let o of r.values())if(o.length>=2)t.mergePairs.push([o[0].f.id,o[1].f.id]);else{let{f:a,occ:l}=o[0];l.count>=2||l.onHole?t.heal.add(a.id):t.burst.add(a.id)}}return t}reconcileErase(e,t,n,s){let r=[],o=new Map,a=f=>{let m=f;for(;o.get(m)!==void 0&&o.get(m)!==m;)m=o.get(m);return m};for(let[f,m]of s.mergePairs)o.has(f)||o.set(f,f),o.has(m)||o.set(m,m),o.set(a(f),a(m));let l=new Map;for(let f of o.keys()){let m=a(f);(l.get(m)??l.set(m,[]).get(m)).push(f)}let c=this.regionsByPlane(e,t,n),h=new Set,d=(f,m)=>(c.get(f)??[]).find(x=>!h.has(x)&&Xu(x,m)),u=new Set(s.burst);for(let f of l.values()){let m=f.some(p=>u.has(p)),x,g;if(!m)for(let p of f){let b=this.byId.get(p);if(b&&(x=d(b.planeId,gs(b)),x)){g=b.planeId;break}}if(x&&g!==void 0){for(let b of f)this.byId.delete(b);let p=this.mint(g,x);h.add(x),r.push({type:"MERGE",from:f,into:p.id})}else for(let p of f)u.add(p)}for(let f of s.heal){if(u.has(f)||!this.byId.has(f))continue;let m=this.byId.get(f),x=d(m.planeId,gs(m));if(x){this.byId.delete(f);let g=this.mint(m.planeId,x);h.add(x),r.push({type:"ABSORB",from:f,into:g.id})}else u.add(f)}for(let f of u)this.byId.delete(f)&&r.push({type:"BURST",face:f});return this.rebuildFaceLinks(e),r}deleteSilently(e){return this.byId.delete(e)}renameFace(e,t){let n=this.byId.get(e);!n||this.byId.has(t)||(this.byId.delete(e),this.byId.set(t,{id:t,planeId:n.planeId,outer:n.outer,holes:n.holes}))}eraseFaces(e,t){let n=[];for(let s of t)this.byId.delete(s)&&n.push({type:"FACE_ERASED",face:s});return this.rebuildFaceLinks(e),n}reconcileCoverage(e,t,n,s,r,o,a,l,c="or"){return this.settle(e,t,n,s,r,o,a,l,c,{})}settle(e,t,n,s,r,o,a,l,c,h){let d=[];if(!a){for(let y of this.faces())this.refreshRingPts(e,t,y);this.rebuildFaceLinks(e);let E=[...o].filter(y=>this.byId.has(y));return E.length&&d.push({type:"STRETCH",faces:E}),d}let u=[],f=this.regionsByPlane(e,t,n),m=E=>{for(;r.has(E);)E=r.get(E);return E},x=E=>{let y=[];for(let T of E){let C=m(T);if(!e.hasVertex(C))continue;let R=e.pt(C);y.length&&R.x===y[y.length-1].x&&R.y===y[y.length-1].y&&R.z===y[y.length-1].z||y.push(R)}for(;y.length>=2&&y[0].x===y[y.length-1].x&&y[0].y===y[y.length-1].y&&y[0].z===y[y.length-1].z;)y.pop();return y},g=new Map,p=new Map;for(let E of this.faces()){let y=s.get(E.id),T=[],C=l?.get(E.id),R=C??(y?[y.outer]:[]);for(let D of R){let I=x(D);if(I.length<3)continue;let k=null;for(let j=0;j+2<I.length&&!k;j++)k=gi(I[j],I[j+1],I[j+2]);if(!k||!I.every(j=>nn(j,k)<=n))continue;let F=t.ensure(k,n),q=I.map(j=>vn(j,F.basis)),B=C?[]:(y?.holes??[]).map(j=>x(j).map(se=>vn(se,F.basis))),$=j=>Yu(j,q)+B.reduce((se,fe)=>se+(fe.length>=3?Yu(j,fe):0),0);for(let j of f.get(F.id)??[])T.some(se=>se.r===j)||Math.abs($(gs(j)))>=1&&T.push({r:j,planeId:F.id})}g.set(E.id,T);for(let D of T){let I=p.get(D.r)??[];I.push(E.id),p.set(D.r,I)}}let b=new Map,S=new Map;for(let[E,y]of g){if(y.length<2)continue;this.byId.delete(E);let T=[];for(let C of y){let R=this.mint(C.planeId,C.r);T.push(R.id);let D=p.get(C.r);D[D.indexOf(E)]=R.id}b.set(E,T),d.push({type:"DIVIDE",from:E,into:T})}for(let[E,y]of p){let T=[...new Set(y)];if(T.length<2)continue;if(c==="xor"&&T.length%2===0){for(let D of T){let I=this.byId.get(D);I&&u.push(...this.ringEdgeIds(I)),this.byId.delete(D)&&d.push({type:"BURST",face:D})}p.set(E,[]);continue}let C=null;for(let D of T)C=this.byId.get(D)?.planeId??C,this.byId.delete(D);let R=this.mint(C,E);for(let D of T)b.set(D,[...b.get(D)??[],R.id]);d.push({type:"MERGE",from:T,into:R.id}),p.set(E,[R.id])}for(let[E,y]of g){if(b.has(E))continue;let T=this.byId.get(E);if(!T)continue;if(y.length===0){if(h.zeroClaimKeep)continue;this.byId.delete(E),d.push({type:"BURST",face:E});continue}let{r:C,planeId:R}=y[0];(p.get(C)??[])[0]===E&&(R===T.planeId?this.adopt(T,C):(this.byId.delete(E),this.byId.set(E,{id:E,planeId:R,outer:C.outer,holes:C.holes}),S.set(E,E)))}let _=h.gestureEdges,A=h.toggleWith;if(A&&_)for(let E of this.faces())E.outer.edges.every(y=>_.has(y.edge)||A.has(y.edge))&&(u.push(...this.ringEdgeIds(E)),this.byId.delete(E.id),d.push({type:"BURST",face:E.id}));if(_&&_.size){let E=new Set;for(let[,y]of g)for(let T of y)E.add(T.r);for(let[y,T]of f)for(let C of T)if(!E.has(C)&&!this.faces().some(R=>R.outer===C.outer)&&C.outer.edges.some(R=>_.has(R.edge))){let R=this.mint(y,C);d.push({type:"BIRTH",face:R.id})}}this.rebuildFaceLinks(e),this.buryEdges(e,u);let w=new Set;for(let E of o){this.byId.has(E)&&!b.has(E)&&!d.some(T=>T.type==="BURST"&&T.face===E)&&w.add(E);let y=S.get(E);y!==void 0&&w.add(y)}return w.size&&d.push({type:"STRETCH",faces:[...w]}),d}buryEdges(e,t){for(let n of t)e.hasEdge(n)&&e.edge(n).faceLinks.length===0&&e.removeEdge(n)}ringEdgeIds(e){let t=[];for(let n of[e.outer,...e.holes])for(let s of n.edges)t.push(s.edge);return t}captureSnaps(e){let t=new Map;for(let n of this.faces())t.set(n.id,{outer:an(e,n.outer),holes:n.holes.map(s=>an(e,s))});return t}clone(){let e=new i;e.nextId=this.nextId;let t=n=>({edges:n.edges.map(s=>({...s})),pts:n.pts.map(s=>({...s}))});for(let[n,s]of this.byId)e.byId.set(n,{id:s.id,planeId:s.planeId,outer:t(s.outer),holes:s.holes.map(t)});return e}mint(e,t){let n={id:this.nextId++,planeId:e,outer:t.outer,holes:t.holes};return this.byId.set(n.id,n),n}adopt(e,t){e.outer=t.outer,e.holes=t.holes}refreshRingPts(e,t,n){let s=t.rec(n.planeId).basis;for(let r of[n.outer,...n.holes])r.pts=r.edges.map(o=>vn(e.pt(o.forward?e.edge(o.edge).a:e.edge(o.edge).b),s))}rebuildFaceLinks(e){for(let t of e.edges())t.faceLinks=[];for(let t of this.byId.values())for(let n of[t.outer,...t.holes])for(let s of n.edges)e.hasEdge(s.edge)&&e.edge(s.edge).faceLinks.push(t.id)}};function Yu(i,e){let t=0;for(let n=0;n<e.length;n++){let s=e[n],r=e[(n+1)%e.length];s.y<=i.y?r.y>i.y&&yc(s,r,i)>0&&t++:r.y<=i.y&&yc(s,r,i)<0&&t--}return t}function an(i,e){let t=[],n=e.edges;for(let s=0;s<n.length;s++){let r=n[s];if(i.hasEdge(r.edge)){let o=i.edge(r.edge);t.push(r.forward?o.a:o.b)}else{let o=n[(s-1+n.length)%n.length];if(i.hasEdge(o.edge)){let a=i.edge(o.edge);t.push(o.forward?a.b:a.a)}}}return t}var Mo=i=>({x:i.x,y:i.y,z:i.z??0}),xi=class i{constructor(e){V(this,"_graph",new _o);V(this,"store",new So);V(this,"eventLog",[]);V(this,"planes",new bo);V(this,"coplanarTol");this.coplanarTol=e?.coplanarTol??.001}get graph(){return this._graph}clone(){let e=new i({coplanarTol:this.coplanarTol});return e._graph=this._graph.clone(),e.store=this.store.clone(),e.planes=this.planes.clone(),e}addEdges(e){return this.addSegmentsMixed(e.map(([t,n])=>({a:t,b:n,gesture:!0})))}addSegmentsMixed(e,t,n){let s=this.store.captureSnaps(this.graph),r=new Set(n);for(let{a:o,b:a,gesture:l}of e){let c=ku(this.graph,Mo(o),Mo(a),(h,d,u)=>{r.delete(h)&&(r.add(d),r.add(u))});if(l){for(let h of c.created)r.add(h);for(let h of c.retraced)r.add(h)}}return this.emit(this.store.reconcileConstructive(this.graph,this.planes,this.coplanarTol,r,t,s))}eraseEdges(e){let t=[...new Set(e)].filter(s=>this.graph.hasEdge(s)),n=this.store.snapshotEraseVerdicts(t);for(let s of t)this.graph.removeEdge(s);return this.emit(this.store.reconcileErase(this.graph,this.planes,this.coplanarTol,n))}eraseFaces(e){return this.emit(this.store.eraseFaces(this.graph,e))}moveVertices(e,t="or"){let n=new Map;for(let m of this.store.faces())n.set(m.id,{outer:an(this.graph,m.outer),holes:m.holes.map(x=>an(this.graph,x))});let s=new Map;for(let m of e)this.graph.hasVertex(m.id)&&s.set(m.id,Xi(Mo(m.to)));let r=new Set;for(let m of s.keys())for(let x of this.graph.vertex(m).edges)for(let g of this.graph.edge(x).faceLinks)r.add(g);let o=new Map;for(let m of this.graph.vertices()){let x=s.get(m.id)??{x:m.x,y:m.y,z:m.z},g=Ct(x),p=o.get(g)??[];p.push(m.id),o.set(g,p)}let a=new Map,l=!1;for(let m of o.values()){if(m.length<2)continue;l=!0;let x=m.find(g=>!s.has(g))??Math.min(...m);for(let g of m)g!==x&&(a.set(g,x),this.absorbVertex(g,x),s.delete(g))}let c=[...s].filter(([m,x])=>this.graph.hasVertex(m)&&!tn(this.graph.pt(m),x)).map(([m,x])=>({id:m,to:x}));this.graph.relocateVertices(c);let{changed:h}=vc(this.graph),d=m=>{let x=m;for(;a.has(x);)x=a.get(x);return x},u=new Map;for(let[m,x]of n){if(x.holes.length)continue;let g=[];for(let _ of x.outer){let A=d(_);this.graph.hasVertex(A)&&(g.length&&g[g.length-1]===A||g.push(A))}for(;g.length>=2&&g[0]===g[g.length-1];)g.pop();if(g.length<4)continue;let p=g.map(_=>this.graph.pt(_)),b=null;for(let _=0;_+2<p.length&&!b;_++)b=gi(p[_],p[_+1],p[_+2]);if(b&&p.every(_=>nn(_,b)<=this.coplanarTol))continue;let S=Vu(p,this.coplanarTol);if(S){for(let[_,A]of S.creases){let w=g[_],E=g[A];w===E||this.graph.edgeBetween(w,E)!==void 0||this.graph.addEdge(w,E)}u.set(m,S.pieces.map(_=>_.map(A=>g[A])))}}u.size&&vc(this.graph);let f=l||h||r.size>0;return this.emit(this.store.reconcileCoverage(this.graph,this.planes,this.coplanarTol,n,a,r,f,u,t))}pushPull(e,t,n){let s=n?.settleLanding!==!1,r=this.store.face(e);if(!r)return[];let o=this.planes.rec(r.planeId),a=o.plane.n,l=Ue(a,t);if(Math.abs(t)<1e-6)return[];let c=new Set(this.graph.edges().map(I=>I.id)),h=[r.outer,...r.holes],d=new Map,u=new Set,f=new Set,m=new Map;for(let I=0;I<h.length;I++)for(let k of h[I].edges){let F=this.graph.edge(k.edge);u.add(F.id),m.set(F.id,I);let q=F.faceLinks.filter(B=>B!==e);q.length===0?(d.set(F.id,"move"),f.add(F.id)):q.every(B=>{let $=this.store.face(B);return $?Math.abs(te(this.planes.rec($.planeId).plane.n,a))<=.001:!0})?d.set(F.id,"move"):d.set(F.id,"copy")}let x=new Map;for(let I of u){let k=this.graph.edge(I),F=d.get(I);for(let q of[k.a,k.b]){let B=x.get(q)??{hasMove:!1,hasCopy:!1};F==="move"?B.hasMove=!0:B.hasCopy=!0,x.set(q,B)}}for(let I of this.graph.edges()){if(u.has(I.id))continue;let k={a:x.get(I.a),b:x.get(I.b)};if(!k.a&&!k.b)continue;let F=this.graph.pt(I.a),q=this.graph.pt(I.b),B=Re(q,F),$=Math.hypot(B.x,B.y,B.z);$>0&&Math.abs(te(Ue(B,1/$),a))>.999||(k.a&&(k.a.hasCopy=!0),k.b&&(k.b.hasCopy=!0))}let g=I=>{let k=x.get(I);return k.hasMove&&!k.hasCopy},p=new Map;for(let I of x.keys())p.set(I,this.graph.pt(I));let b=[],S=[...d.values()].some(I=>I==="copy")||[...x.values()].some(I=>I.hasCopy),_=I=>m.get(I)===0;for(let I of u){if(d.get(I)!=="copy")continue;let k=this.graph.edge(I);b.push({a:Be(p.get(k.a),l),b:Be(p.get(k.b),l),gesture:_(I)})}for(let I of[...u]){if(d.get(I)!=="move"||f.has(I))continue;let k=this.graph.edge(I);g(k.a)&&g(k.b)||(b.push({a:Be(p.get(k.a),l),b:Be(p.get(k.b),l),gesture:_(I)}),this.graph.removeEdge(I))}for(let I of[...f]){if(!this.graph.hasEdge(I))continue;let k=this.graph.edge(I);b.push({a:p.get(k.a),b:p.get(k.b),gesture:_(I)}),g(k.a)&&g(k.b)||(b.push({a:Be(p.get(k.a),l),b:Be(p.get(k.b),l),gesture:_(I)}),this.graph.removeEdge(I))}for(let[I,k]of x){let F=p.get(I);k.hasCopy?b.push({a:F,b:Be(F,l),gesture:!0}):g(I)&&[...f].some(q=>{if(!c.has(q))return!1;let $=this.graph.hasEdge(q)?this.graph.edge(q):null;return $?$.a===I||$.b===I:!1})&&b.push({a:F,b:Be(F,l),gesture:!0})}let A=null;if(S){let I=gs({outer:r.outer,holes:r.holes}),k=o.basis,F=Be(Be(Ue(k.u,I.x),Ue(k.v,I.y)),Ue(o.plane.n,o.plane.d));A=Be(F,l),this.store.deleteSilently(e)}let w=new Set(this.store.faces().map(I=>I.id)),E=[...x.keys()].filter(I=>g(I)&&this.graph.hasVertex(I)).map(I=>({id:I,to:Be(p.get(I),l)})),y=E.length?this.moveVertices(E,s?"xor":"or"):[],T=new Set([...u].filter(I=>d.get(I)==="move")),C=new Set;if(S)for(let I of u)d.get(I)==="move"&&_(I)&&this.graph.hasEdge(I)&&C.add(I);let R=b.length?this.addSegmentsMixed(b,s&&S?T:new Set,C):[],D=[];if(S&&A){let I=this.hitTest(A,this.coplanarTol).face;if(I!==void 0&&!w.has(I)){this.store.renameFace(I,e),this.store.rebuildFaceLinks(this.graph);for(let k of R)if(k.type==="BIRTH"&&k.face===I){let F=k;delete F.face,F.type="STRETCH",F.faces=[e];break}}else D=this.emit([{type:"FACE_ERASED",face:e}])}return[...y,...R,...D]}vertices(){return this.graph.vertices()}edges(){return this.graph.edges()}faces(){return this.store.faces()}face(e){return this.store.face(e)}log(){return this.eventLog}hitTest(e,t){let n=Mo(e),s,r=t;for(let l of this.graph.vertices()){let c=Mt(n,{x:l.x,y:l.y,z:l.z});c<=r&&(r=c,s=l.id)}if(s!==void 0)return{vertex:s};let o,a=t;for(let l of this.graph.edges()){let c=zu(n,this.graph.pt(l.a),this.graph.pt(l.b));c<=a&&(a=c,o=l.id)}if(o!==void 0)return{edge:o};for(let l of this.store.faces()){let c=this.planes.rec(l.planeId);if(!(nn(n,c.plane)>Math.max(t,this.coplanarTol))&&this.store.faceContains(l,vn(n,c.basis)))return{face:l.id}}return{}}faceRings3(e){let t=this.store.face(e);if(!t)return;let n=s=>s.edges.map(r=>this.graph.pt(r.forward?this.graph.edge(r.edge).a:this.graph.edge(r.edge).b));return{outer:n(t.outer),holes:t.holes.map(n)}}planeOf(e){return this.store.face(e)?this.planes.rec(this.store.face(e).planeId):void 0}emit(e){return this.eventLog.push(...e),e}absorbVertex(e,t){for(let n of[...this.graph.vertex(e).edges]){let s=this.graph.edge(n),r=this.graph.otherEnd(s,e);r!==t&&this.graph.edgeBetween(t,r)===void 0&&this.graph.addEdge(t,r),this.graph.removeEdge(n)}}};var Qp={x:0,y:0,z:1},em=5e3,tm=.5,wo=class{constructor(){V(this,"target",{x:0,y:0,z:0});V(this,"yaw",-Math.PI/4);V(this,"pitch",Math.PI/6);V(this,"halfH",300);V(this,"projection","ortho");V(this,"fovY",50*Math.PI/180);V(this,"nearMin",tm)}eyeDir(){let e=Math.cos(this.pitch);return{x:e*Math.cos(this.yaw),y:e*Math.sin(this.yaw),z:Math.sin(this.pitch)}}eyeDist(){return this.projection==="persp"?this.halfH/Math.tan(this.fovY/2):em}eye(){return Be(this.target,Ue(this.eyeDir(),this.eyeDist()))}forward(){return Ue(this.eyeDir(),-1)}right(){return yn(Rt(this.forward(),Qp))}up(){return Rt(this.right(),this.forward())}viewDir(e){return this.projection!=="persp"?this.eyeDir():yn(Re(this.eye(),e))}orbit(e,t){this.yaw-=e*.008,this.pitch=Math.max(-1.55,Math.min(1.55,this.pitch+t*.008))}pan(e,t,n){let s=2*this.halfH/n.h;this.target=Be(this.target,Be(Ue(this.right(),-e*s),Ue(this.up(),t*s)))}zoomBy(e){this.halfH=Math.max(1,Math.min(1e5,this.halfH*e))}zoomAt(e,t,n,s){let r=(t/s.w*2-1)*this.halfW(s),o=(1-n/s.h*2)*this.halfH,a=Be(Be(this.target,Ue(this.right(),r)),Ue(this.up(),o)),l=this.halfH;this.zoomBy(e);let c=this.halfH/l;this.target=Be(a,Ue(Re(this.target,a),c))}halfW(e){return this.halfH*e.w/e.h}angularPx(e,t){if(this.projection==="persp"){let o=Re(e,this.eye()),a=Math.max(te(o,this.forward()),this.nearMin),l=Math.tan(this.fovY/2),c=te(o,this.right())/(a*l*(t.w/t.h)),h=te(o,this.up())/(a*l);return{x:(c*.5+.5)*t.w,y:(.5-h*.5)*t.h}}let n=Re(e,this.target),s=te(n,this.right())/this.halfW(t),r=te(n,this.up())/this.halfH;return{x:(s*.5+.5)*t.w,y:(.5-r*.5)*t.h}}ray(e,t,n){if(this.projection==="persp"){let a=Math.tan(this.fovY/2),l=(e/n.w*2-1)*a*(n.w/n.h),c=(1-t/n.h*2)*a,h=yn(Be(Be(this.forward(),Ue(this.right(),l)),Ue(this.up(),c)));return{origin:this.eye(),dir:h}}let s=(e/n.w*2-1)*this.halfW(n),r=(1-t/n.h*2)*this.halfH;return{origin:Be(Be(this.eye(),Ue(this.right(),s)),Ue(this.up(),r)),dir:this.forward()}}setView(e){switch(e){case"iso":this.yaw=-Math.PI/4,this.pitch=.61;break;case"top":this.yaw=-Math.PI/2,this.pitch=1.55;break;case"front":this.yaw=-Math.PI/2,this.pitch=0;break;case"back":this.yaw=Math.PI/2,this.pitch=0;break;case"right":this.yaw=0,this.pitch=0;break;case"left":this.yaw=Math.PI,this.pitch=0;break}}fitPoints(e,t,n=220){if(!e.length){this.target={x:0,y:0,z:0},this.halfH=n;return}let s=0,r=0,o=0;for(let u of e)s+=u.x,r+=u.y,o+=u.z;this.target={x:s/e.length,y:r/e.length,z:o/e.length};let a=this.right(),l=this.up(),c=0,h=0;for(let u of e){let f=Re(u,this.target);c=Math.max(c,Math.abs(te(f,a))),h=Math.max(h,Math.abs(te(f,l)))}let d=t.w/t.h;this.halfH=Math.max(10,Math.max(h,c/d)*1.25)}};function qi(i,e,t,n){let s=te(t,e);if(Math.abs(s)<1e-9)return null;let r=(n-te(t,i))/s;return Be(i,Ue(e,r))}function Eo(i,e,t,n){let s=te(e,n),r=1-s*s;if(Math.abs(r)<1e-9)return null;let o=Re(t,i),a=(te(o,e)-s*te(o,n))/r;return Be(i,Ue(e,a))}var yi={endpoint:90,origin:80,midpoint:70,intersection:65,edge:60,cross:55,axisLine:45,plane:10},ti={point:10,edge:7,line:3.5,combo:12},nm=24,im=800,vi=i=>i.h/im,$u=1e-5;function sm(i,e){let t=te(i.dir,e.dir),n=1-t*t;if(Math.abs(n)<1e-9)return null;let s=Re(i.a,e.a),r=te(i.dir,s),o=te(e.dir,s),a=(t*o-r)/n,l=(o-t*r)/n;if(i.len!==void 0&&(a<-1e-9||a>i.len+1e-9)||e.len!==void 0&&(l<-1e-9||l>e.len+1e-9))return null;let c={x:i.a.x+i.dir.x*a,y:i.a.y+i.dir.y*a,z:i.a.z+i.dir.z*a},h={x:e.a.x+e.dir.x*l,y:e.a.y+e.dir.y*l,z:e.a.z+e.dir.z*l};return Mt(c,h)>$u?null:e.len!==void 0?h:c}function rm(i,e,t,n){let{pf:s,vp:r}=i,o=n?.comboEps??ti.combo,a=s.ray(e.x,e.y,r),l=g=>s.angularPx(g,r),c=g=>{let p=l(g);return Math.hypot(p.x-e.x,p.y-e.y)},h=(g,p,b)=>{let S=l(g),_=l(b!==void 0?{x:g.x+p.x*b,y:g.y+p.y*b,z:g.z+p.z*b}:{x:g.x+p.x*100,y:g.y+p.y*100,z:g.z+p.z*100}),A=_.x-S.x,w=_.y-S.y,E=A*A+w*w;if(E===0)return Math.hypot(e.x-S.x,e.y-S.y);if(b!==void 0){let y=((e.x-S.x)*A+(e.y-S.y)*w)/E;return y=Math.max(0,Math.min(1,y)),Math.hypot(e.x-(S.x+y*A),e.y-(S.y+y*w))}return Math.abs((e.x-S.x)*w-(e.y-S.y)*A)/Math.sqrt(E)},d=[],u=[],f=n?.hidden;for(let g of t){let p=g.locus;if(p.dim===0){let b=c(p.p);b<=g.eps&&!(f&&f(p.p))&&d.push({p:p.p,dim:0,rank:g.rank,d:b,used:[g]})}else if(p.dim===1){let b=h(p.a,p.dir,p.len);if(b>g.eps)continue;let S=Eo(p.a,p.dir,a.origin,a.dir);if(!S)continue;let _=te(Re(S,p.a),p.dir);p.len!==void 0&&(_=Math.max(0,Math.min(p.len,_)));let A=b;if(n?.spans1D){let E=p.len!==void 0?0:Math.abs(_)+1e5,y=p.len!==void 0?0:_-E,T=p.len!==void 0?p.len:_+E,C=n.spans1D(p.a,p.dir,y,T),R=null;for(let D of C)if(_>D[0]+1e-9&&_<D[1]-1e-9){R=D;break}if(R){let D=[R[0],R[1]].filter(k=>k>y+1e-9&&k<T-1e-9);if(!D.length)continue;_=D.reduce((k,F)=>Math.abs(F-_)<Math.abs(k-_)?F:k);let I={x:p.a.x+p.dir.x*_,y:p.a.y+p.dir.y*_,z:p.a.z+p.dir.z*_};if(A=c(I),A>g.eps)continue}}else if(f){let E={x:p.a.x+p.dir.x*_,y:p.a.y+p.dir.y*_,z:p.a.z+p.dir.z*_};if(f(E))continue}let w={x:p.a.x+p.dir.x*_,y:p.a.y+p.dir.y*_,z:p.a.z+p.dir.z*_};d.push({p:w,dim:1,rank:g.rank,d:A,used:[g]}),u.push({c:g,l:p})}else{let b=qi(a.origin,a.dir,p.plane.n,p.plane.d);b&&d.push({p:b,dim:2,rank:g.rank,d:0,used:[g]})}}for(let g=0;g<u.length;g++)for(let p=g+1;p<u.length;p++){let b=sm(u[g].l,u[p].l);if(!b||f&&f(b))continue;let S=c(b);S>o||d.push({p:b,dim:0,rank:Math.max(u[g].c.rank,u[p].c.rank),d:S,used:[u[g].c,u[p].c]})}if(!d.length)return null;let m={endpoint:0,origin:0,midpoint:0,axis:1,align:2,"edge-align":3,edge:4},x=g=>{let p=g.used[0]?.tag;return`${m[p?.kind??""]??9}|${p?.kind??""}|${p?.axis??""}|${p?.src?Ct(p.src):""}`};return d.sort((g,p)=>g.dim-p.dim||p.rank-g.rank||Math.round(g.d*2)-Math.round(p.d*2)||(x(g)<x(p)?-1:x(g)>x(p)?1:0)),d[0]}var bc={has:()=>!1,opaque:!1},om=[{axis:"x",dir:{x:1,y:0,z:0}},{axis:"y",dir:{x:0,y:1,z:0}},{axis:"z",dir:{x:0,y:0,z:1}}];function am(i,e,t){return t?[...an(i.graph,e.outer),...e.holes.flatMap(n=>an(i.graph,n))].some(n=>t.has(n)):!1}function Ku(i,e,t){return t?t.faces?t.faces(e.id):am(i,e,t):!1}function Ju(i,e){if(!e||e.opaque)return;let t=new Set;for(let n of i.faces())Ku(i,n,e)&&t.add(n.id);return t.size?n=>t.has(n):void 0}function lm(i,e){let t=i.edges(),n=new Map,s=c=>{let h=c;for(;n.has(h)&&n.get(h)!==h;)h=n.get(h);return h},r=(c,h)=>{let d=s(c),u=s(h);d!==u&&n.set(d,u)},o=new Map;for(let c of t)for(let h of[c.a,c.b]){if(!e(h))continue;let d=o.get(h);d?d.push(c):o.set(h,[c])}for(let[c,h]of o){let d=i.graph.pt(c),u=h.map(m=>{let x=i.graph.pt(m.a===c?m.b:m.a),g=Re(x,d),p=Mt(x,d);return p>0?Ue(g,1/p):null}),f=new Set;for(let m=0;m<h.length;m++)if(!(f.has(m)||!u[m])){for(let x=m+1;x<h.length;x++)if(!(f.has(x)||!u[x])&&te(u[m],u[x])<-(1-1e-9)){r(h[m].id,h[x].id),f.add(m),f.add(x);break}}}let a=new Map;for(let c of t){let h=s(c.id),d=a.get(h);d?d.push(c):a.set(h,[c])}let l=[];for(let c of a.values()){let h=new Map;for(let u of c)for(let f of[u.a,u.b])h.set(f,(h.get(f)??0)+1);let d=[...h].filter(([,u])=>u===1).map(([u])=>u);d.length===2&&(e(d[0])||e(d[1])||l.push({a:i.graph.pt(d[0]),b:i.graph.pt(d[1])}))}return l}function tr(i,e,t,n){let s=e.viewDir(t);for(let r of i.faces()){if(n?.(r.id))continue;let o=i.planeOf(r.id),a=i.face(r.id);if(!o||!a)continue;let l=te(o.plane.n,s);if(Math.abs(l)<1e-9)continue;let c=(o.plane.d-te(o.plane.n,t))/l;if(c<=1e-4)continue;let h=Be(t,Ue(s,c)),d={x:te(h,o.basis.u),y:te(h,o.basis.v)};if(dt(d,a.outer.pts)&&!a.holes.some(u=>dt(d,u.pts)))return!0}return!1}function cm(i,e,t,n,s,r,o){let a=e.viewDir(Be(t,Ue(n,(s+r)/2))),l=[];for(let h of i.faces()){if(o?.(h.id))continue;let d=i.planeOf(h.id),u=i.face(h.id);if(!d||!u)continue;let f=d.plane.n,m=d.plane.d,x=te(f,a);if(Math.abs(x)<1e-9)continue;let g=(m-te(f,t))/x,p=-te(f,n)/x,{u:b,v:S}=d.basis,_=te(t,b)+g*te(a,b),A=te(n,b)+p*te(a,b),w=te(t,S)+g*te(a,S),E=te(n,S)+p*te(a,S),y=[s,r];Math.abs(p)>1e-12&&y.push((1e-4-g)/p);for(let C of[u.outer.pts,...u.holes.map(R=>R.pts)])for(let R=0;R<C.length;R++){let D=C[R],I=C[(R+1)%C.length],k=I.x-D.x,F=I.y-D.y,q=-A*F+E*k;if(Math.abs(q)<1e-12)continue;let B=D.x-_,$=D.y-w,j=(-B*F+$*k)/q,se=(A*$-E*B)/q;se>=-1e-9&&se<=1+1e-9&&y.push(j)}let T=y.filter(C=>C>=s-1e-9&&C<=r+1e-9).sort((C,R)=>C-R);for(let C=0;C+1<T.length;C++){let R=T[C],D=T[C+1];if(D-R<1e-9)continue;let I=(R+D)/2;if(g+p*I<=1e-4)continue;let k={x:_+A*I,y:w+E*I};dt(k,u.outer.pts)&&(u.holes.some(F=>dt(k,F.pts))||l.push([R,D]))}}l.sort((h,d)=>h[0]-d[0]);let c=[];for(let h of l){let d=c[c.length-1];d&&h[0]<=d[1]+1e-9?d[1]=Math.max(d[1],h[1]):c.push([h[0],h[1]])}return c}function hm(i){let e=[],{k:t}=i,n=h=>i.hand?.has(h)??!1,s=Ju(t,i.hand),r=h=>i.pf?tr(t,i.pf,h,s):!1;for(let h of t.vertices()){if(n(h.id))continue;let d={x:h.x,y:h.y,z:h.z};r(d)||e.push({locus:{dim:0,p:d},rank:yi.endpoint,eps:ti.point,tag:{kind:"endpoint"}})}r({x:0,y:0,z:0})||e.push({locus:{dim:0,p:{x:0,y:0,z:0}},rank:yi.origin,eps:ti.point,tag:{kind:"origin"}});let o=lm(t,n);for(let{a:h,b:d}of o){let u=Mt(h,d);if(u<=0)continue;let f={x:(h.x+d.x)/2,y:(h.y+d.y)/2,z:(h.z+d.z)/2};r(f)||e.push({locus:{dim:0,p:f},rank:yi.midpoint,eps:ti.point,tag:{kind:"midpoint"}}),e.push({locus:{dim:1,a:h,dir:Ue(Re(d,h),1/u),len:u},rank:yi.edge,eps:ti.edge,tag:{kind:"edge"}})}let a=[...om];if(i.basis){let h=d=>Math.abs(d.x)>.999||Math.abs(d.y)>.999||Math.abs(d.z)>.999;h(i.basis.u)||a.push({axis:"u",dir:i.basis.u}),h(i.basis.v)||a.push({axis:"v",dir:i.basis.v})}let l=new Set,c=(h,d)=>{let u=Ct(h);if(!l.has(u)){l.add(u);for(let{axis:f,dir:m}of a)e.push({locus:{dim:1,a:h,dir:m},rank:yi.axisLine,eps:ti.line,tag:{kind:d,src:h,axis:f}})}};if(i.lines!==!1){i.anchor&&c(i.anchor,"axis"),c({x:0,y:0,z:0},"align");for(let h of i.alignSources??[])c(h,"align")}{let h=o.map(({a:d,b:u})=>{let f=Mt(d,u);return f>0?{a:d,dir:Ue(Re(u,d),1/f),ea:d,eb:u}:null}).filter(d=>d!==null);for(let d=0;d<h.length;d++)for(let u=d+1;u<h.length;u++){let f=um(h[d],h[u]);f&&([h[d].ea,h[d].eb,h[u].ea,h[u].eb].some(m=>Mt(f,m)<=1e-6)||r(f)||e.push({locus:{dim:0,p:f},rank:yi.intersection,eps:ti.point,tag:{kind:"intersection"}}))}}{let h=t.faces().filter(d=>!Ku(t,d,i.hand));for(let d=0;d<h.length;d++)for(let u=d+1;u<h.length;u++)for(let f of dm(t,h[d].id,h[u].id))e.push({locus:{dim:1,a:f.a,dir:f.dir,len:f.len},rank:yi.cross,eps:ti.line,tag:{kind:"cross"}})}return e.push({locus:{dim:2,plane:i.plane},rank:yi.plane,eps:1/0,tag:{kind:"plane"}}),e}function um(i,e){let t=te(i.dir,e.dir),n=1-t*t;if(Math.abs(n)<1e-9)return null;let s=Re(i.a,e.a),r=te(i.dir,s),o=te(e.dir,s),a=(t*o-r)/n,l=(o-t*r)/n,c={x:i.a.x+i.dir.x*a,y:i.a.y+i.dir.y*a,z:i.a.z+i.dir.z*a},h={x:e.a.x+e.dir.x*l,y:e.a.y+e.dir.y*l,z:e.a.z+e.dir.z*l};return Mt(c,h)>$u?null:c}function Zu(i,e,t){let n=[];for(let r of t)for(let o=0;o<r.length;o++){let a=r[o],l=r[(o+1)%r.length],c=l.x-a.x,h=l.y-a.y,d=c*e.y-h*e.x;if(Math.abs(d)<1e-12)continue;let u=((i.x-a.x)*e.y-(i.y-a.y)*e.x)/d;if(u<0||u>=1)continue;let f=Math.abs(e.x)>Math.abs(e.y)?(a.x+u*c-i.x)/e.x:(a.y+u*h-i.y)/e.y;n.push(f)}n.sort((r,o)=>r-o);let s=[];for(let r=0;r+1<n.length;r+=2)s.push([n[r],n[r+1]]);return s}function dm(i,e,t){let n=i.planeOf(e),s=i.planeOf(t),r=i.face(e),o=i.face(t);if(!n||!s||!r||!o)return[];let a=Rt(n.plane.n,s.plane.n),l=te(a,a);if(l<1e-12)return[];let c=Ue(Be(Ue(Rt(s.plane.n,a),n.plane.d),Ue(Rt(a,n.plane.n),s.plane.d)),1/l),h=Ue(a,1/Math.sqrt(l)),d=p=>({p2:{x:te(c,p.basis.u),y:te(c,p.basis.v)},d2:{x:te(h,p.basis.u),y:te(h,p.basis.v)}}),u=d(n),f=d(s),m=Zu(u.p2,u.d2,[r.outer.pts,...r.holes.map(p=>p.pts)]),x=Zu(f.p2,f.d2,[o.outer.pts,...o.holes.map(p=>p.pts)]),g=[];for(let[p,b]of m)for(let[S,_]of x){let A=Math.max(p,S),w=Math.min(b,_);w-A<1e-9||g.push({a:{x:c.x+h.x*A,y:c.y+h.y*A,z:c.z+h.z*A},dir:h,len:w-A})}return g}function _n(i,e,t,n,s,r,o){let a=r/8,l=Ju(i,o.hand),c=m=>tr(i,e,m,l),h=hm({k:i,plane:o.plane.plane,basis:o.plane.basis,anchor:o.anchor,alignSources:o.alignSources,pf:e,lines:o.lines,hand:o.hand});if(a!==1)for(let m of h)m.eps!==1/0&&(m.eps*=a);let d=rm({pf:e,vp:t},{x:n,y:s},h,{comboEps:ti.combo*a,hidden:c,spans1D:(m,x,g,p)=>cm(i,e,m,x,g,p,l)});if(!d)return{p:o.anchor??{x:0,y:0,z:0},kind:null};let u=[];for(let m of d.used)if(m.locus.dim===1&&(m.tag.kind==="axis"||m.tag.kind==="align")&&m.tag.src&&m.tag.axis)u.push({a:m.tag.src,b:d.p,axis:m.tag.axis});else if(m.locus.dim===1&&m.tag.kind==="cross"&&m.locus.len!==void 0){let x=m.locus;u.push({a:x.a,b:{x:x.a.x+x.dir.x*x.len,y:x.a.y+x.dir.y*x.len,z:x.a.z+x.dir.z*x.len},axis:"i"})}let f;if(d.used.length===2)f=d.used.some(m=>m.tag.kind==="edge")?"edge-align":"align-combo";else{let m=d.used[0].tag;f=m.kind==="endpoint"?"endpoint":m.kind==="origin"?"origin":m.kind==="midpoint"?"midpoint":m.kind==="intersection"?"intersection":m.kind==="cross"?"cross-line":m.kind==="edge"?"on-edge":m.kind==="axis"?m.axis==="u"||m.axis==="v"?"align":"axis-"+m.axis:m.kind==="align"?"align":m.kind==="plane"&&mm(i,o.plane,d.p)?"on-face":null}return u.length?{p:d.p,kind:f,hints:u}:{p:d.p,kind:f}}var fm=[{x:0,y:0,z:1},{x:0,y:1,z:0},{x:1,y:0,z:0}];function pm(i,e){let t=er(i,te(i,e));return{plane:t,basis:ms(t)}}var _c=i=>fm.map(e=>pm(e,i));function To(i,e){let t=i.forward();if(Math.abs(t.z)>=.34){let n=e.find(s=>Math.abs(s.plane.n.z)>.999);if(n)return n}return e.reduce((n,s)=>Math.abs(te(s.plane.n,t))>Math.abs(te(n.plane.n,t))?s:n)}function ju(i){return To(i,_c({x:0,y:0,z:0}))}function mm(i,e,t){if(e.face===void 0)return!1;let n=i.face(e.face);if(!n)return!1;let s={x:te(t,e.basis.u),y:te(t,e.basis.v)};return dt(s,n.outer.pts)?!n.holes.some(r=>dt(s,r.pts)):!1}function gm(i,e,t,n,s){let r=e.ray(n,s,t),o=null;for(let a of i.faces()){let l=i.planeOf(a.id);if(!l)continue;let c=te(l.plane.n,r.dir);if(Math.abs(c)<1e-9)continue;let h=(l.plane.d-te(l.plane.n,r.origin))/c;if(h<=0||o&&h>=o.t)continue;let d=Be(r.origin,Ue(r.dir,h)),u={x:te(d,l.basis.u),y:te(d,l.basis.v)};dt(u,a.outer.pts)&&(a.holes.some(f=>dt(u,f.pts))||(o={t:h,plane:{plane:l.plane,basis:l.basis,face:a.id}}))}return o?.plane??null}function xm(i,e,t,n,s,r,o){let a=null;for(let l of i.faces()){let c=i.planeOf(l.id);if(!c||nn(r,c.plane)>.001)continue;let h=i.faceRings3(l.id)?.outer;if(!h||h.length<3)continue;let d=h.map(f=>e.angularPx(f,t)),u=0;if(!dt({x:n,y:s},d)){u=1/0;for(let f=0;f<d.length;f++){let m=d[f],x=d[(f+1)%d.length],g=x.x-m.x,p=x.y-m.y,b=g*g+p*p,S=b>0?Math.max(0,Math.min(1,((n-m.x)*g+(s-m.y)*p)/b)):0;u=Math.min(u,Math.hypot(n-(m.x+S*g),s-(m.y+S*p)))}}u<=o&&(!a||u<a.d)&&(a={d:u,plane:{plane:c.plane,basis:c.basis,face:l.id}})}return a?.plane??null}function Ao(i,e,t,n,s,r,o){let{p1:a,facePlane:l,alignSources:c,hand:h}=o;if(a){let f=gm(i,e,t,n,s);if(f&&nn(a,f.plane)<=.001){let S=_n(i,e,t,n,s,r,{plane:f,anchor:a,alignSources:c,hand:h});return{plane:f,fixed:!1,snap:S}}let m=xm(i,e,t,n,s,a,nm*vi(t));if(m){let S=_n(i,e,t,n,s,r,{plane:m,anchor:a,alignSources:c,hand:h});return{plane:m,fixed:!1,snap:S}}let x=_c(a),g=To(e,x),p=_n(i,e,t,n,s,r,{plane:g,anchor:a,alignSources:c,hand:h}),b=x.filter(S=>nn(p.p,S.plane)<=.001);return{plane:b.length?To(e,b):g,fixed:!1,snap:p}}let d=l??ju(e),u=_n(i,e,t,n,s,r,{plane:d,alignSources:c,hand:h});return u.kind===null||u.kind==="on-face"?{plane:d,fixed:!!l,snap:u}:{plane:To(e,_c(u.p)),fixed:!1,snap:u}}function Po(i,e,t,n,s,r,o,a,l){let c=Ao(i,e,t,s,r,o,{p1:n,alignSources:a,hand:l});return{plane:c.plane,snap:c.snap}}var Mc=(()=>{let i=er({x:0,y:0,z:1},0);return{plane:i,basis:ms(i)}})(),Sc=(i,e)=>Math.hypot(i.x-e.x,i.y-e.y);function ym(i,e,t){let n=(t.x-e.x)**2+(t.y-e.y)**2;return n===0?0:Math.max(0,Math.min(1,((i.x-e.x)*(t.x-e.x)+(i.y-e.y)*(t.y-e.y))/n))}function vm(i,e,t){let n=(t.x-e.x)**2+(t.y-e.y)**2;if(n===0)return Sc(i,e);let s=((i.x-e.x)*(t.x-e.x)+(i.y-e.y)*(t.y-e.y))/n;return s=Math.max(0,Math.min(1,s)),Sc(i,{x:e.x+s*(t.x-e.x),y:e.y+s*(t.y-e.y)})}function kn(i,e,t,n,s,r){let o={x:n,y:s},a,l=r;for(let u of i.vertices()){let f={x:u.x,y:u.y,z:u.z},m=Sc(o,e.angularPx(f,t));m<=l&&!tr(i,e,f)&&(l=m,a=u.id)}if(a!==void 0)return{vertex:a};let c,h=r;for(let u of i.edges()){let f=i.graph.pt(u.a),m=i.graph.pt(u.b),x=e.angularPx(f,t),g=e.angularPx(m,t),p=vm(o,x,g);if(p>h)continue;let b=ym(o,x,g),S={x:f.x+b*(m.x-f.x),y:f.y+b*(m.y-f.y),z:f.z+b*(m.z-f.z)};tr(i,e,S)||(h=p,c=u.id)}if(c!==void 0)return{edge:c};let d=nr(i,e,t,n,s);return d!==void 0?{face:d}:{}}function nr(i,e,t,n,s){let r=e.ray(n,s,t),o,a=1/0;for(let l of i.faces()){let c=i.planeOf(l.id);if(!c)continue;let h=qi(r.origin,r.dir,c.plane.n,c.plane.d);if(!h)continue;let d=vn(h,c.basis);if(!dt(d,l.outer.pts)||l.holes.some(f=>dt(d,f.pts)))continue;let u=te(Re(h,r.origin),r.dir);u<a&&(a=u,o=l.id)}return o}function wc(i,e,t,n,s){let r=kn(i,e,t,n,s,.5);if(r.face!==void 0){let o=i.planeOf(r.face);return{plane:o.plane,basis:o.basis,face:r.face}}return Mc}function Ec(i,e,t,n,s,r,o){let a=kn(i,e,t,n,s,.5),l=null;if(a.face!==void 0){let h=i.planeOf(a.face);l={plane:h.plane,basis:h.basis,face:a.face}}let c=Ao(i,e,t,n,s,r,{facePlane:l,alignSources:o,hand:bc});return{fixed:c.fixed?c.plane:null,plane:c.plane,snap:c.snap}}function Qu(i,e,t,n){let s=o=>o.x>=n.minX&&o.x<=n.maxX&&o.y>=n.minY&&o.y<=n.maxY,r={edges:new Set,faces:new Set};for(let o of i.edges())s(e.angularPx(i.graph.pt(o.a),t))&&s(e.angularPx(i.graph.pt(o.b),t))&&r.edges.add(o.id);for(let o of i.faces()){let a=i.faceRings3(o.id);a&&a.outer.every(l=>s(e.angularPx(l,t)))&&r.faces.add(o.id)}return r}function Tc(i,e,t,n){let s=vn(t,e),r=vn(n,e);if(Math.abs(s.x-r.x)<1e-9||Math.abs(s.y-r.y)<1e-9)return[];let o=(d,u)=>Bu({x:d,y:u},i,e),a=o(s.x,s.y),l=o(r.x,s.y),c=o(r.x,r.y),h=o(s.x,r.y);return[[a,l],[l,c],[c,h],[h,a]]}var Mn=()=>({edges:new Set,faces:new Set});function Ac(i,e){if(e.vertex!==void 0)return[e.vertex];if(e.edge!==void 0){let t=i.graph.edge(e.edge);return[t.a,t.b]}if(e.face!==void 0){let t=i.face(e.face);if(!t)return[];let n=new Set;for(let s of[t.outer,...t.holes])for(let r of s.edges){let o=i.graph.edge(r.edge);n.add(o.a),n.add(o.b)}return[...n]}return[]}function Pc(i,e,t){return e.filter(n=>i.graph.hasVertex(n)).map(n=>{let s=i.graph.pt(n);return{id:n,to:{x:s.x+t.x,y:s.y+t.y,z:s.z+(t.z??0)}}})}function ed(i,e){let t=new Set;for(let n of e.edges){if(!i.graph.hasEdge(n))continue;let s=i.graph.edge(n);t.add(s.a),t.add(s.b)}for(let n of e.faces)for(let s of Ac(i,{face:n}))t.add(s);return[...t]}var Wa="185";var Dd=0,uh=1,Fd=2;var Wr=1,Ud=2,Hs=3,li=0,jt=1,rn=2,Zn=0,Qi=1,dh=2,fh=3,ph=4,Nd=5;var Pi=100,Od=101,Bd=102,zd=103,kd=104,Vd=200,Hd=201,Gd=202,Wd=203,ta=204,na=205,Xd=206,qd=207,Yd=208,Zd=209,$d=210,Kd=211,Jd=212,jd=213,Qd=214,ia=0,sa=1,ra=2,es=3,oa=4,aa=5,la=6,ca=7,mh=0,ef=1,tf=2,Dn=0,gh=1,xh=2,yh=3,vh=4,_h=5,bh=6,Sh=7;var Mh=300,Ui=301,os=302,Xa=303,qa=304,Xr=306,ha=1e3,Gn=1001,ua=1002,Ot=1003,nf=1004;var qr=1005;var zt=1006,Ya=1007;var Ni=1008;var mn=1009,wh=1010,Eh=1011,Gs=1012,Za=1013,Fn=1014,Un=1015,$n=1016,$a=1017,Ka=1018,Ws=1020,Th=35902,Ah=35899,Ph=1021,Rh=1022,Sn=1023,Xn=1026,Oi=1027,Ch=1028,Ja=1029,Bi=1030,ja=1031;var Qa=1033,Yr=33776,Zr=33777,$r=33778,Kr=33779,el=35840,tl=35841,nl=35842,il=35843,sl=36196,rl=37492,ol=37496,al=37488,ll=37489,Jr=37490,cl=37491,hl=37808,ul=37809,dl=37810,fl=37811,pl=37812,ml=37813,gl=37814,xl=37815,yl=37816,vl=37817,_l=37818,bl=37819,Sl=37820,Ml=37821,wl=36492,El=36494,Tl=36495,Al=36283,Pl=36284,jr=36285,Rl=36286;var fr=2300,da=2301,ea=2302,th=2303,nh=2400,ih=2401,sh=2402;var sf=3200;var Ih=0,rf=1,hi="",$t="srgb",pr="srgb-linear",mr="linear",Qe="srgb";var Ji=7680;var rh=519,of=512,af=513,lf=514,Cl=515,cf=516,hf=517,Il=518,uf=519,fa=35044;var Lh="300 es",Pn=2e3,gr=2001;function _m(i){for(let e=i.length-1;e>=0;--e)if(i[e]>=65535)return!0;return!1}function bm(i){return ArrayBuffer.isView(i)&&!(i instanceof DataView)}function xr(i){return document.createElementNS("http://www.w3.org/1999/xhtml",i)}function df(){let i=xr("canvas");return i.style.display="block",i}var td={},Ls=null;function yr(...i){let e="THREE."+i.shift();Ls?Ls("log",e,...i):console.log(e,...i)}function ff(i){let e=i[0];if(typeof e=="string"&&e.startsWith("TSL:")){let t=i[1];t&&t.isStackTrace?i[0]+=" "+t.getLocation():i[1]='Stack trace not available. Enable "THREE.Node.captureStackTrace" to capture stack traces.'}return i}function Pe(...i){i=ff(i);let e="THREE."+i.shift();if(Ls)Ls("warn",e,...i);else{let t=i[0];t&&t.isStackTrace?console.warn(t.getError(e)):console.warn(e,...i)}}function Le(...i){i=ff(i);let e="THREE."+i.shift();if(Ls)Ls("error",e,...i);else{let t=i[0];t&&t.isStackTrace?console.error(t.getError(e)):console.error(e,...i)}}function ji(...i){let e=i.join(" ");e in td||(td[e]=!0,Pe(...i))}function pf(i,e,t){return new Promise(function(n,s){function r(){switch(i.clientWaitSync(e,i.SYNC_FLUSH_COMMANDS_BIT,0)){case i.WAIT_FAILED:s();break;case i.TIMEOUT_EXPIRED:setTimeout(r,t);break;default:n()}}setTimeout(r,t)})}var mf={[ia]:sa,[ra]:la,[oa]:ca,[es]:aa,[sa]:ia,[la]:ra,[ca]:oa,[aa]:es},qn=class{addEventListener(e,t){this._listeners===void 0&&(this._listeners={});let n=this._listeners;n[e]===void 0&&(n[e]=[]),n[e].indexOf(t)===-1&&n[e].push(t)}hasEventListener(e,t){let n=this._listeners;return n===void 0?!1:n[e]!==void 0&&n[e].indexOf(t)!==-1}removeEventListener(e,t){let n=this._listeners;if(n===void 0)return;let s=n[e];if(s!==void 0){let r=s.indexOf(t);r!==-1&&s.splice(r,1)}}dispatchEvent(e){let t=this._listeners;if(t===void 0)return;let n=t[e.type];if(n!==void 0){e.target=this;let s=n.slice(0);for(let r=0,o=s.length;r<o;r++)s[r].call(this,e);e.target=null}}},Wt=["00","01","02","03","04","05","06","07","08","09","0a","0b","0c","0d","0e","0f","10","11","12","13","14","15","16","17","18","19","1a","1b","1c","1d","1e","1f","20","21","22","23","24","25","26","27","28","29","2a","2b","2c","2d","2e","2f","30","31","32","33","34","35","36","37","38","39","3a","3b","3c","3d","3e","3f","40","41","42","43","44","45","46","47","48","49","4a","4b","4c","4d","4e","4f","50","51","52","53","54","55","56","57","58","59","5a","5b","5c","5d","5e","5f","60","61","62","63","64","65","66","67","68","69","6a","6b","6c","6d","6e","6f","70","71","72","73","74","75","76","77","78","79","7a","7b","7c","7d","7e","7f","80","81","82","83","84","85","86","87","88","89","8a","8b","8c","8d","8e","8f","90","91","92","93","94","95","96","97","98","99","9a","9b","9c","9d","9e","9f","a0","a1","a2","a3","a4","a5","a6","a7","a8","a9","aa","ab","ac","ad","ae","af","b0","b1","b2","b3","b4","b5","b6","b7","b8","b9","ba","bb","bc","bd","be","bf","c0","c1","c2","c3","c4","c5","c6","c7","c8","c9","ca","cb","cc","cd","ce","cf","d0","d1","d2","d3","d4","d5","d6","d7","d8","d9","da","db","dc","dd","de","df","e0","e1","e2","e3","e4","e5","e6","e7","e8","e9","ea","eb","ec","ed","ee","ef","f0","f1","f2","f3","f4","f5","f6","f7","f8","f9","fa","fb","fc","fd","fe","ff"],nd=1234567,cr=Math.PI/180,Ds=180/Math.PI;function Wn(){let i=Math.random()*4294967295|0,e=Math.random()*4294967295|0,t=Math.random()*4294967295|0,n=Math.random()*4294967295|0;return(Wt[i&255]+Wt[i>>8&255]+Wt[i>>16&255]+Wt[i>>24&255]+"-"+Wt[e&255]+Wt[e>>8&255]+"-"+Wt[e>>16&15|64]+Wt[e>>24&255]+"-"+Wt[t&63|128]+Wt[t>>8&255]+"-"+Wt[t>>16&255]+Wt[t>>24&255]+Wt[n&255]+Wt[n>>8&255]+Wt[n>>16&255]+Wt[n>>24&255]).toLowerCase()}function Oe(i,e,t){return Math.max(e,Math.min(t,i))}function Dh(i,e){return(i%e+e)%e}function Sm(i,e,t,n,s){return n+(i-e)*(s-n)/(t-e)}function Mm(i,e,t){return i!==e?(t-i)/(e-i):0}function hr(i,e,t){return(1-t)*i+t*e}function wm(i,e,t,n){return hr(i,e,1-Math.exp(-t*n))}function Em(i,e=1){return e-Math.abs(Dh(i,e*2)-e)}function Tm(i,e,t){return i<=e?0:i>=t?1:(i=(i-e)/(t-e),i*i*(3-2*i))}function Am(i,e,t){return i<=e?0:i>=t?1:(i=(i-e)/(t-e),i*i*i*(i*(i*6-15)+10))}function Pm(i,e){return i+Math.floor(Math.random()*(e-i+1))}function Rm(i,e){return i+Math.random()*(e-i)}function Cm(i){return i*(.5-Math.random())}function Im(i){i!==void 0&&(nd=i);let e=nd+=1831565813;return e=Math.imul(e^e>>>15,e|1),e^=e+Math.imul(e^e>>>7,e|61),((e^e>>>14)>>>0)/4294967296}function Lm(i){return i*cr}function Dm(i){return i*Ds}function Fm(i){return(i&i-1)===0&&i!==0}function Um(i){return Math.pow(2,Math.ceil(Math.log(i)/Math.LN2))}function Nm(i){return Math.pow(2,Math.floor(Math.log(i)/Math.LN2))}function Om(i,e,t,n,s){let r=Math.cos,o=Math.sin,a=r(t/2),l=o(t/2),c=r((e+n)/2),h=o((e+n)/2),d=r((e-n)/2),u=o((e-n)/2),f=r((n-e)/2),m=o((n-e)/2);switch(s){case"XYX":i.set(a*h,l*d,l*u,a*c);break;case"YZY":i.set(l*u,a*h,l*d,a*c);break;case"ZXZ":i.set(l*d,l*u,a*h,a*c);break;case"XZX":i.set(a*h,l*m,l*f,a*c);break;case"YXY":i.set(l*f,a*h,l*m,a*c);break;case"ZYZ":i.set(l*m,l*f,a*h,a*c);break;default:Pe("MathUtils: .setQuaternionFromProperEuler() encountered an unknown order: "+s)}}function An(i,e){switch(e.constructor){case Float32Array:return i;case Uint32Array:return i/4294967295;case Uint16Array:return i/65535;case Uint8Array:return i/255;case Int32Array:return Math.max(i/2147483647,-1);case Int16Array:return Math.max(i/32767,-1);case Int8Array:return Math.max(i/127,-1);default:throw new Error("THREE.MathUtils: Invalid component type.")}}function tt(i,e){switch(e.constructor){case Float32Array:return i;case Uint32Array:return Math.round(i*4294967295);case Uint16Array:return Math.round(i*65535);case Uint8Array:return Math.round(i*255);case Int32Array:return Math.round(i*2147483647);case Int16Array:return Math.round(i*32767);case Int8Array:return Math.round(i*127);default:throw new Error("THREE.MathUtils: Invalid component type.")}}var Fh={DEG2RAD:cr,RAD2DEG:Ds,generateUUID:Wn,clamp:Oe,euclideanModulo:Dh,mapLinear:Sm,inverseLerp:Mm,lerp:hr,damp:wm,pingpong:Em,smoothstep:Tm,smootherstep:Am,randInt:Pm,randFloat:Rm,randFloatSpread:Cm,seededRandom:Im,degToRad:Lm,radToDeg:Dm,isPowerOfTwo:Fm,ceilPowerOfTwo:Um,floorPowerOfTwo:Nm,setQuaternionFromProperEuler:Om,normalize:tt,denormalize:An},kh=class kh{constructor(e=0,t=0){this.x=e,this.y=t}get width(){return this.x}set width(e){this.x=e}get height(){return this.y}set height(e){this.y=e}set(e,t){return this.x=e,this.y=t,this}setScalar(e){return this.x=e,this.y=e,this}setX(e){return this.x=e,this}setY(e){return this.y=e,this}setComponent(e,t){switch(e){case 0:this.x=t;break;case 1:this.y=t;break;default:throw new Error("THREE.Vector2: index is out of range: "+e)}return this}getComponent(e){switch(e){case 0:return this.x;case 1:return this.y;default:throw new Error("THREE.Vector2: index is out of range: "+e)}}clone(){return new this.constructor(this.x,this.y)}copy(e){return this.x=e.x,this.y=e.y,this}add(e){return this.x+=e.x,this.y+=e.y,this}addScalar(e){return this.x+=e,this.y+=e,this}addVectors(e,t){return this.x=e.x+t.x,this.y=e.y+t.y,this}addScaledVector(e,t){return this.x+=e.x*t,this.y+=e.y*t,this}sub(e){return this.x-=e.x,this.y-=e.y,this}subScalar(e){return this.x-=e,this.y-=e,this}subVectors(e,t){return this.x=e.x-t.x,this.y=e.y-t.y,this}multiply(e){return this.x*=e.x,this.y*=e.y,this}multiplyScalar(e){return this.x*=e,this.y*=e,this}divide(e){return this.x/=e.x,this.y/=e.y,this}divideScalar(e){return this.multiplyScalar(1/e)}applyMatrix3(e){let t=this.x,n=this.y,s=e.elements;return this.x=s[0]*t+s[3]*n+s[6],this.y=s[1]*t+s[4]*n+s[7],this}min(e){return this.x=Math.min(this.x,e.x),this.y=Math.min(this.y,e.y),this}max(e){return this.x=Math.max(this.x,e.x),this.y=Math.max(this.y,e.y),this}clamp(e,t){return this.x=Oe(this.x,e.x,t.x),this.y=Oe(this.y,e.y,t.y),this}clampScalar(e,t){return this.x=Oe(this.x,e,t),this.y=Oe(this.y,e,t),this}clampLength(e,t){let n=this.length();return this.divideScalar(n||1).multiplyScalar(Oe(n,e,t))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this}negate(){return this.x=-this.x,this.y=-this.y,this}dot(e){return this.x*e.x+this.y*e.y}cross(e){return this.x*e.y-this.y*e.x}lengthSq(){return this.x*this.x+this.y*this.y}length(){return Math.sqrt(this.x*this.x+this.y*this.y)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)}normalize(){return this.divideScalar(this.length()||1)}angle(){return Math.atan2(-this.y,-this.x)+Math.PI}angleTo(e){let t=Math.sqrt(this.lengthSq()*e.lengthSq());if(t===0)return Math.PI/2;let n=this.dot(e)/t;return Math.acos(Oe(n,-1,1))}distanceTo(e){return Math.sqrt(this.distanceToSquared(e))}distanceToSquared(e){let t=this.x-e.x,n=this.y-e.y;return t*t+n*n}manhattanDistanceTo(e){return Math.abs(this.x-e.x)+Math.abs(this.y-e.y)}setLength(e){return this.normalize().multiplyScalar(e)}lerp(e,t){return this.x+=(e.x-this.x)*t,this.y+=(e.y-this.y)*t,this}lerpVectors(e,t,n){return this.x=e.x+(t.x-e.x)*n,this.y=e.y+(t.y-e.y)*n,this}equals(e){return e.x===this.x&&e.y===this.y}fromArray(e,t=0){return this.x=e[t],this.y=e[t+1],this}toArray(e=[],t=0){return e[t]=this.x,e[t+1]=this.y,e}fromBufferAttribute(e,t){return this.x=e.getX(t),this.y=e.getY(t),this}rotateAround(e,t){let n=Math.cos(t),s=Math.sin(t),r=this.x-e.x,o=this.y-e.y;return this.x=r*n-o*s+e.x,this.y=r*s+o*n+e.y,this}random(){return this.x=Math.random(),this.y=Math.random(),this}*[Symbol.iterator](){yield this.x,yield this.y}};kh.prototype.isVector2=!0;var xe=kh,Yn=class{constructor(e=0,t=0,n=0,s=1){this.isQuaternion=!0,this._x=e,this._y=t,this._z=n,this._w=s}static slerpFlat(e,t,n,s,r,o,a){let l=n[s+0],c=n[s+1],h=n[s+2],d=n[s+3],u=r[o+0],f=r[o+1],m=r[o+2],x=r[o+3];if(d!==x||l!==u||c!==f||h!==m){let g=l*u+c*f+h*m+d*x;g<0&&(u=-u,f=-f,m=-m,x=-x,g=-g);let p=1-a;if(g<.9995){let b=Math.acos(g),S=Math.sin(b);p=Math.sin(p*b)/S,a=Math.sin(a*b)/S,l=l*p+u*a,c=c*p+f*a,h=h*p+m*a,d=d*p+x*a}else{l=l*p+u*a,c=c*p+f*a,h=h*p+m*a,d=d*p+x*a;let b=1/Math.sqrt(l*l+c*c+h*h+d*d);l*=b,c*=b,h*=b,d*=b}}e[t]=l,e[t+1]=c,e[t+2]=h,e[t+3]=d}static multiplyQuaternionsFlat(e,t,n,s,r,o){let a=n[s],l=n[s+1],c=n[s+2],h=n[s+3],d=r[o],u=r[o+1],f=r[o+2],m=r[o+3];return e[t]=a*m+h*d+l*f-c*u,e[t+1]=l*m+h*u+c*d-a*f,e[t+2]=c*m+h*f+a*u-l*d,e[t+3]=h*m-a*d-l*u-c*f,e}get x(){return this._x}set x(e){this._x=e,this._onChangeCallback()}get y(){return this._y}set y(e){this._y=e,this._onChangeCallback()}get z(){return this._z}set z(e){this._z=e,this._onChangeCallback()}get w(){return this._w}set w(e){this._w=e,this._onChangeCallback()}set(e,t,n,s){return this._x=e,this._y=t,this._z=n,this._w=s,this._onChangeCallback(),this}clone(){return new this.constructor(this._x,this._y,this._z,this._w)}copy(e){return this._x=e.x,this._y=e.y,this._z=e.z,this._w=e.w,this._onChangeCallback(),this}setFromEuler(e,t=!0){let n=e._x,s=e._y,r=e._z,o=e._order,a=Math.cos,l=Math.sin,c=a(n/2),h=a(s/2),d=a(r/2),u=l(n/2),f=l(s/2),m=l(r/2);switch(o){case"XYZ":this._x=u*h*d+c*f*m,this._y=c*f*d-u*h*m,this._z=c*h*m+u*f*d,this._w=c*h*d-u*f*m;break;case"YXZ":this._x=u*h*d+c*f*m,this._y=c*f*d-u*h*m,this._z=c*h*m-u*f*d,this._w=c*h*d+u*f*m;break;case"ZXY":this._x=u*h*d-c*f*m,this._y=c*f*d+u*h*m,this._z=c*h*m+u*f*d,this._w=c*h*d-u*f*m;break;case"ZYX":this._x=u*h*d-c*f*m,this._y=c*f*d+u*h*m,this._z=c*h*m-u*f*d,this._w=c*h*d+u*f*m;break;case"YZX":this._x=u*h*d+c*f*m,this._y=c*f*d+u*h*m,this._z=c*h*m-u*f*d,this._w=c*h*d-u*f*m;break;case"XZY":this._x=u*h*d-c*f*m,this._y=c*f*d-u*h*m,this._z=c*h*m+u*f*d,this._w=c*h*d+u*f*m;break;default:Pe("Quaternion: .setFromEuler() encountered an unknown order: "+o)}return t===!0&&this._onChangeCallback(),this}setFromAxisAngle(e,t){let n=t/2,s=Math.sin(n);return this._x=e.x*s,this._y=e.y*s,this._z=e.z*s,this._w=Math.cos(n),this._onChangeCallback(),this}setFromRotationMatrix(e){let t=e.elements,n=t[0],s=t[4],r=t[8],o=t[1],a=t[5],l=t[9],c=t[2],h=t[6],d=t[10],u=n+a+d;if(u>0){let f=.5/Math.sqrt(u+1);this._w=.25/f,this._x=(h-l)*f,this._y=(r-c)*f,this._z=(o-s)*f}else if(n>a&&n>d){let f=2*Math.sqrt(1+n-a-d);this._w=(h-l)/f,this._x=.25*f,this._y=(s+o)/f,this._z=(r+c)/f}else if(a>d){let f=2*Math.sqrt(1+a-n-d);this._w=(r-c)/f,this._x=(s+o)/f,this._y=.25*f,this._z=(l+h)/f}else{let f=2*Math.sqrt(1+d-n-a);this._w=(o-s)/f,this._x=(r+c)/f,this._y=(l+h)/f,this._z=.25*f}return this._onChangeCallback(),this}setFromUnitVectors(e,t){let n=e.dot(t)+1;return n<1e-8?(n=0,Math.abs(e.x)>Math.abs(e.z)?(this._x=-e.y,this._y=e.x,this._z=0,this._w=n):(this._x=0,this._y=-e.z,this._z=e.y,this._w=n)):(this._x=e.y*t.z-e.z*t.y,this._y=e.z*t.x-e.x*t.z,this._z=e.x*t.y-e.y*t.x,this._w=n),this.normalize()}angleTo(e){return 2*Math.acos(Math.abs(Oe(this.dot(e),-1,1)))}rotateTowards(e,t){let n=this.angleTo(e);if(n===0)return this;let s=Math.min(1,t/n);return this.slerp(e,s),this}identity(){return this.set(0,0,0,1)}invert(){return this.conjugate()}conjugate(){return this._x*=-1,this._y*=-1,this._z*=-1,this._onChangeCallback(),this}dot(e){return this._x*e._x+this._y*e._y+this._z*e._z+this._w*e._w}lengthSq(){return this._x*this._x+this._y*this._y+this._z*this._z+this._w*this._w}length(){return Math.sqrt(this._x*this._x+this._y*this._y+this._z*this._z+this._w*this._w)}normalize(){let e=this.length();return e===0?(this._x=0,this._y=0,this._z=0,this._w=1):(e=1/e,this._x=this._x*e,this._y=this._y*e,this._z=this._z*e,this._w=this._w*e),this._onChangeCallback(),this}multiply(e){return this.multiplyQuaternions(this,e)}premultiply(e){return this.multiplyQuaternions(e,this)}multiplyQuaternions(e,t){let n=e._x,s=e._y,r=e._z,o=e._w,a=t._x,l=t._y,c=t._z,h=t._w;return this._x=n*h+o*a+s*c-r*l,this._y=s*h+o*l+r*a-n*c,this._z=r*h+o*c+n*l-s*a,this._w=o*h-n*a-s*l-r*c,this._onChangeCallback(),this}slerp(e,t){let n=e._x,s=e._y,r=e._z,o=e._w,a=this.dot(e);a<0&&(n=-n,s=-s,r=-r,o=-o,a=-a);let l=1-t;if(a<.9995){let c=Math.acos(a),h=Math.sin(c);l=Math.sin(l*c)/h,t=Math.sin(t*c)/h,this._x=this._x*l+n*t,this._y=this._y*l+s*t,this._z=this._z*l+r*t,this._w=this._w*l+o*t,this._onChangeCallback()}else this._x=this._x*l+n*t,this._y=this._y*l+s*t,this._z=this._z*l+r*t,this._w=this._w*l+o*t,this.normalize();return this}slerpQuaternions(e,t,n){return this.copy(e).slerp(t,n)}random(){let e=2*Math.PI*Math.random(),t=2*Math.PI*Math.random(),n=Math.random(),s=Math.sqrt(1-n),r=Math.sqrt(n);return this.set(s*Math.sin(e),s*Math.cos(e),r*Math.sin(t),r*Math.cos(t))}equals(e){return e._x===this._x&&e._y===this._y&&e._z===this._z&&e._w===this._w}fromArray(e,t=0){return this._x=e[t],this._y=e[t+1],this._z=e[t+2],this._w=e[t+3],this._onChangeCallback(),this}toArray(e=[],t=0){return e[t]=this._x,e[t+1]=this._y,e[t+2]=this._z,e[t+3]=this._w,e}fromBufferAttribute(e,t){return this._x=e.getX(t),this._y=e.getY(t),this._z=e.getZ(t),this._w=e.getW(t),this._onChangeCallback(),this}toJSON(){return this.toArray()}_onChange(e){return this._onChangeCallback=e,this}_onChangeCallback(){}*[Symbol.iterator](){yield this._x,yield this._y,yield this._z,yield this._w}},Vh=class Vh{constructor(e=0,t=0,n=0){this.x=e,this.y=t,this.z=n}set(e,t,n){return n===void 0&&(n=this.z),this.x=e,this.y=t,this.z=n,this}setScalar(e){return this.x=e,this.y=e,this.z=e,this}setX(e){return this.x=e,this}setY(e){return this.y=e,this}setZ(e){return this.z=e,this}setComponent(e,t){switch(e){case 0:this.x=t;break;case 1:this.y=t;break;case 2:this.z=t;break;default:throw new Error("THREE.Vector3: index is out of range: "+e)}return this}getComponent(e){switch(e){case 0:return this.x;case 1:return this.y;case 2:return this.z;default:throw new Error("THREE.Vector3: index is out of range: "+e)}}clone(){return new this.constructor(this.x,this.y,this.z)}copy(e){return this.x=e.x,this.y=e.y,this.z=e.z,this}add(e){return this.x+=e.x,this.y+=e.y,this.z+=e.z,this}addScalar(e){return this.x+=e,this.y+=e,this.z+=e,this}addVectors(e,t){return this.x=e.x+t.x,this.y=e.y+t.y,this.z=e.z+t.z,this}addScaledVector(e,t){return this.x+=e.x*t,this.y+=e.y*t,this.z+=e.z*t,this}sub(e){return this.x-=e.x,this.y-=e.y,this.z-=e.z,this}subScalar(e){return this.x-=e,this.y-=e,this.z-=e,this}subVectors(e,t){return this.x=e.x-t.x,this.y=e.y-t.y,this.z=e.z-t.z,this}multiply(e){return this.x*=e.x,this.y*=e.y,this.z*=e.z,this}multiplyScalar(e){return this.x*=e,this.y*=e,this.z*=e,this}multiplyVectors(e,t){return this.x=e.x*t.x,this.y=e.y*t.y,this.z=e.z*t.z,this}applyEuler(e){return this.applyQuaternion(id.setFromEuler(e))}applyAxisAngle(e,t){return this.applyQuaternion(id.setFromAxisAngle(e,t))}applyMatrix3(e){let t=this.x,n=this.y,s=this.z,r=e.elements;return this.x=r[0]*t+r[3]*n+r[6]*s,this.y=r[1]*t+r[4]*n+r[7]*s,this.z=r[2]*t+r[5]*n+r[8]*s,this}applyNormalMatrix(e){return this.applyMatrix3(e).normalize()}applyMatrix4(e){let t=this.x,n=this.y,s=this.z,r=e.elements,o=1/(r[3]*t+r[7]*n+r[11]*s+r[15]);return this.x=(r[0]*t+r[4]*n+r[8]*s+r[12])*o,this.y=(r[1]*t+r[5]*n+r[9]*s+r[13])*o,this.z=(r[2]*t+r[6]*n+r[10]*s+r[14])*o,this}applyQuaternion(e){let t=this.x,n=this.y,s=this.z,r=e.x,o=e.y,a=e.z,l=e.w,c=2*(o*s-a*n),h=2*(a*t-r*s),d=2*(r*n-o*t);return this.x=t+l*c+o*d-a*h,this.y=n+l*h+a*c-r*d,this.z=s+l*d+r*h-o*c,this}project(e){return this.applyMatrix4(e.matrixWorldInverse).applyMatrix4(e.projectionMatrix)}unproject(e){return this.applyMatrix4(e.projectionMatrixInverse).applyMatrix4(e.matrixWorld)}transformDirection(e){let t=this.x,n=this.y,s=this.z,r=e.elements;return this.x=r[0]*t+r[4]*n+r[8]*s,this.y=r[1]*t+r[5]*n+r[9]*s,this.z=r[2]*t+r[6]*n+r[10]*s,this.normalize()}divide(e){return this.x/=e.x,this.y/=e.y,this.z/=e.z,this}divideScalar(e){return this.multiplyScalar(1/e)}min(e){return this.x=Math.min(this.x,e.x),this.y=Math.min(this.y,e.y),this.z=Math.min(this.z,e.z),this}max(e){return this.x=Math.max(this.x,e.x),this.y=Math.max(this.y,e.y),this.z=Math.max(this.z,e.z),this}clamp(e,t){return this.x=Oe(this.x,e.x,t.x),this.y=Oe(this.y,e.y,t.y),this.z=Oe(this.z,e.z,t.z),this}clampScalar(e,t){return this.x=Oe(this.x,e,t),this.y=Oe(this.y,e,t),this.z=Oe(this.z,e,t),this}clampLength(e,t){let n=this.length();return this.divideScalar(n||1).multiplyScalar(Oe(n,e,t))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this.z=Math.floor(this.z),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this.z=Math.ceil(this.z),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this.z=Math.round(this.z),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this.z=Math.trunc(this.z),this}negate(){return this.x=-this.x,this.y=-this.y,this.z=-this.z,this}dot(e){return this.x*e.x+this.y*e.y+this.z*e.z}lengthSq(){return this.x*this.x+this.y*this.y+this.z*this.z}length(){return Math.sqrt(this.x*this.x+this.y*this.y+this.z*this.z)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)+Math.abs(this.z)}normalize(){return this.divideScalar(this.length()||1)}setLength(e){return this.normalize().multiplyScalar(e)}lerp(e,t){return this.x+=(e.x-this.x)*t,this.y+=(e.y-this.y)*t,this.z+=(e.z-this.z)*t,this}lerpVectors(e,t,n){return this.x=e.x+(t.x-e.x)*n,this.y=e.y+(t.y-e.y)*n,this.z=e.z+(t.z-e.z)*n,this}cross(e){return this.crossVectors(this,e)}crossVectors(e,t){let n=e.x,s=e.y,r=e.z,o=t.x,a=t.y,l=t.z;return this.x=s*l-r*a,this.y=r*o-n*l,this.z=n*a-s*o,this}projectOnVector(e){let t=e.lengthSq();if(t===0)return this.set(0,0,0);let n=e.dot(this)/t;return this.copy(e).multiplyScalar(n)}projectOnPlane(e){return Rc.copy(this).projectOnVector(e),this.sub(Rc)}reflect(e){return this.sub(Rc.copy(e).multiplyScalar(2*this.dot(e)))}angleTo(e){let t=Math.sqrt(this.lengthSq()*e.lengthSq());if(t===0)return Math.PI/2;let n=this.dot(e)/t;return Math.acos(Oe(n,-1,1))}distanceTo(e){return Math.sqrt(this.distanceToSquared(e))}distanceToSquared(e){let t=this.x-e.x,n=this.y-e.y,s=this.z-e.z;return t*t+n*n+s*s}manhattanDistanceTo(e){return Math.abs(this.x-e.x)+Math.abs(this.y-e.y)+Math.abs(this.z-e.z)}setFromSpherical(e){return this.setFromSphericalCoords(e.radius,e.phi,e.theta)}setFromSphericalCoords(e,t,n){let s=Math.sin(t)*e;return this.x=s*Math.sin(n),this.y=Math.cos(t)*e,this.z=s*Math.cos(n),this}setFromCylindrical(e){return this.setFromCylindricalCoords(e.radius,e.theta,e.y)}setFromCylindricalCoords(e,t,n){return this.x=e*Math.sin(t),this.y=n,this.z=e*Math.cos(t),this}setFromMatrixPosition(e){let t=e.elements;return this.x=t[12],this.y=t[13],this.z=t[14],this}setFromMatrixScale(e){let t=this.setFromMatrixColumn(e,0).length(),n=this.setFromMatrixColumn(e,1).length(),s=this.setFromMatrixColumn(e,2).length();return this.x=t,this.y=n,this.z=s,this}setFromMatrixColumn(e,t){return this.fromArray(e.elements,t*4)}setFromMatrix3Column(e,t){return this.fromArray(e.elements,t*3)}setFromEuler(e){return this.x=e._x,this.y=e._y,this.z=e._z,this}setFromColor(e){return this.x=e.r,this.y=e.g,this.z=e.b,this}equals(e){return e.x===this.x&&e.y===this.y&&e.z===this.z}fromArray(e,t=0){return this.x=e[t],this.y=e[t+1],this.z=e[t+2],this}toArray(e=[],t=0){return e[t]=this.x,e[t+1]=this.y,e[t+2]=this.z,e}fromBufferAttribute(e,t){return this.x=e.getX(t),this.y=e.getY(t),this.z=e.getZ(t),this}random(){return this.x=Math.random(),this.y=Math.random(),this.z=Math.random(),this}randomDirection(){let e=Math.random()*Math.PI*2,t=Math.random()*2-1,n=Math.sqrt(1-t*t);return this.x=n*Math.cos(e),this.y=t,this.z=n*Math.sin(e),this}*[Symbol.iterator](){yield this.x,yield this.y,yield this.z}};Vh.prototype.isVector3=!0;var L=Vh,Rc=new L,id=new Yn,Hh=class Hh{constructor(e,t,n,s,r,o,a,l,c){this.elements=[1,0,0,0,1,0,0,0,1],e!==void 0&&this.set(e,t,n,s,r,o,a,l,c)}set(e,t,n,s,r,o,a,l,c){let h=this.elements;return h[0]=e,h[1]=s,h[2]=a,h[3]=t,h[4]=r,h[5]=l,h[6]=n,h[7]=o,h[8]=c,this}identity(){return this.set(1,0,0,0,1,0,0,0,1),this}copy(e){let t=this.elements,n=e.elements;return t[0]=n[0],t[1]=n[1],t[2]=n[2],t[3]=n[3],t[4]=n[4],t[5]=n[5],t[6]=n[6],t[7]=n[7],t[8]=n[8],this}extractBasis(e,t,n){return e.setFromMatrix3Column(this,0),t.setFromMatrix3Column(this,1),n.setFromMatrix3Column(this,2),this}setFromMatrix4(e){let t=e.elements;return this.set(t[0],t[4],t[8],t[1],t[5],t[9],t[2],t[6],t[10]),this}multiply(e){return this.multiplyMatrices(this,e)}premultiply(e){return this.multiplyMatrices(e,this)}multiplyMatrices(e,t){let n=e.elements,s=t.elements,r=this.elements,o=n[0],a=n[3],l=n[6],c=n[1],h=n[4],d=n[7],u=n[2],f=n[5],m=n[8],x=s[0],g=s[3],p=s[6],b=s[1],S=s[4],_=s[7],A=s[2],w=s[5],E=s[8];return r[0]=o*x+a*b+l*A,r[3]=o*g+a*S+l*w,r[6]=o*p+a*_+l*E,r[1]=c*x+h*b+d*A,r[4]=c*g+h*S+d*w,r[7]=c*p+h*_+d*E,r[2]=u*x+f*b+m*A,r[5]=u*g+f*S+m*w,r[8]=u*p+f*_+m*E,this}multiplyScalar(e){let t=this.elements;return t[0]*=e,t[3]*=e,t[6]*=e,t[1]*=e,t[4]*=e,t[7]*=e,t[2]*=e,t[5]*=e,t[8]*=e,this}determinant(){let e=this.elements,t=e[0],n=e[1],s=e[2],r=e[3],o=e[4],a=e[5],l=e[6],c=e[7],h=e[8];return t*o*h-t*a*c-n*r*h+n*a*l+s*r*c-s*o*l}invert(){let e=this.elements,t=e[0],n=e[1],s=e[2],r=e[3],o=e[4],a=e[5],l=e[6],c=e[7],h=e[8],d=h*o-a*c,u=a*l-h*r,f=c*r-o*l,m=t*d+n*u+s*f;if(m===0)return this.set(0,0,0,0,0,0,0,0,0);let x=1/m;return e[0]=d*x,e[1]=(s*c-h*n)*x,e[2]=(a*n-s*o)*x,e[3]=u*x,e[4]=(h*t-s*l)*x,e[5]=(s*r-a*t)*x,e[6]=f*x,e[7]=(n*l-c*t)*x,e[8]=(o*t-n*r)*x,this}transpose(){let e,t=this.elements;return e=t[1],t[1]=t[3],t[3]=e,e=t[2],t[2]=t[6],t[6]=e,e=t[5],t[5]=t[7],t[7]=e,this}getNormalMatrix(e){return this.setFromMatrix4(e).invert().transpose()}transposeIntoArray(e){let t=this.elements;return e[0]=t[0],e[1]=t[3],e[2]=t[6],e[3]=t[1],e[4]=t[4],e[5]=t[7],e[6]=t[2],e[7]=t[5],e[8]=t[8],this}setUvTransform(e,t,n,s,r,o,a){let l=Math.cos(r),c=Math.sin(r);return this.set(n*l,n*c,-n*(l*o+c*a)+o+e,-s*c,s*l,-s*(-c*o+l*a)+a+t,0,0,1),this}scale(e,t){return ji("Matrix3: .scale() is deprecated. Use .makeScale() instead."),this.premultiply(Cc.makeScale(e,t)),this}rotate(e){return ji("Matrix3: .rotate() is deprecated. Use .makeRotation() instead."),this.premultiply(Cc.makeRotation(-e)),this}translate(e,t){return ji("Matrix3: .translate() is deprecated. Use .makeTranslation() instead."),this.premultiply(Cc.makeTranslation(e,t)),this}makeTranslation(e,t){return e.isVector2?this.set(1,0,e.x,0,1,e.y,0,0,1):this.set(1,0,e,0,1,t,0,0,1),this}makeRotation(e){let t=Math.cos(e),n=Math.sin(e);return this.set(t,-n,0,n,t,0,0,0,1),this}makeScale(e,t){return this.set(e,0,0,0,t,0,0,0,1),this}equals(e){let t=this.elements,n=e.elements;for(let s=0;s<9;s++)if(t[s]!==n[s])return!1;return!0}fromArray(e,t=0){for(let n=0;n<9;n++)this.elements[n]=e[n+t];return this}toArray(e=[],t=0){let n=this.elements;return e[t]=n[0],e[t+1]=n[1],e[t+2]=n[2],e[t+3]=n[3],e[t+4]=n[4],e[t+5]=n[5],e[t+6]=n[6],e[t+7]=n[7],e[t+8]=n[8],e}clone(){return new this.constructor().fromArray(this.elements)}};Hh.prototype.isMatrix3=!0;var Ne=Hh,Cc=new Ne,sd=new Ne().set(.4123908,.3575843,.1804808,.212639,.7151687,.0721923,.0193308,.1191948,.9505322),rd=new Ne().set(3.2409699,-1.5373832,-.4986108,-.9692436,1.8759675,.0415551,.0556301,-.203977,1.0569715);function Bm(){let i={enabled:!0,workingColorSpace:pr,spaces:{},convert:function(s,r,o){return this.enabled===!1||r===o||!r||!o||(this.spaces[r].transfer===Qe&&(s.r=ai(s.r),s.g=ai(s.g),s.b=ai(s.b)),this.spaces[r].primaries!==this.spaces[o].primaries&&(s.applyMatrix3(this.spaces[r].toXYZ),s.applyMatrix3(this.spaces[o].fromXYZ)),this.spaces[o].transfer===Qe&&(s.r=Is(s.r),s.g=Is(s.g),s.b=Is(s.b))),s},workingToColorSpace:function(s,r){return this.convert(s,this.workingColorSpace,r)},colorSpaceToWorking:function(s,r){return this.convert(s,r,this.workingColorSpace)},getPrimaries:function(s){return this.spaces[s].primaries},getTransfer:function(s){return s===hi?mr:this.spaces[s].transfer},getToneMappingMode:function(s){return this.spaces[s].outputColorSpaceConfig.toneMappingMode||"standard"},getLuminanceCoefficients:function(s,r=this.workingColorSpace){return s.fromArray(this.spaces[r].luminanceCoefficients)},define:function(s){Object.assign(this.spaces,s)},_getMatrix:function(s,r,o){return s.copy(this.spaces[r].toXYZ).multiply(this.spaces[o].fromXYZ)},_getDrawingBufferColorSpace:function(s){return this.spaces[s].outputColorSpaceConfig.drawingBufferColorSpace},_getUnpackColorSpace:function(s=this.workingColorSpace){return this.spaces[s].workingColorSpaceConfig.unpackColorSpace},fromWorkingColorSpace:function(s,r){return ji("ColorManagement: .fromWorkingColorSpace() has been renamed to .workingToColorSpace()."),i.workingToColorSpace(s,r)},toWorkingColorSpace:function(s,r){return ji("ColorManagement: .toWorkingColorSpace() has been renamed to .colorSpaceToWorking()."),i.colorSpaceToWorking(s,r)}},e=[.64,.33,.3,.6,.15,.06],t=[.2126,.7152,.0722],n=[.3127,.329];return i.define({[pr]:{primaries:e,whitePoint:n,transfer:mr,toXYZ:sd,fromXYZ:rd,luminanceCoefficients:t,workingColorSpaceConfig:{unpackColorSpace:$t},outputColorSpaceConfig:{drawingBufferColorSpace:$t}},[$t]:{primaries:e,whitePoint:n,transfer:Qe,toXYZ:sd,fromXYZ:rd,luminanceCoefficients:t,outputColorSpaceConfig:{drawingBufferColorSpace:$t}}}),i}var Xe=Bm();function ai(i){return i<.04045?i*.0773993808:Math.pow(i*.9478672986+.0521327014,2.4)}function Is(i){return i<.0031308?i*12.92:1.055*Math.pow(i,.41666)-.055}var xs,pa=class{static getDataURL(e,t="image/png"){if(/^data:/i.test(e.src)||typeof HTMLCanvasElement>"u")return e.src;let n;if(e instanceof HTMLCanvasElement)n=e;else{xs===void 0&&(xs=xr("canvas")),xs.width=e.width,xs.height=e.height;let s=xs.getContext("2d");e instanceof ImageData?s.putImageData(e,0,0):s.drawImage(e,0,0,e.width,e.height),n=xs}return n.toDataURL(t)}static sRGBToLinear(e){if(typeof HTMLImageElement<"u"&&e instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&e instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&e instanceof ImageBitmap){let t=xr("canvas");t.width=e.width,t.height=e.height;let n=t.getContext("2d");n.drawImage(e,0,0,e.width,e.height);let s=n.getImageData(0,0,e.width,e.height),r=s.data;for(let o=0;o<r.length;o++)r[o]=ai(r[o]/255)*255;return n.putImageData(s,0,0),t}else if(e.data){let t=e.data.slice(0);for(let n=0;n<t.length;n++)t instanceof Uint8Array||t instanceof Uint8ClampedArray?t[n]=Math.floor(ai(t[n]/255)*255):t[n]=ai(t[n]);return{data:t,width:e.width,height:e.height}}else return Pe("ImageUtils.sRGBToLinear(): Unsupported image type. No color space conversion applied."),e}},zm=0,Fs=class{constructor(e=null){this.isSource=!0,Object.defineProperty(this,"id",{value:zm++}),this.uuid=Wn(),this.data=e,this.dataReady=!0,this.version=0}getSize(e){let t=this.data;return typeof HTMLVideoElement<"u"&&t instanceof HTMLVideoElement?e.set(t.videoWidth,t.videoHeight,0):typeof VideoFrame<"u"&&t instanceof VideoFrame?e.set(t.displayWidth,t.displayHeight,0):t!==null?e.set(t.width,t.height,t.depth||0):e.set(0,0,0),e}set needsUpdate(e){e===!0&&this.version++}toJSON(e){let t=e===void 0||typeof e=="string";if(!t&&e.images[this.uuid]!==void 0)return e.images[this.uuid];let n={uuid:this.uuid,url:""},s=this.data;if(s!==null){let r;if(Array.isArray(s)){r=[];for(let o=0,a=s.length;o<a;o++)s[o].isDataTexture?r.push(Ic(s[o].image)):r.push(Ic(s[o]))}else r=Ic(s);n.url=r}return t||(e.images[this.uuid]=n),n}};function Ic(i){return typeof HTMLImageElement<"u"&&i instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&i instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&i instanceof ImageBitmap?pa.getDataURL(i):i.data?{data:Array.from(i.data),width:i.width,height:i.height,type:i.data.constructor.name}:(Pe("Texture: Unable to serialize Texture."),{})}var km=0,Lc=new L,Kt=class i extends qn{constructor(e=i.DEFAULT_IMAGE,t=i.DEFAULT_MAPPING,n=Gn,s=Gn,r=zt,o=Ni,a=Sn,l=mn,c=i.DEFAULT_ANISOTROPY,h=hi){super(),this.isTexture=!0,Object.defineProperty(this,"id",{value:km++}),this.uuid=Wn(),this.name="",this.source=new Fs(e),this.mipmaps=[],this.mapping=t,this.channel=0,this.wrapS=n,this.wrapT=s,this.magFilter=r,this.minFilter=o,this.anisotropy=c,this.format=a,this.internalFormat=null,this.type=l,this.offset=new xe(0,0),this.repeat=new xe(1,1),this.center=new xe(0,0),this.rotation=0,this.matrixAutoUpdate=!0,this.matrix=new Ne,this.generateMipmaps=!0,this.premultiplyAlpha=!1,this.flipY=!0,this.unpackAlignment=4,this.colorSpace=h,this.userData={},this.updateRanges=[],this.version=0,this.onUpdate=null,this.renderTarget=null,this.isRenderTargetTexture=!1,this.isArrayTexture=!!(e&&e.depth&&e.depth>1),this.pmremVersion=0,this.normalized=!1}get width(){return this.source.getSize(Lc).x}get height(){return this.source.getSize(Lc).y}get depth(){return this.source.getSize(Lc).z}get image(){return this.source.data}set image(e){this.source.data=e}updateMatrix(){this.matrix.setUvTransform(this.offset.x,this.offset.y,this.repeat.x,this.repeat.y,this.rotation,this.center.x,this.center.y)}addUpdateRange(e,t){this.updateRanges.push({start:e,count:t})}clearUpdateRanges(){this.updateRanges.length=0}clone(){return new this.constructor().copy(this)}copy(e){return this.name=e.name,this.source=e.source,this.mipmaps=e.mipmaps.slice(0),this.mapping=e.mapping,this.channel=e.channel,this.wrapS=e.wrapS,this.wrapT=e.wrapT,this.magFilter=e.magFilter,this.minFilter=e.minFilter,this.anisotropy=e.anisotropy,this.format=e.format,this.internalFormat=e.internalFormat,this.type=e.type,this.normalized=e.normalized,this.offset.copy(e.offset),this.repeat.copy(e.repeat),this.center.copy(e.center),this.rotation=e.rotation,this.matrixAutoUpdate=e.matrixAutoUpdate,this.matrix.copy(e.matrix),this.generateMipmaps=e.generateMipmaps,this.premultiplyAlpha=e.premultiplyAlpha,this.flipY=e.flipY,this.unpackAlignment=e.unpackAlignment,this.colorSpace=e.colorSpace,this.renderTarget=e.renderTarget,this.isRenderTargetTexture=e.isRenderTargetTexture,this.isArrayTexture=e.isArrayTexture,this.userData=JSON.parse(JSON.stringify(e.userData)),this.needsUpdate=!0,this}setValues(e){for(let t in e){let n=e[t];if(n===void 0){Pe(`Texture.setValues(): parameter '${t}' has value of undefined.`);continue}let s=this[t];if(s===void 0){Pe(`Texture.setValues(): property '${t}' does not exist.`);continue}s&&n&&s.isVector2&&n.isVector2||s&&n&&s.isVector3&&n.isVector3||s&&n&&s.isMatrix3&&n.isMatrix3?s.copy(n):this[t]=n}}toJSON(e){let t=e===void 0||typeof e=="string";if(!t&&e.textures[this.uuid]!==void 0)return e.textures[this.uuid];let n={metadata:{version:4.7,type:"Texture",generator:"Texture.toJSON"},uuid:this.uuid,name:this.name,image:this.source.toJSON(e).uuid,mapping:this.mapping,channel:this.channel,repeat:[this.repeat.x,this.repeat.y],offset:[this.offset.x,this.offset.y],center:[this.center.x,this.center.y],rotation:this.rotation,wrap:[this.wrapS,this.wrapT],format:this.format,internalFormat:this.internalFormat,type:this.type,normalized:this.normalized,colorSpace:this.colorSpace,minFilter:this.minFilter,magFilter:this.magFilter,anisotropy:this.anisotropy,flipY:this.flipY,generateMipmaps:this.generateMipmaps,premultiplyAlpha:this.premultiplyAlpha,unpackAlignment:this.unpackAlignment};return Object.keys(this.userData).length>0&&(n.userData=this.userData),t||(e.textures[this.uuid]=n),n}dispose(){this.dispatchEvent({type:"dispose"})}transformUv(e){if(this.mapping!==Mh)return e;if(e.applyMatrix3(this.matrix),e.x<0||e.x>1)switch(this.wrapS){case ha:e.x=e.x-Math.floor(e.x);break;case Gn:e.x=e.x<0?0:1;break;case ua:Math.abs(Math.floor(e.x)%2)===1?e.x=Math.ceil(e.x)-e.x:e.x=e.x-Math.floor(e.x);break}if(e.y<0||e.y>1)switch(this.wrapT){case ha:e.y=e.y-Math.floor(e.y);break;case Gn:e.y=e.y<0?0:1;break;case ua:Math.abs(Math.floor(e.y)%2)===1?e.y=Math.ceil(e.y)-e.y:e.y=e.y-Math.floor(e.y);break}return this.flipY&&(e.y=1-e.y),e}set needsUpdate(e){e===!0&&(this.version++,this.source.needsUpdate=!0)}set needsPMREMUpdate(e){e===!0&&this.pmremVersion++}};Kt.DEFAULT_IMAGE=null;Kt.DEFAULT_MAPPING=Mh;Kt.DEFAULT_ANISOTROPY=1;var Gh=class Gh{constructor(e=0,t=0,n=0,s=1){this.x=e,this.y=t,this.z=n,this.w=s}get width(){return this.z}set width(e){this.z=e}get height(){return this.w}set height(e){this.w=e}set(e,t,n,s){return this.x=e,this.y=t,this.z=n,this.w=s,this}setScalar(e){return this.x=e,this.y=e,this.z=e,this.w=e,this}setX(e){return this.x=e,this}setY(e){return this.y=e,this}setZ(e){return this.z=e,this}setW(e){return this.w=e,this}setComponent(e,t){switch(e){case 0:this.x=t;break;case 1:this.y=t;break;case 2:this.z=t;break;case 3:this.w=t;break;default:throw new Error("THREE.Vector4: index is out of range: "+e)}return this}getComponent(e){switch(e){case 0:return this.x;case 1:return this.y;case 2:return this.z;case 3:return this.w;default:throw new Error("THREE.Vector4: index is out of range: "+e)}}clone(){return new this.constructor(this.x,this.y,this.z,this.w)}copy(e){return this.x=e.x,this.y=e.y,this.z=e.z,this.w=e.w!==void 0?e.w:1,this}add(e){return this.x+=e.x,this.y+=e.y,this.z+=e.z,this.w+=e.w,this}addScalar(e){return this.x+=e,this.y+=e,this.z+=e,this.w+=e,this}addVectors(e,t){return this.x=e.x+t.x,this.y=e.y+t.y,this.z=e.z+t.z,this.w=e.w+t.w,this}addScaledVector(e,t){return this.x+=e.x*t,this.y+=e.y*t,this.z+=e.z*t,this.w+=e.w*t,this}sub(e){return this.x-=e.x,this.y-=e.y,this.z-=e.z,this.w-=e.w,this}subScalar(e){return this.x-=e,this.y-=e,this.z-=e,this.w-=e,this}subVectors(e,t){return this.x=e.x-t.x,this.y=e.y-t.y,this.z=e.z-t.z,this.w=e.w-t.w,this}multiply(e){return this.x*=e.x,this.y*=e.y,this.z*=e.z,this.w*=e.w,this}multiplyScalar(e){return this.x*=e,this.y*=e,this.z*=e,this.w*=e,this}applyMatrix4(e){let t=this.x,n=this.y,s=this.z,r=this.w,o=e.elements;return this.x=o[0]*t+o[4]*n+o[8]*s+o[12]*r,this.y=o[1]*t+o[5]*n+o[9]*s+o[13]*r,this.z=o[2]*t+o[6]*n+o[10]*s+o[14]*r,this.w=o[3]*t+o[7]*n+o[11]*s+o[15]*r,this}divide(e){return this.x/=e.x,this.y/=e.y,this.z/=e.z,this.w/=e.w,this}divideScalar(e){return this.multiplyScalar(1/e)}setAxisAngleFromQuaternion(e){this.w=2*Math.acos(e.w);let t=Math.sqrt(1-e.w*e.w);return t<1e-4?(this.x=1,this.y=0,this.z=0):(this.x=e.x/t,this.y=e.y/t,this.z=e.z/t),this}setAxisAngleFromRotationMatrix(e){let t,n,s,r,l=e.elements,c=l[0],h=l[4],d=l[8],u=l[1],f=l[5],m=l[9],x=l[2],g=l[6],p=l[10];if(Math.abs(h-u)<.01&&Math.abs(d-x)<.01&&Math.abs(m-g)<.01){if(Math.abs(h+u)<.1&&Math.abs(d+x)<.1&&Math.abs(m+g)<.1&&Math.abs(c+f+p-3)<.1)return this.set(1,0,0,0),this;t=Math.PI;let S=(c+1)/2,_=(f+1)/2,A=(p+1)/2,w=(h+u)/4,E=(d+x)/4,y=(m+g)/4;return S>_&&S>A?S<.01?(n=0,s=.707106781,r=.707106781):(n=Math.sqrt(S),s=w/n,r=E/n):_>A?_<.01?(n=.707106781,s=0,r=.707106781):(s=Math.sqrt(_),n=w/s,r=y/s):A<.01?(n=.707106781,s=.707106781,r=0):(r=Math.sqrt(A),n=E/r,s=y/r),this.set(n,s,r,t),this}let b=Math.sqrt((g-m)*(g-m)+(d-x)*(d-x)+(u-h)*(u-h));return Math.abs(b)<.001&&(b=1),this.x=(g-m)/b,this.y=(d-x)/b,this.z=(u-h)/b,this.w=Math.acos((c+f+p-1)/2),this}setFromMatrixPosition(e){let t=e.elements;return this.x=t[12],this.y=t[13],this.z=t[14],this.w=t[15],this}min(e){return this.x=Math.min(this.x,e.x),this.y=Math.min(this.y,e.y),this.z=Math.min(this.z,e.z),this.w=Math.min(this.w,e.w),this}max(e){return this.x=Math.max(this.x,e.x),this.y=Math.max(this.y,e.y),this.z=Math.max(this.z,e.z),this.w=Math.max(this.w,e.w),this}clamp(e,t){return this.x=Oe(this.x,e.x,t.x),this.y=Oe(this.y,e.y,t.y),this.z=Oe(this.z,e.z,t.z),this.w=Oe(this.w,e.w,t.w),this}clampScalar(e,t){return this.x=Oe(this.x,e,t),this.y=Oe(this.y,e,t),this.z=Oe(this.z,e,t),this.w=Oe(this.w,e,t),this}clampLength(e,t){let n=this.length();return this.divideScalar(n||1).multiplyScalar(Oe(n,e,t))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this.z=Math.floor(this.z),this.w=Math.floor(this.w),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this.z=Math.ceil(this.z),this.w=Math.ceil(this.w),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this.z=Math.round(this.z),this.w=Math.round(this.w),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this.z=Math.trunc(this.z),this.w=Math.trunc(this.w),this}negate(){return this.x=-this.x,this.y=-this.y,this.z=-this.z,this.w=-this.w,this}dot(e){return this.x*e.x+this.y*e.y+this.z*e.z+this.w*e.w}lengthSq(){return this.x*this.x+this.y*this.y+this.z*this.z+this.w*this.w}length(){return Math.sqrt(this.x*this.x+this.y*this.y+this.z*this.z+this.w*this.w)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)+Math.abs(this.z)+Math.abs(this.w)}normalize(){return this.divideScalar(this.length()||1)}setLength(e){return this.normalize().multiplyScalar(e)}lerp(e,t){return this.x+=(e.x-this.x)*t,this.y+=(e.y-this.y)*t,this.z+=(e.z-this.z)*t,this.w+=(e.w-this.w)*t,this}lerpVectors(e,t,n){return this.x=e.x+(t.x-e.x)*n,this.y=e.y+(t.y-e.y)*n,this.z=e.z+(t.z-e.z)*n,this.w=e.w+(t.w-e.w)*n,this}equals(e){return e.x===this.x&&e.y===this.y&&e.z===this.z&&e.w===this.w}fromArray(e,t=0){return this.x=e[t],this.y=e[t+1],this.z=e[t+2],this.w=e[t+3],this}toArray(e=[],t=0){return e[t]=this.x,e[t+1]=this.y,e[t+2]=this.z,e[t+3]=this.w,e}fromBufferAttribute(e,t){return this.x=e.getX(t),this.y=e.getY(t),this.z=e.getZ(t),this.w=e.getW(t),this}random(){return this.x=Math.random(),this.y=Math.random(),this.z=Math.random(),this.w=Math.random(),this}*[Symbol.iterator](){yield this.x,yield this.y,yield this.z,yield this.w}};Gh.prototype.isVector4=!0;var it=Gh,ma=class extends qn{constructor(e=1,t=1,n={}){super(),n=Object.assign({generateMipmaps:!1,internalFormat:null,minFilter:zt,depthBuffer:!0,stencilBuffer:!1,resolveDepthBuffer:!0,resolveStencilBuffer:!0,depthTexture:null,samples:0,count:1,depth:1,multiview:!1,useArrayDepthTexture:!1},n),this.isRenderTarget=!0,this.width=e,this.height=t,this.depth=n.depth,this.scissor=new it(0,0,e,t),this.scissorTest=!1,this.viewport=new it(0,0,e,t),this.textures=[];let s={width:e,height:t,depth:n.depth},r=new Kt(s),o=n.count;for(let a=0;a<o;a++)this.textures[a]=r.clone(),this.textures[a].isRenderTargetTexture=!0,this.textures[a].renderTarget=this;this._setTextureOptions(n),this.depthBuffer=n.depthBuffer,this.stencilBuffer=n.stencilBuffer,this.resolveDepthBuffer=n.resolveDepthBuffer,this.resolveStencilBuffer=n.resolveStencilBuffer,this._depthTexture=null,this.depthTexture=n.depthTexture,this.samples=n.samples,this.multiview=n.multiview,this.useArrayDepthTexture=n.useArrayDepthTexture}_setTextureOptions(e={}){let t={minFilter:zt,generateMipmaps:!1,flipY:!1,internalFormat:null};e.mapping!==void 0&&(t.mapping=e.mapping),e.wrapS!==void 0&&(t.wrapS=e.wrapS),e.wrapT!==void 0&&(t.wrapT=e.wrapT),e.wrapR!==void 0&&(t.wrapR=e.wrapR),e.magFilter!==void 0&&(t.magFilter=e.magFilter),e.minFilter!==void 0&&(t.minFilter=e.minFilter),e.format!==void 0&&(t.format=e.format),e.type!==void 0&&(t.type=e.type),e.anisotropy!==void 0&&(t.anisotropy=e.anisotropy),e.colorSpace!==void 0&&(t.colorSpace=e.colorSpace),e.flipY!==void 0&&(t.flipY=e.flipY),e.generateMipmaps!==void 0&&(t.generateMipmaps=e.generateMipmaps),e.internalFormat!==void 0&&(t.internalFormat=e.internalFormat);for(let n=0;n<this.textures.length;n++)this.textures[n].setValues(t)}get texture(){return this.textures[0]}set texture(e){this.textures[0]=e}set depthTexture(e){this._depthTexture!==null&&(this._depthTexture.renderTarget=null),e!==null&&(e.renderTarget=this),this._depthTexture=e}get depthTexture(){return this._depthTexture}setSize(e,t,n=1){if(this.width!==e||this.height!==t||this.depth!==n){this.width=e,this.height=t,this.depth=n;for(let s=0,r=this.textures.length;s<r;s++)this.textures[s].image.width=e,this.textures[s].image.height=t,this.textures[s].image.depth=n,this.textures[s].isData3DTexture!==!0&&(this.textures[s].isArrayTexture=this.textures[s].image.depth>1);this.dispose()}this.viewport.set(0,0,e,t),this.scissor.set(0,0,e,t)}clone(){return new this.constructor().copy(this)}copy(e){this.width=e.width,this.height=e.height,this.depth=e.depth,this.scissor.copy(e.scissor),this.scissorTest=e.scissorTest,this.viewport.copy(e.viewport),this.textures.length=0;for(let t=0,n=e.textures.length;t<n;t++){this.textures[t]=e.textures[t].clone(),this.textures[t].isRenderTargetTexture=!0,this.textures[t].renderTarget=this;let s=Object.assign({},e.textures[t].image);this.textures[t].source=new Fs(s)}return this.depthBuffer=e.depthBuffer,this.stencilBuffer=e.stencilBuffer,this.resolveDepthBuffer=e.resolveDepthBuffer,this.resolveStencilBuffer=e.resolveStencilBuffer,e.depthTexture!==null&&(this.depthTexture=e.depthTexture.clone()),this.samples=e.samples,this.multiview=e.multiview,this.useArrayDepthTexture=e.useArrayDepthTexture,this}dispose(){this.dispatchEvent({type:"dispose"})}},hn=class extends ma{constructor(e=1,t=1,n={}){super(e,t,n),this.isWebGLRenderTarget=!0}},vr=class extends Kt{constructor(e=null,t=1,n=1,s=1){super(null),this.isDataArrayTexture=!0,this.image={data:e,width:t,height:n,depth:s},this.magFilter=Ot,this.minFilter=Ot,this.wrapR=Gn,this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1,this.layerUpdates=new Set}addLayerUpdate(e){this.layerUpdates.add(e)}clearLayerUpdates(){this.layerUpdates.clear()}};var ga=class extends Kt{constructor(e=null,t=1,n=1,s=1){super(null),this.isData3DTexture=!0,this.image={data:e,width:t,height:n,depth:s},this.magFilter=Ot,this.minFilter=Ot,this.wrapR=Gn,this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1}};var Ga=class Ga{constructor(e,t,n,s,r,o,a,l,c,h,d,u,f,m,x,g){this.elements=[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1],e!==void 0&&this.set(e,t,n,s,r,o,a,l,c,h,d,u,f,m,x,g)}set(e,t,n,s,r,o,a,l,c,h,d,u,f,m,x,g){let p=this.elements;return p[0]=e,p[4]=t,p[8]=n,p[12]=s,p[1]=r,p[5]=o,p[9]=a,p[13]=l,p[2]=c,p[6]=h,p[10]=d,p[14]=u,p[3]=f,p[7]=m,p[11]=x,p[15]=g,this}identity(){return this.set(1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1),this}clone(){return new Ga().fromArray(this.elements)}copy(e){let t=this.elements,n=e.elements;return t[0]=n[0],t[1]=n[1],t[2]=n[2],t[3]=n[3],t[4]=n[4],t[5]=n[5],t[6]=n[6],t[7]=n[7],t[8]=n[8],t[9]=n[9],t[10]=n[10],t[11]=n[11],t[12]=n[12],t[13]=n[13],t[14]=n[14],t[15]=n[15],this}copyPosition(e){let t=this.elements,n=e.elements;return t[12]=n[12],t[13]=n[13],t[14]=n[14],this}setFromMatrix3(e){let t=e.elements;return this.set(t[0],t[3],t[6],0,t[1],t[4],t[7],0,t[2],t[5],t[8],0,0,0,0,1),this}extractBasis(e,t,n){return this.determinantAffine()===0?(e.set(1,0,0),t.set(0,1,0),n.set(0,0,1),this):(e.setFromMatrixColumn(this,0),t.setFromMatrixColumn(this,1),n.setFromMatrixColumn(this,2),this)}makeBasis(e,t,n){return this.set(e.x,t.x,n.x,0,e.y,t.y,n.y,0,e.z,t.z,n.z,0,0,0,0,1),this}extractRotation(e){if(e.determinantAffine()===0)return this.identity();let t=this.elements,n=e.elements,s=1/ys.setFromMatrixColumn(e,0).length(),r=1/ys.setFromMatrixColumn(e,1).length(),o=1/ys.setFromMatrixColumn(e,2).length();return t[0]=n[0]*s,t[1]=n[1]*s,t[2]=n[2]*s,t[3]=0,t[4]=n[4]*r,t[5]=n[5]*r,t[6]=n[6]*r,t[7]=0,t[8]=n[8]*o,t[9]=n[9]*o,t[10]=n[10]*o,t[11]=0,t[12]=0,t[13]=0,t[14]=0,t[15]=1,this}makeRotationFromEuler(e){let t=this.elements,n=e.x,s=e.y,r=e.z,o=Math.cos(n),a=Math.sin(n),l=Math.cos(s),c=Math.sin(s),h=Math.cos(r),d=Math.sin(r);if(e.order==="XYZ"){let u=o*h,f=o*d,m=a*h,x=a*d;t[0]=l*h,t[4]=-l*d,t[8]=c,t[1]=f+m*c,t[5]=u-x*c,t[9]=-a*l,t[2]=x-u*c,t[6]=m+f*c,t[10]=o*l}else if(e.order==="YXZ"){let u=l*h,f=l*d,m=c*h,x=c*d;t[0]=u+x*a,t[4]=m*a-f,t[8]=o*c,t[1]=o*d,t[5]=o*h,t[9]=-a,t[2]=f*a-m,t[6]=x+u*a,t[10]=o*l}else if(e.order==="ZXY"){let u=l*h,f=l*d,m=c*h,x=c*d;t[0]=u-x*a,t[4]=-o*d,t[8]=m+f*a,t[1]=f+m*a,t[5]=o*h,t[9]=x-u*a,t[2]=-o*c,t[6]=a,t[10]=o*l}else if(e.order==="ZYX"){let u=o*h,f=o*d,m=a*h,x=a*d;t[0]=l*h,t[4]=m*c-f,t[8]=u*c+x,t[1]=l*d,t[5]=x*c+u,t[9]=f*c-m,t[2]=-c,t[6]=a*l,t[10]=o*l}else if(e.order==="YZX"){let u=o*l,f=o*c,m=a*l,x=a*c;t[0]=l*h,t[4]=x-u*d,t[8]=m*d+f,t[1]=d,t[5]=o*h,t[9]=-a*h,t[2]=-c*h,t[6]=f*d+m,t[10]=u-x*d}else if(e.order==="XZY"){let u=o*l,f=o*c,m=a*l,x=a*c;t[0]=l*h,t[4]=-d,t[8]=c*h,t[1]=u*d+x,t[5]=o*h,t[9]=f*d-m,t[2]=m*d-f,t[6]=a*h,t[10]=x*d+u}return t[3]=0,t[7]=0,t[11]=0,t[12]=0,t[13]=0,t[14]=0,t[15]=1,this}makeRotationFromQuaternion(e){return this.compose(Vm,e,Hm)}lookAt(e,t,n){let s=this.elements;return ln.subVectors(e,t),ln.lengthSq()===0&&(ln.z=1),ln.normalize(),_i.crossVectors(n,ln),_i.lengthSq()===0&&(Math.abs(n.z)===1?ln.x+=1e-4:ln.z+=1e-4,ln.normalize(),_i.crossVectors(n,ln)),_i.normalize(),Ro.crossVectors(ln,_i),s[0]=_i.x,s[4]=Ro.x,s[8]=ln.x,s[1]=_i.y,s[5]=Ro.y,s[9]=ln.y,s[2]=_i.z,s[6]=Ro.z,s[10]=ln.z,this}multiply(e){return this.multiplyMatrices(this,e)}premultiply(e){return this.multiplyMatrices(e,this)}multiplyMatrices(e,t){let n=e.elements,s=t.elements,r=this.elements,o=n[0],a=n[4],l=n[8],c=n[12],h=n[1],d=n[5],u=n[9],f=n[13],m=n[2],x=n[6],g=n[10],p=n[14],b=n[3],S=n[7],_=n[11],A=n[15],w=s[0],E=s[4],y=s[8],T=s[12],C=s[1],R=s[5],D=s[9],I=s[13],k=s[2],F=s[6],q=s[10],B=s[14],$=s[3],j=s[7],se=s[11],fe=s[15];return r[0]=o*w+a*C+l*k+c*$,r[4]=o*E+a*R+l*F+c*j,r[8]=o*y+a*D+l*q+c*se,r[12]=o*T+a*I+l*B+c*fe,r[1]=h*w+d*C+u*k+f*$,r[5]=h*E+d*R+u*F+f*j,r[9]=h*y+d*D+u*q+f*se,r[13]=h*T+d*I+u*B+f*fe,r[2]=m*w+x*C+g*k+p*$,r[6]=m*E+x*R+g*F+p*j,r[10]=m*y+x*D+g*q+p*se,r[14]=m*T+x*I+g*B+p*fe,r[3]=b*w+S*C+_*k+A*$,r[7]=b*E+S*R+_*F+A*j,r[11]=b*y+S*D+_*q+A*se,r[15]=b*T+S*I+_*B+A*fe,this}multiplyScalar(e){let t=this.elements;return t[0]*=e,t[4]*=e,t[8]*=e,t[12]*=e,t[1]*=e,t[5]*=e,t[9]*=e,t[13]*=e,t[2]*=e,t[6]*=e,t[10]*=e,t[14]*=e,t[3]*=e,t[7]*=e,t[11]*=e,t[15]*=e,this}determinant(){let e=this.elements,t=e[0],n=e[4],s=e[8],r=e[12],o=e[1],a=e[5],l=e[9],c=e[13],h=e[2],d=e[6],u=e[10],f=e[14],m=e[3],x=e[7],g=e[11],p=e[15],b=l*f-c*u,S=a*f-c*d,_=a*u-l*d,A=o*f-c*h,w=o*u-l*h,E=o*d-a*h;return t*(x*b-g*S+p*_)-n*(m*b-g*A+p*w)+s*(m*S-x*A+p*E)-r*(m*_-x*w+g*E)}determinantAffine(){let e=this.elements,t=e[0],n=e[4],s=e[8],r=e[1],o=e[5],a=e[9],l=e[2],c=e[6],h=e[10];return t*(o*h-a*c)-n*(r*h-a*l)+s*(r*c-o*l)}transpose(){let e=this.elements,t;return t=e[1],e[1]=e[4],e[4]=t,t=e[2],e[2]=e[8],e[8]=t,t=e[6],e[6]=e[9],e[9]=t,t=e[3],e[3]=e[12],e[12]=t,t=e[7],e[7]=e[13],e[13]=t,t=e[11],e[11]=e[14],e[14]=t,this}setPosition(e,t,n){let s=this.elements;return e.isVector3?(s[12]=e.x,s[13]=e.y,s[14]=e.z):(s[12]=e,s[13]=t,s[14]=n),this}invert(){let e=this.elements,t=e[0],n=e[1],s=e[2],r=e[3],o=e[4],a=e[5],l=e[6],c=e[7],h=e[8],d=e[9],u=e[10],f=e[11],m=e[12],x=e[13],g=e[14],p=e[15],b=t*a-n*o,S=t*l-s*o,_=t*c-r*o,A=n*l-s*a,w=n*c-r*a,E=s*c-r*l,y=h*x-d*m,T=h*g-u*m,C=h*p-f*m,R=d*g-u*x,D=d*p-f*x,I=u*p-f*g,k=b*I-S*D+_*R+A*C-w*T+E*y;if(k===0)return this.set(0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0);let F=1/k;return e[0]=(a*I-l*D+c*R)*F,e[1]=(s*D-n*I-r*R)*F,e[2]=(x*E-g*w+p*A)*F,e[3]=(u*w-d*E-f*A)*F,e[4]=(l*C-o*I-c*T)*F,e[5]=(t*I-s*C+r*T)*F,e[6]=(g*_-m*E-p*S)*F,e[7]=(h*E-u*_+f*S)*F,e[8]=(o*D-a*C+c*y)*F,e[9]=(n*C-t*D-r*y)*F,e[10]=(m*w-x*_+p*b)*F,e[11]=(d*_-h*w-f*b)*F,e[12]=(a*T-o*R-l*y)*F,e[13]=(t*R-n*T+s*y)*F,e[14]=(x*S-m*A-g*b)*F,e[15]=(h*A-d*S+u*b)*F,this}scale(e){let t=this.elements,n=e.x,s=e.y,r=e.z;return t[0]*=n,t[4]*=s,t[8]*=r,t[1]*=n,t[5]*=s,t[9]*=r,t[2]*=n,t[6]*=s,t[10]*=r,t[3]*=n,t[7]*=s,t[11]*=r,this}getMaxScaleOnAxis(){let e=this.elements,t=e[0]*e[0]+e[1]*e[1]+e[2]*e[2],n=e[4]*e[4]+e[5]*e[5]+e[6]*e[6],s=e[8]*e[8]+e[9]*e[9]+e[10]*e[10];return Math.sqrt(Math.max(t,n,s))}makeTranslation(e,t,n){return e.isVector3?this.set(1,0,0,e.x,0,1,0,e.y,0,0,1,e.z,0,0,0,1):this.set(1,0,0,e,0,1,0,t,0,0,1,n,0,0,0,1),this}makeRotationX(e){let t=Math.cos(e),n=Math.sin(e);return this.set(1,0,0,0,0,t,-n,0,0,n,t,0,0,0,0,1),this}makeRotationY(e){let t=Math.cos(e),n=Math.sin(e);return this.set(t,0,n,0,0,1,0,0,-n,0,t,0,0,0,0,1),this}makeRotationZ(e){let t=Math.cos(e),n=Math.sin(e);return this.set(t,-n,0,0,n,t,0,0,0,0,1,0,0,0,0,1),this}makeRotationAxis(e,t){let n=Math.cos(t),s=Math.sin(t),r=1-n,o=e.x,a=e.y,l=e.z,c=r*o,h=r*a;return this.set(c*o+n,c*a-s*l,c*l+s*a,0,c*a+s*l,h*a+n,h*l-s*o,0,c*l-s*a,h*l+s*o,r*l*l+n,0,0,0,0,1),this}makeScale(e,t,n){return this.set(e,0,0,0,0,t,0,0,0,0,n,0,0,0,0,1),this}makeShear(e,t,n,s,r,o){return this.set(1,n,r,0,e,1,o,0,t,s,1,0,0,0,0,1),this}compose(e,t,n){let s=this.elements,r=t._x,o=t._y,a=t._z,l=t._w,c=r+r,h=o+o,d=a+a,u=r*c,f=r*h,m=r*d,x=o*h,g=o*d,p=a*d,b=l*c,S=l*h,_=l*d,A=n.x,w=n.y,E=n.z;return s[0]=(1-(x+p))*A,s[1]=(f+_)*A,s[2]=(m-S)*A,s[3]=0,s[4]=(f-_)*w,s[5]=(1-(u+p))*w,s[6]=(g+b)*w,s[7]=0,s[8]=(m+S)*E,s[9]=(g-b)*E,s[10]=(1-(u+x))*E,s[11]=0,s[12]=e.x,s[13]=e.y,s[14]=e.z,s[15]=1,this}decompose(e,t,n){let s=this.elements;e.x=s[12],e.y=s[13],e.z=s[14];let r=this.determinantAffine();if(r===0)return n.set(1,1,1),t.identity(),this;let o=ys.set(s[0],s[1],s[2]).length(),a=ys.set(s[4],s[5],s[6]).length(),l=ys.set(s[8],s[9],s[10]).length();r<0&&(o=-o),wn.copy(this);let c=1/o,h=1/a,d=1/l;return wn.elements[0]*=c,wn.elements[1]*=c,wn.elements[2]*=c,wn.elements[4]*=h,wn.elements[5]*=h,wn.elements[6]*=h,wn.elements[8]*=d,wn.elements[9]*=d,wn.elements[10]*=d,t.setFromRotationMatrix(wn),n.x=o,n.y=a,n.z=l,this}makePerspective(e,t,n,s,r,o,a=Pn,l=!1){let c=this.elements,h=2*r/(t-e),d=2*r/(n-s),u=(t+e)/(t-e),f=(n+s)/(n-s),m,x;if(l)m=r/(o-r),x=o*r/(o-r);else if(a===Pn)m=-(o+r)/(o-r),x=-2*o*r/(o-r);else if(a===gr)m=-o/(o-r),x=-o*r/(o-r);else throw new Error("THREE.Matrix4.makePerspective(): Invalid coordinate system: "+a);return c[0]=h,c[4]=0,c[8]=u,c[12]=0,c[1]=0,c[5]=d,c[9]=f,c[13]=0,c[2]=0,c[6]=0,c[10]=m,c[14]=x,c[3]=0,c[7]=0,c[11]=-1,c[15]=0,this}makeOrthographic(e,t,n,s,r,o,a=Pn,l=!1){let c=this.elements,h=2/(t-e),d=2/(n-s),u=-(t+e)/(t-e),f=-(n+s)/(n-s),m,x;if(l)m=1/(o-r),x=o/(o-r);else if(a===Pn)m=-2/(o-r),x=-(o+r)/(o-r);else if(a===gr)m=-1/(o-r),x=-r/(o-r);else throw new Error("THREE.Matrix4.makeOrthographic(): Invalid coordinate system: "+a);return c[0]=h,c[4]=0,c[8]=0,c[12]=u,c[1]=0,c[5]=d,c[9]=0,c[13]=f,c[2]=0,c[6]=0,c[10]=m,c[14]=x,c[3]=0,c[7]=0,c[11]=0,c[15]=1,this}equals(e){let t=this.elements,n=e.elements;for(let s=0;s<16;s++)if(t[s]!==n[s])return!1;return!0}fromArray(e,t=0){for(let n=0;n<16;n++)this.elements[n]=e[n+t];return this}toArray(e=[],t=0){let n=this.elements;return e[t]=n[0],e[t+1]=n[1],e[t+2]=n[2],e[t+3]=n[3],e[t+4]=n[4],e[t+5]=n[5],e[t+6]=n[6],e[t+7]=n[7],e[t+8]=n[8],e[t+9]=n[9],e[t+10]=n[10],e[t+11]=n[11],e[t+12]=n[12],e[t+13]=n[13],e[t+14]=n[14],e[t+15]=n[15],e}};Ga.prototype.isMatrix4=!0;var rt=Ga,ys=new L,wn=new rt,Vm=new L(0,0,0),Hm=new L(1,1,1),_i=new L,Ro=new L,ln=new L,od=new rt,ad=new Yn,Ri=class i{constructor(e=0,t=0,n=0,s=i.DEFAULT_ORDER){this.isEuler=!0,this._x=e,this._y=t,this._z=n,this._order=s}get x(){return this._x}set x(e){this._x=e,this._onChangeCallback()}get y(){return this._y}set y(e){this._y=e,this._onChangeCallback()}get z(){return this._z}set z(e){this._z=e,this._onChangeCallback()}get order(){return this._order}set order(e){this._order=e,this._onChangeCallback()}set(e,t,n,s=this._order){return this._x=e,this._y=t,this._z=n,this._order=s,this._onChangeCallback(),this}clone(){return new this.constructor(this._x,this._y,this._z,this._order)}copy(e){return this._x=e._x,this._y=e._y,this._z=e._z,this._order=e._order,this._onChangeCallback(),this}setFromRotationMatrix(e,t=this._order,n=!0){let s=e.elements,r=s[0],o=s[4],a=s[8],l=s[1],c=s[5],h=s[9],d=s[2],u=s[6],f=s[10];switch(t){case"XYZ":this._y=Math.asin(Oe(a,-1,1)),Math.abs(a)<.9999999?(this._x=Math.atan2(-h,f),this._z=Math.atan2(-o,r)):(this._x=Math.atan2(u,c),this._z=0);break;case"YXZ":this._x=Math.asin(-Oe(h,-1,1)),Math.abs(h)<.9999999?(this._y=Math.atan2(a,f),this._z=Math.atan2(l,c)):(this._y=Math.atan2(-d,r),this._z=0);break;case"ZXY":this._x=Math.asin(Oe(u,-1,1)),Math.abs(u)<.9999999?(this._y=Math.atan2(-d,f),this._z=Math.atan2(-o,c)):(this._y=0,this._z=Math.atan2(l,r));break;case"ZYX":this._y=Math.asin(-Oe(d,-1,1)),Math.abs(d)<.9999999?(this._x=Math.atan2(u,f),this._z=Math.atan2(l,r)):(this._x=0,this._z=Math.atan2(-o,c));break;case"YZX":this._z=Math.asin(Oe(l,-1,1)),Math.abs(l)<.9999999?(this._x=Math.atan2(-h,c),this._y=Math.atan2(-d,r)):(this._x=0,this._y=Math.atan2(a,f));break;case"XZY":this._z=Math.asin(-Oe(o,-1,1)),Math.abs(o)<.9999999?(this._x=Math.atan2(u,c),this._y=Math.atan2(a,r)):(this._x=Math.atan2(-h,f),this._y=0);break;default:Pe("Euler: .setFromRotationMatrix() encountered an unknown order: "+t)}return this._order=t,n===!0&&this._onChangeCallback(),this}setFromQuaternion(e,t,n){return od.makeRotationFromQuaternion(e),this.setFromRotationMatrix(od,t,n)}setFromVector3(e,t=this._order){return this.set(e.x,e.y,e.z,t)}reorder(e){return ad.setFromEuler(this),this.setFromQuaternion(ad,e)}equals(e){return e._x===this._x&&e._y===this._y&&e._z===this._z&&e._order===this._order}fromArray(e){return this._x=e[0],this._y=e[1],this._z=e[2],e[3]!==void 0&&(this._order=e[3]),this._onChangeCallback(),this}toArray(e=[],t=0){return e[t]=this._x,e[t+1]=this._y,e[t+2]=this._z,e[t+3]=this._order,e}_onChange(e){return this._onChangeCallback=e,this}_onChangeCallback(){}*[Symbol.iterator](){yield this._x,yield this._y,yield this._z,yield this._order}};Ri.DEFAULT_ORDER="XYZ";var _r=class{constructor(){this.mask=1}set(e){this.mask=(1<<e|0)>>>0}enable(e){this.mask|=1<<e|0}enableAll(){this.mask=-1}toggle(e){this.mask^=1<<e|0}disable(e){this.mask&=~(1<<e|0)}disableAll(){this.mask=0}test(e){return(this.mask&e.mask)!==0}isEnabled(e){return(this.mask&(1<<e|0))!==0}},Gm=0,ld=new L,vs=new Yn,ni=new rt,Co=new L,ir=new L,Wm=new L,Xm=new Yn,cd=new L(1,0,0),hd=new L(0,1,0),ud=new L(0,0,1),dd={type:"added"},qm={type:"removed"},_s={type:"childadded",child:null},Dc={type:"childremoved",child:null},un=class i extends qn{constructor(){super(),this.isObject3D=!0,Object.defineProperty(this,"id",{value:Gm++}),this.uuid=Wn(),this.name="",this.type="Object3D",this.parent=null,this.children=[],this.up=i.DEFAULT_UP.clone();let e=new L,t=new Ri,n=new Yn,s=new L(1,1,1);function r(){n.setFromEuler(t,!1)}function o(){t.setFromQuaternion(n,void 0,!1)}t._onChange(r),n._onChange(o),Object.defineProperties(this,{position:{configurable:!0,enumerable:!0,value:e},rotation:{configurable:!0,enumerable:!0,value:t},quaternion:{configurable:!0,enumerable:!0,value:n},scale:{configurable:!0,enumerable:!0,value:s},modelViewMatrix:{value:new rt},normalMatrix:{value:new Ne}}),this.matrix=new rt,this.matrixWorld=new rt,this.matrixAutoUpdate=i.DEFAULT_MATRIX_AUTO_UPDATE,this.matrixWorldAutoUpdate=i.DEFAULT_MATRIX_WORLD_AUTO_UPDATE,this.matrixWorldNeedsUpdate=!1,this.layers=new _r,this.visible=!0,this.castShadow=!1,this.receiveShadow=!1,this.frustumCulled=!0,this.renderOrder=0,this.animations=[],this.customDepthMaterial=void 0,this.customDistanceMaterial=void 0,this.static=!1,this.userData={},this.pivot=null}onBeforeShadow(){}onAfterShadow(){}onBeforeRender(){}onAfterRender(){}applyMatrix4(e){this.matrixAutoUpdate&&this.updateMatrix(),this.matrix.premultiply(e),this.matrix.decompose(this.position,this.quaternion,this.scale)}applyQuaternion(e){return this.quaternion.premultiply(e),this}setRotationFromAxisAngle(e,t){this.quaternion.setFromAxisAngle(e,t)}setRotationFromEuler(e){this.quaternion.setFromEuler(e,!0)}setRotationFromMatrix(e){this.quaternion.setFromRotationMatrix(e)}setRotationFromQuaternion(e){this.quaternion.copy(e)}rotateOnAxis(e,t){return vs.setFromAxisAngle(e,t),this.quaternion.multiply(vs),this}rotateOnWorldAxis(e,t){return vs.setFromAxisAngle(e,t),this.quaternion.premultiply(vs),this}rotateX(e){return this.rotateOnAxis(cd,e)}rotateY(e){return this.rotateOnAxis(hd,e)}rotateZ(e){return this.rotateOnAxis(ud,e)}translateOnAxis(e,t){return ld.copy(e).applyQuaternion(this.quaternion),this.position.add(ld.multiplyScalar(t)),this}translateX(e){return this.translateOnAxis(cd,e)}translateY(e){return this.translateOnAxis(hd,e)}translateZ(e){return this.translateOnAxis(ud,e)}localToWorld(e){return this.updateWorldMatrix(!0,!1),e.applyMatrix4(this.matrixWorld)}worldToLocal(e){return this.updateWorldMatrix(!0,!1),e.applyMatrix4(ni.copy(this.matrixWorld).invert())}lookAt(e,t,n){e.isVector3?Co.copy(e):Co.set(e,t,n);let s=this.parent;this.updateWorldMatrix(!0,!1),ir.setFromMatrixPosition(this.matrixWorld),this.isCamera||this.isLight?ni.lookAt(ir,Co,this.up):ni.lookAt(Co,ir,this.up),this.quaternion.setFromRotationMatrix(ni),s&&(ni.extractRotation(s.matrixWorld),vs.setFromRotationMatrix(ni),this.quaternion.premultiply(vs.invert()))}add(e){if(arguments.length>1){for(let t=0;t<arguments.length;t++)this.add(arguments[t]);return this}return e===this?(Le("Object3D.add: object can't be added as a child of itself.",e),this):(e&&e.isObject3D?(e.removeFromParent(),e.parent=this,this.children.push(e),e.dispatchEvent(dd),_s.child=e,this.dispatchEvent(_s),_s.child=null):Le("Object3D.add: object not an instance of THREE.Object3D.",e),this)}remove(e){if(arguments.length>1){for(let n=0;n<arguments.length;n++)this.remove(arguments[n]);return this}let t=this.children.indexOf(e);return t!==-1&&(e.parent=null,this.children.splice(t,1),e.dispatchEvent(qm),Dc.child=e,this.dispatchEvent(Dc),Dc.child=null),this}removeFromParent(){let e=this.parent;return e!==null&&e.remove(this),this}clear(){return this.remove(...this.children)}attach(e){return this.updateWorldMatrix(!0,!1),ni.copy(this.matrixWorld).invert(),e.parent!==null&&(e.parent.updateWorldMatrix(!0,!1),ni.multiply(e.parent.matrixWorld)),e.applyMatrix4(ni),e.removeFromParent(),e.parent=this,this.children.push(e),e.updateWorldMatrix(!1,!0),e.dispatchEvent(dd),_s.child=e,this.dispatchEvent(_s),_s.child=null,this}getObjectById(e){return this.getObjectByProperty("id",e)}getObjectByName(e){return this.getObjectByProperty("name",e)}getObjectByProperty(e,t){if(this[e]===t)return this;for(let n=0,s=this.children.length;n<s;n++){let o=this.children[n].getObjectByProperty(e,t);if(o!==void 0)return o}}getObjectsByProperty(e,t,n=[]){this[e]===t&&n.push(this);let s=this.children;for(let r=0,o=s.length;r<o;r++)s[r].getObjectsByProperty(e,t,n);return n}getWorldPosition(e){return this.updateWorldMatrix(!0,!1),e.setFromMatrixPosition(this.matrixWorld)}getWorldQuaternion(e){return this.updateWorldMatrix(!0,!1),this.matrixWorld.decompose(ir,e,Wm),e}getWorldScale(e){return this.updateWorldMatrix(!0,!1),this.matrixWorld.decompose(ir,Xm,e),e}getWorldDirection(e){this.updateWorldMatrix(!0,!1);let t=this.matrixWorld.elements;return e.set(t[8],t[9],t[10]).normalize()}raycast(){}traverse(e){e(this);let t=this.children;for(let n=0,s=t.length;n<s;n++)t[n].traverse(e)}traverseVisible(e){if(this.visible===!1)return;e(this);let t=this.children;for(let n=0,s=t.length;n<s;n++)t[n].traverseVisible(e)}traverseAncestors(e){let t=this.parent;t!==null&&(e(t),t.traverseAncestors(e))}updateMatrix(){this.matrix.compose(this.position,this.quaternion,this.scale);let e=this.pivot;if(e!==null){let t=e.x,n=e.y,s=e.z,r=this.matrix.elements;r[12]+=t-r[0]*t-r[4]*n-r[8]*s,r[13]+=n-r[1]*t-r[5]*n-r[9]*s,r[14]+=s-r[2]*t-r[6]*n-r[10]*s}this.matrixWorldNeedsUpdate=!0}updateMatrixWorld(e){this.matrixAutoUpdate&&this.updateMatrix(),(this.matrixWorldNeedsUpdate||e)&&(this.matrixWorldAutoUpdate===!0&&(this.parent===null?this.matrixWorld.copy(this.matrix):this.matrixWorld.multiplyMatrices(this.parent.matrixWorld,this.matrix)),this.matrixWorldNeedsUpdate=!1,e=!0);let t=this.children;for(let n=0,s=t.length;n<s;n++)t[n].updateMatrixWorld(e)}updateWorldMatrix(e,t,n=!1){let s=this.parent;if(e===!0&&s!==null&&s.updateWorldMatrix(!0,!1),this.matrixAutoUpdate&&this.updateMatrix(),(this.matrixWorldNeedsUpdate||n)&&(this.matrixWorldAutoUpdate===!0&&(this.parent===null?this.matrixWorld.copy(this.matrix):this.matrixWorld.multiplyMatrices(this.parent.matrixWorld,this.matrix)),this.matrixWorldNeedsUpdate=!1,n=!0),t===!0){let r=this.children;for(let o=0,a=r.length;o<a;o++)r[o].updateWorldMatrix(!1,!0,n)}}toJSON(e){let t=e===void 0||typeof e=="string",n={};t&&(e={geometries:{},materials:{},textures:{},images:{},shapes:{},skeletons:{},animations:{},nodes:{}},n.metadata={version:4.7,type:"Object",generator:"Object3D.toJSON"});let s={};s.uuid=this.uuid,s.type=this.type,this.name!==""&&(s.name=this.name),this.castShadow===!0&&(s.castShadow=!0),this.receiveShadow===!0&&(s.receiveShadow=!0),this.visible===!1&&(s.visible=!1),this.frustumCulled===!1&&(s.frustumCulled=!1),this.renderOrder!==0&&(s.renderOrder=this.renderOrder),this.static!==!1&&(s.static=this.static),Object.keys(this.userData).length>0&&(s.userData=this.userData),s.layers=this.layers.mask,s.matrix=this.matrix.toArray(),s.up=this.up.toArray(),this.pivot!==null&&(s.pivot=this.pivot.toArray()),this.matrixAutoUpdate===!1&&(s.matrixAutoUpdate=!1),this.morphTargetDictionary!==void 0&&(s.morphTargetDictionary=Object.assign({},this.morphTargetDictionary)),this.morphTargetInfluences!==void 0&&(s.morphTargetInfluences=this.morphTargetInfluences.slice()),this.isInstancedMesh&&(s.type="InstancedMesh",s.count=this.count,s.instanceMatrix=this.instanceMatrix.toJSON(),this.instanceColor!==null&&(s.instanceColor=this.instanceColor.toJSON())),this.isBatchedMesh&&(s.type="BatchedMesh",s.perObjectFrustumCulled=this.perObjectFrustumCulled,s.sortObjects=this.sortObjects,s.drawRanges=this._drawRanges,s.reservedRanges=this._reservedRanges,s.geometryInfo=this._geometryInfo.map(a=>({...a,boundingBox:a.boundingBox?a.boundingBox.toJSON():void 0,boundingSphere:a.boundingSphere?a.boundingSphere.toJSON():void 0})),s.instanceInfo=this._instanceInfo.map(a=>({...a})),s.availableInstanceIds=this._availableInstanceIds.slice(),s.availableGeometryIds=this._availableGeometryIds.slice(),s.nextIndexStart=this._nextIndexStart,s.nextVertexStart=this._nextVertexStart,s.geometryCount=this._geometryCount,s.maxInstanceCount=this._maxInstanceCount,s.maxVertexCount=this._maxVertexCount,s.maxIndexCount=this._maxIndexCount,s.geometryInitialized=this._geometryInitialized,s.matricesTexture=this._matricesTexture.toJSON(e),s.indirectTexture=this._indirectTexture.toJSON(e),this._colorsTexture!==null&&(s.colorsTexture=this._colorsTexture.toJSON(e)),this.boundingSphere!==null&&(s.boundingSphere=this.boundingSphere.toJSON()),this.boundingBox!==null&&(s.boundingBox=this.boundingBox.toJSON()));function r(a,l){return a[l.uuid]===void 0&&(a[l.uuid]=l.toJSON(e)),l.uuid}if(this.isScene)this.background&&(this.background.isColor?s.background=this.background.toJSON():this.background.isTexture&&(s.background=this.background.toJSON(e).uuid)),this.environment&&this.environment.isTexture&&this.environment.isRenderTargetTexture!==!0&&(s.environment=this.environment.toJSON(e).uuid);else if(this.isMesh||this.isLine||this.isPoints){s.geometry=r(e.geometries,this.geometry);let a=this.geometry.parameters;if(a!==void 0&&a.shapes!==void 0){let l=a.shapes;if(Array.isArray(l))for(let c=0,h=l.length;c<h;c++){let d=l[c];r(e.shapes,d)}else r(e.shapes,l)}}if(this.isSkinnedMesh&&(s.bindMode=this.bindMode,s.bindMatrix=this.bindMatrix.toArray(),this.skeleton!==void 0&&(r(e.skeletons,this.skeleton),s.skeleton=this.skeleton.uuid)),this.material!==void 0)if(Array.isArray(this.material)){let a=[];for(let l=0,c=this.material.length;l<c;l++)a.push(r(e.materials,this.material[l]));s.material=a}else s.material=r(e.materials,this.material);if(this.children.length>0){s.children=[];for(let a=0;a<this.children.length;a++)s.children.push(this.children[a].toJSON(e).object)}if(this.animations.length>0){s.animations=[];for(let a=0;a<this.animations.length;a++){let l=this.animations[a];s.animations.push(r(e.animations,l))}}if(t){let a=o(e.geometries),l=o(e.materials),c=o(e.textures),h=o(e.images),d=o(e.shapes),u=o(e.skeletons),f=o(e.animations),m=o(e.nodes);a.length>0&&(n.geometries=a),l.length>0&&(n.materials=l),c.length>0&&(n.textures=c),h.length>0&&(n.images=h),d.length>0&&(n.shapes=d),u.length>0&&(n.skeletons=u),f.length>0&&(n.animations=f),m.length>0&&(n.nodes=m)}return n.object=s,n;function o(a){let l=[];for(let c in a){let h=a[c];delete h.metadata,l.push(h)}return l}}clone(e){return new this.constructor().copy(this,e)}copy(e,t=!0){if(this.name=e.name,this.up.copy(e.up),this.position.copy(e.position),this.rotation.order=e.rotation.order,this.quaternion.copy(e.quaternion),this.scale.copy(e.scale),this.pivot=e.pivot!==null?e.pivot.clone():null,this.matrix.copy(e.matrix),this.matrixWorld.copy(e.matrixWorld),this.matrixAutoUpdate=e.matrixAutoUpdate,this.matrixWorldAutoUpdate=e.matrixWorldAutoUpdate,this.matrixWorldNeedsUpdate=e.matrixWorldNeedsUpdate,this.layers.mask=e.layers.mask,this.visible=e.visible,this.castShadow=e.castShadow,this.receiveShadow=e.receiveShadow,this.frustumCulled=e.frustumCulled,this.renderOrder=e.renderOrder,this.static=e.static,this.animations=e.animations.slice(),this.userData=JSON.parse(JSON.stringify(e.userData)),t===!0)for(let n=0;n<e.children.length;n++){let s=e.children[n];this.add(s.clone())}return this}};un.DEFAULT_UP=new L(0,1,0);un.DEFAULT_MATRIX_AUTO_UPDATE=!0;un.DEFAULT_MATRIX_WORLD_AUTO_UPDATE=!0;var Rn=class extends un{constructor(){super(),this.isGroup=!0,this.type="Group"}},Ym={type:"move"},Us=class{constructor(){this._targetRay=null,this._grip=null,this._hand=null}getHandSpace(){return this._hand===null&&(this._hand=new Rn,this._hand.matrixAutoUpdate=!1,this._hand.visible=!1,this._hand.joints={},this._hand.inputState={pinching:!1}),this._hand}getTargetRaySpace(){return this._targetRay===null&&(this._targetRay=new Rn,this._targetRay.matrixAutoUpdate=!1,this._targetRay.visible=!1,this._targetRay.hasLinearVelocity=!1,this._targetRay.linearVelocity=new L,this._targetRay.hasAngularVelocity=!1,this._targetRay.angularVelocity=new L),this._targetRay}getGripSpace(){return this._grip===null&&(this._grip=new Rn,this._grip.matrixAutoUpdate=!1,this._grip.visible=!1,this._grip.hasLinearVelocity=!1,this._grip.linearVelocity=new L,this._grip.hasAngularVelocity=!1,this._grip.angularVelocity=new L,this._grip.eventsEnabled=!1),this._grip}dispatchEvent(e){return this._targetRay!==null&&this._targetRay.dispatchEvent(e),this._grip!==null&&this._grip.dispatchEvent(e),this._hand!==null&&this._hand.dispatchEvent(e),this}connect(e){if(e&&e.hand){let t=this._hand;if(t)for(let n of e.hand.values())this._getHandJoint(t,n)}return this.dispatchEvent({type:"connected",data:e}),this}disconnect(e){return this.dispatchEvent({type:"disconnected",data:e}),this._targetRay!==null&&(this._targetRay.visible=!1),this._grip!==null&&(this._grip.visible=!1),this._hand!==null&&(this._hand.visible=!1),this}update(e,t,n){let s=null,r=null,o=null,a=this._targetRay,l=this._grip,c=this._hand;if(e&&t.session.visibilityState!=="visible-blurred"){if(c&&e.hand){o=!0;for(let x of e.hand.values()){let g=t.getJointPose(x,n),p=this._getHandJoint(c,x);g!==null&&(p.matrix.fromArray(g.transform.matrix),p.matrix.decompose(p.position,p.rotation,p.scale),p.matrixWorldNeedsUpdate=!0,p.jointRadius=g.radius),p.visible=g!==null}let h=c.joints["index-finger-tip"],d=c.joints["thumb-tip"],u=h.position.distanceTo(d.position),f=.02,m=.005;c.inputState.pinching&&u>f+m?(c.inputState.pinching=!1,this.dispatchEvent({type:"pinchend",handedness:e.handedness,target:this})):!c.inputState.pinching&&u<=f-m&&(c.inputState.pinching=!0,this.dispatchEvent({type:"pinchstart",handedness:e.handedness,target:this}))}else l!==null&&e.gripSpace&&(r=t.getPose(e.gripSpace,n),r!==null&&(l.matrix.fromArray(r.transform.matrix),l.matrix.decompose(l.position,l.rotation,l.scale),l.matrixWorldNeedsUpdate=!0,r.linearVelocity?(l.hasLinearVelocity=!0,l.linearVelocity.copy(r.linearVelocity)):l.hasLinearVelocity=!1,r.angularVelocity?(l.hasAngularVelocity=!0,l.angularVelocity.copy(r.angularVelocity)):l.hasAngularVelocity=!1,l.eventsEnabled&&l.dispatchEvent({type:"gripUpdated",data:e,target:this})));a!==null&&(s=t.getPose(e.targetRaySpace,n),s===null&&r!==null&&(s=r),s!==null&&(a.matrix.fromArray(s.transform.matrix),a.matrix.decompose(a.position,a.rotation,a.scale),a.matrixWorldNeedsUpdate=!0,s.linearVelocity?(a.hasLinearVelocity=!0,a.linearVelocity.copy(s.linearVelocity)):a.hasLinearVelocity=!1,s.angularVelocity?(a.hasAngularVelocity=!0,a.angularVelocity.copy(s.angularVelocity)):a.hasAngularVelocity=!1,this.dispatchEvent(Ym)))}return a!==null&&(a.visible=s!==null),l!==null&&(l.visible=r!==null),c!==null&&(c.visible=o!==null),this}_getHandJoint(e,t){if(e.joints[t.jointName]===void 0){let n=new Rn;n.matrixAutoUpdate=!1,n.visible=!1,e.joints[t.jointName]=n,e.add(n)}return e.joints[t.jointName]}},gf={aliceblue:15792383,antiquewhite:16444375,aqua:65535,aquamarine:8388564,azure:15794175,beige:16119260,bisque:16770244,black:0,blanchedalmond:16772045,blue:255,blueviolet:9055202,brown:10824234,burlywood:14596231,cadetblue:6266528,chartreuse:8388352,chocolate:13789470,coral:16744272,cornflowerblue:6591981,cornsilk:16775388,crimson:14423100,cyan:65535,darkblue:139,darkcyan:35723,darkgoldenrod:12092939,darkgray:11119017,darkgreen:25600,darkgrey:11119017,darkkhaki:12433259,darkmagenta:9109643,darkolivegreen:5597999,darkorange:16747520,darkorchid:10040012,darkred:9109504,darksalmon:15308410,darkseagreen:9419919,darkslateblue:4734347,darkslategray:3100495,darkslategrey:3100495,darkturquoise:52945,darkviolet:9699539,deeppink:16716947,deepskyblue:49151,dimgray:6908265,dimgrey:6908265,dodgerblue:2003199,firebrick:11674146,floralwhite:16775920,forestgreen:2263842,fuchsia:16711935,gainsboro:14474460,ghostwhite:16316671,gold:16766720,goldenrod:14329120,gray:8421504,green:32768,greenyellow:11403055,grey:8421504,honeydew:15794160,hotpink:16738740,indianred:13458524,indigo:4915330,ivory:16777200,khaki:15787660,lavender:15132410,lavenderblush:16773365,lawngreen:8190976,lemonchiffon:16775885,lightblue:11393254,lightcoral:15761536,lightcyan:14745599,lightgoldenrodyellow:16448210,lightgray:13882323,lightgreen:9498256,lightgrey:13882323,lightpink:16758465,lightsalmon:16752762,lightseagreen:2142890,lightskyblue:8900346,lightslategray:7833753,lightslategrey:7833753,lightsteelblue:11584734,lightyellow:16777184,lime:65280,limegreen:3329330,linen:16445670,magenta:16711935,maroon:8388608,mediumaquamarine:6737322,mediumblue:205,mediumorchid:12211667,mediumpurple:9662683,mediumseagreen:3978097,mediumslateblue:8087790,mediumspringgreen:64154,mediumturquoise:4772300,mediumvioletred:13047173,midnightblue:1644912,mintcream:16121850,mistyrose:16770273,moccasin:16770229,navajowhite:16768685,navy:128,oldlace:16643558,olive:8421376,olivedrab:7048739,orange:16753920,orangered:16729344,orchid:14315734,palegoldenrod:15657130,palegreen:10025880,paleturquoise:11529966,palevioletred:14381203,papayawhip:16773077,peachpuff:16767673,peru:13468991,pink:16761035,plum:14524637,powderblue:11591910,purple:8388736,rebeccapurple:6697881,red:16711680,rosybrown:12357519,royalblue:4286945,saddlebrown:9127187,salmon:16416882,sandybrown:16032864,seagreen:3050327,seashell:16774638,sienna:10506797,silver:12632256,skyblue:8900331,slateblue:6970061,slategray:7372944,slategrey:7372944,snow:16775930,springgreen:65407,steelblue:4620980,tan:13808780,teal:32896,thistle:14204888,tomato:16737095,turquoise:4251856,violet:15631086,wheat:16113331,white:16777215,whitesmoke:16119285,yellow:16776960,yellowgreen:10145074},bi={h:0,s:0,l:0},Io={h:0,s:0,l:0};function Fc(i,e,t){return t<0&&(t+=1),t>1&&(t-=1),t<1/6?i+(e-i)*6*t:t<1/2?e:t<2/3?i+(e-i)*6*(2/3-t):i}var qe=class{constructor(e,t,n){return this.isColor=!0,this.r=1,this.g=1,this.b=1,this.set(e,t,n)}set(e,t,n){if(t===void 0&&n===void 0){let s=e;s&&s.isColor?this.copy(s):typeof s=="number"?this.setHex(s):typeof s=="string"&&this.setStyle(s)}else this.setRGB(e,t,n);return this}setScalar(e){return this.r=e,this.g=e,this.b=e,this}setHex(e,t=$t){return e=Math.floor(e),this.r=(e>>16&255)/255,this.g=(e>>8&255)/255,this.b=(e&255)/255,Xe.colorSpaceToWorking(this,t),this}setRGB(e,t,n,s=Xe.workingColorSpace){return this.r=e,this.g=t,this.b=n,Xe.colorSpaceToWorking(this,s),this}setHSL(e,t,n,s=Xe.workingColorSpace){if(e=Dh(e,1),t=Oe(t,0,1),n=Oe(n,0,1),t===0)this.r=this.g=this.b=n;else{let r=n<=.5?n*(1+t):n+t-n*t,o=2*n-r;this.r=Fc(o,r,e+1/3),this.g=Fc(o,r,e),this.b=Fc(o,r,e-1/3)}return Xe.colorSpaceToWorking(this,s),this}setStyle(e,t=$t){function n(r){r!==void 0&&parseFloat(r)<1&&Pe("Color: Alpha component of "+e+" will be ignored.")}let s;if(s=/^(\w+)\(([^\)]*)\)/.exec(e)){let r,o=s[1],a=s[2];switch(o){case"rgb":case"rgba":if(r=/^\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(a))return n(r[4]),this.setRGB(Math.min(255,parseInt(r[1],10))/255,Math.min(255,parseInt(r[2],10))/255,Math.min(255,parseInt(r[3],10))/255,t);if(r=/^\s*(\d+)\%\s*,\s*(\d+)\%\s*,\s*(\d+)\%\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(a))return n(r[4]),this.setRGB(Math.min(100,parseInt(r[1],10))/100,Math.min(100,parseInt(r[2],10))/100,Math.min(100,parseInt(r[3],10))/100,t);break;case"hsl":case"hsla":if(r=/^\s*(\d*\.?\d+)\s*,\s*(\d*\.?\d+)\%\s*,\s*(\d*\.?\d+)\%\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(a))return n(r[4]),this.setHSL(parseFloat(r[1])/360,parseFloat(r[2])/100,parseFloat(r[3])/100,t);break;default:Pe("Color: Unknown color model "+e)}}else if(s=/^\#([A-Fa-f\d]+)$/.exec(e)){let r=s[1],o=r.length;if(o===3)return this.setRGB(parseInt(r.charAt(0),16)/15,parseInt(r.charAt(1),16)/15,parseInt(r.charAt(2),16)/15,t);if(o===6)return this.setHex(parseInt(r,16),t);Pe("Color: Invalid hex color "+e)}else if(e&&e.length>0)return this.setColorName(e,t);return this}setColorName(e,t=$t){let n=gf[e.toLowerCase()];return n!==void 0?this.setHex(n,t):Pe("Color: Unknown color "+e),this}clone(){return new this.constructor(this.r,this.g,this.b)}copy(e){return this.r=e.r,this.g=e.g,this.b=e.b,this}copySRGBToLinear(e){return this.r=ai(e.r),this.g=ai(e.g),this.b=ai(e.b),this}copyLinearToSRGB(e){return this.r=Is(e.r),this.g=Is(e.g),this.b=Is(e.b),this}convertSRGBToLinear(){return this.copySRGBToLinear(this),this}convertLinearToSRGB(){return this.copyLinearToSRGB(this),this}getHex(e=$t){return Xe.workingToColorSpace(Xt.copy(this),e),Math.round(Oe(Xt.r*255,0,255))*65536+Math.round(Oe(Xt.g*255,0,255))*256+Math.round(Oe(Xt.b*255,0,255))}getHexString(e=$t){return("000000"+this.getHex(e).toString(16)).slice(-6)}getHSL(e,t=Xe.workingColorSpace){Xe.workingToColorSpace(Xt.copy(this),t);let n=Xt.r,s=Xt.g,r=Xt.b,o=Math.max(n,s,r),a=Math.min(n,s,r),l,c,h=(a+o)/2;if(a===o)l=0,c=0;else{let d=o-a;switch(c=h<=.5?d/(o+a):d/(2-o-a),o){case n:l=(s-r)/d+(s<r?6:0);break;case s:l=(r-n)/d+2;break;case r:l=(n-s)/d+4;break}l/=6}return e.h=l,e.s=c,e.l=h,e}getRGB(e,t=Xe.workingColorSpace){return Xe.workingToColorSpace(Xt.copy(this),t),e.r=Xt.r,e.g=Xt.g,e.b=Xt.b,e}getStyle(e=$t){Xe.workingToColorSpace(Xt.copy(this),e);let t=Xt.r,n=Xt.g,s=Xt.b;return e!==$t?`color(${e} ${t.toFixed(3)} ${n.toFixed(3)} ${s.toFixed(3)})`:`rgb(${Math.round(t*255)},${Math.round(n*255)},${Math.round(s*255)})`}offsetHSL(e,t,n){return this.getHSL(bi),this.setHSL(bi.h+e,bi.s+t,bi.l+n)}add(e){return this.r+=e.r,this.g+=e.g,this.b+=e.b,this}addColors(e,t){return this.r=e.r+t.r,this.g=e.g+t.g,this.b=e.b+t.b,this}addScalar(e){return this.r+=e,this.g+=e,this.b+=e,this}sub(e){return this.r=Math.max(0,this.r-e.r),this.g=Math.max(0,this.g-e.g),this.b=Math.max(0,this.b-e.b),this}multiply(e){return this.r*=e.r,this.g*=e.g,this.b*=e.b,this}multiplyScalar(e){return this.r*=e,this.g*=e,this.b*=e,this}lerp(e,t){return this.r+=(e.r-this.r)*t,this.g+=(e.g-this.g)*t,this.b+=(e.b-this.b)*t,this}lerpColors(e,t,n){return this.r=e.r+(t.r-e.r)*n,this.g=e.g+(t.g-e.g)*n,this.b=e.b+(t.b-e.b)*n,this}lerpHSL(e,t){this.getHSL(bi),e.getHSL(Io);let n=hr(bi.h,Io.h,t),s=hr(bi.s,Io.s,t),r=hr(bi.l,Io.l,t);return this.setHSL(n,s,r),this}setFromVector3(e){return this.r=e.x,this.g=e.y,this.b=e.z,this}applyMatrix3(e){let t=this.r,n=this.g,s=this.b,r=e.elements;return this.r=r[0]*t+r[3]*n+r[6]*s,this.g=r[1]*t+r[4]*n+r[7]*s,this.b=r[2]*t+r[5]*n+r[8]*s,this}equals(e){return e.r===this.r&&e.g===this.g&&e.b===this.b}fromArray(e,t=0){return this.r=e[t],this.g=e[t+1],this.b=e[t+2],this}toArray(e=[],t=0){return e[t]=this.r,e[t+1]=this.g,e[t+2]=this.b,e}fromBufferAttribute(e,t){return this.r=e.getX(t),this.g=e.getY(t),this.b=e.getZ(t),this}toJSON(){return this.getHex()}*[Symbol.iterator](){yield this.r,yield this.g,yield this.b}},Xt=new qe;qe.NAMES=gf;var br=class extends un{constructor(){super(),this.isScene=!0,this.type="Scene",this.background=null,this.environment=null,this.fog=null,this.backgroundBlurriness=0,this.backgroundIntensity=1,this.backgroundRotation=new Ri,this.environmentIntensity=1,this.environmentRotation=new Ri,this.overrideMaterial=null,typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("observe",{detail:this}))}copy(e,t){return super.copy(e,t),e.background!==null&&(this.background=e.background.clone()),e.environment!==null&&(this.environment=e.environment.clone()),e.fog!==null&&(this.fog=e.fog.clone()),this.backgroundBlurriness=e.backgroundBlurriness,this.backgroundIntensity=e.backgroundIntensity,this.backgroundRotation.copy(e.backgroundRotation),this.environmentIntensity=e.environmentIntensity,this.environmentRotation.copy(e.environmentRotation),e.overrideMaterial!==null&&(this.overrideMaterial=e.overrideMaterial.clone()),this.matrixAutoUpdate=e.matrixAutoUpdate,this}toJSON(e){let t=super.toJSON(e);return this.fog!==null&&(t.object.fog=this.fog.toJSON()),this.backgroundBlurriness>0&&(t.object.backgroundBlurriness=this.backgroundBlurriness),this.backgroundIntensity!==1&&(t.object.backgroundIntensity=this.backgroundIntensity),t.object.backgroundRotation=this.backgroundRotation.toArray(),this.environmentIntensity!==1&&(t.object.environmentIntensity=this.environmentIntensity),t.object.environmentRotation=this.environmentRotation.toArray(),t}},En=new L,ii=new L,Uc=new L,si=new L,bs=new L,Ss=new L,fd=new L,Nc=new L,Oc=new L,Bc=new L,zc=new it,kc=new it,Vc=new it,Ti=class i{constructor(e=new L,t=new L,n=new L){this.a=e,this.b=t,this.c=n}static getNormal(e,t,n,s){s.subVectors(n,t),En.subVectors(e,t),s.cross(En);let r=s.lengthSq();return r>0?s.multiplyScalar(1/Math.sqrt(r)):s.set(0,0,0)}static getBarycoord(e,t,n,s,r){En.subVectors(s,t),ii.subVectors(n,t),Uc.subVectors(e,t);let o=En.dot(En),a=En.dot(ii),l=En.dot(Uc),c=ii.dot(ii),h=ii.dot(Uc),d=o*c-a*a;if(d===0)return r.set(0,0,0),null;let u=1/d,f=(c*l-a*h)*u,m=(o*h-a*l)*u;return r.set(1-f-m,m,f)}static containsPoint(e,t,n,s){return this.getBarycoord(e,t,n,s,si)===null?!1:si.x>=0&&si.y>=0&&si.x+si.y<=1}static getInterpolation(e,t,n,s,r,o,a,l){return this.getBarycoord(e,t,n,s,si)===null?(l.x=0,l.y=0,"z"in l&&(l.z=0),"w"in l&&(l.w=0),null):(l.setScalar(0),l.addScaledVector(r,si.x),l.addScaledVector(o,si.y),l.addScaledVector(a,si.z),l)}static getInterpolatedAttribute(e,t,n,s,r,o){return zc.setScalar(0),kc.setScalar(0),Vc.setScalar(0),zc.fromBufferAttribute(e,t),kc.fromBufferAttribute(e,n),Vc.fromBufferAttribute(e,s),o.setScalar(0),o.addScaledVector(zc,r.x),o.addScaledVector(kc,r.y),o.addScaledVector(Vc,r.z),o}static isFrontFacing(e,t,n,s){return En.subVectors(n,t),ii.subVectors(e,t),En.cross(ii).dot(s)<0}set(e,t,n){return this.a.copy(e),this.b.copy(t),this.c.copy(n),this}setFromPointsAndIndices(e,t,n,s){return this.a.copy(e[t]),this.b.copy(e[n]),this.c.copy(e[s]),this}setFromAttributeAndIndices(e,t,n,s){return this.a.fromBufferAttribute(e,t),this.b.fromBufferAttribute(e,n),this.c.fromBufferAttribute(e,s),this}clone(){return new this.constructor().copy(this)}copy(e){return this.a.copy(e.a),this.b.copy(e.b),this.c.copy(e.c),this}getArea(){return En.subVectors(this.c,this.b),ii.subVectors(this.a,this.b),En.cross(ii).length()*.5}getMidpoint(e){return e.addVectors(this.a,this.b).add(this.c).multiplyScalar(1/3)}getNormal(e){return i.getNormal(this.a,this.b,this.c,e)}getPlane(e){return e.setFromCoplanarPoints(this.a,this.b,this.c)}getBarycoord(e,t){return i.getBarycoord(e,this.a,this.b,this.c,t)}getInterpolation(e,t,n,s,r){return i.getInterpolation(e,this.a,this.b,this.c,t,n,s,r)}containsPoint(e){return i.containsPoint(e,this.a,this.b,this.c)}isFrontFacing(e){return i.isFrontFacing(this.a,this.b,this.c,e)}intersectsBox(e){return e.intersectsTriangle(this)}closestPointToPoint(e,t){let n=this.a,s=this.b,r=this.c,o,a;bs.subVectors(s,n),Ss.subVectors(r,n),Nc.subVectors(e,n);let l=bs.dot(Nc),c=Ss.dot(Nc);if(l<=0&&c<=0)return t.copy(n);Oc.subVectors(e,s);let h=bs.dot(Oc),d=Ss.dot(Oc);if(h>=0&&d<=h)return t.copy(s);let u=l*d-h*c;if(u<=0&&l>=0&&h<=0)return o=l/(l-h),t.copy(n).addScaledVector(bs,o);Bc.subVectors(e,r);let f=bs.dot(Bc),m=Ss.dot(Bc);if(m>=0&&f<=m)return t.copy(r);let x=f*c-l*m;if(x<=0&&c>=0&&m<=0)return a=c/(c-m),t.copy(n).addScaledVector(Ss,a);let g=h*m-f*d;if(g<=0&&d-h>=0&&f-m>=0)return fd.subVectors(r,s),a=(d-h)/(d-h+(f-m)),t.copy(s).addScaledVector(fd,a);let p=1/(g+x+u);return o=x*p,a=u*p,t.copy(n).addScaledVector(bs,o).addScaledVector(Ss,a)}equals(e){return e.a.equals(this.a)&&e.b.equals(this.b)&&e.c.equals(this.c)}},dn=class{constructor(e=new L(1/0,1/0,1/0),t=new L(-1/0,-1/0,-1/0)){this.isBox3=!0,this.min=e,this.max=t}set(e,t){return this.min.copy(e),this.max.copy(t),this}setFromArray(e){this.makeEmpty();for(let t=0,n=e.length;t<n;t+=3)this.expandByPoint(Tn.fromArray(e,t));return this}setFromBufferAttribute(e){this.makeEmpty();for(let t=0,n=e.count;t<n;t++)this.expandByPoint(Tn.fromBufferAttribute(e,t));return this}setFromPoints(e){this.makeEmpty();for(let t=0,n=e.length;t<n;t++)this.expandByPoint(e[t]);return this}setFromCenterAndSize(e,t){let n=Tn.copy(t).multiplyScalar(.5);return this.min.copy(e).sub(n),this.max.copy(e).add(n),this}setFromObject(e,t=!1){return this.makeEmpty(),this.expandByObject(e,t)}clone(){return new this.constructor().copy(this)}copy(e){return this.min.copy(e.min),this.max.copy(e.max),this}makeEmpty(){return this.min.x=this.min.y=this.min.z=1/0,this.max.x=this.max.y=this.max.z=-1/0,this}isEmpty(){return this.max.x<this.min.x||this.max.y<this.min.y||this.max.z<this.min.z}getCenter(e){return this.isEmpty()?e.set(0,0,0):e.addVectors(this.min,this.max).multiplyScalar(.5)}getSize(e){return this.isEmpty()?e.set(0,0,0):e.subVectors(this.max,this.min)}expandByPoint(e){return this.min.min(e),this.max.max(e),this}expandByVector(e){return this.min.sub(e),this.max.add(e),this}expandByScalar(e){return this.min.addScalar(-e),this.max.addScalar(e),this}expandByObject(e,t=!1){e.updateWorldMatrix(!1,!1);let n=e.geometry;if(n!==void 0){let r=n.getAttribute("position");if(t===!0&&r!==void 0&&e.isInstancedMesh!==!0)for(let o=0,a=r.count;o<a;o++)e.isMesh===!0?e.getVertexPosition(o,Tn):Tn.fromBufferAttribute(r,o),Tn.applyMatrix4(e.matrixWorld),this.expandByPoint(Tn);else e.boundingBox!==void 0?(e.boundingBox===null&&e.computeBoundingBox(),Lo.copy(e.boundingBox)):(n.boundingBox===null&&n.computeBoundingBox(),Lo.copy(n.boundingBox)),Lo.applyMatrix4(e.matrixWorld),this.union(Lo)}let s=e.children;for(let r=0,o=s.length;r<o;r++)this.expandByObject(s[r],t);return this}containsPoint(e){return e.x>=this.min.x&&e.x<=this.max.x&&e.y>=this.min.y&&e.y<=this.max.y&&e.z>=this.min.z&&e.z<=this.max.z}containsBox(e){return this.min.x<=e.min.x&&e.max.x<=this.max.x&&this.min.y<=e.min.y&&e.max.y<=this.max.y&&this.min.z<=e.min.z&&e.max.z<=this.max.z}getParameter(e,t){return t.set((e.x-this.min.x)/(this.max.x-this.min.x),(e.y-this.min.y)/(this.max.y-this.min.y),(e.z-this.min.z)/(this.max.z-this.min.z))}intersectsBox(e){return e.max.x>=this.min.x&&e.min.x<=this.max.x&&e.max.y>=this.min.y&&e.min.y<=this.max.y&&e.max.z>=this.min.z&&e.min.z<=this.max.z}intersectsSphere(e){return this.clampPoint(e.center,Tn),Tn.distanceToSquared(e.center)<=e.radius*e.radius}intersectsPlane(e){let t,n;return e.normal.x>0?(t=e.normal.x*this.min.x,n=e.normal.x*this.max.x):(t=e.normal.x*this.max.x,n=e.normal.x*this.min.x),e.normal.y>0?(t+=e.normal.y*this.min.y,n+=e.normal.y*this.max.y):(t+=e.normal.y*this.max.y,n+=e.normal.y*this.min.y),e.normal.z>0?(t+=e.normal.z*this.min.z,n+=e.normal.z*this.max.z):(t+=e.normal.z*this.max.z,n+=e.normal.z*this.min.z),t<=-e.constant&&n>=-e.constant}intersectsTriangle(e){if(this.isEmpty())return!1;this.getCenter(sr),Do.subVectors(this.max,sr),Ms.subVectors(e.a,sr),ws.subVectors(e.b,sr),Es.subVectors(e.c,sr),Si.subVectors(ws,Ms),Mi.subVectors(Es,ws),Yi.subVectors(Ms,Es);let t=[0,-Si.z,Si.y,0,-Mi.z,Mi.y,0,-Yi.z,Yi.y,Si.z,0,-Si.x,Mi.z,0,-Mi.x,Yi.z,0,-Yi.x,-Si.y,Si.x,0,-Mi.y,Mi.x,0,-Yi.y,Yi.x,0];return!Hc(t,Ms,ws,Es,Do)||(t=[1,0,0,0,1,0,0,0,1],!Hc(t,Ms,ws,Es,Do))?!1:(Fo.crossVectors(Si,Mi),t=[Fo.x,Fo.y,Fo.z],Hc(t,Ms,ws,Es,Do))}clampPoint(e,t){return t.copy(e).clamp(this.min,this.max)}distanceToPoint(e){return this.clampPoint(e,Tn).distanceTo(e)}getBoundingSphere(e){return this.isEmpty()?e.makeEmpty():(this.getCenter(e.center),e.radius=this.getSize(Tn).length()*.5),e}intersect(e){return this.min.max(e.min),this.max.min(e.max),this.isEmpty()&&this.makeEmpty(),this}union(e){return this.min.min(e.min),this.max.max(e.max),this}applyMatrix4(e){return this.isEmpty()?this:(ri[0].set(this.min.x,this.min.y,this.min.z).applyMatrix4(e),ri[1].set(this.min.x,this.min.y,this.max.z).applyMatrix4(e),ri[2].set(this.min.x,this.max.y,this.min.z).applyMatrix4(e),ri[3].set(this.min.x,this.max.y,this.max.z).applyMatrix4(e),ri[4].set(this.max.x,this.min.y,this.min.z).applyMatrix4(e),ri[5].set(this.max.x,this.min.y,this.max.z).applyMatrix4(e),ri[6].set(this.max.x,this.max.y,this.min.z).applyMatrix4(e),ri[7].set(this.max.x,this.max.y,this.max.z).applyMatrix4(e),this.setFromPoints(ri),this)}translate(e){return this.min.add(e),this.max.add(e),this}equals(e){return e.min.equals(this.min)&&e.max.equals(this.max)}toJSON(){return{min:this.min.toArray(),max:this.max.toArray()}}fromJSON(e){return this.min.fromArray(e.min),this.max.fromArray(e.max),this}},ri=[new L,new L,new L,new L,new L,new L,new L,new L],Tn=new L,Lo=new dn,Ms=new L,ws=new L,Es=new L,Si=new L,Mi=new L,Yi=new L,sr=new L,Do=new L,Fo=new L,Zi=new L;function Hc(i,e,t,n,s){for(let r=0,o=i.length-3;r<=o;r+=3){Zi.fromArray(i,r);let a=s.x*Math.abs(Zi.x)+s.y*Math.abs(Zi.y)+s.z*Math.abs(Zi.z),l=e.dot(Zi),c=t.dot(Zi),h=n.dot(Zi);if(Math.max(-Math.max(l,c,h),Math.min(l,c,h))>a)return!1}return!0}var Tt=new L,Uo=new xe,Zm=0,sn=class extends qn{constructor(e,t,n=!1){if(super(),Array.isArray(e))throw new TypeError("THREE.BufferAttribute: array should be a Typed Array.");this.isBufferAttribute=!0,Object.defineProperty(this,"id",{value:Zm++}),this.name="",this.array=e,this.itemSize=t,this.count=e!==void 0?e.length/t:0,this.normalized=n,this.usage=fa,this.updateRanges=[],this.gpuType=Un,this.version=0}onUploadCallback(){}set needsUpdate(e){e===!0&&this.version++}setUsage(e){return this.usage=e,this}addUpdateRange(e,t){this.updateRanges.push({start:e,count:t})}clearUpdateRanges(){this.updateRanges.length=0}copy(e){return this.name=e.name,this.array=new e.array.constructor(e.array),this.itemSize=e.itemSize,this.count=e.count,this.normalized=e.normalized,this.usage=e.usage,this.gpuType=e.gpuType,this}copyAt(e,t,n){e*=this.itemSize,n*=t.itemSize;for(let s=0,r=this.itemSize;s<r;s++)this.array[e+s]=t.array[n+s];return this}copyArray(e){return this.array.set(e),this}applyMatrix3(e){if(this.itemSize===2)for(let t=0,n=this.count;t<n;t++)Uo.fromBufferAttribute(this,t),Uo.applyMatrix3(e),this.setXY(t,Uo.x,Uo.y);else if(this.itemSize===3)for(let t=0,n=this.count;t<n;t++)Tt.fromBufferAttribute(this,t),Tt.applyMatrix3(e),this.setXYZ(t,Tt.x,Tt.y,Tt.z);return this}applyMatrix4(e){for(let t=0,n=this.count;t<n;t++)Tt.fromBufferAttribute(this,t),Tt.applyMatrix4(e),this.setXYZ(t,Tt.x,Tt.y,Tt.z);return this}applyNormalMatrix(e){for(let t=0,n=this.count;t<n;t++)Tt.fromBufferAttribute(this,t),Tt.applyNormalMatrix(e),this.setXYZ(t,Tt.x,Tt.y,Tt.z);return this}transformDirection(e){for(let t=0,n=this.count;t<n;t++)Tt.fromBufferAttribute(this,t),Tt.transformDirection(e),this.setXYZ(t,Tt.x,Tt.y,Tt.z);return this}set(e,t=0){return this.array.set(e,t),this}getComponent(e,t){let n=this.array[e*this.itemSize+t];return this.normalized&&(n=An(n,this.array)),n}setComponent(e,t,n){return this.normalized&&(n=tt(n,this.array)),this.array[e*this.itemSize+t]=n,this}getX(e){let t=this.array[e*this.itemSize];return this.normalized&&(t=An(t,this.array)),t}setX(e,t){return this.normalized&&(t=tt(t,this.array)),this.array[e*this.itemSize]=t,this}getY(e){let t=this.array[e*this.itemSize+1];return this.normalized&&(t=An(t,this.array)),t}setY(e,t){return this.normalized&&(t=tt(t,this.array)),this.array[e*this.itemSize+1]=t,this}getZ(e){let t=this.array[e*this.itemSize+2];return this.normalized&&(t=An(t,this.array)),t}setZ(e,t){return this.normalized&&(t=tt(t,this.array)),this.array[e*this.itemSize+2]=t,this}getW(e){let t=this.array[e*this.itemSize+3];return this.normalized&&(t=An(t,this.array)),t}setW(e,t){return this.normalized&&(t=tt(t,this.array)),this.array[e*this.itemSize+3]=t,this}setXY(e,t,n){return e*=this.itemSize,this.normalized&&(t=tt(t,this.array),n=tt(n,this.array)),this.array[e+0]=t,this.array[e+1]=n,this}setXYZ(e,t,n,s){return e*=this.itemSize,this.normalized&&(t=tt(t,this.array),n=tt(n,this.array),s=tt(s,this.array)),this.array[e+0]=t,this.array[e+1]=n,this.array[e+2]=s,this}setXYZW(e,t,n,s,r){return e*=this.itemSize,this.normalized&&(t=tt(t,this.array),n=tt(n,this.array),s=tt(s,this.array),r=tt(r,this.array)),this.array[e+0]=t,this.array[e+1]=n,this.array[e+2]=s,this.array[e+3]=r,this}onUpload(e){return this.onUploadCallback=e,this}clone(){return new this.constructor(this.array,this.itemSize).copy(this)}toJSON(){let e={itemSize:this.itemSize,type:this.array.constructor.name,array:Array.from(this.array),normalized:this.normalized};return this.name!==""&&(e.name=this.name),this.usage!==fa&&(e.usage=this.usage),e}dispose(){this.dispatchEvent({type:"dispose"})}};var Sr=class extends sn{constructor(e,t,n){super(new Uint16Array(e),t,n)}};var Mr=class extends sn{constructor(e,t,n){super(new Uint32Array(e),t,n)}};var nt=class extends sn{constructor(e,t,n){super(new Float32Array(e),t,n)}},$m=new dn,rr=new L,Gc=new L,Cn=class{constructor(e=new L,t=-1){this.isSphere=!0,this.center=e,this.radius=t}set(e,t){return this.center.copy(e),this.radius=t,this}setFromPoints(e,t){let n=this.center;t!==void 0?n.copy(t):$m.setFromPoints(e).getCenter(n);let s=0;for(let r=0,o=e.length;r<o;r++)s=Math.max(s,n.distanceToSquared(e[r]));return this.radius=Math.sqrt(s),this}copy(e){return this.center.copy(e.center),this.radius=e.radius,this}isEmpty(){return this.radius<0}makeEmpty(){return this.center.set(0,0,0),this.radius=-1,this}containsPoint(e){return e.distanceToSquared(this.center)<=this.radius*this.radius}distanceToPoint(e){return e.distanceTo(this.center)-this.radius}intersectsSphere(e){let t=this.radius+e.radius;return e.center.distanceToSquared(this.center)<=t*t}intersectsBox(e){return e.intersectsSphere(this)}intersectsPlane(e){return Math.abs(e.distanceToPoint(this.center))<=this.radius}clampPoint(e,t){let n=this.center.distanceToSquared(e);return t.copy(e),n>this.radius*this.radius&&(t.sub(this.center).normalize(),t.multiplyScalar(this.radius).add(this.center)),t}getBoundingBox(e){return this.isEmpty()?(e.makeEmpty(),e):(e.set(this.center,this.center),e.expandByScalar(this.radius),e)}applyMatrix4(e){return this.center.applyMatrix4(e),this.radius=this.radius*e.getMaxScaleOnAxis(),this}translate(e){return this.center.add(e),this}expandByPoint(e){if(this.isEmpty())return this.center.copy(e),this.radius=0,this;rr.subVectors(e,this.center);let t=rr.lengthSq();if(t>this.radius*this.radius){let n=Math.sqrt(t),s=(n-this.radius)*.5;this.center.addScaledVector(rr,s/n),this.radius+=s}return this}union(e){return e.isEmpty()?this:this.isEmpty()?(this.copy(e),this):(this.center.equals(e.center)===!0?this.radius=Math.max(this.radius,e.radius):(Gc.subVectors(e.center,this.center).setLength(e.radius),this.expandByPoint(rr.copy(e.center).add(Gc)),this.expandByPoint(rr.copy(e.center).sub(Gc))),this)}equals(e){return e.center.equals(this.center)&&e.radius===this.radius}clone(){return new this.constructor().copy(this)}toJSON(){return{radius:this.radius,center:this.center.toArray()}}fromJSON(e){return this.radius=e.radius,this.center.fromArray(e.center),this}},Km=0,bn=new rt,Wc=new un,Ts=new L,cn=new dn,or=new dn,Nt=new L,It=class i extends qn{constructor(){super(),this.isBufferGeometry=!0,Object.defineProperty(this,"id",{value:Km++}),this.uuid=Wn(),this.name="",this.type="BufferGeometry",this.index=null,this.indirect=null,this.indirectOffset=0,this.attributes={},this.morphAttributes={},this.morphTargetsRelative=!1,this.groups=[],this.boundingBox=null,this.boundingSphere=null,this.drawRange={start:0,count:1/0},this.userData={},this._transformed=!1}getIndex(){return this.index}setIndex(e){return Array.isArray(e)?this.index=new(_m(e)?Mr:Sr)(e,1):this.index=e,this}setIndirect(e,t=0){return this.indirect=e,this.indirectOffset=t,this}getIndirect(){return this.indirect}getAttribute(e){return this.attributes[e]}setAttribute(e,t){return this.attributes[e]=t,this}deleteAttribute(e){return delete this.attributes[e],this}hasAttribute(e){return this.attributes[e]!==void 0}addGroup(e,t,n=0){this.groups.push({start:e,count:t,materialIndex:n})}clearGroups(){this.groups=[]}setDrawRange(e,t){this.drawRange.start=e,this.drawRange.count=t}applyMatrix4(e){let t=this.attributes.position;t!==void 0&&(t.applyMatrix4(e),t.needsUpdate=!0);let n=this.attributes.normal;if(n!==void 0){let r=new Ne().getNormalMatrix(e);n.applyNormalMatrix(r),n.needsUpdate=!0}let s=this.attributes.tangent;return s!==void 0&&(s.transformDirection(e),s.needsUpdate=!0),this.boundingBox!==null&&this.computeBoundingBox(),this.boundingSphere!==null&&this.computeBoundingSphere(),this._transformed=!0,this}applyQuaternion(e){return bn.makeRotationFromQuaternion(e),this.applyMatrix4(bn),this}rotateX(e){return bn.makeRotationX(e),this.applyMatrix4(bn),this}rotateY(e){return bn.makeRotationY(e),this.applyMatrix4(bn),this}rotateZ(e){return bn.makeRotationZ(e),this.applyMatrix4(bn),this}translate(e,t,n){return bn.makeTranslation(e,t,n),this.applyMatrix4(bn),this}scale(e,t,n){return bn.makeScale(e,t,n),this.applyMatrix4(bn),this}lookAt(e){return Wc.lookAt(e),Wc.updateMatrix(),this.applyMatrix4(Wc.matrix),this}center(){return this.computeBoundingBox(),this.boundingBox.getCenter(Ts).negate(),this.translate(Ts.x,Ts.y,Ts.z),this}setFromPoints(e){let t=this.getAttribute("position");if(t===void 0){let n=[];for(let s=0,r=e.length;s<r;s++){let o=e[s];n.push(o.x,o.y,o.z||0)}this.setAttribute("position",new nt(n,3))}else{let n=Math.min(e.length,t.count);for(let s=0;s<n;s++){let r=e[s];t.setXYZ(s,r.x,r.y,r.z||0)}e.length>t.count&&Pe("BufferGeometry: Buffer size too small for points data. Use .dispose() and create a new geometry."),t.needsUpdate=!0}return this}computeBoundingBox(){this.boundingBox===null&&(this.boundingBox=new dn);let e=this.attributes.position,t=this.morphAttributes.position;if(e&&e.isGLBufferAttribute){Le("BufferGeometry.computeBoundingBox(): GLBufferAttribute requires a manual bounding box.",this),this.boundingBox.set(new L(-1/0,-1/0,-1/0),new L(1/0,1/0,1/0));return}if(e!==void 0){if(this.boundingBox.setFromBufferAttribute(e),t)for(let n=0,s=t.length;n<s;n++){let r=t[n];cn.setFromBufferAttribute(r),this.morphTargetsRelative?(Nt.addVectors(this.boundingBox.min,cn.min),this.boundingBox.expandByPoint(Nt),Nt.addVectors(this.boundingBox.max,cn.max),this.boundingBox.expandByPoint(Nt)):(this.boundingBox.expandByPoint(cn.min),this.boundingBox.expandByPoint(cn.max))}}else this.boundingBox.makeEmpty();(isNaN(this.boundingBox.min.x)||isNaN(this.boundingBox.min.y)||isNaN(this.boundingBox.min.z))&&Le('BufferGeometry.computeBoundingBox(): Computed min/max have NaN values. The "position" attribute is likely to have NaN values.',this)}computeBoundingSphere(){this.boundingSphere===null&&(this.boundingSphere=new Cn);let e=this.attributes.position,t=this.morphAttributes.position;if(e&&e.isGLBufferAttribute){Le("BufferGeometry.computeBoundingSphere(): GLBufferAttribute requires a manual bounding sphere.",this),this.boundingSphere.set(new L,1/0);return}if(e){let n=this.boundingSphere.center;if(cn.setFromBufferAttribute(e),t)for(let r=0,o=t.length;r<o;r++){let a=t[r];or.setFromBufferAttribute(a),this.morphTargetsRelative?(Nt.addVectors(cn.min,or.min),cn.expandByPoint(Nt),Nt.addVectors(cn.max,or.max),cn.expandByPoint(Nt)):(cn.expandByPoint(or.min),cn.expandByPoint(or.max))}cn.getCenter(n);let s=0;for(let r=0,o=e.count;r<o;r++)Nt.fromBufferAttribute(e,r),s=Math.max(s,n.distanceToSquared(Nt));if(t)for(let r=0,o=t.length;r<o;r++){let a=t[r],l=this.morphTargetsRelative;for(let c=0,h=a.count;c<h;c++)Nt.fromBufferAttribute(a,c),l&&(Ts.fromBufferAttribute(e,c),Nt.add(Ts)),s=Math.max(s,n.distanceToSquared(Nt))}this.boundingSphere.radius=Math.sqrt(s),isNaN(this.boundingSphere.radius)&&Le('BufferGeometry.computeBoundingSphere(): Computed radius is NaN. The "position" attribute is likely to have NaN values.',this)}}computeTangents(){let e=this.index,t=this.attributes;if(e===null||t.position===void 0||t.normal===void 0||t.uv===void 0){Le("BufferGeometry: .computeTangents() failed. Missing required attributes (index, position, normal or uv)");return}let n=t.position,s=t.normal,r=t.uv,o=this.getAttribute("tangent");(o===void 0||o.count!==n.count)&&(o=new sn(new Float32Array(4*n.count),4),this.setAttribute("tangent",o));let a=[],l=[];for(let y=0;y<n.count;y++)a[y]=new L,l[y]=new L;let c=new L,h=new L,d=new L,u=new xe,f=new xe,m=new xe,x=new L,g=new L;function p(y,T,C){c.fromBufferAttribute(n,y),h.fromBufferAttribute(n,T),d.fromBufferAttribute(n,C),u.fromBufferAttribute(r,y),f.fromBufferAttribute(r,T),m.fromBufferAttribute(r,C),h.sub(c),d.sub(c),f.sub(u),m.sub(u);let R=1/(f.x*m.y-m.x*f.y);isFinite(R)&&(x.copy(h).multiplyScalar(m.y).addScaledVector(d,-f.y).multiplyScalar(R),g.copy(d).multiplyScalar(f.x).addScaledVector(h,-m.x).multiplyScalar(R),a[y].add(x),a[T].add(x),a[C].add(x),l[y].add(g),l[T].add(g),l[C].add(g))}let b=this.groups;b.length===0&&(b=[{start:0,count:e.count}]);for(let y=0,T=b.length;y<T;++y){let C=b[y],R=C.start,D=C.count;for(let I=R,k=R+D;I<k;I+=3)p(e.getX(I+0),e.getX(I+1),e.getX(I+2))}let S=new L,_=new L,A=new L,w=new L;function E(y){A.fromBufferAttribute(s,y),w.copy(A);let T=a[y];S.copy(T),S.sub(A.multiplyScalar(A.dot(T))).normalize(),_.crossVectors(w,T);let R=_.dot(l[y])<0?-1:1;o.setXYZW(y,S.x,S.y,S.z,R)}for(let y=0,T=b.length;y<T;++y){let C=b[y],R=C.start,D=C.count;for(let I=R,k=R+D;I<k;I+=3)E(e.getX(I+0)),E(e.getX(I+1)),E(e.getX(I+2))}this._transformed=!0}computeVertexNormals(){let e=this.index,t=this.getAttribute("position");if(t!==void 0){let n=this.getAttribute("normal");if(n===void 0||n.count!==t.count)n=new sn(new Float32Array(t.count*3),3),this.setAttribute("normal",n);else for(let u=0,f=n.count;u<f;u++)n.setXYZ(u,0,0,0);let s=new L,r=new L,o=new L,a=new L,l=new L,c=new L,h=new L,d=new L;if(e)for(let u=0,f=e.count;u<f;u+=3){let m=e.getX(u+0),x=e.getX(u+1),g=e.getX(u+2);s.fromBufferAttribute(t,m),r.fromBufferAttribute(t,x),o.fromBufferAttribute(t,g),h.subVectors(o,r),d.subVectors(s,r),h.cross(d),a.fromBufferAttribute(n,m),l.fromBufferAttribute(n,x),c.fromBufferAttribute(n,g),a.add(h),l.add(h),c.add(h),n.setXYZ(m,a.x,a.y,a.z),n.setXYZ(x,l.x,l.y,l.z),n.setXYZ(g,c.x,c.y,c.z)}else for(let u=0,f=t.count;u<f;u+=3)s.fromBufferAttribute(t,u+0),r.fromBufferAttribute(t,u+1),o.fromBufferAttribute(t,u+2),h.subVectors(o,r),d.subVectors(s,r),h.cross(d),n.setXYZ(u+0,h.x,h.y,h.z),n.setXYZ(u+1,h.x,h.y,h.z),n.setXYZ(u+2,h.x,h.y,h.z);this.normalizeNormals(),n.needsUpdate=!0}}normalizeNormals(){let e=this.attributes.normal;for(let t=0,n=e.count;t<n;t++)Nt.fromBufferAttribute(e,t),Nt.normalize(),e.setXYZ(t,Nt.x,Nt.y,Nt.z)}toNonIndexed(){function e(a,l){let c=a.array,h=a.itemSize,d=a.normalized,u=new c.constructor(l.length*h),f=0,m=0;for(let x=0,g=l.length;x<g;x++){a.isInterleavedBufferAttribute?f=l[x]*a.data.stride+a.offset:f=l[x]*h;for(let p=0;p<h;p++)u[m++]=c[f++]}return new sn(u,h,d)}if(this.index===null)return Pe("BufferGeometry.toNonIndexed(): BufferGeometry is already non-indexed."),this;let t=new i,n=this.index.array,s=this.attributes;for(let a in s){let l=s[a],c=e(l,n);t.setAttribute(a,c)}let r=this.morphAttributes;for(let a in r){let l=[],c=r[a];for(let h=0,d=c.length;h<d;h++){let u=c[h],f=e(u,n);l.push(f)}t.morphAttributes[a]=l}t.morphTargetsRelative=this.morphTargetsRelative;let o=this.groups;for(let a=0,l=o.length;a<l;a++){let c=o[a];t.addGroup(c.start,c.count,c.materialIndex)}return t}toJSON(){let e={metadata:{version:4.7,type:"BufferGeometry",generator:"BufferGeometry.toJSON"}};if(e.uuid=this.uuid,e.type=this.parameters!==void 0&&this._transformed===!0?"BufferGeometry":this.type,this.name!==""&&(e.name=this.name),Object.keys(this.userData).length>0&&(e.userData=this.userData),this.parameters!==void 0&&this._transformed!==!0){let l=this.parameters;for(let c in l)l[c]!==void 0&&(e[c]=l[c]);return e}e.data={attributes:{}};let t=this.index;t!==null&&(e.data.index={type:t.array.constructor.name,array:Array.prototype.slice.call(t.array)});let n=this.attributes;for(let l in n){let c=n[l];e.data.attributes[l]=c.toJSON(e.data)}let s={},r=!1;for(let l in this.morphAttributes){let c=this.morphAttributes[l],h=[];for(let d=0,u=c.length;d<u;d++){let f=c[d];h.push(f.toJSON(e.data))}h.length>0&&(s[l]=h,r=!0)}r&&(e.data.morphAttributes=s,e.data.morphTargetsRelative=this.morphTargetsRelative);let o=this.groups;o.length>0&&(e.data.groups=JSON.parse(JSON.stringify(o)));let a=this.boundingSphere;return a!==null&&(e.data.boundingSphere=a.toJSON()),e}clone(){return new this.constructor().copy(this)}copy(e){this.index=null,this.attributes={},this.morphAttributes={},this.groups=[],this.boundingBox=null,this.boundingSphere=null;let t={};this.name=e.name;let n=e.index;n!==null&&this.setIndex(n.clone());let s=e.attributes;for(let c in s){let h=s[c];this.setAttribute(c,h.clone(t))}let r=e.morphAttributes;for(let c in r){let h=[],d=r[c];for(let u=0,f=d.length;u<f;u++)h.push(d[u].clone(t));this.morphAttributes[c]=h}this.morphTargetsRelative=e.morphTargetsRelative;let o=e.groups;for(let c=0,h=o.length;c<h;c++){let d=o[c];this.addGroup(d.start,d.count,d.materialIndex)}let a=e.boundingBox;a!==null&&(this.boundingBox=a.clone());let l=e.boundingSphere;return l!==null&&(this.boundingSphere=l.clone()),this.drawRange.start=e.drawRange.start,this.drawRange.count=e.drawRange.count,this.userData=e.userData,this._transformed=e._transformed,this}dispose(){this.dispatchEvent({type:"dispose"})}},xa=class{constructor(e,t){this.isInterleavedBuffer=!0,this.array=e,this.stride=t,this.count=e!==void 0?e.length/t:0,this.usage=fa,this.updateRanges=[],this.version=0,this.uuid=Wn()}onUploadCallback(){}set needsUpdate(e){e===!0&&this.version++}setUsage(e){return this.usage=e,this}addUpdateRange(e,t){this.updateRanges.push({start:e,count:t})}clearUpdateRanges(){this.updateRanges.length=0}copy(e){return this.array=new e.array.constructor(e.array),this.count=e.count,this.stride=e.stride,this.usage=e.usage,this}copyAt(e,t,n){e*=this.stride,n*=t.stride;for(let s=0,r=this.stride;s<r;s++)this.array[e+s]=t.array[n+s];return this}set(e,t=0){return this.array.set(e,t),this}clone(e){e.arrayBuffers===void 0&&(e.arrayBuffers={}),this.array.buffer._uuid===void 0&&(this.array.buffer._uuid=Wn()),e.arrayBuffers[this.array.buffer._uuid]===void 0&&(e.arrayBuffers[this.array.buffer._uuid]=this.array.slice(0).buffer);let t=new this.array.constructor(e.arrayBuffers[this.array.buffer._uuid]),n=new this.constructor(t,this.stride);return n.setUsage(this.usage),n}onUpload(e){return this.onUploadCallback=e,this}toJSON(e){return e.arrayBuffers===void 0&&(e.arrayBuffers={}),this.array.buffer._uuid===void 0&&(this.array.buffer._uuid=Wn()),e.arrayBuffers[this.array.buffer._uuid]===void 0&&(e.arrayBuffers[this.array.buffer._uuid]=Array.from(new Uint32Array(this.array.buffer))),{uuid:this.uuid,buffer:this.array.buffer._uuid,type:this.array.constructor.name,stride:this.stride}}},Zt=new L,In=class i{constructor(e,t,n,s=!1){this.isInterleavedBufferAttribute=!0,this.name="",this.data=e,this.itemSize=t,this.offset=n,this.normalized=s}get count(){return this.data.count}get array(){return this.data.array}set needsUpdate(e){this.data.needsUpdate=e}applyMatrix4(e){for(let t=0,n=this.data.count;t<n;t++)Zt.fromBufferAttribute(this,t),Zt.applyMatrix4(e),this.setXYZ(t,Zt.x,Zt.y,Zt.z);return this}applyNormalMatrix(e){for(let t=0,n=this.count;t<n;t++)Zt.fromBufferAttribute(this,t),Zt.applyNormalMatrix(e),this.setXYZ(t,Zt.x,Zt.y,Zt.z);return this}transformDirection(e){for(let t=0,n=this.count;t<n;t++)Zt.fromBufferAttribute(this,t),Zt.transformDirection(e),this.setXYZ(t,Zt.x,Zt.y,Zt.z);return this}getComponent(e,t){let n=this.array[e*this.data.stride+this.offset+t];return this.normalized&&(n=An(n,this.array)),n}setComponent(e,t,n){return this.normalized&&(n=tt(n,this.array)),this.data.array[e*this.data.stride+this.offset+t]=n,this}setX(e,t){return this.normalized&&(t=tt(t,this.array)),this.data.array[e*this.data.stride+this.offset]=t,this}setY(e,t){return this.normalized&&(t=tt(t,this.array)),this.data.array[e*this.data.stride+this.offset+1]=t,this}setZ(e,t){return this.normalized&&(t=tt(t,this.array)),this.data.array[e*this.data.stride+this.offset+2]=t,this}setW(e,t){return this.normalized&&(t=tt(t,this.array)),this.data.array[e*this.data.stride+this.offset+3]=t,this}getX(e){let t=this.data.array[e*this.data.stride+this.offset];return this.normalized&&(t=An(t,this.array)),t}getY(e){let t=this.data.array[e*this.data.stride+this.offset+1];return this.normalized&&(t=An(t,this.array)),t}getZ(e){let t=this.data.array[e*this.data.stride+this.offset+2];return this.normalized&&(t=An(t,this.array)),t}getW(e){let t=this.data.array[e*this.data.stride+this.offset+3];return this.normalized&&(t=An(t,this.array)),t}setXY(e,t,n){return e=e*this.data.stride+this.offset,this.normalized&&(t=tt(t,this.array),n=tt(n,this.array)),this.data.array[e+0]=t,this.data.array[e+1]=n,this}setXYZ(e,t,n,s){return e=e*this.data.stride+this.offset,this.normalized&&(t=tt(t,this.array),n=tt(n,this.array),s=tt(s,this.array)),this.data.array[e+0]=t,this.data.array[e+1]=n,this.data.array[e+2]=s,this}setXYZW(e,t,n,s,r){return e=e*this.data.stride+this.offset,this.normalized&&(t=tt(t,this.array),n=tt(n,this.array),s=tt(s,this.array),r=tt(r,this.array)),this.data.array[e+0]=t,this.data.array[e+1]=n,this.data.array[e+2]=s,this.data.array[e+3]=r,this}clone(e){if(e===void 0){yr("InterleavedBufferAttribute.clone(): Cloning an interleaved buffer attribute will de-interleave buffer data.");let t=[];for(let n=0;n<this.count;n++){let s=n*this.data.stride+this.offset;for(let r=0;r<this.itemSize;r++)t.push(this.data.array[s+r])}return new sn(new this.array.constructor(t),this.itemSize,this.normalized)}else return e.interleavedBuffers===void 0&&(e.interleavedBuffers={}),e.interleavedBuffers[this.data.uuid]===void 0&&(e.interleavedBuffers[this.data.uuid]=this.data.clone(e)),new i(e.interleavedBuffers[this.data.uuid],this.itemSize,this.offset,this.normalized)}toJSON(e){if(e===void 0){yr("InterleavedBufferAttribute.toJSON(): Serializing an interleaved buffer attribute will de-interleave buffer data.");let t=[];for(let n=0;n<this.count;n++){let s=n*this.data.stride+this.offset;for(let r=0;r<this.itemSize;r++)t.push(this.data.array[s+r])}return{itemSize:this.itemSize,type:this.array.constructor.name,array:t,normalized:this.normalized}}else return e.interleavedBuffers===void 0&&(e.interleavedBuffers={}),e.interleavedBuffers[this.data.uuid]===void 0&&(e.interleavedBuffers[this.data.uuid]=this.data.toJSON(e)),{isInterleavedBufferAttribute:!0,itemSize:this.itemSize,data:this.data.uuid,offset:this.offset,normalized:this.normalized}}},Jm=0,Ci=class extends qn{constructor(){super(),this.isMaterial=!0,Object.defineProperty(this,"id",{value:Jm++}),this.uuid=Wn(),this.name="",this.type="Material",this.blending=Qi,this.side=li,this.vertexColors=!1,this.opacity=1,this.transparent=!1,this.alphaHash=!1,this.blendSrc=ta,this.blendDst=na,this.blendEquation=Pi,this.blendSrcAlpha=null,this.blendDstAlpha=null,this.blendEquationAlpha=null,this.blendColor=new qe(0,0,0),this.blendAlpha=0,this.depthFunc=es,this.depthTest=!0,this.depthWrite=!0,this.stencilWriteMask=255,this.stencilFunc=rh,this.stencilRef=0,this.stencilFuncMask=255,this.stencilFail=Ji,this.stencilZFail=Ji,this.stencilZPass=Ji,this.stencilWrite=!1,this.clippingPlanes=null,this.clipIntersection=!1,this.clipShadows=!1,this.shadowSide=null,this.colorWrite=!0,this.precision=null,this.polygonOffset=!1,this.polygonOffsetFactor=0,this.polygonOffsetUnits=0,this.dithering=!1,this.alphaToCoverage=!1,this.premultipliedAlpha=!1,this.forceSinglePass=!1,this.allowOverride=!0,this.visible=!0,this.toneMapped=!0,this.userData={},this.version=0,this._alphaTest=0}get alphaTest(){return this._alphaTest}set alphaTest(e){this._alphaTest>0!=e>0&&this.version++,this._alphaTest=e}onBeforeRender(){}onBeforeCompile(){}customProgramCacheKey(){return this.onBeforeCompile.toString()}setValues(e){if(e!==void 0)for(let t in e){let n=e[t];if(n===void 0){Pe(`Material: parameter '${t}' has value of undefined.`);continue}let s=this[t];if(s===void 0){Pe(`Material: '${t}' is not a property of THREE.${this.type}.`);continue}s&&s.isColor?s.set(n):s&&s.isVector2&&n&&n.isVector2||s&&s.isEuler&&n&&n.isEuler||s&&s.isVector3&&n&&n.isVector3?s.copy(n):this[t]=n}}toJSON(e){let t=e===void 0||typeof e=="string";t&&(e={textures:{},images:{}});let n={metadata:{version:4.7,type:"Material",generator:"Material.toJSON"}};n.uuid=this.uuid,n.type=this.type,this.name!==""&&(n.name=this.name),this.color&&this.color.isColor&&(n.color=this.color.getHex()),this.roughness!==void 0&&(n.roughness=this.roughness),this.metalness!==void 0&&(n.metalness=this.metalness),this.sheen!==void 0&&(n.sheen=this.sheen),this.sheenColor&&this.sheenColor.isColor&&(n.sheenColor=this.sheenColor.getHex()),this.sheenRoughness!==void 0&&(n.sheenRoughness=this.sheenRoughness),this.emissive&&this.emissive.isColor&&(n.emissive=this.emissive.getHex()),this.emissiveIntensity!==void 0&&this.emissiveIntensity!==1&&(n.emissiveIntensity=this.emissiveIntensity),this.specular&&this.specular.isColor&&(n.specular=this.specular.getHex()),this.specularIntensity!==void 0&&(n.specularIntensity=this.specularIntensity),this.specularColor&&this.specularColor.isColor&&(n.specularColor=this.specularColor.getHex()),this.shininess!==void 0&&(n.shininess=this.shininess),this.clearcoat!==void 0&&(n.clearcoat=this.clearcoat),this.clearcoatRoughness!==void 0&&(n.clearcoatRoughness=this.clearcoatRoughness),this.clearcoatMap&&this.clearcoatMap.isTexture&&(n.clearcoatMap=this.clearcoatMap.toJSON(e).uuid),this.clearcoatRoughnessMap&&this.clearcoatRoughnessMap.isTexture&&(n.clearcoatRoughnessMap=this.clearcoatRoughnessMap.toJSON(e).uuid),this.clearcoatNormalMap&&this.clearcoatNormalMap.isTexture&&(n.clearcoatNormalMap=this.clearcoatNormalMap.toJSON(e).uuid,n.clearcoatNormalScale=this.clearcoatNormalScale.toArray()),this.sheenColorMap&&this.sheenColorMap.isTexture&&(n.sheenColorMap=this.sheenColorMap.toJSON(e).uuid),this.sheenRoughnessMap&&this.sheenRoughnessMap.isTexture&&(n.sheenRoughnessMap=this.sheenRoughnessMap.toJSON(e).uuid),this.dispersion!==void 0&&(n.dispersion=this.dispersion),this.iridescence!==void 0&&(n.iridescence=this.iridescence),this.iridescenceIOR!==void 0&&(n.iridescenceIOR=this.iridescenceIOR),this.iridescenceThicknessRange!==void 0&&(n.iridescenceThicknessRange=this.iridescenceThicknessRange),this.iridescenceMap&&this.iridescenceMap.isTexture&&(n.iridescenceMap=this.iridescenceMap.toJSON(e).uuid),this.iridescenceThicknessMap&&this.iridescenceThicknessMap.isTexture&&(n.iridescenceThicknessMap=this.iridescenceThicknessMap.toJSON(e).uuid),this.anisotropy!==void 0&&(n.anisotropy=this.anisotropy),this.anisotropyRotation!==void 0&&(n.anisotropyRotation=this.anisotropyRotation),this.anisotropyMap&&this.anisotropyMap.isTexture&&(n.anisotropyMap=this.anisotropyMap.toJSON(e).uuid),this.map&&this.map.isTexture&&(n.map=this.map.toJSON(e).uuid),this.matcap&&this.matcap.isTexture&&(n.matcap=this.matcap.toJSON(e).uuid),this.alphaMap&&this.alphaMap.isTexture&&(n.alphaMap=this.alphaMap.toJSON(e).uuid),this.lightMap&&this.lightMap.isTexture&&(n.lightMap=this.lightMap.toJSON(e).uuid,n.lightMapIntensity=this.lightMapIntensity),this.aoMap&&this.aoMap.isTexture&&(n.aoMap=this.aoMap.toJSON(e).uuid,n.aoMapIntensity=this.aoMapIntensity),this.bumpMap&&this.bumpMap.isTexture&&(n.bumpMap=this.bumpMap.toJSON(e).uuid,n.bumpScale=this.bumpScale),this.normalMap&&this.normalMap.isTexture&&(n.normalMap=this.normalMap.toJSON(e).uuid,n.normalMapType=this.normalMapType,n.normalScale=this.normalScale.toArray()),this.displacementMap&&this.displacementMap.isTexture&&(n.displacementMap=this.displacementMap.toJSON(e).uuid,n.displacementScale=this.displacementScale,n.displacementBias=this.displacementBias),this.roughnessMap&&this.roughnessMap.isTexture&&(n.roughnessMap=this.roughnessMap.toJSON(e).uuid),this.metalnessMap&&this.metalnessMap.isTexture&&(n.metalnessMap=this.metalnessMap.toJSON(e).uuid),this.emissiveMap&&this.emissiveMap.isTexture&&(n.emissiveMap=this.emissiveMap.toJSON(e).uuid),this.specularMap&&this.specularMap.isTexture&&(n.specularMap=this.specularMap.toJSON(e).uuid),this.specularIntensityMap&&this.specularIntensityMap.isTexture&&(n.specularIntensityMap=this.specularIntensityMap.toJSON(e).uuid),this.specularColorMap&&this.specularColorMap.isTexture&&(n.specularColorMap=this.specularColorMap.toJSON(e).uuid),this.envMap&&this.envMap.isTexture&&(n.envMap=this.envMap.toJSON(e).uuid,this.combine!==void 0&&(n.combine=this.combine)),this.envMapRotation!==void 0&&(n.envMapRotation=this.envMapRotation.toArray()),this.envMapIntensity!==void 0&&(n.envMapIntensity=this.envMapIntensity),this.reflectivity!==void 0&&(n.reflectivity=this.reflectivity),this.refractionRatio!==void 0&&(n.refractionRatio=this.refractionRatio),this.gradientMap&&this.gradientMap.isTexture&&(n.gradientMap=this.gradientMap.toJSON(e).uuid),this.transmission!==void 0&&(n.transmission=this.transmission),this.transmissionMap&&this.transmissionMap.isTexture&&(n.transmissionMap=this.transmissionMap.toJSON(e).uuid),this.thickness!==void 0&&(n.thickness=this.thickness),this.thicknessMap&&this.thicknessMap.isTexture&&(n.thicknessMap=this.thicknessMap.toJSON(e).uuid),this.attenuationDistance!==void 0&&this.attenuationDistance!==1/0&&(n.attenuationDistance=this.attenuationDistance),this.attenuationColor!==void 0&&(n.attenuationColor=this.attenuationColor.getHex()),this.size!==void 0&&(n.size=this.size),this.shadowSide!==null&&(n.shadowSide=this.shadowSide),this.sizeAttenuation!==void 0&&(n.sizeAttenuation=this.sizeAttenuation),this.blending!==Qi&&(n.blending=this.blending),this.side!==li&&(n.side=this.side),this.vertexColors===!0&&(n.vertexColors=!0),this.opacity<1&&(n.opacity=this.opacity),this.transparent===!0&&(n.transparent=!0),this.blendSrc!==ta&&(n.blendSrc=this.blendSrc),this.blendDst!==na&&(n.blendDst=this.blendDst),this.blendEquation!==Pi&&(n.blendEquation=this.blendEquation),this.blendSrcAlpha!==null&&(n.blendSrcAlpha=this.blendSrcAlpha),this.blendDstAlpha!==null&&(n.blendDstAlpha=this.blendDstAlpha),this.blendEquationAlpha!==null&&(n.blendEquationAlpha=this.blendEquationAlpha),this.blendColor&&this.blendColor.isColor&&(n.blendColor=this.blendColor.getHex()),this.blendAlpha!==0&&(n.blendAlpha=this.blendAlpha),this.depthFunc!==es&&(n.depthFunc=this.depthFunc),this.depthTest===!1&&(n.depthTest=this.depthTest),this.depthWrite===!1&&(n.depthWrite=this.depthWrite),this.colorWrite===!1&&(n.colorWrite=this.colorWrite),this.stencilWriteMask!==255&&(n.stencilWriteMask=this.stencilWriteMask),this.stencilFunc!==rh&&(n.stencilFunc=this.stencilFunc),this.stencilRef!==0&&(n.stencilRef=this.stencilRef),this.stencilFuncMask!==255&&(n.stencilFuncMask=this.stencilFuncMask),this.stencilFail!==Ji&&(n.stencilFail=this.stencilFail),this.stencilZFail!==Ji&&(n.stencilZFail=this.stencilZFail),this.stencilZPass!==Ji&&(n.stencilZPass=this.stencilZPass),this.stencilWrite===!0&&(n.stencilWrite=this.stencilWrite),this.rotation!==void 0&&this.rotation!==0&&(n.rotation=this.rotation),this.polygonOffset===!0&&(n.polygonOffset=!0),this.polygonOffsetFactor!==0&&(n.polygonOffsetFactor=this.polygonOffsetFactor),this.polygonOffsetUnits!==0&&(n.polygonOffsetUnits=this.polygonOffsetUnits),this.linewidth!==void 0&&this.linewidth!==1&&(n.linewidth=this.linewidth),this.dashSize!==void 0&&(n.dashSize=this.dashSize),this.gapSize!==void 0&&(n.gapSize=this.gapSize),this.scale!==void 0&&(n.scale=this.scale),this.dithering===!0&&(n.dithering=!0),this.alphaTest>0&&(n.alphaTest=this.alphaTest),this.alphaHash===!0&&(n.alphaHash=!0),this.alphaToCoverage===!0&&(n.alphaToCoverage=!0),this.premultipliedAlpha===!0&&(n.premultipliedAlpha=!0),this.forceSinglePass===!0&&(n.forceSinglePass=!0),this.allowOverride===!1&&(n.allowOverride=!1),this.wireframe===!0&&(n.wireframe=!0),this.wireframeLinewidth>1&&(n.wireframeLinewidth=this.wireframeLinewidth),this.wireframeLinecap!=="round"&&(n.wireframeLinecap=this.wireframeLinecap),this.wireframeLinejoin!=="round"&&(n.wireframeLinejoin=this.wireframeLinejoin),this.flatShading===!0&&(n.flatShading=!0),this.visible===!1&&(n.visible=!1),this.toneMapped===!1&&(n.toneMapped=!1),this.fog===!1&&(n.fog=!1),Object.keys(this.userData).length>0&&(n.userData=this.userData);function s(r){let o=[];for(let a in r){let l=r[a];delete l.metadata,o.push(l)}return o}if(t){let r=s(e.textures),o=s(e.images);r.length>0&&(n.textures=r),o.length>0&&(n.images=o)}return n}fromJSON(e,t){if(e.uuid!==void 0&&(this.uuid=e.uuid),e.name!==void 0&&(this.name=e.name),e.color!==void 0&&this.color!==void 0&&this.color.setHex(e.color),e.roughness!==void 0&&(this.roughness=e.roughness),e.metalness!==void 0&&(this.metalness=e.metalness),e.sheen!==void 0&&(this.sheen=e.sheen),e.sheenColor!==void 0&&(this.sheenColor=new qe().setHex(e.sheenColor)),e.sheenRoughness!==void 0&&(this.sheenRoughness=e.sheenRoughness),e.emissive!==void 0&&this.emissive!==void 0&&this.emissive.setHex(e.emissive),e.specular!==void 0&&this.specular!==void 0&&this.specular.setHex(e.specular),e.specularIntensity!==void 0&&(this.specularIntensity=e.specularIntensity),e.specularColor!==void 0&&this.specularColor!==void 0&&this.specularColor.setHex(e.specularColor),e.shininess!==void 0&&(this.shininess=e.shininess),e.clearcoat!==void 0&&(this.clearcoat=e.clearcoat),e.clearcoatRoughness!==void 0&&(this.clearcoatRoughness=e.clearcoatRoughness),e.dispersion!==void 0&&(this.dispersion=e.dispersion),e.iridescence!==void 0&&(this.iridescence=e.iridescence),e.iridescenceIOR!==void 0&&(this.iridescenceIOR=e.iridescenceIOR),e.iridescenceThicknessRange!==void 0&&(this.iridescenceThicknessRange=e.iridescenceThicknessRange),e.transmission!==void 0&&(this.transmission=e.transmission),e.thickness!==void 0&&(this.thickness=e.thickness),e.attenuationDistance!==void 0&&(this.attenuationDistance=e.attenuationDistance),e.attenuationColor!==void 0&&this.attenuationColor!==void 0&&this.attenuationColor.setHex(e.attenuationColor),e.anisotropy!==void 0&&(this.anisotropy=e.anisotropy),e.anisotropyRotation!==void 0&&(this.anisotropyRotation=e.anisotropyRotation),e.fog!==void 0&&(this.fog=e.fog),e.flatShading!==void 0&&(this.flatShading=e.flatShading),e.blending!==void 0&&(this.blending=e.blending),e.combine!==void 0&&(this.combine=e.combine),e.side!==void 0&&(this.side=e.side),e.shadowSide!==void 0&&(this.shadowSide=e.shadowSide),e.opacity!==void 0&&(this.opacity=e.opacity),e.transparent!==void 0&&(this.transparent=e.transparent),e.alphaTest!==void 0&&(this.alphaTest=e.alphaTest),e.alphaHash!==void 0&&(this.alphaHash=e.alphaHash),e.depthFunc!==void 0&&(this.depthFunc=e.depthFunc),e.depthTest!==void 0&&(this.depthTest=e.depthTest),e.depthWrite!==void 0&&(this.depthWrite=e.depthWrite),e.colorWrite!==void 0&&(this.colorWrite=e.colorWrite),e.blendSrc!==void 0&&(this.blendSrc=e.blendSrc),e.blendDst!==void 0&&(this.blendDst=e.blendDst),e.blendEquation!==void 0&&(this.blendEquation=e.blendEquation),e.blendSrcAlpha!==void 0&&(this.blendSrcAlpha=e.blendSrcAlpha),e.blendDstAlpha!==void 0&&(this.blendDstAlpha=e.blendDstAlpha),e.blendEquationAlpha!==void 0&&(this.blendEquationAlpha=e.blendEquationAlpha),e.blendColor!==void 0&&this.blendColor!==void 0&&this.blendColor.setHex(e.blendColor),e.blendAlpha!==void 0&&(this.blendAlpha=e.blendAlpha),e.stencilWriteMask!==void 0&&(this.stencilWriteMask=e.stencilWriteMask),e.stencilFunc!==void 0&&(this.stencilFunc=e.stencilFunc),e.stencilRef!==void 0&&(this.stencilRef=e.stencilRef),e.stencilFuncMask!==void 0&&(this.stencilFuncMask=e.stencilFuncMask),e.stencilFail!==void 0&&(this.stencilFail=e.stencilFail),e.stencilZFail!==void 0&&(this.stencilZFail=e.stencilZFail),e.stencilZPass!==void 0&&(this.stencilZPass=e.stencilZPass),e.stencilWrite!==void 0&&(this.stencilWrite=e.stencilWrite),e.wireframe!==void 0&&(this.wireframe=e.wireframe),e.wireframeLinewidth!==void 0&&(this.wireframeLinewidth=e.wireframeLinewidth),e.wireframeLinecap!==void 0&&(this.wireframeLinecap=e.wireframeLinecap),e.wireframeLinejoin!==void 0&&(this.wireframeLinejoin=e.wireframeLinejoin),e.rotation!==void 0&&(this.rotation=e.rotation),e.linewidth!==void 0&&(this.linewidth=e.linewidth),e.dashSize!==void 0&&(this.dashSize=e.dashSize),e.gapSize!==void 0&&(this.gapSize=e.gapSize),e.scale!==void 0&&(this.scale=e.scale),e.polygonOffset!==void 0&&(this.polygonOffset=e.polygonOffset),e.polygonOffsetFactor!==void 0&&(this.polygonOffsetFactor=e.polygonOffsetFactor),e.polygonOffsetUnits!==void 0&&(this.polygonOffsetUnits=e.polygonOffsetUnits),e.dithering!==void 0&&(this.dithering=e.dithering),e.alphaToCoverage!==void 0&&(this.alphaToCoverage=e.alphaToCoverage),e.premultipliedAlpha!==void 0&&(this.premultipliedAlpha=e.premultipliedAlpha),e.forceSinglePass!==void 0&&(this.forceSinglePass=e.forceSinglePass),e.allowOverride!==void 0&&(this.allowOverride=e.allowOverride),e.visible!==void 0&&(this.visible=e.visible),e.toneMapped!==void 0&&(this.toneMapped=e.toneMapped),e.userData!==void 0&&(this.userData=e.userData),e.vertexColors!==void 0&&(typeof e.vertexColors=="number"?this.vertexColors=e.vertexColors>0:this.vertexColors=e.vertexColors),e.size!==void 0&&(this.size=e.size),e.sizeAttenuation!==void 0&&(this.sizeAttenuation=e.sizeAttenuation),e.map!==void 0&&(this.map=t[e.map]||null),e.matcap!==void 0&&(this.matcap=t[e.matcap]||null),e.alphaMap!==void 0&&(this.alphaMap=t[e.alphaMap]||null),e.bumpMap!==void 0&&(this.bumpMap=t[e.bumpMap]||null),e.bumpScale!==void 0&&(this.bumpScale=e.bumpScale),e.normalMap!==void 0&&(this.normalMap=t[e.normalMap]||null),e.normalMapType!==void 0&&(this.normalMapType=e.normalMapType),e.normalScale!==void 0){let n=e.normalScale;Array.isArray(n)===!1&&(n=[n,n]),this.normalScale=new xe().fromArray(n)}return e.displacementMap!==void 0&&(this.displacementMap=t[e.displacementMap]||null),e.displacementScale!==void 0&&(this.displacementScale=e.displacementScale),e.displacementBias!==void 0&&(this.displacementBias=e.displacementBias),e.roughnessMap!==void 0&&(this.roughnessMap=t[e.roughnessMap]||null),e.metalnessMap!==void 0&&(this.metalnessMap=t[e.metalnessMap]||null),e.emissiveMap!==void 0&&(this.emissiveMap=t[e.emissiveMap]||null),e.emissiveIntensity!==void 0&&(this.emissiveIntensity=e.emissiveIntensity),e.specularMap!==void 0&&(this.specularMap=t[e.specularMap]||null),e.specularIntensityMap!==void 0&&(this.specularIntensityMap=t[e.specularIntensityMap]||null),e.specularColorMap!==void 0&&(this.specularColorMap=t[e.specularColorMap]||null),e.envMap!==void 0&&(this.envMap=t[e.envMap]||null),e.envMapRotation!==void 0&&this.envMapRotation.fromArray(e.envMapRotation),e.envMapIntensity!==void 0&&(this.envMapIntensity=e.envMapIntensity),e.reflectivity!==void 0&&(this.reflectivity=e.reflectivity),e.refractionRatio!==void 0&&(this.refractionRatio=e.refractionRatio),e.lightMap!==void 0&&(this.lightMap=t[e.lightMap]||null),e.lightMapIntensity!==void 0&&(this.lightMapIntensity=e.lightMapIntensity),e.aoMap!==void 0&&(this.aoMap=t[e.aoMap]||null),e.aoMapIntensity!==void 0&&(this.aoMapIntensity=e.aoMapIntensity),e.gradientMap!==void 0&&(this.gradientMap=t[e.gradientMap]||null),e.clearcoatMap!==void 0&&(this.clearcoatMap=t[e.clearcoatMap]||null),e.clearcoatRoughnessMap!==void 0&&(this.clearcoatRoughnessMap=t[e.clearcoatRoughnessMap]||null),e.clearcoatNormalMap!==void 0&&(this.clearcoatNormalMap=t[e.clearcoatNormalMap]||null),e.clearcoatNormalScale!==void 0&&(this.clearcoatNormalScale=new xe().fromArray(e.clearcoatNormalScale)),e.iridescenceMap!==void 0&&(this.iridescenceMap=t[e.iridescenceMap]||null),e.iridescenceThicknessMap!==void 0&&(this.iridescenceThicknessMap=t[e.iridescenceThicknessMap]||null),e.transmissionMap!==void 0&&(this.transmissionMap=t[e.transmissionMap]||null),e.thicknessMap!==void 0&&(this.thicknessMap=t[e.thicknessMap]||null),e.anisotropyMap!==void 0&&(this.anisotropyMap=t[e.anisotropyMap]||null),e.sheenColorMap!==void 0&&(this.sheenColorMap=t[e.sheenColorMap]||null),e.sheenRoughnessMap!==void 0&&(this.sheenRoughnessMap=t[e.sheenRoughnessMap]||null),this}clone(){return new this.constructor().copy(this)}copy(e){this.name=e.name,this.blending=e.blending,this.side=e.side,this.vertexColors=e.vertexColors,this.opacity=e.opacity,this.transparent=e.transparent,this.blendSrc=e.blendSrc,this.blendDst=e.blendDst,this.blendEquation=e.blendEquation,this.blendSrcAlpha=e.blendSrcAlpha,this.blendDstAlpha=e.blendDstAlpha,this.blendEquationAlpha=e.blendEquationAlpha,this.blendColor.copy(e.blendColor),this.blendAlpha=e.blendAlpha,this.depthFunc=e.depthFunc,this.depthTest=e.depthTest,this.depthWrite=e.depthWrite,this.stencilWriteMask=e.stencilWriteMask,this.stencilFunc=e.stencilFunc,this.stencilRef=e.stencilRef,this.stencilFuncMask=e.stencilFuncMask,this.stencilFail=e.stencilFail,this.stencilZFail=e.stencilZFail,this.stencilZPass=e.stencilZPass,this.stencilWrite=e.stencilWrite;let t=e.clippingPlanes,n=null;if(t!==null){let s=t.length;n=new Array(s);for(let r=0;r!==s;++r)n[r]=t[r].clone()}return this.clippingPlanes=n,this.clipIntersection=e.clipIntersection,this.clipShadows=e.clipShadows,this.shadowSide=e.shadowSide,this.colorWrite=e.colorWrite,this.precision=e.precision,this.polygonOffset=e.polygonOffset,this.polygonOffsetFactor=e.polygonOffsetFactor,this.polygonOffsetUnits=e.polygonOffsetUnits,this.dithering=e.dithering,this.alphaTest=e.alphaTest,this.alphaHash=e.alphaHash,this.alphaToCoverage=e.alphaToCoverage,this.premultipliedAlpha=e.premultipliedAlpha,this.forceSinglePass=e.forceSinglePass,this.allowOverride=e.allowOverride,this.visible=e.visible,this.toneMapped=e.toneMapped,this.userData=JSON.parse(JSON.stringify(e.userData)),this}dispose(){this.dispatchEvent({type:"dispose"})}set needsUpdate(e){e===!0&&this.version++}};var oi=new L,Xc=new L,No=new L,wi=new L,qc=new L,Oo=new L,Yc=new L,wr=class{constructor(e=new L,t=new L(0,0,-1)){this.origin=e,this.direction=t}set(e,t){return this.origin.copy(e),this.direction.copy(t),this}copy(e){return this.origin.copy(e.origin),this.direction.copy(e.direction),this}at(e,t){return t.copy(this.origin).addScaledVector(this.direction,e)}lookAt(e){return this.direction.copy(e).sub(this.origin).normalize(),this}recast(e){return this.origin.copy(this.at(e,oi)),this}closestPointToPoint(e,t){t.subVectors(e,this.origin);let n=t.dot(this.direction);return n<0?t.copy(this.origin):t.copy(this.origin).addScaledVector(this.direction,n)}distanceToPoint(e){return Math.sqrt(this.distanceSqToPoint(e))}distanceSqToPoint(e){let t=oi.subVectors(e,this.origin).dot(this.direction);return t<0?this.origin.distanceToSquared(e):(oi.copy(this.origin).addScaledVector(this.direction,t),oi.distanceToSquared(e))}distanceSqToSegment(e,t,n,s){Xc.copy(e).add(t).multiplyScalar(.5),No.copy(t).sub(e).normalize(),wi.copy(this.origin).sub(Xc);let r=e.distanceTo(t)*.5,o=-this.direction.dot(No),a=wi.dot(this.direction),l=-wi.dot(No),c=wi.lengthSq(),h=Math.abs(1-o*o),d,u,f,m;if(h>0)if(d=o*l-a,u=o*a-l,m=r*h,d>=0)if(u>=-m)if(u<=m){let x=1/h;d*=x,u*=x,f=d*(d+o*u+2*a)+u*(o*d+u+2*l)+c}else u=r,d=Math.max(0,-(o*u+a)),f=-d*d+u*(u+2*l)+c;else u=-r,d=Math.max(0,-(o*u+a)),f=-d*d+u*(u+2*l)+c;else u<=-m?(d=Math.max(0,-(-o*r+a)),u=d>0?-r:Math.min(Math.max(-r,-l),r),f=-d*d+u*(u+2*l)+c):u<=m?(d=0,u=Math.min(Math.max(-r,-l),r),f=u*(u+2*l)+c):(d=Math.max(0,-(o*r+a)),u=d>0?r:Math.min(Math.max(-r,-l),r),f=-d*d+u*(u+2*l)+c);else u=o>0?-r:r,d=Math.max(0,-(o*u+a)),f=-d*d+u*(u+2*l)+c;return n&&n.copy(this.origin).addScaledVector(this.direction,d),s&&s.copy(Xc).addScaledVector(No,u),f}intersectSphere(e,t){oi.subVectors(e.center,this.origin);let n=oi.dot(this.direction),s=oi.dot(oi)-n*n,r=e.radius*e.radius;if(s>r)return null;let o=Math.sqrt(r-s),a=n-o,l=n+o;return l<0?null:a<0?this.at(l,t):this.at(a,t)}intersectsSphere(e){return e.radius<0?!1:this.distanceSqToPoint(e.center)<=e.radius*e.radius}distanceToPlane(e){let t=e.normal.dot(this.direction);if(t===0)return e.distanceToPoint(this.origin)===0?0:null;let n=-(this.origin.dot(e.normal)+e.constant)/t;return n>=0?n:null}intersectPlane(e,t){let n=this.distanceToPlane(e);return n===null?null:this.at(n,t)}intersectsPlane(e){let t=e.distanceToPoint(this.origin);return t===0||e.normal.dot(this.direction)*t<0}intersectBox(e,t){let n,s,r,o,a,l,c=1/this.direction.x,h=1/this.direction.y,d=1/this.direction.z,u=this.origin;return c>=0?(n=(e.min.x-u.x)*c,s=(e.max.x-u.x)*c):(n=(e.max.x-u.x)*c,s=(e.min.x-u.x)*c),h>=0?(r=(e.min.y-u.y)*h,o=(e.max.y-u.y)*h):(r=(e.max.y-u.y)*h,o=(e.min.y-u.y)*h),n>o||r>s||((r>n||isNaN(n))&&(n=r),(o<s||isNaN(s))&&(s=o),d>=0?(a=(e.min.z-u.z)*d,l=(e.max.z-u.z)*d):(a=(e.max.z-u.z)*d,l=(e.min.z-u.z)*d),n>l||a>s)||((a>n||n!==n)&&(n=a),(l<s||s!==s)&&(s=l),s<0)?null:this.at(n>=0?n:s,t)}intersectsBox(e){return this.intersectBox(e,oi)!==null}intersectTriangle(e,t,n,s,r){qc.subVectors(t,e),Oo.subVectors(n,e),Yc.crossVectors(qc,Oo);let o=this.direction.dot(Yc),a;if(o>0){if(s)return null;a=1}else if(o<0)a=-1,o=-o;else return null;wi.subVectors(this.origin,e);let l=a*this.direction.dot(Oo.crossVectors(wi,Oo));if(l<0)return null;let c=a*this.direction.dot(qc.cross(wi));if(c<0||l+c>o)return null;let h=-a*wi.dot(Yc);return h<0?null:this.at(h/o,r)}applyMatrix4(e){return this.origin.applyMatrix4(e),this.direction.transformDirection(e),this}equals(e){return e.origin.equals(this.origin)&&e.direction.equals(this.direction)}clone(){return new this.constructor().copy(this)}},Ln=class extends Ci{constructor(e){super(),this.isMeshBasicMaterial=!0,this.type="MeshBasicMaterial",this.color=new qe(16777215),this.map=null,this.lightMap=null,this.lightMapIntensity=1,this.aoMap=null,this.aoMapIntensity=1,this.specularMap=null,this.alphaMap=null,this.envMap=null,this.envMapRotation=new Ri,this.combine=mh,this.reflectivity=1,this.refractionRatio=.98,this.wireframe=!1,this.wireframeLinewidth=1,this.wireframeLinecap="round",this.wireframeLinejoin="round",this.fog=!0,this.setValues(e)}copy(e){return super.copy(e),this.color.copy(e.color),this.map=e.map,this.lightMap=e.lightMap,this.lightMapIntensity=e.lightMapIntensity,this.aoMap=e.aoMap,this.aoMapIntensity=e.aoMapIntensity,this.specularMap=e.specularMap,this.alphaMap=e.alphaMap,this.envMap=e.envMap,this.envMapRotation.copy(e.envMapRotation),this.combine=e.combine,this.reflectivity=e.reflectivity,this.refractionRatio=e.refractionRatio,this.wireframe=e.wireframe,this.wireframeLinewidth=e.wireframeLinewidth,this.wireframeLinecap=e.wireframeLinecap,this.wireframeLinejoin=e.wireframeLinejoin,this.fog=e.fog,this}},pd=new rt,$i=new wr,Bo=new Cn,md=new L,zo=new L,ko=new L,Vo=new L,Zc=new L,Ho=new L,gd=new L,Go=new L,At=class extends un{constructor(e=new It,t=new Ln){super(),this.isMesh=!0,this.type="Mesh",this.geometry=e,this.material=t,this.morphTargetDictionary=void 0,this.morphTargetInfluences=void 0,this.count=1,this.updateMorphTargets()}copy(e,t){return super.copy(e,t),e.morphTargetInfluences!==void 0&&(this.morphTargetInfluences=e.morphTargetInfluences.slice()),e.morphTargetDictionary!==void 0&&(this.morphTargetDictionary=Object.assign({},e.morphTargetDictionary)),this.material=Array.isArray(e.material)?e.material.slice():e.material,this.geometry=e.geometry,this}updateMorphTargets(){let t=this.geometry.morphAttributes,n=Object.keys(t);if(n.length>0){let s=t[n[0]];if(s!==void 0){this.morphTargetInfluences=[],this.morphTargetDictionary={};for(let r=0,o=s.length;r<o;r++){let a=s[r].name||String(r);this.morphTargetInfluences.push(0),this.morphTargetDictionary[a]=r}}}}getVertexPosition(e,t){let n=this.geometry,s=n.attributes.position,r=n.morphAttributes.position,o=n.morphTargetsRelative;t.fromBufferAttribute(s,e);let a=this.morphTargetInfluences;if(r&&a){Ho.set(0,0,0);for(let l=0,c=r.length;l<c;l++){let h=a[l],d=r[l];h!==0&&(Zc.fromBufferAttribute(d,e),o?Ho.addScaledVector(Zc,h):Ho.addScaledVector(Zc.sub(t),h))}t.add(Ho)}return t}raycast(e,t){let n=this.geometry,s=this.material,r=this.matrixWorld;s!==void 0&&(n.boundingSphere===null&&n.computeBoundingSphere(),Bo.copy(n.boundingSphere),Bo.applyMatrix4(r),$i.copy(e.ray).recast(e.near),!(Bo.containsPoint($i.origin)===!1&&($i.intersectSphere(Bo,md)===null||$i.origin.distanceToSquared(md)>(e.far-e.near)**2))&&(pd.copy(r).invert(),$i.copy(e.ray).applyMatrix4(pd),!(n.boundingBox!==null&&$i.intersectsBox(n.boundingBox)===!1)&&this._computeIntersections(e,t,$i)))}_computeIntersections(e,t,n){let s,r=this.geometry,o=this.material,a=r.index,l=r.attributes.position,c=r.attributes.uv,h=r.attributes.uv1,d=r.attributes.normal,u=r.groups,f=r.drawRange;if(a!==null)if(Array.isArray(o))for(let m=0,x=u.length;m<x;m++){let g=u[m],p=o[g.materialIndex],b=Math.max(g.start,f.start),S=Math.min(a.count,Math.min(g.start+g.count,f.start+f.count));for(let _=b,A=S;_<A;_+=3){let w=a.getX(_),E=a.getX(_+1),y=a.getX(_+2);s=Wo(this,p,e,n,c,h,d,w,E,y),s&&(s.faceIndex=Math.floor(_/3),s.face.materialIndex=g.materialIndex,t.push(s))}}else{let m=Math.max(0,f.start),x=Math.min(a.count,f.start+f.count);for(let g=m,p=x;g<p;g+=3){let b=a.getX(g),S=a.getX(g+1),_=a.getX(g+2);s=Wo(this,o,e,n,c,h,d,b,S,_),s&&(s.faceIndex=Math.floor(g/3),t.push(s))}}else if(l!==void 0)if(Array.isArray(o))for(let m=0,x=u.length;m<x;m++){let g=u[m],p=o[g.materialIndex],b=Math.max(g.start,f.start),S=Math.min(l.count,Math.min(g.start+g.count,f.start+f.count));for(let _=b,A=S;_<A;_+=3){let w=_,E=_+1,y=_+2;s=Wo(this,p,e,n,c,h,d,w,E,y),s&&(s.faceIndex=Math.floor(_/3),s.face.materialIndex=g.materialIndex,t.push(s))}}else{let m=Math.max(0,f.start),x=Math.min(l.count,f.start+f.count);for(let g=m,p=x;g<p;g+=3){let b=g,S=g+1,_=g+2;s=Wo(this,o,e,n,c,h,d,b,S,_),s&&(s.faceIndex=Math.floor(g/3),t.push(s))}}}};function jm(i,e,t,n,s,r,o,a){let l;if(e.side===jt?l=n.intersectTriangle(o,r,s,!0,a):l=n.intersectTriangle(s,r,o,e.side===li,a),l===null)return null;Go.copy(a),Go.applyMatrix4(i.matrixWorld);let c=t.ray.origin.distanceTo(Go);return c<t.near||c>t.far?null:{distance:c,point:Go.clone(),object:i}}function Wo(i,e,t,n,s,r,o,a,l,c){i.getVertexPosition(a,zo),i.getVertexPosition(l,ko),i.getVertexPosition(c,Vo);let h=jm(i,e,t,n,zo,ko,Vo,gd);if(h){let d=new L;Ti.getBarycoord(gd,zo,ko,Vo,d),s&&(h.uv=Ti.getInterpolatedAttribute(s,a,l,c,d,new xe)),r&&(h.uv1=Ti.getInterpolatedAttribute(r,a,l,c,d,new xe)),o&&(h.normal=Ti.getInterpolatedAttribute(o,a,l,c,d,new L),h.normal.dot(n.direction)>0&&h.normal.multiplyScalar(-1));let u={a,b:l,c,normal:new L,materialIndex:0};Ti.getNormal(zo,ko,Vo,u.normal),h.face=u,h.barycoord=d}return h}var ya=class extends Kt{constructor(e=null,t=1,n=1,s,r,o,a,l,c=Ot,h=Ot,d,u){super(null,o,a,l,c,h,s,r,d,u),this.isDataTexture=!0,this.image={data:e,width:t,height:n},this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1}};var $c=new L,Qm=new L,eg=new Ne,Hn=class{constructor(e=new L(1,0,0),t=0){this.isPlane=!0,this.normal=e,this.constant=t}set(e,t){return this.normal.copy(e),this.constant=t,this}setComponents(e,t,n,s){return this.normal.set(e,t,n),this.constant=s,this}setFromNormalAndCoplanarPoint(e,t){return this.normal.copy(e),this.constant=-t.dot(this.normal),this}setFromCoplanarPoints(e,t,n){let s=$c.subVectors(n,t).cross(Qm.subVectors(e,t)).normalize();return this.setFromNormalAndCoplanarPoint(s,e),this}copy(e){return this.normal.copy(e.normal),this.constant=e.constant,this}normalize(){let e=1/this.normal.length();return this.normal.multiplyScalar(e),this.constant*=e,this}negate(){return this.constant*=-1,this.normal.negate(),this}distanceToPoint(e){return this.normal.dot(e)+this.constant}distanceToSphere(e){return this.distanceToPoint(e.center)-e.radius}projectPoint(e,t){return t.copy(e).addScaledVector(this.normal,-this.distanceToPoint(e))}intersectLine(e,t,n=!0){let s=e.delta($c),r=this.normal.dot(s);if(r===0)return this.distanceToPoint(e.start)===0?t.copy(e.start):null;let o=-(e.start.dot(this.normal)+this.constant)/r;return n===!0&&(o<0||o>1)?null:t.copy(e.start).addScaledVector(s,o)}intersectsLine(e){let t=this.distanceToPoint(e.start),n=this.distanceToPoint(e.end);return t<0&&n>0||n<0&&t>0}intersectsBox(e){return e.intersectsPlane(this)}intersectsSphere(e){return e.intersectsPlane(this)}coplanarPoint(e){return e.copy(this.normal).multiplyScalar(-this.constant)}applyMatrix4(e,t){let n=t||eg.getNormalMatrix(e),s=this.coplanarPoint($c).applyMatrix4(e),r=this.normal.applyMatrix3(n).normalize();return this.constant=-s.dot(r),this}translate(e){return this.constant-=e.dot(this.normal),this}equals(e){return e.normal.equals(this.normal)&&e.constant===this.constant}clone(){return new this.constructor().copy(this)}},Ki=new Cn,tg=new xe(.5,.5),Xo=new L,Er=class{constructor(e=new Hn,t=new Hn,n=new Hn,s=new Hn,r=new Hn,o=new Hn){this.planes=[e,t,n,s,r,o]}set(e,t,n,s,r,o){let a=this.planes;return a[0].copy(e),a[1].copy(t),a[2].copy(n),a[3].copy(s),a[4].copy(r),a[5].copy(o),this}copy(e){let t=this.planes;for(let n=0;n<6;n++)t[n].copy(e.planes[n]);return this}setFromProjectionMatrix(e,t=Pn,n=!1){let s=this.planes,r=e.elements,o=r[0],a=r[1],l=r[2],c=r[3],h=r[4],d=r[5],u=r[6],f=r[7],m=r[8],x=r[9],g=r[10],p=r[11],b=r[12],S=r[13],_=r[14],A=r[15];if(s[0].setComponents(c-o,f-h,p-m,A-b).normalize(),s[1].setComponents(c+o,f+h,p+m,A+b).normalize(),s[2].setComponents(c+a,f+d,p+x,A+S).normalize(),s[3].setComponents(c-a,f-d,p-x,A-S).normalize(),n)s[4].setComponents(l,u,g,_).normalize(),s[5].setComponents(c-l,f-u,p-g,A-_).normalize();else if(s[4].setComponents(c-l,f-u,p-g,A-_).normalize(),t===Pn)s[5].setComponents(c+l,f+u,p+g,A+_).normalize();else if(t===gr)s[5].setComponents(l,u,g,_).normalize();else throw new Error("THREE.Frustum.setFromProjectionMatrix(): Invalid coordinate system: "+t);return this}intersectsObject(e){if(e.boundingSphere!==void 0)e.boundingSphere===null&&e.computeBoundingSphere(),Ki.copy(e.boundingSphere).applyMatrix4(e.matrixWorld);else{let t=e.geometry;t.boundingSphere===null&&t.computeBoundingSphere(),Ki.copy(t.boundingSphere).applyMatrix4(e.matrixWorld)}return this.intersectsSphere(Ki)}intersectsSprite(e){Ki.center.set(0,0,0);let t=tg.distanceTo(e.center);return Ki.radius=.7071067811865476+t,Ki.applyMatrix4(e.matrixWorld),this.intersectsSphere(Ki)}intersectsSphere(e){let t=this.planes,n=e.center,s=-e.radius;for(let r=0;r<6;r++)if(t[r].distanceToPoint(n)<s)return!1;return!0}intersectsBox(e){let t=this.planes;for(let n=0;n<6;n++){let s=t[n];if(Xo.x=s.normal.x>0?e.max.x:e.min.x,Xo.y=s.normal.y>0?e.max.y:e.min.y,Xo.z=s.normal.z>0?e.max.z:e.min.z,s.distanceToPoint(Xo)<0)return!1}return!0}containsPoint(e){let t=this.planes;for(let n=0;n<6;n++)if(t[n].distanceToPoint(e)<0)return!1;return!0}clone(){return new this.constructor().copy(this)}};var ts=class extends Ci{constructor(e){super(),this.isLineBasicMaterial=!0,this.type="LineBasicMaterial",this.color=new qe(16777215),this.map=null,this.linewidth=1,this.linecap="round",this.linejoin="round",this.fog=!0,this.setValues(e)}copy(e){return super.copy(e),this.color.copy(e.color),this.map=e.map,this.linewidth=e.linewidth,this.linecap=e.linecap,this.linejoin=e.linejoin,this.fog=e.fog,this}},va=new L,_a=new L,xd=new rt,ar=new wr,qo=new Cn,Kc=new L,yd=new L,Ns=class extends un{constructor(e=new It,t=new ts){super(),this.isLine=!0,this.type="Line",this.geometry=e,this.material=t,this.morphTargetDictionary=void 0,this.morphTargetInfluences=void 0,this.updateMorphTargets()}copy(e,t){return super.copy(e,t),this.material=Array.isArray(e.material)?e.material.slice():e.material,this.geometry=e.geometry,this}computeLineDistances(){let e=this.geometry;if(e.index===null){let t=e.attributes.position,n=[0];for(let s=1,r=t.count;s<r;s++)va.fromBufferAttribute(t,s-1),_a.fromBufferAttribute(t,s),n[s]=n[s-1],n[s]+=va.distanceTo(_a);e.setAttribute("lineDistance",new nt(n,1))}else Pe("Line.computeLineDistances(): Computation only possible with non-indexed BufferGeometry.");return this}raycast(e,t){let n=this.geometry,s=this.matrixWorld,r=e.params.Line.threshold,o=n.drawRange;if(n.boundingSphere===null&&n.computeBoundingSphere(),qo.copy(n.boundingSphere),qo.applyMatrix4(s),qo.radius+=r,e.ray.intersectsSphere(qo)===!1)return;xd.copy(s).invert(),ar.copy(e.ray).applyMatrix4(xd);let a=r/((this.scale.x+this.scale.y+this.scale.z)/3),l=a*a,c=this.isLineSegments?2:1,h=n.index,u=n.attributes.position;if(h!==null){let f=Math.max(0,o.start),m=Math.min(h.count,o.start+o.count);for(let x=f,g=m-1;x<g;x+=c){let p=h.getX(x),b=h.getX(x+1),S=Yo(this,e,ar,l,p,b,x);S&&t.push(S)}if(this.isLineLoop){let x=h.getX(m-1),g=h.getX(f),p=Yo(this,e,ar,l,x,g,m-1);p&&t.push(p)}}else{let f=Math.max(0,o.start),m=Math.min(u.count,o.start+o.count);for(let x=f,g=m-1;x<g;x+=c){let p=Yo(this,e,ar,l,x,x+1,x);p&&t.push(p)}if(this.isLineLoop){let x=Yo(this,e,ar,l,m-1,f,m-1);x&&t.push(x)}}}updateMorphTargets(){let t=this.geometry.morphAttributes,n=Object.keys(t);if(n.length>0){let s=t[n[0]];if(s!==void 0){this.morphTargetInfluences=[],this.morphTargetDictionary={};for(let r=0,o=s.length;r<o;r++){let a=s[r].name||String(r);this.morphTargetInfluences.push(0),this.morphTargetDictionary[a]=r}}}}};function Yo(i,e,t,n,s,r,o){let a=i.geometry.attributes.position;if(va.fromBufferAttribute(a,s),_a.fromBufferAttribute(a,r),t.distanceSqToSegment(va,_a,Kc,yd)>n)return;Kc.applyMatrix4(i.matrixWorld);let c=e.ray.origin.distanceTo(Kc);if(!(c<e.near||c>e.far))return{distance:c,point:yd.clone().applyMatrix4(i.matrixWorld),index:o,face:null,faceIndex:null,barycoord:null,object:i}}var vd=new L,_d=new L,Tr=class extends Ns{constructor(e,t){super(e,t),this.isLineSegments=!0,this.type="LineSegments"}computeLineDistances(){let e=this.geometry;if(e.index===null){let t=e.attributes.position,n=[];for(let s=0,r=t.count;s<r;s+=2)vd.fromBufferAttribute(t,s),_d.fromBufferAttribute(t,s+1),n[s]=s===0?0:n[s-1],n[s+1]=n[s]+vd.distanceTo(_d);e.setAttribute("lineDistance",new nt(n,1))}else Pe("LineSegments.computeLineDistances(): Computation only possible with non-indexed BufferGeometry.");return this}};var Ar=class extends Kt{constructor(e=[],t=Ui,n,s,r,o,a,l,c,h){super(e,t,n,s,r,o,a,l,c,h),this.isCubeTexture=!0,this.flipY=!1}get images(){return this.image}set images(e){this.image=e}},Pr=class extends Kt{constructor(e,t,n,s,r,o,a,l,c){super(e,t,n,s,r,o,a,l,c),this.isCanvasTexture=!0,this.needsUpdate=!0}};var ci=class extends Kt{constructor(e,t,n=Fn,s,r,o,a=Ot,l=Ot,c,h=Xn,d=1){if(h!==Xn&&h!==Oi)throw new Error("THREE.DepthTexture: format must be either THREE.DepthFormat or THREE.DepthStencilFormat");let u={width:e,height:t,depth:d};super(u,s,r,o,a,l,h,n,c),this.isDepthTexture=!0,this.flipY=!1,this.generateMipmaps=!1,this.compareFunction=null}copy(e){return super.copy(e),this.source=new Fs(Object.assign({},e.image)),this.compareFunction=e.compareFunction,this}toJSON(e){let t=super.toJSON(e);return this.compareFunction!==null&&(t.compareFunction=this.compareFunction),t}},ba=class extends ci{constructor(e,t=Fn,n=Ui,s,r,o=Ot,a=Ot,l,c=Xn){let h={width:e,height:e,depth:1},d=[h,h,h,h,h,h];super(e,e,t,n,s,r,o,a,l,c),this.image=d,this.isCubeDepthTexture=!0,this.isCubeTexture=!0}get images(){return this.image}set images(e){this.image=e}},Rr=class extends Kt{constructor(e=null){super(),this.sourceTexture=e,this.isExternalTexture=!0}copy(e){return super.copy(e),this.sourceTexture=e.sourceTexture,this}},Os=class i extends It{constructor(e=1,t=1,n=1,s=1,r=1,o=1){super(),this.type="BoxGeometry",this.parameters={width:e,height:t,depth:n,widthSegments:s,heightSegments:r,depthSegments:o};let a=this;s=Math.floor(s),r=Math.floor(r),o=Math.floor(o);let l=[],c=[],h=[],d=[],u=0,f=0;m("z","y","x",-1,-1,n,t,e,o,r,0),m("z","y","x",1,-1,n,t,-e,o,r,1),m("x","z","y",1,1,e,n,t,s,o,2),m("x","z","y",1,-1,e,n,-t,s,o,3),m("x","y","z",1,-1,e,t,n,s,r,4),m("x","y","z",-1,-1,e,t,-n,s,r,5),this.setIndex(l),this.setAttribute("position",new nt(c,3)),this.setAttribute("normal",new nt(h,3)),this.setAttribute("uv",new nt(d,2));function m(x,g,p,b,S,_,A,w,E,y,T){let C=_/E,R=A/y,D=_/2,I=A/2,k=w/2,F=E+1,q=y+1,B=0,$=0,j=new L;for(let se=0;se<q;se++){let fe=se*R-I;for(let _e=0;_e<F;_e++){let Ke=_e*C-D;j[x]=Ke*b,j[g]=fe*S,j[p]=k,c.push(j.x,j.y,j.z),j[x]=0,j[g]=0,j[p]=w>0?1:-1,h.push(j.x,j.y,j.z),d.push(_e/E),d.push(1-se/y),B+=1}}for(let se=0;se<y;se++)for(let fe=0;fe<E;fe++){let _e=u+fe+F*se,Ke=u+fe+F*(se+1),pt=u+(fe+1)+F*(se+1),Je=u+(fe+1)+F*se;l.push(_e,Ke,Je),l.push(Ke,pt,Je),$+=6}a.addGroup(f,$,T),f+=$,u+=B}}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(e){return new i(e.width,e.height,e.depth,e.widthSegments,e.heightSegments,e.depthSegments)}};var fn=class{constructor(){this.type="Curve",this.arcLengthDivisions=200,this.needsUpdate=!1,this.cacheArcLengths=null}getPoint(){Pe("Curve: .getPoint() not implemented.")}getPointAt(e,t){let n=this.getUtoTmapping(e);return this.getPoint(n,t)}getPoints(e=5){let t=[];for(let n=0;n<=e;n++)t.push(this.getPoint(n/e));return t}getSpacedPoints(e=5){let t=[];for(let n=0;n<=e;n++)t.push(this.getPointAt(n/e));return t}getLength(){let e=this.getLengths();return e[e.length-1]}getLengths(e=this.arcLengthDivisions){if(this.cacheArcLengths&&this.cacheArcLengths.length===e+1&&!this.needsUpdate)return this.cacheArcLengths;this.needsUpdate=!1;let t=[],n,s=this.getPoint(0),r=0;t.push(0);for(let o=1;o<=e;o++)n=this.getPoint(o/e),r+=n.distanceTo(s),t.push(r),s=n;return this.cacheArcLengths=t,t}updateArcLengths(){this.needsUpdate=!0,this.getLengths()}getUtoTmapping(e,t=null){let n=this.getLengths(),s=0,r=n.length,o;t?o=t:o=e*n[r-1];let a=0,l=r-1,c;for(;a<=l;)if(s=Math.floor(a+(l-a)/2),c=n[s]-o,c<0)a=s+1;else if(c>0)l=s-1;else{l=s;break}if(s=l,n[s]===o)return s/(r-1);let h=n[s],u=n[s+1]-h,f=(o-h)/u;return(s+f)/(r-1)}getTangent(e,t){let s=e-1e-4,r=e+1e-4;s<0&&(s=0),r>1&&(r=1);let o=this.getPoint(s),a=this.getPoint(r),l=t||(o.isVector2?new xe:new L);return l.copy(a).sub(o).normalize(),l}getTangentAt(e,t){let n=this.getUtoTmapping(e);return this.getTangent(n,t)}computeFrenetFrames(e,t=!1){let n=new L,s=[],r=[],o=[],a=new L,l=new rt;for(let f=0;f<=e;f++){let m=f/e;s[f]=this.getTangentAt(m,new L)}r[0]=new L,o[0]=new L;let c=Number.MAX_VALUE,h=Math.abs(s[0].x),d=Math.abs(s[0].y),u=Math.abs(s[0].z);h<=c&&(c=h,n.set(1,0,0)),d<=c&&(c=d,n.set(0,1,0)),u<=c&&n.set(0,0,1),a.crossVectors(s[0],n).normalize(),r[0].crossVectors(s[0],a),o[0].crossVectors(s[0],r[0]);for(let f=1;f<=e;f++){if(r[f]=r[f-1].clone(),o[f]=o[f-1].clone(),a.crossVectors(s[f-1],s[f]),a.length()>Number.EPSILON){a.normalize();let m=Math.acos(Oe(s[f-1].dot(s[f]),-1,1));r[f].applyMatrix4(l.makeRotationAxis(a,m))}o[f].crossVectors(s[f],r[f])}if(t===!0){let f=Math.acos(Oe(r[0].dot(r[e]),-1,1));f/=e,s[0].dot(a.crossVectors(r[0],r[e]))>0&&(f=-f);for(let m=1;m<=e;m++)r[m].applyMatrix4(l.makeRotationAxis(s[m],f*m)),o[m].crossVectors(s[m],r[m])}return{tangents:s,normals:r,binormals:o}}clone(){return new this.constructor().copy(this)}copy(e){return this.arcLengthDivisions=e.arcLengthDivisions,this}toJSON(){let e={metadata:{version:4.7,type:"Curve",generator:"Curve.toJSON"}};return e.arcLengthDivisions=this.arcLengthDivisions,e.type=this.type,e}fromJSON(e){return this.arcLengthDivisions=e.arcLengthDivisions,this}},Bs=class extends fn{constructor(e=0,t=0,n=1,s=1,r=0,o=Math.PI*2,a=!1,l=0){super(),this.isEllipseCurve=!0,this.type="EllipseCurve",this.aX=e,this.aY=t,this.xRadius=n,this.yRadius=s,this.aStartAngle=r,this.aEndAngle=o,this.aClockwise=a,this.aRotation=l}getPoint(e,t=new xe){let n=t,s=Math.PI*2,r=this.aEndAngle-this.aStartAngle,o=Math.abs(r)<Number.EPSILON;for(;r<0;)r+=s;for(;r>s;)r-=s;r<Number.EPSILON&&(o?r=0:r=s),this.aClockwise===!0&&!o&&(r===s?r=-s:r=r-s);let a=this.aStartAngle+e*r,l=this.aX+this.xRadius*Math.cos(a),c=this.aY+this.yRadius*Math.sin(a);if(this.aRotation!==0){let h=Math.cos(this.aRotation),d=Math.sin(this.aRotation),u=l-this.aX,f=c-this.aY;l=u*h-f*d+this.aX,c=u*d+f*h+this.aY}return n.set(l,c)}copy(e){return super.copy(e),this.aX=e.aX,this.aY=e.aY,this.xRadius=e.xRadius,this.yRadius=e.yRadius,this.aStartAngle=e.aStartAngle,this.aEndAngle=e.aEndAngle,this.aClockwise=e.aClockwise,this.aRotation=e.aRotation,this}toJSON(){let e=super.toJSON();return e.aX=this.aX,e.aY=this.aY,e.xRadius=this.xRadius,e.yRadius=this.yRadius,e.aStartAngle=this.aStartAngle,e.aEndAngle=this.aEndAngle,e.aClockwise=this.aClockwise,e.aRotation=this.aRotation,e}fromJSON(e){return super.fromJSON(e),this.aX=e.aX,this.aY=e.aY,this.xRadius=e.xRadius,this.yRadius=e.yRadius,this.aStartAngle=e.aStartAngle,this.aEndAngle=e.aEndAngle,this.aClockwise=e.aClockwise,this.aRotation=e.aRotation,this}},Sa=class extends Bs{constructor(e,t,n,s,r,o){super(e,t,n,n,s,r,o),this.isArcCurve=!0,this.type="ArcCurve"}};function Uh(){let i=0,e=0,t=0,n=0;function s(r,o,a,l){i=r,e=a,t=-3*r+3*o-2*a-l,n=2*r-2*o+a+l}return{initCatmullRom:function(r,o,a,l,c){s(o,a,c*(a-r),c*(l-o))},initNonuniformCatmullRom:function(r,o,a,l,c,h,d){let u=(o-r)/c-(a-r)/(c+h)+(a-o)/h,f=(a-o)/h-(l-o)/(h+d)+(l-a)/d;u*=h,f*=h,s(o,a,u,f)},calc:function(r){let o=r*r,a=o*r;return i+e*r+t*o+n*a}}}var bd=new L,Sd=new L,Jc=new Uh,jc=new Uh,Qc=new Uh,Ma=class extends fn{constructor(e=[],t=!1,n="centripetal",s=.5){super(),this.isCatmullRomCurve3=!0,this.type="CatmullRomCurve3",this.points=e,this.closed=t,this.curveType=n,this.tension=s}getPoint(e,t=new L){let n=t,s=this.points,r=s.length,o=(r-(this.closed?0:1))*e,a=Math.floor(o),l=o-a;this.closed?a+=a>0?0:(Math.floor(Math.abs(a)/r)+1)*r:l===0&&a===r-1&&(a=r-2,l=1);let c,h;this.closed||a>0?c=s[(a-1)%r]:(Sd.subVectors(s[0],s[1]).add(s[0]),c=Sd);let d=s[a%r],u=s[(a+1)%r];if(this.closed||a+2<r?h=s[(a+2)%r]:(bd.subVectors(s[r-1],s[r-2]).add(s[r-1]),h=bd),this.curveType==="centripetal"||this.curveType==="chordal"){let f=this.curveType==="chordal"?.5:.25,m=Math.pow(c.distanceToSquared(d),f),x=Math.pow(d.distanceToSquared(u),f),g=Math.pow(u.distanceToSquared(h),f);x<1e-4&&(x=1),m<1e-4&&(m=x),g<1e-4&&(g=x),Jc.initNonuniformCatmullRom(c.x,d.x,u.x,h.x,m,x,g),jc.initNonuniformCatmullRom(c.y,d.y,u.y,h.y,m,x,g),Qc.initNonuniformCatmullRom(c.z,d.z,u.z,h.z,m,x,g)}else this.curveType==="catmullrom"&&(Jc.initCatmullRom(c.x,d.x,u.x,h.x,this.tension),jc.initCatmullRom(c.y,d.y,u.y,h.y,this.tension),Qc.initCatmullRom(c.z,d.z,u.z,h.z,this.tension));return n.set(Jc.calc(l),jc.calc(l),Qc.calc(l)),n}copy(e){super.copy(e),this.points=[];for(let t=0,n=e.points.length;t<n;t++){let s=e.points[t];this.points.push(s.clone())}return this.closed=e.closed,this.curveType=e.curveType,this.tension=e.tension,this}toJSON(){let e=super.toJSON();e.points=[];for(let t=0,n=this.points.length;t<n;t++){let s=this.points[t];e.points.push(s.toArray())}return e.closed=this.closed,e.curveType=this.curveType,e.tension=this.tension,e}fromJSON(e){super.fromJSON(e),this.points=[];for(let t=0,n=e.points.length;t<n;t++){let s=e.points[t];this.points.push(new L().fromArray(s))}return this.closed=e.closed,this.curveType=e.curveType,this.tension=e.tension,this}};function Md(i,e,t,n,s){let r=(n-e)*.5,o=(s-t)*.5,a=i*i,l=i*a;return(2*t-2*n+r+o)*l+(-3*t+3*n-2*r-o)*a+r*i+t}function ng(i,e){let t=1-i;return t*t*e}function ig(i,e){return 2*(1-i)*i*e}function sg(i,e){return i*i*e}function ur(i,e,t,n){return ng(i,e)+ig(i,t)+sg(i,n)}function rg(i,e){let t=1-i;return t*t*t*e}function og(i,e){let t=1-i;return 3*t*t*i*e}function ag(i,e){return 3*(1-i)*i*i*e}function lg(i,e){return i*i*i*e}function dr(i,e,t,n,s){return rg(i,e)+og(i,t)+ag(i,n)+lg(i,s)}var Cr=class extends fn{constructor(e=new xe,t=new xe,n=new xe,s=new xe){super(),this.isCubicBezierCurve=!0,this.type="CubicBezierCurve",this.v0=e,this.v1=t,this.v2=n,this.v3=s}getPoint(e,t=new xe){let n=t,s=this.v0,r=this.v1,o=this.v2,a=this.v3;return n.set(dr(e,s.x,r.x,o.x,a.x),dr(e,s.y,r.y,o.y,a.y)),n}copy(e){return super.copy(e),this.v0.copy(e.v0),this.v1.copy(e.v1),this.v2.copy(e.v2),this.v3.copy(e.v3),this}toJSON(){let e=super.toJSON();return e.v0=this.v0.toArray(),e.v1=this.v1.toArray(),e.v2=this.v2.toArray(),e.v3=this.v3.toArray(),e}fromJSON(e){return super.fromJSON(e),this.v0.fromArray(e.v0),this.v1.fromArray(e.v1),this.v2.fromArray(e.v2),this.v3.fromArray(e.v3),this}},wa=class extends fn{constructor(e=new L,t=new L,n=new L,s=new L){super(),this.isCubicBezierCurve3=!0,this.type="CubicBezierCurve3",this.v0=e,this.v1=t,this.v2=n,this.v3=s}getPoint(e,t=new L){let n=t,s=this.v0,r=this.v1,o=this.v2,a=this.v3;return n.set(dr(e,s.x,r.x,o.x,a.x),dr(e,s.y,r.y,o.y,a.y),dr(e,s.z,r.z,o.z,a.z)),n}copy(e){return super.copy(e),this.v0.copy(e.v0),this.v1.copy(e.v1),this.v2.copy(e.v2),this.v3.copy(e.v3),this}toJSON(){let e=super.toJSON();return e.v0=this.v0.toArray(),e.v1=this.v1.toArray(),e.v2=this.v2.toArray(),e.v3=this.v3.toArray(),e}fromJSON(e){return super.fromJSON(e),this.v0.fromArray(e.v0),this.v1.fromArray(e.v1),this.v2.fromArray(e.v2),this.v3.fromArray(e.v3),this}},Ir=class extends fn{constructor(e=new xe,t=new xe){super(),this.isLineCurve=!0,this.type="LineCurve",this.v1=e,this.v2=t}getPoint(e,t=new xe){let n=t;return e===1?n.copy(this.v2):(n.copy(this.v2).sub(this.v1),n.multiplyScalar(e).add(this.v1)),n}getPointAt(e,t){return this.getPoint(e,t)}getTangent(e,t=new xe){return t.subVectors(this.v2,this.v1).normalize()}getTangentAt(e,t){return this.getTangent(e,t)}copy(e){return super.copy(e),this.v1.copy(e.v1),this.v2.copy(e.v2),this}toJSON(){let e=super.toJSON();return e.v1=this.v1.toArray(),e.v2=this.v2.toArray(),e}fromJSON(e){return super.fromJSON(e),this.v1.fromArray(e.v1),this.v2.fromArray(e.v2),this}},Ea=class extends fn{constructor(e=new L,t=new L){super(),this.isLineCurve3=!0,this.type="LineCurve3",this.v1=e,this.v2=t}getPoint(e,t=new L){let n=t;return e===1?n.copy(this.v2):(n.copy(this.v2).sub(this.v1),n.multiplyScalar(e).add(this.v1)),n}getPointAt(e,t){return this.getPoint(e,t)}getTangent(e,t=new L){return t.subVectors(this.v2,this.v1).normalize()}getTangentAt(e,t){return this.getTangent(e,t)}copy(e){return super.copy(e),this.v1.copy(e.v1),this.v2.copy(e.v2),this}toJSON(){let e=super.toJSON();return e.v1=this.v1.toArray(),e.v2=this.v2.toArray(),e}fromJSON(e){return super.fromJSON(e),this.v1.fromArray(e.v1),this.v2.fromArray(e.v2),this}},Lr=class extends fn{constructor(e=new xe,t=new xe,n=new xe){super(),this.isQuadraticBezierCurve=!0,this.type="QuadraticBezierCurve",this.v0=e,this.v1=t,this.v2=n}getPoint(e,t=new xe){let n=t,s=this.v0,r=this.v1,o=this.v2;return n.set(ur(e,s.x,r.x,o.x),ur(e,s.y,r.y,o.y)),n}copy(e){return super.copy(e),this.v0.copy(e.v0),this.v1.copy(e.v1),this.v2.copy(e.v2),this}toJSON(){let e=super.toJSON();return e.v0=this.v0.toArray(),e.v1=this.v1.toArray(),e.v2=this.v2.toArray(),e}fromJSON(e){return super.fromJSON(e),this.v0.fromArray(e.v0),this.v1.fromArray(e.v1),this.v2.fromArray(e.v2),this}},Ta=class extends fn{constructor(e=new L,t=new L,n=new L){super(),this.isQuadraticBezierCurve3=!0,this.type="QuadraticBezierCurve3",this.v0=e,this.v1=t,this.v2=n}getPoint(e,t=new L){let n=t,s=this.v0,r=this.v1,o=this.v2;return n.set(ur(e,s.x,r.x,o.x),ur(e,s.y,r.y,o.y),ur(e,s.z,r.z,o.z)),n}copy(e){return super.copy(e),this.v0.copy(e.v0),this.v1.copy(e.v1),this.v2.copy(e.v2),this}toJSON(){let e=super.toJSON();return e.v0=this.v0.toArray(),e.v1=this.v1.toArray(),e.v2=this.v2.toArray(),e}fromJSON(e){return super.fromJSON(e),this.v0.fromArray(e.v0),this.v1.fromArray(e.v1),this.v2.fromArray(e.v2),this}},Dr=class extends fn{constructor(e=[]){super(),this.isSplineCurve=!0,this.type="SplineCurve",this.points=e}getPoint(e,t=new xe){let n=t,s=this.points,r=(s.length-1)*e,o=Math.floor(r),a=r-o,l=s[o===0?o:o-1],c=s[o],h=s[o>s.length-2?s.length-1:o+1],d=s[o>s.length-3?s.length-1:o+2];return n.set(Md(a,l.x,c.x,h.x,d.x),Md(a,l.y,c.y,h.y,d.y)),n}copy(e){super.copy(e),this.points=[];for(let t=0,n=e.points.length;t<n;t++){let s=e.points[t];this.points.push(s.clone())}return this}toJSON(){let e=super.toJSON();e.points=[];for(let t=0,n=this.points.length;t<n;t++){let s=this.points[t];e.points.push(s.toArray())}return e}fromJSON(e){super.fromJSON(e),this.points=[];for(let t=0,n=e.points.length;t<n;t++){let s=e.points[t];this.points.push(new xe().fromArray(s))}return this}},wd=Object.freeze({__proto__:null,ArcCurve:Sa,CatmullRomCurve3:Ma,CubicBezierCurve:Cr,CubicBezierCurve3:wa,EllipseCurve:Bs,LineCurve:Ir,LineCurve3:Ea,QuadraticBezierCurve:Lr,QuadraticBezierCurve3:Ta,SplineCurve:Dr}),Aa=class extends fn{constructor(){super(),this.type="CurvePath",this.curves=[],this.autoClose=!1}add(e){this.curves.push(e)}closePath(){let e=this.curves[0].getPoint(0),t=this.curves[this.curves.length-1].getPoint(1);if(!e.equals(t)){let n=e.isVector2===!0?"LineCurve":"LineCurve3";this.curves.push(new wd[n](t,e))}return this}getPoint(e,t){let n=e*this.getLength(),s=this.getCurveLengths(),r=0;for(;r<s.length;){if(s[r]>=n){let o=s[r]-n,a=this.curves[r],l=a.getLength(),c=l===0?0:1-o/l;return a.getPointAt(c,t)}r++}return null}getLength(){let e=this.getCurveLengths();return e[e.length-1]}updateArcLengths(){this.needsUpdate=!0,this.cacheLengths=null,this.getCurveLengths()}getCurveLengths(){if(this.cacheLengths&&this.cacheLengths.length===this.curves.length)return this.cacheLengths;let e=[],t=0;for(let n=0,s=this.curves.length;n<s;n++)t+=this.curves[n].getLength(),e.push(t);return this.cacheLengths=e,e}getSpacedPoints(e=40){let t=[];for(let n=0;n<=e;n++)t.push(this.getPoint(n/e));return this.autoClose&&t.push(t[0]),t}getPoints(e=12){let t=[],n;for(let s=0,r=this.curves;s<r.length;s++){let o=r[s],a=o.isEllipseCurve?e*2:o.isLineCurve||o.isLineCurve3?1:o.isSplineCurve?e*o.points.length:e,l=o.getPoints(a);for(let c=0;c<l.length;c++){let h=l[c];n&&n.equals(h)||(t.push(h),n=h)}}return this.autoClose&&t.length>1&&!t[t.length-1].equals(t[0])&&t.push(t[0]),t}copy(e){super.copy(e),this.curves=[];for(let t=0,n=e.curves.length;t<n;t++){let s=e.curves[t];this.curves.push(s.clone())}return this.autoClose=e.autoClose,this}toJSON(){let e=super.toJSON();e.autoClose=this.autoClose,e.curves=[];for(let t=0,n=this.curves.length;t<n;t++){let s=this.curves[t];e.curves.push(s.toJSON())}return e}fromJSON(e){super.fromJSON(e),this.autoClose=e.autoClose,this.curves=[];for(let t=0,n=e.curves.length;t<n;t++){let s=e.curves[t];this.curves.push(new wd[s.type]().fromJSON(s))}return this}},ns=class extends Aa{constructor(e){super(),this.type="Path",this.currentPoint=new xe,e&&this.setFromPoints(e)}setFromPoints(e){this.moveTo(e[0].x,e[0].y);for(let t=1,n=e.length;t<n;t++)this.lineTo(e[t].x,e[t].y);return this}moveTo(e,t){return this.currentPoint.set(e,t),this}lineTo(e,t){let n=new Ir(this.currentPoint.clone(),new xe(e,t));return this.curves.push(n),this.currentPoint.set(e,t),this}quadraticCurveTo(e,t,n,s){let r=new Lr(this.currentPoint.clone(),new xe(e,t),new xe(n,s));return this.curves.push(r),this.currentPoint.set(n,s),this}bezierCurveTo(e,t,n,s,r,o){let a=new Cr(this.currentPoint.clone(),new xe(e,t),new xe(n,s),new xe(r,o));return this.curves.push(a),this.currentPoint.set(r,o),this}splineThru(e){let t=[this.currentPoint.clone()].concat(e),n=new Dr(t);return this.curves.push(n),this.currentPoint.copy(e[e.length-1]),this}arc(e,t,n,s,r,o){let a=this.currentPoint.x,l=this.currentPoint.y;return this.absarc(e+a,t+l,n,s,r,o),this}absarc(e,t,n,s,r,o){return this.absellipse(e,t,n,n,s,r,o),this}ellipse(e,t,n,s,r,o,a,l){let c=this.currentPoint.x,h=this.currentPoint.y;return this.absellipse(e+c,t+h,n,s,r,o,a,l),this}absellipse(e,t,n,s,r,o,a,l){let c=new Bs(e,t,n,s,r,o,a,l);if(this.curves.length>0){let d=c.getPoint(0);d.equals(this.currentPoint)||this.lineTo(d.x,d.y)}this.curves.push(c);let h=c.getPoint(1);return this.currentPoint.copy(h),this}copy(e){return super.copy(e),this.currentPoint.copy(e.currentPoint),this}toJSON(){let e=super.toJSON();return e.currentPoint=this.currentPoint.toArray(),e}fromJSON(e){return super.fromJSON(e),this.currentPoint.fromArray(e.currentPoint),this}},zs=class extends ns{constructor(e){super(e),this.uuid=Wn(),this.type="Shape",this.holes=[]}getPointsHoles(e){let t=[];for(let n=0,s=this.holes.length;n<s;n++)t[n]=this.holes[n].getPoints(e);return t}extractPoints(e){return{shape:this.getPoints(e),holes:this.getPointsHoles(e)}}copy(e){super.copy(e),this.holes=[];for(let t=0,n=e.holes.length;t<n;t++){let s=e.holes[t];this.holes.push(s.clone())}return this}toJSON(){let e=super.toJSON();e.uuid=this.uuid,e.holes=[];for(let t=0,n=this.holes.length;t<n;t++){let s=this.holes[t];e.holes.push(s.toJSON())}return e}fromJSON(e){super.fromJSON(e),this.uuid=e.uuid,this.holes=[];for(let t=0,n=e.holes.length;t<n;t++){let s=e.holes[t];this.holes.push(new ns().fromJSON(s))}return this}};function cg(i,e,t=2){let n=e&&e.length,s=n?e[0]*t:i.length,r=xf(i,0,s,t,!0),o=[];if(!r||r.next===r.prev)return o;let a,l,c;if(n&&(r=pg(i,e,r,t)),i.length>80*t){a=i[0],l=i[1];let h=a,d=l;for(let u=t;u<s;u+=t){let f=i[u],m=i[u+1];f<a&&(a=f),m<l&&(l=m),f>h&&(h=f),m>d&&(d=m)}c=Math.max(h-a,d-l),c=c!==0?32767/c:0}return Fr(r,o,t,a,l,c,0),o}function xf(i,e,t,n,s){let r;if(s===Eg(i,e,t,n)>0)for(let o=e;o<t;o+=n)r=Ed(o/n|0,i[o],i[o+1],r);else for(let o=t-n;o>=e;o-=n)r=Ed(o/n|0,i[o],i[o+1],r);return r&&ks(r,r.next)&&(Nr(r),r=r.next),r}function is(i,e){if(!i)return i;e||(e=i);let t=i,n;do if(n=!1,!t.steiner&&(ks(t,t.next)||ft(t.prev,t,t.next)===0)){if(Nr(t),t=e=t.prev,t===t.next)break;n=!0}else t=t.next;while(n||t!==e);return e}function Fr(i,e,t,n,s,r,o){if(!i)return;!o&&r&&vg(i,n,s,r);let a=i;for(;i.prev!==i.next;){let l=i.prev,c=i.next;if(r?ug(i,n,s,r):hg(i)){e.push(l.i,i.i,c.i),Nr(i),i=c.next,a=c.next;continue}if(i=c,i===a){o?o===1?(i=dg(is(i),e),Fr(i,e,t,n,s,r,2)):o===2&&fg(i,e,t,n,s,r):Fr(is(i),e,t,n,s,r,1);break}}}function hg(i){let e=i.prev,t=i,n=i.next;if(ft(e,t,n)>=0)return!1;let s=e.x,r=t.x,o=n.x,a=e.y,l=t.y,c=n.y,h=Math.min(s,r,o),d=Math.min(a,l,c),u=Math.max(s,r,o),f=Math.max(a,l,c),m=n.next;for(;m!==e;){if(m.x>=h&&m.x<=u&&m.y>=d&&m.y<=f&&lr(s,a,r,l,o,c,m.x,m.y)&&ft(m.prev,m,m.next)>=0)return!1;m=m.next}return!0}function ug(i,e,t,n){let s=i.prev,r=i,o=i.next;if(ft(s,r,o)>=0)return!1;let a=s.x,l=r.x,c=o.x,h=s.y,d=r.y,u=o.y,f=Math.min(a,l,c),m=Math.min(h,d,u),x=Math.max(a,l,c),g=Math.max(h,d,u),p=oh(f,m,e,t,n),b=oh(x,g,e,t,n),S=i.prevZ,_=i.nextZ;for(;S&&S.z>=p&&_&&_.z<=b;){if(S.x>=f&&S.x<=x&&S.y>=m&&S.y<=g&&S!==s&&S!==o&&lr(a,h,l,d,c,u,S.x,S.y)&&ft(S.prev,S,S.next)>=0||(S=S.prevZ,_.x>=f&&_.x<=x&&_.y>=m&&_.y<=g&&_!==s&&_!==o&&lr(a,h,l,d,c,u,_.x,_.y)&&ft(_.prev,_,_.next)>=0))return!1;_=_.nextZ}for(;S&&S.z>=p;){if(S.x>=f&&S.x<=x&&S.y>=m&&S.y<=g&&S!==s&&S!==o&&lr(a,h,l,d,c,u,S.x,S.y)&&ft(S.prev,S,S.next)>=0)return!1;S=S.prevZ}for(;_&&_.z<=b;){if(_.x>=f&&_.x<=x&&_.y>=m&&_.y<=g&&_!==s&&_!==o&&lr(a,h,l,d,c,u,_.x,_.y)&&ft(_.prev,_,_.next)>=0)return!1;_=_.nextZ}return!0}function dg(i,e){let t=i;do{let n=t.prev,s=t.next.next;!ks(n,s)&&vf(n,t,t.next,s)&&Ur(n,s)&&Ur(s,n)&&(e.push(n.i,t.i,s.i),Nr(t),Nr(t.next),t=i=s),t=t.next}while(t!==i);return is(t)}function fg(i,e,t,n,s,r){let o=i;do{let a=o.next.next;for(;a!==o.prev;){if(o.i!==a.i&&Sg(o,a)){let l=_f(o,a);o=is(o,o.next),l=is(l,l.next),Fr(o,e,t,n,s,r,0),Fr(l,e,t,n,s,r,0);return}a=a.next}o=o.next}while(o!==i)}function pg(i,e,t,n){let s=[];for(let r=0,o=e.length;r<o;r++){let a=e[r]*n,l=r<o-1?e[r+1]*n:i.length,c=xf(i,a,l,n,!1);c===c.next&&(c.steiner=!0),s.push(bg(c))}s.sort(mg);for(let r=0;r<s.length;r++)t=gg(s[r],t);return t}function mg(i,e){let t=i.x-e.x;if(t===0&&(t=i.y-e.y,t===0)){let n=(i.next.y-i.y)/(i.next.x-i.x),s=(e.next.y-e.y)/(e.next.x-e.x);t=n-s}return t}function gg(i,e){let t=xg(i,e);if(!t)return e;let n=_f(t,i);return is(n,n.next),is(t,t.next)}function xg(i,e){let t=e,n=i.x,s=i.y,r=-1/0,o;if(ks(i,t))return t;do{if(ks(i,t.next))return t.next;if(s<=t.y&&s>=t.next.y&&t.next.y!==t.y){let d=t.x+(s-t.y)*(t.next.x-t.x)/(t.next.y-t.y);if(d<=n&&d>r&&(r=d,o=t.x<t.next.x?t:t.next,d===n))return o}t=t.next}while(t!==e);if(!o)return null;let a=o,l=o.x,c=o.y,h=1/0;t=o;do{if(n>=t.x&&t.x>=l&&n!==t.x&&yf(s<c?n:r,s,l,c,s<c?r:n,s,t.x,t.y)){let d=Math.abs(s-t.y)/(n-t.x);Ur(t,i)&&(d<h||d===h&&(t.x>o.x||t.x===o.x&&yg(o,t)))&&(o=t,h=d)}t=t.next}while(t!==a);return o}function yg(i,e){return ft(i.prev,i,e.prev)<0&&ft(e.next,i,i.next)<0}function vg(i,e,t,n){let s=i;do s.z===0&&(s.z=oh(s.x,s.y,e,t,n)),s.prevZ=s.prev,s.nextZ=s.next,s=s.next;while(s!==i);s.prevZ.nextZ=null,s.prevZ=null,_g(s)}function _g(i){let e,t=1;do{let n=i,s;i=null;let r=null;for(e=0;n;){e++;let o=n,a=0;for(let c=0;c<t&&(a++,o=o.nextZ,!!o);c++);let l=t;for(;a>0||l>0&&o;)a!==0&&(l===0||!o||n.z<=o.z)?(s=n,n=n.nextZ,a--):(s=o,o=o.nextZ,l--),r?r.nextZ=s:i=s,s.prevZ=r,r=s;n=o}r.nextZ=null,t*=2}while(e>1);return i}function oh(i,e,t,n,s){return i=(i-t)*s|0,e=(e-n)*s|0,i=(i|i<<8)&16711935,i=(i|i<<4)&252645135,i=(i|i<<2)&858993459,i=(i|i<<1)&1431655765,e=(e|e<<8)&16711935,e=(e|e<<4)&252645135,e=(e|e<<2)&858993459,e=(e|e<<1)&1431655765,i|e<<1}function bg(i){let e=i,t=i;do(e.x<t.x||e.x===t.x&&e.y<t.y)&&(t=e),e=e.next;while(e!==i);return t}function yf(i,e,t,n,s,r,o,a){return(s-o)*(e-a)>=(i-o)*(r-a)&&(i-o)*(n-a)>=(t-o)*(e-a)&&(t-o)*(r-a)>=(s-o)*(n-a)}function lr(i,e,t,n,s,r,o,a){return!(i===o&&e===a)&&yf(i,e,t,n,s,r,o,a)}function Sg(i,e){return i.next.i!==e.i&&i.prev.i!==e.i&&!Mg(i,e)&&(Ur(i,e)&&Ur(e,i)&&wg(i,e)&&(ft(i.prev,i,e.prev)||ft(i,e.prev,e))||ks(i,e)&&ft(i.prev,i,i.next)>0&&ft(e.prev,e,e.next)>0)}function ft(i,e,t){return(e.y-i.y)*(t.x-e.x)-(e.x-i.x)*(t.y-e.y)}function ks(i,e){return i.x===e.x&&i.y===e.y}function vf(i,e,t,n){let s=$o(ft(i,e,t)),r=$o(ft(i,e,n)),o=$o(ft(t,n,i)),a=$o(ft(t,n,e));return!!(s!==r&&o!==a||s===0&&Zo(i,t,e)||r===0&&Zo(i,n,e)||o===0&&Zo(t,i,n)||a===0&&Zo(t,e,n))}function Zo(i,e,t){return e.x<=Math.max(i.x,t.x)&&e.x>=Math.min(i.x,t.x)&&e.y<=Math.max(i.y,t.y)&&e.y>=Math.min(i.y,t.y)}function $o(i){return i>0?1:i<0?-1:0}function Mg(i,e){let t=i;do{if(t.i!==i.i&&t.next.i!==i.i&&t.i!==e.i&&t.next.i!==e.i&&vf(t,t.next,i,e))return!0;t=t.next}while(t!==i);return!1}function Ur(i,e){return ft(i.prev,i,i.next)<0?ft(i,e,i.next)>=0&&ft(i,i.prev,e)>=0:ft(i,e,i.prev)<0||ft(i,i.next,e)<0}function wg(i,e){let t=i,n=!1,s=(i.x+e.x)/2,r=(i.y+e.y)/2;do t.y>r!=t.next.y>r&&t.next.y!==t.y&&s<(t.next.x-t.x)*(r-t.y)/(t.next.y-t.y)+t.x&&(n=!n),t=t.next;while(t!==i);return n}function _f(i,e){let t=ah(i.i,i.x,i.y),n=ah(e.i,e.x,e.y),s=i.next,r=e.prev;return i.next=e,e.prev=i,t.next=s,s.prev=t,n.next=t,t.prev=n,r.next=n,n.prev=r,n}function Ed(i,e,t,n){let s=ah(i,e,t);return n?(s.next=n.next,s.prev=n,n.next.prev=s,n.next=s):(s.prev=s,s.next=s),s}function Nr(i){i.next.prev=i.prev,i.prev.next=i.next,i.prevZ&&(i.prevZ.nextZ=i.nextZ),i.nextZ&&(i.nextZ.prevZ=i.prevZ)}function ah(i,e,t){return{i,x:e,y:t,prev:null,next:null,z:0,prevZ:null,nextZ:null,steiner:!1}}function Eg(i,e,t,n){let s=0;for(let r=e,o=t-n;r<t;r+=n)s+=(i[o]-i[r])*(i[r+1]+i[o+1]),o=r;return s}var lh=class{static triangulate(e,t,n=2){return cg(e,t,n)}},Ai=class i{static area(e){let t=e.length,n=0;for(let s=t-1,r=0;r<t;s=r++)n+=e[s].x*e[r].y-e[r].x*e[s].y;return n*.5}static isClockWise(e){return i.area(e)<0}static triangulateShape(e,t){let n=[],s=[],r=[];Td(e),Ad(n,e);let o=e.length;t.forEach(Td);for(let l=0;l<t.length;l++)s.push(o),o+=t[l].length,Ad(n,t[l]);let a=lh.triangulate(n,s);for(let l=0;l<a.length;l+=3)r.push(a.slice(l,l+3));return r}};function Td(i){let e=i.length;e>2&&i[e-1].equals(i[0])&&i.pop()}function Ad(i,e){for(let t=0;t<e.length;t++)i.push(e[t].x),i.push(e[t].y)}var ss=class i extends It{constructor(e=1,t=1,n=1,s=1){super(),this.type="PlaneGeometry",this.parameters={width:e,height:t,widthSegments:n,heightSegments:s};let r=e/2,o=t/2,a=Math.floor(n),l=Math.floor(s),c=a+1,h=l+1,d=e/a,u=t/l,f=[],m=[],x=[],g=[];for(let p=0;p<h;p++){let b=p*u-o;for(let S=0;S<c;S++){let _=S*d-r;m.push(_,-b,0),x.push(0,0,1),g.push(S/a),g.push(1-p/l)}}for(let p=0;p<l;p++)for(let b=0;b<a;b++){let S=b+c*p,_=b+c*(p+1),A=b+1+c*(p+1),w=b+1+c*p;f.push(S,_,w),f.push(_,A,w)}this.setIndex(f),this.setAttribute("position",new nt(m,3)),this.setAttribute("normal",new nt(x,3)),this.setAttribute("uv",new nt(g,2))}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(e){return new i(e.width,e.height,e.widthSegments,e.heightSegments)}},Or=class i extends It{constructor(e=.5,t=1,n=32,s=1,r=0,o=Math.PI*2){super(),this.type="RingGeometry",this.parameters={innerRadius:e,outerRadius:t,thetaSegments:n,phiSegments:s,thetaStart:r,thetaLength:o},n=Math.max(3,n),s=Math.max(1,s);let a=[],l=[],c=[],h=[],d=e,u=(t-e)/s,f=new L,m=new xe;for(let x=0;x<=s;x++){for(let g=0;g<=n;g++){let p=r+g/n*o;f.x=d*Math.cos(p),f.y=d*Math.sin(p),l.push(f.x,f.y,f.z),c.push(0,0,1),m.x=(f.x/t+1)/2,m.y=(f.y/t+1)/2,h.push(m.x,m.y)}d+=u}for(let x=0;x<s;x++){let g=x*(n+1);for(let p=0;p<n;p++){let b=p+g,S=b,_=b+n+1,A=b+n+2,w=b+1;a.push(S,_,w),a.push(_,A,w)}}this.setIndex(a),this.setAttribute("position",new nt(l,3)),this.setAttribute("normal",new nt(c,3)),this.setAttribute("uv",new nt(h,2))}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(e){return new i(e.innerRadius,e.outerRadius,e.thetaSegments,e.phiSegments,e.thetaStart,e.thetaLength)}},Br=class i extends It{constructor(e=new zs([new xe(0,.5),new xe(-.5,-.5),new xe(.5,-.5)]),t=12){super(),this.type="ShapeGeometry",this.parameters={shapes:e,curveSegments:t};let n=[],s=[],r=[],o=[],a=0,l=0;if(Array.isArray(e)===!1)c(e);else for(let h=0;h<e.length;h++)c(e[h]),this.addGroup(a,l,h),a+=l,l=0;this.setIndex(n),this.setAttribute("position",new nt(s,3)),this.setAttribute("normal",new nt(r,3)),this.setAttribute("uv",new nt(o,2));function c(h){let d=s.length/3,u=h.extractPoints(t),f=u.shape,m=u.holes;Ai.isClockWise(f)===!1&&(f=f.reverse());for(let g=0,p=m.length;g<p;g++){let b=m[g];Ai.isClockWise(b)===!0&&(m[g]=b.reverse())}let x=Ai.triangulateShape(f,m);for(let g=0,p=m.length;g<p;g++){let b=m[g];f=f.concat(b)}for(let g=0,p=f.length;g<p;g++){let b=f[g];s.push(b.x,b.y,0),r.push(0,0,1),o.push(b.x,b.y)}for(let g=0,p=x.length;g<p;g++){let b=x[g],S=b[0]+d,_=b[1]+d,A=b[2]+d;n.push(S,_,A),l+=3}}}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}toJSON(){let e=super.toJSON(),t=this.parameters.shapes;return Tg(t,e)}static fromJSON(e,t){let n=[];for(let s=0,r=e.shapes.length;s<r;s++){let o=t[e.shapes[s]];n.push(o)}return new i(n,e.curveSegments)}};function Tg(i,e){if(e.shapes=[],Array.isArray(i))for(let t=0,n=i.length;t<n;t++){let s=i[t];e.shapes.push(s.uuid)}else e.shapes.push(i.uuid);return e}var Vs=class i extends It{constructor(e=1,t=32,n=16,s=0,r=Math.PI*2,o=0,a=Math.PI){super(),this.type="SphereGeometry",this.parameters={radius:e,widthSegments:t,heightSegments:n,phiStart:s,phiLength:r,thetaStart:o,thetaLength:a},t=Math.max(3,Math.floor(t)),n=Math.max(2,Math.floor(n));let l=Math.min(o+a,Math.PI),c=0,h=[],d=new L,u=new L,f=[],m=[],x=[],g=[];for(let p=0;p<=n;p++){let b=[],S=p/n,_=o+S*a,A=e*Math.cos(_),w=Math.sqrt(e*e-A*A),E=0;p===0&&o===0?E=.5/t:p===n&&l===Math.PI&&(E=-.5/t);for(let y=0;y<=t;y++){let T=y/t,C=s+T*r;d.x=-w*Math.cos(C),d.y=A,d.z=w*Math.sin(C),m.push(d.x,d.y,d.z),u.copy(d).normalize(),x.push(u.x,u.y,u.z),g.push(T+E,1-S),b.push(c++)}h.push(b)}for(let p=0;p<n;p++)for(let b=0;b<t;b++){let S=h[p][b+1],_=h[p][b],A=h[p+1][b],w=h[p+1][b+1];(p!==0||o>0)&&f.push(S,_,w),(p!==n-1||l<Math.PI)&&f.push(_,A,w)}this.setIndex(f),this.setAttribute("position",new nt(m,3)),this.setAttribute("normal",new nt(x,3)),this.setAttribute("uv",new nt(g,2))}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(e){return new i(e.radius,e.widthSegments,e.heightSegments,e.phiStart,e.phiLength,e.thetaStart,e.thetaLength)}};var zr=class extends It{constructor(e=null){if(super(),this.type="WireframeGeometry",this.parameters={geometry:e},e!==null){let t=[],n=new Set,s=new L,r=new L;if(e.index!==null){let o=e.attributes.position,a=e.index,l=e.groups;l.length===0&&(l=[{start:0,count:a.count,materialIndex:0}]);for(let c=0,h=l.length;c<h;++c){let d=l[c],u=d.start,f=d.count;for(let m=u,x=u+f;m<x;m+=3)for(let g=0;g<3;g++){let p=a.getX(m+g),b=a.getX(m+(g+1)%3);s.fromBufferAttribute(o,p),r.fromBufferAttribute(o,b),Pd(s,r,n)===!0&&(t.push(s.x,s.y,s.z),t.push(r.x,r.y,r.z))}}}else{let o=e.attributes.position;for(let a=0,l=o.count/3;a<l;a++)for(let c=0;c<3;c++){let h=3*a+c,d=3*a+(c+1)%3;s.fromBufferAttribute(o,h),r.fromBufferAttribute(o,d),Pd(s,r,n)===!0&&(t.push(s.x,s.y,s.z),t.push(r.x,r.y,r.z))}}this.setAttribute("position",new nt(t,3))}}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}};function Pd(i,e,t){let n=`${i.x},${i.y},${i.z}-${e.x},${e.y},${e.z}`,s=`${e.x},${e.y},${e.z}-${i.x},${i.y},${i.z}`;return t.has(n)===!0||t.has(s)===!0?!1:(t.add(n),t.add(s),!0)}function as(i){let e={};for(let t in i){e[t]={};for(let n in i[t]){let s=i[t][n];if(Rd(s))s.isRenderTargetTexture?(Pe("UniformsUtils: Textures of render targets cannot be cloned via cloneUniforms() or mergeUniforms()."),e[t][n]=null):e[t][n]=s.clone();else if(Array.isArray(s))if(Rd(s[0])){let r=[];for(let o=0,a=s.length;o<a;o++)r[o]=s[o].clone();e[t][n]=r}else e[t][n]=s.slice();else e[t][n]=s}}return e}function Yt(i){let e={};for(let t=0;t<i.length;t++){let n=as(i[t]);for(let s in n)e[s]=n[s]}return e}function Rd(i){return i&&(i.isColor||i.isMatrix3||i.isMatrix4||i.isVector2||i.isVector3||i.isVector4||i.isTexture||i.isQuaternion)}function Ag(i){let e=[];for(let t=0;t<i.length;t++)e.push(i[t].clone());return e}function Nh(i){let e=i.getRenderTarget();return e===null?i.outputColorSpace:e.isXRRenderTarget===!0?e.texture.colorSpace:Xe.workingColorSpace}var Qr={clone:as,merge:Yt},Pg=`void main() {
	gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
}`,Rg=`void main() {
	gl_FragColor = vec4( 1.0, 0.0, 0.0, 1.0 );
}`,Jt=class extends Ci{constructor(e){super(),this.isShaderMaterial=!0,this.type="ShaderMaterial",this.defines={},this.uniforms={},this.uniformsGroups=[],this.vertexShader=Pg,this.fragmentShader=Rg,this.linewidth=1,this.wireframe=!1,this.wireframeLinewidth=1,this.fog=!1,this.lights=!1,this.clipping=!1,this.forceSinglePass=!0,this.extensions={clipCullDistance:!1,multiDraw:!1},this.defaultAttributeValues={color:[1,1,1],uv:[0,0],uv1:[0,0]},this.index0AttributeName=void 0,this.uniformsNeedUpdate=!1,this.glslVersion=null,e!==void 0&&this.setValues(e)}copy(e){return super.copy(e),this.fragmentShader=e.fragmentShader,this.vertexShader=e.vertexShader,this.uniforms=as(e.uniforms),this.uniformsGroups=Ag(e.uniformsGroups),this.defines=Object.assign({},e.defines),this.wireframe=e.wireframe,this.wireframeLinewidth=e.wireframeLinewidth,this.fog=e.fog,this.lights=e.lights,this.clipping=e.clipping,this.extensions=Object.assign({},e.extensions),this.glslVersion=e.glslVersion,this.defaultAttributeValues=Object.assign({},e.defaultAttributeValues),this.index0AttributeName=e.index0AttributeName,this.uniformsNeedUpdate=e.uniformsNeedUpdate,this}toJSON(e){let t=super.toJSON(e);t.glslVersion=this.glslVersion,t.uniforms={};for(let s in this.uniforms){let o=this.uniforms[s].value;o&&o.isTexture?t.uniforms[s]={type:"t",value:o.toJSON(e).uuid}:o&&o.isColor?t.uniforms[s]={type:"c",value:o.getHex()}:o&&o.isVector2?t.uniforms[s]={type:"v2",value:o.toArray()}:o&&o.isVector3?t.uniforms[s]={type:"v3",value:o.toArray()}:o&&o.isVector4?t.uniforms[s]={type:"v4",value:o.toArray()}:o&&o.isMatrix3?t.uniforms[s]={type:"m3",value:o.toArray()}:o&&o.isMatrix4?t.uniforms[s]={type:"m4",value:o.toArray()}:t.uniforms[s]={value:o}}Object.keys(this.defines).length>0&&(t.defines=this.defines),t.vertexShader=this.vertexShader,t.fragmentShader=this.fragmentShader,t.lights=this.lights,t.clipping=this.clipping;let n={};for(let s in this.extensions)this.extensions[s]===!0&&(n[s]=!0);return Object.keys(n).length>0&&(t.extensions=n),t}fromJSON(e,t){if(super.fromJSON(e,t),e.uniforms!==void 0)for(let n in e.uniforms){let s=e.uniforms[n];switch(this.uniforms[n]={},s.type){case"t":this.uniforms[n].value=t[s.value]||null;break;case"c":this.uniforms[n].value=new qe().setHex(s.value);break;case"v2":this.uniforms[n].value=new xe().fromArray(s.value);break;case"v3":this.uniforms[n].value=new L().fromArray(s.value);break;case"v4":this.uniforms[n].value=new it().fromArray(s.value);break;case"m3":this.uniforms[n].value=new Ne().fromArray(s.value);break;case"m4":this.uniforms[n].value=new rt().fromArray(s.value);break;default:this.uniforms[n].value=s.value}}if(e.defines!==void 0&&(this.defines=e.defines),e.vertexShader!==void 0&&(this.vertexShader=e.vertexShader),e.fragmentShader!==void 0&&(this.fragmentShader=e.fragmentShader),e.glslVersion!==void 0&&(this.glslVersion=e.glslVersion),e.extensions!==void 0)for(let n in e.extensions)this.extensions[n]=e.extensions[n];return e.lights!==void 0&&(this.lights=e.lights),e.clipping!==void 0&&(this.clipping=e.clipping),this}},Pa=class extends Jt{constructor(e){super(e),this.isRawShaderMaterial=!0,this.type="RawShaderMaterial"}};var Ra=class extends Ci{constructor(e){super(),this.isMeshDepthMaterial=!0,this.type="MeshDepthMaterial",this.depthPacking=sf,this.map=null,this.alphaMap=null,this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.wireframe=!1,this.wireframeLinewidth=1,this.setValues(e)}copy(e){return super.copy(e),this.depthPacking=e.depthPacking,this.map=e.map,this.alphaMap=e.alphaMap,this.displacementMap=e.displacementMap,this.displacementScale=e.displacementScale,this.displacementBias=e.displacementBias,this.wireframe=e.wireframe,this.wireframeLinewidth=e.wireframeLinewidth,this}},Ca=class extends Ci{constructor(e){super(),this.isMeshDistanceMaterial=!0,this.type="MeshDistanceMaterial",this.map=null,this.alphaMap=null,this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.setValues(e)}copy(e){return super.copy(e),this.map=e.map,this.alphaMap=e.alphaMap,this.displacementMap=e.displacementMap,this.displacementScale=e.displacementScale,this.displacementBias=e.displacementBias,this}};function Ko(i,e){return!i||i.constructor===e?i:typeof e.BYTES_PER_ELEMENT=="number"?new e(i):Array.prototype.slice.call(i)}var Ii=class{constructor(e,t,n,s){this.parameterPositions=e,this._cachedIndex=0,this.resultBuffer=s!==void 0?s:new t.constructor(n),this.sampleValues=t,this.valueSize=n,this.settings=null,this.DefaultSettings_={}}evaluate(e){let t=this.parameterPositions,n=this._cachedIndex,s=t[n],r=t[n-1];n:{e:{let o;t:{i:if(!(e<s)){for(let a=n+2;;){if(s===void 0){if(e<r)break i;return n=t.length,this._cachedIndex=n,this.copySampleValue_(n-1)}if(n===a)break;if(r=s,s=t[++n],e<s)break e}o=t.length;break t}if(!(e>=r)){let a=t[1];e<a&&(n=2,r=a);for(let l=n-2;;){if(r===void 0)return this._cachedIndex=0,this.copySampleValue_(0);if(n===l)break;if(s=r,r=t[--n-1],e>=r)break e}o=n,n=0;break t}break n}for(;n<o;){let a=n+o>>>1;e<t[a]?o=a:n=a+1}if(s=t[n],r=t[n-1],r===void 0)return this._cachedIndex=0,this.copySampleValue_(0);if(s===void 0)return n=t.length,this._cachedIndex=n,this.copySampleValue_(n-1)}this._cachedIndex=n,this.intervalChanged_(n,r,s)}return this.interpolate_(n,r,e,s)}getSettings_(){return this.settings||this.DefaultSettings_}copySampleValue_(e){let t=this.resultBuffer,n=this.sampleValues,s=this.valueSize,r=e*s;for(let o=0;o!==s;++o)t[o]=n[r+o];return t}interpolate_(){throw new Error("THREE.Interpolant: Call to abstract method.")}intervalChanged_(){}},Ia=class extends Ii{constructor(e,t,n,s){super(e,t,n,s),this._weightPrev=-0,this._offsetPrev=-0,this._weightNext=-0,this._offsetNext=-0,this.DefaultSettings_={endingStart:nh,endingEnd:nh}}intervalChanged_(e,t,n){let s=this.parameterPositions,r=e-2,o=e+1,a=s[r],l=s[o];if(a===void 0)switch(this.getSettings_().endingStart){case ih:r=e,a=2*t-n;break;case sh:r=s.length-2,a=t+s[r]-s[r+1];break;default:r=e,a=n}if(l===void 0)switch(this.getSettings_().endingEnd){case ih:o=e,l=2*n-t;break;case sh:o=1,l=n+s[1]-s[0];break;default:o=e-1,l=t}let c=(n-t)*.5,h=this.valueSize;this._weightPrev=c/(t-a),this._weightNext=c/(l-n),this._offsetPrev=r*h,this._offsetNext=o*h}interpolate_(e,t,n,s){let r=this.resultBuffer,o=this.sampleValues,a=this.valueSize,l=e*a,c=l-a,h=this._offsetPrev,d=this._offsetNext,u=this._weightPrev,f=this._weightNext,m=(n-t)/(s-t),x=m*m,g=x*m,p=-u*g+2*u*x-u*m,b=(1+u)*g+(-1.5-2*u)*x+(-.5+u)*m+1,S=(-1-f)*g+(1.5+f)*x+.5*m,_=f*g-f*x;for(let A=0;A!==a;++A)r[A]=p*o[h+A]+b*o[c+A]+S*o[l+A]+_*o[d+A];return r}},La=class extends Ii{constructor(e,t,n,s){super(e,t,n,s)}interpolate_(e,t,n,s){let r=this.resultBuffer,o=this.sampleValues,a=this.valueSize,l=e*a,c=l-a,h=(n-t)/(s-t),d=1-h;for(let u=0;u!==a;++u)r[u]=o[c+u]*d+o[l+u]*h;return r}},Da=class extends Ii{constructor(e,t,n,s){super(e,t,n,s)}interpolate_(e){return this.copySampleValue_(e-1)}},Fa=class extends Ii{interpolate_(e,t,n,s){let r=this.resultBuffer,o=this.sampleValues,a=this.valueSize,l=e*a,c=l-a,h=this.inTangents,d=this.outTangents;if(!h||!d){let m=(n-t)/(s-t),x=1-m;for(let g=0;g!==a;++g)r[g]=o[c+g]*x+o[l+g]*m;return r}let u=a*2,f=e-1;for(let m=0;m!==a;++m){let x=o[c+m],g=o[l+m],p=f*u+m*2,b=d[p],S=d[p+1],_=e*u+m*2,A=h[_],w=h[_+1],E=(n-t)/(s-t),y,T,C,R,D;for(let I=0;I<8;I++){y=E*E,T=y*E,C=1-E,R=C*C,D=R*C;let F=D*t+3*R*E*b+3*C*y*A+T*s-n;if(Math.abs(F)<1e-10)break;let q=3*R*(b-t)+6*C*E*(A-b)+3*y*(s-A);if(Math.abs(q)<1e-10)break;E=E-F/q,E=Math.max(0,Math.min(1,E))}r[m]=D*x+3*R*E*S+3*C*y*w+T*g}return r}},pn=class{constructor(e,t,n,s){if(e===void 0)throw new Error("THREE.KeyframeTrack: track name is undefined");if(t===void 0||t.length===0)throw new Error("THREE.KeyframeTrack: no keyframes in track named "+e);this.name=e,this.times=Ko(t,this.TimeBufferType),this.values=Ko(n,this.ValueBufferType),this.setInterpolation(s||this.DefaultInterpolation)}static toJSON(e){let t=e.constructor,n;if(t.toJSON!==this.toJSON)n=t.toJSON(e);else{n={name:e.name,times:Ko(e.times,Array),values:Ko(e.values,Array)};let s=e.getInterpolation();s!==e.DefaultInterpolation&&(n.interpolation=s)}return n.type=e.ValueTypeName,n}InterpolantFactoryMethodDiscrete(e){return new Da(this.times,this.values,this.getValueSize(),e)}InterpolantFactoryMethodLinear(e){return new La(this.times,this.values,this.getValueSize(),e)}InterpolantFactoryMethodSmooth(e){return new Ia(this.times,this.values,this.getValueSize(),e)}InterpolantFactoryMethodBezier(e){let t=new Fa(this.times,this.values,this.getValueSize(),e);return this.settings&&(t.inTangents=this.settings.inTangents,t.outTangents=this.settings.outTangents),t}setInterpolation(e){let t;switch(e){case fr:t=this.InterpolantFactoryMethodDiscrete;break;case da:t=this.InterpolantFactoryMethodLinear;break;case ea:t=this.InterpolantFactoryMethodSmooth;break;case th:t=this.InterpolantFactoryMethodBezier;break}if(t===void 0){let n="unsupported interpolation for "+this.ValueTypeName+" keyframe track named "+this.name;if(this.createInterpolant===void 0)if(e!==this.DefaultInterpolation)this.setInterpolation(this.DefaultInterpolation);else throw new Error(n);return Pe("KeyframeTrack:",n),this}return this.createInterpolant=t,this}getInterpolation(){switch(this.createInterpolant){case this.InterpolantFactoryMethodDiscrete:return fr;case this.InterpolantFactoryMethodLinear:return da;case this.InterpolantFactoryMethodSmooth:return ea;case this.InterpolantFactoryMethodBezier:return th}}getValueSize(){return this.values.length/this.times.length}shift(e){if(e!==0){let t=this.times;for(let n=0,s=t.length;n!==s;++n)t[n]+=e}return this}scale(e){if(e!==1){let t=this.times;for(let n=0,s=t.length;n!==s;++n)t[n]*=e}return this}trim(e,t){let n=this.times,s=n.length,r=0,o=s-1;for(;r!==s&&n[r]<e;)++r;for(;o!==-1&&n[o]>t;)--o;if(++o,r!==0||o!==s){r>=o&&(o=Math.max(o,1),r=o-1);let a=this.getValueSize();this.times=n.slice(r,o),this.values=this.values.slice(r*a,o*a)}return this}validate(){let e=!0,t=this.getValueSize();t-Math.floor(t)!==0&&(Le("KeyframeTrack: Invalid value size in track.",this),e=!1);let n=this.times,s=this.values,r=n.length;r===0&&(Le("KeyframeTrack: Track is empty.",this),e=!1);let o=null;for(let a=0;a!==r;a++){let l=n[a];if(typeof l=="number"&&isNaN(l)){Le("KeyframeTrack: Time is not a valid number.",this,a,l),e=!1;break}if(o!==null&&o>l){Le("KeyframeTrack: Out of order keys.",this,a,l,o),e=!1;break}o=l}if(s!==void 0&&bm(s))for(let a=0,l=s.length;a!==l;++a){let c=s[a];if(isNaN(c)){Le("KeyframeTrack: Value is not a valid number.",this,a,c),e=!1;break}}return e}optimize(){let e=this.times.slice(),t=this.values.slice(),n=this.getValueSize(),s=this.getInterpolation()===ea,r=e.length-1,o=1;for(let a=1;a<r;++a){let l=!1,c=e[a],h=e[a+1];if(c!==h&&(a!==1||c!==e[0]))if(s)l=!0;else{let d=a*n,u=d-n,f=d+n;for(let m=0;m!==n;++m){let x=t[d+m];if(x!==t[u+m]||x!==t[f+m]){l=!0;break}}}if(l){if(a!==o){e[o]=e[a];let d=a*n,u=o*n;for(let f=0;f!==n;++f)t[u+f]=t[d+f]}++o}}if(r>0){e[o]=e[r];for(let a=r*n,l=o*n,c=0;c!==n;++c)t[l+c]=t[a+c];++o}return o!==e.length?(this.times=e.slice(0,o),this.values=t.slice(0,o*n)):(this.times=e,this.values=t),this}clone(){let e=this.times.slice(),t=this.values.slice(),n=this.constructor,s=new n(this.name,e,t);return s.createInterpolant=this.createInterpolant,s}};pn.prototype.ValueTypeName="";pn.prototype.TimeBufferType=Float32Array;pn.prototype.ValueBufferType=Float32Array;pn.prototype.DefaultInterpolation=da;var Li=class extends pn{constructor(e,t,n){super(e,t,n)}};Li.prototype.ValueTypeName="bool";Li.prototype.ValueBufferType=Array;Li.prototype.DefaultInterpolation=fr;Li.prototype.InterpolantFactoryMethodLinear=void 0;Li.prototype.InterpolantFactoryMethodSmooth=void 0;var Ua=class extends pn{constructor(e,t,n,s){super(e,t,n,s)}};Ua.prototype.ValueTypeName="color";var Na=class extends pn{constructor(e,t,n,s){super(e,t,n,s)}};Na.prototype.ValueTypeName="number";var Oa=class extends Ii{constructor(e,t,n,s){super(e,t,n,s)}interpolate_(e,t,n,s){let r=this.resultBuffer,o=this.sampleValues,a=this.valueSize,l=(n-t)/(s-t),c=e*a;for(let h=c+a;c!==h;c+=4)Yn.slerpFlat(r,0,o,c-a,o,c,l);return r}},kr=class extends pn{constructor(e,t,n,s){super(e,t,n,s)}InterpolantFactoryMethodLinear(e){return new Oa(this.times,this.values,this.getValueSize(),e)}};kr.prototype.ValueTypeName="quaternion";kr.prototype.InterpolantFactoryMethodSmooth=void 0;var Di=class extends pn{constructor(e,t,n){super(e,t,n)}};Di.prototype.ValueTypeName="string";Di.prototype.ValueBufferType=Array;Di.prototype.DefaultInterpolation=fr;Di.prototype.InterpolantFactoryMethodLinear=void 0;Di.prototype.InterpolantFactoryMethodSmooth=void 0;var Ba=class extends pn{constructor(e,t,n,s){super(e,t,n,s)}};Ba.prototype.ValueTypeName="vector";var za=class{constructor(e,t,n){let s=this,r=!1,o=0,a=0,l,c=[];this.onStart=void 0,this.onLoad=e,this.onProgress=t,this.onError=n,this._abortController=null,this.itemStart=function(h){a++,r===!1&&s.onStart!==void 0&&s.onStart(h,o,a),r=!0},this.itemEnd=function(h){o++,s.onProgress!==void 0&&s.onProgress(h,o,a),o===a&&(r=!1,s.onLoad!==void 0&&s.onLoad())},this.itemError=function(h){s.onError!==void 0&&s.onError(h)},this.resolveURL=function(h){return h=h.normalize("NFC"),l?l(h):h},this.setURLModifier=function(h){return l=h,this},this.addHandler=function(h,d){return c.push(h,d),this},this.removeHandler=function(h){let d=c.indexOf(h);return d!==-1&&c.splice(d,2),this},this.getHandler=function(h){for(let d=0,u=c.length;d<u;d+=2){let f=c[d],m=c[d+1];if(f.global&&(f.lastIndex=0),f.test(h))return m}return null},this.abort=function(){return this.abortController.abort(),this._abortController=null,this}}get abortController(){return this._abortController||(this._abortController=new AbortController),this._abortController}},bf=new za,ka=class{constructor(e){this.manager=e!==void 0?e:bf,this.crossOrigin="anonymous",this.withCredentials=!1,this.path="",this.resourcePath="",this.requestHeader={},typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("observe",{detail:this}))}load(){}loadAsync(e,t){let n=this;return new Promise(function(s,r){n.load(e,s,t,r)})}parse(){}setCrossOrigin(e){return this.crossOrigin=e,this}setWithCredentials(e){return this.withCredentials=e,this}setPath(e){return this.path=e,this}setResourcePath(e){return this.resourcePath=e,this}setRequestHeader(e){return this.requestHeader=e,this}abort(){return this}};ka.DEFAULT_MATERIAL_NAME="__DEFAULT";var Jo=new L,jo=new Yn,Vn=new L,Vr=class extends un{constructor(){super(),this.isCamera=!0,this.type="Camera",this.matrixWorldInverse=new rt,this.projectionMatrix=new rt,this.projectionMatrixInverse=new rt,this.coordinateSystem=Pn,this._reversedDepth=!1}get reversedDepth(){return this._reversedDepth}copy(e,t){return super.copy(e,t),this.matrixWorldInverse.copy(e.matrixWorldInverse),this.projectionMatrix.copy(e.projectionMatrix),this.projectionMatrixInverse.copy(e.projectionMatrixInverse),this.coordinateSystem=e.coordinateSystem,this}getWorldDirection(e){return super.getWorldDirection(e).negate()}updateMatrixWorld(e){super.updateMatrixWorld(e),this.matrixWorld.decompose(Jo,jo,Vn),Vn.x===1&&Vn.y===1&&Vn.z===1?this.matrixWorldInverse.copy(this.matrixWorld).invert():this.matrixWorldInverse.compose(Jo,jo,Vn.set(1,1,1)).invert()}updateWorldMatrix(e,t,n=!1){super.updateWorldMatrix(e,t,n),this.matrixWorld.decompose(Jo,jo,Vn),Vn.x===1&&Vn.y===1&&Vn.z===1?this.matrixWorldInverse.copy(this.matrixWorld).invert():this.matrixWorldInverse.compose(Jo,jo,Vn.set(1,1,1)).invert()}clone(){return new this.constructor().copy(this)}},Ei=new L,Cd=new xe,Id=new xe,qt=class extends Vr{constructor(e=50,t=1,n=.1,s=2e3){super(),this.isPerspectiveCamera=!0,this.type="PerspectiveCamera",this.fov=e,this.zoom=1,this.near=n,this.far=s,this.focus=10,this.aspect=t,this.view=null,this.filmGauge=35,this.filmOffset=0,this.updateProjectionMatrix()}copy(e,t){return super.copy(e,t),this.fov=e.fov,this.zoom=e.zoom,this.near=e.near,this.far=e.far,this.focus=e.focus,this.aspect=e.aspect,this.view=e.view===null?null:Object.assign({},e.view),this.filmGauge=e.filmGauge,this.filmOffset=e.filmOffset,this}setFocalLength(e){let t=.5*this.getFilmHeight()/e;this.fov=Ds*2*Math.atan(t),this.updateProjectionMatrix()}getFocalLength(){let e=Math.tan(cr*.5*this.fov);return .5*this.getFilmHeight()/e}getEffectiveFOV(){return Ds*2*Math.atan(Math.tan(cr*.5*this.fov)/this.zoom)}getFilmWidth(){return this.filmGauge*Math.min(this.aspect,1)}getFilmHeight(){return this.filmGauge/Math.max(this.aspect,1)}getViewBounds(e,t,n){Ei.set(-1,-1,.5).applyMatrix4(this.projectionMatrixInverse),t.set(Ei.x,Ei.y).multiplyScalar(-e/Ei.z),Ei.set(1,1,.5).applyMatrix4(this.projectionMatrixInverse),n.set(Ei.x,Ei.y).multiplyScalar(-e/Ei.z)}getViewSize(e,t){return this.getViewBounds(e,Cd,Id),t.subVectors(Id,Cd)}setViewOffset(e,t,n,s,r,o){this.aspect=e/t,this.view===null&&(this.view={enabled:!0,fullWidth:1,fullHeight:1,offsetX:0,offsetY:0,width:1,height:1}),this.view.enabled=!0,this.view.fullWidth=e,this.view.fullHeight=t,this.view.offsetX=n,this.view.offsetY=s,this.view.width=r,this.view.height=o,this.updateProjectionMatrix()}clearViewOffset(){this.view!==null&&(this.view.enabled=!1),this.updateProjectionMatrix()}updateProjectionMatrix(){let e=this.near,t=e*Math.tan(cr*.5*this.fov)/this.zoom,n=2*t,s=this.aspect*n,r=-.5*s,o=this.view;if(this.view!==null&&this.view.enabled){let l=o.fullWidth,c=o.fullHeight;r+=o.offsetX*s/l,t-=o.offsetY*n/c,s*=o.width/l,n*=o.height/c}let a=this.filmOffset;a!==0&&(r+=e*a/this.getFilmWidth()),this.projectionMatrix.makePerspective(r,r+s,t,t-n,e,this.far,this.coordinateSystem,this.reversedDepth),this.projectionMatrixInverse.copy(this.projectionMatrix).invert()}toJSON(e){let t=super.toJSON(e);return t.object.fov=this.fov,t.object.zoom=this.zoom,t.object.near=this.near,t.object.far=this.far,t.object.focus=this.focus,t.object.aspect=this.aspect,this.view!==null&&(t.object.view=Object.assign({},this.view)),t.object.filmGauge=this.filmGauge,t.object.filmOffset=this.filmOffset,t}};var rs=class extends Vr{constructor(e=-1,t=1,n=1,s=-1,r=.1,o=2e3){super(),this.isOrthographicCamera=!0,this.type="OrthographicCamera",this.zoom=1,this.view=null,this.left=e,this.right=t,this.top=n,this.bottom=s,this.near=r,this.far=o,this.updateProjectionMatrix()}copy(e,t){return super.copy(e,t),this.left=e.left,this.right=e.right,this.top=e.top,this.bottom=e.bottom,this.near=e.near,this.far=e.far,this.zoom=e.zoom,this.view=e.view===null?null:Object.assign({},e.view),this}setViewOffset(e,t,n,s,r,o){this.view===null&&(this.view={enabled:!0,fullWidth:1,fullHeight:1,offsetX:0,offsetY:0,width:1,height:1}),this.view.enabled=!0,this.view.fullWidth=e,this.view.fullHeight=t,this.view.offsetX=n,this.view.offsetY=s,this.view.width=r,this.view.height=o,this.updateProjectionMatrix()}clearViewOffset(){this.view!==null&&(this.view.enabled=!1),this.updateProjectionMatrix()}updateProjectionMatrix(){let e=(this.right-this.left)/(2*this.zoom),t=(this.top-this.bottom)/(2*this.zoom),n=(this.right+this.left)/2,s=(this.top+this.bottom)/2,r=n-e,o=n+e,a=s+t,l=s-t;if(this.view!==null&&this.view.enabled){let c=(this.right-this.left)/this.view.fullWidth/this.zoom,h=(this.top-this.bottom)/this.view.fullHeight/this.zoom;r+=c*this.view.offsetX,o=r+c*this.view.width,a-=h*this.view.offsetY,l=a-h*this.view.height}this.projectionMatrix.makeOrthographic(r,o,a,l,this.near,this.far,this.coordinateSystem,this.reversedDepth),this.projectionMatrixInverse.copy(this.projectionMatrix).invert()}toJSON(e){let t=super.toJSON(e);return t.object.zoom=this.zoom,t.object.left=this.left,t.object.right=this.right,t.object.top=this.top,t.object.bottom=this.bottom,t.object.near=this.near,t.object.far=this.far,this.view!==null&&(t.object.view=Object.assign({},this.view)),t}};var Hr=class extends It{constructor(){super(),this.isInstancedBufferGeometry=!0,this.type="InstancedBufferGeometry",this.instanceCount=1/0}copy(e){return super.copy(e),this.instanceCount=e.instanceCount,this}toJSON(){let e=super.toJSON();return e.instanceCount=this.instanceCount,e.isInstancedBufferGeometry=!0,e}};var As=-90,Ps=1,Va=class extends un{constructor(e,t,n){super(),this.type="CubeCamera",this.renderTarget=n,this.coordinateSystem=null,this.activeMipmapLevel=0;let s=new qt(As,Ps,e,t);s.layers=this.layers,this.add(s);let r=new qt(As,Ps,e,t);r.layers=this.layers,this.add(r);let o=new qt(As,Ps,e,t);o.layers=this.layers,this.add(o);let a=new qt(As,Ps,e,t);a.layers=this.layers,this.add(a);let l=new qt(As,Ps,e,t);l.layers=this.layers,this.add(l);let c=new qt(As,Ps,e,t);c.layers=this.layers,this.add(c)}updateCoordinateSystem(){let e=this.coordinateSystem,t=this.children.concat(),[n,s,r,o,a,l]=t;for(let c of t)this.remove(c);if(e===Pn)n.up.set(0,1,0),n.lookAt(1,0,0),s.up.set(0,1,0),s.lookAt(-1,0,0),r.up.set(0,0,-1),r.lookAt(0,1,0),o.up.set(0,0,1),o.lookAt(0,-1,0),a.up.set(0,1,0),a.lookAt(0,0,1),l.up.set(0,1,0),l.lookAt(0,0,-1);else if(e===gr)n.up.set(0,-1,0),n.lookAt(-1,0,0),s.up.set(0,-1,0),s.lookAt(1,0,0),r.up.set(0,0,1),r.lookAt(0,1,0),o.up.set(0,0,-1),o.lookAt(0,-1,0),a.up.set(0,-1,0),a.lookAt(0,0,1),l.up.set(0,-1,0),l.lookAt(0,0,-1);else throw new Error("THREE.CubeCamera.updateCoordinateSystem(): Invalid coordinate system: "+e);for(let c of t)this.add(c),c.updateMatrixWorld()}update(e,t){this.parent===null&&this.updateMatrixWorld();let{renderTarget:n,activeMipmapLevel:s}=this;this.coordinateSystem!==e.coordinateSystem&&(this.coordinateSystem=e.coordinateSystem,this.updateCoordinateSystem());let[r,o,a,l,c,h]=this.children,d=e.getRenderTarget(),u=e.getActiveCubeFace(),f=e.getActiveMipmapLevel(),m=e.xr.enabled;e.xr.enabled=!1;let x=n.texture.generateMipmaps;n.texture.generateMipmaps=!1;let g=!1;e.isWebGLRenderer===!0?g=e.state.buffers.depth.getReversed():g=e.reversedDepthBuffer,e.setRenderTarget(n,0,s),g&&e.autoClear===!1&&e.clearDepth(),e.render(t,r),e.setRenderTarget(n,1,s),g&&e.autoClear===!1&&e.clearDepth(),e.render(t,o),e.setRenderTarget(n,2,s),g&&e.autoClear===!1&&e.clearDepth(),e.render(t,a),e.setRenderTarget(n,3,s),g&&e.autoClear===!1&&e.clearDepth(),e.render(t,l),e.setRenderTarget(n,4,s),g&&e.autoClear===!1&&e.clearDepth(),e.render(t,c),n.texture.generateMipmaps=x,e.setRenderTarget(n,5,s),g&&e.autoClear===!1&&e.clearDepth(),e.render(t,h),e.setRenderTarget(d,u,f),e.xr.enabled=m,n.texture.needsPMREMUpdate=!0}},Ha=class extends qt{constructor(e=[]){super(),this.isArrayCamera=!0,this.isMultiViewCamera=!1,this.cameras=e}};var Oh="\\[\\]\\.:\\/",Cg=new RegExp("["+Oh+"]","g"),Bh="[^"+Oh+"]",Ig="[^"+Oh.replace("\\.","")+"]",Lg=/((?:WC+[\/:])*)/.source.replace("WC",Bh),Dg=/(WCOD+)?/.source.replace("WCOD",Ig),Fg=/(?:\.(WC+)(?:\[(.+)\])?)?/.source.replace("WC",Bh),Ug=/\.(WC+)(?:\[(.+)\])?/.source.replace("WC",Bh),Ng=new RegExp("^"+Lg+Dg+Fg+Ug+"$"),Og=["material","materials","bones","map"],ch=class{constructor(e,t,n){let s=n||ut.parseTrackName(t);this._targetGroup=e,this._bindings=e.subscribe_(t,s)}getValue(e,t){this.bind();let n=this._targetGroup.nCachedObjects_,s=this._bindings[n];s!==void 0&&s.getValue(e,t)}setValue(e,t){let n=this._bindings;for(let s=this._targetGroup.nCachedObjects_,r=n.length;s!==r;++s)n[s].setValue(e,t)}bind(){let e=this._bindings;for(let t=this._targetGroup.nCachedObjects_,n=e.length;t!==n;++t)e[t].bind()}unbind(){let e=this._bindings;for(let t=this._targetGroup.nCachedObjects_,n=e.length;t!==n;++t)e[t].unbind()}},ut=class i{constructor(e,t,n){this.path=t,this.parsedPath=n||i.parseTrackName(t),this.node=i.findNode(e,this.parsedPath.nodeName),this.rootNode=e,this.getValue=this._getValue_unbound,this.setValue=this._setValue_unbound}static create(e,t,n){return e&&e.isAnimationObjectGroup?new i.Composite(e,t,n):new i(e,t,n)}static sanitizeNodeName(e){return e.replace(/\s/g,"_").replace(Cg,"")}static parseTrackName(e){let t=Ng.exec(e);if(t===null)throw new Error("THREE.PropertyBinding: Cannot parse trackName: "+e);let n={nodeName:t[2],objectName:t[3],objectIndex:t[4],propertyName:t[5],propertyIndex:t[6]},s=n.nodeName&&n.nodeName.lastIndexOf(".");if(s!==void 0&&s!==-1){let r=n.nodeName.substring(s+1);Og.indexOf(r)!==-1&&(n.nodeName=n.nodeName.substring(0,s),n.objectName=r)}if(n.propertyName===null||n.propertyName.length===0)throw new Error("THREE.PropertyBinding: can not parse propertyName from trackName: "+e);return n}static findNode(e,t){if(t===void 0||t===""||t==="."||t===-1||t===e.name||t===e.uuid)return e;if(e.skeleton){let n=e.skeleton.getBoneByName(t);if(n!==void 0)return n}if(e.children){let n=function(r){for(let o=0;o<r.length;o++){let a=r[o];if(a.name===t||a.uuid===t)return a;let l=n(a.children);if(l)return l}return null},s=n(e.children);if(s)return s}return null}_getValue_unavailable(){}_setValue_unavailable(){}_getValue_direct(e,t){e[t]=this.targetObject[this.propertyName]}_getValue_array(e,t){let n=this.resolvedProperty;for(let s=0,r=n.length;s!==r;++s)e[t++]=n[s]}_getValue_arrayElement(e,t){e[t]=this.resolvedProperty[this.propertyIndex]}_getValue_toArray(e,t){this.resolvedProperty.toArray(e,t)}_setValue_direct(e,t){this.targetObject[this.propertyName]=e[t]}_setValue_direct_setNeedsUpdate(e,t){this.targetObject[this.propertyName]=e[t],this.targetObject.needsUpdate=!0}_setValue_direct_setMatrixWorldNeedsUpdate(e,t){this.targetObject[this.propertyName]=e[t],this.targetObject.matrixWorldNeedsUpdate=!0}_setValue_array(e,t){let n=this.resolvedProperty;for(let s=0,r=n.length;s!==r;++s)n[s]=e[t++]}_setValue_array_setNeedsUpdate(e,t){let n=this.resolvedProperty;for(let s=0,r=n.length;s!==r;++s)n[s]=e[t++];this.targetObject.needsUpdate=!0}_setValue_array_setMatrixWorldNeedsUpdate(e,t){let n=this.resolvedProperty;for(let s=0,r=n.length;s!==r;++s)n[s]=e[t++];this.targetObject.matrixWorldNeedsUpdate=!0}_setValue_arrayElement(e,t){this.resolvedProperty[this.propertyIndex]=e[t]}_setValue_arrayElement_setNeedsUpdate(e,t){this.resolvedProperty[this.propertyIndex]=e[t],this.targetObject.needsUpdate=!0}_setValue_arrayElement_setMatrixWorldNeedsUpdate(e,t){this.resolvedProperty[this.propertyIndex]=e[t],this.targetObject.matrixWorldNeedsUpdate=!0}_setValue_fromArray(e,t){this.resolvedProperty.fromArray(e,t)}_setValue_fromArray_setNeedsUpdate(e,t){this.resolvedProperty.fromArray(e,t),this.targetObject.needsUpdate=!0}_setValue_fromArray_setMatrixWorldNeedsUpdate(e,t){this.resolvedProperty.fromArray(e,t),this.targetObject.matrixWorldNeedsUpdate=!0}_getValue_unbound(e,t){this.bind(),this.getValue(e,t)}_setValue_unbound(e,t){this.bind(),this.setValue(e,t)}bind(){let e=this.node,t=this.parsedPath,n=t.objectName,s=t.propertyName,r=t.propertyIndex;if(e||(e=i.findNode(this.rootNode,t.nodeName),this.node=e),this.getValue=this._getValue_unavailable,this.setValue=this._setValue_unavailable,!e){Pe("PropertyBinding: No target node found for track: "+this.path+".");return}if(n){let c=t.objectIndex;switch(n){case"materials":if(!e.material){Le("PropertyBinding: Can not bind to material as node does not have a material.",this);return}if(!e.material.materials){Le("PropertyBinding: Can not bind to material.materials as node.material does not have a materials array.",this);return}e=e.material.materials;break;case"bones":if(!e.skeleton){Le("PropertyBinding: Can not bind to bones as node does not have a skeleton.",this);return}e=e.skeleton.bones;for(let h=0;h<e.length;h++)if(e[h].name===c){c=h;break}break;case"map":if("map"in e){e=e.map;break}if(!e.material){Le("PropertyBinding: Can not bind to material as node does not have a material.",this);return}if(!e.material.map){Le("PropertyBinding: Can not bind to material.map as node.material does not have a map.",this);return}e=e.material.map;break;default:if(e[n]===void 0){Le("PropertyBinding: Can not bind to objectName of node undefined.",this);return}e=e[n]}if(c!==void 0){if(e[c]===void 0){Le("PropertyBinding: Trying to bind to objectIndex of objectName, but is undefined.",this,e);return}e=e[c]}}let o=e[s];if(o===void 0){let c=t.nodeName;Le("PropertyBinding: Trying to update property for track: "+c+"."+s+" but it wasn't found.",e);return}let a=this.Versioning.None;this.targetObject=e,e.isMaterial===!0?a=this.Versioning.NeedsUpdate:e.isObject3D===!0&&(a=this.Versioning.MatrixWorldNeedsUpdate);let l=this.BindingType.Direct;if(r!==void 0){if(s==="morphTargetInfluences"){if(!e.geometry){Le("PropertyBinding: Can not bind to morphTargetInfluences because node does not have a geometry.",this);return}if(!e.geometry.morphAttributes){Le("PropertyBinding: Can not bind to morphTargetInfluences because node does not have a geometry.morphAttributes.",this);return}e.morphTargetDictionary[r]!==void 0&&(r=e.morphTargetDictionary[r])}l=this.BindingType.ArrayElement,this.resolvedProperty=o,this.propertyIndex=r}else o.fromArray!==void 0&&o.toArray!==void 0?(l=this.BindingType.HasFromToArray,this.resolvedProperty=o):Array.isArray(o)?(l=this.BindingType.EntireArray,this.resolvedProperty=o):this.propertyName=s;this.getValue=this.GetterByBindingType[l],this.setValue=this.SetterByBindingTypeAndVersioning[l][a]}unbind(){this.node=null,this.getValue=this._getValue_unbound,this.setValue=this._setValue_unbound}};ut.Composite=ch;ut.prototype.BindingType={Direct:0,EntireArray:1,ArrayElement:2,HasFromToArray:3};ut.prototype.Versioning={None:0,NeedsUpdate:1,MatrixWorldNeedsUpdate:2};ut.prototype.GetterByBindingType=[ut.prototype._getValue_direct,ut.prototype._getValue_array,ut.prototype._getValue_arrayElement,ut.prototype._getValue_toArray];ut.prototype.SetterByBindingTypeAndVersioning=[[ut.prototype._setValue_direct,ut.prototype._setValue_direct_setNeedsUpdate,ut.prototype._setValue_direct_setMatrixWorldNeedsUpdate],[ut.prototype._setValue_array,ut.prototype._setValue_array_setNeedsUpdate,ut.prototype._setValue_array_setMatrixWorldNeedsUpdate],[ut.prototype._setValue_arrayElement,ut.prototype._setValue_arrayElement_setNeedsUpdate,ut.prototype._setValue_arrayElement_setMatrixWorldNeedsUpdate],[ut.prototype._setValue_fromArray,ut.prototype._setValue_fromArray_setNeedsUpdate,ut.prototype._setValue_fromArray_setMatrixWorldNeedsUpdate]];var DS=new Float32Array(1);var Fi=class extends xa{constructor(e,t,n=1){super(e,t),this.isInstancedInterleavedBuffer=!0,this.meshPerAttribute=n}copy(e){return super.copy(e),this.meshPerAttribute=e.meshPerAttribute,this}clone(e){let t=super.clone(e);return t.meshPerAttribute=this.meshPerAttribute,t}toJSON(e){let t=super.toJSON(e);return t.isInstancedInterleavedBuffer=!0,t.meshPerAttribute=this.meshPerAttribute,t}};var Wh=class Wh{constructor(e,t,n,s){this.elements=[1,0,0,1],e!==void 0&&this.set(e,t,n,s)}identity(){return this.set(1,0,0,1),this}fromArray(e,t=0){for(let n=0;n<4;n++)this.elements[n]=e[n+t];return this}set(e,t,n,s){let r=this.elements;return r[0]=e,r[2]=t,r[1]=n,r[3]=s,this}};Wh.prototype.isMatrix2=!0;var hh=Wh;var Ld=new L,Qo=new L,Rs=new L,Cs=new L,eh=new L,Bg=new L,zg=new L,Gr=class{constructor(e=new L,t=new L){this.start=e,this.end=t}set(e,t){return this.start.copy(e),this.end.copy(t),this}copy(e){return this.start.copy(e.start),this.end.copy(e.end),this}getCenter(e){return e.addVectors(this.start,this.end).multiplyScalar(.5)}delta(e){return e.subVectors(this.end,this.start)}distanceSq(){return this.start.distanceToSquared(this.end)}distance(){return this.start.distanceTo(this.end)}at(e,t){return this.delta(t).multiplyScalar(e).add(this.start)}closestPointToPointParameter(e,t){Ld.subVectors(e,this.start),Qo.subVectors(this.end,this.start);let n=Qo.dot(Qo);if(n===0)return 0;let r=Qo.dot(Ld)/n;return t&&(r=Oe(r,0,1)),r}closestPointToPoint(e,t,n){let s=this.closestPointToPointParameter(e,t);return this.delta(n).multiplyScalar(s).add(this.start)}distanceSqToLine3(e,t=Bg,n=zg){let s=10000000000000001e-32,r,o,a=this.start,l=e.start,c=this.end,h=e.end;Rs.subVectors(c,a),Cs.subVectors(h,l),eh.subVectors(a,l);let d=Rs.dot(Rs),u=Cs.dot(Cs),f=Cs.dot(eh);if(d<=s&&u<=s)return t.copy(a),n.copy(l),t.sub(n),t.dot(t);if(d<=s)r=0,o=f/u,o=Oe(o,0,1);else{let m=Rs.dot(eh);if(u<=s)o=0,r=Oe(-m/d,0,1);else{let x=Rs.dot(Cs),g=d*u-x*x;g!==0?r=Oe((x*f-m*u)/g,0,1):r=0,o=(x*r+f)/u,o<0?(o=0,r=Oe(-m/d,0,1)):o>1&&(o=1,r=Oe((x-m)/d,0,1))}}return t.copy(a).addScaledVector(Rs,r),n.copy(l).addScaledVector(Cs,o),t.distanceToSquared(n)}applyMatrix4(e){return this.start.applyMatrix4(e),this.end.applyMatrix4(e),this}equals(e){return e.start.equals(this.start)&&e.end.equals(this.end)}clone(){return new this.constructor().copy(this)}};function zh(i,e,t,n){let s=kg(n);switch(t){case Ph:return i*e;case Ch:return i*e/s.components*s.byteLength;case Ja:return i*e/s.components*s.byteLength;case Bi:return i*e*2/s.components*s.byteLength;case ja:return i*e*2/s.components*s.byteLength;case Rh:return i*e*3/s.components*s.byteLength;case Sn:return i*e*4/s.components*s.byteLength;case Qa:return i*e*4/s.components*s.byteLength;case Yr:case Zr:return Math.floor((i+3)/4)*Math.floor((e+3)/4)*8;case $r:case Kr:return Math.floor((i+3)/4)*Math.floor((e+3)/4)*16;case tl:case il:return Math.max(i,16)*Math.max(e,8)/4;case el:case nl:return Math.max(i,8)*Math.max(e,8)/2;case sl:case rl:case al:case ll:return Math.floor((i+3)/4)*Math.floor((e+3)/4)*8;case ol:case Jr:case cl:return Math.floor((i+3)/4)*Math.floor((e+3)/4)*16;case hl:return Math.floor((i+3)/4)*Math.floor((e+3)/4)*16;case ul:return Math.floor((i+4)/5)*Math.floor((e+3)/4)*16;case dl:return Math.floor((i+4)/5)*Math.floor((e+4)/5)*16;case fl:return Math.floor((i+5)/6)*Math.floor((e+4)/5)*16;case pl:return Math.floor((i+5)/6)*Math.floor((e+5)/6)*16;case ml:return Math.floor((i+7)/8)*Math.floor((e+4)/5)*16;case gl:return Math.floor((i+7)/8)*Math.floor((e+5)/6)*16;case xl:return Math.floor((i+7)/8)*Math.floor((e+7)/8)*16;case yl:return Math.floor((i+9)/10)*Math.floor((e+4)/5)*16;case vl:return Math.floor((i+9)/10)*Math.floor((e+5)/6)*16;case _l:return Math.floor((i+9)/10)*Math.floor((e+7)/8)*16;case bl:return Math.floor((i+9)/10)*Math.floor((e+9)/10)*16;case Sl:return Math.floor((i+11)/12)*Math.floor((e+9)/10)*16;case Ml:return Math.floor((i+11)/12)*Math.floor((e+11)/12)*16;case wl:case El:case Tl:return Math.ceil(i/4)*Math.ceil(e/4)*16;case Al:case Pl:return Math.ceil(i/4)*Math.ceil(e/4)*8;case jr:case Rl:return Math.ceil(i/4)*Math.ceil(e/4)*16}throw new Error(`Unable to determine texture byte length for ${t} format.`)}function kg(i){switch(i){case mn:case wh:return{byteLength:1,components:1};case Gs:case Eh:case $n:return{byteLength:2,components:1};case $a:case Ka:return{byteLength:2,components:4};case Fn:case Za:case Un:return{byteLength:4,components:1};case Th:case Ah:return{byteLength:4,components:3}}throw new Error(`THREE.TextureUtils: Unknown texture type ${i}.`)}typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("register",{detail:{revision:Wa}}));typeof window<"u"&&(window.__THREE__?Pe("WARNING: Multiple instances of Three.js being imported."):window.__THREE__=Wa);function Wf(){let i=null,e=!1,t=null,n=null;function s(r,o){t(r,o),n=i.requestAnimationFrame(s)}return{start:function(){e!==!0&&t!==null&&i!==null&&(n=i.requestAnimationFrame(s),e=!0)},stop:function(){i!==null&&i.cancelAnimationFrame(n),e=!1},setAnimationLoop:function(r){t=r},setContext:function(r){i=r}}}function Vg(i){let e=new WeakMap;function t(a,l){let c=a.array,h=a.usage,d=c.byteLength,u=i.createBuffer();i.bindBuffer(l,u),i.bufferData(l,c,h),a.onUploadCallback();let f;if(c instanceof Float32Array)f=i.FLOAT;else if(typeof Float16Array<"u"&&c instanceof Float16Array)f=i.HALF_FLOAT;else if(c instanceof Uint16Array)a.isFloat16BufferAttribute?f=i.HALF_FLOAT:f=i.UNSIGNED_SHORT;else if(c instanceof Int16Array)f=i.SHORT;else if(c instanceof Uint32Array)f=i.UNSIGNED_INT;else if(c instanceof Int32Array)f=i.INT;else if(c instanceof Int8Array)f=i.BYTE;else if(c instanceof Uint8Array)f=i.UNSIGNED_BYTE;else if(c instanceof Uint8ClampedArray)f=i.UNSIGNED_BYTE;else throw new Error("THREE.WebGLAttributes: Unsupported buffer data format: "+c);return{buffer:u,type:f,bytesPerElement:c.BYTES_PER_ELEMENT,version:a.version,size:d}}function n(a,l,c){let h=l.array,d=l.updateRanges;if(i.bindBuffer(c,a),d.length===0)i.bufferSubData(c,0,h);else{d.sort((f,m)=>f.start-m.start);let u=0;for(let f=1;f<d.length;f++){let m=d[u],x=d[f];x.start<=m.start+m.count+1?m.count=Math.max(m.count,x.start+x.count-m.start):(++u,d[u]=x)}d.length=u+1;for(let f=0,m=d.length;f<m;f++){let x=d[f];i.bufferSubData(c,x.start*h.BYTES_PER_ELEMENT,h,x.start,x.count)}l.clearUpdateRanges()}l.onUploadCallback()}function s(a){return a.isInterleavedBufferAttribute&&(a=a.data),e.get(a)}function r(a){a.isInterleavedBufferAttribute&&(a=a.data);let l=e.get(a);l&&(i.deleteBuffer(l.buffer),e.delete(a))}function o(a,l){if(a.isInterleavedBufferAttribute&&(a=a.data),a.isGLBufferAttribute){let h=e.get(a);(!h||h.version<a.version)&&e.set(a,{buffer:a.buffer,type:a.type,bytesPerElement:a.elementSize,version:a.version});return}let c=e.get(a);if(c===void 0)e.set(a,t(a,l));else if(c.version<a.version){if(c.size!==a.array.byteLength)throw new Error("THREE.WebGLAttributes: The size of the buffer attribute's array buffer does not match the original size. Resizing buffer attributes is not supported.");n(c.buffer,a,l),c.version=a.version}}return{get:s,remove:r,update:o}}var Hg=`#ifdef USE_ALPHAHASH
	if ( diffuseColor.a < getAlphaHashThreshold( vPosition ) ) discard;
#endif`,Gg=`#ifdef USE_ALPHAHASH
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
#endif`,Wg=`#ifdef USE_ALPHAMAP
	diffuseColor.a *= texture2D( alphaMap, vAlphaMapUv ).g;
#endif`,Xg=`#ifdef USE_ALPHAMAP
	uniform sampler2D alphaMap;
#endif`,qg=`#ifdef USE_ALPHATEST
	#ifdef ALPHA_TO_COVERAGE
	diffuseColor.a = smoothstep( alphaTest, alphaTest + fwidth( diffuseColor.a ), diffuseColor.a );
	if ( diffuseColor.a == 0.0 ) discard;
	#else
	if ( diffuseColor.a < alphaTest ) discard;
	#endif
#endif`,Yg=`#ifdef USE_ALPHATEST
	uniform float alphaTest;
#endif`,Zg=`#ifdef USE_AOMAP
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
#endif`,$g=`#ifdef USE_AOMAP
	uniform sampler2D aoMap;
	uniform float aoMapIntensity;
#endif`,Kg=`#ifdef USE_BATCHING
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
#endif`,Jg=`#ifdef USE_BATCHING
	mat4 batchingMatrix = getBatchingMatrix( getIndirectIndex( gl_DrawID ) );
#endif`,jg=`vec3 transformed = vec3( position );
#ifdef USE_ALPHAHASH
	vPosition = vec3( position );
#endif`,Qg=`vec3 objectNormal = vec3( normal );
#ifdef USE_TANGENT
	vec3 objectTangent = vec3( tangent.xyz );
#endif`,ex=`float G_BlinnPhong_Implicit( ) {
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
} // validated`,tx=`#ifdef USE_IRIDESCENCE
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
#endif`,nx=`#ifdef USE_BUMPMAP
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
#endif`,ix=`#if NUM_CLIPPING_PLANES > 0
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
#endif`,sx=`#if NUM_CLIPPING_PLANES > 0
	varying vec3 vClipPosition;
	uniform vec4 clippingPlanes[ NUM_CLIPPING_PLANES ];
#endif`,rx=`#if NUM_CLIPPING_PLANES > 0
	varying vec3 vClipPosition;
#endif`,ox=`#if NUM_CLIPPING_PLANES > 0
	vClipPosition = - mvPosition.xyz;
#endif`,ax=`#if defined( USE_COLOR ) || defined( USE_COLOR_ALPHA )
	diffuseColor *= vColor;
#endif`,lx=`#if defined( USE_COLOR ) || defined( USE_COLOR_ALPHA )
	varying vec4 vColor;
#endif`,cx=`#if defined( USE_COLOR ) || defined( USE_COLOR_ALPHA ) || defined( USE_INSTANCING_COLOR ) || defined( USE_BATCHING_COLOR )
	varying vec4 vColor;
#endif`,hx=`#if defined( USE_COLOR ) || defined( USE_COLOR_ALPHA ) || defined( USE_INSTANCING_COLOR ) || defined( USE_BATCHING_COLOR )
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
#endif`,ux=`#define PI 3.141592653589793
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
} // validated`,dx=`#ifdef ENVMAP_TYPE_CUBE_UV
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
#endif`,fx=`vec3 transformedNormal = objectNormal;
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
#endif`,px=`#ifdef USE_DISPLACEMENTMAP
	uniform sampler2D displacementMap;
	uniform float displacementScale;
	uniform float displacementBias;
#endif`,mx=`#ifdef USE_DISPLACEMENTMAP
	transformed += normalize( objectNormal ) * ( texture2D( displacementMap, vDisplacementMapUv ).x * displacementScale + displacementBias );
#endif`,gx=`#ifdef USE_EMISSIVEMAP
	vec4 emissiveColor = texture2D( emissiveMap, vEmissiveMapUv );
	#ifdef DECODE_VIDEO_TEXTURE_EMISSIVE
		emissiveColor = sRGBTransferEOTF( emissiveColor );
	#endif
	totalEmissiveRadiance *= emissiveColor.rgb;
#endif`,xx=`#ifdef USE_EMISSIVEMAP
	uniform sampler2D emissiveMap;
#endif`,yx="gl_FragColor = linearToOutputTexel( gl_FragColor );",vx=`vec4 LinearTransferOETF( in vec4 value ) {
	return value;
}
vec4 sRGBTransferEOTF( in vec4 value ) {
	return vec4( mix( pow( value.rgb * 0.9478672986 + vec3( 0.0521327014 ), vec3( 2.4 ) ), value.rgb * 0.0773993808, vec3( lessThanEqual( value.rgb, vec3( 0.04045 ) ) ) ), value.a );
}
vec4 sRGBTransferOETF( in vec4 value ) {
	return vec4( mix( pow( value.rgb, vec3( 0.41666 ) ) * 1.055 - vec3( 0.055 ), value.rgb * 12.92, vec3( lessThanEqual( value.rgb, vec3( 0.0031308 ) ) ) ), value.a );
}`,_x=`#ifdef USE_ENVMAP
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
#endif`,bx=`#ifdef USE_ENVMAP
	uniform float envMapIntensity;
	uniform mat3 envMapRotation;
	#ifdef ENVMAP_TYPE_CUBE
		uniform samplerCube envMap;
	#else
		uniform sampler2D envMap;
	#endif
#endif`,Sx=`#ifdef USE_ENVMAP
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
#endif`,Mx=`#ifdef USE_ENVMAP
	#if defined( USE_BUMPMAP ) || defined( USE_NORMALMAP ) || defined( PHONG ) || defined( LAMBERT )
		#define ENV_WORLDPOS
	#endif
	#ifdef ENV_WORLDPOS
		
		varying vec3 vWorldPosition;
	#else
		varying vec3 vReflect;
		uniform float refractionRatio;
	#endif
#endif`,wx=`#ifdef USE_ENVMAP
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
#endif`,Ex=`#ifdef USE_FOG
	vFogDepth = - mvPosition.z;
#endif`,Tx=`#ifdef USE_FOG
	varying float vFogDepth;
#endif`,Ax=`#ifdef USE_FOG
	#ifdef FOG_EXP2
		float fogFactor = 1.0 - exp( - fogDensity * fogDensity * vFogDepth * vFogDepth );
	#else
		float fogFactor = smoothstep( fogNear, fogFar, vFogDepth );
	#endif
	gl_FragColor.rgb = mix( gl_FragColor.rgb, fogColor, fogFactor );
#endif`,Px=`#ifdef USE_FOG
	uniform vec3 fogColor;
	varying float vFogDepth;
	#ifdef FOG_EXP2
		uniform float fogDensity;
	#else
		uniform float fogNear;
		uniform float fogFar;
	#endif
#endif`,Rx=`#ifdef USE_GRADIENTMAP
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
}`,Cx=`#ifdef USE_LIGHTMAP
	uniform sampler2D lightMap;
	uniform float lightMapIntensity;
#endif`,Ix=`LambertMaterial material;
material.diffuseColor = diffuseColor.rgb;
material.specularStrength = specularStrength;`,Lx=`varying vec3 vViewPosition;
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
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Lambert`,Dx=`uniform bool receiveShadow;
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
#include <lightprobes_pars_fragment>`,Fx=`#ifdef USE_ENVMAP
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
#endif`,Ux=`ToonMaterial material;
material.diffuseColor = diffuseColor.rgb;`,Nx=`varying vec3 vViewPosition;
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
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Toon`,Ox=`BlinnPhongMaterial material;
material.diffuseColor = diffuseColor.rgb;
material.specularColor = specular;
material.specularShininess = shininess;
material.specularStrength = specularStrength;`,Bx=`varying vec3 vViewPosition;
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
#define RE_IndirectDiffuse		RE_IndirectDiffuse_BlinnPhong`,zx=`PhysicalMaterial material;
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
#endif`,kx=`uniform sampler2D dfgLUT;
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
}`,Vx=`
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
#endif`,Hx=`#if defined( RE_IndirectDiffuse )
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
#endif`,Gx=`#if defined( RE_IndirectDiffuse )
	#if defined( LAMBERT ) || defined( PHONG )
		irradiance += iblIrradiance;
	#endif
	RE_IndirectDiffuse( irradiance, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
#endif
#if defined( RE_IndirectSpecular )
	RE_IndirectSpecular( radiance, iblIrradiance, clearcoatRadiance, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
#endif`,Wx=`#ifdef USE_LIGHT_PROBES_GRID
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
#endif`,Xx=`#if defined( USE_LOGARITHMIC_DEPTH_BUFFER )
	gl_FragDepth = vIsPerspective == 0.0 ? gl_FragCoord.z : log2( vFragDepth ) * logDepthBufFC * 0.5;
#endif`,qx=`#if defined( USE_LOGARITHMIC_DEPTH_BUFFER )
	uniform float logDepthBufFC;
	varying float vFragDepth;
	varying float vIsPerspective;
#endif`,Yx=`#ifdef USE_LOGARITHMIC_DEPTH_BUFFER
	varying float vFragDepth;
	varying float vIsPerspective;
#endif`,Zx=`#ifdef USE_LOGARITHMIC_DEPTH_BUFFER
	vFragDepth = 1.0 + gl_Position.w;
	vIsPerspective = float( isPerspectiveMatrix( projectionMatrix ) );
#endif`,$x=`#ifdef USE_MAP
	vec4 sampledDiffuseColor = texture2D( map, vMapUv );
	#ifdef DECODE_VIDEO_TEXTURE
		sampledDiffuseColor = sRGBTransferEOTF( sampledDiffuseColor );
	#endif
	diffuseColor *= sampledDiffuseColor;
#endif`,Kx=`#ifdef USE_MAP
	uniform sampler2D map;
#endif`,Jx=`#if defined( USE_MAP ) || defined( USE_ALPHAMAP )
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
#endif`,jx=`#if defined( USE_POINTS_UV )
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
#endif`,Qx=`float metalnessFactor = metalness;
#ifdef USE_METALNESSMAP
	vec4 texelMetalness = texture2D( metalnessMap, vMetalnessMapUv );
	metalnessFactor *= texelMetalness.b;
#endif`,e0=`#ifdef USE_METALNESSMAP
	uniform sampler2D metalnessMap;
#endif`,t0=`#ifdef USE_INSTANCING_MORPH
	float morphTargetInfluences[ MORPHTARGETS_COUNT ];
	float morphTargetBaseInfluence = texelFetch( morphTexture, ivec2( 0, gl_InstanceID ), 0 ).r;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		morphTargetInfluences[i] =  texelFetch( morphTexture, ivec2( i + 1, gl_InstanceID ), 0 ).r;
	}
#endif`,n0=`#if defined( USE_MORPHCOLORS )
	vColor *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		#if defined( USE_COLOR_ALPHA )
			if ( morphTargetInfluences[ i ] != 0.0 ) vColor += getMorph( gl_VertexID, i, 2 ) * morphTargetInfluences[ i ];
		#elif defined( USE_COLOR )
			if ( morphTargetInfluences[ i ] != 0.0 ) vColor += getMorph( gl_VertexID, i, 2 ).rgb * morphTargetInfluences[ i ];
		#endif
	}
#endif`,i0=`#ifdef USE_MORPHNORMALS
	objectNormal *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		if ( morphTargetInfluences[ i ] != 0.0 ) objectNormal += getMorph( gl_VertexID, i, 1 ).xyz * morphTargetInfluences[ i ];
	}
#endif`,s0=`#ifdef USE_MORPHTARGETS
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
#endif`,r0=`#ifdef USE_MORPHTARGETS
	transformed *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		if ( morphTargetInfluences[ i ] != 0.0 ) transformed += getMorph( gl_VertexID, i, 0 ).xyz * morphTargetInfluences[ i ];
	}
#endif`,o0=`float faceDirection = gl_FrontFacing ? 1.0 : - 1.0;
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
vec3 nonPerturbedNormal = normal;`,a0=`#ifdef USE_NORMALMAP_OBJECTSPACE
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
#endif`,l0=`#ifndef FLAT_SHADED
	varying vec3 vNormal;
	#ifdef USE_TANGENT
		varying vec3 vTangent;
		varying vec3 vBitangent;
	#endif
#endif`,c0=`#ifndef FLAT_SHADED
	varying vec3 vNormal;
	#ifdef USE_TANGENT
		varying vec3 vTangent;
		varying vec3 vBitangent;
	#endif
#endif`,h0=`#ifndef FLAT_SHADED
	vNormal = normalize( transformedNormal );
	#ifdef USE_TANGENT
		vTangent = normalize( transformedTangent );
		vBitangent = normalize( cross( vNormal, vTangent ) * tangent.w );
		#ifdef FLIP_SIDED
			vBitangent = - vBitangent;
		#endif
	#endif
#endif`,u0=`#ifdef USE_NORMALMAP
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
#endif`,d0=`#ifdef USE_CLEARCOAT
	vec3 clearcoatNormal = nonPerturbedNormal;
#endif`,f0=`#ifdef USE_CLEARCOAT_NORMALMAP
	vec3 clearcoatMapN = texture2D( clearcoatNormalMap, vClearcoatNormalMapUv ).xyz * 2.0 - 1.0;
	clearcoatMapN.xy *= clearcoatNormalScale;
	clearcoatNormal = normalize( tbn2 * clearcoatMapN );
#endif`,p0=`#ifdef USE_CLEARCOATMAP
	uniform sampler2D clearcoatMap;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	uniform sampler2D clearcoatNormalMap;
	uniform vec2 clearcoatNormalScale;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	uniform sampler2D clearcoatRoughnessMap;
#endif`,m0=`#ifdef USE_IRIDESCENCEMAP
	uniform sampler2D iridescenceMap;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	uniform sampler2D iridescenceThicknessMap;
#endif`,g0=`#ifdef OPAQUE
diffuseColor.a = 1.0;
#endif
#ifdef USE_TRANSMISSION
diffuseColor.a *= material.transmissionAlpha;
#endif
gl_FragColor = vec4( outgoingLight, diffuseColor.a );`,x0=`vec3 packNormalToRGB( const in vec3 normal ) {
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
}`,y0=`#ifdef PREMULTIPLIED_ALPHA
	gl_FragColor.rgb *= gl_FragColor.a;
#endif`,v0=`vec4 mvPosition = vec4( transformed, 1.0 );
#ifdef USE_BATCHING
	mvPosition = batchingMatrix * mvPosition;
#endif
#ifdef USE_INSTANCING
	mvPosition = instanceMatrix * mvPosition;
#endif
mvPosition = modelViewMatrix * mvPosition;
gl_Position = projectionMatrix * mvPosition;`,_0=`#ifdef DITHERING
	gl_FragColor.rgb = dithering( gl_FragColor.rgb );
#endif`,b0=`#ifdef DITHERING
	vec3 dithering( vec3 color ) {
		float grid_position = rand( gl_FragCoord.xy );
		vec3 dither_shift_RGB = vec3( 0.25 / 255.0, -0.25 / 255.0, 0.25 / 255.0 );
		dither_shift_RGB = mix( 2.0 * dither_shift_RGB, -2.0 * dither_shift_RGB, grid_position );
		return color + dither_shift_RGB;
	}
#endif`,S0=`float roughnessFactor = roughness;
#ifdef USE_ROUGHNESSMAP
	vec4 texelRoughness = texture2D( roughnessMap, vRoughnessMapUv );
	roughnessFactor *= texelRoughness.g;
#endif`,M0=`#ifdef USE_ROUGHNESSMAP
	uniform sampler2D roughnessMap;
#endif`,w0=`#if NUM_SPOT_LIGHT_COORDS > 0
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
#endif`,E0=`#if NUM_SPOT_LIGHT_COORDS > 0
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
#endif`,T0=`#if ( defined( USE_SHADOWMAP ) && ( NUM_DIR_LIGHT_SHADOWS > 0 || NUM_POINT_LIGHT_SHADOWS > 0 ) ) || ( NUM_SPOT_LIGHT_COORDS > 0 )
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
#endif`,A0=`float getShadowMask() {
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
}`,P0=`#ifdef USE_SKINNING
	mat4 boneMatX = getBoneMatrix( skinIndex.x );
	mat4 boneMatY = getBoneMatrix( skinIndex.y );
	mat4 boneMatZ = getBoneMatrix( skinIndex.z );
	mat4 boneMatW = getBoneMatrix( skinIndex.w );
#endif`,R0=`#ifdef USE_SKINNING
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
#endif`,C0=`#ifdef USE_SKINNING
	vec4 skinVertex = bindMatrix * vec4( transformed, 1.0 );
	vec4 skinned = vec4( 0.0 );
	skinned += boneMatX * skinVertex * skinWeight.x;
	skinned += boneMatY * skinVertex * skinWeight.y;
	skinned += boneMatZ * skinVertex * skinWeight.z;
	skinned += boneMatW * skinVertex * skinWeight.w;
	transformed = ( bindMatrixInverse * skinned ).xyz;
#endif`,I0=`#ifdef USE_SKINNING
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
#endif`,L0=`float specularStrength;
#ifdef USE_SPECULARMAP
	vec4 texelSpecular = texture2D( specularMap, vSpecularMapUv );
	specularStrength = texelSpecular.r;
#else
	specularStrength = 1.0;
#endif`,D0=`#ifdef USE_SPECULARMAP
	uniform sampler2D specularMap;
#endif`,F0=`#if defined( TONE_MAPPING )
	gl_FragColor.rgb = toneMapping( gl_FragColor.rgb );
#endif`,U0=`#ifndef saturate
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
vec3 CustomToneMapping( vec3 color ) { return color; }`,N0=`#ifdef USE_TRANSMISSION
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
#endif`,O0=`#ifdef USE_TRANSMISSION
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
#endif`,B0=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
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
#endif`,z0=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
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
#endif`,k0=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
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
#endif`,V0=`#if defined( USE_ENVMAP ) || defined( DISTANCE ) || defined ( USE_SHADOWMAP ) || defined ( USE_TRANSMISSION ) || NUM_SPOT_LIGHT_COORDS > 0
	vec4 worldPosition = vec4( transformed, 1.0 );
	#ifdef USE_BATCHING
		worldPosition = batchingMatrix * worldPosition;
	#endif
	#ifdef USE_INSTANCING
		worldPosition = instanceMatrix * worldPosition;
	#endif
	worldPosition = modelMatrix * worldPosition;
#endif`,H0=`varying vec2 vUv;
uniform mat3 uvTransform;
void main() {
	vUv = ( uvTransform * vec3( uv, 1 ) ).xy;
	gl_Position = vec4( position.xy, 1.0, 1.0 );
}`,G0=`uniform sampler2D t2D;
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
}`,W0=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
	gl_Position.z = gl_Position.w;
}`,X0=`#ifdef ENVMAP_TYPE_CUBE
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
}`,q0=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
	gl_Position.z = gl_Position.w;
}`,Y0=`uniform samplerCube tCube;
uniform float tFlip;
uniform float opacity;
varying vec3 vWorldDirection;
void main() {
	vec4 texColor = textureCube( tCube, vec3( tFlip * vWorldDirection.x, vWorldDirection.yz ) );
	gl_FragColor = texColor;
	gl_FragColor.a *= opacity;
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,Z0=`#include <common>
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
}`,$0=`#if DEPTH_PACKING == 3200
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
}`,K0=`#define DISTANCE
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
}`,J0=`#define DISTANCE
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
}`,j0=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
}`,Q0=`uniform sampler2D tEquirect;
varying vec3 vWorldDirection;
#include <common>
void main() {
	vec3 direction = normalize( vWorldDirection );
	vec2 sampleUV = equirectUv( direction );
	gl_FragColor = texture2D( tEquirect, sampleUV );
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,ey=`uniform float scale;
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
}`,ty=`uniform vec3 diffuse;
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
}`,ny=`#include <common>
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
}`,iy=`uniform vec3 diffuse;
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
}`,sy=`#define LAMBERT
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
}`,ry=`#define LAMBERT
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
}`,oy=`#define MATCAP
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
}`,ay=`#define MATCAP
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
}`,ly=`#define NORMAL
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
}`,cy=`#define NORMAL
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
}`,hy=`#define PHONG
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
}`,uy=`#define PHONG
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
}`,dy=`#define STANDARD
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
}`,fy=`#define STANDARD
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
}`,py=`#define TOON
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
}`,my=`#define TOON
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
}`,gy=`uniform float size;
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
}`,xy=`uniform vec3 diffuse;
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
}`,yy=`#include <common>
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
}`,vy=`uniform vec3 color;
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
}`,_y=`uniform float rotation;
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
}`,by=`uniform vec3 diffuse;
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
}`,He={alphahash_fragment:Hg,alphahash_pars_fragment:Gg,alphamap_fragment:Wg,alphamap_pars_fragment:Xg,alphatest_fragment:qg,alphatest_pars_fragment:Yg,aomap_fragment:Zg,aomap_pars_fragment:$g,batching_pars_vertex:Kg,batching_vertex:Jg,begin_vertex:jg,beginnormal_vertex:Qg,bsdfs:ex,iridescence_fragment:tx,bumpmap_pars_fragment:nx,clipping_planes_fragment:ix,clipping_planes_pars_fragment:sx,clipping_planes_pars_vertex:rx,clipping_planes_vertex:ox,color_fragment:ax,color_pars_fragment:lx,color_pars_vertex:cx,color_vertex:hx,common:ux,cube_uv_reflection_fragment:dx,defaultnormal_vertex:fx,displacementmap_pars_vertex:px,displacementmap_vertex:mx,emissivemap_fragment:gx,emissivemap_pars_fragment:xx,colorspace_fragment:yx,colorspace_pars_fragment:vx,envmap_fragment:_x,envmap_common_pars_fragment:bx,envmap_pars_fragment:Sx,envmap_pars_vertex:Mx,envmap_physical_pars_fragment:Fx,envmap_vertex:wx,fog_vertex:Ex,fog_pars_vertex:Tx,fog_fragment:Ax,fog_pars_fragment:Px,gradientmap_pars_fragment:Rx,lightmap_pars_fragment:Cx,lights_lambert_fragment:Ix,lights_lambert_pars_fragment:Lx,lights_pars_begin:Dx,lights_toon_fragment:Ux,lights_toon_pars_fragment:Nx,lights_phong_fragment:Ox,lights_phong_pars_fragment:Bx,lights_physical_fragment:zx,lights_physical_pars_fragment:kx,lights_fragment_begin:Vx,lights_fragment_maps:Hx,lights_fragment_end:Gx,lightprobes_pars_fragment:Wx,logdepthbuf_fragment:Xx,logdepthbuf_pars_fragment:qx,logdepthbuf_pars_vertex:Yx,logdepthbuf_vertex:Zx,map_fragment:$x,map_pars_fragment:Kx,map_particle_fragment:Jx,map_particle_pars_fragment:jx,metalnessmap_fragment:Qx,metalnessmap_pars_fragment:e0,morphinstance_vertex:t0,morphcolor_vertex:n0,morphnormal_vertex:i0,morphtarget_pars_vertex:s0,morphtarget_vertex:r0,normal_fragment_begin:o0,normal_fragment_maps:a0,normal_pars_fragment:l0,normal_pars_vertex:c0,normal_vertex:h0,normalmap_pars_fragment:u0,clearcoat_normal_fragment_begin:d0,clearcoat_normal_fragment_maps:f0,clearcoat_pars_fragment:p0,iridescence_pars_fragment:m0,opaque_fragment:g0,packing:x0,premultiplied_alpha_fragment:y0,project_vertex:v0,dithering_fragment:_0,dithering_pars_fragment:b0,roughnessmap_fragment:S0,roughnessmap_pars_fragment:M0,shadowmap_pars_fragment:w0,shadowmap_pars_vertex:E0,shadowmap_vertex:T0,shadowmask_pars_fragment:A0,skinbase_vertex:P0,skinning_pars_vertex:R0,skinning_vertex:C0,skinnormal_vertex:I0,specularmap_fragment:L0,specularmap_pars_fragment:D0,tonemapping_fragment:F0,tonemapping_pars_fragment:U0,transmission_fragment:N0,transmission_pars_fragment:O0,uv_pars_fragment:B0,uv_pars_vertex:z0,uv_vertex:k0,worldpos_vertex:V0,background_vert:H0,background_frag:G0,backgroundCube_vert:W0,backgroundCube_frag:X0,cube_vert:q0,cube_frag:Y0,depth_vert:Z0,depth_frag:$0,distance_vert:K0,distance_frag:J0,equirect_vert:j0,equirect_frag:Q0,linedashed_vert:ey,linedashed_frag:ty,meshbasic_vert:ny,meshbasic_frag:iy,meshlambert_vert:sy,meshlambert_frag:ry,meshmatcap_vert:oy,meshmatcap_frag:ay,meshnormal_vert:ly,meshnormal_frag:cy,meshphong_vert:hy,meshphong_frag:uy,meshphysical_vert:dy,meshphysical_frag:fy,meshtoon_vert:py,meshtoon_frag:my,points_vert:gy,points_frag:xy,shadow_vert:yy,shadow_frag:vy,sprite_vert:_y,sprite_frag:by},re={common:{diffuse:{value:new qe(16777215)},opacity:{value:1},map:{value:null},mapTransform:{value:new Ne},alphaMap:{value:null},alphaMapTransform:{value:new Ne},alphaTest:{value:0}},specularmap:{specularMap:{value:null},specularMapTransform:{value:new Ne}},envmap:{envMap:{value:null},envMapRotation:{value:new Ne},reflectivity:{value:1},ior:{value:1.5},refractionRatio:{value:.98},dfgLUT:{value:null}},aomap:{aoMap:{value:null},aoMapIntensity:{value:1},aoMapTransform:{value:new Ne}},lightmap:{lightMap:{value:null},lightMapIntensity:{value:1},lightMapTransform:{value:new Ne}},bumpmap:{bumpMap:{value:null},bumpMapTransform:{value:new Ne},bumpScale:{value:1}},normalmap:{normalMap:{value:null},normalMapTransform:{value:new Ne},normalScale:{value:new xe(1,1)}},displacementmap:{displacementMap:{value:null},displacementMapTransform:{value:new Ne},displacementScale:{value:1},displacementBias:{value:0}},emissivemap:{emissiveMap:{value:null},emissiveMapTransform:{value:new Ne}},metalnessmap:{metalnessMap:{value:null},metalnessMapTransform:{value:new Ne}},roughnessmap:{roughnessMap:{value:null},roughnessMapTransform:{value:new Ne}},gradientmap:{gradientMap:{value:null}},fog:{fogDensity:{value:25e-5},fogNear:{value:1},fogFar:{value:2e3},fogColor:{value:new qe(16777215)}},lights:{ambientLightColor:{value:[]},lightProbe:{value:[]},directionalLights:{value:[],properties:{direction:{},color:{}}},directionalLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{}}},directionalShadowMatrix:{value:[]},spotLights:{value:[],properties:{color:{},position:{},direction:{},distance:{},coneCos:{},penumbraCos:{},decay:{}}},spotLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{}}},spotLightMap:{value:[]},spotLightMatrix:{value:[]},pointLights:{value:[],properties:{color:{},position:{},decay:{},distance:{}}},pointLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{},shadowCameraNear:{},shadowCameraFar:{}}},pointShadowMatrix:{value:[]},hemisphereLights:{value:[],properties:{direction:{},skyColor:{},groundColor:{}}},rectAreaLights:{value:[],properties:{color:{},position:{},width:{},height:{}}},ltc_1:{value:null},ltc_2:{value:null},probesSH:{value:null},probesMin:{value:new L},probesMax:{value:new L},probesResolution:{value:new L}},points:{diffuse:{value:new qe(16777215)},opacity:{value:1},size:{value:1},scale:{value:1},map:{value:null},alphaMap:{value:null},alphaMapTransform:{value:new Ne},alphaTest:{value:0},uvTransform:{value:new Ne}},sprite:{diffuse:{value:new qe(16777215)},opacity:{value:1},center:{value:new xe(.5,.5)},rotation:{value:0},map:{value:null},mapTransform:{value:new Ne},alphaMap:{value:null},alphaMapTransform:{value:new Ne},alphaTest:{value:0}}},Qt={basic:{uniforms:Yt([re.common,re.specularmap,re.envmap,re.aomap,re.lightmap,re.fog]),vertexShader:He.meshbasic_vert,fragmentShader:He.meshbasic_frag},lambert:{uniforms:Yt([re.common,re.specularmap,re.envmap,re.aomap,re.lightmap,re.emissivemap,re.bumpmap,re.normalmap,re.displacementmap,re.fog,re.lights,{emissive:{value:new qe(0)},envMapIntensity:{value:1}}]),vertexShader:He.meshlambert_vert,fragmentShader:He.meshlambert_frag},phong:{uniforms:Yt([re.common,re.specularmap,re.envmap,re.aomap,re.lightmap,re.emissivemap,re.bumpmap,re.normalmap,re.displacementmap,re.fog,re.lights,{emissive:{value:new qe(0)},specular:{value:new qe(1118481)},shininess:{value:30},envMapIntensity:{value:1}}]),vertexShader:He.meshphong_vert,fragmentShader:He.meshphong_frag},standard:{uniforms:Yt([re.common,re.envmap,re.aomap,re.lightmap,re.emissivemap,re.bumpmap,re.normalmap,re.displacementmap,re.roughnessmap,re.metalnessmap,re.fog,re.lights,{emissive:{value:new qe(0)},roughness:{value:1},metalness:{value:0},envMapIntensity:{value:1}}]),vertexShader:He.meshphysical_vert,fragmentShader:He.meshphysical_frag},toon:{uniforms:Yt([re.common,re.aomap,re.lightmap,re.emissivemap,re.bumpmap,re.normalmap,re.displacementmap,re.gradientmap,re.fog,re.lights,{emissive:{value:new qe(0)}}]),vertexShader:He.meshtoon_vert,fragmentShader:He.meshtoon_frag},matcap:{uniforms:Yt([re.common,re.bumpmap,re.normalmap,re.displacementmap,re.fog,{matcap:{value:null}}]),vertexShader:He.meshmatcap_vert,fragmentShader:He.meshmatcap_frag},points:{uniforms:Yt([re.points,re.fog]),vertexShader:He.points_vert,fragmentShader:He.points_frag},dashed:{uniforms:Yt([re.common,re.fog,{scale:{value:1},dashSize:{value:1},totalSize:{value:2}}]),vertexShader:He.linedashed_vert,fragmentShader:He.linedashed_frag},depth:{uniforms:Yt([re.common,re.displacementmap]),vertexShader:He.depth_vert,fragmentShader:He.depth_frag},normal:{uniforms:Yt([re.common,re.bumpmap,re.normalmap,re.displacementmap,{opacity:{value:1}}]),vertexShader:He.meshnormal_vert,fragmentShader:He.meshnormal_frag},sprite:{uniforms:Yt([re.sprite,re.fog]),vertexShader:He.sprite_vert,fragmentShader:He.sprite_frag},background:{uniforms:{uvTransform:{value:new Ne},t2D:{value:null},backgroundIntensity:{value:1}},vertexShader:He.background_vert,fragmentShader:He.background_frag},backgroundCube:{uniforms:{envMap:{value:null},backgroundBlurriness:{value:0},backgroundIntensity:{value:1},backgroundRotation:{value:new Ne}},vertexShader:He.backgroundCube_vert,fragmentShader:He.backgroundCube_frag},cube:{uniforms:{tCube:{value:null},tFlip:{value:-1},opacity:{value:1}},vertexShader:He.cube_vert,fragmentShader:He.cube_frag},equirect:{uniforms:{tEquirect:{value:null}},vertexShader:He.equirect_vert,fragmentShader:He.equirect_frag},distance:{uniforms:Yt([re.common,re.displacementmap,{referencePosition:{value:new L},nearDistance:{value:1},farDistance:{value:1e3}}]),vertexShader:He.distance_vert,fragmentShader:He.distance_frag},shadow:{uniforms:Yt([re.lights,re.fog,{color:{value:new qe(0)},opacity:{value:1}}]),vertexShader:He.shadow_vert,fragmentShader:He.shadow_frag}};Qt.physical={uniforms:Yt([Qt.standard.uniforms,{clearcoat:{value:0},clearcoatMap:{value:null},clearcoatMapTransform:{value:new Ne},clearcoatNormalMap:{value:null},clearcoatNormalMapTransform:{value:new Ne},clearcoatNormalScale:{value:new xe(1,1)},clearcoatRoughness:{value:0},clearcoatRoughnessMap:{value:null},clearcoatRoughnessMapTransform:{value:new Ne},dispersion:{value:0},iridescence:{value:0},iridescenceMap:{value:null},iridescenceMapTransform:{value:new Ne},iridescenceIOR:{value:1.3},iridescenceThicknessMinimum:{value:100},iridescenceThicknessMaximum:{value:400},iridescenceThicknessMap:{value:null},iridescenceThicknessMapTransform:{value:new Ne},sheen:{value:0},sheenColor:{value:new qe(0)},sheenColorMap:{value:null},sheenColorMapTransform:{value:new Ne},sheenRoughness:{value:1},sheenRoughnessMap:{value:null},sheenRoughnessMapTransform:{value:new Ne},transmission:{value:0},transmissionMap:{value:null},transmissionMapTransform:{value:new Ne},transmissionSamplerSize:{value:new xe},transmissionSamplerMap:{value:null},thickness:{value:0},thicknessMap:{value:null},thicknessMapTransform:{value:new Ne},attenuationDistance:{value:0},attenuationColor:{value:new qe(0)},specularColor:{value:new qe(1,1,1)},specularColorMap:{value:null},specularColorMapTransform:{value:new Ne},specularIntensity:{value:1},specularIntensityMap:{value:null},specularIntensityMapTransform:{value:new Ne},anisotropyVector:{value:new xe},anisotropyMap:{value:null},anisotropyMapTransform:{value:new Ne}}]),vertexShader:He.meshphysical_vert,fragmentShader:He.meshphysical_frag};var Ll={r:0,b:0,g:0},Sy=new rt,Xf=new Ne;Xf.set(-1,0,0,0,1,0,0,0,1);function My(i,e,t,n,s,r){let o=new qe(0),a=s===!0?0:1,l,c,h=null,d=0,u=null;function f(b){let S=b.isScene===!0?b.background:null;if(S&&S.isTexture){let _=b.backgroundBlurriness>0;S=e.get(S,_)}return S}function m(b){let S=!1,_=f(b);_===null?g(o,a):_&&_.isColor&&(g(_,1),S=!0);let A=i.xr.getEnvironmentBlendMode();A==="additive"?t.buffers.color.setClear(0,0,0,1,r):A==="alpha-blend"&&t.buffers.color.setClear(0,0,0,0,r),(i.autoClear||S)&&(t.buffers.depth.setTest(!0),t.buffers.depth.setMask(!0),t.buffers.color.setMask(!0),i.clear(i.autoClearColor,i.autoClearDepth,i.autoClearStencil))}function x(b,S){let _=f(S);_&&(_.isCubeTexture||_.mapping===Xr)?(c===void 0&&(c=new At(new Os(1,1,1),new Jt({name:"BackgroundCubeMaterial",uniforms:as(Qt.backgroundCube.uniforms),vertexShader:Qt.backgroundCube.vertexShader,fragmentShader:Qt.backgroundCube.fragmentShader,side:jt,depthTest:!1,depthWrite:!1,fog:!1,allowOverride:!1})),c.geometry.deleteAttribute("normal"),c.geometry.deleteAttribute("uv"),c.onBeforeRender=function(A,w,E){this.matrixWorld.copyPosition(E.matrixWorld)},Object.defineProperty(c.material,"envMap",{get:function(){return this.uniforms.envMap.value}}),n.update(c)),c.material.uniforms.envMap.value=_,c.material.uniforms.backgroundBlurriness.value=S.backgroundBlurriness,c.material.uniforms.backgroundIntensity.value=S.backgroundIntensity,c.material.uniforms.backgroundRotation.value.setFromMatrix4(Sy.makeRotationFromEuler(S.backgroundRotation)).transpose(),_.isCubeTexture&&_.isRenderTargetTexture===!1&&c.material.uniforms.backgroundRotation.value.premultiply(Xf),c.material.toneMapped=Xe.getTransfer(_.colorSpace)!==Qe,(h!==_||d!==_.version||u!==i.toneMapping)&&(c.material.needsUpdate=!0,h=_,d=_.version,u=i.toneMapping),c.layers.enableAll(),b.unshift(c,c.geometry,c.material,0,0,null)):_&&_.isTexture&&(l===void 0&&(l=new At(new ss(2,2),new Jt({name:"BackgroundMaterial",uniforms:as(Qt.background.uniforms),vertexShader:Qt.background.vertexShader,fragmentShader:Qt.background.fragmentShader,side:li,depthTest:!1,depthWrite:!1,fog:!1,allowOverride:!1})),l.geometry.deleteAttribute("normal"),Object.defineProperty(l.material,"map",{get:function(){return this.uniforms.t2D.value}}),n.update(l)),l.material.uniforms.t2D.value=_,l.material.uniforms.backgroundIntensity.value=S.backgroundIntensity,l.material.toneMapped=Xe.getTransfer(_.colorSpace)!==Qe,_.matrixAutoUpdate===!0&&_.updateMatrix(),l.material.uniforms.uvTransform.value.copy(_.matrix),(h!==_||d!==_.version||u!==i.toneMapping)&&(l.material.needsUpdate=!0,h=_,d=_.version,u=i.toneMapping),l.layers.enableAll(),b.unshift(l,l.geometry,l.material,0,0,null))}function g(b,S){b.getRGB(Ll,Nh(i)),t.buffers.color.setClear(Ll.r,Ll.g,Ll.b,S,r)}function p(){c!==void 0&&(c.geometry.dispose(),c.material.dispose(),c=void 0),l!==void 0&&(l.geometry.dispose(),l.material.dispose(),l=void 0)}return{getClearColor:function(){return o},setClearColor:function(b,S=1){o.set(b),a=S,g(o,a)},getClearAlpha:function(){return a},setClearAlpha:function(b){a=b,g(o,a)},render:m,addToRenderList:x,dispose:p}}function wy(i,e){let t=i.getParameter(i.MAX_VERTEX_ATTRIBS),n={},s=u(null),r=s,o=!1;function a(R,D,I,k,F){let q=!1,B=d(R,k,I,D);r!==B&&(r=B,c(r.object)),q=f(R,k,I,F),q&&m(R,k,I,F),F!==null&&e.update(F,i.ELEMENT_ARRAY_BUFFER),(q||o)&&(o=!1,_(R,D,I,k),F!==null&&i.bindBuffer(i.ELEMENT_ARRAY_BUFFER,e.get(F).buffer))}function l(){return i.createVertexArray()}function c(R){return i.bindVertexArray(R)}function h(R){return i.deleteVertexArray(R)}function d(R,D,I,k){let F=k.wireframe===!0,q=n[D.id];q===void 0&&(q={},n[D.id]=q);let B=R.isInstancedMesh===!0?R.id:0,$=q[B];$===void 0&&($={},q[B]=$);let j=$[I.id];j===void 0&&(j={},$[I.id]=j);let se=j[F];return se===void 0&&(se=u(l()),j[F]=se),se}function u(R){let D=[],I=[],k=[];for(let F=0;F<t;F++)D[F]=0,I[F]=0,k[F]=0;return{geometry:null,program:null,wireframe:!1,newAttributes:D,enabledAttributes:I,attributeDivisors:k,object:R,attributes:{},index:null}}function f(R,D,I,k){let F=r.attributes,q=D.attributes,B=0,$=I.getAttributes();for(let j in $)if($[j].location>=0){let fe=F[j],_e=q[j];if(_e===void 0&&(j==="instanceMatrix"&&R.instanceMatrix&&(_e=R.instanceMatrix),j==="instanceColor"&&R.instanceColor&&(_e=R.instanceColor)),fe===void 0||fe.attribute!==_e||_e&&fe.data!==_e.data)return!0;B++}return r.attributesNum!==B||r.index!==k}function m(R,D,I,k){let F={},q=D.attributes,B=0,$=I.getAttributes();for(let j in $)if($[j].location>=0){let fe=q[j];fe===void 0&&(j==="instanceMatrix"&&R.instanceMatrix&&(fe=R.instanceMatrix),j==="instanceColor"&&R.instanceColor&&(fe=R.instanceColor));let _e={};_e.attribute=fe,fe&&fe.data&&(_e.data=fe.data),F[j]=_e,B++}r.attributes=F,r.attributesNum=B,r.index=k}function x(){let R=r.newAttributes;for(let D=0,I=R.length;D<I;D++)R[D]=0}function g(R){p(R,0)}function p(R,D){let I=r.newAttributes,k=r.enabledAttributes,F=r.attributeDivisors;I[R]=1,k[R]===0&&(i.enableVertexAttribArray(R),k[R]=1),F[R]!==D&&(i.vertexAttribDivisor(R,D),F[R]=D)}function b(){let R=r.newAttributes,D=r.enabledAttributes;for(let I=0,k=D.length;I<k;I++)D[I]!==R[I]&&(i.disableVertexAttribArray(I),D[I]=0)}function S(R,D,I,k,F,q,B){B===!0?i.vertexAttribIPointer(R,D,I,F,q):i.vertexAttribPointer(R,D,I,k,F,q)}function _(R,D,I,k){x();let F=k.attributes,q=I.getAttributes(),B=D.defaultAttributeValues;for(let $ in q){let j=q[$];if(j.location>=0){let se=F[$];if(se===void 0&&($==="instanceMatrix"&&R.instanceMatrix&&(se=R.instanceMatrix),$==="instanceColor"&&R.instanceColor&&(se=R.instanceColor)),se!==void 0){let fe=se.normalized,_e=se.itemSize,Ke=e.get(se);if(Ke===void 0)continue;let pt=Ke.buffer,Je=Ke.type,Q=Ke.bytesPerElement,ae=Je===i.INT||Je===i.UNSIGNED_INT||se.gpuType===Za;if(se.isInterleavedBufferAttribute){let ne=se.data,Fe=ne.stride,ze=se.offset;if(ne.isInstancedInterleavedBuffer){for(let Ce=0;Ce<j.locationSize;Ce++)p(j.location+Ce,ne.meshPerAttribute);R.isInstancedMesh!==!0&&k._maxInstanceCount===void 0&&(k._maxInstanceCount=ne.meshPerAttribute*ne.count)}else for(let Ce=0;Ce<j.locationSize;Ce++)g(j.location+Ce);i.bindBuffer(i.ARRAY_BUFFER,pt);for(let Ce=0;Ce<j.locationSize;Ce++)S(j.location+Ce,_e/j.locationSize,Je,fe,Fe*Q,(ze+_e/j.locationSize*Ce)*Q,ae)}else{if(se.isInstancedBufferAttribute){for(let ne=0;ne<j.locationSize;ne++)p(j.location+ne,se.meshPerAttribute);R.isInstancedMesh!==!0&&k._maxInstanceCount===void 0&&(k._maxInstanceCount=se.meshPerAttribute*se.count)}else for(let ne=0;ne<j.locationSize;ne++)g(j.location+ne);i.bindBuffer(i.ARRAY_BUFFER,pt);for(let ne=0;ne<j.locationSize;ne++)S(j.location+ne,_e/j.locationSize,Je,fe,_e*Q,_e/j.locationSize*ne*Q,ae)}}else if(B!==void 0){let fe=B[$];if(fe!==void 0)switch(fe.length){case 2:i.vertexAttrib2fv(j.location,fe);break;case 3:i.vertexAttrib3fv(j.location,fe);break;case 4:i.vertexAttrib4fv(j.location,fe);break;default:i.vertexAttrib1fv(j.location,fe)}}}}b()}function A(){T();for(let R in n){let D=n[R];for(let I in D){let k=D[I];for(let F in k){let q=k[F];for(let B in q)h(q[B].object),delete q[B];delete k[F]}}delete n[R]}}function w(R){if(n[R.id]===void 0)return;let D=n[R.id];for(let I in D){let k=D[I];for(let F in k){let q=k[F];for(let B in q)h(q[B].object),delete q[B];delete k[F]}}delete n[R.id]}function E(R){for(let D in n){let I=n[D];for(let k in I){let F=I[k];if(F[R.id]===void 0)continue;let q=F[R.id];for(let B in q)h(q[B].object),delete q[B];delete F[R.id]}}}function y(R){for(let D in n){let I=n[D],k=R.isInstancedMesh===!0?R.id:0,F=I[k];if(F!==void 0){for(let q in F){let B=F[q];for(let $ in B)h(B[$].object),delete B[$];delete F[q]}delete I[k],Object.keys(I).length===0&&delete n[D]}}}function T(){C(),o=!0,r!==s&&(r=s,c(r.object))}function C(){s.geometry=null,s.program=null,s.wireframe=!1}return{setup:a,reset:T,resetDefaultState:C,dispose:A,releaseStatesOfGeometry:w,releaseStatesOfObject:y,releaseStatesOfProgram:E,initAttributes:x,enableAttribute:g,disableUnusedAttributes:b}}function Ey(i,e,t){let n;function s(l){n=l}function r(l,c){i.drawArrays(n,l,c),t.update(c,n,1)}function o(l,c,h){h!==0&&(i.drawArraysInstanced(n,l,c,h),t.update(c,n,h))}function a(l,c,h){if(h===0)return;e.get("WEBGL_multi_draw").multiDrawArraysWEBGL(n,l,0,c,0,h);let u=0;for(let f=0;f<h;f++)u+=c[f];t.update(u,n,1)}this.setMode=s,this.render=r,this.renderInstances=o,this.renderMultiDraw=a}function Ty(i,e,t,n){let s;function r(){if(s!==void 0)return s;if(e.has("EXT_texture_filter_anisotropic")===!0){let E=e.get("EXT_texture_filter_anisotropic");s=i.getParameter(E.MAX_TEXTURE_MAX_ANISOTROPY_EXT)}else s=0;return s}function o(E){return!(E!==Sn&&n.convert(E)!==i.getParameter(i.IMPLEMENTATION_COLOR_READ_FORMAT))}function a(E){let y=E===$n&&(e.has("EXT_color_buffer_half_float")||e.has("EXT_color_buffer_float"));return!(E!==mn&&n.convert(E)!==i.getParameter(i.IMPLEMENTATION_COLOR_READ_TYPE)&&E!==Un&&!y)}function l(E){if(E==="highp"){if(i.getShaderPrecisionFormat(i.VERTEX_SHADER,i.HIGH_FLOAT).precision>0&&i.getShaderPrecisionFormat(i.FRAGMENT_SHADER,i.HIGH_FLOAT).precision>0)return"highp";E="mediump"}return E==="mediump"&&i.getShaderPrecisionFormat(i.VERTEX_SHADER,i.MEDIUM_FLOAT).precision>0&&i.getShaderPrecisionFormat(i.FRAGMENT_SHADER,i.MEDIUM_FLOAT).precision>0?"mediump":"lowp"}let c=t.precision!==void 0?t.precision:"highp",h=l(c);h!==c&&(Pe("WebGLRenderer:",c,"not supported, using",h,"instead."),c=h);let d=t.logarithmicDepthBuffer===!0,u=t.reversedDepthBuffer===!0&&e.has("EXT_clip_control");t.reversedDepthBuffer===!0&&u===!1&&Pe("WebGLRenderer: Unable to use reversed depth buffer due to missing EXT_clip_control extension. Fallback to default depth buffer.");let f=i.getParameter(i.MAX_TEXTURE_IMAGE_UNITS),m=i.getParameter(i.MAX_VERTEX_TEXTURE_IMAGE_UNITS),x=i.getParameter(i.MAX_TEXTURE_SIZE),g=i.getParameter(i.MAX_CUBE_MAP_TEXTURE_SIZE),p=i.getParameter(i.MAX_VERTEX_ATTRIBS),b=i.getParameter(i.MAX_VERTEX_UNIFORM_VECTORS),S=i.getParameter(i.MAX_VARYING_VECTORS),_=i.getParameter(i.MAX_FRAGMENT_UNIFORM_VECTORS),A=i.getParameter(i.MAX_SAMPLES),w=i.getParameter(i.SAMPLES);return{isWebGL2:!0,getMaxAnisotropy:r,getMaxPrecision:l,textureFormatReadable:o,textureTypeReadable:a,precision:c,logarithmicDepthBuffer:d,reversedDepthBuffer:u,maxTextures:f,maxVertexTextures:m,maxTextureSize:x,maxCubemapSize:g,maxAttributes:p,maxVertexUniforms:b,maxVaryings:S,maxFragmentUniforms:_,maxSamples:A,samples:w}}function Ay(i){let e=this,t=null,n=0,s=!1,r=!1,o=new Hn,a=new Ne,l={value:null,needsUpdate:!1};this.uniform=l,this.numPlanes=0,this.numIntersection=0,this.init=function(d,u){let f=d.length!==0||u||n!==0||s;return s=u,n=d.length,f},this.beginShadows=function(){r=!0,h(null)},this.endShadows=function(){r=!1},this.setGlobalState=function(d,u){t=h(d,u,0)},this.setState=function(d,u,f){let m=d.clippingPlanes,x=d.clipIntersection,g=d.clipShadows,p=i.get(d);if(!s||m===null||m.length===0||r&&!g)r?h(null):c();else{let b=r?0:n,S=b*4,_=p.clippingState||null;l.value=_,_=h(m,u,S,f);for(let A=0;A!==S;++A)_[A]=t[A];p.clippingState=_,this.numIntersection=x?this.numPlanes:0,this.numPlanes+=b}};function c(){l.value!==t&&(l.value=t,l.needsUpdate=n>0),e.numPlanes=n,e.numIntersection=0}function h(d,u,f,m){let x=d!==null?d.length:0,g=null;if(x!==0){if(g=l.value,m!==!0||g===null){let p=f+x*4,b=u.matrixWorldInverse;a.getNormalMatrix(b),(g===null||g.length<p)&&(g=new Float32Array(p));for(let S=0,_=f;S!==x;++S,_+=4)o.copy(d[S]).applyMatrix4(b,a),o.normal.toArray(g,_),g[_+3]=o.constant}l.value=g,l.needsUpdate=!0}return e.numPlanes=x,e.numIntersection=0,g}}var zi=4,Sf=[.125,.215,.35,.446,.526,.582],ls=20,Py=256,eo=new rs,Mf=new qe,Xh=null,qh=0,Yh=0,Zh=!1,Ry=new L,Fl=class{constructor(e){this._renderer=e,this._pingPongRenderTarget=null,this._lodMax=0,this._cubeSize=0,this._sizeLods=[],this._sigmas=[],this._lodMeshes=[],this._backgroundBox=null,this._cubemapMaterial=null,this._equirectMaterial=null,this._blurMaterial=null,this._ggxMaterial=null}fromScene(e,t=0,n=.1,s=100,r={}){let{size:o=256,position:a=Ry}=r;Xh=this._renderer.getRenderTarget(),qh=this._renderer.getActiveCubeFace(),Yh=this._renderer.getActiveMipmapLevel(),Zh=this._renderer.xr.enabled,this._renderer.xr.enabled=!1,this._setSize(o);let l=this._allocateTargets();return l.depthBuffer=!0,this._sceneToCubeUV(e,n,s,l,a),t>0&&this._blur(l,0,0,t),this._applyPMREM(l),this._cleanup(l),l}fromEquirectangular(e,t=null){return this._fromTexture(e,t)}fromCubemap(e,t=null){return this._fromTexture(e,t)}compileCubemapShader(){this._cubemapMaterial===null&&(this._cubemapMaterial=Tf(),this._compileMaterial(this._cubemapMaterial))}compileEquirectangularShader(){this._equirectMaterial===null&&(this._equirectMaterial=Ef(),this._compileMaterial(this._equirectMaterial))}dispose(){this._dispose(),this._cubemapMaterial!==null&&this._cubemapMaterial.dispose(),this._equirectMaterial!==null&&this._equirectMaterial.dispose(),this._backgroundBox!==null&&(this._backgroundBox.geometry.dispose(),this._backgroundBox.material.dispose())}_setSize(e){this._lodMax=Math.floor(Math.log2(e)),this._cubeSize=Math.pow(2,this._lodMax)}_dispose(){this._blurMaterial!==null&&this._blurMaterial.dispose(),this._ggxMaterial!==null&&this._ggxMaterial.dispose(),this._pingPongRenderTarget!==null&&this._pingPongRenderTarget.dispose();for(let e=0;e<this._lodMeshes.length;e++)this._lodMeshes[e].geometry.dispose()}_cleanup(e){this._renderer.setRenderTarget(Xh,qh,Yh),this._renderer.xr.enabled=Zh,e.scissorTest=!1,Xs(e,0,0,e.width,e.height)}_fromTexture(e,t){e.mapping===Ui||e.mapping===os?this._setSize(e.image.length===0?16:e.image[0].width||e.image[0].image.width):this._setSize(e.image.width/4),Xh=this._renderer.getRenderTarget(),qh=this._renderer.getActiveCubeFace(),Yh=this._renderer.getActiveMipmapLevel(),Zh=this._renderer.xr.enabled,this._renderer.xr.enabled=!1;let n=t||this._allocateTargets();return this._textureToCubeUV(e,n),this._applyPMREM(n),this._cleanup(n),n}_allocateTargets(){let e=3*Math.max(this._cubeSize,112),t=4*this._cubeSize,n={magFilter:zt,minFilter:zt,generateMipmaps:!1,type:$n,format:Sn,colorSpace:pr,depthBuffer:!1},s=wf(e,t,n);if(this._pingPongRenderTarget===null||this._pingPongRenderTarget.width!==e||this._pingPongRenderTarget.height!==t){this._pingPongRenderTarget!==null&&this._dispose(),this._pingPongRenderTarget=wf(e,t,n);let{_lodMax:r}=this;({lodMeshes:this._lodMeshes,sizeLods:this._sizeLods,sigmas:this._sigmas}=Cy(r)),this._blurMaterial=Ly(r,e,t),this._ggxMaterial=Iy(r,e,t)}return s}_compileMaterial(e){let t=new At(new It,e);this._renderer.compile(t,eo)}_sceneToCubeUV(e,t,n,s,r){let l=new qt(90,1,t,n),c=[1,-1,1,1,1,1],h=[1,1,1,-1,-1,-1],d=this._renderer,u=d.autoClear,f=d.toneMapping;d.getClearColor(Mf),d.toneMapping=Dn,d.autoClear=!1,d.state.buffers.depth.getReversed()&&(d.setRenderTarget(s),d.clearDepth(),d.setRenderTarget(null)),this._backgroundBox===null&&(this._backgroundBox=new At(new Os,new Ln({name:"PMREM.Background",side:jt,depthWrite:!1,depthTest:!1})));let x=this._backgroundBox,g=x.material,p=!1,b=e.background;b?b.isColor&&(g.color.copy(b),e.background=null,p=!0):(g.color.copy(Mf),p=!0);for(let S=0;S<6;S++){let _=S%3;_===0?(l.up.set(0,c[S],0),l.position.set(r.x,r.y,r.z),l.lookAt(r.x+h[S],r.y,r.z)):_===1?(l.up.set(0,0,c[S]),l.position.set(r.x,r.y,r.z),l.lookAt(r.x,r.y+h[S],r.z)):(l.up.set(0,c[S],0),l.position.set(r.x,r.y,r.z),l.lookAt(r.x,r.y,r.z+h[S]));let A=this._cubeSize;Xs(s,_*A,S>2?A:0,A,A),d.setRenderTarget(s),p&&d.render(x,l),d.render(e,l)}d.toneMapping=f,d.autoClear=u,e.background=b}_textureToCubeUV(e,t){let n=this._renderer,s=e.mapping===Ui||e.mapping===os;s?(this._cubemapMaterial===null&&(this._cubemapMaterial=Tf()),this._cubemapMaterial.uniforms.flipEnvMap.value=e.isRenderTargetTexture===!1?-1:1):this._equirectMaterial===null&&(this._equirectMaterial=Ef());let r=s?this._cubemapMaterial:this._equirectMaterial,o=this._lodMeshes[0];o.material=r;let a=r.uniforms;a.envMap.value=e;let l=this._cubeSize;Xs(t,0,0,3*l,2*l),n.setRenderTarget(t),n.render(o,eo)}_applyPMREM(e){let t=this._renderer,n=t.autoClear;t.autoClear=!1;let s=this._lodMeshes.length;for(let r=1;r<s;r++)this._applyGGXFilter(e,r-1,r);t.autoClear=n}_applyGGXFilter(e,t,n){let s=this._renderer,r=this._pingPongRenderTarget,o=this._ggxMaterial,a=this._lodMeshes[n];a.material=o;let l=o.uniforms,c=n/(this._lodMeshes.length-1),h=t/(this._lodMeshes.length-1),d=Math.sqrt(c*c-h*h),u=0+c*1.25,f=d*u,{_lodMax:m}=this,x=this._sizeLods[n],g=3*x*(n>m-zi?n-m+zi:0),p=4*(this._cubeSize-x);l.envMap.value=e.texture,l.roughness.value=f,l.mipInt.value=m-t,Xs(r,g,p,3*x,2*x),s.setRenderTarget(r),s.render(a,eo),l.envMap.value=r.texture,l.roughness.value=0,l.mipInt.value=m-n,Xs(e,g,p,3*x,2*x),s.setRenderTarget(e),s.render(a,eo)}_blur(e,t,n,s,r){let o=this._pingPongRenderTarget;this._halfBlur(e,o,t,n,s,"latitudinal",r),this._halfBlur(o,e,n,n,s,"longitudinal",r)}_halfBlur(e,t,n,s,r,o,a){let l=this._renderer,c=this._blurMaterial;o!=="latitudinal"&&o!=="longitudinal"&&Le("blur direction must be either latitudinal or longitudinal!");let h=3,d=this._lodMeshes[s];d.material=c;let u=c.uniforms,f=this._sizeLods[n]-1,m=isFinite(r)?Math.PI/(2*f):2*Math.PI/(2*ls-1),x=r/m,g=isFinite(r)?1+Math.floor(h*x):ls;g>ls&&Pe(`sigmaRadians, ${r}, is too large and will clip, as it requested ${g} samples when the maximum is set to ${ls}`);let p=[],b=0;for(let E=0;E<ls;++E){let y=E/x,T=Math.exp(-y*y/2);p.push(T),E===0?b+=T:E<g&&(b+=2*T)}for(let E=0;E<p.length;E++)p[E]=p[E]/b;u.envMap.value=e.texture,u.samples.value=g,u.weights.value=p,u.latitudinal.value=o==="latitudinal",a&&(u.poleAxis.value=a);let{_lodMax:S}=this;u.dTheta.value=m,u.mipInt.value=S-n;let _=this._sizeLods[s],A=3*_*(s>S-zi?s-S+zi:0),w=4*(this._cubeSize-_);Xs(t,A,w,3*_,2*_),l.setRenderTarget(t),l.render(d,eo)}};function Cy(i){let e=[],t=[],n=[],s=i,r=i-zi+1+Sf.length;for(let o=0;o<r;o++){let a=Math.pow(2,s);e.push(a);let l=1/a;o>i-zi?l=Sf[o-i+zi-1]:o===0&&(l=0),t.push(l);let c=1/(a-2),h=-c,d=1+c,u=[h,h,d,h,d,d,h,h,d,d,h,d],f=6,m=6,x=3,g=2,p=1,b=new Float32Array(x*m*f),S=new Float32Array(g*m*f),_=new Float32Array(p*m*f);for(let w=0;w<f;w++){let E=w%3*2/3-1,y=w>2?0:-1,T=[E,y,0,E+2/3,y,0,E+2/3,y+1,0,E,y,0,E+2/3,y+1,0,E,y+1,0];b.set(T,x*m*w),S.set(u,g*m*w);let C=[w,w,w,w,w,w];_.set(C,p*m*w)}let A=new It;A.setAttribute("position",new sn(b,x)),A.setAttribute("uv",new sn(S,g)),A.setAttribute("faceIndex",new sn(_,p)),n.push(new At(A,null)),s>zi&&s--}return{lodMeshes:n,sizeLods:e,sigmas:t}}function wf(i,e,t){let n=new hn(i,e,t);return n.texture.mapping=Xr,n.texture.name="PMREM.cubeUv",n.scissorTest=!0,n}function Xs(i,e,t,n,s){i.viewport.set(e,t,n,s),i.scissor.set(e,t,n,s)}function Iy(i,e,t){return new Jt({name:"PMREMGGXConvolution",defines:{GGX_SAMPLES:Py,CUBEUV_TEXEL_WIDTH:1/e,CUBEUV_TEXEL_HEIGHT:1/t,CUBEUV_MAX_MIP:`${i}.0`},uniforms:{envMap:{value:null},roughness:{value:0},mipInt:{value:0}},vertexShader:Ol(),fragmentShader:`

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
		`,blending:Zn,depthTest:!1,depthWrite:!1})}function Ly(i,e,t){let n=new Float32Array(ls),s=new L(0,1,0);return new Jt({name:"SphericalGaussianBlur",defines:{n:ls,CUBEUV_TEXEL_WIDTH:1/e,CUBEUV_TEXEL_HEIGHT:1/t,CUBEUV_MAX_MIP:`${i}.0`},uniforms:{envMap:{value:null},samples:{value:1},weights:{value:n},latitudinal:{value:!1},dTheta:{value:0},mipInt:{value:0},poleAxis:{value:s}},vertexShader:Ol(),fragmentShader:`

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
		`,blending:Zn,depthTest:!1,depthWrite:!1})}function Ef(){return new Jt({name:"EquirectangularToCubeUV",uniforms:{envMap:{value:null}},vertexShader:Ol(),fragmentShader:`

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
		`,blending:Zn,depthTest:!1,depthWrite:!1})}function Tf(){return new Jt({name:"CubemapToCubeUV",uniforms:{envMap:{value:null},flipEnvMap:{value:-1}},vertexShader:Ol(),fragmentShader:`

			precision mediump float;
			precision mediump int;

			uniform float flipEnvMap;

			varying vec3 vOutputDirection;

			uniform samplerCube envMap;

			void main() {

				gl_FragColor = textureCube( envMap, vec3( flipEnvMap * vOutputDirection.x, vOutputDirection.yz ) );

			}
		`,blending:Zn,depthTest:!1,depthWrite:!1})}function Ol(){return`

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
	`}var Ul=class extends hn{constructor(e=1,t={}){super(e,e,t),this.isWebGLCubeRenderTarget=!0;let n={width:e,height:e,depth:1},s=[n,n,n,n,n,n];this.texture=new Ar(s),this._setTextureOptions(t),this.texture.isRenderTargetTexture=!0}fromEquirectangularTexture(e,t){this.texture.type=t.type,this.texture.colorSpace=t.colorSpace,this.texture.generateMipmaps=t.generateMipmaps,this.texture.minFilter=t.minFilter,this.texture.magFilter=t.magFilter;let n={uniforms:{tEquirect:{value:null}},vertexShader:`

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
			`},s=new Os(5,5,5),r=new Jt({name:"CubemapFromEquirect",uniforms:as(n.uniforms),vertexShader:n.vertexShader,fragmentShader:n.fragmentShader,side:jt,blending:Zn});r.uniforms.tEquirect.value=t;let o=new At(s,r),a=t.minFilter;return t.minFilter===Ni&&(t.minFilter=zt),new Va(1,10,this).update(e,o),t.minFilter=a,o.geometry.dispose(),o.material.dispose(),this}clear(e,t=!0,n=!0,s=!0){let r=e.getRenderTarget();for(let o=0;o<6;o++)e.setRenderTarget(this,o),e.clear(t,n,s);e.setRenderTarget(r)}};function Dy(i){let e=new WeakMap,t=new WeakMap,n=null;function s(u,f=!1){return u==null?null:f?o(u):r(u)}function r(u){if(u&&u.isTexture){let f=u.mapping;if(f===Xa||f===qa)if(e.has(u)){let m=e.get(u).texture;return a(m,u.mapping)}else{let m=u.image;if(m&&m.height>0){let x=new Ul(m.height);return x.fromEquirectangularTexture(i,u),e.set(u,x),u.addEventListener("dispose",c),a(x.texture,u.mapping)}else return null}}return u}function o(u){if(u&&u.isTexture){let f=u.mapping,m=f===Xa||f===qa,x=f===Ui||f===os;if(m||x){let g=t.get(u),p=g!==void 0?g.texture.pmremVersion:0;if(u.isRenderTargetTexture&&u.pmremVersion!==p)return n===null&&(n=new Fl(i)),g=m?n.fromEquirectangular(u,g):n.fromCubemap(u,g),g.texture.pmremVersion=u.pmremVersion,t.set(u,g),g.texture;if(g!==void 0)return g.texture;{let b=u.image;return m&&b&&b.height>0||x&&b&&l(b)?(n===null&&(n=new Fl(i)),g=m?n.fromEquirectangular(u):n.fromCubemap(u),g.texture.pmremVersion=u.pmremVersion,t.set(u,g),u.addEventListener("dispose",h),g.texture):null}}}return u}function a(u,f){return f===Xa?u.mapping=Ui:f===qa&&(u.mapping=os),u}function l(u){let f=0,m=6;for(let x=0;x<m;x++)u[x]!==void 0&&f++;return f===m}function c(u){let f=u.target;f.removeEventListener("dispose",c);let m=e.get(f);m!==void 0&&(e.delete(f),m.dispose())}function h(u){let f=u.target;f.removeEventListener("dispose",h);let m=t.get(f);m!==void 0&&(t.delete(f),m.dispose())}function d(){e=new WeakMap,t=new WeakMap,n!==null&&(n.dispose(),n=null)}return{get:s,dispose:d}}function Fy(i){let e={};function t(n){if(e[n]!==void 0)return e[n];let s=i.getExtension(n);return e[n]=s,s}return{has:function(n){return t(n)!==null},init:function(){t("EXT_color_buffer_float"),t("WEBGL_clip_cull_distance"),t("OES_texture_float_linear"),t("EXT_color_buffer_half_float"),t("WEBGL_multisampled_render_to_texture"),t("WEBGL_render_shared_exponent")},get:function(n){let s=t(n);return s===null&&ji("WebGLRenderer: "+n+" extension not supported."),s}}}function Uy(i,e,t,n){let s={},r=new WeakMap;function o(d){let u=d.target;u.index!==null&&e.remove(u.index);for(let m in u.attributes)e.remove(u.attributes[m]);u.removeEventListener("dispose",o),delete s[u.id];let f=r.get(u);f&&(e.remove(f),r.delete(u)),n.releaseStatesOfGeometry(u),u.isInstancedBufferGeometry===!0&&delete u._maxInstanceCount,t.memory.geometries--}function a(d,u){return s[u.id]===!0||(u.addEventListener("dispose",o),s[u.id]=!0,t.memory.geometries++),u}function l(d){let u=d.attributes;for(let f in u)e.update(u[f],i.ARRAY_BUFFER)}function c(d){let u=[],f=d.index,m=d.attributes.position,x=0;if(m===void 0)return;if(f!==null){let b=f.array;x=f.version;for(let S=0,_=b.length;S<_;S+=3){let A=b[S+0],w=b[S+1],E=b[S+2];u.push(A,w,w,E,E,A)}}else{let b=m.array;x=m.version;for(let S=0,_=b.length/3-1;S<_;S+=3){let A=S+0,w=S+1,E=S+2;u.push(A,w,w,E,E,A)}}let g=new(m.count>=65535?Mr:Sr)(u,1);g.version=x;let p=r.get(d);p&&e.remove(p),r.set(d,g)}function h(d){let u=r.get(d);if(u){let f=d.index;f!==null&&u.version<f.version&&c(d)}else c(d);return r.get(d)}return{get:a,update:l,getWireframeAttribute:h}}function Ny(i,e,t){let n;function s(d){n=d}let r,o;function a(d){r=d.type,o=d.bytesPerElement}function l(d,u){i.drawElements(n,u,r,d*o),t.update(u,n,1)}function c(d,u,f){f!==0&&(i.drawElementsInstanced(n,u,r,d*o,f),t.update(u,n,f))}function h(d,u,f){if(f===0)return;e.get("WEBGL_multi_draw").multiDrawElementsWEBGL(n,u,0,r,d,0,f);let x=0;for(let g=0;g<f;g++)x+=u[g];t.update(x,n,1)}this.setMode=s,this.setIndex=a,this.render=l,this.renderInstances=c,this.renderMultiDraw=h}function Oy(i){let e={geometries:0,textures:0},t={frame:0,calls:0,triangles:0,points:0,lines:0};function n(r,o,a){switch(t.calls++,o){case i.TRIANGLES:t.triangles+=a*(r/3);break;case i.LINES:t.lines+=a*(r/2);break;case i.LINE_STRIP:t.lines+=a*(r-1);break;case i.LINE_LOOP:t.lines+=a*r;break;case i.POINTS:t.points+=a*r;break;default:Le("WebGLInfo: Unknown draw mode:",o);break}}function s(){t.calls=0,t.triangles=0,t.points=0,t.lines=0}return{memory:e,render:t,programs:null,autoReset:!0,reset:s,update:n}}function By(i,e,t){let n=new WeakMap,s=new it;function r(o,a,l){let c=o.morphTargetInfluences,h=a.morphAttributes.position||a.morphAttributes.normal||a.morphAttributes.color,d=h!==void 0?h.length:0,u=n.get(a);if(u===void 0||u.count!==d){let C=function(){y.dispose(),n.delete(a),a.removeEventListener("dispose",C)};var f=C;u!==void 0&&u.texture.dispose();let m=a.morphAttributes.position!==void 0,x=a.morphAttributes.normal!==void 0,g=a.morphAttributes.color!==void 0,p=a.morphAttributes.position||[],b=a.morphAttributes.normal||[],S=a.morphAttributes.color||[],_=0;m===!0&&(_=1),x===!0&&(_=2),g===!0&&(_=3);let A=a.attributes.position.count*_,w=1;A>e.maxTextureSize&&(w=Math.ceil(A/e.maxTextureSize),A=e.maxTextureSize);let E=new Float32Array(A*w*4*d),y=new vr(E,A,w,d);y.type=Un,y.needsUpdate=!0;let T=_*4;for(let R=0;R<d;R++){let D=p[R],I=b[R],k=S[R],F=A*w*4*R;for(let q=0;q<D.count;q++){let B=q*T;m===!0&&(s.fromBufferAttribute(D,q),E[F+B+0]=s.x,E[F+B+1]=s.y,E[F+B+2]=s.z,E[F+B+3]=0),x===!0&&(s.fromBufferAttribute(I,q),E[F+B+4]=s.x,E[F+B+5]=s.y,E[F+B+6]=s.z,E[F+B+7]=0),g===!0&&(s.fromBufferAttribute(k,q),E[F+B+8]=s.x,E[F+B+9]=s.y,E[F+B+10]=s.z,E[F+B+11]=k.itemSize===4?s.w:1)}}u={count:d,texture:y,size:new xe(A,w)},n.set(a,u),a.addEventListener("dispose",C)}if(o.isInstancedMesh===!0&&o.morphTexture!==null)l.getUniforms().setValue(i,"morphTexture",o.morphTexture,t);else{let m=0;for(let g=0;g<c.length;g++)m+=c[g];let x=a.morphTargetsRelative?1:1-m;l.getUniforms().setValue(i,"morphTargetBaseInfluence",x),l.getUniforms().setValue(i,"morphTargetInfluences",c)}l.getUniforms().setValue(i,"morphTargetsTexture",u.texture,t),l.getUniforms().setValue(i,"morphTargetsTextureSize",u.size)}return{update:r}}function zy(i,e,t,n,s){let r=new WeakMap;function o(c){let h=s.render.frame,d=c.geometry,u=e.get(c,d);if(r.get(u)!==h&&(e.update(u),r.set(u,h)),c.isInstancedMesh&&(c.hasEventListener("dispose",l)===!1&&c.addEventListener("dispose",l),r.get(c)!==h&&(t.update(c.instanceMatrix,i.ARRAY_BUFFER),c.instanceColor!==null&&t.update(c.instanceColor,i.ARRAY_BUFFER),r.set(c,h))),c.isSkinnedMesh){let f=c.skeleton;r.get(f)!==h&&(f.update(),r.set(f,h))}return u}function a(){r=new WeakMap}function l(c){let h=c.target;h.removeEventListener("dispose",l),n.releaseStatesOfObject(h),t.remove(h.instanceMatrix),h.instanceColor!==null&&t.remove(h.instanceColor)}return{update:o,dispose:a}}var ky={[gh]:"LINEAR_TONE_MAPPING",[xh]:"REINHARD_TONE_MAPPING",[yh]:"CINEON_TONE_MAPPING",[vh]:"ACES_FILMIC_TONE_MAPPING",[bh]:"AGX_TONE_MAPPING",[Sh]:"NEUTRAL_TONE_MAPPING",[_h]:"CUSTOM_TONE_MAPPING"};function Vy(i,e,t,n,s,r){let o=new hn(e,t,{type:i,depthBuffer:s,stencilBuffer:r,samples:n?4:0,depthTexture:s?new ci(e,t):void 0}),a=new hn(e,t,{type:$n,depthBuffer:!1,stencilBuffer:!1}),l=new It;l.setAttribute("position",new nt([-1,3,0,-1,-1,0,3,-1,0],3)),l.setAttribute("uv",new nt([0,2,0,0,2,0],2));let c=new Pa({uniforms:{tDiffuse:{value:null}},vertexShader:`
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
			}`,depthTest:!1,depthWrite:!1}),h=new At(l,c),d=new rs(-1,1,1,-1,0,1),u=null,f=null,m=!1,x,g=null,p=[],b=!1;this.setSize=function(S,_){o.setSize(S,_),a.setSize(S,_);for(let A=0;A<p.length;A++){let w=p[A];w.setSize&&w.setSize(S,_)}},this.setEffects=function(S){p=S,b=p.length>0&&p[0].isRenderPass===!0;let _=o.width,A=o.height;for(let w=0;w<p.length;w++){let E=p[w];E.setSize&&E.setSize(_,A)}},this.begin=function(S,_){if(m||S.toneMapping===Dn&&p.length===0)return!1;if(g=_,_!==null){let A=_.width,w=_.height;(o.width!==A||o.height!==w)&&this.setSize(A,w)}return b===!1&&S.setRenderTarget(o),x=S.toneMapping,S.toneMapping=Dn,!0},this.hasRenderPass=function(){return b},this.end=function(S,_){S.toneMapping=x,m=!0;let A=o,w=a;for(let E=0;E<p.length;E++){let y=p[E];if(y.enabled!==!1&&(y.render(S,w,A,_),y.needsSwap!==!1)){let T=A;A=w,w=T}}if(u!==S.outputColorSpace||f!==S.toneMapping){u=S.outputColorSpace,f=S.toneMapping,c.defines={},Xe.getTransfer(u)===Qe&&(c.defines.SRGB_TRANSFER="");let E=ky[f];E&&(c.defines[E]=""),c.needsUpdate=!0}c.uniforms.tDiffuse.value=A.texture,S.setRenderTarget(g),S.render(h,d),g=null,m=!1},this.isCompositing=function(){return m},this.dispose=function(){o.depthTexture&&o.depthTexture.dispose(),o.dispose(),a.dispose(),l.dispose(),c.dispose()}}var qf=new Kt,Jh=new ci(1,1),Yf=new vr,Zf=new ga,$f=new Ar,Af=[],Pf=[],Rf=new Float32Array(16),Cf=new Float32Array(9),If=new Float32Array(4);function Ys(i,e,t){let n=i[0];if(n<=0||n>0)return i;let s=e*t,r=Af[s];if(r===void 0&&(r=new Float32Array(s),Af[s]=r),e!==0){n.toArray(r,0);for(let o=1,a=0;o!==e;++o)a+=t,i[o].toArray(r,a)}return r}function Lt(i,e){if(i.length!==e.length)return!1;for(let t=0,n=i.length;t<n;t++)if(i[t]!==e[t])return!1;return!0}function Dt(i,e){for(let t=0,n=e.length;t<n;t++)i[t]=e[t]}function Bl(i,e){let t=Pf[e];t===void 0&&(t=new Int32Array(e),Pf[e]=t);for(let n=0;n!==e;++n)t[n]=i.allocateTextureUnit();return t}function Hy(i,e){let t=this.cache;t[0]!==e&&(i.uniform1f(this.addr,e),t[0]=e)}function Gy(i,e){let t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y)&&(i.uniform2f(this.addr,e.x,e.y),t[0]=e.x,t[1]=e.y);else{if(Lt(t,e))return;i.uniform2fv(this.addr,e),Dt(t,e)}}function Wy(i,e){let t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z)&&(i.uniform3f(this.addr,e.x,e.y,e.z),t[0]=e.x,t[1]=e.y,t[2]=e.z);else if(e.r!==void 0)(t[0]!==e.r||t[1]!==e.g||t[2]!==e.b)&&(i.uniform3f(this.addr,e.r,e.g,e.b),t[0]=e.r,t[1]=e.g,t[2]=e.b);else{if(Lt(t,e))return;i.uniform3fv(this.addr,e),Dt(t,e)}}function Xy(i,e){let t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z||t[3]!==e.w)&&(i.uniform4f(this.addr,e.x,e.y,e.z,e.w),t[0]=e.x,t[1]=e.y,t[2]=e.z,t[3]=e.w);else{if(Lt(t,e))return;i.uniform4fv(this.addr,e),Dt(t,e)}}function qy(i,e){let t=this.cache,n=e.elements;if(n===void 0){if(Lt(t,e))return;i.uniformMatrix2fv(this.addr,!1,e),Dt(t,e)}else{if(Lt(t,n))return;If.set(n),i.uniformMatrix2fv(this.addr,!1,If),Dt(t,n)}}function Yy(i,e){let t=this.cache,n=e.elements;if(n===void 0){if(Lt(t,e))return;i.uniformMatrix3fv(this.addr,!1,e),Dt(t,e)}else{if(Lt(t,n))return;Cf.set(n),i.uniformMatrix3fv(this.addr,!1,Cf),Dt(t,n)}}function Zy(i,e){let t=this.cache,n=e.elements;if(n===void 0){if(Lt(t,e))return;i.uniformMatrix4fv(this.addr,!1,e),Dt(t,e)}else{if(Lt(t,n))return;Rf.set(n),i.uniformMatrix4fv(this.addr,!1,Rf),Dt(t,n)}}function $y(i,e){let t=this.cache;t[0]!==e&&(i.uniform1i(this.addr,e),t[0]=e)}function Ky(i,e){let t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y)&&(i.uniform2i(this.addr,e.x,e.y),t[0]=e.x,t[1]=e.y);else{if(Lt(t,e))return;i.uniform2iv(this.addr,e),Dt(t,e)}}function Jy(i,e){let t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z)&&(i.uniform3i(this.addr,e.x,e.y,e.z),t[0]=e.x,t[1]=e.y,t[2]=e.z);else{if(Lt(t,e))return;i.uniform3iv(this.addr,e),Dt(t,e)}}function jy(i,e){let t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z||t[3]!==e.w)&&(i.uniform4i(this.addr,e.x,e.y,e.z,e.w),t[0]=e.x,t[1]=e.y,t[2]=e.z,t[3]=e.w);else{if(Lt(t,e))return;i.uniform4iv(this.addr,e),Dt(t,e)}}function Qy(i,e){let t=this.cache;t[0]!==e&&(i.uniform1ui(this.addr,e),t[0]=e)}function ev(i,e){let t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y)&&(i.uniform2ui(this.addr,e.x,e.y),t[0]=e.x,t[1]=e.y);else{if(Lt(t,e))return;i.uniform2uiv(this.addr,e),Dt(t,e)}}function tv(i,e){let t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z)&&(i.uniform3ui(this.addr,e.x,e.y,e.z),t[0]=e.x,t[1]=e.y,t[2]=e.z);else{if(Lt(t,e))return;i.uniform3uiv(this.addr,e),Dt(t,e)}}function nv(i,e){let t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z||t[3]!==e.w)&&(i.uniform4ui(this.addr,e.x,e.y,e.z,e.w),t[0]=e.x,t[1]=e.y,t[2]=e.z,t[3]=e.w);else{if(Lt(t,e))return;i.uniform4uiv(this.addr,e),Dt(t,e)}}function iv(i,e,t){let n=this.cache,s=t.allocateTextureUnit();n[0]!==s&&(i.uniform1i(this.addr,s),n[0]=s);let r;this.type===i.SAMPLER_2D_SHADOW?(Jh.compareFunction=t.isReversedDepthBuffer()?Il:Cl,r=Jh):r=qf,t.setTexture2D(e||r,s)}function sv(i,e,t){let n=this.cache,s=t.allocateTextureUnit();n[0]!==s&&(i.uniform1i(this.addr,s),n[0]=s),t.setTexture3D(e||Zf,s)}function rv(i,e,t){let n=this.cache,s=t.allocateTextureUnit();n[0]!==s&&(i.uniform1i(this.addr,s),n[0]=s),t.setTextureCube(e||$f,s)}function ov(i,e,t){let n=this.cache,s=t.allocateTextureUnit();n[0]!==s&&(i.uniform1i(this.addr,s),n[0]=s),t.setTexture2DArray(e||Yf,s)}function av(i){switch(i){case 5126:return Hy;case 35664:return Gy;case 35665:return Wy;case 35666:return Xy;case 35674:return qy;case 35675:return Yy;case 35676:return Zy;case 5124:case 35670:return $y;case 35667:case 35671:return Ky;case 35668:case 35672:return Jy;case 35669:case 35673:return jy;case 5125:return Qy;case 36294:return ev;case 36295:return tv;case 36296:return nv;case 35678:case 36198:case 36298:case 36306:case 35682:return iv;case 35679:case 36299:case 36307:return sv;case 35680:case 36300:case 36308:case 36293:return rv;case 36289:case 36303:case 36311:case 36292:return ov}}function lv(i,e){i.uniform1fv(this.addr,e)}function cv(i,e){let t=Ys(e,this.size,2);i.uniform2fv(this.addr,t)}function hv(i,e){let t=Ys(e,this.size,3);i.uniform3fv(this.addr,t)}function uv(i,e){let t=Ys(e,this.size,4);i.uniform4fv(this.addr,t)}function dv(i,e){let t=Ys(e,this.size,4);i.uniformMatrix2fv(this.addr,!1,t)}function fv(i,e){let t=Ys(e,this.size,9);i.uniformMatrix3fv(this.addr,!1,t)}function pv(i,e){let t=Ys(e,this.size,16);i.uniformMatrix4fv(this.addr,!1,t)}function mv(i,e){i.uniform1iv(this.addr,e)}function gv(i,e){i.uniform2iv(this.addr,e)}function xv(i,e){i.uniform3iv(this.addr,e)}function yv(i,e){i.uniform4iv(this.addr,e)}function vv(i,e){i.uniform1uiv(this.addr,e)}function _v(i,e){i.uniform2uiv(this.addr,e)}function bv(i,e){i.uniform3uiv(this.addr,e)}function Sv(i,e){i.uniform4uiv(this.addr,e)}function Mv(i,e,t){let n=this.cache,s=e.length,r=Bl(t,s);Lt(n,r)||(i.uniform1iv(this.addr,r),Dt(n,r));let o;this.type===i.SAMPLER_2D_SHADOW?o=Jh:o=qf;for(let a=0;a!==s;++a)t.setTexture2D(e[a]||o,r[a])}function wv(i,e,t){let n=this.cache,s=e.length,r=Bl(t,s);Lt(n,r)||(i.uniform1iv(this.addr,r),Dt(n,r));for(let o=0;o!==s;++o)t.setTexture3D(e[o]||Zf,r[o])}function Ev(i,e,t){let n=this.cache,s=e.length,r=Bl(t,s);Lt(n,r)||(i.uniform1iv(this.addr,r),Dt(n,r));for(let o=0;o!==s;++o)t.setTextureCube(e[o]||$f,r[o])}function Tv(i,e,t){let n=this.cache,s=e.length,r=Bl(t,s);Lt(n,r)||(i.uniform1iv(this.addr,r),Dt(n,r));for(let o=0;o!==s;++o)t.setTexture2DArray(e[o]||Yf,r[o])}function Av(i){switch(i){case 5126:return lv;case 35664:return cv;case 35665:return hv;case 35666:return uv;case 35674:return dv;case 35675:return fv;case 35676:return pv;case 5124:case 35670:return mv;case 35667:case 35671:return gv;case 35668:case 35672:return xv;case 35669:case 35673:return yv;case 5125:return vv;case 36294:return _v;case 36295:return bv;case 36296:return Sv;case 35678:case 36198:case 36298:case 36306:case 35682:return Mv;case 35679:case 36299:case 36307:return wv;case 35680:case 36300:case 36308:case 36293:return Ev;case 36289:case 36303:case 36311:case 36292:return Tv}}var jh=class{constructor(e,t,n){this.id=e,this.addr=n,this.cache=[],this.type=t.type,this.setValue=av(t.type)}},Qh=class{constructor(e,t,n){this.id=e,this.addr=n,this.cache=[],this.type=t.type,this.size=t.size,this.setValue=Av(t.type)}},eu=class{constructor(e){this.id=e,this.seq=[],this.map={}}setValue(e,t,n){let s=this.seq;for(let r=0,o=s.length;r!==o;++r){let a=s[r];a.setValue(e,t[a.id],n)}}},$h=/(\w+)(\])?(\[|\.)?/g;function Lf(i,e){i.seq.push(e),i.map[e.id]=e}function Pv(i,e,t){let n=i.name,s=n.length;for($h.lastIndex=0;;){let r=$h.exec(n),o=$h.lastIndex,a=r[1],l=r[2]==="]",c=r[3];if(l&&(a=a|0),c===void 0||c==="["&&o+2===s){Lf(t,c===void 0?new jh(a,i,e):new Qh(a,i,e));break}else{let d=t.map[a];d===void 0&&(d=new eu(a),Lf(t,d)),t=d}}}var qs=class{constructor(e,t){this.seq=[],this.map={};let n=e.getProgramParameter(t,e.ACTIVE_UNIFORMS);for(let o=0;o<n;++o){let a=e.getActiveUniform(t,o),l=e.getUniformLocation(t,a.name);Pv(a,l,this)}let s=[],r=[];for(let o of this.seq)o.type===e.SAMPLER_2D_SHADOW||o.type===e.SAMPLER_CUBE_SHADOW||o.type===e.SAMPLER_2D_ARRAY_SHADOW?s.push(o):r.push(o);s.length>0&&(this.seq=s.concat(r))}setValue(e,t,n,s){let r=this.map[t];r!==void 0&&r.setValue(e,n,s)}setOptional(e,t,n){let s=t[n];s!==void 0&&this.setValue(e,n,s)}static upload(e,t,n,s){for(let r=0,o=t.length;r!==o;++r){let a=t[r],l=n[a.id];l.needsUpdate!==!1&&a.setValue(e,l.value,s)}}static seqWithValue(e,t){let n=[];for(let s=0,r=e.length;s!==r;++s){let o=e[s];o.id in t&&n.push(o)}return n}};function Df(i,e,t){let n=i.createShader(e);return i.shaderSource(n,t),i.compileShader(n),n}var Rv=37297,Cv=0;function Iv(i,e){let t=i.split(`
`),n=[],s=Math.max(e-6,0),r=Math.min(e+6,t.length);for(let o=s;o<r;o++){let a=o+1;n.push(`${a===e?">":" "} ${a}: ${t[o]}`)}return n.join(`
`)}var Ff=new Ne;function Lv(i){Xe._getMatrix(Ff,Xe.workingColorSpace,i);let e=`mat3( ${Ff.elements.map(t=>t.toFixed(4))} )`;switch(Xe.getTransfer(i)){case mr:return[e,"LinearTransferOETF"];case Qe:return[e,"sRGBTransferOETF"];default:return Pe("WebGLProgram: Unsupported color space: ",i),[e,"LinearTransferOETF"]}}function Uf(i,e,t){let n=i.getShaderParameter(e,i.COMPILE_STATUS),r=(i.getShaderInfoLog(e)||"").trim();if(n&&r==="")return"";let o=/ERROR: 0:(\d+)/.exec(r);if(o){let a=parseInt(o[1]);return t.toUpperCase()+`

`+r+`

`+Iv(i.getShaderSource(e),a)}else return r}function Dv(i,e){let t=Lv(e);return[`vec4 ${i}( vec4 value ) {`,`	return ${t[1]}( vec4( value.rgb * ${t[0]}, value.a ) );`,"}"].join(`
`)}var Fv={[gh]:"Linear",[xh]:"Reinhard",[yh]:"Cineon",[vh]:"ACESFilmic",[bh]:"AgX",[Sh]:"Neutral",[_h]:"Custom"};function Uv(i,e){let t=Fv[e];return t===void 0?(Pe("WebGLProgram: Unsupported toneMapping:",e),"vec3 "+i+"( vec3 color ) { return LinearToneMapping( color ); }"):"vec3 "+i+"( vec3 color ) { return "+t+"ToneMapping( color ); }"}var Dl=new L;function Nv(){Xe.getLuminanceCoefficients(Dl);let i=Dl.x.toFixed(4),e=Dl.y.toFixed(4),t=Dl.z.toFixed(4);return["float luminance( const in vec3 rgb ) {",`	const vec3 weights = vec3( ${i}, ${e}, ${t} );`,"	return dot( weights, rgb );","}"].join(`
`)}function Ov(i){return[i.extensionClipCullDistance?"#extension GL_ANGLE_clip_cull_distance : require":"",i.extensionMultiDraw?"#extension GL_ANGLE_multi_draw : require":""].filter(no).join(`
`)}function Bv(i){let e=[];for(let t in i){let n=i[t];n!==!1&&e.push("#define "+t+" "+n)}return e.join(`
`)}function zv(i,e){let t={},n=i.getProgramParameter(e,i.ACTIVE_ATTRIBUTES);for(let s=0;s<n;s++){let r=i.getActiveAttrib(e,s),o=r.name,a=1;r.type===i.FLOAT_MAT2&&(a=2),r.type===i.FLOAT_MAT3&&(a=3),r.type===i.FLOAT_MAT4&&(a=4),t[o]={type:r.type,location:i.getAttribLocation(e,o),locationSize:a}}return t}function no(i){return i!==""}function Nf(i,e){let t=e.numSpotLightShadows+e.numSpotLightMaps-e.numSpotLightShadowsWithMaps;return i.replace(/NUM_DIR_LIGHTS/g,e.numDirLights).replace(/NUM_SPOT_LIGHTS/g,e.numSpotLights).replace(/NUM_SPOT_LIGHT_MAPS/g,e.numSpotLightMaps).replace(/NUM_SPOT_LIGHT_COORDS/g,t).replace(/NUM_RECT_AREA_LIGHTS/g,e.numRectAreaLights).replace(/NUM_POINT_LIGHTS/g,e.numPointLights).replace(/NUM_HEMI_LIGHTS/g,e.numHemiLights).replace(/NUM_DIR_LIGHT_SHADOWS/g,e.numDirLightShadows).replace(/NUM_SPOT_LIGHT_SHADOWS_WITH_MAPS/g,e.numSpotLightShadowsWithMaps).replace(/NUM_SPOT_LIGHT_SHADOWS/g,e.numSpotLightShadows).replace(/NUM_POINT_LIGHT_SHADOWS/g,e.numPointLightShadows)}function Of(i,e){return i.replace(/NUM_CLIPPING_PLANES/g,e.numClippingPlanes).replace(/UNION_CLIPPING_PLANES/g,e.numClippingPlanes-e.numClipIntersection)}var kv=/^[ \t]*#include +<([\w\d./]+)>/gm;function tu(i){return i.replace(kv,Hv)}var Vv=new Map;function Hv(i,e){let t=He[e];if(t===void 0){let n=Vv.get(e);if(n!==void 0)t=He[n],Pe('WebGLRenderer: Shader chunk "%s" has been deprecated. Use "%s" instead.',e,n);else throw new Error("THREE.WebGLProgram: Can not resolve #include <"+e+">")}return tu(t)}var Gv=/#pragma unroll_loop_start\s+for\s*\(\s*int\s+i\s*=\s*(\d+)\s*;\s*i\s*<\s*(\d+)\s*;\s*i\s*\+\+\s*\)\s*{([\s\S]+?)}\s+#pragma unroll_loop_end/g;function Bf(i){return i.replace(Gv,Wv)}function Wv(i,e,t,n){let s="";for(let r=parseInt(e);r<parseInt(t);r++)s+=n.replace(/\[\s*i\s*\]/g,"[ "+r+" ]").replace(/UNROLLED_LOOP_INDEX/g,r);return s}function zf(i){let e=`precision ${i.precision} float;
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
#define LOW_PRECISION`),e}var Xv={[Wr]:"SHADOWMAP_TYPE_PCF",[Hs]:"SHADOWMAP_TYPE_VSM"};function qv(i){return Xv[i.shadowMapType]||"SHADOWMAP_TYPE_BASIC"}var Yv={[Ui]:"ENVMAP_TYPE_CUBE",[os]:"ENVMAP_TYPE_CUBE",[Xr]:"ENVMAP_TYPE_CUBE_UV"};function Zv(i){return i.envMap===!1?"ENVMAP_TYPE_CUBE":Yv[i.envMapMode]||"ENVMAP_TYPE_CUBE"}var $v={[os]:"ENVMAP_MODE_REFRACTION"};function Kv(i){return i.envMap===!1?"ENVMAP_MODE_REFLECTION":$v[i.envMapMode]||"ENVMAP_MODE_REFLECTION"}var Jv={[mh]:"ENVMAP_BLENDING_MULTIPLY",[ef]:"ENVMAP_BLENDING_MIX",[tf]:"ENVMAP_BLENDING_ADD"};function jv(i){return i.envMap===!1?"ENVMAP_BLENDING_NONE":Jv[i.combine]||"ENVMAP_BLENDING_NONE"}function Qv(i){let e=i.envMapCubeUVHeight;if(e===null)return null;let t=Math.log2(e)-2,n=1/e;return{texelWidth:1/(3*Math.max(Math.pow(2,t),7*16)),texelHeight:n,maxMip:t}}function e_(i,e,t,n){let s=i.getContext(),r=t.defines,o=t.vertexShader,a=t.fragmentShader,l=qv(t),c=Zv(t),h=Kv(t),d=jv(t),u=Qv(t),f=Ov(t),m=Bv(r),x=s.createProgram(),g,p,b=t.glslVersion?"#version "+t.glslVersion+`
`:"";t.isRawShaderMaterial?(g=["#define SHADER_TYPE "+t.shaderType,"#define SHADER_NAME "+t.shaderName,m].filter(no).join(`
`),g.length>0&&(g+=`
`),p=["#define SHADER_TYPE "+t.shaderType,"#define SHADER_NAME "+t.shaderName,m].filter(no).join(`
`),p.length>0&&(p+=`
`)):(g=[zf(t),"#define SHADER_TYPE "+t.shaderType,"#define SHADER_NAME "+t.shaderName,m,t.extensionClipCullDistance?"#define USE_CLIP_DISTANCE":"",t.batching?"#define USE_BATCHING":"",t.batchingColor?"#define USE_BATCHING_COLOR":"",t.instancing?"#define USE_INSTANCING":"",t.instancingColor?"#define USE_INSTANCING_COLOR":"",t.instancingMorph?"#define USE_INSTANCING_MORPH":"",t.useFog&&t.fog?"#define USE_FOG":"",t.useFog&&t.fogExp2?"#define FOG_EXP2":"",t.map?"#define USE_MAP":"",t.envMap?"#define USE_ENVMAP":"",t.envMap?"#define "+h:"",t.lightMap?"#define USE_LIGHTMAP":"",t.aoMap?"#define USE_AOMAP":"",t.bumpMap?"#define USE_BUMPMAP":"",t.normalMap?"#define USE_NORMALMAP":"",t.normalMapObjectSpace?"#define USE_NORMALMAP_OBJECTSPACE":"",t.normalMapTangentSpace?"#define USE_NORMALMAP_TANGENTSPACE":"",t.displacementMap?"#define USE_DISPLACEMENTMAP":"",t.emissiveMap?"#define USE_EMISSIVEMAP":"",t.anisotropy?"#define USE_ANISOTROPY":"",t.anisotropyMap?"#define USE_ANISOTROPYMAP":"",t.clearcoatMap?"#define USE_CLEARCOATMAP":"",t.clearcoatRoughnessMap?"#define USE_CLEARCOAT_ROUGHNESSMAP":"",t.clearcoatNormalMap?"#define USE_CLEARCOAT_NORMALMAP":"",t.iridescenceMap?"#define USE_IRIDESCENCEMAP":"",t.iridescenceThicknessMap?"#define USE_IRIDESCENCE_THICKNESSMAP":"",t.specularMap?"#define USE_SPECULARMAP":"",t.specularColorMap?"#define USE_SPECULAR_COLORMAP":"",t.specularIntensityMap?"#define USE_SPECULAR_INTENSITYMAP":"",t.roughnessMap?"#define USE_ROUGHNESSMAP":"",t.metalnessMap?"#define USE_METALNESSMAP":"",t.alphaMap?"#define USE_ALPHAMAP":"",t.alphaHash?"#define USE_ALPHAHASH":"",t.transmission?"#define USE_TRANSMISSION":"",t.transmissionMap?"#define USE_TRANSMISSIONMAP":"",t.thicknessMap?"#define USE_THICKNESSMAP":"",t.sheenColorMap?"#define USE_SHEEN_COLORMAP":"",t.sheenRoughnessMap?"#define USE_SHEEN_ROUGHNESSMAP":"",t.mapUv?"#define MAP_UV "+t.mapUv:"",t.alphaMapUv?"#define ALPHAMAP_UV "+t.alphaMapUv:"",t.lightMapUv?"#define LIGHTMAP_UV "+t.lightMapUv:"",t.aoMapUv?"#define AOMAP_UV "+t.aoMapUv:"",t.emissiveMapUv?"#define EMISSIVEMAP_UV "+t.emissiveMapUv:"",t.bumpMapUv?"#define BUMPMAP_UV "+t.bumpMapUv:"",t.normalMapUv?"#define NORMALMAP_UV "+t.normalMapUv:"",t.displacementMapUv?"#define DISPLACEMENTMAP_UV "+t.displacementMapUv:"",t.metalnessMapUv?"#define METALNESSMAP_UV "+t.metalnessMapUv:"",t.roughnessMapUv?"#define ROUGHNESSMAP_UV "+t.roughnessMapUv:"",t.anisotropyMapUv?"#define ANISOTROPYMAP_UV "+t.anisotropyMapUv:"",t.clearcoatMapUv?"#define CLEARCOATMAP_UV "+t.clearcoatMapUv:"",t.clearcoatNormalMapUv?"#define CLEARCOAT_NORMALMAP_UV "+t.clearcoatNormalMapUv:"",t.clearcoatRoughnessMapUv?"#define CLEARCOAT_ROUGHNESSMAP_UV "+t.clearcoatRoughnessMapUv:"",t.iridescenceMapUv?"#define IRIDESCENCEMAP_UV "+t.iridescenceMapUv:"",t.iridescenceThicknessMapUv?"#define IRIDESCENCE_THICKNESSMAP_UV "+t.iridescenceThicknessMapUv:"",t.sheenColorMapUv?"#define SHEEN_COLORMAP_UV "+t.sheenColorMapUv:"",t.sheenRoughnessMapUv?"#define SHEEN_ROUGHNESSMAP_UV "+t.sheenRoughnessMapUv:"",t.specularMapUv?"#define SPECULARMAP_UV "+t.specularMapUv:"",t.specularColorMapUv?"#define SPECULAR_COLORMAP_UV "+t.specularColorMapUv:"",t.specularIntensityMapUv?"#define SPECULAR_INTENSITYMAP_UV "+t.specularIntensityMapUv:"",t.transmissionMapUv?"#define TRANSMISSIONMAP_UV "+t.transmissionMapUv:"",t.thicknessMapUv?"#define THICKNESSMAP_UV "+t.thicknessMapUv:"",t.vertexTangents&&t.flatShading===!1?"#define USE_TANGENT":"",t.vertexNormals?"#define HAS_NORMAL":"",t.vertexColors?"#define USE_COLOR":"",t.vertexAlphas?"#define USE_COLOR_ALPHA":"",t.vertexUv1s?"#define USE_UV1":"",t.vertexUv2s?"#define USE_UV2":"",t.vertexUv3s?"#define USE_UV3":"",t.pointsUvs?"#define USE_POINTS_UV":"",t.flatShading?"#define FLAT_SHADED":"",t.skinning?"#define USE_SKINNING":"",t.morphTargets?"#define USE_MORPHTARGETS":"",t.morphNormals&&t.flatShading===!1?"#define USE_MORPHNORMALS":"",t.morphColors?"#define USE_MORPHCOLORS":"",t.morphTargetsCount>0?"#define MORPHTARGETS_TEXTURE_STRIDE "+t.morphTextureStride:"",t.morphTargetsCount>0?"#define MORPHTARGETS_COUNT "+t.morphTargetsCount:"",t.doubleSided?"#define DOUBLE_SIDED":"",t.flipSided?"#define FLIP_SIDED":"",t.shadowMapEnabled?"#define USE_SHADOWMAP":"",t.shadowMapEnabled?"#define "+l:"",t.sizeAttenuation?"#define USE_SIZEATTENUATION":"",t.numLightProbes>0?"#define USE_LIGHT_PROBES":"",t.logarithmicDepthBuffer?"#define USE_LOGARITHMIC_DEPTH_BUFFER":"",t.reversedDepthBuffer?"#define USE_REVERSED_DEPTH_BUFFER":"","uniform mat4 modelMatrix;","uniform mat4 modelViewMatrix;","uniform mat4 projectionMatrix;","uniform mat4 viewMatrix;","uniform mat3 normalMatrix;","uniform vec3 cameraPosition;","uniform bool isOrthographic;","#ifdef USE_INSTANCING","	attribute mat4 instanceMatrix;","#endif","#ifdef USE_INSTANCING_COLOR","	attribute vec3 instanceColor;","#endif","#ifdef USE_INSTANCING_MORPH","	uniform sampler2D morphTexture;","#endif","attribute vec3 position;","attribute vec3 normal;","attribute vec2 uv;","#ifdef USE_UV1","	attribute vec2 uv1;","#endif","#ifdef USE_UV2","	attribute vec2 uv2;","#endif","#ifdef USE_UV3","	attribute vec2 uv3;","#endif","#ifdef USE_TANGENT","	attribute vec4 tangent;","#endif","#if defined( USE_COLOR_ALPHA )","	attribute vec4 color;","#elif defined( USE_COLOR )","	attribute vec3 color;","#endif","#ifdef USE_SKINNING","	attribute vec4 skinIndex;","	attribute vec4 skinWeight;","#endif",`
`].filter(no).join(`
`),p=[zf(t),"#define SHADER_TYPE "+t.shaderType,"#define SHADER_NAME "+t.shaderName,m,t.useFog&&t.fog?"#define USE_FOG":"",t.useFog&&t.fogExp2?"#define FOG_EXP2":"",t.alphaToCoverage?"#define ALPHA_TO_COVERAGE":"",t.map?"#define USE_MAP":"",t.matcap?"#define USE_MATCAP":"",t.envMap?"#define USE_ENVMAP":"",t.envMap?"#define "+c:"",t.envMap?"#define "+h:"",t.envMap?"#define "+d:"",u?"#define CUBEUV_TEXEL_WIDTH "+u.texelWidth:"",u?"#define CUBEUV_TEXEL_HEIGHT "+u.texelHeight:"",u?"#define CUBEUV_MAX_MIP "+u.maxMip+".0":"",t.lightMap?"#define USE_LIGHTMAP":"",t.aoMap?"#define USE_AOMAP":"",t.bumpMap?"#define USE_BUMPMAP":"",t.normalMap?"#define USE_NORMALMAP":"",t.normalMapObjectSpace?"#define USE_NORMALMAP_OBJECTSPACE":"",t.normalMapTangentSpace?"#define USE_NORMALMAP_TANGENTSPACE":"",t.packedNormalMap?"#define USE_PACKED_NORMALMAP":"",t.emissiveMap?"#define USE_EMISSIVEMAP":"",t.anisotropy?"#define USE_ANISOTROPY":"",t.anisotropyMap?"#define USE_ANISOTROPYMAP":"",t.clearcoat?"#define USE_CLEARCOAT":"",t.clearcoatMap?"#define USE_CLEARCOATMAP":"",t.clearcoatRoughnessMap?"#define USE_CLEARCOAT_ROUGHNESSMAP":"",t.clearcoatNormalMap?"#define USE_CLEARCOAT_NORMALMAP":"",t.dispersion?"#define USE_DISPERSION":"",t.iridescence?"#define USE_IRIDESCENCE":"",t.iridescenceMap?"#define USE_IRIDESCENCEMAP":"",t.iridescenceThicknessMap?"#define USE_IRIDESCENCE_THICKNESSMAP":"",t.specularMap?"#define USE_SPECULARMAP":"",t.specularColorMap?"#define USE_SPECULAR_COLORMAP":"",t.specularIntensityMap?"#define USE_SPECULAR_INTENSITYMAP":"",t.roughnessMap?"#define USE_ROUGHNESSMAP":"",t.metalnessMap?"#define USE_METALNESSMAP":"",t.alphaMap?"#define USE_ALPHAMAP":"",t.alphaTest?"#define USE_ALPHATEST":"",t.alphaHash?"#define USE_ALPHAHASH":"",t.sheen?"#define USE_SHEEN":"",t.sheenColorMap?"#define USE_SHEEN_COLORMAP":"",t.sheenRoughnessMap?"#define USE_SHEEN_ROUGHNESSMAP":"",t.transmission?"#define USE_TRANSMISSION":"",t.transmissionMap?"#define USE_TRANSMISSIONMAP":"",t.thicknessMap?"#define USE_THICKNESSMAP":"",t.vertexTangents&&t.flatShading===!1?"#define USE_TANGENT":"",t.vertexColors||t.instancingColor?"#define USE_COLOR":"",t.vertexAlphas||t.batchingColor?"#define USE_COLOR_ALPHA":"",t.vertexUv1s?"#define USE_UV1":"",t.vertexUv2s?"#define USE_UV2":"",t.vertexUv3s?"#define USE_UV3":"",t.pointsUvs?"#define USE_POINTS_UV":"",t.gradientMap?"#define USE_GRADIENTMAP":"",t.flatShading?"#define FLAT_SHADED":"",t.doubleSided?"#define DOUBLE_SIDED":"",t.flipSided?"#define FLIP_SIDED":"",t.shadowMapEnabled?"#define USE_SHADOWMAP":"",t.shadowMapEnabled?"#define "+l:"",t.premultipliedAlpha?"#define PREMULTIPLIED_ALPHA":"",t.numLightProbes>0?"#define USE_LIGHT_PROBES":"",t.numLightProbeGrids>0?"#define USE_LIGHT_PROBES_GRID":"",t.decodeVideoTexture?"#define DECODE_VIDEO_TEXTURE":"",t.decodeVideoTextureEmissive?"#define DECODE_VIDEO_TEXTURE_EMISSIVE":"",t.logarithmicDepthBuffer?"#define USE_LOGARITHMIC_DEPTH_BUFFER":"",t.reversedDepthBuffer?"#define USE_REVERSED_DEPTH_BUFFER":"","uniform mat4 viewMatrix;","uniform vec3 cameraPosition;","uniform bool isOrthographic;",t.toneMapping!==Dn?"#define TONE_MAPPING":"",t.toneMapping!==Dn?He.tonemapping_pars_fragment:"",t.toneMapping!==Dn?Uv("toneMapping",t.toneMapping):"",t.dithering?"#define DITHERING":"",t.opaque?"#define OPAQUE":"",He.colorspace_pars_fragment,Dv("linearToOutputTexel",t.outputColorSpace),Nv(),t.useDepthPacking?"#define DEPTH_PACKING "+t.depthPacking:"",`
`].filter(no).join(`
`)),o=tu(o),o=Nf(o,t),o=Of(o,t),a=tu(a),a=Nf(a,t),a=Of(a,t),o=Bf(o),a=Bf(a),t.isRawShaderMaterial!==!0&&(b=`#version 300 es
`,g=[f,"#define attribute in","#define varying out","#define texture2D texture"].join(`
`)+`
`+g,p=["#define varying in",t.glslVersion===Lh?"":"layout(location = 0) out highp vec4 pc_fragColor;",t.glslVersion===Lh?"":"#define gl_FragColor pc_fragColor","#define gl_FragDepthEXT gl_FragDepth","#define texture2D texture","#define textureCube texture","#define texture2DProj textureProj","#define texture2DLodEXT textureLod","#define texture2DProjLodEXT textureProjLod","#define textureCubeLodEXT textureLod","#define texture2DGradEXT textureGrad","#define texture2DProjGradEXT textureProjGrad","#define textureCubeGradEXT textureGrad"].join(`
`)+`
`+p);let S=b+g+o,_=b+p+a,A=Df(s,s.VERTEX_SHADER,S),w=Df(s,s.FRAGMENT_SHADER,_);s.attachShader(x,A),s.attachShader(x,w),t.index0AttributeName!==void 0?s.bindAttribLocation(x,0,t.index0AttributeName):t.hasPositionAttribute===!0&&s.bindAttribLocation(x,0,"position"),s.linkProgram(x);function E(R){if(i.debug.checkShaderErrors){let D=s.getProgramInfoLog(x)||"",I=s.getShaderInfoLog(A)||"",k=s.getShaderInfoLog(w)||"",F=D.trim(),q=I.trim(),B=k.trim(),$=!0,j=!0;if(s.getProgramParameter(x,s.LINK_STATUS)===!1)if($=!1,typeof i.debug.onShaderError=="function")i.debug.onShaderError(s,x,A,w);else{let se=Uf(s,A,"vertex"),fe=Uf(s,w,"fragment");Le("WebGLProgram: Shader Error "+s.getError()+" - VALIDATE_STATUS "+s.getProgramParameter(x,s.VALIDATE_STATUS)+`

Material Name: `+R.name+`
Material Type: `+R.type+`

Program Info Log: `+F+`
`+se+`
`+fe)}else F!==""?Pe("WebGLProgram: Program Info Log:",F):(q===""||B==="")&&(j=!1);j&&(R.diagnostics={runnable:$,programLog:F,vertexShader:{log:q,prefix:g},fragmentShader:{log:B,prefix:p}})}s.deleteShader(A),s.deleteShader(w),y=new qs(s,x),T=zv(s,x)}let y;this.getUniforms=function(){return y===void 0&&E(this),y};let T;this.getAttributes=function(){return T===void 0&&E(this),T};let C=t.rendererExtensionParallelShaderCompile===!1;return this.isReady=function(){return C===!1&&(C=s.getProgramParameter(x,Rv)),C},this.destroy=function(){n.releaseStatesOfProgram(this),s.deleteProgram(x),this.program=void 0},this.type=t.shaderType,this.name=t.shaderName,this.id=Cv++,this.cacheKey=e,this.usedTimes=1,this.program=x,this.vertexShader=A,this.fragmentShader=w,this}var t_=0,nu=class{constructor(){this.shaderCache=new Map,this.materialCache=new Map}update(e,t,n){let s=this._getShaderCacheForMaterial(e);return s.has(t)===!1&&(s.add(t),t.usedTimes++),s.has(n)===!1&&(s.add(n),n.usedTimes++),this}remove(e){let t=this.materialCache.get(e);for(let n of t)n.usedTimes--,n.usedTimes===0&&this.shaderCache.delete(n.code);return this.materialCache.delete(e),this}getVertexShaderStage(e){return this._getShaderStage(e.vertexShader)}getFragmentShaderStage(e){return this._getShaderStage(e.fragmentShader)}dispose(){this.shaderCache.clear(),this.materialCache.clear()}_getShaderCacheForMaterial(e){let t=this.materialCache,n=t.get(e);return n===void 0&&(n=new Set,t.set(e,n)),n}_getShaderStage(e){let t=this.shaderCache,n=t.get(e);return n===void 0&&(n=new iu(e),t.set(e,n)),n}},iu=class{constructor(e){this.id=t_++,this.code=e,this.usedTimes=0}};function n_(i){return i===Bi||i===Jr||i===jr}function i_(i,e,t,n,s,r){let o=new _r,a=new nu,l=new Set,c=[],h=new Map,d=n.logarithmicDepthBuffer,u=n.precision,f={MeshDepthMaterial:"depth",MeshDistanceMaterial:"distance",MeshNormalMaterial:"normal",MeshBasicMaterial:"basic",MeshLambertMaterial:"lambert",MeshPhongMaterial:"phong",MeshToonMaterial:"toon",MeshStandardMaterial:"physical",MeshPhysicalMaterial:"physical",MeshMatcapMaterial:"matcap",LineBasicMaterial:"basic",LineDashedMaterial:"dashed",PointsMaterial:"points",ShadowMaterial:"shadow",SpriteMaterial:"sprite"};function m(y){return l.add(y),y===0?"uv":`uv${y}`}function x(y,T,C,R,D,I){let k=R.fog,F=D.geometry,q=y.isMeshStandardMaterial||y.isMeshLambertMaterial||y.isMeshPhongMaterial?R.environment:null,B=y.isMeshStandardMaterial||y.isMeshLambertMaterial&&!y.envMap||y.isMeshPhongMaterial&&!y.envMap,$=e.get(y.envMap||q,B),j=$&&$.mapping===Xr?$.image.height:null,se=f[y.type];y.precision!==null&&(u=n.getMaxPrecision(y.precision),u!==y.precision&&Pe("WebGLProgram.getParameters:",y.precision,"not supported, using",u,"instead."));let fe=F.morphAttributes.position||F.morphAttributes.normal||F.morphAttributes.color,_e=fe!==void 0?fe.length:0,Ke=0;F.morphAttributes.position!==void 0&&(Ke=1),F.morphAttributes.normal!==void 0&&(Ke=2),F.morphAttributes.color!==void 0&&(Ke=3);let pt,Je,Q,ae;if(se){let be=Qt[se];pt=be.vertexShader,Je=be.fragmentShader}else{pt=y.vertexShader,Je=y.fragmentShader;let be=a.getVertexShaderStage(y),gt=a.getFragmentShaderStage(y);a.update(y,be,gt),Q=be.id,ae=gt.id}let ne=i.getRenderTarget(),Fe=i.state.buffers.depth.getReversed(),ze=D.isInstancedMesh===!0,Ce=D.isBatchedMesh===!0,_t=!!y.map,We=!!y.matcap,ot=!!$,je=!!y.aoMap,Ye=!!y.lightMap,wt=!!y.bumpMap&&y.wireframe===!1,Pt=!!y.normalMap,Ut=!!y.displacementMap,Bt=!!y.emissiveMap,mt=!!y.metalnessMap,Et=!!y.roughnessMap,N=y.anisotropy>0,en=y.clearcoat>0,et=y.dispersion>0,P=y.iridescence>0,v=y.sheen>0,z=y.transmission>0,W=N&&!!y.anisotropyMap,Y=en&&!!y.clearcoatMap,ie=en&&!!y.clearcoatNormalMap,le=en&&!!y.clearcoatRoughnessMap,Z=P&&!!y.iridescenceMap,J=P&&!!y.iridescenceThicknessMap,ce=v&&!!y.sheenColorMap,we=v&&!!y.sheenRoughnessMap,de=!!y.specularMap,he=!!y.specularColorMap,Ae=!!y.specularIntensityMap,Ie=z&&!!y.transmissionMap,ke=z&&!!y.thicknessMap,U=!!y.gradientMap,oe=!!y.alphaMap,K=y.alphaTest>0,ue=!!y.alphaHash,ge=!!y.extensions,ee=Dn;y.toneMapped&&(ne===null||ne.isXRRenderTarget===!0)&&(ee=i.toneMapping);let Me={shaderID:se,shaderType:y.type,shaderName:y.name,vertexShader:pt,fragmentShader:Je,defines:y.defines,customVertexShaderID:Q,customFragmentShaderID:ae,isRawShaderMaterial:y.isRawShaderMaterial===!0,glslVersion:y.glslVersion,precision:u,batching:Ce,batchingColor:Ce&&D._colorsTexture!==null,instancing:ze,instancingColor:ze&&D.instanceColor!==null,instancingMorph:ze&&D.morphTexture!==null,outputColorSpace:ne===null?i.outputColorSpace:ne.isXRRenderTarget===!0?ne.texture.colorSpace:Xe.workingColorSpace,alphaToCoverage:!!y.alphaToCoverage,map:_t,matcap:We,envMap:ot,envMapMode:ot&&$.mapping,envMapCubeUVHeight:j,aoMap:je,lightMap:Ye,bumpMap:wt,normalMap:Pt,displacementMap:Ut,emissiveMap:Bt,normalMapObjectSpace:Pt&&y.normalMapType===rf,normalMapTangentSpace:Pt&&y.normalMapType===Ih,packedNormalMap:Pt&&y.normalMapType===Ih&&n_(y.normalMap.format),metalnessMap:mt,roughnessMap:Et,anisotropy:N,anisotropyMap:W,clearcoat:en,clearcoatMap:Y,clearcoatNormalMap:ie,clearcoatRoughnessMap:le,dispersion:et,iridescence:P,iridescenceMap:Z,iridescenceThicknessMap:J,sheen:v,sheenColorMap:ce,sheenRoughnessMap:we,specularMap:de,specularColorMap:he,specularIntensityMap:Ae,transmission:z,transmissionMap:Ie,thicknessMap:ke,gradientMap:U,opaque:y.transparent===!1&&y.blending===Qi&&y.alphaToCoverage===!1,alphaMap:oe,alphaTest:K,alphaHash:ue,combine:y.combine,mapUv:_t&&m(y.map.channel),aoMapUv:je&&m(y.aoMap.channel),lightMapUv:Ye&&m(y.lightMap.channel),bumpMapUv:wt&&m(y.bumpMap.channel),normalMapUv:Pt&&m(y.normalMap.channel),displacementMapUv:Ut&&m(y.displacementMap.channel),emissiveMapUv:Bt&&m(y.emissiveMap.channel),metalnessMapUv:mt&&m(y.metalnessMap.channel),roughnessMapUv:Et&&m(y.roughnessMap.channel),anisotropyMapUv:W&&m(y.anisotropyMap.channel),clearcoatMapUv:Y&&m(y.clearcoatMap.channel),clearcoatNormalMapUv:ie&&m(y.clearcoatNormalMap.channel),clearcoatRoughnessMapUv:le&&m(y.clearcoatRoughnessMap.channel),iridescenceMapUv:Z&&m(y.iridescenceMap.channel),iridescenceThicknessMapUv:J&&m(y.iridescenceThicknessMap.channel),sheenColorMapUv:ce&&m(y.sheenColorMap.channel),sheenRoughnessMapUv:we&&m(y.sheenRoughnessMap.channel),specularMapUv:de&&m(y.specularMap.channel),specularColorMapUv:he&&m(y.specularColorMap.channel),specularIntensityMapUv:Ae&&m(y.specularIntensityMap.channel),transmissionMapUv:Ie&&m(y.transmissionMap.channel),thicknessMapUv:ke&&m(y.thicknessMap.channel),alphaMapUv:oe&&m(y.alphaMap.channel),vertexTangents:!!F.attributes.tangent&&(Pt||N),vertexNormals:!!F.attributes.normal,vertexColors:y.vertexColors,vertexAlphas:y.vertexColors===!0&&!!F.attributes.color&&F.attributes.color.itemSize===4,pointsUvs:D.isPoints===!0&&!!F.attributes.uv&&(_t||oe),fog:!!k,useFog:y.fog===!0,fogExp2:!!k&&k.isFogExp2,flatShading:y.wireframe===!1&&(y.flatShading===!0||F.attributes.normal===void 0&&Pt===!1&&(y.isMeshLambertMaterial||y.isMeshPhongMaterial||y.isMeshStandardMaterial||y.isMeshPhysicalMaterial)),sizeAttenuation:y.sizeAttenuation===!0,logarithmicDepthBuffer:d,reversedDepthBuffer:Fe,skinning:D.isSkinnedMesh===!0,hasPositionAttribute:F.attributes.position!==void 0,morphTargets:F.morphAttributes.position!==void 0,morphNormals:F.morphAttributes.normal!==void 0,morphColors:F.morphAttributes.color!==void 0,morphTargetsCount:_e,morphTextureStride:Ke,numDirLights:T.directional.length,numPointLights:T.point.length,numSpotLights:T.spot.length,numSpotLightMaps:T.spotLightMap.length,numRectAreaLights:T.rectArea.length,numHemiLights:T.hemi.length,numDirLightShadows:T.directionalShadowMap.length,numPointLightShadows:T.pointShadowMap.length,numSpotLightShadows:T.spotShadowMap.length,numSpotLightShadowsWithMaps:T.numSpotLightShadowsWithMaps,numLightProbes:T.numLightProbes,numLightProbeGrids:I.length,numClippingPlanes:r.numPlanes,numClipIntersection:r.numIntersection,dithering:y.dithering,shadowMapEnabled:i.shadowMap.enabled&&C.length>0,shadowMapType:i.shadowMap.type,toneMapping:ee,decodeVideoTexture:_t&&y.map.isVideoTexture===!0&&Xe.getTransfer(y.map.colorSpace)===Qe,decodeVideoTextureEmissive:Bt&&y.emissiveMap.isVideoTexture===!0&&Xe.getTransfer(y.emissiveMap.colorSpace)===Qe,premultipliedAlpha:y.premultipliedAlpha,doubleSided:y.side===rn,flipSided:y.side===jt,useDepthPacking:y.depthPacking>=0,depthPacking:y.depthPacking||0,index0AttributeName:y.index0AttributeName,extensionClipCullDistance:ge&&y.extensions.clipCullDistance===!0&&t.has("WEBGL_clip_cull_distance"),extensionMultiDraw:(ge&&y.extensions.multiDraw===!0||Ce)&&t.has("WEBGL_multi_draw"),rendererExtensionParallelShaderCompile:t.has("KHR_parallel_shader_compile"),customProgramCacheKey:y.customProgramCacheKey()};return Me.vertexUv1s=l.has(1),Me.vertexUv2s=l.has(2),Me.vertexUv3s=l.has(3),l.clear(),Me}function g(y){let T=[];if(y.shaderID?T.push(y.shaderID):(T.push(y.customVertexShaderID),T.push(y.customFragmentShaderID)),y.defines!==void 0)for(let C in y.defines)T.push(C),T.push(y.defines[C]);return y.isRawShaderMaterial===!1&&(p(T,y),b(T,y),T.push(i.outputColorSpace)),T.push(y.customProgramCacheKey),T.join()}function p(y,T){y.push(T.precision),y.push(T.outputColorSpace),y.push(T.envMapMode),y.push(T.envMapCubeUVHeight),y.push(T.mapUv),y.push(T.alphaMapUv),y.push(T.lightMapUv),y.push(T.aoMapUv),y.push(T.bumpMapUv),y.push(T.normalMapUv),y.push(T.displacementMapUv),y.push(T.emissiveMapUv),y.push(T.metalnessMapUv),y.push(T.roughnessMapUv),y.push(T.anisotropyMapUv),y.push(T.clearcoatMapUv),y.push(T.clearcoatNormalMapUv),y.push(T.clearcoatRoughnessMapUv),y.push(T.iridescenceMapUv),y.push(T.iridescenceThicknessMapUv),y.push(T.sheenColorMapUv),y.push(T.sheenRoughnessMapUv),y.push(T.specularMapUv),y.push(T.specularColorMapUv),y.push(T.specularIntensityMapUv),y.push(T.transmissionMapUv),y.push(T.thicknessMapUv),y.push(T.combine),y.push(T.fogExp2),y.push(T.sizeAttenuation),y.push(T.morphTargetsCount),y.push(T.morphAttributeCount),y.push(T.numDirLights),y.push(T.numPointLights),y.push(T.numSpotLights),y.push(T.numSpotLightMaps),y.push(T.numHemiLights),y.push(T.numRectAreaLights),y.push(T.numDirLightShadows),y.push(T.numPointLightShadows),y.push(T.numSpotLightShadows),y.push(T.numSpotLightShadowsWithMaps),y.push(T.numLightProbes),y.push(T.shadowMapType),y.push(T.toneMapping),y.push(T.numClippingPlanes),y.push(T.numClipIntersection),y.push(T.depthPacking)}function b(y,T){o.disableAll(),T.instancing&&o.enable(0),T.instancingColor&&o.enable(1),T.instancingMorph&&o.enable(2),T.matcap&&o.enable(3),T.envMap&&o.enable(4),T.normalMapObjectSpace&&o.enable(5),T.normalMapTangentSpace&&o.enable(6),T.clearcoat&&o.enable(7),T.iridescence&&o.enable(8),T.alphaTest&&o.enable(9),T.vertexColors&&o.enable(10),T.vertexAlphas&&o.enable(11),T.vertexUv1s&&o.enable(12),T.vertexUv2s&&o.enable(13),T.vertexUv3s&&o.enable(14),T.vertexTangents&&o.enable(15),T.anisotropy&&o.enable(16),T.alphaHash&&o.enable(17),T.batching&&o.enable(18),T.dispersion&&o.enable(19),T.batchingColor&&o.enable(20),T.gradientMap&&o.enable(21),T.packedNormalMap&&o.enable(22),T.vertexNormals&&o.enable(23),y.push(o.mask),o.disableAll(),T.fog&&o.enable(0),T.useFog&&o.enable(1),T.flatShading&&o.enable(2),T.logarithmicDepthBuffer&&o.enable(3),T.reversedDepthBuffer&&o.enable(4),T.skinning&&o.enable(5),T.morphTargets&&o.enable(6),T.morphNormals&&o.enable(7),T.morphColors&&o.enable(8),T.premultipliedAlpha&&o.enable(9),T.shadowMapEnabled&&o.enable(10),T.doubleSided&&o.enable(11),T.flipSided&&o.enable(12),T.useDepthPacking&&o.enable(13),T.dithering&&o.enable(14),T.transmission&&o.enable(15),T.sheen&&o.enable(16),T.opaque&&o.enable(17),T.pointsUvs&&o.enable(18),T.decodeVideoTexture&&o.enable(19),T.decodeVideoTextureEmissive&&o.enable(20),T.alphaToCoverage&&o.enable(21),T.numLightProbeGrids>0&&o.enable(22),T.hasPositionAttribute&&o.enable(23),y.push(o.mask)}function S(y){let T=f[y.type],C;if(T){let R=Qt[T];C=Qr.clone(R.uniforms)}else C=y.uniforms;return C}function _(y,T){let C=h.get(T);return C!==void 0?++C.usedTimes:(C=new e_(i,T,y,s),c.push(C),h.set(T,C)),C}function A(y){if(--y.usedTimes===0){let T=c.indexOf(y);c[T]=c[c.length-1],c.pop(),h.delete(y.cacheKey),y.destroy()}}function w(y){a.remove(y)}function E(){a.dispose()}return{getParameters:x,getProgramCacheKey:g,getUniforms:S,acquireProgram:_,releaseProgram:A,releaseShaderCache:w,programs:c,dispose:E}}function s_(){let i=new WeakMap;function e(o){return i.has(o)}function t(o){let a=i.get(o);return a===void 0&&(a={},i.set(o,a)),a}function n(o){i.delete(o)}function s(o,a,l){i.get(o)[a]=l}function r(){i=new WeakMap}return{has:e,get:t,remove:n,update:s,dispose:r}}function r_(i,e){return i.groupOrder!==e.groupOrder?i.groupOrder-e.groupOrder:i.renderOrder!==e.renderOrder?i.renderOrder-e.renderOrder:i.material.id!==e.material.id?i.material.id-e.material.id:i.materialVariant!==e.materialVariant?i.materialVariant-e.materialVariant:i.z!==e.z?i.z-e.z:i.id-e.id}function kf(i,e){return i.groupOrder!==e.groupOrder?i.groupOrder-e.groupOrder:i.renderOrder!==e.renderOrder?i.renderOrder-e.renderOrder:i.z!==e.z?e.z-i.z:i.id-e.id}function Vf(){let i=[],e=0,t=[],n=[],s=[];function r(){e=0,t.length=0,n.length=0,s.length=0}function o(u){let f=0;return u.isInstancedMesh&&(f+=2),u.isSkinnedMesh&&(f+=1),f}function a(u,f,m,x,g,p){let b=i[e];return b===void 0?(b={id:u.id,object:u,geometry:f,material:m,materialVariant:o(u),groupOrder:x,renderOrder:u.renderOrder,z:g,group:p},i[e]=b):(b.id=u.id,b.object=u,b.geometry=f,b.material=m,b.materialVariant=o(u),b.groupOrder=x,b.renderOrder=u.renderOrder,b.z=g,b.group=p),e++,b}function l(u,f,m,x,g,p){let b=a(u,f,m,x,g,p);m.transmission>0?n.push(b):m.transparent===!0?s.push(b):t.push(b)}function c(u,f,m,x,g,p){let b=a(u,f,m,x,g,p);m.transmission>0?n.unshift(b):m.transparent===!0?s.unshift(b):t.unshift(b)}function h(u,f,m){t.length>1&&t.sort(u||r_),n.length>1&&n.sort(f||kf),s.length>1&&s.sort(f||kf),m&&(t.reverse(),n.reverse(),s.reverse())}function d(){for(let u=e,f=i.length;u<f;u++){let m=i[u];if(m.id===null)break;m.id=null,m.object=null,m.geometry=null,m.material=null,m.group=null}}return{opaque:t,transmissive:n,transparent:s,init:r,push:l,unshift:c,finish:d,sort:h}}function o_(){let i=new WeakMap;function e(n,s){let r=i.get(n),o;return r===void 0?(o=new Vf,i.set(n,[o])):s>=r.length?(o=new Vf,r.push(o)):o=r[s],o}function t(){i=new WeakMap}return{get:e,dispose:t}}function a_(){let i={};return{get:function(e){if(i[e.id]!==void 0)return i[e.id];let t;switch(e.type){case"DirectionalLight":t={direction:new L,color:new qe};break;case"SpotLight":t={position:new L,direction:new L,color:new qe,distance:0,coneCos:0,penumbraCos:0,decay:0};break;case"PointLight":t={position:new L,color:new qe,distance:0,decay:0};break;case"HemisphereLight":t={direction:new L,skyColor:new qe,groundColor:new qe};break;case"RectAreaLight":t={color:new qe,position:new L,halfWidth:new L,halfHeight:new L};break}return i[e.id]=t,t}}}function l_(){let i={};return{get:function(e){if(i[e.id]!==void 0)return i[e.id];let t;switch(e.type){case"DirectionalLight":t={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new xe};break;case"SpotLight":t={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new xe};break;case"PointLight":t={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new xe,shadowCameraNear:1,shadowCameraFar:1e3};break}return i[e.id]=t,t}}}var c_=0;function h_(i,e){return(e.castShadow?2:0)-(i.castShadow?2:0)+(e.map?1:0)-(i.map?1:0)}function u_(i){let e=new a_,t=l_(),n={version:0,hash:{directionalLength:-1,pointLength:-1,spotLength:-1,rectAreaLength:-1,hemiLength:-1,numDirectionalShadows:-1,numPointShadows:-1,numSpotShadows:-1,numSpotMaps:-1,numLightProbes:-1},ambient:[0,0,0],probe:[],directional:[],directionalShadow:[],directionalShadowMap:[],directionalShadowMatrix:[],spot:[],spotLightMap:[],spotShadow:[],spotShadowMap:[],spotLightMatrix:[],rectArea:[],rectAreaLTC1:null,rectAreaLTC2:null,point:[],pointShadow:[],pointShadowMap:[],pointShadowMatrix:[],hemi:[],numSpotLightShadowsWithMaps:0,numLightProbes:0};for(let c=0;c<9;c++)n.probe.push(new L);let s=new L,r=new rt,o=new rt;function a(c){let h=0,d=0,u=0;for(let T=0;T<9;T++)n.probe[T].set(0,0,0);let f=0,m=0,x=0,g=0,p=0,b=0,S=0,_=0,A=0,w=0,E=0;c.sort(h_);for(let T=0,C=c.length;T<C;T++){let R=c[T],D=R.color,I=R.intensity,k=R.distance,F=null;if(R.shadow&&R.shadow.map&&(R.shadow.map.texture.format===Bi?F=R.shadow.map.texture:F=R.shadow.map.depthTexture||R.shadow.map.texture),R.isAmbientLight)h+=D.r*I,d+=D.g*I,u+=D.b*I;else if(R.isLightProbe){for(let q=0;q<9;q++)n.probe[q].addScaledVector(R.sh.coefficients[q],I);E++}else if(R.isDirectionalLight){let q=e.get(R);if(q.color.copy(R.color).multiplyScalar(R.intensity),R.castShadow){let B=R.shadow,$=t.get(R);$.shadowIntensity=B.intensity,$.shadowBias=B.bias,$.shadowNormalBias=B.normalBias,$.shadowRadius=B.radius,$.shadowMapSize=B.mapSize,n.directionalShadow[f]=$,n.directionalShadowMap[f]=F,n.directionalShadowMatrix[f]=R.shadow.matrix,b++}n.directional[f]=q,f++}else if(R.isSpotLight){let q=e.get(R);q.position.setFromMatrixPosition(R.matrixWorld),q.color.copy(D).multiplyScalar(I),q.distance=k,q.coneCos=Math.cos(R.angle),q.penumbraCos=Math.cos(R.angle*(1-R.penumbra)),q.decay=R.decay,n.spot[x]=q;let B=R.shadow;if(R.map&&(n.spotLightMap[A]=R.map,A++,B.updateMatrices(R),R.castShadow&&w++),n.spotLightMatrix[x]=B.matrix,R.castShadow){let $=t.get(R);$.shadowIntensity=B.intensity,$.shadowBias=B.bias,$.shadowNormalBias=B.normalBias,$.shadowRadius=B.radius,$.shadowMapSize=B.mapSize,n.spotShadow[x]=$,n.spotShadowMap[x]=F,_++}x++}else if(R.isRectAreaLight){let q=e.get(R);q.color.copy(D).multiplyScalar(I),q.halfWidth.set(R.width*.5,0,0),q.halfHeight.set(0,R.height*.5,0),n.rectArea[g]=q,g++}else if(R.isPointLight){let q=e.get(R);if(q.color.copy(R.color).multiplyScalar(R.intensity),q.distance=R.distance,q.decay=R.decay,R.castShadow){let B=R.shadow,$=t.get(R);$.shadowIntensity=B.intensity,$.shadowBias=B.bias,$.shadowNormalBias=B.normalBias,$.shadowRadius=B.radius,$.shadowMapSize=B.mapSize,$.shadowCameraNear=B.camera.near,$.shadowCameraFar=B.camera.far,n.pointShadow[m]=$,n.pointShadowMap[m]=F,n.pointShadowMatrix[m]=R.shadow.matrix,S++}n.point[m]=q,m++}else if(R.isHemisphereLight){let q=e.get(R);q.skyColor.copy(R.color).multiplyScalar(I),q.groundColor.copy(R.groundColor).multiplyScalar(I),n.hemi[p]=q,p++}}g>0&&(i.has("OES_texture_float_linear")===!0?(n.rectAreaLTC1=re.LTC_FLOAT_1,n.rectAreaLTC2=re.LTC_FLOAT_2):(n.rectAreaLTC1=re.LTC_HALF_1,n.rectAreaLTC2=re.LTC_HALF_2)),n.ambient[0]=h,n.ambient[1]=d,n.ambient[2]=u;let y=n.hash;(y.directionalLength!==f||y.pointLength!==m||y.spotLength!==x||y.rectAreaLength!==g||y.hemiLength!==p||y.numDirectionalShadows!==b||y.numPointShadows!==S||y.numSpotShadows!==_||y.numSpotMaps!==A||y.numLightProbes!==E)&&(n.directional.length=f,n.spot.length=x,n.rectArea.length=g,n.point.length=m,n.hemi.length=p,n.directionalShadow.length=b,n.directionalShadowMap.length=b,n.pointShadow.length=S,n.pointShadowMap.length=S,n.spotShadow.length=_,n.spotShadowMap.length=_,n.directionalShadowMatrix.length=b,n.pointShadowMatrix.length=S,n.spotLightMatrix.length=_+A-w,n.spotLightMap.length=A,n.numSpotLightShadowsWithMaps=w,n.numLightProbes=E,y.directionalLength=f,y.pointLength=m,y.spotLength=x,y.rectAreaLength=g,y.hemiLength=p,y.numDirectionalShadows=b,y.numPointShadows=S,y.numSpotShadows=_,y.numSpotMaps=A,y.numLightProbes=E,n.version=c_++)}function l(c,h){let d=0,u=0,f=0,m=0,x=0,g=h.matrixWorldInverse;for(let p=0,b=c.length;p<b;p++){let S=c[p];if(S.isDirectionalLight){let _=n.directional[d];_.direction.setFromMatrixPosition(S.matrixWorld),s.setFromMatrixPosition(S.target.matrixWorld),_.direction.sub(s),_.direction.transformDirection(g),d++}else if(S.isSpotLight){let _=n.spot[f];_.position.setFromMatrixPosition(S.matrixWorld),_.position.applyMatrix4(g),_.direction.setFromMatrixPosition(S.matrixWorld),s.setFromMatrixPosition(S.target.matrixWorld),_.direction.sub(s),_.direction.transformDirection(g),f++}else if(S.isRectAreaLight){let _=n.rectArea[m];_.position.setFromMatrixPosition(S.matrixWorld),_.position.applyMatrix4(g),o.identity(),r.copy(S.matrixWorld),r.premultiply(g),o.extractRotation(r),_.halfWidth.set(S.width*.5,0,0),_.halfHeight.set(0,S.height*.5,0),_.halfWidth.applyMatrix4(o),_.halfHeight.applyMatrix4(o),m++}else if(S.isPointLight){let _=n.point[u];_.position.setFromMatrixPosition(S.matrixWorld),_.position.applyMatrix4(g),u++}else if(S.isHemisphereLight){let _=n.hemi[x];_.direction.setFromMatrixPosition(S.matrixWorld),_.direction.transformDirection(g),x++}}}return{setup:a,setupView:l,state:n}}function Hf(i){let e=new u_(i),t=[],n=[],s=[];function r(u){d.camera=u,t.length=0,n.length=0,s.length=0}function o(u){t.push(u)}function a(u){n.push(u)}function l(u){s.push(u)}function c(){e.setup(t)}function h(u){e.setupView(t,u)}let d={lightsArray:t,shadowsArray:n,lightProbeGridArray:s,camera:null,lights:e,transmissionRenderTarget:{},textureUnits:0};return{init:r,state:d,setupLights:c,setupLightsView:h,pushLight:o,pushShadow:a,pushLightProbeGrid:l}}function d_(i){let e=new WeakMap;function t(s,r=0){let o=e.get(s),a;return o===void 0?(a=new Hf(i),e.set(s,[a])):r>=o.length?(a=new Hf(i),o.push(a)):a=o[r],a}function n(){e=new WeakMap}return{get:t,dispose:n}}var f_=`void main() {
	gl_Position = vec4( position, 1.0 );
}`,p_=`uniform sampler2D shadow_pass;
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
}`,m_=[new L(1,0,0),new L(-1,0,0),new L(0,1,0),new L(0,-1,0),new L(0,0,1),new L(0,0,-1)],g_=[new L(0,-1,0),new L(0,-1,0),new L(0,0,1),new L(0,0,-1),new L(0,-1,0),new L(0,-1,0)],Gf=new rt,to=new L,Kh=new L;function x_(i,e,t){let n=new Er,s=new xe,r=new xe,o=new it,a=new Ra,l=new Ca,c={},h=t.maxTextureSize,d={[li]:jt,[jt]:li,[rn]:rn},u=new Jt({defines:{VSM_SAMPLES:8},uniforms:{shadow_pass:{value:null},resolution:{value:new xe},radius:{value:4}},vertexShader:f_,fragmentShader:p_}),f=u.clone();f.defines.HORIZONTAL_PASS=1;let m=new It;m.setAttribute("position",new sn(new Float32Array([-1,-1,.5,3,-1,.5,-1,3,.5]),3));let x=new At(m,u),g=this;this.enabled=!1,this.autoUpdate=!0,this.needsUpdate=!1,this.type=Wr;let p=this.type;this.render=function(w,E,y){if(g.enabled===!1||g.autoUpdate===!1&&g.needsUpdate===!1||w.length===0)return;this.type===Ud&&(Pe("WebGLShadowMap: PCFSoftShadowMap has been deprecated. Using PCFShadowMap instead."),this.type=Wr);let T=i.getRenderTarget(),C=i.getActiveCubeFace(),R=i.getActiveMipmapLevel(),D=i.state;D.setBlending(Zn),D.buffers.depth.getReversed()===!0?D.buffers.color.setClear(0,0,0,0):D.buffers.color.setClear(1,1,1,1),D.buffers.depth.setTest(!0),D.setScissorTest(!1);let I=p!==this.type;I&&E.traverse(function(k){k.material&&(Array.isArray(k.material)?k.material.forEach(F=>F.needsUpdate=!0):k.material.needsUpdate=!0)});for(let k=0,F=w.length;k<F;k++){let q=w[k],B=q.shadow;if(B===void 0){Pe("WebGLShadowMap:",q,"has no shadow.");continue}if(B.autoUpdate===!1&&B.needsUpdate===!1)continue;s.copy(B.mapSize);let $=B.getFrameExtents();s.multiply($),r.copy(B.mapSize),(s.x>h||s.y>h)&&(s.x>h&&(r.x=Math.floor(h/$.x),s.x=r.x*$.x,B.mapSize.x=r.x),s.y>h&&(r.y=Math.floor(h/$.y),s.y=r.y*$.y,B.mapSize.y=r.y));let j=i.state.buffers.depth.getReversed();if(B.camera._reversedDepth=j,B.map===null||I===!0){if(B.map!==null&&(B.map.depthTexture!==null&&(B.map.depthTexture.dispose(),B.map.depthTexture=null),B.map.dispose()),this.type===Hs){if(q.isPointLight){Pe("WebGLShadowMap: VSM shadow maps are not supported for PointLights. Use PCF or BasicShadowMap instead.");continue}B.map=new hn(s.x,s.y,{format:Bi,type:$n,minFilter:zt,magFilter:zt,generateMipmaps:!1}),B.map.texture.name=q.name+".shadowMap",B.map.depthTexture=new ci(s.x,s.y,Un),B.map.depthTexture.name=q.name+".shadowMapDepth",B.map.depthTexture.format=Xn,B.map.depthTexture.compareFunction=null,B.map.depthTexture.minFilter=Ot,B.map.depthTexture.magFilter=Ot}else q.isPointLight?(B.map=new Ul(s.x),B.map.depthTexture=new ba(s.x,Fn)):(B.map=new hn(s.x,s.y),B.map.depthTexture=new ci(s.x,s.y,Fn)),B.map.depthTexture.name=q.name+".shadowMap",B.map.depthTexture.format=Xn,this.type===Wr?(B.map.depthTexture.compareFunction=j?Il:Cl,B.map.depthTexture.minFilter=zt,B.map.depthTexture.magFilter=zt):(B.map.depthTexture.compareFunction=null,B.map.depthTexture.minFilter=Ot,B.map.depthTexture.magFilter=Ot);B.camera.updateProjectionMatrix()}let se=B.map.isWebGLCubeRenderTarget?6:1;for(let fe=0;fe<se;fe++){if(B.map.isWebGLCubeRenderTarget)i.setRenderTarget(B.map,fe),i.clear();else{fe===0&&(i.setRenderTarget(B.map),i.clear());let _e=B.getViewport(fe);o.set(r.x*_e.x,r.y*_e.y,r.x*_e.z,r.y*_e.w),D.viewport(o)}if(q.isPointLight){let _e=B.camera,Ke=B.matrix,pt=q.distance||_e.far;pt!==_e.far&&(_e.far=pt,_e.updateProjectionMatrix()),to.setFromMatrixPosition(q.matrixWorld),_e.position.copy(to),Kh.copy(_e.position),Kh.add(m_[fe]),_e.up.copy(g_[fe]),_e.lookAt(Kh),_e.updateMatrixWorld(),Ke.makeTranslation(-to.x,-to.y,-to.z),Gf.multiplyMatrices(_e.projectionMatrix,_e.matrixWorldInverse),B._frustum.setFromProjectionMatrix(Gf,_e.coordinateSystem,_e.reversedDepth)}else B.updateMatrices(q);n=B.getFrustum(),_(E,y,B.camera,q,this.type)}B.isPointLightShadow!==!0&&this.type===Hs&&b(B,y),B.needsUpdate=!1}p=this.type,g.needsUpdate=!1,i.setRenderTarget(T,C,R)};function b(w,E){let y=e.update(x);u.defines.VSM_SAMPLES!==w.blurSamples&&(u.defines.VSM_SAMPLES=w.blurSamples,f.defines.VSM_SAMPLES=w.blurSamples,u.needsUpdate=!0,f.needsUpdate=!0),w.mapPass===null&&(w.mapPass=new hn(s.x,s.y,{format:Bi,type:$n})),u.uniforms.shadow_pass.value=w.map.depthTexture,u.uniforms.resolution.value=w.mapSize,u.uniforms.radius.value=w.radius,i.setRenderTarget(w.mapPass),i.clear(),i.renderBufferDirect(E,null,y,u,x,null),f.uniforms.shadow_pass.value=w.mapPass.texture,f.uniforms.resolution.value=w.mapSize,f.uniforms.radius.value=w.radius,i.setRenderTarget(w.map),i.clear(),i.renderBufferDirect(E,null,y,f,x,null)}function S(w,E,y,T){let C=null,R=y.isPointLight===!0?w.customDistanceMaterial:w.customDepthMaterial;if(R!==void 0)C=R;else if(C=y.isPointLight===!0?l:a,i.localClippingEnabled&&E.clipShadows===!0&&Array.isArray(E.clippingPlanes)&&E.clippingPlanes.length!==0||E.displacementMap&&E.displacementScale!==0||E.alphaMap&&E.alphaTest>0||E.map&&E.alphaTest>0||E.alphaToCoverage===!0){let D=C.uuid,I=E.uuid,k=c[D];k===void 0&&(k={},c[D]=k);let F=k[I];F===void 0&&(F=C.clone(),k[I]=F,E.addEventListener("dispose",A)),C=F}if(C.visible=E.visible,C.wireframe=E.wireframe,T===Hs?C.side=E.shadowSide!==null?E.shadowSide:E.side:C.side=E.shadowSide!==null?E.shadowSide:d[E.side],C.alphaMap=E.alphaMap,C.alphaTest=E.alphaToCoverage===!0?.5:E.alphaTest,C.map=E.map,C.clipShadows=E.clipShadows,C.clippingPlanes=E.clippingPlanes,C.clipIntersection=E.clipIntersection,C.displacementMap=E.displacementMap,C.displacementScale=E.displacementScale,C.displacementBias=E.displacementBias,C.wireframeLinewidth=E.wireframeLinewidth,C.linewidth=E.linewidth,y.isPointLight===!0&&C.isMeshDistanceMaterial===!0){let D=i.properties.get(C);D.light=y}return C}function _(w,E,y,T,C){if(w.visible===!1)return;if(w.layers.test(E.layers)&&(w.isMesh||w.isLine||w.isPoints)&&(w.castShadow||w.receiveShadow&&C===Hs)&&(!w.frustumCulled||n.intersectsObject(w))){w.modelViewMatrix.multiplyMatrices(y.matrixWorldInverse,w.matrixWorld);let I=e.update(w),k=w.material;if(Array.isArray(k)){let F=I.groups;for(let q=0,B=F.length;q<B;q++){let $=F[q],j=k[$.materialIndex];if(j&&j.visible){let se=S(w,j,T,C);w.onBeforeShadow(i,w,E,y,I,se,$),i.renderBufferDirect(y,null,I,se,w,$),w.onAfterShadow(i,w,E,y,I,se,$)}}}else if(k.visible){let F=S(w,k,T,C);w.onBeforeShadow(i,w,E,y,I,F,null),i.renderBufferDirect(y,null,I,F,w,null),w.onAfterShadow(i,w,E,y,I,F,null)}}let D=w.children;for(let I=0,k=D.length;I<k;I++)_(D[I],E,y,T,C)}function A(w){w.target.removeEventListener("dispose",A);for(let y in c){let T=c[y],C=w.target.uuid;C in T&&(T[C].dispose(),delete T[C])}}}function y_(i,e){function t(){let U=!1,oe=new it,K=null,ue=new it(0,0,0,0);return{setMask:function(ge){K!==ge&&!U&&(i.colorMask(ge,ge,ge,ge),K=ge)},setLocked:function(ge){U=ge},setClear:function(ge,ee,Me,be,gt){gt===!0&&(ge*=be,ee*=be,Me*=be),oe.set(ge,ee,Me,be),ue.equals(oe)===!1&&(i.clearColor(ge,ee,Me,be),ue.copy(oe))},reset:function(){U=!1,K=null,ue.set(-1,0,0,0)}}}function n(){let U=!1,oe=!1,K=null,ue=null,ge=null;return{setReversed:function(ee){if(oe!==ee){let Me=e.get("EXT_clip_control");ee?Me.clipControlEXT(Me.LOWER_LEFT_EXT,Me.ZERO_TO_ONE_EXT):Me.clipControlEXT(Me.LOWER_LEFT_EXT,Me.NEGATIVE_ONE_TO_ONE_EXT),oe=ee;let be=ge;ge=null,this.setClear(be)}},getReversed:function(){return oe},setTest:function(ee){ee?ne(i.DEPTH_TEST):Fe(i.DEPTH_TEST)},setMask:function(ee){K!==ee&&!U&&(i.depthMask(ee),K=ee)},setFunc:function(ee){if(oe&&(ee=mf[ee]),ue!==ee){switch(ee){case ia:i.depthFunc(i.NEVER);break;case sa:i.depthFunc(i.ALWAYS);break;case ra:i.depthFunc(i.LESS);break;case es:i.depthFunc(i.LEQUAL);break;case oa:i.depthFunc(i.EQUAL);break;case aa:i.depthFunc(i.GEQUAL);break;case la:i.depthFunc(i.GREATER);break;case ca:i.depthFunc(i.NOTEQUAL);break;default:i.depthFunc(i.LEQUAL)}ue=ee}},setLocked:function(ee){U=ee},setClear:function(ee){ge!==ee&&(ge=ee,oe&&(ee=1-ee),i.clearDepth(ee))},reset:function(){U=!1,K=null,ue=null,ge=null,oe=!1}}}function s(){let U=!1,oe=null,K=null,ue=null,ge=null,ee=null,Me=null,be=null,gt=null;return{setTest:function(ct){U||(ct?ne(i.STENCIL_TEST):Fe(i.STENCIL_TEST))},setMask:function(ct){oe!==ct&&!U&&(i.stencilMask(ct),oe=ct)},setFunc:function(ct,On,Bn){(K!==ct||ue!==On||ge!==Bn)&&(i.stencilFunc(ct,On,Bn),K=ct,ue=On,ge=Bn)},setOp:function(ct,On,Bn){(ee!==ct||Me!==On||be!==Bn)&&(i.stencilOp(ct,On,Bn),ee=ct,Me=On,be=Bn)},setLocked:function(ct){U=ct},setClear:function(ct){gt!==ct&&(i.clearStencil(ct),gt=ct)},reset:function(){U=!1,oe=null,K=null,ue=null,ge=null,ee=null,Me=null,be=null,gt=null}}}let r=new t,o=new n,a=new s,l=new WeakMap,c=new WeakMap,h={},d={},u={},f=new WeakMap,m=[],x=null,g=!1,p=null,b=null,S=null,_=null,A=null,w=null,E=null,y=new qe(0,0,0),T=0,C=!1,R=null,D=null,I=null,k=null,F=null,q=i.getParameter(i.MAX_COMBINED_TEXTURE_IMAGE_UNITS),B=!1,$=0,j=i.getParameter(i.VERSION);j.indexOf("WebGL")!==-1?($=parseFloat(/^WebGL (\d)/.exec(j)[1]),B=$>=1):j.indexOf("OpenGL ES")!==-1&&($=parseFloat(/^OpenGL ES (\d)/.exec(j)[1]),B=$>=2);let se=null,fe={},_e=i.getParameter(i.SCISSOR_BOX),Ke=i.getParameter(i.VIEWPORT),pt=new it().fromArray(_e),Je=new it().fromArray(Ke);function Q(U,oe,K,ue){let ge=new Uint8Array(4),ee=i.createTexture();i.bindTexture(U,ee),i.texParameteri(U,i.TEXTURE_MIN_FILTER,i.NEAREST),i.texParameteri(U,i.TEXTURE_MAG_FILTER,i.NEAREST);for(let Me=0;Me<K;Me++)U===i.TEXTURE_3D||U===i.TEXTURE_2D_ARRAY?i.texImage3D(oe,0,i.RGBA,1,1,ue,0,i.RGBA,i.UNSIGNED_BYTE,ge):i.texImage2D(oe+Me,0,i.RGBA,1,1,0,i.RGBA,i.UNSIGNED_BYTE,ge);return ee}let ae={};ae[i.TEXTURE_2D]=Q(i.TEXTURE_2D,i.TEXTURE_2D,1),ae[i.TEXTURE_CUBE_MAP]=Q(i.TEXTURE_CUBE_MAP,i.TEXTURE_CUBE_MAP_POSITIVE_X,6),ae[i.TEXTURE_2D_ARRAY]=Q(i.TEXTURE_2D_ARRAY,i.TEXTURE_2D_ARRAY,1,1),ae[i.TEXTURE_3D]=Q(i.TEXTURE_3D,i.TEXTURE_3D,1,1),r.setClear(0,0,0,1),o.setClear(1),a.setClear(0),ne(i.DEPTH_TEST),o.setFunc(es),wt(!1),Pt(uh),ne(i.CULL_FACE),je(Zn);function ne(U){h[U]!==!0&&(i.enable(U),h[U]=!0)}function Fe(U){h[U]!==!1&&(i.disable(U),h[U]=!1)}function ze(U,oe){return u[U]!==oe?(i.bindFramebuffer(U,oe),u[U]=oe,U===i.DRAW_FRAMEBUFFER&&(u[i.FRAMEBUFFER]=oe),U===i.FRAMEBUFFER&&(u[i.DRAW_FRAMEBUFFER]=oe),!0):!1}function Ce(U,oe){let K=m,ue=!1;if(U){K=f.get(oe),K===void 0&&(K=[],f.set(oe,K));let ge=U.textures;if(K.length!==ge.length||K[0]!==i.COLOR_ATTACHMENT0){for(let ee=0,Me=ge.length;ee<Me;ee++)K[ee]=i.COLOR_ATTACHMENT0+ee;K.length=ge.length,ue=!0}}else K[0]!==i.BACK&&(K[0]=i.BACK,ue=!0);ue&&i.drawBuffers(K)}function _t(U){return x!==U?(i.useProgram(U),x=U,!0):!1}let We={[Pi]:i.FUNC_ADD,[Od]:i.FUNC_SUBTRACT,[Bd]:i.FUNC_REVERSE_SUBTRACT};We[zd]=i.MIN,We[kd]=i.MAX;let ot={[Vd]:i.ZERO,[Hd]:i.ONE,[Gd]:i.SRC_COLOR,[ta]:i.SRC_ALPHA,[$d]:i.SRC_ALPHA_SATURATE,[Yd]:i.DST_COLOR,[Xd]:i.DST_ALPHA,[Wd]:i.ONE_MINUS_SRC_COLOR,[na]:i.ONE_MINUS_SRC_ALPHA,[Zd]:i.ONE_MINUS_DST_COLOR,[qd]:i.ONE_MINUS_DST_ALPHA,[Kd]:i.CONSTANT_COLOR,[Jd]:i.ONE_MINUS_CONSTANT_COLOR,[jd]:i.CONSTANT_ALPHA,[Qd]:i.ONE_MINUS_CONSTANT_ALPHA};function je(U,oe,K,ue,ge,ee,Me,be,gt,ct){if(U===Zn){g===!0&&(Fe(i.BLEND),g=!1);return}if(g===!1&&(ne(i.BLEND),g=!0),U!==Nd){if(U!==p||ct!==C){if((b!==Pi||A!==Pi)&&(i.blendEquation(i.FUNC_ADD),b=Pi,A=Pi),ct)switch(U){case Qi:i.blendFuncSeparate(i.ONE,i.ONE_MINUS_SRC_ALPHA,i.ONE,i.ONE_MINUS_SRC_ALPHA);break;case dh:i.blendFunc(i.ONE,i.ONE);break;case fh:i.blendFuncSeparate(i.ZERO,i.ONE_MINUS_SRC_COLOR,i.ZERO,i.ONE);break;case ph:i.blendFuncSeparate(i.DST_COLOR,i.ONE_MINUS_SRC_ALPHA,i.ZERO,i.ONE);break;default:Le("WebGLState: Invalid blending: ",U);break}else switch(U){case Qi:i.blendFuncSeparate(i.SRC_ALPHA,i.ONE_MINUS_SRC_ALPHA,i.ONE,i.ONE_MINUS_SRC_ALPHA);break;case dh:i.blendFuncSeparate(i.SRC_ALPHA,i.ONE,i.ONE,i.ONE);break;case fh:Le("WebGLState: SubtractiveBlending requires material.premultipliedAlpha = true");break;case ph:Le("WebGLState: MultiplyBlending requires material.premultipliedAlpha = true");break;default:Le("WebGLState: Invalid blending: ",U);break}S=null,_=null,w=null,E=null,y.set(0,0,0),T=0,p=U,C=ct}return}ge=ge||oe,ee=ee||K,Me=Me||ue,(oe!==b||ge!==A)&&(i.blendEquationSeparate(We[oe],We[ge]),b=oe,A=ge),(K!==S||ue!==_||ee!==w||Me!==E)&&(i.blendFuncSeparate(ot[K],ot[ue],ot[ee],ot[Me]),S=K,_=ue,w=ee,E=Me),(be.equals(y)===!1||gt!==T)&&(i.blendColor(be.r,be.g,be.b,gt),y.copy(be),T=gt),p=U,C=!1}function Ye(U,oe){U.side===rn?Fe(i.CULL_FACE):ne(i.CULL_FACE);let K=U.side===jt;oe&&(K=!K),wt(K),U.blending===Qi&&U.transparent===!1?je(Zn):je(U.blending,U.blendEquation,U.blendSrc,U.blendDst,U.blendEquationAlpha,U.blendSrcAlpha,U.blendDstAlpha,U.blendColor,U.blendAlpha,U.premultipliedAlpha),o.setFunc(U.depthFunc),o.setTest(U.depthTest),o.setMask(U.depthWrite),r.setMask(U.colorWrite);let ue=U.stencilWrite;a.setTest(ue),ue&&(a.setMask(U.stencilWriteMask),a.setFunc(U.stencilFunc,U.stencilRef,U.stencilFuncMask),a.setOp(U.stencilFail,U.stencilZFail,U.stencilZPass)),Bt(U.polygonOffset,U.polygonOffsetFactor,U.polygonOffsetUnits),U.alphaToCoverage===!0?ne(i.SAMPLE_ALPHA_TO_COVERAGE):Fe(i.SAMPLE_ALPHA_TO_COVERAGE)}function wt(U){R!==U&&(U?i.frontFace(i.CW):i.frontFace(i.CCW),R=U)}function Pt(U){U!==Dd?(ne(i.CULL_FACE),U!==D&&(U===uh?i.cullFace(i.BACK):U===Fd?i.cullFace(i.FRONT):i.cullFace(i.FRONT_AND_BACK))):Fe(i.CULL_FACE),D=U}function Ut(U){U!==I&&(B&&i.lineWidth(U),I=U)}function Bt(U,oe,K){U?(ne(i.POLYGON_OFFSET_FILL),(k!==oe||F!==K)&&(k=oe,F=K,o.getReversed()&&(oe=-oe),i.polygonOffset(oe,K))):Fe(i.POLYGON_OFFSET_FILL)}function mt(U){U?ne(i.SCISSOR_TEST):Fe(i.SCISSOR_TEST)}function Et(U){U===void 0&&(U=i.TEXTURE0+q-1),se!==U&&(i.activeTexture(U),se=U)}function N(U,oe,K){K===void 0&&(se===null?K=i.TEXTURE0+q-1:K=se);let ue=fe[K];ue===void 0&&(ue={type:void 0,texture:void 0},fe[K]=ue),(ue.type!==U||ue.texture!==oe)&&(se!==K&&(i.activeTexture(K),se=K),i.bindTexture(U,oe||ae[U]),ue.type=U,ue.texture=oe)}function en(){let U=fe[se];U!==void 0&&U.type!==void 0&&(i.bindTexture(U.type,null),U.type=void 0,U.texture=void 0)}function et(){try{i.compressedTexImage2D(...arguments)}catch(U){Le("WebGLState:",U)}}function P(){try{i.compressedTexImage3D(...arguments)}catch(U){Le("WebGLState:",U)}}function v(){try{i.texSubImage2D(...arguments)}catch(U){Le("WebGLState:",U)}}function z(){try{i.texSubImage3D(...arguments)}catch(U){Le("WebGLState:",U)}}function W(){try{i.compressedTexSubImage2D(...arguments)}catch(U){Le("WebGLState:",U)}}function Y(){try{i.compressedTexSubImage3D(...arguments)}catch(U){Le("WebGLState:",U)}}function ie(){try{i.texStorage2D(...arguments)}catch(U){Le("WebGLState:",U)}}function le(){try{i.texStorage3D(...arguments)}catch(U){Le("WebGLState:",U)}}function Z(){try{i.texImage2D(...arguments)}catch(U){Le("WebGLState:",U)}}function J(){try{i.texImage3D(...arguments)}catch(U){Le("WebGLState:",U)}}function ce(U){return d[U]!==void 0?d[U]:i.getParameter(U)}function we(U,oe){d[U]!==oe&&(i.pixelStorei(U,oe),d[U]=oe)}function de(U){pt.equals(U)===!1&&(i.scissor(U.x,U.y,U.z,U.w),pt.copy(U))}function he(U){Je.equals(U)===!1&&(i.viewport(U.x,U.y,U.z,U.w),Je.copy(U))}function Ae(U,oe){let K=c.get(oe);K===void 0&&(K=new WeakMap,c.set(oe,K));let ue=K.get(U);ue===void 0&&(ue=i.getUniformBlockIndex(oe,U.name),K.set(U,ue))}function Ie(U,oe){let ue=c.get(oe).get(U);l.get(oe)!==ue&&(i.uniformBlockBinding(oe,ue,U.__bindingPointIndex),l.set(oe,ue))}function ke(){i.disable(i.BLEND),i.disable(i.CULL_FACE),i.disable(i.DEPTH_TEST),i.disable(i.POLYGON_OFFSET_FILL),i.disable(i.SCISSOR_TEST),i.disable(i.STENCIL_TEST),i.disable(i.SAMPLE_ALPHA_TO_COVERAGE),i.blendEquation(i.FUNC_ADD),i.blendFunc(i.ONE,i.ZERO),i.blendFuncSeparate(i.ONE,i.ZERO,i.ONE,i.ZERO),i.blendColor(0,0,0,0),i.colorMask(!0,!0,!0,!0),i.clearColor(0,0,0,0),i.depthMask(!0),i.depthFunc(i.LESS),o.setReversed(!1),i.clearDepth(1),i.stencilMask(4294967295),i.stencilFunc(i.ALWAYS,0,4294967295),i.stencilOp(i.KEEP,i.KEEP,i.KEEP),i.clearStencil(0),i.cullFace(i.BACK),i.frontFace(i.CCW),i.polygonOffset(0,0),i.activeTexture(i.TEXTURE0),i.bindFramebuffer(i.FRAMEBUFFER,null),i.bindFramebuffer(i.DRAW_FRAMEBUFFER,null),i.bindFramebuffer(i.READ_FRAMEBUFFER,null),i.useProgram(null),i.lineWidth(1),i.scissor(0,0,i.canvas.width,i.canvas.height),i.viewport(0,0,i.canvas.width,i.canvas.height),i.pixelStorei(i.PACK_ALIGNMENT,4),i.pixelStorei(i.UNPACK_ALIGNMENT,4),i.pixelStorei(i.UNPACK_FLIP_Y_WEBGL,!1),i.pixelStorei(i.UNPACK_PREMULTIPLY_ALPHA_WEBGL,!1),i.pixelStorei(i.UNPACK_COLORSPACE_CONVERSION_WEBGL,i.BROWSER_DEFAULT_WEBGL),i.pixelStorei(i.PACK_ROW_LENGTH,0),i.pixelStorei(i.PACK_SKIP_PIXELS,0),i.pixelStorei(i.PACK_SKIP_ROWS,0),i.pixelStorei(i.UNPACK_ROW_LENGTH,0),i.pixelStorei(i.UNPACK_IMAGE_HEIGHT,0),i.pixelStorei(i.UNPACK_SKIP_PIXELS,0),i.pixelStorei(i.UNPACK_SKIP_ROWS,0),i.pixelStorei(i.UNPACK_SKIP_IMAGES,0),h={},d={},se=null,fe={},u={},f=new WeakMap,m=[],x=null,g=!1,p=null,b=null,S=null,_=null,A=null,w=null,E=null,y=new qe(0,0,0),T=0,C=!1,R=null,D=null,I=null,k=null,F=null,pt.set(0,0,i.canvas.width,i.canvas.height),Je.set(0,0,i.canvas.width,i.canvas.height),r.reset(),o.reset(),a.reset()}return{buffers:{color:r,depth:o,stencil:a},enable:ne,disable:Fe,bindFramebuffer:ze,drawBuffers:Ce,useProgram:_t,setBlending:je,setMaterial:Ye,setFlipSided:wt,setCullFace:Pt,setLineWidth:Ut,setPolygonOffset:Bt,setScissorTest:mt,activeTexture:Et,bindTexture:N,unbindTexture:en,compressedTexImage2D:et,compressedTexImage3D:P,texImage2D:Z,texImage3D:J,pixelStorei:we,getParameter:ce,updateUBOMapping:Ae,uniformBlockBinding:Ie,texStorage2D:ie,texStorage3D:le,texSubImage2D:v,texSubImage3D:z,compressedTexSubImage2D:W,compressedTexSubImage3D:Y,scissor:de,viewport:he,reset:ke}}function v_(i,e,t,n,s,r,o){let a=e.has("WEBGL_multisampled_render_to_texture")?e.get("WEBGL_multisampled_render_to_texture"):null,l=typeof navigator>"u"?!1:/OculusBrowser/g.test(navigator.userAgent),c=new xe,h=new WeakMap,d=new Set,u,f=new WeakMap,m=!1;try{m=typeof OffscreenCanvas<"u"&&new OffscreenCanvas(1,1).getContext("2d")!==null}catch{}function x(P,v){return m?new OffscreenCanvas(P,v):xr("canvas")}function g(P,v,z){let W=1,Y=et(P);if((Y.width>z||Y.height>z)&&(W=z/Math.max(Y.width,Y.height)),W<1)if(typeof HTMLImageElement<"u"&&P instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&P instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&P instanceof ImageBitmap||typeof VideoFrame<"u"&&P instanceof VideoFrame){let ie=Math.floor(W*Y.width),le=Math.floor(W*Y.height);u===void 0&&(u=x(ie,le));let Z=v?x(ie,le):u;return Z.width=ie,Z.height=le,Z.getContext("2d").drawImage(P,0,0,ie,le),Pe("WebGLRenderer: Texture has been resized from ("+Y.width+"x"+Y.height+") to ("+ie+"x"+le+")."),Z}else return"data"in P&&Pe("WebGLRenderer: Image in DataTexture is too big ("+Y.width+"x"+Y.height+")."),P;return P}function p(P){return P.generateMipmaps}function b(P){i.generateMipmap(P)}function S(P){return P.isWebGLCubeRenderTarget?i.TEXTURE_CUBE_MAP:P.isWebGL3DRenderTarget?i.TEXTURE_3D:P.isWebGLArrayRenderTarget||P.isCompressedArrayTexture?i.TEXTURE_2D_ARRAY:i.TEXTURE_2D}function _(P,v,z,W,Y,ie=!1){if(P!==null){if(i[P]!==void 0)return i[P];Pe("WebGLRenderer: Attempt to use non-existing WebGL internal format '"+P+"'")}let le;W&&(le=e.get("EXT_texture_norm16"),le||Pe("WebGLRenderer: Unable to use normalized textures without EXT_texture_norm16 extension"));let Z=v;if(v===i.RED&&(z===i.FLOAT&&(Z=i.R32F),z===i.HALF_FLOAT&&(Z=i.R16F),z===i.UNSIGNED_BYTE&&(Z=i.R8),z===i.UNSIGNED_SHORT&&le&&(Z=le.R16_EXT),z===i.SHORT&&le&&(Z=le.R16_SNORM_EXT)),v===i.RED_INTEGER&&(z===i.UNSIGNED_BYTE&&(Z=i.R8UI),z===i.UNSIGNED_SHORT&&(Z=i.R16UI),z===i.UNSIGNED_INT&&(Z=i.R32UI),z===i.BYTE&&(Z=i.R8I),z===i.SHORT&&(Z=i.R16I),z===i.INT&&(Z=i.R32I)),v===i.RG&&(z===i.FLOAT&&(Z=i.RG32F),z===i.HALF_FLOAT&&(Z=i.RG16F),z===i.UNSIGNED_BYTE&&(Z=i.RG8),z===i.UNSIGNED_SHORT&&le&&(Z=le.RG16_EXT),z===i.SHORT&&le&&(Z=le.RG16_SNORM_EXT)),v===i.RG_INTEGER&&(z===i.UNSIGNED_BYTE&&(Z=i.RG8UI),z===i.UNSIGNED_SHORT&&(Z=i.RG16UI),z===i.UNSIGNED_INT&&(Z=i.RG32UI),z===i.BYTE&&(Z=i.RG8I),z===i.SHORT&&(Z=i.RG16I),z===i.INT&&(Z=i.RG32I)),v===i.RGB_INTEGER&&(z===i.UNSIGNED_BYTE&&(Z=i.RGB8UI),z===i.UNSIGNED_SHORT&&(Z=i.RGB16UI),z===i.UNSIGNED_INT&&(Z=i.RGB32UI),z===i.BYTE&&(Z=i.RGB8I),z===i.SHORT&&(Z=i.RGB16I),z===i.INT&&(Z=i.RGB32I)),v===i.RGBA_INTEGER&&(z===i.UNSIGNED_BYTE&&(Z=i.RGBA8UI),z===i.UNSIGNED_SHORT&&(Z=i.RGBA16UI),z===i.UNSIGNED_INT&&(Z=i.RGBA32UI),z===i.BYTE&&(Z=i.RGBA8I),z===i.SHORT&&(Z=i.RGBA16I),z===i.INT&&(Z=i.RGBA32I)),v===i.RGB&&(z===i.UNSIGNED_SHORT&&le&&(Z=le.RGB16_EXT),z===i.SHORT&&le&&(Z=le.RGB16_SNORM_EXT),z===i.UNSIGNED_INT_5_9_9_9_REV&&(Z=i.RGB9_E5),z===i.UNSIGNED_INT_10F_11F_11F_REV&&(Z=i.R11F_G11F_B10F)),v===i.RGBA){let J=ie?mr:Xe.getTransfer(Y);z===i.FLOAT&&(Z=i.RGBA32F),z===i.HALF_FLOAT&&(Z=i.RGBA16F),z===i.UNSIGNED_BYTE&&(Z=J===Qe?i.SRGB8_ALPHA8:i.RGBA8),z===i.UNSIGNED_SHORT&&le&&(Z=le.RGBA16_EXT),z===i.SHORT&&le&&(Z=le.RGBA16_SNORM_EXT),z===i.UNSIGNED_SHORT_4_4_4_4&&(Z=i.RGBA4),z===i.UNSIGNED_SHORT_5_5_5_1&&(Z=i.RGB5_A1)}return(Z===i.R16F||Z===i.R32F||Z===i.RG16F||Z===i.RG32F||Z===i.RGBA16F||Z===i.RGBA32F)&&e.get("EXT_color_buffer_float"),Z}function A(P,v){let z;return P?v===null||v===Fn||v===Ws?z=i.DEPTH24_STENCIL8:v===Un?z=i.DEPTH32F_STENCIL8:v===Gs&&(z=i.DEPTH24_STENCIL8,Pe("DepthTexture: 16 bit depth attachment is not supported with stencil. Using 24-bit attachment.")):v===null||v===Fn||v===Ws?z=i.DEPTH_COMPONENT24:v===Un?z=i.DEPTH_COMPONENT32F:v===Gs&&(z=i.DEPTH_COMPONENT16),z}function w(P,v){return p(P)===!0||P.isFramebufferTexture&&P.minFilter!==Ot&&P.minFilter!==zt?Math.log2(Math.max(v.width,v.height))+1:P.mipmaps!==void 0&&P.mipmaps.length>0?P.mipmaps.length:P.isCompressedTexture&&Array.isArray(P.image)?v.mipmaps.length:1}function E(P){let v=P.target;v.removeEventListener("dispose",E),T(v),v.isVideoTexture&&h.delete(v),v.isHTMLTexture&&d.delete(v)}function y(P){let v=P.target;v.removeEventListener("dispose",y),R(v)}function T(P){let v=n.get(P);if(v.__webglInit===void 0)return;let z=P.source,W=f.get(z);if(W){let Y=W[v.__cacheKey];Y.usedTimes--,Y.usedTimes===0&&C(P),Object.keys(W).length===0&&f.delete(z)}n.remove(P)}function C(P){let v=n.get(P);i.deleteTexture(v.__webglTexture);let z=P.source,W=f.get(z);delete W[v.__cacheKey],o.memory.textures--}function R(P){let v=n.get(P);if(P.depthTexture&&(P.depthTexture.dispose(),n.remove(P.depthTexture)),P.isWebGLCubeRenderTarget)for(let W=0;W<6;W++){if(Array.isArray(v.__webglFramebuffer[W]))for(let Y=0;Y<v.__webglFramebuffer[W].length;Y++)i.deleteFramebuffer(v.__webglFramebuffer[W][Y]);else i.deleteFramebuffer(v.__webglFramebuffer[W]);v.__webglDepthbuffer&&i.deleteRenderbuffer(v.__webglDepthbuffer[W])}else{if(Array.isArray(v.__webglFramebuffer))for(let W=0;W<v.__webglFramebuffer.length;W++)i.deleteFramebuffer(v.__webglFramebuffer[W]);else i.deleteFramebuffer(v.__webglFramebuffer);if(v.__webglDepthbuffer&&i.deleteRenderbuffer(v.__webglDepthbuffer),v.__webglMultisampledFramebuffer&&i.deleteFramebuffer(v.__webglMultisampledFramebuffer),v.__webglColorRenderbuffer)for(let W=0;W<v.__webglColorRenderbuffer.length;W++)v.__webglColorRenderbuffer[W]&&i.deleteRenderbuffer(v.__webglColorRenderbuffer[W]);v.__webglDepthRenderbuffer&&i.deleteRenderbuffer(v.__webglDepthRenderbuffer)}let z=P.textures;for(let W=0,Y=z.length;W<Y;W++){let ie=n.get(z[W]);ie.__webglTexture&&(i.deleteTexture(ie.__webglTexture),o.memory.textures--),n.remove(z[W])}n.remove(P)}let D=0;function I(){D=0}function k(){return D}function F(P){D=P}function q(){let P=D;return P>=s.maxTextures&&Pe("WebGLTextures: Trying to use "+P+" texture units while this GPU supports only "+s.maxTextures),D+=1,P}function B(P){let v=[];return v.push(P.wrapS),v.push(P.wrapT),v.push(P.wrapR||0),v.push(P.magFilter),v.push(P.minFilter),v.push(P.anisotropy),v.push(P.internalFormat),v.push(P.format),v.push(P.type),v.push(P.generateMipmaps),v.push(P.premultiplyAlpha),v.push(P.flipY),v.push(P.unpackAlignment),v.push(P.colorSpace),v.join()}function $(P,v){let z=n.get(P);if(P.isVideoTexture&&N(P),P.isRenderTargetTexture===!1&&P.isExternalTexture!==!0&&P.version>0&&z.__version!==P.version){let W=P.image;if(W===null)Pe("WebGLRenderer: Texture marked for update but no image data found.");else if(W.complete===!1)Pe("WebGLRenderer: Texture marked for update but image is incomplete");else{Fe(z,P,v);return}}else P.isExternalTexture&&(z.__webglTexture=P.sourceTexture?P.sourceTexture:null);t.bindTexture(i.TEXTURE_2D,z.__webglTexture,i.TEXTURE0+v)}function j(P,v){let z=n.get(P);if(P.isRenderTargetTexture===!1&&P.version>0&&z.__version!==P.version){Fe(z,P,v);return}else P.isExternalTexture&&(z.__webglTexture=P.sourceTexture?P.sourceTexture:null);t.bindTexture(i.TEXTURE_2D_ARRAY,z.__webglTexture,i.TEXTURE0+v)}function se(P,v){let z=n.get(P);if(P.isRenderTargetTexture===!1&&P.version>0&&z.__version!==P.version){Fe(z,P,v);return}t.bindTexture(i.TEXTURE_3D,z.__webglTexture,i.TEXTURE0+v)}function fe(P,v){let z=n.get(P);if(P.isCubeDepthTexture!==!0&&P.version>0&&z.__version!==P.version){ze(z,P,v);return}t.bindTexture(i.TEXTURE_CUBE_MAP,z.__webglTexture,i.TEXTURE0+v)}let _e={[ha]:i.REPEAT,[Gn]:i.CLAMP_TO_EDGE,[ua]:i.MIRRORED_REPEAT},Ke={[Ot]:i.NEAREST,[nf]:i.NEAREST_MIPMAP_NEAREST,[qr]:i.NEAREST_MIPMAP_LINEAR,[zt]:i.LINEAR,[Ya]:i.LINEAR_MIPMAP_NEAREST,[Ni]:i.LINEAR_MIPMAP_LINEAR},pt={[of]:i.NEVER,[uf]:i.ALWAYS,[af]:i.LESS,[Cl]:i.LEQUAL,[lf]:i.EQUAL,[Il]:i.GEQUAL,[cf]:i.GREATER,[hf]:i.NOTEQUAL};function Je(P,v){if(v.type===Un&&e.has("OES_texture_float_linear")===!1&&(v.magFilter===zt||v.magFilter===Ya||v.magFilter===qr||v.magFilter===Ni||v.minFilter===zt||v.minFilter===Ya||v.minFilter===qr||v.minFilter===Ni)&&Pe("WebGLRenderer: Unable to use linear filtering with floating point textures. OES_texture_float_linear not supported on this device."),i.texParameteri(P,i.TEXTURE_WRAP_S,_e[v.wrapS]),i.texParameteri(P,i.TEXTURE_WRAP_T,_e[v.wrapT]),(P===i.TEXTURE_3D||P===i.TEXTURE_2D_ARRAY)&&i.texParameteri(P,i.TEXTURE_WRAP_R,_e[v.wrapR]),i.texParameteri(P,i.TEXTURE_MAG_FILTER,Ke[v.magFilter]),i.texParameteri(P,i.TEXTURE_MIN_FILTER,Ke[v.minFilter]),v.compareFunction&&(i.texParameteri(P,i.TEXTURE_COMPARE_MODE,i.COMPARE_REF_TO_TEXTURE),i.texParameteri(P,i.TEXTURE_COMPARE_FUNC,pt[v.compareFunction])),e.has("EXT_texture_filter_anisotropic")===!0){if(v.magFilter===Ot||v.minFilter!==qr&&v.minFilter!==Ni||v.type===Un&&e.has("OES_texture_float_linear")===!1)return;if(v.anisotropy>1||n.get(v).__currentAnisotropy){let z=e.get("EXT_texture_filter_anisotropic");i.texParameterf(P,z.TEXTURE_MAX_ANISOTROPY_EXT,Math.min(v.anisotropy,s.getMaxAnisotropy())),n.get(v).__currentAnisotropy=v.anisotropy}}}function Q(P,v){let z=!1;P.__webglInit===void 0&&(P.__webglInit=!0,v.addEventListener("dispose",E));let W=v.source,Y=f.get(W);Y===void 0&&(Y={},f.set(W,Y));let ie=B(v);if(ie!==P.__cacheKey){Y[ie]===void 0&&(Y[ie]={texture:i.createTexture(),usedTimes:0},o.memory.textures++,z=!0),Y[ie].usedTimes++;let le=Y[P.__cacheKey];le!==void 0&&(Y[P.__cacheKey].usedTimes--,le.usedTimes===0&&C(v)),P.__cacheKey=ie,P.__webglTexture=Y[ie].texture}return z}function ae(P,v,z){return Math.floor(Math.floor(P/z)/v)}function ne(P,v,z,W){let ie=P.updateRanges;if(ie.length===0)t.texSubImage2D(i.TEXTURE_2D,0,0,0,v.width,v.height,z,W,v.data);else{ie.sort((we,de)=>we.start-de.start);let le=0;for(let we=1;we<ie.length;we++){let de=ie[le],he=ie[we],Ae=de.start+de.count,Ie=ae(he.start,v.width,4),ke=ae(de.start,v.width,4);he.start<=Ae+1&&Ie===ke&&ae(he.start+he.count-1,v.width,4)===Ie?de.count=Math.max(de.count,he.start+he.count-de.start):(++le,ie[le]=he)}ie.length=le+1;let Z=t.getParameter(i.UNPACK_ROW_LENGTH),J=t.getParameter(i.UNPACK_SKIP_PIXELS),ce=t.getParameter(i.UNPACK_SKIP_ROWS);t.pixelStorei(i.UNPACK_ROW_LENGTH,v.width);for(let we=0,de=ie.length;we<de;we++){let he=ie[we],Ae=Math.floor(he.start/4),Ie=Math.ceil(he.count/4),ke=Ae%v.width,U=Math.floor(Ae/v.width),oe=Ie,K=1;t.pixelStorei(i.UNPACK_SKIP_PIXELS,ke),t.pixelStorei(i.UNPACK_SKIP_ROWS,U),t.texSubImage2D(i.TEXTURE_2D,0,ke,U,oe,K,z,W,v.data)}P.clearUpdateRanges(),t.pixelStorei(i.UNPACK_ROW_LENGTH,Z),t.pixelStorei(i.UNPACK_SKIP_PIXELS,J),t.pixelStorei(i.UNPACK_SKIP_ROWS,ce)}}function Fe(P,v,z){let W=i.TEXTURE_2D;(v.isDataArrayTexture||v.isCompressedArrayTexture)&&(W=i.TEXTURE_2D_ARRAY),v.isData3DTexture&&(W=i.TEXTURE_3D);let Y=Q(P,v),ie=v.source;t.bindTexture(W,P.__webglTexture,i.TEXTURE0+z);let le=n.get(ie);if(ie.version!==le.__version||Y===!0){if(t.activeTexture(i.TEXTURE0+z),(typeof ImageBitmap<"u"&&v.image instanceof ImageBitmap)===!1){let K=Xe.getPrimaries(Xe.workingColorSpace),ue=v.colorSpace===hi?null:Xe.getPrimaries(v.colorSpace),ge=v.colorSpace===hi||K===ue?i.NONE:i.BROWSER_DEFAULT_WEBGL;t.pixelStorei(i.UNPACK_FLIP_Y_WEBGL,v.flipY),t.pixelStorei(i.UNPACK_PREMULTIPLY_ALPHA_WEBGL,v.premultiplyAlpha),t.pixelStorei(i.UNPACK_COLORSPACE_CONVERSION_WEBGL,ge)}t.pixelStorei(i.UNPACK_ALIGNMENT,v.unpackAlignment);let J=g(v.image,!1,s.maxTextureSize);J=en(v,J);let ce=r.convert(v.format,v.colorSpace),we=r.convert(v.type),de=_(v.internalFormat,ce,we,v.normalized,v.colorSpace,v.isVideoTexture);Je(W,v);let he,Ae=v.mipmaps,Ie=v.isVideoTexture!==!0,ke=le.__version===void 0||Y===!0,U=ie.dataReady,oe=w(v,J);if(v.isDepthTexture)de=A(v.format===Oi,v.type),ke&&(Ie?t.texStorage2D(i.TEXTURE_2D,1,de,J.width,J.height):t.texImage2D(i.TEXTURE_2D,0,de,J.width,J.height,0,ce,we,null));else if(v.isDataTexture)if(Ae.length>0){Ie&&ke&&t.texStorage2D(i.TEXTURE_2D,oe,de,Ae[0].width,Ae[0].height);for(let K=0,ue=Ae.length;K<ue;K++)he=Ae[K],Ie?U&&t.texSubImage2D(i.TEXTURE_2D,K,0,0,he.width,he.height,ce,we,he.data):t.texImage2D(i.TEXTURE_2D,K,de,he.width,he.height,0,ce,we,he.data);v.generateMipmaps=!1}else Ie?(ke&&t.texStorage2D(i.TEXTURE_2D,oe,de,J.width,J.height),U&&ne(v,J,ce,we)):t.texImage2D(i.TEXTURE_2D,0,de,J.width,J.height,0,ce,we,J.data);else if(v.isCompressedTexture)if(v.isCompressedArrayTexture){Ie&&ke&&t.texStorage3D(i.TEXTURE_2D_ARRAY,oe,de,Ae[0].width,Ae[0].height,J.depth);for(let K=0,ue=Ae.length;K<ue;K++)if(he=Ae[K],v.format!==Sn)if(ce!==null)if(Ie){if(U)if(v.layerUpdates.size>0){let ge=zh(he.width,he.height,v.format,v.type);for(let ee of v.layerUpdates){let Me=he.data.subarray(ee*ge/he.data.BYTES_PER_ELEMENT,(ee+1)*ge/he.data.BYTES_PER_ELEMENT);t.compressedTexSubImage3D(i.TEXTURE_2D_ARRAY,K,0,0,ee,he.width,he.height,1,ce,Me)}v.clearLayerUpdates()}else t.compressedTexSubImage3D(i.TEXTURE_2D_ARRAY,K,0,0,0,he.width,he.height,J.depth,ce,he.data)}else t.compressedTexImage3D(i.TEXTURE_2D_ARRAY,K,de,he.width,he.height,J.depth,0,he.data,0,0);else Pe("WebGLRenderer: Attempt to load unsupported compressed texture format in .uploadTexture()");else Ie?U&&t.texSubImage3D(i.TEXTURE_2D_ARRAY,K,0,0,0,he.width,he.height,J.depth,ce,we,he.data):t.texImage3D(i.TEXTURE_2D_ARRAY,K,de,he.width,he.height,J.depth,0,ce,we,he.data)}else{Ie&&ke&&t.texStorage2D(i.TEXTURE_2D,oe,de,Ae[0].width,Ae[0].height);for(let K=0,ue=Ae.length;K<ue;K++)he=Ae[K],v.format!==Sn?ce!==null?Ie?U&&t.compressedTexSubImage2D(i.TEXTURE_2D,K,0,0,he.width,he.height,ce,he.data):t.compressedTexImage2D(i.TEXTURE_2D,K,de,he.width,he.height,0,he.data):Pe("WebGLRenderer: Attempt to load unsupported compressed texture format in .uploadTexture()"):Ie?U&&t.texSubImage2D(i.TEXTURE_2D,K,0,0,he.width,he.height,ce,we,he.data):t.texImage2D(i.TEXTURE_2D,K,de,he.width,he.height,0,ce,we,he.data)}else if(v.isDataArrayTexture)if(Ie){if(ke&&t.texStorage3D(i.TEXTURE_2D_ARRAY,oe,de,J.width,J.height,J.depth),U)if(v.layerUpdates.size>0){let K=zh(J.width,J.height,v.format,v.type);for(let ue of v.layerUpdates){let ge=J.data.subarray(ue*K/J.data.BYTES_PER_ELEMENT,(ue+1)*K/J.data.BYTES_PER_ELEMENT);t.texSubImage3D(i.TEXTURE_2D_ARRAY,0,0,0,ue,J.width,J.height,1,ce,we,ge)}v.clearLayerUpdates()}else t.texSubImage3D(i.TEXTURE_2D_ARRAY,0,0,0,0,J.width,J.height,J.depth,ce,we,J.data)}else t.texImage3D(i.TEXTURE_2D_ARRAY,0,de,J.width,J.height,J.depth,0,ce,we,J.data);else if(v.isData3DTexture)Ie?(ke&&t.texStorage3D(i.TEXTURE_3D,oe,de,J.width,J.height,J.depth),U&&t.texSubImage3D(i.TEXTURE_3D,0,0,0,0,J.width,J.height,J.depth,ce,we,J.data)):t.texImage3D(i.TEXTURE_3D,0,de,J.width,J.height,J.depth,0,ce,we,J.data);else if(v.isFramebufferTexture){if(ke)if(Ie)t.texStorage2D(i.TEXTURE_2D,oe,de,J.width,J.height);else{let K=J.width,ue=J.height;for(let ge=0;ge<oe;ge++)t.texImage2D(i.TEXTURE_2D,ge,de,K,ue,0,ce,we,null),K>>=1,ue>>=1}}else if(v.isHTMLTexture){if("texElementImage2D"in i){let K=i.canvas;if(K.hasAttribute("layoutsubtree")||K.setAttribute("layoutsubtree","true"),J.parentNode!==K){K.appendChild(J),d.add(v),K.onpaint=ue=>{let ge=ue.changedElements;for(let ee of d)ge.includes(ee.image)&&(ee.needsUpdate=!0)},K.requestPaint();return}if(i.texElementImage2D.length===3)i.texElementImage2D(i.TEXTURE_2D,i.RGBA8,J);else{let ge=i.RGBA,ee=i.RGBA,Me=i.UNSIGNED_BYTE;i.texElementImage2D(i.TEXTURE_2D,0,ge,ee,Me,J)}i.texParameteri(i.TEXTURE_2D,i.TEXTURE_MIN_FILTER,i.LINEAR),i.texParameteri(i.TEXTURE_2D,i.TEXTURE_WRAP_S,i.CLAMP_TO_EDGE),i.texParameteri(i.TEXTURE_2D,i.TEXTURE_WRAP_T,i.CLAMP_TO_EDGE)}}else if(Ae.length>0){if(Ie&&ke){let K=et(Ae[0]);t.texStorage2D(i.TEXTURE_2D,oe,de,K.width,K.height)}for(let K=0,ue=Ae.length;K<ue;K++)he=Ae[K],Ie?U&&t.texSubImage2D(i.TEXTURE_2D,K,0,0,ce,we,he):t.texImage2D(i.TEXTURE_2D,K,de,ce,we,he);v.generateMipmaps=!1}else if(Ie){if(ke){let K=et(J);t.texStorage2D(i.TEXTURE_2D,oe,de,K.width,K.height)}U&&t.texSubImage2D(i.TEXTURE_2D,0,0,0,ce,we,J)}else t.texImage2D(i.TEXTURE_2D,0,de,ce,we,J);p(v)&&b(W),le.__version=ie.version,v.onUpdate&&v.onUpdate(v)}P.__version=v.version}function ze(P,v,z){if(v.image.length!==6)return;let W=Q(P,v),Y=v.source;t.bindTexture(i.TEXTURE_CUBE_MAP,P.__webglTexture,i.TEXTURE0+z);let ie=n.get(Y);if(Y.version!==ie.__version||W===!0){t.activeTexture(i.TEXTURE0+z);let le=Xe.getPrimaries(Xe.workingColorSpace),Z=v.colorSpace===hi?null:Xe.getPrimaries(v.colorSpace),J=v.colorSpace===hi||le===Z?i.NONE:i.BROWSER_DEFAULT_WEBGL;t.pixelStorei(i.UNPACK_FLIP_Y_WEBGL,v.flipY),t.pixelStorei(i.UNPACK_PREMULTIPLY_ALPHA_WEBGL,v.premultiplyAlpha),t.pixelStorei(i.UNPACK_ALIGNMENT,v.unpackAlignment),t.pixelStorei(i.UNPACK_COLORSPACE_CONVERSION_WEBGL,J);let ce=v.isCompressedTexture||v.image[0].isCompressedTexture,we=v.image[0]&&v.image[0].isDataTexture,de=[];for(let ee=0;ee<6;ee++)!ce&&!we?de[ee]=g(v.image[ee],!0,s.maxCubemapSize):de[ee]=we?v.image[ee].image:v.image[ee],de[ee]=en(v,de[ee]);let he=de[0],Ae=r.convert(v.format,v.colorSpace),Ie=r.convert(v.type),ke=_(v.internalFormat,Ae,Ie,v.normalized,v.colorSpace),U=v.isVideoTexture!==!0,oe=ie.__version===void 0||W===!0,K=Y.dataReady,ue=w(v,he);Je(i.TEXTURE_CUBE_MAP,v);let ge;if(ce){U&&oe&&t.texStorage2D(i.TEXTURE_CUBE_MAP,ue,ke,he.width,he.height);for(let ee=0;ee<6;ee++){ge=de[ee].mipmaps;for(let Me=0;Me<ge.length;Me++){let be=ge[Me];v.format!==Sn?Ae!==null?U?K&&t.compressedTexSubImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+ee,Me,0,0,be.width,be.height,Ae,be.data):t.compressedTexImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+ee,Me,ke,be.width,be.height,0,be.data):Pe("WebGLRenderer: Attempt to load unsupported compressed texture format in .setTextureCube()"):U?K&&t.texSubImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+ee,Me,0,0,be.width,be.height,Ae,Ie,be.data):t.texImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+ee,Me,ke,be.width,be.height,0,Ae,Ie,be.data)}}}else{if(ge=v.mipmaps,U&&oe){ge.length>0&&ue++;let ee=et(de[0]);t.texStorage2D(i.TEXTURE_CUBE_MAP,ue,ke,ee.width,ee.height)}for(let ee=0;ee<6;ee++)if(we){U?K&&t.texSubImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+ee,0,0,0,de[ee].width,de[ee].height,Ae,Ie,de[ee].data):t.texImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+ee,0,ke,de[ee].width,de[ee].height,0,Ae,Ie,de[ee].data);for(let Me=0;Me<ge.length;Me++){let gt=ge[Me].image[ee].image;U?K&&t.texSubImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+ee,Me+1,0,0,gt.width,gt.height,Ae,Ie,gt.data):t.texImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+ee,Me+1,ke,gt.width,gt.height,0,Ae,Ie,gt.data)}}else{U?K&&t.texSubImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+ee,0,0,0,Ae,Ie,de[ee]):t.texImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+ee,0,ke,Ae,Ie,de[ee]);for(let Me=0;Me<ge.length;Me++){let be=ge[Me];U?K&&t.texSubImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+ee,Me+1,0,0,Ae,Ie,be.image[ee]):t.texImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+ee,Me+1,ke,Ae,Ie,be.image[ee])}}}p(v)&&b(i.TEXTURE_CUBE_MAP),ie.__version=Y.version,v.onUpdate&&v.onUpdate(v)}P.__version=v.version}function Ce(P,v,z,W,Y,ie){let le=r.convert(z.format,z.colorSpace),Z=r.convert(z.type),J=_(z.internalFormat,le,Z,z.normalized,z.colorSpace),ce=n.get(v),we=n.get(z);if(we.__renderTarget=v,!ce.__hasExternalTextures){let de=Math.max(1,v.width>>ie),he=Math.max(1,v.height>>ie);Y===i.TEXTURE_3D||Y===i.TEXTURE_2D_ARRAY?t.texImage3D(Y,ie,J,de,he,v.depth,0,le,Z,null):t.texImage2D(Y,ie,J,de,he,0,le,Z,null)}t.bindFramebuffer(i.FRAMEBUFFER,P),Et(v)?a.framebufferTexture2DMultisampleEXT(i.FRAMEBUFFER,W,Y,we.__webglTexture,0,mt(v)):(Y===i.TEXTURE_2D||Y>=i.TEXTURE_CUBE_MAP_POSITIVE_X&&Y<=i.TEXTURE_CUBE_MAP_NEGATIVE_Z)&&i.framebufferTexture2D(i.FRAMEBUFFER,W,Y,we.__webglTexture,ie),t.bindFramebuffer(i.FRAMEBUFFER,null)}function _t(P,v,z){if(i.bindRenderbuffer(i.RENDERBUFFER,P),v.depthBuffer){let W=v.depthTexture,Y=W&&W.isDepthTexture?W.type:null,ie=A(v.stencilBuffer,Y),le=v.stencilBuffer?i.DEPTH_STENCIL_ATTACHMENT:i.DEPTH_ATTACHMENT;Et(v)?a.renderbufferStorageMultisampleEXT(i.RENDERBUFFER,mt(v),ie,v.width,v.height):z?i.renderbufferStorageMultisample(i.RENDERBUFFER,mt(v),ie,v.width,v.height):i.renderbufferStorage(i.RENDERBUFFER,ie,v.width,v.height),i.framebufferRenderbuffer(i.FRAMEBUFFER,le,i.RENDERBUFFER,P)}else{let W=v.textures;for(let Y=0;Y<W.length;Y++){let ie=W[Y],le=r.convert(ie.format,ie.colorSpace),Z=r.convert(ie.type),J=_(ie.internalFormat,le,Z,ie.normalized,ie.colorSpace);Et(v)?a.renderbufferStorageMultisampleEXT(i.RENDERBUFFER,mt(v),J,v.width,v.height):z?i.renderbufferStorageMultisample(i.RENDERBUFFER,mt(v),J,v.width,v.height):i.renderbufferStorage(i.RENDERBUFFER,J,v.width,v.height)}}i.bindRenderbuffer(i.RENDERBUFFER,null)}function We(P,v,z){let W=v.isWebGLCubeRenderTarget===!0;if(t.bindFramebuffer(i.FRAMEBUFFER,P),!(v.depthTexture&&v.depthTexture.isDepthTexture))throw new Error("THREE.WebGLTextures: renderTarget.depthTexture must be an instance of THREE.DepthTexture.");let Y=n.get(v.depthTexture);if(Y.__renderTarget=v,(!Y.__webglTexture||v.depthTexture.image.width!==v.width||v.depthTexture.image.height!==v.height)&&(v.depthTexture.image.width=v.width,v.depthTexture.image.height=v.height,v.depthTexture.needsUpdate=!0),W){if(Y.__webglInit===void 0&&(Y.__webglInit=!0,v.depthTexture.addEventListener("dispose",E)),Y.__webglTexture===void 0){Y.__webglTexture=i.createTexture(),t.bindTexture(i.TEXTURE_CUBE_MAP,Y.__webglTexture),Je(i.TEXTURE_CUBE_MAP,v.depthTexture);let ce=r.convert(v.depthTexture.format),we=r.convert(v.depthTexture.type),de;v.depthTexture.format===Xn?de=i.DEPTH_COMPONENT24:v.depthTexture.format===Oi&&(de=i.DEPTH24_STENCIL8);for(let he=0;he<6;he++)i.texImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+he,0,de,v.width,v.height,0,ce,we,null)}}else $(v.depthTexture,0);let ie=Y.__webglTexture,le=mt(v),Z=W?i.TEXTURE_CUBE_MAP_POSITIVE_X+z:i.TEXTURE_2D,J=v.depthTexture.format===Oi?i.DEPTH_STENCIL_ATTACHMENT:i.DEPTH_ATTACHMENT;if(v.depthTexture.format===Xn)Et(v)?a.framebufferTexture2DMultisampleEXT(i.FRAMEBUFFER,J,Z,ie,0,le):i.framebufferTexture2D(i.FRAMEBUFFER,J,Z,ie,0);else if(v.depthTexture.format===Oi)Et(v)?a.framebufferTexture2DMultisampleEXT(i.FRAMEBUFFER,J,Z,ie,0,le):i.framebufferTexture2D(i.FRAMEBUFFER,J,Z,ie,0);else throw new Error("THREE.WebGLTextures: Unknown depthTexture format.")}function ot(P){let v=n.get(P),z=P.isWebGLCubeRenderTarget===!0;if(v.__boundDepthTexture!==P.depthTexture){let W=P.depthTexture;if(v.__depthDisposeCallback&&v.__depthDisposeCallback(),W){let Y=()=>{delete v.__boundDepthTexture,delete v.__depthDisposeCallback,W.removeEventListener("dispose",Y)};W.addEventListener("dispose",Y),v.__depthDisposeCallback=Y}v.__boundDepthTexture=W}if(P.depthTexture&&!v.__autoAllocateDepthBuffer)if(z)for(let W=0;W<6;W++)We(v.__webglFramebuffer[W],P,W);else{let W=P.texture.mipmaps;W&&W.length>0?We(v.__webglFramebuffer[0],P,0):We(v.__webglFramebuffer,P,0)}else if(z){v.__webglDepthbuffer=[];for(let W=0;W<6;W++)if(t.bindFramebuffer(i.FRAMEBUFFER,v.__webglFramebuffer[W]),v.__webglDepthbuffer[W]===void 0)v.__webglDepthbuffer[W]=i.createRenderbuffer(),_t(v.__webglDepthbuffer[W],P,!1);else{let Y=P.stencilBuffer?i.DEPTH_STENCIL_ATTACHMENT:i.DEPTH_ATTACHMENT,ie=v.__webglDepthbuffer[W];i.bindRenderbuffer(i.RENDERBUFFER,ie),i.framebufferRenderbuffer(i.FRAMEBUFFER,Y,i.RENDERBUFFER,ie)}}else{let W=P.texture.mipmaps;if(W&&W.length>0?t.bindFramebuffer(i.FRAMEBUFFER,v.__webglFramebuffer[0]):t.bindFramebuffer(i.FRAMEBUFFER,v.__webglFramebuffer),v.__webglDepthbuffer===void 0)v.__webglDepthbuffer=i.createRenderbuffer(),_t(v.__webglDepthbuffer,P,!1);else{let Y=P.stencilBuffer?i.DEPTH_STENCIL_ATTACHMENT:i.DEPTH_ATTACHMENT,ie=v.__webglDepthbuffer;i.bindRenderbuffer(i.RENDERBUFFER,ie),i.framebufferRenderbuffer(i.FRAMEBUFFER,Y,i.RENDERBUFFER,ie)}}t.bindFramebuffer(i.FRAMEBUFFER,null)}function je(P,v,z){let W=n.get(P);v!==void 0&&Ce(W.__webglFramebuffer,P,P.texture,i.COLOR_ATTACHMENT0,i.TEXTURE_2D,0),z!==void 0&&ot(P)}function Ye(P){let v=P.texture,z=n.get(P),W=n.get(v);P.addEventListener("dispose",y);let Y=P.textures,ie=P.isWebGLCubeRenderTarget===!0,le=Y.length>1;if(le||(W.__webglTexture===void 0&&(W.__webglTexture=i.createTexture()),W.__version=v.version,o.memory.textures++),ie){z.__webglFramebuffer=[];for(let Z=0;Z<6;Z++)if(v.mipmaps&&v.mipmaps.length>0){z.__webglFramebuffer[Z]=[];for(let J=0;J<v.mipmaps.length;J++)z.__webglFramebuffer[Z][J]=i.createFramebuffer()}else z.__webglFramebuffer[Z]=i.createFramebuffer()}else{if(v.mipmaps&&v.mipmaps.length>0){z.__webglFramebuffer=[];for(let Z=0;Z<v.mipmaps.length;Z++)z.__webglFramebuffer[Z]=i.createFramebuffer()}else z.__webglFramebuffer=i.createFramebuffer();if(le)for(let Z=0,J=Y.length;Z<J;Z++){let ce=n.get(Y[Z]);ce.__webglTexture===void 0&&(ce.__webglTexture=i.createTexture(),o.memory.textures++)}if(P.samples>0&&Et(P)===!1){z.__webglMultisampledFramebuffer=i.createFramebuffer(),z.__webglColorRenderbuffer=[],t.bindFramebuffer(i.FRAMEBUFFER,z.__webglMultisampledFramebuffer);for(let Z=0;Z<Y.length;Z++){let J=Y[Z];z.__webglColorRenderbuffer[Z]=i.createRenderbuffer(),i.bindRenderbuffer(i.RENDERBUFFER,z.__webglColorRenderbuffer[Z]);let ce=r.convert(J.format,J.colorSpace),we=r.convert(J.type),de=_(J.internalFormat,ce,we,J.normalized,J.colorSpace,P.isXRRenderTarget===!0),he=mt(P);i.renderbufferStorageMultisample(i.RENDERBUFFER,he,de,P.width,P.height),i.framebufferRenderbuffer(i.FRAMEBUFFER,i.COLOR_ATTACHMENT0+Z,i.RENDERBUFFER,z.__webglColorRenderbuffer[Z])}i.bindRenderbuffer(i.RENDERBUFFER,null),P.depthBuffer&&(z.__webglDepthRenderbuffer=i.createRenderbuffer(),_t(z.__webglDepthRenderbuffer,P,!0)),t.bindFramebuffer(i.FRAMEBUFFER,null)}}if(ie){t.bindTexture(i.TEXTURE_CUBE_MAP,W.__webglTexture),Je(i.TEXTURE_CUBE_MAP,v);for(let Z=0;Z<6;Z++)if(v.mipmaps&&v.mipmaps.length>0)for(let J=0;J<v.mipmaps.length;J++)Ce(z.__webglFramebuffer[Z][J],P,v,i.COLOR_ATTACHMENT0,i.TEXTURE_CUBE_MAP_POSITIVE_X+Z,J);else Ce(z.__webglFramebuffer[Z],P,v,i.COLOR_ATTACHMENT0,i.TEXTURE_CUBE_MAP_POSITIVE_X+Z,0);p(v)&&b(i.TEXTURE_CUBE_MAP),t.unbindTexture()}else if(le){for(let Z=0,J=Y.length;Z<J;Z++){let ce=Y[Z],we=n.get(ce),de=i.TEXTURE_2D;(P.isWebGL3DRenderTarget||P.isWebGLArrayRenderTarget)&&(de=P.isWebGL3DRenderTarget?i.TEXTURE_3D:i.TEXTURE_2D_ARRAY),t.bindTexture(de,we.__webglTexture),Je(de,ce),Ce(z.__webglFramebuffer,P,ce,i.COLOR_ATTACHMENT0+Z,de,0),p(ce)&&b(de)}t.unbindTexture()}else{let Z=i.TEXTURE_2D;if((P.isWebGL3DRenderTarget||P.isWebGLArrayRenderTarget)&&(Z=P.isWebGL3DRenderTarget?i.TEXTURE_3D:i.TEXTURE_2D_ARRAY),t.bindTexture(Z,W.__webglTexture),Je(Z,v),v.mipmaps&&v.mipmaps.length>0)for(let J=0;J<v.mipmaps.length;J++)Ce(z.__webglFramebuffer[J],P,v,i.COLOR_ATTACHMENT0,Z,J);else Ce(z.__webglFramebuffer,P,v,i.COLOR_ATTACHMENT0,Z,0);p(v)&&b(Z),t.unbindTexture()}P.depthBuffer&&ot(P)}function wt(P){let v=P.textures;for(let z=0,W=v.length;z<W;z++){let Y=v[z];if(p(Y)){let ie=S(P),le=n.get(Y).__webglTexture;t.bindTexture(ie,le),b(ie),t.unbindTexture()}}}let Pt=[],Ut=[];function Bt(P){if(P.samples>0){if(Et(P)===!1){let v=P.textures,z=P.width,W=P.height,Y=i.COLOR_BUFFER_BIT,ie=P.stencilBuffer?i.DEPTH_STENCIL_ATTACHMENT:i.DEPTH_ATTACHMENT,le=n.get(P),Z=v.length>1;if(Z)for(let ce=0;ce<v.length;ce++)t.bindFramebuffer(i.FRAMEBUFFER,le.__webglMultisampledFramebuffer),i.framebufferRenderbuffer(i.FRAMEBUFFER,i.COLOR_ATTACHMENT0+ce,i.RENDERBUFFER,null),t.bindFramebuffer(i.FRAMEBUFFER,le.__webglFramebuffer),i.framebufferTexture2D(i.DRAW_FRAMEBUFFER,i.COLOR_ATTACHMENT0+ce,i.TEXTURE_2D,null,0);t.bindFramebuffer(i.READ_FRAMEBUFFER,le.__webglMultisampledFramebuffer);let J=P.texture.mipmaps;J&&J.length>0?t.bindFramebuffer(i.DRAW_FRAMEBUFFER,le.__webglFramebuffer[0]):t.bindFramebuffer(i.DRAW_FRAMEBUFFER,le.__webglFramebuffer);for(let ce=0;ce<v.length;ce++){if(P.resolveDepthBuffer&&(P.depthBuffer&&(Y|=i.DEPTH_BUFFER_BIT),P.stencilBuffer&&P.resolveStencilBuffer&&(Y|=i.STENCIL_BUFFER_BIT)),Z){i.framebufferRenderbuffer(i.READ_FRAMEBUFFER,i.COLOR_ATTACHMENT0,i.RENDERBUFFER,le.__webglColorRenderbuffer[ce]);let we=n.get(v[ce]).__webglTexture;i.framebufferTexture2D(i.DRAW_FRAMEBUFFER,i.COLOR_ATTACHMENT0,i.TEXTURE_2D,we,0)}i.blitFramebuffer(0,0,z,W,0,0,z,W,Y,i.NEAREST),l===!0&&(Pt.length=0,Ut.length=0,Pt.push(i.COLOR_ATTACHMENT0+ce),P.depthBuffer&&P.resolveDepthBuffer===!1&&(Pt.push(ie),Ut.push(ie),i.invalidateFramebuffer(i.DRAW_FRAMEBUFFER,Ut)),i.invalidateFramebuffer(i.READ_FRAMEBUFFER,Pt))}if(t.bindFramebuffer(i.READ_FRAMEBUFFER,null),t.bindFramebuffer(i.DRAW_FRAMEBUFFER,null),Z)for(let ce=0;ce<v.length;ce++){t.bindFramebuffer(i.FRAMEBUFFER,le.__webglMultisampledFramebuffer),i.framebufferRenderbuffer(i.FRAMEBUFFER,i.COLOR_ATTACHMENT0+ce,i.RENDERBUFFER,le.__webglColorRenderbuffer[ce]);let we=n.get(v[ce]).__webglTexture;t.bindFramebuffer(i.FRAMEBUFFER,le.__webglFramebuffer),i.framebufferTexture2D(i.DRAW_FRAMEBUFFER,i.COLOR_ATTACHMENT0+ce,i.TEXTURE_2D,we,0)}t.bindFramebuffer(i.DRAW_FRAMEBUFFER,le.__webglMultisampledFramebuffer)}else if(P.depthBuffer&&P.resolveDepthBuffer===!1&&l){let v=P.stencilBuffer?i.DEPTH_STENCIL_ATTACHMENT:i.DEPTH_ATTACHMENT;i.invalidateFramebuffer(i.DRAW_FRAMEBUFFER,[v])}}}function mt(P){return Math.min(s.maxSamples,P.samples)}function Et(P){let v=n.get(P);return P.samples>0&&e.has("WEBGL_multisampled_render_to_texture")===!0&&v.__useRenderToTexture!==!1}function N(P){let v=o.render.frame;h.get(P)!==v&&(h.set(P,v),P.update())}function en(P,v){let z=P.colorSpace,W=P.format,Y=P.type;return P.isCompressedTexture===!0||P.isVideoTexture===!0||z!==pr&&z!==hi&&(Xe.getTransfer(z)===Qe?(W!==Sn||Y!==mn)&&Pe("WebGLTextures: sRGB encoded textures have to use RGBAFormat and UnsignedByteType."):Le("WebGLTextures: Unsupported texture color space:",z)),v}function et(P){return typeof HTMLImageElement<"u"&&P instanceof HTMLImageElement?(c.width=P.naturalWidth||P.width,c.height=P.naturalHeight||P.height):typeof VideoFrame<"u"&&P instanceof VideoFrame?(c.width=P.displayWidth,c.height=P.displayHeight):(c.width=P.width,c.height=P.height),c}this.allocateTextureUnit=q,this.resetTextureUnits=I,this.getTextureUnits=k,this.setTextureUnits=F,this.setTexture2D=$,this.setTexture2DArray=j,this.setTexture3D=se,this.setTextureCube=fe,this.rebindTextures=je,this.setupRenderTarget=Ye,this.updateRenderTargetMipmap=wt,this.updateMultisampleRenderTarget=Bt,this.setupDepthRenderbuffer=ot,this.setupFrameBufferTexture=Ce,this.useMultisampledRTT=Et,this.isReversedDepthBuffer=function(){return t.buffers.depth.getReversed()}}function __(i,e){function t(n,s=hi){let r,o=Xe.getTransfer(s);if(n===mn)return i.UNSIGNED_BYTE;if(n===$a)return i.UNSIGNED_SHORT_4_4_4_4;if(n===Ka)return i.UNSIGNED_SHORT_5_5_5_1;if(n===Th)return i.UNSIGNED_INT_5_9_9_9_REV;if(n===Ah)return i.UNSIGNED_INT_10F_11F_11F_REV;if(n===wh)return i.BYTE;if(n===Eh)return i.SHORT;if(n===Gs)return i.UNSIGNED_SHORT;if(n===Za)return i.INT;if(n===Fn)return i.UNSIGNED_INT;if(n===Un)return i.FLOAT;if(n===$n)return i.HALF_FLOAT;if(n===Ph)return i.ALPHA;if(n===Rh)return i.RGB;if(n===Sn)return i.RGBA;if(n===Xn)return i.DEPTH_COMPONENT;if(n===Oi)return i.DEPTH_STENCIL;if(n===Ch)return i.RED;if(n===Ja)return i.RED_INTEGER;if(n===Bi)return i.RG;if(n===ja)return i.RG_INTEGER;if(n===Qa)return i.RGBA_INTEGER;if(n===Yr||n===Zr||n===$r||n===Kr)if(o===Qe)if(r=e.get("WEBGL_compressed_texture_s3tc_srgb"),r!==null){if(n===Yr)return r.COMPRESSED_SRGB_S3TC_DXT1_EXT;if(n===Zr)return r.COMPRESSED_SRGB_ALPHA_S3TC_DXT1_EXT;if(n===$r)return r.COMPRESSED_SRGB_ALPHA_S3TC_DXT3_EXT;if(n===Kr)return r.COMPRESSED_SRGB_ALPHA_S3TC_DXT5_EXT}else return null;else if(r=e.get("WEBGL_compressed_texture_s3tc"),r!==null){if(n===Yr)return r.COMPRESSED_RGB_S3TC_DXT1_EXT;if(n===Zr)return r.COMPRESSED_RGBA_S3TC_DXT1_EXT;if(n===$r)return r.COMPRESSED_RGBA_S3TC_DXT3_EXT;if(n===Kr)return r.COMPRESSED_RGBA_S3TC_DXT5_EXT}else return null;if(n===el||n===tl||n===nl||n===il)if(r=e.get("WEBGL_compressed_texture_pvrtc"),r!==null){if(n===el)return r.COMPRESSED_RGB_PVRTC_4BPPV1_IMG;if(n===tl)return r.COMPRESSED_RGB_PVRTC_2BPPV1_IMG;if(n===nl)return r.COMPRESSED_RGBA_PVRTC_4BPPV1_IMG;if(n===il)return r.COMPRESSED_RGBA_PVRTC_2BPPV1_IMG}else return null;if(n===sl||n===rl||n===ol||n===al||n===ll||n===Jr||n===cl)if(r=e.get("WEBGL_compressed_texture_etc"),r!==null){if(n===sl||n===rl)return o===Qe?r.COMPRESSED_SRGB8_ETC2:r.COMPRESSED_RGB8_ETC2;if(n===ol)return o===Qe?r.COMPRESSED_SRGB8_ALPHA8_ETC2_EAC:r.COMPRESSED_RGBA8_ETC2_EAC;if(n===al)return r.COMPRESSED_R11_EAC;if(n===ll)return r.COMPRESSED_SIGNED_R11_EAC;if(n===Jr)return r.COMPRESSED_RG11_EAC;if(n===cl)return r.COMPRESSED_SIGNED_RG11_EAC}else return null;if(n===hl||n===ul||n===dl||n===fl||n===pl||n===ml||n===gl||n===xl||n===yl||n===vl||n===_l||n===bl||n===Sl||n===Ml)if(r=e.get("WEBGL_compressed_texture_astc"),r!==null){if(n===hl)return o===Qe?r.COMPRESSED_SRGB8_ALPHA8_ASTC_4x4_KHR:r.COMPRESSED_RGBA_ASTC_4x4_KHR;if(n===ul)return o===Qe?r.COMPRESSED_SRGB8_ALPHA8_ASTC_5x4_KHR:r.COMPRESSED_RGBA_ASTC_5x4_KHR;if(n===dl)return o===Qe?r.COMPRESSED_SRGB8_ALPHA8_ASTC_5x5_KHR:r.COMPRESSED_RGBA_ASTC_5x5_KHR;if(n===fl)return o===Qe?r.COMPRESSED_SRGB8_ALPHA8_ASTC_6x5_KHR:r.COMPRESSED_RGBA_ASTC_6x5_KHR;if(n===pl)return o===Qe?r.COMPRESSED_SRGB8_ALPHA8_ASTC_6x6_KHR:r.COMPRESSED_RGBA_ASTC_6x6_KHR;if(n===ml)return o===Qe?r.COMPRESSED_SRGB8_ALPHA8_ASTC_8x5_KHR:r.COMPRESSED_RGBA_ASTC_8x5_KHR;if(n===gl)return o===Qe?r.COMPRESSED_SRGB8_ALPHA8_ASTC_8x6_KHR:r.COMPRESSED_RGBA_ASTC_8x6_KHR;if(n===xl)return o===Qe?r.COMPRESSED_SRGB8_ALPHA8_ASTC_8x8_KHR:r.COMPRESSED_RGBA_ASTC_8x8_KHR;if(n===yl)return o===Qe?r.COMPRESSED_SRGB8_ALPHA8_ASTC_10x5_KHR:r.COMPRESSED_RGBA_ASTC_10x5_KHR;if(n===vl)return o===Qe?r.COMPRESSED_SRGB8_ALPHA8_ASTC_10x6_KHR:r.COMPRESSED_RGBA_ASTC_10x6_KHR;if(n===_l)return o===Qe?r.COMPRESSED_SRGB8_ALPHA8_ASTC_10x8_KHR:r.COMPRESSED_RGBA_ASTC_10x8_KHR;if(n===bl)return o===Qe?r.COMPRESSED_SRGB8_ALPHA8_ASTC_10x10_KHR:r.COMPRESSED_RGBA_ASTC_10x10_KHR;if(n===Sl)return o===Qe?r.COMPRESSED_SRGB8_ALPHA8_ASTC_12x10_KHR:r.COMPRESSED_RGBA_ASTC_12x10_KHR;if(n===Ml)return o===Qe?r.COMPRESSED_SRGB8_ALPHA8_ASTC_12x12_KHR:r.COMPRESSED_RGBA_ASTC_12x12_KHR}else return null;if(n===wl||n===El||n===Tl)if(r=e.get("EXT_texture_compression_bptc"),r!==null){if(n===wl)return o===Qe?r.COMPRESSED_SRGB_ALPHA_BPTC_UNORM_EXT:r.COMPRESSED_RGBA_BPTC_UNORM_EXT;if(n===El)return r.COMPRESSED_RGB_BPTC_SIGNED_FLOAT_EXT;if(n===Tl)return r.COMPRESSED_RGB_BPTC_UNSIGNED_FLOAT_EXT}else return null;if(n===Al||n===Pl||n===jr||n===Rl)if(r=e.get("EXT_texture_compression_rgtc"),r!==null){if(n===Al)return r.COMPRESSED_RED_RGTC1_EXT;if(n===Pl)return r.COMPRESSED_SIGNED_RED_RGTC1_EXT;if(n===jr)return r.COMPRESSED_RED_GREEN_RGTC2_EXT;if(n===Rl)return r.COMPRESSED_SIGNED_RED_GREEN_RGTC2_EXT}else return null;return n===Ws?i.UNSIGNED_INT_24_8:i[n]!==void 0?i[n]:null}return{convert:t}}var b_=`
void main() {

	gl_Position = vec4( position, 1.0 );

}`,S_=`
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

}`,su=class{constructor(){this.texture=null,this.mesh=null,this.depthNear=0,this.depthFar=0}init(e,t){if(this.texture===null){let n=new Rr(e.texture);(e.depthNear!==t.depthNear||e.depthFar!==t.depthFar)&&(this.depthNear=e.depthNear,this.depthFar=e.depthFar),this.texture=n}}getMesh(e){if(this.texture!==null&&this.mesh===null){let t=e.cameras[0].viewport,n=new Jt({vertexShader:b_,fragmentShader:S_,uniforms:{depthColor:{value:this.texture},depthWidth:{value:t.z},depthHeight:{value:t.w}}});this.mesh=new At(new ss(20,20),n)}return this.mesh}reset(){this.texture=null,this.mesh=null}getDepthTexture(){return this.texture}},ru=class extends qn{constructor(e,t){super();let n=this,s=null,r=1,o=null,a="local-floor",l=1,c=null,h=null,d=null,u=null,f=null,m=null,x=typeof XRWebGLBinding<"u",g=new su,p={},b=t.getContextAttributes(),S=null,_=null,A=[],w=[],E=new xe,y=null,T=new qt;T.viewport=new it;let C=new qt;C.viewport=new it;let R=[T,C],D=new Ha,I=null,k=null;this.cameraAutoUpdate=!0,this.enabled=!1,this.isPresenting=!1,this.getController=function(Q){let ae=A[Q];return ae===void 0&&(ae=new Us,A[Q]=ae),ae.getTargetRaySpace()},this.getControllerGrip=function(Q){let ae=A[Q];return ae===void 0&&(ae=new Us,A[Q]=ae),ae.getGripSpace()},this.getHand=function(Q){let ae=A[Q];return ae===void 0&&(ae=new Us,A[Q]=ae),ae.getHandSpace()};function F(Q){let ae=w.indexOf(Q.inputSource);if(ae===-1)return;let ne=A[ae];ne!==void 0&&(ne.update(Q.inputSource,Q.frame,c||o),ne.dispatchEvent({type:Q.type,data:Q.inputSource}))}function q(){s.removeEventListener("select",F),s.removeEventListener("selectstart",F),s.removeEventListener("selectend",F),s.removeEventListener("squeeze",F),s.removeEventListener("squeezestart",F),s.removeEventListener("squeezeend",F),s.removeEventListener("end",q),s.removeEventListener("inputsourceschange",B);for(let Q=0;Q<A.length;Q++){let ae=w[Q];ae!==null&&(w[Q]=null,A[Q].disconnect(ae))}I=null,k=null,g.reset();for(let Q in p)delete p[Q];e.setRenderTarget(S),f=null,u=null,d=null,s=null,_=null,Je.stop(),n.isPresenting=!1,e.setPixelRatio(y),e.setSize(E.width,E.height,!1),n.dispatchEvent({type:"sessionend"})}this.setFramebufferScaleFactor=function(Q){r=Q,n.isPresenting===!0&&Pe("WebXRManager: Cannot change framebuffer scale while presenting.")},this.setReferenceSpaceType=function(Q){a=Q,n.isPresenting===!0&&Pe("WebXRManager: Cannot change reference space type while presenting.")},this.getReferenceSpace=function(){return c||o},this.setReferenceSpace=function(Q){c=Q},this.getBaseLayer=function(){return u!==null?u:f},this.getBinding=function(){return d===null&&x&&(d=new XRWebGLBinding(s,t)),d},this.getFrame=function(){return m},this.getSession=function(){return s},this.setSession=async function(Q){if(s=Q,s!==null){if(S=e.getRenderTarget(),s.addEventListener("select",F),s.addEventListener("selectstart",F),s.addEventListener("selectend",F),s.addEventListener("squeeze",F),s.addEventListener("squeezestart",F),s.addEventListener("squeezeend",F),s.addEventListener("end",q),s.addEventListener("inputsourceschange",B),b.xrCompatible!==!0&&await t.makeXRCompatible(),y=e.getPixelRatio(),e.getSize(E),x&&"createProjectionLayer"in XRWebGLBinding.prototype){let ne=null,Fe=null,ze=null;b.depth&&(ze=b.stencil?t.DEPTH24_STENCIL8:t.DEPTH_COMPONENT24,ne=b.stencil?Oi:Xn,Fe=b.stencil?Ws:Fn);let Ce={colorFormat:t.RGBA8,depthFormat:ze,scaleFactor:r};d=this.getBinding(),u=d.createProjectionLayer(Ce),s.updateRenderState({layers:[u]}),e.setPixelRatio(1),e.setSize(u.textureWidth,u.textureHeight,!1),_=new hn(u.textureWidth,u.textureHeight,{format:Sn,type:mn,depthTexture:new ci(u.textureWidth,u.textureHeight,Fe,void 0,void 0,void 0,void 0,void 0,void 0,ne),stencilBuffer:b.stencil,colorSpace:e.outputColorSpace,samples:b.antialias?4:0,resolveDepthBuffer:u.ignoreDepthValues===!1,resolveStencilBuffer:u.ignoreDepthValues===!1})}else{let ne={antialias:b.antialias,alpha:!0,depth:b.depth,stencil:b.stencil,framebufferScaleFactor:r};f=new XRWebGLLayer(s,t,ne),s.updateRenderState({baseLayer:f}),e.setPixelRatio(1),e.setSize(f.framebufferWidth,f.framebufferHeight,!1),_=new hn(f.framebufferWidth,f.framebufferHeight,{format:Sn,type:mn,colorSpace:e.outputColorSpace,stencilBuffer:b.stencil,resolveDepthBuffer:f.ignoreDepthValues===!1,resolveStencilBuffer:f.ignoreDepthValues===!1})}_.isXRRenderTarget=!0,this.setFoveation(l),c=null,o=await s.requestReferenceSpace(a),Je.setContext(s),Je.start(),n.isPresenting=!0,n.dispatchEvent({type:"sessionstart"})}},this.getEnvironmentBlendMode=function(){if(s!==null)return s.environmentBlendMode},this.getDepthTexture=function(){return g.getDepthTexture()};function B(Q){for(let ae=0;ae<Q.removed.length;ae++){let ne=Q.removed[ae],Fe=w.indexOf(ne);Fe>=0&&(w[Fe]=null,A[Fe].disconnect(ne))}for(let ae=0;ae<Q.added.length;ae++){let ne=Q.added[ae],Fe=w.indexOf(ne);if(Fe===-1){for(let Ce=0;Ce<A.length;Ce++)if(Ce>=w.length){w.push(ne),Fe=Ce;break}else if(w[Ce]===null){w[Ce]=ne,Fe=Ce;break}if(Fe===-1)break}let ze=A[Fe];ze&&ze.connect(ne)}}let $=new L,j=new L;function se(Q,ae,ne){$.setFromMatrixPosition(ae.matrixWorld),j.setFromMatrixPosition(ne.matrixWorld);let Fe=$.distanceTo(j),ze=ae.projectionMatrix.elements,Ce=ne.projectionMatrix.elements,_t=ze[14]/(ze[10]-1),We=ze[14]/(ze[10]+1),ot=(ze[9]+1)/ze[5],je=(ze[9]-1)/ze[5],Ye=(ze[8]-1)/ze[0],wt=(Ce[8]+1)/Ce[0],Pt=_t*Ye,Ut=_t*wt,Bt=Fe/(-Ye+wt),mt=Bt*-Ye;if(ae.matrixWorld.decompose(Q.position,Q.quaternion,Q.scale),Q.translateX(mt),Q.translateZ(Bt),Q.matrixWorld.compose(Q.position,Q.quaternion,Q.scale),Q.matrixWorldInverse.copy(Q.matrixWorld).invert(),ze[10]===-1)Q.projectionMatrix.copy(ae.projectionMatrix),Q.projectionMatrixInverse.copy(ae.projectionMatrixInverse);else{let Et=_t+Bt,N=We+Bt,en=Pt-mt,et=Ut+(Fe-mt),P=ot*We/N*Et,v=je*We/N*Et;Q.projectionMatrix.makePerspective(en,et,P,v,Et,N),Q.projectionMatrixInverse.copy(Q.projectionMatrix).invert()}}function fe(Q,ae){ae===null?Q.matrixWorld.copy(Q.matrix):Q.matrixWorld.multiplyMatrices(ae.matrixWorld,Q.matrix),Q.matrixWorldInverse.copy(Q.matrixWorld).invert()}this.updateCamera=function(Q){if(s===null)return;let ae=Q.near,ne=Q.far;g.texture!==null&&(g.depthNear>0&&(ae=g.depthNear),g.depthFar>0&&(ne=g.depthFar)),D.near=C.near=T.near=ae,D.far=C.far=T.far=ne,(I!==D.near||k!==D.far)&&(s.updateRenderState({depthNear:D.near,depthFar:D.far}),I=D.near,k=D.far),D.layers.mask=Q.layers.mask|6,T.layers.mask=D.layers.mask&-5,C.layers.mask=D.layers.mask&-3;let Fe=Q.parent,ze=D.cameras;fe(D,Fe);for(let Ce=0;Ce<ze.length;Ce++)fe(ze[Ce],Fe);ze.length===2?se(D,T,C):D.projectionMatrix.copy(T.projectionMatrix),_e(Q,D,Fe)};function _e(Q,ae,ne){ne===null?Q.matrix.copy(ae.matrixWorld):(Q.matrix.copy(ne.matrixWorld),Q.matrix.invert(),Q.matrix.multiply(ae.matrixWorld)),Q.matrix.decompose(Q.position,Q.quaternion,Q.scale),Q.updateMatrixWorld(!0),Q.projectionMatrix.copy(ae.projectionMatrix),Q.projectionMatrixInverse.copy(ae.projectionMatrixInverse),Q.isPerspectiveCamera&&(Q.fov=Ds*2*Math.atan(1/Q.projectionMatrix.elements[5]),Q.zoom=1)}this.getCamera=function(){return D},this.getFoveation=function(){if(!(u===null&&f===null))return l},this.setFoveation=function(Q){l=Q,u!==null&&(u.fixedFoveation=Q),f!==null&&f.fixedFoveation!==void 0&&(f.fixedFoveation=Q)},this.hasDepthSensing=function(){return g.texture!==null},this.getDepthSensingMesh=function(){return g.getMesh(D)},this.getCameraTexture=function(Q){return p[Q]};let Ke=null;function pt(Q,ae){if(h=ae.getViewerPose(c||o),m=ae,h!==null){let ne=h.views;f!==null&&(e.setRenderTargetFramebuffer(_,f.framebuffer),e.setRenderTarget(_));let Fe=!1;ne.length!==D.cameras.length&&(D.cameras.length=0,Fe=!0);for(let We=0;We<ne.length;We++){let ot=ne[We],je=null;if(f!==null)je=f.getViewport(ot);else{let wt=d.getViewSubImage(u,ot);je=wt.viewport,We===0&&(e.setRenderTargetTextures(_,wt.colorTexture,wt.depthStencilTexture),e.setRenderTarget(_))}let Ye=R[We];Ye===void 0&&(Ye=new qt,Ye.layers.enable(We),Ye.viewport=new it,R[We]=Ye),Ye.matrix.fromArray(ot.transform.matrix),Ye.matrix.decompose(Ye.position,Ye.quaternion,Ye.scale),Ye.projectionMatrix.fromArray(ot.projectionMatrix),Ye.projectionMatrixInverse.copy(Ye.projectionMatrix).invert(),Ye.viewport.set(je.x,je.y,je.width,je.height),We===0&&(D.matrix.copy(Ye.matrix),D.matrix.decompose(D.position,D.quaternion,D.scale)),Fe===!0&&D.cameras.push(Ye)}let ze=s.enabledFeatures;if(ze&&ze.includes("depth-sensing")&&s.depthUsage=="gpu-optimized"&&x){d=n.getBinding();let We=d.getDepthInformation(ne[0]);We&&We.isValid&&We.texture&&g.init(We,s.renderState)}if(ze&&ze.includes("camera-access")&&x){e.state.unbindTexture(),d=n.getBinding();for(let We=0;We<ne.length;We++){let ot=ne[We].camera;if(ot){let je=p[ot];je||(je=new Rr,p[ot]=je);let Ye=d.getCameraImage(ot);je.sourceTexture=Ye}}}}for(let ne=0;ne<A.length;ne++){let Fe=w[ne],ze=A[ne];Fe!==null&&ze!==void 0&&ze.update(Fe,ae,c||o)}Ke&&Ke(Q,ae),ae.detectedPlanes&&n.dispatchEvent({type:"planesdetected",data:ae}),m=null}let Je=new Wf;Je.setAnimationLoop(pt),this.setAnimationLoop=function(Q){Ke=Q},this.dispose=function(){}}},M_=new rt,Kf=new Ne;Kf.set(-1,0,0,0,1,0,0,0,1);function w_(i,e){function t(g,p){g.matrixAutoUpdate===!0&&g.updateMatrix(),p.value.copy(g.matrix)}function n(g,p){p.color.getRGB(g.fogColor.value,Nh(i)),p.isFog?(g.fogNear.value=p.near,g.fogFar.value=p.far):p.isFogExp2&&(g.fogDensity.value=p.density)}function s(g,p,b,S,_){p.isNodeMaterial?p.uniformsNeedUpdate=!1:p.isMeshBasicMaterial?r(g,p):p.isMeshLambertMaterial?(r(g,p),p.envMap&&(g.envMapIntensity.value=p.envMapIntensity)):p.isMeshToonMaterial?(r(g,p),d(g,p)):p.isMeshPhongMaterial?(r(g,p),h(g,p),p.envMap&&(g.envMapIntensity.value=p.envMapIntensity)):p.isMeshStandardMaterial?(r(g,p),u(g,p),p.isMeshPhysicalMaterial&&f(g,p,_)):p.isMeshMatcapMaterial?(r(g,p),m(g,p)):p.isMeshDepthMaterial?r(g,p):p.isMeshDistanceMaterial?(r(g,p),x(g,p)):p.isMeshNormalMaterial?r(g,p):p.isLineBasicMaterial?(o(g,p),p.isLineDashedMaterial&&a(g,p)):p.isPointsMaterial?l(g,p,b,S):p.isSpriteMaterial?c(g,p):p.isShadowMaterial?(g.color.value.copy(p.color),g.opacity.value=p.opacity):p.isShaderMaterial&&(p.uniformsNeedUpdate=!1)}function r(g,p){g.opacity.value=p.opacity,p.color&&g.diffuse.value.copy(p.color),p.emissive&&g.emissive.value.copy(p.emissive).multiplyScalar(p.emissiveIntensity),p.map&&(g.map.value=p.map,t(p.map,g.mapTransform)),p.alphaMap&&(g.alphaMap.value=p.alphaMap,t(p.alphaMap,g.alphaMapTransform)),p.bumpMap&&(g.bumpMap.value=p.bumpMap,t(p.bumpMap,g.bumpMapTransform),g.bumpScale.value=p.bumpScale,p.side===jt&&(g.bumpScale.value*=-1)),p.normalMap&&(g.normalMap.value=p.normalMap,t(p.normalMap,g.normalMapTransform),g.normalScale.value.copy(p.normalScale),p.side===jt&&g.normalScale.value.negate()),p.displacementMap&&(g.displacementMap.value=p.displacementMap,t(p.displacementMap,g.displacementMapTransform),g.displacementScale.value=p.displacementScale,g.displacementBias.value=p.displacementBias),p.emissiveMap&&(g.emissiveMap.value=p.emissiveMap,t(p.emissiveMap,g.emissiveMapTransform)),p.specularMap&&(g.specularMap.value=p.specularMap,t(p.specularMap,g.specularMapTransform)),p.alphaTest>0&&(g.alphaTest.value=p.alphaTest);let b=e.get(p),S=b.envMap,_=b.envMapRotation;S&&(g.envMap.value=S,g.envMapRotation.value.setFromMatrix4(M_.makeRotationFromEuler(_)).transpose(),S.isCubeTexture&&S.isRenderTargetTexture===!1&&g.envMapRotation.value.premultiply(Kf),g.reflectivity.value=p.reflectivity,g.ior.value=p.ior,g.refractionRatio.value=p.refractionRatio),p.lightMap&&(g.lightMap.value=p.lightMap,g.lightMapIntensity.value=p.lightMapIntensity,t(p.lightMap,g.lightMapTransform)),p.aoMap&&(g.aoMap.value=p.aoMap,g.aoMapIntensity.value=p.aoMapIntensity,t(p.aoMap,g.aoMapTransform))}function o(g,p){g.diffuse.value.copy(p.color),g.opacity.value=p.opacity,p.map&&(g.map.value=p.map,t(p.map,g.mapTransform))}function a(g,p){g.dashSize.value=p.dashSize,g.totalSize.value=p.dashSize+p.gapSize,g.scale.value=p.scale}function l(g,p,b,S){g.diffuse.value.copy(p.color),g.opacity.value=p.opacity,g.size.value=p.size*b,g.scale.value=S*.5,p.map&&(g.map.value=p.map,t(p.map,g.uvTransform)),p.alphaMap&&(g.alphaMap.value=p.alphaMap,t(p.alphaMap,g.alphaMapTransform)),p.alphaTest>0&&(g.alphaTest.value=p.alphaTest)}function c(g,p){g.diffuse.value.copy(p.color),g.opacity.value=p.opacity,g.rotation.value=p.rotation,p.map&&(g.map.value=p.map,t(p.map,g.mapTransform)),p.alphaMap&&(g.alphaMap.value=p.alphaMap,t(p.alphaMap,g.alphaMapTransform)),p.alphaTest>0&&(g.alphaTest.value=p.alphaTest)}function h(g,p){g.specular.value.copy(p.specular),g.shininess.value=Math.max(p.shininess,1e-4)}function d(g,p){p.gradientMap&&(g.gradientMap.value=p.gradientMap)}function u(g,p){g.metalness.value=p.metalness,p.metalnessMap&&(g.metalnessMap.value=p.metalnessMap,t(p.metalnessMap,g.metalnessMapTransform)),g.roughness.value=p.roughness,p.roughnessMap&&(g.roughnessMap.value=p.roughnessMap,t(p.roughnessMap,g.roughnessMapTransform)),p.envMap&&(g.envMapIntensity.value=p.envMapIntensity)}function f(g,p,b){g.ior.value=p.ior,p.sheen>0&&(g.sheenColor.value.copy(p.sheenColor).multiplyScalar(p.sheen),g.sheenRoughness.value=p.sheenRoughness,p.sheenColorMap&&(g.sheenColorMap.value=p.sheenColorMap,t(p.sheenColorMap,g.sheenColorMapTransform)),p.sheenRoughnessMap&&(g.sheenRoughnessMap.value=p.sheenRoughnessMap,t(p.sheenRoughnessMap,g.sheenRoughnessMapTransform))),p.clearcoat>0&&(g.clearcoat.value=p.clearcoat,g.clearcoatRoughness.value=p.clearcoatRoughness,p.clearcoatMap&&(g.clearcoatMap.value=p.clearcoatMap,t(p.clearcoatMap,g.clearcoatMapTransform)),p.clearcoatRoughnessMap&&(g.clearcoatRoughnessMap.value=p.clearcoatRoughnessMap,t(p.clearcoatRoughnessMap,g.clearcoatRoughnessMapTransform)),p.clearcoatNormalMap&&(g.clearcoatNormalMap.value=p.clearcoatNormalMap,t(p.clearcoatNormalMap,g.clearcoatNormalMapTransform),g.clearcoatNormalScale.value.copy(p.clearcoatNormalScale),p.side===jt&&g.clearcoatNormalScale.value.negate())),p.dispersion>0&&(g.dispersion.value=p.dispersion),p.iridescence>0&&(g.iridescence.value=p.iridescence,g.iridescenceIOR.value=p.iridescenceIOR,g.iridescenceThicknessMinimum.value=p.iridescenceThicknessRange[0],g.iridescenceThicknessMaximum.value=p.iridescenceThicknessRange[1],p.iridescenceMap&&(g.iridescenceMap.value=p.iridescenceMap,t(p.iridescenceMap,g.iridescenceMapTransform)),p.iridescenceThicknessMap&&(g.iridescenceThicknessMap.value=p.iridescenceThicknessMap,t(p.iridescenceThicknessMap,g.iridescenceThicknessMapTransform))),p.transmission>0&&(g.transmission.value=p.transmission,g.transmissionSamplerMap.value=b.texture,g.transmissionSamplerSize.value.set(b.width,b.height),p.transmissionMap&&(g.transmissionMap.value=p.transmissionMap,t(p.transmissionMap,g.transmissionMapTransform)),g.thickness.value=p.thickness,p.thicknessMap&&(g.thicknessMap.value=p.thicknessMap,t(p.thicknessMap,g.thicknessMapTransform)),g.attenuationDistance.value=p.attenuationDistance,g.attenuationColor.value.copy(p.attenuationColor)),p.anisotropy>0&&(g.anisotropyVector.value.set(p.anisotropy*Math.cos(p.anisotropyRotation),p.anisotropy*Math.sin(p.anisotropyRotation)),p.anisotropyMap&&(g.anisotropyMap.value=p.anisotropyMap,t(p.anisotropyMap,g.anisotropyMapTransform))),g.specularIntensity.value=p.specularIntensity,g.specularColor.value.copy(p.specularColor),p.specularColorMap&&(g.specularColorMap.value=p.specularColorMap,t(p.specularColorMap,g.specularColorMapTransform)),p.specularIntensityMap&&(g.specularIntensityMap.value=p.specularIntensityMap,t(p.specularIntensityMap,g.specularIntensityMapTransform))}function m(g,p){p.matcap&&(g.matcap.value=p.matcap)}function x(g,p){let b=e.get(p).light;g.referencePosition.value.setFromMatrixPosition(b.matrixWorld),g.nearDistance.value=b.shadow.camera.near,g.farDistance.value=b.shadow.camera.far}return{refreshFogUniforms:n,refreshMaterialUniforms:s}}function E_(i,e,t,n){let s={},r={},o=[],a=i.getParameter(i.MAX_UNIFORM_BUFFER_BINDINGS);function l(_,A){let w=A.program;n.uniformBlockBinding(_,w)}function c(_,A){let w=s[_.id];w===void 0&&(g(_),w=h(_),s[_.id]=w,_.addEventListener("dispose",b));let E=A.program;n.updateUBOMapping(_,E);let y=e.render.frame;r[_.id]!==y&&(u(_),r[_.id]=y)}function h(_){let A=d();_.__bindingPointIndex=A;let w=i.createBuffer(),E=_.__size,y=_.usage;return i.bindBuffer(i.UNIFORM_BUFFER,w),i.bufferData(i.UNIFORM_BUFFER,E,y),i.bindBuffer(i.UNIFORM_BUFFER,null),i.bindBufferBase(i.UNIFORM_BUFFER,A,w),w}function d(){for(let _=0;_<a;_++)if(o.indexOf(_)===-1)return o.push(_),_;return Le("WebGLRenderer: Maximum number of simultaneously usable uniforms groups reached."),0}function u(_){let A=s[_.id],w=_.uniforms,E=_.__cache;i.bindBuffer(i.UNIFORM_BUFFER,A);for(let y=0,T=w.length;y<T;y++){let C=w[y];if(Array.isArray(C))for(let R=0,D=C.length;R<D;R++)f(C[R],y,R,E);else f(C,y,0,E)}i.bindBuffer(i.UNIFORM_BUFFER,null)}function f(_,A,w,E){if(x(_,A,w,E)===!0){let y=_.__offset,T=_.value;if(Array.isArray(T)){let C=0;for(let R=0;R<T.length;R++){let D=T[R],I=p(D);m(D,_.__data,C),typeof D!="number"&&typeof D!="boolean"&&!D.isMatrix3&&!ArrayBuffer.isView(D)&&(C+=I.storage/Float32Array.BYTES_PER_ELEMENT)}}else m(T,_.__data,0);i.bufferSubData(i.UNIFORM_BUFFER,y,_.__data)}}function m(_,A,w){typeof _=="number"||typeof _=="boolean"?A[0]=_:_.isMatrix3?(A[0]=_.elements[0],A[1]=_.elements[1],A[2]=_.elements[2],A[3]=0,A[4]=_.elements[3],A[5]=_.elements[4],A[6]=_.elements[5],A[7]=0,A[8]=_.elements[6],A[9]=_.elements[7],A[10]=_.elements[8],A[11]=0):ArrayBuffer.isView(_)?A.set(new _.constructor(_.buffer,_.byteOffset,A.length)):_.toArray(A,w)}function x(_,A,w,E){let y=_.value,T=A+"_"+w;if(E[T]===void 0)return typeof y=="number"||typeof y=="boolean"?E[T]=y:ArrayBuffer.isView(y)?E[T]=y.slice():E[T]=y.clone(),!0;{let C=E[T];if(typeof y=="number"||typeof y=="boolean"){if(C!==y)return E[T]=y,!0}else{if(ArrayBuffer.isView(y))return!0;if(C.equals(y)===!1)return C.copy(y),!0}}return!1}function g(_){let A=_.uniforms,w=0,E=16;for(let T=0,C=A.length;T<C;T++){let R=Array.isArray(A[T])?A[T]:[A[T]];for(let D=0,I=R.length;D<I;D++){let k=R[D],F=Array.isArray(k.value)?k.value:[k.value];for(let q=0,B=F.length;q<B;q++){let $=F[q],j=p($),se=w%E,fe=se%j.boundary,_e=se+fe;w+=fe,_e!==0&&E-_e<j.storage&&(w+=E-_e),k.__data=new Float32Array(j.storage/Float32Array.BYTES_PER_ELEMENT),k.__offset=w,w+=j.storage}}}let y=w%E;return y>0&&(w+=E-y),_.__size=w,_.__cache={},this}function p(_){let A={boundary:0,storage:0};return typeof _=="number"||typeof _=="boolean"?(A.boundary=4,A.storage=4):_.isVector2?(A.boundary=8,A.storage=8):_.isVector3||_.isColor?(A.boundary=16,A.storage=12):_.isVector4?(A.boundary=16,A.storage=16):_.isMatrix3?(A.boundary=48,A.storage=48):_.isMatrix4?(A.boundary=64,A.storage=64):_.isTexture?Pe("WebGLRenderer: Texture samplers can not be part of an uniforms group."):ArrayBuffer.isView(_)?(A.boundary=16,A.storage=_.byteLength):Pe("WebGLRenderer: Unsupported uniform value type.",_),A}function b(_){let A=_.target;A.removeEventListener("dispose",b);let w=o.indexOf(A.__bindingPointIndex);o.splice(w,1),i.deleteBuffer(s[A.id]),delete s[A.id],delete r[A.id]}function S(){for(let _ in s)i.deleteBuffer(s[_]);o=[],s={},r={}}return{bind:l,update:c,dispose:S}}var T_=new Uint16Array([12469,15057,12620,14925,13266,14620,13807,14376,14323,13990,14545,13625,14713,13328,14840,12882,14931,12528,14996,12233,15039,11829,15066,11525,15080,11295,15085,10976,15082,10705,15073,10495,13880,14564,13898,14542,13977,14430,14158,14124,14393,13732,14556,13410,14702,12996,14814,12596,14891,12291,14937,11834,14957,11489,14958,11194,14943,10803,14921,10506,14893,10278,14858,9960,14484,14039,14487,14025,14499,13941,14524,13740,14574,13468,14654,13106,14743,12678,14818,12344,14867,11893,14889,11509,14893,11180,14881,10751,14852,10428,14812,10128,14765,9754,14712,9466,14764,13480,14764,13475,14766,13440,14766,13347,14769,13070,14786,12713,14816,12387,14844,11957,14860,11549,14868,11215,14855,10751,14825,10403,14782,10044,14729,9651,14666,9352,14599,9029,14967,12835,14966,12831,14963,12804,14954,12723,14936,12564,14917,12347,14900,11958,14886,11569,14878,11247,14859,10765,14828,10401,14784,10011,14727,9600,14660,9289,14586,8893,14508,8533,15111,12234,15110,12234,15104,12216,15092,12156,15067,12010,15028,11776,14981,11500,14942,11205,14902,10752,14861,10393,14812,9991,14752,9570,14682,9252,14603,8808,14519,8445,14431,8145,15209,11449,15208,11451,15202,11451,15190,11438,15163,11384,15117,11274,15055,10979,14994,10648,14932,10343,14871,9936,14803,9532,14729,9218,14645,8742,14556,8381,14461,8020,14365,7603,15273,10603,15272,10607,15267,10619,15256,10631,15231,10614,15182,10535,15118,10389,15042,10167,14963,9787,14883,9447,14800,9115,14710,8665,14615,8318,14514,7911,14411,7507,14279,7198,15314,9675,15313,9683,15309,9712,15298,9759,15277,9797,15229,9773,15166,9668,15084,9487,14995,9274,14898,8910,14800,8539,14697,8234,14590,7790,14479,7409,14367,7067,14178,6621,15337,8619,15337,8631,15333,8677,15325,8769,15305,8871,15264,8940,15202,8909,15119,8775,15022,8565,14916,8328,14804,8009,14688,7614,14569,7287,14448,6888,14321,6483,14088,6171,15350,7402,15350,7419,15347,7480,15340,7613,15322,7804,15287,7973,15229,8057,15148,8012,15046,7846,14933,7611,14810,7357,14682,7069,14552,6656,14421,6316,14251,5948,14007,5528,15356,5942,15356,5977,15353,6119,15348,6294,15332,6551,15302,6824,15249,7044,15171,7122,15070,7050,14949,6861,14818,6611,14679,6349,14538,6067,14398,5651,14189,5311,13935,4958,15359,4123,15359,4153,15356,4296,15353,4646,15338,5160,15311,5508,15263,5829,15188,6042,15088,6094,14966,6001,14826,5796,14678,5543,14527,5287,14377,4985,14133,4586,13869,4257,15360,1563,15360,1642,15358,2076,15354,2636,15341,3350,15317,4019,15273,4429,15203,4732,15105,4911,14981,4932,14836,4818,14679,4621,14517,4386,14359,4156,14083,3795,13808,3437,15360,122,15360,137,15358,285,15355,636,15344,1274,15322,2177,15281,2765,15215,3223,15120,3451,14995,3569,14846,3567,14681,3466,14511,3305,14344,3121,14037,2800,13753,2467,15360,0,15360,1,15359,21,15355,89,15346,253,15325,479,15287,796,15225,1148,15133,1492,15008,1749,14856,1882,14685,1886,14506,1783,14324,1608,13996,1398,13702,1183]),Kn=null;function A_(){return Kn===null&&(Kn=new ya(T_,16,16,Bi,$n),Kn.name="DFG_LUT",Kn.minFilter=zt,Kn.magFilter=zt,Kn.wrapS=Gn,Kn.wrapT=Gn,Kn.generateMipmaps=!1,Kn.needsUpdate=!0),Kn}var Nl=class{constructor(e={}){let{canvas:t=df(),context:n=null,depth:s=!0,stencil:r=!1,alpha:o=!1,antialias:a=!1,premultipliedAlpha:l=!0,preserveDrawingBuffer:c=!1,powerPreference:h="default",failIfMajorPerformanceCaveat:d=!1,reversedDepthBuffer:u=!1,outputBufferType:f=mn}=e;this.isWebGLRenderer=!0;let m;if(n!==null){if(typeof WebGLRenderingContext<"u"&&n instanceof WebGLRenderingContext)throw new Error("THREE.WebGLRenderer: WebGL 1 is not supported since r163.");m=n.getContextAttributes().alpha}else m=o;let x=f,g=new Set([Qa,ja,Ja]),p=new Set([mn,Fn,Gs,Ws,$a,Ka]),b=new Uint32Array(4),S=new Int32Array(4),_=new L,A=null,w=null,E=[],y=[],T=null;this.domElement=t,this.debug={checkShaderErrors:!0,onShaderError:null},this.autoClear=!0,this.autoClearColor=!0,this.autoClearDepth=!0,this.autoClearStencil=!0,this.sortObjects=!0,this.clippingPlanes=[],this.localClippingEnabled=!1,this.toneMapping=Dn,this.toneMappingExposure=1,this.transmissionResolutionScale=1;let C=this,R=!1,D=null,I=null,k=null,F=null;this._outputColorSpace=$t;let q=0,B=0,$=null,j=-1,se=null,fe=new it,_e=new it,Ke=null,pt=new qe(0),Je=0,Q=t.width,ae=t.height,ne=1,Fe=null,ze=null,Ce=new it(0,0,Q,ae),_t=new it(0,0,Q,ae),We=!1,ot=new Er,je=!1,Ye=!1,wt=new rt,Pt=new L,Ut=new it,Bt={background:null,fog:null,environment:null,overrideMaterial:null,isScene:!0},mt=!1;function Et(){return $===null?ne:1}let N=n;function en(M,O){return t.getContext(M,O)}try{let M={alpha:!0,depth:s,stencil:r,antialias:a,premultipliedAlpha:l,preserveDrawingBuffer:c,powerPreference:h,failIfMajorPerformanceCaveat:d};if("setAttribute"in t&&t.setAttribute("data-engine",`three.js r${Wa}`),t.addEventListener("webglcontextlost",gt,!1),t.addEventListener("webglcontextrestored",ct,!1),t.addEventListener("webglcontextcreationerror",On,!1),N===null){let O="webgl2";if(N=en(O,M),N===null)throw en(O)?new Error("THREE.WebGLRenderer: Error creating WebGL context with your selected attributes."):new Error("THREE.WebGLRenderer: Error creating WebGL context.")}}catch(M){throw Le("WebGLRenderer: "+M.message),M}let et,P,v,z,W,Y,ie,le,Z,J,ce,we,de,he,Ae,Ie,ke,U,oe,K,ue,ge,ee;function Me(){et=new Fy(N),et.init(),ue=new __(N,et),P=new Ty(N,et,e,ue),v=new y_(N,et),P.reversedDepthBuffer&&u&&v.buffers.depth.setReversed(!0),I=N.createFramebuffer(),k=N.createFramebuffer(),F=N.createFramebuffer(),z=new Oy(N),W=new s_,Y=new v_(N,et,v,W,P,ue,z),ie=new Dy(C),le=new Vg(N),ge=new wy(N,le),Z=new Uy(N,le,z,ge),J=new zy(N,Z,le,ge,z),U=new By(N,P,Y),Ae=new Ay(W),ce=new i_(C,ie,et,P,ge,Ae),we=new w_(C,W),de=new o_,he=new d_(et),ke=new My(C,ie,v,J,m,l),Ie=new x_(C,J,P),ee=new E_(N,z,P,v),oe=new Ey(N,et,z),K=new Ny(N,et,z),z.programs=ce.programs,C.capabilities=P,C.extensions=et,C.properties=W,C.renderLists=de,C.shadowMap=Ie,C.state=v,C.info=z}Me(),x!==mn&&(T=new Vy(x,t.width,t.height,a,s,r));let be=new ru(C,N);this.xr=be,this.getContext=function(){return N},this.getContextAttributes=function(){return N.getContextAttributes()},this.forceContextLoss=function(){let M=et.get("WEBGL_lose_context");M&&M.loseContext()},this.forceContextRestore=function(){let M=et.get("WEBGL_lose_context");M&&M.restoreContext()},this.getPixelRatio=function(){return ne},this.setPixelRatio=function(M){M!==void 0&&(ne=M,this.setSize(Q,ae,!1))},this.getSize=function(M){return M.set(Q,ae)},this.setSize=function(M,O,X=!0){if(be.isPresenting){Pe("WebGLRenderer: Can't change size while VR device is presenting.");return}Q=M,ae=O,t.width=Math.floor(M*ne),t.height=Math.floor(O*ne),X===!0&&(t.style.width=M+"px",t.style.height=O+"px"),T!==null&&T.setSize(t.width,t.height),this.setViewport(0,0,M,O)},this.getDrawingBufferSize=function(M){return M.set(Q*ne,ae*ne).floor()},this.setDrawingBufferSize=function(M,O,X){Q=M,ae=O,ne=X,t.width=Math.floor(M*X),t.height=Math.floor(O*X),this.setViewport(0,0,M,O)},this.setEffects=function(M){if(x===mn){Le("WebGLRenderer: setEffects() requires outputBufferType set to HalfFloatType or FloatType.");return}if(M){for(let O=0;O<M.length;O++)if(M[O].isOutputPass===!0){Pe("WebGLRenderer: OutputPass is not needed in setEffects(). Tone mapping and color space conversion are applied automatically.");break}}T.setEffects(M||[])},this.getCurrentViewport=function(M){return M.copy(fe)},this.getViewport=function(M){return M.copy(Ce)},this.setViewport=function(M,O,X,H){M.isVector4?Ce.set(M.x,M.y,M.z,M.w):Ce.set(M,O,X,H),v.viewport(fe.copy(Ce).multiplyScalar(ne).round())},this.getScissor=function(M){return M.copy(_t)},this.setScissor=function(M,O,X,H){M.isVector4?_t.set(M.x,M.y,M.z,M.w):_t.set(M,O,X,H),v.scissor(_e.copy(_t).multiplyScalar(ne).round())},this.getScissorTest=function(){return We},this.setScissorTest=function(M){v.setScissorTest(We=M)},this.setOpaqueSort=function(M){Fe=M},this.setTransparentSort=function(M){ze=M},this.getClearColor=function(M){return M.copy(ke.getClearColor())},this.setClearColor=function(){ke.setClearColor(...arguments)},this.getClearAlpha=function(){return ke.getClearAlpha()},this.setClearAlpha=function(){ke.setClearAlpha(...arguments)},this.clear=function(M=!0,O=!0,X=!0){let H=0;if(M){let G=!1;if($!==null){let me=$.texture.format;G=g.has(me)}if(G){let me=$.texture.type,ve=p.has(me),pe=ke.getClearColor(),Se=ke.getClearAlpha(),Ee=pe.r,Ve=pe.g,Ge=pe.b;ve?(b[0]=Ee,b[1]=Ve,b[2]=Ge,b[3]=Se,N.clearBufferuiv(N.COLOR,0,b)):(S[0]=Ee,S[1]=Ve,S[2]=Ge,S[3]=Se,N.clearBufferiv(N.COLOR,0,S))}else H|=N.COLOR_BUFFER_BIT}O&&(H|=N.DEPTH_BUFFER_BIT,this.state.buffers.depth.setMask(!0)),X&&(H|=N.STENCIL_BUFFER_BIT,this.state.buffers.stencil.setMask(4294967295)),H!==0&&N.clear(H)},this.clearColor=function(){this.clear(!0,!1,!1)},this.clearDepth=function(){this.clear(!1,!0,!1)},this.clearStencil=function(){this.clear(!1,!1,!0)},this.setNodesHandler=function(M){M.setRenderer(this),D=M},this.dispose=function(){t.removeEventListener("webglcontextlost",gt,!1),t.removeEventListener("webglcontextrestored",ct,!1),t.removeEventListener("webglcontextcreationerror",On,!1),ke.dispose(),de.dispose(),he.dispose(),W.dispose(),ie.dispose(),J.dispose(),ge.dispose(),ee.dispose(),ce.dispose(),be.dispose(),be.removeEventListener("sessionstart",Ru),be.removeEventListener("sessionend",Cu),Hi.stop()};function gt(M){M.preventDefault(),yr("WebGLRenderer: Context Lost."),R=!0}function ct(){yr("WebGLRenderer: Context Restored."),R=!1;let M=z.autoReset,O=Ie.enabled,X=Ie.autoUpdate,H=Ie.needsUpdate,G=Ie.type;Me(),z.autoReset=M,Ie.enabled=O,Ie.autoUpdate=X,Ie.needsUpdate=H,Ie.type=G}function On(M){Le("WebGLRenderer: A WebGL context could not be created. Reason: ",M.statusMessage)}function Bn(M){let O=M.target;O.removeEventListener("dispose",Bn),Vp(O)}function Vp(M){Hp(M),W.remove(M)}function Hp(M){let O=W.get(M).programs;O!==void 0&&(O.forEach(function(X){ce.releaseProgram(X)}),M.isShaderMaterial&&ce.releaseShaderCache(M))}this.renderBufferDirect=function(M,O,X,H,G,me){O===null&&(O=Bt);let ve=G.isMesh&&G.matrixWorld.determinantAffine()<0,pe=Xp(M,O,X,H,G);v.setMaterial(H,ve);let Se=X.index,Ee=1;if(H.wireframe===!0){if(Se=Z.getWireframeAttribute(X),Se===void 0)return;Ee=2}let Ve=X.drawRange,Ge=X.attributes.position,Te=Ve.start*Ee,st=(Ve.start+Ve.count)*Ee;me!==null&&(Te=Math.max(Te,me.start*Ee),st=Math.min(st,(me.start+me.count)*Ee)),Se!==null?(Te=Math.max(Te,0),st=Math.min(st,Se.count)):Ge!=null&&(Te=Math.max(Te,0),st=Math.min(st,Ge.count));let bt=st-Te;if(bt<0||bt===1/0)return;ge.setup(G,H,pe,X,Se);let xt,at=oe;if(Se!==null&&(xt=le.get(Se),at=K,at.setIndex(xt)),G.isMesh)H.wireframe===!0?(v.setLineWidth(H.wireframeLinewidth*Et()),at.setMode(N.LINES)):at.setMode(N.TRIANGLES);else if(G.isLine){let Gt=H.linewidth;Gt===void 0&&(Gt=1),v.setLineWidth(Gt*Et()),G.isLineSegments?at.setMode(N.LINES):G.isLineLoop?at.setMode(N.LINE_LOOP):at.setMode(N.LINE_STRIP)}else G.isPoints?at.setMode(N.POINTS):G.isSprite&&at.setMode(N.TRIANGLES);if(G.isBatchedMesh)if(et.get("WEBGL_multi_draw"))at.renderMultiDraw(G._multiDrawStarts,G._multiDrawCounts,G._multiDrawCount);else{let Gt=G._multiDrawStarts,ye=G._multiDrawCounts,on=G._multiDrawCount,Ze=Se?le.get(Se).bytesPerElement:1,xn=W.get(H).currentProgram.getUniforms();for(let zn=0;zn<on;zn++)xn.setValue(N,"_gl_DrawID",zn),at.render(Gt[zn]/Ze,ye[zn])}else if(G.isInstancedMesh)at.renderInstances(Te,bt,G.count);else if(X.isInstancedBufferGeometry){let Gt=X._maxInstanceCount!==void 0?X._maxInstanceCount:1/0,ye=Math.min(X.instanceCount,Gt);at.renderInstances(Te,bt,ye)}else at.render(Te,bt)};function Pu(M,O,X){M.transparent===!0&&M.side===rn&&M.forceSinglePass===!1?(M.side=jt,M.needsUpdate=!0,xo(M,O,X),M.side=li,M.needsUpdate=!0,xo(M,O,X),M.side=rn):xo(M,O,X)}this.compile=function(M,O,X=null){X===null&&(X=M),w=he.get(X),w.init(O),y.push(w),X.traverseVisible(function(G){G.isLight&&G.layers.test(O.layers)&&(w.pushLight(G),G.castShadow&&w.pushShadow(G))}),M!==X&&M.traverseVisible(function(G){G.isLight&&G.layers.test(O.layers)&&(w.pushLight(G),G.castShadow&&w.pushShadow(G))}),w.setupLights();let H=new Set;return M.traverse(function(G){if(!(G.isMesh||G.isPoints||G.isLine||G.isSprite))return;let me=G.material;if(me)if(Array.isArray(me))for(let ve=0;ve<me.length;ve++){let pe=me[ve];Pu(pe,X,G),H.add(pe)}else Pu(me,X,G),H.add(me)}),w=y.pop(),H},this.compileAsync=function(M,O,X=null){let H=this.compile(M,O,X);return new Promise(G=>{function me(){if(H.forEach(function(ve){W.get(ve).currentProgram.isReady()&&H.delete(ve)}),H.size===0){G(M);return}setTimeout(me,10)}et.get("KHR_parallel_shader_compile")!==null?me():setTimeout(me,10)})};let mc=null;function Gp(M){mc&&mc(M)}function Ru(){Hi.stop()}function Cu(){Hi.start()}let Hi=new Wf;Hi.setAnimationLoop(Gp),typeof self<"u"&&Hi.setContext(self),this.setAnimationLoop=function(M){mc=M,be.setAnimationLoop(M),M===null?Hi.stop():Hi.start()},be.addEventListener("sessionstart",Ru),be.addEventListener("sessionend",Cu),this.render=function(M,O){if(O!==void 0&&O.isCamera!==!0){Le("WebGLRenderer.render: camera is not an instance of THREE.Camera.");return}if(R===!0)return;D!==null&&D.renderStart(M,O);let X=be.enabled===!0&&be.isPresenting===!0,H=T!==null&&($===null||X)&&T.begin(C,$);if(M.matrixWorldAutoUpdate===!0&&M.updateMatrixWorld(),O.parent===null&&O.matrixWorldAutoUpdate===!0&&O.updateMatrixWorld(),be.enabled===!0&&be.isPresenting===!0&&(T===null||T.isCompositing()===!1)&&(be.cameraAutoUpdate===!0&&be.updateCamera(O),O=be.getCamera()),M.isScene===!0&&M.onBeforeRender(C,M,O,$),w=he.get(M,y.length),w.init(O),w.state.textureUnits=Y.getTextureUnits(),y.push(w),wt.multiplyMatrices(O.projectionMatrix,O.matrixWorldInverse),ot.setFromProjectionMatrix(wt,Pn,O.reversedDepth),Ye=this.localClippingEnabled,je=Ae.init(this.clippingPlanes,Ye),A=de.get(M,E.length),A.init(),E.push(A),be.enabled===!0&&be.isPresenting===!0){let ve=C.xr.getDepthSensingMesh();ve!==null&&gc(ve,O,-1/0,C.sortObjects)}gc(M,O,0,C.sortObjects),A.finish(),C.sortObjects===!0&&A.sort(Fe,ze,O.reversedDepth),mt=be.enabled===!1||be.isPresenting===!1||be.hasDepthSensing()===!1,mt&&ke.addToRenderList(A,M),this.info.render.frame++,this.info.autoReset===!0&&this.info.reset(),je===!0&&Ae.beginShadows();let G=w.state.shadowsArray;if(Ie.render(G,M,O),je===!0&&Ae.endShadows(),(H&&T.hasRenderPass())===!1){let ve=A.opaque,pe=A.transmissive;if(w.setupLights(),O.isArrayCamera){let Se=O.cameras;if(pe.length>0)for(let Ee=0,Ve=Se.length;Ee<Ve;Ee++){let Ge=Se[Ee];Lu(ve,pe,M,Ge)}mt&&ke.render(M);for(let Ee=0,Ve=Se.length;Ee<Ve;Ee++){let Ge=Se[Ee];Iu(A,M,Ge,Ge.viewport)}}else pe.length>0&&Lu(ve,pe,M,O),mt&&ke.render(M),Iu(A,M,O)}$!==null&&B===0&&(Y.updateMultisampleRenderTarget($),Y.updateRenderTargetMipmap($)),H&&T.end(C),M.isScene===!0&&M.onAfterRender(C,M,O),ge.resetDefaultState(),j=-1,se=null,y.pop(),y.length>0?(w=y[y.length-1],Y.setTextureUnits(w.state.textureUnits),je===!0&&Ae.setGlobalState(C.clippingPlanes,w.state.camera)):w=null,E.pop(),E.length>0?A=E[E.length-1]:A=null,D!==null&&D.renderEnd()};function gc(M,O,X,H){if(M.visible===!1)return;if(M.layers.test(O.layers)){if(M.isGroup)X=M.renderOrder;else if(M.isLOD)M.autoUpdate===!0&&M.update(O);else if(M.isLightProbeGrid)w.pushLightProbeGrid(M);else if(M.isLight)w.pushLight(M),M.castShadow&&w.pushShadow(M);else if(M.isSprite){if(!M.frustumCulled||ot.intersectsSprite(M)){H&&Ut.setFromMatrixPosition(M.matrixWorld).applyMatrix4(wt);let ve=J.update(M),pe=M.material;pe.visible&&A.push(M,ve,pe,X,Ut.z,null)}}else if((M.isMesh||M.isLine||M.isPoints)&&(!M.frustumCulled||ot.intersectsObject(M))){let ve=J.update(M),pe=M.material;if(H&&(M.boundingSphere!==void 0?(M.boundingSphere===null&&M.computeBoundingSphere(),Ut.copy(M.boundingSphere.center)):(ve.boundingSphere===null&&ve.computeBoundingSphere(),Ut.copy(ve.boundingSphere.center)),Ut.applyMatrix4(M.matrixWorld).applyMatrix4(wt)),Array.isArray(pe)){let Se=ve.groups;for(let Ee=0,Ve=Se.length;Ee<Ve;Ee++){let Ge=Se[Ee],Te=pe[Ge.materialIndex];Te&&Te.visible&&A.push(M,ve,Te,X,Ut.z,Ge)}}else pe.visible&&A.push(M,ve,pe,X,Ut.z,null)}}let me=M.children;for(let ve=0,pe=me.length;ve<pe;ve++)gc(me[ve],O,X,H)}function Iu(M,O,X,H){let{opaque:G,transmissive:me,transparent:ve}=M;w.setupLightsView(X),je===!0&&Ae.setGlobalState(C.clippingPlanes,X),H&&v.viewport(fe.copy(H)),G.length>0&&go(G,O,X),me.length>0&&go(me,O,X),ve.length>0&&go(ve,O,X),v.buffers.depth.setTest(!0),v.buffers.depth.setMask(!0),v.buffers.color.setMask(!0),v.setPolygonOffset(!1)}function Lu(M,O,X,H){if((X.isScene===!0?X.overrideMaterial:null)!==null)return;if(w.state.transmissionRenderTarget[H.id]===void 0){let Te=et.has("EXT_color_buffer_half_float")||et.has("EXT_color_buffer_float");w.state.transmissionRenderTarget[H.id]=new hn(1,1,{generateMipmaps:!0,type:Te?$n:mn,minFilter:Ni,samples:Math.max(4,P.samples),stencilBuffer:r,resolveDepthBuffer:!1,resolveStencilBuffer:!1,colorSpace:Xe.workingColorSpace})}let me=w.state.transmissionRenderTarget[H.id],ve=H.viewport||fe;me.setSize(ve.z*C.transmissionResolutionScale,ve.w*C.transmissionResolutionScale);let pe=C.getRenderTarget(),Se=C.getActiveCubeFace(),Ee=C.getActiveMipmapLevel();C.setRenderTarget(me),C.getClearColor(pt),Je=C.getClearAlpha(),Je<1&&C.setClearColor(16777215,.5),C.clear(),mt&&ke.render(X);let Ve=C.toneMapping;C.toneMapping=Dn;let Ge=H.viewport;if(H.viewport!==void 0&&(H.viewport=void 0),w.setupLightsView(H),je===!0&&Ae.setGlobalState(C.clippingPlanes,H),go(M,X,H),Y.updateMultisampleRenderTarget(me),Y.updateRenderTargetMipmap(me),et.has("WEBGL_multisampled_render_to_texture")===!1){let Te=!1;for(let st=0,bt=O.length;st<bt;st++){let xt=O[st],{object:at,geometry:Gt,material:ye,group:on}=xt;if(ye.side===rn&&at.layers.test(H.layers)){let Ze=ye.side;ye.side=jt,ye.needsUpdate=!0,Du(at,X,H,Gt,ye,on),ye.side=Ze,ye.needsUpdate=!0,Te=!0}}Te===!0&&(Y.updateMultisampleRenderTarget(me),Y.updateRenderTargetMipmap(me))}C.setRenderTarget(pe,Se,Ee),C.setClearColor(pt,Je),Ge!==void 0&&(H.viewport=Ge),C.toneMapping=Ve}function go(M,O,X){let H=O.isScene===!0?O.overrideMaterial:null;for(let G=0,me=M.length;G<me;G++){let ve=M[G],{object:pe,geometry:Se,group:Ee}=ve,Ve=ve.material;Ve.allowOverride===!0&&H!==null&&(Ve=H),pe.layers.test(X.layers)&&Du(pe,O,X,Se,Ve,Ee)}}function Du(M,O,X,H,G,me){M.onBeforeRender(C,O,X,H,G,me),M.modelViewMatrix.multiplyMatrices(X.matrixWorldInverse,M.matrixWorld),M.normalMatrix.getNormalMatrix(M.modelViewMatrix),G.onBeforeRender(C,O,X,H,M,me),G.transparent===!0&&G.side===rn&&G.forceSinglePass===!1?(G.side=jt,G.needsUpdate=!0,C.renderBufferDirect(X,O,H,G,M,me),G.side=li,G.needsUpdate=!0,C.renderBufferDirect(X,O,H,G,M,me),G.side=rn):C.renderBufferDirect(X,O,H,G,M,me),M.onAfterRender(C,O,X,H,G,me)}function xo(M,O,X){O.isScene!==!0&&(O=Bt);let H=W.get(M),G=w.state.lights,me=w.state.shadowsArray,ve=G.state.version,pe=ce.getParameters(M,G.state,me,O,X,w.state.lightProbeGridArray),Se=ce.getProgramCacheKey(pe),Ee=H.programs;H.environment=M.isMeshStandardMaterial||M.isMeshLambertMaterial||M.isMeshPhongMaterial?O.environment:null,H.fog=O.fog;let Ve=M.isMeshStandardMaterial||M.isMeshLambertMaterial&&!M.envMap||M.isMeshPhongMaterial&&!M.envMap;H.envMap=ie.get(M.envMap||H.environment,Ve),H.envMapRotation=H.environment!==null&&M.envMap===null?O.environmentRotation:M.envMapRotation,Ee===void 0&&(M.addEventListener("dispose",Bn),Ee=new Map,H.programs=Ee);let Ge=Ee.get(Se);if(Ge!==void 0){if(H.currentProgram===Ge&&H.lightsStateVersion===ve)return Uu(M,pe),Ge}else pe.uniforms=ce.getUniforms(M),D!==null&&M.isNodeMaterial&&D.build(M,X,pe),M.onBeforeCompile(pe,C),Ge=ce.acquireProgram(pe,Se),Ee.set(Se,Ge),H.uniforms=pe.uniforms;let Te=H.uniforms;return(!M.isShaderMaterial&&!M.isRawShaderMaterial||M.clipping===!0)&&(Te.clippingPlanes=Ae.uniform),Uu(M,pe),H.needsLights=Yp(M),H.lightsStateVersion=ve,H.needsLights&&(Te.ambientLightColor.value=G.state.ambient,Te.lightProbe.value=G.state.probe,Te.directionalLights.value=G.state.directional,Te.directionalLightShadows.value=G.state.directionalShadow,Te.spotLights.value=G.state.spot,Te.spotLightShadows.value=G.state.spotShadow,Te.rectAreaLights.value=G.state.rectArea,Te.ltc_1.value=G.state.rectAreaLTC1,Te.ltc_2.value=G.state.rectAreaLTC2,Te.pointLights.value=G.state.point,Te.pointLightShadows.value=G.state.pointShadow,Te.hemisphereLights.value=G.state.hemi,Te.directionalShadowMatrix.value=G.state.directionalShadowMatrix,Te.spotLightMatrix.value=G.state.spotLightMatrix,Te.spotLightMap.value=G.state.spotLightMap,Te.pointShadowMatrix.value=G.state.pointShadowMatrix),H.lightProbeGrid=w.state.lightProbeGridArray.length>0,H.currentProgram=Ge,H.uniformsList=null,Ge}function Fu(M){if(M.uniformsList===null){let O=M.currentProgram.getUniforms();M.uniformsList=qs.seqWithValue(O.seq,M.uniforms)}return M.uniformsList}function Uu(M,O){let X=W.get(M);X.outputColorSpace=O.outputColorSpace,X.batching=O.batching,X.batchingColor=O.batchingColor,X.instancing=O.instancing,X.instancingColor=O.instancingColor,X.instancingMorph=O.instancingMorph,X.skinning=O.skinning,X.morphTargets=O.morphTargets,X.morphNormals=O.morphNormals,X.morphColors=O.morphColors,X.morphTargetsCount=O.morphTargetsCount,X.numClippingPlanes=O.numClippingPlanes,X.numIntersection=O.numClipIntersection,X.vertexAlphas=O.vertexAlphas,X.vertexTangents=O.vertexTangents,X.toneMapping=O.toneMapping}function Wp(M,O){if(M.length===0)return null;if(M.length===1)return M[0].texture!==null?M[0]:null;_.setFromMatrixPosition(O.matrixWorld);for(let X=0,H=M.length;X<H;X++){let G=M[X];if(G.texture!==null&&G.boundingBox.containsPoint(_))return G}return null}function Xp(M,O,X,H,G){O.isScene!==!0&&(O=Bt),Y.resetTextureUnits();let me=O.fog,ve=H.isMeshStandardMaterial||H.isMeshLambertMaterial||H.isMeshPhongMaterial?O.environment:null,pe=$===null?C.outputColorSpace:$.isXRRenderTarget===!0?$.texture.colorSpace:Xe.workingColorSpace,Se=H.isMeshStandardMaterial||H.isMeshLambertMaterial&&!H.envMap||H.isMeshPhongMaterial&&!H.envMap,Ee=ie.get(H.envMap||ve,Se),Ve=H.vertexColors===!0&&!!X.attributes.color&&X.attributes.color.itemSize===4,Ge=!!X.attributes.tangent&&(!!H.normalMap||H.anisotropy>0),Te=!!X.morphAttributes.position,st=!!X.morphAttributes.normal,bt=!!X.morphAttributes.color,xt=Dn;H.toneMapped&&($===null||$.isXRRenderTarget===!0)&&(xt=C.toneMapping);let at=X.morphAttributes.position||X.morphAttributes.normal||X.morphAttributes.color,Gt=at!==void 0?at.length:0,ye=W.get(H),on=w.state.lights;if(je===!0&&(Ye===!0||M!==se)){let ht=M===se&&H.id===j;Ae.setState(H,M,ht)}let Ze=!1;H.version===ye.__version?(ye.needsLights&&ye.lightsStateVersion!==on.state.version||ye.outputColorSpace!==pe||G.isBatchedMesh&&ye.batching===!1||!G.isBatchedMesh&&ye.batching===!0||G.isBatchedMesh&&ye.batchingColor===!0&&G.colorTexture===null||G.isBatchedMesh&&ye.batchingColor===!1&&G.colorTexture!==null||G.isInstancedMesh&&ye.instancing===!1||!G.isInstancedMesh&&ye.instancing===!0||G.isSkinnedMesh&&ye.skinning===!1||!G.isSkinnedMesh&&ye.skinning===!0||G.isInstancedMesh&&ye.instancingColor===!0&&G.instanceColor===null||G.isInstancedMesh&&ye.instancingColor===!1&&G.instanceColor!==null||G.isInstancedMesh&&ye.instancingMorph===!0&&G.morphTexture===null||G.isInstancedMesh&&ye.instancingMorph===!1&&G.morphTexture!==null||ye.envMap!==Ee||H.fog===!0&&ye.fog!==me||ye.numClippingPlanes!==void 0&&(ye.numClippingPlanes!==Ae.numPlanes||ye.numIntersection!==Ae.numIntersection)||ye.vertexAlphas!==Ve||ye.vertexTangents!==Ge||ye.morphTargets!==Te||ye.morphNormals!==st||ye.morphColors!==bt||ye.toneMapping!==xt||ye.morphTargetsCount!==Gt||!!ye.lightProbeGrid!=w.state.lightProbeGridArray.length>0)&&(Ze=!0):(Ze=!0,ye.__version=H.version);let xn=ye.currentProgram;Ze===!0&&(xn=xo(H,O,G),D&&H.isNodeMaterial&&D.onUpdateProgram(H,xn,ye));let zn=!1,fi=!1,fs=!1,lt=xn.getUniforms(),St=ye.uniforms;if(v.useProgram(xn.program)&&(zn=!0,fi=!0,fs=!0),H.id!==j&&(j=H.id,fi=!0),ye.needsLights){let ht=Wp(w.state.lightProbeGridArray,G);ye.lightProbeGrid!==ht&&(ye.lightProbeGrid=ht,fi=!0)}if(zn||se!==M){v.buffers.depth.getReversed()&&M.reversedDepth!==!0&&(M._reversedDepth=!0,M.updateProjectionMatrix()),lt.setValue(N,"projectionMatrix",M.projectionMatrix),lt.setValue(N,"viewMatrix",M.matrixWorldInverse);let mi=lt.map.cameraPosition;mi!==void 0&&mi.setValue(N,Pt.setFromMatrixPosition(M.matrixWorld)),P.logarithmicDepthBuffer&&lt.setValue(N,"logDepthBufFC",2/(Math.log(M.far+1)/Math.LN2)),(H.isMeshPhongMaterial||H.isMeshToonMaterial||H.isMeshLambertMaterial||H.isMeshBasicMaterial||H.isMeshStandardMaterial||H.isShaderMaterial)&&lt.setValue(N,"isOrthographic",M.isOrthographicCamera===!0),se!==M&&(se=M,fi=!0,fs=!0)}if(ye.needsLights&&(on.state.directionalShadowMap.length>0&&lt.setValue(N,"directionalShadowMap",on.state.directionalShadowMap,Y),on.state.spotShadowMap.length>0&&lt.setValue(N,"spotShadowMap",on.state.spotShadowMap,Y),on.state.pointShadowMap.length>0&&lt.setValue(N,"pointShadowMap",on.state.pointShadowMap,Y)),G.isSkinnedMesh){lt.setOptional(N,G,"bindMatrix"),lt.setOptional(N,G,"bindMatrixInverse");let ht=G.skeleton;ht&&(ht.boneTexture===null&&ht.computeBoneTexture(),lt.setValue(N,"boneTexture",ht.boneTexture,Y))}G.isBatchedMesh&&(lt.setOptional(N,G,"batchingTexture"),lt.setValue(N,"batchingTexture",G._matricesTexture,Y),lt.setOptional(N,G,"batchingIdTexture"),lt.setValue(N,"batchingIdTexture",G._indirectTexture,Y),lt.setOptional(N,G,"batchingColorTexture"),G._colorsTexture!==null&&lt.setValue(N,"batchingColorTexture",G._colorsTexture,Y));let pi=X.morphAttributes;if((pi.position!==void 0||pi.normal!==void 0||pi.color!==void 0)&&U.update(G,X,xn),(fi||ye.receiveShadow!==G.receiveShadow)&&(ye.receiveShadow=G.receiveShadow,lt.setValue(N,"receiveShadow",G.receiveShadow)),(H.isMeshStandardMaterial||H.isMeshLambertMaterial||H.isMeshPhongMaterial)&&H.envMap===null&&O.environment!==null&&(St.envMapIntensity.value=O.environmentIntensity),St.dfgLUT!==void 0&&(St.dfgLUT.value=A_()),fi){if(lt.setValue(N,"toneMappingExposure",C.toneMappingExposure),ye.needsLights&&qp(St,fs),me&&H.fog===!0&&we.refreshFogUniforms(St,me),we.refreshMaterialUniforms(St,H,ne,ae,w.state.transmissionRenderTarget[M.id]),ye.needsLights&&ye.lightProbeGrid){let ht=ye.lightProbeGrid;St.probesSH.value=ht.texture,St.probesMin.value.copy(ht.boundingBox.min),St.probesMax.value.copy(ht.boundingBox.max),St.probesResolution.value.copy(ht.resolution)}qs.upload(N,Fu(ye),St,Y)}if(H.isShaderMaterial&&H.uniformsNeedUpdate===!0&&(qs.upload(N,Fu(ye),St,Y),H.uniformsNeedUpdate=!1),H.isSpriteMaterial&&lt.setValue(N,"center",G.center),lt.setValue(N,"modelViewMatrix",G.modelViewMatrix),lt.setValue(N,"normalMatrix",G.normalMatrix),lt.setValue(N,"modelMatrix",G.matrixWorld),H.uniformsGroups!==void 0){let ht=H.uniformsGroups;for(let mi=0,ps=ht.length;mi<ps;mi++){let Nu=ht[mi];ee.update(Nu,xn),ee.bind(Nu,xn)}}return xn}function qp(M,O){M.ambientLightColor.needsUpdate=O,M.lightProbe.needsUpdate=O,M.directionalLights.needsUpdate=O,M.directionalLightShadows.needsUpdate=O,M.pointLights.needsUpdate=O,M.pointLightShadows.needsUpdate=O,M.spotLights.needsUpdate=O,M.spotLightShadows.needsUpdate=O,M.rectAreaLights.needsUpdate=O,M.hemisphereLights.needsUpdate=O}function Yp(M){return M.isMeshLambertMaterial||M.isMeshToonMaterial||M.isMeshPhongMaterial||M.isMeshStandardMaterial||M.isShadowMaterial||M.isShaderMaterial&&M.lights===!0}this.getActiveCubeFace=function(){return q},this.getActiveMipmapLevel=function(){return B},this.getRenderTarget=function(){return $},this.setRenderTargetTextures=function(M,O,X){let H=W.get(M);H.__autoAllocateDepthBuffer=M.resolveDepthBuffer===!1,H.__autoAllocateDepthBuffer===!1&&(H.__useRenderToTexture=!1),W.get(M.texture).__webglTexture=O,W.get(M.depthTexture).__webglTexture=H.__autoAllocateDepthBuffer?void 0:X,H.__hasExternalTextures=!0},this.setRenderTargetFramebuffer=function(M,O){let X=W.get(M);X.__webglFramebuffer=O,X.__useDefaultFramebuffer=O===void 0},this.setRenderTarget=function(M,O=0,X=0){$=M,q=O,B=X;let H=null,G=!1,me=!1;if(M){let pe=W.get(M);if(pe.__useDefaultFramebuffer!==void 0){v.bindFramebuffer(N.FRAMEBUFFER,pe.__webglFramebuffer),fe.copy(M.viewport),_e.copy(M.scissor),Ke=M.scissorTest,v.viewport(fe),v.scissor(_e),v.setScissorTest(Ke),j=-1;return}else if(pe.__webglFramebuffer===void 0)Y.setupRenderTarget(M);else if(pe.__hasExternalTextures)Y.rebindTextures(M,W.get(M.texture).__webglTexture,W.get(M.depthTexture).__webglTexture);else if(M.depthBuffer){let Ve=M.depthTexture;if(pe.__boundDepthTexture!==Ve){if(Ve!==null&&W.has(Ve)&&(M.width!==Ve.image.width||M.height!==Ve.image.height))throw new Error("THREE.WebGLRenderer: Attached DepthTexture is initialized to the incorrect size.");Y.setupDepthRenderbuffer(M)}}let Se=M.texture;(Se.isData3DTexture||Se.isDataArrayTexture||Se.isCompressedArrayTexture)&&(me=!0);let Ee=W.get(M).__webglFramebuffer;M.isWebGLCubeRenderTarget?(Array.isArray(Ee[O])?H=Ee[O][X]:H=Ee[O],G=!0):M.samples>0&&Y.useMultisampledRTT(M)===!1?H=W.get(M).__webglMultisampledFramebuffer:Array.isArray(Ee)?H=Ee[X]:H=Ee,fe.copy(M.viewport),_e.copy(M.scissor),Ke=M.scissorTest}else fe.copy(Ce).multiplyScalar(ne).floor(),_e.copy(_t).multiplyScalar(ne).floor(),Ke=We;if(X!==0&&(H=I),v.bindFramebuffer(N.FRAMEBUFFER,H)&&v.drawBuffers(M,H),v.viewport(fe),v.scissor(_e),v.setScissorTest(Ke),G){let pe=W.get(M.texture);N.framebufferTexture2D(N.FRAMEBUFFER,N.COLOR_ATTACHMENT0,N.TEXTURE_CUBE_MAP_POSITIVE_X+O,pe.__webglTexture,X)}else if(me){let pe=O;for(let Se=0;Se<M.textures.length;Se++){let Ee=W.get(M.textures[Se]);N.framebufferTextureLayer(N.FRAMEBUFFER,N.COLOR_ATTACHMENT0+Se,Ee.__webglTexture,X,pe)}}else if(M!==null&&X!==0){let pe=W.get(M.texture);N.framebufferTexture2D(N.FRAMEBUFFER,N.COLOR_ATTACHMENT0,N.TEXTURE_2D,pe.__webglTexture,X)}j=-1},this.readRenderTargetPixels=function(M,O,X,H,G,me,ve,pe=0){if(!(M&&M.isWebGLRenderTarget)){Le("WebGLRenderer.readRenderTargetPixels: renderTarget is not THREE.WebGLRenderTarget.");return}let Se=W.get(M).__webglFramebuffer;if(M.isWebGLCubeRenderTarget&&ve!==void 0&&(Se=Se[ve]),Se){v.bindFramebuffer(N.FRAMEBUFFER,Se);try{let Ee=M.textures[pe],Ve=Ee.format,Ge=Ee.type;if(M.textures.length>1&&N.readBuffer(N.COLOR_ATTACHMENT0+pe),!P.textureFormatReadable(Ve)){Le("WebGLRenderer.readRenderTargetPixels: renderTarget is not in RGBA or implementation defined format.");return}if(!P.textureTypeReadable(Ge)){Le("WebGLRenderer.readRenderTargetPixels: renderTarget is not in UnsignedByteType or implementation defined type.");return}O>=0&&O<=M.width-H&&X>=0&&X<=M.height-G&&N.readPixels(O,X,H,G,ue.convert(Ve),ue.convert(Ge),me)}finally{let Ee=$!==null?W.get($).__webglFramebuffer:null;v.bindFramebuffer(N.FRAMEBUFFER,Ee)}}},this.readRenderTargetPixelsAsync=async function(M,O,X,H,G,me,ve,pe=0){if(!(M&&M.isWebGLRenderTarget))throw new Error("THREE.WebGLRenderer.readRenderTargetPixels: renderTarget is not THREE.WebGLRenderTarget.");let Se=W.get(M).__webglFramebuffer;if(M.isWebGLCubeRenderTarget&&ve!==void 0&&(Se=Se[ve]),Se)if(O>=0&&O<=M.width-H&&X>=0&&X<=M.height-G){v.bindFramebuffer(N.FRAMEBUFFER,Se);let Ee=M.textures[pe],Ve=Ee.format,Ge=Ee.type;if(M.textures.length>1&&N.readBuffer(N.COLOR_ATTACHMENT0+pe),!P.textureFormatReadable(Ve))throw new Error("THREE.WebGLRenderer.readRenderTargetPixelsAsync: renderTarget is not in RGBA or implementation defined format.");if(!P.textureTypeReadable(Ge))throw new Error("THREE.WebGLRenderer.readRenderTargetPixelsAsync: renderTarget is not in UnsignedByteType or implementation defined type.");let Te=N.createBuffer();N.bindBuffer(N.PIXEL_PACK_BUFFER,Te),N.bufferData(N.PIXEL_PACK_BUFFER,me.byteLength,N.STREAM_READ),N.readPixels(O,X,H,G,ue.convert(Ve),ue.convert(Ge),0);let st=$!==null?W.get($).__webglFramebuffer:null;v.bindFramebuffer(N.FRAMEBUFFER,st);let bt=N.fenceSync(N.SYNC_GPU_COMMANDS_COMPLETE,0);return N.flush(),await pf(N,bt,4),N.bindBuffer(N.PIXEL_PACK_BUFFER,Te),N.getBufferSubData(N.PIXEL_PACK_BUFFER,0,me),N.deleteBuffer(Te),N.deleteSync(bt),me}else throw new Error("THREE.WebGLRenderer.readRenderTargetPixelsAsync: requested read bounds are out of range.")},this.copyFramebufferToTexture=function(M,O=null,X=0){let H=Math.pow(2,-X),G=Math.floor(M.image.width*H),me=Math.floor(M.image.height*H),ve=O!==null?O.x:0,pe=O!==null?O.y:0;Y.setTexture2D(M,0),N.copyTexSubImage2D(N.TEXTURE_2D,X,0,0,ve,pe,G,me),v.unbindTexture()},this.copyTextureToTexture=function(M,O,X=null,H=null,G=0,me=0){let ve,pe,Se,Ee,Ve,Ge,Te,st,bt,xt=M.isCompressedTexture?M.mipmaps[me]:M.image;if(X!==null)ve=X.max.x-X.min.x,pe=X.max.y-X.min.y,Se=X.isBox3?X.max.z-X.min.z:1,Ee=X.min.x,Ve=X.min.y,Ge=X.isBox3?X.min.z:0;else{let St=Math.pow(2,-G);ve=Math.floor(xt.width*St),pe=Math.floor(xt.height*St),M.isDataArrayTexture?Se=xt.depth:M.isData3DTexture?Se=Math.floor(xt.depth*St):Se=1,Ee=0,Ve=0,Ge=0}H!==null?(Te=H.x,st=H.y,bt=H.z):(Te=0,st=0,bt=0);let at=ue.convert(O.format),Gt=ue.convert(O.type),ye;O.isData3DTexture?(Y.setTexture3D(O,0),ye=N.TEXTURE_3D):O.isDataArrayTexture||O.isCompressedArrayTexture?(Y.setTexture2DArray(O,0),ye=N.TEXTURE_2D_ARRAY):(Y.setTexture2D(O,0),ye=N.TEXTURE_2D),v.activeTexture(N.TEXTURE0),v.pixelStorei(N.UNPACK_FLIP_Y_WEBGL,O.flipY),v.pixelStorei(N.UNPACK_PREMULTIPLY_ALPHA_WEBGL,O.premultiplyAlpha),v.pixelStorei(N.UNPACK_ALIGNMENT,O.unpackAlignment);let on=v.getParameter(N.UNPACK_ROW_LENGTH),Ze=v.getParameter(N.UNPACK_IMAGE_HEIGHT),xn=v.getParameter(N.UNPACK_SKIP_PIXELS),zn=v.getParameter(N.UNPACK_SKIP_ROWS),fi=v.getParameter(N.UNPACK_SKIP_IMAGES);v.pixelStorei(N.UNPACK_ROW_LENGTH,xt.width),v.pixelStorei(N.UNPACK_IMAGE_HEIGHT,xt.height),v.pixelStorei(N.UNPACK_SKIP_PIXELS,Ee),v.pixelStorei(N.UNPACK_SKIP_ROWS,Ve),v.pixelStorei(N.UNPACK_SKIP_IMAGES,Ge);let fs=M.isDataArrayTexture||M.isData3DTexture,lt=O.isDataArrayTexture||O.isData3DTexture;if(M.isDepthTexture){let St=W.get(M),pi=W.get(O),ht=W.get(St.__renderTarget),mi=W.get(pi.__renderTarget);v.bindFramebuffer(N.READ_FRAMEBUFFER,ht.__webglFramebuffer),v.bindFramebuffer(N.DRAW_FRAMEBUFFER,mi.__webglFramebuffer);for(let ps=0;ps<Se;ps++)fs&&(N.framebufferTextureLayer(N.READ_FRAMEBUFFER,N.COLOR_ATTACHMENT0,W.get(M).__webglTexture,G,Ge+ps),N.framebufferTextureLayer(N.DRAW_FRAMEBUFFER,N.COLOR_ATTACHMENT0,W.get(O).__webglTexture,me,bt+ps)),N.blitFramebuffer(Ee,Ve,ve,pe,Te,st,ve,pe,N.DEPTH_BUFFER_BIT,N.NEAREST);v.bindFramebuffer(N.READ_FRAMEBUFFER,null),v.bindFramebuffer(N.DRAW_FRAMEBUFFER,null)}else if(G!==0||M.isRenderTargetTexture||W.has(M)){let St=W.get(M),pi=W.get(O);v.bindFramebuffer(N.READ_FRAMEBUFFER,k),v.bindFramebuffer(N.DRAW_FRAMEBUFFER,F);for(let ht=0;ht<Se;ht++)fs?N.framebufferTextureLayer(N.READ_FRAMEBUFFER,N.COLOR_ATTACHMENT0,St.__webglTexture,G,Ge+ht):N.framebufferTexture2D(N.READ_FRAMEBUFFER,N.COLOR_ATTACHMENT0,N.TEXTURE_2D,St.__webglTexture,G),lt?N.framebufferTextureLayer(N.DRAW_FRAMEBUFFER,N.COLOR_ATTACHMENT0,pi.__webglTexture,me,bt+ht):N.framebufferTexture2D(N.DRAW_FRAMEBUFFER,N.COLOR_ATTACHMENT0,N.TEXTURE_2D,pi.__webglTexture,me),G!==0?N.blitFramebuffer(Ee,Ve,ve,pe,Te,st,ve,pe,N.COLOR_BUFFER_BIT,N.NEAREST):lt?N.copyTexSubImage3D(ye,me,Te,st,bt+ht,Ee,Ve,ve,pe):N.copyTexSubImage2D(ye,me,Te,st,Ee,Ve,ve,pe);v.bindFramebuffer(N.READ_FRAMEBUFFER,null),v.bindFramebuffer(N.DRAW_FRAMEBUFFER,null)}else lt?M.isDataTexture||M.isData3DTexture?N.texSubImage3D(ye,me,Te,st,bt,ve,pe,Se,at,Gt,xt.data):O.isCompressedArrayTexture?N.compressedTexSubImage3D(ye,me,Te,st,bt,ve,pe,Se,at,xt.data):N.texSubImage3D(ye,me,Te,st,bt,ve,pe,Se,at,Gt,xt):M.isDataTexture?N.texSubImage2D(N.TEXTURE_2D,me,Te,st,ve,pe,at,Gt,xt.data):M.isCompressedTexture?N.compressedTexSubImage2D(N.TEXTURE_2D,me,Te,st,xt.width,xt.height,at,xt.data):N.texSubImage2D(N.TEXTURE_2D,me,Te,st,ve,pe,at,Gt,xt);v.pixelStorei(N.UNPACK_ROW_LENGTH,on),v.pixelStorei(N.UNPACK_IMAGE_HEIGHT,Ze),v.pixelStorei(N.UNPACK_SKIP_PIXELS,xn),v.pixelStorei(N.UNPACK_SKIP_ROWS,zn),v.pixelStorei(N.UNPACK_SKIP_IMAGES,fi),me===0&&O.generateMipmaps&&N.generateMipmap(ye),v.unbindTexture()},this.initRenderTarget=function(M){W.get(M).__webglFramebuffer===void 0&&Y.setupRenderTarget(M)},this.initTexture=function(M){M.isCubeTexture?Y.setTextureCube(M,0):M.isData3DTexture?Y.setTexture3D(M,0):M.isDataArrayTexture||M.isCompressedArrayTexture?Y.setTexture2DArray(M,0):Y.setTexture2D(M,0),v.unbindTexture()},this.resetState=function(){q=0,B=0,$=null,v.reset(),ge.reset()},typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("observe",{detail:this}))}get coordinateSystem(){return Pn}get outputColorSpace(){return this._outputColorSpace}set outputColorSpace(e){this._outputColorSpace=e;let t=this.getContext();t.drawingBufferColorSpace=Xe._getDrawingBufferColorSpace(e),t.unpackColorSpace=Xe._getUnpackColorSpace()}};var Jf=new dn,zl=new L,Zs=class extends Hr{constructor(){super(),this.isLineSegmentsGeometry=!0,this.type="LineSegmentsGeometry";let e=[-1,2,0,1,2,0,-1,1,0,1,1,0,-1,0,0,1,0,0,-1,-1,0,1,-1,0],t=[-1,2,1,2,-1,1,1,1,-1,-1,1,-1,-1,-2,1,-2],n=[0,2,1,2,3,1,2,4,3,4,5,3,4,6,5,6,7,5];this.setIndex(n),this.setAttribute("position",new nt(e,3)),this.setAttribute("uv",new nt(t,2))}applyMatrix4(e){let t=this.attributes.instanceStart,n=this.attributes.instanceEnd;return t!==void 0&&(t.applyMatrix4(e),n.applyMatrix4(e),t.needsUpdate=!0),this.boundingBox!==null&&this.computeBoundingBox(),this.boundingSphere!==null&&this.computeBoundingSphere(),this}setPositions(e){let t;e instanceof Float32Array?t=e:Array.isArray(e)&&(t=new Float32Array(e));let n=new Fi(t,6,1);return this.setAttribute("instanceStart",new In(n,3,0)),this.setAttribute("instanceEnd",new In(n,3,3)),this.instanceCount=this.attributes.instanceStart.count,this.computeBoundingBox(),this.computeBoundingSphere(),this}setColors(e){let t;e instanceof Float32Array?t=e:Array.isArray(e)&&(t=new Float32Array(e));let n=new Fi(t,6,1);return this.setAttribute("instanceColorStart",new In(n,3,0)),this.setAttribute("instanceColorEnd",new In(n,3,3)),this}fromWireframeGeometry(e){return this.setPositions(e.attributes.position.array),this}fromEdgesGeometry(e){return this.setPositions(e.attributes.position.array),this}fromMesh(e){return this.fromWireframeGeometry(new zr(e.geometry)),this}fromLineSegments(e){let t=e.geometry;return this.setPositions(t.attributes.position.array),this}computeBoundingBox(){this.boundingBox===null&&(this.boundingBox=new dn);let e=this.attributes.instanceStart,t=this.attributes.instanceEnd;e!==void 0&&t!==void 0&&(this.boundingBox.setFromBufferAttribute(e),Jf.setFromBufferAttribute(t),this.boundingBox.union(Jf))}computeBoundingSphere(){this.boundingSphere===null&&(this.boundingSphere=new Cn),this.boundingBox===null&&this.computeBoundingBox();let e=this.attributes.instanceStart,t=this.attributes.instanceEnd;if(e!==void 0&&t!==void 0){let n=this.boundingSphere.center;this.boundingBox.getCenter(n);let s=0;for(let r=0,o=e.count;r<o;r++)zl.fromBufferAttribute(e,r),s=Math.max(s,n.distanceToSquared(zl)),zl.fromBufferAttribute(t,r),s=Math.max(s,n.distanceToSquared(zl));this.boundingSphere.radius=Math.sqrt(s),isNaN(this.boundingSphere.radius)&&console.error("THREE.LineSegmentsGeometry.computeBoundingSphere(): Computed radius is NaN. The instanced position data is likely to have NaN values.",this)}}toJSON(){}};re.line={worldUnits:{value:1},linewidth:{value:1},resolution:{value:new xe},dashOffset:{value:0},dashScale:{value:1},dashSize:{value:1},gapSize:{value:1}};Qt.line={uniforms:Qr.merge([re.common,re.fog,re.line]),vertexShader:`
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
		`};var $s=class extends Jt{constructor(e){super({type:"LineMaterial",uniforms:Qr.clone(Qt.line.uniforms),vertexShader:Qt.line.vertexShader,fragmentShader:Qt.line.fragmentShader,clipping:!0}),this.isLineMaterial=!0,this.setValues(e)}get color(){return this.uniforms.diffuse.value}set color(e){this.uniforms.diffuse.value=e}get worldUnits(){return"WORLD_UNITS"in this.defines}set worldUnits(e){e===!0!==this.worldUnits&&(this.needsUpdate=!0),e===!0?this.defines.WORLD_UNITS="":delete this.defines.WORLD_UNITS}get linewidth(){return this.uniforms.linewidth.value}set linewidth(e){this.uniforms.linewidth&&(this.uniforms.linewidth.value=e)}get dashed(){return"USE_DASH"in this.defines}set dashed(e){e===!0!==this.dashed&&(this.needsUpdate=!0),e===!0?this.defines.USE_DASH="":delete this.defines.USE_DASH}get dashScale(){return this.uniforms.dashScale.value}set dashScale(e){this.uniforms.dashScale.value=e}get dashSize(){return this.uniforms.dashSize.value}set dashSize(e){this.uniforms.dashSize.value=e}get dashOffset(){return this.uniforms.dashOffset.value}set dashOffset(e){this.uniforms.dashOffset.value=e}get gapSize(){return this.uniforms.gapSize.value}set gapSize(e){this.uniforms.gapSize.value=e}get opacity(){return this.uniforms.opacity.value}set opacity(e){this.uniforms&&(this.uniforms.opacity.value=e)}get resolution(){return this.uniforms.resolution.value}set resolution(e){this.uniforms.resolution.value.copy(e)}get alphaToCoverage(){return"USE_ALPHA_TO_COVERAGE"in this.defines}set alphaToCoverage(e){this.defines&&(e===!0!==this.alphaToCoverage&&(this.needsUpdate=!0),e===!0?this.defines.USE_ALPHA_TO_COVERAGE="":delete this.defines.USE_ALPHA_TO_COVERAGE)}};var ou=new it,jf=new L,Qf=new L,kt=new it,Vt=new it,Jn=new it,au=new L,lu=new rt,Ht=new Gr,ep=new L,kl=new dn,Vl=new Cn,jn=new it,Qn,cs;function tp(i,e,t){return jn.set(0,0,-e,1).applyMatrix4(i.projectionMatrix),jn.multiplyScalar(1/jn.w),jn.x=cs/t.width,jn.y=cs/t.height,jn.applyMatrix4(i.projectionMatrixInverse),jn.multiplyScalar(1/jn.w),Math.abs(Math.max(jn.x,jn.y))}function R_(i,e){let t=i.matrixWorld,n=i.geometry,s=n.attributes.instanceStart,r=n.attributes.instanceEnd,o=Math.min(n.instanceCount,s.count);for(let a=0,l=o;a<l;a++){Ht.start.fromBufferAttribute(s,a),Ht.end.fromBufferAttribute(r,a),Ht.applyMatrix4(t);let c=new L,h=new L;Qn.distanceSqToSegment(Ht.start,Ht.end,h,c),h.distanceTo(c)<cs*.5&&e.push({point:h,pointOnLine:c,distance:Qn.origin.distanceTo(h),object:i,face:null,faceIndex:a,uv:null,uv1:null})}}function C_(i,e,t){let n=e.projectionMatrix,r=i.material.resolution,o=i.matrixWorld,a=i.geometry,l=a.attributes.instanceStart,c=a.attributes.instanceEnd,h=Math.min(a.instanceCount,l.count),d=-e.near;Qn.at(1,Jn),Jn.w=1,Jn.applyMatrix4(e.matrixWorldInverse),Jn.applyMatrix4(n),Jn.multiplyScalar(1/Jn.w),Jn.x*=r.x/2,Jn.y*=r.y/2,Jn.z=0,au.copy(Jn),lu.multiplyMatrices(e.matrixWorldInverse,o);for(let u=0,f=h;u<f;u++){if(kt.fromBufferAttribute(l,u),Vt.fromBufferAttribute(c,u),kt.w=1,Vt.w=1,kt.applyMatrix4(lu),Vt.applyMatrix4(lu),kt.z>d&&Vt.z>d)continue;if(kt.z>d){let S=kt.z-Vt.z,_=(kt.z-d)/S;kt.lerp(Vt,_)}else if(Vt.z>d){let S=Vt.z-kt.z,_=(Vt.z-d)/S;Vt.lerp(kt,_)}kt.applyMatrix4(n),Vt.applyMatrix4(n),kt.multiplyScalar(1/kt.w),Vt.multiplyScalar(1/Vt.w),kt.x*=r.x/2,kt.y*=r.y/2,Vt.x*=r.x/2,Vt.y*=r.y/2,Ht.start.copy(kt),Ht.start.z=0,Ht.end.copy(Vt),Ht.end.z=0;let x=Ht.closestPointToPointParameter(au,!0);Ht.at(x,ep);let g=Fh.lerp(kt.z,Vt.z,x),p=g>=-1&&g<=1,b=au.distanceTo(ep)<cs*.5;if(p&&b){Ht.start.fromBufferAttribute(l,u),Ht.end.fromBufferAttribute(c,u),Ht.start.applyMatrix4(o),Ht.end.applyMatrix4(o);let S=new L,_=new L;Qn.distanceSqToSegment(Ht.start,Ht.end,_,S),t.push({point:_,pointOnLine:S,distance:Qn.origin.distanceTo(_),object:i,face:null,faceIndex:u,uv:null,uv1:null})}}}var Hl=class extends At{constructor(e=new Zs,t=new $s({color:Math.random()*16777215})){super(e,t),this.isLineSegments2=!0,this.type="LineSegments2"}computeLineDistances(){let e=this.geometry,t=e.attributes.instanceStart,n=e.attributes.instanceEnd,s=new Float32Array(2*t.count);for(let o=0,a=0,l=t.count;o<l;o++,a+=2)jf.fromBufferAttribute(t,o),Qf.fromBufferAttribute(n,o),s[a]=a===0?0:s[a-1],s[a+1]=s[a]+jf.distanceTo(Qf);let r=new Fi(s,2,1);return e.setAttribute("instanceDistanceStart",new In(r,1,0)),e.setAttribute("instanceDistanceEnd",new In(r,1,1)),this}raycast(e,t){let n=this.material.worldUnits,s=e.camera;if(s===null&&!n&&console.error('LineSegments2: "Raycaster.camera" needs to be set in order to raycast against LineSegments2 while worldUnits is set to false.'),n===!1&&(this.material.resolution.x===0||this.material.resolution.y===0))return;let r=e.params.Line2!==void 0&&e.params.Line2.threshold||0;Qn=e.ray;let o=this.matrixWorld,a=this.geometry,l=this.material;cs=l.linewidth+r,a.boundingSphere===null&&a.computeBoundingSphere(),Vl.copy(a.boundingSphere).applyMatrix4(o);let c;if(n)c=cs*.5;else{let d=Math.max(s.near,Vl.distanceToPoint(Qn.origin));c=tp(s,d,l.resolution)}if(Vl.radius+=c,Qn.intersectsSphere(Vl)===!1)return;a.boundingBox===null&&a.computeBoundingBox(),kl.copy(a.boundingBox).applyMatrix4(o);let h;if(n)h=cs*.5;else{let d=Math.max(s.near,kl.distanceToPoint(Qn.origin));h=tp(s,d,l.resolution)}kl.expandByScalar(h),Qn.intersectsBox(kl)!==!1&&(n?R_(this,t):C_(this,s,t))}onBeforeRender(e){let t=this.material.uniforms;t&&t.resolution&&(e.getViewport(ou),this.material.uniforms.resolution.value.set(ou.z,ou.w))}};var Ft={background:15921386,face:14079702,faceSelected:9417960,faceHover:11980784,edge:2763306,edgeWire:1118481,edgeSelected:2845872,edgeHot:13382451,grid:14276303,axisX:13382451,axisY:3050327,axisZ:2845872,charged:9133302},I_={endpoint:3050327,midpoint:42405,"on-edge":13382451,origin:9133302,align:9133302,"align-combo":9133302,"edge-align":13382451,intersection:1118481,"cross-line":1118481,"axis-x":Ft.axisX,"axis-y":Ft.axisY,"axis-z":Ft.axisZ,"h-stop":14251782,"on-face":2845872},L_={x:Ft.axisX,y:Ft.axisY,z:Ft.axisZ,u:8947848,v:8947848,i:1118481},D_=1.6,np=1.2,cu=1.4,Gl=class{constructor(e){V(this,"renderer");V(this,"scene");V(this,"camOrtho");V(this,"camPersp");V(this,"staticGroup");V(this,"dyn",null);V(this,"dpr",1);V(this,"lineMats",[]);V(this,"resolution");V(this,"rig");V(this,"controllers",[]);V(this,"grips",[]);V(this,"hands",["none","none"]);V(this,"pointerVis",[]);V(this,"wrist",null);V(this,"xr");this.renderer=new Nl({canvas:e,antialias:!0}),this.scene=new br,this.scene.background=new qe(Ft.background),this.camOrtho=new rs(-1,1,1,-1,.1,2e4),this.camPersp=new qt(50,1,1,2e4),this.resolution=new xe(1,1),this.staticGroup=this.buildStatic(),this.scene.add(this.staticGroup);let t=this.renderer.xr;t.enabled=!0,t.setReferenceSpaceType("local-floor"),this.rig=new Rn,this.rig.add(this.camPersp),this.scene.add(this.rig);for(let n=0;n<2;n++){let s=t.getController(n);s.addEventListener("connected",c=>{this.hands[n]=c.data?.handedness??"none"}),s.addEventListener("disconnected",()=>{this.hands[n]="none"});let r=new It().setFromPoints([new L(0,0,0),new L(0,0,-1)]),o=new Ns(r,new ts({color:2845872,transparent:!0,opacity:.8}));o.visible=!1;let a=new At(new Vs(.012,12,8),new Ln({color:2845872,depthTest:!1}));a.renderOrder=11,a.visible=!1,s.add(o),s.add(a),this.pointerVis.push({line:o,cursor:a}),this.controllers.push(s),this.rig.add(s);let l=t.getControllerGrip(n);this.grips.push(l),this.rig.add(l)}this.xr={isPresenting:()=>!!t.isPresenting,setSession:n=>t.setSession(n),session:()=>t.getSession()??null,frame:()=>t.getFrame()??null,refSpace:()=>t.getReferenceSpace()??null,on:(n,s)=>t.addEventListener(n,s)}}setRig(e){this.rig.position.set(e.origin.x,e.origin.y,e.origin.z),this.rig.rotation.set(Math.PI/2,0,e.heading,"ZYX"),this.rig.updateMatrixWorld(!0)}ctrlIndex(e){return this.hands.indexOf(e)}setPointerVisual(e,t){let n=this.ctrlIndex(e);if(n<0)return;let s=this.pointerVis[n];if(!t){s.line.visible=!1,s.cursor.visible=!1;return}s.line.visible=!0,s.cursor.visible=!0,s.line.scale.set(1,1,Math.max(.05,t.length)),s.cursor.position.set(0,0,-t.length),s.line.material.color.setHex(t.color),s.cursor.material.color.setHex(t.color)}attachWristPanel(e,t,n,s){this.detachWristPanel();let r=new Pr(e);r.colorSpace=$t;let o=new At(new ss(t,n),new Ln({map:r,transparent:!0,side:rn,depthTest:!1}));o.renderOrder=12,o.position.set(0,.04,.09),o.rotation.set(-Math.PI/2+.35,0,0);let a=this.ctrlIndex(s);(a>=0?this.grips[a]:this.grips[s==="left"?0:1]).add(o),this.wrist={mesh:o,tex:r,inv:new rt}}detachWristPanel(){this.wrist&&(this.wrist.mesh.parent?.remove(this.wrist.mesh),this.wrist.mesh.geometry.dispose(),this.wrist.mesh.material.dispose(),this.wrist.tex.dispose(),this.wrist=null)}updateWristTexture(){this.wrist&&(this.wrist.tex.needsUpdate=!0)}wristHit(e){if(!this.wrist)return null;let t=this.wrist.mesh;t.updateWorldMatrix(!0,!1),this.wrist.inv.copy(t.matrixWorld).invert();let n=new L(e.origin.x,e.origin.y,e.origin.z).applyMatrix4(this.wrist.inv),s=new L(e.dir.x,e.dir.y,e.dir.z).transformDirection(this.wrist.inv);if(Math.abs(s.z)<1e-6)return null;let r=-n.z/s.z;if(r<=0)return null;let o=n.x+s.x*r,a=n.y+s.y*r,l=t.geometry.parameters.width/2,c=t.geometry.parameters.height/2;if(o<-l||o>l||a<-c||a>c)return null;let h=r*Math.hypot(e.dir.x,e.dir.y,e.dir.z);return{u:(o+l)/(2*l),v:1-(a+c)/(2*c),dist:h}}xrEye(){if(!this.renderer.xr.isPresenting)return null;let e=this.renderer.xr.getCamera(),t=new L().setFromMatrixPosition(e.matrixWorld);return{x:t.x,y:t.y,z:t.z}}setLoop(e){this.renderer.setAnimationLoop(e)}resize(e,t){this.renderer.xr.isPresenting||(this.dpr=t,this.renderer.setPixelRatio(t),this.renderer.setSize(e.w,e.h,!1),this.resolution.set(e.w*t,e.h*t))}worldPerPx(e,t,n){let s=this.xrEye();return s?2*Math.max(.2,Math.hypot(n.x-s.x,n.y-s.y,n.z-s.z))/1e3:e.projection==="persp"?2*Math.max(te(Re(n,e.eye()),e.forward()),.5)*Math.tan(e.fovY/2)/t.h:2*e.halfH/t.h}syncCamera(e,t,n=.5){let s=e.eye(),r=e.up(),o;if(e.projection==="persp"){o=this.camPersp;let a=e.eyeDist();o.fov=e.fovY*180/Math.PI,o.aspect=t.w/t.h,o.near=Math.max(n,a*.02),o.far=a*40+5e3}else{o=this.camOrtho;let a=e.halfW(t);o.left=-a,o.right=a,o.top=e.halfH,o.bottom=-e.halfH,o.near=.1,o.far=2e4}return o.position.set(s.x,s.y,s.z),o.up.set(r.x,r.y,r.z),o.lookAt(e.target.x,e.target.y,e.target.z),o.updateProjectionMatrix(),o}render(e,t,n,s){let r=!!this.renderer.xr.isPresenting,o;r?(o=this.camPersp,o.near=s.near??.05,o.far=2e3):(this.rig.position.set(0,0,0),this.rig.rotation.set(0,0,0),o=this.syncCamera(t,n,s.near??.5)),this.dyn&&(this.scene.remove(this.dyn),this.dyn.traverse(d=>{d.geometry?.dispose(),d.material?.dispose?.()}));let a=new Rn,l=s.preview??e,c=r?this.xrKeyLight():F_(t);for(let d of l.faces()){let u=s.selectionFaces.has(d.id)?Ft.faceSelected:s.hoverFace===d.id?Ft.faceHover:Ft.face,f=l.planeOf(d.id),m=f?Math.abs(te(f.plane.n,c)):1,x=N_(l,d.id,U_(u,.66+.34*m));x&&a.add(x)}let h=new Map;for(let d of l.edges()){let u=s.scrubEdges.has(d.id)||s.hoverEdge===d.id?Ft.edgeHot:s.selectionEdges.has(d.id)?Ft.edgeSelected:d.faceLinks.length===0?Ft.edgeWire:Ft.edge,f=h.get(u)??h.set(u,[]).get(u),m=l.graph.pt(d.a),x=l.graph.pt(d.b);f.push(m.x,m.y,m.z,x.x,x.y,x.z)}for(let[d,u]of h)a.add(this.fatLines(u,d,D_,{offset:!0}));if(s.charged?.length)for(let d of s.charged)a.add(this.marker(d,Ft.charged,4,t,n));if(s.snap?.kind){let d=I_[s.snap.kind]??2845872;if(a.add(this.marker(s.snap.p,d,5,t,n)),s.snap.hints?.length)for(let u of s.snap.hints)a.add(this.fatLines([u.a.x,u.a.y,u.a.z,u.b.x,u.b.y,u.b.z],L_[u.axis]??8947848,np,{offset:!0}));else if(s.snap.kind.startsWith("axis")&&s.snapAnchor){let u=s.snapAnchor,f=s.snap.p;a.add(this.fatLines([u.x,u.y,u.z,f.x,f.y,f.z],d,np,{offset:!0}))}}if(s.teleport&&s.teleport.points.length>=2){let d=s.teleport,u=d.valid?3050327:13382451,f=[];for(let m=0;m+1<d.points.length;m++){let x=d.points[m],g=d.points[m+1];f.push(x.x,x.y,x.z,g.x,g.y,g.z)}if(a.add(this.fatLines(f,u,2.5,{offset:!0})),d.landing){let m=new At(new Or(.22,.3,32),new Ln({color:u,side:rn,depthTest:!1,transparent:!0,opacity:.85}));m.position.set(d.landing.x,d.landing.y,d.landing.z+.01),m.renderOrder=9,a.add(m)}}this.dyn=a,this.scene.add(a),this.renderer.render(this.scene,o)}xrKeyLight(){let t=this.renderer.xr.getCamera().matrixWorld.elements,n={x:t[8],y:t[9],z:t[10]},s={x:t[4],y:t[5],z:t[6]},r={x:t[0],y:t[1],z:t[2]},o={x:n.x+s.x*.55+r.x*.35,y:n.y+s.y*.55+r.y*.35,z:n.z+s.z*.55+r.z*.35},a=Math.hypot(o.x,o.y,o.z)||1;return{x:o.x/a,y:o.y/a,z:o.z/a}}marker(e,t,n,s,r){let o=n*this.worldPerPx(s,r,e),a=new At(new Vs(o,12,8),new Ln({color:t,depthTest:!1}));return a.renderOrder=10,a.position.set(e.x,e.y,e.z),a}fatLines(e,t,n,s={}){let r=new Zs;r.setPositions(e);let o=new $s({color:t,linewidth:n*this.dpr,resolution:this.resolution,depthTest:!s.overlay,polygonOffset:!!s.offset,polygonOffsetFactor:-1,polygonOffsetUnits:-2}),a=new Hl(r,o);return s.overlay&&(a.renderOrder=10),a}buildStatic(){let e=new Rn,t=[],n=20,s=50;for(let a=-n;a<=n;a++)a!==0&&(t.push(a*s,-n*s,0,a*s,n*s,0),t.push(-n*s,a*s,0,n*s,a*s,0));let r=new It;r.setAttribute("position",new nt(t,3)),e.add(new Tr(r,new ts({color:Ft.grid})));let o=n*s;return e.add(this.fatLines([-o,0,0,o,0,0],Ft.axisX,cu)),e.add(this.fatLines([0,-o,0,0,o,0],Ft.axisY,cu)),e.add(this.fatLines([0,0,0,0,0,o],Ft.axisZ,cu)),e}};function F_(i){let e=i.eyeDir(),t=i.up(),n=i.right(),s={x:e.x+t.x*.55+n.x*.35,y:e.y+t.y*.55+n.y*.35,z:e.z+t.z*.55+n.z*.35},r=Math.hypot(s.x,s.y,s.z)||1;return{x:s.x/r,y:s.y/r,z:s.z/r}}function U_(i,e){let t=n=>Math.max(0,Math.min(255,Math.round(n*e)));return t(i>>16&255)<<16|t(i>>8&255)<<8|t(i&255)}function N_(i,e,t){let n=i.face(e),s=i.planeOf(e);if(!n||!s)return null;let r=new zs(n.outer.pts.map(f=>new xe(f.x,f.y)));for(let f of n.holes)r.holes.push(new ns(f.pts.map(m=>new xe(m.x,m.y))));let o=new Br(r),{u:a,v:l}=s.basis,c=s.plane.n,h=s.plane.d,d=new rt;d.set(a.x,l.x,c.x,c.x*h,a.y,l.y,c.y,c.y*h,a.z,l.z,c.z,c.z*h,0,0,0,1),o.applyMatrix4(d);let u=new Ln({color:t,side:rn,polygonOffset:!0,polygonOffsetFactor:1,polygonOffsetUnits:1});return new At(o,u)}function ip(i,e){let t=i.face(e),n=i.planeOf(e);if(!t||!n)return[];let s=t.outer.pts.map(f=>new xe(f.x,f.y)),r=t.holes.map(f=>f.pts.map(m=>new xe(m.x,m.y))),o=Ai.triangulateShape(s,r),a=[...s,...r.flat()],{u:l,v:c}=n.basis,h=n.plane.n,d=n.plane.d,u=f=>({x:l.x*f.x+c.x*f.y+h.x*d,y:l.y*f.x+c.y*f.y+h.y*d,z:l.z*f.x+c.z*f.y+h.z*d});return o.map(([f,m,x])=>[u(a[f]),u(a[m]),u(a[x])])}var yt=(i,e)=>({x:i,y:e}),ki=(i,e,t,n)=>[[yt(i,e),yt(t,e)],[yt(t,e),yt(t,n)],[yt(t,n),yt(i,n)],[yt(i,n),yt(i,e)]],Ks=[{name:"\u65E5\u5B57",note:"\u4E24\u819C\u5171\u8FB9\u2014\u2014\u64E6\u4E2D\u7F1D\u8BE5 MERGE",batches:[ki(-100,-60,100,60),[[yt(-100,0),yt(100,0)]]],expectFaces:2},{name:"\u56DE\u5B57",note:"\u73AF\u5E26+\u5185\u5C9B\u2014\u2014\u5220\u5185\u819C\u518D\u64E6\u6D1E\u8FB9\u770B ABSORB",batches:[ki(-100,-100,100,100),ki(-40,-40,40,40)],expectFaces:2},{name:"\u4E09\u5C42\u56DE\u5B57",note:"\u6697\u7901\u2460\u73B0\u573A\uFF1A\u4E2D\u73AF\u64E6=ABSORB\uFF1F\u5185\u73AF\u64E6=BURST\uFF1F\uFF08\u63A8\u5BFC\u503C\u5F85\u771F\u673A SU \u88C1\u51B3\uFF09",batches:[ki(-120,-120,120,120),ki(-75,-75,75,75),ki(-30,-30,30,30)],expectFaces:3},{name:"\u7530\u5B57",note:"\u5341\u5B57\u5212\u5206\u2014\u2014\u56DB\u819C\uFF1B\u64E6\u5341\u5B57\u4EFB\u4E00\u81C2\u770B MERGE \u94FE",batches:[ki(-100,-100,100,100),[[yt(0,-100),yt(0,100)]],[[yt(-100,0),yt(100,0)]]],expectFaces:4},{name:"T \u89E6\u78B0",note:"\u5916\u6765\u7EBF T \u5230\u8FB9\u4E0A\u2014\u2014\u5207\u8FB9\u4E0D\u751F\u819C\uFF08\u624B\u52BF\u8FB9\u88C1\u51B3\u7684\u53CD\u4F8B\u4F4D\uFF09",batches:[ki(-100,-60,100,60),[[yt(0,60),yt(0,140)]]],expectFaces:1},{name:"\u5F00\u53E3\u65B9",note:"\u4E09\u8FB9\u5F00\u53E3\u2014\u2014\u4E0D\u51FA\u819C\uFF1B\u4F60\u8865\u7B2C\u56DB\u7B14\u770B BIRTH\uFF08\u63CF\u4E00\u7B14\u5C31\u51FA\uFF09",batches:[[[yt(-80,-80),yt(80,-80)],[yt(80,-80),yt(80,80)],[yt(80,80),yt(-80,80)]]],expectFaces:0}];function sp(i,e){return e.batches.map(t=>i.addEdges(t))}function hu(i,e){switch(e.op){case"clear":return{kernel:new xi,events:[]};case"preset":{let t=new xi,n=Ks.find(s=>s.name===e.name);return{kernel:t,events:n?sp(t,n).flat():[]}}case"addEdges":return{kernel:i,events:i.addEdges(e.segs)};case"eraseEdges":return{kernel:i,events:i.eraseEdges(e.ids)};case"eraseFaces":return{kernel:i,events:i.eraseFaces(e.ids)};case"eraseSelection":return{kernel:i,events:[...i.eraseFaces(e.faces),...i.eraseEdges(e.edges)]};case"move":return{kernel:i,events:i.moveVertices(e.moves)};case"pushpull":return{kernel:i,events:i.pushPull(e.face,e.dist)}}}var Wl=class{constructor(){V(this,"ops",[]);V(this,"undone",[])}canUndo(){return this.ops.length>0}canRedo(){return this.undone.length>0}size(){return this.ops.length}commit(e,t){return this.ops.push(t),this.undone=[],hu(e,t)}undo(){return this.ops.length?(this.undone.push(this.ops.pop()),this.replay()):null}redo(e){let t=this.undone.pop();return t?(this.ops.push(t),hu(e,t)):null}replay(){let e=new xi;for(let t of this.ops)e=hu(e,t).kernel;return e}};var op=["select","line","rect","move","pp","erase","eraseFace"],O_=8,B_=6,z_={endpoint:10,origin:10,midpoint:10,"on-edge":7,"edge-align":12,"align-combo":12,align:5,"axis-x":5,"axis-y":5,"axis-z":5},rp={endpoint:"\u7AEF\u70B9",midpoint:"\u4E2D\u70B9","on-edge":"\u8FB9\u4E0A",origin:"\u539F\u70B9","axis-x":"X \u8F74","axis-y":"Y \u8F74","axis-z":"Z \u8F74",align:"\u5171\u8F74","align-combo":"\u5171\u8F74\u89D2\u70B9","edge-align":"\u8FB9\u4E0A\xB7\u5171\u8F74",intersection:"\u4EA4\u70B9","cross-line":"\u4EA4\u7EBF","h-stop":"\u9AD8\u5EA6\u54AC\u5408","on-face":"\u9762\u4E0A"};function du(i){switch(i.type){case"BIRTH":return`\u8BDE\u751F \u9762#${i.face}`;case"DIVIDE":return`\u5206\u5272 \u9762#${i.from} \u2192 ${i.into.map(e=>`#${e}`).join(" + ")}`;case"MERGE":return`\u5408\u5E76 ${i.from.map(e=>`#${e}`).join("+")} \u2192 \u9762#${i.into}`;case"ABSORB":return`\u541E\u6D1E \u9762#${i.from} \u2192 \u9762#${i.into}`;case"BURST":return`\u7834\u819C \u9762#${i.face}`;case"STRETCH":return`\u62C9\u4F38 ${i.faces.map(e=>`\u9762#${e}`).join(" ")}`;case"FACE_ERASED":return`\u5220\u819C \u9762#${i.face}`}}var uu=(i,e)=>Math.hypot(i.x-e.x,i.y-e.y,i.z-e.z),hs=.01;function io(i,e=1){let t=Number(i.toFixed(e));return(Math.abs(i-t)>1e-6?"~":"")+t.toFixed(e)}var Xl=class{constructor(e,t){this.canvas=e;this.host=t;V(this,"cam",new wo);V(this,"r3");V(this,"checkpoint",new xi);V(this,"journal",new Wl);V(this,"_tool","line");V(this,"_revision",0);V(this,"anchor3",null);V(this,"gesturePlane",Mc);V(this,"rectFixed",null);V(this,"cursor3",null);V(this,"snapInfo",null);V(this,"moveVids",[]);V(this,"ppFace",null);V(this,"ppNormal",null);V(this,"ppH",0);V(this,"ppShellVids",new Set);V(this,"ppKnownVids",new Set);V(this,"ppStops",[]);V(this,"scrubAcc",new Set);V(this,"scrubbing",!1);V(this,"selection",Mn());V(this,"marqueeStart",null);V(this,"marqueeCur",null);V(this,"hoverEdge",null);V(this,"hoverFace",null);V(this,"live",null);V(this,"liveEvents",[]);V(this,"armed",!1);V(this,"canArm",!1);V(this,"downScreen",null);V(this,"justCommitted",!1);V(this,"charged",new Map);V(this,"dwell",null);V(this,"lastSnap",null);V(this,"clickTrain",null);V(this,"pointerFrame",null);V(this,"viewExtras",null);V(this,"drawSuspended",!1);this.r3=new Gl(e),this.cam.pitch=.61,this.cam.halfH=220,this.cam.projection="persp"}get tool(){return this._tool}get kernel(){return this.checkpoint}get renderer3(){return this.r3}get revision(){return this._revision}canUndo(){return this.journal.canUndo()}canRedo(){return this.journal.canRedo()}hasSelection(){return this.selection.edges.size>0||this.selection.faces.size>0}isGestureActive(){return this.gestureActive()}vp(){return{w:this.canvas.clientWidth,h:this.canvas.clientHeight}}setPointerFrame(e,t){this.pointerFrame=e?{pf:e,vp:t??{w:800,h:800}}:null}frame(){return this.pointerFrame?.pf??this.cam}fvp(){return this.pointerFrame?.vp??this.vp()}snapPx(){return O_*vi(this.fvp())}hitPx(){return B_*vi(this.fvp())}setTool(e){this._tool=e,this.cancelGesture(),this.host.changed(),this.draw()}cancel(){this.selection=Mn(),this.cancelGesture(),this.host.changed(),this.draw()}cancelGesture(){this.anchor3=null,this.moveVids=[],this.ppFace=null,this.ppNormal=null,this.ppShellVids=new Set,this.ppKnownVids=new Set,this.ppStops=[],this.ppH=0,this.rectFixed=null,this.lastSnap=null,this.armed=!1,this.canArm=!1,this.downScreen=null,this.justCommitted=!1,this.cursor3=null,this.snapInfo=null,this.scrubAcc=new Set,this.scrubbing=!1,this.marqueeStart=this.marqueeCur=null,this.hoverEdge=null,this.hoverFace=null,this.live=null,this.liveEvents=[],this.host.marquee(null),this.host.tip(null,0,0),this.host.hint(null)}commitOp(e){let t=this.journal.commit(this.checkpoint,e);return this.checkpoint=t.kernel,this._revision++,this.revalidateCharged(),this.host.changed(),t.events}emit(e){e.length&&this.host.events(e)}undo(){let e=this.journal.undo();e&&(this.checkpoint=e,this._revision++,this.revalidateCharged(),this.cancelGesture(),this.selection=Mn(),this.host.separator("\u64A4\u9500"),this.host.changed(),this.draw())}redo(){let e=this.journal.redo(this.checkpoint);e&&(this.checkpoint=e.kernel,this._revision++,this.revalidateCharged(),this.cancelGesture(),this.selection=Mn(),this.host.separator("\u91CD\u505A"),this.emit(e.events),this.host.changed(),this.draw())}clearAll(){this.cancelGesture(),this.selection=Mn(),this.clearCharged(),this.host.separator("\u6E05\u7A7A"),this.commitOp({op:"clear"}),this.draw()}applyPreset(e){let t=Ks.find(n=>n.name===e);return t?(this.cancelGesture(),this.selection=Mn(),this.clearCharged(),this.host.separator(`\u9884\u7F6E\uFF1A${t.name}\uFF08${t.note}\uFF09`),this.emit(this.commitOp({op:"preset",name:e})),this.draw(),!0):!1}addSegments(e,t){this.cancelGesture(),this.selection=Mn(),this.host.separator(t);let n=this.commitOp({op:"addEdges",segs:e});return this.emit(n),this.draw(),n}pickAt(e,t){return kn(this.liveWorld(),this.frame(),this.fvp(),e,t,this.hitPx())}selectExpand(e,t,n=!1){let s=this.checkpoint,r=Mn(),o=a=>{let l=s.face(a);if(l){r.faces.add(a);for(let c of[l.outer,...l.holes])for(let h of c.edges)r.edges.add(h.edge)}};if(e.edge!==void 0){if(r.edges.add(e.edge),t>=1)for(let a of s.graph.edge(e.edge).faceLinks)r.faces.add(a)}else e.face!==void 0&&(t>=1?o(e.face):r.faces.add(e.face));if(t>=2&&(e.edge!==void 0||e.face!==void 0)){let a=[...r.edges],l=[...r.faces];for(;a.length||l.length;){let c=l.pop();if(c!==void 0){let u=s.face(c);if(u)for(let f of[u.outer,...u.holes])for(let m of f.edges)r.edges.has(m.edge)||(r.edges.add(m.edge),a.push(m.edge));continue}let h=a.pop();if(!s.graph.hasEdge(h))continue;let d=s.graph.edge(h);for(let u of d.faceLinks)r.faces.has(u)||(r.faces.add(u),l.push(u));for(let u of[d.a,d.b])for(let f of s.graph.vertex(u).edges)r.edges.has(f)||(r.edges.add(f),a.push(f))}}if(n){for(let a of r.edges)this.selection.edges.add(a);for(let a of r.faces)this.selection.faces.add(a)}else this.selection=r;return this.host.changed(),this.draw(),!0}deleteSelection(){this.hasSelection()&&(this.emit(this.commitOp({op:"eraseSelection",faces:[...this.selection.faces],edges:[...this.selection.edges]})),this.selection=Mn(),this.host.changed(),this.draw())}setView(e){this.cam.setView(e),this.draw()}zoomExtents(){this.cam.fitPoints(this.checkpoint.vertices(),this.vp()),this.draw()}toggleProjection(){this.cam.projection=this.cam.projection==="persp"?"ortho":"persp",this.host.changed(),this.draw()}alignSrcs(){return[...this.charged.values()]}chargePt(e){let t=`${e.x},${e.y},${e.z}`;for(this.charged.delete(t),this.charged.set(t,{...e});this.charged.size>3;)this.charged.delete(this.charged.keys().next().value)}trackCharge(e,t=300){if(!e||e.kind!=="endpoint"&&e.kind!=="midpoint"){this.dwell=null;return}let n=`${e.p.x},${e.p.y},${e.p.z}`;if(this.charged.has(n)){this.dwell=null;return}let s=performance.now();if(!this.dwell||this.dwell.key!==n){this.dwell={key:n,since:s};return}s-this.dwell.since>=t&&(this.chargePt(e.p),this.dwell=null)}revalidateCharged(){if(!this.charged.size)return;let e=new Set;for(let t of this.checkpoint.vertices())e.add(`${t.x},${t.y},${t.z}`);for(let t of this.checkpoint.edges()){let n=this.checkpoint.graph.pt(t.a),s=this.checkpoint.graph.pt(t.b);e.add(`${(n.x+s.x)/2},${(n.y+s.y)/2},${(n.z+s.z)/2}`)}for(let t of[...this.charged.keys()])e.has(t)||this.charged.delete(t)}clearCharged(){this.charged.clear(),this.dwell=null,this.lastSnap=null}applyHysteresis(e,t,n){if(e.kind!==null)return this.lastSnap=e,e;if(this.lastSnap?.kind){let s=this.frame().angularPx(this.lastSnap.p,this.vp());if(Math.hypot(t-s.x,n-s.y)<=(z_[this.lastSnap.kind]??8)*1.5*vi(this.fvp()))return this.lastSnap}return this.lastSnap=null,e}gestureActive(){return this.anchor3!==null||this.moveVids.length>0||this.scrubbing||this.marqueeStart!==null}liveWorld(){return this.gestureActive()?this.live??this.checkpoint:this.checkpoint}freshHand(e,t=!1){let n=new Set(this.checkpoint.vertices().map(r=>r.id)),s={has:r=>!n.has(r)||(e?.(r)??!1),opaque:t};if(this._tool==="line"||this._tool==="rect"){let r=new Set;for(let o of this.liveEvents)o.type==="BIRTH"&&r.add(o.face);s.faces=o=>r.has(o)}return s}computeLive(){this.live=null,this.liveEvents=[];let e=s=>{let r=this.checkpoint.clone();this.liveEvents=s(r),this.live=r},t=this._tool,n="";if(t==="line"&&this.anchor3&&this.cursor3){let s=this.anchor3,r=this.cursor3;n=`\u957F ${io(uu(s,r))}`,uu(s,r)>=hs&&e(o=>o.addEdges([[s,r]]))}else if(t==="rect"&&this.anchor3&&this.cursor3){let{plane:s,basis:r}=this.gesturePlane,o=Tc(s,r,this.anchor3,this.cursor3),a=Re(this.cursor3,this.anchor3),l=a.x*r.u.x+a.y*r.u.y+a.z*r.u.z,c=a.x*r.v.x+a.y*r.v.y+a.z*r.v.z;n=`\u77E9\u5F62 ${io(Math.abs(l))} \xD7 ${io(Math.abs(c))}`,o.length&&e(h=>h.addEdges(o))}else if(t==="move"&&this.moveVids.length&&this.anchor3&&this.cursor3){let s=Re(this.cursor3,this.anchor3),r=this.moveVids;Math.hypot(s.x,s.y,s.z)>=hs&&e(o=>o.moveVertices(Pc(this.checkpoint,r,s)))}else if(t==="pp"&&this.ppFace!==null&&Math.abs(this.ppH)>=hs){let s=this.ppFace,r=this.ppH-Math.sign(this.ppH)*2e-6;e(o=>o.pushPull(s,r,{settleLanding:!1}))}else if(t==="eraseFace"&&this.hoverFace!==null){let s=this.hoverFace;e(r=>r.eraseFaces([s]))}if(this.live||n){let s=this.live?this.liveEvents.length?`\u9884\u89C8\uFF1A${this.liveEvents.map(du).join("\uFF1B")}`:"\u9884\u89C8\uFF1A\u65E0\u819C\u53D8\u5316":"";this.host.hint([n,s].filter(Boolean).join(" \uFF5C "))}}lineSecondSnap(e,t){let n=Po(this.liveWorld(),this.frame(),this.fvp(),this.anchor3,e,t,this.snapPx(),this.alignSrcs(),this.freshHand());return this.gesturePlane=n.plane,n.snap}rectPlaneSnap(e,t){if(this.rectFixed)return this.snapInfo=_n(this.liveWorld(),this.frame(),this.fvp(),e,t,this.snapPx(),{plane:this.gesturePlane,alignSources:this.alignSrcs(),hand:this.freshHand()}),this.snapInfo.p;let n=Po(this.liveWorld(),this.frame(),this.fvp(),this.anchor3,e,t,this.snapPx(),this.alignSrcs(),this.freshHand());return this.gesturePlane=n.plane,this.snapInfo=n.snap,n.snap.p}setLoop(e){this.r3.setLoop(e)}batchDraw(e){this.drawSuspended=!0;try{e()}finally{this.drawSuspended=!1}this.draw()}draw(){this.drawSuspended||this.r3.render(this.checkpoint,this.cam,this.vp(),{...this.viewExtras?.()??{},selectionEdges:this.selection.edges,selectionFaces:this.selection.faces,scrubEdges:this.scrubAcc,hoverEdge:this.hoverEdge,hoverFace:this.hoverFace,preview:this.live,snap:this.snapInfo,snapAnchor:this.anchor3,charged:this.alignSrcs()})}resize(e){this.r3.resize(this.vp(),e),this.draw()}updateTip(e,t){this.host.tip(this.snapInfo?.kind?rp[this.snapInfo.kind]??this.snapInfo.kind:null,e,t)}pointerDown(e){let t=e;switch(this._tool){case"line":case"rect":{if(this.armed&&this.anchor3){this.justCommitted=!0,this._tool==="line"?this.commitLineTo(t.x,t.y):this.commitRectTo(t.x,t.y);break}if(this._tool==="rect"){let n=Ec(this.liveWorld(),this.frame(),this.fvp(),t.x,t.y,this.snapPx(),this.alignSrcs());this.rectFixed=n.fixed,this.gesturePlane=n.plane,this.snapInfo=n.snap}else{let n=Ec(this.liveWorld(),this.frame(),this.fvp(),t.x,t.y,this.snapPx(),this.alignSrcs());this.gesturePlane=n.plane,this.snapInfo=n.snap}this.anchor3=this.snapInfo.p,this.cursor3=this.anchor3,this.armed=!1,this.canArm=e.pointerType==="mouse",this.downScreen={x:t.x,y:t.y};break}case"pp":{if(this.armed&&this.ppFace!==null&&this.anchor3){this.justCommitted=!0,this.commitPP();break}let n={face:nr(this.liveWorld(),this.frame(),this.fvp(),t.x,t.y)};if(n.face!==void 0){let s=this.checkpoint,r=s.planeOf(n.face);this.ppFace=n.face;let o=s.face(n.face);this.ppShellVids=new Set([...an(s.graph,o.outer),...o.holes.flatMap(c=>an(s.graph,c))]),this.ppKnownVids=new Set(s.vertices().map(c=>c.id)),this.ppNormal=r.plane.n,this.gesturePlane={plane:r.plane,basis:r.basis};let a=this.frame().ray(t.x,t.y,this.vp()),l=qi(a.origin,a.dir,r.plane.n,r.plane.d);this.anchor3=l??s.faceRings3(n.face).outer[0];{let c=new Set;c.add(0);for(let h of s.vertices())c.add(Math.round(te(Re(h,this.anchor3),r.plane.n)*1e6)/1e6);this.ppStops=[...c].sort((h,d)=>h-d)}this.cursor3=this.anchor3,this.ppH=0,this.armed=!1,this.canArm=e.pointerType==="mouse",this.downScreen={x:t.x,y:t.y},this.host.hint("\u63A8\u62C9\u4E2D\uFF1A\u6CBF\u6CD5\u5411\u62D6\u6216\u70B9\u4E24\u4E0B\u843D\u5B9A\uFF08\u6240\u89C1\u5373\u6240\u5F97\uFF1B\u5438\u70B9\u7EBF=\u53D6\u5176\u9AD8\u5EA6\uFF09")}break}case"move":{if(this.armed&&this.moveVids.length&&this.anchor3){this.justCommitted=!0,this.commitMoveTo(t.x,t.y);break}let n=kn(this.liveWorld(),this.frame(),this.fvp(),t.x,t.y,this.hitPx()),s=this.hasSelection();this.moveVids=s?ed(this.checkpoint,this.selection):Ac(this.checkpoint,n),this.moveVids.length&&(this.gesturePlane=wc(this.liveWorld(),this.frame(),this.fvp(),t.x,t.y),this.anchor3=n.vertex!==void 0?this.checkpoint.graph.pt(n.vertex):_n(this.liveWorld(),this.frame(),this.fvp(),t.x,t.y,this.snapPx(),{plane:this.gesturePlane,alignSources:this.alignSrcs(),hand:this.freshHand()}).p,this.cursor3=this.anchor3,this.armed=!1,this.canArm=e.pointerType==="mouse",this.downScreen={x:t.x,y:t.y},this.host.hint(s?"\u79FB\u52A8\u9009\u533A\uFF1A\u53C2\u8003\u70B9\u5DF2\u62FE\u53D6\uFF0C\u62D6\u62FD\u6216\u70B9\u4E24\u4E0B\u653E\u7F6E":"\u79FB\u52A8\u4E2D\u2026\u62D6\u62FD\u6216\u70B9\u4E24\u4E0B\u653E\u7F6E\uFF08\u6240\u89C1\u5373\u6240\u5F97\uFF09"));break}case"erase":{this.scrubbing=!0,this.scrubAcc=new Set,this.hoverEdge=null;let n=kn(this.liveWorld(),this.frame(),this.fvp(),t.x,t.y,this.hitPx());n.edge!==void 0&&this.scrubAcc.add(n.edge),this.computeLive();break}case"select":this.marqueeStart={x:t.x,y:t.y},this.marqueeCur={x:t.x,y:t.y};break;case"eraseFace":break}this.draw()}pointerMove(e){let t=e;if(!this.gestureActive()){this.snapInfo=null,this.hoverEdge=null,this.hoverFace=null;let n=this._tool;if(n==="line"||n==="rect"||n==="move"){let s=wc(this.liveWorld(),this.frame(),this.fvp(),t.x,t.y);this.snapInfo=this.applyHysteresis(_n(this.liveWorld(),this.frame(),this.fvp(),t.x,t.y,this.snapPx(),{plane:s,alignSources:this.alignSrcs(),hand:this.freshHand()}),t.x,t.y),this.trackCharge(this.snapInfo)}else n==="erase"?this.hoverEdge=kn(this.liveWorld(),this.frame(),this.fvp(),t.x,t.y,this.hitPx()).edge??null:n==="eraseFace"&&(this.hoverFace=nr(this.liveWorld(),this.frame(),this.fvp(),t.x,t.y)??null,this.computeLive());this.updateTip(e.clientX,e.clientY),this.draw();return}switch(this._tool){case"line":this.anchor3&&(this.snapInfo=this.applyHysteresis(this.lineSecondSnap(t.x,t.y),t.x,t.y),this.trackCharge(this.snapInfo,120),this.cursor3=this.snapInfo.p);break;case"rect":this.anchor3&&(this.cursor3=this.rectPlaneSnap(t.x,t.y));break;case"pp":this.ppTrack(t.x,t.y,e.travelPx);break;case"move":if(this.moveVids.length&&this.anchor3){let n=new Set(this.moveVids);this.snapInfo=this.applyHysteresis(_n(this.liveWorld(),this.frame(),this.fvp(),t.x,t.y,this.snapPx(),{plane:this.gesturePlane,anchor:this.anchor3,alignSources:this.alignSrcs(),hand:this.freshHand(s=>n.has(s))}),t.x,t.y),this.trackCharge(this.snapInfo,120),this.cursor3=this.snapInfo.p}break;case"erase":{let n=kn(this.liveWorld(),this.frame(),this.fvp(),t.x,t.y,this.hitPx());n.edge!==void 0&&this.scrubAcc.add(n.edge);break}case"select":if(this.marqueeStart){this.marqueeCur={x:t.x,y:t.y};let n=Math.min(this.marqueeStart.x,t.x),s=Math.max(this.marqueeStart.x,t.x),r=Math.min(this.marqueeStart.y,t.y),o=Math.max(this.marqueeStart.y,t.y);this.host.marquee({x:n,y:r,w:s-n,h:o-r})}break;case"eraseFace":break}this._tool!=="select"&&this.computeLive(),this.updateTip(e.clientX,e.clientY),this.draw()}ppTrack(e,t,n){if(this.ppFace===null||!this.anchor3||!this.ppNormal)return;let s=this.anchor3,r=this.ppNormal,o=this.liveWorld(),a=this.ppH,l={has:m=>this.ppShellVids.has(m)||!this.ppKnownVids.has(m)&&Math.abs(te(Re(o.graph.pt(m),s),r)-a)<.01,opaque:!0},c=this.applyHysteresis(_n(o,this.frame(),this.fvp(),e,t,this.snapPx(),{plane:this.gesturePlane,anchor:s,lines:!1,hand:l}),e,t);this.hoverFace=null;let h="",d=!1;if(c.kind!==null)this.snapInfo=c,this.ppH=te(Re(c.p,s),r),h=`\uFF5C\u53D6${rp[c.kind]??c.kind}\u9AD8\u5EA6`;else{this.snapInfo=null;let m=this.frame().ray(e,t,this.vp()),x=kn(o,this.frame(),this.fvp(),e,t,.5).face,g=x!==void 0?o.planeOf(x):void 0,p=x!==void 0&&(()=>{let b=o.face(x);return b?[...an(o.graph,b.outer),...b.holes.flatMap(S=>an(o.graph,S))].some(l.has):!0})();if(x!==void 0&&x!==this.ppFace&&!p&&g&&Math.abs(te(g.plane.n,r))>.05){let b=qi(m.origin,m.dir,g.plane.n,g.plane.d);b&&(this.ppH=te(Re(b,s),r),this.hoverFace=x,h="\uFF5C\u53D6\u9762#"+x+" \u9AD8\u5EA6")}else{let b=Eo(s,r,m.origin,m.dir);b?this.ppH=te(Re(b,s),r):d=!0;let S=this.frame().angularPx(s,this.vp()),_=this.frame().angularPx(Be(s,r),this.vp()),A=Math.max(Math.hypot(_.x-S.x,_.y-S.y),.5),w=7*vi(this.fvp())/A,E=null;for(let y of this.ppStops)Math.abs(y-this.ppH)<=w&&(E===null||Math.abs(y-this.ppH)<Math.abs(E-this.ppH))&&(E=y);E!==null&&(this.ppH=E,h=`\uFF5C\u9AD8\u5EA6\u54AC\u5408 ${io(E)}`,this.snapInfo={p:Be(s,Ue(r,this.ppH)),kind:"h-stop"})}}this.cursor3=Be(s,Ue(r,this.ppH));let u=n??(this.downScreen?Math.hypot(e-this.downScreen.x,t-this.downScreen.y):0),f=Math.abs(te(r,this.frame().viewDir(s)));if(u>16*vi(this.fvp())&&Math.abs(this.ppH)<hs&&(d||f>.9)){this.host.hint("\u63A8\u62C9\u6CA1\u52A8\uFF1A\u6B63\u5BF9\u7740\u8FD9\u5F20\u9762\u770B\uFF0C\u6CD5\u5411\u548C\u89C6\u7EBF\u5E73\u884C\uFF0C\u62D6\u4E0D\u51FA\u9AD8\u5EA6\u2014\u2014\u73AF\u7ED5\u4E00\u4E0B\u6362\u4E2A\u89D2\u5EA6\u518D\u62C9\uFF08Esc \u53D6\u6D88\uFF09");return}this.host.hint(`\u63A8\u62C9 h = ${io(this.ppH)}${h}\uFF08\u677E\u624B/\u518D\u70B9\u843D\u5B9A\uFF1BEsc \u53D6\u6D88\uFF09`)}pointerUp(e){let t=e,n=()=>!!this.downScreen&&(e.travelPx??Math.hypot(t.x-this.downScreen.x,t.y-this.downScreen.y))<=4;switch(this._tool){case"line":{if(!this.anchor3)break;if(this.justCommitted){this.justCommitted=!1;break}if(this.canArm&&n()){this.armed=!0,this.host.hint("\u79FB\u52A8\u9884\u89C8\uFF0C\u518D\u70B9\u4E00\u4E0B\u843D\u7B14\uFF1BEsc \u53D6\u6D88");break}this.commitLineTo(t.x,t.y);break}case"rect":{if(!this.anchor3)break;if(this.justCommitted){this.justCommitted=!1;break}if(this.canArm&&n()){this.armed=!0,this.host.hint("\u79FB\u52A8\u9884\u89C8\uFF0C\u518D\u70B9\u4E00\u4E0B\u843D\u77E9\u5F62\uFF1BEsc \u53D6\u6D88");break}this.commitRectTo(t.x,t.y);break}case"pp":{if(this.ppFace===null||!this.anchor3){this.cancelGesture();break}if(this.justCommitted){this.justCommitted=!1;break}if(this.canArm&&n()){this.armed=!0,this.host.hint("\u63A8\u62C9\u4E2D\uFF1A\u79FB\u52A8\u5B9A\u9AD8\u5EA6\uFF0C\u518D\u70B9\u4E00\u4E0B\u843D\u5B9A\uFF1BEsc \u53D6\u6D88");break}this.commitPP();break}case"move":{if(!this.moveVids.length||!this.anchor3){this.cancelGesture();break}if(this.justCommitted){this.justCommitted=!1;break}if(this.canArm&&n()){this.armed=!0,this.host.hint("\u79FB\u52A8\u4E2D\uFF1A\u6240\u89C1\u5373\u6240\u5F97\u9884\u89C8\uFF0C\u518D\u70B9\u4E00\u4E0B\u653E\u7F6E\uFF1BEsc \u53D6\u6D88");break}this.commitMoveTo(t.x,t.y);break}case"erase":{let s=[...this.scrubAcc];this.cancelGesture(),s.length&&this.emit(this.commitOp({op:"eraseEdges",ids:s}));break}case"select":{if(!this.marqueeStart||!this.marqueeCur){this.cancelGesture();break}let s=e.shiftKey,r=Math.hypot(this.marqueeCur.x-this.marqueeStart.x,this.marqueeCur.y-this.marqueeStart.y)>4,o;if(r)o=Qu(this.checkpoint,this.frame(),this.fvp(),{minX:Math.min(this.marqueeStart.x,this.marqueeCur.x),maxX:Math.max(this.marqueeStart.x,this.marqueeCur.x),minY:Math.min(this.marqueeStart.y,this.marqueeCur.y),maxY:Math.max(this.marqueeStart.y,this.marqueeCur.y)});else{let a=performance.now(),l=this.clickTrain&&a-this.clickTrain.t<350&&Math.hypot(t.x-this.clickTrain.x,t.y-this.clickTrain.y)<=6*vi(this.fvp())?{t:a,x:t.x,y:t.y,n:this.clickTrain.n+1}:{t:a,x:t.x,y:t.y,n:1};this.clickTrain=l;let c=kn(this.liveWorld(),this.frame(),this.fvp(),t.x,t.y,this.hitPx());if(l.n>=2){this.marqueeStart=this.marqueeCur=null,this.host.marquee(null),this.selectExpand(c,l.n>=3?2:1,s);break}o=Mn(),c.edge!==void 0?o.edges.add(c.edge):c.face!==void 0&&o.faces.add(c.face)}if(s){for(let a of o.edges)this.selection.edges.add(a);for(let a of o.faces)this.selection.faces.add(a)}else this.selection=o;this.marqueeStart=this.marqueeCur=null,this.host.marquee(null),this.host.changed();break}case"eraseFace":{let s={face:nr(this.liveWorld(),this.frame(),this.fvp(),t.x,t.y)};this.cancelGesture(),s.face!==void 0&&this.emit(this.commitOp({op:"eraseFaces",ids:[s.face]}));break}}this.draw()}pointerLeave(){this.gestureActive()||(this.snapInfo=null,this.hoverEdge=null,this.hoverFace=null,this.live=null,this.host.tip(null,0,0),this.host.hint(null),this.draw())}commitLineTo(e,t){let n=this.anchor3,s=this.lineSecondSnap(e,t).p;if(uu(n,s)<hs){this.cancelGesture();return}let r=this.commitOp({op:"addEdges",segs:[[n,s]]});this.emit(r),this.chargePt(n),this.chargePt(s),this.cancelGesture(),!(r.length>0)&&(this.anchor3=s,this.cursor3=s,this.armed=!0,this.host.hint("\u8FDE\u753B\u4E2D\uFF1A\u70B9\u4E0B\u4E00\u70B9\uFF1B\u51FA\u819C\u81EA\u52A8\u505C\uFF1BEsc \u6536\u7B14"))}commitRectTo(e,t){let n=this.rectPlaneSnap(e,t),s=Tc(this.gesturePlane.plane,this.gesturePlane.basis,this.anchor3,n);this.cancelGesture(),s.length&&this.emit(this.commitOp({op:"addEdges",segs:s}))}commitPP(){let e=this.ppH,t=this.ppFace;this.cancelGesture(),Math.abs(e)>=hs&&this.emit(this.commitOp({op:"pushpull",face:t,dist:e}))}commitMoveTo(e,t){let n=new Set(this.moveVids),s=_n(this.liveWorld(),this.frame(),this.fvp(),e,t,this.snapPx(),{plane:this.gesturePlane,anchor:this.anchor3,alignSources:this.alignSrcs(),hand:this.freshHand(l=>n.has(l))}).p,r=Re(s,this.anchor3),o=this.moveVids,a=Math.hypot(r.x,r.y,r.z);this.cancelGesture(),a>=hs&&this.emit(this.commitOp({op:"move",moves:Pc(this.checkpoint,o,r)}))}};var ui=i=>{let e=(Math.round(i*1e6)/1e6).toString();return e==="-0"?"0":e};function ap(i,e={}){let t=[];t.push(`# CatsUp OBJ export${e.version?` (${e.version})`:""} \u2014 Z-up world written as Y-up (x, z, -y)`);let n=new Map,s=[],r=l=>{let c=`${ui(l.x)},${ui(l.y)},${ui(l.z)}`,h=n.get(c);return h===void 0&&(h=n.size+1,n.set(c,h),s.push(`v ${ui(l.x)} ${ui(l.z)} ${ui(-l.y)}`)),h},o=[],a=0;for(let l of i.faces()){let c=i.faceRings3(l.id);if(c)if(l.holes.length===0)o.push(`f ${c.outer.map(h=>r(h)).join(" ")}`);else if(e.triangulateHoled)for(let[h,d,u]of e.triangulateHoled(i,l.id))o.push(`f ${r(h)} ${r(d)} ${r(u)}`);else a++,o.push(`f ${c.outer.map(h=>r(h)).join(" ")}`)}for(let l of i.edges())l.faceLinks.length===0&&o.push(`l ${r(i.graph.pt(l.a))} ${r(i.graph.pt(l.b))}`);return a&&t.push(`# warning: ${a} face(s) with holes exported as outer ring only (no triangulator supplied)`),t.push("o catsup"),t.push(...s,...o),t.join(`
`)+`
`}function lp(i,e={}){let t=e.maxSegments??3e3,n=[],s=new Set,r=[],o=0,a=0,l=d=>`${ui(d.x)},${ui(d.y)},${ui(d.z)}`,c=(d,u)=>{let f=l(d),m=l(u);if(f===m)return;let x=f<m?`${f}|${m}`:`${m}|${f}`;if(!s.has(x)&&(s.add(x),r.push([d,u]),r.length>t))throw new Error(`OBJ \u592A\u5927\uFF1A\u8D85\u8FC7 ${t} \u6761\u8FB9\uFF08\u9003\u751F\u53E3\u53EA\u63A5\u591A\u8FB9\u5F62\u5EFA\u6A21\u91CF\u7EA7\uFF0C\u4E0D\u63A5\u4E09\u89D2\u6C64\uFF09`)},h=d=>{let u=parseInt(d.split("/")[0],10);if(!Number.isFinite(u)||u===0)return null;let f=u>0?u-1:n.length+u;return n[f]??null};for(let d of i.split(/\r?\n/)){let u=d.trim();if(!u||u.startsWith("#"))continue;let f=u.split(/\s+/),m=f[0];if(m==="v"){let x=parseFloat(f[1]),g=parseFloat(f[2]),p=parseFloat(f[3]);if(![x,g,p].every(Number.isFinite))continue;n.push({x,y:-p,z:g})}else if(m==="f"||m==="l"){let x=f.slice(1).map(h).filter(g=>g!==null);if(x.length<2)continue;if(m==="f"){o++;for(let g=0;g<x.length;g++)c(x[g],x[(g+1)%x.length])}else{a++;for(let g=0;g+1<x.length;g++)c(x[g],x[g+1])}}}return{segs:r,vertices:n.length,faces:o,looseLines:a}}function cp(i,e,t){let n=new Map,s=!1,r=-1/0,o=null,a=null,l=w=>{let E=i.getBoundingClientRect();return{x:w.clientX-E.left,y:w.clientY-E.top}},c=w=>{let E=l(w);return{x:E.x,y:E.y,clientX:w.clientX,clientY:w.clientY,pointerType:w.pointerType,shiftKey:w.shiftKey}},h=()=>[...n.entries()].filter(([,w])=>w.type==="touch"),d=()=>[...n.values()].some(w=>w.role==="tool");function u(w){let E=performance.now();for(let[y,T]of h())(w||E-T.lastAt>8e3)&&n.delete(y);h().length<2&&(o=null),h().length===0&&(a=null)}function f(){let w=h();if(w.length<2)return;let[[,E],[,y]]=w;o={cx:(E.x+y.x)/2,cy:(E.y+y.y)/2,d:Math.hypot(E.x-y.x,E.y-y.y)},a||(a={firstDownTime:Math.min(...w.map(([,T])=>T.downAt)),isTap:!0,maxCount:0,start:new Map}),a.maxCount=Math.max(a.maxCount,w.length);for(let[T,C]of w)a.start.has(T)||a.start.set(T,{x:C.downX,y:C.downY}),C.role="multi"}function m(w){let E=l(w);try{i.setPointerCapture(w.pointerId)}catch{}let y=performance.now();u(w.pointerType==="pen");let T={type:w.pointerType,role:"hold",x:E.x,y:E.y,downX:E.x,downY:E.y,downAt:y,lastAt:y};if(w.pointerType==="mouse"?(w.button===0?T.role=d()?"hold":"tool":T.role=w.shiftKey?"pan":"orbit",w.preventDefault()):w.pointerType==="pen"?(s=!0,r=y,T.role=d()?"hold":"tool"):y-r<600?T.role="hold":!s&&t.fingerDraws()&&h().length===0&&!d()?T.role="tool":T.role="orbit",n.set(w.pointerId,T),w.pointerType==="touch"){let C=h();if(C.length>=2){for(let[,R]of C)R.role==="tool"&&e.cancel();f();return}}T.role==="tool"&&e.pointerDown(c(w))}function x(w){let E=n.get(w.pointerId),y=l(w);if(!E){w.pointerType!=="touch"&&!d()&&e.pointerMove(c(w));return}let T=y.x-E.x,C=y.y-E.y;switch(E.x=y.x,E.y=y.y,E.lastAt=performance.now(),w.pointerType==="pen"&&(r=E.lastAt),E.role){case"tool":e.pointerMove(c(w));return;case"orbit":if(t.look?.(T,C)){e.draw();return}e.cam.orbit(T,C),e.draw();return;case"pan":if(t.look?.(T,C)){e.draw();return}e.cam.pan(T,C,e.vp()),e.draw();return;case"multi":{if(a?.isTap)for(let[B,$]of h()){let j=a.start.get(B);if(j&&Math.hypot($.x-j.x,$.y-j.y)>16){a.isTap=!1;break}}let R=h().filter(([,B])=>B.role==="multi");if(R.length<2||!o)return;let[[,D],[,I]]=R,k=(D.x+I.x)/2,F=(D.y+I.y)/2,q=Math.hypot(D.x-I.x,D.y-I.y);if(t.walking?.()){o.cx=k,o.cy=F,o.d=q;return}e.cam.pan(k-o.cx,F-o.cy,e.vp()),q>1&&o.d>1&&e.cam.zoomAt(o.d/q,k,F,e.vp()),o.cx=k,o.cy=F,o.d=q,e.draw();return}case"hold":return}}function g(w,E){let y=n.get(w.pointerId);if(!y)return;n.delete(w.pointerId);let T=performance.now();if(w.pointerType==="pen"&&(r=T),y.role==="tool"){E?e.cancel():e.pointerUp(c(w));return}if(w.pointerType!=="touch")return;let C=h();if(C.length===0){if(a){let R=T-a.firstDownTime,D=T-r<600;!E&&a.isTap&&R<250&&!D&&(a.maxCount===2?t.onUndo():a.maxCount>=3&&t.onRedo()),a=null,o=null;return}y.role==="orbit"&&!E&&T-y.downAt<250&&Math.hypot(y.x-y.downX,y.y-y.downY)<16&&T-r>=600&&e.cancel();return}y.role==="multi"&&(C.length>=2?f():(C[0][1].role="hold",o=null))}let p=w=>{if(w.preventDefault(),t.walking?.())return;let E=i.getBoundingClientRect();e.cam.zoomAt(w.deltaY>0?1.1:1/1.1,w.clientX-E.left,w.clientY-E.top,e.vp()),e.draw()},b=()=>{d()||e.pointerLeave()},S=w=>w.preventDefault(),_=w=>g(w,!1),A=w=>g(w,!0);return i.addEventListener("pointerdown",m),i.addEventListener("pointermove",x),i.addEventListener("pointerup",_),i.addEventListener("pointercancel",A),i.addEventListener("pointerleave",b),i.addEventListener("wheel",p,{passive:!1}),i.addEventListener("contextmenu",S),{penEverSeen:()=>s,dispose(){i.removeEventListener("pointerdown",m),i.removeEventListener("pointermove",x),i.removeEventListener("pointerup",_),i.removeEventListener("pointercancel",A),i.removeEventListener("pointerleave",b),i.removeEventListener("wheel",p),i.removeEventListener("contextmenu",S)}}}var hp=1e-9;function k_(i,e,t){let n=Re(t,e),s=te(n,n);if(s===0)return e;let r=Math.max(0,Math.min(1,te(Re(i,e),n)/s));return{x:e.x+n.x*r,y:e.y+n.y*r,z:e.z+n.z*r}}var ql=class{constructor(e,t=0){V(this,"faces",[]);V(this,"floor",0);V(this,"revision",-1);e&&this.rebuild(e,t)}rebuild(e,t=0){this.revision=t,this.faces=[];let n=0;for(let s of e.vertices())s.z<n&&(n=s.z);this.floor=n;for(let s of e.faces()){let r=e.planeOf(s.id),o=e.faceRings3(s.id);if(!r||!o||o.outer.length<3)continue;let a=[o.outer,...o.holes],l={x:1/0,y:1/0,z:1/0},c={x:-1/0,y:-1/0,z:-1/0};for(let h of o.outer)h.x<l.x&&(l.x=h.x),h.y<l.y&&(l.y=h.y),h.z<l.z&&(l.z=h.z),h.x>c.x&&(c.x=h.x),h.y>c.y&&(c.y=h.y),h.z>c.z&&(c.z=h.z);this.faces.push({plane:r.plane,basis:r.basis,outer2:s.outer.pts,holes2:s.holes.map(h=>h.pts),rings3:a,min:l,max:c})}}faceCount(){return this.faces.length}floorZ(){return this.floor}inside(e,t){let n={x:te(t,e.basis.u),y:te(t,e.basis.v)};if(!dt(n,e.outer2))return!1;for(let s of e.holes2)if(dt(n,s))return!1;return!0}pushOut(e,t){let n={x:e.x,y:e.y,z:e.z},s=!1;for(let r of this.faces){if(n.x+t<r.min.x||n.x-t>r.max.x||n.y+t<r.min.y||n.y-t>r.max.y||n.z+t<r.min.z||n.z-t>r.max.z)continue;let o=r.plane.n,a=te(o,n)-r.plane.d;if(Math.abs(a)>=t)continue;let l={x:n.x-o.x*a,y:n.y-o.y*a,z:n.z-o.z*a};if(this.inside(r,l)){let u=(a>=0?1:-1)*(t-Math.abs(a));n.x+=o.x*u,n.y+=o.y*u,n.z+=o.z*u,s=!0;continue}let c=null,h=t;for(let d of r.rings3)for(let u=0;u<d.length;u++){let f=k_(n,d[u],d[(u+1)%d.length]),m=Math.hypot(n.x-f.x,n.y-f.y,n.z-f.z);m<h&&(h=m,c=f)}if(c&&h>1e-12){let d=(t-h)/h;n.x+=(n.x-c.x)*d,n.y+=(n.y-c.y)*d,n.z+=(n.z-c.z)*d,s=!0}}return s?{x:n.x-e.x,y:n.y-e.y,z:n.z-e.z}:null}floorBelow(e,t,n,s,r){let o=this.floor<=n+1e-9&&this.floor>=s-1e-9?this.floor:null;for(let a of this.faces){let l=a.plane.n;if(Math.abs(l.z)<r||e<a.min.x-1e-9||e>a.max.x+1e-9||t<a.min.y-1e-9||t>a.max.y+1e-9||a.max.z<s-1e-9||a.min.z>n+1e-9)continue;let c=(a.plane.d-l.x*e-l.y*t)/l.z;c>n+1e-9||c<s-1e-9||o!==null&&c<=o||this.inside(a,{x:e,y:t,z:c})&&(o=c)}return o}segmentHit(e,t){let n=null,s=Re(t,e);if(Math.abs(s.z)>hp){let a=(this.floor-e.z)/s.z;a>=0&&a<=1&&(n={p:{x:e.x+s.x*a,y:e.y+s.y*a,z:this.floor},n:{x:0,y:0,z:1},t:a})}let r={x:Math.min(e.x,t.x),y:Math.min(e.y,t.y),z:Math.min(e.z,t.z)},o={x:Math.max(e.x,t.x),y:Math.max(e.y,t.y),z:Math.max(e.z,t.z)};for(let a of this.faces){if(o.x<a.min.x||r.x>a.max.x||o.y<a.min.y||r.y>a.max.y||o.z<a.min.z||r.z>a.max.z)continue;let l=a.plane.n,c=te(l,s);if(Math.abs(c)<hp)continue;let h=(a.plane.d-te(l,e))/c;if(h<0||h>1||n&&h>=n.t)continue;let d={x:e.x+s.x*h,y:e.y+s.y*h,z:e.z+s.z*h};this.inside(a,d)&&(n={p:d,n:l,t:h})}return n}};function Js(i=1.7){return{walkX:0,walkY:0,dash:!1,turn:0,tpCharge:!1,tpBack:!1,tierStep:0,yawStep:0,jump:!1,crouch:!1,up:!1,down:!1,head:{local:{x:0,y:0,z:i},fwdLocal:{x:0,y:1,z:0}},aim:null}}function fp(i){return{...i,turn:0,tierStep:0,yawStep:0}}var Yl={ENTER:.6,EXIT:.4,SECTOR_HALF:30*Math.PI/180,HOLD_HALF:45*Math.PI/180},up={right:0,up:Math.PI/2,left:Math.PI,down:-Math.PI/2},dp=(i,e)=>{let t=i-e;for(;t>Math.PI;)t-=2*Math.PI;for(;t<-Math.PI;)t+=2*Math.PI;return Math.abs(t)},so=class{constructor(){V(this,"dir","none")}update(e,t){let n=Math.hypot(e,t),s=Math.atan2(t,e);if(this.dir!=="none"){if(n>=Yl.EXIT&&dp(s,up[this.dir])<=Yl.HOLD_HALF)return this.dir;this.dir="none"}if(n>=Yl.ENTER){for(let r of["up","down","left","right"])if(dp(s,up[r])<=Yl.SECTOR_HALF){this.dir=r;break}}return this.dir}},di=class{constructor(){V(this,"was",!1)}update(e,t){let n=e===t,s=n&&!this.was;return this.was=n,s}},ro=class{constructor(){V(this,"was",!1)}update(e){let t=e&&!this.was;return this.was=e,t}};var fu=[5,8,12,1/0],V_=1,H_=9.8,pp=.04,G_=3,pu=300,mu=.3,W_=.15,X_=Math.PI/4;function mp(i,e,t,n){let s=n.g??H_,r=[e.origin],o=null;if(Number.isFinite(t)){let a=e.dir.x*t,l=e.dir.y*t,c=e.dir.z*t,h=e.origin;for(let d=pp;d<=G_+1e-9;d+=pp){let u={x:e.origin.x+a*d,y:e.origin.y+l*d,z:e.origin.z+c*d-.5*s*d*d};if(o=i.segmentHit(h,u),o){r.push(o.p);break}r.push(u),h=u}}else{let a={x:e.origin.x+e.dir.x*pu,y:e.origin.y+e.dir.y*pu,z:e.origin.z+e.dir.z*pu};o=i.segmentHit(e.origin,a),r.push(o?o.p:a)}return o?Math.abs(o.n.z)<n.minNz?{points:r,hit:o,valid:!1,reason:"slope"}:n.headroomOk(o.p)?{points:r,hit:o,valid:!0,reason:"ok"}:{points:r,hit:o,valid:!1,reason:"headroom"}:{points:r,hit:null,valid:!1,reason:"no-hit"}}var gu=()=>({charging:!1,tier:V_,yawSteps:0,arc:null,cooldownUntil:-1,backHeld:0,last:null});function gp(i,e,t,n,s,r){if(i.charging){if(e.tierStep&&(i.tier=Math.max(0,Math.min(fu.length-1,i.tier+e.tierStep))),e.yawStep&&(i.yawSteps+=e.yawStep),e.tpBack)return i.charging=!1,i.arc=null,i.yawSteps=0,i.cooldownUntil=t+mu,{kind:"none"};if(e.tpCharge)return i.arc=e.aim?mp(s,e.aim,fu[i.tier]*r.v0Scale,r):null,{kind:"none"};i.charging=!1;let o=i.arc,a=i.yawSteps*X_;return i.arc=null,i.yawSteps=0,i.cooldownUntil=t+mu,o?.valid&&o.hit?{kind:"jump",to:o.hit.p,headingDelta:a}:{kind:"none"}}if(e.tpCharge)return i.charging=!0,i.yawSteps=0,i.arc=e.aim?mp(s,e.aim,fu[i.tier]*r.v0Scale,r):null,{kind:"none"};if(e.tpBack&&t>=i.cooldownUntil){if(i.backHeld+=n,i.backHeld>=W_&&i.last)return i.backHeld=-1/0,i.cooldownUntil=t+mu,{kind:"back",to:i.last.pos,heading:i.last.heading}}else i.backHeld=0;return{kind:"none"}}var us={walkSpeed:3,dashSpeed:6,flySpeed:5,flyDashSpeed:12,jumpVel:5.5,gravity:25,gravityHeld:15,terminalVel:50,height:1.7,radius:.3,stepHeight:.3,stickDown:.3,followTau:.06,crouchMinHead:.75,crouchDrop:.7,substepLen:.3,substepCap:8,maxRoomscaleStep:.5,snapTurnDeg:45,maxSlopeDeg:50,stickDeadzone:.15,passivePushCap:.05},Zl=1/60,xp=8;function q_(i=us){return{pos:{x:0,y:0,z:0},heading:0,trackingOrigin:{x:0,y:0},headZ:i.height,crouchDrop:0,velZ:0,grounded:!0,noclip:!1,scale:1,t:0,freezeReasons:new Set,discontinuity:!1,teleport:gu()}}var bp=i=>i.freezeReasons.size>0,Sp=i=>({x:-Math.sin(i),y:Math.cos(i)}),xu=i=>({x:Math.cos(i),y:Math.sin(i)});function ei(i,e,t){let n=Sp(i),s=xu(i);return{x:s.x*e+n.x*t,y:s.y*e+n.y*t}}function yp(i,e,t){let n=Sp(i),s=xu(i);return{x:s.x*e+s.y*t,y:n.x*e+n.y*t}}function Mp(i,e){let t=e.radius,n=i-t,s=Math.min(e.stepHeight+t,n),r=(s+n)*.5;return{r:t,topZ:n,bottomZ:s,midZ:r,degenerate:n<=s+.01}}function Y_(i,e,t,n,s){let r=Mp(e,n),o=0,a=l=>{if(s-o<=1e-9)return;let c=t.pushOut({x:i.x,y:i.y,z:i.z+l},r.r);if(!c)return;let h=Math.hypot(c.x,c.y,c.z);if(h===0)return;let d=1,u=s-o;h>u&&(d=u/h,h=u),i.x+=c.x*d,i.y+=c.y*d,i.z+=c.z*d,o+=h};return a(r.bottomZ),r.degenerate||(a(r.midZ),a(r.topZ)),o}function yu(i,e,t,n,s=1/0){let r=s,o=0;for(let a=0;a<5;a++){let l=Y_(i,e,t,n,r);if(o+=l,l<1e-6||Number.isFinite(r)&&(r-=l,r<=1e-6))break}return o}var Z_=[[0,0],[1,0],[-1,0],[0,1],[0,-1]];function $_(i,e,t){let n=i.z+t.stepHeight,s=i.z-t.stickDown,r=t.radius*.7,o=Math.cos(t.maxSlopeDeg*Math.PI/180),a=null;for(let[l,c]of Z_){let h=e.floorBelow(i.x+l*r,i.y+c*r,n,s,o);h!==null&&(a===null||h>a)&&(a=h)}return a}function K_(i,e,t,n,s,r=.02){if(t<=e)return t;let o=s.radius,a=c=>!!n.pushOut({x:i.x,y:i.y,z:i.z+c-o},o-r),l=e;for(let c=e+.05;c<t;c+=.05){if(a(c))return l;l=c}return a(t)?l:t}function J_(i,e,t){let n=Mp(t.height,t),s=.02;return!(e.pushOut({x:i.x,y:i.y,z:i.z+n.bottomZ},n.r-s)||!n.degenerate&&(e.pushOut({x:i.x,y:i.y,z:i.z+n.midZ},n.r-s)||e.pushOut({x:i.x,y:i.y,z:i.z+n.topZ},n.r-s)))}function vp(i,e,t,n,s){if(i.noclip){i.pos.x+=e,i.pos.y+=t;return}let r=Math.hypot(e,t),o=Math.min(s.substepCap,Math.max(1,Math.ceil(r/s.substepLen))),a=e/o,l=t/o;for(let c=0;c<o;c++)i.pos.x+=a,i.pos.y+=l,yu(i.pos,i.headZ,n,s)}function j_(i,e,t,n,s){let r={x:t.head.local.x-i.trackingOrigin.x,y:t.head.local.y-i.trackingOrigin.y},o=ei(i.heading,r.x,r.y);i.pos.x+=o.x,i.pos.y+=o.y,i.noclip||yu(i.pos,i.headZ,n,s),i.trackingOrigin={x:t.head.local.x,y:t.head.local.y},i.heading+=e,i.discontinuity=!0}function Q_(i,e,t,n,s=us){i.t+=t;let r=bp(i);{let a=1-Math.exp(-t/.1);i.crouchDrop+=((e.crouch?s.crouchDrop:0)-i.crouchDrop)*a;let l=Math.max(s.crouchMinHead,e.head.local.z-i.crouchDrop);i.noclip||l<=i.headZ?i.headZ=l:i.headZ=Math.max(s.crouchMinHead,K_(i.pos,i.headZ,l,n,s))}e.turn&&j_(i,e.turn*s.snapTurnDeg*Math.PI/180,e,n,s);let o=Math.hypot(e.walkX,e.walkY);if(o>=s.stickDeadzone){let a=Math.min(o,1)/o,l=eb(i.heading,e.head.fwdLocal);if(i.noclip){let c=(e.dash?s.flyDashSpeed:s.flySpeed)*t*a,h=xu(i.heading),d=yp(i.heading,h.x,h.y),u=ei(i.heading,d.x,d.y);i.pos.x+=(l.x*e.walkY+u.x*e.walkX)*c,i.pos.y+=(l.y*e.walkY+u.y*e.walkX)*c,i.pos.z+=l.z*e.walkY*c}else{let c=Math.hypot(l.x,l.y)||1,h=l.x/c,d=l.y/c,u=d,f=-h,m=(e.dash?s.dashSpeed:s.walkSpeed)*t*a;vp(i,(h*e.walkY+u*e.walkX)*m,(d*e.walkY+f*e.walkX)*m,n,s)}}else{let a={x:e.head.local.x-i.trackingOrigin.x,y:e.head.local.y-i.trackingOrigin.y},l=ei(i.heading,a.x,a.y),c=Math.hypot(l.x,l.y);if(c>s.maxRoomscaleStep)i.trackingOrigin={x:e.head.local.x,y:e.head.local.y};else if(c>1e-9){let h={x:i.pos.x,y:i.pos.y};vp(i,l.x,l.y,n,s);let d={x:i.pos.x-h.x,y:i.pos.y-h.y},u=yp(i.heading,d.x,d.y);i.trackingOrigin={x:i.trackingOrigin.x+u.x,y:i.trackingOrigin.y+u.y}}}if(i.noclip){let a=(e.dash?s.flyDashSpeed:s.flySpeed)*t;e.up&&(i.pos.z+=a),e.down&&(i.pos.z-=a),i.velZ=0,i.grounded=!0}else if(!r){e.jump&&i.grounded&&(i.velZ=s.jumpVel,i.grounded=!1);let a=i.pos.z,l=yu(i.pos,i.headZ,n,s,s.passivePushCap);i.velZ>0&&i.pos.z<a-1e-4&&(i.velZ=0);let c=l>1e-6,h=i.velZ<=0?$_(i.pos,n,s):null;if(h!==null&&(!c||h>=i.pos.z-1e-6)){let d=1-Math.exp(-t/s.followTau);i.pos.z+=(h-i.pos.z)*d,i.velZ=0,i.grounded=!0}else if(c)i.velZ=0;else{i.grounded=!1;let d=e.jump&&i.velZ>0?s.gravityHeld:s.gravity;i.velZ-=d*t,i.velZ<-s.terminalVel&&(i.velZ=-s.terminalVel),i.pos.z+=i.velZ*t;let u=n.floorZ();i.pos.z<=u&&(i.pos.z=u,i.velZ=0,i.grounded=!0)}}if(r)i.teleport.charging&&(i.teleport.charging=!1,i.teleport.arc=null,i.teleport.yawSteps=0);else{let a=Math.cos(s.maxSlopeDeg*Math.PI/180),l=gp(i.teleport,e,i.t,t,n,{minNz:a,headroomOk:c=>J_(c,n,s),v0Scale:Math.sqrt(i.scale)});if(l.kind==="jump")i.teleport.last={pos:{...i.pos},heading:i.heading},_p(i,l.to,i.heading+l.headingDelta,e);else if(l.kind==="back"){let c={pos:{...i.pos},heading:i.heading};_p(i,l.to,l.heading,e),i.teleport.last=c}}}function eb(i,e){let t=ei(i,e.x,e.y);return{x:t.x,y:t.y,z:e.z}}function _p(i,e,t,n){i.pos={...e},i.heading=t,i.trackingOrigin={x:n.head.local.x,y:n.head.local.y},i.velZ=0,i.grounded=!0,i.discontinuity=!0}function oo(i,e){let t=ei(i.heading,i.trackingOrigin.x,i.trackingOrigin.y),n={x:i.pos.x-t.x,y:i.pos.y-t.y,z:i.pos.z-i.crouchDrop},s=ei(i.heading,e.x,e.y);return{origin:n,heading:i.heading,headWorld:{x:n.x+s.x,y:n.y+s.y,z:n.z+e.z}}}var $l=class{constructor(e,t=us){V(this,"state");V(this,"acc",0);V(this,"prev");V(this,"cur");V(this,"lastHead",{x:0,y:0,z:1.7});V(this,"world");V(this,"cfg");this.world=e,this.cfg=t,this.state=q_(t),this.prev=this.cur=oo(this.state,this.lastHead)}freeze(e){this.state.freezeReasons.add(e)}thaw(e){this.state.freezeReasons.delete(e)}setFrozen(e,t){t?this.freeze(e):this.thaw(e)}isFrozen(){return bp(this.state)}advance(e,t){this.lastHead=e.head.local,this.acc+=Math.min(t,.25);let n=0,s=!1,r=e;for(;this.acc>=Zl&&n<xp;)this.prev=oo(this.state,this.lastHead),Q_(this.state,r,Zl,this.world,this.cfg),this.state.discontinuity&&(s=!0,this.state.discontinuity=!1),this.acc-=Zl,n++,r=fp(r);n===xp&&(this.acc=0),this.cur=oo(this.state,this.lastHead),s&&(this.prev=this.cur)}pose(){let e=Math.max(0,Math.min(1,this.acc/Zl)),t={x:this.prev.origin.x+(this.cur.origin.x-this.prev.origin.x)*e,y:this.prev.origin.y+(this.cur.origin.y-this.prev.origin.y)*e,z:this.prev.origin.z+(this.cur.origin.z-this.prev.origin.z)*e},n=ei(this.cur.heading,this.lastHead.x,this.lastHead.y);return{origin:t,heading:this.cur.heading,headWorld:{x:t.x+n.x,y:t.y+n.y,z:t.z+this.lastHead.z}}}reset(e,t,n){let s=this.state;s.pos={...e},s.heading=t,s.trackingOrigin={x:n.x,y:n.y},s.headZ=Math.max(this.cfg.crouchMinHead,n.z),s.velZ=0,s.grounded=!0,s.crouchDrop=0,s.teleport=gu(),s.discontinuity=!1,this.lastHead=n,this.acc=0,this.prev=this.cur=oo(s,n)}handleTrackingReset(e,t){let n=this.state;n.heading+=e,n.trackingOrigin={x:t.x,y:t.y},this.lastHead=t,this.prev=this.cur=oo(n,t)}};var tb=new Set(["KeyW","KeyA","KeyS","KeyD","KeyQ","KeyE","Space","ControlLeft","ControlRight","ShiftLeft","ShiftRight","ArrowLeft","ArrowRight","ArrowUp","ArrowDown","KeyT","KeyG"]),Kl=class{constructor(){V(this,"down",new Set);V(this,"edges",[]);V(this,"_enabled",!1);V(this,"onKeyDown",e=>{if(!this._enabled)return;let t=e.target;t&&(t.tagName==="INPUT"||t.tagName==="TEXTAREA")||!tb.has(e.code)||e.metaKey||e.altKey||(!e.repeat&&!this.down.has(e.code)&&this.edges.push(e.code),this.down.add(e.code),e.preventDefault())});V(this,"onKeyUp",e=>{this.down.delete(e.code)});V(this,"onBlur",()=>{this.down.clear(),this.edges=[]})}attach(){window.addEventListener("keydown",this.onKeyDown),window.addEventListener("keyup",this.onKeyUp),window.addEventListener("blur",this.onBlur)}detach(){window.removeEventListener("keydown",this.onKeyDown),window.removeEventListener("keyup",this.onKeyUp),window.removeEventListener("blur",this.onBlur),this.onBlur()}setEnabled(e){this._enabled=e,e||this.onBlur()}isDown(e){return this.down.has(e)}read(e,t){let n=this.down,s=Js();s.head=e,s.aim=t,s.walkX=(n.has("KeyD")?1:0)-(n.has("KeyA")?1:0),s.walkY=(n.has("KeyW")?1:0)-(n.has("KeyS")?1:0),s.dash=n.has("ShiftLeft")||n.has("ShiftRight"),s.jump=n.has("Space"),s.crouch=n.has("ControlLeft")||n.has("ControlRight"),s.up=n.has("KeyE"),s.down=n.has("KeyQ"),s.tpCharge=n.has("KeyT"),s.tpBack=n.has("KeyG");let r=s.tpCharge;for(let o of this.edges)o==="ArrowLeft"?r?s.yawStep=1:s.turn=1:o==="ArrowRight"?r?s.yawStep=-1:s.turn=-1:o==="ArrowUp"&&r?s.tierStep=1:o==="ArrowDown"&&r&&(s.tierStep=-1);return this.edges=[],s}};var wp=.004,Jl=1.5,jl=5,nb=.05,Ql=class{constructor(e,t){V(this,"world",new ql);V(this,"sim",new $l(this.world,us));V(this,"flat",new Kl);V(this,"mode","orbit");V(this,"lookPitch",0);V(this,"saved",null);V(this,"cursor",{x:0,y:0});V(this,"externalInput",null);V(this,"editor");V(this,"canvas");V(this,"lastStance",null);this.editor=e,this.canvas=t,this.flat.attach(),t.addEventListener("pointermove",n=>{let s=t.getBoundingClientRect();this.cursor={x:n.clientX-s.left,y:n.clientY-s.top}})}getMode(){return this.mode}isWalking(){return this.mode==="walk"}isXR(){return this.mode==="xr"}enterXR(e){let t=this.editor.cam;this.mode==="orbit"&&(this.saved={target:{...t.target},yaw:t.yaw,pitch:t.pitch,halfH:t.halfH,projection:t.projection,nearMin:t.nearMin}),this.flat.setEnabled(!1),this.syncWorld(!0);let n=this.lastStance;if(!n){let s=t.forward(),r=t.target,o=this.world.floorBelow(r.x,r.y,r.z+50,this.world.floorZ()-1,.5);n={pos:{x:r.x,y:r.y,z:o??Math.max(r.z,this.world.floorZ())},heading:Math.atan2(-s.x,s.y)}}return this.mode="xr",this.externalInput=e,n}exitXR(){if(this.mode!=="xr")return;this.lastStance={pos:{...this.sim.state.pos},heading:this.sim.state.heading},this.externalInput=null,this.mode="orbit";let e=this.editor.cam;this.saved&&(e.target=this.saved.target,e.yaw=this.saved.yaw,e.pitch=this.saved.pitch,e.halfH=this.saved.halfH,e.projection=this.saved.projection,e.nearMin=this.saved.nearMin),this.editor.draw()}get noclip(){return this.sim.state.noclip}setNoclip(e){this.sim.state.noclip=e}enterWalk(){if(this.mode==="walk")return;let e=this.editor.cam;this.saved={target:{...e.target},yaw:e.yaw,pitch:e.pitch,halfH:e.halfH,projection:e.projection,nearMin:e.nearMin},this.syncWorld(!0);let t=e.forward(),n=Math.atan2(-t.x,t.y),s=e.target,o=this.world.floorBelow(s.x,s.y,s.z+50,this.world.floorZ()-1,.5)??Math.max(s.z,this.world.floorZ());this.sim.reset({x:s.x,y:s.y,z:o},n,{x:0,y:0,z:us.height}),this.lookPitch=Math.max(-Jl,Math.min(Jl,Math.asin(Math.max(-1,Math.min(1,t.z))))),this.mode="walk",this.flat.setEnabled(!0),e.projection="persp",e.nearMin=nb,this.syncCamera()}exitWalk(){if(this.mode!=="walk")return;this.mode="orbit",this.flat.setEnabled(!1);let e=this.editor.cam;this.saved&&(e.target=this.saved.target,e.yaw=this.saved.yaw,e.pitch=this.saved.pitch,e.halfH=this.saved.halfH,e.projection=this.saved.projection,e.nearMin=this.saved.nearMin),this.editor.draw()}toggleWalk(){this.mode==="walk"?this.exitWalk():this.enterWalk()}look(e,t){return this.mode!=="walk"?!1:(this.sim.state.heading-=e*wp,this.lookPitch=Math.max(-Jl,Math.min(Jl,this.lookPitch-t*wp)),this.syncCamera(),!0)}syncWorld(e=!1){(e||this.world.revision!==this.editor.revision)&&this.world.rebuild(this.editor.kernel,this.editor.revision)}tick(e){if(this.mode==="orbit")return;this.syncWorld(),this.sim.setFrozen("gesture",this.editor.isGestureActive());let t=this.mode==="xr"&&this.externalInput?this.externalInput(e):this.readFlat();this.sim.advance(t,e),this.mode==="walk"&&this.syncCamera()}readFlat(){let e=this.lookPitch,t={local:{x:0,y:0,z:us.height},fwdLocal:{x:0,y:Math.cos(e),z:Math.sin(e)}},n=this.editor.vp(),s=n.w>0&&n.h>0?this.editor.cam.ray(this.cursor.x,this.cursor.y,n):null;return this.flat.read(t,s)}pose(){return this.sim.pose()}syncCamera(){let e=this.editor.cam,t=this.sim.pose(),n=t.heading,s=this.lookPitch,r={x:-Math.sin(n)*Math.cos(s),y:Math.cos(n)*Math.cos(s),z:Math.sin(s)},o=t.headWorld;e.target={x:o.x+r.x*jl,y:o.y+r.y*jl,z:o.z+r.z*jl},e.yaw=n-Math.PI/2,e.pitch=-s,e.halfH=jl*Math.tan(e.fovY/2)}teleportArc(){let e=this.sim.state.teleport.arc;return e?{points:e.points,valid:e.valid,landing:e.valid&&e.hit?e.hit.p:null}:null}dispose(){this.flat.detach()}};var ao={w:800,h:800},ib=80*Math.PI/180,sb={x:0,y:0,z:1},ec=class{constructor(){V(this,"origin",{x:0,y:0,z:0});V(this,"dir",{x:0,y:1,z:0});V(this,"rightV",{x:1,y:0,z:0});V(this,"upV",{x:0,y:0,z:1});V(this,"downDir",null);V(this,"fovY",ib)}set(e,t){this.origin=e.origin,this.dir=yn(e.dir);let n=Rt(this.dir,sb);Math.hypot(n.x,n.y,n.z)<.001&&(n=Rt(this.dir,t??{x:0,y:1,z:0})),this.rightV=yn(n),this.upV=Rt(this.rightV,this.dir)}current(){return{origin:this.origin,dir:this.dir}}cursor(){return{x:ao.w/2,y:ao.h/2}}markDown(){this.downDir=this.dir}travelPx(){if(!this.downDir)return 0;let e=Math.max(-1,Math.min(1,te(this.downDir,this.dir)));return Math.acos(e)/this.fovY*ao.h}ray(e,t,n){let s=Math.tan(this.fovY/2),r=(e/n.w*2-1)*s*(n.w/n.h),o=(1-t/n.h*2)*s,a=yn(Be(Be(this.dir,Ue(this.rightV,r)),Ue(this.upV,o)));return{origin:this.origin,dir:a}}angularPx(e,t){let n=Re(e,this.origin),s=Math.max(te(n,this.dir),.01),r=Math.tan(this.fovY/2),o=te(n,this.rightV)/(s*r*(t.w/t.h)),a=te(n,this.upV)/(s*r);return{x:(o*.5+.5)*t.w,y:(.5-a*.5)*t.h}}viewDir(e){return yn(Re(this.origin,e))}forward(){return this.dir}};var nc=i=>({x:i.x,y:-i.z,z:i.y});function Ap(i,e){let{x:t,y:n,z:s,w:r}=i,o=2*(n*e.z-s*e.y),a=2*(s*e.x-t*e.z),l=2*(t*e.y-n*e.x);return{x:e.x+r*o+(n*l-s*a),y:e.y+r*a+(s*o-t*l),z:e.z+r*l+(t*a-n*o)}}var Pp=i=>nc(Ap(i,{x:0,y:0,z:-1})),Rp=i=>nc(Ap(i,{x:0,y:1,z:0}));function rb(i,e){let t=ei(i.heading,e.x,e.y);return{x:i.origin.x+t.x,y:i.origin.y+t.y,z:i.origin.z+e.z}}function vu(i,e){let t=ei(i.heading,e.x,e.y);return{x:t.x,y:t.y,z:e.z}}function Ep(i,e){return{origin:rb(e,nc(i.position)),dir:vu(e,Pp(i.orientation))}}function ob(i){return{local:nc(i.position),fwdLocal:Pp(i.orientation)}}var Tp=()=>({present:!1,ray:null,gripRay:null,trigger:!1,triggerValue:0,squeeze:!1,stickPress:!1,a:!1,b:!1,axes:{x:0,y:0}}),tc=class{constructor(){V(this,"dpadL",new so);V(this,"dpadR",new so);V(this,"turnL",new di);V(this,"turnR",new di);V(this,"tierUp",new di);V(this,"tierDown",new di);V(this,"yawL",new di);V(this,"yawR",new di);V(this,"xEdge",new ro);V(this,"yEdge",new ro);V(this,"lastHead",{local:{x:0,y:0,z:1.6},fwdLocal:{x:0,y:1,z:0}})}read(e,t,n,s,r){let o=Tp(),a=Tp(),l=null,c=t.getViewerPose(n);c&&(l={position:c.transform.position,orientation:c.transform.orientation},this.lastHead=ob(l));for(let x of e.inputSources){if(x.handedness!=="left"&&x.handedness!=="right")continue;let g=x.handedness==="left"?o:a;g.present=!0;let p=t.getPose(x.targetRaySpace,n);if(p&&(g.ray=Ep({position:p.transform.position,orientation:p.transform.orientation},s)),x.gripSpace){let S=t.getPose(x.gripSpace,n);S&&(g.gripRay=Ep({position:S.transform.position,orientation:S.transform.orientation},s))}let b=x.gamepad;if(b){let S=b.axes,_=Math.abs(S[2]??0)+Math.abs(S[3]??0),A=Math.abs(S[0]??0)+Math.abs(S[1]??0);g.axes=_>=A?{x:S[2]??0,y:-(S[3]??0)}:{x:S[0]??0,y:-(S[1]??0)},g.trigger=!!b.buttons[0]?.pressed,g.triggerValue=b.buttons[0]?.value??0,g.squeeze=!!b.buttons[1]?.pressed,g.stickPress=!!b.buttons[3]?.pressed,g.a=!!b.buttons[4]?.pressed,g.b=!!b.buttons[5]?.pressed}}let h=Js();h.head=this.lastHead,h.aim=a.ray;let d=this.dpadR.update(a.axes.x,a.axes.y);this.turnL.update(d,"left")&&(h.turn=1),this.turnR.update(d,"right")&&(h.turn=-1),h.tpCharge=d==="up",h.tpBack=d==="down";let u=this.dpadL.update(o.axes.x,o.axes.y);h.tpCharge?(this.tierUp.update(u,"up")&&(h.tierStep=1),this.tierDown.update(u,"down")&&(h.tierStep=-1),this.yawL.update(u,"left")&&(h.yawStep=1),this.yawR.update(u,"right")&&(h.yawStep=-1)):(h.walkX=o.axes.x,h.walkY=o.axes.y,this.tierUp.update("none","up"),this.tierDown.update("none","down"),this.yawL.update("none","left"),this.yawR.update("none","right")),h.dash=o.stickPress,r?(h.up=a.a,h.down=a.b):(h.jump=a.a,h.crouch=a.b);let f=this.xEdge.update(o.a),m=this.yEdge.update(o.b);return{input:h,left:o,right:a,undoEdge:f,redoEdge:m,head:l}}};function Nn(i,e,t=.7,n=60){if(i)for(let s of i.inputSources){if(e!=="both"&&s.handedness!==e)continue;let r=s.gamepad?.hapticActuators?.[0];r?.pulse&&r.pulse(t,n).catch(()=>{})}}var js={w:512,h:520},_u={w:.16,h:.1625},ic=new Map;function ab(i,e,t){let n=`${i}|${e}`;if(ic.has(n))return ic.get(n);let s=document.getElementById(i);if(!s||s.tagName.toLowerCase()!=="symbol")return ic.set(n,null),null;let r=["viewBox","fill","stroke","stroke-width","stroke-linecap","stroke-linejoin"].map(c=>{let h=s.getAttribute(c);return h?`${c}="${h.replace(/currentColor/g,e)}"`:""}).join(" "),o=s.innerHTML.replace(/currentColor/g,e),a=`<svg xmlns="http://www.w3.org/2000/svg" ${r} width="64" height="64">${o}</svg>`,l=new Image;return l.onload=t,l.src="data:image/svg+xml;charset=utf-8,"+encodeURIComponent(a),ic.set(n,l),l}var rc=class{constructor(e){V(this,"canvas");V(this,"ctx");V(this,"cells",[]);V(this,"hover",null);V(this,"pressed",null);V(this,"dirty",!0);V(this,"model");this.model=e,this.canvas=document.createElement("canvas"),this.canvas.width=js.w,this.canvas.height=js.h,this.ctx=this.canvas.getContext("2d")}setHover(e){e!==this.hover&&(this.hover=e,this.dirty=!0)}setPressed(e){e!==this.pressed&&(this.pressed=e,this.dirty=!0)}hovered(){return this.hover}hit(e,t){let n=e*js.w,s=t*js.h;for(let r of this.cells)if(n>=r.x&&n<=r.x+r.w&&s>=r.y&&s<=r.y+r.h&&!r.item.disabled)return r.id;return null}redraw(e=!1){if(!this.dirty&&!e)return!1;this.dirty=!1;let t=this.ctx,n=js.w,s=js.h,r=()=>{this.dirty=!0};t.clearRect(0,0,n,s),t.fillStyle="rgba(255,255,255,0.92)",sc(t,0,0,n,s,28),t.fill(),t.strokeStyle="rgba(0,0,0,0.12)",t.lineWidth=3,sc(t,1.5,1.5,n-3,s-3,27),t.stroke(),this.cells=[];let o=18;t.fillStyle="#4a4a4a",t.font="22px system-ui, -apple-system, 'PingFang SC', 'Noto Sans CJK SC', sans-serif",t.textBaseline="top";let a=lb(t,this.model.status(),n-40,2);for(let p of a)t.fillText(p,20,o),o+=28;o=Math.max(o,18+2*28)+10;let l=this.model.tools().filter(p=>!p.hidden),c=(n-40-2*10)/3,h=96;l.forEach((p,b)=>{let S=20+b%3*(c+10),_=o+Math.floor(b/3)*(h+10);this.cell(p,S,_,c,h,r,!0)}),o+=Math.ceil(l.length/3)*(h+10)+8;let d=this.model.edits().filter(p=>!p.hidden),u=(n-40-(d.length-1)*10)/Math.max(1,d.length),f=72;d.forEach((p,b)=>this.cell(p,20+b*(u+10),o,u,f,r,!1)),o+=f+18;let m=this.model.vr().filter(p=>!p.hidden),x=(n-40-(m.length-1)*10)/Math.max(1,m.length),g=72;return m.forEach((p,b)=>this.cell(p,20+b*(x+10),o,x,g,r,!1)),o+=g+12,t.fillStyle="#8a8780",t.font="18px system-ui, sans-serif",t.textAlign="right",t.fillText(this.model.version,n-20,s-30),t.textAlign="left",!0}cell(e,t,n,s,r,o,a){let l=this.ctx;this.cells.push({id:e.id,x:t,y:n,w:s,h:r,item:e});let c=this.hover===e.id,h=this.pressed===e.id;l.fillStyle=e.disabled?"rgba(0,0,0,0.03)":e.active?"#2b6cb0":h?"#cfe0f5":c?"rgba(43,108,176,0.16)":"rgba(0,0,0,0.05)",sc(l,t,n,s,r,14),l.fill(),c&&!e.disabled&&(l.strokeStyle="#2b6cb0",l.lineWidth=3,sc(l,t+1.5,n+1.5,s-3,r-3,13),l.stroke());let d=e.disabled?"#b0aca4":e.active?"#ffffff":e.danger?"#c0392b":"#2a2a2a",u=a?40:30,f=n+r/2;if(e.icon){let m=ab(e.icon,d,o),x=t+s/2-u/2,g=a?n+12:n+r/2-u/2-(a?0:12);m&&m.complete&&m.naturalWidth>0&&l.drawImage(m,x,g,u,u),f=a?n+12+u+20:n+r/2+22}l.fillStyle=d,l.font=`${a?22:20}px system-ui, -apple-system, 'PingFang SC', 'Noto Sans CJK SC', sans-serif`,l.textAlign="center",l.textBaseline="middle",l.fillText(e.label,t+s/2,f),l.textAlign="left",l.textBaseline="top"}};function sc(i,e,t,n,s,r){i.beginPath(),i.moveTo(e+r,t),i.lineTo(e+n-r,t),i.quadraticCurveTo(e+n,t,e+n,t+r),i.lineTo(e+n,t+s-r),i.quadraticCurveTo(e+n,t+s,e+n-r,t+s),i.lineTo(e+r,t+s),i.quadraticCurveTo(e,t+s,e,t+s-r),i.lineTo(e,t+r),i.quadraticCurveTo(e,t,e+r,t),i.closePath()}function lb(i,e,t,n){let s=[],r="";for(let o of e)if(i.measureText(r+o).width>t){if(s.push(r),r=o,s.length===n)return s[n-1]=s[n-1].slice(0,-1)+"\u2026",s}else r+=o;return r&&s.push(r),s}var cb=.3,hb=.6,oc=class{constructor(e){V(this,"supported",!1);V(this,"presenting",!1);V(this,"xrInput",new tc);V(this,"frameIn",Js());V(this,"firstFrame",!1);V(this,"spawn",null);V(this,"pendingResetYaw",null);V(this,"resetAttached",!1);V(this,"pointer",new ec);V(this,"trigWas",!1);V(this,"toolDown",!1);V(this,"panelPressId",null);V(this,"holdT",0);V(this,"holdStage",0);V(this,"panel");V(this,"lastHint","");V(this,"opts");this.opts=e,this.panel=new rc(e.hud);let t=e.editor.renderer3.xr;t.on("sessionstart",()=>this.onStart()),t.on("sessionend",()=>this.onEnd()),navigator.xr?.isSessionSupported("immersive-vr").then(n=>{this.supported=n,e.onChange()}).catch(()=>{})}isSupported(){return this.supported}isPresenting(){return this.presenting}enter(){!navigator.xr||this.presenting||navigator.xr.requestSession("immersive-vr",{optionalFeatures:["local-floor"]}).then(e=>this.opts.editor.renderer3.xr.setSession(e)).catch(e=>this.opts.log?.(`VR session failed: ${e.message}`))}exit(){this.opts.editor.renderer3.xr.session()?.end().catch(()=>{})}onStart(){let{editor:e,locomotion:t}=this.opts;this.presenting=!0,this.firstFrame=!0,this.resetAttached=!1,this.pendingResetYaw=null,this.trigWas=!1,this.toolDown=!1,this.panelPressId=null,this.holdStage=0,this.holdT=0,this.spawn=t.enterXR(()=>this.frameIn),e.setPointerFrame(this.pointer,ao),e.renderer3.attachWristPanel(this.panel.canvas,_u.w,_u.h,this.opts.leftHanded()?"right":"left"),this.panel.dirty=!0,this.opts.onChange()}onEnd(){let{editor:e,locomotion:t}=this.opts;this.presenting=!1,this.toolDown&&(e.cancel(),this.toolDown=!1),e.setPointerFrame(null),e.renderer3.detachWristPanel(),e.renderer3.setPointerVisual("left",null),e.renderer3.setPointerVisual("right",null),t.exitXR(),this.opts.onChange()}invalidatePanel(){this.panel.dirty=!0}tick(e){if(!this.presenting)return;let{editor:t,locomotion:n}=this.opts,s=t.renderer3,r=s.xr.session(),o=s.xr.frame(),a=s.xr.refSpace();if(!r||!o||!a)return;this.attachReset(a);let l=this.xrInput.read(r,o,a,n.pose(),n.noclip);this.firstFrame&&l.head&&this.spawn&&(n.sim.reset(this.spawn.pos,this.spawn.heading,l.input.head.local),this.firstFrame=!1,l=this.xrInput.read(r,o,a,n.pose(),n.noclip)),this.pendingResetYaw!==null&&l.head&&(n.sim.handleTrackingReset(this.pendingResetYaw,l.input.head.local),this.pendingResetYaw=null);let c=this.opts.leftHanded(),h=c?l.left:l.right,d=c?l.right:l.left,u=c?"left":"right";this.frameIn=l.input,n.tick(e),s.setRig(n.pose()),l.undoEdge&&(t.undo(),Nn(r,d===l.left?"left":"right",.4,40)),l.redoEdge&&(t.redo(),Nn(r,d===l.left?"left":"right",.4,40));let f=h.trigger,m=f&&!this.trigWas,x=!f&&this.trigWas;this.trigWas=f,t.batchDraw(()=>{if(!h.ray){s.setPointerVisual(u,null);return}let p=s.wristHit(h.ray),b=p?this.panel.hit(p.u,p.v):null;if(p&&!this.toolDown)b!==this.panel.hovered()&&(this.panel.setHover(b),b&&Nn(r,u,.25,20)),m&&b&&(this.panelPressId=b,this.panel.setPressed(b),Nn(r,u,.6,40)),x&&this.panelPressId&&(b===this.panelPressId&&this.opts.hud.pick(b),this.panelPressId=null,this.panel.setPressed(null)),s.setPointerVisual(u,{length:p.dist,color:9133302}),this.toolDown||t.pointerLeave();else{this.panel.hovered()&&this.panel.setHover(null),this.panelPressId&&x&&(this.panelPressId=null,this.panel.setPressed(null));let S=(l.head,void 0);this.pointer.set(h.ray,S);let _=this.pointer.cursor(),A=()=>({x:_.x,y:_.y,clientX:0,clientY:0,pointerType:"xr",shiftKey:!1,travelPx:this.pointer.travelPx()});t.tool==="select"?this.selectTick(m,f,x,e,r,u):this.panelPressId||(m?(this.pointer.markDown(),this.toolDown=!0,t.pointerDown(A()),Nn(r,u,.5,30)):x&&this.toolDown?(this.toolDown=!1,t.pointerUp(A()),Nn(r,u,.35,25)):t.pointerMove(A()));let w=n.world.segmentHit(h.ray.origin,{x:h.ray.origin.x+h.ray.dir.x*30,y:h.ray.origin.y+h.ray.dir.y*30,z:h.ray.origin.z+h.ray.dir.z*30});s.setPointerVisual(u,{length:w?w.t*30:3,color:this.toolDown?13382451:2845872})}});let g=this.opts.hud.status();g!==this.lastHint&&(this.lastHint=g,this.panel.dirty=!0),this.panel.redraw()&&s.updateWristTexture()}selectTick(e,t,n,s,r,o){let a=this.opts.editor,l=this.pointer.cursor();if(e&&(this.holdT=0,this.holdStage=0,this.pointer.markDown(),this.toolDown=!0),t&&this.toolDown){this.holdT+=s;let c=a.pickAt(l.x,l.y);this.holdStage===0&&this.holdT>=cb?(this.holdStage=1,a.selectExpand(c,1),Nn(r,o,.7,50)):this.holdStage===1&&this.holdT>=hb&&(this.holdStage=2,a.selectExpand(c,2),Nn(r,o,.9,50),setTimeout(()=>Nn(r,o,.9,50),90));return}if(n&&this.toolDown){this.toolDown=!1,this.holdStage===0&&(a.selectExpand(a.pickAt(l.x,l.y),0),Nn(r,o,.35,25)),this.holdStage=0;return}a.pointerMove({x:l.x,y:l.y,clientX:0,clientY:0,pointerType:"xr",shiftKey:!1})}attachReset(e){this.resetAttached||(this.resetAttached=!0,e.addEventListener("reset",t=>{let n=t.transform?.orientation;if(!n){this.pendingResetYaw=0;return}let s=2*(n.w*n.y+n.z*n.x),r=1-2*(n.y*n.y+n.x*n.x);this.pendingResetYaw=Math.atan2(s,r)}))}};var Cp=new Set(["localhost","127.0.0.1","::1",""]);function Ip(i){let e=location.pathname.includes("/dev/")||Cp.has(location.hostname),t=null;async function n(){try{await i.onBeforeReload?.()}catch{}let o=t??await navigator.serviceWorker?.getRegistration()??null;if(!o||!o.waiting){location.reload();return}let a=!1,l=()=>{a||(a=!0,location.reload())};navigator.serviceWorker.addEventListener("controllerchange",l,{once:!0}),o.waiting.postMessage({type:"skip-waiting"}),setTimeout(l,5e3)}async function s(){await((l,c)=>Promise.race([Promise.resolve(l).catch(()=>{}),new Promise(h=>setTimeout(h,c))]))(i.onBeforeReload?.(),4e3);try{if(navigator.serviceWorker)for(let l of await navigator.serviceWorker.getRegistrations())await l.unregister().catch(()=>{});if(typeof caches<"u")for(let l of await caches.keys())await caches.delete(l).catch(()=>{})}catch{}let a=`${location.pathname}?reset=${Date.now()}`;setTimeout(()=>location.replace(a),150),setTimeout(()=>{location.href=a},2500)}let r=()=>{t?.update().catch(()=>{}),i.onForeground?.()};return document.addEventListener("visibilitychange",()=>{document.visibilityState==="visible"&&r()}),window.addEventListener("focus",r),"serviceWorker"in navigator&&!Cp.has(location.hostname)&&(navigator.serviceWorker.addEventListener("message",o=>{o.data?.type==="asset-updated"&&i.onUpdateAvailable()}),navigator.serviceWorker.register("./service-worker.js").then(o=>{t=o,o.waiting&&navigator.serviceWorker.controller&&i.onUpdateAvailable(),o.addEventListener("updatefound",()=>{let a=o.installing;a&&a.addEventListener("statechange",()=>{a.state==="installed"&&navigator.serviceWorker.controller&&i.onUpdateAvailable()})}),setInterval(()=>{o.update().catch(()=>{})},10*60*1e3)}).catch(o=>{console.warn("[pwa] SW register failed",o)})),{isDevRoute:e,reload:n,forceReset:s}}function lo(i,e={}){let{size:t,cls:n}=e;return`<svg ${['viewBox="0 0 24 24"',n?`class="${n}"`:'class="ico"',t?`width="${t}" height="${t}"`:"",'aria-hidden="true"'].filter(Boolean).join(" ")}><use href="#${i}"/></svg>`}var ds=null,bu=null;function Lp(){ds?.close()}function Su(i){return ds&&bu===i.anchor?(ds.close(),null):ub(i)}function ub(i){ds?.close();let e=document.createElement("div");e.className="popup-menu",e.setAttribute("role","menu"),document.body.appendChild(e);let t=!0,n=()=>{e.textContent="";for(let c of i.items()){if(c.separatorBefore){let d=document.createElement("div");d.className="menu-sep",e.appendChild(d)}let h=document.createElement("button");h.type="button",h.className="menu-item",h.disabled=!!c.disabled,h.innerHTML=`${c.icon?lo(c.icon):'<span class="ico-gap"></span>'}<span class="menu-label"></span>${c.hint?'<span class="menu-hint"></span>':""}${c.checked?lo("check",{cls:"ico menu-check"}):""}`,h.querySelector(".menu-label").textContent=c.label,c.hint&&(h.querySelector(".menu-hint").textContent=c.hint),h.addEventListener("click",()=>{i.onPick(c.id)==="keep"?n():a()}),e.appendChild(h)}s()},s=()=>{let c=i.anchor.getBoundingClientRect(),h=window.innerWidth,d=window.innerHeight;e.style.left="0px",e.style.top="0px";let u=e.offsetWidth,f=e.offsetHeight,m=i.align==="end"?c.right-u:c.left,x=c.bottom+4;m+u>h-6&&(m=h-6-u),m<6&&(m=6),x+f>d-6&&(x=Math.max(6,c.top-4-f)),e.style.left=`${m}px`,e.style.top=`${x}px`},r=c=>{let h=c.composedPath();h.includes(e)||h.includes(i.anchor)||a()},o=c=>{c.key==="Escape"&&(c.stopPropagation(),a())},a=()=>{t&&(t=!1,e.remove(),document.removeEventListener("pointerdown",r,!0),window.removeEventListener("keydown",o,!0),window.removeEventListener("resize",s),ds===l&&(ds=null,bu=null),i.anchor.classList.remove("is-open"))},l={el:e,close:a,refresh:n,isOpen:()=>t};return n(),i.anchor.classList.add("is-open"),setTimeout(()=>{t&&document.addEventListener("pointerdown",r,!0)},0),window.addEventListener("keydown",o,!0),window.addEventListener("resize",s),ds=l,bu=i.anchor,l}var co=new Map,db=0;function fb(){let i=document.getElementById("noticeStack");return i||(i=document.createElement("div"),i.id="noticeStack",document.body.appendChild(i)),i}function Vi(i){let e=i.id??`n${++db}`,t=i.level??"neutral",n=co.get(e);n?.timer&&clearTimeout(n.timer);let s=n?.el??document.createElement("div");s.className=`toast toast-${t}`,s.setAttribute("role",t==="error"?"alert":"status"),s.textContent="";let r=document.createElement("span");r.className="toast-text",r.textContent=i.text,s.appendChild(r);let o=()=>{let h=co.get(e);h&&(h.timer&&clearTimeout(h.timer),h.el.remove(),co.delete(e))};if(i.actions?.length){let h=document.createElement("span");h.className="toast-actions";for(let d of i.actions){let u=document.createElement("button");u.type="button",u.className=d.primary?"toast-btn primary":"toast-btn",u.textContent=d.label,u.addEventListener("click",()=>{d.onClick(),o()}),h.appendChild(u)}s.appendChild(h)}let a=document.createElement("button");a.type="button",a.className="toast-x",a.setAttribute("aria-label","\u5173\u95ED"),a.textContent="\xD7",a.addEventListener("click",o),s.appendChild(a),n||fb().appendChild(s);let c=i.timeoutMs===null||i.timeoutMs===void 0&&(!!i.actions?.length||t==="error"||t==="warning")?null:window.setTimeout(o,i.timeoutMs??3500);return co.set(e,{el:s,timer:c}),{id:e,close:o,isOpen:()=>co.has(e)}}var vt=i=>{let e=document.getElementById(i);if(!e)throw new Error(`missing #${i}`);return e},Qs={get(i){try{return localStorage.getItem(`catsup.ui.${i}`)}catch{return null}},set(i,e){try{localStorage.setItem(`catsup.ui.${i}`,e)}catch{}}},uo=Qs.get("fingerDraws")==="1",fo=Qs.get("leftHanded")==="1",cc=Qs.get("lab")==="1"||new URLSearchParams(location.search).has("lab"),hc=vt("board"),pb=vt("stage"),mo=vt("hint"),ho=vt("tip"),Mu=vt("marquee"),mb=vt("toolbar"),po=vt("labLog"),Up=vt("lab"),gb=vt("build"),xb="\u753B\u7EBF L \xB7 \u77E9\u5F62 R \xB7 \u79FB\u52A8 M \xB7 \u63A8\u62C9 P \xB7 \u6A61\u76AE E \xB7 \u9009\u62E9 \u7A7A\u683C \uFF5C \u53F3\u952E/\u5355\u6307\u62D6=\u73AF\u7ED5 \xB7 \u53CC\u6307=\u5E73\u79FB\u7F29\u653E \xB7 \u6EDA\u8F6E=\u7F29\u653E \uFF5C Esc \u53D6\u6D88",yb="\u6B65\u884C\uFF1AWASD \u8D70 \xB7 Shift \u51B2\u523A \xB7 \u7A7A\u683C \u8DF3 \xB7 Ctrl \u8E72 \xB7 \u2190\u2192 \u8F6C\u8EAB \xB7 \u53F3\u952E\u62D6=\u770B \xB7 T \u6309\u4F4F\u7784\u51C6\u77AC\u79FB\uFF08\u2191\u2193 \u529B\u5EA6 \u2190\u2192 \u843D\u5730\u671D\u5411\uFF09\xB7 G \u56DE\u4E0A\u4E00\u70B9 \uFF5C \u5DE5\u5177 L R M P \xB7 \u9009\u62E9 Tab \xB7 \u6A61\u76AE X",vb="VR\uFF1A\u5DE6\u6447\u6746\u8D70\uFF08\u6309\u4E0B\u51B2\u523A\uFF09\xB7 \u53F3\u6447\u6746 \u2190\u2192 \u8F6C\u8EAB \xB7 \u524D\u63A8\u7784\u51C6\u77AC\u79FB\uFF08\u5DE6\u6447\u6746 \u2191\u2193 \u529B\u5EA6 \u2190\u2192 \u843D\u5730\u671D\u5411\uFF09\xB7 \u540E\u62C9\u56DE\u4E0A\u4E00\u70B9 \xB7 A \u8DF3 B \u8E72 \xB7 \u6273\u673A\u753B \xB7 \u624B\u8155\u9762\u677F\u9009\u5DE5\u5177 \xB7 X/Y \u64A4\u9500\u91CD\u505A",dc=()=>gn?.isPresenting()?vb:$e?.isWalking()?yb:xb,De=new Xl(hc,{hint:i=>{mo.textContent=i??dc()},tip:(i,e,t)=>{i?(ho.textContent=i,ho.hidden=!1,ho.style.left=`${e+14}px`,ho.style.top=`${t-28}px`):ho.hidden=!0},events:i=>wb(i),separator:i=>Eb(i),marquee:i=>{if(!i){Mu.hidden=!0;return}let e=hc.getBoundingClientRect();Mu.hidden=!1,Object.assign(Mu.style,{left:`${e.left+i.x}px`,top:`${e.top+i.y}px`,width:`${i.w}px`,height:`${i.h}px`})},changed:()=>Tu()}),_b=[{tool:"select",icon:"select",label:"\u9009\u62E9",key:"\u7A7A\u683C"},{tool:"line",icon:"line",label:"\u753B\u7EBF",key:"L"},{tool:"rect",icon:"rectangle",label:"\u77E9\u5F62",key:"R"},{tool:"move",icon:"move",label:"\u79FB\u52A8",key:"M"},{tool:"pp",icon:"push-pull",label:"\u63A8\u62C9",key:"P"},{tool:"erase",icon:"eraser",label:"\u6A61\u76AE",key:"E"}],uc={version:Gi,tools:()=>_b.map(i=>({id:i.tool,label:i.label,icon:i.icon,key:i.key,active:De.tool===i.tool})),edits:()=>[{id:"undo",label:"\u64A4\u9500",icon:"arrow-undo",disabled:!De.canUndo()},{id:"redo",label:"\u91CD\u505A",icon:"arrow-redo",disabled:!De.canRedo()},{id:"delete",label:"\u5220\u9664",icon:"trash-can",danger:!0,hidden:!De.hasSelection()}],vr:()=>[{id:"noclip",label:$e.noclip?"\u98DE\u884C\u4E2D":"\u7A7F\u5899\u98DE\u884C",active:$e.noclip},{id:"respawn",label:"\u56DE\u51FA\u751F\u70B9"},{id:"exitvr",label:"\u9000\u51FA VR",danger:!0}],status:()=>mo.textContent??"",pick:i=>{if(op.includes(i)){De.setTool(i);return}switch(i){case"undo":De.undo();break;case"redo":De.redo();break;case"delete":De.deleteSelection();break;case"noclip":$e.setNoclip(!$e.noclip),gn.invalidatePanel();break;case"respawn":{let e=$e.sim.state;$e.sim.reset({x:0,y:0,z:Math.max(0,$e.world.floorZ())},e.heading,$e.sim.state.trackingOrigin?{x:0,y:0,z:1.6}:{x:0,y:0,z:1.6});break}case"exitvr":gn.exit();break}}},Eu=new Map;for(let i of uc.tools()){let e=document.createElement("button");e.type="button",e.className="tool",e.title=`${i.label}\uFF08${i.key}\uFF09`,e.innerHTML=`${lo(i.icon)}<span class="tool-label"></span>`,e.querySelector(".tool-label").textContent=i.label,e.addEventListener("click",()=>uc.pick(i.id)),mb.appendChild(e),Eu.set(i.id,e)}{let i=vt("labEraseFace");i.addEventListener("click",()=>De.setTool("eraseFace")),Eu.set("eraseFace",i)}var Np=vt("btnUndo"),Op=vt("btnRedo"),Bp=vt("btnDelete"),Dp=vt("btnMenu"),Fp=vt("btnView"),bb=vt("btnFit");Np.addEventListener("click",()=>De.undo());Op.addEventListener("click",()=>De.redo());Bp.addEventListener("click",()=>De.deleteSelection());bb.addEventListener("click",()=>De.zoomExtents());Fp.addEventListener("click",()=>Su({anchor:Fp,align:"end",items:()=>[{id:"iso",label:"\u7B49\u8F74",icon:"persp-iso",disabled:$e.isWalking()},{id:"top",label:"\u9876\u89C6",hint:"\u4FEF\u89C6",disabled:$e.isWalking()},{id:"front",label:"\u524D\u89C6",hint:"\u5411\u5317\u770B",disabled:$e.isWalking()},{id:"right",label:"\u53F3\u89C6",hint:"\u5411\u897F\u770B",disabled:$e.isWalking()},{id:"back",label:"\u540E\u89C6",hint:"\u5411\u5357\u770B",disabled:$e.isWalking()},{id:"left",label:"\u5DE6\u89C6",hint:"\u5411\u4E1C\u770B",disabled:$e.isWalking()},{id:"persp",label:"\u900F\u89C6",checked:De.cam.projection==="persp",separatorBefore:!0,disabled:$e.isWalking()},{id:"walk",label:"\u6B65\u884C\u76F8\u673A",hint:"WASD \xB7 \u7A7A\u683C\u8DF3 \xB7 \u53F3\u952E\u62D6\u770B",checked:$e.isWalking(),separatorBefore:!0},{id:"noclip",label:"\u7A7F\u5899\u98DE\u884C",hint:"Q/E \u4E0B/\u4E0A",checked:$e.noclip,disabled:!$e.isWalking()}],onPick:i=>{if(i==="persp")return De.toggleProjection(),"keep";if(i==="walk")return Mb(!$e.isWalking()),"keep";if(i==="noclip")return $e.setNoclip(!$e.noclip),"keep";De.setView(i)}}));Dp.addEventListener("click",()=>Su({anchor:Dp,items:()=>[{id:"export",label:"\u5BFC\u51FA OBJ\u2026",icon:"export",hint:"Blender \u9003\u751F\u53E3"},{id:"import",label:"\u5BFC\u5165 OBJ\u2026",icon:"import"},...gn.isSupported()?[{id:"vr",label:gn.isPresenting()?"\u9000\u51FA VR":"\u8FDB\u5165 VR",icon:"hand",separatorBefore:!0,hint:"Quest \xB7 \u624B\u8155\u9762\u677F"},{id:"lefthand",label:"VR \u5DE6\u624B\u6301\u7B14",checked:fo,hint:"\u9762\u677F\u6362\u5230\u53F3\u624B"}]:[],{id:"finger",label:"\u624B\u6307\u4E5F\u80FD\u753B",checked:uo,separatorBefore:!0,hint:Ab.penEverSeen()?"\u5DF2\u89C1\u8FC7\u7B14\uFF0C\u624B\u6307=\u76F8\u673A":void 0},{id:"lab",label:"\u5B9E\u9A8C\u53F0\uFF08\u819C\u4E8B\u4EF6\u65E5\u5FD7 / \u573A\u666F\u9884\u7F6E\uFF09",checked:cc},{id:"clear",label:"\u6E05\u7A7A\u6A21\u578B",icon:"trash-can",separatorBefore:!0},{id:"help",label:"\u5FEB\u6377\u952E\u4E0E\u624B\u52BF",icon:"keyboard"},{id:"update",label:`\u5F3A\u5236\u66F4\u65B0\uFF08\u6E05\u7F13\u5B58\u91CD\u542F\uFF09\xB7 ${Gi}`,icon:"refresh"}],onPick:i=>{switch(i){case"export":Tb();break;case"import":lc.click();break;case"finger":return uo=!uo,Qs.set("fingerDraws",uo?"1":"0"),"keep";case"lab":return kp(!cc),"keep";case"clear":Vi({id:"clear",text:"\u6E05\u7A7A\u6574\u4E2A\u6A21\u578B\uFF1F\uFF08\u53EF\u64A4\u9500\uFF09",level:"warning",actions:[{label:"\u6E05\u7A7A",primary:!0,onClick:()=>De.clearAll()},{label:"\u53D6\u6D88",onClick:()=>{}}]});break;case"help":fc(!0);break;case"update":Au.forceReset();break;case"vr":gn.isPresenting()?gn.exit():gn.enter();break;case"lefthand":return fo=!fo,Qs.set("leftHanded",fo?"1":"0"),"keep"}}}));var $e=new Ql(De,hc);De.viewExtras=()=>({near:$e.isWalking()?.05:void 0,teleport:$e.teleportArc()});var ac=0;function Sb(i){let e=ac?Math.min(.1,(i-ac)/1e3):.016666666666666666;ac=i,gn.isPresenting()?gn.tick(e):$e.tick(e),De.draw()}function zp(){let i=$e.isWalking()||gn.isPresenting();ac=0,De.setLoop(i?Sb:null)}var gn=new oc({editor:De,locomotion:$e,hud:uc,leftHanded:()=>fo,onChange:()=>{zp(),Tu(),mo.textContent=dc()},log:i=>console.warn(i)});function Mb(i){i?$e.enterWalk():$e.exitWalk(),zp(),mo.textContent=dc(),Tu()}function Tu(){for(let[i,e]of Eu)e.classList.toggle("active",i===De.tool);Np.disabled=!De.canUndo(),Op.disabled=!De.canRedo(),Bp.hidden=!De.hasSelection(),gn?.invalidatePanel()}function wb(i){for(let e of i){let t=document.createElement("div");t.className="ev",t.textContent=du(e),po.prepend(t)}for(;po.childElementCount>400;)po.lastElementChild?.remove()}function Eb(i){let e=document.createElement("div");e.className="sep",e.textContent=`\u2500\u2500 ${i} \u2500\u2500`,po.prepend(e)}{let i=vt("labPresets");for(let e of Ks){let t=document.createElement("button");t.type="button",t.textContent=e.name,t.title=e.note,t.addEventListener("click",()=>De.applyPreset(e.name)),i.appendChild(t)}vt("labClearLog").addEventListener("click",()=>{po.textContent=""}),vt("labClose").addEventListener("click",()=>kp(!1))}function kp(i){cc=i,Qs.set("lab",i?"1":"0"),Up.hidden=!i,!i&&De.tool==="eraseFace"&&De.setTool("select"),requestAnimationFrame(pc)}var wu=vt("help");function fc(i){wu.hidden=!i}vt("helpClose").addEventListener("click",()=>fc(!1));wu.addEventListener("click",i=>{i.target===wu&&fc(!1)});var lc=vt("objFile");function Tb(){let i=ap(De.kernel,{triangulateHoled:ip,version:Gi}),e=new Blob([i],{type:"model/obj"}),t=URL.createObjectURL(e),n=document.createElement("a"),s=new Date().toISOString().slice(0,19).replace(/[:T]/g,"-");n.href=t,n.download=`catsup-${s}.obj`,document.body.appendChild(n),n.click(),n.remove(),setTimeout(()=>URL.revokeObjectURL(t),1e4),Vi({text:`\u5DF2\u5BFC\u51FA ${n.download}\uFF08${De.kernel.faces().length} \u9762 / ${De.kernel.edges().length} \u8FB9\uFF09`,level:"info"})}lc.addEventListener("change",async()=>{let i=lc.files?.[0];if(lc.value="",!!i)try{let e=lp(await i.text());if(!e.segs.length){Vi({text:"OBJ \u91CC\u6CA1\u6709\u53EF\u7528\u7684\u8FB9",level:"warning"});return}let t=De.addSegments(e.segs,`\u5BFC\u5165 ${i.name}`);De.zoomExtents(),Vi({text:`\u5BFC\u5165 ${i.name}\uFF1A${e.segs.length} \u6761\u8FB9 \u2192 ${t.length} \u4E2A\u819C\u4E8B\u4EF6`,level:"info"})}catch(e){Vi({text:`\u5BFC\u5165\u5931\u8D25\uFF1A${e.message}`,level:"error"})}});var Ab=cp(hc,De,{fingerDraws:()=>uo,onUndo:()=>De.undo(),onRedo:()=>De.redo(),look:(i,e)=>$e.look(i,e),walking:()=>$e.isWalking()});window.addEventListener("keydown",i=>{let e=i.target;if(!(e&&(e.tagName==="INPUT"||e.tagName==="TEXTAREA"))){if(!i.ctrlKey&&!i.metaKey&&!i.altKey){let t={" ":"select",l:"line",r:"rect",m:"move",p:"pp",e:"erase",tab:"select",x:"erase"},n=i.key.toLowerCase(),s=t[n],r=$e.isWalking()&&(n===" "||n==="e");if(s&&!r){i.preventDefault(),De.setTool(s);return}}if((i.ctrlKey||i.metaKey)&&(i.key==="z"||i.key==="Z")){i.preventDefault(),i.shiftKey?De.redo():De.undo();return}if((i.ctrlKey||i.metaKey)&&(i.key==="y"||i.key==="Y")){i.preventDefault(),De.redo();return}if(i.key==="Delete"||i.key==="Backspace"){De.hasSelection()&&(i.preventDefault(),De.deleteSelection());return}i.key==="Escape"&&(Lp(),fc(!1),De.cancel())}});function pc(){De.resize(window.devicePixelRatio||1)}new ResizeObserver(pc).observe(pb);window.addEventListener("resize",pc);var Au=Ip({onUpdateAvailable:()=>Vi({id:"update",text:"\u6709\u65B0\u7248\u672C",level:"info",actions:[{label:"\u5237\u65B0",primary:!0,onClick:()=>{Au.reload()}}]})});gb.textContent=`${Gi}${Au.isDevRoute?" \xB7 dev":""}`;new URLSearchParams(location.search).has("reset")&&Vi({text:`\u5DF2\u6E05\u7F13\u5B58\u91CD\u542F \xB7 ${Gi}`,level:"info"});window.__catsup={editor:De,locomotion:$e,vr:gn,hud:uc,version:Gi};Up.hidden=!cc;De.setTool("line");mo.textContent=dc();pc();
/**
 * @license
 * Copyright 2010-2026 Three.js Authors
 * SPDX-License-Identifier: MIT
 */
//# sourceMappingURL=catsup-407fb0e96654.mjs.map
