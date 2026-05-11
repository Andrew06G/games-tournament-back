export type AuthContext = {
  userId: number;
  email: string;
  /** Roles con `USUARIO_ROL.id_torneo` NULL (alcance global). */
  globalRoles: string[];
};
