document.addEventListener("DOMContentLoaded", async () => {
    cargarRecordatorios();
    await solicitarPermisosNotificaciones();
    verificarRecordatorios();
    document.getElementById("fecha").valueAsDate = new Date();

    // Verificar conexión a internet
    if (!navigator.onLine) {
        document.getElementById("alerta-red").style.display = "block";
    }
});

let grabando = false;
let recognition;

function toggleGrabar() {
    if (!grabando) {
        iniciarGrabacion();
    } else {
        detenerGrabacion();
    }
}

function iniciarGrabacion() {
    if (!('webkitSpeechRecognition' in window)) {
        alert('Tu navegador no soporta el reconocimiento de voz');
        return;
    }

    recognition = new webkitSpeechRecognition();
    recognition.lang = 'es-ES';
    recognition.continuous = true;
    recognition.interimResults = false;

    recognition.onstart = () => {
        grabando = true;
        document.getElementById("btn-grabar").innerHTML = 
            '<img src="grabadora-de-voz.png" alt="Detener" class="icono-mic">';
    };

    recognition.onresult = (event) => {
        const transcript = event.results[event.results.length - 1][0].transcript.trim();
        document.getElementById("tarea").value = transcript;
    };

    recognition.onerror = (event) => {
        console.error('Error en el reconocimiento de voz:', event.error);
        alert('Error al grabar. Asegúrate de que el micrófono esté habilitado.');
    };

    recognition.onend = () => {
        grabando = false;
        document.getElementById("btn-grabar").innerHTML = 
            '<img src="grabadora-de-voz.png" alt="Grabar" class="icono-mic">';
    };

    recognition.start();
}

function detenerGrabacion() {
    if (recognition) {
        recognition.stop();
    }
}

async function solicitarPermisosNotificaciones() {
    if ('Notification' in window && 'serviceWorker' in navigator) {
        try {
            const registro = await navigator.serviceWorker.register('service-worker.js');
            const permiso = await Notification.requestPermission();
            if (permiso === 'granted') {
                console.log('Notificaciones permitidas');
            }
        } catch (error) {
            console.error('Error al registrar service worker:', error);
        }
    }
}

function mostrarNotificacion(titulo, cuerpo) {
    if (Notification.permission === 'granted' && navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({ titulo, cuerpo });
    }
}

function agregarRecordatorio() {
    const tarea = document.getElementById("tarea").value.trim();
    const fecha = document.getElementById("fecha").value;
    const recurrente = document.getElementById("recurrente").checked;
    const intervalo = recurrente ? parseInt(document.getElementById("intervalo").value) : 0;

    if (!tarea || !fecha) {
        alert("Completa todos los campos");
        return;
    }

    const fechaRecordatorio = new Date(fecha);
    const fechaNotificacion = new Date(fechaRecordatorio);
    fechaNotificacion.setDate(fechaNotificacion.getDate() - 1);

    const recordatorios = JSON.parse(localStorage.getItem("recordatorios")) || [];
    recordatorios.push({
        fecha,
        tarea,
        recurrente,
        intervalo,
        notificacionAnticipada: fechaNotificacion.toISOString().split("T")[0]
    });

    localStorage.setItem("recordatorios", JSON.stringify(recordatorios));
    document.getElementById("tarea").value = "";
    cargarRecordatorios();
}

function cargarRecordatorios() {
    const contenedor = document.getElementById("recordatorios");
    contenedor.innerHTML = "";

    let recordatorios = JSON.parse(localStorage.getItem("recordatorios")) || [];
    recordatorios.sort((a, b) => new Date(a.fecha) - new Date(b.fecha));

    recordatorios.forEach((r, index) => {
        const div = document.createElement("div");
        div.className = "recordatorio";
        div.innerHTML = `
            <div>${r.tarea}</div>
            <div>
                <small>${formatDate(r.fecha)}</small>
                ${r.recurrente ? `<span class="tag-recurrente"> cada ${r.intervalo} año${r.intervalo > 1 ? 's' : ''}</span>` : ''}
                <button onclick="eliminarRecordatorio(${index})">×</button>
            </div>
        `;
        contenedor.appendChild(div);
    });
}

function eliminarRecordatorio(index) {
    let recordatorios = JSON.parse(localStorage.getItem("recordatorios")) || [];
    recordatorios.splice(index, 1);
    localStorage.setItem("recordatorios", JSON.stringify(recordatorios));
    cargarRecordatorios();
}

function verificarRecordatorios() {
    const hoy = new Date().toISOString().split("T")[0];
    const manana = new Date(new Date().getTime() + 86400000).toISOString().split("T")[0];
    let recordatorios = JSON.parse(localStorage.getItem("recordatorios")) || [];
    const recordatoriosHoy = [];
    const recordatoriosManana = [];

    recordatorios = recordatorios.map(r => {
        const fechaDate = new Date(r.fecha);
        const fechaHoy = new Date(hoy);
        const fechaManana = new Date(manana);

        if (r.notificacionAnticipada === hoy) {
            mostrarNotificacion("⏰ Recordatorio pronto", `Mañana tienes: ${r.tarea}`);
        }

        if (r.recurrente) {
            if (fechaDate <= fechaHoy) {
                recordatoriosHoy.push(r);
                const nextFecha = new Date(fechaDate.setFullYear(fechaDate.getFullYear() + r.intervalo));
                return { ...r, fecha: nextFecha.toISOString().split('T')[0] };
            } else if (fechaDate <= fechaManana) {
                recordatoriosManana.push(r);
            }
        } else {
            if (r.fecha === hoy) {
                recordatoriosHoy.push(r);
            } else if (r.fecha === manana) {
                recordatoriosManana.push(r);
            }
        }
        return r;
    });

    localStorage.setItem("recordatorios", JSON.stringify(recordatorios));

    if (recordatoriosHoy.length > 0) {
        mostrarVentana(recordatoriosHoy, "Hoy");
        mostrarNotificacion("¡Recordatorios de Hoy!", `Tienes ${recordatoriosHoy.length} recordatorio(s)`);
    }

    if (recordatoriosManana.length > 0) {
        mostrarVentana(recordatoriosManana, "Mañana");
        mostrarNotificacion("¡Recordatorio para Mañana!", `Tienes ${recordatoriosManana.length} recordatorio(s)`);
    }
}

function programarNotificaciones() {
    const recordatorios = JSON.parse(localStorage.getItem("recordatorios")) || [];
    const hoy = new Date();

    recordatorios.forEach(r => {
        const fechaRecordatorio = new Date(r.fecha);
        const unDiaAntes = new Date(fechaRecordatorio);
        unDiaAntes.setDate(unDiaAntes.getDate() - 1);

        if (unDiaAntes.toDateString() === hoy.toDateString() && fechaRecordatorio > hoy) {
            mostrarNotificacion("⏰ Recordatorio pronto", `Mañana tienes: ${r.tarea}`);
        }
    });
}

function mostrarVentana(recordatorios, tipo) {
    const ventana = document.getElementById("ventanaRecordatorio");
    const titulo = document.getElementById("tituloRecordatorio");
    const contenido = document.getElementById("contenidoRecordatorio");

    titulo.textContent = `📅 ${tipo} tienes:`;
    contenido.innerHTML = recordatorios.map(r => `
        <div class="item-recordatorio">
            ${r.tarea} 
            ${r.recurrente ? `<small>(Recurrente cada ${r.intervalo} año${r.intervalo > 1 ? 's' : ''})</small>` : ''}
        </div>`).join("");

    ventana.style.display = "flex";
}

function cerrarVentana() {
    document.getElementById("ventanaRecordatorio").style.display = "none";
}

function formatDate(dateString) {
    const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
    return new Date(dateString).toLocaleDateString('es-ES', options);
}