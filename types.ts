
export interface Task {
  id: string;
  text: string;
  start_date: Date;
  end_date: Date;
  duration: number;
  progress: number; // 0 to 1
  parent?: string;
  open?: boolean; // 用于控制层级展开收起
  type?: 'task' | 'project' | 'milestone';
  // 基准线数据
  planned_start?: Date;
  planned_end?: Date;
}

export interface GanttConfig {
  cellWidth: number;
  rowHeight: number;
  headerHeight: number;
  gridWidth: number;
}
