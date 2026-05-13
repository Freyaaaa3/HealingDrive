# 智能座舱疗愈Agent平台 - 项目状态文档

**最后更新**: 2026-05-13
**当前版本**: v2.2.0 (Module 12 Agent上下文记忆&对话管理模块)
**已完成模块**: Module 1 + Module 2 + Module 3 + Module 4 + Module 5 + Module 6 + Module 7 + Module 8 + Module 9 + Module 10 + Module 11 + Module 12 + **UI优化**

---

## 一、项目概述

| 项目信息 | 内容 |
|---------|------|
| 项目名称 | 智能座舱疗愈Agent平台 (HealingDrive) |
| 技术栈 | Vue 3 + TypeScript + Vite + Pinia + SCSS |
| 部署目标 | 智能座舱前装系统（Web环境）|
| 核心能力 | 通过语音交互和2D虚拟形象安抚司机愤怒情绪 |
| UI风格 | 苹果原生UI + 蔚来汽车助手面板视觉规范 |

---

## 二、模块完成状态

### ✅ 已完成模块

#### Module 1: 登录初始化 & 座舱启动模块 (v1.0)
- **状态**: ✅ 已完成并可运行
- **PRD来源**: `1_登陆初始化 & 座舱启动模块 md 35dc98694aec808f8c2de4a4f67e723f.md`
- **完成日期**: 2026-05-11

**已实现功能清单**：

```
核心功能:
├── 1. 车辆上电自动后台启动 (无需登录/注册)
├── 2. 权限校验系统（麦克风/摄像头/地图）
├── 3. 资源预加载器（形象/音色/话术/模型配置）
├── 4. 唤醒词常驻监听服务（"小疗同学"）
├── 5. 降级运行策略（4级降级）
├── 6. 异常处理体系
├── 7. 整车生命周期管理
└── 8. Demo调试面板
```

#### Module 2: 疗愈Agent首页 & 虚拟形象模块 (v1.0)
- **状态**: ✅ 已完成并可运行
- **PRD来源**: `2_疗愈 Agent 首页 & 虚拟形象模块 (智能座舱疗愈 Agent v1 0 Demo).md`
- **UI风格参考**: `智能座舱疗愈Agent 前端UI界面风格PRD.md`（苹果原生UI + 蔚来助手面板）
- **完成日期**: 2026-05-11

**已实现功能清单**：

```
Module 2 核心功能:
│
├── 🎨 完整2D治愈系虚拟形象（CSS绘制，非图片资源）
│   ├── 温柔治愈风人设设计（头发/脸部/眼睛/腮红等）
│   └── 四套动效状态机（IDLE/LISTENING/SPEAKING/HEALING）
│
├── 🪟 疗愈主面板（苹果毛玻璃悬浮层）
│   ├── 三段式布局 / iOS磨砂背景 / 28dp圆角
│   ├── Teleport to body / 进入退出过渡动画
│   └── 全程禁止触控交互（纯语音交互规则）
│
├── ⏱️ 自动退出计时器（30s无交互自动收起）
├── 🎭 动画状态机控制器 (AvatarAnimationController)
└── 📐 UI设计令牌系统 (design-tokens.ts)
```

#### Module 3: 语音唤醒 & 语音交互模块 (v1.0) ⭐ 新增
- **状态**: ✅ 已完成并可运行
- **PRD来源**: `3_语音唤醒&语音交互模块 (智能座舱疗愈Agent v1 0 Demo).md`
- **完成日期**: 2026-05-11

**已实现功能清单**：

```
Module 3 核心功能:
│
├── 🔊 音频采集与降噪服务 (AudioCapture.ts)
│   ├── 车载麦克风流式采集（getUserMedia）
│   ├── 回声消除 + 噪声抑制 + 自动增益控制
│   ├── 音量实时监测（VAD简易版）
│   ├── 音频通道抢占检测（通话/导航优先）
│   └── 暂停/恢复/释放完整生命周期
│
├── 🎤 ASR语音转文字引擎 (ASREngine.ts)
│   ├── Web Speech API封装（连续识别模式）
│   ├── 标准普通话识别（zh-CN）
│   ├── 中间结果实时返回（用户输入打字效果）
│   ├── 最终结果回调（置信度+时间戳）
│   └── 错误处理：权限拒绝/网络异常/无声音
│
├── 🔈 TTS语音合成引擎 (TTSEngine.ts)
│   ├── Web Speech Synthesis API封装
│   ├── 自动选择最优中文女声（Ting-Ting/Huihui/Xiaoxiao...）
│   ├── 治愈向默认配置（语速0.9/音调1.05/音量0.8）
│   ├── 播报打断支持（用户说话时中断）
│   └── 暂停/恢复/音量动态调节
│
├── 📋 语音指令处理器 (VoiceCommandHandler.ts)
│   ├── 支持全部6条Demo版语音指令：
│   │   1. 退出疗愈（"退出疗愈"/"关闭助手"）
│   │   2. 播放音乐（"播放舒缓音乐"）
│   │   3. 停止音乐（"停止音乐"）
│   │   4. 找停车点（"找附近停车点"）
│   │   5. 深呼吸放松（"帮我做深呼吸放松"）
│   │   6. 情绪倾诉（"我很生气/很烦/很累"）
│   └── 关键词匹配 + 正则扩展机制
│
├── 💬 连续对话管理器 (VoiceInteractionManager.ts) ⭐ 核心协调器
│   ├── 完整对话流程编排：
│   │   唤醒 → ASR监听 → 用户输入 → 指令解析
│   │   → Demo大模型回复 → TTS播报 → 恢复倾听
│   ├── 免唤醒30秒连续对话（上下文记忆）
│   ├── 对话会话管理（消息ID/角色/时间戳/轮次统计）
│   ├── Demo回复生成器（情绪分类→温柔话术库随机选取）
│   │   ├── 愤怒类：共情安抚话术
│   │   ├── 疲惫类：关怀建议话术
│   │   ├── 焦虑类：平复引导话术
│   │   ├── 问候类：温暖开场白
│   │   ├── 退出类：温柔告别
│   │   └── 各类指令对应确认回复
│   ├── 打断恢复机制（用户说话中断Agent播报）
│   ├── 与M2联动：形象状态随对话阶段自动切换
│   └── 与M1联动：超时自动退出/音频通道占用检测
│
├── 🔧 Store扩展（appStore M3新增字段）
│   ├── asrStatus / ttsStatus / conversationPhase
│   ├── currentSession（对话历史数据）
│   ├── agentResponseText / userInterimText（实时显示用）
│   ├── audioChannelBusy（通道占用标志）
│   └── getVoiceInteractionState() 状态快照方法
│
└── 🖥 DebugPanel升级（M3调试功能）
    ├── 语音交互状态实时显示（ASR/TTS/Phase/Channel）
    ├── 实时文字展示区（用户输入/Agent回复）
    ├── 「模拟说话」按钮（触发Demo对话流程）
    ├── 「测试播报」按钮（直接测试TTS引擎）
    ├── 「停止对话」按钮（强制停止语音交互）
    ├── 6条语音指令列表展示
    └── 对话历史最近5条消息展示
```

---

### 📋 待实现模块（按PRD顺序）

#### Module 4: 多维度情绪识别模块 (v1.0) ⭐ 新增
- **状态**: ✅ 已完成并可运行
- **PRD来源**: `4_多维度情绪识别模块 (智能座舱疗愈Agent v1 0 Demo).md`
- **完成日期**: 2026-05-11

**已实现功能清单**：

```
Module 4 核心功能:
│
├── 🧠 EmotionRecognitionEngine（情绪识别主引擎）
│   ├── 5大维度数据采集与融合：
│   │   ├── 1. VoiceAnalyzer — 语音语义&语气分析
│   │   │   ├── 关键词情绪匹配（愤怒/焦虑/烦躁/疲劳词汇库）
│   │   │   ├── 语义情感评分（正/负/中性打分）
│   │   │   └── 语速/语调/音量模拟（Demo版）
│   │   ├── 2. 面部表情特征采集（Demo版模拟数据）
│   │   ├── 3. 驾驶行为数据分析（Demo版模拟数据）
│   │   ├── 4. 心率监测特征（Demo版模拟数据）
│   │   └── 5. ProfileManager — 司机性格画像
│   │       ├── 易怒频次统计（0-1值）
│   │       ├── 性格标签沉淀（['内向','感性'...]）
│   │       ├── 历史情绪记录（最近20条，localStorage持久化）
│   │       └── 重置画像功能
│   │
│   ├── FusionEngine — 多维度加权融合引擎
│   │   ├── 各维度独立打分 (0-100)
│   │   ├── 权重体系：voice(40%) / facial(20%) / driving(15%) / heartRate(10%) / profile(15%)
│   │   └── 缺失维度自动降级重加权
│   │
│   ├── EmotionJudge — 阈值式情绪判定器
│   │   ├── 5种情绪类型判定：愤怒/焦虑/烦躁/疲劳/平稳
│   │   ├── 3级强度判定：high/medium/low
│   │   ├── 6种驾驶场景标签：拥堵/高速/市区/怠速/夜间/通用
│   │   └── 综合置信度输出
│   │
│   └── 非阻塞设计（Fire-and-Forget）
│       ├── 异步识别，不阻塞对话回复
│       ├── 每个会话仅首次发言触发识别
│       └── 完成后回调驱动形象状态切换
│
├── 🔗 M3集成（VoiceInteractionManager依赖注入）
│   ├── EmotionEngine通过构造函数注入
│   ├── handleUserInput()中自动触发识别
│   ├── setEmotionEngine()公开设置接口
│   └── 会话开始时重置识别状态
│
├── 🎭 情绪→形象联动（appStore.applyEmotionToAvatar）
│   ├── anger → startHealing（疗愈光效）
│   ├── anxiety / irritability → startListening（倾听姿态）
│   ├── fatigue → startHealing（疗愈光效）
│   └── calm → backToIdle（正常待机）
│
├── 🗂 类型体系扩展（types/index.ts）
│   ├── EmotionType / EmotionIntensity / DrivingScenario 枚举
│   ├── 5个维度特征接口（VoiceFeature/FacialFeature/DrivingFeature/HeartRateFeature/DriverProfile）
│   ├── DimensionScores / EmotionResult / EmotionRecord 输出接口
│   └── EmotionRecognitionCallbacks 回调接口
│
├── 📦 Store扩展（appStore M4新增字段）
│   ├── emotionResult / isRecognizing
│   ├── driverProfile / emotionHistory
│   └── applyEmotionToAvatar() 联动方法
│
└── 🖥 DebugPanel升级（M4调试功能）
    ├── 情绪识别状态实时显示（识别状态/情绪类型/强度/场景/置信度/耗时）
    ├── 5维度加权分数可视化进度条（语音/面部/驾驶/心率/画像）
    ├── 司机画像详情折叠面板（易怒频次/交互次数/性格标签/历史记录数）
    ├── 「模拟情绪识别」按钮（随机测试文本直接调用引擎）
    └── 「重置画像」按钮（清空localStorage画像数据）
```

---

### 📋 待实现模块（按PRD顺序）

#### Module 8: 车企个性化配置模块 (v1.0) ⭐ 新增
- **状态**: ✅ 已完成并可运行
- **PRD来源**: `8_车企个性化配置模块 (智能座舱疗愈Agent v1 0 Demo).md`
- **完成日期**: 2026-05-12

**已实现功能清单**：

```
Module 8 核心功能:
│
├── 🏭 OEMConfig（车企个性化配置管理服务）
│   ├── 出厂预置配置体系（localStorage持久化）
│   ├── 6项可定制配置项：
│   │   ├── 品牌名（brandName）
│   │   ├── 品牌开场问候语（greetingPhrase，唤醒后首次播报）
│   │   ├── 2D虚拟形象主题ID（avatarThemeId）
│   │   ├── TTS疗愈音色（4种预设：默认治愈女声/温暖男声/柔和女声/沉稳男声）
│   │   ├── 无交互超时时长（15s/30s/60s 三档可选）
│   │   ├── 疗愈话术风格（温柔治愈风/沉稳理性风）
│   │   ├── 唤醒词（出厂固化，可替换）
│   │   └── 品牌slogan（就绪页副标题）
│   ├── 配置校验与兜底：
│   │   ├── 配置缺失 → 自动使用Demo默认配置
│   │   ├── 超时值非法 → 强制固定30s兜底
│   │   ├── 话术风格无效 → 启用温柔治愈默认
│   │   └── 音色无效 → 使用默认治愈女声
│   ├── 用户侧完全隐藏：无任何配置入口
│   ├── 不可热更新（需刷机/系统升级生效）
│   └── presetConfig() 出厂烧录接口 + resetToDefault() 调试重置
│
├── 🔗 各模块车企配置集成
│   ├── App.vue 初始化：OEMConfig 最先加载 → 配置写入 store
│   ├── AutoExitManager：车企超时时长覆盖默认30s
│   ├── TTSEngine：车企音色偏好（语速/音调/音量参数）覆盖默认
│   ├── EmpatheticResponder：车企话术风格（沉稳理性风→去除语气词/精简表达）
│   ├── VoiceInteractionManager：ResponseContext 传递 oemStyle
│   ├── 就绪页UI：唤醒词/品牌slogan 动态渲染
│   └── 唤醒后首次：车企定制问候语 TTS 播报
│
├── 🗂 类型体系扩展（types/index.ts）
│   ├── OEMHealingStyle 枚举（GENTLE温柔治愈 / CALM沉稳理性）
│   ├── OEMTTSVoice 枚举（4种预设音色）
│   ├── OEMConfigData 接口（8项车企配置完整定义）
│   └── OEMConfigState 接口（加载状态/是否车企模式/加载来源）
│
├── 📦 Store扩展（appStore M8新增字段）
│   └── oemConfigState（完整车企配置状态）
│
└── 🖥 DebugPanel升级（M8调试功能）
    ├── 车企配置状态实时显示（来源/品牌名/唤醒词/话术风格/TTS音色/超时时长/形象主题）
    ├── 「📢 预览问候语」按钮（TTS播报车企定制问候语）
    ├── 「🔄 重置为默认」按钮（恢复Demo默认配置）
    └── 控制台输出含 M8 状态
```

---

## 三、代码架构说明
- **状态**: ✅ 已完成并可运行
- **PRD来源**: `5_核心疗愈服务模块 (智能座舱疗愈Agent v1 0 Demo).md`
- **完成日期**: 2026-05-11

**已实现功能清单**：

```
Module 5 核心功能:
│
├── 💬 EmpatheticResponder（情绪感知共情对话回复）
│   ├── 替代原始 DEMO_RESPONSES，维度更丰富
│   ├── 按 (情绪类型, 强度) 二级话术库匹配
│   ├── 5种情绪 × 3级强度 = 15种回复组合
│   ├── 司机画像感知：易怒频次高→追加耐心共情；内向性格→安静陪伴
│   ├── 驾驶场景附加安抚（拥堵/夜间/高速，30%概率触发）
│   └── 指令确认回复独立话术库
│
├── 🎵 MusicPlayer（舒缓音乐播放服务）
│   ├── Web Audio API 合成环境音（Demo版无需真实音频文件）
│   ├── 5首内置治愈曲目（正弦波/三角波合成，不同频率）
│   ├── 播放/暂停/停止/下一首完整控制
│   ├── 2秒淡入 + 0.5秒淡出音效过渡
│   ├── 30秒自动切歌 + 顺序循环播放
│   ├── 音量动态调节 (0-1)
│   └── 音频通道被抢占时自动暂停，释放后恢复
│
├── 🌬 BreathGuide（深呼吸正念引导）
│   ├── 标准节奏：吸气4s → 屏息4s → 呼气6s
│   ├── 默认3个循环（可配置）
│   ├── TTS逐步语音引导（开场白→吸气→屏息→呼气→完成总结）
│   ├── 阶段实时状态上报（IDLE/INHALE/HOLD/EXHALE/COMPLETE）
│   ├── 支持中途语音停止
│   └── 完成后自动恢复对话
│
├── 🅿 ParkingFinder（临时停车点推荐）
│   ├── Demo模拟停车点数据库（6个点位）
│   ├── 按距离排序推荐2-3个安全停车区
│   ├── 类型覆盖：服务区/停车场/路边休息区/临时停车区
│   ├── 语音播报生成（名称+方位+距离）
│   └── 后续可替换为真实地图API
│
├── 💊 HealingService（疗愈策略编排器）⭐ 核心
│   ├── 情绪→策略自动匹配：
│   │   ├── 愤怒 → 共情对话 + 可选音乐/呼吸/停车推荐
│   │   ├── 焦虑/烦躁 → 轻度疏导 + 舒缓音乐/呼吸引导
│   │   ├── 疲劳 → 温柔关怀 + 放松音乐
│   │   └── 平稳 → 日常闲聊陪伴
│   ├── 语音指令统一处理（play/stop/breath/parking）
│   ├── 停止呼吸引导指令识别
│   ├── 会话结束时自动停止所有疗愈服务
│   └── 状态统一上报到 appStore
│
├── 🔗 M3集成升级
│   ├── VoiceInteractionManager 新增 HealingService 依赖注入
│   ├── setHealingService() 公开设置接口
│   ├── 疗愈类指令优先交由 HealingService 处理
│   ├── 回复生成双模式：有HealingService→EmpatheticResponder，无→降级Demo
│   └── 对话停止时自动 stopAll() 清理疗愈状态
│
├── 🔗 M4集成（情绪→策略联动）
│   ├── 情绪识别完成后自动 matchStrategy()
│   ├── 策略结果存入 healingServiceState
│   └── 个性化话术结合情绪上下文
│
├── 🗂 类型体系扩展（types/index.ts）
│   ├── MusicPlayState / MusicTrack / MusicPlayerState
│   ├── BreathPhase / BreathGuideConfig / BreathGuideState
│   ├── ParkingSpot
│   ├── HealingStrategy / HealingStrategyMatch / HealingServiceState
│
├── 📦 Store扩展（appStore M5新增字段）
│   ├── healingServiceState（完整疗愈状态快照）
│   └── setHealingServiceState()
│
└── 🖥 DebugPanel升级（M5调试功能）
    ├── 疗愈策略实时显示（当前策略/策略原因）
    ├── 音乐播放状态（状态/曲目/音量）
    ├── 呼吸引导状态（阶段/轮次/已用时间）
    ├── 停车点推荐列表（名称/方位/距离）
    ├── 4个操作按钮（播放音乐/停止音乐/呼吸引导/停止所有）
    └── 控制台输出含 M5 状态
```

---

### 📋 待实现模块（按PRD顺序）

#### Module 6: 司机性格画像 & 个性化定制模块 (v1.0) ⭐ 新增
- **状态**: ✅ 已完成并可运行
- **PRD来源**: `6_司机性格&用户画像模块 (智能座舱疗愈Agent v1 0 Demo).md`
- **完成日期**: 2026-05-12

**已实现功能清单**：

```
Module 6 核心功能:
│
├── 🧑 ProfileEngine（多维度画像引擎）
│   ├── 双轴性格模型：
│   │   ├── 外向/内向维度（基于平均倾诉长度推算，-1~+1）
│   │   └── 感性/理性维度（基于负面情绪频率推算，-1~+1）
│   ├── 情绪习惯标签体系（4种标签）：
│   │   ├── 易激怒（愤怒占比>30%）
│   │   ├── 易焦虑（焦虑占比>25%）
│   │   ├── 易疲劳（疲劳占比>25%）
│   │   └── 路况敏感（拥堵场景触发>=3次）
│   ├── 交互风格偏好（3种风格）：
│   │   ├── 爱闲聊型（倾诉长+轮次多）
│   │   ├── 沉默倾听型（倾诉短+轮次少）
│   │   └── 均衡型（其他情况）
│   ├── 情绪类型统计（anger/anxiety/irritability/fatigue/calm 各次数+占比）
│   ├── 场景触发统计（拥堵/高速/市区/怠速/夜间/通用各次数）
│   ├── 驾驶时段偏好（早高峰/晚高峰/夜间/其他）
│   ├── 画像稳定性等级（新用户<5次/形成中5-15次/已稳定>15次）
│   ├── 平均倾诉长度 / 平均对话轮次
│   ├── 向下兼容 M4 DriverProfile（自动同步 personalityTags）
│   ├── localStorage 独立存储（healing_agent_enhanced_profile）
│   └── 最少5次交互才启动性格标签分析（避免新用户误判）
│
├── 🎨 StyleAdapter（个性化话术风格适配器）
│   ├── 根据增强画像自动推算话术风格：
│   │   ├── 外向用户 → 轻松闲聊式（chattyStyle）
│   │   ├── 内向用户 → 安静温柔共情式（quietStyle）
│   │   ├── 感性用户 → 偏情感共鸣（高共情度）
│   │   ├── 理性用户 → 偏冷静疏导（适中共情度）
│   │   ├── 易激怒 → 共情度拉高+话术更耐心
│   │   ├── 易疲劳 → 话术更简短温柔
│   │   └── 路况敏感 → 适度提升共情度
│   ├── 输出 PersonalizedStyle 配置：
│   │   ├── tone（语气描述：温柔陪伴/轻松闲聊/安静共情/感性共鸣/冷静疏导/温柔关怀）
│   │   ├── empathyLevel（共情程度 0-1）
│   │   ├── verbosity（话术详略度 0-1）
│   │   ├── chattyStyle / quietStyle（布尔标记）
│   │   └── 新用户使用默认基准风格
│
├── 💬 EmpatheticResponder 升级（M6 画像深度参与话术）
│   ├── ResponseContext 扩展：enhancedProfile + style
│   ├── 话术详略控制（verbosity高→保留完整话术，低→截取前半段）
│   ├── 安静陪伴型后缀（内向+愤怒）
│   ├── 轻松闲聊型后缀（外向+负面情绪，40%概率）
│   ├── 高共情后缀（易怒画像+高强度愤怒）
│   ├── 路况敏感专属安抚（拥堵场景）
│   ├── 易疲劳关怀后缀（高强度疲劳）
│   ├── 问候话术分风格（chatty/quiet/default三套）
│   ├── 闲聊话术分详略（verbose/concise/default三套）
│   └── StyleAdapter 实例集成
│
├── 💊 HealingService 升级（画像差异化疗愈策略）
│   ├── matchStrategy() 新增 enhancedProfile 参数
│   ├── 易激怒用户+愤怒 → 自动推荐呼吸引导
│   ├── 路况敏感用户 → 可选停车推荐
│   ├── 易疲劳用户+疲劳 → 优先舒缓音乐
│   ├── 内向用户+平稳情绪 → 安静陪伴模式（不推荐额外服务）
│   └── 策略原因多因素拼接（|分隔）
│
├── 🔗 M4 集成升级（EmotionRecognition → ProfileEngine）
│   ├── EmotionRecognitionEngine 新增 setProfileEngine()
│   ├── 情绪识别完成后自动同步到 ProfileEngine
│   ├── 传入倾诉文本长度用于性格分析
│   ├── getEnhancedProfile() 读取增强画像
│   └── resetProfile() 同时重置增强画像
│
├── 🔗 M3 集成升级（VoiceInteractionManager → 画像数据）
│   ├── generateEmpatheticResponse() 传入增强画像+风格
│   ├── 通过 useAppStore 实时读取最新画像数据
│   └── EmpatheticResponder 获得 ResponseContext 全量数据
│
├── 🗂 类型体系扩展（types/index.ts）
│   ├── PersonalityDimension / RationalDimension 枚举
│   ├── EmotionHabitTag / InteractionStyle / ProfileStability 枚举
│   ├── ScenarioTriggerStats / EmotionTypeStats / DrivingTimePreference 接口
│   ├── EnhancedDriverProfile（继承DriverProfile，新增12个M6字段）
│   ├── ProfileEngineCallbacks / PersonalizedStyle 接口
│
├── 📦 Store扩展（appStore M6新增字段）
│   ├── enhancedProfile（完整增强画像）
│   ├── personalizedStyle（当前话术风格配置）
│   ├── setEnhancedProfile()（自动同步M4兼容字段）
│   └── setPersonalizedStyle()
│
└── 🖥 DebugPanel升级（M6调试功能）
    ├── 性格维度实时显示（外向/内向+感性/理性双轴数值+标签）
    ├── 画像稳定性等级（新用户/形成中/已稳定）
    ├── 交互风格偏好（爱闲聊/沉默倾听/均衡）
    ├── 情绪习惯标签展示（4种标签，各带颜色图标）
    ├── 话术风格配置（语气/共情程度/详略度/风格标签）
    ├── 情绪类型统计可视化（5种情绪渐变进度条+次数+百分比）
    ├── 辅助数据展示（总交互/平均倾诉长度/平均轮次/历史数）
    └── 控制台输出含 M6 状态
```

#### Module 7: 本地数据存储&隐私模块 (v1.0) ⭐ 新增
- **状态**: ✅ 已完成并可运行
- **PRD来源**: `7_本地数据存储&隐私模块 (智能座舱疗愈Agent v1 0 Demo).md`
- **完成日期**: 2026-05-12

**已实现功能清单**：

```
Module 7 核心功能:
│
├── 📦 DataStore（本地数据存储&隐私管理服务）
│   ├── 全部数据仅本地存储，不上云、不上报、不对外共享
│   ├── 轻量加密存储（XOR + Base64，防止本地文件明文泄露）
│   ├── 数据最小化原则：
│   │   ├── ✅ 允许存储：情绪类型/强度、场景标签、会话统计、性格画像、疗愈偏好
│   │   └── 🚫 禁止存储：原始语音、ASR完整文本、面部原图、心率原始值、地理位置
│   ├── 数据过滤层（写入前自动剔除敏感字段）
│   ├── 串行写入队列（避免并发写入冲突）
│   ├── 会话结束后台静默写入（不阻塞交互）
│   ├── 加密解析失败自动使用默认空数据
│   ├── 座舱上电自动读取本地画像与历史记录
│   └── 独立存储键管理（healing_agent_data_vault / session_logs / healing_preference / data_store_state）
│
├── 🗑 语音一键清空数据
│   ├── 语音指令触发：「清除我的情绪记录」
│   ├── 口语二次确认：「确认清除吗」→ 回答"确认"或"取消"
│   ├── 15秒超时自动取消（保护误操作）
│   ├── 清空范围：情绪事件 + 会话日志 + 画像 + 偏好记录
│   ├── 清空后恢复出厂默认基准画像
│   ├── 事务式清空：部分失败则整体回滚，保留原数据
│   └── 立即生效，无需重启座舱
│
├── 📊 数据存储状态管理
│   ├── 存储就绪状态、总条目数、情绪事件数、会话日志数
│   ├── 写入队列长度（实时监控）
│   ├── 上次写入时间、上次清空时间
│   └── 清空确认状态（idle/pending/confirmed/cancelled）
│
├── 🔗 M3 集成升级（VoiceInteractionManager → 会话结束钩子）
│   ├── VoiceInteractionCallbacks 新增 onSessionEnd 回调
│   ├── stop() 时自动触发 onSessionEnd（传入会话数据+情绪结果）
│   └── App.vue 接收回调 → 调用 DataStore.recordSessionEnd()
│
├── 🔗 M4+M5 集成（情绪事件记录 + 策略使用记录）
│   ├── 情绪识别完成 → DataStore.recordEmotionEvent()（脱敏存储）
│   ├── 疗愈策略匹配 → DataStore.recordStrategyUsage()
│   └── 语音指令执行 → DataStore.updateHealingPreference()
│
├── 🔗 M6 集成（清空后自动重置增强画像）
│   ├── 清空成功 → profileEngine.reset()
│   ├── 重置后重新同步到 appStore（enhancedProfile + personalizedStyle）
│   └── 语音播报确认结果
│
├── 🗂 类型体系扩展（types/index.ts）
│   ├── DataCategory 枚举（EMOTION_EVENT / SESSION_LOG / DRIVER_PROFILE / HEALING_PREFERENCE）
│   ├── FilteredData / SessionLogEntry / HealingPreference 接口
│   ├── DataStoreState（存储管理状态）
│   └── ClearConfirmState 枚举（IDLE / PENDING / CONFIRMED / CANCELLED）
│
├── 📦 Store扩展（appStore M7新增字段）
│   ├── dataStoreState（完整数据存储状态）
│   └── clearConfirmState（清空确认状态）
│
└── 🖥 DebugPanel升级（M7调试功能）
    ├── 数据存储状态实时显示（就绪/总条目/情绪事件/会话日志/队列/写入时间/清空时间）
    ├── 清空确认状态（空闲/等待确认/已确认/已取消，等待确认时闪烁动画）
    ├── 「📋 导出数据」按钮（输出所有本地数据到控制台）
    ├── 「🗑 模拟清空指令」按钮（触发清空流程+自动确认）
    └── 控制台输出含 M7 状态
```

---

#### Module 9: 全局交互&异常处理规范 (v1.0) ⭐ 新增
- **状态**: ✅ 已完成并可运行
- **PRD来源**: `9_全局交互&异常处理规范 (智能座舱疗愈Agent v1 0 Demo).md`
- **完成日期**: 2026-05-12

**已实现功能清单**：

```
Module 9 核心功能:
│
├── 🛡️ GlobalErrorHandler（全局异常处理器）
│   ├── window.onerror 全局同步异常兜底（阻止默认弹窗）
│   ├── unhandledrejection 异步Promise异常兜底
│   ├── 错误分级体系（LOW静默 / MEDIUM功能受限 / HIGH关键不可用）
│   ├── 15个模块降级策略自动映射：
│   │   ├── asr → 语音识别不可用
│   │   ├── tts → 仅保留文字回复
│   │   ├── audio → 暂停倾听
│   │   ├── emotion → 使用默认基准模型
│   │   ├── healing → 本地预设话术兜底
│   │   ├── music/呼吸/停车 → 温和提示/可重新发起
│   │   ├── profile → 保留历史标签
│   │   ├── datastore → 自动过滤
│   │   ├── oem → 回落Demo默认
│   │   └── avatar → 隐藏形象保留语音
│   ├── 最多50条错误日志（FIFO，防止内存泄漏）
│   ├── 降级模块追踪（degradedModules标记）
│   ├── 错误统计（总数/按等级/按来源）
│   ├── 实时监听器（onChange回调 → store同步）
│   └── 安装/卸载全局处理器生命周期管理
│
├── 🔊 AudioPriorityManager（音频优先级管理器）
│   ├── 4级优先级：通话(0) > 导航(1) > 疗愈(2) > 音乐(3)
│   ├── 通道抢占规则：
│   │   ├── 高优先级源可抢占低优先级
│   │   ├── 同级源不可互抢
│   │   └── 通道释放后自动恢复
│   ├── 疗愈播放策略：
│   │   ├── 通话中 → 完全禁止播放/监听
│   │   ├── 导航播报中 → 降低音量至40%
│   │   └── 空闲 → 正常播放
│   ├── 唤醒拦截：通话中自动拦截唤醒，静默待命
│   ├── 状态变更实时回调（onChange → store同步）
│   └── 模拟抢占/释放接口（Demo调试用）
│
├── 🔗 各模块全局异常集成
│   ├── App.vue：GlobalErrorHandler + AudioPriorityManager 最先初始化
│   ├── App.vue：唤醒处理增加音频通道占用检查
│   ├── VoiceInteractionManager：start() 增加音频通道拦截
│   ├── VoiceInteractionManager：catch 块报告到 GlobalErrorHandler
│   └── 常量：统一降级兜底话术（FALLBACK_RESPONSES）
│
├── 🗂 类型体系扩展（types/index.ts）
│   ├── ErrorSeverity 枚举（LOW/MEDIUM/HIGH）
│   ├── ErrorSource 类型（15个模块来源）
│   ├── ErrorLogEntry 接口（异常记录结构）
│   ├── DegradationAction 接口（降级策略描述）
│   ├── GlobalErrorState 接口（全局异常状态快照）
│   ├── AudioChannelEvent 枚举（OCCUPIED/RELEASED）
│   └── AudioChannelState 接口（通道状态）
│
├── 📦 Store扩展（appStore M9新增字段）
│   ├── globalErrorState（完整异常处理状态）
│   ├── audioChannelState（音频通道状态）
│   ├── setGlobalErrorState()
│   └── setAudioChannelState()
│
├── 📐 常量扩展（constants.ts）
│   ├── MAX_ERROR_LOG_COUNT（50条上限）
│   ├── DEGRADE_CONFIRM_TIMEOUT（降级确认超时）
│   ├── AUDIO_CONFLICT_CHECK_INTERVAL（通道冲突检测间隔）
│   └── FALLBACK_RESPONSES（6种降级兜底话术）
│
└── 🖥 DebugPanel升级（M9调试功能）
    ├── 全局异常统计（总数/HIGH/MEDIUM/LOW）
    ├── 音频通道状态实时显示（空闲/占用+来源）
    ├── 降级模块数量统计
    ├── 最近异常日志列表（最多8条，颜色分级）
    ├── 「🧪 模拟异常」按钮（随机生成模拟异常）
    ├── 「📞 模拟通话抢占」按钮（测试音频通道拦截）
    ├── 「✅ 释放通道」按钮（恢复空闲状态）
    ├── 「🗑 清空日志」按钮（重置异常记录）
    └── 控制台输出含 M9 状态
```

---

#### Module 10: 大模型调度模块 (v1.0) ⭐ 新增
- **状态**: ✅ 已完成并可运行
- **PRD来源**: `文档1：Agent大模型调度模块PRD.md`
- **完成日期**: 2026-05-13

**已实现功能清单**：

```
Module 10 核心功能:
│
├── 🤖 ModelHub（大模型统一调度中心）
│   ├── 统一封装本地Ollama推理 + 主流云端API模型
│   ├── 一套接口、多模型无缝切换
│   ├── 9种模型预设支持：
│   │   ├── 本地：Qwen2.5 7B / LLaMA 3.2 3B
│   │   ├── OpenAI：GPT-4o / GPT-3.5 Turbo
│   │   ├── DeepSeek Chat
│   │   ├── 豆包（火山方舟）
│   │   ├── 通义千问 Plus
│   │   ├── Moonshot Kimi
│   │   └── Anthropic Claude 3.5 Sonnet
│   ├── Ollama动态模型发现（GET /api/tags）
│   ├── API Key .env统一管理（缺失不报错，使用时才提示）
│   ├── 模型热切换（无需重启，保留对话上下文）
│   ├── 自动降级（API异常 → Ollama本地兜底）
│   ├── 切换锁机制（防止并发切换）
│   └── 统一入参出参格式（OpenAI ChatCompletion兼容）
│
├── 🧩 系统提示词构建
│   ├── 角色设定（小疗，温柔简洁，不超80字）
│   ├── 情绪上下文注入（当前情绪类型+强度）
│   ├── 个性化风格注入（共情度/详略度/交互风格）
│   ├── 车企风格适配（沉稳理性风→精简表达）
│   └── 对话历史最近10轮作为上下文
│
├── 🔗 M3集成升级（VoiceInteractionManager → LLM调用）
│   ├── setModelHub() 注入大模型调度中心
│   ├── generateAndSpeakResponse() 三级降级链：
│   │   1. ModelHub 调用大模型（优先）
│   │   2. EmpatheticResponder 情绪感知回复（降级）
│   │   3. Demo 规则匹配回复（兜底）
│   └── 系统提示词自动构建（buildSystemPrompt）
│
├── 🗂 类型体系扩展（types/index.ts）
│   ├── LLMProvider 枚举（7种提供商）
│   ├── LLMModelStatus 枚举（5种状态）
│   ├── LLMModelInfo 接口（模型信息）
│   ├── LLMMessage 接口（统一对话消息）
│   ├── LLMChatRequest / LLMChatResponse（统一入参出参）
│   ├── LLMModelState 接口（调度状态快照）
│   └── ErrorSource 扩展新增 'llm' 来源
│
├── 📦 Store扩展（appStore M10新增字段）
│   ├── llmModelState（大模型调度完整状态）
│   └── setLLMModelState()
│
├── 📐 常量扩展（constants.ts）
│   ├── OLLAMA_BASE_URL（Ollama服务地址）
│   ├── LLM_REQUEST_TIMEOUT（15s推理超时）
│   ├── LLM_SWITCH_TIMEOUT（30s切换超时）
│   ├── OLLAMA_HEALTH_CHECK_TIMEOUT（3s健康检测）
│   ├── LLM_DEFAULT_TEMPERATURE / MAX_TOKENS
│   └── LLM_API_KEY_ENV_MAP（环境变量映射表）
│
├── 🔐 环境变量（.env）
│   ├── VITE_OLLAMA_BASE_URL
│   ├── VITE_OPENAI_API_KEY / DEEPSEEK / DOUBAO
│   ├── VITE_QWEN_API_KEY / MOONSHOT / ANTHROPIC
│   └── env.d.ts ImportMetaEnv 类型声明
│
└── 🖥 DebugPanel升级（M10调试功能）
    ├── Ollama服务就绪状态显示
    ├── 当前模型ID + 模型状态显示
    ├── API Keys配置数量统计
    ├── 模型列表展示（本地/API标签 + 状态 + 切换按钮）
    ├── 「💬 测试大模型对话」按钮（随机测试文本→LLM→TTS播报）
    ├── 「🔄 刷新模型列表」按钮（重新检测Ollama模型）
    └── 控制台输出含 M10 状态
```

---

#### Module 11: 疗愈策略&提示词工程模块 (v1.0) ⭐ 新增
- **状态**: ✅ 已完成并可运行
- **PRD来源**: `文档2：疗愈策略&提示词工程模块PRD.md`
- **完成日期**: 2026-05-13

**已实现功能清单**：

```
Module 11 核心功能:
│
├── 🧠 StrategyEngine（疗愈策略引擎）
│   ├── 驾驶情景管理（6种预设情景，支持前端增删改启停）
│   │   ├── 拥堵路段 / 高速公路 / 市区通勤
│   │   ├── 怠速等待 / 夜间长途 / 通用场景（兜底）
│   │   └── 每个情景支持 enabled 启停控制
│   ├── 情绪×情景二维策略匹配（核心路由）：
│   │   ├── 18条预设策略规则（6场景×5情绪全覆盖，部分场景重点覆盖）
│   │   ├── 每条规则独立配置：专属系统Prompt + 专属Few-shot示例
│   │   ├── 三级降级链：精准匹配 > 相似情景降级 > 通用兜底
│   │   ├── 相似情景映射（如 traffic_jam → city → general）
│   │   └── 终极兜底：内置基础提示词 + 情绪类型补充指令
│   ├── 性格标签二次微调：
│   │   ├── 外向/内向维度 → 闲聊/安静陪伴风格调整
│   │   ├── 感性/理性维度 → 情感共鸣/冷静疏导风格调整
│   │   ├── 情绪习惯标签 → quick_temper/anxiety_prone/fatigue_prone/route_sensitive
│   │   └── 微调片段动态追加到策略Prompt末尾
│   ├── 策略缓存机制：
│   │   ├── 同场景+同情绪短时缓存（60秒TTL）
│   │   ├── FIFO淘汰（最多20条缓存）
│   │   ├── 缓存仅缓存基础规则，性格微调实时注入
│   │   └── 手动清除缓存接口
│   ├── 策略CRUD接口（upsertScenario/upsertRule/toggleScenario/toggleRule）
│   └── 实时状态回调 → appStore同步
│
├── 📝 PromptManager（提示词工程管理器）
│   ├── 策略模板变量注入系统：
│   │   ├── 情绪上下文（类型+强度+置信度）
│   │   ├── 驾驶场景（中文标签）
│   │   ├── 时间感知（早晨/上午/中午/下午/傍晚/深夜）
│   │   ├── 个性化风格（共情度/详略度/闲聊/安静）
│   │   ├── 车企风格叠加（沉稳理性风 → 去除语气词/精练表达）
│   │   ├── 画像稳定性提示（新用户 → 通用温和风格）
│   │   └── 高强度情绪额外警示
│   ├── Few-shot样本管理：
│   │   ├── 每条策略规则独立配置专属示例（2-5组user/assistant对话）
│   │   ├── Few-shot引导说明自动注入
│   │   └── 最大5组截断（防止超出上下文窗口）
│   ├── 对话历史注入：
│   │   ├── 最近10轮对话作为上下文
│   │   ├── 历史引导说明自动注入
│   │   └── 自动过滤 system 消息
│   └── 完整消息组装：system → few-shot → history → [用户当前消息]
│
├── 📐 策略配置文件（strategy-config.ts）
│   ├── DEFAULT_SCENARIOS（6种驾驶情景定义）
│   ├── DEFAULT_STRATEGY_RULES（18条策略规则，含Prompt模板+Few-shot）
│   ├── BASE_SYSTEM_PROMPT（通用基础系统提示词）
│   ├── PERSONALITY_ADJUSTMENTS（8种性格微调模板）
│   ├── SCENARIO_FALLBACK_MAP（5种情景→降级映射）
│   └── OEM_STYLE_PROMPT_OVERRIDES（车企风格叠加模板）
│
├── 🔗 M3+M10集成升级（VoiceInteractionManager → 策略驱动LLM调用）
│   ├── setStrategyEngine() + setPromptManager() 注入接口
│   ├── getLastStrategyResult() 获取最近匹配结果
│   ├── generateLLMResponse() 升级为策略驱动：
│   │   ├── M11完整路径：StrategyEngine.match() → PromptManager.buildMessages() → ModelHub.chat()
│   │   └── M10降级路径：buildSystemPrompt() 简单拼接（当StrategyEngine不可用时）
│   └── 策略匹配日志输出（策略ID + 匹配原因 + 耗时）
│
├── 🗂 类型体系扩展（types/index.ts）
│   ├── DrivingScenarioInfo（驾驶情景信息）
│   ├── FewShotExample（Few-shot示例对话）
│   ├── StrategyRule（策略规则定义）
│   ├── StrategyEngineResult（策略引擎匹配结果）
│   ├── PromptBuildContext（提示词构建上下文）
│   └── StrategyEngineState（策略引擎状态快照）
│
├── 📦 Store扩展（appStore M11新增字段）
│   ├── strategyEngineState（完整策略引擎状态）
│   └── setStrategyEngineState()
│
├── 📐 常量扩展（constants.ts）
│   ├── STRATEGY_MATCH_TIMEOUT（500ms匹配超时）
│   ├── STRATEGY_CACHE_TTL（60秒缓存过期）
│   ├── STRATEGY_CACHE_MAX_SIZE（20条缓存上限）
│   ├── FEWSHOT_MAX_COUNT（5组Few-shot上限）
│   ├── CONVERSATION_HISTORY_MAX_TURNS（10轮历史上限）
│   └── StrategyEngineOnChange 类型
│
└── 🖥 DebugPanel升级（M11调试功能）
    ├── 策略引擎就绪状态显示
    ├── 情景数量 / 策略规则数量统计
    ├── 缓存命中率实时计算
    ├── 最近匹配结果展示（匹配原因 + 耗时）
    ├── 策略规则列表展示（描述 + 启停状态 + 策略ID）
    ├── 「🧪 测试策略匹配」按钮（随机情绪+场景模拟匹配）
    ├── 「🗑 清除缓存」按钮（重置缓存计数）
    └── 控制台输出含 M11 状态（含最近策略匹配结果详情）
```

---

#### Module 12: Agent上下文记忆&对话管理 (v1.0) ⭐ 新增
- **状态**: ✅ 已完成并可运行
- **PRD来源**: `文档3：Agent上下文记忆&对话管理PRD.md`
- **完成日期**: 2026-05-13

**已实现功能清单**：

```
Module 12 核心功能:
│
├── 📝 ContextManager（上下文记忆管理器）
│   ├── 会话生命周期管理：
│   │   ├── 新唤醒 → initSession() 强制清空历史短期记忆
│   │   ├── 会话存续 → 持续保留上下文记忆
│   │   ├── 会话结束/超时 → destroy() 销毁本次所有会话记忆
│   │   └── 记忆隔离 → 不同会话记忆完全隔离
│   ├── 短期记忆库（仅内存缓存，不持久化落地）
│   │   ├── 会话级内存存储（进程回收自动清空）
│   │   ├── 长期画像仅沉淀情绪/性格标签，不保存对话原文
│   │   └── 隐私隔离（严格不保留敏感原话细节）
│   ├── 多轮上下文管理：
│   │   ├── 固定多轮格式：user:xxx / assistant:xxx
│   │   ├── 每一轮问答自动追加到上下文队列
│   │   ├── 上下文透传（每次LLM请求携带完整有效上下文）
│   │   └── 语义连续（模型基于历史对话理解情绪变化）
│   ├── 上下文阈值检测（双阈值管控）：
│   │   ├── 对话轮次阈值（默认8轮）← CONTEXT_MAX_TURNS
│   │   ├── Token字符阈值（默认1500）← CONTEXT_MAX_CHARS
│   │   ├── 任一达到即触发压缩
│   │   └── 阈值可配置（支持车企定制）
│   └── 超长上下文自动压缩：
│       ├── 达到阈值自动触发，无感知
│       ├── 调用LLM摘要能力（CONTEXT_COMPRESS_PROMPT模板）
│       ├── 提炼：用户核心情绪、触发原因、关键诉求、对话主旨
│       ├── 压缩摘要替代原始长上下文，后续基于摘要继续对话
│       ├── 压缩后重新计数，再次达到阈值可二次压缩
│       └── 压缩失败保留原上下文继续对话
│
├── 🔗 M3集成升级（VoiceInteractionManager → ContextManager）
│   ├── setContextManager() 注入接口
│   ├── handleUserInput() 中自动初始化会话（如果未初始化）
│   ├── handleUserInput() 中自动添加用户消息到上下文
│   ├── generateLLMResponse() 优先使用ContextManager上下文
│   ├── generateLLMResponse() 后自动添加助手回复到上下文
│   └── stop() 中自动清除上下文会话
│
├── 🗂 类型体系扩展（types/index.ts）
│   ├── ContextStats（上下文统计信息）
│   ├── ContextManagerState（上下文管理器状态快照）
│   └── 导入ContextManager类型
│
├── 📦 Store扩展（appStore M12新增字段）
│   ├── contextManagerState（完整上下文管理器状态）
│   └── setContextManagerState()
│
├── 📐 常量扩展（constants.ts）
│   ├── CONTEXT_MAX_TURNS（8轮阈值）
│   ├── CONTEXT_MAX_CHARS（1500字符阈值）
│   ├── CONTEXT_COMPRESS_PROMPT（压缩Prompt模板）
│   ├── CONTEXT_PRESERVE_RECENT_TURNS（压缩后保留3轮）
│   └── CONTEXT_COMPRESS_MAX_LENGTH（压缩摘要最大300字）
│
└── 🖥 DebugPanel升级（M12调试功能）
    ├── 会话状态显示（活跃/空闲）
    ├── 消息总数 / 对话轮次 / 字符数统计
    ├── 阈值进度可视化（接近阈值时红色警告）
    ├── 压缩状态展示（已压缩/未压缩）
    ├── 「初始化会话」按钮（手动创建新会话）
    ├── 「清除会话」按钮（手动销毁当前会话）
    └── 控制台输出含 M12 状态（含上下文统计详情）
```

---

## 三、代码架构说明

### 目录结构（更新后）

```
src/
├── core/                              # 【核心服务层】
│   ├── PermissionManager.ts           # ✓ M1: 权限管理器
│   ├── ResourceLoader.ts              # ✓ M1: 资源预加载器
│   ├── WakeListener.ts                # ✓ M1: 唤醒词监听服务
│   ├── LifecycleManager.ts            # ✓ M1: 生命周期总控
│   ├── AvatarAnimationController.ts   # ✨ M2: 形象动画状态机
│   └── AutoExitManager.ts             # ✨ M2: 30s超时自动退出
│   └── GlobalErrorHandler.ts          # ✨ M9: 全局异常处理
│   └── AudioPriorityManager.ts        # ✨ M9: 音频优先级管理
│   └── ModelHub.ts                    # ✨ M10: 大模型调度中心
│   └── StrategyEngine.ts              # ✨ M11: 疗愈策略引擎
│   └── ContextManager.ts             # ✨ M12: 上下文记忆管理
│
├── services/                          # 【业务服务层】
│   ├── AudioCapture.ts                # ✨ M3: 音频采集与降噪
│   ├── ASREngine.ts                   # ✨ M3: ASR语音转文字引擎
│   ├── TTSEngine.ts                   # ✨ M3: TTS语音合成引擎
│   ├── VoiceCommandHandler.ts         # ✨ M3: 语音指令处理器
│   ├── VoiceInteractionManager.ts     # ✨ M3+M4+M5+M6: 连续对话总控
│   ├── EmotionRecognition.ts          # ✨ M4+M6: 多维度情绪识别引擎
│   ├── EmpatheticResponder.ts         # ✨ M5+M6: 情绪感知共情对话
│   ├── MusicPlayer.ts                 # ✨ M5: 舒缓音乐播放服务
│   ├── BreathGuide.ts                 # ✨ M5: 深呼吸正念引导
│   ├── ParkingFinder.ts               # ✨ M5: 临时停车点推荐
│   ├── HealingService.ts              # ✨ M5+M6: 疗愈策略编排器
│   ├── ProfileEngine.ts               # ✨ M6: 多维度画像引擎
│   └── StyleAdapter.ts                # ✨ M6: 个性化话术风格适配器
│   └── DataStore.ts                   # ✨ M7: 本地数据存储&隐私管理
│   └── OEMConfig.ts                   # ✨ M8: 车企个性化配置管理
│   └── PromptManager.ts               # ✨ M11: 提示词工程管理器
│
├── components/                       # 【UI组件层】
│   ├── DebugPanel.vue                 # ✨ 升级: M3+M4 调试面板
│   ├── AvatarDisplay.vue              # ✓ M2: 完整CSS 2D虚拟形象
│   └── HealingPanel.vue               # ✨ 升级: M3对话文字展示
│
├── stores/
│   └── appStore.ts                    # ✨ 扩展: M3+M4 状态管理
│
├── types/
│   └index.ts                          # ✨ 大幅扩展: M3+M4类型体系
│
├── config/
│   ├── constants.ts                   # ✓ M1: 唤醒词/超时/降级配置
│   └── design-tokens.ts               # ✓ M2: UI色彩/圆角/动画/尺寸常量
│   └── strategy-config.ts             # ✨ M11: 策略规则/Prompt模板/Few-shot/性格微调配置
│
├── styles/
│   ├── global.scss                    # ✓ 座舱适配/夜间模式
│   └── design-mixins.scss             # ✓ SCSS变量/混入库
│
├── App.vue                            # ✨ 升级: M3+M4 全流程集成
├── main.ts                            # ✓ 入口文件
└── env.d.ts                           # ✓ 全局类型声明
```

### 关键类依赖关系（更新）

```javascript
// 主入口流程 (App.vue onMounted)
App.vue
  ├─> LifecycleManager (M1: 生命周期总管)
  │    ├─> PermissionManager (权限校验)
  │    ├─> ResourceLoader (资源加载)
  │    └─> WakeListener (唤醒监听)
  │
  ├─> AvatarAnimationController (M2: 形象动画状态机)
  │    └─> 状态变更 → 同步到 appStore.avatarAnimState
  │
  ├─> AutoExitManager (M2: 30s超时退出)
  │    └─> 超时触发 → appStore.triggerAutoExit()
  │
  ├─> ASREngine (M3: 语音转文字)
  │    └─> 结果回调 → VoiceInteractionManager
  │
  ├─> TTSEngine (M3: 语音合成)
  │    └─> 播报完成回调 → VoiceInteractionManager
  │
  ├─> VoiceCommandHandler (M3: 指令解析)
  │    └─> 指令匹配 → VoiceInteractionManager / App.vue handleVoiceCommand()
  │
  ├─> EmotionRecognitionEngine (M4+M6: 情绪识别) ⭐ 注入到VoiceInteractionManager
  │    ├─> VoiceAnalyzer (语音语义分析)
  │    ├─> FusionEngine (多维度融合)
  │    ├─> EmotionJudge (情绪判定)
  │    ├─> ProfileManager (司机画像, localStorage持久化)
  │    ├─> ProfileEngine (M6: 增强画像引擎, 双轴性格+习惯标签) ⭐ 新增
  │    └─> 识别完成 → appStore.applyEmotionToAvatar()
  │
  ├─> DataStore (M7: 本地数据存储&隐私管理) ⭐ 新增
  │    ├─> 会话结束 → recordSessionEnd()（脱敏日志加密存储）
  │    ├─> 情绪事件 → recordEmotionEvent()（过滤敏感字段后存储）
  │    ├─> 疗愈偏好 → updateHealingPreference()
  │    └─> 语音清空指令 → requestClear() + confirmClear()（二次确认+事务回滚）
  │
  ├─> OEMConfig (M8: 车企个性化配置管理) ⭐ 新增
  │    ├─> 座舱上电 → init()（加载车企预置配置）
  │    ├─> 配置应用 → AutoExitManager.setTimeout() / TTSEngine.updateConfig()
  │    ├─> 话术风格 → EmpatheticResponder.applyCalmStyle()
  │    ├─> 品牌问候 → 唤醒后TTS播报greetingPhrase
  │    └─> 出厂烧录 → presetConfig() / resetToDefault()
  │
  ├─> GlobalErrorHandler (M9: 全局异常处理) ⭐ 新增
  │    ├─> window.onerror / unhandledrejection 全局兜底
  │    ├─> 错误分级 → 模块降级策略自动匹配
  │    └─> 错误日志 → store同步（最多50条FIFO）
  │
  ├─> AudioPriorityManager (M9: 音频优先级管理) ⭐ 新增
  │    ├─> 通话中 → 拦截唤醒 + 禁止播放/监听
  │    ├─> 导航播报中 → 降低疗愈音量至40%
  │    └─> 通道状态 → store实时同步
  │
  ├─> HealingService (M5+M6: 疗愈策略编排) ⭐ 核心疗愈中枢
  │    ├─> EmpatheticResponder (M5+M6: 画像深度参与话术选择)
  │    ├─> MusicPlayer (舒缓音乐 Web Audio 合成)
  │    ├─> BreathGuide (深呼吸正念引导)
  │    ├─> ParkingFinder (停车点推荐 Demo)
  │    ├─> StyleAdapter (M6: 个性化话术风格适配) ⭐ 新增
  │    └─> 策略匹配(画像差异化) + 状态上报 → appStore.healingServiceState
  │
  └─> VoiceInteractionManager (M3: 对话总控) ⭐ 核心
       ├─> 协调 ASR ↔ TTS ↔ 指令 ↔ 回复生成
       ├─> 管理会话上下文 + 30s连续对话
       └─> 回调通知 App.vue → 更新形象/面板/UI

// 数据流向
LifecycleManager ──写入──> appStore (M1状态)
AvatarAnimationController ──写入──> appStore (M2状态)
AutoExitManager ──回调──> App.vue ──调用──> appStore.hidePanel()

// M3 新增数据流向
ASREngine ──中间结果──> appStore.userInterimText (实时输入显示)
TTSEngine ──播报文本──> appStore.agentResponseText (Agent回复显示)
VoiceInteractionManager ──会话──> appStore.currentSession (历史记录)
                      ──阶段──> appStore.conversationPhase (UI状态)

// M4 新增数据流向
EmotionRecognitionEngine ──结果──> appStore.emotionResult (情绪数据)
                              ──画像──> appStore.driverProfile (司机画像)
                              ──历史──> appStore.emotionHistory (情绪记录)
                              ──联动──> appStore.applyEmotionToAvatar() (形象切换)

// M5 新增数据流向
HealingService ──策略──> appStore.healingServiceState (疗愈状态)
                ──音乐──> MusicPlayer (Web Audio 播放)
                ──呼吸──> BreathGuide → TTSEngine (语音引导)
                ──停车──> ParkingFinder → TTSEngine (语音播报)

// M6 新增数据流向
ProfileEngine ──增强画像──> appStore.enhancedProfile (M6增强画像)
             ──自动同步──> appStore.driverProfile (M4兼容字段)
StyleAdapter ──风格──> appStore.personalizedStyle (话术风格配置)
EmpatheticResponder ──读取──> enhancedProfile + personalizedStyle (个性化话术)
HealingService ──读取──> enhancedProfile (差异化疗愈策略)
EmotionRecognition ──同步──> ProfileEngine.recordEmotion() (画像迭代)

// M7 新增数据流向
DataStore ──会话日志──> localStorage 加密存储（串行写入队列）
         ──情绪事件──> localStorage 加密存储（脱敏过滤后）
         ──疗愈偏好──> localStorage 加密存储
         ──清空──> 批量清除+事务回滚 → 重置ProfileEngine
         ──状态──> appStore.dataStoreState (存储管理状态)
VoiceInteractionManager ──onSessionEnd──> DataStore.recordSessionEnd() (会话结束时)

// M8 新增数据流向
OEMConfig ──车企配置──> appStore.oemConfigState (配置状态)
         ──超时──> AutoExitManager.setTimeout() (覆盖默认30s)
         ──音色──> TTSEngine.updateConfig() (语速/音调/音量)
         ──话术风格──> EmpatheticResponder (沉稳理性风精简表达)
         ──品牌问候──> TTSEngine.speak(greetingPhrase) (唤醒首次播报)
         ──唤醒词──> App.vue 就绪页动态渲染

// M9 新增数据流向
GlobalErrorHandler ──错误日志──> appStore.globalErrorState (异常状态)
               ──降级标记──> degradedModules (模块降级追踪)
               ──全局兜底──> window.onerror / unhandledrejection
AudioPriorityManager ──通道状态──> appStore.audioChannelState (通道状态)
                 ──通话拦截──> handleWakeDetected() (通话中禁止唤醒)
                 ──通道拦截──> VoiceInteractionManager.start() (通道占用时拒绝启动)

// M10 新增数据流向
ModelHub ──状态──> appStore.llmModelState (大模型调度状态)
         ──切换──> 切换锁 + 自动降级（API异常 → Ollama本地兜底）
         ──请求──> 统一入参出参（OpenAI ChatCompletion兼容格式）

// M11 新增数据流向
StrategyEngine ──匹配──> StrategyEngineResult (策略ID+Prompt+Few-shot+匹配原因)
               ──缓存──> 同场景同情绪短时缓存（60s TTL, 最多20条）
               ──性格──> 动态注入性格微调片段到策略Prompt
               ──状态──> appStore.strategyEngineState (引擎完整状态)
PromptManager ──组装──> LLM messages[] (system→few-shot→history→userMessage)
              ──变量──> 情绪/场景/时间/风格/车企/画像稳定性注入
VoiceInteractionManager ──策略驱动──> generateLLMResponse() 调用链：
  StrategyEngine.match() → PromptManager.buildMessages() → ModelHub.chat()

// M12 新增数据流向
ContextManager ──会话管理──> 短期记忆库（仅内存，不持久化）
               ──上下文累加──> user/assistant 消息自动追加
               ──阈值检测──> 轮次+字符双阈值监控
               ──自动压缩──> LLM摘要能力（提炼核心情绪/诉求/主旨）
               ──压缩替换──> 摘要替代原始长上下文
               ──会话销毁──> 清除内存（进程回收自动清空）
VoiceInteractionManager ──注入ContextManager()：
  handleUserInput() → initSession()（如果未初始化）
  handleUserInput() → addUserMessage()
  generateLLMResponse() → getContext()（优先使用ContextManager）
  generateLLMResponse() → addAssistantMessage()（回复后追加）
  stop() → clearSession()（会话结束销毁）

// 状态流向
App.vue ──读取──> appStore ──传递props──> HealingPanel → AvatarDisplay
DebugPanel ──读取──> appStore (全部状态可视化含M3+M4)
```

### 全局实例访问

在浏览器控制台可通过 `window.__HEALING_AGENT__` 访问：

```javascript
window.__HEALING_AGENT__ = {
  lifecycleManager,   // M1: 生命周期管理器实例
  animController,     // M2: 动画控制器
  autoExitMgr,        // M2: 自动退出管理器
  store,              // Pinia store（完整状态读写）
  // ===== M3 新增 =====
  asrEngine,          // M3: ASR引擎（可直接调用startListening/stopListening）
  ttsEngine,          // M3: TTS引擎（可直接调用speak/stop/pause）
  voiceInteraction,   // M3: 对话管理器（handleUserInput/start/stop）
  // ===== M4 新增 =====
  emotionEngine,       // M4: 情绪识别引擎（recognize/getDriverProfile/getEnhancedProfile/resetProfile）
  // ===== M5 新增 =====
  healingService,      // M5: 疗愈服务（musicPlayer/breathGuide/parkingFinder）
  // ===== M6 新增 =====
  profileEngine,       // M6: 增强画像引擎（getProfile/recordEmotion/reset）
  styleAdapter,        // M6: 话术风格适配器（adapt）
  // ===== M7 新增 =====
  dataStore,           // M7: 数据存储管理（init/recordSessionEnd/recordEmotionEvent/requestClear/exportData）
  // ===== M8 新增 =====
  oemConfig,           // M8: 车企配置管理（init/getConfig/presetConfig/resetToDefault/getTTSVoicePreference）
  // ===== M9 新增 =====
  globalErrorHandler,   // M9: 全局异常处理（handleError/recoverModule/installGlobalHandlers/clearLogs）
  audioPriorityMgr,     // M9: 音频优先级管理（request/release/canHealingSpeak/canListen/simulateOccupied）
  // ===== M10 新增 =====
  modelHub,             // M10: 大模型调度（chat/switchModel/init/destroy）
  // ===== M11 新增 =====
  strategyEngine,       // M11: 策略引擎（match/getScenarios/getRules/upsertRule/toggleRule/clearCache）
  promptManager,        // M11: 提示词管理器（buildMessages/buildSystemPrompt/buildFewShotMessages/buildHistoryMessages）
  // ===== M12 新增 =====
  contextManager,      // M12: 上下文管理器（initSession/addUserMessage/addAssistantMessage/compressContext/clearSession/getStats）
}
```

**M3 调试用法示例**：
```javascript
// 手动测试ASR
window.__HEALING_AGENT__.asrEngine.startListening(
  (result) => console.log('识别到:', result.text),
  (interim) => console.log('正在说:', interim)
)

// 手动测试TTS
window.__HEALING_AGENT__.ttsEngine.speak('你好，我是小疗')

// 模拟用户输入（绕过麦克风）
window.__HEALING_AGENT__.voiceInteraction.handleUserInput({
  text: '我很生气',
  isFinal: true,
  confidence: 0.95,
  timestamp: Date.now(),
})

// 查看当前对话会话
console.log(window.__HEALING_AGENT__.store.currentSession)
```

---

## 四、技术要点与设计决策

### 为什么这样设计语音交互架构？

**1. 分层解耦设计**
```
services/ 目录职责清晰:
├── AudioCapture   ← 只负责音频采集（不关心谁使用）
├── ASREngine      ← 只负责语音转文字（不关心后续处理）
├── TTSEngine      ← 只负责文字转语音（不关心内容来源）
├── VoiceCommandHandler ← 只负责指令解析（纯逻辑无UI依赖）
└── VoiceInteractionManager ← 总控协调器（串联以上所有模块）
```
每层可独立替换：ASR换科大讯飞？只改ASREngine。TTS换阿里云？只改TTSEngine。

**2. 回调驱动而非Promise链**
对话是长时间持续的过程，不适合async/await线性等待。采用事件回调模式：
```typescript
voiceInteraction.start({
  onUserSpeaking: () => { /* 切换倾听动效 */ },
  onAgentResponding: (text) => { /* 切换说话动效+显示文字 */ },
  onResponseComplete: () => { /* 恢复待机动效 */ },
  onCommandTriggered: (cmd, text) => { /* 处理特殊指令 */ },
})
```
外部只需关注事件，不需要了解内部复杂的状态流转。

**3. Demo大模型回复的巧妙设计**
`generateDemoResponse()` 用关键词匹配 + 分类话术池模拟真实LLM行为：
- 不需要网络请求即可验证完整对话流程
- 后续Module 5接入真实LLM时，只需替换这一个方法
- 话术池按情绪分类，覆盖了愤怒/疲惫/焦虑/问候/指令确认等场景
- 随机选取避免机械重复感

**4. 音频通道优先级设计**
```
AudioPriority枚举:
PHONE_CALL(0) > NAVIGATION(1) > HEALING_AGENT(2) > MUSIC(3)
```
当高优先级源占用时，Healing Agent自动暂停倾听，通道释放后恢复。

**5. 30秒免唤醒连续对话**
- 唤醒后进入"对话会话"
- 每次用户说话重置计时
- Agent回复中暂停计时
- 超时自动收起面板回到后台监听
- 无需重复喊"小疗同学"

### 当前已知限制

1. **Web Speech API 兼容性** （同M1）— Chrome/Safari/Edge支持良好
2. **摄像头/地图权限模拟** （同M1）
3. **虚拟形象为CSS占位版** （同M2）
4. **ASR依赖Google在线服务** — 需要联网；离线座舱需替换为本地引擎
5. **TTS音色取决于操作系统** — Windows/macOS/iOS可用音色不同
6. **Demo回复为规则匹配** — 非真实LLM，语义理解有限；Module 5会接入大模型
7. **音乐/地图/停车为占位接口** — 后续Module 5对接真实服务
8. **M4面部/驾驶/心率维度为模拟数据** — 真实环境需接入车载CAN总线+摄像头+穿戴设备
9. **M4情绪识别仅首次发言触发** — 会话内后续发言不重复识别（按PRD设计）
10. **M5音乐为Web Audio合成音** — Demo版使用正弦波/三角波合成环境音，非真实音乐文件
11. **M5停车点为模拟数据** — 后续需接入真实地图API
12. **M6性格模型基于简易规则** — 外向/内向维度仅基于倾诉文本长度推算，感性/理性仅基于负面情绪频率，Demo版无真实驾驶行为数据支撑；后续可接入更丰富的行为特征
13. **M7加密为简易XOR+Base64** — Demo版使用轻量加密方案防止明文泄露，非工业级加密；正式版建议替换为Web Crypto API
14. **M7无自动过期清理** — 按PRD设计，数据长期有效，仅用户主动清空才重置；情绪事件限制200条、会话日志限制100条
15. **M8配置需刷机生效** — 按PRD设计不支持在线热更新，Demo版通过localStorage模拟车企预置；正式版建议替换为座舱系统配置文件或OTA通道
16. **M8唤醒词替换为显示级** — 就绪页动态显示车企唤醒词，但实际ASR唤醒词监听仍为Demo默认（正式版需接入ASR引擎定制唤醒词接口）
17. **M9音频通道为模拟实现** — Demo版通过手动模拟测试音频通道抢占，正式版需接入座舱音频系统API（蓝牙/导航事件监听）
18. **M9全局异常无云端上报** — 按PRD设计所有异常仅本地记录，不上云；正式版可扩展为OTA诊断数据上报

---

## 五、下一步开发指南（给下一个模块开发者）

### 给下一模块开发者的重要提示

#### 1️⃣ 本地数据已有完善管理

Module 7 的 DataStore 已实现完整的本地数据持久化体系：
- 情绪事件加密存储在 `healing_agent_data_vault`（最多200条）
- 会话日志加密存储在 `healing_agent_session_logs`（最多100条）
- 疗愈偏好在 `healing_agent_healing_preference`
- 画像数据存储在 `healing_agent_enhanced_profile`（M6）
- 支持语音一键清空（"清除我的情绪记录" + 二次确认）
- 支持数据导出调试（`window.__HEALING_AGENT__.dataStore.exportData()`）

后续模块无需重复实现数据持久化，只需调用 DataStore API。

#### 2️⃣ 数据流已完整串联

当前完整数据流：情绪识别 → 画像更新 → store同步 → 话术适配 → 疗愈策略 → 数据持久化。
所有7个模块已串联完成，后续模块在此基础上扩展即可。

#### 3️⃣ 如何获取增强画像驱动个性化疗愈？

Module 6 的 ProfileEngine 提供完整增强画像：

```typescript
import { useAppStore } from '@/stores/appStore'
const store = useAppStore()

// 获取增强画像
const ep = store.enhancedProfile
if (ep) {
  console.log('外向度:', ep.extroversion)        // -1~+1
  console.log('感性度:', ep.emotionalness)        // -1~+1
  console.log('稳定性:', ep.stability)            // 'new'|'forming'|'stable'
  console.log('习惯标签:', ep.emotionHabits)      // ['quick_temper', ...]
  console.log('交互风格:', ep.interactionStyle)   // 'chatty'|'silent'|'mixed'
  console.log('情绪统计:', ep.emotionStats)       // { anger: 3, anxiety: 2, ... }
}

// 获取个性化话术风格
const style = store.personalizedStyle
if (style) {
  console.log('语气:', style.tone)                // '温柔陪伴'|'轻松闲聊'|...
  console.log('共情度:', style.empathyLevel)      // 0-1
  console.log('详略度:', style.verbosity)          // 0-1
}
```

#### 4️⃣ 情绪→形象联动已自动完成

Module 4 在 App.vue 中已集成 `onEmotionResult` 回调，会自动调用 `appStore.applyEmotionToAvatar()`：
- anger → 疗愈光效
- anxiety / irritability → 倾听姿态
- fatigue → 疗愈光效
- calm → 正常待机

Module 5+M6 无需再手动处理形象切换。

#### 5️⃣ 如何替换Demo回复为真实LLM？

只需修改 VoiceInteractionManager.ts 一个方法：

```typescript
// 当前：generateDemoResponse() — 规则匹配
// 替换为：
private async generateLLMResponse(userMessage: string): Promise<string> {
  const emotion = useAppStore().emotionResult  // M4: 带情绪上下文
  const response = await fetch('/api/chat', {
    method: 'POST',
    body: JSON.stringify({
      message: userMessage,
      emotion: emotion?.emotion,        // 传入情绪类型
      intensity: emotion?.intensity,     // 传入情绪强度
      context: this.currentSession?.messages,
    })
  })
  return response.json().text
}
```

---

## 六、测试与验证

### 本地开发测试步骤

```bash
# 1. 安装依赖（首次）
npm install

# 2. 启动开发服务器
npm run dev

# 3. 打开浏览器 http://localhost:3000
# 4. 授权麦克风权限（必须！否则M3无法工作）
```

### Module 3 功能检查点

#### 基础流程（继承M1+M2）
- [ ] 页面加载后自动初始化（M1功能正常）
- [ ] 初始化完成后显示"疗愈Agent 已就绪"待命界面
- [ ] 右上角调试面板可见且显示完整状态（含M3区域）

#### 唤醒 → 对话流程
- [ ] 点击「模拟唤醒词」按钮
- [ ] 面板拉起 + 形象出现 + 进入待机态
- [ ] 控制台看到 `[VoiceInteraction] ✓ 对话系统已启动`
- [ ] 调试面板M3区域显示：`ASR: listening` / `Phase: 等待输入`

#### 模拟对话（无需真实麦克风）
- [ ] 点击「🎤 模拟说话」按钮
- [ ] 形象切换为**倾听态** + 显示 "聆听中..."
- [ ] 调试面板实时文字区显示用户输入内容
- [ ] 形象切换为**说话态** + 显示 Agent 回复文字
- [ ] 浏览器实际播放出语音（需授权TTS权限）
- [ ] 回复完成后形象回到**待机态**
- [ ] 可多次点击「模拟说话」，形成连续对话

#### TTS独立测试
- [ ] 点击「🔊 测试播报」
- [ ] 形象切换为说话态 + 文字显示
- [ ] 听到语音播报（温柔女声）

#### 语音指令模拟
- [ ] 点击「模拟说话」直到触发包含关键词的句子（如"我很生气"、"帮我深呼吸"）
- [ ] 调试面板指令列表展示6条支持的指令
- [ ] 触发"退出"类指令后对话框停止

#### 30秒自动退出
- [ ] 唤醒后不做任何操作
- [ ] 约30秒后面板自动收起
- [ ] 控制台输出 `[App] 30秒无交互，自动收起面板`

#### 对话历史
- [ ] 进行3-5次模拟对话
- [ ] 调试面板底部显示最近5条对话消息
- [ ] 消息区分用户(蓝色)/小疗(紫色)/系统(橙色)

#### 打断恢复
- [ ] 在Agent说话过程中点击「模拟说话」（或再次点击测试播报）
- [ ] 当前播报被打断
- [ ] 立即开始新一轮对话

### Module 4 功能检查点

#### 情绪识别基础
- [ ] 调试面板M4区域显示：`识别状态: 未触发`
- [ ] 点击「🧠 模拟情绪识别」按钮
- [ ] 识别状态短暂变为 `识别中...` 后变为 `已完成`
- [ ] 当前情绪显示为：😠愤怒 / 😰焦虑 / 😒烦躁 / 😴疲劳 之一
- [ ] 强度显示为：高强度 / 中等 / 低 之一
- [ ] 驾驶场景显示为：拥堵/高速/市区/怠速/夜间/通用 之一
- [ ] 置信度显示为百分比数值
- [ ] 处理耗时显示为毫秒数

#### 维度分数可视化
- [ ] 完成识别后，5维度分数条正常显示
- [ ] 每个维度有对应颜色的渐变填充（语音蓝/面部紫/驾驶橙/心率红/画像绿）
- [ ] 分数值与进度条宽度一致
- [ ] 多次识别后，分数条有过渡动画变化

#### 司机画像
- [ ] 展开司机画像折叠面板
- [ ] 显示易怒频次（百分比）
- [ ] 显示总交互次数
- [ ] 显示性格标签（至少1个标签）
- [ ] 显示情绪历史记录数
- [ ] 多次识别后，历史记录数递增

#### 情绪→形象联动
- [ ] 识别结果为愤怒时，形象自动切换为**疗愈态**
- [ ] 识别结果为焦虑/烦躁时，形象自动切换为**倾听态**
- [ ] 识别结果为疲劳时，形象自动切换为**疗愈态**

#### 画像持久化
- [ ] 完成识别后刷新页面
- [ ] 打开司机画像面板，历史数据仍存在（localStorage）
- [ ] 点击「🔄 重置画像」→ 确认画像数据清空

---

## 七、版本历史

| 版本 | 日期 | 变更内容 | 作者 |
|------|------|---------|------|
| v1.0.0 | 2026-05-11 | 初始版本：完成Module 1（登录初始化&座舱启动） | AI Assistant |
| v1.1.0 | 2026-05-11 | 新增Module 2（首页&虚拟形象）：完整2D形象+毛玻璃面板+动效状态机+自动退出+UI设计体系 | AI Assistant |
| v1.2.0 | 2026-05-11 | **新增Module 3（语音唤醒&语音交互）：** 音频采集降噪+ASR引擎+TTS引擎+6条语音指令+连续对话管理器+Demo回复生成+完整对话流程编排+调试面板升级 | AI Assistant |
| v1.3.0 | 2026-05-11 | **UI全面优化（对齐PRD规范）：** 通透座舱环境背景+就绪态品牌化+面板居中布局+形象尺寸增大20%+留白优化+状态氛围光系统+对话文字层次增强+粒子效果精致化+过渡动画升级 | AI Assistant |
| v1.4.0 | 2026-05-11 | **新增Module 4（多维度情绪识别）：** 情绪识别引擎（VoiceAnalyzer/FusionEngine/EmotionJudge/ProfileManager）+5维度加权融合+情绪→形象联动+司机画像localStorage持久化+M3依赖注入集成+DebugPanel全面升级（维度分数条/画像面板/模拟按钮） | AI Assistant |
| v1.5.0 | 2026-05-11 | **新增Module 5（核心疗愈服务）：** 疗愈策略编排器HealingService + EmpatheticResponder情绪感知对话（15种情绪×强度话术组合+画像感知）+ MusicPlayer Web Audio舒缓音乐（5首合成曲目+淡入淡出）+ BreathGuide深呼吸引导（吸气4s/屏息4s/呼气6s×3轮）+ ParkingFinder停车推荐（模拟数据）+ VoiceInteractionManager集成疗愈指令处理 + DebugPanel全面升级（策略/音乐/呼吸/停车4区） | AI Assistant |
| v1.6.0 | 2026-05-12 | **新增Module 6（司机性格画像）：** ProfileEngine多维度画像引擎（双轴性格模型外向/内向+感性/理性、4种情绪习惯标签、3种交互风格偏好、情绪类型/场景/时段统计、画像稳定性等级）+ StyleAdapter个性化话术风格适配器（6种语气风格+共情度+详略度控制）+ EmpatheticResponder深度画像集成（风格分支话术/安静陪伴/轻松闲聊/高共情/路况安抚）+ HealingService差异化疗愈策略（易激怒→呼吸引导、路况敏感→停车推荐、易疲劳→优先音乐）+ EmotionRecognition集成ProfileEngine + VoiceInteractionManager传递增强画像+appStore扩展（enhancedProfile/personalizedStyle）+ DebugPanel全面升级（性格维度/习惯标签/话术风格/情绪统计可视化） | AI Assistant |
| v1.7.0 | 2026-05-12 | **新增Module 7（本地数据存储&隐私）：** DataStore本地数据存储服务（XOR+Base64加密存储、数据最小化过滤脱敏、串行写入队列、会话结束后台静默写入、事务式清空+回滚）+ 语音指令"清除我的情绪记录"+二次确认（15秒超时自动取消、确认/取消语音交互）+ 全量数据清空（情绪事件+会话日志+画像+偏好记录，清空后自动重置默认画像）+ VoiceInteractionManager会话结束钩子（onSessionEnd）+ 情绪事件脱敏存储（禁止存储原始语音/面部图像/心率原始值/地理位置）+ 疗愈偏好记录（指令使用频率/策略使用排名）+ 数据导出调试能力+ appStore扩展（dataStoreState/clearConfirmState）+ DebugPanel升级（存储状态监控/清空确认状态/导出/模拟清空按钮） | AI Assistant |
| v1.8.0 | 2026-05-12 | **新增Module 8（车企个性化配置）：** OEMConfig车企配置管理服务（localStorage持久化、配置校验与兜底、6项可定制配置项：品牌问候语/虚拟形象主题/TTS音色4种预设/超时时长3档/话术风格2种/唤醒词/品牌slogan）+ AutoExitManager车企超时时长覆盖+ TTSEngine车企音色参数覆盖+ EmpatheticResponder车企话术风格（沉稳理性风→精简表达）+ 唤醒后首次品牌问候语TTS播报+ 就绪页唤醒词/品牌slogan动态渲染+ appStore扩展（oemConfigState）+ DebugPanel升级（车企配置状态/预览问候语/重置默认按钮） | AI Assistant |
| v1.9.0 | 2026-05-12 | **新增Module 9（全局交互&异常处理规范）：** GlobalErrorHandler全局异常处理器（window.onerror/unhandledrejection全局兜底、错误分级LOW/MEDIUM/HIGH、15个模块降级策略自动映射、最多50条FIFO错误日志、降级模块追踪、错误统计）+ AudioPriorityManager音频优先级管理器（4级优先级：通话>导航>疗愈>音乐、通道抢占/释放规则、通话中拦截唤醒+禁止播放、导航播报中降低疗愈音量至40%、状态变更实时回调）+ VoiceInteractionManager集成音频通道拦截+错误报告+ App.vue唤醒处理增加音频通道检查+ 统一降级兜底话术常量（FALLBACK_RESPONSES）+ appStore扩展（globalErrorState/audioChannelState）+ DebugPanel升级（异常统计/音频通道状态/降级模块数/最近异常日志列表/模拟异常+模拟通话+释放通道+清空日志按钮） | AI Assistant |

---

## 八、联系方式与备注

- PRD总览文档: `智能座舱疗愈Agent平台 PRD总览（v1 0 Demo版）.md`
- UI风格文档: `智能座舱疗愈Agent 前端UI界面风格PRD.md`
- 各模块详细PRD位于项目根目录，按编号命名
- 开发遇到问题时优先查看控制台日志和调试面板
