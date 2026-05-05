from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.responses import HTMLResponse

app = FastAPI()
rooms = {}

HTML = """<!DOCTYPE html>
<html>
<head>
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Overlay Chat</title>
  <style>
    body {font-family: system-ui; background:#111; color:#0f0; margin:0; padding:10px;}
    #messages {height:70vh; overflow:auto; border:1px solid #0f0; padding:10px;}
  </style>
</head>
<body>
  <h3>🔴 Room: friends3</h3>
  <div id="messages"></div>
  <input id="msg" placeholder="Type...">
  <button onclick="send()">Send</button>
  <button onclick="enablePiP()">🎥 PiP</button>
  <video id="pipVideo" style="display:none"></video>

  <script>
  const ws = new WebSocket("wss://" + location.host + "/ws/friends3");
  const div = document.getElementById("messages");

  ws.onmessage = e => {
    const d = JSON.parse(e.data);
    div.innerHTML += `<p><b>${d.user}:</b> ${d.msg}</p>`;
    div.scrollTop = div.scrollHeight;
  };

  function send() {
    const input = document.getElementById("msg");
    ws.send(JSON.stringify({user:"You", msg:input.value}));
    input.value = "";
  }

  function enablePiP() {
    const video = document.getElementById("pipVideo");
    const canvas = document.createElement("canvas");
    canvas.width = 380; canvas.height = 600;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#111"; ctx.fillRect(0,0,380,600);
    ctx.fillStyle = "#0f0"; ctx.font = "20px sans-serif";
    ctx.fillText("Chat Overlay", 40, 100);
    video.srcObject = canvas.captureStream(5);
    video.play();
    video.requestPictureInPicture();
  }
  </script>
</body>
</html>"""

@app.get("/")
async def get():
    return HTMLResponse(HTML)

@app.websocket("/ws/{room}")
async def ws_endpoint(websocket: WebSocket, room: str):
    await websocket.accept()
    if room not in rooms: rooms[room] = []
    rooms[room].append(websocket)
    try:
        while True:
            data = await websocket.receive_text()
            for client in rooms[room]:
                if client != websocket:
                    await client.send_text(data)
    except WebSocketDisconnect:
        rooms[room].remove(websocket)
