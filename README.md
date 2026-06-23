# signal-jsonforms

Librería de Angular para generar **formularios dinámicos desde JSON** sobre **Signal Forms** (`@angular/forms/signals`, Angular v21+). Agnóstica del kit de componentes, integrable mediante un registro de tipos de campo. Inspiración: Formly / jsonforms.io, pero con señales.

> **Estado: Fases 1 y 1.5 completas.** Implementado y verificado: **campos básicos** (text, number, select, checkbox), **validadores estándar** (required, email, min, max, minLength, maxLength, pattern), **grupos anidados** y **arrays repetibles** (añadir/quitar items), **lógica dinámica híbrida** — visibilidad/`disabled`/`readonly` condicional y **cross-field** vía DSL de expresiones (jsep) o funciones registradas, **validación de la definición** con un meta-schema zod (errores tempranos y legibles), y **validación async** (`validateAsync` con `resource` + `debounce`, siempre por registro). Todo renderizado con Angular Material por un renderer recursivo que respeta `hidden`.
>
> **Fase 2 en progreso:** sistema de **wrappers** (`WrapperRegistry` + `config.wrapper`/`defaultWrapper`) con un wrapper por defecto que añade descripción, hint e indicador **"Comprobando…"** (estado pending del async). Pendiente de Fase 2: más adaptadores (PrimeNG/HTML plano) y layout. Ver roadmap en [`DESIGN.md`](./DESIGN.md).

## Estructura del monorepo

```
projects/
├─ signal-jsonforms/            núcleo (UI-agnóstico)
│  └─ src/lib/
│     ├─ core/        model (tipos JSON + IR), normalizer, model-builder, schema-compiler
│     ├─ adapter/     ÚNICO punto que importa @angular/forms/signals
│     ├─ expression/  DSL de expresiones (parser seguro)
│     ├─ registry/    tipos, tokens DI, provideJsonForms()
│     └─ render/      FormHost (<jf-form>), FieldRenderer, contrato FieldComponent
├─ signal-jsonforms-material/   adaptador de referencia (Angular Material)
│  └─ src/lib/fields/  text · number · select · checkbox  + MATERIAL_FIELD_TYPES
└─ demo/                        playground interactivo (editor JSON en vivo + galería de ejemplos)
```

Decisión arquitectónica clave: **solo `adapter/signal-forms.adapter.ts` importa `@angular/forms/signals`** (API `@experimental`). El resto del código trabaja contra interfaces propias, de modo que un cambio rompedor de la API toca un único archivo.

## Puesta en marcha

La demo consume las librerías desde `dist/`, así que hay que **construirlas antes**
en orden de dependencias (el adaptador depende del núcleo). Hay scripts npm para ello:

```bash
npm install
npm run build-core           # 1) núcleo      -> dist/signal-jsonforms
npm run build-mat-adapter    # 2) adaptador   -> dist/signal-jsonforms-material
npm start                    # 3) sirve el playground (projects/demo)
```

### Playground

La demo es un **playground interactivo**: a la izquierda editas la definición JSON
(con validación en vivo) y a la derecha ves el formulario de Angular Material que
genera, junto a su modelo en tiempo real. Una galería superior carga **5 ejemplos de
complejidad creciente** que recorren el alcance de la librería:

| Nivel | Ejemplo             | Demuestra                                                        |
| ----- | ------------------- | --------------------------------------------------------------- |
| 1     | Contacto            | campos básicos + validadores (required, email, minLength)       |
| 2     | Crear cuenta        | validadores estándar: pattern, min/max, minLength/maxLength     |
| 3     | Lógica dinámica     | visibilidad/disabled condicional + cross-field vía DSL (`expr`) |
| 4     | Pedido              | grupos anidados + arrays repetibles + valores por defecto       |
| 5     | Registro completo   | validación async + funciones/validadores registrados (`fn`)     |

El JSON inválido (sintaxis, meta-schema o referencias a funciones no registradas) se
muestra como error sin derribar el formulario activo: solo se monta una definición que
se ha verificado que construye.

Durante el desarrollo de una librería, conviene dejarla en watch en otra terminal
(`ng build signal-jsonforms --watch`) para que la demo recoja los cambios sin
reconstruir a mano.

> Nota: los `paths` del tsconfig raíz apuntan a `dist/` (no al fuente). Esto es lo
> que evita el error `referencedFiles` de ng-packagr al compilar una librería que
> arrastraría el source de otra, y la fricción de `@angular/build` con el
> path-mapping a fuentes que tienen su propio `package.json`.

## API pública (núcleo)

```ts
// DI: registrar tipos de campo y validadores/funciones
provideJsonForms({ fieldTypes, validators, asyncValidators, functions, wrappers, messages });

// Uso declarativo
// <jf-form [schema]="jsonConfig" [(model)]="data" #f="jfForm"></jf-form>

// Uso programático (bajo nivel)
const { form, model } = buildSignalForm(jsonConfig, { injector, registries });
```

## Lógica dinámica (DSL + registro)

Visibilidad/`disabled`/`readonly` condicional y validación cross-field se expresan
de forma híbrida:

```jsonc
// DSL de expresiones (jsep): autónomo en el JSON
{ "hidden": { "expr": "model.plan !== 'pro'" } }
{ "kind": "expr", "expr": "value === model.email", "message": "No coincide" }

// Función registrada (lógica compleja): referenciada por clave
{ "hidden": { "fn": "hideForNonPro" } }
{ "kind": "fn", "fn": "passwordStrength", "message": "Contraseña débil" }
```

```ts
provideJsonForms({
  fieldTypes: MATERIAL_FIELD_TYPES,
  functions: { hideForNonPro: (ctx) => ctx.valueAt('plan') !== 'pro' },
  validators: { passwordStrength: (ctx) => (ok(ctx.value()) ? undefined : { kind: 'weak' }) },
});
```

En el DSL, `value` es el campo actual y `model` el modelo (lectura reactiva vía
proxy sobre `valueOf`). El evaluador es acotado: sin `eval`/`Function` ni llamadas
a funciones. La validación **async** seguirá yendo siempre por registro (Fase 1.5).

## Roadmap

Ver [`DESIGN.md`](./DESIGN.md) §11. Resumen: **Fase 1** = campos básicos + validadores estándar + cross-field + anidamiento/arrays + visibilidad condicional + validación de la definición (Zod/Standard Schema). **Fase 1.5** = validación async. **Fase 2** = más adaptadores.
