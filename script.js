let mySavedId = localStorage.getItem('p2p-chat-id');
let peer = null;
let conn = null;

const msgInput = document.getElementById('chat-input');
const sendBtn = document.getElementById('send-btn');

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

    peer.on('error', (err) => {
        if(err.type === 'unavailable-id') {
            alert("That ID is already taken! Try another one.");
            changeID();
        }
    });
}

function changeID() {
    const newName = prompt("Enter your new Peer ID (username):", mySavedId || "");
    if (newName && newName !== mySavedId) {
        initPeer(newName);
    }
}

document.getElementById('change-id-trigger').onclick = changeID;

function setupConnection(connection) {
    if (conn) conn.close();
    conn = connection;

    conn.on('open', () => {
        document.getElementById('status').innerText = "Connected to " + conn.peer;
        document.getElementById('status').className = "status-online";
        msgInput.disabled = false;
        sendBtn.disabled = false;
    });

    conn.on('data', (data) => addMessage(data, 'received'));
}

function checkAutoConnect() {
    const urlParams = new URLSearchParams(window.location.search);
    const friendId = urlParams.get('connect');
    if (friendId && !conn) {
        setupConnection(peer.connect(friendId));
    }
}

document.getElementById('connect-btn').onclick = () => {
    const rId = document.getElementById('remote-id').value;
    if(rId) setupConnection(peer.connect(rId));
};

document.getElementById('copy-link-btn').onclick = () => {
    const inviteUrl = `${window.location.origin}${window.location.pathname}?connect=${mySavedId}`;
    navigator.clipboard.writeText(inviteUrl);
    alert("Invite Link copied!");
};

function sendMessage() {
    const msg = msgInput.value;
    if (conn?.open && msg) {
        conn.send(msg);
        addMessage(msg, 'sent');
        msgInput.value = "";
    }
}

document.getElementById('send-btn').onclick = sendMessage;
msgInput.onkeypress = (e) => { if(e.key === 'Enter') sendMessage(); };

function addMessage(text, type) {
    const msgDiv = document.createElement('div');
    msgDiv.className = `message ${type}`;
    msgDiv.innerText = text;
    const container = document.getElementById('messages');
    container.appendChild(msgDiv);
    container.scrollTop = container.scrollHeight;
}

initPeer(mySavedId);