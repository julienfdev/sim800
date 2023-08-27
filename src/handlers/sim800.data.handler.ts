import { SubjectLike } from 'rxjs';

export const sim800DataHandler = (data: string, stream$: SubjectLike<string>) => {
  stream$.next(data);
};
