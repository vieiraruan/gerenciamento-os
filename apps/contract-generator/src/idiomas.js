'use strict';

/**
 * Idiomas da parte que o casal vê (área do casal, tela de entrar do casal, e-mail e PDF do orçamento do site):
 * português (padrão), inglês, espanhol, francês e alemão. As telas internas da equipe ficam em português.
 * Escolha: ?idioma=xx (grava o cookie lotus_idioma) › cookie › idioma do navegador › português.
 */
const fs = require('fs');
const path = require('path');

const IDIOMAS = ['pt', 'en', 'es', 'fr', 'de'];
const NOMES = { pt: 'Português', en: 'English', es: 'Español', fr: 'Français', de: 'Deutsch' };
const LOCALE = { pt: 'pt-BR', en: 'en-GB', es: 'es-ES', fr: 'fr-FR', de: 'de-DE' };
const COOKIE = 'lotus_idioma';

const valido = (l) => (IDIOMAS.includes(String(l || '').slice(0, 2).toLowerCase()) ? String(l).slice(0, 2).toLowerCase() : null);

/** Idioma do pedido: ?idioma › cookie › Accept-Language › pt. */
function escolher(req, url) {
  const q = url && valido(url.searchParams.get('idioma'));
  if (q) return q;
  const m = /(?:^|;\s*)lotus_idioma=([a-z]{2})/.exec(req.headers.cookie || '');
  if (m && valido(m[1])) return m[1];
  for (const parte of String(req.headers['accept-language'] || '').split(',')) {
    const l = valido(parte.trim());
    if (l) return l;
  }
  return 'pt';
}
const cookieIdioma = (l, seguro) => `${COOKIE}=${l}; Path=/; Max-Age=31536000; SameSite=Lax${seguro ? '; Secure' : ''}`;

// ------------------------------------------------------------------------------------------------
// Textos (servidor). {chave} é trocado pelos parâmetros.
// ------------------------------------------------------------------------------------------------
const T = {
  pt: {
    'entrar.titulo': 'Entrar', 'entrar.sub': 'sistema de gestão', 'entrar.casal': 'Área do casal', 'entrar.email': 'E-mail do contrato',
    'entrar.senha': 'Senha', 'entrar.botao': 'Entrar',
    'entrar.dica': 'Primeiro acesso: a senha é o <b>CPF do contrato</b> (só números). Em seguida vocês criam uma senha própria.',
    'entrar.equipe': 'equipe da Tayná', 'entrar.google': 'Entrar com Google', 'entrar.esqueceu': 'Esqueceu a senha? Fale com a Tayná.',
    'entrar.privacidade': 'Privacidade', 'idioma': 'Idioma',
    'nova.titulo': 'Criar senha', 'nova.bemvindos': 'Bem-vindos!', 'nova.area': 'área do casal',
    'nova.dica': 'Criem uma senha para os próximos acessos (mínimo 8 caracteres). O CPF deixa de valer como senha.',
    'nova.senha': 'Nova senha', 'nova.repita': 'Repita a senha', 'nova.botao': 'Salvar e entrar',
    'erro.credenciais': 'E-mail ou senha incorretos.', 'erro.tentativas': 'Muitas tentativas. Espere 15 minutos e tente de novo.',
    'erro.informe': 'Informe o e-mail e a senha.', 'erro.equipe': 'Equipe da Tayná: use "Entrar com Google".', 'erro.origem': 'Origem não permitida.',
    'erro.expirou': 'O primeiro acesso expirou. Entre de novo com o CPF.', 'erro.curta': 'A senha precisa ter pelo menos 8 caracteres.',
    'erro.diferentes': 'As duas senhas não são iguais.', 'erro.cpf': 'A senha nova não pode ser o CPF.', 'erro.liberado': 'Acesso não liberado.',
    'erro.sessao': 'Sessão expirada. Entre de novo.',
    // site / orçamento
    'site.nome': 'Informe o nome do casal.', 'site.email': 'Informe um e-mail válido.', 'site.data': 'Data do casamento inválida.',
    'site.servico': 'Escolha um serviço da lista.', 'site.consentimento': 'Para enviar o orçamento por e-mail, marque a autorização.',
    'site.ocupado': 'Este horário acabou de ser ocupado. Escolha outro.', 'site.nao_encontrado': 'Pedido não encontrado.',
    'site.nao_sei': 'Ainda não sei',
    'orc.base': '{nome} (até {n} convidados)', 'orc.prof1': '1 profissional adicional ({c} convidados)', 'orc.profn': '{n} profissionais adicionais ({c} convidados)',
    'orc.dest': 'Destination — fora da Região Metropolitana do Recife (+15%)',
    'pdf.titulo': 'Orçamento prévio', 'pdf.emitido': 'Emitido em {d} · válido por {n} dias', 'pdf.data': 'Data do casamento', 'pdf.local': 'Local',
    'pdf.convidados': 'Convidados (aprox.)', 'pdf.servico': 'Serviço escolhido', 'pdf.total': 'Total estimado', 'pdf.incluido': 'O que está incluído: {d}.',
    'pdf.referencia': 'Serviços e valores de referência', 'pdf.seguimos': 'Como seguimos',
    'pdf.seguimos_txt': 'Este é um orçamento prévio, com valores de referência (equipe de 2 profissionais, até 150 convidados). A proposta final é fechada na conversa com a Tayná. A data fica reservada com o contrato assinado e 30% de entrada; o restante é combinado diretamente com vocês.',
    'mail.assunto': 'Seu orçamento prévio — {s}', 'mail.servicos': 'os serviços da assessoria', 'mail.ola': 'Olá, {nome}!',
    'mail.alegria': 'Que alegria receber o pedido de vocês{quando}{onde}.', 'mail.quando': ' para o casamento em <b>{d}</b>',
    'mail.pdf': 'O <b>orçamento prévio</b> de {s} está no PDF anexo. A proposta final e a reserva da data a Tayná fecha com vocês numa conversa.',
    'mail.botao': 'Conversar com a Tayná no WhatsApp', 'mail.carinho': 'Com carinho,<br>Tay',
    'mail.texto': 'Olá, {nome}! O orçamento prévio de {s} está no PDF anexo. Para conversar com a Tayná: {link}',
    'whats.tayna': 'Olá, Tayná! Sou {nome}, pedi um orçamento pelo site{quando} e gostaria de conversar.', 'whats.quando': ' (casamento em {d})',
  },
  en: {
    'entrar.titulo': 'Sign in', 'entrar.sub': 'management system', 'entrar.casal': "Couple's area", 'entrar.email': 'E-mail on the contract',
    'entrar.senha': 'Password', 'entrar.botao': 'Sign in',
    'entrar.dica': 'First access: the password is the <b>CPF/ID number on the contract</b> (digits only). Then you create your own password.',
    'entrar.equipe': "Tayná's team", 'entrar.google': 'Sign in with Google', 'entrar.esqueceu': 'Forgot your password? Talk to Tayná.',
    'entrar.privacidade': 'Privacy', 'idioma': 'Language',
    'nova.titulo': 'Create password', 'nova.bemvindos': 'Welcome!', 'nova.area': "couple's area",
    'nova.dica': 'Create a password for your next visits (at least 8 characters). The CPF will no longer work as a password.',
    'nova.senha': 'New password', 'nova.repita': 'Repeat the password', 'nova.botao': 'Save and sign in',
    'erro.credenciais': 'Incorrect e-mail or password.', 'erro.tentativas': 'Too many attempts. Wait 15 minutes and try again.',
    'erro.informe': 'Enter your e-mail and password.', 'erro.equipe': 'Tayná\'s team: use "Sign in with Google".', 'erro.origem': 'Origin not allowed.',
    'erro.expirou': 'Your first access expired. Sign in again with the CPF.', 'erro.curta': 'The password must have at least 8 characters.',
    'erro.diferentes': "The two passwords don't match.", 'erro.cpf': 'The new password cannot be the CPF.', 'erro.liberado': 'Access not granted.',
    'erro.sessao': 'Session expired. Please sign in again.',
    'site.nome': "Enter the couple's name.", 'site.email': 'Enter a valid e-mail.', 'site.data': 'Invalid wedding date.',
    'site.servico': 'Choose a service from the list.', 'site.consentimento': 'To receive the quote by e-mail, please tick the authorization.',
    'site.ocupado': 'This time slot was just taken. Please choose another.', 'site.nao_encontrado': 'Request not found.',
    'site.nao_sei': "I don't know yet",
    'orc.base': '{nome} (up to {n} guests)', 'orc.prof1': '1 additional professional ({c} guests)', 'orc.profn': '{n} additional professionals ({c} guests)',
    'orc.dest': 'Destination — outside the Recife Metropolitan Area (+15%)',
    'pdf.titulo': 'Preliminary quote', 'pdf.emitido': 'Issued on {d} · valid for {n} days', 'pdf.data': 'Wedding date', 'pdf.local': 'Location',
    'pdf.convidados': 'Guests (approx.)', 'pdf.servico': 'Chosen service', 'pdf.total': 'Estimated total', 'pdf.incluido': "What's included: {d}.",
    'pdf.referencia': 'Services and reference prices', 'pdf.seguimos': 'Next steps',
    'pdf.seguimos_txt': 'This is a preliminary quote with reference prices (team of 2 professionals, up to 150 guests). The final proposal is agreed in a conversation with Tayná. The date is reserved with the signed contract and a 30% deposit; the balance is arranged directly with you.',
    'mail.assunto': 'Your preliminary quote — {s}', 'mail.servicos': 'our wedding planning services', 'mail.ola': 'Hello, {nome}!',
    'mail.alegria': 'We are so happy to receive your request{quando}{onde}.', 'mail.quando': ' for your wedding on <b>{d}</b>',
    'mail.pdf': 'The <b>preliminary quote</b> for {s} is in the attached PDF. Tayná will finalize the proposal and reserve the date with you in a conversation.',
    'mail.botao': 'Chat with Tayná on WhatsApp', 'mail.carinho': 'With love,<br>Tay',
    'mail.texto': 'Hello, {nome}! The preliminary quote for {s} is in the attached PDF. To talk to Tayná: {link}',
    'whats.tayna': "Hi Tayná! I'm {nome}, I requested a quote on the website{quando} and would like to talk.", 'whats.quando': ' (wedding on {d})',
  },
  es: {
    'entrar.titulo': 'Entrar', 'entrar.sub': 'sistema de gestión', 'entrar.casal': 'Área de la pareja', 'entrar.email': 'E-mail del contrato',
    'entrar.senha': 'Contraseña', 'entrar.botao': 'Entrar',
    'entrar.dica': 'Primer acceso: la contraseña es el <b>CPF/documento del contrato</b> (solo números). Después crean su propia contraseña.',
    'entrar.equipe': 'equipo de Tayná', 'entrar.google': 'Entrar con Google', 'entrar.esqueceu': '¿Olvidaron la contraseña? Hablen con Tayná.',
    'entrar.privacidade': 'Privacidad', 'idioma': 'Idioma',
    'nova.titulo': 'Crear contraseña', 'nova.bemvindos': '¡Bienvenidos!', 'nova.area': 'área de la pareja',
    'nova.dica': 'Creen una contraseña para los próximos accesos (mínimo 8 caracteres). El CPF deja de valer como contraseña.',
    'nova.senha': 'Nueva contraseña', 'nova.repita': 'Repitan la contraseña', 'nova.botao': 'Guardar y entrar',
    'erro.credenciais': 'E-mail o contraseña incorrectos.', 'erro.tentativas': 'Demasiados intentos. Esperen 15 minutos y vuelvan a intentarlo.',
    'erro.informe': 'Ingresen el e-mail y la contraseña.', 'erro.equipe': 'Equipo de Tayná: usen "Entrar con Google".', 'erro.origem': 'Origen no permitido.',
    'erro.expirou': 'El primer acceso caducó. Entren de nuevo con el CPF.', 'erro.curta': 'La contraseña debe tener al menos 8 caracteres.',
    'erro.diferentes': 'Las dos contraseñas no coinciden.', 'erro.cpf': 'La nueva contraseña no puede ser el CPF.', 'erro.liberado': 'Acceso no habilitado.',
    'erro.sessao': 'La sesión caducó. Entren de nuevo.',
    'site.nome': 'Indiquen el nombre de la pareja.', 'site.email': 'Indiquen un e-mail válido.', 'site.data': 'Fecha de la boda no válida.',
    'site.servico': 'Elijan un servicio de la lista.', 'site.consentimento': 'Para recibir el presupuesto por e-mail, marquen la autorización.',
    'site.ocupado': 'Este horario acaba de ser ocupado. Elijan otro.', 'site.nao_encontrado': 'Solicitud no encontrada.',
    'site.nao_sei': 'Todavía no lo sé',
    'orc.base': '{nome} (hasta {n} invitados)', 'orc.prof1': '1 profesional adicional ({c} invitados)', 'orc.profn': '{n} profesionales adicionales ({c} invitados)',
    'orc.dest': 'Destination — fuera de la Región Metropolitana de Recife (+15%)',
    'pdf.titulo': 'Presupuesto previo', 'pdf.emitido': 'Emitido el {d} · válido por {n} días', 'pdf.data': 'Fecha de la boda', 'pdf.local': 'Lugar',
    'pdf.convidados': 'Invitados (aprox.)', 'pdf.servico': 'Servicio elegido', 'pdf.total': 'Total estimado', 'pdf.incluido': 'Qué incluye: {d}.',
    'pdf.referencia': 'Servicios y precios de referencia', 'pdf.seguimos': 'Próximos pasos',
    'pdf.seguimos_txt': 'Este es un presupuesto previo, con precios de referencia (equipo de 2 profesionales, hasta 150 invitados). La propuesta final se cierra en una conversación con Tayná. La fecha queda reservada con el contrato firmado y un 30 % de anticipo; el resto se acuerda directamente con ustedes.',
    'mail.assunto': 'Su presupuesto previo — {s}', 'mail.servicos': 'los servicios de asesoría', 'mail.ola': '¡Hola, {nome}!',
    'mail.alegria': 'Qué alegría recibir su solicitud{quando}{onde}.', 'mail.quando': ' para la boda el <b>{d}</b>',
    'mail.pdf': 'El <b>presupuesto previo</b> de {s} está en el PDF adjunto. La propuesta final y la reserva de la fecha las cierra Tayná con ustedes en una conversación.',
    'mail.botao': 'Hablar con Tayná por WhatsApp', 'mail.carinho': 'Con cariño,<br>Tay',
    'mail.texto': '¡Hola, {nome}! El presupuesto previo de {s} está en el PDF adjunto. Para hablar con Tayná: {link}',
    'whats.tayna': '¡Hola, Tayná! Soy {nome}, pedí un presupuesto en la web{quando} y me gustaría conversar.', 'whats.quando': ' (boda el {d})',
  },
  fr: {
    'entrar.titulo': 'Connexion', 'entrar.sub': 'système de gestion', 'entrar.casal': 'Espace des mariés', 'entrar.email': 'E-mail du contrat',
    'entrar.senha': 'Mot de passe', 'entrar.botao': 'Se connecter',
    'entrar.dica': 'Premier accès : le mot de passe est le <b>CPF/numéro de document du contrat</b> (chiffres uniquement). Vous créerez ensuite votre propre mot de passe.',
    'entrar.equipe': 'équipe de Tayná', 'entrar.google': 'Se connecter avec Google', 'entrar.esqueceu': 'Mot de passe oublié ? Parlez à Tayná.',
    'entrar.privacidade': 'Confidentialité', 'idioma': 'Langue',
    'nova.titulo': 'Créer un mot de passe', 'nova.bemvindos': 'Bienvenue !', 'nova.area': 'espace des mariés',
    'nova.dica': 'Créez un mot de passe pour vos prochaines visites (8 caractères minimum). Le CPF ne servira plus de mot de passe.',
    'nova.senha': 'Nouveau mot de passe', 'nova.repita': 'Répétez le mot de passe', 'nova.botao': 'Enregistrer et se connecter',
    'erro.credenciais': 'E-mail ou mot de passe incorrect.', 'erro.tentativas': 'Trop de tentatives. Attendez 15 minutes et réessayez.',
    'erro.informe': "Saisissez l'e-mail et le mot de passe.", 'erro.equipe': 'Équipe de Tayná : utilisez « Se connecter avec Google ».', 'erro.origem': 'Origine non autorisée.',
    'erro.expirou': 'Le premier accès a expiré. Reconnectez-vous avec le CPF.', 'erro.curta': 'Le mot de passe doit comporter au moins 8 caractères.',
    'erro.diferentes': 'Les deux mots de passe ne correspondent pas.', 'erro.cpf': 'Le nouveau mot de passe ne peut pas être le CPF.', 'erro.liberado': 'Accès non autorisé.',
    'erro.sessao': 'Session expirée. Reconnectez-vous.',
    'site.nome': 'Indiquez le nom des mariés.', 'site.email': 'Indiquez un e-mail valide.', 'site.data': 'Date du mariage invalide.',
    'site.servico': 'Choisissez un service dans la liste.', 'site.consentimento': "Pour recevoir le devis par e-mail, cochez l'autorisation.",
    'site.ocupado': "Ce créneau vient d'être pris. Choisissez-en un autre.", 'site.nao_encontrado': 'Demande introuvable.',
    'site.nao_sei': 'Je ne sais pas encore',
    'orc.base': "{nome} (jusqu'à {n} invités)", 'orc.prof1': '1 professionnel supplémentaire ({c} invités)', 'orc.profn': '{n} professionnels supplémentaires ({c} invités)',
    'orc.dest': 'Destination — hors de la région métropolitaine de Recife (+15 %)',
    'pdf.titulo': 'Devis préliminaire', 'pdf.emitido': 'Émis le {d} · valable {n} jours', 'pdf.data': 'Date du mariage', 'pdf.local': 'Lieu',
    'pdf.convidados': 'Invités (env.)', 'pdf.servico': 'Service choisi', 'pdf.total': 'Total estimé', 'pdf.incluido': 'Ce qui est inclus : {d}.',
    'pdf.referencia': 'Services et prix de référence', 'pdf.seguimos': 'La suite',
    'pdf.seguimos_txt': "Ceci est un devis préliminaire, avec des prix de référence (équipe de 2 professionnels, jusqu'à 150 invités). La proposition finale est conclue lors d'un échange avec Tayná. La date est réservée à la signature du contrat avec un acompte de 30 % ; le solde est convenu directement avec vous.",
    'mail.assunto': 'Votre devis préliminaire — {s}', 'mail.servicos': "nos services d'organisation", 'mail.ola': 'Bonjour {nome} !',
    'mail.alegria': 'Quelle joie de recevoir votre demande{quando}{onde}.', 'mail.quando': ' pour votre mariage le <b>{d}</b>',
    'mail.pdf': 'Le <b>devis préliminaire</b> pour {s} est dans le PDF joint. Tayná finalisera la proposition et réservera la date avec vous lors d\'un échange.',
    'mail.botao': 'Discuter avec Tayná sur WhatsApp', 'mail.carinho': 'Avec affection,<br>Tay',
    'mail.texto': 'Bonjour {nome} ! Le devis préliminaire pour {s} est dans le PDF joint. Pour parler avec Tayná : {link}',
    'whats.tayna': "Bonjour Tayná ! Je suis {nome}, j'ai demandé un devis sur le site{quando} et j'aimerais en parler.", 'whats.quando': ' (mariage le {d})',
  },
  de: {
    'entrar.titulo': 'Anmelden', 'entrar.sub': 'Verwaltungssystem', 'entrar.casal': 'Bereich für das Brautpaar', 'entrar.email': 'E-Mail aus dem Vertrag',
    'entrar.senha': 'Passwort', 'entrar.botao': 'Anmelden',
    'entrar.dica': 'Erster Zugang: Das Passwort ist die <b>CPF/Ausweisnummer aus dem Vertrag</b> (nur Ziffern). Danach legt ihr ein eigenes Passwort fest.',
    'entrar.equipe': 'Team von Tayná', 'entrar.google': 'Mit Google anmelden', 'entrar.esqueceu': 'Passwort vergessen? Sprecht mit Tayná.',
    'entrar.privacidade': 'Datenschutz', 'idioma': 'Sprache',
    'nova.titulo': 'Passwort erstellen', 'nova.bemvindos': 'Willkommen!', 'nova.area': 'Bereich für das Brautpaar',
    'nova.dica': 'Legt ein Passwort für die nächsten Besuche fest (mindestens 8 Zeichen). Die CPF gilt danach nicht mehr als Passwort.',
    'nova.senha': 'Neues Passwort', 'nova.repita': 'Passwort wiederholen', 'nova.botao': 'Speichern und anmelden',
    'erro.credenciais': 'E-Mail oder Passwort falsch.', 'erro.tentativas': 'Zu viele Versuche. Bitte 15 Minuten warten und erneut versuchen.',
    'erro.informe': 'Bitte E-Mail und Passwort eingeben.', 'erro.equipe': 'Team von Tayná: bitte „Mit Google anmelden“ verwenden.', 'erro.origem': 'Herkunft nicht erlaubt.',
    'erro.expirou': 'Der erste Zugang ist abgelaufen. Bitte erneut mit der CPF anmelden.', 'erro.curta': 'Das Passwort muss mindestens 8 Zeichen haben.',
    'erro.diferentes': 'Die beiden Passwörter stimmen nicht überein.', 'erro.cpf': 'Das neue Passwort darf nicht die CPF sein.', 'erro.liberado': 'Zugang nicht freigegeben.',
    'erro.sessao': 'Sitzung abgelaufen. Bitte erneut anmelden.',
    'site.nome': 'Bitte den Namen des Paares angeben.', 'site.email': 'Bitte eine gültige E-Mail angeben.', 'site.data': 'Ungültiges Hochzeitsdatum.',
    'site.servico': 'Bitte eine Leistung aus der Liste wählen.', 'site.consentimento': 'Um das Angebot per E-Mail zu erhalten, bitte die Zustimmung ankreuzen.',
    'site.ocupado': 'Dieser Termin wurde gerade vergeben. Bitte einen anderen wählen.', 'site.nao_encontrado': 'Anfrage nicht gefunden.',
    'site.nao_sei': 'Weiß ich noch nicht',
    'orc.base': '{nome} (bis {n} Gäste)', 'orc.prof1': '1 zusätzliche Fachkraft ({c} Gäste)', 'orc.profn': '{n} zusätzliche Fachkräfte ({c} Gäste)',
    'orc.dest': 'Destination — außerhalb der Metropolregion Recife (+15 %)',
    'pdf.titulo': 'Vorläufiges Angebot', 'pdf.emitido': 'Ausgestellt am {d} · gültig für {n} Tage', 'pdf.data': 'Hochzeitsdatum', 'pdf.local': 'Ort',
    'pdf.convidados': 'Gäste (ca.)', 'pdf.servico': 'Gewählte Leistung', 'pdf.total': 'Geschätzte Summe', 'pdf.incluido': 'Enthalten: {d}.',
    'pdf.referencia': 'Leistungen und Richtpreise', 'pdf.seguimos': 'Wie es weitergeht',
    'pdf.seguimos_txt': 'Dies ist ein vorläufiges Angebot mit Richtpreisen (Team aus 2 Fachkräften, bis 150 Gäste). Das endgültige Angebot wird im Gespräch mit Tayná vereinbart. Das Datum wird mit dem unterschriebenen Vertrag und 30 % Anzahlung reserviert; der Rest wird direkt mit euch vereinbart.',
    'mail.assunto': 'Euer vorläufiges Angebot — {s}', 'mail.servicos': 'unsere Hochzeitsplanung', 'mail.ola': 'Hallo {nome}!',
    'mail.alegria': 'Wie schön, eure Anfrage zu erhalten{quando}{onde}.', 'mail.quando': ' für die Hochzeit am <b>{d}</b>',
    'mail.pdf': 'Das <b>vorläufige Angebot</b> für {s} findet ihr im angehängten PDF. Das endgültige Angebot und die Reservierung des Datums besprecht ihr mit Tayná.',
    'mail.botao': 'Mit Tayná auf WhatsApp schreiben', 'mail.carinho': 'Herzliche Grüße,<br>Tay',
    'mail.texto': 'Hallo {nome}! Das vorläufige Angebot für {s} findet ihr im angehängten PDF. Kontakt zu Tayná: {link}',
    'whats.tayna': 'Hallo Tayná! Ich bin {nome}, ich habe auf der Website ein Angebot angefragt{quando} und würde gern sprechen.', 'whats.quando': ' (Hochzeit am {d})',
  },
};

// descrições dos serviços (os nomes são da marca e ficam como estão)
const SERVICOS = {
  te_deixa_tranquila: { en: 'setup supervision', es: 'supervisión del montaje', fr: "supervision de l'installation", de: 'Aufsicht beim Aufbau' },
  necessario: { en: 'wedding day coordination', es: 'ceremonial (coordinación del día)', fr: 'coordination du jour J', de: 'Koordination am Hochzeitstag' },
  sai_na_vassoura: { en: 'event wrap-up', es: 'cierre del evento', fr: "clôture de l'événement", de: 'Abschluss der Veranstaltung' },
  dia_d: { en: 'setup supervision, wedding day coordination and event wrap-up', es: 'supervisión del montaje, ceremonial y cierre del evento', fr: "supervision de l'installation, coordination du jour J et clôture de l'événement", de: 'Aufsicht beim Aufbau, Koordination am Hochzeitstag und Abschluss der Veranstaltung' },
  empurraozinho: { en: 'strategic planning support "Empurrãozinho"', es: 'asesoría estratégica "Empurrãozinho"', fr: 'accompagnement stratégique « Empurrãozinho »', de: 'strategische Planungshilfe „Empurrãozinho“' },
  essencial: { en: 'full wedding planning "O Essencial" with setup supervision', es: 'asesoría completa "O Essencial" con supervisión del montaje', fr: "organisation complète « O Essencial » avec supervision de l'installation", de: 'komplette Hochzeitsplanung „O Essencial“ mit Aufsicht beim Aufbau' },
  so_vou_pra_casar: { en: 'full wedding planning "Só Vou Pra Casar" with setup supervision, day-of coordination, stage production and event wrap-up', es: 'asesoría completa "Só Vou Pra Casar" con supervisión del montaje, ceremonial, producción de escenario y cierre del evento', fr: "organisation complète « Só Vou Pra Casar » avec supervision de l'installation, coordination du jour J, production de scène et clôture de l'événement", de: 'komplette Hochzeitsplanung „Só Vou Pra Casar“ mit Aufsicht beim Aufbau, Koordination am Hochzeitstag, Bühnenproduktion und Abschluss der Veranstaltung' },
};

function t(l, chave, p = {}) {
  const lang = valido(l) || 'pt';
  const s = (T[lang] && T[lang][chave]) ?? T.pt[chave] ?? chave;
  return String(s).replace(/\{(\w+)\}/g, (m, k) => (p[k] !== undefined ? p[k] : m));
}
const descricaoServico = (id, padrao, l) => (l && l !== 'pt' && SERVICOS[id] && SERVICOS[id][l]) || padrao;

let CRON = null;
const norm = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/\s+/g, ' ').trim().toLowerCase();
/** Atividade do cronograma no idioma (sem tradução: o texto original). */
function tarefa(texto, l) {
  if (!l || l === 'pt' || !texto) return texto;
  if (!CRON) {
    CRON = new Map();
    try {
      const j = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'templates', 'traducoes', 'cronograma.json'), 'utf8'));
      for (const [pt, v] of Object.entries(j)) if (!pt.startsWith('_')) CRON.set(norm(pt), v);
    } catch { /* sem arquivo: fica em português */ }
  }
  const v = CRON.get(norm(texto));
  return (v && v[l]) || texto;
}

// espaço comum no lugar do espaço fino (o francês usa U+202F, que a fonte do PDF não tem)
const moeda = (v, l = 'pt') => `R$ ${Number(v || 0).toLocaleString(LOCALE[valido(l) || 'pt'], { minimumFractionDigits: 2, maximumFractionDigits: 2 }).replace(/[\u202f\u00a0]/g, ' ')}`;
function data(iso, l = 'pt', opcoes = { day: '2-digit', month: 'long', year: 'numeric' }) {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(iso || ''));
  if (!m) return '';
  if ((valido(l) || 'pt') === 'pt' && !opcoes.month) return `${m[3]}/${m[2]}/${m[1]}`;
  return new Date(Date.UTC(+m[1], +m[2] - 1, +m[3], 12)).toLocaleDateString(LOCALE[valido(l) || 'pt'], { ...opcoes, timeZone: 'UTC' }).replace(/[\u202f\u00a0]/g, ' ');
}

/** Seletor de idioma (links) para as páginas do servidor. */
function seletorHtml(atual, caminho = '') {
  return IDIOMAS.map((l) => (l === atual ? `<b>${l.toUpperCase()}</b>` : `<a href="${caminho}?idioma=${l}" lang="${l}" title="${NOMES[l]}">${l.toUpperCase()}</a>`)).join(' · ');
}

module.exports = { IDIOMAS, NOMES, LOCALE, COOKIE, valido, escolher, cookieIdioma, t, tarefa, descricaoServico, moeda, data, seletorHtml };
