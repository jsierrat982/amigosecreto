// 1. Importaciones
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { 
    getFirestore, collection, addDoc, onSnapshot, 
    query, getDocs, writeBatch, doc, orderBy 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// 2. TU Configuración (La misma de antes)
const firebaseConfig = {
    apiKey: "AIzaSyCp1oDgckf6zRWFEUYxsO8CBWBhlTlLZ_4",
    authDomain: "amigosecretoweb-ba6e2.firebaseapp.com",
    projectId: "amigosecretoweb-ba6e2",
    storageBucket: "amigosecretoweb-ba6e2.firebasestorage.app",
    messagingSenderId: "552672568454",
    appId: "1:552672568454:web:91ec514af15ffcfb209d07",
    measurementId: "G-JW8KLZ8ZF9"
};

// 3. Inicializar Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const COL_NAME = "jugadores";

// 4. Variables de Estado Local
let myName = "";
let myId = "";
let isMyUserAdmin = false; // Nuevo estado para saber si soy admin

// 5. Referencias DOM
const loginForm = document.getElementById('login-form');
const usernameInput = document.getElementById('username-input');
const loginSection = document.getElementById('login-section');
const gameSection = document.getElementById('game-section');
const userStatus = document.getElementById('user-status');
const currentUsernameSpan = document.getElementById('current-username');
const participantsList = document.getElementById('participants-list');
const drawBtn = document.getElementById('draw-btn');
const myResultDiv = document.getElementById('my-result');
const matchNameH2 = document.getElementById('match-name');
const statusText = document.getElementById('status-text');

// --- LÓGICA DEL JUEGO ---

// A. Ingresar a la sala
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const name = usernameInput.value.trim();
    if (!name) return;

    // Deshabilitar botón para evitar doble click
    const submitBtn = loginForm.querySelector('button');
    submitBtn.disabled = true;
    submitBtn.textContent = "Verificando...";

    try {
        // 1. Verificar si soy el primero en entrar (Admin)
        const qSnapshot = await getDocs(collection(db, COL_NAME));
        const amIAdmin = qSnapshot.empty; // True si no hay nadie más

        // 2. Guardar jugador en Firestore
        const docRef = await addDoc(collection(db, COL_NAME), {
            name: name,
            match: null,
            isAdmin: amIAdmin, // Guardamos el rol
            timestamp: Date.now()
        });

        // 3. Actualizar estado local
        myName = name;
        myId = docRef.id;
        isMyUserAdmin = amIAdmin;

        // 4. Cambiar pantalla
        loginSection.classList.add('hidden');
        gameSection.classList.remove('hidden');
        userStatus.classList.remove('hidden');
        
        // Mostrar nombre y etiqueta de admin si corresponde
        currentUsernameSpan.innerHTML = myName;
        if (isMyUserAdmin) {
            const badge = document.createElement('span');
            badge.className = 'admin-badge';
            badge.textContent = 'ADMIN';
            currentUsernameSpan.appendChild(badge);
        }

        // 5. Iniciar escucha
        startListening();

    } catch (error) {
        console.error("Error al entrar:", error);
        alert("Error de conexión.");
        submitBtn.disabled = false;
        submitBtn.textContent = "Entrar a la Sala";
    }
});

// B. Escuchar cambios en tiempo real
function startListening() {
    // Ordenamos por fecha para que la lista no salte
    const q = query(collection(db, COL_NAME), orderBy("timestamp"));

    onSnapshot(q, (snapshot) => {
        participantsList.innerHTML = "";
        const players = [];
        let gameActive = false;

        snapshot.forEach((doc) => {
            const data = doc.data();
            players.push({ id: doc.id, ...data });

            // Renderizar lista con icono de admin
            const li = document.createElement('li');
            let content = data.name;
            
            if (data.isAdmin) content += " 👑"; // Corona para el admin visualmente
            if (data.name === myName) {
                content += " (Tú)";
                li.style.fontWeight = "bold";
            }
            
            li.textContent = content;
            participantsList.appendChild(li);

            // Revisar mi resultado
            if (doc.id === myId && data.match) {
                showResult(data.match);
                gameActive = true;
            }
            if (data.match) gameActive = true;
        });

        // Actualizamos botones según mi rol y el estado del juego
        updateGameControls(players.length, gameActive);
    });
}

// C. Control de Botones (Lógica Admin)
function updateGameControls(count, isPlayed) {
    
    // CASO 1: El juego ya terminó
    if (isPlayed) {
        drawBtn.classList.remove('hidden-force'); // Mostrar para indicar fin
        drawBtn.disabled = true;
        drawBtn.textContent = "¡Sorteo Realizado! 🎁";
        drawBtn.style.backgroundColor = "#ccc";
        statusText.textContent = "El juego ha terminado. Mira tu resultado.";
        return;
    }

    // CASO 2: Soy Admin
    if (isMyUserAdmin) {
        drawBtn.classList.remove('hidden-force'); // El admin SI ve el botón
        
        if (count >= 3) {
            drawBtn.disabled = false;
            drawBtn.textContent = "🎲 ¡Realizar Sorteo!";
            statusText.textContent = "Eres el administrador. Tienes el control.";
        } else {
            drawBtn.disabled = true;
            drawBtn.textContent = `Esperando jugadores (${count}/3)`;
            statusText.textContent = "Necesitas más gente para iniciar.";
        }
    } 
    
    // CASO 3: Soy un invitado normal
    else {
        drawBtn.classList.add('hidden-force'); // Invitado NO ve el botón
        statusText.textContent = `Esperando a que el administrador inicie (${count} en sala)...`;
    }
}

// D. Algoritmo de Sorteo (Solo el admin puede activarlo)
drawBtn.addEventListener('click', async () => {
    if (!isMyUserAdmin) return; // Doble seguridad

    const snapshot = await getDocs(collection(db, COL_NAME));
    let users = [];
    snapshot.forEach(doc => users.push({ id: doc.id, ...doc.data() }));

    if (users.length < 3) return alert("Faltan jugadores");

    if(!confirm("¿Estás seguro de iniciar el sorteo ahora? Nadie más podrá unirse.")) return;

    // Mezclar (Fisher-Yates)
    let shuffled = [...users];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    // Escritura en lote
    const batch = writeBatch(db);

    for (let i = 0; i < users.length; i++) {
        const giver = users[i];
        const receiver = users[(i + 1) % users.length]; 
        const userRef = doc(db, COL_NAME, giver.id);
        batch.update(userRef, { match: receiver.name });
    }

    await batch.commit();
});

// E. Mostrar resultado
function showResult(matchName) {
    matchNameH2.textContent = matchName;
    myResultDiv.classList.remove('hidden');
    // Si soy admin, oculto mi botón de sortear porque ya acabó
    if(isMyUserAdmin) drawBtn.classList.add('hidden-force');
}
