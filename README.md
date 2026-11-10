# 紫色心跳 · WebGL 粒子雕塑

线上入口：https://www.jiayubing.cn/

使用原生 WebGL2 + GLSL 的独立 HTML 页面，无第三方运行时依赖。主体采用 GPU instanced particles，提供粒子汇聚、三维旋转、柔和发光、点击反馈和自动画质。

- `index.html`：正式页面，GitHub Pages 的网站首页。
- `webgl.html`：旧实验版地址的兼容跳转入口。
- `CNAME`：自定义域名配置。

**动画与 Windows 设置**：如果浏览器报告 `prefers-reduced-motion: reduce`，页面默认展示静态成形的爱心；可通过「继续」或「重新汇聚」手动播放，也可点击爱心触发播放。

**性能验证**：页面提供 FPS 显示与「自动 / 流畅 / 均衡 / 精细」画质选项。比较性能时，请让场景稳定运行数秒，按相同分辨率对比。
