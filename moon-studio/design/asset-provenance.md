# 视觉与声音素材记录

2026-09-22，为「月下造境」三个可编辑场景制作。所有运行时素材均已复制到项目内，运行不依赖生成工具的缓存目录。

## 已选择的视觉方向

| 方向 | 参考图 | 生成结果 |
| --- | --- | --- |
| 月光造境 | reference-sea.png | exec-f98768d6-2057-45bb-83d7-9d71c1fcd7d4.png |
| 诗笺工坊 | reference-paper.png | exec-5b478c0e-5b47-4c86-8e6a-f77e7dcba7dc.png |
| 声音成诗 | reference-sound.png | exec-41c258ec-3500-4507-91f3-5ff345dddd0d.png |

参考图来自本次对话的内置图像生成工具，用户选择三个方向全部实现。

## 场景素材

以下为制作规格的归纳，不是原始工具提示词的逐字转录。

| 项目内素材 | 制作规格与用途 | 原生成结果 |
| --- | --- | --- |
| public/assets/moon-sea.png | 深蓝夜海、远山、低照度云层、近景岩石，保持文字负空间。背景不烘焙月亮、文字与月光路径，允许实际交互。 | exec-34482c9b-e725-494a-9558-12ad4f65ebf3.png |
| public/assets/paper-scene.png | 象牙宣纸、自然毛边、右上桂花、左下浅墨山水；留出排诗与寄语位置。 | exec-ae65b942-92be-4596-9e7c-f9be639b358d.png |
| public/assets/sound-pool.png | 横幅月夜水池、低调花枝、石岸和花瓣，水面作为真实声音的响应区域。 | exec-914496c5-5643-47c6-a11f-3add20cf64da.png |
| public/assets/moon.png | 单独满月，真实透明通道；DOM对象承载拖动和触发动作。 | exec-a6cdc4fa-623a-4db2-ae31-42c57545ff87.png |

图像由内置 Image Gen 制作。水面折射、月亮位置相关的反射和音频频谱由应用实时绘制，未将整张设计图作为页面。

## 声音、字体与图标

- demo-music.mp3：本项目先前制作的约51秒原创程序合成配乐；不是歌词朗读或TTS。当前创作台也支持本地导入与用户主动录音。
- serif.woff2 / sans.woff2：Noto Serif SC / Noto Sans SC 的界面文字子集，其他汉字使用系统后备字体。Noto 字体采用 SIL Open Font License；原项目为 https://github.com/notofonts/noto-cjk 。
- 界面图标：@phosphor-icons/react。未绘制近似品牌或自制图标。
- 古诗保留作者与原文标题，自创寄语明确为用户原创。引用资料入口在作品的「原文与出处」和「创作提示」中。

## 截图说明

*-final.png 为1440×1024原生浏览器画面；*-mobile.png 为390×844 CSS视口的移动布局记录。*-comparison-final.jpg 将参考图归一至相同大小后并排比较。早期 *-first.png 的截图后端存在缩放留白，因此早期比较做过内容区域归一；最终比较不使用这一处理。

## 交互纸船精灵（2026-09-22 追加）

- 生成工具：内置 `image_gen`，实际调用 `image_gen__imagegen`；未使用 CLI 或其他图像生成工具。
- 项目资产：`public/assets/moon-paper-boat.png`。
- 资产完整路径：`F:/codex_project/0921_codexgpt6_project/moon-studio/public/assets/moon-paper-boat.png`。
- 原始生成文件：`D:/codex/home/generated_images/01a0c837-af1a-72a0-8594-b5e57fa19306/exec-692540ba-d7b4-448d-8a35-33ad2e4083a4.png`。
- 尺寸与文件大小：1536 × 1024 像素，1,523,516 字节，PNG。
- 透明通道：`System.Drawing` 识别为 `Format32bppArgb`。以横纵间隔 8 像素的网格检查，共 24,576 个采样点，其中 18,219 个 Alpha 为 0；采样 Alpha 范围为 0–254，共 89 个不同值。左上角及船外多个坐标的 Alpha 均为 0；船内抽查 Alpha 为 253。该结果具有实际透明通道，非棋盘格或实色背景。原 PNG 直接复制到项目内，未改写 Alpha。
- 实际用途：作为月夜海面中的独立交互图片纸船精灵，沿用户手绘路径航行。生成范围仅为纸船图片资产；页面结构、交互逻辑及路径运动不属于本次图像生成结果，未生成或导入整页设计。

下列为本次实际提交的完整原始提示词，逐字记录：

```text
Use case: stylized-concept
Asset type: transparent PNG paper boat sprite for an interactive browser experience on a deep navy moonlit sea.
Primary request: one small exquisitely folded origami paper boat, a single isolated object.
Scene/backdrop: genuinely transparent background with an actual alpha channel. All space outside the boat must be transparent, never a painted checkerboard.
Subject: an elegant warm ivory paper boat with visible delicate paper fibers, tactile soft matte paper, crisp natural folded creases. The boat is viewed from the side with a slightly elevated camera, so its interior folds are visible. The bow points to the right.
Composition/framing: one centered boat, complete silhouette, occupying about 70 percent of image width, comfortable transparent padding on all sides. Horizontal orientation.
Lighting/mood: restrained soft blue moonlight rim illumination appropriate for a dark blue night sea, while keeping the paper itself warm ivory and highly readable at small sprite size.
Style/medium: premium realistic handcrafted paper object, clean art-directed rendering.
Constraints: transparent PNG with real alpha; no sea, no water, no floor, no surface, no background, no cast shadow outside the boat, no reflections, no text, no logos, no border, no extra objects. Do not paint black, white, blue, gray or checkerboard backdrop. Preserve a clean cutout edge.
```

## 《给团圆留一盏灯》交互短篇素材（2026-09-22 追加）

三张图片均使用内置 `image_gen`（实际工具调用 `image_gen__imagegen`）制作。开窗场景与虚构旧照片分别从文字生成；关窗场景以已生成并通过 `view_image` 检查的开窗图为编辑目标。最终三张均已实际使用 `view_image` 目视核验，并将原始 PNG 直接复制到项目资产目录，没有裁切、重编码或用其他工具改动画面。

生成范围是交互短篇所需的两张摄影式房间状态图片和一张照片道具素材，不是整页界面设计。开关窗动作、状态过渡、照片覆盖层及其他交互由应用实现。人物照片中的母亲和孩子均为虚构人物，必须作为明确标注的“虚构演示照片”使用，不得称为用户的真实家人或真实家庭记忆。

资产目录完整路径：`F:/codex_project/0921_codexgpt6_project/moon-studio/public/assets/`。

| 项目资产 | 实际尺寸 | 文件大小 | 色彩格式 | 原始生成文件名 |
| --- | --- | --- | --- | --- |
| `public/assets/story-room-open.png` | 1536 × 1024 | 2,007,735 字节 | 24-bit RGB PNG，无透明通道 | `exec-83470d45-52ef-4ca9-9d34-df4e26a1198a.png` |
| `public/assets/story-room-closed.png` | 1536 × 1024 | 1,830,307 字节 | 24-bit RGB PNG，无透明通道 | `exec-ae34186b-d943-4740-b0be-0a57d56caefb.png` |
| `public/assets/story-memory.png` | 1448 × 1086（4:3） | 2,147,438 字节 | 24-bit RGB PNG，无透明通道 | `exec-2a1d2749-ca0e-4c66-9601-34ec4ca777f1.png` |

上述原始生成文件均位于 `D:/codex/home/generated_images/01a0c837-af1a-72a0-8594-b5e57fa19306/`。

目视核验结果：开窗与关窗图的机位、桌缘、右侧纸灯位置保持一致；关窗图的两扇木窗板在中央合拢。开窗图中心是夜色远山，前景木桌保留大块空白。手机居中裁切可保留主窗，右侧纸灯可能在裁切范围外，应由响应式场景构图处理。状态编辑为生成式编辑，未宣称像素级配准。旧照片展示自然剥橘子的母子，符合虚构家庭照片道具用途。

### story-room-open.png：实际原始提示词

```text
Use case: photorealistic-natural
Asset type: static photographic scene layer for an interactive Mid-Autumn browser story; landscape 1536 by 1024 pixels.
Primary request: a cinematic, premium editorial photograph of a quiet East Asian Chinese home interior at Mid-Autumn night, looking straight toward one large central wooden window.
Scene and composition: exact frontal stationary eye-level camera, symmetrical centered window axis. The large rectangular dark walnut wood window occupies the central upper two thirds. Its two solid wooden shutter panels are fully opened to opposite sides, leaving a clear unobstructed opening to a blue moonlit night with distant soft mountains. No close-up moon; moonlight is implied. A broad plain walnut wooden table spans the foreground across the full width, with the tabletop occupying the bottom 30 percent of the image. Keep the left and center tabletop completely empty and visually quiet for a real interactive photo element to be overlaid later. One small warm cream paper lamp sits on the right side of the tabletop. The central window must remain legible when the image is center-cropped to a tall phone screen.
Materials and palette: tactile genuine walnut wood, understated cream plaster walls, soft cream paper lamp, cool teal-blue night beyond the window and restrained warm amber lamp illumination inside. Human-scale ordinary home with beautiful natural materials, not a hotel or fantasy set.
Lighting and mood: intimate, calm, gently expectant; believable low-light photographic exposure; warm lamp spill on the right and soft blue night entering the open window; elegant tonal depth without crushed black details.
Style: photorealistic cinematic editorial still, natural perspective, convincing subtle texture, restrained composition.
Constraints: no people, no text, no lettering, no watermark, no interface, no picture frames or photos already on the table, no large moon, no food arrangement, no extra lamps, no candles, no flowers, no decorative clutter. A single cohesive photographic image, not a website mockup.
```

### story-room-closed.png：实际编辑提示词

本次 `referenced_image_paths` 为：
`D:/codex/home/generated_images/01a0c837-af1a-72a0-8594-b5e57fa19306/exec-83470d45-52ef-4ca9-9d34-df4e26a1198a.png`。

```text
Use case: precise-object-edit
Asset type: closed-window photographic state paired with the provided open-window image for an interactive Mid-Autumn story. Output the same landscape 1536 by 1024 framing.
Input image: the provided open-window room is the edit target and exact composition reference.
Primary request: close ONLY the two existing solid dark walnut wooden window shutter panels so they meet at the exact center of the window and fully cover the outdoor view. The same panels should now form a believable closed symmetrical two-panel wooden window, with the center seam clearly visible and the existing dark ring handles near the seam.
Preserve invariants: preserve the exact camera position, framing, perspective, dimensions, room architecture, table position and its wood grain, paper lamp position and shape at the right, lamp brightness and warm spill, walls, wooden beams, and all other objects. Do not zoom, crop, recompose, move the lamp, redesign furniture, or add any objects. The window opening is the only geometric change.
Lighting: because the window is now closed, slightly reduce the cool blue light inside the room, making the room gently darker while retaining the same warm lit paper lamp. Keep wood detail readable; do not turn the image black.
Constraints: no people, no text, no lettering, no watermark, no interface, no photos on the table, no external view showing through the wooden panels, no extra lamps. This must look like the same room photographed one moment before the shutters were opened, ready for a registered crossfade between the two images.
```

### story-memory.png：实际原始提示词

```text
Use case: photorealistic-natural
Asset type: fictional demonstration family-memory photograph for a clearly labeled interactive story; horizontal 4:3 image, preferably 1440 by 1080 pixels.
Primary request: an authentic-looking candid photograph of an ordinary Chinese family at a Mid-Autumn dinner table in the 1990s. This is a completely fictional scene with invented people, not a depiction of any real user's family.
Subject: one adult mother in a simple everyday blouse and her approximately eight-year-old child in an ordinary long-sleeved shirt sitting together at a modest home dining table, naturally peeling and sharing small mandarin oranges. Their attention is on their hands and the fruit, with a small unposed tender smile, not looking at camera. Show believable hands and modest ordinary domestic surroundings.
Scene: a small lived-in Chinese apartment dining space of the 1990s; a few simple bowls, a small plate and a plain enamel cup on the table, oranges and a few peels. Restrained details, no elaborate feast, no staged festive decorations. Quiet warm candle glow mixed with dim household tungsten light.
Style and mood: a genuinely candid 1990s consumer color-film family snapshot, warm slightly faded yellowed colors, organic subtle film grain, soft imperfect focus, understated authentic emotion and natural body language. Photographic rather than painterly. Do not make it look like a polished contemporary advertising shoot.
Composition: medium shot close enough to see the orange-peeling action and both people comfortably; horizontal 4:3, complete image with no frame or border.
Constraints: no text, no date stamp, no subtitles, no lettering, no watermarks, no white or decorative photo border, no extra people, no costumes, no exaggerated crying, no theatrical poses.
```
