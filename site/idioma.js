/* Site Tayná Alves Assessoria · idiomas: português (o texto da página), inglês, espanhol, francês e alemão.
 * Elementos marcados com data-i18n (texto), data-i18n-html, data-i18n-ph (placeholder), data-i18n-alt, data-i18n-aria.
 * A escolha fica no navegador e no cookie lotus_idioma (vale também para a área do casal no Lotus). */
(function () {
  'use strict';
  var IDIOMAS = [['pt', 'Português', 'pt-BR'], ['en', 'English', 'en'], ['es', 'Español', 'es'], ['fr', 'Français', 'fr'], ['de', 'Deutsch', 'de']];
  var D = {
    en: {
      'meta.titulo': 'Tayná Alves Assessoria e Produção · Wedding planning and coordination in Recife, Brazil',
      'meta.desc': 'Wedding planning and coordination in Recife and destination weddings in Brazil. Over 20 years creating events with personality. Request your preliminary quote.',
      pular: 'Skip to content', 'bf.txt': 'Special conditions for contracts signed by 30 Nov.', 'bf.link': 'Request a quote',
      'menu.abrir': 'Open menu', 'menu.fechar': 'Close menu', 'nav.sobre': 'About', 'nav.servicos': 'Services', 'nav.portfolio': 'Portfolio',
      'nav.como': 'How it works', 'nav.contato': 'Contact', 'nav.area': "Couple's area", 'nav.pedir': 'Request a quote', 'nav.inicio': 'Tayná Alves Assessoria — home',
      'ab.bf': 'Black Friday · until 30 Nov', 'ab.sobretitulo': 'Wedding planning and coordination · Recife, Brazil',
      'ab.h1': 'A one-of-a-kind wedding,<br><em>that feels like you.</em>',
      'ab.lead': 'Over 20 years creating events with personality — from the first quote to the last sweet served. In Recife or wherever you choose to say yes.',
      'ab.btn1': 'Get my quote', 'ab.btn2': 'See the services', 'ab.alt': 'Tayná Alves laughing during a wedding, with a radio and a sweet in her hand',
      'dq.aria': 'Highlights', 'dq.1n': '20+ years', 'dq.1': 'of experience in events', 'dq.2n': 'Destination', 'dq.2': 'planning for couples marrying far from home',
      'dq.3n': 'All online', 'dq.3': "planning and follow-up through the couple's portal",
      'so.sobretitulo': 'Nice to meet you, Tayná here', 'so.h2': 'Tourism graduate, event specialist and in love with days no one forgets.',
      'so.p1': 'For over 20 years I have produced social, corporate and cultural events — and I noticed many followed the same script, with no personality. I decided to do it differently: tailor-made solutions, out-of-the-box ideas and close care with every detail.',
      'so.p2': 'If you want more than "having a wedding" — if you want a day that feels like you — let\'s talk.', 'so.ass': 'With love, Tay',
      'so.alt1': 'Team planner pinning the flower to the groom\'s lapel, next to a flower arch', 'so.alt2': "Team planner placing the flower on the lapel of the groom in a blue suit",
      'so.alt3': 'Planner handing the bouquet of red flowers to the bride on her getting-ready day',
      'sv.sobretitulo': 'Services', 'sv.h2': 'From full planning to a little push in the final stretch.',
      'sv.1r': 'Destination wedding', 'sv.1p': "Full planning for couples who don't live where they're getting married: vendors that match your style, online meetings, visits by us and the whole day run by our team.",
      'sv.2r': 'Full wedding planning', 'sv.2p': 'From choosing and negotiating with vendors to the timeline, meetings, tastings and visits — with the big-day coordination and setup supervision included.',
      'sv.3r': 'Wedding day coordination', 'sv.3p': 'A plan defined with you, logistics between vendors, processional, guest welcome, toast, protocols and favors: 6 hours of coordination starting at the ceremony.',
      'sv.4r': 'Online consulting', 'sv.4p': '6 video meetings of up to 2 hours to organize what you have already booked, recommend vendors and plan each stage — with a services and budget spreadsheet for you.',
      'ad.r': 'Add-ons to discuss', 'ad.h3': 'To complete the package', 'ad.p': 'Extra services agreed with Tayná in the conversation before signing the contract.',
      'ad.1': 'We arrive 4 to 6 hours before the ceremony to follow the setup and check every item booked.',
      'ad.2': "A coordinator until the end of the party: accounting for cake, sweets and drinks, leftovers and the couple's belongings.",
      'ad.3': 'Guest concierge: confirming attendance with each guest.', 'ad.4': 'Setting up the sweets table.', 'ad.5': "A companion during the bride's getting ready.",
      'co.sobretitulo': 'How it works', 'co.h2': 'Four steps, no loose ends.',
      'co.1h': 'Conversation and quote', 'co.1p': 'Tell us your dream through the form or WhatsApp; we put together a tailor-made proposal.',
      'co.2h': 'Date reserved', 'co.2p': 'A signed contract and a 30% deposit secure the date; the balance is arranged with you.',
      'co.3h': 'Planning together', 'co.3p': "Timeline, vendors and payments followed in the couple's portal, anytime.",
      'co.4h': 'The big day', 'co.4p': 'Our team runs everything, from setup to the end of the party. You just need to live the moment.',
      'po.sobretitulo': "Couple's area", 'po.h2': 'Your wedding, organized in one place.',
      'po.p': "Couples who book our planning get access to the portal: a countdown, what's done and what comes next in the timeline, every vendor and the status of payments — in Portuguese, English, Spanish, French or German. Sign in with the e-mail on the contract; on the first access the password is the CPF/ID number on the contract.",
      'po.btn': "Enter the couple's area", 'po.aria': "Example of the My event screen in the couple's portal", 'po.rot': 'My event · example',
      'po.dias': 'days until "I do"', 'po.t1': 'Catering tasting', 'po.s1': 'Done', 'po.t2': 'Dress fitting', 'po.s2': 'This week', 'po.t3': 'Invitations sent',
      'po.s3': 'In March', 'po.pagos': 'Vendors paid', 'po.9de14': '9 of 14',
      'pf.sobretitulo': 'Portfolio', 'pf.h2': "Moments we've taken care of.", 'pf.insta': 'See more on Instagram',
      'pf.a1': 'Emotional hug from the groom before the ceremony, among flowers', 'pf.a2': "Bride, the couple's dog and the team getting the best men ready in the garden",
      'pf.a3': 'Team helping the bride out of a vintage Beetle with her dress', 'pf.a4': "Planner pinning the flower to the groom's lapel in the garden",
      'pf.a5': 'Couple hugging the planner at the party, in front of a wall of white flowers', 'pf.a6': 'Production team member, from behind, following the ceremony setup in the garden',
      'pf.a7': 'Tayná laughing, holding hands with a guest during the party', 'pf.a8': 'Bride with the bouquet at the foot of the stairs, next to Tayná',
      'pf.a9': 'Planner speaking on the radio by the window, coordinating the event',
      'ct.sobretitulo': 'Request a quote', 'ct.h2': 'Shall we talk about your day?',
      'ct.bf': '<span>Black Friday</span> Requests until 30 Nov get special conditions, presented in the conversation with Tayná.',
      'ct.p': 'Fill in the form and receive a preliminary quote for the chosen service by e-mail, as a PDF. Then just book a chat with Tayná to sign the contract.',
      'ct.e1': 'Preliminary quote in your inbox', 'ct.e2': 'Choose a time or message Tayná on WhatsApp', 'ct.e3': 'In the conversation: final proposal and date reservation',
      'f.nome': "Couple's names", 'f.nome_ph': 'E.g. Anna and Peter', 'f.whats': 'WhatsApp / phone', 'f.email': 'E-mail (the quote goes here)', 'f.email_ph': 'you@email.com',
      'f.data': 'Wedding date', 'f.conv': 'Guests (approx.)', 'f.cidade': 'City or wedding venue', 'f.cidade_ph': 'E.g. Recife, Porto de Galinhas, Aldeia…',
      'f.servico': 'Service of interest', 'f.fora': 'The wedding is outside the Recife Metropolitan Area', 'f.msg': 'Tell us about the wedding',
      'f.msg_ph': "Style, what's already booked, what matters most to you…", 'f.robo': 'Do not fill in',
      'f.lgpd': 'I agree to receive the quote and contact from Tayná Alves Assessoria by e-mail. Data used only for this request (<a href="/privacidade" target="_blank">privacy</a>).',
      'f.enviar': 'Request a quote', 'f.enviando': 'Sending…', 'f.recebido': 'Request received!', 'f.recebido_n': 'Request received, {nome}!',
      'f.orc': 'Preliminary quote — ', 'f.pdf': "We'll send the PDF with the prices to your e-mail in a moment. If it doesn't show up, check your spam folder.",
      'f.agende': 'Book a chat with Tayná', 'f.30min': '30 minutes, by video or at the office, to finalize the proposal and reserve the date (times in Recife time, UTC−3).',
      'f.horarios_aria': 'Available times', 'f.carregando': 'Loading available times…', 'f.solicitar': 'Request this time',
      'f.sem_horarios': 'Online booking is not available right now. Message Tayná on WhatsApp to arrange the chat.',
      'f.whats_agora': 'Prefer to talk now? Message Tayná on WhatsApp', 'f.ag_tit': 'Booking request sent!',
      'f.ag_txt': 'You requested <strong id="horarioEscolhido"></strong>. Tayná will confirm and the invitation will arrive in your e-mail.',
      'f.whats2': 'Chat with Tayná on WhatsApp', 'f.recomecar': 'Request another quote',
      'f.e_campos': "Check the highlighted fields: couple's names and e-mail (the quote is sent by e-mail).", 'f.e_lgpd': 'To receive the quote by e-mail, please tick the authorization.',
      'f.e_rede': "No connection. Check your internet and try again, or message Tayná on WhatsApp.", 'f.e_envio': "Couldn't send right now. Try again or message Tayná on WhatsApp.",
      'rd.priv': 'Privacy', 'rd.equipe': 'Team access', 'rd.local': 'Várzea, Recife – PE, Brazil', 'wa.aria': 'Chat with Tayná on WhatsApp', idioma: 'Language',
    },
    es: {
      'meta.titulo': 'Tayná Alves Assessoria e Produção · Organización y coordinación de bodas en Recife, Brasil',
      'meta.desc': 'Organización y coordinación de bodas en Recife y destination weddings en Brasil. Más de 20 años creando eventos con identidad. Pidan su presupuesto previo.',
      pular: 'Saltar al contenido', 'bf.txt': 'Condiciones especiales para quienes firmen el contrato hasta el 30/11.', 'bf.link': 'Pedir presupuesto',
      'menu.abrir': 'Abrir menú', 'menu.fechar': 'Cerrar menú', 'nav.sobre': 'Sobre mí', 'nav.servicos': 'Servicios', 'nav.portfolio': 'Portafolio',
      'nav.como': 'Cómo funciona', 'nav.contato': 'Contacto', 'nav.area': 'Área de la pareja', 'nav.pedir': 'Pedir presupuesto', 'nav.inicio': 'Tayná Alves Assessoria — inicio',
      'ab.bf': 'Black Friday · hasta el 30/11', 'ab.sobretitulo': 'Organización y coordinación de bodas · Recife, Brasil',
      'ab.h1': 'Una boda única,<br><em>con su estilo.</em>',
      'ab.lead': 'Más de 20 años creando eventos con identidad — del primer presupuesto al último dulce entregado. En Recife o donde elijan decir sí.',
      'ab.btn1': 'Quiero mi presupuesto', 'ab.btn2': 'Conocer los servicios', 'ab.alt': 'Tayná Alves riendo durante una boda, con la radio y un dulce en la mano',
      'dq.aria': 'Destacados', 'dq.1n': '+20 años', 'dq.1': 'de experiencia en eventos', 'dq.2n': 'Destination', 'dq.2': 'asesoría para quienes se casan lejos de casa',
      'dq.3n': 'Todo online', 'dq.3': 'planificación y seguimiento en el portal de la pareja',
      'so.sobretitulo': 'Mucho gusto, soy Tayná', 'so.h2': 'Turismóloga, especialista en eventos y enamorada de los días que nadie olvida.',
      'so.p1': 'Llevo más de 20 años produciendo eventos sociales, corporativos y culturales — y me di cuenta de que muchos seguían siempre el mismo guion, sin identidad. Decidí hacerlo diferente: soluciones personalizadas, ideas originales y un cuidado cercano de cada detalle.',
      'so.p2': 'Si quieren más que "celebrar una boda" — quieren un día con su estilo — hablemos.', 'so.ass': 'Con cariño, Tay',
      'so.alt1': 'Asesora del equipo prendiendo la flor en la solapa del novio, junto a un arco de flores', 'so.alt2': 'Asesora del equipo colocando la flor en la solapa del novio de traje azul',
      'so.alt3': 'Asesora entregando el ramo de flores rojas a la novia el día de la preparación',
      'sv.sobretitulo': 'Servicios', 'sv.h2': 'De la planificación completa a un empujoncito en la recta final.',
      'sv.1r': 'Destination wedding', 'sv.1p': 'Asesoría completa para quienes no viven donde se van a casar: proveedores con su perfil, reuniones online, visitas hechas por nosotras y todo el día conducido por el equipo.',
      'sv.2r': 'Asesoría completa', 'sv.2p': 'De la elección y negociación con proveedores al cronograma, reuniones, degustaciones y visitas — con la coordinación del gran día y la supervisión del montaje incluidas.',
      'sv.3r': 'Coordinación del día', 'sv.3p': 'Guion definido con ustedes, logística entre proveedores, cortejo, recepción de invitados, brindis, protocolos y recuerdos: 6 horas de coordinación desde la ceremonia.',
      'sv.4r': 'Consultoría online', 'sv.4p': '6 reuniones por video de hasta 2 horas para organizar lo ya contratado, recomendar proveedores y planificar cada etapa — con hoja de servicios y finanzas para ustedes.',
      'ad.r': 'Adicionales a negociar', 'ad.h3': 'Para completar el paquete', 'ad.p': 'Servicios extra, acordados con Tayná en la conversación para cerrar el contrato.',
      'ad.1': 'Llegamos de 4 a 6 horas antes de la ceremonia para acompañar el montaje y revisar cada elemento contratado.',
      'ad.2': 'Una coordinadora hasta el final de la fiesta: rendición de cuentas de torta, dulces y bebidas, sobras y pertenencias de la pareja.',
      'ad.3': 'Concierge de invitados: confirmación de asistencia con cada invitado.', 'ad.4': 'Montaje de la mesa de dulces.', 'ad.5': 'Una acompañante durante la preparación de la novia.',
      'co.sobretitulo': 'Cómo funciona', 'co.h2': 'Cuatro pasos, ningún detalle suelto.',
      'co.1h': 'Conversación y presupuesto', 'co.1p': 'Nos cuentan su sueño por el formulario o WhatsApp; armamos la propuesta a medida.',
      'co.2h': 'Fecha reservada', 'co.2p': 'Contrato firmado y 30 % de anticipo garantizan la fecha; el resto se acuerda con ustedes.',
      'co.3h': 'Planificación juntos', 'co.3p': 'Cronograma, proveedores y pagos en el portal de la pareja, a cualquier hora.',
      'co.4h': 'El gran día', 'co.4p': 'Nuestro equipo conduce todo, del montaje al cierre. Ustedes solo tienen que vivir el momento.',
      'po.sobretitulo': 'Área de la pareja', 'po.h2': 'Su boda, organizada en un solo lugar.',
      'po.p': 'Quien contrata la asesoría recibe acceso al portal: cuenta regresiva, lo que ya está hecho y lo que viene en el cronograma, cada proveedor y el estado de los pagos — en portugués, inglés, español, francés o alemán. Se entra con el e-mail del contrato; en el primer acceso la contraseña es el CPF/documento del contrato.',
      'po.btn': 'Entrar en el área de la pareja', 'po.aria': 'Ejemplo de la pantalla Mi evento en el portal de la pareja', 'po.rot': 'Mi evento · ejemplo',
      'po.dias': 'días para el sí', 'po.t1': 'Degustación del catering', 'po.s1': 'Completada', 'po.t2': 'Prueba del vestido', 'po.s2': 'Esta semana', 'po.t3': 'Invitaciones enviadas',
      'po.s3': 'En marzo', 'po.pagos': 'Proveedores pagados', 'po.9de14': '9 de 14',
      'pf.sobretitulo': 'Portafolio', 'pf.h2': 'Momentos que ya cuidamos.', 'pf.insta': 'Ver más en Instagram',
      'pf.a1': 'Abrazo emocionado del novio antes de la ceremonia, entre flores', 'pf.a2': 'Novia, el perro de la pareja y el equipo preparando a los padrinos en el jardín',
      'pf.a3': 'Equipo ayudando a la novia a bajar de un escarabajo antiguo con el vestido', 'pf.a4': 'Asesora prendiendo la flor en la solapa del novio en el jardín',
      'pf.a5': 'Novios abrazando a la asesora en la fiesta, frente a una pared de flores blancas', 'pf.a6': 'Integrante del equipo de producción, de espaldas, acompañando el montaje de la ceremonia en el jardín',
      'pf.a7': 'Tayná riendo de la mano de una invitada durante la fiesta', 'pf.a8': 'Novia con el ramo al pie de la escalera, junto a Tayná',
      'pf.a9': 'Asesora hablando por la radio junto a la ventana, coordinando el evento',
      'ct.sobretitulo': 'Pedir presupuesto', 'ct.h2': '¿Hablamos sobre su día?',
      'ct.bf': '<span>Black Friday</span> Los pedidos hasta el 30/11 tienen condiciones especiales, presentadas en la conversación con Tayná.',
      'ct.p': 'Completen el formulario y reciban por e-mail un presupuesto previo del servicio elegido, en PDF. Después solo tienen que agendar una conversación con Tayná para cerrar el contrato.',
      'ct.e1': 'Presupuesto previo en su e-mail', 'ct.e2': 'Eligen un horario o escriben a Tayná por WhatsApp', 'ct.e3': 'En la conversación: propuesta final y reserva de la fecha',
      'f.nome': 'Nombre de la pareja', 'f.nome_ph': 'Ej.: Ana y Pedro', 'f.whats': 'WhatsApp / teléfono', 'f.email': 'E-mail (el presupuesto llega aquí)', 'f.email_ph': 'ustedes@email.com',
      'f.data': 'Fecha de la boda', 'f.conv': 'Invitados (aprox.)', 'f.cidade': 'Ciudad o lugar de la boda', 'f.cidade_ph': 'Ej.: Recife, Porto de Galinhas, Aldeia…',
      'f.servico': 'Servicio de interés', 'f.fora': 'La boda es fuera de la Región Metropolitana de Recife', 'f.msg': 'Cuéntennos sobre la boda',
      'f.msg_ph': 'Estilo, lo que ya está contratado, lo que más les importa…', 'f.robo': 'No completar',
      'f.lgpd': 'Acepto recibir el presupuesto y el contacto de Tayná Alves Assessoria por e-mail. Datos usados solo para esta atención (<a href="/privacidade" target="_blank">privacidad</a>).',
      'f.enviar': 'Pedir presupuesto', 'f.enviando': 'Enviando…', 'f.recebido': '¡Pedido recibido!', 'f.recebido_n': '¡Pedido recibido, {nome}!',
      'f.orc': 'Presupuesto previo — ', 'f.pdf': 'Enviaremos el PDF con los valores a su e-mail en unos instantes. Si no aparece, revisen el spam.',
      'f.agende': 'Agenden una conversación con Tayná', 'f.30min': '30 minutos, por video o en la oficina, para cerrar la propuesta final y reservar la fecha (horario de Recife, UTC−3).',
      'f.horarios_aria': 'Horarios disponibles', 'f.carregando': 'Cargando los horarios…', 'f.solicitar': 'Solicitar este horario',
      'f.sem_horarios': 'Los horarios online no están disponibles ahora. Escriban a Tayná por WhatsApp para acordar la conversación.',
      'f.whats_agora': '¿Prefieren hablar ahora? Escribir a Tayná por WhatsApp', 'f.ag_tit': '¡Pedido de agenda enviado!',
      'f.ag_txt': 'Pidieron <strong id="horarioEscolhido"></strong>. Tayná lo confirma y la invitación llega a su e-mail.',
      'f.whats2': 'Hablar con Tayná por WhatsApp', 'f.recomecar': 'Hacer otro presupuesto',
      'f.e_campos': 'Revisen los campos marcados: nombre de la pareja y e-mail (el presupuesto va por e-mail).', 'f.e_lgpd': 'Para recibir el presupuesto por e-mail, marquen la autorización.',
      'f.e_rede': 'Sin conexión. Revisen internet e intenten de nuevo, o escriban a Tayná por WhatsApp.', 'f.e_envio': 'No se pudo enviar ahora. Intenten de nuevo o escriban a Tayná por WhatsApp.',
      'rd.priv': 'Privacidad', 'rd.equipe': 'Acceso del equipo', 'rd.local': 'Várzea, Recife – PE, Brasil', 'wa.aria': 'Hablar con Tayná por WhatsApp', idioma: 'Idioma',
    },
    fr: {
      'meta.titulo': 'Tayná Alves Assessoria e Produção · Organisation et coordination de mariages à Recife, Brésil',
      'meta.desc': 'Organisation et coordination de mariages à Recife et destination weddings au Brésil. Plus de 20 ans à créer des événements qui vous ressemblent. Demandez votre devis préliminaire.',
      pular: 'Aller au contenu', 'bf.txt': "Conditions spéciales pour les contrats signés jusqu'au 30/11.", 'bf.link': 'Demander un devis',
      'menu.abrir': 'Ouvrir le menu', 'menu.fechar': 'Fermer le menu', 'nav.sobre': 'À propos', 'nav.servicos': 'Services', 'nav.portfolio': 'Portfolio',
      'nav.como': 'Comment ça marche', 'nav.contato': 'Contact', 'nav.area': 'Espace des mariés', 'nav.pedir': 'Demander un devis', 'nav.inicio': 'Tayná Alves Assessoria — accueil',
      'ab.bf': "Black Friday · jusqu'au 30/11", 'ab.sobretitulo': 'Organisation et coordination de mariages · Recife, Brésil',
      'ab.h1': 'Un mariage unique,<br><em>qui vous ressemble.</em>',
      'ab.lead': "Plus de 20 ans à créer des événements avec une identité — du premier devis à la dernière mignardise servie. À Recife ou là où vous choisirez de dire oui.",
      'ab.btn1': 'Je veux mon devis', 'ab.btn2': 'Découvrir les services', 'ab.alt': 'Tayná Alves riant pendant un mariage, talkie-walkie et mignardise à la main',
      'dq.aria': 'Points forts', 'dq.1n': '+20 ans', 'dq.1': "d'expérience dans l'événementiel", 'dq.2n': 'Destination', 'dq.2': 'organisation pour ceux qui se marient loin de chez eux',
      'dq.3n': 'Tout en ligne', 'dq.3': "préparation et suivi via l'espace des mariés",
      'so.sobretitulo': 'Enchantée, je suis Tayná', 'so.h2': "Diplômée en tourisme, spécialiste de l'événementiel et passionnée par les jours que personne n'oublie.",
      'so.p1': "Depuis plus de 20 ans, je produis des événements privés, d'entreprise et culturels — et j'ai remarqué que beaucoup suivaient toujours le même scénario, sans identité. J'ai décidé de faire autrement : des solutions sur mesure, des idées originales et une attention de près à chaque détail.",
      'so.p2': "Si vous voulez plus que « faire un mariage » — un jour qui vous ressemble — parlons-en.", 'so.ass': 'Avec affection, Tay',
      'so.alt1': "Organisatrice de l'équipe épinglant la fleur au revers du marié, à côté d'une arche de fleurs", 'so.alt2': "Organisatrice de l'équipe plaçant la fleur au revers du marié en costume bleu",
      'so.alt3': 'Organisatrice remettant le bouquet de fleurs rouges à la mariée le jour des préparatifs',
      'sv.sobretitulo': 'Services', 'sv.h2': "De l'organisation complète à un petit coup de pouce dans la dernière ligne droite.",
      'sv.1r': 'Destination wedding', 'sv.1p': "Organisation complète pour ceux qui n'habitent pas là où ils se marient : prestataires qui vous correspondent, réunions en ligne, visites faites par nous et toute la journée menée par l'équipe.",
      'sv.2r': 'Organisation complète', 'sv.2p': "Du choix et de la négociation des prestataires au planning, réunions, dégustations et visites — avec la coordination du grand jour et la supervision de l'installation incluses.",
      'sv.3r': 'Coordination du jour J', 'sv.3p': "Déroulé défini avec vous, logistique entre prestataires, cortège, accueil des invités, toast, protocoles et cadeaux : 6 heures de coordination à partir de la cérémonie.",
      'sv.4r': 'Conseil en ligne', 'sv.4p': "6 réunions vidéo de 2 heures maximum pour organiser ce qui est déjà réservé, recommander des prestataires et planifier chaque étape — avec un tableau des services et du budget pour vous.",
      'ad.r': 'Options à discuter', 'ad.h3': 'Pour compléter la formule', 'ad.p': 'Services en plus, convenus avec Tayná lors de l\'échange avant la signature du contrat.',
      'ad.1': "Nous arrivons 4 à 6 heures avant la cérémonie pour suivre l'installation et vérifier chaque élément réservé.",
      'ad.2': 'Une coordinatrice jusqu\'à la fin de la fête : bilan du gâteau, des mignardises et des boissons, des restes et des affaires des mariés.',
      'ad.3': 'Conciergerie des invités : confirmation de présence avec chaque invité.', 'ad.4': 'Installation de la table des desserts.', 'ad.5': 'Une accompagnatrice pendant les préparatifs de la mariée.',
      'co.sobretitulo': 'Comment ça marche', 'co.h2': 'Quatre étapes, aucun détail laissé au hasard.',
      'co.1h': 'Échange et devis', 'co.1p': 'Vous nous racontez votre rêve via le formulaire ou WhatsApp ; nous préparons une proposition sur mesure.',
      'co.2h': 'Date réservée', 'co.2p': 'Le contrat signé et 30 % d\'acompte garantissent la date ; le solde est convenu avec vous.',
      'co.3h': 'Préparation ensemble', 'co.3p': "Planning, prestataires et paiements suivis dans l'espace des mariés, à tout moment.",
      'co.4h': 'Le grand jour', 'co.4p': "Notre équipe s'occupe de tout, de l'installation à la fin. Vous n'avez qu'à vivre le moment.",
      'po.sobretitulo': 'Espace des mariés', 'po.h2': 'Votre mariage, organisé en un seul endroit.',
      'po.p': "Ceux qui réservent l'organisation ont accès au portail : compte à rebours, ce qui est fait et ce qui vient ensuite dans le planning, chaque prestataire et l'état des paiements — en portugais, anglais, espagnol, français ou allemand. Connexion avec l'e-mail du contrat ; au premier accès, le mot de passe est le CPF/numéro de document du contrat.",
      'po.btn': "Entrer dans l'espace des mariés", 'po.aria': "Exemple de l'écran Mon événement dans l'espace des mariés", 'po.rot': 'Mon événement · exemple',
      'po.dias': 'jours avant le oui', 'po.t1': 'Dégustation du traiteur', 'po.s1': 'Terminée', 'po.t2': 'Essayage de la robe', 'po.s2': 'Cette semaine', 'po.t3': 'Faire-part envoyés',
      'po.s3': 'En mars', 'po.pagos': 'Prestataires payés', 'po.9de14': '9 sur 14',
      'pf.sobretitulo': 'Portfolio', 'pf.h2': 'Des moments dont nous avons pris soin.', 'pf.insta': 'Voir plus sur Instagram',
      'pf.a1': 'Étreinte émue du marié avant la cérémonie, au milieu des fleurs', 'pf.a2': "La mariée, le chien du couple et l'équipe préparant les témoins dans le jardin",
      'pf.a3': "L'équipe aidant la mariée à descendre d'une Coccinelle ancienne avec sa robe", 'pf.a4': 'Organisatrice épinglant la fleur au revers du marié dans le jardin',
      'pf.a5': "Les mariés serrant l'organisatrice dans leurs bras pendant la fête, devant un mur de fleurs blanches", 'pf.a6': "Membre de l'équipe de production, de dos, suivant l'installation de la cérémonie dans le jardin",
      'pf.a7': 'Tayná riant, main dans la main avec une invitée pendant la fête', 'pf.a8': "La mariée avec le bouquet au pied de l'escalier, à côté de Tayná",
      'pf.a9': "Organisatrice parlant au talkie-walkie près de la fenêtre, coordonnant l'événement",
      'ct.sobretitulo': 'Demander un devis', 'ct.h2': 'Et si nous parlions de votre jour ?',
      'ct.bf': "<span>Black Friday</span> Les demandes jusqu'au 30/11 bénéficient de conditions spéciales, présentées lors de l'échange avec Tayná.",
      'ct.p': 'Remplissez le formulaire et recevez par e-mail un devis préliminaire du service choisi, en PDF. Il ne reste plus qu\'à réserver un échange avec Tayná pour signer le contrat.',
      'ct.e1': 'Devis préliminaire dans votre boîte mail', 'ct.e2': 'Vous choisissez un créneau ou écrivez à Tayná sur WhatsApp', 'ct.e3': "Lors de l'échange : proposition finale et réservation de la date",
      'f.nome': 'Prénoms des mariés', 'f.nome_ph': 'Ex. : Anne et Pierre', 'f.whats': 'WhatsApp / téléphone', 'f.email': 'E-mail (le devis arrive ici)', 'f.email_ph': 'vous@email.com',
      'f.data': 'Date du mariage', 'f.conv': 'Invités (env.)', 'f.cidade': 'Ville ou lieu du mariage', 'f.cidade_ph': 'Ex. : Recife, Porto de Galinhas, Aldeia…',
      'f.servico': 'Service souhaité', 'f.fora': 'Le mariage a lieu hors de la région métropolitaine de Recife', 'f.msg': 'Parlez-nous du mariage',
      'f.msg_ph': 'Style, ce qui est déjà réservé, ce qui compte le plus pour vous…', 'f.robo': 'Ne pas remplir',
      'f.lgpd': "J'accepte de recevoir le devis et d'être contacté(e) par Tayná Alves Assessoria par e-mail. Données utilisées uniquement pour cette demande (<a href=\"/privacidade\" target=\"_blank\">confidentialité</a>).",
      'f.enviar': 'Demander un devis', 'f.enviando': 'Envoi…', 'f.recebido': 'Demande reçue !', 'f.recebido_n': 'Demande reçue, {nome} !',
      'f.orc': 'Devis préliminaire — ', 'f.pdf': "Nous envoyons le PDF avec les prix à votre e-mail dans un instant. S'il n'arrive pas, vérifiez les spams.",
      'f.agende': 'Réservez un échange avec Tayná', 'f.30min': '30 minutes, en visio ou au bureau, pour finaliser la proposition et réserver la date (heure de Recife, UTC−3).',
      'f.horarios_aria': 'Créneaux disponibles', 'f.carregando': 'Chargement des créneaux…', 'f.solicitar': 'Demander ce créneau',
      'f.sem_horarios': "La réservation en ligne n'est pas disponible pour le moment. Écrivez à Tayná sur WhatsApp pour convenir de l'échange.",
      'f.whats_agora': 'Envie de parler maintenant ? Écrire à Tayná sur WhatsApp', 'f.ag_tit': 'Demande de rendez-vous envoyée !',
      'f.ag_txt': "Vous avez demandé <strong id=\"horarioEscolhido\"></strong>. Tayná confirme et l'invitation arrive dans votre boîte mail.",
      'f.whats2': 'Discuter avec Tayná sur WhatsApp', 'f.recomecar': 'Faire un autre devis',
      'f.e_campos': "Vérifiez les champs signalés : prénoms des mariés et e-mail (le devis est envoyé par e-mail).", 'f.e_lgpd': "Pour recevoir le devis par e-mail, cochez l'autorisation.",
      'f.e_rede': 'Pas de connexion. Vérifiez internet et réessayez, ou écrivez à Tayná sur WhatsApp.', 'f.e_envio': "Envoi impossible pour le moment. Réessayez ou écrivez à Tayná sur WhatsApp.",
      'rd.priv': 'Confidentialité', 'rd.equipe': "Accès de l'équipe", 'rd.local': 'Várzea, Recife – PE, Brésil', 'wa.aria': 'Discuter avec Tayná sur WhatsApp', idioma: 'Langue',
    },
    de: {
      'meta.titulo': 'Tayná Alves Assessoria e Produção · Hochzeitsplanung und -koordination in Recife, Brasilien',
      'meta.desc': 'Hochzeitsplanung und -koordination in Recife und Destination Weddings in Brasilien. Über 20 Jahre Events mit Persönlichkeit. Fordert euer vorläufiges Angebot an.',
      pular: 'Zum Inhalt springen', 'bf.txt': 'Sonderkonditionen für Verträge bis zum 30.11.', 'bf.link': 'Angebot anfragen',
      'menu.abrir': 'Menü öffnen', 'menu.fechar': 'Menü schließen', 'nav.sobre': 'Über mich', 'nav.servicos': 'Leistungen', 'nav.portfolio': 'Portfolio',
      'nav.como': "So funktioniert's", 'nav.contato': 'Kontakt', 'nav.area': 'Bereich fürs Brautpaar', 'nav.pedir': 'Angebot anfragen', 'nav.inicio': 'Tayná Alves Assessoria — Startseite',
      'ab.bf': 'Black Friday · bis 30.11.', 'ab.sobretitulo': 'Hochzeitsplanung und -koordination · Recife, Brasilien',
      'ab.h1': 'Eine einzigartige Hochzeit,<br><em>ganz nach euch.</em>',
      'ab.lead': 'Über 20 Jahre Events mit Persönlichkeit — vom ersten Angebot bis zur letzten servierten Süßigkeit. In Recife oder wo auch immer ihr Ja sagen wollt.',
      'ab.btn1': 'Mein Angebot anfragen', 'ab.btn2': 'Leistungen ansehen', 'ab.alt': 'Tayná Alves lachend auf einer Hochzeit, mit Funkgerät und einer Süßigkeit in der Hand',
      'dq.aria': 'Highlights', 'dq.1n': '20+ Jahre', 'dq.1': 'Erfahrung mit Events', 'dq.2n': 'Destination', 'dq.2': 'Planung für Paare, die fern der Heimat heiraten',
      'dq.3n': 'Alles online', 'dq.3': 'Planung und Begleitung im Brautpaar-Portal',
      'so.sobretitulo': 'Freut mich, ich bin Tayná', 'so.h2': 'Tourismusfachfrau, Eventspezialistin und verliebt in Tage, die niemand vergisst.',
      'so.p1': 'Seit über 20 Jahren produziere ich private, Firmen- und Kulturveranstaltungen — und habe gemerkt, dass viele immer demselben Drehbuch folgten, ohne Persönlichkeit. Ich habe beschlossen, es anders zu machen: maßgeschneiderte Lösungen, ungewöhnliche Ideen und persönliche Sorgfalt bei jedem Detail.',
      'so.p2': 'Wenn ihr mehr wollt als „eine Hochzeit feiern“ — einen Tag, der zu euch passt —, lasst uns reden.', 'so.ass': 'Herzlich, Tay',
      'so.alt1': 'Planerin aus dem Team steckt dem Bräutigam die Blume ans Revers, neben einem Blumenbogen', 'so.alt2': 'Planerin aus dem Team steckt dem Bräutigam im blauen Anzug die Blume ans Revers',
      'so.alt3': 'Planerin überreicht der Braut am Styling-Tag den Strauß aus roten Blumen',
      'sv.sobretitulo': 'Leistungen', 'sv.h2': 'Von der kompletten Planung bis zum kleinen Schubs auf der Zielgeraden.',
      'sv.1r': 'Destination Wedding', 'sv.1p': 'Komplette Planung für Paare, die nicht dort leben, wo sie heiraten: Dienstleister, die zu euch passen, Online-Termine, Besichtigungen durch uns und der ganze Tag vom Team geleitet.',
      'sv.2r': 'Komplette Hochzeitsplanung', 'sv.2p': 'Von der Auswahl und Verhandlung mit Dienstleistern bis zu Zeitplan, Terminen, Verkostungen und Besichtigungen — inklusive Koordination am großen Tag und Aufsicht beim Aufbau.',
      'sv.3r': 'Koordination am Hochzeitstag', 'sv.3p': 'Mit euch abgestimmter Ablauf, Logistik zwischen Dienstleistern, Einzug, Empfang der Gäste, Anstoßen, Protokoll und Gastgeschenke: 6 Stunden Koordination ab der Trauung.',
      'sv.4r': 'Online-Beratung', 'sv.4p': '6 Videotermine à bis zu 2 Stunden, um bereits Gebuchtes zu ordnen, Dienstleister zu empfehlen und jede Phase zu planen — mit Leistungs- und Budgettabelle für euch.',
      'ad.r': 'Zusatzleistungen nach Absprache', 'ad.h3': 'Um das Paket abzurunden', 'ad.p': 'Extras, die ihr mit Tayná im Gespräch vor Vertragsabschluss vereinbart.',
      'ad.1': 'Wir kommen 4 bis 6 Stunden vor der Trauung, begleiten den Aufbau und prüfen jede gebuchte Leistung.',
      'ad.2': 'Eine Koordinatorin bis zum Ende der Feier: Abrechnung von Torte, Süßem und Getränken, Reste und Sachen des Paares.',
      'ad.3': 'Gäste-Concierge: Bestätigung der Teilnahme bei jedem Gast.', 'ad.4': 'Aufbau des Süßigkeitentischs.', 'ad.5': 'Eine Begleitung beim Styling der Braut.',
      'co.sobretitulo': "So funktioniert's", 'co.h2': 'Vier Schritte, kein Detail bleibt offen.',
      'co.1h': 'Gespräch und Angebot', 'co.1p': 'Ihr erzählt uns von eurem Traum per Formular oder WhatsApp; wir stellen ein maßgeschneidertes Angebot zusammen.',
      'co.2h': 'Datum reserviert', 'co.2p': 'Unterschriebener Vertrag und 30 % Anzahlung sichern das Datum; der Rest wird mit euch vereinbart.',
      'co.3h': 'Gemeinsam planen', 'co.3p': 'Zeitplan, Dienstleister und Zahlungen jederzeit im Brautpaar-Portal im Blick.',
      'co.4h': 'Der große Tag', 'co.4p': 'Unser Team leitet alles, vom Aufbau bis zum Schluss. Ihr müsst den Moment nur genießen.',
      'po.sobretitulo': 'Bereich fürs Brautpaar', 'po.h2': 'Eure Hochzeit, an einem Ort organisiert.',
      'po.p': 'Wer die Planung bucht, bekommt Zugang zum Portal: Countdown, was erledigt ist und was im Zeitplan als Nächstes kommt, jeder Dienstleister und der Stand der Zahlungen — auf Portugiesisch, Englisch, Spanisch, Französisch oder Deutsch. Anmeldung mit der E-Mail aus dem Vertrag; beim ersten Zugang ist das Passwort die CPF/Ausweisnummer aus dem Vertrag.',
      'po.btn': 'Zum Brautpaar-Bereich', 'po.aria': 'Beispiel der Ansicht „Mein Event“ im Brautpaar-Portal', 'po.rot': 'Mein Event · Beispiel',
      'po.dias': 'Tage bis zum Ja', 'po.t1': 'Catering-Verkostung', 'po.s1': 'Erledigt', 'po.t2': 'Kleidanprobe', 'po.s2': 'Diese Woche', 'po.t3': 'Einladungen verschickt',
      'po.s3': 'Im März', 'po.pagos': 'Dienstleister bezahlt', 'po.9de14': '9 von 14',
      'pf.sobretitulo': 'Portfolio', 'pf.h2': 'Momente, die wir begleitet haben.', 'pf.insta': 'Mehr auf Instagram',
      'pf.a1': 'Emotionale Umarmung des Bräutigams vor der Trauung, zwischen Blumen', 'pf.a2': 'Braut, der Hund des Paares und das Team bereiten die Trauzeugen im Garten vor',
      'pf.a3': 'Das Team hilft der Braut im Kleid aus einem alten Käfer', 'pf.a4': 'Planerin steckt dem Bräutigam im Garten die Blume ans Revers',
      'pf.a5': 'Brautpaar umarmt die Planerin auf der Feier vor einer Wand aus weißen Blumen', 'pf.a6': 'Mitglied des Produktionsteams, von hinten, begleitet den Aufbau der Trauung im Garten',
      'pf.a7': 'Tayná lacht und hält auf der Feier die Hand einer Gästin', 'pf.a8': 'Braut mit Strauß am Fuß der Treppe, neben Tayná',
      'pf.a9': 'Planerin spricht am Fenster ins Funkgerät und koordiniert das Event',
      'ct.sobretitulo': 'Angebot anfragen', 'ct.h2': 'Wollen wir über euren Tag sprechen?',
      'ct.bf': '<span>Black Friday</span> Anfragen bis 30.11. erhalten Sonderkonditionen, die Tayná im Gespräch vorstellt.',
      'ct.p': 'Füllt das Formular aus und erhaltet per E-Mail ein vorläufiges Angebot für die gewählte Leistung als PDF. Danach einfach ein Gespräch mit Tayná buchen, um den Vertrag abzuschließen.',
      'ct.e1': 'Vorläufiges Angebot in eurem Postfach', 'ct.e2': 'Ihr wählt einen Termin oder schreibt Tayná auf WhatsApp', 'ct.e3': 'Im Gespräch: finales Angebot und Reservierung des Datums',
      'f.nome': 'Namen des Paares', 'f.nome_ph': 'z. B. Anna und Peter', 'f.whats': 'WhatsApp / Telefon', 'f.email': 'E-Mail (das Angebot kommt hierhin)', 'f.email_ph': 'ihr@email.com',
      'f.data': 'Hochzeitsdatum', 'f.conv': 'Gäste (ca.)', 'f.cidade': 'Stadt oder Hochzeitslocation', 'f.cidade_ph': 'z. B. Recife, Porto de Galinhas, Aldeia…',
      'f.servico': 'Gewünschte Leistung', 'f.fora': 'Die Hochzeit ist außerhalb der Metropolregion Recife', 'f.msg': 'Erzählt uns von der Hochzeit',
      'f.msg_ph': 'Stil, was schon gebucht ist, was euch am wichtigsten ist…', 'f.robo': 'Nicht ausfüllen',
      'f.lgpd': 'Ich stimme zu, das Angebot und Nachrichten von Tayná Alves Assessoria per E-Mail zu erhalten. Daten nur für diese Anfrage (<a href="/privacidade" target="_blank">Datenschutz</a>).',
      'f.enviar': 'Angebot anfragen', 'f.enviando': 'Wird gesendet…', 'f.recebido': 'Anfrage erhalten!', 'f.recebido_n': 'Anfrage erhalten, {nome}!',
      'f.orc': 'Vorläufiges Angebot — ', 'f.pdf': 'Wir schicken das PDF mit den Preisen gleich an eure E-Mail. Falls es nicht ankommt, schaut im Spam nach.',
      'f.agende': 'Gespräch mit Tayná buchen', 'f.30min': '30 Minuten, per Video oder im Büro, um das finale Angebot abzuschließen und das Datum zu reservieren (Zeiten in Recife-Zeit, UTC−3).',
      'f.horarios_aria': 'Verfügbare Termine', 'f.carregando': 'Termine werden geladen…', 'f.solicitar': 'Diesen Termin anfragen',
      'f.sem_horarios': 'Online-Termine sind gerade nicht verfügbar. Schreibt Tayná auf WhatsApp, um das Gespräch zu vereinbaren.',
      'f.whats_agora': 'Lieber gleich sprechen? Tayná auf WhatsApp schreiben', 'f.ag_tit': 'Terminanfrage gesendet!',
      'f.ag_txt': 'Ihr habt <strong id="horarioEscolhido"></strong> angefragt. Tayná bestätigt, und die Einladung kommt per E-Mail.',
      'f.whats2': 'Mit Tayná auf WhatsApp schreiben', 'f.recomecar': 'Weiteres Angebot anfragen',
      'f.e_campos': 'Bitte die markierten Felder prüfen: Namen des Paares und E-Mail (das Angebot kommt per E-Mail).', 'f.e_lgpd': 'Um das Angebot per E-Mail zu erhalten, bitte die Zustimmung ankreuzen.',
      'f.e_rede': 'Keine Verbindung. Bitte Internet prüfen und erneut versuchen oder Tayná auf WhatsApp schreiben.', 'f.e_envio': 'Senden gerade nicht möglich. Bitte erneut versuchen oder Tayná auf WhatsApp schreiben.',
      'rd.priv': 'Datenschutz', 'rd.equipe': 'Zugang fürs Team', 'rd.local': 'Várzea, Recife – PE, Brasilien', 'wa.aria': 'Mit Tayná auf WhatsApp schreiben', idioma: 'Sprache',
    },
  };
  // português: os textos do próprio HTML (guardados na primeira leitura) + os do script
  var PT = {
    'menu.abrir': 'Abrir menu', 'menu.fechar': 'Fechar menu', 'f.enviar': 'Pedir orçamento', 'f.enviando': 'Enviando…', 'f.recebido_n': 'Pedido recebido, {nome}!',
    'f.carregando': 'Carregando os horários…', 'f.solicitar': 'Solicitar este horário',
    'f.sem_horarios': 'Os horários online não estão disponíveis agora. Chame a Tayná no WhatsApp para combinar a conversa.',
    'f.e_campos': 'Confira os campos marcados: nome do casal e e-mail (o orçamento vai por e-mail).', 'f.e_lgpd': 'Para receber o orçamento por e-mail, marque a autorização.',
    'f.e_rede': 'Sem conexão. Confira a internet e tente de novo, ou chame a Tayná no WhatsApp.', 'f.e_envio': 'Não foi possível enviar agora. Tente de novo ou chame a Tayná no WhatsApp.',
    idioma: 'Idioma',
  };

  var DOMINIO = /(^|\.)taynaalvesassessoria\.com\.br$/.test(location.hostname) ? '; Domain=.taynaalvesassessoria.com.br' : '';
  function valido(l) { l = String(l || '').slice(0, 2).toLowerCase(); return l === 'pt' || D[l] ? l : null; }
  function gravar(l) {
    try { localStorage.setItem('lotus_idioma', l); } catch (e) { /* ok */ }
    document.cookie = 'lotus_idioma=' + l + '; Path=/; Max-Age=31536000; SameSite=Lax' + DOMINIO + (location.protocol === 'https:' ? '; Secure' : '');
  }
  function detectar() {
    var q = valido(new URLSearchParams(location.search).get('lang') || new URLSearchParams(location.search).get('idioma'));
    if (q) { gravar(q); return q; }
    var s = null; try { s = valido(localStorage.getItem('lotus_idioma')); } catch (e) { /* ok */ }
    if (s) return s;
    var m = /(?:^|;\s*)lotus_idioma=([a-z]{2})/.exec(document.cookie || ''); if (m && valido(m[1])) return m[1];
    var nav = navigator.languages && navigator.languages.length ? navigator.languages : [navigator.language || 'pt'];
    for (var i = 0; i < nav.length; i++) { var v = valido(nav[i]); if (v) return v; }
    return 'pt';
  }
  var atual = detectar();
  var info = IDIOMAS.filter(function (x) { return x[0] === atual; })[0];
  document.documentElement.lang = info[2];

  function t(k, p) {
    var v = (atual !== 'pt' && D[atual][k]) || PT[k] || k;
    return String(v).replace(/\{(\w+)\}/g, function (m, c) { return p && p[c] !== undefined ? p[c] : m; });
  }
  function aplicar() {
    if (atual === 'pt') return;
    var d = D[atual];
    var por = function (attr, fn) { document.querySelectorAll('[' + attr + ']').forEach(function (el) { var k = el.getAttribute(attr); if (d[k] !== undefined) fn(el, d[k]); }); };
    por('data-i18n', function (el, v) { el.textContent = v; });
    por('data-i18n-html', function (el, v) { el.innerHTML = v; });
    por('data-i18n-ph', function (el, v) { el.setAttribute('placeholder', v); });
    por('data-i18n-alt', function (el, v) { el.setAttribute('alt', v); });
    por('data-i18n-aria', function (el, v) { el.setAttribute('aria-label', v); });
    if (d['meta.titulo']) document.title = d['meta.titulo'];
    var md = document.querySelector('meta[name="description"]'); if (md && d['meta.desc']) md.setAttribute('content', d['meta.desc']);
  }
  function seletor() {
    var s = document.createElement('select'); s.className = 'idioma-sel'; s.setAttribute('aria-label', t('idioma')); s.title = t('idioma');
    IDIOMAS.forEach(function (x) { var o = document.createElement('option'); o.value = x[0]; o.textContent = x[0].toUpperCase() + ' · ' + x[1]; if (x[0] === atual) o.selected = true; s.appendChild(o); });
    s.onchange = function () { gravar(s.value); var u = new URL(location.href); u.searchParams.delete('lang'); u.searchParams.delete('idioma'); location.replace(u.toString()); };
    return s;
  }
  function iniciar() {
    aplicar();
    document.querySelectorAll('[data-seletor-idioma]').forEach(function (lugar) { lugar.appendChild(seletor()); });
    document.documentElement.classList.remove('traduzindo');
  }
  window.SITE_I18N = { idioma: atual, locale: info[2], t: t };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar); else iniciar();
})();
