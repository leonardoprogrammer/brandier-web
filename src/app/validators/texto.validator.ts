import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

export const semSoEspacos: ValidatorFn = (controle: AbstractControl): ValidationErrors | null => {
  const valor: unknown = controle.value;
  return typeof valor === 'string' && valor.length > 0 && valor.trim().length === 0 ? { semSoEspacos: true } : null;
};
