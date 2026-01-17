
import { GanttConfig, Task } from './types';

export const GANTT_CONFIG: GanttConfig = {
  cellWidth: 50,
  rowHeight: 60,
  headerHeight: 80,
  gridWidth: 650, // 增加宽度以容纳更多列
};

export const INITIAL_TASKS: Task[] = [
  {
    id: "1",
    text: "新版移动端开发项目",
    start_date: new Date(2024, 3, 1),
    end_date: new Date(2024, 3, 30),
    planned_start: new Date(2024, 3, 1),
    planned_end: new Date(2024, 3, 28),
    duration: 30,
    progress: 0.35,
    type: "project",
    open: true
  },
  {
    id: "2",
    text: "需求分析与规格书定义",
    start_date: new Date(2024, 3, 2),
    end_date: new Date(2024, 3, 8),
    planned_start: new Date(2024, 3, 1),
    planned_end: new Date(2024, 3, 7),
    duration: 7,
    progress: 1.0,
    parent: "1",
    type: "task"
  },
  {
    id: "3",
    text: "UI/UX 交互设计",
    start_date: new Date(2024, 3, 9),
    end_date: new Date(2024, 3, 18),
    planned_start: new Date(2024, 3, 8),
    planned_end: new Date(2024, 3, 16),
    duration: 10,
    progress: 0.6,
    parent: "1",
    type: "project",
    open: true
  },
  {
    id: "3.1",
    text: "低保真原型制作",
    start_date: new Date(2024, 3, 9),
    end_date: new Date(2024, 3, 12),
    planned_start: new Date(2024, 3, 9),
    planned_end: new Date(2024, 3, 11),
    duration: 4,
    progress: 1.0,
    parent: "3",
    type: "task"
  },
  {
    id: "3.2",
    text: "视觉稿输出",
    start_date: new Date(2024, 3, 13),
    end_date: new Date(2024, 3, 18),
    planned_start: new Date(2024, 3, 12),
    planned_end: new Date(2024, 3, 16),
    duration: 6,
    progress: 0.2,
    parent: "3",
    type: "task"
  },
  {
    id: "4",
    text: "前端功能开发",
    start_date: new Date(2024, 3, 19),
    end_date: new Date(2024, 3, 28),
    planned_start: new Date(2024, 3, 18),
    planned_end: new Date(2024, 3, 26),
    duration: 10,
    progress: 0.1,
    parent: "1",
    type: "task"
  },
  {
    id: "5",
    text: "Beta测试启动",
    start_date: new Date(2024, 3, 29),
    end_date: new Date(2024, 3, 29),
    planned_start: new Date(2024, 3, 28),
    planned_end: new Date(2024, 3, 28),
    duration: 0,
    progress: 0,
    parent: "1",
    type: "milestone"
  },
];
