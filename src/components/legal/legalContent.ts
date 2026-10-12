export type LegalPage = 'aviso' | 'privacidad' | 'terminos';

export interface LegalSection {
  heading: string;
  paragraphs: string[];
}

export interface LegalDocument {
  page: LegalPage;
  title: string;
  lastUpdated: string;
  sections: LegalSection[];
}

const TITULAR = '[TITULAR]';
const CONTACTO = '[correo de contacto]';
const UBICACION = '[ubicación]';
const LAST_UPDATED = '7 de octubre de 2026';

export const AVISO_LEGAL: LegalDocument = {
  page: 'aviso',
  title: 'Aviso Legal',
  lastUpdated: LAST_UPDATED,
  sections: [
    {
      heading: '1. Datos identificativos del titular',
      paragraphs: [
        'En cumplimiento del deber de información recogido en el artículo 10 de la Ley 34/2002, de 11 de julio, de Servicios de la Sociedad de la Información y de Comercio Electrónico (LSSI-CE), se informa que la presente aplicación web ("KookyeCatGym", en adelante "la Aplicación") es titularidad de:',
        `Titular: ${TITULAR}`,
        `Correo electrónico de contacto: ${CONTACTO}`,
        `Ubicación: ${UBICACION}`,
      ],
    },
    {
      heading: '2. Objeto',
      paragraphs: [
        'KookyeCatGym es una aplicación web de seguimiento de entrenamientos de gimnasio que permite al usuario crear rutinas, registrar el progreso de sus ejercicios y consultar estadísticas de rendimiento.',
      ],
    },
    {
      heading: '3. Condición de usuario',
      paragraphs: [
        'El acceso y/o uso de la Aplicación atribuye la condición de usuario y supone la aceptación, desde dicho acceso y/o uso, de los términos recogidos en este Aviso Legal, en la Política de Privacidad y en los Términos y Condiciones de Uso.',
      ],
    },
    {
      heading: '4. Naturaleza del proyecto y disponibilidad del servicio',
      paragraphs: [
        'KookyeCatGym es un proyecto desarrollado y mantenido de forma individual. El titular se reserva el derecho a modificar, actualizar, suspender o discontinuar, total o parcialmente y sin previo aviso, cualquier funcionalidad de la Aplicación, así como su estructura, diseño, contenidos o disponibilidad, con el fin de mejorar el servicio o por cualquier otro motivo.',
      ],
    },
    {
      heading: '5. Advertencia sobre cambios y recomendación de exportación de datos',
      paragraphs: [
        'Debido a la naturaleza evolutiva de la Aplicación, es posible que futuras actualizaciones, migraciones de base de datos o cambios estructurales puedan afectar a la información almacenada por el usuario (rutinas, entrenamientos registrados, estadísticas de progreso, etc.). Por ello, se recomienda encarecidamente al usuario utilizar de forma periódica la función de exportación de datos disponible en la Aplicación, con el fin de conservar una copia de seguridad propia de su información.',
        'El titular no garantiza la integridad, disponibilidad permanente ni conservación indefinida de los datos almacenados en la Aplicación, y no se hace responsable de la pérdida de progreso, rutinas, historial de entrenamientos u otra información introducida por el usuario como consecuencia de actualizaciones, cambios técnicos, incidencias, migraciones de servidor o discontinuación total o parcial del servicio.',
      ],
    },
    {
      heading: '6. Propiedad intelectual e industrial',
      paragraphs: [
        'Salvo que se indique lo contrario, los contenidos propios de la Aplicación (código, diseño, textos, marca "KookyeCatGym") son propiedad del titular. Las animaciones e imágenes de ejercicios se ofrecen cortesía de ExerciseDB / AscendAPI (ascendapi.com) y se utilizan conforme a los términos de su licencia.',
      ],
    },
    {
      heading: '7. Exclusión de garantías y responsabilidad',
      paragraphs: [
        'El titular no garantiza la ausencia de errores en el acceso a la Aplicación ni que su contenido se encuentre siempre actualizado. El titular no se hace responsable de los daños y perjuicios que pudieran derivarse de la falta de disponibilidad o continuidad del funcionamiento de la Aplicación.',
        'Los contenidos, rutinas y ejercicios ofrecidos tienen carácter meramente informativo y no sustituyen el consejo, diagnóstico o tratamiento de un profesional médico o del deporte cualificado. El usuario practica los ejercicios bajo su propia responsabilidad.',
      ],
    },
    {
      heading: '8. Legislación aplicable',
      paragraphs: [
        'Las presentes condiciones se rigen por la legislación española. Para cualquier controversia derivada del acceso o uso de la Aplicación, el usuario y el titular se someterán a los juzgados y tribunales que correspondan conforme a derecho.',
      ],
    },
  ],
};

export const POLITICA_PRIVACIDAD: LegalDocument = {
  page: 'privacidad',
  title: 'Política de Privacidad',
  lastUpdated: LAST_UPDATED,
  sections: [
    {
      heading: '1. Responsable del tratamiento',
      paragraphs: [
        `Responsable: ${TITULAR}`,
        `Correo electrónico de contacto: ${CONTACTO}`,
        `Ubicación: ${UBICACION}`,
      ],
    },
    {
      heading: '2. Normativa aplicable',
      paragraphs: [
        'Esta Política de Privacidad se ha elaborado conforme al Reglamento (UE) 2016/679 del Parlamento Europeo y del Consejo, de 27 de abril de 2016, relativo a la protección de las personas físicas en lo que respecta al tratamiento de datos personales (RGPD), y a la Ley Orgánica 3/2018, de 5 de diciembre, de Protección de Datos Personales y garantía de los derechos digitales (LOPDGDD).',
      ],
    },
    {
      heading: '3. Registro de usuarios',
      paragraphs: [
        'KookyeCatGym permite crear una cuenta individual mediante nombre de usuario, correo electrónico y contraseña. Cada cuenta es independiente: las rutinas, los entrenamientos y el historial de progreso que introduce cada usuario son privados y no son visibles para el resto de usuarios. El personal administrador únicamente puede ver el nombre de usuario, el correo electrónico, el rol y la fecha de alta de cada cuenta, con el fin de gestionar el acceso a la Aplicación; en ningún caso accede a las rutinas, entrenamientos o progreso personal de otros usuarios, ni a sus fotos o vídeos. La Aplicación no ofrece al administrador ninguna forma de ver las fotos de otros usuarios: solo muestra, a efectos técnicos, cuántas hay y cuánto espacio ocupan.',
      ],
    },
    {
      heading: '4. Datos que se tratan',
      paragraphs: [
        'a) Datos de registro y acceso: nombre de usuario, dirección de correo electrónico y contraseña. La contraseña nunca se almacena en texto plano: se aplica un hash mediante el algoritmo bcrypt, de forma que ni el titular ni ningún tercero pueden consultarla en claro. Al iniciar sesión se genera además un token de sesión asociado a la cuenta, necesario para mantener al usuario identificado mientras usa la Aplicación.',
        'b) Datos introducidos voluntariamente por el usuario en el uso de la Aplicación: rutinas de entrenamiento, ejercicios, series, repeticiones, pesos, tiempos de descanso y notas de progreso. Estos datos son introducidos y gestionados libremente por el propio usuario y son privados frente al resto de usuarios.',
        'c) Fotos y vídeos subidos voluntariamente por el usuario: fotos o vídeos de ejercicios, fotos de sus entrenamientos y fotos de progreso físico (por ejemplo, de pecho, brazos o abdomen), junto con la fecha de la foto, el grupo muscular y, si el usuario la indica, la medida del músculo en centímetros o milímetros. Antes de subirlas, las fotos se reducen de tamaño en el propio dispositivo. Estas fotos y medidas son privadas: solo las ve el usuario que las sube.',
        'd) Inicio de sesión con Face ID, Touch ID, huella o Windows Hello (passkeys), si el usuario decide activarlo: la Aplicación no recibe ni almacena en ningún momento la imagen de la cara, la huella dactilar ni ningún otro dato biométrico. El reconocimiento lo realiza el propio dispositivo del usuario, que solo comunica a la Aplicación una firma criptográfica. El servidor guarda únicamente una clave pública, el nombre del dispositivo (por ejemplo, "iPhone") y las fechas de alta y último uso, que el usuario puede consultar y eliminar en cualquier momento.',
        'e) Datos técnicos: la Aplicación almacena localmente, en el propio dispositivo del usuario (localStorage del navegador), información necesaria para su funcionamiento, como el token de sesión, los datos básicos de la cuenta (nombre de usuario, correo electrónico y rol) para no tener que solicitarlos en cada carga, el estado de un entrenamiento activo o preferencias de visualización.',
      ],
    },
    {
      heading: '5. Categorías especiales de datos',
      paragraphs: [
        'La Aplicación no solicita ni requiere datos relativos a la salud. No obstante, si el usuario decide introducir voluntariamente información que pudiera considerarse un dato de salud (por ejemplo, notas personales sobre una lesión), dicho dato quedará bajo su exclusivo control y únicamente será tratado con la finalidad de prestar el servicio solicitado por el propio usuario, en base al consentimiento explícito que otorga al introducir voluntariamente dicha información (artículo 9.2.a del RGPD).',
        'Las fotos de progreso físico y las medidas corporales pueden revelar aspectos del cuerpo o de la salud del usuario, por lo que se tratan con el mismo cuidado que los datos de categoría especial. Subirlas es siempre opcional y se basa en el consentimiento explícito del usuario, que puede retirar en cualquier momento borrando las fotos o las medidas desde la propia Aplicación. Estas fotos no se usan para ninguna otra finalidad, no se analizan de forma automatizada, no se comparten con terceros y no son visibles para el administrador ni para otros usuarios.',
      ],
    },
    {
      heading: '6. Finalidades del tratamiento',
      paragraphs: [
        'Gestionar el registro, la autenticación y la cuenta del usuario, permitiéndole acceder a la Aplicación.',
        'Almacenar y mostrar al usuario sus propias rutinas, entrenamientos y estadísticas de progreso.',
        'Guardar y mostrar al usuario sus propias fotos y medidas, para que pueda seguir su evolución.',
        'Permitir, si el usuario lo activa, el inicio de sesión con Face ID, Touch ID, huella o Windows Hello.',
        'Atender las solicitudes o consultas que el usuario dirija al correo de contacto.',
      ],
    },
    {
      heading: '7. Legitimación',
      paragraphs: [
        'Ejecución de una relación contractual (artículo 6.1.b del RGPD): el tratamiento de los datos de registro es necesario para crear la cuenta del usuario y prestarle el servicio, desde el momento en que se registra y acepta estos Términos y Condiciones.',
        'Consentimiento del interesado (artículo 6.1.a del RGPD), para el tratamiento de los datos introducidos voluntariamente y para el uso de cookies o almacenamiento local no esencial.',
      ],
    },
    {
      heading: '8. Conservación de los datos',
      paragraphs: [
        'Los datos se conservarán mientras el usuario mantenga su cuenta activa. El usuario podrá solicitar en cualquier momento la eliminación de sus datos y de su cuenta escribiendo al correo de contacto indicado; una vez atendida la solicitud, los datos se suprimirán salvo que exista una obligación legal de conservarlos por un plazo mayor.',
        'El usuario puede borrar en cualquier momento, desde la propia Aplicación, cualquiera de sus fotos o vídeos. Al borrarla, el archivo se elimina del servidor (salvo que el propio usuario tenga ese mismo archivo guardado en otro lugar de la Aplicación) y deja de estar accesible.',
      ],
    },
    {
      heading: '9. Destinatarios y encargados del tratamiento',
      paragraphs: [
        'No se ceden datos personales a terceros salvo obligación legal. Los datos pueden alojarse en servidores de proveedores de hosting/VPS que actúan como encargados del tratamiento conforme al artículo 28 del RGPD, exclusivamente con la finalidad de prestar el servicio.',
      ],
    },
    {
      heading: '10. Transferencias internacionales',
      paragraphs: [
        'No está prevista, en principio, ninguna transferencia internacional de datos fuera del Espacio Económico Europeo. Si en el futuro fuera necesaria, se informará debidamente y se adoptarán las garantías exigidas por el RGPD.',
      ],
    },
    {
      heading: '11. Derechos del usuario',
      paragraphs: [
        `El usuario puede ejercer en cualquier momento y de forma gratuita sus derechos de acceso, rectificación, supresión ("derecho al olvido"), limitación del tratamiento, portabilidad de los datos y oposición, así como retirar su consentimiento en cualquier momento, escribiendo al correo ${CONTACTO}, indicando el derecho que desea ejercer y adjuntando, si procede, la información necesaria para verificar su identidad.`,
        'Asimismo, el usuario tiene derecho a presentar una reclamación ante la Agencia Española de Protección de Datos (aepd.es) si considera que el tratamiento de sus datos no se ajusta a la normativa vigente.',
      ],
    },
    {
      heading: '12. Seguridad de los datos',
      paragraphs: [
        'Se adoptan medidas técnicas y organizativas razonables para proteger los datos personales, incluyendo el hash seguro de las contraseñas (bcrypt) y el uso de conexiones cifradas (HTTPS) en todas las comunicaciones con la Aplicación. No obstante, ninguna transmisión de datos por Internet puede garantizarse como absolutamente segura al 100%.',
        'Las fotos y vídeos se guardan en el servidor fuera de la carpeta pública de la web. Para mostrarlos, la Aplicación usa un enlace único formado por 64 caracteres aleatorios que no se puede adivinar; solo lo conoce la cuenta que subió la foto. Se recomienda al usuario no compartir ese enlace, ya que cualquier persona que lo tuviera podría ver la foto.',
        'En caso de que se produjera una violación de la seguridad de los datos que suponga un riesgo para los derechos y libertades de los usuarios, el titular lo notificará a la Agencia Española de Protección de Datos en el plazo de 72 horas desde que tenga constancia de ella, conforme al artículo 33 del RGPD, y comunicará la incidencia a los usuarios afectados cuando exista un alto riesgo para sus derechos, conforme al artículo 34 del RGPD.',
      ],
    },
    {
      heading: '13. Menores de edad',
      paragraphs: [
        'La Aplicación no está dirigida a menores de 14 años. Si se detecta que un menor de dicha edad ha proporcionado datos personales sin el consentimiento de sus padres o tutores legales, dichos datos serán eliminados.',
      ],
    },
    {
      heading: '14. Política de cookies y almacenamiento local',
      paragraphs: [
        'La Aplicación utiliza principalmente el almacenamiento local del navegador (localStorage) en lugar de cookies tradicionales, si bien a efectos de esta política se le aplican las mismas garantías exigidas para las cookies por la Directiva ePrivacy y el RGPD.',
        'Cookies/almacenamiento técnico o necesario: imprescindibles para el funcionamiento de la Aplicación (mantener la sesión de acceso, guardar el entrenamiento activo, recordar preferencias de visualización). Al ser estrictamente necesarias, no requieren consentimiento previo, conforme al artículo 22.2 de la Ley 34/2002 (LSSI-CE).',
        'Cookies/almacenamiento analítico: en el momento actual, KookyeCatGym no utiliza ninguna herramienta de analítica ni de seguimiento. Si en el futuro se incorporase alguna, se solicitará previamente el consentimiento del usuario a través del panel de preferencias de cookies, y este podrá aceptarlo, rechazarlo o modificarlo en cualquier momento.',
        'El usuario puede gestionar o retirar su consentimiento en cualquier momento a través del enlace "Preferencias de cookies" disponible en la Aplicación, así como configurar o eliminar el almacenamiento local desde los ajustes de su propio navegador.',
      ],
    },
    {
      heading: '15. Cambios en esta Política de Privacidad',
      paragraphs: [
        'El titular podrá modificar esta Política de Privacidad para adaptarla a novedades legislativas, a resoluciones de la Agencia Española de Protección de Datos o a cambios en el servicio. Cualquier cambio relevante será comunicado a los usuarios registrados y se indicará la fecha de la última actualización al final de este documento.',
      ],
    },
  ],
};

export const TERMINOS_CONDICIONES: LegalDocument = {
  page: 'terminos',
  title: 'Términos y Condiciones de Uso',
  lastUpdated: LAST_UPDATED,
  sections: [
    {
      heading: '1. Objeto y ámbito de aplicación',
      paragraphs: [
        `Los presentes Términos y Condiciones de Uso ("Términos") regulan el acceso y utilización de la aplicación KookyeCatGym (en adelante, "la Aplicación"), titularidad de ${TITULAR} (contacto: ${CONTACTO}). El acceso y/o uso de la Aplicación implica la aceptación plena de estos Términos, del Aviso Legal y de la Política de Privacidad.`,
      ],
    },
    {
      heading: '2. Acceso al servicio',
      paragraphs: [
        'El acceso a la Aplicación requiere crear una cuenta individual mediante nombre de usuario, correo electrónico y contraseña.',
      ],
    },
    {
      heading: '3. Registro de usuario',
      paragraphs: [
        'Al registrarse, el usuario deberá: proporcionar una dirección de correo electrónico válida y una contraseña, comprometiéndose a mantener la confidencialidad de sus credenciales de acceso; garantizar que los datos facilitados en el proceso de registro son veraces y mantenerlos actualizados; ser mayor de 14 años, o contar con el consentimiento de sus padres o tutores legales si es menor de dicha edad, conforme a la legislación española de protección de datos; y no compartir su cuenta con terceros ni permitir el acceso de personas no autorizadas.',
        'El usuario será responsable de toda actividad realizada desde su cuenta. Las rutinas, entrenamientos y el historial de progreso de cada cuenta son privados y no son visibles para otros usuarios.',
      ],
    },
    {
      heading: '4. Uso correcto de la Aplicación',
      paragraphs: [
        'El usuario se compromete a utilizar la Aplicación de conformidad con la ley, la moral y el orden público, así como con estos Términos. Queda prohibido: utilizar la Aplicación con fines fraudulentos o ilícitos; intentar acceder a cuentas, sistemas o datos de otros usuarios sin autorización; realizar ingeniería inversa, descompilar o intentar extraer el código fuente de la Aplicación más allá de lo permitido por la ley; introducir o difundir a través de la Aplicación contenido ilícito, ofensivo o que vulnere derechos de terceros; y subir fotos o vídeos en los que aparezcan otras personas sin su consentimiento.',
      ],
    },
    {
      heading: '5. Contenido y naturaleza informativa de los ejercicios',
      paragraphs: [
        'Las rutinas, ejercicios, imágenes e información de entrenamiento disponibles en la Aplicación tienen una finalidad exclusivamente informativa y de organización personal. No constituyen asesoramiento médico, nutricional ni deportivo profesional. El usuario reconoce que la actividad física conlleva riesgos inherentes y practica los ejercicios bajo su exclusiva responsabilidad, siendo recomendable consultar a un profesional médico o del deporte antes de iniciar cualquier programa de entrenamiento.',
      ],
    },
    {
      heading: '6. Modificaciones del servicio y de estos Términos',
      paragraphs: [
        'El titular podrá modificar, actualizar o discontinuar la Aplicación, total o parcialmente, en cualquier momento, así como estos Términos, para adaptarlos a cambios funcionales, técnicos o legales. Se recomienda al usuario revisar periódicamente este documento. El uso continuado de la Aplicación tras una modificación implica la aceptación de los nuevos Términos.',
      ],
    },
    {
      heading: '7. Descargo de responsabilidad por pérdida de datos o progreso',
      paragraphs: [
        'Dada la naturaleza cambiante de la Aplicación, el usuario acepta expresamente que actualizaciones, migraciones técnicas, cambios en la base de datos, incidencias del servicio o su eventual discontinuación pueden afectar, ralentizar o provocar la pérdida de las rutinas, entrenamientos, estadísticas de progreso u otra información almacenada. El titular no será responsable de dicha pérdida.',
        'Se recomienda encarecidamente al usuario exportar periódicamente sus datos mediante la función de exportación disponible en la Aplicación, con el fin de conservar copias de seguridad propias.',
      ],
    },
    {
      heading: '8. Baja y eliminación de cuenta',
      paragraphs: [
        `El usuario podrá solicitar en cualquier momento la baja de su cuenta y la eliminación de sus datos escribiendo al correo ${CONTACTO}. Tras la baja, sus datos serán eliminados salvo que exista una obligación legal de conservación.`,
      ],
    },
    {
      heading: '9. Propiedad intelectual',
      paragraphs: [
        'El código, diseño y elementos propios de la Aplicación son propiedad de su titular. El usuario conserva la titularidad de los datos que introduce (rutinas, entrenamientos, notas, fotos, vídeos y medidas), sin perjuicio de la licencia de uso necesaria para que el titular pueda prestar el servicio (almacenamiento y visualización de dichos datos).',
      ],
    },
    {
      heading: '10. Legislación aplicable y jurisdicción',
      paragraphs: [
        'Estos Términos se rigen por la legislación española. Cualquier controversia se someterá a los juzgados y tribunales competentes conforme a derecho.',
      ],
    },
    {
      heading: '11. Contacto',
      paragraphs: [
        `Para cualquier consulta relacionada con estos Términos, puede contactar en ${CONTACTO}.`,
      ],
    },
  ],
};

export const LEGAL_DOCUMENTS: Record<LegalPage, LegalDocument> = {
  aviso: AVISO_LEGAL,
  privacidad: POLITICA_PRIVACIDAD,
  terminos: TERMINOS_CONDICIONES,
};
