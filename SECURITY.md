# Seguridad

## Registro de vulnerabilidades

### VUL-E5-001: dependencia `next` (aplicación web del marketplace)

| Campo                 | Valor                                                                                   |
| --------------------- | --------------------------------------------------------------------------------------- |
| Fecha                 | 20/05/2026                                                                              |
| Componente            | Aplicación web del marketplace (`apps/web`)                                             |
| Dependencia           | `next`                                                                                  |
| Versión afectada      | 16.1.6                                                                                  |
| Versión corregida     | 16.3.8                                                                                  |
| Detección             | `pnpm audit`                                                                            |
| Severidad             | Alta                                                                                    |
| CVSS máximo del grupo | 8.6 (`CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:C/C:H/I:N/A:N`)                                    |
| CWE                   | CWE-918, CWE-288, CWE-863, CWE-770, CWE-79, CWE-436, CWE-444, CWE-400, CWE-349, CWE-328 |
| Estado                | Corregido                                                                               |
| Incidencia asociada   | INC-E5-001                                                                              |

#### Avisos incluidos

Avisos publicados en GitHub Advisories hasta el 11/05/2026, que afectan a `next` 16.x.

| Corregido en | Severidad           | Avisos                                                                                                                                                                                                                                                     |
| ------------ | ------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 16.1.7       | Media / Baja        | GHSA-ggv3-7p47-pfv8, GHSA-3x4c-7xq6-9pq8, GHSA-h27x-g6w4-24gq, GHSA-mq59-m269-xvcx, GHSA-jcc7-9wpm-mj36                                                                                                                                                    |
| 16.2.3       | Alta                | GHSA-q4gf-8mx6-v5v3                                                                                                                                                                                                                                        |
| 16.2.5       | Alta / Media / Baja | GHSA-8h8q-6873-q5fj, GHSA-mg66-mrh9-m8jx, GHSA-c4j6-fc7j-m34r, GHSA-492v-c6pp-mqqv, GHSA-267c-6grr-h53f, GHSA-36qx-fr4f-26g5, GHSA-ffhc-5mcf-pf4q, GHSA-gx5p-jg67-6x7h, GHSA-h64f-5h5j-jqjh, GHSA-wfc6-r584-vfw7, GHSA-3g8h-86w9-wvmq, GHSA-vfv6-92ff-j949 |
| 16.2.6       | Alta                | GHSA-26hh-7cqf-hhc6                                                                                                                                                                                                                                        |

#### Acción correctiva

- Actualización de `next` de 16.1.6 a 16.3.8 en `apps/web/package.json`.
- La versión 16.3.8 supera el parche de todos los avisos anteriores.

#### Verificación

- `pnpm audit` sobre dependencias de producción tras la actualización: sin vulnerabilidades conocidas.
- Evidencia: EV-E5-005-A (salida de producción) y EV-E5-005-B.
