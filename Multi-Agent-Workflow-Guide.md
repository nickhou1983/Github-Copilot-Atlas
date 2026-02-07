# Copilot Atlas 多 Agent 工作流程详解

## 目录

- [1. 项目概述](#1-项目概述)
- [2. 系统架构总览](#2-系统架构总览)
- [3. Agent 角色详解](#3-agent-角色详解)
  - [3.1 Atlas — 指挥官（Conductor）](#31-atlas--指挥官conductor)
  - [3.2 Prometheus — 自主规划师（Autonomous Planner）](#32-prometheus--自主规划师autonomous-planner)
  - [3.3 Oracle — 研究员（Researcher）](#33-oracle--研究员researcher)
  - [3.4 Explorer — 侦察兵（Scout）](#34-explorer--侦察兵scout)
  - [3.5 Sisyphus — 实现者（Implementer）](#35-sisyphus--实现者implementer)
  - [3.6 Code-Review — 审查员（Reviewer）](#36-code-review--审查员reviewer)
  - [3.7 Frontend-Engineer — 前端专家（UI/UX Specialist）](#37-frontend-engineer--前端专家uiux-specialist)
- [4. 核心工作流程](#4-核心工作流程)
  - [4.1 完整生命周期：Planning → Implementation → Review → Commit](#41-完整生命周期planning--implementation--review--commit)
  - [4.2 Prometheus 自主规划流程](#42-prometheus-自主规划流程)
  - [4.3 Atlas 编排执行流程](#43-atlas-编排执行流程)
- [5. Agent 委派与协作关系](#5-agent-委派与协作关系)
  - [5.1 委派关系图谱](#51-委派关系图谱)
  - [5.2 并行执行策略](#52-并行执行策略)
  - [5.3 上下文保护策略](#53-上下文保护策略)
- [6. 典型工作流场景](#6-典型工作流场景)
  - [6.1 场景一：从规划到实现的完整流程](#61-场景一从规划到实现的完整流程)
  - [6.2 场景二：大型跨子系统任务](#62-场景二大型跨子系统任务)
  - [6.3 场景三：前端 UI 特性开发](#63-场景三前端-ui-特性开发)
- [7. 关键设计原则](#7-关键设计原则)
- [8. 扩展自定义 Agent](#8-扩展自定义-agent)

---

## 1. 项目概述

**Copilot Atlas** 是一个基于 VS Code GitHub Copilot 的多 Agent 编排系统，采用 **指挥官-委派（Conductor-Delegate）** 模式，将复杂的软件开发任务分解为 **规划 → 实现 → 审查 → 提交** 的完整生命周期。

系统通过 7 个各司其职的 Agent 协同工作，以高效的上下文管理和并行执行能力，解决了传统单 Agent 在处理大规模代码库时的上下文窗口耗尽问题。

### 核心价值

| 问题 | 传统单 Agent | Copilot Atlas 多 Agent |
|------|-------------|----------------------|
| 上下文消耗 | 一个模型处理所有事务，80-90% 上下文用于加载代码 | 专职 Agent 仅处理相关上下文，节省 70-80% 上下文空间 |
| 任务并行 | 串行执行 | 最多 10 个 Agent 并行执行 |
| 代码质量 | 依赖单一审查 | 独立的代码审查 Agent + TDD 驱动 |
| 可扩展性 | 难以增加专业能力 | 可随时添加自定义领域 Agent |

---

## 2. 系统架构总览

```
┌─────────────────────────────────────────────────────────────────┐
│                            用户                                  │
│                     （发起任务 / 审批 / 提交）                      │
└────────────────────────┬────────────────────────────────────────┘
                         │
           ┌─────────────▼─────────────┐
           │       Prometheus          │
           │    （自主规划师）            │
           │   Model: GPT-5.2 High     │
           │  职责：研究 + 撰写计划       │
           └────────┬──────────────────┘
                    │ 交接 (Handoff)
           ┌────────▼──────────────────┐
           │         Atlas             │
           │      （指挥官）             │
           │ Model: Claude Sonnet 4.5  │
           │ 职责：编排完整开发生命周期    │
           └────┬───┬───┬───┬─────────┘
                │   │   │   │
    ┌───────────┘   │   │   └───────────┐
    ▼               ▼   ▼               ▼
┌────────┐  ┌────────┐ ┌──────────┐ ┌──────────────┐
│Explorer│  │ Oracle │ │Sisyphus  │ │Frontend-Eng. │
│(侦察兵)│  │(研究员)│ │(实现者)   │ │(前端专家)     │
│Gemini  │  │GPT-5.2 │ │Claude 4.5│ │Gemini 3 Pro  │
│3 Flash │  │        │ │          │ │              │
└────────┘  └────────┘ └──────────┘ └──────────────┘
                                          │
                               ┌──────────▼──────────┐
                               │   Code-Review       │
                               │    （审查员）          │
                               │   Model: GPT-5.2    │
                               └─────────────────────┘
```

> **模型选择策略**：不同 Agent 根据任务特性选用不同的 AI 模型——Claude Sonnet 4.5 用于复杂推理和实现，GPT-5.2 用于深度研究和审查，Gemini 3 Flash 用于高速探索，Gemini 3 Pro 用于前端开发。

---

## 3. Agent 角色详解

### 3.1 Atlas — 指挥官（Conductor）

| 属性 | 说明 |
|------|------|
| **文件** | `Atlas.agent.md` |
| **模型** | Claude Sonnet 4.5 (copilot) |
| **角色** | 全局编排器，管理完整开发生命周期 |
| **核心原则** | **不亲自实现代码**，只编排子 Agent 完成工作 |

**职责：**
- 分析用户需求，确定任务范围
- 委派探索任务给 Explorer，研究任务给 Oracle
- 基于研究成果撰写 3-10 阶段的实施计划
- 将每个阶段的实现任务委派给 Sisyphus 或 Frontend-Engineer
- 委派代码审查给 Code-Review
- 管理用户审批关卡（计划审批、阶段提交审批）
- 编写阶段完成文档和最终完成文档

**可用工具（48 个）：** 文件编辑、搜索、终端执行、子 Agent 委派、Web 获取、Todo 管理等全套工具。

**关键停止点：**
1. 计划呈现后 → 等待用户审批
2. 每阶段审查完成后 → 等待用户提交确认
3. 最终完成文档生成后 → 等待用户确认

---

### 3.2 Prometheus — 自主规划师（Autonomous Planner）

| 属性 | 说明 |
|------|------|
| **文件** | `Prometheus.agent.md` |
| **模型** | GPT-5.2 (copilot)，推荐 reasoning effort 设为 High |
| **角色** | 纯规划 Agent，只研究和撰写计划 |
| **交接** | 完成计划后可自动交接给 Atlas 执行 |

**职责：**
- 深度研究代码库，理解架构和模式
- 撰写详尽的 TDD 驱动实施计划
- 分析风险，提出缓解方案
- 列出开放问题及推荐方案

**核心约束：**
- ✅ 只能创建 `.md` 计划文件
- ❌ 不能执行代码或运行命令
- ✅ 可委派给 Explorer / Oracle 做研究
- ❌ 不能委派给 Sisyphus / Frontend-Engineer 等实现 Agent
- ✅ 研究阶段**自主运行**，不需要暂停等待用户输入

**交接机制：**
```yaml
handoffs:
  - label: Start implementation with Atlas
    agent: Atlas
    prompt: Implement the plan
```
用户可点击 "Start implementation with Atlas" 自动将计划传递给 Atlas 执行。

---

### 3.3 Oracle — 研究员（Researcher）

| 属性 | 说明 |
|------|------|
| **文件** | `Oracle-subagent.agent.md` |
| **模型** | GPT-5.2 (copilot) |
| **角色** | 深度子系统研究，提供结构化发现 |
| **上级** | Atlas 或 Prometheus |

**职责：**
- 针对特定子系统进行深入分析
- 识别关键文件、函数、类及其作用
- 发现代码模式和约定
- 提供 2-3 种实现方案供上级选择
- 如研究范围较大（>10 个文件），可进一步委派 Explorer

**输出格式：**
- **Relevant Files**：文件列表 + 简要说明
- **Key Functions/Classes**：名称和位置
- **Patterns/Conventions**：代码库遵循的规范
- **Implementation Options**：2-3 种方案（如适用）
- **Open Questions**：存在的疑问

**90% 信心停止规则**：当能回答"哪些文件要改"、"技术方案是什么"、"需要哪些测试"、"有什么风险"时即可停止研究。

---

### 3.4 Explorer — 侦察兵（Scout）

| 属性 | 说明 |
|------|------|
| **文件** | `Explorer-subagent.agent.md` |
| **模型** | Gemini 3 Flash (Preview) (copilot) |
| **角色** | 快速代码库探索和文件发现 |
| **特点** | 只读模式、强制并行搜索 |

**硬性约束：**
- ❌ 不能编辑文件
- ❌ 不能运行命令
- ❌ 不能进行 Web 研究
- ✅ 只做代码库搜索和文件读取

**强制并行策略（MANDATORY）：**
- 首次工具调用**必须**同时发起 3-10 个独立搜索
- 先广度探索（定位文件/符号/用法），再纵深分析
- 混合使用 `semantic_search`、`grep_search`、`file_search`、`list_code_usages`

**输出格式（严格）：**
```xml
<analysis>探索意图和搜索策略说明</analysis>
... 工具调用 ...
<results>
  <files>绝对路径列表 + 单行说明</files>
  <answer>发现内容的简要解释</answer>
  <next_steps>2-5 条后续建议</next_steps>
</results>
```

---

### 3.5 Sisyphus — 实现者（Implementer）

| 属性 | 说明 |
|------|------|
| **文件** | `Sisyphus-subagent.agent.md` |
| **模型** | Claude Sonnet 4.5 (copilot) |
| **角色** | 后端/核心逻辑的 TDD 驱动实现 |
| **上级** | Atlas |

**核心工作流（严格 TDD）：**
1. **先写测试** → 运行测试确认失败（RED）
2. **写最少代码** → 仅实现通过测试所需的代码（GREEN）
3. **验证** → 运行测试确认通过
4. **质量检查** → 运行格式化/Lint 工具并修复问题（REFACTOR）

**关键规则：**
- 只执行被分配的具体阶段任务
- 可以被多个实例并行调用（处理不同文件/特性）
- 遇到不确定时**停止**，提供 2-3 个方案让上级选择
- 不负责写完成文档或提交信息（Atlas 负责）
- 如需更多上下文，可委派 Explorer 或 Oracle

---

### 3.6 Code-Review — 审查员（Reviewer）

| 属性 | 说明 |
|------|------|
| **文件** | `Code-Review-subagent.agent.md` |
| **模型** | GPT-5.2 (copilot) |
| **角色** | 代码审查、质量验证 |
| **上级** | Atlas |

**审查维度：**
- 正确性：实现是否符合目标
- 效率：性能是否合理
- 可读性：代码是否清晰
- 可维护性：结构是否良好
- 安全性：是否存在安全隐患
- 测试覆盖：测试是否充分

**输出状态：**
| 状态 | 含义 | 后续操作 |
|------|------|--------|
| `APPROVED` | 通过审查 | Atlas 进入提交流程 |
| `NEEDS_REVISION` | 需要修改 | Atlas 重新委派 Sisyphus 修改 |
| `FAILED` | 严重失败 | Atlas 停止并请求用户指导 |

**问题严重级别：**
- **CRITICAL**：必须修复的阻塞性问题
- **MAJOR**：应该修复的重要问题
- **MINOR**：建议改进的小问题

---

### 3.7 Frontend-Engineer — 前端专家（UI/UX Specialist）

| 属性 | 说明 |
|------|------|
| **文件** | `Frontend-Engineer-subagent.agent.md` |
| **模型** | Gemini 3 Pro (Preview) (copilot) |
| **角色** | 前端 UI/UX 实现专家 |
| **上级** | Atlas |

**专业领域：**
- UI 组件和布局实现
- 样式系统（CSS/SCSS/Tailwind/styled-components）
- 响应式设计和可访问性
- 前端状态管理
- 动画和交互效果
- API 集成

**前端 TDD 流程：**
1. 先写组件测试（渲染、交互、可访问性、响应式）
2. 实现最少的 UI 代码
3. 验证测试通过
4. 润色：Lint、性能优化、设计系统一致性

---

## 4. 核心工作流程

### 4.1 完整生命周期：Planning → Implementation → Review → Commit

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          完整开发生命周期                                 │
│                                                                         │
│  Phase 1: 规划                                                          │
│  ┌──────────┐    ┌──────────┐    ┌──────────┐    ┌──────────────────┐  │
│  │ 分析需求  │ →  │ 委派探索  │ →  │ 委派研究  │ →  │ 撰写计划         │  │
│  │          │    │ Explorer │    │  Oracle  │    │ (3-10 阶段)      │  │
│  └──────────┘    └──────────┘    └──────────┘    └────────┬─────────┘  │
│                                                           │            │
│                                                  ┌────────▼─────────┐  │
│                                                  │ ⛔ 等待用户审批    │  │
│                                                  └────────┬─────────┘  │
│                                                           │            │
│  Phase 2: 实现循环 (每阶段重复)                              │            │
│  ┌──────────────────────────────────────────────────────────┘           │
│  │                                                                     │
│  │  ┌─────────────┐   ┌──────────────┐   ┌─────────────────────────┐  │
│  └→ │ 2A: 实现     │ → │ 2B: 审查     │ → │ 2C: 返回用户提交         │  │
│     │ Sisyphus /  │   │ Code-Review  │   │ ⛔ 等待 commit + 确认    │  │
│     │ Frontend    │   │              │   │                         │  │
│     └──────┬──────┘   └──────┬───────┘   └───────────┬─────────────┘  │
│            │                 │                       │                 │
│            │    NEEDS_REVISION│                       │ 下一阶段        │
│            │ ◄───────────────┘                       └────────────┐   │
│                                                                   │   │
│  Phase 3: 完成                                                    │   │
│  ┌────────────────────────────────────────────────────────────────┘   │
│  │                                                                    │
│  │  ┌──────────────────┐    ┌──────────────────┐                     │
│  └→ │ 编写完成报告       │ →  │ 呈现给用户        │                     │
│     │ *-complete.md    │    │                  │                     │
│     └──────────────────┘    └──────────────────┘                     │
└──────────────────────────────────────────────────────────────────────┘
```

### 4.2 Prometheus 自主规划流程

```
用户请求
    │
    ▼
┌──────────────────────────┐
│  Phase 1: 研究与上下文收集  │
│                          │
│  1. 理解需求              │
│  2. 判断研究规模：          │
│     ├─ >10 文件? → 委派    │
│     │   Explorer (可并行)  │
│     ├─ >2 子系统? → 委派   │
│     │   多个 Oracle (并行) │
│     └─ <5 文件? → 自行搜索 │
│  3. 外部上下文（文档/API）  │
│  4. 90% 信心即停止         │
└────────────┬─────────────┘
             │
             ▼
┌──────────────────────────┐
│  Phase 2: 计划撰写        │
│                          │
│  写入：plans/<name>-plan.md │
│  包含：                    │
│  - 摘要                   │
│  - 上下文分析              │
│  - 3-10 实施阶段           │
│  - 开放问题                │
│  - 风险与缓解              │
│  - 成功标准                │
│  - Atlas 备注              │
└────────────┬─────────────┘
             │
             ▼
┌──────────────────────────────┐
│  交接给 Atlas                 │
│  "Start implementation with  │
│   Atlas" (点击交接按钮)        │
└──────────────────────────────┘
```

### 4.3 Atlas 编排执行流程

```
接收计划
    │
    ▼
┌─────────────────────────────────────┐
│  Phase 1: 规划验证与审批              │
│                                     │
│  1. 按需委派 Explorer/Oracle 补充研究  │
│  2. 撰写/完善计划                     │
│  3. 呈现计划给用户                    │
│  4. ⛔ 等待审批                       │
└─────────────┬───────────────────────┘
              │ 用户批准
              ▼
┌─────────────────────────────────────┐
│  Phase 2: 实现循环                   │
│                                     │
│  FOR each phase in plan:            │
│                                     │
│  ┌─ 2A: 实现 ──────────────────────┐│
│  │  选择合适的 Agent:               ││
│  │  • 后端/逻辑 → Sisyphus          ││
│  │  • 前端/UI → Frontend-Engineer   ││
│  │  提供：阶段编号、目标、文件列表、   ││
│  │       测试要求                    ││
│  └──────────────┬───────────────────┘│
│                 ▼                    │
│  ┌─ 2B: 审查 ──────────────────────┐│
│  │  委派 Code-Review 审查           ││
│  │  结果：                          ││
│  │  • APPROVED → 进入 2C            ││
│  │  • NEEDS_REVISION → 回到 2A      ││
│  │  • FAILED → 咨询用户             ││
│  └──────────────┬───────────────────┘│
│                 ▼                    │
│  ┌─ 2C: 提交 ──────────────────────┐│
│  │  • 呈现阶段摘要                  ││
│  │  • 写入 phase-N-complete.md      ││
│  │  • 提供 Git Commit Message       ││
│  │  • ⛔ 等待用户 commit + 确认      ││
│  └──────────────────────────────────┘│
│                                     │
└─────────────┬───────────────────────┘
              │ 所有阶段完成
              ▼
┌─────────────────────────────────────┐
│  Phase 3: 完成                      │
│  • 编写 *-complete.md 最终报告       │
│  • 呈现完成摘要                      │
└─────────────────────────────────────┘
```

---

## 5. Agent 委派与协作关系

### 5.1 委派关系图谱

```
                    ┌───────────┐
                    │   用户    │
                    └─────┬─────┘
                          │ 发起任务
              ┌───────────┼───────────┐
              ▼           ▼           ▼
        ┌──────────┐ ┌────────┐ ┌──────────┐
        │Prometheus│ │ Atlas  │ │  直接调用  │
        │(规划入口) │ │(执行入口)│ │Explorer/ │
        └────┬─────┘ └───┬────┘ │ Oracle   │
             │           │      └──────────┘
    ┌────────┼────┐      │
    ▼        ▼    │      │
Explorer  Oracle  │      │
(研究用)  (研究用) │      │
                  │      │
       ┌──────── Handoff ─┘
       ▼
   ┌────────┐
   │ Atlas  │ ← 接收 Prometheus 的计划
   └───┬────┘
       │
       ├──→ Explorer    (研究补充)
       ├──→ Oracle      (深度研究)
       ├──→ Sisyphus    (后端实现)
       ├──→ Frontend-Eng(前端实现)
       └──→ Code-Review (代码审查)
```

**委派权限矩阵：**

| Agent | 可委派给 | 不可委派给 |
|-------|---------|-----------|
| **Atlas** | Explorer, Oracle, Sisyphus, Frontend-Engineer, Code-Review | — |
| **Prometheus** | Explorer, Oracle | Sisyphus, Frontend-Engineer, Code-Review |
| **Oracle** | Explorer | 所有其他 Agent |
| **Sisyphus** | Explorer, Oracle（遇到困难时） | — |
| **Explorer** | 无（叶子节点） | 所有 Agent |
| **Code-Review** | 无（叶子节点） | 所有 Agent |
| **Frontend-Engineer** | 无 | — |

### 5.2 并行执行策略

系统支持每阶段最多 **10 个并行 Agent** 执行独立任务：

**1. 探索并行**

```
Atlas/Prometheus
    ├──→ Explorer #1 (搜索前端文件)
    ├──→ Explorer #2 (搜索后端文件)
    └──→ Explorer #3 (搜索数据库文件)
         ↓ 所有结果收集后
    ├──→ Oracle #1 (研究前端子系统)
    ├──→ Oracle #2 (研究后端子系统)
    └──→ Oracle #3 (研究数据库子系统)
```

**2. 实现并行**（仅限不相交的文件/特性）

```
Atlas
    ├──→ Sisyphus #1 (实现 API 层)
    └──→ Sisyphus #2 (实现数据模型)
         ↓ 各自完成后
    ├──→ Code-Review #1 (审查 API 层)
    └──→ Code-Review #2 (审查数据模型)
```

**3. Explorer 自身的强制并行**

Explorer 首次工具调用**必须**同时发起 3-10 个独立搜索：
```
Explorer 首次批量调用:
    ├── semantic_search("authentication patterns")
    ├── grep_search("login|auth|session")
    ├── file_search("**/auth/**")
    └── list_code_usages("UserService")
```

### 5.3 上下文保护策略

这是系统的核心创新。每个 Agent 只加载其职责范围内的上下文：

**委派决策树：**

```
任务到来
    │
    ├─ 需要探索 >10 个文件?
    │   └─ YES → 委派 Explorer（不要自己读文件）
    │
    ├─ 需要跨 >2 个子系统研究?
    │   └─ YES → 并行委派多个 Oracle（每个子系统一个）
    │
    ├─ 需要 >1000 tokens 的上下文?
    │   └─ YES → 强烈建议委派子 Agent
    │
    └─ <5 个文件的简单任务?
        └─ YES → 可以自行处理
```

**效果对比：**

| 场景 | 单 Agent 上下文消耗 | 多 Agent 上下文消耗 |
|------|-------------------|-------------------|
| 研究 50,000 行代码库 | 50,000 tokens（全部加载） | ~5,000 tokens（只接收摘要） |
| 实现一个功能 | 需要重新加载研究上下文 | Sisyphus 只需目标文件的上下文 |
| 代码审查 | 需要加载所有历史上下文 | Code-Review 只看变更文件 |

---

## 6. 典型工作流场景

### 6.1 场景一：从规划到实现的完整流程

**用户输入：**
> "Prometheus, plan adding user authentication to the app"

**执行流程：**

```
1. Prometheus 启动
   │
   ├── 委派 Explorer → 发现认证相关文件
   ├── 委派 Oracle #1 → 研究现有用户模型
   └── 委派 Oracle #2 → 研究路由和中间件模式
   │
   ├── 综合发现 → 撰写 plans/user-auth-plan.md
   └── 告知用户："计划已写入，可交接给 Atlas"

2. 用户点击 "Start implementation with Atlas"

3. Atlas 接管
   │
   ├── Phase 1: 测试基础设施
   │   ├── Sisyphus → 编写认证测试框架
   │   └── Code-Review → APPROVED ✓
   │   └── ⛔ 等待用户 commit
   │
   ├── Phase 2: 用户模型和数据库
   │   ├── Sisyphus → 实现用户模型 (TDD)
   │   └── Code-Review → NEEDS_REVISION (缺少密码哈希)
   │   ├── Sisyphus → 修复问题
   │   └── Code-Review → APPROVED ✓
   │   └── ⛔ 等待用户 commit
   │
   ├── Phase 3: 认证路由
   │   ├── Sisyphus → 实现登录/注册 API
   │   └── Code-Review → APPROVED ✓
   │   └── ⛔ 等待用户 commit
   │
   └── Phase 4: 前端登录界面
       ├── Frontend-Engineer → 实现登录表单组件
       └── Code-Review → APPROVED ✓
       └── ⛔ 等待用户 commit

4. Atlas 编写 plans/user-auth-complete.md
   └── 呈现最终完成报告
```

### 6.2 场景二：大型跨子系统任务

**用户输入：**
> "重构整个数据层，支持从 SQL 迁移到 NoSQL"

```
Prometheus 研究阶段 (大量并行):
    ├── Explorer #1 (数据库相关文件)
    ├── Explorer #2 (API 层文件)
    ├── Explorer #3 (测试文件)
    │
    ↓ 结果收集
    │
    ├── Oracle #1 (研究现有 SQL 模型)
    ├── Oracle #2 (研究数据访问层)
    ├── Oracle #3 (研究 API 数据流)
    ├── Oracle #4 (研究测试策略)
    └── Oracle #5 (研究 NoSQL 最佳实践 - 使用 fetch)
    │
    ↓ 综合 → 撰写 8 阶段迁移计划
```

### 6.3 场景三：前端 UI 特性开发

```
Atlas Phase N: 实现用户仪表板
    │
    ├── Frontend-Engineer:
    │   1. 编写组件测试（渲染、交互、可访问性）
    │   2. 运行测试 → ❌ 失败
    │   3. 实现 Dashboard 组件
    │   4. 添加响应式样式
    │   5. 运行测试 → ✅ 通过
    │   6. Lint + 格式化
    │
    └── Code-Review:
        检查项:
        ✅ 组件正确渲染
        ✅ ARIA 标签完整
        ✅ 响应式断点正确
        ✅ 键盘导航可用
        → Status: APPROVED
```

---

## 7. 关键设计原则

### 7.1 指挥官-委派模式（Conductor-Delegate）

Atlas **不亲自编写代码**，只负责编排和协调。这确保了清晰的职责边界和高效的上下文利用。

### 7.2 严格的 TDD 驱动

每个实现阶段都遵循 **红-绿-重构** 循环：
1. 🔴 **RED**：先写测试，运行确认失败
2. 🟢 **GREEN**：写最少代码让测试通过
3. 🔄 **REFACTOR**：Lint、格式化、优化

### 7.3 用户审批门控

系统在关键节点**强制停止**等待用户确认：
- 计划审批：确保方向正确
- 阶段提交：用户控制 Git 历史
- 最终确认：验证整体完成度

### 7.4 单一职责原则

每个 Agent 有且仅有一个核心职责，模型选择也针对该职责优化。

### 7.5 并行优先

能并行就并行，最大化开发效率（每阶段最多 10 个并行 Agent）。

### 7.6 90% 信心法则

研究 Agent（Oracle、Explorer）不追求 100% 确定性，达到 90% 信心即停止，避免过度消耗上下文。

---

## 8. 扩展自定义 Agent

系统支持添加领域专用的自定义 Agent。

### 快速方法：让 AI 帮你创建

```
@Atlas 创建一个名为 Database-Expert 的子 Agent，
专注于 SQL 优化、Schema 设计和查询分析。
将它集成到 Prometheus 和 Atlas 中。
```

Atlas 会自动：
1. 创建带有正确 YAML frontmatter 的 Agent 文件
2. 将其加入 Prometheus 的研究委派列表
3. 将其加入 Atlas 的实现委派列表

### 自定义 Agent 最佳实践

| 原则 | 说明 |
|------|------|
| 单一职责 | 每个 Agent 专注一个领域 |
| 明确边界 | 定义执行和不执行的范围 |
| 合适模型 | Sonnet 做复杂推理，Flash 做快速搜索，GPT 做深度研究 |
| 工具最小化 | 只声明实际需要的工具 |
| 结构化输出 | 返回结构化发现，而非原始信息转储 |
| 并行感知 | 设计时考虑能否与其他 Agent 并行运行 |

### 推荐的扩展 Agent 方向

- **Security-Auditor**：安全漏洞审查、依赖分析、认证缺陷检测
- **Performance-Analyzer**：性能画像、瓶颈识别、优化建议
- **API-Designer**：REST/GraphQL API 设计与一致性审查
- **Documentation-Writer**：从代码生成文档
- **Migration-Expert**：数据库迁移、版本升级、重构方案

---

## 附录：计划文件规范

### 计划目录配置

查找优先级：
1. 检查工作区 `AGENTS.md` 文件中的计划目录配置
2. 使用配置中指定的目录（如 `.sisyphus/plans`）
3. 默认使用 `plans/`

### 文件命名规范

| 文件类型 | 命名格式 | 示例 |
|---------|---------|------|
| 计划文件 | `<task-name>-plan.md` | `user-auth-plan.md` |
| 阶段完成 | `<task-name>-phase-<N>-complete.md` | `user-auth-phase-1-complete.md` |
| 最终完成 | `<task-name>-complete.md` | `user-auth-complete.md` |

### Git Commit Message 规范

```
fix/feat/chore/test/refactor: 简短描述 (最多 50 字符)

- 具体变更点 1
- 具体变更点 2
- 具体变更点 3
```

> ⚠️ Commit Message 中**不包含**计划或阶段编号引用。

---

## 附录：VS Code 配置要求

```json
{
  "chat.customAgentInSubagent.enabled": true,
  "github.copilot.chat.responsesApiReasoningEffort": "high"
}
```

- `customAgentInSubagent.enabled`：允许子 Agent 调用 `.agent.md` 文件定义的自定义 Agent
- `responsesApiReasoningEffort`：设为 `"high"` 以增强规划 Agent（GPT 模型）的推理能力

---

*本文档基于 Copilot Atlas 项目 (https://github.com/bigguy345/Github-Copilot-Atlas) 的源码分析生成。*
