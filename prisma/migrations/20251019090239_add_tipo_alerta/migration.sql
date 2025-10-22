/*
  Warnings:

  - You are about to drop the column `tipo` on the `alertas_motorista` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "alertas_motorista" DROP COLUMN "tipo",
ADD COLUMN     "tipo_alerta" VARCHAR(50);
