let mySavedId = localStorage.getItem('p2p-chat-id');
let peer = null;
let conn = null;

const msgInput = document.getElementById('chat-input');
const sendBtn = document.getElementById('send-btn');
const fileInput = document.getElementById('file-input');
const statusDiv = document.getElementById('status');

function initPeer(id) {
    if (peer) peer.destroy();
    peer = new Peer(id);

    peer.on('open', (newId) => {
        mySavedId = newId;
        localStorage.setItem('p2p-chat-id', newId);
        document.getElementById('my-id').innerText = newId;
        checkAutoConnect();
    });

    peer.on('connection', (incoming) => setupConnection(incoming));
}

function setupConnection(connection) {
    if (conn) conn.close();
    conn = connection;

    conn.on('open', () => {
        statusDiv.innerText = "Connected to " + conn.peer;
        statusDiv.className = "status-online";
        msgInput.disabled = false;
        sendBtn.disabled = false;
        document.getElementById('attach-btn').disabled = false;
    });

    conn.on('data', (data) => {
        // If data is an object with a type, we handle it as a file
        if (typeof data === 'object' && data.type === 'file') {
            renderMessage(data.payload, 'received', true);
        } else {
            renderMessage(data, 'received', false);
        }
    });
}

// --- FILE HANDLING ---
document.getElementById('attach-btn').onclick = () => fileInput.click();

fileInput.onchange = () => {
    const file = fileInput.files[0];
    if (!file || !conn?.open) return;

    // Show "Sending..." status
    const originalStatus = statusDiv.innerText;
    statusDiv.innerText = "📤 Sending file...";
    statusDiv.style.color = "#faa61a"; // Warning orange

    const reader = new FileReader();
    reader.onload = (e) => {
        const filePackage = {
            name: file.name,
            type: file.type,
            data: e.target.result
        };
        
        // Send as a structured object
        conn.send({ type: 'file', payload: filePackage });
        renderMessage(filePackage, 'sent', true);
        
        // Restore status
        statusDiv.innerText = originalStatus;
        statusDiv.style.color = "";
    };
    reader.readAsDataURL(file);
    fileInput.value = ""; 
};

// --- MESSAGE RENDERING ---
function renderMessage(content, type, isFile) {
    const container = document.getElementById('messages');
    const msgDiv = document.createElement('div');
    msgDiv.className = `message ${type}`;

    if (isFile) {
        // 1. IMAGE
        if (content.type.startsWith('image/')) {
            const img = document.createElement('img');
            img.src = content.data;
            img.style.maxWidth = "100%";
            msgDiv.appendChild(img);
        } 
        // 2. VIDEO
        else if (content.type.startsWith('video/')) {
            const video = document.createElement('video');
            video.src = content.data;
            video.controls = true;
            video.style.maxWidth = "100%";
            msgDiv.appendChild(video);
        }
        
        // 3. DOWNLOAD LINK (Always added for files)
        const link = document.createElement('a');
        link.href = content.data;
        link.download = content.name;
        link.className = "file-link";
        link.innerText = `📄 Download ${content.name}`;
        msgDiv.appendChild(link);
    } else {
        // Ensure we don't render [object Object] for text
        msgDiv.innerText = (typeof content === 'object') ? JSON.stringify(content) : content;
    }

    container.appendChild(msgDiv);
    container.scrollTop = container.scrollHeight;
}

function sendMessage() {
    const text = msgInput.value.trim();
    if (conn?.open && text) {
        conn.send(text); // Send as simple string
        renderMessage(text, 'sent', false);
        msgInput.value = "";
    }
}

// --- REST OF UI LOGIC ---
document.getElementById('send-btn').onclick = sendMessage;
msgInput.onkeypress = (e) => { if(e.key === 'Enter') sendMessage(); };
document.getElementById('change-id-trigger').onclick = () => {
    const newName = prompt("Enter new Peer ID:", mySavedId);
    if (newName && newName !== mySavedId) initPeer(newName);
};
document.getElementById('connect-btn').onclick = () => {
    const rId = document.getElementById('remote-id').value;
    if(rId) setupConnection(peer.connect(rId));
};
document.getElementById('copy-link-btn').onclick = () => {
    const inviteUrl = `${window.location.origin}${window.location.pathname}?connect=${mySavedId}`;
    navigator.clipboard.writeText(inviteUrl);
    alert("Invite Link copied!");
};
function checkAutoConnect() {
    const urlParams = new URLSearchParams(window.location.search);
    const friendId = urlParams.get('connect');
    if (friendId) setupConnection(peer.connect(friendId));
}

initPeer(mySavedId);