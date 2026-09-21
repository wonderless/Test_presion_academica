"use client";
// src/contexts/AuthContext.tsx
import { createContext, useContext, useEffect, useRef, useState } from "react";
import {
  sendPasswordResetEmail,
  onIdTokenChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
} from "firebase/auth";
import { FirebaseError } from "firebase/app";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { auth, db } from "@/lib/firebase/config";
import { UserInfo } from "@/types/userInfo";

interface AuthContextType {
  user: UserInfo | null;
  loading: boolean;
  signIn: (
    email: string,
    password: string,
    allowedRoles?: UserInfo["role"][]
  ) => Promise<UserInfo>;
  signOut: () => Promise<void>;
  registerUser: (
    email: string,
    password: string,
    invitationCode: string,
    personalInfo: UserInfo["personalInfo"]
  ) => Promise<UserInfo>;
  resetPassword: (email: string) => Promise<void>;
}

// Rechazo esperado cuando alguien entra por el formulario que no le toca.
// No es un fallo: los formularios lo traducen a un mensaje para el usuario.
export const ROLE_NOT_ALLOWED = "ROLE_NOT_ALLOWED";

const AuthContext = createContext<AuthContextType | null>(null);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth debe ser usado dentro de un AuthProvider");
  }
  return context;
};

// Única fuente de verdad para resolver el rol de un usuario autenticado.
// Las tres lecturas van en paralelo: antes eran secuenciales y alargaban
// la ventana en la que `user` seguía siendo null tras el login.
const resolveUserData = async (uid: string): Promise<UserInfo | null> => {
  const [superadminDoc, adminDoc, userDoc] = await Promise.all([
    getDoc(doc(db, "superadmins", uid)),
    getDoc(doc(db, "admins", uid)),
    getDoc(doc(db, "users", uid)),
  ]);

  if (superadminDoc.exists()) {
    return {
      ...(superadminDoc.data() as UserInfo),
      uid,
      role: "superadmin",
    };
  }
  if (adminDoc.exists()) {
    return {
      ...(adminDoc.data() as UserInfo),
      uid,
      role: "admin",
    };
  }
  if (userDoc.exists()) {
    return {
      ...(userDoc.data() as UserInfo),
      uid,
      role: "user",
    };
  }
  return null;
};

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<UserInfo | null>(null);
  const [loading, setLoading] = useState(true);
  // Último token que ya se escribió como cookie, para no repetir el POST.
  const syncedToken = useRef<string | null>(null);
  // Crear la cuenta dispara onIdTokenChanged cuando el documento de Firestore
  // todavía no existe. Sin esta marca, ese disparo puede resolver "sin
  // documento" y publicar null *después* de que registerUser publique el
  // usuario, dejando la sesión vacía.
  const registrationInProgress = useRef(false);
  // Iniciar sesión también dispara onIdTokenChanged, y ese disparo publicaría
  // al usuario sin pasar por la validación de rol: un admin entrando por el
  // formulario de estudiante llegaba a navegar a su dashboard antes de que
  // signIn alcanzara a cerrarle la sesión. Mientras esta marca esté puesta,
  // es signIn quien decide si se publica.
  const signInInProgress = useRef(false);

  // El ID token vive 1 hora y el middleware lo verifica: hay que reescribir la
  // cookie cada vez que Firebase lo renueva, o la sesión del servidor se queda
  // atrás respecto a la del cliente.
  const syncSessionCookie = async (token: string) => {
    if (syncedToken.current === token) return;

    const response = await fetch("/api/auth/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
    });

    if (!response.ok) {
      throw new Error("Error al establecer la sesión");
    }

    syncedToken.current = token;
  };

  useEffect(() => {
    // onIdTokenChanged además de login/logout dispara al refrescar el token
    // en segundo plano, así que la sesión no se queda desincronizada.
    const unsubscribe = onIdTokenChanged(auth, async (firebaseUser) => {
      try {
        if (!firebaseUser) {
          syncedToken.current = null;
          if (!signInInProgress.current) setUser(null);
          return;
        }

        // Login en curso: es signIn quien publicará el usuario, si el rol pasa.
        if (signInInProgress.current) return;

        // Refrescar la cookie antes de resolver el rol: si el token venía
        // renovado, el middleware debe verlo en la siguiente navegación.
        await syncSessionCookie(await firebaseUser.getIdToken());

        const userData = await resolveUserData(firebaseUser.uid);

        if (!userData) {
          // Registro en curso: es registerUser quien publicará el usuario.
          if (registrationInProgress.current) return;

          console.error(
            "Usuario autenticado pero sin documento en ninguna colección"
          );
        }
        setUser(userData);
      } catch (error) {
        console.error("Error al cargar datos del usuario:", error);
        setUser(null);
      } finally {
        setLoading(false);
      }
    });

    return unsubscribe;
  }, []);

  const resetPassword = async (email: string) => {
    await sendPasswordResetEmail(auth, email);
  };

  const clearSessionCookie = async () => {
    syncedToken.current = null;
    await fetch("/api/auth/session", { method: "DELETE" });
  };

  // Cierra la sesión recién abierta sin publicar el usuario en el contexto.
  const abortSignIn = async (message: string): Promise<never> => {
    await firebaseSignOut(auth);
    await clearSessionCookie();
    throw new Error(message);
  };

  const signIn = async (
    email: string,
    password: string,
    allowedRoles?: UserInfo["role"][]
  ): Promise<UserInfo> => {
    signInInProgress.current = true;
    try {
      const result = await signInWithEmailAndPassword(auth, email, password);

      // La cookie tiene que existir antes de que Redirect navegue al
      // dashboard, o el middleware rechazaría esa primera navegación.
      await syncSessionCookie(await result.user.getIdToken());

      const userData = await resolveUserData(result.user.uid);

      if (!userData) {
        await abortSignIn("Usuario no encontrado en ninguna colección");
      }

      // El rol se valida antes de publicar el usuario: si se publicara primero,
      // Redirect alcanzaría a navegar al dashboard del rol equivocado mientras
      // el formulario cierra la sesión.
      if (allowedRoles && !allowedRoles.includes(userData!.role)) {
        await abortSignIn(ROLE_NOT_ALLOWED);
      }

      setUser(userData);
      return userData!;
    } catch (error: any) {
      const isInvalidCredential =
        error.code === "auth/user-not-found" ||
        error.code === "auth/wrong-password" ||
        error.code === "auth/invalid-credential";
      // Credenciales malas y rol equivocado son respuestas normales del
      // formulario, no fallos que merezcan ensuciar la consola.
      if (!isInvalidCredential && error.message !== ROLE_NOT_ALLOWED) {
        console.error("Error en el inicio de sesión:", error);
      }
      throw new Error(
        isInvalidCredential ? "Credenciales inválidas" : error.message
      );
    } finally {
      signInInProgress.current = false;
    }
  };

  // Se valida en el servidor: consultarlo desde el navegador obligaba a dejar
  // la colección `admins` legible sin sesión.
  const validateInvitationCode = async (code: string): Promise<string> => {
    const response = await fetch("/api/auth/validate-invitation", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ invitationCode: code }),
    });

    if (response.status === 404) {
      throw new Error("Código de invitación inválido");
    }

    if (!response.ok) {
      throw new Error("Error al validar el código de invitación");
    }

    // Retorna el ID del admin que creó el código
    const { adminId } = await response.json();
    return adminId;
  };

  const registerUser = async (
    email: string,
    password: string,
    invitationCode: string,
    personalInfo: UserInfo["personalInfo"]
  ): Promise<UserInfo> => {
    registrationInProgress.current = true;
    try {
      // 1. Validar código de invitación
      const adminId = await validateInvitationCode(invitationCode);
      if (!adminId) {
        throw new Error("Código de invitación inválido");
      }

      // 2. Crear usuario en Firebase Auth
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        email,
        password
      );
      const uid = userCredential.user.uid;

      // 3. Crear documento en Firestore
      const userData: UserInfo = {
        uid,
        email,
        role: "user",
        invitationCode,
        adminId,
        personalInfo,
      };

      // Si el documento no llega a escribirse, la cuenta recién creada se
      // deshace. Sin esto quedaba alguien capaz de autenticarse pero sin
      // documento en ninguna colección: `resolveUserData` devuelve null y
      // `signIn` corta con "Usuario no encontrado en ninguna colección", así
      // que no podía entrar; y tampoco podía volver a registrarse, porque el
      // correo ya figuraba ocupado en Authentication. `delete()` funciona aquí
      // porque Firebase lo permite sobre una sesión recién abierta, que es
      // justo lo que acaba de pasar.
      try {
        await setDoc(doc(db, "users", uid), userData);
      } catch (errorAlGuardar) {
        // `onIdTokenChanged` se disparó al crear la cuenta y ya escribió la
        // cookie de sesión, así que hay que retirarla también.
        await userCredential.user.delete().catch((errorAlDeshacer) => {
          console.error(
            "No se pudo deshacer la cuenta tras fallar el registro:",
            errorAlDeshacer
          );
        });
        await clearSessionCookie();
        console.error("Error al crear el documento del participante:", errorAlGuardar);
        throw new Error(
          "No se pudo completar el registro. Vuelva a intentarlo con los mismos datos."
        );
      }

      // 4. Establecer la cookie de sesión antes de navegar al dashboard.
      await syncSessionCookie(await userCredential.user.getIdToken());

      // 5. Publicar el usuario ya resuelto. onIdTokenChanged se disparó al
      // crear la cuenta, cuando el documento de Firestore todavía no existía,
      // así que sin esto el contexto se quedaría con user = null.
      setUser(userData);
      return userData;
    } catch (error: unknown) {
      // Si es un error de correo duplicado, lanzamos mensaje amigable y no logueamos el stack
      if (
        error instanceof FirebaseError &&
        error.code === "auth/email-already-in-use"
      ) {
        console.warn("Registro duplicado detectado:", error.code);
        throw new Error("Ya existe un usuario con ese correo electrónico.");
      }
      // Para otros errores, mostrar en consola
      console.error("Error en el registro:", error);
      if (error instanceof FirebaseError) {
        throw new Error(error.message);
      }
      throw new Error("Error al registrar usuario");
    } finally {
      registrationInProgress.current = false;
    }
  };

  const signOut = async () => {
    await firebaseSignOut(auth);
    await clearSessionCookie();
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{ user, loading, signIn, signOut, registerUser, resetPassword }}
    >
      {children}
    </AuthContext.Provider>
  );
};
