<div align="center" style="
  background-color: #080086;
  padding: 32px 24px;
  border-radius: 8px;
">
  <img 
    src="https://dataspace.es/_next/image?url=%2Fcorporate%2FdataspaceLogo.png&w=1920&q=75" 
    alt="DataSpace Logo" 
    width="340"
    style="margin: 20px;"
  />

  <p style="
    margin: 0;
    max-width: 720px;
    font-size: 1.05rem;
    line-height: 1.6;
    text-align: center;
    color: #ffffff;
  ">
      Fomenta la compartición, uso y negocio con datos basado en principios de soberanía,
      interoperabilidad, legalidad y seguridad.
  </p>
</div>

## 📖 Descripción

**DATASPACE.ES** es un ecosistema de espacios de datos que facilita la compartición, uso y comercialización de datos bajo principios de soberanía, interoperabilidad, legalidad y seguridad.

Componente de código abierto del proyecto [dataspace.es](https://dataspace.es) («Plataforma dataspace.es», expediente TSI-100130-2024-31), desarrollado por GrayHats S.L.U.

Este monorepo unifica todas las aplicaciones y paquetes compartidos del ecosistema DataSpace.

## Estructura del Monorepo

Organización de carpetas y archivos principales del proyecto.

```
dataspace/
├── 📁 apps/                          # Aplicaciones principales
│   └── 🌐 web/                      # Aplicación Web Frontend
│   └── 🥷🏻 data-anonymizer/          # Recursos para anonimizar PII
│   └── 🧾 transaction-log/          # Base de datos de hashes registrados en la blockchain
├── 📋 package.json                   # Configuración raíz del monorepo
├── 🔒 pnpm-workspace.yaml           # Configuración workspace de PNPM
└── 📖 README.md                     # Esta documentación
```

## ⚡ Requisitos

Software necesario para ejecutar el proyecto.

- Node.js
- pnpm

## 🚀 Inicio Rápido

Comandos esenciales para configurar y ejecutar el proyecto por primera vez.

```bash
# Clonar e instalar
git clone <repository-url>
cd dataspace
pnpm install

# Iniciar desarrollo
pnpm dev:web    # Terminal 2: Frontend (opcional)
```

## 🔧 Configuración

Copia `apps/web/.env.example` a `apps/web/.env` y rellena las variables. Además de las credenciales y URLs de los servicios (verifier, emisor, backend TMF, Stripe, etc.), estas dos son obligatorias y no tienen valor por defecto:

| Variable                 | Descripción                                                                                                                         | Si falta                                   |
| ------------------------ | ----------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------ |
| `MARKETPLACE_DID`        | DID del marketplace (`did:web:...`), destino de los roles en `credentialSubject.roles`.                                              | No se asigna ningún rol a los usuarios.    |
| `PROVIDER_DOMAIN_SUFFIX` | Sufijo de dominio de confianza de los providers (p. ej. `.example.org`). Se valida antes de enviar el `vp_token` a su verifier.     | Se rechaza toda dirección de provider.     |

## ⚙️ Comandos Principales

Comandos más utilizados durante el desarrollo del proyecto.

### Desarrollo

```bash
# Aplicaciones
pnpm dev:web          # Frontend
```

### Testing y Calidad

Comandos para ejecutar pruebas y verificar calidad de código.

```bash
# API
cd apps/web
pnpm test              # Ejecutar pruebas
pnpm lint:fix          # Linter + formato
```

## 📁 Aplicaciones

Descripción técnica de cada aplicación dentro del monorepo.

### Web Frontend

Aplicación web del ecosistema.

## 💻 Desarrollo

Guía práctica para contribuir y mantener el código del proyecto.

### Flujo de Trabajo

1. Modificar código en `apps/web/`
2. Ejecutar pruebas: `pnpm test`
3. Commit con [conventional commits](https://www.conventionalcommits.org/)

### Gestión PNPM

Comandos específicos para manejar dependencias en el workspace.

```bash
# Instalar en app específica
pnpm --filter web add <package>

# Instalar globalmente
pnpm add -w <package>

# Actualizar todo
pnpm update -r
```

## 🤝🏼 Contribución

Proceso para contribuir código al proyecto.

1. Fork del repositorio
2. Crear rama feature: `git checkout -b feat/nueva-funcionalidad`
3. Commit cambios: `git commit -m 'feat: añadir nueva funcionalidad'`
4. Push a la rama: `git push origin feat/nueva-funcionalidad`
5. Crear Pull Request

## 📜 Licencia

Términos legales bajo los que se distribuye este proyecto.

Este proyecto está bajo la Licencia GNU AGPL-3.0. Ver archivo `LICENSE` para más detalles.

## Financiación

<p align="center">
  <img src="assets/funding/mtdfp.webp" alt="Gobierno de España. Ministerio para la Transformación Digital y de la Función Pública" height="40" />
  &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
  <img src="assets/funding/prtr.png" alt="Plan de Recuperación, Transformación y Resiliencia" height="40" />
  &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;
  <img src="assets/funding/ue-nextgeneration.png" alt="Financiado por la Unión Europea – NextGenerationEU" height="40" />
</p>

Este repositorio forma parte del proyecto «Plataforma dataspace.es» (expediente TSI-100130-2024-31), financiado por la Secretaría de Estado de Digitalización e Inteligencia Artificial del Ministerio para la Transformación Digital y de la Función Pública, en el marco del Programa de Productos y Servicios Tecnológicos para Espacios de Datos, y **financiado por la Unión Europea – NextGenerationEU** a través del Plan de Recuperación, Transformación y Resiliencia.

> Financiado por la Unión Europea – NextGenerationEU. Sin embargo, los puntos de vista y las opiniones expresadas son únicamente los del autor o autores y no reflejan necesariamente los de la Unión Europea o la Comisión Europea. Ni la Unión Europea ni la Comisión Europea pueden ser consideradas responsables de las mismas.

## 🫆 Autor

**GrayHats S.L.U.**

---

<div align="center">
  <p><em>DataSpace - Construyendo el futuro de los espacios de datos en España y Europa</em></p>
</div>
