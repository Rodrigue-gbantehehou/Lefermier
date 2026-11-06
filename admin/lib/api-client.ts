/**
 * Client API unifié et modulaire pour Poulvia Admin
 * Découpage par domaine métier situé dans @/lib/api/
 */
export * from "./api/index";
export { adminApi, api } from "./api/index";
export { adminApi as default } from "./api/index";
