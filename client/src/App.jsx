import React, { useEffect, useState } from 'react';

/**
 * 智能任务管理系统 —— 主界面组件
 *
 * 功能（对应作业要求）：
 *  1. 顶部输入框输入任务标题 + 下拉框选优先级（高/中/低）+ 点「添加」入库
 *  2. 任务列表按创建时间倒序显示（最新在最上面）
 *  3. 每条任务显示：标题、优先级标签、完成状态
 *  4. 每条任务有「完成/未完成」切换按钮和「删除」按钮
 *  5. 已完成任务文字自动加删除线、颜色变淡
 *  6. 顶部可按优先级筛选：全部 / 高 / 中 / 低
 */

// 优先级对应的标签颜色
const PRIORITY_COLORS = {
  高: '#e5484d',
  中: '#f5a524',
  低: '#30a46c',
};

export default function App() {
  // 任务列表数据
  const [tasks, setTasks] = useState([]);
  // 输入框内容
  const [title, setTitle] = useState('');
  // 选中的优先级
  const [priority, setPriority] = useState('中');
  // 筛选条件：全部 / 高 / 中 / 低
  const [filter, setFilter] = useState('全部');
  // 加载状态与错误信息
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // 从后端读取任务列表（每次筛选条件变化时重新拉取）
  useEffect(() => {
    fetchTasks();
  }, [filter]);

  async function fetchTasks() {
    try {
      setLoading(true);
      setError('');
      const url = filter === '全部' ? '/api/tasks' : `/api/tasks?priority=${encodeURIComponent(filter)}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error('加载失败');
      const data = await res.json();
      setTasks(data);
    } catch (e) {
      setError(e.message || '网络错误');
    } finally {
      setLoading(false);
    }
  }

  // 添加任务
  async function addTask() {
    if (!title.trim()) {
      alert('请输入任务标题');
      return;
    }
    try {
      setError('');
      const res = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: title.trim(), priority }),
      });
      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error || '添加失败');
      }
      setTitle('');
      // 重新拉取列表，保证最新任务排在最上面
      await fetchTasks();
    } catch (e) {
      setError(e.message || '网络错误');
    }
  }

  // 切换完成 / 未完成
  async function toggleTask(task) {
    try {
      setError('');
      const res = await fetch(`/api/tasks/${task.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completed: !task.completed }),
      });
      if (!res.ok) throw new Error('切换失败');
      await fetchTasks();
    } catch (e) {
      setError(e.message || '网络错误');
    }
  }

  // 删除任务
  async function deleteTask(task) {
    if (!window.confirm(`确定删除任务「${task.title}」吗？`)) return;
    try {
      setError('');
      const res = await fetch(`/api/tasks/${task.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('删除失败');
      await fetchTasks();
    } catch (e) {
      setError(e.message || '网络错误');
    }
  }

  return (
    <div className="page">
      <div className="card">
        <h1>📋 智能任务管理系统</h1>
        <p className="subtitle">输入任务标题，选择优先级，一键添加</p>

        {/* 顶部：输入框 + 优先级下拉 + 添加按钮 */}
        <div className="form">
          <input
            className="input"
            type="text"
            placeholder="输入任务标题，按回车添加"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') addTask();
            }}
          />
          <select
            className="select"
            value={priority}
            onChange={(e) => setPriority(e.target.value)}
          >
            <option value="高">高优先级</option>
            <option value="中">中优先级</option>
            <option value="低">低优先级</option>
          </select>
          <button className="btn add-btn" onClick={addTask}>
            添加
          </button>
        </div>

        {/* 筛选栏 */}
        <div className="filters">
          {['全部', '高', '中', '低'].map((f) => (
            <button
              key={f}
              className={`filter-btn ${filter === f ? 'active' : ''}`}
              onClick={() => setFilter(f)}
            >
              {f}
            </button>
          ))}
        </div>

        {/* 错误提示 */}
        {error && <p className="error">⚠️ {error}</p>}

        {/* 任务列表 */}
        {loading ? (
          <p className="empty">加载中…</p>
        ) : tasks.length === 0 ? (
          <p className="empty">
            {filter === '全部' ? '还没有任务，添加第一条吧 ✨' : `「${filter}」优先级下暂无任务`}
          </p>
        ) : (
          <ul className="task-list">
            {tasks.map((task) => (
              <li key={task.id} className={`task-item ${task.completed ? 'done' : ''}`}>
                <div className="task-info">
                  <span className="task-title">{task.title}</span>
                  <span
                    className="priority-tag"
                    style={{ backgroundColor: PRIORITY_COLORS[task.priority] || '#888' }}
                  >
                    {task.priority}
                  </span>
                  {task.completed && <span className="state-tag">已完成</span>}
                </div>
                <div className="task-actions">
                  <button
                    className="btn toggle-btn"
                    onClick={() => toggleTask(task)}
                  >
                    {task.completed ? '标记未完成' : '标记完成'}
                  </button>
                  <button className="btn delete-btn" onClick={() => deleteTask(task)}>
                    删除
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
