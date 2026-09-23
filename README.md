# Sistema de Evaluación y Mejora de los Modos de Afrontamiento a la Tensión Académica

Aplicación web que permite a estudiantes universitarios medir cómo afrontan la
tensión académica en tres modos —responsable, organizado y activador
fisiológico— y recibir a cambio un plan de actividades adaptado a los puntos
más flojos.

El instrumento es la **Escala breve de modos de afrontamiento a la tensión
académica** (Grajeda et al., 2024): 24 ítems que se responden en una escala de
1 a 5, donde 1 es *nunca* y 5 es *siempre*. Todos los ítems están redactados en
positivo, así que más puntaje siempre significa mejor afrontamiento y **no hay
ítems inversos que recodificar**. Tampoco hay escala de veracidad.

El nivel de cada modo sale de **sumar** los puntajes de sus ítems, no de contar
aciertos. Los modos que salen bajos abren un plan de actividades de **dos días**,
con el segundo día bloqueado durante 12 horas.

## Stack

| Capa | Tecnología |
| --- | --- |
| Framework | Next.js 15.5 (App Router) con Turbopack en desarrollo |
| UI | React 19.1, TypeScript 5, Tailwind CSS 3.4 |
| Iconos | Lucide React |
| Autenticación | Firebase Auth + cookie de sesión `__session` |
| Base de datos | Firestore |
| Servidor | Firebase Admin SDK 14 (API modular) |
| Sesión en el edge | jose |
| Exportación | XLSX (solo escritura) |
| Hosting | Vercel |

## El instrumento

### Los tres modos

| Modo | Ítems | Puntaje máximo |
| --- | --- | --- |
| **Responsable** | 4, 9, 11, 12, 13, 17, 18, 19, 21, 22, 23, 24 (12 ítems) | 60 |
| **Organizado** | 1, 2, 3, 5, 6, 7, 8, 10 (8 ítems) | 40 |
| **Activador fisiológico** | 14, 15, 16, 20 (4 ítems) | 20 |

El reparto vive en `modeQuestions`, en `src/constants/questions.ts`, y **solo
ahí**. No lo copie dentro de `ResultsDisplay`, `ListaUsers` ni `OtherData`: en
cuanto hay dos copias, basta con que una se quede atrás al retocar el
instrumento para que el mismo test dé puntajes distintos según quién lo mire, y
para que queden participantes puntuados con una definición y participantes
puntuados con la otra. Hay una prueba que comprueba que los 24 ítems están
repartidos, sin duplicados y sin ninguno suelto.

### Los cortes de nivel

| Escala | Bajo | Medio | Alto |
| --- | --- | --- | --- |
| Modo de afronte total | 0 – 48 | 49 – 95 | 96 – 120 |
| Responsable | 0 – 24 | 25 – 47 | 48 – 60 |
| Organizado | 0 – 16 | 17 – 31 | 32 – 40 |
| Activador fisiológico | 0 – 8 | 9 – 15 | 16 – 20 |

Están en `MODE_THRESHOLDS` y `TOTAL_THRESHOLDS`, en el mismo archivo. Hay una
prueba que comprueba que los máximos cuadran con el número de ítems (5 puntos
por ítem) y que los cortes están ordenados: si alguien toca un número y rompe la
coherencia, `npm test` lo dice.

**El modo de afronte total tiene su propia escala y no se deduce de los otros
tres.** Es la suma de los 24 ítems contra el rango 0–120. Alguien puede tener el
total en ALTO y a la vez un modo en BAJO —basta con que ese modo sea el
activador fisiológico, que solo aporta 20 de los 120 puntos—, y esa persona sí
recibe plan de actividades. Hay una prueba que fija justo ese caso.

## El plan de actividades

Solo los modos que salen **BAJOS** abren plan. Con nivel ALTO o MEDIO el
participante ve la interpretación psicológica de su nivel y nada más: el programa
solo escribió orientaciones para el nivel bajo.

Dentro de un modo bajo, las actividades no se asignan por el nivel sino **ítem a
ítem**: se abre una por cada ítem respondido con **1 o 2**
(`ITEM_INTERVENTION_MAX_SCORE`). Hay una actividad por cada uno de los 24 ítems,
así que un modo bajo con cinco ítems flojos abre cinco planes.

Los dos filtros van **encadenados**, y el orden importa: un modo en nivel MEDIO
con dos ítems respondidos con 1 **no** abre nada. Es la lectura literal del
programa, donde el bloque de orientaciones de cada modo está encabezado por el
nivel "Bajo" y el filtro por ítem va dentro. Si se quitara el primer filtro casi
todo el mundo acabaría con actividades pendientes, y como tenerlas **bloquea** el
segundo intento, mucha gente quedaría atascada por dos ejercicios sueltos en un
modo que salió bien.

Cada actividad son **dos días**, y cada día uno o varios ejercicios. Al terminar
los del día 1 arranca una espera de **12 horas** antes de abrir el día 2, en
`UNLOCK_DELAY_SECONDS`. Los temporizadores son independientes por recomendación y
siguen corriendo con la pestaña cerrada: se reconstruyen al cargar a partir de
`countdownStartTime`, guardado en Firestore.

No se muestra una cuenta atrás sino la hora absoluta de desbloqueo —*"se
desbloqueará la actividad a las 21:30 del 8 de septiembre"*—, porque con doce
horas por delante una cuenta atrás obliga a hacer la suma mentalmente.

Mientras un temporizador corre aparecen los botones de navegación para pasar a
otro ítem y seguir avanzando por otro lado. Al completar los dos días se abren
las preguntas de retroalimentación de esa recomendación.

Para recorrer el plan entero sin esperar, use `NEXT_PUBLIC_UNLOCK_DELAY_SECONDS`
(ver *Variables opcionales*). Nunca en producción.

### El ítem 9 no tiene preguntas de retroalimentación

Los otros 23 ítems cierran con tres preguntas de SÍ/NO; el ítem 9
(*"Me comunico apropiadamente con mis compañeros de clase"*) no las trae en el
documento del programa. No es un error de transcripción: no están escritas. La
aplicación lo soporta —al terminar el día 2 se marca la recomendación como
completa y no se abre el modal— y hay una prueba que fija que **solo** el ítem 9
está en ese caso, para que si algún día se añaden, avise en lugar de pasar en
silencio.

## Los dos intentos del test

Cada participante puede hacer el test **dos veces como máximo**, y el segundo
intento existe para medir el efecto de las actividades. De ahí sale toda la
regla, que vive en `src/lib/testAccess.ts`:

| Situación | ¿Puede hacer el test? |
| --- | --- |
| Nunca lo hizo | Sí |
| **Le quedan actividades pendientes** | **No**, por mucho tiempo que pase |
| **Completó todas sus actividades** | **Sí, de inmediato**, sin esperas |
| Ningún modo bajo | No: no hubo intervención que medir |
| Ya hizo los dos intentos | No |

### Dónde se guarda cada intento

El primer intento va en las propiedades estándar y el segundo en las mismas con
sufijo `2`. Nada se sobrescribe:

```jsonc
{
  // Primer intento
  "answers": {},        "testResults": {},
  "testDuration": 180,  "lastTestDate": "…",
  "recommendationProgress1": {},  // archivado al empezar el segundo
  "activityFeedback": {},

  // Segundo intento
  "answers2": {},       "testResults2": {},
  "testDuration2": 200, "lastTestDate2": "…",
  "recommendationProgress": {},   // el plan vigente
  "activityFeedback2": {},

  "hasRetakenTest": true
}
```

`answers` guarda **el puntaje marcado en cada ítem (1 a 5)**, no un booleano.
`testResults` guarda un puntaje y un nivel por cada modo más uno del total:

```jsonc
"testResults": {
  "responsable":          { "score": 37, "level": "MEDIO" },
  "organizado":           { "score": 14, "level": "BAJO"  },
  "activadorFisiologico": { "score": 18, "level": "ALTO"  },
  "total":                { "score": 69, "level": "MEDIO" }
}
```

`recommendationProgress` es siempre el plan **vigente**: al empezar el segundo
intento su contenido se copia a `recommendationProgress1` y se vacía, para que el
panel arranque limpio sin perder la evidencia de qué hizo la persona entre un
test y otro.

### Tres errores del pasado que no hay que reintroducir

**`hasRetakenTest` se escribe al ENVIAR el test, no al empezarlo**, en la misma
operación que las respuestas. Cuando se marcaba al abrir el formulario, quien lo
abandonaba se quedaba con el segundo intento consumido sin haber respondido nada.
Llegó a haber 15 expedientes así; ya no queda ninguno (comprobado el 22 de
septiembre de 2026: ningún participante tiene `hasRetakenTest` sin `answers2`).

**La decisión de en qué casilla escribir no se delega en una marca previa.**
`TestForm.handleSubmit` se lo pregunta a `testAccess.ts` con las respuestas ya en
la mano. Antes, un intento que llegaba sin la marca pisaba el primero.

**Una recomendación se completa al acabar la última actividad del ÚLTIMO día**,
no al empezarlo. Guardar `isCompleted` en cuanto se abría el último día la daba
por terminada en Firestore: aparecía con el ✅ y el día a medias, la
retroalimentación no se pedía nunca, y `testAccess.progresoDeActividades` —que
cuenta ese mismo campo— abría el segundo intento sin que la persona hubiera hecho
la intervención que ese intento existe para medir.

## Puesta en marcha

Hace falta **Node 22**, y en concreto esa versión mayor: así está fijado en el
campo `engines` de `package.json` (`"node": "22.x"`), que es además lo que Vercel
lee para elegir el runtime del despliegue. La restricción es deliberada, para que
producción no salte sola a una versión mayor nueva.

`firebase-admin` 14 por su parte pide `>=22`, así que el mínimo lo marca él: con
una versión anterior el proyecto instala y compila igual, pero las rutas que usan
el Admin SDK fallan al ejecutarse con un error de módulo poco descriptivo.

En local nada impide usar una versión mayor —npm no aplica `engines` salvo con
`engine-strict`—, pero entonces no se está probando sobre el mismo runtime que el
despliegue. Si algún día se quiere subir de versión, hay que cambiar `engines`:
no basta con actualizar el Node local.

```bash
node -v         # debe ser v22.x
npm install
npm run dev     # http://localhost:3000
```

Antes de arrancar hace falta un `.env.local` en la raíz. Las variables
`NEXT_PUBLIC_*` salen de Firebase Console › Configuración del proyecto › Tus
aplicaciones:

```env
NEXT_PUBLIC_FIREBASE_API_KEY=
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=
NEXT_PUBLIC_FIREBASE_PROJECT_ID=
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=
NEXT_PUBLIC_FIREBASE_APP_ID=
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=
```

**Sin ellas la compilación falla**, y no en las pantallas sino al prerenderizar:
`next build` corta en `/auth/resetPassword` con `auth/invalid-api-key`. Si ve ese
error, lo primero que hay que mirar es si existe el `.env.local`.

Las dos del Admin SDK salen de Firebase Console › Configuración del proyecto ›
Cuentas de servicio › Generar nueva clave privada. **No son opcionales**: sin
ellas fallan el registro de participantes y la gestión de administradores. La
clave privada va entre comillas, en una sola línea y con los `\n` literales.

```env
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-xxxxx@tu_project_id.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
```

Estas mismas variables hay que darlas de alta en Vercel › Settings ›
Environment Variables para que el despliegue funcione.

### Variables opcionales

`NEXT_PUBLIC_UNLOCK_DELAY_SECONDS` acorta la espera entre el día 1 y el día 2,
que en producción es de 12 horas. Sirve para poder recorrer el plan completo en
una sesión de pruebas:

```env
NEXT_PUBLIC_UNLOCK_DELAY_SECONDS=10
```

**No la defina nunca en producción**: el desbloqueo se volvería instantáneo y las
actividades perderían su sentido. Un valor que no sea un número positivo se
ignora y se usa el de producción.

### Despliegue

La aplicación se despliega en **Vercel**. Firebase se usa solo como backend
—Auth y Firestore—, no como hosting: por eso `firebase.json` solo contiene la
sección `firestore` —las reglas— y la configuración de los emuladores que usan
las pruebas. Hubo secciones `functions` y `hosting` que apuntaban a un directorio
y a una función que nunca existieron en el repositorio, y que hacían fallar
cualquier `firebase deploy` sin objetivo acotado.

Lo único que se publica con la CLI de Firebase son las reglas de seguridad:

```bash
firebase deploy --only firestore:rules
```

### Scripts

| Comando | Qué hace |
| --- | --- |
| `npm run dev` | Servidor de desarrollo con Turbopack |
| `npm run build` | Compilación de producción |
| `npm start` | Sirve la compilación de producción |
| `npm run lint` | ESLint |
| `npm test` | Pruebas unitarias y de componentes con Vitest |
| `npm run test:watch` | Vitest en modo continuo |
| `npm run test:rules` | Pruebas de las reglas de Firestore en el emulador |
| `npm run test:e2e` | Pruebas extremo a extremo en Chromium, Firefox y WebKit |

## Crear el primer superadministrador

Un proyecto de Firebase recién creado no tiene a nadie, y sin superadministrador
no se puede dar de alta ningún administrador. Para arrancar:

```bash
node --env-file=.env.local scripts/crear-superadmin.mjs   --email=superadmin@ejemplo.com --password="UnaContraseñaLarga" --aplicar
```

Sin `--aplicar` el script solo mira y no escribe nada; conviene lanzarlo así la
primera vez.

Crea **las dos piezas a la vez**, que es lo importante: la cuenta en Firebase
Authentication y el documento `superadmins/{uid}`, con el mismo uid. Hacen falta
las dos, porque el rol se deduce de la colección en la que vive el documento y se
busca por uid (`AuthContext.resolveUserData`). Un documento creado a mano desde la
consola de Firestore **no sirve**: sin cuenta en Auth nadie puede iniciar sesión y
caer en él, y es un error fácil de cometer porque la consola deja crear el
documento tan campante.

Para cambiar después el correo o la contraseña de una cuenta ya existente está
`scripts/admin-usuario.mjs`.

### Sobre el correo del superadministrador

Puede ser una dirección inventada. La aplicación no verifica el correo
(`createAdmin` deja `emailVerified: false` y nadie lo comprueba), así que una
cuenta con correo falso entra y funciona igual.

Lo único que se pierde es el botón **"¿Olvidaste tu contraseña?"**: el correo de
recuperación se envía a una dirección que no existe y no llega nunca. La
contraseña se cambia entonces desde Firebase Console › Authentication › Users ›
⋮ › Editar usuario, o con `scripts/admin-usuario.mjs`.

Hay un argumento a favor de que sea falso: el formulario de recuperación es
público, así que un correo real y conocido es una vía de entrada más a la cuenta
de mayor privilegio del sistema. Con uno inventado, la única forma de cambiar esa
contraseña es tener acceso al proyecto de Firebase. A cambio, esa cuenta de
Google pasa a ser la única llave, y conviene que tenga verificación en dos pasos.

## Roles y acceso

Hay tres roles, y **el rol se deduce de la colección en la que existe el
documento** del usuario: `superadmins`, `admins` o `users`. No hay campo de rol.

- **Estudiante** — realiza el test, consulta su perfil psicológico y sigue las
  actividades recomendadas.
- **Administrador** — ve y exporta a Excel a los participantes que él mismo
  invitó. **No puede eliminarlos**: las reglas de Firestore cierran el borrado de
  `users` a cualquiera (`allow delete: if false`) y la ruta que lo hace por el
  Admin SDK exige superadministrador.
- **Superadministrador** — gestiona a los administradores.

No existe el borrado de un participante suelto en ninguna pantalla. La única
forma de eliminar participantes es en cascada, al eliminar al administrador que
los invitó, desde el panel del superadministrador.

Nadie se registra por su cuenta: hace falta un **código de invitación** emitido
por un administrador. Se valida en el servidor, en `/api/auth/validate-invitation`,
y no en el navegador, porque la comprobación ocurre antes de que exista la cuenta
y hacerla desde el cliente obligaría a dejar la colección `admins` legible sin
sesión.

## Estructura

```
src/
├── app/
│   ├── api/
│   │   ├── admin/                 # Eliminar administradores y participantes
│   │   ├── auth/                  # Cookie de sesión y código de invitación
│   │   └── createAdmin/           # Alta de administradores
│   ├── auth/                      # Login, registro y recuperación
│   ├── dashboard/                 # Un panel por rol: user, admin, superadmin
│   ├── home/  results/  test/
│   └── layout.tsx  page.tsx
├── components/
│   ├── auth/                      # Formularios y Redirect
│   ├── dashboard/                 # Paneles de User, Admin y SuperAdmin
│   ├── ResultsDisplay/            # Resultados, actividades y perfil
│   └── TestForm/                  # Cuestionario
├── constants/
│   ├── questions.ts               # Los 24 ítems, los modos y los cortes
│   ├── recommendations.ts         # Actividades por ítem y día
│   └── interpretations.ts         # Interpretación del instrumento y mensajes al participante
├── contexts/AuthContext.tsx
├── lib/
│   ├── auth/verifySession.ts      # Verificación del token con jose
│   ├── celebracion.ts             # Confeti al completar actividades
│   ├── firebase/                  # config.ts (cliente) y admin.ts (servidor)
│   ├── scoring.ts                 # Puntuación y apertura de actividades
│   ├── sonido.ts                  # Campanita que acompaña al confeti
│   ├── testAccess.ts              # Quién puede hacer el test
│   └── terms.ts                   # Consentimiento informado
├── middleware.ts
└── types/
```

### `recommendations.ts` se edita a mano

Los 24 planes, con sus dos días, sus ejercicios y sus preguntas de
retroalimentación, se transcribieron del documento *"Programa para mejorar
modos de afrontamiento a la tensión académica"* (Grajeda et al., 2025) al montar
el sistema. **Esa transcripción se hizo una sola vez.** A partir de ahí el
archivo es la fuente: si hay que corregir un ejercicio o añadir una pregunta, se
edita ahí directamente, como cualquier otro archivo del proyecto.

Hubo aquí un generador que rehacía el archivo desde el Word. Se retiró: nadie
iba a reimportar el documento, y a cambio convertía cualquier corrección de una
frase en un rodeo por el Word, el extractor y el generador, con el riesgo de que
una regeneración se llevara por delante lo editado a mano.

Lo que sí hay que respetar al editar:

**El texto es el del documento, palabra por palabra.** Son ejercicios clínicos y
una paráfrasis los altera. Los errores de tecleo del original se conservan a
propósito.

**El cuerpo de cada ejercicio es una sucesión de bloques**, no una cadena:
`{ tipo: "parrafo" }` y `{ tipo: "lista" }`. Varios ejercicios presentan con un
párrafo, enumeran en viñetas y cierran con otro párrafo, y aplanarlo a texto
corrido deja la pantalla plana. Dos ejercicios —el ítem 13 y el 17— traen además
una secuencia numerada dentro de un párrafo, con cada punto en su propia línea.
Hay pruebas que comprueban que las viñetas y esas dos secuencias siguen ahí.

**El `title` de cada recomendación es el enunciado de su ítem en
`questions.ts`**, y hay una prueba que lo verifica. El documento del programa
tiene pequeñas variantes respecto del instrumento —*"realizó"* por *"realizo"*
en el ítem 14—, y manda el instrumento.

## Decisiones que conviene conocer antes de tocar el código

Son siete puntos donde lo evidente es lo incorrecto, y donde ya hubo errores.

**La protección de rutas son dos capas y hacen cosas distintas.**
`src/middleware.ts` verifica criptográficamente la cookie `__session` con `jose`
contra las claves públicas de Google en `/dashboard/*`, `/test` y `/results`;
solo comprueba que hay sesión, porque el rol no viaja en el token.
`src/components/auth/Redirect.tsx` es la **única fuente de verdad** de la
navegación por rol. Los componentes no deben añadir sus propios `router.push` de
autorización: hacerlo provocó redirecciones que competían entre sí.

**Las consultas del panel filtran por `invitationCode` en el servidor.**
Firestore no recorta los resultados según las reglas de seguridad: si un solo
documento del resultado no pasa la regla, rechaza la consulta entera. El filtro
no es una optimización, es lo que hace que la consulta funcione.

**Quién puede repetir el test lo decide `src/lib/testAccess.ts`, y solo ese
archivo.** `UserDashboard`, `app/test/page.tsx` y el botón de `ResultsDisplay` se
limitan a preguntarle. La regla es que el segundo intento mide el efecto de las
actividades: quien tenga alguna pendiente no puede repetir por mucho tiempo que
pase, quien las termina todas puede repetir de inmediato, y a quien no le salió
ningún modo bajo no le corresponde un segundo intento porque no hubo intervención
que medir. **No hay plazo de espera**; hubo uno de un mes y se retiró al quedar
sin función. Cuando la regla estaba repartida, cada pantalla se quedó con media:
unas comprobaban solo el plazo y otras solo las actividades, y por el hueco del
dashboard los intentos nuevos llegaban sin `hasRetakenTest` y sobrescribían el
primero.

**El desbloqueo entre días son 12 horas**, en `UNLOCK_DELAY_SECONDS`
(`src/components/ResultsDisplay/ResultsDisplay.tsx`). Para acortarlo en pruebas
está `NEXT_PUBLIC_UNLOCK_DELAY_SECONDS`; si el temporizador parece instantáneo
donde no debería, esa variable es lo primero que hay que mirar. Antes se acortaba
descomentando una segunda definición escrita justo debajo del valor real, a un
carácter de acabar activa en un despliegue.

**Las barras del perfil van en porcentaje, no en puntaje crudo.** Los tres modos
tienen máximos distintos —60, 40 y 20—, así que dibujarlas con el puntaje haría
parecer que el modo responsable es siempre el más fuerte solo por tener el triple
de ítems que el activador fisiológico.

**Los avisos de `npm audit` sobre XLSX no aplican a este proyecto.** El export
del panel usa `xlsx` 0.18.5, y SheetJS dejó de publicar en el registro público de
npm, así que esa versión arrastra vulnerabilidades conocidas. Todas son de
**análisis de archivos recibidos de terceros**, y aquí la biblioteca solo se usa
para *escribir* el archivo de exportación en `OtherData.tsx`: nunca se lee un
`.xlsx` que venga de fuera. Antes de lanzarse a migrar por un `npm audit` en
rojo, compruebe que sigue siendo así. Si algún día el sistema empieza a importar
hojas de cálculo, entonces sí hay que mover ficha, y la vía es el paquete que
SheetJS publica en su propio registro (`cdn.sheetjs.com`), no el de npm.

**El registro está abierto por enlace, y es deliberado.**
`src/components/auth/RegisterFormUser.tsx` trae el código de invitación
precargado en `DEFAULT_INVITATION_CODE`. No es un descuido ni una credencial
olvidada: el flujo previsto es repartir solo el enlace y que la persona se
registre sin fricción, y quien reciba el código de otro administrador
simplemente lo sobrescribe en el campo, que es editable. **No lo quite pensando
que corrige una fuga**: eso rompería el registro por enlace.

La consecuencia hay que tenerla presente: el código de invitación **no es un
control de admisión**. Cualquiera con la URL se registra y queda asociado a ese
administrador. Lo que sí está protegido es la privacidad —las reglas de Firestore
impiden que un registrante lea el expediente de nadie más—, así que el coste real
no es de confidencialidad sino de calidad del dato: entre los participantes
reales se mezclan registros de prueba, duplicados y gente ajena al estudio. Si
eso llega a estorbar para el análisis, la salida no es cerrar el registro, es
poder marcarlos o filtrarlos.

Por lo mismo, **rotar un `invitationCode` a mano no es una operación inocua**.
La aplicación no ofrece esa operación —`ListaAdmin` genera el código al crear el
administrador y nunca lo edita—, así que esto solo aplica a quien vaya a
cambiarlo directamente en la consola de Firebase. Los documentos de `users`
guardan una copia del código con el que se registraron, y tanto las consultas del
panel como las reglas de Firestore comparan esa copia con el código *actual* del
administrador. Cambiarlo lo dejaría sin ver a ninguno de sus participantes salvo
que se migren todos sus documentos en la misma operación, cosa que además
requiere el Admin SDK, porque la regla `allow update` congela ese campo. Ojo con
la asimetría: el borrado en cascada sigue funcionando, porque busca también por
`adminId`, así que ese administrador no vería a nadie pero al eliminarlo sí se
los llevaría por delante. Cambiarle el correo o la contraseña, en cambio, es
seguro: el uid no se mueve, y es el uid lo que sostiene el vínculo.

## Pruebas

```bash
npm test
```

Cubren la lógica pura —la puntuación por modo y del total, las fronteras de los
niveles, qué actividades abre cada modo bajo, la coherencia del catálogo de
recomendaciones, las reglas que deciden si alguien puede hacer el test y la
verificación de la sesión— y los componentes con más lógica: la navegación por
rol (`Redirect`), el cuestionario (`TestForm`) y el formulario de registro. Los
componentes se prueban en jsdom con Firebase simulado, así que no hace falta
navegador ni conexión.

### Reglas de Firestore

```bash
npm run test:rules
```

Comprueban `firestore.rules` contra el emulador de Firestore, con un proyecto
`demo-afrontamiento` que la CLI de Firebase nunca conecta con la nube: no tocan
producción. Necesitan la CLI (`npm install -g firebase-tools`) y **Java 21 o
superior**, que el emulador exige —con Java 17 la CLI corta con
*"firebase-tools no longer supports Java version before 21"*—. Lance estas
pruebas antes de publicar cualquier cambio en las reglas.

### Extremo a extremo

```bash
npm run test:e2e
```

Recorren la aplicación en un navegador de verdad —registro, test, resultados,
avance de las actividades con su espera, panel del administrador y alta y baja de
administradores con su cascada— en los motores Chromium, Firefox y WebKit.
Arrancan `next dev` contra los emuladores de Auth y Firestore con el proyecto
`demo-afrontamiento`, así que tampoco tocan producción. WebKit es el motor de
Safari y de todos los navegadores de iPhone, pero no es Safari: la aplicación no
se ha probado en Safari real.

Necesitan lo mismo que las reglas —la CLI de Firebase y Java 21— y los
navegadores de Playwright (`npx playwright install chromium firefox webkit`).

Para hablar con los emuladores la aplicación tiene un modo de prueba. En el
cliente lo activa `NEXT_PUBLIC_FIREBASE_EMULATORS=1`; en el servidor,
`FIREBASE_AUTH_EMULATOR_HOST`, y solo fuera de una compilación de producción,
porque en ese modo la sesión se acepta sin firma
(`src/lib/firebase/emulators.ts`). **No defina ninguna de las dos en Vercel.**

### Rendimiento

**No hay mediciones vigentes.** Las que había se tomaron sobre una versión
anterior de las pantallas y se retiraron por no inducir a error: presentar como
verificación del sistema unas cifras medidas sobre otro cuestionario no vale
nada, y es justo lo que ya pasó una vez en este proyecto —la documentación
afirmaba que la aplicación cargaba en menos de 3 segundos sin ningún registro
que lo respaldara—.

Para rehacerlas hace falta Lighthouse y una compilación de producción:

```bash
npm run build
PORT=3002 npm start

# En otra terminal, una página cada vez:
npx lighthouse http://localhost:3002/ --output=html --output=json   --output-path=docs/verificacion/consentimiento --preset=desktop
```

Sin `--preset=desktop` se mide el perfil móvil, que aplica estrangulamiento de
CPU y de red y es el que conviene mirar: es como la mayoría de los participantes
van a abrir la aplicación.

Las rutas que exigen sesión —`/dashboard/user`, `/results` y `/test`— no se
pueden medir así, porque Lighthouse borra el almacenamiento antes de medir y la
sesión se pierde. Para esas está `scripts/medir-rutas-protegidas.mjs`, que
inicia sesión por la interfaz y mide en un *user flow*. Necesita dos
participantes de prueba: uno con el test hecho y otro sin hacerlo, porque
`/test` solo se abre a quien todavía no lo ha respondido. Puede crearlos con
`scripts/sembrar-datos-de-prueba.mjs`.

```bash
PART_EMAIL=... PART_PASS=... PART2_EMAIL=... PART2_PASS=...   node scripts/medir-rutas-protegidas.mjs
```

Cuando las rehaga, deje constancia de la fecha, la versión de Lighthouse y el
equipo: sin eso una medición no es reproducible y no sirve como evidencia.
