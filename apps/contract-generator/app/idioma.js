/* Lotus · idiomas da área do casal: português, inglês, espanhol, francês e alemão.
 * I18N.t('chave', {n: 2}) — valores em lista = [singular, plural] (escolhe por params.n).
 * Sem escolha feita, vale o país onde a pessoa está (local.js), depois o idioma do navegador.
 * A escolha fica no navegador (localStorage) e no cookie lotus_idioma (usado pela tela de entrar). */
(function () {
  'use strict';
  var IDIOMAS = [
    { id: 'pt', nome: 'Português', locale: 'pt-BR' }, { id: 'en', nome: 'English', locale: 'en-GB' }, { id: 'es', nome: 'Español', locale: 'es-ES' },
    { id: 'fr', nome: 'Français', locale: 'fr-FR' }, { id: 'de', nome: 'Deutsch', locale: 'de-DE' },
  ];
  var D = {
    pt: {
      titulo: 'Nosso casamento', carregando: 'Carregando…', sair: 'Sair', idioma: 'Idioma', data_definir: 'data a definir',
      faltam_dias: 'Faltam {n} dias', amanha: 'É amanhã!', hoje_e: 'É hoje!', realizado: 'Casamento realizado',
      previa: 'Prévia da área do casal (você está vendo como o casal vê).', aba_prep: 'Preparativos', aba_forn: 'Fornecedores', atencao: 'Atenção',
      salvo: 'Salvo ✔', concluida_ok: 'Atividade concluída ✔', situacao_ok: 'Situação salva ✔', salvando: 'Salvando…', erro_salvar: 'Não foi possível salvar.',
      tag_atrasada: 'atrasada', tag_voces: 'por vocês', tag_voces_tit: 'Vocês atualizaram esta atividade', obs: 'Observação', situacao: 'Situação',
      nenhuma_concluida: 'Nenhuma atividade concluída ainda.', n_a_fazer: '{n} a fazer', periodo: '{ini} a {fim}', etapa_feita: 'Tudo feito nesta etapa ✔',
      nada_pendente: 'Nenhuma atividade pendente por aqui.', kpi_concluidas: 'Concluídas', x_de_y: '{a} de {b}', kpi_andamento: 'Em andamento',
      kpi_ritmo: 'Ritmo', ritmo_atrasado: 'Precisamos acelerar', ritmo_adiantado: 'Adiantados', ritmo_em_dia: 'Em dia',
      ajuda_prep: 'Atualizem a situação de cada atividade e deixem uma observação para a Tayná. Tudo é salvo na hora.',
      ver_como: 'Ver como', v_lista: 'Lista', v_quadro: 'Quadro', v_grafico: 'Andamento', mostrar: 'Mostrar', f_afazer: 'A fazer',
      f_todas: 'Abrir todas as etapas', f_feitas: 'Concluídas ({n})',
      ajuda_quadro: 'Arrastem as atividades entre as colunas ou toquem numa atividade para mudar a situação.',
      tit_grafico: 'Quantas atividades faltam até o casamento',
      ajuda_grafico: 'A linha tracejada é o planejado pela Tayná; a linha cheia, o que de fato falta. Se a linha cheia estiver acima da tracejada, é hora de acelerar.',
      forn_vazio: 'Ainda não há fornecedores cadastrados. Assim que a Tayná cadastrar, eles aparecem aqui com valores, vencimentos e pagamentos.',
      kpi_contratado: 'Contratado', kpi_pago: 'Pago', kpi_apagar: 'A pagar', parcelas_vencidas: ['{n} parcela vencida:', '{n} parcelas vencidas:'],
      proximos: 'Próximos vencimentos', b_quitado: 'quitado', b_vencida: 'vencida', b_sem_valor: 'sem valor', b_aberto: 'em aberto', a_pagar_min: 'a pagar',
      prox: 'próx. {d}', h_valores: 'Valores', l_entrada: 'Entrada', paga_ok: 'paga ✔', l_parcelas: 'Parcelas', venc_vencida: 'vencida', ord: '{n}ª',
      h_contato: 'Contato', h_dados: 'Dados para pagamento', h_contratado: 'O que está contratado', h_pagamentos: 'Pagamentos',
      p_parcela: 'Parcela', p_entrada: 'Entrada', p_avulso: 'Avulso', p_voces: 'enviado por vocês', comprov_ok: 'comprovante ✔',
      nenhum_pag: 'Nenhum pagamento registrado.', enviar_pag: 'Enviar pagamento',
      dlg_oque: 'O que foi pago', tp_entrada: 'Entrada', tp_parcela: 'Parcela', tp_avulso: 'Pagamento avulso', dlg_valor: 'Valor (R$)',
      dlg_data: 'Data do pagamento', dlg_forma: 'Forma', f_PIX: 'PIX', f_Transferência: 'Transferência', f_Boleto: 'Boleto', f_Cartão: 'Cartão', f_Dinheiro: 'Dinheiro',
      dlg_comp: 'Comprovante (foto ou PDF)', dlg_obs: 'Observação (opcional)', dlg_obs_ex: 'Ex.: parcela de dezembro',
      dlg_aviso: 'Depois de enviado, o pagamento <b>não pode ser alterado</b> por vocês. Se algo estiver errado, fale com a Tayná.',
      cancelar: 'Cancelar', enviando: 'Enviando…', e_valor: 'Informe o valor pago.', e_data: 'Informe a data do pagamento.',
      e_comp: 'Anexe o comprovante (foto ou PDF).', e_grande: 'O comprovante passa de 15 MB. Envie uma foto ou PDF menor.',
      pag_ok: 'Pagamento enviado ✔ A Tayná já consegue ver.', erro_enviar: 'Não foi possível enviar.',
      'st.': 'A fazer', 'st.EM ANDAMENTO': 'Em andamento', 'st.EM COTAÇÃO': 'Em cotação', 'st.FINALIZADO': 'Concluída', 'st.NÃO SE APLICA': 'Não se aplica', 'st.NÃO DESEJO': 'Não desejamos',
      etapa: ['{n} mês antes', '{n} meses antes'],
      'ac.filtrar': 'Filtrar atividades', 'ac.todas': 'Todas', 'ac.etapa_atual': 'Etapa atual', 'ac.atrasadas': 'Atrasadas ({n})', 'ac.buscar': 'Buscar atividade',
      'ac.arraste': 'Arraste uma atividade para cá', 'ac.nenhuma': 'Nenhuma', 'ac.mostrar_todas': 'Mostrar todas ({n})', 'ac.ate': 'até {d}',
      'ac.concluida_em': 'concluída em {d}', 'ac.obs_ph': 'Algo que a equipe precise saber', 'ac.salvar': 'Salvar',
      'ac.sem_dados': 'Sem data do casamento ou sem atividades: o gráfico aparece quando houver.', 'ac.faltam': 'Faltam <b>{r}</b> de {t}',
      'ac.previsto': 'Previsto para hoje: <b>{n}</b>', 'ac.tudo': 'Tudo concluído', 'ac.frente': '{n} à frente do previsto', 'ac.atras': '{n} atrás do previsto',
      'ac.ritmo': 'No ritmo previsto', 'ac.termina': 'No ritmo atual termina em <b>{d}</b>', 'ac.depois': '(depois do casamento)',
      'ac.real': 'Real (o que falta)', 'ac.plan': 'Planejado', 'ac.proj': 'Projeção', 'ac.hoje': 'hoje', 'ac.faltam_n': 'faltam {n}',
      'ac.tabela': 'Ver em tabela', 'ac.data': 'Data', 'ac.real_c': 'Real', 'ac.aria': 'Burndown: faltam {r} de {t} atividades; previsto para hoje {e}',
      'ac.niv_critico': 'Atrasado', 'ac.niv_aviso': 'Vence logo', 'ac.niv_info': 'Para saber', 'ac.nada': 'Nada atrasado. Tudo em dia!',
      'al.atrasadas': ['{n} atividade atrasada', '{n} atividades atrasadas'], 'al.ritmo': 'Ritmo abaixo do previsto',
      'al.ritmo_x': ['{n} atividade atrás do cronograma.', '{n} atividades atrás do cronograma.'],
      'al.etapa': ['{n} atividade para esta etapa', '{n} atividades para esta etapa'], 'al.etapa_x': '{etapa} · até {fim}',
      'al.vencida': '{forn}: parcela {num} vencida', 'al.vencida_x': ['{valor} · venceu em {venc} ({n} dia)', '{valor} · venceu em {venc} ({n} dias)'],
      'al.entrada': '{forn}: entrada em aberto', 'al.entrada_x': '{valor} · prevista para {venc}',
      'al.vence': '{forn}: parcela {num} vence em {venc}', 'al.vence_hoje': '{forn}: parcela {num} vence hoje',
      'al.quitar': '{forn}: quitar antes do casamento', 'al.quitar_x': '{valor} em aberto',
      'al.assessoria': 'Assessoria: pagamento em atraso', 'al.assessoria_x': '{valor} em atraso com a Tayná',
    },
    en: {
      titulo: 'Our wedding', carregando: 'Loading…', sair: 'Sign out', idioma: 'Language', data_definir: 'date to be confirmed',
      faltam_dias: '{n} days to go', amanha: "It's tomorrow!", hoje_e: "It's today!", realizado: 'Wedding celebrated',
      previa: "Preview of the couple's area (you are seeing it as the couple does).", aba_prep: 'Planning', aba_forn: 'Vendors', atencao: 'Attention',
      salvo: 'Saved ✔', concluida_ok: 'Task completed ✔', situacao_ok: 'Status saved ✔', salvando: 'Saving…', erro_salvar: 'Could not save.',
      tag_atrasada: 'overdue', tag_voces: 'by you', tag_voces_tit: 'You updated this task', obs: 'Note', situacao: 'Status',
      nenhuma_concluida: 'No tasks completed yet.', n_a_fazer: '{n} to do', periodo: '{ini} to {fim}', etapa_feita: 'Everything done in this stage ✔',
      nada_pendente: 'No pending tasks here.', kpi_concluidas: 'Completed', x_de_y: '{a} of {b}', kpi_andamento: 'In progress',
      kpi_ritmo: 'Pace', ritmo_atrasado: 'We need to speed up', ritmo_adiantado: 'Ahead of schedule', ritmo_em_dia: 'On track',
      ajuda_prep: 'Update the status of each task and leave a note for Tayná. Everything is saved instantly.',
      ver_como: 'View as', v_lista: 'List', v_quadro: 'Board', v_grafico: 'Progress', mostrar: 'Show', f_afazer: 'To do',
      f_todas: 'Open all stages', f_feitas: 'Completed ({n})',
      ajuda_quadro: 'Drag tasks between columns or tap a task to change its status.',
      tit_grafico: 'How many tasks are left until the wedding',
      ajuda_grafico: "The dashed line is Tayná's plan; the solid line is what is actually left. If the solid line is above the dashed one, it's time to speed up.",
      forn_vazio: 'No vendors yet. As soon as Tayná adds them, they will show up here with amounts, due dates and payments.',
      kpi_contratado: 'Contracted', kpi_pago: 'Paid', kpi_apagar: 'To pay', parcelas_vencidas: ['{n} overdue instalment:', '{n} overdue instalments:'],
      proximos: 'Upcoming due dates', b_quitado: 'paid off', b_vencida: 'overdue', b_sem_valor: 'no amount', b_aberto: 'open', a_pagar_min: 'to pay',
      prox: 'next {d}', h_valores: 'Amounts', l_entrada: 'Deposit', paga_ok: 'paid ✔', l_parcelas: 'Instalments', venc_vencida: 'overdue', ord: '#{n}',
      h_contato: 'Contact', h_dados: 'Payment details', h_contratado: "What's contracted", h_pagamentos: 'Payments',
      p_parcela: 'Instalment', p_entrada: 'Deposit', p_avulso: 'One-off', p_voces: 'sent by you', comprov_ok: 'receipt ✔',
      nenhum_pag: 'No payments recorded.', enviar_pag: 'Send payment',
      dlg_oque: 'What was paid', tp_entrada: 'Deposit', tp_parcela: 'Instalment', tp_avulso: 'One-off payment', dlg_valor: 'Amount (R$)',
      dlg_data: 'Payment date', dlg_forma: 'Method', f_PIX: 'PIX', f_Transferência: 'Bank transfer', f_Boleto: 'Boleto (bank slip)', f_Cartão: 'Card', f_Dinheiro: 'Cash',
      dlg_comp: 'Receipt (photo or PDF)', dlg_obs: 'Note (optional)', dlg_obs_ex: 'E.g. December instalment',
      dlg_aviso: 'Once sent, the payment <b>cannot be changed</b> by you. If something is wrong, talk to Tayná.',
      cancelar: 'Cancel', enviando: 'Sending…', e_valor: 'Enter the amount paid.', e_data: 'Enter the payment date.',
      e_comp: 'Attach the receipt (photo or PDF).', e_grande: 'The receipt is over 15 MB. Send a smaller photo or PDF.',
      pag_ok: 'Payment sent ✔ Tayná can already see it.', erro_enviar: 'Could not send.',
      'st.': 'To do', 'st.EM ANDAMENTO': 'In progress', 'st.EM COTAÇÃO': 'Getting quotes', 'st.FINALIZADO': 'Done', 'st.NÃO SE APLICA': 'Not applicable', 'st.NÃO DESEJO': "We don't want it",
      etapa: ['{n} month before', '{n} months before'],
      'ac.filtrar': 'Filter tasks', 'ac.todas': 'All', 'ac.etapa_atual': 'Current stage', 'ac.atrasadas': 'Overdue ({n})', 'ac.buscar': 'Search task',
      'ac.arraste': 'Drag a task here', 'ac.nenhuma': 'None', 'ac.mostrar_todas': 'Show all ({n})', 'ac.ate': 'by {d}',
      'ac.concluida_em': 'completed on {d}', 'ac.obs_ph': 'Anything the team should know', 'ac.salvar': 'Save',
      'ac.sem_dados': 'No wedding date or no tasks yet: the chart will appear when there are.', 'ac.faltam': '<b>{r}</b> of {t} left',
      'ac.previsto': 'Planned for today: <b>{n}</b>', 'ac.tudo': 'All done', 'ac.frente': '{n} ahead of plan', 'ac.atras': '{n} behind plan',
      'ac.ritmo': 'On plan', 'ac.termina': 'At the current pace you finish on <b>{d}</b>', 'ac.depois': '(after the wedding)',
      'ac.real': 'Actual (left to do)', 'ac.plan': 'Planned', 'ac.proj': 'Projection', 'ac.hoje': 'today', 'ac.faltam_n': '{n} left',
      'ac.tabela': 'View as table', 'ac.data': 'Date', 'ac.real_c': 'Actual', 'ac.aria': 'Burndown: {r} of {t} tasks left; planned for today {e}',
      'ac.niv_critico': 'Overdue', 'ac.niv_aviso': 'Due soon', 'ac.niv_info': 'Good to know', 'ac.nada': 'Nothing overdue. All on track!',
      'al.atrasadas': ['{n} overdue task', '{n} overdue tasks'], 'al.ritmo': 'Pace below plan',
      'al.ritmo_x': ['{n} task behind schedule.', '{n} tasks behind schedule.'],
      'al.etapa': ['{n} task for this stage', '{n} tasks for this stage'], 'al.etapa_x': '{etapa} · by {fim}',
      'al.vencida': '{forn}: instalment {num} overdue', 'al.vencida_x': ['{valor} · was due on {venc} ({n} day)', '{valor} · was due on {venc} ({n} days)'],
      'al.entrada': '{forn}: deposit outstanding', 'al.entrada_x': '{valor} · due on {venc}',
      'al.vence': '{forn}: instalment {num} due on {venc}', 'al.vence_hoje': '{forn}: instalment {num} due today',
      'al.quitar': '{forn}: pay off before the wedding', 'al.quitar_x': '{valor} outstanding',
      'al.assessoria': 'Wedding planning: payment overdue', 'al.assessoria_x': '{valor} overdue to Tayná',
    },
    es: {
      titulo: 'Nuestra boda', carregando: 'Cargando…', sair: 'Salir', idioma: 'Idioma', data_definir: 'fecha por definir',
      faltam_dias: 'Faltan {n} días', amanha: '¡Es mañana!', hoje_e: '¡Es hoy!', realizado: 'Boda celebrada',
      previa: 'Vista previa del área de la pareja (estás viendo lo que ve la pareja).', aba_prep: 'Preparativos', aba_forn: 'Proveedores', atencao: 'Atención',
      salvo: 'Guardado ✔', concluida_ok: 'Tarea completada ✔', situacao_ok: 'Estado guardado ✔', salvando: 'Guardando…', erro_salvar: 'No se pudo guardar.',
      tag_atrasada: 'atrasada', tag_voces: 'por ustedes', tag_voces_tit: 'Ustedes actualizaron esta tarea', obs: 'Observación', situacao: 'Estado',
      nenhuma_concluida: 'Todavía no hay tareas completadas.', n_a_fazer: '{n} por hacer', periodo: '{ini} a {fim}', etapa_feita: 'Todo hecho en esta etapa ✔',
      nada_pendente: 'No hay tareas pendientes aquí.', kpi_concluidas: 'Completadas', x_de_y: '{a} de {b}', kpi_andamento: 'En curso',
      kpi_ritmo: 'Ritmo', ritmo_atrasado: 'Tenemos que acelerar', ritmo_adiantado: 'Adelantados', ritmo_em_dia: 'Al día',
      ajuda_prep: 'Actualicen el estado de cada tarea y dejen una observación para Tayná. Todo se guarda al instante.',
      ver_como: 'Ver como', v_lista: 'Lista', v_quadro: 'Tablero', v_grafico: 'Avance', mostrar: 'Mostrar', f_afazer: 'Por hacer',
      f_todas: 'Abrir todas las etapas', f_feitas: 'Completadas ({n})',
      ajuda_quadro: 'Arrastren las tareas entre columnas o toquen una tarea para cambiar su estado.',
      tit_grafico: 'Cuántas tareas faltan hasta la boda',
      ajuda_grafico: 'La línea discontinua es lo planificado por Tayná; la línea continua, lo que realmente falta. Si la continua está por encima de la discontinua, es hora de acelerar.',
      forn_vazio: 'Todavía no hay proveedores. En cuanto Tayná los registre, aparecerán aquí con importes, vencimientos y pagos.',
      kpi_contratado: 'Contratado', kpi_pago: 'Pagado', kpi_apagar: 'Por pagar', parcelas_vencidas: ['{n} cuota vencida:', '{n} cuotas vencidas:'],
      proximos: 'Próximos vencimientos', b_quitado: 'saldado', b_vencida: 'vencida', b_sem_valor: 'sin importe', b_aberto: 'pendiente', a_pagar_min: 'por pagar',
      prox: 'próx. {d}', h_valores: 'Importes', l_entrada: 'Anticipo', paga_ok: 'pagado ✔', l_parcelas: 'Cuotas', venc_vencida: 'vencida', ord: '{n}.ª',
      h_contato: 'Contacto', h_dados: 'Datos para el pago', h_contratado: 'Qué está contratado', h_pagamentos: 'Pagos',
      p_parcela: 'Cuota', p_entrada: 'Anticipo', p_avulso: 'Pago suelto', p_voces: 'enviado por ustedes', comprov_ok: 'comprobante ✔',
      nenhum_pag: 'No hay pagos registrados.', enviar_pag: 'Enviar pago',
      dlg_oque: 'Qué se pagó', tp_entrada: 'Anticipo', tp_parcela: 'Cuota', tp_avulso: 'Pago suelto', dlg_valor: 'Importe (R$)',
      dlg_data: 'Fecha del pago', dlg_forma: 'Forma', f_PIX: 'PIX', f_Transferência: 'Transferencia', f_Boleto: 'Boleto', f_Cartão: 'Tarjeta', f_Dinheiro: 'Efectivo',
      dlg_comp: 'Comprobante (foto o PDF)', dlg_obs: 'Observación (opcional)', dlg_obs_ex: 'Ej.: cuota de diciembre',
      dlg_aviso: 'Una vez enviado, el pago <b>no puede ser modificado</b> por ustedes. Si algo está mal, hablen con Tayná.',
      cancelar: 'Cancelar', enviando: 'Enviando…', e_valor: 'Indiquen el importe pagado.', e_data: 'Indiquen la fecha del pago.',
      e_comp: 'Adjunten el comprobante (foto o PDF).', e_grande: 'El comprobante supera los 15 MB. Envíen una foto o PDF más pequeño.',
      pag_ok: 'Pago enviado ✔ Tayná ya puede verlo.', erro_enviar: 'No se pudo enviar.',
      'st.': 'Por hacer', 'st.EM ANDAMENTO': 'En curso', 'st.EM COTAÇÃO': 'Cotizando', 'st.FINALIZADO': 'Completada', 'st.NÃO SE APLICA': 'No aplica', 'st.NÃO DESEJO': 'No lo queremos',
      etapa: ['{n} mes antes', '{n} meses antes'],
      'ac.filtrar': 'Filtrar tareas', 'ac.todas': 'Todas', 'ac.etapa_atual': 'Etapa actual', 'ac.atrasadas': 'Atrasadas ({n})', 'ac.buscar': 'Buscar tarea',
      'ac.arraste': 'Arrastren una tarea aquí', 'ac.nenhuma': 'Ninguna', 'ac.mostrar_todas': 'Mostrar todas ({n})', 'ac.ate': 'hasta {d}',
      'ac.concluida_em': 'completada el {d}', 'ac.obs_ph': 'Algo que el equipo deba saber', 'ac.salvar': 'Guardar',
      'ac.sem_dados': 'Sin fecha de boda o sin tareas: el gráfico aparecerá cuando las haya.', 'ac.faltam': 'Faltan <b>{r}</b> de {t}',
      'ac.previsto': 'Previsto para hoy: <b>{n}</b>', 'ac.tudo': 'Todo completado', 'ac.frente': '{n} por delante de lo previsto', 'ac.atras': '{n} por detrás de lo previsto',
      'ac.ritmo': 'Según lo previsto', 'ac.termina': 'Al ritmo actual terminan el <b>{d}</b>', 'ac.depois': '(después de la boda)',
      'ac.real': 'Real (lo que falta)', 'ac.plan': 'Planificado', 'ac.proj': 'Proyección', 'ac.hoje': 'hoy', 'ac.faltam_n': 'faltan {n}',
      'ac.tabela': 'Ver en tabla', 'ac.data': 'Fecha', 'ac.real_c': 'Real', 'ac.aria': 'Burndown: faltan {r} de {t} tareas; previsto para hoy {e}',
      'ac.niv_critico': 'Atrasado', 'ac.niv_aviso': 'Vence pronto', 'ac.niv_info': 'Para saber', 'ac.nada': 'Nada atrasado. ¡Todo al día!',
      'al.atrasadas': ['{n} tarea atrasada', '{n} tareas atrasadas'], 'al.ritmo': 'Ritmo por debajo de lo previsto',
      'al.ritmo_x': ['{n} tarea atrasada respecto al cronograma.', '{n} tareas atrasadas respecto al cronograma.'],
      'al.etapa': ['{n} tarea para esta etapa', '{n} tareas para esta etapa'], 'al.etapa_x': '{etapa} · hasta {fim}',
      'al.vencida': '{forn}: cuota {num} vencida', 'al.vencida_x': ['{valor} · venció el {venc} ({n} día)', '{valor} · venció el {venc} ({n} días)'],
      'al.entrada': '{forn}: anticipo pendiente', 'al.entrada_x': '{valor} · previsto para el {venc}',
      'al.vence': '{forn}: la cuota {num} vence el {venc}', 'al.vence_hoje': '{forn}: la cuota {num} vence hoy',
      'al.quitar': '{forn}: saldar antes de la boda', 'al.quitar_x': '{valor} pendiente',
      'al.assessoria': 'Asesoría: pago atrasado', 'al.assessoria_x': '{valor} atrasado con Tayná',
    },
    fr: {
      titulo: 'Notre mariage', carregando: 'Chargement…', sair: 'Se déconnecter', idioma: 'Langue', data_definir: 'date à définir',
      faltam_dias: 'Plus que {n} jours', amanha: "C'est demain !", hoje_e: "C'est aujourd'hui !", realizado: 'Mariage célébré',
      previa: "Aperçu de l'espace des mariés (vous le voyez comme le couple).", aba_prep: 'Préparatifs', aba_forn: 'Prestataires', atencao: 'Attention',
      salvo: 'Enregistré ✔', concluida_ok: 'Tâche terminée ✔', situacao_ok: 'Statut enregistré ✔', salvando: 'Enregistrement…', erro_salvar: "Impossible d'enregistrer.",
      tag_atrasada: 'en retard', tag_voces: 'par vous', tag_voces_tit: 'Vous avez mis à jour cette tâche', obs: 'Remarque', situacao: 'Statut',
      nenhuma_concluida: 'Aucune tâche terminée pour le moment.', n_a_fazer: '{n} à faire', periodo: 'du {ini} au {fim}', etapa_feita: 'Tout est fait pour cette étape ✔',
      nada_pendente: 'Aucune tâche en attente ici.', kpi_concluidas: 'Terminées', x_de_y: '{a} sur {b}', kpi_andamento: 'En cours',
      kpi_ritmo: 'Rythme', ritmo_atrasado: 'Il faut accélérer', ritmo_adiantado: "En avance", ritmo_em_dia: 'Dans les temps',
      ajuda_prep: 'Mettez à jour le statut de chaque tâche et laissez une remarque pour Tayná. Tout est enregistré immédiatement.',
      ver_como: 'Afficher en', v_lista: 'Liste', v_quadro: 'Tableau', v_grafico: 'Avancement', mostrar: 'Afficher', f_afazer: 'À faire',
      f_todas: 'Ouvrir toutes les étapes', f_feitas: 'Terminées ({n})',
      ajuda_quadro: 'Faites glisser les tâches entre les colonnes ou touchez une tâche pour changer son statut.',
      tit_grafico: "Combien de tâches reste-t-il d'ici le mariage",
      ajuda_grafico: "La ligne pointillée est le planning de Tayná ; la ligne pleine, ce qui reste réellement. Si la ligne pleine est au-dessus de la pointillée, il est temps d'accélérer.",
      forn_vazio: "Aucun prestataire pour l'instant. Dès que Tayná les ajoutera, ils apparaîtront ici avec montants, échéances et paiements.",
      kpi_contratado: 'Contracté', kpi_pago: 'Payé', kpi_apagar: 'Reste à payer', parcelas_vencidas: ['{n} échéance en retard :', '{n} échéances en retard :'],
      proximos: 'Prochaines échéances', b_quitado: 'soldé', b_vencida: 'en retard', b_sem_valor: 'sans montant', b_aberto: 'en cours', a_pagar_min: 'reste à payer',
      prox: 'proch. {d}', h_valores: 'Montants', l_entrada: 'Acompte', paga_ok: 'payé ✔', l_parcelas: 'Échéances', venc_vencida: 'en retard', ord: '{n}e',
      h_contato: 'Contact', h_dados: 'Coordonnées de paiement', h_contratado: 'Prestation contractée', h_pagamentos: 'Paiements',
      p_parcela: 'Échéance', p_entrada: 'Acompte', p_avulso: 'Ponctuel', p_voces: 'envoyé par vous', comprov_ok: 'justificatif ✔',
      nenhum_pag: 'Aucun paiement enregistré.', enviar_pag: 'Envoyer un paiement',
      dlg_oque: 'Ce qui a été payé', tp_entrada: 'Acompte', tp_parcela: 'Échéance', tp_avulso: 'Paiement ponctuel', dlg_valor: 'Montant (R$)',
      dlg_data: 'Date du paiement', dlg_forma: 'Moyen', f_PIX: 'PIX', f_Transferência: 'Virement', f_Boleto: 'Boleto', f_Cartão: 'Carte', f_Dinheiro: 'Espèces',
      dlg_comp: 'Justificatif (photo ou PDF)', dlg_obs: 'Remarque (facultatif)', dlg_obs_ex: 'Ex. : échéance de décembre',
      dlg_aviso: 'Une fois envoyé, le paiement <b>ne peut plus être modifié</b> par vous. En cas d\'erreur, parlez à Tayná.',
      cancelar: 'Annuler', enviando: 'Envoi…', e_valor: 'Indiquez le montant payé.', e_data: 'Indiquez la date du paiement.',
      e_comp: 'Joignez le justificatif (photo ou PDF).', e_grande: 'Le justificatif dépasse 15 Mo. Envoyez une photo ou un PDF plus léger.',
      pag_ok: 'Paiement envoyé ✔ Tayná peut déjà le voir.', erro_enviar: "Impossible d'envoyer.",
      'st.': 'À faire', 'st.EM ANDAMENTO': 'En cours', 'st.EM COTAÇÃO': 'Devis en cours', 'st.FINALIZADO': 'Terminée', 'st.NÃO SE APLICA': 'Non applicable', 'st.NÃO DESEJO': 'Nous ne le voulons pas',
      etapa: ['{n} mois avant', '{n} mois avant'],
      'ac.filtrar': 'Filtrer les tâches', 'ac.todas': 'Toutes', 'ac.etapa_atual': 'Étape actuelle', 'ac.atrasadas': 'En retard ({n})', 'ac.buscar': 'Rechercher une tâche',
      'ac.arraste': 'Faites glisser une tâche ici', 'ac.nenhuma': 'Aucune', 'ac.mostrar_todas': 'Tout afficher ({n})', 'ac.ate': "jusqu'au {d}",
      'ac.concluida_em': 'terminée le {d}', 'ac.obs_ph': "Quelque chose que l'équipe doit savoir", 'ac.salvar': 'Enregistrer',
      'ac.sem_dados': 'Pas de date de mariage ou pas de tâches : le graphique apparaîtra dès que possible.', 'ac.faltam': 'Reste <b>{r}</b> sur {t}',
      'ac.previsto': "Prévu pour aujourd'hui : <b>{n}</b>", 'ac.tudo': 'Tout est terminé', 'ac.frente': "{n} d'avance sur le planning", 'ac.atras': '{n} de retard sur le planning',
      'ac.ritmo': 'Conforme au planning', 'ac.termina': 'Au rythme actuel, fin le <b>{d}</b>', 'ac.depois': '(après le mariage)',
      'ac.real': 'Réel (reste à faire)', 'ac.plan': 'Prévu', 'ac.proj': 'Projection', 'ac.hoje': "aujourd'hui", 'ac.faltam_n': 'reste {n}',
      'ac.tabela': 'Voir en tableau', 'ac.data': 'Date', 'ac.real_c': 'Réel', 'ac.aria': "Burndown : reste {r} tâches sur {t} ; prévu pour aujourd'hui {e}",
      'ac.niv_critico': 'En retard', 'ac.niv_aviso': 'Bientôt dû', 'ac.niv_info': 'Bon à savoir', 'ac.nada': 'Rien en retard. Tout est à jour !',
      'al.atrasadas': ['{n} tâche en retard', '{n} tâches en retard'], 'al.ritmo': 'Rythme inférieur au planning',
      'al.ritmo_x': ['{n} tâche en retard sur le planning.', '{n} tâches en retard sur le planning.'],
      'al.etapa': ['{n} tâche pour cette étape', '{n} tâches pour cette étape'], 'al.etapa_x': "{etapa} · jusqu'au {fim}",
      'al.vencida': '{forn} : échéance {num} en retard', 'al.vencida_x': ['{valor} · échue le {venc} ({n} jour)', '{valor} · échue le {venc} ({n} jours)'],
      'al.entrada': '{forn} : acompte non réglé', 'al.entrada_x': '{valor} · prévu le {venc}',
      'al.vence': "{forn} : l'échéance {num} arrive le {venc}", 'al.vence_hoje': "{forn} : l'échéance {num} est due aujourd'hui",
      'al.quitar': '{forn} : à solder avant le mariage', 'al.quitar_x': '{valor} restant',
      'al.assessoria': 'Organisation : paiement en retard', 'al.assessoria_x': '{valor} en retard envers Tayná',
    },
    de: {
      titulo: 'Unsere Hochzeit', carregando: 'Wird geladen…', sair: 'Abmelden', idioma: 'Sprache', data_definir: 'Datum noch offen',
      faltam_dias: 'Noch {n} Tage', amanha: 'Morgen ist es so weit!', hoje_e: 'Heute ist der große Tag!', realizado: 'Hochzeit gefeiert',
      previa: 'Vorschau des Brautpaar-Bereichs (so sieht ihn das Paar).', aba_prep: 'Vorbereitungen', aba_forn: 'Dienstleister', atencao: 'Achtung',
      salvo: 'Gespeichert ✔', concluida_ok: 'Aufgabe erledigt ✔', situacao_ok: 'Status gespeichert ✔', salvando: 'Wird gespeichert…', erro_salvar: 'Speichern nicht möglich.',
      tag_atrasada: 'überfällig', tag_voces: 'von euch', tag_voces_tit: 'Ihr habt diese Aufgabe aktualisiert', obs: 'Notiz', situacao: 'Status',
      nenhuma_concluida: 'Noch keine Aufgabe erledigt.', n_a_fazer: '{n} offen', periodo: '{ini} bis {fim}', etapa_feita: 'In dieser Phase ist alles erledigt ✔',
      nada_pendente: 'Hier ist nichts offen.', kpi_concluidas: 'Erledigt', x_de_y: '{a} von {b}', kpi_andamento: 'In Arbeit',
      kpi_ritmo: 'Tempo', ritmo_atrasado: 'Wir müssen schneller werden', ritmo_adiantado: 'Vor dem Plan', ritmo_em_dia: 'Im Plan',
      ajuda_prep: 'Aktualisiert den Status jeder Aufgabe und hinterlasst eine Notiz für Tayná. Alles wird sofort gespeichert.',
      ver_como: 'Ansicht', v_lista: 'Liste', v_quadro: 'Board', v_grafico: 'Fortschritt', mostrar: 'Anzeigen', f_afazer: 'Offen',
      f_todas: 'Alle Phasen öffnen', f_feitas: 'Erledigt ({n})',
      ajuda_quadro: 'Zieht Aufgaben zwischen die Spalten oder tippt eine Aufgabe an, um den Status zu ändern.',
      tit_grafico: 'Wie viele Aufgaben bis zur Hochzeit noch offen sind',
      ajuda_grafico: 'Die gestrichelte Linie ist Taynás Plan, die durchgezogene das, was tatsächlich noch offen ist. Liegt die durchgezogene über der gestrichelten, ist es Zeit, Tempo zu machen.',
      forn_vazio: 'Noch keine Dienstleister eingetragen. Sobald Tayná sie anlegt, erscheinen sie hier mit Beträgen, Fälligkeiten und Zahlungen.',
      kpi_contratado: 'Vereinbart', kpi_pago: 'Bezahlt', kpi_apagar: 'Offen', parcelas_vencidas: ['{n} überfällige Rate:', '{n} überfällige Raten:'],
      proximos: 'Nächste Fälligkeiten', b_quitado: 'bezahlt', b_vencida: 'überfällig', b_sem_valor: 'ohne Betrag', b_aberto: 'offen', a_pagar_min: 'offen',
      prox: 'nächste {d}', h_valores: 'Beträge', l_entrada: 'Anzahlung', paga_ok: 'bezahlt ✔', l_parcelas: 'Raten', venc_vencida: 'überfällig', ord: '{n}.',
      h_contato: 'Kontakt', h_dados: 'Zahlungsdaten', h_contratado: 'Vereinbarte Leistung', h_pagamentos: 'Zahlungen',
      p_parcela: 'Rate', p_entrada: 'Anzahlung', p_avulso: 'Einzelzahlung', p_voces: 'von euch gesendet', comprov_ok: 'Beleg ✔',
      nenhum_pag: 'Keine Zahlungen erfasst.', enviar_pag: 'Zahlung senden',
      dlg_oque: 'Was wurde bezahlt', tp_entrada: 'Anzahlung', tp_parcela: 'Rate', tp_avulso: 'Einzelzahlung', dlg_valor: 'Betrag (R$)',
      dlg_data: 'Zahlungsdatum', dlg_forma: 'Zahlungsart', f_PIX: 'PIX', f_Transferência: 'Überweisung', f_Boleto: 'Boleto', f_Cartão: 'Karte', f_Dinheiro: 'Bar',
      dlg_comp: 'Beleg (Foto oder PDF)', dlg_obs: 'Notiz (optional)', dlg_obs_ex: 'z. B. Rate für Dezember',
      dlg_aviso: 'Nach dem Senden <b>könnt ihr die Zahlung nicht mehr ändern</b>. Wenn etwas nicht stimmt, sprecht mit Tayná.',
      cancelar: 'Abbrechen', enviando: 'Wird gesendet…', e_valor: 'Bitte den bezahlten Betrag angeben.', e_data: 'Bitte das Zahlungsdatum angeben.',
      e_comp: 'Bitte den Beleg anhängen (Foto oder PDF).', e_grande: 'Der Beleg ist größer als 15 MB. Bitte ein kleineres Foto oder PDF senden.',
      pag_ok: 'Zahlung gesendet ✔ Tayná kann sie schon sehen.', erro_enviar: 'Senden nicht möglich.',
      'st.': 'Offen', 'st.EM ANDAMENTO': 'In Arbeit', 'st.EM COTAÇÃO': 'Angebote einholen', 'st.FINALIZADO': 'Erledigt', 'st.NÃO SE APLICA': 'Entfällt', 'st.NÃO DESEJO': 'Möchten wir nicht',
      etapa: ['{n} Monat vorher', '{n} Monate vorher'],
      'ac.filtrar': 'Aufgaben filtern', 'ac.todas': 'Alle', 'ac.etapa_atual': 'Aktuelle Phase', 'ac.atrasadas': 'Überfällig ({n})', 'ac.buscar': 'Aufgabe suchen',
      'ac.arraste': 'Aufgabe hierher ziehen', 'ac.nenhuma': 'Keine', 'ac.mostrar_todas': 'Alle anzeigen ({n})', 'ac.ate': 'bis {d}',
      'ac.concluida_em': 'erledigt am {d}', 'ac.obs_ph': 'Etwas, das das Team wissen sollte', 'ac.salvar': 'Speichern',
      'ac.sem_dados': 'Kein Hochzeitsdatum oder keine Aufgaben: Das Diagramm erscheint, sobald es sie gibt.', 'ac.faltam': 'Noch <b>{r}</b> von {t}',
      'ac.previsto': 'Plan für heute: <b>{n}</b>', 'ac.tudo': 'Alles erledigt', 'ac.frente': '{n} vor dem Plan', 'ac.atras': '{n} hinter dem Plan',
      'ac.ritmo': 'Im Plan', 'ac.termina': 'Im aktuellen Tempo fertig am <b>{d}</b>', 'ac.depois': '(nach der Hochzeit)',
      'ac.real': 'Tatsächlich (offen)', 'ac.plan': 'Geplant', 'ac.proj': 'Prognose', 'ac.hoje': 'heute', 'ac.faltam_n': 'noch {n}',
      'ac.tabela': 'Als Tabelle anzeigen', 'ac.data': 'Datum', 'ac.real_c': 'Tatsächlich', 'ac.aria': 'Burndown: noch {r} von {t} Aufgaben; Plan für heute {e}',
      'ac.niv_critico': 'Überfällig', 'ac.niv_aviso': 'Bald fällig', 'ac.niv_info': 'Gut zu wissen', 'ac.nada': 'Nichts überfällig. Alles im Plan!',
      'al.atrasadas': ['{n} überfällige Aufgabe', '{n} überfällige Aufgaben'], 'al.ritmo': 'Tempo unter Plan',
      'al.ritmo_x': ['{n} Aufgabe hinter dem Zeitplan.', '{n} Aufgaben hinter dem Zeitplan.'],
      'al.etapa': ['{n} Aufgabe für diese Phase', '{n} Aufgaben für diese Phase'], 'al.etapa_x': '{etapa} · bis {fim}',
      'al.vencida': '{forn}: Rate {num} überfällig', 'al.vencida_x': ['{valor} · fällig seit {venc} ({n} Tag)', '{valor} · fällig seit {venc} ({n} Tagen)'],
      'al.entrada': '{forn}: Anzahlung offen', 'al.entrada_x': '{valor} · fällig am {venc}',
      'al.vence': '{forn}: Rate {num} fällig am {venc}', 'al.vence_hoje': '{forn}: Rate {num} heute fällig',
      'al.quitar': '{forn}: vor der Hochzeit begleichen', 'al.quitar_x': '{valor} offen',
      'al.assessoria': 'Hochzeitsplanung: Zahlung überfällig', 'al.assessoria_x': '{valor} bei Tayná überfällig',
    },
  };

  Object.keys(D).forEach(function (l) { D[l]['ac.erro'] = D[l].erro_salvar; });
  function lerCookie() { var m = /(?:^|;\s*)lotus_idioma=([a-z]{2})/.exec(document.cookie || ''); return m ? m[1] : null; }
  function valido(l) { l = String(l || '').slice(0, 2).toLowerCase(); return D[l] ? l : null; }
  function detectar() {
    var q = valido(new URLSearchParams(location.search).get('idioma'));
    if (q) { gravar(q); return q; }
    var s = null; try { s = valido(localStorage.getItem('lotus_idioma')); } catch (e) { /* sem storage */ }
    if (s) return s;
    var c = valido(lerCookie()); if (c) return c;
    // sem escolha feita: pelo país onde a pessoa está (local.js), guardado só nesta sessão
    if (window.IdiomaLocal) {
      var loc = window.IdiomaLocal.detectar(Object.keys(D));
      var dom = /(^|\.)taynaalvesassessoria\.com\.br$/.test(location.hostname) ? '; Domain=.taynaalvesassessoria.com.br' : '';
      document.cookie = 'lotus_local=' + loc.idioma + '; Path=/; SameSite=Lax' + dom + (location.protocol === 'https:' ? '; Secure' : '');
      return loc.idioma;
    }
    var nav = (navigator.languages && navigator.languages.length ? navigator.languages : [navigator.language || 'pt']);
    for (var i = 0; i < nav.length; i++) { var v = valido(nav[i]); if (v) return v; }
    return 'pt';
  }
  function gravar(l) {
    try { localStorage.setItem('lotus_idioma', l); } catch (e) { /* ok */ }
    document.cookie = 'lotus_idioma=' + l + '; Path=/; Max-Age=31536000; SameSite=Lax' + (location.protocol === 'https:' ? '; Secure' : '');
  }
  var atual = detectar();
  var locale = IDIOMAS.filter(function (x) { return x.id === atual; })[0].locale;
  document.documentElement.lang = locale;

  function t(chave, p) {
    p = p || {};
    var v = D[atual][chave]; if (v === undefined) v = D.pt[chave]; if (v === undefined) return chave;
    if (Array.isArray(v)) v = Number(p.n) === 1 ? v[0] : v[1];
    return String(v).replace(/\{(\w+)\}/g, function (m, k) { return p[k] !== undefined ? p[k] : m; });
  }
  function moeda(n) { return n === null || n === undefined ? '—' : Number(n).toLocaleString(locale, { style: 'currency', currency: 'BRL' }); }
  // aceita AAAA-MM-DD ou DD/MM/AAAA
  function data(v, longa) {
    var s = String(v || ''); var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(s); var a, me, d;
    if (m) { a = +m[1]; me = +m[2]; d = +m[3]; } else { m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(s); if (!m) return s; a = +m[3]; me = +m[2]; d = +m[1]; }
    if (atual === 'pt' && !longa) return pad(d) + '/' + pad(me) + '/' + a;
    return new Date(a, me - 1, d).toLocaleDateString(locale, longa ? { day: 'numeric', month: 'long', year: 'numeric' } : { day: 'numeric', month: 'short', year: 'numeric' });
  }
  function pad(n) { return String(n).padStart(2, '0'); }
  function etapa(meses) { return t('etapa', { n: meses }); }
  function status(st) { return t('st.' + (st || '')); }
  /** Título e texto de um alerta no idioma (usa o código; sem código, o texto em português). */
  function alerta(a) {
    if (!a.codigo || !a.p) return { titulo: a.titulo, texto: a.texto };
    var p = a.p; var c = a.codigo;
    var q = { n: p.n, forn: p.forn, num: p.num, valor: p.valor !== undefined ? moeda(p.valor) : '', venc: p.venc ? data(p.venc) : '', fim: p.fim ? data(p.fim) : '', lista: p.lista, etapa: p.meses ? etapa(p.meses) : '' };
    if (c === 'atrasadas') return { titulo: t('al.atrasadas', q), texto: p.lista };
    if (c === 'ritmo') return { titulo: t('al.ritmo'), texto: t('al.ritmo_x', q) };
    if (c === 'etapa') return { titulo: t('al.etapa', q), texto: t('al.etapa_x', q) };
    if (c === 'vencida') { q.n = p.dias; return { titulo: t('al.vencida', q), texto: t('al.vencida_x', q) }; }
    if (c === 'entrada') return { titulo: t('al.entrada', q), texto: t('al.entrada_x', q) };
    if (c === 'vence') return { titulo: t(p.hoje ? 'al.vence_hoje' : 'al.vence', q), texto: q.valor };
    if (c === 'quitar') return { titulo: t('al.quitar', q), texto: t('al.quitar_x', q) };
    if (c === 'assessoria') return { titulo: t('al.assessoria'), texto: t('al.assessoria_x', q) };
    return { titulo: a.titulo, texto: a.texto };
  }
  function seletor() {
    return '<select class="seletor-idioma" aria-label="' + t('idioma') + '" title="' + t('idioma') + '">' + IDIOMAS.map(function (x) {
      return '<option value="' + x.id + '"' + (x.id === atual ? ' selected' : '') + '>' + x.id.toUpperCase() + ' · ' + x.nome + '</option>';
    }).join('') + '</select>';
  }
  function ligarSeletor(raiz) {
    (raiz || document).querySelectorAll('select.seletor-idioma').forEach(function (s) {
      s.onchange = function () { gravar(s.value); var u = new URL(location.href); u.searchParams.delete('idioma'); location.replace(u.toString()); };
    });
  }
  /** Troca os textos marcados com data-i18n (conteúdo), data-i18n-html, data-i18n-ph (placeholder). */
  function aplicar(raiz) {
    (raiz || document).querySelectorAll('[data-i18n]').forEach(function (el) { el.textContent = t(el.getAttribute('data-i18n')); });
    (raiz || document).querySelectorAll('[data-i18n-html]').forEach(function (el) { el.innerHTML = t(el.getAttribute('data-i18n-html')); });
    (raiz || document).querySelectorAll('[data-i18n-ph]').forEach(function (el) { el.setAttribute('placeholder', t(el.getAttribute('data-i18n-ph'))); });
  }
  window.I18N = { idioma: atual, locale: locale, IDIOMAS: IDIOMAS, t: t, moeda: moeda, data: data, etapa: etapa, status: status, alerta: alerta, seletor: seletor, ligarSeletor: ligarSeletor, aplicar: aplicar, gravar: gravar };
})();
