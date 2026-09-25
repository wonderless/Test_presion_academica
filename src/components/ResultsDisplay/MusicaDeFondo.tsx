// components/ResultsDisplay/MusicaDeFondo.tsx
//
// Música de fondo para acompañar la lectura de los resultados, con un botón
// fijo para pararla. Empieza sola al abrir la pantalla si el navegador lo
// permite —lo hace cuando se llega desde el test, no al recargar—; si no, el
// botón queda en "Música de fondo" para ponerla a mano. Si al abrir suena la
// alarma de un modo bajo o la medalla, la música espera a que terminen.
//
// Quien la para no vuelve a oírla al volver a entrar: la preferencia se
// recuerda en este navegador. Es solo una comodidad, así que si el
// almacenamiento no está disponible simplemente no se recuerda.
import { useEffect, useRef, useState } from "react";
import { Music, Pause } from "lucide-react";
import { escucharMusica, iniciarMusica, pausarMusica } from "@/lib/sonido";

const CLAVE = "musicaResultados";

const leerPreferencia = (): string | null => {
  try {
    return localStorage.getItem(CLAVE);
  } catch {
    return null;
  }
};

const guardarPreferencia = (valor: "on" | "off") => {
  try {
    localStorage.setItem(CLAVE, valor);
  } catch {
    // Sin almacenamiento, la preferencia dura lo que dure la visita.
  }
};

const MusicaDeFondo = () => {
  const [sonando, setSonando] = useState(false);
  // La persona ya usó el botón: el arranque automático, que puede estar
  // esperando a que termine la alarma, no debe pasar por encima de lo que
  // decidió.
  const usoElBoton = useRef(false);

  useEffect(() => {
    let montado = true;
    const dejarDeEscuchar = escucharMusica((ahora) => {
      if (montado) setSonando(ahora);
    });
    if (leerPreferencia() !== "off") {
      iniciarMusica({
        trasElSonidoDeEntrada: true,
        cancelada: () => !montado || usoElBoton.current,
      }).then((ok) => {
        if (montado && ok) setSonando(true);
      });
    }
    return () => {
      montado = false;
      dejarDeEscuchar();
      pausarMusica();
    };
  }, []);

  const alternar = async () => {
    usoElBoton.current = true;
    if (sonando) {
      pausarMusica();
      setSonando(false);
      guardarPreferencia("off");
      return;
    }
    const ok = await iniciarMusica();
    setSonando(ok);
    if (ok) guardarPreferencia("on");
  };

  return (
    <button
      type="button"
      onClick={alternar}
      aria-pressed={sonando}
      className="fixed bottom-4 right-4 z-40 flex items-center gap-2 rounded-full bg-white/90 px-4 py-2 text-sm font-medium text-gray-800 shadow-lg ring-1 ring-black/10 backdrop-blur transition-colors hover:bg-white"
    >
      {sonando ? <Pause size={16} /> : <Music size={16} />}
      {sonando ? "Pausar música" : "Música de fondo"}
    </button>
  );
};

export default MusicaDeFondo;
