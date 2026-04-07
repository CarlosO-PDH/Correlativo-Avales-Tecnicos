

import { Component } from '@angular/core';
import { RouterOutlet, RouterLink, RouterLinkActive } from '@angular/router';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatListModule } from '@angular/material/list';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatBadgeModule } from '@angular/material/badge';


@Component({




  selector: 'app-root',
  standalone: true,
  imports: [
    RouterOutlet, 
    RouterLink, 
    RouterLinkActive, 
    MatToolbarModule, 
    MatSidenavModule, 
    MatListModule, 
    MatButtonModule, 
    MatIconModule,
    MatBadgeModule
  ],
  templateUrl: './app.html',
  styleUrls: ['./app.css']
})



export class App implements Component {}
