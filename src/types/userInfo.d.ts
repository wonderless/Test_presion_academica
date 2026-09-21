export interface UserInfo {
    uid: string;
    role: string;
    email: string;
    adminId: string;
    // El puntaje marcado en cada ítem, de 1 a 5.
    answers?: Record<number, number>;
    invitationCode: string;
    lastTestDate?: Date;
    personalInfo: {
        apellidos: string;
        carrera: string;
        ciclo: string;
        departamento: string;
        edad: number;
        nombres: string;
        sexo: string;
        universidad: string;
    }
    testDuration?: number;
    // Un puntaje por modo de afrontamiento, más el modo de afronte total, que
    // tiene su propia escala de 0 a 120 y no es la suma de los otros tres
    // niveles sino la de los 24 ítems.
    testResults?: {
        responsable: Results;
        organizado: Results;
        activadorFisiologico: Results;
        total: Results;
    };
    hasRetakenTest?: boolean;
}
export interface Results {
    level: string;
    score: number;
}
