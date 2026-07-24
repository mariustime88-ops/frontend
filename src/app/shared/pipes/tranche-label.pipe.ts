import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'trancheLabel',
  standalone: true
})
export class TrancheLabelPipe implements PipeTransform {
  transform(trancheId: number | null, tranches: any[]): string {
    if (!trancheId || !tranches || !tranches.length) {
      return '';
    }
    
    const tranche = tranches.find(t => t.id === trancheId);
    return tranche ? tranche.libelle : '';
  }
}