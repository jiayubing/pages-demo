/* Violet Orbit: two steady-state draws; layered ribbon and nebula passes during the entrance only. */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const canvas = $('universe');
  const play = $('play');
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  let paused = reduced.matches, ready = false, lost = false;
  let elapsed = 0, last = 0, raf = 0, previousDraw = 0;
  let introTime = reduced.matches ? 12 : 0;
  function introUi(seconds) {
    const phase=seconds<3.4?'flying':seconds<8.6?'forming':seconds<10.8?'orbiting':'ready';
    if($('scene').dataset.entrance!==phase){$('scene').dataset.entrance=phase;document.body.classList.toggle('settled',phase==='ready');}
    const flowPhase=seconds<1.8?'awakening':seconds<3.6?'spiraling':seconds<5.8?'sculpting':seconds<7.0?'infusing':seconds<8.0?'weaving':seconds<10.8?'blooming':'complete';
    if($('scene').dataset.flowPhase!==flowPhase)$('scene').dataset.flowPhase=flowPhase;
    if($('replay').disabled!==reduced.matches)$('replay').disabled=reduced.matches;
  }
  function easeBetween(lo,hi,x){const v=Math.max(0,Math.min(1,(x-lo)/(hi-lo)));return v*v*(3-2*v);}
  function makeHeartTable(){
    // Arc-length sampling keeps every stream moving smoothly through the narrow tip.
    const curves=[
      [[.495,.245],[.444,.133],[.373,.015],[.307,.075]],
      [[.307,.075],[.246,.101],[.204,.229],[.214,.376]],
      [[.214,.376],[.222,.535],[.325,.650],[.398,.748]],
      [[.398,.748],[.443,.806],[.465,.849],[.483,.867]],
      [[.483,.867],[.488,.874],[.495,.874],[.503,.865]],
      [[.503,.865],[.541,.815],[.617,.731],[.686,.617]],
      [[.686,.617],[.748,.514],[.793,.374],[.756,.223]],
      [[.756,.223],[.722,.043],[.626,-.005],[.550,.149]],
      [[.550,.149],[.528,.185],[.510,.224],[.495,.245]]
    ];
    const raw=[],lengths=[];let total=0;
    for(const curve of curves)for(let i=0;i<60;i++){const t=i/60,q=1-t,x=q*q*q*curve[0][0]+3*q*q*t*curve[1][0]+3*q*t*t*curve[2][0]+t*t*t*curve[3][0],y=q*q*q*curve[0][1]+3*q*q*t*curve[1][1]+3*q*t*t*curve[2][1]+t*t*t*curve[3][1];const p=[(x-.5)*3.84,(.5-y)*2.2512];if(raw.length){const last=raw[raw.length-1];total+=Math.hypot(p[0]-last[0],p[1]-last[1]);}raw.push(p);lengths.push(total);}
    raw.push(raw[0]);total+=Math.hypot(raw.at(-1)[0]-raw.at(-2)[0],raw.at(-1)[1]-raw.at(-2)[1]);lengths.push(total);
    const table=new Float32Array(512*2);let cursor=1;
    for(let i=0;i<512;i++){const d=i/512*total;while(cursor<lengths.length-1&&lengths[cursor]<d)cursor++;const f=(d-lengths[cursor-1])/(lengths[cursor]-lengths[cursor-1]);table[i*2]=raw[cursor-1][0]+(raw[cursor][0]-raw[cursor-1][0])*f;table[i*2+1]=raw[cursor-1][1]+(raw[cursor][1]-raw[cursor-1][1])*f;}
    return table;
  }
  function heartAt(t){const table=heartAt.table||(heartAt.table=makeHeartTable()),f=((t%1)+1)%1*512,i=Math.floor(f),j=(i+1)%512,k=f-i;return [table[i*2]*(1-k)+table[j*2]*k,table[i*2+1]*(1-k)+table[j*2+1]*k];}
  // One choreography shared by GPU and Canvas. Lag makes heads lead their cloud wakes.
  function flowPoint(t,seconds,w,h,lag=0){
    const arrival=easeBetween(.4+lag,3.1+lag,seconds),fold=easeBetween(3.1+lag*.35,5.9+lag*.35,seconds);
    const a=t*Math.PI*2,spin=.62*(1-fold),angle=a+spin;
    const outer=[-Math.sin(angle)*w*.61,Math.cos(angle)*h*.54];
    const ring=[-Math.sin(angle)*(Math.min(1.36,w*.43)+.05*Math.sin(a*3+seconds)),Math.cos(angle)*.64+.12*Math.sin(a*2+seconds*.32)];
    const heart=heartAt(t),x=outer[0]*(1-arrival)+ring[0]*arrival,y=outer[1]*(1-arrival)+ring[1]*arrival;
    return [x*(1-fold)+heart[0]*fold,y*(1-fold)+heart[1]*fold];
  }
  function lightStreams(seconds,widthUnits,heightUnits){
    const paths=[],fade=easeBetween(.15,1.6,seconds)*(1-easeBetween(8.2,10.2,seconds));
    for(let group=0;group<6;group++)for(let lane=0;lane<2;lane++){
      const path=[],head=.04+group/6+seconds*.044,span=.20+lane*.035;
      for(let i=0;i<=64;i++){
        const u=i/64,t=head-(1-u)*span,lag=(1-u)*.65+group*.035,p=flowPoint(t,seconds,widthUnits,heightUnits,lag);
        const a=t*Math.PI*2,braid=Math.sin(u*11-seconds*1.2+group)*.024;
        const inner=lane*easeBetween(5.4,7.4,seconds)*(.11+.09*Math.sin(u*Math.PI));
        const off=(lane-.5)*(.038+braid)*(1-easeBetween(8,10,seconds));
        p[0]=p[0]*(1-inner)+Math.sin(a)*off;p[1]=p[1]*(1-inner)+Math.cos(a)*off;
        path.push({x:p[0],y:p[1],u,width:lane?.050:.12,alpha:Math.pow(Math.sin(u*Math.PI),.66)*(.42+.58*u)*fade*(lane?.45:.7),seed:group/5});
      }
      for(let i=0;i<path.length;i++){const before=path[Math.max(0,i-1)],after=path[Math.min(64,i+1)],dx=after.x-before.x,dy=after.y-before.y,len=Math.hypot(dx,dy)||1;path[i].nx=-dy/len;path[i].ny=dx/len;}
      paths.push(path);
    }
    // Counterflowing interior veils develop only after the two lobes have formed.
    for(let group=0;group<4;group++){
      const path=[],side=group<2?-1:1,lane=group%2;
      const progress=easeBetween(3.7+lane*.3,6.6+lane*.2,seconds);
      const opacity=easeBetween(4.5+lane*.35,5.8+lane*.3,seconds)*(1-easeBetween(8.1,9.8,seconds));
      for(let i=0;i<=64;i++){
        const u=i/64,t=u*progress,q=1-t;
        const a=[side*(.70-lane*.12),.72-lane*.12],b=[side*1.15,.12],c=[-side*(.62-lane*.1),.22-lane*.2],d=[side*.03,-.80+lane*.14];
        const x=q*q*q*a[0]+3*q*q*t*b[0]+3*q*t*t*c[0]+t*t*t*d[0],y=q*q*q*a[1]+3*q*q*t*b[1]+3*q*t*t*c[1]+t*t*t*d[1];
        path.push({x:x+Math.sin(t*10-seconds*.7)*.009,y,u,width:.085,alpha:Math.pow(Math.sin(u*Math.PI),.65)*opacity*.55,seed:group/3});
      }
      for(let i=0;i<path.length;i++){const a=path[Math.max(0,i-1)],b=path[Math.min(64,i+1)],dx=b.x-a.x,dy=b.y-a.y,len=Math.hypot(dx,dy)||1;path[i].nx=-dy/len;path[i].ny=dx/len;}
      paths.push(path);
    }
    return paths;
  }
  function writeFlowMesh(paths,data){let offset=0;const put=(p,cross)=>{data[offset++]=p.x+p.nx*p.width*cross;data[offset++]=p.y+p.ny*p.width*cross;data[offset++]=cross;data[offset++]=p.u;data[offset++]=p.alpha;data[offset++]=p.seed;};for(const path of paths)for(let i=0;i<path.length-1;i++){const a=path[i],b=path[i+1];put(a,-1);put(a,1);put(b,-1);put(b,-1);put(a,1);put(b,1);}return offset/6;}
  function cloudSheets(seconds,w,h){
    const sheets=[],fade=easeBetween(0,1.8,seconds)*(1-easeBetween(8.1,9.7,seconds));
    for(let i=0;i<60;i++){
      const group=Math.floor(i/10),q=(i%10)/9,t=group/6+seconds*.044-q*.19;
      const p=flowPoint(t,seconds,w,h,q*.6),next=flowPoint(t+.003,seconds,w,h,q*.6);
      const inward=easeBetween(5.2+q*.8,8.0+q*.4,seconds),radius=.38+.60*(.5+.5*Math.sin(i*2.4));
      p[0]*=1-inward*(1-radius);p[1]*=1-inward*(1-radius);
      const wave=.5+.5*Math.sin(i*1.7+seconds*.45);
      sheets.push({x:p[0],y:p[1],angle:Math.atan2(next[1]-p[1],next[0]-p[0]),sx:.49+q*.22+inward*.12,sy:.19+wave*.09+inward*.10,alpha:fade*(.22+.13*wave)*Math.pow(Math.sin(q*Math.PI),.35),color:group%3});
    }
    return sheets;
  }
  function writeCloudMesh(sheets,data){let k=0;for(const p of sheets){const co=Math.cos(p.angle),si=Math.sin(p.angle);for(const [x,y] of [[-1,-1],[1,-1],[-1,1],[-1,1],[1,-1],[1,1]]){data[k++]=p.x+x*p.sx*co-y*p.sy*si;data[k++]=p.y+x*p.sx*si+y*p.sy*co;data[k++]=x*.5+.5;data[k++]=y*.5+.5;data[k++]=p.alpha;data[k++]=p.color/2;}}return k/6;}
  function makeCloudSprite(){
    const c=document.createElement('canvas');c.width=c.height=128;const x=c.getContext('2d'),im=x.createImageData(128,128);
    const hash=(i,j)=>{const n=Math.sin(i*127.1+j*311.7)*43758.5453;return n-Math.floor(n);};
    const noise=(x,y)=>{const i=Math.floor(x),j=Math.floor(y),fx=x-i,fy=y-j,a=fx*fx*(3-2*fx),b=fy*fy*(3-2*fy);return (hash(i,j)*(1-a)+hash(i+1,j)*a)*(1-b)+(hash(i,j+1)*(1-a)+hash(i+1,j+1)*a)*b;};
    for(let y=0;y<128;y++)for(let xx=0;xx<128;xx++){const px=xx/64-1,py=y/64-1,r2=px*px+py*py;let n=0,amp=.55,f=2.8;for(let o=0;o<4;o++){n+=noise(px*f+4,py*f+8)*amp;f*=2.13;amp*=.5;}const density=Math.pow(Math.max(0,n-.16),1.4),alpha=Math.exp(-r2*3.8)*Math.max(0,1-r2)*density;const k=(y*128+xx)*4;im.data[k]=im.data[k+1]=im.data[k+2]=255;im.data[k+3]=Math.round(alpha*255);}
    x.putImageData(im,0,0);return c;
  }
  let speed = 1, glow = 1, quality = 'auto';
  let slowFrames = 0, samples = 0, adaptive = 1;
  let width = 1, height = 1, unit = 1, center = 1, dpr = 1;
  let targetX = 0, targetY = 0, pointerX = 0, pointerY = 0;
  const mobile = matchMedia('(pointer: coarse)').matches || innerWidth < 700;
  let gl;
  try { gl = canvas.getContext('webgl', { alpha: false, antialias: false, depth: false, stencil: false, powerPreference: 'low-power', preserveDrawingBuffer: false }); } catch (_) {}
  const showNotice = message => { $('notice').textContent = message; $('notice').hidden = !message; };
  const syncPlay = () => { $('play-icon').innerHTML = paused ? '<svg width=12 height=14 viewBox="0 0 12 14" aria-hidden=true><path d="M2 1.5 10.5 7 2 12.5Z" fill=currentColor/></svg>' : '<svg width=12 height=14 viewBox="0 0 12 14" aria-hidden=true><path d="M3 2V12M9 2V12" stroke=currentColor stroke-width=2/></svg>'; $('play-label').textContent = paused ? 'Play' : 'Pause'; play.setAttribute('aria-label', paused ? 'Play animation' : 'Pause animation'); play.setAttribute('aria-pressed', String(paused)); };
  syncPlay();
  introUi(introTime);
  if (!gl) { startCanvasFallback(); return; }
  const precision = gl.getShaderPrecisionFormat(gl.FRAGMENT_SHADER, gl.HIGH_FLOAT).precision ? 'highp' : 'mediump';
  const quadVertex = `attribute vec2 a_position; varying vec2 v_uv; void main(){ v_uv=a_position*.5+.5; gl_Position=vec4(a_position,0.,1.); }`;
  const nebulaFragment = `precision ${precision} float;
  varying vec2 v_uv;
  uniform sampler2D u_art;
  uniform vec2 u_resolution, u_pointer;
  uniform float u_time, u_unit, u_center, u_glow, u_intro;
  void main(){
    vec2 p=(v_uv*u_resolution-vec2(u_resolution.x*.5,u_center))/u_unit;
    p-=u_pointer*vec2(.025,.018);
    vec2 uv=p/vec2(3.84,2.2512)+.5;
    float t=u_time*.23;
    vec2 flow=vec2(sin(uv.y*18.+t*1.3)+sin(uv.y*33.-uv.x*15.-t*.8),cos(uv.x*20.-t)+sin(uv.x*28.+uv.y*11.+t*.9));
    float mask=(1.-smoothstep(.18,.55,length(uv-vec2(.5,.5))));
    vec2 warp=flow*.0042*mask;
    vec3 art=texture2D(u_art,clamp(uv+warp,0.,1.)).rgb;
    float border=smoothstep(0.,.055,uv.x)*smoothstep(0.,.055,uv.y)*smoothstep(0.,.055,1.-uv.x)*smoothstep(0.,.055,1.-uv.y);
    float light=dot(art,vec3(.25,.5,.25));
    float wave=sin(uv.x*24.+uv.y*17.-u_time*.55)*.035+sin(u_time*.9)*.03;
    art*=.91+wave*mask+u_glow*.14;
    // Light travels across the filaments; the silhouette remains calm.
    float sweep=pow(.5+.5*sin(uv.x*15.-uv.y*12.+u_time*.48),10.);
    art+=vec3(.10,.12,.24)*sweep*light*mask*u_glow;
    vec3 bg=vec3(.0627,.00392,.13333);
    float front=mix(1.25,-.30,smoothstep(5.6,9.1,u_intro));
    float reveal=smoothstep(front-.19,front+.19,uv.y+sin(uv.x*14.+u_intro*.7)*.045)*smoothstep(5.4,6.6,u_intro);
    float bloom=sin(clamp((u_intro-8.0)/2.8,0.,1.)*3.14159)*.17;
    art+=vec3(.31,.13,.5)*light*bloom;
    gl_FragColor=vec4(mix(bg,art,border*reveal),1.);
  }`;
  const particleVertex = `precision highp float;
  attribute vec4 a_seed;
  uniform vec2 u_resolution,u_pointer;
  uniform float u_time,u_unit,u_center,u_dpr,u_glow,u_intro;
  varying vec3 v_color; varying float v_alpha; varying float v_core;
  const float PI=3.14159265359;
  vec2 orbit(float a,float radius,float tilt){
    vec2 p=vec2(cos(a)*radius,sin(a)*.42);
    return mat2(cos(tilt),sin(tilt),-sin(tilt),cos(tilt))*p;
  }
  void main(){
    float s=a_seed.x, r=a_seed.y, kind=a_seed.z, n=a_seed.w;
    vec2 p; float size=1.; float alpha=.5;
    float radius=min(1.72,u_resolution.x/u_unit*.47);
    float a=s*PI*2.;
    if(kind<.56){
      // Thousands of individual points move along gently precessing orbital streams.
      float direction=kind<.28?1.:-.72;
      a+=u_time*.19*direction;
      float tilt=kind<.28?.23:-.20;
      p=orbit(a,radius+sin(n*200.)*.027,tilt);
      p+=vec2(sin(a*5.+u_time*.35+n*20.),cos(a*7.-u_time*.3+n*20.))*.017;
      p.y+=.04;
      size=(.6+pow(r,6.)*2.1)*u_dpr;
      alpha=(.12+pow(r,3.)*.55)*(.55+.45*sin(a));
    }else if(kind<.77){
      // Three bright, coherent comet heads and their tapered, moving tails.
      float group=floor(n*3.);
      float tail=pow(s,1.65)*.70;
      a=u_time*(.32+group*.035)+group*2.094-tail;
      float tilt=group<1.?.23:-.20;
      p=orbit(a,radius,tilt);
      p+=vec2(sin(r*300.),cos(r*300.))*(.002+tail*.012);
      p.y+=.04;
      size=(1.+(1.-s)*2.4)*u_dpr;
      alpha=pow(1.-s,2.)*.65;
    }else if(kind<.91){
      // Loose, slowly moving stardust inside the heart.
      a+=u_time*.025;
      float radial=sqrt(r);
      float sa=sin(a);
      float hx=sa*sa*sa;
      float hy=(13.*cos(a)-5.*cos(2.*a)-2.*cos(3.*a)-cos(4.*a))/16.;
      p=vec2(hx*1.11,max(hy,-.80)*1.05)*radial;
      p+=vec2(sin(u_time*.25+n*22.),cos(u_time*.18+n*31.))*.018;
      size=(.5+pow(n,8.)*2.)*u_dpr;
      alpha=(.11+pow(n,4.)*.4)*(.55+.45*sin(u_time*.7+n*50.));
    }else{
      p=vec2((s-.5)*5.,(r-.5)*3.2);
      size=(.5+pow(n,12.)*2.5)*u_dpr;
      alpha=(.10+pow(n,6.)*.55)*(.75+.25*sin(u_time*.4+s*77.));
    }
    float entry=kind<.77?smoothstep(8.5+s*.6,10.65+s*.2,u_intro):kind<.91?smoothstep(8.0,10.0,u_intro):smoothstep(1.,4.,u_intro)*.4+.6*smoothstep(9.,11.,u_intro);
    alpha*=entry;
    p.x*=.96;
    p+=u_pointer*vec2(.04,.028);
    vec2 pixel=p*u_unit+vec2(u_resolution.x*.5,u_center);
    gl_Position=vec4(pixel/u_resolution*2.-1.,0.,1.);
    gl_PointSize=max(1.,size*1.65);
    v_color=mix(vec3(.51,.27,1.),vec3(.60,.78,1.),r);
    if(kind>=.56&&kind<.77) v_color=mix(vec3(.53,.52,1.),vec3(.88,.93,1.),1.-s);
    v_alpha=alpha*u_glow;
    v_core=kind>=.56&&kind<.77?1.:0.;
  }`;
  const particleFragment = `precision mediump float; varying vec3 v_color; varying float v_alpha; varying float v_core;
  void main(){ vec2 p=gl_PointCoord-.5;float d=length(p)*2.; if(d>1.)discard;float glow=exp(-d*d*4.5);float core=exp(-d*d*26.); gl_FragColor=vec4(v_color*(glow+core*.55),v_alpha*(glow+core*.4)); }`;
  const flowVertex = `precision highp float;
  attribute vec2 a_position;attribute vec4 a_style;
  uniform vec2 u_resolution;uniform float u_unit,u_center;
  varying vec4 v_style;
  void main(){vec2 pixel=a_position*u_unit+vec2(u_resolution.x*.5,u_center);gl_Position=vec4(pixel/u_resolution*2.-1.,0.,1.);v_style=a_style;}`;
  const flowFragment = `precision mediump float;
  uniform float u_intro,u_glow;varying vec4 v_style;
  void main(){
    float across=v_style.x,along=v_style.y;
    float mist=exp(-across*across*3.1)*.32;
    float core=exp(-across*across*500.)*.42;
    float drift=sin(along*19.-u_intro*1.1+v_style.w*5.)*.30;
    float thread=exp(-pow(across-drift,2.)*290.)*.28;
    float ripple=.72+.28*sin(along*38.-u_intro*1.8+v_style.w*9.);
    vec3 violet=vec3(.55,.24,.95),blue=vec3(.52,.70,1.);
    vec3 color=mix(violet,blue,smoothstep(.55,.95,along)*.65)+vec3(.22,.25,.30)*core;
    gl_FragColor=vec4(color,v_style.z*(mist+core+thread)*ripple*u_glow);
  }`;
  const cloudVertex = `precision highp float;
  attribute vec2 a_position;attribute vec4 a_style;uniform vec2 u_resolution;uniform float u_unit,u_center;varying vec4 v_style;
  void main(){vec2 pixel=a_position*u_unit+vec2(u_resolution.x*.5,u_center);gl_Position=vec4(pixel/u_resolution*2.-1.,0.,1.);v_style=a_style;}`;
  const cloudFragment = `precision mediump float;uniform sampler2D u_cloud;uniform float u_glow;varying vec4 v_style;
  void main(){float density=texture2D(u_cloud,v_style.xy).a;vec3 color=mix(vec3(.51,.20,.86),vec3(.47,.58,.97),v_style.w*.75);gl_FragColor=vec4(color,density*v_style.z*u_glow);}`;
  let nebula, particles, flow, clouds, quadBuffer, starBuffer, flowBuffer, flowData, cloudBuffer, cloudData, cloudTexture, texture;
  const compile = (type, source) => { const shader=gl.createShader(type);gl.shaderSource(shader,source);gl.compileShader(shader);if(!gl.getShaderParameter(shader,gl.COMPILE_STATUS)){const message=gl.getShaderInfoLog(shader);gl.deleteShader(shader);throw Error(message);}return shader; };
  const program = (vs,fs,names) => { const p=gl.createProgram();const v=compile(gl.VERTEX_SHADER,vs),f=compile(gl.FRAGMENT_SHADER,fs);gl.attachShader(p,v);gl.attachShader(p,f);gl.linkProgram(p);gl.deleteShader(v);gl.deleteShader(f);if(!gl.getProgramParameter(p,gl.LINK_STATUS))throw Error(gl.getProgramInfoLog(p));const locations={};for(const name of names)locations[name]=gl.getUniformLocation(p,name);return {p,locations}; };
  const uniforms=['u_resolution','u_pointer','u_time','u_unit','u_center','u_glow','u_intro'];
  let seed=38711;
  const random=()=>{seed=(Math.imul(1664525,seed)+1013904223)>>>0;return seed/4294967296;};
  const starData=new Float32Array(7200*4);
  for(let i=0;i<7200;i++){starData[i*4]=random();starData[i*4+1]=random();starData[i*4+2]=(i%100)/100;starData[i*4+3]=random();}
  const artwork=new Image();
  function init(){
    nebula=program(quadVertex,nebulaFragment,[...uniforms,'u_art']);
    particles=program(particleVertex,particleFragment,[...uniforms,'u_dpr']);
    flow=program(flowVertex,flowFragment,[...uniforms]);
    flow.attributes=[gl.getAttribLocation(flow.p,'a_position'),gl.getAttribLocation(flow.p,'a_style')];
    flowData=new Float32Array(16*64*6*6);flowBuffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,flowBuffer);gl.bufferData(gl.ARRAY_BUFFER,flowData.byteLength,gl.DYNAMIC_DRAW);
    clouds=program(cloudVertex,cloudFragment,[...uniforms,'u_cloud']);clouds.attributes=[gl.getAttribLocation(clouds.p,'a_position'),gl.getAttribLocation(clouds.p,'a_style')];
    cloudData=new Float32Array(60*6*6);cloudBuffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,cloudBuffer);gl.bufferData(gl.ARRAY_BUFFER,cloudData.byteLength,gl.DYNAMIC_DRAW);
    cloudTexture=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,cloudTexture);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,makeCloudSprite());gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
    nebula.attribute=gl.getAttribLocation(nebula.p,'a_position');particles.attribute=gl.getAttribLocation(particles.p,'a_seed');
    quadBuffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,quadBuffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]),gl.STATIC_DRAW);
    starBuffer=gl.createBuffer();gl.bindBuffer(gl.ARRAY_BUFFER,starBuffer);gl.bufferData(gl.ARRAY_BUFFER,starData,gl.STATIC_DRAW);
    texture=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,texture);gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,true);gl.texImage2D(gl.TEXTURE_2D,0,gl.RGB,gl.RGB,gl.UNSIGNED_BYTE,artwork);
    gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
    gl.disable(gl.DEPTH_TEST);ready=true;lost=false;resize();document.body.classList.remove('failed');document.body.classList.add('ready');introUi(introTime);if(reduced.matches&&paused)showNotice('Reduced motion is on. Press Play whenever you like.');else showNotice('');draw();schedule();
  }
  function fail(error){console.error('Violet Orbit:',error);ready=false;document.body.classList.remove('ready');document.body.classList.add('failed');showNotice('Animation could not start. Showing the still artwork.');play.disabled=true;}
  artwork.onload=()=>{try{init();}catch(e){fail(e);}};
  artwork.onerror=()=>fail(Error('The nebula texture did not load.'));
  artwork.src='nebula.webp?v=5';
  function resize(){
    const rect=canvas.getBoundingClientRect();
    const cap=quality==='high'?1.75:quality==='low'?1:mobile?1.3:1.5;
    const pixelBudget=quality==='high'?3000000:quality==='low'?900000:1600000;
    dpr=Math.min(devicePixelRatio||1,cap,Math.sqrt(pixelBudget/(rect.width*rect.height)))*adaptive;
    width=Math.max(1,Math.round(rect.width*dpr));height=Math.max(1,Math.round(rect.height*dpr));
    canvas.width=width;canvas.height=height;gl.viewport(0,0,width,height);
    const narrow=rect.width<650;
    unit=Math.min(width/(narrow?2.6:3.25),height/(narrow?3.3:2.8));
    center=height*(narrow?.56:.56);
    if(ready&&!lost)draw();
  }
  function common(prog){const u=prog.locations;gl.useProgram(prog.p);gl.uniform2f(u.u_resolution,width,height);gl.uniform2f(u.u_pointer,pointerX,pointerY);gl.uniform1f(u.u_time,elapsed);gl.uniform1f(u.u_unit,unit);gl.uniform1f(u.u_center,center);gl.uniform1f(u.u_glow,glow);gl.uniform1f(u.u_intro,introTime);}
  function draw(){
    if(!ready||lost)return;
    common(nebula);gl.disable(gl.BLEND);gl.bindBuffer(gl.ARRAY_BUFFER,quadBuffer);const a=nebula.attribute;gl.enableVertexAttribArray(a);gl.vertexAttribPointer(a,2,gl.FLOAT,false,0,0);gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,texture);gl.uniform1i(nebula.locations.u_art,0);gl.drawArrays(gl.TRIANGLES,0,6);gl.disableVertexAttribArray(a);
    if(introTime<9.7){common(clouds);gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE);gl.bindBuffer(gl.ARRAY_BUFFER,cloudBuffer);const count=writeCloudMesh(cloudSheets(introTime,width/unit,height/unit),cloudData);gl.bufferSubData(gl.ARRAY_BUFFER,0,cloudData);gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,cloudTexture);gl.uniform1i(clouds.locations.u_cloud,0);gl.enableVertexAttribArray(clouds.attributes[0]);gl.vertexAttribPointer(clouds.attributes[0],2,gl.FLOAT,false,24,0);gl.enableVertexAttribArray(clouds.attributes[1]);gl.vertexAttribPointer(clouds.attributes[1],4,gl.FLOAT,false,24,8);gl.drawArrays(gl.TRIANGLES,0,count);clouds.attributes.forEach(a=>gl.disableVertexAttribArray(a));}
    if(introTime<10.2){common(flow);gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE);gl.bindBuffer(gl.ARRAY_BUFFER,flowBuffer);const count=writeFlowMesh(lightStreams(introTime,width/unit,height/unit),flowData);gl.bufferSubData(gl.ARRAY_BUFFER,0,flowData);gl.enableVertexAttribArray(flow.attributes[0]);gl.vertexAttribPointer(flow.attributes[0],2,gl.FLOAT,false,24,0);gl.enableVertexAttribArray(flow.attributes[1]);gl.vertexAttribPointer(flow.attributes[1],4,gl.FLOAT,false,24,8);gl.drawArrays(gl.TRIANGLES,0,count);flow.attributes.forEach(a=>gl.disableVertexAttribArray(a));}
    common(particles);gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE);gl.bindBuffer(gl.ARRAY_BUFFER,starBuffer);const s=particles.attribute;gl.enableVertexAttribArray(s);gl.vertexAttribPointer(s,4,gl.FLOAT,false,0,0);gl.uniform1f(particles.locations.u_dpr,dpr);const count=quality==='low'?2300:quality==='high'?7200:mobile?3600:5400;gl.drawArrays(gl.POINTS,0,count);gl.disableVertexAttribArray(s);
  }
  function schedule(){if(!raf&&ready&&!paused&&!document.hidden&&!lost)raf=requestAnimationFrame(frame);}
  function frame(now){
    raf=0;if(paused||document.hidden||lost||!ready){last=0;return;}
    const delta=last?Math.min((now-last)/1000,.1):0;last=now;elapsed+=delta*speed;introTime=Math.min(12,introTime+delta);introUi(introTime);
    pointerX+=(targetX-pointerX)*Math.min(1,delta*2.8);pointerY+=(targetY-pointerY)*Math.min(1,delta*2.8);
    const fps=quality==='low'||(quality==='auto'&&mobile)?30:60;
    if(now-previousDraw>=1000/fps-1){draw();previousDraw=now;}
    // Lower resolution after sustained missed frames. Never oscillates during a visit.
    if(quality==='auto'&&delta>0){samples++;if(delta>.026)slowFrames++;if(samples>=180){if(slowFrames>95&&adaptive>.65){adaptive=Math.max(.65,adaptive-.15);resize();}samples=0;slowFrames=0;}}
    schedule();
  }
  play.addEventListener('click',()=>{paused=!paused;last=0;syncPlay();showNotice('');if(paused){cancelAnimationFrame(raf);raf=0;}else schedule();});
  $('replay').addEventListener('click',()=>{if(reduced.matches)return;introTime=0;elapsed=0;last=0;paused=false;syncPlay();introUi(0);showNotice('');draw();schedule();});
  $('speed').addEventListener('input',e=>{speed=Number(e.target.value);});
  $('glow').addEventListener('input',e=>{glow=Number(e.target.value);if(paused)draw();});
  $('quality').addEventListener('change',e=>{quality=e.target.value;adaptive=1;samples=slowFrames=0;resize();});
  window.addEventListener('resize',resize,{passive:true});
  document.addEventListener('visibilitychange',()=>{last=0;if(document.hidden){cancelAnimationFrame(raf);raf=0;}else schedule();});
  window.addEventListener('pointermove',e=>{if(e.pointerType==='touch')return;targetX=(e.clientX/innerWidth-.5)*2;targetY=-(e.clientY/innerHeight-.5)*2;},{passive:true});
  document.addEventListener('pointerleave',()=>{targetX=targetY=0;});
  reduced.addEventListener('change',()=>{introUi(introTime);if(reduced.matches){introTime=12;introUi(12);paused=true;last=0;cancelAnimationFrame(raf);raf=0;syncPlay();draw();showNotice('Reduced motion is on. Press Play whenever you like.');}});
  canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();lost=true;cancelAnimationFrame(raf);raf=0;document.body.classList.remove('ready');document.body.classList.add('failed');showNotice('Graphics paused. Restoring when available…');});
  canvas.addEventListener('webglcontextrestored',()=>{try{last=0;init();}catch(e){fail(e);}});
  const full=$('fullscreen');
  if(!document.documentElement.requestFullscreen){full.hidden=true;}
  full.addEventListener('click',async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await document.documentElement.requestFullscreen();}catch(_){showNotice('Fullscreen is unavailable in this browser.');}});
  document.addEventListener('fullscreenchange',()=>full.setAttribute('aria-label',document.fullscreenElement?'Exit fullscreen':'Enter fullscreen'));

  function startCanvasFallback() {
    // Some browsers disable WebGL. Keep real particle motion with a small 2D renderer.
    const ctx=canvas.getContext('2d',{alpha:false});
    if(!ctx){document.body.classList.add('failed');showNotice('Animation is unavailable. Showing the still artwork.');play.disabled=true;return;}
    let cssW=1,cssH=1,u=1,cy=1,frameId=0,previous=0,time=0,isReady=false,ratio=1,introSeconds=reduced.matches?12:0;
    const picture=new Image(); let feathered;
    const revealCanvas=document.createElement('canvas');revealCanvas.width=768;revealCanvas.height=432;const revealCtx=revealCanvas.getContext('2d');
    const cloudSprite=makeCloudSprite(),cloudColors=['#9e50eb','#9684ff','#7a9bf8'];
    const cloudSprites=cloudColors.map(color=>{const c=document.createElement('canvas');c.width=c.height=128;const x=c.getContext('2d');x.drawImage(cloudSprite,0,0);x.globalCompositeOperation='source-in';x.fillStyle=color;x.fillRect(0,0,128,128);return c;});
    const sprite=document.createElement('canvas');sprite.width=sprite.height=32;
    const sc=sprite.getContext('2d');const gradient=sc.createRadialGradient(16,16,0,16,16,16);
    gradient.addColorStop(0,'rgba(238,241,255,1)');gradient.addColorStop(.13,'rgba(190,188,255,.95)');gradient.addColorStop(.35,'rgba(142,111,255,.5)');gradient.addColorStop(1,'rgba(102,58,244,0)');sc.fillStyle=gradient;sc.fillRect(0,0,32,32);
    let randomSeed=24392;
    const rand=()=>{randomSeed=(Math.imul(randomSeed,1664525)+1013904223)>>>0;return randomSeed/4294967296;};
    const seeds=Array.from({length:1800},(_,i)=>[rand(),rand(),i%100/100,rand()]);
    function fit(){const r=canvas.getBoundingClientRect();cssW=r.width;cssH=r.height;ratio=Math.min(devicePixelRatio||1,quality==='high'?1.5:1.2);canvas.width=Math.round(cssW*ratio);canvas.height=Math.round(cssH*ratio);u=Math.min(cssW/(cssW<650?2.6:3.25),cssH/(cssW<650?3.3:2.8));cy=cssH*.44;render();}
    function render(){if(!isReady)return;ctx.setTransform(ratio,0,0,ratio,0,0);ctx.globalCompositeOperation='source-over';ctx.globalAlpha=1;ctx.fillStyle='#100122';ctx.fillRect(0,0,cssW,cssH);
      const ease=(lo,hi,x)=>{const v=Math.max(0,Math.min(1,(x-lo)/(hi-lo)));return v*v*(3-2*v);};
      const breathe=1+Math.sin(time*.4)*.002,art=feathered||picture;
      if(introSeconds<9.2){
        revealCtx.clearRect(0,0,768,432);revealCtx.globalCompositeOperation='source-over';revealCtx.globalAlpha=ease(5.4,6.6,introSeconds);revealCtx.drawImage(art,0,0,768,432);revealCtx.globalAlpha=1;
        revealCtx.globalCompositeOperation='destination-in';const front=-.25+1.55*ease(5.6,9.1,introSeconds),g=revealCtx.createLinearGradient(0,(front-.20)*432,0,(front+.20)*432);g.addColorStop(0,'white');g.addColorStop(1,'transparent');revealCtx.fillStyle=g;revealCtx.fillRect(0,0,768,432);
        ctx.drawImage(revealCanvas,cssW*.5-u*1.92*breathe,cy-u*1.1256*breathe,u*3.84*breathe,u*2.2512*breathe);
      }else ctx.drawImage(art,cssW*.5-u*1.92*breathe,cy-u*1.1256*breathe,u*3.84*breathe,u*2.2512*breathe);
      ctx.globalCompositeOperation='lighter';
      if(introSeconds<9.7)for(const cloud of cloudSheets(introSeconds,cssW/u,cssH/u)){
        ctx.save();ctx.translate(cssW*.5+cloud.x*u,cy-cloud.y*u);ctx.rotate(-cloud.angle);ctx.globalAlpha=cloud.alpha*glow;ctx.drawImage(cloudSprites[cloud.color],-cloud.sx*u,-cloud.sy*u,cloud.sx*u*2,cloud.sy*u*2);ctx.restore();
      }
      if(introSeconds<10.2){
        const paths=lightStreams(introSeconds,cssW/u,cssH/u);
        ctx.lineCap='round';ctx.lineJoin='round';
        for(const path of paths){
          const start=path[0],end=path[path.length-1],g=ctx.createLinearGradient(cssW*.5+start.x*u,cy-start.y*u,cssW*.5+end.x*u,cy-end.y*u);
          g.addColorStop(0,'rgba(119,55,221,0)');g.addColorStop(.15,'rgba(149,80,239,.35)');g.addColorStop(.55,'rgba(176,124,255,.75)');g.addColorStop(.85,'rgba(183,194,255,.95)');g.addColorStop(1,'rgba(177,165,255,0)');
          const intensity=path[40].alpha,scale=path[40].width/.12;
          for(const layer of [[.30,.020],[.19,.04],[.10,.10],[.045,.20],[.012,.32],[.0025,.58]]){ctx.strokeStyle=g;ctx.globalAlpha=intensity*layer[1]*glow;ctx.lineWidth=Math.max(.4,u*layer[0]*scale);ctx.beginPath();for(let i=0;i<path.length;i++){const p=path[i],x=cssW*.5+p.x*u,y=cy-p.y*u;i?ctx.lineTo(x,y):ctx.moveTo(x,y);}ctx.stroke();}
          for(let strand=0;strand<2;strand++){ctx.strokeStyle=g;ctx.globalAlpha=intensity*.17*glow;ctx.lineWidth=Math.max(.4,u*.0018);ctx.beginPath();for(let i=0;i<path.length;i++){const p=path[i],offset=Math.sin(p.u*17-introSeconds*.9+strand*3.1)*.017*scale,x=cssW*.5+(p.x+p.nx*offset)*u,y=cy-(p.y+p.ny*offset)*u;i?ctx.lineTo(x,y):ctx.moveTo(x,y);}ctx.stroke();}
        }
      }
      const bloom=Math.sin(Math.max(0,Math.min(1,(introSeconds-8)/2.8))*Math.PI);
      if(bloom>0){const g=ctx.createRadialGradient(cssW*.5,cy,0,cssW*.5,cy,u*1.25);g.addColorStop(0,'rgba(166,100,255,.10)');g.addColorStop(.55,'rgba(120,71,230,.04)');g.addColorStop(1,'transparent');ctx.globalAlpha=bloom*glow;ctx.fillStyle=g;ctx.fillRect(0,0,cssW,cssH);}
      const radius=Math.min(1.72,cssW/u*.47),count=quality==='high'?1800:quality==='low'?650:1100;
      for(let i=0;i<count;i++){
        const [s,r,kind,n]=seeds[i];let x,y,size,alpha,a=s*Math.PI*2;
        if(kind<.62){a+=time*.19*(kind<.31?1:-.72);const tilt=kind<.31?.23:-.20;const xx=Math.cos(a)*(radius+Math.sin(n*200)*.022),yy=Math.sin(a)*.42;x=xx*Math.cos(tilt)-yy*Math.sin(tilt);y=xx*Math.sin(tilt)+yy*Math.cos(tilt)+.04;size=1.6+Math.pow(r,5)*4;alpha=(.16+Math.pow(r,3)*.64)*(.55+.45*Math.sin(a));}
        else if(kind<.84){const group=Math.floor(n*3),tail=Math.pow(s,1.65)*.7;a=time*(.32+group*.035)+group*2.094-tail;const tilt=group<1?.23:-.20,xx=Math.cos(a)*radius,yy=Math.sin(a)*.42;x=xx*Math.cos(tilt)-yy*Math.sin(tilt);y=xx*Math.sin(tilt)+yy*Math.cos(tilt)+.04;size=3+(1-s)*5;alpha=Math.pow(1-s,2)*.8;}
        else {a+=time*.025;const rad=Math.sqrt(r);x=Math.pow(Math.sin(a),3)*1.11*rad;y=Math.max(-.80,(13*Math.cos(a)-5*Math.cos(2*a)-2*Math.cos(3*a)-Math.cos(4*a))/16)*1.05*rad;size=1.4+Math.pow(n,6)*3;alpha=(.1+Math.pow(n,4)*.5)*(.6+.4*Math.sin(time*.7+n*50));}
        const entry=kind<.84?ease(8.5+s*.6,10.65+s*.2,introSeconds):ease(8.0,10.0,introSeconds);
        ctx.globalAlpha=Math.max(0,Math.min(1,alpha*glow*entry));ctx.drawImage(sprite,cssW*.5+x*u*.96-size*.5,cy-y*u-size*.5,size,size);
      }
      ctx.globalAlpha=1;ctx.globalCompositeOperation='source-over';
    }
    function tick(now){frameId=0;if(paused||document.hidden){previous=0;return;}if(!previous)previous=now;const delta=now-previous;if(delta>=32){const seconds=Math.min(delta/1000,.1);time+=seconds*speed;introSeconds=Math.min(12,introSeconds+seconds);introUi(introSeconds);previous=now;render();}frameId=requestAnimationFrame(tick);}
    function run(){if(isReady&&!paused&&!document.hidden&&!frameId)frameId=requestAnimationFrame(tick);}
    picture.onload=()=>{feathered=document.createElement('canvas');feathered.width=picture.width;feathered.height=picture.height;const fc=feathered.getContext('2d');fc.drawImage(picture,0,0);fc.globalCompositeOperation='destination-in';const gx=fc.createLinearGradient(0,0,picture.width,0);gx.addColorStop(0,'transparent');gx.addColorStop(.055,'black');gx.addColorStop(.945,'black');gx.addColorStop(1,'transparent');fc.fillStyle=gx;fc.fillRect(0,0,picture.width,picture.height);const gy=fc.createLinearGradient(0,0,0,picture.height);gy.addColorStop(0,'transparent');gy.addColorStop(.055,'black');gy.addColorStop(.945,'black');gy.addColorStop(1,'transparent');fc.fillStyle=gy;fc.fillRect(0,0,picture.width,picture.height);isReady=true;fit();document.body.classList.remove('failed');document.body.classList.add('ready');introUi(introSeconds);showNotice(reduced.matches?'Reduced motion is on. Press Play whenever you like.':'Canvas mode · WebGL is unavailable in this browser');run();};picture.onerror=()=>{document.body.classList.add('failed');showNotice('The artwork could not load. Please reload to try again.');};picture.src='nebula.webp?v=5';
    play.addEventListener('click',()=>{paused=!paused;syncPlay();previous=0;if(paused){cancelAnimationFrame(frameId);frameId=0;}else run();});
    $('replay').addEventListener('click',()=>{if(reduced.matches)return;introSeconds=0;time=0;previous=0;paused=false;syncPlay();introUi(0);render();run();});
    $('speed').addEventListener('input',e=>{speed=Number(e.target.value);});$('glow').addEventListener('input',e=>{glow=Number(e.target.value);if(paused)render();});$('quality').addEventListener('change',e=>{quality=e.target.value;fit();});
    window.addEventListener('resize',fit,{passive:true});document.addEventListener('visibilitychange',()=>{previous=0;if(document.hidden){cancelAnimationFrame(frameId);frameId=0;}else run();});
    reduced.addEventListener('change',()=>{introUi(introSeconds);if(reduced.matches){introSeconds=12;introUi(12);paused=true;syncPlay();render();cancelAnimationFrame(frameId);frameId=0;showNotice('Reduced motion is on. Press Play whenever you like.');}});
    const full=$('fullscreen');if(!document.documentElement.requestFullscreen)full.hidden=true;
    full.addEventListener('click',async()=>{try{if(document.fullscreenElement)await document.exitFullscreen();else await document.documentElement.requestFullscreen();}catch(_){showNotice('Fullscreen is unavailable in this browser.');}});
    document.addEventListener('fullscreenchange',()=>full.setAttribute('aria-label',document.fullscreenElement?'Exit fullscreen':'Enter fullscreen'));
    $('hint').textContent='A QUIET MOMENT · AN ENDLESS ORBIT';
  }

  // Exposes only rendering diagnostics for smoke tests, with no network or telemetry.
  window.violetOrbit={getState:()=>({ready,paused,quality,elapsed,introTime,textureAssisted:true,width,height,particleCount:quality==='low'?2300:quality==='high'?7200:mobile?3600:5400,drawCalls:introTime<9.7?4:introTime<10.2?3:2})};
})();
