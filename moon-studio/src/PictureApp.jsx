import {assetUrl} from './assetUrl.js';
import {useEffect,useRef,useState} from 'react';
import {ArrowRight,ArrowCounterClockwise,Check,DownloadSimple,UploadSimple,PenNib,Play,Pause,SpeakerHigh,SpeakerSlash,Moon,WaveSine,Path,Plus,X,BookOpen,FloppyDisk,CursorClick} from '@phosphor-icons/react';
import {WaterScene} from './WaterScene.jsx';
import {PictureEditor} from './PictureEditor.jsx';
import {defaultProject,loadProject,saveProject,exportProjectJSON,importProjectJSON,pointOnRoute} from './pictureModel.js';
import './picture.css';

const bound=(n,a=0,b=1)=>Math.max(a,Math.min(b,n));
async function prepareImage(file){
 const bitmap=await createImageBitmap(file);
 try{
  const ratio=Math.min(1,1600/Math.max(bitmap.width,bitmap.height));const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(bitmap.width*ratio));canvas.height=Math.max(1,Math.round(bitmap.height*ratio));
  const context=canvas.getContext('2d');context.drawImage(bitmap,0,0,canvas.width,canvas.height);
  let url=canvas.toDataURL('image/webp',.88);if(url.length>2*1024*1024)url=canvas.toDataURL('image/webp',.62);
  if(url.length>2*1024*1024)throw Error('这张图片内容较大，请换一张更小的图片。');return url;
 }finally{bitmap.close();}
}
function PictureDialog({title,onClose,children}){
 const ref=useRef(null);
 useEffect(()=>{const el=ref.current;el.showModal();return()=>el.close();},[]);
 return <dialog className="pi-dialog" ref={ref} onCancel={e=>{e.preventDefault();onClose();}}><header><h2>{title}</h2><button aria-label="关闭" onClick={onClose}><X size={22}/></button></header>{children}</dialog>;
}
export function PictureApp({active=true}){
 const initial=useRef(null);
 if(!initial.current){try{initial.current={project:loadProject(),error:''};}catch(e){initial.current={project:defaultProject(),error:e.message};}}
 const [project,setProject]=useState(initial.current.project),[editing,setEditing]=useState(false),[selected,setSelected]=useState('moon'),[adding,setAdding]=useState(false),[placing,setPlacing]=useState(null);
 const [visited,setVisited]=useState([]),[reveal,setReveal]=useState(null),[ripple,setRipple]=useState(0),[splash,setSplash]=useState(null);
 const [route,setRoute]=useState([]),[drawing,setDrawing]=useState(false),[sailing,setSailing]=useState(false),[progress,setProgress]=useState(0),[arrived,setArrived]=useState(false);
 const [dialog,setDialog]=useState(null),[notice,setNotice]=useState(initial.current.error),[audioURL,setAudioURL]=useState(''),[playing,setPlaying]=useState(false),[voices,setVoices]=useState([]),[speaking,setSpeaking]=useState(false),[transfer,setTransfer]=useState('');
 const stage=useRef(null),audio=useRef(null),pointer=useRef(null),routeRef=useRef([]),timer=useRef(null),fileInput=useRef(null),audioURLRef=useRef(''),cancelSail=useRef(null);
 const moon=project.points.find(p=>p.id==='moon'),water=project.points.find(p=>p.id==='water'),boat=project.points.find(p=>p.id==='boat');
 const notify=t=>{setNotice(t);clearTimeout(timer.current);timer.current=setTimeout(()=>setNotice(''),6000);};
 const mark=id=>setVisited(v=>v.includes(id)?v:[...v,id]);
 useEffect(()=>{const synth=window.speechSynthesis;if(!synth)return;const sync=()=>setVoices(synth.getVoices().filter(v=>/^zh/i.test(v.lang)));sync();synth.addEventListener('voiceschanged',sync);return()=>{synth.removeEventListener('voiceschanged',sync);synth.cancel();};},[]);
 useEffect(()=>()=>{clearTimeout(timer.current);if(audioURLRef.current)URL.revokeObjectURL(audioURLRef.current);},[]);
 useEffect(()=>{const el=audio.current;return()=>el?.pause();},[active]);
 useEffect(()=>{if(!active){audio.current?.pause();setPlaying(false);window.speechSynthesis?.cancel();setSpeaking(false);setSailing(false);}},[active]);
 useEffect(()=>{if(!project.music)audio.current?.pause();},[project.music]);
 useEffect(()=>{
  if(!sailing||!active)return;
  let frame,start;const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;const duration=reduced?650:5200;
  const tick=t=>{start??=t;const p=bound((t-start)/duration);setProgress(p);if(p<1)frame=requestAnimationFrame(tick);else{setSailing(false);setArrived(true);setReveal({id:'arrival',label:'月光抵达的地方',text:boat.text,action:'message'});mark('boat');}};
  frame=requestAnimationFrame(tick);return()=>cancelAnimationFrame(frame);
 },[sailing,active,boat.text,route]);
 const patchPoint=(id,patch)=>setProject(p=>({...p,points:p.points.map(x=>x.id===id?{...x,...patch}:x)}));
 const resetJourney=()=>{setVisited([]);setReveal(null);setDrawing(false);setAdding(false);setPlacing(null);setSailing(false);setProgress(0);setRoute([]);routeRef.current=[];setArrived(false);};
 const replaceProject=p=>{audio.current?.pause();setPlaying(false);if(audioURLRef.current)URL.revokeObjectURL(audioURLRef.current);audioURLRef.current='';setAudioURL('');setProject(p);setSelected('moon');resetJourney();};
 const coords=e=>{const r=stage.current.getBoundingClientRect();return{x:bound((e.clientX-r.left)/r.width,.025,.975),y:bound((e.clientY-r.top)/r.height,.04,.94)};};
 const wakeWater=(p=water)=>{setRipple(v=>v+1);setSplash({x:p.x,y:p.y,id:Date.now()});mark('water');setReveal(water);};
 const toggleAudio=async(fromPoint=false)=>{const el=audio.current;if(!el)return;if(!el.paused){el.pause();return;}if(!project.music&&!fromPoint){notify('先在编辑面板开启配乐。');return;}try{await el.play();}catch{notify('声音暂时无法播放，请重新选择音频文件。');}};
 const speak=text=>{if(!voices.length){notify('当前浏览器没有中文朗读声音，可以在编辑里加入自己的配音。');return;}window.speechSynthesis.cancel();const utter=new SpeechSynthesisUtterance(text);utter.voice=voices[0];utter.lang=voices[0].lang;utter.rate=.78;utter.onend=utter.onerror=()=>setSpeaking(false);window.speechSynthesis.speak(utter);setSpeaking(true);};
 const activate=p=>{
  if(drawing||adding||placing)return;if(editing){setSelected(p.id);return;}
  if(p.id==='moon'){mark('moon');setReveal(p);}
  else if(p.id==='water')wakeWater();
  else if(p.id==='boat'){setReveal(null);setDialog('boat');}
  else{mark(p.id);setReveal(p);if(p.action==='ripple'){setRipple(v=>v+1);setSplash({...p,id:Date.now()});}if(p.action==='sound')toggleAudio(true);}
 };
 const pointDown=(e,p)=>{
  e.stopPropagation();if(sailing||drawing||adding||placing)return;const c=coords(e);pointer.current={id:p.id,start:c,origin:{x:p.x,y:p.y},moved:false};e.currentTarget.setPointerCapture(e.pointerId);
 };
 const pointMove=(e,p)=>{
  const d=pointer.current;if(!d||d.id!==p.id)return;const c=coords(e);if(Math.hypot(c.x-d.start.x,c.y-d.start.y)>.006)d.moved=true;
  if(editing||p.id==='moon'){patchPoint(p.id,{x:bound(d.origin.x+c.x-d.start.x,.04,.96),y:bound(d.origin.y+c.y-d.start.y,.05,(p.id==='moon'&&!editing) ? .4 : .94)});if(p.id==='moon')mark('moon');}
 };
 const pointUp=(e,p)=>{e.stopPropagation();const d=pointer.current;pointer.current=null;if(e.currentTarget.hasPointerCapture(e.pointerId))e.currentTarget.releasePointerCapture(e.pointerId);if(!d?.moved)activate(p);};
 const startRoute=()=>{setDialog(null);setReveal(null);setArrived(false);setProgress(0);setRoute([]);routeRef.current=[];setDrawing(true);setEditing(false);notify('在水面按住拖动，画出纸船要走的路；松手启航。');};
 const launch=path=>{setRoute(path);routeRef.current=path;setProgress(0);setArrived(false);setDrawing(false);setSailing(true);setReveal(null);};
 const autoRoute=()=>{setDialog(null);launch([{x:boat.x,y:boat.y},{x:(boat.x+moon.x)/2,y:.76},{x:bound(moon.x-.08),y:.62},{x:bound(moon.x,.13,.87),y:.53}]);};
 const stageDown=e=>{
  if(e.target.closest('button,input,textarea,dialog,a'))return;
  if(placing){patchPoint(placing,coords(e));setPlacing(null);setEditing(true);return;}
  if(adding){const p=coords(e);const id='custom-'+crypto.randomUUID();setProject(s=>({...s,points:[...s.points,{id,label:'新的发现',...p,action:'message',text:'在这里，藏一句你想说的话。'}]}));setSelected(id);setAdding(false);setEditing(true);return;}
  if(drawing){const p=coords(e);const path=[{x:boat.x,y:boat.y},{x:p.x,y:Math.max(.48,p.y)}];routeRef.current=path;setRoute(path);pointer.current={route:true};e.currentTarget.setPointerCapture(e.pointerId);}
 };
 const stageMove=e=>{if(!pointer.current?.route)return;const p=coords(e);p.y=Math.max(.48,p.y);const path=routeRef.current;if(Math.hypot(p.x-path.at(-1).x,p.y-path.at(-1).y)>.006){routeRef.current=[...path,p].slice(0,350);setRoute(routeRef.current);}};
 const stageUp=e=>{if(pointer.current?.route){pointer.current=null;if(e.currentTarget.hasPointerCapture(e.pointerId))e.currentTarget.releasePointerCapture(e.pointerId);if(routeRef.current.length<3){notify('再画长一点，让纸船有一段旅程。');return;}launch(routeRef.current);}else if(!editing&&!drawing&&!e.target.closest('button,input,textarea,dialog,a')&&coords(e).y>.48)wakeWater(coords(e));};
 const keyboardMove=(e,p)=>{const dirs={ArrowLeft:[-.02,0],ArrowRight:[.02,0],ArrowUp:[0,-.02],ArrowDown:[0,.02]};if((editing||p.id==='moon')&&dirs[e.key]){e.preventDefault();const [x,y]=dirs[e.key];patchPoint(p.id,{x:bound(p.x+x,.04,.96),y:bound(p.y+y,.05,(p.id==='moon'&&!editing) ? .4 : .94)});mark(p.id);}};
 const uploadImage=async file=>{if(!file)return;try{if(!['image/jpeg','image/png','image/webp'].includes(file.type))throw Error('请选择 JPG、PNG 或 WebP 图片。');if(file.size>20*1024*1024)throw Error('请选择20MB以内的图片。');const data=await prepareImage(file);setProject(p=>({...p,imageUrl:data,imageName:file.name.slice(0,100)}));resetJourney();notify('图片已换好。拖动互动点，把它们放到图片里合适的位置。');}catch(e){notify(e.message);}};
 const uploadAudio=file=>{if(!file)return;if(!['audio/mpeg','audio/wav','audio/x-wav','audio/ogg','audio/mp4','audio/webm'].includes(file.type)||file.size>20*1024*1024)return notify('请选择20MB以内的常见音频文件。');audio.current?.pause();setPlaying(false);if(audioURLRef.current)URL.revokeObjectURL(audioURLRef.current);const url=URL.createObjectURL(file);audioURLRef.current=url;setAudioURL(url);setProject(p=>({...p,music:true,audioName:file.name.slice(0,100)}));notify('声音已加入当前预览；保存作品会保存设置，声音文件需要在下次重新选择。');};
 const save=()=>{try{saveProject(project);notify('图片和互动设置已保存在这个浏览器。'+(audioURL?' 自选声音仅保留在本次预览。':''));}catch(e){notify(e.message);}};
 const transferExport=()=>{try{setTransfer(exportProjectJSON(project));setDialog('export');}catch(e){notify(e.message);}};
 const importFile=async file=>{if(!file)return;try{if(file.size>2300000)throw Error('作品文件过大。');replaceProject(importProjectJSON(await file.text()));notify('互动图片已打开。');}catch(e){notify(e.message);}};
 const download=()=>{const url=URL.createObjectURL(new Blob([transfer],{type:'application/json'}));const a=document.createElement('a');a.href=url;a.download='月下造境.picture.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),10000);notify('已请求下载互动作品文件。');};
 const movingBoat=!editing&&!placing&&route.length&&(sailing||arrived)?pointOnRoute(route,progress):boat;
 const seaImage=project.imageUrl==='/assets/moon-sea.png'||project.imageUrl==='/assets/sound-pool.png';
 const poemVisible=reveal?.action==='poem';
 if(!active)return null;
 return <main className={'pi-app'+(editing?' pi-is-editing':'')}>
  <audio ref={audio} src={audioURL||assetUrl('/assets/demo-music.mp3')} loop preload="none" onPlay={()=>setPlaying(true)} onPause={()=>setPlaying(false)} onError={()=>notify('这段音频未能播放，请重新选择声音。')}/>
  <header className="pi-nav"><a className="pi-brand" href="#picture"><Moon size={25}/><span>月下造境</span><small>一张图，一场相遇</small></a><div className="pi-nav-actions"><button onClick={()=>toggleAudio()} aria-label={playing?'关闭配乐':'开启配乐'}>{playing?<SpeakerHigh size={20}/>:<SpeakerSlash size={20}/>}<span>{playing?'配乐开':'配乐关'}</span></button><button className={editing?'pi-selected':''} onClick={()=>{if(!editing)resetJourney();setEditing(!editing);setDrawing(false);setAdding(false);setPlacing(null);setReveal(null);}}><PenNib size={19}/><span>{editing?'回到体验':'编辑这张图'}</span></button><button className="pi-save" aria-label="保存作品" onClick={save}><FloppyDisk size={18}/><span>保存作品</span></button></div></header>
  <div className="pi-workspace">
   <section className={'pi-stage'+(!seaImage?' pi-own-image':'')+(drawing?' pi-drawing':'')+(adding||placing?' pi-adding':'')} ref={stage} aria-label="可探索的月夜图片" onPointerDown={stageDown} onPointerMove={stageMove} onPointerUp={stageUp} onPointerCancel={()=>{pointer.current=null;}}>
    {seaImage?<WaterScene mode={project.imageUrl.includes('sound')?'sound':'sea'} moon={{...moon,size:.12,brightness:.7}} ripple={ripple} intensity={0}/>:<img className="pi-background" src={assetUrl(project.imageUrl)} alt={project.imageName}/>}
    <div className="pi-shade"/>
    <div className="pi-scene-heading"><p>中秋 · 可探索的图片</p><h1>{project.title}</h1><span>{editing?'在图中移动互动点，让画面按你的想法回应。':'先借一束月光，再把一句话送往远方。'}</span></div>
    {route.length>1&&<svg className="pi-route" viewBox="0 0 1000 1000" preserveAspectRatio="none" aria-hidden="true"><path d={route.map((p,i)=>(i?'L':'M')+(p.x*1000)+' '+(p.y*1000)).join(' ')} vectorEffect="non-scaling-stroke"/></svg>}
    {splash&&<div key={splash.id} className="pi-water-ring" style={{left:splash.x*100+'%',top:splash.y*100+'%'}} aria-hidden="true"/>}
    {project.points.map(p=>{
      const pos=p.id==='boat'?movingBoat:p;
      const cls='pi-object pi-'+p.id+(selected===p.id&&editing?' pi-object-selected':'')+(visited.includes(p.id)?' pi-object-visited':'');
      return <button key={p.id} className={cls} style={{left:pos.x*100+'%',top:pos.y*100+'%'}} aria-label={p.id==='moon'?'月亮：拖动或用方向键改变月光位置':p.label} onPointerDown={e=>pointDown(e,p)} onPointerMove={e=>pointMove(e,p)} onPointerUp={e=>pointUp(e,p)} onPointerCancel={()=>{pointer.current=null;}} onKeyDown={e=>keyboardMove(e,p)} onClick={e=>{e.stopPropagation();if(e.detail===0)activate(p);}}>
       {p.id==='moon'?<img src={assetUrl('/assets/moon.png')} alt="" draggable="false"/>:p.id==='boat'?<img src={assetUrl('/assets/moon-paper-boat.png')} alt="" draggable="false"/>:<span className="pi-point-mark">{p.id==='water'?<WaveSine size={22}/>:<Plus size={19}/>}</span>}
       <span className="pi-point-label">{p.id==='moon'&&!visited.includes('moon')&&!editing?'拖动，借一束月光':p.id==='boat'&&sailing?'心意正在水上前行':p.id==='boat'&&arrived?'月光已抵达':p.label}{editing&&<small>按住拖动</small>}</span>
      </button>;
    })}
    {reveal&&<div className={'pi-reveal'+(poemVisible?' pi-poetry':'')} role="status"><button className="pi-close-reveal" aria-label="收起画面文字" onClick={()=>setReveal(null)}><X size={18}/></button><p>{reveal.id==='arrival'?'月光，把你写的话送到了这里':poemVisible?'轻触水面 · 诗句浮现':reveal.label}</p><blockquote>{reveal.text}</blockquote>{poemVisible&&<small>{reveal.id==='water'&&reveal.text==='海上生明月，天涯共此时。'?'唐 · 张九龄《望月怀远》':'创作者选择的诗句'}</small>}<div><button onClick={()=>speaking?(window.speechSynthesis.cancel(),setSpeaking(false)):speak(reveal.text)}><SpeakerHigh size={16}/>{speaking?'停止朗读':'系统朗读'}</button>{reveal.id==='arrival'&&<button onClick={()=>{resetJourney();setEditing(true);}}><PenNib size={16}/>把它改成我的故事</button>}</div></div>}
    {(drawing||adding||placing)&&<div className="pi-draw-prompt"><Path size={20}/><span>{placing?'点击图片，为这个互动点换一个位置':adding?'点图片中的任意位置，放一个新的互动点':'按住水面，画一条航线。松开，纸船就会出发。'}</span><button onClick={()=>{setDrawing(false);setAdding(false);setPlacing(null);}}>取消</button>{drawing&&<button onClick={autoRoute}>沿月光航行</button>}</div>}
    <div className="pi-bottom-note"><span>{editing?'创作模式 · 图上的每一个点，都可以藏一个回应':sailing?'这一次，纸船沿着你决定的路线前行。':arrived?'一张图，已经留下了你的动作与心意。':'不用填表，从碰一下画面开始。'}</span><button aria-label="重新体验" onClick={resetJourney}><ArrowCounterClockwise size={19}/></button></div>
   </section>
   {editing&&<PictureEditor project={project} onChange={setProject} onClose={()=>{setEditing(false);setAdding(false);}} onSelectPoint={id=>setSelected(id)} selectedId={selected} onPositionPoint={id=>{setPlacing(id);setEditing(false);setReveal(null);}} onAddPoint={()=>{if(project.points.length>=15)return notify('一张图最多放15个互动点。');setAdding(true);setEditing(false);setReveal(null);}} onImageUpload={uploadImage} onAudioUpload={uploadAudio} onReset={()=>{replaceProject(defaultProject());notify('已换回月夜示例，保存的版本仍保留，直到你再次保存。');}}/>}
  </div>
  <section className="pi-chapters" aria-label="图片中的三个动作"><button onClick={()=>{mark('moon');patchPoint('moon',{x:moon.x>.6?.4:.76});setReveal({label:'借一束月光',text:seaImage?'也可以直接拖动月亮。海面的倒影会跟着你移动。':'也可以直接拖动月亮，把月光放到你喜欢的位置。',action:'message'});}}><span className="pi-step">{visited.includes('moon')?<Check size={20}/>:'01'}</span><div><h2>借一束月光</h2><p>{seaImage?'拖动月亮，让倒影来到你面前':'拖动月亮，重新安排你的月色'}</p></div><Moon size={23}/></button><button onClick={()=>wakeWater()}><span className="pi-step">{visited.includes('water')?<Check size={20}/>:'02'}</span><div><h2>唤醒一句诗</h2><p>轻触水面，看字句从月色中浮现</p></div><WaveSine size={24}/></button><button onClick={()=>setDialog('boat')}><span className="pi-step">{visited.includes('boat')?<Check size={20}/>:'03'}</span><div><h2>送一句心意</h2><p>画一条路，让纸船载着你的话启航</p></div><Path size={24}/></button></section>
  <footer className="pi-footer"><span>{audioURL?'自选声音 · 仅本次预览':project.audioName?'自选声音尚未载入 · 当前为示例配乐':'示例配乐 · 原创程序合成'} · 作品保存在本机</span><div><button onClick={()=>setDialog('about')}><BookOpen size={15}/>这张图怎么玩</button><button onClick={transferExport}><DownloadSimple size={15}/>导出</button><button onClick={()=>fileInput.current.click()}><UploadSimple size={15}/>导入</button><a href="#letters">来信实验</a></div></footer>
  <input type="file" hidden ref={fileInput} accept=".json,application/json" onChange={e=>{importFile(e.target.files[0]);e.target.value='';}}/>
  {notice&&<div className="pi-notice" role="status">{notice}<button aria-label="关闭提示" onClick={()=>setNotice('')}><X size={17}/></button></div>}
  {dialog==='boat'&&<PictureDialog title="给这只纸船，一句要带走的话。" onClose={()=>setDialog(null)}><p>你可以沿水面画出航线。纸船会带着这句话，走过你画的路。</p><label>船上的心意<textarea aria-label="船上的心意" value={boat.text} maxLength={500} rows={3} onChange={e=>patchPoint('boat',{text:e.target.value})}/></label><div className="pi-dialog-actions"><button className="pi-primary" onClick={startRoute}><Path size={19}/>亲手画一条路</button><button onClick={autoRoute}>沿月光航行<ArrowRight size={18}/></button></div><small>这是图中的互动旅程，不会向任何人发送消息。</small></PictureDialog>}
  {dialog==='about'&&<PictureDialog title="让一张图，藏住更多故事。" onClose={()=>setDialog(null)}><p>月亮能移动；点按画面能唤出诗句；纸船沿你画出的路线航行。月海示例还配有跟随月亮的实时水面倒影。换入自己的图片后，可以在静态底图上编排互动点、文字与声音。</p><p>进入「编辑这张图」，可以换自己的图片、添加与移动互动点、设置诗句或留言，也能上传自己的声音。互动点由你手动放置。</p><p>「系统朗读」使用浏览器已有的中文声音；当前{voices.length?'有可用中文声音':'未发现中文声音，可以导入自己的配音'}。配乐可独立关闭。</p><small>张九龄《望月怀远》是咏月怀人诗，此处借其意象创作中秋互动。<a href="https://www.sastind.gov.cn/history/n152/n81023/n81097/n109645/c110343/content.html" target="_blank" rel="noreferrer">查看诗词资料</a></small></PictureDialog>}
  {dialog==='export'&&<PictureDialog title="把互动一起保存。" onClose={()=>setDialog(null)}><p>文件包含图片、互动点、文字和位置。对方在本应用导入后可以继续体验和编辑。自选音频文件不包含在内，需另行选择。</p><div className="pi-dialog-actions"><button className="pi-primary" onClick={download}><DownloadSimple size={18}/>下载作品文件</button><button onClick={async()=>{try{await navigator.clipboard.writeText(transfer);notify('作品内容已复制。');}catch{notify('可展开下方内容手动复制。');}}}>复制作品内容</button></div><details><summary>查看作品内容</summary><textarea aria-label="导出的互动图片内容" readOnly value={transfer}/></details></PictureDialog>}
 </main>;
}
