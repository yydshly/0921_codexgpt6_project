# 产品理解与演进记录

更新：2026-09-23。范围为 `0921_codexgpt6_project` 中实际保留的研究、素材、影片、网页原型与交付文件。本文用于接手和继续开发，不把一次方向探索写成已经完成市场验证的产品。

统一总览入口为 `/#overview`，当前主产品为 `/#story`。在线状态：**待部署**；预期地址为 [GitHub Pages](https://yydshly.github.io/0921_codexgpt6_project/)。远端目标是 [yydshly/0921_codexgpt6_project](https://github.com/yydshly/0921_codexgpt6_project)，实际推送与上线结果由本轮集成确认。

## 1. 起点：用户要的是可以用于中秋营销的产品

最初需求是“中秋快到了，我想制作一个高级感的产品，为了中秋做营销和推广”。这句话没有预先限定网页、影片、贺卡或礼盒。后续反馈逐步明确，光有好看的画面、配乐或完整表单，不足以满足产品意图。

到当前阶段，理解可以归纳为：

1. 作品要先给参与者一个想动手的理由，并让动作真正改变后续内容。
2. 创作者要能带入自己的照片、文字、声音和记忆，还能改变内容出现的关系与顺序。
3. 中秋文化与古诗要成为表达的起点，避免仅作节日装饰；原文、出处和原创内容应能区分。
4. “高级感”来自构图、字体、材质、声音、动作节奏及交付可靠性的共同作用，不能由特效数量替代。
5. 作品必须能够完整保存、继续修改和交到别人手里。文件交付、在线发布、多人互动是不同能力。

营销仍是最初目的，但当前未确定真实品牌、商品、受众和渠道；也没有真实传播或转化数据。不能从“样片已经能玩”直接跳到“已经可以带来营销效果”。

## 2. 五轮演进：每一轮理解了什么，又缺少什么

### 第一轮：家庭纸艺短片《这一家》

**当时的理解**：用家庭日常、精修插画、自然声音和克制镜头形成有温度的中秋内容。项目先梳理既有设计、动效、声音和视频研究，再制作一部可控成片。

**留下的产物**：约 50.708 秒、1920×1080、24 fps 的 MP4；六张统一风格插画、竖版分享封面、横版封面、合成旁白、原创程序配乐、字幕、时间轴与完整交付包。

**理解的修正**：后续需求转向中秋文化与用户创作，固定影片不再作为主要产品交付。这里没有证据表明用户否定了影片的每一项视觉质量；被修正的是把一条片子当作完整产品的范围。

**仍然有价值的积累**：一致的美术、声音和字幕时间轴、可重复渲染、局部修改、封面与成片的交付方法。影片保留为传播衍生产物的探索，不视为已经接通“任意家庭资料自动成片”的服务。

证据：[能力分析](../中秋产品高级感能力分析.md)、[共创方向提案](../中秋共创产品方向.md)、[影片 README](../midautumn-film/README.md)。

### 第二轮：三种可编辑视觉画布

**当时的理解**：让用户在月光海面、纸笺、声音水池三个方向中进行个人表达。用户已选择保留三种风格，因此后续迭代不应反复要求重选美术方向。

**留下的产物**：`/#sea` 的月光造境、`/#paper` 的诗笺工坊、`/#sound` 的声音成诗。包括拖动月亮 / 诗句、预设回应、真实音频分析、主动录音、本地作品库与 `.moon.json` 导入导出。

**用户否决点**：图片加音乐或局部视觉效果没有构成足够明确、有意义的参与和创作过程。三个风格应是表达选择，而不是顶层产品目的。

**理解的变化**：从“作品看起来如何”转向“谁发起、谁参与、参与前后到底发生什么变化”。三种画布保留为研究和美术基础。

证据：[三风格验收](../moon-studio/design/studio-design-qa.md)、[三风格预览](../moon-studio/design/three-styles-preview.jpg)、[决策记录](../moon-studio/AGENTS.md)。

### 第三轮：月光来信与双人续写

**当时的理解**：给作品增加发起、记忆、原创上句、邀请、续写和共同收藏，尝试用真实的人与人的回应形成产品过程。古诗提供引子，个人文字承担内容。

**留下的产物**：`/#letters` 的写信、开信、阅读、回复与共同作品流程；邀请 / 回信 JSON、编号匹配、防覆盖、本地信箱、双方署名与三种成品风格。示例人物与故事有演示标识，回复必须由体验者实际填写。

**用户否决点**：用户再次明确表示“还是没意思啊，带动不了情绪，就是图片和声音啊”。一个能完成的表单与回信过程，没有自动解决情绪转折和参与欲望的问题。

**理解的变化**：应当先证明短体验中的期待、控制和转折，再要求用户提交个人文字。不能把表单完整、视觉检查通过或双方署名出现当作价值验证。此前的“来信优先”不再是最终认可的方向。

证据：[来信验收](../moon-studio/design/letter-design-qa.md)、[来信流程截图](../moon-studio/design/)、[最新反馈记录](../moon-studio/AGENTS.md)。

### 第四轮：可探索图片与热点编辑

**当时的理解**：用户提出图片交互，可以结合声音、音乐与古诗。先让人触摸画面中的物件，再扩展自己的表达，避免一开始就填写长表单。

**留下的产物**：`/#picture` 中拖动月亮改变倒影、触碰水面出现诗句、修改纸船寄语、手绘航线让纸船前进；可以换图片、手动放置热点和修改预设动作，并保存 / 导出 `.picture.json`。

**用户否决点**：图片加几个可配置点击回应仍然太受限，产品价值不够。固定月亮和纸船效果的持续增加，不等于创作者获得了新的表达空间。

**理解的变化**：需要解释用户最终能做出怎样的完整作品，以及如何改变作品结构。应从固定热点扩展到通用图层、事件、前置条件和动作；素材保存必须完整。自动识图只是潜在制作辅助，不是用户已经确认的必需能力。

证据：[热点图验收](../moon-studio/design/picture-design-qa.md)、[画面样例](../moon-studio/design/picture-desktop-final.png)、[航线样例](../moon-studio/design/picture-voyage.png)、[反馈记录](../moon-studio/AGENTS.md)。

### 第五轮：互动故事创作台

**当前获得继续实施的范围**：用户对完整短篇与开放编排方向回复“继续”。实现《给团圆留一盏灯》和第二个诗词样例，二者使用同一套机制；同时补齐图片、音频、规则的保存和独立交付。

**留下的产物**：`/#story` 的体验和编辑；团圆 / 诗词两模板；可新增图层和规则的通用播放器；完整 IndexedDB 保存、`.moonstory.json` 导入导出、单 HTML 导出和独立文件预览。

**关键区别**：创作者可以把“划窗后出现月亮”改成别的对象、事件和回应，增加自己的段落，绑定独立声音，而不仅换名字或选择一个预设特效。观看者通过实际动作让内容进入下一状态。

**还没有被证明的部分**：这仍是当前获准继续的实现方向，不是用户已经验证的最终商业产品。动作可以触发内容，不能因此认定动作本身足够动人；两份可改编样例，也不能证明普通创作者无需帮助就能做出好的故事。

证据：[主产品说明](../moon-studio/README.md)、[当前验收](../moon-studio/design-qa.md)、[完整故事样例](../moon-studio/public/story-examples/)。

## 3. 当前产品结构与能力边界

### 可创作的内容

作品由 `assets`、`layers`、`rules`、`ending` 组成。图片与音频是独立素材；图片、文字和触发区域是图层；规则连接用户动作和场景回应。

| 部分 | 当前实现 | 边界 |
| --- | --- | --- |
| 图层 | `image`、`text`、`zone`；位置、宽高、旋转、透明度、层次、初始可见性。 | 面板直接新增图片 / 文字；自定义 `zone` 可在 JSON 中定义。 |
| 触发 | 点击 `click`、划动 `swipe`、拖放到目标 `drop`。 | 不是任意脚本或任意物理交互；当前规则在一次体验中只执行一次。 |
| 顺序 | `requires` 前置规则与循环依赖校验。 | 面板选择一个前置，JSON 可定义多个；不是完整的任意条件 / 分支编程系统。 |
| 回应 | `show`、`hide`、`move`、`text`、`audio`、`stopAudio`、`narrate`、`finish`。 | 新类型效果仍需开发；已有预设不代表自动理解新图片内容。 |
| 时间 | 每个动作有相对规则触发时刻的 `delay`。 | 不自动累加，也不自动等待上一段音频播放结束。 |
| 声音 | 不同回应可选择不同音频，调音量与循环；媒体完整保存。 | 系统朗读由接收设备提供，不会变成导出的合成语音文件。 |
| 保存 | 当前浏览器、当前站点地址的 IndexedDB 完整快照。 | 目前一份保存记录；不是云端账号作品库，不保存观众播放进度。 |
| 改编 | 导入完整 `.moonstory.json` 后继续编辑。 | 旧版本作品格式不能直接混用；尚无在线派生关系链。 |
| 播放交付 | 单 HTML 内嵌媒体、样式和同一播放器；应用内可运行打包预览。 | 接收环境须支持网页脚本；文件交付与公开链接是两步。 |

编辑修改会清理不再被图层或规则引用的素材，避免被替换的照片和声音继续出现在作品包中。完整 JSON 上限 40 MB，单张内嵌图片上限 8 MB，单段音频上限 12 MB；图片输入最长边处理到不超过 2048 px。详细格式与限制以当前 [模型实现](../moon-studio/src/storyModel.js) 和 [应用 README](../moon-studio/README.md) 为准。

### 两份当前样例

- **给团圆留一盏灯**：推开窗，让月光出现；把月光拖到旧照片，出现今天的家与诗句；把旧照拖向今天，进入结尾。默认照片与回忆是虚构示范，创作者可替换。
- **桂下藏诗**：轻触诗笺，展示古诗；划过古诗，显现原创上句与留白；把月亮拖到留白，改写下句并完成。样例标题为“给月亮留半句诗”，不是第三份独立产品。

两个样例共用模型和播放器，是通用性最小演示。它们不意味着任何自然语言想法都能自动生成，也不意味着已经实现多人共同创作的在线后端。

## 4. 营销价值：目前是假设，需要怎样验证

可以检验的产品假设是：品牌提出一个有文化依据的中秋创作主题，用户用自己的生活内容改编一段短体验，再交给想念的人；参与和改编的内容成为品牌活动的一部分。品牌露出、商品入口和活动规则应围绕真实品牌与受众另行设计。

当前尚未接通品牌活动后台、购买链路、数据分析、账号、云端作品库、在线回复或社交平台自动发布。因此本项目的功能证据与商业证据应分别记录：

| 要验证的问题 | 可以观察的行为 | 不应拿来替代的指标 |
| --- | --- | --- |
| 是否产生参与欲望 | 不了解项目的人是否愿意做第一个动作，并继续探索。 | 页面停留、画面漂亮或按钮能点。 |
| 是否形成情绪变化 | 体验者能否说出某个具体时刻的感受及原因。 | 强行写“感动”、播放抒情配乐或自动念一句话。 |
| 是否有个人表达空间 | 换一组人的素材后，内容与动作关系是否发生有意义的变化。 | 只换名字、头像或统一结尾。 |
| 是否容易创作 | 创作者能否独立改出一份可完成的故事，并修正自己的错误。 | 开发者在熟悉系统的情况下成功编辑。 |
| 是否值得分享 | 是否主动把真实作品交给具体的人，接收者是否体验。 | 下载按钮被点击、开发者转发测试文件。 |
| 是否服务营销 | 真实活动中的参与、分享、回流和业务目标变化。 | 代码通过测试、增加模板数量或部署成功。 |

下一步宜先验证一个具体受众、一个表达任务和一个真实传播场景，再决定扩展哪种能力。在线发布、文化资料库、品牌内容配置、改编关系、协作、自然语言辅助和互动转视频都可以讨论，但未被本次已有实现自动包含。

## 5. 接手时应保持的原则

1. **先看体验，再加表单。** 首先让参与者理解自己为何要操作，避免要求大量输入后才看到内容。
2. **解释动作改变了什么。** 如果去掉动作依然只是同样的图片与朗读，需要重新审视它是否值得存在。
3. **维护可替换与完整交付。** 自选媒体必须跟着作品走，编辑与导出的播放器能力保持一致。
4. **保持文化与个人内容的来源。** 古诗的原文、作者、背景与原创续写分开；神话改编不能包装成节日起源定论。
5. **不替用户编造关系。** 虚构样片有明确标识，亲人回应由真实的人提交，不伪装多人在线或自动送达。
6. **不把效果成熟误写成产品被认可。** 历史原型和否决反馈都应保留，让后来者知道为何发生变化。
7. **不因有过研究就声称已经集成。** GSAP、Remotion、Voice Lab、VoxCPM 等在初期分析中是候选或历史经验，当前网页和影片的实际依赖以代码为准。

## 6. 完整样例与资料索引

### A. 可运行网页与独立作品

| 入口 / 文件 | 对应内容 |
| --- | --- |
| `/#overview` | 本轮集成的统一总览、产品说明与各阶段样例入口。 |
| `/#story` | 当前互动故事创作台。 |
| [reunion.html](../moon-studio/public/story-examples/reunion.html)、[reunion.moonstory.json](../moon-studio/public/story-examples/reunion.moonstory.json) | 团圆样片的完整播放器与可编辑作品。 |
| [poetry.html](../moon-studio/public/story-examples/poetry.html)、[poetry.moonstory.json](../moon-studio/public/story-examples/poetry.moonstory.json) | 诗词样片的完整播放器与可编辑作品。 |
| `/#picture` | 热点编辑、月亮、水面、纸船与手绘航线。 |
| `/#letters` | 写信、邀请、续写与合并回信。 |
| `/#sea`、`/#paper`、`/#sound` | 月光造境、诗笺工坊、声音成诗。 |

### B. 影片交付与源素材

| 目录 / 文件 | 内容 |
| --- | --- |
| [完整影片](../midautumn-film/output/这一家-中秋样片.mp4)、[交付包 ZIP](../midautumn-film/output/这一家-中秋样片交付包.zip) | 含字幕、合成旁白和原创配乐的成片及打包交付。 |
| [竖版封面](../midautumn-film/output/分享封面.png)、[横版封面](../midautumn-film/output/cover-landscape.jpg)、[关键帧总览](../midautumn-film/output/contact-sheet.jpg) | 分享包装与画面检查。 |
| [关键帧目录](../midautumn-film/output/previews/) | `frame-01` 至 `frame-08` 的八个时间点截图。 |
| [合成旁白](../midautumn-film/output/合成旁白.mp3)、[配乐](../midautumn-film/output/原创氛围配乐.wav)、[字幕](../midautumn-film/output/captions.srt) | 可独立查看的声音与字幕产物。 |
| [影片图像目录](../midautumn-film/assets/) | 六张源插画：`envelope.png`、`father.png`、`child.png`、`mother.png`、`family.png`、`stilllife.png`。 |
| [影片声音目录](../midautumn-film/assets/audio/) | 原旁白、程序配乐、文本、语音请求参数、语音元数据、服务返回的句级时间戳。 |
| [output](../midautumn-film/output/) | 另保留无声中间片、最终混音、渲染 / 混音清单与日志；属于制作记录。 |

### C. 网页素材、设计图与过程样例

| 位置 / 命名 | 内容 |
| --- | --- |
| [public/assets](../moon-studio/public/assets/) | `moon-sea.png`、`paper-scene.png`、`sound-pool.png` 三场景；`moon.png` 与 `moon-paper-boat.png` 透明对象；`story-room-open.png` / `story-room-closed.png` 同机位场景；`story-memory.png` 虚构家庭照；`demo-music.mp3` 示例音乐；字体与许可。 |
| [design/reference-sea.png](../moon-studio/design/reference-sea.png)、[reference-paper.png](../moon-studio/design/reference-paper.png)、[reference-sound.png](../moon-studio/design/reference-sound.png) | 三种已选视觉参考；[three-styles-preview.jpg](../moon-studio/design/three-styles-preview.jpg) 为总览。 |
| [design](../moon-studio/design/) 中 `sea-*`、`paper-*`、`sound-*` | 初版、终版、手机截图、局部与多轮对照板。 |
| 同目录 `letter-*` | 首页、写信、邀请、开信、阅读、回复前后、三风格共同结果与手机截图。 |
| 同目录 `picture-*` | 热点图桌面、手机、编辑、上传图、航行、抵达与对照板。 |
| 同目录 `story-*` | 开窗、回忆、诗词、编辑、手机、独立播放、最终修复截图及参考对照板。 |
| [roundtrip-fixture.moon.json](../moon-studio/design/roundtrip-fixture.moon.json)、[picture-test-export.json](../moon-studio/design/picture-test-export.json)、[test-chime.wav](../moon-studio/design/test-chime.wav) | 旧画布 / 热点图数据往返夹具与 0.45 秒程序测试音，不是人声。 |

图片是素材和截图，不是整页实现。真实网页中的文字、交互区域、月亮、照片覆盖层及状态变化由应用绘制和编排。

### D. 文档与验收

| 文档 | 阅读目的 |
| --- | --- |
| [根 README](../README.md) | 项目导航、样例入口、运行与发布状态。 |
| [中秋产品高级感能力分析](../中秋产品高级感能力分析.md) | 初期研究与制作判断；其中的外部磁盘路径不随仓库分发。 |
| [中秋共创产品方向](../中秋共创产品方向.md) | 转向用户创作与中秋文化时的提案，保留原来的“尚未实现”语境。 |
| [moon-studio/README](../moon-studio/README.md) | 当前能力与历史使用说明；开头是 story，后文旧限制按阶段阅读。 |
| [moon-studio/AGENTS](../moon-studio/AGENTS.md) | 用户持续纠正与最后授权方向，是后续实施的重要约束。 |
| [当前 design-qa](../moon-studio/design-qa.md) | 2026-09-22 本机范围的交互、媒体保存、独立导出和视觉验收。 |
| [studio-design-qa](../moon-studio/design/studio-design-qa.md)、[letter-design-qa](../moon-studio/design/letter-design-qa.md)、[picture-design-qa](../moon-studio/design/picture-design-qa.md) | 三风格、来信、热点图的历史验收，不能互相替代。 |
| [asset-provenance](../moon-studio/design/asset-provenance.md) | 网页素材来源、真实生成提示词、纸船透明通道和场景用途。 |
| [影片 README](../midautumn-film/README.md)、[图像提示词](../midautumn-film/image-prompts.md)、[交付说明](../midautumn-film/output/交付说明.md) | 影片制作、素材与交付边界。 |
| [影片 qa-report](../midautumn-film/output/qa-report.json) | 文件解码、格式、音画和字幕对齐结果；非主观情绪或商业研究。 |

### E. 代码入口

| 模块 | 主要文件 |
| --- | --- |
| 应用路由 | [main.jsx](../moon-studio/src/main.jsx)、[ExperienceRoot.jsx](../moon-studio/src/ExperienceRoot.jsx)。 |
| 当前故事界面 | [StoryApp.jsx](../moon-studio/src/StoryApp.jsx)、[story.css](../moon-studio/src/story.css)。 |
| 故事数据与交付 | [storyModel.js](../moon-studio/src/storyModel.js)、[storyPlayer.js](../moon-studio/src/storyPlayer.js)、[story-player.css](../moon-studio/src/story-player.css)、[storyExport.js](../moon-studio/src/storyExport.js)。 |
| 故事样例打包 | [create-story-examples.mjs](../moon-studio/scripts/create-story-examples.mjs)。修改运行时后重新生成 HTML 与 JSON。 |
| 热点图 | [PictureApp.jsx](../moon-studio/src/PictureApp.jsx)、[PictureEditor.jsx](../moon-studio/src/PictureEditor.jsx)、[pictureModel.js](../moon-studio/src/pictureModel.js) 及对应样式。 |
| 来信 | [LetterApp.jsx](../moon-studio/src/LetterApp.jsx)、[LetterArtifact.jsx](../moon-studio/src/LetterArtifact.jsx)、[letterStore.js](../moon-studio/src/letterStore.js)、[letterContent.js](../moon-studio/src/letterContent.js) 及对应样式。 |
| 三画布 | [App.jsx](../moon-studio/src/App.jsx)、[WaterScene.jsx](../moon-studio/src/WaterScene.jsx)、[useStudioAudio.js](../moon-studio/src/useStudioAudio.js)、[projectStore.js](../moon-studio/src/projectStore.js)。 |
| 构建与测试 | [package.json](../moon-studio/package.json)、[vite.config.mjs](../moon-studio/vite.config.mjs)、[prepare-sites-build.mjs](../moon-studio/scripts/prepare-sites-build.mjs)、[worker/index.js](../moon-studio/worker/index.js)、[tests](../moon-studio/tests/)。保留的 Sites 构建适配不等于此次已通过 Sites 发布。 |
| 影片 | [render_film.py](../midautumn-film/src/render_film.py)、[make_music.py](../midautumn-film/src/make_music.py)、[mix_film.py](../midautumn-film/src/mix_film.py)、[verify_film.py](../midautumn-film/src/verify_film.py)、[synthesize.py](../midautumn-film/src/synthesize.py)。 |

影片配音脚本来自既有研究的通用实现，重新合成必须显式传入当前 [script.json](../midautumn-film/script.json)、声线和调用配置，不能假定脚本默认示例就是本影片。项目已有源音频，正常重渲染不需要重新调用服务。

## 7. 交接时怎样判断“完成”

- **实现完成**：指定流程、保存、导入、编辑和独立文件确实可运行，并有相应代码 / 浏览器 / 文件证据。
- **发布完成**：代码已在指定远端，部署作业成功，实际线上页面与资源可访问；不能只凭预期 URL 或本地构建判断。
- **体验被认可**：目标参与者能够理解并愿意继续体验，创作者能完成自己的表达，需要真实反馈。
- **营销有效**：在已确定品牌、活动、受众与渠道中观察到相应结果，需要实际业务证据。

这四项应独立报告。保留完整样例与历史反馈，是为了更快找到下一次真正需要验证的问题，而不是把每一轮原型都描述成已经获得认可的最终答案。
