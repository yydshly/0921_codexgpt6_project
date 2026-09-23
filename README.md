# 0921_codexgpt6_project · 月下造境

围绕中秋营销与个人表达展开的一组产品研究、生成样片和可运行原型。项目从家庭短片、三种视觉画布、双人来信、互动热点图，逐步收敛到**可以编排图片、文字、声音与动作顺序的互动故事创作台**。

这里保留每一版产物及其被修正的原因。当前继续开发的方向是互动故事创作台；旧样例是可查看的实验，不应当作用户已经认可的最终产品。功能可用、视觉验收通过，也不等于已经证明情绪感染力或营销转化价值。

## 项目入口与发布状态

| 项目 | 地址或状态 |
| --- | --- |
| 目标公开仓库 | [yydshly/0921_codexgpt6_project](https://github.com/yydshly/0921_codexgpt6_project)；提交与推送状态由本轮集成确认。 |
| 在线体验 | **待部署**。预期 GitHub Pages 地址：[0921_codexgpt6_project](https://yydshly.github.io/0921_codexgpt6_project/)。 |
| 统一入口 | `/#overview`，项目总览、产品理解与全部样例入口；本轮集成的默认页面。 |
| 当前主产品 | `/#story`，互动故事体验与编排。 |
| 部署方式 | GitHub Pages；构建和仓库存在均不代表网站已经发布成功。 |

[完整资产清单](docs/ASSET_CATALOG.md) · [部署与复现说明](docs/DEPLOYMENT.md)

先读 [产品理解与演进记录](docs/PRODUCT_UNDERSTANDING.md)，再看 [创作台使用说明](moon-studio/README.md) 与 [已确认的产品决策](moon-studio/AGENTS.md)。

## 全部产品与样例

下表的路由均相对于运行中的应用，在线部署后位于同一站点。源码目录中的 HTML 链接用于定位文件；在代码托管页面中查看文件不等于运行页面。

| 阶段 / 样例 | 如何查看 | 当前定位 |
| --- | --- | --- |
| 《这一家》家庭纸艺短片 | [成片 MP4](midautumn-film/output/这一家-中秋样片.mp4)、[完整交付包](midautumn-film/output/这一家-中秋样片交付包.zip)、[制作说明](midautumn-film/README.md)；统一总览提供影片入口。 | 约 51 秒的虚构家庭样片，验证美术、配音与叙事制作。 |
| 月光造境 | `/#sea`；[视觉参考](moon-studio/design/reference-sea.png)、[实现画面](moon-studio/design/sea-final.png)。 | 海面、月亮、倒影与诗句的可编辑视觉实验。 |
| 诗笺工坊 | `/#paper`；[视觉参考](moon-studio/design/reference-paper.png)、[实现画面](moon-studio/design/paper-final.png)。 | 纸张、桂花、诗句与留白的可编辑视觉实验。 |
| 声音成诗 | `/#sound`；[视觉参考](moon-studio/design/reference-sound.png)、[实现画面](moon-studio/design/sound-final.png)。 | 本地音频或主动录音驱动水纹的声音实验。 |
| 月光来信 | `/#letters`；[首页](moon-studio/design/letter-home-final.png)、[阅读](moon-studio/design/letter-reading.png)、[共同结果](moon-studio/design/letter-result-final.png)。 | 双人写信、续句与 JSON 往返实验；无云端送达。 |
| 互动图片 / 热点编辑 | `/#picture`；[画面](moon-studio/design/picture-desktop-final.png)、[纸船航行](moon-studio/design/picture-voyage.png)。 | 拖月亮、画航线、放置热点与预设回应的实验。 |
| 给团圆留一盏灯 | `/#story` 的团圆样片；[独立 HTML](moon-studio/public/story-examples/reunion.html)、[可编辑作品](moon-studio/public/story-examples/reunion.moonstory.json)。 | 推窗 → 月光照旧照 → 旧时与今天相遇；当前主产品样片。 |
| 桂下藏诗 | `/#story` 中切换样片；[独立 HTML](moon-studio/public/story-examples/poetry.html)、[可编辑作品](moon-studio/public/story-examples/poetry.moonstory.json)。 | 轻触诗笺 → 划过古诗 → 拖月亮补全句子；与团圆样片共用引擎。 |

“桂下藏诗”是样片选项名，初始作品标题为“给月亮留半句诗”。两份故事的 `.moonstory.json` 在创作台中导入后可继续修改；独立 HTML 内嵌媒体和播放器，用于直接体验，不是编辑器。

### 影片、图片、声音与过程样例

- 影片交付：[竖版分享封面](midautumn-film/output/分享封面.png)、[横版封面](midautumn-film/output/cover-landscape.jpg)、[关键帧总览](midautumn-film/output/contact-sheet.jpg)、[字幕](midautumn-film/output/captions.srt)、[合成旁白](midautumn-film/output/合成旁白.mp3)、[原创配乐](midautumn-film/output/原创氛围配乐.wav)、[交付说明](midautumn-film/output/交付说明.md)。八张关键帧在 [output/previews](midautumn-film/output/previews/)。
- 影片源素材：[assets](midautumn-film/assets/) 中的 `envelope`、`father`、`child`、`mother`、`family`、`stilllife` 六张插画，以及 [assets/audio](midautumn-film/assets/audio/) 中的旁白、配乐和句级时间戳。对应 [图像提示词](midautumn-film/image-prompts.md)、[剧本](midautumn-film/script.json)、[停顿配置](midautumn-film/pauses.json)。
- 网页图像与声音：[public/assets](moon-studio/public/assets/) 包含月夜海面、纸笺、水池、透明月亮、透明纸船、同机位开关窗、虚构家庭照片及示例音乐；来源见 [asset-provenance.md](moon-studio/design/asset-provenance.md)。
- 设计与验收图：[design](moon-studio/design/) 保留三风格参考、各轮桌面 / 手机截图、对照板和测试用媒体。按 `sea-*`、`paper-*`、`sound-*`、`letter-*`、`picture-*`、`story-*` 索引各阶段；`*-first` 和未标 `final` 的早期图可能包含已修复问题。
- 数据往返样例：[旧画布作品](moon-studio/design/roundtrip-fixture.moon.json)、[热点图导出](moon-studio/design/picture-test-export.json)、[音频持久化测试音](moon-studio/design/test-chime.wav)。这些是测试夹具，不是另外三款产品。

## 当前创作台实际具备什么

- 图片、文字与触发区域图层；编辑图片和文案、拖放布局、调整大小、角度、透明度、层次及开场可见状态。面板可新增图片 / 文字，`zone` 可在作品 JSON 中定义。
- `click`、`swipe`、`drop` 触发，`requires` 前置规则，以及显示、隐藏、移动、改字、音频、停止音频、系统朗读和结尾动作。每个动作的延时相对本条规则的触发时刻计算。
- 每个音频回应可独立配置文件。所需图片、音频与规则一起保存到当前浏览器的 IndexedDB，也能导出为可编辑 JSON 或内嵌媒体的单 HTML；独立预览与导出共用播放器。
- 本地保存目前是一份作品快照；没有账号、云端协作、自动发送、自动识图或任意自然语言生成新交互。系统朗读依赖接收设备，不会生成一份可打包的人声文件。
- story 文件边界：完整 JSON 40 MB、单张内嵌图片 8 MB、单段音频 12 MB；上传图片最长边处理到不超过 2048 px。历史原型采用各自的格式和限制，不能混用。

更完整的操作与边界以 [moon-studio/README.md](moon-studio/README.md) 开头的 story 章节为准。文末保留的旧说明不会覆盖新版能力。

## 目录与代码入口

| 位置 | 接手时的用途 |
| --- | --- |
| [docs/PRODUCT_UNDERSTANDING.md](docs/PRODUCT_UNDERSTANDING.md) | 用户目标、五轮理解变化、否决点、实现与价值验证边界。 |
| [中秋产品高级感能力分析.md](中秋产品高级感能力分析.md) | 初期能力研究、制作方法与验收建议；是当时的分析，不是功能清单。 |
| [中秋共创产品方向.md](中秋共创产品方向.md) | 从固定影片转向文化创作的早期提案；保留历史状态。 |
| [moon-studio/src/ExperienceRoot.jsx](moon-studio/src/ExperienceRoot.jsx) | 总览、故事及历史原型的路由分发。 |
| [moon-studio/src/StoryApp.jsx](moon-studio/src/StoryApp.jsx) | 当前故事体验和编辑界面。 |
| [storyModel.js](moon-studio/src/storyModel.js)、[storyPlayer.js](moon-studio/src/storyPlayer.js)、[storyExport.js](moon-studio/src/storyExport.js) | 数据模型 / 校验 / 存储、通用运行时、独立 HTML 导出。 |
| [PictureApp.jsx](moon-studio/src/PictureApp.jsx)、[PictureEditor.jsx](moon-studio/src/PictureEditor.jsx)、[pictureModel.js](moon-studio/src/pictureModel.js) | 上一版热点图原型。 |
| [LetterApp.jsx](moon-studio/src/LetterApp.jsx)、[letterStore.js](moon-studio/src/letterStore.js)、[LetterArtifact.jsx](moon-studio/src/LetterArtifact.jsx)、[letterContent.js](moon-studio/src/letterContent.js) | 来信流程、文件往返、共同作品和文化文本。 |
| [App.jsx](moon-studio/src/App.jsx)、[WaterScene.jsx](moon-studio/src/WaterScene.jsx)、[useStudioAudio.js](moon-studio/src/useStudioAudio.js)、[projectStore.js](moon-studio/src/projectStore.js) | 三种早期画布、WebGL 水面、音源 / 录音与作品库。 |
| [moon-studio/scripts](moon-studio/scripts/)、[worker](moon-studio/worker/)、[tests](moon-studio/tests/) | 样例打包、构建 / 托管适配、自动检查。 |
| [midautumn-film/src](midautumn-film/src/) | 影片画面渲染、程序配乐、混音、配音制作与验证。 |

## 本地运行与复现

网页项目使用 React、Vite、Three.js。已具备 Node.js 与 npm 时，在仓库根目录执行：

```powershell
npm run setup
npm run dev
```

本机访问 `http://127.0.0.1:4187/#overview`；主创作台为 `/#story`。其他设备不能用自己的 `127.0.0.1` 访问这台电脑。

在仓库根目录构建、检查和重新生成完整故事样例：

```powershell
npm run examples
npm run build
npm test
```

样例生成脚本重写 `public/story-examples` 中两份 HTML 和两份 JSON，并校验内嵌媒体与播放器代码。修改播放器后需要重新生成样例，不能只改源码就宣称旧独立文件已经更新。

影片已有成片可直接查看。重新渲染需要 Python、Pillow、NumPy、FFmpeg、ffprobe 和对应中文字体，命令及本机依赖见 [影片 README](midautumn-film/README.md)。使用现有素材重新渲染不请求图像或付费语音服务；重新制作旁白是独立流程，需要显式提供当前剧本、声线与调用配置。

## 验证证据与下一步

- [当前互动短篇验收](moon-studio/design-qa.md)：记录 2026-09-22 的本机交互、媒体恢复、独立文件和视觉检查；两项已发现的手机裁切 / 预览标题问题已复核关闭。
- 历史验收：[三风格](moon-studio/design/studio-design-qa.md)、[来信](moon-studio/design/letter-design-qa.md)、[热点图](moon-studio/design/picture-design-qa.md)。
- [影片验证结果](midautumn-film/output/qa-report.json)：记录全文件解码、音画 / 字幕对齐及关键帧检查，不代表真人情绪评价或所有设备兼容性。

本轮远端仓库与 GitHub Pages 的结果需由实际推送、部署及线上访问确认后更新。已有本机验收不能替代这一步。

接下来的产品问题是：参与者是否愿意主动完成、创作者能否改出真正不同的个人表达，以及是否愿意分享给真实的人。品牌、商品入口、活动分析、在线协作、改编关系链和互动转视频仍是后续方向；尚无证据可承诺营销效果。

## 素材与仓库边界

人物、家庭照片与故事均为虚构示范；影片旁白为合成语音，示例配乐为程序合成音乐。不要将其介绍为真实家庭经历或亲人原声。字体和素材来源分别见 [字体许可](moon-studio/public/assets/FONT-LICENSE.txt)、[网页素材记录](moon-studio/design/asset-provenance.md) 与 [影片说明](midautumn-film/README.md)。

初期分析中引用的其他磁盘研究目录不包含在本仓库中，也不是启动本项目的依赖。文档列出研究参考，不代表那些外部项目已经被集成或获得本项目的复用许可。
