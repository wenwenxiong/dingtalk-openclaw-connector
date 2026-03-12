# Release Notes - v0.7.6

## 🔧 修复版本 / Bug Fix Release

本次更新修复了修改 Gateway 端口后无法连接的问题，确保配置中的 Gateway 端口能够正确生效。

This update fixes the issue where connection fails after modifying Gateway port, ensuring that the Gateway port configured in settings takes effect correctly.

## 🐛 修复 / Fixes

### Gateway 端口连接修复 / Gateway Port Connection Fix

**问题描述 / Issue Description**：  
当用户在配置中指定了 Gateway 端口（`gateway.port`）后，连接器仍然使用运行时检测到的端口，导致无法连接到正确配置的 Gateway 端口。  
When users specify Gateway port (`gateway.port`) in configuration, the connector still uses the runtime-detected port, causing connection failures to the correctly configured Gateway port.

**修复内容 / Fix**：
- 在 `streamFromGateway` 函数中添加 `gatewayPort` 参数支持  
  Added `gatewayPort` parameter support in `streamFromGateway` function
- 优先使用配置中的 `gateway.port`，其次使用运行时检测的端口，最后使用默认端口 18789  
  Prioritize `gateway.port` from configuration, then use runtime-detected port, finally fallback to default port 18789
- 在所有调用 `streamFromGateway` 的地方传递配置的端口信息  
  Pass configured port information in all `streamFromGateway` calls

**技术实现 / Technical Implementation**：
```typescript
// 修复前 / Before
const gatewayUrl = `http://127.0.0.1:${rt.gateway?.port || 18789}/v1/chat/completions`;

// 修复后 / After
const port = gatewayPort || rt.gateway?.port || 18789;
const gatewayUrl = `http://127.0.0.1:${port}/v1/chat/completions`;
```

**影响范围 / Impact**：  
影响所有在配置中指定了 `gateway.port` 的用户。修复后，配置的 Gateway 端口将正确生效，连接器能够连接到正确配置的 Gateway 实例。  
Affects all users who specified `gateway.port` in configuration. After the fix, the configured Gateway port will take effect correctly, and the connector can connect to the correctly configured Gateway instance.

## 📋 技术细节 / Technical Details

### 内部实现变更 / Internal Implementation Changes

**变更前 / Before**：
- `streamFromGateway` 函数仅使用运行时检测的端口 `rt.gateway?.port`
- 配置中的 `gateway.port` 被忽略
- 修改 Gateway 端口后需要重启才能生效

**变更后 / After**：
- `GatewayOptions` 接口新增 `gatewayPort?: number` 可选参数
- `streamFromGateway` 函数优先使用传入的 `gatewayPort` 参数
- 端口优先级：`gatewayPort` > `rt.gateway?.port` > `18789`（默认）
- 所有调用 `streamFromGateway` 的地方传递 `cfg.gateway?.port`

### 相关代码位置 / Related Code Locations

主要修改文件：
- `plugin.ts` - Gateway 连接逻辑修改

关键变更点：
- `GatewayOptions` 接口定义（新增 `gatewayPort` 参数）
- `streamFromGateway` 函数中的端口选择逻辑
- `handleDingTalkMessage` 函数中所有 `streamFromGateway` 调用点（同步模式、异步模式、流式模式）

## 📥 安装升级 / Installation & Upgrade

```bash
# 通过 npm 安装最新版本 / Install latest version via npm
openclaw plugins install @dingtalk-real-ai/dingtalk-connector

# 或升级现有版本 / Or upgrade existing version
openclaw plugins update dingtalk-connector

# 通过 Git 安装 / Install via Git
openclaw plugins install https://github.com/DingTalk-Real-AI/dingtalk-openclaw-connector.git
```

## ⚠️ 升级注意事项 / Upgrade Notes

### 兼容性说明 / Compatibility Notes

- **向下兼容**：本次更新完全向下兼容，现有配置无需修改即可正常工作  
  **Backward Compatible**: This update is fully backward compatible, existing configurations work without modification
- **推荐升级**：在配置中指定了 `gateway.port` 的用户强烈建议升级到此版本，以确保端口配置正确生效  
  **Recommended Upgrade**: Users who specified `gateway.port` in configuration are strongly recommended to upgrade to this version to ensure port configuration takes effect correctly
- **无需配置变更**：现有配置无需修改，修复会自动生效  
  **No Configuration Changes Required**: Existing configurations work without modification, fix will automatically take effect

### 验证步骤 / Verification Steps

升级到此版本后，如果您的配置中指定了 `gateway.port`：
After upgrading to this version, if you have specified `gateway.port` in your configuration:

1. **检查配置**：确认 `gateway.port` 配置正确  
   **Check Configuration**: Verify that `gateway.port` is correctly configured
2. **测试连接**：发送一条消息，确认能够正常连接到 Gateway  
   **Test Connection**: Send a message to verify normal connection to Gateway
3. **验证端口**：确认连接使用的是配置的端口，而不是默认端口  
   **Verify Port**: Confirm that the connection uses the configured port, not the default port

### 配置示例 / Configuration Example

```json5
{
  "channels": {
    "dingtalk-connector": {
      "enabled": true,
      "clientId": "dingxxxxxxxxx",
      "clientSecret": "your_secret_here",
      "gateway": {
        "port": 18888  // 自定义 Gateway 端口
      }
    }
  }
}
```

## 🔗 相关链接 / Related Links

- [完整变更日志 / Full Changelog](https://github.com/DingTalk-Real-AI/dingtalk-openclaw-connector/blob/main/CHANGELOG.md)
- [使用文档 / Documentation](https://github.com/DingTalk-Real-AI/dingtalk-openclaw-connector/blob/main/README.md)
- [问题反馈 / Issue Feedback](https://github.com/DingTalk-Real-AI/dingtalk-openclaw-connector/issues)
- [Commit: bacbd87](https://github.com/DingTalk-Real-AI/dingtalk-openclaw-connector/commit/bacbd874257ac5f5650ed88b02011615a5a3a6e4)

## 🙏 致谢 / Acknowledgments

感谢所有贡献者和用户的支持与反馈！
Thanks to all contributors and users for their support and feedback!

---

**发布日期 / Release Date**：2026-03-10  
**版本号 / Version**：v0.7.6  
**兼容性 / Compatibility**：OpenClaw Gateway 0.4.0+
