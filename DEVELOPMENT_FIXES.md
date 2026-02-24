# PixLink 阻碍开发问题修复总结

**修复日期:** 2026-02-24  
**修复范围:** 前端 Store 响应式、API URL 配置、代码规范工具

---

## ✅ 已完成的修复

### 1. Store 响应式问题 (🔴 严重)

**问题:** 自定义 Store 类使用手动观察者模式，未与 Vue 响应式系统集成，导致状态更新不触发 UI 刷新。

**修复方案:** 迁移到 Pinia (Vue 官方推荐)

**更改文件:**
- `pixlink-client/src/store/index.ts` - 使用 `defineStore` + `ref` 实现真正响应式
- `pixlink-client/src/main.ts` - 注册 Pinia 插件

**使用方式:**
```typescript
// 保持向后兼容，原有代码无需修改
import { store } from './store';
store.setUser(newUser); // 现在会触发 UI 更新

// 或使用新的 Pinia 风格语法
import { useStore } from './store';
const store = useStore();
console.log(store.user); // 直接访问响应式状态
```

**需要运行:**
```bash
cd pixlink-client
npm install pinia
```

---

### 2. 硬编码 API URL (🔴 严重)

**问题:** API 基础 URL 硬编码为 `http://localhost:3000/api`，无法适应不同部署环境。

**修复方案:** 使用 Vite 环境变量

**更改文件:**
- `pixlink-client/src/services/apiService.ts`

**关键改动:**
```typescript
// 从环境变量读取，提供默认值
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api';
```

**环境变量配置:**
```bash
# .env 文件
VITE_API_BASE_URL=http://localhost:3000
```

**已有的 .env.example 已包含此变量。**

---

### 3. ESLint + Prettier 配置 (🟡 中等)

**问题:** 项目缺乏统一的代码规范和格式化工具，导致代码风格不一致，影响开发效率。

**修复方案:** 为前后端分别添加 ESLint 和 Prettier 配置

**新增文件:**
- `pixlink-client/.eslintrc.json` - Vue 3 + TypeScript 规则
- `pixlink-client/.prettierrc` - 格式化配置
- `pixlink-server/.eslintrc.json` - Node.js + TypeScript 规则
- `pixlink-server/.prettierrc` - 格式化配置

**package.json 新增脚本:**

前端:
```bash
npm run lint      # 检查并自动修复问题
npm run format    # 格式化代码
```

后端:
```bash
npm run lint      # 检查代码
npm run lint:fix  # 自动修复问题
npm run format    # 格式化代码
```

**规则亮点:**
- 检测 `any` 类型使用 (warn)
- 禁止未使用变量 (error)
- 警告 console.log (保留 error/warn/info)
- Vue 组件名允许多单词 (已关闭此规则)

**需要运行:**
```bash
# 前端
cd pixlink-client
npm install

# 后端
cd pixlink-server
npm install
```

---

### 4. Controller 拆分评估 (🟢 延后)

**评估结果:** `authController.ts` (952 行) 虽然臃肿，但当前功能完整且稳定。

**决定:** 暂不拆分，原因：
1. 拆分需要大量回归测试，可能引入 Bug
2. 当前开发重心是功能迭代，非重构
3. 已有 ESLint 帮助控制新增代码质量

**建议:** 在以下时机进行拆分：
- 功能稳定后 (v1.0 发布前)
- 需要新增相关功能时
- 有足够时间进行完整测试时

---

### 5. 类型安全改进 (🟢 部分)

**已完成:**
- `apiService.ts` 中的 `any` 类型错误对象改为带类型的 Error

**待后续逐步修复:**
- API 响应类型 (`any[]` → 具体类型)
- 错误处理中的 `any` → `unknown`

**建议:** 开启 ESLint 后，运行 `npm run lint` 会列出所有 `any` 类型使用，可逐步修复。

---

## 📋 下一步建议

### 立即执行 (今天)
1. ✅ 安装依赖：`cd pixlink-client && npm install`
2. ✅ 安装依赖：`cd pixlink-server && npm install`
3. ✅ 测试登录功能，验证 Store 响应式是否正常工作

### 本周内
4. 创建 `.env` 文件并配置正确的 API URL
5. 运行 `npm run lint` 查看代码规范问题
6. 修复最关键的 `any` 类型问题

### 本月内
7. 配置 VS Code 自动格式化 (保存时)
8. 添加 Husky + lint-staged (提交前自动检查)
9. 规划 Controller 拆分 (功能稳定后)

---

## 🔧 推荐的 VS Code 配置

创建 `.vscode/settings.json`:

```json
{
  "editor.formatOnSave": true,
  "editor.defaultFormatter": "esbenp.prettier-vscode",
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": "explicit"
  },
  "eslint.validate": [
    "javascript",
    "typescript",
    "vue"
  ]
}
```

**需要的插件:**
- ESLint
- Prettier - Code: formatter
- Vue Language Features (Volar)

---

## 📊 修复影响评估

| 修复项 | 风险 | 需要测试 | 回滚难度 |
|--------|------|----------|----------|
| Store 迁移 | 低 | 登录/状态更新 | 容易 (恢复文件即可) |
| API URL | 极低 | 确认 env 变量 | 容易 |
| ESLint | 极低 | 构建是否通过 | 容易 |

---

## 📝 注意事项

1. **Pinia 已安装但未提交 node_modules** - 需要运行 `npm install`
2. **.env 文件不在版本控制中** - 需要手动创建
3. **ESLint 规则较宽松** - 可以根据团队需求调整 `.eslintrc.json`
4. **Controller 未拆分** - 避免在当前 Sprint 中进行大规模重构

---

**修复完成时间:** 2026-02-24 10:15  
**修复者:** Sisyphus (AI Assistant)
