# 图像提示词与来源

生成方式：本任务内置 Image Gen；未使用CLI。电影插画六张，成品分享海报一张。源文件为PNG，生成后复制入本项目，未覆写原始生成结果。

以下为制作提示词的结构化归档，保留统一美术合同、每镜内容和成品封面完整提示。原始逐次调用文本可在本任务的图像生成记录中查看。

## 统一美术合同

Use case: illustration-story. One production-quality cinematic keyframe for an original Chinese Mid-Autumn Festival short film. Canvas 1536 x 1024 landscape, composed safely for a 16:9 crop. No lettering, no logos, no captions, no watermark, no UI. Exceptionally refined contemporary dimensional cut-paper illustration, tactile ivory cotton paper, delicate cut edges, layered silhouettes and softly sculpted paper, restrained editorial art, elegant and intimate. Warm ivory #F0E9DB, ink indigo #263844, muted persimmon #B86543, warm honey window light, a pale blue moon. Characters: father about 40, short black hair, dark muted indigo casual shirt; mother about 38, black bob haircut, muted terracotta sweater; child about 7, short black hair, mustard yellow shirt. Modest gestures, coherent unobtrusive hands. Near photographic light and material but clearly handmade paper art, never photorealistic humans. Subtle contact shadows and restrained soft edge lighting. No shiny gold decorations, lantern clutter, animals, or collage.

## 电影素材

| 文件 | 内容提示 | 参考图 |
|---|---|---|
| `assets/family.png` | A small contemporary Chinese home on Mid-Autumn evening, a round pale oak table, simple ceramic bowls, four mooncakes, an orange-filled plain cloth bag on a nearby stool. Father left, mother right, child center behind table, finally seated together with relaxed subtle smiles. Rounded moonlit window rear left, paper world, clean upper-right wall. | 新生成 |
| `assets/father.png` | Exact father and clothing from family reference, arriving inside apartment doorway, amused slightly sheepish smile, one ivory cloth tote bulging with oranges and one smaller grocery bag. Two plausible hands hold handles. Warm interior light, cool night glimpse, part of oak table and cup foreground left. Narrative focus on extra fruit. | family.png |
| `assets/child.png` | Exact child in mustard shirt, leaning at table, tiny anticipatory smile, one small hand points to a mooncake cut in half. Two distinct golden salted egg yolks visible in brown filling. Two intact cakes, an orange, same plate/table/runner/window. No adults in frame. | family.png |
| `assets/mother.png` | Exact mother with black bob and terracotta sweater, waist-up in warm kitchen threshold, carrying wooden tray with ivory bowl of clear vegetable soup, steam. Both hands support tray, relaxed welcoming smile toward family offscreen. Table edge and bowls left. | family.png |
| `assets/envelope.png` | Thick ivory cotton-paper envelope, partially open on pale oak sill/table, a photograph corner inside without visible faces, small blind-embossed moon. Envelope in right half, round window and moon far right. Left52% is blank softly lit paper wall for later typesetting. No lettering, no people, no flowers or confetti. | family.png用于材质和光色 |
| `assets/stilllife.png` | Same table and runner, ivory plate with mooncake cut into six wedges, yolk cross sections, bowl of freshly washed oranges to left. A mustard-sleeved child's hand reaches from right; one indigo-sleeved adult hand slides plate from left. Two natural hands only. Warm paper-art close-up. | family.png及child.png |

## 分享封面完整提示

Use case: ads-marketing. Create a FINISHED premium Chinese Mid-Autumn short film sharing poster, portrait 1536 x 2048 (3:4). This is one coherent final cover, NOT a UI and NOT multiple options. Reference image provides the exact father (indigo shirt, short black hair), mother (black bob, terracotta sweater), child (mustard shirt), family table and exquisite warm layered-paper illustration language. Preserve their recognisable appearance. Poster composition: warm ivory cotton paper base, quiet editorial layout. Upper 40% is clean spacious typography. Small top-left brand in elegant dark ink Chinese: '这一家'. Below, a refined large Chinese Song/serif title on two lines EXACTLY: '一桌人，' and '终于坐下。' with controlled spacing, deep ink indigo. Under that, modest subtitle EXACTLY '把日常的小事，留给团圆的夜。'. Middle/lower 52% shows the referenced three-person family seated together around their round oak table, carefully recomposed to portrait so all three people and table are clearly visible, large round moonlit window softly behind, warm light and realistic cut-paper shadows. A subtle organic curved paper aperture connects the blank title area and scene without a harsh card frame. Footer with small balanced typography EXACTLY '中秋短篇 · 纸艺插画样片' and second very small line '虚构故事 · 合成旁白'. No extra text. No Latin text, no dates, no QR code, no fake logos, no buttons, no phone mockup. Restrained exquisite publishing-quality design, tactile, intimate, readable, uncluttered, substantial negative space. Ensure all Chinese text is correct and does not overlap faces.

参考：family.png。成品：`output/分享封面.png`。最终实际图像尺寸以文件为准，未为满足请求尺寸而强行拉伸。

## 原始生成文件映射

所有原始结果位于 `D:/codex/home/generated_images/01a0c836-f061-79f0-a0d5-5091d5875ef2/`。

| 项目素材 | 原文件名 |
|---|---|
| family.png | exec-70345eef-ce3f-4f48-a5b5-3a3aba0b8b98.png |
| father.png | exec-d4fa32c6-ef2e-47b4-89bf-012e5f1effe5.png |
| child.png | exec-2556b723-6708-4411-88dd-4a2fad550699.png |
| mother.png | exec-a024dedb-9d19-4352-8cde-74492a950bd6.png |
| envelope.png | exec-12cf7966-f1be-4ebf-bcf8-5e79ae5b00d9.png |
| stilllife.png | exec-ce94025d-efd9-4c5f-8948-38a66d78e5d9.png |
| 分享封面.png | exec-1a2bfa47-add0-4f43-8f85-817f10dce62c.png |
