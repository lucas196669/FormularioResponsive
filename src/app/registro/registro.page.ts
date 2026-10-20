import { Component, signal } from '@angular/core';
import {
  AbstractControl, FormBuilder, FormGroup,
  ReactiveFormsModule, ValidationErrors, Validators
} from '@angular/forms';
import {
  AlertController, IonHeader, IonToolbar, IonTitle, IonContent,
  IonButtons, IonList, IonItem, IonInput, IonButton, IonSpinner
} from '@ionic/angular';
import { jsPDF } from 'jspdf';

// Tarea 1: no permite fechas anteriores a hoy
function fechaNoAnterior(control: AbstractControl): ValidationErrors | null {
  if (!control.value) return null;
  const [y, m, d] = String(control.value).split('-').map(Number);
  const elegida = new Date(y, m - 1, d);
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  return elegida < hoy ? { fechaPasada: true } : null;
}

@Component({
  selector: 'app-registro',
  templateUrl: 'registro.page.html',
  styleUrls: ['registro.page.scss'],
  standalone: true,
  imports: [
    ReactiveFormsModule, IonHeader, IonToolbar, IonTitle, IonContent,
    IonButtons, IonList, IonItem, IonInput, IonButton, IonSpinner
  ],
})
export class RegistroPage {
  public registroForm: FormGroup;
  public isSubmitting = signal<boolean>(false);
  public modoOscuro = signal<boolean>(false);
  // Guarda los últimos datos enviados (para el PDF), sin la contraseña
  public datosEnviados = signal<{ nombre: string; email: string; fecha: string; enviadoEl: string } | null>(null);
  public hoy = new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD en hora local

  constructor(private fb: FormBuilder, private alertCtrl: AlertController) {
    this.registroForm = this.fb.group({
      nombre: ['', [Validators.required, Validators.minLength(3)]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [
        Validators.required,
        Validators.pattern(/^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{8,}$/)
      ]],
      fecha: ['', [Validators.required, fechaNoAnterior]],
    });
  }

  get f() { return this.registroForm.controls; }

  // Tarea 6: modo oscuro
  public toggleModoOscuro(): void {
    const oscuro = !this.modoOscuro();
    this.modoOscuro.set(oscuro);
    document.documentElement.classList.toggle('ion-palette-dark', oscuro);
  }

  // Tarea 9: hash SHA-256 con la Web Crypto API (sin librerías)
  private async sha256(texto: string): Promise<string> {
    const datos = new TextEncoder().encode(texto);
    const buffer = await crypto.subtle.digest('SHA-256', datos);
    return Array.from(new Uint8Array(buffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }

  public async onSubmit(): Promise<void> {
    if (this.registroForm.invalid) {
      this.registroForm.markAllAsTouched();
      return;
    }
    this.isSubmitting.set(true);
    try {
      const { nombre, email, password, fecha } = this.registroForm.value;
      const passwordCifrada = await this.sha256(password);
      const payload = { nombre, email, password: passwordCifrada, fecha };
      console.log('Payload a enviar a la API REST:', payload);

      await new Promise(resolve => setTimeout(resolve, 2000));

      this.datosEnviados.set({
        nombre, email, fecha,
        enviadoEl: new Date().toLocaleString('es-ES')
      });
      this.registroForm.reset();
      await this.mostrarAlerta(); // Tarea 5
    } catch (error) {
      console.error('Error al persistir los datos', error);
    } finally {
      this.isSubmitting.set(false);
    }
  }

  // Tarea 5: aviso de envío correcto
  private async mostrarAlerta(): Promise<void> {
    const alert = await this.alertCtrl.create({
      header: 'Registro completado',
      message: 'El formulario se ha enviado correctamente.',
      buttons: ['Aceptar'],
    });
    await alert.present();
  }

  // Tarea 7: PDF con los datos recién enviados
  public descargarPdf(): void {
    const d = this.datosEnviados();
    if (!d) return;
    const doc = new jsPDF();
    doc.setFontSize(18);
    doc.text('Datos del formulario', 20, 20);
    doc.setFontSize(12);
    doc.text(`Nombre: ${d.nombre}`, 20, 40);
    doc.text(`Correo electrónico: ${d.email}`, 20, 50);
    doc.text(`Fecha: ${d.fecha}`, 20, 60);
    doc.text(`Enviado el: ${d.enviadoEl}`, 20, 70);
    doc.save('formulario-registro.pdf');
  }
}