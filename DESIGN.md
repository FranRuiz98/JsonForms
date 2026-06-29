# Diseño de arquitectura y alcance — Librería de formularios dinámicos JSON sobre Angular Signal Forms

> Estado: borrador de diseño (v0.1) · Angular objetivo: v21+ · API base: `@angular/forms/signals` (**`@experimental`**)
> Esta es una propuesta para iterar **antes** de escribir código. Nada aquí está cerrado.

---

## 1. Visión y objetivos

Construir una librería de Angular que genere **formularios dinámicos a partir de una configuración JSON**, usando **Signal Forms** como motor de estado y validación, al estilo de Formly o jsonforms.io pero nativa de la nueva API de señales.

Objetivos rectores:

1. **Dirigida por datos (data-driven).** La estructura, validación y comportamiento del formulario se describen en JSON; el render se deriva de ahí.
2. **Agnóstica de la capa visual.** El núcleo no depende de Material, PrimeNG ni ningún kit de componentes. La integración con esos kits se hace mediante un **registro de tipos de campo** que el consumidor rellena.
3. **Fiel a Signal Forms.** El estado, la reactividad y la validación los gestiona Signal Forms; la librería es un *intérprete* que traduce JSON → `form()` + `schema`, no reimplementa nada que la plataforma ya ofrezca.
4. **Aislada del riesgo de API experimental.** Signal Forms está marcada `@experimental` y puede romper entre versiones. Toda llamada a `@angular/forms/signals` vive detrás de una capa adaptadora (anti-corruption layer) para que un cambio rompedor toque un único módulo.

No objetivos (en este alcance inicial): editor visual de formularios, persistencia de definiciones, i18n integral (se deja como punto de extensión), soporte de Reactive Forms clásico.

---

## 2. La tensión central del proyecto

Signal Forms está diseñada para estructuras **tipadas en tiempo de compilación**:

```ts
const model = signal({ name: '', age: 0 });        // forma conocida en compile-time
const f = form(model, (path) => {                   // path está tipado a partir del modelo
  required(path.name);
  min(path.age, 18);
});
```

`form(model, schemaFn)` deriva toda la estructura del **modelo tipado**, y `schemaFn` recibe un `SchemaPathTree` cuyos paths (`path.name`, `path.age`) son propiedades estáticas y type-safe.

Nuestro proyecto invierte el flujo: la forma del modelo **no se conoce hasta runtime**, cuando llega el JSON. Esto define la decisión arquitectónica de fondo:

> **Necesitamos un intérprete en runtime que, a partir del JSON, (a) construya el objeto modelo inicial y su `signal`, y (b) genere dinámicamente la función `schema` invocando las reglas de Signal Forms sobre paths resueltos dinámicamente.**

Esto es viable porque, aunque los paths pierden el tipado estático, **el árbol de paths de Signal Forms es navegable en runtime por clave**: `path['name']` funciona igual que `path.name`. Aceptamos perder el type-safety *dentro del motor* (trabajamos con `Record<string, unknown>`) y lo reintroducimos de forma **opcional** en la frontera pública mediante genéricos, para el consumidor que sí conoce su forma.

### Consecuencias que el diseño debe respetar

- **Modelo = fuente de la verdad.** Signal Forms es model-driven: no existe `field.set()`. Cambiar un valor, añadir o quitar items de un array = actualizar el `signal` del modelo de forma inmutable. La librería expondrá helpers para mutar por path.
- **Estructura estable, visibilidad dinámica.** Reconstruir `form()` es caro y reinicia el estado. Por eso el patrón recomendado es declarar el **superconjunto** de campos en el modelo y usar `hidden()`/`disabled()` para lo condicional, en lugar de añadir/quitar campos del modelo en caliente.
- **`FieldTree` vs `FieldState`.** En plantilla y en lógica hay que distinguir el nodo estructural (`form.name`, para `[formField]`) del estado (`form.name()`, que da `.value()`, `.valid()`, `.touched()`…). El renderer y las utilidades deben respetar esa distinción.

---

## 3. Arquitectura por capas

```
┌──────────────────────────────────────────────────────────────────┐
│  Consumidor (app)                                                  │
│  - Define el JSON                                                  │
│  - Registra tipos de campo (componentes), validadores, funciones  │
└───────────────┬──────────────────────────────────────────────────┘
                │  <jf-form [schema]="json" [(model)]="data">
┌───────────────▼──────────────────────────────────────────────────┐
│  Capa de RENDER  (UI-agnóstica)                                    │
│  - FormHost / FieldRenderer (recursivo)                           │
│  - FieldTypeRegistry  →  resuelve type → componente                │
│  - WrapperRegistry    →  label, errores, layout                    │
└───────────────┬──────────────────────────────────────────────────┘
                │  consume el FieldTree + config normalizada
┌───────────────▼──────────────────────────────────────────────────┐
│  Capa de MOTOR (core, sin UI)                                      │
│  - Parser/Normalizador: JSON → IR (representación interna)         │
│  - ModelBuilder:  IR → objeto modelo inicial → signal()           │
│  - SchemaCompiler: IR → schemaFn dinámica (reglas Signal Forms)    │
│  - ExpressionEngine (DSL) + FunctionRegistry (lógica híbrida)      │
│  - ValidatorRegistry (estándar + async + cross-field)             │
└───────────────┬──────────────────────────────────────────────────┘
                │  llamadas aisladas a la API
┌───────────────▼──────────────────────────────────────────────────┐
│  Capa ADAPTADORA de Signal Forms (anti-corruption)                │
│  - Único punto que importa de @angular/forms/signals               │
│  - form(), schema(), apply(), applyEach(), applyWhen(),            │
│    validate(), validateAsync(), required/email/min/...             │
└──────────────────────────────────────────────────────────────────┘
```

La regla de oro: **solo la capa adaptadora importa `@angular/forms/signals`.** El resto del código trabaja contra nuestras propias interfaces. Si Angular renombra `validateAsync` o cambia la firma de `applyWhen`, se arregla en un sitio.

---

## 4. Formato JSON (modelo híbrido propio)

Formato propio inspirado en Formly (árbol de campos ergonómico) y en jsonforms.io (declaración explícita del tipo de dato, para poder **reconstruir el modelo**). Un campo declara su `dataType` precisamente para que el `ModelBuilder` sepa qué valor inicial poner (`''`, `0`, `false`, `[]`, `{}`) — Signal Forms prohíbe `null`/`undefined` como valores iniciales.

```jsonc
{
  "version": "1",
  "id": "registro-usuario",
  "fields": [
    {
      "key": "email",
      "type": "text",            // tipo de UI → resuelto por el FieldTypeRegistry
      "dataType": "string",      // tipo de dato → usado por el ModelBuilder
      "label": "Correo",
      "props": { "placeholder": "tu@correo.com", "autocomplete": "email" },
      "validators": [
        { "kind": "required", "message": "El correo es obligatorio" },
        { "kind": "email", "message": "Correo no válido" }
      ],
      "asyncValidators": [
        { "kind": "uniqueEmail", "debounce": 300 }   // resuelto por el ValidatorRegistry
      ]
    },
    {
      "key": "age",
      "type": "number",
      "dataType": "number",
      "label": "Edad",
      "validators": [
        { "kind": "required" },
        { "kind": "min", "value": 18, "message": "Debes ser mayor de edad" }
      ]
    },
    {
      "key": "password",
      "type": "password",
      "dataType": "string",
      "label": "Contraseña",
      "validators": [{ "kind": "minLength", "value": 8 }]
    },
    {
      "key": "confirmPassword",
      "type": "password",
      "dataType": "string",
      "label": "Repite la contraseña",
      "validators": [
        // Validación cruzada: DSL para lo simple…
        { "kind": "expr", "expr": "value === model.password",
          "message": "Las contraseñas no coinciden" }
      ]
    }
  ]
}
```

Notas de formato:

- `key` mapea a la propiedad en el modelo; los grupos anidados se expresan con `type: "group"` + `fields` (fase 2), y los arrays con `type: "array"` + `item` (fase 2).
- `type` (UI) y `dataType` (datos) están deliberadamente **separados**: un mismo `dataType: "string"` puede pintarse como `text`, `textarea`, `select` o `radio`.
- `validators[]` lista declarativa; cada entrada tiene un `kind` que el `SchemaCompiler` mapea a una regla de Signal Forms (estándar) o a una entrada del `ValidatorRegistry` (custom/cross-field/async).
- La lógica condicional (visibilidad, disabled, required dinámico) se expresa con el modelo híbrido de la sección 6.

---

## 5. El motor: de JSON a `form()`

Cuatro pasos, todos en la capa de motor.

**5.1. Parser / Normalizador → IR.** Valida el JSON (idealmente contra un *meta-schema* — usar Standard Schema / Zod para validar la propia definición) y lo normaliza a una representación interna (`FieldNode[]`) con paths absolutos calculados (`['address','street']`), defaults resueltos y validadores normalizados. Aquí se detectan errores de definición pronto y con mensajes claros.

**5.2. ModelBuilder → objeto inicial → `signal`.** Recorre el IR y construye el objeto modelo anidado, eligiendo el valor inicial por `dataType` (o `defaultValue` si se indica). Resultado: `signal(modeloInicial)`.

```ts
function buildInitialModel(nodes: FieldNode[]): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const n of nodes) {
    if (n.kind === 'group') out[n.key] = buildInitialModel(n.children);
    else if (n.kind === 'array') out[n.key] = n.defaultValue ?? [];
    else out[n.key] = n.defaultValue ?? defaultFor(n.dataType); // ''/0/false
  }
  return out;
}
```

**5.3. SchemaCompiler → `schemaFn` dinámica.** Genera la función que `form()` ejecuta una vez. Recorre el IR y, para cada nodo, resuelve su path dinámicamente y aplica reglas. La pieza clave es la **resolución de path por clave**:

```ts
const resolvePath = (root: any, keys: string[]) => keys.reduce((p, k) => p[k], root);

function compileSchema(nodes: FieldNode[], deps: Deps) {
  return (path: any) => {
    for (const n of nodes) {
      const p = resolvePath(path, n.path);

      // 1) validadores estándar → reglas nativas (vía adaptador)
      for (const v of n.validators) deps.applyStandardValidator(p, v);

      // 2) validadores custom / cross-field → ValidatorRegistry + validate()
      for (const v of n.customValidators) deps.applyCustomValidator(p, v, path);

      // 3) validadores async → validateAsync() (siempre vía registro)
      for (const v of n.asyncValidators) deps.applyAsyncValidator(p, v);

      // 4) lógica condicional → applyWhen(...) con condición compilada (fase 2)
      // 5) grupos → recursión;  arrays → applyEach(p, compileSchema(item)) (fase 2)
    }
  };
}
```

**5.4. Ensamblado.** `form(model, schemaFn, { injector })`. Se devuelve `{ form, model }` por la API de bajo nivel y se pasa el `FieldTree` al renderer.

El mapeo de validadores estándar es directo contra la API real:

| `kind` en JSON | Regla Signal Forms |
|---|---|
| `required` (admite `when`) | `required(path, { message, when })` |
| `email` | `email(path, { message })` |
| `min` / `max` | `min(path, value)` / `max(path, value)` |
| `minLength` / `maxLength` | `minLength(path, value)` / `maxLength(path, value)` |
| `pattern` | `pattern(path, regExp)` |
| `expr` (cross-field/custom) | `validate(path, ctx => …)` usando `value`, `valueOf`, `stateOf` |
| async (`uniqueEmail`, …) | `validateAsync(path, { params, factory, onSuccess, onError })` |

> Detalle importante de la API: la opción `when` **solo existe en `required`**. Para el resto de validadores condicionales hay que envolver con `applyWhen(path, condición, schemaFn)`. El compilador lo gestiona automáticamente.

---

## 6. Lógica dinámica híbrida (DSL + registro)

Dos mecanismos complementarios:

**DSL de expresiones (para lo simple).** Para condiciones comunes (`model.age >= 18`, `value !== ''`, `model.type === 'US'`) usamos un mini-lenguaje de expresiones **sin `eval`**: parseo con un AST seguro (p. ej. `jsep`) y evaluador propio que solo expone un contexto controlado: `value` (valor del campo actual), `model` (snapshot del modelo) y helpers. Ventaja: el JSON es 100% autónomo y serializable.

```jsonc
{ "kind": "expr", "expr": "value === model.password", "message": "No coincide" }
{ "hidden": { "expr": "model.tier === 'economy'" } }
{ "disabled": { "expr": "!model.createAccount" } }
```

El DSL se compila a una función que dentro del schema lee otros campos vía `valueOf`/`stateOf`, respetando el tracking reactivo de Signal Forms:

```ts
// expr "model.age >= 18" → 
hidden(path.extras, ({ valueOf }) => evalExpr(ast, { model: readModel(valueOf) }));
```

**Registro de funciones TS (para lo complejo).** Cuando la condición no cabe en una expresión (cálculos, acceso a servicios, lógica de negocio), el JSON referencia una función por clave que el consumidor registró:

```jsonc
{ "hidden": { "fn": "shouldHideShipping" } }
{ "kind": "fn", "fn": "validatePasswordStrength", "message": "Contraseña débil" }
```

```ts
provideJsonForms({
  functions: {
    shouldHideShipping: (ctx) => ctx.value().sameAsBilling === true,
  },
});
```

**Regla de diseño:** la **validación async siempre va por registro**, nunca por DSL. Un `validateAsync` necesita una `resource`/llamada HTTP con `params`, `factory`, `onSuccess` y `onError` (este último **obligatorio** en la API), algo que no es serializable en JSON. El JSON solo referencia el `kind`; la implementación vive en el `ValidatorRegistry`.

```ts
provideJsonForms({
  asyncValidators: {
    uniqueEmail: {
      params: ({ value }) => value(),
      factory: (email) => resource({ params: email, loader: ({ params }) => api.check(params) }),
      onSuccess: (taken) => taken ? { kind: 'taken', message: 'Ya existe' } : undefined,
      onError: () => ({ kind: 'error', message: 'No se pudo validar' }),
    },
  },
});
```

---

## 7. Integración agnóstica de componentes

El núcleo no conoce ningún widget. La integración se hace con dos registros y un renderer recursivo.

**FieldTypeRegistry.** Mapea `type` (string del JSON) → componente Angular. El consumidor lo rellena, eligiendo su kit:

```ts
provideJsonForms({
  fieldTypes: {
    text:     MatTextFieldComponent,   // o PrimeNG, o HTML plano…
    number:   MatNumberFieldComponent,
    select:   MatSelectFieldComponent,
    checkbox: MatCheckboxFieldComponent,
  },
});
```

Cada componente de campo implementa un contrato mínimo y recibe el **nodo `FieldTree`** (para enlazar `[formField]` y leer estado) más la config del campo:

```ts
export interface FieldComponent {
  field: FieldTree<unknown>;   // nodo estructural → [formField]="field"
  config: FieldConfig;         // label, props, type…
}
```

```html
<!-- ejemplo de un adaptador Material -->
<mat-form-field>
  <mat-label>{{ config.label }}</mat-label>
  <input matInput [formField]="field" [placeholder]="config.props?.placeholder ?? ''" />
  @if (field().touched() && field().errors().length) {
    <mat-error>{{ field().errors()[0].message }}</mat-error>
  }
</mat-form-field>
```

**FieldRenderer (recursivo).** Componente que recorre el IR y, por cada campo, instancia dinámicamente el componente resuelto del registro (vía `NgComponentOutlet` o `ViewContainerRef.createComponent`), le inyecta el nodo `FieldTree` correspondiente y lo envuelve con el wrapper aplicable. Para grupos recurre; para arrays itera con `@for` (fase 2).

**WrapperRegistry (opcional).** Wrappers reutilizables para label + errores + layout, al estilo de los *field wrappers* de Formly, para no repetir el andamiaje en cada componente.

**Resultado:** la misma definición JSON renderiza con Material, PrimeNG, Tailwind o HTML plano cambiando solo el registro. El núcleo permanece intacto.

---

## 8. Validación (alcance v1)

Alcance **v1**: **campos básicos + validadores estándar** + **validación cruzada**. La **validación async** se entrega en **1.5** (sección 11), pero la diseñamos aquí completa para no condicionar el motor.

- **Estándar:** `required`, `email`, `min`, `max`, `minLength`, `maxLength`, `pattern`, mapeados 1:1 desde `validators[]` (sección 5, tabla).
- **Cruzada (cross-field) — v1:** vía `validate()` leyendo otros campos con `valueOf`/`stateOf`. Expresable por DSL (`value === model.password`) o por función registrada. Se compila al path del campo que muestra el error.
- **De la propia definición — v1:** antes de compilar, el JSON se valida contra un meta-schema (Standard Schema/Zod) para detectar errores de configuración pronto y con mensajes claros.
- **Async — 1.5:** vía `validateAsync()` con `resource`, siempre desde el `ValidatorRegistry`. Soporta `debounce` declarado en el JSON (la librería aplica `debounce(path, ms)`).
- **Errores:** se exponen tal cual los entrega Signal Forms (`field().errors()` → `{ kind, message }[]`); el renderer/wrapper decide cómo mostrarlos. Punto de extensión para i18n: resolver `message` contra un diccionario por `kind`.

---

## 9. Estructura del proyecto (monorepo Angular)

```
JsonForms/                         (workspace ng, ng-packagr)
├─ projects/
│  ├─ signal-jsonforms/            ← LIBRERÍA NÚCLEO (UI-agnóstica)
│  │  ├─ core/        parser, IR, ModelBuilder, SchemaCompiler
│  │  ├─ adapter/     única dependencia de @angular/forms/signals
│  │  ├─ expression/  DSL (parser + evaluador seguro)
│  │  ├─ registry/    FieldType / Wrapper / Validator / Function
│  │  ├─ render/      FormHost + FieldRenderer
│  │  └─ public-api.ts
│  ├─ signal-jsonforms-material/   ← ADAPTADOR opcional (Angular Material)
│  ├─ signal-jsonforms-primeng/    ← ADAPTADOR opcional (futuro)
│  └─ demo/                        ← app de ejemplos y banco de pruebas
└─ DESIGN.md
```

Núcleo sin dependencias de kits de UI; los adaptadores se publican como paquetes aparte. Nombre tentativo del paquete: `signal-jsonforms` (a confirmar).

---

## 10. API pública (propuesta)

**Configuración (DI, standalone-first):**

```ts
bootstrapApplication(App, {
  providers: [
    provideJsonForms({
      fieldTypes,        // type → componente
      wrappers,          // wrappers opcionales
      functions,         // registro de funciones (lógica compleja)
      validators,        // validadores síncronos custom
      asyncValidators,   // validadores async
      messages,          // (opcional) i18n por kind
    }),
  ],
});
```

**Uso declarativo (alto nivel):**

```html
<jf-form [schema]="jsonConfig" [(model)]="data" #f="jfForm" (submitted)="save($event)">
  <button [disabled]="f.form().invalid() || f.form().pending()">Guardar</button>
</jf-form>
```

**Uso programático (bajo nivel), para quien quiera el `FieldTree` directo:**

```ts
const { form, model } = buildSignalForm(jsonConfig, { injector, registries });
```

---

## 11. Roadmap por fases

Orden acordado (siguiendo la recomendación de subir anidamiento/arrays y visibilidad condicional a la fase 1):

| Fase | Contenido | Notas |
|---|---|---|
| **0 — Andamiaje** | Workspace ng + librería núcleo + adaptador Material de referencia + demo | Base para iterar |
| **1 — MVP** | Campos básicos, validadores estándar, **cross-field**, **grupos anidados + arrays (`applyEach`)**, **visibilidad/`disabled`/`readonly` condicional (DSL+registro)**, registro de tipos de campo, **validación de la definición JSON (Standard Schema/Zod)** | Entregable principal de v1 |
| **1.5 — Async** | **Validación async (`validateAsync`)** + `debounce` declarativo | Pieza autocontenida en el `ValidatorRegistry`; no condiciona el resto del motor |
| **2 — Integraciones** | Más adaptadores (PrimeNG, Tailwind), wrappers avanzados, layout | |
| **3 — Avanzado** | i18n de mensajes, valores derivados/`computed`, migración/serialización | |

> **Nota sobre el reordenamiento:** anidamiento, arrays y visibilidad condicional son fundacionales (casi cualquier formulario real los necesita) y el `SchemaCompiler`/`FieldRenderer` se simplifican al diseñarlos desde el inicio. La validación **async** se aísla a una 1.5 porque vive entera en el `ValidatorRegistry` y no condiciona el resto del motor; la **cross-field** sí se mantiene en v1 por compartir mecanismo (`validate()` + `valueOf`/`stateOf`) con el resto de validación síncrona.

---

## 12. Riesgos y decisiones abiertas

1. **API experimental.** `@angular/forms/signals` puede romper entre minors. Mitigación: capa adaptadora única + fijar versión de Angular + suite de tests de contrato contra la API.
2. **Pérdida de tipado en el motor.** El intérprete trabaja con `Record<string, unknown>`. Mitigación: validar la definición con un meta-schema y ofrecer genéricos opcionales en la frontera pública.
3. **Reactividad del DSL.** El evaluador debe leer dependencias vía `valueOf`/`stateOf` para que Signal Forms recompute; un snapshot plano del modelo rompería el tracking. Requiere diseño cuidadoso del puente DSL↔contexto.
4. **Estructura dinámica vs estado.** Añadir/quitar campos del modelo en caliente reinicia el form. Política recomendada: declarar superconjunto + `hidden()`. Para arrays, mutar el modelo (no el form).
5. **Seguridad del DSL.** Nada de `eval`/`Function`. AST acotado y contexto explícito.

**Decisiones cerradas (acordadas):**
- **Nombre del paquete:** `signal-jsonforms` (núcleo) + `signal-jsonforms-material` (adaptador de referencia).
- **Validación de la definición:** sí desde **v1**, con Standard Schema/Zod (un meta-schema valida el propio JSON antes de compilar y da errores tempranos y claros).
- **Orden de fases:** anidamiento/arrays y visibilidad condicional en **fase 1**; async en **1.5** (sección 11).
- **Adaptador de referencia:** **Angular Material**, por ser el kit de referencia del framework. La demo se construye sobre él.

---

## 13. Fase 4 — Cobertura (propuesta)

> Estado: borrador de diseño · pendiente de revisión antes de implementar.
> Motivación: tras cerrar el núcleo (campos, validación, lógica dinámica, computed, layout, i18n, migración), las dos brechas más visibles frente a Formly y SurveyJS son **opciones dinámicas/async en selects** y **formularios multi-paso (wizard)**. Esta fase las cubre, más dos *quick wins* que reducen fricción real (`wrappers` apilables y `clearOnHide`).

### 13.0 Principio rector heredado

Se mantiene la regla de la sección 2: **el modelo es el superconjunto estable de todos los campos**, `form()` se construye una vez y lo dinámico (visibilidad, pasos, opciones) es una capa **reactiva/de render** por encima, no una reconstrucción del form. Esto vale tanto para el wizard (particiona el árbol existente; no crea modelos por paso) como para las opciones (se resuelven fuera del `SchemaCompiler`, porque Signal Forms no gestiona el catálogo de opciones de un select).

---

### 13.1 Opciones dinámicas y async (cascading selects)

**Problema.** Hoy las opciones de un `select` viven estáticas en `props.options`. Los casos reales necesitan: opciones **derivadas** de otro campo (país → ciudad) y opciones **cargadas async** (resource/HTTP), normalmente dependientes de otro valor.

**Decisión clave.** Las opciones **no son** una preocupación de validación, así que **no pasan por el `SchemaCompiler`**. Se resuelven en un servicio aparte (`JfOptionsResolver`) que produce un `Signal<OptionsState>` por campo, y el renderer lo inyecta en el componente de campo. Así Signal Forms sigue siendo la única fuente de verdad del *valor*, y las opciones son presentación reactiva.

**Tipos nuevos (`core/model.ts`):**

```ts
export interface OptionItem {
  label: string;
  value: unknown;
  disabled?: boolean;
}

/** Cuatro formas declarativas de poblar las opciones de un campo. */
export type OptionsConfig =
  | OptionItem[]                                   // estáticas, inline
  | { expr: string }                              // derivadas (DSL): debe evaluar a OptionItem[]
  | { fn: string }                                // derivadas (función registrada)
  | { source: string; debounce?: number };        // async, vía registro (resource)

export interface FieldConfig {
  // …existentes…
  options?: OptionsConfig;
  /** Si el valor actual deja de estar entre las opciones, lo limpia (cascading). */
  clearOnOptionsChange?: boolean;
}
```

**Tipos nuevos (`registry/types.ts`):**

```ts
/** Fuente de opciones async; mismo patrón que AsyncValidatorDef. */
export interface OptionSourceDef {
  /** Entradas reactivas (p. ej. el valor de otro campo) → params de la resource. */
  params: (ctx: DynamicContext) => unknown;
  /** Crea la resource/recurso a partir del Signal de params. */
  factory: (input: Signal<unknown>) => unknown;
  /** Mapea el resultado del loader a la lista de opciones. */
  map: (result: unknown) => OptionItem[];
}

export interface JsonFormsConfig {
  // …existentes…
  optionSources?: Record<string, OptionSourceDef>;
}

/** Estado reactivo que el componente de campo consume para pintar el select. */
export interface OptionsState {
  loading: boolean;
  options: OptionItem[];
  error?: unknown;
}
```

**Contrato del componente de campo (`render/field-component.interface.ts`):**

```ts
export interface FieldComponent {
  field: FieldTree<unknown>;
  config: FieldConfig;
  /** Presente solo si el campo declara `options`. Signal reactivo. */
  options?: Signal<OptionsState>;
}
```

**Resolución (`JfOptionsResolver`).** Por cada nodo con `options`:

- `OptionItem[]` → `signal({ loading:false, options })` constante.
- `{ expr }` / `{ fn }` → `computed()` que evalúa contra el modelo (reusa `ExpressionEngine` / `FunctionRegistry`, igual que `computed` de la fase 3). Síncrono, sin `loading`.
- `{ source }` → busca `optionSources[source]`, llama `factory(params)` dentro del injector, opcionalmente aplica `debounce`, y expone `loading/options/error` derivados del estado del recurso. Mismo patrón mental que `validateAsync`.

**Cascading + limpieza.** Cuando `clearOnOptionsChange` está activo, un `effect` observa las opciones resueltas; si el valor actual del campo no está en `options`, escribe el default en el modelo (mismo mecanismo de `updateIn` que usa `setupComputedFields`). Así país→ciudad limpia la ciudad obsoleta.

**Ejemplo JSON:**

```jsonc
{ "key": "country", "type": "select", "dataType": "string",
  "options": [ { "label": "España", "value": "es" }, { "label": "USA", "value": "us" } ] }

{ "key": "city", "type": "select", "dataType": "string",
  "clearOnOptionsChange": true,
  "options": { "source": "citiesByCountry", "debounce": 200 } }
```

```ts
provideJsonForms({
  optionSources: {
    citiesByCountry: {
      params: (ctx) => ctx.valueAt('country'),
      factory: (country) => resource({ params: country, loader: ({ params }) => api.cities(params) }),
      map: (rows) => (rows as any[]).map((r) => ({ label: r.name, value: r.id })),
    },
  },
});
```

---

### 13.2 Formularios multi-paso (wizard)

**Problema.** Onboarding, encuestas y altas largas se dividen en pasos con navegación y validación por paso. Hoy no hay forma de expresarlo.

**Decisión clave.** El wizard es **capa de render**, no de motor. El modelo sigue siendo plano y el superconjunto de todos los campos de todos los pasos; `form()` se construye una vez sobre el árbol completo. Un paso es solo una **partición presentacional** de los nodos de primer nivel. La validez de un paso se **deriva** de los `FieldState` de sus campos (`field().valid()`); no hay sub-forms.

**Tipos nuevos (`core/model.ts`):**

```ts
export interface StepConfig {
  id?: string;
  label?: string;
  description?: string;
  fields: FieldConfig[];
  /** Paso omitido condicionalmente (DSL o función). */
  skipWhen?: DynamicExpr;
}

export interface WizardConfig {
  /** true (def.): no se avanza si el paso actual es inválido. */
  linear?: boolean;
  /** Muestra el stepper/encabezado por defecto. */
  showStepper?: boolean;
}

export interface FormConfig {
  version?: string;
  id?: string;
  layout?: LayoutConfig;
  fields?: FieldConfig[];     // pasa a opcional…
  steps?: StepConfig[];       // …excluyente con `fields`: si hay steps, manda steps
  wizard?: WizardConfig;
}
```

**Normalización.** El `Normalizer` aplana `steps[].fields` a la lista de `FieldNode` habitual (paths de primer nivel, sin prefijo de paso → el modelo no cambia de forma), y guarda en `FormDefinition` un mapa `stepIndex: { step: StepConfig; nodeKeys: string[] }[]`. El `SchemaCompiler` y el `ModelBuilder` ni se enteran de los pasos. La meta-validación (zod) acepta `steps` **o** `fields`, no ambos.

**Componente `JfWizard` (capa render, agnóstico de kit).** Estado con señales:

- `currentStep: WritableSignal<number>`, saltando los pasos cuyo `skipWhen` es cierto.
- `stepValid(i): Signal<boolean>` = todos los campos del paso `i` válidos (derivado de los `FieldState`).
- `next()` → si `linear` y el paso actual es inválido, marca sus campos como `touched` y no avanza; si no, pasa al siguiente paso visible. `prev()`, `goTo(i)` (en `linear`, solo a pasos ya completados).
- `isLast`, `isFirst`, `progress` computados.
- `submit()` se dispara desde el último paso (reusa el `submit()` async ya existente en `FormHost`).

El stepper por defecto es **estructural y sin estilo** (clases `jf-step`, `jf-step-active`, `jf-step-done` para temabilidad), igual que hoy `.jf-group`/`.jf-array`. Un adaptador podría ofrecer luego uno basado en `mat-stepper`. La navegación por defecto (Prev/Next/Submit) se renderiza pero es **sustituible**: `<jf-form>` expone el estado del wizard por su `exportAs` (`#f="jfForm"` → `f.wizard`) para que el consumidor monte sus propios botones.

**Ejemplo JSON:**

```jsonc
{
  "version": "1",
  "wizard": { "linear": true, "showStepper": true },
  "steps": [
    { "id": "account", "label": "Cuenta",
      "fields": [ { "key": "email", "type": "text", "validators": [ { "kind": "required" } ] } ] },
    { "id": "profile", "label": "Perfil",
      "skipWhen": { "expr": "model.kind === 'guest'" },
      "fields": [ { "key": "fullName", "type": "text" } ] }
  ]
}
```

---

### 13.3 Quick wins

**Wrappers apilables.** `wrapper?: string` pasa a `wrapper?: string | string[]`. El `FieldRenderer` los anida de fuera hacia dentro (`['card','validation']` → `card` envuelve a `validation` envuelve al campo). Retrocompatible: un string se trata como lista de uno.

**`clearOnHide`.** Nuevo `FieldConfig.clearOnHide?: boolean`. Cuando la condición `hidden` del campo evalúa a cierto, un `effect` resetea su valor al default en el modelo (reusa la condición ya compilada por el `SchemaCompiler` y `updateIn`). Evita que un campo oculto contamine el `submit`. Por defecto `false` (comportamiento actual: el valor se conserva).

---

### 13.4 Fuera de alcance de esta fase

Interop con JSON Schema estándar, selección de renderer por *tester*/ranking, hooks de ciclo de vida por campo, panel de *error summary*, y el builder visual drag-and-drop. Se valorarán en una fase posterior. **Nota transversal recomendada:** introducir `vitest` sobre el core (`ModelBuilder`, `SchemaCompiler`, `JfOptionsResolver`, normalización de `steps`) durante esta fase, para que cada feature nueva entre con tests y no como deuda — la verificación deja de depender de scripts Node manuales.

### 13.5 Resumen de impacto en la API

| Área | Cambio | Retrocompatible |
|---|---|---|
| `model.ts` | `OptionItem`, `OptionsConfig`, `FieldConfig.options`, `clearOnOptionsChange`, `clearOnHide`, `StepConfig`, `WizardConfig`, `FormConfig.steps/wizard`, `fields` opcional, `wrapper: string \| string[]` | Sí (todo aditivo / ensanchado) |
| `registry/types.ts` | `OptionSourceDef`, `OptionsState`, `JsonFormsConfig.optionSources` | Sí |
| `field-component.interface.ts` | `options?: Signal<OptionsState>` | Sí (opcional) |
| `render/` | `JfWizard`, stepper por defecto, `FormHost` expone `wizard` | Sí (solo activo si hay `steps`) |
| nuevo `core/` | `JfOptionsResolver` | Sí |
```