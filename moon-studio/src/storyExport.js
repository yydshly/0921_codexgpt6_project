import { createStoryPlayer } from './storyPlayer.js';
import { embedStoryAssets } from './storyModel.js';
import playerCSS from './story-player.css?inline';

function escapeHTML(value) {
  return String(value ?? '').replace(/[&<>"']/g, character => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
}

/** Complete media-preserving HTML. The caller decides how to download the string. */
export async function exportStoryHTML(story) {
  const embedded = await embedStoryAssets(story);
  for (const asset of embedded.assets) {
    // The model has validated MIME types and bytes; here only assert embedding.
    // Audio MIME parameters such as ;codecs=opus must survive unchanged.
    const prefix = asset.kind === 'audio'
      ? /^data:audio\/[a-z0-9.+-]+(?:;codecs=[a-z0-9., -]+)?;base64,/i
      : /^data:image\/(?:png|jpeg|webp);base64,/i;
    if (!prefix.test(asset.src)) throw new Error('仍有素材未内嵌，无法导出完整的离线故事。');
  }
  const data = JSON.stringify(embedded).replace(/[<>&\u2028\u2029]/g, character => ({ '<': '\\u003c', '>': '\\u003e', '&': '\\u0026', '\u2028': '\\u2028', '\u2029': '\\u2029' })[character]);
  const title = escapeHTML(embedded.title || '月光故事');
  const subtitle = escapeHTML(embedded.subtitle || '让一个动作，带故事向前。');
  const boot = function startExportedStory(createPlayer) {
    const story = JSON.parse(document.getElementById('story-data').textContent);
    const hint = document.getElementById('story-hint');
    const next = document.getElementById('story-next');
    const count = document.getElementById('story-progress');
    const ending = document.getElementById('story-ending');
    const endingTitle = document.getElementById('story-ending-title');
    const endingMessage = document.getElementById('story-ending-message');
    const soundButton = document.getElementById('story-sound');
    const notice = document.getElementById('story-notice');
    let sound = true;
    let noticed = 0;
    let nextId;
    let wasFinished = false;
    endingTitle.textContent = story.ending?.title || '故事，因你而完整。';
    endingMessage.textContent = story.ending?.message || '谢谢你，把这一刻留了下来。';
    const player = createPlayer(document.getElementById('story-host'), story, {
      mode: 'play', sound,
      onProgress(state) {
        hint.textContent = state.hint;
        nextId = state.available[0];
        const rule = story.rules.find(item => item.id === nextId);
        next.disabled = !nextId || state.finished;
        next.textContent = state.finished ? '这一段已完成' : rule ? `继续：${rule.name || '下一步'}` : '等待画面回应';
        count.textContent = `${state.completed.length} / ${story.rules.length} 个动作`;
        ending.hidden = !state.finished;
        if (state.finished && !wasFinished) {
          endingTitle.parentElement.scrollTop = 0;
          const top = window.scrollY + endingTitle.getBoundingClientRect().top - 32;
          window.scrollTo({ top: Math.max(0, top), behavior: 'auto' });
          endingTitle.focus({ preventScroll: true });
        }
        wasFinished = state.finished;
      },
      onNotice(message) {
        notice.textContent = message;
        notice.hidden = false;
        window.clearTimeout(noticed);
        noticed = window.setTimeout(() => { notice.hidden = true; }, 6500);
      },
    });
    next.addEventListener('click', () => player.activateRule(nextId));
    document.querySelectorAll('[data-replay]').forEach(button => button.addEventListener('click', () => {
      window.clearTimeout(noticed);
      notice.hidden = true;
      player.reset();
      next.focus({ preventScroll: true });
      window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
    }));
    soundButton.addEventListener('click', () => {
      sound = !sound;
      player.setSound(sound);
      soundButton.textContent = sound ? '声音：开' : '声音：关';
      soundButton.setAttribute('aria-pressed', String(sound));
    });
    window.addEventListener('pagehide', event => {
      window.clearTimeout(noticed);
      // Back/forward cache restores this DOM; leave a clean, usable opening state.
      if (event.persisted) player.reset();
      else player.destroy();
    });
  };

  return `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">
<meta name="referrer" content="no-referrer">
<title>${title} · 月光故事</title>
<style>
${playerCSS}
:root{color-scheme:dark;font-family:'Noto Sans SC','Microsoft YaHei',sans-serif;color:#eee7d9;background:#08131f}*{box-sizing:border-box}body{margin:0;min-width:280px}button{font:inherit;color:inherit;cursor:pointer}button:focus-visible{outline:2px solid #edcf95;outline-offset:4px}button:disabled{cursor:default;opacity:.45}[hidden]{display:none!important}.story-export{width:min(1180px,100%);margin:0 auto;padding:28px 28px 20px}.story-export__header{display:flex;justify-content:space-between;align-items:center;gap:24px;padding:0 0 24px}.story-export__heading{min-width:0}.story-export h1{font-family:'Noto Serif SC','Songti SC',SimSun,serif;font-weight:400;font-size:clamp(23px,3vw,34px);line-height:1.45;margin:0;overflow-wrap:anywhere}.story-export__subtitle{color:#adbeca;line-height:1.75;font-size:14px;margin:8px 0 0;white-space:pre-wrap}.story-export__buttons{display:flex;gap:9px;flex-shrink:0}.story-export__button{border:1px solid #34495b;border-radius:5px;background:#122435;padding:10px 14px;min-height:44px;font-size:13px;white-space:nowrap}.story-export__button:hover{background:#1b3245}.story-export__frame{position:relative;aspect-ratio:16/10;border:1px solid #294052;background:#06111c;border-radius:8px;overflow:hidden;min-height:300px}.story-export__host{position:absolute;inset:0}.story-export__below{display:flex;align-items:center;justify-content:space-between;gap:22px;padding:23px 0 18px}.story-export__hint{font-size:15px;line-height:1.8;margin:0;color:#d9e1df;white-space:pre-wrap}.story-export__count{font-size:12px;color:#a4b7c5;margin:6px 0 0}.story-export__next{min-height:46px;padding:12px 19px;border:0;border-radius:5px;background:#e4c894;color:#132333;flex-shrink:0;font-size:14px;max-width:48%;overflow-wrap:anywhere;white-space:normal}.story-export__note{border-top:1px solid #273e50;padding-top:16px;font-size:12px;line-height:1.8;color:#9eb1c1}.story-export__notice{background:#1d3448;border:1px solid #596f7f;color:#f1e8d8;padding:13px 17px;border-radius:6px;font-size:14px;line-height:1.7;margin:0 0 18px}.story-export__ending{position:absolute;inset:0;z-index:100;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:7%;background:#061322e8;backdrop-filter:blur(5px)}.story-export__ending h2{font-family:'Noto Serif SC','Songti SC',SimSun,serif;font-size:clamp(23px,3.8vw,42px);line-height:1.55;font-weight:400;margin:0 0 16px;outline:none;overflow-wrap:anywhere}.story-export__ending p{white-space:pre-wrap;line-height:1.9;font-size:clamp(14px,1.6vw,18px);margin:0 0 28px;max-width:650px;overflow-wrap:anywhere}.story-export__ending-inner{max-height:100%;overflow:auto;padding:6px;scrollbar-width:thin}@media(max-width:650px){.story-export{padding:19px 16px 18px}.story-export__header{gap:16px;align-items:flex-start;flex-direction:column;padding-bottom:18px}.story-export__buttons{align-self:flex-end}.story-export__frame{aspect-ratio:4/5;min-height:380px}.story-export__below{align-items:stretch;flex-direction:column;gap:13px;padding:18px 0}.story-export__next{max-width:100%;width:100%}.story-export__hint{font-size:14px}.story-export__ending{padding:7%}.story-player__layer-text{font-size:clamp(11px,3.1cqw,20px)}}
</style>
</head>
<body>
<main class="story-export">
  <header class="story-export__header"><div class="story-export__heading"><h1>${title}</h1><p class="story-export__subtitle">${subtitle}</p></div><div class="story-export__buttons"><button class="story-export__button" id="story-sound" type="button" aria-pressed="true">声音：开</button><button class="story-export__button" type="button" data-replay>重新体验</button></div></header>
  <div class="story-export__frame"><div class="story-export__host" id="story-host"></div><section class="story-export__ending" id="story-ending" hidden aria-labelledby="story-ending-title"><div class="story-export__ending-inner"><h2 id="story-ending-title" tabindex="-1"></h2><p id="story-ending-message"></p><button class="story-export__button" type="button" data-replay>再体验一次</button></div></section></div>
  <section class="story-export__below" aria-label="故事进度"><div><p class="story-export__hint" id="story-hint" aria-live="polite"></p><p class="story-export__count" id="story-progress"></p></div><button class="story-export__next" id="story-next" type="button">开始体验</button></section>
  <p class="story-export__notice" id="story-notice" role="status" hidden></p>
  <footer class="story-export__note">可以直接点按、滑动或拖放画面中的对象，也可以用“继续”按钮顺序体验。<br>图片与音频已包含在这个文件中，无需连接本应用。系统中文朗读取决于设备提供的声音；录制音频与系统朗读是两种不同来源。</footer>
</main>
<script type="application/json" id="story-data">${data}</script>
<script>(${boot.toString()})((${createStoryPlayer.toString()}));</script>
</body>
</html>`;
}
