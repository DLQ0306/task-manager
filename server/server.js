/**
 * 智能任务管理系统 —— 后端服务
 * 技术栈：Node.js + Express + Supabase（PostgreSQL 云数据库）
 *
 * 运行方式：在项目根目录执行  npm start
 *
 * 数据库模式说明（教学友好设计）：
 *   1) 如果环境变量里配了 SUPABASE_URL 和 SUPABASE_ANON_KEY，
 *      就连接你自己在 Supabase 上建的云端数据库（正式模式）。
 *   2) 如果没配（默认），自动使用本地文件 data/tasks.json 模拟数据库，
 *      让你在拿到 Supabase 账号之前也能先看到界面、先玩起来（演示模式）。
 */
const express = require('express');
const path = require('path');
const fs = require('fs');
const { createClient } = require('@supabase/supabase-js');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

/* ==================== 数据库连接 ==================== */

let supabase = null;
if (process.env.SUPABASE_URL && process.env.SUPABASE_ANON_KEY) {
  supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);
  console.log('[数据库] 已连接 Supabase 云端数据库（正式模式）');
} else {
  console.log('[数据库] 未配置 SUPABASE 环境变量 → 使用本地文件模式（演示模式）');
}

/* ==================== 本地文件数据库（演示模式） ==================== */

const DATA_FILE = path.join(__dirname, 'data', 'tasks.json');

function ensureDataFile() {
  const dir = path.dirname(DATA_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  if (!fs.existsSync(DATA_FILE)) fs.writeFileSync(DATA_FILE, '[]', 'utf-8');
}

function readLocalTasks() {
  ensureDataFile();
  try {
    return JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
  } catch (e) {
    return [];
  }
}

function writeLocalTasks(tasks) {
  ensureDataFile();
  fs.writeFileSync(DATA_FILE, JSON.stringify(tasks, null, 2), 'utf-8');
}

/* ==================== API 接口 ==================== */

// 1. 查询任务列表（支持按优先级筛选；默认按创建时间倒序：最新在最上面）
app.get('/api/tasks', async (req, res) => {
  const { priority } = req.query;
  try {
    if (supabase) {
      let query = supabase
        .from('tasks')
        .select('*')
        .order('created_at', { ascending: false });
      if (priority && priority !== '全部') {
        query = query.eq('priority', priority);
      }
      const { data, error } = await query;
      if (error) throw error;
      res.json(data);
    } else {
      let tasks = readLocalTasks();
      if (priority && priority !== '全部') {
        tasks = tasks.filter((t) => t.priority === priority);
      }
      tasks.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      res.json(tasks);
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// 2. 添加任务（标题必填，优先级默认「中」）
app.post('/api/tasks', async (req, res) => {
  const { title, priority } = req.body || {};
  if (!title || !String(title).trim()) {
    return res.status(400).json({ error: '任务标题不能为空' });
  }
  const validPriority = ['高', '中', '低'];
  const p = validPriority.includes(priority) ? priority : '中';
  try {
    if (supabase) {
      const { data, error } = await supabase
        .from('tasks')
        .insert({ title: String(title).trim(), priority: p })
        .select()
        .single();
      if (error) throw error;
      res.status(201).json(data);
    } else {
      const tasks = readLocalTasks();
      const newTask = {
        id: Date.now(),
        title: String(title).trim(),
        priority: p,
        completed: false,
        created_at: new Date().toISOString(),
      };
      tasks.push(newTask);
      writeLocalTasks(tasks);
      res.status(201).json(newTask);
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// 3. 切换完成 / 未完成
app.patch('/api/tasks/:id', async (req, res) => {
  const id = req.params.id;
  const { completed } = req.body || {};
  try {
    if (supabase) {
      const { data, error } = await supabase
        .from('tasks')
        .update({ completed: Boolean(completed) })
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      res.json(data);
    } else {
      const tasks = readLocalTasks();
      const task = tasks.find((t) => String(t.id) === String(id));
      if (!task) return res.status(404).json({ error: '任务不存在' });
      task.completed = Boolean(completed);
      writeLocalTasks(tasks);
      res.json(task);
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// 4. 删除任务
app.delete('/api/tasks/:id', async (req, res) => {
  const id = req.params.id;
  try {
    if (supabase) {
      const { error } = await supabase.from('tasks').delete().eq('id', id);
      if (error) throw error;
      res.json({ success: true });
    } else {
      const tasks = readLocalTasks();
      const filtered = tasks.filter((t) => String(t.id) !== String(id));
      writeLocalTasks(filtered);
      res.json({ success: true });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

/* ==================== 托管前端页面 ==================== */

// 优先使用 public/ 目录（完整版构建产物），其次使用根目录 index.html（单文件版）
const indexFile = [
  path.join(__dirname, 'public', 'index.html'),
  path.join(__dirname, 'index.html'),
].find((f) => fs.existsSync(f));

if (indexFile) {
  // 非 /api 路径一律返回首页（React 单页应用）
  app.get('*', (req, res) => {
    res.sendFile(indexFile);
  });
}

/* ==================== 启动 ==================== */

app.listen(PORT, () => {
  console.log(`🚀 服务已启动：http://localhost:${PORT}`);
});
