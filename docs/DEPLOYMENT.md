# 远端仓库与网站部署

公开仓库：[yydshly/0921_codexgpt6_project](https://github.com/yydshly/0921_codexgpt6_project)（用户指定公开）。

网站：**已于 2026-09-23 公开部署**。[项目总览](https://yydshly.github.io/0921_codexgpt6_project/) · [互动故事创作台](https://yydshly.github.io/0921_codexgpt6_project/#story)。

首次成功发布对应提交 [`752b9c4`](https://github.com/yydshly/0921_codexgpt6_project/commit/752b9c4) 和 [GitHub Actions 工作流](https://github.com/yydshly/0921_codexgpt6_project/actions/runs/35808741556)。工作流的 50 项自动检查通过，构建与 deploy 均成功；线上首页返回 HTTP 200，页面标题正确。此处记录首次发布证据，不提前宣称全部线上交互、素材或浏览器检查通过。

## 工作流

`.github/workflows/deploy.yml` 在 main 更新时运行：安装 moon-studio 的锁定依赖 → 重新生成可独立播放的故事样例 → 将影片、声音及文档接入展示目录 → 用仓库子路径构建 → 自动测试（含构建产物检查） → 上传 Pages 产物 → 发布。

源码保留在仓库；网站只部署 `moon-studio/dist/client`。它没有服务器数据库、账号系统或自动上传个人照片的后端。浏览器中的保存记录仍属当前设备和当前站点：故事使用 IndexedDB，部分历史原型使用 localStorage。换域名不会自动迁移；迁移使用完整作品文件导出/导入。

用户点击“保存”不会把自己的图片、音频或作品发布到 GitHub Pages。可编辑 JSON 与独立 HTML 仍是用户自行保留、交付的文件；若要为自创作品提供公开链接，需要另行发布该作品。

## 本地复现

需要 Node.js 22 或以上及 npm：

```sh
npm run setup
npm run examples
npm run build
npm test
npm run dev
```

`npm run dev` 启动本地预览；`npm run build` 将项目文档与影片素材复制到忽略提交的 `moon-studio/public/showcase`，再构建应用。GitHub Pages 步骤设置 `VITE_BASE_PATH=/0921_codexgpt6_project/`；普通根路径部署可不设置此变量。

`assetUrl` 只在显示和读取预设素材时加部署路径，作品 JSON 继续保留规范素材路径；嵌入图片、音频和用户本地对象地址不被改写。CSS 字体地址交由 Vite 按 base 重写。

## 现有 Sites 适配

历史 `.openai/hosting.json`、Workers 包装层与 prepare-sites-build 保留。当前没有注册 Sites project_id，本次实际使用 GitHub Pages。构建仍生成 dist/server 与 dist/.openai 供未来 Sites 使用，Pages 不部署这两个目录。

## 发布边界

本次只公开仓库内已审查的创作样例、源代码和产品文档。依赖安装、缓存、字体处理环境、私钥/.env 与可重建的影片中间文件不提交。所有人物、家庭情节与回忆样例为虚构；旁白/程序音乐/设备朗读分别注明来源。
