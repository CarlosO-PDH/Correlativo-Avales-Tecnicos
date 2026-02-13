import { Component } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';

// Decorador del componente: define selector, imports, template y estilos
@Component({
  selector: 'app-root',                           // Nombre del elemento HTML
  imports: [RouterOutlet, RouterLink, RouterLinkActive, MatToolbarModule, MatButtonModule],
  templateUrl: './app.html',                      // Archivo HTML del componente
  styleUrl: './app.css'                           // Archivo CSS del componente
})
export class App {
  // Shell component: navigation + router outlet.
}
