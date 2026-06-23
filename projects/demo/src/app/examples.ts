import { FormConfig } from 'signal-jsonforms';

/**
 * Galería de ejemplos del playground. Cada uno sube un escalón de complejidad
 * para enseñar, de forma incremental, hasta dónde llega la librería:
 *   1) campos y validadores básicos
 *   2) batería completa de validadores estándar
 *   3) lógica dinámica: visibilidad condicional + validación cross-field (DSL)
 *   4) estructura: grupos anidados + arrays repetibles con valores por defecto
 *   5) avanzado: validación async + funciones/validadores registrados (kind 'fn')
 *
 * Los niveles 1–4 son 100% autónomos en JSON (no dependen del registro). El nivel
 * 5 referencia helpers declarados en `app.config.ts` (uniqueUsername, hideForNonPro,
 * passwordStrength) para mostrar el modelo híbrido JSON + registro.
 */
export interface PlaygroundExample {
  id: string;
  level: number;
  title: string;
  description: string;
  config: FormConfig;
}

export const EXAMPLES: PlaygroundExample[] = [
  // ─────────────────────────────────────────────────────────────────────────
  // Nivel 1 · Básico
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: 'contacto',
    level: 1,
    title: 'Contacto',
    description:
      'Lo mínimo imprescindible: campos de texto, un desplegable con valor por defecto y validadores básicos (required, email, minLength).',
    config: {
      version: '1',
      id: 'contacto',
      fields: [
        {
          key: 'name',
          type: 'text',
          dataType: 'string',
          label: 'Nombre',
          validators: [{ kind: 'required' }],
        },
        {
          key: 'email',
          type: 'text',
          dataType: 'string',
          label: 'Correo electrónico',
          props: { placeholder: 'tu@correo.com' },
          validators: [
            { kind: 'required' },
            { kind: 'email', message: 'Correo no válido' },
          ],
        },
        {
          key: 'subject',
          type: 'select',
          dataType: 'string',
          label: 'Asunto',
          defaultValue: 'support',
          props: {
            options: [
              { value: 'support', label: 'Soporte' },
              { value: 'sales', label: 'Ventas' },
              { value: 'other', label: 'Otro' },
            ],
          },
        },
        {
          key: 'message',
          type: 'text',
          dataType: 'string',
          label: 'Mensaje',
          props: { hint: 'Cuéntanos en qué podemos ayudarte' },
          validators: [
            { kind: 'required' },
            { kind: 'minLength', value: 10, message: 'Mínimo 10 caracteres' },
          ],
        },
      ],
    },
  },

  // ─────────────────────────────────────────────────────────────────────────
  // Nivel 2 · Validadores estándar
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: 'cuenta',
    level: 2,
    title: 'Crear cuenta',
    description:
      'Toda la batería de validadores estándar serializables: minLength/maxLength, pattern (regex), min/max sobre números y required sobre un checkbox.',
    config: {
      version: '1',
      id: 'cuenta',
      fields: [
        {
          key: 'username',
          type: 'text',
          dataType: 'string',
          label: 'Nombre de usuario',
          props: { hint: 'Letras, números y guion bajo' },
          validators: [
            { kind: 'required' },
            { kind: 'minLength', value: 3, message: 'Mínimo 3 caracteres' },
            { kind: 'maxLength', value: 20, message: 'Máximo 20 caracteres' },
            {
              kind: 'pattern',
              value: '^[a-zA-Z0-9_]+$',
              message: 'Solo letras, números y guion bajo',
            },
          ],
        },
        {
          key: 'email',
          type: 'text',
          dataType: 'string',
          label: 'Correo electrónico',
          validators: [{ kind: 'required' }, { kind: 'email' }],
        },
        {
          key: 'password',
          type: 'text',
          dataType: 'string',
          label: 'Contraseña',
          props: { hint: 'Al menos 8 caracteres' },
          validators: [
            { kind: 'required' },
            { kind: 'minLength', value: 8, message: 'Mínimo 8 caracteres' },
          ],
        },
        {
          key: 'age',
          type: 'number',
          dataType: 'number',
          label: 'Edad',
          props: { description: 'Necesitas ser mayor de edad.' },
          validators: [
            { kind: 'required' },
            { kind: 'min', value: 18, message: 'Debes ser mayor de edad' },
            { kind: 'max', value: 120, message: 'Edad no válida' },
          ],
        },
        {
          key: 'country',
          type: 'select',
          dataType: 'string',
          label: 'País',
          validators: [{ kind: 'required' }],
          props: {
            options: [
              { value: 'es', label: 'España' },
              { value: 'mx', label: 'México' },
              { value: 'ar', label: 'Argentina' },
              { value: 'co', label: 'Colombia' },
            ],
          },
        },
        {
          key: 'terms',
          type: 'checkbox',
          dataType: 'boolean',
          label: 'Acepto los términos y condiciones',
          validators: [{ kind: 'required', message: 'Debes aceptar los términos' }],
        },
      ],
    },
  },

  // ─────────────────────────────────────────────────────────────────────────
  // Nivel 3 · Lógica dinámica (DSL de expresiones)
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: 'dinamico',
    level: 3,
    title: 'Lógica dinámica',
    description:
      'Visibilidad condicional y validación cross-field expresadas en el propio JSON con el DSL de expresiones. Cambia el "tipo de cuenta" o marca la suscripción y observa cómo aparecen y se exigen campos nuevos.',
    config: {
      version: '1',
      id: 'dinamico',
      fields: [
        {
          key: 'accountType',
          type: 'select',
          dataType: 'string',
          label: 'Tipo de cuenta',
          defaultValue: 'personal',
          props: {
            options: [
              { value: 'personal', label: 'Personal' },
              { value: 'business', label: 'Empresa' },
            ],
          },
          validators: [{ kind: 'required' }],
        },
        {
          // hidden vía DSL: solo visible para cuentas de empresa.
          key: 'company',
          type: 'text',
          dataType: 'string',
          label: 'Razón social',
          hidden: { expr: "model.accountType !== 'business'" },
          // required "condicional" vía expr: solo exige valor cuando es empresa.
          validators: [
            {
              kind: 'expr',
              expr: "model.accountType !== 'business' || !!value",
              message: 'Indica la razón social',
            },
          ],
        },
        {
          key: 'vatId',
          type: 'text',
          dataType: 'string',
          label: 'CIF / NIF',
          hidden: { expr: "model.accountType !== 'business'" },
        },
        {
          key: 'email',
          type: 'text',
          dataType: 'string',
          label: 'Correo electrónico',
          validators: [{ kind: 'required' }, { kind: 'email' }],
        },
        {
          // cross-field vía DSL: debe coincidir con el correo de arriba.
          key: 'emailConfirm',
          type: 'text',
          dataType: 'string',
          label: 'Repite el correo',
          validators: [
            { kind: 'required' },
            {
              kind: 'expr',
              expr: 'value === model.email',
              message: 'Los correos no coinciden',
            },
          ],
        },
        {
          key: 'subscribe',
          type: 'checkbox',
          dataType: 'boolean',
          label: 'Quiero recibir la newsletter',
        },
        {
          // disabled vía DSL: el campo se habilita al marcar la suscripción.
          key: 'frequency',
          type: 'select',
          dataType: 'string',
          label: 'Frecuencia de envío',
          disabled: { expr: '!model.subscribe' },
          defaultValue: 'weekly',
          props: {
            hint: 'Marca la suscripción para elegir la frecuencia',
            options: [
              { value: 'daily', label: 'Diaria' },
              { value: 'weekly', label: 'Semanal' },
              { value: 'monthly', label: 'Mensual' },
            ],
          },
        },
      ],
    },
  },

  // ─────────────────────────────────────────────────────────────────────────
  // Nivel 4 · Estructura (grupos + arrays)
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: 'pedido',
    level: 4,
    title: 'Pedido',
    description:
      'Composición de datos: grupos anidados (cliente, dirección de envío) y un array repetible de líneas de pedido con valores por defecto. Usa "Añadir" / "Quitar" para gestionar las líneas.',
    config: {
      version: '1',
      id: 'pedido',
      fields: [
        {
          key: 'customer',
          type: 'group',
          label: 'Cliente',
          fields: [
            {
              key: 'name',
              type: 'text',
              dataType: 'string',
              label: 'Nombre completo',
              validators: [{ kind: 'required' }],
            },
            {
              key: 'email',
              type: 'text',
              dataType: 'string',
              label: 'Correo',
              validators: [{ kind: 'required' }, { kind: 'email' }],
            },
          ],
        },
        {
          key: 'shipping',
          type: 'group',
          label: 'Dirección de envío',
          fields: [
            {
              key: 'street',
              type: 'text',
              dataType: 'string',
              label: 'Calle y número',
              validators: [{ kind: 'required' }],
            },
            {
              key: 'city',
              type: 'text',
              dataType: 'string',
              label: 'Ciudad',
              validators: [{ kind: 'required' }],
            },
            {
              key: 'zip',
              type: 'text',
              dataType: 'string',
              label: 'Código postal',
              validators: [
                { kind: 'required' },
                { kind: 'pattern', value: '^[0-9]{4,5}$', message: 'Código postal no válido' },
              ],
            },
          ],
        },
        {
          key: 'items',
          type: 'array',
          label: 'Líneas del pedido',
          item: {
            key: 'line',
            type: 'group',
            fields: [
              {
                key: 'product',
                type: 'select',
                dataType: 'string',
                label: 'Producto',
                validators: [{ kind: 'required' }],
                props: {
                  options: [
                    { value: 'book', label: 'Libro' },
                    { value: 'pen', label: 'Bolígrafo' },
                    { value: 'mug', label: 'Taza' },
                  ],
                },
              },
              {
                key: 'qty',
                type: 'number',
                dataType: 'number',
                label: 'Cantidad',
                defaultValue: 1,
                validators: [
                  { kind: 'required' },
                  { kind: 'min', value: 1, message: 'Mínimo 1 unidad' },
                ],
              },
              {
                key: 'notes',
                type: 'text',
                dataType: 'string',
                label: 'Notas',
              },
            ],
          },
        },
        {
          key: 'giftWrap',
          type: 'checkbox',
          dataType: 'boolean',
          label: 'Envolver para regalo',
        },
      ],
    },
  },

  // ─────────────────────────────────────────────────────────────────────────
  // Nivel 5 · Avanzado (async + registro)
  // ─────────────────────────────────────────────────────────────────────────
  {
    id: 'registro',
    level: 5,
    title: 'Registro completo',
    description:
      'El escaparate completo combinando todo: validación async por registro (el usuario "admin", "root" o "test" está ocupado — se comprueba al salir del campo), un validador síncrono registrado (fuerza de la contraseña, kind "fn"), visibilidad por función registrada, cross-field, grupos y arrays. Los helpers viven en app.config.ts.',
    config: {
      version: '1',
      id: 'registro-usuario',
      fields: [
        {
          key: 'username',
          type: 'text',
          dataType: 'string',
          label: 'Usuario',
          props: {
            placeholder: 'prueba con "admin"',
            hint: 'Se comprueba contra el servidor al salir del campo',
          },
          validators: [{ kind: 'required' }],
          asyncValidators: [{ kind: 'uniqueUsername', debounce: 400 }],
        },
        {
          key: 'password',
          type: 'text',
          dataType: 'string',
          label: 'Contraseña',
          props: { hint: 'Mínimo 8 caracteres, combinando letras y números' },
          validators: [{ kind: 'required' }, { kind: 'fn', fn: 'passwordStrength' }],
        },
        {
          key: 'email',
          type: 'text',
          dataType: 'string',
          label: 'Correo',
          props: { placeholder: 'tu@correo.com' },
          validators: [
            { kind: 'required', message: 'El correo es obligatorio' },
            { kind: 'email', message: 'Correo no válido' },
          ],
        },
        {
          key: 'emailConfirm',
          type: 'text',
          dataType: 'string',
          label: 'Repite el correo',
          validators: [
            { kind: 'required' },
            { kind: 'expr', expr: 'value === model.email', message: 'Los correos no coinciden' },
          ],
        },
        {
          key: 'age',
          type: 'number',
          dataType: 'number',
          label: 'Edad',
          props: { description: 'Debes ser mayor de edad para registrarte.' },
          validators: [
            { kind: 'required' },
            { kind: 'min', value: 18, message: 'Debes ser mayor de edad' },
          ],
        },
        {
          key: 'plan',
          type: 'select',
          dataType: 'string',
          label: 'Plan',
          validators: [{ kind: 'required' }],
          props: {
            options: [
              { value: 'free', label: 'Gratis' },
              { value: 'pro', label: 'Pro' },
            ],
          },
        },
        {
          // visibilidad por función registrada: visible solo si plan = 'pro'.
          key: 'company',
          type: 'text',
          dataType: 'string',
          label: 'Empresa (solo Pro)',
          hidden: { fn: 'hideForNonPro' },
        },
        {
          key: 'address',
          type: 'group',
          label: 'Dirección',
          fields: [
            {
              key: 'street',
              type: 'text',
              dataType: 'string',
              label: 'Calle',
              validators: [{ kind: 'required' }],
            },
            { key: 'city', type: 'text', dataType: 'string', label: 'Ciudad' },
          ],
        },
        {
          key: 'contacts',
          type: 'array',
          label: 'Contactos',
          item: {
            key: 'contact',
            type: 'group',
            fields: [
              {
                key: 'name',
                type: 'text',
                dataType: 'string',
                label: 'Nombre',
                validators: [{ kind: 'required' }],
              },
              {
                key: 'relation',
                type: 'select',
                dataType: 'string',
                label: 'Relación',
                props: {
                  options: [
                    { value: 'family', label: 'Familia' },
                    { value: 'work', label: 'Trabajo' },
                  ],
                },
              },
            ],
          },
        },
        {
          key: 'newsletter',
          type: 'checkbox',
          dataType: 'boolean',
          label: 'Quiero recibir novedades',
        },
      ],
    },
  },
];
