#!/usr/bin/env node
/**
 * 多平台文案适配器 - Web 预览生成器
 * 生成漂亮的6平台对比HTML页面，方便截图展示效果
 */

const fs = require("fs");
const path = require("path");

const PLATFORM_META = {
  red: { name: "小红书", icon: "📕", color: "#ff2442", gradient: "linear-gradient(135deg, #ff2442 0%, #ff6b81 100%)" },
  wx: { name: "公众号", icon: "💚", color: "#07c160", gradient: "linear-gradient(135deg, #07c160 0%, #4ade80 100%)" },
  zh: { name: "知乎", icon: "🔵", color: "#0066ff", gradient: "linear-gradient(135deg, #0066ff 0%, #60a5fa 100%)" },
  bili: { name: "B站", icon: "📺", color: "#fb7299", gradient: "linear-gradient(135deg, #fb7299 0%, #f9a8d4 100%)" },
  wb: { name: "微博", icon: "🔴", color: "#ff8200", gradient: "linear-gradient(135deg, #ff8200 0%, #fbbf24 100%)" },
  dy: { name: "抖音", icon: "🎵", color: "#161823", gradient: "linear-gradient(135deg, #161823 0%, #fe2c55 100%)" },
};

function escapeHtml(str) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function markdownToHtml(md) {
  let html = escapeHtml(md);
  html = html.replace(/^### (.+)$/gm, '<h4>$1</h4>');
  html = html.replace(/^## (.+)$/gm, '<h3>$1</h3>');
  html = html.replace(/^# (.+)$/gm, '<h2>$1</h2>');
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/&gt; (.+)$/gm, '<blockquote>$1</blockquote>');
  html = html.replace(/^(\d+)\. (.+)$/gm, '<div class="list-item"><span class="list-num">$1.</span> $2</div>');
  html = html.replace(/^- (.+)$/gm, '<div class="list-item">• $1</div>');
  html = html.replace(/#([^#\s]+)#/g, '<span class="hashtag">#$1#</span>');
  html = html.replace(/\n\n/g, '</p><p>');
  html = html.replace(/\n/g, '<br>');
  html = '<p>' + html + '</p>';
  html = html.replace(/<p><\/p>/g, '');
  return html;
}

function generatePreviewHTML(data) {
  const { original, results, analysis } = data;
  const timestamp = new Date().toLocaleString("zh-CN");

  let platformCards = "";
  for (const [code, meta] of Object.entries(PLATFORM_META)) {
    const r = results[code];
    if (!r) continue;

    const titlesHtml = (r.titles || []).map((t, i) =>
      `<div class="title-item"><span class="title-num">${i + 1}</span><span class="title-text">${escapeHtml(t)}</span></div>`
    ).join("");

    const contentHtml = markdownToHtml(r.content || "");

    const wordCount = r.wordCount || 0;
    const style = PLATFORM_STYLES[code] || {};
    const minW = style.minWords || 0;
    const maxW = style.maxWords || 0;
    const inRange = wordCount >= minW && wordCount <= maxW;
    const rangeIcon = inRange ? "✅" : "⚠️";

    platformCards += `
    <div class="platform-card" style="--card-color: ${meta.color}; --card-gradient: ${meta.gradient};">
      <div class="card-header">
        <span class="platform-icon">${meta.icon}</span>
        <span class="platform-name">${meta.name}</span>
        <span class="word-badge ${inRange ? 'badge-ok' : 'badge-warn'}">${wordCount}字 ${rangeIcon}</span>
      </div>
      <div class="card-body">
        <div class="section">
          <div class="section-title">📌 推荐标题</div>
          <div class="titles-list">${titlesHtml}</div>
        </div>
        <div class="section">
          <div class="section-title">📝 文案正文</div>
          <div class="content-text">${contentHtml}</div>
        </div>
        <div class="section">
          <div class="section-title">📊 适配说明</div>
          <div class="meta-info">
            <span>语气：${escapeHtml(style.tone || '-')}</span>
            <span>受众：${escapeHtml(style.audience || '-')}</span>
            <span>推荐字数：${minW}-${maxW}字</span>
          </div>
        </div>
      </div>
    </div>`;
  }

  let analysisSection = "";
  if (analysis) {
    const keywordsHtml = (analysis.keywords || []).map(k =>
      `<span class="keyword-tag">${escapeHtml(k)}</span>`
    ).join("");

    const keyPointsHtml = (analysis.keyPoints || []).map(p =>
      `<div class="key-point">• ${escapeHtml(p)}</div>`
    ).join("");

    analysisSection = `
    <div class="analysis-section">
      <h2>📋 内容分析</h2>
      <div class="analysis-grid">
        <div class="analysis-item">
          <span class="analysis-label">内容类型</span>
          <span class="analysis-value">${escapeHtml(analysis.contentType || '-')}</span>
        </div>
        <div class="analysis-item">
          <span class="analysis-label">情感基调</span>
          <span class="analysis-value">${escapeHtml(analysis.sentiment || '-')}</span>
        </div>
        <div class="analysis-item">
          <span class="analysis-label">关键词</span>
          <div class="keywords-list">${keywordsHtml}</div>
        </div>
        <div class="analysis-item">
          <span class="analysis-label">核心信息点</span>
          <div class="key-points">${keyPointsHtml}</div>
        </div>
        <div class="analysis-item">
          <span class="analysis-label">推荐平台</span>
          <span class="analysis-value">${(analysis.platformSuggestions?.bestFit || []).map(c => PLATFORM_META[c]?.name || c).join(' ＞ ')}</span>
        </div>
        <div class="analysis-item">
          <span class="analysis-label">推荐理由</span>
          <span class="analysis-value">${escapeHtml(analysis.platformSuggestions?.reason || '-')}</span>
        </div>
      </div>
    </div>`;
  }

  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>多平台文案适配器 - Content Adapter</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "PingFang SC", "Microsoft YaHei", sans-serif;
      background: #0f0f1a;
      color: #e0e0e0;
      min-height: 100vh;
    }
    .container {
      max-width: 1400px;
      margin: 0 auto;
      padding: 40px 24px;
    }
    .header {
      text-align: center;
      margin-bottom: 48px;
    }
    .header h1 {
      font-size: 36px;
      font-weight: 800;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      margin-bottom: 8px;
    }
    .header p {
      color: #888;
      font-size: 16px;
    }
    .original-section {
      background: #1a1a2e;
      border-radius: 16px;
      padding: 28px;
      margin-bottom: 32px;
      border: 1px solid #2a2a3e;
    }
    .original-section h2 {
      font-size: 18px;
      color: #aaa;
      margin-bottom: 16px;
    }
    .original-text {
      font-size: 16px;
      line-height: 1.8;
      color: #ddd;
      padding: 16px;
      background: #12121f;
      border-radius: 8px;
      border-left: 3px solid #667eea;
    }
    ${analysisSection ? `
    .analysis-section {
      background: #1a1a2e;
      border-radius: 16px;
      padding: 28px;
      margin-bottom: 32px;
      border: 1px solid #2a2a3e;
    }
    .analysis-section h2 {
      font-size: 18px;
      color: #aaa;
      margin-bottom: 16px;
    }
    .analysis-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
      gap: 16px;
    }
    .analysis-item {
      background: #12121f;
      border-radius: 8px;
      padding: 16px;
    }
    .analysis-label {
      display: block;
      font-size: 12px;
      color: #888;
      margin-bottom: 6px;
      text-transform: uppercase;
      letter-spacing: 1px;
    }
    .analysis-value {
      font-size: 14px;
      color: #ddd;
    }
    .keywords-list {
      display: flex;
      flex-wrap: wrap;
      gap: 6px;
      margin-top: 4px;
    }
    .keyword-tag {
      background: #2a2a4e;
      color: #a78bfa;
      padding: 2px 10px;
      border-radius: 12px;
      font-size: 13px;
    }
    .key-points {
      margin-top: 4px;
    }
    .key-point {
      font-size: 13px;
      color: #ccc;
      line-height: 1.6;
    }
    ` : ""}
    .platforms-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(420px, 1fr));
      gap: 24px;
    }
    .platform-card {
      background: #1a1a2e;
      border-radius: 16px;
      overflow: hidden;
      border: 1px solid #2a2a3e;
      transition: transform 0.2s, box-shadow 0.2s;
    }
    .platform-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 8px 30px rgba(0,0,0,0.3);
    }
    .card-header {
      background: var(--card-gradient);
      padding: 16px 20px;
      display: flex;
      align-items: center;
      gap: 10px;
    }
    .platform-icon {
      font-size: 24px;
    }
    .platform-name {
      font-size: 18px;
      font-weight: 700;
      color: white;
      flex: 1;
    }
    .word-badge {
      font-size: 12px;
      padding: 3px 10px;
      border-radius: 12px;
      font-weight: 600;
    }
    .badge-ok {
      background: rgba(255,255,255,0.25);
      color: white;
    }
    .badge-warn {
      background: rgba(255,200,0,0.3);
      color: #ffd700;
    }
    .card-body {
      padding: 20px;
    }
    .section {
      margin-bottom: 16px;
    }
    .section:last-child {
      margin-bottom: 0;
    }
    .section-title {
      font-size: 13px;
      color: #888;
      margin-bottom: 8px;
      font-weight: 600;
    }
    .titles-list {
      display: flex;
      flex-direction: column;
      gap: 6px;
    }
    .title-item {
      display: flex;
      align-items: flex-start;
      gap: 8px;
      font-size: 14px;
      color: #ddd;
    }
    .title-num {
      background: var(--card-color);
      color: white;
      width: 20px;
      height: 20px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 11px;
      font-weight: 700;
      flex-shrink: 0;
      margin-top: 1px;
    }
    .title-text {
      line-height: 1.5;
    }
    .content-text {
      font-size: 14px;
      line-height: 1.8;
      color: #ddd;
      background: #12121f;
      padding: 14px;
      border-radius: 8px;
    }
    .content-text h3 { color: #fff; margin: 12px 0 6px; font-size: 15px; }
    .content-text h4 { color: #eee; margin: 10px 0 4px; font-size: 14px; }
    .content-text blockquote {
      border-left: 3px solid #667eea;
      padding-left: 12px;
      color: #aaa;
      margin: 8px 0;
      font-style: italic;
    }
    .content-text .hashtag {
      color: #60a5fa;
      font-weight: 600;
    }
    .content-text .list-item {
      padding-left: 4px;
      margin: 4px 0;
    }
    .content-text .list-num {
      color: var(--card-color);
      font-weight: 700;
    }
    .meta-info {
      display: flex;
      flex-wrap: wrap;
      gap: 12px;
      font-size: 12px;
      color: #888;
    }
    .footer {
      text-align: center;
      margin-top: 48px;
      padding: 24px;
      color: #555;
      font-size: 13px;
    }
    @media (max-width: 900px) {
      .platforms-grid {
        grid-template-columns: 1fr;
      }
    }
    @media print {
      body { background: white; color: #333; }
      .platform-card { border: 1px solid #ddd; }
      .card-header { color: white; }
      .content-text { background: #f5f5f5; }
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>📱 多平台文案适配器</h1>
      <p>Content Adapter - 一键改写6大社交平台风格</p>
    </div>

    <div class="original-section">
      <h2>📄 原始内容</h2>
      <div class="original-text">${escapeHtml(original || "")}</div>
    </div>

    ${analysisSection}

    <div class="platforms-grid">
      ${platformCards}
    </div>

    <div class="footer">
      <p>Content Adapter v3.0 | 生成时间：${timestamp}</p>
      <p>基于 MediaCrawler 真实爆款数据分析 | 参加 SOLO 技能创作赛</p>
    </div>
  </div>
</body>
</html>`;
}

const PLATFORM_STYLES = {
  red: { name: "小红书", tone: "种草体、分享体、闺蜜感", minWords: 150, maxWords: 300, audience: "18-35岁女性" },
  wx: { name: "微信公众号", tone: "专业温暖、有深度、共情力", minWords: 800, maxWords: 2000, audience: "25-45岁" },
  zh: { name: "知乎", tone: "专业分析、客观理性、数据支撑", minWords: 1000, maxWords: 3000, audience: "20-40岁高学历" },
  bili: { name: "B站", tone: "轻松幽默、口语化、互动感强", minWords: 200, maxWords: 500, audience: "16-30岁Z世代" },
  wb: { name: "微博", tone: "直接有力、话题性、信息密度高", minWords: 50, maxWords: 140, audience: "18-40岁" },
  dy: { name: "抖音", tone: "口语化、节奏快、3秒钩子", minWords: 50, maxWords: 150, audience: "18-35岁" },
};

function main() {
  const args = process.argv.slice(2);

  if (args[0] === "--data" && args[1]) {
    const data = JSON.parse(fs.readFileSync(args[1], "utf-8"));
    const html = generatePreviewHTML(data);

    let outputPath = args[2] || path.join(process.cwd(), "preview.html");
    if (!outputPath.endsWith(".html")) outputPath += ".html";

    fs.writeFileSync(outputPath, html, "utf-8");
    console.log(JSON.stringify({ success: true, outputPath, url: "file:///" + outputPath.replace(/\\/g, "/") }, null, 2));
  } else if (args[0] === "--inline") {
    let data;
    try {
      data = JSON.parse(args[1] || "{}");
    } catch {
      data = {};
    }
    const html = generatePreviewHTML(data);

    let outputPath = args[2] || path.join(process.cwd(), "preview.html");
    if (!outputPath.endsWith(".html")) outputPath += ".html";

    fs.writeFileSync(outputPath, html, "utf-8");
    console.log(JSON.stringify({ success: true, outputPath, url: "file:///" + outputPath.replace(/\\/g, "/") }, null, 2));
  } else {
    console.log(`
Web 预览生成器 - 多平台文案适配器

用法:
  node preview.js --data <JSON文件路径> [输出路径]
  node preview.js --inline '<JSON数据>' [输出路径]

JSON 数据格式:
{
  "original": "原始文本",
  "analysis": { "contentType": "...", "keywords": [...], ... },
  "results": {
    "red": { "titles": ["标题1", "标题2"], "content": "文案内容", "wordCount": 200 },
    "wx": { ... },
    ...
  }
}

示例:
  node preview.js --data ./results.json ./output/preview.html
    `.trim());
  }
}

main();
