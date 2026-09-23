import {Component,lazy,Suspense,useEffect,useState} from 'react';
import {ArrowLeft} from '@phosphor-icons/react';
import {ProjectOverview} from './ProjectOverview.jsx';
const StoryApp=lazy(()=>import('./StoryApp.jsx').then(m=>({default:m.StoryApp})));
const PictureApp=lazy(()=>import('./PictureApp.jsx').then(m=>({default:m.PictureApp})));
const LetterApp=lazy(()=>import('./LetterApp.jsx').then(m=>({default:m.LetterApp})));
const App=lazy(()=>import('./App.jsx').then(m=>({default:m.App})));
class ViewBoundary extends Component{
 state={failed:false};
 static getDerivedStateFromError(){return {failed:true};}
 render(){return this.state.failed?<div className="project-loading" role="alert"><p>暂时未能载入这个样例，请检查网络后重试。</p><button onClick={()=>window.location.reload()}>重新加载</button></div>:this.props.children;}
}
function RetainedView({active,children}){
 return <div hidden={!active}><ViewBoundary><Suspense fallback={<p className="project-loading" role="status">正在载入样例… 网络较慢时，可以先返回项目总览。</p>}>{children}</Suspense></ViewBoundary></div>;
}
const viewFromHash=()=>['#sea','#paper','#sound'].includes(location.hash)?'canvas':location.hash==='#letters'?'letters':location.hash==='#picture'?'picture':location.hash==='#story'?'story':'overview';
export function ExperienceRoot(){
 const [view,setView]=useState(viewFromHash);
 const [visited,setVisited]=useState(()=>new Set([viewFromHash()]));
 useEffect(()=>{const update=()=>{const next=viewFromHash();setVisited(p=>new Set([...p,next]));setView(next);window.scrollTo(0,0);};window.addEventListener('hashchange',update);return()=>window.removeEventListener('hashchange',update);},[]);
 return <>{view!=='overview'&&<a className="project-return" href="#overview"><ArrowLeft size={15}/>项目总览与全部样例</a>}
 {visited.has('overview')&&<RetainedView active={view==='overview'}><ProjectOverview active={view==='overview'}/></RetainedView>}
 {visited.has('story')&&<RetainedView active={view==='story'}><StoryApp active={view==='story'}/></RetainedView>}
 {visited.has('picture')&&<RetainedView active={view==='picture'}><PictureApp active={view==='picture'}/></RetainedView>}
 {visited.has('letters')&&<RetainedView active={view==='letters'}><LetterApp active={view==='letters'}/></RetainedView>}
 {visited.has('canvas')&&<RetainedView active={view==='canvas'}><App active={view==='canvas'}/></RetainedView>}
 </>;
}
