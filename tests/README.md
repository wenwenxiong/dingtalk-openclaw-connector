# plugin 测试说明

本目录按**测试套件（模块）**划分，每个子目录包含：**测试代码**（`*.test.ts`）与**测试方案**（`PLAN.md`）。方案中给出模块职责、用例表（含输入/期望/说明）以及正确/错误输出原因，便于覆盖全部情况并扩展用例。

其中大多数为**单元测试/契约测试**（基于 mock 的纯函数与 I/O 边界验证）；`integration` 为**端到端集成测试**（需要真实钉钉凭证，默认跳过）。

## 模块列表

| 目录 | 覆盖函数/能力 | 说明 |
|------|----------------|------|
| [session](./session/) | normalizeSlashCommand, buildSessionContext, isMessageProcessed, markMessageProcessed, cleanupProcessedMessages | 会话与消息去重 |
| [config-token](./config-token/) | getConfig, isConfigured, getAccessToken, getOapiAccessToken, getUnionId | 配置与 Token |
| [media](./media/) | toLocalPath, processLocalImages | 本地路径与图片后处理 |
| [video](./video/) | processVideoMarkers | 视频标记解析与控制流 |
| [message-extract](./message-extract/) | extractMessageContent | 钉钉消息内容提取（text/richText/picture/audio/video/file） |
| [file-markers](./file-markers/) | extractFileMarkers, isAudioFile | 文件标记解析与音频类型判断 |
| [prompts](./prompts/) | buildMediaSystemPrompt | 媒体相关系统提示词 |
| [deliver-payload](./deliver-payload/) | buildDeliverBody, buildMsgPayload | AI Card 投放体与普通消息体 |
| [bindings](./bindings/) | resolveAgentIdByBindings | OpenClaw bindings 解析（需 mock fs/path/os） |
| [ai-card](./ai-card/) | create/stream/finish AI Card, sendAICard* | AI Card 创建与流式更新（结构化返回 + 回退） |
| [card-update](./card-update/) | createAICard + stream/finish 状态机（回归集） | 轻量回归：目标选择与 INPUTING→streaming→FINISHED 状态机（避免与 ai-card/proactive 重复） |
| [send-message](./send-message/) | sendTextMessage, sendMarkdownMessage, sendMessage | 群机器人 webhook 发送（自动 text/markdown 判定） |
| [proactive](./proactive/) | buildMsgPayload, sendNormalTo*, sendTo*, sendProactive | 主动消息 API：消息体构造、AI Card 策略与回退 |
| [audio](./audio/) | isAudioFile, getFfprobePath, extractAudioDuration, processAudioMarkers, sendAudio* | 音频识别、时长解析与音频发送 |
| [upload](./upload/) | uploadMediaToDingTalk, download*/extractVideo*, process*Markers | 上传/下载/媒体处理与 marker 处理（多分支容错） |
| [download](./download/) | downloadImageToFile, downloadMediaByCode, downloadFileByCode | 下载与文件名/扩展名推断 |
| [mcp-tools](./mcp-tools/) | MCP 工具层：sendToUser/sendToGroup/sendProactive/uploadMedia... | 对外工具输入校验与行为一致性 |
| [core](./core/) | normalizeSlashCommand/getConfig/getAccessToken/... | 核心能力冒烟/回归集合（跨模块快速验证） |
| [integration](./integration/) | getAccessToken, sendToUser, AI Card, media upload | 端到端集成测试（需要真实环境变量） |

## 运行方式

```bash
npm test          # 运行全部用例
npm run test:watch  # 监听模式
npm run test:integration  # 仅运行集成测试（需要环境变量）
```

## 扩展用例

- 各 `PLAN.md` 中均有用例表（序号 + 输入 + 期望 + 说明），可按表在对应 `*.test.ts` 中用 `it.each` 或单条 `it` 补充，实现“成百上千条”覆盖。
- 依赖真实外部环境（如钉钉 API、真实文件系统、ffmpeg/ffprobe）的路径，优先在单元测试中做 **mock + 契约断言**；需要验证真实链路时再放到 `integration`（或后续 E2E）中补充。

## 测试编写约定（建议遵循）

- **模块职责优先**：每个 `tests/<suite>/` 只覆盖该域内的能力；不要在一个套件里测试“顺手能调到”的其它函数（避免重复与耦合）。
- **断言优先级**：
  - **优先断言契约**：关键字段（如 `msgKey/msgParam/openSpaceId`）与错误返回结构（如 `ok=false` 时 `error`）。
  - **避免断言实现细节**：例如随机生成的 id、时间戳、日志完整文本等。
- **Mock 外部依赖**：
  - 网络：优先 `vi.mock('axios')` + hoisted mock，并按 URL 分流（token 获取与业务请求常共用 `axios.post`）。
  - 文件系统：尽量用 `await import('fs')` 的代码路径以便在测试中 `vi.mock('fs')/vi.doMock('fs')` 生效。
  - 外部工具（ffmpeg/ffprobe）：测试中不依赖真实二进制与文件存在性；失败路径应可预测（返回 `null` 或默认值），必要时用集成测试覆盖真实链路。
- **避免共享状态污染**：若被测模块存在模块级缓存（如 token 缓存），在需要隔离的用例中使用 `vi.resetModules()` 后再 `import`。
