# health-tracker

个人血脂与用药安全追踪网站。

这是一个纯静态网站，可以部署到 GitHub Pages。网站代码不依赖后端，检查数据默认保存在浏览器 localStorage 中，并支持 JSON 导入/导出。

## 功能

- 首页关键指标概览
- 血脂、肝功能、用药安全、甲功趋势追踪
- 治疗时间线
- 用药记录
- 检查指标手动录入
- JSON 数据导入和导出

## 隐私建议

不要把原始检查报告、姓名、身份证件、完整病历或 `data/private-*.json` 上传到公开仓库。当前 `.gitignore` 已排除本地私密数据文件。

如果你把仓库设为 GitHub Pages，别人只能看到网站代码。你的个人数据会留在当前浏览器中；换电脑或浏览器时，用“导出/导入”迁移数据。

## 本地使用

直接打开 `index.html` 即可使用。首次使用时可以手动录入数据，或从本地导入之前导出的 JSON 文件。

## GitHub Pages

仓库页面进入 `Settings` -> `Pages`，Source 选择 `Deploy from a branch`，Branch 选择 `main` 和 `/root`，保存后等待部署完成。