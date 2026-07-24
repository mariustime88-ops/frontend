import { NgModule } from '@angular/core';
import { ValidateDirective } from './validate.directive';
import { FormSubmitDirective } from './form-submit.directive';

@NgModule({
  imports: [ValidateDirective, FormSubmitDirective],
  exports: [ValidateDirective, FormSubmitDirective],
})
export class FormsDirective {}
