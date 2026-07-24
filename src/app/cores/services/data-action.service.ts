import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

export type DataActionType = 'validate' | 'reject' | 'transmit' | 'enter' | 'any';

@Injectable({ providedIn: 'root' })
export class DataActionService {
  private actionSubject = new Subject<DataActionType>();
  readonly action$ = this.actionSubject.asObservable();

  emit(type: DataActionType = 'any') {
    this.actionSubject.next(type);
  }
}
