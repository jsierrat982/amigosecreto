// 1. Importar funciones desde la nube (CDN)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { 
    getFirestore, collection, addDoc, onSnapshot, 
    query, getDocs, writeBatch, doc 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// 2. TU Configuración (Copiada de tu imagen)
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
const COL_NAME = "jugadores"; // Nombre de la colección en la base de datos

// 4. Variables de Estado
let myName = "";
let myId = "";

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

    try {
        // Guardar jugador en Firestore
        const docRef = await addDoc(collection(db, COL_NAME), {
            name: name,
            match: null, // Aún no tiene a quién regalar
            timestamp: Date.now()
        });

        myName = name;
        myId = docRef.id;

        // Cambiar pantalla
        loginSection.classList.add('hidden');
        gameSection.classList.remove('hidden');
        userStatus.classList.remove('hidden');
        currentUsernameSpan.textContent = myName;

        // Iniciar escucha en tiempo real
        startListening();

    } catch (error) {
        console.error("Error al entrar:", error);
        alert("Error de conexión. Revisa la consola.");
    }
});

// B. Escuchar cambios en tiempo real
function startListening() {
    const q = query(collection(db, COL_NAME));

    onSnapshot(q, (snapshot) => {
        participantsList.innerHTML = "";
        const players = [];
        let gameActive = false;

        snapshot.forEach((doc) => {
            const data = doc.data();
            players.push({ id: doc.id, ...data });

            // Crear elemento de lista
            const li = document.createElement('li');
            li.textContent = data.name === myName ? `${data.name} (Tú)` : data.name;
            if(data.name === myName) li.style.fontWeight = "bold";
            participantsList.appendChild(li);

            // Verificar si ya tengo resultado
            if (doc.id === myId && data.match) {
                showResult(data.match);
                gameActive = true;
            }
            // Verificar si alguien más ya tiene match (el juego empezó)
            if (data.match) gameActive = true;
        });

        updateGameStatus(players.length, gameActive);
    });
}

// C. Actualizar estado del botón
function updateGameStatus(count, isPlayed) {
    if (isPlayed) {
        drawBtn.disabled = true;
        drawBtn.textContent = "¡Sorteo Realizado! 🎁";
        statusText.textContent = "El juego ha terminado. Mira tu resultado.";
    } else if (count >= 3) {
        drawBtn.disabled = false;
        drawBtn.textContent = "🎲 ¡Sortear Amigos!";
        statusText.textContent = "¡Listos para jugar!";
    } else {
        drawBtn.disabled = true;
        drawBtn.textContent = `Esperando... (${count}/3 min)`;
        statusText.textContent = "Necesitamos al menos 3 personas.";
    }
}

// D. Algoritmo de Sorteo (Solo el que hace click lo ejecuta para todos)
drawBtn.addEventListener('click', async () => {
    const snapshot = await getDocs(collection(db, COL_NAME));
    let users = [];
    snapshot.forEach(doc => users.push({ id: doc.id, ...doc.data() }));

    if (users.length < 3) return alert("Faltan jugadores");

    // Mezclar (Fisher-Yates Shuffle)
    let shuffled = [...users];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    // Escritura en lote (Batch) para atomicidad
    const batch = writeBatch(db);

    for (let i = 0; i < users.length; i++) {
        // Asignación circular: A->B, B->C, C->A
        const giver = users[i];
        const receiver = users[(i + 1) % users.length]; 

        const userRef = doc(db, COL_NAME, giver.id);
        batch.update(userRef, { match: receiver.name });
    }

    await batch.commit();
    console.log("Sorteo completado con éxito");
});

// E. Mostrar resultado personal
function showResult(matchName) {
    matchNameH2.textContent = matchName;
    myResultDiv.classList.remove('hidden');
    drawBtn.classList.add('hidden'); // Ocultar botón tras sorteo
}