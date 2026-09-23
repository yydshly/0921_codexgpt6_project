import { useEffect, useRef } from 'react';
import {
  ArrowDown, ArrowRight, ArrowUpRight, BookOpen, Check,
  DownloadSimple, EnvelopeOpen, FileText, FilmStrip,
  ImageSquare, Moon, Play, Sparkle, WaveSine,
} from '@phosphor-icons/react';
import './project-overview.css';

const publicUrl = (path) => `${import.meta.env.BASE_URL.replace(/\/?$/, '/')}${path.replace(/^\/+/, '')}`;

const samples = [
  {
    id: 'reunion', number: '01', title: '给团圆留一盏灯',
    image: 'assets/story-room-open.png', alt: '木窗外的月色，桌上一盏温暖的灯',
    caption: '推开窗，让旧时的记忆与今天相遇。',
    steps: ['划开木窗', '月光照旧照', '旧时与今天相遇'],
    filename: '给团圆留一盏灯',
  },
  {
    id: 'poetry', number: '02', title: '桂下藏诗',
    image: 'assets/paper-scene.png', alt: '桂花枝、浅墨山水与留白的纸笺',
    caption: '给月亮留半句诗，让你的动作补完下一句。',
    steps: ['轻触诗笺', '划过古诗', '月光补完下句'],
    filename: '桂下藏诗',
  },
];

const canvases = [
  { href: '#sea', title: '月光造境', text: '月亮、倒影与诗句的空间编排。', image: 'assets/moon-sea.png', Icon: Moon },
  { href: '#paper', title: '诗笺工坊', text: '纸纹、桂花与字句之间的留白。', image: 'assets/paper-scene.png', Icon: BookOpen },
  { href: '#sound', title: '声音成诗', text: '用导入音频或录音驱动画面。', image: 'assets/sound-pool.png', Icon: WaveSine },
];

const filmFiles = [
  ['film-captions.srt', '字幕', 'SRT'],
  ['film-narration.mp3', '旁白', 'MP3'],
  ['film-music.wav', '配乐', 'WAV'],
  ['film-cover.jpg', '横版封面', 'JPG'],
  ['film-poster.png', '分享海报', 'PNG'],
  ['film-frames.jpg', '关键帧总览', 'JPG'],
];

const filmArtwork = [
  ['envelope', '片头纸封', '象牙白纸封与安静的留白'],
  ['father', '爸爸与水果', '爸爸拎着一袋水果走进家门'],
  ['child', '孩子挑月饼', '孩子在桌前挑选双黄月饼'],
  ['mother', '厨房里的热汤', '厨房里端出的一碗热汤'],
  ['family', '终于坐下', '一家人围坐在团圆的餐桌旁'],
  ['stilllife', '月饼与果盘', '月饼、水果与中秋桌面静物'],
];

const documents = [
  ['product-understanding.md', '产品理解', '为什么做、为谁做，以及想让人带走什么。'],
  ['asset-catalog.md', '样例与素材清单', '可体验的原型、样片和完整交付文件。'],
  ['capability-analysis.md', '实现能力分析', '已研究能力如何用于画面、声音与交互。'],
  ['product-directions.md', '方向与取舍', '候选方向、演进过程及尚待验证的判断。'],
  ['asset-provenance.md', '视觉与声音来源', '图片、音乐、字体和示范素材的来源记录。'],
];

function SectionHeading({ number, title, description, id }) {
  return <div className="po-section-heading"><div><span className="po-kicker">{number}</span><h2 id={id}>{title}</h2></div>{description && <p>{description}</p>}</div>;
}

export function ProjectOverview({ active = true }) {
  const filmRef = useRef(null);
  useEffect(() => {
    const film = filmRef.current;
    const pauseOnLeave = () => { if (location.hash && location.hash !== '#overview') film?.pause(); };
    window.addEventListener('hashchange', pauseOnLeave);
    return () => { window.removeEventListener('hashchange', pauseOnLeave); film?.pause(); };
  }, []);
  useEffect(() => { if (!active) filmRef.current?.pause(); }, [active]);

  const goTo = (id) => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    document.getElementById(id)?.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });
  };

  return (
    <main className="project-overview" aria-labelledby="po-page-title">
      <header className="po-nav">
        <a className="po-brand" href="#overview" aria-label="月下造境，项目总览"><Moon size={27} aria-hidden="true" /><span>月下造境</span><small>作品与探索</small></a>
        <nav aria-label="项目总览导航">
          <button type="button" onClick={() => goTo('po-samples')}>当前样片</button>
          <button type="button" onClick={() => goTo('po-history')}>探索档案</button>
          <button type="button" onClick={() => goTo('po-docs')}>项目文档</button>
        </nav>
        <a className="po-nav-cta" href="#story">进入创作<ArrowUpRight size={17} aria-hidden="true" /></a>
      </header>

      <div className="po-page">
        <section className="po-hero">
          <div className="po-hero-copy">
            <p className="po-kicker"><span className="po-status-dot" />中秋创作 · 当前方向：互动短篇</p>
            <h1 id="po-page-title">让故事，<br />在画面里发生。</h1>
            <p className="po-hero-lead">图片是舞台，用户的动作推动故事。</p>
            <p className="po-hero-description">点击、划动、拖放，让一段记忆慢慢展开。换上自己的照片、字句与声音，再把这份故事交给想念的人。</p>
            <div className="po-hero-actions">
              <a className="po-primary" href="#story"><Play size={19} aria-hidden="true" />体验与改编<ArrowRight size={19} aria-hidden="true" /></a>
              <button className="po-text-action" type="button" onClick={() => goTo('po-samples')}>先看两份样片<ArrowDown size={18} aria-hidden="true" /></button>
            </div>
            <p className="po-hero-footnote">可独立播放 · 可完整改编 · 图片与音频随作品保留</p>
          </div>
          <a className="po-hero-art" href="#story" aria-label="进入当前互动短篇，体验或改编故事">
            <img src={publicUrl('assets/story-room-closed.png')} alt="一扇尚未推开的木窗，暖灯为桌面留下一束光" fetchPriority="high" />
            <div className="po-hero-art-caption"><div><span>当前样片 · 互动短篇</span><strong>给团圆留一盏灯</strong></div><span className="po-play-mark"><Play size={23} weight="fill" aria-hidden="true" /></span></div>
          </a>
        </section>

        <section className="po-section" id="po-samples" aria-labelledby="po-samples-title">
          <SectionHeading number="01 / 当前作品" title="先走进一个故事" id="po-samples-title" description="两份样片共用同一套播放器与编辑器。动作改变画面，也可以换成你自己的内容。" />
          <div className="po-samples">
            {samples.map(sample => <article className="po-sample" key={sample.id}>
              <a className="po-sample-image" href={publicUrl(`story-examples/${sample.id}.html`)} target="_blank" rel="noreferrer" aria-label={`在新标签页播放${sample.title}`}>
                <img src={publicUrl(sample.image)} alt={sample.alt} loading="lazy" />
                <span className="po-sample-number">{sample.number}</span><span className="po-sample-play"><Play size={18} weight="fill" aria-hidden="true" />独立播放</span>
              </a>
              <div className="po-sample-body"><h3>{sample.title}</h3><p>{sample.caption}</p><ol className="po-sample-steps">{sample.steps.map((step, index) => <li key={step}><span>{index + 1}</span>{step}</li>)}</ol>
                <div className="po-sample-actions"><a className="po-primary po-primary-small" href={publicUrl(`story-examples/${sample.id}.html`)} target="_blank" rel="noreferrer">播放完整样片<ArrowUpRight size={16} aria-hidden="true" /></a><a className="po-download-link" href={publicUrl(`story-examples/${sample.id}.moonstory.json`)} download={`${sample.filename}.moonstory.json`}><DownloadSimple size={17} aria-hidden="true" />下载可编辑作品</a></div>
                <a className="po-html-download" href={publicUrl(`story-examples/${sample.id}.html`)} download={`${sample.filename}.html`}>也可保存为独立 HTML 文件<DownloadSimple size={14} aria-hidden="true" /></a>
              </div>
            </article>)}
          </div>
          <p className="po-section-note"><FileText size={17} aria-hidden="true" />HTML 可直接播放；JSON 可在创作页“打开作品”后继续编辑。系统朗读取决于设备声音。家庭图像与回忆为虚构示范素材。</p>
        </section>

        <section className="po-section po-film-section" id="po-film" aria-labelledby="po-film-title">
          <SectionHeading number="02 / 早期影片" title="一桌人，终于坐下" id="po-film-title" description="从家庭日常出发，寻找中秋的情绪、纸感与节奏。完整保留这份影片样片和制作交付。" />
          <div className="po-film-layout">
            <div className="po-film-view"><video ref={filmRef} controls playsInline preload="none" poster={publicUrl('showcase/film-cover.jpg')} aria-label="早期中秋影片样片，一桌人，终于坐下"><source src={publicUrl('showcase/film.mp4')} type="video/mp4" /><p>浏览器暂不支持内嵌播放，可以<a href={publicUrl('showcase/film.mp4')} download>下载影片</a>观看。</p></video><p><FilmStrip size={16} aria-hidden="true" />影片样片 · 约 51 秒 · 虚构家庭情节</p></div>
            <div className="po-film-copy"><span className="po-kicker">这一家 · 制作档案</span><h3>把日常的小事，<br />留给团圆的夜。</h3><p>爸爸说少买一点，却又多拎了一袋水果；孩子挑着双黄月饼，家人互相招呼，终于坐下。</p><p className="po-muted">纸艺画面、旁白与配乐组成的单向叙事探索。这里的示范旁白不代表真实家庭原声。</p><div className="po-film-actions"><a className="po-primary po-primary-small" href={publicUrl('showcase/film.mp4')} download="一桌人，终于坐下.mp4"><DownloadSimple size={18} aria-hidden="true" />下载影片</a><a className="po-outline" href={publicUrl('showcase/film-delivery.zip')} download="这一家-影片交付.zip">完整交付包<DownloadSimple size={16} aria-hidden="true" /></a></div></div>
          </div>
          <div className="po-film-files" aria-label="影片配套文件">{filmFiles.map(([file, label, type]) => <a href={publicUrl(`showcase/${file}`)} download key={file}><span>{label}<small>{type}</small></span><DownloadSimple size={17} aria-hidden="true" /></a>)}</div>
          <details className="po-film-artwork">
            <summary><ImageSquare size={20} aria-hidden="true" /><span>六幅原始插画<small>查看画面与下载素材</small></span><span className="po-artwork-toggle" aria-hidden="true">+</span></summary>
            <div className="po-artwork-content">
              <div className="po-artwork-intro"><p>影片使用的生成插画，保留原始画面；人物与家庭情节均为虚构示范。</p><a className="po-download-link" href={publicUrl('showcase/docs/film-prompts.md')} download="这一家-影片插画提示词.md"><FileText size={17} aria-hidden="true" />下载插画提示词<DownloadSimple size={15} aria-hidden="true" /></a></div>
              <div className="po-artwork-grid">{filmArtwork.map(([id, title, alt]) => <figure key={id}><a className="po-artwork-image" href={publicUrl(`showcase/film-artwork-${id}.png`)} target="_blank" rel="noreferrer" aria-label={`查看${title}原始插画`}><img src={publicUrl(`showcase/film-artwork-${id}.png`)} alt={alt} loading="lazy" /></a><figcaption><span>{title}</span><a href={publicUrl(`showcase/film-artwork-${id}.png`)} download={`这一家-${title}.png`} aria-label={`下载${title}插画`}><DownloadSimple size={17} aria-hidden="true" />下载</a></figcaption></figure>)}</div>
            </div>
          </details>
        </section>

        <section className="po-section" id="po-history" aria-labelledby="po-history-title">
          <SectionHeading number="03 / 保留的探索" title="走过的几种尝试" id="po-history-title" description="这些入口记录了寻找产品的过程。它们是可体验的探索，不等于用户价值或商业效果已经得到验证。" />
          <div className="po-canvases">{canvases.map(({ href, title, text, image, Icon }) => <a className="po-canvas" href={href} key={href}><img src={publicUrl(image)} alt="" loading="lazy" /><div><span className="po-history-label">早期风格画布</span><h3><Icon size={20} aria-hidden="true" />{title}<ArrowUpRight size={18} aria-hidden="true" /></h3><p>{text}</p></div></a>)}</div>
          <div className="po-experiments"><a href="#letters"><EnvelopeOpen size={29} aria-hidden="true" /><div><span className="po-history-label">参与流程探索</span><h3>月光来信</h3><p>写信、接诗、回应，留下两个人署名的作品。</p></div><ArrowUpRight size={20} aria-hidden="true" /></a><a href="#picture"><ImageSquare size={29} aria-hidden="true" /><div><span className="po-history-label">图片互动探索</span><h3>一张图，一场相遇</h3><p>拖动月亮、手绘航线，为图片添加回应。</p></div><ArrowUpRight size={20} aria-hidden="true" /></a></div>
          <ol className="po-evolution" aria-label="产品演进过程">{[
            ['影片与风格', '寻找声音、纸感和叙事节奏。'],
            ['参与式来信', '尝试让两个人共同完成一件作品。'],
            ['互动图片', '让触碰和手绘路径改变画面。'],
            ['互动短篇', '连接图层、动作与顺序，让故事可改编。'],
          ].map(([title, text], index) => <li key={title} className={index === 3 ? 'is-current' : undefined}><span>{String(index + 1).padStart(2, '0')}</span><div><h3>{title}</h3><p>{text}</p></div></li>)}</ol>
        </section>

        <section className="po-section po-capabilities" aria-labelledby="po-capabilities-title">
          <SectionHeading number="04 / 当前能力" title="从看一遍，到改成自己的" id="po-capabilities-title" />
          <div className="po-capability-columns"><div><h3><Sparkle size={21} aria-hidden="true" />已经可以做什么</h3><ul>{[
            ['替换故事内容', '换图片、写文字、加入自己的配音与音乐。'],
            ['编排画面和回应', '调整图层位置与前后层次，设置点击、划动、拖放及动作顺序。'],
            ['带走完整作品', '保存图片、音频与规则；导出可播放网页或可继续编辑的 JSON。'],
          ].map(([title, text]) => <li key={title}><Check size={17} aria-hidden="true" /><div><strong>{title}</strong><p>{text}</p></div></li>)}</ul></div><div className="po-boundaries"><h3><BookOpen size={21} aria-hidden="true" />现在需要知道</h3><ul>{[
            ['创作仍由人来完成', '没有自动识图、任意提示词生成效果或自动配乐功能。'],
            ['声音与保存有边界', '系统朗读依赖设备音色；作品存于当前浏览器，没有账号、云协作或自动发送。'],
            ['原型完成，价值仍待验证', '交互与文件交付已实现；是否打动人、是否适合营销，还需要真实体验者的反馈。'],
          ].map(([title, text]) => <li key={title}><div><strong>{title}</strong><p>{text}</p></div></li>)}</ul></div></div>
        </section>

        <section className="po-section po-documents" id="po-docs" aria-labelledby="po-docs-title">
          <SectionHeading number="05 / 理解与记录" title="把判断和素材，也留下来" id="po-docs-title" description="从产品理解到实现边界，从候选方向到素材来源，集中在这里查阅。" />
          <div className="po-document-list">{documents.map(([file, title, description]) => <a href={publicUrl(`showcase/docs/${file}`)} target="_blank" rel="noreferrer" key={file}><FileText size={24} aria-hidden="true" /><div><h3>{title}</h3><p>{description}</p></div><span className="po-document-type">MD</span><ArrowUpRight size={18} aria-hidden="true" /></a>)}</div>
        </section>

        <footer className="po-footer"><div><Moon size={20} aria-hidden="true" /><span>月下造境<span className="po-footer-divider">/</span>中秋创作档案</span></div><a href="#story">从一份故事开始<ArrowRight size={18} aria-hidden="true" /></a></footer>
      </div>
    </main>
  );
}

export default ProjectOverview;
