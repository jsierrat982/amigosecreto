// 1. Importaciones (Añadimos deleteDoc)
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { 
    getFirestore, collection, addDoc, onSnapshot, 
    query, getDocs, writeBatch, doc, orderBy, deleteDoc 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// 2. TU Configuración
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

// 4. Variables de Estado
let myName = "";
let myId = "";
let isMyUserAdmin = false;

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

    const submitBtn = loginForm.querySelector('button');
    submitBtn.disabled = true;
    submitBtn.textContent = "Verificando...";

    try {
        // Verificar si soy admin (si la sala está vacía)
        const qSnapshot = await getDocs(collection(db, COL_NAME));
        const amIAdmin = qSnapshot.empty; 

        // Guardar jugador
        const docRef = await addDoc(collection(db, COL_NAME), {
            name: name,
            match: null,
            isAdmin: amIAdmin,
            timestamp: Date.now()
        });

        // Actualizar estado local
        myName = name;
        myId = docRef.id;
        isMyUserAdmin = amIAdmin;

        // UI
        loginSection.classList.add('hidden');
        gameSection.classList.remove('hidden');
        userStatus.classList.remove('hidden');
        
        currentUsernameSpan.innerHTML = myName;
        if (isMyUserAdmin) {
            const badge = document.createElement('span');
            badge.className = 'admin-badge';
            badge.textContent = 'ADMIN';
            currentUsernameSpan.appendChild(badge);
        }

        startListening();

    } catch (error) {
        console.error("Error:", error);
        alert("Error de conexión.");
        submitBtn.disabled = false;
        submitBtn.textContent = "Entrar a la Sala";
    }
});

// B. Escuchar cambios (Renderizado de lista con botón borrar)
function startListening() {
    const q = query(collection(db, COL_NAME), orderBy("timestamp"));

    onSnapshot(q, (snapshot) => {
        participantsList.innerHTML = "";
        const players = [];
        let gameActive = false;

        snapshot.forEach((docSnap) => {
            const data = docSnap.data();
            players.push({ id: docSnap.id, ...data });
            if (data.match) gameActive = true;

            // --- CREACIÓN DEL ELEMENTO DE LISTA ---
            const li = document.createElement('li');
            
            // 1. Nombre del usuario
            const nameSpan = document.createElement('span');
            let content = data.name;
            if (data.isAdmin) content += " 👑";
            if (data.name === myName) {
                content += " (Tú)";
                li.style.fontWeight = "bold";
            }
            nameSpan.textContent = content;
            li.appendChild(nameSpan);

            // 2. Botón de Eliminar (Solo visible para Admin y si el juego no empezó)
            // No permitimos que el admin se borre a sí mismo
            if (isMyUserAdmin && !gameActive && docSnap.id !== myId) {
                const deleteBtn = document.createElement('button');
                deleteBtn.textContent = "🗑️";
                deleteBtn.className = "btn-delete";
                deleteBtn.title = "Eliminar usuario";
                
                // Acción de borrar
                deleteBtn.onclick = () => deleteUser(docSnap.id, data.name);
                
                li.appendChild(deleteBtn);
            }

            participantsList.appendChild(li);

            // Verificar mi resultado
            if (docSnap.id === myId && data.match) {
                showResult(data.match);
            }
        });

        updateGameControls(players.length, gameActive);
    });
}

// C. Función para eliminar usuario (Nueva)
async function deleteUser(userId, userName) {
    if (confirm(`¿Estás seguro de que quieres eliminar a ${userName}?`)) {
        try {
            await deleteDoc(doc(db, COL_NAME, userId));
            // No necesitamos hacer nada más, onSnapshot actualizará la lista solo
        } catch (error) {
            console.error("Error al borrar:", error);
            alert("No se pudo eliminar al usuario.");
        }
    }
}

// D. Control de Botones
function updateGameControls(count, isPlayed) {
    if (isPlayed) {
        drawBtn.classList.remove('hidden-force');
        drawBtn.disabled = true;
        drawBtn.textContent = "¡Sorteo Realizado! 🎁";
        drawBtn.style.backgroundColor = "#ccc";
        statusText.textContent = "El juego ha terminado.";
        return;
    }

    if (isMyUserAdmin) {
        drawBtn.classList.remove('hidden-force');
        if (count >= 3) {
            drawBtn.disabled = false;
            drawBtn.textContent = "🎲 ¡Realizar Sorteo!";
            statusText.textContent = "Eres Admin. Puedes eliminar usuarios o iniciar.";
        } else {
            drawBtn.disabled = true;
            drawBtn.textContent = `Esperando jugadores (${count}/3)`;
            statusText.textContent = "Necesitas más gente para iniciar.";
        }
    } else {
        drawBtn.classList.add('hidden-force');
        statusText.textContent = `Esperando al admin (${count} en sala)...`;
    }
}

// E. Sorteo
drawBtn.addEventListener('click', async () => {
    if (!isMyUserAdmin) return;

    const snapshot = await getDocs(collection(db, COL_NAME));
    let users = [];
    snapshot.forEach(doc => users.push({ id: doc.id, ...doc.data() }));

    if (users.length < 3) return alert("Faltan jugadores");
    if(!confirm("¿Iniciar sorteo? Ya no se podrán eliminar usuarios.")) return;

    let shuffled = [...users];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }

    const batch = writeBatch(db);
    for (let i = 0; i < users.length; i++) {
        const giver = users[i];
        const receiver = users[(i + 1) % users.length]; 
        const userRef = doc(db, COL_NAME, giver.id);
        batch.update(userRef, { match: receiver.name });
    }
    await batch.commit();
});

// F. Resultado
function showResult(matchName) {
    matchNameH2.textContent = matchName;
    myResultDiv.classList.remove('hidden');
    if(isMyUserAdmin) drawBtn.classList.add('hidden-force');
}
