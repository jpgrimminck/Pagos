document.addEventListener('DOMContentLoaded', () => {

    // --- CONFIGURACIÓN EDITABLE DESDE JSON ---

    let config = null;
    let apoderados = [];
    let VALOR_CLASE = 0;
    let DIAS_SEMANA = [];
    let meses = [];
    let diasSemanaMap = {};

    // --- ELEMENTOS DEL DOM ---
    const apoderadoSelector = document.getElementById('apoderadoSelector');
    const generateBtn = document.getElementById('generateBtn');
    const copyBtn = document.getElementById('copyBtn');
    const output = document.getElementById('output');
    const selectedApoderadoInfo = document.getElementById('selectedApoderadoInfo');
    const mainTitle = document.getElementById('mainTitle');

    // --- INICIALIZACIÓN ASÍNCRONA ---
    fetch('alumnos.json')
        .then(response => {
            if (!response.ok) throw new Error('No se pudo cargar la configuración');
            return response.json();
        })
        .then(json => {
            config = json;
            apoderados = config.apoderados;
            VALOR_CLASE = config.valorClase;
            DIAS_SEMANA = config.diasSemana;
            meses = config.meses;
            diasSemanaMap = Object.fromEntries(DIAS_SEMANA.map((dia, i) => [dia, i]));

            // Llamar inicialización y renderizado
            actualizarTitulo();
            renderizarSelector();
            displaySelectedInfo();
        })
        .catch(err => {
            mainTitle.textContent = 'Error al cargar configuración';
            output.innerHTML = 'No se pudo cargar la información de apoderados.';
            console.error(err);
        });

    // --- FUNCIONES DE UTILIDAD ---
    function actualizarTitulo() {
        // Mostrar días restantes hasta el próximo mes
        const hoy = new Date();
        const anio = hoy.getFullYear();
        const mes = hoy.getMonth();
        const siguienteMesIndex = (mes + 1) % 12;
        const siguienteMes = config.meses[siguienteMesIndex];
        // Total de días del mes actual
        const totalDiasMesActual = new Date(anio, mes + 1, 0).getDate();
        const diasRestantes = totalDiasMesActual - hoy.getDate();
        mainTitle.textContent = `${diasRestantes} días para ${siguienteMes}`;
        document.title = `Pagos (${diasRestantes} días para ${siguienteMes})`;
    }

    // --- FUNCIONES DE RENDERIZADO Y UI ---
    function renderizarSelector() {
        apoderadoSelector.innerHTML = '';
        if (apoderados.length === 0) {
            apoderadoSelector.innerHTML = `<option disabled>No hay apoderados</option>`;
            return;
        }
        // Agrupar apoderados por día de la semana
        const apoderadosPorDia = {};
        const ordenDias = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];
        // Inicializar días
        ordenDias.forEach(dia => {
            apoderadosPorDia[dia] = [];
        });
        // Agrupar apoderados
        apoderados.forEach((ap, index) => {
            apoderadosPorDia[ap.diaSemana].push({ ...ap, originalIndex: index });
        });
        // Renderizar por día
        ordenDias.forEach(dia => {
            if (apoderadosPorDia[dia].length > 0) {
                // Contar total de alumnos para este día
                const totalAlumnos = apoderadosPorDia[dia].reduce((total, ap) => total + ap.alumnos.length, 0);
                // Agregar separador de día (no seleccionable)
                const separador = document.createElement('option');
                separador.disabled = true;
                separador.style.fontWeight = 'bold';
                separador.style.backgroundColor = '#f0f0f0';
                separador.textContent = `${dia.toUpperCase()} (${totalAlumnos} alumnos)`;
                apoderadoSelector.appendChild(separador);
                // Agregar apoderados de este día
                apoderadosPorDia[dia].forEach(ap => {
                    const option = document.createElement('option');
                    option.value = ap.originalIndex;
                    // Ordenar alumnos por horario (más temprano primero)
                    const alumnosOrdenados = [...ap.alumnos].sort((a, b) => a.hora.localeCompare(b.hora));
                    // Formatear nombres según la cantidad de alumnos
                    let nombresTexto;
                    if (alumnosOrdenados.length === 1) {
                        nombresTexto = alumnosOrdenados[0].nombre;
                    } else if (alumnosOrdenados.length === 2) {
                        nombresTexto = `${alumnosOrdenados[0].nombre} y ${alumnosOrdenados[1].nombre}`;
                    } else {
                        const primeros = alumnosOrdenados.slice(0, -1).map(a => a.nombre).join(', ');
                        const ultimo = alumnosOrdenados[alumnosOrdenados.length - 1].nombre;
                        nombresTexto = `${primeros} y ${ultimo}`;
                    }
                    option.textContent = `${ap.apoderado}, ${nombresTexto}`;
                    apoderadoSelector.appendChild(option);
                });
            }
        });
    }

    function displaySelectedInfo() {
        if (apoderadoSelector.value === '' || apoderados.length === 0) {
            selectedApoderadoInfo.classList.add('hidden');
            output.innerHTML = 'Aquí aparecerá el mensaje para copiar...'; // Borrar mensaje
            return;
        }
        const selected = apoderados[apoderadoSelector.value];
        // Ordenar alumnos por horario para mostrar consistentemente
        const alumnosOrdenados = [...selected.alumnos].sort((a, b) => a.hora.localeCompare(b.hora));
        selectedApoderadoInfo.innerHTML = `<b>Alumnos:</b> ${alumnosOrdenados.map(a => `${a.nombre} (${a.hora})`).join(', ')} | <b>Día:</b> ${selected.diaSemana}`;
        selectedApoderadoInfo.classList.remove('hidden');
        // Borrar el mensaje generado al cambiar de apoderado
        output.innerHTML = 'Aquí aparecerá el mensaje para copiar...';
    }

    // --- FUNCIONES DE DATOS Y LÓGICA ---
    function generarMensaje() {
        const index = apoderadoSelector.value;
        if (index === '' || apoderados.length === 0) { 
            output.innerHTML = "Por favor, selecciona un apoderado."; 
            return; 
        }
        const data = apoderados[index];
        const hoy = new Date();
        const anio = hoy.getFullYear();
        const mes = hoy.getMonth();
        const siguienteMesIndex = (mes + 1) % 12;
        const anioSiguiente = mes === 11 ? anio + 1 : anio;
        const mesAEvaluar = meses[siguienteMesIndex];
        const diaClaseNumero = diasSemanaMap[data.diaSemana];
        let diasDeClase = [];
        let cursorFecha = new Date(anioSiguiente, siguienteMesIndex, 1);
        while (cursorFecha.getMonth() === siguienteMesIndex) {
            if (cursorFecha.getDay() === diaClaseNumero) diasDeClase.push(cursorFecha.getDate());
            cursorFecha.setDate(cursorFecha.getDate() + 1);
        }
        if (diasDeClase.length === 0) { 
            output.innerHTML = `No quedan días "${data.diaSemana}" disponibles en ${mesAEvaluar}.`; 
            return; 
        }
        const cantidadAlumnos = data.alumnos.length;
        const listaDiasTexto = diasDeClase.map(dia => `${data.diaSemana} ${dia} x${cantidadAlumnos}`).join('\n');
        const valorFormateado = (diasDeClase.length * VALOR_CLASE * cantidadAlumnos).toLocaleString('es-CL');
        // Fecha límite: último día del mes anterior al siguiente mes (es decir, fin de este mes)
        const fechaLimite = new Date(anio, mes + 1, 0);
        const diaSemanaLimite = DIAS_SEMANA[fechaLimite.getDay()];
        const limiteFormateado = `${diaSemanaLimite} ${fechaLimite.getDate()} de ${meses[fechaLimite.getMonth()]}, 22:00 hrs`;
        // Ordenar alumnos por horario para el mensaje
        const alumnosOrdenados = [...data.alumnos].sort((a, b) => a.hora.localeCompare(b.hora));
        const alumnosTexto = alumnosOrdenados.map(alumno => `${alumno.nombre} (${alumno.hora})`).join('\n');
        // Crear el mensaje y convertir ** a negrita
        let mensaje = `*Hola ${data.apoderado}, te mando detalle para reservar los días de ${mesAEvaluar}:*\n\n${listaDiasTexto}\n\n${alumnosTexto}\n\nTotal\n*$${valorFormateado}*\n\nFecha límite de pago\n*${limiteFormateado}*`;
        // Convertir ** a <strong> para negrita y preservar saltos de línea
        mensaje = mensaje.replace(/\*(.*?)\*/g, '<strong>$1</strong>');
        mensaje = mensaje.replace(/\n/g, '<br>');
        output.innerHTML = mensaje;
    }

    function copiarMensaje() {
        // Reconstruir texto a partir del HTML preservando negritas como *texto* y saltos de línea
        let textoParaCopiar = (output.innerHTML || '')
            // Negritas HTML a negritas de WhatsApp
            .replace(/<(strong|b)>([\s\S]*?)<\/\1>/gi, '*$2*')
            // Saltos de línea
            .replace(/<br\s*\/?>(?!\n)/gi, '\n')
            // Cerrar bloques como nueva línea
            .replace(/<\/(p|div|li|h1|h2|h3)>/gi, '\n')
            // Eliminar aperturas de bloques
            .replace(/<(p|div|li|ul|ol|h1|h2|h3)[^>]*>/gi, '')
            // Entidades comunes
            .replace(/&nbsp;/gi, ' ')
            .replace(/&amp;/gi, '&')
            .replace(/&lt;/gi, '<')
            .replace(/&gt;/gi, '>')
            // Eliminar cualquier otra etiqueta
            .replace(/<[^>]*>/g, '')
            // Normalizar saltos de línea múltiples
            .replace(/\n{3,}/g, '\n\n')
            .trim();

        if (!textoParaCopiar || textoParaCopiar.includes('Por favor') || textoParaCopiar === 'Aquí aparecerá el mensaje para copiar...') return;

        // Función que intenta usar el portapapeles moderno y cae al textarea temporal en caso de error
        function copiarTexto(texto) {
            if (navigator.clipboard && window.isSecureContext) {
                return navigator.clipboard.writeText(texto);
            }
            return new Promise((resolve, reject) => {
                const textArea = document.createElement('textarea');
                textArea.value = texto;
                // Evitar que salte el viewport
                textArea.setAttribute('readonly', '');
                textArea.style.position = 'absolute';
                textArea.style.left = '-9999px';
                document.body.appendChild(textArea);
                textArea.select();
                textArea.setSelectionRange(0, textArea.value.length);
                try {
                    const ok = document.execCommand('copy');
                    document.body.removeChild(textArea);
                    if (ok) resolve(); else reject(new Error('execCommand returned false'));
                } catch (err) {
                    document.body.removeChild(textArea);
                    reject(err);
                }
            });
        }

    copiarTexto(textoParaCopiar).then(() => {
            const originalText = copyBtn.textContent;
            copyBtn.textContent = 'Copiado!';
            setTimeout(() => { copyBtn.textContent = originalText; }, 2000);
        }).catch(err => {
            console.error('Error al copiar: ', err);
            alert('No se pudo copiar automáticamente. Selecciona y copia el texto del área de mensaje.');
            // Seleccionar todo el texto en el div output para facilitar la copia manual
            const range = document.createRange();
            range.selectNodeContents(output);
            const sel = window.getSelection();
            sel.removeAllRanges();
            sel.addRange(range);
        });
    }

    // --- EVENT LISTENERS ---
    generateBtn.addEventListener('click', generarMensaje);
    copyBtn.addEventListener('click', copiarMensaje);
    apoderadoSelector.addEventListener('change', displaySelectedInfo);
    // --- INICIALIZACIÓN ---
    actualizarTitulo();
    renderizarSelector();
    displaySelectedInfo();
});
