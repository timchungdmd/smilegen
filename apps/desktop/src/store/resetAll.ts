export type ResetAllFn = () => void;

let _resetAllFn: ResetAllFn | null = null;

export function registerResetAllFn(fn: ResetAllFn): void {
  _resetAllFn = fn;
}

export function resetAllStores(): void {
  if (_resetAllFn) {
    _resetAllFn();
  }
}
