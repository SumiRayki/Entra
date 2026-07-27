# Entra - AI 角色扮演聊天应用

<p align="center">
  <img src="assets/images/icon.png" width="120" alt="Entra Logo">
</p>

Entra 是一款基于 [ChatterUI](https://github.com/Vali-98/ChatterUI) 深度定制的 Android AI 角色扮演聊天应用，专为中文用户打造，支持角色创建、用户角色管理、互动叙事游戏等功能。

当前稳定版本：**v0.2.15**。

## 📥 下载安装

前往 [Releases](https://github.com/SumiRayki/Entra/releases) 下载最新版本：

| 文件 | 适用设备 |
|------|---------|
| `entra-app-release-X.X.X.apk` | Android 通用安装包，支持 ARM、ARM64、x86 和 x86_64 |

## ✨ 主要功能

### 🎭 角色创建大师

内置 AI 助手，通过自然语言描述即可快速创建角色。支持三种创建模式：

- **AI 角色** — 创建聊天对象，包含完整属性（性格、背景故事、外貌、首条消息等）
- **用户角色** — 创建你自己扮演的角色，在开始聊天前选择
- **游戏** — 创建互动叙事冒险，包含背景设定、配角等

使用方式：打开「角色创建大师」对话，输入描述即可：
```
创建AI角色：一个傲娇的猫娘女仆，银色长发
创建用户角色：一个18岁的魔法学院学生
创建游戏：中世纪奇幻世界的冒险
```

AI 输出角色/游戏信息后，点击下方按钮一键创建。

### 🎮 互动叙事游戏

在主界面切换到「游戏」标签页，点击游戏即可开始冒险：

- AI 以第三人称叙述者视角讲述故事
- 每段叙事结尾提供 **3 个选项**：
  - **选项 1** — 正常/保守路线
  - **选项 2** — 大胆/冒险路线
  - **选项 3** — NSFW 方向
- 回复数字 `1`、`2` 或 `3` 即可推进剧情
- 支持编辑和删除游戏

### 👤 用户角色系统

- 支持创建多个用户角色，每个角色有完整的属性设定
- 包含基本属性（性别、年龄、身高、体重、性格、背景故事、人物关系、外貌描述）
- 支持 NSFW 属性（描述、罩杯、臀围、敏感部位、性取向）
- 开始聊天时弹出角色选择界面，选择本次扮演的角色
- AI 在对话中会区分角色属性和用户属性，不会混淆

### 🖼️ 独立聊天背景

- 可为不同角色和游戏分别设置聊天背景
- 背景只应用于对应角色或游戏，不影响其他聊天
- 支持从设备导入、替换和删除背景图片

### 🧠 深度思考与上下文管理

- 推理模型生成时显示「思考中」，完成后可展开或收起思考过程
- 兼容 API 返回的 `reasoning_content`、`reasoning`、`reasoning_details` 以及 `<think>` 格式
- 思考内容不会计入后续对话上下文，也不会参与上下文压缩
- 接近上下文上限时可自动总结早期对话，保留最近消息继续生成
- 只压缩聊天记录，不压缩角色设定、用户角色、故事背景、游戏设定和其他前置提示词
- 自动压缩可在「设置 → 生成」中关闭

### 🔗 API 连接

支持多种 LLM API 后端：

- **ChatGPT（Codex）** — 通过设备码登录 ChatGPT Plus/Pro，使用套餐所含的 Codex 额度，无需填写 OpenAI API Key
- **DeepSeek** — 内置连接模板，输入 API Key 即可使用
- **硅基流动（SiliconFlow）** — 内置聊天接口和模型列表，支持直接选择模型
- **MiniMax** — 支持 Anthropic 兼容接口
- **OpenAI 兼容** — 支持所有 OpenAI 格式的 API
- 其他 ChatterUI 原生支持的后端（Claude、OpenRouter、Google AI Studio、Cohere、KoboldCPP、Ollama 等）

### 🔞 NSFW 支持

- 角色和用户角色均支持 NSFW 属性字段
- 当角色启用 NSFW 时，系统自动注入解锁提示词
- 游戏模式下选项 3 默认为 NSFW 方向
- 角色创建大师可直接创建包含完整 NSFW 设定的角色

## 🚀 快速开始

1. **安装应用** — 下载最新的 Android 通用 APK 并安装
2. **配置 API** — 打开侧边栏 → API 连接 → 选择 ChatGPT（Codex）并登录，或选择其他后端填写 API Key → 选择模型
3. **开始聊天** — 点击「角色创建大师」创建你的第一个角色，或直接创建游戏
4. **切换标签** — 主界面顶部可在「角色」和「游戏」之间切换

## 🔐 隐私与密钥

- 源码和安装包不预置任何可用的 API Key，也不会把用户填写的密钥写入 GitHub 仓库
- API Key 保存在设备本地 MMKV 存储中，当前没有额外启用 MMKV 加密；请保护设备及应用数据备份
- ChatGPT（Codex）的 OAuth 访问令牌和刷新令牌单独保存在 Android Keystore 加密的 SecureStore 中，不会写入 MMKV 或仓库
- 使用远程 API 时，生成所需的角色设定、故事背景和对话上下文会发送给所选模型服务商；请同时阅读对应服务商的隐私政策
- 使用远程图片生成时，相关角色或游戏资料会发送给用户配置的图片生成服务
- 请勿公开分享包含 API 配置的应用数据备份、调试日志或截图

## 🛠️ 从源码构建

### 环境要求

- Node.js 18+
- Android Studio（含 Android SDK 和 NDK）
- Java 17+（推荐使用 Android Studio 内置的 JBR）

### 构建步骤

```bash
# 克隆仓库
git clone https://github.com/SumiRayki/Entra.git
cd Entra

# 安装依赖
npm install

# 生成 Android 项目
npx expo prebuild --platform android --clean

# 构建 Release APK
cd android
./gradlew assembleRelease
```

通用 APK 构建产物位于 `android/app/build/outputs/apk/release/app-release.apk`。

如需构建分架构 APK，在 `android/app/build.gradle` 的 `android {}` 块中添加：

```groovy
splits {
    abi {
        enable true
        reset()
        include "arm64-v8a", "x86_64"
        universalApk false
    }
}
```

## 📋 技术栈

- **框架** — React Native (Expo 53) + expo-router
- **数据库** — SQLite (Drizzle ORM)
- **状态管理** — Zustand + MMKV
- **UI** — React Native Reanimated + Gesture Handler

## 🙏 致谢

本项目基于 [ChatterUI](https://github.com/Vali-98/ChatterUI) 开发，感谢原作者的出色工作。

- [ChatterUI](https://github.com/Vali-98/ChatterUI) — 原始项目
- [llama.cpp](https://github.com/ggml-org/llama.cpp) — 本地 LLM 推理引擎
- [llama.rn](https://github.com/mybigday/llama.rn) — React Native llama.cpp 适配器

## 📄 许可证

本项目遵循与 ChatterUI 相同的开源协议。
