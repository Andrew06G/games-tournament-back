import bcrypt from "bcrypt";
import { Prisma } from "../../generated/prisma/client";
import { getPrisma } from "../config/database";
import { HttpError } from "../utils/httpError";
import {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
} from "../utils/jwtTokens";
import type { LoginBody, RefreshBody, RegisterBody } from "../validators/auth.validator";

/** Coincide con GET /catalogos/roles-registro: solo estos roles se pueden asignar en el alta. */
const ROLES_PERMITIDOS_REGISTRO = new Set([
  "organizador",
  "jugador",
  "lider_equipo",
]);

const usuarioPublicSelect = {
  idUsuario: true,
  nombre: true,
  nickname: true,
  email: true,
  telefono: true,
  estado: true,
  fechaRegistro: true,
} satisfies Prisma.UsuarioSelect;

export type UsuarioPublic = Prisma.UsuarioGetPayload<{
  select: typeof usuarioPublicSelect;
}> & {
  globalRoles: string[];
  rolesAsignados: { idTorneo: number | null; nombreRol: string }[];
};

function buildGlobalRoles(
  usuarioRoles: { idTorneo: number | null; rol: { nombreRol: string } }[],
): string[] {
  const set = new Set<string>();
  for (const ur of usuarioRoles) {
    if (ur.idTorneo === null) {
      set.add(ur.rol.nombreRol);
    }
  }
  return [...set];
}

function toUsuarioPublic(
  row: Prisma.UsuarioGetPayload<{
    select: typeof usuarioPublicSelect & {
      usuarioRoles: {
        select: {
          idTorneo: true;
          rol: { select: { nombreRol: true } };
        };
      };
    };
  }>,
): UsuarioPublic {
  const globalRoles = buildGlobalRoles(row.usuarioRoles);
  const rolesAsignados = row.usuarioRoles.map((ur) => ({
    idTorneo: ur.idTorneo,
    nombreRol: ur.rol.nombreRol,
  }));
  const { usuarioRoles: _, ...rest } = row;
  return {
    ...rest,
    globalRoles,
    rolesAsignados,
  };
}

async function loadUsuarioConRoles(idUsuario: number) {
  const prisma = getPrisma();
  const usuario = await prisma.usuario.findUnique({
    where: { idUsuario },
    select: {
      ...usuarioPublicSelect,
      usuarioRoles: {
        select: {
          idTorneo: true,
          rol: { select: { nombreRol: true } },
        },
      },
    },
  });
  return usuario;
}

export async function register(
  body: RegisterBody,
): Promise<{ user: UsuarioPublic; accessToken: string; refreshToken: string }> {
  const prisma = getPrisma();
  const email = body.email.trim().toLowerCase();

  const rolElegido = await prisma.rol.findUnique({
    where: { idRol: body.idRol },
  });
  if (!rolElegido) {
    throw new HttpError(400, "El rol seleccionado no existe");
  }
  if (!ROLES_PERMITIDOS_REGISTRO.has(rolElegido.nombreRol)) {
    throw new HttpError(
      400,
      "Ese rol no está disponible para el registro público",
    );
  }

  const hash = await bcrypt.hash(body.contrasena, 10);

  try {
    const usuario = await prisma.usuario.create({
      data: {
        nombre: body.nombre.trim(),
        email,
        contrasena: hash,
        ...(body.telefono !== undefined
          ? { telefono: body.telefono.trim() || null }
          : {}),
        ...(body.nickname !== undefined
          ? {
              nickname:
                body.nickname.trim().length > 0
                  ? body.nickname.trim()
                  : null,
            }
          : {}),
        usuarioRoles: {
          create: {
            idRol: rolElegido.idRol,
            idTorneo: null,
          },
        },
      },
      select: {
        ...usuarioPublicSelect,
        usuarioRoles: {
          select: {
            idTorneo: true,
            rol: { select: { nombreRol: true } },
          },
        },
      },
    });

    const globalRoles = buildGlobalRoles(usuario.usuarioRoles);
    const accessToken = signAccessToken({
      sub: String(usuario.idUsuario),
      email: usuario.email,
      globalRoles,
    });
    const refreshToken = signRefreshToken(usuario.idUsuario);

    return {
      user: toUsuarioPublic(usuario),
      accessToken,
      refreshToken,
    };
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      throw new HttpError(409, "El correo ya está registrado");
    }
    throw e;
  }
}

export async function login(
  body: LoginBody,
): Promise<{ user: UsuarioPublic; accessToken: string; refreshToken: string }> {
  const prisma = getPrisma();
  const email = body.email.trim().toLowerCase();

  const usuario = await prisma.usuario.findUnique({
    where: { email },
    select: {
      idUsuario: true,
      email: true,
      contrasena: true,
      estado: true,
    },
  });

  if (!usuario) {
    throw new HttpError(401, "Credenciales incorrectas");
  }

  if (usuario.estado && usuario.estado !== "activo") {
    throw new HttpError(403, "Cuenta inactiva o suspendida");
  }

  const ok = await bcrypt.compare(body.contrasena, usuario.contrasena);
  if (!ok) {
    throw new HttpError(401, "Credenciales incorrectas");
  }

  await prisma.usuario.update({
    where: { idUsuario: usuario.idUsuario },
    data: { ultimoAcceso: new Date() },
  });

  const row = await prisma.usuario.findUniqueOrThrow({
    where: { idUsuario: usuario.idUsuario },
    select: {
      ...usuarioPublicSelect,
      usuarioRoles: {
        select: {
          idTorneo: true,
          rol: { select: { nombreRol: true } },
        },
      },
    },
  });

  const globalRoles = buildGlobalRoles(row.usuarioRoles);
  const accessToken = signAccessToken({
    sub: String(row.idUsuario),
    email: row.email,
    globalRoles,
  });
  const refreshToken = signRefreshToken(row.idUsuario);

  return {
    user: toUsuarioPublic(row),
    accessToken,
    refreshToken,
  };
}

export async function refreshAccessToken(
  body: RefreshBody,
): Promise<{ accessToken: string }> {
  let payload;
  try {
    payload = verifyRefreshToken(body.refreshToken);
  } catch {
    throw new HttpError(401, "Refresh token inválido o expirado");
  }

  const userId = Number(payload.sub);
  if (!Number.isInteger(userId)) {
    throw new HttpError(401, "Refresh token inválido");
  }

  const row = await loadUsuarioConRoles(userId);
  if (!row) {
    throw new HttpError(401, "Usuario no encontrado");
  }

  if (row.estado && row.estado !== "activo") {
    throw new HttpError(403, "Cuenta inactiva o suspendida");
  }

  const globalRoles = buildGlobalRoles(row.usuarioRoles);
  const accessToken = signAccessToken({
    sub: String(row.idUsuario),
    email: row.email,
    globalRoles,
  });

  return { accessToken };
}

export async function getProfile(userId: number): Promise<UsuarioPublic> {
  const row = await loadUsuarioConRoles(userId);
  if (!row) {
    throw new HttpError(404, "Usuario no encontrado");
  }
  return toUsuarioPublic(row);
}
