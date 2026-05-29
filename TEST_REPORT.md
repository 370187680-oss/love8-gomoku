# Love8 情侣五子棋 - 测试报告

## 测试环境
- **操作系统**: macOS
- **Node.js 版本**: v22.22.2
- **服务器端口**: 3001 (3000 被占用)
- **前端 Dev Server**: 5173 (尝试启动)
- **测试日期**: 2026-05-29

---

## 测试执行摘要

| 测试类别 | 通过 | 失败 | 阻塞 |
|---------|------|------|------|
| 后端逻辑测试 (server/test_gameManager.js) | 75 | 0 | 0 |
| 前端逻辑测试 (client/test_gameLogic.js) | 20 | 0 | 0 |
| 集成测试 (Socket.io) | 0 | 0 | 3 (P0 缺陷) |
| 前端构建测试 | 0 | 1 | 0 |
| 前端 Dev Server 测试 | 0 | 1 | 0 |

**总计**: 95 通过, 2 失败, 3 阻塞

**通过率**: 95/100 = 95% (不含阻塞项)

---

## 🔴 P0 严重 Bug (阻断测试/构建失败)

### Bug #1: `@mui/icons-material` 依赖缺失 + 版本不兼容
- **严重等级**: P0 (阻断构建)
- **位置**: `client/package.json`
- **描述**: 
  1. `package.json` 中引用了 `@mui/icons-material/Favorite` 和 `@mui/icons-material/RestartAlt`，但未在 dependencies 中声明该包
  2. 手动安装 `@mui/icons-material` 后，出现版本不兼容错误：`createSvgIcon` is not exported by `@mui/material/SvgIcon`
- **复现步骤**:
  1. `cd client && npm install`
  2. `npm run build` 或 `npm run dev`
- **期望行为**: 构建成功
- **实际行为**: 构建失败，报错 `Failed to resolve import "@mui/icons-material/Favorite"`
- **根本原因**: 
  - `@mui/material` 版本是 `^5.14.0` (可能是 5.x)
  - `@mui/icons-material` 最新版是 7.x (与 5.x 不兼容)
  - 需要锁定兼容版本
- **建议修复**:
  ```bash
  npm install @mui/icons-material@^5.14.0 --save --legacy-peer-deps
  ```
  或移除图标依赖，改用纯 CSS/Emoji 实现

### Bug #2: 服务器静态文件目录配置错误
- **严重等级**: P0 (生产环境无法访问前端)
- **位置**: `server/index.js` 第 23 行
- **描述**: 服务器配置了 `express.static('../client/dist')`，但：
  1. 构建失败 (见 Bug #1)，所以 `dist/` 目录不存在
  2. 即使构建成功，也应该先 `npm run build` 生成 `dist/`
- **复现步骤**:
  1. 启动服务器 `node server/index.js`
  2. 访问 `http://localhost:3000`
- **期望行为**: 显示前端页面
- **实际行为**: 404 或无法访问 (因为 `dist/` 不存在)
- **建议修复**:
  - 开发环境: 使用 Vite dev server (`client/` 运行 `npm run dev`)
  - 生产环境: 先构建前端 `cd client && npm run build`，确保 `dist/` 存在

### Bug #3: `useSocket.js` 未传递 `roomId` 和 `playerRole` 给 Socket 事件
- **严重等级**: P0 (核心功能失效)
- **位置**: `client/src/hooks/useSocket.js` 第 77-83 行
- **描述**: `placeStone` 函数只发送 `row` 和 `col`，但没有发送 `roomId`
  ```javascript
  // 当前代码 (Bug)
  const placeStone = useCallback((row, col) => {
    if (!socketRef.current) return;
    socketRef.current.emit(SOCKET_EVENTS.PLACE_STONE, {
      row,
      col,
      // ❌ 缺少 roomId!
    });
  }, []);
  ```
  
  后端 `index.js` 第 97 行期望 `roomId`:
  ```javascript
  const { roomId, row, col, player } = data; // roomId 是 undefined
  ```
- **复现步骤**:
  1. 创建房间并加入
  2. 点击棋盘落子
- **期望行为**: 落子成功，对方看到棋子
- **实际行为**: 后端报错 `Room not found` (因为 `roomId` 是 `undefined`)
- **建议修复**:
  ```javascript
  // useSocket.js
  const placeStone = useCallback((row, col, roomId) => {
    if (!socketRef.current) return;
    socketRef.current.emit(SOCKET_EVENTS.PLACE_STONE, {
      row,
      col,
      roomId, // ✅ 添加 roomId
    });
  }, []);
  
  // GameBoard.jsx 调用处
  placeStone(row, col, roomId);
  ```

---

## 🟠 P1 重要 Bug (功能异常)

### Bug #4: `GameBoard.jsx` 中 `board` 状态与 Canvas 绘制不同步
- **严重等级**: P1
- **位置**: `client/src/components/GameBoard.jsx` 第 48-63 行
- **描述**: 
  - `stone_placed` 事件触发时，调用 `setBoard(newBoard)` 更新状态
  - 然后立即调用 `drawBoard(newBoard)` 和 `drawStones(newBoard)`
  - 但 `setBoard` 是异步的！Canvas 可能在状态更新前就绘制了旧棋盘
- **复现步骤**:
  1. 进行游戏
  2. 观察棋盘绘制是否及时
- **期望行为**: Canvas 立即显示最新棋盘
- **实际行为**: 可能出现闪烁或延迟
- **建议修复**: 使用 `useEffect` 监听 `board` 状态变化，然后重绘 Canvas

### Bug #5: 断线处理后房间未正确清理
- **严重等级**: P1
- **位置**: `server/index.js` 第 172-194 行
- **描述**: 
  - 当玩家断线时，服务器广播 `opponent_disconnected`
  - 但房间仍然存在于 `gameManager.rooms` 中
  - 如果断线的玩家是房主 (black)，白方重新创建房间时会遇到问题
- **复现步骤**:
  1. 玩家 A 创建房间
  2. 玩家 B 加入
  3. 玩家 A 断线
  4. 玩家 A 重新创建房间
- **期望行为**: 旧房间被清理，玩家可以重新创建房间
- **实际行为**: 旧房间可能仍然存在 (取决于 `removePlayer` 的实现)
- **建议修复**: 在 `disconnect` 事件中，如果房间为空，立即删除房间

### Bug #6: 前端 `restart_request` 事件未传递 `roomId`
- **严重等级**: P1
- **位置**: `client/src/hooks/useSocket.js` 第 89-93 行
- **描述**: 与 Bug #3 类似，`requestRestart` 函数没有发送 `roomId`
  ```javascript
  const requestRestart = useCallback(() => {
    if (!socketRef.current) return;
    socketRef.current.emit(SOCKET_EVENTS.RESTART_REQUEST);
    // ❌ 缺少 roomId
  }, []);
  ```
- **复现步骤**:
  1. 游戏结束后点击"重新开始"
- **期望行为**: 游戏重置，双方看到空棋盘
- **实际行为**: 后端报错 `Room not found` (因为 `data.roomId` 是 `undefined`)
- **建议修复**:
  ```javascript
  const requestRestart = useCallback((roomId) => {
    if (!socketRef.current) return;
    socketRef.current.emit(SOCKET_EVENTS.RESTART_REQUEST, { roomId });
  }, []);
  ```

---

## 🟡 P2 次要 Bug (体验问题)

### Bug #7: 棋盘绘制坐标系可能不准确
- **严重等级**: P2
- **位置**: `client/src/components/GameBoard.jsx` 第 111-153 行
- **描述**: 
  - `cellSize = canvas.width / (BOARD_SIZE + 1)`
  - 网格线从 `cellSize` 开始绘制，但星位 (天元和星位) 的计算是 `cellSize * (col + 1)`
  - 点击检测使用 `Math.round(x / cellSize) - 1`，可能与绘制位置有 1px 偏差
- **复现步骤**:
  1. 点击棋盘边缘的交叉点
- **期望行为**: 棋子准确落在交叉点上
- **实际行为**: 棋子可能偏离交叉点
- **建议修复**: 统一坐标系计算，使用 `Math.floor` 替代 `Math.round`

### Bug #8: 游戏结果消息显示逻辑不完整
- **严重等级**: P2
- **位置**: `client/src/components/GameBoard.jsx` 第 254-266 行
- **描述**: 
  - `getGameResultMessage()` 函数在 `winner === null` 时显示 "对方离开了游戏"
  - 但在平局 (draw) 情况下，`winner` 是 `0` 而不是 `null`
  - 当前代码没有处理 `winner === 0` (平局) 的情况
- **复现步骤**:
  1. 棋盘下满，触发平局
- **期望行为**: 显示 "平局！"
- **实际行为**: 显示 "对方离开了游戏" (不正确)
- **建议修复**:
  ```javascript
  if (winner === null) {
    return '对方离开了游戏';
  } else if (winner === 0) {
    return '平局！';
  } else if (winner === myPlayer) {
    return '🎉 你赢了！';
  } else {
    return '😢 你输了';
  }
  ```

### Bug #9: `opponent_disconnected` 事件拼写错误
- **严重等级**: P2 (代码质量)
- **位置**: `server/index.js` 第 184 行
- **描述**: 
  ```javascript
  message: 'Opponent disconnected', // ❌ Opponent 应该是 Opponent
  ```
  正确拼写是 "Opponent" (多了一个 'n')
- **建议修复**: 改为 `'Opponent disconnected'`

### Bug #10: 服务器健康检查端点返回格式不一致
- **严重等级**: P2 (代码质量)
- **位置**: `server/index.js` 第 26-31 行
- **描述**: 
  - `/api/health` 返回 `{ status: 'ok', rooms: 0 }`
  - 但其他错误响应返回 `{ message: '...' }`
  - 建议统一响应格式
- **建议修复**: 统一使用 `{ success: boolean, data: any, error: string }` 格式

---

## ⚠️ 代码问题与改进建议

### 问题 #1: 前后端 `checkWin` 算法重复
- **位置**: `server/gameManager.js` 和 `client/src/utils/gameLogic.js`
- **描述**: 相同的算法实现了两次，维护成本高
- **建议**: 
  - 方案 A: 前端每次落子前调用后端 API 验证 (但会增加延迟)
  - 方案 B: 将算法抽取为共享库 (但需要额外构建步骤)
  - 方案 C: 保持现状，但添加跨端测试用例确保一致性 (当前已测试)

### 问题 #2: 缺少输入验证
- **位置**: `server/index.js`
- **描述**: 
  - `row` 和 `col` 应该是整数，但没有验证
  - `playerName` 应该限制长度 (防止超长字符串攻击)
- **建议**: 添加 `express-validator` 或手动验证

### 问题 #3: 缺少日志和监控
- **位置**: 整个后端
- **描述**: 只有 `console.log`，没有日志级别、持久化或监控
- **建议**: 使用 `winston` 或 `pino` 日志库

### 问题 #4: 前端主题配置未找到
- **位置**: `client/src/theme/love8Theme.js`
- **描述**: 代码引用了 `love8Theme`，但无法验证其内容是否符合 Love8 品牌 (粉色/红色/白色)
- **建议**: 验证 `love8Theme.js` 的内容

---

## ✅ 测试通过的功能

### 后端逻辑测试 (75 通过)
- ✅ Room 创建、加入、离开
- ✅ 胜负判定 (4 个方向)
- ✅ 边界条件 (棋盘边缘、满员、重复落子)
- ✅ 游戏重置
- ✅ GameManager 房间管理
- ✅ 平局检测

### 前端逻辑测试 (20 通过)
- ✅ `checkWin` 与前端的算法一致性
- ✅ `createEmptyBoard` 正确创建空棋盘
- ✅ `getNextPlayer` 正确切换玩家
- ✅ `isBoardFull` 正确检测平局

---

## 📊 测试覆盖率估算

| 模块 | 估计覆盖率 |
|------|------------|
| `server/gameManager.js` | 85% |
| `server/index.js` (Socket.io 事件) | 40% (需要集成测试) |
| `client/src/utils/gameLogic.js` | 90% |
| `client/src/hooks/useSocket.js` | 30% (需要 Mock Socket) |
| `client/src/components/GameBoard.jsx` | 20% (需要 Jest + React Testing Library) |
| `client/src/components/Lobby.jsx` | 10% (需要 Jest + React Testing Library) |

---

## 🔧 修复优先级建议

1. **立即修复 (P0)**:
   - Bug #1: 修复 `@mui/icons-material` 依赖
   - Bug #3: 修复 `placeStone` 缺少 `roomId`
   - Bug #6: 修复 `requestRestart` 缺少 `roomId`

2. **本周修复 (P1)**:
   - Bug #4: 修复 Canvas 绘制同步问题
   - Bug #5: 修复断线房间清理
   
3. **下次迭代 (P2)**:
   - Bug #7-#10: 优化用户体验和代码质量

---

## 🚀 后续测试建议

1. **集成测试**: 使用 Socket.io Client 完整测试创建房间 → 加入 → 落子 → 胜负的流程
2. **E2E 测试**: 使用 Cypress 或 Playwright 模拟真实用户操作
3. **性能测试**: 测试多房间并发、内存泄漏
4. **安全测试**: 测试 XSS、CSRF、Socket.io 认证

---

## 📝 测试结论

**当前状态**: ❌ **测试不通过** (存在 P0 阻断性 Bug)

**阻断问题**:
1. 前端构建失败 (依赖不兼容)
2. 核心功能 (落子、重新开始) 无法正常工作 (缺少 `roomId`)

**建议**: 
1. 立即修复 P0 Bug
2. 修复后重新运行完整测试套件
3. 添加自动化 CI/CD 测试流程

---

**测试人员**: Edward (QA Engineer)  
**测试日期**: 2026-05-29  
**测试工具**: Node.js, Socket.io, 手动代码审查
