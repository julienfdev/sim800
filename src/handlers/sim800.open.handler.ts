import { AsyncSubject } from 'rxjs';

export const sim800OpenHandler = (subject: AsyncSubject<boolean>) => {
  subject.next(true);
  subject.complete();
};
