// excel-import.service.ts
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { HttpClient } from '@angular/common/http';
import { environment } from '@app/environments/environment';
import * as XLSX from 'xlsx';

export interface ColumnMapping {
  fieldName: string;
  excelColumn: string;
  label: string;
  required: boolean;
  description?: string;
}

export interface ExcelPreviewData {
  headers: string[];
  columnRefs: string[];
  previewRows: any[][];
}

@Injectable({
  providedIn: 'root'
})
export class ExcelImportService {
  constructor(private http: HttpClient) {}

  // Analyser un fichier Excel pour en extraire les en-têtes et un aperçu
  parseExcelFile(file: File): Promise<ExcelPreviewData> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = (e: any) => {
        try {
          const data = new Uint8Array(e.target.result);
          const workbook = XLSX.read(data, { type: 'array' });

          // Récupérer la première feuille
          const firstSheet = workbook.Sheets[workbook.SheetNames[0]];

          // Récupérer la plage de données
          const range = XLSX.utils.decode_range(firstSheet['!ref'] || 'A1');

          // Générer les références des colonnes (A, B, C...)
          const columnRefs: string[] = [];
          for (let C = range.s.c; C <= range.e.c; C++) {
            columnRefs.push(XLSX.utils.encode_col(C));
          }

          // Lire les en-têtes (première ligne)
          const headers: string[] = [];
          for (let C = range.s.c; C <= range.e.c; C++) {
            const cellAddress = XLSX.utils.encode_cell({ r: range.s.r, c: C });
            const cell = firstSheet[cellAddress];
            headers.push(cell ? cell.v : '');
          }

          // Préparer les données d'aperçu (quelques lignes)
          const previewRows: any[][] = [];
          for (let R = range.s.r + 1; R <= Math.min(range.s.r + 2, range.e.r); R++) {
            const row: any[] = [];
            for (let C = range.s.c; C <= range.e.c; C++) {
              const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });
              const cell = firstSheet[cellAddress];
              row.push(cell ? cell.v : '');
            }
            previewRows.push(row);
          }

          resolve({
            headers,
            columnRefs,
            previewRows
          });
        } catch (error) {
          reject(error);
        }
      };

      reader.onerror = (error) => {
        reject(error);
      };

      reader.readAsArrayBuffer(file);
    });
  }

  // Tenter de faire un mapping automatique basé sur les noms de colonnes
  autoMapColumns(mappings: ColumnMapping[], headers: string[], columnRefs: string[]): ColumnMapping[] {
    return mappings.map(mapping => {
      // Créer une copie pour ne pas modifier l'original
      const newMapping = { ...mapping };

      // Chercher une correspondance exacte ou partielle dans les en-têtes
      const index = headers.findIndex(
        header => header && (
          header.toLowerCase() === mapping.fieldName.toLowerCase() ||
          header.toLowerCase().includes(mapping.label.toLowerCase())
        )
      );

      if (index !== -1) {
        newMapping.excelColumn = columnRefs[index];
      }

      return newMapping;
    });
  }

  // Convertir une référence de colonne Excel (A, B, C...) en index numérique (1, 2, 3...)
  private convertColumnRefToIndex(colRef: string): number {
    // Convertit une référence de colonne (A, B, C...) en index (1, 2, 3...)
    // Par exemple: A -> 1, B -> 2, Z -> 26, AA -> 27
    let result = 0;
    for (let i = 0; i < colRef.length; i++) {
      result = result * 26 + (colRef.charCodeAt(i) - 64);
    }
    return result;
  }

  // Envoyer le fichier et le mapping à l'API
  importFile(endpoint: string, file: File, mappings: ColumnMapping[], additionalData?: any): Observable<any> {
    const formData = new FormData();
    formData.append('file', file);

    // Ajouter le mapping en tant que JSON
    const mappingObject: Record<string, number> = {};
    mappings.forEach(mapping => {
      if (mapping.excelColumn) {
        // Convertir la référence de colonne (A, B, C...) en index numérique (1, 2, 3...)
        mappingObject[mapping.fieldName] = this.convertColumnRefToIndex(mapping.excelColumn);
      }
    });

    formData.append('mapping', JSON.stringify(mappingObject));

    // Ajouter des données supplémentaires si fournies
    if (additionalData) {
      Object.keys(additionalData).forEach(key => {
        if (additionalData[key] !== null && additionalData[key] !== undefined) {
          formData.append(key, additionalData[key].toString());
        }
      });
    }

    return this.http.post(`${environment.URL_API}/${endpoint}`, formData);
  }
}