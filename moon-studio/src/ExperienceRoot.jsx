import {lazy,Suspense,useEffect,useState} from 'react';
import {ArrowLeft} from '@phosphor-icons/react';
const StoryApp=lazy(()=>import('./StoryApp.jsx').then(m=>({default:m.StoryApp})));
const PictureApp=lazy(()=>import('./PictureApp.jsx').then(m=>({default:m.PictureApp})));
const LetterApp=lazy(()=>import('./LetterApp.jsx').then(m=>({default:m.LetterApp})));
const App=lazy(()=>import('./App.jsx').then(m=>({default:m.App})));
const ProjectOverview=lazy(()=>import('./ProjectOverview.jsx').then(m=>({default:m.ProjectOverview})));
const viewFromHash=()=>['#sea','#paper','#sound'].includes(location.hash)?'canvas':location.hash==='#letters'?'letters':location.hash==='#picture'?'picture':location.hash==='#story'?'story':'overview';
export function ExperienceRoot(){
 const [view,setView]=useState(viewFromHash);
 const [visited,setVisited]=useState(()=>new Set([viewFromHash()]));
 useEffect(()=>{const update=()=>{const next=viewFromHash();setVisited(p=>new Set([...p,next]));setView(next);window.scrollTo(0,0);};window.addEventListener('hashchange',update);return()=>window.removeEventListener('hashchange',update);},[]);
 return <>{view!=='overview'&&<a className="project-return" href="#overview"><ArrowLeft size={15}/>项目总览与全部样例</a>}<Suspense fallback={<p className="project-loading" role="status">正在打开这段月光故事…</p>}>
 {visited.has('overview')&&<div hidden={view!=='overview'}><ProjectOverview active={view==='overview'}/></div>}
 {visited.has('story')&&<div hidden={view!=='story'}><StoryApp active={view==='story'}/></div>}
 {visited.has('picture')&&<div hidden={view!=='picture'}><PictureApp active={view==='picture'}/></div>}
 {visited.has('letters')&&<div hidden={view!=='letters'}><LetterApp active={view==='letters'}/></div>}
 {visited.has('canvas')&&<div hidden={view!=='canvas'}><App active={view==='canvas'}/></div>}
 </Suspense></>;
}
