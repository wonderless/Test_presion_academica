// src/app/api/auth/session/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifySessionToken } from '@/lib/auth/verifySession';

export async function POST(request: NextRequest) {
  const { token } = await request.json();

  if (!token) {
    return NextResponse.json(
      { error: 'Token no proporcionado' },
      { status: 400 }
    );
  }

  // Solo se convierte en cookie un token realmente firmado por Google: antes
  // este endpoint escribía cualquier cadena que le mandaran.
  const session = await verifySessionToken(token);

  if (!session || session.expired) {
    return NextResponse.json(
      { error: 'Token inválido' },
      { status: 401 }
    );
  }

  // Configurar la cookie de sesión
  const cookieStore = await cookies();
  cookieStore.set({
    name: '__session',
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 60 * 60 * 24 * 14, // 2 semanas
    path: '/',
    // 'lax' y no 'strict': con 'strict' el navegador no envía la cookie cuando
    // se llega desde un enlace externo (correo, WhatsApp), así que el
    // middleware no veía la sesión y devolvía al inicio a alguien que sí la
    // tenía. 'lax' la envía en esa navegación de primer nivel y la sigue
    // reteniendo en peticiones de terceros. La cookie solo sirve para
    // comprobar la sesión al servir páginas: los datos van por el SDK de
    // Firebase, que manda su propio token en la cabecera.
    sameSite: 'lax'
  });

  return NextResponse.json({ success: true });
}

export async function DELETE() {
  // Eliminar la cookie de sesión
  const cookieStore = await cookies();
  cookieStore.delete('__session');

  return NextResponse.json({ success: true });
}
