-- Catálogo de fases y bracket estructurado

CREATE TABLE "FASE_TORNEO" (
    "id_fase" SERIAL NOT NULL,
    "codigo" VARCHAR(30) NOT NULL,
    "nombre" VARCHAR(50) NOT NULL,
    "orden" INTEGER NOT NULL,
    "num_equipos" INTEGER NOT NULL,
    "estado" VARCHAR(20) DEFAULT 'activo',

    CONSTRAINT "FASE_TORNEO_pkey" PRIMARY KEY ("id_fase")
);

CREATE UNIQUE INDEX "FASE_TORNEO_codigo_key" ON "FASE_TORNEO"("codigo");

ALTER TABLE "TORNEO" ADD COLUMN "id_fase_inicial" INTEGER;

ALTER TABLE "TORNEO" ADD CONSTRAINT "TORNEO_id_fase_inicial_fkey"
    FOREIGN KEY ("id_fase_inicial") REFERENCES "FASE_TORNEO"("id_fase")
    ON DELETE NO ACTION ON UPDATE NO ACTION;

ALTER TABLE "ENFRENTAMIENTO" ADD COLUMN "id_fase" INTEGER;

ALTER TABLE "ENFRENTAMIENTO" ADD CONSTRAINT "ENFRENTAMIENTO_id_fase_fkey"
    FOREIGN KEY ("id_fase") REFERENCES "FASE_TORNEO"("id_fase")
    ON DELETE SET NULL ON UPDATE NO ACTION;

INSERT INTO "FASE_TORNEO" ("codigo", "nombre", "orden", "num_equipos") VALUES
    ('dieciseisavos', 'Dieciseisavos de final', 1, 32),
    ('octavos', 'Octavos de final', 2, 16),
    ('cuartos', 'Cuartos de final', 3, 8),
    ('semifinal', 'Semifinal', 4, 4),
    ('final', 'Final', 5, 2);
