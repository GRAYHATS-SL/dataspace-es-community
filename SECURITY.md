# Política de seguridad

## Reportar una vulnerabilidad

**No abras un issue público.** Usa el reporte privado de GitHub: pestaña **Security → Report a vulnerability** de este repositorio.

Incluye, si puedes: descripción, pasos para reproducir, impacto estimado y versión/commit afectado.

Nos comprometemos a acusar recibo en un plazo razonable, mantenerte informado y coordinar la divulgación una vez publicado el arreglo.

## Alcance

Este repositorio es una plantilla: las vulnerabilidades en servicios que despliegues con ella (credenciales, configuración, infraestructura) son responsabilidad de quien los opera. Sí nos interesan los fallos en el código de `apps/web` y `apps/reviews-api` (autenticación OIDC, sesión, proxy interno, etc.).

## Versiones soportadas

Solo la última versión de `main`.
