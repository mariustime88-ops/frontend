import { NgModule } from '@angular/core';
import { Button, ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { WindowMaximizeIcon } from 'primeng/icons';
import { InputGroup } from 'primeng/inputgroup';
import { InputGroupAddon } from 'primeng/inputgroupaddon';
import { FormsDirective } from '@app/cores/directives/import-validation';
import { AdminLayoutComponent } from '@app/layouts/admin-layout/admin-layout.component';
import { FormsModule } from '@angular/forms';

import { Toast, ToastModule } from 'primeng/toast';
import { DataTableComponent } from '@app/shared/components/forms/data-table/data-table.component';
import { MessageService } from 'primeng/api';
import { AsyncPipe, DatePipe, NgClass, NgFor, NgIf } from '@angular/common';
import { ModalComponent } from '@app/shared/components/modal/modal.component';
import { CustomPaginationComponent } from '@app/shared/components/pagination/custom-pagination/custom-pagination.component';
import { DropdownModule } from 'primeng/dropdown';
import { Textarea } from 'primeng/textarea';
import { CalendarModule } from 'primeng/calendar';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputTextModule } from 'primeng/inputtext';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { ToggleSwitch } from 'primeng/toggleswitch';
import { MultiSelectModule } from 'primeng/multiselect';
import { OptionsSourceDirective } from '../directives/select-options';
import { ConvertToDatePipe } from '../pipes/covert-to-date.pipe';
import { CardModule } from 'primeng/card';
import { Tag } from 'primeng/tag';
import { TabMenu } from 'primeng/tabmenu';
import { Badge } from 'primeng/badge';
import { RouterLink } from '@angular/router';
import { StepperModule } from 'primeng/stepper';
import { FileUpload, FileUploadModule } from 'primeng/fileupload';
import { TableModule } from 'primeng/table';
import { HasPermissionPipe } from './has-permission.pipe';
import { ToggleButtonModule } from 'primeng/togglebutton';
import { CheckboxModule } from 'primeng/checkbox';
import { InputSwitch } from 'primeng/inputswitch';
import { InputTextarea } from 'primeng/inputtextarea';

@NgModule({
  imports: [
    AdminLayoutComponent,
    DataTableComponent,
    DialogModule,
    FormsModule,
    InputGroup,
    InputGroupAddon,
    Button,
    FormsDirective,
    Toast,
    NgIf,
    ModalComponent,
    CustomPaginationComponent,
    DropdownModule,
    Textarea,
    CalendarModule,
    InputNumberModule,
    InputTextModule,
    ButtonModule,
    ProgressSpinnerModule,
    ToastModule,
    AsyncPipe,
    NgClass,
    ToggleSwitch,
    MultiSelectModule,
    OptionsSourceDirective,
    ConvertToDatePipe,
    CardModule,
    Tag,
    DatePipe,
    RouterLink,
    StepperModule,
    FileUploadModule,
    NgFor,
    TableModule,
    HasPermissionPipe,
    RouterLink,
    ToggleButtonModule,
    CheckboxModule,
    InputSwitch,
    InputTextarea
  ],
  exports: [
    AdminLayoutComponent,
    DataTableComponent,
    DialogModule,
    FormsModule,
    InputGroup,
    InputGroupAddon,
    Button,
    FormsDirective,
    Toast,
    NgIf,
    ModalComponent,
    CustomPaginationComponent,
    DropdownModule,
    Textarea,
    CalendarModule,
    InputNumberModule,
    InputTextModule,
    ButtonModule,
    ProgressSpinnerModule,
    ToastModule,
    AsyncPipe,
    NgClass,
    ToggleSwitch,
    MultiSelectModule,
    OptionsSourceDirective,
    ConvertToDatePipe,
    CardModule,
    Tag,
    DatePipe,
    StepperModule,
    FileUploadModule,
    NgFor,
    TableModule,
    HasPermissionPipe,
    RouterLink,
    ToggleButtonModule,
    CheckboxModule,
    InputSwitch,
    InputTextarea

  ],
  providers: [MessageService],
})
export class CrudImports {}
