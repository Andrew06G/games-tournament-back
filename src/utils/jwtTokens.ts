import jwt, { type SignOptions } from "jsonwebtoken";

export type AccessTokenPayload = {
  sub: string;
  email: string;
  globalRoles: string[];
  typ?: undefined;
};

export type RefreshTokenPayload = {
  sub: string;
  typ: "refresh";
};

function requireEnv(name: string): string {
  const v = process.env[name];
  if (!v) {
    throw new Error(`Variable de entorno requerida: ${name}`);
  }
  return v;
}

export function signAccessToken(payload: Omit<AccessTokenPayload, "typ">): string {
  const secret = requireEnv("JWT_SECRET");
  return jwt.sign(
    {
      sub: payload.sub,
      email: payload.email,
      globalRoles: payload.globalRoles,
    },
    secret,
    { expiresIn: process.env.JWT_EXPIRES_IN ?? "1h" } as SignOptions,
  );
}

export function signRefreshToken(userId: number): string {
  const secret = requireEnv("JWT_REFRESH_SECRET");
  const body: RefreshTokenPayload = { sub: String(userId), typ: "refresh" };
  return jwt.sign(body, secret, {
    expiresIn: process.env.JWT_REFRESH_EXPIRES_IN ?? "7d",
  } as SignOptions);
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  const secret = requireEnv("JWT_SECRET");
  const decoded = jwt.verify(token, secret);
  if (typeof decoded === "string" || decoded === null) {
    throw new Error("Token inválido");
  }
  const obj = decoded as jwt.JwtPayload & {
    email?: unknown;
    globalRoles?: unknown;
  };
  const sub = obj.sub;
  const email = obj.email;
  const globalRoles = obj.globalRoles;
  if (
    typeof sub !== "string" ||
    typeof email !== "string" ||
    !Array.isArray(globalRoles) ||
    !globalRoles.every((r) => typeof r === "string")
  ) {
    throw new Error("Payload de access token inválido");
  }
  return { sub, email, globalRoles };
}

export function verifyRefreshToken(token: string): RefreshTokenPayload {
  const secret = requireEnv("JWT_REFRESH_SECRET");
  const decoded = jwt.verify(token, secret);
  if (typeof decoded === "string" || decoded === null) {
    throw new Error("Refresh token inválido");
  }
  const obj = decoded as jwt.JwtPayload & { typ?: unknown; sub?: unknown };
  if (obj.typ !== "refresh" || typeof obj.sub !== "string") {
    throw new Error("Refresh token mal formado");
  }
  return { sub: obj.sub, typ: "refresh" };
}
