import os
import re
import json
import httpx
import asyncio
import base64
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

# Request schema for the Bedtime Story pipeline
class BedtimeStoryRequest(BaseModel):
    concept_brief: str
    age_group: str
    voice_style: str
    visual_style: str
    story_length: str
    music_mood: str
    story_language: Optional[str] = "en"

# Request schema for Voice generation
class VoiceGenerationRequest(BaseModel):
    text: str
    voice: str
    voice_style: str
    response_format: Optional[str] = "wav"
    speed: Optional[float] = 1.0
    story_language: Optional[str] = "en"

# Request schema for Storyboard planning
class StoryboardPlanRequest(BaseModel):
    story_script: str
    audio_duration: float
    visual_style: str
    target_age: str
    story_language: Optional[str] = "en"

# Request schema for generating a single storyboard scene illustration
class SingleSceneGenerationRequest(BaseModel):
    scene_number: int
    image_prompt: str
    visual_style: str

# -----------------------------------------------------------------
# Helper Utilities
# -----------------------------------------------------------------

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

# Helper to recursively gather all files needing text hydration [2]
def collect_code_files(nodes):
    files = []
    for node in nodes:
        if node["type"] == "file" and not node.get("isMedia"):
            files.append(node)
        elif node["type"] == "folder" and "children" in node:
            files.extend(collect_code_files(node["children"]))
    return files

# Helper to asynchronously fetch a single file content from raw GitHub link [2]
async def fetch_single_file(client, node, headers, repo_name: str):
    raw_url = f"https://raw.githubusercontent.com/{GITHUB_OWNER}/{repo_name}/{GITHUB_BRANCH}/{node['path']}"
    try:
        response = await client.get(raw_url, headers=headers, timeout=10.0)
        if response.status_code == 200:
            node["content"] = response.text
        else:
            node["content"] = f"/* Error loading content: {response.status_code} */"
    except Exception as e:
        node["content"] = f"/* Exception loading content: {str(e)} */"

# Helper to extract JSON from OpenAI responses securely (handling formatting blocks)
def extract_json_content(text: str) -> dict:
    try:
        match = re.search(r"```json\s*([\s\S]*?)\s*```", text)
        if match:
            return json.loads(match.group(1).strip())
        
        match_code = re.search(r"```\s*([\s\S]*?)\s*```", text)
        if match_code:
            return json.loads(match_code.group(1).strip())
            
        return json.loads(text.strip())
    except Exception as parse_error:
        print("JSON extraction parsing failed, utilizing emergency fallback layout. Error:", str(parse_error))
        return {
            "title": "A Magical Forest Adventure",
            "brief": "A charming, relaxing story tailored directly to curiosity and bedtime comfort.",
            "script": text
        }

# Generates unique, highly varied sleepy-time cartoon illustrations via vector SVGs to prevent duplicate visual blocks
def get_cartoon_placeholder(scene_number: int) -> str:
    colors = [
        ["#4f46e5", "#1e1b4b", "#818cf8"], # Indigo twilight
        ["#0d9488", "#115e59", "#2dd4bf"], # Teal mystical woods
        ["#db2777", "#831843", "#f472b6"], # Pink candy clouds
        ["#ca8a04", "#713f12", "#fde047"], # Golden sky
    ]
    c = colors[(scene_number - 1) % len(colors)]
    
    custom_vector_elements = ""
    if scene_number == 1:
        custom_vector_elements = """
        <path d="M 310,30 A 25,25 0 1,0 350,60 A 20,20 0 1,1 310,30" fill="#fef08a" />
        <circle cx="150" cy="50" r="3" fill="#fff" opacity="0.9" />
        """
    elif scene_number == 2:
        custom_vector_elements = """
        <path d="M 50,200 Q 80,100 70,50 Q 150,30 220,60 Q 210,120 350,200 Z" fill="#065f46" opacity="0.4" />
        <path d="M 120,200 L 140,110 Q 160,80 150,50 L 190,50 Q 200,90 220,200" fill="#451a03" />
        <circle cx="170" cy="130" r="12" fill="#172554" />
        """
    elif scene_number == 3:
        custom_vector_elements = """
        <path d="M 80,200 C 80,160 120,160 120,200" fill="#ef4444" />
        <path d="M 280,200 C 280,150 330,150 330,200" fill="#f59e0b" />
        <polygon points="180,150 183,158 191,158 185,163 187,171 180,166 173,171 175,163 169,158 177,158" fill="#fef08a" />
        """
    elif scene_number == 4:
        custom_vector_elements = """
        <circle cx="280" cy="100" r="22" fill="#78350f" />
        <circle cx="272" cy="95" r="6" fill="#fff" />
        <circle cx="272" cy="95" r="3" fill="#000" />
        <circle cx="288" cy="95" r="6" fill="#fff" />
        <circle cx="288" cy="95" r="3" fill="#000" />
        <polygon points="280,102 277,108 283,108" fill="#f59e0b" />
        """
    elif scene_number == 5:
        custom_vector_elements = """
        <path d="M 60,200 Q 110,130 160,200 Z" fill="#1e3a8a" opacity="0.6" />
        <circle cx="110" cy="160" r="14" fill="#3b82f6" />
        <path d="M 110,160 Q 125,150 120,168" stroke="#1d4ed8" stroke-width="2" fill="none" />
        <polygon points="120,158 126,160 120,162" fill="#f59e0b" />
        """
    elif scene_number == 6:
        custom_vector_elements = """
        <path d="M 0,200 C 100,160 200,210 400,180 L 400,200 L 0,200 Z" fill="#0284c7" opacity="0.8" />
        <path d="M 0,190 C 120,170 180,195 400,170" stroke="#bae6fd" stroke-width="2" fill="none" opacity="0.5" />
        """
    elif scene_number == 7:
        custom_vector_elements = """
        <path d="M 50,180 Q 150,120 280,40" stroke="#fef08a" stroke-width="3" stroke-dasharray="5,5" fill="none" opacity="0.6" />
        <polygon points="280,40 284,48 292,48 286,53 288,61 281,56 274,61 276,53 270,48 278,48" fill="#fef08a" />
        """
    else:
        custom_vector_elements = """
        <ellipse cx="200" cy="80" rx="40" ry="25" fill="#f8fafc" opacity="0.2" />
        <circle cx="150" cy="100" r="8" fill="#f8fafc" opacity="0.2" />
        <circle cx="135" cy="115" r="4" fill="#f8fafc" opacity="0.2" />
        """

    svg = f"""<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 200" width="100%" height="100%">
        <defs>
            <linearGradient id="bg-{scene_number}" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stop-color="{c[1]}" />
                <stop offset="100%" stop-color="{c[0]}" />
            </linearGradient>
        </defs>
        <rect width="400" height="200" fill="url(#bg-{scene_number})" />
        
        <!-- Standard ambient starry dots -->
        <circle cx="50" cy="40" r="1.5" fill="#fff" opacity="0.8" />
        <circle cx="120" cy="30" r="1" fill="#fff" opacity="0.5" />
        <circle cx="280" cy="50" r="2" fill="{c[2]}" opacity="0.9" />
        <circle cx="340" cy="25" r="1.5" fill="#fff" opacity="0.7" />
        <circle cx="90" cy="75" r="1" fill="#fff" opacity="0.6" />
        <circle cx="220" cy="20" r="1.5" fill="#fff" opacity="0.4" />
        
        <!-- Background Mountain / Hills silhouettes -->
        <path d="M 0,200 L 0,150 Q 100,120 200,160 T 400,140 L 400,200 Z" fill="{c[1]}" opacity="0.7" />
        <path d="M 0,200 L 0,170 Q 150,140 300,180 T 400,175 L 400,200 Z" fill="{c[0]}" opacity="0.9" />
        {custom_vector_elements}
        <g transform="translate(180, 140) scale(0.6)">
            <ellipse cx="20" cy="25" rx="6" ry="20" fill="#f5f5f5" />
            <ellipse cx="20" cy="25" rx="3" ry="15" fill="#fecdd3" />
            <ellipse cx="35" cy="28" rx="6" ry="18" fill="#f5f5f5" />
            <ellipse cx="35" cy="28" rx="3" ry="13" fill="#fecdd3" />
            <ellipse cx="35" cy="65" rx="22" ry="18" fill="#e5e5e5" />
            <circle cx="30" cy="45" r="15" fill="#f5f5f5" />
            <path d="M 23,45 Q 26,48 29,45" stroke="#1e293b" stroke-width="1.5" fill="none" />
            <path d="M 33,45 Q 36,48 39,45" stroke="#1e293b" stroke-width="1.5" fill="none" />
            <polygon points="30,49 32,49 31,51" fill="#fecdd3" />
            <circle cx="58" cy="68" r="6" fill="#f5f5f5" />
        </g>
        <text x="20" y="30" font-family="monospace" font-size="10" fill="#93c5fd" opacity="0.7">CARTOON ILLUSTRATION PLACEHOLDER</text>
    </svg>"""
    return f"data:image/svg+xml;base64,{base64.b64encode(svg.encode('utf-8')).decode('utf-8')}"

# -----------------------------------------------------------------
# Endpoint 1: Sync (GET) - Pull repository structure
# -----------------------------------------------------------------
@app.get("/api/sync")
async def sync_github(repo: Optional[str] = None):
    if not GITHUB_TOKEN:
        raise HTTPException(status_code=500, detail="Missing GITHUB_TOKEN on backend.")
    try:
        repo_name = repo if repo else GITHUB_REPO
        tree_data = await github_request(f"/repos/{GITHUB_OWNER}/{repo_name}/git/trees/{GITHUB_BRANCH}?recursive=1")
        
        filtered_tree = [
            item for item in tree_data.get("tree", [])
            if not item["path"].startswith(".") and 
               "node_modules/" not in item["path"] and
               "__pycache__/" not in item["path"] and
               not item["path"].endswith(".pyc")
        ]

        root_nodes = []
        nodes_by_path = {}
        sorted_tree = sorted(filtered_tree, key=lambda x: x["path"])

        for item in sorted_tree:
            parts = item["path"].split("/")
            is_folder = item["type"] == "tree"
            current_path = ""
            parent_node = None
            
            for i, part in enumerate(parts):
                current_path = f"{current_path}/{part}" if current_path else part
                is_last = (i == len(parts) - 1)
                
                if current_path not in nodes_by_path:
                    node_id = f"gh_{item['sha']}" if is_last else f"gen_{current_path}"
                    node_type = "folder" if (not is_last or is_folder) else "file"
                    
                    new_node = {
                        "id": node_id,
                        "name": part,
                        "type": node_type,
                        "path": current_path
                    }
                    
                    if node_type == "folder":
                        new_node["isOpen"] = True
                        new_node["children"] = []
                    else:
                        ext = part.split(".")[-1].lower() if "." in part else ""
                        is_media = ext in ["png", "jpg", "jpeg", "gif", "svg", "webp", "mp4", "webm", "ogg"]
                        new_node["isMedia"] = is_media
                        if is_media:
                            new_node["format"] = "video" if ext in ["mp4", "webm", "ogg"] else "image"
                            new_node["url"] = f"/api/media?path={current_path}&repo={repo_name}"
                            new_node["content"] = ""
                        else:
                            new_node["content"] = ""
                    
                    nodes_by_path[current_path] = new_node
                    
                    if parent_node is None:
                        root_nodes.append(new_node)
                    else:
                        parent_node["children"].append(new_node)
                
                parent_node = nodes_by_path[current_path]

        code_files = collect_code_files(root_nodes)
        if code_files:
            async with httpx.AsyncClient() as client:
                headers = {"Authorization": f"Bearer {GITHUB_TOKEN}"}
                tasks = [fetch_single_file(client, node, headers, repo_name) for node in code_files]
                await asyncio.gather(*tasks)

        def strip_paths(nodes):
            for node in nodes:
                if "path" in node:
                    del node["path"]
                if "children" in node:
                    strip_paths(node["children"])
        strip_paths(root_nodes)
        return root_nodes
    except HTTPException as he:
        raise he
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# -----------------------------------------------------------------
# Endpoint 2: Send & Sync (POST) - Push workspace back to GitHub
# -----------------------------------------------------------------
@app.post("/api/send-sync")
async def send_sync_github(request: Request, repo: Optional[str] = None):
    try:
        file_system = await request.json()
        if not isinstance(file_system, list):
            raise HTTPException(status_code=400, detail="Invalid payload. Array expected.")

        repo_name = repo if repo else GITHUB_REPO

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
        ref_data = await github_request(f"/repos/{GITHUB_OWNER}/{repo_name}/git/refs/heads/{GITHUB_BRANCH}")
        base_commit_sha = ref_data["object"]["sha"]

        commit_data = await github_request(f"/repos/{GITHUB_OWNER}/{repo_name}/git/commits/{base_commit_sha}")
        base_tree_sha = commit_data["tree"]["sha"]

        tree_items = [
            {
                "path": file["path"],
                "mode": "100644",
                "type": "blob",
                "content": file["content"]
            }
            for file in flattened_files if not file["isMedia"]
        ]

        new_tree_data = await github_request(f"/repos/{GITHUB_OWNER}/{repo_name}/git/trees", "POST", {
            "base_tree": base_tree_sha,
            "tree": tree_items
        })

        new_commit_data = await github_request(f"/repos/{GITHUB_OWNER}/{repo_name}/git/commits", "POST", {
            "message": "Backup update from SmartKiddo Studio Workspace",
            "tree": new_tree_data["sha"],
            "parents": [base_commit_sha]
        })

        await github_request(f"/repos/{GITHUB_OWNER}/{repo_name}/git/refs/heads/{GITHUB_BRANCH}", "PATCH", {
            "sha": new_commit_data["sha"],
            "force": True
        })

        return {"success": True, "sha": new_commit_data["sha"]}
    except HTTPException as he:
        raise he
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# -----------------------------------------------------------------
# Endpoint 3: Secure Media Stream Proxy
# -----------------------------------------------------------------
@app.get("/api/media")
async def stream_media(path: str, repo: Optional[str] = None):
    if not path:
        raise HTTPException(status_code=400, detail="Missing path parameter")
    try:
        repo_name = repo if repo else GITHUB_REPO
        raw_url = f"https://raw.githubusercontent.com/{GITHUB_OWNER}/{repo_name}/{GITHUB_BRANCH}/{path}"
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
# Endpoint 4: AI Agent Chat Integration (With advanced memory parsing) [2]
# -----------------------------------------------------------------
@app.post("/api/chat")
async def ai_chat_completion(chat_req: ChatRequest):
    if not openai_client:
        return {"error": "OpenAI Client is not initialized on backend. Please configure OPENAI_API_KEY environment variable on Render.", "success": False}
    try:
        openai_input_str = ""
        if chat_req.workspace_context:
            openai_input_str += f"=== ACTIVE WORKSPACE MANIFEST && SESSION FILE CACHE ===\n{chat_req.workspace_context}\n\n"
            
        openai_input_str += "=== CONVERSATION HISTORY ===\n"
        for msg in chat_req.messages[:-1]:
            speaker = "User" if msg.role == "user" else "Assistant"
            openai_input_str += f"{speaker}: {msg.content}\n"

        openai_input_str += "\n=== CONTEXT TRACKER INSTRUCTIONS ===\n"
        openai_input_str += "Please analyze the entire conversation history above to follow references correctly:\n"
        openai_input_str += "- Track shifting topics or multiple topics within a single query.\n"
        openai_input_str += "- Resolve pronouns ('it', 'this', 'them') based on previously mentioned files/code.\n"
        openai_input_str += "- Parse numerical options.\n"
        openai_input_str += "- Remember code or directory layouts shown in earlier turns. Synthesize your answer contextually.\n\n"

        openai_input_str += "=== AGENT TOOL EMISSION RULES ===\n"
        openai_input_str += "You are an autonomous administrative software agent with full permissions over the developer workspace.\n"
        openai_input_str += "If you cannot answer a user's question because you don't have a file's content, or if you need to search the codebase, you MUST trigger one or more of your background tools using XML-like text tags. You can trigger multiple tags in a single message turn.\n\n"
        openai_input_str += "Available tools:\n"
        openai_input_str += "1. Read File Content:\n"
        openai_input_str += "   <read_file path=\"relative/path/to/file\"></read_file>\n"
        openai_input_str += "   Reads the full source code text of any file listed in the manual manifest.\n"
        openai_input_str += "2. Grep Codebase Search:\n"
        openai_input_str += "   <grep_search query=\"search_term\"></grep_search>\n"
        openai_input_str += "   Scans through all code files in the repository and retrieves matching line numbers and snippets.\n\n"
        openai_input_str += "Rule Parameters:\n"
        openai_input_str += "- DO NOT make up, guess, or hallucinate file content. If a file is not in the Session LRU cache, use `<read_file>`.\n"
        openai_input_str += "- When you emit a tool tag, STOP writing immediately after it. Do not attempt to explain the code or answer before the client returns the actual results in the next turn.\n"
        openai_input_str += "- You can request multiple files simultaneously.\n\n"

        if len(chat_req.messages) > 0:
            latest_msg = chat_req.messages[-1]
            openai_input_str += f"=== LATEST USER MESSAGE ===\nUser: {latest_msg.content}\n"

        response = openai_client.responses.create(
            model="gpt-5.4-mini", 
            prompt={
                "id": "pmpt_6a64c46b5e5c8190bdb0b6f7aacbb7450b1160d1c16e4e6e",
                "version": "1"
            },
            input=openai_input_str,
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

        assistant_content = ""
        if hasattr(response, "output_text") and response.output_text:
            assistant_content = response.output_text
        elif hasattr(response, "choices") and len(response.choices) > 0:
            assistant_content = response.choices[0].message.content
        elif hasattr(response, "output") and hasattr(response.output, "content"):
            assistant_content = response.output.content

        input_tokens = 0
        output_tokens = 0
        total_tokens = 0
        
        if hasattr(response, "usage") and response.usage:
            input_tokens = getattr(response.usage, "input_tokens", None)
            if input_tokens is None:
                input_tokens = getattr(response.usage, "prompt_tokens", 0) or 0
                
            output_tokens = getattr(response.usage, "output_tokens", None)
            if output_tokens is None:
                output_tokens = getattr(response.usage, "completion_tokens", 0) or 0
                
            total_tokens = getattr(response.usage, "total_tokens", input_tokens + output_tokens) or (input_tokens + output_tokens)
        else:
            input_tokens = len(openai_input_str) // 4
            output_tokens = len(assistant_content) // 4
            total_tokens = input_tokens + output_tokens

        return {
            "content": assistant_content,
            "success": True,
            "usage": {
                "input_tokens": input_tokens,
                "output_tokens": output_tokens,
                "total_tokens": total_tokens
            }
        }
    except Exception as e:
        print("OpenAI Error:", str(e))
        return {"error": str(e), "success": False}

# -----------------------------------------------------------------
# Endpoint 5: Bedtime Story AI concept & script generator
# -----------------------------------------------------------------
@app.post("/api/bedtime-story/generate")
async def generate_bedtime_story(story_req: BedtimeStoryRequest):
    if not openai_client:
        return {"error": "OpenAI Client is not initialized on backend. Ensure OPENAI_API_KEY environment variable is active on Render.", "success": False}
    try:
        model_name = "gpt-5.4-mini"
        language_instructions = ""
        
        if story_req.story_language == "ms":
            model_name = "gpt-4o"
            language_instructions = (
                "=== STRICT BAHASA MELAYU STANDARD (MALAYSIA) RULES ===\n"
                "You must write the entire story, book title, and brief strictly in Standard Malaysian Malay (Bahasa Melayu Baku/Standard) used in Malaysia.\n"
                "To prevent Indonesian language drift (Bahasa Indonesia is strictly banned), you must strictly follow these vocabulary rules:\n"
                "- Use 'boleh' (NOT 'bisa')\n"
                "- Use 'kerana' (NOT 'karena')\n"
                "- Use 'anda', 'awak', or 'mereka' (NOT 'kamu', 'kalian')\n"
                "- Use 'kerajaan' (NOT 'pemerintah')\n"
                "- Use 'syarikat' (NOT 'perusahaan')\n"
                "- Use 'pejabat' (NOT 'kantor')\n"
                "- Use 'kereta' (NOT 'mobil')\n"
                "- Use 'hospital' (NOT 'rumah sakit')\n"
                "- Use 'sila' or 'tolong' (NOT 'silakan')\n"
                "- Use 'semua' or 'setiap' (NOT 'seluruh')\n"
                "- Use 'kawasan', 'daerah', or 'zon' (NOT 'wilayah')\n"
                "- Use 'faham' (NOT 'mengerti', 'paham')\n"
                "- Use 'fikir' (NOT 'pikir')\n"
                "- Use 'perlu' (NOT 'butuh')\n"
                "Write the entire book, title, and brief strictly adhering to standard Malaysian Malay spelling and grammar conventions.\n"
            )
        else:
            language_instructions = (
                "=== ENGLISH STORYTELLING RULES ===\n"
                "Write the story, title, and brief strictly in natural, clear, child-friendly English.\n"
            )

        openai_input_str = (
            f"=== BEDTIME STORY GENERATION PARAMS ===\n"
            f"Theme Concept Brief: {story_req.concept_brief}\n"
            f"Target Age Group: {story_req.age_group} years old\n"
            f"Narrative Voice Selection: {story_req.voice_style}\n"
            f"Graphic Illustration Style: {story_req.visual_style}\n"
            f"Story Length Constraints: {story_req.story_length}\n"
            f"Music Soundtrack Mood: {story_req.music_mood}\n"
            f"Requested Language: {'Bahasa Melayu (Malaysia)' if story_req.story_language == 'ms' else 'English'}\n\n"
            f"=== CORE INSTRUCTIONS ===\n"
            f"You are a master children's book author. Draft a magical, engaging bedtime story that matches all parameter requirements above.\n"
            f"{language_instructions}\n"
            f"To satisfy strict application routing layers, your output MUST be formatted exactly as raw JSON using these keys:\n"
            f"- 'title': A charming, original book title\n"
            f"- 'brief': A short, enticing 2-sentence synopsis summarizing the concept brief (Step 1)\n"
            f"- 'script': The complete, detailed story narrative parsed into readable sleep-time paragraphs (Step 2)\n\n"
            f"Do not write conversational intro/outro wrappers. Respond strictly with raw JSON conforming to this schema:\n"
            f"{{\n"
            f"  \"title\": \"...\",\n"
            f"  \"brief\": \"...\",\n"
            f"  \"script\": \"...\"\n"
            f"}}\n"
        )

        if model_name == "gpt-4o":
            response = openai_client.chat.completions.create(
                model="gpt-4o",
                messages=[
                    {"role": "system", "content": "You are a master children's book author. Output strictly in raw JSON format matching the schema rules."},
                    {"role": "user", "content": openai_input_str}
                ],
                response_format={"type": "json_object"}
            )
            ai_raw_content = response.choices[0].message.content
        else:
            call_kwargs = {
                "model": model_name,
                "prompt": {
                    "id": "pmpt_6a662bd8afd08194a20f18967be4326908f6e34aa8074ea1",
                    "version": "1"
                },
                "input": openai_input_str,
                "store": True,
                "reasoning": {
                    "mode": "standard",
                    "summary": "auto"
                },
                "include": [
                    "reasoning.encrypted_content",
                    "web_search_call.action.sources"
                ]
            }
            response = openai_client.responses.create(**call_kwargs)
            
            ai_raw_content = ""
            if hasattr(response, "output_text") and response.output_text:
                ai_raw_content = response.output_text
            elif hasattr(response, "choices") and len(response.choices) > 0:
                ai_raw_content = response.choices[0].message.content
            elif hasattr(response, "output") and hasattr(response.output, "content"):
                ai_raw_content = response.output.content

        story_json_data = extract_json_content(ai_raw_content)
        return {
            "success": True,
            "title": story_json_data.get("title", "The Whispering Meadow"),
            "brief": story_json_data.get("brief", "An enchanting, peaceful exploration concept summary."),
            "script": story_json_data.get("script", ai_raw_content)
        }
    except Exception as e:
        print("Bedtime Story Generation Failure:", str(e))
        return {"error": str(e), "success": False}

# -----------------------------------------------------------------
# Endpoint 6: Bedtime Story Voice Generator (OpenAI TTS - Error-Proof Version)
# -----------------------------------------------------------------
@app.post("/api/bedtime-story/generate-voice")
async def generate_bedtime_story_voice(voice_req: VoiceGenerationRequest):
    if not openai_client:
        return {"error": "OpenAI Client is not initialized on backend. Ensure OPENAI_API_KEY environment variable is active on Render.", "success": False}
    try:
        clean_text = voice_req.text.strip()
        if len(clean_text) > 3500:
            print(f"[TTS Warning] Script text length ({len(clean_text)}) is too long. Truncating to 3500 characters to prevent API crash.")
            clean_text = clean_text[:3500] + "..."

        requested_voice = voice_req.voice.strip().lower()
        supported_voices = [
            "alloy", "ash", "ballad", "cedar", "coral", "echo", 
            "fable", "marin", "nova", "onyx", "sage", "shimmer", "verse"
        ]
        
        if requested_voice not in supported_voices:
            print(f"[TTS Warning] Requested voice '{requested_voice}' is unsupported. Falling back to 'nova'.")
            requested_voice = "nova"

        print(f"[TTS Debug] Request received | Text length: {len(clean_text)} | Voice: '{requested_voice}' | Style: '{voice_req.voice_style}'")

        # Custom phonetic accent instructions designed to guide pronunciation toward Malaysian Melayu (soft schwa / 'e' pepet)
        if voice_req.story_language == "ms":
            instructions = (
                "Sila baca teks naratif ini dengan dialek Bahasa Melayu Malaysia (Johor-Riau / Baku) yang tulen. "
                "Jangan sebut dengan loghat Indonesia (sebutan huruf 'a' di hujung perkataan hendaklah berbunyi 'e' pepet / schwa, seperti menyebut 'saye', 'ape', 'kenape', 'bace', 'biasenye' - bukan sebutan keras 'ah' Indonesia). "
                "Sebut dengan nada yang mesra, tenang, dan lembut untuk kanak-kanak."
            )
        else:
            instructions = f"Deliver the following bedtime story. Style: {voice_req.voice_style}. Keep pacing slow and warm."

        try:
            response = openai_client.audio.speech.create(
                model="gpt-4o-mini-tts",
                voice=requested_voice,
                input=clean_text,
                instructions=instructions,
                response_format=voice_req.response_format,
                speed=voice_req.speed
            )
        except TypeError as param_error:
            print(f"[TTS Dynamic Fallback] Current library version lacks advanced TTS keyword support: {str(param_error)}. Retrying with 'tts-1' fallback...")
            response = openai_client.audio.speech.create(
                model="tts-1",
                voice=requested_voice if requested_voice in ["alloy", "echo", "fable", "onyx", "nova", "shimmer"] else "nova",
                input=clean_text,
                response_format=voice_req.response_format,
                speed=voice_req.speed
            )

        import base64
        audio_data = response.content
        base64_audio = base64.b64encode(audio_data).decode("utf-8")
        
        return {
            "success": True,
            "audio": f"data:audio/{voice_req.response_format};base64,{base64_audio}"
        }
    except Exception as e:
        print("Bedtime Story Voice Generation Failure:", str(e))
        return {"error": str(e), "success": False}

# -----------------------------------------------------------------
# Endpoint 7: Bedtime Storyboard Planner (Enforces strict visual character consistency sheets)
# -----------------------------------------------------------------
@app.post("/api/bedtime-story/plan-storyboard")
async def plan_storyboard(req: StoryboardPlanRequest):
    if not openai_client:
        return {"error": "OpenAI Client is not initialized on backend.", "success": False}
    try:
        duration = req.audio_duration
        if duration <= 40.0:
            suggested_scenes = 4
        elif duration <= 60.0:
            suggested_scenes = 6
        elif duration <= 120.0:
            suggested_scenes = 8
        else:
            suggested_scenes = 10

        openai_input_str = (
            f"=== STORYBOARD PLANNING PARAMS ===\n"
            f"Story Script: {req.story_script}\n"
            f"Audio Duration: {duration} seconds\n"
            f"Suggested Scene Count: {suggested_scenes}\n"
            f"Visual Style Theme: {req.visual_style}\n"
            f"Target Age Demographic: {req.target_age} years old\n\n"
            f"=== STRICT CHARACTER CONSISTENCY & STYLE LOCK RULES ===\n"
            f"To prevent generated story characters from morphing, changing species, colors, or transforming into different animals/humans between scene cards, you MUST strictly adhere to this planning algorithm:\n"
            f"1. **Analyze Characters First**: Read the script and identify all main actors (e.g. Benny the Rabbit, a playful Tiger, etc.).\n"
            f"2. **Design a Strict Style Sheet**: Create a detailed, static physical visual descriptive sheet for each character:\n"
            f"   - Specify species (e.g. fluffy round-eared rabbit, large orange striped tiger).\n"
            f"   - Specify fur coat/skin colors and eyes (e.g. snowy white fluffy fur, emerald round friendly eyes).\n"
            f"   - Specify static clothing and specific accessories that must remain identical across ALL cards (e.g. a tiny knitted sky-blue vest with three small gold buttons, a little red neck-collar).\n"
            f"3. **Incorporate Descriptions Consistently**: In every single generated 'image_prompt' from Scene 1 to Scene {suggested_scenes}, you must explicitly copy-paste and repeat these exact physical character descriptions. Do not simply write 'the rabbit' or 'Benny' - always write 'Benny, a fluffy white baby rabbit wearing a tiny sky-blue knitted vest with three gold buttons'. This anchors the generative model to produce highly consistent images.\n"
            f"4. **Aesthetic Style Locks**: Always begin each prompt specifying the artistic style: 'Cartoon children book illustration, {req.visual_style} style, vector flat graphics, clean background'.\n\n"
            f"Respond strictly with a raw JSON conforming to this schema:\n"
            f"{{\n"
            f"  \"total_scenes_planned\": {suggested_scenes},\n"
            f"  \"scenes\": [\n"
            f"    {{\n"
            f"      \"scene_number\": 1,\n"
            f"      \"timestamp_marker\": \"...\",\n"
            f"      \"narration_segment\": \"...\",\n"
            f"      \"image_prompt\": \"...\"\n"
            f"    }}\n"
            f"  ]\n"
            f"}}\n"
        )

        # Dynamic Route for Storyboard planning based on language (avoids reasoning-template 400 parameters errors) [2]
        if req.story_language == "ms":
            response = openai_client.chat.completions.create(
                model="gpt-4o",
                messages=[
                    {"role": "system", "content": "You are a master storyboard planner. Output strictly in raw JSON format matching the schema rules."},
                    {"role": "user", "content": openai_input_str}
                ],
                response_format={"type": "json_object"}
            )
            ai_raw_content = response.choices[0].message.content
        else:
            response = openai_client.responses.create(
                model="gpt-5.4-mini",
                prompt={
                    "id": "pmpt_6a662bd8afd08194a20f18967be4326908f6e34aa8074ea1",
                    "version": "1"
                },
                input=openai_input_str,
                reasoning={
                    "mode": "standard",
                    "summary": "auto"
                },
                store=True
            )
            
            ai_raw_content = ""
            if hasattr(response, "output_text") and response.output_text:
                ai_raw_content = response.output_text
            elif hasattr(response, "choices") and len(response.choices) > 0:
                ai_raw_content = response.choices[0].message.content
            elif hasattr(response, "output") and hasattr(response.output, "content"):
                ai_raw_content = response.output.content

        plan_data = extract_json_content(ai_raw_content)
        return {
            "success": True,
            "total_scenes_planned": plan_data.get("total_scenes_planned", suggested_scenes),
            "scenes": plan_data.get("scenes", [])
        }
    except Exception as e:
        print("Storyboard Planning Failure:", str(e))
        return {"error": str(e), "success": False}

# -----------------------------------------------------------------
# Endpoint 8: Sequential Storyboard Scene Image Generator (One-by-One, Real API)
# -----------------------------------------------------------------
@app.post("/api/bedtime-story/generate-scene")
async def generate_single_scene(req: SingleSceneGenerationRequest):
    if not openai_client:
        raise HTTPException(status_code=500, detail="OpenAI Client is not initialized on backend.")
    try:
        full_prompt = req.image_prompt
        if req.visual_style.lower() not in full_prompt.lower():
            full_prompt = f"{req.image_prompt}, painted in {req.visual_style} style"

        if "photo" in full_prompt.lower() or "realistic" in full_prompt.lower() or "portrait" in full_prompt.lower():
            full_prompt = re.sub(r"(?i)photo|realistic|portrait|camera", "cute cartoon vector", full_prompt)
        
        print(f"[Storyboard Art Debug] Generating Scene {req.scene_number} | Prompt: {full_prompt[:70]}...")

        loop = asyncio.get_event_loop()
        def sync_call():
            return openai_client.images.generate(
                model="gpt-image-1-mini",
                prompt=full_prompt,
                quality="low",  # Cost-saving $0.005 tier
                size="1536x1024"  # Webapp Widescreen Aspect-Video Size
            )
        response = await loop.run_in_executor(None, sync_call)
        
        img_item = response.data[0]
        if hasattr(img_item, "b64_json") and img_item.b64_json:
            b64_data = img_item.b64_json
            image_url = f"data:image/webp;base64,{b64_data}"
        elif hasattr(img_item, "url") and img_item.url:
            image_url = img_item.url
        else:
            raise ValueError("No valid image payload (b64_json or url) found in OpenAI response data.")
        
        return {
            "success": True,
            "scene_number": req.scene_number,
            "image_url": image_url
        }
    except Exception as e:
        print(f"Error generating scene {req.scene_number} illustration: {str(e)}")
        # Return fallback cartoon vector to make sure execution continues cleanly
        fallback_url = get_cartoon_placeholder(req.scene_number)
        return {
            "success": True,
            "scene_number": req.scene_number,
            "image_url": fallback_url,
            "warning": str(e)
        }
