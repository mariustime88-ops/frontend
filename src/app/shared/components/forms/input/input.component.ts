import { Component } from '@angular/core';
import { InputGroup } from 'primeng/inputgroup';
import { InputGroupAddon } from 'primeng/inputgroupaddon';

@Component({
  selector: 'app-input',
  imports: [InputGroup, InputGroupAddon],
  templateUrl: './input.component.html',
  styleUrl: './input.component.scss'
})
export class InputComponent {

}
