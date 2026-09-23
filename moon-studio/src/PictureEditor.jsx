import {assetUrl} from './assetUrl.js';
import { useId, useRef } from 'react';
import {
  ArrowCounterClockwise,
  ArrowRight,
  Boat,
  BookOpen,
  ChatCircleText,
  Check,
  ImageSquare,
  Moon,
  MusicNote,
  Plus,
  SlidersHorizontal,
  SpeakerHigh,
  Trash,
  Waves,
  X,
} from '@phosphor-icons/react';
import './picture-editor.css';

const BUILT_IN_IDS = new Set(['moon', 'water', 'boat']);
const ACTIONS = [
  { value: 'poem', label: '展开诗句', Icon: BookOpen },
  { value: 'message', label: '展开一句话', Icon: ChatCircleText },
  { value: 'sound', label: '播放声音', Icon: SpeakerHigh },
  { value: 'ripple', label: '泛起涟漪', Icon: Waves },
];
const BUILT_IN_ICONS = { moon: Moon, water: Waves, boat: Boat };

function actionFor(point) {
  return ACTIONS.find((action) => action.value === point.action) || ACTIONS[0];
}

function positionLabel(point) {
  const percent = (value) => Math.round(Math.min(1, Math.max(0, Number(value) || 0)) * 100);
  return `横向 ${percent(point.x)}%，纵向 ${percent(point.y)}%`;
}

/** A non-modal, controlled drawer: the parent owns the image, points and audio. */
export function PictureEditor({
  project,
  onChange,
  onClose,
  onAddPoint,
  onSelectPoint,
  selectedId,
  onImageUpload,
  onAudioUpload,
  onReset,
  onPositionPoint,
}) {
  const id = useId();
  const imageInput = useRef(null);
  const audioInput = useRef(null);
  const points = project.points || [];
  const selectedPoint = points.find((point) => point.id === selectedId);
  const isBuiltIn = selectedPoint && BUILT_IN_IDS.has(selectedPoint.id);
  const canDelete = selectedPoint?.id.startsWith('custom-');

  const updateProject = (changes) => onChange({ ...project, ...changes });
  const updatePoint = (changes) => {
    if (!selectedPoint) return;
    updateProject({
      points: points.map((point) => point.id === selectedPoint.id ? { ...point, ...changes } : point),
    });
  };
  const removePoint = () => {
    if (!canDelete) return;
    updateProject({ points: points.filter((point) => point.id !== selectedPoint.id) });
    onSelectPoint(null);
  };
  const chooseFile = (event, callback) => {
    const file = event.currentTarget.files?.[0];
    // Allow selecting the same file again after a failed or cancelled parent import.
    event.currentTarget.value = '';
    if (file) callback(file);
  };

  return (
    <aside
      className="picture-editor"
      aria-labelledby={`${id}-heading`}
      onKeyDown={(event) => {
        if (event.key === 'Escape' && !event.nativeEvent.isComposing) {
          event.stopPropagation();
          onClose();
        }
      }}
    >
      <header className="picture-editor__header">
        <div>
          <span className="picture-editor__eyebrow"><SlidersHorizontal size={15} aria-hidden="true" /> 图片互动</span>
          <h2 id={`${id}-heading`}>让画面回应你</h2>
        </div>
        <button type="button" className="picture-editor__icon-button" onClick={onClose} aria-label="关闭图片编辑面板">
          <X size={22} aria-hidden="true" />
        </button>
      </header>

      <div className="picture-editor__body">
        <section className="picture-editor__section" aria-labelledby={`${id}-picture-heading`}>
          <h3 id={`${id}-picture-heading`}>这一幅画面</h3>
          <label className="picture-editor__field" htmlFor={`${id}-title`}>
            <span>作品标题</span>
            <input id={`${id}-title`} value={project.title || ''} maxLength={60} placeholder="给这一刻起个名字" onChange={(event) => updateProject({ title: event.target.value })} />
          </label>
          <div className="picture-editor__asset">
            <div className="picture-editor__thumbnail" aria-hidden="true">
              {project.imageUrl ? <img src={assetUrl(project.imageUrl)} alt="" /> : <ImageSquare size={25} />}
            </div>
            <div className="picture-editor__asset-copy">
              <span>当前图片</span>
              <strong title={project.imageName || '月夜示例图片'}>{project.imageName || '月夜示例图片'}</strong>
            </div>
            <button type="button" className="picture-editor__small-button" onClick={() => imageInput.current?.click()} aria-label="上传并更换画面图片">更换图片</button>
          </div>
          <input ref={imageInput} className="picture-editor__file-input" type="file" accept="image/*" aria-label="选择画面图片文件" onChange={(event) => chooseFile(event, onImageUpload)} />
          <p className="picture-editor__hint">图片与音频仅在本机处理。图片会适配到最长1600像素，便于保存。</p>
        </section>

        <section className="picture-editor__section" aria-labelledby={`${id}-points-heading`}>
          <div className="picture-editor__section-heading">
            <h3 id={`${id}-points-heading`}>画面里的互动</h3>
            <span className="picture-editor__count">{points.length} 个点</span>
          </div>
          <p className="picture-editor__hint picture-editor__intro">选一个点编辑，也可以在图中拖动它，调整位置。</p>
          <ul className="picture-editor__points" aria-label="互动点列表">
            {points.map((point, index) => {
              const action = actionFor(point);
              const Icon = BUILT_IN_ICONS[point.id] || action.Icon;
              const selected = selectedId === point.id;
              const label = point.label || `互动点 ${index + 1}`;
              return (
                <li key={point.id}>
                  <button
                    type="button"
                    className={`picture-editor__point${selected ? ' is-selected' : ''}`}
                    aria-pressed={selected}
                    aria-label={`编辑${label}，${action.label}，${positionLabel(point)}`}
                    onClick={() => onSelectPoint(point.id)}
                  >
                    <span className="picture-editor__point-icon"><Icon size={20} aria-hidden="true" /></span>
                    <span className="picture-editor__point-copy"><strong>{label}</strong><span>{action.label}{BUILT_IN_IDS.has(point.id) ? ' · 内置' : ''}</span></span>
                    {selected ? <Check size={17} aria-hidden="true" /> : <ArrowRight size={16} aria-hidden="true" />}
                  </button>
                </li>
              );
            })}
          </ul>
          {points.length === 0 && <p className="picture-editor__empty">还没有互动点。添加一个，让画面有第一声回应。</p>}
          <button type="button" className="picture-editor__add" onClick={onAddPoint}><Plus size={18} aria-hidden="true" />添加互动点</button>

          {selectedPoint ? (
            <div className="picture-editor__point-settings" role="group" aria-label={`编辑${selectedPoint.label || '互动点'}`}>
              <div className="picture-editor__selection-heading">
                <span>正在编辑</span>
                {canDelete && <button type="button" className="picture-editor__delete" onClick={removePoint} aria-label={`删除互动点${selectedPoint.label || ''}`}><Trash size={16} aria-hidden="true" />删除这个点</button>}
              </div>
              <label className="picture-editor__field" htmlFor={`${id}-point-label`}>
                <span>点的名字</span>
                <input id={`${id}-point-label`} value={selectedPoint.label || ''} maxLength={24} placeholder="例如：听一听晚风" onChange={(event) => updatePoint({ label: event.target.value })} />
              </label>
              <label className="picture-editor__field" htmlFor={`${id}-point-action`}>
                <span>点按后发生什么</span>
                <select id={`${id}-point-action`} value={selectedPoint.action} disabled={isBuiltIn} aria-describedby={isBuiltIn ? `${id}-built-in-note` : undefined} onChange={(event) => updatePoint({ action: event.target.value })}>
                  {ACTIONS.map((action) => <option key={action.value} value={action.value}>{action.label}</option>)}
                </select>
              </label>
              {isBuiltIn && <p id={`${id}-built-in-note`} className="picture-editor__hint picture-editor__action-note">保留内置动作，名字和文字可以自由修改。</p>}
              <label className="picture-editor__field" htmlFor={`${id}-point-text`}>
                <span>这个点的文字</span>
                <textarea id={`${id}-point-text`} value={selectedPoint.text || ''} rows={4} maxLength={500} placeholder="写一句诗、一段话，或给这个声音的说明。" onChange={(event) => updatePoint({ text: event.target.value })} />
                <span className="picture-editor__field-end">{(selectedPoint.text || '').length} / 500</span>
              </label>
              <p className="picture-editor__hint">位置：{positionLabel(selectedPoint)}。</p><button type="button" className="picture-editor__small-button" onClick={()=>onPositionPoint?.(selectedPoint.id)}>在图上重新放置</button>
            </div>
          ) : <p className="picture-editor__hint picture-editor__selection-hint">选择上方的互动点，编辑它的名字和内容。</p>}
        </section>

        <section className="picture-editor__section" aria-labelledby={`${id}-audio-heading`}>
          <h3 id={`${id}-audio-heading`}>给画面一点声音</h3>
          <label className="picture-editor__music-toggle" htmlFor={`${id}-music`}>
            <span><MusicNote size={20} aria-hidden="true" /><span>背景配乐<small>让声音陪着画面展开</small></span></span>
            <input id={`${id}-music`} type="checkbox" checked={Boolean(project.music)} onChange={(event) => updateProject({ music: event.target.checked })} />
          </label>
          <div className="picture-editor__audio-file">
            <div className="picture-editor__asset-copy"><span>当前音频</span><strong title={project.audioName || '原创示例配乐'}>{project.audioName || '原创示例配乐'}</strong></div>
            <button type="button" className="picture-editor__small-button" onClick={() => audioInput.current?.click()} aria-label="上传配音或配乐文件">上传音频</button>
          </div>
          <input ref={audioInput} className="picture-editor__file-input" type="file" accept="audio/*,.mp3,.wav,.m4a,.aac,.ogg,.webm,.flac,.opus" aria-label="选择配音或配乐文件" onChange={(event) => chooseFile(event, onAudioUpload)} />
          <p className="picture-editor__hint">可以使用自己录好的配音，或一段喜欢的配乐。</p>
        </section>
      </div>

      <footer className="picture-editor__footer">
        <button type="button" className="picture-editor__reset" onClick={onReset}><ArrowCounterClockwise size={17} aria-hidden="true" />恢复示例</button>
        <button type="button" className="picture-editor__done" onClick={onClose}>回到画面<ArrowRight size={18} aria-hidden="true" /></button>
      </footer>
    </aside>
  );
}

export default PictureEditor;
