-- CHECK constraints from schema_torneos(1).sql (tabla TORNEO)
ALTER TABLE "TORNEO"
ADD CONSTRAINT "chk_num_participantes" CHECK ("num_max_participantes" > 0);

ALTER TABLE "TORNEO"
ADD CONSTRAINT "chk_num_inscritos" CHECK ("num_inscritos" <= "num_max_participantes");
