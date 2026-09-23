import {assetUrl} from './assetUrl.js';
import { useEffect, useMemo, useRef } from 'react';
import { ArrowRight, Moon } from '@phosphor-icons/react';
import { WaterScene } from './WaterScene.jsx';
import './letter-artifact.css';

const POEMS = {
  wang: { line: '海上生明月，天涯共此时。', author: '唐 · 张九龄', title: '望月怀远' },
  su: { line: '但愿人长久，千里共婵娟。', author: '宋 · 苏轼', title: '水调歌头' },
  li: { line: '举杯邀明月，对影成三人。', author: '唐 · 李白', title: '月下独酌·其一' },
};

const BACKGROUNDS = {
  sea: '/assets/moon-sea.png',
  paper: '/assets/paper-scene.png',
  sound: '/assets/sound-pool.png',
};

const text = value => typeof value === 'string' ? value.trim() : '';

function lineTypography(value) {
  const length = Array.from(value).length;
  if (length > 64) return { '--la-line-fluid': '3.7cqw', '--la-line-max': '23px' };
  if (length > 44) return { '--la-line-fluid': '4cqw', '--la-line-max': '27px' };
  if (length > 24) return { '--la-line-fluid': '4.6cqw', '--la-line-max': '32px' };
  return { '--la-line-fluid': '5.5cqw', '--la-line-max': '41px' };
}

/**
 * A read-only preview of a moonlight letter. Both original lines remain real
 * text. showReply=false deliberately previews the unfinished letter, even if
 * reply data exists; only the optional, explicitly labelled demo audio plays.
 */
export function LetterArtifact({ letter = {}, compact = false, showReply = true }) {
  const style = Object.hasOwn(BACKGROUNDS, letter.style) ? letter.style : 'sea';
  const audioRef = useRef(null);
  useEffect(() => { const audio = audioRef.current; return () => audio?.pause(); }, [style, compact]);
  const poem = POEMS[letter.poemId] || POEMS.wang;
  const fromName = text(letter.fromName) || '寄信人';
  const fromCity = text(letter.fromCity);
  const toName = text(letter.toName) || '收信人';
  const firstLine = text(letter.firstLine);
  const replyLine = showReply ? text(letter.reply?.line) : '';
  const completed = Boolean(replyLine);
  const replyName = completed ? text(letter.reply?.name) || toName : toName;
  const replyCity = completed ? text(letter.reply?.city) : '';
  const replyMessage = ''; // The full reply is shown alongside the artifact by its parent.
  const longForm = Array.from(firstLine).length > 18 || Array.from(replyLine).length > 18
    || Boolean(replyMessage) || [fromName, fromCity, replyName, replyCity].some(value => Array.from(value).length > 16);
  const label = completed ? '两地一月 · 共同创作' : '一封未完的月光信';
  const moon = useMemo(() => ({
    x: style === 'paper' ? 0.21 : 0.81,
    y: style === 'paper' ? 0.23 : style === 'sound' ? 0.19 : 0.22,
    size: style === 'paper' ? 0.23 : 0.18,
    brightness: completed ? 0.72 : 0.58,
  }), [style, completed]);
  const classes = [
    'la-artifact', `la-${style}`, completed ? 'la-completed' : 'la-pending',
    compact ? 'la-compact' : '', longForm ? 'la-long-form' : '',
  ].filter(Boolean).join(' ');

  return (
    <article
      className={classes}
      aria-label={label}
      data-status={completed ? 'completed' : 'pending'}
      data-letter-status={text(letter.status) || undefined}
    >
      <div className="la-scenery" aria-hidden="true">
        {style === 'paper' || compact ? (
          <img className="la-background" src={assetUrl(BACKGROUNDS[style])} alt="" draggable={false} />
        ) : (
          <WaterScene mode={style} moon={moon} intensity={0} />
        )}
        <div className="la-shade" />
        <img
          className="la-moon-image"
          src={assetUrl('/assets/moon.png')}
          alt=""
          draggable={false}
          style={{ left: `${moon.x * 100}%`, top: `${moon.y * 100}%`, width: `${moon.size * 100}%` }}
        />
      </div>

      <header className="la-header">
        <div className="la-topline">
          <p className="la-label">{label}</p>
          {completed && <span className="la-completion-mark">共写完成</span>}
        </div>
        <div className="la-intro">
          <p className="la-intro-label">古诗引子</p>
          <p className="la-classic-line">{poem.line}</p>
          <p className="la-classic-source">{poem.author}《{poem.title}》</p>
        </div>
      </header>

      <div className="la-writing">
        <section className="la-stanza" aria-label={`${fromName}写下的第一句`}>
          <p className="la-author-label">{fromName}<span className="la-author-action">写下</span></p>
          <p
            className={`la-original-line${firstLine ? '' : ' la-placeholder'}`}
            style={lineTypography(firstLine)}
          >
            {firstLine || '你的第一句，会留在这里。'}
          </p>
        </section>

        <div className="la-verse-join" aria-hidden="true">
          <span className="la-join-line" />
          <Moon className="la-join-moon" size={15} weight="light" />
          <span className="la-join-line" />
        </div>

        {completed ? (
          <section className="la-stanza la-replied-stanza" aria-label={`${replyName}续写的下一句`}>
            <p className="la-author-label">{replyName}<span className="la-author-action">续写</span></p>
            <p className="la-original-line la-reply-line" style={lineTypography(replyLine)}>{replyLine}</p>
          </section>
        ) : (
          <section className="la-reply-space" aria-label="等待收信人续写">
            <p className="la-awaiting">下一句，等你来写。</p>
            <div className="la-empty-line" aria-hidden="true" />
          </section>
        )}

        {replyMessage && (
          <aside className="la-personal-note" aria-label="回信附言">
            <span className="la-note-label">回信附言</span>
            <p className="la-note-text">{replyMessage}</p>
          </aside>
        )}
      </div>

      <footer className="la-footer">
        <div className="la-signatures">
          <div className="la-signature la-sender">
            <span className="la-city">{fromCity || '寄信人所在之处'}</span>
            <span className="la-signature-name">{fromName}</span>
          </div>
          <div className="la-signature-bridge" aria-hidden="true">
            <span className="la-bridge-rule" />
            {completed ? <Moon className="la-bridge-icon" size={21} weight="light" />
              : <ArrowRight className="la-bridge-icon" size={22} weight="light" />}
            <span className="la-bridge-rule" />
          </div>
          <div className="la-signature la-recipient">
            <span className="la-city">{completed ? replyCity || '续写人所在之处' : '等待回信'}</span>
            <span className="la-signature-name">{replyName}{!completed && <span className="la-pending-signature"> · 待续写</span>}</span>
          </div>
        </div>
        {style === 'sound' && !compact && (
          <div className="la-audio-row">
            <span className="la-audio-label">示例配乐<span className="la-audio-origin">非用户录音</span></span>
            <audio ref={audioRef} className="la-demo-audio" controls preload="none" aria-label="示例配乐，非用户录音">
              <source src={assetUrl('/assets/demo-music.mp3')} type="audio/mpeg" />
              你的浏览器暂不支持音频播放。
            </audio>
          </div>
        )}
      </footer>
    </article>
  );
}
