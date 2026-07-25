import os
import httpx
from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
from openai import OpenAI

app = FastAPI()

# Enable CORS for frontend clients
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Load Secure Environment Variables
GITHUB_TOKEN = os.getenv("GITHUB_TOKEN")
GITHUB_OWNER = os.getenv("GITHUB_OWNER", "Ewm24k")
GITHUB_REPO = os.getenv("GITHUB_REPO", "smartkiddo-verse")
GITHUB_BRANCH = os.getenv("GITHUB_BRANCH", "main")
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")

# Initialize OpenAI client securely
openai_client = None
if OPENAI_API_KEY:
    openai_client = OpenAI(api_key=OPENAI_API_KEY)

# -----------------------------------------------------------------
# Models for API validation
# -----------------------------------------------------------------
class ChatMessage(BaseModel):
    role: str
    content: str

class ChatRequest(BaseModel):
    messages: List[ChatMessage]
    workspace_context: Optional[str] = ""

# Helper to request GitHub REST API
async def github_request(endpoint: str, method: str = "GET", json_data: dict = None):
    url = f"https://api.github.com{endpoint}"
    headers = {
        "Authorization": f"Bearer {GITHUB_TOKEN}",
        "Accept": "application/vnd.github+json",
        "User-Agent": "SmartKiddo-Sync-API-Python"
    }
    async with httpx.AsyncClient() as client:
        if method == "GET":
            response = await client.get(url, headers=headers)
        elif method == "POST":
            response = await client.post(url, headers=headers, json=json_data)
        elif method == "PATCH":
            response = await client.patch(url, headers=headers, json=json_data)
        
        if response.status_code >= 400:
            raise HTTPException(status_code=response.status_code, detail=response.text)
        return response.json()

# -----------------------------------------------------------------
# Endpoint 1: Sync (GET) - Pull repository structure
# -----------------------------------------------------------------
@app.get("/api/sync")
async def sync_github():
    if not GITHUB_TOKEN:
        raise HTTPException(status_code=500, detail="Missing GITHUB_TOKEN on backend.")
    try:
        # Fetch the flat recursive Git tree from GitHub
        tree_data = await github_request(f"/repos/{GITHUB_OWNER}/{GITHUB_REPO}/git/trees/{GITHUB_BRANCH}?recursive=1")
        
        # Filter system and ignored items
        filtered_tree = [
            item for item in tree_data.get("tree", [])
            if not item["path"].startswith(".") and 
               "node_modules/" not in item["path"] and 
               item["path"] not in ["package.json", "server.js", "requirements.txt", "main.py"]
        ]

        root_nodes = []
        folders_map = {}

        # Sort so folders are processed first to ensure parents are ready
        sorted_tree = sorted(filtered_tree, key=lambda x: x["path"])

        for item in sorted_tree:
            parts = item["path"].split("/")
            name = parts[-1]
            is_folder = item["type"] == "tree"

            node = {
                "id": f"gh_{item['sha']}",
                "name": name,
                "type": "folder" if is_folder else "file",
                "path": item["path"]
            }

            if is_folder:
                node["isOpen"] = True
                node["children"] = []
                folders_map[item["path"]] = node
            else:
                ext = name.split(".")[-1].lower() if "." in name else ""
                is_media = ext in ["png", "jpg", "jpeg", "gif", "svg", "webp", "mp4", "webm", "ogg"]
                node["isMedia"] = is_media
                if is_media:
                    node["format"] = "video" if ext in ["mp4", "webm", "ogg"] else "image"
                    node["url"] = f"/api/media?path={item['path']}"
                    node["content"] = ""
                else:
                    node["content"] = ""

            if len(parts) == 1:
                root_nodes.append(node)
            else:
                parent_path = "/".join(parts[:-1])
                if parent_path in folders_map:
                    folders_map[parent_path]["children"].append(node)
                else:
                    root_nodes.append(node)

        # Hydrate file content text via Raw GitHub links
        async def fetch_contents(nodes):
            async with httpx.AsyncClient() as client:
                headers = {"Authorization": f"Bearer {GITHUB_TOKEN}"}
                for node in nodes:
                    if node["type"] == "file" and not node.get("isMedia"):
                        raw_url = f"https://raw.githubusercontent.com/{GITHUB_OWNER}/{GITHUB_REPO}/{GITHUB_BRANCH}/{node['path']}"
                        raw_res = await client.get(raw_url, headers=headers)
                        if raw_res.status_code == 200:
                            node["content"] = raw_res.text
                        else:
                            node["content"] = "/* Error loading content from GitHub */"
                    elif node["type"] == "folder" and "children" in node:
                        await fetch_contents(node["children"])

        await fetch_contents(root_nodes)

        # Strip temporary path parameter before responding
        def strip_paths(nodes):
            for node in nodes:
                if "path" in node:
                    del node["path"]
                if "children" in node:
                    strip_paths(node["children"])
        strip_paths(root_nodes)

        return root_nodes
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# -----------------------------------------------------------------
# Endpoint 2: Send & Sync (POST) - Push workspace back to GitHub
# -----------------------------------------------------------------
@app.post("/api/send-sync")
async def send_sync_github(request: Request):
    try:
        file_system = await request.json()
        if not isinstance(file_system, list):
            raise HTTPException(status_code=400, detail="Invalid payload. Array expected.")

        # Flatten nested structure to path mappings
        def flatten(nodes, current_path=""):
            flat_list = []
            for node in nodes:
                absolute_path = f"{current_path}/{node['name']}" if current_path else node['name']
                if node["type"] == "file":
                    flat_list.append({
                        "path": absolute_path,
                        "content": node.get("content", ""),
                        "isMedia": node.get("isMedia", False)
                    })
                elif node["type"] == "folder" and "children" in node:
                    flat_list.extend(flatten(node["children"], absolute_path))
            return flat_list

        flattened_files = flatten(file_system)

        # Fetch HEAD commit context
        ref_data = await github_request(f"/repos/{GITHUB_OWNER}/{GITHUB_REPO}/git/refs/heads/{GITHUB_BRANCH}")
        base_commit_sha = ref_data["object"]["sha"]

        # Retrieve tree SHA
        commit_data = await github_request(f"/repos/{GITHUB_OWNER}/{GITHUB_REPO}/git/commits/{base_commit_sha}")
        base_tree_sha = commit_data["tree"]["sha"]

        # Build git Tree payload (skip binary media uploads)
        tree_items = [
            {
                "path": file["path"],
                "mode": "100644",
                "type": "blob",
                "content": file["content"]
            }
            for file in flattened_files if not file["isMedia"]
        ]

        new_tree_data = await github_request(f"/repos/{GITHUB_OWNER}/{GITHUB_REPO}/git/trees", "POST", {
            "base_tree": base_tree_sha,
            "tree": tree_items
        })

        # Create new Commit
        new_commit_data = await github_request(f"/repos/{GITHUB_OWNER}/{GITHUB_REPO}/git/commits", "POST", {
            "message": "Backup update from SmartKiddo Studio Workspace",
            "tree": new_tree_data["sha"],
            "parents": [base_commit_sha]
        })

        # Update branch head reference
        await github_request(f"/repos/{GITHUB_OWNER}/{GITHUB_REPO}/git/refs/heads/{GITHUB_BRANCH}", "PATCH", {
            "sha": new_commit_data["sha"],
            "force": True
        })

        return {"success": True, "sha": new_commit_data["sha"]}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# -----------------------------------------------------------------
# Endpoint 3: Secure Media Stream Proxy
# -----------------------------------------------------------------
@app.get("/api/media")
async def stream_media(path: str):
    if not path:
        raise HTTPException(status_code=400, detail="Missing path parameter")
    try:
        raw_url = f"https://raw.githubusercontent.com/{GITHUB_OWNER}/{GITHUB_REPO}/{GITHUB_BRANCH}/{path}"
        headers = {"Authorization": f"Bearer {GITHUB_TOKEN}"}
        async with httpx.AsyncClient() as client:
            response = await client.get(raw_url, headers=headers)
            if response.status_code != 200:
                raise HTTPException(status_code=response.status_code, detail="Failed to fetch asset")
            
            from fastapi.responses import Response
            return Response(content=response.content, media_type=response.headers.get("content-type"))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# -----------------------------------------------------------------
# Endpoint 4: AI Agent Chat Integration (With string schema validation) [2]
# -----------------------------------------------------------------
@app.post("/api/chat")
async def ai_chat_completion(chat_req: ChatRequest):
    if not openai_client:
        return {"error": "OpenAI Client is not initialized on backend. Please configure OPENAI_API_KEY environment variable on Render.", "success": False}
    try:
        # Build a single unified string input because the Responses API with 'prompt' template id
        # expects a single string input (passing an array of messages causes a 400 error) [2]
        openai_input_str = ""
        
        if chat_req.workspace_context:
            openai_input_str += f"=== ACTIVE WORKSPACE MANIFEST && FILE CONTEXT ===\n{chat_req.workspace_context}\n\n"
            
        openai_input_str += "=== CONVERSATION HISTORY ===\n"
        for msg in chat_req.messages:
            speaker = "User" if msg.role == "user" else "Assistant"
            openai_input_str += f"{speaker}: {msg.content}\n"

        # Trigger Saved Prompt Template [2]
        response = openai_client.responses.create(
            model="gpt-5.4-mini", 
            prompt={
                "id": "pmpt_6a64c46b5e5c8190bdb0b6f7aacbb7450b1160d1c16e4e6e",
                "version": "1"
            },
            input=openai_input_str, # String input conforms strictly to schema validation [2]
            reasoning={
                "mode": "standard",
                "summary": "auto"
            },
            tools=[
                {
                    "type": "web_search",
                    "user_location": {
                        "type": "approximate"
                    },
                    "search_context_size": "high"
                }
            ],
            store=True,
            include=[
                "reasoning.encrypted_content",
                "web_search_call.action.sources"
            ]
        )

        # Access assistant response
        assistant_content = ""
        if hasattr(response, "output_text") and response.output_text:
            assistant_content = response.output_text
        elif hasattr(response, "choices") and len(response.choices) > 0:
            assistant_content = response.choices[0].message.content
        elif hasattr(response, "output") and hasattr(response.output, "content"):
            assistant_content = response.output.content

        # Capture Token Usage metrics
        input_tokens = 0
        output_tokens = 0
        if hasattr(response, "usage") and response.usage:
            input_tokens = response.usage.prompt_tokens
            output_tokens = response.usage.completion_tokens
        else:
            # Fallback estimation values
            input_tokens = len(openai_input_str) // 4
            output_tokens = len(assistant_content) // 4

        return {
            "content": assistant_content,
            "success": True,
            "usage": {
                "input_tokens": input_tokens,
                "output_tokens": output_tokens,
                "total_tokens": input_tokens + output_tokens
            }
        }
    except Exception as e:
        # Gracefully catch exceptions and respond with error description instead of crashing [2]
        print("OpenAI Error:", str(e))
        return {"error": str(e), "success": False}
