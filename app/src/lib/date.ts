import { DAY } from './fsrs';
export const NOW = () => Date.now();
/** 本地日期 YYYY-MM-DD */
export const today = () => new Date().toLocaleDateString('sv');
export const yesterday = () => new Date(NOW() - DAY).toLocaleDateString('sv');
