import React, { useState, useEffect } from "react";
import { collection, getDocs, query, where } from "firebase/firestore";
import { db } from '@/lib/firebase/config';

// Diálogo propio del panel, en lugar de window.confirm y alert. Se cierra con
// Escape y con un clic fuera; el botón de la derecha es el que actúa.
const Dialogo = ({
  titulo,
  children,
  onCerrar,
  textoCerrar = "Cancelar",
  accion,
}: {
  titulo: string;
  children: React.ReactNode;
  onCerrar: () => void;
  textoCerrar?: string;
  accion?: { texto: string; onClick: () => void; peligrosa?: boolean };
}) => {
  useEffect(() => {
    const alPulsar = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCerrar();
    };
    document.addEventListener("keydown", alPulsar);
    return () => document.removeEventListener("keydown", alPulsar);
  }, [onCerrar]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onClick={onCerrar}
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={titulo}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-xl bg-white p-6 shadow-2xl"
      >
        <h3 className="mb-3 text-lg font-bold text-gray-900">{titulo}</h3>
        <div className="mb-6 text-sm text-gray-700">{children}</div>
        <div className="flex justify-end gap-3">
          <button
            onClick={onCerrar}
            className="rounded-lg px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-100"
          >
            {textoCerrar}
          </button>
          {accion && (
            <button
              onClick={accion.onClick}
              autoFocus
              className={`rounded-lg px-4 py-2 text-sm font-medium text-white transition-colors ${
                accion.peligrosa
                  ? "bg-red-600 hover:bg-red-700"
                  : "bg-blue-600 hover:bg-blue-700"
              }`}
            >
              {accion.texto}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

// La contraseña no forma parte del administrador: vive solo en Firebase
// Authentication. Aquí se maneja el formulario de alta, y de ahí no pasa.
interface Admin {
  id: string;
  email: string;
  invitationCode: string;
}

const ListaAdmin: React.FC = () => {
  const [admins, setAdmins] = useState<Admin[]>([]);
  // La contraseña solo existe mientras se rellena el formulario: se envía a
  // /api/createAdmin, que crea la cuenta, y no se guarda en ningún otro sitio.
  const [newAdmin, setNewAdmin] = useState({
    email: "",
    password: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAdmins();
  }, []);

  // Código de 8 caracteres, alfabeto A-Z y 0-9. Se genera con
  // crypto.getRandomValues y no con Math.random: Math.random no es
  // criptográficamente seguro y su salida se puede predecir a partir de
  // observaciones anteriores. El formato no cambia, así que los códigos ya
  // repartidos siguen siendo válidos.
  const generateInvitationCode = (): string => {
    const alfabeto = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
    // 256 no es múltiplo de 36: tomar `byte % 36` sin más haría que los cuatro
    // primeros símbolos salieran con algo más de frecuencia que el resto. Se
    // descartan los bytes por encima del último múltiplo completo.
    const limite = 256 - (256 % alfabeto.length);
    const bytes = new Uint8Array(8);
    let code = "";

    while (code.length < 8) {
      crypto.getRandomValues(bytes);
      for (const byte of bytes) {
        if (byte >= limite) continue;
        code += alfabeto[byte % alfabeto.length];
        if (code.length === 8) break;
      }
    }

    return code;
  };

  // Función para verificar si un código de invitación ya existe
  const isInvitationCodeUnique = async (code: string): Promise<boolean> => {
    const adminCollection = collection(db, "admins");
    const q = query(adminCollection, where("invitationCode", "==", code));
    const querySnapshot = await getDocs(q);
    return querySnapshot.empty;
  };

  // Con 36^8 combinaciones una colisión es rarísima, pero el bucle original no
  // tenía salida: ante cualquier problema que hiciera fallar la comprobación se
  // quedaba consultando Firestore indefinidamente.
  const generateUniqueInvitationCode = async (): Promise<string> => {
    const MAX_INTENTOS = 10;

    for (let intento = 0; intento < MAX_INTENTOS; intento++) {
      const code = generateInvitationCode();
      if (await isInvitationCodeUnique(code)) return code;
    }

    throw new Error(
      "No se pudo generar un código de invitación único. Inténtelo de nuevo."
    );
  };

  const fetchAdmins = async () => {
    try {
      setLoading(true);
      const adminCollection = collection(db, "admins");
      const adminSnapshot = await getDocs(adminCollection);
      const adminList = adminSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })) as Admin[];
      setAdmins(adminList);
    } catch (err) {
      setError("Error al cargar administradores");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddAdmin = async () => {
    if (!newAdmin.email || !newAdmin.password) {
      setError("Por favor complete todos los campos");
      return;
    }
    
    try {
      setLoading(true);
      
      // 1. Generar código de invitación único
      const invitationCode = await generateUniqueInvitationCode();
      
      // 2. La ruta crea la cuenta de Authentication Y el documento de `admins`
      // en la misma operación, y deshace la cuenta si el documento no llega a
      // escribirse. Aquí se hacía lo segundo por separado, después de que la
      // respuesta llegara: si ese `setDoc` fallaba quedaba una cuenta capaz de
      // autenticarse sin documento en ninguna colección, que ni podía entrar ni
      // aparecía en esta tabla para poder borrarla.
      const response = await fetch('/api/createAdmin', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: newAdmin.email,
          password: newAdmin.password,
          invitationCode: invitationCode,
        }),
      });
  
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Error al crear administrador');
      }
  
      const data = await response.json();
      const uid = data.user.uid;

      // 3. Actualizar el estado local
      setAdmins([...admins, { id: uid, email: newAdmin.email, invitationCode }]);
      setNewAdmin({ email: "", password: "" });
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al crear administrador");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };


  // Administrador a la espera de confirmación, y aviso posterior. Antes esto
  // eran window.confirm y alert del navegador: además de desentonar, un alert
  // bloquea el hilo y no permite explicar bien lo que está a punto de pasar.
  const [adminAEliminar, setAdminAEliminar] = useState<Admin | null>(null);
  const [aviso, setAviso] = useState<string | null>(null);

  const handleDeleteAdmin = async (id: string) => {
    setAdminAEliminar(null);

    try {
      setLoading(true);

      // El identificador del documento ES el uid de la cuenta: así lo escribe
      // /api/createAdmin y así lo busca `resolveUserData`, que resuelve el rol
      // leyendo `admins/{uid}`. Es la misma invariante en todo el sistema, y
      // la lista de arriba ya trae ese id (`id: doc.id`).
      //
      // Antes se releía el documento para sacar su campo `uid`, que es una
      // copia del mismo valor: una consulta a Firestore y una rama de error
      // para obtener algo que ya se tenía en la mano.
      const authUID = id;

      // 2. Eliminar a todos los usuarios asociados a este administrador.
      //
      // Si esto falla hay que PARAR. Antes el error solo se registraba en la
      // consola y el código seguía hasta borrar al administrador: sus
      // participantes se quedaban en `users` con el `invitationCode` de alguien
      // que ya no existe y, como los paneles y las reglas de Firestore filtran
      // por el código del administrador con sesión, nadie volvía a verlos ni
      // podía borrarlos desde la aplicación. Encima el aviso final los contaba
      // como cero y anunciaba "no tenía participantes asociados", así que el
      // caso malo se le enseñaba al superadmin igual que el bueno.
      //
      // Abortar es seguro y se puede reintentar: mientras el administrador siga
      // existiendo, sus participantes siguen siendo visibles y la cascada se
      // puede repetir sobre los que hayan quedado.
      const deleteUsersResponse = await fetch(
        `/api/admin/delete-users-by-admin?adminId=${authUID}`,
        { method: "DELETE" }
      );

      // La respuesta de error puede no ser JSON (un 500 devuelve HTML), y
      // entonces `.json()` lanza y esconde el error real.
      const resultadoUsuarios = await deleteUsersResponse
        .json()
        .catch(() => ({} as Record<string, unknown>));

      if (!deleteUsersResponse.ok) {
        throw new Error(
          typeof resultadoUsuarios.error === "string"
            ? resultadoUsuarios.error
            : "No se pudieron eliminar los participantes asociados. El administrador no se ha eliminado."
        );
      }

      // La ruta del servidor es tolerante a fallos parciales por diseño: si un
      // participante falla sigue con los demás y devuelve cuántos borró de
      // cuántos. Un borrado incompleto deja los mismos huérfanos que un fallo
      // entero, así que también se para aquí.
      const usersDeletedCount = Number(resultadoUsuarios.usersDeleted ?? 0);
      // Cuando el administrador no tiene participantes, la ruta responde sin
      // `totalUsers`: son 0 de 0, que es un borrado completo.
      const totalUsuarios = Number(
        resultadoUsuarios.totalUsers ?? usersDeletedCount
      );

      if (usersDeletedCount < totalUsuarios) {
        throw new Error(
          `Solo se pudieron eliminar ${usersDeletedCount} de ${totalUsuarios} participantes. ` +
            "El administrador no se ha eliminado: vuelva a intentarlo para no dejar participantes sin dueño."
        );
      }

      // 3. Eliminar al administrador: cuenta de Authentication y documento
      // `admins/{uid}`, las dos cosas en el servidor.
      //
      // El documento se borraba antes aquí, con un deleteDoc posterior a la
      // llamada. Si fallaba, quedaba un documento sin cuenta que ya no se podía
      // borrar desde el panel, y cuyo código de invitación seguía admitiendo
      // registros. La ruta es idempotente: si algo falla, basta con reintentar.
      const authResponse = await fetch(`/api/admin/delete-admin?uid=${authUID}`, {
        method: "DELETE",
      });

      if (!authResponse.ok) {
        const errorData = await authResponse
          .json()
          .catch(() => ({} as Record<string, unknown>));
        throw new Error(
          typeof errorData.error === "string"
            ? errorData.error
            : "No se pudo eliminar el administrador. Vuelva a intentarlo."
        );
      }

      // 4. Actualizar el estado
      setAdmins(admins.filter(admin => admin.id !== id));
      setError(null);
      
      // 5. Mostrar mensaje de éxito
      setAviso(
        usersDeletedCount === 0
          ? "El administrador se eliminó correctamente. No tenía participantes asociados."
          : `El administrador se eliminó correctamente, junto con ${usersDeletedCount} participante${
              usersDeletedCount === 1 ? "" : "s"
            } asociado${usersDeletedCount === 1 ? "" : "s"}.`
      );

    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al eliminar administrador");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div className="p-6 text-black">Cargando...</div>;
  }

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold mb-4">Gestión de Administradores</h2>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      <div className="mb-4 flex gap-4">
        <input
          type="email"
          placeholder="Correo electrónico"
          value={newAdmin.email}
          onChange={(e) => setNewAdmin({ ...newAdmin, email: e.target.value })}
          className="p-2 border rounded"
        />
        <input
          type="password"
          placeholder="Contraseña"
          value={newAdmin.password}
          onChange={(e) => setNewAdmin({ ...newAdmin, password: e.target.value })}
          className="p-2 border rounded "
        />
        <button 
          onClick={handleAddAdmin} 
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 transition-colors"
          disabled={loading}
        >
          Agregar
        </button>
      </div>

      <table className="w-full border-collapse border border-gray-300">
    <thead>
      <tr className="bg-mi-color-rgb text-white">
        <th className="border p-2">ID</th>
        <th className="border p-2">Correo</th>
        <th className="border p-2">Acciones</th>
      </tr>
    </thead>
    <tbody>
      {admins.map((admin) => (
        <tr key={admin.id} className="text-center hover:bg-gray-50">
          <td className="border p-2 border-black">{admin.id}</td>
          <td className="border p-2 border-black">{admin.email}</td>
          <td className="border p-2 border-black">
            <div className="flex flex-col sm:flex-row gap-2">
              <button
                onClick={() => setAdminAEliminar(admin)}
                disabled={loading}
                className="bg-red-500 text-white px-2 py-1 rounded hover:bg-red-600 transition-colors"
              >
                Eliminar
              </button>
            </div>
          </td>

        </tr>
      ))}
    </tbody>
  </table>

      {adminAEliminar && (
        <Dialogo
          titulo="¿Eliminar este administrador?"
          onCerrar={() => setAdminAEliminar(null)}
          accion={{
            texto: "Sí, eliminar",
            peligrosa: true,
            onClick: () => handleDeleteAdmin(adminAEliminar.id),
          }}
        >
          <p className="mb-3">
            Se va a eliminar a{" "}
            <span className="font-semibold text-gray-900">
              {adminAEliminar.email}
            </span>{" "}
            de la base de datos.
          </p>
          <p className="rounded-lg border-l-4 border-red-400 bg-red-50 p-3">
            Se eliminarán también <strong>todos los participantes</strong> que se
            registraron con su código de invitación, con sus respuestas y sus
            resultados. Esta acción no se puede deshacer.
          </p>
        </Dialogo>
      )}

      {aviso && (
        <Dialogo
          titulo="Listo"
          onCerrar={() => setAviso(null)}
          textoCerrar="Aceptar"
        >
          <p>{aviso}</p>
        </Dialogo>
      )}
    </div>
  );
};

export default ListaAdmin;