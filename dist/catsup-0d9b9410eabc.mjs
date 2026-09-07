var Lf=Object.defineProperty;var Hg=(i,e,t)=>e in i?Lf(i,e,{enumerable:!0,configurable:!0,writable:!0,value:t}):i[e]=t;var h=(i,e)=>Lf(i,"name",{value:e,configurable:!0});var U=(i,e,t)=>Hg(i,typeof e!="symbol"?e+"":e,t);var $i="v0.4.6-2026-09-08";function Cc(i,e){return Math.atan2(e.y-i.y,e.x-i.x)}h(Cc,"angleOf");function Ic(i,e,t){return(e.x-i.x)*(t.y-i.y)-(e.y-i.y)*(t.x-i.x)}h(Ic,"cross");function Df(i){let e=0;for(let t=0;t<i.length;t++){let n=i[t],s=i[(t+1)%i.length];e+=n.x*s.y-s.x*n.y}return e/2}h(Df,"signedArea");function ft(i,e){let t=!1;for(let n=0,s=e.length-1;n<e.length;s=n++){let r=e[n],o=e[s];r.y>i.y!=o.y>i.y&&i.x<(o.x-r.x)*(i.y-r.y)/(o.y-r.y)+r.x&&(t=!t)}return t}h(ft,"pointInRing");function Ki(i){return{x:Math.round(i.x/1e-6)*1e-6,y:Math.round(i.y/1e-6)*1e-6,z:Math.round(i.z/1e-6)*1e-6}}h(Ki,"quantize3");function It(i){return`${Math.round(i.x/1e-6)},${Math.round(i.y/1e-6)},${Math.round(i.z/1e-6)}`}h(It,"ptKey3");function an(i,e){return Math.abs(i.x-e.x)<=5e-7&&Math.abs(i.y-e.y)<=5e-7&&Math.abs(i.z-e.z)<=5e-7}h(an,"samePt3");function pt(i,e){return Math.hypot(i.x-e.x,i.y-e.y,i.z-e.z)}h(pt,"dist3");var Me=h((i,e)=>({x:i.x-e.x,y:i.y-e.y,z:i.z-e.z}),"sub3"),Ue=h((i,e)=>({x:i.x+e.x,y:i.y+e.y,z:i.z+e.z}),"add3"),Re=h((i,e)=>({x:i.x*e,y:i.y*e,z:i.z*e}),"scale3"),ne=h((i,e)=>i.x*e.x+i.y*e.y+i.z*e.z,"dot3"),Et=h((i,e)=>({x:i.y*e.z-i.z*e.y,y:i.z*e.x-i.x*e.z,z:i.x*e.y-i.y*e.x}),"cross3"),Qt=h(i=>Math.hypot(i.x,i.y,i.z),"len3");function _n(i){let e=Qt(i);return e>0?Re(i,1/e):i}h(_n,"normalize3");function sr(i,e){let t=_n(i),n=e;return(Math.abs(t.x)>1e-9?t.x:Math.abs(t.y)>1e-9?t.y:t.z)<0&&(t=Re(t,-1),n=-n),{n:t,d:n}}h(sr,"canonicalPlane");function kn(i,e,t){let n=Et(Me(e,i),Me(t,i)),s=Qt(n),r=Math.max(pt(i,e),pt(i,t));if(s<=5e-7*r||r<=5e-7)return null;let o=_n(n);return sr(o,ne(o,i))}h(kn,"planeFromPoints");function Ot(i,e){return Math.abs(ne(i,e.n)-e.d)}h(Ot,"distToPlane");function vi(i){let e=i.n,t=Math.abs(e.x),n=Math.abs(e.y),s=Math.abs(e.z),r=t<=n&&t<=s?{x:1,y:0,z:0}:n<=s?{x:0,y:1,z:0}:{x:0,y:0,z:1},o=_n(Et(e,r)),a=Et(e,o);return{u:o,v:a}}h(vi,"planeBasis");function Yt(i,e){return{x:ne(i,e.u),y:ne(i,e.v)}}h(Yt,"projectToPlane");function Ff(i,e,t){return Ue(Ue(Re(t.u,i.x),Re(t.v,i.y)),Re(e.n,e.d))}h(Ff,"liftFromPlane");function gs(i,e,t,n=5e-7){let s=pt(e,t);if(s<=5e-7)return an(i,e);if(Qt(Et(Me(i,e),Me(t,e)))/s>n)return!1;let o=ne(Me(i,e),Me(t,e))/(s*s);return o>=-n/s&&o<=1+n/s}h(gs,"pointOnSegment3");function Nf(i,e,t){let n=Me(t,e),s=ne(n,n);if(s===0)return pt(i,e);let r=ne(Me(i,e),n)/s;return r=Math.max(0,Math.min(1,r)),pt(i,Ue(e,Re(n,r)))}h(Nf,"distToSegment3");function vo(i,e,t,n,s=5e-7){let r=Me(e,i),o=Me(n,t),a=Qt(r),l=Qt(o);if(a<=5e-7||l<=5e-7)return[];let c=Et(r,o),u=Qt(c);if(u/(a*l)<1e-12){if(Qt(Et(Me(t,i),r))/a>s)return[];let S=h(C=>ne(Me(C,i),r)/(a*a),"tOf"),M=S(t),_=S(n);M>_&&([M,_]=[_,M]);let A=Math.max(0,M),w=Math.min(1,_);if(w<A-s/a)return[];let T=h(C=>Ki(Ue(i,Re(r,C))),"at"),v=T(A),P=T(w);return an(v,P)?[v]:[v,P]}if(Math.abs(ne(Me(t,i),c))/u>s)return[];let d=u*u,g=ne(Et(Me(t,i),o),c)/d,m=ne(Et(Me(t,i),r),c)/d,y=s/a,p=s/l;return g<-y||g>1+y||m<-p||m>1+p?[]:[Ki(Ue(i,Re(r,g)))]}h(vo,"segIntersections3");var bo=class bo{constructor(){U(this,"vertsById",new Map);U(this,"edgesById",new Map);U(this,"vertByKey",new Map);U(this,"nextV",1);U(this,"nextE",1)}vertices(){return[...this.vertsById.values()]}edges(){return[...this.edgesById.values()]}vertexCount(){return this.vertsById.size}edgeCount(){return this.edgesById.size}vertex(e){let t=this.vertsById.get(e);if(!t)throw new Error(`vertex ${e} \u4E0D\u5B58\u5728`);return t}edge(e){let t=this.edgesById.get(e);if(!t)throw new Error(`edge ${e} \u4E0D\u5B58\u5728`);return t}hasEdge(e){return this.edgesById.has(e)}hasVertex(e){return this.vertsById.has(e)}pt(e){let t=this.vertex(e);return{x:t.x,y:t.y,z:t.z}}otherEnd(e,t){return e.a===t?e.b:e.a}vertexAt(e){return this.vertByKey.get(It(e))}ensureVertex(e){let t=It(e),n=this.vertByKey.get(t);if(n!==void 0)return n;let s=this.nextV++;return this.vertsById.set(s,{id:s,x:e.x,y:e.y,z:e.z,edges:new Set}),this.vertByKey.set(t,s),s}edgeBetween(e,t){let n=this.vertex(e).edges;for(let s of n){let r=this.edge(s);if(r.a===t||r.b===t)return s}}addEdge(e,t){if(e===t)throw new Error("\u62D2\u7EDD\u81EA\u73AF\u8FB9");if(this.edgeBetween(e,t)!==void 0)throw new Error(`\u8FB9 ${e}-${t} \u5DF2\u5B58\u5728\uFF08\u91CD\u5408\u5373\u540C\u4E00\uFF0C\u8C03\u7528\u65B9\u5E94\u62A5 retrace\uFF09`);let n=this.nextE++;return this.edgesById.set(n,{id:n,a:e,b:t,faceLinks:[]}),this.vertex(e).edges.add(n),this.vertex(t).edges.add(n),n}removeEdge(e){let t=this.edge(e);this.edgesById.delete(e);for(let n of[t.a,t.b]){let s=this.vertex(n);s.edges.delete(e),s.edges.size===0&&(this.vertsById.delete(n),this.vertByKey.delete(It({x:s.x,y:s.y,z:s.z})))}}splitEdge(e,t){let n=this.edge(e),s=[...n.faceLinks],r=n.a,o=n.b;this.removeEdgeKeepVerts(e);let a=this.ensureVertex(t),l=h((f,d)=>{let g=this.edgeBetween(f,d);if(g===void 0){let y=this.addEdge(f,d);return this.edge(y).faceLinks=[...s],y}let m=this.edge(g).faceLinks;for(let y of s)m.includes(y)||m.push(y);return g},"half"),c=l(r,a),u=l(a,o);return{v:a,e1:c,e2:u}}relocateVertices(e){for(let{id:t}of e){let n=this.vertex(t);this.vertByKey.delete(It({x:n.x,y:n.y,z:n.z}))}for(let{id:t,to:n}of e){let s=this.vertex(t),r=It(n);if(this.vertByKey.has(r))throw new Error("relocateVertices \u7EC8\u6001 key \u78B0\u649E\u2014\u2014\u5408\u5E76\u8BE5\u5728\u8C03\u7528\u65B9\u5148\u505A");s.x=n.x,s.y=n.y,s.z=n.z,this.vertByKey.set(r,t)}}replaceEdgeWithChain(e,t){let n=this.edge(e),s=[...n.faceLinks],r=n.a,o=n.b;this.removeEdgeKeepVerts(e);let a=[r,...t.map(c=>this.ensureVertex(c)),o],l=[];for(let c=0;c+1<a.length;c++){let u=a[c],f=a[c+1];if(u===f)continue;let d=this.edgeBetween(u,f);if(d!==void 0){l.push({edge:d,fwd:this.edge(d).a===u});continue}let g=this.addEdge(u,f);this.edge(g).faceLinks=[...s],l.push({edge:g,fwd:!0})}return l}relocateVertex(e,t){let n=this.vertex(e),s=It({x:n.x,y:n.y,z:n.z});if(this.vertByKey.get(It(t))!==void 0&&this.vertByKey.get(It(t))!==e)throw new Error("relocateVertex \u76EE\u6807\u683C\u70B9\u5DF2\u88AB\u5360\u7528\u2014\u2014sticky \u5408\u5E76\u8BE5\u5728\u8C03\u7528\u65B9\u5148\u505A");this.vertByKey.delete(s),n.x=t.x,n.y=t.y,n.z=t.z,this.vertByKey.set(It(t),e)}removeEdgeKeepVerts(e){let t=this.edge(e);this.edgesById.delete(e),this.vertex(t.a).edges.delete(e),this.vertex(t.b).edges.delete(e)}clone(){let e=new bo;e.nextV=this.nextV,e.nextE=this.nextE;for(let[t,n]of this.vertsById)e.vertsById.set(t,{id:n.id,x:n.x,y:n.y,z:n.z,edges:new Set(n.edges)});for(let[t,n]of this.edgesById)e.edgesById.set(t,{id:n.id,a:n.a,b:n.b,faceLinks:[...n.faceLinks]});for(let[t,n]of this.vertByKey)e.vertByKey.set(t,n);return e}};h(bo,"PlanarGraph");var _o=bo;var Uf=1e-6;function Of(i,e,t,n){let s=Ki(e),r=Ki(t);if(an(s,r))return{created:[],retraced:[]};let o=pt(s,r),a=h(m=>((m.x-s.x)*(r.x-s.x)+(m.y-s.y)*(r.y-s.y)+(m.z-s.z)*(r.z-s.z))/(o*o),"tOf"),l=new Map,c=h(m=>{l.set(It(m),m)},"addCut");c(s),c(r);let u=new Map;for(let m of i.edges()){let y=i.pt(m.a),p=i.pt(m.b),x=vo(s,r,y,p,Uf);for(let S of x)if(c(S),!an(S,y)&&!an(S,p)){let M=u.get(m.id)??[];M.push(S),u.set(m.id,M)}}for(let m of i.vertices()){let y={x:m.x,y:m.y,z:m.z};gs(y,s,r,Uf)&&c(y)}for(let[m,y]of u){let p=i.pt(i.edge(m).a);y.sort((S,M)=>pt(p,S)-pt(p,M));let x=m;for(let S of y){let M=i.edge(x),_=i.vertexAt(S);if(_!==void 0&&(_===M.a||_===M.b))continue;let{e1:A,e2:w}=i.splitEdge(x,S);n?.(x,A,w),x=w}}let f=[...l.values()].sort((m,y)=>a(m)-a(y)),d=[],g=[];for(let m=0;m+1<f.length;m++){let y=f[m],p=f[m+1];if(an(y,p))continue;let x=i.ensureVertex(y),S=i.ensureVertex(p);if(x===S)continue;let M=i.edgeBetween(x,S);M!==void 0?g.push(M):d.push(i.addEdge(x,S))}return{created:d,retraced:g}}h(Of,"insertSegment");var Gg=32;function Dc(i){let e=!1;for(let t=0;t<Gg;t++){let n=new Map,s=h((o,a)=>{let l=n.get(o);l||(l=new Map,n.set(o,l)),l.set(It(a),a)},"addCut"),r=i.edges();for(let o=0;o<r.length;o++){let a=r[o],l=i.pt(a.a),c=i.pt(a.b);for(let u=o+1;u<r.length;u++){let f=r[u],d=i.pt(f.a),g=i.pt(f.b);for(let m of vo(l,c,d,g))!an(m,l)&&!an(m,c)&&s(a.id,m),!an(m,d)&&!an(m,g)&&s(f.id,m)}for(let u of i.vertices()){if(u.id===a.a||u.id===a.b)continue;let f={x:u.x,y:u.y,z:u.z};gs(f,l,c)&&s(a.id,f)}}if(n.size===0)return{changed:e};e=!0;for(let[o,a]of n){if(!i.hasEdge(o))continue;let l=i.pt(i.edge(o).a),c=[...a.values()].sort((u,f)=>pt(l,u)-pt(l,f));i.replaceEdgeWithChain(o,c)}}throw new Error("planarize \u672A\u6536\u655B\uFF08>32 \u8F6E\uFF09\u2014\u2014\u91CF\u5316\u8FDE\u9501\u5F02\u5E38\uFF0C\u68C0\u67E5\u8F93\u5165\u51E0\u4F55")}h(Dc,"planarize");function Bf(i,e){let t=i.length;if(t<4)return null;let n=h(d=>{for(let g=1;g+1<d.length;g++){let m=kn(i[d[0]],i[d[g]],i[d[g+1]]);if(m)return m}return null},"fitOf"),s=h(d=>{let g=n(d);return g?d.every(m=>Ot(i[m],g)<=e):!0},"coplanar"),r=[],o=[0,1];for(let d=2;d<t;d++){let g=[...o,d];s(g)?o=g:(r.push(o),o=[o[o.length-1],d])}let a=[...o,0];if(r.length&&s([...o,...r[0]])?r[0]=[...o,...r[0]]:s(a)?r.push(a):(r.push(o),r.push([o[o.length-1],0])),r.length<2)return null;let l=r.map(d=>d[0]),c=l.length,u=r.filter(d=>new Set(d).size>=3),f=[];if(c===2)f.push([l[0],l[1]]);else{for(let d=0;d<c;d++)f.push([l[d],l[(d+1)%c]]);if(c>=3){if(!s(l))return null;new Set(l).size>=3&&u.push([...l])}}return u.length?{pieces:u,creases:f}:null}h(Bf,"foldDecompose");var kf=h((i,e)=>`${i}:${e?"f":"r"}`,"hk");function Vf(i,e){let t=e?.project??(p=>{let x=i.pt(p);return{x:x.x,y:x.y}}),n=e?.edges?[...e.edges].map(p=>i.edge(p)):i.edges(),s=new Map,r=h(p=>{let x=s.get(p);return x||(x=t(p),s.set(p,x)),x},"p2"),o=new Map,a=new Set;for(let p of n)a.add(p.id),o.set(p.a,(o.get(p.a)??0)+1),o.set(p.b,(o.get(p.b)??0)+1);let l=[...o.entries()].filter(([,p])=>p===1).map(([p])=>p);for(;l.length;){let p=l.pop();if((o.get(p)??0)===1)for(let x of i.vertex(p).edges){if(!a.has(x))continue;a.delete(x);let S=i.edge(x);for(let M of[S.a,S.b]){let _=(o.get(M)??0)-1;o.set(M,_),_===1&&l.push(M)}}}if(a.size===0)return[];let c=new Map,u=h(p=>{let x=c.get(p);if(!x){x=[];let S=i.vertex(p);for(let M of S.edges){if(!a.has(M))continue;let _=i.otherEnd(i.edge(M),p);x.push({eid:M,to:_,angle:Cc(r(p),r(_))})}x.sort((M,_)=>M.angle-_.angle),c.set(p,x)}return x},"starOf"),f=h((p,x)=>{let S=u(x),M=Cc(r(x),r(p)),_;for(let A=S.length-1;A>=0;A--)if(S[A].angle<M-1e-12){_=S[A];break}return _||(_=S[S.length-1]),_},"nextDir"),d=new Set,g=[],m=[];for(let p of a){let x=i.edge(p);for(let S of[!0,!1]){if(d.has(kf(p,S)))continue;let M=[],_=[],A=p,w=S?x.a:x.b,T=S?x.b:x.a;for(;;){let C=i.edge(A).a===w,I=kf(A,C);if(d.has(I))break;d.add(I),M.push({edge:A,forward:C}),_.push(r(w));let D=f(w,T);w=T,T=D.to,A=D.eid}if(M.length<2)continue;let v=Df(_),P={edges:M,pts:_};v>1e-9?g.push({ring:P,area:v}):v<-1e-9&&m.push({ring:P,areaAbs:-v})}}let y=g.sort((p,x)=>p.area-x.area).map(p=>({outer:p.ring,holes:[],area:p.area}));for(let p of m){let x=p.ring.pts[0];for(let S of y)if(S.outer.pts.length&&Wg(S.outer,p.ring,x)){S.holes.push(p.ring),S.area-=p.areaAbs;break}}return y}h(Vf,"findRegions");function Wg(i,e,t){let n=new Set(i.edges.map(s=>s.edge));return e.edges.some(s=>n.has(s.edge))?!1:ft(t,i.pts)}h(Wg,"ringContains");function xs(i){let e=i.outer.pts.map(a=>a.y),t=Math.min(...e),n=Math.max(...e),s=[i.outer,...i.holes];for(let a=1;a<=8;a++){let l=t+(n-t)*a/(a+1);if(s.some(d=>d.pts.some(g=>Math.abs(g.y-l)<1e-9)))continue;let c=[];for(let d of s)for(let g=0;g<d.pts.length;g++){let m=d.pts[g],y=d.pts[(g+1)%d.pts.length];m.y>l!=y.y>l&&c.push(m.x+(l-m.y)*(y.x-m.x)/(y.y-m.y))}if(c.length<2)continue;c.sort((d,g)=>d-g);let u=NaN,f=-1;for(let d=0;d+1<c.length;d+=2){let g=c[d+1]-c[d];g>f&&(f=g,u=(c[d]+c[d+1])/2)}if(f>1e-9)return{x:u,y:l}}let r=i.outer.pts.reduce((a,l)=>a+l.x,0)/i.outer.pts.length,o=i.outer.pts.reduce((a,l)=>a+l.y,0)/i.outer.pts.length;return{x:r,y:o}}h(xs,"representativePoint");function Hf(i,e){if(!ft(e,i.outer.pts))return!1;for(let t of i.holes)if(ft(e,t.pts))return!1;return!0}h(Hf,"regionContains");var Xg=1-1e-10,Mo=class Mo{constructor(){U(this,"recs",new Map);U(this,"nextId",1)}all(){return[...this.recs.values()]}rec(e){let t=this.recs.get(e);if(!t)throw new Error(`plane ${e} \u4E0D\u5B58\u5728`);return t}ensure(e,t){for(let s of this.recs.values()){let r=ne(s.plane.n,e.n);if(Math.abs(r)>=Xg&&Math.abs(s.plane.d-(r<0?-e.d:e.d))<=t)return s}let n={id:this.nextId++,plane:e,basis:vi(e)};return this.recs.set(n.id,n),n}prune(e){for(let t of[...this.recs.keys()])e.has(t)||this.recs.delete(t)}clone(){let e=new Mo;e.nextId=this.nextId;for(let[t,n]of this.recs)e.recs.set(t,n);return e}};h(Mo,"PlaneRegistry");var So=Mo;function Gf(i,e,t,n){for(let a of i.vertices()){let l=[...a.edges],c=i.pt(a.id);for(let u=0;u<l.length;u++)for(let f=u+1;f<l.length;f++){let d=i.pt(i.otherEnd(i.edge(l[u]),a.id)),g=i.pt(i.otherEnd(i.edge(l[f]),a.id)),m=kn(c,d,g);m&&e.ensure(m,t)}}let s=new Map,r=i.edges();for(let a of e.all()){let l=[];for(let c of r)Ot(i.pt(c.a),a.plane)<=t&&Ot(i.pt(c.b),a.plane)<=t&&l.push(c.id);l.length>=3&&s.set(a.id,l)}let o=new Set([...s.keys(),...n]);return e.prune(o),s}h(Gf,"groupCoplanar");var Eo=class Eo{constructor(){U(this,"byId",new Map);U(this,"nextId",1)}faces(){return[...this.byId.values()]}face(e){return this.byId.get(e)}faceCount(){return this.byId.size}planeIds(){return new Set([...this.byId.values()].map(e=>e.planeId))}faceContains(e,t){if(!ft(t,e.outer.pts))return!1;for(let n of e.holes)if(ft(t,n.pts))return!1;return!0}occurrences(e,t){let n=0,s=!1,r=!1;for(let o of e.outer.edges)o.edge===t&&(n++,s=!0);for(let o of e.holes)for(let a of o.edges)a.edge===t&&(n++,r=!0);return{count:n,onOuter:s,onHole:r}}regionsByPlane(e,t,n){let s=Gf(e,t,n,this.planeIds()),r=new Map,o=new Map,a=h(l=>[l.outer,...l.holes].map(c=>[...c.edges.map(u=>u.edge)].sort((u,f)=>u-f).join(",")).join("|"),"keyOf");for(let[l,c]of s){let u=t.rec(l),f=Vf(e,{edges:c,project:h(d=>Yt(e.pt(d),u.basis),"project")});for(let d of f){let g=0;for(let p of[d.outer,...d.holes])for(let x of p.edges){let S=e.edge(x.edge);g=Math.max(g,Ot(e.pt(S.a),u.plane),Ot(e.pt(S.b),u.plane))}let m=a(d),y=o.get(m);(!y||g<y.err)&&o.set(m,{planeId:l,r:d,err:g})}}for(let{planeId:l,r:c}of o.values())(r.get(l)??r.set(l,[]).get(l)).push(c);return r}reconcileConstructive(e,t,n,s,r,o){let a=o??this.captureSnaps(e);return this.settle(e,t,n,a,new Map,new Set,!0,void 0,"or",{zeroClaimKeep:!0,gestureEdges:s,toggleWith:r})}snapshotEraseVerdicts(e){let t={burst:new Set,mergePairs:[],heal:new Set};for(let n of e){let s=this.faces().map(o=>({f:o,occ:this.occurrences(o,n)})).filter(o=>o.occ.count>0);if(s.length===0)continue;let r=new Map;for(let o of s){let a=r.get(o.f.planeId)??[];a.push(o),r.set(o.f.planeId,a)}for(let o of r.values())if(o.length>=2)for(let a=1;a<o.length;a++)t.mergePairs.push([o[0].f.id,o[a].f.id]);else{let{f:a,occ:l}=o[0];l.count>=2||l.onHole?t.heal.add(a.id):t.burst.add(a.id)}}return t}reconcileErase(e,t,n,s){let r=[],o=new Map,a=h(g=>{let m=g;for(;o.get(m)!==void 0&&o.get(m)!==m;)m=o.get(m);return m},"find");for(let[g,m]of s.mergePairs)o.has(g)||o.set(g,g),o.has(m)||o.set(m,m),o.set(a(g),a(m));let l=new Map;for(let g of o.keys()){let m=a(g);(l.get(m)??l.set(m,[]).get(m)).push(g)}let c=this.regionsByPlane(e,t,n),u=new Set,f=h((g,m)=>(c.get(g)??[]).find(y=>!u.has(y)&&Hf(y,m)),"findRegionAt"),d=new Set(s.burst);for(let g of l.values()){let m=g.some(x=>d.has(x)),y,p;if(!m)for(let x of g){let S=this.byId.get(x);if(S&&(y=f(S.planeId,xs(S)),y)){p=S.planeId;break}}if(y&&p!==void 0){for(let S of g)this.byId.delete(S);let x=this.mint(p,y);u.add(y),r.push({type:"MERGE",from:g,into:x.id})}else for(let x of g)d.add(x)}for(let g of s.heal){if(d.has(g)||!this.byId.has(g))continue;let m=this.byId.get(g),y=f(m.planeId,xs(m));if(y){this.byId.delete(g);let p=this.mint(m.planeId,y);u.add(y),r.push({type:"ABSORB",from:g,into:p.id})}else d.add(g)}for(let g of d)this.byId.delete(g)&&r.push({type:"BURST",face:g});return this.rebuildFaceLinks(e),r}deleteSilently(e){return this.byId.delete(e)}renameFace(e,t){let n=this.byId.get(e);!n||this.byId.has(t)||(this.byId.delete(e),this.byId.set(t,{id:t,planeId:n.planeId,outer:n.outer,holes:n.holes}))}eraseFaces(e,t){let n=[];for(let s of t)this.byId.delete(s)&&n.push({type:"FACE_ERASED",face:s});return this.rebuildFaceLinks(e),n}reconcileCoverage(e,t,n,s,r,o,a,l,c="or"){return this.settle(e,t,n,s,r,o,a,l,c,{})}settle(e,t,n,s,r,o,a,l,c,u){let f=[];if(!a){for(let v of this.faces())this.refreshRingPts(e,t,v);this.rebuildFaceLinks(e);let T=[...o].filter(v=>this.byId.has(v));return T.length&&f.push({type:"STRETCH",faces:T}),f}let d=[],g=this.regionsByPlane(e,t,n),m=h(T=>{for(;r.has(T);)T=r.get(T);return T},"chase"),y=h(T=>{let v=[];for(let P of T){let C=m(P);if(!e.hasVertex(C))continue;let I=e.pt(C);v.length&&I.x===v[v.length-1].x&&I.y===v[v.length-1].y&&I.z===v[v.length-1].z||v.push(I)}for(;v.length>=2&&v[0].x===v[v.length-1].x&&v[0].y===v[v.length-1].y&&v[0].z===v[v.length-1].z;)v.pop();return v},"ringPts3"),p=new Map,x=new Map;for(let T of this.faces()){let v=s.get(T.id),P=[],C=l?.get(T.id),I=C??(v?[v.outer]:[]);for(let D of I){let L=y(D);if(L.length<3)continue;let H=null;for(let ee=0;ee+2<L.length&&!H;ee++)H=kn(L[ee],L[ee+1],L[ee+2]);if(!H||!L.every(ee=>Ot(ee,H)<=n))continue;let F=t.ensure(H,n),Y=L.map(ee=>Yt(ee,F.basis)),k=C?[]:(v?.holes??[]).map(ee=>y(ee).map(re=>Yt(re,F.basis))),Z=h(ee=>Wf(ee,Y)+k.reduce((re,le)=>re+(le.length>=3?Wf(ee,le):0),0),"windTotal");for(let[ee,re]of g){let le=t.rec(ee),_e=ne(le.plane.n,F.plane.n);if(!(Math.abs(_e)<.999))for(let $e of re){if(P.some(Be=>Be.r===$e))continue;let tt=xs($e),{u:Ke,v:J}=le.basis,oe=le.plane.n,ie=le.plane.d,Fe={x:Ke.x*tt.x+J.x*tt.y+oe.x*ie,y:Ke.y*tt.x+J.y*tt.y+oe.y*ie,z:Ke.z*tt.x+J.z*tt.y+oe.z*ie};Ot(Fe,F.plane)>3*n||Math.abs(Z(Yt(Fe,F.basis)))>=1&&P.push({r:$e,planeId:ee})}}}p.set(T.id,P);for(let D of P){let L=x.get(D.r)??[];L.push(T.id),x.set(D.r,L)}}let S=new Map,M=new Map;for(let[T,v]of p){if(v.length<2)continue;this.byId.delete(T);let P=[];for(let C of v){let I=this.mint(C.planeId,C.r);P.push(I.id);let D=x.get(C.r);D[D.indexOf(T)]=I.id}S.set(T,P),f.push({type:"DIVIDE",from:T,into:P})}for(let[T,v]of x){let P=[...new Set(v)];if(P.length<2)continue;if(c==="xor"&&P.length%2===0){for(let D of P){let L=this.byId.get(D);L&&d.push(...this.ringEdgeIds(L)),this.byId.delete(D)&&f.push({type:"BURST",face:D})}x.set(T,[]);continue}let C=null;for(let D of P)C=this.byId.get(D)?.planeId??C,this.byId.delete(D);let I=this.mint(C,T);for(let D of P)S.set(D,[...S.get(D)??[],I.id]);f.push({type:"MERGE",from:P,into:I.id}),x.set(T,[I.id])}for(let[T,v]of p){if(S.has(T))continue;let P=this.byId.get(T);if(!P)continue;if(v.length===0){if(u.zeroClaimKeep&&this.repairRings(e,P)){this.refreshRingPts(e,t,P);continue}this.byId.delete(T),f.push({type:"BURST",face:T});continue}let{r:C,planeId:I}=v[0];(x.get(C)??[])[0]===T&&(I===P.planeId?this.adopt(P,C):(this.byId.delete(T),this.byId.set(T,{id:T,planeId:I,outer:C.outer,holes:C.holes}),M.set(T,T)))}let _=u.gestureEdges,A=u.toggleWith;if(A&&_)for(let T of this.faces())T.outer.edges.every(v=>_.has(v.edge)||A.has(v.edge))&&(d.push(...this.ringEdgeIds(T)),this.byId.delete(T.id),f.push({type:"BURST",face:T.id}));if(_&&_.size){let T=new Set;for(let[,C]of p)for(let I of C)T.add(I.r);let v=h(C=>[C.outer,...C.holes].map(I=>[...I.edges.map(D=>D.edge)].sort((D,L)=>D-L).join(",")).join("|"),"ringKey"),P=new Set(this.faces().map(v));for(let[C,I]of g)for(let D of I)if(!T.has(D)&&!this.faces().some(L=>L.outer===D.outer)&&!P.has(v(D))&&D.outer.edges.some(L=>_.has(L.edge))){let L=this.mint(C,D);f.push({type:"BIRTH",face:L.id})}}this.rebuildFaceLinks(e),this.buryEdges(e,d);let w=new Set;for(let T of o){this.byId.has(T)&&!S.has(T)&&!f.some(P=>P.type==="BURST"&&P.face===T)&&w.add(T);let v=M.get(T);v!==void 0&&w.add(v)}return w.size&&f.push({type:"STRETCH",faces:[...w]}),f}buryEdges(e,t){for(let n of t)e.hasEdge(n)&&e.edge(n).faceLinks.length===0&&e.removeEdge(n)}repairRings(e,t){for(let n of[t.outer,...t.holes])if(!qg(e,n))return!1;return!0}ringEdgeIds(e){let t=[];for(let n of[e.outer,...e.holes])for(let s of n.edges)t.push(s.edge);return t}captureSnaps(e){let t=new Map;for(let n of this.faces())t.set(n.id,{outer:un(e,n.outer),holes:n.holes.map(s=>un(e,s))});return t}clone(){let e=new Eo;e.nextId=this.nextId;let t=h(n=>({edges:n.edges.map(s=>({...s})),pts:n.pts.map(s=>({...s}))}),"cloneRing");for(let[n,s]of this.byId)e.byId.set(n,{id:s.id,planeId:s.planeId,outer:t(s.outer),holes:s.holes.map(t)});return e}mint(e,t){let n={id:this.nextId++,planeId:e,outer:t.outer,holes:t.holes};return this.byId.set(n.id,n),n}adopt(e,t){e.outer=t.outer,e.holes=t.holes}refreshRingPts(e,t,n){let s=t.rec(n.planeId).basis;for(let r of[n.outer,...n.holes])r.pts=r.edges.map(o=>Yt(e.pt(o.forward?e.edge(o.edge).a:e.edge(o.edge).b),s))}rebuildFaceLinks(e){for(let t of e.edges())t.faceLinks=[];for(let t of this.byId.values())for(let n of[t.outer,...t.holes])for(let s of n.edges)e.hasEdge(s.edge)&&e.edge(s.edge).faceLinks.push(t.id)}};h(Eo,"FaceStore");var wo=Eo;function Wf(i,e){let t=0;for(let n=0;n<e.length;n++){let s=e[n],r=e[(n+1)%e.length];s.y<=i.y?r.y>i.y&&Ic(s,r,i)>0&&t++:r.y<=i.y&&Ic(s,r,i)<0&&t--}return t}h(Wf,"windingOf");function un(i,e){let t=[],n=e.edges;for(let s=0;s<n.length;s++){let r=n[s];if(i.hasEdge(r.edge)){let o=i.edge(r.edge);t.push(r.forward?o.a:o.b)}else{let o=n[(s-1+n.length)%n.length];if(i.hasEdge(o.edge)){let a=i.edge(o.edge);t.push(o.forward?a.b:a.a)}}}return t}h(un,"ringVidsTolerant");function qg(i,e){let t=e.edges;if(t.every(u=>i.hasEdge(u.edge)))return!0;let n=t.findIndex(u=>i.hasEdge(u.edge));if(n<0)return!1;let s=[...t.slice(n),...t.slice(0,n)],r=s.length,o=h(u=>u.forward?i.edge(u.edge).a:i.edge(u.edge).b,"vStart"),a=h(u=>u.forward?i.edge(u.edge).b:i.edge(u.edge).a,"vEnd"),l=[],c=0;for(;c<r;){let u=s[c];if(i.hasEdge(u.edge)){l.push(u),c++;continue}let f=c;for(;f<r&&!i.hasEdge(s[f].edge);)f++;let d=a(s[c-1]),g=o(f<r?s[f]:s[0]),m=Yg(i,d,g);if(!m)return!1;l.push(...m),c=f}return e.edges=l,!0}h(qg,"repairRing");function Yg(i,e,t){if(e===t)return[];let n=i.pt(e),s=i.pt(t),r=[],o=new Set([e]),a=e;for(let l=0;l<1e5&&a!==t;l++){let c=i.pt(a),u=pt(c,s),f,d,g=1/0;for(let m of i.vertex(a).edges){let y=i.edge(m),p=y.a===a?y.b:y.a;if(o.has(p))continue;let x=i.pt(p);if(!gs(x,n,s,1e-6*2)||pt(x,s)>=u-1e-12)continue;let S=pt(c,x);S<g&&(g=S,f=m,d=p)}if(f===void 0||d===void 0)return null;r.push({edge:f,forward:i.edge(f).a===a}),o.add(d),a=d}return a===t?r:null}h(Yg,"collinearChain");var To=h(i=>({x:i.x,y:i.y,z:i.z??0}),"toPt3"),Ao=class Ao{constructor(e){U(this,"_graph",new _o);U(this,"store",new wo);U(this,"eventLog",[]);U(this,"planes",new So);U(this,"coplanarTol");this.coplanarTol=e?.coplanarTol??.001}get graph(){return this._graph}clone(){let e=new Ao({coplanarTol:this.coplanarTol});return e._graph=this._graph.clone(),e.store=this.store.clone(),e.planes=this.planes.clone(),e}addEdges(e){return this.addSegmentsMixed(e.map(([t,n])=>({a:t,b:n,gesture:!0})))}addSegmentsMixed(e,t,n){let s=this.store.captureSnaps(this.graph),r=new Set(n);for(let{a:o,b:a,gesture:l}of e){let c=Of(this.graph,To(o),To(a),(u,f,d)=>{r.delete(u)&&(r.add(f),r.add(d))});if(l){for(let u of c.created)r.add(u);for(let u of c.retraced)r.add(u)}}return this.emit(this.store.reconcileConstructive(this.graph,this.planes,this.coplanarTol,r,t,s))}eraseEdges(e){let t=[...new Set(e)].filter(s=>this.graph.hasEdge(s)),n=this.store.snapshotEraseVerdicts(t);for(let s of t)this.graph.removeEdge(s);return this.emit(this.store.reconcileErase(this.graph,this.planes,this.coplanarTol,n))}eraseFaces(e){return this.emit(this.store.eraseFaces(this.graph,e))}moveVertices(e,t="or"){let n=new Map;for(let m of this.store.faces())n.set(m.id,{outer:un(this.graph,m.outer),holes:m.holes.map(y=>un(this.graph,y))});let s=new Map;for(let m of e)this.graph.hasVertex(m.id)&&s.set(m.id,Ki(To(m.to)));let r=new Set;for(let m of s.keys())for(let y of this.graph.vertex(m).edges)for(let p of this.graph.edge(y).faceLinks)r.add(p);let o=new Map;for(let m of this.graph.vertices()){let y=s.get(m.id)??{x:m.x,y:m.y,z:m.z},p=It(y),x=o.get(p)??[];x.push(m.id),o.set(p,x)}let a=new Map,l=!1;for(let m of o.values()){if(m.length<2)continue;l=!0;let y=m.find(p=>!s.has(p))??Math.min(...m);for(let p of m)p!==y&&(a.set(p,y),this.absorbVertex(p,y),s.delete(p))}let c=[...s].filter(([m,y])=>this.graph.hasVertex(m)&&!an(this.graph.pt(m),y)).map(([m,y])=>({id:m,to:y}));this.graph.relocateVertices(c);let{changed:u}=Dc(this.graph),f=h(m=>{let y=m;for(;a.has(y);)y=a.get(y);return y},"chase"),d=new Map;for(let[m,y]of n){if(y.holes.length)continue;let p=[];for(let _ of y.outer){let A=f(_);this.graph.hasVertex(A)&&(p.length&&p[p.length-1]===A||p.push(A))}for(;p.length>=2&&p[0]===p[p.length-1];)p.pop();if(p.length<4)continue;let x=p.map(_=>this.graph.pt(_)),S=null;for(let _=0;_+2<x.length&&!S;_++)S=kn(x[_],x[_+1],x[_+2]);if(S&&x.every(_=>Ot(_,S)<=this.coplanarTol))continue;let M=Bf(x,this.coplanarTol);if(M){for(let[_,A]of M.creases){let w=p[_],T=p[A];w===T||this.graph.edgeBetween(w,T)!==void 0||this.graph.addEdge(w,T)}d.set(m,M.pieces.map(_=>_.map(A=>p[A])))}}d.size&&Dc(this.graph);let g=l||u||r.size>0;return this.emit(this.store.reconcileCoverage(this.graph,this.planes,this.coplanarTol,n,a,r,g,d,t))}pushPull(e,t,n){let s=n?.settleLanding!==!1,r=this.store.face(e);if(!r)return[];let o=this.planes.rec(r.planeId),a=o.plane.n,l=Re(a,t);if(Math.abs(t)<1e-6)return[];let c=new Set(this.graph.edges().map(L=>L.id)),u=[r.outer,...r.holes],f=new Map,d=new Set,g=new Set,m=new Map;for(let L=0;L<u.length;L++)for(let H of u[L].edges){let F=this.graph.edge(H.edge);d.add(F.id),m.set(F.id,L);let Y=F.faceLinks.filter(k=>k!==e);Y.length===0?(f.set(F.id,"move"),g.add(F.id)):Y.every(k=>{let Z=this.store.face(k);return Z?Math.abs(ne(this.planes.rec(Z.planeId).plane.n,a))<=.001:!0})?f.set(F.id,"move"):f.set(F.id,"copy")}let y=new Map;for(let L of d){let H=this.graph.edge(L),F=f.get(L);for(let Y of[H.a,H.b]){let k=y.get(Y)??{hasMove:!1,hasCopy:!1};F==="move"?k.hasMove=!0:k.hasCopy=!0,y.set(Y,k)}}for(let L of this.graph.edges()){if(d.has(L.id))continue;let H={a:y.get(L.a),b:y.get(L.b)};if(!H.a&&!H.b)continue;let F=this.graph.pt(L.a),Y=this.graph.pt(L.b),k=Me(Y,F),Z=Math.hypot(k.x,k.y,k.z);Z>0&&Math.abs(ne(Re(k,1/Z),a))>.999||(H.a&&(H.a.hasCopy=!0),H.b&&(H.b.hasCopy=!0))}let p=h(L=>{let H=y.get(L);return H.hasMove&&!H.hasCopy},"travels"),x=new Map;for(let L of y.keys())x.set(L,this.graph.pt(L));let S=[],M=[...f.values()].some(L=>L==="copy")||[...y.values()].some(L=>L.hasCopy),_=h(L=>m.get(L)===0,"isOuter");for(let L of d){if(f.get(L)!=="copy")continue;let H=this.graph.edge(L);S.push({a:Ue(x.get(H.a),l),b:Ue(x.get(H.b),l),gesture:_(L)})}for(let L of[...d]){if(f.get(L)!=="move"||g.has(L))continue;let H=this.graph.edge(L);p(H.a)&&p(H.b)||(S.push({a:Ue(x.get(H.a),l),b:Ue(x.get(H.b),l),gesture:_(L)}),this.graph.removeEdge(L))}for(let L of[...g]){if(!this.graph.hasEdge(L))continue;let H=this.graph.edge(L);S.push({a:x.get(H.a),b:x.get(H.b),gesture:_(L)}),p(H.a)&&p(H.b)||(S.push({a:Ue(x.get(H.a),l),b:Ue(x.get(H.b),l),gesture:_(L)}),this.graph.removeEdge(L))}for(let[L,H]of y){let F=x.get(L);H.hasCopy?S.push({a:F,b:Ue(F,l),gesture:!0}):p(L)&&[...g].some(Y=>{if(!c.has(Y))return!1;let Z=this.graph.hasEdge(Y)?this.graph.edge(Y):null;return Z?Z.a===L||Z.b===L:!1})&&S.push({a:F,b:Ue(F,l),gesture:!0})}let A=null;if(M){let L=xs({outer:r.outer,holes:r.holes}),H=o.basis,F=Ue(Ue(Re(H.u,L.x),Re(H.v,L.y)),Re(o.plane.n,o.plane.d));A=Ue(F,l),this.store.deleteSilently(e)}let w=new Set(this.store.faces().map(L=>L.id)),T=[...y.keys()].filter(L=>p(L)&&this.graph.hasVertex(L)).map(L=>({id:L,to:Ue(x.get(L),l)})),v=T.length?this.moveVertices(T,s?"xor":"or"):[],P=new Set([...d].filter(L=>f.get(L)==="move")),C=new Set;if(M)for(let L of d)f.get(L)==="move"&&_(L)&&this.graph.hasEdge(L)&&C.add(L);let I=S.length?this.addSegmentsMixed(S,s&&M?P:new Set,C):[],D=[];if(M&&A){let L=this.hitTest(A,this.coplanarTol).face;if(L!==void 0&&!w.has(L)){this.store.renameFace(L,e),this.store.rebuildFaceLinks(this.graph);for(let H of I)if(H.type==="BIRTH"&&H.face===L){let F=H;delete F.face,F.type="STRETCH",F.faces=[e];break}}else D=this.emit([{type:"FACE_ERASED",face:e}])}return[...v,...I,...D]}vertices(){return this.graph.vertices()}edges(){return this.graph.edges()}faces(){return this.store.faces()}face(e){return this.store.face(e)}log(){return this.eventLog}hitTest(e,t){let n=To(e),s,r=t;for(let l of this.graph.vertices()){let c=pt(n,{x:l.x,y:l.y,z:l.z});c<=r&&(r=c,s=l.id)}if(s!==void 0)return{vertex:s};let o,a=t;for(let l of this.graph.edges()){let c=Nf(n,this.graph.pt(l.a),this.graph.pt(l.b));c<=a&&(a=c,o=l.id)}if(o!==void 0)return{edge:o};for(let l of this.store.faces()){let c=this.planes.rec(l.planeId);if(!(Ot(n,c.plane)>Math.max(t,this.coplanarTol))&&this.store.faceContains(l,Yt(n,c.basis)))return{face:l.id}}return{}}faceRings3(e){let t=this.store.face(e);if(!t)return;let n=h(s=>s.edges.map(r=>this.graph.pt(r.forward?this.graph.edge(r.edge).a:this.graph.edge(r.edge).b)),"ring3");return{outer:n(t.outer),holes:t.holes.map(n)}}planeOf(e){return this.store.face(e)?this.planes.rec(this.store.face(e).planeId):void 0}emit(e){return this.eventLog.push(...e),e}absorbVertex(e,t){for(let n of[...this.graph.vertex(e).edges]){let s=this.graph.edge(n),r=this.graph.otherEnd(s,e);r!==t&&this.graph.edgeBetween(t,r)===void 0&&this.graph.addEdge(t,r),this.graph.removeEdge(n)}}};h(Ao,"Kernel");var _i=Ao;var $g={x:0,y:0,z:1},Kg=5e3,Zg=.5,Xf=4,qf=.001,Yf=1e5,Fc=class Fc{constructor(){U(this,"target",{x:0,y:0,z:0});U(this,"yaw",-Math.PI/4);U(this,"pitch",Math.PI/6);U(this,"halfH",Xf);U(this,"projection","ortho");U(this,"fovY",50*Math.PI/180);U(this,"nearMin",Zg)}eyeDir(){let e=Math.cos(this.pitch);return{x:e*Math.cos(this.yaw),y:e*Math.sin(this.yaw),z:Math.sin(this.pitch)}}eyeDist(){return this.projection==="persp"?this.halfH/Math.tan(this.fovY/2):Kg}eye(){return Ue(this.target,Re(this.eyeDir(),this.eyeDist()))}forward(){return Re(this.eyeDir(),-1)}right(){return _n(Et(this.forward(),$g))}up(){return Et(this.right(),this.forward())}viewDir(e){return this.projection!=="persp"?this.eyeDir():_n(Me(this.eye(),e))}orbit(e,t){this.yaw-=e*.008,this.pitch=Math.max(-1.55,Math.min(1.55,this.pitch+t*.008))}pan(e,t,n){let s=2*this.halfH/n.h;this.target=Ue(this.target,Ue(Re(this.right(),-e*s),Re(this.up(),t*s)))}zoomBy(e){this.halfH=Math.max(qf,Math.min(Yf,this.halfH*e))}nearClamp(){return Math.min(this.nearMin,this.eyeDist()*.05)}zoomAt(e,t,n,s){let r=(t/s.w*2-1)*this.halfW(s),o=(1-n/s.h*2)*this.halfH,a=Ue(Ue(this.target,Re(this.right(),r)),Re(this.up(),o)),l=this.halfH;this.zoomBy(e);let c=this.halfH/l;this.target=Ue(a,Re(Me(this.target,a),c))}halfW(e){return this.halfH*e.w/e.h}angularPx(e,t){if(this.projection==="persp"){let o=Me(e,this.eye()),a=Math.max(ne(o,this.forward()),this.nearClamp()),l=Math.tan(this.fovY/2),c=ne(o,this.right())/(a*l*(t.w/t.h)),u=ne(o,this.up())/(a*l);return{x:(c*.5+.5)*t.w,y:(.5-u*.5)*t.h}}let n=Me(e,this.target),s=ne(n,this.right())/this.halfW(t),r=ne(n,this.up())/this.halfH;return{x:(s*.5+.5)*t.w,y:(.5-r*.5)*t.h}}distTo(e,t,n,s){let r=this.angularPx(n,s);return Math.hypot(r.x-e,r.y-t)}distToSeg(e,t,n,s,r,o=!1){let a=this.angularPx(n,r),l=this.angularPx(s,r),c=l.x-a.x,u=l.y-a.y,f=c*c+u*u;if(f===0)return{d:Math.hypot(e-a.x,t-a.y),t:0};let d=((e-a.x)*c+(t-a.y)*u)/f;return o?{d:Math.abs((e-a.x)*u-(t-a.y)*c)/Math.sqrt(f),t:d}:(d=Math.max(0,Math.min(1,d)),{d:Math.hypot(e-(a.x+d*c),t-(a.y+d*u)),t:d})}distBetween(e,t,n){let s=this.angularPx(e,n),r=this.angularPx(t,n);return Math.hypot(s.x-r.x,s.y-r.y)}distToRing(e,t,n,s){let r=n.map(a=>this.angularPx(a,s));if(ft({x:e,y:t},r))return 0;let o=1/0;for(let a=0;a<r.length;a++){let l=r[a],c=r[(a+1)%r.length],u=c.x-l.x,f=c.y-l.y,d=u*u+f*f,g=d>0?Math.max(0,Math.min(1,((e-l.x)*u+(t-l.y)*f)/d)):0;o=Math.min(o,Math.hypot(e-(l.x+g*u),t-(l.y+g*f)))}return o}dirCos(e,t,n,s,r){let o=this.angularPx(n,r),a=e-o.x,l=t-o.y,c=Math.hypot(a,l);return c<1e-6?s.map(()=>null):s.map(u=>{let f=this.angularPx(Ue(n,Re(u,.01)),r),d=f.x-o.x,g=f.y-o.y,m=Math.hypot(d,g);return m<1e-9?null:Math.abs(a*d+l*g)/(c*m)})}ray(e,t,n){if(this.projection==="persp"){let a=Math.tan(this.fovY/2),l=(e/n.w*2-1)*a*(n.w/n.h),c=(1-t/n.h*2)*a,u=_n(Ue(Ue(this.forward(),Re(this.right(),l)),Re(this.up(),c)));return{origin:this.eye(),dir:u}}let s=(e/n.w*2-1)*this.halfW(n),r=(1-t/n.h*2)*this.halfH;return{origin:Ue(Ue(this.eye(),Re(this.right(),s)),Re(this.up(),r)),dir:this.forward()}}setView(e){switch(e){case"iso":this.yaw=-Math.PI/4,this.pitch=.61;break;case"top":this.yaw=-Math.PI/2,this.pitch=1.55;break;case"front":this.yaw=-Math.PI/2,this.pitch=0;break;case"back":this.yaw=Math.PI/2,this.pitch=0;break;case"right":this.yaw=0,this.pitch=0;break;case"left":this.yaw=Math.PI,this.pitch=0;break}}fitPoints(e,t,n=Xf){if(!e.length){this.target={x:0,y:0,z:0},this.halfH=n;return}let s=0,r=0,o=0;for(let d of e)s+=d.x,r+=d.y,o+=d.z;this.target={x:s/e.length,y:r/e.length,z:o/e.length};let a=this.right(),l=this.up(),c=0,u=0;for(let d of e){let g=Me(d,this.target);c=Math.max(c,Math.abs(ne(g,a))),u=Math.max(u,Math.abs(ne(g,l)))}let f=t.w/t.h;this.halfH=Math.max(qf,Math.min(Yf,Math.max(u,c/f)*1.25))}};h(Fc,"OrbitCamera");var Po=Fc;function Vn(i,e,t,n){let s=ne(t,e);if(Math.abs(s)<1e-9)return null;let r=(n-ne(t,i))/s;return Ue(i,Re(e,r))}h(Vn,"rayPlane");function bi(i,e,t,n){let s=ne(e,n),r=1-s*s;if(Math.abs(r)<1e-9)return null;let o=Me(t,i),a=(ne(o,e)-s*ne(o,n))/r;return Ue(i,Re(e,a))}h(bi,"closestOnAxis");var Si={endpoint:90,origin:80,midpoint:70,intersection:65,edge:60,cross:55,axisLine:45,plane:10},ys={point:10,edge:7,line:3.5,combo:12},Ro=8,Jg=6,jg=24,Qg=10,ex=Math.cos(Qg*Math.PI/180),tx=800,$f=h(i=>i.h/tx,"epsScale");function Io(i,e,t){let n=i.eps?.(e);if(n)return n;let s=t/Ro;return{point:ys.point*s,edge:ys.edge*s,line:ys.line*s,combo:ys.combo*s,hit:Jg*s,snap:Ro*s,planeNear:jg*$f(e),tap:4,drag:16*$f(e)}}h(Io,"frameEps");var Zf=1e-5;function nx(i,e){let t=ne(i.dir,e.dir),n=1-t*t;if(Math.abs(n)<1e-9)return null;let s=Me(i.a,e.a),r=ne(i.dir,s),o=ne(e.dir,s),a=(t*o-r)/n,l=(o-t*r)/n;if(i.len!==void 0&&(a<-1e-9||a>i.len+1e-9)||e.len!==void 0&&(l<-1e-9||l>e.len+1e-9))return null;let c={x:i.a.x+i.dir.x*a,y:i.a.y+i.dir.y*a,z:i.a.z+i.dir.z*a},u={x:e.a.x+e.dir.x*l,y:e.a.y+e.dir.y*l,z:e.a.z+e.dir.z*l};return pt(c,u)>Zf?null:e.len!==void 0?u:c}h(nx,"intersect1D");function ix(i,e,t,n){let{pf:s,vp:r}=i,o=n?.comboEps??ys.combo,a=s.ray(e.x,e.y,r),l=h(y=>s.distTo(e.x,e.y,y,r),"sd"),c=h((y,p,x)=>{let S=x!==void 0?Ue(y,Re(p,x)):Ue(y,Re(p,100));return s.distToSeg(e.x,e.y,y,S,r,x===void 0).d},"lineScreenDist"),u=[],f=[],d=n?.hidden;for(let y of t){let p=y.locus;if(p.dim===0){let x=l(p.p);x<=y.eps&&!(d&&d(p.p))&&u.push({p:p.p,dim:0,rank:y.rank,d:x,used:[y]})}else if(p.dim===1){let x=c(p.a,p.dir,p.len);if(x>y.eps||Math.abs(ne(p.dir,a.dir))>ex)continue;let S=bi(p.a,p.dir,a.origin,a.dir);if(!S)continue;let M=ne(Me(S,p.a),p.dir);p.len!==void 0&&(M=Math.max(0,Math.min(p.len,M)));let _=x;if(n?.spans1D){let w=p.len!==void 0?0:Math.abs(M)+1e5,T=p.len!==void 0?0:M-w,v=p.len!==void 0?p.len:M+w,P=n.spans1D(p.a,p.dir,T,v),C=null;for(let I of P)if(M>I[0]+1e-9&&M<I[1]-1e-9){C=I;break}if(C){let I=[C[0],C[1]].filter(L=>L>T+1e-9&&L<v-1e-9);if(!I.length)continue;M=I.reduce((L,H)=>Math.abs(H-M)<Math.abs(L-M)?H:L);let D={x:p.a.x+p.dir.x*M,y:p.a.y+p.dir.y*M,z:p.a.z+p.dir.z*M};if(_=l(D),_>y.eps)continue}}else if(d){let w={x:p.a.x+p.dir.x*M,y:p.a.y+p.dir.y*M,z:p.a.z+p.dir.z*M};if(d(w))continue}let A={x:p.a.x+p.dir.x*M,y:p.a.y+p.dir.y*M,z:p.a.z+p.dir.z*M};u.push({p:A,dim:1,rank:y.rank,d:_,used:[y]}),f.push({c:y,l:p})}else{let x=Vn(a.origin,a.dir,p.plane.n,p.plane.d);x&&u.push({p:x,dim:2,rank:y.rank,d:0,used:[y]})}}for(let y=0;y<f.length;y++)for(let p=y+1;p<f.length;p++){let x=nx(f[y].l,f[p].l);if(!x||d&&d(x))continue;let S=l(x);S>o||u.push({p:x,dim:0,rank:Math.max(f[y].c.rank,f[p].c.rank),d:S,used:[f[y].c,f[p].c]})}if(!u.length)return null;let g={endpoint:0,origin:0,midpoint:0,axis:1,align:2,"edge-align":3,edge:4},m=h(y=>{let p=y.used[0]?.tag;return`${g[p?.kind??""]??9}|${p?.kind??""}|${p?.axis??""}|${p?.src?It(p.src):""}`},"tagKey");return u.sort((y,p)=>y.dim-p.dim||p.rank-y.rank||Math.round(y.d*2)-Math.round(p.d*2)||(m(y)<m(p)?-1:m(y)>m(p)?1:0)),u[0]}h(ix,"solvePoint");var Nc={has:h(()=>!1,"has"),opaque:!1},sx=[{axis:"x",dir:{x:1,y:0,z:0}},{axis:"y",dir:{x:0,y:1,z:0}},{axis:"z",dir:{x:0,y:0,z:1}}];function rx(i,e,t){return t?[...un(i.graph,e.outer),...e.holes.flatMap(n=>un(i.graph,n))].some(n=>t.has(n)):!1}h(rx,"faceTouchesHand");function Jf(i,e,t){return t?t.faces?t.faces(e.id):rx(i,e,t):!1}h(Jf,"faceInHand");function jf(i,e){if(!e||e.opaque)return;let t=new Set;for(let n of i.faces())Jf(i,n,e)&&t.add(n.id);return t.size?n=>t.has(n):void 0}h(jf,"handFaceSkip");function ox(i,e){let t=i.edges(),n=new Map,s=h(c=>{let u=c;for(;n.has(u)&&n.get(u)!==u;)u=n.get(u);return u},"find"),r=h((c,u)=>{let f=s(c),d=s(u);f!==d&&n.set(f,d)},"union"),o=new Map;for(let c of t)for(let u of[c.a,c.b]){if(!e(u))continue;let f=o.get(u);f?f.push(c):o.set(u,[c])}for(let[c,u]of o){let f=i.graph.pt(c),d=u.map(m=>{let y=i.graph.pt(m.a===c?m.b:m.a),p=Me(y,f),x=pt(y,f);return x>0?Re(p,1/x):null}),g=new Set;for(let m=0;m<u.length;m++)if(!(g.has(m)||!d[m])){for(let y=m+1;y<u.length;y++)if(!(g.has(y)||!d[y])&&ne(d[m],d[y])<-(1-1e-9)){r(u[m].id,u[y].id),g.add(m),g.add(y);break}}}let a=new Map;for(let c of t){let u=s(c.id),f=a.get(u);f?f.push(c):a.set(u,[c])}let l=[];for(let c of a.values()){let u=new Map;for(let d of c)for(let g of[d.a,d.b])u.set(g,(u.get(g)??0)+1);let f=[...u].filter(([,d])=>d===1).map(([d])=>d);f.length===2&&(e(f[0])||e(f[1])||l.push({a:i.graph.pt(f[0]),b:i.graph.pt(f[1])}))}return l}h(ox,"edgeTargets");function or(i,e,t,n){let s=e.viewDir(t);for(let r of i.faces()){if(n?.(r.id))continue;let o=i.planeOf(r.id),a=i.face(r.id);if(!o||!a)continue;let l=ne(o.plane.n,s);if(Math.abs(l)<1e-9)continue;let c=(o.plane.d-ne(o.plane.n,t))/l;if(c<=1e-4)continue;let u=Ue(t,Re(s,c)),f={x:ne(u,o.basis.u),y:ne(u,o.basis.v)};if(ft(f,a.outer.pts)&&!a.holes.some(d=>ft(f,d.pts)))return!0}return!1}h(or,"occludedBy");function ax(i,e,t,n,s,r,o){let a=e.viewDir(Ue(t,Re(n,(s+r)/2))),l=[];for(let u of i.faces()){if(o?.(u.id))continue;let f=i.planeOf(u.id),d=i.face(u.id);if(!f||!d)continue;let g=f.plane.n,m=f.plane.d,y=ne(g,a);if(Math.abs(y)<1e-9)continue;let p=(m-ne(g,t))/y,x=-ne(g,n)/y,{u:S,v:M}=f.basis,_=ne(t,S)+p*ne(a,S),A=ne(n,S)+x*ne(a,S),w=ne(t,M)+p*ne(a,M),T=ne(n,M)+x*ne(a,M),v=[s,r];Math.abs(x)>1e-12&&v.push((1e-4-p)/x);for(let C of[d.outer.pts,...d.holes.map(I=>I.pts)])for(let I=0;I<C.length;I++){let D=C[I],L=C[(I+1)%C.length],H=L.x-D.x,F=L.y-D.y,Y=-A*F+T*H;if(Math.abs(Y)<1e-12)continue;let k=D.x-_,Z=D.y-w,ee=(-k*F+Z*H)/Y,re=(A*Z-T*k)/Y;re>=-1e-9&&re<=1+1e-9&&v.push(ee)}let P=v.filter(C=>C>=s-1e-9&&C<=r+1e-9).sort((C,I)=>C-I);for(let C=0;C+1<P.length;C++){let I=P[C],D=P[C+1];if(D-I<1e-9)continue;let L=(I+D)/2;if(p+x*L<=1e-4)continue;let H={x:_+A*L,y:w+T*L};ft(H,d.outer.pts)&&(d.holes.some(F=>ft(H,F.pts))||l.push([I,D]))}}l.sort((u,f)=>u[0]-f[0]);let c=[];for(let u of l){let f=c[c.length-1];f&&u[0]<=f[1]+1e-9?f[1]=Math.max(f[1],u[1]):c.push([u[0],u[1]])}return c}h(ax,"occludedSpansOnLine");function lx(i){let e=[],{k:t}=i,n=i.eps??ys,s=h(f=>i.hand?.has(f)??!1,"ex"),r=jf(t,i.hand),o=h(f=>i.pf?or(t,i.pf,f,r):!1,"hidden");for(let f of t.vertices()){if(s(f.id))continue;let d={x:f.x,y:f.y,z:f.z};o(d)||e.push({locus:{dim:0,p:d},rank:Si.endpoint,eps:n.point,tag:{kind:"endpoint"}})}o({x:0,y:0,z:0})||e.push({locus:{dim:0,p:{x:0,y:0,z:0}},rank:Si.origin,eps:n.point,tag:{kind:"origin"}});let a=ox(t,s);for(let{a:f,b:d}of a){let g=pt(f,d);if(g<=0)continue;let m={x:(f.x+d.x)/2,y:(f.y+d.y)/2,z:(f.z+d.z)/2};o(m)||e.push({locus:{dim:0,p:m},rank:Si.midpoint,eps:n.point,tag:{kind:"midpoint"}}),e.push({locus:{dim:1,a:f,dir:Re(Me(d,f),1/g),len:g},rank:Si.edge,eps:n.edge,tag:{kind:"edge"}})}let l=[...sx];if(i.basis){let f=h(d=>Math.abs(d.x)>.999||Math.abs(d.y)>.999||Math.abs(d.z)>.999,"axisAligned");f(i.basis.u)||l.push({axis:"u",dir:i.basis.u}),f(i.basis.v)||l.push({axis:"v",dir:i.basis.v})}let c=new Set,u=h((f,d)=>{let g=It(f);if(!c.has(g)){c.add(g);for(let{axis:m,dir:y}of l)e.push({locus:{dim:1,a:f,dir:y},rank:Si.axisLine,eps:n.line,tag:{kind:d,src:f,axis:m}})}},"addLines");if(i.lines!==!1){i.anchor&&u(i.anchor,"axis"),u({x:0,y:0,z:0},"align");for(let f of i.alignSources??[])u(f,"align")}{let f=a.map(({a:d,b:g})=>{let m=pt(d,g);return m>0?{a:d,dir:Re(Me(g,d),1/m),ea:d,eb:g}:null}).filter(d=>d!==null);for(let d=0;d<f.length;d++)for(let g=d+1;g<f.length;g++){let m=cx(f[d],f[g]);m&&([f[d].ea,f[d].eb,f[g].ea,f[g].eb].some(y=>pt(m,y)<=1e-6)||o(m)||e.push({locus:{dim:0,p:m},rank:Si.intersection,eps:n.point,tag:{kind:"intersection"}}))}}{let f=t.faces().filter(d=>!Jf(t,d,i.hand));for(let d=0;d<f.length;d++)for(let g=d+1;g<f.length;g++)for(let m of hx(t,f[d].id,f[g].id))e.push({locus:{dim:1,a:m.a,dir:m.dir,len:m.len},rank:Si.cross,eps:n.line,tag:{kind:"cross"}})}return e.push({locus:{dim:2,plane:i.plane},rank:Si.plane,eps:1/0,tag:{kind:"plane"}}),e}h(lx,"buildConstraints");function cx(i,e){let t=ne(i.dir,e.dir),n=1-t*t;if(Math.abs(n)<1e-9)return null;let s=Me(i.a,e.a),r=ne(i.dir,s),o=ne(e.dir,s),a=(t*o-r)/n,l=(o-t*r)/n,c={x:i.a.x+i.dir.x*a,y:i.a.y+i.dir.y*a,z:i.a.z+i.dir.z*a},u={x:e.a.x+e.dir.x*l,y:e.a.y+e.dir.y*l,z:e.a.z+e.dir.z*l};return pt(c,u)>Zf?null:c}h(cx,"carrierIntersect");function Kf(i,e,t){let n=[];for(let r of t)for(let o=0;o<r.length;o++){let a=r[o],l=r[(o+1)%r.length],c=l.x-a.x,u=l.y-a.y,f=c*e.y-u*e.x;if(Math.abs(f)<1e-12)continue;let d=((i.x-a.x)*e.y-(i.y-a.y)*e.x)/f;if(d<0||d>=1)continue;let g=Math.abs(e.x)>Math.abs(e.y)?(a.x+d*c-i.x)/e.x:(a.y+d*u-i.y)/e.y;n.push(g)}n.sort((r,o)=>r-o);let s=[];for(let r=0;r+1<n.length;r+=2)s.push([n[r],n[r+1]]);return s}h(Kf,"lineFaceIntervals");function hx(i,e,t){let n=i.planeOf(e),s=i.planeOf(t),r=i.face(e),o=i.face(t);if(!n||!s||!r||!o)return[];let a=Et(n.plane.n,s.plane.n),l=ne(a,a);if(l<1e-12)return[];let c=Re(Ue(Re(Et(s.plane.n,a),n.plane.d),Re(Et(a,n.plane.n),s.plane.d)),1/l),u=Re(a,1/Math.sqrt(l)),f=h(x=>({p2:{x:ne(c,x.basis.u),y:ne(c,x.basis.v)},d2:{x:ne(u,x.basis.u),y:ne(u,x.basis.v)}}),"proj"),d=f(n),g=f(s),m=Kf(d.p2,d.d2,[r.outer.pts,...r.holes.map(x=>x.pts)]),y=Kf(g.p2,g.d2,[o.outer.pts,...o.holes.map(x=>x.pts)]),p=[];for(let[x,S]of m)for(let[M,_]of y){let A=Math.max(x,M),w=Math.min(S,_);w-A<1e-9||p.push({a:{x:c.x+u.x*A,y:c.y+u.y*A,z:c.z+u.z*A},dir:u,len:w-A})}return p}h(hx,"faceCrossSegments");function bn(i,e,t,n,s,r,o){let a=Io(e,t,r),l=jf(i,o.hand),c=h(m=>or(i,e,m,l),"occHidden"),u=lx({k:i,plane:o.plane.plane,basis:o.plane.basis,anchor:o.anchor,alignSources:o.alignSources,pf:e,lines:o.lines,hand:o.hand,eps:a}),f=ix({pf:e,vp:t},{x:n,y:s},u,{comboEps:a.combo,hidden:c,spans1D:h((m,y,p,x)=>ax(i,e,m,y,p,x,l),"spans1D")});if(!f)return{p:o.anchor??{x:0,y:0,z:0},kind:null};let d=[];for(let m of f.used)if(m.locus.dim===1&&(m.tag.kind==="axis"||m.tag.kind==="align")&&m.tag.src&&m.tag.axis)d.push({a:m.tag.src,b:f.p,axis:m.tag.axis});else if(m.locus.dim===1&&m.tag.kind==="cross"&&m.locus.len!==void 0){let y=m.locus;d.push({a:y.a,b:{x:y.a.x+y.dir.x*y.len,y:y.a.y+y.dir.y*y.len,z:y.a.z+y.dir.z*y.len},axis:"i"})}let g;if(f.used.length===2)g=f.used.some(m=>m.tag.kind==="edge")?"edge-align":"align-combo";else{let m=f.used[0].tag;g=m.kind==="endpoint"?"endpoint":m.kind==="origin"?"origin":m.kind==="midpoint"?"midpoint":m.kind==="intersection"?"intersection":m.kind==="cross"?"cross-line":m.kind==="edge"?"on-edge":m.kind==="axis"?m.axis==="u"||m.axis==="v"?"align":"axis-"+m.axis:m.kind==="align"?"align":m.kind==="plane"&&fx(i,o.plane,f.p)?"on-face":null}return d.length?{p:f.p,kind:g,hints:d}:{p:f.p,kind:g}}h(bn,"snapPoint");var ux=[{x:0,y:0,z:1},{x:0,y:1,z:0},{x:1,y:0,z:0}];function dx(i,e){let t=sr(i,ne(i,e));return{plane:t,basis:vi(t)}}h(dx,"mkAxisPlane");var Co=h(i=>ux.map(e=>dx(e,i)),"axisPlanesThrough");function Uc(i,e,t,n,s,r=30){let o=i.ray(n,s,e),a=Math.cos(r*Math.PI/180),l=[{axis:"x",dir:{x:1,y:0,z:0}},{axis:"y",dir:{x:0,y:1,z:0}},{axis:"z",dir:{x:0,y:0,z:1}}],c=i.dirCos(n,s,t,l.map(g=>g.dir),e),u=null;if(l.forEach(({axis:g,dir:m},y)=>{if(Math.abs(ne(m,o.dir))>.985)return;let p=c[y];p!==null&&p>=a&&(!u||p>u.c)&&(u={axis:g,dir:m,c:p})}),!u)return null;let f=u,d=bi(t,f.dir,o.origin,o.dir);return d?{axis:f.axis,p:d}:null}h(Uc,"inferAxisByDirection");function ar(i,e,t=6){return Math.abs(ne(i.plane.n,e.dir))<Math.sin(t*Math.PI/180)}h(ar,"grazing");function rr(i,e){let t=i.forward();if(Math.abs(t.z)>=.34){let n=e.find(s=>Math.abs(s.plane.n.z)>.999);if(n)return n}return e.reduce((n,s)=>Math.abs(ne(s.plane.n,t))>Math.abs(ne(n.plane.n,t))?s:n)}h(rr,"pickByFacing");function Qf(i){return rr(i,Co({x:0,y:0,z:0}))}h(Qf,"axisPlane");function Lo(i,e){return rr(i,Co(e))}h(Lo,"cameraPlane");function fx(i,e,t){if(e.face===void 0)return!1;let n=i.face(e.face);if(!n)return!1;let s={x:ne(t,e.basis.u),y:ne(t,e.basis.v)};return ft(s,n.outer.pts)?!n.holes.some(r=>ft(s,r.pts)):!1}h(fx,"insideFace");function px(i,e,t,n,s){let r=e.ray(n,s,t),o=null;for(let a of i.faces()){let l=i.planeOf(a.id);if(!l)continue;let c=ne(l.plane.n,r.dir);if(Math.abs(c)<1e-9)continue;let u=(l.plane.d-ne(l.plane.n,r.origin))/c;if(u<=0||o&&u>=o.t)continue;let f=Ue(r.origin,Re(r.dir,u)),d={x:ne(f,l.basis.u),y:ne(f,l.basis.v)};ft(d,a.outer.pts)&&(a.holes.some(g=>ft(d,g.pts))||(o={t:u,plane:{plane:l.plane,basis:l.basis,face:a.id}}))}return o?.plane??null}h(px,"faceUnderCursor");function mx(i,e,t,n,s,r,o){let a=null;for(let l of i.faces()){let c=i.planeOf(l.id);if(!c||Ot(r,c.plane)>.001)continue;let u=i.faceRings3(l.id)?.outer;if(!u||u.length<3)continue;let f=e.distToRing(n,s,u,t);f<=o&&(!a||f<a.d)&&(a={d:f,plane:{plane:c.plane,basis:c.basis,face:l.id}})}return a?.plane??null}h(mx,"nearFaceContaining");function Do(i,e,t,n,s,r,o){let{p1:a,facePlane:l,alignSources:c,hand:u,basePlane:f}=o;if(a){let m=px(i,e,t,n,s);if(m&&Ot(a,m.plane)<=.001){let _=bn(i,e,t,n,s,r,{plane:m,anchor:a,alignSources:c,hand:u});return{plane:m,fixed:!1,snap:_}}let y=mx(i,e,t,n,s,a,Io(e,t,r).planeNear);if(y){let _=bn(i,e,t,n,s,r,{plane:y,anchor:a,alignSources:c,hand:u});return{plane:y,fixed:!1,snap:_}}let p=Co(a),x=f??rr(e,p),S=bn(i,e,t,n,s,r,{plane:x,anchor:a,alignSources:c,hand:u});if(f&&Ot(S.p,f.plane)<=.001)return{plane:f,fixed:!1,snap:S};let M=p.filter(_=>Ot(S.p,_.plane)<=.001);return{plane:M.length?rr(e,M):x,fixed:!1,snap:S}}let d=l??Qf(e),g=bn(i,e,t,n,s,r,{plane:d,alignSources:c,hand:u});return g.kind===null||g.kind==="on-face"?{plane:d,fixed:!!l,snap:g}:{plane:rr(e,Co(g.p)),fixed:!1,snap:g}}h(Do,"resolvePlane");function Fo(i,e,t,n,s,r,o,a,l,c){let u=Do(i,e,t,s,r,o,{p1:n,alignSources:a,hand:l,basePlane:c});return{plane:u.plane,snap:u.snap}}h(Fo,"resolveRectPlane");var No=(()=>{let i=sr({x:0,y:0,z:1},0);return{plane:i,basis:vi(i)}})();function Hn(i,e,t,n,s,r){let o,a=r;for(let f of i.vertices()){let d={x:f.x,y:f.y,z:f.z},g=e.distTo(n,s,d,t);g<=a&&!or(i,e,d)&&(a=g,o=f.id)}if(o!==void 0)return{vertex:o};let l,c=r;for(let f of i.edges()){let d=i.graph.pt(f.a),g=i.graph.pt(f.b),{d:m,t:y}=e.distToSeg(n,s,d,g,t);if(m>c)continue;let p={x:d.x+y*(g.x-d.x),y:d.y+y*(g.y-d.y),z:d.z+y*(g.z-d.z)};or(i,e,p)||(c=m,l=f.id)}if(l!==void 0)return{edge:l};let u=vs(i,e,t,n,s);return u!==void 0?{face:u}:{}}h(Hn,"pickEntity");function vs(i,e,t,n,s){let r=e.ray(n,s,t),o,a=1/0;for(let l of i.faces()){let c=i.planeOf(l.id);if(!c)continue;let u=Vn(r.origin,r.dir,c.plane.n,c.plane.d);if(!u)continue;let f=Yt(u,c.basis);if(!ft(f,l.outer.pts)||l.holes.some(g=>ft(f,g.pts)))continue;let d=ne(Me(u,r.origin),r.dir);d<a&&(a=d,o=l.id)}return o}h(vs,"pickFace");function Oc(i,e,t,n,s){let r=Hn(i,e,t,n,s,0);if(r.face!==void 0){let o=i.planeOf(r.face);return{plane:o.plane,basis:o.basis,face:r.face}}return No}h(Oc,"drawPlaneAt");function Bc(i,e,t,n,s,r,o){let a=Hn(i,e,t,n,s,0),l=null;if(a.face!==void 0){let u=i.planeOf(a.face);l={plane:u.plane,basis:u.basis,face:a.face}}let c=Do(i,e,t,n,s,r,{facePlane:l,alignSources:o,hand:Nc});return{fixed:c.fixed?c.plane:null,plane:c.plane,snap:c.snap}}h(Bc,"rectFirstPlane");function ep(i,e,t,n){let s=h(o=>o.x>=n.minX&&o.x<=n.maxX&&o.y>=n.minY&&o.y<=n.maxY,"inBox"),r={edges:new Set,faces:new Set};for(let o of i.edges())s(e.angularPx(i.graph.pt(o.a),t))&&s(e.angularPx(i.graph.pt(o.b),t))&&r.edges.add(o.id);for(let o of i.faces()){let a=i.faceRings3(o.id);a&&a.outer.every(l=>s(e.angularPx(l,t)))&&r.faces.add(o.id)}return r}h(ep,"marqueeScreen");function zc(i,e,t,n){let s=Yt(t,e),r=Yt(n,e);if(Math.abs(s.x-r.x)<1e-9||Math.abs(s.y-r.y)<1e-9)return[];let o=h((f,d)=>Ff({x:f,y:d},i,e),"c"),a=o(s.x,s.y),l=o(r.x,s.y),c=o(r.x,r.y),u=o(s.x,r.y);return[[a,l],[l,c],[c,u],[u,a]]}h(zc,"rectSegmentsOnPlane");var wn=h(()=>({edges:new Set,faces:new Set}),"emptySelection");function kc(i,e){if(e.vertex!==void 0)return[e.vertex];if(e.edge!==void 0){let t=i.graph.edge(e.edge);return[t.a,t.b]}if(e.face!==void 0){let t=i.face(e.face);if(!t)return[];let n=new Set;for(let s of[t.outer,...t.holes])for(let r of s.edges){let o=i.graph.edge(r.edge);n.add(o.a),n.add(o.b)}return[...n]}return[]}h(kc,"moveTargets");function Vc(i,e,t){return e.filter(n=>i.graph.hasVertex(n)).map(n=>{let s=i.graph.pt(n);return{id:n,to:{x:s.x+t.x,y:s.y+t.y,z:s.z+(t.z??0)}}})}h(Vc,"translateMoves");function tp(i,e){let t=new Set;for(let n of e.edges){if(!i.graph.hasEdge(n))continue;let s=i.graph.edge(n);t.add(s.a),t.add(s.b)}for(let n of e.faces)for(let s of kc(i,{face:n}))t.add(s);return[...t]}h(tp,"moveTargetsSelection");var il="185";var Pp=0,bh=1,Rp=2;var Gr=1,Cp=2,qs=3,hi=0,nn=1,cn=2,Kn=0,ns=1,Sh=2,Mh=3,wh=4,Ip=5;var Li=100,Lp=101,Dp=102,Fp=103,Np=104,Up=200,Op=201,Bp=202,zp=203,la=204,ca=205,kp=206,Vp=207,Hp=208,Gp=209,Wp=210,Xp=211,qp=212,Yp=213,$p=214,ha=0,ua=1,da=2,is=3,fa=4,pa=5,ma=6,ga=7,Eh=0,Kp=1,Zp=2,Dn=0,Th=1,Ah=2,Ph=3,Rh=4,Ch=5,Ih=6,Lh=7;var Dh=300,ki=301,os=302,sl=303,rl=304,Wr=306,xa=1e3,Xn=1001,ya=1002,zt=1003,Jp=1004;var Xr=1005;var Vt=1006,ol=1007;var Vi=1008;var yn=1009,Fh=1010,Nh=1011,Ys=1012,al=1013,Fn=1014,Nn=1015,Zn=1016,ll=1017,cl=1018,$s=1020,Uh=35902,Oh=35899,Bh=1021,zh=1022,Mn=1023,qn=1026,Hi=1027,kh=1028,hl=1029,Gi=1030,ul=1031;var dl=1033,qr=33776,Yr=33777,$r=33778,Kr=33779,fl=35840,pl=35841,ml=35842,gl=35843,xl=36196,yl=37492,vl=37496,_l=37488,bl=37489,Zr=37490,Sl=37491,Ml=37808,wl=37809,El=37810,Tl=37811,Al=37812,Pl=37813,Rl=37814,Cl=37815,Il=37816,Ll=37817,Dl=37818,Fl=37819,Nl=37820,Ul=37821,Ol=36492,Bl=36494,zl=36495,kl=36283,Vl=36284,Jr=36285,Hl=36286;var xr=2300,va=2301,aa=2302,uh=2303,dh=2400,fh=2401,ph=2402;var jp=3200;var Vh=0,Qp=1,di="",Zt="srgb",yr="srgb-linear",vr="linear",et="srgb";var es=7680;var mh=519,em=512,tm=513,nm=514,Gl=515,im=516,sm=517,Wl=518,rm=519,_a=35044;var Hh="300 es",Rn=2e3,_r=2001;function gx(i){for(let e=i.length-1;e>=0;--e)if(i[e]>=65535)return!0;return!1}h(gx,"arrayNeedsUint32");function xx(i){return ArrayBuffer.isView(i)&&!(i instanceof DataView)}h(xx,"isTypedArray");function br(i){return document.createElementNS("http://www.w3.org/1999/xhtml",i)}h(br,"createElementNS");function om(){let i=br("canvas");return i.style.display="block",i}h(om,"createCanvasElement");var np={},Os=null;function Sr(...i){let e="THREE."+i.shift();Os?Os("log",e,...i):console.log(e,...i)}h(Sr,"log");function am(i){let e=i[0];if(typeof e=="string"&&e.startsWith("TSL:")){let t=i[1];t&&t.isStackTrace?i[0]+=" "+t.getLocation():i[1]='Stack trace not available. Enable "THREE.Node.captureStackTrace" to capture stack traces.'}return i}h(am,"enhanceLogMessage");function Ce(...i){i=am(i);let e="THREE."+i.shift();if(Os)Os("warn",e,...i);else{let t=i[0];t&&t.isStackTrace?console.warn(t.getError(e)):console.warn(e,...i)}}h(Ce,"warn");function Ne(...i){i=am(i);let e="THREE."+i.shift();if(Os)Os("error",e,...i);else{let t=i[0];t&&t.isStackTrace?console.error(t.getError(e)):console.error(e,...i)}}h(Ne,"error");function ts(...i){let e=i.join(" ");e in np||(np[e]=!0,Ce(...i))}h(ts,"warnOnce");function lm(i,e,t){return new Promise(function(n,s){function r(){switch(i.clientWaitSync(e,i.SYNC_FLUSH_COMMANDS_BIT,0)){case i.WAIT_FAILED:s();break;case i.TIMEOUT_EXPIRED:setTimeout(r,t);break;default:n()}}h(r,"probe"),setTimeout(r,t)})}h(lm,"probeAsync");var cm={[ha]:ua,[da]:ma,[fa]:ga,[is]:pa,[ua]:ha,[ma]:da,[ga]:fa,[pa]:is},Kh=class Kh{addEventListener(e,t){this._listeners===void 0&&(this._listeners={});let n=this._listeners;n[e]===void 0&&(n[e]=[]),n[e].indexOf(t)===-1&&n[e].push(t)}hasEventListener(e,t){let n=this._listeners;return n===void 0?!1:n[e]!==void 0&&n[e].indexOf(t)!==-1}removeEventListener(e,t){let n=this._listeners;if(n===void 0)return;let s=n[e];if(s!==void 0){let r=s.indexOf(t);r!==-1&&s.splice(r,1)}}dispatchEvent(e){let t=this._listeners;if(t===void 0)return;let n=t[e.type];if(n!==void 0){e.target=this;let s=n.slice(0);for(let r=0,o=s.length;r<o;r++)s[r].call(this,e);e.target=null}}};h(Kh,"EventDispatcher");var Yn=Kh,$t=["00","01","02","03","04","05","06","07","08","09","0a","0b","0c","0d","0e","0f","10","11","12","13","14","15","16","17","18","19","1a","1b","1c","1d","1e","1f","20","21","22","23","24","25","26","27","28","29","2a","2b","2c","2d","2e","2f","30","31","32","33","34","35","36","37","38","39","3a","3b","3c","3d","3e","3f","40","41","42","43","44","45","46","47","48","49","4a","4b","4c","4d","4e","4f","50","51","52","53","54","55","56","57","58","59","5a","5b","5c","5d","5e","5f","60","61","62","63","64","65","66","67","68","69","6a","6b","6c","6d","6e","6f","70","71","72","73","74","75","76","77","78","79","7a","7b","7c","7d","7e","7f","80","81","82","83","84","85","86","87","88","89","8a","8b","8c","8d","8e","8f","90","91","92","93","94","95","96","97","98","99","9a","9b","9c","9d","9e","9f","a0","a1","a2","a3","a4","a5","a6","a7","a8","a9","aa","ab","ac","ad","ae","af","b0","b1","b2","b3","b4","b5","b6","b7","b8","b9","ba","bb","bc","bd","be","bf","c0","c1","c2","c3","c4","c5","c6","c7","c8","c9","ca","cb","cc","cd","ce","cf","d0","d1","d2","d3","d4","d5","d6","d7","d8","d9","da","db","dc","dd","de","df","e0","e1","e2","e3","e4","e5","e6","e7","e8","e9","ea","eb","ec","ed","ee","ef","f0","f1","f2","f3","f4","f5","f6","f7","f8","f9","fa","fb","fc","fd","fe","ff"],ip=1234567,pr=Math.PI/180,Bs=180/Math.PI;function li(){let i=Math.random()*4294967295|0,e=Math.random()*4294967295|0,t=Math.random()*4294967295|0,n=Math.random()*4294967295|0;return($t[i&255]+$t[i>>8&255]+$t[i>>16&255]+$t[i>>24&255]+"-"+$t[e&255]+$t[e>>8&255]+"-"+$t[e>>16&15|64]+$t[e>>24&255]+"-"+$t[t&63|128]+$t[t>>8&255]+"-"+$t[t>>16&255]+$t[t>>24&255]+$t[n&255]+$t[n>>8&255]+$t[n>>16&255]+$t[n>>24&255]).toLowerCase()}h(li,"generateUUID");function Ve(i,e,t){return Math.max(e,Math.min(t,i))}h(Ve,"clamp");function Gh(i,e){return(i%e+e)%e}h(Gh,"euclideanModulo");function yx(i,e,t,n,s){return n+(i-e)*(s-n)/(t-e)}h(yx,"mapLinear");function vx(i,e,t){return i!==e?(t-i)/(e-i):0}h(vx,"inverseLerp");function mr(i,e,t){return(1-t)*i+t*e}h(mr,"lerp");function _x(i,e,t,n){return mr(i,e,1-Math.exp(-t*n))}h(_x,"damp");function bx(i,e=1){return e-Math.abs(Gh(i,e*2)-e)}h(bx,"pingpong");function Sx(i,e,t){return i<=e?0:i>=t?1:(i=(i-e)/(t-e),i*i*(3-2*i))}h(Sx,"smoothstep");function Mx(i,e,t){return i<=e?0:i>=t?1:(i=(i-e)/(t-e),i*i*i*(i*(i*6-15)+10))}h(Mx,"smootherstep");function wx(i,e){return i+Math.floor(Math.random()*(e-i+1))}h(wx,"randInt");function Ex(i,e){return i+Math.random()*(e-i)}h(Ex,"randFloat");function Tx(i){return i*(.5-Math.random())}h(Tx,"randFloatSpread");function Ax(i){i!==void 0&&(ip=i);let e=ip+=1831565813;return e=Math.imul(e^e>>>15,e|1),e^=e+Math.imul(e^e>>>7,e|61),((e^e>>>14)>>>0)/4294967296}h(Ax,"seededRandom");function Px(i){return i*pr}h(Px,"degToRad");function Rx(i){return i*Bs}h(Rx,"radToDeg");function Cx(i){return(i&i-1)===0&&i!==0}h(Cx,"isPowerOfTwo");function Ix(i){return Math.pow(2,Math.ceil(Math.log(i)/Math.LN2))}h(Ix,"ceilPowerOfTwo");function Lx(i){return Math.pow(2,Math.floor(Math.log(i)/Math.LN2))}h(Lx,"floorPowerOfTwo");function Dx(i,e,t,n,s){let r=Math.cos,o=Math.sin,a=r(t/2),l=o(t/2),c=r((e+n)/2),u=o((e+n)/2),f=r((e-n)/2),d=o((e-n)/2),g=r((n-e)/2),m=o((n-e)/2);switch(s){case"XYX":i.set(a*u,l*f,l*d,a*c);break;case"YZY":i.set(l*d,a*u,l*f,a*c);break;case"ZXZ":i.set(l*f,l*d,a*u,a*c);break;case"XZX":i.set(a*u,l*m,l*g,a*c);break;case"YXY":i.set(l*g,a*u,l*m,a*c);break;case"ZYZ":i.set(l*m,l*g,a*u,a*c);break;default:Ce("MathUtils: .setQuaternionFromProperEuler() encountered an unknown order: "+s)}}h(Dx,"setQuaternionFromProperEuler");function Pn(i,e){switch(e.constructor){case Float32Array:return i;case Uint32Array:return i/4294967295;case Uint16Array:return i/65535;case Uint8Array:return i/255;case Int32Array:return Math.max(i/2147483647,-1);case Int16Array:return Math.max(i/32767,-1);case Int8Array:return Math.max(i/127,-1);default:throw new Error("THREE.MathUtils: Invalid component type.")}}h(Pn,"denormalize");function it(i,e){switch(e.constructor){case Float32Array:return i;case Uint32Array:return Math.round(i*4294967295);case Uint16Array:return Math.round(i*65535);case Uint8Array:return Math.round(i*255);case Int32Array:return Math.round(i*2147483647);case Int16Array:return Math.round(i*32767);case Int8Array:return Math.round(i*127);default:throw new Error("THREE.MathUtils: Invalid component type.")}}h(it,"normalize");var Wh={DEG2RAD:pr,RAD2DEG:Bs,generateUUID:li,clamp:Ve,euclideanModulo:Gh,mapLinear:yx,inverseLerp:vx,lerp:mr,damp:_x,pingpong:bx,smoothstep:Sx,smootherstep:Mx,randInt:wx,randFloat:Ex,randFloatSpread:Tx,seededRandom:Ax,degToRad:Px,radToDeg:Rx,isPowerOfTwo:Cx,ceilPowerOfTwo:Ix,floorPowerOfTwo:Lx,setQuaternionFromProperEuler:Dx,normalize:it,denormalize:Pn},Wa=class Wa{constructor(e=0,t=0){this.x=e,this.y=t}get width(){return this.x}set width(e){this.x=e}get height(){return this.y}set height(e){this.y=e}set(e,t){return this.x=e,this.y=t,this}setScalar(e){return this.x=e,this.y=e,this}setX(e){return this.x=e,this}setY(e){return this.y=e,this}setComponent(e,t){switch(e){case 0:this.x=t;break;case 1:this.y=t;break;default:throw new Error("THREE.Vector2: index is out of range: "+e)}return this}getComponent(e){switch(e){case 0:return this.x;case 1:return this.y;default:throw new Error("THREE.Vector2: index is out of range: "+e)}}clone(){return new this.constructor(this.x,this.y)}copy(e){return this.x=e.x,this.y=e.y,this}add(e){return this.x+=e.x,this.y+=e.y,this}addScalar(e){return this.x+=e,this.y+=e,this}addVectors(e,t){return this.x=e.x+t.x,this.y=e.y+t.y,this}addScaledVector(e,t){return this.x+=e.x*t,this.y+=e.y*t,this}sub(e){return this.x-=e.x,this.y-=e.y,this}subScalar(e){return this.x-=e,this.y-=e,this}subVectors(e,t){return this.x=e.x-t.x,this.y=e.y-t.y,this}multiply(e){return this.x*=e.x,this.y*=e.y,this}multiplyScalar(e){return this.x*=e,this.y*=e,this}divide(e){return this.x/=e.x,this.y/=e.y,this}divideScalar(e){return this.multiplyScalar(1/e)}applyMatrix3(e){let t=this.x,n=this.y,s=e.elements;return this.x=s[0]*t+s[3]*n+s[6],this.y=s[1]*t+s[4]*n+s[7],this}min(e){return this.x=Math.min(this.x,e.x),this.y=Math.min(this.y,e.y),this}max(e){return this.x=Math.max(this.x,e.x),this.y=Math.max(this.y,e.y),this}clamp(e,t){return this.x=Ve(this.x,e.x,t.x),this.y=Ve(this.y,e.y,t.y),this}clampScalar(e,t){return this.x=Ve(this.x,e,t),this.y=Ve(this.y,e,t),this}clampLength(e,t){let n=this.length();return this.divideScalar(n||1).multiplyScalar(Ve(n,e,t))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this}negate(){return this.x=-this.x,this.y=-this.y,this}dot(e){return this.x*e.x+this.y*e.y}cross(e){return this.x*e.y-this.y*e.x}lengthSq(){return this.x*this.x+this.y*this.y}length(){return Math.sqrt(this.x*this.x+this.y*this.y)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)}normalize(){return this.divideScalar(this.length()||1)}angle(){return Math.atan2(-this.y,-this.x)+Math.PI}angleTo(e){let t=Math.sqrt(this.lengthSq()*e.lengthSq());if(t===0)return Math.PI/2;let n=this.dot(e)/t;return Math.acos(Ve(n,-1,1))}distanceTo(e){return Math.sqrt(this.distanceToSquared(e))}distanceToSquared(e){let t=this.x-e.x,n=this.y-e.y;return t*t+n*n}manhattanDistanceTo(e){return Math.abs(this.x-e.x)+Math.abs(this.y-e.y)}setLength(e){return this.normalize().multiplyScalar(e)}lerp(e,t){return this.x+=(e.x-this.x)*t,this.y+=(e.y-this.y)*t,this}lerpVectors(e,t,n){return this.x=e.x+(t.x-e.x)*n,this.y=e.y+(t.y-e.y)*n,this}equals(e){return e.x===this.x&&e.y===this.y}fromArray(e,t=0){return this.x=e[t],this.y=e[t+1],this}toArray(e=[],t=0){return e[t]=this.x,e[t+1]=this.y,e}fromBufferAttribute(e,t){return this.x=e.getX(t),this.y=e.getY(t),this}rotateAround(e,t){let n=Math.cos(t),s=Math.sin(t),r=this.x-e.x,o=this.y-e.y;return this.x=r*n-o*s+e.x,this.y=r*s+o*n+e.y,this}random(){return this.x=Math.random(),this.y=Math.random(),this}*[Symbol.iterator](){yield this.x,yield this.y}};h(Wa,"Vector2"),Wa.prototype.isVector2=!0;var We=Wa,Zh=class Zh{constructor(e=0,t=0,n=0,s=1){this.isQuaternion=!0,this._x=e,this._y=t,this._z=n,this._w=s}static slerpFlat(e,t,n,s,r,o,a){let l=n[s+0],c=n[s+1],u=n[s+2],f=n[s+3],d=r[o+0],g=r[o+1],m=r[o+2],y=r[o+3];if(f!==y||l!==d||c!==g||u!==m){let p=l*d+c*g+u*m+f*y;p<0&&(d=-d,g=-g,m=-m,y=-y,p=-p);let x=1-a;if(p<.9995){let S=Math.acos(p),M=Math.sin(S);x=Math.sin(x*S)/M,a=Math.sin(a*S)/M,l=l*x+d*a,c=c*x+g*a,u=u*x+m*a,f=f*x+y*a}else{l=l*x+d*a,c=c*x+g*a,u=u*x+m*a,f=f*x+y*a;let S=1/Math.sqrt(l*l+c*c+u*u+f*f);l*=S,c*=S,u*=S,f*=S}}e[t]=l,e[t+1]=c,e[t+2]=u,e[t+3]=f}static multiplyQuaternionsFlat(e,t,n,s,r,o){let a=n[s],l=n[s+1],c=n[s+2],u=n[s+3],f=r[o],d=r[o+1],g=r[o+2],m=r[o+3];return e[t]=a*m+u*f+l*g-c*d,e[t+1]=l*m+u*d+c*f-a*g,e[t+2]=c*m+u*g+a*d-l*f,e[t+3]=u*m-a*f-l*d-c*g,e}get x(){return this._x}set x(e){this._x=e,this._onChangeCallback()}get y(){return this._y}set y(e){this._y=e,this._onChangeCallback()}get z(){return this._z}set z(e){this._z=e,this._onChangeCallback()}get w(){return this._w}set w(e){this._w=e,this._onChangeCallback()}set(e,t,n,s){return this._x=e,this._y=t,this._z=n,this._w=s,this._onChangeCallback(),this}clone(){return new this.constructor(this._x,this._y,this._z,this._w)}copy(e){return this._x=e.x,this._y=e.y,this._z=e.z,this._w=e.w,this._onChangeCallback(),this}setFromEuler(e,t=!0){let n=e._x,s=e._y,r=e._z,o=e._order,a=Math.cos,l=Math.sin,c=a(n/2),u=a(s/2),f=a(r/2),d=l(n/2),g=l(s/2),m=l(r/2);switch(o){case"XYZ":this._x=d*u*f+c*g*m,this._y=c*g*f-d*u*m,this._z=c*u*m+d*g*f,this._w=c*u*f-d*g*m;break;case"YXZ":this._x=d*u*f+c*g*m,this._y=c*g*f-d*u*m,this._z=c*u*m-d*g*f,this._w=c*u*f+d*g*m;break;case"ZXY":this._x=d*u*f-c*g*m,this._y=c*g*f+d*u*m,this._z=c*u*m+d*g*f,this._w=c*u*f-d*g*m;break;case"ZYX":this._x=d*u*f-c*g*m,this._y=c*g*f+d*u*m,this._z=c*u*m-d*g*f,this._w=c*u*f+d*g*m;break;case"YZX":this._x=d*u*f+c*g*m,this._y=c*g*f+d*u*m,this._z=c*u*m-d*g*f,this._w=c*u*f-d*g*m;break;case"XZY":this._x=d*u*f-c*g*m,this._y=c*g*f-d*u*m,this._z=c*u*m+d*g*f,this._w=c*u*f+d*g*m;break;default:Ce("Quaternion: .setFromEuler() encountered an unknown order: "+o)}return t===!0&&this._onChangeCallback(),this}setFromAxisAngle(e,t){let n=t/2,s=Math.sin(n);return this._x=e.x*s,this._y=e.y*s,this._z=e.z*s,this._w=Math.cos(n),this._onChangeCallback(),this}setFromRotationMatrix(e){let t=e.elements,n=t[0],s=t[4],r=t[8],o=t[1],a=t[5],l=t[9],c=t[2],u=t[6],f=t[10],d=n+a+f;if(d>0){let g=.5/Math.sqrt(d+1);this._w=.25/g,this._x=(u-l)*g,this._y=(r-c)*g,this._z=(o-s)*g}else if(n>a&&n>f){let g=2*Math.sqrt(1+n-a-f);this._w=(u-l)/g,this._x=.25*g,this._y=(s+o)/g,this._z=(r+c)/g}else if(a>f){let g=2*Math.sqrt(1+a-n-f);this._w=(r-c)/g,this._x=(s+o)/g,this._y=.25*g,this._z=(l+u)/g}else{let g=2*Math.sqrt(1+f-n-a);this._w=(o-s)/g,this._x=(r+c)/g,this._y=(l+u)/g,this._z=.25*g}return this._onChangeCallback(),this}setFromUnitVectors(e,t){let n=e.dot(t)+1;return n<1e-8?(n=0,Math.abs(e.x)>Math.abs(e.z)?(this._x=-e.y,this._y=e.x,this._z=0,this._w=n):(this._x=0,this._y=-e.z,this._z=e.y,this._w=n)):(this._x=e.y*t.z-e.z*t.y,this._y=e.z*t.x-e.x*t.z,this._z=e.x*t.y-e.y*t.x,this._w=n),this.normalize()}angleTo(e){return 2*Math.acos(Math.abs(Ve(this.dot(e),-1,1)))}rotateTowards(e,t){let n=this.angleTo(e);if(n===0)return this;let s=Math.min(1,t/n);return this.slerp(e,s),this}identity(){return this.set(0,0,0,1)}invert(){return this.conjugate()}conjugate(){return this._x*=-1,this._y*=-1,this._z*=-1,this._onChangeCallback(),this}dot(e){return this._x*e._x+this._y*e._y+this._z*e._z+this._w*e._w}lengthSq(){return this._x*this._x+this._y*this._y+this._z*this._z+this._w*this._w}length(){return Math.sqrt(this._x*this._x+this._y*this._y+this._z*this._z+this._w*this._w)}normalize(){let e=this.length();return e===0?(this._x=0,this._y=0,this._z=0,this._w=1):(e=1/e,this._x=this._x*e,this._y=this._y*e,this._z=this._z*e,this._w=this._w*e),this._onChangeCallback(),this}multiply(e){return this.multiplyQuaternions(this,e)}premultiply(e){return this.multiplyQuaternions(e,this)}multiplyQuaternions(e,t){let n=e._x,s=e._y,r=e._z,o=e._w,a=t._x,l=t._y,c=t._z,u=t._w;return this._x=n*u+o*a+s*c-r*l,this._y=s*u+o*l+r*a-n*c,this._z=r*u+o*c+n*l-s*a,this._w=o*u-n*a-s*l-r*c,this._onChangeCallback(),this}slerp(e,t){let n=e._x,s=e._y,r=e._z,o=e._w,a=this.dot(e);a<0&&(n=-n,s=-s,r=-r,o=-o,a=-a);let l=1-t;if(a<.9995){let c=Math.acos(a),u=Math.sin(c);l=Math.sin(l*c)/u,t=Math.sin(t*c)/u,this._x=this._x*l+n*t,this._y=this._y*l+s*t,this._z=this._z*l+r*t,this._w=this._w*l+o*t,this._onChangeCallback()}else this._x=this._x*l+n*t,this._y=this._y*l+s*t,this._z=this._z*l+r*t,this._w=this._w*l+o*t,this.normalize();return this}slerpQuaternions(e,t,n){return this.copy(e).slerp(t,n)}random(){let e=2*Math.PI*Math.random(),t=2*Math.PI*Math.random(),n=Math.random(),s=Math.sqrt(1-n),r=Math.sqrt(n);return this.set(s*Math.sin(e),s*Math.cos(e),r*Math.sin(t),r*Math.cos(t))}equals(e){return e._x===this._x&&e._y===this._y&&e._z===this._z&&e._w===this._w}fromArray(e,t=0){return this._x=e[t],this._y=e[t+1],this._z=e[t+2],this._w=e[t+3],this._onChangeCallback(),this}toArray(e=[],t=0){return e[t]=this._x,e[t+1]=this._y,e[t+2]=this._z,e[t+3]=this._w,e}fromBufferAttribute(e,t){return this._x=e.getX(t),this._y=e.getY(t),this._z=e.getZ(t),this._w=e.getW(t),this._onChangeCallback(),this}toJSON(){return this.toArray()}_onChange(e){return this._onChangeCallback=e,this}_onChangeCallback(){}*[Symbol.iterator](){yield this._x,yield this._y,yield this._z,yield this._w}};h(Zh,"Quaternion");var $n=Zh,Xa=class Xa{constructor(e=0,t=0,n=0){this.x=e,this.y=t,this.z=n}set(e,t,n){return n===void 0&&(n=this.z),this.x=e,this.y=t,this.z=n,this}setScalar(e){return this.x=e,this.y=e,this.z=e,this}setX(e){return this.x=e,this}setY(e){return this.y=e,this}setZ(e){return this.z=e,this}setComponent(e,t){switch(e){case 0:this.x=t;break;case 1:this.y=t;break;case 2:this.z=t;break;default:throw new Error("THREE.Vector3: index is out of range: "+e)}return this}getComponent(e){switch(e){case 0:return this.x;case 1:return this.y;case 2:return this.z;default:throw new Error("THREE.Vector3: index is out of range: "+e)}}clone(){return new this.constructor(this.x,this.y,this.z)}copy(e){return this.x=e.x,this.y=e.y,this.z=e.z,this}add(e){return this.x+=e.x,this.y+=e.y,this.z+=e.z,this}addScalar(e){return this.x+=e,this.y+=e,this.z+=e,this}addVectors(e,t){return this.x=e.x+t.x,this.y=e.y+t.y,this.z=e.z+t.z,this}addScaledVector(e,t){return this.x+=e.x*t,this.y+=e.y*t,this.z+=e.z*t,this}sub(e){return this.x-=e.x,this.y-=e.y,this.z-=e.z,this}subScalar(e){return this.x-=e,this.y-=e,this.z-=e,this}subVectors(e,t){return this.x=e.x-t.x,this.y=e.y-t.y,this.z=e.z-t.z,this}multiply(e){return this.x*=e.x,this.y*=e.y,this.z*=e.z,this}multiplyScalar(e){return this.x*=e,this.y*=e,this.z*=e,this}multiplyVectors(e,t){return this.x=e.x*t.x,this.y=e.y*t.y,this.z=e.z*t.z,this}applyEuler(e){return this.applyQuaternion(sp.setFromEuler(e))}applyAxisAngle(e,t){return this.applyQuaternion(sp.setFromAxisAngle(e,t))}applyMatrix3(e){let t=this.x,n=this.y,s=this.z,r=e.elements;return this.x=r[0]*t+r[3]*n+r[6]*s,this.y=r[1]*t+r[4]*n+r[7]*s,this.z=r[2]*t+r[5]*n+r[8]*s,this}applyNormalMatrix(e){return this.applyMatrix3(e).normalize()}applyMatrix4(e){let t=this.x,n=this.y,s=this.z,r=e.elements,o=1/(r[3]*t+r[7]*n+r[11]*s+r[15]);return this.x=(r[0]*t+r[4]*n+r[8]*s+r[12])*o,this.y=(r[1]*t+r[5]*n+r[9]*s+r[13])*o,this.z=(r[2]*t+r[6]*n+r[10]*s+r[14])*o,this}applyQuaternion(e){let t=this.x,n=this.y,s=this.z,r=e.x,o=e.y,a=e.z,l=e.w,c=2*(o*s-a*n),u=2*(a*t-r*s),f=2*(r*n-o*t);return this.x=t+l*c+o*f-a*u,this.y=n+l*u+a*c-r*f,this.z=s+l*f+r*u-o*c,this}project(e){return this.applyMatrix4(e.matrixWorldInverse).applyMatrix4(e.projectionMatrix)}unproject(e){return this.applyMatrix4(e.projectionMatrixInverse).applyMatrix4(e.matrixWorld)}transformDirection(e){let t=this.x,n=this.y,s=this.z,r=e.elements;return this.x=r[0]*t+r[4]*n+r[8]*s,this.y=r[1]*t+r[5]*n+r[9]*s,this.z=r[2]*t+r[6]*n+r[10]*s,this.normalize()}divide(e){return this.x/=e.x,this.y/=e.y,this.z/=e.z,this}divideScalar(e){return this.multiplyScalar(1/e)}min(e){return this.x=Math.min(this.x,e.x),this.y=Math.min(this.y,e.y),this.z=Math.min(this.z,e.z),this}max(e){return this.x=Math.max(this.x,e.x),this.y=Math.max(this.y,e.y),this.z=Math.max(this.z,e.z),this}clamp(e,t){return this.x=Ve(this.x,e.x,t.x),this.y=Ve(this.y,e.y,t.y),this.z=Ve(this.z,e.z,t.z),this}clampScalar(e,t){return this.x=Ve(this.x,e,t),this.y=Ve(this.y,e,t),this.z=Ve(this.z,e,t),this}clampLength(e,t){let n=this.length();return this.divideScalar(n||1).multiplyScalar(Ve(n,e,t))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this.z=Math.floor(this.z),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this.z=Math.ceil(this.z),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this.z=Math.round(this.z),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this.z=Math.trunc(this.z),this}negate(){return this.x=-this.x,this.y=-this.y,this.z=-this.z,this}dot(e){return this.x*e.x+this.y*e.y+this.z*e.z}lengthSq(){return this.x*this.x+this.y*this.y+this.z*this.z}length(){return Math.sqrt(this.x*this.x+this.y*this.y+this.z*this.z)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)+Math.abs(this.z)}normalize(){return this.divideScalar(this.length()||1)}setLength(e){return this.normalize().multiplyScalar(e)}lerp(e,t){return this.x+=(e.x-this.x)*t,this.y+=(e.y-this.y)*t,this.z+=(e.z-this.z)*t,this}lerpVectors(e,t,n){return this.x=e.x+(t.x-e.x)*n,this.y=e.y+(t.y-e.y)*n,this.z=e.z+(t.z-e.z)*n,this}cross(e){return this.crossVectors(this,e)}crossVectors(e,t){let n=e.x,s=e.y,r=e.z,o=t.x,a=t.y,l=t.z;return this.x=s*l-r*a,this.y=r*o-n*l,this.z=n*a-s*o,this}projectOnVector(e){let t=e.lengthSq();if(t===0)return this.set(0,0,0);let n=e.dot(this)/t;return this.copy(e).multiplyScalar(n)}projectOnPlane(e){return Hc.copy(this).projectOnVector(e),this.sub(Hc)}reflect(e){return this.sub(Hc.copy(e).multiplyScalar(2*this.dot(e)))}angleTo(e){let t=Math.sqrt(this.lengthSq()*e.lengthSq());if(t===0)return Math.PI/2;let n=this.dot(e)/t;return Math.acos(Ve(n,-1,1))}distanceTo(e){return Math.sqrt(this.distanceToSquared(e))}distanceToSquared(e){let t=this.x-e.x,n=this.y-e.y,s=this.z-e.z;return t*t+n*n+s*s}manhattanDistanceTo(e){return Math.abs(this.x-e.x)+Math.abs(this.y-e.y)+Math.abs(this.z-e.z)}setFromSpherical(e){return this.setFromSphericalCoords(e.radius,e.phi,e.theta)}setFromSphericalCoords(e,t,n){let s=Math.sin(t)*e;return this.x=s*Math.sin(n),this.y=Math.cos(t)*e,this.z=s*Math.cos(n),this}setFromCylindrical(e){return this.setFromCylindricalCoords(e.radius,e.theta,e.y)}setFromCylindricalCoords(e,t,n){return this.x=e*Math.sin(t),this.y=n,this.z=e*Math.cos(t),this}setFromMatrixPosition(e){let t=e.elements;return this.x=t[12],this.y=t[13],this.z=t[14],this}setFromMatrixScale(e){let t=this.setFromMatrixColumn(e,0).length(),n=this.setFromMatrixColumn(e,1).length(),s=this.setFromMatrixColumn(e,2).length();return this.x=t,this.y=n,this.z=s,this}setFromMatrixColumn(e,t){return this.fromArray(e.elements,t*4)}setFromMatrix3Column(e,t){return this.fromArray(e.elements,t*3)}setFromEuler(e){return this.x=e._x,this.y=e._y,this.z=e._z,this}setFromColor(e){return this.x=e.r,this.y=e.g,this.z=e.b,this}equals(e){return e.x===this.x&&e.y===this.y&&e.z===this.z}fromArray(e,t=0){return this.x=e[t],this.y=e[t+1],this.z=e[t+2],this}toArray(e=[],t=0){return e[t]=this.x,e[t+1]=this.y,e[t+2]=this.z,e}fromBufferAttribute(e,t){return this.x=e.getX(t),this.y=e.getY(t),this.z=e.getZ(t),this}random(){return this.x=Math.random(),this.y=Math.random(),this.z=Math.random(),this}randomDirection(){let e=Math.random()*Math.PI*2,t=Math.random()*2-1,n=Math.sqrt(1-t*t);return this.x=n*Math.cos(e),this.y=t,this.z=n*Math.sin(e),this}*[Symbol.iterator](){yield this.x,yield this.y,yield this.z}};h(Xa,"Vector3"),Xa.prototype.isVector3=!0;var O=Xa,Hc=new O,sp=new $n,qa=class qa{constructor(e,t,n,s,r,o,a,l,c){this.elements=[1,0,0,0,1,0,0,0,1],e!==void 0&&this.set(e,t,n,s,r,o,a,l,c)}set(e,t,n,s,r,o,a,l,c){let u=this.elements;return u[0]=e,u[1]=s,u[2]=a,u[3]=t,u[4]=r,u[5]=l,u[6]=n,u[7]=o,u[8]=c,this}identity(){return this.set(1,0,0,0,1,0,0,0,1),this}copy(e){let t=this.elements,n=e.elements;return t[0]=n[0],t[1]=n[1],t[2]=n[2],t[3]=n[3],t[4]=n[4],t[5]=n[5],t[6]=n[6],t[7]=n[7],t[8]=n[8],this}extractBasis(e,t,n){return e.setFromMatrix3Column(this,0),t.setFromMatrix3Column(this,1),n.setFromMatrix3Column(this,2),this}setFromMatrix4(e){let t=e.elements;return this.set(t[0],t[4],t[8],t[1],t[5],t[9],t[2],t[6],t[10]),this}multiply(e){return this.multiplyMatrices(this,e)}premultiply(e){return this.multiplyMatrices(e,this)}multiplyMatrices(e,t){let n=e.elements,s=t.elements,r=this.elements,o=n[0],a=n[3],l=n[6],c=n[1],u=n[4],f=n[7],d=n[2],g=n[5],m=n[8],y=s[0],p=s[3],x=s[6],S=s[1],M=s[4],_=s[7],A=s[2],w=s[5],T=s[8];return r[0]=o*y+a*S+l*A,r[3]=o*p+a*M+l*w,r[6]=o*x+a*_+l*T,r[1]=c*y+u*S+f*A,r[4]=c*p+u*M+f*w,r[7]=c*x+u*_+f*T,r[2]=d*y+g*S+m*A,r[5]=d*p+g*M+m*w,r[8]=d*x+g*_+m*T,this}multiplyScalar(e){let t=this.elements;return t[0]*=e,t[3]*=e,t[6]*=e,t[1]*=e,t[4]*=e,t[7]*=e,t[2]*=e,t[5]*=e,t[8]*=e,this}determinant(){let e=this.elements,t=e[0],n=e[1],s=e[2],r=e[3],o=e[4],a=e[5],l=e[6],c=e[7],u=e[8];return t*o*u-t*a*c-n*r*u+n*a*l+s*r*c-s*o*l}invert(){let e=this.elements,t=e[0],n=e[1],s=e[2],r=e[3],o=e[4],a=e[5],l=e[6],c=e[7],u=e[8],f=u*o-a*c,d=a*l-u*r,g=c*r-o*l,m=t*f+n*d+s*g;if(m===0)return this.set(0,0,0,0,0,0,0,0,0);let y=1/m;return e[0]=f*y,e[1]=(s*c-u*n)*y,e[2]=(a*n-s*o)*y,e[3]=d*y,e[4]=(u*t-s*l)*y,e[5]=(s*r-a*t)*y,e[6]=g*y,e[7]=(n*l-c*t)*y,e[8]=(o*t-n*r)*y,this}transpose(){let e,t=this.elements;return e=t[1],t[1]=t[3],t[3]=e,e=t[2],t[2]=t[6],t[6]=e,e=t[5],t[5]=t[7],t[7]=e,this}getNormalMatrix(e){return this.setFromMatrix4(e).invert().transpose()}transposeIntoArray(e){let t=this.elements;return e[0]=t[0],e[1]=t[3],e[2]=t[6],e[3]=t[1],e[4]=t[4],e[5]=t[7],e[6]=t[2],e[7]=t[5],e[8]=t[8],this}setUvTransform(e,t,n,s,r,o,a){let l=Math.cos(r),c=Math.sin(r);return this.set(n*l,n*c,-n*(l*o+c*a)+o+e,-s*c,s*l,-s*(-c*o+l*a)+a+t,0,0,1),this}scale(e,t){return ts("Matrix3: .scale() is deprecated. Use .makeScale() instead."),this.premultiply(Gc.makeScale(e,t)),this}rotate(e){return ts("Matrix3: .rotate() is deprecated. Use .makeRotation() instead."),this.premultiply(Gc.makeRotation(-e)),this}translate(e,t){return ts("Matrix3: .translate() is deprecated. Use .makeTranslation() instead."),this.premultiply(Gc.makeTranslation(e,t)),this}makeTranslation(e,t){return e.isVector2?this.set(1,0,e.x,0,1,e.y,0,0,1):this.set(1,0,e,0,1,t,0,0,1),this}makeRotation(e){let t=Math.cos(e),n=Math.sin(e);return this.set(t,-n,0,n,t,0,0,0,1),this}makeScale(e,t){return this.set(e,0,0,0,t,0,0,0,1),this}equals(e){let t=this.elements,n=e.elements;for(let s=0;s<9;s++)if(t[s]!==n[s])return!1;return!0}fromArray(e,t=0){for(let n=0;n<9;n++)this.elements[n]=e[n+t];return this}toArray(e=[],t=0){let n=this.elements;return e[t]=n[0],e[t+1]=n[1],e[t+2]=n[2],e[t+3]=n[3],e[t+4]=n[4],e[t+5]=n[5],e[t+6]=n[6],e[t+7]=n[7],e[t+8]=n[8],e}clone(){return new this.constructor().fromArray(this.elements)}};h(qa,"Matrix3"),qa.prototype.isMatrix3=!0;var Oe=qa,Gc=new Oe,rp=new Oe().set(.4123908,.3575843,.1804808,.212639,.7151687,.0721923,.0193308,.1191948,.9505322),op=new Oe().set(3.2409699,-1.5373832,-.4986108,-.9692436,1.8759675,.0415551,.0556301,-.203977,1.0569715);function Fx(){let i={enabled:!0,workingColorSpace:yr,spaces:{},convert:h(function(s,r,o){return this.enabled===!1||r===o||!r||!o||(this.spaces[r].transfer===et&&(s.r=ci(s.r),s.g=ci(s.g),s.b=ci(s.b)),this.spaces[r].primaries!==this.spaces[o].primaries&&(s.applyMatrix3(this.spaces[r].toXYZ),s.applyMatrix3(this.spaces[o].fromXYZ)),this.spaces[o].transfer===et&&(s.r=Us(s.r),s.g=Us(s.g),s.b=Us(s.b))),s},"convert"),workingToColorSpace:h(function(s,r){return this.convert(s,this.workingColorSpace,r)},"workingToColorSpace"),colorSpaceToWorking:h(function(s,r){return this.convert(s,r,this.workingColorSpace)},"colorSpaceToWorking"),getPrimaries:h(function(s){return this.spaces[s].primaries},"getPrimaries"),getTransfer:h(function(s){return s===di?vr:this.spaces[s].transfer},"getTransfer"),getToneMappingMode:h(function(s){return this.spaces[s].outputColorSpaceConfig.toneMappingMode||"standard"},"getToneMappingMode"),getLuminanceCoefficients:h(function(s,r=this.workingColorSpace){return s.fromArray(this.spaces[r].luminanceCoefficients)},"getLuminanceCoefficients"),define:h(function(s){Object.assign(this.spaces,s)},"define"),_getMatrix:h(function(s,r,o){return s.copy(this.spaces[r].toXYZ).multiply(this.spaces[o].fromXYZ)},"_getMatrix"),_getDrawingBufferColorSpace:h(function(s){return this.spaces[s].outputColorSpaceConfig.drawingBufferColorSpace},"_getDrawingBufferColorSpace"),_getUnpackColorSpace:h(function(s=this.workingColorSpace){return this.spaces[s].workingColorSpaceConfig.unpackColorSpace},"_getUnpackColorSpace"),fromWorkingColorSpace:h(function(s,r){return ts("ColorManagement: .fromWorkingColorSpace() has been renamed to .workingToColorSpace()."),i.workingToColorSpace(s,r)},"fromWorkingColorSpace"),toWorkingColorSpace:h(function(s,r){return ts("ColorManagement: .toWorkingColorSpace() has been renamed to .colorSpaceToWorking()."),i.colorSpaceToWorking(s,r)},"toWorkingColorSpace")},e=[.64,.33,.3,.6,.15,.06],t=[.2126,.7152,.0722],n=[.3127,.329];return i.define({[yr]:{primaries:e,whitePoint:n,transfer:vr,toXYZ:rp,fromXYZ:op,luminanceCoefficients:t,workingColorSpaceConfig:{unpackColorSpace:Zt},outputColorSpaceConfig:{drawingBufferColorSpace:Zt}},[Zt]:{primaries:e,whitePoint:n,transfer:et,toXYZ:rp,fromXYZ:op,luminanceCoefficients:t,outputColorSpaceConfig:{drawingBufferColorSpace:Zt}}}),i}h(Fx,"createColorManagement");var Ye=Fx();function ci(i){return i<.04045?i*.0773993808:Math.pow(i*.9478672986+.0521327014,2.4)}h(ci,"SRGBToLinear");function Us(i){return i<.0031308?i*12.92:1.055*Math.pow(i,.41666)-.055}h(Us,"LinearToSRGB");var _s,Jh=class Jh{static getDataURL(e,t="image/png"){if(/^data:/i.test(e.src)||typeof HTMLCanvasElement>"u")return e.src;let n;if(e instanceof HTMLCanvasElement)n=e;else{_s===void 0&&(_s=br("canvas")),_s.width=e.width,_s.height=e.height;let s=_s.getContext("2d");e instanceof ImageData?s.putImageData(e,0,0):s.drawImage(e,0,0,e.width,e.height),n=_s}return n.toDataURL(t)}static sRGBToLinear(e){if(typeof HTMLImageElement<"u"&&e instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&e instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&e instanceof ImageBitmap){let t=br("canvas");t.width=e.width,t.height=e.height;let n=t.getContext("2d");n.drawImage(e,0,0,e.width,e.height);let s=n.getImageData(0,0,e.width,e.height),r=s.data;for(let o=0;o<r.length;o++)r[o]=ci(r[o]/255)*255;return n.putImageData(s,0,0),t}else if(e.data){let t=e.data.slice(0);for(let n=0;n<t.length;n++)t instanceof Uint8Array||t instanceof Uint8ClampedArray?t[n]=Math.floor(ci(t[n]/255)*255):t[n]=ci(t[n]);return{data:t,width:e.width,height:e.height}}else return Ce("ImageUtils.sRGBToLinear(): Unsupported image type. No color space conversion applied."),e}};h(Jh,"ImageUtils");var ba=Jh,Nx=0,jh=class jh{constructor(e=null){this.isSource=!0,Object.defineProperty(this,"id",{value:Nx++}),this.uuid=li(),this.data=e,this.dataReady=!0,this.version=0}getSize(e){let t=this.data;return typeof HTMLVideoElement<"u"&&t instanceof HTMLVideoElement?e.set(t.videoWidth,t.videoHeight,0):typeof VideoFrame<"u"&&t instanceof VideoFrame?e.set(t.displayWidth,t.displayHeight,0):t!==null?e.set(t.width,t.height,t.depth||0):e.set(0,0,0),e}set needsUpdate(e){e===!0&&this.version++}toJSON(e){let t=e===void 0||typeof e=="string";if(!t&&e.images[this.uuid]!==void 0)return e.images[this.uuid];let n={uuid:this.uuid,url:""},s=this.data;if(s!==null){let r;if(Array.isArray(s)){r=[];for(let o=0,a=s.length;o<a;o++)s[o].isDataTexture?r.push(Wc(s[o].image)):r.push(Wc(s[o]))}else r=Wc(s);n.url=r}return t||(e.images[this.uuid]=n),n}};h(jh,"Source");var zs=jh;function Wc(i){return typeof HTMLImageElement<"u"&&i instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&i instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&i instanceof ImageBitmap?ba.getDataURL(i):i.data?{data:Array.from(i.data),width:i.width,height:i.height,type:i.data.constructor.name}:(Ce("Texture: Unable to serialize Texture."),{})}h(Wc,"serializeImage");var Ux=0,Xc=new O,Fs=class Fs extends Yn{constructor(e=Fs.DEFAULT_IMAGE,t=Fs.DEFAULT_MAPPING,n=Xn,s=Xn,r=Vt,o=Vi,a=Mn,l=yn,c=Fs.DEFAULT_ANISOTROPY,u=di){super(),this.isTexture=!0,Object.defineProperty(this,"id",{value:Ux++}),this.uuid=li(),this.name="",this.source=new zs(e),this.mipmaps=[],this.mapping=t,this.channel=0,this.wrapS=n,this.wrapT=s,this.magFilter=r,this.minFilter=o,this.anisotropy=c,this.format=a,this.internalFormat=null,this.type=l,this.offset=new We(0,0),this.repeat=new We(1,1),this.center=new We(0,0),this.rotation=0,this.matrixAutoUpdate=!0,this.matrix=new Oe,this.generateMipmaps=!0,this.premultiplyAlpha=!1,this.flipY=!0,this.unpackAlignment=4,this.colorSpace=u,this.userData={},this.updateRanges=[],this.version=0,this.onUpdate=null,this.renderTarget=null,this.isRenderTargetTexture=!1,this.isArrayTexture=!!(e&&e.depth&&e.depth>1),this.pmremVersion=0,this.normalized=!1}get width(){return this.source.getSize(Xc).x}get height(){return this.source.getSize(Xc).y}get depth(){return this.source.getSize(Xc).z}get image(){return this.source.data}set image(e){this.source.data=e}updateMatrix(){this.matrix.setUvTransform(this.offset.x,this.offset.y,this.repeat.x,this.repeat.y,this.rotation,this.center.x,this.center.y)}addUpdateRange(e,t){this.updateRanges.push({start:e,count:t})}clearUpdateRanges(){this.updateRanges.length=0}clone(){return new this.constructor().copy(this)}copy(e){return this.name=e.name,this.source=e.source,this.mipmaps=e.mipmaps.slice(0),this.mapping=e.mapping,this.channel=e.channel,this.wrapS=e.wrapS,this.wrapT=e.wrapT,this.magFilter=e.magFilter,this.minFilter=e.minFilter,this.anisotropy=e.anisotropy,this.format=e.format,this.internalFormat=e.internalFormat,this.type=e.type,this.normalized=e.normalized,this.offset.copy(e.offset),this.repeat.copy(e.repeat),this.center.copy(e.center),this.rotation=e.rotation,this.matrixAutoUpdate=e.matrixAutoUpdate,this.matrix.copy(e.matrix),this.generateMipmaps=e.generateMipmaps,this.premultiplyAlpha=e.premultiplyAlpha,this.flipY=e.flipY,this.unpackAlignment=e.unpackAlignment,this.colorSpace=e.colorSpace,this.renderTarget=e.renderTarget,this.isRenderTargetTexture=e.isRenderTargetTexture,this.isArrayTexture=e.isArrayTexture,this.userData=JSON.parse(JSON.stringify(e.userData)),this.needsUpdate=!0,this}setValues(e){for(let t in e){let n=e[t];if(n===void 0){Ce(`Texture.setValues(): parameter '${t}' has value of undefined.`);continue}let s=this[t];if(s===void 0){Ce(`Texture.setValues(): property '${t}' does not exist.`);continue}s&&n&&s.isVector2&&n.isVector2||s&&n&&s.isVector3&&n.isVector3||s&&n&&s.isMatrix3&&n.isMatrix3?s.copy(n):this[t]=n}}toJSON(e){let t=e===void 0||typeof e=="string";if(!t&&e.textures[this.uuid]!==void 0)return e.textures[this.uuid];let n={metadata:{version:4.7,type:"Texture",generator:"Texture.toJSON"},uuid:this.uuid,name:this.name,image:this.source.toJSON(e).uuid,mapping:this.mapping,channel:this.channel,repeat:[this.repeat.x,this.repeat.y],offset:[this.offset.x,this.offset.y],center:[this.center.x,this.center.y],rotation:this.rotation,wrap:[this.wrapS,this.wrapT],format:this.format,internalFormat:this.internalFormat,type:this.type,normalized:this.normalized,colorSpace:this.colorSpace,minFilter:this.minFilter,magFilter:this.magFilter,anisotropy:this.anisotropy,flipY:this.flipY,generateMipmaps:this.generateMipmaps,premultiplyAlpha:this.premultiplyAlpha,unpackAlignment:this.unpackAlignment};return Object.keys(this.userData).length>0&&(n.userData=this.userData),t||(e.textures[this.uuid]=n),n}dispose(){this.dispatchEvent({type:"dispose"})}transformUv(e){if(this.mapping!==Dh)return e;if(e.applyMatrix3(this.matrix),e.x<0||e.x>1)switch(this.wrapS){case xa:e.x=e.x-Math.floor(e.x);break;case Xn:e.x=e.x<0?0:1;break;case ya:Math.abs(Math.floor(e.x)%2)===1?e.x=Math.ceil(e.x)-e.x:e.x=e.x-Math.floor(e.x);break}if(e.y<0||e.y>1)switch(this.wrapT){case xa:e.y=e.y-Math.floor(e.y);break;case Xn:e.y=e.y<0?0:1;break;case ya:Math.abs(Math.floor(e.y)%2)===1?e.y=Math.ceil(e.y)-e.y:e.y=e.y-Math.floor(e.y);break}return this.flipY&&(e.y=1-e.y),e}set needsUpdate(e){e===!0&&(this.version++,this.source.needsUpdate=!0)}set needsPMREMUpdate(e){e===!0&&this.pmremVersion++}};h(Fs,"Texture");var tn=Fs;tn.DEFAULT_IMAGE=null;tn.DEFAULT_MAPPING=Dh;tn.DEFAULT_ANISOTROPY=1;var Ya=class Ya{constructor(e=0,t=0,n=0,s=1){this.x=e,this.y=t,this.z=n,this.w=s}get width(){return this.z}set width(e){this.z=e}get height(){return this.w}set height(e){this.w=e}set(e,t,n,s){return this.x=e,this.y=t,this.z=n,this.w=s,this}setScalar(e){return this.x=e,this.y=e,this.z=e,this.w=e,this}setX(e){return this.x=e,this}setY(e){return this.y=e,this}setZ(e){return this.z=e,this}setW(e){return this.w=e,this}setComponent(e,t){switch(e){case 0:this.x=t;break;case 1:this.y=t;break;case 2:this.z=t;break;case 3:this.w=t;break;default:throw new Error("THREE.Vector4: index is out of range: "+e)}return this}getComponent(e){switch(e){case 0:return this.x;case 1:return this.y;case 2:return this.z;case 3:return this.w;default:throw new Error("THREE.Vector4: index is out of range: "+e)}}clone(){return new this.constructor(this.x,this.y,this.z,this.w)}copy(e){return this.x=e.x,this.y=e.y,this.z=e.z,this.w=e.w!==void 0?e.w:1,this}add(e){return this.x+=e.x,this.y+=e.y,this.z+=e.z,this.w+=e.w,this}addScalar(e){return this.x+=e,this.y+=e,this.z+=e,this.w+=e,this}addVectors(e,t){return this.x=e.x+t.x,this.y=e.y+t.y,this.z=e.z+t.z,this.w=e.w+t.w,this}addScaledVector(e,t){return this.x+=e.x*t,this.y+=e.y*t,this.z+=e.z*t,this.w+=e.w*t,this}sub(e){return this.x-=e.x,this.y-=e.y,this.z-=e.z,this.w-=e.w,this}subScalar(e){return this.x-=e,this.y-=e,this.z-=e,this.w-=e,this}subVectors(e,t){return this.x=e.x-t.x,this.y=e.y-t.y,this.z=e.z-t.z,this.w=e.w-t.w,this}multiply(e){return this.x*=e.x,this.y*=e.y,this.z*=e.z,this.w*=e.w,this}multiplyScalar(e){return this.x*=e,this.y*=e,this.z*=e,this.w*=e,this}applyMatrix4(e){let t=this.x,n=this.y,s=this.z,r=this.w,o=e.elements;return this.x=o[0]*t+o[4]*n+o[8]*s+o[12]*r,this.y=o[1]*t+o[5]*n+o[9]*s+o[13]*r,this.z=o[2]*t+o[6]*n+o[10]*s+o[14]*r,this.w=o[3]*t+o[7]*n+o[11]*s+o[15]*r,this}divide(e){return this.x/=e.x,this.y/=e.y,this.z/=e.z,this.w/=e.w,this}divideScalar(e){return this.multiplyScalar(1/e)}setAxisAngleFromQuaternion(e){this.w=2*Math.acos(e.w);let t=Math.sqrt(1-e.w*e.w);return t<1e-4?(this.x=1,this.y=0,this.z=0):(this.x=e.x/t,this.y=e.y/t,this.z=e.z/t),this}setAxisAngleFromRotationMatrix(e){let t,n,s,r,l=e.elements,c=l[0],u=l[4],f=l[8],d=l[1],g=l[5],m=l[9],y=l[2],p=l[6],x=l[10];if(Math.abs(u-d)<.01&&Math.abs(f-y)<.01&&Math.abs(m-p)<.01){if(Math.abs(u+d)<.1&&Math.abs(f+y)<.1&&Math.abs(m+p)<.1&&Math.abs(c+g+x-3)<.1)return this.set(1,0,0,0),this;t=Math.PI;let M=(c+1)/2,_=(g+1)/2,A=(x+1)/2,w=(u+d)/4,T=(f+y)/4,v=(m+p)/4;return M>_&&M>A?M<.01?(n=0,s=.707106781,r=.707106781):(n=Math.sqrt(M),s=w/n,r=T/n):_>A?_<.01?(n=.707106781,s=0,r=.707106781):(s=Math.sqrt(_),n=w/s,r=v/s):A<.01?(n=.707106781,s=.707106781,r=0):(r=Math.sqrt(A),n=T/r,s=v/r),this.set(n,s,r,t),this}let S=Math.sqrt((p-m)*(p-m)+(f-y)*(f-y)+(d-u)*(d-u));return Math.abs(S)<.001&&(S=1),this.x=(p-m)/S,this.y=(f-y)/S,this.z=(d-u)/S,this.w=Math.acos((c+g+x-1)/2),this}setFromMatrixPosition(e){let t=e.elements;return this.x=t[12],this.y=t[13],this.z=t[14],this.w=t[15],this}min(e){return this.x=Math.min(this.x,e.x),this.y=Math.min(this.y,e.y),this.z=Math.min(this.z,e.z),this.w=Math.min(this.w,e.w),this}max(e){return this.x=Math.max(this.x,e.x),this.y=Math.max(this.y,e.y),this.z=Math.max(this.z,e.z),this.w=Math.max(this.w,e.w),this}clamp(e,t){return this.x=Ve(this.x,e.x,t.x),this.y=Ve(this.y,e.y,t.y),this.z=Ve(this.z,e.z,t.z),this.w=Ve(this.w,e.w,t.w),this}clampScalar(e,t){return this.x=Ve(this.x,e,t),this.y=Ve(this.y,e,t),this.z=Ve(this.z,e,t),this.w=Ve(this.w,e,t),this}clampLength(e,t){let n=this.length();return this.divideScalar(n||1).multiplyScalar(Ve(n,e,t))}floor(){return this.x=Math.floor(this.x),this.y=Math.floor(this.y),this.z=Math.floor(this.z),this.w=Math.floor(this.w),this}ceil(){return this.x=Math.ceil(this.x),this.y=Math.ceil(this.y),this.z=Math.ceil(this.z),this.w=Math.ceil(this.w),this}round(){return this.x=Math.round(this.x),this.y=Math.round(this.y),this.z=Math.round(this.z),this.w=Math.round(this.w),this}roundToZero(){return this.x=Math.trunc(this.x),this.y=Math.trunc(this.y),this.z=Math.trunc(this.z),this.w=Math.trunc(this.w),this}negate(){return this.x=-this.x,this.y=-this.y,this.z=-this.z,this.w=-this.w,this}dot(e){return this.x*e.x+this.y*e.y+this.z*e.z+this.w*e.w}lengthSq(){return this.x*this.x+this.y*this.y+this.z*this.z+this.w*this.w}length(){return Math.sqrt(this.x*this.x+this.y*this.y+this.z*this.z+this.w*this.w)}manhattanLength(){return Math.abs(this.x)+Math.abs(this.y)+Math.abs(this.z)+Math.abs(this.w)}normalize(){return this.divideScalar(this.length()||1)}setLength(e){return this.normalize().multiplyScalar(e)}lerp(e,t){return this.x+=(e.x-this.x)*t,this.y+=(e.y-this.y)*t,this.z+=(e.z-this.z)*t,this.w+=(e.w-this.w)*t,this}lerpVectors(e,t,n){return this.x=e.x+(t.x-e.x)*n,this.y=e.y+(t.y-e.y)*n,this.z=e.z+(t.z-e.z)*n,this.w=e.w+(t.w-e.w)*n,this}equals(e){return e.x===this.x&&e.y===this.y&&e.z===this.z&&e.w===this.w}fromArray(e,t=0){return this.x=e[t],this.y=e[t+1],this.z=e[t+2],this.w=e[t+3],this}toArray(e=[],t=0){return e[t]=this.x,e[t+1]=this.y,e[t+2]=this.z,e[t+3]=this.w,e}fromBufferAttribute(e,t){return this.x=e.getX(t),this.y=e.getY(t),this.z=e.getZ(t),this.w=e.getW(t),this}random(){return this.x=Math.random(),this.y=Math.random(),this.z=Math.random(),this.w=Math.random(),this}*[Symbol.iterator](){yield this.x,yield this.y,yield this.z,yield this.w}};h(Ya,"Vector4"),Ya.prototype.isVector4=!0;var st=Ya,Qh=class Qh extends Yn{constructor(e=1,t=1,n={}){super(),n=Object.assign({generateMipmaps:!1,internalFormat:null,minFilter:Vt,depthBuffer:!0,stencilBuffer:!1,resolveDepthBuffer:!0,resolveStencilBuffer:!0,depthTexture:null,samples:0,count:1,depth:1,multiview:!1,useArrayDepthTexture:!1},n),this.isRenderTarget=!0,this.width=e,this.height=t,this.depth=n.depth,this.scissor=new st(0,0,e,t),this.scissorTest=!1,this.viewport=new st(0,0,e,t),this.textures=[];let s={width:e,height:t,depth:n.depth},r=new tn(s),o=n.count;for(let a=0;a<o;a++)this.textures[a]=r.clone(),this.textures[a].isRenderTargetTexture=!0,this.textures[a].renderTarget=this;this._setTextureOptions(n),this.depthBuffer=n.depthBuffer,this.stencilBuffer=n.stencilBuffer,this.resolveDepthBuffer=n.resolveDepthBuffer,this.resolveStencilBuffer=n.resolveStencilBuffer,this._depthTexture=null,this.depthTexture=n.depthTexture,this.samples=n.samples,this.multiview=n.multiview,this.useArrayDepthTexture=n.useArrayDepthTexture}_setTextureOptions(e={}){let t={minFilter:Vt,generateMipmaps:!1,flipY:!1,internalFormat:null};e.mapping!==void 0&&(t.mapping=e.mapping),e.wrapS!==void 0&&(t.wrapS=e.wrapS),e.wrapT!==void 0&&(t.wrapT=e.wrapT),e.wrapR!==void 0&&(t.wrapR=e.wrapR),e.magFilter!==void 0&&(t.magFilter=e.magFilter),e.minFilter!==void 0&&(t.minFilter=e.minFilter),e.format!==void 0&&(t.format=e.format),e.type!==void 0&&(t.type=e.type),e.anisotropy!==void 0&&(t.anisotropy=e.anisotropy),e.colorSpace!==void 0&&(t.colorSpace=e.colorSpace),e.flipY!==void 0&&(t.flipY=e.flipY),e.generateMipmaps!==void 0&&(t.generateMipmaps=e.generateMipmaps),e.internalFormat!==void 0&&(t.internalFormat=e.internalFormat);for(let n=0;n<this.textures.length;n++)this.textures[n].setValues(t)}get texture(){return this.textures[0]}set texture(e){this.textures[0]=e}set depthTexture(e){this._depthTexture!==null&&(this._depthTexture.renderTarget=null),e!==null&&(e.renderTarget=this),this._depthTexture=e}get depthTexture(){return this._depthTexture}setSize(e,t,n=1){if(this.width!==e||this.height!==t||this.depth!==n){this.width=e,this.height=t,this.depth=n;for(let s=0,r=this.textures.length;s<r;s++)this.textures[s].image.width=e,this.textures[s].image.height=t,this.textures[s].image.depth=n,this.textures[s].isData3DTexture!==!0&&(this.textures[s].isArrayTexture=this.textures[s].image.depth>1);this.dispose()}this.viewport.set(0,0,e,t),this.scissor.set(0,0,e,t)}clone(){return new this.constructor().copy(this)}copy(e){this.width=e.width,this.height=e.height,this.depth=e.depth,this.scissor.copy(e.scissor),this.scissorTest=e.scissorTest,this.viewport.copy(e.viewport),this.textures.length=0;for(let t=0,n=e.textures.length;t<n;t++){this.textures[t]=e.textures[t].clone(),this.textures[t].isRenderTargetTexture=!0,this.textures[t].renderTarget=this;let s=Object.assign({},e.textures[t].image);this.textures[t].source=new zs(s)}return this.depthBuffer=e.depthBuffer,this.stencilBuffer=e.stencilBuffer,this.resolveDepthBuffer=e.resolveDepthBuffer,this.resolveStencilBuffer=e.resolveStencilBuffer,e.depthTexture!==null&&(this.depthTexture=e.depthTexture.clone()),this.samples=e.samples,this.multiview=e.multiview,this.useArrayDepthTexture=e.useArrayDepthTexture,this}dispose(){this.dispatchEvent({type:"dispose"})}};h(Qh,"RenderTarget");var Sa=Qh,eu=class eu extends Sa{constructor(e=1,t=1,n={}){super(e,t,n),this.isWebGLRenderTarget=!0}};h(eu,"WebGLRenderTarget");var pn=eu,tu=class tu extends tn{constructor(e=null,t=1,n=1,s=1){super(null),this.isDataArrayTexture=!0,this.image={data:e,width:t,height:n,depth:s},this.magFilter=zt,this.minFilter=zt,this.wrapR=Xn,this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1,this.layerUpdates=new Set}addLayerUpdate(e){this.layerUpdates.add(e)}clearLayerUpdates(){this.layerUpdates.clear()}};h(tu,"DataArrayTexture");var Mr=tu;var nu=class nu extends tn{constructor(e=null,t=1,n=1,s=1){super(null),this.isData3DTexture=!0,this.image={data:e,width:t,height:n,depth:s},this.magFilter=zt,this.minFilter=zt,this.wrapR=Xn,this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1}};h(nu,"Data3DTexture");var Ma=nu;var gr=class gr{constructor(e,t,n,s,r,o,a,l,c,u,f,d,g,m,y,p){this.elements=[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1],e!==void 0&&this.set(e,t,n,s,r,o,a,l,c,u,f,d,g,m,y,p)}set(e,t,n,s,r,o,a,l,c,u,f,d,g,m,y,p){let x=this.elements;return x[0]=e,x[4]=t,x[8]=n,x[12]=s,x[1]=r,x[5]=o,x[9]=a,x[13]=l,x[2]=c,x[6]=u,x[10]=f,x[14]=d,x[3]=g,x[7]=m,x[11]=y,x[15]=p,this}identity(){return this.set(1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1),this}clone(){return new gr().fromArray(this.elements)}copy(e){let t=this.elements,n=e.elements;return t[0]=n[0],t[1]=n[1],t[2]=n[2],t[3]=n[3],t[4]=n[4],t[5]=n[5],t[6]=n[6],t[7]=n[7],t[8]=n[8],t[9]=n[9],t[10]=n[10],t[11]=n[11],t[12]=n[12],t[13]=n[13],t[14]=n[14],t[15]=n[15],this}copyPosition(e){let t=this.elements,n=e.elements;return t[12]=n[12],t[13]=n[13],t[14]=n[14],this}setFromMatrix3(e){let t=e.elements;return this.set(t[0],t[3],t[6],0,t[1],t[4],t[7],0,t[2],t[5],t[8],0,0,0,0,1),this}extractBasis(e,t,n){return this.determinantAffine()===0?(e.set(1,0,0),t.set(0,1,0),n.set(0,0,1),this):(e.setFromMatrixColumn(this,0),t.setFromMatrixColumn(this,1),n.setFromMatrixColumn(this,2),this)}makeBasis(e,t,n){return this.set(e.x,t.x,n.x,0,e.y,t.y,n.y,0,e.z,t.z,n.z,0,0,0,0,1),this}extractRotation(e){if(e.determinantAffine()===0)return this.identity();let t=this.elements,n=e.elements,s=1/bs.setFromMatrixColumn(e,0).length(),r=1/bs.setFromMatrixColumn(e,1).length(),o=1/bs.setFromMatrixColumn(e,2).length();return t[0]=n[0]*s,t[1]=n[1]*s,t[2]=n[2]*s,t[3]=0,t[4]=n[4]*r,t[5]=n[5]*r,t[6]=n[6]*r,t[7]=0,t[8]=n[8]*o,t[9]=n[9]*o,t[10]=n[10]*o,t[11]=0,t[12]=0,t[13]=0,t[14]=0,t[15]=1,this}makeRotationFromEuler(e){let t=this.elements,n=e.x,s=e.y,r=e.z,o=Math.cos(n),a=Math.sin(n),l=Math.cos(s),c=Math.sin(s),u=Math.cos(r),f=Math.sin(r);if(e.order==="XYZ"){let d=o*u,g=o*f,m=a*u,y=a*f;t[0]=l*u,t[4]=-l*f,t[8]=c,t[1]=g+m*c,t[5]=d-y*c,t[9]=-a*l,t[2]=y-d*c,t[6]=m+g*c,t[10]=o*l}else if(e.order==="YXZ"){let d=l*u,g=l*f,m=c*u,y=c*f;t[0]=d+y*a,t[4]=m*a-g,t[8]=o*c,t[1]=o*f,t[5]=o*u,t[9]=-a,t[2]=g*a-m,t[6]=y+d*a,t[10]=o*l}else if(e.order==="ZXY"){let d=l*u,g=l*f,m=c*u,y=c*f;t[0]=d-y*a,t[4]=-o*f,t[8]=m+g*a,t[1]=g+m*a,t[5]=o*u,t[9]=y-d*a,t[2]=-o*c,t[6]=a,t[10]=o*l}else if(e.order==="ZYX"){let d=o*u,g=o*f,m=a*u,y=a*f;t[0]=l*u,t[4]=m*c-g,t[8]=d*c+y,t[1]=l*f,t[5]=y*c+d,t[9]=g*c-m,t[2]=-c,t[6]=a*l,t[10]=o*l}else if(e.order==="YZX"){let d=o*l,g=o*c,m=a*l,y=a*c;t[0]=l*u,t[4]=y-d*f,t[8]=m*f+g,t[1]=f,t[5]=o*u,t[9]=-a*u,t[2]=-c*u,t[6]=g*f+m,t[10]=d-y*f}else if(e.order==="XZY"){let d=o*l,g=o*c,m=a*l,y=a*c;t[0]=l*u,t[4]=-f,t[8]=c*u,t[1]=d*f+y,t[5]=o*u,t[9]=g*f-m,t[2]=m*f-g,t[6]=a*u,t[10]=y*f+d}return t[3]=0,t[7]=0,t[11]=0,t[12]=0,t[13]=0,t[14]=0,t[15]=1,this}makeRotationFromQuaternion(e){return this.compose(Ox,e,Bx)}lookAt(e,t,n){let s=this.elements;return dn.subVectors(e,t),dn.lengthSq()===0&&(dn.z=1),dn.normalize(),Mi.crossVectors(n,dn),Mi.lengthSq()===0&&(Math.abs(n.z)===1?dn.x+=1e-4:dn.z+=1e-4,dn.normalize(),Mi.crossVectors(n,dn)),Mi.normalize(),Uo.crossVectors(dn,Mi),s[0]=Mi.x,s[4]=Uo.x,s[8]=dn.x,s[1]=Mi.y,s[5]=Uo.y,s[9]=dn.y,s[2]=Mi.z,s[6]=Uo.z,s[10]=dn.z,this}multiply(e){return this.multiplyMatrices(this,e)}premultiply(e){return this.multiplyMatrices(e,this)}multiplyMatrices(e,t){let n=e.elements,s=t.elements,r=this.elements,o=n[0],a=n[4],l=n[8],c=n[12],u=n[1],f=n[5],d=n[9],g=n[13],m=n[2],y=n[6],p=n[10],x=n[14],S=n[3],M=n[7],_=n[11],A=n[15],w=s[0],T=s[4],v=s[8],P=s[12],C=s[1],I=s[5],D=s[9],L=s[13],H=s[2],F=s[6],Y=s[10],k=s[14],Z=s[3],ee=s[7],re=s[11],le=s[15];return r[0]=o*w+a*C+l*H+c*Z,r[4]=o*T+a*I+l*F+c*ee,r[8]=o*v+a*D+l*Y+c*re,r[12]=o*P+a*L+l*k+c*le,r[1]=u*w+f*C+d*H+g*Z,r[5]=u*T+f*I+d*F+g*ee,r[9]=u*v+f*D+d*Y+g*re,r[13]=u*P+f*L+d*k+g*le,r[2]=m*w+y*C+p*H+x*Z,r[6]=m*T+y*I+p*F+x*ee,r[10]=m*v+y*D+p*Y+x*re,r[14]=m*P+y*L+p*k+x*le,r[3]=S*w+M*C+_*H+A*Z,r[7]=S*T+M*I+_*F+A*ee,r[11]=S*v+M*D+_*Y+A*re,r[15]=S*P+M*L+_*k+A*le,this}multiplyScalar(e){let t=this.elements;return t[0]*=e,t[4]*=e,t[8]*=e,t[12]*=e,t[1]*=e,t[5]*=e,t[9]*=e,t[13]*=e,t[2]*=e,t[6]*=e,t[10]*=e,t[14]*=e,t[3]*=e,t[7]*=e,t[11]*=e,t[15]*=e,this}determinant(){let e=this.elements,t=e[0],n=e[4],s=e[8],r=e[12],o=e[1],a=e[5],l=e[9],c=e[13],u=e[2],f=e[6],d=e[10],g=e[14],m=e[3],y=e[7],p=e[11],x=e[15],S=l*g-c*d,M=a*g-c*f,_=a*d-l*f,A=o*g-c*u,w=o*d-l*u,T=o*f-a*u;return t*(y*S-p*M+x*_)-n*(m*S-p*A+x*w)+s*(m*M-y*A+x*T)-r*(m*_-y*w+p*T)}determinantAffine(){let e=this.elements,t=e[0],n=e[4],s=e[8],r=e[1],o=e[5],a=e[9],l=e[2],c=e[6],u=e[10];return t*(o*u-a*c)-n*(r*u-a*l)+s*(r*c-o*l)}transpose(){let e=this.elements,t;return t=e[1],e[1]=e[4],e[4]=t,t=e[2],e[2]=e[8],e[8]=t,t=e[6],e[6]=e[9],e[9]=t,t=e[3],e[3]=e[12],e[12]=t,t=e[7],e[7]=e[13],e[13]=t,t=e[11],e[11]=e[14],e[14]=t,this}setPosition(e,t,n){let s=this.elements;return e.isVector3?(s[12]=e.x,s[13]=e.y,s[14]=e.z):(s[12]=e,s[13]=t,s[14]=n),this}invert(){let e=this.elements,t=e[0],n=e[1],s=e[2],r=e[3],o=e[4],a=e[5],l=e[6],c=e[7],u=e[8],f=e[9],d=e[10],g=e[11],m=e[12],y=e[13],p=e[14],x=e[15],S=t*a-n*o,M=t*l-s*o,_=t*c-r*o,A=n*l-s*a,w=n*c-r*a,T=s*c-r*l,v=u*y-f*m,P=u*p-d*m,C=u*x-g*m,I=f*p-d*y,D=f*x-g*y,L=d*x-g*p,H=S*L-M*D+_*I+A*C-w*P+T*v;if(H===0)return this.set(0,0,0,0,0,0,0,0,0,0,0,0,0,0,0,0);let F=1/H;return e[0]=(a*L-l*D+c*I)*F,e[1]=(s*D-n*L-r*I)*F,e[2]=(y*T-p*w+x*A)*F,e[3]=(d*w-f*T-g*A)*F,e[4]=(l*C-o*L-c*P)*F,e[5]=(t*L-s*C+r*P)*F,e[6]=(p*_-m*T-x*M)*F,e[7]=(u*T-d*_+g*M)*F,e[8]=(o*D-a*C+c*v)*F,e[9]=(n*C-t*D-r*v)*F,e[10]=(m*w-y*_+x*S)*F,e[11]=(f*_-u*w-g*S)*F,e[12]=(a*P-o*I-l*v)*F,e[13]=(t*I-n*P+s*v)*F,e[14]=(y*M-m*A-p*S)*F,e[15]=(u*A-f*M+d*S)*F,this}scale(e){let t=this.elements,n=e.x,s=e.y,r=e.z;return t[0]*=n,t[4]*=s,t[8]*=r,t[1]*=n,t[5]*=s,t[9]*=r,t[2]*=n,t[6]*=s,t[10]*=r,t[3]*=n,t[7]*=s,t[11]*=r,this}getMaxScaleOnAxis(){let e=this.elements,t=e[0]*e[0]+e[1]*e[1]+e[2]*e[2],n=e[4]*e[4]+e[5]*e[5]+e[6]*e[6],s=e[8]*e[8]+e[9]*e[9]+e[10]*e[10];return Math.sqrt(Math.max(t,n,s))}makeTranslation(e,t,n){return e.isVector3?this.set(1,0,0,e.x,0,1,0,e.y,0,0,1,e.z,0,0,0,1):this.set(1,0,0,e,0,1,0,t,0,0,1,n,0,0,0,1),this}makeRotationX(e){let t=Math.cos(e),n=Math.sin(e);return this.set(1,0,0,0,0,t,-n,0,0,n,t,0,0,0,0,1),this}makeRotationY(e){let t=Math.cos(e),n=Math.sin(e);return this.set(t,0,n,0,0,1,0,0,-n,0,t,0,0,0,0,1),this}makeRotationZ(e){let t=Math.cos(e),n=Math.sin(e);return this.set(t,-n,0,0,n,t,0,0,0,0,1,0,0,0,0,1),this}makeRotationAxis(e,t){let n=Math.cos(t),s=Math.sin(t),r=1-n,o=e.x,a=e.y,l=e.z,c=r*o,u=r*a;return this.set(c*o+n,c*a-s*l,c*l+s*a,0,c*a+s*l,u*a+n,u*l-s*o,0,c*l-s*a,u*l+s*o,r*l*l+n,0,0,0,0,1),this}makeScale(e,t,n){return this.set(e,0,0,0,0,t,0,0,0,0,n,0,0,0,0,1),this}makeShear(e,t,n,s,r,o){return this.set(1,n,r,0,e,1,o,0,t,s,1,0,0,0,0,1),this}compose(e,t,n){let s=this.elements,r=t._x,o=t._y,a=t._z,l=t._w,c=r+r,u=o+o,f=a+a,d=r*c,g=r*u,m=r*f,y=o*u,p=o*f,x=a*f,S=l*c,M=l*u,_=l*f,A=n.x,w=n.y,T=n.z;return s[0]=(1-(y+x))*A,s[1]=(g+_)*A,s[2]=(m-M)*A,s[3]=0,s[4]=(g-_)*w,s[5]=(1-(d+x))*w,s[6]=(p+S)*w,s[7]=0,s[8]=(m+M)*T,s[9]=(p-S)*T,s[10]=(1-(d+y))*T,s[11]=0,s[12]=e.x,s[13]=e.y,s[14]=e.z,s[15]=1,this}decompose(e,t,n){let s=this.elements;e.x=s[12],e.y=s[13],e.z=s[14];let r=this.determinantAffine();if(r===0)return n.set(1,1,1),t.identity(),this;let o=bs.set(s[0],s[1],s[2]).length(),a=bs.set(s[4],s[5],s[6]).length(),l=bs.set(s[8],s[9],s[10]).length();r<0&&(o=-o),En.copy(this);let c=1/o,u=1/a,f=1/l;return En.elements[0]*=c,En.elements[1]*=c,En.elements[2]*=c,En.elements[4]*=u,En.elements[5]*=u,En.elements[6]*=u,En.elements[8]*=f,En.elements[9]*=f,En.elements[10]*=f,t.setFromRotationMatrix(En),n.x=o,n.y=a,n.z=l,this}makePerspective(e,t,n,s,r,o,a=Rn,l=!1){let c=this.elements,u=2*r/(t-e),f=2*r/(n-s),d=(t+e)/(t-e),g=(n+s)/(n-s),m,y;if(l)m=r/(o-r),y=o*r/(o-r);else if(a===Rn)m=-(o+r)/(o-r),y=-2*o*r/(o-r);else if(a===_r)m=-o/(o-r),y=-o*r/(o-r);else throw new Error("THREE.Matrix4.makePerspective(): Invalid coordinate system: "+a);return c[0]=u,c[4]=0,c[8]=d,c[12]=0,c[1]=0,c[5]=f,c[9]=g,c[13]=0,c[2]=0,c[6]=0,c[10]=m,c[14]=y,c[3]=0,c[7]=0,c[11]=-1,c[15]=0,this}makeOrthographic(e,t,n,s,r,o,a=Rn,l=!1){let c=this.elements,u=2/(t-e),f=2/(n-s),d=-(t+e)/(t-e),g=-(n+s)/(n-s),m,y;if(l)m=1/(o-r),y=o/(o-r);else if(a===Rn)m=-2/(o-r),y=-(o+r)/(o-r);else if(a===_r)m=-1/(o-r),y=-r/(o-r);else throw new Error("THREE.Matrix4.makeOrthographic(): Invalid coordinate system: "+a);return c[0]=u,c[4]=0,c[8]=0,c[12]=d,c[1]=0,c[5]=f,c[9]=0,c[13]=g,c[2]=0,c[6]=0,c[10]=m,c[14]=y,c[3]=0,c[7]=0,c[11]=0,c[15]=1,this}equals(e){let t=this.elements,n=e.elements;for(let s=0;s<16;s++)if(t[s]!==n[s])return!1;return!0}fromArray(e,t=0){for(let n=0;n<16;n++)this.elements[n]=e[n+t];return this}toArray(e=[],t=0){let n=this.elements;return e[t]=n[0],e[t+1]=n[1],e[t+2]=n[2],e[t+3]=n[3],e[t+4]=n[4],e[t+5]=n[5],e[t+6]=n[6],e[t+7]=n[7],e[t+8]=n[8],e[t+9]=n[9],e[t+10]=n[10],e[t+11]=n[11],e[t+12]=n[12],e[t+13]=n[13],e[t+14]=n[14],e[t+15]=n[15],e}};h(gr,"Matrix4"),gr.prototype.isMatrix4=!0;var ct=gr,bs=new O,En=new ct,Ox=new O(0,0,0),Bx=new O(1,1,1),Mi=new O,Uo=new O,dn=new O,ap=new ct,lp=new $n,$a=class $a{constructor(e=0,t=0,n=0,s=$a.DEFAULT_ORDER){this.isEuler=!0,this._x=e,this._y=t,this._z=n,this._order=s}get x(){return this._x}set x(e){this._x=e,this._onChangeCallback()}get y(){return this._y}set y(e){this._y=e,this._onChangeCallback()}get z(){return this._z}set z(e){this._z=e,this._onChangeCallback()}get order(){return this._order}set order(e){this._order=e,this._onChangeCallback()}set(e,t,n,s=this._order){return this._x=e,this._y=t,this._z=n,this._order=s,this._onChangeCallback(),this}clone(){return new this.constructor(this._x,this._y,this._z,this._order)}copy(e){return this._x=e._x,this._y=e._y,this._z=e._z,this._order=e._order,this._onChangeCallback(),this}setFromRotationMatrix(e,t=this._order,n=!0){let s=e.elements,r=s[0],o=s[4],a=s[8],l=s[1],c=s[5],u=s[9],f=s[2],d=s[6],g=s[10];switch(t){case"XYZ":this._y=Math.asin(Ve(a,-1,1)),Math.abs(a)<.9999999?(this._x=Math.atan2(-u,g),this._z=Math.atan2(-o,r)):(this._x=Math.atan2(d,c),this._z=0);break;case"YXZ":this._x=Math.asin(-Ve(u,-1,1)),Math.abs(u)<.9999999?(this._y=Math.atan2(a,g),this._z=Math.atan2(l,c)):(this._y=Math.atan2(-f,r),this._z=0);break;case"ZXY":this._x=Math.asin(Ve(d,-1,1)),Math.abs(d)<.9999999?(this._y=Math.atan2(-f,g),this._z=Math.atan2(-o,c)):(this._y=0,this._z=Math.atan2(l,r));break;case"ZYX":this._y=Math.asin(-Ve(f,-1,1)),Math.abs(f)<.9999999?(this._x=Math.atan2(d,g),this._z=Math.atan2(l,r)):(this._x=0,this._z=Math.atan2(-o,c));break;case"YZX":this._z=Math.asin(Ve(l,-1,1)),Math.abs(l)<.9999999?(this._x=Math.atan2(-u,c),this._y=Math.atan2(-f,r)):(this._x=0,this._y=Math.atan2(a,g));break;case"XZY":this._z=Math.asin(-Ve(o,-1,1)),Math.abs(o)<.9999999?(this._x=Math.atan2(d,c),this._y=Math.atan2(a,r)):(this._x=Math.atan2(-u,g),this._y=0);break;default:Ce("Euler: .setFromRotationMatrix() encountered an unknown order: "+t)}return this._order=t,n===!0&&this._onChangeCallback(),this}setFromQuaternion(e,t,n){return ap.makeRotationFromQuaternion(e),this.setFromRotationMatrix(ap,t,n)}setFromVector3(e,t=this._order){return this.set(e.x,e.y,e.z,t)}reorder(e){return lp.setFromEuler(this),this.setFromQuaternion(lp,e)}equals(e){return e._x===this._x&&e._y===this._y&&e._z===this._z&&e._order===this._order}fromArray(e){return this._x=e[0],this._y=e[1],this._z=e[2],e[3]!==void 0&&(this._order=e[3]),this._onChangeCallback(),this}toArray(e=[],t=0){return e[t]=this._x,e[t+1]=this._y,e[t+2]=this._z,e[t+3]=this._order,e}_onChange(e){return this._onChangeCallback=e,this}_onChangeCallback(){}*[Symbol.iterator](){yield this._x,yield this._y,yield this._z,yield this._order}};h($a,"Euler");var Di=$a;Di.DEFAULT_ORDER="XYZ";var iu=class iu{constructor(){this.mask=1}set(e){this.mask=(1<<e|0)>>>0}enable(e){this.mask|=1<<e|0}enableAll(){this.mask=-1}toggle(e){this.mask^=1<<e|0}disable(e){this.mask&=~(1<<e|0)}disableAll(){this.mask=0}test(e){return(this.mask&e.mask)!==0}isEnabled(e){return(this.mask&(1<<e|0))!==0}};h(iu,"Layers");var wr=iu,zx=0,cp=new O,Ss=new $n,ni=new ct,Oo=new O,lr=new O,kx=new O,Vx=new $n,hp=new O(1,0,0),up=new O(0,1,0),dp=new O(0,0,1),fp={type:"added"},Hx={type:"removed"},Ms={type:"childadded",child:null},qc={type:"childremoved",child:null},Ns=class Ns extends Yn{constructor(){super(),this.isObject3D=!0,Object.defineProperty(this,"id",{value:zx++}),this.uuid=li(),this.name="",this.type="Object3D",this.parent=null,this.children=[],this.up=Ns.DEFAULT_UP.clone();let e=new O,t=new Di,n=new $n,s=new O(1,1,1);function r(){n.setFromEuler(t,!1)}h(r,"onRotationChange");function o(){t.setFromQuaternion(n,void 0,!1)}h(o,"onQuaternionChange"),t._onChange(r),n._onChange(o),Object.defineProperties(this,{position:{configurable:!0,enumerable:!0,value:e},rotation:{configurable:!0,enumerable:!0,value:t},quaternion:{configurable:!0,enumerable:!0,value:n},scale:{configurable:!0,enumerable:!0,value:s},modelViewMatrix:{value:new ct},normalMatrix:{value:new Oe}}),this.matrix=new ct,this.matrixWorld=new ct,this.matrixAutoUpdate=Ns.DEFAULT_MATRIX_AUTO_UPDATE,this.matrixWorldAutoUpdate=Ns.DEFAULT_MATRIX_WORLD_AUTO_UPDATE,this.matrixWorldNeedsUpdate=!1,this.layers=new wr,this.visible=!0,this.castShadow=!1,this.receiveShadow=!1,this.frustumCulled=!0,this.renderOrder=0,this.animations=[],this.customDepthMaterial=void 0,this.customDistanceMaterial=void 0,this.static=!1,this.userData={},this.pivot=null}onBeforeShadow(){}onAfterShadow(){}onBeforeRender(){}onAfterRender(){}applyMatrix4(e){this.matrixAutoUpdate&&this.updateMatrix(),this.matrix.premultiply(e),this.matrix.decompose(this.position,this.quaternion,this.scale)}applyQuaternion(e){return this.quaternion.premultiply(e),this}setRotationFromAxisAngle(e,t){this.quaternion.setFromAxisAngle(e,t)}setRotationFromEuler(e){this.quaternion.setFromEuler(e,!0)}setRotationFromMatrix(e){this.quaternion.setFromRotationMatrix(e)}setRotationFromQuaternion(e){this.quaternion.copy(e)}rotateOnAxis(e,t){return Ss.setFromAxisAngle(e,t),this.quaternion.multiply(Ss),this}rotateOnWorldAxis(e,t){return Ss.setFromAxisAngle(e,t),this.quaternion.premultiply(Ss),this}rotateX(e){return this.rotateOnAxis(hp,e)}rotateY(e){return this.rotateOnAxis(up,e)}rotateZ(e){return this.rotateOnAxis(dp,e)}translateOnAxis(e,t){return cp.copy(e).applyQuaternion(this.quaternion),this.position.add(cp.multiplyScalar(t)),this}translateX(e){return this.translateOnAxis(hp,e)}translateY(e){return this.translateOnAxis(up,e)}translateZ(e){return this.translateOnAxis(dp,e)}localToWorld(e){return this.updateWorldMatrix(!0,!1),e.applyMatrix4(this.matrixWorld)}worldToLocal(e){return this.updateWorldMatrix(!0,!1),e.applyMatrix4(ni.copy(this.matrixWorld).invert())}lookAt(e,t,n){e.isVector3?Oo.copy(e):Oo.set(e,t,n);let s=this.parent;this.updateWorldMatrix(!0,!1),lr.setFromMatrixPosition(this.matrixWorld),this.isCamera||this.isLight?ni.lookAt(lr,Oo,this.up):ni.lookAt(Oo,lr,this.up),this.quaternion.setFromRotationMatrix(ni),s&&(ni.extractRotation(s.matrixWorld),Ss.setFromRotationMatrix(ni),this.quaternion.premultiply(Ss.invert()))}add(e){if(arguments.length>1){for(let t=0;t<arguments.length;t++)this.add(arguments[t]);return this}return e===this?(Ne("Object3D.add: object can't be added as a child of itself.",e),this):(e&&e.isObject3D?(e.removeFromParent(),e.parent=this,this.children.push(e),e.dispatchEvent(fp),Ms.child=e,this.dispatchEvent(Ms),Ms.child=null):Ne("Object3D.add: object not an instance of THREE.Object3D.",e),this)}remove(e){if(arguments.length>1){for(let n=0;n<arguments.length;n++)this.remove(arguments[n]);return this}let t=this.children.indexOf(e);return t!==-1&&(e.parent=null,this.children.splice(t,1),e.dispatchEvent(Hx),qc.child=e,this.dispatchEvent(qc),qc.child=null),this}removeFromParent(){let e=this.parent;return e!==null&&e.remove(this),this}clear(){return this.remove(...this.children)}attach(e){return this.updateWorldMatrix(!0,!1),ni.copy(this.matrixWorld).invert(),e.parent!==null&&(e.parent.updateWorldMatrix(!0,!1),ni.multiply(e.parent.matrixWorld)),e.applyMatrix4(ni),e.removeFromParent(),e.parent=this,this.children.push(e),e.updateWorldMatrix(!1,!0),e.dispatchEvent(fp),Ms.child=e,this.dispatchEvent(Ms),Ms.child=null,this}getObjectById(e){return this.getObjectByProperty("id",e)}getObjectByName(e){return this.getObjectByProperty("name",e)}getObjectByProperty(e,t){if(this[e]===t)return this;for(let n=0,s=this.children.length;n<s;n++){let o=this.children[n].getObjectByProperty(e,t);if(o!==void 0)return o}}getObjectsByProperty(e,t,n=[]){this[e]===t&&n.push(this);let s=this.children;for(let r=0,o=s.length;r<o;r++)s[r].getObjectsByProperty(e,t,n);return n}getWorldPosition(e){return this.updateWorldMatrix(!0,!1),e.setFromMatrixPosition(this.matrixWorld)}getWorldQuaternion(e){return this.updateWorldMatrix(!0,!1),this.matrixWorld.decompose(lr,e,kx),e}getWorldScale(e){return this.updateWorldMatrix(!0,!1),this.matrixWorld.decompose(lr,Vx,e),e}getWorldDirection(e){this.updateWorldMatrix(!0,!1);let t=this.matrixWorld.elements;return e.set(t[8],t[9],t[10]).normalize()}raycast(){}traverse(e){e(this);let t=this.children;for(let n=0,s=t.length;n<s;n++)t[n].traverse(e)}traverseVisible(e){if(this.visible===!1)return;e(this);let t=this.children;for(let n=0,s=t.length;n<s;n++)t[n].traverseVisible(e)}traverseAncestors(e){let t=this.parent;t!==null&&(e(t),t.traverseAncestors(e))}updateMatrix(){this.matrix.compose(this.position,this.quaternion,this.scale);let e=this.pivot;if(e!==null){let t=e.x,n=e.y,s=e.z,r=this.matrix.elements;r[12]+=t-r[0]*t-r[4]*n-r[8]*s,r[13]+=n-r[1]*t-r[5]*n-r[9]*s,r[14]+=s-r[2]*t-r[6]*n-r[10]*s}this.matrixWorldNeedsUpdate=!0}updateMatrixWorld(e){this.matrixAutoUpdate&&this.updateMatrix(),(this.matrixWorldNeedsUpdate||e)&&(this.matrixWorldAutoUpdate===!0&&(this.parent===null?this.matrixWorld.copy(this.matrix):this.matrixWorld.multiplyMatrices(this.parent.matrixWorld,this.matrix)),this.matrixWorldNeedsUpdate=!1,e=!0);let t=this.children;for(let n=0,s=t.length;n<s;n++)t[n].updateMatrixWorld(e)}updateWorldMatrix(e,t,n=!1){let s=this.parent;if(e===!0&&s!==null&&s.updateWorldMatrix(!0,!1),this.matrixAutoUpdate&&this.updateMatrix(),(this.matrixWorldNeedsUpdate||n)&&(this.matrixWorldAutoUpdate===!0&&(this.parent===null?this.matrixWorld.copy(this.matrix):this.matrixWorld.multiplyMatrices(this.parent.matrixWorld,this.matrix)),this.matrixWorldNeedsUpdate=!1,n=!0),t===!0){let r=this.children;for(let o=0,a=r.length;o<a;o++)r[o].updateWorldMatrix(!1,!0,n)}}toJSON(e){let t=e===void 0||typeof e=="string",n={};t&&(e={geometries:{},materials:{},textures:{},images:{},shapes:{},skeletons:{},animations:{},nodes:{}},n.metadata={version:4.7,type:"Object",generator:"Object3D.toJSON"});let s={};s.uuid=this.uuid,s.type=this.type,this.name!==""&&(s.name=this.name),this.castShadow===!0&&(s.castShadow=!0),this.receiveShadow===!0&&(s.receiveShadow=!0),this.visible===!1&&(s.visible=!1),this.frustumCulled===!1&&(s.frustumCulled=!1),this.renderOrder!==0&&(s.renderOrder=this.renderOrder),this.static!==!1&&(s.static=this.static),Object.keys(this.userData).length>0&&(s.userData=this.userData),s.layers=this.layers.mask,s.matrix=this.matrix.toArray(),s.up=this.up.toArray(),this.pivot!==null&&(s.pivot=this.pivot.toArray()),this.matrixAutoUpdate===!1&&(s.matrixAutoUpdate=!1),this.morphTargetDictionary!==void 0&&(s.morphTargetDictionary=Object.assign({},this.morphTargetDictionary)),this.morphTargetInfluences!==void 0&&(s.morphTargetInfluences=this.morphTargetInfluences.slice()),this.isInstancedMesh&&(s.type="InstancedMesh",s.count=this.count,s.instanceMatrix=this.instanceMatrix.toJSON(),this.instanceColor!==null&&(s.instanceColor=this.instanceColor.toJSON())),this.isBatchedMesh&&(s.type="BatchedMesh",s.perObjectFrustumCulled=this.perObjectFrustumCulled,s.sortObjects=this.sortObjects,s.drawRanges=this._drawRanges,s.reservedRanges=this._reservedRanges,s.geometryInfo=this._geometryInfo.map(a=>({...a,boundingBox:a.boundingBox?a.boundingBox.toJSON():void 0,boundingSphere:a.boundingSphere?a.boundingSphere.toJSON():void 0})),s.instanceInfo=this._instanceInfo.map(a=>({...a})),s.availableInstanceIds=this._availableInstanceIds.slice(),s.availableGeometryIds=this._availableGeometryIds.slice(),s.nextIndexStart=this._nextIndexStart,s.nextVertexStart=this._nextVertexStart,s.geometryCount=this._geometryCount,s.maxInstanceCount=this._maxInstanceCount,s.maxVertexCount=this._maxVertexCount,s.maxIndexCount=this._maxIndexCount,s.geometryInitialized=this._geometryInitialized,s.matricesTexture=this._matricesTexture.toJSON(e),s.indirectTexture=this._indirectTexture.toJSON(e),this._colorsTexture!==null&&(s.colorsTexture=this._colorsTexture.toJSON(e)),this.boundingSphere!==null&&(s.boundingSphere=this.boundingSphere.toJSON()),this.boundingBox!==null&&(s.boundingBox=this.boundingBox.toJSON()));function r(a,l){return a[l.uuid]===void 0&&(a[l.uuid]=l.toJSON(e)),l.uuid}if(h(r,"serialize"),this.isScene)this.background&&(this.background.isColor?s.background=this.background.toJSON():this.background.isTexture&&(s.background=this.background.toJSON(e).uuid)),this.environment&&this.environment.isTexture&&this.environment.isRenderTargetTexture!==!0&&(s.environment=this.environment.toJSON(e).uuid);else if(this.isMesh||this.isLine||this.isPoints){s.geometry=r(e.geometries,this.geometry);let a=this.geometry.parameters;if(a!==void 0&&a.shapes!==void 0){let l=a.shapes;if(Array.isArray(l))for(let c=0,u=l.length;c<u;c++){let f=l[c];r(e.shapes,f)}else r(e.shapes,l)}}if(this.isSkinnedMesh&&(s.bindMode=this.bindMode,s.bindMatrix=this.bindMatrix.toArray(),this.skeleton!==void 0&&(r(e.skeletons,this.skeleton),s.skeleton=this.skeleton.uuid)),this.material!==void 0)if(Array.isArray(this.material)){let a=[];for(let l=0,c=this.material.length;l<c;l++)a.push(r(e.materials,this.material[l]));s.material=a}else s.material=r(e.materials,this.material);if(this.children.length>0){s.children=[];for(let a=0;a<this.children.length;a++)s.children.push(this.children[a].toJSON(e).object)}if(this.animations.length>0){s.animations=[];for(let a=0;a<this.animations.length;a++){let l=this.animations[a];s.animations.push(r(e.animations,l))}}if(t){let a=o(e.geometries),l=o(e.materials),c=o(e.textures),u=o(e.images),f=o(e.shapes),d=o(e.skeletons),g=o(e.animations),m=o(e.nodes);a.length>0&&(n.geometries=a),l.length>0&&(n.materials=l),c.length>0&&(n.textures=c),u.length>0&&(n.images=u),f.length>0&&(n.shapes=f),d.length>0&&(n.skeletons=d),g.length>0&&(n.animations=g),m.length>0&&(n.nodes=m)}return n.object=s,n;function o(a){let l=[];for(let c in a){let u=a[c];delete u.metadata,l.push(u)}return l}h(o,"extractFromCache")}clone(e){return new this.constructor().copy(this,e)}copy(e,t=!0){if(this.name=e.name,this.up.copy(e.up),this.position.copy(e.position),this.rotation.order=e.rotation.order,this.quaternion.copy(e.quaternion),this.scale.copy(e.scale),this.pivot=e.pivot!==null?e.pivot.clone():null,this.matrix.copy(e.matrix),this.matrixWorld.copy(e.matrixWorld),this.matrixAutoUpdate=e.matrixAutoUpdate,this.matrixWorldAutoUpdate=e.matrixWorldAutoUpdate,this.matrixWorldNeedsUpdate=e.matrixWorldNeedsUpdate,this.layers.mask=e.layers.mask,this.visible=e.visible,this.castShadow=e.castShadow,this.receiveShadow=e.receiveShadow,this.frustumCulled=e.frustumCulled,this.renderOrder=e.renderOrder,this.static=e.static,this.animations=e.animations.slice(),this.userData=JSON.parse(JSON.stringify(e.userData)),t===!0)for(let n=0;n<e.children.length;n++){let s=e.children[n];this.add(s.clone())}return this}};h(Ns,"Object3D");var mn=Ns;mn.DEFAULT_UP=new O(0,1,0);mn.DEFAULT_MATRIX_AUTO_UPDATE=!0;mn.DEFAULT_MATRIX_WORLD_AUTO_UPDATE=!0;var su=class su extends mn{constructor(){super(),this.isGroup=!0,this.type="Group"}};h(su,"Group");var ai=su,Gx={type:"move"},ru=class ru{constructor(){this._targetRay=null,this._grip=null,this._hand=null}getHandSpace(){return this._hand===null&&(this._hand=new ai,this._hand.matrixAutoUpdate=!1,this._hand.visible=!1,this._hand.joints={},this._hand.inputState={pinching:!1}),this._hand}getTargetRaySpace(){return this._targetRay===null&&(this._targetRay=new ai,this._targetRay.matrixAutoUpdate=!1,this._targetRay.visible=!1,this._targetRay.hasLinearVelocity=!1,this._targetRay.linearVelocity=new O,this._targetRay.hasAngularVelocity=!1,this._targetRay.angularVelocity=new O),this._targetRay}getGripSpace(){return this._grip===null&&(this._grip=new ai,this._grip.matrixAutoUpdate=!1,this._grip.visible=!1,this._grip.hasLinearVelocity=!1,this._grip.linearVelocity=new O,this._grip.hasAngularVelocity=!1,this._grip.angularVelocity=new O,this._grip.eventsEnabled=!1),this._grip}dispatchEvent(e){return this._targetRay!==null&&this._targetRay.dispatchEvent(e),this._grip!==null&&this._grip.dispatchEvent(e),this._hand!==null&&this._hand.dispatchEvent(e),this}connect(e){if(e&&e.hand){let t=this._hand;if(t)for(let n of e.hand.values())this._getHandJoint(t,n)}return this.dispatchEvent({type:"connected",data:e}),this}disconnect(e){return this.dispatchEvent({type:"disconnected",data:e}),this._targetRay!==null&&(this._targetRay.visible=!1),this._grip!==null&&(this._grip.visible=!1),this._hand!==null&&(this._hand.visible=!1),this}update(e,t,n){let s=null,r=null,o=null,a=this._targetRay,l=this._grip,c=this._hand;if(e&&t.session.visibilityState!=="visible-blurred"){if(c&&e.hand){o=!0;for(let y of e.hand.values()){let p=t.getJointPose(y,n),x=this._getHandJoint(c,y);p!==null&&(x.matrix.fromArray(p.transform.matrix),x.matrix.decompose(x.position,x.rotation,x.scale),x.matrixWorldNeedsUpdate=!0,x.jointRadius=p.radius),x.visible=p!==null}let u=c.joints["index-finger-tip"],f=c.joints["thumb-tip"],d=u.position.distanceTo(f.position),g=.02,m=.005;c.inputState.pinching&&d>g+m?(c.inputState.pinching=!1,this.dispatchEvent({type:"pinchend",handedness:e.handedness,target:this})):!c.inputState.pinching&&d<=g-m&&(c.inputState.pinching=!0,this.dispatchEvent({type:"pinchstart",handedness:e.handedness,target:this}))}else l!==null&&e.gripSpace&&(r=t.getPose(e.gripSpace,n),r!==null&&(l.matrix.fromArray(r.transform.matrix),l.matrix.decompose(l.position,l.rotation,l.scale),l.matrixWorldNeedsUpdate=!0,r.linearVelocity?(l.hasLinearVelocity=!0,l.linearVelocity.copy(r.linearVelocity)):l.hasLinearVelocity=!1,r.angularVelocity?(l.hasAngularVelocity=!0,l.angularVelocity.copy(r.angularVelocity)):l.hasAngularVelocity=!1,l.eventsEnabled&&l.dispatchEvent({type:"gripUpdated",data:e,target:this})));a!==null&&(s=t.getPose(e.targetRaySpace,n),s===null&&r!==null&&(s=r),s!==null&&(a.matrix.fromArray(s.transform.matrix),a.matrix.decompose(a.position,a.rotation,a.scale),a.matrixWorldNeedsUpdate=!0,s.linearVelocity?(a.hasLinearVelocity=!0,a.linearVelocity.copy(s.linearVelocity)):a.hasLinearVelocity=!1,s.angularVelocity?(a.hasAngularVelocity=!0,a.angularVelocity.copy(s.angularVelocity)):a.hasAngularVelocity=!1,this.dispatchEvent(Gx)))}return a!==null&&(a.visible=s!==null),l!==null&&(l.visible=r!==null),c!==null&&(c.visible=o!==null),this}_getHandJoint(e,t){if(e.joints[t.jointName]===void 0){let n=new ai;n.matrixAutoUpdate=!1,n.visible=!1,e.joints[t.jointName]=n,e.add(n)}return e.joints[t.jointName]}};h(ru,"WebXRController");var ks=ru,hm={aliceblue:15792383,antiquewhite:16444375,aqua:65535,aquamarine:8388564,azure:15794175,beige:16119260,bisque:16770244,black:0,blanchedalmond:16772045,blue:255,blueviolet:9055202,brown:10824234,burlywood:14596231,cadetblue:6266528,chartreuse:8388352,chocolate:13789470,coral:16744272,cornflowerblue:6591981,cornsilk:16775388,crimson:14423100,cyan:65535,darkblue:139,darkcyan:35723,darkgoldenrod:12092939,darkgray:11119017,darkgreen:25600,darkgrey:11119017,darkkhaki:12433259,darkmagenta:9109643,darkolivegreen:5597999,darkorange:16747520,darkorchid:10040012,darkred:9109504,darksalmon:15308410,darkseagreen:9419919,darkslateblue:4734347,darkslategray:3100495,darkslategrey:3100495,darkturquoise:52945,darkviolet:9699539,deeppink:16716947,deepskyblue:49151,dimgray:6908265,dimgrey:6908265,dodgerblue:2003199,firebrick:11674146,floralwhite:16775920,forestgreen:2263842,fuchsia:16711935,gainsboro:14474460,ghostwhite:16316671,gold:16766720,goldenrod:14329120,gray:8421504,green:32768,greenyellow:11403055,grey:8421504,honeydew:15794160,hotpink:16738740,indianred:13458524,indigo:4915330,ivory:16777200,khaki:15787660,lavender:15132410,lavenderblush:16773365,lawngreen:8190976,lemonchiffon:16775885,lightblue:11393254,lightcoral:15761536,lightcyan:14745599,lightgoldenrodyellow:16448210,lightgray:13882323,lightgreen:9498256,lightgrey:13882323,lightpink:16758465,lightsalmon:16752762,lightseagreen:2142890,lightskyblue:8900346,lightslategray:7833753,lightslategrey:7833753,lightsteelblue:11584734,lightyellow:16777184,lime:65280,limegreen:3329330,linen:16445670,magenta:16711935,maroon:8388608,mediumaquamarine:6737322,mediumblue:205,mediumorchid:12211667,mediumpurple:9662683,mediumseagreen:3978097,mediumslateblue:8087790,mediumspringgreen:64154,mediumturquoise:4772300,mediumvioletred:13047173,midnightblue:1644912,mintcream:16121850,mistyrose:16770273,moccasin:16770229,navajowhite:16768685,navy:128,oldlace:16643558,olive:8421376,olivedrab:7048739,orange:16753920,orangered:16729344,orchid:14315734,palegoldenrod:15657130,palegreen:10025880,paleturquoise:11529966,palevioletred:14381203,papayawhip:16773077,peachpuff:16767673,peru:13468991,pink:16761035,plum:14524637,powderblue:11591910,purple:8388736,rebeccapurple:6697881,red:16711680,rosybrown:12357519,royalblue:4286945,saddlebrown:9127187,salmon:16416882,sandybrown:16032864,seagreen:3050327,seashell:16774638,sienna:10506797,silver:12632256,skyblue:8900331,slateblue:6970061,slategray:7372944,slategrey:7372944,snow:16775930,springgreen:65407,steelblue:4620980,tan:13808780,teal:32896,thistle:14204888,tomato:16737095,turquoise:4251856,violet:15631086,wheat:16113331,white:16777215,whitesmoke:16119285,yellow:16776960,yellowgreen:10145074},wi={h:0,s:0,l:0},Bo={h:0,s:0,l:0};function Yc(i,e,t){return t<0&&(t+=1),t>1&&(t-=1),t<1/6?i+(e-i)*6*t:t<1/2?e:t<2/3?i+(e-i)*6*(2/3-t):i}h(Yc,"hue2rgb");var ou=class ou{constructor(e,t,n){return this.isColor=!0,this.r=1,this.g=1,this.b=1,this.set(e,t,n)}set(e,t,n){if(t===void 0&&n===void 0){let s=e;s&&s.isColor?this.copy(s):typeof s=="number"?this.setHex(s):typeof s=="string"&&this.setStyle(s)}else this.setRGB(e,t,n);return this}setScalar(e){return this.r=e,this.g=e,this.b=e,this}setHex(e,t=Zt){return e=Math.floor(e),this.r=(e>>16&255)/255,this.g=(e>>8&255)/255,this.b=(e&255)/255,Ye.colorSpaceToWorking(this,t),this}setRGB(e,t,n,s=Ye.workingColorSpace){return this.r=e,this.g=t,this.b=n,Ye.colorSpaceToWorking(this,s),this}setHSL(e,t,n,s=Ye.workingColorSpace){if(e=Gh(e,1),t=Ve(t,0,1),n=Ve(n,0,1),t===0)this.r=this.g=this.b=n;else{let r=n<=.5?n*(1+t):n+t-n*t,o=2*n-r;this.r=Yc(o,r,e+1/3),this.g=Yc(o,r,e),this.b=Yc(o,r,e-1/3)}return Ye.colorSpaceToWorking(this,s),this}setStyle(e,t=Zt){function n(r){r!==void 0&&parseFloat(r)<1&&Ce("Color: Alpha component of "+e+" will be ignored.")}h(n,"handleAlpha");let s;if(s=/^(\w+)\(([^\)]*)\)/.exec(e)){let r,o=s[1],a=s[2];switch(o){case"rgb":case"rgba":if(r=/^\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(a))return n(r[4]),this.setRGB(Math.min(255,parseInt(r[1],10))/255,Math.min(255,parseInt(r[2],10))/255,Math.min(255,parseInt(r[3],10))/255,t);if(r=/^\s*(\d+)\%\s*,\s*(\d+)\%\s*,\s*(\d+)\%\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(a))return n(r[4]),this.setRGB(Math.min(100,parseInt(r[1],10))/100,Math.min(100,parseInt(r[2],10))/100,Math.min(100,parseInt(r[3],10))/100,t);break;case"hsl":case"hsla":if(r=/^\s*(\d*\.?\d+)\s*,\s*(\d*\.?\d+)\%\s*,\s*(\d*\.?\d+)\%\s*(?:,\s*(\d*\.?\d+)\s*)?$/.exec(a))return n(r[4]),this.setHSL(parseFloat(r[1])/360,parseFloat(r[2])/100,parseFloat(r[3])/100,t);break;default:Ce("Color: Unknown color model "+e)}}else if(s=/^\#([A-Fa-f\d]+)$/.exec(e)){let r=s[1],o=r.length;if(o===3)return this.setRGB(parseInt(r.charAt(0),16)/15,parseInt(r.charAt(1),16)/15,parseInt(r.charAt(2),16)/15,t);if(o===6)return this.setHex(parseInt(r,16),t);Ce("Color: Invalid hex color "+e)}else if(e&&e.length>0)return this.setColorName(e,t);return this}setColorName(e,t=Zt){let n=hm[e.toLowerCase()];return n!==void 0?this.setHex(n,t):Ce("Color: Unknown color "+e),this}clone(){return new this.constructor(this.r,this.g,this.b)}copy(e){return this.r=e.r,this.g=e.g,this.b=e.b,this}copySRGBToLinear(e){return this.r=ci(e.r),this.g=ci(e.g),this.b=ci(e.b),this}copyLinearToSRGB(e){return this.r=Us(e.r),this.g=Us(e.g),this.b=Us(e.b),this}convertSRGBToLinear(){return this.copySRGBToLinear(this),this}convertLinearToSRGB(){return this.copyLinearToSRGB(this),this}getHex(e=Zt){return Ye.workingToColorSpace(Kt.copy(this),e),Math.round(Ve(Kt.r*255,0,255))*65536+Math.round(Ve(Kt.g*255,0,255))*256+Math.round(Ve(Kt.b*255,0,255))}getHexString(e=Zt){return("000000"+this.getHex(e).toString(16)).slice(-6)}getHSL(e,t=Ye.workingColorSpace){Ye.workingToColorSpace(Kt.copy(this),t);let n=Kt.r,s=Kt.g,r=Kt.b,o=Math.max(n,s,r),a=Math.min(n,s,r),l,c,u=(a+o)/2;if(a===o)l=0,c=0;else{let f=o-a;switch(c=u<=.5?f/(o+a):f/(2-o-a),o){case n:l=(s-r)/f+(s<r?6:0);break;case s:l=(r-n)/f+2;break;case r:l=(n-s)/f+4;break}l/=6}return e.h=l,e.s=c,e.l=u,e}getRGB(e,t=Ye.workingColorSpace){return Ye.workingToColorSpace(Kt.copy(this),t),e.r=Kt.r,e.g=Kt.g,e.b=Kt.b,e}getStyle(e=Zt){Ye.workingToColorSpace(Kt.copy(this),e);let t=Kt.r,n=Kt.g,s=Kt.b;return e!==Zt?`color(${e} ${t.toFixed(3)} ${n.toFixed(3)} ${s.toFixed(3)})`:`rgb(${Math.round(t*255)},${Math.round(n*255)},${Math.round(s*255)})`}offsetHSL(e,t,n){return this.getHSL(wi),this.setHSL(wi.h+e,wi.s+t,wi.l+n)}add(e){return this.r+=e.r,this.g+=e.g,this.b+=e.b,this}addColors(e,t){return this.r=e.r+t.r,this.g=e.g+t.g,this.b=e.b+t.b,this}addScalar(e){return this.r+=e,this.g+=e,this.b+=e,this}sub(e){return this.r=Math.max(0,this.r-e.r),this.g=Math.max(0,this.g-e.g),this.b=Math.max(0,this.b-e.b),this}multiply(e){return this.r*=e.r,this.g*=e.g,this.b*=e.b,this}multiplyScalar(e){return this.r*=e,this.g*=e,this.b*=e,this}lerp(e,t){return this.r+=(e.r-this.r)*t,this.g+=(e.g-this.g)*t,this.b+=(e.b-this.b)*t,this}lerpColors(e,t,n){return this.r=e.r+(t.r-e.r)*n,this.g=e.g+(t.g-e.g)*n,this.b=e.b+(t.b-e.b)*n,this}lerpHSL(e,t){this.getHSL(wi),e.getHSL(Bo);let n=mr(wi.h,Bo.h,t),s=mr(wi.s,Bo.s,t),r=mr(wi.l,Bo.l,t);return this.setHSL(n,s,r),this}setFromVector3(e){return this.r=e.x,this.g=e.y,this.b=e.z,this}applyMatrix3(e){let t=this.r,n=this.g,s=this.b,r=e.elements;return this.r=r[0]*t+r[3]*n+r[6]*s,this.g=r[1]*t+r[4]*n+r[7]*s,this.b=r[2]*t+r[5]*n+r[8]*s,this}equals(e){return e.r===this.r&&e.g===this.g&&e.b===this.b}fromArray(e,t=0){return this.r=e[t],this.g=e[t+1],this.b=e[t+2],this}toArray(e=[],t=0){return e[t]=this.r,e[t+1]=this.g,e[t+2]=this.b,e}fromBufferAttribute(e,t){return this.r=e.getX(t),this.g=e.getY(t),this.b=e.getZ(t),this}toJSON(){return this.getHex()}*[Symbol.iterator](){yield this.r,yield this.g,yield this.b}};h(ou,"Color");var Xe=ou,Kt=new Xe;Xe.NAMES=hm;var au=class au extends mn{constructor(){super(),this.isScene=!0,this.type="Scene",this.background=null,this.environment=null,this.fog=null,this.backgroundBlurriness=0,this.backgroundIntensity=1,this.backgroundRotation=new Di,this.environmentIntensity=1,this.environmentRotation=new Di,this.overrideMaterial=null,typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("observe",{detail:this}))}copy(e,t){return super.copy(e,t),e.background!==null&&(this.background=e.background.clone()),e.environment!==null&&(this.environment=e.environment.clone()),e.fog!==null&&(this.fog=e.fog.clone()),this.backgroundBlurriness=e.backgroundBlurriness,this.backgroundIntensity=e.backgroundIntensity,this.backgroundRotation.copy(e.backgroundRotation),this.environmentIntensity=e.environmentIntensity,this.environmentRotation.copy(e.environmentRotation),e.overrideMaterial!==null&&(this.overrideMaterial=e.overrideMaterial.clone()),this.matrixAutoUpdate=e.matrixAutoUpdate,this}toJSON(e){let t=super.toJSON(e);return this.fog!==null&&(t.object.fog=this.fog.toJSON()),this.backgroundBlurriness>0&&(t.object.backgroundBlurriness=this.backgroundBlurriness),this.backgroundIntensity!==1&&(t.object.backgroundIntensity=this.backgroundIntensity),t.object.backgroundRotation=this.backgroundRotation.toArray(),this.environmentIntensity!==1&&(t.object.environmentIntensity=this.environmentIntensity),t.object.environmentRotation=this.environmentRotation.toArray(),t}};h(au,"Scene");var Er=au,Tn=new O,ii=new O,$c=new O,si=new O,ws=new O,Es=new O,pp=new O,Kc=new O,Zc=new O,Jc=new O,jc=new st,Qc=new st,eh=new st,Ri=class Ri{constructor(e=new O,t=new O,n=new O){this.a=e,this.b=t,this.c=n}static getNormal(e,t,n,s){s.subVectors(n,t),Tn.subVectors(e,t),s.cross(Tn);let r=s.lengthSq();return r>0?s.multiplyScalar(1/Math.sqrt(r)):s.set(0,0,0)}static getBarycoord(e,t,n,s,r){Tn.subVectors(s,t),ii.subVectors(n,t),$c.subVectors(e,t);let o=Tn.dot(Tn),a=Tn.dot(ii),l=Tn.dot($c),c=ii.dot(ii),u=ii.dot($c),f=o*c-a*a;if(f===0)return r.set(0,0,0),null;let d=1/f,g=(c*l-a*u)*d,m=(o*u-a*l)*d;return r.set(1-g-m,m,g)}static containsPoint(e,t,n,s){return this.getBarycoord(e,t,n,s,si)===null?!1:si.x>=0&&si.y>=0&&si.x+si.y<=1}static getInterpolation(e,t,n,s,r,o,a,l){return this.getBarycoord(e,t,n,s,si)===null?(l.x=0,l.y=0,"z"in l&&(l.z=0),"w"in l&&(l.w=0),null):(l.setScalar(0),l.addScaledVector(r,si.x),l.addScaledVector(o,si.y),l.addScaledVector(a,si.z),l)}static getInterpolatedAttribute(e,t,n,s,r,o){return jc.setScalar(0),Qc.setScalar(0),eh.setScalar(0),jc.fromBufferAttribute(e,t),Qc.fromBufferAttribute(e,n),eh.fromBufferAttribute(e,s),o.setScalar(0),o.addScaledVector(jc,r.x),o.addScaledVector(Qc,r.y),o.addScaledVector(eh,r.z),o}static isFrontFacing(e,t,n,s){return Tn.subVectors(n,t),ii.subVectors(e,t),Tn.cross(ii).dot(s)<0}set(e,t,n){return this.a.copy(e),this.b.copy(t),this.c.copy(n),this}setFromPointsAndIndices(e,t,n,s){return this.a.copy(e[t]),this.b.copy(e[n]),this.c.copy(e[s]),this}setFromAttributeAndIndices(e,t,n,s){return this.a.fromBufferAttribute(e,t),this.b.fromBufferAttribute(e,n),this.c.fromBufferAttribute(e,s),this}clone(){return new this.constructor().copy(this)}copy(e){return this.a.copy(e.a),this.b.copy(e.b),this.c.copy(e.c),this}getArea(){return Tn.subVectors(this.c,this.b),ii.subVectors(this.a,this.b),Tn.cross(ii).length()*.5}getMidpoint(e){return e.addVectors(this.a,this.b).add(this.c).multiplyScalar(1/3)}getNormal(e){return Ri.getNormal(this.a,this.b,this.c,e)}getPlane(e){return e.setFromCoplanarPoints(this.a,this.b,this.c)}getBarycoord(e,t){return Ri.getBarycoord(e,this.a,this.b,this.c,t)}getInterpolation(e,t,n,s,r){return Ri.getInterpolation(e,this.a,this.b,this.c,t,n,s,r)}containsPoint(e){return Ri.containsPoint(e,this.a,this.b,this.c)}isFrontFacing(e){return Ri.isFrontFacing(this.a,this.b,this.c,e)}intersectsBox(e){return e.intersectsTriangle(this)}closestPointToPoint(e,t){let n=this.a,s=this.b,r=this.c,o,a;ws.subVectors(s,n),Es.subVectors(r,n),Kc.subVectors(e,n);let l=ws.dot(Kc),c=Es.dot(Kc);if(l<=0&&c<=0)return t.copy(n);Zc.subVectors(e,s);let u=ws.dot(Zc),f=Es.dot(Zc);if(u>=0&&f<=u)return t.copy(s);let d=l*f-u*c;if(d<=0&&l>=0&&u<=0)return o=l/(l-u),t.copy(n).addScaledVector(ws,o);Jc.subVectors(e,r);let g=ws.dot(Jc),m=Es.dot(Jc);if(m>=0&&g<=m)return t.copy(r);let y=g*c-l*m;if(y<=0&&c>=0&&m<=0)return a=c/(c-m),t.copy(n).addScaledVector(Es,a);let p=u*m-g*f;if(p<=0&&f-u>=0&&g-m>=0)return pp.subVectors(r,s),a=(f-u)/(f-u+(g-m)),t.copy(s).addScaledVector(pp,a);let x=1/(p+y+d);return o=y*x,a=d*x,t.copy(n).addScaledVector(ws,o).addScaledVector(Es,a)}equals(e){return e.a.equals(this.a)&&e.b.equals(this.b)&&e.c.equals(this.c)}};h(Ri,"Triangle");var Ii=Ri,lu=class lu{constructor(e=new O(1/0,1/0,1/0),t=new O(-1/0,-1/0,-1/0)){this.isBox3=!0,this.min=e,this.max=t}set(e,t){return this.min.copy(e),this.max.copy(t),this}setFromArray(e){this.makeEmpty();for(let t=0,n=e.length;t<n;t+=3)this.expandByPoint(An.fromArray(e,t));return this}setFromBufferAttribute(e){this.makeEmpty();for(let t=0,n=e.count;t<n;t++)this.expandByPoint(An.fromBufferAttribute(e,t));return this}setFromPoints(e){this.makeEmpty();for(let t=0,n=e.length;t<n;t++)this.expandByPoint(e[t]);return this}setFromCenterAndSize(e,t){let n=An.copy(t).multiplyScalar(.5);return this.min.copy(e).sub(n),this.max.copy(e).add(n),this}setFromObject(e,t=!1){return this.makeEmpty(),this.expandByObject(e,t)}clone(){return new this.constructor().copy(this)}copy(e){return this.min.copy(e.min),this.max.copy(e.max),this}makeEmpty(){return this.min.x=this.min.y=this.min.z=1/0,this.max.x=this.max.y=this.max.z=-1/0,this}isEmpty(){return this.max.x<this.min.x||this.max.y<this.min.y||this.max.z<this.min.z}getCenter(e){return this.isEmpty()?e.set(0,0,0):e.addVectors(this.min,this.max).multiplyScalar(.5)}getSize(e){return this.isEmpty()?e.set(0,0,0):e.subVectors(this.max,this.min)}expandByPoint(e){return this.min.min(e),this.max.max(e),this}expandByVector(e){return this.min.sub(e),this.max.add(e),this}expandByScalar(e){return this.min.addScalar(-e),this.max.addScalar(e),this}expandByObject(e,t=!1){e.updateWorldMatrix(!1,!1);let n=e.geometry;if(n!==void 0){let r=n.getAttribute("position");if(t===!0&&r!==void 0&&e.isInstancedMesh!==!0)for(let o=0,a=r.count;o<a;o++)e.isMesh===!0?e.getVertexPosition(o,An):An.fromBufferAttribute(r,o),An.applyMatrix4(e.matrixWorld),this.expandByPoint(An);else e.boundingBox!==void 0?(e.boundingBox===null&&e.computeBoundingBox(),zo.copy(e.boundingBox)):(n.boundingBox===null&&n.computeBoundingBox(),zo.copy(n.boundingBox)),zo.applyMatrix4(e.matrixWorld),this.union(zo)}let s=e.children;for(let r=0,o=s.length;r<o;r++)this.expandByObject(s[r],t);return this}containsPoint(e){return e.x>=this.min.x&&e.x<=this.max.x&&e.y>=this.min.y&&e.y<=this.max.y&&e.z>=this.min.z&&e.z<=this.max.z}containsBox(e){return this.min.x<=e.min.x&&e.max.x<=this.max.x&&this.min.y<=e.min.y&&e.max.y<=this.max.y&&this.min.z<=e.min.z&&e.max.z<=this.max.z}getParameter(e,t){return t.set((e.x-this.min.x)/(this.max.x-this.min.x),(e.y-this.min.y)/(this.max.y-this.min.y),(e.z-this.min.z)/(this.max.z-this.min.z))}intersectsBox(e){return e.max.x>=this.min.x&&e.min.x<=this.max.x&&e.max.y>=this.min.y&&e.min.y<=this.max.y&&e.max.z>=this.min.z&&e.min.z<=this.max.z}intersectsSphere(e){return this.clampPoint(e.center,An),An.distanceToSquared(e.center)<=e.radius*e.radius}intersectsPlane(e){let t,n;return e.normal.x>0?(t=e.normal.x*this.min.x,n=e.normal.x*this.max.x):(t=e.normal.x*this.max.x,n=e.normal.x*this.min.x),e.normal.y>0?(t+=e.normal.y*this.min.y,n+=e.normal.y*this.max.y):(t+=e.normal.y*this.max.y,n+=e.normal.y*this.min.y),e.normal.z>0?(t+=e.normal.z*this.min.z,n+=e.normal.z*this.max.z):(t+=e.normal.z*this.max.z,n+=e.normal.z*this.min.z),t<=-e.constant&&n>=-e.constant}intersectsTriangle(e){if(this.isEmpty())return!1;this.getCenter(cr),ko.subVectors(this.max,cr),Ts.subVectors(e.a,cr),As.subVectors(e.b,cr),Ps.subVectors(e.c,cr),Ei.subVectors(As,Ts),Ti.subVectors(Ps,As),Zi.subVectors(Ts,Ps);let t=[0,-Ei.z,Ei.y,0,-Ti.z,Ti.y,0,-Zi.z,Zi.y,Ei.z,0,-Ei.x,Ti.z,0,-Ti.x,Zi.z,0,-Zi.x,-Ei.y,Ei.x,0,-Ti.y,Ti.x,0,-Zi.y,Zi.x,0];return!th(t,Ts,As,Ps,ko)||(t=[1,0,0,0,1,0,0,0,1],!th(t,Ts,As,Ps,ko))?!1:(Vo.crossVectors(Ei,Ti),t=[Vo.x,Vo.y,Vo.z],th(t,Ts,As,Ps,ko))}clampPoint(e,t){return t.copy(e).clamp(this.min,this.max)}distanceToPoint(e){return this.clampPoint(e,An).distanceTo(e)}getBoundingSphere(e){return this.isEmpty()?e.makeEmpty():(this.getCenter(e.center),e.radius=this.getSize(An).length()*.5),e}intersect(e){return this.min.max(e.min),this.max.min(e.max),this.isEmpty()&&this.makeEmpty(),this}union(e){return this.min.min(e.min),this.max.max(e.max),this}applyMatrix4(e){return this.isEmpty()?this:(ri[0].set(this.min.x,this.min.y,this.min.z).applyMatrix4(e),ri[1].set(this.min.x,this.min.y,this.max.z).applyMatrix4(e),ri[2].set(this.min.x,this.max.y,this.min.z).applyMatrix4(e),ri[3].set(this.min.x,this.max.y,this.max.z).applyMatrix4(e),ri[4].set(this.max.x,this.min.y,this.min.z).applyMatrix4(e),ri[5].set(this.max.x,this.min.y,this.max.z).applyMatrix4(e),ri[6].set(this.max.x,this.max.y,this.min.z).applyMatrix4(e),ri[7].set(this.max.x,this.max.y,this.max.z).applyMatrix4(e),this.setFromPoints(ri),this)}translate(e){return this.min.add(e),this.max.add(e),this}equals(e){return e.min.equals(this.min)&&e.max.equals(this.max)}toJSON(){return{min:this.min.toArray(),max:this.max.toArray()}}fromJSON(e){return this.min.fromArray(e.min),this.max.fromArray(e.max),this}};h(lu,"Box3");var gn=lu,ri=[new O,new O,new O,new O,new O,new O,new O,new O],An=new O,zo=new gn,Ts=new O,As=new O,Ps=new O,Ei=new O,Ti=new O,Zi=new O,cr=new O,ko=new O,Vo=new O,Ji=new O;function th(i,e,t,n,s){for(let r=0,o=i.length-3;r<=o;r+=3){Ji.fromArray(i,r);let a=s.x*Math.abs(Ji.x)+s.y*Math.abs(Ji.y)+s.z*Math.abs(Ji.z),l=e.dot(Ji),c=t.dot(Ji),u=n.dot(Ji);if(Math.max(-Math.max(l,c,u),Math.min(l,c,u))>a)return!1}return!0}h(th,"satForAxes");var Rt=new O,Ho=new We,Wx=0,cu=class cu extends Yn{constructor(e,t,n=!1){if(super(),Array.isArray(e))throw new TypeError("THREE.BufferAttribute: array should be a Typed Array.");this.isBufferAttribute=!0,Object.defineProperty(this,"id",{value:Wx++}),this.name="",this.array=e,this.itemSize=t,this.count=e!==void 0?e.length/t:0,this.normalized=n,this.usage=_a,this.updateRanges=[],this.gpuType=Nn,this.version=0}onUploadCallback(){}set needsUpdate(e){e===!0&&this.version++}setUsage(e){return this.usage=e,this}addUpdateRange(e,t){this.updateRanges.push({start:e,count:t})}clearUpdateRanges(){this.updateRanges.length=0}copy(e){return this.name=e.name,this.array=new e.array.constructor(e.array),this.itemSize=e.itemSize,this.count=e.count,this.normalized=e.normalized,this.usage=e.usage,this.gpuType=e.gpuType,this}copyAt(e,t,n){e*=this.itemSize,n*=t.itemSize;for(let s=0,r=this.itemSize;s<r;s++)this.array[e+s]=t.array[n+s];return this}copyArray(e){return this.array.set(e),this}applyMatrix3(e){if(this.itemSize===2)for(let t=0,n=this.count;t<n;t++)Ho.fromBufferAttribute(this,t),Ho.applyMatrix3(e),this.setXY(t,Ho.x,Ho.y);else if(this.itemSize===3)for(let t=0,n=this.count;t<n;t++)Rt.fromBufferAttribute(this,t),Rt.applyMatrix3(e),this.setXYZ(t,Rt.x,Rt.y,Rt.z);return this}applyMatrix4(e){for(let t=0,n=this.count;t<n;t++)Rt.fromBufferAttribute(this,t),Rt.applyMatrix4(e),this.setXYZ(t,Rt.x,Rt.y,Rt.z);return this}applyNormalMatrix(e){for(let t=0,n=this.count;t<n;t++)Rt.fromBufferAttribute(this,t),Rt.applyNormalMatrix(e),this.setXYZ(t,Rt.x,Rt.y,Rt.z);return this}transformDirection(e){for(let t=0,n=this.count;t<n;t++)Rt.fromBufferAttribute(this,t),Rt.transformDirection(e),this.setXYZ(t,Rt.x,Rt.y,Rt.z);return this}set(e,t=0){return this.array.set(e,t),this}getComponent(e,t){let n=this.array[e*this.itemSize+t];return this.normalized&&(n=Pn(n,this.array)),n}setComponent(e,t,n){return this.normalized&&(n=it(n,this.array)),this.array[e*this.itemSize+t]=n,this}getX(e){let t=this.array[e*this.itemSize];return this.normalized&&(t=Pn(t,this.array)),t}setX(e,t){return this.normalized&&(t=it(t,this.array)),this.array[e*this.itemSize]=t,this}getY(e){let t=this.array[e*this.itemSize+1];return this.normalized&&(t=Pn(t,this.array)),t}setY(e,t){return this.normalized&&(t=it(t,this.array)),this.array[e*this.itemSize+1]=t,this}getZ(e){let t=this.array[e*this.itemSize+2];return this.normalized&&(t=Pn(t,this.array)),t}setZ(e,t){return this.normalized&&(t=it(t,this.array)),this.array[e*this.itemSize+2]=t,this}getW(e){let t=this.array[e*this.itemSize+3];return this.normalized&&(t=Pn(t,this.array)),t}setW(e,t){return this.normalized&&(t=it(t,this.array)),this.array[e*this.itemSize+3]=t,this}setXY(e,t,n){return e*=this.itemSize,this.normalized&&(t=it(t,this.array),n=it(n,this.array)),this.array[e+0]=t,this.array[e+1]=n,this}setXYZ(e,t,n,s){return e*=this.itemSize,this.normalized&&(t=it(t,this.array),n=it(n,this.array),s=it(s,this.array)),this.array[e+0]=t,this.array[e+1]=n,this.array[e+2]=s,this}setXYZW(e,t,n,s,r){return e*=this.itemSize,this.normalized&&(t=it(t,this.array),n=it(n,this.array),s=it(s,this.array),r=it(r,this.array)),this.array[e+0]=t,this.array[e+1]=n,this.array[e+2]=s,this.array[e+3]=r,this}onUpload(e){return this.onUploadCallback=e,this}clone(){return new this.constructor(this.array,this.itemSize).copy(this)}toJSON(){let e={itemSize:this.itemSize,type:this.array.constructor.name,array:Array.from(this.array),normalized:this.normalized};return this.name!==""&&(e.name=this.name),this.usage!==_a&&(e.usage=this.usage),e}dispose(){this.dispatchEvent({type:"dispose"})}};h(cu,"BufferAttribute");var ln=cu;var hu=class hu extends ln{constructor(e,t,n){super(new Uint16Array(e),t,n)}};h(hu,"Uint16BufferAttribute");var Tr=hu;var uu=class uu extends ln{constructor(e,t,n){super(new Uint32Array(e),t,n)}};h(uu,"Uint32BufferAttribute");var Ar=uu;var du=class du extends ln{constructor(e,t,n){super(new Float32Array(e),t,n)}};h(du,"Float32BufferAttribute");var ht=du,Xx=new gn,hr=new O,nh=new O,fu=class fu{constructor(e=new O,t=-1){this.isSphere=!0,this.center=e,this.radius=t}set(e,t){return this.center.copy(e),this.radius=t,this}setFromPoints(e,t){let n=this.center;t!==void 0?n.copy(t):Xx.setFromPoints(e).getCenter(n);let s=0;for(let r=0,o=e.length;r<o;r++)s=Math.max(s,n.distanceToSquared(e[r]));return this.radius=Math.sqrt(s),this}copy(e){return this.center.copy(e.center),this.radius=e.radius,this}isEmpty(){return this.radius<0}makeEmpty(){return this.center.set(0,0,0),this.radius=-1,this}containsPoint(e){return e.distanceToSquared(this.center)<=this.radius*this.radius}distanceToPoint(e){return e.distanceTo(this.center)-this.radius}intersectsSphere(e){let t=this.radius+e.radius;return e.center.distanceToSquared(this.center)<=t*t}intersectsBox(e){return e.intersectsSphere(this)}intersectsPlane(e){return Math.abs(e.distanceToPoint(this.center))<=this.radius}clampPoint(e,t){let n=this.center.distanceToSquared(e);return t.copy(e),n>this.radius*this.radius&&(t.sub(this.center).normalize(),t.multiplyScalar(this.radius).add(this.center)),t}getBoundingBox(e){return this.isEmpty()?(e.makeEmpty(),e):(e.set(this.center,this.center),e.expandByScalar(this.radius),e)}applyMatrix4(e){return this.center.applyMatrix4(e),this.radius=this.radius*e.getMaxScaleOnAxis(),this}translate(e){return this.center.add(e),this}expandByPoint(e){if(this.isEmpty())return this.center.copy(e),this.radius=0,this;hr.subVectors(e,this.center);let t=hr.lengthSq();if(t>this.radius*this.radius){let n=Math.sqrt(t),s=(n-this.radius)*.5;this.center.addScaledVector(hr,s/n),this.radius+=s}return this}union(e){return e.isEmpty()?this:this.isEmpty()?(this.copy(e),this):(this.center.equals(e.center)===!0?this.radius=Math.max(this.radius,e.radius):(nh.subVectors(e.center,this.center).setLength(e.radius),this.expandByPoint(hr.copy(e.center).add(nh)),this.expandByPoint(hr.copy(e.center).sub(nh))),this)}equals(e){return e.center.equals(this.center)&&e.radius===this.radius}clone(){return new this.constructor().copy(this)}toJSON(){return{radius:this.radius,center:this.center.toArray()}}fromJSON(e){return this.radius=e.radius,this.center.fromArray(e.center),this}};h(fu,"Sphere");var Cn=fu,qx=0,Sn=new ct,ih=new mn,Rs=new O,fn=new gn,ur=new gn,Bt=new O,Ka=class Ka extends Yn{constructor(){super(),this.isBufferGeometry=!0,Object.defineProperty(this,"id",{value:qx++}),this.uuid=li(),this.name="",this.type="BufferGeometry",this.index=null,this.indirect=null,this.indirectOffset=0,this.attributes={},this.morphAttributes={},this.morphTargetsRelative=!1,this.groups=[],this.boundingBox=null,this.boundingSphere=null,this.drawRange={start:0,count:1/0},this.userData={},this._transformed=!1}getIndex(){return this.index}setIndex(e){return Array.isArray(e)?this.index=new(gx(e)?Ar:Tr)(e,1):this.index=e,this}setIndirect(e,t=0){return this.indirect=e,this.indirectOffset=t,this}getIndirect(){return this.indirect}getAttribute(e){return this.attributes[e]}setAttribute(e,t){return this.attributes[e]=t,this}deleteAttribute(e){return delete this.attributes[e],this}hasAttribute(e){return this.attributes[e]!==void 0}addGroup(e,t,n=0){this.groups.push({start:e,count:t,materialIndex:n})}clearGroups(){this.groups=[]}setDrawRange(e,t){this.drawRange.start=e,this.drawRange.count=t}applyMatrix4(e){let t=this.attributes.position;t!==void 0&&(t.applyMatrix4(e),t.needsUpdate=!0);let n=this.attributes.normal;if(n!==void 0){let r=new Oe().getNormalMatrix(e);n.applyNormalMatrix(r),n.needsUpdate=!0}let s=this.attributes.tangent;return s!==void 0&&(s.transformDirection(e),s.needsUpdate=!0),this.boundingBox!==null&&this.computeBoundingBox(),this.boundingSphere!==null&&this.computeBoundingSphere(),this._transformed=!0,this}applyQuaternion(e){return Sn.makeRotationFromQuaternion(e),this.applyMatrix4(Sn),this}rotateX(e){return Sn.makeRotationX(e),this.applyMatrix4(Sn),this}rotateY(e){return Sn.makeRotationY(e),this.applyMatrix4(Sn),this}rotateZ(e){return Sn.makeRotationZ(e),this.applyMatrix4(Sn),this}translate(e,t,n){return Sn.makeTranslation(e,t,n),this.applyMatrix4(Sn),this}scale(e,t,n){return Sn.makeScale(e,t,n),this.applyMatrix4(Sn),this}lookAt(e){return ih.lookAt(e),ih.updateMatrix(),this.applyMatrix4(ih.matrix),this}center(){return this.computeBoundingBox(),this.boundingBox.getCenter(Rs).negate(),this.translate(Rs.x,Rs.y,Rs.z),this}setFromPoints(e){let t=this.getAttribute("position");if(t===void 0){let n=[];for(let s=0,r=e.length;s<r;s++){let o=e[s];n.push(o.x,o.y,o.z||0)}this.setAttribute("position",new ht(n,3))}else{let n=Math.min(e.length,t.count);for(let s=0;s<n;s++){let r=e[s];t.setXYZ(s,r.x,r.y,r.z||0)}e.length>t.count&&Ce("BufferGeometry: Buffer size too small for points data. Use .dispose() and create a new geometry."),t.needsUpdate=!0}return this}computeBoundingBox(){this.boundingBox===null&&(this.boundingBox=new gn);let e=this.attributes.position,t=this.morphAttributes.position;if(e&&e.isGLBufferAttribute){Ne("BufferGeometry.computeBoundingBox(): GLBufferAttribute requires a manual bounding box.",this),this.boundingBox.set(new O(-1/0,-1/0,-1/0),new O(1/0,1/0,1/0));return}if(e!==void 0){if(this.boundingBox.setFromBufferAttribute(e),t)for(let n=0,s=t.length;n<s;n++){let r=t[n];fn.setFromBufferAttribute(r),this.morphTargetsRelative?(Bt.addVectors(this.boundingBox.min,fn.min),this.boundingBox.expandByPoint(Bt),Bt.addVectors(this.boundingBox.max,fn.max),this.boundingBox.expandByPoint(Bt)):(this.boundingBox.expandByPoint(fn.min),this.boundingBox.expandByPoint(fn.max))}}else this.boundingBox.makeEmpty();(isNaN(this.boundingBox.min.x)||isNaN(this.boundingBox.min.y)||isNaN(this.boundingBox.min.z))&&Ne('BufferGeometry.computeBoundingBox(): Computed min/max have NaN values. The "position" attribute is likely to have NaN values.',this)}computeBoundingSphere(){this.boundingSphere===null&&(this.boundingSphere=new Cn);let e=this.attributes.position,t=this.morphAttributes.position;if(e&&e.isGLBufferAttribute){Ne("BufferGeometry.computeBoundingSphere(): GLBufferAttribute requires a manual bounding sphere.",this),this.boundingSphere.set(new O,1/0);return}if(e){let n=this.boundingSphere.center;if(fn.setFromBufferAttribute(e),t)for(let r=0,o=t.length;r<o;r++){let a=t[r];ur.setFromBufferAttribute(a),this.morphTargetsRelative?(Bt.addVectors(fn.min,ur.min),fn.expandByPoint(Bt),Bt.addVectors(fn.max,ur.max),fn.expandByPoint(Bt)):(fn.expandByPoint(ur.min),fn.expandByPoint(ur.max))}fn.getCenter(n);let s=0;for(let r=0,o=e.count;r<o;r++)Bt.fromBufferAttribute(e,r),s=Math.max(s,n.distanceToSquared(Bt));if(t)for(let r=0,o=t.length;r<o;r++){let a=t[r],l=this.morphTargetsRelative;for(let c=0,u=a.count;c<u;c++)Bt.fromBufferAttribute(a,c),l&&(Rs.fromBufferAttribute(e,c),Bt.add(Rs)),s=Math.max(s,n.distanceToSquared(Bt))}this.boundingSphere.radius=Math.sqrt(s),isNaN(this.boundingSphere.radius)&&Ne('BufferGeometry.computeBoundingSphere(): Computed radius is NaN. The "position" attribute is likely to have NaN values.',this)}}computeTangents(){let e=this.index,t=this.attributes;if(e===null||t.position===void 0||t.normal===void 0||t.uv===void 0){Ne("BufferGeometry: .computeTangents() failed. Missing required attributes (index, position, normal or uv)");return}let n=t.position,s=t.normal,r=t.uv,o=this.getAttribute("tangent");(o===void 0||o.count!==n.count)&&(o=new ln(new Float32Array(4*n.count),4),this.setAttribute("tangent",o));let a=[],l=[];for(let v=0;v<n.count;v++)a[v]=new O,l[v]=new O;let c=new O,u=new O,f=new O,d=new We,g=new We,m=new We,y=new O,p=new O;function x(v,P,C){c.fromBufferAttribute(n,v),u.fromBufferAttribute(n,P),f.fromBufferAttribute(n,C),d.fromBufferAttribute(r,v),g.fromBufferAttribute(r,P),m.fromBufferAttribute(r,C),u.sub(c),f.sub(c),g.sub(d),m.sub(d);let I=1/(g.x*m.y-m.x*g.y);isFinite(I)&&(y.copy(u).multiplyScalar(m.y).addScaledVector(f,-g.y).multiplyScalar(I),p.copy(f).multiplyScalar(g.x).addScaledVector(u,-m.x).multiplyScalar(I),a[v].add(y),a[P].add(y),a[C].add(y),l[v].add(p),l[P].add(p),l[C].add(p))}h(x,"handleTriangle");let S=this.groups;S.length===0&&(S=[{start:0,count:e.count}]);for(let v=0,P=S.length;v<P;++v){let C=S[v],I=C.start,D=C.count;for(let L=I,H=I+D;L<H;L+=3)x(e.getX(L+0),e.getX(L+1),e.getX(L+2))}let M=new O,_=new O,A=new O,w=new O;function T(v){A.fromBufferAttribute(s,v),w.copy(A);let P=a[v];M.copy(P),M.sub(A.multiplyScalar(A.dot(P))).normalize(),_.crossVectors(w,P);let I=_.dot(l[v])<0?-1:1;o.setXYZW(v,M.x,M.y,M.z,I)}h(T,"handleVertex");for(let v=0,P=S.length;v<P;++v){let C=S[v],I=C.start,D=C.count;for(let L=I,H=I+D;L<H;L+=3)T(e.getX(L+0)),T(e.getX(L+1)),T(e.getX(L+2))}this._transformed=!0}computeVertexNormals(){let e=this.index,t=this.getAttribute("position");if(t!==void 0){let n=this.getAttribute("normal");if(n===void 0||n.count!==t.count)n=new ln(new Float32Array(t.count*3),3),this.setAttribute("normal",n);else for(let d=0,g=n.count;d<g;d++)n.setXYZ(d,0,0,0);let s=new O,r=new O,o=new O,a=new O,l=new O,c=new O,u=new O,f=new O;if(e)for(let d=0,g=e.count;d<g;d+=3){let m=e.getX(d+0),y=e.getX(d+1),p=e.getX(d+2);s.fromBufferAttribute(t,m),r.fromBufferAttribute(t,y),o.fromBufferAttribute(t,p),u.subVectors(o,r),f.subVectors(s,r),u.cross(f),a.fromBufferAttribute(n,m),l.fromBufferAttribute(n,y),c.fromBufferAttribute(n,p),a.add(u),l.add(u),c.add(u),n.setXYZ(m,a.x,a.y,a.z),n.setXYZ(y,l.x,l.y,l.z),n.setXYZ(p,c.x,c.y,c.z)}else for(let d=0,g=t.count;d<g;d+=3)s.fromBufferAttribute(t,d+0),r.fromBufferAttribute(t,d+1),o.fromBufferAttribute(t,d+2),u.subVectors(o,r),f.subVectors(s,r),u.cross(f),n.setXYZ(d+0,u.x,u.y,u.z),n.setXYZ(d+1,u.x,u.y,u.z),n.setXYZ(d+2,u.x,u.y,u.z);this.normalizeNormals(),n.needsUpdate=!0}}normalizeNormals(){let e=this.attributes.normal;for(let t=0,n=e.count;t<n;t++)Bt.fromBufferAttribute(e,t),Bt.normalize(),e.setXYZ(t,Bt.x,Bt.y,Bt.z)}toNonIndexed(){function e(a,l){let c=a.array,u=a.itemSize,f=a.normalized,d=new c.constructor(l.length*u),g=0,m=0;for(let y=0,p=l.length;y<p;y++){a.isInterleavedBufferAttribute?g=l[y]*a.data.stride+a.offset:g=l[y]*u;for(let x=0;x<u;x++)d[m++]=c[g++]}return new ln(d,u,f)}if(h(e,"convertBufferAttribute"),this.index===null)return Ce("BufferGeometry.toNonIndexed(): BufferGeometry is already non-indexed."),this;let t=new Ka,n=this.index.array,s=this.attributes;for(let a in s){let l=s[a],c=e(l,n);t.setAttribute(a,c)}let r=this.morphAttributes;for(let a in r){let l=[],c=r[a];for(let u=0,f=c.length;u<f;u++){let d=c[u],g=e(d,n);l.push(g)}t.morphAttributes[a]=l}t.morphTargetsRelative=this.morphTargetsRelative;let o=this.groups;for(let a=0,l=o.length;a<l;a++){let c=o[a];t.addGroup(c.start,c.count,c.materialIndex)}return t}toJSON(){let e={metadata:{version:4.7,type:"BufferGeometry",generator:"BufferGeometry.toJSON"}};if(e.uuid=this.uuid,e.type=this.parameters!==void 0&&this._transformed===!0?"BufferGeometry":this.type,this.name!==""&&(e.name=this.name),Object.keys(this.userData).length>0&&(e.userData=this.userData),this.parameters!==void 0&&this._transformed!==!0){let l=this.parameters;for(let c in l)l[c]!==void 0&&(e[c]=l[c]);return e}e.data={attributes:{}};let t=this.index;t!==null&&(e.data.index={type:t.array.constructor.name,array:Array.prototype.slice.call(t.array)});let n=this.attributes;for(let l in n){let c=n[l];e.data.attributes[l]=c.toJSON(e.data)}let s={},r=!1;for(let l in this.morphAttributes){let c=this.morphAttributes[l],u=[];for(let f=0,d=c.length;f<d;f++){let g=c[f];u.push(g.toJSON(e.data))}u.length>0&&(s[l]=u,r=!0)}r&&(e.data.morphAttributes=s,e.data.morphTargetsRelative=this.morphTargetsRelative);let o=this.groups;o.length>0&&(e.data.groups=JSON.parse(JSON.stringify(o)));let a=this.boundingSphere;return a!==null&&(e.data.boundingSphere=a.toJSON()),e}clone(){return new this.constructor().copy(this)}copy(e){this.index=null,this.attributes={},this.morphAttributes={},this.groups=[],this.boundingBox=null,this.boundingSphere=null;let t={};this.name=e.name;let n=e.index;n!==null&&this.setIndex(n.clone());let s=e.attributes;for(let c in s){let u=s[c];this.setAttribute(c,u.clone(t))}let r=e.morphAttributes;for(let c in r){let u=[],f=r[c];for(let d=0,g=f.length;d<g;d++)u.push(f[d].clone(t));this.morphAttributes[c]=u}this.morphTargetsRelative=e.morphTargetsRelative;let o=e.groups;for(let c=0,u=o.length;c<u;c++){let f=o[c];this.addGroup(f.start,f.count,f.materialIndex)}let a=e.boundingBox;a!==null&&(this.boundingBox=a.clone());let l=e.boundingSphere;return l!==null&&(this.boundingSphere=l.clone()),this.drawRange.start=e.drawRange.start,this.drawRange.count=e.drawRange.count,this.userData=e.userData,this._transformed=e._transformed,this}dispose(){this.dispatchEvent({type:"dispose"})}};h(Ka,"BufferGeometry");var Lt=Ka,pu=class pu{constructor(e,t){this.isInterleavedBuffer=!0,this.array=e,this.stride=t,this.count=e!==void 0?e.length/t:0,this.usage=_a,this.updateRanges=[],this.version=0,this.uuid=li()}onUploadCallback(){}set needsUpdate(e){e===!0&&this.version++}setUsage(e){return this.usage=e,this}addUpdateRange(e,t){this.updateRanges.push({start:e,count:t})}clearUpdateRanges(){this.updateRanges.length=0}copy(e){return this.array=new e.array.constructor(e.array),this.count=e.count,this.stride=e.stride,this.usage=e.usage,this}copyAt(e,t,n){e*=this.stride,n*=t.stride;for(let s=0,r=this.stride;s<r;s++)this.array[e+s]=t.array[n+s];return this}set(e,t=0){return this.array.set(e,t),this}clone(e){e.arrayBuffers===void 0&&(e.arrayBuffers={}),this.array.buffer._uuid===void 0&&(this.array.buffer._uuid=li()),e.arrayBuffers[this.array.buffer._uuid]===void 0&&(e.arrayBuffers[this.array.buffer._uuid]=this.array.slice(0).buffer);let t=new this.array.constructor(e.arrayBuffers[this.array.buffer._uuid]),n=new this.constructor(t,this.stride);return n.setUsage(this.usage),n}onUpload(e){return this.onUploadCallback=e,this}toJSON(e){return e.arrayBuffers===void 0&&(e.arrayBuffers={}),this.array.buffer._uuid===void 0&&(this.array.buffer._uuid=li()),e.arrayBuffers[this.array.buffer._uuid]===void 0&&(e.arrayBuffers[this.array.buffer._uuid]=Array.from(new Uint32Array(this.array.buffer))),{uuid:this.uuid,buffer:this.array.buffer._uuid,type:this.array.constructor.name,stride:this.stride}}};h(pu,"InterleavedBuffer");var wa=pu,en=new O,Za=class Za{constructor(e,t,n,s=!1){this.isInterleavedBufferAttribute=!0,this.name="",this.data=e,this.itemSize=t,this.offset=n,this.normalized=s}get count(){return this.data.count}get array(){return this.data.array}set needsUpdate(e){this.data.needsUpdate=e}applyMatrix4(e){for(let t=0,n=this.data.count;t<n;t++)en.fromBufferAttribute(this,t),en.applyMatrix4(e),this.setXYZ(t,en.x,en.y,en.z);return this}applyNormalMatrix(e){for(let t=0,n=this.count;t<n;t++)en.fromBufferAttribute(this,t),en.applyNormalMatrix(e),this.setXYZ(t,en.x,en.y,en.z);return this}transformDirection(e){for(let t=0,n=this.count;t<n;t++)en.fromBufferAttribute(this,t),en.transformDirection(e),this.setXYZ(t,en.x,en.y,en.z);return this}getComponent(e,t){let n=this.array[e*this.data.stride+this.offset+t];return this.normalized&&(n=Pn(n,this.array)),n}setComponent(e,t,n){return this.normalized&&(n=it(n,this.array)),this.data.array[e*this.data.stride+this.offset+t]=n,this}setX(e,t){return this.normalized&&(t=it(t,this.array)),this.data.array[e*this.data.stride+this.offset]=t,this}setY(e,t){return this.normalized&&(t=it(t,this.array)),this.data.array[e*this.data.stride+this.offset+1]=t,this}setZ(e,t){return this.normalized&&(t=it(t,this.array)),this.data.array[e*this.data.stride+this.offset+2]=t,this}setW(e,t){return this.normalized&&(t=it(t,this.array)),this.data.array[e*this.data.stride+this.offset+3]=t,this}getX(e){let t=this.data.array[e*this.data.stride+this.offset];return this.normalized&&(t=Pn(t,this.array)),t}getY(e){let t=this.data.array[e*this.data.stride+this.offset+1];return this.normalized&&(t=Pn(t,this.array)),t}getZ(e){let t=this.data.array[e*this.data.stride+this.offset+2];return this.normalized&&(t=Pn(t,this.array)),t}getW(e){let t=this.data.array[e*this.data.stride+this.offset+3];return this.normalized&&(t=Pn(t,this.array)),t}setXY(e,t,n){return e=e*this.data.stride+this.offset,this.normalized&&(t=it(t,this.array),n=it(n,this.array)),this.data.array[e+0]=t,this.data.array[e+1]=n,this}setXYZ(e,t,n,s){return e=e*this.data.stride+this.offset,this.normalized&&(t=it(t,this.array),n=it(n,this.array),s=it(s,this.array)),this.data.array[e+0]=t,this.data.array[e+1]=n,this.data.array[e+2]=s,this}setXYZW(e,t,n,s,r){return e=e*this.data.stride+this.offset,this.normalized&&(t=it(t,this.array),n=it(n,this.array),s=it(s,this.array),r=it(r,this.array)),this.data.array[e+0]=t,this.data.array[e+1]=n,this.data.array[e+2]=s,this.data.array[e+3]=r,this}clone(e){if(e===void 0){Sr("InterleavedBufferAttribute.clone(): Cloning an interleaved buffer attribute will de-interleave buffer data.");let t=[];for(let n=0;n<this.count;n++){let s=n*this.data.stride+this.offset;for(let r=0;r<this.itemSize;r++)t.push(this.data.array[s+r])}return new ln(new this.array.constructor(t),this.itemSize,this.normalized)}else return e.interleavedBuffers===void 0&&(e.interleavedBuffers={}),e.interleavedBuffers[this.data.uuid]===void 0&&(e.interleavedBuffers[this.data.uuid]=this.data.clone(e)),new Za(e.interleavedBuffers[this.data.uuid],this.itemSize,this.offset,this.normalized)}toJSON(e){if(e===void 0){Sr("InterleavedBufferAttribute.toJSON(): Serializing an interleaved buffer attribute will de-interleave buffer data.");let t=[];for(let n=0;n<this.count;n++){let s=n*this.data.stride+this.offset;for(let r=0;r<this.itemSize;r++)t.push(this.data.array[s+r])}return{itemSize:this.itemSize,type:this.array.constructor.name,array:t,normalized:this.normalized}}else return e.interleavedBuffers===void 0&&(e.interleavedBuffers={}),e.interleavedBuffers[this.data.uuid]===void 0&&(e.interleavedBuffers[this.data.uuid]=this.data.toJSON(e)),{isInterleavedBufferAttribute:!0,itemSize:this.itemSize,data:this.data.uuid,offset:this.offset,normalized:this.normalized}}};h(Za,"InterleavedBufferAttribute");var In=Za,Yx=0,mu=class mu extends Yn{constructor(){super(),this.isMaterial=!0,Object.defineProperty(this,"id",{value:Yx++}),this.uuid=li(),this.name="",this.type="Material",this.blending=ns,this.side=hi,this.vertexColors=!1,this.opacity=1,this.transparent=!1,this.alphaHash=!1,this.blendSrc=la,this.blendDst=ca,this.blendEquation=Li,this.blendSrcAlpha=null,this.blendDstAlpha=null,this.blendEquationAlpha=null,this.blendColor=new Xe(0,0,0),this.blendAlpha=0,this.depthFunc=is,this.depthTest=!0,this.depthWrite=!0,this.stencilWriteMask=255,this.stencilFunc=mh,this.stencilRef=0,this.stencilFuncMask=255,this.stencilFail=es,this.stencilZFail=es,this.stencilZPass=es,this.stencilWrite=!1,this.clippingPlanes=null,this.clipIntersection=!1,this.clipShadows=!1,this.shadowSide=null,this.colorWrite=!0,this.precision=null,this.polygonOffset=!1,this.polygonOffsetFactor=0,this.polygonOffsetUnits=0,this.dithering=!1,this.alphaToCoverage=!1,this.premultipliedAlpha=!1,this.forceSinglePass=!1,this.allowOverride=!0,this.visible=!0,this.toneMapped=!0,this.userData={},this.version=0,this._alphaTest=0}get alphaTest(){return this._alphaTest}set alphaTest(e){this._alphaTest>0!=e>0&&this.version++,this._alphaTest=e}onBeforeRender(){}onBeforeCompile(){}customProgramCacheKey(){return this.onBeforeCompile.toString()}setValues(e){if(e!==void 0)for(let t in e){let n=e[t];if(n===void 0){Ce(`Material: parameter '${t}' has value of undefined.`);continue}let s=this[t];if(s===void 0){Ce(`Material: '${t}' is not a property of THREE.${this.type}.`);continue}s&&s.isColor?s.set(n):s&&s.isVector2&&n&&n.isVector2||s&&s.isEuler&&n&&n.isEuler||s&&s.isVector3&&n&&n.isVector3?s.copy(n):this[t]=n}}toJSON(e){let t=e===void 0||typeof e=="string";t&&(e={textures:{},images:{}});let n={metadata:{version:4.7,type:"Material",generator:"Material.toJSON"}};n.uuid=this.uuid,n.type=this.type,this.name!==""&&(n.name=this.name),this.color&&this.color.isColor&&(n.color=this.color.getHex()),this.roughness!==void 0&&(n.roughness=this.roughness),this.metalness!==void 0&&(n.metalness=this.metalness),this.sheen!==void 0&&(n.sheen=this.sheen),this.sheenColor&&this.sheenColor.isColor&&(n.sheenColor=this.sheenColor.getHex()),this.sheenRoughness!==void 0&&(n.sheenRoughness=this.sheenRoughness),this.emissive&&this.emissive.isColor&&(n.emissive=this.emissive.getHex()),this.emissiveIntensity!==void 0&&this.emissiveIntensity!==1&&(n.emissiveIntensity=this.emissiveIntensity),this.specular&&this.specular.isColor&&(n.specular=this.specular.getHex()),this.specularIntensity!==void 0&&(n.specularIntensity=this.specularIntensity),this.specularColor&&this.specularColor.isColor&&(n.specularColor=this.specularColor.getHex()),this.shininess!==void 0&&(n.shininess=this.shininess),this.clearcoat!==void 0&&(n.clearcoat=this.clearcoat),this.clearcoatRoughness!==void 0&&(n.clearcoatRoughness=this.clearcoatRoughness),this.clearcoatMap&&this.clearcoatMap.isTexture&&(n.clearcoatMap=this.clearcoatMap.toJSON(e).uuid),this.clearcoatRoughnessMap&&this.clearcoatRoughnessMap.isTexture&&(n.clearcoatRoughnessMap=this.clearcoatRoughnessMap.toJSON(e).uuid),this.clearcoatNormalMap&&this.clearcoatNormalMap.isTexture&&(n.clearcoatNormalMap=this.clearcoatNormalMap.toJSON(e).uuid,n.clearcoatNormalScale=this.clearcoatNormalScale.toArray()),this.sheenColorMap&&this.sheenColorMap.isTexture&&(n.sheenColorMap=this.sheenColorMap.toJSON(e).uuid),this.sheenRoughnessMap&&this.sheenRoughnessMap.isTexture&&(n.sheenRoughnessMap=this.sheenRoughnessMap.toJSON(e).uuid),this.dispersion!==void 0&&(n.dispersion=this.dispersion),this.iridescence!==void 0&&(n.iridescence=this.iridescence),this.iridescenceIOR!==void 0&&(n.iridescenceIOR=this.iridescenceIOR),this.iridescenceThicknessRange!==void 0&&(n.iridescenceThicknessRange=this.iridescenceThicknessRange),this.iridescenceMap&&this.iridescenceMap.isTexture&&(n.iridescenceMap=this.iridescenceMap.toJSON(e).uuid),this.iridescenceThicknessMap&&this.iridescenceThicknessMap.isTexture&&(n.iridescenceThicknessMap=this.iridescenceThicknessMap.toJSON(e).uuid),this.anisotropy!==void 0&&(n.anisotropy=this.anisotropy),this.anisotropyRotation!==void 0&&(n.anisotropyRotation=this.anisotropyRotation),this.anisotropyMap&&this.anisotropyMap.isTexture&&(n.anisotropyMap=this.anisotropyMap.toJSON(e).uuid),this.map&&this.map.isTexture&&(n.map=this.map.toJSON(e).uuid),this.matcap&&this.matcap.isTexture&&(n.matcap=this.matcap.toJSON(e).uuid),this.alphaMap&&this.alphaMap.isTexture&&(n.alphaMap=this.alphaMap.toJSON(e).uuid),this.lightMap&&this.lightMap.isTexture&&(n.lightMap=this.lightMap.toJSON(e).uuid,n.lightMapIntensity=this.lightMapIntensity),this.aoMap&&this.aoMap.isTexture&&(n.aoMap=this.aoMap.toJSON(e).uuid,n.aoMapIntensity=this.aoMapIntensity),this.bumpMap&&this.bumpMap.isTexture&&(n.bumpMap=this.bumpMap.toJSON(e).uuid,n.bumpScale=this.bumpScale),this.normalMap&&this.normalMap.isTexture&&(n.normalMap=this.normalMap.toJSON(e).uuid,n.normalMapType=this.normalMapType,n.normalScale=this.normalScale.toArray()),this.displacementMap&&this.displacementMap.isTexture&&(n.displacementMap=this.displacementMap.toJSON(e).uuid,n.displacementScale=this.displacementScale,n.displacementBias=this.displacementBias),this.roughnessMap&&this.roughnessMap.isTexture&&(n.roughnessMap=this.roughnessMap.toJSON(e).uuid),this.metalnessMap&&this.metalnessMap.isTexture&&(n.metalnessMap=this.metalnessMap.toJSON(e).uuid),this.emissiveMap&&this.emissiveMap.isTexture&&(n.emissiveMap=this.emissiveMap.toJSON(e).uuid),this.specularMap&&this.specularMap.isTexture&&(n.specularMap=this.specularMap.toJSON(e).uuid),this.specularIntensityMap&&this.specularIntensityMap.isTexture&&(n.specularIntensityMap=this.specularIntensityMap.toJSON(e).uuid),this.specularColorMap&&this.specularColorMap.isTexture&&(n.specularColorMap=this.specularColorMap.toJSON(e).uuid),this.envMap&&this.envMap.isTexture&&(n.envMap=this.envMap.toJSON(e).uuid,this.combine!==void 0&&(n.combine=this.combine)),this.envMapRotation!==void 0&&(n.envMapRotation=this.envMapRotation.toArray()),this.envMapIntensity!==void 0&&(n.envMapIntensity=this.envMapIntensity),this.reflectivity!==void 0&&(n.reflectivity=this.reflectivity),this.refractionRatio!==void 0&&(n.refractionRatio=this.refractionRatio),this.gradientMap&&this.gradientMap.isTexture&&(n.gradientMap=this.gradientMap.toJSON(e).uuid),this.transmission!==void 0&&(n.transmission=this.transmission),this.transmissionMap&&this.transmissionMap.isTexture&&(n.transmissionMap=this.transmissionMap.toJSON(e).uuid),this.thickness!==void 0&&(n.thickness=this.thickness),this.thicknessMap&&this.thicknessMap.isTexture&&(n.thicknessMap=this.thicknessMap.toJSON(e).uuid),this.attenuationDistance!==void 0&&this.attenuationDistance!==1/0&&(n.attenuationDistance=this.attenuationDistance),this.attenuationColor!==void 0&&(n.attenuationColor=this.attenuationColor.getHex()),this.size!==void 0&&(n.size=this.size),this.shadowSide!==null&&(n.shadowSide=this.shadowSide),this.sizeAttenuation!==void 0&&(n.sizeAttenuation=this.sizeAttenuation),this.blending!==ns&&(n.blending=this.blending),this.side!==hi&&(n.side=this.side),this.vertexColors===!0&&(n.vertexColors=!0),this.opacity<1&&(n.opacity=this.opacity),this.transparent===!0&&(n.transparent=!0),this.blendSrc!==la&&(n.blendSrc=this.blendSrc),this.blendDst!==ca&&(n.blendDst=this.blendDst),this.blendEquation!==Li&&(n.blendEquation=this.blendEquation),this.blendSrcAlpha!==null&&(n.blendSrcAlpha=this.blendSrcAlpha),this.blendDstAlpha!==null&&(n.blendDstAlpha=this.blendDstAlpha),this.blendEquationAlpha!==null&&(n.blendEquationAlpha=this.blendEquationAlpha),this.blendColor&&this.blendColor.isColor&&(n.blendColor=this.blendColor.getHex()),this.blendAlpha!==0&&(n.blendAlpha=this.blendAlpha),this.depthFunc!==is&&(n.depthFunc=this.depthFunc),this.depthTest===!1&&(n.depthTest=this.depthTest),this.depthWrite===!1&&(n.depthWrite=this.depthWrite),this.colorWrite===!1&&(n.colorWrite=this.colorWrite),this.stencilWriteMask!==255&&(n.stencilWriteMask=this.stencilWriteMask),this.stencilFunc!==mh&&(n.stencilFunc=this.stencilFunc),this.stencilRef!==0&&(n.stencilRef=this.stencilRef),this.stencilFuncMask!==255&&(n.stencilFuncMask=this.stencilFuncMask),this.stencilFail!==es&&(n.stencilFail=this.stencilFail),this.stencilZFail!==es&&(n.stencilZFail=this.stencilZFail),this.stencilZPass!==es&&(n.stencilZPass=this.stencilZPass),this.stencilWrite===!0&&(n.stencilWrite=this.stencilWrite),this.rotation!==void 0&&this.rotation!==0&&(n.rotation=this.rotation),this.polygonOffset===!0&&(n.polygonOffset=!0),this.polygonOffsetFactor!==0&&(n.polygonOffsetFactor=this.polygonOffsetFactor),this.polygonOffsetUnits!==0&&(n.polygonOffsetUnits=this.polygonOffsetUnits),this.linewidth!==void 0&&this.linewidth!==1&&(n.linewidth=this.linewidth),this.dashSize!==void 0&&(n.dashSize=this.dashSize),this.gapSize!==void 0&&(n.gapSize=this.gapSize),this.scale!==void 0&&(n.scale=this.scale),this.dithering===!0&&(n.dithering=!0),this.alphaTest>0&&(n.alphaTest=this.alphaTest),this.alphaHash===!0&&(n.alphaHash=!0),this.alphaToCoverage===!0&&(n.alphaToCoverage=!0),this.premultipliedAlpha===!0&&(n.premultipliedAlpha=!0),this.forceSinglePass===!0&&(n.forceSinglePass=!0),this.allowOverride===!1&&(n.allowOverride=!1),this.wireframe===!0&&(n.wireframe=!0),this.wireframeLinewidth>1&&(n.wireframeLinewidth=this.wireframeLinewidth),this.wireframeLinecap!=="round"&&(n.wireframeLinecap=this.wireframeLinecap),this.wireframeLinejoin!=="round"&&(n.wireframeLinejoin=this.wireframeLinejoin),this.flatShading===!0&&(n.flatShading=!0),this.visible===!1&&(n.visible=!1),this.toneMapped===!1&&(n.toneMapped=!1),this.fog===!1&&(n.fog=!1),Object.keys(this.userData).length>0&&(n.userData=this.userData);function s(r){let o=[];for(let a in r){let l=r[a];delete l.metadata,o.push(l)}return o}if(h(s,"extractFromCache"),t){let r=s(e.textures),o=s(e.images);r.length>0&&(n.textures=r),o.length>0&&(n.images=o)}return n}fromJSON(e,t){if(e.uuid!==void 0&&(this.uuid=e.uuid),e.name!==void 0&&(this.name=e.name),e.color!==void 0&&this.color!==void 0&&this.color.setHex(e.color),e.roughness!==void 0&&(this.roughness=e.roughness),e.metalness!==void 0&&(this.metalness=e.metalness),e.sheen!==void 0&&(this.sheen=e.sheen),e.sheenColor!==void 0&&(this.sheenColor=new Xe().setHex(e.sheenColor)),e.sheenRoughness!==void 0&&(this.sheenRoughness=e.sheenRoughness),e.emissive!==void 0&&this.emissive!==void 0&&this.emissive.setHex(e.emissive),e.specular!==void 0&&this.specular!==void 0&&this.specular.setHex(e.specular),e.specularIntensity!==void 0&&(this.specularIntensity=e.specularIntensity),e.specularColor!==void 0&&this.specularColor!==void 0&&this.specularColor.setHex(e.specularColor),e.shininess!==void 0&&(this.shininess=e.shininess),e.clearcoat!==void 0&&(this.clearcoat=e.clearcoat),e.clearcoatRoughness!==void 0&&(this.clearcoatRoughness=e.clearcoatRoughness),e.dispersion!==void 0&&(this.dispersion=e.dispersion),e.iridescence!==void 0&&(this.iridescence=e.iridescence),e.iridescenceIOR!==void 0&&(this.iridescenceIOR=e.iridescenceIOR),e.iridescenceThicknessRange!==void 0&&(this.iridescenceThicknessRange=e.iridescenceThicknessRange),e.transmission!==void 0&&(this.transmission=e.transmission),e.thickness!==void 0&&(this.thickness=e.thickness),e.attenuationDistance!==void 0&&(this.attenuationDistance=e.attenuationDistance),e.attenuationColor!==void 0&&this.attenuationColor!==void 0&&this.attenuationColor.setHex(e.attenuationColor),e.anisotropy!==void 0&&(this.anisotropy=e.anisotropy),e.anisotropyRotation!==void 0&&(this.anisotropyRotation=e.anisotropyRotation),e.fog!==void 0&&(this.fog=e.fog),e.flatShading!==void 0&&(this.flatShading=e.flatShading),e.blending!==void 0&&(this.blending=e.blending),e.combine!==void 0&&(this.combine=e.combine),e.side!==void 0&&(this.side=e.side),e.shadowSide!==void 0&&(this.shadowSide=e.shadowSide),e.opacity!==void 0&&(this.opacity=e.opacity),e.transparent!==void 0&&(this.transparent=e.transparent),e.alphaTest!==void 0&&(this.alphaTest=e.alphaTest),e.alphaHash!==void 0&&(this.alphaHash=e.alphaHash),e.depthFunc!==void 0&&(this.depthFunc=e.depthFunc),e.depthTest!==void 0&&(this.depthTest=e.depthTest),e.depthWrite!==void 0&&(this.depthWrite=e.depthWrite),e.colorWrite!==void 0&&(this.colorWrite=e.colorWrite),e.blendSrc!==void 0&&(this.blendSrc=e.blendSrc),e.blendDst!==void 0&&(this.blendDst=e.blendDst),e.blendEquation!==void 0&&(this.blendEquation=e.blendEquation),e.blendSrcAlpha!==void 0&&(this.blendSrcAlpha=e.blendSrcAlpha),e.blendDstAlpha!==void 0&&(this.blendDstAlpha=e.blendDstAlpha),e.blendEquationAlpha!==void 0&&(this.blendEquationAlpha=e.blendEquationAlpha),e.blendColor!==void 0&&this.blendColor!==void 0&&this.blendColor.setHex(e.blendColor),e.blendAlpha!==void 0&&(this.blendAlpha=e.blendAlpha),e.stencilWriteMask!==void 0&&(this.stencilWriteMask=e.stencilWriteMask),e.stencilFunc!==void 0&&(this.stencilFunc=e.stencilFunc),e.stencilRef!==void 0&&(this.stencilRef=e.stencilRef),e.stencilFuncMask!==void 0&&(this.stencilFuncMask=e.stencilFuncMask),e.stencilFail!==void 0&&(this.stencilFail=e.stencilFail),e.stencilZFail!==void 0&&(this.stencilZFail=e.stencilZFail),e.stencilZPass!==void 0&&(this.stencilZPass=e.stencilZPass),e.stencilWrite!==void 0&&(this.stencilWrite=e.stencilWrite),e.wireframe!==void 0&&(this.wireframe=e.wireframe),e.wireframeLinewidth!==void 0&&(this.wireframeLinewidth=e.wireframeLinewidth),e.wireframeLinecap!==void 0&&(this.wireframeLinecap=e.wireframeLinecap),e.wireframeLinejoin!==void 0&&(this.wireframeLinejoin=e.wireframeLinejoin),e.rotation!==void 0&&(this.rotation=e.rotation),e.linewidth!==void 0&&(this.linewidth=e.linewidth),e.dashSize!==void 0&&(this.dashSize=e.dashSize),e.gapSize!==void 0&&(this.gapSize=e.gapSize),e.scale!==void 0&&(this.scale=e.scale),e.polygonOffset!==void 0&&(this.polygonOffset=e.polygonOffset),e.polygonOffsetFactor!==void 0&&(this.polygonOffsetFactor=e.polygonOffsetFactor),e.polygonOffsetUnits!==void 0&&(this.polygonOffsetUnits=e.polygonOffsetUnits),e.dithering!==void 0&&(this.dithering=e.dithering),e.alphaToCoverage!==void 0&&(this.alphaToCoverage=e.alphaToCoverage),e.premultipliedAlpha!==void 0&&(this.premultipliedAlpha=e.premultipliedAlpha),e.forceSinglePass!==void 0&&(this.forceSinglePass=e.forceSinglePass),e.allowOverride!==void 0&&(this.allowOverride=e.allowOverride),e.visible!==void 0&&(this.visible=e.visible),e.toneMapped!==void 0&&(this.toneMapped=e.toneMapped),e.userData!==void 0&&(this.userData=e.userData),e.vertexColors!==void 0&&(typeof e.vertexColors=="number"?this.vertexColors=e.vertexColors>0:this.vertexColors=e.vertexColors),e.size!==void 0&&(this.size=e.size),e.sizeAttenuation!==void 0&&(this.sizeAttenuation=e.sizeAttenuation),e.map!==void 0&&(this.map=t[e.map]||null),e.matcap!==void 0&&(this.matcap=t[e.matcap]||null),e.alphaMap!==void 0&&(this.alphaMap=t[e.alphaMap]||null),e.bumpMap!==void 0&&(this.bumpMap=t[e.bumpMap]||null),e.bumpScale!==void 0&&(this.bumpScale=e.bumpScale),e.normalMap!==void 0&&(this.normalMap=t[e.normalMap]||null),e.normalMapType!==void 0&&(this.normalMapType=e.normalMapType),e.normalScale!==void 0){let n=e.normalScale;Array.isArray(n)===!1&&(n=[n,n]),this.normalScale=new We().fromArray(n)}return e.displacementMap!==void 0&&(this.displacementMap=t[e.displacementMap]||null),e.displacementScale!==void 0&&(this.displacementScale=e.displacementScale),e.displacementBias!==void 0&&(this.displacementBias=e.displacementBias),e.roughnessMap!==void 0&&(this.roughnessMap=t[e.roughnessMap]||null),e.metalnessMap!==void 0&&(this.metalnessMap=t[e.metalnessMap]||null),e.emissiveMap!==void 0&&(this.emissiveMap=t[e.emissiveMap]||null),e.emissiveIntensity!==void 0&&(this.emissiveIntensity=e.emissiveIntensity),e.specularMap!==void 0&&(this.specularMap=t[e.specularMap]||null),e.specularIntensityMap!==void 0&&(this.specularIntensityMap=t[e.specularIntensityMap]||null),e.specularColorMap!==void 0&&(this.specularColorMap=t[e.specularColorMap]||null),e.envMap!==void 0&&(this.envMap=t[e.envMap]||null),e.envMapRotation!==void 0&&this.envMapRotation.fromArray(e.envMapRotation),e.envMapIntensity!==void 0&&(this.envMapIntensity=e.envMapIntensity),e.reflectivity!==void 0&&(this.reflectivity=e.reflectivity),e.refractionRatio!==void 0&&(this.refractionRatio=e.refractionRatio),e.lightMap!==void 0&&(this.lightMap=t[e.lightMap]||null),e.lightMapIntensity!==void 0&&(this.lightMapIntensity=e.lightMapIntensity),e.aoMap!==void 0&&(this.aoMap=t[e.aoMap]||null),e.aoMapIntensity!==void 0&&(this.aoMapIntensity=e.aoMapIntensity),e.gradientMap!==void 0&&(this.gradientMap=t[e.gradientMap]||null),e.clearcoatMap!==void 0&&(this.clearcoatMap=t[e.clearcoatMap]||null),e.clearcoatRoughnessMap!==void 0&&(this.clearcoatRoughnessMap=t[e.clearcoatRoughnessMap]||null),e.clearcoatNormalMap!==void 0&&(this.clearcoatNormalMap=t[e.clearcoatNormalMap]||null),e.clearcoatNormalScale!==void 0&&(this.clearcoatNormalScale=new We().fromArray(e.clearcoatNormalScale)),e.iridescenceMap!==void 0&&(this.iridescenceMap=t[e.iridescenceMap]||null),e.iridescenceThicknessMap!==void 0&&(this.iridescenceThicknessMap=t[e.iridescenceThicknessMap]||null),e.transmissionMap!==void 0&&(this.transmissionMap=t[e.transmissionMap]||null),e.thicknessMap!==void 0&&(this.thicknessMap=t[e.thicknessMap]||null),e.anisotropyMap!==void 0&&(this.anisotropyMap=t[e.anisotropyMap]||null),e.sheenColorMap!==void 0&&(this.sheenColorMap=t[e.sheenColorMap]||null),e.sheenRoughnessMap!==void 0&&(this.sheenRoughnessMap=t[e.sheenRoughnessMap]||null),this}clone(){return new this.constructor().copy(this)}copy(e){this.name=e.name,this.blending=e.blending,this.side=e.side,this.vertexColors=e.vertexColors,this.opacity=e.opacity,this.transparent=e.transparent,this.blendSrc=e.blendSrc,this.blendDst=e.blendDst,this.blendEquation=e.blendEquation,this.blendSrcAlpha=e.blendSrcAlpha,this.blendDstAlpha=e.blendDstAlpha,this.blendEquationAlpha=e.blendEquationAlpha,this.blendColor.copy(e.blendColor),this.blendAlpha=e.blendAlpha,this.depthFunc=e.depthFunc,this.depthTest=e.depthTest,this.depthWrite=e.depthWrite,this.stencilWriteMask=e.stencilWriteMask,this.stencilFunc=e.stencilFunc,this.stencilRef=e.stencilRef,this.stencilFuncMask=e.stencilFuncMask,this.stencilFail=e.stencilFail,this.stencilZFail=e.stencilZFail,this.stencilZPass=e.stencilZPass,this.stencilWrite=e.stencilWrite;let t=e.clippingPlanes,n=null;if(t!==null){let s=t.length;n=new Array(s);for(let r=0;r!==s;++r)n[r]=t[r].clone()}return this.clippingPlanes=n,this.clipIntersection=e.clipIntersection,this.clipShadows=e.clipShadows,this.shadowSide=e.shadowSide,this.colorWrite=e.colorWrite,this.precision=e.precision,this.polygonOffset=e.polygonOffset,this.polygonOffsetFactor=e.polygonOffsetFactor,this.polygonOffsetUnits=e.polygonOffsetUnits,this.dithering=e.dithering,this.alphaTest=e.alphaTest,this.alphaHash=e.alphaHash,this.alphaToCoverage=e.alphaToCoverage,this.premultipliedAlpha=e.premultipliedAlpha,this.forceSinglePass=e.forceSinglePass,this.allowOverride=e.allowOverride,this.visible=e.visible,this.toneMapped=e.toneMapped,this.userData=JSON.parse(JSON.stringify(e.userData)),this}dispose(){this.dispatchEvent({type:"dispose"})}set needsUpdate(e){e===!0&&this.version++}};h(mu,"Material");var Fi=mu;var oi=new O,sh=new O,Go=new O,Ai=new O,rh=new O,Wo=new O,oh=new O,gu=class gu{constructor(e=new O,t=new O(0,0,-1)){this.origin=e,this.direction=t}set(e,t){return this.origin.copy(e),this.direction.copy(t),this}copy(e){return this.origin.copy(e.origin),this.direction.copy(e.direction),this}at(e,t){return t.copy(this.origin).addScaledVector(this.direction,e)}lookAt(e){return this.direction.copy(e).sub(this.origin).normalize(),this}recast(e){return this.origin.copy(this.at(e,oi)),this}closestPointToPoint(e,t){t.subVectors(e,this.origin);let n=t.dot(this.direction);return n<0?t.copy(this.origin):t.copy(this.origin).addScaledVector(this.direction,n)}distanceToPoint(e){return Math.sqrt(this.distanceSqToPoint(e))}distanceSqToPoint(e){let t=oi.subVectors(e,this.origin).dot(this.direction);return t<0?this.origin.distanceToSquared(e):(oi.copy(this.origin).addScaledVector(this.direction,t),oi.distanceToSquared(e))}distanceSqToSegment(e,t,n,s){sh.copy(e).add(t).multiplyScalar(.5),Go.copy(t).sub(e).normalize(),Ai.copy(this.origin).sub(sh);let r=e.distanceTo(t)*.5,o=-this.direction.dot(Go),a=Ai.dot(this.direction),l=-Ai.dot(Go),c=Ai.lengthSq(),u=Math.abs(1-o*o),f,d,g,m;if(u>0)if(f=o*l-a,d=o*a-l,m=r*u,f>=0)if(d>=-m)if(d<=m){let y=1/u;f*=y,d*=y,g=f*(f+o*d+2*a)+d*(o*f+d+2*l)+c}else d=r,f=Math.max(0,-(o*d+a)),g=-f*f+d*(d+2*l)+c;else d=-r,f=Math.max(0,-(o*d+a)),g=-f*f+d*(d+2*l)+c;else d<=-m?(f=Math.max(0,-(-o*r+a)),d=f>0?-r:Math.min(Math.max(-r,-l),r),g=-f*f+d*(d+2*l)+c):d<=m?(f=0,d=Math.min(Math.max(-r,-l),r),g=d*(d+2*l)+c):(f=Math.max(0,-(o*r+a)),d=f>0?r:Math.min(Math.max(-r,-l),r),g=-f*f+d*(d+2*l)+c);else d=o>0?-r:r,f=Math.max(0,-(o*d+a)),g=-f*f+d*(d+2*l)+c;return n&&n.copy(this.origin).addScaledVector(this.direction,f),s&&s.copy(sh).addScaledVector(Go,d),g}intersectSphere(e,t){oi.subVectors(e.center,this.origin);let n=oi.dot(this.direction),s=oi.dot(oi)-n*n,r=e.radius*e.radius;if(s>r)return null;let o=Math.sqrt(r-s),a=n-o,l=n+o;return l<0?null:a<0?this.at(l,t):this.at(a,t)}intersectsSphere(e){return e.radius<0?!1:this.distanceSqToPoint(e.center)<=e.radius*e.radius}distanceToPlane(e){let t=e.normal.dot(this.direction);if(t===0)return e.distanceToPoint(this.origin)===0?0:null;let n=-(this.origin.dot(e.normal)+e.constant)/t;return n>=0?n:null}intersectPlane(e,t){let n=this.distanceToPlane(e);return n===null?null:this.at(n,t)}intersectsPlane(e){let t=e.distanceToPoint(this.origin);return t===0||e.normal.dot(this.direction)*t<0}intersectBox(e,t){let n,s,r,o,a,l,c=1/this.direction.x,u=1/this.direction.y,f=1/this.direction.z,d=this.origin;return c>=0?(n=(e.min.x-d.x)*c,s=(e.max.x-d.x)*c):(n=(e.max.x-d.x)*c,s=(e.min.x-d.x)*c),u>=0?(r=(e.min.y-d.y)*u,o=(e.max.y-d.y)*u):(r=(e.max.y-d.y)*u,o=(e.min.y-d.y)*u),n>o||r>s||((r>n||isNaN(n))&&(n=r),(o<s||isNaN(s))&&(s=o),f>=0?(a=(e.min.z-d.z)*f,l=(e.max.z-d.z)*f):(a=(e.max.z-d.z)*f,l=(e.min.z-d.z)*f),n>l||a>s)||((a>n||n!==n)&&(n=a),(l<s||s!==s)&&(s=l),s<0)?null:this.at(n>=0?n:s,t)}intersectsBox(e){return this.intersectBox(e,oi)!==null}intersectTriangle(e,t,n,s,r){rh.subVectors(t,e),Wo.subVectors(n,e),oh.crossVectors(rh,Wo);let o=this.direction.dot(oh),a;if(o>0){if(s)return null;a=1}else if(o<0)a=-1,o=-o;else return null;Ai.subVectors(this.origin,e);let l=a*this.direction.dot(Wo.crossVectors(Ai,Wo));if(l<0)return null;let c=a*this.direction.dot(rh.cross(Ai));if(c<0||l+c>o)return null;let u=-a*Ai.dot(oh);return u<0?null:this.at(u/o,r)}applyMatrix4(e){return this.origin.applyMatrix4(e),this.direction.transformDirection(e),this}equals(e){return e.origin.equals(this.origin)&&e.direction.equals(this.direction)}clone(){return new this.constructor().copy(this)}};h(gu,"Ray");var Pr=gu,xu=class xu extends Fi{constructor(e){super(),this.isMeshBasicMaterial=!0,this.type="MeshBasicMaterial",this.color=new Xe(16777215),this.map=null,this.lightMap=null,this.lightMapIntensity=1,this.aoMap=null,this.aoMapIntensity=1,this.specularMap=null,this.alphaMap=null,this.envMap=null,this.envMapRotation=new Di,this.combine=Eh,this.reflectivity=1,this.refractionRatio=.98,this.wireframe=!1,this.wireframeLinewidth=1,this.wireframeLinecap="round",this.wireframeLinejoin="round",this.fog=!0,this.setValues(e)}copy(e){return super.copy(e),this.color.copy(e.color),this.map=e.map,this.lightMap=e.lightMap,this.lightMapIntensity=e.lightMapIntensity,this.aoMap=e.aoMap,this.aoMapIntensity=e.aoMapIntensity,this.specularMap=e.specularMap,this.alphaMap=e.alphaMap,this.envMap=e.envMap,this.envMapRotation.copy(e.envMapRotation),this.combine=e.combine,this.reflectivity=e.reflectivity,this.refractionRatio=e.refractionRatio,this.wireframe=e.wireframe,this.wireframeLinewidth=e.wireframeLinewidth,this.wireframeLinecap=e.wireframeLinecap,this.wireframeLinejoin=e.wireframeLinejoin,this.fog=e.fog,this}};h(xu,"MeshBasicMaterial");var Ln=xu,mp=new ct,ji=new Pr,Xo=new Cn,gp=new O,qo=new O,Yo=new O,$o=new O,ah=new O,Ko=new O,xp=new O,Zo=new O,yu=class yu extends mn{constructor(e=new Lt,t=new Ln){super(),this.isMesh=!0,this.type="Mesh",this.geometry=e,this.material=t,this.morphTargetDictionary=void 0,this.morphTargetInfluences=void 0,this.count=1,this.updateMorphTargets()}copy(e,t){return super.copy(e,t),e.morphTargetInfluences!==void 0&&(this.morphTargetInfluences=e.morphTargetInfluences.slice()),e.morphTargetDictionary!==void 0&&(this.morphTargetDictionary=Object.assign({},e.morphTargetDictionary)),this.material=Array.isArray(e.material)?e.material.slice():e.material,this.geometry=e.geometry,this}updateMorphTargets(){let t=this.geometry.morphAttributes,n=Object.keys(t);if(n.length>0){let s=t[n[0]];if(s!==void 0){this.morphTargetInfluences=[],this.morphTargetDictionary={};for(let r=0,o=s.length;r<o;r++){let a=s[r].name||String(r);this.morphTargetInfluences.push(0),this.morphTargetDictionary[a]=r}}}}getVertexPosition(e,t){let n=this.geometry,s=n.attributes.position,r=n.morphAttributes.position,o=n.morphTargetsRelative;t.fromBufferAttribute(s,e);let a=this.morphTargetInfluences;if(r&&a){Ko.set(0,0,0);for(let l=0,c=r.length;l<c;l++){let u=a[l],f=r[l];u!==0&&(ah.fromBufferAttribute(f,e),o?Ko.addScaledVector(ah,u):Ko.addScaledVector(ah.sub(t),u))}t.add(Ko)}return t}raycast(e,t){let n=this.geometry,s=this.material,r=this.matrixWorld;s!==void 0&&(n.boundingSphere===null&&n.computeBoundingSphere(),Xo.copy(n.boundingSphere),Xo.applyMatrix4(r),ji.copy(e.ray).recast(e.near),!(Xo.containsPoint(ji.origin)===!1&&(ji.intersectSphere(Xo,gp)===null||ji.origin.distanceToSquared(gp)>(e.far-e.near)**2))&&(mp.copy(r).invert(),ji.copy(e.ray).applyMatrix4(mp),!(n.boundingBox!==null&&ji.intersectsBox(n.boundingBox)===!1)&&this._computeIntersections(e,t,ji)))}_computeIntersections(e,t,n){let s,r=this.geometry,o=this.material,a=r.index,l=r.attributes.position,c=r.attributes.uv,u=r.attributes.uv1,f=r.attributes.normal,d=r.groups,g=r.drawRange;if(a!==null)if(Array.isArray(o))for(let m=0,y=d.length;m<y;m++){let p=d[m],x=o[p.materialIndex],S=Math.max(p.start,g.start),M=Math.min(a.count,Math.min(p.start+p.count,g.start+g.count));for(let _=S,A=M;_<A;_+=3){let w=a.getX(_),T=a.getX(_+1),v=a.getX(_+2);s=Jo(this,x,e,n,c,u,f,w,T,v),s&&(s.faceIndex=Math.floor(_/3),s.face.materialIndex=p.materialIndex,t.push(s))}}else{let m=Math.max(0,g.start),y=Math.min(a.count,g.start+g.count);for(let p=m,x=y;p<x;p+=3){let S=a.getX(p),M=a.getX(p+1),_=a.getX(p+2);s=Jo(this,o,e,n,c,u,f,S,M,_),s&&(s.faceIndex=Math.floor(p/3),t.push(s))}}else if(l!==void 0)if(Array.isArray(o))for(let m=0,y=d.length;m<y;m++){let p=d[m],x=o[p.materialIndex],S=Math.max(p.start,g.start),M=Math.min(l.count,Math.min(p.start+p.count,g.start+g.count));for(let _=S,A=M;_<A;_+=3){let w=_,T=_+1,v=_+2;s=Jo(this,x,e,n,c,u,f,w,T,v),s&&(s.faceIndex=Math.floor(_/3),s.face.materialIndex=p.materialIndex,t.push(s))}}else{let m=Math.max(0,g.start),y=Math.min(l.count,g.start+g.count);for(let p=m,x=y;p<x;p+=3){let S=p,M=p+1,_=p+2;s=Jo(this,o,e,n,c,u,f,S,M,_),s&&(s.faceIndex=Math.floor(p/3),t.push(s))}}}};h(yu,"Mesh");var Tt=yu;function $x(i,e,t,n,s,r,o,a){let l;if(e.side===nn?l=n.intersectTriangle(o,r,s,!0,a):l=n.intersectTriangle(s,r,o,e.side===hi,a),l===null)return null;Zo.copy(a),Zo.applyMatrix4(i.matrixWorld);let c=t.ray.origin.distanceTo(Zo);return c<t.near||c>t.far?null:{distance:c,point:Zo.clone(),object:i}}h($x,"checkIntersection$1");function Jo(i,e,t,n,s,r,o,a,l,c){i.getVertexPosition(a,qo),i.getVertexPosition(l,Yo),i.getVertexPosition(c,$o);let u=$x(i,e,t,n,qo,Yo,$o,xp);if(u){let f=new O;Ii.getBarycoord(xp,qo,Yo,$o,f),s&&(u.uv=Ii.getInterpolatedAttribute(s,a,l,c,f,new We)),r&&(u.uv1=Ii.getInterpolatedAttribute(r,a,l,c,f,new We)),o&&(u.normal=Ii.getInterpolatedAttribute(o,a,l,c,f,new O),u.normal.dot(n.direction)>0&&u.normal.multiplyScalar(-1));let d={a,b:l,c,normal:new O,materialIndex:0};Ii.getNormal(qo,Yo,$o,d.normal),u.face=d,u.barycoord=f}return u}h(Jo,"checkGeometryIntersection");var vu=class vu extends tn{constructor(e=null,t=1,n=1,s,r,o,a,l,c=zt,u=zt,f,d){super(null,o,a,l,c,u,s,r,f,d),this.isDataTexture=!0,this.image={data:e,width:t,height:n},this.generateMipmaps=!1,this.flipY=!1,this.unpackAlignment=1}};h(vu,"DataTexture");var Ea=vu;var lh=new O,Kx=new O,Zx=new Oe,_u=class _u{constructor(e=new O(1,0,0),t=0){this.isPlane=!0,this.normal=e,this.constant=t}set(e,t){return this.normal.copy(e),this.constant=t,this}setComponents(e,t,n,s){return this.normal.set(e,t,n),this.constant=s,this}setFromNormalAndCoplanarPoint(e,t){return this.normal.copy(e),this.constant=-t.dot(this.normal),this}setFromCoplanarPoints(e,t,n){let s=lh.subVectors(n,t).cross(Kx.subVectors(e,t)).normalize();return this.setFromNormalAndCoplanarPoint(s,e),this}copy(e){return this.normal.copy(e.normal),this.constant=e.constant,this}normalize(){let e=1/this.normal.length();return this.normal.multiplyScalar(e),this.constant*=e,this}negate(){return this.constant*=-1,this.normal.negate(),this}distanceToPoint(e){return this.normal.dot(e)+this.constant}distanceToSphere(e){return this.distanceToPoint(e.center)-e.radius}projectPoint(e,t){return t.copy(e).addScaledVector(this.normal,-this.distanceToPoint(e))}intersectLine(e,t,n=!0){let s=e.delta(lh),r=this.normal.dot(s);if(r===0)return this.distanceToPoint(e.start)===0?t.copy(e.start):null;let o=-(e.start.dot(this.normal)+this.constant)/r;return n===!0&&(o<0||o>1)?null:t.copy(e.start).addScaledVector(s,o)}intersectsLine(e){let t=this.distanceToPoint(e.start),n=this.distanceToPoint(e.end);return t<0&&n>0||n<0&&t>0}intersectsBox(e){return e.intersectsPlane(this)}intersectsSphere(e){return e.intersectsPlane(this)}coplanarPoint(e){return e.copy(this.normal).multiplyScalar(-this.constant)}applyMatrix4(e,t){let n=t||Zx.getNormalMatrix(e),s=this.coplanarPoint(lh).applyMatrix4(e),r=this.normal.applyMatrix3(n).normalize();return this.constant=-s.dot(r),this}translate(e){return this.constant-=e.dot(this.normal),this}equals(e){return e.normal.equals(this.normal)&&e.constant===this.constant}clone(){return new this.constructor().copy(this)}};h(_u,"Plane");var Wn=_u,Qi=new Cn,Jx=new We(.5,.5),jo=new O,bu=class bu{constructor(e=new Wn,t=new Wn,n=new Wn,s=new Wn,r=new Wn,o=new Wn){this.planes=[e,t,n,s,r,o]}set(e,t,n,s,r,o){let a=this.planes;return a[0].copy(e),a[1].copy(t),a[2].copy(n),a[3].copy(s),a[4].copy(r),a[5].copy(o),this}copy(e){let t=this.planes;for(let n=0;n<6;n++)t[n].copy(e.planes[n]);return this}setFromProjectionMatrix(e,t=Rn,n=!1){let s=this.planes,r=e.elements,o=r[0],a=r[1],l=r[2],c=r[3],u=r[4],f=r[5],d=r[6],g=r[7],m=r[8],y=r[9],p=r[10],x=r[11],S=r[12],M=r[13],_=r[14],A=r[15];if(s[0].setComponents(c-o,g-u,x-m,A-S).normalize(),s[1].setComponents(c+o,g+u,x+m,A+S).normalize(),s[2].setComponents(c+a,g+f,x+y,A+M).normalize(),s[3].setComponents(c-a,g-f,x-y,A-M).normalize(),n)s[4].setComponents(l,d,p,_).normalize(),s[5].setComponents(c-l,g-d,x-p,A-_).normalize();else if(s[4].setComponents(c-l,g-d,x-p,A-_).normalize(),t===Rn)s[5].setComponents(c+l,g+d,x+p,A+_).normalize();else if(t===_r)s[5].setComponents(l,d,p,_).normalize();else throw new Error("THREE.Frustum.setFromProjectionMatrix(): Invalid coordinate system: "+t);return this}intersectsObject(e){if(e.boundingSphere!==void 0)e.boundingSphere===null&&e.computeBoundingSphere(),Qi.copy(e.boundingSphere).applyMatrix4(e.matrixWorld);else{let t=e.geometry;t.boundingSphere===null&&t.computeBoundingSphere(),Qi.copy(t.boundingSphere).applyMatrix4(e.matrixWorld)}return this.intersectsSphere(Qi)}intersectsSprite(e){Qi.center.set(0,0,0);let t=Jx.distanceTo(e.center);return Qi.radius=.7071067811865476+t,Qi.applyMatrix4(e.matrixWorld),this.intersectsSphere(Qi)}intersectsSphere(e){let t=this.planes,n=e.center,s=-e.radius;for(let r=0;r<6;r++)if(t[r].distanceToPoint(n)<s)return!1;return!0}intersectsBox(e){let t=this.planes;for(let n=0;n<6;n++){let s=t[n];if(jo.x=s.normal.x>0?e.max.x:e.min.x,jo.y=s.normal.y>0?e.max.y:e.min.y,jo.z=s.normal.z>0?e.max.z:e.min.z,s.distanceToPoint(jo)<0)return!1}return!0}containsPoint(e){let t=this.planes;for(let n=0;n<6;n++)if(t[n].distanceToPoint(e)<0)return!1;return!0}clone(){return new this.constructor().copy(this)}};h(bu,"Frustum");var Rr=bu;var Su=class Su extends Fi{constructor(e){super(),this.isLineBasicMaterial=!0,this.type="LineBasicMaterial",this.color=new Xe(16777215),this.map=null,this.linewidth=1,this.linecap="round",this.linejoin="round",this.fog=!0,this.setValues(e)}copy(e){return super.copy(e),this.color.copy(e.color),this.map=e.map,this.linewidth=e.linewidth,this.linecap=e.linecap,this.linejoin=e.linejoin,this.fog=e.fog,this}};h(Su,"LineBasicMaterial");var Vs=Su,Ta=new O,Aa=new O,yp=new ct,dr=new Pr,Qo=new Cn,ch=new O,vp=new O,Mu=class Mu extends mn{constructor(e=new Lt,t=new Vs){super(),this.isLine=!0,this.type="Line",this.geometry=e,this.material=t,this.morphTargetDictionary=void 0,this.morphTargetInfluences=void 0,this.updateMorphTargets()}copy(e,t){return super.copy(e,t),this.material=Array.isArray(e.material)?e.material.slice():e.material,this.geometry=e.geometry,this}computeLineDistances(){let e=this.geometry;if(e.index===null){let t=e.attributes.position,n=[0];for(let s=1,r=t.count;s<r;s++)Ta.fromBufferAttribute(t,s-1),Aa.fromBufferAttribute(t,s),n[s]=n[s-1],n[s]+=Ta.distanceTo(Aa);e.setAttribute("lineDistance",new ht(n,1))}else Ce("Line.computeLineDistances(): Computation only possible with non-indexed BufferGeometry.");return this}raycast(e,t){let n=this.geometry,s=this.matrixWorld,r=e.params.Line.threshold,o=n.drawRange;if(n.boundingSphere===null&&n.computeBoundingSphere(),Qo.copy(n.boundingSphere),Qo.applyMatrix4(s),Qo.radius+=r,e.ray.intersectsSphere(Qo)===!1)return;yp.copy(s).invert(),dr.copy(e.ray).applyMatrix4(yp);let a=r/((this.scale.x+this.scale.y+this.scale.z)/3),l=a*a,c=this.isLineSegments?2:1,u=n.index,d=n.attributes.position;if(u!==null){let g=Math.max(0,o.start),m=Math.min(u.count,o.start+o.count);for(let y=g,p=m-1;y<p;y+=c){let x=u.getX(y),S=u.getX(y+1),M=ea(this,e,dr,l,x,S,y);M&&t.push(M)}if(this.isLineLoop){let y=u.getX(m-1),p=u.getX(g),x=ea(this,e,dr,l,y,p,m-1);x&&t.push(x)}}else{let g=Math.max(0,o.start),m=Math.min(d.count,o.start+o.count);for(let y=g,p=m-1;y<p;y+=c){let x=ea(this,e,dr,l,y,y+1,y);x&&t.push(x)}if(this.isLineLoop){let y=ea(this,e,dr,l,m-1,g,m-1);y&&t.push(y)}}}updateMorphTargets(){let t=this.geometry.morphAttributes,n=Object.keys(t);if(n.length>0){let s=t[n[0]];if(s!==void 0){this.morphTargetInfluences=[],this.morphTargetDictionary={};for(let r=0,o=s.length;r<o;r++){let a=s[r].name||String(r);this.morphTargetInfluences.push(0),this.morphTargetDictionary[a]=r}}}}};h(Mu,"Line");var Cr=Mu;function ea(i,e,t,n,s,r,o){let a=i.geometry.attributes.position;if(Ta.fromBufferAttribute(a,s),Aa.fromBufferAttribute(a,r),t.distanceSqToSegment(Ta,Aa,ch,vp)>n)return;ch.applyMatrix4(i.matrixWorld);let c=e.ray.origin.distanceTo(ch);if(!(c<e.near||c>e.far))return{distance:c,point:vp.clone().applyMatrix4(i.matrixWorld),index:o,face:null,faceIndex:null,barycoord:null,object:i}}h(ea,"checkIntersection");var wu=class wu extends tn{constructor(e=[],t=ki,n,s,r,o,a,l,c,u){super(e,t,n,s,r,o,a,l,c,u),this.isCubeTexture=!0,this.flipY=!1}get images(){return this.image}set images(e){this.image=e}};h(wu,"CubeTexture");var Ir=wu,Eu=class Eu extends tn{constructor(e,t,n,s,r,o,a,l,c){super(e,t,n,s,r,o,a,l,c),this.isCanvasTexture=!0,this.needsUpdate=!0}};h(Eu,"CanvasTexture");var Hs=Eu;var Tu=class Tu extends tn{constructor(e,t,n=Fn,s,r,o,a=zt,l=zt,c,u=qn,f=1){if(u!==qn&&u!==Hi)throw new Error("THREE.DepthTexture: format must be either THREE.DepthFormat or THREE.DepthStencilFormat");let d={width:e,height:t,depth:f};super(d,s,r,o,a,l,u,n,c),this.isDepthTexture=!0,this.flipY=!1,this.generateMipmaps=!1,this.compareFunction=null}copy(e){return super.copy(e),this.source=new zs(Object.assign({},e.image)),this.compareFunction=e.compareFunction,this}toJSON(e){let t=super.toJSON(e);return this.compareFunction!==null&&(t.compareFunction=this.compareFunction),t}};h(Tu,"DepthTexture");var ui=Tu,Au=class Au extends ui{constructor(e,t=Fn,n=ki,s,r,o=zt,a=zt,l,c=qn){let u={width:e,height:e,depth:1},f=[u,u,u,u,u,u];super(e,e,t,n,s,r,o,a,l,c),this.image=f,this.isCubeDepthTexture=!0,this.isCubeTexture=!0}get images(){return this.image}set images(e){this.image=e}};h(Au,"CubeDepthTexture");var Pa=Au,Pu=class Pu extends tn{constructor(e=null){super(),this.sourceTexture=e,this.isExternalTexture=!0}copy(e){return super.copy(e),this.sourceTexture=e.sourceTexture,this}};h(Pu,"ExternalTexture");var Lr=Pu,Ja=class Ja extends Lt{constructor(e=1,t=1,n=1,s=1,r=1,o=1){super(),this.type="BoxGeometry",this.parameters={width:e,height:t,depth:n,widthSegments:s,heightSegments:r,depthSegments:o};let a=this;s=Math.floor(s),r=Math.floor(r),o=Math.floor(o);let l=[],c=[],u=[],f=[],d=0,g=0;m("z","y","x",-1,-1,n,t,e,o,r,0),m("z","y","x",1,-1,n,t,-e,o,r,1),m("x","z","y",1,1,e,n,t,s,o,2),m("x","z","y",1,-1,e,n,-t,s,o,3),m("x","y","z",1,-1,e,t,n,s,r,4),m("x","y","z",-1,-1,e,t,-n,s,r,5),this.setIndex(l),this.setAttribute("position",new ht(c,3)),this.setAttribute("normal",new ht(u,3)),this.setAttribute("uv",new ht(f,2));function m(y,p,x,S,M,_,A,w,T,v,P){let C=_/T,I=A/v,D=_/2,L=A/2,H=w/2,F=T+1,Y=v+1,k=0,Z=0,ee=new O;for(let re=0;re<Y;re++){let le=re*I-L;for(let _e=0;_e<F;_e++){let $e=_e*C-D;ee[y]=$e*S,ee[p]=le*M,ee[x]=H,c.push(ee.x,ee.y,ee.z),ee[y]=0,ee[p]=0,ee[x]=w>0?1:-1,u.push(ee.x,ee.y,ee.z),f.push(_e/T),f.push(1-re/v),k+=1}}for(let re=0;re<v;re++)for(let le=0;le<T;le++){let _e=d+le+F*re,$e=d+le+F*(re+1),tt=d+(le+1)+F*(re+1),Ke=d+(le+1)+F*re;l.push(_e,$e,Ke),l.push($e,tt,Ke),Z+=6}a.addGroup(g,Z,P),g+=Z,d+=k}h(m,"buildPlane")}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(e){return new Ja(e.width,e.height,e.depth,e.widthSegments,e.heightSegments,e.depthSegments)}};h(Ja,"BoxGeometry");var Gs=Ja;function jx(i,e,t=2){let n=e&&e.length,s=n?e[0]*t:i.length,r=um(i,0,s,t,!0),o=[];if(!r||r.next===r.prev)return o;let a,l,c;if(n&&(r=i0(i,e,r,t)),i.length>80*t){a=i[0],l=i[1];let u=a,f=l;for(let d=t;d<s;d+=t){let g=i[d],m=i[d+1];g<a&&(a=g),m<l&&(l=m),g>u&&(u=g),m>f&&(f=m)}c=Math.max(u-a,f-l),c=c!==0?32767/c:0}return Dr(r,o,t,a,l,c,0),o}h(jx,"earcut");function um(i,e,t,n,s){let r;if(s===p0(i,e,t,n)>0)for(let o=e;o<t;o+=n)r=_p(o/n|0,i[o],i[o+1],r);else for(let o=t-n;o>=e;o-=n)r=_p(o/n|0,i[o],i[o+1],r);return r&&Ws(r,r.next)&&(Nr(r),r=r.next),r}h(um,"linkedList");function ss(i,e){if(!i)return i;e||(e=i);let t=i,n;do if(n=!1,!t.steiner&&(Ws(t,t.next)||gt(t.prev,t,t.next)===0)){if(Nr(t),t=e=t.prev,t===t.next)break;n=!0}else t=t.next;while(n||t!==e);return e}h(ss,"filterPoints");function Dr(i,e,t,n,s,r,o){if(!i)return;!o&&r&&l0(i,n,s,r);let a=i;for(;i.prev!==i.next;){let l=i.prev,c=i.next;if(r?e0(i,n,s,r):Qx(i)){e.push(l.i,i.i,c.i),Nr(i),i=c.next,a=c.next;continue}if(i=c,i===a){o?o===1?(i=t0(ss(i),e),Dr(i,e,t,n,s,r,2)):o===2&&n0(i,e,t,n,s,r):Dr(ss(i),e,t,n,s,r,1);break}}}h(Dr,"earcutLinked");function Qx(i){let e=i.prev,t=i,n=i.next;if(gt(e,t,n)>=0)return!1;let s=e.x,r=t.x,o=n.x,a=e.y,l=t.y,c=n.y,u=Math.min(s,r,o),f=Math.min(a,l,c),d=Math.max(s,r,o),g=Math.max(a,l,c),m=n.next;for(;m!==e;){if(m.x>=u&&m.x<=d&&m.y>=f&&m.y<=g&&fr(s,a,r,l,o,c,m.x,m.y)&&gt(m.prev,m,m.next)>=0)return!1;m=m.next}return!0}h(Qx,"isEar");function e0(i,e,t,n){let s=i.prev,r=i,o=i.next;if(gt(s,r,o)>=0)return!1;let a=s.x,l=r.x,c=o.x,u=s.y,f=r.y,d=o.y,g=Math.min(a,l,c),m=Math.min(u,f,d),y=Math.max(a,l,c),p=Math.max(u,f,d),x=gh(g,m,e,t,n),S=gh(y,p,e,t,n),M=i.prevZ,_=i.nextZ;for(;M&&M.z>=x&&_&&_.z<=S;){if(M.x>=g&&M.x<=y&&M.y>=m&&M.y<=p&&M!==s&&M!==o&&fr(a,u,l,f,c,d,M.x,M.y)&&gt(M.prev,M,M.next)>=0||(M=M.prevZ,_.x>=g&&_.x<=y&&_.y>=m&&_.y<=p&&_!==s&&_!==o&&fr(a,u,l,f,c,d,_.x,_.y)&&gt(_.prev,_,_.next)>=0))return!1;_=_.nextZ}for(;M&&M.z>=x;){if(M.x>=g&&M.x<=y&&M.y>=m&&M.y<=p&&M!==s&&M!==o&&fr(a,u,l,f,c,d,M.x,M.y)&&gt(M.prev,M,M.next)>=0)return!1;M=M.prevZ}for(;_&&_.z<=S;){if(_.x>=g&&_.x<=y&&_.y>=m&&_.y<=p&&_!==s&&_!==o&&fr(a,u,l,f,c,d,_.x,_.y)&&gt(_.prev,_,_.next)>=0)return!1;_=_.nextZ}return!0}h(e0,"isEarHashed");function t0(i,e){let t=i;do{let n=t.prev,s=t.next.next;!Ws(n,s)&&fm(n,t,t.next,s)&&Fr(n,s)&&Fr(s,n)&&(e.push(n.i,t.i,s.i),Nr(t),Nr(t.next),t=i=s),t=t.next}while(t!==i);return ss(t)}h(t0,"cureLocalIntersections");function n0(i,e,t,n,s,r){let o=i;do{let a=o.next.next;for(;a!==o.prev;){if(o.i!==a.i&&u0(o,a)){let l=pm(o,a);o=ss(o,o.next),l=ss(l,l.next),Dr(o,e,t,n,s,r,0),Dr(l,e,t,n,s,r,0);return}a=a.next}o=o.next}while(o!==i)}h(n0,"splitEarcut");function i0(i,e,t,n){let s=[];for(let r=0,o=e.length;r<o;r++){let a=e[r]*n,l=r<o-1?e[r+1]*n:i.length,c=um(i,a,l,n,!1);c===c.next&&(c.steiner=!0),s.push(h0(c))}s.sort(s0);for(let r=0;r<s.length;r++)t=r0(s[r],t);return t}h(i0,"eliminateHoles");function s0(i,e){let t=i.x-e.x;if(t===0&&(t=i.y-e.y,t===0)){let n=(i.next.y-i.y)/(i.next.x-i.x),s=(e.next.y-e.y)/(e.next.x-e.x);t=n-s}return t}h(s0,"compareXYSlope");function r0(i,e){let t=o0(i,e);if(!t)return e;let n=pm(t,i);return ss(n,n.next),ss(t,t.next)}h(r0,"eliminateHole");function o0(i,e){let t=e,n=i.x,s=i.y,r=-1/0,o;if(Ws(i,t))return t;do{if(Ws(i,t.next))return t.next;if(s<=t.y&&s>=t.next.y&&t.next.y!==t.y){let f=t.x+(s-t.y)*(t.next.x-t.x)/(t.next.y-t.y);if(f<=n&&f>r&&(r=f,o=t.x<t.next.x?t:t.next,f===n))return o}t=t.next}while(t!==e);if(!o)return null;let a=o,l=o.x,c=o.y,u=1/0;t=o;do{if(n>=t.x&&t.x>=l&&n!==t.x&&dm(s<c?n:r,s,l,c,s<c?r:n,s,t.x,t.y)){let f=Math.abs(s-t.y)/(n-t.x);Fr(t,i)&&(f<u||f===u&&(t.x>o.x||t.x===o.x&&a0(o,t)))&&(o=t,u=f)}t=t.next}while(t!==a);return o}h(o0,"findHoleBridge");function a0(i,e){return gt(i.prev,i,e.prev)<0&&gt(e.next,i,i.next)<0}h(a0,"sectorContainsSector");function l0(i,e,t,n){let s=i;do s.z===0&&(s.z=gh(s.x,s.y,e,t,n)),s.prevZ=s.prev,s.nextZ=s.next,s=s.next;while(s!==i);s.prevZ.nextZ=null,s.prevZ=null,c0(s)}h(l0,"indexCurve");function c0(i){let e,t=1;do{let n=i,s;i=null;let r=null;for(e=0;n;){e++;let o=n,a=0;for(let c=0;c<t&&(a++,o=o.nextZ,!!o);c++);let l=t;for(;a>0||l>0&&o;)a!==0&&(l===0||!o||n.z<=o.z)?(s=n,n=n.nextZ,a--):(s=o,o=o.nextZ,l--),r?r.nextZ=s:i=s,s.prevZ=r,r=s;n=o}r.nextZ=null,t*=2}while(e>1);return i}h(c0,"sortLinked");function gh(i,e,t,n,s){return i=(i-t)*s|0,e=(e-n)*s|0,i=(i|i<<8)&16711935,i=(i|i<<4)&252645135,i=(i|i<<2)&858993459,i=(i|i<<1)&1431655765,e=(e|e<<8)&16711935,e=(e|e<<4)&252645135,e=(e|e<<2)&858993459,e=(e|e<<1)&1431655765,i|e<<1}h(gh,"zOrder");function h0(i){let e=i,t=i;do(e.x<t.x||e.x===t.x&&e.y<t.y)&&(t=e),e=e.next;while(e!==i);return t}h(h0,"getLeftmost");function dm(i,e,t,n,s,r,o,a){return(s-o)*(e-a)>=(i-o)*(r-a)&&(i-o)*(n-a)>=(t-o)*(e-a)&&(t-o)*(r-a)>=(s-o)*(n-a)}h(dm,"pointInTriangle");function fr(i,e,t,n,s,r,o,a){return!(i===o&&e===a)&&dm(i,e,t,n,s,r,o,a)}h(fr,"pointInTriangleExceptFirst");function u0(i,e){return i.next.i!==e.i&&i.prev.i!==e.i&&!d0(i,e)&&(Fr(i,e)&&Fr(e,i)&&f0(i,e)&&(gt(i.prev,i,e.prev)||gt(i,e.prev,e))||Ws(i,e)&&gt(i.prev,i,i.next)>0&&gt(e.prev,e,e.next)>0)}h(u0,"isValidDiagonal");function gt(i,e,t){return(e.y-i.y)*(t.x-e.x)-(e.x-i.x)*(t.y-e.y)}h(gt,"area");function Ws(i,e){return i.x===e.x&&i.y===e.y}h(Ws,"equals");function fm(i,e,t,n){let s=na(gt(i,e,t)),r=na(gt(i,e,n)),o=na(gt(t,n,i)),a=na(gt(t,n,e));return!!(s!==r&&o!==a||s===0&&ta(i,t,e)||r===0&&ta(i,n,e)||o===0&&ta(t,i,n)||a===0&&ta(t,e,n))}h(fm,"intersects");function ta(i,e,t){return e.x<=Math.max(i.x,t.x)&&e.x>=Math.min(i.x,t.x)&&e.y<=Math.max(i.y,t.y)&&e.y>=Math.min(i.y,t.y)}h(ta,"onSegment");function na(i){return i>0?1:i<0?-1:0}h(na,"sign");function d0(i,e){let t=i;do{if(t.i!==i.i&&t.next.i!==i.i&&t.i!==e.i&&t.next.i!==e.i&&fm(t,t.next,i,e))return!0;t=t.next}while(t!==i);return!1}h(d0,"intersectsPolygon");function Fr(i,e){return gt(i.prev,i,i.next)<0?gt(i,e,i.next)>=0&&gt(i,i.prev,e)>=0:gt(i,e,i.prev)<0||gt(i,i.next,e)<0}h(Fr,"locallyInside");function f0(i,e){let t=i,n=!1,s=(i.x+e.x)/2,r=(i.y+e.y)/2;do t.y>r!=t.next.y>r&&t.next.y!==t.y&&s<(t.next.x-t.x)*(r-t.y)/(t.next.y-t.y)+t.x&&(n=!n),t=t.next;while(t!==i);return n}h(f0,"middleInside");function pm(i,e){let t=xh(i.i,i.x,i.y),n=xh(e.i,e.x,e.y),s=i.next,r=e.prev;return i.next=e,e.prev=i,t.next=s,s.prev=t,n.next=t,t.prev=n,r.next=n,n.prev=r,n}h(pm,"splitPolygon");function _p(i,e,t,n){let s=xh(i,e,t);return n?(s.next=n.next,s.prev=n,n.next.prev=s,n.next=s):(s.prev=s,s.next=s),s}h(_p,"insertNode");function Nr(i){i.next.prev=i.prev,i.prev.next=i.next,i.prevZ&&(i.prevZ.nextZ=i.nextZ),i.nextZ&&(i.nextZ.prevZ=i.prevZ)}h(Nr,"removeNode");function xh(i,e,t){return{i,x:e,y:t,prev:null,next:null,z:0,prevZ:null,nextZ:null,steiner:!1}}h(xh,"createNode");function p0(i,e,t,n){let s=0;for(let r=e,o=t-n;r<t;r+=n)s+=(i[o]-i[r])*(i[r+1]+i[o+1]),o=r;return s}h(p0,"signedArea");var Ru=class Ru{static triangulate(e,t,n=2){return jx(e,t,n)}};h(Ru,"Earcut");var yh=Ru,ja=class ja{static area(e){let t=e.length,n=0;for(let s=t-1,r=0;r<t;s=r++)n+=e[s].x*e[r].y-e[r].x*e[s].y;return n*.5}static isClockWise(e){return ja.area(e)<0}static triangulateShape(e,t){let n=[],s=[],r=[];bp(e),Sp(n,e);let o=e.length;t.forEach(bp);for(let l=0;l<t.length;l++)s.push(o),o+=t[l].length,Sp(n,t[l]);let a=yh.triangulate(n,s);for(let l=0;l<a.length;l+=3)r.push(a.slice(l,l+3));return r}};h(ja,"ShapeUtils");var Ur=ja;function bp(i){let e=i.length;e>2&&i[e-1].equals(i[0])&&i.pop()}h(bp,"removeDupEndPts");function Sp(i,e){for(let t=0;t<e.length;t++)i.push(e[t].x),i.push(e[t].y)}h(Sp,"addContour");var Qa=class Qa extends Lt{constructor(e=1,t=1,n=1,s=1){super(),this.type="PlaneGeometry",this.parameters={width:e,height:t,widthSegments:n,heightSegments:s};let r=e/2,o=t/2,a=Math.floor(n),l=Math.floor(s),c=a+1,u=l+1,f=e/a,d=t/l,g=[],m=[],y=[],p=[];for(let x=0;x<u;x++){let S=x*d-o;for(let M=0;M<c;M++){let _=M*f-r;m.push(_,-S,0),y.push(0,0,1),p.push(M/a),p.push(1-x/l)}}for(let x=0;x<l;x++)for(let S=0;S<a;S++){let M=S+c*x,_=S+c*(x+1),A=S+1+c*(x+1),w=S+1+c*x;g.push(M,_,w),g.push(_,A,w)}this.setIndex(g),this.setAttribute("position",new ht(m,3)),this.setAttribute("normal",new ht(y,3)),this.setAttribute("uv",new ht(p,2))}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(e){return new Qa(e.width,e.height,e.widthSegments,e.heightSegments)}};h(Qa,"PlaneGeometry");var Ni=Qa,el=class el extends Lt{constructor(e=.5,t=1,n=32,s=1,r=0,o=Math.PI*2){super(),this.type="RingGeometry",this.parameters={innerRadius:e,outerRadius:t,thetaSegments:n,phiSegments:s,thetaStart:r,thetaLength:o},n=Math.max(3,n),s=Math.max(1,s);let a=[],l=[],c=[],u=[],f=e,d=(t-e)/s,g=new O,m=new We;for(let y=0;y<=s;y++){for(let p=0;p<=n;p++){let x=r+p/n*o;g.x=f*Math.cos(x),g.y=f*Math.sin(x),l.push(g.x,g.y,g.z),c.push(0,0,1),m.x=(g.x/t+1)/2,m.y=(g.y/t+1)/2,u.push(m.x,m.y)}f+=d}for(let y=0;y<s;y++){let p=y*(n+1);for(let x=0;x<n;x++){let S=x+p,M=S,_=S+n+1,A=S+n+2,w=S+1;a.push(M,_,w),a.push(_,A,w)}}this.setIndex(a),this.setAttribute("position",new ht(l,3)),this.setAttribute("normal",new ht(c,3)),this.setAttribute("uv",new ht(u,2))}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(e){return new el(e.innerRadius,e.outerRadius,e.thetaSegments,e.phiSegments,e.thetaStart,e.thetaLength)}};h(el,"RingGeometry");var Or=el;var tl=class tl extends Lt{constructor(e=1,t=32,n=16,s=0,r=Math.PI*2,o=0,a=Math.PI){super(),this.type="SphereGeometry",this.parameters={radius:e,widthSegments:t,heightSegments:n,phiStart:s,phiLength:r,thetaStart:o,thetaLength:a},t=Math.max(3,Math.floor(t)),n=Math.max(2,Math.floor(n));let l=Math.min(o+a,Math.PI),c=0,u=[],f=new O,d=new O,g=[],m=[],y=[],p=[];for(let x=0;x<=n;x++){let S=[],M=x/n,_=o+M*a,A=e*Math.cos(_),w=Math.sqrt(e*e-A*A),T=0;x===0&&o===0?T=.5/t:x===n&&l===Math.PI&&(T=-.5/t);for(let v=0;v<=t;v++){let P=v/t,C=s+P*r;f.x=-w*Math.cos(C),f.y=A,f.z=w*Math.sin(C),m.push(f.x,f.y,f.z),d.copy(f).normalize(),y.push(d.x,d.y,d.z),p.push(P+T,1-M),S.push(c++)}u.push(S)}for(let x=0;x<n;x++)for(let S=0;S<t;S++){let M=u[x][S+1],_=u[x][S],A=u[x+1][S],w=u[x+1][S+1];(x!==0||o>0)&&g.push(M,_,w),(x!==n-1||l<Math.PI)&&g.push(_,A,w)}this.setIndex(g),this.setAttribute("position",new ht(m,3)),this.setAttribute("normal",new ht(y,3)),this.setAttribute("uv",new ht(p,2))}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}static fromJSON(e){return new tl(e.radius,e.widthSegments,e.heightSegments,e.phiStart,e.phiLength,e.thetaStart,e.thetaLength)}};h(tl,"SphereGeometry");var Xs=tl;var Cu=class Cu extends Lt{constructor(e=null){if(super(),this.type="WireframeGeometry",this.parameters={geometry:e},e!==null){let t=[],n=new Set,s=new O,r=new O;if(e.index!==null){let o=e.attributes.position,a=e.index,l=e.groups;l.length===0&&(l=[{start:0,count:a.count,materialIndex:0}]);for(let c=0,u=l.length;c<u;++c){let f=l[c],d=f.start,g=f.count;for(let m=d,y=d+g;m<y;m+=3)for(let p=0;p<3;p++){let x=a.getX(m+p),S=a.getX(m+(p+1)%3);s.fromBufferAttribute(o,x),r.fromBufferAttribute(o,S),Mp(s,r,n)===!0&&(t.push(s.x,s.y,s.z),t.push(r.x,r.y,r.z))}}}else{let o=e.attributes.position;for(let a=0,l=o.count/3;a<l;a++)for(let c=0;c<3;c++){let u=3*a+c,f=3*a+(c+1)%3;s.fromBufferAttribute(o,u),r.fromBufferAttribute(o,f),Mp(s,r,n)===!0&&(t.push(s.x,s.y,s.z),t.push(r.x,r.y,r.z))}}this.setAttribute("position",new ht(t,3))}}copy(e){return super.copy(e),this.parameters=Object.assign({},e.parameters),this}};h(Cu,"WireframeGeometry");var Br=Cu;function Mp(i,e,t){let n=`${i.x},${i.y},${i.z}-${e.x},${e.y},${e.z}`,s=`${e.x},${e.y},${e.z}-${i.x},${i.y},${i.z}`;return t.has(n)===!0||t.has(s)===!0?!1:(t.add(n),t.add(s),!0)}h(Mp,"isUniqueEdge");function as(i){let e={};for(let t in i){e[t]={};for(let n in i[t]){let s=i[t][n];if(wp(s))s.isRenderTargetTexture?(Ce("UniformsUtils: Textures of render targets cannot be cloned via cloneUniforms() or mergeUniforms()."),e[t][n]=null):e[t][n]=s.clone();else if(Array.isArray(s))if(wp(s[0])){let r=[];for(let o=0,a=s.length;o<a;o++)r[o]=s[o].clone();e[t][n]=r}else e[t][n]=s.slice();else e[t][n]=s}}return e}h(as,"cloneUniforms");function jt(i){let e={};for(let t=0;t<i.length;t++){let n=as(i[t]);for(let s in n)e[s]=n[s]}return e}h(jt,"mergeUniforms");function wp(i){return i&&(i.isColor||i.isMatrix3||i.isMatrix4||i.isVector2||i.isVector3||i.isVector4||i.isTexture||i.isQuaternion)}h(wp,"isThreeObject");function m0(i){let e=[];for(let t=0;t<i.length;t++)e.push(i[t].clone());return e}h(m0,"cloneUniformsGroups");function Xh(i){let e=i.getRenderTarget();return e===null?i.outputColorSpace:e.isXRRenderTarget===!0?e.texture.colorSpace:Ye.workingColorSpace}h(Xh,"getUnlitUniformColorSpace");var jr={clone:as,merge:jt},g0=`void main() {
	gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
}`,x0=`void main() {
	gl_FragColor = vec4( 1.0, 0.0, 0.0, 1.0 );
}`,Iu=class Iu extends Fi{constructor(e){super(),this.isShaderMaterial=!0,this.type="ShaderMaterial",this.defines={},this.uniforms={},this.uniformsGroups=[],this.vertexShader=g0,this.fragmentShader=x0,this.linewidth=1,this.wireframe=!1,this.wireframeLinewidth=1,this.fog=!1,this.lights=!1,this.clipping=!1,this.forceSinglePass=!0,this.extensions={clipCullDistance:!1,multiDraw:!1},this.defaultAttributeValues={color:[1,1,1],uv:[0,0],uv1:[0,0]},this.index0AttributeName=void 0,this.uniformsNeedUpdate=!1,this.glslVersion=null,e!==void 0&&this.setValues(e)}copy(e){return super.copy(e),this.fragmentShader=e.fragmentShader,this.vertexShader=e.vertexShader,this.uniforms=as(e.uniforms),this.uniformsGroups=m0(e.uniformsGroups),this.defines=Object.assign({},e.defines),this.wireframe=e.wireframe,this.wireframeLinewidth=e.wireframeLinewidth,this.fog=e.fog,this.lights=e.lights,this.clipping=e.clipping,this.extensions=Object.assign({},e.extensions),this.glslVersion=e.glslVersion,this.defaultAttributeValues=Object.assign({},e.defaultAttributeValues),this.index0AttributeName=e.index0AttributeName,this.uniformsNeedUpdate=e.uniformsNeedUpdate,this}toJSON(e){let t=super.toJSON(e);t.glslVersion=this.glslVersion,t.uniforms={};for(let s in this.uniforms){let o=this.uniforms[s].value;o&&o.isTexture?t.uniforms[s]={type:"t",value:o.toJSON(e).uuid}:o&&o.isColor?t.uniforms[s]={type:"c",value:o.getHex()}:o&&o.isVector2?t.uniforms[s]={type:"v2",value:o.toArray()}:o&&o.isVector3?t.uniforms[s]={type:"v3",value:o.toArray()}:o&&o.isVector4?t.uniforms[s]={type:"v4",value:o.toArray()}:o&&o.isMatrix3?t.uniforms[s]={type:"m3",value:o.toArray()}:o&&o.isMatrix4?t.uniforms[s]={type:"m4",value:o.toArray()}:t.uniforms[s]={value:o}}Object.keys(this.defines).length>0&&(t.defines=this.defines),t.vertexShader=this.vertexShader,t.fragmentShader=this.fragmentShader,t.lights=this.lights,t.clipping=this.clipping;let n={};for(let s in this.extensions)this.extensions[s]===!0&&(n[s]=!0);return Object.keys(n).length>0&&(t.extensions=n),t}fromJSON(e,t){if(super.fromJSON(e,t),e.uniforms!==void 0)for(let n in e.uniforms){let s=e.uniforms[n];switch(this.uniforms[n]={},s.type){case"t":this.uniforms[n].value=t[s.value]||null;break;case"c":this.uniforms[n].value=new Xe().setHex(s.value);break;case"v2":this.uniforms[n].value=new We().fromArray(s.value);break;case"v3":this.uniforms[n].value=new O().fromArray(s.value);break;case"v4":this.uniforms[n].value=new st().fromArray(s.value);break;case"m3":this.uniforms[n].value=new Oe().fromArray(s.value);break;case"m4":this.uniforms[n].value=new ct().fromArray(s.value);break;default:this.uniforms[n].value=s.value}}if(e.defines!==void 0&&(this.defines=e.defines),e.vertexShader!==void 0&&(this.vertexShader=e.vertexShader),e.fragmentShader!==void 0&&(this.fragmentShader=e.fragmentShader),e.glslVersion!==void 0&&(this.glslVersion=e.glslVersion),e.extensions!==void 0)for(let n in e.extensions)this.extensions[n]=e.extensions[n];return e.lights!==void 0&&(this.lights=e.lights),e.clipping!==void 0&&(this.clipping=e.clipping),this}};h(Iu,"ShaderMaterial");var Ht=Iu,Lu=class Lu extends Ht{constructor(e){super(e),this.isRawShaderMaterial=!0,this.type="RawShaderMaterial"}};h(Lu,"RawShaderMaterial");var Ra=Lu;var Du=class Du extends Fi{constructor(e){super(),this.isMeshDepthMaterial=!0,this.type="MeshDepthMaterial",this.depthPacking=jp,this.map=null,this.alphaMap=null,this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.wireframe=!1,this.wireframeLinewidth=1,this.setValues(e)}copy(e){return super.copy(e),this.depthPacking=e.depthPacking,this.map=e.map,this.alphaMap=e.alphaMap,this.displacementMap=e.displacementMap,this.displacementScale=e.displacementScale,this.displacementBias=e.displacementBias,this.wireframe=e.wireframe,this.wireframeLinewidth=e.wireframeLinewidth,this}};h(Du,"MeshDepthMaterial");var Ca=Du,Fu=class Fu extends Fi{constructor(e){super(),this.isMeshDistanceMaterial=!0,this.type="MeshDistanceMaterial",this.map=null,this.alphaMap=null,this.displacementMap=null,this.displacementScale=1,this.displacementBias=0,this.setValues(e)}copy(e){return super.copy(e),this.map=e.map,this.alphaMap=e.alphaMap,this.displacementMap=e.displacementMap,this.displacementScale=e.displacementScale,this.displacementBias=e.displacementBias,this}};h(Fu,"MeshDistanceMaterial");var Ia=Fu;function ia(i,e){return!i||i.constructor===e?i:typeof e.BYTES_PER_ELEMENT=="number"?new e(i):Array.prototype.slice.call(i)}h(ia,"convertArray");var Nu=class Nu{constructor(e,t,n,s){this.parameterPositions=e,this._cachedIndex=0,this.resultBuffer=s!==void 0?s:new t.constructor(n),this.sampleValues=t,this.valueSize=n,this.settings=null,this.DefaultSettings_={}}evaluate(e){let t=this.parameterPositions,n=this._cachedIndex,s=t[n],r=t[n-1];n:{e:{let o;t:{i:if(!(e<s)){for(let a=n+2;;){if(s===void 0){if(e<r)break i;return n=t.length,this._cachedIndex=n,this.copySampleValue_(n-1)}if(n===a)break;if(r=s,s=t[++n],e<s)break e}o=t.length;break t}if(!(e>=r)){let a=t[1];e<a&&(n=2,r=a);for(let l=n-2;;){if(r===void 0)return this._cachedIndex=0,this.copySampleValue_(0);if(n===l)break;if(s=r,r=t[--n-1],e>=r)break e}o=n,n=0;break t}break n}for(;n<o;){let a=n+o>>>1;e<t[a]?o=a:n=a+1}if(s=t[n],r=t[n-1],r===void 0)return this._cachedIndex=0,this.copySampleValue_(0);if(s===void 0)return n=t.length,this._cachedIndex=n,this.copySampleValue_(n-1)}this._cachedIndex=n,this.intervalChanged_(n,r,s)}return this.interpolate_(n,r,e,s)}getSettings_(){return this.settings||this.DefaultSettings_}copySampleValue_(e){let t=this.resultBuffer,n=this.sampleValues,s=this.valueSize,r=e*s;for(let o=0;o!==s;++o)t[o]=n[r+o];return t}interpolate_(){throw new Error("THREE.Interpolant: Call to abstract method.")}intervalChanged_(){}};h(Nu,"Interpolant");var Ui=Nu,Uu=class Uu extends Ui{constructor(e,t,n,s){super(e,t,n,s),this._weightPrev=-0,this._offsetPrev=-0,this._weightNext=-0,this._offsetNext=-0,this.DefaultSettings_={endingStart:dh,endingEnd:dh}}intervalChanged_(e,t,n){let s=this.parameterPositions,r=e-2,o=e+1,a=s[r],l=s[o];if(a===void 0)switch(this.getSettings_().endingStart){case fh:r=e,a=2*t-n;break;case ph:r=s.length-2,a=t+s[r]-s[r+1];break;default:r=e,a=n}if(l===void 0)switch(this.getSettings_().endingEnd){case fh:o=e,l=2*n-t;break;case ph:o=1,l=n+s[1]-s[0];break;default:o=e-1,l=t}let c=(n-t)*.5,u=this.valueSize;this._weightPrev=c/(t-a),this._weightNext=c/(l-n),this._offsetPrev=r*u,this._offsetNext=o*u}interpolate_(e,t,n,s){let r=this.resultBuffer,o=this.sampleValues,a=this.valueSize,l=e*a,c=l-a,u=this._offsetPrev,f=this._offsetNext,d=this._weightPrev,g=this._weightNext,m=(n-t)/(s-t),y=m*m,p=y*m,x=-d*p+2*d*y-d*m,S=(1+d)*p+(-1.5-2*d)*y+(-.5+d)*m+1,M=(-1-g)*p+(1.5+g)*y+.5*m,_=g*p-g*y;for(let A=0;A!==a;++A)r[A]=x*o[u+A]+S*o[c+A]+M*o[l+A]+_*o[f+A];return r}};h(Uu,"CubicInterpolant");var La=Uu,Ou=class Ou extends Ui{constructor(e,t,n,s){super(e,t,n,s)}interpolate_(e,t,n,s){let r=this.resultBuffer,o=this.sampleValues,a=this.valueSize,l=e*a,c=l-a,u=(n-t)/(s-t),f=1-u;for(let d=0;d!==a;++d)r[d]=o[c+d]*f+o[l+d]*u;return r}};h(Ou,"LinearInterpolant");var Da=Ou,Bu=class Bu extends Ui{constructor(e,t,n,s){super(e,t,n,s)}interpolate_(e){return this.copySampleValue_(e-1)}};h(Bu,"DiscreteInterpolant");var Fa=Bu,zu=class zu extends Ui{interpolate_(e,t,n,s){let r=this.resultBuffer,o=this.sampleValues,a=this.valueSize,l=e*a,c=l-a,u=this.inTangents,f=this.outTangents;if(!u||!f){let m=(n-t)/(s-t),y=1-m;for(let p=0;p!==a;++p)r[p]=o[c+p]*y+o[l+p]*m;return r}let d=a*2,g=e-1;for(let m=0;m!==a;++m){let y=o[c+m],p=o[l+m],x=g*d+m*2,S=f[x],M=f[x+1],_=e*d+m*2,A=u[_],w=u[_+1],T=(n-t)/(s-t),v,P,C,I,D;for(let L=0;L<8;L++){v=T*T,P=v*T,C=1-T,I=C*C,D=I*C;let F=D*t+3*I*T*S+3*C*v*A+P*s-n;if(Math.abs(F)<1e-10)break;let Y=3*I*(S-t)+6*C*T*(A-S)+3*v*(s-A);if(Math.abs(Y)<1e-10)break;T=T-F/Y,T=Math.max(0,Math.min(1,T))}r[m]=D*y+3*I*T*M+3*C*v*w+P*p}return r}};h(zu,"BezierInterpolant");var Na=zu,ku=class ku{constructor(e,t,n,s){if(e===void 0)throw new Error("THREE.KeyframeTrack: track name is undefined");if(t===void 0||t.length===0)throw new Error("THREE.KeyframeTrack: no keyframes in track named "+e);this.name=e,this.times=ia(t,this.TimeBufferType),this.values=ia(n,this.ValueBufferType),this.setInterpolation(s||this.DefaultInterpolation)}static toJSON(e){let t=e.constructor,n;if(t.toJSON!==this.toJSON)n=t.toJSON(e);else{n={name:e.name,times:ia(e.times,Array),values:ia(e.values,Array)};let s=e.getInterpolation();s!==e.DefaultInterpolation&&(n.interpolation=s)}return n.type=e.ValueTypeName,n}InterpolantFactoryMethodDiscrete(e){return new Fa(this.times,this.values,this.getValueSize(),e)}InterpolantFactoryMethodLinear(e){return new Da(this.times,this.values,this.getValueSize(),e)}InterpolantFactoryMethodSmooth(e){return new La(this.times,this.values,this.getValueSize(),e)}InterpolantFactoryMethodBezier(e){let t=new Na(this.times,this.values,this.getValueSize(),e);return this.settings&&(t.inTangents=this.settings.inTangents,t.outTangents=this.settings.outTangents),t}setInterpolation(e){let t;switch(e){case xr:t=this.InterpolantFactoryMethodDiscrete;break;case va:t=this.InterpolantFactoryMethodLinear;break;case aa:t=this.InterpolantFactoryMethodSmooth;break;case uh:t=this.InterpolantFactoryMethodBezier;break}if(t===void 0){let n="unsupported interpolation for "+this.ValueTypeName+" keyframe track named "+this.name;if(this.createInterpolant===void 0)if(e!==this.DefaultInterpolation)this.setInterpolation(this.DefaultInterpolation);else throw new Error(n);return Ce("KeyframeTrack:",n),this}return this.createInterpolant=t,this}getInterpolation(){switch(this.createInterpolant){case this.InterpolantFactoryMethodDiscrete:return xr;case this.InterpolantFactoryMethodLinear:return va;case this.InterpolantFactoryMethodSmooth:return aa;case this.InterpolantFactoryMethodBezier:return uh}}getValueSize(){return this.values.length/this.times.length}shift(e){if(e!==0){let t=this.times;for(let n=0,s=t.length;n!==s;++n)t[n]+=e}return this}scale(e){if(e!==1){let t=this.times;for(let n=0,s=t.length;n!==s;++n)t[n]*=e}return this}trim(e,t){let n=this.times,s=n.length,r=0,o=s-1;for(;r!==s&&n[r]<e;)++r;for(;o!==-1&&n[o]>t;)--o;if(++o,r!==0||o!==s){r>=o&&(o=Math.max(o,1),r=o-1);let a=this.getValueSize();this.times=n.slice(r,o),this.values=this.values.slice(r*a,o*a)}return this}validate(){let e=!0,t=this.getValueSize();t-Math.floor(t)!==0&&(Ne("KeyframeTrack: Invalid value size in track.",this),e=!1);let n=this.times,s=this.values,r=n.length;r===0&&(Ne("KeyframeTrack: Track is empty.",this),e=!1);let o=null;for(let a=0;a!==r;a++){let l=n[a];if(typeof l=="number"&&isNaN(l)){Ne("KeyframeTrack: Time is not a valid number.",this,a,l),e=!1;break}if(o!==null&&o>l){Ne("KeyframeTrack: Out of order keys.",this,a,l,o),e=!1;break}o=l}if(s!==void 0&&xx(s))for(let a=0,l=s.length;a!==l;++a){let c=s[a];if(isNaN(c)){Ne("KeyframeTrack: Value is not a valid number.",this,a,c),e=!1;break}}return e}optimize(){let e=this.times.slice(),t=this.values.slice(),n=this.getValueSize(),s=this.getInterpolation()===aa,r=e.length-1,o=1;for(let a=1;a<r;++a){let l=!1,c=e[a],u=e[a+1];if(c!==u&&(a!==1||c!==e[0]))if(s)l=!0;else{let f=a*n,d=f-n,g=f+n;for(let m=0;m!==n;++m){let y=t[f+m];if(y!==t[d+m]||y!==t[g+m]){l=!0;break}}}if(l){if(a!==o){e[o]=e[a];let f=a*n,d=o*n;for(let g=0;g!==n;++g)t[d+g]=t[f+g]}++o}}if(r>0){e[o]=e[r];for(let a=r*n,l=o*n,c=0;c!==n;++c)t[l+c]=t[a+c];++o}return o!==e.length?(this.times=e.slice(0,o),this.values=t.slice(0,o*n)):(this.times=e,this.values=t),this}clone(){let e=this.times.slice(),t=this.values.slice(),n=this.constructor,s=new n(this.name,e,t);return s.createInterpolant=this.createInterpolant,s}};h(ku,"KeyframeTrack");var xn=ku;xn.prototype.ValueTypeName="";xn.prototype.TimeBufferType=Float32Array;xn.prototype.ValueBufferType=Float32Array;xn.prototype.DefaultInterpolation=va;var Vu=class Vu extends xn{constructor(e,t,n){super(e,t,n)}};h(Vu,"BooleanKeyframeTrack");var Oi=Vu;Oi.prototype.ValueTypeName="bool";Oi.prototype.ValueBufferType=Array;Oi.prototype.DefaultInterpolation=xr;Oi.prototype.InterpolantFactoryMethodLinear=void 0;Oi.prototype.InterpolantFactoryMethodSmooth=void 0;var Hu=class Hu extends xn{constructor(e,t,n,s){super(e,t,n,s)}};h(Hu,"ColorKeyframeTrack");var Ua=Hu;Ua.prototype.ValueTypeName="color";var Gu=class Gu extends xn{constructor(e,t,n,s){super(e,t,n,s)}};h(Gu,"NumberKeyframeTrack");var Oa=Gu;Oa.prototype.ValueTypeName="number";var Wu=class Wu extends Ui{constructor(e,t,n,s){super(e,t,n,s)}interpolate_(e,t,n,s){let r=this.resultBuffer,o=this.sampleValues,a=this.valueSize,l=(n-t)/(s-t),c=e*a;for(let u=c+a;c!==u;c+=4)$n.slerpFlat(r,0,o,c-a,o,c,l);return r}};h(Wu,"QuaternionLinearInterpolant");var Ba=Wu,Xu=class Xu extends xn{constructor(e,t,n,s){super(e,t,n,s)}InterpolantFactoryMethodLinear(e){return new Ba(this.times,this.values,this.getValueSize(),e)}};h(Xu,"QuaternionKeyframeTrack");var zr=Xu;zr.prototype.ValueTypeName="quaternion";zr.prototype.InterpolantFactoryMethodSmooth=void 0;var qu=class qu extends xn{constructor(e,t,n){super(e,t,n)}};h(qu,"StringKeyframeTrack");var Bi=qu;Bi.prototype.ValueTypeName="string";Bi.prototype.ValueBufferType=Array;Bi.prototype.DefaultInterpolation=xr;Bi.prototype.InterpolantFactoryMethodLinear=void 0;Bi.prototype.InterpolantFactoryMethodSmooth=void 0;var Yu=class Yu extends xn{constructor(e,t,n,s){super(e,t,n,s)}};h(Yu,"VectorKeyframeTrack");var za=Yu;za.prototype.ValueTypeName="vector";var $u=class $u{constructor(e,t,n){let s=this,r=!1,o=0,a=0,l,c=[];this.onStart=void 0,this.onLoad=e,this.onProgress=t,this.onError=n,this._abortController=null,this.itemStart=function(u){a++,r===!1&&s.onStart!==void 0&&s.onStart(u,o,a),r=!0},this.itemEnd=function(u){o++,s.onProgress!==void 0&&s.onProgress(u,o,a),o===a&&(r=!1,s.onLoad!==void 0&&s.onLoad())},this.itemError=function(u){s.onError!==void 0&&s.onError(u)},this.resolveURL=function(u){return u=u.normalize("NFC"),l?l(u):u},this.setURLModifier=function(u){return l=u,this},this.addHandler=function(u,f){return c.push(u,f),this},this.removeHandler=function(u){let f=c.indexOf(u);return f!==-1&&c.splice(f,2),this},this.getHandler=function(u){for(let f=0,d=c.length;f<d;f+=2){let g=c[f],m=c[f+1];if(g.global&&(g.lastIndex=0),g.test(u))return m}return null},this.abort=function(){return this.abortController.abort(),this._abortController=null,this}}get abortController(){return this._abortController||(this._abortController=new AbortController),this._abortController}};h($u,"LoadingManager");var ka=$u,mm=new ka,Ku=class Ku{constructor(e){this.manager=e!==void 0?e:mm,this.crossOrigin="anonymous",this.withCredentials=!1,this.path="",this.resourcePath="",this.requestHeader={},typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("observe",{detail:this}))}load(){}loadAsync(e,t){let n=this;return new Promise(function(s,r){n.load(e,s,t,r)})}parse(){}setCrossOrigin(e){return this.crossOrigin=e,this}setWithCredentials(e){return this.withCredentials=e,this}setPath(e){return this.path=e,this}setResourcePath(e){return this.resourcePath=e,this}setRequestHeader(e){return this.requestHeader=e,this}abort(){return this}};h(Ku,"Loader");var Va=Ku;Va.DEFAULT_MATERIAL_NAME="__DEFAULT";var sa=new O,ra=new $n,Gn=new O,Zu=class Zu extends mn{constructor(){super(),this.isCamera=!0,this.type="Camera",this.matrixWorldInverse=new ct,this.projectionMatrix=new ct,this.projectionMatrixInverse=new ct,this.coordinateSystem=Rn,this._reversedDepth=!1}get reversedDepth(){return this._reversedDepth}copy(e,t){return super.copy(e,t),this.matrixWorldInverse.copy(e.matrixWorldInverse),this.projectionMatrix.copy(e.projectionMatrix),this.projectionMatrixInverse.copy(e.projectionMatrixInverse),this.coordinateSystem=e.coordinateSystem,this}getWorldDirection(e){return super.getWorldDirection(e).negate()}updateMatrixWorld(e){super.updateMatrixWorld(e),this.matrixWorld.decompose(sa,ra,Gn),Gn.x===1&&Gn.y===1&&Gn.z===1?this.matrixWorldInverse.copy(this.matrixWorld).invert():this.matrixWorldInverse.compose(sa,ra,Gn.set(1,1,1)).invert()}updateWorldMatrix(e,t,n=!1){super.updateWorldMatrix(e,t,n),this.matrixWorld.decompose(sa,ra,Gn),Gn.x===1&&Gn.y===1&&Gn.z===1?this.matrixWorldInverse.copy(this.matrixWorld).invert():this.matrixWorldInverse.compose(sa,ra,Gn.set(1,1,1)).invert()}clone(){return new this.constructor().copy(this)}};h(Zu,"Camera");var kr=Zu,Pi=new O,Ep=new We,Tp=new We,Ju=class Ju extends kr{constructor(e=50,t=1,n=.1,s=2e3){super(),this.isPerspectiveCamera=!0,this.type="PerspectiveCamera",this.fov=e,this.zoom=1,this.near=n,this.far=s,this.focus=10,this.aspect=t,this.view=null,this.filmGauge=35,this.filmOffset=0,this.updateProjectionMatrix()}copy(e,t){return super.copy(e,t),this.fov=e.fov,this.zoom=e.zoom,this.near=e.near,this.far=e.far,this.focus=e.focus,this.aspect=e.aspect,this.view=e.view===null?null:Object.assign({},e.view),this.filmGauge=e.filmGauge,this.filmOffset=e.filmOffset,this}setFocalLength(e){let t=.5*this.getFilmHeight()/e;this.fov=Bs*2*Math.atan(t),this.updateProjectionMatrix()}getFocalLength(){let e=Math.tan(pr*.5*this.fov);return .5*this.getFilmHeight()/e}getEffectiveFOV(){return Bs*2*Math.atan(Math.tan(pr*.5*this.fov)/this.zoom)}getFilmWidth(){return this.filmGauge*Math.min(this.aspect,1)}getFilmHeight(){return this.filmGauge/Math.max(this.aspect,1)}getViewBounds(e,t,n){Pi.set(-1,-1,.5).applyMatrix4(this.projectionMatrixInverse),t.set(Pi.x,Pi.y).multiplyScalar(-e/Pi.z),Pi.set(1,1,.5).applyMatrix4(this.projectionMatrixInverse),n.set(Pi.x,Pi.y).multiplyScalar(-e/Pi.z)}getViewSize(e,t){return this.getViewBounds(e,Ep,Tp),t.subVectors(Tp,Ep)}setViewOffset(e,t,n,s,r,o){this.aspect=e/t,this.view===null&&(this.view={enabled:!0,fullWidth:1,fullHeight:1,offsetX:0,offsetY:0,width:1,height:1}),this.view.enabled=!0,this.view.fullWidth=e,this.view.fullHeight=t,this.view.offsetX=n,this.view.offsetY=s,this.view.width=r,this.view.height=o,this.updateProjectionMatrix()}clearViewOffset(){this.view!==null&&(this.view.enabled=!1),this.updateProjectionMatrix()}updateProjectionMatrix(){let e=this.near,t=e*Math.tan(pr*.5*this.fov)/this.zoom,n=2*t,s=this.aspect*n,r=-.5*s,o=this.view;if(this.view!==null&&this.view.enabled){let l=o.fullWidth,c=o.fullHeight;r+=o.offsetX*s/l,t-=o.offsetY*n/c,s*=o.width/l,n*=o.height/c}let a=this.filmOffset;a!==0&&(r+=e*a/this.getFilmWidth()),this.projectionMatrix.makePerspective(r,r+s,t,t-n,e,this.far,this.coordinateSystem,this.reversedDepth),this.projectionMatrixInverse.copy(this.projectionMatrix).invert()}toJSON(e){let t=super.toJSON(e);return t.object.fov=this.fov,t.object.zoom=this.zoom,t.object.near=this.near,t.object.far=this.far,t.object.focus=this.focus,t.object.aspect=this.aspect,this.view!==null&&(t.object.view=Object.assign({},this.view)),t.object.filmGauge=this.filmGauge,t.object.filmOffset=this.filmOffset,t}};h(Ju,"PerspectiveCamera");var Jt=Ju;var ju=class ju extends kr{constructor(e=-1,t=1,n=1,s=-1,r=.1,o=2e3){super(),this.isOrthographicCamera=!0,this.type="OrthographicCamera",this.zoom=1,this.view=null,this.left=e,this.right=t,this.top=n,this.bottom=s,this.near=r,this.far=o,this.updateProjectionMatrix()}copy(e,t){return super.copy(e,t),this.left=e.left,this.right=e.right,this.top=e.top,this.bottom=e.bottom,this.near=e.near,this.far=e.far,this.zoom=e.zoom,this.view=e.view===null?null:Object.assign({},e.view),this}setViewOffset(e,t,n,s,r,o){this.view===null&&(this.view={enabled:!0,fullWidth:1,fullHeight:1,offsetX:0,offsetY:0,width:1,height:1}),this.view.enabled=!0,this.view.fullWidth=e,this.view.fullHeight=t,this.view.offsetX=n,this.view.offsetY=s,this.view.width=r,this.view.height=o,this.updateProjectionMatrix()}clearViewOffset(){this.view!==null&&(this.view.enabled=!1),this.updateProjectionMatrix()}updateProjectionMatrix(){let e=(this.right-this.left)/(2*this.zoom),t=(this.top-this.bottom)/(2*this.zoom),n=(this.right+this.left)/2,s=(this.top+this.bottom)/2,r=n-e,o=n+e,a=s+t,l=s-t;if(this.view!==null&&this.view.enabled){let c=(this.right-this.left)/this.view.fullWidth/this.zoom,u=(this.top-this.bottom)/this.view.fullHeight/this.zoom;r+=c*this.view.offsetX,o=r+c*this.view.width,a-=u*this.view.offsetY,l=a-u*this.view.height}this.projectionMatrix.makeOrthographic(r,o,a,l,this.near,this.far,this.coordinateSystem,this.reversedDepth),this.projectionMatrixInverse.copy(this.projectionMatrix).invert()}toJSON(e){let t=super.toJSON(e);return t.object.zoom=this.zoom,t.object.left=this.left,t.object.right=this.right,t.object.top=this.top,t.object.bottom=this.bottom,t.object.near=this.near,t.object.far=this.far,this.view!==null&&(t.object.view=Object.assign({},this.view)),t}};h(ju,"OrthographicCamera");var rs=ju;var Qu=class Qu extends Lt{constructor(){super(),this.isInstancedBufferGeometry=!0,this.type="InstancedBufferGeometry",this.instanceCount=1/0}copy(e){return super.copy(e),this.instanceCount=e.instanceCount,this}toJSON(){let e=super.toJSON();return e.instanceCount=this.instanceCount,e.isInstancedBufferGeometry=!0,e}};h(Qu,"InstancedBufferGeometry");var Vr=Qu;var Cs=-90,Is=1,ed=class ed extends mn{constructor(e,t,n){super(),this.type="CubeCamera",this.renderTarget=n,this.coordinateSystem=null,this.activeMipmapLevel=0;let s=new Jt(Cs,Is,e,t);s.layers=this.layers,this.add(s);let r=new Jt(Cs,Is,e,t);r.layers=this.layers,this.add(r);let o=new Jt(Cs,Is,e,t);o.layers=this.layers,this.add(o);let a=new Jt(Cs,Is,e,t);a.layers=this.layers,this.add(a);let l=new Jt(Cs,Is,e,t);l.layers=this.layers,this.add(l);let c=new Jt(Cs,Is,e,t);c.layers=this.layers,this.add(c)}updateCoordinateSystem(){let e=this.coordinateSystem,t=this.children.concat(),[n,s,r,o,a,l]=t;for(let c of t)this.remove(c);if(e===Rn)n.up.set(0,1,0),n.lookAt(1,0,0),s.up.set(0,1,0),s.lookAt(-1,0,0),r.up.set(0,0,-1),r.lookAt(0,1,0),o.up.set(0,0,1),o.lookAt(0,-1,0),a.up.set(0,1,0),a.lookAt(0,0,1),l.up.set(0,1,0),l.lookAt(0,0,-1);else if(e===_r)n.up.set(0,-1,0),n.lookAt(-1,0,0),s.up.set(0,-1,0),s.lookAt(1,0,0),r.up.set(0,0,1),r.lookAt(0,1,0),o.up.set(0,0,-1),o.lookAt(0,-1,0),a.up.set(0,-1,0),a.lookAt(0,0,1),l.up.set(0,-1,0),l.lookAt(0,0,-1);else throw new Error("THREE.CubeCamera.updateCoordinateSystem(): Invalid coordinate system: "+e);for(let c of t)this.add(c),c.updateMatrixWorld()}update(e,t){this.parent===null&&this.updateMatrixWorld();let{renderTarget:n,activeMipmapLevel:s}=this;this.coordinateSystem!==e.coordinateSystem&&(this.coordinateSystem=e.coordinateSystem,this.updateCoordinateSystem());let[r,o,a,l,c,u]=this.children,f=e.getRenderTarget(),d=e.getActiveCubeFace(),g=e.getActiveMipmapLevel(),m=e.xr.enabled;e.xr.enabled=!1;let y=n.texture.generateMipmaps;n.texture.generateMipmaps=!1;let p=!1;e.isWebGLRenderer===!0?p=e.state.buffers.depth.getReversed():p=e.reversedDepthBuffer,e.setRenderTarget(n,0,s),p&&e.autoClear===!1&&e.clearDepth(),e.render(t,r),e.setRenderTarget(n,1,s),p&&e.autoClear===!1&&e.clearDepth(),e.render(t,o),e.setRenderTarget(n,2,s),p&&e.autoClear===!1&&e.clearDepth(),e.render(t,a),e.setRenderTarget(n,3,s),p&&e.autoClear===!1&&e.clearDepth(),e.render(t,l),e.setRenderTarget(n,4,s),p&&e.autoClear===!1&&e.clearDepth(),e.render(t,c),n.texture.generateMipmaps=y,e.setRenderTarget(n,5,s),p&&e.autoClear===!1&&e.clearDepth(),e.render(t,u),e.setRenderTarget(f,d,g),e.xr.enabled=m,n.texture.needsPMREMUpdate=!0}};h(ed,"CubeCamera");var Ha=ed,td=class td extends Jt{constructor(e=[]){super(),this.isArrayCamera=!0,this.isMultiViewCamera=!1,this.cameras=e}};h(td,"ArrayCamera");var Ga=td;var qh="\\[\\]\\.:\\/",y0=new RegExp("["+qh+"]","g"),Yh="[^"+qh+"]",v0="[^"+qh.replace("\\.","")+"]",_0=/((?:WC+[\/:])*)/.source.replace("WC",Yh),b0=/(WCOD+)?/.source.replace("WCOD",v0),S0=/(?:\.(WC+)(?:\[(.+)\])?)?/.source.replace("WC",Yh),M0=/\.(WC+)(?:\[(.+)\])?/.source.replace("WC",Yh),w0=new RegExp("^"+_0+b0+S0+M0+"$"),E0=["material","materials","bones","map"],nd=class nd{constructor(e,t,n){let s=n||mt.parseTrackName(t);this._targetGroup=e,this._bindings=e.subscribe_(t,s)}getValue(e,t){this.bind();let n=this._targetGroup.nCachedObjects_,s=this._bindings[n];s!==void 0&&s.getValue(e,t)}setValue(e,t){let n=this._bindings;for(let s=this._targetGroup.nCachedObjects_,r=n.length;s!==r;++s)n[s].setValue(e,t)}bind(){let e=this._bindings;for(let t=this._targetGroup.nCachedObjects_,n=e.length;t!==n;++t)e[t].bind()}unbind(){let e=this._bindings;for(let t=this._targetGroup.nCachedObjects_,n=e.length;t!==n;++t)e[t].unbind()}};h(nd,"Composite");var vh=nd,Ci=class Ci{constructor(e,t,n){this.path=t,this.parsedPath=n||Ci.parseTrackName(t),this.node=Ci.findNode(e,this.parsedPath.nodeName),this.rootNode=e,this.getValue=this._getValue_unbound,this.setValue=this._setValue_unbound}static create(e,t,n){return e&&e.isAnimationObjectGroup?new Ci.Composite(e,t,n):new Ci(e,t,n)}static sanitizeNodeName(e){return e.replace(/\s/g,"_").replace(y0,"")}static parseTrackName(e){let t=w0.exec(e);if(t===null)throw new Error("THREE.PropertyBinding: Cannot parse trackName: "+e);let n={nodeName:t[2],objectName:t[3],objectIndex:t[4],propertyName:t[5],propertyIndex:t[6]},s=n.nodeName&&n.nodeName.lastIndexOf(".");if(s!==void 0&&s!==-1){let r=n.nodeName.substring(s+1);E0.indexOf(r)!==-1&&(n.nodeName=n.nodeName.substring(0,s),n.objectName=r)}if(n.propertyName===null||n.propertyName.length===0)throw new Error("THREE.PropertyBinding: can not parse propertyName from trackName: "+e);return n}static findNode(e,t){if(t===void 0||t===""||t==="."||t===-1||t===e.name||t===e.uuid)return e;if(e.skeleton){let n=e.skeleton.getBoneByName(t);if(n!==void 0)return n}if(e.children){let n=h(function(r){for(let o=0;o<r.length;o++){let a=r[o];if(a.name===t||a.uuid===t)return a;let l=n(a.children);if(l)return l}return null},"searchNodeSubtree"),s=n(e.children);if(s)return s}return null}_getValue_unavailable(){}_setValue_unavailable(){}_getValue_direct(e,t){e[t]=this.targetObject[this.propertyName]}_getValue_array(e,t){let n=this.resolvedProperty;for(let s=0,r=n.length;s!==r;++s)e[t++]=n[s]}_getValue_arrayElement(e,t){e[t]=this.resolvedProperty[this.propertyIndex]}_getValue_toArray(e,t){this.resolvedProperty.toArray(e,t)}_setValue_direct(e,t){this.targetObject[this.propertyName]=e[t]}_setValue_direct_setNeedsUpdate(e,t){this.targetObject[this.propertyName]=e[t],this.targetObject.needsUpdate=!0}_setValue_direct_setMatrixWorldNeedsUpdate(e,t){this.targetObject[this.propertyName]=e[t],this.targetObject.matrixWorldNeedsUpdate=!0}_setValue_array(e,t){let n=this.resolvedProperty;for(let s=0,r=n.length;s!==r;++s)n[s]=e[t++]}_setValue_array_setNeedsUpdate(e,t){let n=this.resolvedProperty;for(let s=0,r=n.length;s!==r;++s)n[s]=e[t++];this.targetObject.needsUpdate=!0}_setValue_array_setMatrixWorldNeedsUpdate(e,t){let n=this.resolvedProperty;for(let s=0,r=n.length;s!==r;++s)n[s]=e[t++];this.targetObject.matrixWorldNeedsUpdate=!0}_setValue_arrayElement(e,t){this.resolvedProperty[this.propertyIndex]=e[t]}_setValue_arrayElement_setNeedsUpdate(e,t){this.resolvedProperty[this.propertyIndex]=e[t],this.targetObject.needsUpdate=!0}_setValue_arrayElement_setMatrixWorldNeedsUpdate(e,t){this.resolvedProperty[this.propertyIndex]=e[t],this.targetObject.matrixWorldNeedsUpdate=!0}_setValue_fromArray(e,t){this.resolvedProperty.fromArray(e,t)}_setValue_fromArray_setNeedsUpdate(e,t){this.resolvedProperty.fromArray(e,t),this.targetObject.needsUpdate=!0}_setValue_fromArray_setMatrixWorldNeedsUpdate(e,t){this.resolvedProperty.fromArray(e,t),this.targetObject.matrixWorldNeedsUpdate=!0}_getValue_unbound(e,t){this.bind(),this.getValue(e,t)}_setValue_unbound(e,t){this.bind(),this.setValue(e,t)}bind(){let e=this.node,t=this.parsedPath,n=t.objectName,s=t.propertyName,r=t.propertyIndex;if(e||(e=Ci.findNode(this.rootNode,t.nodeName),this.node=e),this.getValue=this._getValue_unavailable,this.setValue=this._setValue_unavailable,!e){Ce("PropertyBinding: No target node found for track: "+this.path+".");return}if(n){let c=t.objectIndex;switch(n){case"materials":if(!e.material){Ne("PropertyBinding: Can not bind to material as node does not have a material.",this);return}if(!e.material.materials){Ne("PropertyBinding: Can not bind to material.materials as node.material does not have a materials array.",this);return}e=e.material.materials;break;case"bones":if(!e.skeleton){Ne("PropertyBinding: Can not bind to bones as node does not have a skeleton.",this);return}e=e.skeleton.bones;for(let u=0;u<e.length;u++)if(e[u].name===c){c=u;break}break;case"map":if("map"in e){e=e.map;break}if(!e.material){Ne("PropertyBinding: Can not bind to material as node does not have a material.",this);return}if(!e.material.map){Ne("PropertyBinding: Can not bind to material.map as node.material does not have a map.",this);return}e=e.material.map;break;default:if(e[n]===void 0){Ne("PropertyBinding: Can not bind to objectName of node undefined.",this);return}e=e[n]}if(c!==void 0){if(e[c]===void 0){Ne("PropertyBinding: Trying to bind to objectIndex of objectName, but is undefined.",this,e);return}e=e[c]}}let o=e[s];if(o===void 0){let c=t.nodeName;Ne("PropertyBinding: Trying to update property for track: "+c+"."+s+" but it wasn't found.",e);return}let a=this.Versioning.None;this.targetObject=e,e.isMaterial===!0?a=this.Versioning.NeedsUpdate:e.isObject3D===!0&&(a=this.Versioning.MatrixWorldNeedsUpdate);let l=this.BindingType.Direct;if(r!==void 0){if(s==="morphTargetInfluences"){if(!e.geometry){Ne("PropertyBinding: Can not bind to morphTargetInfluences because node does not have a geometry.",this);return}if(!e.geometry.morphAttributes){Ne("PropertyBinding: Can not bind to morphTargetInfluences because node does not have a geometry.morphAttributes.",this);return}e.morphTargetDictionary[r]!==void 0&&(r=e.morphTargetDictionary[r])}l=this.BindingType.ArrayElement,this.resolvedProperty=o,this.propertyIndex=r}else o.fromArray!==void 0&&o.toArray!==void 0?(l=this.BindingType.HasFromToArray,this.resolvedProperty=o):Array.isArray(o)?(l=this.BindingType.EntireArray,this.resolvedProperty=o):this.propertyName=s;this.getValue=this.GetterByBindingType[l],this.setValue=this.SetterByBindingTypeAndVersioning[l][a]}unbind(){this.node=null,this.getValue=this._getValue_unbound,this.setValue=this._setValue_unbound}};h(Ci,"PropertyBinding");var mt=Ci;mt.Composite=vh;mt.prototype.BindingType={Direct:0,EntireArray:1,ArrayElement:2,HasFromToArray:3};mt.prototype.Versioning={None:0,NeedsUpdate:1,MatrixWorldNeedsUpdate:2};mt.prototype.GetterByBindingType=[mt.prototype._getValue_direct,mt.prototype._getValue_array,mt.prototype._getValue_arrayElement,mt.prototype._getValue_toArray];mt.prototype.SetterByBindingTypeAndVersioning=[[mt.prototype._setValue_direct,mt.prototype._setValue_direct_setNeedsUpdate,mt.prototype._setValue_direct_setMatrixWorldNeedsUpdate],[mt.prototype._setValue_array,mt.prototype._setValue_array_setNeedsUpdate,mt.prototype._setValue_array_setMatrixWorldNeedsUpdate],[mt.prototype._setValue_arrayElement,mt.prototype._setValue_arrayElement_setNeedsUpdate,mt.prototype._setValue_arrayElement_setMatrixWorldNeedsUpdate],[mt.prototype._setValue_fromArray,mt.prototype._setValue_fromArray_setNeedsUpdate,mt.prototype._setValue_fromArray_setMatrixWorldNeedsUpdate]];var Hw=new Float32Array(1);var id=class id extends wa{constructor(e,t,n=1){super(e,t),this.isInstancedInterleavedBuffer=!0,this.meshPerAttribute=n}copy(e){return super.copy(e),this.meshPerAttribute=e.meshPerAttribute,this}clone(e){let t=super.clone(e);return t.meshPerAttribute=this.meshPerAttribute,t}toJSON(e){let t=super.toJSON(e);return t.isInstancedInterleavedBuffer=!0,t.meshPerAttribute=this.meshPerAttribute,t}};h(id,"InstancedInterleavedBuffer");var zi=id;var nl=class nl{constructor(e,t,n,s){this.elements=[1,0,0,1],e!==void 0&&this.set(e,t,n,s)}identity(){return this.set(1,0,0,1),this}fromArray(e,t=0){for(let n=0;n<4;n++)this.elements[n]=e[n+t];return this}set(e,t,n,s){let r=this.elements;return r[0]=e,r[2]=t,r[1]=n,r[3]=s,this}};h(nl,"Matrix2"),nl.prototype.isMatrix2=!0;var _h=nl;var Ap=new O,oa=new O,Ls=new O,Ds=new O,hh=new O,T0=new O,A0=new O,sd=class sd{constructor(e=new O,t=new O){this.start=e,this.end=t}set(e,t){return this.start.copy(e),this.end.copy(t),this}copy(e){return this.start.copy(e.start),this.end.copy(e.end),this}getCenter(e){return e.addVectors(this.start,this.end).multiplyScalar(.5)}delta(e){return e.subVectors(this.end,this.start)}distanceSq(){return this.start.distanceToSquared(this.end)}distance(){return this.start.distanceTo(this.end)}at(e,t){return this.delta(t).multiplyScalar(e).add(this.start)}closestPointToPointParameter(e,t){Ap.subVectors(e,this.start),oa.subVectors(this.end,this.start);let n=oa.dot(oa);if(n===0)return 0;let r=oa.dot(Ap)/n;return t&&(r=Ve(r,0,1)),r}closestPointToPoint(e,t,n){let s=this.closestPointToPointParameter(e,t);return this.delta(n).multiplyScalar(s).add(this.start)}distanceSqToLine3(e,t=T0,n=A0){let s=10000000000000001e-32,r,o,a=this.start,l=e.start,c=this.end,u=e.end;Ls.subVectors(c,a),Ds.subVectors(u,l),hh.subVectors(a,l);let f=Ls.dot(Ls),d=Ds.dot(Ds),g=Ds.dot(hh);if(f<=s&&d<=s)return t.copy(a),n.copy(l),t.sub(n),t.dot(t);if(f<=s)r=0,o=g/d,o=Ve(o,0,1);else{let m=Ls.dot(hh);if(d<=s)o=0,r=Ve(-m/f,0,1);else{let y=Ls.dot(Ds),p=f*d-y*y;p!==0?r=Ve((y*g-m*d)/p,0,1):r=0,o=(y*r+g)/d,o<0?(o=0,r=Ve(-m/f,0,1)):o>1&&(o=1,r=Ve((y-m)/f,0,1))}}return t.copy(a).addScaledVector(Ls,r),n.copy(l).addScaledVector(Ds,o),t.distanceToSquared(n)}applyMatrix4(e){return this.start.applyMatrix4(e),this.end.applyMatrix4(e),this}equals(e){return e.start.equals(this.start)&&e.end.equals(this.end)}clone(){return new this.constructor().copy(this)}};h(sd,"Line3");var Hr=sd;function $h(i,e,t,n){let s=P0(n);switch(t){case Bh:return i*e;case kh:return i*e/s.components*s.byteLength;case hl:return i*e/s.components*s.byteLength;case Gi:return i*e*2/s.components*s.byteLength;case ul:return i*e*2/s.components*s.byteLength;case zh:return i*e*3/s.components*s.byteLength;case Mn:return i*e*4/s.components*s.byteLength;case dl:return i*e*4/s.components*s.byteLength;case qr:case Yr:return Math.floor((i+3)/4)*Math.floor((e+3)/4)*8;case $r:case Kr:return Math.floor((i+3)/4)*Math.floor((e+3)/4)*16;case pl:case gl:return Math.max(i,16)*Math.max(e,8)/4;case fl:case ml:return Math.max(i,8)*Math.max(e,8)/2;case xl:case yl:case _l:case bl:return Math.floor((i+3)/4)*Math.floor((e+3)/4)*8;case vl:case Zr:case Sl:return Math.floor((i+3)/4)*Math.floor((e+3)/4)*16;case Ml:return Math.floor((i+3)/4)*Math.floor((e+3)/4)*16;case wl:return Math.floor((i+4)/5)*Math.floor((e+3)/4)*16;case El:return Math.floor((i+4)/5)*Math.floor((e+4)/5)*16;case Tl:return Math.floor((i+5)/6)*Math.floor((e+4)/5)*16;case Al:return Math.floor((i+5)/6)*Math.floor((e+5)/6)*16;case Pl:return Math.floor((i+7)/8)*Math.floor((e+4)/5)*16;case Rl:return Math.floor((i+7)/8)*Math.floor((e+5)/6)*16;case Cl:return Math.floor((i+7)/8)*Math.floor((e+7)/8)*16;case Il:return Math.floor((i+9)/10)*Math.floor((e+4)/5)*16;case Ll:return Math.floor((i+9)/10)*Math.floor((e+5)/6)*16;case Dl:return Math.floor((i+9)/10)*Math.floor((e+7)/8)*16;case Fl:return Math.floor((i+9)/10)*Math.floor((e+9)/10)*16;case Nl:return Math.floor((i+11)/12)*Math.floor((e+9)/10)*16;case Ul:return Math.floor((i+11)/12)*Math.floor((e+11)/12)*16;case Ol:case Bl:case zl:return Math.ceil(i/4)*Math.ceil(e/4)*16;case kl:case Vl:return Math.ceil(i/4)*Math.ceil(e/4)*8;case Jr:case Hl:return Math.ceil(i/4)*Math.ceil(e/4)*16}throw new Error(`Unable to determine texture byte length for ${t} format.`)}h($h,"getByteLength");function P0(i){switch(i){case yn:case Fh:return{byteLength:1,components:1};case Ys:case Nh:case Zn:return{byteLength:2,components:1};case ll:case cl:return{byteLength:2,components:4};case Fn:case al:case Nn:return{byteLength:4,components:1};case Uh:case Oh:return{byteLength:4,components:3}}throw new Error(`THREE.TextureUtils: Unknown texture type ${i}.`)}h(P0,"getTextureTypeByteLength");typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("register",{detail:{revision:il}}));typeof window<"u"&&(window.__THREE__?Ce("WARNING: Multiple instances of Three.js being imported."):window.__THREE__=il);function Bm(){let i=null,e=!1,t=null,n=null;function s(r,o){t(r,o),n=i.requestAnimationFrame(s)}return h(s,"onAnimationFrame"),{start:h(function(){e!==!0&&t!==null&&i!==null&&(n=i.requestAnimationFrame(s),e=!0)},"start"),stop:h(function(){i!==null&&i.cancelAnimationFrame(n),e=!1},"stop"),setAnimationLoop:h(function(r){t=r},"setAnimationLoop"),setContext:h(function(r){i=r},"setContext")}}h(Bm,"WebGLAnimation");function R0(i){let e=new WeakMap;function t(a,l){let c=a.array,u=a.usage,f=c.byteLength,d=i.createBuffer();i.bindBuffer(l,d),i.bufferData(l,c,u),a.onUploadCallback();let g;if(c instanceof Float32Array)g=i.FLOAT;else if(typeof Float16Array<"u"&&c instanceof Float16Array)g=i.HALF_FLOAT;else if(c instanceof Uint16Array)a.isFloat16BufferAttribute?g=i.HALF_FLOAT:g=i.UNSIGNED_SHORT;else if(c instanceof Int16Array)g=i.SHORT;else if(c instanceof Uint32Array)g=i.UNSIGNED_INT;else if(c instanceof Int32Array)g=i.INT;else if(c instanceof Int8Array)g=i.BYTE;else if(c instanceof Uint8Array)g=i.UNSIGNED_BYTE;else if(c instanceof Uint8ClampedArray)g=i.UNSIGNED_BYTE;else throw new Error("THREE.WebGLAttributes: Unsupported buffer data format: "+c);return{buffer:d,type:g,bytesPerElement:c.BYTES_PER_ELEMENT,version:a.version,size:f}}h(t,"createBuffer");function n(a,l,c){let u=l.array,f=l.updateRanges;if(i.bindBuffer(c,a),f.length===0)i.bufferSubData(c,0,u);else{f.sort((g,m)=>g.start-m.start);let d=0;for(let g=1;g<f.length;g++){let m=f[d],y=f[g];y.start<=m.start+m.count+1?m.count=Math.max(m.count,y.start+y.count-m.start):(++d,f[d]=y)}f.length=d+1;for(let g=0,m=f.length;g<m;g++){let y=f[g];i.bufferSubData(c,y.start*u.BYTES_PER_ELEMENT,u,y.start,y.count)}l.clearUpdateRanges()}l.onUploadCallback()}h(n,"updateBuffer");function s(a){return a.isInterleavedBufferAttribute&&(a=a.data),e.get(a)}h(s,"get");function r(a){a.isInterleavedBufferAttribute&&(a=a.data);let l=e.get(a);l&&(i.deleteBuffer(l.buffer),e.delete(a))}h(r,"remove");function o(a,l){if(a.isInterleavedBufferAttribute&&(a=a.data),a.isGLBufferAttribute){let u=e.get(a);(!u||u.version<a.version)&&e.set(a,{buffer:a.buffer,type:a.type,bytesPerElement:a.elementSize,version:a.version});return}let c=e.get(a);if(c===void 0)e.set(a,t(a,l));else if(c.version<a.version){if(c.size!==a.array.byteLength)throw new Error("THREE.WebGLAttributes: The size of the buffer attribute's array buffer does not match the original size. Resizing buffer attributes is not supported.");n(c.buffer,a,l),c.version=a.version}}return h(o,"update"),{get:s,remove:r,update:o}}h(R0,"WebGLAttributes");var C0=`#ifdef USE_ALPHAHASH
	if ( diffuseColor.a < getAlphaHashThreshold( vPosition ) ) discard;
#endif`,I0=`#ifdef USE_ALPHAHASH
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
#endif`,L0=`#ifdef USE_ALPHAMAP
	diffuseColor.a *= texture2D( alphaMap, vAlphaMapUv ).g;
#endif`,D0=`#ifdef USE_ALPHAMAP
	uniform sampler2D alphaMap;
#endif`,F0=`#ifdef USE_ALPHATEST
	#ifdef ALPHA_TO_COVERAGE
	diffuseColor.a = smoothstep( alphaTest, alphaTest + fwidth( diffuseColor.a ), diffuseColor.a );
	if ( diffuseColor.a == 0.0 ) discard;
	#else
	if ( diffuseColor.a < alphaTest ) discard;
	#endif
#endif`,N0=`#ifdef USE_ALPHATEST
	uniform float alphaTest;
#endif`,U0=`#ifdef USE_AOMAP
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
#endif`,O0=`#ifdef USE_AOMAP
	uniform sampler2D aoMap;
	uniform float aoMapIntensity;
#endif`,B0=`#ifdef USE_BATCHING
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
#endif`,z0=`#ifdef USE_BATCHING
	mat4 batchingMatrix = getBatchingMatrix( getIndirectIndex( gl_DrawID ) );
#endif`,k0=`vec3 transformed = vec3( position );
#ifdef USE_ALPHAHASH
	vPosition = vec3( position );
#endif`,V0=`vec3 objectNormal = vec3( normal );
#ifdef USE_TANGENT
	vec3 objectTangent = vec3( tangent.xyz );
#endif`,H0=`float G_BlinnPhong_Implicit( ) {
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
} // validated`,G0=`#ifdef USE_IRIDESCENCE
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
#endif`,W0=`#ifdef USE_BUMPMAP
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
#endif`,X0=`#if NUM_CLIPPING_PLANES > 0
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
#endif`,q0=`#if NUM_CLIPPING_PLANES > 0
	varying vec3 vClipPosition;
	uniform vec4 clippingPlanes[ NUM_CLIPPING_PLANES ];
#endif`,Y0=`#if NUM_CLIPPING_PLANES > 0
	varying vec3 vClipPosition;
#endif`,$0=`#if NUM_CLIPPING_PLANES > 0
	vClipPosition = - mvPosition.xyz;
#endif`,K0=`#if defined( USE_COLOR ) || defined( USE_COLOR_ALPHA )
	diffuseColor *= vColor;
#endif`,Z0=`#if defined( USE_COLOR ) || defined( USE_COLOR_ALPHA )
	varying vec4 vColor;
#endif`,J0=`#if defined( USE_COLOR ) || defined( USE_COLOR_ALPHA ) || defined( USE_INSTANCING_COLOR ) || defined( USE_BATCHING_COLOR )
	varying vec4 vColor;
#endif`,j0=`#if defined( USE_COLOR ) || defined( USE_COLOR_ALPHA ) || defined( USE_INSTANCING_COLOR ) || defined( USE_BATCHING_COLOR )
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
#endif`,Q0=`#define PI 3.141592653589793
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
} // validated`,ey=`#ifdef ENVMAP_TYPE_CUBE_UV
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
#endif`,ty=`vec3 transformedNormal = objectNormal;
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
#endif`,ny=`#ifdef USE_DISPLACEMENTMAP
	uniform sampler2D displacementMap;
	uniform float displacementScale;
	uniform float displacementBias;
#endif`,iy=`#ifdef USE_DISPLACEMENTMAP
	transformed += normalize( objectNormal ) * ( texture2D( displacementMap, vDisplacementMapUv ).x * displacementScale + displacementBias );
#endif`,sy=`#ifdef USE_EMISSIVEMAP
	vec4 emissiveColor = texture2D( emissiveMap, vEmissiveMapUv );
	#ifdef DECODE_VIDEO_TEXTURE_EMISSIVE
		emissiveColor = sRGBTransferEOTF( emissiveColor );
	#endif
	totalEmissiveRadiance *= emissiveColor.rgb;
#endif`,ry=`#ifdef USE_EMISSIVEMAP
	uniform sampler2D emissiveMap;
#endif`,oy="gl_FragColor = linearToOutputTexel( gl_FragColor );",ay=`vec4 LinearTransferOETF( in vec4 value ) {
	return value;
}
vec4 sRGBTransferEOTF( in vec4 value ) {
	return vec4( mix( pow( value.rgb * 0.9478672986 + vec3( 0.0521327014 ), vec3( 2.4 ) ), value.rgb * 0.0773993808, vec3( lessThanEqual( value.rgb, vec3( 0.04045 ) ) ) ), value.a );
}
vec4 sRGBTransferOETF( in vec4 value ) {
	return vec4( mix( pow( value.rgb, vec3( 0.41666 ) ) * 1.055 - vec3( 0.055 ), value.rgb * 12.92, vec3( lessThanEqual( value.rgb, vec3( 0.0031308 ) ) ) ), value.a );
}`,ly=`#ifdef USE_ENVMAP
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
#endif`,cy=`#ifdef USE_ENVMAP
	uniform float envMapIntensity;
	uniform mat3 envMapRotation;
	#ifdef ENVMAP_TYPE_CUBE
		uniform samplerCube envMap;
	#else
		uniform sampler2D envMap;
	#endif
#endif`,hy=`#ifdef USE_ENVMAP
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
#endif`,uy=`#ifdef USE_ENVMAP
	#if defined( USE_BUMPMAP ) || defined( USE_NORMALMAP ) || defined( PHONG ) || defined( LAMBERT )
		#define ENV_WORLDPOS
	#endif
	#ifdef ENV_WORLDPOS
		
		varying vec3 vWorldPosition;
	#else
		varying vec3 vReflect;
		uniform float refractionRatio;
	#endif
#endif`,dy=`#ifdef USE_ENVMAP
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
#endif`,fy=`#ifdef USE_FOG
	vFogDepth = - mvPosition.z;
#endif`,py=`#ifdef USE_FOG
	varying float vFogDepth;
#endif`,my=`#ifdef USE_FOG
	#ifdef FOG_EXP2
		float fogFactor = 1.0 - exp( - fogDensity * fogDensity * vFogDepth * vFogDepth );
	#else
		float fogFactor = smoothstep( fogNear, fogFar, vFogDepth );
	#endif
	gl_FragColor.rgb = mix( gl_FragColor.rgb, fogColor, fogFactor );
#endif`,gy=`#ifdef USE_FOG
	uniform vec3 fogColor;
	varying float vFogDepth;
	#ifdef FOG_EXP2
		uniform float fogDensity;
	#else
		uniform float fogNear;
		uniform float fogFar;
	#endif
#endif`,xy=`#ifdef USE_GRADIENTMAP
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
}`,yy=`#ifdef USE_LIGHTMAP
	uniform sampler2D lightMap;
	uniform float lightMapIntensity;
#endif`,vy=`LambertMaterial material;
material.diffuseColor = diffuseColor.rgb;
material.specularStrength = specularStrength;`,_y=`varying vec3 vViewPosition;
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
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Lambert`,by=`uniform bool receiveShadow;
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
#include <lightprobes_pars_fragment>`,Sy=`#ifdef USE_ENVMAP
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
#endif`,My=`ToonMaterial material;
material.diffuseColor = diffuseColor.rgb;`,wy=`varying vec3 vViewPosition;
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
#define RE_IndirectDiffuse		RE_IndirectDiffuse_Toon`,Ey=`BlinnPhongMaterial material;
material.diffuseColor = diffuseColor.rgb;
material.specularColor = specular;
material.specularShininess = shininess;
material.specularStrength = specularStrength;`,Ty=`varying vec3 vViewPosition;
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
#define RE_IndirectDiffuse		RE_IndirectDiffuse_BlinnPhong`,Ay=`PhysicalMaterial material;
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
#endif`,Py=`uniform sampler2D dfgLUT;
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
}`,Ry=`
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
#endif`,Cy=`#if defined( RE_IndirectDiffuse )
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
#endif`,Iy=`#if defined( RE_IndirectDiffuse )
	#if defined( LAMBERT ) || defined( PHONG )
		irradiance += iblIrradiance;
	#endif
	RE_IndirectDiffuse( irradiance, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
#endif
#if defined( RE_IndirectSpecular )
	RE_IndirectSpecular( radiance, iblIrradiance, clearcoatRadiance, geometryPosition, geometryNormal, geometryViewDir, geometryClearcoatNormal, material, reflectedLight );
#endif`,Ly=`#ifdef USE_LIGHT_PROBES_GRID
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
#endif`,Dy=`#if defined( USE_LOGARITHMIC_DEPTH_BUFFER )
	gl_FragDepth = vIsPerspective == 0.0 ? gl_FragCoord.z : log2( vFragDepth ) * logDepthBufFC * 0.5;
#endif`,Fy=`#if defined( USE_LOGARITHMIC_DEPTH_BUFFER )
	uniform float logDepthBufFC;
	varying float vFragDepth;
	varying float vIsPerspective;
#endif`,Ny=`#ifdef USE_LOGARITHMIC_DEPTH_BUFFER
	varying float vFragDepth;
	varying float vIsPerspective;
#endif`,Uy=`#ifdef USE_LOGARITHMIC_DEPTH_BUFFER
	vFragDepth = 1.0 + gl_Position.w;
	vIsPerspective = float( isPerspectiveMatrix( projectionMatrix ) );
#endif`,Oy=`#ifdef USE_MAP
	vec4 sampledDiffuseColor = texture2D( map, vMapUv );
	#ifdef DECODE_VIDEO_TEXTURE
		sampledDiffuseColor = sRGBTransferEOTF( sampledDiffuseColor );
	#endif
	diffuseColor *= sampledDiffuseColor;
#endif`,By=`#ifdef USE_MAP
	uniform sampler2D map;
#endif`,zy=`#if defined( USE_MAP ) || defined( USE_ALPHAMAP )
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
#endif`,ky=`#if defined( USE_POINTS_UV )
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
#endif`,Vy=`float metalnessFactor = metalness;
#ifdef USE_METALNESSMAP
	vec4 texelMetalness = texture2D( metalnessMap, vMetalnessMapUv );
	metalnessFactor *= texelMetalness.b;
#endif`,Hy=`#ifdef USE_METALNESSMAP
	uniform sampler2D metalnessMap;
#endif`,Gy=`#ifdef USE_INSTANCING_MORPH
	float morphTargetInfluences[ MORPHTARGETS_COUNT ];
	float morphTargetBaseInfluence = texelFetch( morphTexture, ivec2( 0, gl_InstanceID ), 0 ).r;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		morphTargetInfluences[i] =  texelFetch( morphTexture, ivec2( i + 1, gl_InstanceID ), 0 ).r;
	}
#endif`,Wy=`#if defined( USE_MORPHCOLORS )
	vColor *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		#if defined( USE_COLOR_ALPHA )
			if ( morphTargetInfluences[ i ] != 0.0 ) vColor += getMorph( gl_VertexID, i, 2 ) * morphTargetInfluences[ i ];
		#elif defined( USE_COLOR )
			if ( morphTargetInfluences[ i ] != 0.0 ) vColor += getMorph( gl_VertexID, i, 2 ).rgb * morphTargetInfluences[ i ];
		#endif
	}
#endif`,Xy=`#ifdef USE_MORPHNORMALS
	objectNormal *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		if ( morphTargetInfluences[ i ] != 0.0 ) objectNormal += getMorph( gl_VertexID, i, 1 ).xyz * morphTargetInfluences[ i ];
	}
#endif`,qy=`#ifdef USE_MORPHTARGETS
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
#endif`,Yy=`#ifdef USE_MORPHTARGETS
	transformed *= morphTargetBaseInfluence;
	for ( int i = 0; i < MORPHTARGETS_COUNT; i ++ ) {
		if ( morphTargetInfluences[ i ] != 0.0 ) transformed += getMorph( gl_VertexID, i, 0 ).xyz * morphTargetInfluences[ i ];
	}
#endif`,$y=`float faceDirection = gl_FrontFacing ? 1.0 : - 1.0;
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
vec3 nonPerturbedNormal = normal;`,Ky=`#ifdef USE_NORMALMAP_OBJECTSPACE
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
#endif`,Zy=`#ifndef FLAT_SHADED
	varying vec3 vNormal;
	#ifdef USE_TANGENT
		varying vec3 vTangent;
		varying vec3 vBitangent;
	#endif
#endif`,Jy=`#ifndef FLAT_SHADED
	varying vec3 vNormal;
	#ifdef USE_TANGENT
		varying vec3 vTangent;
		varying vec3 vBitangent;
	#endif
#endif`,jy=`#ifndef FLAT_SHADED
	vNormal = normalize( transformedNormal );
	#ifdef USE_TANGENT
		vTangent = normalize( transformedTangent );
		vBitangent = normalize( cross( vNormal, vTangent ) * tangent.w );
		#ifdef FLIP_SIDED
			vBitangent = - vBitangent;
		#endif
	#endif
#endif`,Qy=`#ifdef USE_NORMALMAP
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
#endif`,ev=`#ifdef USE_CLEARCOAT
	vec3 clearcoatNormal = nonPerturbedNormal;
#endif`,tv=`#ifdef USE_CLEARCOAT_NORMALMAP
	vec3 clearcoatMapN = texture2D( clearcoatNormalMap, vClearcoatNormalMapUv ).xyz * 2.0 - 1.0;
	clearcoatMapN.xy *= clearcoatNormalScale;
	clearcoatNormal = normalize( tbn2 * clearcoatMapN );
#endif`,nv=`#ifdef USE_CLEARCOATMAP
	uniform sampler2D clearcoatMap;
#endif
#ifdef USE_CLEARCOAT_NORMALMAP
	uniform sampler2D clearcoatNormalMap;
	uniform vec2 clearcoatNormalScale;
#endif
#ifdef USE_CLEARCOAT_ROUGHNESSMAP
	uniform sampler2D clearcoatRoughnessMap;
#endif`,iv=`#ifdef USE_IRIDESCENCEMAP
	uniform sampler2D iridescenceMap;
#endif
#ifdef USE_IRIDESCENCE_THICKNESSMAP
	uniform sampler2D iridescenceThicknessMap;
#endif`,sv=`#ifdef OPAQUE
diffuseColor.a = 1.0;
#endif
#ifdef USE_TRANSMISSION
diffuseColor.a *= material.transmissionAlpha;
#endif
gl_FragColor = vec4( outgoingLight, diffuseColor.a );`,rv=`vec3 packNormalToRGB( const in vec3 normal ) {
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
}`,ov=`#ifdef PREMULTIPLIED_ALPHA
	gl_FragColor.rgb *= gl_FragColor.a;
#endif`,av=`vec4 mvPosition = vec4( transformed, 1.0 );
#ifdef USE_BATCHING
	mvPosition = batchingMatrix * mvPosition;
#endif
#ifdef USE_INSTANCING
	mvPosition = instanceMatrix * mvPosition;
#endif
mvPosition = modelViewMatrix * mvPosition;
gl_Position = projectionMatrix * mvPosition;`,lv=`#ifdef DITHERING
	gl_FragColor.rgb = dithering( gl_FragColor.rgb );
#endif`,cv=`#ifdef DITHERING
	vec3 dithering( vec3 color ) {
		float grid_position = rand( gl_FragCoord.xy );
		vec3 dither_shift_RGB = vec3( 0.25 / 255.0, -0.25 / 255.0, 0.25 / 255.0 );
		dither_shift_RGB = mix( 2.0 * dither_shift_RGB, -2.0 * dither_shift_RGB, grid_position );
		return color + dither_shift_RGB;
	}
#endif`,hv=`float roughnessFactor = roughness;
#ifdef USE_ROUGHNESSMAP
	vec4 texelRoughness = texture2D( roughnessMap, vRoughnessMapUv );
	roughnessFactor *= texelRoughness.g;
#endif`,uv=`#ifdef USE_ROUGHNESSMAP
	uniform sampler2D roughnessMap;
#endif`,dv=`#if NUM_SPOT_LIGHT_COORDS > 0
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
#endif`,fv=`#if NUM_SPOT_LIGHT_COORDS > 0
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
#endif`,pv=`#if ( defined( USE_SHADOWMAP ) && ( NUM_DIR_LIGHT_SHADOWS > 0 || NUM_POINT_LIGHT_SHADOWS > 0 ) ) || ( NUM_SPOT_LIGHT_COORDS > 0 )
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
#endif`,mv=`float getShadowMask() {
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
}`,gv=`#ifdef USE_SKINNING
	mat4 boneMatX = getBoneMatrix( skinIndex.x );
	mat4 boneMatY = getBoneMatrix( skinIndex.y );
	mat4 boneMatZ = getBoneMatrix( skinIndex.z );
	mat4 boneMatW = getBoneMatrix( skinIndex.w );
#endif`,xv=`#ifdef USE_SKINNING
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
#endif`,yv=`#ifdef USE_SKINNING
	vec4 skinVertex = bindMatrix * vec4( transformed, 1.0 );
	vec4 skinned = vec4( 0.0 );
	skinned += boneMatX * skinVertex * skinWeight.x;
	skinned += boneMatY * skinVertex * skinWeight.y;
	skinned += boneMatZ * skinVertex * skinWeight.z;
	skinned += boneMatW * skinVertex * skinWeight.w;
	transformed = ( bindMatrixInverse * skinned ).xyz;
#endif`,vv=`#ifdef USE_SKINNING
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
#endif`,_v=`float specularStrength;
#ifdef USE_SPECULARMAP
	vec4 texelSpecular = texture2D( specularMap, vSpecularMapUv );
	specularStrength = texelSpecular.r;
#else
	specularStrength = 1.0;
#endif`,bv=`#ifdef USE_SPECULARMAP
	uniform sampler2D specularMap;
#endif`,Sv=`#if defined( TONE_MAPPING )
	gl_FragColor.rgb = toneMapping( gl_FragColor.rgb );
#endif`,Mv=`#ifndef saturate
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
vec3 CustomToneMapping( vec3 color ) { return color; }`,wv=`#ifdef USE_TRANSMISSION
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
#endif`,Ev=`#ifdef USE_TRANSMISSION
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
#endif`,Tv=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
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
#endif`,Av=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
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
#endif`,Pv=`#if defined( USE_UV ) || defined( USE_ANISOTROPY )
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
#endif`,Rv=`#if defined( USE_ENVMAP ) || defined( DISTANCE ) || defined ( USE_SHADOWMAP ) || defined ( USE_TRANSMISSION ) || NUM_SPOT_LIGHT_COORDS > 0
	vec4 worldPosition = vec4( transformed, 1.0 );
	#ifdef USE_BATCHING
		worldPosition = batchingMatrix * worldPosition;
	#endif
	#ifdef USE_INSTANCING
		worldPosition = instanceMatrix * worldPosition;
	#endif
	worldPosition = modelMatrix * worldPosition;
#endif`,Cv=`varying vec2 vUv;
uniform mat3 uvTransform;
void main() {
	vUv = ( uvTransform * vec3( uv, 1 ) ).xy;
	gl_Position = vec4( position.xy, 1.0, 1.0 );
}`,Iv=`uniform sampler2D t2D;
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
}`,Lv=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
	gl_Position.z = gl_Position.w;
}`,Dv=`#ifdef ENVMAP_TYPE_CUBE
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
}`,Fv=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
	gl_Position.z = gl_Position.w;
}`,Nv=`uniform samplerCube tCube;
uniform float tFlip;
uniform float opacity;
varying vec3 vWorldDirection;
void main() {
	vec4 texColor = textureCube( tCube, vec3( tFlip * vWorldDirection.x, vWorldDirection.yz ) );
	gl_FragColor = texColor;
	gl_FragColor.a *= opacity;
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,Uv=`#include <common>
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
}`,Ov=`#if DEPTH_PACKING == 3200
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
}`,Bv=`#define DISTANCE
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
}`,zv=`#define DISTANCE
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
}`,kv=`varying vec3 vWorldDirection;
#include <common>
void main() {
	vWorldDirection = transformDirection( position, modelMatrix );
	#include <begin_vertex>
	#include <project_vertex>
}`,Vv=`uniform sampler2D tEquirect;
varying vec3 vWorldDirection;
#include <common>
void main() {
	vec3 direction = normalize( vWorldDirection );
	vec2 sampleUV = equirectUv( direction );
	gl_FragColor = texture2D( tEquirect, sampleUV );
	#include <tonemapping_fragment>
	#include <colorspace_fragment>
}`,Hv=`uniform float scale;
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
}`,Gv=`uniform vec3 diffuse;
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
}`,Wv=`#include <common>
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
}`,Xv=`uniform vec3 diffuse;
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
}`,qv=`#define LAMBERT
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
}`,Yv=`#define LAMBERT
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
}`,$v=`#define MATCAP
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
}`,Kv=`#define MATCAP
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
}`,Zv=`#define NORMAL
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
}`,Jv=`#define NORMAL
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
}`,jv=`#define PHONG
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
}`,Qv=`#define PHONG
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
}`,e_=`#define STANDARD
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
}`,t_=`#define STANDARD
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
}`,n_=`#define TOON
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
}`,i_=`#define TOON
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
}`,s_=`uniform float size;
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
}`,r_=`uniform vec3 diffuse;
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
}`,o_=`#include <common>
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
}`,a_=`uniform vec3 color;
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
}`,l_=`uniform float rotation;
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
}`,c_=`uniform vec3 diffuse;
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
}`,He={alphahash_fragment:C0,alphahash_pars_fragment:I0,alphamap_fragment:L0,alphamap_pars_fragment:D0,alphatest_fragment:F0,alphatest_pars_fragment:N0,aomap_fragment:U0,aomap_pars_fragment:O0,batching_pars_vertex:B0,batching_vertex:z0,begin_vertex:k0,beginnormal_vertex:V0,bsdfs:H0,iridescence_fragment:G0,bumpmap_pars_fragment:W0,clipping_planes_fragment:X0,clipping_planes_pars_fragment:q0,clipping_planes_pars_vertex:Y0,clipping_planes_vertex:$0,color_fragment:K0,color_pars_fragment:Z0,color_pars_vertex:J0,color_vertex:j0,common:Q0,cube_uv_reflection_fragment:ey,defaultnormal_vertex:ty,displacementmap_pars_vertex:ny,displacementmap_vertex:iy,emissivemap_fragment:sy,emissivemap_pars_fragment:ry,colorspace_fragment:oy,colorspace_pars_fragment:ay,envmap_fragment:ly,envmap_common_pars_fragment:cy,envmap_pars_fragment:hy,envmap_pars_vertex:uy,envmap_physical_pars_fragment:Sy,envmap_vertex:dy,fog_vertex:fy,fog_pars_vertex:py,fog_fragment:my,fog_pars_fragment:gy,gradientmap_pars_fragment:xy,lightmap_pars_fragment:yy,lights_lambert_fragment:vy,lights_lambert_pars_fragment:_y,lights_pars_begin:by,lights_toon_fragment:My,lights_toon_pars_fragment:wy,lights_phong_fragment:Ey,lights_phong_pars_fragment:Ty,lights_physical_fragment:Ay,lights_physical_pars_fragment:Py,lights_fragment_begin:Ry,lights_fragment_maps:Cy,lights_fragment_end:Iy,lightprobes_pars_fragment:Ly,logdepthbuf_fragment:Dy,logdepthbuf_pars_fragment:Fy,logdepthbuf_pars_vertex:Ny,logdepthbuf_vertex:Uy,map_fragment:Oy,map_pars_fragment:By,map_particle_fragment:zy,map_particle_pars_fragment:ky,metalnessmap_fragment:Vy,metalnessmap_pars_fragment:Hy,morphinstance_vertex:Gy,morphcolor_vertex:Wy,morphnormal_vertex:Xy,morphtarget_pars_vertex:qy,morphtarget_vertex:Yy,normal_fragment_begin:$y,normal_fragment_maps:Ky,normal_pars_fragment:Zy,normal_pars_vertex:Jy,normal_vertex:jy,normalmap_pars_fragment:Qy,clearcoat_normal_fragment_begin:ev,clearcoat_normal_fragment_maps:tv,clearcoat_pars_fragment:nv,iridescence_pars_fragment:iv,opaque_fragment:sv,packing:rv,premultiplied_alpha_fragment:ov,project_vertex:av,dithering_fragment:lv,dithering_pars_fragment:cv,roughnessmap_fragment:hv,roughnessmap_pars_fragment:uv,shadowmap_pars_fragment:dv,shadowmap_pars_vertex:fv,shadowmap_vertex:pv,shadowmask_pars_fragment:mv,skinbase_vertex:gv,skinning_pars_vertex:xv,skinning_vertex:yv,skinnormal_vertex:vv,specularmap_fragment:_v,specularmap_pars_fragment:bv,tonemapping_fragment:Sv,tonemapping_pars_fragment:Mv,transmission_fragment:wv,transmission_pars_fragment:Ev,uv_pars_fragment:Tv,uv_pars_vertex:Av,uv_vertex:Pv,worldpos_vertex:Rv,background_vert:Cv,background_frag:Iv,backgroundCube_vert:Lv,backgroundCube_frag:Dv,cube_vert:Fv,cube_frag:Nv,depth_vert:Uv,depth_frag:Ov,distance_vert:Bv,distance_frag:zv,equirect_vert:kv,equirect_frag:Vv,linedashed_vert:Hv,linedashed_frag:Gv,meshbasic_vert:Wv,meshbasic_frag:Xv,meshlambert_vert:qv,meshlambert_frag:Yv,meshmatcap_vert:$v,meshmatcap_frag:Kv,meshnormal_vert:Zv,meshnormal_frag:Jv,meshphong_vert:jv,meshphong_frag:Qv,meshphysical_vert:e_,meshphysical_frag:t_,meshtoon_vert:n_,meshtoon_frag:i_,points_vert:s_,points_frag:r_,shadow_vert:o_,shadow_frag:a_,sprite_vert:l_,sprite_frag:c_},ae={common:{diffuse:{value:new Xe(16777215)},opacity:{value:1},map:{value:null},mapTransform:{value:new Oe},alphaMap:{value:null},alphaMapTransform:{value:new Oe},alphaTest:{value:0}},specularmap:{specularMap:{value:null},specularMapTransform:{value:new Oe}},envmap:{envMap:{value:null},envMapRotation:{value:new Oe},reflectivity:{value:1},ior:{value:1.5},refractionRatio:{value:.98},dfgLUT:{value:null}},aomap:{aoMap:{value:null},aoMapIntensity:{value:1},aoMapTransform:{value:new Oe}},lightmap:{lightMap:{value:null},lightMapIntensity:{value:1},lightMapTransform:{value:new Oe}},bumpmap:{bumpMap:{value:null},bumpMapTransform:{value:new Oe},bumpScale:{value:1}},normalmap:{normalMap:{value:null},normalMapTransform:{value:new Oe},normalScale:{value:new We(1,1)}},displacementmap:{displacementMap:{value:null},displacementMapTransform:{value:new Oe},displacementScale:{value:1},displacementBias:{value:0}},emissivemap:{emissiveMap:{value:null},emissiveMapTransform:{value:new Oe}},metalnessmap:{metalnessMap:{value:null},metalnessMapTransform:{value:new Oe}},roughnessmap:{roughnessMap:{value:null},roughnessMapTransform:{value:new Oe}},gradientmap:{gradientMap:{value:null}},fog:{fogDensity:{value:25e-5},fogNear:{value:1},fogFar:{value:2e3},fogColor:{value:new Xe(16777215)}},lights:{ambientLightColor:{value:[]},lightProbe:{value:[]},directionalLights:{value:[],properties:{direction:{},color:{}}},directionalLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{}}},directionalShadowMatrix:{value:[]},spotLights:{value:[],properties:{color:{},position:{},direction:{},distance:{},coneCos:{},penumbraCos:{},decay:{}}},spotLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{}}},spotLightMap:{value:[]},spotLightMatrix:{value:[]},pointLights:{value:[],properties:{color:{},position:{},decay:{},distance:{}}},pointLightShadows:{value:[],properties:{shadowIntensity:1,shadowBias:{},shadowNormalBias:{},shadowRadius:{},shadowMapSize:{},shadowCameraNear:{},shadowCameraFar:{}}},pointShadowMatrix:{value:[]},hemisphereLights:{value:[],properties:{direction:{},skyColor:{},groundColor:{}}},rectAreaLights:{value:[],properties:{color:{},position:{},width:{},height:{}}},ltc_1:{value:null},ltc_2:{value:null},probesSH:{value:null},probesMin:{value:new O},probesMax:{value:new O},probesResolution:{value:new O}},points:{diffuse:{value:new Xe(16777215)},opacity:{value:1},size:{value:1},scale:{value:1},map:{value:null},alphaMap:{value:null},alphaMapTransform:{value:new Oe},alphaTest:{value:0},uvTransform:{value:new Oe}},sprite:{diffuse:{value:new Xe(16777215)},opacity:{value:1},center:{value:new We(.5,.5)},rotation:{value:0},map:{value:null},mapTransform:{value:new Oe},alphaMap:{value:null},alphaMapTransform:{value:new Oe},alphaTest:{value:0}}},sn={basic:{uniforms:jt([ae.common,ae.specularmap,ae.envmap,ae.aomap,ae.lightmap,ae.fog]),vertexShader:He.meshbasic_vert,fragmentShader:He.meshbasic_frag},lambert:{uniforms:jt([ae.common,ae.specularmap,ae.envmap,ae.aomap,ae.lightmap,ae.emissivemap,ae.bumpmap,ae.normalmap,ae.displacementmap,ae.fog,ae.lights,{emissive:{value:new Xe(0)},envMapIntensity:{value:1}}]),vertexShader:He.meshlambert_vert,fragmentShader:He.meshlambert_frag},phong:{uniforms:jt([ae.common,ae.specularmap,ae.envmap,ae.aomap,ae.lightmap,ae.emissivemap,ae.bumpmap,ae.normalmap,ae.displacementmap,ae.fog,ae.lights,{emissive:{value:new Xe(0)},specular:{value:new Xe(1118481)},shininess:{value:30},envMapIntensity:{value:1}}]),vertexShader:He.meshphong_vert,fragmentShader:He.meshphong_frag},standard:{uniforms:jt([ae.common,ae.envmap,ae.aomap,ae.lightmap,ae.emissivemap,ae.bumpmap,ae.normalmap,ae.displacementmap,ae.roughnessmap,ae.metalnessmap,ae.fog,ae.lights,{emissive:{value:new Xe(0)},roughness:{value:1},metalness:{value:0},envMapIntensity:{value:1}}]),vertexShader:He.meshphysical_vert,fragmentShader:He.meshphysical_frag},toon:{uniforms:jt([ae.common,ae.aomap,ae.lightmap,ae.emissivemap,ae.bumpmap,ae.normalmap,ae.displacementmap,ae.gradientmap,ae.fog,ae.lights,{emissive:{value:new Xe(0)}}]),vertexShader:He.meshtoon_vert,fragmentShader:He.meshtoon_frag},matcap:{uniforms:jt([ae.common,ae.bumpmap,ae.normalmap,ae.displacementmap,ae.fog,{matcap:{value:null}}]),vertexShader:He.meshmatcap_vert,fragmentShader:He.meshmatcap_frag},points:{uniforms:jt([ae.points,ae.fog]),vertexShader:He.points_vert,fragmentShader:He.points_frag},dashed:{uniforms:jt([ae.common,ae.fog,{scale:{value:1},dashSize:{value:1},totalSize:{value:2}}]),vertexShader:He.linedashed_vert,fragmentShader:He.linedashed_frag},depth:{uniforms:jt([ae.common,ae.displacementmap]),vertexShader:He.depth_vert,fragmentShader:He.depth_frag},normal:{uniforms:jt([ae.common,ae.bumpmap,ae.normalmap,ae.displacementmap,{opacity:{value:1}}]),vertexShader:He.meshnormal_vert,fragmentShader:He.meshnormal_frag},sprite:{uniforms:jt([ae.sprite,ae.fog]),vertexShader:He.sprite_vert,fragmentShader:He.sprite_frag},background:{uniforms:{uvTransform:{value:new Oe},t2D:{value:null},backgroundIntensity:{value:1}},vertexShader:He.background_vert,fragmentShader:He.background_frag},backgroundCube:{uniforms:{envMap:{value:null},backgroundBlurriness:{value:0},backgroundIntensity:{value:1},backgroundRotation:{value:new Oe}},vertexShader:He.backgroundCube_vert,fragmentShader:He.backgroundCube_frag},cube:{uniforms:{tCube:{value:null},tFlip:{value:-1},opacity:{value:1}},vertexShader:He.cube_vert,fragmentShader:He.cube_frag},equirect:{uniforms:{tEquirect:{value:null}},vertexShader:He.equirect_vert,fragmentShader:He.equirect_frag},distance:{uniforms:jt([ae.common,ae.displacementmap,{referencePosition:{value:new O},nearDistance:{value:1},farDistance:{value:1e3}}]),vertexShader:He.distance_vert,fragmentShader:He.distance_frag},shadow:{uniforms:jt([ae.lights,ae.fog,{color:{value:new Xe(0)},opacity:{value:1}}]),vertexShader:He.shadow_vert,fragmentShader:He.shadow_frag}};sn.physical={uniforms:jt([sn.standard.uniforms,{clearcoat:{value:0},clearcoatMap:{value:null},clearcoatMapTransform:{value:new Oe},clearcoatNormalMap:{value:null},clearcoatNormalMapTransform:{value:new Oe},clearcoatNormalScale:{value:new We(1,1)},clearcoatRoughness:{value:0},clearcoatRoughnessMap:{value:null},clearcoatRoughnessMapTransform:{value:new Oe},dispersion:{value:0},iridescence:{value:0},iridescenceMap:{value:null},iridescenceMapTransform:{value:new Oe},iridescenceIOR:{value:1.3},iridescenceThicknessMinimum:{value:100},iridescenceThicknessMaximum:{value:400},iridescenceThicknessMap:{value:null},iridescenceThicknessMapTransform:{value:new Oe},sheen:{value:0},sheenColor:{value:new Xe(0)},sheenColorMap:{value:null},sheenColorMapTransform:{value:new Oe},sheenRoughness:{value:1},sheenRoughnessMap:{value:null},sheenRoughnessMapTransform:{value:new Oe},transmission:{value:0},transmissionMap:{value:null},transmissionMapTransform:{value:new Oe},transmissionSamplerSize:{value:new We},transmissionSamplerMap:{value:null},thickness:{value:0},thicknessMap:{value:null},thicknessMapTransform:{value:new Oe},attenuationDistance:{value:0},attenuationColor:{value:new Xe(0)},specularColor:{value:new Xe(1,1,1)},specularColorMap:{value:null},specularColorMapTransform:{value:new Oe},specularIntensity:{value:1},specularIntensityMap:{value:null},specularIntensityMapTransform:{value:new Oe},anisotropyVector:{value:new We},anisotropyMap:{value:null},anisotropyMapTransform:{value:new Oe}}]),vertexShader:He.meshphysical_vert,fragmentShader:He.meshphysical_frag};var Xl={r:0,b:0,g:0},h_=new ct,zm=new Oe;zm.set(-1,0,0,0,1,0,0,0,1);function u_(i,e,t,n,s,r){let o=new Xe(0),a=s===!0?0:1,l,c,u=null,f=0,d=null;function g(S){let M=S.isScene===!0?S.background:null;if(M&&M.isTexture){let _=S.backgroundBlurriness>0;M=e.get(M,_)}return M}h(g,"getBackground");function m(S){let M=!1,_=g(S);_===null?p(o,a):_&&_.isColor&&(p(_,1),M=!0);let A=i.xr.getEnvironmentBlendMode();A==="additive"?t.buffers.color.setClear(0,0,0,1,r):A==="alpha-blend"&&t.buffers.color.setClear(0,0,0,0,r),(i.autoClear||M)&&(t.buffers.depth.setTest(!0),t.buffers.depth.setMask(!0),t.buffers.color.setMask(!0),i.clear(i.autoClearColor,i.autoClearDepth,i.autoClearStencil))}h(m,"render");function y(S,M){let _=g(M);_&&(_.isCubeTexture||_.mapping===Wr)?(c===void 0&&(c=new Tt(new Gs(1,1,1),new Ht({name:"BackgroundCubeMaterial",uniforms:as(sn.backgroundCube.uniforms),vertexShader:sn.backgroundCube.vertexShader,fragmentShader:sn.backgroundCube.fragmentShader,side:nn,depthTest:!1,depthWrite:!1,fog:!1,allowOverride:!1})),c.geometry.deleteAttribute("normal"),c.geometry.deleteAttribute("uv"),c.onBeforeRender=function(A,w,T){this.matrixWorld.copyPosition(T.matrixWorld)},Object.defineProperty(c.material,"envMap",{get:h(function(){return this.uniforms.envMap.value},"get")}),n.update(c)),c.material.uniforms.envMap.value=_,c.material.uniforms.backgroundBlurriness.value=M.backgroundBlurriness,c.material.uniforms.backgroundIntensity.value=M.backgroundIntensity,c.material.uniforms.backgroundRotation.value.setFromMatrix4(h_.makeRotationFromEuler(M.backgroundRotation)).transpose(),_.isCubeTexture&&_.isRenderTargetTexture===!1&&c.material.uniforms.backgroundRotation.value.premultiply(zm),c.material.toneMapped=Ye.getTransfer(_.colorSpace)!==et,(u!==_||f!==_.version||d!==i.toneMapping)&&(c.material.needsUpdate=!0,u=_,f=_.version,d=i.toneMapping),c.layers.enableAll(),S.unshift(c,c.geometry,c.material,0,0,null)):_&&_.isTexture&&(l===void 0&&(l=new Tt(new Ni(2,2),new Ht({name:"BackgroundMaterial",uniforms:as(sn.background.uniforms),vertexShader:sn.background.vertexShader,fragmentShader:sn.background.fragmentShader,side:hi,depthTest:!1,depthWrite:!1,fog:!1,allowOverride:!1})),l.geometry.deleteAttribute("normal"),Object.defineProperty(l.material,"map",{get:h(function(){return this.uniforms.t2D.value},"get")}),n.update(l)),l.material.uniforms.t2D.value=_,l.material.uniforms.backgroundIntensity.value=M.backgroundIntensity,l.material.toneMapped=Ye.getTransfer(_.colorSpace)!==et,_.matrixAutoUpdate===!0&&_.updateMatrix(),l.material.uniforms.uvTransform.value.copy(_.matrix),(u!==_||f!==_.version||d!==i.toneMapping)&&(l.material.needsUpdate=!0,u=_,f=_.version,d=i.toneMapping),l.layers.enableAll(),S.unshift(l,l.geometry,l.material,0,0,null))}h(y,"addToRenderList");function p(S,M){S.getRGB(Xl,Xh(i)),t.buffers.color.setClear(Xl.r,Xl.g,Xl.b,M,r)}h(p,"setClear");function x(){c!==void 0&&(c.geometry.dispose(),c.material.dispose(),c=void 0),l!==void 0&&(l.geometry.dispose(),l.material.dispose(),l=void 0)}return h(x,"dispose"),{getClearColor:h(function(){return o},"getClearColor"),setClearColor:h(function(S,M=1){o.set(S),a=M,p(o,a)},"setClearColor"),getClearAlpha:h(function(){return a},"getClearAlpha"),setClearAlpha:h(function(S){a=S,p(o,a)},"setClearAlpha"),render:m,addToRenderList:y,dispose:x}}h(u_,"WebGLBackground");function d_(i,e){let t=i.getParameter(i.MAX_VERTEX_ATTRIBS),n={},s=d(null),r=s,o=!1;function a(I,D,L,H,F){let Y=!1,k=f(I,H,L,D);r!==k&&(r=k,c(r.object)),Y=g(I,H,L,F),Y&&m(I,H,L,F),F!==null&&e.update(F,i.ELEMENT_ARRAY_BUFFER),(Y||o)&&(o=!1,_(I,D,L,H),F!==null&&i.bindBuffer(i.ELEMENT_ARRAY_BUFFER,e.get(F).buffer))}h(a,"setup");function l(){return i.createVertexArray()}h(l,"createVertexArrayObject");function c(I){return i.bindVertexArray(I)}h(c,"bindVertexArrayObject");function u(I){return i.deleteVertexArray(I)}h(u,"deleteVertexArrayObject");function f(I,D,L,H){let F=H.wireframe===!0,Y=n[D.id];Y===void 0&&(Y={},n[D.id]=Y);let k=I.isInstancedMesh===!0?I.id:0,Z=Y[k];Z===void 0&&(Z={},Y[k]=Z);let ee=Z[L.id];ee===void 0&&(ee={},Z[L.id]=ee);let re=ee[F];return re===void 0&&(re=d(l()),ee[F]=re),re}h(f,"getBindingState");function d(I){let D=[],L=[],H=[];for(let F=0;F<t;F++)D[F]=0,L[F]=0,H[F]=0;return{geometry:null,program:null,wireframe:!1,newAttributes:D,enabledAttributes:L,attributeDivisors:H,object:I,attributes:{},index:null}}h(d,"createBindingState");function g(I,D,L,H){let F=r.attributes,Y=D.attributes,k=0,Z=L.getAttributes();for(let ee in Z)if(Z[ee].location>=0){let le=F[ee],_e=Y[ee];if(_e===void 0&&(ee==="instanceMatrix"&&I.instanceMatrix&&(_e=I.instanceMatrix),ee==="instanceColor"&&I.instanceColor&&(_e=I.instanceColor)),le===void 0||le.attribute!==_e||_e&&le.data!==_e.data)return!0;k++}return r.attributesNum!==k||r.index!==H}h(g,"needsUpdate");function m(I,D,L,H){let F={},Y=D.attributes,k=0,Z=L.getAttributes();for(let ee in Z)if(Z[ee].location>=0){let le=Y[ee];le===void 0&&(ee==="instanceMatrix"&&I.instanceMatrix&&(le=I.instanceMatrix),ee==="instanceColor"&&I.instanceColor&&(le=I.instanceColor));let _e={};_e.attribute=le,le&&le.data&&(_e.data=le.data),F[ee]=_e,k++}r.attributes=F,r.attributesNum=k,r.index=H}h(m,"saveCache");function y(){let I=r.newAttributes;for(let D=0,L=I.length;D<L;D++)I[D]=0}h(y,"initAttributes");function p(I){x(I,0)}h(p,"enableAttribute");function x(I,D){let L=r.newAttributes,H=r.enabledAttributes,F=r.attributeDivisors;L[I]=1,H[I]===0&&(i.enableVertexAttribArray(I),H[I]=1),F[I]!==D&&(i.vertexAttribDivisor(I,D),F[I]=D)}h(x,"enableAttributeAndDivisor");function S(){let I=r.newAttributes,D=r.enabledAttributes;for(let L=0,H=D.length;L<H;L++)D[L]!==I[L]&&(i.disableVertexAttribArray(L),D[L]=0)}h(S,"disableUnusedAttributes");function M(I,D,L,H,F,Y,k){k===!0?i.vertexAttribIPointer(I,D,L,F,Y):i.vertexAttribPointer(I,D,L,H,F,Y)}h(M,"vertexAttribPointer");function _(I,D,L,H){y();let F=H.attributes,Y=L.getAttributes(),k=D.defaultAttributeValues;for(let Z in Y){let ee=Y[Z];if(ee.location>=0){let re=F[Z];if(re===void 0&&(Z==="instanceMatrix"&&I.instanceMatrix&&(re=I.instanceMatrix),Z==="instanceColor"&&I.instanceColor&&(re=I.instanceColor)),re!==void 0){let le=re.normalized,_e=re.itemSize,$e=e.get(re);if($e===void 0)continue;let tt=$e.buffer,Ke=$e.type,J=$e.bytesPerElement,oe=Ke===i.INT||Ke===i.UNSIGNED_INT||re.gpuType===al;if(re.isInterleavedBufferAttribute){let ie=re.data,Fe=ie.stride,Be=re.offset;if(ie.isInstancedInterleavedBuffer){for(let Le=0;Le<ee.locationSize;Le++)x(ee.location+Le,ie.meshPerAttribute);I.isInstancedMesh!==!0&&H._maxInstanceCount===void 0&&(H._maxInstanceCount=ie.meshPerAttribute*ie.count)}else for(let Le=0;Le<ee.locationSize;Le++)p(ee.location+Le);i.bindBuffer(i.ARRAY_BUFFER,tt);for(let Le=0;Le<ee.locationSize;Le++)M(ee.location+Le,_e/ee.locationSize,Ke,le,Fe*J,(Be+_e/ee.locationSize*Le)*J,oe)}else{if(re.isInstancedBufferAttribute){for(let ie=0;ie<ee.locationSize;ie++)x(ee.location+ie,re.meshPerAttribute);I.isInstancedMesh!==!0&&H._maxInstanceCount===void 0&&(H._maxInstanceCount=re.meshPerAttribute*re.count)}else for(let ie=0;ie<ee.locationSize;ie++)p(ee.location+ie);i.bindBuffer(i.ARRAY_BUFFER,tt);for(let ie=0;ie<ee.locationSize;ie++)M(ee.location+ie,_e/ee.locationSize,Ke,le,_e*J,_e/ee.locationSize*ie*J,oe)}}else if(k!==void 0){let le=k[Z];if(le!==void 0)switch(le.length){case 2:i.vertexAttrib2fv(ee.location,le);break;case 3:i.vertexAttrib3fv(ee.location,le);break;case 4:i.vertexAttrib4fv(ee.location,le);break;default:i.vertexAttrib1fv(ee.location,le)}}}}S()}h(_,"setupVertexAttributes");function A(){P();for(let I in n){let D=n[I];for(let L in D){let H=D[L];for(let F in H){let Y=H[F];for(let k in Y)u(Y[k].object),delete Y[k];delete H[F]}}delete n[I]}}h(A,"dispose");function w(I){if(n[I.id]===void 0)return;let D=n[I.id];for(let L in D){let H=D[L];for(let F in H){let Y=H[F];for(let k in Y)u(Y[k].object),delete Y[k];delete H[F]}}delete n[I.id]}h(w,"releaseStatesOfGeometry");function T(I){for(let D in n){let L=n[D];for(let H in L){let F=L[H];if(F[I.id]===void 0)continue;let Y=F[I.id];for(let k in Y)u(Y[k].object),delete Y[k];delete F[I.id]}}}h(T,"releaseStatesOfProgram");function v(I){for(let D in n){let L=n[D],H=I.isInstancedMesh===!0?I.id:0,F=L[H];if(F!==void 0){for(let Y in F){let k=F[Y];for(let Z in k)u(k[Z].object),delete k[Z];delete F[Y]}delete L[H],Object.keys(L).length===0&&delete n[D]}}}h(v,"releaseStatesOfObject");function P(){C(),o=!0,r!==s&&(r=s,c(r.object))}h(P,"reset");function C(){s.geometry=null,s.program=null,s.wireframe=!1}return h(C,"resetDefaultState"),{setup:a,reset:P,resetDefaultState:C,dispose:A,releaseStatesOfGeometry:w,releaseStatesOfObject:v,releaseStatesOfProgram:T,initAttributes:y,enableAttribute:p,disableUnusedAttributes:S}}h(d_,"WebGLBindingStates");function f_(i,e,t){let n;function s(l){n=l}h(s,"setMode");function r(l,c){i.drawArrays(n,l,c),t.update(c,n,1)}h(r,"render");function o(l,c,u){u!==0&&(i.drawArraysInstanced(n,l,c,u),t.update(c,n,u))}h(o,"renderInstances");function a(l,c,u){if(u===0)return;e.get("WEBGL_multi_draw").multiDrawArraysWEBGL(n,l,0,c,0,u);let d=0;for(let g=0;g<u;g++)d+=c[g];t.update(d,n,1)}h(a,"renderMultiDraw"),this.setMode=s,this.render=r,this.renderInstances=o,this.renderMultiDraw=a}h(f_,"WebGLBufferRenderer");function p_(i,e,t,n){let s;function r(){if(s!==void 0)return s;if(e.has("EXT_texture_filter_anisotropic")===!0){let T=e.get("EXT_texture_filter_anisotropic");s=i.getParameter(T.MAX_TEXTURE_MAX_ANISOTROPY_EXT)}else s=0;return s}h(r,"getMaxAnisotropy");function o(T){return!(T!==Mn&&n.convert(T)!==i.getParameter(i.IMPLEMENTATION_COLOR_READ_FORMAT))}h(o,"textureFormatReadable");function a(T){let v=T===Zn&&(e.has("EXT_color_buffer_half_float")||e.has("EXT_color_buffer_float"));return!(T!==yn&&n.convert(T)!==i.getParameter(i.IMPLEMENTATION_COLOR_READ_TYPE)&&T!==Nn&&!v)}h(a,"textureTypeReadable");function l(T){if(T==="highp"){if(i.getShaderPrecisionFormat(i.VERTEX_SHADER,i.HIGH_FLOAT).precision>0&&i.getShaderPrecisionFormat(i.FRAGMENT_SHADER,i.HIGH_FLOAT).precision>0)return"highp";T="mediump"}return T==="mediump"&&i.getShaderPrecisionFormat(i.VERTEX_SHADER,i.MEDIUM_FLOAT).precision>0&&i.getShaderPrecisionFormat(i.FRAGMENT_SHADER,i.MEDIUM_FLOAT).precision>0?"mediump":"lowp"}h(l,"getMaxPrecision");let c=t.precision!==void 0?t.precision:"highp",u=l(c);u!==c&&(Ce("WebGLRenderer:",c,"not supported, using",u,"instead."),c=u);let f=t.logarithmicDepthBuffer===!0,d=t.reversedDepthBuffer===!0&&e.has("EXT_clip_control");t.reversedDepthBuffer===!0&&d===!1&&Ce("WebGLRenderer: Unable to use reversed depth buffer due to missing EXT_clip_control extension. Fallback to default depth buffer.");let g=i.getParameter(i.MAX_TEXTURE_IMAGE_UNITS),m=i.getParameter(i.MAX_VERTEX_TEXTURE_IMAGE_UNITS),y=i.getParameter(i.MAX_TEXTURE_SIZE),p=i.getParameter(i.MAX_CUBE_MAP_TEXTURE_SIZE),x=i.getParameter(i.MAX_VERTEX_ATTRIBS),S=i.getParameter(i.MAX_VERTEX_UNIFORM_VECTORS),M=i.getParameter(i.MAX_VARYING_VECTORS),_=i.getParameter(i.MAX_FRAGMENT_UNIFORM_VECTORS),A=i.getParameter(i.MAX_SAMPLES),w=i.getParameter(i.SAMPLES);return{isWebGL2:!0,getMaxAnisotropy:r,getMaxPrecision:l,textureFormatReadable:o,textureTypeReadable:a,precision:c,logarithmicDepthBuffer:f,reversedDepthBuffer:d,maxTextures:g,maxVertexTextures:m,maxTextureSize:y,maxCubemapSize:p,maxAttributes:x,maxVertexUniforms:S,maxVaryings:M,maxFragmentUniforms:_,maxSamples:A,samples:w}}h(p_,"WebGLCapabilities");function m_(i){let e=this,t=null,n=0,s=!1,r=!1,o=new Wn,a=new Oe,l={value:null,needsUpdate:!1};this.uniform=l,this.numPlanes=0,this.numIntersection=0,this.init=function(f,d){let g=f.length!==0||d||n!==0||s;return s=d,n=f.length,g},this.beginShadows=function(){r=!0,u(null)},this.endShadows=function(){r=!1},this.setGlobalState=function(f,d){t=u(f,d,0)},this.setState=function(f,d,g){let m=f.clippingPlanes,y=f.clipIntersection,p=f.clipShadows,x=i.get(f);if(!s||m===null||m.length===0||r&&!p)r?u(null):c();else{let S=r?0:n,M=S*4,_=x.clippingState||null;l.value=_,_=u(m,d,M,g);for(let A=0;A!==M;++A)_[A]=t[A];x.clippingState=_,this.numIntersection=y?this.numPlanes:0,this.numPlanes+=S}};function c(){l.value!==t&&(l.value=t,l.needsUpdate=n>0),e.numPlanes=n,e.numIntersection=0}h(c,"resetGlobalState");function u(f,d,g,m){let y=f!==null?f.length:0,p=null;if(y!==0){if(p=l.value,m!==!0||p===null){let x=g+y*4,S=d.matrixWorldInverse;a.getNormalMatrix(S),(p===null||p.length<x)&&(p=new Float32Array(x));for(let M=0,_=g;M!==y;++M,_+=4)o.copy(f[M]).applyMatrix4(S,a),o.normal.toArray(p,_),p[_+3]=o.constant}l.value=p,l.needsUpdate=!0}return e.numPlanes=y,e.numIntersection=0,p}h(u,"projectPlanes")}h(m_,"WebGLClipping");var Wi=4,gm=[.125,.215,.35,.446,.526,.582],ls=20,g_=256,Qr=new rs,xm=new Xe,rd=null,od=0,ad=0,ld=!1,x_=new O,_d=class _d{constructor(e){this._renderer=e,this._pingPongRenderTarget=null,this._lodMax=0,this._cubeSize=0,this._sizeLods=[],this._sigmas=[],this._lodMeshes=[],this._backgroundBox=null,this._cubemapMaterial=null,this._equirectMaterial=null,this._blurMaterial=null,this._ggxMaterial=null}fromScene(e,t=0,n=.1,s=100,r={}){let{size:o=256,position:a=x_}=r;rd=this._renderer.getRenderTarget(),od=this._renderer.getActiveCubeFace(),ad=this._renderer.getActiveMipmapLevel(),ld=this._renderer.xr.enabled,this._renderer.xr.enabled=!1,this._setSize(o);let l=this._allocateTargets();return l.depthBuffer=!0,this._sceneToCubeUV(e,n,s,l,a),t>0&&this._blur(l,0,0,t),this._applyPMREM(l),this._cleanup(l),l}fromEquirectangular(e,t=null){return this._fromTexture(e,t)}fromCubemap(e,t=null){return this._fromTexture(e,t)}compileCubemapShader(){this._cubemapMaterial===null&&(this._cubemapMaterial=_m(),this._compileMaterial(this._cubemapMaterial))}compileEquirectangularShader(){this._equirectMaterial===null&&(this._equirectMaterial=vm(),this._compileMaterial(this._equirectMaterial))}dispose(){this._dispose(),this._cubemapMaterial!==null&&this._cubemapMaterial.dispose(),this._equirectMaterial!==null&&this._equirectMaterial.dispose(),this._backgroundBox!==null&&(this._backgroundBox.geometry.dispose(),this._backgroundBox.material.dispose())}_setSize(e){this._lodMax=Math.floor(Math.log2(e)),this._cubeSize=Math.pow(2,this._lodMax)}_dispose(){this._blurMaterial!==null&&this._blurMaterial.dispose(),this._ggxMaterial!==null&&this._ggxMaterial.dispose(),this._pingPongRenderTarget!==null&&this._pingPongRenderTarget.dispose();for(let e=0;e<this._lodMeshes.length;e++)this._lodMeshes[e].geometry.dispose()}_cleanup(e){this._renderer.setRenderTarget(rd,od,ad),this._renderer.xr.enabled=ld,e.scissorTest=!1,Ks(e,0,0,e.width,e.height)}_fromTexture(e,t){e.mapping===ki||e.mapping===os?this._setSize(e.image.length===0?16:e.image[0].width||e.image[0].image.width):this._setSize(e.image.width/4),rd=this._renderer.getRenderTarget(),od=this._renderer.getActiveCubeFace(),ad=this._renderer.getActiveMipmapLevel(),ld=this._renderer.xr.enabled,this._renderer.xr.enabled=!1;let n=t||this._allocateTargets();return this._textureToCubeUV(e,n),this._applyPMREM(n),this._cleanup(n),n}_allocateTargets(){let e=3*Math.max(this._cubeSize,112),t=4*this._cubeSize,n={magFilter:Vt,minFilter:Vt,generateMipmaps:!1,type:Zn,format:Mn,colorSpace:yr,depthBuffer:!1},s=ym(e,t,n);if(this._pingPongRenderTarget===null||this._pingPongRenderTarget.width!==e||this._pingPongRenderTarget.height!==t){this._pingPongRenderTarget!==null&&this._dispose(),this._pingPongRenderTarget=ym(e,t,n);let{_lodMax:r}=this;({lodMeshes:this._lodMeshes,sizeLods:this._sizeLods,sigmas:this._sigmas}=y_(r)),this._blurMaterial=__(r,e,t),this._ggxMaterial=v_(r,e,t)}return s}_compileMaterial(e){let t=new Tt(new Lt,e);this._renderer.compile(t,Qr)}_sceneToCubeUV(e,t,n,s,r){let l=new Jt(90,1,t,n),c=[1,-1,1,1,1,1],u=[1,1,1,-1,-1,-1],f=this._renderer,d=f.autoClear,g=f.toneMapping;f.getClearColor(xm),f.toneMapping=Dn,f.autoClear=!1,f.state.buffers.depth.getReversed()&&(f.setRenderTarget(s),f.clearDepth(),f.setRenderTarget(null)),this._backgroundBox===null&&(this._backgroundBox=new Tt(new Gs,new Ln({name:"PMREM.Background",side:nn,depthWrite:!1,depthTest:!1})));let y=this._backgroundBox,p=y.material,x=!1,S=e.background;S?S.isColor&&(p.color.copy(S),e.background=null,x=!0):(p.color.copy(xm),x=!0);for(let M=0;M<6;M++){let _=M%3;_===0?(l.up.set(0,c[M],0),l.position.set(r.x,r.y,r.z),l.lookAt(r.x+u[M],r.y,r.z)):_===1?(l.up.set(0,0,c[M]),l.position.set(r.x,r.y,r.z),l.lookAt(r.x,r.y+u[M],r.z)):(l.up.set(0,c[M],0),l.position.set(r.x,r.y,r.z),l.lookAt(r.x,r.y,r.z+u[M]));let A=this._cubeSize;Ks(s,_*A,M>2?A:0,A,A),f.setRenderTarget(s),x&&f.render(y,l),f.render(e,l)}f.toneMapping=g,f.autoClear=d,e.background=S}_textureToCubeUV(e,t){let n=this._renderer,s=e.mapping===ki||e.mapping===os;s?(this._cubemapMaterial===null&&(this._cubemapMaterial=_m()),this._cubemapMaterial.uniforms.flipEnvMap.value=e.isRenderTargetTexture===!1?-1:1):this._equirectMaterial===null&&(this._equirectMaterial=vm());let r=s?this._cubemapMaterial:this._equirectMaterial,o=this._lodMeshes[0];o.material=r;let a=r.uniforms;a.envMap.value=e;let l=this._cubeSize;Ks(t,0,0,3*l,2*l),n.setRenderTarget(t),n.render(o,Qr)}_applyPMREM(e){let t=this._renderer,n=t.autoClear;t.autoClear=!1;let s=this._lodMeshes.length;for(let r=1;r<s;r++)this._applyGGXFilter(e,r-1,r);t.autoClear=n}_applyGGXFilter(e,t,n){let s=this._renderer,r=this._pingPongRenderTarget,o=this._ggxMaterial,a=this._lodMeshes[n];a.material=o;let l=o.uniforms,c=n/(this._lodMeshes.length-1),u=t/(this._lodMeshes.length-1),f=Math.sqrt(c*c-u*u),d=0+c*1.25,g=f*d,{_lodMax:m}=this,y=this._sizeLods[n],p=3*y*(n>m-Wi?n-m+Wi:0),x=4*(this._cubeSize-y);l.envMap.value=e.texture,l.roughness.value=g,l.mipInt.value=m-t,Ks(r,p,x,3*y,2*y),s.setRenderTarget(r),s.render(a,Qr),l.envMap.value=r.texture,l.roughness.value=0,l.mipInt.value=m-n,Ks(e,p,x,3*y,2*y),s.setRenderTarget(e),s.render(a,Qr)}_blur(e,t,n,s,r){let o=this._pingPongRenderTarget;this._halfBlur(e,o,t,n,s,"latitudinal",r),this._halfBlur(o,e,n,n,s,"longitudinal",r)}_halfBlur(e,t,n,s,r,o,a){let l=this._renderer,c=this._blurMaterial;o!=="latitudinal"&&o!=="longitudinal"&&Ne("blur direction must be either latitudinal or longitudinal!");let u=3,f=this._lodMeshes[s];f.material=c;let d=c.uniforms,g=this._sizeLods[n]-1,m=isFinite(r)?Math.PI/(2*g):2*Math.PI/(2*ls-1),y=r/m,p=isFinite(r)?1+Math.floor(u*y):ls;p>ls&&Ce(`sigmaRadians, ${r}, is too large and will clip, as it requested ${p} samples when the maximum is set to ${ls}`);let x=[],S=0;for(let T=0;T<ls;++T){let v=T/y,P=Math.exp(-v*v/2);x.push(P),T===0?S+=P:T<p&&(S+=2*P)}for(let T=0;T<x.length;T++)x[T]=x[T]/S;d.envMap.value=e.texture,d.samples.value=p,d.weights.value=x,d.latitudinal.value=o==="latitudinal",a&&(d.poleAxis.value=a);let{_lodMax:M}=this;d.dTheta.value=m,d.mipInt.value=M-n;let _=this._sizeLods[s],A=3*_*(s>M-Wi?s-M+Wi:0),w=4*(this._cubeSize-_);Ks(t,A,w,3*_,2*_),l.setRenderTarget(t),l.render(f,Qr)}};h(_d,"PMREMGenerator");var Yl=_d;function y_(i){let e=[],t=[],n=[],s=i,r=i-Wi+1+gm.length;for(let o=0;o<r;o++){let a=Math.pow(2,s);e.push(a);let l=1/a;o>i-Wi?l=gm[o-i+Wi-1]:o===0&&(l=0),t.push(l);let c=1/(a-2),u=-c,f=1+c,d=[u,u,f,u,f,f,u,u,f,f,u,f],g=6,m=6,y=3,p=2,x=1,S=new Float32Array(y*m*g),M=new Float32Array(p*m*g),_=new Float32Array(x*m*g);for(let w=0;w<g;w++){let T=w%3*2/3-1,v=w>2?0:-1,P=[T,v,0,T+2/3,v,0,T+2/3,v+1,0,T,v,0,T+2/3,v+1,0,T,v+1,0];S.set(P,y*m*w),M.set(d,p*m*w);let C=[w,w,w,w,w,w];_.set(C,x*m*w)}let A=new Lt;A.setAttribute("position",new ln(S,y)),A.setAttribute("uv",new ln(M,p)),A.setAttribute("faceIndex",new ln(_,x)),n.push(new Tt(A,null)),s>Wi&&s--}return{lodMeshes:n,sizeLods:e,sigmas:t}}h(y_,"_createPlanes");function ym(i,e,t){let n=new pn(i,e,t);return n.texture.mapping=Wr,n.texture.name="PMREM.cubeUv",n.scissorTest=!0,n}h(ym,"_createRenderTarget");function Ks(i,e,t,n,s){i.viewport.set(e,t,n,s),i.scissor.set(e,t,n,s)}h(Ks,"_setViewport");function v_(i,e,t){return new Ht({name:"PMREMGGXConvolution",defines:{GGX_SAMPLES:g_,CUBEUV_TEXEL_WIDTH:1/e,CUBEUV_TEXEL_HEIGHT:1/t,CUBEUV_MAX_MIP:`${i}.0`},uniforms:{envMap:{value:null},roughness:{value:0},mipInt:{value:0}},vertexShader:Zl(),fragmentShader:`

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
		`,blending:Kn,depthTest:!1,depthWrite:!1})}h(v_,"_getGGXShader");function __(i,e,t){let n=new Float32Array(ls),s=new O(0,1,0);return new Ht({name:"SphericalGaussianBlur",defines:{n:ls,CUBEUV_TEXEL_WIDTH:1/e,CUBEUV_TEXEL_HEIGHT:1/t,CUBEUV_MAX_MIP:`${i}.0`},uniforms:{envMap:{value:null},samples:{value:1},weights:{value:n},latitudinal:{value:!1},dTheta:{value:0},mipInt:{value:0},poleAxis:{value:s}},vertexShader:Zl(),fragmentShader:`

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
		`,blending:Kn,depthTest:!1,depthWrite:!1})}h(__,"_getBlurShader");function vm(){return new Ht({name:"EquirectangularToCubeUV",uniforms:{envMap:{value:null}},vertexShader:Zl(),fragmentShader:`

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
		`,blending:Kn,depthTest:!1,depthWrite:!1})}h(vm,"_getEquirectMaterial");function _m(){return new Ht({name:"CubemapToCubeUV",uniforms:{envMap:{value:null},flipEnvMap:{value:-1}},vertexShader:Zl(),fragmentShader:`

			precision mediump float;
			precision mediump int;

			uniform float flipEnvMap;

			varying vec3 vOutputDirection;

			uniform samplerCube envMap;

			void main() {

				gl_FragColor = textureCube( envMap, vec3( flipEnvMap * vOutputDirection.x, vOutputDirection.yz ) );

			}
		`,blending:Kn,depthTest:!1,depthWrite:!1})}h(_m,"_getCubemapMaterial");function Zl(){return`

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
	`}h(Zl,"_getCommonVertexShader");var bd=class bd extends pn{constructor(e=1,t={}){super(e,e,t),this.isWebGLCubeRenderTarget=!0;let n={width:e,height:e,depth:1},s=[n,n,n,n,n,n];this.texture=new Ir(s),this._setTextureOptions(t),this.texture.isRenderTargetTexture=!0}fromEquirectangularTexture(e,t){this.texture.type=t.type,this.texture.colorSpace=t.colorSpace,this.texture.generateMipmaps=t.generateMipmaps,this.texture.minFilter=t.minFilter,this.texture.magFilter=t.magFilter;let n={uniforms:{tEquirect:{value:null}},vertexShader:`

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
			`},s=new Gs(5,5,5),r=new Ht({name:"CubemapFromEquirect",uniforms:as(n.uniforms),vertexShader:n.vertexShader,fragmentShader:n.fragmentShader,side:nn,blending:Kn});r.uniforms.tEquirect.value=t;let o=new Tt(s,r),a=t.minFilter;return t.minFilter===Vi&&(t.minFilter=Vt),new Ha(1,10,this).update(e,o),t.minFilter=a,o.geometry.dispose(),o.material.dispose(),this}clear(e,t=!0,n=!0,s=!0){let r=e.getRenderTarget();for(let o=0;o<6;o++)e.setRenderTarget(this,o),e.clear(t,n,s);e.setRenderTarget(r)}};h(bd,"WebGLCubeRenderTarget");var $l=bd;function b_(i){let e=new WeakMap,t=new WeakMap,n=null;function s(d,g=!1){return d==null?null:g?o(d):r(d)}h(s,"get");function r(d){if(d&&d.isTexture){let g=d.mapping;if(g===sl||g===rl)if(e.has(d)){let m=e.get(d).texture;return a(m,d.mapping)}else{let m=d.image;if(m&&m.height>0){let y=new $l(m.height);return y.fromEquirectangularTexture(i,d),e.set(d,y),d.addEventListener("dispose",c),a(y.texture,d.mapping)}else return null}}return d}h(r,"getCube");function o(d){if(d&&d.isTexture){let g=d.mapping,m=g===sl||g===rl,y=g===ki||g===os;if(m||y){let p=t.get(d),x=p!==void 0?p.texture.pmremVersion:0;if(d.isRenderTargetTexture&&d.pmremVersion!==x)return n===null&&(n=new Yl(i)),p=m?n.fromEquirectangular(d,p):n.fromCubemap(d,p),p.texture.pmremVersion=d.pmremVersion,t.set(d,p),p.texture;if(p!==void 0)return p.texture;{let S=d.image;return m&&S&&S.height>0||y&&S&&l(S)?(n===null&&(n=new Yl(i)),p=m?n.fromEquirectangular(d):n.fromCubemap(d),p.texture.pmremVersion=d.pmremVersion,t.set(d,p),d.addEventListener("dispose",u),p.texture):null}}}return d}h(o,"getPMREM");function a(d,g){return g===sl?d.mapping=ki:g===rl&&(d.mapping=os),d}h(a,"mapTextureMapping");function l(d){let g=0,m=6;for(let y=0;y<m;y++)d[y]!==void 0&&g++;return g===m}h(l,"isCubeTextureComplete");function c(d){let g=d.target;g.removeEventListener("dispose",c);let m=e.get(g);m!==void 0&&(e.delete(g),m.dispose())}h(c,"onCubemapDispose");function u(d){let g=d.target;g.removeEventListener("dispose",u);let m=t.get(g);m!==void 0&&(t.delete(g),m.dispose())}h(u,"onPMREMDispose");function f(){e=new WeakMap,t=new WeakMap,n!==null&&(n.dispose(),n=null)}return h(f,"dispose"),{get:s,dispose:f}}h(b_,"WebGLEnvironments");function S_(i){let e={};function t(n){if(e[n]!==void 0)return e[n];let s=i.getExtension(n);return e[n]=s,s}return h(t,"getExtension"),{has:h(function(n){return t(n)!==null},"has"),init:h(function(){t("EXT_color_buffer_float"),t("WEBGL_clip_cull_distance"),t("OES_texture_float_linear"),t("EXT_color_buffer_half_float"),t("WEBGL_multisampled_render_to_texture"),t("WEBGL_render_shared_exponent")},"init"),get:h(function(n){let s=t(n);return s===null&&ts("WebGLRenderer: "+n+" extension not supported."),s},"get")}}h(S_,"WebGLExtensions");function M_(i,e,t,n){let s={},r=new WeakMap;function o(f){let d=f.target;d.index!==null&&e.remove(d.index);for(let m in d.attributes)e.remove(d.attributes[m]);d.removeEventListener("dispose",o),delete s[d.id];let g=r.get(d);g&&(e.remove(g),r.delete(d)),n.releaseStatesOfGeometry(d),d.isInstancedBufferGeometry===!0&&delete d._maxInstanceCount,t.memory.geometries--}h(o,"onGeometryDispose");function a(f,d){return s[d.id]===!0||(d.addEventListener("dispose",o),s[d.id]=!0,t.memory.geometries++),d}h(a,"get");function l(f){let d=f.attributes;for(let g in d)e.update(d[g],i.ARRAY_BUFFER)}h(l,"update");function c(f){let d=[],g=f.index,m=f.attributes.position,y=0;if(m===void 0)return;if(g!==null){let S=g.array;y=g.version;for(let M=0,_=S.length;M<_;M+=3){let A=S[M+0],w=S[M+1],T=S[M+2];d.push(A,w,w,T,T,A)}}else{let S=m.array;y=m.version;for(let M=0,_=S.length/3-1;M<_;M+=3){let A=M+0,w=M+1,T=M+2;d.push(A,w,w,T,T,A)}}let p=new(m.count>=65535?Ar:Tr)(d,1);p.version=y;let x=r.get(f);x&&e.remove(x),r.set(f,p)}h(c,"updateWireframeAttribute");function u(f){let d=r.get(f);if(d){let g=f.index;g!==null&&d.version<g.version&&c(f)}else c(f);return r.get(f)}return h(u,"getWireframeAttribute"),{get:a,update:l,getWireframeAttribute:u}}h(M_,"WebGLGeometries");function w_(i,e,t){let n;function s(f){n=f}h(s,"setMode");let r,o;function a(f){r=f.type,o=f.bytesPerElement}h(a,"setIndex");function l(f,d){i.drawElements(n,d,r,f*o),t.update(d,n,1)}h(l,"render");function c(f,d,g){g!==0&&(i.drawElementsInstanced(n,d,r,f*o,g),t.update(d,n,g))}h(c,"renderInstances");function u(f,d,g){if(g===0)return;e.get("WEBGL_multi_draw").multiDrawElementsWEBGL(n,d,0,r,f,0,g);let y=0;for(let p=0;p<g;p++)y+=d[p];t.update(y,n,1)}h(u,"renderMultiDraw"),this.setMode=s,this.setIndex=a,this.render=l,this.renderInstances=c,this.renderMultiDraw=u}h(w_,"WebGLIndexedBufferRenderer");function E_(i){let e={geometries:0,textures:0},t={frame:0,calls:0,triangles:0,points:0,lines:0};function n(r,o,a){switch(t.calls++,o){case i.TRIANGLES:t.triangles+=a*(r/3);break;case i.LINES:t.lines+=a*(r/2);break;case i.LINE_STRIP:t.lines+=a*(r-1);break;case i.LINE_LOOP:t.lines+=a*r;break;case i.POINTS:t.points+=a*r;break;default:Ne("WebGLInfo: Unknown draw mode:",o);break}}h(n,"update");function s(){t.calls=0,t.triangles=0,t.points=0,t.lines=0}return h(s,"reset"),{memory:e,render:t,programs:null,autoReset:!0,reset:s,update:n}}h(E_,"WebGLInfo");function T_(i,e,t){let n=new WeakMap,s=new st;function r(o,a,l){let c=o.morphTargetInfluences,u=a.morphAttributes.position||a.morphAttributes.normal||a.morphAttributes.color,f=u!==void 0?u.length:0,d=n.get(a);if(d===void 0||d.count!==f){let C=function(){v.dispose(),n.delete(a),a.removeEventListener("dispose",C)};var g=C;h(C,"disposeTexture"),d!==void 0&&d.texture.dispose();let m=a.morphAttributes.position!==void 0,y=a.morphAttributes.normal!==void 0,p=a.morphAttributes.color!==void 0,x=a.morphAttributes.position||[],S=a.morphAttributes.normal||[],M=a.morphAttributes.color||[],_=0;m===!0&&(_=1),y===!0&&(_=2),p===!0&&(_=3);let A=a.attributes.position.count*_,w=1;A>e.maxTextureSize&&(w=Math.ceil(A/e.maxTextureSize),A=e.maxTextureSize);let T=new Float32Array(A*w*4*f),v=new Mr(T,A,w,f);v.type=Nn,v.needsUpdate=!0;let P=_*4;for(let I=0;I<f;I++){let D=x[I],L=S[I],H=M[I],F=A*w*4*I;for(let Y=0;Y<D.count;Y++){let k=Y*P;m===!0&&(s.fromBufferAttribute(D,Y),T[F+k+0]=s.x,T[F+k+1]=s.y,T[F+k+2]=s.z,T[F+k+3]=0),y===!0&&(s.fromBufferAttribute(L,Y),T[F+k+4]=s.x,T[F+k+5]=s.y,T[F+k+6]=s.z,T[F+k+7]=0),p===!0&&(s.fromBufferAttribute(H,Y),T[F+k+8]=s.x,T[F+k+9]=s.y,T[F+k+10]=s.z,T[F+k+11]=H.itemSize===4?s.w:1)}}d={count:f,texture:v,size:new We(A,w)},n.set(a,d),a.addEventListener("dispose",C)}if(o.isInstancedMesh===!0&&o.morphTexture!==null)l.getUniforms().setValue(i,"morphTexture",o.morphTexture,t);else{let m=0;for(let p=0;p<c.length;p++)m+=c[p];let y=a.morphTargetsRelative?1:1-m;l.getUniforms().setValue(i,"morphTargetBaseInfluence",y),l.getUniforms().setValue(i,"morphTargetInfluences",c)}l.getUniforms().setValue(i,"morphTargetsTexture",d.texture,t),l.getUniforms().setValue(i,"morphTargetsTextureSize",d.size)}return h(r,"update"),{update:r}}h(T_,"WebGLMorphtargets");function A_(i,e,t,n,s){let r=new WeakMap;function o(c){let u=s.render.frame,f=c.geometry,d=e.get(c,f);if(r.get(d)!==u&&(e.update(d),r.set(d,u)),c.isInstancedMesh&&(c.hasEventListener("dispose",l)===!1&&c.addEventListener("dispose",l),r.get(c)!==u&&(t.update(c.instanceMatrix,i.ARRAY_BUFFER),c.instanceColor!==null&&t.update(c.instanceColor,i.ARRAY_BUFFER),r.set(c,u))),c.isSkinnedMesh){let g=c.skeleton;r.get(g)!==u&&(g.update(),r.set(g,u))}return d}h(o,"update");function a(){r=new WeakMap}h(a,"dispose");function l(c){let u=c.target;u.removeEventListener("dispose",l),n.releaseStatesOfObject(u),t.remove(u.instanceMatrix),u.instanceColor!==null&&t.remove(u.instanceColor)}return h(l,"onInstancedMeshDispose"),{update:o,dispose:a}}h(A_,"WebGLObjects");var P_={[Th]:"LINEAR_TONE_MAPPING",[Ah]:"REINHARD_TONE_MAPPING",[Ph]:"CINEON_TONE_MAPPING",[Rh]:"ACES_FILMIC_TONE_MAPPING",[Ih]:"AGX_TONE_MAPPING",[Lh]:"NEUTRAL_TONE_MAPPING",[Ch]:"CUSTOM_TONE_MAPPING"};function R_(i,e,t,n,s,r){let o=new pn(e,t,{type:i,depthBuffer:s,stencilBuffer:r,samples:n?4:0,depthTexture:s?new ui(e,t):void 0}),a=new pn(e,t,{type:Zn,depthBuffer:!1,stencilBuffer:!1}),l=new Lt;l.setAttribute("position",new ht([-1,3,0,-1,-1,0,3,-1,0],3)),l.setAttribute("uv",new ht([0,2,0,0,2,0],2));let c=new Ra({uniforms:{tDiffuse:{value:null}},vertexShader:`
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
			}`,depthTest:!1,depthWrite:!1}),u=new Tt(l,c),f=new rs(-1,1,1,-1,0,1),d=null,g=null,m=!1,y,p=null,x=[],S=!1;this.setSize=function(M,_){o.setSize(M,_),a.setSize(M,_);for(let A=0;A<x.length;A++){let w=x[A];w.setSize&&w.setSize(M,_)}},this.setEffects=function(M){x=M,S=x.length>0&&x[0].isRenderPass===!0;let _=o.width,A=o.height;for(let w=0;w<x.length;w++){let T=x[w];T.setSize&&T.setSize(_,A)}},this.begin=function(M,_){if(m||M.toneMapping===Dn&&x.length===0)return!1;if(p=_,_!==null){let A=_.width,w=_.height;(o.width!==A||o.height!==w)&&this.setSize(A,w)}return S===!1&&M.setRenderTarget(o),y=M.toneMapping,M.toneMapping=Dn,!0},this.hasRenderPass=function(){return S},this.end=function(M,_){M.toneMapping=y,m=!0;let A=o,w=a;for(let T=0;T<x.length;T++){let v=x[T];if(v.enabled!==!1&&(v.render(M,w,A,_),v.needsSwap!==!1)){let P=A;A=w,w=P}}if(d!==M.outputColorSpace||g!==M.toneMapping){d=M.outputColorSpace,g=M.toneMapping,c.defines={},Ye.getTransfer(d)===et&&(c.defines.SRGB_TRANSFER="");let T=P_[g];T&&(c.defines[T]=""),c.needsUpdate=!0}c.uniforms.tDiffuse.value=A.texture,M.setRenderTarget(p),M.render(u,f),p=null,m=!1},this.isCompositing=function(){return m},this.dispose=function(){o.depthTexture&&o.depthTexture.dispose(),o.dispose(),a.dispose(),l.dispose(),c.dispose()}}h(R_,"WebGLOutput");var km=new tn,ud=new ui(1,1),Vm=new Mr,Hm=new Ma,Gm=new Ir,bm=[],Sm=[],Mm=new Float32Array(16),wm=new Float32Array(9),Em=new Float32Array(4);function Js(i,e,t){let n=i[0];if(n<=0||n>0)return i;let s=e*t,r=bm[s];if(r===void 0&&(r=new Float32Array(s),bm[s]=r),e!==0){n.toArray(r,0);for(let o=1,a=0;o!==e;++o)a+=t,i[o].toArray(r,a)}return r}h(Js,"flatten");function Dt(i,e){if(i.length!==e.length)return!1;for(let t=0,n=i.length;t<n;t++)if(i[t]!==e[t])return!1;return!0}h(Dt,"arraysEqual");function Ft(i,e){for(let t=0,n=e.length;t<n;t++)i[t]=e[t]}h(Ft,"copyArray");function Jl(i,e){let t=Sm[e];t===void 0&&(t=new Int32Array(e),Sm[e]=t);for(let n=0;n!==e;++n)t[n]=i.allocateTextureUnit();return t}h(Jl,"allocTexUnits");function C_(i,e){let t=this.cache;t[0]!==e&&(i.uniform1f(this.addr,e),t[0]=e)}h(C_,"setValueV1f");function I_(i,e){let t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y)&&(i.uniform2f(this.addr,e.x,e.y),t[0]=e.x,t[1]=e.y);else{if(Dt(t,e))return;i.uniform2fv(this.addr,e),Ft(t,e)}}h(I_,"setValueV2f");function L_(i,e){let t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z)&&(i.uniform3f(this.addr,e.x,e.y,e.z),t[0]=e.x,t[1]=e.y,t[2]=e.z);else if(e.r!==void 0)(t[0]!==e.r||t[1]!==e.g||t[2]!==e.b)&&(i.uniform3f(this.addr,e.r,e.g,e.b),t[0]=e.r,t[1]=e.g,t[2]=e.b);else{if(Dt(t,e))return;i.uniform3fv(this.addr,e),Ft(t,e)}}h(L_,"setValueV3f");function D_(i,e){let t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z||t[3]!==e.w)&&(i.uniform4f(this.addr,e.x,e.y,e.z,e.w),t[0]=e.x,t[1]=e.y,t[2]=e.z,t[3]=e.w);else{if(Dt(t,e))return;i.uniform4fv(this.addr,e),Ft(t,e)}}h(D_,"setValueV4f");function F_(i,e){let t=this.cache,n=e.elements;if(n===void 0){if(Dt(t,e))return;i.uniformMatrix2fv(this.addr,!1,e),Ft(t,e)}else{if(Dt(t,n))return;Em.set(n),i.uniformMatrix2fv(this.addr,!1,Em),Ft(t,n)}}h(F_,"setValueM2");function N_(i,e){let t=this.cache,n=e.elements;if(n===void 0){if(Dt(t,e))return;i.uniformMatrix3fv(this.addr,!1,e),Ft(t,e)}else{if(Dt(t,n))return;wm.set(n),i.uniformMatrix3fv(this.addr,!1,wm),Ft(t,n)}}h(N_,"setValueM3");function U_(i,e){let t=this.cache,n=e.elements;if(n===void 0){if(Dt(t,e))return;i.uniformMatrix4fv(this.addr,!1,e),Ft(t,e)}else{if(Dt(t,n))return;Mm.set(n),i.uniformMatrix4fv(this.addr,!1,Mm),Ft(t,n)}}h(U_,"setValueM4");function O_(i,e){let t=this.cache;t[0]!==e&&(i.uniform1i(this.addr,e),t[0]=e)}h(O_,"setValueV1i");function B_(i,e){let t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y)&&(i.uniform2i(this.addr,e.x,e.y),t[0]=e.x,t[1]=e.y);else{if(Dt(t,e))return;i.uniform2iv(this.addr,e),Ft(t,e)}}h(B_,"setValueV2i");function z_(i,e){let t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z)&&(i.uniform3i(this.addr,e.x,e.y,e.z),t[0]=e.x,t[1]=e.y,t[2]=e.z);else{if(Dt(t,e))return;i.uniform3iv(this.addr,e),Ft(t,e)}}h(z_,"setValueV3i");function k_(i,e){let t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z||t[3]!==e.w)&&(i.uniform4i(this.addr,e.x,e.y,e.z,e.w),t[0]=e.x,t[1]=e.y,t[2]=e.z,t[3]=e.w);else{if(Dt(t,e))return;i.uniform4iv(this.addr,e),Ft(t,e)}}h(k_,"setValueV4i");function V_(i,e){let t=this.cache;t[0]!==e&&(i.uniform1ui(this.addr,e),t[0]=e)}h(V_,"setValueV1ui");function H_(i,e){let t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y)&&(i.uniform2ui(this.addr,e.x,e.y),t[0]=e.x,t[1]=e.y);else{if(Dt(t,e))return;i.uniform2uiv(this.addr,e),Ft(t,e)}}h(H_,"setValueV2ui");function G_(i,e){let t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z)&&(i.uniform3ui(this.addr,e.x,e.y,e.z),t[0]=e.x,t[1]=e.y,t[2]=e.z);else{if(Dt(t,e))return;i.uniform3uiv(this.addr,e),Ft(t,e)}}h(G_,"setValueV3ui");function W_(i,e){let t=this.cache;if(e.x!==void 0)(t[0]!==e.x||t[1]!==e.y||t[2]!==e.z||t[3]!==e.w)&&(i.uniform4ui(this.addr,e.x,e.y,e.z,e.w),t[0]=e.x,t[1]=e.y,t[2]=e.z,t[3]=e.w);else{if(Dt(t,e))return;i.uniform4uiv(this.addr,e),Ft(t,e)}}h(W_,"setValueV4ui");function X_(i,e,t){let n=this.cache,s=t.allocateTextureUnit();n[0]!==s&&(i.uniform1i(this.addr,s),n[0]=s);let r;this.type===i.SAMPLER_2D_SHADOW?(ud.compareFunction=t.isReversedDepthBuffer()?Wl:Gl,r=ud):r=km,t.setTexture2D(e||r,s)}h(X_,"setValueT1");function q_(i,e,t){let n=this.cache,s=t.allocateTextureUnit();n[0]!==s&&(i.uniform1i(this.addr,s),n[0]=s),t.setTexture3D(e||Hm,s)}h(q_,"setValueT3D1");function Y_(i,e,t){let n=this.cache,s=t.allocateTextureUnit();n[0]!==s&&(i.uniform1i(this.addr,s),n[0]=s),t.setTextureCube(e||Gm,s)}h(Y_,"setValueT6");function $_(i,e,t){let n=this.cache,s=t.allocateTextureUnit();n[0]!==s&&(i.uniform1i(this.addr,s),n[0]=s),t.setTexture2DArray(e||Vm,s)}h($_,"setValueT2DArray1");function K_(i){switch(i){case 5126:return C_;case 35664:return I_;case 35665:return L_;case 35666:return D_;case 35674:return F_;case 35675:return N_;case 35676:return U_;case 5124:case 35670:return O_;case 35667:case 35671:return B_;case 35668:case 35672:return z_;case 35669:case 35673:return k_;case 5125:return V_;case 36294:return H_;case 36295:return G_;case 36296:return W_;case 35678:case 36198:case 36298:case 36306:case 35682:return X_;case 35679:case 36299:case 36307:return q_;case 35680:case 36300:case 36308:case 36293:return Y_;case 36289:case 36303:case 36311:case 36292:return $_}}h(K_,"getSingularSetter");function Z_(i,e){i.uniform1fv(this.addr,e)}h(Z_,"setValueV1fArray");function J_(i,e){let t=Js(e,this.size,2);i.uniform2fv(this.addr,t)}h(J_,"setValueV2fArray");function j_(i,e){let t=Js(e,this.size,3);i.uniform3fv(this.addr,t)}h(j_,"setValueV3fArray");function Q_(i,e){let t=Js(e,this.size,4);i.uniform4fv(this.addr,t)}h(Q_,"setValueV4fArray");function eb(i,e){let t=Js(e,this.size,4);i.uniformMatrix2fv(this.addr,!1,t)}h(eb,"setValueM2Array");function tb(i,e){let t=Js(e,this.size,9);i.uniformMatrix3fv(this.addr,!1,t)}h(tb,"setValueM3Array");function nb(i,e){let t=Js(e,this.size,16);i.uniformMatrix4fv(this.addr,!1,t)}h(nb,"setValueM4Array");function ib(i,e){i.uniform1iv(this.addr,e)}h(ib,"setValueV1iArray");function sb(i,e){i.uniform2iv(this.addr,e)}h(sb,"setValueV2iArray");function rb(i,e){i.uniform3iv(this.addr,e)}h(rb,"setValueV3iArray");function ob(i,e){i.uniform4iv(this.addr,e)}h(ob,"setValueV4iArray");function ab(i,e){i.uniform1uiv(this.addr,e)}h(ab,"setValueV1uiArray");function lb(i,e){i.uniform2uiv(this.addr,e)}h(lb,"setValueV2uiArray");function cb(i,e){i.uniform3uiv(this.addr,e)}h(cb,"setValueV3uiArray");function hb(i,e){i.uniform4uiv(this.addr,e)}h(hb,"setValueV4uiArray");function ub(i,e,t){let n=this.cache,s=e.length,r=Jl(t,s);Dt(n,r)||(i.uniform1iv(this.addr,r),Ft(n,r));let o;this.type===i.SAMPLER_2D_SHADOW?o=ud:o=km;for(let a=0;a!==s;++a)t.setTexture2D(e[a]||o,r[a])}h(ub,"setValueT1Array");function db(i,e,t){let n=this.cache,s=e.length,r=Jl(t,s);Dt(n,r)||(i.uniform1iv(this.addr,r),Ft(n,r));for(let o=0;o!==s;++o)t.setTexture3D(e[o]||Hm,r[o])}h(db,"setValueT3DArray");function fb(i,e,t){let n=this.cache,s=e.length,r=Jl(t,s);Dt(n,r)||(i.uniform1iv(this.addr,r),Ft(n,r));for(let o=0;o!==s;++o)t.setTextureCube(e[o]||Gm,r[o])}h(fb,"setValueT6Array");function pb(i,e,t){let n=this.cache,s=e.length,r=Jl(t,s);Dt(n,r)||(i.uniform1iv(this.addr,r),Ft(n,r));for(let o=0;o!==s;++o)t.setTexture2DArray(e[o]||Vm,r[o])}h(pb,"setValueT2DArrayArray");function mb(i){switch(i){case 5126:return Z_;case 35664:return J_;case 35665:return j_;case 35666:return Q_;case 35674:return eb;case 35675:return tb;case 35676:return nb;case 5124:case 35670:return ib;case 35667:case 35671:return sb;case 35668:case 35672:return rb;case 35669:case 35673:return ob;case 5125:return ab;case 36294:return lb;case 36295:return cb;case 36296:return hb;case 35678:case 36198:case 36298:case 36306:case 35682:return ub;case 35679:case 36299:case 36307:return db;case 35680:case 36300:case 36308:case 36293:return fb;case 36289:case 36303:case 36311:case 36292:return pb}}h(mb,"getPureArraySetter");var Sd=class Sd{constructor(e,t,n){this.id=e,this.addr=n,this.cache=[],this.type=t.type,this.setValue=K_(t.type)}};h(Sd,"SingleUniform");var dd=Sd,Md=class Md{constructor(e,t,n){this.id=e,this.addr=n,this.cache=[],this.type=t.type,this.size=t.size,this.setValue=mb(t.type)}};h(Md,"PureArrayUniform");var fd=Md,wd=class wd{constructor(e){this.id=e,this.seq=[],this.map={}}setValue(e,t,n){let s=this.seq;for(let r=0,o=s.length;r!==o;++r){let a=s[r];a.setValue(e,t[a.id],n)}}};h(wd,"StructuredUniform");var pd=wd,cd=/(\w+)(\])?(\[|\.)?/g;function Tm(i,e){i.seq.push(e),i.map[e.id]=e}h(Tm,"addUniform");function gb(i,e,t){let n=i.name,s=n.length;for(cd.lastIndex=0;;){let r=cd.exec(n),o=cd.lastIndex,a=r[1],l=r[2]==="]",c=r[3];if(l&&(a=a|0),c===void 0||c==="["&&o+2===s){Tm(t,c===void 0?new dd(a,i,e):new fd(a,i,e));break}else{let f=t.map[a];f===void 0&&(f=new pd(a),Tm(t,f)),t=f}}}h(gb,"parseUniform");var Ed=class Ed{constructor(e,t){this.seq=[],this.map={};let n=e.getProgramParameter(t,e.ACTIVE_UNIFORMS);for(let o=0;o<n;++o){let a=e.getActiveUniform(t,o),l=e.getUniformLocation(t,a.name);gb(a,l,this)}let s=[],r=[];for(let o of this.seq)o.type===e.SAMPLER_2D_SHADOW||o.type===e.SAMPLER_CUBE_SHADOW||o.type===e.SAMPLER_2D_ARRAY_SHADOW?s.push(o):r.push(o);s.length>0&&(this.seq=s.concat(r))}setValue(e,t,n,s){let r=this.map[t];r!==void 0&&r.setValue(e,n,s)}setOptional(e,t,n){let s=t[n];s!==void 0&&this.setValue(e,n,s)}static upload(e,t,n,s){for(let r=0,o=t.length;r!==o;++r){let a=t[r],l=n[a.id];l.needsUpdate!==!1&&a.setValue(e,l.value,s)}}static seqWithValue(e,t){let n=[];for(let s=0,r=e.length;s!==r;++s){let o=e[s];o.id in t&&n.push(o)}return n}};h(Ed,"WebGLUniforms");var Zs=Ed;function Am(i,e,t){let n=i.createShader(e);return i.shaderSource(n,t),i.compileShader(n),n}h(Am,"WebGLShader");var xb=37297,yb=0;function vb(i,e){let t=i.split(`
`),n=[],s=Math.max(e-6,0),r=Math.min(e+6,t.length);for(let o=s;o<r;o++){let a=o+1;n.push(`${a===e?">":" "} ${a}: ${t[o]}`)}return n.join(`
`)}h(vb,"handleSource");var Pm=new Oe;function _b(i){Ye._getMatrix(Pm,Ye.workingColorSpace,i);let e=`mat3( ${Pm.elements.map(t=>t.toFixed(4))} )`;switch(Ye.getTransfer(i)){case vr:return[e,"LinearTransferOETF"];case et:return[e,"sRGBTransferOETF"];default:return Ce("WebGLProgram: Unsupported color space: ",i),[e,"LinearTransferOETF"]}}h(_b,"getEncodingComponents");function Rm(i,e,t){let n=i.getShaderParameter(e,i.COMPILE_STATUS),r=(i.getShaderInfoLog(e)||"").trim();if(n&&r==="")return"";let o=/ERROR: 0:(\d+)/.exec(r);if(o){let a=parseInt(o[1]);return t.toUpperCase()+`

`+r+`

`+vb(i.getShaderSource(e),a)}else return r}h(Rm,"getShaderErrors");function bb(i,e){let t=_b(e);return[`vec4 ${i}( vec4 value ) {`,`	return ${t[1]}( vec4( value.rgb * ${t[0]}, value.a ) );`,"}"].join(`
`)}h(bb,"getTexelEncodingFunction");var Sb={[Th]:"Linear",[Ah]:"Reinhard",[Ph]:"Cineon",[Rh]:"ACESFilmic",[Ih]:"AgX",[Lh]:"Neutral",[Ch]:"Custom"};function Mb(i,e){let t=Sb[e];return t===void 0?(Ce("WebGLProgram: Unsupported toneMapping:",e),"vec3 "+i+"( vec3 color ) { return LinearToneMapping( color ); }"):"vec3 "+i+"( vec3 color ) { return "+t+"ToneMapping( color ); }"}h(Mb,"getToneMappingFunction");var ql=new O;function wb(){Ye.getLuminanceCoefficients(ql);let i=ql.x.toFixed(4),e=ql.y.toFixed(4),t=ql.z.toFixed(4);return["float luminance( const in vec3 rgb ) {",`	const vec3 weights = vec3( ${i}, ${e}, ${t} );`,"	return dot( weights, rgb );","}"].join(`
`)}h(wb,"getLuminanceFunction");function Eb(i){return[i.extensionClipCullDistance?"#extension GL_ANGLE_clip_cull_distance : require":"",i.extensionMultiDraw?"#extension GL_ANGLE_multi_draw : require":""].filter(to).join(`
`)}h(Eb,"generateVertexExtensions");function Tb(i){let e=[];for(let t in i){let n=i[t];n!==!1&&e.push("#define "+t+" "+n)}return e.join(`
`)}h(Tb,"generateDefines");function Ab(i,e){let t={},n=i.getProgramParameter(e,i.ACTIVE_ATTRIBUTES);for(let s=0;s<n;s++){let r=i.getActiveAttrib(e,s),o=r.name,a=1;r.type===i.FLOAT_MAT2&&(a=2),r.type===i.FLOAT_MAT3&&(a=3),r.type===i.FLOAT_MAT4&&(a=4),t[o]={type:r.type,location:i.getAttribLocation(e,o),locationSize:a}}return t}h(Ab,"fetchAttributeLocations");function to(i){return i!==""}h(to,"filterEmptyLine");function Cm(i,e){let t=e.numSpotLightShadows+e.numSpotLightMaps-e.numSpotLightShadowsWithMaps;return i.replace(/NUM_DIR_LIGHTS/g,e.numDirLights).replace(/NUM_SPOT_LIGHTS/g,e.numSpotLights).replace(/NUM_SPOT_LIGHT_MAPS/g,e.numSpotLightMaps).replace(/NUM_SPOT_LIGHT_COORDS/g,t).replace(/NUM_RECT_AREA_LIGHTS/g,e.numRectAreaLights).replace(/NUM_POINT_LIGHTS/g,e.numPointLights).replace(/NUM_HEMI_LIGHTS/g,e.numHemiLights).replace(/NUM_DIR_LIGHT_SHADOWS/g,e.numDirLightShadows).replace(/NUM_SPOT_LIGHT_SHADOWS_WITH_MAPS/g,e.numSpotLightShadowsWithMaps).replace(/NUM_SPOT_LIGHT_SHADOWS/g,e.numSpotLightShadows).replace(/NUM_POINT_LIGHT_SHADOWS/g,e.numPointLightShadows)}h(Cm,"replaceLightNums");function Im(i,e){return i.replace(/NUM_CLIPPING_PLANES/g,e.numClippingPlanes).replace(/UNION_CLIPPING_PLANES/g,e.numClippingPlanes-e.numClipIntersection)}h(Im,"replaceClippingPlaneNums");var Pb=/^[ \t]*#include +<([\w\d./]+)>/gm;function md(i){return i.replace(Pb,Cb)}h(md,"resolveIncludes");var Rb=new Map;function Cb(i,e){let t=He[e];if(t===void 0){let n=Rb.get(e);if(n!==void 0)t=He[n],Ce('WebGLRenderer: Shader chunk "%s" has been deprecated. Use "%s" instead.',e,n);else throw new Error("THREE.WebGLProgram: Can not resolve #include <"+e+">")}return md(t)}h(Cb,"includeReplacer");var Ib=/#pragma unroll_loop_start\s+for\s*\(\s*int\s+i\s*=\s*(\d+)\s*;\s*i\s*<\s*(\d+)\s*;\s*i\s*\+\+\s*\)\s*{([\s\S]+?)}\s+#pragma unroll_loop_end/g;function Lm(i){return i.replace(Ib,Lb)}h(Lm,"unrollLoops");function Lb(i,e,t,n){let s="";for(let r=parseInt(e);r<parseInt(t);r++)s+=n.replace(/\[\s*i\s*\]/g,"[ "+r+" ]").replace(/UNROLLED_LOOP_INDEX/g,r);return s}h(Lb,"loopReplacer");function Dm(i){let e=`precision ${i.precision} float;
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
#define LOW_PRECISION`),e}h(Dm,"generatePrecision");var Db={[Gr]:"SHADOWMAP_TYPE_PCF",[qs]:"SHADOWMAP_TYPE_VSM"};function Fb(i){return Db[i.shadowMapType]||"SHADOWMAP_TYPE_BASIC"}h(Fb,"generateShadowMapTypeDefine");var Nb={[ki]:"ENVMAP_TYPE_CUBE",[os]:"ENVMAP_TYPE_CUBE",[Wr]:"ENVMAP_TYPE_CUBE_UV"};function Ub(i){return i.envMap===!1?"ENVMAP_TYPE_CUBE":Nb[i.envMapMode]||"ENVMAP_TYPE_CUBE"}h(Ub,"generateEnvMapTypeDefine");var Ob={[os]:"ENVMAP_MODE_REFRACTION"};function Bb(i){return i.envMap===!1?"ENVMAP_MODE_REFLECTION":Ob[i.envMapMode]||"ENVMAP_MODE_REFLECTION"}h(Bb,"generateEnvMapModeDefine");var zb={[Eh]:"ENVMAP_BLENDING_MULTIPLY",[Kp]:"ENVMAP_BLENDING_MIX",[Zp]:"ENVMAP_BLENDING_ADD"};function kb(i){return i.envMap===!1?"ENVMAP_BLENDING_NONE":zb[i.combine]||"ENVMAP_BLENDING_NONE"}h(kb,"generateEnvMapBlendingDefine");function Vb(i){let e=i.envMapCubeUVHeight;if(e===null)return null;let t=Math.log2(e)-2,n=1/e;return{texelWidth:1/(3*Math.max(Math.pow(2,t),7*16)),texelHeight:n,maxMip:t}}h(Vb,"generateCubeUVSize");function Hb(i,e,t,n){let s=i.getContext(),r=t.defines,o=t.vertexShader,a=t.fragmentShader,l=Fb(t),c=Ub(t),u=Bb(t),f=kb(t),d=Vb(t),g=Eb(t),m=Tb(r),y=s.createProgram(),p,x,S=t.glslVersion?"#version "+t.glslVersion+`
`:"";t.isRawShaderMaterial?(p=["#define SHADER_TYPE "+t.shaderType,"#define SHADER_NAME "+t.shaderName,m].filter(to).join(`
`),p.length>0&&(p+=`
`),x=["#define SHADER_TYPE "+t.shaderType,"#define SHADER_NAME "+t.shaderName,m].filter(to).join(`
`),x.length>0&&(x+=`
`)):(p=[Dm(t),"#define SHADER_TYPE "+t.shaderType,"#define SHADER_NAME "+t.shaderName,m,t.extensionClipCullDistance?"#define USE_CLIP_DISTANCE":"",t.batching?"#define USE_BATCHING":"",t.batchingColor?"#define USE_BATCHING_COLOR":"",t.instancing?"#define USE_INSTANCING":"",t.instancingColor?"#define USE_INSTANCING_COLOR":"",t.instancingMorph?"#define USE_INSTANCING_MORPH":"",t.useFog&&t.fog?"#define USE_FOG":"",t.useFog&&t.fogExp2?"#define FOG_EXP2":"",t.map?"#define USE_MAP":"",t.envMap?"#define USE_ENVMAP":"",t.envMap?"#define "+u:"",t.lightMap?"#define USE_LIGHTMAP":"",t.aoMap?"#define USE_AOMAP":"",t.bumpMap?"#define USE_BUMPMAP":"",t.normalMap?"#define USE_NORMALMAP":"",t.normalMapObjectSpace?"#define USE_NORMALMAP_OBJECTSPACE":"",t.normalMapTangentSpace?"#define USE_NORMALMAP_TANGENTSPACE":"",t.displacementMap?"#define USE_DISPLACEMENTMAP":"",t.emissiveMap?"#define USE_EMISSIVEMAP":"",t.anisotropy?"#define USE_ANISOTROPY":"",t.anisotropyMap?"#define USE_ANISOTROPYMAP":"",t.clearcoatMap?"#define USE_CLEARCOATMAP":"",t.clearcoatRoughnessMap?"#define USE_CLEARCOAT_ROUGHNESSMAP":"",t.clearcoatNormalMap?"#define USE_CLEARCOAT_NORMALMAP":"",t.iridescenceMap?"#define USE_IRIDESCENCEMAP":"",t.iridescenceThicknessMap?"#define USE_IRIDESCENCE_THICKNESSMAP":"",t.specularMap?"#define USE_SPECULARMAP":"",t.specularColorMap?"#define USE_SPECULAR_COLORMAP":"",t.specularIntensityMap?"#define USE_SPECULAR_INTENSITYMAP":"",t.roughnessMap?"#define USE_ROUGHNESSMAP":"",t.metalnessMap?"#define USE_METALNESSMAP":"",t.alphaMap?"#define USE_ALPHAMAP":"",t.alphaHash?"#define USE_ALPHAHASH":"",t.transmission?"#define USE_TRANSMISSION":"",t.transmissionMap?"#define USE_TRANSMISSIONMAP":"",t.thicknessMap?"#define USE_THICKNESSMAP":"",t.sheenColorMap?"#define USE_SHEEN_COLORMAP":"",t.sheenRoughnessMap?"#define USE_SHEEN_ROUGHNESSMAP":"",t.mapUv?"#define MAP_UV "+t.mapUv:"",t.alphaMapUv?"#define ALPHAMAP_UV "+t.alphaMapUv:"",t.lightMapUv?"#define LIGHTMAP_UV "+t.lightMapUv:"",t.aoMapUv?"#define AOMAP_UV "+t.aoMapUv:"",t.emissiveMapUv?"#define EMISSIVEMAP_UV "+t.emissiveMapUv:"",t.bumpMapUv?"#define BUMPMAP_UV "+t.bumpMapUv:"",t.normalMapUv?"#define NORMALMAP_UV "+t.normalMapUv:"",t.displacementMapUv?"#define DISPLACEMENTMAP_UV "+t.displacementMapUv:"",t.metalnessMapUv?"#define METALNESSMAP_UV "+t.metalnessMapUv:"",t.roughnessMapUv?"#define ROUGHNESSMAP_UV "+t.roughnessMapUv:"",t.anisotropyMapUv?"#define ANISOTROPYMAP_UV "+t.anisotropyMapUv:"",t.clearcoatMapUv?"#define CLEARCOATMAP_UV "+t.clearcoatMapUv:"",t.clearcoatNormalMapUv?"#define CLEARCOAT_NORMALMAP_UV "+t.clearcoatNormalMapUv:"",t.clearcoatRoughnessMapUv?"#define CLEARCOAT_ROUGHNESSMAP_UV "+t.clearcoatRoughnessMapUv:"",t.iridescenceMapUv?"#define IRIDESCENCEMAP_UV "+t.iridescenceMapUv:"",t.iridescenceThicknessMapUv?"#define IRIDESCENCE_THICKNESSMAP_UV "+t.iridescenceThicknessMapUv:"",t.sheenColorMapUv?"#define SHEEN_COLORMAP_UV "+t.sheenColorMapUv:"",t.sheenRoughnessMapUv?"#define SHEEN_ROUGHNESSMAP_UV "+t.sheenRoughnessMapUv:"",t.specularMapUv?"#define SPECULARMAP_UV "+t.specularMapUv:"",t.specularColorMapUv?"#define SPECULAR_COLORMAP_UV "+t.specularColorMapUv:"",t.specularIntensityMapUv?"#define SPECULAR_INTENSITYMAP_UV "+t.specularIntensityMapUv:"",t.transmissionMapUv?"#define TRANSMISSIONMAP_UV "+t.transmissionMapUv:"",t.thicknessMapUv?"#define THICKNESSMAP_UV "+t.thicknessMapUv:"",t.vertexTangents&&t.flatShading===!1?"#define USE_TANGENT":"",t.vertexNormals?"#define HAS_NORMAL":"",t.vertexColors?"#define USE_COLOR":"",t.vertexAlphas?"#define USE_COLOR_ALPHA":"",t.vertexUv1s?"#define USE_UV1":"",t.vertexUv2s?"#define USE_UV2":"",t.vertexUv3s?"#define USE_UV3":"",t.pointsUvs?"#define USE_POINTS_UV":"",t.flatShading?"#define FLAT_SHADED":"",t.skinning?"#define USE_SKINNING":"",t.morphTargets?"#define USE_MORPHTARGETS":"",t.morphNormals&&t.flatShading===!1?"#define USE_MORPHNORMALS":"",t.morphColors?"#define USE_MORPHCOLORS":"",t.morphTargetsCount>0?"#define MORPHTARGETS_TEXTURE_STRIDE "+t.morphTextureStride:"",t.morphTargetsCount>0?"#define MORPHTARGETS_COUNT "+t.morphTargetsCount:"",t.doubleSided?"#define DOUBLE_SIDED":"",t.flipSided?"#define FLIP_SIDED":"",t.shadowMapEnabled?"#define USE_SHADOWMAP":"",t.shadowMapEnabled?"#define "+l:"",t.sizeAttenuation?"#define USE_SIZEATTENUATION":"",t.numLightProbes>0?"#define USE_LIGHT_PROBES":"",t.logarithmicDepthBuffer?"#define USE_LOGARITHMIC_DEPTH_BUFFER":"",t.reversedDepthBuffer?"#define USE_REVERSED_DEPTH_BUFFER":"","uniform mat4 modelMatrix;","uniform mat4 modelViewMatrix;","uniform mat4 projectionMatrix;","uniform mat4 viewMatrix;","uniform mat3 normalMatrix;","uniform vec3 cameraPosition;","uniform bool isOrthographic;","#ifdef USE_INSTANCING","	attribute mat4 instanceMatrix;","#endif","#ifdef USE_INSTANCING_COLOR","	attribute vec3 instanceColor;","#endif","#ifdef USE_INSTANCING_MORPH","	uniform sampler2D morphTexture;","#endif","attribute vec3 position;","attribute vec3 normal;","attribute vec2 uv;","#ifdef USE_UV1","	attribute vec2 uv1;","#endif","#ifdef USE_UV2","	attribute vec2 uv2;","#endif","#ifdef USE_UV3","	attribute vec2 uv3;","#endif","#ifdef USE_TANGENT","	attribute vec4 tangent;","#endif","#if defined( USE_COLOR_ALPHA )","	attribute vec4 color;","#elif defined( USE_COLOR )","	attribute vec3 color;","#endif","#ifdef USE_SKINNING","	attribute vec4 skinIndex;","	attribute vec4 skinWeight;","#endif",`
`].filter(to).join(`
`),x=[Dm(t),"#define SHADER_TYPE "+t.shaderType,"#define SHADER_NAME "+t.shaderName,m,t.useFog&&t.fog?"#define USE_FOG":"",t.useFog&&t.fogExp2?"#define FOG_EXP2":"",t.alphaToCoverage?"#define ALPHA_TO_COVERAGE":"",t.map?"#define USE_MAP":"",t.matcap?"#define USE_MATCAP":"",t.envMap?"#define USE_ENVMAP":"",t.envMap?"#define "+c:"",t.envMap?"#define "+u:"",t.envMap?"#define "+f:"",d?"#define CUBEUV_TEXEL_WIDTH "+d.texelWidth:"",d?"#define CUBEUV_TEXEL_HEIGHT "+d.texelHeight:"",d?"#define CUBEUV_MAX_MIP "+d.maxMip+".0":"",t.lightMap?"#define USE_LIGHTMAP":"",t.aoMap?"#define USE_AOMAP":"",t.bumpMap?"#define USE_BUMPMAP":"",t.normalMap?"#define USE_NORMALMAP":"",t.normalMapObjectSpace?"#define USE_NORMALMAP_OBJECTSPACE":"",t.normalMapTangentSpace?"#define USE_NORMALMAP_TANGENTSPACE":"",t.packedNormalMap?"#define USE_PACKED_NORMALMAP":"",t.emissiveMap?"#define USE_EMISSIVEMAP":"",t.anisotropy?"#define USE_ANISOTROPY":"",t.anisotropyMap?"#define USE_ANISOTROPYMAP":"",t.clearcoat?"#define USE_CLEARCOAT":"",t.clearcoatMap?"#define USE_CLEARCOATMAP":"",t.clearcoatRoughnessMap?"#define USE_CLEARCOAT_ROUGHNESSMAP":"",t.clearcoatNormalMap?"#define USE_CLEARCOAT_NORMALMAP":"",t.dispersion?"#define USE_DISPERSION":"",t.iridescence?"#define USE_IRIDESCENCE":"",t.iridescenceMap?"#define USE_IRIDESCENCEMAP":"",t.iridescenceThicknessMap?"#define USE_IRIDESCENCE_THICKNESSMAP":"",t.specularMap?"#define USE_SPECULARMAP":"",t.specularColorMap?"#define USE_SPECULAR_COLORMAP":"",t.specularIntensityMap?"#define USE_SPECULAR_INTENSITYMAP":"",t.roughnessMap?"#define USE_ROUGHNESSMAP":"",t.metalnessMap?"#define USE_METALNESSMAP":"",t.alphaMap?"#define USE_ALPHAMAP":"",t.alphaTest?"#define USE_ALPHATEST":"",t.alphaHash?"#define USE_ALPHAHASH":"",t.sheen?"#define USE_SHEEN":"",t.sheenColorMap?"#define USE_SHEEN_COLORMAP":"",t.sheenRoughnessMap?"#define USE_SHEEN_ROUGHNESSMAP":"",t.transmission?"#define USE_TRANSMISSION":"",t.transmissionMap?"#define USE_TRANSMISSIONMAP":"",t.thicknessMap?"#define USE_THICKNESSMAP":"",t.vertexTangents&&t.flatShading===!1?"#define USE_TANGENT":"",t.vertexColors||t.instancingColor?"#define USE_COLOR":"",t.vertexAlphas||t.batchingColor?"#define USE_COLOR_ALPHA":"",t.vertexUv1s?"#define USE_UV1":"",t.vertexUv2s?"#define USE_UV2":"",t.vertexUv3s?"#define USE_UV3":"",t.pointsUvs?"#define USE_POINTS_UV":"",t.gradientMap?"#define USE_GRADIENTMAP":"",t.flatShading?"#define FLAT_SHADED":"",t.doubleSided?"#define DOUBLE_SIDED":"",t.flipSided?"#define FLIP_SIDED":"",t.shadowMapEnabled?"#define USE_SHADOWMAP":"",t.shadowMapEnabled?"#define "+l:"",t.premultipliedAlpha?"#define PREMULTIPLIED_ALPHA":"",t.numLightProbes>0?"#define USE_LIGHT_PROBES":"",t.numLightProbeGrids>0?"#define USE_LIGHT_PROBES_GRID":"",t.decodeVideoTexture?"#define DECODE_VIDEO_TEXTURE":"",t.decodeVideoTextureEmissive?"#define DECODE_VIDEO_TEXTURE_EMISSIVE":"",t.logarithmicDepthBuffer?"#define USE_LOGARITHMIC_DEPTH_BUFFER":"",t.reversedDepthBuffer?"#define USE_REVERSED_DEPTH_BUFFER":"","uniform mat4 viewMatrix;","uniform vec3 cameraPosition;","uniform bool isOrthographic;",t.toneMapping!==Dn?"#define TONE_MAPPING":"",t.toneMapping!==Dn?He.tonemapping_pars_fragment:"",t.toneMapping!==Dn?Mb("toneMapping",t.toneMapping):"",t.dithering?"#define DITHERING":"",t.opaque?"#define OPAQUE":"",He.colorspace_pars_fragment,bb("linearToOutputTexel",t.outputColorSpace),wb(),t.useDepthPacking?"#define DEPTH_PACKING "+t.depthPacking:"",`
`].filter(to).join(`
`)),o=md(o),o=Cm(o,t),o=Im(o,t),a=md(a),a=Cm(a,t),a=Im(a,t),o=Lm(o),a=Lm(a),t.isRawShaderMaterial!==!0&&(S=`#version 300 es
`,p=[g,"#define attribute in","#define varying out","#define texture2D texture"].join(`
`)+`
`+p,x=["#define varying in",t.glslVersion===Hh?"":"layout(location = 0) out highp vec4 pc_fragColor;",t.glslVersion===Hh?"":"#define gl_FragColor pc_fragColor","#define gl_FragDepthEXT gl_FragDepth","#define texture2D texture","#define textureCube texture","#define texture2DProj textureProj","#define texture2DLodEXT textureLod","#define texture2DProjLodEXT textureProjLod","#define textureCubeLodEXT textureLod","#define texture2DGradEXT textureGrad","#define texture2DProjGradEXT textureProjGrad","#define textureCubeGradEXT textureGrad"].join(`
`)+`
`+x);let M=S+p+o,_=S+x+a,A=Am(s,s.VERTEX_SHADER,M),w=Am(s,s.FRAGMENT_SHADER,_);s.attachShader(y,A),s.attachShader(y,w),t.index0AttributeName!==void 0?s.bindAttribLocation(y,0,t.index0AttributeName):t.hasPositionAttribute===!0&&s.bindAttribLocation(y,0,"position"),s.linkProgram(y);function T(I){if(i.debug.checkShaderErrors){let D=s.getProgramInfoLog(y)||"",L=s.getShaderInfoLog(A)||"",H=s.getShaderInfoLog(w)||"",F=D.trim(),Y=L.trim(),k=H.trim(),Z=!0,ee=!0;if(s.getProgramParameter(y,s.LINK_STATUS)===!1)if(Z=!1,typeof i.debug.onShaderError=="function")i.debug.onShaderError(s,y,A,w);else{let re=Rm(s,A,"vertex"),le=Rm(s,w,"fragment");Ne("WebGLProgram: Shader Error "+s.getError()+" - VALIDATE_STATUS "+s.getProgramParameter(y,s.VALIDATE_STATUS)+`

Material Name: `+I.name+`
Material Type: `+I.type+`

Program Info Log: `+F+`
`+re+`
`+le)}else F!==""?Ce("WebGLProgram: Program Info Log:",F):(Y===""||k==="")&&(ee=!1);ee&&(I.diagnostics={runnable:Z,programLog:F,vertexShader:{log:Y,prefix:p},fragmentShader:{log:k,prefix:x}})}s.deleteShader(A),s.deleteShader(w),v=new Zs(s,y),P=Ab(s,y)}h(T,"onFirstUse");let v;this.getUniforms=function(){return v===void 0&&T(this),v};let P;this.getAttributes=function(){return P===void 0&&T(this),P};let C=t.rendererExtensionParallelShaderCompile===!1;return this.isReady=function(){return C===!1&&(C=s.getProgramParameter(y,xb)),C},this.destroy=function(){n.releaseStatesOfProgram(this),s.deleteProgram(y),this.program=void 0},this.type=t.shaderType,this.name=t.shaderName,this.id=yb++,this.cacheKey=e,this.usedTimes=1,this.program=y,this.vertexShader=A,this.fragmentShader=w,this}h(Hb,"WebGLProgram");var Gb=0,Td=class Td{constructor(){this.shaderCache=new Map,this.materialCache=new Map}update(e,t,n){let s=this._getShaderCacheForMaterial(e);return s.has(t)===!1&&(s.add(t),t.usedTimes++),s.has(n)===!1&&(s.add(n),n.usedTimes++),this}remove(e){let t=this.materialCache.get(e);for(let n of t)n.usedTimes--,n.usedTimes===0&&this.shaderCache.delete(n.code);return this.materialCache.delete(e),this}getVertexShaderStage(e){return this._getShaderStage(e.vertexShader)}getFragmentShaderStage(e){return this._getShaderStage(e.fragmentShader)}dispose(){this.shaderCache.clear(),this.materialCache.clear()}_getShaderCacheForMaterial(e){let t=this.materialCache,n=t.get(e);return n===void 0&&(n=new Set,t.set(e,n)),n}_getShaderStage(e){let t=this.shaderCache,n=t.get(e);return n===void 0&&(n=new xd(e),t.set(e,n)),n}};h(Td,"WebGLShaderCache");var gd=Td,Ad=class Ad{constructor(e){this.id=Gb++,this.code=e,this.usedTimes=0}};h(Ad,"WebGLShaderStage");var xd=Ad;function Wb(i){return i===Gi||i===Zr||i===Jr}h(Wb,"isPackedRGFormat");function Xb(i,e,t,n,s,r){let o=new wr,a=new gd,l=new Set,c=[],u=new Map,f=n.logarithmicDepthBuffer,d=n.precision,g={MeshDepthMaterial:"depth",MeshDistanceMaterial:"distance",MeshNormalMaterial:"normal",MeshBasicMaterial:"basic",MeshLambertMaterial:"lambert",MeshPhongMaterial:"phong",MeshToonMaterial:"toon",MeshStandardMaterial:"physical",MeshPhysicalMaterial:"physical",MeshMatcapMaterial:"matcap",LineBasicMaterial:"basic",LineDashedMaterial:"dashed",PointsMaterial:"points",ShadowMaterial:"shadow",SpriteMaterial:"sprite"};function m(v){return l.add(v),v===0?"uv":`uv${v}`}h(m,"getChannel");function y(v,P,C,I,D,L){let H=I.fog,F=D.geometry,Y=v.isMeshStandardMaterial||v.isMeshLambertMaterial||v.isMeshPhongMaterial?I.environment:null,k=v.isMeshStandardMaterial||v.isMeshLambertMaterial&&!v.envMap||v.isMeshPhongMaterial&&!v.envMap,Z=e.get(v.envMap||Y,k),ee=Z&&Z.mapping===Wr?Z.image.height:null,re=g[v.type];v.precision!==null&&(d=n.getMaxPrecision(v.precision),d!==v.precision&&Ce("WebGLProgram.getParameters:",v.precision,"not supported, using",d,"instead."));let le=F.morphAttributes.position||F.morphAttributes.normal||F.morphAttributes.color,_e=le!==void 0?le.length:0,$e=0;F.morphAttributes.position!==void 0&&($e=1),F.morphAttributes.normal!==void 0&&($e=2),F.morphAttributes.color!==void 0&&($e=3);let tt,Ke,J,oe;if(re){let be=sn[re];tt=be.vertexShader,Ke=be.fragmentShader}else{tt=v.vertexShader,Ke=v.fragmentShader;let be=a.getVertexShaderStage(v),yt=a.getFragmentShaderStage(v);a.update(v,be,yt),J=be.id,oe=yt.id}let ie=i.getRenderTarget(),Fe=i.state.buffers.depth.getReversed(),Be=D.isInstancedMesh===!0,Le=D.isBatchedMesh===!0,St=!!v.map,qe=!!v.matcap,ot=!!Z,Qe=!!v.aoMap,Ze=!!v.lightMap,At=!!v.bumpMap&&v.wireframe===!1,Ct=!!v.normalMap,Ut=!!v.displacementMap,kt=!!v.emissiveMap,xt=!!v.metalnessMap,Pt=!!v.roughnessMap,B=v.anisotropy>0,on=v.clearcoat>0,nt=v.dispersion>0,R=v.iridescence>0,b=v.sheen>0,V=v.transmission>0,X=B&&!!v.anisotropyMap,$=on&&!!v.clearcoatMap,se=on&&!!v.clearcoatNormalMap,he=on&&!!v.clearcoatRoughnessMap,K=R&&!!v.iridescenceMap,Q=R&&!!v.iridescenceThicknessMap,ue=b&&!!v.sheenColorMap,Ee=b&&!!v.sheenRoughnessMap,pe=!!v.specularMap,de=!!v.specularColorMap,Pe=!!v.specularIntensityMap,De=V&&!!v.transmissionMap,ze=V&&!!v.thicknessMap,N=!!v.gradientMap,ce=!!v.alphaMap,j=v.alphaTest>0,fe=!!v.alphaHash,xe=!!v.extensions,te=Dn;v.toneMapped&&(ie===null||ie.isXRRenderTarget===!0)&&(te=i.toneMapping);let we={shaderID:re,shaderType:v.type,shaderName:v.name,vertexShader:tt,fragmentShader:Ke,defines:v.defines,customVertexShaderID:J,customFragmentShaderID:oe,isRawShaderMaterial:v.isRawShaderMaterial===!0,glslVersion:v.glslVersion,precision:d,batching:Le,batchingColor:Le&&D._colorsTexture!==null,instancing:Be,instancingColor:Be&&D.instanceColor!==null,instancingMorph:Be&&D.morphTexture!==null,outputColorSpace:ie===null?i.outputColorSpace:ie.isXRRenderTarget===!0?ie.texture.colorSpace:Ye.workingColorSpace,alphaToCoverage:!!v.alphaToCoverage,map:St,matcap:qe,envMap:ot,envMapMode:ot&&Z.mapping,envMapCubeUVHeight:ee,aoMap:Qe,lightMap:Ze,bumpMap:At,normalMap:Ct,displacementMap:Ut,emissiveMap:kt,normalMapObjectSpace:Ct&&v.normalMapType===Qp,normalMapTangentSpace:Ct&&v.normalMapType===Vh,packedNormalMap:Ct&&v.normalMapType===Vh&&Wb(v.normalMap.format),metalnessMap:xt,roughnessMap:Pt,anisotropy:B,anisotropyMap:X,clearcoat:on,clearcoatMap:$,clearcoatNormalMap:se,clearcoatRoughnessMap:he,dispersion:nt,iridescence:R,iridescenceMap:K,iridescenceThicknessMap:Q,sheen:b,sheenColorMap:ue,sheenRoughnessMap:Ee,specularMap:pe,specularColorMap:de,specularIntensityMap:Pe,transmission:V,transmissionMap:De,thicknessMap:ze,gradientMap:N,opaque:v.transparent===!1&&v.blending===ns&&v.alphaToCoverage===!1,alphaMap:ce,alphaTest:j,alphaHash:fe,combine:v.combine,mapUv:St&&m(v.map.channel),aoMapUv:Qe&&m(v.aoMap.channel),lightMapUv:Ze&&m(v.lightMap.channel),bumpMapUv:At&&m(v.bumpMap.channel),normalMapUv:Ct&&m(v.normalMap.channel),displacementMapUv:Ut&&m(v.displacementMap.channel),emissiveMapUv:kt&&m(v.emissiveMap.channel),metalnessMapUv:xt&&m(v.metalnessMap.channel),roughnessMapUv:Pt&&m(v.roughnessMap.channel),anisotropyMapUv:X&&m(v.anisotropyMap.channel),clearcoatMapUv:$&&m(v.clearcoatMap.channel),clearcoatNormalMapUv:se&&m(v.clearcoatNormalMap.channel),clearcoatRoughnessMapUv:he&&m(v.clearcoatRoughnessMap.channel),iridescenceMapUv:K&&m(v.iridescenceMap.channel),iridescenceThicknessMapUv:Q&&m(v.iridescenceThicknessMap.channel),sheenColorMapUv:ue&&m(v.sheenColorMap.channel),sheenRoughnessMapUv:Ee&&m(v.sheenRoughnessMap.channel),specularMapUv:pe&&m(v.specularMap.channel),specularColorMapUv:de&&m(v.specularColorMap.channel),specularIntensityMapUv:Pe&&m(v.specularIntensityMap.channel),transmissionMapUv:De&&m(v.transmissionMap.channel),thicknessMapUv:ze&&m(v.thicknessMap.channel),alphaMapUv:ce&&m(v.alphaMap.channel),vertexTangents:!!F.attributes.tangent&&(Ct||B),vertexNormals:!!F.attributes.normal,vertexColors:v.vertexColors,vertexAlphas:v.vertexColors===!0&&!!F.attributes.color&&F.attributes.color.itemSize===4,pointsUvs:D.isPoints===!0&&!!F.attributes.uv&&(St||ce),fog:!!H,useFog:v.fog===!0,fogExp2:!!H&&H.isFogExp2,flatShading:v.wireframe===!1&&(v.flatShading===!0||F.attributes.normal===void 0&&Ct===!1&&(v.isMeshLambertMaterial||v.isMeshPhongMaterial||v.isMeshStandardMaterial||v.isMeshPhysicalMaterial)),sizeAttenuation:v.sizeAttenuation===!0,logarithmicDepthBuffer:f,reversedDepthBuffer:Fe,skinning:D.isSkinnedMesh===!0,hasPositionAttribute:F.attributes.position!==void 0,morphTargets:F.morphAttributes.position!==void 0,morphNormals:F.morphAttributes.normal!==void 0,morphColors:F.morphAttributes.color!==void 0,morphTargetsCount:_e,morphTextureStride:$e,numDirLights:P.directional.length,numPointLights:P.point.length,numSpotLights:P.spot.length,numSpotLightMaps:P.spotLightMap.length,numRectAreaLights:P.rectArea.length,numHemiLights:P.hemi.length,numDirLightShadows:P.directionalShadowMap.length,numPointLightShadows:P.pointShadowMap.length,numSpotLightShadows:P.spotShadowMap.length,numSpotLightShadowsWithMaps:P.numSpotLightShadowsWithMaps,numLightProbes:P.numLightProbes,numLightProbeGrids:L.length,numClippingPlanes:r.numPlanes,numClipIntersection:r.numIntersection,dithering:v.dithering,shadowMapEnabled:i.shadowMap.enabled&&C.length>0,shadowMapType:i.shadowMap.type,toneMapping:te,decodeVideoTexture:St&&v.map.isVideoTexture===!0&&Ye.getTransfer(v.map.colorSpace)===et,decodeVideoTextureEmissive:kt&&v.emissiveMap.isVideoTexture===!0&&Ye.getTransfer(v.emissiveMap.colorSpace)===et,premultipliedAlpha:v.premultipliedAlpha,doubleSided:v.side===cn,flipSided:v.side===nn,useDepthPacking:v.depthPacking>=0,depthPacking:v.depthPacking||0,index0AttributeName:v.index0AttributeName,extensionClipCullDistance:xe&&v.extensions.clipCullDistance===!0&&t.has("WEBGL_clip_cull_distance"),extensionMultiDraw:(xe&&v.extensions.multiDraw===!0||Le)&&t.has("WEBGL_multi_draw"),rendererExtensionParallelShaderCompile:t.has("KHR_parallel_shader_compile"),customProgramCacheKey:v.customProgramCacheKey()};return we.vertexUv1s=l.has(1),we.vertexUv2s=l.has(2),we.vertexUv3s=l.has(3),l.clear(),we}h(y,"getParameters");function p(v){let P=[];if(v.shaderID?P.push(v.shaderID):(P.push(v.customVertexShaderID),P.push(v.customFragmentShaderID)),v.defines!==void 0)for(let C in v.defines)P.push(C),P.push(v.defines[C]);return v.isRawShaderMaterial===!1&&(x(P,v),S(P,v),P.push(i.outputColorSpace)),P.push(v.customProgramCacheKey),P.join()}h(p,"getProgramCacheKey");function x(v,P){v.push(P.precision),v.push(P.outputColorSpace),v.push(P.envMapMode),v.push(P.envMapCubeUVHeight),v.push(P.mapUv),v.push(P.alphaMapUv),v.push(P.lightMapUv),v.push(P.aoMapUv),v.push(P.bumpMapUv),v.push(P.normalMapUv),v.push(P.displacementMapUv),v.push(P.emissiveMapUv),v.push(P.metalnessMapUv),v.push(P.roughnessMapUv),v.push(P.anisotropyMapUv),v.push(P.clearcoatMapUv),v.push(P.clearcoatNormalMapUv),v.push(P.clearcoatRoughnessMapUv),v.push(P.iridescenceMapUv),v.push(P.iridescenceThicknessMapUv),v.push(P.sheenColorMapUv),v.push(P.sheenRoughnessMapUv),v.push(P.specularMapUv),v.push(P.specularColorMapUv),v.push(P.specularIntensityMapUv),v.push(P.transmissionMapUv),v.push(P.thicknessMapUv),v.push(P.combine),v.push(P.fogExp2),v.push(P.sizeAttenuation),v.push(P.morphTargetsCount),v.push(P.morphAttributeCount),v.push(P.numDirLights),v.push(P.numPointLights),v.push(P.numSpotLights),v.push(P.numSpotLightMaps),v.push(P.numHemiLights),v.push(P.numRectAreaLights),v.push(P.numDirLightShadows),v.push(P.numPointLightShadows),v.push(P.numSpotLightShadows),v.push(P.numSpotLightShadowsWithMaps),v.push(P.numLightProbes),v.push(P.shadowMapType),v.push(P.toneMapping),v.push(P.numClippingPlanes),v.push(P.numClipIntersection),v.push(P.depthPacking)}h(x,"getProgramCacheKeyParameters");function S(v,P){o.disableAll(),P.instancing&&o.enable(0),P.instancingColor&&o.enable(1),P.instancingMorph&&o.enable(2),P.matcap&&o.enable(3),P.envMap&&o.enable(4),P.normalMapObjectSpace&&o.enable(5),P.normalMapTangentSpace&&o.enable(6),P.clearcoat&&o.enable(7),P.iridescence&&o.enable(8),P.alphaTest&&o.enable(9),P.vertexColors&&o.enable(10),P.vertexAlphas&&o.enable(11),P.vertexUv1s&&o.enable(12),P.vertexUv2s&&o.enable(13),P.vertexUv3s&&o.enable(14),P.vertexTangents&&o.enable(15),P.anisotropy&&o.enable(16),P.alphaHash&&o.enable(17),P.batching&&o.enable(18),P.dispersion&&o.enable(19),P.batchingColor&&o.enable(20),P.gradientMap&&o.enable(21),P.packedNormalMap&&o.enable(22),P.vertexNormals&&o.enable(23),v.push(o.mask),o.disableAll(),P.fog&&o.enable(0),P.useFog&&o.enable(1),P.flatShading&&o.enable(2),P.logarithmicDepthBuffer&&o.enable(3),P.reversedDepthBuffer&&o.enable(4),P.skinning&&o.enable(5),P.morphTargets&&o.enable(6),P.morphNormals&&o.enable(7),P.morphColors&&o.enable(8),P.premultipliedAlpha&&o.enable(9),P.shadowMapEnabled&&o.enable(10),P.doubleSided&&o.enable(11),P.flipSided&&o.enable(12),P.useDepthPacking&&o.enable(13),P.dithering&&o.enable(14),P.transmission&&o.enable(15),P.sheen&&o.enable(16),P.opaque&&o.enable(17),P.pointsUvs&&o.enable(18),P.decodeVideoTexture&&o.enable(19),P.decodeVideoTextureEmissive&&o.enable(20),P.alphaToCoverage&&o.enable(21),P.numLightProbeGrids>0&&o.enable(22),P.hasPositionAttribute&&o.enable(23),v.push(o.mask)}h(S,"getProgramCacheKeyBooleans");function M(v){let P=g[v.type],C;if(P){let I=sn[P];C=jr.clone(I.uniforms)}else C=v.uniforms;return C}h(M,"getUniforms");function _(v,P){let C=u.get(P);return C!==void 0?++C.usedTimes:(C=new Hb(i,P,v,s),c.push(C),u.set(P,C)),C}h(_,"acquireProgram");function A(v){if(--v.usedTimes===0){let P=c.indexOf(v);c[P]=c[c.length-1],c.pop(),u.delete(v.cacheKey),v.destroy()}}h(A,"releaseProgram");function w(v){a.remove(v)}h(w,"releaseShaderCache");function T(){a.dispose()}return h(T,"dispose"),{getParameters:y,getProgramCacheKey:p,getUniforms:M,acquireProgram:_,releaseProgram:A,releaseShaderCache:w,programs:c,dispose:T}}h(Xb,"WebGLPrograms");function qb(){let i=new WeakMap;function e(o){return i.has(o)}h(e,"has");function t(o){let a=i.get(o);return a===void 0&&(a={},i.set(o,a)),a}h(t,"get");function n(o){i.delete(o)}h(n,"remove");function s(o,a,l){i.get(o)[a]=l}h(s,"update");function r(){i=new WeakMap}return h(r,"dispose"),{has:e,get:t,remove:n,update:s,dispose:r}}h(qb,"WebGLProperties");function Yb(i,e){return i.groupOrder!==e.groupOrder?i.groupOrder-e.groupOrder:i.renderOrder!==e.renderOrder?i.renderOrder-e.renderOrder:i.material.id!==e.material.id?i.material.id-e.material.id:i.materialVariant!==e.materialVariant?i.materialVariant-e.materialVariant:i.z!==e.z?i.z-e.z:i.id-e.id}h(Yb,"painterSortStable");function Fm(i,e){return i.groupOrder!==e.groupOrder?i.groupOrder-e.groupOrder:i.renderOrder!==e.renderOrder?i.renderOrder-e.renderOrder:i.z!==e.z?e.z-i.z:i.id-e.id}h(Fm,"reversePainterSortStable");function Nm(){let i=[],e=0,t=[],n=[],s=[];function r(){e=0,t.length=0,n.length=0,s.length=0}h(r,"init");function o(d){let g=0;return d.isInstancedMesh&&(g+=2),d.isSkinnedMesh&&(g+=1),g}h(o,"materialVariant");function a(d,g,m,y,p,x){let S=i[e];return S===void 0?(S={id:d.id,object:d,geometry:g,material:m,materialVariant:o(d),groupOrder:y,renderOrder:d.renderOrder,z:p,group:x},i[e]=S):(S.id=d.id,S.object=d,S.geometry=g,S.material=m,S.materialVariant=o(d),S.groupOrder=y,S.renderOrder=d.renderOrder,S.z=p,S.group=x),e++,S}h(a,"getNextRenderItem");function l(d,g,m,y,p,x){let S=a(d,g,m,y,p,x);m.transmission>0?n.push(S):m.transparent===!0?s.push(S):t.push(S)}h(l,"push");function c(d,g,m,y,p,x){let S=a(d,g,m,y,p,x);m.transmission>0?n.unshift(S):m.transparent===!0?s.unshift(S):t.unshift(S)}h(c,"unshift");function u(d,g,m){t.length>1&&t.sort(d||Yb),n.length>1&&n.sort(g||Fm),s.length>1&&s.sort(g||Fm),m&&(t.reverse(),n.reverse(),s.reverse())}h(u,"sort");function f(){for(let d=e,g=i.length;d<g;d++){let m=i[d];if(m.id===null)break;m.id=null,m.object=null,m.geometry=null,m.material=null,m.group=null}}return h(f,"finish"),{opaque:t,transmissive:n,transparent:s,init:r,push:l,unshift:c,finish:f,sort:u}}h(Nm,"WebGLRenderList");function $b(){let i=new WeakMap;function e(n,s){let r=i.get(n),o;return r===void 0?(o=new Nm,i.set(n,[o])):s>=r.length?(o=new Nm,r.push(o)):o=r[s],o}h(e,"get");function t(){i=new WeakMap}return h(t,"dispose"),{get:e,dispose:t}}h($b,"WebGLRenderLists");function Kb(){let i={};return{get:h(function(e){if(i[e.id]!==void 0)return i[e.id];let t;switch(e.type){case"DirectionalLight":t={direction:new O,color:new Xe};break;case"SpotLight":t={position:new O,direction:new O,color:new Xe,distance:0,coneCos:0,penumbraCos:0,decay:0};break;case"PointLight":t={position:new O,color:new Xe,distance:0,decay:0};break;case"HemisphereLight":t={direction:new O,skyColor:new Xe,groundColor:new Xe};break;case"RectAreaLight":t={color:new Xe,position:new O,halfWidth:new O,halfHeight:new O};break}return i[e.id]=t,t},"get")}}h(Kb,"UniformsCache");function Zb(){let i={};return{get:h(function(e){if(i[e.id]!==void 0)return i[e.id];let t;switch(e.type){case"DirectionalLight":t={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new We};break;case"SpotLight":t={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new We};break;case"PointLight":t={shadowIntensity:1,shadowBias:0,shadowNormalBias:0,shadowRadius:1,shadowMapSize:new We,shadowCameraNear:1,shadowCameraFar:1e3};break}return i[e.id]=t,t},"get")}}h(Zb,"ShadowUniformsCache");var Jb=0;function jb(i,e){return(e.castShadow?2:0)-(i.castShadow?2:0)+(e.map?1:0)-(i.map?1:0)}h(jb,"shadowCastingAndTexturingLightsFirst");function Qb(i){let e=new Kb,t=Zb(),n={version:0,hash:{directionalLength:-1,pointLength:-1,spotLength:-1,rectAreaLength:-1,hemiLength:-1,numDirectionalShadows:-1,numPointShadows:-1,numSpotShadows:-1,numSpotMaps:-1,numLightProbes:-1},ambient:[0,0,0],probe:[],directional:[],directionalShadow:[],directionalShadowMap:[],directionalShadowMatrix:[],spot:[],spotLightMap:[],spotShadow:[],spotShadowMap:[],spotLightMatrix:[],rectArea:[],rectAreaLTC1:null,rectAreaLTC2:null,point:[],pointShadow:[],pointShadowMap:[],pointShadowMatrix:[],hemi:[],numSpotLightShadowsWithMaps:0,numLightProbes:0};for(let c=0;c<9;c++)n.probe.push(new O);let s=new O,r=new ct,o=new ct;function a(c){let u=0,f=0,d=0;for(let P=0;P<9;P++)n.probe[P].set(0,0,0);let g=0,m=0,y=0,p=0,x=0,S=0,M=0,_=0,A=0,w=0,T=0;c.sort(jb);for(let P=0,C=c.length;P<C;P++){let I=c[P],D=I.color,L=I.intensity,H=I.distance,F=null;if(I.shadow&&I.shadow.map&&(I.shadow.map.texture.format===Gi?F=I.shadow.map.texture:F=I.shadow.map.depthTexture||I.shadow.map.texture),I.isAmbientLight)u+=D.r*L,f+=D.g*L,d+=D.b*L;else if(I.isLightProbe){for(let Y=0;Y<9;Y++)n.probe[Y].addScaledVector(I.sh.coefficients[Y],L);T++}else if(I.isDirectionalLight){let Y=e.get(I);if(Y.color.copy(I.color).multiplyScalar(I.intensity),I.castShadow){let k=I.shadow,Z=t.get(I);Z.shadowIntensity=k.intensity,Z.shadowBias=k.bias,Z.shadowNormalBias=k.normalBias,Z.shadowRadius=k.radius,Z.shadowMapSize=k.mapSize,n.directionalShadow[g]=Z,n.directionalShadowMap[g]=F,n.directionalShadowMatrix[g]=I.shadow.matrix,S++}n.directional[g]=Y,g++}else if(I.isSpotLight){let Y=e.get(I);Y.position.setFromMatrixPosition(I.matrixWorld),Y.color.copy(D).multiplyScalar(L),Y.distance=H,Y.coneCos=Math.cos(I.angle),Y.penumbraCos=Math.cos(I.angle*(1-I.penumbra)),Y.decay=I.decay,n.spot[y]=Y;let k=I.shadow;if(I.map&&(n.spotLightMap[A]=I.map,A++,k.updateMatrices(I),I.castShadow&&w++),n.spotLightMatrix[y]=k.matrix,I.castShadow){let Z=t.get(I);Z.shadowIntensity=k.intensity,Z.shadowBias=k.bias,Z.shadowNormalBias=k.normalBias,Z.shadowRadius=k.radius,Z.shadowMapSize=k.mapSize,n.spotShadow[y]=Z,n.spotShadowMap[y]=F,_++}y++}else if(I.isRectAreaLight){let Y=e.get(I);Y.color.copy(D).multiplyScalar(L),Y.halfWidth.set(I.width*.5,0,0),Y.halfHeight.set(0,I.height*.5,0),n.rectArea[p]=Y,p++}else if(I.isPointLight){let Y=e.get(I);if(Y.color.copy(I.color).multiplyScalar(I.intensity),Y.distance=I.distance,Y.decay=I.decay,I.castShadow){let k=I.shadow,Z=t.get(I);Z.shadowIntensity=k.intensity,Z.shadowBias=k.bias,Z.shadowNormalBias=k.normalBias,Z.shadowRadius=k.radius,Z.shadowMapSize=k.mapSize,Z.shadowCameraNear=k.camera.near,Z.shadowCameraFar=k.camera.far,n.pointShadow[m]=Z,n.pointShadowMap[m]=F,n.pointShadowMatrix[m]=I.shadow.matrix,M++}n.point[m]=Y,m++}else if(I.isHemisphereLight){let Y=e.get(I);Y.skyColor.copy(I.color).multiplyScalar(L),Y.groundColor.copy(I.groundColor).multiplyScalar(L),n.hemi[x]=Y,x++}}p>0&&(i.has("OES_texture_float_linear")===!0?(n.rectAreaLTC1=ae.LTC_FLOAT_1,n.rectAreaLTC2=ae.LTC_FLOAT_2):(n.rectAreaLTC1=ae.LTC_HALF_1,n.rectAreaLTC2=ae.LTC_HALF_2)),n.ambient[0]=u,n.ambient[1]=f,n.ambient[2]=d;let v=n.hash;(v.directionalLength!==g||v.pointLength!==m||v.spotLength!==y||v.rectAreaLength!==p||v.hemiLength!==x||v.numDirectionalShadows!==S||v.numPointShadows!==M||v.numSpotShadows!==_||v.numSpotMaps!==A||v.numLightProbes!==T)&&(n.directional.length=g,n.spot.length=y,n.rectArea.length=p,n.point.length=m,n.hemi.length=x,n.directionalShadow.length=S,n.directionalShadowMap.length=S,n.pointShadow.length=M,n.pointShadowMap.length=M,n.spotShadow.length=_,n.spotShadowMap.length=_,n.directionalShadowMatrix.length=S,n.pointShadowMatrix.length=M,n.spotLightMatrix.length=_+A-w,n.spotLightMap.length=A,n.numSpotLightShadowsWithMaps=w,n.numLightProbes=T,v.directionalLength=g,v.pointLength=m,v.spotLength=y,v.rectAreaLength=p,v.hemiLength=x,v.numDirectionalShadows=S,v.numPointShadows=M,v.numSpotShadows=_,v.numSpotMaps=A,v.numLightProbes=T,n.version=Jb++)}h(a,"setup");function l(c,u){let f=0,d=0,g=0,m=0,y=0,p=u.matrixWorldInverse;for(let x=0,S=c.length;x<S;x++){let M=c[x];if(M.isDirectionalLight){let _=n.directional[f];_.direction.setFromMatrixPosition(M.matrixWorld),s.setFromMatrixPosition(M.target.matrixWorld),_.direction.sub(s),_.direction.transformDirection(p),f++}else if(M.isSpotLight){let _=n.spot[g];_.position.setFromMatrixPosition(M.matrixWorld),_.position.applyMatrix4(p),_.direction.setFromMatrixPosition(M.matrixWorld),s.setFromMatrixPosition(M.target.matrixWorld),_.direction.sub(s),_.direction.transformDirection(p),g++}else if(M.isRectAreaLight){let _=n.rectArea[m];_.position.setFromMatrixPosition(M.matrixWorld),_.position.applyMatrix4(p),o.identity(),r.copy(M.matrixWorld),r.premultiply(p),o.extractRotation(r),_.halfWidth.set(M.width*.5,0,0),_.halfHeight.set(0,M.height*.5,0),_.halfWidth.applyMatrix4(o),_.halfHeight.applyMatrix4(o),m++}else if(M.isPointLight){let _=n.point[d];_.position.setFromMatrixPosition(M.matrixWorld),_.position.applyMatrix4(p),d++}else if(M.isHemisphereLight){let _=n.hemi[y];_.direction.setFromMatrixPosition(M.matrixWorld),_.direction.transformDirection(p),y++}}}return h(l,"setupView"),{setup:a,setupView:l,state:n}}h(Qb,"WebGLLights");function Um(i){let e=new Qb(i),t=[],n=[],s=[];function r(d){f.camera=d,t.length=0,n.length=0,s.length=0}h(r,"init");function o(d){t.push(d)}h(o,"pushLight");function a(d){n.push(d)}h(a,"pushShadow");function l(d){s.push(d)}h(l,"pushLightProbeGrid");function c(){e.setup(t)}h(c,"setupLights");function u(d){e.setupView(t,d)}h(u,"setupLightsView");let f={lightsArray:t,shadowsArray:n,lightProbeGridArray:s,camera:null,lights:e,transmissionRenderTarget:{},textureUnits:0};return{init:r,state:f,setupLights:c,setupLightsView:u,pushLight:o,pushShadow:a,pushLightProbeGrid:l}}h(Um,"WebGLRenderState");function eS(i){let e=new WeakMap;function t(s,r=0){let o=e.get(s),a;return o===void 0?(a=new Um(i),e.set(s,[a])):r>=o.length?(a=new Um(i),o.push(a)):a=o[r],a}h(t,"get");function n(){e=new WeakMap}return h(n,"dispose"),{get:t,dispose:n}}h(eS,"WebGLRenderStates");var tS=`void main() {
	gl_Position = vec4( position, 1.0 );
}`,nS=`uniform sampler2D shadow_pass;
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
}`,iS=[new O(1,0,0),new O(-1,0,0),new O(0,1,0),new O(0,-1,0),new O(0,0,1),new O(0,0,-1)],sS=[new O(0,-1,0),new O(0,-1,0),new O(0,0,1),new O(0,0,-1),new O(0,-1,0),new O(0,-1,0)],Om=new ct,eo=new O,hd=new O;function rS(i,e,t){let n=new Rr,s=new We,r=new We,o=new st,a=new Ca,l=new Ia,c={},u=t.maxTextureSize,f={[hi]:nn,[nn]:hi,[cn]:cn},d=new Ht({defines:{VSM_SAMPLES:8},uniforms:{shadow_pass:{value:null},resolution:{value:new We},radius:{value:4}},vertexShader:tS,fragmentShader:nS}),g=d.clone();g.defines.HORIZONTAL_PASS=1;let m=new Lt;m.setAttribute("position",new ln(new Float32Array([-1,-1,.5,3,-1,.5,-1,3,.5]),3));let y=new Tt(m,d),p=this;this.enabled=!1,this.autoUpdate=!0,this.needsUpdate=!1,this.type=Gr;let x=this.type;this.render=function(w,T,v){if(p.enabled===!1||p.autoUpdate===!1&&p.needsUpdate===!1||w.length===0)return;this.type===Cp&&(Ce("WebGLShadowMap: PCFSoftShadowMap has been deprecated. Using PCFShadowMap instead."),this.type=Gr);let P=i.getRenderTarget(),C=i.getActiveCubeFace(),I=i.getActiveMipmapLevel(),D=i.state;D.setBlending(Kn),D.buffers.depth.getReversed()===!0?D.buffers.color.setClear(0,0,0,0):D.buffers.color.setClear(1,1,1,1),D.buffers.depth.setTest(!0),D.setScissorTest(!1);let L=x!==this.type;L&&T.traverse(function(H){H.material&&(Array.isArray(H.material)?H.material.forEach(F=>F.needsUpdate=!0):H.material.needsUpdate=!0)});for(let H=0,F=w.length;H<F;H++){let Y=w[H],k=Y.shadow;if(k===void 0){Ce("WebGLShadowMap:",Y,"has no shadow.");continue}if(k.autoUpdate===!1&&k.needsUpdate===!1)continue;s.copy(k.mapSize);let Z=k.getFrameExtents();s.multiply(Z),r.copy(k.mapSize),(s.x>u||s.y>u)&&(s.x>u&&(r.x=Math.floor(u/Z.x),s.x=r.x*Z.x,k.mapSize.x=r.x),s.y>u&&(r.y=Math.floor(u/Z.y),s.y=r.y*Z.y,k.mapSize.y=r.y));let ee=i.state.buffers.depth.getReversed();if(k.camera._reversedDepth=ee,k.map===null||L===!0){if(k.map!==null&&(k.map.depthTexture!==null&&(k.map.depthTexture.dispose(),k.map.depthTexture=null),k.map.dispose()),this.type===qs){if(Y.isPointLight){Ce("WebGLShadowMap: VSM shadow maps are not supported for PointLights. Use PCF or BasicShadowMap instead.");continue}k.map=new pn(s.x,s.y,{format:Gi,type:Zn,minFilter:Vt,magFilter:Vt,generateMipmaps:!1}),k.map.texture.name=Y.name+".shadowMap",k.map.depthTexture=new ui(s.x,s.y,Nn),k.map.depthTexture.name=Y.name+".shadowMapDepth",k.map.depthTexture.format=qn,k.map.depthTexture.compareFunction=null,k.map.depthTexture.minFilter=zt,k.map.depthTexture.magFilter=zt}else Y.isPointLight?(k.map=new $l(s.x),k.map.depthTexture=new Pa(s.x,Fn)):(k.map=new pn(s.x,s.y),k.map.depthTexture=new ui(s.x,s.y,Fn)),k.map.depthTexture.name=Y.name+".shadowMap",k.map.depthTexture.format=qn,this.type===Gr?(k.map.depthTexture.compareFunction=ee?Wl:Gl,k.map.depthTexture.minFilter=Vt,k.map.depthTexture.magFilter=Vt):(k.map.depthTexture.compareFunction=null,k.map.depthTexture.minFilter=zt,k.map.depthTexture.magFilter=zt);k.camera.updateProjectionMatrix()}let re=k.map.isWebGLCubeRenderTarget?6:1;for(let le=0;le<re;le++){if(k.map.isWebGLCubeRenderTarget)i.setRenderTarget(k.map,le),i.clear();else{le===0&&(i.setRenderTarget(k.map),i.clear());let _e=k.getViewport(le);o.set(r.x*_e.x,r.y*_e.y,r.x*_e.z,r.y*_e.w),D.viewport(o)}if(Y.isPointLight){let _e=k.camera,$e=k.matrix,tt=Y.distance||_e.far;tt!==_e.far&&(_e.far=tt,_e.updateProjectionMatrix()),eo.setFromMatrixPosition(Y.matrixWorld),_e.position.copy(eo),hd.copy(_e.position),hd.add(iS[le]),_e.up.copy(sS[le]),_e.lookAt(hd),_e.updateMatrixWorld(),$e.makeTranslation(-eo.x,-eo.y,-eo.z),Om.multiplyMatrices(_e.projectionMatrix,_e.matrixWorldInverse),k._frustum.setFromProjectionMatrix(Om,_e.coordinateSystem,_e.reversedDepth)}else k.updateMatrices(Y);n=k.getFrustum(),_(T,v,k.camera,Y,this.type)}k.isPointLightShadow!==!0&&this.type===qs&&S(k,v),k.needsUpdate=!1}x=this.type,p.needsUpdate=!1,i.setRenderTarget(P,C,I)};function S(w,T){let v=e.update(y);d.defines.VSM_SAMPLES!==w.blurSamples&&(d.defines.VSM_SAMPLES=w.blurSamples,g.defines.VSM_SAMPLES=w.blurSamples,d.needsUpdate=!0,g.needsUpdate=!0),w.mapPass===null&&(w.mapPass=new pn(s.x,s.y,{format:Gi,type:Zn})),d.uniforms.shadow_pass.value=w.map.depthTexture,d.uniforms.resolution.value=w.mapSize,d.uniforms.radius.value=w.radius,i.setRenderTarget(w.mapPass),i.clear(),i.renderBufferDirect(T,null,v,d,y,null),g.uniforms.shadow_pass.value=w.mapPass.texture,g.uniforms.resolution.value=w.mapSize,g.uniforms.radius.value=w.radius,i.setRenderTarget(w.map),i.clear(),i.renderBufferDirect(T,null,v,g,y,null)}h(S,"VSMPass");function M(w,T,v,P){let C=null,I=v.isPointLight===!0?w.customDistanceMaterial:w.customDepthMaterial;if(I!==void 0)C=I;else if(C=v.isPointLight===!0?l:a,i.localClippingEnabled&&T.clipShadows===!0&&Array.isArray(T.clippingPlanes)&&T.clippingPlanes.length!==0||T.displacementMap&&T.displacementScale!==0||T.alphaMap&&T.alphaTest>0||T.map&&T.alphaTest>0||T.alphaToCoverage===!0){let D=C.uuid,L=T.uuid,H=c[D];H===void 0&&(H={},c[D]=H);let F=H[L];F===void 0&&(F=C.clone(),H[L]=F,T.addEventListener("dispose",A)),C=F}if(C.visible=T.visible,C.wireframe=T.wireframe,P===qs?C.side=T.shadowSide!==null?T.shadowSide:T.side:C.side=T.shadowSide!==null?T.shadowSide:f[T.side],C.alphaMap=T.alphaMap,C.alphaTest=T.alphaToCoverage===!0?.5:T.alphaTest,C.map=T.map,C.clipShadows=T.clipShadows,C.clippingPlanes=T.clippingPlanes,C.clipIntersection=T.clipIntersection,C.displacementMap=T.displacementMap,C.displacementScale=T.displacementScale,C.displacementBias=T.displacementBias,C.wireframeLinewidth=T.wireframeLinewidth,C.linewidth=T.linewidth,v.isPointLight===!0&&C.isMeshDistanceMaterial===!0){let D=i.properties.get(C);D.light=v}return C}h(M,"getDepthMaterial");function _(w,T,v,P,C){if(w.visible===!1)return;if(w.layers.test(T.layers)&&(w.isMesh||w.isLine||w.isPoints)&&(w.castShadow||w.receiveShadow&&C===qs)&&(!w.frustumCulled||n.intersectsObject(w))){w.modelViewMatrix.multiplyMatrices(v.matrixWorldInverse,w.matrixWorld);let L=e.update(w),H=w.material;if(Array.isArray(H)){let F=L.groups;for(let Y=0,k=F.length;Y<k;Y++){let Z=F[Y],ee=H[Z.materialIndex];if(ee&&ee.visible){let re=M(w,ee,P,C);w.onBeforeShadow(i,w,T,v,L,re,Z),i.renderBufferDirect(v,null,L,re,w,Z),w.onAfterShadow(i,w,T,v,L,re,Z)}}}else if(H.visible){let F=M(w,H,P,C);w.onBeforeShadow(i,w,T,v,L,F,null),i.renderBufferDirect(v,null,L,F,w,null),w.onAfterShadow(i,w,T,v,L,F,null)}}let D=w.children;for(let L=0,H=D.length;L<H;L++)_(D[L],T,v,P,C)}h(_,"renderObject");function A(w){w.target.removeEventListener("dispose",A);for(let v in c){let P=c[v],C=w.target.uuid;C in P&&(P[C].dispose(),delete P[C])}}h(A,"onMaterialDispose")}h(rS,"WebGLShadowMap");function oS(i,e){function t(){let N=!1,ce=new st,j=null,fe=new st(0,0,0,0);return{setMask:h(function(xe){j!==xe&&!N&&(i.colorMask(xe,xe,xe,xe),j=xe)},"setMask"),setLocked:h(function(xe){N=xe},"setLocked"),setClear:h(function(xe,te,we,be,yt){yt===!0&&(xe*=be,te*=be,we*=be),ce.set(xe,te,we,be),fe.equals(ce)===!1&&(i.clearColor(xe,te,we,be),fe.copy(ce))},"setClear"),reset:h(function(){N=!1,j=null,fe.set(-1,0,0,0)},"reset")}}h(t,"ColorBuffer");function n(){let N=!1,ce=!1,j=null,fe=null,xe=null;return{setReversed:h(function(te){if(ce!==te){let we=e.get("EXT_clip_control");te?we.clipControlEXT(we.LOWER_LEFT_EXT,we.ZERO_TO_ONE_EXT):we.clipControlEXT(we.LOWER_LEFT_EXT,we.NEGATIVE_ONE_TO_ONE_EXT),ce=te;let be=xe;xe=null,this.setClear(be)}},"setReversed"),getReversed:h(function(){return ce},"getReversed"),setTest:h(function(te){te?ie(i.DEPTH_TEST):Fe(i.DEPTH_TEST)},"setTest"),setMask:h(function(te){j!==te&&!N&&(i.depthMask(te),j=te)},"setMask"),setFunc:h(function(te){if(ce&&(te=cm[te]),fe!==te){switch(te){case ha:i.depthFunc(i.NEVER);break;case ua:i.depthFunc(i.ALWAYS);break;case da:i.depthFunc(i.LESS);break;case is:i.depthFunc(i.LEQUAL);break;case fa:i.depthFunc(i.EQUAL);break;case pa:i.depthFunc(i.GEQUAL);break;case ma:i.depthFunc(i.GREATER);break;case ga:i.depthFunc(i.NOTEQUAL);break;default:i.depthFunc(i.LEQUAL)}fe=te}},"setFunc"),setLocked:h(function(te){N=te},"setLocked"),setClear:h(function(te){xe!==te&&(xe=te,ce&&(te=1-te),i.clearDepth(te))},"setClear"),reset:h(function(){N=!1,j=null,fe=null,xe=null,ce=!1},"reset")}}h(n,"DepthBuffer");function s(){let N=!1,ce=null,j=null,fe=null,xe=null,te=null,we=null,be=null,yt=null;return{setTest:h(function(ut){N||(ut?ie(i.STENCIL_TEST):Fe(i.STENCIL_TEST))},"setTest"),setMask:h(function(ut){ce!==ut&&!N&&(i.stencilMask(ut),ce=ut)},"setMask"),setFunc:h(function(ut,On,Bn){(j!==ut||fe!==On||xe!==Bn)&&(i.stencilFunc(ut,On,Bn),j=ut,fe=On,xe=Bn)},"setFunc"),setOp:h(function(ut,On,Bn){(te!==ut||we!==On||be!==Bn)&&(i.stencilOp(ut,On,Bn),te=ut,we=On,be=Bn)},"setOp"),setLocked:h(function(ut){N=ut},"setLocked"),setClear:h(function(ut){yt!==ut&&(i.clearStencil(ut),yt=ut)},"setClear"),reset:h(function(){N=!1,ce=null,j=null,fe=null,xe=null,te=null,we=null,be=null,yt=null},"reset")}}h(s,"StencilBuffer");let r=new t,o=new n,a=new s,l=new WeakMap,c=new WeakMap,u={},f={},d={},g=new WeakMap,m=[],y=null,p=!1,x=null,S=null,M=null,_=null,A=null,w=null,T=null,v=new Xe(0,0,0),P=0,C=!1,I=null,D=null,L=null,H=null,F=null,Y=i.getParameter(i.MAX_COMBINED_TEXTURE_IMAGE_UNITS),k=!1,Z=0,ee=i.getParameter(i.VERSION);ee.indexOf("WebGL")!==-1?(Z=parseFloat(/^WebGL (\d)/.exec(ee)[1]),k=Z>=1):ee.indexOf("OpenGL ES")!==-1&&(Z=parseFloat(/^OpenGL ES (\d)/.exec(ee)[1]),k=Z>=2);let re=null,le={},_e=i.getParameter(i.SCISSOR_BOX),$e=i.getParameter(i.VIEWPORT),tt=new st().fromArray(_e),Ke=new st().fromArray($e);function J(N,ce,j,fe){let xe=new Uint8Array(4),te=i.createTexture();i.bindTexture(N,te),i.texParameteri(N,i.TEXTURE_MIN_FILTER,i.NEAREST),i.texParameteri(N,i.TEXTURE_MAG_FILTER,i.NEAREST);for(let we=0;we<j;we++)N===i.TEXTURE_3D||N===i.TEXTURE_2D_ARRAY?i.texImage3D(ce,0,i.RGBA,1,1,fe,0,i.RGBA,i.UNSIGNED_BYTE,xe):i.texImage2D(ce+we,0,i.RGBA,1,1,0,i.RGBA,i.UNSIGNED_BYTE,xe);return te}h(J,"createTexture");let oe={};oe[i.TEXTURE_2D]=J(i.TEXTURE_2D,i.TEXTURE_2D,1),oe[i.TEXTURE_CUBE_MAP]=J(i.TEXTURE_CUBE_MAP,i.TEXTURE_CUBE_MAP_POSITIVE_X,6),oe[i.TEXTURE_2D_ARRAY]=J(i.TEXTURE_2D_ARRAY,i.TEXTURE_2D_ARRAY,1,1),oe[i.TEXTURE_3D]=J(i.TEXTURE_3D,i.TEXTURE_3D,1,1),r.setClear(0,0,0,1),o.setClear(1),a.setClear(0),ie(i.DEPTH_TEST),o.setFunc(is),At(!1),Ct(bh),ie(i.CULL_FACE),Qe(Kn);function ie(N){u[N]!==!0&&(i.enable(N),u[N]=!0)}h(ie,"enable");function Fe(N){u[N]!==!1&&(i.disable(N),u[N]=!1)}h(Fe,"disable");function Be(N,ce){return d[N]!==ce?(i.bindFramebuffer(N,ce),d[N]=ce,N===i.DRAW_FRAMEBUFFER&&(d[i.FRAMEBUFFER]=ce),N===i.FRAMEBUFFER&&(d[i.DRAW_FRAMEBUFFER]=ce),!0):!1}h(Be,"bindFramebuffer");function Le(N,ce){let j=m,fe=!1;if(N){j=g.get(ce),j===void 0&&(j=[],g.set(ce,j));let xe=N.textures;if(j.length!==xe.length||j[0]!==i.COLOR_ATTACHMENT0){for(let te=0,we=xe.length;te<we;te++)j[te]=i.COLOR_ATTACHMENT0+te;j.length=xe.length,fe=!0}}else j[0]!==i.BACK&&(j[0]=i.BACK,fe=!0);fe&&i.drawBuffers(j)}h(Le,"drawBuffers");function St(N){return y!==N?(i.useProgram(N),y=N,!0):!1}h(St,"useProgram");let qe={[Li]:i.FUNC_ADD,[Lp]:i.FUNC_SUBTRACT,[Dp]:i.FUNC_REVERSE_SUBTRACT};qe[Fp]=i.MIN,qe[Np]=i.MAX;let ot={[Up]:i.ZERO,[Op]:i.ONE,[Bp]:i.SRC_COLOR,[la]:i.SRC_ALPHA,[Wp]:i.SRC_ALPHA_SATURATE,[Hp]:i.DST_COLOR,[kp]:i.DST_ALPHA,[zp]:i.ONE_MINUS_SRC_COLOR,[ca]:i.ONE_MINUS_SRC_ALPHA,[Gp]:i.ONE_MINUS_DST_COLOR,[Vp]:i.ONE_MINUS_DST_ALPHA,[Xp]:i.CONSTANT_COLOR,[qp]:i.ONE_MINUS_CONSTANT_COLOR,[Yp]:i.CONSTANT_ALPHA,[$p]:i.ONE_MINUS_CONSTANT_ALPHA};function Qe(N,ce,j,fe,xe,te,we,be,yt,ut){if(N===Kn){p===!0&&(Fe(i.BLEND),p=!1);return}if(p===!1&&(ie(i.BLEND),p=!0),N!==Ip){if(N!==x||ut!==C){if((S!==Li||A!==Li)&&(i.blendEquation(i.FUNC_ADD),S=Li,A=Li),ut)switch(N){case ns:i.blendFuncSeparate(i.ONE,i.ONE_MINUS_SRC_ALPHA,i.ONE,i.ONE_MINUS_SRC_ALPHA);break;case Sh:i.blendFunc(i.ONE,i.ONE);break;case Mh:i.blendFuncSeparate(i.ZERO,i.ONE_MINUS_SRC_COLOR,i.ZERO,i.ONE);break;case wh:i.blendFuncSeparate(i.DST_COLOR,i.ONE_MINUS_SRC_ALPHA,i.ZERO,i.ONE);break;default:Ne("WebGLState: Invalid blending: ",N);break}else switch(N){case ns:i.blendFuncSeparate(i.SRC_ALPHA,i.ONE_MINUS_SRC_ALPHA,i.ONE,i.ONE_MINUS_SRC_ALPHA);break;case Sh:i.blendFuncSeparate(i.SRC_ALPHA,i.ONE,i.ONE,i.ONE);break;case Mh:Ne("WebGLState: SubtractiveBlending requires material.premultipliedAlpha = true");break;case wh:Ne("WebGLState: MultiplyBlending requires material.premultipliedAlpha = true");break;default:Ne("WebGLState: Invalid blending: ",N);break}M=null,_=null,w=null,T=null,v.set(0,0,0),P=0,x=N,C=ut}return}xe=xe||ce,te=te||j,we=we||fe,(ce!==S||xe!==A)&&(i.blendEquationSeparate(qe[ce],qe[xe]),S=ce,A=xe),(j!==M||fe!==_||te!==w||we!==T)&&(i.blendFuncSeparate(ot[j],ot[fe],ot[te],ot[we]),M=j,_=fe,w=te,T=we),(be.equals(v)===!1||yt!==P)&&(i.blendColor(be.r,be.g,be.b,yt),v.copy(be),P=yt),x=N,C=!1}h(Qe,"setBlending");function Ze(N,ce){N.side===cn?Fe(i.CULL_FACE):ie(i.CULL_FACE);let j=N.side===nn;ce&&(j=!j),At(j),N.blending===ns&&N.transparent===!1?Qe(Kn):Qe(N.blending,N.blendEquation,N.blendSrc,N.blendDst,N.blendEquationAlpha,N.blendSrcAlpha,N.blendDstAlpha,N.blendColor,N.blendAlpha,N.premultipliedAlpha),o.setFunc(N.depthFunc),o.setTest(N.depthTest),o.setMask(N.depthWrite),r.setMask(N.colorWrite);let fe=N.stencilWrite;a.setTest(fe),fe&&(a.setMask(N.stencilWriteMask),a.setFunc(N.stencilFunc,N.stencilRef,N.stencilFuncMask),a.setOp(N.stencilFail,N.stencilZFail,N.stencilZPass)),kt(N.polygonOffset,N.polygonOffsetFactor,N.polygonOffsetUnits),N.alphaToCoverage===!0?ie(i.SAMPLE_ALPHA_TO_COVERAGE):Fe(i.SAMPLE_ALPHA_TO_COVERAGE)}h(Ze,"setMaterial");function At(N){I!==N&&(N?i.frontFace(i.CW):i.frontFace(i.CCW),I=N)}h(At,"setFlipSided");function Ct(N){N!==Pp?(ie(i.CULL_FACE),N!==D&&(N===bh?i.cullFace(i.BACK):N===Rp?i.cullFace(i.FRONT):i.cullFace(i.FRONT_AND_BACK))):Fe(i.CULL_FACE),D=N}h(Ct,"setCullFace");function Ut(N){N!==L&&(k&&i.lineWidth(N),L=N)}h(Ut,"setLineWidth");function kt(N,ce,j){N?(ie(i.POLYGON_OFFSET_FILL),(H!==ce||F!==j)&&(H=ce,F=j,o.getReversed()&&(ce=-ce),i.polygonOffset(ce,j))):Fe(i.POLYGON_OFFSET_FILL)}h(kt,"setPolygonOffset");function xt(N){N?ie(i.SCISSOR_TEST):Fe(i.SCISSOR_TEST)}h(xt,"setScissorTest");function Pt(N){N===void 0&&(N=i.TEXTURE0+Y-1),re!==N&&(i.activeTexture(N),re=N)}h(Pt,"activeTexture");function B(N,ce,j){j===void 0&&(re===null?j=i.TEXTURE0+Y-1:j=re);let fe=le[j];fe===void 0&&(fe={type:void 0,texture:void 0},le[j]=fe),(fe.type!==N||fe.texture!==ce)&&(re!==j&&(i.activeTexture(j),re=j),i.bindTexture(N,ce||oe[N]),fe.type=N,fe.texture=ce)}h(B,"bindTexture");function on(){let N=le[re];N!==void 0&&N.type!==void 0&&(i.bindTexture(N.type,null),N.type=void 0,N.texture=void 0)}h(on,"unbindTexture");function nt(){try{i.compressedTexImage2D(...arguments)}catch(N){Ne("WebGLState:",N)}}h(nt,"compressedTexImage2D");function R(){try{i.compressedTexImage3D(...arguments)}catch(N){Ne("WebGLState:",N)}}h(R,"compressedTexImage3D");function b(){try{i.texSubImage2D(...arguments)}catch(N){Ne("WebGLState:",N)}}h(b,"texSubImage2D");function V(){try{i.texSubImage3D(...arguments)}catch(N){Ne("WebGLState:",N)}}h(V,"texSubImage3D");function X(){try{i.compressedTexSubImage2D(...arguments)}catch(N){Ne("WebGLState:",N)}}h(X,"compressedTexSubImage2D");function $(){try{i.compressedTexSubImage3D(...arguments)}catch(N){Ne("WebGLState:",N)}}h($,"compressedTexSubImage3D");function se(){try{i.texStorage2D(...arguments)}catch(N){Ne("WebGLState:",N)}}h(se,"texStorage2D");function he(){try{i.texStorage3D(...arguments)}catch(N){Ne("WebGLState:",N)}}h(he,"texStorage3D");function K(){try{i.texImage2D(...arguments)}catch(N){Ne("WebGLState:",N)}}h(K,"texImage2D");function Q(){try{i.texImage3D(...arguments)}catch(N){Ne("WebGLState:",N)}}h(Q,"texImage3D");function ue(N){return f[N]!==void 0?f[N]:i.getParameter(N)}h(ue,"getParameter");function Ee(N,ce){f[N]!==ce&&(i.pixelStorei(N,ce),f[N]=ce)}h(Ee,"pixelStorei");function pe(N){tt.equals(N)===!1&&(i.scissor(N.x,N.y,N.z,N.w),tt.copy(N))}h(pe,"scissor");function de(N){Ke.equals(N)===!1&&(i.viewport(N.x,N.y,N.z,N.w),Ke.copy(N))}h(de,"viewport");function Pe(N,ce){let j=c.get(ce);j===void 0&&(j=new WeakMap,c.set(ce,j));let fe=j.get(N);fe===void 0&&(fe=i.getUniformBlockIndex(ce,N.name),j.set(N,fe))}h(Pe,"updateUBOMapping");function De(N,ce){let fe=c.get(ce).get(N);l.get(ce)!==fe&&(i.uniformBlockBinding(ce,fe,N.__bindingPointIndex),l.set(ce,fe))}h(De,"uniformBlockBinding");function ze(){i.disable(i.BLEND),i.disable(i.CULL_FACE),i.disable(i.DEPTH_TEST),i.disable(i.POLYGON_OFFSET_FILL),i.disable(i.SCISSOR_TEST),i.disable(i.STENCIL_TEST),i.disable(i.SAMPLE_ALPHA_TO_COVERAGE),i.blendEquation(i.FUNC_ADD),i.blendFunc(i.ONE,i.ZERO),i.blendFuncSeparate(i.ONE,i.ZERO,i.ONE,i.ZERO),i.blendColor(0,0,0,0),i.colorMask(!0,!0,!0,!0),i.clearColor(0,0,0,0),i.depthMask(!0),i.depthFunc(i.LESS),o.setReversed(!1),i.clearDepth(1),i.stencilMask(4294967295),i.stencilFunc(i.ALWAYS,0,4294967295),i.stencilOp(i.KEEP,i.KEEP,i.KEEP),i.clearStencil(0),i.cullFace(i.BACK),i.frontFace(i.CCW),i.polygonOffset(0,0),i.activeTexture(i.TEXTURE0),i.bindFramebuffer(i.FRAMEBUFFER,null),i.bindFramebuffer(i.DRAW_FRAMEBUFFER,null),i.bindFramebuffer(i.READ_FRAMEBUFFER,null),i.useProgram(null),i.lineWidth(1),i.scissor(0,0,i.canvas.width,i.canvas.height),i.viewport(0,0,i.canvas.width,i.canvas.height),i.pixelStorei(i.PACK_ALIGNMENT,4),i.pixelStorei(i.UNPACK_ALIGNMENT,4),i.pixelStorei(i.UNPACK_FLIP_Y_WEBGL,!1),i.pixelStorei(i.UNPACK_PREMULTIPLY_ALPHA_WEBGL,!1),i.pixelStorei(i.UNPACK_COLORSPACE_CONVERSION_WEBGL,i.BROWSER_DEFAULT_WEBGL),i.pixelStorei(i.PACK_ROW_LENGTH,0),i.pixelStorei(i.PACK_SKIP_PIXELS,0),i.pixelStorei(i.PACK_SKIP_ROWS,0),i.pixelStorei(i.UNPACK_ROW_LENGTH,0),i.pixelStorei(i.UNPACK_IMAGE_HEIGHT,0),i.pixelStorei(i.UNPACK_SKIP_PIXELS,0),i.pixelStorei(i.UNPACK_SKIP_ROWS,0),i.pixelStorei(i.UNPACK_SKIP_IMAGES,0),u={},f={},re=null,le={},d={},g=new WeakMap,m=[],y=null,p=!1,x=null,S=null,M=null,_=null,A=null,w=null,T=null,v=new Xe(0,0,0),P=0,C=!1,I=null,D=null,L=null,H=null,F=null,tt.set(0,0,i.canvas.width,i.canvas.height),Ke.set(0,0,i.canvas.width,i.canvas.height),r.reset(),o.reset(),a.reset()}return h(ze,"reset"),{buffers:{color:r,depth:o,stencil:a},enable:ie,disable:Fe,bindFramebuffer:Be,drawBuffers:Le,useProgram:St,setBlending:Qe,setMaterial:Ze,setFlipSided:At,setCullFace:Ct,setLineWidth:Ut,setPolygonOffset:kt,setScissorTest:xt,activeTexture:Pt,bindTexture:B,unbindTexture:on,compressedTexImage2D:nt,compressedTexImage3D:R,texImage2D:K,texImage3D:Q,pixelStorei:Ee,getParameter:ue,updateUBOMapping:Pe,uniformBlockBinding:De,texStorage2D:se,texStorage3D:he,texSubImage2D:b,texSubImage3D:V,compressedTexSubImage2D:X,compressedTexSubImage3D:$,scissor:pe,viewport:de,reset:ze}}h(oS,"WebGLState");function aS(i,e,t,n,s,r,o){let a=e.has("WEBGL_multisampled_render_to_texture")?e.get("WEBGL_multisampled_render_to_texture"):null,l=typeof navigator>"u"?!1:/OculusBrowser/g.test(navigator.userAgent),c=new We,u=new WeakMap,f=new Set,d,g=new WeakMap,m=!1;try{m=typeof OffscreenCanvas<"u"&&new OffscreenCanvas(1,1).getContext("2d")!==null}catch{}function y(R,b){return m?new OffscreenCanvas(R,b):br("canvas")}h(y,"createCanvas");function p(R,b,V){let X=1,$=nt(R);if(($.width>V||$.height>V)&&(X=V/Math.max($.width,$.height)),X<1)if(typeof HTMLImageElement<"u"&&R instanceof HTMLImageElement||typeof HTMLCanvasElement<"u"&&R instanceof HTMLCanvasElement||typeof ImageBitmap<"u"&&R instanceof ImageBitmap||typeof VideoFrame<"u"&&R instanceof VideoFrame){let se=Math.floor(X*$.width),he=Math.floor(X*$.height);d===void 0&&(d=y(se,he));let K=b?y(se,he):d;return K.width=se,K.height=he,K.getContext("2d").drawImage(R,0,0,se,he),Ce("WebGLRenderer: Texture has been resized from ("+$.width+"x"+$.height+") to ("+se+"x"+he+")."),K}else return"data"in R&&Ce("WebGLRenderer: Image in DataTexture is too big ("+$.width+"x"+$.height+")."),R;return R}h(p,"resizeImage");function x(R){return R.generateMipmaps}h(x,"textureNeedsGenerateMipmaps");function S(R){i.generateMipmap(R)}h(S,"generateMipmap");function M(R){return R.isWebGLCubeRenderTarget?i.TEXTURE_CUBE_MAP:R.isWebGL3DRenderTarget?i.TEXTURE_3D:R.isWebGLArrayRenderTarget||R.isCompressedArrayTexture?i.TEXTURE_2D_ARRAY:i.TEXTURE_2D}h(M,"getTargetType");function _(R,b,V,X,$,se=!1){if(R!==null){if(i[R]!==void 0)return i[R];Ce("WebGLRenderer: Attempt to use non-existing WebGL internal format '"+R+"'")}let he;X&&(he=e.get("EXT_texture_norm16"),he||Ce("WebGLRenderer: Unable to use normalized textures without EXT_texture_norm16 extension"));let K=b;if(b===i.RED&&(V===i.FLOAT&&(K=i.R32F),V===i.HALF_FLOAT&&(K=i.R16F),V===i.UNSIGNED_BYTE&&(K=i.R8),V===i.UNSIGNED_SHORT&&he&&(K=he.R16_EXT),V===i.SHORT&&he&&(K=he.R16_SNORM_EXT)),b===i.RED_INTEGER&&(V===i.UNSIGNED_BYTE&&(K=i.R8UI),V===i.UNSIGNED_SHORT&&(K=i.R16UI),V===i.UNSIGNED_INT&&(K=i.R32UI),V===i.BYTE&&(K=i.R8I),V===i.SHORT&&(K=i.R16I),V===i.INT&&(K=i.R32I)),b===i.RG&&(V===i.FLOAT&&(K=i.RG32F),V===i.HALF_FLOAT&&(K=i.RG16F),V===i.UNSIGNED_BYTE&&(K=i.RG8),V===i.UNSIGNED_SHORT&&he&&(K=he.RG16_EXT),V===i.SHORT&&he&&(K=he.RG16_SNORM_EXT)),b===i.RG_INTEGER&&(V===i.UNSIGNED_BYTE&&(K=i.RG8UI),V===i.UNSIGNED_SHORT&&(K=i.RG16UI),V===i.UNSIGNED_INT&&(K=i.RG32UI),V===i.BYTE&&(K=i.RG8I),V===i.SHORT&&(K=i.RG16I),V===i.INT&&(K=i.RG32I)),b===i.RGB_INTEGER&&(V===i.UNSIGNED_BYTE&&(K=i.RGB8UI),V===i.UNSIGNED_SHORT&&(K=i.RGB16UI),V===i.UNSIGNED_INT&&(K=i.RGB32UI),V===i.BYTE&&(K=i.RGB8I),V===i.SHORT&&(K=i.RGB16I),V===i.INT&&(K=i.RGB32I)),b===i.RGBA_INTEGER&&(V===i.UNSIGNED_BYTE&&(K=i.RGBA8UI),V===i.UNSIGNED_SHORT&&(K=i.RGBA16UI),V===i.UNSIGNED_INT&&(K=i.RGBA32UI),V===i.BYTE&&(K=i.RGBA8I),V===i.SHORT&&(K=i.RGBA16I),V===i.INT&&(K=i.RGBA32I)),b===i.RGB&&(V===i.UNSIGNED_SHORT&&he&&(K=he.RGB16_EXT),V===i.SHORT&&he&&(K=he.RGB16_SNORM_EXT),V===i.UNSIGNED_INT_5_9_9_9_REV&&(K=i.RGB9_E5),V===i.UNSIGNED_INT_10F_11F_11F_REV&&(K=i.R11F_G11F_B10F)),b===i.RGBA){let Q=se?vr:Ye.getTransfer($);V===i.FLOAT&&(K=i.RGBA32F),V===i.HALF_FLOAT&&(K=i.RGBA16F),V===i.UNSIGNED_BYTE&&(K=Q===et?i.SRGB8_ALPHA8:i.RGBA8),V===i.UNSIGNED_SHORT&&he&&(K=he.RGBA16_EXT),V===i.SHORT&&he&&(K=he.RGBA16_SNORM_EXT),V===i.UNSIGNED_SHORT_4_4_4_4&&(K=i.RGBA4),V===i.UNSIGNED_SHORT_5_5_5_1&&(K=i.RGB5_A1)}return(K===i.R16F||K===i.R32F||K===i.RG16F||K===i.RG32F||K===i.RGBA16F||K===i.RGBA32F)&&e.get("EXT_color_buffer_float"),K}h(_,"getInternalFormat");function A(R,b){let V;return R?b===null||b===Fn||b===$s?V=i.DEPTH24_STENCIL8:b===Nn?V=i.DEPTH32F_STENCIL8:b===Ys&&(V=i.DEPTH24_STENCIL8,Ce("DepthTexture: 16 bit depth attachment is not supported with stencil. Using 24-bit attachment.")):b===null||b===Fn||b===$s?V=i.DEPTH_COMPONENT24:b===Nn?V=i.DEPTH_COMPONENT32F:b===Ys&&(V=i.DEPTH_COMPONENT16),V}h(A,"getInternalDepthFormat");function w(R,b){return x(R)===!0||R.isFramebufferTexture&&R.minFilter!==zt&&R.minFilter!==Vt?Math.log2(Math.max(b.width,b.height))+1:R.mipmaps!==void 0&&R.mipmaps.length>0?R.mipmaps.length:R.isCompressedTexture&&Array.isArray(R.image)?b.mipmaps.length:1}h(w,"getMipLevels");function T(R){let b=R.target;b.removeEventListener("dispose",T),P(b),b.isVideoTexture&&u.delete(b),b.isHTMLTexture&&f.delete(b)}h(T,"onTextureDispose");function v(R){let b=R.target;b.removeEventListener("dispose",v),I(b)}h(v,"onRenderTargetDispose");function P(R){let b=n.get(R);if(b.__webglInit===void 0)return;let V=R.source,X=g.get(V);if(X){let $=X[b.__cacheKey];$.usedTimes--,$.usedTimes===0&&C(R),Object.keys(X).length===0&&g.delete(V)}n.remove(R)}h(P,"deallocateTexture");function C(R){let b=n.get(R);i.deleteTexture(b.__webglTexture);let V=R.source,X=g.get(V);delete X[b.__cacheKey],o.memory.textures--}h(C,"deleteTexture");function I(R){let b=n.get(R);if(R.depthTexture&&(R.depthTexture.dispose(),n.remove(R.depthTexture)),R.isWebGLCubeRenderTarget)for(let X=0;X<6;X++){if(Array.isArray(b.__webglFramebuffer[X]))for(let $=0;$<b.__webglFramebuffer[X].length;$++)i.deleteFramebuffer(b.__webglFramebuffer[X][$]);else i.deleteFramebuffer(b.__webglFramebuffer[X]);b.__webglDepthbuffer&&i.deleteRenderbuffer(b.__webglDepthbuffer[X])}else{if(Array.isArray(b.__webglFramebuffer))for(let X=0;X<b.__webglFramebuffer.length;X++)i.deleteFramebuffer(b.__webglFramebuffer[X]);else i.deleteFramebuffer(b.__webglFramebuffer);if(b.__webglDepthbuffer&&i.deleteRenderbuffer(b.__webglDepthbuffer),b.__webglMultisampledFramebuffer&&i.deleteFramebuffer(b.__webglMultisampledFramebuffer),b.__webglColorRenderbuffer)for(let X=0;X<b.__webglColorRenderbuffer.length;X++)b.__webglColorRenderbuffer[X]&&i.deleteRenderbuffer(b.__webglColorRenderbuffer[X]);b.__webglDepthRenderbuffer&&i.deleteRenderbuffer(b.__webglDepthRenderbuffer)}let V=R.textures;for(let X=0,$=V.length;X<$;X++){let se=n.get(V[X]);se.__webglTexture&&(i.deleteTexture(se.__webglTexture),o.memory.textures--),n.remove(V[X])}n.remove(R)}h(I,"deallocateRenderTarget");let D=0;function L(){D=0}h(L,"resetTextureUnits");function H(){return D}h(H,"getTextureUnits");function F(R){D=R}h(F,"setTextureUnits");function Y(){let R=D;return R>=s.maxTextures&&Ce("WebGLTextures: Trying to use "+R+" texture units while this GPU supports only "+s.maxTextures),D+=1,R}h(Y,"allocateTextureUnit");function k(R){let b=[];return b.push(R.wrapS),b.push(R.wrapT),b.push(R.wrapR||0),b.push(R.magFilter),b.push(R.minFilter),b.push(R.anisotropy),b.push(R.internalFormat),b.push(R.format),b.push(R.type),b.push(R.generateMipmaps),b.push(R.premultiplyAlpha),b.push(R.flipY),b.push(R.unpackAlignment),b.push(R.colorSpace),b.join()}h(k,"getTextureCacheKey");function Z(R,b){let V=n.get(R);if(R.isVideoTexture&&B(R),R.isRenderTargetTexture===!1&&R.isExternalTexture!==!0&&R.version>0&&V.__version!==R.version){let X=R.image;if(X===null)Ce("WebGLRenderer: Texture marked for update but no image data found.");else if(X.complete===!1)Ce("WebGLRenderer: Texture marked for update but image is incomplete");else{Fe(V,R,b);return}}else R.isExternalTexture&&(V.__webglTexture=R.sourceTexture?R.sourceTexture:null);t.bindTexture(i.TEXTURE_2D,V.__webglTexture,i.TEXTURE0+b)}h(Z,"setTexture2D");function ee(R,b){let V=n.get(R);if(R.isRenderTargetTexture===!1&&R.version>0&&V.__version!==R.version){Fe(V,R,b);return}else R.isExternalTexture&&(V.__webglTexture=R.sourceTexture?R.sourceTexture:null);t.bindTexture(i.TEXTURE_2D_ARRAY,V.__webglTexture,i.TEXTURE0+b)}h(ee,"setTexture2DArray");function re(R,b){let V=n.get(R);if(R.isRenderTargetTexture===!1&&R.version>0&&V.__version!==R.version){Fe(V,R,b);return}t.bindTexture(i.TEXTURE_3D,V.__webglTexture,i.TEXTURE0+b)}h(re,"setTexture3D");function le(R,b){let V=n.get(R);if(R.isCubeDepthTexture!==!0&&R.version>0&&V.__version!==R.version){Be(V,R,b);return}t.bindTexture(i.TEXTURE_CUBE_MAP,V.__webglTexture,i.TEXTURE0+b)}h(le,"setTextureCube");let _e={[xa]:i.REPEAT,[Xn]:i.CLAMP_TO_EDGE,[ya]:i.MIRRORED_REPEAT},$e={[zt]:i.NEAREST,[Jp]:i.NEAREST_MIPMAP_NEAREST,[Xr]:i.NEAREST_MIPMAP_LINEAR,[Vt]:i.LINEAR,[ol]:i.LINEAR_MIPMAP_NEAREST,[Vi]:i.LINEAR_MIPMAP_LINEAR},tt={[em]:i.NEVER,[rm]:i.ALWAYS,[tm]:i.LESS,[Gl]:i.LEQUAL,[nm]:i.EQUAL,[Wl]:i.GEQUAL,[im]:i.GREATER,[sm]:i.NOTEQUAL};function Ke(R,b){if(b.type===Nn&&e.has("OES_texture_float_linear")===!1&&(b.magFilter===Vt||b.magFilter===ol||b.magFilter===Xr||b.magFilter===Vi||b.minFilter===Vt||b.minFilter===ol||b.minFilter===Xr||b.minFilter===Vi)&&Ce("WebGLRenderer: Unable to use linear filtering with floating point textures. OES_texture_float_linear not supported on this device."),i.texParameteri(R,i.TEXTURE_WRAP_S,_e[b.wrapS]),i.texParameteri(R,i.TEXTURE_WRAP_T,_e[b.wrapT]),(R===i.TEXTURE_3D||R===i.TEXTURE_2D_ARRAY)&&i.texParameteri(R,i.TEXTURE_WRAP_R,_e[b.wrapR]),i.texParameteri(R,i.TEXTURE_MAG_FILTER,$e[b.magFilter]),i.texParameteri(R,i.TEXTURE_MIN_FILTER,$e[b.minFilter]),b.compareFunction&&(i.texParameteri(R,i.TEXTURE_COMPARE_MODE,i.COMPARE_REF_TO_TEXTURE),i.texParameteri(R,i.TEXTURE_COMPARE_FUNC,tt[b.compareFunction])),e.has("EXT_texture_filter_anisotropic")===!0){if(b.magFilter===zt||b.minFilter!==Xr&&b.minFilter!==Vi||b.type===Nn&&e.has("OES_texture_float_linear")===!1)return;if(b.anisotropy>1||n.get(b).__currentAnisotropy){let V=e.get("EXT_texture_filter_anisotropic");i.texParameterf(R,V.TEXTURE_MAX_ANISOTROPY_EXT,Math.min(b.anisotropy,s.getMaxAnisotropy())),n.get(b).__currentAnisotropy=b.anisotropy}}}h(Ke,"setTextureParameters");function J(R,b){let V=!1;R.__webglInit===void 0&&(R.__webglInit=!0,b.addEventListener("dispose",T));let X=b.source,$=g.get(X);$===void 0&&($={},g.set(X,$));let se=k(b);if(se!==R.__cacheKey){$[se]===void 0&&($[se]={texture:i.createTexture(),usedTimes:0},o.memory.textures++,V=!0),$[se].usedTimes++;let he=$[R.__cacheKey];he!==void 0&&($[R.__cacheKey].usedTimes--,he.usedTimes===0&&C(b)),R.__cacheKey=se,R.__webglTexture=$[se].texture}return V}h(J,"initTexture");function oe(R,b,V){return Math.floor(Math.floor(R/V)/b)}h(oe,"getRow");function ie(R,b,V,X){let se=R.updateRanges;if(se.length===0)t.texSubImage2D(i.TEXTURE_2D,0,0,0,b.width,b.height,V,X,b.data);else{se.sort((Ee,pe)=>Ee.start-pe.start);let he=0;for(let Ee=1;Ee<se.length;Ee++){let pe=se[he],de=se[Ee],Pe=pe.start+pe.count,De=oe(de.start,b.width,4),ze=oe(pe.start,b.width,4);de.start<=Pe+1&&De===ze&&oe(de.start+de.count-1,b.width,4)===De?pe.count=Math.max(pe.count,de.start+de.count-pe.start):(++he,se[he]=de)}se.length=he+1;let K=t.getParameter(i.UNPACK_ROW_LENGTH),Q=t.getParameter(i.UNPACK_SKIP_PIXELS),ue=t.getParameter(i.UNPACK_SKIP_ROWS);t.pixelStorei(i.UNPACK_ROW_LENGTH,b.width);for(let Ee=0,pe=se.length;Ee<pe;Ee++){let de=se[Ee],Pe=Math.floor(de.start/4),De=Math.ceil(de.count/4),ze=Pe%b.width,N=Math.floor(Pe/b.width),ce=De,j=1;t.pixelStorei(i.UNPACK_SKIP_PIXELS,ze),t.pixelStorei(i.UNPACK_SKIP_ROWS,N),t.texSubImage2D(i.TEXTURE_2D,0,ze,N,ce,j,V,X,b.data)}R.clearUpdateRanges(),t.pixelStorei(i.UNPACK_ROW_LENGTH,K),t.pixelStorei(i.UNPACK_SKIP_PIXELS,Q),t.pixelStorei(i.UNPACK_SKIP_ROWS,ue)}}h(ie,"updateTexture");function Fe(R,b,V){let X=i.TEXTURE_2D;(b.isDataArrayTexture||b.isCompressedArrayTexture)&&(X=i.TEXTURE_2D_ARRAY),b.isData3DTexture&&(X=i.TEXTURE_3D);let $=J(R,b),se=b.source;t.bindTexture(X,R.__webglTexture,i.TEXTURE0+V);let he=n.get(se);if(se.version!==he.__version||$===!0){if(t.activeTexture(i.TEXTURE0+V),(typeof ImageBitmap<"u"&&b.image instanceof ImageBitmap)===!1){let j=Ye.getPrimaries(Ye.workingColorSpace),fe=b.colorSpace===di?null:Ye.getPrimaries(b.colorSpace),xe=b.colorSpace===di||j===fe?i.NONE:i.BROWSER_DEFAULT_WEBGL;t.pixelStorei(i.UNPACK_FLIP_Y_WEBGL,b.flipY),t.pixelStorei(i.UNPACK_PREMULTIPLY_ALPHA_WEBGL,b.premultiplyAlpha),t.pixelStorei(i.UNPACK_COLORSPACE_CONVERSION_WEBGL,xe)}t.pixelStorei(i.UNPACK_ALIGNMENT,b.unpackAlignment);let Q=p(b.image,!1,s.maxTextureSize);Q=on(b,Q);let ue=r.convert(b.format,b.colorSpace),Ee=r.convert(b.type),pe=_(b.internalFormat,ue,Ee,b.normalized,b.colorSpace,b.isVideoTexture);Ke(X,b);let de,Pe=b.mipmaps,De=b.isVideoTexture!==!0,ze=he.__version===void 0||$===!0,N=se.dataReady,ce=w(b,Q);if(b.isDepthTexture)pe=A(b.format===Hi,b.type),ze&&(De?t.texStorage2D(i.TEXTURE_2D,1,pe,Q.width,Q.height):t.texImage2D(i.TEXTURE_2D,0,pe,Q.width,Q.height,0,ue,Ee,null));else if(b.isDataTexture)if(Pe.length>0){De&&ze&&t.texStorage2D(i.TEXTURE_2D,ce,pe,Pe[0].width,Pe[0].height);for(let j=0,fe=Pe.length;j<fe;j++)de=Pe[j],De?N&&t.texSubImage2D(i.TEXTURE_2D,j,0,0,de.width,de.height,ue,Ee,de.data):t.texImage2D(i.TEXTURE_2D,j,pe,de.width,de.height,0,ue,Ee,de.data);b.generateMipmaps=!1}else De?(ze&&t.texStorage2D(i.TEXTURE_2D,ce,pe,Q.width,Q.height),N&&ie(b,Q,ue,Ee)):t.texImage2D(i.TEXTURE_2D,0,pe,Q.width,Q.height,0,ue,Ee,Q.data);else if(b.isCompressedTexture)if(b.isCompressedArrayTexture){De&&ze&&t.texStorage3D(i.TEXTURE_2D_ARRAY,ce,pe,Pe[0].width,Pe[0].height,Q.depth);for(let j=0,fe=Pe.length;j<fe;j++)if(de=Pe[j],b.format!==Mn)if(ue!==null)if(De){if(N)if(b.layerUpdates.size>0){let xe=$h(de.width,de.height,b.format,b.type);for(let te of b.layerUpdates){let we=de.data.subarray(te*xe/de.data.BYTES_PER_ELEMENT,(te+1)*xe/de.data.BYTES_PER_ELEMENT);t.compressedTexSubImage3D(i.TEXTURE_2D_ARRAY,j,0,0,te,de.width,de.height,1,ue,we)}b.clearLayerUpdates()}else t.compressedTexSubImage3D(i.TEXTURE_2D_ARRAY,j,0,0,0,de.width,de.height,Q.depth,ue,de.data)}else t.compressedTexImage3D(i.TEXTURE_2D_ARRAY,j,pe,de.width,de.height,Q.depth,0,de.data,0,0);else Ce("WebGLRenderer: Attempt to load unsupported compressed texture format in .uploadTexture()");else De?N&&t.texSubImage3D(i.TEXTURE_2D_ARRAY,j,0,0,0,de.width,de.height,Q.depth,ue,Ee,de.data):t.texImage3D(i.TEXTURE_2D_ARRAY,j,pe,de.width,de.height,Q.depth,0,ue,Ee,de.data)}else{De&&ze&&t.texStorage2D(i.TEXTURE_2D,ce,pe,Pe[0].width,Pe[0].height);for(let j=0,fe=Pe.length;j<fe;j++)de=Pe[j],b.format!==Mn?ue!==null?De?N&&t.compressedTexSubImage2D(i.TEXTURE_2D,j,0,0,de.width,de.height,ue,de.data):t.compressedTexImage2D(i.TEXTURE_2D,j,pe,de.width,de.height,0,de.data):Ce("WebGLRenderer: Attempt to load unsupported compressed texture format in .uploadTexture()"):De?N&&t.texSubImage2D(i.TEXTURE_2D,j,0,0,de.width,de.height,ue,Ee,de.data):t.texImage2D(i.TEXTURE_2D,j,pe,de.width,de.height,0,ue,Ee,de.data)}else if(b.isDataArrayTexture)if(De){if(ze&&t.texStorage3D(i.TEXTURE_2D_ARRAY,ce,pe,Q.width,Q.height,Q.depth),N)if(b.layerUpdates.size>0){let j=$h(Q.width,Q.height,b.format,b.type);for(let fe of b.layerUpdates){let xe=Q.data.subarray(fe*j/Q.data.BYTES_PER_ELEMENT,(fe+1)*j/Q.data.BYTES_PER_ELEMENT);t.texSubImage3D(i.TEXTURE_2D_ARRAY,0,0,0,fe,Q.width,Q.height,1,ue,Ee,xe)}b.clearLayerUpdates()}else t.texSubImage3D(i.TEXTURE_2D_ARRAY,0,0,0,0,Q.width,Q.height,Q.depth,ue,Ee,Q.data)}else t.texImage3D(i.TEXTURE_2D_ARRAY,0,pe,Q.width,Q.height,Q.depth,0,ue,Ee,Q.data);else if(b.isData3DTexture)De?(ze&&t.texStorage3D(i.TEXTURE_3D,ce,pe,Q.width,Q.height,Q.depth),N&&t.texSubImage3D(i.TEXTURE_3D,0,0,0,0,Q.width,Q.height,Q.depth,ue,Ee,Q.data)):t.texImage3D(i.TEXTURE_3D,0,pe,Q.width,Q.height,Q.depth,0,ue,Ee,Q.data);else if(b.isFramebufferTexture){if(ze)if(De)t.texStorage2D(i.TEXTURE_2D,ce,pe,Q.width,Q.height);else{let j=Q.width,fe=Q.height;for(let xe=0;xe<ce;xe++)t.texImage2D(i.TEXTURE_2D,xe,pe,j,fe,0,ue,Ee,null),j>>=1,fe>>=1}}else if(b.isHTMLTexture){if("texElementImage2D"in i){let j=i.canvas;if(j.hasAttribute("layoutsubtree")||j.setAttribute("layoutsubtree","true"),Q.parentNode!==j){j.appendChild(Q),f.add(b),j.onpaint=fe=>{let xe=fe.changedElements;for(let te of f)xe.includes(te.image)&&(te.needsUpdate=!0)},j.requestPaint();return}if(i.texElementImage2D.length===3)i.texElementImage2D(i.TEXTURE_2D,i.RGBA8,Q);else{let xe=i.RGBA,te=i.RGBA,we=i.UNSIGNED_BYTE;i.texElementImage2D(i.TEXTURE_2D,0,xe,te,we,Q)}i.texParameteri(i.TEXTURE_2D,i.TEXTURE_MIN_FILTER,i.LINEAR),i.texParameteri(i.TEXTURE_2D,i.TEXTURE_WRAP_S,i.CLAMP_TO_EDGE),i.texParameteri(i.TEXTURE_2D,i.TEXTURE_WRAP_T,i.CLAMP_TO_EDGE)}}else if(Pe.length>0){if(De&&ze){let j=nt(Pe[0]);t.texStorage2D(i.TEXTURE_2D,ce,pe,j.width,j.height)}for(let j=0,fe=Pe.length;j<fe;j++)de=Pe[j],De?N&&t.texSubImage2D(i.TEXTURE_2D,j,0,0,ue,Ee,de):t.texImage2D(i.TEXTURE_2D,j,pe,ue,Ee,de);b.generateMipmaps=!1}else if(De){if(ze){let j=nt(Q);t.texStorage2D(i.TEXTURE_2D,ce,pe,j.width,j.height)}N&&t.texSubImage2D(i.TEXTURE_2D,0,0,0,ue,Ee,Q)}else t.texImage2D(i.TEXTURE_2D,0,pe,ue,Ee,Q);x(b)&&S(X),he.__version=se.version,b.onUpdate&&b.onUpdate(b)}R.__version=b.version}h(Fe,"uploadTexture");function Be(R,b,V){if(b.image.length!==6)return;let X=J(R,b),$=b.source;t.bindTexture(i.TEXTURE_CUBE_MAP,R.__webglTexture,i.TEXTURE0+V);let se=n.get($);if($.version!==se.__version||X===!0){t.activeTexture(i.TEXTURE0+V);let he=Ye.getPrimaries(Ye.workingColorSpace),K=b.colorSpace===di?null:Ye.getPrimaries(b.colorSpace),Q=b.colorSpace===di||he===K?i.NONE:i.BROWSER_DEFAULT_WEBGL;t.pixelStorei(i.UNPACK_FLIP_Y_WEBGL,b.flipY),t.pixelStorei(i.UNPACK_PREMULTIPLY_ALPHA_WEBGL,b.premultiplyAlpha),t.pixelStorei(i.UNPACK_ALIGNMENT,b.unpackAlignment),t.pixelStorei(i.UNPACK_COLORSPACE_CONVERSION_WEBGL,Q);let ue=b.isCompressedTexture||b.image[0].isCompressedTexture,Ee=b.image[0]&&b.image[0].isDataTexture,pe=[];for(let te=0;te<6;te++)!ue&&!Ee?pe[te]=p(b.image[te],!0,s.maxCubemapSize):pe[te]=Ee?b.image[te].image:b.image[te],pe[te]=on(b,pe[te]);let de=pe[0],Pe=r.convert(b.format,b.colorSpace),De=r.convert(b.type),ze=_(b.internalFormat,Pe,De,b.normalized,b.colorSpace),N=b.isVideoTexture!==!0,ce=se.__version===void 0||X===!0,j=$.dataReady,fe=w(b,de);Ke(i.TEXTURE_CUBE_MAP,b);let xe;if(ue){N&&ce&&t.texStorage2D(i.TEXTURE_CUBE_MAP,fe,ze,de.width,de.height);for(let te=0;te<6;te++){xe=pe[te].mipmaps;for(let we=0;we<xe.length;we++){let be=xe[we];b.format!==Mn?Pe!==null?N?j&&t.compressedTexSubImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+te,we,0,0,be.width,be.height,Pe,be.data):t.compressedTexImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+te,we,ze,be.width,be.height,0,be.data):Ce("WebGLRenderer: Attempt to load unsupported compressed texture format in .setTextureCube()"):N?j&&t.texSubImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+te,we,0,0,be.width,be.height,Pe,De,be.data):t.texImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+te,we,ze,be.width,be.height,0,Pe,De,be.data)}}}else{if(xe=b.mipmaps,N&&ce){xe.length>0&&fe++;let te=nt(pe[0]);t.texStorage2D(i.TEXTURE_CUBE_MAP,fe,ze,te.width,te.height)}for(let te=0;te<6;te++)if(Ee){N?j&&t.texSubImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+te,0,0,0,pe[te].width,pe[te].height,Pe,De,pe[te].data):t.texImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+te,0,ze,pe[te].width,pe[te].height,0,Pe,De,pe[te].data);for(let we=0;we<xe.length;we++){let yt=xe[we].image[te].image;N?j&&t.texSubImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+te,we+1,0,0,yt.width,yt.height,Pe,De,yt.data):t.texImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+te,we+1,ze,yt.width,yt.height,0,Pe,De,yt.data)}}else{N?j&&t.texSubImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+te,0,0,0,Pe,De,pe[te]):t.texImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+te,0,ze,Pe,De,pe[te]);for(let we=0;we<xe.length;we++){let be=xe[we];N?j&&t.texSubImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+te,we+1,0,0,Pe,De,be.image[te]):t.texImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+te,we+1,ze,Pe,De,be.image[te])}}}x(b)&&S(i.TEXTURE_CUBE_MAP),se.__version=$.version,b.onUpdate&&b.onUpdate(b)}R.__version=b.version}h(Be,"uploadCubeTexture");function Le(R,b,V,X,$,se){let he=r.convert(V.format,V.colorSpace),K=r.convert(V.type),Q=_(V.internalFormat,he,K,V.normalized,V.colorSpace),ue=n.get(b),Ee=n.get(V);if(Ee.__renderTarget=b,!ue.__hasExternalTextures){let pe=Math.max(1,b.width>>se),de=Math.max(1,b.height>>se);$===i.TEXTURE_3D||$===i.TEXTURE_2D_ARRAY?t.texImage3D($,se,Q,pe,de,b.depth,0,he,K,null):t.texImage2D($,se,Q,pe,de,0,he,K,null)}t.bindFramebuffer(i.FRAMEBUFFER,R),Pt(b)?a.framebufferTexture2DMultisampleEXT(i.FRAMEBUFFER,X,$,Ee.__webglTexture,0,xt(b)):($===i.TEXTURE_2D||$>=i.TEXTURE_CUBE_MAP_POSITIVE_X&&$<=i.TEXTURE_CUBE_MAP_NEGATIVE_Z)&&i.framebufferTexture2D(i.FRAMEBUFFER,X,$,Ee.__webglTexture,se),t.bindFramebuffer(i.FRAMEBUFFER,null)}h(Le,"setupFrameBufferTexture");function St(R,b,V){if(i.bindRenderbuffer(i.RENDERBUFFER,R),b.depthBuffer){let X=b.depthTexture,$=X&&X.isDepthTexture?X.type:null,se=A(b.stencilBuffer,$),he=b.stencilBuffer?i.DEPTH_STENCIL_ATTACHMENT:i.DEPTH_ATTACHMENT;Pt(b)?a.renderbufferStorageMultisampleEXT(i.RENDERBUFFER,xt(b),se,b.width,b.height):V?i.renderbufferStorageMultisample(i.RENDERBUFFER,xt(b),se,b.width,b.height):i.renderbufferStorage(i.RENDERBUFFER,se,b.width,b.height),i.framebufferRenderbuffer(i.FRAMEBUFFER,he,i.RENDERBUFFER,R)}else{let X=b.textures;for(let $=0;$<X.length;$++){let se=X[$],he=r.convert(se.format,se.colorSpace),K=r.convert(se.type),Q=_(se.internalFormat,he,K,se.normalized,se.colorSpace);Pt(b)?a.renderbufferStorageMultisampleEXT(i.RENDERBUFFER,xt(b),Q,b.width,b.height):V?i.renderbufferStorageMultisample(i.RENDERBUFFER,xt(b),Q,b.width,b.height):i.renderbufferStorage(i.RENDERBUFFER,Q,b.width,b.height)}}i.bindRenderbuffer(i.RENDERBUFFER,null)}h(St,"setupRenderBufferStorage");function qe(R,b,V){let X=b.isWebGLCubeRenderTarget===!0;if(t.bindFramebuffer(i.FRAMEBUFFER,R),!(b.depthTexture&&b.depthTexture.isDepthTexture))throw new Error("THREE.WebGLTextures: renderTarget.depthTexture must be an instance of THREE.DepthTexture.");let $=n.get(b.depthTexture);if($.__renderTarget=b,(!$.__webglTexture||b.depthTexture.image.width!==b.width||b.depthTexture.image.height!==b.height)&&(b.depthTexture.image.width=b.width,b.depthTexture.image.height=b.height,b.depthTexture.needsUpdate=!0),X){if($.__webglInit===void 0&&($.__webglInit=!0,b.depthTexture.addEventListener("dispose",T)),$.__webglTexture===void 0){$.__webglTexture=i.createTexture(),t.bindTexture(i.TEXTURE_CUBE_MAP,$.__webglTexture),Ke(i.TEXTURE_CUBE_MAP,b.depthTexture);let ue=r.convert(b.depthTexture.format),Ee=r.convert(b.depthTexture.type),pe;b.depthTexture.format===qn?pe=i.DEPTH_COMPONENT24:b.depthTexture.format===Hi&&(pe=i.DEPTH24_STENCIL8);for(let de=0;de<6;de++)i.texImage2D(i.TEXTURE_CUBE_MAP_POSITIVE_X+de,0,pe,b.width,b.height,0,ue,Ee,null)}}else Z(b.depthTexture,0);let se=$.__webglTexture,he=xt(b),K=X?i.TEXTURE_CUBE_MAP_POSITIVE_X+V:i.TEXTURE_2D,Q=b.depthTexture.format===Hi?i.DEPTH_STENCIL_ATTACHMENT:i.DEPTH_ATTACHMENT;if(b.depthTexture.format===qn)Pt(b)?a.framebufferTexture2DMultisampleEXT(i.FRAMEBUFFER,Q,K,se,0,he):i.framebufferTexture2D(i.FRAMEBUFFER,Q,K,se,0);else if(b.depthTexture.format===Hi)Pt(b)?a.framebufferTexture2DMultisampleEXT(i.FRAMEBUFFER,Q,K,se,0,he):i.framebufferTexture2D(i.FRAMEBUFFER,Q,K,se,0);else throw new Error("THREE.WebGLTextures: Unknown depthTexture format.")}h(qe,"setupDepthTexture");function ot(R){let b=n.get(R),V=R.isWebGLCubeRenderTarget===!0;if(b.__boundDepthTexture!==R.depthTexture){let X=R.depthTexture;if(b.__depthDisposeCallback&&b.__depthDisposeCallback(),X){let $=h(()=>{delete b.__boundDepthTexture,delete b.__depthDisposeCallback,X.removeEventListener("dispose",$)},"disposeEvent");X.addEventListener("dispose",$),b.__depthDisposeCallback=$}b.__boundDepthTexture=X}if(R.depthTexture&&!b.__autoAllocateDepthBuffer)if(V)for(let X=0;X<6;X++)qe(b.__webglFramebuffer[X],R,X);else{let X=R.texture.mipmaps;X&&X.length>0?qe(b.__webglFramebuffer[0],R,0):qe(b.__webglFramebuffer,R,0)}else if(V){b.__webglDepthbuffer=[];for(let X=0;X<6;X++)if(t.bindFramebuffer(i.FRAMEBUFFER,b.__webglFramebuffer[X]),b.__webglDepthbuffer[X]===void 0)b.__webglDepthbuffer[X]=i.createRenderbuffer(),St(b.__webglDepthbuffer[X],R,!1);else{let $=R.stencilBuffer?i.DEPTH_STENCIL_ATTACHMENT:i.DEPTH_ATTACHMENT,se=b.__webglDepthbuffer[X];i.bindRenderbuffer(i.RENDERBUFFER,se),i.framebufferRenderbuffer(i.FRAMEBUFFER,$,i.RENDERBUFFER,se)}}else{let X=R.texture.mipmaps;if(X&&X.length>0?t.bindFramebuffer(i.FRAMEBUFFER,b.__webglFramebuffer[0]):t.bindFramebuffer(i.FRAMEBUFFER,b.__webglFramebuffer),b.__webglDepthbuffer===void 0)b.__webglDepthbuffer=i.createRenderbuffer(),St(b.__webglDepthbuffer,R,!1);else{let $=R.stencilBuffer?i.DEPTH_STENCIL_ATTACHMENT:i.DEPTH_ATTACHMENT,se=b.__webglDepthbuffer;i.bindRenderbuffer(i.RENDERBUFFER,se),i.framebufferRenderbuffer(i.FRAMEBUFFER,$,i.RENDERBUFFER,se)}}t.bindFramebuffer(i.FRAMEBUFFER,null)}h(ot,"setupDepthRenderbuffer");function Qe(R,b,V){let X=n.get(R);b!==void 0&&Le(X.__webglFramebuffer,R,R.texture,i.COLOR_ATTACHMENT0,i.TEXTURE_2D,0),V!==void 0&&ot(R)}h(Qe,"rebindTextures");function Ze(R){let b=R.texture,V=n.get(R),X=n.get(b);R.addEventListener("dispose",v);let $=R.textures,se=R.isWebGLCubeRenderTarget===!0,he=$.length>1;if(he||(X.__webglTexture===void 0&&(X.__webglTexture=i.createTexture()),X.__version=b.version,o.memory.textures++),se){V.__webglFramebuffer=[];for(let K=0;K<6;K++)if(b.mipmaps&&b.mipmaps.length>0){V.__webglFramebuffer[K]=[];for(let Q=0;Q<b.mipmaps.length;Q++)V.__webglFramebuffer[K][Q]=i.createFramebuffer()}else V.__webglFramebuffer[K]=i.createFramebuffer()}else{if(b.mipmaps&&b.mipmaps.length>0){V.__webglFramebuffer=[];for(let K=0;K<b.mipmaps.length;K++)V.__webglFramebuffer[K]=i.createFramebuffer()}else V.__webglFramebuffer=i.createFramebuffer();if(he)for(let K=0,Q=$.length;K<Q;K++){let ue=n.get($[K]);ue.__webglTexture===void 0&&(ue.__webglTexture=i.createTexture(),o.memory.textures++)}if(R.samples>0&&Pt(R)===!1){V.__webglMultisampledFramebuffer=i.createFramebuffer(),V.__webglColorRenderbuffer=[],t.bindFramebuffer(i.FRAMEBUFFER,V.__webglMultisampledFramebuffer);for(let K=0;K<$.length;K++){let Q=$[K];V.__webglColorRenderbuffer[K]=i.createRenderbuffer(),i.bindRenderbuffer(i.RENDERBUFFER,V.__webglColorRenderbuffer[K]);let ue=r.convert(Q.format,Q.colorSpace),Ee=r.convert(Q.type),pe=_(Q.internalFormat,ue,Ee,Q.normalized,Q.colorSpace,R.isXRRenderTarget===!0),de=xt(R);i.renderbufferStorageMultisample(i.RENDERBUFFER,de,pe,R.width,R.height),i.framebufferRenderbuffer(i.FRAMEBUFFER,i.COLOR_ATTACHMENT0+K,i.RENDERBUFFER,V.__webglColorRenderbuffer[K])}i.bindRenderbuffer(i.RENDERBUFFER,null),R.depthBuffer&&(V.__webglDepthRenderbuffer=i.createRenderbuffer(),St(V.__webglDepthRenderbuffer,R,!0)),t.bindFramebuffer(i.FRAMEBUFFER,null)}}if(se){t.bindTexture(i.TEXTURE_CUBE_MAP,X.__webglTexture),Ke(i.TEXTURE_CUBE_MAP,b);for(let K=0;K<6;K++)if(b.mipmaps&&b.mipmaps.length>0)for(let Q=0;Q<b.mipmaps.length;Q++)Le(V.__webglFramebuffer[K][Q],R,b,i.COLOR_ATTACHMENT0,i.TEXTURE_CUBE_MAP_POSITIVE_X+K,Q);else Le(V.__webglFramebuffer[K],R,b,i.COLOR_ATTACHMENT0,i.TEXTURE_CUBE_MAP_POSITIVE_X+K,0);x(b)&&S(i.TEXTURE_CUBE_MAP),t.unbindTexture()}else if(he){for(let K=0,Q=$.length;K<Q;K++){let ue=$[K],Ee=n.get(ue),pe=i.TEXTURE_2D;(R.isWebGL3DRenderTarget||R.isWebGLArrayRenderTarget)&&(pe=R.isWebGL3DRenderTarget?i.TEXTURE_3D:i.TEXTURE_2D_ARRAY),t.bindTexture(pe,Ee.__webglTexture),Ke(pe,ue),Le(V.__webglFramebuffer,R,ue,i.COLOR_ATTACHMENT0+K,pe,0),x(ue)&&S(pe)}t.unbindTexture()}else{let K=i.TEXTURE_2D;if((R.isWebGL3DRenderTarget||R.isWebGLArrayRenderTarget)&&(K=R.isWebGL3DRenderTarget?i.TEXTURE_3D:i.TEXTURE_2D_ARRAY),t.bindTexture(K,X.__webglTexture),Ke(K,b),b.mipmaps&&b.mipmaps.length>0)for(let Q=0;Q<b.mipmaps.length;Q++)Le(V.__webglFramebuffer[Q],R,b,i.COLOR_ATTACHMENT0,K,Q);else Le(V.__webglFramebuffer,R,b,i.COLOR_ATTACHMENT0,K,0);x(b)&&S(K),t.unbindTexture()}R.depthBuffer&&ot(R)}h(Ze,"setupRenderTarget");function At(R){let b=R.textures;for(let V=0,X=b.length;V<X;V++){let $=b[V];if(x($)){let se=M(R),he=n.get($).__webglTexture;t.bindTexture(se,he),S(se),t.unbindTexture()}}}h(At,"updateRenderTargetMipmap");let Ct=[],Ut=[];function kt(R){if(R.samples>0){if(Pt(R)===!1){let b=R.textures,V=R.width,X=R.height,$=i.COLOR_BUFFER_BIT,se=R.stencilBuffer?i.DEPTH_STENCIL_ATTACHMENT:i.DEPTH_ATTACHMENT,he=n.get(R),K=b.length>1;if(K)for(let ue=0;ue<b.length;ue++)t.bindFramebuffer(i.FRAMEBUFFER,he.__webglMultisampledFramebuffer),i.framebufferRenderbuffer(i.FRAMEBUFFER,i.COLOR_ATTACHMENT0+ue,i.RENDERBUFFER,null),t.bindFramebuffer(i.FRAMEBUFFER,he.__webglFramebuffer),i.framebufferTexture2D(i.DRAW_FRAMEBUFFER,i.COLOR_ATTACHMENT0+ue,i.TEXTURE_2D,null,0);t.bindFramebuffer(i.READ_FRAMEBUFFER,he.__webglMultisampledFramebuffer);let Q=R.texture.mipmaps;Q&&Q.length>0?t.bindFramebuffer(i.DRAW_FRAMEBUFFER,he.__webglFramebuffer[0]):t.bindFramebuffer(i.DRAW_FRAMEBUFFER,he.__webglFramebuffer);for(let ue=0;ue<b.length;ue++){if(R.resolveDepthBuffer&&(R.depthBuffer&&($|=i.DEPTH_BUFFER_BIT),R.stencilBuffer&&R.resolveStencilBuffer&&($|=i.STENCIL_BUFFER_BIT)),K){i.framebufferRenderbuffer(i.READ_FRAMEBUFFER,i.COLOR_ATTACHMENT0,i.RENDERBUFFER,he.__webglColorRenderbuffer[ue]);let Ee=n.get(b[ue]).__webglTexture;i.framebufferTexture2D(i.DRAW_FRAMEBUFFER,i.COLOR_ATTACHMENT0,i.TEXTURE_2D,Ee,0)}i.blitFramebuffer(0,0,V,X,0,0,V,X,$,i.NEAREST),l===!0&&(Ct.length=0,Ut.length=0,Ct.push(i.COLOR_ATTACHMENT0+ue),R.depthBuffer&&R.resolveDepthBuffer===!1&&(Ct.push(se),Ut.push(se),i.invalidateFramebuffer(i.DRAW_FRAMEBUFFER,Ut)),i.invalidateFramebuffer(i.READ_FRAMEBUFFER,Ct))}if(t.bindFramebuffer(i.READ_FRAMEBUFFER,null),t.bindFramebuffer(i.DRAW_FRAMEBUFFER,null),K)for(let ue=0;ue<b.length;ue++){t.bindFramebuffer(i.FRAMEBUFFER,he.__webglMultisampledFramebuffer),i.framebufferRenderbuffer(i.FRAMEBUFFER,i.COLOR_ATTACHMENT0+ue,i.RENDERBUFFER,he.__webglColorRenderbuffer[ue]);let Ee=n.get(b[ue]).__webglTexture;t.bindFramebuffer(i.FRAMEBUFFER,he.__webglFramebuffer),i.framebufferTexture2D(i.DRAW_FRAMEBUFFER,i.COLOR_ATTACHMENT0+ue,i.TEXTURE_2D,Ee,0)}t.bindFramebuffer(i.DRAW_FRAMEBUFFER,he.__webglMultisampledFramebuffer)}else if(R.depthBuffer&&R.resolveDepthBuffer===!1&&l){let b=R.stencilBuffer?i.DEPTH_STENCIL_ATTACHMENT:i.DEPTH_ATTACHMENT;i.invalidateFramebuffer(i.DRAW_FRAMEBUFFER,[b])}}}h(kt,"updateMultisampleRenderTarget");function xt(R){return Math.min(s.maxSamples,R.samples)}h(xt,"getRenderTargetSamples");function Pt(R){let b=n.get(R);return R.samples>0&&e.has("WEBGL_multisampled_render_to_texture")===!0&&b.__useRenderToTexture!==!1}h(Pt,"useMultisampledRTT");function B(R){let b=o.render.frame;u.get(R)!==b&&(u.set(R,b),R.update())}h(B,"updateVideoTexture");function on(R,b){let V=R.colorSpace,X=R.format,$=R.type;return R.isCompressedTexture===!0||R.isVideoTexture===!0||V!==yr&&V!==di&&(Ye.getTransfer(V)===et?(X!==Mn||$!==yn)&&Ce("WebGLTextures: sRGB encoded textures have to use RGBAFormat and UnsignedByteType."):Ne("WebGLTextures: Unsupported texture color space:",V)),b}h(on,"verifyColorSpace");function nt(R){return typeof HTMLImageElement<"u"&&R instanceof HTMLImageElement?(c.width=R.naturalWidth||R.width,c.height=R.naturalHeight||R.height):typeof VideoFrame<"u"&&R instanceof VideoFrame?(c.width=R.displayWidth,c.height=R.displayHeight):(c.width=R.width,c.height=R.height),c}h(nt,"getDimensions"),this.allocateTextureUnit=Y,this.resetTextureUnits=L,this.getTextureUnits=H,this.setTextureUnits=F,this.setTexture2D=Z,this.setTexture2DArray=ee,this.setTexture3D=re,this.setTextureCube=le,this.rebindTextures=Qe,this.setupRenderTarget=Ze,this.updateRenderTargetMipmap=At,this.updateMultisampleRenderTarget=kt,this.setupDepthRenderbuffer=ot,this.setupFrameBufferTexture=Le,this.useMultisampledRTT=Pt,this.isReversedDepthBuffer=function(){return t.buffers.depth.getReversed()}}h(aS,"WebGLTextures");function lS(i,e){function t(n,s=di){let r,o=Ye.getTransfer(s);if(n===yn)return i.UNSIGNED_BYTE;if(n===ll)return i.UNSIGNED_SHORT_4_4_4_4;if(n===cl)return i.UNSIGNED_SHORT_5_5_5_1;if(n===Uh)return i.UNSIGNED_INT_5_9_9_9_REV;if(n===Oh)return i.UNSIGNED_INT_10F_11F_11F_REV;if(n===Fh)return i.BYTE;if(n===Nh)return i.SHORT;if(n===Ys)return i.UNSIGNED_SHORT;if(n===al)return i.INT;if(n===Fn)return i.UNSIGNED_INT;if(n===Nn)return i.FLOAT;if(n===Zn)return i.HALF_FLOAT;if(n===Bh)return i.ALPHA;if(n===zh)return i.RGB;if(n===Mn)return i.RGBA;if(n===qn)return i.DEPTH_COMPONENT;if(n===Hi)return i.DEPTH_STENCIL;if(n===kh)return i.RED;if(n===hl)return i.RED_INTEGER;if(n===Gi)return i.RG;if(n===ul)return i.RG_INTEGER;if(n===dl)return i.RGBA_INTEGER;if(n===qr||n===Yr||n===$r||n===Kr)if(o===et)if(r=e.get("WEBGL_compressed_texture_s3tc_srgb"),r!==null){if(n===qr)return r.COMPRESSED_SRGB_S3TC_DXT1_EXT;if(n===Yr)return r.COMPRESSED_SRGB_ALPHA_S3TC_DXT1_EXT;if(n===$r)return r.COMPRESSED_SRGB_ALPHA_S3TC_DXT3_EXT;if(n===Kr)return r.COMPRESSED_SRGB_ALPHA_S3TC_DXT5_EXT}else return null;else if(r=e.get("WEBGL_compressed_texture_s3tc"),r!==null){if(n===qr)return r.COMPRESSED_RGB_S3TC_DXT1_EXT;if(n===Yr)return r.COMPRESSED_RGBA_S3TC_DXT1_EXT;if(n===$r)return r.COMPRESSED_RGBA_S3TC_DXT3_EXT;if(n===Kr)return r.COMPRESSED_RGBA_S3TC_DXT5_EXT}else return null;if(n===fl||n===pl||n===ml||n===gl)if(r=e.get("WEBGL_compressed_texture_pvrtc"),r!==null){if(n===fl)return r.COMPRESSED_RGB_PVRTC_4BPPV1_IMG;if(n===pl)return r.COMPRESSED_RGB_PVRTC_2BPPV1_IMG;if(n===ml)return r.COMPRESSED_RGBA_PVRTC_4BPPV1_IMG;if(n===gl)return r.COMPRESSED_RGBA_PVRTC_2BPPV1_IMG}else return null;if(n===xl||n===yl||n===vl||n===_l||n===bl||n===Zr||n===Sl)if(r=e.get("WEBGL_compressed_texture_etc"),r!==null){if(n===xl||n===yl)return o===et?r.COMPRESSED_SRGB8_ETC2:r.COMPRESSED_RGB8_ETC2;if(n===vl)return o===et?r.COMPRESSED_SRGB8_ALPHA8_ETC2_EAC:r.COMPRESSED_RGBA8_ETC2_EAC;if(n===_l)return r.COMPRESSED_R11_EAC;if(n===bl)return r.COMPRESSED_SIGNED_R11_EAC;if(n===Zr)return r.COMPRESSED_RG11_EAC;if(n===Sl)return r.COMPRESSED_SIGNED_RG11_EAC}else return null;if(n===Ml||n===wl||n===El||n===Tl||n===Al||n===Pl||n===Rl||n===Cl||n===Il||n===Ll||n===Dl||n===Fl||n===Nl||n===Ul)if(r=e.get("WEBGL_compressed_texture_astc"),r!==null){if(n===Ml)return o===et?r.COMPRESSED_SRGB8_ALPHA8_ASTC_4x4_KHR:r.COMPRESSED_RGBA_ASTC_4x4_KHR;if(n===wl)return o===et?r.COMPRESSED_SRGB8_ALPHA8_ASTC_5x4_KHR:r.COMPRESSED_RGBA_ASTC_5x4_KHR;if(n===El)return o===et?r.COMPRESSED_SRGB8_ALPHA8_ASTC_5x5_KHR:r.COMPRESSED_RGBA_ASTC_5x5_KHR;if(n===Tl)return o===et?r.COMPRESSED_SRGB8_ALPHA8_ASTC_6x5_KHR:r.COMPRESSED_RGBA_ASTC_6x5_KHR;if(n===Al)return o===et?r.COMPRESSED_SRGB8_ALPHA8_ASTC_6x6_KHR:r.COMPRESSED_RGBA_ASTC_6x6_KHR;if(n===Pl)return o===et?r.COMPRESSED_SRGB8_ALPHA8_ASTC_8x5_KHR:r.COMPRESSED_RGBA_ASTC_8x5_KHR;if(n===Rl)return o===et?r.COMPRESSED_SRGB8_ALPHA8_ASTC_8x6_KHR:r.COMPRESSED_RGBA_ASTC_8x6_KHR;if(n===Cl)return o===et?r.COMPRESSED_SRGB8_ALPHA8_ASTC_8x8_KHR:r.COMPRESSED_RGBA_ASTC_8x8_KHR;if(n===Il)return o===et?r.COMPRESSED_SRGB8_ALPHA8_ASTC_10x5_KHR:r.COMPRESSED_RGBA_ASTC_10x5_KHR;if(n===Ll)return o===et?r.COMPRESSED_SRGB8_ALPHA8_ASTC_10x6_KHR:r.COMPRESSED_RGBA_ASTC_10x6_KHR;if(n===Dl)return o===et?r.COMPRESSED_SRGB8_ALPHA8_ASTC_10x8_KHR:r.COMPRESSED_RGBA_ASTC_10x8_KHR;if(n===Fl)return o===et?r.COMPRESSED_SRGB8_ALPHA8_ASTC_10x10_KHR:r.COMPRESSED_RGBA_ASTC_10x10_KHR;if(n===Nl)return o===et?r.COMPRESSED_SRGB8_ALPHA8_ASTC_12x10_KHR:r.COMPRESSED_RGBA_ASTC_12x10_KHR;if(n===Ul)return o===et?r.COMPRESSED_SRGB8_ALPHA8_ASTC_12x12_KHR:r.COMPRESSED_RGBA_ASTC_12x12_KHR}else return null;if(n===Ol||n===Bl||n===zl)if(r=e.get("EXT_texture_compression_bptc"),r!==null){if(n===Ol)return o===et?r.COMPRESSED_SRGB_ALPHA_BPTC_UNORM_EXT:r.COMPRESSED_RGBA_BPTC_UNORM_EXT;if(n===Bl)return r.COMPRESSED_RGB_BPTC_SIGNED_FLOAT_EXT;if(n===zl)return r.COMPRESSED_RGB_BPTC_UNSIGNED_FLOAT_EXT}else return null;if(n===kl||n===Vl||n===Jr||n===Hl)if(r=e.get("EXT_texture_compression_rgtc"),r!==null){if(n===kl)return r.COMPRESSED_RED_RGTC1_EXT;if(n===Vl)return r.COMPRESSED_SIGNED_RED_RGTC1_EXT;if(n===Jr)return r.COMPRESSED_RED_GREEN_RGTC2_EXT;if(n===Hl)return r.COMPRESSED_SIGNED_RED_GREEN_RGTC2_EXT}else return null;return n===$s?i.UNSIGNED_INT_24_8:i[n]!==void 0?i[n]:null}return h(t,"convert"),{convert:t}}h(lS,"WebGLUtils");var cS=`
void main() {

	gl_Position = vec4( position, 1.0 );

}`,hS=`
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

}`,Pd=class Pd{constructor(){this.texture=null,this.mesh=null,this.depthNear=0,this.depthFar=0}init(e,t){if(this.texture===null){let n=new Lr(e.texture);(e.depthNear!==t.depthNear||e.depthFar!==t.depthFar)&&(this.depthNear=e.depthNear,this.depthFar=e.depthFar),this.texture=n}}getMesh(e){if(this.texture!==null&&this.mesh===null){let t=e.cameras[0].viewport,n=new Ht({vertexShader:cS,fragmentShader:hS,uniforms:{depthColor:{value:this.texture},depthWidth:{value:t.z},depthHeight:{value:t.w}}});this.mesh=new Tt(new Ni(20,20),n)}return this.mesh}reset(){this.texture=null,this.mesh=null}getDepthTexture(){return this.texture}};h(Pd,"WebXRDepthSensing");var yd=Pd,Rd=class Rd extends Yn{constructor(e,t){super();let n=this,s=null,r=1,o=null,a="local-floor",l=1,c=null,u=null,f=null,d=null,g=null,m=null,y=typeof XRWebGLBinding<"u",p=new yd,x={},S=t.getContextAttributes(),M=null,_=null,A=[],w=[],T=new We,v=null,P=new Jt;P.viewport=new st;let C=new Jt;C.viewport=new st;let I=[P,C],D=new Ga,L=null,H=null;this.cameraAutoUpdate=!0,this.enabled=!1,this.isPresenting=!1,this.getController=function(J){let oe=A[J];return oe===void 0&&(oe=new ks,A[J]=oe),oe.getTargetRaySpace()},this.getControllerGrip=function(J){let oe=A[J];return oe===void 0&&(oe=new ks,A[J]=oe),oe.getGripSpace()},this.getHand=function(J){let oe=A[J];return oe===void 0&&(oe=new ks,A[J]=oe),oe.getHandSpace()};function F(J){let oe=w.indexOf(J.inputSource);if(oe===-1)return;let ie=A[oe];ie!==void 0&&(ie.update(J.inputSource,J.frame,c||o),ie.dispatchEvent({type:J.type,data:J.inputSource}))}h(F,"onSessionEvent");function Y(){s.removeEventListener("select",F),s.removeEventListener("selectstart",F),s.removeEventListener("selectend",F),s.removeEventListener("squeeze",F),s.removeEventListener("squeezestart",F),s.removeEventListener("squeezeend",F),s.removeEventListener("end",Y),s.removeEventListener("inputsourceschange",k);for(let J=0;J<A.length;J++){let oe=w[J];oe!==null&&(w[J]=null,A[J].disconnect(oe))}L=null,H=null,p.reset();for(let J in x)delete x[J];e.setRenderTarget(M),g=null,d=null,f=null,s=null,_=null,Ke.stop(),n.isPresenting=!1,e.setPixelRatio(v),e.setSize(T.width,T.height,!1),n.dispatchEvent({type:"sessionend"})}h(Y,"onSessionEnd"),this.setFramebufferScaleFactor=function(J){r=J,n.isPresenting===!0&&Ce("WebXRManager: Cannot change framebuffer scale while presenting.")},this.setReferenceSpaceType=function(J){a=J,n.isPresenting===!0&&Ce("WebXRManager: Cannot change reference space type while presenting.")},this.getReferenceSpace=function(){return c||o},this.setReferenceSpace=function(J){c=J},this.getBaseLayer=function(){return d!==null?d:g},this.getBinding=function(){return f===null&&y&&(f=new XRWebGLBinding(s,t)),f},this.getFrame=function(){return m},this.getSession=function(){return s},this.setSession=async function(J){if(s=J,s!==null){if(M=e.getRenderTarget(),s.addEventListener("select",F),s.addEventListener("selectstart",F),s.addEventListener("selectend",F),s.addEventListener("squeeze",F),s.addEventListener("squeezestart",F),s.addEventListener("squeezeend",F),s.addEventListener("end",Y),s.addEventListener("inputsourceschange",k),S.xrCompatible!==!0&&await t.makeXRCompatible(),v=e.getPixelRatio(),e.getSize(T),y&&"createProjectionLayer"in XRWebGLBinding.prototype){let ie=null,Fe=null,Be=null;S.depth&&(Be=S.stencil?t.DEPTH24_STENCIL8:t.DEPTH_COMPONENT24,ie=S.stencil?Hi:qn,Fe=S.stencil?$s:Fn);let Le={colorFormat:t.RGBA8,depthFormat:Be,scaleFactor:r};f=this.getBinding(),d=f.createProjectionLayer(Le),s.updateRenderState({layers:[d]}),e.setPixelRatio(1),e.setSize(d.textureWidth,d.textureHeight,!1),_=new pn(d.textureWidth,d.textureHeight,{format:Mn,type:yn,depthTexture:new ui(d.textureWidth,d.textureHeight,Fe,void 0,void 0,void 0,void 0,void 0,void 0,ie),stencilBuffer:S.stencil,colorSpace:e.outputColorSpace,samples:S.antialias?4:0,resolveDepthBuffer:d.ignoreDepthValues===!1,resolveStencilBuffer:d.ignoreDepthValues===!1})}else{let ie={antialias:S.antialias,alpha:!0,depth:S.depth,stencil:S.stencil,framebufferScaleFactor:r};g=new XRWebGLLayer(s,t,ie),s.updateRenderState({baseLayer:g}),e.setPixelRatio(1),e.setSize(g.framebufferWidth,g.framebufferHeight,!1),_=new pn(g.framebufferWidth,g.framebufferHeight,{format:Mn,type:yn,colorSpace:e.outputColorSpace,stencilBuffer:S.stencil,resolveDepthBuffer:g.ignoreDepthValues===!1,resolveStencilBuffer:g.ignoreDepthValues===!1})}_.isXRRenderTarget=!0,this.setFoveation(l),c=null,o=await s.requestReferenceSpace(a),Ke.setContext(s),Ke.start(),n.isPresenting=!0,n.dispatchEvent({type:"sessionstart"})}},this.getEnvironmentBlendMode=function(){if(s!==null)return s.environmentBlendMode},this.getDepthTexture=function(){return p.getDepthTexture()};function k(J){for(let oe=0;oe<J.removed.length;oe++){let ie=J.removed[oe],Fe=w.indexOf(ie);Fe>=0&&(w[Fe]=null,A[Fe].disconnect(ie))}for(let oe=0;oe<J.added.length;oe++){let ie=J.added[oe],Fe=w.indexOf(ie);if(Fe===-1){for(let Le=0;Le<A.length;Le++)if(Le>=w.length){w.push(ie),Fe=Le;break}else if(w[Le]===null){w[Le]=ie,Fe=Le;break}if(Fe===-1)break}let Be=A[Fe];Be&&Be.connect(ie)}}h(k,"onInputSourcesChange");let Z=new O,ee=new O;function re(J,oe,ie){Z.setFromMatrixPosition(oe.matrixWorld),ee.setFromMatrixPosition(ie.matrixWorld);let Fe=Z.distanceTo(ee),Be=oe.projectionMatrix.elements,Le=ie.projectionMatrix.elements,St=Be[14]/(Be[10]-1),qe=Be[14]/(Be[10]+1),ot=(Be[9]+1)/Be[5],Qe=(Be[9]-1)/Be[5],Ze=(Be[8]-1)/Be[0],At=(Le[8]+1)/Le[0],Ct=St*Ze,Ut=St*At,kt=Fe/(-Ze+At),xt=kt*-Ze;if(oe.matrixWorld.decompose(J.position,J.quaternion,J.scale),J.translateX(xt),J.translateZ(kt),J.matrixWorld.compose(J.position,J.quaternion,J.scale),J.matrixWorldInverse.copy(J.matrixWorld).invert(),Be[10]===-1)J.projectionMatrix.copy(oe.projectionMatrix),J.projectionMatrixInverse.copy(oe.projectionMatrixInverse);else{let Pt=St+kt,B=qe+kt,on=Ct-xt,nt=Ut+(Fe-xt),R=ot*qe/B*Pt,b=Qe*qe/B*Pt;J.projectionMatrix.makePerspective(on,nt,R,b,Pt,B),J.projectionMatrixInverse.copy(J.projectionMatrix).invert()}}h(re,"setProjectionFromUnion");function le(J,oe){oe===null?J.matrixWorld.copy(J.matrix):J.matrixWorld.multiplyMatrices(oe.matrixWorld,J.matrix),J.matrixWorldInverse.copy(J.matrixWorld).invert()}h(le,"updateCamera"),this.updateCamera=function(J){if(s===null)return;let oe=J.near,ie=J.far;p.texture!==null&&(p.depthNear>0&&(oe=p.depthNear),p.depthFar>0&&(ie=p.depthFar)),D.near=C.near=P.near=oe,D.far=C.far=P.far=ie,(L!==D.near||H!==D.far)&&(s.updateRenderState({depthNear:D.near,depthFar:D.far}),L=D.near,H=D.far),D.layers.mask=J.layers.mask|6,P.layers.mask=D.layers.mask&-5,C.layers.mask=D.layers.mask&-3;let Fe=J.parent,Be=D.cameras;le(D,Fe);for(let Le=0;Le<Be.length;Le++)le(Be[Le],Fe);Be.length===2?re(D,P,C):D.projectionMatrix.copy(P.projectionMatrix),_e(J,D,Fe)};function _e(J,oe,ie){ie===null?J.matrix.copy(oe.matrixWorld):(J.matrix.copy(ie.matrixWorld),J.matrix.invert(),J.matrix.multiply(oe.matrixWorld)),J.matrix.decompose(J.position,J.quaternion,J.scale),J.updateMatrixWorld(!0),J.projectionMatrix.copy(oe.projectionMatrix),J.projectionMatrixInverse.copy(oe.projectionMatrixInverse),J.isPerspectiveCamera&&(J.fov=Bs*2*Math.atan(1/J.projectionMatrix.elements[5]),J.zoom=1)}h(_e,"updateUserCamera"),this.getCamera=function(){return D},this.getFoveation=function(){if(!(d===null&&g===null))return l},this.setFoveation=function(J){l=J,d!==null&&(d.fixedFoveation=J),g!==null&&g.fixedFoveation!==void 0&&(g.fixedFoveation=J)},this.hasDepthSensing=function(){return p.texture!==null},this.getDepthSensingMesh=function(){return p.getMesh(D)},this.getCameraTexture=function(J){return x[J]};let $e=null;function tt(J,oe){if(u=oe.getViewerPose(c||o),m=oe,u!==null){let ie=u.views;g!==null&&(e.setRenderTargetFramebuffer(_,g.framebuffer),e.setRenderTarget(_));let Fe=!1;ie.length!==D.cameras.length&&(D.cameras.length=0,Fe=!0);for(let qe=0;qe<ie.length;qe++){let ot=ie[qe],Qe=null;if(g!==null)Qe=g.getViewport(ot);else{let At=f.getViewSubImage(d,ot);Qe=At.viewport,qe===0&&(e.setRenderTargetTextures(_,At.colorTexture,At.depthStencilTexture),e.setRenderTarget(_))}let Ze=I[qe];Ze===void 0&&(Ze=new Jt,Ze.layers.enable(qe),Ze.viewport=new st,I[qe]=Ze),Ze.matrix.fromArray(ot.transform.matrix),Ze.matrix.decompose(Ze.position,Ze.quaternion,Ze.scale),Ze.projectionMatrix.fromArray(ot.projectionMatrix),Ze.projectionMatrixInverse.copy(Ze.projectionMatrix).invert(),Ze.viewport.set(Qe.x,Qe.y,Qe.width,Qe.height),qe===0&&(D.matrix.copy(Ze.matrix),D.matrix.decompose(D.position,D.quaternion,D.scale)),Fe===!0&&D.cameras.push(Ze)}let Be=s.enabledFeatures;if(Be&&Be.includes("depth-sensing")&&s.depthUsage=="gpu-optimized"&&y){f=n.getBinding();let qe=f.getDepthInformation(ie[0]);qe&&qe.isValid&&qe.texture&&p.init(qe,s.renderState)}if(Be&&Be.includes("camera-access")&&y){e.state.unbindTexture(),f=n.getBinding();for(let qe=0;qe<ie.length;qe++){let ot=ie[qe].camera;if(ot){let Qe=x[ot];Qe||(Qe=new Lr,x[ot]=Qe);let Ze=f.getCameraImage(ot);Qe.sourceTexture=Ze}}}}for(let ie=0;ie<A.length;ie++){let Fe=w[ie],Be=A[ie];Fe!==null&&Be!==void 0&&Be.update(Fe,oe,c||o)}$e&&$e(J,oe),oe.detectedPlanes&&n.dispatchEvent({type:"planesdetected",data:oe}),m=null}h(tt,"onAnimationFrame");let Ke=new Bm;Ke.setAnimationLoop(tt),this.setAnimationLoop=function(J){$e=J},this.dispose=function(){}}};h(Rd,"WebXRManager");var vd=Rd,uS=new ct,Wm=new Oe;Wm.set(-1,0,0,0,1,0,0,0,1);function dS(i,e){function t(p,x){p.matrixAutoUpdate===!0&&p.updateMatrix(),x.value.copy(p.matrix)}h(t,"refreshTransformUniform");function n(p,x){x.color.getRGB(p.fogColor.value,Xh(i)),x.isFog?(p.fogNear.value=x.near,p.fogFar.value=x.far):x.isFogExp2&&(p.fogDensity.value=x.density)}h(n,"refreshFogUniforms");function s(p,x,S,M,_){x.isNodeMaterial?x.uniformsNeedUpdate=!1:x.isMeshBasicMaterial?r(p,x):x.isMeshLambertMaterial?(r(p,x),x.envMap&&(p.envMapIntensity.value=x.envMapIntensity)):x.isMeshToonMaterial?(r(p,x),f(p,x)):x.isMeshPhongMaterial?(r(p,x),u(p,x),x.envMap&&(p.envMapIntensity.value=x.envMapIntensity)):x.isMeshStandardMaterial?(r(p,x),d(p,x),x.isMeshPhysicalMaterial&&g(p,x,_)):x.isMeshMatcapMaterial?(r(p,x),m(p,x)):x.isMeshDepthMaterial?r(p,x):x.isMeshDistanceMaterial?(r(p,x),y(p,x)):x.isMeshNormalMaterial?r(p,x):x.isLineBasicMaterial?(o(p,x),x.isLineDashedMaterial&&a(p,x)):x.isPointsMaterial?l(p,x,S,M):x.isSpriteMaterial?c(p,x):x.isShadowMaterial?(p.color.value.copy(x.color),p.opacity.value=x.opacity):x.isShaderMaterial&&(x.uniformsNeedUpdate=!1)}h(s,"refreshMaterialUniforms");function r(p,x){p.opacity.value=x.opacity,x.color&&p.diffuse.value.copy(x.color),x.emissive&&p.emissive.value.copy(x.emissive).multiplyScalar(x.emissiveIntensity),x.map&&(p.map.value=x.map,t(x.map,p.mapTransform)),x.alphaMap&&(p.alphaMap.value=x.alphaMap,t(x.alphaMap,p.alphaMapTransform)),x.bumpMap&&(p.bumpMap.value=x.bumpMap,t(x.bumpMap,p.bumpMapTransform),p.bumpScale.value=x.bumpScale,x.side===nn&&(p.bumpScale.value*=-1)),x.normalMap&&(p.normalMap.value=x.normalMap,t(x.normalMap,p.normalMapTransform),p.normalScale.value.copy(x.normalScale),x.side===nn&&p.normalScale.value.negate()),x.displacementMap&&(p.displacementMap.value=x.displacementMap,t(x.displacementMap,p.displacementMapTransform),p.displacementScale.value=x.displacementScale,p.displacementBias.value=x.displacementBias),x.emissiveMap&&(p.emissiveMap.value=x.emissiveMap,t(x.emissiveMap,p.emissiveMapTransform)),x.specularMap&&(p.specularMap.value=x.specularMap,t(x.specularMap,p.specularMapTransform)),x.alphaTest>0&&(p.alphaTest.value=x.alphaTest);let S=e.get(x),M=S.envMap,_=S.envMapRotation;M&&(p.envMap.value=M,p.envMapRotation.value.setFromMatrix4(uS.makeRotationFromEuler(_)).transpose(),M.isCubeTexture&&M.isRenderTargetTexture===!1&&p.envMapRotation.value.premultiply(Wm),p.reflectivity.value=x.reflectivity,p.ior.value=x.ior,p.refractionRatio.value=x.refractionRatio),x.lightMap&&(p.lightMap.value=x.lightMap,p.lightMapIntensity.value=x.lightMapIntensity,t(x.lightMap,p.lightMapTransform)),x.aoMap&&(p.aoMap.value=x.aoMap,p.aoMapIntensity.value=x.aoMapIntensity,t(x.aoMap,p.aoMapTransform))}h(r,"refreshUniformsCommon");function o(p,x){p.diffuse.value.copy(x.color),p.opacity.value=x.opacity,x.map&&(p.map.value=x.map,t(x.map,p.mapTransform))}h(o,"refreshUniformsLine");function a(p,x){p.dashSize.value=x.dashSize,p.totalSize.value=x.dashSize+x.gapSize,p.scale.value=x.scale}h(a,"refreshUniformsDash");function l(p,x,S,M){p.diffuse.value.copy(x.color),p.opacity.value=x.opacity,p.size.value=x.size*S,p.scale.value=M*.5,x.map&&(p.map.value=x.map,t(x.map,p.uvTransform)),x.alphaMap&&(p.alphaMap.value=x.alphaMap,t(x.alphaMap,p.alphaMapTransform)),x.alphaTest>0&&(p.alphaTest.value=x.alphaTest)}h(l,"refreshUniformsPoints");function c(p,x){p.diffuse.value.copy(x.color),p.opacity.value=x.opacity,p.rotation.value=x.rotation,x.map&&(p.map.value=x.map,t(x.map,p.mapTransform)),x.alphaMap&&(p.alphaMap.value=x.alphaMap,t(x.alphaMap,p.alphaMapTransform)),x.alphaTest>0&&(p.alphaTest.value=x.alphaTest)}h(c,"refreshUniformsSprites");function u(p,x){p.specular.value.copy(x.specular),p.shininess.value=Math.max(x.shininess,1e-4)}h(u,"refreshUniformsPhong");function f(p,x){x.gradientMap&&(p.gradientMap.value=x.gradientMap)}h(f,"refreshUniformsToon");function d(p,x){p.metalness.value=x.metalness,x.metalnessMap&&(p.metalnessMap.value=x.metalnessMap,t(x.metalnessMap,p.metalnessMapTransform)),p.roughness.value=x.roughness,x.roughnessMap&&(p.roughnessMap.value=x.roughnessMap,t(x.roughnessMap,p.roughnessMapTransform)),x.envMap&&(p.envMapIntensity.value=x.envMapIntensity)}h(d,"refreshUniformsStandard");function g(p,x,S){p.ior.value=x.ior,x.sheen>0&&(p.sheenColor.value.copy(x.sheenColor).multiplyScalar(x.sheen),p.sheenRoughness.value=x.sheenRoughness,x.sheenColorMap&&(p.sheenColorMap.value=x.sheenColorMap,t(x.sheenColorMap,p.sheenColorMapTransform)),x.sheenRoughnessMap&&(p.sheenRoughnessMap.value=x.sheenRoughnessMap,t(x.sheenRoughnessMap,p.sheenRoughnessMapTransform))),x.clearcoat>0&&(p.clearcoat.value=x.clearcoat,p.clearcoatRoughness.value=x.clearcoatRoughness,x.clearcoatMap&&(p.clearcoatMap.value=x.clearcoatMap,t(x.clearcoatMap,p.clearcoatMapTransform)),x.clearcoatRoughnessMap&&(p.clearcoatRoughnessMap.value=x.clearcoatRoughnessMap,t(x.clearcoatRoughnessMap,p.clearcoatRoughnessMapTransform)),x.clearcoatNormalMap&&(p.clearcoatNormalMap.value=x.clearcoatNormalMap,t(x.clearcoatNormalMap,p.clearcoatNormalMapTransform),p.clearcoatNormalScale.value.copy(x.clearcoatNormalScale),x.side===nn&&p.clearcoatNormalScale.value.negate())),x.dispersion>0&&(p.dispersion.value=x.dispersion),x.iridescence>0&&(p.iridescence.value=x.iridescence,p.iridescenceIOR.value=x.iridescenceIOR,p.iridescenceThicknessMinimum.value=x.iridescenceThicknessRange[0],p.iridescenceThicknessMaximum.value=x.iridescenceThicknessRange[1],x.iridescenceMap&&(p.iridescenceMap.value=x.iridescenceMap,t(x.iridescenceMap,p.iridescenceMapTransform)),x.iridescenceThicknessMap&&(p.iridescenceThicknessMap.value=x.iridescenceThicknessMap,t(x.iridescenceThicknessMap,p.iridescenceThicknessMapTransform))),x.transmission>0&&(p.transmission.value=x.transmission,p.transmissionSamplerMap.value=S.texture,p.transmissionSamplerSize.value.set(S.width,S.height),x.transmissionMap&&(p.transmissionMap.value=x.transmissionMap,t(x.transmissionMap,p.transmissionMapTransform)),p.thickness.value=x.thickness,x.thicknessMap&&(p.thicknessMap.value=x.thicknessMap,t(x.thicknessMap,p.thicknessMapTransform)),p.attenuationDistance.value=x.attenuationDistance,p.attenuationColor.value.copy(x.attenuationColor)),x.anisotropy>0&&(p.anisotropyVector.value.set(x.anisotropy*Math.cos(x.anisotropyRotation),x.anisotropy*Math.sin(x.anisotropyRotation)),x.anisotropyMap&&(p.anisotropyMap.value=x.anisotropyMap,t(x.anisotropyMap,p.anisotropyMapTransform))),p.specularIntensity.value=x.specularIntensity,p.specularColor.value.copy(x.specularColor),x.specularColorMap&&(p.specularColorMap.value=x.specularColorMap,t(x.specularColorMap,p.specularColorMapTransform)),x.specularIntensityMap&&(p.specularIntensityMap.value=x.specularIntensityMap,t(x.specularIntensityMap,p.specularIntensityMapTransform))}h(g,"refreshUniformsPhysical");function m(p,x){x.matcap&&(p.matcap.value=x.matcap)}h(m,"refreshUniformsMatcap");function y(p,x){let S=e.get(x).light;p.referencePosition.value.setFromMatrixPosition(S.matrixWorld),p.nearDistance.value=S.shadow.camera.near,p.farDistance.value=S.shadow.camera.far}return h(y,"refreshUniformsDistance"),{refreshFogUniforms:n,refreshMaterialUniforms:s}}h(dS,"WebGLMaterials");function fS(i,e,t,n){let s={},r={},o=[],a=i.getParameter(i.MAX_UNIFORM_BUFFER_BINDINGS);function l(_,A){let w=A.program;n.uniformBlockBinding(_,w)}h(l,"bind");function c(_,A){let w=s[_.id];w===void 0&&(p(_),w=u(_),s[_.id]=w,_.addEventListener("dispose",S));let T=A.program;n.updateUBOMapping(_,T);let v=e.render.frame;r[_.id]!==v&&(d(_),r[_.id]=v)}h(c,"update");function u(_){let A=f();_.__bindingPointIndex=A;let w=i.createBuffer(),T=_.__size,v=_.usage;return i.bindBuffer(i.UNIFORM_BUFFER,w),i.bufferData(i.UNIFORM_BUFFER,T,v),i.bindBuffer(i.UNIFORM_BUFFER,null),i.bindBufferBase(i.UNIFORM_BUFFER,A,w),w}h(u,"createBuffer");function f(){for(let _=0;_<a;_++)if(o.indexOf(_)===-1)return o.push(_),_;return Ne("WebGLRenderer: Maximum number of simultaneously usable uniforms groups reached."),0}h(f,"allocateBindingPointIndex");function d(_){let A=s[_.id],w=_.uniforms,T=_.__cache;i.bindBuffer(i.UNIFORM_BUFFER,A);for(let v=0,P=w.length;v<P;v++){let C=w[v];if(Array.isArray(C))for(let I=0,D=C.length;I<D;I++)g(C[I],v,I,T);else g(C,v,0,T)}i.bindBuffer(i.UNIFORM_BUFFER,null)}h(d,"updateBufferData");function g(_,A,w,T){if(y(_,A,w,T)===!0){let v=_.__offset,P=_.value;if(Array.isArray(P)){let C=0;for(let I=0;I<P.length;I++){let D=P[I],L=x(D);m(D,_.__data,C),typeof D!="number"&&typeof D!="boolean"&&!D.isMatrix3&&!ArrayBuffer.isView(D)&&(C+=L.storage/Float32Array.BYTES_PER_ELEMENT)}}else m(P,_.__data,0);i.bufferSubData(i.UNIFORM_BUFFER,v,_.__data)}}h(g,"updateUniform");function m(_,A,w){typeof _=="number"||typeof _=="boolean"?A[0]=_:_.isMatrix3?(A[0]=_.elements[0],A[1]=_.elements[1],A[2]=_.elements[2],A[3]=0,A[4]=_.elements[3],A[5]=_.elements[4],A[6]=_.elements[5],A[7]=0,A[8]=_.elements[6],A[9]=_.elements[7],A[10]=_.elements[8],A[11]=0):ArrayBuffer.isView(_)?A.set(new _.constructor(_.buffer,_.byteOffset,A.length)):_.toArray(A,w)}h(m,"writeUniformValue");function y(_,A,w,T){let v=_.value,P=A+"_"+w;if(T[P]===void 0)return typeof v=="number"||typeof v=="boolean"?T[P]=v:ArrayBuffer.isView(v)?T[P]=v.slice():T[P]=v.clone(),!0;{let C=T[P];if(typeof v=="number"||typeof v=="boolean"){if(C!==v)return T[P]=v,!0}else{if(ArrayBuffer.isView(v))return!0;if(C.equals(v)===!1)return C.copy(v),!0}}return!1}h(y,"hasUniformChanged");function p(_){let A=_.uniforms,w=0,T=16;for(let P=0,C=A.length;P<C;P++){let I=Array.isArray(A[P])?A[P]:[A[P]];for(let D=0,L=I.length;D<L;D++){let H=I[D],F=Array.isArray(H.value)?H.value:[H.value];for(let Y=0,k=F.length;Y<k;Y++){let Z=F[Y],ee=x(Z),re=w%T,le=re%ee.boundary,_e=re+le;w+=le,_e!==0&&T-_e<ee.storage&&(w+=T-_e),H.__data=new Float32Array(ee.storage/Float32Array.BYTES_PER_ELEMENT),H.__offset=w,w+=ee.storage}}}let v=w%T;return v>0&&(w+=T-v),_.__size=w,_.__cache={},this}h(p,"prepareUniformsGroup");function x(_){let A={boundary:0,storage:0};return typeof _=="number"||typeof _=="boolean"?(A.boundary=4,A.storage=4):_.isVector2?(A.boundary=8,A.storage=8):_.isVector3||_.isColor?(A.boundary=16,A.storage=12):_.isVector4?(A.boundary=16,A.storage=16):_.isMatrix3?(A.boundary=48,A.storage=48):_.isMatrix4?(A.boundary=64,A.storage=64):_.isTexture?Ce("WebGLRenderer: Texture samplers can not be part of an uniforms group."):ArrayBuffer.isView(_)?(A.boundary=16,A.storage=_.byteLength):Ce("WebGLRenderer: Unsupported uniform value type.",_),A}h(x,"getUniformSize");function S(_){let A=_.target;A.removeEventListener("dispose",S);let w=o.indexOf(A.__bindingPointIndex);o.splice(w,1),i.deleteBuffer(s[A.id]),delete s[A.id],delete r[A.id]}h(S,"onUniformsGroupsDispose");function M(){for(let _ in s)i.deleteBuffer(s[_]);o=[],s={},r={}}return h(M,"dispose"),{bind:l,update:c,dispose:M}}h(fS,"WebGLUniformsGroups");var pS=new Uint16Array([12469,15057,12620,14925,13266,14620,13807,14376,14323,13990,14545,13625,14713,13328,14840,12882,14931,12528,14996,12233,15039,11829,15066,11525,15080,11295,15085,10976,15082,10705,15073,10495,13880,14564,13898,14542,13977,14430,14158,14124,14393,13732,14556,13410,14702,12996,14814,12596,14891,12291,14937,11834,14957,11489,14958,11194,14943,10803,14921,10506,14893,10278,14858,9960,14484,14039,14487,14025,14499,13941,14524,13740,14574,13468,14654,13106,14743,12678,14818,12344,14867,11893,14889,11509,14893,11180,14881,10751,14852,10428,14812,10128,14765,9754,14712,9466,14764,13480,14764,13475,14766,13440,14766,13347,14769,13070,14786,12713,14816,12387,14844,11957,14860,11549,14868,11215,14855,10751,14825,10403,14782,10044,14729,9651,14666,9352,14599,9029,14967,12835,14966,12831,14963,12804,14954,12723,14936,12564,14917,12347,14900,11958,14886,11569,14878,11247,14859,10765,14828,10401,14784,10011,14727,9600,14660,9289,14586,8893,14508,8533,15111,12234,15110,12234,15104,12216,15092,12156,15067,12010,15028,11776,14981,11500,14942,11205,14902,10752,14861,10393,14812,9991,14752,9570,14682,9252,14603,8808,14519,8445,14431,8145,15209,11449,15208,11451,15202,11451,15190,11438,15163,11384,15117,11274,15055,10979,14994,10648,14932,10343,14871,9936,14803,9532,14729,9218,14645,8742,14556,8381,14461,8020,14365,7603,15273,10603,15272,10607,15267,10619,15256,10631,15231,10614,15182,10535,15118,10389,15042,10167,14963,9787,14883,9447,14800,9115,14710,8665,14615,8318,14514,7911,14411,7507,14279,7198,15314,9675,15313,9683,15309,9712,15298,9759,15277,9797,15229,9773,15166,9668,15084,9487,14995,9274,14898,8910,14800,8539,14697,8234,14590,7790,14479,7409,14367,7067,14178,6621,15337,8619,15337,8631,15333,8677,15325,8769,15305,8871,15264,8940,15202,8909,15119,8775,15022,8565,14916,8328,14804,8009,14688,7614,14569,7287,14448,6888,14321,6483,14088,6171,15350,7402,15350,7419,15347,7480,15340,7613,15322,7804,15287,7973,15229,8057,15148,8012,15046,7846,14933,7611,14810,7357,14682,7069,14552,6656,14421,6316,14251,5948,14007,5528,15356,5942,15356,5977,15353,6119,15348,6294,15332,6551,15302,6824,15249,7044,15171,7122,15070,7050,14949,6861,14818,6611,14679,6349,14538,6067,14398,5651,14189,5311,13935,4958,15359,4123,15359,4153,15356,4296,15353,4646,15338,5160,15311,5508,15263,5829,15188,6042,15088,6094,14966,6001,14826,5796,14678,5543,14527,5287,14377,4985,14133,4586,13869,4257,15360,1563,15360,1642,15358,2076,15354,2636,15341,3350,15317,4019,15273,4429,15203,4732,15105,4911,14981,4932,14836,4818,14679,4621,14517,4386,14359,4156,14083,3795,13808,3437,15360,122,15360,137,15358,285,15355,636,15344,1274,15322,2177,15281,2765,15215,3223,15120,3451,14995,3569,14846,3567,14681,3466,14511,3305,14344,3121,14037,2800,13753,2467,15360,0,15360,1,15359,21,15355,89,15346,253,15325,479,15287,796,15225,1148,15133,1492,15008,1749,14856,1882,14685,1886,14506,1783,14324,1608,13996,1398,13702,1183]),Jn=null;function mS(){return Jn===null&&(Jn=new Ea(pS,16,16,Gi,Zn),Jn.name="DFG_LUT",Jn.minFilter=Vt,Jn.magFilter=Vt,Jn.wrapS=Xn,Jn.wrapT=Xn,Jn.generateMipmaps=!1,Jn.needsUpdate=!0),Jn}h(mS,"getDFGLUT");var Cd=class Cd{constructor(e={}){let{canvas:t=om(),context:n=null,depth:s=!0,stencil:r=!1,alpha:o=!1,antialias:a=!1,premultipliedAlpha:l=!0,preserveDrawingBuffer:c=!1,powerPreference:u="default",failIfMajorPerformanceCaveat:f=!1,reversedDepthBuffer:d=!1,outputBufferType:g=yn}=e;this.isWebGLRenderer=!0;let m;if(n!==null){if(typeof WebGLRenderingContext<"u"&&n instanceof WebGLRenderingContext)throw new Error("THREE.WebGLRenderer: WebGL 1 is not supported since r163.");m=n.getContextAttributes().alpha}else m=o;let y=g,p=new Set([dl,ul,hl]),x=new Set([yn,Fn,Ys,$s,ll,cl]),S=new Uint32Array(4),M=new Int32Array(4),_=new O,A=null,w=null,T=[],v=[],P=null;this.domElement=t,this.debug={checkShaderErrors:!0,onShaderError:null},this.autoClear=!0,this.autoClearColor=!0,this.autoClearDepth=!0,this.autoClearStencil=!0,this.sortObjects=!0,this.clippingPlanes=[],this.localClippingEnabled=!1,this.toneMapping=Dn,this.toneMappingExposure=1,this.transmissionResolutionScale=1;let C=this,I=!1,D=null,L=null,H=null,F=null;this._outputColorSpace=Zt;let Y=0,k=0,Z=null,ee=-1,re=null,le=new st,_e=new st,$e=null,tt=new Xe(0),Ke=0,J=t.width,oe=t.height,ie=1,Fe=null,Be=null,Le=new st(0,0,J,oe),St=new st(0,0,J,oe),qe=!1,ot=new Rr,Qe=!1,Ze=!1,At=new ct,Ct=new O,Ut=new st,kt={background:null,fog:null,environment:null,overrideMaterial:null,isScene:!0},xt=!1;function Pt(){return Z===null?ie:1}h(Pt,"getTargetPixelRatio");let B=n;function on(E,z){return t.getContext(E,z)}h(on,"getContext");try{let E={alpha:!0,depth:s,stencil:r,antialias:a,premultipliedAlpha:l,preserveDrawingBuffer:c,powerPreference:u,failIfMajorPerformanceCaveat:f};if("setAttribute"in t&&t.setAttribute("data-engine",`three.js r${il}`),t.addEventListener("webglcontextlost",yt,!1),t.addEventListener("webglcontextrestored",ut,!1),t.addEventListener("webglcontextcreationerror",On,!1),B===null){let z="webgl2";if(B=on(z,E),B===null)throw on(z)?new Error("THREE.WebGLRenderer: Error creating WebGL context with your selected attributes."):new Error("THREE.WebGLRenderer: Error creating WebGL context.")}}catch(E){throw Ne("WebGLRenderer: "+E.message),E}let nt,R,b,V,X,$,se,he,K,Q,ue,Ee,pe,de,Pe,De,ze,N,ce,j,fe,xe,te;function we(){nt=new S_(B),nt.init(),fe=new lS(B,nt),R=new p_(B,nt,e,fe),b=new oS(B,nt),R.reversedDepthBuffer&&d&&b.buffers.depth.setReversed(!0),L=B.createFramebuffer(),H=B.createFramebuffer(),F=B.createFramebuffer(),V=new E_(B),X=new qb,$=new aS(B,nt,b,X,R,fe,V),se=new b_(C),he=new R0(B),xe=new d_(B,he),K=new M_(B,he,V,xe),Q=new A_(B,K,he,xe,V),N=new T_(B,R,$),Pe=new m_(X),ue=new Xb(C,se,nt,R,xe,Pe),Ee=new dS(C,X),pe=new $b,de=new eS(nt),ze=new u_(C,se,b,Q,m,l),De=new rS(C,Q,R),te=new fS(B,V,R,b),ce=new f_(B,nt,V),j=new w_(B,nt,V),V.programs=ue.programs,C.capabilities=R,C.extensions=nt,C.properties=X,C.renderLists=pe,C.shadowMap=De,C.state=b,C.info=V}h(we,"initGLContext"),we(),y!==yn&&(P=new R_(y,t.width,t.height,a,s,r));let be=new vd(C,B);this.xr=be,this.getContext=function(){return B},this.getContextAttributes=function(){return B.getContextAttributes()},this.forceContextLoss=function(){let E=nt.get("WEBGL_lose_context");E&&E.loseContext()},this.forceContextRestore=function(){let E=nt.get("WEBGL_lose_context");E&&E.restoreContext()},this.getPixelRatio=function(){return ie},this.setPixelRatio=function(E){E!==void 0&&(ie=E,this.setSize(J,oe,!1))},this.getSize=function(E){return E.set(J,oe)},this.setSize=function(E,z,q=!0){if(be.isPresenting){Ce("WebGLRenderer: Can't change size while VR device is presenting.");return}J=E,oe=z,t.width=Math.floor(E*ie),t.height=Math.floor(z*ie),q===!0&&(t.style.width=E+"px",t.style.height=z+"px"),P!==null&&P.setSize(t.width,t.height),this.setViewport(0,0,E,z)},this.getDrawingBufferSize=function(E){return E.set(J*ie,oe*ie).floor()},this.setDrawingBufferSize=function(E,z,q){J=E,oe=z,ie=q,t.width=Math.floor(E*q),t.height=Math.floor(z*q),this.setViewport(0,0,E,z)},this.setEffects=function(E){if(y===yn){Ne("WebGLRenderer: setEffects() requires outputBufferType set to HalfFloatType or FloatType.");return}if(E){for(let z=0;z<E.length;z++)if(E[z].isOutputPass===!0){Ce("WebGLRenderer: OutputPass is not needed in setEffects(). Tone mapping and color space conversion are applied automatically.");break}}P.setEffects(E||[])},this.getCurrentViewport=function(E){return E.copy(le)},this.getViewport=function(E){return E.copy(Le)},this.setViewport=function(E,z,q,G){E.isVector4?Le.set(E.x,E.y,E.z,E.w):Le.set(E,z,q,G),b.viewport(le.copy(Le).multiplyScalar(ie).round())},this.getScissor=function(E){return E.copy(St)},this.setScissor=function(E,z,q,G){E.isVector4?St.set(E.x,E.y,E.z,E.w):St.set(E,z,q,G),b.scissor(_e.copy(St).multiplyScalar(ie).round())},this.getScissorTest=function(){return qe},this.setScissorTest=function(E){b.setScissorTest(qe=E)},this.setOpaqueSort=function(E){Fe=E},this.setTransparentSort=function(E){Be=E},this.getClearColor=function(E){return E.copy(ze.getClearColor())},this.setClearColor=function(){ze.setClearColor(...arguments)},this.getClearAlpha=function(){return ze.getClearAlpha()},this.setClearAlpha=function(){ze.setClearAlpha(...arguments)},this.clear=function(E=!0,z=!0,q=!0){let G=0;if(E){let W=!1;if(Z!==null){let ge=Z.texture.format;W=p.has(ge)}if(W){let ge=Z.texture.type,ve=x.has(ge),me=ze.getClearColor(),Se=ze.getClearAlpha(),Te=me.r,ke=me.g,Ge=me.b;ve?(S[0]=Te,S[1]=ke,S[2]=Ge,S[3]=Se,B.clearBufferuiv(B.COLOR,0,S)):(M[0]=Te,M[1]=ke,M[2]=Ge,M[3]=Se,B.clearBufferiv(B.COLOR,0,M))}else G|=B.COLOR_BUFFER_BIT}z&&(G|=B.DEPTH_BUFFER_BIT,this.state.buffers.depth.setMask(!0)),q&&(G|=B.STENCIL_BUFFER_BIT,this.state.buffers.stencil.setMask(4294967295)),G!==0&&B.clear(G)},this.clearColor=function(){this.clear(!0,!1,!1)},this.clearDepth=function(){this.clear(!1,!0,!1)},this.clearStencil=function(){this.clear(!1,!1,!0)},this.setNodesHandler=function(E){E.setRenderer(this),D=E},this.dispose=function(){t.removeEventListener("webglcontextlost",yt,!1),t.removeEventListener("webglcontextrestored",ut,!1),t.removeEventListener("webglcontextcreationerror",On,!1),ze.dispose(),pe.dispose(),de.dispose(),X.dispose(),se.dispose(),Q.dispose(),xe.dispose(),te.dispose(),ue.dispose(),be.dispose(),be.removeEventListener("sessionstart",wf),be.removeEventListener("sessionend",Ef),Yi.stop()};function yt(E){E.preventDefault(),Sr("WebGLRenderer: Context Lost."),I=!0}h(yt,"onContextLost");function ut(){Sr("WebGLRenderer: Context Restored."),I=!1;let E=V.autoReset,z=De.enabled,q=De.autoUpdate,G=De.needsUpdate,W=De.type;we(),V.autoReset=E,De.enabled=z,De.autoUpdate=q,De.needsUpdate=G,De.type=W}h(ut,"onContextRestore");function On(E){Ne("WebGLRenderer: A WebGL context could not be created. Reason: ",E.statusMessage)}h(On,"onContextCreationError");function Bn(E){let z=E.target;z.removeEventListener("dispose",Bn),Ng(z)}h(Bn,"onMaterialDispose");function Ng(E){Ug(E),X.remove(E)}h(Ng,"deallocateMaterial");function Ug(E){let z=X.get(E).programs;z!==void 0&&(z.forEach(function(q){ue.releaseProgram(q)}),E.isShaderMaterial&&ue.releaseShaderCache(E))}h(Ug,"releaseMaterialProgramReferences"),this.renderBufferDirect=function(E,z,q,G,W,ge){z===null&&(z=kt);let ve=W.isMesh&&W.matrixWorld.determinantAffine()<0,me=zg(E,z,q,G,W);b.setMaterial(G,ve);let Se=q.index,Te=1;if(G.wireframe===!0){if(Se=K.getWireframeAttribute(q),Se===void 0)return;Te=2}let ke=q.drawRange,Ge=q.attributes.position,Ae=ke.start*Te,rt=(ke.start+ke.count)*Te;ge!==null&&(Ae=Math.max(Ae,ge.start*Te),rt=Math.min(rt,(ge.start+ge.count)*Te)),Se!==null?(Ae=Math.max(Ae,0),rt=Math.min(rt,Se.count)):Ge!=null&&(Ae=Math.max(Ae,0),rt=Math.min(rt,Ge.count));let Mt=rt-Ae;if(Mt<0||Mt===1/0)return;xe.setup(W,G,me,q,Se);let vt,at=ce;if(Se!==null&&(vt=he.get(Se),at=j,at.setIndex(vt)),W.isMesh)G.wireframe===!0?(b.setLineWidth(G.wireframeLinewidth*Pt()),at.setMode(B.LINES)):at.setMode(B.TRIANGLES);else if(W.isLine){let qt=G.linewidth;qt===void 0&&(qt=1),b.setLineWidth(qt*Pt()),W.isLineSegments?at.setMode(B.LINES):W.isLineLoop?at.setMode(B.LINE_LOOP):at.setMode(B.LINE_STRIP)}else W.isPoints?at.setMode(B.POINTS):W.isSprite&&at.setMode(B.TRIANGLES);if(W.isBatchedMesh)if(nt.get("WEBGL_multi_draw"))at.renderMultiDraw(W._multiDrawStarts,W._multiDrawCounts,W._multiDrawCount);else{let qt=W._multiDrawStarts,ye=W._multiDrawCounts,hn=W._multiDrawCount,Je=Se?he.get(Se).bytesPerElement:1,vn=X.get(G).currentProgram.getUniforms();for(let zn=0;zn<hn;zn++)vn.setValue(B,"_gl_DrawID",zn),at.render(qt[zn]/Je,ye[zn])}else if(W.isInstancedMesh)at.renderInstances(Ae,Mt,W.count);else if(q.isInstancedBufferGeometry){let qt=q._maxInstanceCount!==void 0?q._maxInstanceCount:1/0,ye=Math.min(q.instanceCount,qt);at.renderInstances(Ae,Mt,ye)}else at.render(Ae,Mt)};function Mf(E,z,q){E.transparent===!0&&E.side===cn&&E.forceSinglePass===!1?(E.side=nn,E.needsUpdate=!0,yo(E,z,q),E.side=hi,E.needsUpdate=!0,yo(E,z,q),E.side=cn):yo(E,z,q)}h(Mf,"prepareMaterial"),this.compile=function(E,z,q=null){q===null&&(q=E),w=de.get(q),w.init(z),v.push(w),q.traverseVisible(function(W){W.isLight&&W.layers.test(z.layers)&&(w.pushLight(W),W.castShadow&&w.pushShadow(W))}),E!==q&&E.traverseVisible(function(W){W.isLight&&W.layers.test(z.layers)&&(w.pushLight(W),W.castShadow&&w.pushShadow(W))}),w.setupLights();let G=new Set;return E.traverse(function(W){if(!(W.isMesh||W.isPoints||W.isLine||W.isSprite))return;let ge=W.material;if(ge)if(Array.isArray(ge))for(let ve=0;ve<ge.length;ve++){let me=ge[ve];Mf(me,q,W),G.add(me)}else Mf(ge,q,W),G.add(ge)}),w=v.pop(),G},this.compileAsync=function(E,z,q=null){let G=this.compile(E,z,q);return new Promise(W=>{function ge(){if(G.forEach(function(ve){X.get(ve).currentProgram.isReady()&&G.delete(ve)}),G.size===0){W(E);return}setTimeout(ge,10)}h(ge,"checkMaterialsReady"),nt.get("KHR_parallel_shader_compile")!==null?ge():setTimeout(ge,10)})};let Pc=null;function Og(E){Pc&&Pc(E)}h(Og,"onAnimationFrame");function wf(){Yi.stop()}h(wf,"onXRSessionStart");function Ef(){Yi.start()}h(Ef,"onXRSessionEnd");let Yi=new Bm;Yi.setAnimationLoop(Og),typeof self<"u"&&Yi.setContext(self),this.setAnimationLoop=function(E){Pc=E,be.setAnimationLoop(E),E===null?Yi.stop():Yi.start()},be.addEventListener("sessionstart",wf),be.addEventListener("sessionend",Ef),this.render=function(E,z){if(z!==void 0&&z.isCamera!==!0){Ne("WebGLRenderer.render: camera is not an instance of THREE.Camera.");return}if(I===!0)return;D!==null&&D.renderStart(E,z);let q=be.enabled===!0&&be.isPresenting===!0,G=P!==null&&(Z===null||q)&&P.begin(C,Z);if(E.matrixWorldAutoUpdate===!0&&E.updateMatrixWorld(),z.parent===null&&z.matrixWorldAutoUpdate===!0&&z.updateMatrixWorld(),be.enabled===!0&&be.isPresenting===!0&&(P===null||P.isCompositing()===!1)&&(be.cameraAutoUpdate===!0&&be.updateCamera(z),z=be.getCamera()),E.isScene===!0&&E.onBeforeRender(C,E,z,Z),w=de.get(E,v.length),w.init(z),w.state.textureUnits=$.getTextureUnits(),v.push(w),At.multiplyMatrices(z.projectionMatrix,z.matrixWorldInverse),ot.setFromProjectionMatrix(At,Rn,z.reversedDepth),Ze=this.localClippingEnabled,Qe=Pe.init(this.clippingPlanes,Ze),A=pe.get(E,T.length),A.init(),T.push(A),be.enabled===!0&&be.isPresenting===!0){let ve=C.xr.getDepthSensingMesh();ve!==null&&Rc(ve,z,-1/0,C.sortObjects)}Rc(E,z,0,C.sortObjects),A.finish(),C.sortObjects===!0&&A.sort(Fe,Be,z.reversedDepth),xt=be.enabled===!1||be.isPresenting===!1||be.hasDepthSensing()===!1,xt&&ze.addToRenderList(A,E),this.info.render.frame++,this.info.autoReset===!0&&this.info.reset(),Qe===!0&&Pe.beginShadows();let W=w.state.shadowsArray;if(De.render(W,E,z),Qe===!0&&Pe.endShadows(),(G&&P.hasRenderPass())===!1){let ve=A.opaque,me=A.transmissive;if(w.setupLights(),z.isArrayCamera){let Se=z.cameras;if(me.length>0)for(let Te=0,ke=Se.length;Te<ke;Te++){let Ge=Se[Te];Af(ve,me,E,Ge)}xt&&ze.render(E);for(let Te=0,ke=Se.length;Te<ke;Te++){let Ge=Se[Te];Tf(A,E,Ge,Ge.viewport)}}else me.length>0&&Af(ve,me,E,z),xt&&ze.render(E),Tf(A,E,z)}Z!==null&&k===0&&($.updateMultisampleRenderTarget(Z),$.updateRenderTargetMipmap(Z)),G&&P.end(C),E.isScene===!0&&E.onAfterRender(C,E,z),xe.resetDefaultState(),ee=-1,re=null,v.pop(),v.length>0?(w=v[v.length-1],$.setTextureUnits(w.state.textureUnits),Qe===!0&&Pe.setGlobalState(C.clippingPlanes,w.state.camera)):w=null,T.pop(),T.length>0?A=T[T.length-1]:A=null,D!==null&&D.renderEnd()};function Rc(E,z,q,G){if(E.visible===!1)return;if(E.layers.test(z.layers)){if(E.isGroup)q=E.renderOrder;else if(E.isLOD)E.autoUpdate===!0&&E.update(z);else if(E.isLightProbeGrid)w.pushLightProbeGrid(E);else if(E.isLight)w.pushLight(E),E.castShadow&&w.pushShadow(E);else if(E.isSprite){if(!E.frustumCulled||ot.intersectsSprite(E)){G&&Ut.setFromMatrixPosition(E.matrixWorld).applyMatrix4(At);let ve=Q.update(E),me=E.material;me.visible&&A.push(E,ve,me,q,Ut.z,null)}}else if((E.isMesh||E.isLine||E.isPoints)&&(!E.frustumCulled||ot.intersectsObject(E))){let ve=Q.update(E),me=E.material;if(G&&(E.boundingSphere!==void 0?(E.boundingSphere===null&&E.computeBoundingSphere(),Ut.copy(E.boundingSphere.center)):(ve.boundingSphere===null&&ve.computeBoundingSphere(),Ut.copy(ve.boundingSphere.center)),Ut.applyMatrix4(E.matrixWorld).applyMatrix4(At)),Array.isArray(me)){let Se=ve.groups;for(let Te=0,ke=Se.length;Te<ke;Te++){let Ge=Se[Te],Ae=me[Ge.materialIndex];Ae&&Ae.visible&&A.push(E,ve,Ae,q,Ut.z,Ge)}}else me.visible&&A.push(E,ve,me,q,Ut.z,null)}}let ge=E.children;for(let ve=0,me=ge.length;ve<me;ve++)Rc(ge[ve],z,q,G)}h(Rc,"projectObject");function Tf(E,z,q,G){let{opaque:W,transmissive:ge,transparent:ve}=E;w.setupLightsView(q),Qe===!0&&Pe.setGlobalState(C.clippingPlanes,q),G&&b.viewport(le.copy(G)),W.length>0&&xo(W,z,q),ge.length>0&&xo(ge,z,q),ve.length>0&&xo(ve,z,q),b.buffers.depth.setTest(!0),b.buffers.depth.setMask(!0),b.buffers.color.setMask(!0),b.setPolygonOffset(!1)}h(Tf,"renderScene");function Af(E,z,q,G){if((q.isScene===!0?q.overrideMaterial:null)!==null)return;if(w.state.transmissionRenderTarget[G.id]===void 0){let Ae=nt.has("EXT_color_buffer_half_float")||nt.has("EXT_color_buffer_float");w.state.transmissionRenderTarget[G.id]=new pn(1,1,{generateMipmaps:!0,type:Ae?Zn:yn,minFilter:Vi,samples:Math.max(4,R.samples),stencilBuffer:r,resolveDepthBuffer:!1,resolveStencilBuffer:!1,colorSpace:Ye.workingColorSpace})}let ge=w.state.transmissionRenderTarget[G.id],ve=G.viewport||le;ge.setSize(ve.z*C.transmissionResolutionScale,ve.w*C.transmissionResolutionScale);let me=C.getRenderTarget(),Se=C.getActiveCubeFace(),Te=C.getActiveMipmapLevel();C.setRenderTarget(ge),C.getClearColor(tt),Ke=C.getClearAlpha(),Ke<1&&C.setClearColor(16777215,.5),C.clear(),xt&&ze.render(q);let ke=C.toneMapping;C.toneMapping=Dn;let Ge=G.viewport;if(G.viewport!==void 0&&(G.viewport=void 0),w.setupLightsView(G),Qe===!0&&Pe.setGlobalState(C.clippingPlanes,G),xo(E,q,G),$.updateMultisampleRenderTarget(ge),$.updateRenderTargetMipmap(ge),nt.has("WEBGL_multisampled_render_to_texture")===!1){let Ae=!1;for(let rt=0,Mt=z.length;rt<Mt;rt++){let vt=z[rt],{object:at,geometry:qt,material:ye,group:hn}=vt;if(ye.side===cn&&at.layers.test(G.layers)){let Je=ye.side;ye.side=nn,ye.needsUpdate=!0,Pf(at,q,G,qt,ye,hn),ye.side=Je,ye.needsUpdate=!0,Ae=!0}}Ae===!0&&($.updateMultisampleRenderTarget(ge),$.updateRenderTargetMipmap(ge))}C.setRenderTarget(me,Se,Te),C.setClearColor(tt,Ke),Ge!==void 0&&(G.viewport=Ge),C.toneMapping=ke}h(Af,"renderTransmissionPass");function xo(E,z,q){let G=z.isScene===!0?z.overrideMaterial:null;for(let W=0,ge=E.length;W<ge;W++){let ve=E[W],{object:me,geometry:Se,group:Te}=ve,ke=ve.material;ke.allowOverride===!0&&G!==null&&(ke=G),me.layers.test(q.layers)&&Pf(me,z,q,Se,ke,Te)}}h(xo,"renderObjects");function Pf(E,z,q,G,W,ge){E.onBeforeRender(C,z,q,G,W,ge),E.modelViewMatrix.multiplyMatrices(q.matrixWorldInverse,E.matrixWorld),E.normalMatrix.getNormalMatrix(E.modelViewMatrix),W.onBeforeRender(C,z,q,G,E,ge),W.transparent===!0&&W.side===cn&&W.forceSinglePass===!1?(W.side=nn,W.needsUpdate=!0,C.renderBufferDirect(q,z,G,W,E,ge),W.side=hi,W.needsUpdate=!0,C.renderBufferDirect(q,z,G,W,E,ge),W.side=cn):C.renderBufferDirect(q,z,G,W,E,ge),E.onAfterRender(C,z,q,G,W,ge)}h(Pf,"renderObject");function yo(E,z,q){z.isScene!==!0&&(z=kt);let G=X.get(E),W=w.state.lights,ge=w.state.shadowsArray,ve=W.state.version,me=ue.getParameters(E,W.state,ge,z,q,w.state.lightProbeGridArray),Se=ue.getProgramCacheKey(me),Te=G.programs;G.environment=E.isMeshStandardMaterial||E.isMeshLambertMaterial||E.isMeshPhongMaterial?z.environment:null,G.fog=z.fog;let ke=E.isMeshStandardMaterial||E.isMeshLambertMaterial&&!E.envMap||E.isMeshPhongMaterial&&!E.envMap;G.envMap=se.get(E.envMap||G.environment,ke),G.envMapRotation=G.environment!==null&&E.envMap===null?z.environmentRotation:E.envMapRotation,Te===void 0&&(E.addEventListener("dispose",Bn),Te=new Map,G.programs=Te);let Ge=Te.get(Se);if(Ge!==void 0){if(G.currentProgram===Ge&&G.lightsStateVersion===ve)return Cf(E,me),Ge}else me.uniforms=ue.getUniforms(E),D!==null&&E.isNodeMaterial&&D.build(E,q,me),E.onBeforeCompile(me,C),Ge=ue.acquireProgram(me,Se),Te.set(Se,Ge),G.uniforms=me.uniforms;let Ae=G.uniforms;return(!E.isShaderMaterial&&!E.isRawShaderMaterial||E.clipping===!0)&&(Ae.clippingPlanes=Pe.uniform),Cf(E,me),G.needsLights=Vg(E),G.lightsStateVersion=ve,G.needsLights&&(Ae.ambientLightColor.value=W.state.ambient,Ae.lightProbe.value=W.state.probe,Ae.directionalLights.value=W.state.directional,Ae.directionalLightShadows.value=W.state.directionalShadow,Ae.spotLights.value=W.state.spot,Ae.spotLightShadows.value=W.state.spotShadow,Ae.rectAreaLights.value=W.state.rectArea,Ae.ltc_1.value=W.state.rectAreaLTC1,Ae.ltc_2.value=W.state.rectAreaLTC2,Ae.pointLights.value=W.state.point,Ae.pointLightShadows.value=W.state.pointShadow,Ae.hemisphereLights.value=W.state.hemi,Ae.directionalShadowMatrix.value=W.state.directionalShadowMatrix,Ae.spotLightMatrix.value=W.state.spotLightMatrix,Ae.spotLightMap.value=W.state.spotLightMap,Ae.pointShadowMatrix.value=W.state.pointShadowMatrix),G.lightProbeGrid=w.state.lightProbeGridArray.length>0,G.currentProgram=Ge,G.uniformsList=null,Ge}h(yo,"getProgram");function Rf(E){if(E.uniformsList===null){let z=E.currentProgram.getUniforms();E.uniformsList=Zs.seqWithValue(z.seq,E.uniforms)}return E.uniformsList}h(Rf,"getUniformList");function Cf(E,z){let q=X.get(E);q.outputColorSpace=z.outputColorSpace,q.batching=z.batching,q.batchingColor=z.batchingColor,q.instancing=z.instancing,q.instancingColor=z.instancingColor,q.instancingMorph=z.instancingMorph,q.skinning=z.skinning,q.morphTargets=z.morphTargets,q.morphNormals=z.morphNormals,q.morphColors=z.morphColors,q.morphTargetsCount=z.morphTargetsCount,q.numClippingPlanes=z.numClippingPlanes,q.numIntersection=z.numClipIntersection,q.vertexAlphas=z.vertexAlphas,q.vertexTangents=z.vertexTangents,q.toneMapping=z.toneMapping}h(Cf,"updateCommonMaterialProperties");function Bg(E,z){if(E.length===0)return null;if(E.length===1)return E[0].texture!==null?E[0]:null;_.setFromMatrixPosition(z.matrixWorld);for(let q=0,G=E.length;q<G;q++){let W=E[q];if(W.texture!==null&&W.boundingBox.containsPoint(_))return W}return null}h(Bg,"findLightProbeGrid");function zg(E,z,q,G,W){z.isScene!==!0&&(z=kt),$.resetTextureUnits();let ge=z.fog,ve=G.isMeshStandardMaterial||G.isMeshLambertMaterial||G.isMeshPhongMaterial?z.environment:null,me=Z===null?C.outputColorSpace:Z.isXRRenderTarget===!0?Z.texture.colorSpace:Ye.workingColorSpace,Se=G.isMeshStandardMaterial||G.isMeshLambertMaterial&&!G.envMap||G.isMeshPhongMaterial&&!G.envMap,Te=se.get(G.envMap||ve,Se),ke=G.vertexColors===!0&&!!q.attributes.color&&q.attributes.color.itemSize===4,Ge=!!q.attributes.tangent&&(!!G.normalMap||G.anisotropy>0),Ae=!!q.morphAttributes.position,rt=!!q.morphAttributes.normal,Mt=!!q.morphAttributes.color,vt=Dn;G.toneMapped&&(Z===null||Z.isXRRenderTarget===!0)&&(vt=C.toneMapping);let at=q.morphAttributes.position||q.morphAttributes.normal||q.morphAttributes.color,qt=at!==void 0?at.length:0,ye=X.get(G),hn=w.state.lights;if(Qe===!0&&(Ze===!0||E!==re)){let dt=E===re&&G.id===ee;Pe.setState(G,E,dt)}let Je=!1;G.version===ye.__version?(ye.needsLights&&ye.lightsStateVersion!==hn.state.version||ye.outputColorSpace!==me||W.isBatchedMesh&&ye.batching===!1||!W.isBatchedMesh&&ye.batching===!0||W.isBatchedMesh&&ye.batchingColor===!0&&W.colorTexture===null||W.isBatchedMesh&&ye.batchingColor===!1&&W.colorTexture!==null||W.isInstancedMesh&&ye.instancing===!1||!W.isInstancedMesh&&ye.instancing===!0||W.isSkinnedMesh&&ye.skinning===!1||!W.isSkinnedMesh&&ye.skinning===!0||W.isInstancedMesh&&ye.instancingColor===!0&&W.instanceColor===null||W.isInstancedMesh&&ye.instancingColor===!1&&W.instanceColor!==null||W.isInstancedMesh&&ye.instancingMorph===!0&&W.morphTexture===null||W.isInstancedMesh&&ye.instancingMorph===!1&&W.morphTexture!==null||ye.envMap!==Te||G.fog===!0&&ye.fog!==ge||ye.numClippingPlanes!==void 0&&(ye.numClippingPlanes!==Pe.numPlanes||ye.numIntersection!==Pe.numIntersection)||ye.vertexAlphas!==ke||ye.vertexTangents!==Ge||ye.morphTargets!==Ae||ye.morphNormals!==rt||ye.morphColors!==Mt||ye.toneMapping!==vt||ye.morphTargetsCount!==qt||!!ye.lightProbeGrid!=w.state.lightProbeGridArray.length>0)&&(Je=!0):(Je=!0,ye.__version=G.version);let vn=ye.currentProgram;Je===!0&&(vn=yo(G,z,W),D&&G.isNodeMaterial&&D.onUpdateProgram(G,vn,ye));let zn=!1,gi=!1,ps=!1,lt=vn.getUniforms(),wt=ye.uniforms;if(b.useProgram(vn.program)&&(zn=!0,gi=!0,ps=!0),G.id!==ee&&(ee=G.id,gi=!0),ye.needsLights){let dt=Bg(w.state.lightProbeGridArray,W);ye.lightProbeGrid!==dt&&(ye.lightProbeGrid=dt,gi=!0)}if(zn||re!==E){b.buffers.depth.getReversed()&&E.reversedDepth!==!0&&(E._reversedDepth=!0,E.updateProjectionMatrix()),lt.setValue(B,"projectionMatrix",E.projectionMatrix),lt.setValue(B,"viewMatrix",E.matrixWorldInverse);let yi=lt.map.cameraPosition;yi!==void 0&&yi.setValue(B,Ct.setFromMatrixPosition(E.matrixWorld)),R.logarithmicDepthBuffer&&lt.setValue(B,"logDepthBufFC",2/(Math.log(E.far+1)/Math.LN2)),(G.isMeshPhongMaterial||G.isMeshToonMaterial||G.isMeshLambertMaterial||G.isMeshBasicMaterial||G.isMeshStandardMaterial||G.isShaderMaterial)&&lt.setValue(B,"isOrthographic",E.isOrthographicCamera===!0),re!==E&&(re=E,gi=!0,ps=!0)}if(ye.needsLights&&(hn.state.directionalShadowMap.length>0&&lt.setValue(B,"directionalShadowMap",hn.state.directionalShadowMap,$),hn.state.spotShadowMap.length>0&&lt.setValue(B,"spotShadowMap",hn.state.spotShadowMap,$),hn.state.pointShadowMap.length>0&&lt.setValue(B,"pointShadowMap",hn.state.pointShadowMap,$)),W.isSkinnedMesh){lt.setOptional(B,W,"bindMatrix"),lt.setOptional(B,W,"bindMatrixInverse");let dt=W.skeleton;dt&&(dt.boneTexture===null&&dt.computeBoneTexture(),lt.setValue(B,"boneTexture",dt.boneTexture,$))}W.isBatchedMesh&&(lt.setOptional(B,W,"batchingTexture"),lt.setValue(B,"batchingTexture",W._matricesTexture,$),lt.setOptional(B,W,"batchingIdTexture"),lt.setValue(B,"batchingIdTexture",W._indirectTexture,$),lt.setOptional(B,W,"batchingColorTexture"),W._colorsTexture!==null&&lt.setValue(B,"batchingColorTexture",W._colorsTexture,$));let xi=q.morphAttributes;if((xi.position!==void 0||xi.normal!==void 0||xi.color!==void 0)&&N.update(W,q,vn),(gi||ye.receiveShadow!==W.receiveShadow)&&(ye.receiveShadow=W.receiveShadow,lt.setValue(B,"receiveShadow",W.receiveShadow)),(G.isMeshStandardMaterial||G.isMeshLambertMaterial||G.isMeshPhongMaterial)&&G.envMap===null&&z.environment!==null&&(wt.envMapIntensity.value=z.environmentIntensity),wt.dfgLUT!==void 0&&(wt.dfgLUT.value=mS()),gi){if(lt.setValue(B,"toneMappingExposure",C.toneMappingExposure),ye.needsLights&&kg(wt,ps),ge&&G.fog===!0&&Ee.refreshFogUniforms(wt,ge),Ee.refreshMaterialUniforms(wt,G,ie,oe,w.state.transmissionRenderTarget[E.id]),ye.needsLights&&ye.lightProbeGrid){let dt=ye.lightProbeGrid;wt.probesSH.value=dt.texture,wt.probesMin.value.copy(dt.boundingBox.min),wt.probesMax.value.copy(dt.boundingBox.max),wt.probesResolution.value.copy(dt.resolution)}Zs.upload(B,Rf(ye),wt,$)}if(G.isShaderMaterial&&G.uniformsNeedUpdate===!0&&(Zs.upload(B,Rf(ye),wt,$),G.uniformsNeedUpdate=!1),G.isSpriteMaterial&&lt.setValue(B,"center",W.center),lt.setValue(B,"modelViewMatrix",W.modelViewMatrix),lt.setValue(B,"normalMatrix",W.normalMatrix),lt.setValue(B,"modelMatrix",W.matrixWorld),G.uniformsGroups!==void 0){let dt=G.uniformsGroups;for(let yi=0,ms=dt.length;yi<ms;yi++){let If=dt[yi];te.update(If,vn),te.bind(If,vn)}}return vn}h(zg,"setProgram");function kg(E,z){E.ambientLightColor.needsUpdate=z,E.lightProbe.needsUpdate=z,E.directionalLights.needsUpdate=z,E.directionalLightShadows.needsUpdate=z,E.pointLights.needsUpdate=z,E.pointLightShadows.needsUpdate=z,E.spotLights.needsUpdate=z,E.spotLightShadows.needsUpdate=z,E.rectAreaLights.needsUpdate=z,E.hemisphereLights.needsUpdate=z}h(kg,"markUniformsLightsNeedsUpdate");function Vg(E){return E.isMeshLambertMaterial||E.isMeshToonMaterial||E.isMeshPhongMaterial||E.isMeshStandardMaterial||E.isShadowMaterial||E.isShaderMaterial&&E.lights===!0}h(Vg,"materialNeedsLights"),this.getActiveCubeFace=function(){return Y},this.getActiveMipmapLevel=function(){return k},this.getRenderTarget=function(){return Z},this.setRenderTargetTextures=function(E,z,q){let G=X.get(E);G.__autoAllocateDepthBuffer=E.resolveDepthBuffer===!1,G.__autoAllocateDepthBuffer===!1&&(G.__useRenderToTexture=!1),X.get(E.texture).__webglTexture=z,X.get(E.depthTexture).__webglTexture=G.__autoAllocateDepthBuffer?void 0:q,G.__hasExternalTextures=!0},this.setRenderTargetFramebuffer=function(E,z){let q=X.get(E);q.__webglFramebuffer=z,q.__useDefaultFramebuffer=z===void 0},this.setRenderTarget=function(E,z=0,q=0){Z=E,Y=z,k=q;let G=null,W=!1,ge=!1;if(E){let me=X.get(E);if(me.__useDefaultFramebuffer!==void 0){b.bindFramebuffer(B.FRAMEBUFFER,me.__webglFramebuffer),le.copy(E.viewport),_e.copy(E.scissor),$e=E.scissorTest,b.viewport(le),b.scissor(_e),b.setScissorTest($e),ee=-1;return}else if(me.__webglFramebuffer===void 0)$.setupRenderTarget(E);else if(me.__hasExternalTextures)$.rebindTextures(E,X.get(E.texture).__webglTexture,X.get(E.depthTexture).__webglTexture);else if(E.depthBuffer){let ke=E.depthTexture;if(me.__boundDepthTexture!==ke){if(ke!==null&&X.has(ke)&&(E.width!==ke.image.width||E.height!==ke.image.height))throw new Error("THREE.WebGLRenderer: Attached DepthTexture is initialized to the incorrect size.");$.setupDepthRenderbuffer(E)}}let Se=E.texture;(Se.isData3DTexture||Se.isDataArrayTexture||Se.isCompressedArrayTexture)&&(ge=!0);let Te=X.get(E).__webglFramebuffer;E.isWebGLCubeRenderTarget?(Array.isArray(Te[z])?G=Te[z][q]:G=Te[z],W=!0):E.samples>0&&$.useMultisampledRTT(E)===!1?G=X.get(E).__webglMultisampledFramebuffer:Array.isArray(Te)?G=Te[q]:G=Te,le.copy(E.viewport),_e.copy(E.scissor),$e=E.scissorTest}else le.copy(Le).multiplyScalar(ie).floor(),_e.copy(St).multiplyScalar(ie).floor(),$e=qe;if(q!==0&&(G=L),b.bindFramebuffer(B.FRAMEBUFFER,G)&&b.drawBuffers(E,G),b.viewport(le),b.scissor(_e),b.setScissorTest($e),W){let me=X.get(E.texture);B.framebufferTexture2D(B.FRAMEBUFFER,B.COLOR_ATTACHMENT0,B.TEXTURE_CUBE_MAP_POSITIVE_X+z,me.__webglTexture,q)}else if(ge){let me=z;for(let Se=0;Se<E.textures.length;Se++){let Te=X.get(E.textures[Se]);B.framebufferTextureLayer(B.FRAMEBUFFER,B.COLOR_ATTACHMENT0+Se,Te.__webglTexture,q,me)}}else if(E!==null&&q!==0){let me=X.get(E.texture);B.framebufferTexture2D(B.FRAMEBUFFER,B.COLOR_ATTACHMENT0,B.TEXTURE_2D,me.__webglTexture,q)}ee=-1},this.readRenderTargetPixels=function(E,z,q,G,W,ge,ve,me=0){if(!(E&&E.isWebGLRenderTarget)){Ne("WebGLRenderer.readRenderTargetPixels: renderTarget is not THREE.WebGLRenderTarget.");return}let Se=X.get(E).__webglFramebuffer;if(E.isWebGLCubeRenderTarget&&ve!==void 0&&(Se=Se[ve]),Se){b.bindFramebuffer(B.FRAMEBUFFER,Se);try{let Te=E.textures[me],ke=Te.format,Ge=Te.type;if(E.textures.length>1&&B.readBuffer(B.COLOR_ATTACHMENT0+me),!R.textureFormatReadable(ke)){Ne("WebGLRenderer.readRenderTargetPixels: renderTarget is not in RGBA or implementation defined format.");return}if(!R.textureTypeReadable(Ge)){Ne("WebGLRenderer.readRenderTargetPixels: renderTarget is not in UnsignedByteType or implementation defined type.");return}z>=0&&z<=E.width-G&&q>=0&&q<=E.height-W&&B.readPixels(z,q,G,W,fe.convert(ke),fe.convert(Ge),ge)}finally{let Te=Z!==null?X.get(Z).__webglFramebuffer:null;b.bindFramebuffer(B.FRAMEBUFFER,Te)}}},this.readRenderTargetPixelsAsync=async function(E,z,q,G,W,ge,ve,me=0){if(!(E&&E.isWebGLRenderTarget))throw new Error("THREE.WebGLRenderer.readRenderTargetPixels: renderTarget is not THREE.WebGLRenderTarget.");let Se=X.get(E).__webglFramebuffer;if(E.isWebGLCubeRenderTarget&&ve!==void 0&&(Se=Se[ve]),Se)if(z>=0&&z<=E.width-G&&q>=0&&q<=E.height-W){b.bindFramebuffer(B.FRAMEBUFFER,Se);let Te=E.textures[me],ke=Te.format,Ge=Te.type;if(E.textures.length>1&&B.readBuffer(B.COLOR_ATTACHMENT0+me),!R.textureFormatReadable(ke))throw new Error("THREE.WebGLRenderer.readRenderTargetPixelsAsync: renderTarget is not in RGBA or implementation defined format.");if(!R.textureTypeReadable(Ge))throw new Error("THREE.WebGLRenderer.readRenderTargetPixelsAsync: renderTarget is not in UnsignedByteType or implementation defined type.");let Ae=B.createBuffer();B.bindBuffer(B.PIXEL_PACK_BUFFER,Ae),B.bufferData(B.PIXEL_PACK_BUFFER,ge.byteLength,B.STREAM_READ),B.readPixels(z,q,G,W,fe.convert(ke),fe.convert(Ge),0);let rt=Z!==null?X.get(Z).__webglFramebuffer:null;b.bindFramebuffer(B.FRAMEBUFFER,rt);let Mt=B.fenceSync(B.SYNC_GPU_COMMANDS_COMPLETE,0);return B.flush(),await lm(B,Mt,4),B.bindBuffer(B.PIXEL_PACK_BUFFER,Ae),B.getBufferSubData(B.PIXEL_PACK_BUFFER,0,ge),B.deleteBuffer(Ae),B.deleteSync(Mt),ge}else throw new Error("THREE.WebGLRenderer.readRenderTargetPixelsAsync: requested read bounds are out of range.")},this.copyFramebufferToTexture=function(E,z=null,q=0){let G=Math.pow(2,-q),W=Math.floor(E.image.width*G),ge=Math.floor(E.image.height*G),ve=z!==null?z.x:0,me=z!==null?z.y:0;$.setTexture2D(E,0),B.copyTexSubImage2D(B.TEXTURE_2D,q,0,0,ve,me,W,ge),b.unbindTexture()},this.copyTextureToTexture=function(E,z,q=null,G=null,W=0,ge=0){let ve,me,Se,Te,ke,Ge,Ae,rt,Mt,vt=E.isCompressedTexture?E.mipmaps[ge]:E.image;if(q!==null)ve=q.max.x-q.min.x,me=q.max.y-q.min.y,Se=q.isBox3?q.max.z-q.min.z:1,Te=q.min.x,ke=q.min.y,Ge=q.isBox3?q.min.z:0;else{let wt=Math.pow(2,-W);ve=Math.floor(vt.width*wt),me=Math.floor(vt.height*wt),E.isDataArrayTexture?Se=vt.depth:E.isData3DTexture?Se=Math.floor(vt.depth*wt):Se=1,Te=0,ke=0,Ge=0}G!==null?(Ae=G.x,rt=G.y,Mt=G.z):(Ae=0,rt=0,Mt=0);let at=fe.convert(z.format),qt=fe.convert(z.type),ye;z.isData3DTexture?($.setTexture3D(z,0),ye=B.TEXTURE_3D):z.isDataArrayTexture||z.isCompressedArrayTexture?($.setTexture2DArray(z,0),ye=B.TEXTURE_2D_ARRAY):($.setTexture2D(z,0),ye=B.TEXTURE_2D),b.activeTexture(B.TEXTURE0),b.pixelStorei(B.UNPACK_FLIP_Y_WEBGL,z.flipY),b.pixelStorei(B.UNPACK_PREMULTIPLY_ALPHA_WEBGL,z.premultiplyAlpha),b.pixelStorei(B.UNPACK_ALIGNMENT,z.unpackAlignment);let hn=b.getParameter(B.UNPACK_ROW_LENGTH),Je=b.getParameter(B.UNPACK_IMAGE_HEIGHT),vn=b.getParameter(B.UNPACK_SKIP_PIXELS),zn=b.getParameter(B.UNPACK_SKIP_ROWS),gi=b.getParameter(B.UNPACK_SKIP_IMAGES);b.pixelStorei(B.UNPACK_ROW_LENGTH,vt.width),b.pixelStorei(B.UNPACK_IMAGE_HEIGHT,vt.height),b.pixelStorei(B.UNPACK_SKIP_PIXELS,Te),b.pixelStorei(B.UNPACK_SKIP_ROWS,ke),b.pixelStorei(B.UNPACK_SKIP_IMAGES,Ge);let ps=E.isDataArrayTexture||E.isData3DTexture,lt=z.isDataArrayTexture||z.isData3DTexture;if(E.isDepthTexture){let wt=X.get(E),xi=X.get(z),dt=X.get(wt.__renderTarget),yi=X.get(xi.__renderTarget);b.bindFramebuffer(B.READ_FRAMEBUFFER,dt.__webglFramebuffer),b.bindFramebuffer(B.DRAW_FRAMEBUFFER,yi.__webglFramebuffer);for(let ms=0;ms<Se;ms++)ps&&(B.framebufferTextureLayer(B.READ_FRAMEBUFFER,B.COLOR_ATTACHMENT0,X.get(E).__webglTexture,W,Ge+ms),B.framebufferTextureLayer(B.DRAW_FRAMEBUFFER,B.COLOR_ATTACHMENT0,X.get(z).__webglTexture,ge,Mt+ms)),B.blitFramebuffer(Te,ke,ve,me,Ae,rt,ve,me,B.DEPTH_BUFFER_BIT,B.NEAREST);b.bindFramebuffer(B.READ_FRAMEBUFFER,null),b.bindFramebuffer(B.DRAW_FRAMEBUFFER,null)}else if(W!==0||E.isRenderTargetTexture||X.has(E)){let wt=X.get(E),xi=X.get(z);b.bindFramebuffer(B.READ_FRAMEBUFFER,H),b.bindFramebuffer(B.DRAW_FRAMEBUFFER,F);for(let dt=0;dt<Se;dt++)ps?B.framebufferTextureLayer(B.READ_FRAMEBUFFER,B.COLOR_ATTACHMENT0,wt.__webglTexture,W,Ge+dt):B.framebufferTexture2D(B.READ_FRAMEBUFFER,B.COLOR_ATTACHMENT0,B.TEXTURE_2D,wt.__webglTexture,W),lt?B.framebufferTextureLayer(B.DRAW_FRAMEBUFFER,B.COLOR_ATTACHMENT0,xi.__webglTexture,ge,Mt+dt):B.framebufferTexture2D(B.DRAW_FRAMEBUFFER,B.COLOR_ATTACHMENT0,B.TEXTURE_2D,xi.__webglTexture,ge),W!==0?B.blitFramebuffer(Te,ke,ve,me,Ae,rt,ve,me,B.COLOR_BUFFER_BIT,B.NEAREST):lt?B.copyTexSubImage3D(ye,ge,Ae,rt,Mt+dt,Te,ke,ve,me):B.copyTexSubImage2D(ye,ge,Ae,rt,Te,ke,ve,me);b.bindFramebuffer(B.READ_FRAMEBUFFER,null),b.bindFramebuffer(B.DRAW_FRAMEBUFFER,null)}else lt?E.isDataTexture||E.isData3DTexture?B.texSubImage3D(ye,ge,Ae,rt,Mt,ve,me,Se,at,qt,vt.data):z.isCompressedArrayTexture?B.compressedTexSubImage3D(ye,ge,Ae,rt,Mt,ve,me,Se,at,vt.data):B.texSubImage3D(ye,ge,Ae,rt,Mt,ve,me,Se,at,qt,vt):E.isDataTexture?B.texSubImage2D(B.TEXTURE_2D,ge,Ae,rt,ve,me,at,qt,vt.data):E.isCompressedTexture?B.compressedTexSubImage2D(B.TEXTURE_2D,ge,Ae,rt,vt.width,vt.height,at,vt.data):B.texSubImage2D(B.TEXTURE_2D,ge,Ae,rt,ve,me,at,qt,vt);b.pixelStorei(B.UNPACK_ROW_LENGTH,hn),b.pixelStorei(B.UNPACK_IMAGE_HEIGHT,Je),b.pixelStorei(B.UNPACK_SKIP_PIXELS,vn),b.pixelStorei(B.UNPACK_SKIP_ROWS,zn),b.pixelStorei(B.UNPACK_SKIP_IMAGES,gi),ge===0&&z.generateMipmaps&&B.generateMipmap(ye),b.unbindTexture()},this.initRenderTarget=function(E){X.get(E).__webglFramebuffer===void 0&&$.setupRenderTarget(E)},this.initTexture=function(E){E.isCubeTexture?$.setTextureCube(E,0):E.isData3DTexture?$.setTexture3D(E,0):E.isDataArrayTexture||E.isCompressedArrayTexture?$.setTexture2DArray(E,0):$.setTexture2D(E,0),b.unbindTexture()},this.resetState=function(){Y=0,k=0,Z=null,b.reset(),xe.reset()},typeof __THREE_DEVTOOLS__<"u"&&__THREE_DEVTOOLS__.dispatchEvent(new CustomEvent("observe",{detail:this}))}get coordinateSystem(){return Rn}get outputColorSpace(){return this._outputColorSpace}set outputColorSpace(e){this._outputColorSpace=e;let t=this.getContext();t.drawingBufferColorSpace=Ye._getDrawingBufferColorSpace(e),t.unpackColorSpace=Ye._getUnpackColorSpace()}};h(Cd,"WebGLRenderer");var Kl=Cd;var Xm=new gn,jl=new O,Id=class Id extends Vr{constructor(){super(),this.isLineSegmentsGeometry=!0,this.type="LineSegmentsGeometry";let e=[-1,2,0,1,2,0,-1,1,0,1,1,0,-1,0,0,1,0,0,-1,-1,0,1,-1,0],t=[-1,2,1,2,-1,1,1,1,-1,-1,1,-1,-1,-2,1,-2],n=[0,2,1,2,3,1,2,4,3,4,5,3,4,6,5,6,7,5];this.setIndex(n),this.setAttribute("position",new ht(e,3)),this.setAttribute("uv",new ht(t,2))}applyMatrix4(e){let t=this.attributes.instanceStart,n=this.attributes.instanceEnd;return t!==void 0&&(t.applyMatrix4(e),n.applyMatrix4(e),t.needsUpdate=!0),this.boundingBox!==null&&this.computeBoundingBox(),this.boundingSphere!==null&&this.computeBoundingSphere(),this}setPositions(e){let t;e instanceof Float32Array?t=e:Array.isArray(e)&&(t=new Float32Array(e));let n=new zi(t,6,1);return this.setAttribute("instanceStart",new In(n,3,0)),this.setAttribute("instanceEnd",new In(n,3,3)),this.instanceCount=this.attributes.instanceStart.count,this.computeBoundingBox(),this.computeBoundingSphere(),this}setColors(e){let t;e instanceof Float32Array?t=e:Array.isArray(e)&&(t=new Float32Array(e));let n=new zi(t,6,1);return this.setAttribute("instanceColorStart",new In(n,3,0)),this.setAttribute("instanceColorEnd",new In(n,3,3)),this}fromWireframeGeometry(e){return this.setPositions(e.attributes.position.array),this}fromEdgesGeometry(e){return this.setPositions(e.attributes.position.array),this}fromMesh(e){return this.fromWireframeGeometry(new Br(e.geometry)),this}fromLineSegments(e){let t=e.geometry;return this.setPositions(t.attributes.position.array),this}computeBoundingBox(){this.boundingBox===null&&(this.boundingBox=new gn);let e=this.attributes.instanceStart,t=this.attributes.instanceEnd;e!==void 0&&t!==void 0&&(this.boundingBox.setFromBufferAttribute(e),Xm.setFromBufferAttribute(t),this.boundingBox.union(Xm))}computeBoundingSphere(){this.boundingSphere===null&&(this.boundingSphere=new Cn),this.boundingBox===null&&this.computeBoundingBox();let e=this.attributes.instanceStart,t=this.attributes.instanceEnd;if(e!==void 0&&t!==void 0){let n=this.boundingSphere.center;this.boundingBox.getCenter(n);let s=0;for(let r=0,o=e.count;r<o;r++)jl.fromBufferAttribute(e,r),s=Math.max(s,n.distanceToSquared(jl)),jl.fromBufferAttribute(t,r),s=Math.max(s,n.distanceToSquared(jl));this.boundingSphere.radius=Math.sqrt(s),isNaN(this.boundingSphere.radius)&&console.error("THREE.LineSegmentsGeometry.computeBoundingSphere(): Computed radius is NaN. The instanced position data is likely to have NaN values.",this)}}toJSON(){}};h(Id,"LineSegmentsGeometry");var jn=Id;ae.line={worldUnits:{value:1},linewidth:{value:1},resolution:{value:new We},dashOffset:{value:0},dashScale:{value:1},dashSize:{value:1},gapSize:{value:1}};sn.line={uniforms:jr.merge([ae.common,ae.fog,ae.line]),vertexShader:`
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
		`};var Ld=class Ld extends Ht{constructor(e){super({type:"LineMaterial",uniforms:jr.clone(sn.line.uniforms),vertexShader:sn.line.vertexShader,fragmentShader:sn.line.fragmentShader,clipping:!0}),this.isLineMaterial=!0,this.setValues(e)}get color(){return this.uniforms.diffuse.value}set color(e){this.uniforms.diffuse.value=e}get worldUnits(){return"WORLD_UNITS"in this.defines}set worldUnits(e){e===!0!==this.worldUnits&&(this.needsUpdate=!0),e===!0?this.defines.WORLD_UNITS="":delete this.defines.WORLD_UNITS}get linewidth(){return this.uniforms.linewidth.value}set linewidth(e){this.uniforms.linewidth&&(this.uniforms.linewidth.value=e)}get dashed(){return"USE_DASH"in this.defines}set dashed(e){e===!0!==this.dashed&&(this.needsUpdate=!0),e===!0?this.defines.USE_DASH="":delete this.defines.USE_DASH}get dashScale(){return this.uniforms.dashScale.value}set dashScale(e){this.uniforms.dashScale.value=e}get dashSize(){return this.uniforms.dashSize.value}set dashSize(e){this.uniforms.dashSize.value=e}get dashOffset(){return this.uniforms.dashOffset.value}set dashOffset(e){this.uniforms.dashOffset.value=e}get gapSize(){return this.uniforms.gapSize.value}set gapSize(e){this.uniforms.gapSize.value=e}get opacity(){return this.uniforms.opacity.value}set opacity(e){this.uniforms&&(this.uniforms.opacity.value=e)}get resolution(){return this.uniforms.resolution.value}set resolution(e){this.uniforms.resolution.value.copy(e)}get alphaToCoverage(){return"USE_ALPHA_TO_COVERAGE"in this.defines}set alphaToCoverage(e){this.defines&&(e===!0!==this.alphaToCoverage&&(this.needsUpdate=!0),e===!0?this.defines.USE_ALPHA_TO_COVERAGE="":delete this.defines.USE_ALPHA_TO_COVERAGE)}};h(Ld,"LineMaterial");var js=Ld;var Dd=new st,qm=new O,Ym=new O,Gt=new st,Wt=new st,Qn=new st,Fd=new O,Nd=new ct,Xt=new Hr,$m=new O,Ql=new gn,ec=new Cn,ei=new st,ti,cs;function Km(i,e,t){return ei.set(0,0,-e,1).applyMatrix4(i.projectionMatrix),ei.multiplyScalar(1/ei.w),ei.x=cs/t.width,ei.y=cs/t.height,ei.applyMatrix4(i.projectionMatrixInverse),ei.multiplyScalar(1/ei.w),Math.abs(Math.max(ei.x,ei.y))}h(Km,"getWorldSpaceHalfWidth");function xS(i,e){let t=i.matrixWorld,n=i.geometry,s=n.attributes.instanceStart,r=n.attributes.instanceEnd,o=Math.min(n.instanceCount,s.count);for(let a=0,l=o;a<l;a++){Xt.start.fromBufferAttribute(s,a),Xt.end.fromBufferAttribute(r,a),Xt.applyMatrix4(t);let c=new O,u=new O;ti.distanceSqToSegment(Xt.start,Xt.end,u,c),u.distanceTo(c)<cs*.5&&e.push({point:u,pointOnLine:c,distance:ti.origin.distanceTo(u),object:i,face:null,faceIndex:a,uv:null,uv1:null})}}h(xS,"raycastWorldUnits");function yS(i,e,t){let n=e.projectionMatrix,r=i.material.resolution,o=i.matrixWorld,a=i.geometry,l=a.attributes.instanceStart,c=a.attributes.instanceEnd,u=Math.min(a.instanceCount,l.count),f=-e.near;ti.at(1,Qn),Qn.w=1,Qn.applyMatrix4(e.matrixWorldInverse),Qn.applyMatrix4(n),Qn.multiplyScalar(1/Qn.w),Qn.x*=r.x/2,Qn.y*=r.y/2,Qn.z=0,Fd.copy(Qn),Nd.multiplyMatrices(e.matrixWorldInverse,o);for(let d=0,g=u;d<g;d++){if(Gt.fromBufferAttribute(l,d),Wt.fromBufferAttribute(c,d),Gt.w=1,Wt.w=1,Gt.applyMatrix4(Nd),Wt.applyMatrix4(Nd),Gt.z>f&&Wt.z>f)continue;if(Gt.z>f){let M=Gt.z-Wt.z,_=(Gt.z-f)/M;Gt.lerp(Wt,_)}else if(Wt.z>f){let M=Wt.z-Gt.z,_=(Wt.z-f)/M;Wt.lerp(Gt,_)}Gt.applyMatrix4(n),Wt.applyMatrix4(n),Gt.multiplyScalar(1/Gt.w),Wt.multiplyScalar(1/Wt.w),Gt.x*=r.x/2,Gt.y*=r.y/2,Wt.x*=r.x/2,Wt.y*=r.y/2,Xt.start.copy(Gt),Xt.start.z=0,Xt.end.copy(Wt),Xt.end.z=0;let y=Xt.closestPointToPointParameter(Fd,!0);Xt.at(y,$m);let p=Wh.lerp(Gt.z,Wt.z,y),x=p>=-1&&p<=1,S=Fd.distanceTo($m)<cs*.5;if(x&&S){Xt.start.fromBufferAttribute(l,d),Xt.end.fromBufferAttribute(c,d),Xt.start.applyMatrix4(o),Xt.end.applyMatrix4(o);let M=new O,_=new O;ti.distanceSqToSegment(Xt.start,Xt.end,_,M),t.push({point:_,pointOnLine:M,distance:ti.origin.distanceTo(_),object:i,face:null,faceIndex:d,uv:null,uv1:null})}}}h(yS,"raycastScreenSpace");var Ud=class Ud extends Tt{constructor(e=new jn,t=new js({color:Math.random()*16777215})){super(e,t),this.isLineSegments2=!0,this.type="LineSegments2"}computeLineDistances(){let e=this.geometry,t=e.attributes.instanceStart,n=e.attributes.instanceEnd,s=new Float32Array(2*t.count);for(let o=0,a=0,l=t.count;o<l;o++,a+=2)qm.fromBufferAttribute(t,o),Ym.fromBufferAttribute(n,o),s[a]=a===0?0:s[a-1],s[a+1]=s[a]+qm.distanceTo(Ym);let r=new zi(s,2,1);return e.setAttribute("instanceDistanceStart",new In(r,1,0)),e.setAttribute("instanceDistanceEnd",new In(r,1,1)),this}raycast(e,t){let n=this.material.worldUnits,s=e.camera;if(s===null&&!n&&console.error('LineSegments2: "Raycaster.camera" needs to be set in order to raycast against LineSegments2 while worldUnits is set to false.'),n===!1&&(this.material.resolution.x===0||this.material.resolution.y===0))return;let r=e.params.Line2!==void 0&&e.params.Line2.threshold||0;ti=e.ray;let o=this.matrixWorld,a=this.geometry,l=this.material;cs=l.linewidth+r,a.boundingSphere===null&&a.computeBoundingSphere(),ec.copy(a.boundingSphere).applyMatrix4(o);let c;if(n)c=cs*.5;else{let f=Math.max(s.near,ec.distanceToPoint(ti.origin));c=Km(s,f,l.resolution)}if(ec.radius+=c,ti.intersectsSphere(ec)===!1)return;a.boundingBox===null&&a.computeBoundingBox(),Ql.copy(a.boundingBox).applyMatrix4(o);let u;if(n)u=cs*.5;else{let f=Math.max(s.near,Ql.distanceToPoint(ti.origin));u=Km(s,f,l.resolution)}Ql.expandByScalar(u),ti.intersectsBox(Ql)!==!1&&(n?xS(this,t):yS(this,s,t))}onBeforeRender(e){let t=this.material.uniforms;t&&t.resolution&&(e.getViewport(Dd),this.material.uniforms.resolution.value.set(Dd.z,Dd.w))}};h(Ud,"LineSegments2");var hs=Ud;var Nt={background:15921386,face:14079702,faceSelected:9417960,faceHover:11980784,edge:2763306,edgeWire:1118481,edgeSelected:2845872,edgeHot:13382451,grid:14276303,axisX:13382451,axisY:3050327,axisZ:2845872},vS={endpoint:3050327,midpoint:42405,"on-edge":13382451,origin:9133302,align:9133302,"align-combo":9133302,"edge-align":13382451,intersection:1118481,"cross-line":1118481,"axis-x":Nt.axisX,"axis-y":Nt.axisY,"axis-z":Nt.axisZ,"h-stop":14251782,"on-face":2845872},_S={x:Nt.axisX,y:Nt.axisY,z:Nt.axisZ,u:8947848,v:8947848,i:1118481},Zm=3050327,bS=13382451,SS=1.6,MS=1.2,wS=1.2,ES=2.5,TS=5,no=1,Od=50,AS=32,PS=900,Jm={foveation:0,framebufferScale:1},RS=`
  attribute vec3 aColor;
  varying vec3 vColor;
  varying vec3 vNormal;
  void main() {
    vColor = aColor;
    vNormal = normal;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }`,CS=`
  uniform vec3 uLight;
  varying vec3 vColor;
  varying vec3 vNormal;
  void main() {
    float k = 0.66 + 0.34 * abs(dot(normalize(vNormal), uLight));
    gl_FragColor = vec4(vColor * k, 1.0);   // vColor \u5DF2\u662F sRGB\uFF0C\u76F4\u63A5\u51FA\uFF08\u4E0E\u65E7 shade() \u540C\u503C\uFF09
  }`,IS=h(i=>[(i>>16&255)/255,(i>>8&255)/255,(i&255)/255],"srgb"),zd=class zd{constructor(e){U(this,"renderer");U(this,"scene");U(this,"camOrtho");U(this,"camPersp");U(this,"dpr",1);U(this,"flatRes",{w:1,h:1});U(this,"resolution");U(this,"lineMats",[]);U(this,"lineMatPx",[]);U(this,"faceMesh");U(this,"faceMat");U(this,"edgeLines");U(this,"edgeMat");U(this,"hintLines");U(this,"snapMarker");U(this,"arcLines");U(this,"landingRing");U(this,"faceKey","");U(this,"edgeKey","");U(this,"hintKey","");U(this,"kernelIds",new WeakMap);U(this,"nextKernelId",1);U(this,"scratchV",new O);U(this,"scratchV2",new O);U(this,"scratchM",new ct);U(this,"tmpColor",new Xe);U(this,"rig");U(this,"controllers",[]);U(this,"grips",[]);U(this,"hands",["none","none"]);U(this,"pointerVis",[]);U(this,"wrist",null);U(this,"xr");U(this,"subtitle",null);this.renderer=new Kl({canvas:e,antialias:!0,powerPreference:"high-performance"}),this.scene=new Er,this.scene.background=new Xe(Nt.background),this.camOrtho=new rs(-1,1,1,-1,.1,2e4),this.camPersp=new Jt(50,1,1,2e4),this.resolution=new We(1,1),this.scene.add(this.buildStatic()),this.faceMat=new Ht({vertexShader:RS,fragmentShader:CS,uniforms:{uLight:{value:new O(0,0,1)}},side:cn,polygonOffset:!0,polygonOffsetFactor:1,polygonOffsetUnits:1}),this.faceMesh=new Tt(new Lt,this.faceMat),this.faceMesh.frustumCulled=!1,this.faceMesh.visible=!1,this.scene.add(this.faceMesh),this.edgeMat=this.lineMat(SS,{offset:!0,vertexColors:!0}),this.edgeLines=new hs(new jn,this.edgeMat),this.edgeLines.frustumCulled=!1,this.edgeLines.visible=!1,this.scene.add(this.edgeLines),this.hintLines=new hs(new jn,this.lineMat(MS,{offset:!0,vertexColors:!0})),this.hintLines.frustumCulled=!1,this.hintLines.visible=!1,this.scene.add(this.hintLines),this.snapMarker=new Tt(new Xs(1,12,8),new Ln({color:16777215})),this.snapMarker.visible=!1,this.scene.add(this.snapMarker),this.arcLines=new hs(new jn,this.lineMat(ES,{offset:!0})),this.arcLines.frustumCulled=!1,this.arcLines.visible=!1,this.scene.add(this.arcLines),this.landingRing=new Tt(new Or(.22,.3,32),new Ln({color:Zm,side:cn,depthTest:!1,transparent:!0,opacity:.85})),this.landingRing.renderOrder=9,this.landingRing.visible=!1,this.scene.add(this.landingRing);let t=this.renderer.xr;t.enabled=!0,t.setReferenceSpaceType("local-floor"),t.setFoveation(Jm.foveation),t.setFramebufferScaleFactor(Jm.framebufferScale),this.rig=new ai,this.rig.add(this.camPersp),this.scene.add(this.rig);for(let n=0;n<2;n++){let s=t.getController(n);s.addEventListener("connected",c=>{this.hands[n]=c.data?.handedness??"none"}),s.addEventListener("disconnected",()=>{this.hands[n]="none"});let r=new Lt().setFromPoints([new O(0,0,0),new O(0,0,-1)]),o=new Cr(r,new Vs({color:2845872,transparent:!0,opacity:.8}));o.visible=!1;let a=new Tt(new Xs(1,12,8),new Ln({color:2845872,depthTest:!1}));a.renderOrder=11,a.visible=!1,s.add(o),s.add(a),this.pointerVis.push({line:o,cursor:a}),this.controllers.push(s),this.rig.add(s);let l=t.getControllerGrip(n);this.grips.push(l),this.rig.add(l)}this.xr={isPresenting:h(()=>!!t.isPresenting,"isPresenting"),setSession:h(n=>t.setSession(n),"setSession"),session:h(()=>t.getSession()??null,"session"),frame:h(()=>t.getFrame()??null,"frame"),refSpace:h(()=>t.getReferenceSpace()??null,"refSpace"),on:h((n,s)=>t.addEventListener(n,s),"on")}}setXRQuality(e){e.foveation!==void 0&&this.renderer.xr.setFoveation(Math.max(0,Math.min(1,e.foveation))),e.framebufferScale!==void 0&&this.renderer.xr.setFramebufferScaleFactor(Math.max(.5,Math.min(2,e.framebufferScale)))}setRig(e){this.rig.position.set(e.origin.x,e.origin.y,e.origin.z),this.rig.rotation.set(Math.PI/2,0,e.heading,"ZYX"),this.rig.updateMatrixWorld(!0)}ctrlIndex(e){return this.hands.indexOf(e)}setPointerVisual(e,t){let n=this.ctrlIndex(e);if(n<0)return;let s=this.pointerVis[n];if(!t){s.line.visible=!1,s.cursor.visible=!1;return}let r=Math.max(.05,t.length);s.line.visible=!0,s.cursor.visible=!0,s.line.scale.set(1,1,r),s.cursor.position.set(0,0,-r),s.cursor.scale.setScalar(Math.max(.002,r*.004)),s.line.material.color.setHex(t.color),s.cursor.material.color.setHex(t.color)}attachWristPanel(e,t,n,s){this.detachWristPanel();let r=new Hs(e);r.colorSpace=Zt;let o=new Tt(new Ni(t,n),new Ln({map:r,transparent:!0,side:cn,depthTest:!1}));o.renderOrder=12,o.position.set(0,.04,.09),o.rotation.set(-Math.PI/2+.35,0,0);let a=this.ctrlIndex(s);(a>=0?this.grips[a]:this.grips[s==="left"?0:1]).add(o),this.wrist={mesh:o,tex:r,inv:new ct}}detachWristPanel(){this.wrist&&(this.wrist.mesh.parent?.remove(this.wrist.mesh),this.wrist.mesh.geometry.dispose(),this.wrist.mesh.material.dispose(),this.wrist.tex.dispose(),this.wrist=null)}updateWristTexture(){this.wrist&&(this.wrist.tex.needsUpdate=!0)}wristHit(e){if(!this.wrist)return null;let t=this.wrist.mesh;t.updateWorldMatrix(!0,!1),this.wrist.inv.copy(t.matrixWorld).invert();let n=this.scratchV.set(e.origin.x,e.origin.y,e.origin.z).applyMatrix4(this.wrist.inv),s=this.scratchV2.set(e.dir.x,e.dir.y,e.dir.z).transformDirection(this.wrist.inv);if(Math.abs(s.z)<1e-6)return null;let r=-n.z/s.z;if(r<=0)return null;let o=n.x+s.x*r,a=n.y+s.y*r,l=t.geometry.parameters.width/2,c=t.geometry.parameters.height/2;if(o<-l||o>l||a<-c||a>c)return null;let u=r*Math.hypot(e.dir.x,e.dir.y,e.dir.z);return{u:(o+l)/(2*l),v:1-(a+c)/(2*c),dist:u}}attachSubtitle(e,t,n){this.detachSubtitle();let s=new Hs(e);s.colorSpace=Zt;let r=new Tt(new Ni(t,n),new Ln({map:s,transparent:!0,depthTest:!1}));r.renderOrder=20,r.position.set(0,-.3,-1.2),this.camPersp.add(r),this.subtitle={mesh:r,tex:s}}detachSubtitle(){this.subtitle&&(this.subtitle.mesh.parent?.remove(this.subtitle.mesh),this.subtitle.mesh.geometry.dispose(),this.subtitle.mesh.material.dispose(),this.subtitle.tex.dispose(),this.subtitle=null)}xrEye(){if(!this.renderer.xr.isPresenting)return null;let e=this.renderer.xr.getCamera();return this.scratchV.setFromMatrixPosition(e.matrixWorld)}setLoop(e){this.renderer.setAnimationLoop(e)}resize(e,t){this.renderer.xr.isPresenting||(this.dpr=t,this.renderer.setPixelRatio(t),this.renderer.setSize(e.w,e.h,!1),this.flatRes={w:e.w*t,h:e.h*t})}syncLineScale(e){let t=this.dpr,n=this.flatRes.w,s=this.flatRes.h;if(e){let r=this.renderer.xr.getCamera().cameras?.[0]?.viewport;r&&r.w>0&&(n=r.z,s=r.w,t=r.w/PS)}this.resolution.set(n,s);for(let r=0;r<this.lineMats.length;r++)this.lineMats[r].linewidth=this.lineMatPx[r]*t}worldPerPx(e,t,n){let s=this.xrEye();return s?Math.max(.2,Math.hypot(n.x-s.x,n.y-s.y,n.z-s.z))*(Math.PI/180)/AS:e.projection==="persp"?2*Math.max(ne(Me(n,e.eye()),e.forward()),e.nearClamp())*Math.tan(e.fovY/2)/t.h:2*e.halfH/t.h}syncCamera(e,t){let n=e.eye(),s=e.up(),r;if(e.projection==="persp"){r=this.camPersp;let o=e.eyeDist();r.fov=e.fovY*180/Math.PI,r.aspect=t.w/t.h,r.near=Math.max(e.nearClamp(),o*.02),r.far=o*40+100}else{r=this.camOrtho;let o=e.halfW(t);r.left=-o,r.right=o,r.top=e.halfH,r.bottom=-e.halfH;let a=e.eyeDist(),l=Math.max(500,e.halfH*100);r.near=Math.max(.1,a-l),r.far=a+l}return r.position.set(n.x,n.y,n.z),r.up.set(s.x,s.y,s.z),r.lookAt(e.target.x,e.target.y,e.target.z),r.updateProjectionMatrix(),r}kernelId(e){let t=this.kernelIds.get(e);return t===void 0&&(t=this.nextKernelId++,this.kernelIds.set(e,t)),t}render(e,t,n,s){let r=!!this.renderer.xr.isPresenting,o;r?(o=this.camPersp,o.near=s.near??.05,o.far=2e3):(this.rig.position.set(0,0,0),this.rig.rotation.set(0,0,0),o=this.syncCamera(t,n)),this.syncLineScale(r);let a=s.preview??e,l=this.kernelId(a),c=s.revision??0,u=[...s.selectionFaces].join(","),f=[...s.selectionEdges].join(","),d=r?this.xrKeyLight():LS(t);this.faceMat.uniforms.uLight.value.set(d.x,d.y,d.z);let g=`${l}:${c}:${u}:${s.hoverFace??""}`;g!==this.faceKey&&(this.faceKey=g,this.rebuildFaces(a,s));let m=`${l}:${c}:${f}:${[...s.scrubEdges].join(",")}:${s.hoverEdge??""}`;m!==this.edgeKey&&(this.edgeKey=m,this.rebuildEdges(a,s));let y=s.snap;if(y?.kind){let x=vS[y.kind]??2845872,S=this.snapMarker;S.visible=!0,S.position.set(y.p.x,y.p.y,y.p.z),S.scale.setScalar(TS*this.worldPerPx(t,n,y.p)),S.material.color.setHex(x);let M=null;if(y.hints?.length?M=y.hints.map(_=>({a:_.a,b:_.b,color:_S[_.axis]??8947848})):y.kind.startsWith("axis")&&s.snapAnchor&&(M=[{a:s.snapAnchor,b:y.p,color:x}]),M){let _=M.map(A=>`${A.color}:${A.a.x},${A.a.y},${A.a.z},${A.b.x},${A.b.y},${A.b.z}`).join("|");if(_!==this.hintKey){this.hintKey=_;let A=[],w=[];for(let T of M){A.push(T.a.x,T.a.y,T.a.z,T.b.x,T.b.y,T.b.z);let v=this.tmpColor.setHex(T.color);w.push(v.r,v.g,v.b,v.r,v.g,v.b)}this.setLineGeometry(this.hintLines,A,w)}this.hintLines.visible=!0}else this.hintLines.visible=!1}else this.snapMarker.visible=!1,this.hintLines.visible=!1;let p=s.teleport;if(p&&p.points.length>=2){let x=p.valid?Zm:bS,S=[];for(let M=0;M+1<p.points.length;M++){let _=p.points[M],A=p.points[M+1];S.push(_.x,_.y,_.z,A.x,A.y,A.z)}this.setLineGeometry(this.arcLines,S,null),this.arcLines.material.color.setHex(x),this.arcLines.visible=!0,p.landing?(this.landingRing.visible=!0,this.landingRing.position.set(p.landing.x,p.landing.y,p.landing.z+.01),this.landingRing.material.color.setHex(x)):this.landingRing.visible=!1}else this.arcLines.visible=!1,this.landingRing.visible=!1;this.renderer.render(this.scene,o)}rebuildFaces(e,t){let n=[],s=[],r=[];for(let l of e.faces()){let c=t.selectionFaces.has(l.id)?Nt.faceSelected:t.hoverFace===l.id?Nt.faceHover:Nt.face,u=e.planeOf(l.id);if(!u)continue;let f=u.plane.n,[d,g,m]=IS(c);for(let y of Bd(e,l.id))for(let p of y)n.push(p.x,p.y,p.z),s.push(f.x,f.y,f.z),r.push(d,g,m)}let o=this.faceMesh.geometry;if(!n.length){this.faceMesh.visible=!1;return}let a=new Lt;a.setAttribute("position",new ht(n,3)),a.setAttribute("normal",new ht(s,3)),a.setAttribute("aColor",new ht(r,3)),this.faceMesh.geometry=a,this.faceMesh.visible=!0,o.dispose()}rebuildEdges(e,t){let n=[],s=[];for(let r of e.edges()){let o=t.scrubEdges.has(r.id)||t.hoverEdge===r.id?Nt.edgeHot:t.selectionEdges.has(r.id)?Nt.edgeSelected:r.faceLinks.length===0?Nt.edgeWire:Nt.edge,a=e.graph.pt(r.a),l=e.graph.pt(r.b);n.push(a.x,a.y,a.z,l.x,l.y,l.z);let c=this.tmpColor.setHex(o);s.push(c.r,c.g,c.b,c.r,c.g,c.b)}if(!n.length){this.edgeLines.visible=!1;return}this.setLineGeometry(this.edgeLines,n,s),this.edgeLines.visible=!0}setLineGeometry(e,t,n){let s=e.geometry,r=new jn;r.setPositions(t),n&&r.setColors(n),e.geometry=r,s.dispose()}xrKeyLight(){let t=this.renderer.xr.getCamera().matrixWorld.elements,n={x:t[8],y:t[9],z:t[10]},s={x:t[4],y:t[5],z:t[6]},r={x:t[0],y:t[1],z:t[2]},o={x:n.x+s.x*.55+r.x*.35,y:n.y+s.y*.55+r.y*.35,z:n.z+s.z*.55+r.z*.35},a=Math.hypot(o.x,o.y,o.z)||1;return{x:o.x/a,y:o.y/a,z:o.z/a}}lineMat(e,t={}){let n=new js({color:16777215,linewidth:e,resolution:this.resolution,vertexColors:!!t.vertexColors,polygonOffset:!!t.offset,polygonOffsetFactor:-1,polygonOffsetUnits:-2});return this.lineMats.push(n),this.lineMatPx.push(e),n}buildStatic(){let e=[],t=[],n=h((a,l,c,u,f,d,g)=>{e.push(a,l,c,u,f,d);let m=this.tmpColor.setHex(g);t.push(m.r,m.g,m.b,m.r,m.g,m.b)},"push"),s=Od*no;for(let a=-Od;a<=Od;a++)a!==0&&(n(a*no,-s,0,a*no,s,0,Nt.grid),n(-s,a*no,0,s,a*no,0,Nt.grid));n(-s,0,0,s,0,0,Nt.axisX),n(0,-s,0,0,s,0,Nt.axisY),n(0,0,0,0,0,s,Nt.axisZ);let r=new jn;r.setPositions(e),r.setColors(t);let o=new hs(r,this.lineMat(wS,{vertexColors:!0}));return o.frustumCulled=!1,o}};h(zd,"Renderer3");var tc=zd;function LS(i){let e=i.eyeDir(),t=i.up(),n=i.right(),s={x:e.x+t.x*.55+n.x*.35,y:e.y+t.y*.55+n.y*.35,z:e.z+t.z*.55+n.z*.35},r=Math.hypot(s.x,s.y,s.z)||1;return{x:s.x/r,y:s.y/r,z:s.z/r}}h(LS,"keyLight");function Bd(i,e){let t=i.face(e),n=i.planeOf(e);if(!t||!n)return[];let s=t.outer.pts.map(g=>new We(g.x,g.y)),r=t.holes.map(g=>g.pts.map(m=>new We(m.x,m.y))),o=Ur.triangulateShape(s,r),a=[...s,...r.flat()],{u:l,v:c}=n.basis,u=n.plane.n,f=n.plane.d,d=h(g=>({x:l.x*g.x+c.x*g.y+u.x*f,y:l.y*g.x+c.y*g.y+u.y*f,z:l.z*g.x+c.z*g.y+u.z*f}),"lift");return o.map(([g,m,y])=>[d(a[g]),d(a[m]),d(a[y])])}h(Bd,"faceTriangles");var _t=h((i,e)=>({x:i,y:e}),"P"),Xi=h((i,e,t,n)=>[[_t(i,e),_t(t,e)],[_t(t,e),_t(t,n)],[_t(t,n),_t(i,n)],[_t(i,n),_t(i,e)]],"rect"),Qs=[{name:"\u65E5\u5B57",note:"\u4E24\u819C\u5171\u8FB9\u2014\u2014\u64E6\u4E2D\u7F1D\u8BE5 MERGE",batches:[Xi(-1,-.6,1,.6),[[_t(-1,0),_t(1,0)]]],expectFaces:2},{name:"\u56DE\u5B57",note:"\u73AF\u5E26+\u5185\u5C9B\u2014\u2014\u5220\u5185\u819C\u518D\u64E6\u6D1E\u8FB9\u770B ABSORB",batches:[Xi(-1,-1,1,1),Xi(-.4,-.4,.4,.4)],expectFaces:2},{name:"\u4E09\u5C42\u56DE\u5B57",note:"\u6697\u7901\u2460\u73B0\u573A\uFF1A\u4E2D\u73AF\u64E6=ABSORB\uFF1F\u5185\u73AF\u64E6=BURST\uFF1F\uFF08\u63A8\u5BFC\u503C\u5F85\u771F\u673A SU \u88C1\u51B3\uFF09",batches:[Xi(-1.2,-1.2,1.2,1.2),Xi(-.75,-.75,.75,.75),Xi(-.3,-.3,.3,.3)],expectFaces:3},{name:"\u7530\u5B57",note:"\u5341\u5B57\u5212\u5206\u2014\u2014\u56DB\u819C\uFF1B\u64E6\u5341\u5B57\u4EFB\u4E00\u81C2\u770B MERGE \u94FE",batches:[Xi(-1,-1,1,1),[[_t(0,-1),_t(0,1)]],[[_t(-1,0),_t(1,0)]]],expectFaces:4},{name:"T \u89E6\u78B0",note:"\u5916\u6765\u7EBF T \u5230\u8FB9\u4E0A\u2014\u2014\u5207\u8FB9\u4E0D\u751F\u819C\uFF08\u624B\u52BF\u8FB9\u88C1\u51B3\u7684\u53CD\u4F8B\u4F4D\uFF09",batches:[Xi(-1,-.6,1,.6),[[_t(0,.6),_t(0,1.4)]]],expectFaces:1},{name:"\u5F00\u53E3\u65B9",note:"\u4E09\u8FB9\u5F00\u53E3\u2014\u2014\u4E0D\u51FA\u819C\uFF1B\u4F60\u8865\u7B2C\u56DB\u7B14\u770B BIRTH\uFF08\u63CF\u4E00\u7B14\u5C31\u51FA\uFF09",batches:[[[_t(-.8,-.8),_t(.8,-.8)],[_t(.8,-.8),_t(.8,.8)],[_t(.8,.8),_t(-.8,.8)]]],expectFaces:0}];function jm(i,e){return e.batches.map(t=>i.addEdges(t))}h(jm,"applyPreset");function kd(i,e){switch(e.op){case"clear":return{kernel:new _i,events:[]};case"preset":{let t=new _i,n=Qs.find(s=>s.name===e.name);return{kernel:t,events:n?jm(t,n).flat():[]}}case"addEdges":return{kernel:i,events:i.addEdges(e.segs)};case"eraseEdges":return{kernel:i,events:i.eraseEdges(e.ids)};case"eraseFaces":return{kernel:i,events:i.eraseFaces(e.ids)};case"eraseSelection":return{kernel:i,events:[...i.eraseFaces(e.faces),...i.eraseEdges(e.edges)]};case"move":return{kernel:i,events:i.moveVertices(e.moves)};case"pushpull":return{kernel:i,events:i.pushPull(e.face,e.dist)}}}h(kd,"applyOp");var Vd=class Vd{constructor(){U(this,"ops",[]);U(this,"undone",[])}canUndo(){return this.ops.length>0}canRedo(){return this.undone.length>0}size(){return this.ops.length}commit(e,t){return this.ops.push(t),this.undone=[],kd(e,t)}undo(){return this.ops.length?(this.undone.push(this.ops.pop()),this.replay()):null}redo(e){let t=this.undone.pop();return t?(this.ops.push(t),kd(e,t)):null}replay(){let e=new _i;for(let t of this.ops)e=kd(e,t).kernel;return e}};h(Vd,"Journal");var nc=Vd;var eg=["select","line","rect","move","pp","erase","eraseFace"];function DS(i,e){return e==="on-edge"?i.edge:e==="edge-align"||e==="align-combo"?i.combo:e==="align"||e.startsWith("axis-")?i.line:i.point}h(DS,"epsOfKindVR");var FS={endpoint:10,origin:10,midpoint:10,"on-edge":7,"edge-align":12,"align-combo":12,align:5,"axis-x":5,"axis-y":5,"axis-z":5},Qm={endpoint:"\u7AEF\u70B9",midpoint:"\u4E2D\u70B9","on-edge":"\u8FB9\u4E0A",origin:"\u539F\u70B9","axis-x":"X \u8F74","axis-y":"Y \u8F74","axis-z":"Z \u8F74",align:"\u5171\u8F74","align-combo":"\u5171\u8F74\u89D2\u70B9","edge-align":"\u8FB9\u4E0A\xB7\u5171\u8F74",intersection:"\u4EA4\u70B9","cross-line":"\u4EA4\u7EBF","h-stop":"\u9AD8\u5EA6\u54AC\u5408","on-face":"\u9762\u4E0A"};function Gd(i){switch(i.type){case"BIRTH":return`\u8BDE\u751F \u9762#${i.face}`;case"DIVIDE":return`\u5206\u5272 \u9762#${i.from} \u2192 ${i.into.map(e=>`#${e}`).join(" + ")}`;case"MERGE":return`\u5408\u5E76 ${i.from.map(e=>`#${e}`).join("+")} \u2192 \u9762#${i.into}`;case"ABSORB":return`\u541E\u6D1E \u9762#${i.from} \u2192 \u9762#${i.into}`;case"BURST":return`\u7834\u819C \u9762#${i.face}`;case"STRETCH":return`\u62C9\u4F38 ${i.faces.map(e=>`\u9762#${e}`).join(" ")}`;case"FACE_ERASED":return`\u5220\u819C \u9762#${i.face}`}}h(Gd,"describeEvent");var Hd=h((i,e)=>Math.hypot(i.x-e.x,i.y-e.y,i.z-e.z),"dist"),us=.01;function io(i,e=1){let t=Math.abs(i)<1,n=t?i*100:i,s=Number(n.toFixed(e));return(Math.abs(n-s)>1e-6?"~":"")+s.toFixed(e)+(t?" cm":" m")}h(io,"fmtLen");var Wd=class Wd{constructor(e,t){this.canvas=e;this.host=t;U(this,"cam",new Po);U(this,"r3");U(this,"checkpoint",new _i);U(this,"journal",new nc);U(this,"_tool","line");U(this,"_revision",0);U(this,"anchor3",null);U(this,"gesturePlane",No);U(this,"rectFixed",null);U(this,"cursor3",null);U(this,"snapInfo",null);U(this,"moveVids",[]);U(this,"ppFace",null);U(this,"ppNormal",null);U(this,"ppH",0);U(this,"ppShellVids",new Set);U(this,"ppKnownVids",new Set);U(this,"ppStops",[]);U(this,"scrubAcc",new Set);U(this,"scrubbing",!1);U(this,"selection",wn());U(this,"marqueeStart",null);U(this,"marqueeCur",null);U(this,"hoverEdge",null);U(this,"hoverFace",null);U(this,"live",null);U(this,"liveEvents",[]);U(this,"armed",!1);U(this,"canArm",!1);U(this,"downScreen",null);U(this,"justCommitted",!1);U(this,"charged",new Map);U(this,"dwell",null);U(this,"lastSnap",null);U(this,"clickTrain",null);U(this,"pointerFrame",null);U(this,"viewExtras",null);U(this,"drawSuspended",!1);this.r3=new tc(e),this.cam.pitch=.61,this.cam.projection="persp"}get tool(){return this._tool}get kernel(){return this.checkpoint}get renderer3(){return this.r3}get revision(){return this._revision}canUndo(){return this.journal.canUndo()}canRedo(){return this.journal.canRedo()}hasSelection(){return this.selection.edges.size>0||this.selection.faces.size>0}isGestureActive(){return this.gestureActive()}vp(){return{w:this.canvas.clientWidth,h:this.canvas.clientHeight}}setPointerFrame(e,t){this.pointerFrame=e?{pf:e,vp:t??{w:800,h:800}}:null}frame(){return this.pointerFrame?.pf??this.cam}fvp(){return this.pointerFrame?.vp??this.vp()}eps(){return Io(this.frame(),this.fvp(),Ro*this.fvp().h/800)}snapPx(){return this.eps().snap}hitPx(){return this.eps().hit}setTool(e){this._tool=e,this.cancelGesture(),this.host.changed(),this.draw()}cancel(){this.selection=wn(),this.cancelGesture(),this.host.changed(),this.draw()}cancelGesture(){this.anchor3=null,this.moveVids=[],this.ppFace=null,this.ppNormal=null,this.ppShellVids=new Set,this.ppKnownVids=new Set,this.ppStops=[],this.ppH=0,this.rectFixed=null,this.lastSnap=null,this.armed=!1,this.canArm=!1,this.downScreen=null,this.justCommitted=!1,this.cursor3=null,this.snapInfo=null,this.scrubAcc=new Set,this.scrubbing=!1,this.marqueeStart=this.marqueeCur=null,this.hoverEdge=null,this.hoverFace=null,this.live=null,this.liveEvents=[],this.host.marquee(null),this.host.tip(null,0,0),this.host.hint(null)}commitOp(e){let t;try{t=this.journal.commit(this.checkpoint,e)}catch(n){return this.fail("commit",n),[]}return this.checkpoint=t.kernel,this._revision++,this.revalidateCharged(),this.host.changed(),t.events}fail(e,t){let n=t instanceof Error?t.message:String(t);this.host.error?.(t,e),this.host.hint(`\u64CD\u4F5C\u5931\u8D25\uFF08${e==="commit"?"\u63D0\u4EA4":"\u9884\u6F14"}\uFF09\uFF1A${n}`)}emit(e){e.length&&this.host.events(e)}undo(){if(this.gestureActive()){this.cancelGesture(),this.host.hint(null),this.host.changed(),this.draw();return}let e=this.journal.undo();e&&(this.checkpoint=e,this._revision++,this.revalidateCharged(),this.cancelGesture(),this.selection=wn(),this.host.separator("\u64A4\u9500"),this.host.changed(),this.draw())}redo(){let e=this.journal.redo(this.checkpoint);e&&(this.checkpoint=e.kernel,this._revision++,this.revalidateCharged(),this.cancelGesture(),this.selection=wn(),this.host.separator("\u91CD\u505A"),this.emit(e.events),this.host.changed(),this.draw())}clearAll(){this.cancelGesture(),this.selection=wn(),this.clearCharged(),this.host.separator("\u6E05\u7A7A"),this.commitOp({op:"clear"}),this.draw()}applyPreset(e){let t=Qs.find(n=>n.name===e);return t?(this.cancelGesture(),this.selection=wn(),this.clearCharged(),this.host.separator(`\u9884\u7F6E\uFF1A${t.name}\uFF08${t.note}\uFF09`),this.emit(this.commitOp({op:"preset",name:e})),this.draw(),!0):!1}addSegments(e,t){this.cancelGesture(),this.selection=wn(),this.host.separator(t);let n=this.commitOp({op:"addEdges",segs:e});return this.emit(n),this.draw(),n}pointerHitDistance(e,t){let n=this.liveWorld(),s=vs(n,this.frame(),this.fvp(),e,t);if(s===void 0)return null;let r=n.planeOf(s);if(!r)return null;let o=this.frame().ray(e,t,this.fvp()),a=Vn(o.origin,o.dir,r.plane.n,r.plane.d);return a?Math.hypot(a.x-o.origin.x,a.y-o.origin.y,a.z-o.origin.z):null}pickAt(e,t){return Hn(this.liveWorld(),this.frame(),this.fvp(),e,t,this.hitPx())}selectExpand(e,t,n=!1){let s=this.checkpoint,r=wn(),o=h(a=>{let l=s.face(a);if(l){r.faces.add(a);for(let c of[l.outer,...l.holes])for(let u of c.edges)r.edges.add(u.edge)}},"addFaceRing");if(e.edge!==void 0&&s.graph.hasEdge(e.edge)){if(r.edges.add(e.edge),t>=1)for(let a of s.graph.edge(e.edge).faceLinks)r.faces.add(a)}else e.face!==void 0&&s.face(e.face)&&(t>=1?o(e.face):r.faces.add(e.face));if(t>=2&&(e.edge!==void 0||e.face!==void 0)){let a=[...r.edges],l=[...r.faces];for(;a.length||l.length;){let c=l.pop();if(c!==void 0){let d=s.face(c);if(d)for(let g of[d.outer,...d.holes])for(let m of g.edges)r.edges.has(m.edge)||(r.edges.add(m.edge),a.push(m.edge));continue}let u=a.pop();if(!s.graph.hasEdge(u))continue;let f=s.graph.edge(u);for(let d of f.faceLinks)r.faces.has(d)||(r.faces.add(d),l.push(d));for(let d of[f.a,f.b])for(let g of s.graph.vertex(d).edges)r.edges.has(g)||(r.edges.add(g),a.push(g))}}if(n){for(let a of r.edges)this.selection.edges.add(a);for(let a of r.faces)this.selection.faces.add(a)}else this.selection=r;return this.host.changed(),this.draw(),!0}deleteSelection(){this.hasSelection()&&(this.emit(this.commitOp({op:"eraseSelection",faces:[...this.selection.faces],edges:[...this.selection.edges]})),this.selection=wn(),this.host.changed(),this.draw())}setView(e){this.cam.setView(e),this.draw()}zoomExtents(){this.cam.fitPoints(this.checkpoint.vertices(),this.vp()),this.draw()}toggleProjection(){this.cam.projection=this.cam.projection==="persp"?"ortho":"persp",this.host.changed(),this.draw()}alignSrcs(){return[...this.charged.values()]}chargePt(e){let t=`${e.x},${e.y},${e.z}`;for(this.charged.delete(t),this.charged.set(t,{...e});this.charged.size>3;)this.charged.delete(this.charged.keys().next().value)}trackCharge(e,t=300){if(!e||e.kind!=="endpoint"&&e.kind!=="midpoint"){this.dwell=null;return}let n=`${e.p.x},${e.p.y},${e.p.z}`;if(this.charged.has(n)){this.dwell=null;return}let s=performance.now();if(!this.dwell||this.dwell.key!==n){this.dwell={key:n,since:s};return}s-this.dwell.since>=t&&(this.chargePt(e.p),this.dwell=null)}revalidateCharged(){if(!this.charged.size)return;let e=new Set;for(let t of this.checkpoint.vertices())e.add(`${t.x},${t.y},${t.z}`);for(let t of this.checkpoint.edges()){let n=this.checkpoint.graph.pt(t.a),s=this.checkpoint.graph.pt(t.b);e.add(`${(n.x+s.x)/2},${(n.y+s.y)/2},${(n.z+s.z)/2}`)}for(let t of[...this.charged.keys()])e.has(t)||this.charged.delete(t)}clearCharged(){this.charged.clear(),this.dwell=null,this.lastSnap=null}applyHysteresis(e,t,n){if(e.kind!==null)return this.lastSnap=e,e;if(this.lastSnap?.kind){let s=this.frame().eps?.(this.fvp()),r=s?DS(s,this.lastSnap.kind):(FS[this.lastSnap.kind]??8)*(this.fvp().h/800);if(this.frame().distTo(t,n,this.lastSnap.p,this.fvp())<=r*1.5)return this.lastSnap}return this.lastSnap=null,e}gestureActive(){return this.anchor3!==null||this.moveVids.length>0||this.scrubbing||this.marqueeStart!==null}liveWorld(){return this.gestureActive()?this.live??this.checkpoint:this.checkpoint}freshHand(e,t=!1){let n=new Set(this.checkpoint.vertices().map(r=>r.id)),s={has:h(r=>!n.has(r)||(e?.(r)??!1),"has"),opaque:t};if(this._tool==="line"||this._tool==="rect"){let r=new Set;for(let o of this.liveEvents)o.type==="BIRTH"&&r.add(o.face);s.faces=o=>r.has(o)}return s}computeLive(){this.live=null,this.liveEvents=[];let e=h(s=>{let r=this.checkpoint.clone();try{this.liveEvents=s(r)}catch(o){this.liveEvents=[],this.live=null,this.fail("preview",o);return}this.live=r},"run"),t=this._tool,n="";if(t==="line"&&this.anchor3&&this.cursor3){let s=this.anchor3,r=this.cursor3;n=`\u957F ${io(Hd(s,r))}`,Hd(s,r)>=us&&e(o=>o.addEdges([[s,r]]))}else if(t==="rect"&&this.anchor3&&this.cursor3){let{plane:s,basis:r}=this.gesturePlane,o=zc(s,r,this.anchor3,this.cursor3),a=Me(this.cursor3,this.anchor3),l=a.x*r.u.x+a.y*r.u.y+a.z*r.u.z,c=a.x*r.v.x+a.y*r.v.y+a.z*r.v.z;n=`\u77E9\u5F62 ${io(Math.abs(l))} \xD7 ${io(Math.abs(c))}`,o.length&&e(u=>u.addEdges(o))}else if(t==="move"&&this.moveVids.length&&this.anchor3&&this.cursor3){let s=Me(this.cursor3,this.anchor3),r=this.moveVids;Math.hypot(s.x,s.y,s.z)>=us&&e(o=>o.moveVertices(Vc(this.checkpoint,r,s)))}else if(t==="pp"&&this.ppFace!==null&&Math.abs(this.ppH)>=us){let s=this.ppFace,r=this.ppH-Math.sign(this.ppH)*2e-6;e(o=>o.pushPull(s,r,{settleLanding:!1}))}else if(t==="eraseFace"&&this.hoverFace!==null){let s=this.hoverFace;e(r=>r.eraseFaces([s]))}if(this.live||n){let s=this.live?this.liveEvents.length?`\u9884\u89C8\uFF1A${this.liveEvents.map(Gd).join("\uFF1B")}`:"\u9884\u89C8\uFF1A\u65E0\u819C\u53D8\u5316":"";this.host.hint([n,s].filter(Boolean).join(" \uFF5C "))}}basePlaneOfAnchor(){return this.anchor3&&Math.abs(this.anchor3.z)<1e-6?No:void 0}lineSecondSnap(e,t){let n=Fo(this.liveWorld(),this.frame(),this.fvp(),this.anchor3,e,t,this.snapPx(),this.alignSrcs(),this.freshHand(),this.basePlaneOfAnchor());return n.snap.kind===null&&this.snapInfo&&ar(n.plane,this.frame().ray(e,t,this.fvp()))?this.snapInfo:(this.gesturePlane=n.plane,n.snap)}rectPlaneSnap(e,t){if(this.rectFixed)return this.snapInfo=bn(this.liveWorld(),this.frame(),this.fvp(),e,t,this.snapPx(),{plane:this.gesturePlane,alignSources:this.alignSrcs(),hand:this.freshHand()}),this.snapInfo.p;let n=Fo(this.liveWorld(),this.frame(),this.fvp(),this.anchor3,e,t,this.snapPx(),this.alignSrcs(),this.freshHand(),this.basePlaneOfAnchor());return n.snap.kind===null&&this.snapInfo&&ar(n.plane,this.frame().ray(e,t,this.fvp()))?this.snapInfo.p:(this.gesturePlane=n.plane,this.snapInfo=n.snap,n.snap.p)}setLoop(e){this.r3.setLoop(e)}batchDraw(e){this.drawSuspended=!0;try{e()}finally{this.drawSuspended=!1}this.draw()}draw(){this.drawSuspended||this.r3.render(this.checkpoint,this.cam,this.vp(),{...this.viewExtras?.()??{},selectionEdges:this.selection.edges,selectionFaces:this.selection.faces,scrubEdges:this.scrubAcc,hoverEdge:this.hoverEdge,hoverFace:this.hoverFace,preview:this.live,snap:this.snapInfo,snapAnchor:this.anchor3,revision:this._revision})}resize(e){this.r3.resize(this.vp(),e),this.draw()}updateTip(e,t){this.host.tip(this.snapInfo?.kind?Qm[this.snapInfo.kind]??this.snapInfo.kind:null,e,t)}pointerDown(e){let t=e;switch(this._tool){case"line":case"rect":{if(this.armed&&this.anchor3){this.justCommitted=!0,this._tool==="line"?this.commitLineTo(t.x,t.y):this.commitRectTo(t.x,t.y);break}if(this._tool==="rect"){let n=Bc(this.liveWorld(),this.frame(),this.fvp(),t.x,t.y,this.snapPx(),this.alignSrcs());this.rectFixed=n.fixed,this.gesturePlane=n.plane,this.snapInfo=n.snap}else{let n=Bc(this.liveWorld(),this.frame(),this.fvp(),t.x,t.y,this.snapPx(),this.alignSrcs());this.gesturePlane=n.plane,this.snapInfo=n.snap}this.anchor3=this.snapInfo.p,this.cursor3=this.anchor3,this.armed=!1,this.canArm=!!e.armable,this.downScreen={x:t.x,y:t.y};break}case"pp":{if(this.armed&&this.ppFace!==null&&this.anchor3){this.justCommitted=!0,this.commitPP();break}let n={face:vs(this.liveWorld(),this.frame(),this.fvp(),t.x,t.y)};if(n.face!==void 0){let s=this.checkpoint,r=s.planeOf(n.face);this.ppFace=n.face;let o=s.face(n.face);this.ppShellVids=new Set([...un(s.graph,o.outer),...o.holes.flatMap(c=>un(s.graph,c))]),this.ppKnownVids=new Set(s.vertices().map(c=>c.id)),this.ppNormal=r.plane.n,this.gesturePlane={plane:r.plane,basis:r.basis};let a=this.frame().ray(t.x,t.y,this.fvp()),l=Vn(a.origin,a.dir,r.plane.n,r.plane.d);this.anchor3=l??s.faceRings3(n.face).outer[0];{let c=new Set;c.add(0);for(let u of s.vertices())c.add(Math.round(ne(Me(u,this.anchor3),r.plane.n)*1e6)/1e6);this.ppStops=[...c].sort((u,f)=>u-f)}this.cursor3=this.anchor3,this.ppH=0,this.armed=!1,this.canArm=!!e.armable,this.downScreen={x:t.x,y:t.y},this.host.hint("\u63A8\u62C9\u4E2D\uFF1A\u6CBF\u6CD5\u5411\u62D6\u6216\u70B9\u4E24\u4E0B\u843D\u5B9A\uFF08\u6240\u89C1\u5373\u6240\u5F97\uFF1B\u5438\u70B9\u7EBF=\u53D6\u5176\u9AD8\u5EA6\uFF09")}break}case"move":{if(this.armed&&this.moveVids.length&&this.anchor3){this.justCommitted=!0,this.commitMoveTo(t.x,t.y);break}let n=Hn(this.liveWorld(),this.frame(),this.fvp(),t.x,t.y,this.hitPx()),s=this.hasSelection();this.moveVids=s?tp(this.checkpoint,this.selection):kc(this.checkpoint,n),this.moveVids.length&&(this.gesturePlane=Oc(this.liveWorld(),this.frame(),this.fvp(),t.x,t.y),this.anchor3=n.vertex!==void 0?this.checkpoint.graph.pt(n.vertex):bn(this.liveWorld(),this.frame(),this.fvp(),t.x,t.y,this.snapPx(),{plane:this.gesturePlane,alignSources:this.alignSrcs(),hand:this.freshHand()}).p,this.cursor3=this.anchor3,this.gesturePlane=Lo(this.frame(),this.anchor3),this.armed=!1,this.canArm=!!e.armable,this.downScreen={x:t.x,y:t.y},this.host.hint(s?"\u79FB\u52A8\u9009\u533A\uFF1A\u53C2\u8003\u70B9\u5DF2\u62FE\u53D6\uFF0C\u62D6\u62FD\u6216\u70B9\u4E24\u4E0B\u653E\u7F6E":"\u79FB\u52A8\u4E2D\u2026\u62D6\u62FD\u6216\u70B9\u4E24\u4E0B\u653E\u7F6E\uFF08\u6240\u89C1\u5373\u6240\u5F97\uFF09"));break}case"erase":{this.scrubbing=!0,this.scrubAcc=new Set,this.hoverEdge=null;let n=Hn(this.liveWorld(),this.frame(),this.fvp(),t.x,t.y,this.hitPx());n.edge!==void 0&&this.scrubAcc.add(n.edge),this.computeLive();break}case"select":this.marqueeStart={x:t.x,y:t.y},this.marqueeCur={x:t.x,y:t.y};break;case"eraseFace":break}this.draw()}pointerMove(e){let t=e;if(!this.gestureActive()){this.snapInfo=null,this.hoverEdge=null,this.hoverFace=null;let n=this._tool;if(n==="line"||n==="rect"||n==="move"){let s=Oc(this.liveWorld(),this.frame(),this.fvp(),t.x,t.y);this.snapInfo=this.applyHysteresis(bn(this.liveWorld(),this.frame(),this.fvp(),t.x,t.y,this.snapPx(),{plane:s,alignSources:this.alignSrcs(),hand:this.freshHand()}),t.x,t.y),this.trackCharge(this.snapInfo)}else n==="erase"?this.hoverEdge=Hn(this.liveWorld(),this.frame(),this.fvp(),t.x,t.y,this.hitPx()).edge??null:n==="eraseFace"&&(this.hoverFace=vs(this.liveWorld(),this.frame(),this.fvp(),t.x,t.y)??null,this.computeLive());this.updateTip(e.clientX,e.clientY),this.draw();return}switch(this._tool){case"line":this.anchor3&&(this.snapInfo=this.applyHysteresis(this.lineSecondSnap(t.x,t.y),t.x,t.y),this.trackCharge(this.snapInfo,120),this.cursor3=this.snapInfo.p);break;case"rect":this.anchor3&&(this.cursor3=this.rectPlaneSnap(t.x,t.y));break;case"pp":this.ppTrack(t.x,t.y,e.travel);break;case"move":if(this.moveVids.length&&this.anchor3){let n=new Set(this.moveVids);this.gesturePlane=Lo(this.frame(),this.anchor3);let s=bn(this.liveWorld(),this.frame(),this.fvp(),t.x,t.y,this.snapPx(),{plane:this.gesturePlane,anchor:this.anchor3,alignSources:this.alignSrcs(),hand:this.freshHand(r=>n.has(r))});if(s.kind===null){let r=Uc(this.frame(),this.fvp(),this.anchor3,t.x,t.y);r?s={p:r.p,kind:`axis-${r.axis}`}:this.cursor3&&ar(this.gesturePlane,this.frame().ray(t.x,t.y,this.fvp()))&&(s={p:this.cursor3,kind:null})}this.snapInfo=this.applyHysteresis(s,t.x,t.y),this.trackCharge(this.snapInfo,120),this.cursor3=this.snapInfo.p}break;case"erase":{let n=Hn(this.liveWorld(),this.frame(),this.fvp(),t.x,t.y,this.hitPx());n.edge!==void 0&&this.scrubAcc.add(n.edge);break}case"select":if(this.marqueeStart){this.marqueeCur={x:t.x,y:t.y};let n=Math.min(this.marqueeStart.x,t.x),s=Math.max(this.marqueeStart.x,t.x),r=Math.min(this.marqueeStart.y,t.y),o=Math.max(this.marqueeStart.y,t.y);this.host.marquee({x:n,y:r,w:s-n,h:o-r})}break;case"eraseFace":break}this._tool!=="select"&&this.computeLive(),this.updateTip(e.clientX,e.clientY),this.draw()}ppTrack(e,t,n){if(this.ppFace===null||!this.anchor3||!this.ppNormal)return;let s=this.anchor3,r=this.ppNormal,o=this.liveWorld(),a=this.ppH,l={has:h(m=>this.ppShellVids.has(m)||!this.ppKnownVids.has(m)&&Math.abs(ne(Me(o.graph.pt(m),s),r)-a)<.01,"has"),opaque:!0},c=this.applyHysteresis(bn(o,this.frame(),this.fvp(),e,t,this.snapPx(),{plane:this.gesturePlane,anchor:s,lines:!1,hand:l}),e,t);this.hoverFace=null;let u="",f=!1;if(c.kind!==null)this.snapInfo=c,this.ppH=ne(Me(c.p,s),r),u=`\uFF5C\u53D6${Qm[c.kind]??c.kind}\u9AD8\u5EA6`;else{this.snapInfo=null;let m=this.frame().ray(e,t,this.fvp()),y=Hn(o,this.frame(),this.fvp(),e,t,.5).face,p=y!==void 0?o.planeOf(y):void 0,x=y!==void 0&&(()=>{let S=o.face(y);return S?[...un(o.graph,S.outer),...S.holes.flatMap(M=>un(o.graph,M))].some(l.has):!0})();if(y!==void 0&&y!==this.ppFace&&!x&&p&&Math.abs(ne(p.plane.n,r))>.05){let S=Vn(m.origin,m.dir,p.plane.n,p.plane.d);S&&(this.ppH=ne(Me(S,s),r),this.hoverFace=y,u="\uFF5C\u53D6\u9762#"+y+" \u9AD8\u5EA6")}else{let S=bi(s,r,m.origin,m.dir);S?this.ppH=ne(Me(S,s),r):f=!0;let M=Math.max(this.frame().distBetween(s,Ue(s,r),this.fvp()),.5),_=this.eps().edge/M,A=null;for(let w of this.ppStops)Math.abs(w-this.ppH)<=_&&(A===null||Math.abs(w-this.ppH)<Math.abs(A-this.ppH))&&(A=w);A!==null&&(this.ppH=A,u=`\uFF5C\u9AD8\u5EA6\u54AC\u5408 ${io(A)}`,this.snapInfo={p:Ue(s,Re(r,this.ppH)),kind:"h-stop"})}}this.cursor3=Ue(s,Re(r,this.ppH));let d=n??(this.downScreen?Math.hypot(e-this.downScreen.x,t-this.downScreen.y):0),g=Math.abs(ne(r,this.frame().viewDir(s)));if(d>this.eps().drag&&Math.abs(this.ppH)<us&&(f||g>.9)){this.host.hint("\u63A8\u62C9\u6CA1\u52A8\uFF1A\u6B63\u5BF9\u7740\u8FD9\u5F20\u9762\u770B\uFF0C\u6CD5\u5411\u548C\u89C6\u7EBF\u5E73\u884C\uFF0C\u62D6\u4E0D\u51FA\u9AD8\u5EA6\u2014\u2014\u73AF\u7ED5\u4E00\u4E0B\u6362\u4E2A\u89D2\u5EA6\u518D\u62C9\uFF08Esc \u53D6\u6D88\uFF09");return}this.host.hint(`\u63A8\u62C9 h = ${io(this.ppH)}${u}\uFF08\u677E\u624B/\u518D\u70B9\u843D\u5B9A\uFF1BEsc \u53D6\u6D88\uFF09`)}pointerUp(e){let t=e,n=h(()=>!!this.downScreen&&(e.travel??Math.hypot(t.x-this.downScreen.x,t.y-this.downScreen.y))<=this.eps().tap,"isTap");switch(this._tool){case"line":{if(!this.anchor3)break;if(this.justCommitted){this.justCommitted=!1;break}if(this.canArm&&n()){this.armed=!0,this.host.hint("\u79FB\u52A8\u9884\u89C8\uFF0C\u518D\u70B9\u4E00\u4E0B\u843D\u7B14\uFF1BEsc \u53D6\u6D88");break}this.commitLineTo(t.x,t.y);break}case"rect":{if(!this.anchor3)break;if(this.justCommitted){this.justCommitted=!1;break}if(this.canArm&&n()){this.armed=!0,this.host.hint("\u79FB\u52A8\u9884\u89C8\uFF0C\u518D\u70B9\u4E00\u4E0B\u843D\u77E9\u5F62\uFF1BEsc \u53D6\u6D88");break}this.commitRectTo(t.x,t.y);break}case"pp":{if(this.ppFace===null||!this.anchor3){this.cancelGesture();break}if(this.justCommitted){this.justCommitted=!1;break}if(this.canArm&&n()){this.armed=!0,this.host.hint("\u63A8\u62C9\u4E2D\uFF1A\u79FB\u52A8\u5B9A\u9AD8\u5EA6\uFF0C\u518D\u70B9\u4E00\u4E0B\u843D\u5B9A\uFF1BEsc \u53D6\u6D88");break}this.commitPP();break}case"move":{if(!this.moveVids.length||!this.anchor3){this.cancelGesture();break}if(this.justCommitted){this.justCommitted=!1;break}if(this.canArm&&n()){this.armed=!0,this.host.hint("\u79FB\u52A8\u4E2D\uFF1A\u6240\u89C1\u5373\u6240\u5F97\u9884\u89C8\uFF0C\u518D\u70B9\u4E00\u4E0B\u653E\u7F6E\uFF1BEsc \u53D6\u6D88");break}this.commitMoveTo(t.x,t.y);break}case"erase":{let s=[...this.scrubAcc];this.cancelGesture(),s.length&&this.emit(this.commitOp({op:"eraseEdges",ids:s}));break}case"select":{if(!this.marqueeStart||!this.marqueeCur){this.cancelGesture();break}let s=e.shiftKey,r=Math.hypot(this.marqueeCur.x-this.marqueeStart.x,this.marqueeCur.y-this.marqueeStart.y)>4,o;if(r)o=ep(this.checkpoint,this.cam,this.vp(),{minX:Math.min(this.marqueeStart.x,this.marqueeCur.x),maxX:Math.max(this.marqueeStart.x,this.marqueeCur.x),minY:Math.min(this.marqueeStart.y,this.marqueeCur.y),maxY:Math.max(this.marqueeStart.y,this.marqueeCur.y)});else{let a=performance.now(),l=this.clickTrain&&a-this.clickTrain.t<350&&Math.hypot(t.x-this.clickTrain.x,t.y-this.clickTrain.y)<=6*(this.fvp().h/800)?{t:a,x:t.x,y:t.y,n:this.clickTrain.n+1}:{t:a,x:t.x,y:t.y,n:1};this.clickTrain=l;let c=Hn(this.liveWorld(),this.frame(),this.fvp(),t.x,t.y,this.hitPx());if(l.n>=2){this.marqueeStart=this.marqueeCur=null,this.host.marquee(null),this.selectExpand(c,l.n>=3?2:1,s);break}o=wn(),c.edge!==void 0?o.edges.add(c.edge):c.face!==void 0&&o.faces.add(c.face)}if(s){for(let a of o.edges)this.selection.edges.add(a);for(let a of o.faces)this.selection.faces.add(a)}else this.selection=o;this.marqueeStart=this.marqueeCur=null,this.host.marquee(null),this.host.changed();break}case"eraseFace":{let s={face:vs(this.liveWorld(),this.frame(),this.fvp(),t.x,t.y)};this.cancelGesture(),s.face!==void 0&&this.emit(this.commitOp({op:"eraseFaces",ids:[s.face]}));break}}this.draw()}pointerLeave(){this.gestureActive()||(this.snapInfo=null,this.hoverEdge=null,this.hoverFace=null,this.live=null,this.host.tip(null,0,0),this.host.hint(null),this.draw())}commitLineTo(e,t){let n=this.anchor3,s=this.lineSecondSnap(e,t).p;if(Hd(n,s)<us){this.cancelGesture();return}let r=this.commitOp({op:"addEdges",segs:[[n,s]]});this.emit(r),this.chargePt(n),this.chargePt(s),this.cancelGesture(),!(r.length>0)&&(this.anchor3=s,this.cursor3=s,this.armed=!0,this.host.hint("\u8FDE\u753B\u4E2D\uFF1A\u70B9\u4E0B\u4E00\u70B9\uFF1B\u51FA\u819C\u81EA\u52A8\u505C\uFF1BEsc \u6536\u7B14"))}commitRectTo(e,t){let n=this.rectPlaneSnap(e,t),s=zc(this.gesturePlane.plane,this.gesturePlane.basis,this.anchor3,n);this.cancelGesture(),s.length&&this.emit(this.commitOp({op:"addEdges",segs:s}))}commitPP(){let e=this.ppH,t=this.ppFace;this.cancelGesture(),Math.abs(e)>=us&&this.emit(this.commitOp({op:"pushpull",face:t,dist:e}))}commitMoveTo(e,t){let n=new Set(this.moveVids),s=bn(this.liveWorld(),this.frame(),this.fvp(),e,t,this.snapPx(),{plane:this.gesturePlane,anchor:this.anchor3,alignSources:this.alignSrcs(),hand:this.freshHand(l=>n.has(l))}).p,r=Me(s,this.anchor3),o=this.moveVids,a=Math.hypot(r.x,r.y,r.z);this.cancelGesture(),a>=us&&this.emit(this.commitOp({op:"move",moves:Vc(this.checkpoint,o,r)}))}};h(Wd,"Editor");var ic=Wd;var fi=h(i=>{let e=(Math.round(i*1e6)/1e6).toString();return e==="-0"?"0":e},"fmt");function tg(i,e={}){let t=[];t.push(`# CatsUp OBJ export${e.version?` (${e.version})`:""} \u2014 Z-up world written as Y-up (x, z, -y)`);let n=new Map,s=[],r=h(l=>{let c=`${fi(l.x)},${fi(l.y)},${fi(l.z)}`,u=n.get(c);return u===void 0&&(u=n.size+1,n.set(c,u),s.push(`v ${fi(l.x)} ${fi(l.z)} ${fi(-l.y)}`)),u},"vid"),o=[],a=0;for(let l of i.faces()){let c=i.faceRings3(l.id);if(c)if(l.holes.length===0)o.push(`f ${c.outer.map(u=>r(u)).join(" ")}`);else if(e.triangulateHoled)for(let[u,f,d]of e.triangulateHoled(i,l.id))o.push(`f ${r(u)} ${r(f)} ${r(d)}`);else a++,o.push(`f ${c.outer.map(u=>r(u)).join(" ")}`)}for(let l of i.edges())l.faceLinks.length===0&&o.push(`l ${r(i.graph.pt(l.a))} ${r(i.graph.pt(l.b))}`);return a&&t.push(`# warning: ${a} face(s) with holes exported as outer ring only (no triangulator supplied)`),t.push("o catsup"),t.push(...s,...o),t.join(`
`)+`
`}h(tg,"exportObj");function ng(i,e={}){let t=e.maxSegments??3e3,n=[],s=new Set,r=[],o=0,a=0,l=h(f=>`${fi(f.x)},${fi(f.y)},${fi(f.z)}`,"key"),c=h((f,d)=>{let g=l(f),m=l(d);if(g===m)return;let y=g<m?`${g}|${m}`:`${m}|${g}`;if(!s.has(y)&&(s.add(y),r.push([f,d]),r.length>t))throw new Error(`OBJ \u592A\u5927\uFF1A\u8D85\u8FC7 ${t} \u6761\u8FB9\uFF08\u9003\u751F\u53E3\u53EA\u63A5\u591A\u8FB9\u5F62\u5EFA\u6A21\u91CF\u7EA7\uFF0C\u4E0D\u63A5\u4E09\u89D2\u6C64\uFF09`)},"push"),u=h(f=>{let d=parseInt(f.split("/")[0],10);if(!Number.isFinite(d)||d===0)return null;let g=d>0?d-1:n.length+d;return n[g]??null},"resolve");for(let f of i.split(/\r?\n/)){let d=f.trim();if(!d||d.startsWith("#"))continue;let g=d.split(/\s+/),m=g[0];if(m==="v"){let y=parseFloat(g[1]),p=parseFloat(g[2]),x=parseFloat(g[3]);if(![y,p,x].every(Number.isFinite))continue;n.push({x:y,y:-x,z:p})}else if(m==="f"||m==="l"){let y=g.slice(1).map(u).filter(p=>p!==null);if(y.length<2)continue;if(m==="f"){o++;for(let p=0;p<y.length;p++)c(y[p],y[(p+1)%y.length])}else{a++;for(let p=0;p+1<y.length;p++)c(y[p],y[p+1])}}}return{segs:r,vertices:n.length,faces:o,looseLines:a}}h(ng,"parseObjSegments");function ig(i,e,t){let n=new Map,s=!1,r=-1/0,o=null,a=null,l=h(w=>{let T=i.getBoundingClientRect();return{x:w.clientX-T.left,y:w.clientY-T.top}},"local"),c=h(w=>{let T=l(w);return{x:T.x,y:T.y,clientX:w.clientX,clientY:w.clientY,pointerType:w.pointerType,armable:w.pointerType==="mouse",shiftKey:w.shiftKey}},"tp"),u=h(()=>[...n.entries()].filter(([,w])=>w.type==="touch"),"touches"),f=h(()=>[...n.values()].some(w=>w.role==="tool"),"toolPointerActive");function d(w){let T=performance.now();for(let[v,P]of u())(w||T-P.lastAt>8e3)&&n.delete(v);u().length<2&&(o=null),u().length===0&&(a=null)}h(d,"purgeTouches");function g(){let w=u();if(w.length<2)return;let[[,T],[,v]]=w;o={cx:(T.x+v.x)/2,cy:(T.y+v.y)/2,d:Math.hypot(T.x-v.x,T.y-v.y)},a||(a={firstDownTime:Math.min(...w.map(([,P])=>P.downAt)),isTap:!0,maxCount:0,start:new Map}),a.maxCount=Math.max(a.maxCount,w.length);for(let[P,C]of w)a.start.has(P)||a.start.set(P,{x:C.downX,y:C.downY}),C.role="multi"}h(g,"beginMulti");function m(w){let T=l(w);try{i.setPointerCapture(w.pointerId)}catch{}let v=performance.now();d(w.pointerType==="pen");let P={type:w.pointerType,role:"hold",x:T.x,y:T.y,downX:T.x,downY:T.y,downAt:v,lastAt:v};if(w.pointerType==="mouse"?(w.button===0?P.role=f()?"hold":"tool":P.role=w.shiftKey?"pan":"orbit",w.preventDefault()):w.pointerType==="pen"?(s=!0,r=v,P.role=f()?"hold":"tool"):v-r<600?P.role="hold":!s&&t.fingerDraws()&&u().length===0&&!f()?P.role="tool":P.role="orbit",n.set(w.pointerId,P),w.pointerType==="touch"){let C=u();if(C.length>=2){for(let[,I]of C)I.role==="tool"&&e.cancel();g();return}}if(P.role==="tool"){if(t.toolBlocked?.()){P.role="hold";return}e.pointerDown(c(w))}}h(m,"onDown");function y(w){let T=n.get(w.pointerId),v=l(w);if(!T){w.pointerType!=="touch"&&!f()&&(t.toolBlocked?.()?e.pointerLeave():e.pointerMove(c(w)));return}let P=v.x-T.x,C=v.y-T.y;switch(T.x=v.x,T.y=v.y,T.lastAt=performance.now(),w.pointerType==="pen"&&(r=T.lastAt),T.role){case"tool":e.pointerMove(c(w));return;case"orbit":if(t.look?.(P,C)){e.draw();return}e.cam.orbit(P,C),e.draw();return;case"pan":if(t.look?.(P,C)){e.draw();return}e.cam.pan(P,C,e.vp()),e.draw();return;case"multi":{if(a?.isTap)for(let[k,Z]of u()){let ee=a.start.get(k);if(ee&&Math.hypot(Z.x-ee.x,Z.y-ee.y)>16){a.isTap=!1;break}}let I=u().filter(([,k])=>k.role==="multi");if(I.length<2||!o)return;let[[,D],[,L]]=I,H=(D.x+L.x)/2,F=(D.y+L.y)/2,Y=Math.hypot(D.x-L.x,D.y-L.y);if(t.walking?.()){o.cx=H,o.cy=F,o.d=Y;return}e.cam.pan(H-o.cx,F-o.cy,e.vp()),Y>1&&o.d>1&&e.cam.zoomAt(o.d/Y,H,F,e.vp()),o.cx=H,o.cy=F,o.d=Y,e.draw();return}case"hold":return}}h(y,"onMove");function p(w,T){let v=n.get(w.pointerId);if(!v)return;n.delete(w.pointerId);let P=performance.now();if(w.pointerType==="pen"&&(r=P),v.role==="tool"){T?e.cancel():e.pointerUp(c(w));return}if(w.pointerType!=="touch")return;let C=u();if(C.length===0){if(a){let I=P-a.firstDownTime,D=P-r<600;!T&&a.isTap&&I<250&&!D&&(a.maxCount===2?t.onUndo():a.maxCount>=3&&t.onRedo()),a=null,o=null;return}v.role==="orbit"&&!T&&P-v.downAt<250&&Math.hypot(v.x-v.downX,v.y-v.downY)<16&&P-r>=600&&e.cancel();return}v.role==="multi"&&(C.length>=2?g():(C[0][1].role="hold",o=null))}h(p,"onUp");let x=h(w=>{if(w.preventDefault(),t.walking?.())return;let T=i.getBoundingClientRect();e.cam.zoomAt(w.deltaY>0?1.1:1/1.1,w.clientX-T.left,w.clientY-T.top,e.vp()),e.draw()},"onWheel"),S=h(()=>{f()||e.pointerLeave()},"onLeave"),M=h(w=>w.preventDefault(),"onCtx"),_=h(w=>p(w,!1),"up"),A=h(w=>p(w,!0),"cancel");return i.addEventListener("pointerdown",m),i.addEventListener("pointermove",y),i.addEventListener("pointerup",_),i.addEventListener("pointercancel",A),i.addEventListener("pointerleave",S),i.addEventListener("wheel",x,{passive:!1}),i.addEventListener("contextmenu",M),{penEverSeen:h(()=>s,"penEverSeen"),dispose(){i.removeEventListener("pointerdown",m),i.removeEventListener("pointermove",y),i.removeEventListener("pointerup",_),i.removeEventListener("pointercancel",A),i.removeEventListener("pointerleave",S),i.removeEventListener("wheel",x),i.removeEventListener("contextmenu",M)}}}h(ig,"attachGestures");var sg=1e-9;function NS(i,e,t){let n=Me(t,e),s=ne(n,n);if(s===0)return e;let r=Math.max(0,Math.min(1,ne(Me(i,e),n)/s));return{x:e.x+n.x*r,y:e.y+n.y*r,z:e.z+n.z*r}}h(NS,"closestOnSegment3");var Xd=class Xd{constructor(e,t=0){U(this,"faces",[]);U(this,"floor",0);U(this,"revision",-1);e&&this.rebuild(e,t)}rebuild(e,t=0){this.revision=t,this.faces=[],this.floor=0;for(let n of e.faces()){let s=e.planeOf(n.id),r=e.faceRings3(n.id);if(!s||!r||r.outer.length<3)continue;let o=[r.outer,...r.holes],a={x:1/0,y:1/0,z:1/0},l={x:-1/0,y:-1/0,z:-1/0};for(let c of r.outer)c.x<a.x&&(a.x=c.x),c.y<a.y&&(a.y=c.y),c.z<a.z&&(a.z=c.z),c.x>l.x&&(l.x=c.x),c.y>l.y&&(l.y=c.y),c.z>l.z&&(l.z=c.z);this.faces.push({plane:s.plane,basis:s.basis,outer2:n.outer.pts,holes2:n.holes.map(c=>c.pts),rings3:o,min:a,max:l})}}faceCount(){return this.faces.length}floorZ(){return this.floor}inside(e,t){let n={x:ne(t,e.basis.u),y:ne(t,e.basis.v)};if(!ft(n,e.outer2))return!1;for(let s of e.holes2)if(ft(n,s))return!1;return!0}pushOut(e,t){let n={x:e.x,y:e.y,z:e.z},s=!1;for(let r of this.faces){if(n.x+t<r.min.x||n.x-t>r.max.x||n.y+t<r.min.y||n.y-t>r.max.y||n.z+t<r.min.z||n.z-t>r.max.z)continue;let o=r.plane.n,a=ne(o,n)-r.plane.d;if(Math.abs(a)>=t)continue;let l={x:n.x-o.x*a,y:n.y-o.y*a,z:n.z-o.z*a};if(this.inside(r,l)){let d=(a>=0?1:-1)*(t-Math.abs(a));n.x+=o.x*d,n.y+=o.y*d,n.z+=o.z*d,s=!0;continue}let c=null,u=t;for(let f of r.rings3)for(let d=0;d<f.length;d++){let g=NS(n,f[d],f[(d+1)%f.length]),m=Math.hypot(n.x-g.x,n.y-g.y,n.z-g.z);m<u&&(u=m,c=g)}if(c&&u>1e-12){let f=(t-u)/u;n.x+=(n.x-c.x)*f,n.y+=(n.y-c.y)*f,n.z+=(n.z-c.z)*f,s=!0}}return s?{x:n.x-e.x,y:n.y-e.y,z:n.z-e.z}:null}floorBelow(e,t,n,s,r){let o=this.floor<=n+1e-9&&this.floor>=s-1e-9?this.floor:null;for(let a of this.faces){let l=a.plane.n;if(Math.abs(l.z)<r||e<a.min.x-1e-9||e>a.max.x+1e-9||t<a.min.y-1e-9||t>a.max.y+1e-9||a.max.z<s-1e-9||a.min.z>n+1e-9)continue;let c=(a.plane.d-l.x*e-l.y*t)/l.z;c>n+1e-9||c<s-1e-9||o!==null&&c<=o||this.inside(a,{x:e,y:t,z:c})&&(o=c)}return o}segmentHit(e,t){let n=null,s=Me(t,e);if(Math.abs(s.z)>sg){let a=(this.floor-e.z)/s.z;a>=0&&a<=1&&(n={p:{x:e.x+s.x*a,y:e.y+s.y*a,z:this.floor},n:{x:0,y:0,z:1},t:a})}let r={x:Math.min(e.x,t.x),y:Math.min(e.y,t.y),z:Math.min(e.z,t.z)},o={x:Math.max(e.x,t.x),y:Math.max(e.y,t.y),z:Math.max(e.z,t.z)};for(let a of this.faces){if(o.x<a.min.x||r.x>a.max.x||o.y<a.min.y||r.y>a.max.y||o.z<a.min.z||r.z>a.max.z)continue;let l=a.plane.n,c=ne(l,s);if(Math.abs(c)<sg)continue;let u=(a.plane.d-ne(l,e))/c;if(u<0||u>1||n&&u>=n.t)continue;let f={x:e.x+s.x*u,y:e.y+s.y*u,z:e.z+s.z*u};this.inside(a,f)&&(n={p:f,n:l,t:u})}return n}};h(Xd,"KernelCollisionWorld");var sc=Xd;function tr(i=1.7){return{walkX:0,walkY:0,dash:!1,turn:0,tpCharge:!1,tpBack:!1,tierStep:0,yawStep:0,jump:!1,crouch:!1,up:!1,down:!1,noclipToggle:!1,head:{local:{x:0,y:0,z:i},fwdLocal:{x:0,y:1,z:0}},aim:null}}h(tr,"emptyInput");function ag(i){return{...i,turn:0,tierStep:0,yawStep:0,noclipToggle:!1}}h(ag,"stripEdges");var rc={ENTER:.6,EXIT:.4,SECTOR_HALF:30*Math.PI/180,HOLD_HALF:45*Math.PI/180},rg={right:0,up:Math.PI/2,left:Math.PI,down:-Math.PI/2},og=h((i,e)=>{let t=i-e;for(;t>Math.PI;)t-=2*Math.PI;for(;t<-Math.PI;)t+=2*Math.PI;return Math.abs(t)},"angDiff"),qd=class qd{constructor(){U(this,"dir","none")}update(e,t){let n=Math.hypot(e,t),s=Math.atan2(t,e);if(this.dir!=="none"){if(n>=rc.EXIT&&og(s,rg[this.dir])<=rc.HOLD_HALF)return this.dir;this.dir="none"}if(n>=rc.ENTER){for(let r of["up","down","left","right"])if(og(s,rg[r])<=rc.SECTOR_HALF){this.dir=r;break}}return this.dir}};h(qd,"Dpad");var so=qd,Yd=class Yd{constructor(){U(this,"was",!1)}update(e,t){let n=e===t,s=n&&!this.was;return this.was=n,s}};h(Yd,"DirEdge");var pi=Yd,$d=class $d{constructor(){U(this,"was",!1)}update(e){let t=e&&!this.was;return this.was=e,t}};h($d,"ButtonEdge");var ro=$d,Kd=class Kd{constructor(e=.35){U(this,"lastDown",-1/0);U(this,"was",!1);U(this,"windowSec");this.windowSec=e}update(e,t){let n=e&&!this.was;if(this.was=e,!n)return!1;let s=t-this.lastDown<=this.windowSec;return this.lastDown=s?-1/0:t,s}};h(Kd,"DoubleTap");var er=Kd;var Zd=[5,8,12,1/0],US=1,OS=9.8,lg=.04,BS=3,Jd=300,jd=.3,zS=.15,kS=Math.PI/4;function cg(i,e,t,n){let s=n.g??OS,r=[e.origin],o=null;if(Number.isFinite(t)){let a=e.dir.x*t,l=e.dir.y*t,c=e.dir.z*t,u=e.origin;for(let f=lg;f<=BS+1e-9;f+=lg){let d={x:e.origin.x+a*f,y:e.origin.y+l*f,z:e.origin.z+c*f-.5*s*f*f};if(o=i.segmentHit(u,d),o){r.push(o.p);break}r.push(d),u=d}}else{let a={x:e.origin.x+e.dir.x*Jd,y:e.origin.y+e.dir.y*Jd,z:e.origin.z+e.dir.z*Jd};o=i.segmentHit(e.origin,a),r.push(o?o.p:a)}return o?Math.abs(o.n.z)<n.minNz?{points:r,hit:o,valid:!1,reason:"slope"}:n.headroomOk(o.p)?{points:r,hit:o,valid:!0,reason:"ok"}:{points:r,hit:o,valid:!1,reason:"headroom"}:{points:r,hit:null,valid:!1,reason:"no-hit"}}h(cg,"simulateArc");var Qd=h(()=>({charging:!1,tier:US,yawSteps:0,arc:null,cooldownUntil:-1,backHeld:0,last:null}),"initialTeleport");function hg(i,e,t,n,s,r){if(i.charging){if(e.tierStep&&(i.tier=Math.max(0,Math.min(Zd.length-1,i.tier+e.tierStep))),e.yawStep&&(i.yawSteps+=e.yawStep),e.tpBack)return i.charging=!1,i.arc=null,i.yawSteps=0,i.cooldownUntil=t+jd,{kind:"none"};if(e.tpCharge)return i.arc=e.aim?cg(s,e.aim,Zd[i.tier]*r.v0Scale,r):null,{kind:"none"};i.charging=!1;let o=i.arc,a=i.yawSteps*kS;return i.arc=null,i.yawSteps=0,i.cooldownUntil=t+jd,o?.valid&&o.hit?{kind:"jump",to:o.hit.p,headingDelta:a}:{kind:"none"}}if(e.tpCharge)return i.charging=!0,i.yawSteps=0,i.arc=e.aim?cg(s,e.aim,Zd[i.tier]*r.v0Scale,r):null,{kind:"none"};if(e.tpBack&&t>=i.cooldownUntil){if(i.backHeld+=n,i.backHeld>=zS&&i.last)return i.backHeld=-1/0,i.cooldownUntil=t+jd,{kind:"back",to:i.last.pos,heading:i.last.heading}}else i.backHeld=0;return{kind:"none"}}h(hg,"stepTeleport");var ds={walkSpeed:3,dashSpeed:6,flySpeed:5,flyDashSpeed:12,jumpVel:5.5,gravity:25,gravityHeld:15,terminalVel:50,height:1.7,radius:.3,stepHeight:.3,stickDown:.3,followTau:.06,crouchMinHead:.75,crouchDrop:.7,substepLen:.3,substepCap:8,maxRoomscaleStep:.5,snapTurnDeg:45,maxSlopeDeg:50,stickDeadzone:.15,passivePushCap:.05},oc=1/60,ug=8;function VS(i=ds){return{pos:{x:0,y:0,z:0},heading:0,trackingOrigin:{x:0,y:0},headZ:i.height,crouchDrop:0,velZ:0,grounded:!0,noclip:!1,scale:1,t:0,freezeReasons:new Set,discontinuity:!1,teleport:Qd()}}h(VS,"createPlayerState");var pg=h(i=>i.freezeReasons.size>0,"isFrozen"),mg=h(i=>({x:-Math.sin(i),y:Math.cos(i)}),"fwdOf"),gg=h(i=>({x:Math.cos(i),y:Math.sin(i)}),"rightOf");function mi(i,e,t){let n=mg(i),s=gg(i);return{x:s.x*e+n.x*t,y:s.y*e+n.y*t}}h(mi,"localToWorld2");function HS(i,e,t){let n=mg(i),s=gg(i);return{x:s.x*e+s.y*t,y:n.x*e+n.y*t}}h(HS,"worldToLocal2");function xg(i,e){let t=e.radius,n=i-t,s=Math.min(e.stepHeight+t,n),r=(s+n)*.5;return{r:t,topZ:n,bottomZ:s,midZ:r,degenerate:n<=s+.01}}h(xg,"capsuleSpheres");function GS(i,e,t,n,s){let r=xg(e,n),o=0,a=h(l=>{if(s-o<=1e-9)return;let c=t.pushOut({x:i.x,y:i.y,z:i.z+l},r.r);if(!c)return;let u=Math.hypot(c.x,c.y,c.z);if(u===0)return;let f=1,d=s-o;u>d&&(f=d/u,u=d),i.x+=c.x*f,i.y+=c.y*f,i.z+=c.z*f,o+=u},"push");return a(r.bottomZ),r.degenerate||(a(r.midZ),a(r.topZ)),o}h(GS,"resolveCapsuleOnce");function ef(i,e,t,n,s=1/0){let r=s,o=0;for(let a=0;a<5;a++){let l=GS(i,e,t,n,r);if(o+=l,l<1e-6||Number.isFinite(r)&&(r-=l,r<=1e-6))break}return o}h(ef,"resolveCapsule");var WS=[[0,0],[1,0],[-1,0],[0,1],[0,-1]];function XS(i,e,t){let n=i.z+t.stepHeight,s=i.z-t.stickDown,r=t.radius*.7,o=Math.cos(t.maxSlopeDeg*Math.PI/180),a=null;for(let[l,c]of WS){let u=e.floorBelow(i.x+l*r,i.y+c*r,n,s,o);u!==null&&(a===null||u>a)&&(a=u)}return a}h(XS,"groundProbe");function qS(i,e,t,n,s,r=.02){if(t<=e)return t;let o=s.radius,a=h(c=>!!n.pushOut({x:i.x,y:i.y,z:i.z+c-o},o-r),"blocked"),l=e;for(let c=e+.05;c<t;c+=.05){if(a(c))return l;l=c}return a(t)?l:t}h(qS,"clearHeadHeight");function YS(i,e,t){let n=xg(t.height,t),s=.02;return!(e.pushOut({x:i.x,y:i.y,z:i.z+n.bottomZ},n.r-s)||!n.degenerate&&(e.pushOut({x:i.x,y:i.y,z:i.z+n.midZ},n.r-s)||e.pushOut({x:i.x,y:i.y,z:i.z+n.topZ},n.r-s)))}h(YS,"standingClear");function dg(i,e,t,n,s){if(i.noclip){i.pos.x+=e,i.pos.y+=t;return}let r=Math.hypot(e,t),o=Math.min(s.substepCap,Math.max(1,Math.ceil(r/s.substepLen))),a=e/o,l=t/o;for(let c=0;c<o;c++)i.pos.x+=a,i.pos.y+=l,ef(i.pos,i.headZ,n,s)}h(dg,"sweepMove");function $S(i,e,t,n,s){let r={x:t.head.local.x-i.trackingOrigin.x,y:t.head.local.y-i.trackingOrigin.y},o=mi(i.heading,r.x,r.y);i.pos.x+=o.x,i.pos.y+=o.y,i.noclip||ef(i.pos,i.headZ,n,s),i.trackingOrigin={x:t.head.local.x,y:t.head.local.y},i.heading+=e,i.discontinuity=!0}h($S,"snapTurn");function KS(i,e,t,n,s=ds){i.t+=t;let r=pg(i);{let a=1-Math.exp(-t/.1);i.crouchDrop+=((e.crouch?s.crouchDrop:0)-i.crouchDrop)*a;let l=Math.max(s.crouchMinHead,e.head.local.z-i.crouchDrop);i.noclip||l<=i.headZ?i.headZ=l:i.headZ=Math.max(s.crouchMinHead,qS(i.pos,i.headZ,l,n,s))}e.turn&&$S(i,e.turn*s.snapTurnDeg*Math.PI/180,e,n,s),e.noclipToggle&&(i.noclip=!i.noclip,i.velZ=0,i.noclip||(i.grounded=!1));let o=Math.hypot(e.walkX,e.walkY);if(o>=s.stickDeadzone){let a=Math.min(o,1)/o,l=ZS(i.heading,e.head.fwdLocal),c=Math.hypot(l.x,l.y)||1,u=l.x/c,f=l.y/c,d=f,g=-u,m=(i.noclip?e.dash?s.flyDashSpeed:s.flySpeed:e.dash?s.dashSpeed:s.walkSpeed)*t*a;dg(i,(u*e.walkY+d*e.walkX)*m,(f*e.walkY+g*e.walkX)*m,n,s)}else{let a={x:e.head.local.x-i.trackingOrigin.x,y:e.head.local.y-i.trackingOrigin.y},l=mi(i.heading,a.x,a.y),c=Math.hypot(l.x,l.y);if(c>s.maxRoomscaleStep)i.trackingOrigin={x:e.head.local.x,y:e.head.local.y};else if(c>1e-9){let u={x:i.pos.x,y:i.pos.y};dg(i,l.x,l.y,n,s);let f={x:i.pos.x-u.x,y:i.pos.y-u.y},d=HS(i.heading,f.x,f.y);i.trackingOrigin={x:i.trackingOrigin.x+d.x,y:i.trackingOrigin.y+d.y}}}if(i.noclip){let a=(e.dash?s.flyDashSpeed:s.flySpeed)*t;e.up&&(i.pos.z+=a),e.down&&(i.pos.z-=a),i.velZ=0,i.grounded=!0}else if(!r){e.jump&&i.grounded&&(i.velZ=s.jumpVel,i.grounded=!1);let a=i.pos.z,l=ef(i.pos,i.headZ,n,s,s.passivePushCap);i.velZ>0&&i.pos.z<a-1e-4&&(i.velZ=0);let c=l>1e-6,u=i.velZ<=0?XS(i.pos,n,s):null;if(u!==null&&(!c||u>=i.pos.z-1e-6)){let f=1-Math.exp(-t/s.followTau);i.pos.z+=(u-i.pos.z)*f,i.velZ=0,i.grounded=!0}else if(c)i.velZ=0;else{i.grounded=!1;let f=e.jump&&i.velZ>0?s.gravityHeld:s.gravity;i.velZ-=f*t,i.velZ<-s.terminalVel&&(i.velZ=-s.terminalVel),i.pos.z+=i.velZ*t;let d=n.floorZ();i.pos.z<=d&&(i.pos.z=d,i.velZ=0,i.grounded=!0)}}if(r)i.teleport.charging&&(i.teleport.charging=!1,i.teleport.arc=null,i.teleport.yawSteps=0);else{let a=Math.cos(s.maxSlopeDeg*Math.PI/180),l=hg(i.teleport,e,i.t,t,n,{minNz:a,headroomOk:h(c=>YS(c,n,s),"headroomOk"),v0Scale:Math.sqrt(i.scale)});if(l.kind==="jump")i.teleport.last={pos:{...i.pos},heading:i.heading},fg(i,l.to,i.heading+l.headingDelta,e);else if(l.kind==="back"){let c={pos:{...i.pos},heading:i.heading};fg(i,l.to,l.heading,e),i.teleport.last=c}}}h(KS,"stepPlayer");function ZS(i,e){let t=mi(i,e.x,e.y);return{x:t.x,y:t.y,z:e.z}}h(ZS,"localToWorldFwd");function fg(i,e,t,n){i.pos={...e},i.heading=t,i.trackingOrigin={x:n.head.local.x,y:n.head.local.y},i.velZ=0,i.grounded=!0,i.discontinuity=!0}h(fg,"jumpTo");function oo(i,e){let t=mi(i.heading,i.trackingOrigin.x,i.trackingOrigin.y),n={x:i.pos.x-t.x,y:i.pos.y-t.y,z:i.pos.z-i.crouchDrop},s=mi(i.heading,e.x,e.y);return{origin:n,heading:i.heading,headWorld:{x:n.x+s.x,y:n.y+s.y,z:n.z+e.z}}}h(oo,"rigPose");var tf=class tf{constructor(e,t=ds){U(this,"state");U(this,"acc",0);U(this,"prev");U(this,"cur");U(this,"lastHead",{x:0,y:0,z:1.7});U(this,"world");U(this,"cfg");this.world=e,this.cfg=t,this.state=VS(t),this.prev=this.cur=oo(this.state,this.lastHead)}freeze(e){this.state.freezeReasons.add(e)}thaw(e){this.state.freezeReasons.delete(e)}setFrozen(e,t){t?this.freeze(e):this.thaw(e)}isFrozen(){return pg(this.state)}advance(e,t){this.lastHead=e.head.local,this.acc+=Math.min(t,.25);let n=0,s=!1,r=e;for(;this.acc>=oc&&n<ug;)this.prev=oo(this.state,this.lastHead),KS(this.state,r,oc,this.world,this.cfg),this.state.discontinuity&&(s=!0,this.state.discontinuity=!1),this.acc-=oc,n++,r=ag(r);n===ug&&(this.acc=0),this.cur=oo(this.state,this.lastHead),s&&(this.prev=this.cur)}pose(){let e=Math.max(0,Math.min(1,this.acc/oc)),t={x:this.prev.origin.x+(this.cur.origin.x-this.prev.origin.x)*e,y:this.prev.origin.y+(this.cur.origin.y-this.prev.origin.y)*e,z:this.prev.origin.z+(this.cur.origin.z-this.prev.origin.z)*e},n=mi(this.cur.heading,this.lastHead.x,this.lastHead.y);return{origin:t,heading:this.cur.heading,headWorld:{x:t.x+n.x,y:t.y+n.y,z:t.z+this.lastHead.z}}}reset(e,t,n){let s=this.state;s.pos={...e},s.heading=t,s.trackingOrigin={x:n.x,y:n.y},s.headZ=Math.max(this.cfg.crouchMinHead,n.z),s.velZ=0,s.grounded=!0,s.crouchDrop=0,s.teleport=Qd(),s.discontinuity=!1,this.lastHead=n,this.acc=0,this.prev=this.cur=oo(s,n)}handleTrackingReset(e,t){let n=this.state;n.heading+=e,n.trackingOrigin={x:t.x,y:t.y},this.lastHead=t,this.prev=this.cur=oo(n,t)}};h(tf,"PlayerSim");var ac=tf;var JS=new Set(["KeyW","KeyA","KeyS","KeyD","KeyQ","KeyE","Space","ControlLeft","ControlRight","ShiftLeft","ShiftRight","ArrowLeft","ArrowRight","ArrowUp","ArrowDown","KeyT","KeyG"]),nf=class nf{constructor(){U(this,"down",new Set);U(this,"edges",[]);U(this,"_enabled",!1);U(this,"dblJump",new er);U(this,"onKeyDown",h(e=>{if(!this._enabled)return;let t=e.target;t&&(t.tagName==="INPUT"||t.tagName==="TEXTAREA")||!JS.has(e.code)||e.metaKey||e.altKey||(!e.repeat&&!this.down.has(e.code)&&this.edges.push(e.code),this.down.add(e.code),e.preventDefault())},"onKeyDown"));U(this,"onKeyUp",h(e=>{this.down.delete(e.code)},"onKeyUp"));U(this,"onBlur",h(()=>{this.down.clear(),this.edges=[]},"onBlur"))}attach(){window.addEventListener("keydown",this.onKeyDown),window.addEventListener("keyup",this.onKeyUp),window.addEventListener("blur",this.onBlur)}detach(){window.removeEventListener("keydown",this.onKeyDown),window.removeEventListener("keyup",this.onKeyUp),window.removeEventListener("blur",this.onBlur),this.onBlur()}setEnabled(e){this._enabled=e,e||this.onBlur()}isDown(e){return this.down.has(e)}read(e,t,n=performance.now()/1e3){let s=this.down,r=tr();r.head=e,r.aim=t,r.walkX=(s.has("KeyD")?1:0)-(s.has("KeyA")?1:0),r.walkY=(s.has("KeyW")?1:0)-(s.has("KeyS")?1:0),r.dash=s.has("ShiftLeft")||s.has("ShiftRight"),r.jump=s.has("Space"),r.noclipToggle=this.dblJump.update(r.jump,n),r.crouch=s.has("ControlLeft")||s.has("ControlRight"),r.up=s.has("KeyE"),r.down=s.has("KeyQ"),r.tpCharge=s.has("KeyT"),r.tpBack=s.has("KeyG");let o=r.tpCharge;for(let a of this.edges)a==="ArrowLeft"?o?r.yawStep=1:r.turn=1:a==="ArrowRight"?o?r.yawStep=-1:r.turn=-1:a==="ArrowUp"&&o?r.tierStep=1:a==="ArrowDown"&&o&&(r.tierStep=-1);return this.edges=[],r}};h(nf,"FlatInput");var lc=nf;var yg=.004,cc=1.5,hc=5,jS=.05,QS=3,sf=class sf{constructor(e,t){U(this,"world",new sc);U(this,"sim",new ac(this.world,ds));U(this,"flat",new lc);U(this,"mode","orbit");U(this,"lookPitch",0);U(this,"saved",null);U(this,"cursor",{x:0,y:0});U(this,"externalInput",null);U(this,"editor");U(this,"canvas");U(this,"lastStance",null);this.editor=e,this.canvas=t,this.flat.attach(),t.addEventListener("pointermove",n=>{let s=t.getBoundingClientRect();this.cursor={x:n.clientX-s.left,y:n.clientY-s.top}})}getMode(){return this.mode}isWalking(){return this.mode==="walk"}isXR(){return this.mode==="xr"}enterXR(e){let t=this.editor.cam;this.mode==="orbit"&&(this.saved={target:{...t.target},yaw:t.yaw,pitch:t.pitch,halfH:t.halfH,projection:t.projection,nearMin:t.nearMin}),this.flat.setEnabled(!1),this.syncWorld(!0);let n=this.lastStance;return n||(n=this.defaultSpawn()),this.mode="xr",this.externalInput=e,n}defaultSpawn(){let t=-QS,n=this.world.floorBelow(0,t,50,this.world.floorZ()-1,.5);return{pos:{x:0,y:t,z:n??Math.max(0,this.world.floorZ())},heading:0}}exitXR(){if(this.mode!=="xr")return;this.lastStance={pos:{...this.sim.state.pos},heading:this.sim.state.heading},this.externalInput=null,this.mode="orbit";let e=this.editor.cam;this.saved&&(e.target=this.saved.target,e.yaw=this.saved.yaw,e.pitch=this.saved.pitch,e.halfH=this.saved.halfH,e.projection=this.saved.projection,e.nearMin=this.saved.nearMin),this.editor.draw()}get noclip(){return this.sim.state.noclip}setNoclip(e){this.sim.state.noclip=e}enterWalk(){if(this.mode==="walk")return;let e=this.editor.cam;this.saved={target:{...e.target},yaw:e.yaw,pitch:e.pitch,halfH:e.halfH,projection:e.projection,nearMin:e.nearMin},this.syncWorld(!0);let t=e.forward(),n=Math.atan2(-t.x,t.y),s=e.target,o=this.world.floorBelow(s.x,s.y,s.z+50,this.world.floorZ()-1,.5)??Math.max(s.z,this.world.floorZ());this.sim.reset({x:s.x,y:s.y,z:o},n,{x:0,y:0,z:ds.height}),this.lookPitch=Math.max(-cc,Math.min(cc,Math.asin(Math.max(-1,Math.min(1,t.z))))),this.mode="walk",this.flat.setEnabled(!0),e.projection="persp",e.nearMin=jS,this.syncCamera()}exitWalk(){if(this.mode!=="walk")return;this.mode="orbit",this.flat.setEnabled(!1);let e=this.editor.cam;this.saved&&(e.target=this.saved.target,e.yaw=this.saved.yaw,e.pitch=this.saved.pitch,e.halfH=this.saved.halfH,e.projection=this.saved.projection,e.nearMin=this.saved.nearMin),this.editor.draw()}toggleWalk(){this.mode==="walk"?this.exitWalk():this.enterWalk()}look(e,t){return this.mode!=="walk"?!1:(this.sim.state.heading-=e*yg,this.lookPitch=Math.max(-cc,Math.min(cc,this.lookPitch-t*yg)),this.syncCamera(),!0)}syncWorld(e=!1){(e||this.world.revision!==this.editor.revision)&&this.world.rebuild(this.editor.kernel,this.editor.revision)}tick(e){if(this.mode==="orbit")return;this.syncWorld(),this.sim.setFrozen("gesture",this.editor.isGestureActive());let t=this.mode==="xr"&&this.externalInput?this.externalInput(e):this.readFlat();this.sim.advance(t,e),this.mode==="walk"&&this.syncCamera()}readFlat(){let e=this.lookPitch,t={local:{x:0,y:0,z:ds.height},fwdLocal:{x:0,y:Math.cos(e),z:Math.sin(e)}},n=this.editor.vp(),s=n.w>0&&n.h>0?this.editor.cam.ray(this.cursor.x,this.cursor.y,n):null;return this.flat.read(t,s)}pose(){return this.sim.pose()}syncCamera(){let e=this.editor.cam,t=this.sim.pose(),n=t.heading,s=this.lookPitch,r={x:-Math.sin(n)*Math.cos(s),y:Math.cos(n)*Math.cos(s),z:Math.sin(s)},o=t.headWorld;e.target={x:o.x+r.x*hc,y:o.y+r.y*hc,z:o.z+r.z*hc},e.yaw=n-Math.PI/2,e.pitch=-s,e.halfH=hc*Math.tan(e.fovY/2)}teleportArc(){let e=this.sim.state.teleport.arc;return e?{points:e.points,valid:e.valid,landing:e.valid&&e.hit?e.hit.p:null}:null}dispose(){this.flat.detach()}};h(sf,"Locomotion");var uc=sf;var dc={w:800,h:800},eM={point:1,edge:.7,line:.5,combo:1.2,hit:1,snap:.8,planeNear:2,tap:.4,drag:1.2},of=180/Math.PI,vg=h(i=>Math.max(-1,Math.min(1,i)),"clamp1"),rf=h((i,e)=>Math.atan2(Qt(Et(i,e)),ne(i,e))*of,"angBetween"),af=class af{constructor(){U(this,"origin",{x:0,y:0,z:0});U(this,"dir",{x:0,y:1,z:0});U(this,"headDir",null);U(this,"downDir",null)}set(e,t,n){this.headDir=n?_n(n):null,this.origin=e.origin,this.dir=_n(e.dir)}current(){return{origin:this.origin,dir:this.dir}}cursor(){return{x:dc.w/2,y:dc.h/2}}markDown(){this.downDir=this.dir}travel(){return this.downDir?rf(this.downDir,this.dir):0}u(e){return _n(Me(e,this.origin))}angDeg(e){return rf(this.dir,e)}ray(e,t,n){return{origin:this.origin,dir:this.dir}}distTo(e,t,n,s){return this.angDeg(this.u(n))}distToSeg(e,t,n,s,r,o=!1){let a=Me(s,n),l=Qt(a);if(l<1e-12)return{d:this.distTo(0,0,n),t:0};let c=Re(a,1/l);if(o){let _=Et(Me(n,this.origin),c),A=Qt(_);if(A<1e-12)return{d:0,t:0};let w=Math.asin(vg(Math.abs(ne(this.dir,_)/A)))*of,T=bi(n,c,this.origin,this.dir);return{d:w,t:T?ne(Me(T,n),c)/l:0}}let u=this.u(n),f=this.u(s),d=Et(u,f),g=Qt(d),m=h(()=>{let _=this.angDeg(u),A=this.angDeg(f);return _<=A?{d:_,t:0}:{d:A,t:1}},"ends");if(g<1e-9)return m();let y=Re(d,1/g),p=ne(this.dir,y),x=Me(this.dir,Re(y,p)),S=Qt(x);if(S<1e-12)return m();let M=Re(x,1/S);if(ne(Et(u,M),y)>=0&&ne(Et(M,f),y)>=0){let _=Math.asin(vg(Math.abs(p)))*of,A=bi(n,c,this.origin,M),w=A?Math.max(0,Math.min(1,ne(Me(A,n),c)/l)):0;return{d:_,t:w}}return m()}distBetween(e,t,n){return rf(this.u(e),this.u(t))}distToRing(e,t,n,s){if(n.length>=3){let o=null;for(let a=0;a+2<n.length&&!o;a++)o=kn(n[a],n[a+1],n[a+2]);if(o){let a=Vn(this.origin,this.dir,o.n,o.d);if(a&&ne(Me(a,this.origin),this.dir)>0){let l=vi(o);if(ft(Yt(a,l),n.map(c=>Yt(c,l))))return 0}}}let r=1/0;for(let o=0;o<n.length;o++)r=Math.min(r,this.distToSeg(0,0,n[o],n[(o+1)%n.length],s).d);return r}dirCos(e,t,n,s,r){let o=this.u(n),a=Me(this.dir,Re(o,ne(this.dir,o))),l=Qt(a);return l<1e-9?s.map(()=>null):s.map(c=>{let u=this.u(Ue(n,Re(c,.01))),f=Me(u,Re(o,ne(u,o))),d=Qt(f);return d<1e-12?null:Math.abs(ne(a,f))/(l*d)})}viewDir(e){return _n(Me(this.origin,e))}forward(){return this.headDir??this.dir}eps(){return eM}};h(af,"XRPointerFrame");var fc=af;var lf=h(i=>({x:i.x,y:-i.z,z:i.y}),"refToRig");function tM(i,e){let{x:t,y:n,z:s,w:r}=i,o=2*(n*e.z-s*e.y),a=2*(s*e.x-t*e.z),l=2*(t*e.y-n*e.x);return{x:e.x+r*o+(n*l-s*a),y:e.y+r*a+(s*o-t*l),z:e.z+r*l+(t*a-n*o)}}h(tM,"rotateByQuat");var mc=h(i=>lf(tM(i,{x:0,y:0,z:-1})),"forwardRig");function nM(i,e){let t=mi(i.heading,e.x,e.y);return{x:i.origin.x+t.x,y:i.origin.y+t.y,z:i.origin.z+e.z}}h(nM,"rigToWorld");function cf(i,e){let t=mi(i.heading,e.x,e.y);return{x:t.x,y:t.y,z:e.z}}h(cf,"rigDirToWorld");function _g(i,e){return{origin:nM(e,lf(i.position)),dir:cf(e,mc(i.orientation))}}h(_g,"poseRayWorld");function iM(i){return{local:lf(i.position),fwdLocal:mc(i.orientation)}}h(iM,"headFrameOf");var bg=h(()=>({present:!1,ray:null,gripRay:null,trigger:!1,triggerValue:0,squeeze:!1,stickPress:!1,a:!1,b:!1,axes:{x:0,y:0}}),"emptyHand"),hf=class hf{constructor(){U(this,"dpadL",new so);U(this,"dpadR",new so);U(this,"turnL",new pi);U(this,"turnR",new pi);U(this,"tierUp",new pi);U(this,"tierDown",new pi);U(this,"yawL",new pi);U(this,"yawR",new pi);U(this,"xEdge",new ro);U(this,"yEdge",new ro);U(this,"dblA",new er);U(this,"lastHead",{local:{x:0,y:0,z:1.6},fwdLocal:{x:0,y:1,z:0}})}read(e,t,n,s,r,o=performance.now()/1e3){let a=bg(),l=bg(),c=null,u=t.getViewerPose(n);u&&(c={position:u.transform.position,orientation:u.transform.orientation},this.lastHead=iM(c));for(let p of e.inputSources){if(p.handedness!=="left"&&p.handedness!=="right")continue;let x=p.handedness==="left"?a:l;x.present=!0;let S=t.getPose(p.targetRaySpace,n);if(S&&(x.ray=_g({position:S.transform.position,orientation:S.transform.orientation},s)),p.gripSpace){let _=t.getPose(p.gripSpace,n);_&&(x.gripRay=_g({position:_.transform.position,orientation:_.transform.orientation},s))}let M=p.gamepad;if(M){let _=M.axes,A=Math.abs(_[2]??0)+Math.abs(_[3]??0),w=Math.abs(_[0]??0)+Math.abs(_[1]??0);x.axes=A>=w?{x:_[2]??0,y:-(_[3]??0)}:{x:_[0]??0,y:-(_[1]??0)},x.trigger=!!M.buttons[0]?.pressed,x.triggerValue=M.buttons[0]?.value??0,x.squeeze=!!M.buttons[1]?.pressed,x.stickPress=!!M.buttons[3]?.pressed,x.a=!!M.buttons[4]?.pressed,x.b=!!M.buttons[5]?.pressed}}let f=tr();f.head=this.lastHead,f.aim=l.ray;let d=this.dpadR.update(l.axes.x,l.axes.y);this.turnL.update(d,"left")&&(f.turn=1),this.turnR.update(d,"right")&&(f.turn=-1),f.tpCharge=d==="up",f.tpBack=d==="down";let g=this.dpadL.update(a.axes.x,a.axes.y);f.tpCharge?(this.tierUp.update(g,"up")&&(f.tierStep=1),this.tierDown.update(g,"down")&&(f.tierStep=-1),this.yawL.update(g,"left")&&(f.yawStep=1),this.yawR.update(g,"right")&&(f.yawStep=-1)):(f.walkX=a.axes.x,f.walkY=a.axes.y,this.tierUp.update("none","up"),this.tierDown.update("none","down"),this.yawL.update("none","left"),this.yawR.update("none","right")),f.dash=a.stickPress,r?(f.up=l.a,f.down=l.b):(f.jump=l.a,f.crouch=l.b),f.noclipToggle=this.dblA.update(l.a,o);let m=this.xEdge.update(a.a),y=this.yEdge.update(a.b);return{input:f,left:a,right:l,undoEdge:m,redoEdge:y,head:c}}};h(hf,"XRInput");var pc=hf;function Un(i,e,t=.7,n=60){if(i)for(let s of i.inputSources){if(e!=="both"&&s.handedness!==e)continue;let r=s.gamepad?.hapticActuators?.[0];r?.pulse&&r.pulse(t,n).catch(()=>{})}}h(Un,"pulse");var nr={w:512,h:520},uf={w:.16,h:.1625},gc=new Map;function sM(i,e,t){let n=`${i}|${e}`;if(gc.has(n))return gc.get(n);let s=document.getElementById(i);if(!s||s.tagName.toLowerCase()!=="symbol")return gc.set(n,null),null;let r=["viewBox","fill","stroke","stroke-width","stroke-linecap","stroke-linejoin"].map(c=>{let u=s.getAttribute(c);return u?`${c}="${u.replace(/currentColor/g,e)}"`:""}).join(" "),o=s.innerHTML.replace(/currentColor/g,e),a=`<svg xmlns="http://www.w3.org/2000/svg" ${r} width="64" height="64">${o}</svg>`,l=new Image;return l.onload=t,l.src="data:image/svg+xml;charset=utf-8,"+encodeURIComponent(a),gc.set(n,l),l}h(sM,"iconImage");var df=class df{constructor(e){U(this,"canvas");U(this,"ctx");U(this,"cells",[]);U(this,"hover",null);U(this,"pressed",null);U(this,"dirty",!0);U(this,"model");this.model=e,this.canvas=document.createElement("canvas"),this.canvas.width=nr.w,this.canvas.height=nr.h,this.ctx=this.canvas.getContext("2d")}setHover(e){e!==this.hover&&(this.hover=e,this.dirty=!0)}setPressed(e){e!==this.pressed&&(this.pressed=e,this.dirty=!0)}hovered(){return this.hover}hit(e,t){let n=e*nr.w,s=t*nr.h;for(let r of this.cells)if(n>=r.x&&n<=r.x+r.w&&s>=r.y&&s<=r.y+r.h&&!r.item.disabled)return r.id;return null}redraw(e=!1){if(!this.dirty&&!e)return!1;this.dirty=!1;let t=this.ctx,n=nr.w,s=nr.h,r=h(()=>{this.dirty=!0},"onIcon");t.clearRect(0,0,n,s),t.fillStyle="rgba(255,255,255,0.92)",xc(t,0,0,n,s,28),t.fill(),t.strokeStyle="rgba(0,0,0,0.12)",t.lineWidth=3,xc(t,1.5,1.5,n-3,s-3,27),t.stroke(),this.cells=[];let o=18;t.fillStyle="#4a4a4a",t.font="22px system-ui, -apple-system, 'PingFang SC', 'Noto Sans CJK SC', sans-serif",t.textBaseline="top";let a=rM(t,this.model.status(),n-40,2);for(let x of a)t.fillText(x,20,o),o+=28;o=Math.max(o,18+2*28)+10;let l=this.model.tools().filter(x=>!x.hidden),c=(n-40-2*10)/3,u=96;l.forEach((x,S)=>{let M=20+S%3*(c+10),_=o+Math.floor(S/3)*(u+10);this.cell(x,M,_,c,u,r,!0)}),o+=Math.ceil(l.length/3)*(u+10)+8;let f=this.model.edits().filter(x=>!x.hidden),d=(n-40-(f.length-1)*10)/Math.max(1,f.length),g=72;f.forEach((x,S)=>this.cell(x,20+S*(d+10),o,d,g,r,!1)),o+=g+18;let m=this.model.vr().filter(x=>!x.hidden),y=(n-40-(m.length-1)*10)/Math.max(1,m.length),p=72;return m.forEach((x,S)=>this.cell(x,20+S*(y+10),o,y,p,r,!1)),o+=p+12,t.fillStyle="#8a8780",t.font="18px system-ui, sans-serif",t.textAlign="right",t.fillText(this.model.version,n-20,s-30),t.textAlign="left",!0}cell(e,t,n,s,r,o,a){let l=this.ctx;this.cells.push({id:e.id,x:t,y:n,w:s,h:r,item:e});let c=this.hover===e.id,u=this.pressed===e.id;l.fillStyle=e.disabled?"rgba(0,0,0,0.03)":e.active?"#2b6cb0":u?"#cfe0f5":c?"rgba(43,108,176,0.16)":"rgba(0,0,0,0.05)",xc(l,t,n,s,r,14),l.fill(),c&&!e.disabled&&(l.strokeStyle="#2b6cb0",l.lineWidth=3,xc(l,t+1.5,n+1.5,s-3,r-3,13),l.stroke());let f=e.disabled?"#b0aca4":e.active?"#ffffff":e.danger?"#c0392b":"#2a2a2a",d=a?40:30,g=n+r/2;if(e.icon){let m=sM(e.icon,f,o),y=t+s/2-d/2,p=a?n+12:n+r/2-d/2-(a?0:12);m&&m.complete&&m.naturalWidth>0&&l.drawImage(m,y,p,d,d),g=a?n+12+d+20:n+r/2+22}l.fillStyle=f,l.font=`${a?22:20}px system-ui, -apple-system, 'PingFang SC', 'Noto Sans CJK SC', sans-serif`,l.textAlign="center",l.textBaseline="middle",l.fillText(e.label,t+s/2,g),l.textAlign="left",l.textBaseline="top"}};h(df,"WristPanel");var yc=df;function xc(i,e,t,n,s,r){i.beginPath(),i.moveTo(e+r,t),i.lineTo(e+n-r,t),i.quadraticCurveTo(e+n,t,e+n,t+r),i.lineTo(e+n,t+s-r),i.quadraticCurveTo(e+n,t+s,e+n-r,t+s),i.lineTo(e+r,t+s),i.quadraticCurveTo(e,t+s,e,t+s-r),i.lineTo(e,t+r),i.quadraticCurveTo(e,t,e+r,t),i.closePath()}h(xc,"roundRect");function rM(i,e,t,n){let s=[],r="";for(let o of e)if(i.measureText(r+o).width>t){if(s.push(r),r=o,s.length===n)return s[n-1]=s[n-1].slice(0,-1)+"\u2026",s}else r+=o;return r&&s.push(r),s}h(rM,"wrap");var ao={w:1024,h:176},ff={w:.9,h:.9*(ao.h/ao.w)},oM={neutral:"rgba(40,40,40,0.82)",info:"rgba(30,60,100,0.85)",warning:"rgba(120,80,10,0.88)",error:"rgba(140,30,30,0.9)"},aM="40px system-ui, -apple-system, 'PingFang SC', 'Noto Sans CJK SC', sans-serif";function Sg(i,e="neutral"){let t=document.createElement("canvas");t.width=ao.w,t.height=ao.h;let n=t.getContext("2d"),{w:s,h:r}=ao;n.clearRect(0,0,s,r),n.fillStyle=oM[e];let o=28;n.beginPath(),n.moveTo(o,0),n.lineTo(s-o,0),n.quadraticCurveTo(s,0,s,o),n.lineTo(s,r-o),n.quadraticCurveTo(s,r,s-o,r),n.lineTo(o,r),n.quadraticCurveTo(0,r,0,r-o),n.lineTo(0,o),n.quadraticCurveTo(0,0,o,0),n.closePath(),n.fill(),n.fillStyle="#ffffff",n.font=aM,n.textBaseline="middle",n.textAlign="center";let a=lM(n,i,s-80,2),l=52,c=r/2-(a.length-1)*l/2;return a.forEach((u,f)=>n.fillText(u,s/2,c+f*l)),t}h(Sg,"bakeToast");function lM(i,e,t,n){let s=[],r="";for(let o of e)if(i.measureText(r+o).width>t){if(s.push(r),r=o,s.length===n)break}else r+=o;if(s.length<n&&r&&s.push(r),s.length===n&&(r.length>0&&!s.includes(r)||i.measureText(e).width>t*n)){let o=s[n-1];s[n-1]=o.slice(0,Math.max(0,o.length-1))+"\u2026"}return s}h(lM,"wrap");var cM=.3,hM=.6,pf=class pf{constructor(e){U(this,"supported",!1);U(this,"presenting",!1);U(this,"xrInput",new pc);U(this,"frameIn",tr());U(this,"firstFrame",!1);U(this,"spawn",null);U(this,"pendingResetYaw",null);U(this,"resetAttached",!1);U(this,"pointer",new fc);U(this,"trigWas",!1);U(this,"toolDown",!1);U(this,"panelPressId",null);U(this,"holdT",0);U(this,"holdStage",0);U(this,"panel");U(this,"lastHint","");U(this,"opts");U(this,"exitRequested",!1);U(this,"toastTimer",null);this.opts=e,this.panel=new yc(e.hud);let t=e.editor.renderer3.xr;t.on("sessionstart",()=>this.onStart()),t.on("sessionend",()=>this.onEnd()),navigator.xr?.isSessionSupported("immersive-vr").then(n=>{this.supported=n,e.onChange()}).catch(()=>{})}isSupported(){return this.supported}isPresenting(){return this.presenting}enter(){!navigator.xr||this.presenting||navigator.xr.requestSession("immersive-vr",{optionalFeatures:["local-floor"]}).then(e=>this.opts.editor.renderer3.xr.setSession(e)).catch(e=>this.opts.log?.(`VR session failed: ${e.message}`))}exit(){let e=this.opts.editor.renderer3.xr.session();if(!e){this.opts.log?.("VR exit: no session");return}this.exitRequested=!0,e.end().then(()=>this.opts.log?.("VR exit: session.end() resolved (app path)")).catch(t=>this.opts.log?.(`VR exit: session.end() rejected: ${t.message}`))}onStart(){let{editor:e,locomotion:t}=this.opts;this.presenting=!0,this.firstFrame=!0,this.resetAttached=!1,this.pendingResetYaw=null,this.trigWas=!1,this.toolDown=!1,this.panelPressId=null,this.holdStage=0,this.holdT=0,this.spawn=t.enterXR(()=>this.frameIn),e.setPointerFrame(this.pointer,dc),e.renderer3.attachWristPanel(this.panel.canvas,uf.w,uf.h,this.opts.leftHanded()?"right":"left"),this.panel.dirty=!0,this.opts.onChange()}onEnd(){let{editor:e,locomotion:t}=this.opts;this.opts.log?.(`VR sessionend (${this.exitRequested?"app path":"system/other path"})`),this.exitRequested=!1,this.presenting=!1,this.toolDown&&(e.cancel(),this.toolDown=!1),e.setPointerFrame(null),e.renderer3.detachWristPanel(),e.renderer3.detachSubtitle(),this.toastTimer&&(clearTimeout(this.toastTimer),this.toastTimer=null),e.renderer3.setPointerVisual("left",null),e.renderer3.setPointerVisual("right",null),t.exitXR(),this.opts.onChange()}invalidatePanel(){this.panel.dirty=!0}toast(e,t="neutral"){this.presenting&&(this.opts.editor.renderer3.attachSubtitle(Sg(e,t),ff.w,ff.h),this.toastTimer&&clearTimeout(this.toastTimer),this.toastTimer=setTimeout(()=>{this.toastTimer=null,this.opts.editor.renderer3.detachSubtitle()},t==="error"?6e3:4e3))}tick(e){if(!this.presenting)return;let{editor:t,locomotion:n}=this.opts,s=t.renderer3,r=s.xr.session(),o=s.xr.frame(),a=s.xr.refSpace();if(!r||!o||!a)return;this.attachReset(a);let l=this.xrInput.read(r,o,a,n.pose(),n.noclip);this.firstFrame&&l.head&&this.spawn&&(n.sim.reset(this.spawn.pos,this.spawn.heading,l.input.head.local),this.firstFrame=!1,l=this.xrInput.read(r,o,a,n.pose(),n.noclip)),this.pendingResetYaw!==null&&l.head&&(n.sim.handleTrackingReset(this.pendingResetYaw,l.input.head.local),this.pendingResetYaw=null);let c=this.opts.leftHanded(),u=c?l.left:l.right,f=c?l.right:l.left,d=c?"left":"right";this.frameIn=l.input,n.tick(e),s.setRig(n.pose()),l.undoEdge&&(t.undo(),Un(r,f===l.left?"left":"right",.4,40)),l.redoEdge&&(t.redo(),Un(r,f===l.left?"left":"right",.4,40));let g=u.trigger,m=g&&!this.trigWas,y=!g&&this.trigWas;this.trigWas=g;let p=n.sim.state.teleport.charging;t.batchDraw(()=>{if(p){this.toolDown&&(t.cancel(),this.toolDown=!1,this.holdStage=0),this.panelPressId&&(this.panelPressId=null,this.panel.setPressed(null)),this.panel.hovered()&&this.panel.setHover(null),t.pointerLeave(),s.setPointerVisual(d,null);return}if(!u.ray){s.setPointerVisual(d,null);return}let S=s.wristHit(u.ray),M=S?this.panel.hit(S.u,S.v):null;if(S&&!this.toolDown)M!==this.panel.hovered()&&(this.panel.setHover(M),M&&Un(r,d,.25,20)),m&&M&&(this.panelPressId=M,this.panel.setPressed(M),Un(r,d,.6,40)),y&&this.panelPressId&&(M===this.panelPressId&&this.opts.hud.pick(M),this.panelPressId=null,this.panel.setPressed(null)),s.setPointerVisual(d,{length:S.dist,color:9133302}),this.toolDown||t.pointerLeave();else{this.panel.hovered()&&this.panel.setHover(null),this.panelPressId&&y&&(this.panelPressId=null,this.panel.setPressed(null));let _=l.head?cf(n.pose(),mc(l.head.orientation)):void 0;this.pointer.set(u.ray,void 0,_);let A=this.pointer.cursor(),w=h(()=>({x:A.x,y:A.y,clientX:0,clientY:0,pointerType:"xr",shiftKey:!1,travel:this.pointer.travel()}),"tp");t.tool==="select"?this.selectTick(m,g,y,e,r,d):this.panelPressId||(m?(this.pointer.markDown(),this.toolDown=!0,t.pointerDown(w()),Un(r,d,.5,30)):y&&this.toolDown?(this.toolDown=!1,t.pointerUp(w()),Un(r,d,.35,25)):t.pointerMove(w()));let T=t.pointerHitDistance(A.x,A.y);if(T===null){let P=n.world.segmentHit(u.ray.origin,{x:u.ray.origin.x+u.ray.dir.x*300,y:u.ray.origin.y+u.ray.dir.y*300,z:u.ray.origin.z+u.ray.dir.z*300});T=P?P.t*300:3}s.setPointerVisual(d,{length:T,color:this.toolDown?13382451:2845872})}});let x=this.opts.hud.status();x!==this.lastHint&&(this.lastHint=x,this.panel.dirty=!0),this.panel.redraw()&&s.updateWristTexture()}selectTick(e,t,n,s,r,o){let a=this.opts.editor,l=this.pointer.cursor();if(e&&(this.holdT=0,this.holdStage=0,this.pointer.markDown(),this.toolDown=!0),t&&this.toolDown){this.holdT+=s;let c=a.pickAt(l.x,l.y);this.holdStage===0&&this.holdT>=cM?(this.holdStage=1,a.selectExpand(c,1),Un(r,o,.7,50)):this.holdStage===1&&this.holdT>=hM&&(this.holdStage=2,a.selectExpand(c,2),Un(r,o,.9,50),setTimeout(()=>Un(r,o,.9,50),90));return}if(n&&this.toolDown){this.toolDown=!1,this.holdStage===0&&(a.selectExpand(a.pickAt(l.x,l.y),0),Un(r,o,.35,25)),this.holdStage=0;return}a.pointerMove({x:l.x,y:l.y,clientX:0,clientY:0,pointerType:"xr",shiftKey:!1})}attachReset(e){this.resetAttached||(this.resetAttached=!0,e.addEventListener("reset",t=>{let n=t.transform?.orientation;if(!n){this.pendingResetYaw=0;return}let s=2*(n.w*n.y+n.z*n.x),r=1-2*(n.y*n.y+n.x*n.x);this.pendingResetYaw=Math.atan2(s,r)}))}};h(pf,"VR");var vc=pf;var Mg=new Set(["localhost","127.0.0.1","::1",""]);function wg(i){let e=location.pathname.includes("/dev/")||Mg.has(location.hostname),t=null;async function n(){try{await i.onBeforeReload?.()}catch{}let o=t??await navigator.serviceWorker?.getRegistration()??null;if(!o||!o.waiting){location.reload();return}let a=!1,l=h(()=>{a||(a=!0,location.reload())},"doReload");navigator.serviceWorker.addEventListener("controllerchange",l,{once:!0}),o.waiting.postMessage({type:"skip-waiting"}),setTimeout(l,5e3)}h(n,"reload");async function s(){await h((l,c)=>Promise.race([Promise.resolve(l).catch(()=>{}),new Promise(u=>setTimeout(u,c))]),"settle")(i.onBeforeReload?.(),4e3);try{if(navigator.serviceWorker)for(let l of await navigator.serviceWorker.getRegistrations())await l.unregister().catch(()=>{});if(typeof caches<"u")for(let l of await caches.keys())await caches.delete(l).catch(()=>{})}catch{}let a=`${location.pathname}?reset=${Date.now()}`;setTimeout(()=>location.replace(a),150),setTimeout(()=>{location.href=a},2500)}h(s,"forceReset");let r=h(()=>{t?.update().catch(()=>{}),i.onForeground?.()},"onFg");return document.addEventListener("visibilitychange",()=>{document.visibilityState==="visible"&&r()}),window.addEventListener("focus",r),"serviceWorker"in navigator&&!Mg.has(location.hostname)&&(navigator.serviceWorker.addEventListener("message",o=>{o.data?.type==="asset-updated"&&i.onUpdateAvailable()}),navigator.serviceWorker.register("./service-worker.js").then(o=>{t=o,o.waiting&&navigator.serviceWorker.controller&&i.onUpdateAvailable(),o.addEventListener("updatefound",()=>{let a=o.installing;a&&a.addEventListener("statechange",()=>{a.state==="installed"&&navigator.serviceWorker.controller&&i.onUpdateAvailable()})}),setInterval(()=>{o.update().catch(()=>{})},10*60*1e3)}).catch(o=>{console.warn("[pwa] SW register failed",o)})),{isDevRoute:e,reload:n,forceReset:s}}h(wg,"initPwaShell");function lo(i,e={}){let{size:t,cls:n}=e;return`<svg ${['viewBox="0 0 24 24"',n?`class="${n}"`:'class="ico"',t?`width="${t}" height="${t}"`:"",'aria-hidden="true"'].filter(Boolean).join(" ")}><use href="#${i}"/></svg>`}h(lo,"iconHtml");var fs=null,mf=null;function Eg(){fs?.close()}h(Eg,"closePopupMenu");function gf(i){return fs&&mf===i.anchor?(fs.close(),null):uM(i)}h(gf,"togglePopupMenu");function uM(i){fs?.close();let e=document.createElement("div");e.className="popup-menu",e.setAttribute("role","menu"),document.body.appendChild(e);let t=!0,n=h(()=>{e.textContent="";for(let c of i.items()){if(c.separatorBefore){let f=document.createElement("div");f.className="menu-sep",e.appendChild(f)}let u=document.createElement("button");u.type="button",u.className="menu-item",u.disabled=!!c.disabled,u.innerHTML=`${c.icon?lo(c.icon):'<span class="ico-gap"></span>'}<span class="menu-label"></span>${c.hint?'<span class="menu-hint"></span>':""}${c.checked?lo("check",{cls:"ico menu-check"}):""}`,u.querySelector(".menu-label").textContent=c.label,c.hint&&(u.querySelector(".menu-hint").textContent=c.hint),u.addEventListener("click",()=>{i.onPick(c.id)==="keep"?n():a()}),e.appendChild(u)}s()},"render"),s=h(()=>{let c=i.anchor.getBoundingClientRect(),u=window.innerWidth,f=window.innerHeight;e.style.left="0px",e.style.top="0px";let d=e.offsetWidth,g=e.offsetHeight,m=i.align==="end"?c.right-d:c.left,y=c.bottom+4;m+d>u-6&&(m=u-6-d),m<6&&(m=6),y+g>f-6&&(y=Math.max(6,c.top-4-g)),e.style.left=`${m}px`,e.style.top=`${y}px`},"position"),r=h(c=>{let u=c.composedPath();u.includes(e)||u.includes(i.anchor)||a()},"onDocDown"),o=h(c=>{c.key==="Escape"&&(c.stopPropagation(),a())},"onKey"),a=h(()=>{t&&(t=!1,e.remove(),document.removeEventListener("pointerdown",r,!0),window.removeEventListener("keydown",o,!0),window.removeEventListener("resize",s),fs===l&&(fs=null,mf=null),i.anchor.classList.remove("is-open"))},"close"),l={el:e,close:a,refresh:n,isOpen:h(()=>t,"isOpen")};return n(),i.anchor.classList.add("is-open"),setTimeout(()=>{t&&document.addEventListener("pointerdown",r,!0)},0),window.addEventListener("keydown",o,!0),window.addEventListener("resize",s),fs=l,mf=i.anchor,l}h(uM,"openPopupMenu");var co=new Map,dM=0;function fM(){let i=document.getElementById("noticeStack");return i||(i=document.createElement("div"),i.id="noticeStack",document.body.appendChild(i)),i}h(fM,"stack");function Tg(i){let e=i.id??`n${++dM}`,t=i.level??"neutral",n=co.get(e);n?.timer&&clearTimeout(n.timer);let s=n?.el??document.createElement("div");s.className=`toast toast-${t}`,s.setAttribute("role",t==="error"?"alert":"status"),s.textContent="";let r=document.createElement("span");r.className="toast-text",r.textContent=i.text,s.appendChild(r);let o=h(()=>{let u=co.get(e);u&&(u.timer&&clearTimeout(u.timer),u.el.remove(),co.delete(e))},"close");if(i.actions?.length){let u=document.createElement("span");u.className="toast-actions";for(let f of i.actions){let d=document.createElement("button");d.type="button",d.className=f.primary?"toast-btn primary":"toast-btn",d.textContent=f.label,d.addEventListener("click",()=>{f.onClick(),o()}),u.appendChild(d)}s.appendChild(u)}let a=document.createElement("button");a.type="button",a.className="toast-x",a.setAttribute("aria-label","\u5173\u95ED"),a.textContent="\xD7",a.addEventListener("click",o),s.appendChild(a),n||fM().appendChild(s);let c=i.timeoutMs===null||i.timeoutMs===void 0&&(!!i.actions?.length||t==="error"||t==="warning")?null:window.setTimeout(o,i.timeoutMs??3500);return co.set(e,{el:s,timer:c}),{id:e,close:o,isOpen:h(()=>co.has(e),"isOpen")}}h(Tg,"showNotice");function qi(i){Tg(i),rn?.toast(i.text,i.level??"neutral")}h(qi,"notify");var xf={text:"",at:0};function mo(i,e){let t=e instanceof Error?e.message:String(e);console.error(`[catsup] ${i}:`,e);let n=e instanceof Error&&e.stack?e.stack.split(`
`).slice(1,4).map(o=>(o.match(/at\s+([\w$.<>]+)/)??[])[1]).filter(Boolean):[],s=`\u51FA\u9519\uFF08${i}\uFF09\uFF1A${t}${n.length?` @ ${n.join(" < ")}`:""}`,r=performance.now();s===xf.text&&r-xf.at<2e3||(xf={text:s,at:r},qi({id:"err",text:s,level:"error"}))}h(mo,"reportError");var bt=h(i=>{let e=document.getElementById(i);if(!e)throw new Error(`missing #${i}`);return e},"$"),ir={get(i){try{return localStorage.getItem(`catsup.ui.${i}`)}catch{return null}},set(i,e){try{localStorage.setItem(`catsup.ui.${i}`,e)}catch{}}},uo=ir.get("fingerDraws")==="1",fo=ir.get("leftHanded")==="1",Sc=ir.get("lab")==="1"||new URLSearchParams(location.search).has("lab"),Mc=bt("board"),pM=bt("stage"),go=bt("hint"),ho=bt("tip"),yf=bt("marquee"),mM=bt("toolbar"),po=bt("labLog"),Rg=bt("lab"),gM=bt("build"),xM="\u753B\u7EBF L \xB7 \u77E9\u5F62 R \xB7 \u79FB\u52A8 M \xB7 \u63A8\u62C9 P \xB7 \u6A61\u76AE E \xB7 \u9009\u62E9 \u7A7A\u683C \uFF5C \u53F3\u952E/\u5355\u6307\u62D6=\u73AF\u7ED5 \xB7 \u53CC\u6307=\u5E73\u79FB\u7F29\u653E \xB7 \u6EDA\u8F6E=\u7F29\u653E \uFF5C Esc \u53D6\u6D88",yM="\u6B65\u884C\uFF1AWASD \u8D70 \xB7 Shift \u51B2\u523A \xB7 \u7A7A\u683C \u8DF3\uFF08\u53CC\u51FB=\u98DE\u884C\u5F00\u5173\uFF09\xB7 Ctrl \u8E72 \xB7 Q/E \u4E0B/\u4E0A \xB7 \u2190\u2192 \u8F6C\u8EAB \xB7 \u53F3\u952E\u62D6=\u770B \xB7 T \u6309\u4F4F\u7784\u51C6\u77AC\u79FB\uFF08\u2191\u2193 \u529B\u5EA6 \u2190\u2192 \u843D\u5730\u671D\u5411\uFF09\xB7 G \u56DE\u4E0A\u4E00\u70B9 \uFF5C \u5DE5\u5177 L R M P \xB7 \u9009\u62E9 Tab \xB7 \u6A61\u76AE X",vM="VR\uFF1A\u5DE6\u6447\u6746\u8D70\uFF08\u6309\u4E0B\u51B2\u523A\uFF09\xB7 \u53F3\u6447\u6746 \u2190\u2192 \u8F6C\u8EAB \xB7 \u524D\u63A8\u7784\u51C6\u77AC\u79FB\uFF08\u5DE6\u6447\u6746 \u2191\u2193 \u529B\u5EA6 \u2190\u2192 \u843D\u5730\u671D\u5411\uFF09\xB7 \u540E\u62C9\u56DE\u4E0A\u4E00\u70B9 \xB7 A \u8DF3\uFF08\u53CC\u51FB=\u98DE\u884C\u5F00\u5173\uFF09B \u8E72 \xB7 \u6273\u673A\u753B \xB7 \u624B\u8155\u9762\u677F\u9009\u5DE5\u5177 \xB7 X/Y \u64A4\u9500\u91CD\u505A",Ec=h(()=>rn?.isPresenting()?vM:je?.isWalking()?yM:xM,"hintDefault"),Ie=new ic(Mc,{hint:h(i=>{go.textContent=i??Ec()},"hint"),tip:h((i,e,t)=>{i?(ho.textContent=i,ho.hidden=!1,ho.style.left=`${e+14}px`,ho.style.top=`${t-28}px`):ho.hidden=!0},"tip"),events:h(i=>wM(i),"events"),separator:h(i=>EM(i),"separator"),marquee:h(i=>{if(!i){yf.hidden=!0;return}let e=Mc.getBoundingClientRect();yf.hidden=!1,Object.assign(yf.style,{left:`${e.left+i.x}px`,top:`${e.top+i.y}px`,width:`${i.w}px`,height:`${i.h}px`})},"marquee"),changed:h(()=>bf(),"changed"),error:h((i,e)=>mo(e==="commit"?"\u63D0\u4EA4":"\u9884\u6F14",i),"error")}),_M=[{tool:"select",icon:"select",label:"\u9009\u62E9",key:"\u7A7A\u683C"},{tool:"line",icon:"line",label:"\u753B\u7EBF",key:"L"},{tool:"rect",icon:"rectangle",label:"\u77E9\u5F62",key:"R"},{tool:"move",icon:"move",label:"\u79FB\u52A8",key:"M"},{tool:"pp",icon:"push-pull",label:"\u63A8\u62C9",key:"P"},{tool:"erase",icon:"eraser",label:"\u6A61\u76AE",key:"E"}],wc={version:$i,tools:h(()=>_M.map(i=>({id:i.tool,label:i.label,icon:i.icon,key:i.key,active:Ie.tool===i.tool})),"tools"),edits:h(()=>[{id:"undo",label:"\u64A4\u9500",icon:"arrow-undo",disabled:!Ie.canUndo()},{id:"redo",label:"\u91CD\u505A",icon:"arrow-redo",disabled:!Ie.canRedo()},{id:"delete",label:"\u5220\u9664",icon:"trash-can",danger:!0,hidden:!Ie.hasSelection()}],"edits"),vr:h(()=>[{id:"noclip",label:je.noclip?"\u98DE\u884C\u4E2D":"\u7A7F\u5899\u98DE\u884C",active:je.noclip},{id:"respawn",label:"\u56DE\u51FA\u751F\u70B9"},{id:"exitvr",label:"\u9000\u51FA VR",danger:!0}],"vr"),status:h(()=>go.textContent??"","status"),pick:h(i=>{if(eg.includes(i)){Ie.setTool(i);return}switch(i){case"undo":Ie.undo();break;case"redo":Ie.redo();break;case"delete":Ie.deleteSelection();break;case"noclip":je.setNoclip(!je.noclip),rn.invalidatePanel();break;case"respawn":{let e=je.defaultSpawn();je.sim.reset(e.pos,e.heading,{x:0,y:0,z:1.6});break}case"exitvr":rn.exit();break}},"pick")},_f=new Map;for(let i of wc.tools()){let e=document.createElement("button");e.type="button",e.className="tool",e.title=`${i.label}\uFF08${i.key}\uFF09`,e.innerHTML=`${lo(i.icon)}<span class="tool-label"></span>`,e.querySelector(".tool-label").textContent=i.label,e.addEventListener("click",()=>wc.pick(i.id)),mM.appendChild(e),_f.set(i.id,e)}{let i=bt("labEraseFace");i.addEventListener("click",()=>Ie.setTool("eraseFace")),_f.set("eraseFace",i)}var Cg=bt("btnUndo"),Ig=bt("btnRedo"),Lg=bt("btnDelete"),Ag=bt("btnMenu"),Pg=bt("btnView"),bM=bt("btnFit");Cg.addEventListener("click",()=>Ie.undo());Ig.addEventListener("click",()=>Ie.redo());Lg.addEventListener("click",()=>Ie.deleteSelection());bM.addEventListener("click",()=>Ie.zoomExtents());Pg.addEventListener("click",()=>gf({anchor:Pg,align:"end",items:h(()=>[{id:"iso",label:"\u7B49\u8F74",icon:"persp-iso",disabled:je.isWalking()},{id:"top",label:"\u9876\u89C6",hint:"\u4FEF\u89C6",disabled:je.isWalking()},{id:"front",label:"\u524D\u89C6",hint:"\u5411\u5317\u770B",disabled:je.isWalking()},{id:"right",label:"\u53F3\u89C6",hint:"\u5411\u897F\u770B",disabled:je.isWalking()},{id:"back",label:"\u540E\u89C6",hint:"\u5411\u5357\u770B",disabled:je.isWalking()},{id:"left",label:"\u5DE6\u89C6",hint:"\u5411\u4E1C\u770B",disabled:je.isWalking()},{id:"persp",label:"\u900F\u89C6",checked:Ie.cam.projection==="persp",separatorBefore:!0,disabled:je.isWalking()},{id:"walk",label:"\u6B65\u884C\u76F8\u673A",hint:"WASD \xB7 \u7A7A\u683C\u8DF3 \xB7 \u53F3\u952E\u62D6\u770B",checked:je.isWalking(),separatorBefore:!0},{id:"noclip",label:"\u7A7F\u5899\u98DE\u884C",hint:"\u53CC\u51FB\u7A7A\u683C\u5207\u6362 \xB7 Q/E \u4E0B/\u4E0A",checked:je.noclip,disabled:!je.isWalking()}],"items"),onPick:h(i=>{if(i==="persp")return Ie.toggleProjection(),"keep";if(i==="walk")return MM(!je.isWalking()),"keep";if(i==="noclip")return je.setNoclip(!je.noclip),"keep";Ie.setView(i)},"onPick")}));Ag.addEventListener("click",()=>gf({anchor:Ag,items:h(()=>[{id:"export",label:"\u5BFC\u51FA OBJ\u2026",icon:"export",hint:"Blender \u9003\u751F\u53E3"},{id:"import",label:"\u5BFC\u5165 OBJ\u2026",icon:"import"},...rn.isSupported()?[{id:"vr",label:rn.isPresenting()?"\u9000\u51FA VR":"\u8FDB\u5165 VR",icon:"hand",separatorBefore:!0,hint:"Quest \xB7 \u624B\u8155\u9762\u677F"},{id:"lefthand",label:"VR \u5DE6\u624B\u6301\u7B14",checked:fo,hint:"\u9762\u677F\u6362\u5230\u53F3\u624B"}]:[],{id:"finger",label:"\u624B\u6307\u4E5F\u80FD\u753B",checked:uo,separatorBefore:!0,hint:AM.penEverSeen()?"\u5DF2\u89C1\u8FC7\u7B14\uFF0C\u624B\u6307=\u76F8\u673A":void 0},{id:"lab",label:"\u5B9E\u9A8C\u53F0\uFF08\u819C\u4E8B\u4EF6\u65E5\u5FD7 / \u573A\u666F\u9884\u7F6E\uFF09",checked:Sc},{id:"clear",label:"\u6E05\u7A7A\u6A21\u578B",icon:"trash-can",separatorBefore:!0},{id:"help",label:"\u5FEB\u6377\u952E\u4E0E\u624B\u52BF",icon:"keyboard"},{id:"update",label:`\u5F3A\u5236\u66F4\u65B0\uFF08\u6E05\u7F13\u5B58\u91CD\u542F\uFF09\xB7 ${$i}`,icon:"refresh"}],"items"),onPick:h(i=>{switch(i){case"export":TM();break;case"import":bc.click();break;case"finger":return uo=!uo,ir.set("fingerDraws",uo?"1":"0"),"keep";case"lab":return Fg(!Sc),"keep";case"clear":qi({id:"clear",text:"\u6E05\u7A7A\u6574\u4E2A\u6A21\u578B\uFF1F\uFF08\u53EF\u64A4\u9500\uFF09",level:"warning",actions:[{label:"\u6E05\u7A7A",primary:!0,onClick:h(()=>Ie.clearAll(),"onClick")},{label:"\u53D6\u6D88",onClick:h(()=>{},"onClick")}]});break;case"help":Tc(!0);break;case"update":Sf.forceReset();break;case"vr":rn.isPresenting()?rn.exit():rn.enter();break;case"lefthand":return fo=!fo,ir.set("leftHanded",fo?"1":"0"),"keep"}},"onPick")}));var je=new uc(Ie,Mc);Ie.viewExtras=()=>({near:je.isWalking()?.05:void 0,teleport:je.teleportArc()});{let i=new URLSearchParams(location.search),e=Number(i.get("xrfov")),t=Number(i.get("xrscale"));(i.has("xrfov")||i.has("xrscale"))&&Ie.renderer3.setXRQuality({foveation:i.has("xrfov")&&Number.isFinite(e)?e:void 0,framebufferScale:i.has("xrscale")&&Number.isFinite(t)?t:void 0})}var _c=0;function SM(i){let e=_c?Math.min(.1,(i-_c)/1e3):.016666666666666666;_c=i;try{rn.isPresenting()?rn.tick(e):(je.tick(e),je.sim.state.teleport.charging&&(Ie.isGestureActive()&&Ie.cancel(),Ie.pointerLeave()))}catch(t){mo(rn.isPresenting()?"VR \u5E27":"\u6B65\u884C\u5E27",t);try{Ie.cancel()}catch{}}try{Ie.draw()}catch(t){mo("\u6E32\u67D3",t)}}h(SM,"loopTick");window.addEventListener("error",i=>mo("\u811A\u672C",i.error??i.message));window.addEventListener("unhandledrejection",i=>mo("\u5F02\u6B65",i.reason));function Dg(){let i=je.isWalking()||rn.isPresenting();_c=0,Ie.setLoop(i?SM:null)}h(Dg,"syncLoop");var rn=new vc({editor:Ie,locomotion:je,hud:wc,leftHanded:h(()=>fo,"leftHanded"),onChange:h(()=>{Dg(),bf(),go.textContent=Ec()},"onChange"),log:h(i=>console.warn(i),"log")});function MM(i){i?je.enterWalk():je.exitWalk(),Dg(),go.textContent=Ec(),bf()}h(MM,"setWalk");function bf(){for(let[i,e]of _f)e.classList.toggle("active",i===Ie.tool);Cg.disabled=!Ie.canUndo(),Ig.disabled=!Ie.canRedo(),Lg.hidden=!Ie.hasSelection(),rn?.invalidatePanel()}h(bf,"syncUi");function wM(i){for(let e of i){let t=document.createElement("div");t.className="ev",t.textContent=Gd(e),po.prepend(t)}for(;po.childElementCount>400;)po.lastElementChild?.remove()}h(wM,"appendLog");function EM(i){let e=document.createElement("div");e.className="sep",e.textContent=`\u2500\u2500 ${i} \u2500\u2500`,po.prepend(e)}h(EM,"appendSep");{let i=bt("labPresets");for(let e of Qs){let t=document.createElement("button");t.type="button",t.textContent=e.name,t.title=e.note,t.addEventListener("click",()=>Ie.applyPreset(e.name)),i.appendChild(t)}bt("labClearLog").addEventListener("click",()=>{po.textContent=""}),bt("labClose").addEventListener("click",()=>Fg(!1))}function Fg(i){Sc=i,ir.set("lab",i?"1":"0"),Rg.hidden=!i,!i&&Ie.tool==="eraseFace"&&Ie.setTool("select"),requestAnimationFrame(Ac)}h(Fg,"setLab");var vf=bt("help");function Tc(i){vf.hidden=!i}h(Tc,"toggleHelp");bt("helpClose").addEventListener("click",()=>Tc(!1));vf.addEventListener("click",i=>{i.target===vf&&Tc(!1)});var bc=bt("objFile");function TM(){let i=tg(Ie.kernel,{triangulateHoled:Bd,version:$i}),e=new Blob([i],{type:"model/obj"}),t=URL.createObjectURL(e),n=document.createElement("a"),s=new Date().toISOString().slice(0,19).replace(/[:T]/g,"-");n.href=t,n.download=`catsup-${s}.obj`,document.body.appendChild(n),n.click(),n.remove(),setTimeout(()=>URL.revokeObjectURL(t),1e4),qi({text:`\u5DF2\u5BFC\u51FA ${n.download}\uFF08${Ie.kernel.faces().length} \u9762 / ${Ie.kernel.edges().length} \u8FB9\uFF09`,level:"info"})}h(TM,"doExport");bc.addEventListener("change",async()=>{let i=bc.files?.[0];if(bc.value="",!!i)try{let e=ng(await i.text());if(!e.segs.length){qi({text:"OBJ \u91CC\u6CA1\u6709\u53EF\u7528\u7684\u8FB9",level:"warning"});return}let t=Ie.addSegments(e.segs,`\u5BFC\u5165 ${i.name}`);Ie.zoomExtents(),qi({text:`\u5BFC\u5165 ${i.name}\uFF1A${e.segs.length} \u6761\u8FB9 \u2192 ${t.length} \u4E2A\u819C\u4E8B\u4EF6`,level:"info"})}catch(e){qi({text:`\u5BFC\u5165\u5931\u8D25\uFF1A${e.message}`,level:"error"})}});var AM=ig(Mc,Ie,{fingerDraws:h(()=>uo,"fingerDraws"),onUndo:h(()=>Ie.undo(),"onUndo"),onRedo:h(()=>Ie.redo(),"onRedo"),look:h((i,e)=>je.look(i,e),"look"),walking:h(()=>je.isWalking(),"walking"),toolBlocked:h(()=>je.sim.state.teleport.charging,"toolBlocked")});window.addEventListener("keydown",i=>{let e=i.target;if(!(e&&(e.tagName==="INPUT"||e.tagName==="TEXTAREA"))){if(!i.ctrlKey&&!i.metaKey&&!i.altKey){let t={" ":"select",l:"line",r:"rect",m:"move",p:"pp",e:"erase",tab:"select",x:"erase"},n=i.key.toLowerCase(),s=t[n],r=je.isWalking()&&(n===" "||n==="e");if(s&&!r){i.preventDefault(),Ie.setTool(s);return}}if((i.ctrlKey||i.metaKey)&&(i.key==="z"||i.key==="Z")){i.preventDefault(),i.shiftKey?Ie.redo():Ie.undo();return}if((i.ctrlKey||i.metaKey)&&(i.key==="y"||i.key==="Y")){i.preventDefault(),Ie.redo();return}if(i.key==="Delete"||i.key==="Backspace"){Ie.hasSelection()&&(i.preventDefault(),Ie.deleteSelection());return}i.key==="Escape"&&(Eg(),Tc(!1),Ie.cancel())}});function Ac(){Ie.resize(window.devicePixelRatio||1)}h(Ac,"resize");new ResizeObserver(Ac).observe(pM);window.addEventListener("resize",Ac);var Sf=wg({onUpdateAvailable:h(()=>qi({id:"update",text:"\u6709\u65B0\u7248\u672C",level:"info",actions:[{label:"\u5237\u65B0",primary:!0,onClick:h(()=>{Sf.reload()},"onClick")}]}),"onUpdateAvailable")});gM.textContent=`${$i}${Sf.isDevRoute?" \xB7 dev":""}`;new URLSearchParams(location.search).has("reset")&&qi({text:`\u5DF2\u6E05\u7F13\u5B58\u91CD\u542F \xB7 ${$i}`,level:"info"});window.__catsup={editor:Ie,locomotion:je,vr:rn,hud:wc,version:$i};Rg.hidden=!Sc;Ie.setTool("line");go.textContent=Ec();Ac();
/**
 * @license
 * Copyright 2010-2026 Three.js Authors
 * SPDX-License-Identifier: MIT
 */
//# sourceMappingURL=catsup-0d9b9410eabc.mjs.map
