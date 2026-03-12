import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { MatTabsModule } from '@angular/material/tabs';

@Component({
  selector: 'app-avales-tecnicos',
  imports: [CommonModule, RouterLink, RouterLinkActive, RouterOutlet, MatTabsModule],
  templateUrl: './avales-tecnicos.component.html',
  styleUrl: './avales-tecnicos.component.css'
})
export class AvalesTecnicosComponent {}
