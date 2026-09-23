# 资产与可发布样例索引

盘点日期：2026-09-23。以下是本地文件快照，大小以字节为准；MiB 按 1,048,576 字节计算。当前产品为 `moon-studio` 中的互动短篇编辑与播放体验；`midautumn-film` 是早期纸艺影片研究产物。历史实验不代表已经验证的产品价值。

本索引只说明来源、用途和仓库整理建议，不代表已经完成远端发布，也不改动 Git 配置。默认故事使用虚构演示人物与记忆，没有将测试者上传的个人素材放进发布样例。维护者已确定本次公开仓库同时保留各阶段样例、最终影片/音轨/交付包及文档与图像证据；下文排除清单遵循这一范围。

## 建议提交的应用基础

保留 `moon-studio/src/`、`tests/`、`scripts/`、`worker/`、`index.html`、`vite.config.mjs`、`package.json`、`package-lock.json`、`README.md`、`AGENTS.md`、`design-qa.md` 及 `.openai/hosting.json`。其中后者是 Sites 构建结构配置，不是账号凭据。`.npmrc` 当前仅设置 `fund` 和 `audit`，未发现鉴权字段。

保留本索引、根目录两份产品研究文档，以及 `moon-studio/design/asset-provenance.md` 和其余设计 QA Markdown。它们记录了方向变化、素材与测试边界。若公开旧流程说明，请保留 README 对当前入口与历史实验的明确区分。

## 运行时素材：全部保留

以下 12 个文件合计 **15,831,573 字节（15.10 MiB）**。它们是运行时依赖，不应因为是生成图片而被统一忽略。表中路径均从仓库根目录起算。

| 路径 | 字节 / 像素 | 用途与来源 |
| --- | --- | --- |
| `moon-studio/public/assets/story-room-closed.png` | 1,830,307 / 1536×1024 | 《给团圆留一盏灯》关窗初始层，Image Gen 编辑结果。 |
| `moon-studio/public/assets/story-room-open.png` | 2,007,735 / 1536×1024 | 同一房间开窗底层，也作为“今天”照片素材。 |
| `moon-studio/public/assets/story-memory.png` | 2,147,438 / 1448×1086 | 明确标示的虚构母子旧照片，非用户家庭照片。 |
| `moon-studio/public/assets/moon.png` | 1,616,997 / 1254×1254 | 带透明通道的月亮独立图层。 |
| `moon-studio/public/assets/paper-scene.png` | 2,316,682 / 1448×1086 | 桂下藏诗及纸笺实验的场景背景。 |
| `moon-studio/public/assets/moon-sea.png` | 1,831,520 / 1341×1173 | 早期海面创作台、互动图片及来信背景。 |
| `moon-studio/public/assets/sound-pool.png` | 1,578,752 / 1915×821 | 水岸声音场景背景；声音响应由程序绘制。 |
| `moon-studio/public/assets/moon-paper-boat.png` | 1,523,516 / 1536×1024 | 透明纸船精灵，互动图片中沿手绘路径航行。 |
| `moon-studio/public/assets/demo-music.mp3` | 817,301 | 约 51 秒原创程序合成配乐；非人声、非用户录音。 |
| `moon-studio/public/assets/serif.woff2` | 88,300 | Noto Serif SC 界面字符子集，未包含的汉字使用系统后备字体。 |
| `moon-studio/public/assets/sans.woff2` | 68,724 | Noto Sans SC 界面字符子集。 |
| `moon-studio/public/assets/FONT-LICENSE.txt` | 4,301 | 随字体保留的 SIL Open Font License 1.1 文本。 |

图片来源、生成文件映射、纸船和互动短篇三个素材的实际提示词见 [`moon-studio/design/asset-provenance.md`](../moon-studio/design/asset-provenance.md)。该文档对早期四张场景素材使用的是“制作规格归纳”，不是逐字提示词，不应把它转述成原始调用记录。`D:/codex/home/generated_images/...` 是追溯用本机位置，不是应用依赖，也无需把整个生成缓存复制进仓库。

配乐创作逻辑位于 `midautumn-film/src/make_music.py`。字体原项目与字体许可入口记录在素材来源文档中；不能因清理工具依赖而删除 `FONT-LICENSE.txt`。

## 可直接发布或交付的互动样例

四个文件合计 **33,015,777 字节（31.49 MiB）**。HTML 和 JSON 各自内嵌相同媒体，因此存在有意的体积重复。建议保留为仓库的默认可体验样例；若改为发布附件，则仍须保留生成脚本与运行时源素材，并更新文档中的下载位置。

| 路径 | 字节 | 意义 |
| --- | --- | --- |
| `moon-studio/public/story-examples/reunion.html` | 11,260,188 | 《给团圆留一盏灯》独立可播放网页，划开窗、照亮旧照片、合并两张照片。 |
| `moon-studio/public/story-examples/reunion.moonstory.json` | 11,229,820 | 同一作品的完整可编辑文件，可导入当前 story 编辑器。 |
| `moon-studio/public/story-examples/poetry.html` | 5,278,076 | 桂下藏诗独立可播放网页，初始作品题目“给月亮留半句诗”。 |
| `moon-studio/public/story-examples/poetry.moonstory.json` | 5,247,693 | 同一诗词作品的完整可编辑文件。 |

审计时核验：两份 JSON 分别包含 5 和 2 个媒体，全部为内嵌 data URI；将内嵌媒体解码后的 SHA-256 与 `public/assets` 比较，全部与预设源素材一致。它们不引用个人上传文件。生成脚本还检查 HTML 与 JSON 内容一致、脚本可解析、没有外部脚本/样式/媒体地址。系统朗读属于接收设备的语音能力，不是文件中内嵌的合成配音。

重建时，在 `moon-studio` 中先安装锁定依赖，再运行：

```text
node scripts/create-story-examples.mjs
```

脚本使用当前 `storyModel` 和 `storyExport`，会生成新的默认作品编号；只临时读取明确列出的本地预设素材，结束后恢复 fetch 并关闭 Vite。文件大小可能随播放器和文本变化，以上数值为本次盘点快照。

## 文档与验证材料

本次保留 `moon-studio/design/*.md` 和图像证据。仓库首页介绍当前产品时，优先使用以下当前 story 截图，避免把早期实验当作默认产品：

| 路径 | 用途 |
| --- | --- |
| `moon-studio/design/story-opening-desktop-final.png` | 当前默认桌面开场。 |
| `moon-studio/design/story-mobile-final.png` | 当前手机开场布局。 |
| `moon-studio/design/story-editor-desktop.png` | 桌面图层与规则编辑。 |
| `moon-studio/design/story-editor-mobile.png` | 手机编辑界面。 |
| `moon-studio/design/story-poetry-desktop.png` | 第二模板结构。 |
| `moon-studio/design/story-portable-final.png` | 独立 HTML 实际播放效果。 |

`moon-studio/design/test-chime.wav` 是脚本生成的 **19,890 字节、0.45 秒、880 Hz 程序提示音**，用于音频上传/保存验证，不是人声。`roundtrip-fixture.moon.json` 和 `picture-test-export.json` 是旧实验的导入验证文件，不是当前 story 格式。它们及 first/second/detail/comparison 等截图属于验证材料，不是产品运行依赖。任何新增含私人文字或上传图片的 QA 截图都应另行检查后再选入公开文档。

## 早期影片：本次同时公开的归档样例

`midautumn-film` 描述已被后续交互产品探索取代的纸艺插画样片，不应冒充当前产品体验。保留 `README.md`、`image-prompts.md`、`script.json`、`pauses.json`、`src/*.py` 可追溯制作方式。

源素材 `assets/{family,father,child,mother,envelope,stilllife}.png` 均为 1536×1024 的生成纸艺插画；包括音频在内的 `assets/` 合计 **29,364,996 字节（28.00 MiB）**。本次保留完整影片可复现档案，包括源音频、旁白文字、时间戳及元数据。`assets/audio/music.wav` 单独占 14,688,590 字节，由程序可重建；旁白 `narration.mp3` 为 700,980 字节，由已完成的外部语音生成调用产生。

影片的明确可交付清单如下。本次为接入全部样例，同时保留独立文件和交付压缩包；两者有意重复，后续迭代应注意其对仓库历史体积的影响：

| 路径 | 字节 | 意义 |
| --- | --- | --- |
| `midautumn-film/output/这一家-中秋样片.mp4` | 32,073,866 | 约 51 秒、1920×1080、有旁白字幕和配乐的最终片。 |
| `midautumn-film/output/分享封面.png` | 2,424,392 | 竖版分享海报。 |
| `midautumn-film/output/cover-landscape.jpg` | 779,545 | 横版封面。 |
| `midautumn-film/output/captions.srt` | 901 | 最终影片字幕。 |
| `midautumn-film/output/contact-sheet.jpg` | 542,771 | 最终关键帧总览。 |
| `midautumn-film/output/合成旁白.mp3` | 700,980 | 已生成旁白的单独交付音轨。 |
| `midautumn-film/output/原创氛围配乐.wav` | 14,688,590 | 原创程序合成音乐的单独交付音轨。 |
| `midautumn-film/output/交付说明.md` | 1,391 | 虚构故事、合成旁白和交付内容说明。 |
| `midautumn-film/output/这一家-中秋样片交付包.zip` | 49,631,419 | 上述八项早期影片交付物的压缩包。 |

已实际读取 ZIP 目录：仅包含上表中除 ZIP 自身之外的八个文件，没有脚本、环境文件、账号配置或 provider 请求记录。包内小型文本只有 `captions.srt` 与 `交付说明.md`，凭据模式检查未命中。

`image-prompts.md` 保存统一美术合同、镜头规格及分享封面完整提示词，并明确说明电影逐次调用的原文在对话记录中。`assets/audio/tts-request.json`、`voice-metadata.json` 与 `provider-subtitles.json` 是语音请求参数/生成元数据/字幕时间戳，审计未发现凭据字段。重新调用 `src/synthesize.py` 需要外部环境文件，仓库内没有该凭据文件；普通重新渲染无需重新调用付费语音或图像服务。

## 排除建议与体积

以下目录是本地快照体积；保留和排除范围分别列出：

| 路径 | 文件数 | MiB | 整理建议 |
| --- | ---: | ---: | --- |
| `moon-studio/node_modules/` | 12,658 | 132.45 | 忽略，使用 package-lock 重建。 |
| `moon-studio/dist/` | 21 | 47.67 | 忽略，构建时生成；含运行时素材与样例的重复副本。 |
| `moon-studio/.font-tools/` | 714 | 9.96 | 忽略，本机临时 Python 字体加工工具及二进制。 |
| `moon-studio/design/` | 81 | 16.57 | 本次保留来源与 QA 文档、图像证据和测试小样。 |
| `midautumn-film/output/` | 24 | 144.09 | 保留最终交付文件与证据；排除下方两项音视频中间文件和日志。 |

特别应排除的影片中间文件：`output/silent.mp4`、`output/final-mix.wav`、`output/*.log`。`output/previews/` 属于本次保留的图像证据。`output/原创氛围配乐.wav` 和 `output/合成旁白.mp3` 分别重复源音乐与旁白，本次为独立交付有意保留。`moon-studio/public/showcase/` 如由接入脚本复制生成，应忽略，避免再次提交同一份历史产物。

可供根 `.gitignore` 采用的基础规则（本次审计未写入该文件）：

```gitignore
**/node_modules/
**/dist/
**/.vite/
**/.cache/
**/.font-tools/
**/.venv/
**/__pycache__/
**/*.py[cod]
**/*.log
**/.env
**/.env.*
!**/.env.example
!**/.env.sample
*.pem
*.key
*.p12
*.pfx
.DS_Store
Thumbs.db
/midautumn-film/output/silent.mp4
/midautumn-film/output/final-mix.wav
/moon-studio/public/showcase/
```

这些规则刻意保留 `public/assets/`、`public/story-examples/`、最终影片和音轨、交付 ZIP、设计与验证图像、锁文件和字体许可证。

## 凭据检查范围

对本仓库非依赖、非构建目录中的文件名及源代码、配置、文档和小型 JSON 进行了敏感文件名、私钥头、常见令牌格式、带凭据 URL 与明文鉴权赋值检查，没有发现命中。未输出任何秘密值。对语音元数据和 npm 配置另检查字段名；语音脚本只从调用者指定的外部环境文件读取密钥。

这是一轮本地模式检查，不是对全部二进制内容或未来新增文件的保证。`.gitignore` 只阻止后续默认加入未跟踪文件；发布前仍需复查实际暂存列表。仓库许可证与最终远端发布由维护者决定，本索引不擅自替项目添加授权。
