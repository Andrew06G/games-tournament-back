-- CreateTable
CREATE TABLE "USUARIO" (
    "id_usuario" SERIAL NOT NULL,
    "nombre" VARCHAR(100) NOT NULL,
    "email" VARCHAR(150) NOT NULL,
    "contrasena" VARCHAR(255) NOT NULL,
    "telefono" VARCHAR(20),
    "fecha_registro" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "ultimo_acceso" TIMESTAMP(3),
    "estado" VARCHAR(20) DEFAULT 'activo',

    CONSTRAINT "USUARIO_pkey" PRIMARY KEY ("id_usuario")
);

-- CreateTable
CREATE TABLE "ROL" (
    "id_rol" SERIAL NOT NULL,
    "nombre_rol" VARCHAR(50) NOT NULL,
    "descripcion" TEXT,
    "permisos" JSONB,

    CONSTRAINT "ROL_pkey" PRIMARY KEY ("id_rol")
);

-- CreateTable
CREATE TABLE "USUARIO_ROL" (
    "id_usuario_rol" SERIAL NOT NULL,
    "id_usuario" INTEGER NOT NULL,
    "id_rol" INTEGER NOT NULL,
    "id_torneo" INTEGER,
    "fecha_asignacion" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "USUARIO_ROL_pkey" PRIMARY KEY ("id_usuario_rol")
);

-- CreateTable
CREATE TABLE "TIPO_VIDEOJUEGO" (
    "id_tipo" SERIAL NOT NULL,
    "nombre" VARCHAR(50) NOT NULL,
    "descripcion" TEXT,
    "num_jugadores_minimo" INTEGER NOT NULL,
    "num_jugadores_maximo" INTEGER NOT NULL,
    "estado" VARCHAR(20) DEFAULT 'activo',

    CONSTRAINT "TIPO_VIDEOJUEGO_pkey" PRIMARY KEY ("id_tipo")
);

-- CreateTable
CREATE TABLE "FORMATO_TORNEO" (
    "id_formato" SERIAL NOT NULL,
    "nombre" VARCHAR(50) NOT NULL,
    "descripcion" TEXT,
    "requiere_fase_grupos" BOOLEAN DEFAULT false,
    "estado" VARCHAR(20) DEFAULT 'activo',

    CONSTRAINT "FORMATO_TORNEO_pkey" PRIMARY KEY ("id_formato")
);

-- CreateTable
CREATE TABLE "TORNEO" (
    "id_torneo" SERIAL NOT NULL,
    "nombre" VARCHAR(200) NOT NULL,
    "descripcion" TEXT,
    "id_tipo_videojuego" INTEGER NOT NULL,
    "id_formato" INTEGER NOT NULL,
    "id_organizador" INTEGER NOT NULL,
    "fecha_inicio" DATE NOT NULL,
    "fecha_fin" DATE,
    "num_max_participantes" INTEGER NOT NULL,
    "num_inscritos" INTEGER DEFAULT 0,
    "premio_descripcion" TEXT,
    "reglas" TEXT,
    "estado" VARCHAR(30) DEFAULT 'inscripciones_abiertas',
    "fecha_creacion" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "fecha_actualizacion" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TORNEO_pkey" PRIMARY KEY ("id_torneo")
);

-- CreateTable
CREATE TABLE "EQUIPO" (
    "id_equipo" SERIAL NOT NULL,
    "id_torneo" INTEGER NOT NULL,
    "nombre_equipo" VARCHAR(100) NOT NULL,
    "logo_url" VARCHAR(255),
    "fecha_inscripcion" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "estado_equipo" VARCHAR(20) DEFAULT 'activo',

    CONSTRAINT "EQUIPO_pkey" PRIMARY KEY ("id_equipo")
);

-- CreateTable
CREATE TABLE "JUGADOR" (
    "id_jugador" SERIAL NOT NULL,
    "id_usuario" INTEGER NOT NULL,
    "id_equipo" INTEGER NOT NULL,
    "id_torneo" INTEGER NOT NULL,
    "nickname" VARCHAR(50) NOT NULL,
    "es_capitan" BOOLEAN DEFAULT false,
    "contacto_preferido" VARCHAR(100),
    "estado_jugador" VARCHAR(20) DEFAULT 'activo',
    "fecha_inscripcion" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "JUGADOR_pkey" PRIMARY KEY ("id_jugador")
);

-- CreateTable
CREATE TABLE "ENFRENTAMIENTO" (
    "id_enfrentamiento" SERIAL NOT NULL,
    "id_torneo" INTEGER NOT NULL,
    "fase" VARCHAR(50) NOT NULL,
    "numero_ronda" INTEGER,
    "id_equipo_1" INTEGER,
    "id_equipo_2" INTEGER,
    "fecha_programada" TIMESTAMP(3),
    "fecha_jugada" TIMESTAMP(3),
    "ubicacion" VARCHAR(100),
    "estado" VARCHAR(30) DEFAULT 'pendiente',
    "id_enfrentamiento_siguiente" INTEGER,
    "posicion_bracket" VARCHAR(20),

    CONSTRAINT "ENFRENTAMIENTO_pkey" PRIMARY KEY ("id_enfrentamiento")
);

-- CreateTable
CREATE TABLE "RESULTADO" (
    "id_resultado" SERIAL NOT NULL,
    "id_enfrentamiento" INTEGER NOT NULL,
    "puntos_equipo_1" INTEGER,
    "puntos_equipo_2" INTEGER,
    "id_equipo_ganador" INTEGER,
    "id_usuario_registro" INTEGER NOT NULL,
    "fecha_registro" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "validado" BOOLEAN DEFAULT false,
    "id_usuario_valida" INTEGER,
    "fecha_validacion" TIMESTAMP(3),
    "comentarios" TEXT,
    "evidencia_url" VARCHAR(255),

    CONSTRAINT "RESULTADO_pkey" PRIMARY KEY ("id_resultado")
);

-- CreateTable
CREATE TABLE "BRACKET" (
    "id_bracket" SERIAL NOT NULL,
    "id_torneo" INTEGER NOT NULL,
    "estructura_json" JSONB NOT NULL,
    "fecha_generacion" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "fecha_actualizacion" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BRACKET_pkey" PRIMARY KEY ("id_bracket")
);

-- CreateTable
CREATE TABLE "NOTIFICACION" (
    "id_notificacion" SERIAL NOT NULL,
    "id_usuario_destino" INTEGER NOT NULL,
    "tipo_notificacion" VARCHAR(50) NOT NULL,
    "titulo" VARCHAR(150) NOT NULL,
    "mensaje" TEXT NOT NULL,
    "id_torneo" INTEGER,
    "id_enfrentamiento" INTEGER,
    "fecha_envio" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "leida" BOOLEAN DEFAULT false,
    "fecha_lectura" TIMESTAMP(3),
    "canal" VARCHAR(20) DEFAULT 'app',

    CONSTRAINT "NOTIFICACION_pkey" PRIMARY KEY ("id_notificacion")
);

-- CreateTable
CREATE TABLE "PREFERENCIA_NOTIFICACION" (
    "id_preferencia" SERIAL NOT NULL,
    "id_usuario" INTEGER NOT NULL,
    "notif_nuevo_enfrentamiento" BOOLEAN DEFAULT true,
    "notif_resultado_validado" BOOLEAN DEFAULT true,
    "notif_cambio_fase" BOOLEAN DEFAULT true,
    "notif_recordatorio" BOOLEAN DEFAULT true,
    "canal_preferido" VARCHAR(20) DEFAULT 'app',

    CONSTRAINT "PREFERENCIA_NOTIFICACION_pkey" PRIMARY KEY ("id_preferencia")
);

-- CreateTable
CREATE TABLE "HISTORIAL_CAMBIOS" (
    "id_cambio" SERIAL NOT NULL,
    "tabla_afectada" VARCHAR(50) NOT NULL,
    "id_registro" INTEGER NOT NULL,
    "campo_modificado" VARCHAR(50) NOT NULL,
    "valor_anterior" TEXT,
    "valor_nuevo" TEXT,
    "tipo_operacion" VARCHAR(20) NOT NULL,
    "id_usuario_modifica" INTEGER,
    "fecha_modificacion" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,
    "razon_cambio" VARCHAR(255),

    CONSTRAINT "HISTORIAL_CAMBIOS_pkey" PRIMARY KEY ("id_cambio")
);

-- CreateTable
CREATE TABLE "ESTADISTICA_JUGADOR" (
    "id_estadistica" SERIAL NOT NULL,
    "id_jugador" INTEGER NOT NULL,
    "id_torneo" INTEGER NOT NULL,
    "partidas_jugadas" INTEGER DEFAULT 0,
    "partidas_ganadas" INTEGER DEFAULT 0,
    "partidas_perdidas" INTEGER DEFAULT 0,
    "puntos_totales" INTEGER DEFAULT 0,
    "posicion_final" INTEGER,

    CONSTRAINT "ESTADISTICA_JUGADOR_pkey" PRIMARY KEY ("id_estadistica")
);

-- CreateTable
CREATE TABLE "ESTADISTICA_EQUIPO" (
    "id_estadistica" SERIAL NOT NULL,
    "id_equipo" INTEGER NOT NULL,
    "id_torneo" INTEGER NOT NULL,
    "partidas_jugadas" INTEGER DEFAULT 0,
    "partidas_ganadas" INTEGER DEFAULT 0,
    "partidas_perdidas" INTEGER DEFAULT 0,
    "puntos_favor" INTEGER DEFAULT 0,
    "puntos_contra" INTEGER DEFAULT 0,
    "diferencia_puntos" INTEGER DEFAULT 0,
    "posicion_final" INTEGER,

    CONSTRAINT "ESTADISTICA_EQUIPO_pkey" PRIMARY KEY ("id_estadistica")
);

-- CreateTable
CREATE TABLE "CONFIGURACION_SISTEMA" (
    "id_config" SERIAL NOT NULL,
    "clave" VARCHAR(100) NOT NULL,
    "valor" TEXT NOT NULL,
    "tipo_dato" VARCHAR(20),
    "descripcion" TEXT,
    "fecha_modificacion" TIMESTAMP(3) DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CONFIGURACION_SISTEMA_pkey" PRIMARY KEY ("id_config")
);

-- CreateIndex
CREATE UNIQUE INDEX "USUARIO_email_key" ON "USUARIO"("email");

-- CreateIndex
CREATE INDEX "idx_email" ON "USUARIO"("email");

-- CreateIndex
CREATE UNIQUE INDEX "ROL_nombre_rol_key" ON "ROL"("nombre_rol");

-- CreateIndex
CREATE UNIQUE INDEX "unique_usuario_rol_torneo" ON "USUARIO_ROL"("id_usuario", "id_rol", "id_torneo");

-- CreateIndex
CREATE UNIQUE INDEX "TIPO_VIDEOJUEGO_nombre_key" ON "TIPO_VIDEOJUEGO"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "FORMATO_TORNEO_nombre_key" ON "FORMATO_TORNEO"("nombre");

-- CreateIndex
CREATE INDEX "idx_organizador" ON "TORNEO"("id_organizador");

-- CreateIndex
CREATE INDEX "idx_torneo_estado" ON "TORNEO"("estado");

-- CreateIndex
CREATE INDEX "idx_fecha_inicio" ON "TORNEO"("fecha_inicio");

-- CreateIndex
CREATE INDEX "idx_equipo_torneo" ON "EQUIPO"("id_torneo");

-- CreateIndex
CREATE UNIQUE INDEX "unique_nombre_por_torneo" ON "EQUIPO"("id_torneo", "nombre_equipo");

-- CreateIndex
CREATE INDEX "idx_usuario" ON "JUGADOR"("id_usuario");

-- CreateIndex
CREATE INDEX "idx_jugador_equipo" ON "JUGADOR"("id_equipo");

-- CreateIndex
CREATE UNIQUE INDEX "unique_nickname_por_torneo" ON "JUGADOR"("id_torneo", "nickname");

-- CreateIndex
CREATE INDEX "idx_enfrentamiento_torneo" ON "ENFRENTAMIENTO"("id_torneo");

-- CreateIndex
CREATE INDEX "idx_enfrentamiento_estado" ON "ENFRENTAMIENTO"("estado");

-- CreateIndex
CREATE INDEX "idx_fecha_programada" ON "ENFRENTAMIENTO"("fecha_programada");

-- CreateIndex
CREATE UNIQUE INDEX "RESULTADO_id_enfrentamiento_key" ON "RESULTADO"("id_enfrentamiento");

-- CreateIndex
CREATE INDEX "idx_enfrentamiento" ON "RESULTADO"("id_enfrentamiento");

-- CreateIndex
CREATE INDEX "idx_validado" ON "RESULTADO"("validado");

-- CreateIndex
CREATE UNIQUE INDEX "unique_torneo" ON "BRACKET"("id_torneo");

-- CreateIndex
CREATE INDEX "idx_usuario_destino" ON "NOTIFICACION"("id_usuario_destino");

-- CreateIndex
CREATE INDEX "idx_leida" ON "NOTIFICACION"("leida");

-- CreateIndex
CREATE INDEX "idx_fecha_envio" ON "NOTIFICACION"("fecha_envio");

-- CreateIndex
CREATE UNIQUE INDEX "unique_usuario" ON "PREFERENCIA_NOTIFICACION"("id_usuario");

-- CreateIndex
CREATE INDEX "idx_tabla_registro" ON "HISTORIAL_CAMBIOS"("tabla_afectada", "id_registro");

-- CreateIndex
CREATE INDEX "idx_fecha" ON "HISTORIAL_CAMBIOS"("fecha_modificacion");

-- CreateIndex
CREATE INDEX "idx_jugador" ON "ESTADISTICA_JUGADOR"("id_jugador");

-- CreateIndex
CREATE INDEX "idx_estadistica_jugador_torneo" ON "ESTADISTICA_JUGADOR"("id_torneo");

-- CreateIndex
CREATE UNIQUE INDEX "unique_jugador_torneo" ON "ESTADISTICA_JUGADOR"("id_jugador", "id_torneo");

-- CreateIndex
CREATE INDEX "idx_estadistica_equipo_equipo" ON "ESTADISTICA_EQUIPO"("id_equipo");

-- CreateIndex
CREATE INDEX "idx_estadistica_equipo_torneo" ON "ESTADISTICA_EQUIPO"("id_torneo");

-- CreateIndex
CREATE UNIQUE INDEX "unique_equipo_torneo" ON "ESTADISTICA_EQUIPO"("id_equipo", "id_torneo");

-- CreateIndex
CREATE UNIQUE INDEX "CONFIGURACION_SISTEMA_clave_key" ON "CONFIGURACION_SISTEMA"("clave");

-- AddForeignKey
ALTER TABLE "USUARIO_ROL" ADD CONSTRAINT "USUARIO_ROL_id_usuario_fkey" FOREIGN KEY ("id_usuario") REFERENCES "USUARIO"("id_usuario") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "USUARIO_ROL" ADD CONSTRAINT "USUARIO_ROL_id_rol_fkey" FOREIGN KEY ("id_rol") REFERENCES "ROL"("id_rol") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "TORNEO" ADD CONSTRAINT "TORNEO_id_tipo_videojuego_fkey" FOREIGN KEY ("id_tipo_videojuego") REFERENCES "TIPO_VIDEOJUEGO"("id_tipo") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "TORNEO" ADD CONSTRAINT "TORNEO_id_formato_fkey" FOREIGN KEY ("id_formato") REFERENCES "FORMATO_TORNEO"("id_formato") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "TORNEO" ADD CONSTRAINT "TORNEO_id_organizador_fkey" FOREIGN KEY ("id_organizador") REFERENCES "USUARIO"("id_usuario") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "EQUIPO" ADD CONSTRAINT "EQUIPO_id_torneo_fkey" FOREIGN KEY ("id_torneo") REFERENCES "TORNEO"("id_torneo") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "JUGADOR" ADD CONSTRAINT "JUGADOR_id_usuario_fkey" FOREIGN KEY ("id_usuario") REFERENCES "USUARIO"("id_usuario") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "JUGADOR" ADD CONSTRAINT "JUGADOR_id_equipo_fkey" FOREIGN KEY ("id_equipo") REFERENCES "EQUIPO"("id_equipo") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "JUGADOR" ADD CONSTRAINT "JUGADOR_id_torneo_fkey" FOREIGN KEY ("id_torneo") REFERENCES "TORNEO"("id_torneo") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "ENFRENTAMIENTO" ADD CONSTRAINT "ENFRENTAMIENTO_id_torneo_fkey" FOREIGN KEY ("id_torneo") REFERENCES "TORNEO"("id_torneo") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "ENFRENTAMIENTO" ADD CONSTRAINT "ENFRENTAMIENTO_id_equipo_1_fkey" FOREIGN KEY ("id_equipo_1") REFERENCES "EQUIPO"("id_equipo") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "ENFRENTAMIENTO" ADD CONSTRAINT "ENFRENTAMIENTO_id_equipo_2_fkey" FOREIGN KEY ("id_equipo_2") REFERENCES "EQUIPO"("id_equipo") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "ENFRENTAMIENTO" ADD CONSTRAINT "ENFRENTAMIENTO_id_enfrentamiento_siguiente_fkey" FOREIGN KEY ("id_enfrentamiento_siguiente") REFERENCES "ENFRENTAMIENTO"("id_enfrentamiento") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "RESULTADO" ADD CONSTRAINT "RESULTADO_id_enfrentamiento_fkey" FOREIGN KEY ("id_enfrentamiento") REFERENCES "ENFRENTAMIENTO"("id_enfrentamiento") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "RESULTADO" ADD CONSTRAINT "RESULTADO_id_equipo_ganador_fkey" FOREIGN KEY ("id_equipo_ganador") REFERENCES "EQUIPO"("id_equipo") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "RESULTADO" ADD CONSTRAINT "RESULTADO_id_usuario_registro_fkey" FOREIGN KEY ("id_usuario_registro") REFERENCES "USUARIO"("id_usuario") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "RESULTADO" ADD CONSTRAINT "RESULTADO_id_usuario_valida_fkey" FOREIGN KEY ("id_usuario_valida") REFERENCES "USUARIO"("id_usuario") ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "BRACKET" ADD CONSTRAINT "BRACKET_id_torneo_fkey" FOREIGN KEY ("id_torneo") REFERENCES "TORNEO"("id_torneo") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "NOTIFICACION" ADD CONSTRAINT "NOTIFICACION_id_usuario_destino_fkey" FOREIGN KEY ("id_usuario_destino") REFERENCES "USUARIO"("id_usuario") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "NOTIFICACION" ADD CONSTRAINT "NOTIFICACION_id_torneo_fkey" FOREIGN KEY ("id_torneo") REFERENCES "TORNEO"("id_torneo") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "NOTIFICACION" ADD CONSTRAINT "NOTIFICACION_id_enfrentamiento_fkey" FOREIGN KEY ("id_enfrentamiento") REFERENCES "ENFRENTAMIENTO"("id_enfrentamiento") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "PREFERENCIA_NOTIFICACION" ADD CONSTRAINT "PREFERENCIA_NOTIFICACION_id_usuario_fkey" FOREIGN KEY ("id_usuario") REFERENCES "USUARIO"("id_usuario") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "HISTORIAL_CAMBIOS" ADD CONSTRAINT "HISTORIAL_CAMBIOS_id_usuario_modifica_fkey" FOREIGN KEY ("id_usuario_modifica") REFERENCES "USUARIO"("id_usuario") ON DELETE SET NULL ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "ESTADISTICA_JUGADOR" ADD CONSTRAINT "ESTADISTICA_JUGADOR_id_jugador_fkey" FOREIGN KEY ("id_jugador") REFERENCES "JUGADOR"("id_jugador") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "ESTADISTICA_JUGADOR" ADD CONSTRAINT "ESTADISTICA_JUGADOR_id_torneo_fkey" FOREIGN KEY ("id_torneo") REFERENCES "TORNEO"("id_torneo") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "ESTADISTICA_EQUIPO" ADD CONSTRAINT "ESTADISTICA_EQUIPO_id_equipo_fkey" FOREIGN KEY ("id_equipo") REFERENCES "EQUIPO"("id_equipo") ON DELETE CASCADE ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE "ESTADISTICA_EQUIPO" ADD CONSTRAINT "ESTADISTICA_EQUIPO_id_torneo_fkey" FOREIGN KEY ("id_torneo") REFERENCES "TORNEO"("id_torneo") ON DELETE CASCADE ON UPDATE NO ACTION;
