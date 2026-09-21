// src/lib/terms.ts
// Consentimiento informado. Se lee directo de localStorage en cada render:
// cachearlo en useState + useEffect deja la UI un render por detrás y hace
// que /home parpadee antes de rebotar a "/".
const TERMS_KEY = "termsAccepted";

export const hasAcceptedTerms = (): boolean => {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(TERMS_KEY) === "true";
  } catch {
    return false;
  }
};

export const setTermsAccepted = (accepted: boolean): void => {
  if (typeof window === "undefined") return;
  try {
    if (accepted) {
      window.localStorage.setItem(TERMS_KEY, "true");
    } else {
      window.localStorage.removeItem(TERMS_KEY);
    }
  } catch {
    // Navegador con almacenamiento bloqueado: el gate simplemente no persiste.
  }
};
