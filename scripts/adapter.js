#!/usr/bin/env node
/**
 * 多平台文案适配器 - Content Adapter v2
 * 功能：内容分析 / 单平台适配 / 批量导出 / 对比视图生成
 * 
 * 用法：
 *   analyze  - 分析内容特征（类型/关键词/情感）
 *   adapt    - 单平台改写输出
 *   format   - 格式化单个平台结果
 *   export   - 批量导出所有平台结果为Markdown
 *   compare  - 生成多平台对比表格
 */

const fs = require("fs");
const path = require("path");

const PLATFORM_STYLES = {
  red: {
    name: "小红书",
    code: "red",
    tone: "种草体、分享体、闺蜜感",
    minWords: 150,
    maxWords: 300,
    emojiDensity: "high",
    structure: "吸引开头 + 分点说明 + 行动号召 + 标签",
    audience: "18-35岁女性，追求生活品质",
    keyEmojis: ["✨", "🔥", "💡", "📌", "", "💖", "🌟", "👇", "📝"],
  },
  wx: {
    name: "微信公众号",
    code: "wx",
    tone: "专业温暖、有深度、共情力",
    minWords: 800,
    maxWords: 2000,
    emojiDensity: "low",
    structure: "引语 + 分段正文(小标题) + 结语",
    audience: "25-45岁，追求深度内容",
    keyEmojis: [],
  },
  zh: {
    name: "知乎",
    code: "zh",
    tone: "专业分析、客观理性、数据支撑",
    minWords: 1000,
    maxWords: 3000,
    emojiDensity: "none",
    structure: "问题引入 + 结论先行 + 详细分析 + 建议",
    audience: "20-40岁高学历用户",
    keyEmojis: [],
  },
  bili: {
    name: "B站",
    code: "bili",
    tone: "轻松幽默、口语化、互动感强",
    minWords: 200,
    maxWords: 500,
    emojiDensity: "medium",
    structure: "梗开头 + 正文(括号吐槽) + 互动结尾",
    audience: "16-30岁Z世代",
    keyEmojis: ["😂", "🤣", "✨", "🔥", ""],
  },
  wb: {
    name: "微博",
    code: "wb",
    tone: "直接有力、话题性、信息密度高",
    minWords: 50,
    maxWords: 140,
    emojiDensity: "low",
    structure: "#话题标签# + 核心观点 + 补充说明",
    audience: "18-40岁，信息获取快",
    keyEmojis: [],
  },
  dy: {
    name: "抖音",
    code: "dy",
    tone: "口语化、节奏快、有画面感、3秒钩子",
    minWords: 50,
    maxWords: 150,
    emojiDensity: "low",
    structure: "3秒悬念钩子 + 核心信息(口语化) + 行动号召",
    audience: "18-35岁，短视频消费为主，注意力短",
    keyEmojis: ["👇", "", "✨"],
  },
};

const CONTENT_TYPE_PATTERNS = {
  product: [
    "含有", "成分", "效果", "使用方法", "推荐", "购买", "价格", "优惠",
    "功能", "特点", "优势", "新品", "上市", "升级", "版本", "发布",
  ],
  activity: [
    "活动", "参与", "报名", "截止", "时间", "地点", "奖品", "抽奖",
    "福利", "限时", "优惠", "折扣", "促销", "免费", "邀请",
  ],
  knowledge: [
    "原理", "机制", "研究", "数据", "报告", "分析", "趋势", "发展",
    "历史", "背景", "原因", "如何", "为什么", "什么是", "科普",
  ],
  opinion: [
    "认为", "觉得", "看法", "观点", "建议", "经验", "心得", "体会",
    "分享", "总结", "反思", "感悟", "思考", "态度", "立场",
  ],
  story: [
    "那天", "后来", "终于", "开始", "结束", "经历", "过程", "回忆",
    "故事", "遇见", "改变", "成长", "第一次", "记得", "那时候",
  ],
};

function countChineseChars(text) {
  return [...text].filter((c) => /[\u4e00-\u9fff]/.test(c)).length;
}

function countAllChars(text) {
  return [...text].filter((c) => c.trim()).length;
}

function extractKeywords(text, topN = 8) {
  const knownTerms = [
    "透明质酸", "烟酰胺", "玻尿酸", "维生素C", "维C", "水杨酸", "果酸",
    "视黄醇", "A醇", "神经酰胺", "角鲨烷", "胜肽", "胶原蛋白",
    "人工智能", "大数据", "云计算", "区块链", "物联网", "元宇宙",
    "大模型", "GPT", "ChatGPT", "Agent", "RAG", "多模态",
    "护肤", "美妆", "防晒", "美白", "保湿", "补水", "抗老", "抗衰",
    "精华", "面霜", "乳液", "爽肤水", "洁面", "面膜", "眼霜", "卸妆",
    "产品", "功能", "效果", "成分", "测试", "临床", "用户", "反馈",
    "提升", "改善", "增加", "减少", "降低", "提高", "优化", "升级",
    "市场", "行业", "趋势", "报告", "数据", "研究", "分析", "洞察",
    "活动", "优惠", "折扣", "免费", "限时", "福利", "抽奖", "报名",
    "推荐", "测评", "体验", "分享", "教程", "攻略", "避坑", "干货",
    "效率", "工具", "App", "软件", "插件", "自动化", "工作流",
    "穿搭", "健身", "减脂", "增肌", "饮食", "睡眠", "冥想",
    "职场", "面试", "简历", "晋升", "跳槽", "副业", "创业",
    "读书", "学习", "考试", "考研", "留学", "英语", "编程",
    "旅行", "美食", "摄影", "家居", "收纳", "装修", "好物",
    "短视频", "直播", "带货", "种草", "拔草", "安利",
  ];

  const found = [];
  for (const term of knownTerms) {
    if (text.includes(term)) {
      found.push(term);
    }
  }

  const segments = text.split(/[，。！？、；：""（）《》【】\s\n\r，.!?;:(){}[\]]+/);
  for (const seg of segments) {
    const trimmed = seg.trim();
    if (trimmed.length >= 2 && trimmed.length <= 8 && /^[\u4e00-\u9fa5]+$/.test(trimmed)) {
      if (!found.includes(trimmed) && !found.some((f) => f.includes(trimmed) || trimmed.includes(f))) {
        found.push(trimmed);
      }
    }
  }

  return found.slice(0, topN);
}

function detectContentType(text) {
  const lowerText = text.toLowerCase();
  let scores = {};

  for (const [type, keywords] of Object.entries(CONTENT_TYPE_PATTERNS)) {
    scores[type] = 0;
    for (const kw of keywords) {
      const regex = new RegExp(kw, "g");
      const matches = lowerText.match(regex);
      if (matches) {
        scores[type] += matches.length;
      }
    }
  }

  const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1]);
  return sorted[0][0];
}

function detectSentiment(text) {
  const positive = [
    "好", "棒", "优秀", "喜欢", "爱", "推荐", "值得", "惊喜", "满意",
    "开心", "快乐", "成功", "提升", "改善", "有效", "绝了", "太香了",
    "宝藏", "完美", "惊艳", "厉害", "牛", "赞", "给力", "超棒",
  ];
  const negative = [
    "差", "烂", "不好", "讨厌", "失望", "糟糕", "麻烦", "失败",
    "后悔", "难过", "痛苦", "降低", "恶化", "无效", "垃圾", "坑",
    "无语", "离谱", "崩溃", "焦虑", "害怕", "紧张",
  ];

  let posScore = 0;
  let negScore = 0;

  for (const kw of positive) {
    if (text.includes(kw)) posScore++;
  }
  for (const kw of negative) {
    if (text.includes(kw)) negScore++;
  }

  if (posScore > negScore * 1.5) return "positive";
  if (negScore > posScore * 1.5) return "negative";
  return "neutral";
}

function extractKeyPoints(text, maxPoints = 5) {
  const sentences = text.split(/[。！？\n]+/).filter((s) => s.trim().length > 10);

  const points = [];
  for (const s of sentences) {
    const trimmed = s.trim();
    if (trimmed.length <= 60 && trimmed.length >= 15) {
      points.push(trimmed);
    }
  }

  return points.slice(0, maxPoints);
}

function analyzeContent(text) {
  const totalChars = countAllChars(text);
  const chineseChars = countChineseChars(text);
  const keywords = extractKeywords(text);
  const contentType = detectContentType(text);
  const sentiment = detectSentiment(text);
  const keyPoints = extractKeyPoints(text);

  const typeLabels = {
    product: "产品介绍/推广",
    activity: "活动宣传/通知",
    knowledge: "知识科普/分析",
    opinion: "观点分享/心得",
    story: "故事叙述/经历",
  };

  const sentimentLabels = {
    positive: "积极正面",
    negative: "消极负面",
    neutral: "中性客观",
  };

  return {
    summary: {
      totalChars,
      chineseChars,
      sentenceCount: text.split(/[。！？\n]+/).filter(Boolean).length,
    },
    contentType: typeLabels[contentType] || contentType,
    contentTypeRaw: contentType,
    sentiment: sentimentLabels[sentiment],
    sentimentRaw: sentiment,
    keywords,
    keyPoints,
    platformSuggestions: getPlatformSuggestions(contentType),
  };
}

function getPlatformSuggestions(contentType) {
  const suggestions = {
    product: {
      bestFit: ["red", "dy", "wb", "bili"],
      reason: "产品类内容在小红书种草效果好，抖音适合短视频测评，微博适合短平快推广，B站适合趣味测评",
    },
    activity: {
      bestFit: ["wb", "dy", "wx", "red"],
      reason: "活动类内容微博传播快，抖音适合视频宣传，公众号适合深度说明，小红书适合视觉化展示",
    },
    knowledge: {
      bestFit: ["zh", "wx", "bili", "dy"],
      reason: "知识类内容知乎深度好，公众号适合系统讲解，B站适合轻松科普，抖音适合1分钟科普",
    },
    opinion: {
      bestFit: ["zh", "wx", "wb", "red"],
      reason: "观点类内容知乎讨论度高，公众号有共鸣感，微博容易引发话题，小红书容易引发互动",
    },
    story: {
      bestFit: ["wx", "bili", "dy", "red"],
      reason: "故事类内容公众号沉浸感强，B站叙事有趣味性，抖音适合短视频故事，小红书情感共鸣好",
    },
  };
  return suggestions[contentType] || suggestions.opinion;
}

function formatSinglePlatform(platformCode, title, content, extraInfo = {}) {
  const style = PLATFORM_STYLES[platformCode];
  if (!style) return null;

  const wordCount = countAllChars(content);

  let output = `## ${style.name} 适配结果\n\n`;
  output += `### 推荐标题\n`;
  output += `1. ${title}\n\n`;

  output += `### 文案正文\n\n`;
  output += `${content}\n\n`;

  output += `### 统计信息\n\n`;
  output += `- 字数：${wordCount}字（推荐范围：${style.minWords}-${style.maxWords}字）\n`;
  output += `- 语气风格：${style.tone}\n`;
  output += `- 目标受众：${style.audience}\n`;
  output += `- 结构模式：${style.structure}\n`;

  if (extraInfo.keyChanges) {
    output += `\n### 核心改动\n\n`;
    for (const change of extraInfo.keyChanges) {
      output += `- ${change}\n`;
    }
  }

  return output;
}

function generateCompareTable(results) {
  let table = `| 维度 | 小红书 | 公众号 | 知乎 | B站 | 微博 | 抖音 |\n`;
  table += `|------|--------|--------|------|-----|------|------|\n`;

  const dimensions = [
    {
      label: "标题",
      getValue: (r) => r.title ? r.title.replace(/\|/g, "\\|").slice(0, 20) + "..." : "-",
    },
    {
      label: "字数",
      getValue: (r) => r.wordCount ? `${r.wordCount}字` : "-",
    },
    {
      label: "语气",
      getValue: (r) => PLATFORM_STYLES[r.platform]?.tone?.split("、")[0] || "-",
    },
    {
      label: "核心卖点",
      getValue: (r) => r.keyPoint || "-",
    },
    {
      label: "最佳场景",
      getValue: (r) => {
        const scenes = {
          red: "种草/测评/分享",
          wx: "深度文章/品牌故事",
          zh: "专业问答/行业分析",
          bili: "视频脚本/趣味内容",
          wb: "热点追踪/快速传播",
          dy: "短视频口播/1分钟科普",
        };
        return scenes[r.platform] || "-";
      },
    },
  ];

  for (const dim of dimensions) {
    const row = [dim.label];
    for (const code of ["red", "wx", "zh", "bili", "wb", "dy"]) {
      const r = results[code];
      row.push(r ? dim.getValue(r) : "-");
    }
    table += `| ${row.join(" | ")} |\n`;
  }

  return table;
}

function exportToMarkdown(results, outputDir) {
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  let indexContent = `# 多平台文案适配结果\n\n`;
  indexContent += `> 生成时间：${new Date().toLocaleString("zh-CN")}\n\n`;

  indexContent += `## 原始内容\n\n`;
  indexContent += `${results._original || "(未提供)"}\n\n`;

  indexContent += `---\n\n`;
  indexContent += generateCompareTable(results);
  indexContent += `\n\n---\n\n`;

  for (const code of ["red", "wx", "zh", "bili", "wb", "dy"]) {
    const r = results[code];
    if (!r) continue;

    const style = PLATFORM_STYLES[code];

    const fileContent = `# ${style.name} 适配结果\n\n`;
    fileContent += `## 标题\n\n${r.title || "(未生成)"}\n\n`;
    fileContent += `## 文案正文\n\n${r.content || "(未生成)"}\n\n`;
    fileContent += `---\n\n`;
    fileContent += `**统计信息**\n\n`;
    fileContent += `- 字数：${r.wordCount || 0}字\n`;
    fileContent += `- 平台：${style.name}\n`;
    fileContent += `- 语气：${style.tone}\n`;
    fileContent += `- 受众：${style.audience}\n`;

    const fileName = `${code}_${style.name}.md`;
    fs.writeFileSync(path.join(outputDir, fileName), fileContent, "utf-8");
    indexContent += `### [${style.name}](${fileName})\n\n`;

    if (r.content) {
      indexContent += `> ${r.content.slice(0, 80)}...\n\n`;
    }
  }

  fs.writeFileSync(path.join(outputDir, "index.md"), indexContent, "utf-8");

  return {
    exportedFiles: Object.keys(PLATFORM_STYLES).map(
      (code) => `${code}_${PLATFORM_STYLES[code].name}.md`
    ),
    indexPath: path.join(outputDir, "index.md"),
  };
}

function parseArgs(args) {
  const parsed = { command: args[0], options: {} };
  for (let i = 1; i < args.length; i++) {
    switch (args[i]) {
      case "--input":
        parsed.options.input = args[++i];
        break;
      case "--platform":
        parsed.options.platform = args[++i];
        break;
      case "--mode":
        parsed.options.mode = args[++i];
        break;
      case "--word-count":
        parsed.options.wordCount = parseInt(args[++i], 10);
        break;
      case "--title":
        parsed.options.title = args[++i];
        break;
      case "--content":
        parsed.options.content = args[++i];
        break;
      case "--output":
      case "--output-dir":
        parsed.options.outputDir = args[++i];
        break;
      case "--results":
        try {
          parsed.options.results = JSON.parse(args[++i]);
        } catch (e) {
          parsed.options.results = {};
        }
        break;
    }
  }
  return parsed;
}

function main() {
  const parsed = parseArgs(process.argv.slice(2));
  const { command, options } = parsed;

  switch (command) {
    case "analyze": {
      if (!options.input) {
        console.error("用法: adapter.js analyze --input <文本>");
        process.exit(1);
      }
      const result = analyzeContent(options.input);
      console.log(JSON.stringify(result, null, 2));
      break;
    }

    case "adapt": {
      if (!options.input || !options.platform) {
        console.error("用法: adapter.js adapt --input <文本> --platform <平台代码>");
        process.exit(1);
      }
      const analysis = analyzeContent(options.input);
      const style = PLATFORM_STYLES[options.platform];
      if (!style) {
        console.error(`不支持的平台: ${options.platform}`);
        console.error(`支持的平台: ${Object.keys(PLATFORM_STYLES).join(", ")}`);
        process.exit(1);
      }

      console.log(JSON.stringify({
        command: "adapt",
        platform: options.platform,
        platformName: style.name,
        analysis,
        styleGuide: {
          tone: style.tone,
          structure: style.structure,
          audience: style.audience,
          wordRange: `${style.minWords}-${style.maxWords}`,
          emojis: style.keyEmojis,
        },
        hint: "请根据以上分析结果和风格指南，用 AI 智能改写原始内容为目标平台风格。",
      }, null, 2));
      break;
    }

    case "format": {
      if (!options.platform || !options.content) {
        console.error("用法: adapter.js format --platform <代码> --title <标题> --content <文案> [--output <路径>]");
        process.exit(1);
      }
      const formatted = formatSinglePlatform(
        options.platform,
        options.title || "",
        options.content,
        {}
      );

      if (options.outputDir) {
        const outputPath = path.join(options.outputDir, `${options.platform}_${PLATFORM_STYLES[options.platform]?.name || "output"}.md`);
        fs.writeFileSync(outputPath, formatted, "utf-8");
        console.log(JSON.stringify({ success: true, outputPath }, null, 2));
      } else {
        console.log(formatted);
      }
      break;
    }

    case "export": {
      if (!options.outputDir) {
        console.error("用法: adapter.js export --results '<JSON>' --output-dir <目录>");
        process.exit(1);
      }
      const exportResult = exportToMarkdown(options.results || {}, options.outputDir);
      console.log(JSON.stringify(exportResult, null, 2));
      break;
    }

    case "compare": {
      if (!options.results) {
        console.error("用法: adapter.js compare --results '<JSON>'");
        process.exit(1);
      }
      console.log(generateCompareTable(options.results));
      break;
    }

    case "preview": {
      if (!options.results || !options.outputDir) {
        console.error("用法: adapter.js preview --results '<JSON>' --output-dir <目录>");
        console.error("提示: 也可以直接使用 scripts/preview.js --data <JSON文件> [输出路径]");
        process.exit(1);
      }
      const previewData = {
        original: options.results._original || "",
        analysis: options.results._analysis || null,
        results: options.results,
      };
      const previewHtml = require("./preview.js").generatePreviewHTML
        ? null
        : null;
      const { execSync } = require("child_process");
      const tmpJson = path.join(options.outputDir, "_tmp_preview_data.json");
      if (!fs.existsSync(options.outputDir)) {
        fs.mkdirSync(options.outputDir, { recursive: true });
      }
      fs.writeFileSync(tmpJson, JSON.stringify(previewData, null, 2), "utf-8");
      const outputPath = path.join(options.outputDir, "preview.html");
      execSync(`node "${path.join(__dirname, "preview.js")}" --data "${tmpJson}" "${outputPath}"`, { stdio: "inherit" });
      fs.unlinkSync(tmpJson);
      console.log(JSON.stringify({ success: true, outputPath, url: "file:///" + outputPath.replace(/\\/g, "/") }, null, 2));
      break;
    }

    default: {
      console.log(`
多平台文案适配器 v3.0

命令:
  analyze   分析内容特征（类型/关键词/情感/关键信息点）
  adapt     获取改写所需的完整上下文（分析+风格指南）
  format    格式化单个平台的改写结果为 Markdown
  export    批量导出所有平台结果为独立 Markdown 文件
  compare   生成多平台对比表格
  preview   生成 Web 预览页面（HTML）

示例:
  # 分析内容
  node adapter.js analyze --input "你的文本内容"

  # 获取改写上下文（给 AI 参考）
  node adapter.js adapt --input "你的文本" --platform red

  # 格式化输出
  node adapter.js format --platform red --title "标题" --content "文案内容"

  # 批量导出
  node adapter.js export --results '{"red":{...},"wx":{...}}' --output-dir ./output

  # 生成对比表
  node adapter.js compare --results '{"red":{...},"wx":{...}}'

支持平台: red(小红书) | wx(公众号) | zh(知乎) | bili(B站) | wb(微博) | dy(抖音)
      `.trim());
      break;
    }
  }
}

main();
