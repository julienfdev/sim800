export interface Sim800EventHandlers {
  open: () => void;
  error: (err: Error) => void;
  data: (data: string) => void;
}
