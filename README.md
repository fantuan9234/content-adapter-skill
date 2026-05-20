# Content Adapter - 多平台文案适配器

AI 驱动的智能文案改写工具，一键将长文改写为小红书、公众号、知乎、B站、微博、抖音等6大社交平台风格。

## 核心特点

- **AI 智能改写**：不是模板替换，而是真正理解内容后重新创作
- **6大平台适配**：小红书、微信公众号、知乎、B站、微博、抖音
- **改写质量自检**：7项自检清单，确保输出质量达标
- **内容自动分析**：识别内容类型、情感基调、关键词、核心信息点
- **平台智能推荐**：根据内容类型自动推荐最适合的平台
- **数据驱动风格指南**：基于 MediaCrawler 真实爆款数据分析，每个平台都有数据验证的标题公式
- **真实案例参考**：每个平台提供多个真实爆款案例
- **批量导出**：一键导出所有平台结果为独立 Markdown 文件
- **多平台对比**：生成6平台对比表格，一目了然

## 架构设计

```
用户输入 → 内容分析(analyze) → 读取风格指南(references/) → AI改写(参考真实案例) → 质量自检(7项) → 格式化(format) → 输出/导出(export)
```

**关键设计：**
1. 脚本负责分析和格式化，AI 负责真正的改写——改写质量远超模板替换
2. 改写前必须读取 references/ 下的详细风格指南，不能仅凭概要信息
3. 改写后自动执行7项质量自检，不通过则修正

## 快速开始

### 环境要求

- Node.js

### 使用方法

```bash
# Step 1: 分析内容特征
node scripts/adapter.js analyze --input "你的文本内容"

# Step 2: 获取改写上下文（分析结果 + 风格指南）
node scripts/adapter.js adapt --input "你的文本" --platform red

# Step 3: 格式化改写结果
node scripts/adapter.js format --platform red --title "标题" --content "文案内容"

# Step 4: 批量导出
node scripts/adapter.js export --results '{"red":{...}}' --output-dir ./output

# Step 5: 生成多平台对比表
node scripts/adapter.js compare --results '{"red":{...}}'
```

### 在 SOLO 中使用

1. 安装此 Skill
2. 输入原始文案
3. 选择目标平台（可多选）
4. AI 自动分析内容 → 读取风格指南 → 智能改写 → 质量自检 → 格式化输出

## 平台风格概览

| 平台 | 代码 | 语气 | 字数范围 | 核心特点 |
|------|------|------|---------|---------|
| 小红书 | red | 种草体、闺蜜感 | 150-300字 | emoji密集、标签化、行动号召 |
| 公众号 | wx | 专业温暖、有深度 | 800-2000字 | 结构化、小标题、金句引用 |
| 知乎 | zh | 专业分析、数据支撑 | 1000-3000字 | 无emoji、引用格式、逻辑严密 |
| B站 | bili | 轻松幽默、口语化 | 200-500字 | 括号吐槽、颜文字、互动感 |
| 微博 | wb | 直接有力、话题性 | 50-140字 | #话题#标签、信息密度高 |
| 抖音 | dy | 口语化、3秒钩子 | 50-150字 | 悬念开头、节奏快、画面感 |

## 文件结构

```
content-adapter-skill/
├── SKILL.md                    # Skill 定义和 AI 指令（含7步工作流）
├── scripts/
│   └── adapter.js              # 辅助脚本（分析/格式化/导出/对比）
├── references/
│   ├── red-style-guide.md      # 小红书风格参考（数据驱动）
│   ├── wx-style-guide.md       # 公众号风格参考（数据驱动）
│   ├── zh-style-guide.md       # 知乎风格参考（数据驱动）
│   ├── bili-style-guide.md     # B站风格参考（数据驱动）
│   ├── wb-style-guide.md       # 微博风格参考（数据驱动）
│   └── dy-style-guide.md       # 抖音风格参考（数据驱动）
├── README.md                   # 项目说明
└── POST_TEMPLATE.md            # 参赛帖内容框架
```

## 内容分析示例

```bash
node scripts/adapter.js analyze --input "这款新的护肤产品含有透明质酸和烟酰胺成分..."
```

输出：
```json
{
  "contentType": "产品介绍/推广",
  "sentiment": "积极正面",
  "keywords": ["透明质酸", "烟酰胺", "护肤", "保湿", "补水"],
  "keyPoints": [
    "这款新的护肤产品含有透明质酸和烟酰胺成分，能够有效补水保湿...",
    "经过临床测试，使用28天后，90%的用户反馈皮肤水润度提升了35%"
  ],
  "platformSuggestions": {
    "bestFit": ["red", "dy", "wb", "bili"],
    "reason": "产品类内容在小红书种草效果好，抖音适合短视频测评，微博适合短平快推广，B站适合趣味测评"
  }
}
```

## 改写质量自检

每次改写后自动执行7项自检：
1. ✅ 核心信息完整保留
2. ✅ 语气符合平台特征
3. ✅ 标题使用平台公式
4. ✅ 字数在推荐范围内
5. ✅ emoji密度符合习惯
6. ✅ 排版符合平台惯例
7. ✅ 无编造信息

## License

MIT

## 参加 SOLO 技能创作赛

本项目参加了 [SOLO 技能创作赛](https://forum.trae.cn/c/skill-creation)
