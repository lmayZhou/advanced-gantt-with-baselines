
import React, { useState, useMemo, useRef, useEffect, useCallback } from 'react';
import { Task } from './types';
import { INITIAL_TASKS, GANTT_CONFIG } from './constants';
import { 
  PlusIcon, 
  CalendarIcon,
  ChevronRightIcon,
  ChevronDownIcon,
  ClockIcon,
  XMarkIcon,
  CheckIcon,
  TagIcon,
  ArrowPathIcon,
  PencilSquareIcon
} from '@heroicons/react/24/outline';

type InteractionType = 
  | 'move' | 'resize-start' | 'resize-end' 
  | 'column-resize' | 'progress-resize' 
  | 'baseline-move' | 'baseline-resize-start' | 'baseline-resize-end'
  | null;

type ViewMode = 'day' | 'week' | 'month';

interface ActiveInteraction {
  taskId?: string;
  type: InteractionType;
  initialX: number;
  initialStartDate?: Date;
  initialEndDate?: Date;
  initialProgress?: number;
  columnIndex?: number;
  initialColumnWidths?: number[];
}

const App: React.FC = () => {
  const [tasks, setTasks] = useState<Task[]>(INITIAL_TASKS);
  const [activeInteraction, setActiveInteraction] = useState<ActiveInteraction | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('day');
  const [columnWidths, setColumnWidths] = useState<number[]>([250, 110, 110, 80]);
  
  // 弹窗状态
  const [editingBaselineId, setEditingBaselineId] = useState<string | null>(null);
  const [tempBaseline, setTempBaseline] = useState<{start: string, end: string} | null>(null);
  
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
  const [tempTaskEditData, setTempTaskEditData] = useState<{text: string, start: string, end: string, type: 'task' | 'project' | 'milestone'} | null>(null);

  const [isAddingTask, setIsAddingTask] = useState(false);
  const [newTaskData, setNewTaskData] = useState({
    text: '',
    start_date: formatDate(new Date()),
    end_date: formatDate(new Date(Date.now() + 86400000 * 5)),
    type: 'task' as 'task' | 'project' | 'milestone'
  });

  const timelineRef = useRef<HTMLDivElement>(null);
  const gridBodyRef = useRef<HTMLDivElement>(null);

  const totalGridWidth = useMemo(() => columnWidths.reduce((a, b) => a + b, 0), [columnWidths]);

  const handleTimelineScroll = (e: React.UIEvent<HTMLDivElement>) => {
    if (gridBodyRef.current) gridBodyRef.current.scrollTop = e.currentTarget.scrollTop;
  };

  function formatDate(date: Date) {
    return `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`;
  }

  // 动态计算时间轴范围
  const timelineRange = useMemo(() => {
    let min = new Date();
    let max = new Date();
    
    if (tasks.length > 0) {
      const firstTask = tasks[0];
      min = new Date(Math.min(
        firstTask.start_date.getTime(), 
        firstTask.planned_start?.getTime() || firstTask.start_date.getTime()
      ));
      max = new Date(Math.max(
        firstTask.end_date.getTime(), 
        firstTask.planned_end?.getTime() || firstTask.end_date.getTime()
      ));
      
      tasks.forEach(t => {
        const dates = [t.start_date, t.end_date, t.planned_start, t.planned_end].filter(Boolean) as Date[];
        dates.forEach(d => {
          if (d.getTime() < min.getTime()) min = new Date(d);
          if (d.getTime() > max.getTime()) max = new Date(d);
        });
      });
    }

    min.setHours(0, 0, 0, 0);
    max.setHours(0, 0, 0, 0);

    const start = new Date(min);
    start.setDate(start.getDate() - 1); // 严格左侧留1天
    
    const end = new Date(max);
    end.setDate(end.getDate() + 7); // 右侧留7天作为缓冲

    return { start, end };
  }, [tasks]);

  const currentCellWidth = useMemo(() => {
    switch(viewMode) {
      case 'week': return 100;
      case 'month': return 180;
      default: return GANTT_CONFIG.cellWidth;
    }
  }, [viewMode]);

  const visibleTasks = useMemo(() => {
    const isVisible = (task: Task): boolean => {
      if (!task.parent) return true;
      const parent = tasks.find(t => t.id === task.parent);
      if (!parent || !parent.open) return false;
      return isVisible(parent);
    };
    return tasks.filter(isVisible);
  }, [tasks]);

  const timelineDates = useMemo(() => {
    const dates: Date[] = [];
    const current = new Date(timelineRange.start);
    
    if (viewMode === 'day') {
      while (current <= timelineRange.end) {
        dates.push(new Date(current));
        current.setDate(current.getDate() + 1);
      }
    } else if (viewMode === 'week') {
      current.setDate(current.getDate() - current.getDay());
      while (current <= timelineRange.end) {
        dates.push(new Date(current));
        current.setDate(current.getDate() + 7);
      }
    } else {
      current.setDate(1);
      while (current <= timelineRange.end) {
        dates.push(new Date(current));
        current.setMonth(current.getMonth() + 1);
      }
    }
    return dates;
  }, [viewMode, timelineRange]);

  const getPosition = useCallback((date: Date) => {
    const start = timelineDates[0];
    if (!start) return 0;
    const diff = date.getTime() - start.getTime();
    const dayMs = 86400000;
    if (viewMode === 'day') return (diff / dayMs) * currentCellWidth;
    if (viewMode === 'week') return (diff / (dayMs * 7)) * currentCellWidth;
    return (diff / (dayMs * 30.44)) * currentCellWidth;
  }, [timelineDates, viewMode, currentCellWidth]);

  const getWidth = useCallback((start: Date, end: Date) => {
    const diff = end.getTime() - start.getTime();
    const dayMs = 86400000;
    if (viewMode === 'day') return (diff / dayMs) * currentCellWidth;
    if (viewMode === 'week') return (diff / (dayMs * 7)) * currentCellWidth;
    return (diff / (dayMs * 30.44)) * currentCellWidth;
  }, [viewMode, currentCellWidth]);

  const handleInteractionStart = (e: React.MouseEvent, type: InteractionType, taskId?: string, columnIndex?: number) => {
    if (type === 'column-resize') {
      setActiveInteraction({ type, initialX: e.clientX, columnIndex, initialColumnWidths: [...columnWidths] });
    } else if (taskId) {
      const task = tasks.find(t => t.id === taskId);
      if (!task) return;
      const isBaseline = type?.startsWith('baseline');
      setActiveInteraction({
        taskId,
        type,
        initialX: e.clientX,
        initialStartDate: new Date((isBaseline ? task.planned_start : task.start_date) || new Date()),
        initialEndDate: new Date((isBaseline ? task.planned_end : task.end_date) || new Date()),
        initialProgress: task.progress,
      });
    }
    e.stopPropagation();
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!activeInteraction) return;
      const deltaX = e.clientX - activeInteraction.initialX;

      if (activeInteraction.type === 'column-resize' && activeInteraction.columnIndex !== undefined) {
        const newWidths = [...activeInteraction.initialColumnWidths!];
        newWidths[activeInteraction.columnIndex] = Math.max(40, newWidths[activeInteraction.columnIndex] + deltaX);
        setColumnWidths(newWidths);
        return;
      }

      if (!activeInteraction.taskId) return;
      const dayMs = 86400000;
      let factor = dayMs;
      if (viewMode === 'week') factor = dayMs * 7;
      if (viewMode === 'month') factor = dayMs * 30.44;

      const deltaDays = Math.round(deltaX / (currentCellWidth / (factor / dayMs)));

      setTasks(prevTasks => prevTasks.map(t => {
        if (t.id !== activeInteraction.taskId) return t;
        const newStart = new Date(activeInteraction.initialStartDate!);
        const newEnd = new Date(activeInteraction.initialEndDate!);

        const updateType = activeInteraction.type;
        if (updateType === 'move' || updateType === 'baseline-move') {
          newStart.setDate(newStart.getDate() + deltaDays);
          newEnd.setDate(newEnd.getDate() + deltaDays);
        } else if (updateType === 'resize-start' || updateType === 'baseline-resize-start') {
          newStart.setDate(newStart.getDate() + deltaDays);
          if (newStart.getTime() >= newEnd.getTime()) newStart.setTime(newEnd.getTime() - dayMs);
        } else if (updateType === 'resize-end' || updateType === 'baseline-resize-end') {
          newEnd.setDate(newEnd.getDate() + deltaDays);
          if (newEnd.getTime() <= newStart.getTime()) newEnd.setTime(newStart.getTime() + dayMs);
        } else if (updateType === 'progress-resize') {
          const barWidth = getWidth(t.start_date, t.end_date);
          let newProgress = activeInteraction.initialProgress! + (deltaX / barWidth);
          if (newProgress > 0.98) newProgress = 1;
          if (newProgress < 0.02) newProgress = 0;
          return { ...t, progress: Math.max(0, Math.min(1, newProgress)) };
        }

        if (updateType?.startsWith('baseline')) {
          return { ...t, planned_start: newStart, planned_end: newEnd };
        }
        const duration = Math.ceil((newEnd.getTime() - newStart.getTime()) / dayMs);
        return { ...t, start_date: newStart, end_date: newEnd, duration: Math.max(0, duration) };
      }));
    };

    const handleMouseUp = () => setActiveInteraction(null);
    if (activeInteraction) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }
    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [activeInteraction, viewMode, currentCellWidth, getWidth]);

  // 新增项目
  const confirmAddTask = () => {
    if (!newTaskData.text.trim()) return;
    const start = new Date(newTaskData.start_date);
    const end = new Date(newTaskData.end_date);
    const duration = Math.ceil((end.getTime() - start.getTime()) / 86400000);

    const newTask: Task = {
      id: `task-${Date.now()}`,
      text: newTaskData.text,
      start_date: start,
      end_date: end,
      duration: Math.max(0, duration),
      progress: 0,
      type: newTaskData.type,
      open: true,
      planned_start: new Date(start),
      planned_end: new Date(end)
    };
    setTasks([...tasks, newTask]);
    setIsAddingTask(false);
    setNewTaskData({
        text: '',
        start_date: formatDate(new Date()),
        end_date: formatDate(new Date(Date.now() + 86400000 * 5)),
        type: 'task'
    });
  };

  // 任务条双击处理
  const handleTaskDoubleClick = (task: Task) => {
    setEditingTaskId(task.id);
    setTempTaskEditData({
        text: task.text,
        start: formatDate(task.start_date),
        end: formatDate(task.end_date),
        type: task.type || 'task'
    });
  };

  // 保存任务编辑
  const saveTaskEdit = () => {
    if (!editingTaskId || !tempTaskEditData) return;
    const start = new Date(tempTaskEditData.start);
    const end = new Date(tempTaskEditData.end);
    const duration = Math.ceil((end.getTime() - start.getTime()) / 86400000);

    setTasks(prev => prev.map(t => t.id === editingTaskId ? {
        ...t,
        text: tempTaskEditData.text,
        start_date: start,
        end_date: end,
        duration: Math.max(0, duration),
        type: tempTaskEditData.type
    } : t));
    setEditingTaskId(null);
  };

  const handleBaselineDoubleClick = (task: Task) => {
    setEditingBaselineId(task.id);
    setTempBaseline({
      start: task.planned_start ? formatDate(task.planned_start) : formatDate(task.start_date),
      end: task.planned_end ? formatDate(task.planned_end) : formatDate(task.end_date)
    });
  };

  const saveBaselineEdit = () => {
    if (!editingBaselineId || !tempBaseline) return;
    setTasks(prev => prev.map(t => t.id === editingBaselineId ? {
      ...t,
      planned_start: new Date(tempBaseline.start),
      planned_end: new Date(tempBaseline.end)
    } : t));
    setEditingBaselineId(null);
  };

  const renderMonthHeaders = () => {
    const monthGroups: { month: string, width: number }[] = [];
    timelineDates.forEach(date => {
        const monthStr = `${date.getFullYear()}年${date.getMonth() + 1}月`;
        const last = monthGroups[monthGroups.length - 1];
        if (last && last.month === monthStr) {
            last.width += currentCellWidth;
        } else {
            monthGroups.push({ month: monthStr, width: currentCellWidth });
        }
    });

    return monthGroups.map((group, idx) => (
      <div key={idx} className="timeline-header-cell border-b border-[#ebebeb] sticky left-0 z-40 bg-[#f8f9fa]" style={{ width: group.width, height: 40, borderRight: '1px solid #ebebeb' }}>
        <span className="sticky left-4 whitespace-nowrap px-4 py-1 rounded bg-white shadow-sm border border-slate-200 text-indigo-600 font-bold">{group.month}</span>
      </div>
    ));
  };

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-white select-none">
      <header className="h-16 flex items-center justify-between px-6 bg-[#0f172a] text-white shadow-lg z-50">
        <div className="flex items-center space-x-4">
          <div className="p-2 bg-indigo-500 rounded-lg shadow-inner">
            <CalendarIcon className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight">企业级甘特图 V7.2</h1>
            <p className="text-[10px] text-slate-400 uppercase font-bold tracking-widest">Interactive Modals & Smart Timeline</p>
          </div>
        </div>
        
        <div className="flex items-center space-x-4">
          <div className="flex bg-slate-800 p-1 rounded-lg border border-slate-700 shadow-inner">
            {(['day', 'week', 'month'] as ViewMode[]).map(mode => (
              <button
                key={mode}
                onClick={() => setViewMode(mode)}
                className={`px-5 py-1.5 text-xs font-bold rounded-md transition-all ${viewMode === mode ? 'bg-indigo-500 text-white shadow-md' : 'text-slate-400 hover:text-white'}`}
              >
                {mode === 'day' ? '日' : mode === 'week' ? '周' : '月'}
              </button>
            ))}
          </div>
          <button 
            onClick={() => setIsAddingTask(true)}
            className="flex items-center space-x-2 px-5 py-2 bg-emerald-500 hover:bg-emerald-600 text-sm rounded-lg font-bold shadow-md transition-all active:scale-95"
          >
            <PlusIcon className="w-4 h-4" />
            <span>新增任务</span>
          </button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden relative">
        <div className="flex flex-col border-r border-slate-200 bg-white z-40 relative shadow-2xl" style={{ width: totalGridWidth }}>
          <div className="flex bg-[#f8f9fa] border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase" style={{ height: GANTT_CONFIG.headerHeight }}>
            {['任务名称', '开始', '结束', '进度'].map((label, idx) => (
              <div key={idx} className="relative flex items-center px-4 border-r border-slate-100 justify-center h-full" style={{ width: columnWidths[idx] }}>
                {label}
                <div onMouseDown={(e) => handleInteractionStart(e, 'column-resize', undefined, idx)} className="column-resize-handle" />
              </div>
            ))}
          </div>
          
          <div ref={gridBodyRef} className="flex-1 overflow-hidden bg-white">
            {visibleTasks.map((task, i) => {
              const indent = (tasks.find(t => t.id === task.id)?.parent ? 24 : 0) + (task.id.includes('.') ? 20 : 0);
              const hasChildren = tasks.some(t => t.parent === task.id);
              return (
                <div key={task.id} className={`flex border-b border-slate-50 items-center text-[12px] hover:bg-slate-50 transition-colors ${i % 2 === 0 ? 'bg-white' : 'bg-slate-50/40'}`} style={{ height: GANTT_CONFIG.rowHeight }}>
                  <div className="px-4 truncate flex items-center shrink-0 h-full border-r border-slate-50" style={{ width: columnWidths[0], paddingLeft: `${16 + indent}px` }}>
                    <div className="w-5 flex items-center justify-center mr-1">
                      {hasChildren && (
                        <button onClick={() => setTasks(prev => prev.map(t => t.id === task.id ? { ...t, open: !t.open } : t))} className="text-slate-400 hover:text-indigo-500">
                          {task.open ? <ChevronDownIcon className="w-4 h-4" /> : <ChevronRightIcon className="w-4 h-4" />}
                        </button>
                      )}
                    </div>
                    {task.type === 'project' ? <div className="w-2 h-6 bg-indigo-400 rounded-sm mr-2 shrink-0 shadow-sm" /> : task.type === 'milestone' ? <div className="w-2.5 h-2.5 rotate-45 bg-fuchsia-500 mr-2 shrink-0 shadow-sm border border-white" /> : <div className="w-2 h-6 bg-emerald-400 rounded-sm mr-2 shrink-0 shadow-sm" />}
                    <span className={`truncate ${task.type === 'project' ? 'font-bold text-slate-800' : 'text-slate-600'}`}>{task.text}</span>
                  </div>
                  <div className="text-[10px] text-slate-400 font-mono text-center border-r border-slate-50 h-full flex items-center justify-center shrink-0" style={{ width: columnWidths[1] }}>{formatDate(task.start_date)}</div>
                  <div className="text-[10px] text-slate-400 font-mono text-center border-r border-slate-50 h-full flex items-center justify-center shrink-0" style={{ width: columnWidths[2] }}>{formatDate(task.end_date)}</div>
                  <div className="text-[11px] font-bold text-indigo-500 text-center h-full flex items-center justify-center shrink-0" style={{ width: columnWidths[3] }}>{Math.round(task.progress * 100)}%</div>
                </div>
              );
            })}
          </div>
        </div>

        <div ref={timelineRef} onScroll={handleTimelineScroll} className="flex-1 overflow-auto bg-white relative custom-scrollbar">
          <div className="sticky top-0 z-30 whitespace-nowrap min-w-max flex flex-col">
            <div className="flex shadow-sm">{renderMonthHeaders()}</div>
            <div className="flex h-[40px] bg-[#f8f9fa] border-b border-slate-200">
              {timelineDates.map((date, idx) => (
                <div key={idx} className={`flex-shrink-0 border-r border-slate-100 text-[10px] flex items-center justify-center font-bold ${(viewMode === 'day' && [0, 6].includes(date.getDay())) ? 'bg-red-50 text-red-400' : 'text-slate-400'}`} style={{ width: currentCellWidth }}>
                  {viewMode === 'day' ? date.getDate() : viewMode === 'week' ? `W${Math.ceil(date.getDate() / 7)}` : `${date.getMonth() + 1}月`}
                </div>
              ))}
            </div>
          </div>

          <div className="relative inline-block min-w-full" style={{ height: visibleTasks.length * GANTT_CONFIG.rowHeight }}>
            <div className="absolute inset-0 flex pointer-events-none">
              {timelineDates.map((date, i) => <div key={i} className={`h-full border-r border-slate-100/50 ${(viewMode === 'day' && [0, 6].includes(date.getDay())) ? 'bg-slate-50/80' : ''}`} style={{ width: currentCellWidth }} />)}
            </div>

            {visibleTasks.map((task, i) => {
              const actualX = getPosition(task.start_date);
              const actualW = task.type === 'milestone' ? 0 : Math.max(30, getWidth(task.start_date, task.end_date));
              const baselineX = task.planned_start ? getPosition(task.planned_start) : null;
              const baselineW = (task.planned_start && task.planned_end) ? Math.max(10, getWidth(task.planned_start, task.planned_end)) : 0;
              const isTaskDragging = activeInteraction?.taskId === task.id;

              return (
                <div key={task.id} className={`relative border-b border-slate-100 group ${i % 2 === 0 ? 'bg-white' : 'bg-slate-50/20'}`} style={{ height: GANTT_CONFIG.rowHeight }}>
                  {baselineX !== null && (
                    <div 
                      onMouseDown={(e) => handleInteractionStart(e, 'baseline-move', task.id)}
                      onDoubleClick={() => handleBaselineDoubleClick(task)}
                      className={`baseline-bar group/baseline ${isTaskDragging && activeInteraction?.type?.includes('baseline') ? 'dragging shadow-md' : ''}`} 
                      style={{ left: baselineX, width: baselineW, bottom: '6px' }}
                    >
                        <div onMouseDown={(e) => handleInteractionStart(e, 'baseline-resize-start', task.id)} className="baseline-handle left-0 bg-slate-400/10 hover:bg-slate-400/40 transition-colors" />
                        <div onMouseDown={(e) => handleInteractionStart(e, 'baseline-resize-end', task.id)} className="baseline-handle right-0 bg-slate-400/10 hover:bg-slate-400/40 transition-colors" />
                    </div>
                  )}

                  {task.type !== 'milestone' ? (
                    <div 
                      onMouseDown={(e) => handleInteractionStart(e, 'move', task.id)} 
                      onDoubleClick={() => handleTaskDoubleClick(task)}
                      className={`actual-bar ${task.type === 'project' ? 'bg-indigo-400' : 'bg-emerald-400'} ${isTaskDragging && !activeInteraction?.type?.includes('baseline') ? 'dragging shadow-2xl scale-[1.01]' : ''}`} 
                      style={{ left: actualX, width: actualW, top: '6px' }}
                    >
                      <div onMouseDown={(e) => handleInteractionStart(e, 'resize-start', task.id)} className="resize-handle resize-handle-left hover:bg-white/30" />
                      <div onMouseDown={(e) => handleInteractionStart(e, 'resize-end', task.id)} className="resize-handle resize-handle-right hover:bg-white/30" />
                      
                      <div 
                        onMouseDown={(e) => handleInteractionStart(e, 'progress-resize', task.id)} 
                        className="progress-handle flex items-center justify-center group/p-handle" 
                        style={{ left: `calc(${task.progress * 100}% - 3px)` }}
                      >
                         <div className="w-0.5 h-1/2 bg-white/60 group-hover/p-handle:bg-white shadow-sm" />
                      </div>

                      <div className="progress-fill shadow-inner" style={{ width: `${task.progress * 100}%` }} />
                      <div className="absolute inset-0 flex items-center justify-center px-4 pointer-events-none overflow-hidden">
                        <span className="text-[10px] text-white font-bold truncate drop-shadow-lg text-center w-full uppercase tracking-tighter">
                          {task.text}
                        </span>
                      </div>
                    </div>
                  ) : (
                    <div onMouseDown={(e) => handleInteractionStart(e, 'move', task.id)} onDoubleClick={() => handleTaskDoubleClick(task)} className="milestone-diamond border-2 border-white" style={{ left: actualX - 8, top: '14px' }} />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 任务编辑弹窗 */}
      {editingTaskId && tempTaskEditData && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-md z-[100] flex items-center justify-center">
            <div className="bg-white rounded-2xl shadow-2xl w-[450px] overflow-hidden border border-slate-200 animate-in fade-in zoom-in duration-200">
                <div className="px-6 py-5 bg-indigo-50 border-b border-indigo-100 flex justify-between items-center">
                    <h3 className="font-bold text-slate-800 flex items-center gap-3 text-lg">
                        <PencilSquareIcon className="w-6 h-6 text-indigo-500" />
                        编辑任务详情
                    </h3>
                    <button onClick={() => setEditingTaskId(null)} className="p-2 hover:bg-indigo-100 rounded-full transition-colors text-indigo-600">
                        <XMarkIcon className="w-5 h-5" />
                    </button>
                </div>
                <div className="p-8 space-y-5">
                    <div className="space-y-4">
                        <div className="flex flex-col gap-1.5">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">任务名称</label>
                            <input 
                                type="text" 
                                value={tempTaskEditData.text} 
                                onChange={(e) => setTempTaskEditData({...tempTaskEditData, text: e.target.value})}
                                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-slate-700 font-medium"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="flex flex-col gap-1.5">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">开始日期</label>
                                <input 
                                    type="date" 
                                    value={tempTaskEditData.start} 
                                    onChange={(e) => setTempTaskEditData({...tempTaskEditData, start: e.target.value})}
                                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-slate-700"
                                />
                            </div>
                            <div className="flex flex-col gap-1.5">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">结束日期</label>
                                <input 
                                    type="date" 
                                    value={tempTaskEditData.end} 
                                    onChange={(e) => setTempTaskEditData({...tempTaskEditData, end: e.target.value})}
                                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-slate-700"
                                />
                            </div>
                        </div>
                        <div className="flex flex-col gap-1.5">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">任务类型</label>
                            <div className="grid grid-cols-3 gap-2">
                                {(['task', 'project', 'milestone'] as const).map(type => (
                                    <button
                                        key={type}
                                        onClick={() => setTempTaskEditData({...tempTaskEditData, type})}
                                        className={`py-2 text-xs font-bold rounded-lg border transition-all ${tempTaskEditData.type === type ? 'bg-indigo-500 border-indigo-600 text-white shadow-md' : 'bg-slate-50 border-slate-200 text-slate-400 hover:border-indigo-300'}`}
                                    >
                                        {type === 'task' ? '普通任务' : type === 'project' ? '概要项目' : '重要里程碑'}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                    <div className="flex gap-3 pt-4">
                        <button 
                            onClick={() => setEditingTaskId(null)}
                            className="flex-1 px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-xl transition-colors"
                        >
                            取消
                        </button>
                        <button 
                            onClick={saveTaskEdit}
                            className="flex-1 px-4 py-3 bg-indigo-500 hover:bg-indigo-600 text-white font-bold rounded-xl shadow-lg flex items-center justify-center gap-2 transition-all active:scale-95"
                        >
                            <CheckIcon className="w-5 h-5" />
                            保存修改
                        </button>
                    </div>
                </div>
            </div>
        </div>
      )}

      {/* 新增任务弹窗 */}
      {isAddingTask && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-md z-[100] flex items-center justify-center">
            <div className="bg-white rounded-2xl shadow-2xl w-[450px] overflow-hidden border border-slate-200 animate-in fade-in zoom-in duration-200">
                <div className="px-6 py-5 bg-emerald-50 border-b border-emerald-100 flex justify-between items-center">
                    <h3 className="font-bold text-slate-800 flex items-center gap-3 text-lg">
                        <PlusIcon className="w-6 h-6 text-emerald-500" />
                        创建新任务
                    </h3>
                    <button onClick={() => setIsAddingTask(false)} className="p-2 hover:bg-emerald-100 rounded-full transition-colors text-emerald-600">
                        <XMarkIcon className="w-5 h-5" />
                    </button>
                </div>
                <div className="p-8 space-y-5">
                    <div className="space-y-4">
                        <div className="flex flex-col gap-1.5">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">任务名称</label>
                            <input 
                                type="text" 
                                autoFocus
                                placeholder="输入任务或项目名称..."
                                value={newTaskData.text} 
                                onChange={(e) => setNewTaskData({...newTaskData, text: e.target.value})}
                                className="w-full px-4 py-2.5 border border-slate-200 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition-all text-slate-700 font-medium"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="flex flex-col gap-1.5">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">开始日期</label>
                                <input 
                                    type="date" 
                                    value={newTaskData.start_date} 
                                    onChange={(e) => setNewTaskData({...newTaskData, start_date: e.target.value})}
                                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none transition-all text-slate-700"
                                />
                            </div>
                            <div className="flex flex-col gap-1.5">
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">结束日期</label>
                                <input 
                                    type="date" 
                                    value={newTaskData.end_date} 
                                    onChange={(e) => setNewTaskData({...newTaskData, end_date: e.target.value})}
                                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none transition-all text-slate-700"
                                />
                            </div>
                        </div>
                        <div className="flex flex-col gap-1.5">
                            <label className="text-xs font-bold text-slate-500 uppercase tracking-widest">任务类型</label>
                            <div className="grid grid-cols-3 gap-2">
                                {(['task', 'project', 'milestone'] as const).map(type => (
                                    <button
                                        key={type}
                                        onClick={() => setNewTaskData({...newTaskData, type})}
                                        className={`py-2 text-xs font-bold rounded-lg border transition-all ${newTaskData.type === type ? 'bg-emerald-500 border-emerald-600 text-white shadow-md' : 'bg-slate-50 border-slate-200 text-slate-400 hover:border-emerald-300'}`}
                                    >
                                        {type === 'task' ? '普通任务' : type === 'project' ? '概要项目' : '重要里程碑'}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                    <div className="flex gap-3 pt-4">
                        <button 
                            onClick={() => setIsAddingTask(false)}
                            className="flex-1 px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-xl transition-colors"
                        >
                            取消
                        </button>
                        <button 
                            onClick={confirmAddTask}
                            disabled={!newTaskData.text}
                            className={`flex-1 px-4 py-3 font-bold rounded-xl shadow-lg flex items-center justify-center gap-2 transition-all ${newTaskData.text ? 'bg-emerald-500 hover:bg-emerald-600 text-white active:scale-95' : 'bg-slate-200 text-slate-400 cursor-not-allowed'}`}
                        >
                            <CheckIcon className="w-5 h-5" />
                            确认创建
                        </button>
                    </div>
                </div>
            </div>
        </div>
      )}

      {/* 基准线编辑弹窗 */}
      {editingBaselineId && tempBaseline && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100] flex items-center justify-center">
          <div className="bg-white rounded-xl shadow-2xl w-[400px] overflow-hidden border border-slate-200 animate-in fade-in slide-in-from-bottom-4 duration-200">
            <div className="px-6 py-4 bg-slate-50 border-b border-slate-100 flex justify-between items-center">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <TagIcon className="w-5 h-5 text-indigo-500" />
                编辑计划基准
              </h3>
              <button onClick={() => setEditingBaselineId(null)} className="p-1 hover:bg-slate-200 rounded-full transition-colors">
                <XMarkIcon className="w-5 h-5 text-slate-500" />
              </button>
            </div>
            <div className="p-8 space-y-6">
              <div className="space-y-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">计划开始日期</label>
                  <input 
                    type="date" 
                    value={tempBaseline.start} 
                    onChange={(e) => setTempBaseline({...tempBaseline, start: e.target.value})}
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-slate-700"
                  />
                </div>
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider">计划结束日期</label>
                  <input 
                    type="date" 
                    value={tempBaseline.end} 
                    onChange={(e) => setTempBaseline({...tempBaseline, end: e.target.value})}
                    className="w-full px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-slate-700"
                  />
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button 
                  onClick={() => setEditingBaselineId(null)}
                  className="flex-1 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-lg transition-colors"
                >
                  取消
                </button>
                <button 
                  onClick={saveBaselineEdit}
                  className="flex-1 px-4 py-2.5 bg-indigo-500 hover:bg-indigo-600 text-white font-bold rounded-lg shadow-lg flex items-center justify-center gap-2 transition-colors"
                >
                  <CheckIcon className="w-4 h-4" />
                  保存计划
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <footer className="h-10 bg-slate-50 border-t border-slate-200 flex items-center justify-between px-6 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
        <div className="flex items-center space-x-8">
          <div className="flex items-center gap-2"><div className="w-3 h-3 bg-indigo-400 rounded-sm shadow-sm" /><span>概要项目</span></div>
          <div className="flex items-center gap-2"><div className="w-3 h-3 bg-emerald-400 rounded-sm shadow-sm" /><span>执行任务</span></div>
          <div className="flex items-center gap-2"><div className="w-4 h-1.5 bg-slate-200 border border-dashed border-slate-300 rounded-full" /><span>计划基准</span></div>
        </div>
        
        <div className="flex items-center space-x-4">
          <div className="flex items-center gap-2 text-indigo-500">
            <ArrowPathIcon className="w-4 h-4 animate-spin-slow" />
            <span>智能延伸已开启</span>
          </div>
          <div className="w-px h-4 bg-slate-200" />
          <div className="flex items-center gap-2 text-slate-500">
            <ClockIcon className="w-4 h-4" />
            <span>当前粒度: {viewMode === 'day' ? '日' : viewMode === 'week' ? '周' : '月'}</span>
          </div>
          <div className="w-px h-4 bg-slate-200" />
          <span className="text-slate-400">操作提示：双击任务条或基准线即可弹出详情编辑对话框</span>
        </div>
      </footer>
    </div>
  );
};

export default App;
